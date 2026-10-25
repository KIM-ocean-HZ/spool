import { ArrowRight, ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FolderPanel } from '@/components/RightRail/FolderCard';
import PrivateMark from '@/components/ui/PrivateMark';
import StatusDot from '@/components/ui/StatusDot';
import { listAttachmentsByThread, type Attachment } from '@/lib/db/attachments';
import { blockStatsByThread, type ThreadBlockStats } from '@/lib/db/blocks';
import { listFollowUpItems, type FollowUpItem } from '@/lib/db/followUpItems';
import type { Thread } from '@/lib/db/threads';
import { fileLabel, openAttachment } from '@/lib/files/openFile';
import { folderError, setFolderPrimary } from '@/lib/folders/api';
import { dateLocale, useT } from '@/lib/i18n';
import { CENTRE_HEADER_HEIGHT } from '@/lib/layout';
import { DUE_SOON_DAYS, dueInDays } from '@/lib/threads/deadline';
import { useFolderStore } from '@/stores/folderStore';
import { useThreadsStore } from '@/stores/threadsStore';
import { useWorkspacesStore } from '@/stores/workspacesStore';
import { toast } from '@/stores/toastStore';

// P9Y 第二轮 (Ocean 2026-10-25 第 210 条):「直接把工作区做成可点击，类似左侧边栏顶部的项目管理，除了能
// 链接文件夹，也能按照项目划分列出每个项目的项目文件，follow up 等等信息汇总」.
//
// A workspace's own page, opened by clicking its name in the left rail. Like 项目管理 it takes the
// centre column and has no right rail. Two parts:
//   * the folder the workspace is linked to (FolderPanel — connect, what changed, SPOOL.md, sync);
//   * every project in it, and in its sub-workspaces, one block each: the one-line summary, what it is
//     watching (the open follow-up lines), its files. Read here, acted on inside the project — the
//     title opens it.
// ⚠️ Read-only apart from the folder and 「设为主项目」: the page is an overview, and the project is
// where its blocks, lines and files are changed.

const EMPTY_STATS: ThreadBlockStats = { blocks: 0, chars: 0 };

interface Detail {
  files: Attachment[];
  lines: FollowUpItem[];
}

export default function WorkspaceBoard() {
  const t = useT();
  const workspaceId = useThreadsStore((s) => s.workspaceViewId);
  const byWorkspace = useThreadsStore((s) => s.threadsByWorkspace);
  const select = useThreadsStore((s) => s.select);
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const view = useFolderStore((s) => (workspaceId ? s.wsViews[workspaceId] : undefined));
  const linked = useFolderStore((s) => s.linked);
  const loadWorkspace = useFolderStore((s) => s.loadWorkspace);
  const reloadAll = useFolderStore((s) => s.reloadAll);
  const [stats, setStats] = useState<Record<string, ThreadBlockStats>>({});
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [doneOpen, setDoneOpen] = useState(false);

  const ws = workspaces.find((w) => w.id === workspaceId);
  const title = ws?.title.trim() || t('未命名');

  // This workspace, then each workspace under it, depth-first in the sidebar's order.
  const groups = useMemo(() => {
    if (!workspaceId) return [] as { id: string; title: string; depth: number }[];
    const out: { id: string; title: string; depth: number }[] = [];
    const walk = (id: string, depth: number): void => {
      const w = workspaces.find((x) => x.id === id);
      if (!w || out.some((o) => o.id === id) || depth > 32) return;
      out.push({ id, title: w.title.trim() || t('未命名'), depth });
      workspaces
        .filter((x) => x.parentId === id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt)
        .forEach((x) => walk(x.id, depth + 1));
    };
    walk(workspaceId, 0);
    return out;
  }, [workspaceId, workspaces, t]);

  const threads = useMemo(() => groups.flatMap((g) => byWorkspace[g.id] ?? []), [groups, byWorkspace]);

  useEffect(() => {
    if (!workspaceId) return;
    void loadWorkspace(workspaceId);
    const look = (): void => void loadWorkspace(workspaceId);
    window.addEventListener('focus', look);
    return () => window.removeEventListener('focus', look);
  }, [workspaceId, loadWorkspace]);

  useEffect(() => {
    void blockStatsByThread()
      .then(setStats)
      .catch((e) => console.warn('[workspace] block stats failed', e));
    let stale = false;
    void Promise.all(
      threads.map(async (th) => {
        const [files, lines] = await Promise.all([listAttachmentsByThread(th.id), listFollowUpItems(th.id)]);
        return [th.id, { files: files.filter((f) => f.supersededBy === null), lines: lines.filter((l) => l.status === 'open') }] as const;
      }),
    )
      .then((rows) => {
        if (!stale) setDetails(Object.fromEntries(rows));
      })
      .catch((e) => console.warn('[workspace] details failed', e));
    return () => {
      stale = true;
    };
    // The app reloads project rows on focus and after outside writes, even when the IDs stay the
    // same. Refresh their files and follow-up lines with those rows so this overview stays current.
  }, [threads]);

  if (!workspaceId || !ws) {
    return <p className="pt-12 text-center text-sm text-muted">{t('这个工作区已经不在了。')}</p>;
  }

  const now = Date.now();
  const ownLink = view && !view.inherited ? view : null;
  const day = (ms: number): string => new Date(ms).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric' });
  const belongsToFolder = (th: Thread): boolean => {
    if (!ownLink) return false;
    let id: string | null = th.workspaceId;
    for (let depth = 0; id && depth <= 32; depth += 1) {
      if (id === ownLink.workspaceId) return true;
      const connection = linked.find((l) => l.workspaceId === id);
      if (connection) return connection.short === ownLink.short;
      id = workspaces.find((w) => w.id === id)?.parentId ?? null;
    }
    return false;
  };

  const project = (th: Thread): JSX.Element => {
    const d = details[th.id];
    const s = stats[th.id] ?? EMPTY_STATS;
    const days = dueInDays(th, now);
    const isPrimary = view?.primaryId === th.id;
    const canBePrimary = ownLink && belongsToFolder(th) && !isPrimary && !th.isPrivate && th.status !== 'done';
    return (
      <li key={th.id} className="border-b border-line/70 py-3 last:border-b-0">
        <div className="flex items-baseline gap-2">
          <span className="flex-none translate-y-[1px]">
            <StatusDot status={th.status} />
          </span>
          <button
            type="button"
            onClick={() => select(th.id)}
            className="group flex min-w-0 items-baseline gap-1 text-left font-serif text-base text-ink hover:text-accent"
            title={t('打开这个项目')}
          >
            <span className="truncate">{th.title.trim() || t('无标题')}</span>
            <ArrowRight size={12} className="flex-none opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
          {th.isPrivate && <PrivateMark />}
          {isPrimary && (
            <span className="flex-none text-[11px] text-accent" title={t('在这个文件夹里工作的 AI 默认写回这个项目')}>
              {t('主项目')}
            </span>
          )}
          {canBePrimary && (
            <button
              type="button"
              onClick={() =>
                void setFolderPrimary(ownLink.workspaceId, th.id)
                  .then(() => reloadAll())
                  .catch((e) => toast.error(folderError(e)))
              }
              className="flex-none text-[11px] text-muted opacity-60 transition-colors hover:text-accent hover:opacity-100"
            >
              {t('设为主项目')}
            </button>
          )}
          <span className="ml-auto flex-none font-mono text-[10px] text-muted">{t('{n} 块', { n: s.blocks })}</span>
          {days !== null && th.status !== 'done' && (
            <span
              className="flex-none font-mono text-[10px]"
              style={{ color: days < 0 ? 'var(--urgent)' : days <= DUE_SOON_DAYS ? 'var(--status-parked)' : 'var(--muted)' }}
            >
              {days < 0 ? t('迟 {n} 天', { n: -days }) : days === 0 ? t('今天到期') : t('还有 {n} 天', { n: days })}
            </span>
          )}
        </div>
        {th.summary && <p className="mt-0.5 pl-5 text-[12px] italic text-muted">{th.summary}</p>}
        {d && (d.lines.length > 0 || d.files.length > 0) && (
          <div className="mt-1.5 grid grid-cols-1 gap-x-6 gap-y-1.5 pl-5 text-[12px] md:grid-cols-2">
            {d.lines.length > 0 && (
              <div className="min-w-0">
                <div className="text-[11px] text-muted">{t('跟进内容')}</div>
                <ul>
                  {d.lines.map((l) => (
                    <li key={l.id} className="flex gap-1.5 leading-relaxed text-ink-2">
                      <span className="flex-none text-muted">·</span>
                      <span className="min-w-0 break-words">{l.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {d.files.length > 0 && (
              <div className="min-w-0">
                <div className="text-[11px] text-muted">{t('项目文件（{n}）', { n: d.files.length })}</div>
                <ul>
                  {d.files.slice(0, 8).map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => void openAttachment(f)}
                        title={f.target}
                        className="flex w-full min-w-0 items-center gap-1.5 text-left text-ink-2 hover:text-accent"
                      >
                        {f.kind === 'folder' ? <Folder size={11} className="flex-none text-muted" /> : <File size={11} className="flex-none text-muted" />}
                        <span className="truncate">{fileLabel(f)}</span>
                      </button>
                    </li>
                  ))}
                  {d.files.length > 8 && <li className="text-[11px] text-muted">{t('还有 {n} 个', { n: d.files.length - 8 })}</li>}
                </ul>
              </div>
            )}
          </div>
        )}
      </li>
    );
  };

  const live = (id: string): Thread[] =>
    (byWorkspace[id] ?? []).filter((th) => th.status !== 'done').sort((a, b) => b.updatedAt - a.updatedAt);
  const done = threads.filter((th) => th.status === 'done').sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const parent = ws.parentId ? workspaces.find((w) => w.id === ws.parentId) : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header
        className="flex flex-none items-baseline justify-between gap-3 border-b border-line px-6 py-6"
        style={{ minHeight: CENTRE_HEADER_HEIGHT }}
      >
        <h2 className="min-w-0 truncate font-serif text-2xl text-ink">{title}</h2>
        <span className="flex-none text-xs text-muted">
          {parent ? t('在「{ws}」里 · ', { ws: parent.title.trim() || t('未命名') }) : ''}
          {t('{n} 个项目', { n: threads.length })}
        </span>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <section className="max-w-3xl">
          <h3 className="mb-2 text-[12px] tracking-wide text-muted">{t('连接的文件夹')}</h3>
          {view === undefined ? null : <FolderPanel workspaceId={workspaceId} title={title} view={view} />}
        </section>

        <section className="max-w-4xl">
          {threads.length === 0 ? (
            <p className="text-sm text-muted">{t('这个工作区里还没有项目。')}</p>
          ) : (
            groups.map((g) => {
              const list = live(g.id);
              if (g.depth > 0 && list.length === 0) return null;
              return (
                <div key={g.id} className={g.depth > 0 ? 'mt-5' : ''}>
                  <h3 className="mb-1 text-[12px] tracking-wide text-muted" style={{ paddingLeft: g.depth * 12 }}>
                    {g.depth === 0 ? t('项目') : g.title}
                  </h3>
                  {list.length === 0 ? (
                    <p className="text-[12px] text-muted">{t('没有进行中的项目。')}</p>
                  ) : (
                    <ul>{list.map(project)}</ul>
                  )}
                </div>
              );
            })
          )}
          {done.length > 0 && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setDoneOpen((o) => !o)}
                className="flex items-center gap-1 text-[12px] tracking-wide text-muted hover:text-ink"
              >
                {doneOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {t('已完成 {n} 个', { n: done.length })}
              </button>
              {doneOpen && (
                <ul className="mt-1">
                  {done.map((th) => (
                    <li key={th.id} className="flex items-baseline gap-2 py-1 opacity-70">
                      <StatusDot status={th.status} />
                      <button type="button" onClick={() => select(th.id)} className="min-w-0 truncate text-left text-sm text-ink hover:text-accent">
                        {th.title.trim() || t('无标题')}
                      </button>
                      {th.completedAt && (
                        <span className="ml-auto flex-none font-mono text-[10px] text-muted">
                          {t('{when} 完成', { when: day(th.completedAt) })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
