import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAttachment, listAttachmentsByThread, type Attachment } from '@/lib/db/attachments';
import { createBlock, listBlocksByThread, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { anchorForDrop } from '@/lib/files/fileDrag';
import { clear as clearUndoLog } from '@/lib/undo/undoLog';
import { useBlocksStore } from './blocksStore';
import { useUndoStore } from './undoStore';

// P5 (Ocean 2026-09-30 / 10-03) — a project file can hang off one block of its project.
// ⚠️ Real SQLite (`node:sqlite` + the real schema.sql), the same way undoStore.test.ts and
// compressStore.stale.test.ts do it: what is pinned here is what lands in the table.

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

describe('项目文件挂到块上 (P5-2)', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let otherThreadId = '';
  let b1: Block;
  let b2: Block;
  let elsewhere: Block;
  let file: Attachment;

  const row = (id: string) =>
    sqlite
      .prepare(
        'SELECT thread_id, anchor_block_id, added_by, ai_access, include_in_pack FROM attachments WHERE id = ?',
      )
      .get(id);

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    clearUndoLog();
    useUndoStore.setState({ entries: [], redoable: null });
    const ws = await createWorkspace('W');
    threadId = (await createThread(ws.id, '申请规划')).id;
    otherThreadId = (await createThread(ws.id, '别的项目')).id;
    b1 = await createBlock({ threadId, content: '第一块' });
    b2 = await createBlock({ threadId, content: '第二块' });
    elsewhere = await createBlock({ threadId: otherThreadId, content: '别处的一块' });
    file = await createAttachment({ threadId, kind: 'file', target: '/Users/a/方案.pdf', label: '方案.pdf' });
    useBlocksStore.setState({ byThread: {}, attachmentsByThread: {} });
    await useBlocksStore.getState().load(threadId);
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  // P5-4 (Ocean 2026-09-30 §9.2 第 9 条):「默认可读（挂上去就是同意）」—— 打包带正文照旧默认关。
  it('新加的文件挂在项目上、记着是你加的、AI 默认可读', () => {
    expect(row(file.id)).toEqual({
      thread_id: threadId,
      anchor_block_id: null,
      added_by: 'user',
      ai_access: 1,
      include_in_pack: 0,
    });
    expect(file.aiAccess).toBe(true);
    expect(file.includeInPack).toBe(false);
  });

  it('开关照旧能关', async () => {
    await useBlocksStore.getState().setAiAccess(file.id, threadId, false);
    expect((row(file.id) as { ai_access: number }).ai_access).toBe(0);
    expect((await listAttachmentsByThread(threadId))[0]?.aiAccess).toBe(false);
  });

  it('挂上 → 改挂 → 改回：库里只动锚定那一列', async () => {
    const before = row(file.id) as Record<string, unknown>;
    const store = useBlocksStore.getState();

    await store.anchorAttachment(file.id, threadId, b1.id);
    expect(row(file.id)).toEqual({ ...before, anchor_block_id: b1.id });
    expect(useBlocksStore.getState().attachmentsByThread[threadId]?.[0]?.anchorBlockId).toBe(b1.id);

    await store.anchorAttachment(file.id, threadId, b2.id);
    expect(row(file.id)).toEqual({ ...before, anchor_block_id: b2.id });

    await store.anchorAttachment(file.id, threadId, null);
    expect(row(file.id)).toEqual(before);
    expect(useBlocksStore.getState().attachmentsByThread[threadId]?.[0]?.anchorBlockId).toBeNull();
    // Reloading reads back what was written — the store did not just patch itself.
    expect((await listAttachmentsByThread(threadId))[0]?.anchorBlockId).toBeNull();
  });

  it('挂上 / 改回不进撤销环（和置顶一样，手势自己就是反向操作）', async () => {
    await useBlocksStore.getState().anchorAttachment(file.id, threadId, b1.id);
    expect(useUndoStore.getState().entries).toHaveLength(0);
  });

  it('松手落在哪里才算数', async () => {
    const blocks = await listBlocksByThread(threadId);
    // 落在本项目的一块上 ⇒ 挂上去。
    expect(anchorForDrop(file, b1.id, blocks)).toBe(b1.id);
    // 松在块外面 ⇒ 什么都不变。
    expect(anchorForDrop(file, null, blocks)).toBeUndefined();
    // 已经挂在这一块上 ⇒ 什么都不变。
    expect(anchorForDrop({ ...file, anchorBlockId: b1.id }, b1.id, blocks)).toBeUndefined();
    // 挂着 #1 拖到 #2 ⇒ 改挂。
    expect(anchorForDrop({ ...file, anchorBlockId: b1.id }, b2.id, blocks)).toBe(b2.id);
    // 别的项目的块 ⇒ 不挂（文件只能挂在自己项目的块上）。
    expect(anchorForDrop(file, elsewhere.id, blocks)).toBeUndefined();
  });
});
