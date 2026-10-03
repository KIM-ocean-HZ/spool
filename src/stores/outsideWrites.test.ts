import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { reloadOutsideWrites } from './outsideWrites';
import { useBlocksStore } from './blocksStore';
import { useCompressStore } from './compressStore';
import { useProposalsStore } from './proposalsStore';
import { useThreadsStore } from './threadsStore';
import { createBlock, listBlocksByThread, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import { __insertBatchForTest } from '@/lib/db/proposals';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';

// P4-1（DISCOVERED-20260829-10）：窗口拿到焦点、Spool 自己的引擎跑完，都走 `reloadOutsideWrites`。
// 停在一个项目上，AI 那边先写一块新的、再提「新的取代旧的」、再提一批块 —— 一次重读之后，
// 收件箱的数、「过期检测」那一条都要在，而且那一条**点得动**（三个按钮按刚读进来的块找 #n）。
//
// ⚠️ 走真库（`node:sqlite` + 真的 `schema.sql`），「外面写进来」就是绕过 store 直接写表 ——
// 和 `spool --mcp` 那个独立进程对这几个 store 的意义一样：它们不会被告知。

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

describe('reloadOutsideWrites —— AI 从外面写进来的，一次重读全看得见', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let older: Block;

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    useCompressStore.setState({ stale: {} });
    useProposalsStore.setState({ pendingCount: 0, panelOpen: false });
    const ws = await createWorkspace('W');
    const th = await createThread(ws.id, '申请规划');
    threadId = th.id;
    older = await createBlock({ threadId, content: '08-20 那份 14 所。' });
    // Spool 开着、停在这个项目上：项目列表和这个项目的块都已经读进来了。
    await useThreadsStore.getState().loadAll();
    useThreadsStore.setState({ activeId: threadId });
    await useBlocksStore.getState().load(threadId);
  });
  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  /** `spool --mcp` 的 propose_supersede 写的那一行。 */
  const proposeSupersede = (staleId: string, byId: string) =>
    sqlite
      .prepare(
        `INSERT INTO supersede_proposals (id, thread_id, stale_block_id, by_block_id, client,
           why, quote_stale, quote_new, retyped, created_at, expires_at)
         VALUES ('row-1',?,?,?,'Claude Code · MCP','整份改写','旧的那一句','新的那一句',0,?,?)`,
      )
      .run(threadId, staleId, byId, Date.now(), 9e15);

  it('⭐ 先写新块、再提整条取代、再提一批块 —— 重读一次：数字、页签那一条都在，「整条取代」点得动', async () => {
    const newer = await createBlock({ threadId, content: '08-21 那份 15 所。' });
    proposeSupersede(older.id, newer.id);
    await __insertBatchForTest({
      id: 'batch-1', client: 'Claude · MCP', note: null, sourceText: null,
      sourceThreadId: null, createdAt: Date.now(), expiresAt: 9e15,
      items: [{ threadId, content: '一条待审的块', annotation: null, refBlockId: null }],
    });
    // ⚠️ 前提：重读之前这几个 store 确实什么都不知道，否则下面的断言什么都没证明。
    expect(useBlocksStore.getState().byThread[threadId]).toHaveLength(1);
    expect(useCompressStore.getState().stale[threadId]).toBeUndefined();
    expect(useProposalsStore.getState().pendingCount).toBe(0);

    await reloadOutsideWrites();

    expect(useBlocksStore.getState().byThread[threadId]).toHaveLength(2);
    expect(useProposalsStore.getState().pendingCount).toBe(1);
    const sess = useCompressStore.getState().stale[threadId]!;
    expect(sess.proposals.map((p) => [p.staleSeq, p.bySeq, p.origin])).toEqual([
      [older.seq, newer.seq, 'mcp'],
    ]);
    // ⭐ 「排在块之后」的证据：三个按钮找块用的那一份里有 AI 刚写的那块。
    // 反过来排（先读提议、后读块），这里只有 1 块，「整条取代」会报「有一块已经不在了」、什么都不写。
    expect(sess.blocks.map((b) => b.id)).toContain(newer.id);

    await useCompressStore.getState().decideStale(threadId, 0, 'retire');

    const rows = await listBlocksByThread(threadId);
    expect(rows.find((b) => b.id === older.id)!.staleAt).not.toBeNull();
  });

  it('外面什么都没写 —— 重读一次，单子不会凭空长出东西', async () => {
    await reloadOutsideWrites();

    expect(useCompressStore.getState().stale[threadId]).toBeUndefined();
    expect(useProposalsStore.getState().pendingCount).toBe(0);
    expect(useBlocksStore.getState().byThread[threadId]).toHaveLength(1);
  });

  // ⛔ 两个时刻各写一遍，正是「过期检测」那一种两边都漏掉的原因。这里只钉住它们都走这一个函数；
  // 函数本身读什么、按什么顺序，由上面那两条钉住。（仓库没有 DOM 测试环境，App 挂不起来。）
  it('⛔ 窗口焦点和引擎跑完都调这一个函数，⛔ 不再各写一遍', () => {
    const src = (p: string) => readFileSync(join(__dirname, p), 'utf8');
    const app = src('../App.tsx');
    const onFocus = app.slice(app.indexOf('const onFocus'), app.indexOf("addEventListener('focus'"));
    expect(onFocus).toContain('reloadOutsideWrites(');
    expect(onFocus).not.toMatch(/loadAll\(|\.load\(|refresh\(/);
    const engine = src('./engineStore.ts');
    expect(engine).toContain('await reloadOutsideWrites();');
    expect(engine).not.toContain('useProposalsStore');
  });
});
