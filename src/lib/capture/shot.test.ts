import { describe, expect, it, vi } from 'vitest';
import { screenshotToTake, shotOf, type Shot } from './shot';

describe('screenshotToTake：截图之后又按了 ⌘C，捕哪一个（2026-10-18，〈HAI- Lecture5〉）', () => {
  const shot: Shot = { atMs: 1_800_000_000_000, kind: 'file' };

  it('截图之后没按 ⌘C：捕截图，不去问剪贴板', async () => {
    const changed = vi.fn().mockResolvedValue(true);
    expect(await screenshotToTake(shot, changed)).toBe(shot);
    expect(await screenshotToTake({ ...shot, copiedAfter: false }, changed)).toEqual({ ...shot, copiedAfter: false });
    expect(changed).not.toHaveBeenCalled();
  });

  it('⌘C 没带来新东西（剪贴板还是截图前那段字）：捕截图 —— 这次的 bug', async () => {
    const after = { ...shot, copiedAfter: true };
    expect(await screenshotToTake(after, async () => false)).toBe(after);
  });

  it('⌘C 复制了新的东西：捕剪贴板，和以前一样', async () => {
    expect(await screenshotToTake({ ...shot, copiedAfter: true }, async () => true)).toBeNull();
  });

  it('没有截图：照旧', async () => {
    expect(await screenshotToTake(null, async () => false)).toBeNull();
  });
});

describe('shotOf', () => {
  it('读 capture-trigger 的 payload；⌘C 那条路（没有 shot）是 null', () => {
    expect(shotOf({ shot: { atMs: 5, kind: 'file', copiedAfter: true } })).toEqual({ atMs: 5, kind: 'file', copiedAfter: true });
    expect(shotOf(null)).toBeNull();
    expect(shotOf(true)).toBeNull();
    expect(shotOf({ shot: { kind: 'file' } })).toBeNull();
  });
});
