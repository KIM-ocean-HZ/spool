import { describe, expect, it } from 'vitest';
import { placePanel } from './CorrectionPopover';

// P16 验收（11-10 Ocean：预览先是「随着滑动移动，不是固定的」，跟着滚之后又「上下滑动，批注会抖动」）：
// 预览现在放进时间线的滚动区里，由浏览器和字一起滚（组件里，没法在这里测）；这里测它打开那一刻放在哪：
// 不盖住那一句、在时间线看得见的那一格里、放不下就缩短。

describe('更正的预览放在哪', () => {
  const feed = { left: 300, right: 1100, top: 80, bottom: 900 };
  const panel = { width: 420, height: 200 };

  it('下面放得下：放在那一句下面，左边对齐那一句', () => {
    expect(placePanel({ x: 400, top: 300, bottom: 320 }, panel, feed)).toEqual({ left: 400, top: 324, maxHeight: 200 });
  });

  it('下面放不下、上面更宽：放到上面，不盖住那一句', () => {
    const p = placePanel({ x: 400, top: 800, bottom: 820 }, panel, feed);
    expect(p.top + p.maxHeight).toBeLessThanOrEqual(800 - 4);
    expect(p.maxHeight).toBe(200);
  });

  it('靠右边：往左挪，整个留在时间线里；两边都窄就缩短', () => {
    expect(placePanel({ x: 1000, top: 300, bottom: 320 }, panel, feed).left).toBe(1100 - 420 - 8);
    const tight = placePanel({ x: 400, top: 120, bottom: 140 }, { width: 420, height: 2000 }, { ...feed, bottom: 400 });
    expect(tight.maxHeight).toBeLessThanOrEqual(400 - 140 - 4 - 8);
    expect(tight.top).toBe(144);
  });
});
