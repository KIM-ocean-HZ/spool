import { create } from 'zustand';
import * as db from '@/lib/db/followUpItems';
import type { FollowUpItem } from '@/lib/db/followUpItems';
import { getFollowUpState, setFollowUpState } from '@/lib/db/threads';
import { type FollowUpState as RunState, parseFollowUpState, serializeFollowUpState } from '@/lib/engine/followUp';

// DESIGN_FOLLOW_UP §8 — the follow-up list of whichever project is open.
//
// Two surfaces read the same list and one of them writes it: the right rail shows what the
// project is watching, the panel behind 「编辑」 is where lines are added, answered and
// retired. They have to agree the instant something changes, which is why this is a store
// and not two components each loading their own copy.
//
// ⚠️ `items` holds every row, including 'proposed' ones. Views filter, and none of them
// shows a proposed line as part of the list: a line an AI suggested is not something this
// project follows up until the user approves it on the review screen (§8.4).
//
// Only the open project's list lives here. A follow-up list is read when you are looking at
// a project, never in bulk — the one number anything else needs (how many lines are waiting
// for the user across all projects) belongs to the review badge, in proposalsStore.

interface FollowUpState {
  threadId: string | null;
  items: FollowUpItem[];
  load: (threadId: string) => Promise<void>;
  add: (text: string, standing: boolean) => Promise<void>;
  edit: (id: string, text: string) => Promise<void>;
  setStanding: (id: string, standing: boolean) => Promise<void>;
  close: (id: string) => Promise<void>;
  reopen: (id: string) => Promise<void>;
  /** Resolves with the row that was deleted, so the caller can offer to put it back. */
  remove: (id: string) => Promise<FollowUpItem | null>;
  restore: (item: FollowUpItem) => Promise<void>;
  /** P9S-6: the open project's run bookkeeping — when it last searched, what it found, whether it
   *  searches by itself every week. */
  run: RunState | null;
  /** Re-read `run` (after a follow-up finishes, the engine store has rewritten it). */
  loadRun: () => Promise<void>;
  /** P9S-6 (第 173 / 175 条): 「每周自动查一次」 for the open project. */
  setAuto: (on: boolean) => Promise<void>;
}

export const useFollowUpStore = create<FollowUpState>((set, get) => {
  const reload = async (): Promise<void> => {
    const id = get().threadId;
    if (!id) return;
    set({ items: await db.listFollowUpItems(id) });
  };
  const after = async (run: Promise<unknown>): Promise<void> => {
    await run;
    await reload();
  };
  return {
    threadId: null,
    items: [],

    run: null,

    load: async (threadId) => {
      set({ threadId, items: [], run: null });
      const items = await db.listFollowUpItems(threadId);
      const run = parseFollowUpState(await getFollowUpState(threadId));
      // A slow load for a project the user has already navigated away from must not land on
      // top of the one they are looking at now.
      if (get().threadId === threadId) set({ items, run });
    },

    loadRun: async () => {
      const id = get().threadId;
      if (!id) return;
      const run = parseFollowUpState(await getFollowUpState(id));
      if (get().threadId === id) set({ run });
    },

    setAuto: async (on) => {
      const id = get().threadId;
      if (!id) return;
      // Read fresh, not from `run`: a follow-up may have rewritten the column since it was loaded.
      const cur = parseFollowUpState(await getFollowUpState(id));
      const next: RunState = { ...cur, auto: on };
      if (!on) delete next.auto;
      await setFollowUpState(id, serializeFollowUpState(next));
      if (get().threadId === id) set({ run: next });
    },

    add: (text, standing) => after(db.addFollowUpItem(get().threadId!, text, standing)),
    edit: (id, text) => after(db.updateFollowUpItemText(id, text)),
    setStanding: (id, standing) => after(db.setFollowUpItemStanding(id, standing)),
    // The user closing a line by hand records no outcome: they know why, and inventing a
    // sentence on their behalf would put words in the library nobody wrote.
    close: (id) => after(db.closeFollowUpItem(id, null)),
    reopen: (id) => after(db.reopenFollowUpItem(id)),
    // Handing the row back is what makes 撤销 possible: once it is out of the table there is
    // nothing left to read it from, and the panel is the last place that still had it.
    remove: async (id) => {
      const gone = get().items.find((i) => i.id === id) ?? null;
      await after(db.deleteFollowUpItem(id));
      return gone;
    },
    restore: (item) => after(db.restoreFollowUpItem(item)),
  };
});
