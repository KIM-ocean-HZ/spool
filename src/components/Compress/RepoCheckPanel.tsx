import { useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { repoKeys, type RepoAction } from '@/lib/stale/repoCheck';
import { useCompressStore } from '@/stores/compressStore';
import { useFolderStore } from '@/stores/folderStore';

// P16-4 —— 对照仓库（Ocean 11-09 第 267、275、276 条）。过期检测页签最上面一块：一个按钮，和上一次的结果。
// 只在项目连着文件夹（或者已经有结果）时出现。每一条都是「点了才生效」，按钮做什么写在 lib/stale/repoCheck.ts。
// ⚠️ 闸挡掉的那几条整条摆出来（工程护栏「闸挡住的那几条必须整条带回来」）。

export default function RepoCheckPanel({ threadId }: { threadId: string }) {
  const t = useT();
  const linked = useFolderStore((s) => s.views[threadId] != null);
  const session = useCompressStore((s) => s.repoCheck[threadId] ?? null);
  const error = useCompressStore((s) => s.repoCheckErrors[threadId] ?? null);
  const running = useCompressStore((s) => s.running && s.runningKind === 'repo' && s.runningThreadId === threadId);
  const busy = useCompressStore((s) => s.running || s.batchRunning);
  const run = useCompressStore((s) => s.runRepoCheck);
  const cancel = useCompressStore((s) => s.cancel);
  const decide = useCompressStore((s) => s.decideRepoCheck);
  const loadFolder = useFolderStore((s) => s.load);
  // The rail's folder card reads this too; with the rail folded it may not have, so the tab asks for itself.
  useEffect(() => {
    void loadFolder(threadId);
  }, [threadId, loadFolder]);
  if (!linked && !session && !error) return null;
  const reason: Record<string, string> = {
    no_block: t('指的那一块不在'),
    quote_stale: t('旧块里找不到它引的那句'),
    no_source: t('仓库里没有它说的那一份'),
    quote_new: t('仓库那一份里找不到它引的那句'),
    no_item: t('跟进清单里没有这一行'),
    user_summary: t('摘要是你自己写的，不换'),
    empty: t('没说为什么'),
  };
  const sourceName = (from: string) => (from === 'commits' ? t('提交标题') : from === 'changes' ? t('改动的文件') : from);

  const scan = session?.scan ?? null;
  const decided = session?.decided ?? {};
  const pending = scan ? repoKeys(scan).filter((k) => !(k in decided)).length : 0;
  const button = 'rounded border px-2 py-0.5 text-[12px] transition-colors disabled:opacity-40';
  const main = `${button} border-accent/60 text-accent enabled:hover:bg-accent/15`;
  const quiet = `${button} border-line text-muted enabled:hover:bg-paper-2 enabled:hover:text-ink`;
  const done = (key: string, label: Record<string, string>) =>
    decided[key] ? <span className="text-[12px] text-muted">{label[decided[key]] ?? ''}</span> : null;
  const act = (key: string, action: RepoAction) => () => void decide(threadId, key, action);

  return (
    <div className="flex-none space-y-2 border-b border-line px-5 py-2.5 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink">{t('对照仓库')}</span>
        <span className="min-w-0 flex-1 text-[12px] text-muted">
          {t('把这个项目和它连着的文件夹现在的样子对一遍，找出被仓库推翻的块、前提没了的跟进、对不上的摘要。点了才生效。')}
        </span>
        {running ? (
          <button type="button" onClick={() => void cancel()} className={quiet}>
            {t('停下')}
          </button>
        ) : (
          <button type="button" disabled={busy || !linked} onClick={() => void run(threadId)} className={main}>
            {session ? t('再对一遍') : t('拿仓库对一遍')}
          </button>
        )}
      </div>
      {running && <p className="text-[12px] text-muted">{t('正在拿仓库对照…')}</p>}
      {error && <p className="text-[12px]" style={{ color: 'var(--status-parked)' }}>{error}</p>}
      {scan && !scan.outcome.ok && !running && (
        <p className="text-[12px]" style={{ color: 'var(--status-parked)' }}>
          {t('没跑成：{msg}', { msg: scan.outcome.message ?? scan.outcome.kind ?? '' })}
        </p>
      )}
      {scan?.outcome.ok && repoKeys(scan).length === 0 && (
        <p className="text-[12px] text-muted">{t('仓库和 Spool 里的对得上，记成对过了。')}</p>
      )}

      {scan?.blocks.map((b, i) => (
        <div key={`b${i}`} className="rounded border border-line px-2.5 py-2">
          <div className="text-ink">{t('#{n} 被仓库推翻了', { n: b.staleSeq })}</div>
          <div className="mt-0.5 text-[12px] text-ink-2">{b.why}</div>
          <div className="mt-1 text-[12px] text-muted">{t('旧的：「{q}」', { q: b.quoteStale })}</div>
          <div className="text-[12px] text-muted">
            {t('仓库（{from}）：「{q}」', { from: sourceName(b.from), q: b.quoteNew })}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {done(`b${i}`, { merge: t('已更正一处'), retire: t('已整条作废'), keep: t('没动') }) ?? (
              <>
                <button type="button" disabled={busy} onClick={act(`b${i}`, 'merge')} className={main}>
                  {t('更正一处')}
                </button>
                <button type="button" disabled={busy} onClick={act(`b${i}`, 'retire')} className={quiet}>
                  {t('整条作废')}
                </button>
                <button type="button" disabled={busy} onClick={act(`b${i}`, 'keep')} className={quiet}>
                  {t('不动')}
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {scan?.followUps.map((f, i) => (
        <div key={`f${i}`} className="rounded border border-line px-2.5 py-2">
          <div className="text-ink">{t('这条跟进的前提没了：{line}', { line: f.line })}</div>
          <div className="mt-0.5 text-[12px] text-ink-2">{f.why}</div>
          <div className="mt-1 text-[12px] text-muted">
            {t('仓库（{from}）：「{q}」', { from: sourceName(f.from), q: f.quoteNew })}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {done(`f${i}`, { close: t('已关掉'), keep: t('留着了') }) ?? (
              <>
                <button type="button" disabled={busy} onClick={act(`f${i}`, 'close')} className={main}>
                  {t('关掉')}
                </button>
                <button type="button" disabled={busy} onClick={act(`f${i}`, 'keep')} className={quiet}>
                  {t('留着')}
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {scan?.summary && (
        <div className="rounded border border-line px-2.5 py-2">
          <div className="text-ink">{t('摘要可以换成：{text}', { text: scan.summary.text })}</div>
          {scan.summary.why && <div className="mt-0.5 text-[12px] text-ink-2">{scan.summary.why}</div>}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {done('s', { apply: t('已换上'), keep: t('没换') }) ?? (
              <>
                <button type="button" disabled={busy} onClick={act('s', 'apply')} className={main}>
                  {t('换成这句')}
                </button>
                <button type="button" disabled={busy} onClick={act('s', 'keep')} className={quiet}>
                  {t('不用')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {scan && scan.dropped.length > 0 && (
        <details className="text-[12px] text-muted">
          <summary className="cursor-pointer">{t('另有 {n} 条原话对不上，没摆出来', { n: scan.dropped.length })}</summary>
          <ul className="mt-1 space-y-1">
            {scan.dropped.map((d, i) => (
              <li key={i}>
                {d.label ? `${d.label} · ` : ''}
                {d.why}
                {d.quote ? `（「${d.quote}」）` : ''} — {reason[d.reason] ?? d.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      {session?.synced && pending === 0 && repoKeys(session.scan).length > 0 && (
        <p className="text-[12px] text-muted">{t('都处理完了，记成对过了。')}</p>
      )}
    </div>
  );
}
