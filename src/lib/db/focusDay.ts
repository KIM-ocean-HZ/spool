import { Store } from '@tauri-apps/plugin-store';
import type { BreakState } from '@/lib/breakReminder';

// 今天专注了多久，跨重启记住（2026-08-27 第二轮，Ocean:「可以做成今天，按天算」）。
//
// ⚠️⚠️ **存在自己的一个文件里，⛔ 不进 spool.db，也 ⛔ 不进 settings.json。** 三个理由：
//
//   1. **它不是库里的内容。** 库是可以导出、搬到另一台电脑上去的（DESIGN_LIBRARY_TRANSFER）。
//      「今天专注了 47 分钟」跟着库搬到新机器上，说的是另一台电脑前的另一段时间 —— 那是假话。
//   2. **它不是设置。** settings.json 存的是「用户选了什么」，而这是一个自己会变的读数；
//      混在一起，下一个人读那个文件时会以为它可以手改。
//   3. **动 schema 是这个库最贵的操作**（记忆 spool-db-wipe-incident）。为一个随时可以丢的
//      数字加一张表、抬一次 user_version，代价和收益完全不成比例。
//
// ⇒ `focus.json`。读不到就当今天从零开始 —— 这个数据的每一种损坏后果都是
// 「今天的数字小了」，⛔ 没有一种是「用户的东西没了」。
//
// ⭐ P9B-2（2026-10-14，Ocean 09-30 第 16 条 C-D1「存每天的专注时间历史」）：从「只存今天」改成
// **每天一个数**。上面三条理由一条没变 —— 每天一个数照样不进库、不进 settings.json、不随库导出。
//   - `today`：原来那三个数，**样子一个字没改**（万一装回旧版，旧版照样读得懂）。
//   - `days`：`{"2026-10-14": 毫秒数, …}`，每次写今天那一条时，同一天的数一起更新；翻篇之后
//     前一天的数就留在里面，当那天的最终数。只留最近 53 周（DAYS_KEPT），更早的写盘时丢掉。
//   第一次读到只有 `today` 的老文件 ⇒ 把那一天接进 `days`（装上这一版那天的分钟数不能丢）。

const FILE = 'focus.json';
const KEY = 'today';
const DAYS_KEY = 'days';

/** 53 周。⚠️ 按天数算，⛔ 不按「第几周」：一个数就说清楚，不用管周从哪天开始。 */
export const DAYS_KEPT = 53 * 7;

/** 每天一个数：`YYYY-MM-DD`（本地时区，和 dayKeyOf 同一个写法）→ 那天专注了多少毫秒。 */
export type FocusDays = Record<string, number>;

/** 落盘的那三个数。⚠️ `activeMs`（这一坐）**不在里面**，那条老理由一个字没变：
 *  重启之后还端出「你已经连续工作了 47 分钟」是在替用户撒谎。 */
export interface FocusDay {
  dayKey: string;
  totalMs: number;
  /** 上一次真的记上时间是什么时候 —— 「跨过午夜算不算新的一天」全靠它，
   *  见 lib/breakReminder.ts 的 shouldRollDay。 */
  lastActiveAt: number;
}

let storePromise: Promise<Store> | null = null;
const getStore = (): Promise<Store> => {
  if (!storePromise) storePromise = Store.load(FILE);
  return storePromise;
};

const isFocusDay = (v: unknown): v is FocusDay => {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.dayKey === 'string' &&
    typeof o.totalMs === 'number' &&
    Number.isFinite(o.totalMs) &&
    o.totalMs >= 0 &&
    typeof o.lastActiveAt === 'number' &&
    Number.isFinite(o.lastActiveAt)
  );
};

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 盘上的 `days` → 干净的一份：形状不对的条目丢掉，整个不是对象就当空的。 */
export const cleanDays = (raw: unknown): FocusDays => {
  const out: FocusDays = {};
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (DAY_KEY_RE.test(k) && typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return out;
};

/** 把今天那一条记进 `days`，再把比今天早 DAYS_KEPT 天以上的丢掉。⚠️ 不改传进来的那一份。 */
export const withDay = (days: FocusDays, day: FocusDay): FocusDays => {
  const next: FocusDays = { ...days, [day.dayKey]: day.totalMs };
  const [y, m, d] = day.dayKey.split('-').map(Number);
  const oldest = new Date(y!, m! - 1, d! - (DAYS_KEPT - 1));
  const cutoff = `${oldest.getFullYear()}-${`${oldest.getMonth() + 1}`.padStart(2, '0')}-${`${oldest.getDate()}`.padStart(2, '0')}`;
  for (const k of Object.keys(next)) if (k < cutoff) delete next[k];
  return next;
};

/** 读进来的两个键 → 今天那一条 + 每天的数。⚠️ 老文件（只有 `today`）在这里把那一天接进 `days`。 */
export const readFocusFile = (rawToday: unknown, rawDays: unknown): { today: FocusDay | null; days: FocusDays } => {
  const today = isFocusDay(rawToday) ? rawToday : null;
  const days = cleanDays(rawDays);
  if (today && days[today.dayKey] === undefined) days[today.dayKey] = today.totalMs;
  return { today, days };
};

/** 读回今天那一条和每天的数。读不到、或者形状不对 → 当空的（今天从零开始，没有历史）。 */
export const loadFocus = async (): Promise<{ today: FocusDay | null; days: FocusDays }> => {
  try {
    const store = await getStore();
    return readFocusFile(await store.get(KEY), await store.get(DAYS_KEY));
  } catch (e) {
    // ⚠️ 读不到不是错误路径的尽头：这个功能整体是「锦上添花」，⛔ 不该让它挡住启动。
    console.warn('[focus] load failed', e);
    return { today: null, days: {} };
  }
};

/** 写回去：今天那一条，和记上了今天的 `days`（返回写进去的那一份，调用方留着下次接着加）。
 *  ⚠️ 调用方负责别每 tick 都写 —— 只在数字真的变了的时候写。 */
export const saveFocus = async (day: FocusDay, days: FocusDays): Promise<FocusDays> => {
  const next = withDay(days, day);
  try {
    const store = await getStore();
    await store.set(KEY, day);
    await store.set(DAYS_KEY, next);
    await store.save();
  } catch (e) {
    console.warn('[focus] save failed', e);
  }
  return next;
};

/** 落盘的那一条 → reducer 的起始状态。⚠️ `lastTickAt` 一定是 null：
 *  重启之后这一坐是新的，⛔ 不许把关机那段时间记成工作。 */
export const restoreBreakState = (day: FocusDay | null): Partial<BreakState> =>
  day === null
    ? {}
    : { totalMs: day.totalMs, dayKey: day.dayKey, lastActiveAt: day.lastActiveAt };
