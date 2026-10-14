import { describe, expect, it } from 'vitest';
import { averageFocusMs, dueThisWeek, projectRows, weekDayKeys, weekFocus } from './activity';
import type { Thread } from '@/lib/db/threads';

// P9B-3 (周回顾「活动」).

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe('weekDayKeys', () => {
  it('is Monday to Sunday of the week we are in — a Sunday belongs to the week before it', () => {
    expect(weekDayKeys(at(2026, 10, 14))).toEqual([
      '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
    ]);
    expect(weekDayKeys(at(2026, 10, 18, 23))[0]).toBe('2026-10-12');
    expect(weekDayKeys(at(2026, 10, 19, 0))[0]).toBe('2026-10-19');
  });

  it('crosses a daylight-saving change without skipping or doubling a day', () => {
    // Europe moves its clocks on the last Sunday of October; the US on the first Sunday of
    // November. Whichever zone the tests run in, both weeks must still be seven distinct days.
    for (const now of [at(2026, 10, 25), at(2026, 10, 28), at(2026, 11, 1), at(2026, 11, 4)]) {
      const keys = weekDayKeys(now);
      expect(new Set(keys).size).toBe(7);
      const first = new Date(keys[0]!);
      const last = new Date(keys[6]!);
      expect(Math.round((last.getTime() - first.getTime()) / 86_400_000)).toBe(6);
    }
  });
});

describe('weekFocus', () => {
  const keys = weekDayKeys(at(2026, 10, 14));
  it('before recording began: no record (not 0); from then on an empty day is 0; today is live; later days are to come', () => {
    const week = weekFocus(keys, '2026-10-14', { '2026-10-14': 300_000 }, { dayKey: '2026-10-14', totalMs: 420_000 });
    expect(week.map((d) => d.kind)).toEqual(['none', 'none', 'value', 'future', 'future', 'future', 'future']);
    expect(week[2]).toEqual({ key: '2026-10-14', kind: 'value', ms: 420_000 });
  });

  it('a day the computer was not used after recording began is a real 0', () => {
    const week = weekFocus(keys, '2026-10-15', { '2026-10-12': 3_600_000, '2026-10-15': 60_000 }, { dayKey: '2026-10-15', totalMs: 60_000 });
    expect(week.slice(0, 4)).toEqual([
      { key: '2026-10-12', kind: 'value', ms: 3_600_000 },
      { key: '2026-10-13', kind: 'value', ms: 0 },
      { key: '2026-10-14', kind: 'value', ms: 0 },
      { key: '2026-10-15', kind: 'value', ms: 60_000 },
    ]);
  });

  it('today counts even before the first minute — the clock is running', () => {
    const week = weekFocus(keys, '2026-10-14', {}, { dayKey: null, totalMs: 0 });
    expect(week[2]).toEqual({ key: '2026-10-14', kind: 'value', ms: 0 });
    expect(week[1]!.kind).toBe('none');
  });
});

describe('averageFocusMs', () => {
  it('divides only by the days that have a record', () => {
    const keys = weekDayKeys(at(2026, 10, 14));
    const week = weekFocus(keys, '2026-10-14', { '2026-10-13': 1_800_000 }, { dayKey: '2026-10-14', totalMs: 600_000 });
    // Monday has no record; Tuesday 30 min, Wednesday (today) 10 min ⇒ 20 min, not 13⅓
    expect(averageFocusMs(week)).toBe(1_200_000);
    expect(averageFocusMs([{ key: 'x', kind: 'none' }])).toBeNull();
  });
});

describe('projectRows', () => {
  it('most blocks first, at most five, the rest folded; projects with nothing or gone are not rows', () => {
    const counts = [
      { threadId: 'a', capture: 1, self: 0, ai: 0 },
      { threadId: 'b', capture: 3, self: 2, ai: 1 },
      { threadId: 'c', capture: 0, self: 0, ai: 0 },
      { threadId: 'gone', capture: 9, self: 0, ai: 0 },
      ...['d', 'e', 'f', 'g', 'h'].map((id) => ({ threadId: id, capture: 1, self: 1, ai: 0 })),
    ];
    const titles: Record<string, string> = { a: '甲', b: '乙', c: '丙', d: 'D', e: 'E', f: 'F', g: 'G', h: 'H' };
    const { shown, rest } = projectRows(counts, (id) => titles[id] ?? null);
    expect(shown.map((r) => r.threadId)).toEqual(['b', 'd', 'e', 'f', 'g']);
    expect(rest.map((r) => r.threadId)).toEqual(['h', 'a']);
    expect(shown[0]!.total).toBe(6);
  });
});

describe('dueThisWeek', () => {
  const th = (id: string, deadline: number | null, status: Thread['status'] = 'active') =>
    ({ id, title: id, deadline, status }) as Thread;
  it('late first, then the soonest; finished projects and later weeks are left out', () => {
    const now = at(2026, 10, 14, 9); // a Wednesday
    const rows = dueThisWeek(
      [
        th('this sunday', at(2026, 10, 18, 23)),
        th('today', at(2026, 10, 14, 23)),
        th('late', at(2026, 10, 11, 23)),
        th('next week', at(2026, 10, 19, 23)),
        th('done', at(2026, 10, 15, 23), 'done'),
        th('no date', null),
      ],
      now,
    );
    expect(rows.map((r) => [r.thread.id, r.days])).toEqual([
      ['late', -3],
      ['today', 0],
      ['this sunday', 4],
    ]);
  });
});
