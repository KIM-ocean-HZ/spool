import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// runUndo / runRedo show their card in the overlay window; nothing to show it in here.
const invoke = vi.fn().mockResolvedValue(undefined);
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

import { createBlock, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { clear as clearUndoLog } from '@/lib/undo/undoLog';
import { useBlocksStore } from '@/stores/blocksStore';
import { useUndoStore } from '@/stores/undoStore';
import { runRedo, runUndo, undoKeyIntent } from './useUndo';

// P9H-1（DISCOVERED-20261016-7，Ocean 10-16 第 142 条）：⌘Z 多按了一次，小卡 2.5 秒就收，
// 之后界面上没有任何地方能重做。主窗认 ⌘⇧Z（Ctrl+Shift+Z、Windows 上还有 Ctrl+Y）。

const key = (k: string, mods: { meta?: boolean; ctrl?: boolean; shift?: boolean; alt?: boolean } = {}) => ({
  key: k,
  metaKey: !!mods.meta,
  ctrlKey: !!mods.ctrl,
  shiftKey: !!mods.shift,
  altKey: !!mods.alt,
});

describe('undoKeyIntent：哪个键是撤销、哪个是重做', () => {
  it('Mac：⌘Z 撤销，⌘⇧Z 重做（Shift 按着时 key 是大写 Z）', () => {
    expect(undoKeyIntent(key('z', { meta: true }), true)).toBe('undo');
    expect(undoKeyIntent(key('Z', { meta: true, shift: true }), true)).toBe('redo');
    expect(undoKeyIntent(key('z', { meta: true, shift: true }), true)).toBe('redo');
  });

  it('Windows：Ctrl+Z 撤销，Ctrl+Shift+Z 和 Ctrl+Y 都是重做', () => {
    expect(undoKeyIntent(key('z', { ctrl: true }), false)).toBe('undo');
    expect(undoKeyIntent(key('Z', { ctrl: true, shift: true }), false)).toBe('redo');
    expect(undoKeyIntent(key('y', { ctrl: true }), false)).toBe('redo');
  });

  it('别的组合都不算', () => {
    expect(undoKeyIntent(key('z'), true)).toBeNull();
    expect(undoKeyIntent(key('z', { shift: true }), true)).toBeNull();
    expect(undoKeyIntent(key('z', { meta: true, alt: true }), true)).toBeNull();
    expect(undoKeyIntent(key('y', { meta: true }), true)).toBeNull(); // ⌘Y 在 Mac 上不是重做
    expect(undoKeyIntent(key('y', { ctrl: true }), true)).toBeNull();
    expect(undoKeyIntent(key('y', { ctrl: true, shift: true }), false)).toBeNull();
    expect(undoKeyIntent(key('x', { meta: true }), true)).toBeNull();
  });
});

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
    select: async (sql: string, params: unknown[] = []) =>
      handle.prepare(toNumbered(sql)).all(...(params as SqlValue[])),
  }) as unknown as Database;

describe('撤销之后小卡收了，⌘⇧Z 照样把刚撤的那一步做回来', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let block: Block;
  const inLibrary = (id: string) => !!sqlite.prepare('SELECT 1 FROM blocks WHERE id = ?').get(id);
  const onScreen = (id: string) => !!useBlocksStore.getState().byThread[threadId]?.some((b) => b.id === id);

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    clearUndoLog();
    useUndoStore.setState({ entries: [], redoable: null });
    useBlocksStore.setState({ byThread: {}, attachmentsByThread: {}, selectedBlockIds: new Set() });
    invoke.mockClear();
    const ws = await createWorkspace('W');
    threadId = (await createThread(ws.id, '老师信息')).id;
    await createBlock({ threadId, content: '第一块' });
    block = await createBlock({ threadId, content: '要删的那块' });
    await useBlocksStore.getState().load(threadId);
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('删一块 → ⌘Z 回来 → （小卡早收了）⌘⇧Z 又删掉 → ⌘Z 再回来', async () => {
    await useBlocksStore.getState().remove(block.id, { removeFiles: false });
    expect(inLibrary(block.id)).toBe(false);

    await runUndo();
    expect(inLibrary(block.id)).toBe(true);
    expect(onScreen(block.id)).toBe(true);

    // 小卡只是界面：它收没收，重做都在 store 里等着。
    await runRedo();
    expect(inLibrary(block.id)).toBe(false);
    expect(onScreen(block.id)).toBe(false);

    await runUndo();
    expect(inLibrary(block.id)).toBe(true);
  });

  it('没有可重做的：什么都不做，也不弹卡', async () => {
    await runRedo();
    expect(invoke).not.toHaveBeenCalled();
    expect(inLibrary(block.id)).toBe(true);
  });
});
