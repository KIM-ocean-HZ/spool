import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Block } from '@/lib/db/blocks';
import { useBlocksStore } from '@/stores/blocksStore';
import BlockFeed from './BlockFeed';

// P9H-4（DISCOVERED-20261013-2，Ocean 10-16 第 147 条「约 45 个字一行（约 720 像素）」）：外接屏上中间
// 那一栏约 1700 像素，块正文一行排约 100 个汉字。现在正文和批注最宽 48 个正文字（中档 720px，
// --block-measure），多出来的留白。
// ⚠️ 服务端渲染量不出像素：这里钉的是「两处都套上了那个宽度、那个宽度是 48 个正文字」；
// 真的一行多宽看截图（外接屏宽度和笔记本宽度各一张）。

const now = Date.now();
const block = (id: string, seq: number, content: string, extra: Partial<Block> = {}): Block =>
  ({
    id, threadId: 't1', kind: 'text', content, annotation: null, annotationBy: null,
    refThreadId: null, refBlockId: null, source: null, pinned: false, seq, createdAt: now + seq,
    staleAt: null, refKind: null, sourceUrl: null, retrievedAt: null, recheckAfter: null,
    correctedQuote: null, gist: null, refNote: null, gistBy: null, refReviewedStaleAt: null,
    replacedByBlockId: null, originalContent: null, compressedAt: null, ...extra,
  }) as Block;

describe('块正文和批注的最大宽度', () => {
  it('正文和批注都套上 --block-measure', () => {
    // ⚠️ zustand v5 renders on the server from `getInitialState()` (memory isolated-verify-workflow §45).
    Object.assign(useBlocksStore.getInitialState(), {
      byThread: { t1: [block('b1', 1, '很长的一段正文。'.repeat(40), { annotation: '这一块是什么' })] },
    });
    const html = renderToStaticMarkup(<BlockFeed threadId="t1" scrollRef={{ current: null }} />);
    const capped = html.match(/max-w-\[var\(--block-measure\)\]/g) ?? [];
    expect(capped.length).toBe(2);
  });

  it('那个宽度是 48 个正文字（中档 15px 时 720px，跟着三档字号走）', () => {
    const css = readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8');
    expect(css).toMatch(/--block-measure:\s*calc\(var\(--block-text\) \* 48\);/);
  });
});
