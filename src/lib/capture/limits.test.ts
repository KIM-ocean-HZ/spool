import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { MarkdownContent } from '@/lib/blocks/MarkdownContent';
import { CARD_PREVIEW_CHARS, MAX_CAPTURE_CHARS, cardPreview } from './limits';

// P14 hotfix (Ocean 2026-11-06): a capture of a lot of text froze Spool — a 161,830-character table from
// Notes, drawn as 664 cells, each cell rescanning the whole block (99% CPU in the window's web process).

describe('一次捕捉的上限、捕捉卡只画开头', () => {
  it('上限比真库里最大的一次捕捉（161,830 字）高得多', () => {
    expect(MAX_CAPTURE_CHARS).toBeGreaterThanOrEqual(3 * 161_830);
  });

  it('捕捉卡只画开头一段，切在行尾；短的原样', () => {
    expect(cardPreview('短的')).toBe('短的');
    const long = '第一行\n'.repeat(1000);
    const cut = cardPreview(long);
    expect(cut.length).toBeLessThanOrEqual(CARD_PREVIEW_CHARS);
    expect(long.startsWith(cut)).toBe(true);
    expect(long[cut.length]).toBe('\n');
  });
});

describe('⛔ 大块渲染不许再是平方级', () => {
  // Same make-up as the block that froze it: a tab table, one enormous unbroken line, and a paragraph full
  // of bold and formulas. Linear, this is ~0.15 s here; the quadratic version took seconds at 300 k.
  it('上限那么大的一块（50 万字）3 秒内渲染完', () => {
    const rows = Array.from({ length: 2200 }, (_, i) => `第 ${i} 项\t${'说明文字 '.repeat(10)}${i}`).join('\n');
    const blob = 'data:image/svg+xml,' + '%3Cpath%20d%3D%22M0%22%2F%3E'.repeat(4000);
    const para = '一段说明，带 **粗体** 和 \\(x^2\\) 公式。\n'.repeat(3000);
    const content = `${rows}\n\n${blob}\n\n${para}`.slice(0, MAX_CAPTURE_CHARS);
    const t = performance.now();
    const html = renderToStaticMarkup(createElement(MarkdownContent, { content, withOffsets: true }));
    expect(performance.now() - t).toBeLessThan(3000);
    expect(html).toContain('<table');
    expect(html).toContain('class="katex"');
  }, 20_000);
});
