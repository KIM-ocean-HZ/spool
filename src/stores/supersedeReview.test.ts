import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useProposalsStore } from './proposalsStore';
import { useThreadsStore } from './threadsStore';
import {
  createBlock,
  deleteBlock,
  listBlocksByThread,
  moveBlock,
  setBlockStale,
  setBlockSupersession,
  setCorrectedQuote,
  type Block,
} from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';

// P7-5 (Ocean 2026-10-07, HANDOFF §9.2 第 40 条) —— AI 的「更正 / 取代」建议进**待审**，
// 用户在「更正 / 取代 / 不动」里选，不管 AI 建议的是哪一种。
// 08-29 那两次「静默隐藏」的教训（`supersedeProposalSettled`）跟着搬到这里：只有那件事在库里
// **真的做完了**才不再问；`corrects` 已经在、或者老记法只成了一半，都照样摆出来。
// ⚠️ 真 SQLite（`node:sqlite` + 真的 schema.sql）；断言的是库里最后长什么样。

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

describe('待审面：AI 的「更正 / 取代」建议，三选一 (P7-5)', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let b3: Block; // Flux #3：被 #20 更正着的那一块
  let b4: Block; // Flux #4
  let b14: Block; // Flux #14
  let b20: Block; // Flux #20：新块

  /** MCP 服务端写的那一行（`propose_supersede`，或 P7-4 起 `add_block` 带 ref_kind）。 */
  const suggest = (older: Block, newer: Block, kind: 'supersedes' | 'corrects' | null, id: string,
                   expiresAt = 9e15) =>
    sqlite
      .prepare(
        `INSERT INTO supersede_proposals (id, thread_id, stale_block_id, by_block_id, client,
           why, quote_stale, quote_new, retyped, created_at, expires_at, suggested_kind)
         VALUES (?,?,?,?,'Claude · MCP','整份改写','v1',' ',0,?,?,?)`,
      )
      .run(id, older.threadId, older.id, newer.id, Date.now(), expiresAt, kind);
  const store = () => useProposalsStore.getState();
  const cards = () => (store().supersedeProposals ?? []).map((c) => c.proposal.id);
  const row = async (id: string) => (await listBlocksByThread(threadId)).find((b) => b.id === id)!;
  const queued = () => (sqlite.prepare('SELECT id FROM supersede_proposals ORDER BY id').all() as { id: string }[]).map((r) => r.id);

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    useProposalsStore.setState({ pendingCount: 0, panelOpen: false, busy: false, supersedeProposals: null });
    const ws = await createWorkspace('W');
    const th = await createThread(ws.id, 'Flux');
    threadId = th.id;
    await useThreadsStore.getState().loadAll();
    b3 = await createBlock({ threadId, content: '# FLUX v1 简报。' });
    b4 = await createBlock({ threadId, content: 'README v1：钢琴卷帘 stub。' });
    b14 = await createBlock({ threadId, content: '时间表 v1。' });
    b20 = await createBlock({ threadId, content: 'FLUX 代码结构 v2。' });
    // #20 写进来时就更正着 #3（P7-4 以前 AI 的更正当场生效，真库就是这个形状）。
    await setBlockSupersession(b20.id, b3.id, 'corrects', 1);
    await setCorrectedQuote(b20.id, 'v1');
  });
  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('⭐ 待审数算上它；卡片带着 AI 建议的是哪一种；过期的不算、被清掉', async () => {
    suggest(b4, b20, 'supersedes', 'r1');
    suggest(b14, b20, 'corrects', 'r2');
    suggest(b14, b4, null, 'r0-old', 1); // 过期了
    await store().refresh();
    expect(store().pendingCount).toBe(2);
    expect(queued()).toEqual(['r1', 'r2']);

    await store().open();
    expect(store().supersedeProposals!.map((c) => [c.proposal.id, c.proposal.suggestedKind])).toEqual([
      ['r1', 'supersedes'],
      ['r2', 'corrects'],
    ]);
  });

  it('⭐ Flux #4 的形状：#20 已经在更正 #3 ——「更正」点不了（说得出在更正谁），「取代」点得成', async () => {
    suggest(b4, b20, 'supersedes', 'r1');
    await store().open();
    const [card] = store().supersedeProposals!;
    expect(card!.occupied).toEqual({ kind: 'corrects', seq: b3.seq });

    await store().decideSupersede('r1', 'correct');
    expect(queued()).toEqual(['r1']); // 什么都没写，卡片还在
    expect(await row(b20.id)).toMatchObject({ refBlockId: b3.id, refKind: 'corrects' });

    await store().decideSupersede('r1', 'replace');
    expect(await row(b4.id)).toMatchObject({ replacedByBlockId: b20.id });
    expect((await row(b4.id)).staleAt).not.toBeNull();
    // #20 原来对 #3 的更正还在。
    expect(await row(b20.id)).toMatchObject({ refBlockId: b3.id, refKind: 'corrects', correctedQuote: 'v1' });
    expect(queued()).toEqual([]);
    expect(store().pendingCount).toBe(0);
  });

  it('⭐ 一块新的取代三块（三张卡，各点「取代」）', async () => {
    const b2 = await createBlock({ threadId, content: '计划 v1。' });
    suggest(b2, b20, 'supersedes', 'r1');
    suggest(b4, b20, 'supersedes', 'r2');
    suggest(b14, b20, 'corrects', 'r3'); // AI 建议的是更正，他照样能选取代
    await store().open();
    for (const id of ['r1', 'r2', 'r3']) await store().decideSupersede(id, 'replace');
    const rows = await listBlocksByThread(threadId);
    expect(rows.filter((b) => b.replacedByBlockId === b20.id).map((b) => b.id)).toEqual([b4.id, b14.id, b2.id]);
    expect(await row(b20.id)).toMatchObject({ refBlockId: b3.id, refKind: 'corrects' });
  });

  it('「更正」：新块那一格空着 ⇒ 写上 corrects + 那一句；旧块不退', async () => {
    const fresh = await createBlock({ threadId, content: '时间表 v2：九月改到十月。' });
    suggest(b14, fresh, 'corrects', 'r1');
    await store().open();
    expect(store().supersedeProposals![0]!.occupied).toBeNull();
    await store().decideSupersede('r1', 'correct');
    expect(await row(fresh.id)).toMatchObject({ refBlockId: b14.id, refKind: 'corrects', correctedQuote: 'v1' });
    expect(await row(b14.id)).toMatchObject({ staleAt: null, replacedByBlockId: null });
    expect(queued()).toEqual([]);
  });

  it('「不动」：那一行删掉，库里别的一个字不动', async () => {
    suggest(b4, b20, 'supersedes', 'r1');
    const before = sqlite.prepare('SELECT * FROM blocks ORDER BY id').all();
    await store().open();
    await store().decideSupersede('r1', 'keep');
    expect(queued()).toEqual([]);
    expect(sqlite.prepare('SELECT * FROM blocks ORDER BY id').all()).toEqual(before);
    expect(store().panelOpen).toBe(false); // 待审里没东西了，自己关上
  });

  describe('库里已经做完的，不再问；没做完的，⛔ 不许藏', () => {
    it('v32 记法已经取代过 / 老记法两半都成了 ⇒ 不出现', async () => {
      suggest(b4, b20, 'supersedes', 'r1');
      sqlite.prepare('UPDATE blocks SET stale_at = 5, replaced_by_block_id = ? WHERE id = ?').run(b20.id, b4.id);
      const legacyNew = await createBlock({ threadId, content: '时间表 v3。' });
      await setBlockSupersession(legacyNew.id, b14.id, 'supersedes', 7); // 老记法：新块 + 旧块 stale_at
      suggest(b14, legacyNew, 'supersedes', 'r2');
      await store().refresh();
      expect(store().pendingCount).toBe(0);
    });

    it('⛔ 老记法只成了一半（旧块又被取回来了）⇒ 照样出现，点「取代」这次真的退役', async () => {
      const legacyNew = await createBlock({ threadId, content: '时间表 v3。' });
      await setBlockSupersession(legacyNew.id, b14.id, 'supersedes', 7);
      await setBlockStale(b14.id, null);
      suggest(b14, legacyNew, 'supersedes', 'r1');
      await store().open();
      expect(cards()).toEqual(['r1']);
      await store().decideSupersede('r1', 'replace');
      expect((await row(b14.id)).staleAt).not.toBeNull();
    });

    it('⛔ 已经更正着这一块，AI 建议的是「取代」⇒ 照样出现（不是同一个决定）；建议「更正」⇒ 做完了', async () => {
      suggest(b3, b20, 'supersedes', 'r1');
      suggest(b3, b20, 'corrects', 'r2');
      await store().open();
      expect(cards()).toEqual(['r1']);
      expect(store().supersedeProposals![0]!.occupied).toBeNull(); // 指着的就是这一块
    });

    it('两块里有一块删了 ⇒ 不出现；被挪到别的项目 ⇒ 照样出现（卡片按块认，不按编号）', async () => {
      suggest(b4, b20, 'supersedes', 'r1');
      suggest(b14, b20, 'supersedes', 'r2');
      await deleteBlock(b14.id);
      const ws = await createWorkspace('Other');
      const other = await createThread(ws.id, 'Other');
      await moveBlock(b20.id, other.id, b20.seq, b20.createdAt);
      await store().open();
      expect(cards()).toEqual(['r1']);
      expect(store().supersedeProposals![0]!.newer.threadId).toBe(other.id);
    });
  });
});
