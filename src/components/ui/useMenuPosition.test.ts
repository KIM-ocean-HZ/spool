import { describe, expect, it } from 'vitest';
import { clampMenu } from './useMenuPosition';

// 2026-10-16 (Ocean, P9E 验收第一轮):「点击设为私密之后菜单窗口太长，导致用户无法看见底部信息」.
// The menu was placed once, at the size it opened with; the 「设为私密」 explanation then grew it
// past the bottom of the window. The placement is recomputed whenever the menu changes size —
// this is the rule it is recomputed with.
describe('clampMenu', () => {
  const view = { width: 600, height: 380 };

  it('leaves a menu that fits where the cursor put it', () => {
    expect(clampMenu({ x: 50, y: 40 }, { width: 160, height: 120 }, view)).toEqual({ x: 50, y: 40 });
  });

  it('moves a menu that grew past the bottom up, so its last row is on screen', () => {
    // Opened at y = 150 with 120px; the explanation took it to 300px.
    const at = clampMenu({ x: 50, y: 150 }, { width: 260, height: 300 }, view);
    expect(at.y + 300).toBeLessThanOrEqual(view.height - 8);
    expect(at).toEqual({ x: 50, y: 72 });
  });

  it('never above the top or past the left edge, even when it cannot fit', () => {
    expect(clampMenu({ x: 500, y: 300 }, { width: 260, height: 500 }, view)).toEqual({ x: 332, y: 8 });
  });
});
