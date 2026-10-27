import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBlock, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import { addFollowUpItem, listFollowUpItems } from '@/lib/db/followUpItems';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread, type Thread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { useProposalsStore } from '@/stores/proposalsStore';
import { selectThreadById, useThreadsStore } from '@/stores/threadsStore';
import { useUndoStore } from '@/stores/undoStore';
import * as undoLog from '@/lib/undo/undoLog';
import { actionState, applyWeeklyAction, dayOf, loadActionContext } from './weeklyActions';
import { WEEKLY_FORMAT, type WeeklyAction, type WeeklyReview } from './weeklyStructured';

// P10-3 (Ocean 2026-10-26) — the buttons under a weekly review card, against a real SQLite with the
// real schema. 标完成 / 改截止日期 / 加跟进行: one click changes the library and one ⌘Z puts it back
// (and redo again). 取代 / 更正: the click only queues it in 待审 (第 219 条) — no block changes.

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

const action = (over: Partial<WeeklyAction>): WeeklyAction => ({
  kind: 'mark_done',
  why: '看起来做完了',
  quote: '都交了',
  date: null,
  text: null,
  oldQuote: null,
  newQuote: null,
  staleBlockId: null,
  byBlockId: null,
  retyped: false,
  ...over,
});

const reviewOf = (threadId: string, actions: WeeklyAction[]): WeeklyReview => ({
  format: WEEKLY_FORMAT,
  projects: [{ title: '申请规划', threadId, did: '', stuck: '', signals: [], actions }],
  next: '',
  dropped: [],
});

describe('周回顾的建议动作 (P10-3)', () => {
  let sqlite: Sqlite;
  let th: Thread;
  const thread = () => selectThreadById(th.id)(useThreadsStore.getState())!;
  const stateOf = async (a: WeeklyAction) =>
    actionState(a, thread(), await loadActionContext(reviewOf(th.id, [a]), Date.now()));

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    undoLog.clear();
    useUndoStore.setState({ entries: [], redoable: null });
    useProposalsStore.setState({ pendingCount: 0, panelOpen: false, busy: false, supersedeProposals: null });
    const ws = await createWorkspace('升学');
    th = await createThread(ws.id, '申请规划');
    await useThreadsStore.getState().loadAll();
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('标完成: one click, one ⌘Z back to exactly how it was, and redo again', async () => {
    const before = thread();
    const a = action({ kind: 'mark_done' });
    expect(await stateOf(a)).toBe('ready');
    await applyWeeklyAction(a, th.id, '周回顾 · m');
    expect(thread().status).toBe('done');
    expect(await stateOf(a)).toBe('applied');

    await useUndoStore.getState().undo();
    await useThreadsStore.getState().loadAll();
    expect([thread().status, thread().completedAt, thread().updatedAt]).toEqual([
      before.status,
      before.completedAt,
      before.updatedAt,
    ]);
    await useUndoStore.getState().redo();
    await useThreadsStore.getState().loadAll();
    expect(thread().status).toBe('done');
  });

  it('改截止日期: set to that day; ⌘Z puts the old one back', async () => {
    const a = action({ kind: 'set_deadline', date: '2026-11-30', quote: '截止改到 11 月 30 日' });
    await applyWeeklyAction(a, th.id, '周回顾 · m');
    expect(dayOf(thread().deadline!)).toBe('2026-11-30');
    expect(await stateOf(a)).toBe('applied');
    await useUndoStore.getState().undo();
    await useThreadsStore.getState().loadAll();
    expect(thread().deadline).toBeNull();
    expect(await stateOf(a)).toBe('ready');
  });

  it('加跟进行: the line is live at once; ⌘Z removes exactly that line', async () => {
    const a = action({ kind: 'add_follow_up', text: '推荐人回没回', quote: '推荐信还没人答应' });
    await applyWeeklyAction(a, th.id, '周回顾 · m');
    const lines = await listFollowUpItems(th.id);
    expect(lines.map((l) => [l.text, l.status])).toEqual([['推荐人回没回', 'open']]);
    expect(await stateOf(a)).toBe('applied');
    await useUndoStore.getState().undo();
    expect(await listFollowUpItems(th.id)).toEqual([]);
    await useUndoStore.getState().redo();
    expect((await listFollowUpItems(th.id)).map((l) => l.id)).toEqual([lines[0]!.id]);
  });

  // 验收第一轮（Ocean 2026-10-27）: the review closes a line the week answered — closed, not deleted,
  // with the answer as its outcome and the answering block linked; ⌘Z opens it again.
  it('关跟进行: one click closes it with the answer; ⌘Z reopens it; redo closes it again', async () => {
    const lineId = (await addFollowUpItem(th.id, '推荐人回没回', false))!;
    const answer: Block = await createBlock({ threadId: th.id, content: '推荐人已经回信答应了。' });
    const a = action({
      kind: 'close_follow_up',
      line: '推荐人回没回',
      quote: '推荐人已经回信答应了',
      why: '答应了',
      followUpId: lineId,
      answerBlockId: answer.id,
    });
    expect(await stateOf(a)).toBe('ready');
    await applyWeeklyAction(a, th.id, '周回顾 · m');
    const closed = (await listFollowUpItems(th.id))[0]!;
    expect([closed.status, closed.outcome, closed.answerBlockId]).toEqual(['answered', '答应了', answer.id]);
    expect(await stateOf(a)).toBe('applied');
    await useUndoStore.getState().undo();
    expect((await listFollowUpItems(th.id))[0]!.status).toBe('open');
    expect(await stateOf(a)).toBe('ready');
    await useUndoStore.getState().redo();
    expect((await listFollowUpItems(th.id))[0]!.status).toBe('answered');
  });

  it('取代 / 更正: the click queues it in 待审 and changes no block', async () => {
    const older: Block = await createBlock({ threadId: th.id, content: '一共申请十四所。' });
    const newer: Block = await createBlock({ threadId: th.id, content: '一共申请十六所。' });
    const a = action({
      kind: 'correct',
      quote: null,
      oldQuote: '一共申请十四所',
      newQuote: '一共申请十六所',
      why: '数目改了',
      staleBlockId: older.id,
      byBlockId: newer.id,
    });
    expect(await stateOf(a)).toBe('ready');
    const blocksBefore = sqlite.prepare('SELECT * FROM blocks ORDER BY id').all();
    await applyWeeklyAction(a, th.id, '周回顾 · m');
    expect(sqlite.prepare('SELECT * FROM blocks ORDER BY id').all()).toEqual(blocksBefore);
    const rows = sqlite
      .prepare('SELECT thread_id, stale_block_id, by_block_id, client, why, quote_stale, quote_new, suggested_kind FROM supersede_proposals')
      .all();
    expect(rows).toEqual([
      {
        thread_id: th.id,
        stale_block_id: older.id,
        by_block_id: newer.id,
        client: '周回顾 · m',
        why: '数目改了',
        quote_stale: '一共申请十四所',
        quote_new: '一共申请十六所',
        suggested_kind: 'corrects',
      },
    ]);
    expect(await stateOf(a)).toBe('queued');
    // It is a proposal like any other: no ⌘Z entry, the decision is in 待审.
    expect(useUndoStore.getState().entries).toEqual([]);
    // Clicking it again does not queue the pair twice.
    await applyWeeklyAction(a, th.id, '周回顾 · m');
    expect(sqlite.prepare('SELECT COUNT(*) AS c FROM supersede_proposals').get()).toEqual({ c: 1 });
  });
});
