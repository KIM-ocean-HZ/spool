import { useEffect, useMemo, useRef, useState } from 'react';
import { plainText } from '@/lib/blocks/contentRuns';
import { listBlocksByThread, type Block } from '@/lib/db/blocks';
import { useT } from '@/lib/i18n';
import { search } from '@/lib/search/query';
import { formatBlockTime } from '@/lib/utils/time';
import { isImeComposing } from '@/lib/utils/ime';
import SeqBadge from './SeqBadge';

interface Props {
  /** 这条引用现在指着哪一块 —— 它的项目是默认候选来源（取代链通常就在同一个项目里）。 */
  currentTarget: Block;
  /** 声明这条关系的那一块。⛔ 排除它自己：一块不能引用自己。 */
  citingId: string;
  onPick: (block: Block) => void;
  onCancel: () => void;
}

/** F2 §3.2 ③ 动作二的目标选择器。
 *
 *  ⛔⛔ **不自动猜新目标、不自动沿 supersede 链跳**（施工单原话）。默认列出来的是
 *  「原目标所在项目里**仍然有效**的块，新的在前」—— 那只是一份**候选清单**，
 *  ⚠️ 光标不预选任何一行，⛔ 回车不会替他挑第一条。取代链看起来最像答案，
 *  而「看起来最像」正是这条红线要挡的东西：改错了引用没有任何提示。
 *
 *  打字就是全库搜索（走 `lib/search/query` 那一条，⛔ 不另写一套匹配规则）。 */
export default function BlockPicker({ currentTarget, citingId, onPick, onCancel }: Props) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<{ block: Block; threadTitle: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const excluded = useMemo(
    () => new Set([citingId, currentTarget.id]),
    [citingId, currentTarget.id],
  );

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    void (async () => {
      if (!q) {
        // 默认候选：原目标所在项目里仍然有效的块，新的在前。
        // ⚠️ 退役块也排除 —— 把一条引用从一块退役的块改到**另一块退役的块**上，
        // 下一次打开它照样进待审队列。
        const list = await listBlocksByThread(currentTarget.threadId);
        if (cancelled) return;
        setRows(
          list
            .filter((b) => !excluded.has(b.id) && b.staleAt == null)
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 30)
            .map((b) => ({ block: b, threadTitle: '' })),
        );
        return;
      }
      const hits = await search(q);
      if (cancelled) return;
      const wanted = hits.filter((h) => !excluded.has(h.blockId)).slice(0, 30);
      const found = await listBlocksByThread(currentTarget.threadId);
      const local = new Map(found.map((b) => [b.id, b]));
      // 命中可能来自任何项目，本地那一份只覆盖原目标的项目 —— 其余的按 id 补齐。
      const missing = wanted.filter((h) => !local.has(h.blockId)).map((h) => h.blockId);
      const extra = missing.length
        ? await import('@/lib/db/blocks').then((m) => m.listBlocksByIds(missing))
        : [];
      if (cancelled) return;
      const byId = new Map([...local, ...extra.map((b) => [b.id, b] as const)]);
      setRows(
        wanted
          .map((h) => {
            const b = byId.get(h.blockId);
            return b ? { block: b, threadTitle: h.threadTitle } : null;
          })
          .filter((x): x is { block: Block; threadTitle: string } => x !== null),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [query, currentTarget.threadId, excluded]);

  return (
    <div
      className="mt-1.5 rounded-md border border-line bg-paper-2/60 p-2"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (isImeComposing(e.nativeEvent)) return;
          if (e.key === 'Escape') {
            e.stopPropagation();
            onCancel();
          }
        }}
        placeholder={t('搜一块，或者从下面挑一块')}
        className="w-full rounded border border-line bg-paper px-2 py-1 font-ui text-[12px] text-ink outline-none focus:border-accent"
      />
      {rows.length === 0 ? (
        <p className="mt-2 px-1 font-ui text-[11px] text-muted">{t('没有可选的块')}</p>
      ) : (
        <ul className="mt-1.5 max-h-56 overflow-y-auto">
          {rows.map(({ block, threadTitle }) => (
            <li key={block.id}>
              <button
                type="button"
                onClick={() => onPick(block)}
                className="flex w-full items-baseline gap-1.5 rounded px-1 py-1 text-left font-ui text-[11px] text-muted transition-colors hover:bg-paper hover:text-ink-2"
              >
                {block.seq != null && <SeqBadge seq={block.seq} />}
                <time className="shrink-0 font-mono tabular-nums opacity-70">
                  {formatBlockTime(block.createdAt)}
                </time>
                <span className="min-w-0 truncate text-ink-2">
                  {plainText(
                    (block.gist?.trim() || block.annotation?.trim() || block.content.trim()) ?? '',
                  )}
                </span>
                {threadTitle && threadTitle !== '' && (
                  <span className="max-w-[35%] shrink-0 truncate opacity-70">
                    {t('在〈{title}〉', { title: threadTitle })}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="mt-1.5 px-1 font-ui text-[11px] text-muted transition-colors hover:text-ink-2"
      >
        {t('取消')}
      </button>
    </div>
  );
}
