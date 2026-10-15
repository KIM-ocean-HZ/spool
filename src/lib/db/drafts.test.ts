import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDraftStore } from '@/stores/draftStore';
import { createBlock } from './blocks';
import { __setTestDb } from './client';
import schemaSql from './schema.sql?raw';
import { createThread, softDeleteThread } from './threads';
import { createWorkspace } from './workspaces';
import {
  DRAFT_SAVE_DELAY_MS,
  cleanBlockDrafts,
  clearDraftsFile,
  editorOpening,
  loadDrafts,
  type BlockDraft,
} from './drafts';

// P9D-1 (Ocean 第 108 条「边写边存」) —— 编辑面板里没点「完成」的字，退出、换装、崩溃都丢不了。
// 来历：10-14 Ocean 写的两段字没点完成就没了（DISCOVERED-20261014-5）。
// drafts.json 用一个假的 plugin-store（就是一个对象，save 时拷一份当「盘上那份」）；库是真 SQLite。

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

const draft = (content: string, base = '原来的字', extra: Partial<BlockDraft> = {}): BlockDraft => ({
  content,
  annotation: '',
  baseContent: base,
  baseAnnotation: '',
  savedAt: 1,
  ...extra,
});

describe('drafts.json：写了能读回，块不在了就丢', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let b9 = '';
  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    const ws = await createWorkspace('W');
    threadId = (await createThread(ws.id, '个人网站素材')).id;
    b9 = (await createBlock({ threadId, content: '创作决策短文' })).id;
    disk.saved = {};
    useDraftStore.setState({ blockDrafts: {}, byThread: {}, images: {}, draftsLoaded: false });
  });
  afterEach(() => {
    vi.useRealTimers();
    __setTestDb(null);
  });

  it('字停下来就写进盘；「重开」之后读回来的就是那两段', async () => {
    await loadDrafts();
    vi.useFakeTimers();
    useDraftStore.getState().setBlockDraft(b9, draft('创作决策短文\n\n第一段……\n\n第二段……', '创作决策短文'));
    expect(disk.saved.blocks).toBeUndefined(); // 读回来什么都没丢：不写；还在打字：也不写
    await vi.advanceTimersByTimeAsync(DRAFT_SAVE_DELAY_MS);
    expect((disk.saved.blocks as Record<string, BlockDraft>)[b9]!.content).toContain('第二段');
    vi.useRealTimers();

    // 退出：内存里的全没了。再打开：
    useDraftStore.setState({ blockDrafts: {}, draftsLoaded: false });
    await loadDrafts();
    expect(useDraftStore.getState().draftsLoaded).toBe(true);
    expect(useDraftStore.getState().blockDrafts[b9]!.content).toBe('创作决策短文\n\n第一段……\n\n第二段……');
  });

  it('删（完成 / Esc）当场写，不等那 300 毫秒', async () => {
    useDraftStore.setState({ blockDrafts: { [b9]: draft('x') } });
    await loadDrafts();
    useDraftStore.getState().removeBlockDraft(b9);
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(disk.saved.blocks).toEqual({});
  });

  it('块删了、项目删了：读回来时丢掉，盘上那份也跟着改', async () => {
    disk.saved = { blocks: { [b9]: draft('留着'), gone: draft('块已经不在了') } };
    await loadDrafts();
    expect(Object.keys(useDraftStore.getState().blockDrafts)).toEqual([b9]);
    expect(Object.keys(disk.saved.blocks as object)).toEqual([b9]);

    await softDeleteThread(threadId);
    useDraftStore.setState({ blockDrafts: {}, draftsLoaded: false }); // 重开：内存是空的
    await loadDrafts();
    expect(useDraftStore.getState().blockDrafts).toEqual({});
  });

  it('文件坏了当没有，Spool 照样起来', async () => {
    disk.saved = { blocks: 'not an object' };
    await loadDrafts();
    expect(useDraftStore.getState()).toMatchObject({ blockDrafts: {}, draftsLoaded: true });
  });

  it('「清除所有数据」把草稿一起清掉', async () => {
    disk.saved = { blocks: { [b9]: draft('x') }, composer: { [threadId]: '没发的' } };
    await loadDrafts();
    await clearDraftsFile();
    expect(disk.saved).toMatchObject({ blocks: {}, composer: {} });
  });

  // P9D-2（第 108、110 条）：项目底下输入框的字也留住；图不留。
  it('输入框的字：写进盘，「重开」之后回到那个项目的输入框里；图没有', async () => {
    await loadDrafts();
    vi.useFakeTimers();
    const s = useDraftStore.getState();
    s.setDraft(threadId, '打了几个字');
    s.addDraftImages(threadId, [{ id: 'img', bytes: new Uint8Array([1, 2, 3]), previewUrl: 'data:,' }]);
    await vi.advanceTimersByTimeAsync(DRAFT_SAVE_DELAY_MS);
    vi.useRealTimers();
    expect(disk.saved.composer).toEqual({ [threadId]: '打了几个字' });
    expect(JSON.stringify(disk.saved)).not.toContain('img');

    useDraftStore.setState({ byThread: {}, images: {}, blockDrafts: {}, draftsLoaded: false });
    await loadDrafts();
    expect(useDraftStore.getState().byThread).toEqual({ [threadId]: '打了几个字' });
    expect(useDraftStore.getState().images).toEqual({});
  });

  it('发出去（clearDraft）就从盘上删，当场', async () => {
    disk.saved = { composer: { [threadId]: '要发的' } };
    await loadDrafts();
    useDraftStore.getState().clearDraft(threadId);
    await new Promise((r) => setTimeout(r, 0));
    expect(disk.saved.composer).toEqual({});
  });

  it('删空了也算删；空的不落盘', async () => {
    disk.saved = { composer: { [threadId]: 'abc' } };
    await loadDrafts();
    useDraftStore.getState().setDraft(threadId, '');
    await new Promise((r) => setTimeout(r, 0));
    expect(disk.saved.composer).toEqual({});
  });

  it('项目不在了：读回来时丢掉', async () => {
    disk.saved = { composer: { [threadId]: '留着', gone: '项目已经删了' } };
    await loadDrafts();
    expect(useDraftStore.getState().byThread).toEqual({ [threadId]: '留着' });
    expect(disk.saved.composer).toEqual({ [threadId]: '留着' });
  });
});

describe('cleanBlockDrafts', () => {
  it('形状不对的条目丢掉', () => {
    expect(
      cleanBlockDrafts({ a: draft('ok'), b: { content: 1 }, c: null, d: { ...draft('x'), savedAt: 'x' } }),
    ).toEqual({ a: draft('ok') });
    expect(cleanBlockDrafts(['x'])).toEqual({});
    expect(cleanBlockDrafts(undefined)).toEqual({});
  });
});

describe('editorOpening：面板打开时放什么、要不要说「被改过」', () => {
  const block = { content: '创作决策短文', annotation: null, unplacedImageIds: [], hasPictures: false };

  it('没有草稿：照旧放块上的字', () => {
    const o = editorOpening({ ...block, saved: undefined });
    expect(o.contentDraft).toBe('创作决策短文');
    expect(o.restored).toBeNull();
    expect(o.base).toEqual({ content: '创作决策短文', annotation: '' });
  });

  it('有草稿、块没动过：放草稿的字，不说「被改过」', () => {
    const o = editorOpening({ ...block, saved: draft('创作决策短文\n后面两段', '创作决策短文') });
    expect(o.contentDraft).toBe('创作决策短文\n后面两段');
    expect(o.restored).toEqual({ changed: false });
  });

  it('块在那之后被改过（正文或批注）：照样恢复，要说一句', () => {
    expect(editorOpening({ ...block, saved: draft('草稿', '更早的正文') }).restored).toEqual({ changed: true });
    expect(
      editorOpening({ ...block, saved: draft('草稿', '创作决策短文', { baseAnnotation: '后来删掉的批注' }) }).restored,
    ).toEqual({ changed: true });
    // 记的仍是草稿起笔时的那一份，⛔ 不换成块现在的 —— 下一次恢复照样知道被改过。
    expect(editorOpening({ ...block, saved: draft('草稿', '更早的正文') }).base.content).toBe('更早的正文');
  });

  it('⛔ openedWith（删图的依据）按块上现在的样子算，不按草稿', () => {
    const o = editorOpening({
      content: '![](spool-image:i1)\n文字',
      annotation: null,
      unplacedImageIds: ['i2'], // 块上还有一张正文没提到的图
      hasPictures: true,
      // 草稿是 i2 加进块之前写的，里面只有 i1
      saved: draft('![](spool-image:i1)\n文字改了', '![](spool-image:i1)\n文字'),
    });
    expect(o.contentDraft).toBe('![](spool-image:i1)\n文字改了');
    expect(o.openedWith.imageIds).toEqual(['i1', 'i2']);
    expect(o.openedWith.draft).toBe('![](spool-image:i1)\n文字\n![](spool-image:i2)');
    expect(o.pictureMode).toBe(true);
  });

  it('草稿里有图片行、块上的图还没认出来：也进图文面板', () => {
    expect(
      editorOpening({ ...block, saved: draft('![](spool-image:i1)\n字', '![](spool-image:i1)\n') }).pictureMode,
    ).toBe(true);
  });
});
