import {
  getBlockById,
  listBlocksByIds,
  replaceBlock,
  setBlockSupersession,
  setCorrectedQuote,
  type Block,
  type RefKind,
} from '@/lib/db/blocks';
import {
  deleteSupersedeProposal,
  listPendingSupersedeProposals,
  type SupersedeProposal,
} from '@/lib/db/supersedeProposals';
import { supersedeProposalSettled, wouldOverwriteRelation } from './staleGuards';

// P7-5 (Ocean 2026-10-07, HANDOFF §9.2 第 40 条) — the review screen's card for an AI's
// 「更正 / 取代」 suggestion: 「AI 给出操作建议后，用户在待审中检查，选择最后的更正，取代还是不动」.
// Whatever the AI suggested, all three are the user's to pick.
//
//   更正 = the newer block takes `corrects` + the quoted sentence (the same write as the
//          过期检测 card's 「更正一处」). Only while the newer block's one relation slot is free
//          or already points at this old block — a block corrects one block.
//   取代 = `replaceBlock` (P7-3): the old block retires and remembers which block replaced it;
//          the newer block is not touched, so it can replace several and keep its correction.
//   不动 = the row goes. Leaving it alone is a decision; kept, it would be asked again.
//
// ⛔ No popup, no window raised (P4-2): the badge and the screen changing are the feedback.

export interface SupersedeReviewItem {
  proposal: SupersedeProposal;
  older: Block;
  newer: Block;
  /** The newer block already points at a DIFFERENT block (corrects / cites / a pre-v32
   *  replacement), so 「更正」 would overwrite that — what it points at, for the card to say.
   *  `seq` is null when that block has no number or is gone. null = 「更正」 is free. */
  occupied: { kind: RefKind | null; seq: number | null } | null;
}

/** Everything waiting, across every project, minus what is already done elsewhere (the user
 *  replaced or corrected that pair by hand since the AI asked). */
export const listSupersedeReview = async (now: number): Promise<SupersedeReviewItem[]> => {
  const rows = await listPendingSupersedeProposals(now);
  if (rows.length === 0) return [];
  const ids = new Set(rows.flatMap((r) => [r.staleBlockId, r.byBlockId]));
  const first = await listBlocksByIds([...ids]);
  const byId = new Map(first.map((b) => [b.id, b]));
  // What each newer block already points at, to name it on the card.
  const elsewhere = rows
    .map((r) => byId.get(r.byBlockId)?.refBlockId)
    .filter((id): id is string => !!id && !byId.has(id));
  for (const b of await listBlocksByIds([...new Set(elsewhere)])) byId.set(b.id, b);

  return rows.flatMap((proposal) => {
    const older = byId.get(proposal.staleBlockId);
    const newer = byId.get(proposal.byBlockId);
    if (!older || !newer) return [];
    if (supersedeProposalSettled(older, newer, proposal.suggestedKind)) return [];
    const occupied = wouldOverwriteRelation(older, newer)
      ? { kind: newer.refKind, seq: byId.get(newer.refBlockId!)?.seq ?? null }
      : null;
    return [{ proposal, older, newer, occupied }];
  });
};

export type SupersedeChoice = 'correct' | 'replace' | 'keep';

export type SupersedeOutcome =
  | { kind: 'corrected' | 'replaced' | 'kept'; threadIds: string[] }
  /** 「更正」 while the newer block points at another block — nothing written, the card stays. */
  | { kind: 'occupied' }
  /** The row or one of its two blocks is gone — the card is cleared. */
  | { kind: 'gone' };

/** The click. Re-reads both blocks at this moment — the card may have sat open while the
 *  user edited or retired one of them elsewhere. */
export const decideSupersedeProposal = async (
  id: string,
  choice: SupersedeChoice,
  now: number,
): Promise<SupersedeOutcome> => {
  const row = (await listPendingSupersedeProposals(now)).find((r) => r.id === id);
  if (!row) return { kind: 'gone' };
  const older = await getBlockById(row.staleBlockId);
  const newer = await getBlockById(row.byBlockId);
  if (!older || !newer) {
    await deleteSupersedeProposal(id);
    return { kind: 'gone' };
  }
  if (choice === 'correct') {
    if (wouldOverwriteRelation(older, newer)) return { kind: 'occupied' };
    await setBlockSupersession(newer.id, older.id, 'corrects', now);
    // The quote passed the gate when it was queued; the renderer re-finds it by exact
    // substring, so a sentence edited away since only loses its mark (same as 「更正一处」).
    await setCorrectedQuote(newer.id, row.quoteStale);
  } else if (choice === 'replace') {
    await replaceBlock(older.id, newer.id, now);
  }
  await deleteSupersedeProposal(id);
  const kind = choice === 'correct' ? 'corrected' : choice === 'replace' ? 'replaced' : 'kept';
  return { kind, threadIds: [...new Set([older.threadId, newer.threadId])] };
};
