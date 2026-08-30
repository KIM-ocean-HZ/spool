import { useEffect, useState } from 'react';
import SeqBadge from '@/components/ThreadView/SeqBadge';
import { listPendingRefReviews, type PendingRefReview } from '@/lib/db/blocks';
import { useT } from '@/lib/i18n';
import { useBlocksStore } from '@/stores/blocksStore';
import { useSearchStore } from '@/stores/searchStore';
import RailSection from './RailSection';

/** F2 §3.2 ② —— 这个项目里**等着人看一眼**的引用。
 *
 *  判据（和 `listPendingRefReviews` 是同一句 SQL）：
 *  引用方仍有效 AND 被引块已退役 AND 关系不是 `supersedes` AND 用户尚未确认。
 *  ⛔ `supersedes → retired` 不进这里 —— 那正是**正常**状态。
 *
 *  ⭐⭐ **它只是一份索引，⛔ 不是动作面板。** 三个动作长在引用方那一块的引用行下面
 *  （`RefReviewActions`），因为 Ocean 否掉纯「异常队列」那一案的理由逐字是
 *  「用户审待审边时**没有上下文**可判断」。这一栏负责的是把人带到那一块跟前。
 *
 *  ⚠️ 一条都没有的时候整节不画 —— 一个常年写着「0」的区块是噪音，
 *  而这是**异常**队列：清空了就该消失（真库现在 5 条，全在〈申请规划〉）。 */
export default function RefReviewSection({ threadId }: { threadId: string }) {
  const t = useT();
  const [rows, setRows] = useState<PendingRefReview[]>([]);
  const highlight = useSearchStore((s) => s.highlight);
  // ⚠️ 盯着这个项目的块：三个动作改完关系后 store 会变，这一份要跟着重算 ——
  // 否则用户点完「保留为历史引用」，这一栏里那一条还在，看上去像没生效。
  const blocks = useBlocksStore((s) => s.byThread[threadId]);

  useEffect(() => {
    let cancelled = false;
    void listPendingRefReviews(threadId).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [threadId, blocks]);

  if (rows.length === 0) return null;

  return (
    <RailSection title={t('关系待审')}>
      <ul className="space-y-1.5">
        {rows.map(({ citing, cited, citedThreadTitle }) => (
          <li key={citing.id}>
            <button
              type="button"
              onClick={() => highlight(citing.id)}
              title={t('点一下跳到那一块')}
              className="flex w-full flex-wrap items-baseline gap-x-1.5 gap-y-0.5 px-1 text-left font-ui text-[12px] text-muted transition-colors hover:text-accent"
            >
              {citing.seq != null && <SeqBadge seq={citing.seq} />}
              <span className="shrink-0">
                {citing.refKind === 'corrects' ? t('更正了') : t('引用了')}
              </span>
              {cited.seq != null && <SeqBadge seq={cited.seq} />}
              <span className="shrink-0 rounded border border-line px-1 text-[11px] opacity-80">
                {t('已不作数')}
              </span>
              {/* ⛔ 跨项目要说出来：真库 58 条边里 30 条跨项目，不说的话这一行读起来
                  像两块都在眼前这个项目里。⚠️ 这是**界面**上的事 ——
                  ⛔ 入向边一个字都不许进 pack（§3.3 二）。 */}
              {cited.threadId !== citing.threadId && (
                <span className="max-w-full shrink-0 truncate text-[11px] opacity-70">
                  {citedThreadTitle
                    ? t('在〈{title}〉', { title: citedThreadTitle })
                    : t('在别的项目里')}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 px-1 font-ui text-[11px] text-muted opacity-70">
        {t('点进去，在那一块下面选：保留、改引，或者移除')}
      </p>
    </RailSection>
  );
}
