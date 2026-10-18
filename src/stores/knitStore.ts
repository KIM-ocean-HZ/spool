import { create } from 'zustand';
import { countStitches, listStitchTimesSince } from '@/lib/db/blocks';
import { t } from '@/lib/i18n';
import {
  canRedeem,
  knitState,
  redeem as redeemIn,
  type KnitItemId,
  type KnitTier,
  type RedeemCheck,
  type Redemption,
} from '@/lib/knit/knit';
import { loadRedemptions, saveRedemptions } from '@/lib/knit/redemptions';
import { toast } from './toastStore';

// 织布（Ocean 2026-10-17）—— 左栏那一小块、底部的柜子、周回顾里那一节读的是同一份。
// 针数每次都查（lib/db/blocks.ts）；兑换记录开机读一次 knit.json，织一件写一次。

const startOfToday = (): number => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** 东西的名字（界面语言）。新版本加东西，在这里、KNIT_ITEMS 和 Knit/knitItems.ts 里各加一份。 */
export const knitItemName = (id: KnitItemId): string =>
  ({
    dishcloth: t('洗碗布'),
    coaster: t('杯垫'),
    bookmark: t('书签'),
    headband: t('发带'),
    scarf: t('围巾'),
    pillow: t('抱枕套'),
    armwarmers: t('袖套'),
    cowl: t('围脖'),
    marketbag: t('网兜'),
    babyblanket: t('婴儿毯'),
    teacosy: t('茶壶套'),
    beanie: t('毛线帽'),
    mittens: t('手套'),
    socks: t('袜子'),
    cablescarf: t('麻花围巾'),
    slippers: t('拖鞋'),
    plush: t('小熊玩偶'),
    vest: t('菱格背心'),
    colorworkhat: t('提花帽'),
    cardigan: t('开衫'),
    shawl: t('蕾丝披肩'),
    sweater: t('麻花毛衣'),
    fairisle: t('费尔岛毛衣'),
    blanket: t('拼花毯'),
  })[id];

/** 每一层搁板叫什么（针织通用的四档难度）。 */
export const knitTierName = (tier: KnitTier): string =>
  ({ 1: t('入门'), 2: t('简单'), 3: t('中级'), 4: t('熟练') })[tier];

interface KnitStoreState {
  /** 一共织了几针。 */
  stitches: number;
  /** 今天织了几针。 */
  today: number;
  redemptions: Redemption[];
  loaded: boolean;
  /** 底部的柜子开着没有。 */
  drawerOpen: boolean;
  refresh: () => Promise<void>;
  setDrawer: (open: boolean) => void;
  toggleDrawer: () => void;
  /** 织这一件。返回为什么没织成（或 `ok`）；`failed` = 存盘没成，什么都没变。 */
  redeem: (item: KnitItemId) => Promise<RedeemCheck | 'failed'>;
  /** 撤回刚织的那一件（toast 上的「撤销」）。 */
  unredeem: (at: number) => Promise<void>;
}

export const useKnitStore = create<KnitStoreState>((set, get) => ({
  stitches: 0,
  today: 0,
  redemptions: [],
  loaded: false,
  drawerOpen: false,

  refresh: async () => {
    const [stitches, todayTimes, redemptions] = await Promise.all([
      countStitches(),
      listStitchTimesSince(startOfToday()),
      get().loaded ? Promise.resolve(get().redemptions) : loadRedemptions(),
    ]);
    set({ stitches, today: todayTimes.length, redemptions, loaded: true });
  },

  setDrawer: (open) => set({ drawerOpen: open }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),

  redeem: async (item) => {
    const { stitches, redemptions } = get();
    const state = knitState(stitches, redemptions);
    const check = canRedeem(state, item);
    if (check !== 'ok') return check;
    const at = Date.now();
    const next = redeemIn(state, redemptions, item, at);
    set({ redemptions: next });
    try {
      await saveRedemptions(next);
    } catch (e) {
      console.error('[knit] save failed', e);
      set({ redemptions });
      toast.error(t('没存上，{item}没有织成。', { item: knitItemName(item) }));
      return 'failed';
    }
    toast.undo(t('织成了{item}，放进柜子里了。', { item: knitItemName(item) }), t('撤销'), () => void get().unredeem(at));
    return 'ok';
  },

  unredeem: async (at) => {
    const { redemptions } = get();
    const last = redemptions[redemptions.length - 1];
    // Only the newest one: an older one has things built on it (the next item was its turn).
    if (!last || last.at !== at) return;
    const next = redemptions.slice(0, -1);
    set({ redemptions: next });
    try {
      await saveRedemptions(next);
    } catch (e) {
      console.error('[knit] save failed', e);
      set({ redemptions });
    }
  },
}));
