import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';
import { useThreadsStore } from '@/stores/threadsStore';
import { useToastStore } from '@/stores/toastStore';
import { useWorkspacesStore } from '@/stores/workspacesStore';
import { __setTestDb } from './client';
import schemaSql from './schema.sql?raw';
import {
  createThread,
  listAllThreads,
  restoreThread,
  softDeleteThread,
  updateThread,
} from './threads';
import { mergeLibrary } from './transfer';
import {
  createWorkspace,
  listWorkspaces,
  renameWorkspace,
  restoreWorkspace,
  setWorkspaceParent,
  softDeleteWorkspace,
} from './workspaces';

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

const freshDb = (): { handle: Sqlite; db: Database } => {
  const handle = new DatabaseSync(':memory:');
  handle.exec(schemaSql.replace(/--.*$/gm, ''));
  return { handle, db: makeAdapter(handle) };
};

const projectTitles = async (workspaceId: string): Promise<string[]> =>
  (await listAllThreads())
    .filter((t) => t.workspaceId === workspaceId)
    .map((t) => t.title)
    .sort();

// P9-1 (Ocean 2026-10-10 第 54、62、64、65 条) — 「一个工作区不能有一样名字的项目」, and the same
// for workspaces on one level. Every way a name lands somewhere, one test each. The rule itself
// (「 2」/「 3」, case, blanks, empty names) is pinned in lib/names/uniqueTitle.test.ts.
describe('同一个工作区里不许重名 (P9-1)', () => {
  let handle: Sqlite;

  beforeEach(() => {
    ({ handle } = (() => {
      const f = freshDb();
      __setTestDb(f.db);
      return f;
    })());
  });

  afterEach(() => {
    __setTestDb(null);
    handle.close();
  });

  describe('项目', () => {
    it('新建：同一个工作区里撞了名就加「 2」，大小写不同也算撞', async () => {
      const ws = await createWorkspace('COMP3074');
      await createThread(ws.id, 'Flux');

      expect((await createThread(ws.id, 'flux')).title).toBe('flux 2');
      expect((await createThread(ws.id, 'Flux')).title).toBe('Flux 3');
    });

    it('新建：空名字不算，连按两次 ＋ 两个「无标题」都在', async () => {
      const ws = await createWorkspace('COMP3074');
      await createThread(ws.id);
      await createThread(ws.id);

      expect(await projectTitles(ws.id)).toEqual(['', '']);
    });

    it('新建：别的工作区里的同名项目不算', async () => {
      const a = await createWorkspace('A');
      const b = await createWorkspace('B');
      await createThread(a.id, 'Flux');

      expect((await createThread(b.id, 'Flux')).title).toBe('Flux');
    });

    it('新建：删掉的项目不算', async () => {
      const ws = await createWorkspace('A');
      const gone = await createThread(ws.id, 'Flux');
      await softDeleteThread(gone.id);

      expect((await createThread(ws.id, 'Flux')).title).toBe('Flux');
    });

    it('新建：和同一层的子工作区重名不算 —— 项目和子工作区不互相比', async () => {
      const ws = await createWorkspace('A');
      await createWorkspace('Notes', ws.id);

      expect((await createThread(ws.id, 'Notes')).title).toBe('Notes');
    });

    it('改名：撞了加「 2」；改回自己原来的名字不算撞', async () => {
      const ws = await createWorkspace('A');
      await createThread(ws.id, 'Flux');
      const other = await createThread(ws.id, 'Lecture 4');

      expect((await updateThread(other.id, { title: 'FLUX' })).title).toBe('FLUX 2');
      expect((await updateThread(other.id, { title: 'FLUX 2' })).title).toBe('FLUX 2');
      expect(await projectTitles(ws.id)).toEqual(['FLUX 2', 'Flux']);
    });

    it('改名：只改别的字段时不碰名字', async () => {
      const ws = await createWorkspace('A');
      const t = await createThread(ws.id, 'Flux');

      expect((await updateThread(t.id, { status: 'parked' })).title).toBeUndefined();
    });

    it('挪到别的工作区：那边有同名的就加「 2」', async () => {
      const a = await createWorkspace('A');
      const b = await createWorkspace('B');
      await createThread(b.id, 'flux');
      const moving = await createThread(a.id, 'Flux');

      expect((await updateThread(moving.id, { workspaceId: b.id })).title).toBe('Flux 2');
      expect(await projectTitles(b.id)).toEqual(['Flux 2', 'flux']);
    });

    it('撤销删除：删掉之后又建了一个同名的，回来的那个加「 2」', async () => {
      const ws = await createWorkspace('A');
      const old = await createThread(ws.id, 'Flux');
      await softDeleteThread(old.id);
      await createThread(ws.id, 'Flux');

      await restoreThread(old.id);

      expect(await projectTitles(ws.id)).toEqual(['Flux', 'Flux 2']);
    });

    it('撤销删除：没有撞名就原样回来', async () => {
      const ws = await createWorkspace('A');
      const old = await createThread(ws.id, 'Flux');
      await softDeleteThread(old.id);

      await restoreThread(old.id);

      expect(await projectTitles(ws.id)).toEqual(['Flux']);
    });
  });

  describe('工作区', () => {
    it('新建：同一层撞了名就加「 2」；不同层不算', async () => {
      const top = await createWorkspace('升学');
      expect((await createWorkspace('升学')).title).toBe('升学 2');

      await createWorkspace('Notes', top.id);
      expect((await createWorkspace('notes', top.id)).title).toBe('notes 2');
      // Top level and inside 升学 are two levels.
      expect((await createWorkspace('Notes')).title).toBe('Notes');
    });

    it('改名：撞了加「 2」，回的是存下来的名字', async () => {
      await createWorkspace('升学');
      const other = await createWorkspace('求职');

      expect((await renameWorkspace(other.id, ' 升学 ')).title).toBe('升学 2');
      expect((await listWorkspaces()).map((w) => w.title).sort()).toEqual(['升学', '升学 2']);
    });

    it('拖成子工作区：那一层有同名的就加「 2」；挪回最顶层同样查', async () => {
      const parent = await createWorkspace('升学');
      await createWorkspace('文书', parent.id);
      const loose = await createWorkspace('文书');

      expect((await setWorkspaceParent(loose.id, parent.id)).title).toBe('文书 2');

      await createWorkspace('文书');
      expect((await setWorkspaceParent(loose.id, null)).title).toBe('文书 2');
    });

    it('撤销删除：删掉之后同一层又建了同名的，回来的那个加「 2」，里面的项目照原样', async () => {
      const ws = await createWorkspace('升学');
      await createThread(ws.id, 'Flux');
      const at = await softDeleteWorkspace(ws.id);
      await createWorkspace('升学');

      await restoreWorkspace(ws.id, at);

      expect((await listWorkspaces()).map((w) => w.title).sort()).toEqual(['升学', '升学 2']);
      expect(await projectTitles(ws.id)).toEqual(['Flux']);
    });
  });

  // 「是用户自己的动作被改了名 ⇒ 弹一句提示」; an undo or an import does it silently. A typed
  // rename is said by the box it is typed in, once the user is done (components), so the store
  // path a rename takes says nothing — that is pinned here too.
  describe('提示', () => {
    beforeEach(() => {
      useSettingsStore.setState({ language: 'zh' });
      useToastStore.setState({ toasts: [] });
      useThreadsStore.setState({ threadsByWorkspace: {} });
      useWorkspacesStore.setState({ workspaces: [] });
    });

    const messages = (): string[] => useToastStore.getState().toasts.map((t) => t.message);

    it('挪项目到有同名项目的工作区 ⇒ 说一句', async () => {
      const a = await createWorkspace('A');
      const b = await createWorkspace('B');
      await createThread(b.id, 'Flux');
      const moving = await createThread(a.id, 'Flux');
      await useThreadsStore.getState().loadAll();

      await useThreadsStore.getState().moveMany([moving.id], b.id);

      expect(messages()).toEqual(['同一个工作区里已经有叫「Flux」的项目了，这个改叫「Flux 2」']);
      expect((await listAllThreads()).find((t) => t.id === moving.id)?.title).toBe('Flux 2');
    });

    it('挪工作区到有同名的那一层 ⇒ 说一句', async () => {
      const parent = await createWorkspace('升学');
      await createWorkspace('文书', parent.id);
      const loose = await createWorkspace('文书');
      await useWorkspacesStore.getState().load();

      await useWorkspacesStore.getState().move(loose.id, parent.id);

      expect(messages()).toEqual(['同一层已经有叫「文书」的工作区了，这个改叫「文书 2」']);
    });

    it('改名走的那条路不说（打字时每 200ms 存一次，停顿不该弹提示）', async () => {
      const ws = await createWorkspace('A');
      await createThread(ws.id, 'Flux');
      const other = await createThread(ws.id, '');
      await useThreadsStore.getState().loadAll();

      expect(await useThreadsStore.getState().patch(other.id, { title: 'Flux' })).toBe('Flux 2');
      expect(messages()).toEqual([]);
    });

    it('英文界面说英文', async () => {
      useSettingsStore.setState({ language: 'en' });
      const a = await createWorkspace('A');
      const b = await createWorkspace('B');
      await createThread(b.id, 'Flux');
      const moving = await createThread(a.id, 'flux');
      await useThreadsStore.getState().loadAll();

      await useThreadsStore.getState().moveMany([moving.id], b.id);

      expect(messages()).toEqual([
        'This workspace already has a project called “flux”, so this one is now “flux 2”.',
      ]);
    });

    it('没撞名的挪动不说', async () => {
      const a = await createWorkspace('A');
      const b = await createWorkspace('B');
      const moving = await createThread(a.id, 'Flux');
      await useThreadsStore.getState().loadAll();

      await useThreadsStore.getState().moveMany([moving.id], b.id);

      expect(messages()).toEqual([]);
    });
  });
});

describe('导入别的库时撞名 (P9-1)', () => {
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

  const titles = (h: Sqlite, table: 'workspaces' | 'threads'): string[] =>
    (h.prepare(`SELECT title FROM ${table} ORDER BY title`).all() as { title: string }[]).map(
      (r) => r.title,
    );

  it('带进来的工作区和这边最顶层的同名 ⇒ 加「 2」，里面的项目不用改', async () => {
    __setTestDb(dst.db);
    await createWorkspace('升学');
    __setTestDb(src.db);
    const ws = await createWorkspace('升学');
    await createThread(ws.id, 'Flux');
    __setTestDb(null);

    await mergeLibrary(src.db, dst.db);

    expect(titles(dst.handle, 'workspaces')).toEqual(['升学', '升学 2']);
    expect(titles(dst.handle, 'threads')).toEqual(['Flux']);
  });

  it('带进来的项目落进这边已有的工作区（同一个 id）、和那里的项目同名 ⇒ 加「 2」', async () => {
    __setTestDb(src.db);
    const ws = await createWorkspace('升学');
    await createThread(ws.id, 'Flux');
    __setTestDb(null);
    await mergeLibrary(src.db, dst.db); // the same workspace now lives on both sides
    __setTestDb(src.db);
    await createThread(ws.id, 'flux');
    __setTestDb(null);

    await mergeLibrary(src.db, dst.db);

    expect(titles(dst.handle, 'threads')).toEqual(['Flux', 'flux 2']);
  });

  it('同一份库再导一次，已经有的那几行名字不变', async () => {
    __setTestDb(src.db);
    const ws = await createWorkspace('升学');
    await createThread(ws.id, 'Flux');
    __setTestDb(null);

    await mergeLibrary(src.db, dst.db);
    await mergeLibrary(src.db, dst.db);

    expect(titles(dst.handle, 'workspaces')).toEqual(['升学']);
    expect(titles(dst.handle, 'threads')).toEqual(['Flux']);
  });

  it('带进来的已删除项目不改名（撤销删除时再查）', async () => {
    __setTestDb(dst.db);
    const here = await createWorkspace('升学');
    __setTestDb(null);
    // The incoming library holds a deleted project in the SAME workspace (same id).
    src.handle
      .prepare('INSERT INTO workspaces (id, title, sort_order, created_at, updated_at) VALUES (?, ?, 0, 1, 1)')
      .run(here.id, '升学');
    src.handle
      .prepare(
        "INSERT INTO threads (id, workspace_id, title, status, is_capture_target, created_at, updated_at, deleted_at) VALUES ('gone', ?, 'Flux', 'active', 0, 1, 1, 5)",
      )
      .run(here.id);
    dst.handle
      .prepare(
        "INSERT INTO threads (id, workspace_id, title, status, is_capture_target, created_at, updated_at) VALUES ('live', ?, 'Flux', 'active', 0, 1, 1)",
      )
      .run(here.id);

    await mergeLibrary(src.db, dst.db);

    expect(titles(dst.handle, 'threads')).toEqual(['Flux', 'Flux']);
  });
});
