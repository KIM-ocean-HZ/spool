import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompressStore } from './compressStore';
import { useBlocksStore } from './blocksStore';
import { useThreadsStore } from './threadsStore';
import { createBlock, listBlocksByThread, setBlockSupersession, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import type { StaleProposal, StaleScan } from '@/lib/ai/compress';

// 「过期检测」那张卡 —— ⛔ P7-5（Ocean 2026-10-07「过期检测只适用于用户自主检测」）起
// **只放用户自己点「查过期」扫出来的**。AI 提的「整条取代 / 更正」在待审里
// （`supersedeReview.test.ts`）；08-24 S2「并进同一张卡」和 08-29 那两次静默隐藏的修法
// （`supersedeProposalSettled`）都跟着搬到那边了。
//
// ⚠️ 走**真库**（`node:sqlite` + 真的 `schema.sql`）；只有 sidecar 那一次真花钱的调用是 mock 的。

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

// ⚠️ 只有真会花钱的那一步是假的：sidecar 调用和取 key。⛔ 别把过滤那一段也 mock 掉。
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
  staleSeq, bySeq, why: '整份改写', quoteStale: '旧的那一句', quoteNew: '新的那一句',
  retyped: false,
});

describe('过期检测只放用户自己跑的 (P7-5)', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let older: Block;
  let newer: Block;

  const seed = async () => {
    const ws = await createWorkspace('W');
    const th = await createThread(ws.id, '申请规划');
    threadId = th.id;
    older = await createBlock({ threadId, content: '08-20 那份 14 所。' });
    newer = await createBlock({ threadId, content: '08-21 那份 15 所。' });
    useThreadsStore.setState({ threadsByWorkspace: { [ws.id]: [th] } });
  };

  /** MCP 服务端写的那一行 —— ⚠️ 照它的写法直接进表，产品这一侧没有创建函数。 */
  const proposeSupersede = (staleId: string, byId: string, id = 'row-1') =>
    sqlite
      .prepare(
        `INSERT INTO supersede_proposals (id, thread_id, stale_block_id, by_block_id, client,
           why, quote_stale, quote_new, retyped, created_at, expires_at)
         VALUES (?,?,?,?,?,?,?,?,0,?,?)`,
      )
      .run(id, threadId, staleId, byId, 'Claude Code · MCP', '整份改写',
           '旧的那一句', '新的那一句', 1, 9e15);

  const loadBlocks = async () => {
    const rows = await listBlocksByThread(threadId);
    useBlocksStore.setState({ byThread: { [threadId]: rows } });
    return rows;
  };
  const shown = () =>
    (useCompressStore.getState().stale[threadId]?.proposals ?? []).map((p) => [
      p.staleSeq,
      p.bySeq,
    ]);

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    useCompressStore.setState({ stale: {}, running: false, runningThreadId: null,
                                runningKind: null });
    scanResult.proposals = [];
    await seed();
  });
  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  // ⭐⭐ Ocean 10-07 的那一句本身：AI 提了东西，过期检测**不再冒出来**。
  it('⛔ AI 提了「整条取代」—— 花钱查一遍之后单子上也只有扫出来的', async () => {
    proposeSupersede(older.id, newer.id);
    packBlocks.text = 'pack';
    packBlocks.blocks = await loadBlocks();

    await useCompressStore.getState().runStaleScan(threadId);
    expect(shown()).toEqual([]);

    scanResult.proposals = [proposal(older.seq!, newer.seq!)];
    await useCompressStore.getState().runStaleScan(threadId);
    expect(shown()).toEqual([[older.seq, newer.seq]]);
    // 卡上点完，AI 那一行照样在待审里等（两条路各管各的）。
    await useCompressStore.getState().decideStale(threadId, 0, 'keep');
    expect(sqlite.prepare('SELECT COUNT(*) AS c FROM supersede_proposals').get()).toEqual({ c: 1 });
  });

  // ⭐ 扫描结果自己那条防重复规则**一个字没改**：库里已经有关系的，扫出来照样摘走。
  it('⭐ 扫描提的同一对块，库里已经有关系 —— 照样被摘走，并且说出来', async () => {
    await setBlockSupersession(newer.id, older.id, 'corrects', 1);
    packBlocks.text = 'pack';
    packBlocks.blocks = await loadBlocks();
    scanResult.proposals = [proposal(older.seq!, newer.seq!)];

    await useCompressStore.getState().runStaleScan(threadId);

    expect(shown()).toEqual([]);
    expect(useCompressStore.getState().stale[threadId]!.already).toBe(1);
  });
});
