import { invoke } from '@tauri-apps/api/core';
import { loadApiKey, weeklyReviewViaApi } from '@/lib/ai/compress';
import { apiCallFrom } from '@/lib/ai/vendors';
import { readWeeklyReview } from '@/lib/ai/weeklyStructured';
import { SHOW_REVIEW_OVERLAY_COMMAND, type OverlayReview } from '@/lib/capture/overlayProtocol';
import { recordRun } from '@/lib/db/engineRuns';

/**
 * 用形态 C（`spool-ai` 子进程 + 用户自己填的端点）跑一次周回顾，并把它记进 `engine_runs`。
 *
 * ⚠️ **这一段本来长在 `ReviewBoard` 里。** 2026-08-26 搬出来，因为 `W2` 让自动那条路也能走
 * API —— 而「手动跑」和「自动跑」如果各记各的账，`engine_runs` 里就会出现两种形状的同一件事，
 * 而周回顾那一页只有一张列表。
 *
 * ⚠️ 材料**不在这儿拼** —— Rust 那边自己开库拼（digest 当历史 + 本周新加的块当新动作，
 * ⭐ 范围是 Ocean 拍的：「不是整个 pack」）。这里只负责端点、key、模型和记账。
 */
export interface ApiWeeklySettings {
  apiVendor: string;
  apiBaseUrl: string;
  apiModel: string;
  apiReasoning: string;
  apiTimeoutSecs: number;
}

export const runWeeklyReviewViaApi = async (s: ApiWeeklySettings): Promise<boolean> => {
  const startedAt = Date.now();
  const key = await loadApiKey();
  const call = apiCallFrom(s);
  const out = await weeklyReviewViaApi({
    baseUrl: call.baseUrl,
    apiKey: key,
    model: call.model,
    reasoning: call.reasoning,
    wire: call.wire,
    timeoutSecs: s.apiTimeoutSecs,
  });
  await recordRun({
    action: 'weekly_review',
    // 周回顾读的是整个库，不属于任何一个项目 —— 和 CLI 那条一样。
    threadId: null,
    // ⚠️ 记「实际跑的是哪个模型」而不是一句「api」：按次付费的时候，
    // 「我以为在用 Flash」和「实际在用 Pro」差好几倍，而端点会回报真名。
    engine: out.model ?? s.apiModel,
    outcome: out.ok ? 'ok' : 'failed',
    resultText: out.text.trim() || null,
    detail: out.ok ? null : (out.message ?? null),
    blocksWritten: 0,
    proposalsQueued: 0,
    usage: {
      model: out.model ?? s.apiModel,
      costUsd: null,
      inputTokens: out.inputTokens || null,
      outputTokens: out.outputTokens || null,
    },
    startedAt,
    finishedAt: Date.now(),
  });
  if (out.ok) announceWeeklyReview(out.text);
  return out.ok;
};

/** P10-4: what the 「周回顾更新了」 card says, read off the stored review. null = nothing to announce
 *  (prose, or a run that did not read). */
export const reviewNotice = (text: string): OverlayReview | null => {
  const r = readWeeklyReview(text);
  return r ? { projects: r.projects.length, actions: r.projects.reduce((n, p) => n + p.actions.length, 0) } : null;
};

/** P10-4 (Ocean 2026-10-26 第 220 条): a new review is stored — say so at the capture card's place.
 *  Both roads call this once the row is written, manual and weekly runs alike (任务书 §6.2). A card
 *  that fails to show is not a failed review: the review is on its page either way. */
export const announceWeeklyReview = (text: string): void => {
  const payload = reviewNotice(text);
  if (!payload) return;
  void invoke(SHOW_REVIEW_OVERLAY_COMMAND, { payload }).catch((e) =>
    console.warn('[review] the 「周回顾更新了」 card did not show', e),
  );
};
