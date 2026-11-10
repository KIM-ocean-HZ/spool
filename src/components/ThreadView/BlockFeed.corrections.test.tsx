import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Block } from '@/lib/db/blocks';
import { useBlocksStore } from '@/stores/blocksStore';
import { useSearchStore } from '@/stores/searchStore';
import { useSettingsStore } from '@/stores/settingsStore';
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
const render = (blocks: Block[], highlight: string | null = null): string => {
  Object.assign(useBlocksStore.getInitialState(), { byThread: { t1: blocks } });
  Object.assign(useSearchStore.getInitialState(), { highlightBlockId: highlight });
  Object.assign(useSettingsStore.getInitialState(), { language: 'zh' });
  return renderToStaticMarkup(<BlockFeed threadId="t1" scrollRef={{ current: null }} />);
};

const MIN = 60 * 1000;
const at = (minutes: number): Partial<Block> => ({ createdAt: now + minutes * MIN });

// P16-8（11-10，第 289 条）改了画法、没改这条保证：每一块照旧在时间线上自己的位置、按块号找得到（10-16 第 125 条）。
// 更正块缩成一行（内容点开才画），同一批写进来的几块再合成一行；跳到哪一块，它就打开。
describe('更正块在时间线上有自己的位置 (2026-10-16 → 11-10)', () => {
  it('一条更正、一条「更正的更正」都在自己的位置，各一行；内容只画一次', () => {
    const html = render([
      block('b14', 14, '作品集交付版本预估。留给 Memohead 的现实窗口约 4 周。', at(0)),
      block('b20', 20, '统一升级方案：首发地区先英国自用。全文很长。', { ...corrects('b14', '留给 Memohead 的现实窗口约 4 周。'), ...at(60) }),
      block('b21', 21, '第二轮决定：北美与中国并行。', { ...corrects('b20', '首发地区先英国自用。'), ...at(120) }),
    ]);
    for (const id of ['b14', 'b20', 'b21']) expect(html).toContain(`data-block-id="${id}"`);
    expect(html).toContain('#20 更正了 #14 里的一句');
    expect(html).toContain('#21 更正了 #20 里的一句');
    // Not drawn a second time under the sentence it corrects.
    expect(html.split('统一升级方案').length - 1).toBe(1);
    expect(html.split('第二轮决定').length - 1).toBe(1);
  });

  it('被更正的那一句还有记号；跳到 #20 时它整张卡打开，里面被 #21 更正的那一句也点得到', () => {
    const blocks = [
      block('b14', 14, '留给 Memohead 的现实窗口约 4 周。', at(0)),
      block('b20', 20, '首发地区先英国自用。', { ...corrects('b14', '留给 Memohead 的现实窗口约 4 周。'), ...at(60) }),
      block('b21', 21, '北美与中国并行。', { ...corrects('b20', '首发地区先英国自用。'), ...at(120) }),
    ];
    expect(render(blocks).match(/role="button"/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    // One clickable mark per corrected sentence once #20 is open: in #14 and in #20.
    expect(render(blocks, 'b20').match(/role="button"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('一次写进来的几处更正合成一行，带块号范围；跳到组里一块时那一组打开、那一块是整张卡', () => {
    const blocks = [
      block('b1', 1, '想法一', at(0)),
      block('b3', 3, '想法三', at(1)),
      block('b4', 4, '想法四', at(2)),
      block('b10', 10, '「Knote」里的 docs/HANDOFF.md 现在写着：不做', { ...corrects('b3', '想法三'), source: 'Knote 仓库 · docs/HANDOFF.md', ...at(600) }),
      block('b11', 11, '「Knote」最近的一笔提交，说明写着：feat', { ...corrects('b4', '想法四'), source: 'Knote 仓库 · 提交记录', ...at(601) }),
      block('b12', 12, '「Knote」最近的一笔提交，说明写着：fix', { ...corrects('b1', '想法一'), source: 'Knote 仓库 · 提交记录', ...at(602) }),
    ];
    const folded = render(blocks);
    expect(folded).toContain('3 处更正');
    expect(folded).toContain('#10 – #12');
    expect(folded).toContain('data-block-id="b10"');
    expect(folded).not.toContain('data-block-id="b11"');
    expect(folded).not.toContain('最近的一笔提交');
    const opened = render(blocks, 'b11');
    for (const id of ['b10', 'b11', 'b12']) expect(opened).toContain(`data-block-id="${id}"`);
    expect(opened).toContain('#10 更正了 #3 里的一句');
    expect(opened).toContain('#12 更正了 #1 里的一句');
  });

  it('隔得久的不合；置顶的更正照旧整张卡；跟进批进来的几块也合成一行', () => {
    const html = render([
      block('b1', 1, '旧计划', at(0)),
      block('b2', 2, '更正甲', { ...corrects('b1', '旧计划'), ...at(10) }),
      block('b3', 3, '更正乙', { ...corrects('b1', '旧计划'), ...at(30) }),
      block('b4', 4, '置顶的整份方案', { ...corrects('b1', '旧计划'), pinned: true, ...at(31) }),
      block('b5', 5, '找到一', { source: 'Codex · 跟进 · MCP', ...at(90) }),
      block('b6', 6, '找到二', { source: 'Codex · 跟进 · MCP', ...at(91) }),
      block('b7', 7, '只有一块的跟进照旧整张卡', { source: 'Codex · 跟进 · MCP', ...at(200) }),
    ]);
    expect(html).not.toContain('处更正');
    expect(html).toContain('#2 更正了 #1 里的一句');
    expect(html).toContain('#3 更正了 #1 里的一句');
    expect(html).toContain('置顶的整份方案');
    expect(html).not.toContain('#4 更正了');
    expect(html).toContain('跟进带回 2 块');
    expect(html).not.toContain('找到一');
    expect(html).toContain('只有一块的跟进照旧整张卡');
  });
});
