import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAttachment, listAttachmentsByThread } from './attachments';
import {
  type Block,
  blockStatsByThread,
  computeMergedFields,
  countBlocksByProjectSince,
  countCaptures,
  countMcpBlocks,
  countStitches,
  countUserWrittenChars,
  createBlock,
  deleteBlock,
  getBlockById,
  listBlocksByThread,
  listCapturesSince,
  listIncomingRefsForTargets,
  listPendingRefReviews,
  listStitchTimesSince,
  mergeBlocks,
  __resetReleasedRefsForTest,
  releaseRefsToRetired,
  replaceBlock,
  restoreBlock,
  applyCompression,
  restoreBlockOriginal,
  setBlockStale,
  setBlockSupersession,
  setCorrectedQuote,
  setRefReviewed,
  repointCitation,
  togglePin,
  updateBlockGist,
} from './blocks';
import { parseImageLines, renderImageLines } from '@/lib/blocks/imageLines';
import { isMcpSource } from '@/lib/blocks/sourceIcon';
import { __setTestDb } from './client';
import schemaSql from './schema.sql?raw';
import { createThread } from './threads';
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

const block = (id: string, createdAt: number, opts: Partial<Block> = {}): Block => ({
  id,
  threadId: 't',
  kind: 'text',
  content: '',
  annotation: null,
  refThreadId: null,
  refBlockId: null,
  source: null,
  pinned: false,
  createdAt,
  ...opts,
}) as Block;

describe('computeMergedFields (§20.1)', () => {
  it('keeps the earliest block as survivor and preserves its id', () => {
    const blocks = [
      block('b2', 200, { content: 'later' }),
      block('b1', 100, { content: 'first' }),
      block('b3', 300, { content: 'last' }),
    ];
    const m = computeMergedFields(blocks);
    expect(m.survivorId).toBe('b1');
    expect(m.nonSurvivorIds).toEqual(['b2', 'b3']);
  });

  it('joins contents chronologically with a blank-line separator', () => {
    const blocks = [
      block('b1', 100, { content: 'alpha' }),
      block('b2', 200, { content: 'beta' }),
      block('b3', 300, { content: 'gamma' }),
    ];
    expect(computeMergedFields(blocks).content).toBe('alpha\n\nbeta\n\ngamma');
  });

  it('prefixes non-survivor segments with [from <source>] when sources differ', () => {
    const blocks = [
      block('b1', 100, { content: 'a', source: null }),
      block('b2', 200, { content: 'b', source: 'Notion' }),
      block('b3', 300, { content: 'c', source: 'Chrome' }),
    ];
    expect(computeMergedFields(blocks).content).toBe(
      'a\n\n[from Notion]\nb\n\n[from Chrome]\nc',
    );
  });

  // P9H-2（DISCOVERED-20261015-2，第 146 条甲）：记号原来贴在那一段第一行前面 —— 那一段以图片开头时
  // 第一行变成 `[from Finder] ![](spool-image:…)`，屏幕和 pack 都认不出那是一张图，pack 还露出图片 id。
  it('a segment that opens with a picture keeps the picture line whole — on screen and in the pack', () => {
    const blocks = [
      block('b1', 100, { content: '先记一句', source: null }),
      block('b2', 200, { content: '![截图](spool-image:img_1)\n后面的字', source: 'Finder' }),
    ];
    const { content } = computeMergedFields(blocks);
    expect(content).toBe('先记一句\n\n[from Finder]\n![截图](spool-image:img_1)\n后面的字');
    expect(parseImageLines(content).map((l) => [l.id, l.caption])).toEqual([['img_1', '截图']]);
    const pack = renderImageLines(content, [{ id: 'img_1', path: '/Users/a/Library/images/img_1.png' }]);
    expect(pack).toBe('先记一句\n\n[from Finder]\n![截图](/Users/a/Library/images/img_1.png)\n后面的字');
    expect(pack).not.toContain('spool-image:');
  });

  it('emits no source prefix when every block shares the same source', () => {
    const blocks = [
      block('b1', 100, { content: 'a', source: 'Notion' }),
      block('b2', 200, { content: 'b', source: 'Notion' }),
    ];
    expect(computeMergedFields(blocks).content).toBe('a\n\nb');
  });

  it('keeps the survivor source and reports pinned=true if any block was pinned', () => {
    const blocks = [
      block('b1', 100, { source: 'A', pinned: false }),
      block('b2', 200, { source: 'B', pinned: true }),
    ];
    const m = computeMergedFields(blocks);
    expect(m.source).toBe('A');
    expect(m.pinned).toBe(true);
  });

  it('encodes per-segment annotations inline (↪ note: marker) and nulls the top-level annotation', () => {
    const blocks = [
      block('b1', 100, { content: 'alpha', annotation: 'first note' }),
      block('b2', 200, { content: 'beta', annotation: null }),
      block('b3', 300, { content: 'gamma', annotation: '   ' }),
      block('b4', 400, { content: 'delta', annotation: 'fourth note' }),
    ];
    const m = computeMergedFields(blocks);
    // Top-level annotation is null — per-segment annotations live in the content.
    expect(m.annotation).toBeNull();
    // Each annotated segment gets a `↪ note: ...` line as its last line; un-annotated
    // segments stay unmarked.
    expect(m.content).toBe(
      'alpha\n↪ note: first note\n\nbeta\n\ngamma\n\ndelta\n↪ note: fourth note',
    );
  });

  it('emits marker-free content (and null annotation) when no block carried an annotation', () => {
    const blocks = [block('b1', 100, { content: 'a' }), block('b2', 200, { content: 'b' })];
    const m = computeMergedFields(blocks);
    expect(m.annotation).toBeNull();
    expect(m.content).toBe('a\n\nb');
    expect(m.content).not.toContain('↪ note:');
  });

  it('flattens a multi-line per-segment annotation onto one line (single ↪ note: line)', () => {
    const blocks = [
      block('b1', 100, { content: 'x', annotation: 'first line\nsecond line' }),
      block('b2', 200, { content: 'y', annotation: 'plain' }),
    ];
    const m = computeMergedFields(blocks);
    // The annotation marker must be the LAST line of its segment, so multi-line
    // annotations are flattened to one line.
    expect(m.content).toBe('x\n↪ note: first line second line\n\ny\n↪ note: plain');
  });
});

describe('mergeBlocks against a real SQLite engine (§20.1)', () => {
  let sqlite: Sqlite;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('merges 3 blocks (pinned, differing sources) into the earliest, leaving the project files alone', async () => {
    const ws = await createWorkspace('工作区');
    const thread = await createThread(ws.id, 'T');

    const b1 = await createBlock({
      threadId: thread.id,
      content: 'first',
      source: 'Notion',
      annotation: 'note A',
    });
    // Force monotonically-later created_at by waiting a tick — createBlock uses Date.now().
    await new Promise((r) => setTimeout(r, 5));
    const b2 = await createBlock({ threadId: thread.id, content: 'second', source: 'Chrome' });
    await new Promise((r) => setTimeout(r, 5));
    await createBlock({ threadId: thread.id, content: 'third' });

    // pin the middle block — pinned should propagate to survivor
    await togglePin(b2.id);

    // v15: files belong to the PROJECT, so a merge of its blocks must not move or lose one.
    const a1 = await createAttachment({
      threadId: thread.id,
      kind: 'file',
      target: '/x/b2.pdf',
      label: 'b2.pdf',
    });
    const a2 = await createAttachment({
      threadId: thread.id,
      kind: 'folder',
      target: '/x/refs',
      label: 'refs',
    });

    const all = await listBlocksByThread(thread.id);
    const merged = computeMergedFields(all);
    await mergeBlocks(
      merged.survivorId,
      merged.content,
      merged.annotation,
      merged.pinned,
      merged.source,
      merged.nonSurvivorIds,
    );

    const after = await listBlocksByThread(thread.id);
    expect(after).toHaveLength(1);
    const survivor = after[0]!;

    // Survivor identity preserved
    expect(survivor.id).toBe(b1.id);
    expect(survivor.createdAt).toBe(b1.createdAt);

    // Sources differ → non-survivor segments are prefixed; b1's annotation rides
    // inside its segment as a `↪ note:` line.
    expect(survivor.content).toBe(
      'first\n↪ note: note A\n\n[from Chrome]\nsecond\n\n[from (无来源)]\nthird',
    );

    // Survivor keeps its source, gains pinned from b2. Top-level annotation is null
    // — per-segment annotations live inside the content now (see segments.ts).
    expect(survivor.source).toBe('Notion');
    expect(survivor.pinned).toBe(true);
    expect(survivor.annotation).toBeNull();

    // ⚠️ The v15 property: merging blocks is not a file operation. Both files are still
    // the project's, untouched, and neither was re-pointed at anything.
    const projectFiles = await listAttachmentsByThread(thread.id);
    expect(projectFiles.map((a) => a.id).sort()).toEqual([a1.id, a2.id].sort());

    // FTS sync: searching for content from a merged-away block hits the survivor's row
    const ftsRows = sqlite
      .prepare("SELECT rowid FROM blocks_fts WHERE blocks_fts MATCH 'second'")
      .all() as { rowid: number }[];
    expect(ftsRows.length).toBeGreaterThan(0);
  });
});

// DESIGN_AI_ENGINE §1.3 — "AI 归档了 N 块" is measured with a SQL predicate, while every
// rendering surface decides the same question with isMcpSource(). Two spellings of one
// rule drift; this is the pin that makes a drift fail loudly instead of quietly turning
// the engine's headline number into a lie.
describe('countMcpBlocks agrees with isMcpSource', () => {
  let sqlite: Sqlite;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('counts exactly the labels the badge treats as AI-written', async () => {
    const ws = await createWorkspace('工作区');
    const thread = await createThread(ws.id, 'T');
    const labels: (string | null)[] = [
      null,                       // the user typed it
      'Safari',                   // a capture
      'lecture-11.pdf',           // an attachment
      'MCP',                      // a client that sent no name
      'MCP — course.edu',         // …with a detail
      'Claude · MCP',             // the ordinary case
      'Claude Desktop · MCP — paper.pdf',
      'Cursor · MCP',
      'MCP的笔记',                 // a label that merely starts with the letters
    ];
    for (const source of labels) {
      await createBlock({ threadId: thread.id, content: source ?? 'user', source });
    }
    const expected = labels.filter((s) => isMcpSource(s)).length;
    expect(expected).toBe(5);
    expect(await countMcpBlocks()).toBe(expected);
  });
});

// 首日价值 §4.5 — 「今天读了什么」 counts what the user READ, and the sidebar card is the
// first surface that has to tell a capture apart from everything else in the table. Three
// kinds of block are not captures and each is here for its own reason: the composer writes
// no source, the MCP server writes a block the user never read, and the tutorial's blocks
// were seeded rather than captured (a fresh install would otherwise open on 「今天读了 6 条」
// before the user had done anything at all).
describe('listCapturesSince', () => {
  let sqlite: Sqlite;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('keeps captures and hand-typed source labels, drops composer / MCP / tutorial', async () => {
    const ws = await createWorkspace('工作区');
    const thread = await createThread(ws.id, 'T');
    for (const source of [
      null,             // the composer — the user wrote it, did not read it
      'Safari',         // the gesture, source detected from the foreground app
      'Chrome',         // …counts once per block, not once per app
      '那本书',          // typed by hand on the badge when detection missed
      'Claude · MCP',   // the AI wrote it
      'MCP',
      'Spool 指南',      // seeded tutorial, zh
      'Spool Guide',    // seeded tutorial, en
    ]) {
      await createBlock({ threadId: thread.id, content: source ?? 'user', source });
    }

    const rows = await listCapturesSince(0);
    expect(rows.map((b) => b.source)).toEqual(['那本书', 'Chrome', 'Safari']); // newest first
    expect(await countCaptures()).toBe(3);
  });

  it('honours the cutoff, so yesterday never shows up under 「今天」', async () => {
    const ws = await createWorkspace('工作区');
    const thread = await createThread(ws.id, 'T');
    const old = await createBlock({ threadId: thread.id, content: '昨天读的', source: 'Safari' });
    const cutoff = Date.now();
    sqlite
      .prepare('UPDATE blocks SET created_at = ? WHERE id = ?')
      .run(cutoff - 86_400_000, old.id);
    await createBlock({ threadId: thread.id, content: '今天读的', source: 'Chrome' });

    expect((await listCapturesSince(cutoff)).map((b) => b.content)).toEqual(['今天读的']);
    // The all-time count is the spool's number (首日价值二期 §2.3) and the pack hint's, and
    // it still sees both. ⚠️ It is a COUNT(*) now, not this list's length — the two must
    // keep agreeing on what a capture is, which is what these assertions pin.
    expect(await countCaptures()).toBe(2);
  });
});

// 首日价值二期 §2.2 — 「我写了多少字」, the one number in the card whose job is to change
// behaviour rather than report it (Ocean: 「鼓励用户多写个人的 notes」). It is 口径乙: the
// annotations the user wrote, plus the bodies of the blocks they typed themselves.
//
// Every row below is here because it would have been counted wrong by an obvious version of
// the query. The NULL `annotation_by` cases are pre-v14 rows and are the commonest thing in
// a real library — an SQL NOT() over an untreated NULL silently drops them.
describe('countUserWrittenChars', () => {
  let sqlite: Sqlite;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('counts the user own words and nothing else', async () => {
    const ws = await createWorkspace('工作区');
    const thread = await createThread(ws.id, 'T');
    const make = async (
      args: { content: string; source: string | null; annotation?: string | null },
      annotationBy: 'user' | 'ai' | null = 'user',
    ): Promise<void> => {
      const b = await createBlock({ threadId: thread.id, ...args });
      if (annotationBy === null) {
        // A row written before v14, when nobody recorded who wrote the annotation.
        sqlite.prepare('UPDATE blocks SET annotation_by = NULL WHERE id = ?').run(b.id);
      } else if (annotationBy === 'ai') {
        sqlite.prepare("UPDATE blocks SET annotation_by = 'ai' WHERE id = ?").run(b.id);
      }
    };

    // ✓ typed into the composer — 12 characters of his own
    await make({ content: '手打的一整块内容，十二字', source: null });
    // ✓ his note on something he captured (4) — the body is what he READ, never counted
    await make({ content: '一段读到的很长很长的正文', source: 'Safari', annotation: '我的批注' });
    // ✗ an AI wrote both the block and the note
    await make({ content: 'AI 写的', source: 'Claude · MCP', annotation: 'AI 的批注' }, 'ai');
    // ✗ pre-v14 MCP row: no annotation_by, so the source is what says the AI wrote it
    await make({ content: 'AI 写的', source: 'MCP', annotation: 'AI 的旧批注' }, null);
    // ✓ pre-v14 capture: no annotation_by and a source that is not MCP — his words (3)
    await make({ content: '读到的', source: 'Chrome', annotation: '旧批注' }, null);
    // ✓ pre-v14 composer row: sourceless body (3) + his note (3)
    await make({ content: '旧手打', source: null, annotation: '旧的注' }, null);
    // ✗ the tutorial arrives annotated — counting it opens a fresh install on 「我写了 700 字」
    await make({ content: '教程正文', source: 'Spool 指南', annotation: '教程的批注' });
    // ✗ whitespace is not writing
    await make({ content: '又一段读到的', source: 'Safari', annotation: '   ' });

    expect(await countUserWrittenChars()).toBe(12 + 4 + 3 + 3 + 3);
  });

  it('reports 0 on an empty library rather than null', async () => {
    // SUM() over no rows is NULL in SQLite, and 「我写了 null 字」 is what that looks like on
    // a fresh install — the one library where this card is guaranteed to be read.
    expect(await countUserWrittenChars()).toBe(0);
  });

  // The panel's 今天 line (Ocean 2026-08-11). Same 口径, bounded to blocks created since a
  // moment — and 0 rather than null on a day nothing was written, which is the state the
  // line is in most days.
  it('counts only blocks created at or after `since`', async () => {
    const ws = await createWorkspace('工作区');
    const thread = await createThread(ws.id, 'T');
    const at = async (createdAt: number, content: string): Promise<void> => {
      const b = await createBlock({ threadId: thread.id, content, source: null });
      sqlite.prepare('UPDATE blocks SET created_at = ? WHERE id = ?').run(createdAt, b.id);
    };
    await at(1000, '昨天写的四字'); // 6
    await at(2000, '今天写的'); // 4
    await at(3000, '今天又写'); // 4

    expect(await countUserWrittenChars()).toBe(14);
    expect(await countUserWrittenChars(2000)).toBe(8); // the boundary row is IN
    expect(await countUserWrittenChars(9000)).toBe(0);
  });
});

// DESIGN_WORKBENCH §9.13 — the numbers an expanded row in 项目管理 shows.
describe('blockStatsByThread', () => {
  let sqlite: Sqlite;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('counts blocks and characters per project, annotations included', async () => {
    const ws = await createWorkspace('W');
    const a = await createThread(ws.id, 'A');
    const b = await createThread(ws.id, 'B');
    await createBlock({ threadId: a.id, content: '12345', annotation: '123' }); // 8
    await createBlock({ threadId: a.id, content: '12' }); // 2 — a null annotation adds 0,
    await createBlock({ threadId: b.id, content: '1' }); //      not NULL to the whole sum
    const stats = await blockStatsByThread();
    expect(stats[a.id]).toEqual({ blocks: 2, chars: 10 });
    expect(stats[b.id]).toEqual({ blocks: 1, chars: 1 });
  });

  // ⭐⭐ 2026-08-30（Ocean：「在项目总字数里面，把不计数的字数给去掉」）。
  // 这一行写着「打包出来有多大」，而退役块**根本不进 pack**
  // （`assemble.ts`：`allBlocks.filter(b => b.staleAt == null)`）——
  // 在这之前它报的是一份打不出来的 pack。
  it('⛔ 已经不作数的块一个字都不算进字数', async () => {
    const ws = await createWorkspace('W');
    const a = await createThread(ws.id, 'A');
    await createBlock({ threadId: a.id, content: '12345', annotation: '123' }); // 8
    const retired = await createBlock({ threadId: a.id, content: '9999999999' }); // 10
    await setBlockStale(retired.id, 111);

    const stats = await blockStatsByThread();
    // ⚠️ **块数照旧算全部** —— 他要去掉的是字数。那一块还在项目里、还搜得到、还占着一行。
    expect(stats[a.id]).toEqual({ blocks: 2, chars: 8 });

    // 取回来 ⇒ 字数跟着回来。
    await setBlockStale(retired.id, null);
    expect((await blockStatsByThread())[a.id]).toEqual({ blocks: 2, chars: 18 });
  });

  it('leaves an empty project out of the map rather than reporting a zero row', async () => {
    // The board reads `stats[id] ?? EMPTY_STATS`, so absence and zero render the same —
    // but a GROUP BY cannot invent a row for a thread with no blocks, and pretending it
    // could is how a caller ends up trusting `Object.keys(stats)` as a project list.
    const ws = await createWorkspace('W');
    const empty = await createThread(ws.id, 'nothing in it');
    expect(await blockStatsByThread()).not.toHaveProperty(empty.id);
  });
});

// DESIGN_CONTEXT_HYGIENE §3.1 — supersession. Two nullable columns, three ways to use
// them, and the property that makes the whole design safe: nothing is ever destroyed.
describe('supersession (v13)', () => {
  let sqlite: Sqlite;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  const seed = async () => {
    const ws = await createWorkspace('W');
    const thread = await createThread(ws.id, 'T');
    const older = await createBlock({ threadId: thread.id, content: '截止 4 月 30 日' });
    const newer = await createBlock({ threadId: thread.id, content: '改成 3 月 15 日' });
    return { thread, older, newer };
  };

  it('starts every block valid and citing nothing in particular', async () => {
    const { older } = await seed();
    expect(older.staleAt).toBeNull();
    expect(older.refKind).toBeNull();
  });

  // Use ①: the user knows a conclusion has stopped holding but has no replacement yet —
  // Ocean 拍板'd that this must be supported on its own.
  it('retires a block with no replacement, and takes it back', async () => {
    const { thread, older } = await seed();
    await setBlockStale(older.id, 1_754_000_000_000);
    let rows = await listBlocksByThread(thread.id);
    expect(rows.find((b) => b.id === older.id)!.staleAt).toBe(1_754_000_000_000);
    // ⚠️ Still there, still readable, text untouched. Retiring is not deleting (§2.3's
    // TOKI distinction) — this assertion IS the design.
    expect(rows).toHaveLength(2);
    expect(rows.find((b) => b.id === older.id)!.content).toBe('截止 4 月 30 日');

    await setBlockStale(older.id, null);
    rows = await listBlocksByThread(thread.id);
    expect(rows.find((b) => b.id === older.id)!.staleAt).toBeNull();
  });

  // Use ②: wholesale replacement. One call, because leaving the old block live while the
  // new one claims to replace it is a state the user never meant to be in.
  it('retires the target in the same breath as declaring a replacement', async () => {
    const { thread, older, newer } = await seed();
    await setBlockSupersession(newer.id, older.id, 'supersedes', 1_754_000_000_000);
    const rows = await listBlocksByThread(thread.id);
    expect(rows.find((b) => b.id === newer.id)).toMatchObject({
      refBlockId: older.id,
      refKind: 'supersedes',
      staleAt: null,
    });
    expect(rows.find((b) => b.id === older.id)!.staleAt).toBe(1_754_000_000_000);
  });

  it('does not move a retirement the user already made', async () => {
    const { thread, older, newer } = await seed();
    await setBlockStale(older.id, 111);
    await setBlockSupersession(newer.id, older.id, 'supersedes', 999);
    // When they retired it is a fact about them, not about this declaration.
    expect((await listBlocksByThread(thread.id)).find((b) => b.id === older.id)!.staleAt).toBe(111);
  });

  // Use ③, and the answer to Ocean's question about copying: 'corrects' must leave the
  // target completely alone, or fixing one sentence costs a re-paste of the paragraph.
  it('leaves the target untouched for a partial correction', async () => {
    const { thread, older, newer } = await seed();
    await setBlockSupersession(newer.id, older.id, 'corrects', 1_754_000_000_000);
    const rows = await listBlocksByThread(thread.id);
    expect(rows.find((b) => b.id === newer.id)!.refKind).toBe('corrects');
    expect(rows.find((b) => b.id === older.id)).toMatchObject({
      staleAt: null,
      content: '截止 4 月 30 日',
    });
  });

  it('clears the relation without un-retiring the target', async () => {
    const { thread, older, newer } = await seed();
    await setBlockSupersession(newer.id, older.id, 'supersedes', 1_754_000_000_000);
    await setBlockSupersession(newer.id, null, null, 2_000_000_000_000);
    const rows = await listBlocksByThread(thread.id);
    expect(rows.find((b) => b.id === newer.id)).toMatchObject({
      refBlockId: null,
      refKind: null,
    });
    // Deliberate: "this no longer holds" was its own statement the moment it was made, and
    // guessing that it should be undone is exactly what §3.1 keeps out of this feature.
    expect(rows.find((b) => b.id === older.id)!.staleAt).toBe(1_754_000_000_000);
  });

  // 2026-08-19 — found in the real library on 2026-08-19: a block sat there carrying a
  // corrected_quote with no ref_kind and no ref_block_id. add_block refuses to write that
  // combination outright, so it can only have been produced here, by unlinking and leaving
  // the quote behind. A quote with nothing to point at marks a sentence in a block that
  // nobody is correcting any more.
  it('takes the corrected quote with the relation when it is cleared', async () => {
    const { thread, older, newer } = await seed();
    await setBlockSupersession(newer.id, older.id, 'corrects', 1_754_000_000_000);
    await setCorrectedQuote(newer.id, '截止 4 月 30 日');
    expect(
      (await listBlocksByThread(thread.id)).find((b) => b.id === newer.id)!.correctedQuote,
    ).toBe('截止 4 月 30 日');
    await setBlockSupersession(newer.id, null, null, 2_000_000_000_000);
    expect((await listBlocksByThread(thread.id)).find((b) => b.id === newer.id)).toMatchObject({
      refBlockId: null,
      refKind: null,
      correctedQuote: null,
    });
  });

  // ⛔⛔ T2 (2026-08-23, fifth round): the same rule on `supersedes`. The quote means
  // "the sentence in the old block this one corrects" — it belongs to `corrects` and to
  // nothing else. 2 of the 3 real proposals measured that night pointed at a pair that
  // already carried a `corrects`, and "retire the old one" would have left the quote
  // hanging off a `supersedes`: harder to spot than the 2026-08-19 case, because the
  // relation is still there so nothing looks broken.
  it('takes the corrected quote along when a correction is turned into a replacement', async () => {
    const { thread, older, newer } = await seed();
    await setBlockSupersession(newer.id, older.id, 'corrects', 1_754_000_000_000);
    await setCorrectedQuote(newer.id, '截止 4 月 30 日');
    await setBlockSupersession(newer.id, older.id, 'supersedes', 2_000_000_000_000);
    expect((await listBlocksByThread(thread.id)).find((b) => b.id === newer.id)).toMatchObject({
      refKind: 'supersedes',
      correctedQuote: null,
    });
  });

  it('brings both fields back when an undone delete restores the block', async () => {
    const { thread, older, newer } = await seed();
    await setBlockSupersession(newer.id, older.id, 'supersedes', 1_754_000_000_000);
    const before = (await listBlocksByThread(thread.id)).find((b) => b.id === older.id)!;
    await deleteBlock(older.id);
    await restoreBlock(before);
    // ⌘Z must not quietly resurrect a conclusion the user had retired.
    expect((await listBlocksByThread(thread.id)).find((b) => b.id === older.id)).toEqual(before);
  });
});

// v24 · 压缩稿写回库（COMPRESS-UX-R2-2026-08-22 §1）。
// ⛔⛔ 这是 Spool 第一条会**改写用户已有文字**的路 —— 在此之前块只增不改
// （更正挂在旁边、作废让它退出 pack，两条都不动原文）。所以这几条盯的是护栏本身。
describe('applyCompression / restoreBlockOriginal', () => {
  let sqlite: Sqlite;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  const seed = async () => {
    const ws = await createWorkspace('W');
    const th = await createThread(ws.id, 'P');
    const b = await createBlock({ threadId: th.id, content: '很长很长的原文，里面有 2026-11-25。' });
    return { threadId: th.id, block: b };
  };
  const read = async (threadId: string) => (await listBlocksByThread(threadId))[0];

  it('留原文：正文换成压缩稿，原文和时间一起写上', async () => {
    const { threadId, block } = await seed();
    const { changed } = await applyCompression([{ id: block.id, content: '短一点，2026-11-25 还在。' }], true, 1_754_000_000_000);
    expect(changed).toBe(1);
    const after = await read(threadId);
    expect(after.content).toBe('短一点，2026-11-25 还在。');
    expect(after.originalContent).toBe('很长很长的原文，里面有 2026-11-25。');
    expect(after.compressedAt).toBe(1_754_000_000_000);
  });

  // ⛔ 压第二次不许把「原文」换成上一次的压缩稿 —— 那样一键还原还回去的是一份 AI 产物，
  //    而用户以为那是他自己的字。
  it('压第二次，原文仍然是**第一次**那一份', async () => {
    const { threadId, block } = await seed();
    await applyCompression([{ id: block.id, content: '第一次压完' }], true, 1);
    await applyCompression([{ id: block.id, content: '第二次压完' }], true, 2);
    const after = await read(threadId);
    expect(after.content).toBe('第二次压完');
    expect(after.originalContent).toBe('很长很长的原文，里面有 2026-11-25。');
  });

  // ⛔ 一个字都没短的块不该被标成「压过」—— 那个记号会印进以后每一份 pack，
  //    告诉收件 AI「这几句不是原话」，而它其实是原话。
  it('内容没变就一个字都不写', async () => {
    const { threadId, block } = await seed();
    const { changed } = await applyCompression([{ id: block.id, content: block.content }], true, 1);
    expect(changed).toBe(0);
    const after = await read(threadId);
    expect(after.compressedAt).toBeNull();
    expect(after.originalContent).toBeNull();
  });

  // 关掉备份 = 压缩不可逆。⚠️ 记号照样要写（pack 上仍然该说「这几句不是原话」），
  // 只是还不回去了。
  it('不留原文：记号照写，原文留空', async () => {
    const { threadId, block } = await seed();
    await applyCompression([{ id: block.id, content: '短一点' }], false, 5);
    const after = await read(threadId);
    expect(after.compressedAt).toBe(5);
    expect(after.originalContent).toBeNull();
  });

  // ⭐⭐ S3（2026-08-24，Ocean 选乙）—— **压缩不许悄悄打掉引文。**
  // 真库里已经发生过：〈申请帮助〉#11 那条更正的引文，被 08-24 11:20:51 的一次压缩打断，
  // 屏幕上什么都不划、也不报错。下面四条钉的就是这四种下落。
  describe('S3 · 压完重定位更正引文', () => {
    const seedPair = async (targetContent: string, quote: string) => {
      const ws = await createWorkspace('W');
      const th = await createThread(ws.id, 'P');
      const target = await createBlock({ threadId: th.id, content: targetContent });
      const corr = await createBlock({ threadId: th.id, content: '其实不是这样。' });
      await setBlockSupersession(corr.id, target.id, 'corrects', 1);
      await setCorrectedQuote(corr.id, quote);
      return { threadId: th.id, target, corr };
    };
    const readById = async (threadId: string, id: string) =>
      (await listBlocksByThread(threadId)).find((b) => b.id === id)!;

    it('标点被改写 —— 引文换成压缩稿里的那一句，不算打断', async () => {
      const { threadId, target, corr } = await seedPair(
        '前言。结论：不要把任何学校称为保底。后话。',
        '结论：不要把任何学校称为保底。',
      );
      const { quotesLost } = await applyCompression(
        [{ id: target.id, content: '结论:不要把任何学校称为保底.' }],
        true,
        9,
      );
      expect(quotesLost).toEqual([]);
      expect((await readById(threadId, corr.id)).correctedQuote).toBe(
        '结论:不要把任何学校称为保底.',
      );
    });

    it('措辞被改写 —— 引文清掉、关系留着，并且报出来', async () => {
      const { threadId, target, corr } = await seedPair(
        '关于必修实习位：NEU 的 co-op 属于培养方案内的必修实习。',
        'NEU 的 co-op 属于培养方案内的必修实习',
      );
      const { quotesLost } = await applyCompression(
        [{ id: target.id, content: 'NEU co-op 是必修实习。' }],
        true,
        9,
      );
      // ⛔ 报出来 —— 无声才是 08-24 那次的形状。两个号码都是屏幕上的 #N。
      expect(quotesLost).toEqual([{ correctionSeq: corr.seq, targetSeq: target.seq }]);
      const after = await readById(threadId, corr.id);
      expect(after.correctedQuote).toBeNull();
      // ⛔ 关系必须留着：pack 和界面仍然说得出「#N 里有一处被更正了」。
      expect(after.refKind).toBe('corrects');
      expect(after.refBlockId).toBe(target.id);
    });

    it('⛔ 压缩前就对不上的引文，压缩不许动它、也不许赖在自己头上', async () => {
      const { threadId, target, corr } = await seedPair('正文', '一句谁也对不上的话');
      const { quotesLost } = await applyCompression(
        [{ id: target.id, content: '压完的正文' }],
        true,
        9,
      );
      expect(quotesLost).toEqual([]);
      expect((await readById(threadId, corr.id)).correctedQuote).toBe('一句谁也对不上的话');
    });

    // ⚠️ `ref_block_id` 可以跨项目指 —— 按项目筛就会漏掉别的项目里那条更正。
    it('别的项目里的更正也照样重定位', async () => {
      const ws = await createWorkspace('W');
      const a = await createThread(ws.id, 'A');
      const b = await createThread(ws.id, 'B');
      const target = await createBlock({ threadId: a.id, content: '甲：这句话在 A 里。' });
      const corr = await createBlock({ threadId: b.id, content: '其实不是。' });
      await setBlockSupersession(corr.id, target.id, 'corrects', 1);
      await setCorrectedQuote(corr.id, '这句话在 A 里');

      const { quotesLost } = await applyCompression(
        [{ id: target.id, content: '甲：换了个说法。' }],
        true,
        9,
      );
      expect(quotesLost).toHaveLength(1);
      expect(
        (await listBlocksByThread(b.id)).find((x) => x.id === corr.id)!.correctedQuote,
      ).toBeNull();
    });
  });

  it('一键还原：换回原文，两列一起清空', async () => {
    const { threadId, block } = await seed();
    await applyCompression([{ id: block.id, content: '短一点' }], true, 1);
    expect(await restoreBlockOriginal(block.id)).toBe(true);
    const after = await read(threadId);
    expect(after.content).toBe('很长很长的原文，里面有 2026-11-25。');
    expect(after.originalContent).toBeNull();
    // ⚠️ 记号也要跟着没 —— 还原之后这一块又是「没被压过」。
    expect(after.compressedAt).toBeNull();
  });

  // ⛔ 压过、但当时没留原文的那一种：还原会把正文清成空的，比不还原糟得多。
  it('没留原文的块还原不了，⛔ 而且不会把正文清空', async () => {
    const { threadId, block } = await seed();
    await applyCompression([{ id: block.id, content: '短一点' }], false, 5);
    expect(await restoreBlockOriginal(block.id)).toBe(false);
    expect((await read(threadId)).content).toBe('短一点');
  });
});

// ⭐ Q4（WORKPLAN §2.Q4，Ocean 2026-08-25）—— 用户自己改摘要。
//
// 钉两条，两条都是「漏了没有症状」的那一类：
//   ① 写下去的同时必须盖 `gist_by = 'user'` —— 少了这一句，`set_block_gist` 会把
//      用户刚写的那句当成 AI 自己写的（NULL 按 AI 待），下一次调用当场盖掉;
//   ② 空 = 清掉，而且 `gist_by` 仍然是 'user' —— 清空也是用户的一个决定，⛔ 那一列
//      不该被抹掉。⚠️ 但 `set_block_gist` 那道闸问的是「**还有没有那一句**」而不只是
//      `gist_by`：清空之后 AI 可以重新补一句（`set_thread_summary` 的老规矩），
//      否则用户清掉一条错摘要就等于把 AI 永远锁在外面，而界面上没有解开的路。
describe('Q4 · 用户自己写块摘要', () => {
  let handle: Sqlite;
  beforeEach(async () => {
    handle = new DatabaseSync(':memory:');
    handle.exec(schemaSql.replace(/--.*$/gm, ''));
    __setTestDb(makeAdapter(handle));
  });
  afterEach(() => handle.close());

  const seedBlock = async (): Promise<string> => {
    const ws = await createWorkspace('收件箱');
    const th = await createThread(ws.id, '摘要测试');
    const b = await createBlock({ threadId: th.id, content: '正文' });
    return b.id;
  };

  const readGist = (id: string) =>
    handle.prepare('SELECT gist, gist_by FROM blocks WHERE id = ?1').get(id) as {
      gist: string | null;
      gist_by: string | null;
    };

  it('写一句摘要，同时盖上「用户写的」', async () => {
    const id = await seedBlock();
    expect(readGist(id)).toEqual({ gist: null, gist_by: null });
    await updateBlockGist(id, '  这一块记的是截止日期  ');
    expect(readGist(id)).toEqual({ gist: '这一块记的是截止日期', gist_by: 'user' });
  });

  it('清空之后 gist 没了，「用户写的」留着（闸看的是那一句还在不在）', async () => {
    const id = await seedBlock();
    await updateBlockGist(id, '先写一句');
    await updateBlockGist(id, '   ');
    expect(readGist(id)).toEqual({ gist: null, gist_by: 'user' });
  });
});

// ⭐⭐ F2 §3.2（Ocean 2026-08-30）—— 块级「来龙去脉」的库那一层。
describe('provenance graph (v29)', () => {
  let sqlite: Sqlite;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    __resetReleasedRefsForTest();
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  /** 两个项目，四块 —— ⚠️ 故意做成**跨项目**：真库 58 条边里 30 条跨项目，
   *  只在一个项目里测，测不到这个功能实际跑的那一半。 */
  const seed = async () => {
    const ws = await createWorkspace('W');
    const a = await createThread(ws.id, '申请规划');
    const b = await createThread(ws.id, '申请帮助');
    const target = await createBlock({ threadId: a.id, content: '旧结论' });
    const sameProject = await createBlock({ threadId: a.id, content: '本项目引用它' });
    const crossProject = await createBlock({ threadId: b.id, content: '别的项目引用它' });
    return { a, b, target, sameProject, crossProject };
  };

  it('⛔ 「谁引用了我」是全库反查，跨项目那一条也回来', async () => {
    const { a, b, target, sameProject, crossProject } = await seed();
    // ⚠️ 直接写库，⛔ 不走 `setBlockSupersession` —— 那一个传 `kind: null` 的语义是
    // 「**清掉**这条关系」（`ref_block_id` 一起置空），而 `cites` 恰恰是
    // `ref_kind` 为 null **但 `ref_block_id` 有值** 的那一种。
    for (const id of [sameProject.id, crossProject.id]) {
      sqlite.prepare('UPDATE blocks SET ref_block_id = ? WHERE id = ?').run(target.id, id);
    }

    const map = await listIncomingRefsForTargets([target.id]);
    const ids = (map[target.id] ?? []).map((e) => e.id).sort();
    expect(ids).toEqual([crossProject.id, sameProject.id].sort());
    // 项目名跟着回来 —— 界面要说出「在〈申请帮助〉」。
    const cross = map[target.id]!.find((e) => e.id === crossProject.id)!;
    expect(cross.threadId).toBe(b.id);
    expect(cross.threadTitle).toBe('申请帮助');
    void a;
  });

  it('没人引用的块不在结果里（调用方按「没有入向边」读）', async () => {
    const { target, sameProject } = await seed();
    expect(await listIncomingRefsForTargets([target.id, sameProject.id])).toEqual({});
    expect(await listIncomingRefsForTargets([])).toEqual({});
  });

  // P9S-2（Ocean 2026-10-23 第 171 条）：不再排队等人看 —— 一块不作数，指着它的引用当场解除。
  it('P9S-2：一块不作数 ⇒ 指着它的引用自动解除，跨项目那一条也解，两块都还在', async () => {
    const { target, sameProject, crossProject } = await seed();
    await setBlockSupersession(sameProject.id, target.id, 'corrects', 1);
    await setCorrectedQuote(sameProject.id, '旧结论');
    sqlite.prepare('UPDATE blocks SET ref_block_id = ? WHERE id = ?').run(target.id, crossProject.id);

    const { released } = await setBlockStale(target.id, 111);
    expect(released.map((e) => e.citingId).sort()).toEqual([crossProject.id, sameProject.id].sort());
    for (const id of [sameProject.id, crossProject.id]) {
      expect(await getBlockById(id)).toMatchObject({
        refBlockId: null,
        refKind: null,
        correctedQuote: null,
        refReviewedStaleAt: null,
      });
    }
    expect((await getBlockById(target.id))!.staleAt).toBe(111);
    expect(await listPendingRefReviews()).toEqual([]);
  });

  it('P9S-2：同一次开着时取回那一块 ⇒ 引用回来；之后又退役 ⇒ 再解一次', async () => {
    const { target, sameProject } = await seed();
    await setBlockSupersession(sameProject.id, target.id, 'corrects', 1);
    await setCorrectedQuote(sameProject.id, '旧结论');

    await setBlockStale(target.id, 111);
    const { restored } = await setBlockStale(target.id, null);
    expect(restored.map((e) => e.citingId)).toEqual([sameProject.id]);
    expect(await getBlockById(sameProject.id)).toMatchObject({
      refBlockId: target.id,
      refKind: 'corrects',
      correctedQuote: '旧结论',
    });

    expect((await setBlockStale(target.id, 333)).released).toHaveLength(1);
    expect((await getBlockById(sameProject.id))!.refBlockId).toBeNull();
  });

  it('P9S-2：取回之前引用方已经指到别处 ⇒ 不覆盖', async () => {
    const { a, target, sameProject } = await seed();
    const other = await createBlock({ threadId: a.id, content: '另一块' });
    sqlite.prepare('UPDATE blocks SET ref_block_id = ? WHERE id = ?').run(target.id, sameProject.id);
    await setBlockStale(target.id, 111);
    await repointCitation(sameProject.id, other.id, null, null);

    expect((await setBlockStale(target.id, null)).restored).toEqual([]);
    expect((await getBlockById(sameProject.id))!.refBlockId).toBe(other.id);
  });

  it('P9S-2：「保留为历史引用」过的那一次退役不解；整条取代时别的引用一起解', async () => {
    const { a, target, sameProject, crossProject } = await seed();
    sqlite
      .prepare('UPDATE blocks SET ref_block_id = ?, ref_reviewed_stale_at = 111 WHERE id = ?')
      .run(target.id, sameProject.id);
    sqlite.prepare('UPDATE blocks SET ref_block_id = ? WHERE id = ?').run(target.id, crossProject.id);
    sqlite.prepare('UPDATE blocks SET stale_at = 111 WHERE id = ?').run(target.id);

    // 开机那一次全库扫：确认过的留着，没确认的解掉。
    const swept = await releaseRefsToRetired();
    expect(swept.map((e) => e.citingId)).toEqual([crossProject.id]);
    expect((await getBlockById(sameProject.id))!.refBlockId).toBe(target.id);

    // 整条取代：取代它的那一块不算，别的引用一起解。
    const old = await createBlock({ threadId: a.id, content: '更旧的' });
    const citer = await createBlock({ threadId: a.id, content: '引它' });
    sqlite.prepare('UPDATE blocks SET ref_block_id = ? WHERE id = ?').run(old.id, citer.id);
    await replaceBlock(old.id, target.id, 222);
    expect((await getBlockById(citer.id))!.refBlockId).toBeNull();
  });

  it('⛔ supersedes 指着一块已退役的块不进队列 —— 那是正常状态', async () => {
    const { target, sameProject } = await seed();
    await setBlockSupersession(sameProject.id, target.id, 'supersedes', 111);
    // `setBlockSupersession` 自己就把目标退役了。
    expect(await listPendingRefReviews()).toEqual([]);
  });

  it('§3.2 ④ ①：审过之后不再重复询问', async () => {
    const { target, sameProject } = await seed();
    await sqlite
      .prepare('UPDATE blocks SET ref_block_id = ? WHERE id = ?')
      .run(target.id, sameProject.id);
    await setBlockStale(target.id, 111);

    await setRefReviewed(sameProject.id, 111);
    expect(await listPendingRefReviews()).toEqual([]);
  });

  // ⛔⛔ §3.2 ④ ②：改到别处**不继承**确认。
  it('§3.2 ④ ②：改引之后，确认作废', async () => {
    const { a, target, sameProject } = await seed();
    const other = await createBlock({ threadId: a.id, content: '另一块' });
    await sqlite
      .prepare('UPDATE blocks SET ref_block_id = ? WHERE id = ?')
      .run(target.id, sameProject.id);
    await setBlockStale(target.id, 111);
    await setRefReviewed(sameProject.id, 111);
    expect(await listPendingRefReviews()).toEqual([]);

    await repointCitation(sameProject.id, other.id, null, null);
    const row = await getBlockById(sameProject.id);
    expect(row!.refBlockId).toBe(other.id);
    expect(row!.refReviewedStaleAt).toBeNull();
  });

  it('重新声明关系（含清掉关系）也会作废确认', async () => {
    const { target, sameProject } = await seed();
    await sqlite
      .prepare('UPDATE blocks SET ref_block_id = ?, ref_reviewed_stale_at = 111 WHERE id = ?')
      .run(target.id, sameProject.id);

    await setBlockSupersession(sameProject.id, null, null, Date.now());
    const row = await getBlockById(sameProject.id);
    expect(row!.refBlockId).toBeNull();
    expect(row!.refReviewedStaleAt).toBeNull();
  });

  // ⛔ 「移除引用」不删任何块，也不取消目标的退役状态。
  it('清掉关系之后，两块都还在，目标照旧是退役的', async () => {
    const { target, sameProject } = await seed();
    await sqlite
      .prepare('UPDATE blocks SET ref_block_id = ? WHERE id = ?')
      .run(target.id, sameProject.id);
    await setBlockStale(target.id, 111);

    await setBlockSupersession(sameProject.id, null, null, Date.now());
    expect(await getBlockById(target.id)).not.toBeNull();
    expect((await getBlockById(target.id))!.staleAt).toBe(111);
    expect(await getBlockById(sameProject.id)).not.toBeNull();
  });
});

// P9B-3 (周回顾「活动」): this week's new blocks per project, in three kinds. ⛔ No second rule:
// the same labels as listCapturesSince / countMcpBlocks, sorted the same way.
describe('countBlocksByProjectSince', () => {
  let sqlite: Sqlite;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('sorts each block the way the rest of Spool does, and leaves the tutorial out', async () => {
    const ws = await createWorkspace('工作区');
    const a = await createThread(ws.id, 'A');
    const b = await createThread(ws.id, 'B');
    const gone = await createThread(ws.id, '删掉的');
    for (const source of [null, 'Safari', 'Chrome', '那本书', 'Claude · MCP', 'MCP', 'Spool 指南', 'Spool Guide']) {
      await createBlock({ threadId: a.id, content: source ?? 'user', source });
    }
    const retired = await createBlock({ threadId: b.id, content: '不作数了的', source: 'Safari' });
    sqlite.prepare('UPDATE blocks SET stale_at = ? WHERE id = ?').run(Date.now(), retired.id);
    const old = await createBlock({ threadId: b.id, content: '上周的', source: null });
    await createBlock({ threadId: gone.id, content: '删掉的项目里', source: null });
    sqlite.prepare('UPDATE threads SET deleted_at = ? WHERE id = ?').run(Date.now(), gone.id);
    const since = Date.now() - 60_000;
    sqlite.prepare('UPDATE blocks SET created_at = ? WHERE id = ?').run(since - 7 * 86_400_000, old.id);

    const rows = await countBlocksByProjectSince(since);
    const byId = Object.fromEntries(rows.map((r) => [r.threadId, r]));
    expect(byId[a.id]).toEqual({ threadId: a.id, capture: 3, self: 1, ai: 2 });
    // a block marked 「不作数了」 was still added this week; last week's is not this week's
    expect(byId[b.id]).toEqual({ threadId: b.id, capture: 1, self: 0, ai: 0 });
    expect(byId[gone.id]).toBeUndefined();
  });
});

describe('countStitches / listStitchTimesSince (织布)', () => {
  let sqlite: Sqlite;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('counts exactly what 活动 calls captured + written by you — never the AI, the tutorial or a deleted project', async () => {
    const ws = await createWorkspace('工作区');
    const a = await createThread(ws.id, 'A');
    const b = await createThread(ws.id, 'B');
    const gone = await createThread(ws.id, '删掉的');
    for (const source of [null, '', 'Safari', 'Chrome', '那本书', 'Claude · MCP', 'MCP', 'Spool 指南', 'Spool Guide']) {
      await createBlock({ threadId: a.id, content: source ?? 'user', source });
    }
    const old = await createBlock({ threadId: b.id, content: '上周的', source: 'Safari' });
    await createBlock({ threadId: gone.id, content: '删掉的项目里', source: null });
    sqlite.prepare('UPDATE threads SET deleted_at = ? WHERE id = ?').run(Date.now(), gone.id);
    const since = Date.now() - 60_000;
    sqlite.prepare('UPDATE blocks SET created_at = ? WHERE id = ?').run(since - 7 * 86_400_000, old.id);

    // null + '' (yours) + Safari, Chrome, 那本书 (captured) + last week's capture = 6
    expect(await countStitches()).toBe(6);
    const times = await listStitchTimesSince(since);
    expect(times).toHaveLength(5);
    expect([...times].sort((x, y) => x - y)).toEqual(times);

    // the same blocks the weekly 活动 panel counts, so the two can never disagree
    const week = await countBlocksByProjectSince(since);
    expect(week.reduce((n, r) => n + r.capture + r.self, 0)).toBe(times.length);
  });

  it('a deleted block takes its stitch with it', async () => {
    const ws = await createWorkspace('工作区');
    const a = await createThread(ws.id, 'A');
    const x = await createBlock({ threadId: a.id, content: 'x', source: null });
    await createBlock({ threadId: a.id, content: 'y', source: 'Safari' });
    expect(await countStitches()).toBe(2);
    await deleteBlock(x.id);
    expect(await countStitches()).toBe(1);
  });
});
