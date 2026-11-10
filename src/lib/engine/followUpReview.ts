// P16-3 (Ocean 11-08 #1「跟进一次就关掉……即使找到了答案，跟进之后 AI 也无法主动或者推荐关闭」; 11-09 第 273、274
// 条): what a follow-up run hands back for the USER to decide, one button per entry on its run card. Rust has
// already checked every entry against the project (`mcp.rs` `follow_up_review_of`): a line here is this
// project's, open and one-off; a block is this project's and really past its recheck date. Nothing here was
// applied by the run — the click is the only thing that changes the library, and ⌘Z takes it back.
//
// ⚠️ Kept in memory with the run card (engineStore `followUpReviews`), not stored: Ocean chose 甲 (不改库), and its
// stated cost is that a closed card — or a restart — loses the suggestions; an unanswered 「这条要你自己答」 is
// checked again by the next run.

export type FollowUpReviewItem =
  | {
      kind: 'line';
      itemId: string;
      line: string;
      /** suggest_close = answered in part or not sure; needs_user = not findable on the open web. */
      verdict: 'suggest_close' | 'needs_user';
      why: string;
      /** A link, or a block number like "#12". */
      evidence?: string;
    }
  | {
      kind: 'block';
      blockId: string;
      seq: number;
      head: string;
      verdict: 'still_holds' | 'changed' | 'cannot_check';
      why: string;
      url?: string;
      /** YYYY-MM-DD — only on still_holds, which always has one (and a url). */
      nextRecheck?: string;
    };

const str = (o: Record<string, unknown>, k: string): string => (typeof o[k] === 'string' ? (o[k] as string) : '');

/** Rust's snake_case entries → the card's. Anything that does not read is left out, never guessed at. */
export const parseFollowUpReview = (raw: unknown): FollowUpReviewItem[] => {
  if (!Array.isArray(raw)) return [];
  const out: FollowUpReviewItem[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const verdict = str(o, 'verdict');
    if (o.kind === 'line' && (verdict === 'suggest_close' || verdict === 'needs_user') && str(o, 'item_id')) {
      out.push({
        kind: 'line',
        itemId: str(o, 'item_id'),
        line: str(o, 'line'),
        verdict,
        why: str(o, 'why'),
        ...(str(o, 'evidence') ? { evidence: str(o, 'evidence') } : {}),
      });
    } else if (
      o.kind === 'block' &&
      (verdict === 'still_holds' || verdict === 'changed' || verdict === 'cannot_check') &&
      str(o, 'block_id') &&
      typeof o.seq === 'number'
    ) {
      if (verdict === 'still_holds' && !str(o, 'next_recheck')) continue;
      out.push({
        kind: 'block',
        blockId: str(o, 'block_id'),
        seq: o.seq,
        head: str(o, 'head'),
        verdict,
        why: str(o, 'why'),
        ...(str(o, 'url') ? { url: str(o, 'url') } : {}),
        ...(str(o, 'next_recheck') ? { nextRecheck: str(o, 'next_recheck') } : {}),
      });
    }
  }
  return out;
};

/** YYYY-MM-DD → that day's UTC midnight, the way recheck dates are stored (mcp.rs `parse_iso_date`). */
export const utcDay = (ymd: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
