import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Block } from '@/lib/db/blocks';
import { useBlocksStore } from '@/stores/blocksStore';
import BlockFeed from './BlockFeed';

// 2026-10-16 (Ocean, owner interruption before the P9E install): 〈Memo产品复活｜Claude独立调研〉
// #20 — the whole final plan, 2700 characters — could not be found in the timeline. It was a
// correction of one sentence in #14, and corrections were folded away under that sentence
// (08-19 / S5 丙). And #21, which corrects #20, was drawn nowhere at all: the folded #20 is
// rendered without correction marks, so the sentence #21 points at had nothing to click.
// Ocean chose 甲 + a preview: every block keeps its own card in the timeline; the corrected
// sentence keeps its mark, and clicking it previews the correction in a floating panel.

const now = Date.now();
const block = (id: string, seq: number, content: string, extra: Partial<Block> = {}): Block =>
  ({
    id, threadId: 't1', kind: 'text', content, annotation: null, annotationBy: null,
    refThreadId: null, refBlockId: null, source: null, pinned: false, seq, createdAt: now + seq,
    staleAt: null, refKind: null, sourceUrl: null, retrievedAt: null, recheckAfter: null,
    correctedQuote: null, gist: null, refNote: null, gistBy: null, refReviewedStaleAt: null,
    replacedByBlockId: null, originalContent: null, compressedAt: null, ...extra,
  }) as Block;

const corrects = (target: string, quote: string): Partial<Block> => ({
  refBlockId: target,
  refKind: 'corrects',
  correctedQuote: quote,
  source: 'Claude · MCP',
});

// ⚠️ zustand v5 renders on the server from `getInitialState()`, not `getState()` — a
// `setState` here would leave the feed empty (memory isolated-verify-workflow §45).
const render = (blocks: Block[]): string => {
  Object.assign(useBlocksStore.getInitialState(), { byThread: { t1: blocks } });
  return renderToStaticMarkup(<BlockFeed threadId="t1" scrollRef={{ current: null }} />);
};

describe('更正块在时间线上有自己的卡片 (2026-10-16)', () => {
  it('一条更正、一条「更正的更正」都各有一张卡，内容只画一次', () => {
    const html = render([
      block('b14', 14, '作品集交付版本预估。留给 Memohead 的现实窗口约 4 周。'),
      block('b20', 20, '统一升级方案：首发地区先英国自用。全文很长。', corrects('b14', '留给 Memohead 的现实窗口约 4 周。')),
      block('b21', 21, '第二轮决定：北美与中国并行。', corrects('b20', '首发地区先英国自用。')),
    ]);
    for (const id of ['b14', 'b20', 'b21']) expect(html).toContain(`data-block-id="${id}"`);
    // Not drawn a second time under the sentence it corrects.
    expect(html.split('统一升级方案').length - 1).toBe(1);
    expect(html.split('第二轮决定').length - 1).toBe(1);
  });

  it('被更正的那一句还有记号，点得到 —— 第二层（#20 里被 #21 更正的那一句）也一样', () => {
    const html = render([
      block('b14', 14, '留给 Memohead 的现实窗口约 4 周。'),
      block('b20', 20, '首发地区先英国自用。', corrects('b14', '留给 Memohead 的现实窗口约 4 周。')),
      block('b21', 21, '北美与中国并行。', corrects('b20', '首发地区先英国自用。')),
    ]);
    // One clickable mark per corrected sentence: in #14 and in #20.
    expect(html.match(/role="button"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
