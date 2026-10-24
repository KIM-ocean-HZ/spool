import { Store } from '@tauri-apps/plugin-store';
import type { CompressOutcome, StaleDropped, StaleProposal } from '@/lib/ai/compress';
import { growsWhenRetired } from '@/lib/stale/wsItems';
import {
  useCompressStore,
  type StaleAction,
  type StaleAuto,
  type StaleSession,
  type WsStaleSession,
} from '@/stores/compressStore';
import { listBlocksByIds } from './blocks';
import { getDb } from './client';

// P9V-3（Ocean 10-24 第 202 条）—— 过期检测的结果关掉 Spool 也还在：手动查的、每月自动查的都存。
//
// ⚠️ 和 drafts.json 同一个理由，**存在自己的一个文件里**，⛔ 不进 spool.db、⛔ 不进 settings.json：
// 它不是库里的内容（不随库导出、MCP 读不到），也不是设置；动 schema 是这个库最贵的操作。
// ⚠️ 读坏了就当没有 —— 后果只能是「上次的结果没了，再查一遍」，⛔ 不能让 Spool 打不开。
//
// 三样东西：`projects`（只查这个项目，按项目）、`workspaces`（查整个工作区，按工作区）、
// `auto`（每月自动查的开关和上次时间，按工作区，P9V-4）。每个范围只留最新的一份。
//
// ⚠️ 存的是块 id。只查一个项目那一份在内存里是按块号走的（`StaleSession.blocks`），存的时候
// 记下「块号 → 块 id」，读回来按 id 从库里现取、块号照跑那一刻的写回去 —— 卡片上的 #n 和
// AI 当时说的对得上，点按钮写的是 id。

const FILE = 'stale.json';
const PROJECTS_KEY = 'projects';
const WORKSPACES_KEY = 'workspaces';
const AUTO_KEY = 'auto';
const SAVE_DELAY_MS = 300;

/** 只查这个项目那一份，存盘的样子。 */
export interface SavedProjectStale {
  proposals: StaleProposal[];
  dropped: StaleDropped[];
  already: number;
  outcome: CompressOutcome | null;
  decided: Record<number, StaleAction>;
  startedAt: number;
  /** 块号 → 块 id（跑那一刻的）。 */
  ids: Record<string, string>;
  /** 退掉之后打包反而更长的旧块块号（T6，跑那一刻量的）。 */
  grows: number[];
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** 内存里那一份 → 盘上那一份。没查完（没有 outcome）的不存。 */
export const saveProject = (s: StaleSession): SavedProjectStale | null => {
  if (!s.outcome) return null;
  const ids: Record<string, string> = {};
  for (const b of s.blocks) if (b.seq !== null) ids[String(b.seq)] = b.id;
  const grows = s.source
    ? s.proposals
        .map((p) => s.blocks.find((b) => b.seq === p.staleSeq))
        .filter((b): b is NonNullable<typeof b> => !!b && growsWhenRetired(s.source, b))
        .map((b) => b.seq!)
    : (s.grows ?? []);
  return {
    proposals: s.proposals,
    dropped: s.dropped,
    already: s.already,
    outcome: s.outcome,
    decided: s.decided,
    startedAt: s.startedAt,
    ids,
    grows,
  };
};

/** 盘上读回来的那一份形状对不对。⚠️ 只查拿来用的那几个字段 —— 多出来的不管。 */
export const cleanSavedProjects = (raw: unknown): Record<string, SavedProjectStale> => {
  const out: Record<string, SavedProjectStale> = {};
  if (!isObj(raw)) return out;
  for (const [id, v] of Object.entries(raw)) {
    if (
      isObj(v) &&
      Array.isArray(v.proposals) &&
      Array.isArray(v.dropped) &&
      isObj(v.ids) &&
      Array.isArray(v.grows) &&
      isObj(v.decided) &&
      typeof v.startedAt === 'number' &&
      typeof v.already === 'number'
    ) {
      out[id] = v as unknown as SavedProjectStale;
    }
  }
  return out;
};

export const cleanSavedWorkspaces = (raw: unknown): Record<string, WsStaleSession> => {
  const out: Record<string, WsStaleSession> = {};
  if (!isObj(raw)) return out;
  for (const [id, v] of Object.entries(raw)) {
    if (
      isObj(v) &&
      v.workspaceId === id &&
      Array.isArray(v.projects) &&
      Array.isArray(v.blocks) &&
      Array.isArray(v.projectItems) &&
      Array.isArray(v.dropped) &&
      isObj(v.decided) &&
      typeof v.startedAt === 'number'
    ) {
      out[id] = v as unknown as WsStaleSession;
    }
  }
  return out;
};

export const cleanSavedAuto = (raw: unknown): Record<string, StaleAuto> => {
  const out: Record<string, StaleAuto> = {};
  if (!isObj(raw)) return out;
  for (const [id, v] of Object.entries(raw)) {
    if (isObj(v) && typeof v.on === 'boolean' && typeof v.lastRunAt === 'number' && Number.isFinite(v.lastRunAt)) {
      out[id] = { on: v.on, lastRunAt: v.lastRunAt };
    }
  }
  return out;
};

let storePromise: Promise<Store> | null = null;
const getStore = (): Promise<Store> => {
  if (!storePromise) storePromise = Store.load(FILE);
  return storePromise;
};

let chain: Promise<void> = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | undefined;

const writeNow = (): Promise<void> => {
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
  const { stale, staleWs, staleAuto } = useCompressStore.getState();
  const projects: Record<string, SavedProjectStale> = {};
  for (const [id, s] of Object.entries(stale)) {
    const saved = saveProject(s);
    if (saved) projects[id] = saved;
  }
  chain = chain.then(async () => {
    try {
      const store = await getStore();
      await store.set(PROJECTS_KEY, projects);
      await store.set(WORKSPACES_KEY, staleWs);
      await store.set(AUTO_KEY, staleAuto);
      await store.save();
    } catch (e) {
      console.warn('[stale] save failed', e);
    }
  });
  return chain;
};

const liveIds = async (table: 'threads' | 'workspaces', ids: string[]): Promise<Set<string>> => {
  if (ids.length === 0) return new Set();
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>(
    `SELECT id FROM ${table} WHERE deleted_at IS NULL AND id IN (${ids.map((_, i) => `$${i + 1}`).join(', ')})`,
    ids,
  );
  return new Set(rows.map((r) => r.id));
};

let unsubscribe: (() => void) | null = null;

/** 开机读一次（库开好之后）：读回来、丢掉项目 / 工作区已经不在了的、放进 compressStore，然后开始边改边存。
 *  ⚠️ 读完才开始写 —— 先写的话会拿空的那份把盘上的盖掉。 */
export const loadStaleFile = async (): Promise<void> => {
  let projects: Record<string, SavedProjectStale> = {};
  let workspaces: Record<string, WsStaleSession> = {};
  let auto: Record<string, StaleAuto> = {};
  try {
    const store = await getStore();
    projects = cleanSavedProjects(await store.get(PROJECTS_KEY));
    workspaces = cleanSavedWorkspaces(await store.get(WORKSPACES_KEY));
    auto = cleanSavedAuto(await store.get(AUTO_KEY));
    const liveThreads = await liveIds('threads', Object.keys(projects));
    const liveWs = await liveIds('workspaces', [...new Set([...Object.keys(workspaces), ...Object.keys(auto)])]);
    projects = Object.fromEntries(Object.entries(projects).filter(([id]) => liveThreads.has(id)));
    workspaces = Object.fromEntries(Object.entries(workspaces).filter(([id]) => liveWs.has(id)));
    auto = Object.fromEntries(Object.entries(auto).filter(([id]) => liveWs.has(id)));
  } catch (e) {
    console.warn('[stale] load failed', e);
  }
  // 只查这个项目那一份：块按 id 从库里现取，块号照跑那一刻的写回去。
  const restored: Record<string, StaleSession> = {};
  for (const [threadId, p] of Object.entries(projects)) {
    try {
      const seqOf = new Map(Object.entries(p.ids).map(([seq, id]) => [id, Number(seq)]));
      const rows = await listBlocksByIds([...seqOf.keys()]);
      restored[threadId] = {
        source: '',
        blocks: rows.map((b) => ({ ...b, seq: seqOf.get(b.id) ?? b.seq })),
        proposals: p.proposals,
        dropped: p.dropped,
        already: p.already,
        outcome: p.outcome,
        decided: p.decided,
        startedAt: p.startedAt,
        grows: p.grows,
      };
    } catch (e) {
      console.warn('[stale] restore failed', threadId, e);
    }
  }
  // 读盘这一小会儿里如果已经查出了新的，那一份更新，留它的。
  useCompressStore.setState((s) => ({
    stale: { ...restored, ...s.stale },
    staleWs: { ...workspaces, ...s.staleWs },
    staleAuto: { ...auto, ...s.staleAuto },
  }));
  unsubscribe?.();
  unsubscribe = useCompressStore.subscribe((s, prev) => {
    if (s.stale === prev.stale && s.staleWs === prev.staleWs && s.staleAuto === prev.staleAuto) return;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => void writeNow(), SAVE_DELAY_MS);
  });
};

/** 「清除所有数据」：结果和开关一起清掉（它们指着的项目都没了）。 */
export const clearStaleFile = async (): Promise<void> => {
  useCompressStore.setState({ stale: {}, staleWs: {}, staleAuto: {} });
  await writeNow();
};

/** 测试用：马上写，不等那 300 毫秒。 */
export const __flushStaleFileForTest = (): Promise<void> => writeNow();
