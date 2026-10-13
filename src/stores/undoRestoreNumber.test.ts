import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// runUndo shows its confirmation card in the overlay window; nothing to show it in here.
const invoke = vi.fn().mockResolvedValue(undefined);
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

import { createAttachment, setAttachmentAnchor, type Attachment } from '@/lib/db/attachments';
import { createBlock, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { clear as clearUndoLog } from '@/lib/undo/undoLog';
import { runUndo } from '@/hooks/useUndo';
import { useBlocksStore } from './blocksStore';
import { useUndoStore } from './undoStore';

// P9F F1 (DISCOVERED-20261002-1): a block's number is MAX+1 in its project and a delete is a
// real delete, so deleting the NEWEST block frees its number for the next block to arrive.
// ⌘Z used to put the deleted one back under its old number, hit idx_blocks_thread_seq, and
// fail — with the undo entry already spent, so the block (and the files it took with it)
// never came back. ⚠️ Real SQLite (`node:sqlite` + the real schema.sql), driven through the
// same runUndo that ⌘Z calls.

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

describe('删掉编号最大的那块、又来了一块新的，⌘Z 照样撤得回来 (P9F F1)', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let newest: Block;
  let file: Attachment;

  const seqOf = (id: string) =>
    (sqlite.prepare('SELECT seq FROM blocks WHERE id = ?').get(id) as { seq: number } | undefined)?.seq ?? null;
  const fileRow = (id: string) =>
    (sqlite.prepare('SELECT thread_id, anchor_block_id FROM attachments WHERE id = ?').get(id) as
      | { thread_id: string; anchor_block_id: string | null }
      | undefined) ?? null;
  const store = () => useBlocksStore.getState();
  const onScreen = (id: string) => store().byThread[threadId]?.find((b) => b.id === id);

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    clearUndoLog();
    useUndoStore.setState({ entries: [], redoable: null });
    useBlocksStore.setState({ byThread: {}, attachmentsByThread: {}, selectedBlockIds: new Set() });

    const ws = await createWorkspace('W');
    threadId = (await createThread(ws.id, '申请规划')).id;
    await createBlock({ threadId, content: '第一块' });
    await createBlock({ threadId, content: '第二块' });
    newest = await createBlock({ threadId, content: '最新那块' });
    expect(newest.seq).toBe(3);
    file = await createAttachment({ threadId, kind: 'file', target: '/Users/a/方案.pdf', label: '方案.pdf' });
    await setAttachmentAnchor(file.id, newest.id);
    await store().load(threadId);
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('对照组：中间没有新块，⌘Z 原样回来，还是 #3，文件挂回原块', async () => {
    await store().remove(newest.id, { removeFiles: false });
    await runUndo();
    expect(seqOf(newest.id)).toBe(3);
    expect(onScreen(newest.id)?.seq).toBe(3);
    expect(fileRow(file.id)).toEqual({ thread_id: threadId, anchor_block_id: newest.id });
  });

  it('① 删掉之后 AI 写进来一块（拿走了 #3）：⌘Z 那块照样回来，换成 #4，文件挂回原块', async () => {
    await store().remove(newest.id, { removeFiles: false });
    // MCP add_block writes straight into the table — no undo entry of its own.
    const fromAi = await createBlock({ threadId, content: 'AI 写进来的', source: 'Claude' });
    expect(fromAi.seq).toBe(3);

    await runUndo();
    expect(seqOf(newest.id)).toBe(4);
    expect(seqOf(fromAi.id)).toBe(3);
    // The screen shows the number the library really gave it.
    expect(onScreen(newest.id)?.seq).toBe(4);
    expect(fileRow(file.id)).toEqual({ thread_id: threadId, anchor_block_id: newest.id });
  });

  it('② 删掉之后自己敲一块、再改它的批注：⌘Z 越过它去撤删除，照样回来', async () => {
    await store().remove(newest.id, { removeFiles: false });
    const typed = await store().append({ threadId, kind: 'text', content: '自己敲的' });
    expect(typed.seq).toBe(3);
    // Editing the note spends that block's own undo entry, so ⌘Z reaches the delete.
    await store().setAnnotation(typed.id, '改一下批注');

    await runUndo();
    expect(seqOf(newest.id)).toBe(4);
    expect(seqOf(typed.id)).toBe(3);
    expect(onScreen(newest.id)?.seq).toBe(4);
    expect(fileRow(file.id)).toEqual({ thread_id: threadId, anchor_block_id: newest.id });
  });

  it('③ 删的时候选了「一起去掉」文件：⌘Z 块和文件都回来，文件挂回原块', async () => {
    await store().remove(newest.id, { removeFiles: true });
    expect(fileRow(file.id)).toBeNull();
    await createBlock({ threadId, content: 'AI 写进来的', source: 'Claude' });

    await runUndo();
    expect(seqOf(newest.id)).toBe(4);
    expect(fileRow(file.id)).toEqual({ thread_id: threadId, anchor_block_id: newest.id });
    expect(store().attachmentsByThread[threadId]?.find((a) => a.id === file.id)?.anchorBlockId).toBe(newest.id);
  });
});
