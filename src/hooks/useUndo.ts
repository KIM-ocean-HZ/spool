import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';
import {
  SHOW_UNDO_OVERLAY_COMMAND,
  type OverlayUndoPayload,
} from '@/lib/capture/overlayProtocol';
import { IS_MAC } from '@/lib/platform';
import { useBlocksStore } from '@/stores/blocksStore';
import { previewForEntry, threadIdForEntry, useUndoStore } from '@/stores/undoStore';
import { useThreadsStore } from '@/stores/threadsStore';
import { useWorkspacesStore } from '@/stores/workspacesStore';
import type { UndoEntry } from '@/lib/undo/undoLog';

// After a reversal (or re-apply), refresh whatever the op touched. Thread/workspace deletes
// move sidebar rows, not a block feed; everything else changes a thread's blocks.
const refreshAfterUndoRedo = async (entry: UndoEntry): Promise<void> => {
  switch (entry.kind) {
    case 'thread_delete':
    case 'thread_delete_many':
      await useThreadsStore.getState().loadAll();
      break;
    case 'workspace_delete':
    case 'workspace_archive':
      await useWorkspacesStore.getState().load();
      await useThreadsStore.getState().loadAll();
      break;
    // P2 · B2: the citing block's project, plus the incoming edges of the cited block's
    // project — which may be another one (same pair clearSupersession refreshes).
    // ⚠️ `reloadIncoming`, not just `load`: `load` only merges, so an edge that redo removed
    // would stay on screen.
    case 'ref_remove': {
      const blocks = useBlocksStore.getState();
      await blocks.load(entry.payload.threadId);
      const cited = Object.values(useBlocksStore.getState().byThread)
        .flat()
        .find((b) => b.id === entry.payload.refBlockId);
      for (const id of new Set([entry.payload.threadId, cited?.threadId])) {
        if (id) await blocks.reloadIncoming(id);
      }
      break;
    }
    // P9G-3: sub-projects appear or go (the sidebar), and the original project's feed changes.
    case 'split':
      await useThreadsStore.getState().loadAll();
      await useBlocksStore.getState().load(entry.payload.originThreadId);
      break;
    // P2 · B4: both ends of the move.
    case 'move':
      await useBlocksStore.getState().load(entry.payload.fromThreadId);
      await useBlocksStore.getState().load(entry.payload.toThreadId);
      break;
    default:
      await useBlocksStore.getState().load(threadIdForEntry(entry));
  }
};

// §9.13: the undo/redo confirmation is shown in the OVERLAY window so it floats over the
// user's current app (frictionless feedback even when Spool is hidden), not only inside
// the main window. The overlay also carries the 重做 quick-action.
const showUndoOverlay = (payload: OverlayUndoPayload): void => {
  void invoke(SHOW_UNDO_OVERLAY_COMMAND, { payload }).catch((e) =>
    console.warn('[undo] show undo overlay failed', e),
  );
};

// The single entry point Cmd+Z, the global undo shortcut, and the capture toast's Undo
// all call. Reverses the last valid op, refreshes the affected thread, and shows the
// confirmation card over the user's current window.
export const runUndo = async (): Promise<void> => {
  const entry = await useUndoStore.getState().undo();
  if (entry) {
    await refreshAfterUndoRedo(entry);
    showUndoOverlay({
      op: entry.kind,
      preview: previewForEntry(entry),
      mode: 'undone',
      canRedo: true,
    });
  } else {
    showUndoOverlay({ op: 'empty', preview: '', mode: 'undone', canRedo: false });
  }
};

// Re-applies the last undone op (the 重做 action). Silent if there is nothing to redo.
export const runRedo = async (): Promise<void> => {
  const entry = await useUndoStore.getState().redo();
  if (!entry) return;
  await refreshAfterUndoRedo(entry);
  showUndoOverlay({
    op: entry.kind,
    preview: previewForEntry(entry),
    mode: 'redone',
    canRedo: false,
  });
};

type UndoKey = Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'key'>;

/** Which of the two the key is. P9H-1（DISCOVERED-20261016-7, Ocean 10-16 第 142 条: one ⌘Z too
 *  many and 「不知道怎么取消撤回」— the only redo was the card's button, gone in 2.5 s): ⌘⇧Z /
 *  Ctrl+Shift+Z is redo everywhere, and Ctrl+Y as well off the Mac (the Windows convention). */
export const undoKeyIntent = (e: UndoKey, isMac: boolean): 'undo' | 'redo' | null => {
  if (e.altKey || !(e.metaKey || e.ctrlKey)) return null;
  const k = e.key.toLowerCase();
  if (k === 'z') return e.shiftKey ? 'redo' : 'undo';
  if (k === 'y' && !isMac && e.ctrlKey && !e.metaKey && !e.shiftKey) return 'redo';
  return null;
};

// Registers the Cmd+Z / Ctrl+Z shortcut (and redo, above) on the main window (§14.1). The
// global, works-from-any-app variant is registered in Rust only while a toast is up.
export function useUndo(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const intent = undoKeyIntent(e, IS_MAC);
      if (!intent) return;
      // Let the browser's native text undo (and redo) win inside an editable field — but only
      // while there is text in it.
      //
      // ⚠️ Ocean, Windows 验收 2026-08-18 #1: 「自己写入的 block 无法撤销（写入撤销和删除撤销
      // 都不行）」. The gap that recorded nothing is fixed in blocksStore.append; this is the
      // other half, and it is why even the DELETE was unreachable. The composer is the
      // most-focused element in the app and it keeps focus after Enter, so ⌘Z landed in an
      // EMPTY textarea — where the native undo has nothing to undo and this guard bailed
      // out anyway. Between them the key did nothing at all, twice, which is exactly what
      // he reported.
      //
      // The rule is the one Ocean already picked for the capture toast on 2026-08-15
      // (丙, CaptureOverlay): with text in the box ⌘Z is 「undo my typing」; with the box
      // empty it can only mean the operation. Same sentence, same product, now in the main
      // window too.
      const t = e.target as HTMLElement | null;
      const editable =
        t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (editable) {
        const typed = t.isContentEditable
          ? (t.textContent ?? '')
          : (t as HTMLInputElement | HTMLTextAreaElement).value;
        if (typed.length > 0) return;
      }
      e.preventDefault();
      void (intent === 'undo' ? runUndo() : runRedo());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
