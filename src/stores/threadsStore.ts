import { create } from 'zustand';
import { ensureBaseData } from '@/lib/db/client';
import * as db from '@/lib/db/threads';
import type { Thread, ThreadPatch } from '@/lib/db/threads';
import { noticeRenamed } from '@/lib/names/renameNotice';
import { buildThreadDeleteManyUndo, buildThreadDeleteUndo, useUndoStore } from './undoStore';
import { folderPrivacyChanged } from '@/lib/folders/api';
import { t } from '@/lib/i18n';
import { toast } from '@/stores/toastStore';
import { scheduleProtocolRefresh } from '@/lib/folders/refresh';
import { useFolderStore } from '@/stores/folderStore';

/** The sidebar's pinned entries — the two "projects" whose contents are not blocks.
 *  'board' is 项目管理 (every project), 'review' is 周回顾 (every project, over time). */
export type PinnedView = 'board' | 'review' | 'workspace' | null;

interface ThreadsState {
  threadsByWorkspace: Record<string, Thread[]>;
  activeId: string | null;
  captureTargetId: string | null;
  /** Which project the "这个项目结束了" panel is asking about, or null.
   *
   *  DESIGN_WORKBENCH §9.4 — the project board can finish a project that is not the one on
   *  screen, so the panel cannot live in ThreadView's local state any more. Held here for
   *  the same reason `engineStore.briefOpen` is held there: two surfaces can now open it,
   *  and two local `useState`s would be two panels stacked on top of each other. */
  completingId: string | null;
  /** Which project the pack dialog is showing, or null.
   *
   *  DESIGN_WORKBENCH §9.13 — same reason as `completingId` above: 项目管理 can pack a
   *  project that is not the one on screen (Ocean: 「点击项目管理需要展开显示 pack」), so the
   *  dialog is mounted once in App (components/Pack/PackHost) and addressed by thread id. */
  packingId: string | null;
  /** Which pinned view owns the main area, or null when a project does (DESIGN_WORKBENCH
   *  §9.4, Ocean 2026-08-07: 「左侧边栏加入一个项目管理的一个总项目……它的工作区用来存放项目
   *  矩阵」).
   *
   *  2026-08-11 — there are two of them now. Ocean, on finding a 「回顾」 project sitting inside
   *  his 升学 workspace: 「周回顾在左侧边栏的位置应该和项目管理一起吧，作为独立工作区出现」.
   *  A weekly review reads every project, so it belongs to none of them, and the old code had
   *  no home for it — see components/ReviewBoard.
   *
   *  ⚠️ One field rather than two booleans: the two views are alternatives, and two flags
   *  would make "both open" representable and therefore eventually true.
   *
   *  ⚠️ A flag rather than a sentinel `activeId`. `loadAll` drops an activeId that no longer
   *  matches a row — a fake id would be silently reset on every reload, and every consumer
   *  of activeId (block loading, capture target, pack) would have to learn to skip it. The
   *  selected project stays selected underneath, so leaving the board goes back where you
   *  were. */
  /** v23 sidebar multi-select (Ocean 2026-08-17「和 vscode 逻辑一样」).
   *
   *  ⚠️ Separate from `activeId`, which is 「哪个项目开在主区」 — one project, always. This is
   *  「哪些行被圈住了」, for acting on several at once. A plain click sets both (select one and
   *  open it); ⌘-click and ⇧-click only ever touch this one, so extending a selection never
   *  yanks the main area away from what the user is reading — that is the VS Code behaviour
   *  being copied, and the reason the two cannot be the same field. */
  selectedIds: Set<string>;
  /** Where a ⇧-click measures from: the last row clicked without ⇧. */
  selectionAnchorId: string | null;
  pinnedView: PinnedView;
  /** P9Y 第二轮 (Ocean 10-25 第 210 条:「直接把工作区做成可点击，类似左侧边栏顶部的项目管理」): which
   *  workspace's page is open while `pinnedView` is 'workspace'. */
  workspaceViewId: string | null;
  /** P9H-1（DISCOVERED-20261015-3）：a finished project to show as 「看全部」 this one time, not
   *  the digest it opens on — the startup draft prompt's 「去看」 lands on a block whose panel
   *  only opens in the full view. Picking any other project clears it. */
  logViewFor: string | null;
  loading: boolean;
  error: string | null;
  loadAll: () => Promise<void>;
  loadWorkspace: (workspaceId: string) => Promise<void>;
  create: (workspaceId: string, title?: string) => Promise<Thread>;
  /** Resolves to the name now stored when the patch renamed or moved the project (P9-1: it
   *  is `<title> 2` when the name was taken there), else undefined. */
  patch: (id: string, patch: ThreadPatch) => Promise<string | undefined>;
  setSummary: (id: string, summary: string | null) => Promise<void>;
  setCaptureTarget: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** v23: delete a whole multi-selection under ONE undo entry (§ThreadDeleteManyPayload). */
  removeMany: (ids: string[]) => Promise<void>;
  /** v23: move a whole multi-selection into one workspace. */
  moveMany: (ids: string[], workspaceId: string) => Promise<void>;
  /** P9E-4: make these projects private, or not — the whole selection, like moveMany. */
  setPrivate: (ids: string[], on: boolean) => Promise<void>;
  select: (id: string | null) => void;
  /** Open this (finished) project straight onto 「看全部」 — see `logViewFor`. */
  showLogView: (id: string) => void;
  /** v23: one sidebar row click, VS Code rules. `ordered` is the list the row was drawn in,
   *  top to bottom — the only thing that can define what 「一段」 means for ⇧-click. */
  clickRow: (id: string, ordered: string[], mods: { meta: boolean; shift: boolean }) => void;
  clearSelection: () => void;
  setCompleting: (id: string | null) => void;
  setPacking: (id: string | null) => void;
  /** Undo a completion: back to active, and the completion's two artefacts cleared.
   *
   *  §9.13 — Ocean 2026-08-07: 「点击已完成也需要可以重新打开」. The header has had this
   *  since §9.2 R3, but only for the project you are reading; the board lists finished
   *  projects too, and a card you could finish but never un-finish was a one-way door. */
  reopen: (id: string) => Promise<void>;
  openPinned: (view: PinnedView) => void;
  /** Open a workspace's page in the centre column (its linked folder, its projects at a glance). */
  openWorkspace: (workspaceId: string) => void;
}

const groupByWorkspace = (threads: Thread[]): Record<string, Thread[]> => {
  const out: Record<string, Thread[]> = {};
  for (const t of threads) {
    if (!out[t.workspaceId]) out[t.workspaceId] = [];
    out[t.workspaceId]!.push(t);
  }
  return out;
};

const findCaptureTarget = (threads: Thread[]): string | null =>
  threads.find((t) => t.isCaptureTarget)?.id ?? null;

export const useThreadsStore = create<ThreadsState>((set, get) => ({
  threadsByWorkspace: {},
  activeId: null,
  captureTargetId: null,
  completingId: null,
  packingId: null,
  selectedIds: new Set<string>(),
  selectionAnchorId: null,
  pinnedView: null,
  workspaceViewId: null,
  logViewFor: null,
  loading: true,
  error: null,

  loadAll: async () => {
    try {
      // Self-heal: if a prior session's broken transactional setCaptureTarget left zero
      // threads marked as target, promote the oldest active one back. Without this the
      // tray says "（无）", the pin button stays disabled, and every capture fails with
      // "no-target" until the user does something — but they can't, because the UI
      // entry points for *setting* a target are themselves broken on the same path.
      const promoted = await db.ensureCaptureTarget();
      if (promoted) {
        console.info('[threads] auto-promoted capture target after self-heal:', promoted);
      }
      const all = await db.listAllThreads();
      set((s) => ({
        threadsByWorkspace: groupByWorkspace(all),
        captureTargetId: findCaptureTarget(all),
        // If the previously-active thread was deleted (here or via a workspace delete),
        // drop the selection so App re-selects the capture target.
        activeId: all.some((t) => t.id === s.activeId) ? s.activeId : null,
        // Same rule for the multi-selection: a row that no longer exists cannot stay
        // circled. ⚠️ This is also what makes an undone delete come back UNselected rather
        // than restoring a selection the user has long since moved on from.
        selectedIds: new Set([...s.selectedIds].filter((id) => all.some((t) => t.id === id))),
        loading: false,
        error: null,
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[threads] load failed', e);
      set({ loading: false, error: msg });
    }
  },

  loadWorkspace: async (workspaceId) => {
    const list = await db.listThreadsByWorkspace(workspaceId);
    set((s) => ({
      threadsByWorkspace: { ...s.threadsByWorkspace, [workspaceId]: list },
    }));
  },

  create: async (workspaceId, title = '') => {
    const t = await db.createThread(workspaceId, title);
    noticeRenamed('project', title, t.title);
    // P9Y 第二轮: a new project in a linked workspace belongs in its folder's SPOOL.md.
    scheduleProtocolRefresh();
    set((s) => ({
      threadsByWorkspace: {
        ...s.threadsByWorkspace,
        [workspaceId]: [t, ...(s.threadsByWorkspace[workspaceId] ?? [])],
      },
      activeId: t.id,
    }));
    return t;
  },

  patch: async (id, patch) => {
    const before = selectThreadById(id)(get())?.title;
    const { updatedAt, title } = await db.updateThread(id, patch);
    const state = get();
    // A thread may move across workspaces; rebuild by walking all groups.
    const flat: Thread[] = [];
    for (const list of Object.values(state.threadsByWorkspace)) {
      for (const t of list) {
        if (t.id === id) {
          flat.push({ ...t, ...patch, ...(title !== undefined && { title }), updatedAt } as Thread);
        } else {
          flat.push(t);
        }
      }
    }
    set({ threadsByWorkspace: groupByWorkspace(flat) });
    // P9-1: a move says so itself when it had to rename. A rename does NOT say it here — the
    // box it is typed in saves every 200ms, and a pause after 「Lecture 3」 on the way to
    // 「Lecture 3 notes」 must not pop a notice; the box says it once the user is done.
    if (patch.workspaceId !== undefined && patch.title === undefined && title !== undefined) {
      noticeRenamed('project', before ?? title, title);
    }
    // P9Y: a linked folder's SPOOL.md names the project and its workspace, and leaves finished ones out.
    if (patch.title !== undefined || patch.workspaceId !== undefined || patch.status !== undefined) {
      scheduleProtocolRefresh();
    }
    return title;
  },

  // The AI status-summary write path (§11.3). User-triggered, so no debounce.
  setSummary: async (id, summary) => {
    await get().patch(id, { summary });
  },

  setCaptureTarget: async (id) => {
    await db.setCaptureTarget(id);
    const state = get();
    const flat: Thread[] = [];
    for (const list of Object.values(state.threadsByWorkspace)) {
      for (const t of list) {
        flat.push({ ...t, isCaptureTarget: t.id === id });
      }
    }
    set({ threadsByWorkspace: groupByWorkspace(flat), captureTargetId: id });
  },

  remove: async (id) => {
    // Snapshot the title before deleting so the undo toast can name the project (§9.13).
    const title = selectThreadById(id)(get())?.title ?? '';
    await db.softDeleteThread(id);
    useUndoStore.getState().pushUndo(buildThreadDeleteUndo({ threadId: id, title }));
    scheduleProtocolRefresh();
    // If that was the capture target (or the last thread), restore a usable base + target;
    // loadAll then re-promotes a target and recomputes captureTargetId / activeId.
    await ensureBaseData();
    await get().loadAll();
  },

  // v23: delete every selected project under ONE undo entry. Each row is soft-deleted with
  // the same call the single delete makes; the batching is only in the undo entry and in the
  // single reload at the end.
  //
  // ⚠️ The titles are snapshotted BEFORE the deletes, for the same reason the single case
  // does it: afterwards the rows are gone and the toast has nothing to name.
  removeMany: async (ids) => {
    if (ids.length === 0) return;
    const threads = ids.map((id) => ({
      threadId: id,
      title: selectThreadById(id)(get())?.title ?? '',
    }));
    for (const id of ids) await db.softDeleteThread(id);
    useUndoStore.getState().pushUndo(buildThreadDeleteManyUndo({ threads }));
    scheduleProtocolRefresh();
    set({ selectedIds: new Set<string>(), selectionAnchorId: null });
    await ensureBaseData();
    await get().loadAll();
  },

  // v23: move every selected project into one workspace. Sequential rather than one
  // statement so it goes through the same `patch` as a single drag — one path to keep right.
  moveMany: async (ids, workspaceId) => {
    for (const id of ids) await get().patch(id, { workspaceId });
  },

  // P9E-4 (Ocean 2026-10-15 第 119 条). Not through `patch`: that stamps updated_at, and the
  // rail sorts by it — keeping a project away from AIs is not activity, so it stays put.
  setPrivate: async (ids, on) => {
    // P9Y-3 (task book §3.7; 第二轮 §8: folders are linked to workspaces now): a project going private
    // comes out of its folder's SPOOL.md — even where the user edited Spool's section — and one coming
    // back goes back in. Finish each project before starting the next: a failed protocol write rolls
    // that project back, and the already-finished projects stay in sync with the sidebar.
    const before = new Map((await db.listAllThreads()).map((thread) => [thread.id, thread.isPrivate]));
    for (const id of ids) {
      const wasPrivate = before.get(id);
      if (wasPrivate === undefined || wasPrivate === on) continue;
      await db.setThreadPrivate(id, on);
      try {
        await folderPrivacyChanged(id);
      } catch (e) {
        await db.setThreadPrivate(id, wasPrivate);
        void useFolderStore.getState().reloadAll();
        console.error('[folders] SPOOL.md privacy rewrite failed', e);
        toast.error(t('SPOOL.md 没改成：{msg}', { msg: e instanceof Error ? e.message : String(e) }));
        throw e;
      }
      set((st) => {
        const next: Record<string, Thread[]> = {};
        for (const [ws, list] of Object.entries(st.threadsByWorkspace)) {
          next[ws] = list.map((thread) => (thread.id === id ? { ...thread, isPrivate: on } : thread));
        }
        return { threadsByWorkspace: next };
      });
    }
    void useFolderStore.getState().reloadAll();
  },

  // Picking a project always leaves whichever pinned view was open — that IS what clicking a
  // card in the matrix means (§9.4: 「点击可以跳转到项目即可」).
  select: (id) =>
    set((s) => ({ activeId: id, pinnedView: null, logViewFor: s.logViewFor === id ? id : null })),

  showLogView: (id) => set({ logViewFor: id }),

  // VS Code's three clicks, and nothing more:
  //   plain — this row alone is selected, and it opens (the old behaviour, unchanged);
  //   ⌘     — add/remove this row, leave the main area alone;
  //   ⇧     — select the run between the anchor and this row, within the list it was drawn in.
  //
  // ⚠️ ⇧ ranges do not cross lists. A project can be drawn in 最近 AND in its workspace, so
  // there is no single top-to-bottom order over the rail to measure a run against — 「这一段」
  // only means something inside one list. ⌘ has no such problem and works anywhere.
  clickRow: (id, ordered, { meta, shift }) => {
    const { selectedIds, selectionAnchorId } = get();
    if (shift && selectionAnchorId && selectionAnchorId !== id) {
      const a = ordered.indexOf(selectionAnchorId);
      const b = ordered.indexOf(id);
      if (a !== -1 && b !== -1) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        set({ selectedIds: new Set(ordered.slice(lo, hi + 1)) });
        return;
      }
      // Anchor is in some other list: fall through and treat this as a fresh anchor rather
      // than selecting a run that spans two lists nobody can see as one.
    }
    if (meta) {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      set({ selectedIds: next, selectionAnchorId: id });
      return;
    }
    set((s) => ({
      selectedIds: new Set([id]),
      selectionAnchorId: id,
      activeId: id,
      pinnedView: null,
      logViewFor: s.logViewFor === id ? id : null,
    }));
  },

  clearSelection: () => set({ selectedIds: new Set<string>(), selectionAnchorId: null }),

  setCompleting: (id) => set({ completingId: id }),

  setPacking: (id) => set({ packingId: id }),

  reopen: async (id) => {
    await get().patch(id, { status: 'active', completedAt: null, digest: null });
  },

  openPinned: (view) => set({ pinnedView: view }),

  openWorkspace: (workspaceId) => set({ pinnedView: 'workspace', workspaceViewId: workspaceId }),
}));

// ⚠️ Imperative use only — `selectAllThreadsFlat(useThreadsStore.getState())`.
// NEVER `useThreadsStore(selectAllThreadsFlat)`: it returns a fresh array every call, so
// as a hook selector zustand's useSyncExternalStore compares two different objects on every
// render and loops until React gives up (#185, "Maximum update depth exceeded"). A component
// that wants this list subscribes to `threadsByWorkspace` and flattens it in a useMemo —
// see ReviewPanel. (Cost 2026-08-05: a white window with only a minified error to go on.)
export const selectAllThreadsFlat = (s: ThreadsState): Thread[] =>
  Object.values(s.threadsByWorkspace).flat();

export const selectThreadById = (id: string | null) => (s: ThreadsState): Thread | null => {
  if (!id) return null;
  for (const list of Object.values(s.threadsByWorkspace)) {
    const t = list.find((x) => x.id === id);
    if (t) return t;
  }
  return null;
};
