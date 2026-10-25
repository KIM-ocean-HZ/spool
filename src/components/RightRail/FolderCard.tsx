import { open } from '@tauri-apps/plugin-dialog';
import { Check, ChevronDown, ChevronRight, FolderGit2, MoreHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import RailSection from './RailSection';
import { ConnectDialog, DiffDialog, DisconnectDialog, PointersDialog, StateFilesDialog } from './FolderDialogs';
import {
  folderError,
  inspectFolder,
  relocateFolder,
  rewriteProtocol,
  setFolderPrimary,
  type FolderCandidate,
  type FolderInspect,
  type FolderLocation,
  type FolderView,
} from '@/lib/folders/api';
import { shortRel, stateTag } from '@/lib/folders/view';
import { dateLocale, useT } from '@/lib/i18n';
import { openTarget } from '@/lib/utils/openTarget';
import type { Thread } from '@/lib/db/threads';
import { useFolderStore } from '@/stores/folderStore';
import { toast } from '@/stores/toastStore';

// P9Y (task book §3.1) — 「连接的文件夹」, the first standing section of the right rail.
//
// Shaped after Claude Desktop's project folder (Ocean 第 208 条 ①): one folder per project, picked
// with the system dialog, removed from the same place. What the card says, top to bottom: which
// folder; when it was last brought in line with the project and whether its state files changed
// since; the other changes, folded; the SPOOL.md it keeps there; 「已经对过了」.
//
// ⚠️ Looked at when the project is on screen and when the window comes back to the front — the same
// moments as project files — ⛔ never in the background.
// ⚠️ One colour for attention (the one 项目文件 uses for a missing file), and no warning signs: the
// rail is allowed one at most (HANDOFF §10.6).

const ATTENTION = { color: 'var(--status-parked)' } as const;

const LOST: Partial<Record<FolderLocation, string>> = {
  offline: '这个文件夹在一块没接上的磁盘上',
  trash: '这个文件夹在废纸篓里',
  deleted: '这个文件夹已经删掉了',
  unknown: '找不到这个文件夹了',
};

type Open =
  | { kind: 'connect'; inspect: FolderInspect }
  | { kind: 'state'; candidates: FolderCandidate[] }
  | { kind: 'pointers' }
  | { kind: 'disconnect'; replacing: boolean }
  | { kind: 'diff' }
  | null;

const pickFolder = async (): Promise<string | null> => {
  const picked = await open({ multiple: false, directory: true });
  return typeof picked === 'string' ? picked : null;
};

export default function FolderCard({ thread }: { thread: Thread }) {
  const t = useT();
  const view = useFolderStore((s) => s.views[thread.id]);
  const load = useFolderStore((s) => s.load);
  const markSynced = useFolderStore((s) => s.markSynced);
  const [dialog, setDialog] = useState<Open>(null);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    void load(thread.id);
    const look = (): void => void load(thread.id);
    window.addEventListener('focus', look);
    return () => window.removeEventListener('focus', look);
  }, [thread.id, load]);

  useEffect(() => {
    setExpanded(false);
    setMenu(false);
  }, [thread.id]);

  const startConnect = async (): Promise<void> => {
    const path = await pickFolder();
    if (!path) return;
    try {
      setDialog({ kind: 'connect', inspect: await inspectFolder(path) });
    } catch (e) {
      toast.error(folderError(e));
    }
  };

  const day = (ms: number): string =>
    new Date(ms).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric' });

  const dialogs = ((): JSX.Element | null => {
    if (!dialog) return null;
    const close = (): void => setDialog(null);
    switch (dialog.kind) {
      case 'connect':
        return <ConnectDialog threadId={thread.id} title={thread.title} inspect={dialog.inspect} onClose={close} />;
      case 'state':
        return view ? (
          <StateFilesDialog threadId={thread.id} view={view} candidates={dialog.candidates} onClose={close} />
        ) : null;
      case 'pointers':
        return view ? <PointersDialog threadId={thread.id} view={view} onClose={close} /> : null;
      case 'disconnect':
        return view ? (
          <DisconnectDialog
            threadId={thread.id}
            title={thread.title}
            view={view}
            replacing={dialog.replacing}
            onClose={close}
            onDone={() => {
              close();
              void load(thread.id);
              if (dialog.replacing) void startConnect();
            }}
          />
        ) : null;
      case 'diff':
        return (
          <DiffDialog
            threadId={thread.id}
            onClose={close}
            onReplace={() => {
              close();
              void rewriteProtocol(thread.id)
                .then(() => load(thread.id))
                .catch((e) => toast.error(folderError(e)));
            }}
          />
        );
    }
  })();

  // Not looked yet: nothing, rather than a 「连接文件夹…」 that turns into a card a moment later.
  if (view === undefined) return null;

  if (view === null) {
    return (
      <RailSection title={t('连接的文件夹')}>
        {thread.isPrivate ? (
          // P9Y-3 (第 3 题：私密项目不能连).
          <div className="px-3 text-[12px] text-muted">
            <span className="flex items-center gap-1.5 opacity-60">
              <FolderGit2 size={12} className="flex-none" />
              {t('连接文件夹…')}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug">
              {t('私密项目不连文件夹：连了之后仓库里的 AI 会知道它存在。')}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void startConnect()}
            className="flex w-full items-center gap-1.5 rounded-md px-3 py-1 text-left text-[12px] text-ink-2 transition-colors hover:bg-paper-2/60 hover:text-accent"
          >
            <FolderGit2 size={12} className="flex-none" />
            {t('连接文件夹…')}
          </button>
        )}
        {dialogs}
      </RailSection>
    );
  }

  const v: FolderView = view;
  const lost = LOST[v.location];
  const changedState = v.state.filter((s) => stateTag(s) !== null).length;
  const extra = v.changes.length;
  const syncLine =
    v.state.length === 0
      ? t('上次同步 {day} · 还没选现状文件', { day: day(v.syncedAt) })
      : changedState > 0
        ? t('上次同步 {day} · 之后改了 {n} 份现状文件', { day: day(v.syncedAt), n: changedState })
        : t('上次同步 {day} · 现状文件没变', { day: day(v.syncedAt) });
  const link = 'text-muted transition-colors hover:text-accent hover:underline';

  return (
    <RailSection
      title={t('连接的文件夹')}
      action={
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-label={t('更多')}
          title={t('更多')}
          className="flex-none rounded p-0.5 text-muted transition-colors hover:text-ink"
        >
          <MoreHorizontal size={12} />
        </button>
      }
    >
      <div className="space-y-1 px-3 text-[12px] leading-relaxed">
        <button
          type="button"
          onClick={() => void openTarget(v.path).catch((e) => toast.error(String(e)))}
          title={v.path}
          className="flex w-full items-baseline gap-2 text-left"
        >
          <span className="min-w-0 truncate text-ink">{v.name}</span>
          <span className="ml-auto min-w-0 truncate font-mono text-[11px] text-muted">{v.short}</span>
        </button>

        {lost ? (
          <>
            <p className="text-[11px]" style={ATTENTION}>
              {t(lost)}
            </p>
            <div className="flex flex-wrap gap-x-3 text-[11px]">
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() =>
                  void pickFolder().then((p) => {
                    if (p)
                      void relocateFolder(thread.id, p)
                        .then(() => load(thread.id))
                        .catch((e) => toast.error(folderError(e)));
                  })
                }
              >
                {t('重新选位置')}
              </button>
              <button type="button" className={link} onClick={() => setDialog({ kind: 'disconnect', replacing: false })}>
                {t('断开')}
              </button>
            </div>
          </>
        ) : (
          <>
            {v.location === 'moved' && <p className="text-[11px] text-muted">{t('文件夹挪了位置，Spool 跟过去了。')}</p>}
            <p className="text-[11px]" style={v.ahead ? ATTENTION : undefined}>
              <span className={v.ahead ? '' : 'text-muted'}>{syncLine}</span>
            </p>
            {v.state.length > 0 && (
              <ul>
                {v.state.map((s) => {
                  const tag = stateTag(s);
                  return (
                    <li key={s.spec} className="flex items-baseline gap-2 text-[11px]">
                      <span className="min-w-0 truncate font-mono text-ink-2" title={s.path ?? s.spec}>
                        {shortRel(s.path ?? s.spec)}
                      </span>
                      <span className="ml-auto flex-none" style={tag ? ATTENTION : undefined}>
                        {tag === 'changed' ? t('改过') : tag === 'gone' ? t('没了') : <span className="text-muted">{t('现状')}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {(extra > 0 || v.commits.length > 0) && (
              <button
                type="button"
                onClick={() => setExpanded((x) => !x)}
                className="flex w-full items-center gap-1 text-left text-[11px] text-muted transition-colors hover:text-ink"
              >
                <span className="min-w-0 flex-1 truncate">
                  {[
                    extra > 0 ? t('另外 {n} 个文件有改动', { n: extra }) : null,
                    v.commits.length > 0 ? t('{n} 次提交', { n: v.commits.length }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {expanded ? <ChevronDown size={11} className="flex-none" /> : <ChevronRight size={11} className="flex-none" />}
              </button>
            )}
            {expanded && (
              <div className="max-h-48 space-y-1 overflow-y-auto text-[11px]">
                {v.commits.length > 0 && (
                  <ul>
                    {v.commits.map((c) => (
                      <li key={`${c.at}-${c.title}`} className="flex gap-2">
                        <span className="flex-none tabular-nums text-muted">{day(c.at)}</span>
                        <span className="min-w-0 break-words text-ink-2">{c.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {extra > 0 && (
                  <ul>
                    {v.changes.slice(0, 50).map((c) => (
                      <li key={c.path} className="flex gap-2">
                        <span className="w-8 flex-none text-muted">
                          {c.kind === 'added' ? t('新增') : c.kind === 'deleted' ? t('删了') : t('改过')}
                        </span>
                        <span className="min-w-0 break-all font-mono text-ink-2">{c.path}</span>
                      </li>
                    ))}
                    {extra > 50 && <li className="text-muted">{t('还有 {n} 个', { n: extra - 50 })}</li>}
                  </ul>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-baseline gap-x-2 text-[11px]">
              <span className="font-mono text-ink-2">SPOOL.md</span>
              <button
                type="button"
                className={link}
                onClick={() => void openTarget(`${v.path}/SPOOL.md`).catch((e) => toast.error(String(e)))}
              >
                {t('打开')}
              </button>
              <span className="text-muted">·</span>
              <button type="button" className={link} onClick={() => setDialog({ kind: 'pointers' })}>
                {t('让 AI 读到它')}
              </button>
            </div>
            {v.protocol === 'edited' && (
              <p className="text-[11px]" style={ATTENTION}>
                {t('SPOOL.md 里 Spool 那一段你改过，项目有变化时 Spool 先不覆盖。')}{' '}
                <button type="button" className="text-accent hover:underline" onClick={() => setDialog({ kind: 'diff' })}>
                  {t('看差别')}
                </button>
              </p>
            )}
            {(v.protocol === 'removed' || v.protocol === 'missing') && (
              <p className="text-[11px] text-muted">
                {v.protocol === 'missing' ? t('文件夹里没有 SPOOL.md 了。') : t('SPOOL.md 里没有 Spool 那一段了。')}{' '}
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={() =>
                    void rewriteProtocol(thread.id)
                      .then(() => load(thread.id))
                      .catch((e) => toast.error(folderError(e)))
                  }
                >
                  {t('重新写一份')}
                </button>
              </p>
            )}
            {v.others.length > 0 && (
              <p className="text-[11px] text-muted">
                {t('同一个文件夹还连着{them}', {
                  them: v.others.map((n) => t('〈{name}〉', { name: n })).join(t('、')),
                })}
                {v.primary ? t('；这个项目是主项目') : ''}
              </p>
            )}

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() =>
                  void markSynced(thread.id).then(
                    () => toast.notice(t('记下了：从现在起再看改动')),
                    (e) => toast.error(folderError(e)),
                  )
                }
                title={t('仓库里的新情况已经记进 Spool 了：从现在起重新算改动')}
                className={`flex flex-none items-center gap-1 whitespace-nowrap rounded border px-2 py-0.5 text-[11px] transition-colors ${
                  v.ahead
                    ? 'border-accent text-accent hover:bg-accent/10'
                    : 'border-line text-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                <Check size={11} className="flex-none" />
                {t('已经对过了')}
              </button>
              {v.syncNote && (
                <span className="min-w-0 truncate text-[11px] text-muted" title={`${v.syncBy ?? ''} · ${v.syncNote}`}>
                  {v.syncNote}
                </span>
              )}
            </div>
          </>
        )}

        {menu && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-line pt-1 text-[11px]">
            {!lost && (
              <button
                type="button"
                className={link}
                onClick={() => {
                  setMenu(false);
                  void inspectFolder(v.path)
                    .then((i) => setDialog({ kind: 'state', candidates: i.candidates }))
                    .catch((e) => toast.error(folderError(e)));
                }}
              >
                {t('改现状文件')}
              </button>
            )}
            {!v.primary && v.others.length > 0 && (
              <button
                type="button"
                className={link}
                onClick={() => {
                  setMenu(false);
                  void setFolderPrimary(thread.id)
                    .then(() => load(thread.id))
                    .catch((e) => toast.error(folderError(e)));
                }}
              >
                {t('设为主项目')}
              </button>
            )}
            <button
              type="button"
              className={link}
              onClick={() => {
                setMenu(false);
                setDialog({ kind: 'disconnect', replacing: true });
              }}
            >
              {t('换文件夹')}
            </button>
            <button
              type="button"
              className={link}
              onClick={() => {
                setMenu(false);
                setDialog({ kind: 'disconnect', replacing: false });
              }}
            >
              {t('断开')}
            </button>
          </div>
        )}
      </div>
      {dialogs}
    </RailSection>
  );
}
