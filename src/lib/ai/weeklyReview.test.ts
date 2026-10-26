import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { announceWeeklyReview, reviewNotice, runWeeklyReviewViaApi } from './weeklyReview';
import { WEEKLY_FORMAT } from './weeklyStructured';

// P10-1 / P10-4 on the API road: what `weekly_review_via_api` hands back is what gets stored (Rust
// has already read and gated it), a run that did not read is a failed row that still carries its
// tokens, and only a review that was stored gets the 「周回顾更新了」 card.

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

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
  projects: [
    { title: 'A', threadId: 't1', did: '', stuck: '', signals: [], actions: [{}, {}] },
    { title: 'B', threadId: 't2', did: '', stuck: '', signals: [], actions: [{}] },
  ],
  next: '',
  dropped: [],
});

const outcome = (over: object) => ({
  ok: true, text: stored, cuts: null, kind: null, message: null, status: 200,
  inputTokens: 1200, outputTokens: 800, cachedInputTokens: null, reasoningTokens: null, ms: 1, model: 'm-1',
  ...over,
});

const settings = { apiVendor: 'deepseek', apiBaseUrl: '', apiModel: 'm-1', apiReasoning: '', apiTimeoutSecs: 60 };
const notices = () => invoke.mock.calls.filter((c) => c[0] === 'show_review_notice').map((c) => c[1]);

describe('周回顾 · API 那条 (P10)', () => {
  let sqlite: Sqlite;
  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    invoke.mockReset();
  });
  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('counts what the card says off the stored review; prose says nothing', () => {
    expect(reviewNotice(stored)).toEqual({ projects: 2, actions: 3 });
    expect(reviewNotice('## A\n- **做了什么**：x')).toBeNull();
    announceWeeklyReview('## A');
    expect(notices()).toEqual([]);
  });

  it('stores what Rust read, and puts the card up', async () => {
    invoke.mockImplementation((cmd: string) =>
      Promise.resolve(cmd === 'weekly_review_via_api' ? outcome({}) : cmd === 'api_key_load' ? 'k' : null),
    );
    expect(await runWeeklyReviewViaApi(settings)).toBe(true);
    const row = sqlite.prepare('SELECT outcome, result_text FROM engine_runs').get() as { outcome: string; result_text: string };
    expect(row).toEqual({ outcome: 'ok', result_text: stored });
    expect(notices()).toEqual([{ payload: { projects: 2, actions: 3 } }]);
  });

  it('a reply that did not read is a failed row with its tokens, no text and no card', async () => {
    invoke.mockImplementation((cmd: string) =>
      Promise.resolve(
        cmd === 'weekly_review_via_api'
          ? outcome({ ok: false, text: '', kind: 'bad_json', message: '周回顾回来的不是一份完整的 JSON' })
          : cmd === 'api_key_load'
            ? 'k'
            : null,
      ),
    );
    expect(await runWeeklyReviewViaApi(settings)).toBe(false);
    const row = sqlite
      .prepare('SELECT outcome, result_text, detail, input_tokens, output_tokens FROM engine_runs')
      .get();
    expect(row).toEqual({
      outcome: 'failed',
      result_text: null,
      detail: '周回顾回来的不是一份完整的 JSON',
      input_tokens: 1200,
      output_tokens: 800,
    });
    expect(notices()).toEqual([]);
  });
});
