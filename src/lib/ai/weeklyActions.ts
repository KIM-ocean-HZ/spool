// P10-3 (Ocean 2026-10-26) — the buttons under a weekly review card.
//
// 标完成 / 改截止日期 / 加跟进行: one click and it is done, and ⌘Z takes it back (one undo entry,
// `review_action`). 取代 / 更正: the click puts it in 待审 (第 219 条), where the user picks
// 更正 / 取代 / 不动 as they do for every AI suggestion of that kind — the library does not change.
// ⛔ The AI never writes anything here: every change is a click by the user.
//
// What a button shows is read off the library, not remembered: a project already done, a deadline
// already on that day, a line already followed, a pair already waiting in 待审. So the card is right
// after a restart, after an undo, and after the user did the same thing by hand somewhere else.

import { supersedeProposalSettled } from '@/lib/blocks/staleGuards';
import { listBlocksByIds, type Block } from '@/lib/db/blocks';
import { addFollowUpItem, listFollowUpItems, type FollowUpItem } from '@/lib/db/followUpItems';
import { listPendingSupersedeProposals, queueSupersedeProposal } from '@/lib/db/supersedeProposals';
import { setThreadCompletion, type Thread } from '@/lib/db/threads';
import { followUpFingerprint } from '@/lib/engine/followUp';
import { scheduleProtocolRefresh } from '@/lib/folders/refresh';
import { useFollowUpStore } from '@/stores/followUpStore';
import { useProposalsStore } from '@/stores/proposalsStore';
import { selectThreadById, useThreadsStore } from '@/stores/threadsStore';
import { buildReviewActionUndo, useUndoStore } from '@/stores/undoStore';
import type { WeeklyAction, WeeklyReview } from './weeklyStructured';

/** A deadline is stored as the last moment of its day (ThreadHeader), so the project reads as
 *  "due today" for the whole of it. */
export const deadlineOfDay = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 23, 59, 59, 999).getTime();
};

/** The day a stored deadline falls on, YYYY-MM-DD. */
export const dayOf = (ms: number): string => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** ready = the button; applied = the library already has it; queued = waiting in 待审;
 *  settled = the user already decided that pair; gone = a block it needs is no longer there. */
export type ActionState = 'ready' | 'applied' | 'queued' | 'settled' | 'gone';

/** What the states are read from, loaded once per review. */
export interface ActionContext {
  followUps: Map<string, FollowUpItem[]>;
  /** `${staleBlockId}|${byBlockId}` of every pair waiting in 待审. */
  pending: Set<string>;
  blocks: Map<string, Block>;
}

export const loadActionContext = async (review: WeeklyReview, now: number): Promise<ActionContext> => {
  const actions = review.projects.flatMap((p) => p.actions.map((a) => ({ threadId: p.threadId, a })));
  const followUps = new Map<string, FollowUpItem[]>();
  for (const id of new Set(actions.filter((x) => x.a.kind === 'add_follow_up').map((x) => x.threadId))) {
    if (id) followUps.set(id, await listFollowUpItems(id));
  }
  const pairs = actions.filter((x) => x.a.staleBlockId && x.a.byBlockId).map((x) => x.a);
  const blocks = new Map<string, Block>();
  const pending = new Set<string>();
  if (pairs.length > 0) {
    for (const b of await listBlocksByIds([...new Set(pairs.flatMap((a) => [a.staleBlockId!, a.byBlockId!]))])) {
      blocks.set(b.id, b);
    }
    for (const r of await listPendingSupersedeProposals(now)) pending.add(`${r.staleBlockId}|${r.byBlockId}`);
  }
  return { followUps, pending, blocks };
};

export const actionState = (a: WeeklyAction, thread: Thread, ctx: ActionContext): ActionState => {
  switch (a.kind) {
    case 'mark_done':
      return thread.status === 'done' ? 'applied' : 'ready';
    case 'set_deadline':
      return thread.deadline !== null && dayOf(thread.deadline) === a.date ? 'applied' : 'ready';
    case 'add_follow_up': {
      const fp = followUpFingerprint(a.text ?? '');
      const lines = ctx.followUps.get(thread.id) ?? [];
      return lines.some((i) => followUpFingerprint(i.text) === fp) ? 'applied' : 'ready';
    }
    case 'propose_supersede':
    case 'correct': {
      const older = ctx.blocks.get(a.staleBlockId ?? '');
      const newer = ctx.blocks.get(a.byBlockId ?? '');
      if (!older || !newer) return 'gone';
      if (supersedeProposalSettled(older, newer, a.kind === 'correct' ? 'corrects' : 'supersedes')) return 'settled';
      return ctx.pending.has(`${older.id}|${newer.id}`) ? 'queued' : 'ready';
    }
  }
};

/** The click. `client` names who suggested it on the 待审 card (「周回顾 · <model>」). */
export const applyWeeklyAction = async (a: WeeklyAction, threadId: string, client: string): Promise<void> => {
  const thread = selectThreadById(threadId)(useThreadsStore.getState());
  if (!thread) return;
  const undo = useUndoStore.getState();
  switch (a.kind) {
    case 'mark_done': {
      if (thread.status === 'done') return;
      const doneAt = Date.now();
      await setThreadCompletion(threadId, { status: 'done', completedAt: doneAt, updatedAt: doneAt });
      undo.pushUndo(
        buildReviewActionUndo({
          op: 'mark_done',
          threadId,
          title: thread.title,
          before: { status: thread.status, completedAt: thread.completedAt, updatedAt: thread.updatedAt },
          doneAt,
        }),
      );
      // P9Y: a finished project leaves its folder's SPOOL.md.
      scheduleProtocolRefresh();
      await useThreadsStore.getState().loadAll();
      return;
    }
    case 'set_deadline': {
      const after = deadlineOfDay(a.date!);
      const before = thread.deadline;
      await useThreadsStore.getState().patch(threadId, { deadline: after });
      undo.pushUndo(buildReviewActionUndo({ op: 'set_deadline', threadId, title: thread.title, before, after }));
      return;
    }
    case 'add_follow_up': {
      const id = await addFollowUpItem(threadId, a.text!, false);
      const item = id ? (await listFollowUpItems(threadId)).find((i) => i.id === id) : undefined;
      if (!item) return;
      undo.pushUndo(buildReviewActionUndo({ op: 'add_follow_up', threadId, title: thread.title, item }));
      const followUps = useFollowUpStore.getState();
      if (followUps.threadId === threadId) await followUps.load(threadId);
      return;
    }
    case 'propose_supersede':
    case 'correct':
      await queueSupersedeProposal({
        threadId,
        staleBlockId: a.staleBlockId!,
        byBlockId: a.byBlockId!,
        client,
        why: a.why,
        quoteStale: a.oldQuote!,
        quoteNew: a.newQuote!,
        retyped: a.retyped,
        suggestedKind: a.kind === 'correct' ? 'corrects' : 'supersedes',
        now: Date.now(),
      });
      // The badge and 待审 pick it up at once (same reload every other proposal path uses).
      await useProposalsStore.getState().refresh();
      return;
  }
};
