import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FileProposal } from '@/lib/db/fileProposals';
import { useProposalsStore } from '@/stores/proposalsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import ReviewPanel from './ReviewPanel';

// P9H-3（DISCOVERED-20261016-4）—— AI 提议把文件挂在某一块上，用户还没点头，那一块就被拆分 /
// 「移到…」挪进了别的项目。卡上原来说「原来要挂的那一块已经删了」；现在说挂到哪个项目第几块。

const now = Date.now();
const proposal = (extra: Partial<FileProposal>): FileProposal => ({
  id: 'fp1',
  kind: 'attach',
  client: 'Claude Code · MCP',
  threadId: 'orig',
  path: '/Users/a/合同.pdf',
  sizeBytes: 2048,
  anchorBlockId: 'b2',
  anchorSeq: 2,
  anchorThreadId: 'orig',
  anchorThreadTitle: '合同',
  supersedesId: null,
  supersedesLabel: null,
  why: '甲方要的',
  createdAt: now,
  expiresAt: now + 7 * 86_400_000,
  ...extra,
});

const render = (p: FileProposal, language: 'zh' | 'en'): string => {
  // ⚠️ zustand v5 renders on the server from `getInitialState()` (memory isolated-verify-workflow §45).
  Object.assign(useSettingsStore.getInitialState(), { language });
  Object.assign(useProposalsStore.getInitialState(), {
    panelOpen: true,
    batches: [],
    fileRequests: [],
    followUpProposals: [],
    fileProposals: [p],
    supersedeProposals: [],
    splitProposals: [],
  });
  return renderToStaticMarkup(<ReviewPanel />);
};

describe('挂文件的提议：那一块挪到别的项目了', () => {
  it('卡上说挂到哪个项目第几块（中英）', () => {
    const moved = proposal({ anchorSeq: 1, anchorThreadId: 'phase2', anchorThreadTitle: '合同 · 第二期' });
    const zh = render(moved, 'zh');
    expect(zh).toContain('那一块已经挪到〈合同 · 第二期〉了。同意之后挂到〈合同 · 第二期〉第 1 块上');
    expect(zh).not.toContain('已经删了');
    const en = render(moved, 'en');
    expect(en).toContain('That block has moved to ‹合同 · 第二期›. Approve and it is attached to block 1 of ‹合同 · 第二期›');
  });

  it('还在原项目的、真删了的：照旧', () => {
    expect(render(proposal({}), 'zh')).toContain('同意之后挂到第 2 块上');
    expect(render(proposal({ anchorSeq: null, anchorThreadId: null, anchorThreadTitle: null }), 'zh')).toContain(
      '原来要挂的那一块已经删了',
    );
  });
});
