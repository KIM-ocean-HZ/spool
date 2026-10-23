import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __setTestDb } from './client';
import schemaSql from './schema.sql?raw';
import { addFollowUpItem } from './followUpItems';
import {
  createThread,
  listAllThreads,
  listAutoFollowUpCandidates,
  setFollowUpState,
  setThreadPrivate,
} from './threads';
import { createWorkspace } from './workspaces';

const { DatabaseSync } = createRequire(import.meta.url)(
  'node:sqlite',
) as typeof import('node:sqlite');
type Sqlite = InstanceType<typeof DatabaseSync>;

type SqlValue = string | number | bigint | null | Uint8Array;
const toNumbered = (sql: string): string => sql.replace(/\$(\d+)/g, '?$1');

// tauri-plugin-sql as it really binds (plugin 2.4 `wrapper.rs`): anything that is not null, a
// string or a number goes in as its JSON text. A boolean handed straight to it lands as the
// TEXT 'true' — `private = 1` would then never match, and the project would quietly stay
// visible to every AI. node:sqlite on its own would refuse the boolean instead, hiding that.
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

// P9E-1 (Ocean 2026-10-15 第 119 条): a project carries whether it is private, and the user's
// own edit path can flip it both ways (P9E-4: without moving it in the sidebar).
describe('私密项目 (P9E-1)', () => {
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

  it('新建的项目是公开的', async () => {
    const ws = await createWorkspace('ws');
    const t = await createThread(ws.id, '体检');
    expect(t.isPrivate).toBe(false);
    expect((await listAllThreads())[0]?.isPrivate).toBe(false);
  });

  it('设为私密再取消，库里是 1 再回到 0，读出来跟着变', async () => {
    const ws = await createWorkspace('ws');
    const t = await createThread(ws.id, '体检');

    await setThreadPrivate(t.id, true);
    expect(handle.prepare('SELECT private FROM threads WHERE id = ?').get(t.id)).toEqual({ private: 1 });
    expect((await listAllThreads())[0]?.isPrivate).toBe(true);

    await setThreadPrivate(t.id, false);
    expect(handle.prepare('SELECT private FROM threads WHERE id = ?').get(t.id)).toEqual({ private: 0 });
    expect((await listAllThreads())[0]?.isPrivate).toBe(false);
  });

  // P9E-4: the sidebar sorts by updated_at — making a project private is not activity, and
  // must not lift it to the top of its workspace.
  it('设为私密不改 updated_at，项目在左栏不挪位置', async () => {
    const ws = await createWorkspace('ws');
    const t = await createThread(ws.id, '体检');
    handle.prepare('UPDATE threads SET updated_at = 5 WHERE id = ?').run(t.id);
    await setThreadPrivate(t.id, true);
    expect(handle.prepare('SELECT updated_at FROM threads WHERE id = ?').get(t.id)).toEqual({ updated_at: 5 });
  });
});

// P9S-6 (Ocean 2026-10-23 第 173 / 175 条): which projects the weekly follow-up may pick from.
describe('listAutoFollowUpCandidates (P9S-6)', () => {
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

  it('switched on, in progress, not private, still watching something — nothing else', async () => {
    const ws = await createWorkspace('ws');
    const on = '{"v":1,"lastRunAt":0,"seen":[],"auto":true}';
    const mk = async (title: string, state: string | null, opts: { line?: boolean } = {}) => {
      const t = await createThread(ws.id, title);
      await setFollowUpState(t.id, state);
      if (opts.line !== false) await addFollowUpItem(t.id, '截止日期公布了没有', false);
      return t;
    };
    const yes = await mk('开着', on);
    await mk('没开', '{"v":1,"lastRunAt":0,"seen":[]}');
    await mk('没有在跟的行', on, { line: false });
    const priv = await mk('私密', on);
    await setThreadPrivate(priv.id, true);
    const done = await mk('完成了', on);
    handle.prepare("UPDATE threads SET status = 'done' WHERE id = ?").run(done.id);

    expect((await listAutoFollowUpCandidates()).map((c) => c.id)).toEqual([yes.id]);
  });
});
