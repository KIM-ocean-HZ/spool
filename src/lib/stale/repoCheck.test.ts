import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RepoCheckScan } from '@/lib/ai/compress';
import { createBlock, listBlocksByThread } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { useSettingsStore } from '@/stores/settingsStore';
import { decideRepoBlock, repoAllDecided, repoKeys, type RepoCheckSession } from './repoCheck';

// P16-4: what a click on a repo check result writes. When the new side is a file of the repository, its sentence
// becomes a block of the project first (DISCOVERED-20261025-2), then the relation; when it is another block, that
// block is used as it is. And 「对过了」 waits for every entry.

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

const scan = (over: Partial<RepoCheckScan>): RepoCheckScan => ({
  outcome: { ok: true } as RepoCheckScan['outcome'],
  blocks: [],
  followUps: [],
  summary: null,
  dropped: [],
  workspaceId: 'w',
  ...over,
});

describe('repo check clicks', () => {
  let sqlite: Sqlite;
  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
  });
  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('a file of the repository becomes a block, then corrects the old one; another block is used as it is', async () => {
    const ws = await createWorkspace('Flux');
    const th = await createThread(ws.id, 'flux');
    const old = await createBlock({ threadId: th.id, content: '训练计划：用学院 GPU 跑 RFT。' });
    const later = await createBlock({ threadId: th.id, content: '改成本地 LoRA。' });
    const blocks = await listBlocksByThread(th.id);
    const said: string[] = [];
    const fromFile = {
      staleSeq: old.seq!, kind: 'corrects' as const, why: '仓库说不做 RFT 了', quoteStale: '用学院 GPU 跑 RFT',
      from: 'docs/PLAN.md', quoteNew: 'RFT 不做了', retyped: false,
    };
    expect(await decideRepoBlock(th.id, fromFile, 'merge', blocks, (m) => said.push(m))).toBe(true);
    const after = await listBlocksByThread(th.id);
    const made = after.find((b) => b.id !== old.id && b.id !== later.id)!;
    expect(made.content).toContain('RFT 不做了');
    expect(made.source).toContain('docs/PLAN.md');
    expect([made.refBlockId, made.refKind, made.correctedQuote]).toEqual([old.id, 'corrects', '用学院 GPU 跑 RFT']);
    expect(after.find((b) => b.id === old.id)!.staleAt).toBeNull();

    const fromBlock = { ...fromFile, from: `#${later.seq}`, kind: 'supersedes' as const };
    expect(await decideRepoBlock(th.id, fromBlock, 'retire', after, (m) => said.push(m))).toBe(true);
    const retired = (await listBlocksByThread(th.id)).find((b) => b.id === old.id)!;
    expect(retired.staleAt).not.toBeNull();
    expect(retired.replacedByBlockId).toBe(later.id);
    expect((await listBlocksByThread(th.id)).length).toBe(3);
    expect(said).toEqual([]);
  });

  // P16-4 验收（11-10 Ocean「来源全部都是：仓库 · 提交标题，没看懂什么意思，写的清楚一点」）.
  it('the block it makes says which folder, and which part of it', async () => {
    useSettingsStore.setState({ language: 'zh' });
    const ws = await createWorkspace('spool');
    const th = await createThread(ws.id, '新功能&新想法记录');
    const old = await createBlock({ threadId: th.id, content: 'AI 接着聊时会把整个项目再读一遍。' });
    const base = { staleSeq: old.seq!, kind: 'corrects' as const, why: '已经做了', quoteStale: '再读一遍', retyped: false };
    const made = async (from: string, folder: string | null) => {
      const before = new Set((await listBlocksByThread(th.id)).map((b) => b.id));
      const blocks = await listBlocksByThread(th.id);
      expect(await decideRepoBlock(th.id, { ...base, from, quoteNew: 'feat(p16-1): 只读新加的块' }, 'merge', blocks, () => {}, 1, folder)).toBe(true);
      return (await listBlocksByThread(th.id)).find((b) => !before.has(b.id))!;
    };
    const commit = await made('commits', 'Knote');
    expect(commit.source).toBe('Knote 仓库 · 提交记录');
    expect(commit.content).toBe('「Knote」最近的一笔提交，说明写着：\n\nfeat(p16-1): 只读新加的块');
    const file = await made('docs/HANDOFF.md', 'Knote');
    expect(file.source).toBe('Knote 仓库 · docs/HANDOFF.md');
    expect(file.content.startsWith('「Knote」里的 docs/HANDOFF.md 现在写着：')).toBe(true);
    const changes = await made('changes', 'Knote');
    expect(changes.content.startsWith('「Knote」上次对过之后改动的文件：')).toBe(true);
    // No folder name to hand (the card never loaded): still readable, never 「提交标题」.
    const bare = await made('commits', null);
    expect(bare.source).toBe('仓库 · 提交记录');
    expect(bare.content.startsWith('「连着的文件夹」最近的一笔提交')).toBe(true);
    useSettingsStore.setState({ language: 'en' });
    const en = await made('commits', 'Knote');
    expect([en.source, en.content]).toEqual(['Knote repository · commit history', 'A recent commit in “Knote” says:\n\nfeat(p16-1): 只读新加的块']);
  });

  it('a block that is gone is said, not done; 「对过了」 waits for every entry', async () => {
    const said: string[] = [];
    const item = { staleSeq: 99, kind: 'corrects' as const, why: 'x', quoteStale: 'a', from: 'commits', quoteNew: 'b', retyped: false };
    expect(await decideRepoBlock('t', item, 'merge', [], (m) => said.push(m))).toBe(false);
    expect(said.length).toBe(1);
    const s = scan({ blocks: [item], summary: { text: '新摘要', why: '' } });
    expect(repoKeys(s)).toEqual(['b0', 's']);
    const sess: RepoCheckSession = { scan: s, blocks: [], decided: { b0: 'keep' }, startedAt: 0, synced: false };
    expect(repoAllDecided(sess)).toBe(false);
    expect(repoAllDecided({ ...sess, decided: { b0: 'keep', s: 'apply' } })).toBe(true);
    expect(repoAllDecided({ ...sess, scan: scan({}) , decided: {} })).toBe(true);
  });
});
