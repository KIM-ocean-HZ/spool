import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createAttachment,
  setAttachmentAnchor,
  setAttachmentSuperseded,
  type Attachment,
} from '@/lib/db/attachments';
import { createBlock, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread, type Thread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { assemble } from '@/lib/pack/assemble';
import { clear as clearUndoLog } from '@/lib/undo/undoLog';
import { useBlocksStore } from './blocksStore';
import { useUndoStore } from './undoStore';

// P7-1 (Ocean 2026-10-07, DISCOVERED-20261007-1 甲) — taking a newer version out of the project
// puts the one it replaced back into use. ⚠️ Real SQLite (`node:sqlite` + the real schema.sql):
// the assertions are on the two columns both pack renderers read (`superseded_by` /
// `superseded_at` — mcp.rs filters on `superseded_by IS NULL`, assemble.ts on `supersededBy`).

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

describe('去掉新版时，旧版恢复成现用 (P7-1)', () => {
  let sqlite: Sqlite;
  let thread: Thread;
  let b1: Block;
  let b2: Block;
  let v1: Attachment;
  let v2: Attachment;

  const marks = (id: string) =>
    sqlite.prepare('SELECT superseded_by, superseded_at FROM attachments WHERE id = ?').get(id) as
      | { superseded_by: string | null; superseded_at: number | null }
      | undefined;
  const store = () => useBlocksStore.getState();
  const inMemory = (id: string) => store().attachmentsByThread[thread.id]?.find((a) => a.id === id);
  // What the pack and the block see — the same predicates assemble.ts and BlockItem use.
  const pack = () =>
    assemble({
      thread,
      blocks: store().byThread[thread.id] ?? [],
      attachments: store().attachmentsByThread[thread.id] ?? [],
      now: Date.UTC(2026, 9, 7),
    });
  const onBlock = (blockId: string) =>
    (store().attachmentsByThread[thread.id] ?? [])
      .filter((a) => a.anchorBlockId === blockId && a.supersededBy == null)
      .map((a) => a.label);

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    clearUndoLog();
    useUndoStore.setState({ entries: [], redoable: null });
    useBlocksStore.setState({ byThread: {}, attachmentsByThread: {}, selectedBlockIds: new Set() });

    const ws = await createWorkspace('W');
    thread = await createThread(ws.id, '申请规划');
    b1 = await createBlock({ threadId: thread.id, content: '第一块' });
    b2 = await createBlock({ threadId: thread.id, content: '第二块' });
    v1 = await createAttachment({ threadId: thread.id, kind: 'file', target: '/Users/a/方案-v1.pdf', label: '方案-v1.pdf' });
    v2 = await createAttachment({ threadId: thread.id, kind: 'file', target: '/Users/a/方案-v2.pdf', label: '方案-v2.pdf' });
    await setAttachmentAnchor(v1.id, b1.id);
    await setAttachmentSuperseded(v1.id, v2.id, 1_000);
    await store().load(thread.id);
    expect(pack()).not.toContain('方案-v1.pdf');
    expect(onBlock(b1.id)).toEqual([]);
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('右栏 × 掉新版：旧版两列清空，重新进 pack，块上那一行重新出现', async () => {
    await store().detach(v2.id, thread.id);
    expect(marks(v2.id)).toBeUndefined();
    expect(marks(v1.id)).toEqual({ superseded_by: null, superseded_at: null });
    expect(inMemory(v1.id)).toMatchObject({ supersededBy: null, supersededAt: null });
    expect(pack()).toContain('方案-v1.pdf');
    expect(onBlock(b1.id)).toEqual(['方案-v1.pdf']);
  });

  it('删块时「一起去掉」带走新版：同样恢复；⌘Z 新版回来、旧版重新收在它下面；重做再恢复', async () => {
    await setAttachmentAnchor(v2.id, b2.id);
    await store().load(thread.id);
    await store().remove(b2.id, { removeFiles: true });
    expect(marks(v2.id)).toBeUndefined();
    expect(marks(v1.id)).toEqual({ superseded_by: null, superseded_at: null });
    expect(inMemory(v1.id)?.supersededBy).toBeNull();
    expect(pack()).toContain('方案-v1.pdf');
    expect(onBlock(b1.id)).toEqual(['方案-v1.pdf']);

    await useUndoStore.getState().undo();
    expect(marks(v2.id)).toEqual({ superseded_by: null, superseded_at: null });
    expect(marks(v1.id)).toEqual({ superseded_by: v2.id, superseded_at: 1_000 });

    await useUndoStore.getState().redo();
    expect(marks(v2.id)).toBeUndefined();
    expect(marks(v1.id)).toEqual({ superseded_by: null, superseded_at: null });
  });

  it('连着取代 v1 ← v2 ← v3：× 掉 v3 只有 v2 回到现用，v1 仍收在 v2 下面', async () => {
    const v3 = await createAttachment({ threadId: thread.id, kind: 'file', target: '/Users/a/方案-v3.pdf', label: '方案-v3.pdf' });
    await setAttachmentSuperseded(v2.id, v3.id, 2_000);
    await store().load(thread.id);

    await store().detach(v3.id, thread.id);
    expect(marks(v2.id)).toEqual({ superseded_by: null, superseded_at: null });
    expect(marks(v1.id)).toEqual({ superseded_by: v2.id, superseded_at: 1_000 });
    expect(inMemory(v1.id)?.supersededBy).toBe(v2.id);
    expect(pack()).toContain('方案-v2.pdf');
    expect(pack()).not.toContain('方案-v1.pdf');
  });

  it('去掉一个没取代过别人的文件：别的行一个字不动', async () => {
    const before = sqlite.prepare('SELECT * FROM attachments WHERE id = ?').get(v1.id);
    const other = await createAttachment({ threadId: thread.id, kind: 'file', target: '/Users/a/x.txt', label: 'x.txt' });
    await store().load(thread.id);
    await store().detach(other.id, thread.id);
    expect(sqlite.prepare('SELECT * FROM attachments WHERE id = ?').get(v1.id)).toEqual(before);
  });
});
