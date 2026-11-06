import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Thread } from '@/lib/db/threads';
import type { Workspace } from '@/lib/db/workspaces';
import {
  CLOSE_SWITCHER_COMMAND,
  SET_SWITCHER_GESTURE_COMMAND,
  SHOW_SWITCHER_COMMAND,
  SWITCHER_DISMISS_EVENT,
  SWITCHER_SHOW_EVENT,
  SWITCHER_TRIGGER_EVENT,
} from './overlayProtocol';
import { STEP_PX, SWITCHER_ROWS, buildSwitcherPayload, pickedOnClose, wheelStep } from './switcher';

// P15-4（Ocean 2026-11-06 第 255 – 256 条）—— 切换捕捉目标的面板：最近用过的在前、滚轮一格一个、关的时候才换。

const ws = (id: string, title: string): Workspace =>
  ({ id, title, parentId: null, sortOrder: 0, createdAt: 0, updatedAt: 0 }) as Workspace;
const th = (id: string, workspaceId: string, updatedAt: number, extra: Partial<Thread> = {}): Thread =>
  ({ id, workspaceId, title: id.toUpperCase(), status: 'active', isCaptureTarget: false, isPrivate: false, updatedAt, ...extra }) as Thread;

describe('buildSwitcherPayload —— 和侧栏「最近」一个排法', () => {
  it('捕捉目标第一，其余没完成的按最近改动；私密的也列，完成的和不在的工作区里的不列', () => {
    const p = buildSwitcherPayload(
      {
        w1: [th('old', 'w1', 1), th('target', 'w1', 2, { isCaptureTarget: true }), th('done', 'w1', 99, { status: 'done' })],
        w2: [th('newest', 'w2', 50), th('secret', 'w2', 30, { isPrivate: true }), th('blank', 'w2', 10, { title: '  ' })],
        gone: [th('orphan', 'gone', 100)],
      },
      [ws('w1', '升学'), ws('w2', 'Spool')],
      '未命名',
    );
    expect(p.currentId).toBe('target');
    expect(p.items.map((i) => i.id)).toEqual(['target', 'newest', 'secret', 'blank', 'old']);
    expect(p.items[0]).toEqual({ id: 'target', title: 'TARGET', workspaceTitle: '升学', private: false });
    expect(p.items[2]!.private).toBe(true);
    expect(p.items[3]!.title).toBe('未命名');
  });

  it('没有捕捉目标：currentId 是 null，照最近排', () => {
    const p = buildSwitcherPayload({ w1: [th('a', 'w1', 1), th('b', 'w1', 2)] }, [ws('w1', 'W')], '未命名');
    expect(p).toMatchObject({ currentId: null });
    expect(p.items.map((i) => i.id)).toEqual(['b', 'a']);
  });
});

describe('wheelStep —— 滚轮一格一个，触控板攒够一段才走一格', () => {
  it('鼠标滚轮：一格就是一行，不管报多大', () => {
    expect(wheelStep(0, { deltaY: 100, deltaMode: 0, wheelDeltaY: -120 })).toEqual({ step: 1, carry: 0 });
    expect(wheelStep(0, { deltaY: -4, deltaMode: 0, wheelDeltaY: 120 })).toEqual({ step: -1, carry: 0 });
    expect(wheelStep(0, { deltaY: 3, deltaMode: 1 })).toEqual({ step: 1, carry: 0 });
  });

  it('触控板：小的一下一下攒，够了走一格，余下的留着；换方向从头攒', () => {
    let carry = 0;
    const steps: number[] = [];
    for (const d of [8, 9, 10, 12, 30]) {
      const r = wheelStep(carry, { deltaY: d, deltaMode: 0, wheelDeltaY: -d * 3 });
      carry = r.carry;
      steps.push(r.step);
    }
    // 8 + 9 + 10 + 12 = 39: not yet a row; the 30 after it is.
    expect(steps).toEqual([0, 0, 0, 0, 1]);
    expect(carry).toBe(8 + 9 + 10 + 12 + 30 - STEP_PX);
    const back = wheelStep(carry, { deltaY: -10, deltaMode: 0, wheelDeltaY: 30 });
    expect(back).toEqual({ step: 0, carry: -10 });
    expect(wheelStep(0, { deltaY: 0, deltaMode: 0 })).toEqual({ step: 0, carry: 0 });
  });
});

describe('pickedOnClose —— 关掉那一刻才生效，没动过就什么都不变', () => {
  const payload = { items: [{ id: 'a', title: 'A', workspaceTitle: 'W', private: false }, { id: 'b', title: 'B', workspaceTitle: 'W', private: false }], currentId: 'a' };
  it('滚到别的项目再关 ⇒ 换成它', () => expect(pickedOnClose(payload, 1, true)).toBe('b'));
  it('没滚过、滚回原来那个、没有面板 ⇒ 不换', () => {
    expect(pickedOnClose(payload, 1, false)).toBeNull();
    expect(pickedOnClose(payload, 0, true)).toBeNull();
    expect(pickedOnClose(null, 0, true)).toBeNull();
  });
  it('原来没有捕捉目标：没动过不会把第一行设成目标', () => {
    expect(pickedOnClose({ ...payload, currentId: null }, 0, false)).toBeNull();
    expect(pickedOnClose({ ...payload, currentId: null }, 0, true)).toBe('a');
  });
});

// The two halves of the wire must keep calling things the same — a rename on one side alone fails
// silently (the panel just never opens).
describe('switcher wire ↔ Rust', () => {
  const rs = (f: string) => readFileSync(fileURLToPath(new URL(`../../../src-tauri/src/${f}`, import.meta.url)), 'utf8');
  it('names the same events, commands and size on both sides', () => {
    const switcher = rs('switcher.rs');
    const overlay = rs('overlay.rs');
    expect(switcher).toContain(`pub const TRIGGER_EVENT: &str = "${SWITCHER_TRIGGER_EVENT}";`);
    expect(switcher).toContain(`pub fn ${SHOW_SWITCHER_COMMAND}<`);
    expect(switcher).toContain(`pub fn ${SET_SWITCHER_GESTURE_COMMAND}(`);
    expect(switcher).toContain(`pub const ROWS: usize = ${SWITCHER_ROWS};`);
    expect(overlay).toContain(`"${SWITCHER_SHOW_EVENT}"`);
    expect(overlay).toContain(`"${SWITCHER_DISMISS_EVENT}"`);
    expect(overlay).toContain(`fn ${CLOSE_SWITCHER_COMMAND}(`);
    const lib = rs('lib.rs');
    expect(lib).toContain(`switcher::${SHOW_SWITCHER_COMMAND},`);
    expect(lib).toContain(`switcher::${SET_SWITCHER_GESTURE_COMMAND},`);
  });
});
