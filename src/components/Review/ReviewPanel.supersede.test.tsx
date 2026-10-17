import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SupersedeReviewItem } from '@/lib/blocks/supersedeReview';
import type { Block } from '@/lib/db/blocks';
import { useProposalsStore } from '@/stores/proposalsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import ReviewPanel from './ReviewPanel';

// P9H-4（DISCOVERED-20261016-6）—— 「更正 / 取代」卡上两块各写块号 + 第一行。只有图片的块，
// 块号后面原来是空的；现在是「[图片]」（拆分卡用的是同一个 firstLine，见 ReviewPanel.split.test）。

const now = Date.now();
const block = (id: string, seq: number, content: string): Block =>
  ({
    id, threadId: 't', kind: 'text', content, annotation: null, annotationBy: null,
    refThreadId: null, refBlockId: null, source: null, pinned: false, seq, createdAt: now + seq,
    staleAt: null, refKind: null, sourceUrl: null, retrievedAt: null, recheckAfter: null,
    correctedQuote: null, gist: null, refNote: null, gistBy: null, refReviewedStaleAt: null,
    replacedByBlockId: null, originalContent: null, compressedAt: null,
  }) as Block;

const item: SupersedeReviewItem = {
  proposal: {
    id: 'sp1',
    threadId: 't',
    staleBlockId: 'old',
    byBlockId: 'new',
    client: 'Claude · MCP',
    why: '新截图是改版之后的。',
    quoteStale: '',
    quoteNew: '',
    retyped: false,
    suggestedKind: 'supersedes',
    createdAt: now,
    expiresAt: now + 7 * 86_400_000,
  },
  older: block('old', 3, '![旧版首页](spool-image:img_old)'),
  newer: block('new', 9, '![](spool-image:img_new)'),
  occupied: null,
};

const render = (language: 'zh' | 'en'): string => {
  // ⚠️ zustand v5 renders on the server from `getInitialState()` (memory isolated-verify-workflow §45).
  Object.assign(useSettingsStore.getInitialState(), { language });
  Object.assign(useProposalsStore.getInitialState(), {
    panelOpen: true,
    batches: [],
    fileRequests: [],
    followUpProposals: [],
    fileProposals: [],
    supersedeProposals: [item],
    splitProposals: [],
  });
  return renderToStaticMarkup(<ReviewPanel />);
};

describe('「更正 / 取代」卡：只有图片的两块', () => {
  it('块号后面写「[图片]」（有图片注释的带上注释），不露图片 id（中英）', () => {
    const zh = render('zh');
    expect(zh).toContain('[图片] 旧版首页');
    expect(zh).toMatch(/>\[图片\]</);
    expect(zh).not.toContain('spool-image');
    const en = render('en');
    expect(en).toContain('[image] 旧版首页');
    expect(en).toMatch(/>\[image\]</);
  });
});
