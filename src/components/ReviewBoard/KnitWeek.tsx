import { useCallback, useEffect, useState } from 'react';
import { listStitchTimesSince } from '@/lib/db/blocks';
import { dateLocale, useT } from '@/lib/i18n';
import { PATCH_STITCHES, stitchesByDay } from '@/lib/knit/knit';
import { startOfWeek } from '@/lib/weeks';
import { knitItemName, useKnitStore } from '@/stores/knitStore';
import { DayRow, KnitItemArt } from '@/components/Knit/KnitArt';

// 织布在周回顾里的那一节（Ocean 2026-10-17：「可以和周回顾进行联动」「兑换物品的行为也可以被记录在每周的活动里，
// 这个不经过 AI，是 spool 硬编码完成」）。一天一行针，后面是这一周织好了几块布、织成了什么。
// ⚠️ 全是查出来、算出来的：针数查库（lib/db/blocks.ts），织成了什么读 knit.json —— ⛔ 一个字都不经过 AI。

/** 一行画几针；多出来的写成「+N」。 */
const PER_ROW = 20;

export default function KnitWeek() {
  const t = useT();
  const stitches = useKnitStore((s) => s.stitches);
  const redemptions = useKnitStore((s) => s.redemptions);
  const refreshKnit = useKnitStore((s) => s.refresh);
  const [now, setNow] = useState(() => Date.now());
  const [times, setTimes] = useState<number[]>([]);

  // Same rule as ActivityPanel: read again whenever the window comes back to the front.
  const refresh = useCallback(() => {
    const at = Date.now();
    setNow(at);
    // The total (for 织好几块布) and what was knitted: the sidebar keeps these fresh, but the sidebar
    // can be collapsed, and then nothing else would.
    void refreshKnit().catch((e) => console.warn('[knit] refresh failed', e));
    void listStitchTimesSince(startOfWeek(at))
      .then(setTimes)
      .catch((e) => console.warn('[knit] week failed', e));
  }, [refreshKnit]);
  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const weekStart = startOfWeek(now);
  const perDay = stitchesByDay(times, weekStart);
  const thisWeek = times.length;
  const patches = Math.floor(stitches / PATCH_STITCHES) - Math.floor(Math.max(0, stitches - thisWeek) / PATCH_STITCHES);
  const made = redemptions.filter((r) => r.at >= weekStart);
  const todayIndex = Math.floor((now - weekStart) / 86_400_000);
  const dayName = (i: number, style: 'short' | 'long'): string => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    d.setHours(12);
    return d.toLocaleDateString(dateLocale(), { weekday: style });
  };

  return (
    <section aria-label={t('这一周织的布')} className="mb-6 rounded-md border border-line px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium text-ink-2">{t('这一周织的布')}</h2>
        <span className="text-[11px] text-muted">{t('一针 = 一块 · 一行 = 一天')}</span>
      </div>
      <div className="mt-2.5 inline-flex flex-col rounded border border-line bg-paper-2/40 px-3 py-1.5">
        {perDay.map((n, i) => (
          <div key={i} className="flex h-[15px] items-center gap-3">
            <span className={`w-9 text-[11px] ${i === todayIndex ? 'text-accent' : 'text-muted'}`}>{dayName(i, 'short')}</span>
            <DayRow count={Math.min(n, PER_ROW)} perRow={PER_ROW} cell={12} />
            <span className="w-10 text-[11px] tabular-nums text-muted">{n > PER_ROW ? `+${n - PER_ROW}` : ''}</span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-xs text-ink-2">
        {t('这周织了 {n} 针，织好 {m} 块布。', { n: thisWeek, m: patches })}
      </p>
      {made.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-xs text-ink-2">{t('这周织成了：')}</span>
          {made.map((r) => (
            <span key={r.at} className="flex items-center gap-1 text-xs text-ink-2">
              <KnitItemArt id={r.item} made size={26} />
              {t('{item}（{day}）', { item: knitItemName(r.item), day: dayName(Math.floor((r.at - weekStart) / 86_400_000), 'short') })}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
