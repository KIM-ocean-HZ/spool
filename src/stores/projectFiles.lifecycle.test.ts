import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAttachment, setAttachmentAnchor, type Attachment } from '@/lib/db/attachments';
import { computeMergedFields, createBlock, deleteBlock, getBlockById, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { clear as clearUndoLog } from '@/lib/undo/undoLog';
import { useBlocksStore } from './blocksStore';
import { askBeforeDeletingBlocks, useDeleteFilesPromptStore } from './deleteFilesPromptStore';
import { buildCaptureUndo, useUndoStore } from './undoStore';

// P5-3 (Ocean 2026-10-03 #1、#3) — what happens to a file hung off a block when that block is
// deleted, moved, merged, and when each of those is undone. ⚠️ Real SQLite (`node:sqlite` + the
// real schema.sql): every assertion is on what is in the table, not on which function ran.

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

describe('挂着文件的块：删、移、合并、撤销 (P5-3)', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let targetId = '';
  let b1: Block;
  let b2: Block;
  let b3: Block;
  let fileA: Attachment;
  let fileB: Attachment;

  /** Where a file is now: which project, which block — or null when it is gone. */
  const where = (id: string) =>
    (sqlite.prepare('SELECT thread_id, anchor_block_id FROM attachments WHERE id = ?').get(id) as
      | { thread_id: string; anchor_block_id: string | null }
      | undefined) ?? null;
  const fullRow = (id: string) => sqlite.prepare('SELECT * FROM attachments WHERE id = ?').get(id);
  const store = () => useBlocksStore.getState();
  const undo = () => useUndoStore.getState().undo();
  const redo = () => useUndoStore.getState().redo();

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    clearUndoLog();
    useUndoStore.setState({ entries: [], redoable: null });
    useBlocksStore.setState({ byThread: {}, attachmentsByThread: {}, selectedBlockIds: new Set() });
    useDeleteFilesPromptStore.setState({ files: [], resolve: null });

    const ws = await createWorkspace('W');
    threadId = (await createThread(ws.id, '申请规划')).id;
    targetId = (await createThread(ws.id, '文书')).id;
    b1 = await createBlock({ threadId, content: '第一块' });
    b2 = await createBlock({ threadId, content: '第二块' });
    b3 = await createBlock({ threadId, content: '第三块' });
    fileA = await createAttachment({ threadId, kind: 'file', target: '/Users/a/方案.pdf', label: '方案.pdf' });
    fileB = await createAttachment({ threadId, kind: 'file', target: '/Users/a/推荐信.docx', label: '推荐信.docx' });
    sqlite
      .prepare("UPDATE attachments SET extracted_text = '正文', extraction_kind = 'plaintext', ai_access = 1 WHERE id = ?")
      .run(fileA.id);
    await setAttachmentAnchor(fileA.id, b1.id);
    await store().load(threadId);
    await store().load(targetId);
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  // ---- 1. 用户亲手删块 ----

  it('删块选「留在项目里」：文件改成挂在项目；⌘Z 块回来、文件挂回原块；重做再放回项目', async () => {
    await store().remove(b1.id, { removeFiles: false });
    expect(await getBlockById(b1.id)).toBeNull();
    expect(where(fileA.id)).toEqual({ thread_id: threadId, anchor_block_id: null });
    expect(store().attachmentsByThread[threadId]?.find((a) => a.id === fileA.id)?.anchorBlockId).toBeNull();

    await undo();
    expect(await getBlockById(b1.id)).not.toBeNull();
    expect(where(fileA.id)).toEqual({ thread_id: threadId, anchor_block_id: b1.id });

    await redo();
    expect(await getBlockById(b1.id)).toBeNull();
    expect(where(fileA.id)).toEqual({ thread_id: threadId, anchor_block_id: null });
  });

  it('删块选「一起从项目里去掉」：文件那一行没了；⌘Z 原样回来（挂回原块、AI 可读照旧）；重做再去掉', async () => {
    const before = fullRow(fileA.id);
    await store().remove(b1.id, { removeFiles: true });
    expect(where(fileA.id)).toBeNull();
    expect(store().attachmentsByThread[threadId]?.some((a) => a.id === fileA.id)).toBe(false);
    // 只去掉挂在这一块上的：挂在项目上的那个不动。
    expect(where(fileB.id)).toEqual({ thread_id: threadId, anchor_block_id: null });

    await undo();
    expect(fullRow(fileA.id)).toEqual(before);

    await redo();
    expect(where(fileA.id)).toBeNull();
  });

  it('没挂文件的块照旧直接删，不问', async () => {
    expect(await askBeforeDeletingBlocks([b2.id])).toEqual({ removeFiles: false });
    expect(useDeleteFilesPromptStore.getState().files).toEqual([]);
  });

  it('挂着文件就先问；选了什么就照什么删，退出来就什么都不删', async () => {
    await setAttachmentAnchor(fileB.id, b2.id);
    const asked = askBeforeDeletingBlocks([b1.id, b2.id, b3.id]);
    await new Promise((r) => setTimeout(r, 0));
    expect(useDeleteFilesPromptStore.getState().files.map((f) => f.id).sort()).toEqual(
      [fileA.id, fileB.id].sort(),
    );
    useDeleteFilesPromptStore.getState().answer('remove');
    expect(await asked).toEqual({ removeFiles: true });

    const backedOut = askBeforeDeletingBlocks([b1.id]);
    await new Promise((r) => setTimeout(r, 0));
    useDeleteFilesPromptStore.getState().answer(null);
    expect(await backedOut).toBeNull();
  });

  it('多选批量删：一个选择管全部；⌘Z 一块一块往回撤，文件各自挂回', async () => {
    await setAttachmentAnchor(fileB.id, b2.id);
    for (const id of [b1.id, b2.id]) await store().remove(id, { removeFiles: false });
    expect(where(fileA.id)?.anchor_block_id).toBeNull();
    expect(where(fileB.id)?.anchor_block_id).toBeNull();

    await undo(); // 最后删的是 #2
    expect(where(fileB.id)?.anchor_block_id).toBe(b2.id);
    expect(where(fileA.id)?.anchor_block_id).toBeNull();
    await undo();
    expect(where(fileA.id)?.anchor_block_id).toBe(b1.id);
  });

  // ---- 2. 不是用户亲手删的路径：一律回到项目上 ----

  it('撤销一次捕捉删掉的那一块：挂着的文件回到项目上', async () => {
    useUndoStore.getState().pushUndo(buildCaptureUndo({ blockId: b1.id, threadId, content: b1.content }));
    await undo();
    expect(await getBlockById(b1.id)).toBeNull();
    expect(where(fileA.id)).toEqual({ thread_id: threadId, anchor_block_id: null });
  });

  it('捕捉卡改投（浮窗先删再建）这一类直接删块的路径：文件回到项目上', async () => {
    await deleteBlock(b1.id);
    expect(where(fileA.id)).toEqual({ thread_id: threadId, anchor_block_id: null });
  });

  // ---- 3. 移到别的项目：跟着块走 ----

  it('移块：文件跟着到新项目、还挂在那一块；⌘Z 跟着回来；重做再过去', async () => {
    const pairs = await store().forwardToThread([b1.id], targetId);
    await store().moveForwarded({ fromThreadId: threadId, toThreadId: targetId, pairs, deleteIds: [] });
    expect((await getBlockById(b1.id))?.threadId).toBe(targetId);
    expect(where(fileA.id)).toEqual({ thread_id: targetId, anchor_block_id: b1.id });
    // 挂在项目上的那个不跟着走。
    expect(where(fileB.id)).toEqual({ thread_id: threadId, anchor_block_id: null });
    expect(store().attachmentsByThread[targetId]?.map((a) => a.id)).toEqual([fileA.id]);

    await undo();
    expect((await getBlockById(b1.id))?.threadId).toBe(threadId);
    expect(where(fileA.id)).toEqual({ thread_id: threadId, anchor_block_id: b1.id });

    await redo();
    expect(where(fileA.id)).toEqual({ thread_id: targetId, anchor_block_id: b1.id });
  });

  it('移块时查重删掉的那一块：文件回到原项目上；⌘Z 块回来、文件挂回去', async () => {
    const pairs = await store().forwardToThread([b2.id], targetId);
    await store().moveForwarded({ fromThreadId: threadId, toThreadId: targetId, pairs, deleteIds: [b1.id] });
    expect(await getBlockById(b1.id)).toBeNull();
    expect(where(fileA.id)).toEqual({ thread_id: threadId, anchor_block_id: null });

    await undo();
    expect(await getBlockById(b1.id)).not.toBeNull();
    expect(where(fileA.id)).toEqual({ thread_id: threadId, anchor_block_id: b1.id });
  });

  // ---- 4. 合并 ----

  it('合并：被并掉的块上的文件改挂到留下的那一块；⌘Z 挂回原来那一块；重做再挂过去', async () => {
    // ⚠️ The file has to sit on the block that is merged AWAY, or nothing would move.
    const { survivorId, nonSurvivorIds } = computeMergedFields([b1, b2]);
    const goner = nonSurvivorIds[0]!;
    await setAttachmentAnchor(fileA.id, goner);
    await store().load(threadId);

    await store().mergeBlocks([b1.id, b2.id]);
    expect(await getBlockById(goner)).toBeNull();
    expect(where(fileA.id)).toEqual({ thread_id: threadId, anchor_block_id: survivorId });

    await undo();
    expect(await getBlockById(goner)).not.toBeNull();
    expect(where(fileA.id)).toEqual({ thread_id: threadId, anchor_block_id: goner });

    await redo();
    expect(where(fileA.id)).toEqual({ thread_id: threadId, anchor_block_id: survivorId });
  });
});
