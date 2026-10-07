import { useEffect, useState } from 'react';
import { getBlockById, type Block } from '@/lib/db/blocks';
import { useT } from '@/lib/i18n';
import { formatBlockTime } from '@/lib/utils/time';
import { useBlocksStore } from '@/stores/blocksStore';
import { useSearchStore } from '@/stores/searchStore';
import { selectThreadById, useThreadsStore } from '@/stores/threadsStore';
import SeqBadge from './SeqBadge';

// P7-3 (Ocean 2026-10-07, HANDOFF §9.2 第 41 条): since v32 a replacement is recorded on the
// OLD block (`replaced_by_block_id`), so one newer block can replace several and keep its own
// correction. These two lines are the two ends of that relation, drawn like the citation line
// (`CitationLine`) and the 来龙去脉 line (`ProvenanceLine`) they sit next to.
// ⛔ Screen only: the newer block's 「取代了第 a、b、c 块」 is an incoming edge, and incoming
// edges never go into a pack (F2 red line, `assemble.ts`).

/** On the old block: 「已被整条取代：⑳」. Resolved lazily, like `CitationLine` — the block that
 *  replaced it may sit in another project, or be gone. */
export function ReplacedByLine({ block }: { block: Block }) {
  const t = useT();
  const select = useThreadsStore((s) => s.select);
  const highlight = useSearchStore((s) => s.highlight);
  const byId = block.replacedByBlockId;
  const [by, setBy] = useState<Block | null | 'loading'>('loading');

  useEffect(() => {
    if (!byId) return;
    let gone = false;
    void getBlockById(byId).then((b) => {
      if (!gone) setBy(b);
    });
    return () => {
      gone = true;
    };
  }, [byId]);

  const byThread = useThreadsStore(selectThreadById(by && by !== 'loading' ? by.threadId : null));

  if (!byId || by === 'loading') return null;
  if (by === null) {
    return (
      <div className="mb-1 flex items-baseline gap-1.5 font-ui text-[11px] text-muted">
        <span aria-hidden="true">↪</span>
        <span className="italic">{t('已被整条取代（取代它的那一块已删除）')}</span>
      </div>
    );
  }
  const elsewhere = by.threadId === block.threadId ? null : (byThread?.title?.trim() ?? '');
  return (
    <div className="mb-1 flex items-baseline gap-1.5 font-ui text-[11px] text-muted">
      <span aria-hidden="true">↪</span>
      <span className="shrink-0">{t('已被整条取代：')}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          select(by.threadId);
          highlight(by.id);
        }}
        title={t('点一下跳到那一块')}
        className="flex min-w-0 items-baseline gap-1.5 text-left transition-colors hover:text-accent"
      >
        {by.seq != null && <SeqBadge seq={by.seq} />}
        <time className="shrink-0 font-mono tabular-nums opacity-70">{formatBlockTime(by.createdAt)}</time>
        {elsewhere !== null && (
          <span className="max-w-[45%] shrink-0 truncate text-muted">
            {elsewhere ? t('在〈{title}〉', { title: elsewhere }) : t('在别的项目里')}
          </span>
        )}
      </button>
    </div>
  );
}

// newer block id → the blocks it replaced, over every loaded project, computed once per store
// update and shared by every block on screen. Keyed on the `byThread` object itself, so a
// block that replaced nothing gets the same EMPTY array back and does not re-render.
const indexCache = new WeakMap<Record<string, Block[]>, Map<string, Block[]>>();
const replacedIndex = (byThread: Record<string, Block[]>): Map<string, Block[]> => {
  let idx = indexCache.get(byThread);
  if (!idx) {
    idx = new Map();
    for (const list of Object.values(byThread)) {
      for (const b of list) {
        if (!b.replacedByBlockId) continue;
        const arr = idx.get(b.replacedByBlockId) ?? [];
        arr.push(b);
        idx.set(b.replacedByBlockId, arr);
      }
    }
    for (const arr of idx.values()) arr.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    indexCache.set(byThread, idx);
  }
  return idx;
};
const EMPTY: Block[] = [];

/** On the newer block: 「整条取代了 ④ ⑭」. */
export function ReplacesLine({ block }: { block: Block }) {
  const t = useT();
  const select = useThreadsStore((s) => s.select);
  const highlight = useSearchStore((s) => s.highlight);
  const replaced = useBlocksStore((s) => replacedIndex(s.byThread).get(block.id) ?? EMPTY);
  if (replaced.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5 font-ui text-[11px] text-muted">
      <span aria-hidden="true">↩</span>
      <span className="shrink-0">{t('整条取代了')}</span>
      {replaced.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            select(b.threadId);
            highlight(b.id);
          }}
          title={t('点一下跳到那一块')}
          className="flex items-baseline gap-1 text-left transition-colors hover:text-accent"
        >
          {b.seq != null ? (
            <SeqBadge seq={b.seq} />
          ) : (
            <time className="font-mono tabular-nums opacity-70">{formatBlockTime(b.createdAt)}</time>
          )}
        </button>
      ))}
    </div>
  );
}
