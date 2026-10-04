import { create } from 'zustand';

// Transient state of an in-flight project-file drag (P5-2): a row in the right rail's
// 「项目文件」 carried onto a block. Same shape as railDragStore — the gesture lives in
// lib/files/fileDrag, this only holds what the ghost and the block under the cursor need.
//
// ⚠️ `overBlockId` is read as a boolean per block (`overBlockId === block.id`), so a block only
// re-renders when its own highlight flips, not on every pointermove.
interface FileDragState {
  /** Null when no drag is in flight — that is also 「the ghost is hidden」. */
  attachmentId: string | null;
  label: string;
  /** Cursor, in viewport CSS px. */
  x: number;
  y: number;
  /** Block under the cursor that a drop would hang the file on, or null. */
  overBlockId: string | null;
  begin: (attachmentId: string, label: string, x: number, y: number) => void;
  move: (x: number, y: number, overBlockId: string | null) => void;
  end: () => void;
}

const IDLE = { attachmentId: null, label: '', x: 0, y: 0, overBlockId: null };

export const useFileDragStore = create<FileDragState>((set) => ({
  ...IDLE,
  begin: (attachmentId, label, x, y) => set({ attachmentId, label, x, y, overBlockId: null }),
  move: (x, y, overBlockId) => set({ x, y, overBlockId }),
  end: () => set(IDLE),
}));
