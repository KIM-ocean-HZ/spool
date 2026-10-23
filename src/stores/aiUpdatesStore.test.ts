import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type AiSeen, __setAiSeenPersistForTest } from '@/lib/db/aiSeen';
import { createBlock } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { useAiUpdatesStore } from './aiUpdatesStore';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
type SqlValue = string | number | bigint | null | Uint8Array;
const toNumbered = (sql: string): string => sql.replace(/\$(\d+)/g, '?$1');

// P9S-4 — the green dot: an AI-written block the user has not had on screen.
describe('aiUpdatesStore', () => {
  let sqlite: InstanceType<typeof DatabaseSync>;
  let file: unknown;
  const setCreatedAt = (id: string, at: number) =>
    sqlite.prepare('UPDATE blocks SET created_at = ? WHERE id = ?').run(at, id);

  beforeEach(() => {
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
    file = undefined;
    __setAiSeenPersistForTest({
      read: async () => file,
      write: async (s: AiSeen) => {
        file = s;
      },
    });
    useAiUpdatesStore.setState({ state: null, latest: {}, unread: new Set() });
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('first run: everything already in the library counts as seen — nothing lights on upgrade', async () => {
    const ws = await createWorkspace('W');
    const a = await createThread(ws.id, 'A');
    const old = await createBlock({ threadId: a.id, content: 'x', source: 'Claude · MCP' });
    setCreatedAt(old.id, 1);
    await useAiUpdatesStore.getState().refresh();
    expect(useAiUpdatesStore.getState().unread.size).toBe(0);
    expect((file as AiSeen).baseline).toBeGreaterThan(1);
  });

  it('only an AI write lights a project; the user’s own capture does not', async () => {
    file = { baseline: 100, seen: {} } satisfies AiSeen;
    const ws = await createWorkspace('W');
    const mine = await createThread(ws.id, 'mine');
    const ai = await createThread(ws.id, 'ai');
    setCreatedAt((await createBlock({ threadId: mine.id, content: 'x', source: 'Google Chrome' })).id, 200);
    setCreatedAt((await createBlock({ threadId: mine.id, content: 'typed' })).id, 210);
    setCreatedAt((await createBlock({ threadId: ai.id, content: 'y', source: 'Codex · MCP' })).id, 300);
    await useAiUpdatesStore.getState().refresh();
    expect([...useAiUpdatesStore.getState().unread]).toEqual([ai.id]);
  });

  it('seeing the newest one clears it, persists, and a later AI write lights it again', async () => {
    file = { baseline: 100, seen: {} } satisfies AiSeen;
    const ws = await createWorkspace('W');
    const ai = await createThread(ws.id, 'ai');
    setCreatedAt((await createBlock({ threadId: ai.id, content: 'y', source: 'MCP' })).id, 300);
    await useAiUpdatesStore.getState().refresh();

    await useAiUpdatesStore.getState().markSeen(ai.id, 250); // an older one: still lit
    expect(useAiUpdatesStore.getState().unread.has(ai.id)).toBe(true);
    await useAiUpdatesStore.getState().markSeen(ai.id, 300);
    expect(useAiUpdatesStore.getState().unread.has(ai.id)).toBe(false);
    expect((file as AiSeen).seen[ai.id]).toBe(300);

    setCreatedAt((await createBlock({ threadId: ai.id, content: 'z', source: 'MCP' })).id, 400);
    await useAiUpdatesStore.getState().refresh();
    expect(useAiUpdatesStore.getState().unread.has(ai.id)).toBe(true);
  });

  it('an unreadable file never breaks the reload it rides on', async () => {
    __setAiSeenPersistForTest({
      read: async () => {
        throw new Error('no store');
      },
      write: async () => {},
    });
    await expect(useAiUpdatesStore.getState().refresh()).resolves.toBeUndefined();
    expect(useAiUpdatesStore.getState().unread.size).toBe(0);
  });
});
