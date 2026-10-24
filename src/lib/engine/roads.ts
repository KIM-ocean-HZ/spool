import { resolveVendor } from '@/lib/ai/vendors';
import { canShowEngineActions, effectiveAutoRoute } from '@/lib/engine/gate';
import { IS_MAC } from '@/lib/platform';
import { engineSupportsWeb, useEngineStore } from '@/stores/engineStore';
import { useSettingsStore } from '@/stores/settingsStore';

// P9U (Ocean 2026-10-24: 「用户让 CLI 和 API 的功能范围完全一致」) — the two roads every AI feature can
// take, asked the same way everywhere: is the CLI on this machine connected (P9T's 「已连接」: found, and
// the MCP switches on), is an API key switched on. A feature is usable when either is; which one it
// takes, when both are, is that feature's own choice (第 187 条, settingsStore `compressRoute` …).
//
// ⚠️ CLI failing never falls through to the API: the API bills per word, and a run the user did not
// pick must not spend. `effectiveAutoRoute` only falls back when the preferred road is not connected at
// all — and every place that runs says which road it is about to take.

export interface Roads {
  cli: boolean;
  api: boolean;
}

interface RoadInputs {
  cliAvailable: boolean;
  mcpEnabled: boolean;
  mcpWriteEnabled: boolean;
  actionsEnabled: boolean;
  apiEngineEnabled: boolean;
  isMac: boolean;
}

/** Pure, for tests. The CLI road is macOS-only (engine.rs keeps it off on Windows). */
export const roadsOf = (i: RoadInputs): Roads => ({
  cli:
    i.isMac &&
    canShowEngineActions({
      cliAvailable: i.cliAvailable,
      mcpEnabled: i.mcpEnabled,
      mcpWriteEnabled: i.mcpWriteEnabled,
      actionsEnabled: i.actionsEnabled,
    }),
  api: i.actionsEnabled && i.apiEngineEnabled,
});

/** Which road a feature takes: its own pick when both are ready, the ready one otherwise, null if none. */
export const routeFor = (preferred: 'cli' | 'api', roads: Roads): 'cli' | 'api' | null =>
  effectiveAutoRoute(preferred, roads.cli, roads.api);

/** The same answer outside React (stores, timers). */
export const roadsNow = (): Roads => {
  const s = useSettingsStore.getState();
  return roadsOf({
    cliAvailable: useEngineStore.getState().status?.available === true,
    mcpEnabled: s.mcpEnabled,
    mcpWriteEnabled: s.mcpWriteEnabled,
    actionsEnabled: s.aiEngineActionsEnabled,
    apiEngineEnabled: s.apiEngineEnabled,
    isMac: IS_MAC,
  });
};

export const useRoads = (): Roads => {
  const cliAvailable = useEngineStore((s) => s.status?.available === true);
  const mcpEnabled = useSettingsStore((s) => s.mcpEnabled);
  const mcpWriteEnabled = useSettingsStore((s) => s.mcpWriteEnabled);
  const actionsEnabled = useSettingsStore((s) => s.aiEngineActionsEnabled);
  const apiEngineEnabled = useSettingsStore((s) => s.apiEngineEnabled);
  return roadsOf({ cliAvailable, mcpEnabled, mcpWriteEnabled, actionsEnabled, apiEngineEnabled, isMac: IS_MAC });
};

/** P9U-4 — 跟进's own two roads, narrower than the others: the CLI one also needs a CLI that can search
 *  (not Gemini CLI, DESIGN_AI_ENGINE §7.8.5-2), the API one a vendor with its own web search. */
export const followUpRoadsOf = (r: Roads, cliCanSearch: boolean, apiCanSearch: boolean): Roads => ({
  cli: r.cli && cliCanSearch,
  api: r.api && apiCanSearch,
});

export const followUpRoadsNow = (): Roads => {
  const s = useSettingsStore.getState();
  return followUpRoadsOf(
    roadsNow(),
    engineSupportsWeb(useEngineStore.getState().status?.selected ?? null),
    resolveVendor(s.apiVendor, s.apiBaseUrl).search !== null,
  );
};

export const useFollowUpRoads = (): Roads => {
  const roads = useRoads();
  const selected = useEngineStore((s) => s.status?.selected ?? null);
  const apiCanSearch = useSettingsStore((s) => resolveVendor(s.apiVendor, s.apiBaseUrl).search !== null);
  return followUpRoadsOf(roads, engineSupportsWeb(selected), apiCanSearch);
};

/** What the CLI road needs from settings for a run — the same four things an engine run sends. */
export const cliRouteNow = (): { engine: string | null; model: string | null; effort: string | null; manualPath: string | null } => {
  const s = useSettingsStore.getState();
  return {
    engine: s.aiEngine ?? null,
    model: s.aiEngine === 'gemini' ? s.aiModelGemini : s.aiModelClaude,
    effort: s.aiEffortClaude ?? null,
    manualPath: s.aiEnginePath ?? null,
  };
};
