import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  POLL_MS,
  __resetOutsideWritesForTest,
  pollOutsideWrites,
  reloadOutsideWrites,
  reloadOutsideWritesThrottled,
  watchOutsideWrites,
} from './outsideWrites';
import { useBlocksStore } from './blocksStore';
import { useCompressStore } from './compressStore';
import { useProposalsStore } from './proposalsStore';
import { useThreadsStore } from './threadsStore';
import { createAttachment } from '@/lib/db/attachments';
import { createBlock, deleteBlock, listBlocksByThread, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import { librarySignature } from '@/lib/db/librarySignature';
import { __insertBatchForTest } from '@/lib/db/proposals';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';

// P4-1 / P4-2（DISCOVERED-20260829-10）：AI 从外面写进库的东西，在开着的 Spool 里自己冒出来。
// 窗口拿到焦点、Spool 自己的引擎跑完、窗口看得见时记号变了 —— 三个时刻都走这一个模块。
//
// ⚠️ 走真库（`node:sqlite` + 真的 `schema.sql`），「外面写进来」就是绕过 store 直接写表 ——
// 和 `spool --mcp` 那个独立进程对这几个 store 的意义一样：它们不会被告知。

const { DatabaseSync } = createRequire(import.meta.url)(
  'node:sqlite',
) as typeof import('node:sqlite');
type Sqlite = InstanceType<typeof DatabaseSync>;
type SqlValue = string | number | bigint | null | Uint8Array;
const toNumbered = (sql: string): string => sql.replace(/\$(\d+)/g, '?$1');
/** 一共发了几条 SELECT —— 「看不见 ⇒ 连记号都不查」要靠它证明。 */
const selects = { n: 0 };
const makeAdapter = (handle: Sqlite): Database =>
  ({
    execute: async (sql: string, params: unknown[] = []) => {
      const r = handle.prepare(toNumbered(sql)).run(...(params as SqlValue[]));
      return { rowsAffected: Number(r.changes), lastInsertId: Number(r.lastInsertRowid) };
    },
    select: async (sql: string, params: unknown[] = []) => {
      selects.n += 1;
      return handle.prepare(toNumbered(sql)).all(...(params as SqlValue[]));
    },
  }) as unknown as Database;

let sqlite: Sqlite;
let workspaceId = '';
let threadId = '';
let older: Block;

beforeEach(async () => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec(schemaSql);
  __setTestDb(makeAdapter(sqlite));
  __resetOutsideWritesForTest();
  useCompressStore.setState({ stale: {} });
  useProposalsStore.setState({ pendingCount: 0, panelOpen: false });
  const ws = await createWorkspace('W');
  workspaceId = ws.id;
  const th = await createThread(ws.id, '申请规划');
  threadId = th.id;
  older = await createBlock({ threadId, content: '08-20 那份 14 所。' });
  // Spool 开着、停在这个项目上：项目列表和这个项目的块都已经读进来了。
  await useThreadsStore.getState().loadAll();
  useThreadsStore.setState({ activeId: threadId });
  await useBlocksStore.getState().load(threadId);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  __setTestDb(null);
  sqlite.close();
});

/** `spool --mcp` 的 propose_supersede 写的那一行。 */
const proposeSupersede = (staleId: string, byId: string, id = 'row-1') =>
  sqlite
    .prepare(
      `INSERT INTO supersede_proposals (id, thread_id, stale_block_id, by_block_id, client,
         why, quote_stale, quote_new, retyped, created_at, expires_at)
       VALUES (?,?,?,?,'Claude Code · MCP','整份改写','旧的那一句','新的那一句',0,?,?)`,
    )
    .run(id, threadId, staleId, byId, Date.now(), 9e15);

/** `spool --mcp` 的 propose_blocks 写的那一批。 */
const proposeBlocks = (id = 'batch-1') =>
  __insertBatchForTest({
    id, client: 'Claude · MCP', note: null, sourceText: null, sourceThreadId: null,
    createdAt: Date.now(), expiresAt: 9e15,
    items: [{ threadId, content: '一条待审的块', annotation: null, refBlockId: null }],
  });

describe('reloadOutsideWrites —— AI 从外面写进来的，一次重读全看得见', () => {
  // P7-5（Ocean 2026-10-07）：AI 提的「整条取代」进**待审**，⛔ 不再进「过期检测」那张卡。
  it('⭐ 先写新块、再提整条取代、再提一批块 —— 重读一次：块在、待审数算上两样、过期检测不冒出来，「取代」点得动', async () => {
    const newer = await createBlock({ threadId, content: '08-21 那份 15 所。' });
    proposeSupersede(older.id, newer.id);
    await proposeBlocks();
    // ⚠️ 前提：重读之前这几个 store 确实什么都不知道，否则下面的断言什么都没证明。
    expect(useBlocksStore.getState().byThread[threadId]).toHaveLength(1);
    expect(useProposalsStore.getState().pendingCount).toBe(0);

    await reloadOutsideWrites();

    expect(useBlocksStore.getState().byThread[threadId]).toHaveLength(2);
    expect(useProposalsStore.getState().pendingCount).toBe(2);
    expect(useCompressStore.getState().stale[threadId]).toBeUndefined();

    await useProposalsStore.getState().open();
    const [card] = useProposalsStore.getState().supersedeProposals!;
    await useProposalsStore.getState().decideSupersede(card!.proposal.id, 'replace');

    const rows = await listBlocksByThread(threadId);
    expect(rows.find((b) => b.id === older.id)).toMatchObject({ replacedByBlockId: newer.id });
    expect(rows.find((b) => b.id === older.id)!.staleAt).not.toBeNull();
    expect(useProposalsStore.getState().pendingCount).toBe(1);
  });

  it('外面什么都没写 —— 重读一次，单子不会凭空长出东西', async () => {
    await reloadOutsideWrites();

    expect(useCompressStore.getState().stale[threadId]).toBeUndefined();
    expect(useProposalsStore.getState().pendingCount).toBe(0);
    expect(useBlocksStore.getState().byThread[threadId]).toHaveLength(1);
  });

  // ⛔ 两个时刻各写一遍，正是「过期检测」那一种两边都漏掉的原因。这里只钉住它们都走这一个模块；
  // 读什么、按什么顺序，由上面那两条钉住。（仓库没有 DOM 测试环境，App 挂不起来。）
  it('⛔ 窗口焦点、引擎跑完、定时查记号都走这一个模块，⛔ 不再各写一遍', () => {
    const src = (p: string) => readFileSync(join(__dirname, p), 'utf8');
    const app = src('../App.tsx');
    const onFocus = app.slice(app.indexOf('const onFocus'), app.indexOf("addEventListener('focus'"));
    expect(onFocus).toContain('reloadOutsideWritesThrottled(');
    expect(onFocus).not.toMatch(/loadAll\(|\.load\(|refresh\(/);
    expect(app).toContain('useEffect(() => watchOutsideWrites(), [])');
    const engine = src('./engineStore.ts');
    expect(engine).toContain('await reloadOutsideWrites();');
    expect(engine).not.toContain('useProposalsStore');
  });
});

describe('librarySignature —— 「库有没有被别处动过」的记号', () => {
  it('什么都没写 ⇒ 两次一样；外面写了哪一种都会变', async () => {
    // ⚠️ 每一步之间拨一下钟：真实世界里两次写入不会落在同一毫秒，测试里会。
    vi.useFakeTimers({ toFake: ['Date'] });
    let clock = Date.now();
    const steps: [string, () => Promise<unknown> | unknown][] = [
      ['AI 写了一块', () => createBlock({ threadId, content: '新的一块' })],
      ['AI 建了一个项目', () => createThread(workspaceId, '新项目')],
      ['一批块待审', () => proposeBlocks()],
      ['申请读文件', async () => {
        const a = await createAttachment({ threadId, kind: 'file', target: '/x/a.pdf', label: 'a.pdf' });
        sqlite
          .prepare(
            `INSERT INTO file_access_requests (id, request_id, client, thread_id, attachment_id,
               why, created_at, expires_at) VALUES ('far-1','req-1','Codex',?,?,'要看',?,?)`,
          )
          .run(threadId, a.id, Date.now(), 9e15);
      }],
      ['跟进单的建议', () =>
        sqlite
          .prepare(
            `INSERT INTO follow_up_items (id, thread_id, text, fingerprint, status, proposed_by,
               sort_order, created_at) VALUES ('fu-1',?,'等结果','等结果','proposed','Codex',0,?)`,
          )
          .run(threadId, Date.now())],
      ['整条取代', () => proposeSupersede(older.id, older.id)],
      // P6-1：AI 提议挂文件 / 取代旧文件也是从 `spool --mcp` 写进来的。
      ['提议挂文件', () =>
        sqlite
          .prepare(
            `INSERT INTO file_proposals (id, kind, client, thread_id, path, size_bytes, why,
               created_at, expires_at) VALUES ('fp-1','attach','Codex · MCP',?,'/x/b.pdf',10,'要挂',?,?)`,
          )
          .run(threadId, Date.now(), 9e15)],
      // P9G-3：AI 提议拆项目同样从 `spool --mcp` 写进来。
      ['提议拆项目', () =>
        sqlite
          .prepare(
            `INSERT INTO split_proposals (id, thread_id, client, why, plan, created_at, expires_at)
               VALUES ('sp-1',?,'Codex · MCP','太长了','{"groups":[]}',?,?)`,
          )
          .run(threadId, Date.now(), 9e15)],
      ['又一批块待审', () => proposeBlocks('batch-2')],
      // ⚠️ 最新那一行还在、时间没变 —— 只有行数分得出来。
      ['早的那批过期被清掉', () => sqlite.exec("DELETE FROM proposal_batches WHERE id = 'batch-1'")],
      // ⚠️ 行数没变、rowid 也会被重用 —— 只有「最新那一行的时间」分得出来。
      ['删掉最新那块、紧接着又写进来一块', async () => {
        const rows = await listBlocksByThread(threadId);
        await deleteBlock(rows[rows.length - 1]!.id);
        await createBlock({ threadId, content: '又一块' });
      }],
    ];
    let before = await librarySignature();
    expect(await librarySignature()).toBe(before);
    for (const [name, write] of steps) {
      vi.setSystemTime((clock += 1000));
      await write();
      const after = await librarySignature();
      expect(after, name).not.toBe(before);
      before = after;
    }
  });
});

describe('P4-2 · 窗口开着、没拿焦点 —— 隔几秒查一次记号', () => {
  /** 一个只有重读才会改掉的值：重读会把它换成库里真实的待审数。 */
  const SENTINEL = 99;
  const reloaded = () => useProposalsStore.getState().pendingCount !== SENTINEL;
  const markUnread = () => useProposalsStore.setState({ pendingCount: SENTINEL });
  let clock = 0;
  const tick = (ms: number) => vi.setSystemTime((clock += ms));

  beforeEach(async () => {
    vi.useFakeTimers();
    clock = Date.now();
    // 开着的 Spool 已经重读过一次（启动后那一次焦点），记号记下了。
    await reloadOutsideWritesThrottled();
    tick(10_000);
  });

  it('记号没变 ⇒ 不重读', async () => {
    markUnread();

    await pollOutsideWrites();

    expect(reloaded()).toBe(false);
  });

  it('⭐ 变了 ⇒ 重读一次，之后记号不再变就不再读', async () => {
    await proposeBlocks();

    await pollOutsideWrites();
    expect(useProposalsStore.getState().pendingCount).toBe(1);

    markUnread();
    tick(10_000);
    await pollOutsideWrites();
    expect(reloaded()).toBe(false);
  });

  it('⛔ 刚因为焦点重读过 ⇒ 和焦点共用一个节流，等满 3 秒；⛔ 那一次变化不会丢', async () => {
    await reloadOutsideWritesThrottled(); // 焦点
    tick(1000);
    await proposeBlocks();

    await pollOutsideWrites();
    expect(useProposalsStore.getState().pendingCount).toBe(0);

    tick(2500);
    await pollOutsideWrites();
    expect(useProposalsStore.getState().pendingCount).toBe(1);
  });

  it('⛔ 窗口看不见 ⇒ 连记号都不查；看得见了，下一次就补上', async () => {
    const doc = { visibilityState: 'hidden' };
    vi.stubGlobal('document', doc);
    const stop = watchOutsideWrites();
    await proposeBlocks();
    const before = selects.n;

    await vi.advanceTimersByTimeAsync(POLL_MS * 3);
    expect(selects.n).toBe(before);
    expect(useProposalsStore.getState().pendingCount).toBe(0);

    doc.visibilityState = 'visible';
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(useProposalsStore.getState().pendingCount).toBe(1);
    stop();
  });
});
