import { Fragment, useMemo } from 'react';
import type { SplitReview } from '@/lib/ai/reviewCards';
import { MarkdownContent } from '@/lib/blocks/MarkdownContent';
import { useT } from '@/lib/i18n';
import { useThreadsStore } from '@/stores/threadsStore';

/** P9S-5 (Ocean 2026-10-23, 第 172 条) — a weekly review, one card per project.
 *
 *  The card says three things the same way every time: the project (a link when a project of that name
 *  exists — the review is a list of places to go next), then its rows with the label in a column of its
 *  own, so 「做了什么 / 还剩什么 / 离截止」 line up down the page and can be skimmed. The closing
 *  suggestion sits under the last card, set apart. ⛔ Nothing is shortened: every word of the review is
 *  on screen, in the order it was written. */
export default function ReviewCards({ review }: { review: SplitReview }) {
  const t = useT();
  const byWs = useThreadsStore((s) => s.threadsByWorkspace);
  const select = useThreadsStore((s) => s.select);
  const byTitle = useMemo(() => {
    const m = new Map<string, string>();
    for (const th of Object.values(byWs).flat()) m.set(th.title.trim(), th.id);
    return m;
  }, [byWs]);
  // Older reviews named a project 「workspace / project」; the part after the last slash is the project.
  const threadFor = (title: string): string | undefined =>
    byTitle.get(title) ?? byTitle.get(title.split(' / ').pop()!.trim());

  return (
    <div className="mt-2 space-y-2.5">
      {review.intro && (
        <div className="text-[13px] leading-relaxed text-ink-2">
          <MarkdownContent content={review.intro} />
        </div>
      )}
      {review.cards.map((card, i) => {
        const id = threadFor(card.title);
        return (
          <section key={i} className="rounded-lg border border-line bg-paper px-4 py-3">
            <header className="flex flex-wrap items-baseline gap-x-2">
              {id ? (
                <button
                  type="button"
                  onClick={() => select(id)}
                  title={t('打开这个项目')}
                  className="text-left font-serif text-[15px] text-ink transition-colors hover:text-accent"
                >
                  {card.title}
                </button>
              ) : (
                <h4 className="font-serif text-[15px] text-ink">{card.title}</h4>
              )}
              {card.note && <span className="text-[11px] text-muted">{card.note}</span>}
            </header>
            {card.lines.length > 0 && (
              <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px] leading-relaxed">
                {card.lines.map((line, j) =>
                  line.label ? (
                    <Fragment key={j}>
                      <dt className="whitespace-nowrap pt-[3px] text-[11px] text-muted">{line.label}</dt>
                      <dd className="min-w-0 text-ink-2">
                        <MarkdownContent content={line.text} />
                      </dd>
                    </Fragment>
                  ) : (
                    <dd key={j} className="col-span-2 min-w-0 text-ink-2">
                      <MarkdownContent content={line.text} />
                    </dd>
                  ),
                )}
              </dl>
            )}
          </section>
        );
      })}
      {review.outro && (
        <div className="border-l-2 border-accent/40 pl-3 text-[13px] leading-relaxed text-ink-2">
          <MarkdownContent content={review.outro} />
        </div>
      )}
    </div>
  );
}
