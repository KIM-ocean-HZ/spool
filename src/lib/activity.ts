// 周回顾顶上的「活动」(P9B-3, 2026-10-14; Ocean 09-30 第 13、15 条, 10-10 第 76 条) — the pure
// half: which seven days, what each of them says, the average, the list, the due line.
// The component is components/ReviewBoard/ActivityPanel.tsx.
//
// Ocean: 「中文叫『活动』……必须优美简洁，像 Apple 的屏幕使用时间，用最直观的方式、占最小的位置」.
// ⛔ No scoring, no 「比上周多了多少」, no time per app or per project (第 15 条). Block counts stay
// counts; focus time is the one clock Spool already keeps (lib/breakReminder.ts).
// ⛔ Nothing here goes into a prompt or to MCP — 「活动」 is for the user's eyes only.

import { dayKeyOf } from '@/lib/breakReminder';
import type { ProjectBlockCounts } from '@/lib/db/blocks';
import type { FocusDays } from '@/lib/db/focusDay';
import type { Thread } from '@/lib/db/threads';
import { dueInDays } from '@/lib/threads/deadline';
import { endOfWeek, startOfWeek } from '@/lib/weeks';

/** The seven day keys of the week `now` falls in, Monday first (lib/weeks.ts — the same week
 *  the review list groups by). ⚠️ Stepped with setDate, not by adding 24 h: a DST week has a
 *  23- or 25-hour day in it. */
export const weekDayKeys = (now: number): string[] => {
  const start = new Date(startOfWeek(now));
  return Array.from({ length: 7 }, (_, i) =>
    dayKeyOf(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12).getTime()),
  );
};

/** One column. `none` = there is no record for that day, which is NOT 0: before this build was
 *  installed nothing was kept (Ocean's wording: 不许冒充 0). `future` = it has not happened. */
export type DayFocus = { key: string; kind: 'value'; ms: number } | { key: string; kind: 'none' | 'future' };

/**
 * What each day of the week says.
 *
 * ⚠️ 「没有记录」 and 「0」 are told apart by when recording began — the earliest day in the
 * history. Before it: no record. From it on: a day with no entry is a day the computer was not
 * used, and that is a real 0. Today always has a value: the clock is running (P9B-2), so even a
 * minute-old install is recording today.
 * ⚠️ Today reads the running number (`live`, breakStore) — the same one the sidebar clock prints
 * as 「今天已专注 N 分钟」 — never the last write to disk.
 */
export const weekFocus = (
  keys: readonly string[],
  todayKey: string,
  days: FocusDays,
  live: { dayKey: string | null; totalMs: number },
): DayFocus[] => {
  const recorded = Object.keys(days);
  if (live.dayKey) recorded.push(live.dayKey);
  recorded.push(todayKey);
  const since = recorded.sort()[0]!;
  return keys.map((key): DayFocus => {
    if (key > todayKey) return { key, kind: 'future' };
    if (key === live.dayKey) return { key, kind: 'value', ms: live.totalMs };
    if (key === todayKey) return { key, kind: 'value', ms: days[key] ?? 0 };
    if (days[key] !== undefined) return { key, kind: 'value', ms: days[key]! };
    return key >= since ? { key, kind: 'value', ms: 0 } : { key, kind: 'none' };
  });
};

/** Average per day, over the days that HAVE a record — a day from before recording began is not
 *  a 0 to divide by. Null when there is nothing to average. */
export const averageFocusMs = (week: readonly DayFocus[]): number | null => {
  const values = week.flatMap((d) => (d.kind === 'value' ? [d.ms] : []));
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
};

export interface ProjectRow extends ProjectBlockCounts {
  title: string;
  total: number;
}

/** The short list: most new blocks first (title breaks a tie, so the order is stable), at most
 *  `limit` shown, the rest folded into 「另外 N 个项目」. Projects with nothing this week are not
 *  rows. Unknown projects (deleted since) are dropped. */
export const projectRows = (
  counts: readonly ProjectBlockCounts[],
  titleOf: (id: string) => string | null,
  limit = 5,
): { shown: ProjectRow[]; rest: ProjectRow[] } => {
  const rows = counts
    .map((c) => ({ ...c, title: titleOf(c.threadId), total: c.capture + c.self + c.ai }))
    .filter((r): r is ProjectRow => r.title !== null && r.total > 0)
    .sort((a, b) => b.total - a.total || a.title.localeCompare(b.title));
  return { shown: rows.slice(0, limit), rest: rows.slice(limit) };
};

/** The due line: unfinished projects due by the end of this week, or already late — the latest
 *  first, then the soonest. `days`: 0 = today, negative = overdue (lib/threads/deadline.ts). */
export const dueThisWeek = (threads: readonly Thread[], now: number): { thread: Thread; days: number }[] => {
  const lastDay = Math.round((startOfDayOf(endOfWeek(startOfWeek(now))) - startOfDayOf(now)) / 86_400_000);
  return threads
    .flatMap((thread) => {
      const days = dueInDays(thread, now);
      return days !== null && days <= lastDay ? [{ thread, days }] : [];
    })
    .sort((a, b) => a.days - b.days || a.thread.title.localeCompare(b.thread.title));
};

const startOfDayOf = (ms: number): number => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
