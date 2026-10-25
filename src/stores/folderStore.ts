import { create } from 'zustand';
import { extractAttachmentText } from '@/lib/attachments/extractor';
import { cacheStateText, folderView, markFolderSynced, type FolderView } from '@/lib/folders/api';
import { useSettingsStore } from '@/stores/settingsStore';

// P9Y — what the right rail knows about the open project's linked folder. Loaded when the project
// is on screen and when the window comes back to the front (the same moments project files are
// looked at, `ProjectFiles`): ⛔ nothing watches the folder in the background (task book §3.1).

interface FolderState {
  /** undefined = not looked yet; null = this project is not linked. */
  views: Record<string, FolderView | null | undefined>;
  load: (threadId: string) => Promise<FolderView | null>;
  markSynced: (threadId: string) => Promise<void>;
  forget: (threadId: string) => void;
}

// A docx / pdf state file is read here, by the same extractor project files use, and handed to Rust
// for the MCP server — which has no extractor of its own (folder_link.rs `cache_text`). Respects the
// same privacy switch as file extraction (§2.5): off means the AI gets no text for those files.
const extracting = new Set<string>();
const extractStateTexts = async (threadId: string, v: FolderView): Promise<void> => {
  if (!useSettingsStore.getState().autoExtractAttachments) return;
  for (const n of v.needsText) {
    const key = `${threadId}:${n.rel}`;
    if (extracting.has(key)) continue;
    extracting.add(key);
    try {
      const r = await extractAttachmentText(n.path);
      if (r.ok) await cacheStateText(threadId, n.rel, r.text);
    } catch (e) {
      console.warn('[folders] state file extraction failed', n.rel, e);
    } finally {
      extracting.delete(key);
    }
  }
};

export const useFolderStore = create<FolderState>((set, get) => ({
  views: {},

  load: async (threadId) => {
    let v: FolderView | null;
    try {
      v = await folderView(threadId);
    } catch (e) {
      // Not being able to look is not news for the user: the card shows what it showed.
      console.warn('[folders] look failed', e);
      return get().views[threadId] ?? null;
    }
    set((s) => ({ views: { ...s.views, [threadId]: v } }));
    if (v && v.needsText.length > 0) void extractStateTexts(threadId, v);
    return v;
  },

  markSynced: async (threadId) => {
    await markFolderSynced(threadId);
    await get().load(threadId);
  },

  forget: (threadId) =>
    set((s) => {
      const views = { ...s.views };
      delete views[threadId];
      return { views };
    }),
}));
