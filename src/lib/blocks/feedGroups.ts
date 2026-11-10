import type { Block } from '@/lib/db/blocks';

// P16-8（Ocean 11-10 #14 →第 289 条）：时间线上一次写进来的更正 / 跟进块合成一行。只改画法 ——
// 库、pack、给 AI 的读法一概不动，每一块照旧在自己的位置、按块号找得到（旧第 125 条）。
//
//   * 更正块（`refKind = 'corrects'`，被更正的那块在这个项目里）画成一行，点开才是整张卡；
//   * 挨着的、同一批写进来的（同一种、前后相隔不超过 10 分钟、同一天）两块以上，再合成一行。
//   * 置顶的块照旧整张卡，也不进组 —— 用户亲手标了「这块要紧」。
// ⛔ 别按「是不是更正」把块从时间线上拿走（08-19 那版就是这样丢了〈Memo产品复活〉#20，见 BlockFeed 顶上那段）。

const isSameDay = (a: number, b: number): boolean => new Date(a).toDateString() === new Date(b).toDateString();

/** 同一批：前后两块相隔不超过这么久。一次过期检测 / 对照仓库 / 跟进的点击都在几分钟之内。 */
export const BATCH_GAP_MS = 10 * 60 * 1000;

export type Batch = 'correction' | 'follow-up';

export type FeedRow =
  | { kind: 'block'; block: Block; compact: boolean }
  | { kind: 'group'; batch: Batch; blocks: Block[]; key: string };

/** 跟进批进来的块的来源：「Codex · 跟进 · MCP」/「Codex · Follow-up · MCP」。 */
const FOLLOW_UP_SOURCE = /·\s*(跟进|Follow-up)\s*·\s*MCP$/i;

/** 这一块算哪一批；不算任何一批 = null。`ids` = 这个项目里所有块的 id。 */
export const batchOf = (b: Block, ids: ReadonlySet<string>): Batch | null => {
  if (b.pinned) return null;
  if (b.refKind === 'corrects' && b.refBlockId && ids.has(b.refBlockId)) return 'correction';
  if (b.source && FOLLOW_UP_SOURCE.test(b.source.trim())) return 'follow-up';
  return null;
};

/** `shown` = 这次画出来的块（按时间排好），`all` = 这个项目所有的块（找被更正的那块用）。 */
export const feedRows = (shown: readonly Block[], all: readonly Block[]): FeedRow[] => {
  const ids = new Set(all.map((b) => b.id));
  const rows: FeedRow[] = [];
  let run: Block[] = [];
  let runBatch: Batch | null = null;
  const flush = (): void => {
    if (run.length >= 2 && runBatch) {
      rows.push({ kind: 'group', batch: runBatch, blocks: run, key: run[0]!.id });
    } else {
      for (const b of run) rows.push({ kind: 'block', block: b, compact: runBatch === 'correction' });
    }
    run = [];
    runBatch = null;
  };
  for (const b of shown) {
    const batch = batchOf(b, ids);
    const prev = run[run.length - 1];
    const joins =
      batch !== null &&
      batch === runBatch &&
      prev !== undefined &&
      b.createdAt - prev.createdAt <= BATCH_GAP_MS &&
      isSameDay(prev.createdAt, b.createdAt);
    if (!joins) flush();
    if (batch === null) {
      rows.push({ kind: 'block', block: b, compact: false });
      continue;
    }
    runBatch = batch;
    run.push(b);
  }
  flush();
  return rows;
};

/** 这一块在哪一组里（跳到它时要先展开那一组）；不在组里 = null。 */
export const groupKeyOf = (rows: readonly FeedRow[], blockId: string): string | null => {
  for (const r of rows) if (r.kind === 'group' && r.blocks.some((b) => b.id === blockId)) return r.key;
  return null;
};
