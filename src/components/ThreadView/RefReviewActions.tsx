import { useState } from 'react';
import type { Block } from '@/lib/db/blocks';
import { useT } from '@/lib/i18n';
import { useBlocksStore } from '@/stores/blocksStore';
import { toast } from '@/stores/toastStore';
import BlockPicker from './BlockPicker';

interface Props {
  /** 声明这条引用的那一块 —— 三个动作全都作用在它身上。 */
  citing: Block;
  /** 被引的那一块，⚠️ 已经退役。 */
  cited: Block;
}

/** F2 §3.2 ③ —— 一条待审边的三个动作，就长在那条引用行下面。
 *
 *  ⭐ **为什么在这儿而不是只在待审面上**：Ocean 否掉纯「异常队列」那一案的理由是
 *  「用户审待审边时**没有上下文**可判断」。这一块的正文就在上面，被引的那一块点一下就到 ——
 *  这就是上下文。待审面（右栏）只负责**把人带到这儿**。
 *
 *  ⛔ 三个动作里没有一个会删块（§3.2 ③：「移除引用 —— ⛔ 不删除任何块」），
 *  也没有一个会让被引块重新有效（§3.3 小决定一：确认的是「我知道了」）。 */
export default function RefReviewActions({ citing, cited }: Props) {
  const t = useT();
  const keepAsHistoricalRef = useBlocksStore((s) => s.keepAsHistoricalRef);
  const repointRef = useBlocksStore((s) => s.repointRef);
  const clearSupersession = useBlocksStore((s) => s.clearSupersession);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  /** ⛔⛔ §3.3 五：`corrects` 改引之后，原来那句逐字**未必存在于新目标里**。
   *  验不过就停在这里问 —— ⛔ 不静默降级，⛔ 更不放宽那把尺子（顺手 `.trim()`
   *  就把闸放宽了，而且放宽之后测试照样绿）。
   *  ⚠️ 停下来问用的是**这一格**，⛔ 不是 `window.confirm` ——
   *  这个仓库里一个原生对话框都没有，突然弹一个出来读起来像浏览器出了错。 */
  const [quoteMissing, setQuoteMissing] = useState<Block | null>(null);

  const pick = async (target: Block): Promise<void> => {
    setBusy(true);
    try {
      const r = await repointRef(citing.id, target);
      if (r === 'quote-missing') {
        setQuoteMissing(target);
        return;
      }
      toast.notice(t('已改引'));
      setPicking(false);
    } finally {
      setBusy(false);
    }
  };

  if (quoteMissing) {
    return (
      <div className="mt-1.5 rounded-md border border-line bg-paper-2/60 p-2 font-ui text-[11px]">
        <p className="text-ink-2">{t('这条更正瞄准的那一句，在新的那一块里找不到。')}</p>
        <p className="mt-0.5 text-muted">{t('对得上才算 —— 一个字、一个空格都不能差。')}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await repointRef(citing.id, quoteMissing, { degradeToCite: true });
                toast.notice(t('已改引，并降成普通引用'));
                setQuoteMissing(null);
                setPicking(false);
              } finally {
                setBusy(false);
              }
            }}
            className="text-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-accent disabled:opacity-50"
          >
            {t('照样改，降成普通引用')}
          </button>
          <span className="text-muted opacity-70">{t('（那一句不再跟着走）')}</span>
          <button
            type="button"
            onClick={() => setQuoteMissing(null)}
            className="text-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-accent"
          >
            {t('算了，另挑一块')}
          </button>
        </div>
      </div>
    );
  }

  if (picking) {
    return (
      <BlockPicker
        currentTarget={cited}
        citingId={citing.id}
        onPick={(b) => void pick(b)}
        onCancel={() => setPicking(false)}
      />
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-[11px]">
      <span className="text-muted">{t('引的这一块已经不作数了 —— ')}</span>
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          // ⚠️ 存的是**被引块此刻的 `staleAt`**，⛔ 不是 `Date.now()`：
          // 目标恢复有效、以后又重新退役时，那是新的一次退役，这条边要**再问一遍**。
          void keepAsHistoricalRef(citing.id, cited.staleAt!);
        }}
        className="text-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-accent disabled:opacity-50"
      >
        {t('保留为历史引用')}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          setPicking(true);
        }}
        className="text-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-accent disabled:opacity-50"
      >
        {t('改引当前块')}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          // ⚠️ 只清关系，⛔ 一个块都不删 —— `clearSupersession` 走的是
          // `setBlockSupersession(id, null, null)`，而它**故意不取消目标的退役状态**。
          void clearSupersession(citing.id);
        }}
        className="text-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-accent disabled:opacity-50"
      >
        {t('移除引用')}
      </button>
    </div>
  );
}
