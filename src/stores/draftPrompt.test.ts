import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlock, deleteBlock } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import type { BlockDraft } from '@/lib/db/drafts';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread, softDeleteThread, updateThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { threadViewMode } from '@/components/ThreadView';
import { draftPromptFor, leftDrafts, startDraftPrompt, type LeftDraft } from './draftPrompt';
import { useDraftStore } from './draftStore';
import { useSearchStore } from './searchStore';
import { useSettingsStore } from './settingsStore';
import { useThreadsStore } from './threadsStore';
import { useToastStore } from './toastStore';

// P9D-3（Ocean 第 109 条）：打开 Spool 时，上次没点「完成」的那几块提示一句，「去看」一下跳过去。
// 提示条一直留着（Spool 常常是藏着窗口起来的），直到「去看」或 ×。

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

const draft = (savedAt: number): BlockDraft => ({
  content: '后面两段',
  annotation: '',
  baseContent: '',
  baseAnnotation: '',
  savedAt,
});
const left = (blockId: string, savedAt: number): LeftDraft => ({ blockId, threadId: 't', title: 'P', seq: 1, savedAt });
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('draftPromptFor：要不要提示、去哪一块', () => {
  it('一块都没有：不提示', () => {
    expect(draftPromptFor([])).toBeNull();
  });
  it('好几块：说几块，「去看」到最近写的那一块', () => {
    expect(draftPromptFor([left('a', 1), left('b', 3), left('c', 2)])).toEqual({ count: 3, target: left('b', 3) });
  });
});

describe('开机提示（真 SQLite）', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let b9 = '';
  let b12 = '';
  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    const ws = await createWorkspace('W');
    threadId = (await createThread(ws.id, '个人网站素材')).id;
    b9 = (await createBlock({ threadId, content: '创作决策短文' })).id;
    b12 = (await createBlock({ threadId, content: '配色' })).id;
    useSettingsStore.setState({ language: 'zh' });
    useToastStore.setState({ toasts: [] });
    useDraftStore.setState({ blockDrafts: { [b9]: draft(1), [b12]: draft(2) }, draftsLoaded: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    __setTestDb(null);
  });

  it('块不在了、项目不在了、草稿已经了结的，都不算', async () => {
    expect((await leftDrafts([b9, b12])).map((d) => d.blockId).sort()).toEqual([b9, b12].sort());
    await deleteBlock(b12);
    expect((await leftDrafts([b9, b12])).map((d) => d.blockId)).toEqual([b9]);
    useDraftStore.getState().removeBlockDraft(b9);
    expect(await leftDrafts([b9, b12])).toEqual([]);
    useDraftStore.getState().setBlockDraft(b9, draft(3));
    await softDeleteThread(threadId);
    expect(await leftDrafts([b9])).toEqual([]);
  });

  it('一块：说是哪个项目第几块；一直留着（不计时、Esc 也不清它）', async () => {
    useDraftStore.setState({ blockDrafts: { [b9]: draft(1) } });
    vi.useFakeTimers();
    startDraftPrompt([b9]);
    await vi.advanceTimersByTimeAsync(0);
    const [only] = useToastStore.getState().toasts;
    expect(only?.message).toBe('〈个人网站素材〉#1 上次没点「完成」，写的字还在');
    expect(only?.action?.label).toBe('去看');
    await vi.advanceTimersByTimeAsync(60_000);
    useToastStore.getState().clear(); // Esc
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('「去看」：选中那个项目、跳到那一块', async () => {
    useDraftStore.setState({ blockDrafts: { [b9]: draft(1) } });
    startDraftPrompt([b9]);
    await settle();
    useToastStore.getState().toasts[0]!.action!.run();
    expect(useThreadsStore.getState().activeId).toBe(threadId);
    expect(useSearchStore.getState().highlightBlockId).toBe(b9);
  });

  // P9H-1（DISCOVERED-20261015-3）：已完成的项目默认画只读的摘要视图，面板在那里开不了。
  it('已完成的项目：「去看」这一次画「看全部」；换到别的项目再回来，照旧是摘要', async () => {
    await updateThread(threadId, { status: 'done' });
    const other = (await createThread((await createWorkspace('W2')).id, '别的')).id;
    const done = { id: threadId, status: 'done' };
    useThreadsStore.getState().select(other);
    expect(threadViewMode(done, null, useThreadsStore.getState().logViewFor)).toBe('digest');

    useDraftStore.setState({ blockDrafts: { [b9]: draft(1) } });
    startDraftPrompt([b9]);
    await settle();
    useToastStore.getState().toasts[0]!.action!.run();
    expect(useThreadsStore.getState().activeId).toBe(threadId);
    expect(threadViewMode(done, null, useThreadsStore.getState().logViewFor)).toBe('log');
    // 人自己点了「摘要」：听他的。
    expect(threadViewMode(done, 'digest', useThreadsStore.getState().logViewFor)).toBe('digest');

    useThreadsStore.getState().select(other);
    useThreadsStore.getState().select(threadId);
    expect(threadViewMode(done, null, useThreadsStore.getState().logViewFor)).toBe('digest');
  });

  it('好几块：先说几块；「去看」的那一块点了完成之后，剩下的再提示一次；全了结就不再提示', async () => {
    startDraftPrompt([b9, b12]);
    await settle();
    expect(useToastStore.getState().toasts.map((x) => x.message)).toEqual(['有 2 块上次没点「完成」，写的字还在']);
    // 「去看」（提示条跟着关掉）→ 最近写的那一块（b12）→ 点「完成」
    const go = useToastStore.getState().toasts[0]!;
    go.action!.run();
    useToastStore.getState().dismiss(go.id);
    expect(useSearchStore.getState().highlightBlockId).toBe(b12);
    useDraftStore.getState().removeBlockDraft(b12);
    await settle();
    expect(useToastStore.getState().toasts.map((x) => x.message)).toEqual(['〈个人网站素材〉#1 上次没点「完成」，写的字还在']);
    // 剩下那一块在别处了结（按了 Esc）：提示条跟着没了
    useDraftStore.getState().removeBlockDraft(b9);
    await settle();
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('按 × 关掉之后，了结一块不会再冒出来', async () => {
    startDraftPrompt([b9, b12]);
    await settle();
    useToastStore.getState().dismiss(useToastStore.getState().toasts[0]!.id);
    useDraftStore.getState().removeBlockDraft(b12);
    await settle();
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('上次没有留下的：不提示', async () => {
    startDraftPrompt([]);
    await settle();
    expect(useToastStore.getState().toasts).toEqual([]);
  });
});
