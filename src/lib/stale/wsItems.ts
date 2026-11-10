import type { RepoDropped, WsDropReason, WsRef, WsStaleScan } from '@/lib/ai/compress';
import { splitPackEntries } from '@/lib/ai/compressBlocks';
import { relationAlreadySettled } from '@/lib/blocks/staleGuards';
import type { Block } from '@/lib/db/blocks';
import type { Thread } from '@/lib/db/threads';
import { retirementLineChars } from '@/lib/pack/assemble';

// P9V-2 —— Rust 过完闸回来的那一批（`P2#3` 这种「第几个项目 · 第几块」）→ 卡片上的那一批（块 id）。
//
// ⚠️ 存块 id 而不是块号：结果要存盘（第 202 条），而块号会变（块挪去别的项目时 `#n` 会重排，
// `moveBlock`）。块号只留着给卡片上显示。
// ⛔ 这里不另判引文 —— 过没过闸是 Rust 说了算（`gate_ws`），这里只是换一种写法。

/** 一块：它在哪个项目、id、块号（显示用）。 */
export interface WsBlockRef {
  threadId: string;
  blockId: string;
  seq: number;
}

export interface WsBlockItem {
  stale: WsBlockRef;
  by: WsBlockRef;
  why: string;
  quoteStale: string;
  quoteNew: string;
  retyped: boolean;
  /** T6：退掉旧块之后打包出来反而更长（旧块比「已被取代」那一行还短）。跑完那一刻量的。 */
  grows: boolean;
}

export interface WsProjectItem {
  threadId: string;
  by: WsBlockRef;
  why: string;
  quoteOld: string;
  quoteNew: string;
  retyped: boolean;
}

/** 没过闸的那一条，名字已经换成项目名（认不出来的编号照抄它的原话）。 */
export interface WsDroppedItem {
  kind: 'block' | 'project';
  /** 块级 = 旧块；项目级 = 那个项目（`seq` 是 null）。认不出来 = null，界面照抄 `oldLabel`。 */
  old: { title: string; seq: number | null } | null;
  by: { title: string; seq: number } | null;
  oldLabel: string;
  byLabel: string;
  why: string;
  quoteOld: string;
  quoteNew: string;
  reason: WsDropReason;
}

/** 送出去的一个项目：P1、P2…… 的顺序就是这个数组的顺序。 */
export interface WsBuilt {
  thread: Thread;
  text: string;
  blocks: Block[];
}

export interface WsItems {
  blocks: WsBlockItem[];
  projectItems: WsProjectItem[];
  dropped: WsDroppedItem[];
  /** 库里已经记着这条关系、于是不拿出来问的（T2，和只查一个项目同一条规矩）。 */
  already: number;
  /** P16-7：带着仓库查的那一次才有。 */
  repo: WsRepoItems | null;
}

/** P16-7（第 286 条）：工作区带着仓库查的那一次多出来的三样，项目编号已经换成项目 / 块的 id。键：`r<i>` / `f<i>` / `s<i>`。 */
export interface WsRepoItems {
  /** 连着的那个工作区：全部处理完推它的同步游标。 */
  workspaceId: string;
  /** 被仓库推翻的块。`from` = 现状文件的路径 / "commits" / "changes"。 */
  blocks: { stale: WsBlockRef; kind: 'corrects' | 'supersedes'; why: string; quoteStale: string; from: string; quoteNew: string; retyped: boolean }[];
  /** 前提没了的跟进行。`by` = 新的一方是一块时那一块；不然 `from` 是仓库里那一份。 */
  followUps: { threadId: string; itemId: string; line: string; standing: boolean; why: string; by: WsBlockRef | null; from: string | null; quoteNew: string }[];
  summaries: { threadId: string; text: string; why: string }[];
  dropped: RepoDropped[];
  /** 已经推过同步游标了。 */
  synced: boolean;
}

/** T6：这一块退掉之后，打包出来反而更长（它比「已被取代」那一行还短）。⚠️ 按发出去的那一份 pack 量。 */
export const growsWhenRetired = (pack: string, block: Block): boolean => {
  const entry = splitPackEntries(pack).find((e) => e.seq === block.seq);
  return !!entry && entry.raw.length <= retirementLineChars(block);
};

export const wsItemsFromScan = (scan: WsStaleScan, built: readonly WsBuilt[]): WsItems => {
  const at = (r: WsRef): { b: WsBuilt; block: Block } | null => {
    const b = built[r.project];
    const block = b?.blocks.find((x) => x.seq === r.seq);
    return b && block ? { b, block } : null;
  };
  const ref = (x: { b: WsBuilt; block: Block }): WsBlockRef => ({
    threadId: x.b.thread.id,
    blockId: x.block.id,
    seq: x.block.seq!,
  });

  const blocks: WsBlockItem[] = [];
  let already = 0;
  for (const p of scan.blocks) {
    const o = at(p.stale);
    const n = at(p.by);
    // 过了闸就一定在 pack 里；对不上只可能是 pack 和块列表不同步 —— ⛔ 不编一张卡出来。
    if (!o || !n) continue;
    if (relationAlreadySettled(o.block, n.block)) {
      already += 1;
      continue;
    }
    blocks.push({
      stale: ref(o),
      by: ref(n),
      why: p.why,
      quoteStale: p.quoteStale,
      quoteNew: p.quoteNew,
      retyped: p.retyped,
      grows: growsWhenRetired(o.b.text, o.block),
    });
  }

  const projectItems: WsProjectItem[] = [];
  for (const p of scan.projects) {
    const th = built[p.project]?.thread;
    const n = at(p.by);
    if (!th || !n) continue;
    projectItems.push({
      threadId: th.id,
      by: ref(n),
      why: p.why,
      quoteOld: p.quoteOld,
      quoteNew: p.quoteNew,
      retyped: p.retyped,
    });
  }

  const title = (i: number | undefined): string | null =>
    i === undefined ? null : (built[i]?.thread.title ?? null);
  const dropped: WsDroppedItem[] = scan.dropped.map((d) => {
    const oldTitle = title(d.old?.project);
    const byTitle = title(d.by?.project);
    return {
      kind: d.kind,
      old: d.old && oldTitle !== null ? { title: oldTitle, seq: d.kind === 'project' ? null : d.old.seq } : null,
      by: d.by && byTitle !== null ? { title: byTitle, seq: d.by.seq } : null,
      oldLabel: d.oldLabel,
      byLabel: d.byLabel,
      why: d.why,
      quoteOld: d.quoteOld,
      quoteNew: d.quoteNew,
      reason: d.reason,
    };
  });

  let repo: WsRepoItems | null = null;
  if (scan.repoWorkspaceId) {
    repo = { workspaceId: scan.repoWorkspaceId, blocks: [], followUps: [], summaries: [], dropped: scan.repoDropped ?? [], synced: false };
    for (const p of scan.repoBlocks ?? []) {
      const o = at(p.stale);
      if (!o) continue;
      repo.blocks.push({ stale: ref(o), kind: p.kind, why: p.why, quoteStale: p.quoteStale, from: p.from, quoteNew: p.quoteNew, retyped: p.retyped });
    }
    for (const l of scan.followUps ?? []) {
      const th = built[l.project]?.thread;
      if (!th) continue;
      const by = l.by ? at(l.by) : null;
      repo.followUps.push({ threadId: th.id, itemId: l.itemId, line: l.line, standing: l.standing, why: l.why, by: by ? ref(by) : null, from: l.from, quoteNew: l.quoteNew });
    }
    for (const x of scan.summaries ?? []) {
      const th = built[x.project]?.thread;
      if (th) repo.summaries.push({ threadId: th.id, text: x.text, why: x.why });
    }
  }

  return { blocks, projectItems, dropped, already, repo };
};

/** P16-7：带着仓库那一次多出来的条目的键。 */
export const wsRepoKeys = (repo: WsRepoItems | null | undefined): string[] =>
  repo ? [...repo.blocks.map((_, i) => `r${i}`), ...repo.followUps.map((_, i) => `f${i}`), ...repo.summaries.map((_, i) => `s${i}`)] : [];
