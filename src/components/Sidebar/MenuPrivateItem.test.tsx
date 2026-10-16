import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PrivateConfirm, privateMenuTurnsOn } from './MenuPrivateItem';

// P9E-4 (Ocean 2026-10-15 第 119 条) — the right-click 「设为私密 / 取消私密」 and the small
// explanation that comes before it takes effect.
describe('设为私密 / 取消私密 (P9E-4)', () => {
  it('选区里有一个不是私密的，菜单就是「设为私密」；全是私密才是「取消私密」', () => {
    expect(privateMenuTurnsOn([false])).toBe(true);
    expect(privateMenuTurnsOn([true, false])).toBe(true);
    expect(privateMenuTurnsOn([true])).toBe(false);
    expect(privateMenuTurnsOn([true, true])).toBe(false);
  });

  const text = (turnOn: boolean) =>
    renderToStaticMarkup(<PrivateConfirm turnOn={turnOn} onConfirm={() => {}} onCancel={() => {}} />);

  it('设为私密之前说清四件事，外加一句照实的话', () => {
    const html = text(true);
    // §2.2: what it keeps out is what Spool hands an AI — said that way, never as an absolute.
    expect(html).toContain('connected through Spool');
    expect(html).toContain('can still write into it');
    expect(html).toContain('weekly review, compress, stale check, follow-up');
    expect(html).toContain('works as usual');
    expect(html).toContain('going around Spool');
    expect(html).toMatch(/>Make private</);
    expect(html).not.toMatch(/encrypt|completely|fully/i);
  });

  it('取消私密也问一句：取消之后又读得到', () => {
    const html = text(false);
    expect(html).toContain('can read it again');
    expect(html).toMatch(/>Turn off private</);
    expect(html).toMatch(/>Keep private</);
  });
});
