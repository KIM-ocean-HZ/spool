// Moving a whole library between machines — DESIGN_LIBRARY_TRANSFER.
//
// Export is one VACUUM INTO (in transfer.rs). Import is a MERGE, not a replacement:
// Ocean 2026-08-17 「我选择合并……未来……可以做打包文件互传到对方 spool 的操作，
// 所以合并可以留后路」. Merging into the empty library of a freshly installed machine
// IS the "moved to a new machine" case, so one mechanism covers both (§0).

import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import { uniqueTitle } from '@/lib/names/uniqueTitle';
import { CURRENT_SCHEMA_VERSION, getDb, migrateStagedImport } from './client';

// ⚠️ Parents first. There is no transaction around any of this — tauri-plugin-sql's sqlx
// pool cannot hold BEGIN/COMMIT across statements (threads.ts:204 documents the same
// constraint, and it is also why the imported rows are read out and re-inserted rather
// than ATTACHed: ATTACH binds to one pooled connection too). So a merge that dies halfway
// must leave something coherent behind, which it does as long as a parent is never
// inserted after its children: what survives is a prefix, and every child in it has its
// parent. Re-running the same import finishes the job — every insert below is keyed by id
// and ignores what is already there.
const MERGE_TABLES = [
  'workspaces',
  'threads',
  'blocks',
  // v32 (P7-2): the images go with the library — Ocean 2026-10-07 chose to keep them inside
  // the library file for exactly this. After `blocks`, their parent.
  'block_images',
  'attachments',
  'follow_up_items',
  'proposal_batches',
  'proposals',
] as const;

export type MergeTable = (typeof MERGE_TABLES)[number];

// Exported so a test can pin the ordering above, which nothing else would notice breaking.
export const MERGE_TABLES_FOR_TEST: readonly string[] = MERGE_TABLES;

export type MergeReport = {
  added: Record<MergeTable, number>;
  /** Rows whose id was already here — i.e. this file had been imported before. */
  skipped: number;
  /** Every `attachments.target` the import carried, for the missing-file count (§3.4). */
  attachmentTargets: string[];
};

// P7-2: the columns that hold bytes. tauri-plugin-sql hands a BLOB back as a JSON array of
// numbers and binds anything that is not a string or a number as JSON text — copied the
// generic way, an image would land as the TEXT "[137,80,78,…]" and the test (node:sqlite,
// which does pass bytes) would stay green. So these cross as hex, `hex()` out and `unhex()`
// in, and one row per statement: a library full of screenshots must not become one IPC
// message several hundred megabytes long.
const BLOB_COLUMNS: Partial<Record<MergeTable, readonly string[]>> = { block_images: ['bytes'] };

// v33 (P9-2): what a file's two new columns say is about the computer they were written on —
// a macOS bookmark only resolves there, and 「跟到了新位置 / 用户确认过丢了」 is about a path on
// that disk. Carried to another machine, a bookmark that will not resolve would read as 「删掉了」
// for a file that may well be sitting right there. So they stay behind and land NULL here; the
// identity is recorded again the first time this machine sees the file in place (P9-3).
// (`target_identity` is also a BLOB, which this path could not carry intact anyway.)
// v36 (P9Y-c): the size and time of the file a text was extracted from are about that computer's file
// too — left behind, the next look compares the file's modified time with when it was extracted.
const LOCAL_ONLY_COLUMNS: Partial<Record<MergeTable, readonly string[]>> = {
  attachments: ['target_identity', 'target_notice', 'extracted_size', 'extracted_mtime'],
};

const emptyAdded = (): Record<MergeTable, number> =>
  Object.fromEntries(MERGE_TABLES.map((t) => [t, 0])) as Record<MergeTable, number>;

type Row = Record<string, unknown>;

const columnsOf = async (db: Database, table: string): Promise<string[]> => {
  const info = await db.select<{ name: string }[]>(`PRAGMA table_info(${table})`);
  return info.map((c) => c.name);
};

// SQLite's default parameter ceiling is 999. Chunking by parameters rather than by rows
// keeps a wide table (blocks) from overflowing it while a narrow one still moves in
// useful batches — this loop is the difference between one IPC round-trip per row and
// one per hundred rows, which is what a library with thousands of blocks needs.
const rowsPerStatement = (columnCount: number): number =>
  Math.max(1, Math.floor(900 / Math.max(1, columnCount)));

// P9-1: the column that says what a row sits beside — the level a name must be unique on.
const LEVEL_COLUMN = { workspaces: 'parent_id', threads: 'workspace_id' } as const;

/**
 * P9-1 (Ocean 2026-10-10 第 54、62、65 条): a workspace or project arriving from another
 * library takes 「 2」 when one beside it here already has its name — the same rule as a
 * rename in the app, applied silently (the user imported, they did not name anything).
 *
 * Only rows that will actually go in and are alive: an id already here is skipped by the
 * insert and keeps the name it has here; a deleted row competes with nothing until an undo
 * brings it back, and that undo checks then. Arriving rows are checked against each other
 * too, in the order they come.
 */
const renameOnArrival = async (
  target: Database,
  table: keyof typeof LEVEL_COLUMN,
  rows: Row[],
): Promise<void> => {
  const level = LEVEL_COLUMN[table];
  const here = await target.select<
    { id: string; level: string | null; title: string; deleted_at: number | null }[]
  >(`SELECT id, ${level} AS level, title, deleted_at FROM ${table}`);
  const ids = new Set(here.map((r) => r.id));
  // Keyed by the level's id; '' for a workspace at the top (ids are never empty).
  const taken = new Map<string, string[]>();
  const take = (at: unknown, title: string): void => {
    const key = at == null ? '' : String(at);
    taken.set(key, [...(taken.get(key) ?? []), title]);
  };
  for (const r of here) if (r.deleted_at == null) take(r.level, r.title);
  for (const row of rows) {
    if (ids.has(String(row.id)) || row.deleted_at != null) continue;
    const at = row[level];
    row.title = uniqueTitle(String(row.title ?? ''), taken.get(at == null ? '' : String(at)) ?? []);
    take(at, row.title as string);
  }
};

/**
 * Copy every row this build knows about from `source` into `target`, keeping whatever
 * `target` already has.
 *
 * ⚠️ Both databases must already be at the same schema version — the caller migrates the
 * import first (§2.2).
 */
export const mergeLibrary = async (source: Database, target: Database): Promise<MergeReport> => {
  const added = emptyAdded();
  let skipped = 0;
  let attachmentTargets: string[] = [];

  // §3.3: `is_capture_target` is unique across the WHOLE library, so two libraries each
  // holding one produce two. Whether the imported flag may survive depends on the answer
  // BEFORE anything is inserted.
  //
  // ⚠️ Only rows that are still alive count, on both sides. Deleting a project does not
  // clear its flag — the real library holds a soft-deleted thread that still carries one
  // (found by rehearsing this merge against a copy of it). Counting those would let a
  // deleted row win the flag and knock out the project the user actually captures into.
  const liveTargets = await target.select<{ c: number }[]>(
    'SELECT COUNT(*) AS c FROM threads WHERE is_capture_target = 1 AND deleted_at IS NULL',
  );
  let captureTargetTaken = (liveTargets[0]?.c ?? 0) > 0;

  for (const table of MERGE_TABLES) {
    const targetCols = await columnsOf(target, table);
    const sourceCols = new Set(await columnsOf(source, table));
    const cols = targetCols.filter(
      (c) => sourceCols.has(c) && !LOCAL_ONLY_COLUMNS[table]?.includes(c),
    );
    if (cols.length === 0) continue;

    const quoted = cols.join(', ');
    const blobCols = BLOB_COLUMNS[table];
    if (blobCols) {
      const outCols = cols.map((c) => (blobCols.includes(c) ? `hex(${c}) AS ${c}` : c)).join(', ');
      const slots = cols.map((c, i) => (blobCols.includes(c) ? `unhex($${i + 1})` : `$${i + 1}`));
      const ids = await source.select<{ id: string }[]>(`SELECT id FROM ${table}`);
      for (const { id } of ids) {
        const [row] = await source.select<Row[]>(`SELECT ${outCols} FROM ${table} WHERE id = $1`, [id]);
        if (!row) continue;
        const result = await target.execute(
          `INSERT OR IGNORE INTO ${table} (${quoted}) VALUES (${slots.join(', ')})`,
          cols.map((c) => row[c] ?? null),
        );
        added[table] += result.rowsAffected;
        skipped += 1 - result.rowsAffected;
      }
      continue;
    }

    const rows = await source.select<Row[]>(`SELECT ${quoted} FROM ${table}`);
    if (rows.length === 0) continue;

    if (table === 'workspaces' || table === 'threads') await renameOnArrival(target, table, rows);
    if (table === 'threads') {
      for (const row of rows) {
        if (row.is_capture_target !== 1) continue;
        if (captureTargetTaken || row.deleted_at != null) row.is_capture_target = 0;
        else captureTargetTaken = true;
      }
    }
    if (table === 'attachments') {
      attachmentTargets = [
        ...new Set(rows.map((r) => String(r.target ?? '')).filter((p) => p.length > 0)),
      ];
    }

    const perStatement = rowsPerStatement(cols.length);
    for (let i = 0; i < rows.length; i += perStatement) {
      const chunk = rows.slice(i, i + perStatement);
      const params: unknown[] = [];
      const tuples = chunk.map((row) => {
        const slots = cols.map((c) => {
          params.push(row[c] ?? null);
          return `$${params.length}`;
        });
        return `(${slots.join(', ')})`;
      });
      // OR IGNORE, never OR REPLACE: an id that is already here means this file was
      // imported before, and letting an incoming file rewrite rows on this machine is
      // replacement sneaking back in through the door merge was chosen to close (§3.1).
      const result = await target.execute(
        `INSERT OR IGNORE INTO ${table} (${quoted}) VALUES ${tuples.join(', ')}`,
        params,
      );
      added[table] += result.rowsAffected;
      skipped += chunk.length - result.rowsAffected;
    }
  }

  return { added, skipped, attachmentTargets };
};

export type ImportOutcome = MergeReport & {
  /** Attachment targets that do not exist on this machine (§3.4). */
  missingFiles: number;
};

/**
 * The three ways an import fails that the user can actually act on. Carried as a code
 * rather than a sentence so the UI writes the copy — a raw error string from Rust reaches
 * an English user in Chinese (the pack host has the same rule: log the error, show a
 * translated line).
 */
export type ImportFailure = 'same-library' | 'not-a-library' | 'too-new';

export class ImportError extends Error {
  constructor(
    readonly code: ImportFailure,
    /** Only for 'too-new': what version the incoming file is. */
    readonly version = 0,
  ) {
    super(code);
  }
}

const STAGED_URL = 'sqlite:spool.import-staging.db';

/**
 * The whole import: stage the user's file, bring it up to this build's schema, merge it,
 * then throw the staged copy away.
 */
export const importLibraryFrom = async (path: string): Promise<ImportOutcome> => {
  // Importing the open library would merge it into itself: every id collides and the
  // report says "nothing arrived" for a reason the user cannot see. transfer.rs refuses
  // this too (and does it properly, via canonicalized paths); catching the ordinary case
  // here is what makes the explanation translatable.
  const { appConfigDir, join } = await import('@tauri-apps/api/path');
  if (path === (await join(await appConfigDir(), 'spool.db'))) {
    throw new ImportError('same-library');
  }

  await invoke<void>('stage_import_db', { source: path });

  let staged: Database | null = null;
  try {
    staged = await Database.load(STAGED_URL);

    // A file that has no `threads` table is not a Spool library. Without this check it
    // would fall into migrateSchema's fresh-install branch, get an empty schema built into
    // it, and merge cleanly as zero rows — telling the user "imported 0 projects" when the
    // truth is "that is not a library".
    const shape = await staged.select<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'threads'",
    );
    if (shape.length === 0) {
      throw new ImportError('not-a-library');
    }

    const versions = await staged.select<{ user_version: number }[]>('PRAGMA user_version');
    const version = versions[0]?.user_version ?? 0;
    if (version > CURRENT_SCHEMA_VERSION) {
      // Not a broken file — an out-of-date app. Saying which side is behind is the
      // difference between the user updating Spool and the user thinking their library is
      // corrupt (backlog §1.1 flagged exactly this wording).
      throw new ImportError('too-new', version);
    }

    await migrateStagedImport(staged);

    const report = await mergeLibrary(staged, await getDb());
    const missingFiles = report.attachmentTargets.length
      ? await invoke<number>('count_missing_targets', { paths: report.attachmentTargets })
      : 0;
    return { ...report, missingFiles };
  } finally {
    // ⚠️⚠️ close(path), NEVER close(). tauri-plugin-sql's `close` takes an OPTIONAL db name
    // and treats "not given" as EVERY pool — including sqlite:spool.db, the live library.
    // It reads like a method on this instance; it is a global. Calling it bare left the app
    // with a closed pool and every later query failing with "attempted to acquire a
    // connection on a closed pool", which surfaces as 「数据库初始化失败」 on next load.
    if (staged) await staged.close(staged.path);
    await invoke<void>('discard_import_staging');
  }
};

/** Write the whole library to `dest`. Returns the file's size in bytes. */
export const exportLibraryTo = (dest: string): Promise<number> =>
  invoke<number>('export_library', { dest });
