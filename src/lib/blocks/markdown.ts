import { findMath } from './math';

// DESIGN_WORKBENCH §10.1 — block-level Markdown structure, as OFFSETS into the block's own
// content string.
//
// Ocean 2026-08-08: 「`**`、`#`、`-` 这些符号看着有些混乱,不美观」. The rule the rest of the
// read surface already follows (HighlightedContent line 6) applies here too: **display-only,
// and edit mode returns to the raw source** — so nothing here rewrites content, it only says
// which ranges are structure and which ranges are text.
//
// ⚠️ Why offsets and not a string transform. Search hits are reported as character ranges in
// this exact string (`buildHitOffsets`), and 「跳到命中处」 scrolls to the mark carrying that
// range. Anything that rewrote the text would have to remap every offset — the §10.1 trap.
// Parsing to ranges instead means the tokenizer keeps working in one coordinate space and
// the hit machinery never learns Markdown exists.
//
// No dependency on purpose (§10.1, three reasons): six markers is not worth a general parser;
// `==…==` is not standard Markdown and lives in the same inline layer here; and hand-written
// means raw HTML in a captured block is never interpreted, so there is nothing to sanitise.

export interface MdSpan {
  start: number;
  end: number;
}

export type MdBlock =
  | { kind: 'para'; text: MdSpan }
  | { kind: 'heading'; level: number; text: MdSpan }
  /** A list row. `marker` is what to draw in the gutter — a bullet, or the user's own "3." */
  | { kind: 'item'; marker: string; indent: number; text: MdSpan }
  | { kind: 'code'; text: MdSpan }
  /** P7 验收第一轮（Ocean 2026-10-08）：a picture line `![caption](spool-image:<id>)`. `text`
   *  is the caption — ordinary text with offsets, searchable and selectable; the rest of the
   *  line is hidden structure. See `imageLines.ts`. */
  | { kind: 'image'; id: string; text: MdSpan }
  /** P14 插队（Ocean 2026-11-06）：a GFM table. `rows[0]` is the header; each cell is the trimmed text
   *  between pipes. `text` covers the whole table, for anything that only wants its extent. */
  | { kind: 'table'; align: (TableAlign | null)[]; rows: MdSpan[][]; text: MdSpan }
  /** `> ` lines in a row. `text` runs from the first line's text to the last line's end; the `> ` of
   *  every line is hidden structure, so the newlines between them stay as line breaks. */
  | { kind: 'quote'; text: MdSpan }
  /** `---` / `***` / `___` on a line of its own. Nothing to read — `text` is empty, at the line. */
  | { kind: 'hr'; text: MdSpan };

export type TableAlign = 'left' | 'center' | 'right';

export interface MdDoc {
  blocks: MdBlock[];
  /** Marker ranges (`## `, `- `, the ``` fences) — parsed, never shown. */
  hidden: MdSpan[];
  /** Ranges where inline markers are literal text: inside a fenced code block. */
  raw: MdSpan[];
}

const HEADING = /^(#{1,6})[ \t]+(.*)$/;
// Three or more of one of - * _, nothing else on the line (spaces allowed between). Tested before
// BULLET, which `- - -` would otherwise be.
const HR = /^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^[ \t]*>[ \t]?/;
// A GFM delimiter row: cells of `---`, `:--`, `--:`, `:-:` between pipes (outer pipes optional).
const TABLE_DELIM = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
// P14 插队: `•` `◦` `▪` `‣` too — the bullet a web page or a document leaves in its plain text (〈修改过程〉 #13).
const BULLET = /^([ \t]*)([-*•◦▪‣])[ \t]+(.*)$/;
const ORDERED = /^([ \t]*)(\d{1,3}[.)])[ \t]+(.*)$/;
const FENCE = /^[ \t]*```/;
// ⚠️ The same pattern as imageLines.ts IMAGE_LINE_RE — one line, one picture.
const IMAGE = /^!\[(.*)\]\(spool-image:([A-Za-z0-9_-]+)\)[ \t]*$/;

/** The cells of one table row, as trimmed offsets. A pipe inside a formula or a `code` span, or
 *  escaped as `\|`, does not split. Outer pipes are optional. */
const tableCells = (content: string, lineStart: number, lineEnd: number, literal: readonly MdSpan[]): MdSpan[] => {
  const line = content.slice(lineStart, lineEnd);
  const inLiteral = (at: number): boolean => literal.some((r) => at >= r.start && at < r.end);
  const cuts: number[] = [];
  let inCode = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode && line[i - 1] !== '\\' && !inLiteral(lineStart + i)) cuts.push(i);
  }
  // The row's own extent, without the outer pipes when it has them.
  let lo = line.search(/\S/);
  let hi = line.trimEnd().length;
  if (lo < 0) return [];
  if (cuts[0] === lo) {
    cuts.shift();
    lo += 1;
  }
  if (cuts.length > 0 && cuts[cuts.length - 1] === hi - 1) {
    cuts.pop();
    hi -= 1;
  }
  const bounds = [lo - 1, ...cuts, hi];
  const cells: MdSpan[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    let a = bounds[i]! + 1;
    let b = bounds[i + 1]!;
    while (a < b && /\s/.test(line[a]!)) a++;
    while (b > a && /\s/.test(line[b - 1]!)) b--;
    cells.push({ start: lineStart + a, end: lineStart + b });
  }
  return cells;
};

const delimAlign = (cell: string): TableAlign | null => {
  const c = cell.trim();
  const l = c.startsWith(':');
  const r = c.endsWith(':');
  return l && r ? 'center' : r ? 'right' : l ? 'left' : null;
};

/** Ranges of fenced code, found ahead of the main pass so a `$$` inside a fence is not a formula. */
const fencedRanges = (content: string): MdSpan[] => {
  const out: MdSpan[] = [];
  let open = -1;
  let pos = 0;
  while (pos <= content.length) {
    const nl = content.indexOf('\n', pos);
    const lineEnd = nl === -1 ? content.length : nl;
    if (FENCE.test(content.slice(pos, lineEnd))) {
      if (open < 0) open = pos;
      else {
        out.push({ start: open, end: lineEnd });
        open = -1;
      }
    }
    if (nl === -1) break;
    pos = nl + 1;
  }
  if (open >= 0) out.push({ start: open, end: content.length });
  return out;
};

/** One indent step. Two spaces or one tab — the shapes an AI-written list actually uses. */
const indentOf = (ws: string): number =>
  Math.min(3, Math.floor(ws.replace(/\t/g, '  ').length / 2));

/**
 * Split `content` into display blocks. Every offset is into `content` itself.
 *
 * A run of ordinary lines becomes ONE paragraph — blank lines separate paragraphs rather
 * than being rendered as empty lines, which is the whole point of the change (the gap
 * becomes margin). A block with no structure at all comes back as a single `para` covering
 * everything, and the renderer short-circuits that to exactly the old output.
 */
export function parseMarkdown(content: string): MdDoc {
  const blocks: MdBlock[] = [];
  const hidden: MdSpan[] = [];
  const raw: MdSpan[] = [];
  // Paragraph accumulator: start of the current run of ordinary lines, and the end of the
  // last non-blank one (so a trailing blank line is not swallowed into the paragraph).
  let paraStart = -1;
  let paraEnd = -1;
  const flushPara = (): void => {
    if (paraStart >= 0 && paraEnd > paraStart) {
      blocks.push({ kind: 'para', text: { start: paraStart, end: paraEnd } });
    }
    paraStart = -1;
    paraEnd = -1;
  };

  // Fence state: where the code text began, and the offsets of the opening fence line.
  let fenceTextStart = -1;
  // P14 插队: formulas, found once. A line that BEGINS inside a display formula (`\[` … `\]` over several
  // lines) is part of that formula, never a list row or a heading — TeX lines can start with `-` or `#`.
  // A display formula that starts on a structural line carries that block on to the line it ends on.
  const formulas = findMath(content, fencedRanges(content));
  const display = formulas.filter((m) => m.display);
  const insideDisplay = (at: number): boolean => display.some((m) => m.start < at && at < m.end);
  /** End of the line holding the end of a display formula that starts in [from, lineEnd) and runs past it. */
  const carriedTo = (from: number, lineEnd: number): number => {
    const m = display.find((d) => d.start >= from && d.start < lineEnd && d.end > lineEnd);
    if (!m) return lineEnd;
    const nl = content.indexOf('\n', m.end);
    return nl === -1 ? content.length : nl;
  };
  // Quote accumulator: a run of `> ` lines is one block.
  let quoteStart = -1;
  let quoteEnd = -1;
  const flushQuote = (): void => {
    if (quoteStart >= 0 && quoteEnd > quoteStart) blocks.push({ kind: 'quote', text: { start: quoteStart, end: quoteEnd } });
    quoteStart = -1;
    quoteEnd = -1;
  };

  let pos = 0;
  while (pos <= content.length) {
    const nl = content.indexOf('\n', pos);
    const lineEnd = nl === -1 ? content.length : nl;
    const line = content.slice(pos, lineEnd);

    if (fenceTextStart < 0 && insideDisplay(pos)) {
      // Continuation of a display formula: whatever block it started in, it goes on here.
      if (quoteStart >= 0) quoteEnd = lineEnd;
      else {
        if (paraStart < 0) paraStart = pos;
        paraEnd = lineEnd;
      }
    } else if (fenceTextStart >= 0) {
      if (FENCE.test(line)) {
        // Closing fence: the code is everything up to the newline before this line.
        const textEnd = Math.max(fenceTextStart, pos > 0 ? pos - 1 : 0);
        blocks.push({ kind: 'code', text: { start: fenceTextStart, end: textEnd } });
        raw.push({ start: fenceTextStart, end: textEnd });
        hidden.push({ start: textEnd, end: lineEnd });
        fenceTextStart = -1;
      }
    } else if (QUOTE.test(line)) {
      flushPara();
      const textStart = pos + QUOTE.exec(line)![0].length;
      hidden.push({ start: pos, end: textStart });
      if (quoteStart < 0) quoteStart = textStart;
      quoteEnd = lineEnd;
    } else if (HR.test(line)) {
      flushPara();
      flushQuote();
      hidden.push({ start: pos, end: lineEnd });
      blocks.push({ kind: 'hr', text: { start: pos, end: pos } });
    } else if (line.includes('|') && nl !== -1 && isTableStart(content, pos, lineEnd, nl + 1)) {
      flushPara();
      flushQuote();
      const literal = formulas.map((m) => ({ start: m.start, end: m.end }));
      const delimStart = nl + 1;
      const delimNl = content.indexOf('\n', delimStart);
      const delimEnd = delimNl === -1 ? content.length : delimNl;
      const align = content
        .slice(delimStart, delimEnd)
        .replace(/^[ \t]*\|/, '')
        .replace(/\|[ \t]*$/, '')
        .split('|')
        .map(delimAlign);
      const rows: MdSpan[][] = [tableCells(content, pos, lineEnd, literal)];
      hidden.push({ start: delimStart, end: delimEnd });
      let end = delimEnd;
      let next = delimNl === -1 ? content.length + 1 : delimNl + 1;
      while (next <= content.length) {
        const rnl = content.indexOf('\n', next);
        const rEnd = rnl === -1 ? content.length : rnl;
        const row = content.slice(next, rEnd);
        if (row.trim() === '' || !row.includes('|')) break;
        rows.push(tableCells(content, next, rEnd, literal));
        end = rEnd;
        if (rnl === -1) {
          next = content.length + 1;
          break;
        }
        next = rnl + 1;
      }
      blocks.push({ kind: 'table', align, rows, text: { start: pos, end } });
      if (next > content.length) break;
      pos = next;
      continue;
    } else if (nl !== -1 && tabRun(content, pos, lineEnd) !== null) {
      // Two or more tab-separated lines with the same number of cells: a table copied as plain text.
      flushPara();
      flushQuote();
      const run = tabRun(content, pos, lineEnd)!;
      blocks.push({ kind: 'table', align: run.rows[0]!.map(() => null), rows: run.rows, text: { start: pos, end: run.end } });
      if (run.end >= content.length) break;
      pos = run.end + 1;
      continue;
    } else if (IMAGE.test(line)) {
      flushPara();
      const m = IMAGE.exec(line)!;
      const capStart = pos + 2;
      const capEnd = capStart + m[1]!.length;
      hidden.push({ start: pos, end: capStart });
      hidden.push({ start: capEnd, end: lineEnd });
      blocks.push({ kind: 'image', id: m[2]!, text: { start: capStart, end: capEnd } });
    } else if (FENCE.test(line)) {
      flushPara();
      // The fence line itself (and its newline) is structure.
      hidden.push({ start: pos, end: Math.min(content.length, lineEnd + 1) });
      fenceTextStart = Math.min(content.length, lineEnd + 1);
    } else if (HEADING.test(line)) {
      flushPara();
      const m = HEADING.exec(line)!;
      const textStart = lineEnd - m[2]!.length; // after "### "
      hidden.push({ start: pos, end: textStart });
      const end = carriedTo(textStart, lineEnd);
      blocks.push({ kind: 'heading', level: m[1]!.length, text: { start: textStart, end } });
      if (end > lineEnd) {
        // The formula took the lines after this one with it; carry on after them.
        if (end >= content.length) break;
        pos = end + 1;
        continue;
      }
    } else if (BULLET.test(line) || ORDERED.test(line)) {
      flushPara();
      const bullet = BULLET.exec(line);
      const m = bullet ?? ORDERED.exec(line)!;
      const body = m[3]!;
      const textStart = lineEnd - body.length;
      const end = carriedTo(textStart, lineEnd);
      hidden.push({ start: pos, end: textStart });
      blocks.push({
        kind: 'item',
        // A middot is what a `·` list marker looks like at body size: almost nothing. The
        // bullet standard Markdown draws is `•`.
        marker: bullet ? '•' : m[2]!,
        indent: indentOf(m[1]!),
        text: { start: textStart, end },
      });
      if (end > lineEnd) {
        if (end >= content.length) break;
        pos = end + 1;
        continue;
      }
    } else if (line.trim() === '') {
      flushPara();
      flushQuote();
    } else {
      flushQuote();
      if (paraStart < 0) paraStart = pos;
      paraEnd = lineEnd;
    }

    if (nl === -1) break;
    pos = nl + 1;
  }
  // An unterminated fence: the rest of the block is code, and nothing is lost.
  if (fenceTextStart >= 0 && fenceTextStart < content.length) {
    blocks.push({ kind: 'code', text: { start: fenceTextStart, end: content.length } });
    raw.push({ start: fenceTextStart, end: content.length });
  }
  flushPara();
  flushQuote();
  return { blocks, hidden, raw };
}

/** P14 插队: the cells of a tab-separated line (what a table copied out of an app becomes as plain text —
 *  〈修改过程〉 #12, #17), or null when it is not one: no tab, fewer than two cells, or starting with
 *  whitespace (an indented code line is not a table row). */
const tabCells = (content: string, lineStart: number, lineEnd: number): MdSpan[] | null => {
  const line = content.slice(lineStart, lineEnd);
  if (!line.includes('\t') || /^\s/.test(line)) return null;
  const cells: MdSpan[] = [];
  let at = 0;
  for (const part of line.split('\t')) {
    const lead = part.length - part.trimStart().length;
    cells.push({ start: lineStart + at + lead, end: lineStart + at + part.trimEnd().length });
    at += part.length + 1;
  }
  return cells.length >= 2 ? cells : null;
};

/** A table starts when the NEXT line is a delimiter row with a pipe in it and as many cells as this
 *  line has (the GFM rule) — so a lone `---` under a line that happens to hold a `|` stays a rule. */
const isTableStart = (content: string, lineStart: number, lineEnd: number, nextLineStart: number): boolean => {
  const nl = content.indexOf('\n', nextLineStart);
  const nextEnd = nl === -1 ? content.length : nl;
  const next = content.slice(nextLineStart, nextEnd);
  if (!next.includes('|') || !next.includes('-') || !TABLE_DELIM.test(next)) return false;
  return tableCells(content, lineStart, lineEnd, []).length === tableCells(content, nextLineStart, nextEnd, []).length;
};

/** The tab-separated rows starting at this line, when there are at least two of the same width. */
const tabRun = (content: string, lineStart: number, lineEnd: number): { rows: MdSpan[][]; end: number } | null => {
  const head = tabCells(content, lineStart, lineEnd);
  if (!head) return null;
  const rows = [head];
  let end = lineEnd;
  while (end < content.length) {
    const next = end + 1;
    const nl = content.indexOf('\n', next);
    const nextEnd = nl === -1 ? content.length : nl;
    const cells = tabCells(content, next, nextEnd);
    if (!cells || cells.length !== head.length) break;
    rows.push(cells);
    end = nextEnd;
  }
  return rows.length >= 2 ? { rows, end } : null;
};

/** True when the whole block is one ordinary paragraph — the "nothing to render" fast path. */
export const isPlainParagraph = (doc: MdDoc, content: string): boolean =>
  doc.blocks.length === 1 &&
  doc.blocks[0]!.kind === 'para' &&
  doc.blocks[0]!.text.start === 0 &&
  doc.blocks[0]!.text.end === content.length;
