import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompressStore } from './compressStore';
import { useBlocksStore } from './blocksStore';
import { useThreadsStore } from './threadsStore';
import { createBlock, listBlocksByThread, moveBlock, setBlockStale, setBlockSupersession,
         setCorrectedQuote, type Block } from '@/lib/db/blocks';
import { listSupersedeProposals } from '@/lib/db/supersedeProposals';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import type { StaleProposal, StaleScan } from '@/lib/ai/compress';

// ⛔⛔ 2026-08-29 —— 「AI 提的整条取代」这条路上出过**两次静默隐藏**，都在过滤条件上。
//
// ① 真库里两条 MCP 提案（「申请规划」的 `#21 ← #23`、`#23 ← #26`）一条都没出现在
//    「过期检测」页签上。⛔ **不是**页签没刷新：`loadProposedStale` 用了扫描那把尺子
//    （`relationAlreadySettled` —— 它问「这两块有没有关系」），而两对块都已经带着
//    `corrects`。⭐ 而 `corrects`（旧块留着、只更正一句）和提案要的「整条退掉」
//    **不是同一个决定**。
// ② 第一版修复只看新块的 `ref_kind='supersedes'` —— 那会**再造一次同类静默隐藏**：
//    「做完」需要两个字段（新块 `supersedes` + 旧块 `stale_at`），而它们由
//    `setBlockSupersession` 的两条独立 SQL 写入，中间没有事务；退役按钮又是个纯开关。
//    半成品状态下旧块**照样进 pack**，这时候藏掉提案，用户既看不见也没得重试。
//
// ⚠️ 所以这一整份走**真库**（`node:sqlite` + 真的 `schema.sql`）：过滤条件、两条 SQL、
// 提案行的增删都是真的。⛔ 用 mock 断言"某个函数被调用过"证明不了这两个 bug 不再发生。
// 只有 sidecar 那一次真花钱的调用是 mock 的。

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

describe('AI 提的「整条取代」—— 什么时候该出现在「过期检测」上', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let older: Block;
  let newer: Block;

  /** 真库那条三代链的形状：#21 ← #23 ← #26，⚠️ 三代全 live。 */
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

  /** 把库里真实的块读回 store —— `loadProposedStale` 的 `bySeq` 就是从这儿来的。 */
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

  // ⭐⭐ ① 就是 Ocean「界面上找不到」的那两条。
  it('⛔ 同一对块已经有 corrects —— 提案仍要出现，由他自己选', async () => {
    await setBlockSupersession(newer.id, older.id, 'corrects', 1);
    proposeSupersede(older.id, newer.id);
    await loadBlocks();

    await useCompressStore.getState().loadProposedStale(threadId);

    expect(shown()).toEqual([[older.seq, newer.seq]]);
    expect(useCompressStore.getState().stale[threadId]!.proposals[0]!.origin).toBe('mcp');
  });

  it('已经整条取代完了（新块 supersedes + 旧块已退役）—— 不再问一遍', async () => {
    await setBlockSupersession(newer.id, older.id, 'supersedes', 1);
    proposeSupersede(older.id, newer.id);
    const rows = await loadBlocks();
    // ⚠️ 先确认库里确实是"做完了"的样子，否则下面那句断言什么都没证明。
    expect(rows.find((b) => b.id === older.id)!.staleAt).toBe(1);

    await useCompressStore.getState().loadProposedStale(threadId);

    expect(shown()).toEqual([]);
  });

  // ⭐⭐ ② Ocean 复核指出的边界：两条 SQL 只成了第一条。
  it('⛔ supersedes 但旧块仍 live —— 只做了一半，提案必须留着当重试入口', async () => {
    await setBlockSupersession(newer.id, older.id, 'supersedes', 1);
    await setBlockStale(older.id, null); // 第二条 SQL 失败、或者用户自己把旧块取回来了
    proposeSupersede(older.id, newer.id);
    await loadBlocks();

    await useCompressStore.getState().loadProposedStale(threadId);

    expect(shown()).toEqual([[older.seq, newer.seq]]);
  });

  // ⚠️ 半成品要能**点得完** —— 只显示不给出路等于换一种方式卡住。
  it('⛔ 半成品上再点一次「整条取代」，旧块这次真的退役', async () => {
    await setBlockSupersession(newer.id, older.id, 'supersedes', 1);
    await setBlockStale(older.id, null);
    proposeSupersede(older.id, newer.id);
    await loadBlocks();
    await useCompressStore.getState().loadProposedStale(threadId);

    await useCompressStore.getState().decideStale(threadId, 0, 'retire');

    const rows = await listBlocksByThread(threadId);
    expect(rows.find((b) => b.id === older.id)!.staleAt).not.toBeNull();
  });

  it('⭐ 真库那条三代链：两条 corrects，两条提案都要出现', async () => {
    const third = await createBlock({ threadId, content: '08-24 那份 16 项。' });
    await setBlockSupersession(newer.id, older.id, 'corrects', 1);
    await setBlockSupersession(third.id, newer.id, 'corrects', 1);
    proposeSupersede(older.id, newer.id, 'row-1');
    proposeSupersede(newer.id, third.id, 'row-2');
    await loadBlocks();

    await useCompressStore.getState().loadProposedStale(threadId);

    expect(shown()).toEqual([
      [older.seq, newer.seq],
      [newer.seq, third.seq],
    ]);
  });

  // ⛔⛔ 花钱扫一遍**不能**把它们冲掉 —— `runStaleScan` 里读 MCP 提案那一处走的是同一把
  // 尺子，漏改的话页签上刚出现的两条会在下一次「查一遍」之后消失。
  describe('花钱查一遍之后', () => {
    it('⛔ 已有 corrects 的 MCP 提案还在单子上', async () => {
      await setBlockSupersession(newer.id, older.id, 'corrects', 1);
      proposeSupersede(older.id, newer.id);
      packBlocks.text = 'pack';
      packBlocks.blocks = await loadBlocks();

      await useCompressStore.getState().runStaleScan(threadId);

      expect(shown()).toEqual([[older.seq, newer.seq]]);
    });

    // ⭐ 扫描结果自己那条防重复规则**一个字没改**：库里已经有关系的，扫出来照样摘走。
    // ⚠️ 少了这一条，上面那条修复很容易被写成"把两把尺子都放宽"。
    it('⭐ 扫描提的同一对块照样被摘走（防重复没松）', async () => {
      await setBlockSupersession(newer.id, older.id, 'corrects', 1);
      packBlocks.text = 'pack';
      packBlocks.blocks = await loadBlocks();
      scanResult.proposals = [proposal(older.seq!, newer.seq!)];

      await useCompressStore.getState().runStaleScan(threadId);

      expect(shown()).toEqual([]);
      expect(useCompressStore.getState().stale[threadId]!.already).toBe(1);
    });
  });

  // ⭐⭐ 这才是用户实际要走完的那条路 —— ⚠️ 断言的是**库里最后长什么样**，
  // ⛔ 不是"某个函数被调用过"。
  it('⭐ 点「整条取代」之后：旧块退役并记着被新块取代、新块原来的更正一个字不动、提案行删掉', async () => {
    await setBlockSupersession(newer.id, older.id, 'corrects', 1);
    await setCorrectedQuote(newer.id, '旧的那一句');
    proposeSupersede(older.id, newer.id);
    await loadBlocks();
    await useCompressStore.getState().loadProposedStale(threadId);
    expect(shown()).toHaveLength(1);

    await useCompressStore.getState().decideStale(threadId, 0, 'retire');

    const rows = await listBlocksByThread(threadId);
    // v32（P7-3）：取代记在旧块上 —— 新块那一格照旧是它自己的更正。
    expect(rows.find((b) => b.id === newer.id)).toMatchObject({
      refBlockId: older.id,
      refKind: 'corrects',
      correctedQuote: '旧的那一句',
    });
    expect(rows.find((b) => b.id === older.id)).toMatchObject({ replacedByBlockId: newer.id });
    expect(rows.find((b) => b.id === older.id)!.staleAt).not.toBeNull();
    // 活干完了，库里那一行跟着走 —— ⚠️ 否则下次打开又问一遍。
    expect(await listSupersedeProposals(threadId, Date.now())).toEqual([]);
    // ⭐ 而且这一次是真的做完了：同一条提案再进来也不该再问。
    // ⚠️ P4-1 起重读不冲掉回执：单子上只剩划掉的那一条（「已换」），⛔ 没有一条等着他点。
    await loadBlocks();
    await useCompressStore.getState().loadProposedStale(threadId);
    expect(shown()).toEqual([[older.seq, newer.seq]]);
    expect(useCompressStore.getState().stale[threadId]!.decided).toEqual({ 0: 'retire' });
  });

  // ⭐ P4-1（2026-10-03）：这张卡从此在窗口拿到焦点、引擎跑完、库被别处动过时都会重读，
  // 不再只在切项目时 —— 重读一次不能冲掉他刚下的决定，也不能让刚写进来的块对不上号。
  describe('P4-1 · 一张开着的卡被重读', () => {
    const decided = () => useCompressStore.getState().stale[threadId]!.decided;

    it('⛔ AI 提的那条点过「不动」—— 重读之后还在、决定还在它身上；新来的接在后面', async () => {
      const third = await createBlock({ threadId, content: '08-24 那份 16 项。' });
      proposeSupersede(older.id, newer.id, 'row-1');
      proposeSupersede(newer.id, third.id, 'row-2');
      await loadBlocks();
      await useCompressStore.getState().loadProposedStale(threadId);
      await useCompressStore.getState().decideStale(threadId, 0, 'keep');
      // 「不动」把库里那一行删了 —— 照旧写法，下一次重读它就从单子上消失。
      expect((await listSupersedeProposals(threadId, Date.now())).map((p) => p.id)).toEqual([
        'row-2',
      ]);
      proposeSupersede(older.id, third.id, 'row-3');

      await useCompressStore.getState().loadProposedStale(threadId);

      expect(shown()).toEqual([
        [older.seq, newer.seq],
        [newer.seq, third.seq],
        [older.seq, third.seq],
      ]);
      expect(decided()).toEqual({ 0: 'keep' });
    });

    it('⛔ 扫描出来、点过「不动」的那条 —— AI 又提了一条排到它前面，决定跟着它挪，⛔ 不会又长出三个按钮', async () => {
      const third = await createBlock({ threadId, content: '08-24 那份 16 项。' });
      packBlocks.text = 'pack';
      packBlocks.blocks = await loadBlocks();
      scanResult.proposals = [proposal(older.seq!, newer.seq!)];
      await useCompressStore.getState().runStaleScan(threadId);
      await useCompressStore.getState().decideStale(threadId, 0, 'keep');
      proposeSupersede(newer.id, third.id);

      await useCompressStore.getState().loadProposedStale(threadId);

      expect(shown()).toEqual([
        [newer.seq, third.seq],
        [older.seq, newer.seq],
      ]);
      expect(decided()).toEqual({ 1: 'keep' });
    });

    it('⭐ 卡片已经开着，AI 再写一块新的、提「新的取代旧的」—— 先重读块再读提议，那一条点得动', async () => {
      proposeSupersede(older.id, newer.id, 'row-1');
      await loadBlocks();
      await useCompressStore.getState().loadProposedStale(threadId);
      const latest = await createBlock({ threadId, content: '08-25 那份 17 所。' });
      proposeSupersede(newer.id, latest.id, 'row-2');

      await loadBlocks();
      await useCompressStore.getState().loadProposedStale(threadId);
      expect(shown()).toEqual([
        [older.seq, newer.seq],
        [newer.seq, latest.seq],
      ]);
      // 照旧写法卡片留着开卡那一刻的块（没有 #latest）⇒ 报「有一块已经不在了」，什么都不写。
      await useCompressStore.getState().decideStale(threadId, 1, 'retire');

      const rows = await listBlocksByThread(threadId);
      expect(rows.find((b) => b.id === newer.id)!.staleAt).not.toBeNull();
    });
  });

  // P2 · B4（乙）：卡片按本项目的 #N 找块。一块被移动到别的项目之后，拿它在那边的编号回来找，
  // 会落到这边一块不相干的块上 —— 所以这一条先不出现；撤回移动，它又出现。
  it('⛔ 两块里有一块被移动到别的项目 —— 提案不出现；移回来又出现', async () => {
    proposeSupersede(older.id, newer.id);
    const ws = await createWorkspace('Other');
    const other = await createThread(ws.id, 'Other');

    await moveBlock(newer.id, other.id, newer.seq, newer.createdAt);
    expect(await listSupersedeProposals(threadId, Date.now())).toEqual([]);

    await moveBlock(newer.id, threadId, newer.seq, newer.createdAt);
    expect(
      (await listSupersedeProposals(threadId, Date.now())).map((p) => [p.staleSeq, p.bySeq]),
    ).toEqual([[older.seq, newer.seq]]);
  });
});
