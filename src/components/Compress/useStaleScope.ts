import { useMemo } from 'react';
import { wsStaleAvailable, wsStalePlan, type WsStalePlan } from '@/lib/stale/workspace';
import { useCompressStore, type StaleScope } from '@/stores/compressStore';
import { useThreadsStore } from '@/stores/threadsStore';
import { useWorkspacesStore } from '@/stores/workspacesStore';

/** P9V-2（第 200 条）：这个项目的过期检测页签现在查哪一种范围。
 *
 *  默认 = 能查整个工作区（没完成、不私密的项目至少两个）就查整个工作区；他点过「只查这个项目」就记住。
 *  ⚠️ 页签上的数和「（在跑）」也照它算 —— 页签条和页签里那一页必须说同一件事。 */
export const useStaleScope = (
  threadId: string | null,
): {
  scope: StaleScope;
  available: boolean;
  workspaceId: string | null;
  plan: WsStalePlan | null;
} => {
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const threadsByWorkspace = useThreadsStore((s) => s.threadsByWorkspace);
  const chosen = useCompressStore((s) => (threadId ? s.staleScope[threadId] : undefined));
  const workspaceId = useMemo(() => {
    if (!threadId) return null;
    for (const [wsId, list] of Object.entries(threadsByWorkspace)) {
      if (list.some((th) => th.id === threadId)) return wsId;
    }
    return null;
  }, [threadId, threadsByWorkspace]);
  const plan = useMemo(
    () => (workspaceId ? wsStalePlan(workspaceId, workspaces, threadsByWorkspace) : null),
    [workspaceId, workspaces, threadsByWorkspace],
  );
  const available = wsStaleAvailable(plan);
  const scope: StaleScope = available ? (chosen ?? 'workspace') : 'project';
  return { scope, available, workspaceId, plan };
};
