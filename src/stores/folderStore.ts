import { create } from 'zustand';
import { extractAttachmentText } from '@/lib/attachments/extractor';
import {
  cacheStateText,
  folderView,
  folderViewWorkspace,
  linkedWorkspaces,
  markFolderSynced,
  type FolderView,
  type LinkedWorkspace,
} from '@/lib/folders/api';
import { useSettingsStore } from '@/stores/settingsStore';

// P9Y — what the app knows about linked folders. A folder is linked to a WORKSPACE (第二轮, Ocean
// 10-25 第 210 条); a project's right rail shows the folder its workspace falls under, the workspace
// page shows the same thing from the workspace's side, and the sidebar marks the linked workspaces.
// Looked at when one of those is on screen and when the window comes back to the front —
// ⛔ nothing watches a folder in the background (task book §3.1).

interface FolderState {
  /** By project. undefined = not looked yet; null = not under any linked workspace. */
  views: Record<string, FolderView | null | undefined>;
  /** By workspace, same meaning. */
  wsViews: Record<string, FolderView | null | undefined>;
  /** The linked workspaces, for the sidebar's mark. */
  linked: LinkedWorkspace[];
  load: (threadId: string) => Promise<FolderView | null>;
  loadWorkspace: (workspaceId: string) => Promise<FolderView | null>;
  loadLinked: () => Promise<void>;
  /** After anything that changes a link: look again at everything already looked at. */
  reloadAll: () => Promise<void>;
  /** 「已经对过了」 on the linked workspace of this view. */
  markSynced: (view: FolderView) => Promise<void>;
}

// A docx / pdf state file is read here, by the same extractor project files use, and handed to Rust
// for the MCP server — which has no extractor of its own (folder_link.rs `cache_text`). Respects the
// same privacy switch as file extraction (§2.5): off means the AI gets no text for those files.
const extracting = new Set<string>();
const extractStateTexts = async (v: FolderView): Promise<void> => {
  if (!useSettingsStore.getState().autoExtractAttachments) return;
  for (const n of v.needsText) {
    const key = `${v.folderId}:${n.rel}`;
    if (extracting.has(key)) continue;
    extracting.add(key);
    try {
      const r = await extractAttachmentText(n.path);
      if (r.ok) await cacheStateText(v.folderId, n.rel, r.text);
    } catch (e) {
      console.warn('[folders] state file extraction failed', n.rel, e);
    } finally {
      extracting.delete(key);
    }
  }
};

const look = async (ask: () => Promise<FolderView | null>): Promise<FolderView | null | 'failed'> => {
  try {
    const v = await ask();
    if (v && v.needsText.length > 0) void extractStateTexts(v);
    return v;
  } catch (e) {
    // Not being able to look is not news for the user: the card shows what it showed.
    console.warn('[folders] look failed', e);
    return 'failed';
  }
};

export const useFolderStore = create<FolderState>((set, get) => ({
  views: {},
  wsViews: {},
  linked: [],

  load: async (threadId) => {
    const v = await look(() => folderView(threadId));
    if (v === 'failed') return get().views[threadId] ?? null;
    set((s) => ({ views: { ...s.views, [threadId]: v } }));
    return v;
  },

  loadWorkspace: async (workspaceId) => {
    const v = await look(() => folderViewWorkspace(workspaceId));
    if (v === 'failed') return get().wsViews[workspaceId] ?? null;
    set((s) => ({ wsViews: { ...s.wsViews, [workspaceId]: v } }));
    return v;
  },

  loadLinked: async () => {
    try {
      set({ linked: await linkedWorkspaces() });
    } catch (e) {
      console.warn('[folders] linked list failed', e);
    }
  },

  reloadAll: async () => {
    const { views, wsViews } = get();
    await Promise.all([
      ...Object.keys(views).map((id) => get().load(id)),
      ...Object.keys(wsViews).map((id) => get().loadWorkspace(id)),
      get().loadLinked(),
    ]);
  },

  markSynced: async (view) => {
    await markFolderSynced(view.workspaceId);
    await get().reloadAll();
  },
}));
