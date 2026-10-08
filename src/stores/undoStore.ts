import { nanoid } from 'nanoid';
import { create } from 'zustand';
import {
  deleteAttachment,
  restoreAttachment,
  setAttachmentAnchor,
  setAttachmentSuperseded,
} from '@/lib/db/attachments';
import { restoreImagePlaces } from '@/lib/db/blockImages';
import {
  computeMergedFields,
  deleteBlock,
  getBlockById,
  mergeBlocks,
  moveBlock,
  restoreBlock,
  restoreBlockFields,
  restoreRefFields,
  setBlockSupersession,
  updateBlockContent,
} from '@/lib/db/blocks';
import {
  getCaptureTargetThread,
  restoreThread,
  setCaptureTarget,
  setThreadCompletion,
  softDeleteThread,
} from '@/lib/db/threads';
import { restoreWorkspace, softDeleteWorkspace } from '@/lib/db/workspaces';
import * as undoLog from '@/lib/undo/undoLog';
import type {
  CapturePayload,
  CreatePayload,
  DeletePayload,
  ForwardPayload,
  HighlightPayload,
  MergePayload,
  MovePayload,
  RefRemovePayload,
  ThreadDeleteManyPayload,
  ThreadDeletePayload,
  UndoEntry,
  WorkspaceArchivePayload,
  WorkspaceDeletePayload,
} from '@/lib/undo/undoLog';

// The single most-recent undo, kept so the overlay confirmation's 重做 (redo) action can
// re-apply it.
// Cleared when a new forward op pushes an undo entry (a fresh action invalidates redo) or
// once the redo is consumed. Only one level deep — §9.13 is a safety net, not a full
// editor history (the redo addition is a v2.9 follow-up Ocean requested on the toast).
interface RedoAction {
  entry: UndoEntry;
  apply: () => Promise<void>;
}

interface UndoStoreState {
  entries: UndoEntry[];
  redoable: RedoAction | null;
  pushUndo: (entry: UndoEntry) => void;
  // Pops the last valid entry, reverses it, and returns it (null if nothing to undo OR the
  // reversal failed). Records a RedoAction so the reversal can be re-applied. Does NOT
  // refresh blocksStore or show the toast — runUndo() in hooks/useUndo.ts orchestrates UI.
  undo: () => Promise<UndoEntry | null>;
  // Re-applies the last undone op and returns its entry (null if nothing redoable / failed).
  redo: () => Promise<UndoEntry | null>;
  invalidateForBlock: (blockId: string) => void;
}

// --- Entry builders. Callers snapshot pre-state, then push one of these. ---

export const buildCaptureUndo = (payload: CapturePayload): UndoEntry => ({
  id: nanoid(),
  kind: 'capture',
  timestamp: Date.now(),
  payload,
  affectedBlockIds: [payload.blockId],
  invalidated: false,
});

/** A block the user typed themselves (Composer → blocksStore.append). See undoLog's
 *  CreatePayload for why this is not just a capture. */
export const buildCreateUndo = (payload: CreatePayload): UndoEntry => ({
  id: nanoid(),
  kind: 'create',
  timestamp: Date.now(),
  payload,
  affectedBlockIds: [payload.blockId],
  invalidated: false,
});

export const buildDeleteUndo = (payload: DeletePayload): UndoEntry => ({
  id: nanoid(),
  kind: 'delete',
  timestamp: Date.now(),
  payload,
  affectedBlockIds: [payload.block.id],
  invalidated: false,
});

export const buildMergeUndo = (payload: MergePayload): UndoEntry => ({
  id: nanoid(),
  kind: 'merge',
  timestamp: Date.now(),
  payload,
  affectedBlockIds: payload.sourceBlocks.map((b) => b.id),
  invalidated: false,
});

// Step 6 §20.5: highlight gesture. Tracks the block so a later content/annotation edit
// invalidates this entry (the user's edit wins).
export const buildHighlightUndo = (payload: HighlightPayload): UndoEntry => ({
  id: nanoid(),
  kind: 'highlight',
  timestamp: Date.now(),
  payload,
  affectedBlockIds: [payload.blockId],
  invalidated: false,
});

// Step 6 §8.1: thread / workspace deletes affect no single block, so they carry no
// affectedBlockIds — a block edit never invalidates them.
export const buildThreadDeleteUndo = (payload: ThreadDeletePayload): UndoEntry => ({
  id: nanoid(),
  kind: 'thread_delete',
  timestamp: Date.now(),
  payload,
  affectedBlockIds: [],
  invalidated: false,
});

// v23: one entry for a whole multi-selection delete — see ThreadDeleteManyPayload.
export const buildThreadDeleteManyUndo = (payload: ThreadDeleteManyPayload): UndoEntry => ({
  id: nanoid(),
  kind: 'thread_delete_many',
  timestamp: Date.now(),
  payload,
  affectedBlockIds: [],
  invalidated: false,
});

export const buildWorkspaceDeleteUndo = (payload: WorkspaceDeletePayload): UndoEntry => ({
  id: nanoid(),
  kind: 'workspace_delete',
  timestamp: Date.now(),
  payload,
  affectedBlockIds: [],
  invalidated: false,
});

// 归档 — one entry for the whole batch (WorkspaceArchivePayload). No block is touched.
export const buildWorkspaceArchiveUndo = (payload: WorkspaceArchivePayload): UndoEntry => ({
  id: nanoid(),
  kind: 'workspace_archive',
  timestamp: Date.now(),
  payload,
  affectedBlockIds: [],
  invalidated: false,
});

// §20.1 forward (copy to thread). The copies are the affected blocks: editing a copy after
// the forward invalidates this entry, so Cmd+Z won't delete an edited copy (the user's most-
// recent edit wins, §9.13). The originals are never in affectedBlockIds — undo never touches
// them.
export const buildForwardUndo = (payload: ForwardPayload): UndoEntry => ({
  id: nanoid(),
  kind: 'forward',
  timestamp: Date.now(),
  payload,
  affectedBlockIds: payload.blocks.map((b) => b.id),
  invalidated: false,
});

// P2 · B2「移除引用」. The citing block is the affected one: editing it afterwards
// invalidates this entry, the same rule as every other kind.
export const buildRefRemoveUndo = (payload: RefRemovePayload): UndoEntry => ({
  id: nanoid(),
  kind: 'ref_remove',
  timestamp: Date.now(),
  payload,
  affectedBlockIds: [payload.blockId],
  invalidated: false,
});

// P2 · B4 移动. Every block it moved or deleted is affected: editing one afterwards
// invalidates the whole entry (the user's latest edit wins, §9.13).
export const buildMoveUndo = (payload: MovePayload): UndoEntry => ({
  id: nanoid(),
  kind: 'move',
  timestamp: Date.now(),
  payload,
  affectedBlockIds: [...payload.moved.map((m) => m.block.id), ...payload.deleted.map((b) => b.id)],
  invalidated: false,
});

// --- Pure helpers over an entry (exported for runUndo / the toast). ---

export const threadIdForEntry = (entry: UndoEntry): string => {
  switch (entry.kind) {
    case 'capture':
    case 'merge':
    case 'highlight':
    case 'forward':
    case 'ref_remove':
      return entry.payload.threadId;
    case 'move':
      return entry.payload.fromThreadId;
    case 'create':
      return entry.payload.threadId;
    case 'delete':
      return entry.payload.block.threadId;
    case 'thread_delete':
      return entry.payload.threadId;
    case 'thread_delete_many':
    case 'workspace_delete':
    case 'workspace_archive':
      // No single thread — the orchestration layer (runUndo) refreshes the workspace and
      // thread stores instead of a block feed, so this is never used for these kinds.
      return '';
  }
};

const PREVIEW_MAX = 12;
const previewText = (raw: string): string => {
  const oneLine = raw.replace(/\s+/g, ' ').trim();
  return oneLine.length <= PREVIEW_MAX ? oneLine : `${oneLine.slice(0, PREVIEW_MAX)}…`;
};

export const previewForEntry = (entry: UndoEntry): string => {
  switch (entry.kind) {
    case 'capture':
      return previewText(entry.payload.content);
    case 'create':
      return previewText(entry.payload.content);
    case 'delete':
      return previewText(entry.payload.block.content);
    case 'merge': {
      const survivor =
        entry.payload.sourceBlocks.find((b) => b.id === entry.payload.survivorId) ??
        entry.payload.sourceBlocks[0];
      return survivor ? previewText(survivor.content) : '';
    }
    case 'highlight':
      return previewText(entry.payload.beforeContent);
    case 'thread_delete':
      return previewText(entry.payload.title);
    // ⚠️ The count has to be in here. The toast names the op ("撤销:删除项目") and then shows
    // this string — a five-project delete that reads back as one project name would look
    // like four of them are still gone. `+4` rather than words: this function has no `t()`
    // (it is a store module, and the toast lives in the overlay window with its own
    // translator), and a number needs no translating.
    case 'thread_delete_many': {
      const [first, ...rest] = entry.payload.threads;
      if (!first) return '';
      return rest.length === 0
        ? previewText(first.title)
        : `${previewText(first.title)} +${rest.length}`;
    }
    case 'workspace_delete':
      return '';
    case 'workspace_archive':
      return previewText(entry.payload.workspaceTitle);
    case 'forward': {
      const first = entry.payload.blocks[0];
      return first ? previewText(first.content) : '';
    }
    case 'ref_remove':
      return previewText(entry.payload.content);
    case 'move': {
      const all = [...entry.payload.moved.map((m) => m.block), ...entry.payload.deleted];
      const [first, ...rest] = all;
      if (!first) return '';
      return rest.length === 0 ? previewText(first.content) : `${previewText(first.content)} +${rest.length}`;
    }
  }
};

// Reverse one entry and return a closure that RE-APPLIES the original operation (redo).
// Every branch is composed of additive (INSERT) or idempotent (UPDATE) writes ordered
// parent-before-child — no intermediate destructive delete — so a partial failure can at
// worst leave some rows unrestored, never lose existing data. (tauri-plugin-sql's
// sqlx pool can't honour BEGIN/COMMIT across statements — see db/threads.ts:141 — so this
// ordering is how §9.13's "no half-applied reversal" is met without a real transaction.)
const reverseAndBuildRedo = async (
  entry: UndoEntry,
): Promise<() => Promise<void>> => {
  switch (entry.kind) {
    case 'capture': {
      // Snapshot the live block (source may have been back-filled since capture) so
      // redo restores it faithfully, then delete it.
      const block = await getBlockById(entry.payload.blockId);
      await deleteBlock(entry.payload.blockId);
      return async () => {
        if (!block) return;
        await restoreBlock(block);
      };
    }
    case 'create': {
      // Identical to a capture's reversal: snapshot the live row first (it may have been
      // pinned, annotated or edited since), delete it, and let redo restore that snapshot.
      const block = await getBlockById(entry.payload.blockId);
      await deleteBlock(entry.payload.blockId);
      return async () => {
        if (!block) return;
        await restoreBlock(block);
      };
    }
    case 'delete': {
      const { block, files = [], removedFiles = false, revived = [] } = entry.payload;
      await restoreBlock(block);
      // v30 (P5-3): the files that hung off it go back on it — re-inserted verbatim if the
      // user took them out of the project with the block, re-hung if they were left on it.
      for (const f of files) {
        if (removedFiles) await restoreAttachment(f);
        else await setAttachmentAnchor(f.id, block.id);
      }
      // P7-1: the older versions they had replaced go back under them. Redo needs nothing
      // extra — deleteAttachment brings them back into use again.
      for (const r of revived) await setAttachmentSuperseded(r.id, r.supersededBy, r.supersededAt);
      return async () => {
        if (removedFiles) for (const f of files) await deleteAttachment(f.id);
        await deleteBlock(block.id);
      };
    }
    case 'merge': {
      const { survivorId, sourceBlocks, files = [], images = [] } = entry.payload;
      for (const b of sourceBlocks) {
        if (b.id !== survivorId) await restoreBlock(b);
      }
      // v30 (P5-3): the merge moved these onto the survivor; each goes back on its own block.
      // Redo needs nothing extra — mergeBlocks moves them onto the survivor again.
      for (const f of files) await setAttachmentAnchor(f.id, f.anchorBlockId);
      // P7-6: the images too, each back on its own block and in its own place.
      await restoreImagePlaces(images);
      const survivor = sourceBlocks.find((b) => b.id === survivorId);
      if (survivor) {
        await restoreBlockFields(
          survivor.id,
          survivor.content,
          survivor.annotation,
          survivor.pinned,
          survivor.source,
        );
      }
      return async () => {
        const merged = computeMergedFields(sourceBlocks);
        await mergeBlocks(
          merged.survivorId,
          merged.content,
          merged.annotation,
          merged.pinned,
          merged.source,
          merged.nonSurvivorIds,
        );
      };
    }
    case 'highlight': {
      const { blockId, beforeContent } = entry.payload;
      // Snapshot the highlighted (after) content first so redo can re-apply it.
      const after = (await getBlockById(blockId))?.content ?? beforeContent;
      await updateBlockContent(blockId, beforeContent);
      return async () => {
        await updateBlockContent(blockId, after);
      };
    }
    case 'thread_delete': {
      const { threadId } = entry.payload;
      await restoreThread(threadId);
      return async () => {
        await softDeleteThread(threadId);
      };
    }
    // v23 multi-select delete. Restoring one at a time is the same call the single case
    // makes, so there is no second reversal path to keep in step with the first — only the
    // loop is new. Order does not matter: threads carry no relation to each other.
    case 'thread_delete_many': {
      const { threads } = entry.payload;
      for (const { threadId } of threads) await restoreThread(threadId);
      return async () => {
        for (const { threadId } of threads) await softDeleteThread(threadId);
      };
    }
    case 'workspace_delete': {
      const { workspaceId, deleteTimestamp } = entry.payload;
      await restoreWorkspace(workspaceId, deleteTimestamp);
      // Redo re-stamps with the SAME timestamp so a following undo still matches.
      return async () => {
        await softDeleteWorkspace(workspaceId, deleteTimestamp);
      };
    }
    // 归档: put back exactly the projects it finished, as they were; redo writes the same
    // archive timestamps again. ⚠️ The capture target only moves back if it is still where
    // the archive put it — a target the user has picked since is their latest word.
    case 'workspace_archive': {
      const { threads, archivedAt, captureFrom, captureTo } = entry.payload;
      const moveTarget = async (from: string, to: string): Promise<void> => {
        if ((await getCaptureTargetThread())?.id === from) await setCaptureTarget(to);
      };
      for (const th of threads) await setThreadCompletion(th.threadId, th);
      if (captureFrom && captureTo) await moveTarget(captureTo, captureFrom);
      return async () => {
        for (const { threadId } of threads) {
          await setThreadCompletion(threadId, {
            status: 'done',
            completedAt: archivedAt,
            updatedAt: archivedAt,
          });
        }
        if (captureFrom && captureTo) await moveTarget(captureFrom, captureTo);
      };
    }
    case 'forward': {
      // §20.1: a forward only ever ADDED these copy blocks. Undo deletes ONLY the copies;
      // the source blocks are never referenced here, so they stay untouched. Redo re-inserts
      // the copies verbatim. (v15: no file was ever copied, so none is deleted or restored.)
      const { blocks } = entry.payload;
      for (const b of blocks) await deleteBlock(b.id);
      return async () => {
        for (const b of blocks) await restoreBlock(b);
      };
    }
    // P2 · B2: the four fields go back exactly as they were; redo is the same clear the
    // button does. Neither direction touches the cited block's retirement.
    case 'ref_remove': {
      const { blockId, refBlockId, refKind, correctedQuote, refReviewedStaleAt } = entry.payload;
      await restoreRefFields(blockId, { refBlockId, refKind, correctedQuote, refReviewedStaleAt });
      return async () => {
        await setBlockSupersession(blockId, null, null, Date.now());
      };
    }
    // P2 · B4: each block goes back to its own project, number and place (a number taken
    // since falls back to a fresh one in moveBlock); the deleted duplicates come back
    // verbatim. Redo makes the same move again.
    case 'move': {
      const { toThreadId, moved, deleted, deletedFiles = [] } = entry.payload;
      // v30 (P5-3): files hung off a moved block ride back with it inside moveBlock.
      for (const { block } of moved) {
        await moveBlock(block.id, block.threadId, block.seq, block.createdAt);
      }
      for (const b of deleted) {
        // ⚠️ Its #n may have been handed to a block captured since (seq is MAX+1). Restoring
        // it verbatim would hit idx_blocks_thread_seq; come back numberless, then take the
        // old number if it is still free.
        await restoreBlock({ ...b, seq: null });
        await moveBlock(b.id, b.threadId, b.seq, b.createdAt);
      }
      // Removing a duplicate put its files on the project; they hang back on it now.
      for (const f of deletedFiles) await setAttachmentAnchor(f.id, f.anchorBlockId);
      return async () => {
        for (const b of deleted) await deleteBlock(b.id);
        for (const m of moved) await moveBlock(m.block.id, toThreadId, m.toSeq, m.toCreatedAt);
      };
    }
  }
};

export const useUndoStore = create<UndoStoreState>((set, get) => ({
  entries: [],
  redoable: null,

  pushUndo: (entry) => {
    undoLog.push(entry);
    // A fresh forward operation invalidates any pending redo.
    set({ entries: undoLog.snapshot(), redoable: null });
  },

  undo: async () => {
    const entry = undoLog.popLastValid();
    set({ entries: undoLog.snapshot() });
    if (!entry) return null;
    try {
      const apply = await reverseAndBuildRedo(entry);
      set({ redoable: { entry, apply } });
    } catch (e) {
      console.error('[undo] reversal failed', e);
      return null;
    }
    return entry;
  },

  redo: async () => {
    const r = get().redoable;
    if (!r) return null;
    try {
      await r.apply();
    } catch (e) {
      console.error('[redo] re-apply failed', e);
      return null;
    }
    // The op exists again — make it undoable, and clear the (now consumed) redo.
    undoLog.push(r.entry);
    set({ entries: undoLog.snapshot(), redoable: null });
    return r.entry;
  },

  invalidateForBlock: (blockId) => {
    undoLog.invalidate(blockId);
    set({ entries: undoLog.snapshot() });
  },
}));
