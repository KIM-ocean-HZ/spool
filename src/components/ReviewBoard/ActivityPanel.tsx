import { Info } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { averageFocusMs, dueThisWeek, projectRows, weekDayKeys, weekFocus, type DayFocus, type ProjectRow } from '@/lib/activity';
import { dayKeyOf } from '@/lib/breakReminder';
import { countBlocksByProjectSince, type ProjectBlockCounts } from '@/lib/db/blocks';
import { loadFocus, type FocusDays } from '@/lib/db/focusDay';
import { dateLocale, useT } from '@/lib/i18n';
import { startOfWeek } from '@/lib/weeks';
import { useBreakStore } from '@/stores/breakStore';
import { useThreadsStore } from '@/stores/threadsStore';

// 周回顾顶上的「活动」(P9B-3, 2026-10-14; Ocean 09-30 第 13、15 条, 10-10 第 76 条).
// 「必须优美简洁，像 Apple 的屏幕使用时间，用最直观的方式、占最小的位置」: one big number, seven
// thin columns, a short list, one line of due dates — nothing that needs AI, nothing that costs.
// The rules (which days, what 「没有记录」 means, the average) are in lib/activity.ts; this file
// only draws them. ⚠️ Colours come from tokens (tokens.css: --activity-*, --muted, --accent), so
// the three appearances — 经典浅色 / 经典深色 / 情人节 — need nothing here.
// ⚠️ Chart rules follow the dataviz method: one series in the columns (a quiet tone, today in the
// accent), ≤ 24 px marks with a 4 px rounded data end, a 2 px gap between stacked segments, text in
// ink tokens and never in a series colour, a legend for the three kinds with their totals (the
// light-theme contrast warning makes visible numbers mandatory).

const BAR_AREA = 56; // px — the columns' height
const BAR_W = 14; // px — ≤ 24, the rest of each slot is air

/** 1 h 52 min, split so the digits can be large and the units small (the hero figure). */
const splitDuration = (ms: number): { h: number; m: number } => {
  const minutes = Math.floor(ms / 60_000);
  return { h: Math.floor(minutes / 60), m: minutes % 60 };
};

export default function ActivityPanel() {
  const t = useT();
  // Today's column reads the running number — the one the sidebar clock prints as 「今天已专注 N 分钟」.
  const liveDay = useBreakStore((s) => s.dayKey);
  const liveMs = useBreakStore((s) => s.totalMs);
  const threadsByWs = useThreadsStore((s) => s.threadsByWorkspace);
  const select = useThreadsStore((s) => s.select);
  const [days, setDays] = useState<FocusDays>({});
  const [counts, setCounts] = useState<ProjectBlockCounts[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [hovered, setHovered] = useState<number | null>(null);
  const [showRest, setShowRest] = useState(false);

  // Read again whenever the window comes back to the front — the same rule SpoolCard follows: the
  // numbers have to be fresh the moment the user looks, and nothing here runs on a timer.
  const refresh = useCallback(() => {
    const at = Date.now();
    setNow(at);
    void loadFocus().then(({ days: d }) => setDays(d));
    void countBlocksByProjectSince(startOfWeek(at))
      .then(setCounts)
      .catch((e) => console.warn('[activity] counting blocks failed', e));
  }, []);
  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const threads = useMemo(() => Object.values(threadsByWs).flat(), [threadsByWs]);
  const todayKey = dayKeyOf(now);
  const week = useMemo(
    () => weekFocus(weekDayKeys(now), todayKey, days, { dayKey: liveDay, totalMs: liveMs }),
    [now, todayKey, days, liveDay, liveMs],
  );
  const average = averageFocusMs(week);
  const titleOf = (id: string): string | null => {
    const th = threads.find((x) => x.id === id);
    return th ? th.title.trim() || t('（无标题）') : null;
  };
  const { shown, rest } = projectRows(counts, titleOf);
  const due = dueThisWeek(threads, now);
  const totals = [...shown, ...rest].reduce(
    (acc, r) => ({ capture: acc.capture + r.capture, self: acc.self + r.self, ai: acc.ai + r.ai }),
    { capture: 0, self: 0, ai: 0 },
  );
  const maxRow = Math.max(1, ...shown.map((r) => r.total), ...(showRest ? rest.map((r) => r.total) : []));

  const dayLabel = (key: string, style: 'narrow' | 'short'): string =>
    key === todayKey
      ? t('今天')
      : new Date(`${key}T12:00:00`).toLocaleDateString(dateLocale(), { weekday: style });
  const minutesText = (ms: number) => `${Math.floor(ms / 60_000)} ${t('分钟')}`;
  const readoutDay = hovered === null ? week.findIndex((d) => d.key === todayKey) : hovered;
  const readout = readoutDay >= 0 ? week[readoutDay]! : null;
  const readoutText = !readout
    ? ''
    : readout.kind === 'value'
      ? `${dayLabel(readout.key, 'short')} · ${minutesText(readout.ms)}`
      : readout.kind === 'none'
        ? `${dayLabel(readout.key, 'short')} · ${t('没有记录')}`
        : `${dayLabel(readout.key, 'short')} · ${t('还没到')}`;

  // A full minute of focus is the floor of the scale, so a two-minute day is not drawn as a wall.
  const maxMs = Math.max(60 * 60_000, ...week.flatMap((d) => (d.kind === 'value' ? [d.ms] : [])));

  const SEGMENTS = [
    { key: 'capture', label: t('捕捉的'), color: 'var(--activity-capture)' },
    { key: 'self', label: t('自己写的'), color: 'var(--activity-self)' },
    { key: 'ai', label: t('AI 写回的'), color: 'var(--activity-ai)' },
  ] as const;

  const row = (r: ProjectRow) => (
    <li key={r.threadId} className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => select(r.threadId)}
        className="w-40 flex-none truncate text-left text-xs text-ink-2 transition-colors hover:text-accent"
        title={r.title}
      >
        {r.title}
      </button>
      <div
        className="flex h-2 min-w-0 flex-1 items-stretch"
        title={t('捕捉的 {a} · 自己写的 {b} · AI 写回的 {c}', { a: r.capture, b: r.self, c: r.ai })}
        aria-label={t('捕捉的 {a} · 自己写的 {b} · AI 写回的 {c}', { a: r.capture, b: r.self, c: r.ai })}
      >
        <div className="flex gap-[2px]" style={{ width: `${(r.total / maxRow) * 100}%` }}>
          {SEGMENTS.filter((s) => r[s.key] > 0).map((s, i, all) => (
            <div
              key={s.key}
              className={i === all.length - 1 ? 'rounded-r-[4px]' : ''}
              style={{ flexGrow: r[s.key], flexBasis: 0, minWidth: 2, background: s.color }}
            />
          ))}
        </div>
      </div>
      <span className="w-6 flex-none text-right text-xs tabular-nums text-ink-2">{r.total}</span>
    </li>
  );

  return (
    <section aria-label={t('活动')} className="mb-6 rounded-md border border-line px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium text-ink-2">{t('活动')}</h2>
        <span
          className="flex items-center gap-1 text-[11px] text-muted"
          title={t('专注时间 = 你在电脑前、并且 Spool 在前台或 15 分钟内捕捉过的时间，和休息提醒是同一个计时；不是在某个项目上花的时间。')}
        >
          <Info size={11} className="flex-none" />
          {t('这一周')}
        </span>
      </div>

      <div className="mt-2 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="text-[11px] text-muted">{t('平均每天专注')}</div>
          {average === null ? (
            <div className="mt-1 text-[48px] font-semibold leading-none text-muted">—</div>
          ) : (
            <div className="mt-1 flex items-baseline gap-1 font-semibold text-ink">
              {splitDuration(average).h > 0 && (
                <>
                  <span className="text-[48px] leading-none">{splitDuration(average).h}</span>
                  <span className="mr-1 text-base text-ink-2">{t('小时')}</span>
                </>
              )}
              <span className="text-[48px] leading-none">{splitDuration(average).m}</span>
              <span className="text-base text-ink-2">{t('分钟')}</span>
            </div>
          )}
        </div>

        <div className="flex-none" onMouseLeave={() => setHovered(null)}>
          <div className="mb-1 h-4 text-right text-[11px] text-ink-2 first-letter:uppercase" aria-live="polite">
            {readoutText}
          </div>
          <div className="flex items-end gap-[10px] border-b border-line" style={{ height: BAR_AREA }} role="img" aria-label={t('每天专注多久')}>
            {week.map((d: DayFocus, i) => (
              <div
                key={d.key}
                onMouseEnter={() => setHovered(i)}
                className="flex h-full items-end justify-center"
                style={{ width: BAR_W + 8 }}
              >
                {d.kind === 'value' ? (
                  <div
                    className="rounded-t-[4px]"
                    style={{
                      width: BAR_W,
                      height: Math.max(2, Math.round((d.ms / maxMs) * BAR_AREA)),
                      background: d.key === todayKey ? 'var(--accent)' : 'var(--muted)',
                    }}
                  />
                ) : d.kind === 'none' ? (
                  // 没有记录：不画柱子，一个淡的小圈 —— ⛔ 不许长得像 0（0 是一道 2px 的矮柱）。
                  <div className="mb-1 h-[6px] w-[6px] rounded-full border border-line-strong" />
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-[10px]">
            {week.map((d) => (
              <div
                key={d.key}
                className={`text-center text-[10px] first-letter:uppercase ${
                  d.key === todayKey ? 'font-semibold text-ink' : d.kind === 'future' ? 'text-muted/60' : 'text-muted'
                }`}
                style={{ width: BAR_W + 8 }}
              >
                {d.key === todayKey ? t('今天') : dayLabel(d.key, 'narrow')}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {shown.length === 0 ? (
          <p className="text-xs text-muted">{t('这一周还没有加过块。')}</p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {shown.map(row)}
              {showRest && rest.map(row)}
            </ul>
            {rest.length > 0 && (
              <button
                type="button"
                onClick={() => setShowRest((v) => !v)}
                className="mt-1.5 text-[11px] text-muted transition-colors hover:text-ink"
              >
                {showRest ? t('收起') : t('另外 {n} 个项目', { n: rest.length })}
              </button>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-2">
              {SEGMENTS.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 flex-none rounded-[2px]" style={{ background: s.color }} />
                  {s.label}
                  <span className="tabular-nums text-muted">{totals[s.key]}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {due.length > 0 && (
        <p className="mt-3 border-t border-line pt-2 text-[11px] text-ink-2">
          <span className="text-muted">{t('到期：')}</span>
          {due.map(({ thread, days: n }, i) => (
            <span key={thread.id}>
              {i > 0 && <span className="text-muted"> · </span>}
              <button
                type="button"
                onClick={() => select(thread.id)}
                className="transition-colors hover:text-accent"
              >
                {thread.title.trim() || t('（无标题）')}
              </button>{' '}
              <span style={{ color: n < 0 ? 'var(--urgent)' : n === 0 ? 'var(--status-parked)' : undefined }}>
                {n < 0 ? t('逾期{n}天', { n: -n }) : n === 0 ? t('今天到期') : t('还有 {n} 天', { n })}
              </span>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
