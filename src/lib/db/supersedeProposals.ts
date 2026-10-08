// AI 的「整条取代 / 更正」建议，读出来给待审面用（P7-5，Ocean 2026-10-07）。
//
// ⛔⛔ **三条护栏一条不松**（都是 E3 那次定的）：
//  ① **只能提案，永不直接写。** 这张表里的行不改任何块，用户在待审里点了才有事发生。
//     P7-4 起 `add_block` 带 `corrects` / `supersedes` 也只往这里排一行（块照常存）。
//  ② **引文逐字闸照走**（MCP 那一侧写入前就过了：`propose_supersede` 走
//     `api_engine.rs::quote_passes`，`add_block` 走它一直用的 `check_quote_occurs`）。
//     ⚠️ 闸的输入**一个字符都不许动，首尾空白也算** —— 顺手 `.trim()` 就把闸放宽了，
//     而且放宽之后测试照样绿。
//  ③ ⛔ **不做 confidence 过滤** —— 实测最离谱那条自标 `high`，所以这张表里根本没有
//     那一列可存。
//
// ⛔ 08-24 S2「AI 提的并进过期检测那张卡」**作废**（Ocean 2026-10-07：「过期检测只适用于用户自主
// 检测」）。AI 提的在**待审**里，和别的 AI 提议一起；过期检测页签只放用户自己点「查过期」跑出来的。

import { getDb } from './client';

/** AI 建议的是哪一种。⚠️ 只是建议 —— 卡片上三个按钮都能点。 */
export type SuggestedKind = 'supersedes' | 'corrects';

/** 库里那一行，两块的 id 和此刻的编号都带着。 */
export interface SupersedeProposal {
  id: string;
  /** 旧块所在的项目（更正可以跨项目指，新块可能在别处）。 */
  threadId: string;
  staleBlockId: string;
  byBlockId: string;
  /** 谁提的。空串 = 没报名字。 */
  client: string;
  /** 它说为什么。`add_block` 带「更正」时可以是空串（更正正文本身就在说）。 */
  why: string;
  /** 旧块里不再成立的那一句，⚠️ 过了闸、原样存的。 */
  quoteStale: string;
  /** 新块里的那一句。`add_block` 来的是空串：新块本身就是要说的话。 */
  quoteNew: string;
  /** 两句引文里至少有一句是「只差标点的重打」。 */
  retyped: boolean;
  /** v32。NULL（v32 以前的行）读作 'supersedes'。 */
  suggestedKind: SuggestedKind;
  createdAt: number;
  expiresAt: number;
}

interface Row {
  id: string;
  thread_id: string;
  stale_block_id: string;
  by_block_id: string;
  client: string;
  why: string;
  quote_stale: string;
  quote_new: string;
  retyped: number;
  suggested_kind: string | null;
  created_at: number;
  expires_at: number;
}

/** 还没过期、两块都还在、两块所在的项目都没删的那几条，所有项目一起。
 *
 *  ⚠️ 两块里少一块，这一条就不出现（INNER JOIN）—— 块被删了，行理应跟着走，
 *  但这个连接不开 `PRAGMA foreign_keys`，级联不会发生；指不着块的提议在卡片上画不出来。
 *  ⚠️ 「已经做完了」的那几条（用户在别处已经取代 / 更正过）由调用方按块判断再摘掉
 *  （`staleGuards.ts::supersedeProposalSettled`），这里只管「还画得出来」。 */
export const listPendingSupersedeProposals = async (now: number): Promise<SupersedeProposal[]> => {
  const db = await getDb();
  const rows = await db.select<Row[]>(
    `SELECT sp.*
       FROM supersede_proposals sp
       JOIN blocks s ON s.id = sp.stale_block_id
       JOIN blocks n ON n.id = sp.by_block_id
       JOIN threads ts ON ts.id = s.thread_id AND ts.deleted_at IS NULL
       JOIN threads tn ON tn.id = n.thread_id AND tn.deleted_at IS NULL
      WHERE sp.expires_at > $1
      ORDER BY sp.created_at ASC`,
    [now],
  );
  return rows.map((r) => ({
    id: r.id,
    threadId: r.thread_id,
    staleBlockId: r.stale_block_id,
    byBlockId: r.by_block_id,
    client: r.client,
    why: r.why,
    quoteStale: r.quote_stale,
    quoteNew: r.quote_new,
    retyped: r.retyped !== 0,
    suggestedKind: r.suggested_kind === 'corrects' ? 'corrects' : 'supersedes',
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }));
};

/** 用户下过决定了 —— 这一行的活干完了，删掉。
 *
 *  ⚠️ 三个动作**都**走这里，「不动」也是：「不动」是一个决定，不是「没决定」（留着下次又问）。
 *  ⛔ 不留拒绝日志 —— 和 `proposals` 同一条理由（§4.3：拒绝日志会把队列变成垃圾堆）。 */
export const deleteSupersedeProposal = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.execute('DELETE FROM supersede_proposals WHERE id = $1', [id]);
};

/** 过期的清掉。⚠️ 和提案批次同一个 7 天，同一个「时间到了等于拒绝」。 */
export const purgeExpiredSupersedeProposals = async (now: number): Promise<void> => {
  const db = await getDb();
  await db.execute('DELETE FROM supersede_proposals WHERE expires_at <= $1', [now]);
};
