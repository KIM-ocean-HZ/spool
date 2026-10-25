import { open } from '@tauri-apps/plugin-dialog';
import { ArrowRight, Check, ChevronDown, ChevronRight, FolderGit2, MoreHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import RailSection from './RailSection';
import { ConnectDialog, DiffDialog, DisconnectDialog, PointersDialog, StateFilesDialog } from './FolderDialogs';
import {
  folderError,
  inspectFolder,
  relocateFolder,
  rewriteProtocol,
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
import { useThreadsStore } from '@/stores/threadsStore';
import { toast } from '@/stores/toastStore';

// P9Y (task book §3.1) and its second round (§8, Ocean 10-25 第 210 条:「需要整个工作区直接连接到一个
// 项目文件夹上」) — a folder is linked to a WORKSPACE.
//
//   * `FolderPanel` is the whole thing, on the workspace page: connect, what changed, the state files,
//     SPOOL.md, 「让 AI 读到它」, change folder, disconnect.
//   * `FolderCard` (default) is a project's right rail: which folder the project's workspace is
//     linked to, whether it moved ahead, 「已经对过了」, and the way to the workspace page.
//
// ⚠️ Looked at when on screen and when the window comes back to the front — ⛔ never in the
// background. One colour for attention (the one 项目文件 uses for a missing file), no warning signs.

const ATTENTION = { color: 'var(--status-parked)' } as const;

const LOST: Partial<Record<FolderLocation, string>> = {
  offline: '这个文件夹在一块没接上的磁盘上',
  trash: '这个文件夹在废纸篓里',
  deleted: '这个文件夹已经删掉了',
  unknown: '找不到这个文件夹了',
};

const pickFolder = async (): Promise<string | null> => {
  const picked = await open({ multiple: false, directory: true });
  return typeof picked === 'string' ? picked : null;
};

const useDay = () => (ms: number): string =>
  new Date(ms).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric' });

/** 「上次同步 10-14 · 之后改了 2 份现状文件」 */
const useSyncLine = () => {
  const t = useT();
  const day = useDay();
  return (v: FolderView): string => {
    const changed = v.state.filter((s) => stateTag(s) !== null).length;
    return v.state.length === 0
      ? t('上次同步 {day} · 还没选现状文件', { day: day(v.syncedAt) })
      : changed > 0
        ? t('上次同步 {day} · 之后改了 {n} 份现状文件', { day: day(v.syncedAt), n: changed })
        : t('上次同步 {day} · 现状文件没变', { day: day(v.syncedAt) });
  };
};

function StateList({ v }: { v: FolderView }) {
  const t = useT();
  if (v.state.length === 0) return null;
  return (
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
  );
}

function SyncButton({ v }: { v: FolderView }) {
  const t = useT();
  const markSynced = useFolderStore((s) => s.markSynced);
  return (
    <div className="flex items-center gap-2 pt-0.5">
      <button
        type="button"
        onClick={() =>
          void markSynced(v).then(
            () => toast.notice(t('记下了：从现在起再看改动')),
            (e) => toast.error(folderError(e)),
          )
        }
        title={t('仓库里的新情况已经记进 Spool 了：从现在起重新算改动')}
        className={`flex flex-none items-center gap-1 whitespace-nowrap rounded border px-2 py-0.5 text-[11px] transition-colors ${
          v.ahead ? 'border-accent text-accent hover:bg-accent/10' : 'border-line text-muted hover:border-line-strong hover:text-ink'
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
  );
}

type Open =
  | { kind: 'connect'; inspect: FolderInspect }
  | { kind: 'state'; candidates: FolderCandidate[] }
  | { kind: 'pointers' }
  | { kind: 'disconnect'; replacing: boolean }
  | { kind: 'diff' }
  | null;

/** The workspace page's folder section. `view` is what the workspace falls under (its own link or
 *  one above); null = nothing above it is linked either. */
export function FolderPanel({ workspaceId, title, view }: { workspaceId: string; title: string; view: FolderView | null }) {
  const t = useT();
  const day = useDay();
  const syncLine = useSyncLine();
  const reloadAll = useFolderStore((s) => s.reloadAll);
  const [dialog, setDialog] = useState<Open>(null);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    setExpanded(false);
    setMenu(false);
  }, [workspaceId]);

  const startConnect = async (): Promise<void> => {
    const path = await pickFolder();
    if (!path) return;
    try {
      setDialog({ kind: 'connect', inspect: await inspectFolder(path) });
    } catch (e) {
      toast.error(folderError(e));
    }
  };

  const close = (): void => setDialog(null);
  const dialogs = ((): JSX.Element | null => {
    if (!dialog) return null;
    switch (dialog.kind) {
      case 'connect':
        return <ConnectDialog workspaceId={workspaceId} title={title} inspect={dialog.inspect} onClose={close} />;
      case 'state':
        return view ? <StateFilesDialog view={view} candidates={dialog.candidates} onClose={close} /> : null;
      case 'pointers':
        return view ? <PointersDialog view={view} onClose={close} /> : null;
      case 'disconnect':
        return view ? (
          <DisconnectDialog
            view={view}
            replacing={dialog.replacing}
            onClose={close}
            onDone={() => {
              close();
              if (dialog.replacing) void startConnect();
            }}
          />
        ) : null;
      case 'diff':
        return view ? (
          <DiffDialog
            workspaceId={view.workspaceId}
            onClose={close}
            onReplace={() => {
              close();
              void rewriteProtocol(view.workspaceId)
                .then(() => reloadAll())
                .catch((e) => toast.error(folderError(e)));
            }}
          />
        ) : null;
    }
  })();

  const connectButton = (label: string) => (
    <button
      type="button"
      onClick={() => void startConnect()}
      className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[12px] text-ink-2 transition-colors hover:border-accent hover:text-accent"
    >
      <FolderGit2 size={12} className="flex-none" />
      {label}
    </button>
  );

  if (!view || view.inherited) {
    return (
      <div className="space-y-2 text-[12px] leading-relaxed">
        {view ? (
          <p className="text-ink-2">
            {t('上层工作区「{ws}」连着 {path}，这个工作区的项目都写在那里的 SPOOL.md 里。', { ws: view.workspace, path: view.short })}
          </p>
        ) : (
          <p className="text-muted">
            {t('把这个工作区连到电脑上的一个文件夹（代码仓库、论文文件夹都行）。Spool 会看那里的计划改了没有，并放一份 SPOOL.md 告诉在那里工作的 AI 这些项目是怎么回事。')}
          </p>
        )}
        {connectButton(view ? t('给这个工作区另连一个文件夹…') : t('连接文件夹…'))}
        {dialogs}
      </div>
    );
  }

  const v = view;
  const lost = LOST[v.location];
  const extra = v.changes.length;
  const link = 'text-muted transition-colors hover:text-accent hover:underline';

  return (
    <div className="space-y-1.5 text-[12px] leading-relaxed">
      <div className="flex items-baseline gap-2">
        <button
          type="button"
          onClick={() => void openTarget(v.path).catch((e) => toast.error(String(e)))}
          title={v.path}
          className="min-w-0 truncate text-left text-sm text-ink hover:text-accent"
        >
          {v.name}
        </button>
        <span className="min-w-0 truncate font-mono text-[11px] text-muted">{v.short}</span>
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-label={t('更多')}
          title={t('更多')}
          className="ml-auto flex-none rounded p-0.5 text-muted transition-colors hover:text-ink"
        >
          <MoreHorizontal size={13} />
        </button>
      </div>

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
                    void relocateFolder(v.workspaceId, p)
                      .then(() => reloadAll())
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
            <span className={v.ahead ? '' : 'text-muted'}>{syncLine(v)}</span>
          </p>
          <StateList v={v} />
          {(extra > 0 || v.commits.length > 0) && (
            <button
              type="button"
              onClick={() => setExpanded((x) => !x)}
              className="flex items-center gap-1 text-left text-[11px] text-muted transition-colors hover:text-ink"
            >
              <span>
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
            <div className="max-h-56 space-y-1 overflow-y-auto text-[11px]">
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
            {v.primaryTitle && (
              <span className="text-muted">· {t('主项目〈{title}〉', { title: v.primaryTitle })}</span>
            )}
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
                  void rewriteProtocol(v.workspaceId)
                    .then(() => reloadAll())
                    .catch((e) => toast.error(folderError(e)))
                }
              >
                {t('重新写一份')}
              </button>
            </p>
          )}
          <SyncButton v={v} />
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
      {dialogs}
    </div>
  );
}

/** A project's right rail: the folder its workspace falls under. */
export default function FolderCard({ thread }: { thread: Thread }) {
  const t = useT();
  const view = useFolderStore((s) => s.views[thread.id]);
  const load = useFolderStore((s) => s.load);
  const openWorkspace = useThreadsStore((s) => s.openWorkspace);
  const syncLine = useSyncLine();

  useEffect(() => {
    void load(thread.id);
    const look = (): void => void load(thread.id);
    window.addEventListener('focus', look);
    return () => window.removeEventListener('focus', look);
  }, [thread.id, thread.workspaceId, load]);

  // Not looked yet: nothing, rather than a line that turns into a card a moment later.
  if (view === undefined) return null;

  const toWorkspace = (id: string, label: string) => (
    <button
      type="button"
      onClick={() => openWorkspace(id)}
      className="flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-accent"
    >
      {label}
      <ArrowRight size={11} className="flex-none" />
    </button>
  );

  if (view === null) {
    return (
      <RailSection title={t('连接的文件夹')}>
        <div className="px-3 text-[12px]">{toWorkspace(thread.workspaceId, t('所在工作区还没连文件夹 · 去连接'))}</div>
      </RailSection>
    );
  }

  const v = view;
  const lost = LOST[v.location];
  return (
    <RailSection title={t('连接的文件夹')}>
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
        <p className="text-[11px] text-muted">{t('工作区「{ws}」连着', { ws: v.workspace })}</p>
        {thread.isPrivate && (
          <p className="text-[11px] text-muted">{t('私密项目不写进 SPOOL.md，连这个文件夹的 AI 不知道它。')}</p>
        )}
        {lost ? (
          <p className="text-[11px]" style={ATTENTION}>
            {t(lost)}
          </p>
        ) : (
          <>
            <p className="text-[11px]" style={v.ahead ? ATTENTION : undefined}>
              <span className={v.ahead ? '' : 'text-muted'}>{syncLine(v)}</span>
            </p>
            <StateList v={v} />
            <SyncButton v={v} />
          </>
        )}
        {toWorkspace(v.workspaceId, t('在工作区里管理'))}
      </div>
    </RailSection>
  );
}
