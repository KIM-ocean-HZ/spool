import type { Thread } from '@/lib/db/threads';
import { captureHome } from '@/lib/threads/captureHome';
import type { Workspace } from '@/lib/db/workspaces';
import type { WorkspaceNode } from './tree';

// 2026-09-30 (Ocean #9) — 「一个工作区内所有项目都完成了，工作区应该进入 archive，不显示在列表
// 里面。右键也可以强制把工作区移入 archive，所有项目随之完成。」 拍板: archived is DERIVED from
// the projects, never stored. Reopening any one project is therefore the whole of 「取消归档」.
//
// The rule: a workspace is archived when its whole subtree (itself and every workspace inside
// it) holds at least one project and every one of them is done. An empty workspace is not —
// it has nothing to be finished with, and a new one would vanish the moment it was made.

/** The workspaces drawn in the rail, and the ones moved out to its 归档 section. */
export interface ArchivedEntry {
  /** Re-stamped from depth 0: in the 归档 section it is drawn as a top-level group. */
  node: WorkspaceNode;
  /** The live workspaces above it, outermost first — empty for a top-level one. Shown as
   *  「上级 / 子工作区」 so a sub-workspace that left its parent still says where it was. */
  ancestors: Workspace[];
}

const subtreeStats = (
  roots: WorkspaceNode[],
  threadsByWorkspace: Record<string, Thread[]>,
): Map<string, { total: number; open: number }> => {
  const stats = new Map<string, { total: number; open: number }>();
  const walk = (n: WorkspaceNode): { total: number; open: number } => {
    const own = threadsByWorkspace[n.workspace.id] ?? [];
    const s = { total: own.length, open: own.filter((th) => th.status !== 'done').length };
    for (const c of n.children) {
      const cs = walk(c);
      s.total += cs.total;
      s.open += cs.open;
    }
    stats.set(n.workspace.id, s);
    return s;
  };
  roots.forEach(walk);
  return stats;
};

// ⚠️ tree.ts's rule holds here too: NOTHING FALLS OUT. Every workspace in `roots` ends up in
// exactly one of the two halves. An archived workspace leaves with its whole subtree — which
// is also what carries an empty sub-workspace along with an archived parent: by the rule it
// is not archived itself, but the group it was drawn inside has left the tree.
export const splitArchived = (
  roots: WorkspaceNode[],
  threadsByWorkspace: Record<string, Thread[]>,
): { live: WorkspaceNode[]; archived: ArchivedEntry[] } => {
  const stats = subtreeStats(roots, threadsByWorkspace);
  const archived: ArchivedEntry[] = [];
  const restamp = (n: WorkspaceNode, depth: number): WorkspaceNode => ({
    ...n,
    depth,
    children: n.children.map((c) => restamp(c, depth + 1)),
  });
  const walk = (n: WorkspaceNode, ancestors: Workspace[]): WorkspaceNode | null => {
    const s = stats.get(n.workspace.id)!;
    if (s.total > 0 && s.open === 0) {
      archived.push({ node: restamp(n, 0), ancestors });
      return null;
    }
    const inside = [...ancestors, n.workspace];
    return {
      ...n,
      children: n.children
        .map((c) => walk(c, inside))
        .filter((c): c is WorkspaceNode => c !== null),
    };
  };
  const live = roots.map((r) => walk(r, [])).filter((r): r is WorkspaceNode => r !== null);
  return { live, archived };
};

const findNode = (roots: WorkspaceNode[], id: string): WorkspaceNode | null => {
  for (const n of roots) {
    if (n.workspace.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
};

/** Every workspace that counts as archived — the ones `splitArchived` moves out, with all inside them.
 *  Pass the threads as they will be after a change (finished ones marked done) to ask what that change
 *  archives. DISCOVERED-20261112-7: a new 「未分类」 must not be made in one of these — an unfinished
 *  project there would quietly take the workspace back out of 归档. */
export const archivedWorkspaceIds = (roots: WorkspaceNode[], threads: Thread[]): Set<string> => {
  const byWs: Record<string, Thread[]> = {};
  for (const th of threads) (byWs[th.workspaceId] ??= []).push(th);
  const ids = new Set<string>();
  const walk = (n: WorkspaceNode): void => {
    ids.add(n.workspace.id);
    n.children.forEach(walk);
  };
  splitArchived(roots, byWs).archived.forEach((e) => walk(e.node));
  return ids;
};

/** The workspace `id` and every workspace drawn inside it. */
export const subtreeWorkspaceIds = (roots: WorkspaceNode[], id: string): Set<string> => {
  const ids = new Set<string>();
  const walk = (n: WorkspaceNode): void => {
    ids.add(n.workspace.id);
    n.children.forEach(walk);
  };
  const node = findNode(roots, id);
  if (node) walk(node);
  return ids;
};

export interface ArchivePlan {
  /** The projects 「归档」 marks done: the unfinished ones in the subtree, and only those. */
  toComplete: Thread[];
  /** Set when the capture target sits in the subtree — after archiving it would point at a
   *  finished project. */
  captureFrom: Thread | null;
  /** Where the capture target moves: the unfinished 「未分类」 outside the subtree
   *  (DISCOVERED-20261112-7, Ocean 第 338 条 — the same place a single 「完成」 sends it;
   *  lib/threads/captureHome). Until v0.8.1 it was the most recently updated unfinished project. */
  captureTo: Thread | null;
  /** No 「未分类」 left outside: a new one is made in this workspace. Null when `captureTo` is set —
   *  and when there is no workspace outside the subtree at all, in which case the target stays
   *  where it is (the confirmation says so). */
  captureNewIn: string | null;
}

// The right-click 「归档」, worked out before anything is written — the confirmation reads
// this to say how many projects it will finish and where capture goes, and the store runs
// the same plan, so the two cannot disagree.
export const archivePlan = (roots: WorkspaceNode[], threads: Thread[], id: string): ArchivePlan => {
  const ids = subtreeWorkspaceIds(roots, id);
  const toComplete = threads.filter((th) => ids.has(th.workspaceId) && th.status !== 'done');
  const target = threads.find((th) => th.isCaptureTarget) ?? null;
  if (!target || !ids.has(target.workspaceId)) {
    return { toComplete, captureFrom: null, captureTo: null, captureNewIn: null };
  }
  const done = new Set(toComplete.map((th) => th.id));
  const after = threads.map((th) => (done.has(th.id) ? { ...th, status: 'done' as const } : th));
  const home = captureHome(roots, threads, {
    threads: done,
    // The subtree being archived, and any workspace already in 归档.
    workspaces: new Set([...ids, ...archivedWorkspaceIds(roots, after)]),
  });
  return { toComplete, captureFrom: target, captureTo: home.to, captureNewIn: home.newIn };
};
