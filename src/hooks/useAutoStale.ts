import { useEffect } from 'react';
import { dueStaleAuto, wsStaleAvailable, wsStalePlan } from '@/lib/stale/workspace';
import { roadsNow, routeFor } from '@/lib/engine/roads';
import { useCompressStore } from '@/stores/compressStore';
import { useEngineStore } from '@/stores/engineStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useThreadsStore } from '@/stores/threadsStore';
import { useWorkspacesStore } from '@/stores/workspacesStore';

// P9V-4（Ocean 10-24 第 197 – 198 条：「我希望CLI和API也可以做定期过期检测，这个时间尺度可以拉长一点」⇒ 每月一次）。
//
// 和自动跟进（useAutoFollowUp）同一个节奏：Spool 开着时每 10 分钟看一次，很少真的动手；开 app 那一刻不看
// （打开 app 不是花他额度的理由）。动手的就是他自己点「查一遍」那一下（查整个工作区），结果落在
// 过期检测页签那一页、标着「每月自动查的」—— ⛔ 不进待审、不弹通知（第 197 条）。
//
// ⛔ 只在这些都成立时：「显示 AI 功能」开着；过期检测自己那条路（本机 CLI / API）连着；压缩、过期检测、
// 引擎都没在跑也没排着队（他自己点的先来）；工作区里能查的项目至少两个。一次只查一个工作区。
// ⚠️ 这一件不给引擎任何 MCP 工具：它只是 Spool 自己发一次不带工具的请求（`stale_scan_ws_via_*`）。
const TICK_MS = 10 * 60_000;

export function useAutoStale(): void {
  useEffect(() => {
    let stopped = false;
    const tick = (): void => {
      if (stopped) return;
      const st = useSettingsStore.getState();
      if (!st.aiEngineActionsEnabled) return;
      if (routeFor(st.staleRoute, roadsNow()) === null) return;
      const compress = useCompressStore.getState();
      if (compress.running || compress.batchRunning) return;
      const engine = useEngineStore.getState();
      if (engine.current || engine.queue.length > 0) return;
      const workspaces = useWorkspacesStore.getState().workspaces;
      const threadsByWorkspace = useThreadsStore.getState().threadsByWorkspace;
      const next = dueStaleAuto(
        compress.staleAuto,
        (id) => wsStaleAvailable(wsStalePlan(id, workspaces, threadsByWorkspace)),
        Date.now(),
      );
      if (next) void compress.runStaleScanWorkspace(next, { auto: true });
    };
    const id = window.setInterval(tick, TICK_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, []);
}
