import { useMemo, type ReactNode } from 'react';
import type { WeeklyAction, WeeklyReview } from '@/lib/ai/weeklyStructured';
import { useT } from '@/lib/i18n';
import type { Thread } from '@/lib/db/threads';
import { useThreadsStore } from '@/stores/threadsStore';

/** P10 (Ocean 2026-10-26) — a weekly review that came back as data: one card per project, in the
 *  P9S-5 layout (labels in a column of their own so the rows line up down the page).
 *
 *  ⛔ Nothing is shortened and nothing gets an ellipsis: every field is on screen whole, however
 *  long the model made it (任务书 §1). Quotes are plain text, never Markdown — they are the user's
 *  words exactly as the gate matched them, and rendering would change how they read. */
export default function StructuredReview({ review }: { review: WeeklyReview }) {
  const t = useT();
  const byWs = useThreadsStore((s) => s.threadsByWorkspace);
  const select = useThreadsStore((s) => s.select);
  const threads = useMemo(() => {
    const byId = new Map<string, Thread>();
    const byTitle = new Map<string, Thread>();
    for (const th of Object.values(byWs).flat()) {
      byId.set(th.id, th);
      byTitle.set(th.title.trim(), th);
    }
    return { byId, byTitle };
  }, [byWs]);
  // A review read before its projects were matched (P10-2 does that) still links by title; the
  // digest names a project 「workspace / project」, and the part after the last slash is the project.
  const threadOf = (threadId: string | null, title: string): Thread | undefined =>
    (threadId ? threads.byId.get(threadId) : undefined) ??
    threads.byTitle.get(title) ??
    threads.byTitle.get(title.split(' / ').pop()!.trim());

  return (
    <div className="mt-2 space-y-2.5">
      {review.projects.map((p, i) => {
        const thread = threadOf(p.threadId, p.title);
        return (
          <section key={i} className="rounded-lg border border-line bg-paper px-4 py-3">
            <header className="flex flex-wrap items-baseline gap-x-2">
              {thread ? (
                <button
                  type="button"
                  onClick={() => select(thread.id)}
                  title={t('打开这个项目')}
                  className="text-left font-serif text-[15px] text-ink transition-colors hover:text-accent"
                >
                  {p.title}
                </button>
              ) : (
                <h4 className="font-serif text-[15px] text-ink">{p.title}</h4>
              )}
              {/* The deadline is Spool's own fact, not something the model was asked to repeat. */}
              {thread?.deadline != null && (
                <span className="text-[11px] text-muted">{t('截止 {date}', { date: dayOf(thread.deadline) })}</span>
              )}
            </header>
            <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px] leading-relaxed">
              <Row label={t('做了什么')}>{p.did}</Row>
              <Row label={t('卡在哪')}>{p.stuck}</Row>
              {p.signals.length > 0 && (
                <Row label={t('看到的信号')}>
                  <ul className="space-y-1">
                    {p.signals.map((s, j) => (
                      <li key={j}>
                        <Quote text={s.quote} />
                        {s.why && <span className="text-ink-2"> —— {s.why}</span>}
                      </li>
                    ))}
                  </ul>
                </Row>
              )}
              {p.actions.length > 0 && (
                <Row label={t('建议动作')}>
                  <ul className="space-y-1.5">
                    {p.actions.map((a, j) => (
                      <li key={j}>
                        <ActionText action={a} />
                      </li>
                    ))}
                  </ul>
                </Row>
              )}
            </dl>
          </section>
        );
      })}
      {review.next && (
        <div className="whitespace-pre-wrap border-l-2 border-accent/40 pl-3 text-[13px] leading-relaxed text-ink-2">
          {review.next}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="whitespace-nowrap pt-[3px] text-[11px] text-muted">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap text-ink-2">{children}</dd>
    </>
  );
}

function Quote({ text }: { text: string }) {
  return <span className="text-ink">「{text}」</span>;
}

/** What an action proposes, in words, with the sentence it rests on. */
function ActionText({ action: a }: { action: WeeklyAction }) {
  const t = useT();
  const what =
    a.kind === 'mark_done'
      ? t('标完成')
      : a.kind === 'set_deadline'
        ? t('截止日期设成 {date}', { date: a.date ?? '' })
        : a.kind === 'add_follow_up'
          ? t('加一条跟进：{text}', { text: a.text ?? '' })
          : a.kind === 'propose_supersede'
            ? t('提一次整条取代')
            : t('提一次更正');
  return (
    <div className="min-w-0">
      <div className="text-ink">{what}</div>
      {a.why && <div className="text-[12px] text-ink-2">{a.why}</div>}
      {a.quote !== null && (
        <div className="text-[12px] text-muted">
          {t('依据：')}
          <Quote text={a.quote} />
        </div>
      )}
      {a.oldQuote !== null && (
        <div className="text-[12px] text-muted">
          {t('旧的：')}
          <Quote text={a.oldQuote} />
        </div>
      )}
      {a.newQuote !== null && (
        <div className="text-[12px] text-muted">
          {t('新的：')}
          <Quote text={a.newQuote} />
        </div>
      )}
    </div>
  );
}

/** A deadline is stored as the last moment of the picked day (ThreadHeader); show that day. */
const dayOf = (ms: number): string => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
