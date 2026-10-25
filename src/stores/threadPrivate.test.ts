import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// P9Y-3: going private disconnects the project's folder first — a Rust command.
const invoke = vi.fn(async (..._a: unknown[]): Promise<unknown> => undefined);
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { useThreadsStore } from './threadsStore';

const { DatabaseSync } = createRequire(import.meta.url)(
  'node:sqlite',
) as typeof import('node:sqlite');
type Sqlite = InstanceType<typeof DatabaseSync>;
type SqlValue = string | number | bigint | null | Uint8Array;
const toNumbered = (sql: string): string => sql.replace(/\$(\d+)/g, '?$1');

// tauri-plugin-sql's real binding: anything not null / string / number goes in as JSON text.
const asPluginSql = (handle: Sqlite): Database =>
  ({
    execute: async (sql: string, params: unknown[] = []) => {
      const bound = params.map((v) =>
        v == null || typeof v === 'string' || typeof v === 'number' ? (v as SqlValue) : JSON.stringify(v),
      );
      const r = handle.prepare(toNumbered(sql)).run(...bound);
      return { rowsAffected: Number(r.changes), lastInsertId: Number(r.lastInsertRowid) };
    },
    select: async (sql: string, params: unknown[] = []) =>
      handle.prepare(toNumbered(sql)).all(...(params as SqlValue[])),
  }) as unknown as Database;

// P9E-4 (Ocean 2026-10-15 第 119 条): the sidebar's right-click 「设为私密 / 取消私密」 acts on
// the whole selection, like 「移到工作区」, and the rows stay where they were.
describe('setPrivate (P9E-4)', () => {
  let handle: Sqlite;

  beforeEach(() => {
    handle = new DatabaseSync(':memory:');
    handle.exec(schemaSql.replace(/--.*$/gm, ''));
    __setTestDb(asPluginSql(handle));
  });

  afterEach(() => {
    __setTestDb(null);
    handle.close();
  });

  it('设为私密作用于整个选区，取消也一样；库里和左栏一起变，顺序不动', async () => {
    const ws = await createWorkspace('ws');
    const a = await createThread(ws.id, 'a');
    const b = await createThread(ws.id, 'b');
    const c = await createThread(ws.id, 'c');
    handle.prepare('UPDATE threads SET updated_at = CASE id WHEN ? THEN 3 WHEN ? THEN 2 ELSE 1 END').run(a.id, b.id);
    await useThreadsStore.getState().loadAll();
    const order = () => (useThreadsStore.getState().threadsByWorkspace[ws.id] ?? []).map((t) => t.id);
    const before = order();

    invoke.mockClear();
    await useThreadsStore.getState().setPrivate([a.id, c.id], true);
    // P9Y-3 (task book §3.7): each one is disconnected as going private — its name leaves SPOOL.md.
    expect(invoke.mock.calls).toEqual([
      ['folder_disconnect', { threadId: a.id, remove: false, private: true }],
      ['folder_disconnect', { threadId: c.id, remove: false, private: true }],
    ]);

    const flags = () =>
      Object.fromEntries((useThreadsStore.getState().threadsByWorkspace[ws.id] ?? []).map((t) => [t.title, t.isPrivate]));
    expect(flags()).toEqual({ a: true, b: false, c: true });
    expect(handle.prepare('SELECT title, private FROM threads ORDER BY title').all()).toEqual([
      { title: 'a', private: 1 },
      { title: 'b', private: 0 },
      { title: 'c', private: 1 },
    ]);
    expect(order()).toEqual(before);

    invoke.mockClear();
    await useThreadsStore.getState().setPrivate([a.id, c.id], false);
    expect(flags()).toEqual({ a: false, b: false, c: false });
    expect(invoke).not.toHaveBeenCalled();
  });
});
