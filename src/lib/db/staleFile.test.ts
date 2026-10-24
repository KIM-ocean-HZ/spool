import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompressStore, type StaleSession, type WsStaleSession } from '@/stores/compressStore';
import { createBlock, type Block } from './blocks';
import { __setTestDb } from './client';
import schemaSql from './schema.sql?raw';
import { createThread, softDeleteThread } from './threads';
import { createWorkspace } from './workspaces';
import { __flushStaleFileForTest, clearStaleFile, loadStaleFile } from './staleFile';

// P9V-3（第 202 条）—— 过期检测的结果关掉 Spool 也还在。stale.json 用一个假的 plugin-store
// （save 时拷一份当「盘上那份」）；库是真 SQLite。

const disk: { saved: Record<string, unknown> } = { saved: {} };
vi.mock('@tauri-apps/plugin-store', () => {
  const cache: Record<string, unknown> = {};
  return {
    Store: {
      load: async () => ({
        get: async (k: string) => disk.saved[k],
        set: async (k: string, v: unknown) => {
          cache[k] = v;
        },
        save: async () => {
          disk.saved = structuredClone(cache);
        },
      }),
    },
  };
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

const outcome = { ok: true, text: '', cuts: null, kind: null, message: null, status: 200, inputTokens: 1,
                  outputTokens: 1, cachedInputTokens: null, reasoningTokens: null, ms: 1, model: 'm' };

describe('P9V-3 · stale.json', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let wsId = '';
  let older: Block;
  let newer: Block;

  const projectSession = (): StaleSession => ({
    // #1 很短，「已被取代」那一行比它长 ⇒ T6 那一句要出来。
    source: `#${older.seq} [x] 短。\n#${newer.seq} [x] 新的那一份写得很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长。\n`,
    blocks: [older, newer],
    proposals: [{ staleSeq: older.seq!, bySeq: newer.seq!, why: 'w', quoteStale: '短', quoteNew: '新的', retyped: false }],
    dropped: [],
    already: 0,
    outcome,
    decided: { 0: 'keep' },
    startedAt: 5,
  });
  const wsSession = (): WsStaleSession => ({
    workspaceId: wsId,
    projects: [{ threadId, title: 'P' }],
    skippedPrivate: 0,
    startedAt: 7,
    auto: true,
    outcome,
    tooBig: null,
    blocks: [],
    projectItems: [{ threadId, by: { threadId, blockId: newer.id, seq: newer.seq! }, why: 'x', quoteOld: 'a', quoteNew: 'b', retyped: false }],
    dropped: [],
    already: 0,
    decided: {},
  });

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    disk.saved = {};
    useCompressStore.setState({ stale: {}, staleWs: {}, staleAuto: {} });
    const ws = await createWorkspace('W');
    wsId = ws.id;
    threadId = (await createThread(ws.id, 'P')).id;
    older = await createBlock({ threadId, content: '短。' });
    newer = await createBlock({ threadId, content: '新的那一份。' });
  });
  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('⭐ 存进去、关掉、读回来：两种结果和开关都在；块按 id 现取、块号照跑那一刻的', async () => {
    useCompressStore.setState({
      stale: { [threadId]: projectSession() },
      staleWs: { [wsId]: wsSession() },
      staleAuto: { [wsId]: { on: true, lastRunAt: 9 } },
    });
    await __flushStaleFileForTest();
    // 那块后来被挪了号（比如进了别的项目又回来）—— 卡片上的 #n 要照 AI 当时说的。
    sqlite.prepare('UPDATE blocks SET seq = 99 WHERE id = ?').run(older.id);
    useCompressStore.setState({ stale: {}, staleWs: {}, staleAuto: {} });

    await loadStaleFile();

    const st = useCompressStore.getState();
    const p = st.stale[threadId]!;
    expect(p.source).toBe('');
    expect(p.blocks.find((b) => b.id === older.id)!.seq).toBe(older.seq);
    expect(p.decided).toEqual({ 0: 'keep' });
    expect(p.grows).toEqual([older.seq]);
    expect(st.staleWs[wsId]!.projectItems).toHaveLength(1);
    expect(st.staleAuto[wsId]).toEqual({ on: true, lastRunAt: 9 });
  });

  it('项目删了、工作区删了 —— 那几份读回来时丢掉', async () => {
    useCompressStore.setState({ stale: { [threadId]: projectSession() }, staleWs: { [wsId]: wsSession() } });
    await __flushStaleFileForTest();
    await softDeleteThread(threadId);
    sqlite.prepare('UPDATE workspaces SET deleted_at = 1 WHERE id = ?').run(wsId);
    useCompressStore.setState({ stale: {}, staleWs: {} });

    await loadStaleFile();

    expect(useCompressStore.getState().stale).toEqual({});
    expect(useCompressStore.getState().staleWs).toEqual({});
  });

  it('⛔ 读坏了当没有；没查完的那一份不存', async () => {
    disk.saved = { projects: { [threadId]: 'bad' }, workspaces: [1, 2], auto: { [wsId]: { on: 'yes' } } };
    await loadStaleFile();
    expect(useCompressStore.getState().stale).toEqual({});
    expect(useCompressStore.getState().staleAuto).toEqual({});

    useCompressStore.setState({ stale: { [threadId]: { ...projectSession(), outcome: null } } });
    await __flushStaleFileForTest();
    expect(disk.saved.projects).toEqual({});
  });

  it('「清除所有数据」一起清', async () => {
    useCompressStore.setState({ staleWs: { [wsId]: wsSession() }, staleAuto: { [wsId]: { on: true, lastRunAt: 1 } } });
    await __flushStaleFileForTest();
    await clearStaleFile();
    expect(disk.saved).toEqual({ projects: {}, workspaces: {}, auto: {} });
  });
});
