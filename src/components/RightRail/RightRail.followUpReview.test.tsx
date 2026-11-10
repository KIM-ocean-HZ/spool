import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { EngineRun } from '@/lib/db/engineRuns';
import type { Thread } from '@/lib/db/threads';
import type { FollowUpReviewItem } from '@/lib/engine/followUpReview';
import { useEngineStore } from '@/stores/engineStore';
import { useSettingsStore } from '@/stores/settingsStore';
import RightRail from './index';

// P16-3 验收（11-10 Ocean「我貌似没有看见结果卡……AI 都没有『建议关掉这条跟进』或者『这条要你自己答』」）：
// AI 每次都把列表交回来了，Rust 也核过了 —— 是右栏把跟进的结果卡整张滤掉了（P9S-6），列表挂在那张卡上，所以从来
// 没画出来过。这里渲染的是真的右栏，不是单独的 RunCard。

const thread = {
  id: 't',
  workspaceId: 'w',
  title: '剩余推荐信',
  summary: null,
  digest: null,
  deadline: null,
  status: 'active',
  isCaptureTarget: false,
  createdAt: 1,
  updatedAt: 1,
  completedAt: null,
  autoMaintain: null,
  isPrivate: false,
} as Thread;

const run = (id: string, over: Partial<EngineRun> = {}): EngineRun => ({
  id,
  action: 'follow_up',
  threadId: 't',
  engine: 'codex',
  outcome: 'ok',
  resultText: '这次没有查到可提回 Spool 的新外部进展。',
  detail: null,
  blocksWritten: 0,
  proposalsQueued: 0,
  usage: { costUsd: null, inputTokens: null, outputTokens: null, model: null } as EngineRun['usage'],
  startedAt: 1,
  finishedAt: 2,
  reviewedAt: null,
  ...over,
});

const needsUser: FollowUpReviewItem = {
  kind: 'line',
  itemId: 'i1',
  line: 'Shaily 改完的推荐信终稿是否发回',
  verdict: 'needs_user',
  why: '需查看 Shaily 的邮件或 Teams 回复。',
};

const render = (runs: EngineRun[], reviews: Record<string, FollowUpReviewItem[]>): string => {
  // ⚠️ zustand v5 renders on the server from `getInitialState()` (memory isolated-verify-workflow §45).
  Object.assign(useSettingsStore.getInitialState(), { language: 'zh', aiEngineActionsEnabled: true });
  Object.assign(useEngineStore.getInitialState(), { runs, followUpReviews: reviews });
  return renderToStaticMarkup(<RightRail thread={thread} onCollapse={() => {}} onEditBrief={() => {}} />);
};

describe('跟进跑完：要你定的那几条在右栏', () => {
  it('有要你定的：卡片出现，每条带理由和按钮；AI 的话先折着', () => {
    const html = render([run('r1')], { r1: [needsUser] });
    expect(html).toContain('有 1 条要你定');
    expect(html).toContain('这条要你自己答：Shaily 改完的推荐信终稿是否发回');
    expect(html).toContain('需查看 Shaily 的邮件或 Teams 回复。');
    expect(html).toContain('留着');
    expect(html).not.toContain('这次没有查到可提回 Spool 的新外部进展。');
  });

  it('没有要你定的（或者都点完了）：跟进照旧不占右栏', () => {
    for (const reviews of [{}, { r1: [] }] as Record<string, FollowUpReviewItem[]>[]) {
      const html = render([run('r1')], reviews);
      expect(html).not.toContain('要你定');
      expect(html).not.toContain('从这里去掉（记录和花费仍然留着）');
    }
  });

  it('点过 ✕ 的卡不再出来', () => {
    expect(render([run('r1', { reviewedAt: 3 })], { r1: [needsUser] })).not.toContain('这条要你自己答');
  });
});
