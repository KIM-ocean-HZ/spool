import { describe, expect, it } from 'vitest';
import type { WsStaleScan } from '@/lib/ai/compress';
import type { Block } from '@/lib/db/blocks';
import type { Thread } from '@/lib/db/threads';
import { wsItemsFromScan, type WsBuilt } from './wsItems';

const block = (id: string, threadId: string, seq: number, content = '', refBlockId: string | null = null): Block =>
  ({ id, seq, refBlockId, refKind: null, threadId, kind: 'text', content, annotation: null,
     annotationBy: null, refThreadId: null, source: null, pinned: false, createdAt: 0,
     staleAt: null, sourceUrl: null, retrievedAt: null, recheckAfter: null,
     correctedQuote: null, gist: null, refNote: null, gistBy: null,
     refReviewedStaleAt: null, replacedByBlockId: null,
     originalContent: null, compressedAt: null }) as Block;
const thread = (id: string, title: string): Thread =>
  ({ id, title, workspaceId: 'w', status: 'active', isPrivate: false, createdAt: 0 }) as Thread;

// Both projects have a #3 — the numbering collides, and the mapping must not.
const midi: WsBuilt = {
  thread: thread('t-midi', 'midi-GPT'),
  text: '#2 [x] 用 REMI 编码。\n#3 [x] 交开题。\n',
  blocks: [block('m2', 't-midi', 2, '用 REMI 编码。'), block('m3', 't-midi', 3, '交开题。')],
};
const flux: WsBuilt = {
  thread: thread('t-flux', 'Flux'),
  text: '#3 [x] 别再单独做了。\n#5 [x] 放弃 REMI。\n',
  blocks: [block('f3', 't-flux', 3, '别再单独做了。'), block('f5', 't-flux', 5, '放弃 REMI。')],
};
const outcome = { ok: true, text: '', cuts: null, kind: null, message: null, status: 200, inputTokens: 1,
                  outputTokens: 1, cachedInputTokens: null, reasoningTokens: null, ms: 1, model: 'm' };
const scan = (s: Partial<WsStaleScan>): WsStaleScan =>
  ({ outcome, blocks: [], projects: [], dropped: [], ...s }) as WsStaleScan;

describe('P9V-2 · 「P2#3」换成块 id', () => {
  it('⭐ 跨项目的一对 → 两块各自的 id 和项目；撞号的 #3 不混', () => {
    const r = wsItemsFromScan(
      scan({
        blocks: [
          { stale: { project: 0, seq: 3 }, by: { project: 1, seq: 3 }, why: 'w', quoteStale: '交开题', quoteNew: '别再', retyped: false },
        ],
      }),
      [midi, flux],
    );
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0]!.stale).toEqual({ threadId: 't-midi', blockId: 'm3', seq: 3 });
    expect(r.blocks[0]!.by).toEqual({ threadId: 't-flux', blockId: 'f3', seq: 3 });
  });

  it('⛔ 库里已经记着这条关系（哪怕只是引用）—— 摘掉、数出来', () => {
    const cited: WsBuilt = { ...flux, blocks: [flux.blocks[0]!, block('f5', 't-flux', 5, '放弃 REMI。', 'm2')] };
    const r = wsItemsFromScan(
      scan({
        blocks: [
          { stale: { project: 0, seq: 2 }, by: { project: 1, seq: 5 }, why: 'w', quoteStale: 'REMI', quoteNew: 'REMI', retyped: false },
        ],
      }),
      [midi, cited],
    );
    expect(r.blocks).toEqual([]);
    expect(r.already).toBe(1);
  });

  it('项目级 → 那个项目的 id + 证据那一块', () => {
    const r = wsItemsFromScan(
      scan({
        projects: [{ project: 0, by: { project: 1, seq: 3 }, why: '并进 Flux 了', quoteOld: '交开题', quoteNew: '别再', retyped: true }],
      }),
      [midi, flux],
    );
    expect(r.projectItems).toEqual([
      { threadId: 't-midi', by: { threadId: 't-flux', blockId: 'f3', seq: 3 }, why: '并进 Flux 了', quoteOld: '交开题', quoteNew: '别再', retyped: true },
    ]);
  });

  it('没过闸的 → 编号换成项目名；认不出来的照抄原话', () => {
    const r = wsItemsFromScan(
      scan({
        dropped: [
          { kind: 'block', oldLabel: 'P1#2', byLabel: 'P2#9', old: { project: 0, seq: 2 }, by: { project: 1, seq: 9 },
            why: 'x', quoteOld: 'a', quoteNew: 'b', reason: 'no_block' },
          { kind: 'project', oldLabel: 'P7', byLabel: '#3', old: { project: 6, seq: 0 }, by: null,
            why: 'y', quoteOld: 'c', quoteNew: 'd', reason: 'no_ref' },
        ],
      }),
      [midi, flux],
    );
    expect(r.dropped[0]!.old).toEqual({ title: 'midi-GPT', seq: 2 });
    expect(r.dropped[0]!.by).toEqual({ title: 'Flux', seq: 9 });
    expect(r.dropped[1]!.old).toBeNull();
    expect(r.dropped[1]!.by).toBeNull();
    expect(r.dropped[1]!.oldLabel).toBe('P7');
  });
});
