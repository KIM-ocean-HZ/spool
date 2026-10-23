import type { IncomingRef, RefKind } from '@/lib/db/blocks';

/** F2 §3.2 —— 「来龙去脉」这一屏的纯逻辑。⛔ 不碰库、不碰 React，就为了这几条判断有缝可测。
 *
 *  ⚠️⚠️ 这个文件存在的理由和 `staleGuards.ts` 逐字同一条：那两道闸原来是 `compressStore`
 *  里的局部闭包，**没有任何导出的入口调得到**，于是一个单元测试都没有，
 *  而抄出来一量就发现它们认错了维度。⛔ 别再把这几条判断写回组件里。 */

/** 一条边的对方**现在是什么状态** —— §3.2 ① 要求入向边也标，⛔ 不只出向。
 *
 *  `'missing'` 只有出向边说得出来（指着的行没了）；入向边按定义那一行还在。 */
export type RefPartyState = 'live' | 'stale' | 'missing';

export const partyState = (party: { staleAt: number | null } | null | undefined): RefPartyState =>
  party == null ? 'missing' : party.staleAt !== null ? 'stale' : 'live';

/** 一条**指进来**的关系怎么念 —— §3.2 ① 的「人话名称」，从**被引这一头**看。
 *
 *  ⚠️ 和 `CitationLine` 那三个词是**方向相反的同一组事**，⛔ 不是重复：
 *  那边站在引用方说「我引用了 / 我整条取代了 / 我更正了其中一处」，
 *  这边站在被引方说「谁引用了我 / 谁把我整条取代了 / 谁更正了我这里的一处」。
 *  ⛔ 别把两组合并成一组 —— 合并的结果是有一头把话说反。
 *
 *  返回的是 i18n 的**中文键**，由调用方过 `t()`（这个文件不进 React）。 */
export const incomingVerbKey = (kind: RefKind | null): string =>
  kind === 'supersedes' ? '整条取代了这一块' : kind === 'corrects' ? '更正了这里的一处' : '引用了这一块';

/** 「为什么引它」那一句，按 §3.2 ① 的梯子取。
 *
 *  ⛔ 没有理由的时候**必须明确说出来**（施工单原话：「没有就明确写『未记录为什么引用』」），
 *  ⛔ 不是留白 —— 真库 58 条边 `ref_note` 全库 0 条，留白的话整屏没有一个字解释任何一条边，
 *  而用户读不出「是没人写」还是「界面没显示」。
 *
 *  ⚠️ 主语不一样，所以要分得出来：`refNote` 是引用方说「我为什么指过去」，
 *  `gist` / 批注是引用方那一块说「我是什么」。⛔ 同一个位置画成一个样子，读的人会认错。
 *  （`CitationLine` 用 `∵` 记号解决同一件事，这里返回 `isWhy` 让调用方照做。） */
export const incomingReason = (
  edge: Pick<IncomingRef, 'refNote' | 'gist' | 'annotation'>,
): { text: string; isWhy: boolean } | null => {
  const why = edge.refNote?.trim();
  if (why) return { text: why, isWhy: true };
  const about = edge.gist?.trim() || edge.annotation?.trim();
  return about ? { text: about, isWhy: false } : null;
};
