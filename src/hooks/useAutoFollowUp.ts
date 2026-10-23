import { useEffect } from 'react';
import { listAutoFollowUpCandidates } from '@/lib/db/threads';
import { dueAutoFollowUp } from '@/lib/engine/followUp';
import { canShowEngineActions } from '@/lib/engine/gate';
import { IS_MAC } from '@/lib/platform';
import { engineSupportsWeb, useEngineStore } from '@/stores/engineStore';
import { useSettingsStore } from '@/stores/settingsStore';

// P9S-6 (Ocean 2026-10-23: 「跟进的联网搜索可以自动搜索，只有跟进出现有效信息时才能放进待审」; 第 173 / 175
// 条: once a week, off unless switched on, per project, in the follow-up editor).
//
// Same rhythm as the weekly review's timer (useAutoMaintain): look every ten minutes, act rarely. What it
// starts is the ordinary follow-up run — the same prompt, the same dedup gate, results only as proposals
// on the review screen — marked `quiet`, so a week with nothing new says nothing at all.
//
// ⛔ Only where 「联网搜索」 itself could be pressed: a Mac with Claude Code / Codex installed, MCP and
// 「允许 AI 写入」 on, 「显示 AI 功能」 on. One project per tick, and never while anything else is running
// or waiting — the queue holds one child process and the user's own click goes first.
const TICK_MS = 10 * 60_000;

export function useAutoFollowUp(): void {
  useEffect(() => {
    let stopped = false;
    const tick = async (): Promise<void> => {
      if (stopped || !IS_MAC) return;
      const st = useSettingsStore.getState();
      const engine = useEngineStore.getState();
      if (!st.aiEngineActionsEnabled) return;
      const ready = canShowEngineActions({
        cliAvailable: engine.status?.available === true,
        mcpEnabled: st.mcpEnabled,
        mcpWriteEnabled: st.mcpWriteEnabled,
        actionsEnabled: st.aiEngineActionsEnabled,
      });
      if (!ready || !engineSupportsWeb(engine.status?.selected ?? null)) return;
      if (engine.current || engine.queue.length > 0) return;
      try {
        const next = dueAutoFollowUp(await listAutoFollowUpCandidates(), Date.now());
        if (!next) return;
        engine.enqueue(next.id, next.title, 'follow_up', st.aiEngineTimeoutSecs, undefined, true);
      } catch (e) {
        console.warn('[auto-follow-up] check failed', e);
      }
    };
    // Not on mount: opening the app is not a reason to spend the user's quota.
    const id = window.setInterval(() => void tick(), TICK_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, []);
}
