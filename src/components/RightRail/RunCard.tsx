import { Check, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { dateLocale, useT } from '@/lib/i18n';
import { MarkdownContent } from '@/lib/blocks/MarkdownContent';
import type { EngineRun } from '@/lib/db/engineRuns';
import type { FollowUpReviewItem } from '@/lib/engine/followUpReview';
import { ACTION_LABEL, ENGINE_LABEL, type EngineKind } from '@/stores/engineStore';

// DESIGN_WORKBENCH §3.1 — one finished run, and the answer to Ocean's #6/#8.
//
// This card is where the bug in §1.1 gets fixed, and the fix is not a code change to the
// prompts — it is this component existing. The three maintenance prompts all end with "say
// the conclusion to the user first, and store it only once they agree". That instruction is
// RIGHT. What was missing was anywhere for the saying to happen and anyone to agree: a
// headless run has no user in the loop, so the model wrote its whole answer into a final
// message that Spool then dropped, and reported "跑完了，没有新增块".
//
// So the two buttons at the bottom are not a convenience. They are the "user agrees" step
// that the prompt has been asking for since it was written.

interface Props {
  run: EngineRun;
  onDismiss: (id: string) => void;
  /** Store the AI's text as a block. Absent for runs whose product was never prose
   *  (跟进 files proposals; a failed run has nothing to store). */
  onStore?: (run: EngineRun) => void;
  busy?: boolean;
  /** P16-3: a follow-up's list for the user — one decision per entry. */
  review?: FollowUpReviewItem[];
  /** close = close that follow-up line; confirm = mark that block as rechecked; keep = leave it as it is. */
  onReview?: (index: number, action: 'close' | 'confirm' | 'keep') => void;
}

/** DESIGN_WORKBENCH §5 — spend, never remaining quota. Neither CLI reports how much of the
 *  user's plan is left, so this must never be phrased as a balance. A run whose CLI said
 *  nothing shows nothing rather than "$0.00": "free" and "not reported" are different
 *  claims, and codex reports nothing at all today. */
const money = (usd: number | null): string | null =>
  usd === null ? null : usd < 0.01 ? '<$0.01' : `$${usd.toFixed(2)}`;

export default function RunCard({ run, onDismiss, onStore, busy, review = [], onReview }: Props) {
  const t = useT();
  const hasText = (run.resultText ?? '').trim().length > 0;
  // Answered cards collapse: the rail is a place to act, and a wall of resolved cards
  // would bury the one that still wants something.
  const [open, setOpen] = useState(run.reviewedAt === null && hasText);

  const when = new Date(run.finishedAt).toLocaleString(dateLocale(), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const engineName = ENGINE_LABEL[run.engine as EngineKind] ?? run.engine;
  const cost = money(run.usage.costUsd);
  const answered = run.reviewedAt !== null;

  // What actually came of it, in the words of the thing that happened. "没有新增块" was the
  // sentence that made a completed run look like an idle one — so a run with prose says it
  // has prose, and only a genuinely empty run says nothing came back.
  const outcomeLine =
    run.outcome === 'failed'
      ? t('没跑成')
      : run.outcome === 'cancelled'
        ? t('被你停下了')
        : run.blocksWritten > 0
          ? t('归档了 {n} 块', { n: run.blocksWritten })
          : run.proposalsQueued > 0
            ? t('提了 {n} 条待你过目', { n: run.proposalsQueued })
            : review.length > 0
              ? t('有 {n} 条要你定', { n: review.length })
              : hasText
              ? // ⚠️ 「有回话」 rather than 「写好了」 (2026-08-11): a run whose text is the AI
                // explaining why it did NOT do the job is still text, and this line cannot
                // tell the two apart. Saying which one it is was how a refusal got stored as
                // a weekly review.
                t('有回话，等你过目')
              : t('这次没有新东西');

  return (
    <div
      className={`rounded-md border px-2.5 py-2 transition-colors ${
        answered || run.outcome !== 'ok'
          ? 'border-line bg-paper-2/30'
          : 'border-accent/40'
      }`}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={!hasText && !run.detail}
          className="flex min-w-0 flex-1 items-start gap-1.5 text-left disabled:cursor-default"
        >
          <span className="mt-[3px] flex-none text-muted">
            {hasText || run.detail ? (
              open ? (
                <ChevronDown size={11} />
              ) : (
                <ChevronRight size={11} />
              )
            ) : (
              <span className="inline-block w-[11px]" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-ink">{t(ACTION_LABEL[run.action])}</span>
            <span className="mt-0.5 block text-[12px] text-muted">
              {outcomeLine} · {when}
            </span>
          </span>
        </button>

        {/* ⚠️ Ocean 2026-08-07: 「跟进没法删除，也不会消失」. The dismiss control used to live
            in the footer below, and that footer only rendered for `outcome === 'ok' &&
            hasText` — so a 跟进 run (which files proposals and often returns no prose at
            all) and every failed run had NO way to be got rid of. It is up here now, on
            every card, unconditionally: closing a card is never a thing you cannot do.

            "Dismiss" means gone from the rail, not gone from the database — the row is what
            makes the 7-day spend total honest (engineRuns.markReviewed). */}
        <button
          type="button"
          disabled={busy}
          onClick={() => onDismiss(run.id)}
          title={t('从这里去掉（记录和花费仍然留着）')}
          aria-label={t('从这里去掉（记录和花费仍然留着）')}
          className="-mr-1 flex-none rounded p-0.5 text-muted transition-colors enabled:hover:bg-paper-2 enabled:hover:text-ink disabled:opacity-40"
        >
          <X size={12} />
        </button>
      </div>

      {open && hasText && (
        // §12.2 — same renderer as the block feed and 周回顾. Its sizes are in em, so a
        // heading here scales from this card's 11px instead of shouting at the block feed's.
        <div className="mt-1.5 whitespace-pre-wrap border-t border-line/60 pt-1.5 text-[13px] leading-relaxed text-ink-2">
          <MarkdownContent content={run.resultText ?? ''} />
        </div>
      )}
      {open && run.detail && (
        // §2.3: the CLI's own words, never a Spool paraphrase — "额度用完了，9/4 再来" is
        // the single most useful thing a failed run can hand back.
        <div className="mt-1.5 whitespace-pre-wrap border-t border-line/60 pt-1.5 font-mono text-[12px] leading-relaxed text-muted">
          {run.detail}
        </div>
      )}

      {/* P16-3 (Ocean 11-08 #1): what the follow-up could not settle on its own — one decision each, nothing
          applied until the user clicks, ⌘Z takes a click back. Open even when the text is folded: it is the part
          of the card that wants an answer. */}
      {review.length > 0 && onReview && (
        <div className="mt-1.5 space-y-2 border-t border-line/60 pt-1.5">
          {review.map((item, i) => (
            <ReviewEntry key={`${item.kind}-${item.kind === 'line' ? item.itemId : item.blockId}`} item={item} busy={busy} onAct={(a) => onReview(i, a)} />
          ))}
        </div>
      )}

      {/* The engine line. Ocean 2026-08-06: "我在使用过程中对使用了什么模型花了多少额度
          毫不知情，但这不是免费的". Model and cost sit on every card because every card is
          a thing that was paid for. */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted">
        <span>{engineName}</span>
        {run.usage.model && <span>· {run.usage.model}</span>}
        <span>· {cost ?? t('花费未知')}</span>
      </div>

      {/* The one thing left worth a button: turning what it wrote into a block. Dismissal
          moved to the ✕ above, so this is no longer a two-button footer. */}
      {!answered && run.outcome === 'ok' && hasText && onStore && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onStore(run)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-accent/60 px-2 py-1 text-[13px] text-accent transition-colors enabled:hover:border-accent enabled:hover:bg-accent/15 disabled:opacity-40"
        >
          <Check size={11} />
          {t('存成一块')}
        </button>
      )}
    </div>
  );
}

/** One entry of a follow-up's list: what it is about, the AI's one sentence, and the buttons that fit it. */
function ReviewEntry({
  item,
  busy,
  onAct,
}: {
  item: FollowUpReviewItem;
  busy?: boolean;
  onAct: (action: 'close' | 'confirm' | 'keep') => void;
}) {
  const t = useT();
  const title =
    item.kind === 'line'
      ? item.verdict === 'suggest_close'
        ? t('建议关掉这条跟进：{line}', { line: item.line })
        : t('这条要你自己答：{line}', { line: item.line })
      : item.verdict === 'still_holds'
        ? t('#{n} 复查过了，还成立：{head}', { n: item.seq, head: item.head })
        : item.verdict === 'changed'
          ? t('#{n} 变了：{head}', { n: item.seq, head: item.head })
          : t('#{n} 这次没法复查：{head}', { n: item.seq, head: item.head });
  const basis = item.kind === 'line' ? item.evidence : item.url;
  const button =
    'rounded border px-2 py-0.5 text-[12px] transition-colors disabled:opacity-40';
  return (
    <div className="text-[13px] leading-snug">
      <div className="text-ink">{title}</div>
      {item.why && <div className="mt-0.5 text-[12px] text-ink-2">{item.why}</div>}
      {basis && <div className="mt-0.5 break-all text-[12px] text-muted">{t('依据：{basis}', { basis })}</div>}
      {item.kind === 'block' && item.verdict === 'changed' && (
        <div className="mt-0.5 text-[12px] text-muted">{t('新的说法排在待审里，你在那里决定要不要。')}</div>
      )}
      <div className="mt-1 flex flex-wrap gap-1.5">
        {item.kind === 'line' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAct('close')}
            className={`${button} border-accent/60 text-accent enabled:hover:bg-accent/15`}
          >
            {t('关掉')}
          </button>
        )}
        {item.kind === 'block' && item.verdict === 'still_holds' && item.nextRecheck && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAct('confirm')}
            className={`${button} border-accent/60 text-accent enabled:hover:bg-accent/15`}
          >
            {t('标成已核对（{date} 再查）', { date: item.nextRecheck })}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onAct('keep')}
          className={`${button} border-line text-muted enabled:hover:bg-paper-2 enabled:hover:text-ink`}
        >
          {item.kind === 'block' && item.verdict !== 'still_holds' ? t('知道了') : t('留着')}
        </button>
      </div>
    </div>
  );
}
