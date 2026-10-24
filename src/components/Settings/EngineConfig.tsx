import { useEffect } from 'react';
import LocalEngine from '@/components/AiSetup/LocalEngine';
import { useT } from '@/lib/i18n';
import { engineSupportsWeb, useEngineStore } from '@/stores/engineStore';
import RoadCard from './RoadCard';
import { useSettingsStore } from '@/stores/settingsStore';

// DESIGN_WORKBENCH §3.5 / §9.2 R5 — 「设置里 ai 引擎单独一项，不和 mcp 挤」: this is the 请进来 half (a CLI
// on this machine doing work for you); 接出去 (handing the library to an AI you use elsewhere) is the
// MCP tab.
//
// ⛔ P9T (Ocean 2026-10-24): 「设置里面的 AI 引擎的注释根本起不了作用，解释这么多也比不过一个好用的自动
// 连接，重做」. This page used to carry a resting explanation, a 「详细说明」 fold of seven paragraphs, a
// path box with instructions for `which`, and — when the CLI was found but MCP was off — one sentence
// sending the user to another tab, with no button. All of it is gone. What is left is the state and the
// one thing to press (components/AiSetup/LocalEngine, the same block the locked AI buttons open), and
// the per-run ceiling once there is something to run. Which engine and which model a run uses still
// live beside the runs (the follow-up editor's EngineBar), not here.
export default function EngineConfig() {
  const t = useT();
  const timeoutSecs = useSettingsStore((s) => s.aiEngineTimeoutSecs);
  const update = useSettingsStore((s) => s.update);
  const status = useEngineStore((s) => s.status);
  const probe = useEngineStore((s) => s.probe);

  // §2.1: look again each time the page opens — the user may have just installed one.
  useEffect(() => {
    void probe();
  }, [probe]);

  return (
    // P9U-5: one of the two equal cards (RoadCard). P9H-5（第 150 条）：「不存 key」说的是这条路，不是整个 Spool。
    <RoadCard
      title={t('本机 CLI')}
      note={t('用你电脑上已经登录的 Claude Code 或 Codex。走这条路 Spool 不存 key。')}
      followUp={status?.available && !engineSupportsWeb(status.selected) ? t('Gemini CLI 不能联网搜') : null}
    >
      <LocalEngine />

      {status?.available && (
        // P9U-5: the same row as the API card's 「单次最长等待」 — two equal cards, so the same weight inside.
        <label
          className="mt-2.5 flex items-center justify-between gap-3"
          title={t('超过就停下（已经写进去的块会留着——Spool 只追加，不回滚）。上限 10 分钟。')}
        >
          <span className="text-[11px] text-muted">{t('单次最长运行时间')}</span>
          <select
            value={timeoutSecs}
            onChange={(e) => void update({ aiEngineTimeoutSecs: Number(e.target.value) })}
            className="flex-none rounded border border-line bg-paper px-2 py-0.5 text-[11px] text-ink outline-none focus:border-accent"
          >
            {[60, 180, 300, 600].map((s) => (
              <option key={s} value={s}>
                {s / 60} {t('分钟')}
              </option>
            ))}
          </select>
        </label>
      )}
    </RoadCard>
  );
}
