// Step 2 (§9.3 / §13.4 / §2.6) — content run tokenizer + display-only renderer.
//
// Block content is rendered as a flat list of styled text runs, NOT a rich-text model and
// NOT nested regex string-replaces (which break when a search hit overlaps a ==…==
// highlight). Each run carries independent attributes — spine (heavier first line),
// highlight (==…== span), and search hit — so a single run can be any combination and the
// renderer composes the styles on one node rather than nesting wrappers.
//
// Step 3 plugs into this same tokenizer: the highlight attribute is already a first-class
// run flag, so consistent ==…== rendering in read mode (collapsed + expanded) needs no
// further structural change.

import { invoke } from '@tauri-apps/api/core';
import { Fragment, type ReactNode } from 'react';
import { HIGHLIGHT_RE } from './highlight';
import { parseMarkdown, type MdSpan } from './markdown';
import { findMath, renderTex } from './math';

export interface HitRange {
  start: number;
  end: number;
  idx: number;
}

// §10.1 — the inline half of Markdown. One more attribute on the same run, for the same
// reason `highlight` is one: a search hit can overlap a bold span, and flat runs with
// independent attributes is what lets both render without nesting wrappers.
/** ⭐ `'source'` 不是 Markdown：它是合并留下的 `[from chatgpt] ` 记号（segments.ts）。
 *  和另外三个走同一条路,是因为它要的正是同一件事 —— 记号本身藏掉,里面那几个字换个样子画。 */
export type InlineMark = 'strong' | 'em' | 'code' | 'source' | 'strike' | 'link';

export interface ContentRun {
  text: string;
  /** Where this run's text starts and ends in the ORIGINAL content string. Marker chars
   *  (`**`, `==`, `## `) never reach a run, so `text.length === end - start` always holds —
   *  which is what lets a DOM selection be mapped back to raw offsets (selectionRange.ts). */
  start: number;
  end: number;
  // Heavier-weight first line / first paragraph (§13.4). Display-only.
  spine: boolean;
  // Inside a persistent ==…== highlight (§20.5). The == markers themselves are stripped.
  highlight: boolean;
  // Search-hit attribution (§9.10), or null. `active` is the currently-focused hit.
  hit: { idx: number; active: boolean } | null;
  // §10.1 inline Markdown: **bold**, *italic*, `code`. Markers are stripped like ==.
  mark?: InlineMark;
  // v21: inside a sentence a later block declared wrong (corrected_quote). One more
  // independent attribute for the same reason `highlight` is one — a search hit, a user
  // highlight and a correction can all cover the same words, and flat runs let all three
  // render without nesting.
  // Optional like `mark`, and for the same reason: it is absent on virtually every run, and
  // an always-present `false` would have rewritten every existing expectation for nothing.
  corrected?: boolean;
  // 2026-08-19: WHICH correction marked this run. Two sentences in one block may be corrected by
  // two different blocks, and 「点击它会出现修正后的信息」 means the one belonging to the
  // sentence clicked — not every correction the block happens to carry.
  correctionId?: string;
  // P14 插队（Ocean 2026-11-06）：a formula. Its run is the TeX between the delimiters, always ONE run
  // (no breakpoint falls inside it), drawn by KaTeX; `source` is the whole thing, delimiters included,
  // for copying it back out. A run can be bold, highlighted, a hit or corrected AND a formula.
  math?: { display: boolean; source: string };
  // `[text](https://…)` — the run is the text; only http(s) ever becomes a link.
  href?: string;
}

// Inline markers, in precedence order — first claim wins, and a later pattern overlapping
// an already-claimed range is skipped. Code first, because backticks are the one marker
// whose whole job is "what is inside me is literal".
//
// ⚠️ `em` is deliberately the fussiest pattern here. A lone `*` shows up in ordinary prose
// (「3 * 4」, footnote stars), so it only counts when it hugs its text and follows a
// boundary — a false italic silently eats two characters of the user's text.
/** 行首的 `[from <来源>] `，见 segments.ts。⚠️ 那边那一条是判断单独一段用的（`^` 不带 `m`），
 *  这里要在整串里扫，所以是它的 `gm` 双生。改一处必须改另一处。
 *  P9H-2：也认单独占一行的 `[from <来源>]`（这一版起合并就这么写）—— 换行不在匹配里，留着当正文。 */
const SOURCE_MARK_RE = /^\[from ([^\]\n]+)\](?: |$)/gm;
const SOURCE_OPEN = '[from ';

const CODE_MARK = { mark: 'code' as const, re: /`([^`\n]+)`/g, cap: 1 };
const INLINE_MARKS: { mark: InlineMark; re: RegExp; cap: number }[] = [
  { mark: 'strong', re: /\*\*([^\n]+?)\*\*/g, cap: 2 },
  { mark: 'em', re: /(?<![*\w])\*(?!\s)([^*\n]*[^*\s\n])\*(?![*\w])/g, cap: 1 },
  // P14 插队: GFM strikethrough.
  { mark: 'strike', re: /~~(?!\s)([^~\n]*[^~\s\n])~~/g, cap: 2 },
];
// P14 插队: `[text](https://…)`. Anything but http(s) stays text — a `javascript:` or a path is not a link.
const LINK_RE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;

// End offset of the "spine" — the slightly-heavier opening of a text block. Rule:
//   - content has a blank line ("\n\n"): spine = everything before the first blank line
//     (the first paragraph; itself possibly multiple physical lines).
//   - no blank line but multi-line: spine = the first physical line.
//   - single line: no spine.
// Returns 0 when there is no spine. Display-only; never mutates content and never parses
// markdown headings.
export function spineEnd(content: string): number {
  const blank = content.indexOf('\n\n');
  if (blank > 0) return blank;
  if (blank === 0) return 0; // leading blank line → no spine
  const nl = content.indexOf('\n');
  if (nl > 0) return nl;
  return 0; // single line (or leading newline / empty) → no spine
}

interface TokenizeOptions {
  hits?: readonly HitRange[];
  activeHitIndex?: number;
  withSpine?: boolean;
  // §10.1: tokenize only this slice, in the SAME coordinate space (hit offsets and marker
  // positions stay absolute). MarkdownContent renders one structural block at a time and
  // must not have to remap anything to do it.
  from?: number;
  to?: number;
  // Ranges where inline markers are literal — inside a fenced code block.
  raw?: readonly MdSpan[];
  // v21: character ranges of sentences a later block corrected, in this same coordinate
  // space. Resolved by the caller (BlockItem), because only it knows which blocks correct
  // this one. 2026-08-19: each range may name the correcting block it came from.
  corrected?: readonly (MdSpan & { id?: string })[];
  // Marker ranges the parser identified as structure (`## `, `- `, the fences).
  hidden?: readonly MdSpan[];
}

// Tokenize content into runs. Offsets (spine end, hit ranges, == matches) all live in the
// original content coordinate space — the same space the search layer reports hits in — so
// they compose without remapping. == cap characters are dropped from the output.
export function tokenizeContent(content: string, opts: TokenizeOptions = {}): ContentRun[] {
  const hits = opts.hits ?? [];
  const activeHitIndex = opts.activeHitIndex ?? -1;
  const sEnd = opts.withSpine ? spineEnd(content) : 0;
  const from = opts.from ?? 0;
  const to = opts.to ?? content.length;
  const isRaw = (s: number, e: number): boolean =>
    (opts.raw ?? []).some((r) => s >= r.start && e <= r.end);

  type Interval =
    | { kind: 'hit'; start: number; end: number; idx: number }
    | { kind: 'highlight'; start: number; end: number }
    | { kind: 'mark'; start: number; end: number; mark: InlineMark }
    | { kind: 'corrected'; start: number; end: number; id?: string }
    | { kind: 'math'; start: number; end: number; display: boolean; source: string }
    | { kind: 'link'; start: number; end: number; href: string }
    | { kind: 'cap'; start: number; end: number };

  const intervals: Interval[] = [];
  // Claimed spans, marker chars included — a later inline pattern that overlaps one is
  // not a marker at all (「**a *b** c*」 is one bold span, not a tangle).
  const claimed: MdSpan[] = [];
  const free = (s: number, e: number): boolean =>
    !claimed.some((c) => s < c.end && c.start < e) && !isRaw(s, e);
  // Persistent ==…== highlights: inner span is a highlight interval; the surrounding
  // two-char markers are caps (never rendered).
  for (const m of content.matchAll(HIGHLIGHT_RE)) {
    const s = m.index ?? 0;
    const e = s + m[0].length;
    if (!free(s, e)) continue;
    claimed.push({ start: s, end: e });
    intervals.push({ kind: 'cap', start: s, end: s + 2 });
    intervals.push({ kind: 'highlight', start: s + 2, end: e - 2 });
    intervals.push({ kind: 'cap', start: e - 2, end: e });
  }
  // §10.1 inline Markdown, same shape: the marker chars are caps, the inside is a mark.
  const markOne = (mark: InlineMark, s: number, e: number, cap: number): void => {
    claimed.push({ start: s, end: e });
    intervals.push({ kind: 'cap', start: s, end: s + cap });
    intervals.push({ kind: 'mark', start: s + cap, end: e - cap, mark });
    intervals.push({ kind: 'cap', start: e - cap, end: e });
  };
  // Code first: backticks are the one marker whose whole job is 「what is inside me is literal」.
  for (const m of content.matchAll(CODE_MARK.re)) {
    const s = m.index ?? 0;
    const e = s + m[0].length;
    if (free(s, e)) markOne('code', s, e, CODE_MARK.cap);
  }
  // P14 插队 — formulas, next: TeX is full of `*`, `_` and `~`, which must not turn into emphasis.
  // A formula may sit inside a ==highlight== (or, below, inside bold / a link) but nothing may cut
  // through it, and it must lie inside the slice being drawn. It is NOT a claim: bold around it is fine.
  const maths: { start: number; end: number }[] = [];
  const highlights = intervals.filter((it) => it.kind === 'highlight');
  for (const m of findMath(content, [...(opts.raw ?? []), ...claimed.filter((c) => !highlights.some((h) => h.start - 2 === c.start))])) {
    if (m.start < from || m.end > to) continue;
    const crossesHighlight = highlights.some(
      (h) => m.start < h.end + 2 && h.start - 2 < m.end && !(m.start >= h.start && m.end <= h.end),
    );
    if (crossesHighlight) continue;
    maths.push({ start: m.start, end: m.end });
    intervals.push({ kind: 'cap', start: m.start, end: m.innerStart });
    intervals.push({
      kind: 'math', start: m.innerStart, end: m.innerEnd, display: m.display, source: content.slice(m.start, m.end),
    });
    intervals.push({ kind: 'cap', start: m.innerEnd, end: m.end });
    // A display formula is its own line: the newline on either side would otherwise draw an empty one.
    if (m.display && content[m.start - 1] === '\n' && m.start - 1 >= from) {
      intervals.push({ kind: 'cap', start: m.start - 1, end: m.start });
    }
    if (m.display && content[m.end] === '\n' && m.end < to) {
      intervals.push({ kind: 'cap', start: m.end, end: m.end + 1 });
    }
  }
  /** A marker pair may hold whole formulas, but neither marker may sit inside one. */
  const clearOfMath = (s: number, e: number, capL: number, capR: number): boolean =>
    maths.every(
      (m) =>
        e <= m.start || m.end <= s || (m.start >= s + capL && m.end <= e - capR),
    );
  for (const { mark, re, cap } of INLINE_MARKS) {
    for (const m of content.matchAll(re)) {
      const s = m.index ?? 0;
      const e = s + m[0].length;
      if (free(s, e) && clearOfMath(s, e, cap, cap)) markOne(mark, s, e, cap);
    }
  }
  for (const m of content.matchAll(LINK_RE)) {
    const s = m.index ?? 0;
    const e = s + m[0].length;
    const textEnd = s + 1 + m[1]!.length;
    if (!free(s, e) || !clearOfMath(s, e, 1, e - textEnd)) continue;
    claimed.push({ start: s, end: e });
    intervals.push({ kind: 'cap', start: s, end: s + 1 });
    intervals.push({ kind: 'mark', start: s + 1, end: textEnd, mark: 'link' });
    intervals.push({ kind: 'link', start: s + 1, end: textEnd, href: m[2]! });
    intervals.push({ kind: 'cap', start: textEnd, end: e });
  }
  // ⭐ 2026-08-25 —— 合并留下的来源记号。`[from ` 和 `] ` 当 cap 藏掉,中间那几个字画成一枚
  // 小标签（Ocean:「来源的文字特别大,和正文混在一起」—— 它以前就是 15px 的正文）。
  // ⚠️ 只认**行首**（`m` 标志）：合并出来的段一定从行首开始,而正文里正好有一行以
  // 「[from …] 」开头的概率,比把它错认成正文的代价小。
  for (const m of content.matchAll(SOURCE_MARK_RE)) {
    const s = m.index ?? 0;
    const e = s + m[0].length;
    if (!free(s, e)) continue;
    claimed.push({ start: s, end: e });
    // The `]` — the label cannot contain one, so it sits right after the label.
    const close = s + SOURCE_OPEN.length + m[1]!.length;
    intervals.push({ kind: 'cap', start: s, end: s + SOURCE_OPEN.length });
    intervals.push({ kind: 'mark', start: s + SOURCE_OPEN.length, end: close, mark: 'source' });
    // ⚠️ 只藏 `]`,记号末尾那个空格留着当普通正文 —— `plainText()`（搜索预览、引用行、
    // 刻度条的悬浮预览都用它）拿到的是「chatgpt 第二段」而不是「chatgpt第二段」。
    intervals.push({ kind: 'cap', start: close, end: close + 1 });
  }
  // Structural markers (`## `, `- `, the fences) are hidden exactly like a == cap.
  for (const h of opts.hidden ?? []) intervals.push({ kind: 'cap', start: h.start, end: h.end });
  for (const h of hits) intervals.push({ kind: 'hit', start: h.start, end: h.end, idx: h.idx });
  for (const c of opts.corrected ?? []) {
    intervals.push({ kind: 'corrected', start: c.start, end: c.end, id: c.id });
  }

  const breakpoints = new Set<number>([from, to]);
  if (sEnd > from && sEnd < to) breakpoints.add(sEnd);
  for (const it of intervals) {
    if (it.start > from && it.start < to) breakpoints.add(it.start);
    if (it.end > from && it.end < to) breakpoints.add(it.end);
  }
  // A formula is drawn whole or not at all: nothing breaks inside its TeX.
  const formulaRuns = intervals.filter((it): it is Extract<Interval, { kind: 'math' }> => it.kind === 'math');
  const sorted = [...breakpoints]
    .filter((b) => !formulaRuns.some((f) => b > f.start && b < f.end))
    .sort((a, b) => a - b);

  const runs: ContentRun[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const segStart = sorted[i]!;
    const segEnd = sorted[i + 1]!;
    if (segStart >= segEnd) continue;
    // Marker chars (== caps, ** caps, `## `): never render visibly.
    if (intervals.some((it) => it.kind === 'cap' && segStart >= it.start && segEnd <= it.end)) {
      continue;
    }
    const formula = formulaRuns.find((f) => segStart >= f.start && segEnd <= f.end);
    // Inside a formula, anything that TOUCHES it covers all of it (a hit on 「x」 marks the formula).
    const covers = (it: { start: number; end: number }): boolean =>
      formula ? it.start < segEnd && segStart < it.end : segStart >= it.start && segEnd <= it.end;
    const hit = intervals.find(
      (it): it is Extract<Interval, { kind: 'hit' }> => it.kind === 'hit' && covers(it),
    );
    const highlight = intervals.some(
      (it) => it.kind === 'highlight' && segStart >= it.start && segEnd <= it.end,
    );
    const mark = intervals.find(
      (it): it is Extract<Interval, { kind: 'mark' }> =>
        it.kind === 'mark' && segStart >= it.start && segEnd <= it.end,
    )?.mark;
    const correction = intervals.find((it) => it.kind === 'corrected' && covers(it));
    const link = intervals.find(
      (it): it is Extract<Interval, { kind: 'link' }> =>
        it.kind === 'link' && segStart >= it.start && segEnd <= it.end,
    );
    runs.push({
      text: content.slice(segStart, segEnd),
      start: segStart,
      end: segEnd,
      spine: sEnd > 0 && segStart < sEnd,
      highlight,
      hit: hit ? { idx: hit.idx, active: hit.idx === activeHitIndex } : null,
      mark,
      corrected: !!correction || undefined,
      correctionId: correction?.kind === 'corrected' ? correction.id : undefined,
      ...(formula ? { math: { display: formula.display, source: formula.source } } : {}),
      ...(link ? { href: link.href } : {}),
    });
  }
  return runs;
}

// The same tokenizer, used for its other half: the text with every marker dropped.
//
// Ocean 2026-08-10, reading a `corrects` citation in the real library: 「正文是 md 文档形式，
// 看起来太混乱」— the GUI's one-line preview of a cited block was slicing the raw body, so
// `# 申请人定位…` and `**目标。**` arrived with their markers attached. Wherever the GUI
// NAMES a block instead of rendering it, the markers are noise.
//
// Reusing the tokenizer instead of writing a second stripper is the point: there is one
// definition of "what is a marker", and a regex twin would drift from it — showing markers
// the renderer hides, or eating text it does not.
//
// ⚠️ GUI only. The pack keeps the raw body: markdown is structure to the model reading it.
export function plainText(content: string): string {
  const doc = parseMarkdown(content);
  return tokenizeContent(content, { raw: doc.raw, hidden: doc.hidden })
    .map((r) => r.text)
    .join('');
}

interface ContentRunsProps extends TokenizeOptions {
  content: string;
  /** Stamp every run with its raw content offset (`data-o`), so a DOM selection can be
   *  mapped back to a character range in `content`. Opt-in: the surfaces that never take a
   *  selection (digest, 周回顾) keep rendering bare text nodes, and the 「plain prose renders
   *  as nothing but the prose」 invariant with them. */
  withOffsets?: boolean;
  /** 2026-08-19: what a click on a corrected span does. Ocean 2026-08-19:「点击它会出现修正后的信息」—
   *  the marked sentence IS the affordance, so the handler lives on the run, not on a
   *  separate line underneath. Absent (digest, weekly review, read-only surfaces) leaves
   *  the wash exactly as it was: visible, inert.
   *  2026-10-16: `at` is where the clicked sentence is on screen, for the preview panel to open
   *  beside it without covering it. */
  onCorrectedClick?: (
    correctionId: string | undefined,
    at: { x: number; top: number; bottom: number },
  ) => void;
}

// Display-only renderer (§2.6 — no rich text). Maps each run to a styled node: the
// first-line spine (font-weight 500, §13.4), persistent ==…== highlights
// (var(--selection)), and search hits (active one brighter, with an inset accent ring so
// orientation holds after landing). Active hit marks keep `data-hit-index` so BlockItem's
// nav scroll-into-view can target them.
export function ContentRuns({
  content,
  onCorrectedClick,
  withOffsets,
  ...opts
}: ContentRunsProps): ReactNode {
  const runs = tokenizeContent(content, opts);
  // One wrapper, one attribute, no styling — it must not change a single pixel.
  // P14 插队: a formula's rendered text has nothing to do with its TeX, so its carrier also says where it
  // ENDS — selectionRange snaps an endpoint inside it to one of the two (the whole formula, never half).
  const located = (node: ReactNode, key: number, run: ContentRun): ReactNode =>
    withOffsets ? (
      <span key={key} data-o={run.start} data-o-end={run.math ? run.end : undefined}>
        {node}
      </span>
    ) : (
      node
    );
  // 2026-08-19: one wrapper for every path below (mark / code / span / bare text), so a corrected
  // sentence is clickable whether or not a search hit or a ==highlight== also covers it.
  // A <span role="button"> rather than a <button>: this sits mid-sentence, and a real button
  // would break the line box it lives in.
  const sentenceAt = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: r.left, top: r.top, bottom: r.bottom };
  };
  const clickable = (node: ReactNode, key: number, id: string | undefined): ReactNode =>
    onCorrectedClick ? (
      <span
        key={key}
        role="button"
        tabIndex={0}
        data-correction-mark=""
        onClick={(e) => {
          e.stopPropagation();
          onCorrectedClick(id, sentenceAt(e.currentTarget));
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          e.stopPropagation();
          onCorrectedClick(id, sentenceAt(e.currentTarget));
        }}
        className="cursor-pointer"
      >
        {node}
      </span>
    ) : (
      node
    );
  return (
    <Fragment>
      {runs.map((run, i) => {
        // §10.1: an inline mark composes with everything else — it is a class (and, for
        // code, an element), never a wrapper that would nest inside a hit or a highlight.
        //
        // ⚠️ Ocean 2026-08-12「粗体字太粗了」: bold is ONE step above whatever the run already
        // sits at, not a fixed 600. Most block content is Chinese, and 600 lands on PingFang SC
        // Semibold, which reads as shouting rather than emphasis. 500 (Medium) is the emphasis
        // weight there — except inside the spine, which is already 500, so bold has to clear it.
        const markCls =
          run.mark === 'strong'
            ? run.spine
              ? 'font-semibold'
              : 'font-medium'
            : run.mark === 'em'
              ? 'italic'
              : run.mark === 'strike'
                ? 'text-muted line-through'
                : run.mark === 'link'
                  ? 'text-accent underline underline-offset-2'
                  : run.mark === 'code'
                ? 'rounded-sm bg-paper-2 px-1 font-mono text-[0.9em] text-ink'
                : run.mark === 'source'
                  ? // 合并留下的来源记号：一枚小灰标签,和块头上那个来源徽章一个意思、一个音量。
                    'mr-0.5 rounded-sm border border-line px-1 text-[0.72em] text-muted'
                  : '';
        // A strong run inside the spine already carries its own weight — emitting both would
        // leave which one wins up to the order Tailwind happens to write them out in.
        const spineWeight = run.spine && run.mark !== 'strong' ? 'font-medium' : '';
        // v21 — the sentence a later block corrected. The warm wash and its edge are the
        // tokens Ocean approved for the date-reminder strip (「做一个暖色，透明一点的」): this is
        // the same kind of statement, laid over the text rather than replacing it. The text
        // stays fully readable and is NOT struck through — `corrects` says one point is
        // wrong, and whether that retires anything is the user's call (§3.1 «谁能用»).
        //
        // The dotted rule carries it on its own when a search hit or a ==highlight== has
        // already claimed the background — three overlapping colours would say nothing.
        const correctedCls = run.corrected
          ? `underline decoration-dotted decoration-[var(--notice-warm-edge)] underline-offset-[3px]${
              run.hit || run.highlight ? '' : ' bg-[var(--notice-warm)] rounded-sm'
            }`
          : '';
        const spineCls = `${spineWeight} ${markCls} ${correctedCls}`.trim();
        // 2026-08-19: a corrected run answers to the click handler; everything else is unchanged
        // and keeps its own key, so non-corrected blocks render node-for-node as before.
        const wrap = (n: ReactNode, key: number): ReactNode =>
          located(run.corrected ? clickable(n, key, run.correctionId) : n, key, run);
        // P14 插队 — the formula itself, or (KaTeX gave nothing back) its TeX as it is, so nothing is lost.
        // `data-tex` is what a copy puts back on the clipboard in its place (copyTex.ts).
        const body = (text: ReactNode): ReactNode => {
          if (!run.math) return text;
          const html = renderTex(run.text, run.math.display);
          if (!html) return <span className="font-mono text-[0.9em]">{text}</span>;
          return (
            <span
              data-tex={run.math.source}
              className={run.math.display ? 'block overflow-x-auto overflow-y-hidden py-[0.15em]' : ''}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        };
        if (run.href && !run.math) {
          return wrap(
            <a
              key={i}
              href={run.href}
              rel="noreferrer"
              title={run.href}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void invoke('open_target', { target: run.href }).catch(() => {});
              }}
              className={`${markCls} ${run.hit || run.highlight ? 'rounded-sm bg-[var(--selection)]' : ''} ${correctedCls}`.trim()}
            >
              {run.text}
            </a>,
            i,
          );
        }
        if (run.hit) {
          return wrap(
            <mark
              key={i}
              data-hit-index={run.hit.idx}
              className={`rounded-sm px-0.5 text-ink transition-colors duration-200 ${
                run.hit.active
                  ? 'bg-[var(--highlight)] shadow-[inset_0_0_0_1px_var(--accent-2)]'
                  : 'bg-[var(--selection)]'
              } ${spineCls}`}
            >
              {body(run.text)}
            </mark>,
            i,
          );
        }
        if (run.highlight) {
          return wrap(
            <mark
              key={i}
              className={`rounded-sm bg-[var(--selection)] px-0.5 text-ink ${spineCls}`}
            >
              {body(run.text)}
            </mark>,
            i,
          );
        }
        if (run.mark === 'code') {
          return wrap(
            <code key={i} className={`${markCls} ${correctedCls}`.trim()}>
              {run.text}
            </code>,
            i,
          );
        }
        if (spineCls || run.math) {
          return wrap(
            <span key={i} className={spineCls || undefined}>
              {body(run.text)}
            </span>,
            i,
          );
        }
        return wrap(<Fragment key={i}>{run.text}</Fragment>, i);
      })}
    </Fragment>
  );
}
