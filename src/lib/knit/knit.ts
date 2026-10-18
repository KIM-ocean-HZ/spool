// 织布（Ocean 2026-10-17）—— 左栏那块「你捕捉了 413 条 / 还差 87 条缠满」换成织布，攒下来的布能织成东西。
//
// 他选了三个方案里的 B（「织一块布」），再加了一层：「让用户把织好的布全部积累起来，满多少块布就可以织一个物品，
// 比如围巾，帽子，玩偶，毛衣，毯子……你需要思考这其中的兑换要求，层层加深难度，然后我会在后续的版本中不断更新
// 针织出来的物品」。这个文件是那套规矩本身：纯函数，没有计时器、没有读写 —— 规矩的每一个边角都能用测试钉住。
//
//   - **一针 = 你自己的一块**（捕捉的或自己写的；AI 写的不算 —— lib/db/blocks.ts `stitchWhere`）。
//   - **一行 = 5 针，一块布 = 7 行 = 35 针。** 每一针都算数：一天捕捉了 48 条，那天就织了 48 针、跨好几行，
//     多出来的接着织下一块（「为了避免超出」—— 不再有「这一行满了，多的没地方放」）。
//   - **布是查出来的，⛔ 不存**：织好了几块 = floor(总针数 / 35)。花掉了几块 = 兑换记录里加起来（knit.json）。
//     手里还有几块 = 两者之差（不会小于 0 —— 删了块、针数变少的时候，已经织成的东西⛔ 不收回）。
//   - **一件一件来，一件比一件贵**（层层加深难度）：只能织「下一件」，织完它才轮到再下一件。要价见 KNIT_ITEMS。

/** 一行几针 —— 也是「今天这一行」那一格的长度。 */
export const ROW_STITCHES = 5;
/** 一块布几行。 */
export const PATCH_ROWS = 7;
/** 一块布几针。 */
export const PATCH_STITCHES = ROW_STITCHES * PATCH_ROWS;

/** 能织的东西，按顺序。`cost` 是要几块布。
 *
 *  ⚠️ 要价是照真库定的（2026-10-17 读的副本）：07-30 起自己的块约 1000 条，一天十来条 ⇒ 一周两三块布。
 *  前四件加起来 17 块 —— 一个用了两个多月的人，装上就能织出前几件、马上看见柜子里有东西；之后每一件
 *  要的比前一件多一截，毯子 30 块大约是三个月的量，七件全齐约五个月。新版本往后加，⛔ 别改已有的顺序和
 *  要价：兑换记录存的是当时花了几块（`cost`），改了也不会对不上，但「下一件」会跟着变。 */
export const KNIT_ITEMS = [
  { id: 'coaster', cost: 1 },
  { id: 'scarf', cost: 3 },
  { id: 'beanie', cost: 5 },
  { id: 'mittens', cost: 8 },
  { id: 'plush', cost: 12 },
  { id: 'sweater', cost: 20 },
  { id: 'blanket', cost: 30 },
] as const;

export type KnitItemId = (typeof KNIT_ITEMS)[number]['id'];

/** 一次兑换：织成了哪一件、什么时候、花了几块布（记当时的要价）。 */
export interface Redemption {
  item: KnitItemId;
  at: number;
  cost: number;
}

export interface KnitState {
  stitches: number;
  /** 一共织好了几块布。 */
  made: number;
  /** 兑换花掉了几块。 */
  spent: number;
  /** 手里还有几块。 */
  inStock: number;
  /** 正在织的这一块上有几针（0 … 34）。 */
  onPatch: number;
  /** 已经织成的东西，id → 什么时候。 */
  owned: Partial<Record<KnitItemId, number>>;
  /** 下一件能织的；全织齐了是 null。 */
  next: (typeof KNIT_ITEMS)[number] | null;
}

export const knitState = (stitches: number, redemptions: readonly Redemption[]): KnitState => {
  const n = Math.max(0, Math.floor(stitches));
  const made = Math.floor(n / PATCH_STITCHES);
  const spent = redemptions.reduce((s, r) => s + r.cost, 0);
  const owned: Partial<Record<KnitItemId, number>> = {};
  for (const r of redemptions) owned[r.item] ??= r.at;
  return {
    stitches: n,
    made,
    spent,
    inStock: Math.max(0, made - spent),
    onPatch: n % PATCH_STITCHES,
    owned,
    next: KNIT_ITEMS.find((i) => owned[i.id] === undefined) ?? null,
  };
};

/** 能不能织这一件：`ok`；`owned` 已经有了；`locked` 还没轮到（先织前一件）；`short` 布不够。 */
export type RedeemCheck = 'ok' | 'owned' | 'locked' | 'short';
export const canRedeem = (state: KnitState, item: KnitItemId): RedeemCheck => {
  if (state.owned[item] !== undefined) return 'owned';
  if (state.next?.id !== item) return 'locked';
  return state.inStock >= state.next.cost ? 'ok' : 'short';
};

/** 织这一件：返回加上这一条之后的兑换记录。⛔ 不能织就原样返回（调用方先问 canRedeem）。 */
export const redeem = (state: KnitState, redemptions: readonly Redemption[], item: KnitItemId, at: number): Redemption[] => {
  if (canRedeem(state, item) !== 'ok') return [...redemptions];
  return [...redemptions, { item, at, cost: state.next!.cost }];
};

/** 本地日子 `YYYY-MM-DD`（和 lib/breakReminder 的 dayKeyOf 同一个写法）。 */
const dayKey = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** 某一天织了几针。 */
export const stitchesOn = (times: readonly number[], day: number): number => {
  const key = dayKey(day);
  return times.reduce((n, t) => n + (dayKey(t) === key ? 1 : 0), 0);
};

/** 这一周（`weekStart` 起七天）每天几针。 */
export const stitchesByDay = (times: readonly number[], weekStart: number): number[] =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return stitchesOn(times, d.getTime());
  });

/** 读回来的兑换记录：形状不对的丢掉，认不得的东西丢掉（比如装回了一个更早的版本）。 */
export const cleanRedemptions = (raw: unknown): Redemption[] => {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>(KNIT_ITEMS.map((i) => i.id));
  return raw.filter(
    (r): r is Redemption =>
      typeof r === 'object' &&
      r !== null &&
      ids.has((r as Redemption).item) &&
      typeof (r as Redemption).at === 'number' &&
      Number.isFinite((r as Redemption).at) &&
      typeof (r as Redemption).cost === 'number' &&
      (r as Redemption).cost >= 0,
  );
};
