import type { Thread } from '@/lib/db/threads';
import type { Workspace } from '@/lib/db/workspaces';

// P9V-2 —— 过期检测查整个工作区（Ocean 10-24，HANDOFF §9.2 第 192、196 – 202 条）。
//
// 范围 = 这个项目所在的工作区 + 它下面的子工作区（第 200 条；和归档同一种算法，`lib/workspaces/archive`）。
// ⛔ 已完成的项目不发、不提议（第 199 条，10-16 那条规矩）；⛔ 私密项目照旧一个字不发（P9E），
// 跳过几个要说出来。

/** 第 201 条：一次最多发多少字，超了就不发。两条路各一个（任务书 P9V-2，我定的）。
 *  ⚠️ 按「字」（JS 字符串长度）量，不按 token —— 界面上说的也是字。 */
export const WS_STALE_CAP = { cli: 200_000, api: 120_000 } as const;

/** 这个工作区和它下面所有子工作区的 id。⚠️ 防环：库被手改出一个环也不会转死。 */
export const workspaceSubtree = (workspaces: readonly Workspace[], rootId: string): Set<string> => {
  const ids = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const w of workspaces) {
      if (w.parentId === id && !ids.has(w.id)) {
        ids.add(w.id);
        queue.push(w.id);
      }
    }
  }
  return ids;
};

export interface WsStalePlan {
  workspace: Workspace;
  /** 要发的项目，按建立时间从早到晚（P1、P2……就是这个顺序）。 */
  threads: Thread[];
  /** 没完成、但是私密的 —— 不发，界面说跳过了几个。 */
  skippedPrivate: number;
}

/** 这一次查整个工作区要发哪些项目。工作区不在了 = `null`。 */
export const wsStalePlan = (
  workspaceId: string,
  workspaces: readonly Workspace[],
  threadsByWorkspace: Record<string, readonly Thread[]>,
): WsStalePlan | null => {
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return null;
  const open = [...workspaceSubtree(workspaces, workspaceId)]
    .flatMap((id) => threadsByWorkspace[id] ?? [])
    .filter((th) => th.status !== 'done');
  return {
    workspace,
    threads: open.filter((th) => !th.isPrivate).sort((a, b) => a.createdAt - b.createdAt),
    skippedPrivate: open.filter((th) => th.isPrivate).length,
  };
};

/** 页签上要不要出「查整个工作区」：能发的项目至少两个才有意义（一个的话就是「只查这个项目」）。 */
export const wsStaleAvailable = (plan: WsStalePlan | null): boolean => (plan?.threads.length ?? 0) >= 2;

/** 发出去大约多少字（各项目 pack + 每个项目一行分隔）。和上限比的就是它。 */
export const wsMaterialChars = (packs: readonly { title: string; text: string }[]): number =>
  packs.reduce((n, p) => n + p.text.length + p.title.length + 16, 0);

/** 「约 5.8 万字」里的那个数（中文）/ 「about 58,000 characters」（英文由调用方拼）。 */
export const tenThousands = (chars: number): string => {
  const w = chars / 10_000;
  return w >= 10 ? String(Math.round(w)) : w.toFixed(1).replace(/\.0$/, '');
};

// ---------------------------------------------------------------------------------------
// P9V-4 · 每月自动查一次（第 198 条：比跟进长，选的每月）
// ---------------------------------------------------------------------------------------

/** 第 198 条：30 天一次。 */
export const STALE_AUTO_PERIOD_MS = 30 * 86_400_000;

/** 一个工作区的开关和上次时间（存在 stale.json）。⚠️ 和 compressStore 的 `StaleAuto` 同一个形状。 */
interface AutoState {
  on: boolean;
  lastRunAt: number;
}

/** 这一次该查哪个工作区：开着、离上次满 30 天、此刻能查（`eligible`），挑上次最久的那一个。
 *  ⚠️ 失败、超上限、停下也记了时间（`runStaleScanWorkspace`），所以坏掉的那一条一个月才重试一次，
 *  ⛔ 不会每 10 分钟花一次他的额度（和自动跟进同一个理由）。 */
export const dueStaleAuto = (
  auto: Record<string, AutoState>,
  eligible: (workspaceId: string) => boolean,
  now: number,
): string | null => {
  let best: { id: string; at: number } | null = null;
  for (const [id, a] of Object.entries(auto)) {
    if (!a.on || now - a.lastRunAt < STALE_AUTO_PERIOD_MS || !eligible(id)) continue;
    if (!best || a.lastRunAt < best.at) best = { id, at: a.lastRunAt };
  }
  return best?.id ?? null;
};

/** 下次大约什么时候查。还没查过 = `null`（下一次看的时候就查，最多 10 分钟）。 */
export const staleAutoNextAt = (a: AutoState): number | null =>
  a.lastRunAt > 0 ? a.lastRunAt + STALE_AUTO_PERIOD_MS : null;
