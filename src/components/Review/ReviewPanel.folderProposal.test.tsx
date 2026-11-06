import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FolderProposal } from '@/lib/db/folderProposals';
import { useProposalsStore } from '@/stores/proposalsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import ReviewPanel from './ReviewPanel';

// P15-2（Ocean 2026-11-06 选甲）—— AI 提议把工作区连到一个文件夹 / 换现状文件。卡上说清楚是哪个工作区、哪个文件夹、
// 哪几份文件、点了之后会发生什么；连接要走原来那个对话框，⛔ 卡上没有「同意就连」的按钮。

const now = Date.now();
const proposal = (extra: Partial<FolderProposal>): FolderProposal => ({
  id: 'fp1',
  kind: 'link',
  client: 'Codex · MCP',
  workspaceId: 'w1',
  workspaceTitle: '论文',
  path: '/Users/a/thesis',
  stateFiles: ['README.md', 'plans/HANDOFF_*.md'],
  primaryThreadId: 't1',
  primaryTitle: '第一章',
  linkedPath: null,
  linkedStateFiles: null,
  why: '论文在这儿',
  createdAt: now,
  expiresAt: now + 7 * 86_400_000,
  ...extra,
});

const render = (p: FolderProposal, language: 'zh' | 'en'): string => {
  // ⚠️ zustand v5 renders on the server from `getInitialState()` (memory isolated-verify-workflow §45).
  Object.assign(useSettingsStore.getInitialState(), { language });
  Object.assign(useProposalsStore.getInitialState(), {
    panelOpen: true,
    batches: [],
    fileRequests: [],
    followUpProposals: [],
    fileProposals: [],
    supersedeProposals: [],
    splitProposals: [],
    folderProposals: [p],
  });
  return renderToStaticMarkup(<ReviewPanel />);
};

describe('连文件夹的提议卡', () => {
  it('连接：工作区、完整路径、现状文件、主项目、理由；按钮是「去连接…」（中英）', () => {
    const zh = render(proposal({}), 'zh');
    expect(zh).toContain('Codex · MCP 提议把工作区「论文」连到一个文件夹');
    expect(zh).toContain('/Users/a/thesis');
    expect(zh).toContain('README.md、plans/HANDOFF_*.md');
    expect(zh).toContain('〈第一章〉');
    expect(zh).toContain('论文在这儿');
    expect(zh).toContain('去连接…');
    expect(zh).toContain('走完最后一步才连上');
    expect(zh).not.toContain('换成这几份');
    const en = render(proposal({}), 'en');
    expect(en).toContain('Codex · MCP proposes linking the workspace “论文” to a folder');
    expect(en).toContain('Link…');
    expect(en).toContain('Nothing is linked until the last step.');
  });

  it('换现状文件：现在读的和换成的都列出来，说清 SPOOL.md 会跟着更新', () => {
    const zh = render(
      proposal({ kind: 'state_files', linkedPath: '/Users/a/thesis', linkedStateFiles: ['README.md'], primaryTitle: null }),
      'zh',
    );
    expect(zh).toContain('Codex · MCP 提议换工作区「论文」的现状文件');
    expect(zh).toContain('现在读：');
    expect(zh).toContain('换成这几份');
    expect(zh).toContain('SPOOL.md 的 Spool 那一段跟着更新');
    expect(zh).not.toContain('主项目：');
  });

  it('提议过时了（已经连上别的 / 不再连着这个文件夹）：只剩「不同意」', () => {
    const linkedMeanwhile = render(proposal({ linkedPath: '/Users/a/other' }), 'zh');
    expect(linkedMeanwhile).toContain('「论文」现在已经连着 /Users/a/other 了，这条提议用不上了。');
    expect(linkedMeanwhile).not.toContain('去连接…');
    expect(linkedMeanwhile).toContain('不同意');
    const unlinked = render(proposal({ kind: 'state_files', linkedPath: null }), 'zh');
    expect(unlinked).toContain('「论文」现在没连着这个文件夹了');
    expect(unlinked).not.toContain('换成这几份');
  });
});
