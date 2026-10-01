import type { Workspace } from '@/lib/db/workspaces';

// 2026-09-30 (Ocean #10) — 沉睡 is gone; the rail keeps itself short by folding workspaces
// instead: 「默认折叠工作区，只展示最近打开的工作区项目（类似 vscode 的逻辑）」.
//
// Two sources decide whether a group is drawn open, and only one of them is stored:
//   - the groups the user opened by hand — `expandedWorkspaceIds` in settings.json;
//   - the workspace of the project open right now, and every workspace above it — derived,
//     never stored, so it follows the project and a restart shows only that one again.

/** The workspace `id` and every workspace above it, innermost first. */
export const workspaceChain = (workspaces: Workspace[], id: string | null): string[] => {
  const byId = new Map(workspaces.map((w) => [w.id, w]));
  const chain: string[] = [];
  let cur = id === null ? undefined : byId.get(id);
  // ⚠️ `includes` is the ring guard: tree.ts draws a ring as top-level rows, and a walk up
  // one must stop rather than spin.
  while (cur && !chain.includes(cur.id)) {
    chain.push(cur.id);
    cur = cur.parentId === null ? undefined : byId.get(cur.parentId);
  }
  return chain;
};

/** The stored list after the user opens (`open`) or closes `ids`. Ids the library no longer
 *  has are dropped on the way — a deleted workspace must not linger in settings.json. */
export const nextExpandedIds = (
  stored: readonly string[],
  workspaces: Workspace[],
  ids: readonly string[],
  open: boolean,
): string[] => {
  const exists = new Set(workspaces.map((w) => w.id));
  const kept = stored.filter((id) => exists.has(id) && !ids.includes(id));
  return open ? [...kept, ...ids.filter((id) => exists.has(id))] : kept;
};
