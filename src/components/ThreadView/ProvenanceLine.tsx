import { useState } from 'react';
import { plainText } from '@/lib/blocks/contentRuns';
import { incomingReason, incomingVerbKey } from '@/lib/blocks/provenance';
import type { Block, IncomingRef } from '@/lib/db/blocks';
import { useT } from '@/lib/i18n';
import { formatBlockTime } from '@/lib/utils/time';
import { useSearchStore } from '@/stores/searchStore';
import { useThreadsStore } from '@/stores/threadsStore';
import SeqBadge from './SeqBadge';

interface Props {
  /** 被引的那一块，也就是这一屏正在看的这一块。 */
  block: Block;
  /** 指进来的边，由 `blocksStore.incomingByBlock` 一次查回来的那一份。 */
  incoming: IncomingRef[];
}

/** F2 §3.2 ① 的后半句 —— 「**谁引用了我**」。
 *
 *  ⛔⛔ **这一半在这之前完全看不见。** 出向引用早就有一行（`CitationLine`，2026-07-12），
 *  入向一直是零：一块被别的项目引着、被更正着、甚至被整条取代了，站在它自己这一屏上
 *  一个字都读不出来。而真库 58 条边里 **30 条跨项目**，也就是说超过一半的关系，
 *  在被引的那一头是隐形的。
 *
 *  ⚠️ 和 `CorrectedByLine` 有一处重叠（同项目的 `corrects`）：那一行是 2026-08-10 定的，
 *  挂在**被更正的那一句**下面，说的是「这一处怎么了」；这一行说的是「这一整块和别的块
 *  是什么关系」。⛔ 别为了去重把那一行拆掉 —— 它的位置就是它的意思。
 *
 *  默认收起，只留一行计数：真库 543 块里只有 58 条边有对家，把 485 块每块都摊开一段
 *  空关系列表，是拿噪音换一个「完整」。 */
export default function ProvenanceLine({ block, incoming }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const select = useThreadsStore((s) => s.select);
  const highlight = useSearchStore((s) => s.highlight);

  if (incoming.length === 0) return null;

  return (
    <div className="mt-1.5 font-ui text-[11px]">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className="flex items-baseline gap-1.5 text-muted transition-colors hover:text-accent"
      >
        <span aria-hidden="true">↪</span>
        <span>{t('{n} 处引用了这一块', { n: incoming.length })}</span>
        <span aria-hidden="true" className="opacity-60">
          {open ? '⌄' : '›'}
        </span>
      </button>

      {open && (
        <ul className="mt-1 space-y-1 border-l border-line pl-2.5">
          {incoming.map((e) => {
            const reason = incomingReason(e);
            const elsewhere = e.threadId === block.threadId ? null : e.threadTitle.trim();
            return (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className="shrink-0 text-muted">{t(incomingVerbKey(e.refKind))}</span>
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    // 引用方可能在别的项目 —— 先切项目再定位，和 `CitationLine` 同一条路。
                    select(e.threadId);
                    highlight(e.id);
                  }}
                  title={t('点一下跳到那一块')}
                  className="flex min-w-0 items-baseline gap-1.5 text-left text-muted transition-colors hover:text-accent"
                >
                  {e.seq != null && <SeqBadge seq={e.seq} />}
                  <time className="shrink-0 font-mono tabular-nums opacity-70">
                    {formatBlockTime(e.createdAt)}
                  </time>
                  {/* ⛔ §3.2 ①：「对方是有效 / 已不作数 / 已删除」—— **入向边也要标，
                      不只出向**。一条从一块已经作废的块指进来的引用，和一条活的引用
                      在这之前长得一模一样。⭐ 用词跟着退役块自己头上那一行走。 */}
                  {e.staleAt != null && (
                    <span className="shrink-0 rounded border border-line px-1 opacity-80">
                      {t('已不作数')}
                    </span>
                  )}
                </button>
                {/* ⚠️ 主语不一样，⛔ 不能画成一个样子：`∵` 那一句是引用方说「我为什么指过来」，
                    没有记号的那一句是引用方那一块说「我是什么」（同 `CitationLine`）。 */}
                {reason ? (
                  <span
                    className="min-w-0 truncate text-ink-2"
                    title={reason.isWhy ? t('AI 写的：为什么引这一块') : undefined}
                  >
                    {reason.isWhy && (
                      <span aria-hidden="true" className="mr-1 opacity-50">
                        ∵
                      </span>
                    )}
                    {plainText(reason.text)}
                  </span>
                ) : (
                  // ⛔ 施工单原话：「没有就明确写『未记录为什么引用』」。留白读不出
                  // 「是没人写」还是「界面没显示」，而真库 58 条边 `ref_note` **一条都没有**。
                  <span className="shrink-0 italic text-muted opacity-70">
                    {t('未记录为什么引用')}
                  </span>
                )}
                {elsewhere !== null && (
                  <span className="max-w-[45%] shrink-0 truncate text-muted">
                    {elsewhere ? t('在〈{title}〉', { title: elsewhere }) : t('在别的项目里')}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

    </div>
  );
}
