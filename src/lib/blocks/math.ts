import katex from 'katex';
import 'katex/dist/katex.min.css';
import './math.css';

// P14 插队（Ocean 2026-11-06，HANDOFF §9.2 第 250 条）：从 AI 对话里复制来的公式要画出来。
//
// What reaches a block is the TeX SOURCE — ChatGPT's copy is markdown with `\( … \)` / `\[ … \]`
// (〈数学〉 project, 2026-11), Claude and most pages write `$ … $` / `$$ … $$`. That source is what
// stays in the block and what the pack hands an AI; this file only says where a formula is (as offsets,
// like every other piece of structure here — markdown.ts) and draws it. ⛔ Nothing here rewrites content.
//
// Drawn by KaTeX, bundled (fonts too): no request leaves the app, the CSP is untouched. `trust: false`
// keeps \href / \url / \includegraphics as text, and a formula KaTeX cannot parse comes back as its own
// source in red rather than an exception — a block never fails to render because of a formula.

export interface MathSpan {
  /** Whole formula, delimiters included. */
  start: number;
  end: number;
  /** The TeX between the delimiters. */
  innerStart: number;
  innerEnd: number;
  display: boolean;
}

// Display first (`$$` before `$`, `\[` before `\(`), so the longer delimiter wins.
// `[\s\S]` for display — it spans lines (same reason as HIGHLIGHT_RE). Inline stays on one line.
const PATTERNS: { re: RegExp; open: number; close: number; display: boolean }[] = [
  { re: /\\\[([\s\S]+?)\\\]/g, open: 2, close: 2, display: true },
  { re: /\$\$([\s\S]+?)\$\$/g, open: 2, close: 2, display: true },
  { re: /\\\(([^\n]+?)\\\)/g, open: 2, close: 2, display: false },
  // `$x$` only when it hugs its content and is not followed by a digit — the pandoc rule, which is what
  // keeps 「$5 和 $10」 and 「价格 $20」 as prose. And never `$$`, nor an escaped `\$`.
  { re: /(?<![\\$\w])\$(?![\s$])([^$\n]*?[^\s\\$])\$(?![\d$])/g, open: 1, close: 1, display: false },
];

/** Every formula in `content`, in order, non-overlapping. `skip` = ranges where `$` and `\(` are
 *  literal text (code spans and fences); a formula touching one is not a formula. */
export function findMath(content: string, skip: readonly { start: number; end: number }[] = []): MathSpan[] {
  if (!content.includes('$') && !content.includes('\\')) return [];
  const out: MathSpan[] = [];
  const taken = (s: number, e: number): boolean =>
    out.some((m) => s < m.end && m.start < e) || skip.some((r) => s < r.end && r.start < e);
  for (const { re, open, close, display } of PATTERNS) {
    for (const m of content.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (!m[1]!.trim() || taken(start, end)) continue;
      out.push({ start, end, innerStart: start + open, innerEnd: end - close, display });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

// The same formula is drawn again on every re-render of its block (hover, a search keystroke); KaTeX
// is fast but not free. Bounded so a long session cannot grow it without end.
const CACHE_MAX = 500;
const cache = new Map<string, string>();

/** KaTeX HTML for one formula. Never throws. */
export function renderTex(tex: string, display: boolean): string {
  const key = `${display ? 'D' : 'I'}${tex}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let html: string;
  try {
    html = katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      output: 'html',
      strict: 'ignore',
      trust: false,
    });
  } catch {
    // throwOnError:false covers parse errors; this is for anything else (an internal limit).
    html = '';
  }
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, html);
  return html;
}
