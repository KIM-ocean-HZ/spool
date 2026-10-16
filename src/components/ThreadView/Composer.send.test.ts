import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import { t } from '@/lib/i18n';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { clear as clearUndoLog } from '@/lib/undo/undoLog';
import { useBlocksStore } from '@/stores/blocksStore';
import { useDraftStore } from '@/stores/draftStore';
import { useToastStore } from '@/stores/toastStore';
import { useUndoStore } from '@/stores/undoStore';
import { sendDraft } from './Composer';

// P9H-1（DISCOVERED-20261015-4）：输入框「发出去」原来先清草稿、再存进库 —— 存失败那段字就没了，
// 也没有提示。现在存上了才清；存的那一下再按 Enter 不会发第二份。

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

describe('输入框发出去：存上了才清草稿', () => {
  let sqlite: Sqlite;
  let threadId = '';
  const realAppend = useBlocksStore.getState().append;
  const blockCount = () => (sqlite.prepare('SELECT COUNT(*) AS n FROM blocks WHERE thread_id = ?').get(threadId) as { n: number }).n;
  const draftNow = () => useDraftStore.getState().byThread[threadId];

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    clearUndoLog();
    useUndoStore.setState({ entries: [], redoable: null });
    useBlocksStore.setState({ byThread: {}, append: realAppend });
    useDraftStore.setState({ byThread: {}, images: {} });
    useToastStore.setState({ toasts: [] });
    const ws = await createWorkspace('W');
    threadId = (await createThread(ws.id, '申请规划')).id;
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('存上了：块进库，草稿清掉', async () => {
    useDraftStore.getState().setDraft(threadId, '  今天定了方案  ');
    const block = await sendDraft(threadId);
    expect(block?.content).toBe('今天定了方案');
    expect(blockCount()).toBe(1);
    expect(draftNow()).toBeUndefined();
  });

  it('库写失败：字留在输入框里，toast 说没存上', async () => {
    useBlocksStore.setState({
      append: async () => {
        throw new Error('database is locked');
      },
    });
    useDraftStore.getState().setDraft(threadId, '后面写的两段');
    const block = await sendDraft(threadId);
    expect(block).toBeNull();
    expect(draftNow()).toBe('后面写的两段');
    expect(useToastStore.getState().toasts.map((x) => [x.kind, x.message])).toEqual([['error', t('没存上，字还在输入框里。')]]);
  });

  it('存的那一下连按两次 Enter：只发一份', async () => {
    useDraftStore.getState().setDraft(threadId, '只发一次');
    const [a, b] = await Promise.all([sendDraft(threadId), sendDraft(threadId)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(blockCount()).toBe(1);
  });

  it('存的那一会儿接着打的字留在框里，发出去的那段不留', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    useBlocksStore.setState({
      append: async (args) => {
        await gate;
        return realAppend(args);
      },
    });
    useDraftStore.getState().setDraft(threadId, '第一条');
    const pending = sendDraft(threadId);
    // 字还在框里（没先清），人接着打。
    expect(draftNow()).toBe('第一条');
    useDraftStore.getState().setDraft(threadId, '第一条第二条的开头');
    release();
    const block = (await pending) as Block;
    expect(block.content).toBe('第一条');
    expect(draftNow()).toBe('第二条的开头');
  });
});
