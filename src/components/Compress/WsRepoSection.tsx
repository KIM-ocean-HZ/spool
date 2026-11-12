import type { RepoDropped } from '@/lib/ai/compress';
import { useQuote, useT } from '@/lib/i18n';
import type { WsBlockRef, WsRepoItems } from '@/lib/stale/wsItems';
import type { WsAction } from '@/stores/compressStore';
import { Choice } from './StaleParts';

// P16-7（Ocean 11-10 #9 → 第 286 条）：工作区带着仓库查的那一次多出来的三样 —— 对照仓库（P16-4）那三样搬到这一页，
// 和上面「被取代的旧块」「可能已经结束的项目」排在同一张单子上。按钮和这一页的规矩一样（⛔ 不许出现「作废」两个字，
// 08-23 / S1）：「更正一处 / 整条取代 / 不动」「关掉 / 留着」「换成这句 / 不用」。点了才生效，做的事在 compressStore
// `decideStaleWs`（`r` / `f` / `s`）。

type T = ReturnType<typeof useT>;

export const repoSourceName = (t: T, from: string): string =>
  from === 'commits' ? t('提交记录') : from === 'changes' ? t('改动的文件') : from;

const DROP_REASON = (t: T): Record<string, string> => ({
  no_block: t('指的那一块不在'),
  quote_stale: t('旧块里找不到它引的那句'),
  no_source: t('仓库里没有它说的那一份'),
  quote_new: t('仓库那一份里找不到它引的那句'),
  no_item: t('跟进清单里没有这一行'),
  user_summary: t('摘要是你自己写的，不换'),
  empty: t('没说为什么'),
});

export default function WsRepoSection({
  repo,
  decided,
  name,
  label,
  onDecide,
}: {
  repo: WsRepoItems;
  decided: Record<string, WsAction>;
  name: (threadId: string) => string;
  label: (r: WsBlockRef) => string;
  onDecide: (key: string, action: WsAction) => void;
}) {
  const t = useT();
  const q = useQuote();
  const item = 'rounded-md border border-line bg-paper px-3 py-2 text-[11px]';
  return (
    <>
      {repo.blocks.length > 0 && (
        <section className="mb-4">
          <h3 className="mb-1.5 text-[11px] font-medium text-ink-2">{t('被仓库推翻的旧块（{n}）', { n: repo.blocks.length })}</h3>
          <ul className="space-y-2">
            {repo.blocks.map((p, i) => {
              const done = decided[`r${i}`];
              const oldL = label(p.stale);
              return (
                <li key={`r${i}`} className={`${item} ${done ? 'opacity-50' : ''}`}>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-mono text-muted">{oldL}</span>
                    <span className="min-w-0 flex-1 text-ink-2">{p.why}</span>
                    {p.retyped && <span className="flex-none text-muted/70">{t('（引文的标点被重打过）')}</span>}
                  </div>
                  <div className="mt-1.5 space-y-1 text-ink-2">
                    <div>
                      <span className="text-muted">{t('旧的 {b} 里：', { b: oldL })}</span>{q(p.quoteStale)}
                    </div>
                    <div>
                      <span className="text-muted">{t('仓库（{from}）：', { from: repoSourceName(t, p.from) })}</span>{q(p.quoteNew)}
                    </div>
                  </div>
                  {done ? (
                    <div className="mt-1.5 text-muted">
                      {done === 'merge'
                        ? t('已更正一处：仓库那句存成了一块，记着它更正了 {old}。', { old: oldL })
                        : done === 'retire'
                          ? t('已换：仓库那句存成了一块，以后打包只带它，{old} 不再放进去。', { old: oldL })
                          : t('这一条没动。')}
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Choice
                        label={t('更正一处')}
                        hint={t('把仓库那句存成这个项目里的一块，记一句「它更正了 {old}」。{old} 照旧留着、照旧进打包。', { old: oldL })}
                        onClick={() => onDecide(`r${i}`, 'merge')}
                      />
                      <Choice
                        label={t('整条取代')}
                        hint={t('把仓库那句存成这个项目里的一块，以后打包只带它，{old} 不再放进去（没被删，也搜得到）。', { old: oldL })}
                        onClick={() => onDecide(`r${i}`, 'retire')}
                      />
                      <Choice
                        label={t('不动')}
                        hint={t('这一块保持原样，库里一个字都不改，这一条从单子上划掉。')}
                        onClick={() => onDecide(`r${i}`, 'keep')}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {repo.followUps.length > 0 && (
        <section className="mb-4">
          <h3 className="mb-1.5 text-[11px] font-medium text-ink-2">{t('前提没了的跟进（{n}）', { n: repo.followUps.length })}</h3>
          <ul className="space-y-2">
            {repo.followUps.map((f, i) => {
              const done = decided[`f${i}`];
              const where = f.by ? label(f.by) : t('仓库（{from}）', { from: repoSourceName(t, f.from ?? '') });
              return (
                <li key={`f${i}`} className={`${item} ${done ? 'opacity-50' : ''}`}>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-medium text-ink">{t('〈{name}〉在跟进：{line}', { name: name(f.threadId), line: f.line })}</span>
                    <span className="min-w-0 flex-1 text-ink-2">{f.why}</span>
                  </div>
                  <div className="mt-1.5 text-ink-2">
                    <span className="text-muted">{t('{b} 里：', { b: where })}</span>{q(f.quoteNew)}
                  </div>
                  {done ? (
                    <div className="mt-1.5 text-muted">{done === 'close' ? t('已关掉（⌘Z 能撤回）。') : t('留着了。')}</div>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Choice label={t('关掉@followup')} hint={t('这一行不再跟进；关掉的还在跟进编辑里，点一下能重新打开。')} onClick={() => onDecide(`f${i}`, 'close')} />
                      <Choice label={t('留着')} hint={t('照旧跟进，这一条从单子上划掉。')} onClick={() => onDecide(`f${i}`, 'keep')} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {repo.summaries.length > 0 && (
        <section className="mb-4">
          <h3 className="mb-1.5 text-[11px] font-medium text-ink-2">{t('摘要可以换（{n}）', { n: repo.summaries.length })}</h3>
          <ul className="space-y-2">
            {repo.summaries.map((x, i) => {
              const done = decided[`s${i}`];
              return (
                <li key={`s${i}`} className={`${item} ${done ? 'opacity-50' : ''}`}>
                  <div className="font-medium text-ink">{t('〈{name}〉的摘要可以换成：{text}', { name: name(x.threadId), text: x.text })}</div>
                  {x.why && <div className="mt-0.5 text-ink-2">{x.why}</div>}
                  {done ? (
                    <div className="mt-1.5 text-muted">{done === 'apply' ? t('已换上。') : t('没换。')}</div>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Choice label={t('换成这句')} hint={t('仍然记作 AI 写的摘要，以后 AI 还能再改；你自己写的摘要 Spool 不会提议换。')} onClick={() => onDecide(`s${i}`, 'apply')} />
                      <Choice label={t('不用')} hint={t('摘要保持原样。')} onClick={() => onDecide(`s${i}`, 'keep')} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <RepoDroppedNote t={t} dropped={repo.dropped} />
      {repo.synced && <p className="mt-2 text-[11px] text-muted">{t('都处理完了，记成和仓库对过了。')}</p>}
    </>
  );
}

/** 闸挡掉的那几条，整条摆出来（工程护栏「闸挡住的那几条必须整条带回来」）。 */
function RepoDroppedNote({ t, dropped }: { t: T; dropped: RepoDropped[] }) {
  const q = useQuote();
  if (dropped.length === 0) return null;
  const reason = DROP_REASON(t);
  return (
    <details className="mt-2 text-[11px] text-muted">
      <summary className="cursor-pointer">{t('另有 {n} 条原话对不上，没摆出来', { n: dropped.length })}</summary>
      <ul className="mt-1 space-y-1">
        {dropped.map((d, i) => (
          <li key={i}>
            {d.label ? `${d.label} · ` : ''}
            {d.why}
            {d.quote ? t('（{q}）', { q: q(d.quote) }) : ''} — {reason[d.reason] ?? d.reason}
          </li>
        ))}
      </ul>
    </details>
  );
}
