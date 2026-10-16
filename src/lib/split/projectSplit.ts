import { nanoid } from 'nanoid';
import { listAttachmentsByThread, moveAttachmentsToThread, type Attachment } from '@/lib/db/attachments';
import { deleteBlock, listBlocksByThread, moveBlock, restoreBlock, type Block } from '@/lib/db/blocks';
import { listFollowUpItems, moveFollowUpItemsToThread, type FollowUpItem } from '@/lib/db/followUpItems';
import {
  deleteSplitProposal,
  getPendingSplitProposal,
  listPendingSplitProposals,
  type SplitProposal,
} from '@/lib/db/splitProposals';
import {
  createThread,
  listAllThreads,
  restoreThread,
  setThreadAiSummary,
  setThreadPrivate,
  softDeleteThread,
  type Thread,
} from '@/lib/db/threads';
import { t } from '@/lib/i18n';
import type { SplitPayload } from '@/lib/undo/undoLog';

// P9G-3 (Ocean 2026-10-16 第 127 – 131 条) — an AI's 「把这个项目拆成几个子项目」 on the review
// screen, and what 「拆分」 does.
//
//   块是**移**过去的（第 127 条）：`moveBlock`, the same move 「复制到 → 删掉原块」 uses — the id does
//     not change, so its number (kept wherever it is free, and a new project has every number
//     free), the files hung on it, its pictures, its pre-compression original and every citation
//     to it from anywhere all come along.
//   原项目留一个总览（第 128 条）：its name stays; one block by Spool says what it was split into,
//     then one link block per sub-project. Blocks the card left in no group stay where they are.
//   项目文件、跟进行逐个指定（第 130 条）：a file that hangs off no block, and a follow-up line, go
//     where the card says (staying is the default). A file takes its older versions with it.
//     Each sub-project gets the AI's one-line summary as an AI-written card, and the original's
//     privacy.
//   一次 ⌘Z 撤回整次拆分: `reverseSplit` — every block back in its number and place, files and
//     lines back, the overview and links gone, the sub-projects deleted (soft, like any deleted
//     project). Anything written into a sub-project since comes back to the original too, so the
//     undo never leaves something in a deleted project, out of sight.
//
// ⛔ No transaction is available (tauri-plugin-sql's pool, threads.ts): the split records into
// the undo payload as it goes, so a split that fails half-way can still be taken back with ⌘Z.

/** Everything the card needs about one proposal, read fresh from the library. */
export interface SplitReviewItem {
  proposal: SplitProposal;
  thread: Pick<Thread, 'id' | 'title' | 'workspaceId' | 'isPrivate' | 'status'>;
  /** Every block of the project, oldest first — including any the AI cannot see. */
  blocks: Block[];
  /** Its files that hang off no block and are not an older version: the ones the card places. */
  files: Attachment[];
  /** Its follow-up lines, live or answered (proposed ones wait on their own card). */
  followUps: FollowUpItem[];
}

/** What the card holds while the user looks at it. Group = a place in `groups`, null = stays. */
export interface SplitDraft {
  groups: { title: string; summary: string }[];
  blocks: Record<string, number | null>;
  files: Record<string, number | null>;
  followUps: Record<string, number | null>;
}

export const listSplitReview = async (now: number): Promise<SplitReviewItem[]> => {
  const proposals = await listPendingSplitProposals(now);
  if (proposals.length === 0) return [];
  const threads = new Map((await listAllThreads()).map((th) => [th.id, th]));
  const out: SplitReviewItem[] = [];
  for (const proposal of proposals) {
    const th = threads.get(proposal.threadId);
    if (!th) continue;
    const [blocks, attachments, lines] = await Promise.all([
      listBlocksByThread(th.id),
      listAttachmentsByThread(th.id),
      listFollowUpItems(th.id),
    ]);
    out.push({
      proposal,
      thread: { id: th.id, title: th.title, workspaceId: th.workspaceId, isPrivate: th.isPrivate, status: th.status },
      blocks,
      files: attachments.filter((a) => a.anchorBlockId === null && a.supersededBy === null),
      followUps: lines.filter((l) => l.status !== 'proposed'),
    });
  }
  return out;
};

/** The card as it opens: what the AI proposed, minus whatever has gone since. Blocks, files and
 *  lines it did not place — or that arrived after it asked — start out staying. */
export const draftFromProposal = (item: SplitReviewItem): SplitDraft => {
  const { plan } = item.proposal;
  const blocks: Record<string, number | null> = {};
  for (const bl of item.blocks) blocks[bl.id] = null;
  plan.groups.forEach((g, i) => {
    for (const id of g.blockIds) if (id in blocks) blocks[id] = i;
  });
  const files: Record<string, number | null> = {};
  for (const f of item.files) files[f.id] = null;
  for (const f of plan.files) if (f.attachmentId in files) files[f.attachmentId] = f.group;
  const followUps: Record<string, number | null> = {};
  for (const l of item.followUps) followUps[l.id] = null;
  for (const l of plan.followUps) if (l.itemId in followUps) followUps[l.itemId] = l.group;
  return { groups: plan.groups.map((g) => ({ title: g.title, summary: g.summary })), blocks, files, followUps };
};

/** How many of these blocks each group has on the card right now. A group with none is not
 *  created. Counted over the blocks that exist, not the card's keys: a block deleted while the
 *  card sat open must not keep its group alive. */
export const groupBlockCounts = (blocks: Block[], draft: SplitDraft): number[] => {
  const counts = draft.groups.map(() => 0);
  for (const bl of blocks) {
    const g = draft.blocks[bl.id];
    if (g !== null && g !== undefined && g < counts.length) counts[g]! += 1;
  }
  return counts;
};

/** Where a file or a line actually lands: a group that will not be created means staying. */
const landing = (g: number | null | undefined, counts: number[]): number | null =>
  g === null || g === undefined || !(counts[g]! > 0) ? null : g;

export interface SeparatedPair {
  /** 'corrects': `block` corrects one sentence of `pointsAt`. 'replaces': `block` replaced it whole. */
  kind: 'corrects' | 'replaces';
  block: Block;
  pointsAt: Block;
}

/** The correction / replacement pairs inside the project that this grouping puts in two
 *  different places — the card warns about each (第 3 条: a correction's mark is drawn only when
 *  both blocks are in one project). */
export const separatedPairs = (blocks: Block[], draft: SplitDraft): SeparatedPair[] => {
  const byId = new Map(blocks.map((bl) => [bl.id, bl]));
  const place = (id: string): number | null => draft.blocks[id] ?? null;
  const out: SeparatedPair[] = [];
  const seen = new Set<string>();
  const add = (kind: SeparatedPair['kind'], block: Block, pointsAt: Block): void => {
    const key = `${block.id}>${pointsAt.id}`;
    if (seen.has(key) || place(block.id) === place(pointsAt.id)) return;
    seen.add(key);
    out.push({ kind, block, pointsAt });
  };
  for (const bl of blocks) {
    const target = bl.refBlockId ? byId.get(bl.refBlockId) : undefined;
    if (target && (bl.refKind === 'corrects' || bl.refKind === 'supersedes')) {
      add(bl.refKind === 'corrects' ? 'corrects' : 'replaces', bl, target);
    }
    const by = bl.replacedByBlockId ? byId.get(bl.replacedByBlockId) : undefined;
    if (by) add('replaces', by, bl);
  }
  return out.sort((a, z) => (a.block.seq ?? 0) - (z.block.seq ?? 0) || (a.pointsAt.seq ?? 0) - (z.pointsAt.seq ?? 0));
};

/** A file and every older version hanging under it, in this project. */
const withOlderVersions = (id: string, all: Attachment[]): string[] => {
  const out = [id];
  for (let i = 0; i < out.length; i++) {
    for (const a of all) if (a.supersededBy === out[i] && !out.includes(a.id)) out.push(a.id);
  }
  return out;
};

const localDate = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export type SplitOutcome =
  | { kind: 'split'; payload: SplitPayload }
  /** The proposal or its project is gone — the card is cleared. */
  | { kind: 'gone' }
  /** No group has a block: nothing to split, nothing done. */
  | { kind: 'empty' }
  /** P9G follow-up (Ocean 2026-10-16): the project is finished — nothing done, the card stays
   *  until the user reopens it. Splitting it would bring live sub-projects (and an archived
   *  workspace) back out. */
  | { kind: 'done'; title: string };

const emptyPayload = (originThreadId: string, originTitle: string): SplitPayload => ({
  originThreadId,
  originTitle,
  children: [],
  moved: [],
  files: [],
  followUps: [],
  created: [],
});

/** 「拆分」. Re-reads the proposal and the project at the moment of the click — the card may have
 *  sat open while blocks came and went. `onPayload` receives the undo record before the first
 *  write and keeps filling it, so a failure half-way is still one ⌘Z away from undone. */
export const applySplit = async (
  proposalId: string,
  draft: SplitDraft,
  now: number,
  onPayload: (p: SplitPayload) => void,
): Promise<SplitOutcome> => {
  const proposal = await getPendingSplitProposal(proposalId, now);
  if (!proposal) return { kind: 'gone' };
  const origin = (await listAllThreads()).find((th) => th.id === proposal.threadId);
  if (!origin) {
    await deleteSplitProposal(proposalId);
    return { kind: 'gone' };
  }
  if (origin.status === 'done') return { kind: 'done', title: origin.title };
  const blocks = await listBlocksByThread(origin.id);
  const attachments = await listAttachmentsByThread(origin.id);
  const lines = await listFollowUpItems(origin.id);
  const counts = groupBlockCounts(blocks, draft);
  if (!counts.some((c) => c > 0)) return { kind: 'empty' };

  const payload = emptyPayload(origin.id, origin.title);
  onPayload(payload);

  // The sub-projects, beside the original, in the card's order. A name taken there gets 「 2」.
  const childOf = new Map<number, string>();
  for (const [i, g] of draft.groups.entries()) {
    if (!(counts[i]! > 0)) continue;
    const proposed = proposal.plan.groups[i]?.title ?? '';
    const child = await createThread(origin.workspaceId, g.title.trim() || proposed);
    payload.children.push({ threadId: child.id, title: child.title });
    childOf.set(i, child.id);
    if (g.summary.trim()) await setThreadAiSummary(child.id, g.summary.trim());
    if (origin.isPrivate) await setThreadPrivate(child.id, true);
  }

  // Blocks: moved, keeping id, number and time. Their own files ride along inside moveBlock.
  for (const bl of blocks) {
    const g = draft.blocks[bl.id];
    const to = g === null || g === undefined ? undefined : childOf.get(g);
    if (!to) continue;
    await moveBlock(bl.id, to, bl.seq, bl.createdAt);
    payload.moved.push({ blockId: bl.id, toThreadId: to, seq: bl.seq, createdAt: bl.createdAt });
  }

  // Project files (with their older versions) and follow-up lines, where the card says.
  for (const a of attachments) {
    if (a.anchorBlockId !== null || a.supersededBy !== null) continue;
    const g = landing(draft.files[a.id], counts);
    const to = g === null ? undefined : childOf.get(g);
    if (!to) continue;
    const ids = withOlderVersions(a.id, attachments);
    await moveAttachmentsToThread(ids, to);
    for (const id of ids) payload.files.push({ id, toThreadId: to });
  }
  for (const l of lines) {
    if (l.status === 'proposed') continue;
    const g = landing(draft.followUps[l.id], counts);
    const to = g === null ? undefined : childOf.get(g);
    if (!to) continue;
    await moveFollowUpItemsToThread([l.id], to);
    payload.followUps.push({ id: l.id, toThreadId: to });
  }

  // The overview, then one link per sub-project, at the end of the original project. Written as
  // whole rows so redo can put back the very same ones.
  const list = payload.children.map((c) => t('〈{title}〉', { title: c.title })).join(t('、'));
  const row = (i: number, fields: Pick<Block, 'kind' | 'content' | 'source' | 'refThreadId'>): Block => ({
    id: nanoid(),
    threadId: origin.id,
    annotation: null,
    annotationBy: null,
    refBlockId: null,
    pinned: false,
    seq: null,
    createdAt: now + i,
    staleAt: null,
    refKind: null,
    sourceUrl: null,
    retrievedAt: null,
    recheckAfter: null,
    correctedQuote: null,
    gist: null,
    refNote: null,
    gistBy: null,
    refReviewedStaleAt: null,
    replacedByBlockId: null,
    originalContent: null,
    compressedAt: null,
    ...fields,
  });
  const created = [
    row(0, {
      kind: 'text',
      content: t('这个项目在 {date} 拆成了 {n} 个子项目：{list}', {
        date: localDate(now),
        n: payload.children.length,
        list,
      }),
      source: 'Spool',
      refThreadId: null,
    }),
    ...payload.children.map((c, i) => row(i + 1, { kind: 'ref', content: c.title, source: null, refThreadId: c.threadId })),
  ];
  for (const bl of created) {
    await restoreBlock(bl); // seq null ⇒ the next free number, decided inside the INSERT
    payload.created.push(bl);
  }

  await deleteSplitProposal(proposalId);
  return { kind: 'split', payload };
};

/** ⌘Z. Everything goes back to the original project — the blocks the split moved into their own
 *  numbers and times, anything written into a sub-project since as well — and the sub-projects,
 *  empty by then, are deleted the way the user deletes a project. */
export const reverseSplit = async (p: SplitPayload): Promise<void> => {
  // First, so the numbers the overview and links took are free again.
  for (const bl of p.created) await deleteBlock(bl.id);
  const moved = new Map(p.moved.map((m) => [m.blockId, m]));
  for (const { threadId } of p.children) {
    for (const bl of await listBlocksByThread(threadId)) {
      const m = moved.get(bl.id);
      await moveBlock(bl.id, p.originThreadId, m ? m.seq : bl.seq, m ? m.createdAt : bl.createdAt);
    }
    await moveAttachmentsToThread(
      (await listAttachmentsByThread(threadId)).map((a) => a.id),
      p.originThreadId,
    );
    await moveFollowUpItemsToThread(
      (await listFollowUpItems(threadId)).map((l) => l.id),
      p.originThreadId,
    );
    await softDeleteThread(threadId);
  }
};

/** Redo: the same split again, from the record — same sub-projects, same blocks, same overview. */
export const redoSplit = async (p: SplitPayload): Promise<void> => {
  for (const { threadId } of p.children) await restoreThread(threadId);
  for (const m of p.moved) await moveBlock(m.blockId, m.toThreadId, m.seq, m.createdAt);
  for (const f of p.files) await moveAttachmentsToThread([f.id], f.toThreadId);
  for (const l of p.followUps) await moveFollowUpItemsToThread([l.id], l.toThreadId);
  for (const bl of p.created) await restoreBlock(bl);
};
