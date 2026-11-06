import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { plainText, tokenizeContent } from './contentRuns';
import { parseMarkdown } from './markdown';
import { MarkdownContent } from './MarkdownContent';
import { findMath, renderTex } from './math';

// P14 插队（Ocean 2026-11-06，HANDOFF §9.2 第 250 条）— formulas, tables, quotes, rules, links and
// strikethrough copied out of AI chats. The samples are the shapes that reached the real library: ChatGPT
// copies TeX with \( … \) / \[ … \] (the 〈数学〉 project), most other places write $ … $ / $$ … $$.
// ⛔ The stored text never changes — every test here is about where things are and how they are drawn.

const visibleText = (html: string): string =>
  html
    .replace(/<span[^>]*data-tex="[^"]*"[^>]*>[\s\S]*?<\/span><\/span><\/span>/g, '⟨formula⟩')
    .replace(/<[^>]+>/g, '');

describe('findMath —— 公式在哪儿', () => {
  it('四种写法都认，长的先认；里面的 TeX 原样', () => {
    const c = '行内 \\(a^2\\) 和 $b_1$，单独一行：\\[\n\\frac14\n\\] 以及 $$x$$';
    expect(findMath(c).map((m) => [c.slice(m.innerStart, m.innerEnd), m.display])).toEqual([
      ['a^2', false],
      ['b_1', false],
      ['\n\\frac14\n', true],
      ['x', true],
    ]);
  });

  it('⛔ 钱数不是公式：「$5 和 $10」「价格 $20」「\\$3」都不算', () => {
    expect(findMath('门票 $5 和 $10，套票 $20.')).toEqual([]);
    expect(findMath('escaped \\$3 and $4')).toEqual([]);
    expect(findMath('a $ b $ c')).toEqual([]);
  });

  it('代码里的 $ 和 \\( 是字：跳过给出的范围', () => {
    const c = '`$x$` 和 $y$';
    expect(findMath(c, [{ start: 0, end: 5 }]).map((m) => c.slice(m.start, m.end))).toEqual(['$y$']);
  });

  it('KaTeX 画得出来就给 HTML；写错的公式不抛错', () => {
    expect(renderTex('\\frac{131}{900}', false)).toContain('class="katex"');
    expect(renderTex('\\frac{', false)).not.toBe('');
  });
});

describe('tokenizeContent —— 公式是一整块，别的记号绕着它走', () => {
  it('一个公式一个 run：分隔符藏掉，run 就是里面的 TeX、offset 对得上原文', () => {
    const c = '所以 \\(x=\\frac{131}{900}\\) 成立';
    const f = tokenizeContent(c).find((r) => r.math);
    expect(f).toMatchObject({ text: 'x=\\frac{131}{900}', math: { display: false, source: '\\(x=\\frac{131}{900}\\)' } });
    expect(c.slice(f!.start, f!.end)).toBe(f!.text);
    expect(plainText(c)).toBe('所以 x=\\frac{131}{900} 成立');
  });

  it('⛔ TeX 里的 * 和 _ 不变成斜体 / 粗体；公式外面套粗体照样是粗体', () => {
    const inside = tokenizeContent('$a*b*c$ 和 $x_1 * y_2$');
    expect(inside.filter((r) => r.mark === 'em')).toEqual([]);
    const bold = tokenizeContent('**答案是 \\(x=3\\)**');
    const f = bold.find((r) => r.math)!;
    expect(f.mark).toBe('strong');
    expect(bold.map((r) => r.text).join('')).toBe('答案是 x=3');
  });

  it('搜到公式里的一个字，整个公式算命中（不会只画半个公式）', () => {
    const c = '面积 $\\pi r^2$ 平方米';
    const at = c.indexOf('r^2');
    const runs = tokenizeContent(c, { hits: [{ start: at, end: at + 1, idx: 0 }], activeHitIndex: 0 });
    expect(runs.filter((r) => r.math)).toHaveLength(1);
    expect(runs.find((r) => r.math)!.hit).toEqual({ idx: 0, active: true });
  });

  it('==高亮== 里可以有公式；跨过高亮边界的就不当公式', () => {
    const inside = tokenizeContent('==记住 $e^{i\\pi}=-1$==');
    expect(inside.find((r) => r.math)).toMatchObject({ highlight: true });
    const across = tokenizeContent('==a $b== c$');
    expect(across.some((r) => r.math)).toBe(false);
  });

  it('单独一行的公式：前后那个换行藏掉，不多出空行', () => {
    const c = '所以：\n\\[\n0.25=\\frac14\n\\]\n这完全合法';
    const shown = tokenizeContent(c).map((r) => (r.math ? '⟨F⟩' : r.text)).join('');
    expect(shown).toBe('所以：⟨F⟩这完全合法');
  });

  it('链接只认 http(s)，删除线照 GFM', () => {
    const runs = tokenizeContent('看 [官网](https://spoolapp.org) 别点 [这个](javascript:alert(1)) ~~作废~~');
    expect(runs.find((r) => r.href)).toMatchObject({ text: '官网', href: 'https://spoolapp.org', mark: 'link' });
    expect(runs.filter((r) => r.href)).toHaveLength(1);
    expect(runs.find((r) => r.mark === 'strike')?.text).toBe('作废');
  });
});

describe('parseMarkdown —— 表格、引用、分隔线；公式里的行不被当成列表', () => {
  it('GFM 表格：表头、对齐、每格的 offset；公式里的 | 不切格', () => {
    const c = '| 项 | 值 |\n|:---|---:|\n| 绝对值 | $|x|$ |\n| b | 2 |';
    const t = parseMarkdown(c).blocks[0]!;
    expect(t.kind).toBe('table');
    if (t.kind !== 'table') return;
    expect(t.align).toEqual(['left', 'right']);
    expect(t.rows.map((row) => row.map((cell) => c.slice(cell.start, cell.end)))).toEqual([
      ['项', '值'],
      ['绝对值', '$|x|$'],
      ['b', '2'],
    ]);
  });

  it('⛔ 一行里有 | 、下一行是 --- 但格数对不上：不是表格', () => {
    expect(parseMarkdown('a | b | c\n---').blocks.map((b) => b.kind)).not.toContain('table');
  });

  it('引用连成一块，--- 是分隔线', () => {
    const c = '> 第一行\n> 第二行\n\n---\n正文';
    const doc = parseMarkdown(c);
    expect(doc.blocks.map((b) => b.kind)).toEqual(['quote', 'hr', 'para']);
    const q = doc.blocks[0]!;
    expect(plainText(c.slice(0, q.text.end))).toBe('第一行\n第二行');
  });

  it('⛔ 公式中间的行哪怕以 - 或 # 开头，也还是公式', () => {
    const c = '解：\n\\[\n- x + 1\n# y\n\\]\n完';
    expect(parseMarkdown(c).blocks.map((b) => b.kind)).toEqual(['para']);
  });

  it('列表那一行开头的公式跨到下面几行：整个公式算这一项', () => {
    const c = '1. 例如 \\[\nx=1\n\\]\n2. 下一项';
    const doc = parseMarkdown(c);
    expect(doc.blocks.map((b) => b.kind)).toEqual(['item', 'item']);
    expect(c.slice(doc.blocks[0]!.text.start, doc.blocks[0]!.text.end)).toBe('例如 \\[\nx=1\n\\]');
  });
});

describe('MarkdownContent —— 真库里那几种样子画出来', () => {
  // The shape of a real 〈数学〉 block (ChatGPT copy): inline \( \), display \[ \] glued to the next text,
  // a list, bold.
  const real =
    '只有**凸多边形（convex polygon）**的每个内角才一定小于 \\(180^\\circ\\)。\n' +
    '比如：\n\\[\n270^\\circ\n\\]这完全合法。\n所以：\n- 凸多边形：\\(\\;0^\\circ<\\text{内角}<180^\\circ\\)';

  it('看不到一个 \\( \\[ 或 ^ —— 都画成了公式；原文里的 TeX 留在 data-tex 上', () => {
    const html = renderToStaticMarkup(<MarkdownContent content={real} withOffsets />);
    const text = visibleText(html);
    expect(text).not.toMatch(/\\\(|\\\[|\\\]|\\\)|\^/);
    expect(html.match(/class="katex"/g)?.length).toBe(3);
    expect(html).toContain('data-tex="\\(180^\\circ\\)"');
    expect(html).toContain('katex-display');
  });

  it('withOffsets：公式那一块带着起止两个 offset，划词才能整个选中它', () => {
    const c = '答 $x$ 完';
    const html = renderToStaticMarkup(<MarkdownContent content={c} withOffsets />);
    expect(html).toContain(`data-o="${c.indexOf('x')}" data-o-end="${c.indexOf('x') + 1}"`);
  });

  it('表格画成 <table>，格子里的公式和粗体照样画', () => {
    const html = renderToStaticMarkup(<MarkdownContent content={'| 式 | 说明 |\n|---|---|\n| $a^2$ | **平方** |'} />);
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('class="katex"');
    expect(html).toContain('平方');
    expect(html).not.toContain('**');
  });
});
