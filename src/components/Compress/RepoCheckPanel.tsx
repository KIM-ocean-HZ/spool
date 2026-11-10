import { Loader2, ScanSearch } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { repoKeys, type RepoAction } from '@/lib/stale/repoCheck';
import RoadPicker from '@/components/AiSetup/RoadPicker';
import { useCompressStore } from '@/stores/compressStore';
import { useFolderStore } from '@/stores/folderStore';
import { Choice } from './StaleParts';
import { repoSourceName } from './WsRepoSection';

// P16-4 → P16-7（Ocean 11-10 #9「过期检测好像可以直接设计成有仓库就和仓库一起核对，没有仓库的就项目内部核对」；第 286 条）：
// 不再是过期检测页签顶上单独一块。项目连着文件夹时，「只查这个项目」就是这一页 —— 同一个请求既拿仓库比、也拿项目里
// 后来的块比（提示词在 mcp.rs `repo_check_system`）；没连照旧是 ProjectStale。整个工作区那一边见 WorkspaceStale。
// 页面骨架和这个页签其它两页一样：顶上一句说明 · 中间结果 · 右下角一个动作按钮。⛔ 按钮上不许出现「作废」两个字
// （08-23 / S1：「更正一处 / 整条取代 / 不动」）。每一条都是「点了才生效」，做的事在 lib/stale/repoCheck.ts。
// ⚠️ 闸挡掉的那几条整条摆出来（工程护栏「闸挡住的那几条必须整条带回来」）。

export default function RepoCheckPanel({ threadId }: { threadId: string }) {
  const t = useT();
  const folder = useFolderStore((s) => s.views[threadId] ?? null);
  const session = useCompressStore((s) => s.repoCheck[threadId] ?? null);
  const error = useCompressStore((s) => s.repoCheckErrors[threadId] ?? null);
  const running = useCompressStore((s) => s.running && s.runningKind === 'repo' && s.runningThreadId === threadId);
  const busy = useCompressStore((s) => s.running || s.batchRunning);
  const run = useCompressStore((s) => s.runRepoCheck);
  const cancel = useCompressStore((s) => s.cancel);
  const decide = useCompressStore((s) => s.decideRepoCheck);
  const reason: Record<string, string> = {
    no_block: t('指的那一块不在'),
    quote_stale: t('旧块里找不到它引的那句'),
    no_source: t('仓库里没有它说的那一份'),
    quote_new: t('仓库那一份里找不到它引的那句'),
    no_item: t('跟进清单里没有这一行'),
    user_summary: t('摘要是你自己写的，不换'),
    empty: t('没说为什么'),
  };
  // 新的一方是项目里另一块（`#15`）时照写块号，是仓库里的一份时写「仓库（那一份）」。
  const newSide = (from: string) => (/^#\s*\d+$/.test(from.trim()) ? from.trim() : t('仓库（{from}）', { from: repoSourceName(t, from) }));

  const scan = session?.scan ?? null;
  const decided = session?.decided ?? {};
  const pending = scan ? repoKeys(scan).filter((k) => !(k in decided)).length : 0;
  const done = (key: string, label: Record<string, string>) =>
    decided[key] ? <span className="text-[12px] text-muted">{label[decided[key]] ?? ''}</span> : null;
  const act = (key: string, action: RepoAction) => () => void decide(threadId, key, action);
  const item = 'rounded-md border border-line bg-paper px-3 py-2 text-[11px]';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex-none border-b border-line px-5 py-2 text-[11px] text-muted">
        {t('查这个项目，连着的文件夹（{folder}）一起带上：哪些旧块被后来的块或仓库推翻了，哪些跟进的前提没了，摘要还对不对得上。你不点按钮，库里一个字都不动。', {
          folder: folder?.name ?? '',
        })}
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-3 text-[13px]">
        {running && <p className="text-[12px] text-muted">{t('正在查…')}</p>}
        {error && <p className="text-[12px]" style={{ color: 'var(--status-parked)' }}>{error}</p>}
        {scan && !scan.outcome.ok && !running && (
          <p className="text-[12px]" style={{ color: 'var(--status-parked)' }}>
            {t('没跑成：{msg}', { msg: scan.outcome.message ?? scan.outcome.kind ?? '' })}
          </p>
        )}
        {!scan && !running && !error && (
          <p className="text-[12px] text-muted">{t('点右下角开始。这一步要花钱。')}</p>
        )}
        {scan?.outcome.ok && repoKeys(scan).length === 0 && (
          <p className="text-[12px] text-muted">{t('仓库和 Spool 里的对得上，记成对过了。')}</p>
        )}

        {scan?.blocks.map((b, i) => (
          <div key={`b${i}`} className={item}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-mono text-muted">#{b.staleSeq}</span>
              <span className="min-w-0 flex-1 text-ink-2">{b.why}</span>
            </div>
            <div className="mt-1.5 space-y-1 text-ink-2">
              <div>
                <span className="text-muted">{t('旧的 {b} 里：', { b: `#${b.staleSeq}` })}</span>「{b.quoteStale}」
              </div>
              <div>
                <span className="text-muted">{t('{b} 里：', { b: newSide(b.from) })}</span>「{b.quoteNew}」
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {done(`b${i}`, { merge: t('已更正一处'), retire: t('已整条取代'), keep: t('没动') }) ?? (
                <>
                  <Choice label={t('更正一处')} hint={t('两块都留着，只记一句「新的更正了旧的」。仓库里的那句会先存成这个项目里的一块。')} onClick={act(`b${i}`, 'merge')} />
                  <Choice label={t('整条取代')} hint={t('以后打包只带新的，旧的不再放进去（没被删，也搜得到）。仓库里的那句会先存成这个项目里的一块。')} onClick={act(`b${i}`, 'retire')} />
                  <Choice label={t('不动')} hint={t('这一块保持原样，库里一个字都不改，这一条从单子上划掉。')} onClick={act(`b${i}`, 'keep')} />
                </>
              )}
            </div>
          </div>
        ))}

        {scan?.followUps.map((f, i) => (
          <div key={`f${i}`} className={item}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-medium text-ink">{t('这条跟进的前提没了：{line}', { line: f.line })}</span>
              <span className="min-w-0 flex-1 text-ink-2">{f.why}</span>
            </div>
            <div className="mt-1.5 text-ink-2">
              <span className="text-muted">{t('{b} 里：', { b: newSide(f.from) })}</span>「{f.quoteNew}」
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {done(`f${i}`, { close: t('已关掉'), keep: t('留着了') }) ?? (
                <>
                  <Choice label={t('关掉')} hint={t('这一行不再跟进；关掉的还在跟进编辑里，点一下能重新打开。')} onClick={act(`f${i}`, 'close')} />
                  <Choice label={t('留着')} hint={t('照旧跟进，这一条从单子上划掉。')} onClick={act(`f${i}`, 'keep')} />
                </>
              )}
            </div>
          </div>
        ))}

        {scan?.summary && (
          <div className={item}>
            <div className="font-medium text-ink">{t('摘要可以换成：{text}', { text: scan.summary.text })}</div>
            {scan.summary.why && <div className="mt-0.5 text-ink-2">{scan.summary.why}</div>}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {done('s', { apply: t('已换上'), keep: t('没换') }) ?? (
                <>
                  <Choice label={t('换成这句')} hint={t('仍然记作 AI 写的摘要，以后 AI 还能再改；你自己写的摘要 Spool 不会提议换。')} onClick={act('s', 'apply')} />
                  <Choice label={t('不用')} hint={t('摘要保持原样。')} onClick={act('s', 'keep')} />
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

      <footer className="flex flex-none items-center justify-end gap-3 border-t border-line bg-paper-2/40 px-5 py-3 text-xs">
        <RoadPicker setting="staleRoute" disabled={busy} />
        <button
          type="button"
          disabled={busy && !running}
          onClick={() => (running ? void cancel() : void run(threadId))}
          className="flex items-center gap-1.5 rounded-md border border-line-strong bg-paper px-3 py-1.5 text-ink transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-50"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <ScanSearch size={12} />}
          <span>{running ? t('停下') : session ? t('再查一遍') : t('查一遍')}</span>
        </button>
      </footer>
    </div>
  );
}
