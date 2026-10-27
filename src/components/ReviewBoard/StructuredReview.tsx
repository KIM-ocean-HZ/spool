import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  actionState,
  applyWeeklyAction,
  dayOf,
  loadActionContext,
  type ActionContext,
} from '@/lib/ai/weeklyActions';
import type { WeeklyAction, WeeklyDropped, WeeklyReview } from '@/lib/ai/weeklyStructured';
import { useT } from '@/lib/i18n';
import { IS_MAC } from '@/lib/platform';
import type { Thread } from '@/lib/db/threads';
import { useProposalsStore } from '@/stores/proposalsStore';
import { useThreadsStore } from '@/stores/threadsStore';
import { toast } from '@/stores/toastStore';

/** P10 (Ocean 2026-10-26) — a weekly review that came back as data: one card per project, in the
 *  P9S-5 layout (labels in a column of their own so the rows line up down the page).
 *
 *  ⛔ Nothing is shortened and nothing gets an ellipsis: every field is on screen whole, however
 *  long the model made it (任务书 §1). Quotes are plain text, never Markdown — they are the user's
 *  words exactly as the gate matched them, and rendering would change how they read. */
export default function StructuredReview({ review, client }: { review: WeeklyReview; client: string }) {
  const t = useT();
  const byWs = useThreadsStore((s) => s.threadsByWorkspace);
  const select = useThreadsStore((s) => s.select);
  // P10-3: what each button shows is read off the library — re-read when a project changes (a
  // click, an undo, a hand edit elsewhere) or 待审 moves (the user decided a pair there).
  const pendingSupersede = useProposalsStore((s) => s.supersedeProposals);
  const [ctx, setCtx] = useState<ActionContext | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    void loadActionContext(review, Date.now())
      .then((c) => live && setCtx(c))
      .catch((e) => console.warn('[review] reading what the buttons stand on failed', e));
    return () => {
      live = false;
    };
  }, [review, byWs, pendingSupersede, version]);
  // Clicked on this page in this session — those get the 「⌘Z 可以撤销」 line.
  const [clicked, setClicked] = useState<ReadonlySet<string>>(new Set());
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
              {p.did && <Row label={t('做了什么')}>{p.did}</Row>}
              {p.stuck && <Row label={t('卡在哪')}>{p.stuck}</Row>}
              {p.signals.length > 0 && (
                <Row label={t('看到的信号')}>
                  <ul className="space-y-1">
                    {p.signals.map((s, j) => (
                      <li key={j}>
                        <Quote text={s.quote} />
                        {s.why && <span className="text-ink-2"> —— {s.why}</span>}
                        {s.retyped && <Retyped />}
                      </li>
                    ))}
                  </ul>
                </Row>
              )}
              {/* 任务书 §3 P10-3: a finished or private project gets no buttons. */}
              {p.actions.length > 0 && !thread?.isPrivate && (
                <Row label={t('建议动作')}>
                  {thread?.status === 'done' ? (
                    <span className="text-[12px] text-muted">
                      {t('这个项目已标完成，不再出建议动作。')}
                      {p.actions.some((a, j) => a.kind === 'mark_done' && clicked.has(`${i}:${j}`)) && <UndoHint />}
                    </span>
                  ) : (
                    <ul className="space-y-2">
                      {/* Gone since the review: what it suggested stays readable, with no button. */}
                      {!thread && <li className="text-[12px] text-muted">{t('这个项目已经不在了。')}</li>}
                      {p.actions.map((a, j) => (
                        <li key={j}>
                          <ActionItem
                            action={a}
                            thread={thread}
                            ctx={ctx}
                            client={client}
                            mine={clicked.has(`${i}:${j}`)}
                            onDone={() => {
                              setClicked((prev) => new Set(prev).add(`${i}:${j}`));
                              setVersion((v) => v + 1);
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
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
      <DroppedNote dropped={review.dropped} />
    </div>
  );
}

/** P10-2 (任务书 §3: 「丢了几条在页面底下说一句」). ⚠️ With what each one said — 2026-08-23 Ocean on a
 *  bare count: 「不允许这样的情况发生」. And said plainly as the AI's slip, not the user's project
 *  (the same sentence the stale check's note uses). ⚠️ The reason comes from Rust; nothing is
 *  re-judged here. */
function DroppedNote({ dropped }: { dropped: WeeklyDropped[] }) {
  const t = useT();
  if (dropped.length === 0) return null;
  const why: Record<string, string> = {
    quote: t('它引的原话在发过去的材料里找不到。'),
    no_project: t('它写的项目名对不上 Spool 里的项目（或者对上了不止一个）。'),
    finished: t('这个项目已经标完成了，周回顾不碰它。'),
    no_block: t('两句原话在那个项目里找不到对应的块。'),
    same_block: t('两句原话落在同一块里。'),
    unknown_kind: t('这不是 Spool 有的那几种动作。'),
    bad_date: t('日期写得不对。'),
  };
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
  return (
    <div className="rounded-md border border-line bg-paper-2/40 px-3 py-2 text-[11px]">
      <div className="flex items-start gap-1.5 text-ink-2">
        <AlertTriangle size={12} className="mt-0.5 flex-none" />
        <div>
          {t('AI 还说了 {n} 条，没放上来。这是 AI 没说对，不是你的项目有问题。下面是它的原话：', { n: dropped.length })}
        </div>
      </div>
      <ul className="mt-1.5 space-y-1.5 pl-5 text-muted">
        {dropped.map((d, i) => {
          const it = d.item;
          const said = [it.quote, it.old_quote ?? it.oldQuote, it.new_quote ?? it.newQuote, it.text, it.did]
            .map(str)
            .filter((s): s is string => s !== null);
          return (
            <li key={i} className="whitespace-pre-wrap">
              <div>
                {d.project && <span className="text-ink-2">〈{d.project}〉</span>}
                {why[d.reason] ?? t('少了要填的内容。')}
              </div>
              {said.map((s, j) => (
                <div key={j}>「{s}」</div>
              ))}
              {str(it.why) && <div className="text-muted/70">{t('它给的理由：{s}', { s: str(it.why)! })}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Retyped() {
  const t = useT();
  return <span className="text-[11px] text-muted/70"> {t('（引文的标点被重打过）')}</span>;
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

/** One suggested action: the button (or, once the library has it, what became of it), then why
 *  and the sentence it rests on. Same quiet look as the stale check's choices — the AI suggested it,
 *  the user decides, so it is not dressed up as the thing to press. */
function ActionItem({
  action: a,
  thread,
  ctx,
  client,
  mine,
  onDone,
}: {
  action: WeeklyAction;
  thread: Thread | undefined;
  ctx: ActionContext | null;
  client: string;
  mine: boolean;
  onDone: () => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const state = ctx && thread ? actionState(a, thread, ctx) : null;
  const what =
    a.kind === 'mark_done'
      ? t('标完成')
      : a.kind === 'set_deadline'
        ? thread && thread.deadline !== null && dayOf(thread.deadline) !== a.date
          ? t('截止日期从 {a} 改成 {b}', { a: dayOf(thread.deadline), b: a.date ?? '' })
          : t('截止日期设成 {date}', { date: a.date ?? '' })
        : a.kind === 'add_follow_up'
          ? t('加一条跟进：{text}', { text: a.text ?? '' })
          : a.kind === 'propose_supersede'
            ? t('提一次整条取代（进待审）')
            : t('提一次更正（进待审）');
  // Clicked here just now reads as done; found that way in the library reads as already so.
  const after: Record<string, string> = {
    applied:
      a.kind === 'set_deadline'
        ? mine
          ? t('已改好。')
          : t('截止日期已经是这一天。')
        : a.kind === 'add_follow_up'
          ? mine
            ? t('已加进跟进。')
            : t('跟进里已经有这一条。')
          : t('已标完成。'),
    queued: t('在待审里等你。'),
    settled: t('这两块已经处理过了。'),
    gone: t('那两块已经不在了。'),
  };
  const click = async (): Promise<void> => {
    if (!thread) return;
    setBusy(true);
    try {
      await applyWeeklyAction(a, thread.id, client);
      onDone();
    } catch (e) {
      toast.error(t('这一步没做成'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {state === 'ready' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void click()}
            className="rounded border border-line bg-paper px-2 py-0.5 text-left text-[12px] text-ink-2 transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-50"
          >
            {what}
          </button>
        ) : (
          <span className="text-ink-2">{what}</span>
        )}
        {state !== null && state !== 'ready' && (
          <span className="text-[11px] text-muted">
            {after[state]}
            {mine && state === 'applied' && <UndoHint />}
          </span>
        )}
      </div>
      {a.why && <div className="text-[12px] text-ink-2">{a.why}</div>}
      {a.retyped && <Retyped />}
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

function UndoHint() {
  const t = useT();
  return <span> {t('{key} 可以撤销。', { key: IS_MAC ? '⌘Z' : 'Ctrl+Z' })}</span>;
}
