import { Store } from '@tauri-apps/plugin-store';

// P9S-4 (Ocean 2026-10-23, HANDOFF §9.2 第 176 条) — which projects have something an AI wrote that
// the user has not looked at yet. 「每个项目 mcp 写回出现更新的时候，都需要在左侧栏的小圆点上体现……
// 等用户浏览到新增 block 再回到原来的样子。用户自己的捕捉不需要亮灯。」
//
// What is kept is one moment per project: how far the user has seen. A project is lit while its newest
// MCP-written block is later than that. ⚠️ In its own file next to focus.json, ⛔ not in the library: it
// is about this screen, not about the work, and keeping it out of spool.db means no schema change and
// no AI client having to restart.
//
// ⛔ `baseline` is the moment this version first ran. Everything before it counts as seen — otherwise
// the first launch after the upgrade would light every project an AI ever wrote into. If the file is
// lost, it starts over from 「now」: the safe side is nothing lit, not everything lit.

const FILE = 'ai-seen.json';
const KEY = 'state';

export interface AiSeen {
  baseline: number;
  /** project id → the newest MCP block time the user has had on screen. */
  seen: Record<string, number>;
}

let storePromise: Promise<Store> | null = null;
const getStore = (): Promise<Store> => {
  if (!storePromise) storePromise = Store.load(FILE);
  return storePromise;
};

const isAiSeen = (v: unknown): v is AiSeen => {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.baseline === 'number' &&
    typeof o.seen === 'object' &&
    o.seen !== null &&
    Object.values(o.seen).every((x) => typeof x === 'number')
  );
};

interface Persist {
  read: () => Promise<unknown>;
  write: (state: AiSeen) => Promise<void>;
}
let persist: Persist = {
  read: async () => (await getStore()).get<unknown>(KEY),
  write: async (state) => {
    const store = await getStore();
    await store.set(KEY, state);
    await store.save();
  },
};

/** Read it, or start it at `now` (first run / unreadable file) and write that down. */
export const loadAiSeen = async (now: number): Promise<AiSeen> => {
  const v = await persist.read();
  if (isAiSeen(v)) return v;
  const fresh: AiSeen = { baseline: now, seen: {} };
  await persist.write(fresh);
  return fresh;
};

export const saveAiSeen = (state: AiSeen): Promise<void> => persist.write(state);

/** Test-only seam: node has no Tauri store. */
export const __setAiSeenPersistForTest = (p: Persist | null): void => {
  if (p) persist = p;
};

/** The projects lit right now: an MCP block newer than both the baseline and what was seen. */
export const unreadThreads = (latest: Record<string, number>, state: AiSeen): Set<string> =>
  new Set(
    Object.entries(latest)
      .filter(([id, at]) => at > Math.max(state.baseline, state.seen[id] ?? 0))
      .map(([id]) => id),
  );
