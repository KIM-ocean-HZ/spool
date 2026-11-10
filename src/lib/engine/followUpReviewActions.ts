import { getBlockById, setBlockRecheck } from '@/lib/db/blocks';
import { closeFollowUpItem } from '@/lib/db/followUpItems';
import { useBlocksStore } from '@/stores/blocksStore';
import { useFollowUpStore } from '@/stores/followUpStore';
import { buildReviewActionUndo, useUndoStore } from '@/stores/undoStore';

import { utcDay, type FollowUpReviewItem } from './followUpReview';

// P16-3: the two clicks on a follow-up run card's list (followUpReview.ts says what the list is). Split from it so
// the engine store, which only reads the list, does not pull in the other stores.

/** 「关掉」 on a line: closed (not deleted) with the AI's sentence as its outcome — what a hand close and the
 *  weekly review's close leave behind too — and ⌘Z reopens it. */
export const closeSuggestedLine = async (
  threadId: string,
  title: string,
  item: Extract<FollowUpReviewItem, { kind: 'line' }>,
): Promise<void> => {
  const outcome = item.why || null;
  await closeFollowUpItem(item.itemId, outcome, null);
  useUndoStore.getState().pushUndo(
    buildReviewActionUndo({ op: 'close_follow_up', threadId, title, itemId: item.itemId, outcome, answerBlockId: null }),
  );
  const followUps = useFollowUpStore.getState();
  if (followUps.threadId === threadId) await followUps.load(threadId);
};

/** 「标成已核对」 on a block that still holds: checked today, due again on the date the AI gave — and ⌘Z puts
 *  the old two dates back. */
export const confirmRecheck = async (
  threadId: string,
  title: string,
  item: Extract<FollowUpReviewItem, { kind: 'block' }>,
  now = Date.now(),
): Promise<void> => {
  const next = item.nextRecheck ? utcDay(item.nextRecheck) : null;
  if (next === null) return;
  const block = await getBlockById(item.blockId);
  if (!block) return;
  const before = { retrievedAt: block.retrievedAt ?? null, recheckAfter: block.recheckAfter ?? null };
  const after = { retrievedAt: utcDay(new Date(now).toISOString().slice(0, 10)), recheckAfter: next };
  await setBlockRecheck(item.blockId, after.retrievedAt, after.recheckAfter);
  useUndoStore.getState().pushUndo(
    buildReviewActionUndo({ op: 'recheck_block', threadId, title, blockId: item.blockId, before, after }),
  );
  if (useBlocksStore.getState().byThread[threadId]) await useBlocksStore.getState().load(threadId);
};
