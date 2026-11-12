import type { Thread } from '@/lib/db/threads';
import type { WorkspaceNode } from '@/lib/workspaces/tree';

// DISCOVERED-20261112-7 (Ocean 第 338 条): a project that is finished — by its own 「完成」, by the
// weekly review's 「标完成」, or by archiving its workspace — must not stay the capture target, or
// every capture after that lands in a project that is over (the rail even kept saying 「捕捉中」 on
// it in the 归档 section). Capture goes back to 「未分类」, and the user is told.
//
// 「未分类」 has no id of its own: it is the project first launch makes, titled in that launch's
// language, and the user can rename, finish or delete it like any other. So it is found by title,
// either language. If there is none left that is unfinished, a new one is made the way first launch
// does — in the first workspace that is not itself on its way out (archiving it would otherwise be
// undone by the very project made to take its captures). If there is no such workspace either, the
// target stays where it is, as the archive dialog has always said.

export const UNSORTED_TITLES: ReadonlySet<string> = new Set(['未分类', 'Unsorted']);

export interface CaptureHome {
  /** An unfinished 「未分类」 to send capture to. */
  to: Thread | null;
  /** No such project: make one in this workspace. Null when `to` is set, or when there is nowhere. */
  newIn: string | null;
}

const flatten = (roots: WorkspaceNode[]): string[] =>
  roots.flatMap((n) => [n.workspace.id, ...flatten(n.children)]);

export const captureHome = (
  roots: WorkspaceNode[],
  threads: Thread[],
  leaving: { threads: ReadonlySet<string>; workspaces: ReadonlySet<string> },
): CaptureHome => {
  const to =
    threads
      .filter(
        (th) =>
          th.status !== 'done' &&
          !leaving.threads.has(th.id) &&
          !leaving.workspaces.has(th.workspaceId) &&
          UNSORTED_TITLES.has(th.title.trim()),
      )
      .sort((a, b) => a.createdAt - b.createdAt)[0] ?? null;
  if (to) return { to, newIn: null };
  return { to: null, newIn: flatten(roots).find((id) => !leaving.workspaces.has(id)) ?? null };
};
