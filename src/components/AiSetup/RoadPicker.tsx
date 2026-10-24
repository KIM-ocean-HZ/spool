import { routeFor, useRoads, type Roads } from '@/lib/engine/roads';
import { useT } from '@/lib/i18n';
import { useSettingsStore } from '@/stores/settingsStore';

/** P9U-2 (Ocean 2026-10-24 第 187 条：两条都连上时「每个功能各自选」) — 「用 [本机 CLI | API]」 beside a
 *  feature's button, the same look as Weekly Review's. A switch only when both roads are connected;
 *  with one, it just says which one this feature is about to use; with none it says nothing (the
 *  feature is locked then, and the lock says why). */
export type RoadKey = 'compressRoute' | 'staleRoute' | 'followUpRoute';

export default function RoadPicker({
  setting,
  disabled = false,
  roads: only,
}: {
  setting: RoadKey;
  disabled?: boolean;
  /** A feature with narrower roads than the rest (跟进: `useFollowUpRoads`). */
  roads?: Roads;
}) {
  const t = useT();
  const all = useRoads();
  const roads = only ?? all;
  const preferred = useSettingsStore((s) => s[setting]);
  const update = useSettingsStore((s) => s.update);
  const road = routeFor(preferred, roads);
  if (road === null) return null;
  const label = (k: 'cli' | 'api') => (k === 'cli' ? t('本机 CLI') : 'API');
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-xs text-muted">{t('用')}</span>
      {roads.cli && roads.api ? (
        <span className="inline-flex overflow-hidden rounded border border-line">
          {(['cli', 'api'] as const).map((k) => (
            <button
              key={k}
              type="button"
              disabled={disabled}
              onClick={() => void update({ [setting]: k })}
              className={`px-2 py-0.5 text-xs transition-colors disabled:opacity-50 ${
                road === k ? 'bg-accent/10 text-accent' : 'bg-paper text-muted hover:text-ink'
              }`}
            >
              {label(k)}
            </button>
          ))}
        </span>
      ) : (
        <span className="text-xs text-ink-2">{label(road)}</span>
      )}
    </span>
  );
}
