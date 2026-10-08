import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __parkedForTest, listBlockImagesByThread } from '@/lib/db/blockImages';
import { computeMergedFields, createBlock, getBlockById, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { clear as clearUndoLog } from '@/lib/undo/undoLog';
import { useBlocksStore } from './blocksStore';
import { buildCaptureUndo, useUndoStore } from './undoStore';

// P7-6 (Ocean 2026-10-07 #5、#6) — a block's images go wherever the block goes: deleted (and
// back on ⌘Z), merged, moved, copied. ⚠️ Real SQLite, and an adapter that treats bytes the way
// tauri-plugin-sql 2.4 does (a BLOB comes back as an array of numbers; anything that is not a
// string or a number is bound as JSON text) — so a path that let the bytes through a query
// parameter would corrupt them here exactly as it would in the app. Images are written
// straight into the table, standing in for the Rust side (`images.rs`).

const { DatabaseSync } = createRequire(import.meta.url)(
  'node:sqlite',
) as typeof import('node:sqlite');
type Sqlite = InstanceType<typeof DatabaseSync>;
type SqlValue = string | number | bigint | null | Uint8Array;
const toNumbered = (sql: string): string => sql.replace(/\$(\d+)/g, '?$1');
const asPluginSql = (handle: Sqlite): Database => {
  const bind = (params: unknown[]): SqlValue[] =>
    params.map((v) =>
      v == null || typeof v === 'string' || typeof v === 'number' ? (v as SqlValue) : JSON.stringify(v),
    );
  const out = (row: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v instanceof Uint8Array ? Array.from(v) : v]));
  return {
    execute: async (sql: string, params: unknown[] = []) => {
      const r = handle.prepare(toNumbered(sql)).run(...bind(params));
      return { rowsAffected: Number(r.changes), lastInsertId: Number(r.lastInsertRowid) };
    },
    select: async (sql: string, params: unknown[] = []) =>
      (handle.prepare(toNumbered(sql)).all(...bind(params)) as Record<string, unknown>[]).map(out),
  } as unknown as Database;
};

describe('块里的图片跟着块走 (P7-6)', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let otherId = '';
  let b1: Block;
  let b2: Block;

  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0x10, 0x7f]);
  const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02, 0xff, 0xd9]);
  const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x3b]);
  /** What `images.rs::insert_images` writes. */
  const putImage = (id: string, blockId: string, position: number, bytes: Uint8Array, format = 'png') =>
    sqlite
      .prepare(
        `INSERT INTO block_images (id, block_id, position, bytes, format, width, height, size_bytes, created_at)
         VALUES (?, ?, ?, ?, ?, 40, 30, ?, 1)`,
      )
      .run(id, blockId, position, bytes, format, bytes.length);
  /** block → [image id, hex of bytes] in order, straight from the table. */
  const imagesOf = (blockId: string) =>
    (
      sqlite
        .prepare('SELECT id, hex(bytes) AS h, typeof(bytes) AS t FROM block_images WHERE block_id = ? ORDER BY position')
        .all(blockId) as { id: string; h: string; t: string }[]
    ).map((r) => [r.id, r.t === 'blob' ? r.h : `NOT A BLOB: ${r.t}`]);
  const hex = (b: Uint8Array) => Buffer.from(b).toString('hex').toUpperCase();
  const store = () => useBlocksStore.getState();
  const undo = () => useUndoStore.getState().undo();
  const redo = () => useUndoStore.getState().redo();

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(asPluginSql(sqlite));
    clearUndoLog();
    __parkedForTest().clear();
    useUndoStore.setState({ entries: [], redoable: null });
    useBlocksStore.setState({ byThread: {}, attachmentsByThread: {}, imagesByBlock: {}, selectedBlockIds: new Set() });
    const ws = await createWorkspace('W');
    threadId = (await createThread(ws.id, '截图')).id;
    otherId = (await createThread(ws.id, '别处')).id;
    b1 = await createBlock({ threadId, content: '第一块，两张图' });
    b2 = await createBlock({ threadId, content: '第二块，一张图' });
    putImage('i1', b1.id, 0, PNG);
    putImage('i2', b1.id, 1, JPG, 'jpeg');
    putImage('i3', b2.id, 0, GIF, 'gif');
    await store().load(threadId);
  });
  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('读：按块、按顺序，没有字节；store 里每块一份', async () => {
    const list = await listBlockImagesByThread(threadId);
    const of = (b: Block) => list.filter((i) => i.blockId === b.id).map((i) => [i.id, i.position, i.format]);
    expect(of(b1)).toEqual([['i1', 0, 'png'], ['i2', 1, 'jpeg']]);
    expect(of(b2)).toEqual([['i3', 0, 'gif']]);
    expect(list[0]).not.toHaveProperty('bytes');
    expect(store().imagesByBlock[b1.id]!.map((i) => i.id)).toEqual(['i1', 'i2']);
    expect(store().imagesByBlock[b2.id]!.map((i) => i.id)).toEqual(['i3']);
  });

  it('⭐ 删块：图片行跟着走；⌘Z 原样回来（字节一个不差、顺序照旧）；重做再走；再撤销再回来', async () => {
    await store().remove(b1.id, { removeFiles: false });
    expect(imagesOf(b1.id)).toEqual([]);

    await undo();
    expect(await getBlockById(b1.id)).not.toBeNull();
    expect(imagesOf(b1.id)).toEqual([['i1', hex(PNG)], ['i2', hex(JPG)]]);

    await redo();
    expect(imagesOf(b1.id)).toEqual([]);
    await undo();
    expect(imagesOf(b1.id)).toEqual([['i1', hex(PNG)], ['i2', hex(JPG)]]);
  });

  it('撤销一次捕捉（别的删块路径）：块和图一起走；重做一起回来', async () => {
    useUndoStore.getState().pushUndo(buildCaptureUndo({ blockId: b2.id, threadId, content: b2.content }));
    await undo();
    expect(await getBlockById(b2.id)).toBeNull();
    expect(imagesOf(b2.id)).toEqual([]);
    await redo();
    expect(imagesOf(b2.id)).toEqual([['i3', hex(GIF)]]);
  });

  it('⭐ 合并：被并掉那块的图挪到留下那块、排在它自己的后面；⌘Z 各回各的位置；重做再挪过去', async () => {
    const { survivorId, nonSurvivorIds } = computeMergedFields([b1, b2]);
    const goner = nonSurvivorIds[0]!;
    const before = { [b1.id]: imagesOf(b1.id), [b2.id]: imagesOf(b2.id) };

    await store().mergeBlocks([b1.id, b2.id]);
    expect(imagesOf(survivorId)).toEqual([...before[survivorId]!, ...before[goner]!]);
    expect(imagesOf(goner)).toEqual([]);

    await undo();
    expect(imagesOf(b1.id)).toEqual(before[b1.id]);
    expect(imagesOf(b2.id)).toEqual(before[b2.id]);

    await redo();
    expect(imagesOf(survivorId)).toEqual([...before[survivorId]!, ...before[goner]!]);
  });

  it('移块：图跟着块到新项目；⌘Z 跟着回来', async () => {
    const [pair] = await store().forwardToThread([b1.id], otherId);
    await store().moveForwarded({ fromThreadId: threadId, toThreadId: otherId, pairs: [pair!], deleteIds: [] });
    expect((await listBlockImagesByThread(otherId)).map((i) => i.id)).toEqual(['i1', 'i2']);
    expect(imagesOf(b1.id)).toEqual([['i1', hex(PNG)], ['i2', hex(JPG)]]);
    await undo();
    expect((await getBlockById(b1.id))!.threadId).toBe(threadId);
    expect((await listBlockImagesByThread(threadId)).filter((i) => i.blockId === b1.id).map((i) => i.id)).toEqual([
      'i1',
      'i2',
    ]);
  });

  it('⭐ 复制到别的项目：复制品有自己的一份（新 id、同样的字节、同样的顺序），原块不动；⌘Z 撤掉复制品连图一起', async () => {
    const [pair] = await store().forwardToThread([b1.id], otherId);
    const copied = imagesOf(pair!.copyId);
    expect(copied.map((r) => r[1])).toEqual([hex(PNG), hex(JPG)]);
    expect(copied.map((r) => r[0])).not.toContain('i1');
    expect(imagesOf(b1.id)).toEqual([['i1', hex(PNG)], ['i2', hex(JPG)]]);
    expect(store().imagesByBlock[pair!.copyId]).toHaveLength(2);

    await undo();
    expect(imagesOf(pair!.copyId)).toEqual([]);
    expect(imagesOf(b1.id)).toHaveLength(2);
  });
});
