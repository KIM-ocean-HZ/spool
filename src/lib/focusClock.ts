import { TICK_MS } from './breakReminder';

// P6-5 (Ocean 2026-10-06:「专注时钟的 interface 需要有指针，每秒转动更新，并且倒计时转盘也每秒
// 刷新」) — what the sidebar clock shows between two ticks of the reducer.
//
// ⛔ The ACCOUNTING does not move: the reducer still ticks every 30 seconds, asks the system how
// long it has been idle, and credits at most what a tick may credit (lib/breakReminder.ts — that
// is the guard against 「合盖也算专注」). This only draws ahead of it: from the last tick the
// reducer published, forward by however long it has been since — if that tick counted as
// working, and by one tick's worth at most.
//
// ⚠️ The price (P6-5 ③): in the half minute after someone walks away, the clock keeps going until
// the next tick says they are gone, and then steps back — by 30 seconds at most. Stopping it any
// sooner would mean asking about idleness more often, which is the accounting.

export interface PublishedTick {
  /** This sitting's active ms, as the last tick left it. */
  activeMs: number;
  /** When that tick ran. Null before the first tick of this launch. */
  tickAt: number | null;
  /** Whether that tick counted as working. */
  working: boolean;
  /** Set while the break lock is up — the clock reads zero for the whole break. */
  lockUntil: number | null;
}

export const shownActiveMs = (p: PublishedTick, now: number): number => {
  if (p.lockUntil !== null) return 0;
  if (!p.working || p.tickAt === null) return p.activeMs;
  return p.activeMs + Math.min(Math.max(now - p.tickAt, 0), TICK_MS);
};

/** Where the second hand points, as a fraction of a turn: whole seconds only, so it jumps one
 *  mark a second and goes round once a minute. */
export const secondHandFraction = (shownMs: number): number =>
  (Math.floor(shownMs / 1000) % 60) / 60;
