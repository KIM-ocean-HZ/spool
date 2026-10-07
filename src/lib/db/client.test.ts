import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  drainMigrationNotices,
  __migrateSchemaForTest,
  __insertDemoProjectForTest,
  __retranslateDemoProjectForTest,
  __seedTutorialThreadForTest,
  __setTestDb,
  retranslateTutorial,
} from './client';
import schemaSql from './schema.sql?raw';
import { listAttachmentsByThread } from './attachments';

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

const applySchema = (handle: Sqlite): void => {
  handle.exec(schemaSql.replace(/--.*$/gm, ''));
};

const userVersion = (handle: Sqlite): number =>
  Number((handle.prepare('PRAGMA user_version').get() as { user_version: number }).user_version);

// Blocks as an older step left them: the columns added by v13 and v14 come off, because a
// database that starts below v12 walks all the way to the head in one pass and picks them
// up on the way. Each is asserted in its own step's test.
const blocksSansV13 = (handle: Sqlite): Record<string, unknown>[] =>
  (handle.prepare('SELECT * FROM blocks').all() as Record<string, unknown>[]).map((r) => {
    const { stale_at, ref_kind, annotation_by, ...rest } = r;
    void stale_at;
    void ref_kind;
    void annotation_by;
    return stripV32(stripV29(stripV28(stripGist(stripCompression(stripProvenance(stripCorrectedQuote(rest)))))));
  });

// v20's three columns, off a `blocks` row. Same job as stripBriefSuggestion below: a test
// that rewinds under v20 and compares the table across the migration back up must allow
// exactly the columns v20 legitimately added, and nothing else.
const stripProvenance = (r: Record<string, unknown>): Record<string, unknown> => {
  const { source_url, retrieved_at, recheck_after, ...rest } = r;
  void source_url;
  void retrieved_at;
  void recheck_after;
  return rest;
};

// v21's one column, off a `blocks` (or `proposals`) row — same job, one step later.
const stripCorrectedQuote = (r: Record<string, unknown>): Record<string, unknown> => {
  const { corrected_quote, ...rest } = r;
  void corrected_quote;
  return rest;
};

// v24's two columns, off a `blocks` row — same job again. ⚠️ 一个从 v13 以下起步的库会
// 一路走到头，路上把 v24 这两列也捡起来；那一步自己有一条测试盯着「两列全空」。
const stripCompression = (r: Record<string, unknown>): Record<string, unknown> => {
  const { original_content, compressed_at, ...rest } = r;
  void original_content;
  void compressed_at;
  return rest;
};

// v26's one column, off a `blocks` (or `proposals`) row — same job, two steps later.
const stripGist = (r: Record<string, unknown>): Record<string, unknown> => {
  const { gist, ...rest } = r;
  void gist;
  return rest;
};

// v28's columns, same job again. ⚠️ `gist_by` is on `blocks` only — a queued proposal's
// gist has exactly one author (the AI that proposed it), so there was nothing to record.
const stripV28 = (r: Record<string, unknown>): Record<string, unknown> => {
  const { ref_note, gist_by, ...rest } = r;
  void ref_note;
  void gist_by;
  return rest;
};

// v29's one column, off a `blocks` row — same job again. ⚠️ `proposals` 没有这一列：
// 待审的提案从来没有被审过（`schema.sql` v29 那一段写了理由）。
const stripV29 = (r: Record<string, unknown>): Record<string, unknown> => {
  const { ref_reviewed_stale_at, ...rest } = r;
  void ref_reviewed_stale_at;
  return rest;
};

// v30's four columns, off an `attachments` row — same job as the strips above, one table over.
const V30_ATTACHMENT_COLS = ['anchor_block_id', 'added_by', 'superseded_by', 'superseded_at'];
const stripV30 = (r: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(r).filter(([k]) => !V30_ATTACHMENT_COLS.includes(k)));

const V31_FILE_PROPOSAL_COLS = [
  'id',
  'kind',
  'client',
  'thread_id',
  'path',
  'size_bytes',
  'anchor_block_id',
  'supersedes_id',
  'why',
  'created_at',
  'expires_at',
];

const V32_BLOCK_IMAGE_COLS = [
  'id',
  'block_id',
  'position',
  'bytes',
  'format',
  'width',
  'height',
  'size_bytes',
  'created_at',
];
// v32's two columns, off a `blocks` / `supersede_proposals` row.
const stripV32 = (r: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(r).filter(([k]) => k !== 'replaced_by_block_id' && k !== 'suggested_kind'),
  );

// …and the text those two ADD COLUMNs append to their tables' CREATE statements.
const sansV32Sql = (r: { name: string; sql: string | null }) => ({
  name: r.name,
  sql: r.sql?.replace(/, replaced_by_block_id TEXT|, suggested_kind TEXT/g, '') ?? null,
});

// v19's three columns, off a `threads` row — the same job blocksSansV13 does for blocks:
// a test that rewinds below v19 compares rows across a migration that legitimately added
// them, and only these three may differ.
const stripBriefSuggestion = (r: Record<string, unknown>): Record<string, unknown> => {
  const {
    follow_up_brief_suggested,
    follow_up_brief_suggested_by,
    follow_up_brief_suggested_at,
    ...rest
  } = r;
  void follow_up_brief_suggested;
  void follow_up_brief_suggested_by;
  void follow_up_brief_suggested_at;
  return rest;
};

const columnNames = (handle: Sqlite, table: string): string[] =>
  (handle.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((r) => r.name);

// Rewind past v13: blocks had no way to say a conclusion had stopped holding.
const downgradeToV12 = (handle: Sqlite): void => {
  downgradeToV13(handle);
  handle.exec(`
    ALTER TABLE blocks DROP COLUMN stale_at;
    ALTER TABLE blocks DROP COLUMN ref_kind;
    PRAGMA user_version = 12;
  `);
};

// Rewind past v14: nothing recorded WHO wrote an annotation, and a proposal could not carry
// the correction relation it wanted the approved block to have.
const downgradeToV13 = (handle: Sqlite): void => {
  downgradeToV14(handle);
  handle.exec(`
    ALTER TABLE blocks DROP COLUMN annotation_by;
    ALTER TABLE proposals DROP COLUMN ref_kind;
    PRAGMA user_version = 13;
  `);
};

// Rewind past v32: a replacement still sat in the new block's one relation slot, nothing
// recorded which kind an AI had suggested, and a block could not hold an image.
// ⚠️ 这三句就是 v32 的「能回滚」——`add-block-replacement-suggested-kind-and-images` 只加了两个
// 可空列和一张新表，⛔ 一个字的既有数据都没动；退回来丢的只是 v32 以后的取代记在哪、建议的种类和图片。
// ⚠️ 必须先于更老的降级跑：`block_images.block_id` 指着 `blocks`，老的降级会重建 / 丢 `blocks` 的列。
const downgradeToV31 = (handle: Sqlite): void => {
  handle.exec(`
    DROP TABLE IF EXISTS block_images;
    ALTER TABLE blocks DROP COLUMN replaced_by_block_id;
    ALTER TABLE supersede_proposals DROP COLUMN suggested_kind;
    PRAGMA user_version = 31;
  `);
};

// Rewind past v31: an AI had no way to put a path in front of the user.
// ⚠️ 这一句 DROP 就是 v31 的「能回滚」——`add-file-proposals` 只加了一张新表，
// ⛔ 一个字的既有数据都没动，所以退回来丢的只是还没点头的提议。
// ⚠️ 必须先于 downgradeToV29 跑：`file_proposals.supersedes_id` 指着 `attachments`。
const downgradeToV30 = (handle: Sqlite): void => {
  downgradeToV31(handle);
  handle.exec(`
    DROP TABLE IF EXISTS file_proposals;
    PRAGMA user_version = 30;
  `);
};

// Rewind past v30: a project file could not hang off a block, and nothing recorded who added
// it or what replaced it.
// ⚠️ 这四句就是 v30 的「能回滚」——`add-attachment-anchor-and-provenance` 只加了四个可空列，
// ⛔ 一个字的既有数据都没动；退回来丢的只是「挂在哪一块」（全部回到挂在项目）和「谁加的」。
// ⚠️ 必须先于 downgradeToV14 跑：那一步要丢 `thread_id`、加回老的 `block_id`。
const downgradeToV29 = (handle: Sqlite): void => {
  downgradeToV30(handle);
  handle.exec(`
    ALTER TABLE attachments DROP COLUMN anchor_block_id;
    ALTER TABLE attachments DROP COLUMN added_by;
    ALTER TABLE attachments DROP COLUMN superseded_by;
    ALTER TABLE attachments DROP COLUMN superseded_at;
    PRAGMA user_version = 29;
  `);
};

// Rewind past v29: nothing remembered that a citation had been reviewed, and 「谁引用了我」
// 是一次全表扫描。
// ⚠️ 这两句就是 v29 的「能回滚」——`add-ref-reviewed-and-ref-block-index` 只加了一个可空列
// 和一个索引，⛔ 一个字的既有数据都没动；退回来丢的只是「审过没有」，
// 也就是那几条边重新进一次待审队列。
//
// ⚠️⚠️ **索引必须先于列被丢掉。** 更老的降级路径（`downgradeToV2` 和两个测试里的内联
// DROP）要丢 `ref_block_id`，而 SQLite 不许丢一个还有索引指着的列 ——
// 报的是 `error in index idx_blocks_ref_block after drop column`。
// ⭐ `downgradeToV8` 里 `DROP INDEX idx_blocks_thread_seq` 先于 `DROP COLUMN seq` 是同一条。
const downgradeToV28 = (handle: Sqlite): void => {
  downgradeToV29(handle);
  handle.exec(`
    DROP INDEX IF EXISTS idx_blocks_ref_block;
    ALTER TABLE blocks DROP COLUMN ref_reviewed_stale_at;
    PRAGMA user_version = 28;
  `);
};

// Rewind past v28: a citation could not say WHY, and nothing recorded who wrote a gist.
// ⚠️ 这三句 DROP 就是 v28 的「能回滚」——`add-ref-note-and-gist-by` 只加了三个可空列，
// ⛔ 一个字的既有数据都没动。
const downgradeToV27 = (handle: Sqlite): void => {
  downgradeToV28(handle);
  handle.exec(`
    ALTER TABLE blocks DROP COLUMN ref_note;
    ALTER TABLE blocks DROP COLUMN gist_by;
    ALTER TABLE proposals DROP COLUMN ref_note;
    PRAGMA user_version = 27;
  `);
};

// Rewind past v27: no project remembered where the reader had got to.
// ⚠️ 这一句 DROP 就是 v27 的「能回滚」——`add-read-positions` 只加了一张新表，
// ⛔ 一个字的既有数据都没动，所以退回来最多是下次打开项目落回底部（v26 本来的行为）。
const downgradeToV26 = (handle: Sqlite): void => {
  downgradeToV27(handle);
  handle.exec(`
    DROP TABLE IF EXISTS read_positions;
    PRAGMA user_version = 26;
  `);
};

// Rewind past v26: a block had no one-line「这块整体是什么」for a search hit to show.
// ⚠️ 这两句 DROP 就是 v26 的「能回滚」——`add-block-gist` 只加了两个可空列，
// ⛔ 一个字的既有数据都没动。
const downgradeToV25 = (handle: Sqlite): void => {
  downgradeToV26(handle);
  handle.exec(`
    ALTER TABLE blocks DROP COLUMN gist;
    ALTER TABLE proposals DROP COLUMN gist;
    PRAGMA user_version = 25;
  `);
};

// Rewind past v25: an AI had no way to put「这一块被整条取代了」in front of the user.
// ⚠️ 这一句 DROP 就是 v25 的「能回滚」——`add-supersede-proposals` 只加了一张新表，
// ⛔ 一个字的既有数据都没动，所以退回来什么都不丢。
const downgradeToV24 = (handle: Sqlite): void => {
  downgradeToV25(handle);
  handle.exec(`
    DROP TABLE IF EXISTS supersede_proposals;
    PRAGMA user_version = 24;
  `);
};

// Rewind past v24: a block carried no memory of what it said before an AI shortened it.
// ⚠️ 这两句 DROP 就是 v24 的「能回滚」——`add-block-original-content` 只加了两个空列。
const downgradeToV23 = (handle: Sqlite): void => {
  downgradeToV24(handle);
  handle.exec(`
    ALTER TABLE blocks DROP COLUMN original_content;
    ALTER TABLE blocks DROP COLUMN compressed_at;
    PRAGMA user_version = 23;
  `);
};

// Rewind past v23: workspaces were flat — a workspace could not sit inside another one.
const downgradeToV22 = (handle: Sqlite): void => {
  downgradeToV23(handle);
  handle.exec(`
    ALTER TABLE workspaces DROP COLUMN parent_id;
    PRAGMA user_version = 22;
  `);
};

// Rewind past v22: what a project followed up was one blob of text on the project row, with
// no way to point at a single line of it.
const downgradeToV21 = (handle: Sqlite): void => {
  downgradeToV22(handle);
  handle.exec(`
    DROP INDEX IF EXISTS idx_follow_up_items_thread;
    DROP TABLE IF EXISTS follow_up_items;
    PRAGMA user_version = 21;
  `);
};

// Rewind past v21: a correction could name the block it corrected but not the sentence.
const downgradeToV20 = (handle: Sqlite): void => {
  downgradeToV21(handle);
  handle.exec(`
    ALTER TABLE blocks DROP COLUMN corrected_quote;
    ALTER TABLE proposals DROP COLUMN corrected_quote;
    PRAGMA user_version = 20;
  `);
};

// Rewind past v20: nothing recorded where a block came from outside the library, or when it
// stops being safe to trust.
const downgradeToV19 = (handle: Sqlite): void => {
  downgradeToV20(handle);
  handle.exec(`
    ALTER TABLE blocks DROP COLUMN source_url;
    ALTER TABLE blocks DROP COLUMN retrieved_at;
    ALTER TABLE blocks DROP COLUMN recheck_after;
    ALTER TABLE proposals DROP COLUMN source_url;
    ALTER TABLE proposals DROP COLUMN retrieved_at;
    ALTER TABLE proposals DROP COLUMN recheck_after;
    PRAGMA user_version = 19;
  `);
};

// Rewind past v19: a project had nowhere to park an AI's proposed rewrite of its brief.
const downgradeToV18 = (handle: Sqlite): void => {
  downgradeToV19(handle);
  handle.exec(`
    ALTER TABLE threads DROP COLUMN follow_up_brief_suggested;
    ALTER TABLE threads DROP COLUMN follow_up_brief_suggested_by;
    ALTER TABLE threads DROP COLUMN follow_up_brief_suggested_at;
    PRAGMA user_version = 18;
  `);
};

// Rewind past v18: an AI had no way to ask for a file, so nothing queued one.
const downgradeToV17 = (handle: Sqlite): void => {
  downgradeToV18(handle);
  handle.exec(`
    DROP INDEX IF EXISTS idx_file_access_requests;
    DROP TABLE IF EXISTS file_access_requests;
    PRAGMA user_version = 17;
  `);
};

// Rewind past v17: nothing could be told to stop reminding.
const downgradeToV16 = (handle: Sqlite): void => {
  downgradeToV17(handle);
  handle.exec(`
    DROP TABLE IF EXISTS date_dismissals;
    PRAGMA user_version = 16;
  `);
};

// Rewind past v16: nothing recorded when a summary was written.
const downgradeToV15 = (handle: Sqlite): void => {
  downgradeToV16(handle);
  handle.exec(`
    ALTER TABLE threads DROP COLUMN summary_at;
    PRAGMA user_version = 15;
  `);
};

// Rewind past v15: an attachment hung off ONE BLOCK, there was no ai_access, and the `url`
// kind still existed. ⚠️ This is the only downgrade in the file that has to put a column
// BACK — every step before v15 was additive, so its inverse was a DROP. It also has to
// leave block_id nullable: SQLite cannot add a NOT NULL column to a table with rows, and a
// test that seeds attachments before rewinding would fail on the real constraint.
const downgradeToV14 = (handle: Sqlite): void => {
  downgradeToV15(handle);
  handle.exec(`
    DROP INDEX IF EXISTS idx_attachments_thread;
    ALTER TABLE attachments ADD COLUMN block_id TEXT REFERENCES blocks(id) ON DELETE CASCADE;
    ALTER TABLE attachments DROP COLUMN thread_id;
    ALTER TABLE attachments DROP COLUMN ai_access;
    CREATE INDEX IF NOT EXISTS idx_attachments_block ON attachments(block_id, created_at ASC);
    PRAGMA user_version = 14;
  `);
};

// Rewind past v12: no engine-run record, and threads had no auto-maintain opt-out.
const downgradeToV11 = (handle: Sqlite): void => {
  downgradeToV12(handle);
  handle.exec(`
    DROP INDEX IF EXISTS idx_engine_runs_thread;
    DROP INDEX IF EXISTS idx_engine_runs_time;
    DROP TABLE IF EXISTS engine_runs;
    ALTER TABLE threads DROP COLUMN auto_maintain;
    PRAGMA user_version = 11;
  `);
};

// Rewind past v11: threads had no follow-up brief yet.
const downgradeToV10 = (handle: Sqlite): void => {
  downgradeToV11(handle);
  handle.exec(`
    ALTER TABLE threads DROP COLUMN follow_up_brief;
    ALTER TABLE threads DROP COLUMN follow_up_state;
    PRAGMA user_version = 10;
  `);
};

// Rewind past v10: the review queue's two tables did not exist yet.
const downgradeToV9 = (handle: Sqlite): void => {
  downgradeToV10(handle);
  handle.exec(`
    DROP TABLE IF EXISTS proposals;
    DROP TABLE IF EXISTS proposal_batches;
    PRAGMA user_version = 9;
  `);
};

// Rewind past v9: blocks lose `seq` and its uniqueness guard, and the attachment
// full-text index disappears with its three triggers. Every test that starts below v9
// applies this first, so the v8→v9 step is genuinely exercised rather than skipped by
// its own idempotence guards.
const downgradeToV8 = (handle: Sqlite): void => {
  downgradeToV9(handle);
  handle.exec(`
    DROP TRIGGER IF EXISTS attachments_ai;
    DROP TRIGGER IF EXISTS attachments_ad;
    DROP TRIGGER IF EXISTS attachments_au;
    DROP TABLE IF EXISTS attachments_fts;
    DROP INDEX IF EXISTS idx_blocks_thread_seq;
    ALTER TABLE blocks DROP COLUMN seq;
    PRAGMA user_version = 8;
  `);
};

// Rewind a current-schema database to the historical v2 shape: threads regain the
// rolled-back progress/next_step columns and lose summary_source (v5→6); blocks lose
// ref_block_id (v6→7); attachments lose all four extraction-era columns (v3→4 added
// three, v4→5 added include_in_pack).
const downgradeToV2 = (handle: Sqlite): void => {
  downgradeToV8(handle);
  handle.exec(`
    ALTER TABLE threads ADD COLUMN progress INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE threads ADD COLUMN next_step TEXT;
    ALTER TABLE threads DROP COLUMN summary_source;
    ALTER TABLE blocks DROP COLUMN ref_block_id;
    ALTER TABLE attachments DROP COLUMN extracted_text;
    ALTER TABLE attachments DROP COLUMN extracted_at;
    ALTER TABLE attachments DROP COLUMN extraction_kind;
    ALTER TABLE attachments DROP COLUMN include_in_pack;
    PRAGMA user_version = 2;
  `);
};

const NOW = 1700000000000;

// Workspace / thread / block, in the shape every version of the schema has had. The
// attachment is seeded separately, because v15 is where its owner column changed and a test
// has to say which side of that line it is standing on.
const seedUserData = (handle: Sqlite): void => {
  handle.exec(`
    INSERT INTO workspaces (id, title, sort_order, created_at, updated_at)
      VALUES ('w1', 'ws', 0, ${NOW}, ${NOW});
    INSERT INTO threads (id, workspace_id, title, created_at, updated_at)
      VALUES ('t1', 'w1', 'thread', ${NOW}, ${NOW});
    INSERT INTO blocks (id, thread_id, content, created_at)
      VALUES ('b1', 't1', 'hello block', ${NOW});
  `);
};

/** Pre-v15: an attachment hung off one block, and `url` was a kind. */
const seedLegacyAttachments = (handle: Sqlite): void => {
  handle.exec(`
    INSERT INTO attachments (id, block_id, kind, target, created_at)
      VALUES ('a1', 'b1', 'file', '/tmp/lecture.pdf', ${NOW}),
             ('a2', 'b1', 'url',  'https://example.com', ${NOW});
  `);
};

describe('migrateSchema registry (§19.3)', () => {
  let handle: Sqlite;
  let db: Database;

  beforeEach(() => {
    handle = new DatabaseSync(':memory:');
    db = makeAdapter(handle);
    __setTestDb(db);
    // The notice queue is module state shared by every test in this file — any earlier
    // migration that removed url rows left one behind.
    drainMigrationNotices();
  });

  afterEach(() => {
    __setTestDb(null);
    handle.close();
  });

  it('walks a v2 database through every step to the current version', async () => {
    applySchema(handle);
    downgradeToV2(handle);
    seedUserData(handle);
    seedLegacyAttachments(handle);

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    const threadCols = columnNames(handle, 'threads');
    expect(threadCols).not.toContain('progress');
    expect(threadCols).not.toContain('next_step');
    expect(threadCols).toContain('summary_source');
    expect(columnNames(handle, 'blocks')).toContain('ref_block_id');
    // The old if-chain stamped a v2 database straight to 5 without these columns —
    // the sequential walk must add all four attachment columns.
    const attCols = columnNames(handle, 'attachments');
    for (const c of ['extracted_text', 'extracted_at', 'extraction_kind', 'include_in_pack']) {
      expect(attCols).toContain(c);
    }
    // User data survives.
    expect(handle.prepare('SELECT content FROM blocks').all()).toEqual([
      { content: 'hello block' },
    ]);
    // v15: the file survives the walk and inherits its old block's project.
    expect(handle.prepare('SELECT target, thread_id FROM attachments').all()).toEqual([
      { target: '/tmp/lecture.pdf', thread_id: 't1' },
    ]);
  });

  it('resumes from a mid-chain checkpoint (v4 onward)', async () => {
    applySchema(handle);
    downgradeToV8(handle);
    handle.exec(`
      ALTER TABLE attachments DROP COLUMN include_in_pack;
      ALTER TABLE threads DROP COLUMN summary_source;
      ALTER TABLE blocks DROP COLUMN ref_block_id;
      PRAGMA user_version = 4;
    `);
    seedUserData(handle);

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(columnNames(handle, 'attachments')).toContain('include_in_pack');
    expect(columnNames(handle, 'threads')).toContain('summary_source');
    expect(columnNames(handle, 'blocks')).toContain('ref_block_id');
    expect(handle.prepare('SELECT COUNT(*) AS c FROM blocks').get()).toEqual({ c: 1 });
  });

  it('v5 → v6 adds summary_source and keeps an existing summary (provenance NULL)', async () => {
    applySchema(handle);
    downgradeToV8(handle);
    handle.exec(`
      ALTER TABLE threads DROP COLUMN summary_source;
      ALTER TABLE blocks DROP COLUMN ref_block_id;
      PRAGMA user_version = 5;
    `);
    seedUserData(handle);
    handle.exec("UPDATE threads SET summary = '既有摘要' WHERE id = 't1'");

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(handle.prepare('SELECT summary, summary_source FROM threads').get()).toEqual({
      summary: '既有摘要',
      summary_source: null,
    });
  });

  it('v6 → v7 adds blocks.ref_block_id (NULL) and keeps user data', async () => {
    applySchema(handle);
    downgradeToV8(handle);
    handle.exec(`
      ALTER TABLE blocks DROP COLUMN ref_block_id;
      PRAGMA user_version = 6;
    `);
    seedUserData(handle);

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(handle.prepare('SELECT content, ref_block_id FROM blocks').get()).toEqual({
      content: 'hello block',
      ref_block_id: null,
    });
  });

  it('v7 → v8 normalizes legacy agent-slug MCP source labels only', async () => {
    applySchema(handle);
    downgradeToV8(handle);
    handle.exec('PRAGMA user_version = 7');
    seedUserData(handle);
    handle.exec(`
      INSERT INTO blocks (id, thread_id, content, source, created_at) VALUES
        ('m1', 't1', 'x', 'local-agent-mode-spool · MCP', 1),
        ('m2', 't1', 'x', 'local-agent-mode-2 · MCP — lecture.pdf', 2),
        ('m3', 't1', 'x', 'Claude · MCP', 3),
        ('m4', 't1', 'x', 'Safari', 4);
    `);

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    const rows = handle
      .prepare("SELECT id, source FROM blocks WHERE id LIKE 'm%' ORDER BY id")
      .all() as { id: string; source: string }[];
    expect(rows.map((r) => r.source)).toEqual([
      'Claude · MCP',
      'Claude · MCP — lecture.pdf',
      'Claude · MCP',
      'Safari',
    ]);
  });

  it('v8 → v9 numbers existing blocks per thread in pack order', async () => {
    applySchema(handle);
    downgradeToV8(handle);
    seedUserData(handle);
    // Deliberately inserted out of chronological order, and split across two threads:
    // the backfill must number by created_at (rowid breaking a tie), per thread, so the
    // number a user sees matches the position the block has always had in the pack.
    handle.exec(`
      INSERT INTO threads (id, workspace_id, title, created_at, updated_at)
        VALUES ('t2', 'w1', 'other', 1, 1);
      INSERT INTO blocks (id, thread_id, content, created_at) VALUES
        ('s3', 't1', 'third',  1700000000300),
        ('s1', 't1', 'first',  1700000000100),
        ('s2', 't1', 'second', 1700000000200),
        ('o1', 't2', 'other thread', 1700000000900);
    `);

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    // b1 (from seedUserData) is the oldest in t1, so it takes #1.
    expect(
      handle.prepare("SELECT id, seq FROM blocks WHERE thread_id = 't1' ORDER BY seq").all(),
    ).toEqual([
      { id: 'b1', seq: 1 },
      { id: 's1', seq: 2 },
      { id: 's2', seq: 3 },
      { id: 's3', seq: 4 },
    ]);
    // Numbering restarts per project — the other thread's only block is its #1.
    expect(handle.prepare("SELECT seq FROM blocks WHERE id = 'o1'").get()).toEqual({ seq: 1 });
  });

  it('v8 → v9 indexes text already extracted out of attachments', async () => {
    applySchema(handle);
    downgradeToV8(handle);
    seedUserData(handle);
    seedLegacyAttachments(handle);
    handle.exec(`
      UPDATE attachments SET extracted_text = '验证曲线告诉你模型是欠拟合还是过拟合'
       WHERE id = 'a1';
    `);

    await __migrateSchemaForTest(db);

    // The sentence lives only in the attachment, never in any block's own text — before
    // v9 it was unfindable.
    const hits = handle
      .prepare("SELECT rowid FROM attachments_fts WHERE attachments_fts MATCH '验证曲线'")
      .all();
    expect(hits).toHaveLength(1);
    // And the triggers keep it current afterwards, which is the part a one-off rebuild
    // would not give us.
    handle.exec("UPDATE attachments SET extracted_text = '学习率与批大小' WHERE id = 'a1'");
    expect(
      handle
        .prepare("SELECT rowid FROM attachments_fts WHERE attachments_fts MATCH '验证曲线'")
        .all(),
    ).toHaveLength(0);
    expect(
      handle
        .prepare("SELECT rowid FROM attachments_fts WHERE attachments_fts MATCH '学习率'")
        .all(),
    ).toHaveLength(1);
  });

  it('v9 → v10 adds the review queue and touches nothing else', async () => {
    applySchema(handle);
    downgradeToV9(handle);
    seedUserData(handle);
    const blocksBefore = handle.prepare('SELECT * FROM blocks').all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    for (const table of ['proposal_batches', 'proposals']) {
      expect(
        handle
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?1")
          .all(table),
      ).toHaveLength(1);
    }
    // The queue arrives empty — a migration is not a place to invent user-facing state.
    expect(handle.prepare('SELECT COUNT(*) AS c FROM proposals').get()).toEqual({ c: 0 });
    // And nothing about the library moved: this step is two CREATE TABLEs, and a row of
    // the user's that came out different would mean it is not.
    expect(blocksSansV13(handle)).toEqual(blocksBefore);
  });

  it('v10 → v11 adds the follow-up brief columns and turns nothing on', async () => {
    applySchema(handle);
    downgradeToV10(handle);
    seedUserData(handle);
    const threadsBefore = handle.prepare('SELECT * FROM threads').all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    const cols = columnNames(handle, 'threads');
    expect(cols).toContain('follow_up_brief');
    expect(cols).toContain('follow_up_state');
    // DESIGN_FOLLOW_UP §3.2: a NULL brief IS the off switch, so every existing project
    // comes out of this migration with follow-up off. A migration that silently armed a
    // feature that goes out to the open web would be the worst possible default.
    const rows = handle.prepare('SELECT follow_up_brief, follow_up_state FROM threads').all();
    expect(rows).toEqual([{ follow_up_brief: null, follow_up_state: null }]);
    // Nothing else about the row moved.
    expect(
      // auto_maintain and summary_at come off too: a v10 database walks 10→…→16 in one
      // pass, so the later columns are present by the time this runs. Each is its own
      // step's business, asserted there.
      (handle.prepare('SELECT * FROM threads').all() as Record<string, unknown>[]).map((r) => {
        const { follow_up_brief, follow_up_state, auto_maintain, summary_at, ...rest } =
          stripBriefSuggestion(r);
        void follow_up_brief;
        void follow_up_state;
        void auto_maintain;
        void summary_at;
        return rest;
      }),
    ).toEqual(threadsBefore);
  });

  it('v11 → v12 adds the engine-run record and touches nothing else', async () => {
    applySchema(handle);
    downgradeToV11(handle);
    seedUserData(handle);
    const blocksBefore = handle.prepare('SELECT * FROM blocks').all();
    const threadsBefore = handle.prepare('SELECT * FROM threads').all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    // The column the whole table exists for (DESIGN_WORKBENCH §1.1: the AI's prose had
    // nowhere to live, so it was thrown away and the user was told "没有新增块").
    const cols = columnNames(handle, 'engine_runs');
    expect(cols).toContain('result_text');
    expect(cols).toContain('cost_usd');
    expect(cols).toContain('model');
    // It arrives empty — a migration does not invent history.
    expect(handle.prepare('SELECT COUNT(*) AS c FROM engine_runs').get()).toEqual({ c: 0 });
    // §4.3's per-project opt-out rides along in the same step.
    expect(columnNames(handle, 'threads')).toContain('auto_maintain');
    // ⚠️ NULL on every existing row, and NULL means "follow the master switch" — which is
    // itself off by default. A migration that armed something which spends money on the
    // user's subscription would be the worst possible upgrade.
    expect(handle.prepare('SELECT auto_maintain FROM threads').all()).toEqual([
      { auto_maintain: null },
    ]);
    // Otherwise not a row of the user's library may move: this step is one CREATE TABLE,
    // two indexes and one nullable column.
    expect(blocksSansV13(handle)).toEqual(blocksBefore);
    expect(
      (handle.prepare('SELECT * FROM threads').all() as Record<string, unknown>[]).map((r) => {
        const { auto_maintain, summary_at, ...rest } = stripBriefSuggestion(r);
        void auto_maintain;
        void summary_at;
        return rest;
      }),
    ).toEqual(threadsBefore);
  });

  it('v12 → v13 adds supersession and leaves every block valid', async () => {
    applySchema(handle);
    downgradeToV12(handle);
    seedUserData(handle);
    const blocksBefore = handle.prepare('SELECT * FROM blocks').all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    const cols = columnNames(handle, 'blocks');
    expect(cols).toContain('stale_at');
    expect(cols).toContain('ref_kind');
    // ⚠️ The property this migration lives or dies by (DESIGN_CONTEXT_HYGIENE §3.1): NULL on
    // every existing row means every block the user already had is still valid, and
    // `ref_kind` NULL reads as 'cites' — so a database that walks this step renders exactly
    // the pack it rendered before. Supersession is something the USER declares; a migration
    // that marked anything stale would be deciding for them, on the one axis where a wrong
    // guess takes a correct conclusion out of every future pack.
    expect(handle.prepare('SELECT stale_at, ref_kind FROM blocks').all()).toEqual([
      { stale_at: null, ref_kind: null },
    ]);
    expect(blocksSansV13(handle)).toEqual(blocksBefore);
  });

  it('v13 → v14 records annotation authorship without deciding any existing row', async () => {
    applySchema(handle);
    downgradeToV13(handle);
    seedUserData(handle);
    const blocksBefore = handle.prepare('SELECT * FROM blocks').all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(columnNames(handle, 'blocks')).toContain('annotation_by');
    expect(columnNames(handle, 'proposals')).toContain('ref_kind');
    // ⚠️ The property this step lives or dies by (DESIGN_CONTEXT_HYGIENE §9.3 拍板乙): it
    // writes NO user data. NULL is "unknown", not "the user" — readers resolve it through
    // the block's own source, so a database that walks half this step renders exactly what
    // one that walked none of it renders. A backfill would have been the 2026-05-29 shape:
    // a migration rewriting rows it only guessed at.
    expect(handle.prepare('SELECT annotation_by FROM blocks').all()).toEqual([
      { annotation_by: null },
    ]);
    // Only this step's own column comes off here — a v13 database already had the rest.
    // (v20's three come off too: the walk up from v13 passes through it.)
    expect(
      (handle.prepare('SELECT * FROM blocks').all() as Record<string, unknown>[]).map((r) => {
        const { annotation_by, ...rest } = r;
        void annotation_by;
        return stripV32(stripV29(stripV28(stripGist(stripCompression(stripProvenance(stripCorrectedQuote(rest)))))));
      }),
    ).toEqual(blocksBefore);
  });

  // ⚠️ The only DESTRUCTIVE step in the registry, so it gets the most specific test in this
  // file. Everything above is additive and its worst failure is "the column is missing";
  // this one deletes rows and drops a column, and its worst failure is losing a file.
  it('v14 → v15 moves every file onto its project and retires the url kind', async () => {
    applySchema(handle);
    downgradeToV14(handle);
    seedUserData(handle);
    seedLegacyAttachments(handle);

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    const cols = columnNames(handle, 'attachments');
    expect(cols).toContain('thread_id');
    expect(cols).toContain('ai_access');
    // §5.1 ②: the old ownership is GONE, not left nullable — Ocean chose 全搬, and a column
    // still sitting there would let a later writer quietly re-create block-level files.
    expect(cols).not.toContain('block_id');
    // The file inherits the project of the block it used to hang off; the url row is gone
    // (§5.1 ③ (c), Ocean 2026-08-08).
    expect(handle.prepare('SELECT id, thread_id, kind FROM attachments').all()).toEqual([
      { id: 'a1', thread_id: 't1', kind: 'file' },
    ]);
    // ⚠️ Deleting a user's links silently is the thing §5.1 ③ point 2 forbids. The count
    // rides out to the UI, which says so once.
    expect(drainMigrationNotices()).toEqual([{ kind: 'url-attachments-removed', count: 1 }]);
    // ai_access starts at 0 — no AI has a claim on a file just because it exists (§5.1 ①).
    expect(handle.prepare('SELECT ai_access FROM attachments').all()).toEqual([{ ai_access: 0 }]);
  });

  it('v14 → v15 says nothing when the user had no links to lose', async () => {
    applySchema(handle);
    downgradeToV14(handle);
    seedUserData(handle);
    handle.exec(
      `INSERT INTO attachments (id, block_id, kind, target, created_at)
         VALUES ('a1', 'b1', 'file', '/tmp/only.pdf', ${NOW})`,
    );

    await __migrateSchemaForTest(db);

    // A notice the user cannot act on is noise; the migration only speaks when it removed
    // something. (The real library is this case — it has zero attachment rows.)
    expect(drainMigrationNotices()).toEqual([]);
    expect(handle.prepare('SELECT COUNT(*) AS c FROM attachments').get()).toEqual({ c: 1 });
  });

  // §5-5 (Ocean 2026-08-08): a summary now records when it was written. Purely additive —
  // and the point of the test is that an existing summary keeps a NULL rather than being
  // backfilled with a lie about when it was written.
  it('v15 → v16 adds summary_at and leaves older summaries unstamped', async () => {
    applySchema(handle);
    downgradeToV15(handle);
    seedUserData(handle);
    handle.exec("UPDATE threads SET summary = '旧摘要', summary_source = 'user' WHERE id = 't1'");

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(columnNames(handle, 'threads')).toContain('summary_at');
    expect(handle.prepare('SELECT summary, summary_at FROM threads').all()).toEqual([
      { summary: '旧摘要', summary_at: null },
    ]);
  });

  // 旧账 §5-3. The table holds only what the user silenced — no detected dates, so there is
  // nothing here that can go stale against a block they edit afterwards.
  it('v16 → v17 adds the dismissal table and touches no user data', async () => {
    applySchema(handle);
    downgradeToV16(handle);
    seedUserData(handle);
    const blocksBefore = handle.prepare('SELECT * FROM blocks').all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(columnNames(handle, 'date_dismissals')).toEqual(['block_id', 'due_at', 'created_at']);
    expect(handle.prepare('SELECT COUNT(*) AS c FROM date_dismissals').get()).toEqual({ c: 0 });
    expect(
      (handle.prepare('SELECT * FROM blocks').all() as Record<string, unknown>[]).map(
        (r: Record<string, unknown>) =>
          stripV32(stripV29(stripV28(stripGist(stripCompression(stripProvenance(stripCorrectedQuote(r))))))),
      ),
    ).toEqual(blocksBefore);
  });

  // V1 (WORKPLAN §2.V1). One new table, empty, and — the property that matters for the most
  // expensive table in the library — `blocks` comes out byte-identical. Ocean's rule for this
  // batch was ⛔「别往 blocks 上面加」, and this is the test that would catch it if someone did.
  //
  // ⚠️⚠️ 2026-08-25：这条起点是 v26,所以它现在**一路跑到 v28**,而 v28（`Q1`）是 Ocean
  // 亲自开的那个例外（「认可：加一列,不开新表」）—— `blocks` 上多了 `ref_note` / `gist_by`。
  // ⇒ 这里 `stripV28` 掉的是**那个例外**,⛔ 不是把这条规矩改宽了：`read_positions` 仍然
  // 是一张新表,V1 仍然一列都没往 blocks 上加,而这正是这条测试要钉的东西。
  // ⛔ 下次再有人往 blocks 加列,这里会红 —— 那时候要去重新问 Ocean,不是再加一个 strip。
  it('v26 → v27 adds an empty read_positions and leaves blocks untouched', async () => {
    applySchema(handle);
    downgradeToV26(handle);
    seedUserData(handle);
    const blocksBefore = handle.prepare('SELECT * FROM blocks').all();
    const threadsBefore = handle.prepare('SELECT * FROM threads').all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(columnNames(handle, 'read_positions')).toEqual([
      'thread_id',
      'block_id',
      'last_block_at',
      'updated_at',
    ]);
    // ⚠️ Empty, and no backfill: a project nobody has read yet must not come out of the
    // migration claiming a remembered position — that would land the user mid-thread on the
    // first open after an upgrade, with nothing having been read.
    expect(handle.prepare('SELECT COUNT(*) AS c FROM read_positions').get()).toEqual({ c: 0 });
    expect(
      (handle.prepare('SELECT * FROM blocks').all() as Record<string, unknown>[]).map((r) => stripV32(stripV29(stripV28(r)))),
    ).toEqual(blocksBefore);
    expect(handle.prepare('SELECT * FROM threads').all()).toEqual(threadsBefore);
  });

  // Q1 (WORKPLAN §2.Q1). Three nullable columns, no backfill, existing rows otherwise
  // byte-identical.
  //
  // ⚠️⚠️ `gist_by` NULL is the one that has to stay NULL. It reads as「不知道」, and the
  // reading side treats「不知道」as 'ai' — because between v26 and v27 the ONLY writer of
  // `gist` was add_block. Stamping 'ai' here instead would be writing user data in a
  // migration (the 2026-05-29 class), and stamping 'user' would hand every AI-written gist
  // the protection meant for the user's own.
  it('v27 → v28 adds ref_note / gist_by and backfills neither', async () => {
    applySchema(handle);
    downgradeToV27(handle);
    seedUserData(handle);
    const blocksBefore = handle.prepare('SELECT * FROM blocks').all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(columnNames(handle, 'blocks')).toContain('ref_note');
    expect(columnNames(handle, 'blocks')).toContain('gist_by');
    expect(columnNames(handle, 'proposals')).toContain('ref_note');
    // ⛔ proposals 不要 gist_by —— 待审的摘要只有一种来路。
    expect(columnNames(handle, 'proposals')).not.toContain('gist_by');
    // 三列全 NULL，其余一个字节都没动。
    expect(
      (handle.prepare('SELECT * FROM blocks').all() as Record<string, unknown>[]).map((r) => stripV32(stripV29(stripV28(r)))),
    ).toEqual(blocksBefore);
    expect(
      handle.prepare('SELECT COUNT(*) AS c FROM blocks WHERE ref_note IS NOT NULL').get(),
    ).toEqual({ c: 0 });
    expect(
      handle.prepare('SELECT COUNT(*) AS c FROM blocks WHERE gist_by IS NOT NULL').get(),
    ).toEqual({ c: 0 });
  });

  // F2 §3.2 ④ / §3.3 一 (Ocean 2026-08-30). ⚠️ 这个仓库 2026-05-29 抹过一次库，
  // 所以每一步迁移都要有一条测试盯着「加了什么、**没动**什么」。
  // v29 只加一个可空列和一个索引，⛔ 不回填、⛔ 不重建表。
  it('v28 → v29 adds ref_reviewed_stale_at + the ref_block index, and backfills neither', async () => {
    applySchema(handle);
    downgradeToV28(handle);
    seedUserData(handle);
    const blocksBefore = handle.prepare('SELECT * FROM blocks').all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(columnNames(handle, 'blocks')).toContain('ref_reviewed_stale_at');
    // ⛔ proposals 不要这一列：待审的提案从来没有被审过。
    expect(columnNames(handle, 'proposals')).not.toContain('ref_reviewed_stale_at');
    // §3.3 三：「谁引用了我」是全库反查，没有索引就是全表扫描。
    expect(
      handle
        .prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type='index' AND name='idx_blocks_ref_block'")
        .get(),
    ).toEqual({ c: 1 });
    // 那一列全 NULL，其余一个字节都没动 —— ⛔ 老库的每一条引用都按「没审过」读，
    // 也就是 §3.2 ② 那几条待审边照旧全部出现（v28 的行为）。
    expect(
      (handle.prepare('SELECT * FROM blocks').all() as Record<string, unknown>[]).map((r) => stripV32(stripV29(r))),
    ).toEqual(blocksBefore);
    expect(
      handle
        .prepare('SELECT COUNT(*) AS c FROM blocks WHERE ref_reviewed_stale_at IS NOT NULL')
        .get(),
    ).toEqual({ c: 0 });
  });

  // P5-1 (Ocean 2026-09-30 / 10-03). 四个可空列，⛔ 不回填、⛔ 不重建表：老行读出来就是
  // 「挂在项目、用户加的、没被取代」，其余一个字节都没动（`ai_access` 开着的那一个照旧开着）。
  it('v29 → v30 adds the four attachment columns and backfills none', async () => {
    applySchema(handle);
    downgradeToV29(handle);
    seedUserData(handle);
    // One file the user opened up and one they did not — ⛔ the migration flips neither, and
    // P5-4's new default is only ever written by createAttachment, never onto an existing row.
    handle.exec(
      `INSERT INTO attachments (id, thread_id, kind, target, label, ai_access, created_at)
         VALUES ('a1', 't1', 'file', '/tmp/kept.pdf', 'kept.pdf', 1, ${NOW}),
                ('a2', 't1', 'file', '/tmp/closed.pdf', 'closed.pdf', 0, ${NOW})`,
    );
    const before = handle.prepare('SELECT * FROM attachments ORDER BY id').all();
    const blocksBefore = handle.prepare('SELECT * FROM blocks').all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    const cols = columnNames(handle, 'attachments');
    for (const c of V30_ATTACHMENT_COLS) expect(cols).toContain(c);
    // ⛔ 不叫 block_id —— v15 去掉过一列同名的。
    expect(cols).not.toContain('block_id');
    expect(
      (handle.prepare('SELECT * FROM attachments ORDER BY id').all() as Record<string, unknown>[]).map(stripV30),
    ).toEqual(before);
    const unwritten = { anchor_block_id: null, added_by: null, superseded_by: null, superseded_at: null };
    expect(
      handle
        .prepare('SELECT anchor_block_id, added_by, superseded_by, superseded_at FROM attachments ORDER BY id')
        .all(),
    ).toEqual([unwritten, unwritten]);
    expect(handle.prepare('SELECT * FROM blocks').all().map(stripV32)).toEqual(blocksBefore);
  });

  // ⚠️ 真库的 `attachments` 不是 schema.sql 那个形状：`thread_id` 是 v15 用 ALTER 加的（可空、
  // 没外键、排在列尾）。从 v14 带老 `block_id` 的库一路走上来，正好就是那个形状 —— 用产品自己的
  // 读函数读回来，四个新字段都是「没写过」。
  it('v14 (block-owned files) → v30 reads back through the product reader', async () => {
    applySchema(handle);
    downgradeToV14(handle);
    seedUserData(handle);
    seedLegacyAttachments(handle);

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(columnNames(handle, 'attachments')).not.toContain('block_id');
    const rows = await listAttachmentsByThread('t1');
    expect(rows.map((a) => [a.id, a.anchorBlockId, a.addedBy, a.supersededBy, a.supersededAt])).toEqual([
      ['a1', null, null, null, null],
    ]);
  });

  it('a fresh install builds the four v30 columns straight from schema.sql', () => {
    applySchema(handle);
    const cols = columnNames(handle, 'attachments');
    for (const c of V30_ATTACHMENT_COLS) expect(cols).toContain(c);
  });

  // P6-1 (Ocean 2026-10-06). 只新建一张表，⛔ 已有的表一列不动、一个字节不动：
  // 迁移之后队列是空的 —— 一条没人提过的提议出现在待审面上，就是在替 AI 说话。
  it('v30 → v31 adds an empty file_proposals and leaves every other table byte-identical', async () => {
    applySchema(handle);
    downgradeToV30(handle);
    seedUserData(handle);
    handle.exec(
      `INSERT INTO attachments (id, thread_id, kind, target, label, ai_access, created_at,
                                anchor_block_id, added_by)
         VALUES ('a1', 't1', 'file', '/tmp/kept.pdf', 'kept.pdf', 1, ${NOW}, 'b1', 'user')`,
    );
    const tables = (
      handle
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '%fts%' ORDER BY name")
        .all() as { name: string }[]
    ).map((r) => r.name);
    const before = Object.fromEntries(
      tables.map((t) => [t, handle.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()]),
    );
    const schemaBefore = handle
      .prepare("SELECT name, sql FROM sqlite_master WHERE name NOT LIKE '%file_proposals%' ORDER BY name")
      .all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(columnNames(handle, 'file_proposals')).toEqual(V31_FILE_PROPOSAL_COLS);
    expect(handle.prepare('SELECT COUNT(*) AS c FROM file_proposals').get()).toEqual({ c: 0 });
    expect(
      handle
        .prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type='index' AND name='idx_file_proposals_thread'")
        .get(),
    ).toEqual({ c: 1 });
    for (const t of tables) {
      expect(handle.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all().map(stripV32), t).toEqual(before[t]);
    }
    // 别的表的建表语句一个字没变（⛔ 只许 CREATE TABLE + 它自己的索引）。v32 接着走过去，
    // 它加的那两列和那张表另有一条测试盯着，这里先抹掉。
    expect(
      (
        handle
          .prepare(
            "SELECT name, sql FROM sqlite_master WHERE name NOT LIKE '%file_proposals%' AND name NOT LIKE '%block_images%' ORDER BY name",
          )
          .all() as { name: string; sql: string | null }[]
      ).map(sansV32Sql),
    ).toEqual(schemaBefore);
  });

  it('a fresh install builds file_proposals straight from schema.sql', () => {
    applySchema(handle);
    expect(columnNames(handle, 'file_proposals')).toEqual(V31_FILE_PROPOSAL_COLS);
  });

  // P7-2 (Ocean 2026-10-07). 两句 ADD COLUMN + 一张新表，⛔ 已有的列一个不改、不回填：
  // 迁移之后两列全空（一块没被「新记法」取代过，一条建议都没被说成「更正」），图片表是空的。
  it('v31 → v32 adds two empty columns and an empty block_images, and leaves every row as it was', async () => {
    applySchema(handle);
    downgradeToV31(handle);
    seedUserData(handle);
    handle.exec(`
      INSERT INTO blocks (id, thread_id, content, created_at, seq, stale_at, ref_block_id, ref_kind)
        VALUES ('b2', 't1', 'old', ${NOW}, 2, ${NOW}, NULL, NULL),
               ('b3', 't1', 'new', ${NOW}, 3, NULL, 'b2', 'supersedes');
      INSERT INTO supersede_proposals (id, thread_id, stale_block_id, by_block_id, client, why,
                                       quote_stale, quote_new, created_at, expires_at)
        VALUES ('sp1', 't1', 'b1', 'b3', 'Claude · MCP', 'why', 'hello', 'new', ${NOW}, ${NOW + 1});
    `);
    const tables = (
      handle
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '%fts%' ORDER BY name")
        .all() as { name: string }[]
    ).map((r) => r.name);
    const before = Object.fromEntries(
      tables.map((t) => [t, handle.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()]),
    );
    const untouched = "name NOT IN ('blocks', 'supersede_proposals') AND name NOT LIKE '%block_images%'";
    const schemaBefore = handle
      .prepare(`SELECT name, sql FROM sqlite_master WHERE ${untouched} ORDER BY name`)
      .all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(columnNames(handle, 'blocks')).toContain('replaced_by_block_id');
    expect(columnNames(handle, 'supersede_proposals')).toContain('suggested_kind');
    expect(handle.prepare('SELECT COUNT(*) AS c FROM blocks WHERE replaced_by_block_id IS NOT NULL').get()).toEqual({ c: 0 });
    expect(handle.prepare('SELECT COUNT(*) AS c FROM supersede_proposals WHERE suggested_kind IS NOT NULL').get()).toEqual({ c: 0 });
    expect(columnNames(handle, 'block_images')).toEqual(V32_BLOCK_IMAGE_COLS);
    expect(handle.prepare('SELECT COUNT(*) AS c FROM block_images').get()).toEqual({ c: 0 });
    expect(
      handle
        .prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type='index' AND name='idx_block_images_block'")
        .get(),
    ).toEqual({ c: 1 });
    // 每张表逐行相等（两张加了列的表去掉新列再比）；v32 以前那条 `supersedes` 一个字没动。
    for (const t of tables) {
      expect(handle.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all().map(stripV32), t).toEqual(before[t]);
    }
    // 别的表的建表语句一个字没变（⛔ 只许两句 ADD COLUMN + 一张新表和它的索引）。
    expect(handle.prepare(`SELECT name, sql FROM sqlite_master WHERE ${untouched} ORDER BY name`).all()).toEqual(
      schemaBefore,
    );
  });

  it('a fresh install builds the two v32 columns and block_images straight from schema.sql', () => {
    applySchema(handle);
    expect(columnNames(handle, 'blocks')).toContain('replaced_by_block_id');
    expect(columnNames(handle, 'supersede_proposals')).toContain('suggested_kind');
    expect(columnNames(handle, 'block_images')).toEqual(V32_BLOCK_IMAGE_COLS);
  });

  // DESIGN_PROJECT_FILES §3.4 (phase three). The queue starts empty and grants nothing: a
  // migration that flipped one ai_access would be handing an AI a file the user never
  // agreed to, which is the one thing this whole feature exists to prevent.
  it('v17 → v18 adds the file-request queue and grants nothing', async () => {
    applySchema(handle);
    downgradeToV17(handle);
    seedUserData(handle);
    handle.exec(
      `INSERT INTO attachments (id, thread_id, kind, target, label, created_at)
         VALUES ('a1', 't1', 'file', '/tmp/notes.pdf', 'notes.pdf', ${NOW})`,
    );

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(handle.prepare('SELECT COUNT(*) AS c FROM file_access_requests').get()).toEqual({
      c: 0,
    });
    expect(handle.prepare('SELECT ai_access FROM attachments').all()).toEqual([{ ai_access: 0 }]);
  });

  // 决定 5. Three nullable columns and no backfill: a project that has never been offered a
  // new brief must not come out of the migration looking like it has one waiting.
  it('v18 → v19 parks brief suggestions without inventing any', async () => {
    applySchema(handle);
    downgradeToV18(handle);
    seedUserData(handle);
    handle.exec("UPDATE threads SET follow_up_brief = '盯 CMU 的截止日期' WHERE id = 't1'");

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(
      handle
        .prepare(
          'SELECT follow_up_brief, follow_up_brief_suggested, follow_up_brief_suggested_by, follow_up_brief_suggested_at FROM threads',
        )
        .all(),
    ).toEqual([
      {
        follow_up_brief: '盯 CMU 的截止日期',
        follow_up_brief_suggested: null,
        follow_up_brief_suggested_by: null,
        follow_up_brief_suggested_at: null,
      },
    ]);
  });

  // v22 (DESIGN_FOLLOW_UP §8.7). The one step in M5 that reaches a real library, and the
  // only one in the registry that READS user text and writes rows derived from it — so the
  // property it lives or dies by is that the text it read is still there, untouched,
  // afterwards. Additive only: CREATE TABLE + INSERTs, no UPDATE of threads, no rebuild.
  it('v21 → v22 carries every follow-up line across without touching the original', async () => {
    applySchema(handle);
    downgradeToV21(handle);
    seedUserData(handle);
    handle.exec(
      `UPDATE threads SET follow_up_brief = '1. CMU 的截止日期变没变
2. GRE 还要不要

3. 有没有新的奖学金' WHERE id = 't1'`,
    );
    const threadsBefore = handle.prepare('SELECT * FROM threads').all();
    const blocksBefore = handle.prepare('SELECT * FROM blocks').all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    const items = handle
      .prepare('SELECT text, standing, status, sort_order, why FROM follow_up_items ORDER BY sort_order')
      .all();
    // Every line the user had approved is a STANDING watch — that is what a brief was, and
    // §8.2's marker is what stops an AI from closing one after answering it once.
    expect(items).toEqual([
      { text: 'CMU 的截止日期变没变', standing: 1, status: 'open', sort_order: 0, why: null },
      { text: 'GRE 还要不要', standing: 1, status: 'open', sort_order: 1, why: null },
      { text: '有没有新的奖学金', standing: 1, status: 'open', sort_order: 2, why: null },
    ]);
    // ⚠️ The original text is still exactly where it was. Nothing in the app reads
    // `follow_up_brief` after this step, and it is deliberately not cleared: if the split
    // above is ever wrong, what the user actually approved is still sitting there.
    expect(handle.prepare('SELECT * FROM threads').all()).toEqual(threadsBefore);
    expect(
      (handle.prepare('SELECT * FROM blocks').all() as Record<string, unknown>[]).map(
        (r: Record<string, unknown>) => stripV32(stripV29(stripV28(stripGist(stripCompression(r))))),
      ),
    ).toEqual(blocksBefore);
  });

  it('v21 → v22 leaves a project that never followed anything up with an empty list', async () => {
    applySchema(handle);
    downgradeToV21(handle);
    seedUserData(handle);

    await __migrateSchemaForTest(db);

    // No brief means no rows — not one blank row, and not a project that comes out of the
    // migration looking like it is watching something (§8.7: an empty list is the off
    // switch, and inventing a line here would send a project out to the web unasked).
    expect(handle.prepare('SELECT COUNT(*) AS c FROM follow_up_items').get()).toEqual({ c: 0 });
  });

  // A crash between the CREATE TABLE and the INSERTs leaves user_version at 21, so the whole
  // step runs again on the next launch. Running it twice must not double a line.
  it('v21 → v22 is re-runnable after a half-finished pass', async () => {
    applySchema(handle);
    downgradeToV21(handle);
    seedUserData(handle);
    handle.exec("UPDATE threads SET follow_up_brief = '盯 CMU 的截止日期' WHERE id = 't1'");

    await __migrateSchemaForTest(db);
    // Rewind only the checkpoint, exactly as a crash mid-step would have left it: the table
    // and its rows are already there, and the step is about to run over them again.
    handle.exec('PRAGMA user_version = 21');
    await __migrateSchemaForTest(db);

    expect(handle.prepare('SELECT COUNT(*) AS c FROM follow_up_items').get()).toEqual({ c: 1 });
  });

  // v23 (DESIGN_WORKSPACE_PACK §4). One nullable column, and the property worth pinning is
  // that it changes nothing: every workspace the user already had comes out top-level,
  // which is what flat meant. Additive — no rebuild anywhere near the table that holds the
  // whole library's structure.
  it('v22 → v23 gives every existing workspace a NULL parent and moves nothing', async () => {
    applySchema(handle);
    downgradeToV22(handle);
    seedUserData(handle);
    const workspacesBefore = handle.prepare('SELECT * FROM workspaces').all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(columnNames(handle, 'workspaces')).toContain('parent_id');
    expect(handle.prepare('SELECT id, parent_id FROM workspaces').all()).toEqual([
      { id: 'w1', parent_id: null },
    ]);
    // Same rows, same titles, same order — the only difference is a column that reads NULL.
    expect(
      handle.prepare('SELECT id, title, sort_order, created_at, updated_at, deleted_at FROM workspaces').all(),
    ).toEqual(workspacesBefore);
  });

  // v24 (COMPRESS-UX-R2-2026-08-22 §1a). ⚠️⚠️ 这是 Spool 第一条会改写用户已有文字的路，
  // 所以这一步本身必须是**加两个空列、一个字都不写**（2026-05-29 抹库之后定的规矩）。
  // 盯的就是这一条：走过之后每一行的两列都是 NULL，其余每个字段逐字未动。
  it('v23 → v24 adds two empty columns and writes no user data', async () => {
    applySchema(handle);
    downgradeToV23(handle);
    seedUserData(handle);
    const before = handle.prepare('SELECT * FROM blocks').all();

    await __migrateSchemaForTest(db);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(columnNames(handle, 'blocks')).toContain('original_content');
    expect(columnNames(handle, 'blocks')).toContain('compressed_at');
    // ⛔ 一行用户数据都没写：两列全空 = 「从来没压过」，正文一个字没动。
    expect(handle.prepare('SELECT original_content, compressed_at FROM blocks').all()).toEqual(
      before.map(() => ({ original_content: null, compressed_at: null })),
    );
    const cols = Object.keys(before[0] as object);
    expect(
      handle.prepare(`SELECT ${cols.join(', ')} FROM blocks`).all(),
    ).toEqual(before);
  });

  it('is a no-op when the version already matches', async () => {
    applySchema(handle);
    handle.exec('PRAGMA user_version = 19');
    seedUserData(handle);

    // Only the fresh-rebuild path reports true — it is the sole tutorial-seed gate.
    expect(await __migrateSchemaForTest(db)).toBe(false);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    expect(handle.prepare('SELECT COUNT(*) AS c FROM blocks').get()).toEqual({ c: 1 });
  });

  it('refuses to rebuild a populated database at an unknown version', async () => {
    applySchema(handle);
    handle.exec('PRAGMA user_version = 99');
    seedUserData(handle);

    await expect(__migrateSchemaForTest(db)).rejects.toThrow(/refusing to rebuild/);
    // Nothing was dropped.
    expect(handle.prepare('SELECT COUNT(*) AS c FROM blocks').get()).toEqual({ c: 1 });
    expect(userVersion(handle)).toBe(99);
  });

  it('rebuilds an empty database at an unknown version from schema.sql', async () => {
    // A fresh install: no tables yet, user_version 0. The rebuild reports fresh=true,
    // which is what lets initDb seed the tutorial thread exactly once.
    expect(await __migrateSchemaForTest(db)).toBe(true);

    expect(userVersion(handle)).toBe(CURRENT_SCHEMA_VERSION);
    const tables = (
      handle.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[]
    ).map((r) => r.name);
    for (const t of ['workspaces', 'threads', 'blocks', 'attachments']) {
      expect(tables).toContain(t);
    }
  });

  it('walking the registry does not report fresh (no tutorial re-seed on upgrade)', async () => {
    applySchema(handle);
    downgradeToV8(handle);
    handle.exec(`
      ALTER TABLE threads DROP COLUMN summary_source;
      ALTER TABLE blocks DROP COLUMN ref_block_id;
      PRAGMA user_version = 5;
    `);
    seedUserData(handle);

    expect(await __migrateSchemaForTest(db)).toBe(false);
  });

  // WORKPLAN-2026-08-20 §2.3. What makes the sample worth shipping is that a pack rendered
  // from it shows all four authority bands, so the checks below are on the SHAPE of the
  // rows — a sourceless block (💭), a user annotation, an AI-filed block, and the citation
  // between the last two — not on the prose, which is allowed to be reworded.
  it('loads the sample project with the four bands and its citation intact', async () => {
    applySchema(handle);
    handle.exec(`
      INSERT INTO workspaces (id, title, sort_order, created_at, updated_at)
        VALUES ('w1', '收件箱', 0, 1, 1);
    `);

    const threadId = await __insertDemoProjectForTest(db, 'w1', 'zh');

    const rows = handle
      .prepare(
        'SELECT content, annotation, annotation_by, source, seq, ref_block_id, ref_kind, id FROM blocks WHERE thread_id = ? ORDER BY seq ASC',
      )
      .all(threadId) as {
      annotation: string | null;
      annotation_by: string | null;
      source: string | null;
      seq: number;
      ref_block_id: string | null;
      ref_kind: string | null;
      id: string;
    }[];

    expect(rows).toHaveLength(5);
    // seq is drawn per thread the same way blocks.ts draws it — a seeded row must be
    // indistinguishable from a captured one, and NULL seq is a state real use cannot make.
    expect(rows.map((r) => r.seq)).toEqual([1, 2, 3, 4, 5]);

    // 💭 Personal: exactly one block with no source at all — the user's own decision.
    expect(rows.filter((r) => r.source === null)).toHaveLength(1);
    // 📖 / 🧩 / the MCP write: every other block is labelled, and one came in over MCP.
    expect(rows.some((r) => r.source?.includes('MCP'))).toBe(true);
    // The user's own annotation, marked as theirs (it renders as `💭 note:`, not `ai note:`).
    expect(rows.filter((r) => r.annotation !== null && r.annotation_by === 'user')).toHaveLength(1);

    // ↩ cites: the AI's block points at the user's decision, and the id resolves inside
    // this same project — a citation into nothing renders as "(cited block no longer exists)".
    const citing = rows.find((r) => r.ref_block_id !== null)!;
    expect(citing.ref_kind).toBe('cites');
    expect(rows.some((r) => r.id === citing.ref_block_id)).toBe(true);

    // The deadline is relative, so the sample never reads as expired.
    const t = handle.prepare('SELECT deadline FROM threads WHERE id = ?').get(threadId) as {
      deadline: number;
    };
    expect(t.deadline).toBeGreaterThan(Date.now());
  });

  it('re-translates the sample project on a language switch, and leaves an edited one alone', async () => {
    applySchema(handle);
    handle.exec(`
      INSERT INTO workspaces (id, title, sort_order, created_at, updated_at)
        VALUES ('w1', '收件箱', 0, 1, 1);
    `);
    const threadId = await __insertDemoProjectForTest(db, 'w1', 'en');

    expect(await __retranslateDemoProjectForTest(db, 'en', 'zh')).toBe(true);
    const zh = handle.prepare('SELECT title FROM threads WHERE id = ?').get(threadId) as {
      title: string;
    };
    expect(zh.title).toBe('示例项目：机器学习课');
    // The sources are per-language too — an English label under Chinese content would be
    // a worse result than not translating at all.
    const sources = handle
      .prepare('SELECT source FROM blocks WHERE thread_id = ? ORDER BY seq')
      .all(threadId) as { source: string | null }[];
    expect(sources[1]!.source).toBe('第 7 讲课件 · Safari');
    expect(sources[3]!.source).toBeNull();

    // The moment the user edits one block the project is theirs: nothing is rewritten,
    // not even the blocks that are still untouched.
    handle.prepare('UPDATE blocks SET content = ? WHERE thread_id = ? AND seq = 1').run(
      'my own words',
      threadId,
    );
    expect(await __retranslateDemoProjectForTest(db, 'zh', 'en')).toBe(false);
    const still = handle.prepare('SELECT title FROM threads WHERE id = ?').get(threadId) as {
      title: string;
    };
    expect(still.title).toBe('示例项目：机器学习课');
  });

  it('seeds the tutorial + MCP scenario threads (fresh install only)', async () => {
    applySchema(handle);
    handle.exec("PRAGMA user_version = 12");
    handle.exec(`
      INSERT INTO workspaces (id, title, sort_order, created_at, updated_at)
        VALUES ('w1', '收件箱', 0, 1, 1);
    `);

    await __seedTutorialThreadForTest(db, 'zh');

    // Two seeded threads; the gesture tutorial stays newest so it tops the sidebar.
    const threads = handle
      .prepare(
        'SELECT title, summary_source, is_capture_target FROM threads ORDER BY updated_at DESC',
      )
      .all() as Record<string, unknown>[];
    expect(threads.map((t) => t.title)).toEqual(['欢迎使用 Spool', '让 AI 用上你的 Spool']);
    expect(threads.every((t) => t.summary_source === 'user')).toBe(true); // MCP may not overwrite the cards
    expect(threads.every((t) => t.is_capture_target === 0)).toBe(true); // 未分类 keeps the capture target
    const blocks = handle
      .prepare('SELECT content, annotation, source, pinned FROM blocks ORDER BY created_at ASC')
      .all() as Record<string, unknown>[];
    expect(blocks).toHaveLength(12); // 6 gesture guide + 6 MCP scenarios
    expect(blocks.every((b) => b.source === 'Spool 指南')).toBe(true);
    expect(blocks.filter((b) => b.pinned === 1)).toHaveLength(2); // one anchor per thread
    // 任务二 A2: every scenario block's annotation names the tool behind the phrase.
    const scenarioNotes = blocks.slice(0, 6).map((b) => String(b.annotation));
    for (const tool of ['get_pack', 'get_digest', 'add_block', 'find_similar_blocks', 'check_library']) {
      expect(scenarioNotes.some((a) => a.includes(tool))).toBe(true);
    }
    // The FTS triggers indexed both threads (searchable like any user block).
    expect(
      handle.prepare("SELECT COUNT(*) AS c FROM blocks_fts WHERE blocks_fts MATCH '\"批注框\"'").get(),
    ).toEqual({ c: 1 });
    expect(
      handle.prepare("SELECT COUNT(*) AS c FROM blocks_fts WHERE blocks_fts MATCH '\"做个体检\"'").get(),
    ).toEqual({ c: 1 });
  });

  // 2026-07-31 (HANDOFF §2.2): the seed is per-language — an English first launch must
  // not land Chinese tutorial rows in the database, since these are user data and no
  // later language switch re-translates them.
  it('seeds the tutorial in English when the install starts in en', async () => {
    applySchema(handle);
    handle.exec("PRAGMA user_version = 12");
    handle.exec(`
      INSERT INTO workspaces (id, title, sort_order, created_at, updated_at)
        VALUES ('w1', 'Inbox', 0, 1, 1);
    `);

    await __seedTutorialThreadForTest(db, 'en');

    const threads = handle
      .prepare('SELECT title FROM threads ORDER BY updated_at DESC')
      .all() as Record<string, unknown>[];
    expect(threads.map((t) => t.title)).toEqual([
      'Welcome to Spool',
      'Put your AI to work on Spool',
    ]);
    const blocks = handle
      .prepare('SELECT content, annotation, source, pinned FROM blocks ORDER BY created_at ASC')
      .all() as Record<string, unknown>[];
    expect(blocks).toHaveLength(12);
    expect(blocks.every((b) => b.source === 'Spool Guide')).toBe(true);
    expect(blocks.filter((b) => b.pinned === 1)).toHaveLength(2);
    // Ocean 2026-07-30: "everything but the logo is English" — no CJK ideographs and no
    // CJK punctuation (「」〈〉，。) anywhere in the seeded copy. ⌘/⌥/📌 are not CJK.
    const cjk = /[一-鿿　-〿＀-￯]/;
    for (const b of blocks) {
      expect(cjk.test(String(b.content))).toBe(false);
      expect(cjk.test(String(b.annotation ?? ''))).toBe(false);
    }
    for (const t of threads) expect(cjk.test(String(t.title))).toBe(false);
  });
});

// Ocean 2026-08-03: switching the UI language re-translates the tutorial threads. They
// are database rows, so the whole feature hangs on one rule — only rewrite what is still
// exactly as seeded. These three cover the rule from both sides.
describe('retranslateTutorial', () => {
  let handle: Sqlite;
  let db: Database;

  beforeEach(() => {
    handle = new DatabaseSync(':memory:');
    db = makeAdapter(handle);
    __setTestDb(db);
    applySchema(handle);
    handle.exec("PRAGMA user_version = 12");
    handle.exec(`
      INSERT INTO workspaces (id, title, sort_order, created_at, updated_at)
        VALUES ('w1', 'Inbox', 0, 1, 1);
    `);
  });

  afterEach(() => {
    __setTestDb(null);
    handle.close();
  });

  const titles = (): unknown[] =>
    (handle.prepare('SELECT title FROM threads ORDER BY updated_at DESC').all() as {
      title: string;
    }[]).map((t) => t.title);

  it('rewrites an untouched English tutorial into Chinese, in place', async () => {
    await __seedTutorialThreadForTest(db, 'en');
    const before = handle.prepare('SELECT id, pinned, created_at FROM blocks ORDER BY id').all();

    expect(await retranslateTutorial('en', 'zh')).toBe(true);

    expect(titles()).toEqual(['欢迎使用 Spool', '让 AI 用上你的 Spool']);
    const blocks = handle
      .prepare('SELECT content, source FROM blocks ORDER BY created_at ASC')
      .all() as { content: string; source: string }[];
    expect(blocks).toHaveLength(12);
    expect(blocks.every((b) => b.source === 'Spool 指南')).toBe(true);
    expect(blocks.some((b) => b.content.includes('捕捉目标'))).toBe(true);
    // Same rows, same pins, same timestamps — this is a rewrite, not a re-seed.
    expect(handle.prepare('SELECT id, pinned, created_at FROM blocks ORDER BY id').all()).toEqual(
      before,
    );
    // Search stays consistent: the FTS mirror followed the update.
    expect(
      handle.prepare("SELECT COUNT(*) AS c FROM blocks_fts WHERE blocks_fts MATCH '\"批注框\"'").get(),
    ).toEqual({ c: 1 });
  });

  it('leaves a thread alone once the user has edited one of its blocks', async () => {
    await __seedTutorialThreadForTest(db, 'en');
    handle
      .prepare("UPDATE blocks SET content = 'my own words' WHERE content LIKE 'Capture:%'")
      .run();

    expect(await retranslateTutorial('en', 'zh')).toBe(true); // the other thread still swaps

    // The edited thread keeps its English title and every one of its blocks.
    expect(titles()).toContain('Welcome to Spool');
    const kept = handle
      .prepare("SELECT COUNT(*) AS c FROM blocks WHERE source = 'Spool Guide'")
      .get() as { c: number };
    expect(kept.c).toBe(6);
    expect(
      handle.prepare("SELECT COUNT(*) AS c FROM blocks WHERE content = 'my own words'").get(),
    ).toEqual({ c: 1 });
  });

  it('never re-creates a tutorial the user deleted', async () => {
    await __seedTutorialThreadForTest(db, 'en');
    handle.prepare('DELETE FROM blocks').run();
    handle.prepare('DELETE FROM threads').run();

    expect(await retranslateTutorial('en', 'zh')).toBe(false);

    expect(handle.prepare('SELECT COUNT(*) AS c FROM threads').get()).toEqual({ c: 0 });
    expect(handle.prepare('SELECT COUNT(*) AS c FROM blocks').get()).toEqual({ c: 0 });
  });
});
