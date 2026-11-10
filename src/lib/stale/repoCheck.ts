import type { RepoBlock, RepoCheckScan, RepoLine } from '@/lib/ai/compress';
import { wouldOverwriteRelation } from '@/lib/blocks/staleGuards';
import { createBlock, replaceBlock, setBlockSupersession, setCorrectedQuote, type Block } from '@/lib/db/blocks';
import { setThreadAiSummary } from '@/lib/db/threads';
import { closeSuggestedLine } from '@/lib/engine/followUpReviewActions';
import { markFolderSynced } from '@/lib/folders/api';
import { t } from '@/lib/i18n';

// P16-4 —— 对照仓库的结果，用户在过期检测页上点了之后做的事（P9Y 任务书 §3.6 d；Ocean 11-09 第 267、275、276 条）。
// Rust 已经过了逐字闸（api_engine.rs `gate_repo_check`）：两句原话都对得上。这里只照用户的选择写库：
//
//   * 被推翻的块：「更正一处」（新的一方标成更正了旧块，旧块一个字不动）/「整条取代」（旧块退役、记住被谁取代）/「不动」。
//     新的一方是项目里另一块时就用那一块；是仓库里的一份（现状文件、提交标题、改动列表）时，先把那句原话存成一块
//     新块 —— 来源写「仓库 · <那一份>」，在 pack 里读作 📖 来源材料 —— 再连上关系。这一步就是
//     DISCOVERED-20261025-2「现状文件当不了新的一方」的修法。
//   * 前提没了的跟进行：「关掉」（和跟进结果卡同一个动作，⌘Z 能撤回）/「留着」。
//   * 对不上的 AI 摘要：「换成这句」（仍记作 AI 写的，以后 AI 还能再改）/「不用」。用户自己写的摘要 Rust 就没提。
//
// 全部处理完（包括一条都没有的那一次）算「对过了」：推这个工作区的同步游标（P9Y：「以后『对照仓库』的结果处理完
// 也算」）。

export type RepoAction = 'merge' | 'retire' | 'keep' | 'close' | 'apply';

/** 一次对照仓库的结果和用户已经点过的几条。键：`b<下标>` 块、`f<下标>` 跟进行、`s` 摘要。 */
export interface RepoCheckSession {
  scan: RepoCheckScan;
  /** 跑那一刻这个项目的块 —— 块号换块 id。 */
  blocks: Block[];
  decided: Record<string, RepoAction>;
  startedAt: number;
  /** 已经推过同步游标了。 */
  synced: boolean;
}

/** 这一次结果里所有要用户定的条目的键。 */
export const repoKeys = (scan: RepoCheckScan): string[] => [
  ...scan.blocks.map((_, i) => `b${i}`),
  ...scan.followUps.map((_, i) => `f${i}`),
  ...(scan.summary ? ['s'] : []),
];

export const repoAllDecided = (s: RepoCheckSession): boolean => repoKeys(s.scan).every((k) => k in s.decided);

/** 新的一方那一块：项目里另一块，或者现在存一块仓库里的原话。
 *  P16-4 验收（11-10 Ocean「来源全部都是：仓库 · 提交标题，没看懂什么意思，写的清楚一点」）：来源和开头那句都说出是哪个
 *  文件夹、是它的哪一样（提交记录 / 改动的文件 / 哪一份文件）。`folder` = 连着的文件夹的名字。 */
const newerBlockFor = async (
  threadId: string,
  item: RepoBlock,
  bySeq: Map<number, Block>,
  folder: string | null,
): Promise<Block | null> => {
  const m = /^#\s*(\d+)$/.exec(item.from.trim());
  if (m) return bySeq.get(Number(m[1])) ?? null;
  const name = item.from === 'commits' ? t('提交记录') : item.from === 'changes' ? t('改动的文件') : item.from;
  const where = folder || t('连着的文件夹');
  const quote = item.quoteNew;
  return createBlock({
    threadId,
    content:
      item.from === 'commits'
        ? t('「{folder}」最近的一笔提交，说明写着：\n\n{quote}', { folder: where, quote })
        : item.from === 'changes'
          ? t('「{folder}」上次对过之后改动的文件：\n\n{quote}', { folder: where, quote })
          : t('「{folder}」里的 {name} 现在写着：\n\n{quote}', { folder: where, name, quote }),
    annotation: item.why || null,
    source: folder ? t('{folder} 仓库 · {name}', { folder, name }) : t('仓库 · {name}', { name }),
  });
};

/** 一块被推翻的块上的「更正一处」/「整条取代」。返回 false = 做不了（块不在了 / 关系会被覆盖），已经说过为什么。 */
export const decideRepoBlock = async (
  threadId: string,
  item: RepoBlock,
  action: 'merge' | 'retire',
  blocks: Block[],
  say: (msg: string) => void,
  now = Date.now(),
  folder: string | null = null,
): Promise<boolean> => {
  const bySeq = new Map<number, Block>();
  for (const b of blocks) if (b.seq !== null) bySeq.set(b.seq, b);
  const older = bySeq.get(item.staleSeq);
  if (!older) {
    say(t('第 {n} 块已经不在了，这一条做不了。', { n: item.staleSeq }));
    return false;
  }
  const fromBlock = /^#\s*\d+$/.test(item.from.trim());
  let newer: Block | null;
  if (fromBlock) {
    newer = await newerBlockFor(threadId, item, bySeq, folder);
    if (!newer) {
      say(t('{from} 那一块已经不在了，这一条做不了。', { from: item.from }));
      return false;
    }
    if (action === 'merge' && wouldOverwriteRelation(older, newer)) {
      say(t('第 {n} 块已经指着另一块了，一块只记得住一条这样的关系。要改的话先在那一块上撤掉原来那条。', { n: newer.seq ?? 0 }));
      return false;
    }
  } else {
    // Only now, once the user has chosen: the repository's sentence becomes a block of the project.
    newer = await newerBlockFor(threadId, item, bySeq, folder);
    if (!newer) return false;
  }
  if (action === 'merge') {
    await setBlockSupersession(newer.id, older.id, 'corrects', now);
    await setCorrectedQuote(newer.id, item.quoteStale);
  } else {
    await replaceBlock(older.id, newer.id, now);
  }
  return true;
};

export const decideRepoLine = (threadId: string, title: string, item: RepoLine): Promise<void> =>
  closeSuggestedLine(threadId, title, { kind: 'line', itemId: item.itemId, line: item.line, verdict: 'suggest_close', why: item.why });

export const applyRepoSummary = (threadId: string, text: string): Promise<void> => setThreadAiSummary(threadId, text);

/** 「对过了」。 */
export const markRepoChecked = (workspaceId: string): Promise<void> => markFolderSynced(workspaceId);
