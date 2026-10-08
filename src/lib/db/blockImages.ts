import { nanoid } from 'nanoid';
import { getDb } from './client';

// P7-6 (Ocean 2026-09-30 §9.2 第 11 条 + 10-07 第 43、44 条) — the images in a block, as the
// webview sees them: everything but the bytes. Storing, previewing and opening an image is Rust
// (`src-tauri/src/images.rs`); this side only lists them and carries them through what happens
// to their block — deleted (and undone), merged, moved, copied.
//
// ⚠️ The bytes never ride a query parameter or a result here: tauri-plugin-sql moves values as
// JSON, so a BLOB would arrive as an array of numbers and could not be bound back at all. They
// stay inside SQL (`INSERT … SELECT`), or cross as hex (`hex()` / `unhex()`) when they must.
// ⚠️ The table's foreign key would cascade, but this connection does not turn
// `PRAGMA foreign_keys` on — every path is written out below, at the bottom, the way P5-3 did
// for files, so a block-removing path added later lands on the same rule.

export type ImageFormat = 'png' | 'jpeg' | 'gif' | 'webp';

export interface BlockImage {
  id: string;
  blockId: string;
  position: number;
  format: ImageFormat;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: number;
}

interface Row {
  id: string;
  block_id: string;
  position: number;
  format: ImageFormat;
  width: number;
  height: number;
  size_bytes: number;
  created_at: number;
}

const fromRow = (r: Row): BlockImage => ({
  id: r.id,
  blockId: r.block_id,
  position: r.position,
  format: r.format,
  width: r.width,
  height: r.height,
  sizeBytes: r.size_bytes,
  createdAt: r.created_at,
});

const META = 'i.id, i.block_id, i.position, i.format, i.width, i.height, i.size_bytes, i.created_at';

/** Every image in a project, in block order then position. */
export const listBlockImagesByThread = async (threadId: string): Promise<BlockImage[]> => {
  const db = await getDb();
  const rows = await db.select<Row[]>(
    `SELECT ${META} FROM block_images i JOIN blocks b ON b.id = i.block_id
      WHERE b.thread_id = $1 ORDER BY i.block_id, i.position`,
    [threadId],
  );
  return rows.map(fromRow);
};

export const listBlockImagesOf = async (blockIds: string[]): Promise<BlockImage[]> => {
  if (blockIds.length === 0) return [];
  const db = await getDb();
  const ph = blockIds.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await db.select<Row[]>(
    `SELECT ${META} FROM block_images i WHERE i.block_id IN (${ph}) ORDER BY i.block_id, i.position`,
    blockIds,
  );
  return rows.map(fromRow);
};

// ---------------------------------------------------------------------------------------
// Deleting a block — and 「⌘Z 把图放回来」.
//
// The rows go out of the library the moment the block does (an image the user deleted is not
// left sitting in the file, where an export would carry it along). Undo puts them back from
// here: a copy kept in this window's memory, keyed by block, like the undo ring itself —
// gone when Spool quits, which is also when the undo ring is gone. `deleteBlock` parks,
// `restoreBlock` unparks, so EVERY path that deletes and later restores a block (delete,
// capture/create undo, forward undo, the duplicates a move removes, …) gets its images back
// without each one carrying them.
// ---------------------------------------------------------------------------------------

interface Parked extends Row {
  hex: string;
}
const parked = new Map<string, Parked[]>();
/** Parked bytes kept at most (oldest go first) — far beyond what ten undo steps can reach. */
const PARK_LIMIT_BYTES = 200 * 1024 * 1024;

const parkedBytes = (): number =>
  [...parked.values()].flat().reduce((n, r) => n + r.size_bytes, 0);

/** Called by `deleteBlock` before the block row goes. */
export const parkImagesOf = async (blockId: string): Promise<void> => {
  const db = await getDb();
  const rows = await db.select<Parked[]>(
    `SELECT ${META}, hex(i.bytes) AS hex FROM block_images i WHERE i.block_id = $1 ORDER BY i.position`,
    [blockId],
  );
  if (rows.length === 0) return;
  parked.delete(blockId);
  parked.set(blockId, rows);
  while (parked.size > 1 && parkedBytes() > PARK_LIMIT_BYTES) {
    parked.delete(parked.keys().next().value as string);
  }
  await db.execute('DELETE FROM block_images WHERE block_id = $1', [blockId]);
};

/** Called by `restoreBlock` after the block row is back. */
export const unparkImagesOf = async (blockId: string): Promise<void> => {
  const rows = parked.get(blockId);
  if (!rows) return;
  parked.delete(blockId);
  const db = await getDb();
  for (const r of rows) {
    await db.execute(
      `INSERT OR IGNORE INTO block_images (id, block_id, position, bytes, format, width, height,
                                           size_bytes, created_at)
       VALUES ($1, $2, $3, unhex($4), $5, $6, $7, $8, $9)`,
      [r.id, r.block_id, r.position, r.hex, r.format, r.width, r.height, r.size_bytes, r.created_at],
    );
  }
};

/** Test-only: what is parked, by block. */
export const __parkedForTest = (): Map<string, Parked[]> => parked;

// ---------------------------------------------------------------------------------------
// Merging, copying.
// ---------------------------------------------------------------------------------------

/** Where an image was before a merge moved it — enough for undo to put it back. */
export interface ImagePlace {
  id: string;
  blockId: string;
  position: number;
}

/** Merge: the images of the blocks merged away go onto the survivor, after its own, in the
 *  order the blocks are given. Returns where each was, for undo. */
export const moveImagesOnto = async (fromIds: string[], toId: string): Promise<ImagePlace[]> => {
  const moving = await listBlockImagesOf(fromIds);
  if (moving.length === 0) return [];
  const db = await getDb();
  const next = await db.select<{ n: number }[]>(
    'SELECT COALESCE(MAX(position), -1) + 1 AS n FROM block_images WHERE block_id = $1',
    [toId],
  );
  let pos = next[0]?.n ?? 0;
  const order = new Map(fromIds.map((id, i) => [id, i]));
  moving.sort((a, b) => order.get(a.blockId)! - order.get(b.blockId)! || a.position - b.position);
  for (const img of moving) {
    await db.execute('UPDATE block_images SET block_id = $1, position = $2 WHERE id = $3', [toId, pos, img.id]);
    pos += 1;
  }
  return moving.map((m) => ({ id: m.id, blockId: m.blockId, position: m.position }));
};

/** Undo of a merge: each image back on its own block, in its own place. */
export const restoreImagePlaces = async (places: ImagePlace[]): Promise<void> => {
  const db = await getDb();
  for (const p of places) {
    await db.execute('UPDATE block_images SET block_id = $1, position = $2 WHERE id = $3', [
      p.blockId,
      p.position,
      p.id,
    ]);
  }
};

/** Copy to another project: the copy gets its own rows (new ids, same bytes, same order) —
 *  copied inside SQL, so not a byte crosses into this process. */
export const copyImages = async (fromId: string, toId: string): Promise<void> => {
  const db = await getDb();
  for (const img of await listBlockImagesOf([fromId])) {
    await db.execute(
      `INSERT INTO block_images (id, block_id, position, bytes, format, width, height, size_bytes, created_at)
       SELECT $1, $2, position, bytes, format, width, height, size_bytes, created_at
         FROM block_images WHERE id = $3`,
      [nanoid(), toId, img.id],
    );
  }
};
