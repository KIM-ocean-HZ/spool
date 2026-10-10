import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAttachment } from './attachments';
import { createBlock } from './blocks';
import { __setTestDb } from './client';
import schemaSql from './schema.sql?raw';
import { createThread } from './threads';
import { mergeLibrary, MERGE_TABLES_FOR_TEST, type MergeReport } from './transfer';
import { createWorkspace } from './workspaces';

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

// P7-2: tauri-plugin-sql as it really behaves with bytes (plugin 2.4 `decode/sqlite.rs` and
// `wrapper.rs`): a BLOB comes back as a JSON array of numbers, and a parameter that is not
// null, a string or a number is bound as its JSON text. The plain adapter above passes
// Uint8Array straight through, which is exactly how a copy that corrupts every image in the
// real app would still pass here.
const asPluginSql = (handle: Sqlite): Database => {
  const bind = (params: unknown[]): SqlValue[] =>
    params.map((v) =>
      v == null || typeof v === 'string' || typeof v === 'number' ? (v as SqlValue) : JSON.stringify(v),
    );
  const out = (row: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, v instanceof Uint8Array ? Array.from(v) : v]),
    );
  return {
    execute: async (sql: string, params: unknown[] = []) => {
      const r = handle.prepare(toNumbered(sql)).run(...bind(params));
      return { rowsAffected: Number(r.changes), lastInsertId: Number(r.lastInsertRowid) };
    },
    select: async (sql: string, params: unknown[] = []) =>
      (handle.prepare(toNumbered(sql)).all(...bind(params)) as Record<string, unknown>[]).map(out),
  } as unknown as Database;
};

const freshDb = (): { handle: Sqlite; db: Database } => {
  const handle = new DatabaseSync(':memory:');
  handle.exec(schemaSql.replace(/--.*$/gm, ''));
  return { handle, db: makeAdapter(handle) };
};

const count = (handle: Sqlite, sql: string): number =>
  Number((handle.prepare(sql).get() as { c: number }).c);

// DESIGN_LIBRARY_TRANSFER — importing a library MERGES it (Ocean 2026-08-17, §0). What is
// worth pinning here is everything that only shows up when two libraries meet: ids that
// collide, a flag that is unique across the whole library, and the fact that none of it
// runs inside a transaction.
describe('库的导出与导入 (DESIGN_LIBRARY_TRANSFER)', () => {
  let src: { handle: Sqlite; db: Database };
  let dst: { handle: Sqlite; db: Database };

  beforeEach(() => {
    src = freshDb();
    dst = freshDb();
  });

  afterEach(() => {
    __setTestDb(null);
    src.handle.close();
    dst.handle.close();
  });

  /** Build a small library through the real creation paths, on whichever db is given. */
  const seed = async (db: Database, titles: string[]): Promise<string[]> => {
    __setTestDb(db);
    const ws = await createWorkspace('升学');
    const ids: string[] = [];
    for (const title of titles) {
      const thread = await createThread(ws.id, title);
      ids.push(thread.id);
      await createBlock({ threadId: thread.id, content: `${title} 的第一条` });
    }
    __setTestDb(null);
    return ids;
  };

  it('合并进一个空库，等于把这个库原样装回来 —— 换机器走的就是这条路', async () => {
    await seed(src.db, ['Georgia Tech', 'Columbia MSCS']);

    const report = await mergeLibrary(src.db, dst.db);

    expect(count(dst.handle, 'SELECT COUNT(*) AS c FROM workspaces')).toBe(1);
    expect(count(dst.handle, 'SELECT COUNT(*) AS c FROM threads')).toBe(2);
    expect(count(dst.handle, 'SELECT COUNT(*) AS c FROM blocks')).toBe(2);
    expect(report.added.threads).toBe(2);
    expect(report.skipped).toBe(0);
    expect(
      (dst.handle.prepare('SELECT title FROM threads ORDER BY title').all() as { title: string }[])
        .map((r) => r.title),
    ).toEqual(['Columbia MSCS', 'Georgia Tech']);
  });

  it('同一份库导入两次，不会变成两份 —— id 撞上就是「已经有了」', async () => {
    await seed(src.db, ['Flux']);

    await mergeLibrary(src.db, dst.db);
    const second = await mergeLibrary(src.db, dst.db);

    expect(count(dst.handle, 'SELECT COUNT(*) AS c FROM threads')).toBe(1);
    expect(count(dst.handle, 'SELECT COUNT(*) AS c FROM blocks')).toBe(1);
    expect(second.added.threads).toBe(0);
    expect(second.skipped).toBeGreaterThan(0);
  });

  // ⚠️ This is the cost Ocean was told about before he chose merge (§0 / §3.1): two
  // libraries that each grew their own 「Flux」 hold two different ids, so merging keeps
  // both. Deduplicating by title would be Spool guessing that two histories are one.
  it('两个库里各自建的同名项目，合并之后是两个 —— 这是有意的', async () => {
    await seed(src.db, ['Flux']);
    await seed(dst.db, ['Flux']);

    await mergeLibrary(src.db, dst.db);

    expect(count(dst.handle, "SELECT COUNT(*) AS c FROM threads WHERE title = 'Flux'")).toBe(2);
  });

  it('本机已经有捕捉目标时，带进来的那个落成 0 —— 全局只能有一个', async () => {
    const [srcThread] = await seed(src.db, ['来的']);
    const [dstThread] = await seed(dst.db, ['本机的']);
    src.handle.prepare('UPDATE threads SET is_capture_target = 1 WHERE id = ?1').run(srcThread);
    dst.handle.prepare('UPDATE threads SET is_capture_target = 1 WHERE id = ?1').run(dstThread);

    await mergeLibrary(src.db, dst.db);

    expect(count(dst.handle, 'SELECT COUNT(*) AS c FROM threads WHERE is_capture_target = 1')).toBe(
      1,
    );
    expect(
      count(dst.handle, `SELECT COUNT(*) AS c FROM threads WHERE id = '${dstThread}' AND is_capture_target = 1`),
    ).toBe(1);
  });

  it('本机一个捕捉目标都没有时，带进来的那个留着 —— 新装的机器要原样', async () => {
    const [srcThread] = await seed(src.db, ['来的']);
    src.handle.prepare('UPDATE threads SET is_capture_target = 1 WHERE id = ?1').run(srcThread);

    await mergeLibrary(src.db, dst.db);

    expect(
      count(dst.handle, `SELECT COUNT(*) AS c FROM threads WHERE id = '${srcThread}' AND is_capture_target = 1`),
    ).toBe(1);
  });

  // ⚠️ Two libraries could each hold a capture target of their own; only one may survive,
  // and the survivor is never a row that was already on this machine.
  it('来库里有两个捕捉目标时，也只留得下一个', async () => {
    const ids = await seed(src.db, ['甲', '乙']);
    src.handle.prepare('UPDATE threads SET is_capture_target = 1').run();
    expect(ids.length).toBe(2);

    await mergeLibrary(src.db, dst.db);

    expect(count(dst.handle, 'SELECT COUNT(*) AS c FROM threads WHERE is_capture_target = 1')).toBe(
      1,
    );
  });

  // ⚠️ Found by rehearsing against a copy of the real library, not by reading the code:
  // deleting a project leaves `is_capture_target = 1` on the dead row, so a library can
  // hold two flagged threads with only one of them alive. If dead rows were allowed to
  // compete, whichever came first in table order would win — and the project the user
  // actually captures into would arrive on the new machine switched off.
  it('已删除的项目带着捕捉目标标记时,活着的那个才是赢家', async () => {
    const [dead, alive] = await seed(src.db, ['删掉的', '还在用的']);
    src.handle
      .prepare('UPDATE threads SET is_capture_target = 1, deleted_at = 1 WHERE id = ?1')
      .run(dead);
    src.handle.prepare('UPDATE threads SET is_capture_target = 1 WHERE id = ?1').run(alive);

    await mergeLibrary(src.db, dst.db);

    expect(
      count(dst.handle, `SELECT COUNT(*) AS c FROM threads WHERE id = '${alive}' AND is_capture_target = 1`),
    ).toBe(1);
    expect(
      count(dst.handle, `SELECT COUNT(*) AS c FROM threads WHERE id = '${dead}' AND is_capture_target = 1`),
    ).toBe(0);
  });

  it('本机已有的那一行绝不会被外来文件改写', async () => {
    const [threadId] = await seed(src.db, ['原名']);
    await seed(dst.db, ['本机自己的']);
    // Same id on both sides with different text: this is what a re-import of an edited
    // library looks like, and the machine you are sitting at wins.
    dst.handle
      .prepare(
        `INSERT INTO threads (id, workspace_id, title, status, created_at, updated_at)
         VALUES (?1, ?2, '本机改过的名字', 'active', 1, 1)`,
      )
      .run(threadId, (dst.handle.prepare('SELECT id FROM workspaces').get() as { id: string }).id);

    await mergeLibrary(src.db, dst.db);

    expect(
      (dst.handle.prepare('SELECT title FROM threads WHERE id = ?1').get(threadId) as {
        title: string;
      }).title,
    ).toBe('本机改过的名字');
  });

  it('带进来的块进得了全文检索 —— 触发器照常开火，不用另抄一份索引', async () => {
    __setTestDb(src.db);
    const ws = await createWorkspace('工作');
    const thread = await createThread(ws.id, '项目');
    await createBlock({ threadId: thread.id, content: '这条里写着一个很特别的词：橄榄球' });
    __setTestDb(null);

    await mergeLibrary(src.db, dst.db);

    expect(
      count(dst.handle, `SELECT COUNT(*) AS c FROM blocks_fts WHERE blocks_fts MATCH '"橄榄球"'`),
    ).toBe(1);
  });

  it('行数超过一条语句装得下的时候，一行都不会漏', async () => {
    __setTestDb(src.db);
    const ws = await createWorkspace('大的');
    const thread = await createThread(ws.id, '很多块');
    for (let i = 0; i < 250; i++) {
      await createBlock({ threadId: thread.id, content: `第 ${i} 条` });
    }
    __setTestDb(null);

    const report = await mergeLibrary(src.db, dst.db);

    expect(count(dst.handle, 'SELECT COUNT(*) AS c FROM blocks')).toBe(250);
    expect(report.added.blocks).toBe(250);
  });

  it('附件记录跟着走，路径去重之后交给调用方去数', async () => {
    __setTestDb(src.db);
    const ws = await createWorkspace('材料');
    const thread = await createThread(ws.id, '文书');
    await createAttachment({ threadId: thread.id, kind: 'file', target: '/Users/a/文书.pdf' });
    await createAttachment({ threadId: thread.id, kind: 'file', target: '/Users/a/文书.pdf' });
    await createAttachment({ threadId: thread.id, kind: 'file', target: '/Users/a/推荐信.pdf' });
    __setTestDb(null);

    const report: MergeReport = await mergeLibrary(src.db, dst.db);

    expect(count(dst.handle, 'SELECT COUNT(*) AS c FROM attachments')).toBe(3);
    // Membership and size, not order: sorting Chinese filenames would be asserting a
    // collation, which is the platform's answer and not this code's (交接 §10.4 第 1 条).
    expect(report.attachmentTargets).toHaveLength(2);
    expect(new Set(report.attachmentTargets)).toEqual(
      new Set(['/Users/a/文书.pdf', '/Users/a/推荐信.pdf']),
    );
  });

  // P5-1: the v30 columns ride along — the merge copies by column name, so a file hung off a
  // block lands hung off the same block, and who added it / what replaced it come too.
  it('文件挂在哪一块、谁加的、被谁取代，导出再导入原样回来', async () => {
    __setTestDb(src.db);
    const ws = await createWorkspace('材料');
    const thread = await createThread(ws.id, '文书');
    const block = await createBlock({ threadId: thread.id, content: '初稿' });
    const old = await createAttachment({ threadId: thread.id, kind: 'file', target: '/Users/a/v1.pdf' });
    const neu = await createAttachment({ threadId: thread.id, kind: 'file', target: '/Users/a/v2.pdf' });
    __setTestDb(null);
    src.handle
      .prepare(
        'UPDATE attachments SET anchor_block_id = ?, superseded_by = ?, superseded_at = ? WHERE id = ?',
      )
      .run(block.id, neu.id, 1700000000123, old.id);
    src.handle.prepare("UPDATE attachments SET added_by = 'Claude Desktop · MCP' WHERE id = ?").run(neu.id);
    const v30 =
      'SELECT id, anchor_block_id, added_by, superseded_by, superseded_at FROM attachments ORDER BY id';
    const before = src.handle.prepare(v30).all();

    await mergeLibrary(src.db, dst.db);

    expect(dst.handle.prepare(v30).all()).toEqual(before);
    expect(before).toContainEqual({
      id: old.id,
      anchor_block_id: block.id,
      added_by: 'user',
      superseded_by: neu.id,
      superseded_at: 1700000000123,
    });
  });

  // P9-2: a file's identity and notice describe the machine they were written on — a bookmark
  // from another Mac would not resolve here and read as 「删掉了」. They stay behind; the rest
  // of the row comes as before. Through the plugin's real byte handling, so a BLOB that DID
  // ride along would show up here as the text "[1,2,3]".
  it('文件的身份和「还要告诉用户的事」不跟着走，别的照旧', async () => {
    __setTestDb(src.db);
    const ws = await createWorkspace('材料');
    const thread = await createThread(ws.id, '文书');
    const a = await createAttachment({ threadId: thread.id, kind: 'file', target: '/Users/a/v1.pdf' });
    __setTestDb(null);
    src.handle
      .prepare('UPDATE attachments SET target_identity = ?, target_notice = ? WHERE id = ?')
      .run(new Uint8Array([1, 2, 3]), '{"kind":"dismissed"}', a.id);

    await mergeLibrary(asPluginSql(src.handle), asPluginSql(dst.handle));

    expect(
      dst.handle.prepare('SELECT id, target, target_identity, target_notice FROM attachments').all(),
    ).toEqual([{ id: a.id, target: '/Users/a/v1.pdf', target_identity: null, target_notice: null }]);
  });

  // P7-2 (Ocean 2026-10-07 #5: 图片存进库文件里，导出 / 搬到新电脑照旧一个文件全带走).
  it('带图片的块导出再导入，图片字节原样回来（走 tauri-plugin-sql 真实的收发方式）', async () => {
    __setTestDb(src.db);
    const ws = await createWorkspace('截图');
    const thread = await createThread(ws.id, '设计');
    const block = await createBlock({ threadId: thread.id, content: '两张图' });
    __setTestDb(null);
    // Every byte value, a NUL early on, and a PNG signature — the cases a text round-trip loses.
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, ...Array.from({ length: 256 }, (_, i) => i)]);
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9]);
    const insert = src.handle.prepare(
      `INSERT INTO block_images (id, block_id, position, bytes, format, width, height, size_bytes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    insert.run('img1', block.id, 0, png, 'png', 1240, 800, png.length, 1700000000001);
    insert.run('img2', block.id, 1, jpg, 'jpeg', 640, 480, jpg.length, 1700000000002);
    const rows = "SELECT id, block_id, position, typeof(bytes) AS t, hex(bytes) AS h, format, width, height, size_bytes, created_at FROM block_images ORDER BY position";
    const before = src.handle.prepare(rows).all();

    const report = await mergeLibrary(asPluginSql(src.handle), asPluginSql(dst.handle));

    expect(report.added.block_images).toBe(2);
    expect(dst.handle.prepare(rows).all()).toEqual(before);
    expect(before.map((r) => (r as { t: string }).t)).toEqual(['blob', 'blob']);
    const back = dst.handle.prepare("SELECT bytes FROM block_images WHERE id = 'img1'").get() as { bytes: Uint8Array };
    expect(Buffer.from(back.bytes).equals(Buffer.from(png))).toBe(true);

    // 再导一次：已经有了，一张都不多。
    const again = await mergeLibrary(asPluginSql(src.handle), asPluginSql(dst.handle));
    expect(again.added.block_images).toBe(0);
    expect(count(dst.handle, 'SELECT COUNT(*) AS c FROM block_images')).toBe(2);
  });

  // ⚠️⚠️ There is no transaction around a merge — tauri-plugin-sql's pool cannot hold one
  // (threads.ts:204). What makes a half-finished merge survivable is this order: a parent
  // is always inserted before its children, so whatever landed is a prefix in which every
  // child still has its parent. If someone reorders this list, that guarantee is gone and
  // nothing else will complain.
  it('表的顺序是父在前、子在后', () => {
    const order = MERGE_TABLES_FOR_TEST;
    expect(order.indexOf('workspaces')).toBeLessThan(order.indexOf('threads'));
    for (const child of ['blocks', 'attachments', 'follow_up_items'] as const) {
      expect(order.indexOf('threads')).toBeLessThan(order.indexOf(child));
    }
    expect(order.indexOf('blocks')).toBeLessThan(order.indexOf('block_images'));
    expect(order.indexOf('proposal_batches')).toBeLessThan(order.indexOf('proposals'));
  });

  // §3.2: three tables deliberately stay behind. `file_access_requests` is the one that
  // matters — carrying a granted claim on a file that does not exist here is a permission
  // travelling further than the user ever pointed it.
  // P6-1：`file_proposals`（AI 提议挂上这台电脑上的某个路径）同一个理由 —— 不跟着走。
  it('运行痕迹和授权状态不跟着走', () => {
    for (const table of ['engine_runs', 'date_dismissals', 'file_access_requests', 'file_proposals']) {
      expect(MERGE_TABLES_FOR_TEST).not.toContain(table);
    }
  });
});
