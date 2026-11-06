import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// P15-2（Ocean 2026-11-06 选甲）—— AI 提议把工作区连到一个文件夹。⚠️ 真 SQLite（`node:sqlite` + 真的 schema.sql）；
// 连文件夹那几个 Rust 命令换成记账的假 invoke —— 这里钉的是「点了什么才调什么」，连接本身由 folder_link.rs 的测试管。

const calls: [string, Record<string, unknown>][] = [];
const invoke = vi.fn(async (cmd: string, args: Record<string, unknown>) => {
  calls.push([cmd, args]);
  return null;
});
vi.mock('@tauri-apps/api/core', () => ({ invoke: (cmd: string, args: Record<string, unknown>) => invoke(cmd, args) }));

import { __setTestDb } from '@/lib/db/client';
import { countPendingFolderProposals, listPendingFolderProposals } from '@/lib/db/folderProposals';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace, softDeleteWorkspace } from '@/lib/db/workspaces';
import { t } from '@/lib/i18n';
import { useProposalsStore } from './proposalsStore';
import { useToastStore } from './toastStore';

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

const DAY = 86_400_000;

describe('AI 提议连文件夹：卡片和那几个按钮 (P15-2)', () => {
  let sqlite: Sqlite;
  let wsId = '';
  let mainId = '';
  const propose = (id: string, kind: 'link' | 'state_files', extra: { expiresAt?: number; primary?: string | null } = {}) =>
    sqlite
      .prepare(
        `INSERT INTO folder_proposals (id, kind, client, workspace_id, path, state_files, primary_thread_id, why,
           created_at, expires_at) VALUES (?, ?, 'Codex · MCP', ?, '/Users/a/thesis', '["README.md","plans/HANDOFF_*.md"]', ?, '论文在这儿', ?, ?)`,
      )
      .run(id, kind, wsId, extra.primary === undefined ? mainId : extra.primary, Date.now(), extra.expiresAt ?? Date.now() + 7 * DAY);
  const left = () => (sqlite.prepare('SELECT id FROM folder_proposals ORDER BY id').all() as { id: string }[]).map((r) => r.id);
  const linkTo = (path: string) =>
    sqlite.exec(
      `INSERT INTO folders (id, path, snapshot, synced_at, created_at) VALUES ('f1', '${path}', '{}', 1, 1);
       INSERT INTO workspace_folders (workspace_id, folder_id, primary_thread_id, state_files, created_at)
         VALUES ('${wsId}', 'f1', NULL, '["README.md"]', 1);`,
    );

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    calls.length = 0;
    useToastStore.setState({ toasts: [] });
    useProposalsStore.setState({ busy: false, panelOpen: false, folderProposals: null });
    const ws = await createWorkspace('论文');
    wsId = ws.id;
    mainId = (await createThread(ws.id, '第一章')).id;
  });

  it('列出来的卡带着工作区名、现状文件、主项目；过期的、工作区删了的不算', async () => {
    propose('p1', 'link');
    const [card] = await listPendingFolderProposals(Date.now());
    expect(card).toMatchObject({
      kind: 'link',
      workspaceTitle: '论文',
      path: '/Users/a/thesis',
      stateFiles: ['README.md', 'plans/HANDOFF_*.md'],
      primaryTitle: '第一章',
      linkedPath: null,
      why: '论文在这儿',
    });
    expect(await countPendingFolderProposals(Date.now())).toBe(1);
    await useProposalsStore.getState().refresh();
    expect(useProposalsStore.getState().pendingCount).toBe(1);

    sqlite.exec('DELETE FROM folder_proposals');
    propose('p2', 'link', { expiresAt: Date.now() - 1 });
    expect(await countPendingFolderProposals(Date.now())).toBe(0);
    propose('p3', 'link');
    await softDeleteWorkspace(wsId);
    expect(await listPendingFolderProposals(Date.now())).toEqual([]);
  });

  it('「不同意」只删这张卡，⛔ 一个连文件夹的命令都不调', async () => {
    propose('p1', 'link');
    await useProposalsStore.getState().rejectFolderProposal('p1');
    expect(left()).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('连接对话框连好之后：设主项目、删卡；没提主项目就不设', async () => {
    propose('p1', 'link');
    await useProposalsStore.getState().folderLinked('p1');
    expect(calls.map(([cmd]) => cmd)).toEqual(['folder_set_primary', 'folder_linked_workspaces']);
    expect(calls[0]![1]).toEqual({ workspaceId: wsId, threadId: mainId });
    expect(left()).toEqual([]);

    calls.length = 0;
    propose('p2', 'link', { primary: null });
    await useProposalsStore.getState().folderLinked('p2');
    expect(calls.map(([cmd]) => cmd)).not.toContain('folder_set_primary');
    expect(left()).toEqual([]);
  });

  it('「换成这几份」：还连着这个文件夹才换；换了文件夹就不动、说清楚', async () => {
    propose('p1', 'state_files');
    linkTo('/Users/a/thesis');
    await useProposalsStore.getState().approveFolderStateFiles('p1');
    expect(calls[0]).toEqual(['folder_set_state_files', { workspaceId: wsId, stateFiles: ['README.md', 'plans/HANDOFF_*.md'] }]);
    expect(calls[1]).toEqual(['folder_set_primary', { workspaceId: wsId, threadId: mainId }]);
    expect(left()).toEqual([]);
    expect(useToastStore.getState().toasts.map((x) => x.message)).toContain(t('「{ws}」的现状文件换好了。', { ws: '论文' }));

    calls.length = 0;
    sqlite.exec("UPDATE folders SET path = '/Users/a/elsewhere'");
    propose('p2', 'state_files');
    await useProposalsStore.getState().approveFolderStateFiles('p2');
    expect(calls.map(([cmd]) => cmd)).not.toContain('folder_set_state_files');
    expect(left()).toEqual(['p2']);
    expect(useToastStore.getState().toasts.map((x) => x.message)).toContain(t('「{ws}」现在没连着这个文件夹了，没有换。', { ws: '论文' }));
  });
});
