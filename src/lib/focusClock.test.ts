import { describe, expect, it } from 'vitest';
import { TICK_MS } from './breakReminder';
import { secondHandFraction, shownActiveMs } from './focusClock';

describe('专注时钟每秒往前推 (P6-5)', () => {
  const at = 1_000_000;
  const tick = { activeMs: 600_000, tickAt: at, working: true, lockUntil: null };

  it('在工作：每秒加 1 秒，最多加一跳（30 秒）', () => {
    expect(shownActiveMs(tick, at)).toBe(600_000);
    expect(shownActiveMs(tick, at + 1000)).toBe(601_000);
    expect(shownActiveMs(tick, at + 17_000)).toBe(617_000);
    expect(shownActiveMs(tick, at + TICK_MS)).toBe(630_000);
    // 下一跳迟迟不来（机器卡了、睡了）：⛔ 不会一直往上走。
    expect(shownActiveMs(tick, at + 10 * 60_000)).toBe(630_000);
    // 钟往回拨了：不倒着走。
    expect(shownActiveMs(tick, at - 5000)).toBe(600_000);
  });

  it('这一跳判「不在工作」：不动', () => {
    const away = { ...tick, working: false };
    expect(shownActiveMs(away, at + 1000)).toBe(600_000);
    expect(shownActiveMs(away, at + TICK_MS)).toBe(600_000);
  });

  it('还没跳过：就是发布的那个数', () => {
    expect(shownActiveMs({ ...tick, tickAt: null }, at + 5000)).toBe(600_000);
  });

  it('休息锁着：0', () => {
    expect(shownActiveMs({ ...tick, lockUntil: at + 300_000 }, at + 5000)).toBe(0);
  });

  it('秒针：一秒一格，一分钟一圈', () => {
    expect(secondHandFraction(0)).toBe(0);
    expect(secondHandFraction(999)).toBe(0);
    expect(secondHandFraction(15_000)).toBe(0.25);
    expect(secondHandFraction(30_500)).toBe(0.5);
    expect(secondHandFraction(45_000)).toBe(0.75);
    expect(secondHandFraction(60_000)).toBe(0);
    expect(secondHandFraction(61_000)).toBeCloseTo(1 / 60);
  });
});
