import { invoke } from '@tauri-apps/api/core';
import { Copy, Merge, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { imageLinesAsText } from '@/lib/blocks/imageLines';
import { useT } from '@/lib/i18n';
import { useBlocksStore } from '@/stores/blocksStore';
import { askBeforeDeletingBlocks } from '@/stores/deleteFilesPromptStore';
import { useThreadsStore } from '@/stores/threadsStore';
import { toast } from '@/stores/toastStore';
import ThreadPicker, { type PickedThread } from './ThreadPicker';

/** One answer from the Rust `forward_duplicate_check` (mcp::forward_duplicates). */
interface DupHit {
  blockId: string;
  same: boolean;
  matchBlockId: string;
  matchSeq: number | null;
  matchContent: string;
  similarity: number;
}

const oneLine = (s: string): string => s.replace(/\s+/g, ' ').trim();

interface Props {
  // The currently-viewed thread — the source of the selection, excluded from the forward
  // picker so a copy always lands in another thread.
  threadId: string;
}

// v2.8 §20.1: floating toolbar that appears when ≥1 block is selected. "合并" only enables at
// ≥2; "复制到…" (§20.1 forward) is available at ≥1 — it COPIES the selection into another
// thread (additive; originals untouched). "取消" drops the selection without merging
// (deliberately not "清除" — that label is reserved for destructive data-wipe actions). A
// confirm gate sits in front of the merge; v2.9 §9.13 makes both merge and forward reversible
// via Cmd+Z, so the merge confirm copy advertises it.
export default function MergeToolbar({ threadId }: Props) {
  const t = useT();
  const selectedBlockIds = useBlocksStore((s) => s.selectedBlockIds);
  const clearSelection = useBlocksStore((s) => s.clearSelection);
  const mergeBlocks = useBlocksStore((s) => s.mergeBlocks);
  const forwardToThread = useBlocksStore((s) => s.forwardToThread);
  const moveForwarded = useBlocksStore((s) => s.moveForwarded);
  const incomingByBlock = useBlocksStore((s) => s.incomingByBlock);
  const removeBlock = useBlocksStore((s) => s.remove);
  const [merging, setMerging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Inline two-step confirm (the DeleteButton pattern) instead of window.confirm —
  // the only native OS dialog the app had, visually foreign to everything else.
  const [confirmingMerge, setConfirmingMerge] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // P2 · B4（Ocean 09-30 #6）：查重之后，「相似但不完全一样」的那几块一条一条让人选。
  const [review, setReview] = useState<{
    picked: PickedThread;
    ids: string[];
    same: DupHit[];
    similar: DupHit[];
    skip: Set<string>;
  } | null>(null);
  // 复制完问一句「原项目里的这 N 块要删掉吗？（删掉就等于移动）」。
  const [asking, setAsking] = useState<{
    picked: PickedThread;
    pairs: { originalId: string; copyId: string }[];
    sameIds: string[];
    copied: number;
    skipped: number;
  } | null>(null);
  const [working, setWorking] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);

  const count = selectedBlockIds.size;

  // Selection changed under an armed confirm (a block was added/removed): the count in
  // the question is stale, so disarm rather than confirm something the user didn't read.
  useEffect(() => {
    setConfirmingMerge(false);
    setConfirmingDelete(false);
  }, [count]);

  // Close the picker on a click outside the toolbar pill (the picker renders inside it, so a
  // click on the picker or its toggle never closes it; Esc inside the picker also closes).
  // The duplicate review closes the same way — closing it copies nothing.
  useEffect(() => {
    if (!pickerOpen && !review) return;
    const onDown = (e: MouseEvent): void => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setReview(null);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [pickerOpen, review]);

  // A question about THIS project's blocks must not follow the user into another project.
  useEffect(() => {
    setReview(null);
    setAsking(null);
  }, [threadId]);

  if (count === 0 && !asking) return null;

  const canMerge = count >= 2;

  const handleMerge = async (): Promise<void> => {
    if (!canMerge || merging) return;
    setConfirmingMerge(false);
    setMerging(true);
    try {
      await mergeBlocks([...selectedBlockIds]);
    } finally {
      setMerging(false);
    }
  };

  // Batch delete = the single-block remove per id, so each block gets its own §9.13
  // delete-undo entry — ⌘Z walks them back newest-first, one at a time.
  // P5-3: if any of them has project files hung off it, one question for the whole set
  // (askBeforeDeletingBlocks) — and backing out of it deletes nothing.
  const handleDelete = async (): Promise<void> => {
    if (deleting) return;
    setConfirmingDelete(false);
    setDeleting(true);
    try {
      const ids = [...selectedBlockIds];
      const go = await askBeforeDeletingBlocks(ids);
      if (!go) return;
      for (const id of ids) await removeBlock(id, go);
      clearSelection();
      toast.notice(t('已删除 {n} 个块', { n: ids.length }));
    } finally {
      setDeleting(false);
    }
  };

  const targetLabel = (p: PickedThread): string => `${p.workspaceTitle} / ${p.threadTitle}`;

  // P2 · B4 ①：复制之前先查重。「相同」「相似」都由 Rust 那一套判（mcp::forward_duplicates，
  // 和 find_similar_blocks 同一把尺子）—— ⛔ 这里一个相似度都不算（HANDOFF §10.6）。
  const handleForward = async (picked: PickedThread): Promise<void> => {
    setPickerOpen(false);
    const ids = [...selectedBlockIds];
    let hits: DupHit[];
    try {
      hits = await invoke<DupHit[]>('forward_duplicate_check', {
        targetThreadId: picked.threadId,
        blockIds: ids,
      });
    } catch (e) {
      console.error('[forward] duplicate check failed', e);
      toast.error(t('查重没做成，这次没有复制'));
      return;
    }
    const same = hits.filter((h) => h.same);
    const similar = hits.filter((h) => !h.same);
    if (similar.length > 0) {
      setReview({ picked, ids, same, similar, skip: new Set() });
      return;
    }
    await copyAndAsk(picked, ids, same, new Set());
  };

  // 相同的默认跳过（等于「复制完再帮你删掉重复的那份」，但不用先写再删）；相似的按用户选的。
  const copyAndAsk = async (
    picked: PickedThread,
    ids: string[],
    same: DupHit[],
    skipSimilar: Set<string>,
  ): Promise<void> => {
    setReview(null);
    setWorking(true);
    try {
      const skipped = new Set([...same.map((h) => h.blockId), ...skipSimilar]);
      const toCopy = ids.filter((id) => !skipped.has(id));
      const pairs = toCopy.length > 0 ? await forwardToThread(toCopy, picked.threadId) : [];
      if (toCopy.length > 0 && pairs.length === 0) return; // the copy failed — forwardToThread said so
      clearSelection();
      if (pairs.length > 0) {
        // Empty patch = touch updated_at, so the target thread rises in the sidebar's
        // recency order (same idiom as the redirect path).
        void useThreadsStore.getState().patch(picked.threadId, {});
      }
      const sameIds = same.map((h) => h.blockId);
      if (pairs.length + sameIds.length === 0) {
        toast.notice(t('一块都没复制：{k} 块都跳过了', { k: skipped.size }));
        return;
      }
      setAsking({ picked, pairs, sameIds, copied: pairs.length, skipped: skipped.size });
    } finally {
      setWorking(false);
    }
  };

  // P2 · B4 ②③（乙，Ocean 10-02「真移动」）：复制过去的那几块，复制品换回原块（id 不变，引用不断）；
  // 目标里已经有一模一样的那几块，原项目里这一份是真删 —— 被别的块引用着的要先说清。
  const citedSameIds = (sameIds: string[]): string[] => {
    const leaving = new Set(sameIds);
    return sameIds.filter((id) => (incomingByBlock[id] ?? []).some((r) => !leaving.has(r.id)));
  };

  const handleMove = async (onlyUncited: boolean): Promise<void> => {
    if (!asking || working) return;
    const { picked, pairs, sameIds } = asking;
    const cited = new Set(onlyUncited ? citedSameIds(sameIds) : []);
    setWorking(true);
    try {
      const { moved, deleted } = await moveForwarded({
        fromThreadId: threadId,
        toThreadId: picked.threadId,
        pairs,
        deleteIds: sameIds.filter((id) => !cited.has(id)),
      });
      setAsking(null);
      const target = targetLabel(picked);
      if (moved > 0 && deleted > 0) {
        toast.notice(t('已移动 {n} 个块到「{target}」，原项目里 {d} 块重复的已删掉', { n: moved, target, d: deleted }));
      } else if (moved > 0) {
        toast.notice(t('已移动 {n} 个块到「{target}」', { n: moved, target }));
      } else if (deleted > 0) {
        toast.notice(t('原项目里 {d} 块重复的已删掉', { d: deleted }));
      }
    } catch (e) {
      console.error('[forward] move failed', e);
      toast.error(t('没移动成：{msg}', { msg: e instanceof Error ? e.message : String(e) }));
    } finally {
      setWorking(false);
    }
  };

  if (asking) {
    const m = asking.pairs.length + asking.sameIds.length;
    const cited = citedSameIds(asking.sameIds).length;
    const target = targetLabel(asking.picked);
    const btn = 'rounded-full px-2 py-0.5 transition-colors disabled:opacity-50';
    return (
      <div className="pointer-events-none sticky bottom-3 z-10 flex justify-center">
        <div className="pointer-events-auto flex max-w-[620px] flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-line-strong bg-paper px-3 py-1.5 text-[12px] font-ui text-ink shadow-md">
          <span className="text-muted">
            {asking.skipped > 0
              ? t('已复制 {n} 个块到「{target}」，{k} 块重复，已跳过', { n: asking.copied, target, k: asking.skipped })
              : t('已复制 {n} 个块到「{target}」', { n: asking.copied, target })}
          </span>
          <span>{t('原项目里的这 {m} 块要删掉吗？（删掉就等于移动）', { m })}</span>
          {cited > 0 && (
            <span className="text-muted">
              {t('其中 {r} 块被别的块引用着，删掉后那些引用会指向一块不存在的块。', { r: cited })}
            </span>
          )}
          <span className="flex items-center gap-1">
            <button
              type="button"
              disabled={working}
              onClick={() => void handleMove(false)}
              className={`${btn} hover:bg-paper-2`}
              style={{ color: 'var(--urgent)' }}
            >
              {t('删掉原块')}
            </button>
            {cited > 0 && (
              <button
                type="button"
                disabled={working}
                onClick={() => void handleMove(true)}
                className={`${btn} text-ink hover:bg-paper-2`}
              >
                {t('只删没被引用的')}
              </button>
            )}
            <button
              type="button"
              disabled={working}
              onClick={() => setAsking(null)}
              className={`${btn} text-muted hover:bg-paper-2 hover:text-ink`}
            >
              {t('两边都留')}
            </button>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none sticky bottom-3 z-10 flex justify-center">
      <div
        ref={pillRef}
        className="pointer-events-auto relative flex items-center gap-2 rounded-full border border-line-strong bg-paper px-3 py-1.5 text-[12px] font-ui text-ink shadow-md"
      >
        {pickerOpen && (
          <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2">
            <ThreadPicker
              excludeThreadId={threadId}
              onPick={(p) => void handleForward(p)}
              onCancel={() => setPickerOpen(false)}
            />
          </div>
        )}
        {review && (
          <div className="absolute bottom-full left-1/2 mb-2 w-[460px] -translate-x-1/2 rounded-lg border border-line-strong bg-paper p-3 shadow-md">
            <div className="text-ink">
              {t('这 {n} 块和「{target}」里已有的很像，一条一条选：', {
                n: review.similar.length,
                target: targetLabel(review.picked),
              })}
            </div>
            {review.same.length > 0 && (
              <div className="mt-0.5 text-[11px] text-muted">
                {t('另有 {k} 块和那里的一模一样，会直接跳过。', { k: review.same.length })}
              </div>
            )}
            <ul className="mt-2 max-h-[240px] space-y-2 overflow-y-auto">
              {review.similar.map((h) => {
                const mine = useBlocksStore.getState().byThread[threadId]?.find((b) => b.id === h.blockId);
                const skipping = review.skip.has(h.blockId);
                const choose = (skip: boolean): void =>
                  setReview((r) => {
                    if (!r) return r;
                    const next = new Set(r.skip);
                    if (skip) next.add(h.blockId);
                    else next.delete(h.blockId);
                    return { ...r, skip: next };
                  });
                const pill = (on: boolean): string =>
                  `rounded-md border px-2 py-0.5 transition-colors ${
                    on
                      ? 'border-accent text-accent'
                      : 'border-line bg-paper text-muted hover:border-line-strong hover:text-ink'
                  }`;
                return (
                  <li key={h.blockId} className="rounded-md border border-line px-2 py-1.5 text-[11px]">
                    <div className="truncate text-ink-2">{oneLine(imageLinesAsText(mine?.content ?? '', t('图片')))}</div>
                    <div className="mt-0.5 truncate text-muted">
                      {t('像那里的 #{seq}：', { seq: h.matchSeq ?? '?' })}
                      {oneLine(imageLinesAsText(h.matchContent, t('图片')))}
                    </div>
                    <div className="mt-1 flex gap-1">
                      <button type="button" onClick={() => choose(true)} className={pill(skipping)}>
                        {t('跳过')}
                      </button>
                      <button type="button" onClick={() => choose(false)} className={pill(!skipping)}>
                        {t('照样复制')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setReview(null)}
                className="rounded-full px-2 py-0.5 text-muted transition-colors hover:bg-paper-2 hover:text-ink"
              >
                {t('取消')}
              </button>
              <button
                type="button"
                disabled={working}
                onClick={() => void copyAndAsk(review.picked, review.ids, review.same, review.skip)}
                className="rounded-full px-2 py-0.5 text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
              >
                {t('复制')}
              </button>
            </div>
          </div>
        )}
        <span className="text-muted">
          {t('已选')} <span className="font-mono text-ink">{count}</span>{t('个')}
        </span>
        <span className="h-3 w-px bg-line" />
        {confirmingMerge ? (
          <span className="flex items-center gap-1.5">
            <span className="text-ink">{t('合并 {n} 个为一个？可 ⌘Z 撤销', { n: count })}</span>
            <button
              type="button"
              onClick={() => void handleMerge()}
              className="rounded-full px-2 py-0.5 text-accent transition-colors hover:bg-accent/10"
            >
              {t('确认')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingMerge(false)}
              className="rounded-full px-2 py-0.5 text-muted transition-colors hover:bg-paper-2 hover:text-ink"
            >
              {t('再想想')}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirmingDelete(false);
              setConfirmingMerge(true);
            }}
            disabled={!canMerge || merging}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors ${
              canMerge && !merging
                ? 'text-accent hover:bg-accent/10'
                : 'cursor-not-allowed text-muted'
            }`}
            title={canMerge ? t('合并所选 block') : t('至少选择两个 block 才能合并')}
          >
            <Merge size={12} />
            {merging ? t('合并中…') : t('合并')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors ${
            pickerOpen ? 'bg-accent/10 text-accent' : 'text-ink hover:bg-paper-2'
          }`}
          title={t('复制所选 block 到另一个项目')}
        >
          <Copy size={12} />
          {t('复制到…')}
        </button>
        {confirmingDelete ? (
          <span className="flex items-center gap-1.5">
            <span className="text-ink">{t('删除 {n} 个块？⌘Z 可逐个撤回', { n: count })}</span>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="rounded-full px-2 py-0.5 transition-colors hover:bg-paper-2"
              style={{ color: 'var(--urgent)' }}
            >
              {t('确认')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-full px-2 py-0.5 text-muted transition-colors hover:bg-paper-2 hover:text-ink"
            >
              {t('再想想')}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirmingMerge(false);
              setConfirmingDelete(true);
            }}
            disabled={deleting}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors ${
              deleting ? 'cursor-not-allowed text-muted' : 'text-muted hover:bg-paper-2 hover:text-ink'
            }`}
            title={t('删除所选 block')}
          >
            <Trash2 size={12} />
            {deleting ? t('删除中…') : t('删除')}
          </button>
        )}
        <button
          type="button"
          onClick={() => clearSelection()}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-muted transition-colors hover:bg-paper-2 hover:text-ink"
          title={t('取消选择')}
        >
          <X size={12} />
          {t('取消')}
        </button>
      </div>
    </div>
  );
}
