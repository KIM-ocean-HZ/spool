import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBlock, getBlockById, setBlockRecheck } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import { addFollowUpItem, listFollowUpItems } from '@/lib/db/followUpItems';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import * as undoLog from '@/lib/undo/undoLog';
import { useUndoStore } from '@/stores/undoStore';
import { parseFollowUpReview, utcDay } from './followUpReview';
import { closeSuggestedLine, confirmRecheck } from './followUpReviewActions';

// P16-3 (Ocean 11-08 #1; 11-09 第 273、274 条): a follow-up's list for the user — read as Rust sends it, and the two
// clicks against a real SQLite: one click changes one thing, one ⌘Z puts it back.

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
    select: async (sql: string, params: unknown[] = []) => handle.prepare(toNumbered(sql)).all(...(params as SqlValue[])),
  }) as unknown as Database;

describe('parseFollowUpReview', () => {
  it('reads Rust’s entries and leaves out what does not read', () => {
    const items = parseFollowUpReview([
      { kind: 'line', item_id: 'a', line: '回信了没有', verdict: 'suggest_close', why: '回了一半', evidence: '#3' },
      { kind: 'line', item_id: 'b', line: '邀请到了没有', verdict: 'needs_user', why: '只在邮箱里' },
      { kind: 'block', block_id: 'x', seq: 4, head: '学费 90 镑', verdict: 'still_holds', why: '没变', url: 'https://u.example', next_recheck: '2027-03-01' },
      { kind: 'block', block_id: 'y', seq: 5, head: '截止 1 月 5 日', verdict: 'changed', why: '改到 10 日' },
      { kind: 'block', block_id: 'z', seq: 6, head: '没日期', verdict: 'still_holds', why: '缺下次日期' },
      { kind: 'line', item_id: 'c', verdict: 'close_it', why: '不认识的结果' },
      'not an object',
    ]);
    expect(items.map((i) => (i.kind === 'line' ? i.itemId : i.blockId))).toEqual(['a', 'b', 'x', 'y']);
    expect(items[0]).toMatchObject({ evidence: '#3' });
    expect(items[2]).toMatchObject({ nextRecheck: '2027-03-01', url: 'https://u.example' });
    expect(parseFollowUpReview(undefined)).toEqual([]);
  });

  it('a recheck date is that day’s UTC midnight', () => {
    expect(utcDay('2027-03-01')).toBe(Date.UTC(2027, 2, 1));
    expect(utcDay('2027-3-1')).toBeNull();
  });
});

describe('the two clicks on a follow-up card', () => {
  let sqlite: Sqlite;
  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    undoLog.clear();
    useUndoStore.setState({ entries: [], redoable: null });
  });
  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('关掉: the line is closed with the AI’s sentence, ⌘Z reopens it, redo closes it again', async () => {
    const ws = await createWorkspace('升学');
    const th = await createThread(ws.id, '推荐信');
    const id = (await addFollowUpItem(th.id, '推荐人回没回', false))!;
    await closeSuggestedLine(th.id, '推荐信', { kind: 'line', itemId: id, line: '推荐人回没回', verdict: 'suggest_close', why: '回了，但没说哪所' });
    const closed = (await listFollowUpItems(th.id))[0]!;
    expect([closed.status, closed.outcome]).toEqual(['answered', '回了，但没说哪所']);
    await useUndoStore.getState().undo();
    expect((await listFollowUpItems(th.id))[0]!.status).toBe('open');
    await useUndoStore.getState().redo();
    expect((await listFollowUpItems(th.id))[0]!.status).toBe('answered');
  });

  it('标成已核对: checked today, due again on the given day; ⌘Z puts both old dates back', async () => {
    const ws = await createWorkspace('升学');
    const th = await createThread(ws.id, '学费');
    const b = await createBlock({ threadId: th.id, content: '学费 90 镑' });
    await setBlockRecheck(b.id, Date.UTC(2026, 0, 2), Date.UTC(2026, 5, 1));
    const now = Date.UTC(2026, 10, 10, 15);
    await confirmRecheck(
      th.id,
      '学费',
      { kind: 'block', blockId: b.id, seq: 1, head: '学费 90 镑', verdict: 'still_holds', why: '没变', url: 'https://u.example', nextRecheck: '2027-05-01' },
      now,
    );
    const after = (await getBlockById(b.id))!;
    expect([after.retrievedAt, after.recheckAfter]).toEqual([Date.UTC(2026, 10, 10), Date.UTC(2027, 4, 1)]);
    await useUndoStore.getState().undo();
    const back = (await getBlockById(b.id))!;
    expect([back.retrievedAt, back.recheckAfter]).toEqual([Date.UTC(2026, 0, 2), Date.UTC(2026, 5, 1)]);
  });
});
