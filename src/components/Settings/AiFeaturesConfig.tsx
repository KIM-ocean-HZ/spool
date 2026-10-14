import Toggle from '@/components/ui/Toggle';
import { useT } from '@/lib/i18n';
import { useSettingsStore } from '@/stores/settingsStore';

// P9C (Ocean HANDOFF §9.2 第 98 条) — 「显示 AI 功能」, at the top of the 「AI 引擎」 page on both
// platforms, whatever was detected. It used to be 「显示 AI 维护动作」 inside the local-engine half,
// drawn only once a CLI was found and governing only that road. Now it governs every place that
// uses an AI: off = no AI entry and no lock anywhere (lib/engine/gate.ts `aiEntryState`), and
// nothing automatic runs either (useAutoMaintain, NightlyRunner) — what cannot be seen must not
// spend. Results stay: written reviews, blocks an AI wrote, the 待审 queue.
//
// The key is still `aiEngineActionsEnabled` — renamed on screen only, no migration.
export default function AiFeaturesConfig() {
  const t = useT();
  const on = useSettingsStore((s) => s.aiEngineActionsEnabled);
  const update = useSettingsStore((s) => s.update);
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="text-sm text-ink">{t('显示 AI 功能')}</div>
        <div className="mt-0.5 text-xs text-muted">
          {t('关掉之后，所有要用 AI 的按钮和锁都藏起来，每周自动回顾和夜里的自动压缩也不跑；已经写好的回顾、AI 写的块照旧在。')}
        </div>
      </div>
      <Toggle checked={on} onChange={(v) => void update({ aiEngineActionsEnabled: v })} />
    </div>
  );
}
