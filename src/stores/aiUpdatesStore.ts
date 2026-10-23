import { create } from 'zustand';
import { type AiSeen, loadAiSeen, saveAiSeen, unreadThreads } from '@/lib/db/aiSeen';
import { latestMcpBlockAtByThread } from '@/lib/db/blocks';

// P9S-4 — the green dot on a project row (lib/db/aiSeen says what it means and where it is kept).
//
// Refreshed with everything else that another process can write (stores/outsideWrites) and once at
// launch; cleared one project at a time by the feed, when a new block is actually on screen.

interface AiUpdatesState {
  state: AiSeen | null;
  /** project id → newest MCP block time after the baseline. */
  latest: Record<string, number>;
  unread: ReadonlySet<string>;
  refresh: () => Promise<void>;
  /** The user has had an MCP block of this project, written at `at`, on screen. */
  markSeen: (threadId: string, at: number) => Promise<void>;
}

const NONE: ReadonlySet<string> = new Set();

export const useAiUpdatesStore = create<AiUpdatesState>((set, get) => ({
  state: null,
  latest: {},
  unread: NONE,

  // ⚠️ Never throws: it rides on the outside-writes reload, and a dot that cannot be worked out must not
  // stop the projects and blocks from re-reading. An unreadable file means 「nothing lit」 this time.
  refresh: async () => {
    try {
      const state = get().state ?? (await loadAiSeen(Date.now()));
      const latest = await latestMcpBlockAtByThread(state.baseline);
      set({ state, latest, unread: unreadThreads(latest, state) });
    } catch (e) {
      console.warn('[ai-seen] refresh failed', e);
    }
  },

  markSeen: async (threadId, at) => {
    const cur = get().state;
    if (!cur || at <= Math.max(cur.baseline, cur.seen[threadId] ?? 0)) return;
    const state: AiSeen = { ...cur, seen: { ...cur.seen, [threadId]: at } };
    set({ state, unread: unreadThreads(get().latest, state) });
    await saveAiSeen(state).catch((e) => console.warn('[ai-seen] save failed', e));
  },
}));

/** What the feed needs to decide whether a block on screen clears the dot. */
export const seenUpTo = (threadId: string): number => {
  const s = useAiUpdatesStore.getState().state;
  return s ? Math.max(s.baseline, s.seen[threadId] ?? 0) : Number.POSITIVE_INFINITY;
};
