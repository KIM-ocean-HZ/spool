import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { useFollowUpStore } from './followUpStore';
import { useProposalsStore } from './proposalsStore';

// DISCOVERED-20261112-13: 「加进去」 on a follow-up proposal left the right rail's 「跟进内容」 saying
// 「还没定」 until the user switched projects and back. Real SQLite, real schema.

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
type Sqlite = InstanceType<typeof DatabaseSync>;
type SqlValue = string | number | bigint | null | Uint8Array;
const toNumbered = (sql: string): string => sql.replace(/\$(\d+)/g, '?$1');

describe('approving a follow-up proposal', () => {
  let sqlite: Sqlite;
  let threadId = '';

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb({
      execute: async (sql: string, params: unknown[] = []) => {
        const r = sqlite.prepare(toNumbered(sql)).run(...(params as SqlValue[]));
        return { rowsAffected: Number(r.changes), lastInsertId: Number(r.lastInsertRowid) };
      },
      select: async (sql: string, params: unknown[] = []) =>
        sqlite.prepare(toNumbered(sql)).all(...(params as SqlValue[])),
    } as unknown as Database);
    const ws = await createWorkspace('W');
    threadId = (await createThread(ws.id, 'Job search')).id;
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('shows the line in the open project right away', async () => {
    sqlite
      .prepare(
        `INSERT INTO follow_up_items
           (id, thread_id, text, why, standing, fingerprint, status, proposed_by, sort_order, created_at)
         VALUES ('p1', ?1, 'Applications close 15 November', 'why', 0, 'x', 'proposed', 'Claude Desktop', 0, 1)`,
      )
      .run(threadId);
    await useFollowUpStore.getState().load(threadId);
    expect(useFollowUpStore.getState().items.filter((i) => i.status === 'open')).toEqual([]);

    await useProposalsStore.getState().approveFollowUp('p1');

    expect(
      useFollowUpStore
        .getState()
        .items.filter((i) => i.status === 'open')
        .map((i) => i.text),
    ).toEqual(['Applications close 15 November']);
  });
});
