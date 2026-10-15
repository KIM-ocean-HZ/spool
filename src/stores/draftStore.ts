import { create } from 'zustand';
import type { BlockDraft } from '@/lib/db/drafts';

// 未发出的草稿，**按项目存**（2026-08-27，Ocean:「在输入框打字，按 ⌘F，草稿没了」）。
//
// ⚠️⚠️ 为什么草稿不能放在 Composer 自己的 useState 里：`LogView` 是用 `key={thread.id}`
// 挂的（ThreadView/index.tsx），React 遇到新的 key 会把整棵子树**卸载重建** —— Composer
// 跟着重建，它那个 `useState('')` 也就回到空串。而「切到别的项目」不只有点侧边栏一条路：
//   - 查找跳到别的项目里的命中（searchStore.goToHit 会 select 那个项目）；
//   - 全局搜索面板里按 ↵ 或点一条结果；
//   - 项目切到「块摘要 / 压缩 / 过期检测」页签（那时 LogView 整个不画）。
// 上面每一条都会把正在打的字扔掉，而且**没有任何提示**。
//
// ⛔ 修法不是在 Composer 里加一个 ref 兜着 —— ref 也跟着组件一起被卸载。草稿必须活在
// 组件树外面，这个 store 就是那个外面。
//
// ⚠️ 只在内存里，⛔ 不落盘：一条没发出去的草稿是「这一坐正在写的东西」，重启之后还把它
// 端出来，和 breakStore 那条「重启后还显示『你已经工作了 47 分钟』是在替用户撒谎」是同一
// 类问题。真要跨重启留住，那是另一件事（要先决定它算不算库里的内容）。

/** P7-7：粘贴进输入框、还没发出去的一张图。字节留在内存里，发出去时才存进库。 */
export interface DraftImage {
  id: string;
  bytes: Uint8Array;
  /** 输入框上那一小格的预览（`data:` —— 界面安全策略只认它）。 */
  previewUrl: string;
}

interface DraftState {
  /** threadId → 还没发出去的那段字。没有这一格 = 这个项目没有草稿。 */
  byThread: Record<string, string>;
  /** P7-7：threadId → 粘贴进来、还没发出去的图（同一个理由放在这里：切项目不能把它们扔了）。 */
  images: Record<string, DraftImage[]>;
  setDraft: (threadId: string, value: string) => void;
  addDraftImages: (threadId: string, images: DraftImage[]) => void;
  removeDraftImage: (threadId: string, id: string) => void;
  /** 发出去之后清掉（字和图一起）。⚠️ 只清这一个项目的，别的项目的草稿一个字都不动。 */
  clearDraft: (threadId: string) => void;
  /** P9D-1：块的编辑面板里没点「完成」的字，按块存。落盘见 lib/db/drafts.ts（drafts.json）。 */
  blockDrafts: Record<string, BlockDraft>;
  /** drafts.json 读回来了没有。读回来之前块找不到自己的草稿，等它变 true 再找。 */
  draftsLoaded: boolean;
  /** 字和上一次一样就什么都不做（不写盘）。 */
  setBlockDraft: (blockId: string, draft: BlockDraft) => void;
  removeBlockDraft: (blockId: string) => void;
}

export const useDraftStore = create<DraftState>((set) => ({
  byThread: {},
  images: {},
  setDraft: (threadId, value) =>
    set((s) => (s.byThread[threadId] === value ? s : { byThread: { ...s.byThread, [threadId]: value } })),
  addDraftImages: (threadId, images) =>
    set((s) => ({ images: { ...s.images, [threadId]: [...(s.images[threadId] ?? []), ...images] } })),
  removeDraftImage: (threadId, id) =>
    set((s) => ({ images: { ...s.images, [threadId]: (s.images[threadId] ?? []).filter((i) => i.id !== id) } })),
  clearDraft: (threadId) =>
    set((s) => {
      if (!(threadId in s.byThread) && !(threadId in s.images)) return s;
      const byThread = { ...s.byThread };
      const images = { ...s.images };
      delete byThread[threadId];
      delete images[threadId];
      return { byThread, images };
    }),
  blockDrafts: {},
  draftsLoaded: false,
  setBlockDraft: (blockId, draft) =>
    set((s) => {
      const cur = s.blockDrafts[blockId];
      if (cur && cur.content === draft.content && cur.annotation === draft.annotation) return s;
      return { blockDrafts: { ...s.blockDrafts, [blockId]: draft } };
    }),
  removeBlockDraft: (blockId) =>
    set((s) => {
      if (!(blockId in s.blockDrafts)) return s;
      const blockDrafts = { ...s.blockDrafts };
      delete blockDrafts[blockId];
      return { blockDrafts };
    }),
}));

const NO_IMAGES: DraftImage[] = [];
/** 这个项目输入框里的图。 */
export const selectDraftImages =
  (threadId: string) =>
  (s: DraftState): DraftImage[] =>
    s.images[threadId] ?? NO_IMAGES;

/** 这个项目现在的草稿。⚠️ 抽出来是为了 Composer 的选择器和测试读的是同一句话。 */
export const selectDraft =
  (threadId: string) =>
  (s: DraftState): string =>
    s.byThread[threadId] ?? '';
