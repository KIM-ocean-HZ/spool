import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Batch } from '@/lib/blocks/feedGroups';
import type { Block } from '@/lib/db/blocks';
import { dateLocale, useT } from '@/lib/i18n';

// P16-8（第 289 条）：时间线上缩成一行的两种画法 —— 一块更正 / 跟进块的一行，和同一批几块合起来的一行。
// 点一下就是原来那张卡（BlockFeed 里换成 BlockItem），⛔ 这里不复制卡片上的任何操作。

/** 正文第一行有字的，去掉 Markdown 标题记号。 */
const firstLine = (s: string): string =>
  s
    .split('\n')
    .map((l) => l.replace(/^#+\s*/, '').trim())
    .find(Boolean) ?? '';

const ROW = 'flex w-full min-w-0 items-center gap-1.5 rounded-md px-3.5 py-1.5 text-left text-[13px] transition-colors hover:bg-paper-2/40';

/** 一块缩成一行。`target` = 它更正的那一块（不是更正就是 null）。 */
export function CompactBlockRow({
  block,
  target,
  highlight,
  onOpen,
}: {
  block: Block;
  target: Block | null;
  highlight: boolean;
  onOpen: () => void;
}) {
  const t = useT();
  const head =
    block.refKind === 'corrects' && target
      ? t('#{n} 更正了 #{m} 里的一句', { n: block.seq ?? 0, m: target.seq ?? 0 })
      : `#${block.seq ?? 0}`;
  return (
    <article data-block-id={block.id} className={highlight ? 'flash rounded-md' : undefined}>
      <button type="button" onClick={onOpen} title={block.correctedQuote ?? undefined} className={ROW}>
        <ChevronRight size={11} className="flex-none text-muted" />
        <span className="flex-none text-muted">{head}</span>
        <span className="min-w-0 flex-1 truncate text-ink-2">{firstLine(block.content)}</span>
      </button>
    </article>
  );
}

/** 同一批写进来的几块合成的一行：「4 处更正 · #10 – #13 · 14:51」。收着的时候它替组里第一块站在时间线上
 *  （带它的 `data-block-id`，↑ / ↓ 和右边刻度把它当一站）；展开了就把这个位置让给组里各块自己的一行。 */
export function BatchRow({
  batch,
  blocks,
  open,
  onToggle,
}: {
  batch: Batch;
  blocks: Block[];
  open: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const first = blocks[0]!;
  const last = blocks[blocks.length - 1]!;
  const label =
    batch === 'correction' ? t('{n} 处更正', { n: blocks.length }) : t('跟进带回 {n} 块', { n: blocks.length });
  const time = new Date(first.createdAt).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
  return (
    <article data-block-id={open ? undefined : first.id}>
      <button type="button" onClick={onToggle} aria-expanded={open} className={ROW}>
        {open ? <ChevronDown size={11} className="flex-none text-muted" /> : <ChevronRight size={11} className="flex-none text-muted" />}
        <span className="text-ink-2">{label}</span>
        <span className="text-muted">
          · #{first.seq ?? 0} – #{last.seq ?? 0} · {time}
        </span>
      </button>
    </article>
  );
}
