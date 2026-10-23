import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { extractAttachmentText } from '@/lib/attachments/extractor';
import * as adb from '@/lib/db/attachments';
import type {
  Attachment,
  AttachmentExtractionKind,
  CreateAttachmentArgs,
} from '@/lib/db/attachments';
import * as db from '@/lib/db/blocks';
import {
  copyImages,
  deleteImages,
  listBlockImagesByThread,
  type BlockImage,
  type ImagePlace,
} from '@/lib/db/blockImages';
import { addImageBytes, addImagesFromPaths, imageErrorMessage } from '@/lib/images/blockImageIo';
import { keepFileIdentities, locateFiles, relocateFile, type FileState, type KeptIdentity } from '@/lib/files/locate';
import { appendImageLines, remapImageIds } from '@/lib/blocks/imageLines';
import type { Block, CreateBlockArgs, IncomingRef, RefKind } from '@/lib/db/blocks';
import { quoteIsInBlock } from '@/lib/blocks/quoteFold';
import { computeMergedFields } from '@/lib/db/blocks';
import {
  buildCreateUndo,
  buildDeleteUndo,
  buildForwardUndo,
  buildMergeUndo,
  buildMoveUndo,
  buildRefRemoveUndo,
  useUndoStore,
} from './undoStore';
import type { MovePayload } from '@/lib/undo/undoLog';
import { useSettingsStore } from './settingsStore';
import { toast } from './toastStore';
import { t } from '@/lib/i18n';

interface BlocksState {
  byThread: Record<string, Block[]>;
  // v15 (DESIGN_PROJECT_FILES): attachments keyed by the PROJECT they belong to, not by a
  // block. Hydrated alongside the blocks on thread load, and read by the right rail's
  // 「项目文件」 panel — which is now the only place files are seen or added.
  attachmentsByThread: Record<string, Attachment[]>;
  /** P7-6: each block's images (no bytes), in order — keyed by block, filled by `load`.
   *  A block with none has no entry. */
  imagesByBlock: Record<string, BlockImage[]>;
  /** P7-7: a new block in this project holding these pictures — pasted into the composer
   *  (bytes, with whatever was typed) or dragged in from Finder (paths). Each picture that
   *  cannot go in says why; a block left with neither text nor a picture is not kept. */
  appendWithImages: (
    threadId: string,
    content: string,
    images: { bytes?: Uint8Array[]; paths?: string[] },
  ) => Promise<Block | null>;
  // v2.8 §20.1: multi-select state for the merge action. Global (single set), cleared
  // on thread switch so a stale selection from a previous thread can't survive.
  selectedBlockIds: Set<string>;
  /** F2 §3.2 ① —— 「**谁引用了我**」，按被引块的 id 存。
   *
   *  ⚠️ 和 `byThread` 不一样，它**不是按项目分区的**：入向边可以来自任何项目
   *  （真库 58 条边 30 条跨项目），⛔ 所以别按 threadId 收拾这个 map。
   *  一次 `load` 把当前项目每一块的入向边一起取回来（一次查询，见
   *  `listIncomingRefsForTargets` 上面那段为什么不能一块一问）。
   *  取不到 = 没人引用它。 */
  incomingByBlock: Record<string, IncomingRef[]>;
  load: (threadId: string) => Promise<void>;
  /** 重新取一个项目的入向边。三个动作改完关系后调它 —— ⛔ 改的是**别的项目**里那一行时，
   *  `byThread` 那一份也可能过期，所以动作自己还要 `load` 引用方所在的项目。 */
  reloadIncoming: (threadId: string) => Promise<void>;
  /** F2 §3.2 ③ 动作一「保留为历史引用」—— 关系不变，永久记住用户已经审过。
   *  ⛔ 它**不让被引块重新有效**，pack 里那一行照旧写「已不作数」（§3.3 小决定一）。 */
  keepAsHistoricalRef: (citingId: string, citedStaleAt: number) => Promise<void>;
  /** F2 §3.2 ③ 动作二「改引当前块」—— 把引用指到用户挑的那一块上。
   *
   *  ⛔⛔ `corrects` 改引时**必须重验 `corrected_quote`**：原来那句逐字未必存在于新目标里。
   *  验不过就**不写**，返回 `'quote-missing'`，由界面决定降成普通引用还是放弃这次改引。
   *  ⚠️ 用的是库里已有的那把尺子（`quoteIsInBlock`），⛔ 别在这儿新写第二把 ——
   *  尤其⛔ 别顺手 `.trim()`，首尾空白也算，放宽之后测试照样绿。 */
  repointRef: (
    citingId: string,
    target: Block,
    opts?: { degradeToCite?: boolean },
  ) => Promise<'ok' | 'quote-missing'>;
  append: (args: CreateBlockArgs) => Promise<Block>;
  togglePin: (id: string) => Promise<void>;
  /** The user's own delete. v30 (P5-3): `removeFiles` says what happens to files hung off the
   *  block — taken out of the project with it, or (default) left on the project. The asking is
   *  the calling screen's job (askBeforeDeletingBlocks); ⛔ nothing here opens a dialog. */
  remove: (id: string, opts?: { removeFiles?: boolean }) => Promise<void>;
  setSource: (id: string, source: string | null) => Promise<void>;
  /** DESIGN_CONTEXT_HYGIENE §3.1 — 「这条不作数了」and taking it back. */
  setStale: (id: string, stale: boolean) => Promise<void>;
  /** ⭐ v24（R2 §1g）：把这一块换回压缩前的原文。⛔ 原文还在，还原是白拿的。 */
  restoreOriginal: (id: string) => Promise<void>;
  /** §3.1 — declared FROM the newer block: which older one it corrects. The target is left
   *  untouched. ⛔ v32 (P7-3): a replacement no longer goes through here — it is
   *  `db.replaceBlock`, written on the OLD block, so the newer one keeps its own relation. */
  setSupersession: (id: string, targetBlockId: string, kind: 'corrects') => Promise<void>;
  /** §3.1 — undo either declaration: the relation goes and the target comes back. */
  clearSupersession: (id: string) => Promise<void>;
  /** 2026-08-19 — the user's own correction, written from the block being corrected: select the
   *  wrong sentence, type what is right. Creates the same shape MCP writes (a block with
   *  ref_kind 'corrects', the target's id and the quote), so there is ONE kind of
   *  correction in the library and the pack needs no new case. */
  addCorrection: (target: Block, quote: string, text: string) => Promise<void>;
  setContent: (id: string, content: string) => Promise<void>;
  /** P7 验收第一轮：pictures taken out of a block in the edit panel — out of the library. */
  removeImages: (blockId: string, imageIds: readonly string[]) => Promise<void>;
  setAnnotation: (id: string, annotation: string | null) => Promise<void>;
  /** Q4（§2.Q4）：用户自己改这一块的摘要（`gist`）。传空 = 清掉。
   *  ⚠️ 写下去的同时盖上 `gistBy = 'user'`，从此 `set_block_gist` 不许再动它。 */
  setGist: (id: string, gist: string | null) => Promise<void>;
  attach: (args: CreateAttachmentArgs) => Promise<Attachment>;
  detach: (attachmentId: string, threadId: string) => Promise<void>;
  // v2.8 §20.2: per-attachment toggle for inlining extracted_text into pack/summaries.
  // Persists immediately and patches the in-memory index so the row reflects state.
  setIncludeInPack: (attachmentId: string, threadId: string, value: boolean) => Promise<void>;
  // v15 §5.1 ①: the standing permission for an AI to ask for this file. Same shape as
  // setIncludeInPack and deliberately NOT the same flag — one is "put the text in the pack
  // I am building", the other is "an AI may ask for this at all".
  setAiAccess: (attachmentId: string, threadId: string, value: boolean) => Promise<void>;
  /** P9-3: where each project file is now, by attachment id — only files looked at since
   *  launch have an entry. */
  fileStates: Record<string, FileState>;
  /** P9-3: look at these files of `threadId` (the right rail, a file about to open, the
   *  export list). A file that moved is followed — its `target` here is updated to match. */
  locateFiles: (threadId: string, ids: string[]) => Promise<FileState[]>;
  /** P9-4: 「是这个」 / 「重新选位置」 — the user said where it is. */
  relocateFile: (threadId: string, id: string, path: string) => Promise<void>;
  /** P9-4: 「已跟到新位置」 looked at (null), or 「知道了」 on a gone file (DISMISSED_NOTICE). */
  setFileNotice: (id: string, notice: string | null) => Promise<void>;
  // v30 (P5): move a block's file back onto the project (null) — the right rail's 「移到项目」.
  // ⚠️ Not in the undo ring, on purpose — same reason as pin: nothing is lost (the file stays
  // in the project's list, in view), and the move is one deliberate click.
  anchorAttachment: (attachmentId: string, threadId: string, blockId: string | null) => Promise<void>;
  // v2.7: one-time startup pass that extracts text for legacy file attachments created
  // before the extraction pipeline existed (PLAN §8.1, §9.6).
  backfillExtractions: () => Promise<void>;
  // v2.8 §20.1: selection helpers. toggleSelect flips one block; selectMany adds a range
  // (used by shift-click); setSelection REPLACES the entire set (used by drag-marquee on
  // every frame — baseline ∪ hits); clearSelection empties it.
  toggleSelect: (id: string) => void;
  selectMany: (ids: string[]) => void;
  setSelection: (ids: Iterable<string>) => void;
  clearSelection: () => void;
  // v2.8 §20.1: merge ≥2 blocks. Survivor = earliest createdAt. Re-points attachments,
  // joins contents chronologically (with [from <source>] prefixes when sources differ),
  // newline-joins annotations, OR-aggregates pinned. Hard-deletes non-survivors. Reloads
  // the thread afterwards so the store reflects the new shape in one round trip.
  mergeBlocks: (ids: string[]) => Promise<void>;
  // §20.1 forward: COPY the given blocks into another thread (cross-workspace allowed).
  // Strictly additive — inserts NEW block + attachment rows and never mutates or deletes the
  // originals. Copies append to the target's bottom (created_at = now, +1ms per block to keep
  // their relative order). Pushes a forward undo (deletes only the copies) and returns each
  // copy with the block it was made from (empty if none resolved or the copy failed).
  forwardToThread: (
    ids: string[],
    targetThreadId: string,
  ) => Promise<{ originalId: string; copyId: string }[]>;
  /** P2 · B4（乙，Ocean 10-02「真移动」）：「复制到…」之后选「删掉原块」。每一对里复制品删掉、
   *  原块（id 不变）挪进复制品的编号和位置；`deleteIds` 是目标里已经有一模一样的那几块的原块，直接删。
   *  整件事一条撤销（forward 那一条随之作废 —— 复制品已经不在了）。返回真正移动 / 删掉了几块。 */
  moveForwarded: (args: {
    fromThreadId: string;
    toThreadId: string;
    pairs: { originalId: string; copyId: string }[];
    deleteIds: string[];
  }) => Promise<{ moved: number; deleted: number }>;
}

// Patch one field of one attachment in the by-thread index. A no-op if that project is not
// loaded — the row is already persisted, and the next load reads it back.
const patchAttachment = (
  s: { attachmentsByThread: Record<string, Attachment[]> },
  threadId: string,
  attachmentId: string,
  fields: Partial<Attachment>,
): Partial<BlocksState> => {
  const list = s.attachmentsByThread[threadId];
  if (!list) return s;
  return {
    attachmentsByThread: {
      ...s.attachmentsByThread,
      [threadId]: list.map((a) => (a.id === attachmentId ? { ...a, ...fields } : a)),
    },
  };
};

// P7-1: the in-memory side of what `deleteAttachment` just did in the table — the older
// versions it brought back are no longer marked replaced.
const revivedIn = (revived: adb.RevivedVersion[]) => {
  const ids = new Set(revived.map((r) => r.id));
  return (a: Attachment): Attachment =>
    ids.has(a.id) ? { ...a, supersededBy: null, supersededAt: null } : a;
};

// v2.7: patch one attachment's extraction fields in the by-thread index. A no-op if the
// thread is not currently loaded (e.g. a backfilled attachment in an unopened project — it
// picks up the cached text from the DB the next time that project loads).
const applyExtraction = (
  map: Record<string, Attachment[]>,
  threadId: string,
  attachmentId: string,
  extractedText: string | null,
  extractionKind: AttachmentExtractionKind,
): Record<string, Attachment[]> => {
  const list = map[threadId];
  if (!list) return map;
  return {
    ...map,
    [threadId]: list.map((a) =>
      a.id === attachmentId
        ? { ...a, extractedText, extractedAt: Date.now(), extractionKind }
        : a,
    ),
  };
};

// Patch one block wherever it is loaded. The feed is keyed by thread and a block only
// lives in one of them, but which one is not worth a lookup for a two-field update.
const patchBlock = (
  set: (partial: Partial<BlocksState>) => void,
  get: () => BlocksState,
  id: string,
  fields: Partial<Block>,
): void => {
  const next: Record<string, Block[]> = {};
  for (const [tId, list] of Object.entries(get().byThread)) {
    next[tId] = list.map((b) => (b.id === id ? { ...b, ...fields } : b));
  }
  set({ byThread: next });
};

/** 一块**现在**在哪个项目里 —— 只在已经加载过的项目里找。
 *  null / 找不到都返回 undefined，调用方按「那个项目没打开过，不用刷」处理。 */
const threadIdOf = (get: () => BlocksState, blockId: string | null | undefined): string | undefined =>
  blockId == null
    ? undefined
    : Object.values(get().byThread)
        .flat()
        .find((b) => b.id === blockId)?.threadId;

/** 把这几个项目的入向边重刷一遍。去重、跳过 undefined。
 *
 *  ⚠️ 存在的理由是 F2 的三个动作**每一个都同时影响两三个项目**：引用方所在的、
 *  原来被引方所在的、新被引方所在的。⛔ 只刷一个的话，跨项目那一半改完界面不动
 *  （真库 58 条边里 30 条跨项目，所以这是常态不是边角）。 */
const refreshIncomingFor = async (
  get: () => BlocksState,
  threadIds: (string | undefined)[],
): Promise<void> => {
  for (const id of new Set(threadIds.filter((x): x is string => !!x))) {
    await get().reloadIncoming(id);
  }
};

export const useBlocksStore = create<BlocksState>((set, get) => {
  // v2.7: extract text for one file attachment, persist the result, and patch it into
  // the by-block index so an open thread / a later Pack reflects the text. Never throws —
  // extraction is best-effort and must not break the attach flow or the startup backfill.
  // `notify` surfaces a genuine extraction failure (not an unsupported file type) as a
  // toast — used on attach so the user sees why a file's text is missing; off for backfill.
  const extractAndStore = async (a: Attachment, notify: boolean): Promise<void> => {
    try {
      const result = await extractAttachmentText(a.target);
      const text = result.ok ? result.text : null;
      await adb.updateAttachmentExtraction(a.id, text, result.kind);
      set((s) => ({
        attachmentsByThread: applyExtraction(
          s.attachmentsByThread,
          a.threadId,
          a.id,
          text,
          result.kind,
        ),
      }));
      if (!result.ok && !result.reason.startsWith('unsupported extension')) {
        console.error('[extract] failed for', a.target, '—', result.reason);
        if (notify) toast.error(t('文件文字提取失败：{msg}', { msg: result.reason }));
      }
    } catch (e) {
      console.error('[extract] failed for attachment', a.id, e);
      if (notify) toast.error(t('文件文字提取失败：{msg}', { msg: e instanceof Error ? e.message : String(e) }));
    }
  };

  return {
    byThread: {},
    attachmentsByThread: {},
    imagesByBlock: {},
    incomingByBlock: {},
    fileStates: {},
    selectedBlockIds: new Set<string>(),

    load: async (threadId) => {
      const [list, attachments, images] = await Promise.all([
        db.listBlocksByThread(threadId),
        adb.listAttachmentsByThread(threadId),
        listBlockImagesByThread(threadId),
      ]);
      // F2 §3.2 ①：这个项目每一块的入向边，**一次查询**取回来。
      // ⚠️ 必须在 `list` 之后 —— 要拿它的 id 当参数，所以进不了上面那个 Promise.all。
      const incoming = await db.listIncomingRefsForTargets(list.map((b) => b.id));
      // v15: one project's files replace that project's entry wholesale. There is no
      // per-block bookkeeping left to reconcile — the query already returned exactly the
      // set that belongs here.
      set((s) => {
        // P7-6: this project's blocks' images replace what was there for them — a block whose
        // last image went has to lose its entry, so clear them all first.
        const imagesByBlock = { ...s.imagesByBlock };
        for (const b of list) delete imagesByBlock[b.id];
        for (const img of images) (imagesByBlock[img.blockId] ??= []).push(img);
        return {
          byThread: { ...s.byThread, [threadId]: list },
          attachmentsByThread: { ...s.attachmentsByThread, [threadId]: attachments },
          imagesByBlock,
          // ⚠️ 合并进去，⛔ 不整份替换：这个 map 是按**块**存的，里面还有别的项目那些块的边。
          incomingByBlock: { ...s.incomingByBlock, ...incoming },
        };
      });
    },

    appendWithImages: async (threadId, content, { bytes = [], paths = [] }) => {
      const b = await db.createBlock({ threadId, kind: 'text', content });
      const added: BlockImage[] = [];
      const errors: unknown[] = [];
      if (paths.length > 0) {
        const report = await addImagesFromPaths(b.id, paths).catch((e: unknown) => ({ added: [], errors: [e] }));
        added.push(...report.added);
        errors.push(...report.errors);
      }
      for (const one of bytes) {
        try {
          added.push(await addImageBytes(b.id, one));
        } catch (e) {
          errors.push(e);
        }
      }
      for (const e of errors) toast.error(imageErrorMessage(e));
      if (added.length === 0 && !content.trim()) {
        // Nothing went in: an empty block is not something the user made.
        await db.deleteBlock(b.id);
        return null;
      }
      // 图文混排（Ocean 2026-10-08）：each picture is a line of the block's text, after what was typed.
      if (added.length > 0) {
        b.content = appendImageLines(content, added.map((i) => i.id));
        await db.updateBlockContent(b.id, b.content);
      }
      // Same as `append`: the user's own new block, so ⌘Z takes it back (pictures and all —
      // `deleteBlock` parks them, the redo puts them back).
      const shown = content.trim()
        ? content
        : t('一张图片（{w}×{h}）', { w: added[0]!.width, h: added[0]!.height });
      useUndoStore
        .getState()
        .pushUndo(buildCreateUndo({ blockId: b.id, threadId: b.threadId, content: shown }));
      set((s) => ({
        byThread: { ...s.byThread, [b.threadId]: [...(s.byThread[b.threadId] ?? []), b] },
        imagesByBlock: added.length > 0 ? { ...s.imagesByBlock, [b.id]: added } : s.imagesByBlock,
      }));
      return b;
    },

    /** 改完一条关系之后，把**受影响的那几块**所在的项目重刷一遍入向边。
     *
     *  ⛔⛔ 受影响的是**被引方**（它头上的「谁引用了我」变了），⛔ 不是引用方 ——
     *  而被引方**可以在别的项目里**（真库 58 条边 30 条跨项目）。只刷引用方那个项目，
     *  跨项目的那一半改完界面不动，看上去像没生效。
     *  ⚠️ 项目没打开过（`byThread` 里没有）就跳过 —— 它下次 `load` 时自然是新的。 */
    reloadIncoming: async (threadId) => {
      const ids = (get().byThread[threadId] ?? []).map((b) => b.id);
      if (ids.length === 0) return;
      const incoming = await db.listIncomingRefsForTargets(ids);
      set((s) => {
        // ⚠️ 先把这几块的旧条目清掉再合并 —— 一条边被**移除**之后，
        // 查询不会再返回它，光合并的话它会永远留在 map 里（界面上删不掉）。
        const next = { ...s.incomingByBlock };
        for (const id of ids) delete next[id];
        return { incomingByBlock: { ...next, ...incoming } };
      });
    },

    keepAsHistoricalRef: async (citingId, citedStaleAt) => {
      const citing = Object.values(get().byThread)
        .flat()
        .find((b) => b.id === citingId);
      await db.setRefReviewed(citingId, citedStaleAt);
      patchBlock(set, get, citingId, { refReviewedStaleAt: citedStaleAt });
      // ⚠️ 刷的是**被引方**那个项目：变的是它头上那条边的「等着你看一眼」记号。
      await refreshIncomingFor(get, [citing?.threadId, threadIdOf(get, citing?.refBlockId)]);
    },

    repointRef: async (citingId, target, opts) => {
      const citing = Object.values(get().byThread)
        .flat()
        .find((b) => b.id === citingId);
      if (!citing) return 'ok';
      let kind: RefKind | null = citing.refKind;
      let quote = citing.correctedQuote;
      if (citing.refKind === 'corrects' && quote) {
        // ⛔⛔ §3.3 五：逐字重验，用库里那把尺子。验不过**不写库** ——
        // 一条指得对、瞄准处却不存在的更正，比没有关系更难发现。
        if (!quoteIsInBlock(quote, target.content)) {
          if (!opts?.degradeToCite) return 'quote-missing';
          // 用户选了降级：关系降成普通引用，那一句跟着走（它只属于 `corrects`）。
          kind = null;
          quote = null;
        }
      }
      await db.repointCitation(citingId, target.id, kind, quote);
      patchBlock(set, get, citingId, {
        refBlockId: target.id,
        refKind: kind,
        correctedQuote: quote,
        refReviewedStaleAt: null,
      });
      // 三个项目都可能受影响：引用方的、**原来**被引的、**新**被引的。
      await refreshIncomingFor(get, [
        citing.threadId,
        threadIdOf(get, citing.refBlockId),
        target.threadId,
      ]);
      return 'ok';
    },

    append: async (args) => {
      const b = await db.createBlock(args);
      // ⚠️ Ocean, Windows 验收 2026-08-18 #1: 「自己写入的 block 无法撤销」. This is the
      // composer's path — the most common way a block comes into existence — and it was the
      // only creating action that recorded nothing. Capture, merge and forward all did.
      // ⚠️ `append` is the COMPOSER's entry point and nothing else calls it; blocks written
      // by MCP or the overlay go through db.createBlock directly and stay out of the undo
      // ring on purpose (an undo the user cannot see the cause of is worse than none).
      useUndoStore
        .getState()
        .pushUndo(buildCreateUndo({ blockId: b.id, threadId: b.threadId, content: b.content }));
      set((s) => ({
        byThread: {
          ...s.byThread,
          [b.threadId]: [...(s.byThread[b.threadId] ?? []), b],
        },
      }));
      return b;
    },

    togglePin: async (id) => {
      const pinned = await db.togglePin(id);
      const state = get();
      const next: Record<string, Block[]> = {};
      for (const [tId, list] of Object.entries(state.byThread)) {
        next[tId] = list.map((b) => (b.id === id ? { ...b, pinned } : b));
      }
      set({ byThread: next });
    },

    remove: async (id, opts) => {
      // §9.13: snapshot the block BEFORE the destructive delete so the undo entry captures
      // pre-state. ⚠️ v15: deleting a block no longer takes any file with it — files belong
      // to the project now. v30 (P5-3) brings back the one exception: a file hung off this
      // block. Read from the library, not the in-memory index, so a file is never missed.
      const before = get();
      let snapshot: Block | undefined;
      for (const list of Object.values(before.byThread)) {
        const found = list.find((b) => b.id === id);
        if (found) {
          snapshot = found;
          break;
        }
      }
      const files = await adb.listAttachmentsAnchoredTo([id]);
      const removedFiles = opts?.removeFiles === true && files.length > 0;

      // Out of the project first, then the block — deleteBlock would otherwise have put them
      // back on the project (its default for every other path). P7-1: an older version one of
      // them had replaced comes back into use; undo marks it replaced again.
      const revived: adb.RevivedVersion[] = [];
      // P9H-2: what the rows cannot carry (the identity is a BLOB), read before they go. A failed
      // read costs only that: the file still comes back, and is recognised again on next sight.
      let identities: KeptIdentity[] = [];
      if (removedFiles) {
        identities = await keepFileIdentities(files.map((f) => f.id)).catch((e: unknown) => {
          console.warn('[delete] could not keep the files\u2019 identities', e);
          return [];
        });
        for (const f of files) revived.push(...(await adb.deleteAttachment(f.id)));
      }
      await db.deleteBlock(id);

      if (snapshot) {
        useUndoStore
          .getState()
          .pushUndo(buildDeleteUndo({ block: snapshot, files, removedFiles, revived, identities }));
      }

      const state = get();
      const next: Record<string, Block[]> = {};
      for (const [tId, list] of Object.entries(state.byThread)) {
        next[tId] = list.filter((b) => b.id !== id);
      }
      const gone = new Set(files.map((f) => f.id));
      const attachmentsByThread: Record<string, Attachment[]> = {};
      for (const [tId, list] of Object.entries(state.attachmentsByThread)) {
        attachmentsByThread[tId] = removedFiles
          ? list.filter((a) => !gone.has(a.id)).map(revivedIn(revived))
          : list.map((a) => (gone.has(a.id) ? { ...a, anchorBlockId: null } : a));
      }
      set(files.length > 0 ? { byThread: next, attachmentsByThread } : { byThread: next });
    },

    setSource: async (id, source) => {
      await db.updateBlockSource(id, source);
      const state = get();
      const next: Record<string, Block[]> = {};
      for (const [tId, list] of Object.entries(state.byThread)) {
        next[tId] = list.map((b) => (b.id === id ? { ...b, source } : b));
      }
      set({ byThread: next });
    },

    // DESIGN_CONTEXT_HYGIENE §3.1 — one timestamp, and the block is out of every pack.
    // No confirmation dialog and no undo entry, for the same reason pin has neither: the
    // action is its own inverse and the button sitting there says so. Nothing is deleted.
    setStale: async (id, stale) => {
      const staleAt = stale ? Date.now() : null;
      const { released, restored } = await db.setBlockStale(id, staleAt);
      // v32 (P7-3): taking it back clears 「被第 n 块取代」 too (setBlockStale does the same).
      patchBlock(set, get, id, stale ? { staleAt } : { staleAt, replacedByBlockId: null });
      // P9S-2: the citations that went with it (or came back with it), on whichever block shows them.
      for (const e of released) {
        patchBlock(set, get, e.citingId, {
          refBlockId: null,
          refKind: null,
          correctedQuote: null,
          refReviewedStaleAt: null,
        });
      }
      for (const e of restored) {
        patchBlock(set, get, e.citingId, {
          refBlockId: e.citedId,
          refKind: e.refKind,
          correctedQuote: e.correctedQuote,
        });
      }
      const touched = [...released, ...restored];
      if (touched.length > 0) {
        await refreshIncomingFor(get, [threadIdOf(get, id), ...touched.map((e) => e.citingThreadId)]);
      }
    },

    // ⭐ v24（R2 §1g）：一键还原。⚠️ 原文回到 `content` 之后，`original_content` 和
    // `compressed_at` 一起清空 —— 这一块从此又是「没被压过」，🗜 记号也跟着没了。
    restoreOriginal: async (id) => {
      const before = Object.values(get().byThread)
        .flat()
        .find((b) => b.id === id);
      if (!before?.originalContent) {
        // ⛔ 不静默：按钮本来就只在原文还在的时候出现，走到这儿说明状态和库对不上了。
        toast.error(t('这一块压缩时没有留原文，还原不了。'));
        return;
      }
      const ok = await db.restoreBlockOriginal(id);
      if (!ok) {
        toast.error(t('这一块压缩时没有留原文，还原不了。'));
        return;
      }
      patchBlock(set, get, id, {
        content: before.originalContent,
        originalContent: null,
        compressedAt: null,
      });
      toast.notice(t('已还原成压缩前的原文'));
    },

    setSupersession: async (id, targetBlockId, kind) => {
      const now = Date.now();
      await db.setBlockSupersession(id, targetBlockId, kind, now);
      const state = get();
      const next: Record<string, Block[]> = {};
      for (const [tId, list] of Object.entries(state.byThread)) {
        next[tId] = list.map((b) => (b.id === id ? { ...b, refBlockId: targetBlockId, refKind: kind } : b));
      }
      set({ byThread: next });
    },

    // The relation goes; the target's retirement does NOT come back automatically. It was
    // its own statement the moment it was made, and un-retiring something the user may have
    // retired for three other reasons would be this feature guessing on their behalf —
    // exactly what §3.1 keeps AI out of. 「这条不作数了」 on the target is the way back.
    clearSupersession: async (id) => {
      // ⚠️ 先记下它**原来**指着谁 —— 清完就问不出来了，而要刷的正是那一块所在的项目。
      // P2 · B2：从库里读，⛔ 不读 store 那一份 —— 撤销要原样写回的四个字段以库为准。
      const before = await db.getBlockById(id);
      await db.setBlockSupersession(id, null, null, Date.now());
      // ⚠️ v29：`setBlockSupersession` 顺手把 `ref_reviewed_stale_at` 也清了（那条确认
      // 说的是「我看过那一块退役了」，关系都没了就无从确认起），本地这一份要跟上。
      patchBlock(set, get, id, {
        refBlockId: null,
        refKind: null,
        correctedQuote: null,
        refReviewedStaleAt: null,
      });
      // P2 · B2（DISCOVERED-20260830-20）：这个动作以前是全屏唯一一个单向的，现在进撤销环。
      if (before?.refBlockId) {
        useUndoStore.getState().pushUndo(
          buildRefRemoveUndo({
            blockId: id,
            threadId: before.threadId,
            content: before.content,
            refBlockId: before.refBlockId,
            refKind: before.refKind,
            correctedQuote: before.correctedQuote,
            refReviewedStaleAt: before.refReviewedStaleAt,
          }),
        );
      }
      await refreshIncomingFor(get, [before?.threadId, threadIdOf(get, before?.refBlockId)]);
    },

    // 2026-08-19 (Ocean): the manual half of 「入口两种」. The AI's half already existed
    // — add_block with ref_kind 'corrects' — and this deliberately lands the same row rather
    // than a lighter side-table: two kinds of correction would mean two renderers, two pack
    // cases and two ways for them to drift.
    //
    // ⚠️ No `source`. That is the whole author distinction downstream (CorrectionNote reads
    // it): MCP stamps its client label, and a block written here has none because the user
    // wrote it. Nothing marks it as AI, and nothing may.
    addCorrection: async (target, quote, text) => {
      const b = await get().append({ threadId: target.threadId, content: text.trim() });
      await get().setSupersession(b.id, target.id, 'corrects');
      // The quote is what anchors the mark to a sentence; without it the note still exists
      // but has nowhere to attach, so it is written in the same breath as the relation.
      await db.setCorrectedQuote(b.id, quote);
      patchBlock(set, get, b.id, { correctedQuote: quote });
    },

    setContent: async (id, content) => {
      await db.updateBlockContent(id, content);
      // §9.13: a content edit invalidates any prior undo entry for this block — the
      // user's most-recent edit wins, so Cmd+Z won't silently revert it.
      useUndoStore.getState().invalidateForBlock(id);
      const state = get();
      const next: Record<string, Block[]> = {};
      for (const [tId, list] of Object.entries(state.byThread)) {
        next[tId] = list.map((b) => (b.id === id ? { ...b, content } : b));
      }
      set({ byThread: next });
    },

    removeImages: async (blockId, imageIds) => {
      if (imageIds.length === 0) return;
      await deleteImages(imageIds);
      const gone = new Set(imageIds);
      set((s) => {
        const left = (s.imagesByBlock[blockId] ?? []).filter((i) => !gone.has(i.id));
        const imagesByBlock = { ...s.imagesByBlock };
        if (left.length > 0) imagesByBlock[blockId] = left;
        else delete imagesByBlock[blockId];
        return { imagesByBlock };
      });
    },

    setAnnotation: async (id, annotation) => {
      // ⭐ The author comes BACK from the write (2026-08-25): editing an AI note keeps it an
      // AI note, marked as edited, so the feed has to re-render with the new label rather
      // than assume 'user'.
      const annotationBy = await db.updateBlockAnnotation(id, annotation);
      // §9.13: an annotation edit invalidates any prior undo entry for this block (same
      // rationale as setContent). Pin/source edits do NOT — those are reversible by the
      // reverse action, so they leave undo entries intact.
      useUndoStore.getState().invalidateForBlock(id);
      const state = get();
      const next: Record<string, Block[]> = {};
      for (const [tId, list] of Object.entries(state.byThread)) {
        next[tId] = list.map((b) => (b.id === id ? { ...b, annotation, annotationBy } : b));
      }
      set({ byThread: next });
    },

    // Q4（§2.Q4）：和 `setAnnotation` 同一个形状，两处**有意不同**：
    //  ① ⛔ 不碰撤销栈。摘要不是内容 —— 它进不了 pack，改错了就地再改一次就行，
    //     而 `invalidateForBlock` 会把这一块**正文的**那条撤销记录一起打掉。
    //  ② 作者是写死的 'user'，不是算出来的（`annotation_by` 那三态是为 pack 权威存在的，
    //     `gist` 不进 pack —— 详见 `updateBlockGist`）。
    setGist: async (id, gist) => {
      const trimmed = gist?.trim();
      const next = trimmed ? trimmed : null;
      await db.updateBlockGist(id, next);
      const state = get();
      const byThread: Record<string, Block[]> = {};
      for (const [tId, list] of Object.entries(state.byThread)) {
        byThread[tId] = list.map((b) =>
          b.id === id ? { ...b, gist: next, gistBy: 'user' as const } : b,
        );
      }
      set({ byThread });
    },

    attach: async (args) => {
      const a = await adb.createAttachment(args);
      set((s) => ({
        attachmentsByThread: {
          ...s.attachmentsByThread,
          [a.threadId]: [...(s.attachmentsByThread[a.threadId] ?? []), a],
        },
      }));
      // v2.7: kick off background text extraction for file attachments (§9.6). Fire-and-
      // forget — the chip is already visible; extracted text is patched in when ready.
      // Skipped entirely when the user has disabled auto-extraction (§2.5 privacy).
      if (a.kind === 'file' && useSettingsStore.getState().autoExtractAttachments) {
        void extractAndStore(a, true);
      }
      // P9-3: its identity is recorded the moment it is attached, so a move right after is
      // followed too (「挂上的那一刻记」). Fire-and-forget like the extraction above.
      void get().locateFiles(a.threadId, [a.id]);
      return a;
    },

    locateFiles: async (threadId, ids) => {
      let states: FileState[];
      try {
        states = await locateFiles(ids);
      } catch (e) {
        // Not being able to look is not news for the user: the list shows what it showed.
        console.warn('[files] locate failed', e);
        return [];
      }
      const byId = new Map(states.map((st) => [st.id, st]));
      set((s) => {
        const list = s.attachmentsByThread[threadId];
        return {
          fileStates: { ...s.fileStates, ...Object.fromEntries(byId) },
          attachmentsByThread: list
            ? {
                ...s.attachmentsByThread,
                [threadId]: list.map((a) => {
                  const st = byId.get(a.id);
                  return st && st.path !== a.target ? { ...a, target: st.path } : a;
                }),
              }
            : s.attachmentsByThread,
        };
      });
      return states;
    },

    relocateFile: async (threadId, id, path) => {
      const st = await relocateFile(id, path);
      set((s) => ({
        ...patchAttachment(s, threadId, id, { target: st.path }),
        fileStates: { ...s.fileStates, [id]: st },
      }));
    },

    setFileNotice: async (id, notice) => {
      await adb.setAttachmentNotice(id, notice);
      set((s) => {
        const st = s.fileStates[id];
        return st ? { fileStates: { ...s.fileStates, [id]: { ...st, notice } } } : s;
      });
    },

    detach: async (attachmentId, threadId) => {
      const revived = await adb.deleteAttachment(attachmentId);
      set((s) => {
        const list = s.attachmentsByThread[threadId];
        if (!list) return s;
        return {
          attachmentsByThread: {
            ...s.attachmentsByThread,
            [threadId]: list.filter((a) => a.id !== attachmentId).map(revivedIn(revived)),
          },
        };
      });
    },

    setIncludeInPack: async (attachmentId, threadId, value) => {
      await adb.setIncludeInPack(attachmentId, value);
      set((s) => patchAttachment(s, threadId, attachmentId, { includeInPack: value }));
    },

    setAiAccess: async (attachmentId, threadId, value) => {
      await adb.setAiAccess(attachmentId, value);
      set((s) => patchAttachment(s, threadId, attachmentId, { aiAccess: value }));
    },

    anchorAttachment: async (attachmentId, threadId, blockId) => {
      await adb.setAttachmentAnchor(attachmentId, blockId);
      set((s) => patchAttachment(s, threadId, attachmentId, { anchorBlockId: blockId }));
    },

    backfillExtractions: async () => {
      // Respects the same privacy switch as on-attach extraction (§2.5).
      if (!useSettingsStore.getState().autoExtractAttachments) return;
      let pending: Attachment[];
      try {
        pending = await adb.listAttachmentsNeedingExtraction();
      } catch (e) {
        console.warn('[extract] backfill query failed', e);
        return;
      }
      // Sequential — one file at a time so app startup doesn't hammer the disk (§2.4).
      for (const a of pending) {
        await extractAndStore(a, false);
      }
    },

    toggleSelect: (id) => {
      set((s) => {
        const next = new Set(s.selectedBlockIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { selectedBlockIds: next };
      });
    },

    selectMany: (ids) => {
      set((s) => {
        const next = new Set(s.selectedBlockIds);
        for (const id of ids) next.add(id);
        return { selectedBlockIds: next };
      });
    },

    setSelection: (ids) => {
      const next = new Set(ids);
      set((s) => {
        // Guard against churn — the drag-marquee tick calls this every frame even when
        // the hit set hasn't changed; without this, every frame triggers a full feed
        // re-render. Cheap O(n) compare since n is the selection size, not the feed.
        if (s.selectedBlockIds.size === next.size) {
          let same = true;
          for (const id of next) {
            if (!s.selectedBlockIds.has(id)) {
              same = false;
              break;
            }
          }
          if (same) return s;
        }
        return { selectedBlockIds: next };
      });
    },

    clearSelection: () => {
      set((s) => (s.selectedBlockIds.size === 0 ? s : { selectedBlockIds: new Set() }));
    },

    mergeBlocks: async (ids) => {
      if (ids.length < 2) return;
      const state = get();
      // Collect every selected block across threads. In practice they all sit in the
      // same thread (the UI only selects within one feed at a time), but reading from
      // every loaded thread keeps the store function decoupled from the caller.
      const wanted = new Set(ids);
      const found: { threadId: string; block: Block }[] = [];
      for (const [tId, list] of Object.entries(state.byThread)) {
        for (const b of list) {
          if (wanted.has(b.id)) found.push({ threadId: tId, block: b });
        }
      }
      if (found.length !== ids.length) {
        console.warn('[merge] some selected ids not found in loaded threads', {
          requested: ids,
          found: found.map((x) => x.block.id),
        });
      }
      if (found.length < 2) return;
      const threadIds = new Set(found.map((x) => x.threadId));
      if (threadIds.size > 1) {
        console.warn('[merge] refusing cross-thread merge', { threadIds: [...threadIds] });
        toast.error(t('合并失败：所选 block 跨项目'));
        return;
      }
      const threadId = found[0]!.threadId;

      const merged = computeMergedFields(found.map((x) => x.block));

      // §9.13: snapshot pre-merge state for undo — the full rows BEFORE the merge mutates
      // the survivor. ⚠️ v15: a merge no longer moves any file. Files belong to the project,
      // and merging two of its blocks does not change which project they are in.
      // v30 (P5-3): except the files hung off a block being merged away — db.mergeBlocks
      // moves them onto the survivor, and undo needs to know where each one was.
      const sourceBlocks = found.map((x) => x.block);
      const files = await adb.listAttachmentsAnchoredTo(merged.nonSurvivorIds);

      let images: ImagePlace[] = [];
      try {
        images = await db.mergeBlocks(
          merged.survivorId,
          merged.content,
          merged.annotation,
          merged.pinned,
          merged.source,
          merged.nonSurvivorIds,
        );
      } catch (e) {
        console.error('[merge] failed', e);
        toast.error(t('合并失败：{msg}', { msg: e instanceof Error ? e.message : String(e) }));
        return;
      }

      useUndoStore.getState().pushUndo(
        buildMergeUndo({ survivorId: merged.survivorId, threadId, sourceBlocks, files, images }),
      );
      // Clear selection and reload — simpler and safer than reconstructing the merged
      // block in-memory.
      set((s) => (s.selectedBlockIds.size === 0 ? s : { selectedBlockIds: new Set() }));
      await get().load(threadId);
    },

    forwardToThread: async (ids, targetThreadId) => {
      if (ids.length === 0) return [];
      const state = get();
      // Resolve the selected source blocks from the loaded feeds (in practice the active
      // thread — selection is per-feed). Sort by createdAt so the copies append to the
      // target in the same relative order they had in the source.
      const wanted = new Set(ids);
      const sources: Block[] = [];
      for (const list of Object.values(state.byThread)) {
        for (const b of list) {
          if (wanted.has(b.id)) sources.push(b);
        }
      }
      if (sources.length === 0) return [];
      sources.sort((a, b) => a.createdAt - b.createdAt);

      // Build the NEW rows: fresh ids, target thread_id, now-based created_at (+i ms per
      // block to preserve order → they append to the target's bottom chronologically). Every
      // other field is copied verbatim. Nothing here reads back or mutates a source row; the
      // originals are strictly read-only.
      // ⚠️ v15: no file travels with a copied block. Files belong to the source PROJECT, and
      // copying one of its conclusions into another project is not a reason to copy its
      // files there — if the destination needs a file, the user adds it in that project.
      const base = Date.now();
      const copyBlocks: Block[] = [];
      sources.forEach((src, i) => {
        const newId = nanoid();
        copyBlocks.push({
          id: newId,
          threadId: targetThreadId,
          kind: src.kind,
          content: src.content,
          annotation: src.annotation,
          // v14: authorship copies with the note. A copy that forgot it would launder an
          // AI's sentence into the user's own on arrival in the destination project.
          annotationBy: src.annotationBy,
          refThreadId: src.refThreadId,
          refBlockId: src.refBlockId,
          source: src.source,
          pinned: src.pinned,
          // A copy is a new block in a new project, so it draws a fresh number there —
          // insertBlocks assigns it and the source's own #n is left alone.
          seq: null,
          createdAt: base + i,
          // v13: the retirement travels with the copy. A block the user retired here is
          // retired there too — arriving as a live conclusion in the destination project is
          // exactly the resurrection DESIGN_CONTEXT_HYGIENE §3.1 exists to prevent. The
          // citation relation copies verbatim alongside refBlockId, which it annotates.
          staleAt: src.staleAt,
          refKind: src.refKind,
          // v20: a copy is the same finding in another drawer, so where it came from and
          // when it was read are still true of it — and a copy that dropped them would read
          // as something the user wrote by hand.
          sourceUrl: src.sourceUrl,
          retrievedAt: src.retrievedAt,
          recheckAfter: src.recheckAfter,
          // v21: travels with refKind/refBlockId for the same reason they do — it is one
          // more field OF that relation, and a copy that dropped it would point at the
          // right block with the aim knocked off.
          correctedQuote: src.correctedQuote,
          // v26（§2.S8）：一句话说明跟着复制走 —— 它描述的是这段字，而这段字被原样搬过来了。
          gist: src.gist,
          // v28（§2.Q1）：引用的理由跟着 `refKind` / `refBlockId` 走，和 `correctedQuote`
          // 同一条理由 —— 它是那条关系的一个字段，复制时丢了就成了「指得对，说不出为什么」。
          refNote: src.refNote,
          // v28：摘要跟着来了，「谁写的」就必须跟着来。丢了 = null = 按 'ai' 待，
          // 于是用户在源项目里亲手写的那句摘要，一到目标项目就能被 `set_block_gist` 盖掉。
          gistBy: src.gistBy,
          // ⚠️ v29（F2 §3.2 ④）：**「已经审过」不跟着复制走** —— 和 `originalContent`
          // 同一类，⛔ 不是 `refNote` / `correctedQuote` 那一类。那两个是**关系的内容**，
          // 而这一个是**用户在某一行上做过的动作**。抄过来等于替他在一个他还没看过的项目里
          // 按下了「我知道了」，正是 §3.2 ④ 要挡的「错误继承」。
          // 代价是他在目标项目里多点一次「我知道了」；反过来那一条边**永远不出现**。
          refReviewedStaleAt: null,
          // v32（P7-3）：**「被第 n 块取代」不跟着复制走** —— 退役跟着走（上面 `staleAt`），
          // 但取代它的那一块留在源项目里，没被复制过来；照抄的话目标项目里的这块就指着
          // 别的项目里的一块说「被它取代」，而那一块那头写着「取代了」一块它从没见过的复制品。
          replacedByBlockId: null,
          // ⚠️ v24：**原文备份不跟着复制走。** 复制出来的是一块新块，它自己从来没被压过；
          // 把源块的压缩前原文抄过来，会让「回 Spool 拿原始信息」指向一块并不是它的原文。
          originalContent: null,
          compressedAt: null,
        });
      });

      // INSERT-only. A failure leaves at worst orphan copy blocks (cleaned up by the forward
      // undo) — never a touched original.
      try {
        await db.insertBlocks(copyBlocks);
        // P7-6: a copy carries its images (Ocean 10-07: 图跟着复制) — copied inside SQL. The
        // copies have new ids, so the copy's picture lines are pointed at them (图文混排).
        for (let i = 0; i < sources.length; i++) {
          const copy = copyBlocks[i]!;
          const ids = await copyImages(sources[i]!.id, copy.id);
          if (ids.size === 0) continue;
          const content = remapImageIds(copy.content, ids);
          if (content === copy.content) continue;
          copy.content = content;
          await db.updateBlockContent(copy.id, content);
        }
      } catch (e) {
        console.error('[forward] copy failed', e);
        toast.error(t('复制失败：{msg}', { msg: e instanceof Error ? e.message : String(e) }));
        return [];
      }

      useUndoStore.getState().pushUndo(
        buildForwardUndo({ threadId: targetThreadId, blocks: copyBlocks }),
      );

      // Clear the selection and refresh the TARGET feed so the copies show if it's open. The
      // source feed is unchanged (additive), so it needs no reload.
      set((s) => (s.selectedBlockIds.size === 0 ? s : { selectedBlockIds: new Set() }));
      await get().load(targetThreadId);
      return sources.map((src, i) => ({ originalId: src.id, copyId: copyBlocks[i]!.id }));
    },

    moveForwarded: async ({ fromThreadId, toThreadId, pairs, deleteIds }) => {
      const moved: MovePayload['moved'] = [];
      // One pair at a time, copy out before original in: the copy frees the number the original
      // takes, and a failure part-way leaves each block either still copied or already moved.
      for (const { originalId, copyId } of pairs) {
        const [original, copy] = await Promise.all([db.getBlockById(originalId), db.getBlockById(copyId)]);
        if (!original) continue;
        const toSeq = copy?.seq ?? original.seq;
        const toCreatedAt = copy?.createdAt ?? Date.now();
        if (copy) await db.deleteBlock(copy.id);
        await db.moveBlock(original.id, toThreadId, toSeq, toCreatedAt);
        moved.push({ block: original, toSeq, toCreatedAt });
        // The forward entry would now delete a copy that is gone — retire it, so ONE ⌘Z undoes
        // the whole move instead of a second press that does nothing.
        useUndoStore.getState().invalidateForBlock(copyId);
      }
      // v30 (P5-3): a removed duplicate is not the user's own delete, so its files go back on
      // the project (deleteBlock) — and undo needs to know where they hung.
      const deletedFiles = await adb.listAttachmentsAnchoredTo(deleteIds);
      const deleted: Block[] = [];
      for (const id of deleteIds) {
        const b = await db.getBlockById(id);
        if (!b) continue;
        await db.deleteBlock(id);
        deleted.push(b);
      }
      if (moved.length + deleted.length > 0) {
        useUndoStore
          .getState()
          .pushUndo(buildMoveUndo({ fromThreadId, toThreadId, moved, deleted, deletedFiles }));
      }
      await get().load(fromThreadId);
      await get().load(toThreadId);
      return { moved: moved.length, deleted: deleted.length };
    },
  };
});
