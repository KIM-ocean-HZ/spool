import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// P12-2（DISCOVERED-20261025-11）：「改过」以前只记在内存里，重启就没了。现在记进库里那个文件的
// `target_notice`（「还要告诉用户的事」，v33 就有的列 —— 不加列、不加表），标到用户点开那个文件为止。
// ⚠️ 真 SQLite（`node:sqlite` + 真 schema.sql）；Rust 那边的 `locate_files` 照 file_follow.rs 的样子
// 站在同一个库上：文件在原处时 notice 原样带回来，`changed` 由这里说了算。

let sqliteRef: InstanceType<typeof import('node:sqlite').DatabaseSync> | null = null;
let changedOnDisk = false;
const opened: string[] = [];
const invoke = vi.fn(async (cmd: string, args: Record<string, unknown>) => {
  if (cmd === 'locate_files') {
    return (args.ids as string[]).map((id) => {
      const r = sqliteRef!.prepare('SELECT target, target_notice AS n FROM attachments WHERE id = ?').get(id) as {
        target: string;
        n: string | null;
      };
      return { id, state: 'in_place', path: r.target, foundAt: null, notice: r.n, ...(changedOnDisk && { changed: true }) };
    });
  }
  if (cmd === 'file_stamp') return [12, 34];
  if (cmd === 'open_target') {
    opened.push(args.target as string);
    return null;
  }
  return null;
});
vi.mock('@tauri-apps/api/core', () => ({ invoke: (cmd: string, args: Record<string, unknown>) => invoke(cmd, args) }));
vi.mock('@/lib/attachments/extractor', () => ({
  extractAttachmentText: async () => ({ ok: true, text: '计划 v2', kind: 'plaintext' }),
}));

import { createAttachment } from '@/lib/db/attachments';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { CHANGED_NOTICE, DISMISSED_NOTICE } from '@/lib/files/locate';
import { openAttachment } from '@/lib/files/openFile';
import { useBlocksStore } from './blocksStore';
import { useSettingsStore } from './settingsStore';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
type Sqlite = InstanceType<typeof DatabaseSync>;
type SqlValue = string | number | bigint | null | Uint8Array;
const toNumbered = (sql: string): string => sql.replace(/\$(\d+)/g, '?$1');
const makeAdapter = (handle: Sqlite): Database =>
  ({
    execute: async (sql: string, params: unknown[] = []) => {
      const r = handle.prepare(toNumbered(sql)).run(...(params as SqlValue[]));
      return { rowsAffected: Number(r.changes), lastInsertId: Number(r.lastInsertRowid) };
    },
    select: async (sql: string, params: unknown[] = []) => handle.prepare(toNumbered(sql)).all(...(params as SqlValue[])),
  }) as unknown as Database;

describe('「改过」重启之后还在，点开那个文件才消失 (P12-2)', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let fileId = '';
  const noticeInLibrary = (): string | null =>
    (sqlite.prepare('SELECT target_notice AS n FROM attachments WHERE id = ?').get(fileId) as { n: string | null }).n;
  const store = () => useBlocksStore.getState();
  /** What the right rail draws the mark from (ProjectFiles.tsx). */
  const marked = (): boolean => store().reExtracted.has(fileId) || store().fileStates[fileId]?.notice === CHANGED_NOTICE;
  /** A restart: nothing in memory, the library as it was. */
  const restart = async () => {
    useBlocksStore.setState({ byThread: {}, attachmentsByThread: {}, fileStates: {}, reExtracted: new Set() });
    await store().load(threadId);
  };

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    sqliteRef = sqlite;
    __setTestDb(makeAdapter(sqlite));
    changedOnDisk = false;
    opened.length = 0;
    useSettingsStore.setState({ autoExtractAttachments: true });
    const ws = await createWorkspace('W');
    threadId = (await createThread(ws.id, 'Flux')).id;
    fileId = (await createAttachment({ threadId, kind: 'file', target: '/Users/a/WORK_PLAN.md', label: 'WORK_PLAN.md' })).id;
    sqlite
      .prepare("UPDATE attachments SET extracted_text = '计划 v1', extraction_kind = 'plaintext', extracted_at = 1 WHERE id = ?")
      .run(fileId);
    await restart();
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
    sqliteRef = null;
  });

  it('a changed file is marked in the library, still marked after a restart, and cleared by opening it', async () => {
    changedOnDisk = true;
    await store().locateFiles(threadId, [fileId]);
    expect(marked()).toBe(true);
    expect(noticeInLibrary()).toBe(CHANGED_NOTICE);

    changedOnDisk = false; // read again — the library's text is the current version now
    await restart();
    expect(store().reExtracted.size).toBe(0);
    await store().locateFiles(threadId, [fileId]);
    expect(marked()).toBe(true);

    const [file] = store().attachmentsByThread[threadId]!;
    await openAttachment(file!);
    expect(opened).toEqual(['/Users/a/WORK_PLAN.md']);
    expect(marked()).toBe(false);
    expect(noticeInLibrary()).toBeNull();
    await restart();
    await store().locateFiles(threadId, [fileId]);
    expect(marked()).toBe(false);
  });

  it('opened in the same look that found the change: not marked afterwards', async () => {
    changedOnDisk = true;
    const [file] = store().attachmentsByThread[threadId]!;
    await openAttachment(file!);
    expect(marked()).toBe(false);
    expect(noticeInLibrary()).toBeNull();
  });

  it('never replaces something else waiting to be said; opening leaves that alone too', async () => {
    const moved = JSON.stringify({ kind: 'moved', from: '/Users/a/old/WORK_PLAN.md' });
    for (const other of [moved, DISMISSED_NOTICE]) {
      sqlite.prepare('UPDATE attachments SET target_notice = ? WHERE id = ?').run(other, fileId);
      await restart();
      changedOnDisk = true;
      await store().locateFiles(threadId, [fileId]);
      expect(noticeInLibrary()).toBe(other);
      expect(marked()).toBe(true); // this session still says it
      const [file] = store().attachmentsByThread[threadId]!;
      await openAttachment(file!);
      expect(noticeInLibrary()).toBe(other);
    }
  });
});
