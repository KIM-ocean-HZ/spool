import type { Block } from '@/lib/db/blocks';

/** 查过期那条路上的两道闸。
 *
 *  ⚠️⚠️ **拆出来是因为它们原来没有缝可测。** 两条判断本来写在
 *  `compressStore.ts` 的 `runStale` / `decideStale` 里，是局部闭包 ——
 *  没有任何导出的入口调得到，于是 T2 这两道闸**一个单元测试都没有**，
 *  2026-08-24 第六轮实测只能把条件抄出来才量得到它们（§8.2）。
 *
 *  ⛔⛔ **而抄出来那一量就发现它们认错了维度**（这个文件存在的真正理由）：
 *
 *  一块的「关系」在库里是**两个字段**：`refBlockId`（指着谁）和 `refKind`（什么关系）。
 *  而 `cites`（引用）这一种存的是 **`refBlockId` 有值 + `refKind` 是 `null`**。
 *  两道闸原来写的都是 `refKind !== null`，于是**整个 `cites` 那一类从两道闸底下漏过去**：
 *
 *  - 扫描时摘不走它 → 用户被问一件已经有关系的事；
 *  - 点「只退旧的」时拒绝不触发 → `setBlockSupersession` 覆盖式写入，
 *    **把那条 `cites` 悄悄改写掉，界面不报任何错**。
 *
 *  ⚠️ 实测的数：真库里 `refKind='corrects'` 的块只有 **4** 个，
 *  而 `refBlockId` 有值、`refKind` 是 `null` 的有 **20** 个 —— T2 堵住了 4 个，敞着 20 个。
 *  而第六轮阶段 3 那 30 次里，模型提的 6 条**有 4 条**正好落在这个口子上
 *  （UCLA `#10` 指着「申请帮助 `#12`」）。
 *
 *  ⭐ 所以判断的依据是 **`refBlockId`**：**这块已经指着谁了没有**，
 *  ⛔ 而不是「它指的是哪一种关系」。 */

/** 这条提议说的关系，**库里已经记着了** —— 于是根本不该拿出来问。
 *
 *  「已经记着」= 新块**正指着**旧块。⚠️ 哪一种关系都算：
 *  `corrects` 是他选的「旧块留着」、`supersedes` 是他选的「退掉」、
 *  `cites` 是他自己连的引用 —— **三种都是已经决定过的事**。 */
export const relationAlreadySettled = (
  older: Block | undefined,
  newer: Block | undefined,
): boolean => {
  if (!older || !newer) return false;
  return newer.refBlockId !== null && newer.refBlockId === older.id;
};

/** 写下去会**冲掉**新块上已有的那条关系 —— 于是这一下必须拒绝。
 *
 *  ⚠️ 一块只存得下一条这样的关系（`setBlockSupersession` 是覆盖式写入）。
 *  新块要是已经指着**别的**块，写下去等于把那条悄悄删了。
 *  ⭐ 指着**同一块**的那种在扫描时就被 `relationAlreadySettled` 摘走了，
 *  走到这里的只剩「指着别处」。 */
export const wouldOverwriteRelation = (
  older: Block | undefined,
  newer: Block | undefined,
): boolean => {
  if (!newer) return false;
  return newer.refBlockId !== null && newer.refBlockId !== older?.id;
};

/** MCP 提的那条「整条取代」，**库里已经做完了** —— 于是不该再问一遍。
 *
 *  ⛔⛔ 2026-08-29 第一版：这道闸原来直接用 `relationAlreadySettled`，而那把尺子问的是
 *  「这两块之间**有没有**关系」，⛔ **不是**「这条提案要的那件事做完没有」。
 *  真库里两条 MCP 提案就是这么被静默吞掉的（`#21 ← #23`、`#23 ← #26`，都在「申请规划」）：
 *  `#23` 早就带着 `corrects → #21`、`#26` 早就带着 `corrects → #23`，
 *  于是两条都在 `loadProposedStale` 里被摘走，「过期检测」页签一条都不出 ——
 *  而 AI 那边已经跟用户说过「有两条在 Spool 等你」。**这正是 `propose_*` 那一整套的信任基础。**
 *
 *  ⛔⛔ 同一天第二版（Ocean 复核指出）：**只看新块的 `ref_kind` 还是会再造一次同样的静默隐藏。**
 *  「整条取代做完了」是**两个字段一起**成立：新块 `ref_kind='supersedes'` **且**
 *  旧块 `stale_at` 有值。而这两个字段由 `setBlockSupersession` 的**两条独立 SQL** 先后写入，
 *  ⛔ 中间没有事务。第一条成了、第二条没成，库里就是：
 *  新块说"我取代了它"、**旧块照样 live、照样进每一份 pack**、提案行还在 —— 这时候把提案藏掉，
 *  用户既看不见问题、也没有重试的入口。
 *
 *  ⚠️ 而且这个状态**不用崩溃也到得了**：退役按钮是个**纯开关**
 *  （`BlockItem.tsx` → `blocksStore.setStale`，「the action is its own inverse」，没有确认也没有 undo）。
 *  用户把旧块取回来，`ref_kind` 那半留在新块上不动 ⇒ 同一个半成品状态，走的是日常路径。
 *
 *  ⇒ 四种情形，只有一种算问过了：
 *
 *  | 库里 | 判定 | 为什么 |
 *  |---|---|---|
 *  | `corrects` | **显示** | 旧块留着、只更正一句 —— ⛔ 和「整条退掉」不是同一个决定 |
 *  | `supersedes` + 旧块已退役 | 隐藏 | 提案要的那件事**做完了** |
 *  | `supersedes` + 旧块仍 live | **显示** | 只做了一半 ⇒ 这一条是**重试入口** |
 *  | `cites` | 隐藏 | 用户自己连的引用线，⛔ T2 那条保护一个字不动 |
 *
 *  ⚠️ 重试是安全的：`setBlockSupersession` 两条 SQL 都可以重放（第二条带 `stale_at IS NULL`，
 *  ⛔ 不会挪动用户自己定的退役时间）。
 *
 *  ⚠️ 走到 `decideStale` 的时候，这一条指着的是**同一个**旧块，所以
 *  `wouldOverwriteRelation` 放行；`setBlockSupersession` 把 `corrects` 改写成
 *  `supersedes` 并清掉 `corrected_quote`（那个字段只属于 `corrects`）——
 *  这就是这条提案要的升级本身，⛔ 不是「悄悄冲掉一条别的关系」。 */
export const supersedeProposalSettled = (
  older: Block | undefined,
  newer: Block | undefined,
): boolean => {
  if (!older || !newer || !relationAlreadySettled(older, newer)) return false;
  if (newer.refKind === 'corrects') return false;
  // ⛔ 两个字段都写成了才算做完 —— 少一半就是半成品，得让用户看得见、点得着。
  if (newer.refKind === 'supersedes') return older.staleAt !== null;
  return true;
};

/** P2 · B3（DISCOVERED-20260829-14）：新块**已经**以 `corrects` 指着旧块。
 *
 *  `supersedeProposalSettled` 故意放行这一对（`corrects` 和「整条退掉」不是同一个决定），
 *  于是它会出现在「过期检测」上 —— 而这时点「更正一处」几乎是空操作：关系本来就是
 *  `corrects`，只会把引文重写一遍。卡片靠这一句把这件事说出来。
 *  ⛔ 只看 store 里两块的 `refBlockId` / `refKind`，不另查库。 */
export const alreadyCorrects = (older: Block | undefined, newer: Block | undefined): boolean =>
  relationAlreadySettled(older, newer) && newer!.refKind === 'corrects';
