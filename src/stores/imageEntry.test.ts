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
    // 图文混排（Ocean 2026-10-08）：每张图是正文里的一行，排在打的字后面。
    const lines = `两版界面\n![](spool-image:img-${b!.id}-0)\n![](spool-image:img-${b!.id}-1)`;
    expect((await listBlocksByThread(threadId)).map((x) => x.content)).toEqual([lines]);
    expect(store().byThread[threadId]!.map((x) => x.content)).toEqual([lines]);
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
    // 没有字，只有那张图的那一行（注释等双击 ⌥ 之后在卡片上写）。
    expect(r!.block.content).toBe(`![](spool-image:img-${r!.block.id}-0)`);
    expect(r!.images).toHaveLength(1);

    rust.fail = true;
    await expect(ingestImageCapture({ kind: 'paths', paths: ['/Users/me/Desktop/Screenshot.png'] }, null)).rejects.toThrow(
      'unsupported',
    );
    expect((await listBlocksByThread(threadId)).map((x) => x.id)).toEqual([r!.block.id]);
  });

  // P7 验收第一轮（图文混排）：直接往库里放两行图（字节随便），看图跟着块走时正文那几行对不对。
  const putImages = (blockId: string, ids: string[]): void => {
    ids.forEach((id, i) =>
      sqlite
        .prepare(
          `INSERT INTO block_images (id, block_id, position, bytes, format, width, height, size_bytes, created_at)
           VALUES (?, ?, ?, x'00', 'png', 4, 3, 1, 1)`,
        )
        .run(id, blockId, i),
    );
  };

  it('复制到别的项目：复制品的图换了新 id，正文里那几行跟着指向新的', async () => {
    const b = (await store().append({ threadId, content: '左右对比\n![旧版](spool-image:i1)\n![](spool-image:i2)' }))!;
    putImages(b.id, ['i1', 'i2']);
    const ws = await createWorkspace('W2');
    const other = (await createThread(ws.id, '别处')).id;
    const [pair] = await store().forwardToThread([b.id], other);
    const copied = (await listBlocksByThread(other)).find((x) => x.id === pair!.copyId)!;
    const rows = sqlite
      .prepare('SELECT id FROM block_images WHERE block_id = ? ORDER BY position')
      .all(copied.id) as { id: string }[];
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id)).not.toContain('i1');
    expect(copied.content).toBe(`左右对比\n![旧版](spool-image:${rows[0]!.id})\n![](spool-image:${rows[1]!.id})`);
    // 原块一个字没动。
    expect((await listBlocksByThread(threadId))[0]!.content).toBe(b.content);
  });

  it('编辑面板里删掉的图（× 再按完成）：出库、出 store，别的图留着', async () => {
    const b = (await store().append({ threadId, content: '![](spool-image:i1)\n![](spool-image:i2)' }))!;
    putImages(b.id, ['i1', 'i2']);
    await store().load(threadId);
    expect(store().imagesByBlock[b.id]!.map((i) => i.id)).toEqual(['i1', 'i2']);
    await store().removeImages(b.id, ['i1']);
    expect(store().imagesByBlock[b.id]!.map((i) => i.id)).toEqual(['i2']);
    expect(sqlite.prepare('SELECT id FROM block_images').all()).toEqual([{ id: 'i2' }]);
    await store().removeImages(b.id, ['i2']);
    expect(store().imagesByBlock[b.id]).toBeUndefined();
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
