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
//   - **一件一件来，越往后越贵**（层层加深难度）：只能织「下一件」，织完它才轮到再下一件。要价见 KNIT_ITEMS。
//     旧版本织成的东西如果不在顺序上（第一版只有七件），照样算有；「下一件」是按顺序第一件还没有的。

/** 一行几针 —— 也是「今天这一行」那一格的长度。 */
export const ROW_STITCHES = 5;
/** 一块布几行。 */
export const PATCH_ROWS = 7;
/** 一块布几针。 */
export const PATCH_STITCHES = ROW_STITCHES * PATCH_ROWS;

/** 能织的东西，按顺序；`tier` 是第几层搁板（难度），`cost` 是要几块布。
 *
 *  ⭐ 顺序按真的针织难度排（Ocean 10-18「物品太少了，至少做三排，可以去网上找针织物品，按照复杂程度排」）：
 *  四层就是毛线行业通用的四档技能（Craft Yarn Council：Beginner / Easy / Intermediate / Experienced）——
 *  ① 入门：只会正针反针、平织不收针（洗碗布、杯垫、书签、发带、围巾、抱枕套）；② 简单：简单换色、
 *  罗纹、简单收放针（袖套、围脖、网兜、婴儿毯、茶壶套、毛线帽）；③ 中级：圈织、双头针、基础麻花、
 *  简单嵌花（手套、袜子、麻花围巾、拖鞋、小熊玩偶、菱格背心）；④ 熟练：费尔岛提花、蕾丝、整片麻花、
 *  短行、很多次换色（提花帽、开衫、蕾丝披肩、麻花毛衣、费尔岛毛衣、拼花毯）。
 *
 *  要价：一层比一层贵（四层合计 10 · 24 · 47 · 101 块布，一共 182）。照真库（10-17）：自己的块一天十来条
 *  ⇒ 一周两三块布 ⇒ 第一层一个月、第二层再两个多月、全部大约一年半。新版本往后加，⛔ 别改已有的 id、
 *  顺序和要价：兑换记录存的是 id 和当时花了几块（`cost`），id 一改记录就认不出来（`cleanRedemptions`
 *  会把它丢掉，等于把织成的东西收走）。
 *  ⚠️ 第一版（10-17 晚，七件）里的 coaster / scarf / beanie / mittens / plush / sweater / blanket 这七个 id
 *  原样留在这里 —— Ocean 装上第一版当晚就织了前四件，记录要认得。 */
export const KNIT_ITEMS = [
  { id: 'dishcloth', tier: 1, cost: 1 },
  { id: 'coaster', tier: 1, cost: 1 },
  { id: 'bookmark', tier: 1, cost: 1 },
  { id: 'headband', tier: 1, cost: 2 },
  { id: 'scarf', tier: 1, cost: 2 },
  { id: 'pillow', tier: 1, cost: 3 },
  { id: 'armwarmers', tier: 2, cost: 3 },
  { id: 'cowl', tier: 2, cost: 3 },
  { id: 'marketbag', tier: 2, cost: 4 },
  { id: 'babyblanket', tier: 2, cost: 4 },
  { id: 'teacosy', tier: 2, cost: 5 },
  { id: 'beanie', tier: 2, cost: 5 },
  { id: 'mittens', tier: 3, cost: 6 },
  { id: 'socks', tier: 3, cost: 7 },
  { id: 'cablescarf', tier: 3, cost: 7 },
  { id: 'slippers', tier: 3, cost: 8 },
  { id: 'plush', tier: 3, cost: 9 },
  { id: 'vest', tier: 3, cost: 10 },
  { id: 'colorworkhat', tier: 4, cost: 12 },
  { id: 'cardigan', tier: 4, cost: 13 },
  { id: 'shawl', tier: 4, cost: 15 },
  { id: 'sweater', tier: 4, cost: 17 },
  { id: 'fairisle', tier: 4, cost: 20 },
  { id: 'blanket', tier: 4, cost: 24 },
] as const;

/** 几层搁板。 */
export const KNIT_TIERS = [1, 2, 3, 4] as const;
export type KnitTier = (typeof KNIT_TIERS)[number];

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
