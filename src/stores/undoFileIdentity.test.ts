import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The two Rust commands (file_follow.rs keep_file_identities / restore_file_identities), stood in
// for against the same SQLite file — the BLOB goes out as hex and back with unhex, never through a
// query parameter of the webview's SQL plugin.
let sqliteRef: InstanceType<typeof import('node:sqlite').DatabaseSync> | null = null;
const invoke = vi.fn(async (cmd: string, args: Record<string, unknown>) => {
  const db = sqliteRef!;
  if (cmd === 'keep_file_identities') {
    return (args.ids as string[]).map((id) => {
      const r = db
        .prepare('SELECT hex(target_identity) AS h, target_notice AS n FROM attachments WHERE id = ?')
        .get(id) as { h: string | null; n: string | null } | undefined;
      return { id, identity: r?.h || null, notice: r?.n ?? null };
    });
  }
  if (cmd === 'restore_file_identities') {
    for (const k of args.kept as { id: string; identity: string | null; notice: string | null }[]) {
      db.prepare('UPDATE attachments SET target_identity = unhex(?), target_notice = ? WHERE id = ?').run(
        k.identity,
        k.notice,
        k.id,
      );
    }
    return null;
  }
  return null; // the undo card
});
vi.mock('@tauri-apps/api/core', () => ({ invoke: (cmd: string, args: Record<string, unknown>) => invoke(cmd, args) }));

import { createAttachment, setAttachmentAnchor } from '@/lib/db/attachments';
import { createBlock, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { clear as clearUndoLog } from '@/lib/undo/undoLog';
import { useBlocksStore } from './blocksStore';
import { useUndoStore } from './undoStore';

// P9H-2（DISCOVERED-20261010-6）：删一块、选「一起从项目里去掉」它挂着的文件，⌘Z 时文件插回去 ——
// 原来按 15 列插，v33 的身份（BLOB）和「知道了」没跟着回来：挪走了的文件成了「不知道挪到哪了」，
// 点过「知道了」的要再点一次。⚠️ 适配器照 tauri-plugin-sql 2.4 处理字节（读出来是数字数组，
// 绑定非字符串非数字的值变成 JSON 文本），走插件那条路搬 BLOB 的话这里会和 app 里一样坏掉。

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
type Sqlite = InstanceType<typeof DatabaseSync>;
type SqlValue = string | number | bigint | null | Uint8Array;
const toNumbered = (sql: string): string => sql.replace(/\$(\d+)/g, '?$1');
const asPluginSql = (handle: Sqlite): Database => {
  const bind = (params: unknown[]): SqlValue[] =>
    params.map((v) =>
      v == null || typeof v === 'string' || typeof v === 'number' ? (v as SqlValue) : JSON.stringify(v),
    );
  const out = (row: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v instanceof Uint8Array ? Array.from(v) : v]));
  return {
    execute: async (sql: string, params: unknown[] = []) => {
      const r = handle.prepare(toNumbered(sql)).run(...bind(params));
      return { rowsAffected: Number(r.changes), lastInsertId: Number(r.lastInsertRowid) };
    },
    select: async (sql: string, params: unknown[] = []) =>
      (handle.prepare(toNumbered(sql)).all(...bind(params)) as Record<string, unknown>[]).map(out),
  } as unknown as Database;
};

describe('删块带文件 → ⌘Z：文件的身份和「知道了」跟着回来', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let block: Block;
  let fileId = '';
  // A Mac bookmark is a few hundred bytes of binary; zeros and 0xff are where a text path breaks.
  const IDENTITY = new Uint8Array([0x62, 0x6f, 0x6f, 0x6b, 0x00, 0x00, 0xff, 0x10, 0x7f, 0x80, 0x00, 0x01]);
  const NOTICE = JSON.stringify({ kind: 'dismissed' });
  const identityOf = (id: string) =>
    sqlite
      .prepare('SELECT hex(target_identity) AS h, typeof(target_identity) AS t, target_notice AS n FROM attachments WHERE id = ?')
      .get(id) as { h: string; t: string; n: string | null } | undefined;
  const store = () => useBlocksStore.getState();

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    sqliteRef = sqlite;
    invoke.mockClear();
    __setTestDb(asPluginSql(sqlite));
    clearUndoLog();
    useUndoStore.setState({ entries: [], redoable: null });
    useBlocksStore.setState({ byThread: {}, attachmentsByThread: {}, selectedBlockIds: new Set() });
    const ws = await createWorkspace('W');
    threadId = (await createThread(ws.id, '申请规划')).id;
    block = await createBlock({ threadId, content: '挂着文件的那块' });
    const file = await createAttachment({ threadId, kind: 'file', target: '/Users/a/方案.pdf', label: '方案.pdf' });
    fileId = file.id;
    await setAttachmentAnchor(fileId, block.id);
    // What file_follow.rs records on first sight, and 「知道了」 on a file that is gone.
    sqlite.prepare('UPDATE attachments SET target_identity = ?, target_notice = ? WHERE id = ?').run(IDENTITY, NOTICE, fileId);
    await store().load(threadId);
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
    sqliteRef = null;
  });

  it('⌘Z 之后两列和删之前逐字节一样；重做再撤一次照样一样', async () => {
    const before = identityOf(fileId)!;
    expect(before.t).toBe('blob');

    await store().remove(block.id, { removeFiles: true });
    expect(identityOf(fileId)).toBeUndefined();

    await useUndoStore.getState().undo();
    expect(identityOf(fileId)).toEqual(before);

    await useUndoStore.getState().redo();
    expect(identityOf(fileId)).toBeUndefined();
    await useUndoStore.getState().undo();
    expect(identityOf(fileId)).toEqual(before);
  });

  it('留在项目里的（没选「一起去掉」）：行没删过，两列一直在', async () => {
    const before = identityOf(fileId)!;
    await store().remove(block.id, { removeFiles: false });
    expect(identityOf(fileId)).toEqual(before);
    await useUndoStore.getState().undo();
    expect(identityOf(fileId)).toEqual(before);
    expect(invoke.mock.calls.some(([cmd]) => cmd === 'keep_file_identities')).toBe(false);
  });

  it('读不出身份（Rust 那边出错）：文件照样回来，只是身份是空的', async () => {
    invoke.mockImplementationOnce(async () => {
      throw new Error('library is busy');
    });
    await store().remove(block.id, { removeFiles: true });
    await useUndoStore.getState().undo();
    const back = identityOf(fileId)!;
    expect(back).toBeDefined();
    expect(back.t).toBe('null');
  });
});
