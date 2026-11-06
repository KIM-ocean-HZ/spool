import { attr, findTex, kids, mathmlToTex, tagOf, type HNode } from './mathmlToTex';

// P14 插队（Ocean 2026-11-06，HANDOFF §9.2 第 250 条）: what a copy carried, kept.
//
// A capture used to take the clipboard's plain text only. Copied out of an AI desktop app or a page, that
// text has already lost what the user was looking at (〈修改过程〉 #12–#17, and the 11-06 clipboard samples):
// a table comes out as tab-separated lines, a list as bare lines, **bold** as nothing, and a KaTeX formula
// as its glyphs one per line, twice. The HTML on the same clipboard still has all of it. This turns that
// HTML into the markdown Spool already stores and draws — formulas as \( … \) / \[ … \] TeX, the way
// ChatGPT's own copy button writes them — so what is stored is what an AI reads best, too.
//
// ⚠️ It returns null when the HTML holds nothing the plain text lacks (a code editor's coloured spans, a
// plain paragraph): then the plain text is kept exactly as before. And a converted result that has lost
// most of the text is not trusted either (`clipboardMarkdown`).

const ELEMENT = 1;
const TEXT = 3;

const SKIP = new Set(['script', 'style', 'meta', 'link', 'title', 'head', 'svg', 'noscript', 'template', 'button', 'img', 'input', 'select', 'option', 'textarea']);
const BLOCK = new Set([
  'p', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav', 'figure', 'figcaption',
  'details', 'summary', 'dl', 'dt', 'dd', 'address', 'center', 'body', 'html',
]);

interface Ctx {
  pre: boolean;
  cell: boolean;
  /** Set as soon as anything the plain text could not carry turns up. */
  found: { structure: boolean };
}

const classes = (n: HNode): string => ` ${attr(n, 'class') ?? ''} `;
const hasClass = (n: HNode, c: string): boolean => classes(n).includes(` ${c} `);

/** A formula element in any of the shapes pages use, as TeX — or null if `n` is not one. */
function formulaOf(n: HNode): { tex: string; display: boolean } | null {
  const tag = tagOf(n);
  // MathJax 2: the TeX itself sits in a script tag.
  if (tag === 'script') {
    const type = attr(n, 'type') ?? '';
    if (!type.startsWith('math/tex')) return null;
    const tex = (n.textContent ?? '').trim();
    return tex ? { tex, display: type.includes('mode=display') } : null;
  }
  if (tag === 'math') {
    const display = attr(n, 'display') === 'block';
    const alt = attr(n, 'alttext');
    const tex = findTex(n) ?? (alt ? alt.trim() : null) ?? mathmlToTex(n);
    return tex ? { tex, display } : null;
  }
  // KaTeX: <span class="katex"> holds a MathML copy (.katex-mathml) and the drawn glyphs (.katex-html).
  // MathJax 3: <mjx-container> holds <mjx-assistive-mml><math …>. Wikipedia: .mwe-math-element.
  if (hasClass(n, 'katex') || tag === 'mjx-container' || hasClass(n, 'mwe-math-element')) {
    const math = findFirst(n, (k) => tagOf(k) === 'math');
    const scriptTex = findFirst(n, (k) => tagOf(k) === 'script' && (attr(k, 'type') ?? '').startsWith('math/tex'));
    const img = findFirst(n, (k) => tagOf(k) === 'img' && !!attr(k, 'alt'));
    const tex =
      (math && (findTex(math) ?? attr(math, 'alttext') ?? mathmlToTex(math))) ||
      (scriptTex ? (scriptTex.textContent ?? '').trim() : '') ||
      (img ? attr(img, 'alt')!.trim() : '');
    if (!tex) return null;
    const display =
      attr(n, 'display') === 'true' || (math ? attr(math, 'display') === 'block' : false) || hasClass(n, 'katex-display');
    return { tex, display };
  }
  return null;
}

function findFirst(n: HNode, pred: (k: HNode) => boolean): HNode | null {
  for (const k of kids(n)) {
    if (k.nodeType !== ELEMENT) continue;
    if (pred(k)) return k;
    const deep = findFirst(k, pred);
    if (deep) return deep;
  }
  return null;
}

/** `**` around the text, with any surrounding spaces kept OUTSIDE the markers (`** a**` is not bold). */
const wrap = (s: string, mark: string): string => {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s)!;
  return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : s;
};

const inlineOnly = (s: string): string => s.replace(/\s*\n+\s*/g, ' ').trim();

function convert(n: HNode, ctx: Ctx): string {
  if (n.nodeType === TEXT) {
    const t = n.textContent ?? '';
    return ctx.pre ? t : t.replace(/[ \t\r\n\f]+/g, ' ');
  }
  if (n.nodeType !== ELEMENT) return '';
  if (attr(n, 'aria-hidden') === 'true') return '';
  const tag = tagOf(n);

  const formula = formulaOf(n);
  if (formula) {
    ctx.found.structure = true;
    const tex = formula.tex.replace(/\s*\n\s*/g, ' ');
    if (formula.display && !ctx.cell) return `\n\n\\[\n${tex}\n\\]\n\n`;
    return `\\(${tex}\\)`;
  }
  if (SKIP.has(tag)) return '';

  const children = (c: Ctx = ctx): string => kids(n).map((k) => convert(k, c)).join('');
  const heading = /^h([1-6])$/.exec(tag);
  if (heading) {
    ctx.found.structure = true;
    const body = inlineOnly(children());
    return body ? `\n\n${'#'.repeat(Number(heading[1]))} ${body}\n\n` : '';
  }
  switch (tag) {
    case 'br':
      return ctx.cell ? ' ' : '\n';
    case 'hr':
      ctx.found.structure = true;
      return '\n\n---\n\n';
    case 'strong':
    case 'b': {
      const body = children();
      if (body.trim()) ctx.found.structure = true;
      return wrap(body, '**');
    }
    case 'em':
    case 'i': {
      const body = children();
      if (body.trim()) ctx.found.structure = true;
      return wrap(body, '*');
    }
    case 'del':
    case 's':
    case 'strike':
      ctx.found.structure = true;
      return wrap(children(), '~~');
    case 'code': {
      if (ctx.pre) return children();
      ctx.found.structure = true;
      const body = (n.textContent ?? '').replace(/\n/g, ' ');
      return body.includes('`') ? `\`\` ${body} \`\`` : `\`${body}\``;
    }
    case 'pre': {
      ctx.found.structure = true;
      const code = children({ ...ctx, pre: true }).replace(/\n+$/, '');
      return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
    }
    case 'a': {
      const body = children();
      const href = attr(n, 'href') ?? '';
      if (!/^https?:\/\//.test(href) || !body.trim() || body.trim() === href) return body;
      ctx.found.structure = true;
      return `[${inlineOnly(body)}](${href})`;
    }
    case 'blockquote': {
      ctx.found.structure = true;
      const body = tidy(children());
      return `\n\n${body
        .split('\n')
        .map((l) => (l ? `> ${l}` : '>'))
        .join('\n')}\n\n`;
    }
    case 'ul':
    case 'ol':
      ctx.found.structure = true;
      return `\n\n${list(n, ctx)}\n\n`;
    case 'li':
      // A stray <li> outside a list (a partial selection): still a list row.
      ctx.found.structure = true;
      return `\n- ${inlineOnly(children())}\n`;
    case 'table':
      ctx.found.structure = true;
      return `\n\n${table(n, ctx)}\n\n`;
    default:
      return BLOCK.has(tag) ? `\n\n${children()}\n\n` : children();
  }
}

/** One list, its rows marked `- ` / `1. `, a nested list two spaces further in. */
function list(n: HNode, ctx: Ctx): string {
  const ordered = tagOf(n) === 'ol';
  let num = Number(attr(n, 'start') ?? '1') || 1;
  const rows: string[] = [];
  for (const li of kids(n)) {
    if (li.nodeType !== ELEMENT || tagOf(li) !== 'li') continue;
    const marker = ordered ? `${num++}.` : '-';
    const body = tidy(kids(li).map((k) => convert(k, ctx)).join(''))
      // Paragraphs inside one row stay one row; nested rows keep their own lines.
      .split('\n')
      .filter((l) => l.trim() !== '');
    const [first = '', ...rest] = body;
    rows.push(`${marker} ${first.trim()}`);
    for (const l of rest) rows.push(`  ${l}`);
  }
  return rows.join('\n');
}

/** A GFM table. The first row is the header (the HTML's own <th> row when it has one). */
function table(n: HNode, ctx: Ctx): string {
  const rows: string[][] = [];
  const walk = (k: HNode): void => {
    for (const c of kids(k)) {
      if (c.nodeType !== ELEMENT) continue;
      const tag = tagOf(c);
      if (tag === 'tr') {
        rows.push(
          kids(c)
            .filter((cell) => cell.nodeType === ELEMENT && ['td', 'th'].includes(tagOf(cell)))
            .map((cell) => inlineOnly(convert(cell, { ...ctx, cell: true })).replace(/\|/g, '\\|') || ' '),
        );
      } else if (['thead', 'tbody', 'tfoot'].includes(tag)) walk(c);
    }
  };
  walk(n);
  if (rows.length === 0) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const line = (r: string[]): string => `| ${[...r, ...Array(width - r.length).fill(' ')].join(' | ')} |`;
  return [line(rows[0]!), `|${' --- |'.repeat(width)}`, ...rows.slice(1).map(line)].join('\n');
}

/** Blank lines collapsed to one, no trailing spaces, no leading or trailing blank lines. */
const tidy = (s: string): string =>
  s
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+(?=\n)/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');

/** Markdown for `root`'s content, or null when it holds nothing the plain text does not already say. */
export function htmlToMarkdown(root: HNode): string | null {
  const ctx: Ctx = { pre: false, cell: false, found: { structure: false } };
  // Collapsed whitespace leaves a stray space at the start of some lines. Outside code, a line keeps its
  // leading spaces only when they are a list row's nesting; inside a fence nothing is touched.
  let fenced = false;
  const out = tidy(convert(root, ctx))
    .split('\n')
    .map((l) => {
      if (/^```/.test(l)) {
        fenced = !fenced;
        return l;
      }
      if (fenced || /^ *(?:[-*]|\d+\.) /.test(l)) return l;
      return l.trimStart();
    })
    .join('\n')
    .trim();
  return ctx.found.structure && out ? out : null;
}

/** The text of a markdown string with its markers gone, for comparing lengths only. */
const bare = (s: string): string => s.replace(/[*_~`#>|\\\-[\]()]/g, '').replace(/\s+/g, '');

/**
 * What a capture (or a paste) should store: the HTML's markdown when it adds something and has not lost
 * the text on the way, else null — the caller then keeps the plain text exactly as it was.
 * `parse` turns the HTML into a node (the browser's DOMParser in the app).
 */
export function clipboardMarkdown(html: string, plain: string, parse: (html: string) => HNode): string | null {
  if (!html.trim()) return null;
  // Windows' "HTML Format" can arrive with its Version/StartHTML header in front.
  const body = html.replace(/^Version:[\s\S]*?(?=<)/, '');
  let md: string | null;
  try {
    md = htmlToMarkdown(parse(body));
  } catch {
    return null;
  }
  if (!md) return null;
  // A formula's plain text is its glyphs twice, so the markdown is often SHORTER than the plain text —
  // but never by this much unless something was hidden or skipped by mistake.
  const plainLen = bare(plain).length;
  if (plainLen > 0 && bare(md).length < plainLen * 0.3) return null;
  return md;
}

/** The browser's parser, for the app. */
export const domParse = (html: string): HNode => new DOMParser().parseFromString(html, 'text/html').body as unknown as HNode;
