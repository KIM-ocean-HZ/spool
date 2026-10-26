import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { WEEKLY_FORMAT } from '@/lib/ai/weeklyStructured';
import { useEngineStore } from './engineStore';

// P10-1 / P10-4 on the local-CLI road. `ai_engine_run` reads the review in Rust; when it cannot,
// the answer carries `error` beside the usage — the row is a failure that still says what the
// run cost, with no text. A review that was stored puts up the 「周回顾更新了」 card.

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...a: unknown[]) => invoke(...a) }));
vi.mock('@tauri-apps/api/event', () => ({
  listen: () => Promise.resolve(() => {}),
  emit: () => Promise.resolve(),
}));

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

const stored = JSON.stringify({
  format: WEEKLY_FORMAT,
  projects: [{ title: 'A', threadId: 't1', did: '', stuck: '', signals: [], actions: [{}] }],
  next: '',
  dropped: [],
});
const usage = { model: 'sonnet', costUsd: 0.03, inputTokens: 900, outputTokens: 400 };

const runOnce = async (answer: object): Promise<void> => {
  invoke.mockImplementation((cmd: string) => Promise.resolve(cmd === 'ai_engine_run' ? answer : null));
  useEngineStore.getState().enqueue('', '', 'weekly_review', 60);
  await vi.waitFor(() => {
    expect(useEngineStore.getState().current).toBeNull();
    expect(invoke.mock.calls.some((c) => c[0] === 'ai_engine_run')).toBe(true);
  });
};
const notices = () => invoke.mock.calls.filter((c) => c[0] === 'show_review_notice').map((c) => c[1]);

describe('周回顾 · 本机 CLI 那条 (P10)', () => {
  let sqlite: Sqlite;
  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    invoke.mockReset();
    useEngineStore.setState({ current: null, queue: [], runs: [], progress: null });
  });
  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('stores the read review and puts the card up', async () => {
    await runOnce({ result: stored, error: null, engine: 'claude', usage });
    await vi.waitFor(() => expect(notices()).toEqual([{ payload: { projects: 1, actions: 1 } }]));
    expect(sqlite.prepare('SELECT outcome, result_text, cost_usd FROM engine_runs').get()).toEqual({
      outcome: 'ok',
      result_text: stored,
      cost_usd: 0.03,
    });
  });

  it('a reply that did not read: failed, no text, the cost kept, no card', async () => {
    await runOnce({ result: '', error: '周回顾回来的不是一份完整的 JSON', engine: 'claude', usage });
    await vi.waitFor(() =>
      expect(sqlite.prepare('SELECT outcome, result_text, detail, cost_usd, input_tokens FROM engine_runs').get()).toEqual({
        outcome: 'failed',
        result_text: null,
        detail: '周回顾回来的不是一份完整的 JSON',
        cost_usd: 0.03,
        input_tokens: 900,
      }),
    );
    expect(notices()).toEqual([]);
  });
});
