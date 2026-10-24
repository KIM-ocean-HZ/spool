import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2, ScanSearch } from 'lucide-react';
import { estimateCost, formatYuan, FAILURE_SENTENCE } from '@/lib/ai/compress';
import { alreadyCorrects } from '@/lib/blocks/staleGuards';
import { useT } from '@/lib/i18n';
import type { WsBlockRef, WsDroppedItem } from '@/lib/stale/wsItems';
import { tenThousands, type WsStalePlan } from '@/lib/stale/workspace';
import { useCompressStore, wsStaleLeft } from '@/stores/compressStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useThreadsStore } from '@/stores/threadsStore';
import { routeFor, useRoads } from '@/lib/engine/roads';
import RoadPicker from '@/components/AiSetup/RoadPicker';
import { Choice, Stat } from './StaleParts';

type T = (key: string, vars?: Record<string, string | number>) => string;

// P9V-2 —— 「过期检测」页签查整个工作区的那一页（Ocean 10-24 第 192、196 – 202 条）。
//
// ⭐ 骨架和「只查这个项目」那一页一样（顶上一句说明 · 中间一格结果 · 右下角一个动作按钮），
// 中间多一段「可能已经结束的项目」。
// ⛔ 仍然不许出现「作废」两个字（§2.E3）；三个按钮的名字和那一页一个字不差。
// ⛔ 跑之前不说要花多少钱（D0 红线）；超上限的时候说的是字数，不是钱。
export default function WorkspaceStale({
  workspaceId,
  plan,
}: {
  workspaceId: string;
  plan: WsStalePlan | null;
}) {
  const t = useT();
  const session = useCompressStore((s) => s.staleWs[workspaceId] ?? null);
  const running = useCompressStore(
    (s) => s.running && s.runningKind === 'stale' && s.runningKey === `w:${workspaceId}`,
  );
  const busy = useCompressStore((s) => s.running || s.batchRunning);
  const error = useCompressStore((s) => s.staleWsErrors[workspaceId] ?? null);
  const live = useCompressStore((s) => s.staleWsBlocks[workspaceId]);
  const scan = useCompressStore((s) => s.runStaleScanWorkspace);
  const cancel = useCompressStore((s) => s.cancel);
  const decide = useCompressStore((s) => s.decideStaleWs);
  const refresh = useCompressStore((s) => s.refreshStaleWsBlocks);
  const setCompleting = useThreadsStore((s) => s.setCompleting);
  const threadsByWorkspace = useThreadsStore((s) => s.threadsByWorkspace);
  const threads = useMemo(
    () => new Map(Object.values(threadsByWorkspace).flat().map((th) => [th.id, th] as const)),
    [threadsByWorkspace],
  );
  const roads = useRoads();
  const enabled = roads.cli || roads.api;
  const staleRoute = useSettingsStore((s) => s.staleRoute);
  const timeoutSecs = useSettingsStore((s) =>
    routeFor(staleRoute, roads) === 'cli' ? s.aiEngineTimeoutSecs : s.apiTimeoutSecs,
  );

  // 结果是存盘的（第 202 条）—— 读回来的那一份没有块的样子，要的时候从库里现读。
  useEffect(() => {
    if (session && !live) void refresh(workspaceId);
  }, [session, live, refresh, workspaceId]);

  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  useEffect(() => {
    if (!running) return;
    startedAt.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(id);
  }, [running]);

  const wsTitle = plan?.workspace.title ?? '';
  const name = (threadId: string): string =>
    threads.get(threadId)?.title ??
    session?.projects.find((p) => p.threadId === threadId)?.title ??
    t('（已删除的项目）');
  const label = (r: WsBlockRef): string => t('〈{name}〉#{n}', { name: name(r.threadId), n: r.seq });
  const isDone = (threadId: string): boolean => threads.get(threadId)?.status === 'done';

  const found = session ? session.blocks.length + session.projectItems.length : 0;
  const left = wsStaleLeft(session, isDone);
  const cost = session?.outcome?.ok ? estimateCost(session.outcome) : null;
  const scanned = !!session?.outcome;
  const cleanRun = scanned && found === 0 && session!.dropped.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-none items-center justify-between gap-3 border-b border-line px-5 py-2">
        <div className="min-w-0 text-[11px] text-muted">
          {t('查整个〈{ws}〉：哪些旧块已经被别的块整条取代了（可以跨项目），哪些项目看起来已经结束了。你不点按钮，库里一个字都不动。', {
            ws: wsTitle,
          })}
        </div>
      </header>

      {session?.outcome?.ok && (
        <div className="flex flex-none flex-wrap items-center gap-x-5 gap-y-1 border-b border-line px-5 py-2 text-[11px]">
          <Stat label={t('发了')} value={t('{n} 个项目', { n: session.projects.length })} />
          <Stat label={t('找到')} value={t('{n} 条', { n: found })} />
          {found > 0 && <Stat label={t('还没决定')} value={t('{n} 条', { n: left })} />}
          <Stat label={t('用时')} value={`${Math.round(session.outcome.ms / 1000)}s`} />
          <Stat
            label={t('花费')}
            value={cost ? `${cost.cacheUnknown ? '≤ ' : ''}${formatYuan(cost.yuan)}` : '—'}
          />
          {session.auto && (
            <span className="text-muted">{t('每月自动查的（{d}）', { d: monthDay(session.startedAt) })}</span>
          )}
        </div>
      )}

      {(error || (session?.outcome && !session.outcome.ok)) && (
        <div className="flex-none border-b border-line px-5 py-3 text-xs" style={{ color: 'var(--urgent)' }}>
          <div>
            {error ?? t(FAILURE_SENTENCE[session?.outcome?.kind ?? 'http'] ?? FAILURE_SENTENCE.http)}
          </div>
          {session?.outcome?.message && (
            <pre className="mt-1.5 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded bg-paper-2 px-2 py-1.5 font-mono text-[10.5px] leading-relaxed text-ink-2">
              {session.outcome.message}
            </pre>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {session && found > 0 ? (
          <>
            {session.already > 0 && (
              <div className="mb-2 text-[11px] text-muted">
                {t('另有 {n} 条你已经处理过了 —— 库里记着，这里不再问一遍。', { n: session.already })}
              </div>
            )}
            {session.blocks.length > 0 && (
              <section className="mb-4">
                <h3 className="mb-1.5 text-[11px] font-medium text-ink-2">
                  {t('被取代的旧块（{n}）', { n: session.blocks.length })}
                </h3>
                <ul className="space-y-2">
                  {session.blocks.map((p, i) => {
                    const done = session.decided[`b${i}`];
                    const same = p.stale.threadId === p.by.threadId;
                    const oldL = label(p.stale);
                    const byL = label(p.by);
                    const correctedNote =
                      live && alreadyCorrects(live[p.stale.blockId], live[p.by.blockId])
                        ? t('库里已经记着 {by} 更正了 {old}。再点「更正一处」只会把引文重写一遍；想让 {old} 不再进打包，点「整条取代」。', {
                            by: byL,
                            old: oldL,
                          })
                        : null;
                    return (
                      <li
                        key={`b${i}`}
                        className={`rounded-md border border-line bg-paper px-3 py-2 text-[11px] ${done ? 'opacity-50' : ''}`}
                      >
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="font-mono text-muted">
                            {oldL} → {same ? `#${p.by.seq}` : byL}
                          </span>
                          <span className="min-w-0 flex-1 text-ink-2">{p.why}</span>
                          {p.retyped && <span className="flex-none text-muted/70">{t('（引文的标点被重打过）')}</span>}
                        </div>
                        <div className="mt-1.5 space-y-1 text-ink-2">
                          <div>
                            <span className="text-muted">{t('旧的 {b} 里：', { b: oldL })}</span>「{p.quoteStale}」
                          </div>
                          <div>
                            <span className="text-muted">{t('新的 {b} 里：', { b: byL })}</span>「{p.quoteNew}」
                          </div>
                        </div>
                        {!done && correctedNote && <div className="mt-1.5 text-muted">{correctedNote}</div>}
                        {done ? (
                          <div className="mt-1.5 text-muted">
                            {done === 'merge'
                              ? t('已更正一处：两块都留着，{by} 上记了一句「它更正了 {old}」。', { by: byL, old: oldL })
                              : done === 'retire'
                                ? t('已换：以后打包只带 {by}，{old} 不再放进去。', { by: byL, old: oldL })
                                : t('这一条没动。')}
                          </div>
                        ) : (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Choice
                              label={t('更正一处')}
                              hint={
                                correctedNote ??
                                t('两块都留着，只在 {by} 上记一句「它更正了 {old}」。打包的时候两块还是都在，不会因此变短。', {
                                  by: byL,
                                  old: oldL,
                                })
                              }
                              onClick={() => void decide(workspaceId, `b${i}`, 'merge')}
                            />
                            <Choice
                              label={t('整条取代')}
                              hint={
                                p.grows
                                  ? t('以后打包只带 {by}，{old} 不再放进去（它没被删，还在原来的项目里，也搜得到）。⚠️ {old} 很短：拿掉它之后打包出来反而会多几个字 —— 顶上去的那句「这一块已经被整条取代」比它本身还长。', {
                                      by: byL,
                                      old: oldL,
                                    })
                                  : t('以后打包只带 {by}，{old} 不再放进去（它没被删，还在原来的项目里，也搜得到）。', {
                                      by: byL,
                                      old: oldL,
                                    })
                              }
                              onClick={() => void decide(workspaceId, `b${i}`, 'retire')}
                            />
                            <Choice
                              label={t('不动')}
                              hint={t('这两块保持原样，库里一个字都不改，这一条从单子上划掉。')}
                              onClick={() => void decide(workspaceId, `b${i}`, 'keep')}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            {session.projectItems.length > 0 && (
              <section>
                <h3 className="mb-1.5 text-[11px] font-medium text-ink-2">
                  {t('可能已经结束的项目（{n}）', { n: session.projectItems.length })}
                </h3>
                <ul className="space-y-2">
                  {session.projectItems.map((p, i) => {
                    const gone = !threads.has(p.threadId);
                    const finished = isDone(p.threadId);
                    const kept = session.decided[`p${i}`] === 'keep';
                    return (
                      <li
                        key={`p${i}`}
                        className={`rounded-md border border-line bg-paper px-3 py-2 text-[11px] ${finished || kept || gone ? 'opacity-50' : ''}`}
                      >
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="font-medium text-ink">
                            {t('〈{name}〉看起来已经结束了', { name: name(p.threadId) })}
                          </span>
                          <span className="min-w-0 flex-1 text-ink-2">{p.why}</span>
                          {p.retyped && <span className="flex-none text-muted/70">{t('（引文的标点被重打过）')}</span>}
                        </div>
                        <div className="mt-1.5 space-y-1 text-ink-2">
                          <div>
                            <span className="text-muted">{t('它自己的原话：')}</span>「{p.quoteOld}」
                          </div>
                          <div>
                            <span className="text-muted">{t('{b} 里：', { b: label(p.by) })}</span>「{p.quoteNew}」
                          </div>
                        </div>
                        {gone ? (
                          <div className="mt-1.5 text-muted">{t('这个项目已经不在了。')}</div>
                        ) : finished ? (
                          <div className="mt-1.5 text-muted">{t('已标完成。')}</div>
                        ) : kept ? (
                          <div className="mt-1.5 text-muted">{t('这一条没动。')}</div>
                        ) : (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Choice
                              label={t('标完成')}
                              hint={t('打开和项目顶上「完成」同一个面板，可以顺手写一句结论。以后要接着做，重新打开就行；一个工作区的项目全标完成，它会自己进归档。')}
                              onClick={() => setCompleting(p.threadId)}
                            />
                            <Choice
                              label={t('不动')}
                              hint={t('这个项目保持原样，这一条从单子上划掉。')}
                              onClick={() => void decide(workspaceId, `p${i}`, 'keep')}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            <WsDroppedNote t={t} dropped={session.dropped} />
          </>
        ) : (
          <div className="flex min-h-full items-center justify-center px-6 py-4 text-center text-[12px] leading-relaxed text-muted">
            {running ? (
              <div className="space-y-1">
                <div className="text-ink-2">{t('正在查…')}</div>
                <div>{t('已经等了 {n} 秒（最长等 {max} 秒）', { n: elapsed, max: timeoutSecs })}</div>
              </div>
            ) : session?.tooBig ? (
              <div className="max-w-md space-y-1">
                <div className="text-ink-2">
                  {t('这个工作区一共约 {a} 万字，超过一次能发的 {b} 万字，所以这一次没有发。', {
                    a: tenThousands(session.tooBig.chars),
                    b: tenThousands(session.tooBig.cap),
                    ac: session.tooBig.chars.toLocaleString('en'),
                    bc: session.tooBig.cap.toLocaleString('en'),
                  })}
                </div>
                <div>{t('可以先只查这个项目，或者把已经做完的项目标完成。')}</div>
                {session.auto && <div>{t('每月自动查的（{d}）', { d: monthDay(session.startedAt) })}</div>}
              </div>
            ) : cleanRun ? (
              <div className="space-y-1">
                <div className="text-ink-2">
                  {t('查完了，这个工作区里没有旧块被整条取代，也没有看起来已经结束的项目。')}
                </div>
                {session!.already > 0 && (
                  <div>
                    {t('另有 {n} 条你已经处理过了 —— 库里记着，这里不再问一遍。', { n: session!.already })}
                  </div>
                )}
                <div>{t('库里一个字都没动。')}</div>
              </div>
            ) : scanned ? (
              <div className="space-y-2">
                <div className="text-ink-2">{t('查完了，没有能拿给你的结果。')}</div>
                <WsDroppedNote t={t} dropped={session!.dropped} />
              </div>
            ) : (
              <div className="max-w-md space-y-1">
                <div>{t('点右下角开始。')}</div>
                <div>
                  {t('它会把这个工作区里 {n} 个没完成的项目一起发给 AI 看一遍，问两件事：有没有旧块被别的块整条取代了（可以跨项目），有没有项目看起来已经结束了。这一步要花钱。', {
                    n: plan?.threads.length ?? 0,
                  })}
                </div>
                {(plan?.skippedPrivate ?? 0) > 0 && (
                  <div>{t('私密项目 {n} 个不发。', { n: plan!.skippedPrivate })}</div>
                )}
                <div>{t('AI 说的每一条都要能在你的块里逐字对上，对不上的 Spool 不拿它去改库。')}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="flex flex-none items-center justify-between gap-3 border-t border-line bg-paper-2/40 px-5 py-3 text-xs">
        <span className="text-muted">{t('这一页只连线、标完成，不改任何一块的正文。')}</span>
        {enabled && (
          <span className="flex items-center gap-3">
            <RoadPicker setting="staleRoute" disabled={running || busy} />
            <button
              type="button"
              disabled={busy && !running}
              onClick={() => (running ? void cancel() : void scan(workspaceId))}
              className="flex items-center gap-1.5 rounded-md border border-line-strong bg-paper px-3 py-1.5 text-ink transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-50"
            >
              {running ? <Loader2 size={12} className="animate-spin" /> : <ScanSearch size={12} />}
              <span>
                {running ? t('停下（{n}s）', { n: elapsed }) : scanned || session?.tooBig ? t('再查一遍') : t('查一遍')}
              </span>
            </button>
          </span>
        )}
      </footer>
    </div>
  );
}

/** 「10-24」。 */
const monthDay = (ms: number): string => {
  const d = new Date(ms);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** 没过闸的那几条 —— 和「只查这个项目」那一页同一个理由（Ocean 08-23「不允许」Spool 知道而不告诉他）。 */
function WsDroppedNote({ t, dropped }: { t: T; dropped: WsDroppedItem[] }) {
  if (dropped.length === 0) return null;
  return (
    <div className="mt-3 rounded-md border border-line bg-paper-2/40 px-3 py-2 text-left text-[11px]">
      <div className="flex items-start gap-1.5 text-ink-2">
        <AlertTriangle size={12} className="mt-0.5 flex-none" />
        <div>
          {t('AI 还说了 {n} 条，但它引的原话在你的块里对不上，所以 Spool 没敢照着做。这是 AI 记错了，不是你的项目有问题。下面是它的原话，你自己看一眼：', {
            n: dropped.length,
          })}
        </div>
      </div>
      <ul className="mt-1.5 space-y-1.5 pl-5 text-muted">
        {dropped.map((d, i) => (
          <li key={i}>
            <div>{wsDroppedSentence(t, d)}</div>
            {d.why && <div className="text-muted/70">{t('它给的理由：{s}', { s: d.why })}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** ⚠️ 按 Rust 给的 `reason` 挑话，⛔ 不在这儿另判一遍。 */
export function wsDroppedSentence(t: T, d: WsDroppedItem): string {
  const old = d.old
    ? d.old.seq === null
      ? t('〈{name}〉', { name: d.old.title })
      : t('〈{name}〉#{n}', { name: d.old.title, n: d.old.seq })
    : d.oldLabel || '?';
  const by = d.by ? t('〈{name}〉#{n}', { name: d.by.title, n: d.by.seq }) : d.byLabel || '?';
  switch (d.reason) {
    case 'no_ref':
      return t('它写的编号「{a}」「{b}」不是 Spool 发过去的那种写法，认不出是哪两块。', {
        a: d.oldLabel || '?',
        b: d.byLabel || '?',
      });
    case 'no_project':
      return t('它说的「{a}」「{b}」里有一个项目这一次没有发过去。', { a: d.oldLabel || '?', b: d.byLabel || '?' });
    case 'no_block':
      return t('它说的是 {old} 和 {by}，而那个项目里没有这个编号。', { old, by });
    case 'same_block':
      return t('它说 {by} 取代了它自己。', { by });
    case 'quote_old':
      return d.kind === 'project'
        ? t('它说 {old} 里有这么一句：「{s}」—— 那个项目里没有这句话。', { old, s: d.quoteOld })
        : t('它说 {old} 里有这么一句：「{s}」—— 那一块里没有这句话。', { old, s: d.quoteOld });
    case 'quote_new':
      return t('它说 {old} 里有这么一句：「{s}」—— 那一块里没有这句话。', { old: by, s: d.quoteNew });
  }
}

