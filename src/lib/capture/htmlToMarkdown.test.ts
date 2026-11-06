import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { findMath } from '@/lib/blocks/math';
import { parseMarkdown } from '@/lib/blocks/markdown';
import { clipboardMarkdown, htmlToMarkdown } from './htmlToMarkdown';
import { parseHtmlForTest } from './htmlTestParser';
import { mathmlToTex } from './mathmlToTex';

// P14 插队（Ocean 2026-11-06，HANDOFF §9.2 第 250 条）— a copy keeps what the user was looking at.
// The cases are the shapes the 11-06 clipboard samples and 〈修改过程〉 #12–#17 showed: Claude desktop
// (KaTeX, MathML without its TeX), ChatGPT desktop (a table with bold), web pages (lists, links), plus the
// other common ways pages carry formulas. The parser here is the test-only one; the app uses DOMParser.

const md = (html: string): string | null => htmlToMarkdown(parseHtmlForTest(html));
const texOf = (mathml: string): string => mathmlToTex(parseHtmlForTest(mathml).childNodes[0]!);
/** Every formula in `s` must be something KaTeX can draw. */
const drawable = (s: string): void => {
  for (const m of findMath(s)) {
    const tex = s.slice(m.innerStart, m.innerEnd);
    expect(() => katex.renderToString(tex, { throwOnError: true, strict: 'ignore', displayMode: m.display }), tex).not.toThrow();
  }
};

describe('公式：页面上画出来的样子 → TeX', () => {
  it('⭐ Claude 桌面版复制出来的那一行（真样本）：表格还是表格，公式回到 TeX，画出来的字形一个不带', () => {
    const html = readFileSync(join(__dirname, 'fixtures/claude-katex-row.html'), 'utf8');
    const out = md(html)!;
    expect(out).toBe('| 名称 | 公式 |\n| --- | --- |\n| 换底公式 | \\(\\log_{a}b=\\frac{\\log_{c}b}{\\log_{c}a}\\) |');
    drawable(out);
    expect(parseMarkdown(out).blocks.map((b) => b.kind)).toEqual(['table']);
  });

  it('KaTeX 留着 TeX 的时候直接用它；单独一行的用 \\[ \\]', () => {
    const k = (display: boolean) =>
      `${display ? '<span class="katex-display">' : ''}<span class="katex"><span class="katex-mathml"><math${display ? ' display="block"' : ''}><semantics><mrow><mi>x</mi></mrow><annotation encoding="application/x-tex">x^2 + \\frac{1}{2}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">x2+12</span></span>${display ? '</span>' : ''}`;
    expect(md(`<p>所以 ${k(false)} 成立</p>`)).toBe('所以 \\(x^2 + \\frac{1}{2}\\) 成立');
    expect(md(`<p>所以：</p>${k(true)}<p>完</p>`)).toBe('所以：\n\n\\[\nx^2 + \\frac{1}{2}\n\\]\n\n完');
  });

  it('MathJax 3、MathJax 2、维基百科也认', () => {
    expect(md('<p>a <mjx-container display="true"><mjx-math aria-hidden="true">x</mjx-math><mjx-assistive-mml><math display="block"><msqrt><mn>2</mn></msqrt></math></mjx-assistive-mml></mjx-container></p>')).toBe(
      'a\n\n\\[\n\\sqrt{2}\n\\]',
    );
    expect(md('<p>令 <span class="MathJax">E</span><script type="math/tex">E=mc^2</script> 成立</p>')).toBe('令 E\\(E=mc^2\\) 成立');
    expect(
      md('<p>面积 <span class="mwe-math-element"><span style="display:none"><math alttext="{\\displaystyle \\pi r^{2}}"><mi>π</mi></math></span><img alt="{\\displaystyle \\pi r^{2}}" src="x.svg"></span></p>'),
    ).toBe('面积 \\({\\displaystyle \\pi r^{2}}\\)');
  });

  it('MathML 常见结构都能写回 TeX，KaTeX 都画得出来', () => {
    const cases: [string, string][] = [
      ['<math><msup><mi>a</mi><mrow><mi>m</mi><mo>+</mo><mi>n</mi></mrow></msup></math>', 'a^{m+n}'],
      ['<math><msub><mi>a</mi><mn>1</mn></msub><mo>⋅</mo><msup><mi>r</mi><mrow><mi>n</mi><mo>−</mo><mn>1</mn></mrow></msup></math>', 'a_1\\cdot r^{n-1}'],
      ['<math><mfrac><mrow><mi>n</mi><mo>(</mo><mi>n</mi><mo>−</mo><mn>1</mn><mo>)</mo></mrow><mn>2</mn></mfrac></math>', '\\frac{n(n-1)}{2}'],
      ['<math><mroot><mi>x</mi><mn>3</mn></mroot><mo>≠</mo><msqrt><mi>x</mi></msqrt></math>', '\\sqrt[3]{x}\\ne \\sqrt{x}'],
      ['<math><munderover><mo>∑</mo><mrow><mi>k</mi><mo>=</mo><mn>0</mn></mrow><mi>n</mi></munderover><msup><mi>a</mi><mi>k</mi></msup></math>', '\\sum_{k=0}^{n}a^k'],
      ['<math><mrow><mo fence="true">(</mo><mfrac linethickness="0px"><mi>n</mi><mi>k</mi></mfrac><mo fence="true">)</mo></mrow></math>', '\\binom{n}{k}'],
      ['<math><mrow><mo fence="true">(</mo><mfrac><mi>a</mi><mi>b</mi></mfrac><mo fence="true">)</mo></mrow></math>', '\\left(\\frac{a}{b}\\right)'],
      ['<math><mover accent="true"><mi>x</mi><mo>ˉ</mo></mover></math>', '\\overset{ˉ}{x}'],
      ['<math><mover accent="true"><mi>x</mi><mo>‾</mo></mover><mo>→</mo><mi>α</mi><mo>≤</mo><mi>Δ</mi></math>', '\\overline{x}\\to \\alpha \\le \\Delta'],
      ['<math><mi>log</mi><mo>⁡</mo><mi>x</mi><mo>+</mo><mi>sin</mi><mo>⁡</mo><mi>θ</mi></math>', '\\log x+\\sin \\theta'],
      ['<math><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mn>0</mn></mtd></mtr><mtr><mtd><mn>0</mn></mtd><mtd><mn>1</mn></mtd></mtr></mtable></math>', '\\begin{matrix}1 & 0 \\\\ 0 & 1\\end{matrix}'],
      ['<math><mi>y</mi><mo>=</mo><msup><mi>a</mi><mi>x</mi></msup><mo>⟺</mo><mi>x</mi><mo>=</mo><msub><mrow><mi>log</mi><mo>⁡</mo></mrow><mi>a</mi></msub><mi>y</mi></math>', 'y=a^x\\iff x=\\log_{a}y'],
    ];
    for (const [mathml, tex] of cases) {
      expect(texOf(mathml)).toBe(tex);
      expect(() => katex.renderToString(texOf(mathml), { throwOnError: true, strict: 'ignore' }), tex).not.toThrow();
    }
  });
});

describe('排版：表格、列表、标题、代码、链接', () => {
  it('⭐ ChatGPT 桌面版选中复制的那种：粗体标题 + 表格 + 粗体', () => {
    const out = md(
      '<p><strong>4. 段落分工</strong></p><table><thead><tr><th>段落</th><th>建议词数</th></tr></thead><tbody><tr><td>开头</td><td>55</td></tr><tr><td>结尾</td><td>50</td></tr></tbody></table><p>约 <strong>460 词</strong>。</p>',
    );
    expect(out).toBe('**4. 段落分工**\n\n| 段落 | 建议词数 |\n| --- | --- |\n| 开头 | 55 |\n| 结尾 | 50 |\n\n约 **460 词**。');
  });

  it('⭐ 列表复制过来还是列表：无序、有序（从几开始）、嵌套、项里的段落', () => {
    expect(md('<ul><li><p>第一条</p></li><li>第二条<ul><li>子条</li></ul></li></ul>')).toBe('- 第一条\n- 第二条\n  - 子条');
    expect(md('<ol start="3"><li>三</li><li>四</li></ol>')).toBe('3. 三\n4. 四');
    const doc = parseMarkdown(md('<ul><li>a</li><li>b<ol><li>c</li></ol></li></ul>')!);
    expect(doc.blocks.map((b) => (b.kind === 'item' ? `${b.indent}${b.marker}` : b.kind))).toEqual(['0•', '0•', '11.']);
  });

  it('标题、引用、分隔线、删除线、链接、行内代码；代码块原样、不带「复制」按钮', () => {
    const out = md(
      '<h2>小结</h2><blockquote><p>引一句</p></blockquote><hr><p><del>旧的</del> 见 <a href="https://spoolapp.org">官网</a>，用 <code>npm i</code>。</p><pre><button>Copy code</button><code>  if (a) {\n    b();\n  }</code></pre>',
    );
    expect(out).toBe('## 小结\n\n> 引一句\n\n---\n\n~~旧的~~ 见 [官网](https://spoolapp.org)，用 `npm i`。\n\n```\n  if (a) {\n    b();\n  }\n```');
  });

  it('表格格子里的 | 和换行不会把表格弄坏', () => {
    expect(md('<table><tr><th>式</th></tr><tr><td>a | b<br>c</td></tr></table>')).toBe('| 式 |\n| --- |\n| a \\| b c |');
  });
});

describe('什么时候还用纯文字', () => {
  it('HTML 里没有纯文字装不下的东西（代码编辑器的彩色 span、普通段落）⇒ null，纯文字原样', () => {
    expect(md('<div><span style="color:red">const</span> <span>x = 1</span><br><span>y</span></div>')).toBeNull();
    expect(clipboardMarkdown('<p>就一句话</p>', '就一句话', parseHtmlForTest)).toBeNull();
    expect(clipboardMarkdown('', '纯文字', parseHtmlForTest)).toBeNull();
  });

  it('⛔ 转出来的字比纯文字少太多（藏起来的、被跳过的）⇒ 不信它', () => {
    const plain = '这是一段很长的正文，'.repeat(20);
    expect(clipboardMarkdown('<p><strong>标题</strong></p><p aria-hidden="true">x</p>', plain, parseHtmlForTest)).toBeNull();
  });

  it('Windows 的 HTML Format 带着 Version 头也照样认', () => {
    const html = 'Version:0.9\r\nStartHTML:0000000105\r\nEndHTML:0000000200\r\n<html><body><ul><li>a</li><li>b</li></ul></body></html>';
    expect(clipboardMarkdown(html, 'a\nb', parseHtmlForTest)).toBe('- a\n- b');
  });
});
