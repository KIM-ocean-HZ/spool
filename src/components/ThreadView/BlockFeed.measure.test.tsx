import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Block } from '@/lib/db/blocks';
import { useBlocksStore } from '@/stores/blocksStore';
import BlockFeed from './BlockFeed';

// P9Y third-round acceptance: the owner replaced the old 48-character measure with prose
// that fills the available pane. Pixel widths are checked in the WKWebView harness at laptop
// and external-display widths; this guards both rendered reading surfaces against the old cap.

const now = Date.now();
const block = (id: string, seq: number, content: string, extra: Partial<Block> = {}): Block =>
  ({
    id, threadId: 't1', kind: 'text', content, annotation: null, annotationBy: null,
    refThreadId: null, refBlockId: null, source: null, pinned: false, seq, createdAt: now + seq,
    staleAt: null, refKind: null, sourceUrl: null, retrievedAt: null, recheckAfter: null,
    correctedQuote: null, gist: null, refNote: null, gistBy: null, refReviewedStaleAt: null,
    replacedByBlockId: null, originalContent: null, compressedAt: null, ...extra,
  }) as Block;

describe('块正文和批注随内容区宽度排布', () => {
  it('正文和批注都填满可用宽度，不再保留 48 字宽度上限', () => {
    // ⚠️ zustand v5 renders on the server from `getInitialState()` (memory isolated-verify-workflow §45).
    Object.assign(useBlocksStore.getInitialState(), {
      byThread: { t1: [block('b1', 1, '很长的一段正文。'.repeat(40), { annotation: '这一块是什么' })] },
    });
    const html = renderToStaticMarkup(<BlockFeed threadId="t1" scrollRef={{ current: null }} />);
    expect(html).not.toContain('--block-measure');
    expect(html.match(/w-full min-w-0/g)).toHaveLength(2);
  });
});
