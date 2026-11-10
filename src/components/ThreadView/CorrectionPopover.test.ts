import { describe, expect, it } from 'vitest';
import { followSentence } from './CorrectionPopover';

// P16 验收（11-10 Ocean「更正的批注会随着滑动移动，不是固定的」）：预览一直跟着它那一句，形状不变；
// 那一句滚出时间线看得见的那一格时就藏起来，滚回来再出现。

describe('更正的预览跟着那一句', () => {
  const opened = { x: 100, top: 300, bottom: 320 };
  const place = { left: 96, top: 324 };
  const feed = { top: 80, bottom: 900 };

  it('没滚动：还在打开时的位置', () => {
    expect(followSentence(place, opened, opened, feed)).toEqual({ left: 96, top: 324, hidden: false });
  });

  it('往下滚了 120：那一句上去 120，预览也上去 120', () => {
    expect(followSentence(place, opened, { x: 100, top: 180, bottom: 200 }, feed)).toEqual({ left: 96, top: 204, hidden: false });
  });

  it('那一句滚出了时间线（上面或下面）：藏起来；没有可滚的那一格就不藏', () => {
    expect(followSentence(place, opened, { x: 100, top: 40, bottom: 60 }, feed).hidden).toBe(true);
    expect(followSentence(place, opened, { x: 100, top: 950, bottom: 970 }, feed).hidden).toBe(true);
    expect(followSentence(place, opened, { x: 100, top: 40, bottom: 60 }, null).hidden).toBe(false);
  });
});
