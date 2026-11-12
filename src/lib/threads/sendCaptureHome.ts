import { createThread } from '@/lib/db/threads';
import { t } from '@/lib/i18n';
import { archivedWorkspaceIds } from '@/lib/workspaces/archive';
import { buildWorkspaceTree } from '@/lib/workspaces/tree';
import { selectAllThreadsFlat, useThreadsStore } from '@/stores/threadsStore';
import { toast } from '@/stores/toastStore';
import { useWorkspacesStore } from '@/stores/workspacesStore';
import { captureHome } from './captureHome';

/** After `finished` were marked done (see captureHome.ts): if one of them is the capture target,
 *  capture goes to 「未分类」 — found, or made as on first launch — and a notice says so.
 *  Returns the move for an undo entry, or null when nothing moved. */
export const sendCaptureHome = async (
  finished: string[],
): Promise<{ from: string; to: string } | null> => {
  const threads = selectAllThreadsFlat(useThreadsStore.getState());
  const target = threads.find((th) => th.isCaptureTarget);
  if (!target || !finished.includes(target.id)) return null;
  const roots = buildWorkspaceTree(useWorkspacesStore.getState().workspaces);
  const after = threads.map((th) => (finished.includes(th.id) ? { ...th, status: 'done' as const } : th));
  const home = captureHome(roots, threads, {
    threads: new Set(finished),
    // Finishing the last open project of a workspace puts it in 归档 — a new 「未分类」 must not land there.
    workspaces: archivedWorkspaceIds(roots, after),
  });
  // Every workspace is in 归档 after this (the user finished their last open project): the first one
  // takes the new 「未分类」 all the same and so stays out of 归档 — the user asked to finish a project,
  // not to archive anything, and captures landing in a finished project is the bug this exists for.
  // (A right-click 归档 is different: there the target stays, and the confirmation says so.)
  const newIn = home.newIn ?? (home.to ? null : (roots[0]?.workspace.id ?? null));
  // ⚠️ createThread straight from the db layer: the store's `create` also opens the new project,
  // and finishing one project must not throw the user into another.
  const to = home.to ?? (newIn ? await createThread(newIn, t('未分类')) : null);
  if (!to) return null;
  await useThreadsStore.getState().setCaptureTarget(to.id);
  if (!home.to) await useThreadsStore.getState().loadAll();
  toast.notice(
    t('〈{from}〉已经完成，捕捉目标改回了〈{to}〉。', {
      from: target.title.trim() || t('无标题'),
      to: to.title.trim() || t('无标题'),
    }),
  );
  return { from: target.id, to: to.id };
};
