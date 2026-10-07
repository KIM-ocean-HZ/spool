import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompressStore } from './compressStore';
import { useBlocksStore } from './blocksStore';
import { useThreadsStore } from './threadsStore';
import {
  createBlock,
  listBlocksByThread,
  listPendingRefReviews,
  replaceBlock,
  setBlockSupersession,
  setCorrectedQuote,
  type Block,
} from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread, type Thread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { assemble, type CitedBlock } from '@/lib/pack/assemble';
import type { StaleProposal, StaleScan } from '@/lib/ai/compress';

// P7-3 (Ocean 2026-10-07, HANDOFF §9.2 第 41 条) —— 「整条取代」从新块那一格挪到旧块身上。
// 真库 Flux：#20 写进来时就更正着 #3，AI 又提了「#20 取代 #4」「#20 取代 #14」——
// 一块一格，于是两条在「过期检测」上都点不动（`wouldOverwriteRelation` 连「只退旧的」一起拦）。
// ⚠️ 真 SQLite（`node:sqlite` + 真的 schema.sql），只有花钱的那一次扫描是假的。

const { DatabaseSync } = createRequire(import.meta.url)(
  'node:sqlite',
) as typeof import('node:sqlite');
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

const scanResult = vi.hoisted(() => ({ proposals: [] as StaleProposal[] }));
const packBlocks = vi.hoisted(() => ({ text: '', blocks: [] as unknown[] }));
vi.mock('@/lib/ai/compress', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ai/compress')>()),
  loadApiKey: () => Promise.resolve('test-key'),
  staleScan: (): Promise<StaleScan> =>
    Promise.resolve({
      proposals: scanResult.proposals,
      dropped: [],
      outcome: { ok: true, text: '', cuts: null, kind: null, message: null, status: 200,
                 inputTokens: 1, outputTokens: 1, cachedInputTokens: null,
                 reasoningTokens: null, ms: 1, model: 'test' },
    }),
}));
vi.mock('@/lib/pack/forThread', () => ({
  buildThreadPack: () => Promise.resolve(packBlocks),
}));

const proposal = (staleSeq: number, bySeq: number): StaleProposal => ({
  staleSeq, bySeq, why: '整份改写', quoteStale: '旧的', quoteNew: '新的', retyped: false,
});

describe('「整条取代」记在旧块上：一块新的能取代好几块 (P7-3)', () => {
  let sqlite: Sqlite;
  let thread: Thread;
  let b1: Block; // 被更正的那一块（Flux #3）
  let b2: Block; // 要被取代的（Flux #4）
  let b3: Block; // 要被取代的（Flux #14）
  let b4: Block; // 新块（Flux #20）

  /** 两个渲染器都要调用方把被引的块递进来（mcp.rs 那边是 JOIN）。 */
  const packOf = async () => {
    const blocks = await listBlocksByThread(thread.id);
    const refBlocks = new Map<string, CitedBlock>(
      blocks.map((b) => [b.id, { content: b.content, createdAt: b.createdAt, stale: b.staleAt !== null }]),
    );
    return assemble({ thread, blocks, refBlocks, now: 1_760_000_000_000 });
  };
  const row = (id: string) => listBlocksByThread(thread.id).then((rs) => rs.find((b) => b.id === id)!);
  const loadBlocks = async () => {
    const rows = await listBlocksByThread(thread.id);
    useBlocksStore.setState({ byThread: { [thread.id]: rows } });
    packBlocks.blocks = rows;
    return rows;
  };
  /** 用户自己点「查过期」，扫出这几条，然后在卡上点。 */
  const scanAndRetire = async (...pairs: [Block, Block][]) => {
    await loadBlocks();
    scanResult.proposals = pairs.map(([o, n]) => proposal(o.seq!, n.seq!));
    await useCompressStore.getState().runStaleScan(thread.id);
    const shown = useCompressStore.getState().stale[thread.id]!.proposals;
    expect(shown).toHaveLength(pairs.length);
    for (let i = 0; i < shown.length; i++) {
      await useCompressStore.getState().decideStale(thread.id, i, 'retire');
    }
  };

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    useCompressStore.setState({ stale: {}, running: false, runningThreadId: null, runningKind: null });
    const ws = await createWorkspace('W');
    thread = await createThread(ws.id, 'Flux');
    useThreadsStore.setState({ threadsByWorkspace: { [ws.id]: [thread] } });
    b1 = await createBlock({ threadId: thread.id, content: '预算 40k，供应商 A。' });
    b2 = await createBlock({ threadId: thread.id, content: '时间表 v1。' });
    b3 = await createBlock({ threadId: thread.id, content: '人员名单 v1。' });
    b4 = await createBlock({ threadId: thread.id, content: '预算 55k；新的时间表和名单。' });
    // #20 写进来时就更正着 #3。
    await setBlockSupersession(b4.id, b1.id, 'corrects', 1);
    await setCorrectedQuote(b4.id, '预算 40k');
  });
  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('⭐ Flux #20 的形状：已经更正着 A 的新块，还能取代 B、C —— 它的更正一个字不动', async () => {
    await scanAndRetire([b2, b4], [b3, b4]);

    for (const old of [b2, b3]) {
      const r = await row(old.id);
      expect(r.staleAt).not.toBeNull();
      expect(r.replacedByBlockId).toBe(b4.id);
    }
    expect(await row(b4.id)).toMatchObject({
      refBlockId: b1.id,
      refKind: 'corrects',
      correctedQuote: '预算 40k',
      staleAt: null,
      replacedByBlockId: null,
    });
    // 被更正的那一块没被碰。
    expect(await row(b1.id)).toMatchObject({ staleAt: null, replacedByBlockId: null });
  });

  it('一块新的取代三块（直接写库那一层）', async () => {
    for (const old of [b1, b2, b3]) await replaceBlock(old.id, b4.id, 777);
    const rows = await listBlocksByThread(thread.id);
    expect(rows.filter((b) => b.replacedByBlockId === b4.id).map((b) => b.id)).toEqual([b1.id, b2.id, b3.id]);
    expect(rows.filter((b) => b.staleAt === 777)).toHaveLength(3);
  });

  it('已经退役的块再被取代：退役时间不挪（用户自己定的那一刻）', async () => {
    sqlite.prepare('UPDATE blocks SET stale_at = 123 WHERE id = ?').run(b2.id);
    await replaceBlock(b2.id, b4.id, 999);
    expect(await row(b2.id)).toMatchObject({ staleAt: 123, replacedByBlockId: b4.id });
  });

  it('手动「取回来」把那一列一起清掉；再手动退役不会凭空冒出「被谁取代」', async () => {
    await replaceBlock(b2.id, b4.id, 999);
    await loadBlocks();
    await useBlocksStore.getState().setStale(b2.id, false);
    expect(await row(b2.id)).toMatchObject({ staleAt: null, replacedByBlockId: null });
    expect(useBlocksStore.getState().byThread[thread.id]!.find((b) => b.id === b2.id)).toMatchObject({
      staleAt: null,
      replacedByBlockId: null,
    });
    await useBlocksStore.getState().setStale(b2.id, true);
    expect((await row(b2.id)).replacedByBlockId).toBeNull();
  });

  it('pack：被取代的不进、底部照旧计数；新块下面只有它自己的更正（不写「取代了哪一块」）', async () => {
    await replaceBlock(b2.id, b4.id, 999);
    await replaceBlock(b3.id, b4.id, 999);
    const pack = await packOf();
    expect(pack).not.toContain('时间表 v1');
    expect(pack).not.toContain('人员名单 v1');
    expect(pack).toContain('2 blocks the user has marked as no longer valid');
    expect(pack).toContain('↩ corrects one point in: [');
    expect(pack).not.toContain('↩ replaces (that block no longer holds): [');
  });

  it('先更正、后取代同一块：新块那一行照旧写「不再有效」，也不进「等你看一眼」的队列', async () => {
    await replaceBlock(b1.id, b4.id, 999);
    const pack = await packOf();
    expect(pack).toContain('↩ corrects one point in: (cited block is no longer valid)');
    // 退役是这条关系自己造成的 —— 和老记法 `supersedes → retired` 同一条「正常状态」。
    expect(await listPendingRefReviews()).toEqual([]);
    // 别的块引着它的，照样要人看一眼。
    const other = await createBlock({ threadId: thread.id, content: '引一下预算那块' });
    sqlite.prepare('UPDATE blocks SET ref_block_id = ? WHERE id = ?').run(b1.id, other.id);
    expect((await listPendingRefReviews()).map((p) => p.citing.id)).toEqual([other.id]);
  });
});
