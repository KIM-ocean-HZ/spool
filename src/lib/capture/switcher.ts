import type { Thread } from '@/lib/db/threads';
import type { Workspace } from '@/lib/db/workspaces';
import type { SwitcherItem, SwitcherPayload } from './overlayProtocol';

// P15-4（Ocean 2026-11-06 第 255 – 256 条）—— 切换捕捉目标的面板：排什么、滚轮一下走几格、关的时候换不换。
// 纯函数，面板（src/overlay/TargetSwitcher.tsx）和主窗口（hooks/useTargetSwitcher.ts）各用一半。

/** Seven rows, the chosen one in the middle — switcher.rs's ROWS (its window is exactly that tall). */
export const SWITCHER_ROWS = 7;
export const SWITCHER_MIDDLE = Math.floor(SWITCHER_ROWS / 2);
/** Closes by itself this long after the last scroll / click on it — a stray 双击 ⇧ must not leave it up. */
export const SWITCHER_IDLE_MS = 6000;

/**
 * 「列表顺序：甲，最近用过的在前」—— the sidebar's 「最近」 order (RecentSection): the capture target first,
 * then every unfinished project by when it last changed. Private projects are listed: this is the
 * user's own screen, not something an AI reads.
 */
export const buildSwitcherPayload = (
  threadsByWorkspace: Record<string, Thread[]>,
  workspaces: Workspace[],
  untitled: string,
): SwitcherPayload => {
  const wsTitle = new Map(workspaces.map((w) => [w.id, w.title.trim()]));
  const live = Object.values(threadsByWorkspace)
    .flat()
    .filter((t) => t.status !== 'done' && wsTitle.has(t.workspaceId));
  const target = live.find((t) => t.isCaptureTarget) ?? null;
  const rest = live.filter((t) => t !== target).sort((a, b) => b.updatedAt - a.updatedAt);
  const item = (t: Thread): SwitcherItem => ({
    id: t.id,
    title: t.title.trim() || untitled,
    workspaceTitle: wsTitle.get(t.workspaceId) || untitled,
    private: t.isPrivate === true,
  });
  return { items: [...(target ? [target] : []), ...rest].map(item), currentId: target?.id ?? null };
};

/**
 * One wheel event → how many rows to move (−1, 0 or +1). A mouse notch is one row; a trackpad sends
 * a stream of small deltas, which are added up and spent one row per `STEP_PX` — otherwise a light
 * two-finger flick would fly past a dozen projects.
 *
 * A notch is recognised by what browsers report for one: `deltaMode` in lines or pages, or the
 * legacy `wheelDeltaY` a whole multiple of 120 (WebKit and WebView2 both still send it).
 */
export const STEP_PX = 40;
export interface WheelSample {
  deltaY: number;
  deltaMode: number;
  wheelDeltaY?: number;
}
export const wheelStep = (carry: number, e: WheelSample): { step: -1 | 0 | 1; carry: number } => {
  if (e.deltaY === 0) return { step: 0, carry };
  const sign = (e.deltaY > 0 ? 1 : -1) as -1 | 1;
  const notch = e.deltaMode !== 0 || (e.wheelDeltaY !== undefined && e.wheelDeltaY !== 0 && e.wheelDeltaY % 120 === 0);
  if (notch) return { step: sign, carry: 0 };
  // A change of direction starts over: what was left going down is not spent going up.
  const sum = Math.sign(carry) === -sign ? e.deltaY : carry + e.deltaY;
  if (Math.abs(sum) >= STEP_PX) return { step: sign, carry: sum - sign * STEP_PX };
  return { step: 0, carry: sum };
};

/** The project the panel closes on — sent to main only when the user moved to another one. */
export const pickedOnClose = (payload: SwitcherPayload | null, index: number, touched: boolean): string | null => {
  if (!payload || !touched) return null;
  const id = payload.items[index]?.id ?? null;
  return id !== null && id !== payload.currentId ? id : null;
};
