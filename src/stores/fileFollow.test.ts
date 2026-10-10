import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

import { createAttachment, type Attachment } from '@/lib/db/attachments';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { DISMISSED_NOTICE, type FileState } from '@/lib/files/locate';
import { useBlocksStore } from './blocksStore';

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

// P9-3 — the store side of following a file. The looking (and the follow's own write) is Rust's
// and has its tests in file_follow.rs; this pins what the list on screen does with the answer.
describe('文件挪了 Spool 跟着找到 —— 界面那一侧 (P9-3)', () => {
  let sqlite: Sqlite;
  let threadId: string;
  let file: Attachment;
  const store = () => useBlocksStore.getState();
  const inList = () => store().attachmentsByThread[threadId]?.find((a) => a.id === file.id);

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    invoke.mockReset();
    useBlocksStore.setState({ byThread: {}, attachmentsByThread: {}, fileStates: {} });
    const ws = await createWorkspace('COMP3074');
    threadId = (await createThread(ws.id, 'HAI-Lecture3')).id;
    file = await createAttachment({ threadId, kind: 'file', target: '/Users/x/Desktop/Lecture 3.pdf' });
    await store().load(threadId);
  });

  it('跟过去了 ⇒ 列表里的路径换成新的，状态记下来', async () => {
    const moved: FileState = {
      id: file.id,
      state: 'moved',
      path: '/Users/x/Desktop/HAI/Lecture 3.pdf',
      foundAt: null,
      notice: JSON.stringify({ kind: 'moved', from: '/Users/x/Desktop/Lecture 3.pdf' }),
    };
    invoke.mockResolvedValueOnce([moved]);

    await store().locateFiles(threadId, [file.id]);

    expect(invoke).toHaveBeenCalledWith('locate_files', { ids: [file.id] });
    expect(inList()?.target).toBe('/Users/x/Desktop/HAI/Lecture 3.pdf');
    expect(store().fileStates[file.id]).toEqual(moved);
  });

  it('找不到的 ⇒ 路径不动，只记下是哪一种', async () => {
    invoke.mockResolvedValueOnce([
      { id: file.id, state: 'unknown', path: file.target, foundAt: null, notice: null },
    ]);

    await store().locateFiles(threadId, [file.id]);

    expect(inList()?.target).toBe(file.target);
    expect(store().fileStates[file.id]?.state).toBe('unknown');
  });

  it('看不了（Rust 报错）不是要告诉用户的事 ⇒ 列表照旧', async () => {
    invoke.mockRejectedValueOnce(new Error('database is locked'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await store().locateFiles(threadId, [file.id])).toEqual([]);
    expect(inList()?.target).toBe(file.target);
    warn.mockRestore();
  });

  it('挂上的那一刻就去记身份', async () => {
    invoke.mockResolvedValue([]);
    const a = await store().attach({ threadId, kind: 'folder', target: '/Users/x/Desktop/HAI' });
    expect(invoke).toHaveBeenCalledWith('locate_files', { ids: [a.id] });
  });

  it('「是这个」⇒ 路径换成选的那个，状态是在原处', async () => {
    invoke.mockResolvedValueOnce({
      id: file.id,
      state: 'in_place',
      path: '/Users/x/Desktop/HAI/Lecture 3.pdf',
      foundAt: null,
      notice: null,
    });

    await store().relocateFile(threadId, file.id, '/Users/x/Desktop/HAI/Lecture 3.pdf');

    expect(invoke).toHaveBeenCalledWith('relocate_file', {
      id: file.id,
      path: '/Users/x/Desktop/HAI/Lecture 3.pdf',
    });
    expect(inList()?.target).toBe('/Users/x/Desktop/HAI/Lecture 3.pdf');
    expect(store().fileStates[file.id]?.state).toBe('in_place');
  });

  it('「知道了」写进库里那一列，界面上的状态跟着变', async () => {
    invoke.mockResolvedValueOnce([
      { id: file.id, state: 'deleted', path: file.target, foundAt: null, notice: null },
    ]);
    await store().locateFiles(threadId, [file.id]);

    await store().setFileNotice(file.id, DISMISSED_NOTICE);

    expect(sqlite.prepare('SELECT target_notice AS n FROM attachments WHERE id = ?').get(file.id)).toEqual({
      n: '{"kind":"dismissed"}',
    });
    expect(store().fileStates[file.id]?.notice).toBe(DISMISSED_NOTICE);

    await store().setFileNotice(file.id, null);
    expect(sqlite.prepare('SELECT target_notice AS n FROM attachments WHERE id = ?').get(file.id)).toEqual({ n: null });
  });
});
