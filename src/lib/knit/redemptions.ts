import { Store } from '@tauri-apps/plugin-store';
import { cleanRedemptions, type Redemption } from './knit';

// 织布：兑换记录（Ocean 2026-10-17）—— 织成了哪几件、什么时候、花了几块布。
//
// ⚠️ **存在自己的 knit.json 里，和 focus.json、drafts.json 放在一起；⛔ 不进 spool.db。** 这一轮
// 不改库结构（P9H 任务书的边界），而这一份只有几行。代价（交给 Ocean 时说了）：把库导出、搬到另一台电脑，
// 布（= 你的块）跟着走，柜子里织成的东西 ⛔ 不跟着走。以后要它跟着库走，再挪进库里。
// 读不到 / 坏了就当一件都没织 —— 布是查出来的，丢不了；丢的只会是「已经花掉」的记账。
// 「清除所有数据」时一起清掉（clearKnitFile）：库清空了，布就是 0 块，柜子里留着东西对不上。

const FILE = 'knit.json';
const KEY = 'redemptions';

interface Persist {
  load: () => Promise<Redemption[]>;
  save: (list: Redemption[]) => Promise<void>;
}

let storePromise: Promise<Store> | null = null;
const getStore = (): Promise<Store> => {
  if (!storePromise) storePromise = Store.load(FILE);
  return storePromise;
};

let persist: Persist = {
  load: async () => {
    try {
      const store = await getStore();
      return cleanRedemptions(await store.get(KEY));
    } catch (e) {
      console.warn('[knit] load failed', e);
      return [];
    }
  },
  save: async (list) => {
    const store = await getStore();
    await store.set(KEY, list);
    await store.save();
  },
};

export const loadRedemptions = (): Promise<Redemption[]> => persist.load();
export const saveRedemptions = (list: Redemption[]): Promise<void> => persist.save(list);
export const clearKnitFile = (): Promise<void> => persist.save([]);

/** Test-only seam: node has no Tauri store. */
export const __setKnitPersistForTest = (p: Persist | null): void => {
  if (p) persist = p;
};
