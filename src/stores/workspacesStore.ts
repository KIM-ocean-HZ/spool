import { create } from 'zustand';
import { ensureBaseData } from '@/lib/db/client';
import { setCaptureTarget, setThreadCompletion } from '@/lib/db/threads';
import { noticeRenamed } from '@/lib/names/renameNotice';
import * as db from '@/lib/db/workspaces';
import type { Workspace } from '@/lib/db/workspaces';
import { archivePlan } from '@/lib/workspaces/archive';
import { buildWorkspaceTree } from '@/lib/workspaces/tree';
import { selectAllThreadsFlat, useThreadsStore } from './threadsStore';
import {
  buildWorkspaceArchiveUndo,
  buildWorkspaceDeleteUndo,
  useUndoStore,
} from './undoStore';

interface WorkspacesState {
  workspaces: Workspace[];
  loading: boolean;
  error: string | null;
  /** Workspace whose 打包 dialog is open, or null. Same shape and same reason as
   *  `threadsStore.packingId`: the dialog is mounted once in App, and two local useStates
   *  would be two stacked dialogs. */
  packingId: string | null;
  setPacking: (id: string | null) => void;
  /** Workspace whose 归档 confirmation is open, or null — mounted once in App, like
   *  `packingId`. */
  archivingId: string | null;
  setArchiving: (id: string | null) => void;
  load: () => Promise<void>;
  create: (title?: string, parentId?: string | null) => Promise<Workspace>;
  /** Resolves to the name stored — `<title> 2` when that level already has the one asked
   *  for (P9-1). Says nothing itself: the box it is typed in does, once the user is done. */
  rename: (id: string, title: string) => Promise<string>;
  reorder: (orderedIds: string[]) => Promise<void>;
  /** v23: re-parent a workspace. `null` sends it back to the top level. */
  move: (id: string, parentId: string | null) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** 归档: mark every unfinished project in the subtree done, under one undo entry. */
  archive: (id: string) => Promise<void>;
}

export const useWorkspacesStore = create<WorkspacesState>((set, get) => ({
  workspaces: [],
  loading: true,
  error: null,
  packingId: null,

  setPacking: (packingId) => set({ packingId }),

  archivingId: null,

  setArchiving: (archivingId) => set({ archivingId }),

  load: async () => {
    try {
      const ws = await db.listWorkspaces();
      set({ workspaces: ws, loading: false, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[workspaces] load failed', e);
      // Important: flip loading to false even on failure, otherwise App is stuck on the
      // "加载中…" screen forever and the user sees a blank cream background.
      set({ loading: false, error: msg });
    }
  },

  create: async (title = '', parentId = null) => {
    const ws = await db.createWorkspace(title, parentId);
    noticeRenamed('workspace', title, ws.title);
    set((s) => ({ workspaces: [...s.workspaces, ws] }));
    return ws;
  },

  rename: async (id, asked) => {
    const { updatedAt, title } = await db.renameWorkspace(id, asked);
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, title, updatedAt } : w)),
    }));
    return title;
  },

  reorder: async (orderedIds) => {
    await db.reorderWorkspaces(orderedIds);
    const current = get().workspaces;
    const byId = new Map(current.map((w) => [w.id, w]));
    set({
      workspaces: orderedIds
        .map((id, i) => {
          const w = byId.get(id);
          return w ? { ...w, sortOrder: i } : null;
        })
        .filter((w): w is Workspace => w !== null),
    });
  },

  // ⚠️ setWorkspaceParent throws on a move that would build a ring (a workspace inside its
  // own descendant). The throw is left to the caller: the drop target is what knows how to
  // say no to the user, and swallowing it here would make an illegal drag look like it
  // worked until the next reload.
  move: async (id, parentId) => {
    const before = get().workspaces.find((w) => w.id === id)?.title;
    const { updatedAt, title } = await db.setWorkspaceParent(id, parentId);
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === id ? { ...w, parentId, title, updatedAt } : w,
      ),
    }));
    noticeRenamed('workspace', before ?? title, title);
  },

  remove: async (id) => {
    // Cascade-soft-deletes the workspace's currently-active threads with one shared
    // timestamp; the undo entry keeps it so a restore brings back exactly those (§9.13).
    const deleteTimestamp = await db.softDeleteWorkspace(id);
    useUndoStore.getState().pushUndo(
      buildWorkspaceDeleteUndo({ workspaceId: id, deleteTimestamp }),
    );
    // Restore a usable base afterwards (recreates the Inbox if this was the last
    // workspace), then refresh both stores — threads were deleted and the capture target
    // may need re-promoting.
    await ensureBaseData();
    await get().load();
    await useThreadsStore.getState().loadAll();
  },

  // 归档 (Ocean 2026-09-30 #9). Nothing about the workspace itself is written — archived is
  // derived from its projects (lib/workspaces/archive) — so this is a batch of project
  // completions plus, when the target sat inside, a capture-target move. Done first, target
  // second: a failure in between leaves captures going to a finished project, never lost.
  archive: async (id) => {
    const plan = archivePlan(
      buildWorkspaceTree(get().workspaces),
      selectAllThreadsFlat(useThreadsStore.getState()),
      id,
    );
    if (plan.toComplete.length === 0) return;
    const archivedAt = Date.now();
    for (const th of plan.toComplete) {
      await setThreadCompletion(th.id, {
        status: 'done',
        completedAt: archivedAt,
        updatedAt: archivedAt,
      });
    }
    if (plan.captureTo) await setCaptureTarget(plan.captureTo.id);
    useUndoStore.getState().pushUndo(
      buildWorkspaceArchiveUndo({
        workspaceTitle: get().workspaces.find((w) => w.id === id)?.title ?? '',
        archivedAt,
        threads: plan.toComplete.map((th) => ({
          threadId: th.id,
          status: th.status,
          completedAt: th.completedAt,
          updatedAt: th.updatedAt,
        })),
        captureFrom: plan.captureTo ? (plan.captureFrom?.id ?? null) : null,
        captureTo: plan.captureTo?.id ?? null,
      }),
    );
    await useThreadsStore.getState().loadAll();
  },
}));
