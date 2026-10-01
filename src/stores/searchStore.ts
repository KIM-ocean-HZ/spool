import { create } from 'zustand';
import type { Block } from '@/lib/db/blocks';
import { hitsInBlocks, search } from '@/lib/search/query';
import type { BlockHit, HitOffset, SearchHit } from '@/lib/search/query';
import { useBlocksStore } from './blocksStore';
import { useThreadsStore } from './threadsStore';

// How long a navigated-to block keeps its highlight. Slightly longer than the
// .flash CSS animation (900ms) so the class isn't pulled mid-animation.
const HIGHLIGHT_MS = 1200;

interface SearchState {
  open: boolean;
  query: string;
  results: SearchHit[];
  loading: boolean;
  error: string | null;
  // The block a search result navigated to — BlockFeed scrolls to it and BlockItem
  // flashes it. Self-clears after HIGHLIGHT_MS.
  highlightBlockId: string | null;

  // v2.9 §9.10 / §19.17: find-bar state. Set when a search result is activated. While set,
  // the find bar (mounted at the top of the destination thread's LogView) is visible and
  // BlockItem force-expands its target + wraps every hit position in <mark>.
  // P1B A3 (HANDOFF §9.1 #4): the bar finds in THIS PROJECT — ↵ / ⌘G / ▲▼ walk every match
  // in the open project in timeline order and never leave it. The match list is derived on
  // demand (`hitsInBlocks` over the project's blocks + `activeQuery`), never stored.
  // ⭐ 2026-08-27 起**只有** ✕ 和 Esc 关得掉它（Ocean:「不能长期显示，点击外面就会消失」）——
  // 原来点外面、或者滚开一段就会自动清掉，那两条已经删了，见 BlockItem 里的说明。
  activeNavigationBlockId: string | null;
  activeHits: HitOffset[];
  activeHitIndex: number;
  // The query the find bar is finding — the one that triggered navigation, then whatever the
  // user types into the bar.
  activeQuery: string;
  // Bumps on every hit advance — used by BlockItem's scroll-active-into-view
  // effect so the same-index wrap-around still re-scrolls.
  flashTick: number;
  // The last search's query, kept after the overlay closes (which wipes `query`) — the ↵
  // path into a result still needs it (useSearch).
  navQuery: string;

  // `seed` 预填搜索词（⌘F 划词查找 —— 见 lib/search/selection.ts）。不传就是原来那样，
  // 开一个空的。
  openSearch: (seed?: string) => void;
  closeSearch: () => void;
  setQuery: (q: string) => void;
  runSearch: () => Promise<void>;
  highlight: (blockId: string) => void;
  startNavigation: (blockId: string, hits: HitOffset[], query: string) => void;
  // Live edit of the find bar's query: re-finds in the whole project, not just this block.
  setNavigationQuery: (query: string) => void;
  clearNavigation: () => void;
  nextHit: () => void;
  prevHit: () => void;
  // Jump straight to a chosen matching block of this project (the find bar's list, the
  // scale rail). No-op if the block has no match.
  jumpToResult: (blockId: string) => void;
}

/** 查找条上那唯一一个数：「本项目 第 i / N 处」（P1B A3）。
 *
 *  ⚠️ 处 ≠ 块：`hitOffsets` 是一块里**两个字段合起来**的每一处（正文在前、批注在后）——
 *  ▲▼ 就是按它一处一处走的，所以数它才和按回车的次数对得上。
 *  `i` 从 1 起；目标块不在命中里时是 0。⚠️ 纯函数、⛔ 不进 store：它是命中列表的算术，
 *  存一份就要跟着列表更新，两个数就是这么开始各说各话的。 */
export const findPosition = (
  hits: readonly BlockHit[],
  blockId: string | null,
  hitIndex: number,
): { i: number; n: number } => {
  let i = 0;
  let n = 0;
  for (const h of hits) {
    if (h.blockId === blockId) i = n + Math.min(hitIndex, h.hitOffsets.length - 1) + 1;
    n += h.hitOffsets.length;
  }
  return { i, n };
};

export const useSearchStore = create<SearchState>((set, get) => {
  // The open project's blocks (timeline order, as the feed draws them) and every match in
  // them. ⚠️ Null unless the find target is one of those blocks: a ⌘G pressed while another
  // project is open must not quietly start a find over there.
  const project = (): { blocks: Block[]; hits: BlockHit[] } | null => {
    const threadId = useThreadsStore.getState().activeId;
    const blocks = threadId ? useBlocksStore.getState().byThread[threadId] : undefined;
    const target = get().activeNavigationBlockId;
    if (!blocks || !blocks.some((b) => b.id === target)) return null;
    return { blocks, hits: hitsInBlocks(blocks, get().activeQuery) };
  };

  // Land the find on `hit` at `hitIndex` and flash its block into view (BlockFeed scrolls to
  // the highlight — and widens its tail window to reach it). Same project, always.
  const goToHit = (hit: BlockHit, hitIndex: number): void => {
    set((s) => ({
      activeNavigationBlockId: hit.blockId,
      activeHits: hit.hitOffsets,
      activeHitIndex: hitIndex,
      flashTick: s.flashTick + 1,
    }));
    get().highlight(hit.blockId);
  };

  // Step into the next (dir=1) / previous (dir=-1) matching block of the project, wrapping
  // from the last to the first. Forward → land on its first match; backward → its last.
  const advanceBlock = (dir: 1 | -1): void => {
    const hits = project()?.hits ?? [];
    if (hits.length === 0) return;
    const cur = hits.findIndex((h) => h.blockId === get().activeNavigationBlockId);
    const next =
      cur < 0
        ? hits[dir > 0 ? 0 : hits.length - 1]!
        : hits[(cur + dir + hits.length) % hits.length]!;
    goToHit(next, dir > 0 ? 0 : next.hitOffsets.length - 1);
  };

  return {
  open: false,
  query: '',
  results: [],
  loading: false,
  error: null,
  highlightBlockId: null,
  activeNavigationBlockId: null,
  activeHits: [],
  activeHitIndex: 0,
  activeQuery: '',
  flashTick: 0,
  navQuery: '',

  // ⚠️ 没有 seed 的时候**不碰** query：closeSearch 已经把它清空了，这里再写一次空串会把
  // 「⌘F 之前先划了词」那一路也一起抹掉（两者在同一批 set 里）。
  openSearch: (seed) => set(seed ? { open: true, query: seed } : { open: true }),

  // Clear the query/results on close so the next open starts fresh.
  closeSearch: () => set({ open: false, query: '', results: [], error: null, loading: false }),

  setQuery: (q) => set({ query: q }),

  runSearch: async () => {
    const q = get().query.trim();
    if (!q) {
      set({ results: [], loading: false, error: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const results = await search(q);
      // navQuery survives closeSearch — see its declaration.
      set({ results, navQuery: q, loading: false });
    } catch (e) {
      console.error('[search] query failed', e);
      set({ error: e instanceof Error ? e.message : String(e), results: [], loading: false });
    }
  },

  highlight: (blockId) => {
    set({ highlightBlockId: blockId });
    setTimeout(() => {
      if (get().highlightBlockId === blockId) set({ highlightBlockId: null });
    }, HIGHLIGHT_MS);
  },

  startNavigation: (blockId, hits, query) =>
    set((s) => ({
      activeNavigationBlockId: blockId,
      activeHits: hits,
      activeHitIndex: 0,
      activeQuery: query,
      flashTick: s.flashTick + 1,
    })),

  // Typing in the bar re-finds in the whole project. The find stays on the block it is on
  // while that block still matches; otherwise it moves to the next match below it in the
  // timeline (from the top when there is none below).
  setNavigationQuery: (query) => {
    set({ activeQuery: query });
    const p = project();
    if (!p) return;
    const target = get().activeNavigationBlockId;
    const own = p.hits.find((h) => h.blockId === target);
    if (own) {
      set((s) => ({ activeHits: own.hitOffsets, activeHitIndex: 0, flashTick: s.flashTick + 1 }));
      return;
    }
    const at = new Map(p.blocks.map((b, i) => [b.id, i]));
    const here = at.get(target!)!;
    const next = p.hits.find((h) => at.get(h.blockId)! > here) ?? p.hits[0];
    if (next) goToHit(next, 0);
    else set((s) => ({ activeHits: [], activeHitIndex: 0, flashTick: s.flashTick + 1 }));
  },

  clearNavigation: () =>
    set({
      activeNavigationBlockId: null,
      activeHits: [],
      activeHitIndex: 0,
      activeQuery: '',
    }),

  // Step to the next match: within the current block until its last hit, then on into the
  // next matching block of this project.
  nextHit: () => {
    const s = get();
    if (s.activeHitIndex < s.activeHits.length - 1) {
      set({ activeHitIndex: s.activeHitIndex + 1, flashTick: s.flashTick + 1 });
    } else {
      advanceBlock(1);
    }
  },

  // Step to the previous match: backward within the block to its first hit, then into the
  // previous matching block of this project (landing on that block's last hit).
  prevHit: () => {
    const s = get();
    if (s.activeHitIndex > 0) {
      set({ activeHitIndex: s.activeHitIndex - 1, flashTick: s.flashTick + 1 });
    } else {
      advanceBlock(-1);
    }
  },

  jumpToResult: (blockId) => {
    const hit = project()?.hits.find((h) => h.blockId === blockId);
    if (hit) goToHit(hit, 0);
  },
  };
});
