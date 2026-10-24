import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompressStore } from './compressStore';
import { useSettingsStore } from './settingsStore';
import { useThreadsStore } from './threadsStore';
import { useWorkspacesStore } from './workspacesStore';
import { createBlock, listBlocksByIds, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread, type Thread } from '@/lib/db/threads';
import { createWorkspace, type Workspace } from '@/lib/db/workspaces';
import type { WsPack, WsStaleScan } from '@/lib/ai/compress';
import { buildThreadPack } from '@/lib/pack/forThread';

// P9V-2 —— 过期检测查整个工作区。⚠️ 走**真库**（`node:sqlite` + 真的 `schema.sql`）和真的组 pack；
// 只有那一次真花钱的调用是假的（和 compressStore.stale.test.ts 同一个做法）。

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
type Sqlite = InstanceType<typeof DatabaseSync>;
type SqlValue = string | number | bigint | null | Uint8Array;
const toNumbered = (sql: string): string => sql.replace(/\$(\d+)/g, '?$1');
const makeAdapter = (handle: Sqlite): Database =>
  ({
    execute: async (sql: string, params: unknown[] = []) => {
      const r = handle.prepare(toNumbered(sql)).run(...(params as SqlValue[]));
      return { rowsAffected: Number(r.changes), lastInsertId: Number(r.lastInsertRowid) };
    },
    select: async (sql: string, params: unknown[] = []) =>
      handle.prepare(toNumbered(sql)).all(...(params as SqlValue[])),
  }) as unknown as Database;

const sent = vi.hoisted(() => ({ packs: null as WsPack[] | null, answer: null as null | ((p: WsPack[]) => Partial<WsStaleScan>) }));
vi.mock('@/lib/ai/compress', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ai/compress')>()),
  loadApiKey: () => Promise.resolve('test-key'),
  staleScanWs: (req: { packs: WsPack[] }): Promise<WsStaleScan> => {
    sent.packs = req.packs;
    return Promise.resolve({
      outcome: { ok: true, text: '', cuts: null, kind: null, message: null, status: 200, inputTokens: 1,
                 outputTokens: 1, cachedInputTokens: null, reasoningTokens: null, ms: 1, model: 'test' },
      blocks: [],
      projects: [],
      dropped: [],
      ...(sent.answer?.(req.packs) ?? {}),
    } as WsStaleScan);
  },
}));

describe('P9V-2 · 过期检测查整个工作区', () => {
  let sqlite: Sqlite;
  let ws: Workspace;
  let sub: Workspace;
  let midi: Thread;
  let flux: Thread;
  let oldB: Block;
  let newB: Block;

  const put = (threads: Thread[], workspaces: Workspace[]) => {
    const byWs: Record<string, Thread[]> = {};
    for (const w of workspaces) byWs[w.id] = threads.filter((t) => t.workspaceId === w.id);
    useThreadsStore.setState({ threadsByWorkspace: byWs });
    useWorkspacesStore.setState({ workspaces });
  };

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    useCompressStore.setState({ staleWs: {}, staleWsErrors: {}, staleWsBlocks: {}, staleAuto: {}, running: false,
                                runningThreadId: null, runningKind: null, runningKey: null });
    useSettingsStore.setState({ aiEngineActionsEnabled: true, apiEngineEnabled: true, staleRoute: 'api' });
    sent.packs = null;
    sent.answer = null;
    ws = await createWorkspace('Flux');
    sub = { ...(await createWorkspace('子')), parentId: ws.id };
    sqlite.prepare('UPDATE workspaces SET parent_id = ? WHERE id = ?').run(ws.id, sub.id);
    midi = await createThread(ws.id, 'midi-GPT');
    flux = await createThread(sub.id, 'Flux');
    oldB = await createBlock({ threadId: midi.id, content: '方案定了：用 REMI 编码，训练集 2 万首。' });
    newB = await createBlock({ threadId: flux.id, content: '改方案：放弃 REMI，midi-GPT 并进 Flux。' });
  });
  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  const crossPair = (): Partial<WsStaleScan> => ({
    blocks: [{ stale: { project: 0, seq: oldB.seq! }, by: { project: 1, seq: newB.seq! }, why: '编码换了',
               quoteStale: '用 REMI 编码', quoteNew: '放弃 REMI', retyped: false }],
  });

  it('⭐ 连子工作区一起发；已完成、私密的不发；回来的跨项目一对能「整条取代」', async () => {
    const done = { ...(await createThread(ws.id, '早完了')), status: 'done' as const };
    await createBlock({ threadId: done.id, content: '这个不该被发出去。' });
    const secret = { ...(await createThread(ws.id, '私密')), isPrivate: true };
    await createBlock({ threadId: secret.id, content: '这个也不该。' });
    put([midi, flux, done, secret], [ws, sub]);
    sent.answer = crossPair;

    await useCompressStore.getState().runStaleScanWorkspace(ws.id);

    expect(sent.packs!.map((p) => p.title)).toEqual(['midi-GPT', 'Flux']);
    expect(sent.packs!.join('')).not.toContain('不该');
    // ⛔ 每份开头那段「怎么读」不带（对照：同一个项目照设置组的那一份是带的）。
    expect((await buildThreadPack(midi)).text).toContain('How to Read');
    expect(sent.packs![0]!.text).not.toContain('How to Read');
    const sess = useCompressStore.getState().staleWs[ws.id]!;
    expect(sess.skippedPrivate).toBe(1);
    expect(sess.blocks).toHaveLength(1);
    expect(sess.blocks[0]!.stale).toMatchObject({ threadId: midi.id, blockId: oldB.id });

    await useCompressStore.getState().decideStaleWs(ws.id, 'b0', 'retire');
    const [o] = await listBlocksByIds([oldB.id]);
    expect(o!.replacedByBlockId).toBe(newB.id);
    expect(o!.staleAt).not.toBeNull();
    expect(useCompressStore.getState().staleWs[ws.id]!.decided).toEqual({ b0: 'retire' });
  });

  it('跨项目的「更正一处」：新块指着别的项目里的旧块，旧块不退', async () => {
    put([midi, flux], [ws, sub]);
    sent.answer = crossPair;
    await useCompressStore.getState().runStaleScanWorkspace(ws.id);
    await useCompressStore.getState().decideStaleWs(ws.id, 'b0', 'merge');
    const [o, n] = await listBlocksByIds([oldB.id, newB.id]).then((r) => [oldB.id, newB.id].map((id) => r.find((b) => b.id === id)));
    expect(n).toMatchObject({ refBlockId: oldB.id, refKind: 'corrects', correctedQuote: '用 REMI 编码' });
    expect(o!.staleAt).toBeNull();
  });

  it('⛔ 第 201 条：超上限就不发，结果上记着多大、上限多少', async () => {
    await createBlock({ threadId: flux.id, content: '字'.repeat(130_000) });
    put([midi, flux], [ws, sub]);
    await useCompressStore.getState().runStaleScanWorkspace(ws.id);
    expect(sent.packs).toBeNull();
    const sess = useCompressStore.getState().staleWs[ws.id]!;
    expect(sess.outcome).toBeNull();
    expect(sess.tooBig!.cap).toBe(120_000);
    expect(sess.tooBig!.chars).toBeGreaterThan(130_000);
  });

  it('项目级「不动」只划掉这一条，不碰项目', async () => {
    put([midi, flux], [ws, sub]);
    sent.answer = () => ({
      projects: [{ project: 0, by: { project: 1, seq: newB.seq! }, why: '并进了', quoteOld: '用 REMI 编码', quoteNew: '并进 Flux', retyped: false }],
    });
    await useCompressStore.getState().runStaleScanWorkspace(ws.id);
    expect(useCompressStore.getState().staleWs[ws.id]!.projectItems[0]!.threadId).toBe(midi.id);
    await useCompressStore.getState().decideStaleWs(ws.id, 'p0', 'keep');
    expect(useCompressStore.getState().staleWs[ws.id]!.decided).toEqual({ p0: 'keep' });
    expect(sqlite.prepare('SELECT status FROM threads WHERE id = ?').get(midi.id)).toEqual({ status: 'active' });
  });

  it('P9V-4：开着每月自动查的工作区，查一次就记上时间 —— 超上限没发也记（不会每 10 分钟重试）', async () => {
    await createBlock({ threadId: flux.id, content: '字'.repeat(130_000) });
    put([midi, flux], [ws, sub]);
    useCompressStore.getState().setStaleAuto(ws.id, true);
    expect(useCompressStore.getState().staleAuto[ws.id]).toEqual({ on: true, lastRunAt: 0 });

    await useCompressStore.getState().runStaleScanWorkspace(ws.id, { auto: true });

    const a = useCompressStore.getState().staleAuto[ws.id]!;
    expect(a.lastRunAt).toBeGreaterThan(0);
    expect(useCompressStore.getState().staleWs[ws.id]!.auto).toBe(true);
    expect(useCompressStore.getState().staleWs[ws.id]!.tooBig).not.toBeNull();
    // 关掉再打开不忘上次时间。
    useCompressStore.getState().setStaleAuto(ws.id, false);
    useCompressStore.getState().setStaleAuto(ws.id, true);
    expect(useCompressStore.getState().staleAuto[ws.id]!.lastRunAt).toBe(a.lastRunAt);
  });

  it('没开每月自动查的工作区，手动查一次不平白多出一个开关', async () => {
    put([midi, flux], [ws, sub]);
    await useCompressStore.getState().runStaleScanWorkspace(ws.id);
    expect(useCompressStore.getState().staleAuto[ws.id]).toBeUndefined();
  });

  it('两条路都没连上就不跑', async () => {
    put([midi, flux], [ws, sub]);
    useSettingsStore.setState({ apiEngineEnabled: false });
    await useCompressStore.getState().runStaleScanWorkspace(ws.id);
    expect(sent.packs).toBeNull();
    expect(useCompressStore.getState().staleWs[ws.id]).toBeUndefined();
  });
});
