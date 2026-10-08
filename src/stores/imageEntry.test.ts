import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BlockImage } from '@/lib/db/blockImages';
import { listBlocksByThread } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread, setCaptureTarget } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { ingestImageCapture } from '@/lib/capture/ingest';
import { isImagePath } from '@/lib/images/blockImageIo';
import { clear as clearUndoLog } from '@/lib/undo/undoLog';
import { useBlocksStore } from './blocksStore';
import { useDraftStore } from './draftStore';
import { useUndoStore } from './undoStore';

// P7-7 — the parts of 「图片从哪儿进来」 that run without a Mac under them. The bytes themselves
// are Rust's (`images.rs`, tested there); here the Rust calls are stand-ins, and what is checked
// is what the library holds afterwards. Real-finger checks: task book §6 item 5.

const rust = vi.hoisted(() => ({
  fail: false,
  calls: [] as string[],
}));
vi.mock('@/lib/images/blockImageIo', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/images/blockImageIo')>();
  const meta = (blockId: string, n: number): BlockImage => ({
    id: `img-${blockId}-${n}`, blockId, position: n, format: 'png', width: 1240, height: 800, sizeBytes: 9, createdAt: 1,
  });
  return {
    ...real,
    addImageBytes: async (blockId: string) => {
      rust.calls.push('bytes');
      if (rust.fail) throw new Error('too_large:30000000');
      return meta(blockId, rust.calls.length - 1);
    },
    addImagesFromPaths: async (blockId: string, paths: string[]) => {
      rust.calls.push('paths');
      return rust.fail
        ? { added: [], errors: paths.map(() => 'unsupported') }
        : { added: paths.map((_, i) => meta(blockId, i)), errors: [] };
    },
    addImageFromClipboard: async (blockId: string) => {
      rust.calls.push('clipboard');
      if (rust.fail) throw new Error('no_image');
      return meta(blockId, 0);
    },
  };
});

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

describe('图片从哪儿进来 (P7-7)', () => {
  let sqlite: Sqlite;
  let threadId = '';
  const store = () => useBlocksStore.getState();

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    clearUndoLog();
    useUndoStore.setState({ entries: [], redoable: null });
    useBlocksStore.setState({ byThread: {}, attachmentsByThread: {}, imagesByBlock: {}, selectedBlockIds: new Set() });
    rust.fail = false;
    rust.calls = [];
    const ws = await createWorkspace('W');
    threadId = (await createThread(ws.id, '截图')).id;
    await setCaptureTarget(threadId);
    await store().load(threadId);
  });
  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('拖进来的：图片（含 HEIC，好告诉他为什么放不进）分出来，别的文件照旧', () => {
    for (const p of ['/a/x.png', '/a/X.JPG', '/a/y.jpeg', '/a/z.gif', '/a/w.webp', '/a/s.tiff', '/a/s.tif', '/a/p.heic'])
      expect(isImagePath(p), p).toBe(true);
    for (const p of ['/a/report.pdf', '/a/notes.docx', '/a/png', '/a/folder', '/a/x.png.zip'])
      expect(isImagePath(p), p).toBe(false);
  });

  it('⭐ 主窗粘贴 / 拖进来好几张：一块新块装着全部，⌘Z 能撤', async () => {
    const b = await store().appendWithImages(threadId, '两版界面', { bytes: [new Uint8Array([1]), new Uint8Array([2])] });
    expect(b).not.toBeNull();
    expect(store().imagesByBlock[b!.id]).toHaveLength(2);
    expect((await listBlocksByThread(threadId)).map((x) => x.content)).toEqual(['两版界面']);
    expect(useUndoStore.getState().entries.map((e) => e.kind)).toEqual(['create']);

    const dropped = await store().appendWithImages(threadId, '', { paths: ['/a/1.png', '/a/2.png', '/a/3.png'] });
    expect(store().imagesByBlock[dropped!.id]).toHaveLength(3);
  });

  it('一张都没放进去、也没有字：不留一块空块（也不进撤销）；有字就留下字', async () => {
    rust.fail = true;
    expect(await store().appendWithImages(threadId, '', { paths: ['/a/p.heic'] })).toBeNull();
    expect(await listBlocksByThread(threadId)).toEqual([]);
    expect(useUndoStore.getState().entries).toEqual([]);

    const kept = await store().appendWithImages(threadId, '这段字留着', { bytes: [new Uint8Array([1])] });
    expect(kept!.content).toBe('这段字留着');
    expect(store().imagesByBlock[kept!.id]).toBeUndefined();
  });

  it('双击 ⌥ 捕图片：块进捕捉项目、没有字；存不进去 ⇒ 块撤掉、把原因抛出来', async () => {
    const r = await ingestImageCapture({ kind: 'clipboard' }, null);
    expect(r!.threadId).toBe(threadId);
    expect(r!.block.content).toBe('');
    expect(r!.images).toHaveLength(1);

    rust.fail = true;
    await expect(ingestImageCapture({ kind: 'paths', paths: ['/Users/me/Desktop/Screenshot.png'] }, null)).rejects.toThrow(
      'unsupported',
    );
    expect((await listBlocksByThread(threadId)).map((x) => x.id)).toEqual([r!.block.id]);
  });

  it('输入框里的图跟着草稿走：切项目不丢，发出去才清', () => {
    const img = { id: 'd1', bytes: new Uint8Array([1]), previewUrl: 'data:image/png;base64,AA==' };
    useDraftStore.getState().addDraftImages(threadId, [img]);
    useDraftStore.getState().addDraftImages('other', [{ ...img, id: 'd2' }]);
    useDraftStore.getState().clearDraft(threadId);
    expect(useDraftStore.getState().images[threadId]).toBeUndefined();
    expect(useDraftStore.getState().images.other).toHaveLength(1);
  });
});
