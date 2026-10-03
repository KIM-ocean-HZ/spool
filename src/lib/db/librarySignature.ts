import { getDb } from './client';

// P4-2：「库有没有被别处动过」的记号。
//
// 窗口看得见的时候隔几秒查一次它，变了才重读（`stores/outsideWrites.ts`）。所以它必须便宜：
// **一条查询**，每张表只问「几行」和「最新那一行的时间」，走的都是覆盖索引或者只有几行的小表 ——
// 2026-10-03 那份真库副本（63 个项目 / 1014 块）上一次 0.02 毫秒。
//
// 盯哪几张：重读会读、外面（`spool --mcp`）又能往里写的那几样 —— 项目、块、四种待审。
// ⚠️ 行数和时间**两样都要**：只看时间漏「删了一行」（过期清掉的待审）；只看行数漏「删一行又加
// 一行」。⛔ 也别拿 rowid 代替时间 —— 删掉最后一行之后，下一行会拿到同一个 rowid。
//
// ⛔ 别换成 `PRAGMA data_version`：它是**按连接**算的，而 tauri-plugin-sql 底下是 sqlx 的连接池
// （`Pool::connect`，默认最多 10 条连接），两次查询落不落在同一条连接上没法保证，两个数不能比。
const WATCHED: readonly (readonly [table: string, time: string])[] = [
  ['threads', 'updated_at'],
  ['blocks', 'created_at'],
  ['proposal_batches', 'created_at'],
  ['file_access_requests', 'created_at'],
  ['follow_up_items', 'created_at'],
  ['supersede_proposals', 'created_at'],
];

const SQL =
  'SELECT ' +
  WATCHED.map(([table, time]) => `(SELECT COUNT(*) || '.' || IFNULL(MAX(${time}), 0) FROM ${table})`).join(
    " || '|' || ",
  ) +
  ' AS sig';

export const librarySignature = async (): Promise<string> => {
  const db = await getDb();
  const rows = await db.select<{ sig: string }[]>(SQL);
  return rows[0]?.sig ?? '';
};
