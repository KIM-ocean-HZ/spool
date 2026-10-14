import { describe, expect, it } from 'vitest';
import { dayKeyOf, initialBreakState, PRESENCE_WINDOW_MS, TICK_MS, tickBreakState } from '@/lib/breakReminder';
import { DAYS_KEPT, cleanDays, readFocusFile, withDay, type FocusDay } from './focusDay';

// P9B-2 (Ocean 09-30 第 16 条 C-D1): focus.json keeps one number per day. Still a file of its own —
// not the library, not settings.json (the reasons are in focusDay.ts).

const day = (dayKey: string, totalMs: number): FocusDay => ({ dayKey, totalMs, lastActiveAt: 1 });

describe('readFocusFile', () => {
  it('an old file (only `today`) brings that day into the history — those minutes are not lost', () => {
    const { today, days } = readFocusFile(day('2026-10-14', 646_098), undefined);
    expect(today).toEqual(day('2026-10-14', 646_098));
    expect(days).toEqual({ '2026-10-14': 646_098 });
  });

  it('keeps the days already there', () => {
    const { days } = readFocusFile(day('2026-10-14', 10), { '2026-10-13': 7, '2026-10-14': 9 });
    expect(days).toEqual({ '2026-10-13': 7, '2026-10-14': 9 });
  });

  it('a broken file reads as empty, it does not stop anything', () => {
    expect(readFocusFile('nonsense', 42)).toEqual({ today: null, days: {} });
    expect(readFocusFile({ dayKey: 3 }, ['x'])).toEqual({ today: null, days: {} });
  });
});

describe('cleanDays', () => {
  it('drops entries that are not a date and a number of milliseconds', () => {
    expect(cleanDays({ '2026-10-14': 5, 'yesterday': 3, '2026-10-13': -1, '2026-10-12': 'x', '2026-10-11': 2 })).toEqual({
      '2026-10-14': 5,
      '2026-10-11': 2,
    });
  });
});

describe('withDay', () => {
  it('records today and keeps only the last 53 weeks', () => {
    let days: Record<string, number> = {};
    // a year and a half of days
    const start = new Date(2025, 3, 1);
    for (let i = 0; i < 540; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      days = withDay(days, day(dayKeyOf(d.getTime()), i));
    }
    const keys = Object.keys(days).sort();
    expect(keys).toHaveLength(DAYS_KEPT);
    expect(days[keys[keys.length - 1]!]).toBe(539);
  });

  it('does not change the history it was given', () => {
    const before = { '2026-10-13': 7 };
    withDay(before, day('2026-10-14', 3));
    expect(before).toEqual({ '2026-10-13': 7 });
  });
});

describe('rolling over to a new day', () => {
  it("leaves yesterday's number in the history as that day's final number", () => {
    // work 20 minutes one evening, stop, come back the next morning and work again
    const evening = new Date(2026, 9, 13, 21, 0).getTime();
    let s = initialBreakState();
    let days: Record<string, number> = {};
    const tick = (now: number) => {
      s = tickBreakState(s, { now, workMs: 60 * 60 * 1000, focused: true, systemIdleMs: 1000, lastCaptureAt: null }).state;
      if (s.dayKey && s.lastActiveAt !== null) days = withDay(days, { dayKey: s.dayKey, totalMs: s.totalMs, lastActiveAt: s.lastActiveAt });
    };
    for (let t = evening; t <= evening + 20 * 60 * 1000; t += TICK_MS) tick(t);
    const morning = new Date(2026, 9, 14, 9, 0).getTime();
    expect(morning - evening).toBeGreaterThan(PRESENCE_WINDOW_MS);
    for (let t = morning; t <= morning + 5 * 60 * 1000; t += TICK_MS) tick(t);
    expect(days['2026-10-13']).toBe(20 * 60 * 1000);
    // today starts from zero (plus the reducer's own capped first tick); it is the live total
    expect(days['2026-10-14']).toBe(s.totalMs);
    expect(s.totalMs).toBeLessThan(20 * 60 * 1000);
  });
});
