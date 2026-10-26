import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AiSetupPanel } from '@/components/AiSetup/AiSetupPanel';
import { PrivateAiPage, PrivateTabMark } from '@/components/AiSetup/PrivateAiEntry';
import type { Attachment } from '@/lib/db/attachments';
import type { Block } from '@/lib/db/blocks';
import { aiEntryState, type AiEntryState } from '@/lib/engine/gate';
import { t } from '@/lib/i18n';
import { IS_MAC } from '@/lib/platform';
import { useBlocksStore } from '@/stores/blocksStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useRoads } from '@/lib/engine/roads';
import { selectThreadById, useThreadsStore } from '@/stores/threadsStore';
import CompressBoard from '@/components/Compress/CompressBoard';
import StaleReview from '@/components/Compress/StaleReview';
import { useStaleScope } from '@/components/Compress/useStaleScope';
import GistBoard, { staleGistCount } from '@/components/Gist/GistBoard';
import { useCompressStore, wsStaleLeft } from '@/stores/compressStore';
import { useSearchStore } from '@/stores/searchStore';
import DigestView from './DigestView';
import LogView from './LogView';
import ThreadHeader, { type ThreadViewMode } from './ThreadHeader';
import ThreadPane from './ThreadPane';

const EMPTY: readonly Block[] = [];
const EMPTY_ATTACHMENTS: readonly Attachment[] = [];

/** A finished project opens on its digest unless the user flipped it this visit, or something
 *  asked for 「看全部」 this one time (P9H-1: the startup draft prompt's 「去看」, `logViewFor`). */
export const threadViewMode = (
  thread: { id: string; status: string },
  override: ThreadViewMode | null,
  logViewFor: string | null,
): ThreadViewMode =>
  thread.status === 'done' ? override ?? (logViewFor === thread.id ? 'log' : 'digest') : 'log';

export default function ThreadView() {
  const activeId = useThreadsStore((s) => s.activeId);
  const thread = useThreadsStore(selectThreadById(activeId));
  const reopen = useThreadsStore((s) => s.reopen);
  const logViewFor = useThreadsStore((s) => s.logViewFor);

  const blocks = useBlocksStore((s) =>
    activeId ? s.byThread[activeId] ?? EMPTY : EMPTY,
  );
  const attachments = useBlocksStore((s) =>
    activeId ? s.attachmentsByThread[activeId] ?? EMPTY_ATTACHMENTS : EMPTY_ATTACHMENTS,
  );

  // DESIGN_WORKBENCH §9.4 / §9.13: both the completion panel and the pack dialog are owned
  // by App now — 项目管理 can finish or pack a project that is not the one on screen, so
  // their open flags are thread ids in the store rather than booleans here.
  const setCompleting = useThreadsStore((s) => s.setCompleting);
  const setPacking = useThreadsStore((s) => s.setPacking);
  // ⭐ R4（2026-08-22 晚，Ocean）：整理面是**项目里的一个页签**，不是一个会盖住一切的窗口。
  // 「点击退出压缩工作区就无法回去」和「进去之后就看不了别的项目」是同一个根子：
  // 一份整理稿占着整个中间区，而它又不属于任何一个项目。
  const tab = useCompressStore((s) => (activeId ? s.tabs[activeId] ?? 'content' : 'content'));
  const setTab = useCompressStore((s) => s.setTab);
  const tidyReady = useCompressStore((s) =>
    activeId ? s.sessions[activeId]?.outcome?.ok === true : false,
  );
  // ⭐ 夜里那一批压好的也算「有一份等你核对」—— 它躺在全局那张单子上，
  // ⚠️ 右栏那个按钮撤掉之后，页签上这个数就是它唯一还看得见的地方。
  const nightlyReady = useCompressStore((s) =>
    activeId ? s.results.some((r) => r.target.threadId === activeId) : false,
  );
  // ⛔⛔ 2026-08-23（Ocean：「点击查旧块会把运行信息写在压缩里面，显示『压缩（在跑）』」）：
  // 这里原来只问了 `running && runningThreadId === activeId` —— **没问跑的是哪一件事**。
  // 两件事共用一把 sidecar 的锁，于是过期检测一跑，压缩那个页签跟着写「（在跑）」。
  const runningKind = useCompressStore((s) =>
    s.running && s.runningThreadId === activeId ? s.runningKind : null,
  );
  // P9V-2：页签上的数和「（在跑）」照这一页**现在显示的那种范围**算（只查这个项目 / 整个工作区）。
  const staleScope = useStaleScope(activeId);
  const staleWsId = staleScope.scope === 'workspace' ? staleScope.workspaceId : null;
  const staleRunning = useCompressStore(
    (s) =>
      s.running &&
      s.runningKind === 'stale' &&
      s.runningKey === (staleWsId ? `w:${staleWsId}` : `p:${activeId}`),
  );
  const wsSession = useCompressStore((s) => (staleWsId ? s.staleWs[staleWsId] : undefined));
  const threadsByWorkspace = useThreadsStore((s) => s.threadsByWorkspace);
  const projectStaleLeft = useCompressStore((s) => {
    const sess = activeId ? s.stale[activeId] : null;
    return sess ? sess.proposals.filter((_, i) => sess.decided[i] === undefined).length : 0;
  });
  const staleLeft = staleWsId
    ? wsStaleLeft(wsSession, (id) =>
        Object.values(threadsByWorkspace).some((list) => list.some((th) => th.id === id && th.status === 'done')),
      )
    : projectStaleLeft;
  // P9U-1: 压缩 and 过期检测 run on either road — the CLI on this machine or an API key.
  const roads = useRoads();
  const engineOn = roads.cli || roads.api;
  /** 这个项目那张卡上一共有几条（**含已经决定过的**）。
   *  ⚠️ 用它而不是 `staleLeft` 决定页签条出不出：决定完最后一条的那一刻 `staleLeft` 归零，
   *  ⛔ 页签会在用户眼皮底下消失，而他刚刚才点了那一下、还想看到「已换 / 已更正一处」那句回执。
   *  已决定的那几条留在单子上（划掉，不删）——那是 E3 定的，这里跟着它。 */
  const projectStaleAny = useCompressStore((s) =>
    activeId ? (s.stale[activeId]?.proposals.length ?? 0) : 0,
  );
  const staleAny = staleWsId
    ? (wsSession?.blocks.length ?? 0) + (wsSession?.projectItems.length ?? 0)
    : projectStaleAny;
  const showAi = useSettingsStore((s) => s.aiEngineActionsEnabled);
  /** P9C（第 94、98、99 条）：「压缩」页签。本机 CLI 或 API 有一条连上 ⇒ 照旧（P9U-1，原来只认 API）；都没有 ⇒ 名字后面一把锁，点进去当场打开；
   *  「显示 AI 功能」关着 ⇒ 不画。 */
  // P9E-3（第 122 条）：私密项目里两个页签都关着，不管引擎准备好没有。
  const privateProject = thread?.isPrivate === true;
  const compressEntry: AiEntryState = aiEntryState({
    ready: engineOn,
    route: 'any',
    showAi,
    isMac: IS_MAC,
    privateProject,
  });
  /** 「过期检测」页签：同上，⚠️ 但之前扫出来的还没点完时照出、不锁 —— 那是等他决定的东西，
   *  不是入口（「显示 AI 功能」关着也照出）。⛔ P7-5（Ocean 2026-10-07）：AI 提的不在这里了 —— 在待审里。 */
  const staleEntry: AiEntryState =
    staleAny > 0 && !privateProject
      ? 'ready'
      : aiEntryState({ ready: engineOn, route: 'any', showAi, isMac: IS_MAC, privateProject });
  // ⭐⭐ Q4（2026-08-25）：**页签条从此永远画。**
  // 「摘要」是 AI 通过 MCP 写进来的，和本地引擎开没开**毫无关系** —— 一个从没开过引擎的
  // 用户照样会有一库摘要，而在这之前 `showTabs` 是整条页签排的总闸，`false` 的时候
  // 一个页签都不画，那一库摘要就永远看不见。
  // P9C：`showTabs` 那道闸换成了上面两个入口状态 —— 没配的时候不再藏起来，锁着、点进去当场就能配。
  const highlight = useSearchStore((s) => s.highlight);
  /** 「摘要」页签上那个数：**只数「这一块挂着更正，而摘要还是更正之前那句」**。
   *  ⛔ 不数「没有摘要」—— 大多数块本来就没有摘要，那个数字会永远是个大数，
   *  三天之后没有人再看它一眼。 */
  const gistStale = staleGistCount(blocks);
  // For `done` threads the user can flip to LogView within a session; the override
  // resets to null on thread switch so reopens default back to DigestView (§9.9).
  const [viewOverride, setViewOverride] = useState<ThreadViewMode | null>(null);
  useEffect(() => {
    setViewOverride(null);
  }, [activeId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (thread) setPacking(thread.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [thread, setPacking]);

  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="font-serif text-3xl italic text-muted">a quiet hub</p>
          <p className="mt-3 text-xs text-muted">{t('从左侧选一个项目，或按 ⌘N 新建')}</p>
        </div>
      </div>
    );
  }

  const viewMode = threadViewMode(thread, viewOverride, logViewFor);

  const handleReopen = (): void => {
    void reopen(thread.id);
    setViewOverride(null);
  };

  return (
    <ThreadPane>
      <ThreadHeader
        thread={thread}
        blocks={blocks}
        onPack={() => setPacking(thread.id)}
        onComplete={() => setCompleting(thread.id)}
        onReopen={handleReopen}
        viewMode={viewMode}
        onSetViewMode={setViewOverride}
      />
      {/* 页签。P9C（第 94 条）：压缩没开的时候不再藏起来 —— 名字后面一把锁，点进去那一页
          当场就能打开（推翻原来「点了只会说你还没配的页签不如没有」那条）。

          ⭐ 2026-08-23（Ocean 第 3 条「把两个功能拆出来，变成内容，压缩，和一个新的」）：
          原来是两个页签，第二个叫「整理」，里面上下摞着压缩核对面和查旧块。
          ⛔ 别再摞回去 —— 两件事没关系，摞在一起的唯一后果是核对面只剩半屏。 */}
      {/* 「过期检测」在扫出来的还没点完时照出（哪怕引擎后来关了）。⛔ P7-5：AI 提的「更正 / 取代」
          不进这里，在待审里（Ocean 2026-10-07「过期检测只适用于用户自主检测」，推翻 08-24 S2）。 */}
      <div className="flex flex-none items-center gap-4 border-b border-line px-5 text-[12px]">
          <Tab active={tab === 'content'} onClick={() => setTab(thread.id, 'content')}>
            {t('内容')}
          </Tab>
          {compressEntry !== 'hidden' && (
          <Tab active={tab === 'compress'} onClick={() => setTab(thread.id, 'compress')}>
            {/* ⚠️ 有一份等着核对就在页签上说出来 —— 切走之后它还在，别让人以为没了。 */}
            {runningKind === 'compress'
              ? t('压缩（在跑）')
              : tidyReady || nightlyReady
                ? t('压缩（1）')
                : t('压缩')}
            {compressEntry === 'locked' && <TabLock />}
            {compressEntry === 'private' && <PrivateTabMark />}
          </Tab>
          )}
          {/* ⭐ 2026-08-23 Ocean 改的名：「『查旧块』名字改成『过期检测』，更加贴切」。
              ⛔ 仍然不许出现「作废」两个字（§2.E3 写死的）——「过期」不是「作废」。 */}
          {staleEntry !== 'hidden' && (
          <Tab active={tab === 'stale'} onClick={() => setTab(thread.id, 'stale')}>
            {staleRunning
              ? t('过期检测（在跑）')
              : staleLeft > 0
                ? t('过期检测（{n}）', { n: staleLeft })
                : t('过期检测')}
            {staleEntry === 'locked' && <TabLock />}
            {staleEntry === 'private' && <PrivateTabMark />}
          </Tab>
          )}
          {/* ⭐ Q4：和「内容」一样永远在。 */}
          <Tab active={tab === 'gist'} onClick={() => setTab(thread.id, 'gist')}>
            {gistStale > 0 ? t('块摘要（{n}）', { n: gistStale }) : t('块摘要')}
          </Tab>
        </div>

      {tab === 'gist' ? (
        <div className="min-h-0 flex-1">
          {/* ⚠️ 跳转在这一层做：先切回「内容」，再点亮那一块。只调 `highlight` 的话，
              用户还停在「摘要」这一页上，什么都不会发生。 */}
          <GistBoard
            key={thread.id}
            threadId={thread.id}
            onJump={(blockId) => {
              setTab(thread.id, 'content');
              highlight(blockId);
            }}
          />
        </div>
      ) : compressEntry === 'ready' && tab === 'compress' ? (
        <div className="min-h-0 flex-1">
          <CompressBoard threadId={thread.id} />
        </div>
      ) : compressEntry === 'locked' && tab === 'compress' ? (
        <LockedApiPage
          text={t('压缩：让 AI 把这个项目写短一点、合并重复的话。你一块对一块核对过之前，库里一个字都不动。用本机的 Claude Code / Codex，或者你自己的 API key。')}
        />
      ) : compressEntry === 'private' && tab === 'compress' ? (
        <PrivateAiPage label={t('压缩')} />
      ) : staleEntry === 'ready' && tab === 'stale' ? (
        <div className="min-h-0 flex-1">
          <StaleReview threadId={thread.id} />
        </div>
      ) : staleEntry === 'locked' && tab === 'stale' ? (
        <LockedApiPage
          text={t('过期检测：让 AI 读一遍这个项目，找出已经被后面的块整条取代了的旧块。换不换由你一条一条定，你不点，库里一个字都不动。用本机的 Claude Code / Codex，或者你自己的 API key。')}
        />
      ) : staleEntry === 'private' && tab === 'stale' ? (
        <PrivateAiPage label={t('过期检测')} />
      ) : viewMode === 'digest' ? (
        <DigestView
          key={thread.id}
          thread={thread}
          blocks={blocks}
          attachments={attachments}
          onShowLog={() => setViewOverride('log')}
        />
      ) : (
        <LogView key={thread.id} threadId={thread.id} />
      )}
    </ThreadPane>
  );
}

/** P9C — the small lock after a tab's name while DeepSeek is off. */
function TabLock() {
  return <Lock size={10} className="ml-1 inline-block align-[-1px]" aria-hidden />;
}

/** P9C（第 94、95 条）— a locked tab's page: what it does and what it costs, with the 「AI 引擎」
 *  piece right there (no second click). Turning DeepSeek on swaps this for the real page in place. */
function LockedApiPage({ text }: { text: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-[420px] space-y-4">
        <p className="text-sm leading-relaxed text-ink-2">{text}</p>
        <div className="rounded-md border border-line bg-paper p-3">
          <AiSetupPanel route="any" />
        </div>
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-0.5 py-1.5 transition-colors ${
        active
          ? 'border-accent text-ink'
          : 'border-transparent text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
