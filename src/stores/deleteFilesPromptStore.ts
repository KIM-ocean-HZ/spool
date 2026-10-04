import { create } from 'zustand';
import { listAttachmentsAnchoredTo, type Attachment } from '@/lib/db/attachments';

// P5-3 (Ocean 2026-10-03:「提示用户是否删除，获得许可后直接删除，不然就留在项目」) — when the
// blocks the user is deleting have project files hung off them, ask first what happens to the
// files. The question is asked by the screen that started the delete; blocksStore.remove only
// takes the answer (⛔ no dialog inside a store action). The dialog itself is
// DeleteBlockFilesDialog, mounted once in App.

export type FilesChoice = 'remove' | 'keep';

interface DeleteFilesPromptState {
  /** Files hung off the blocks being deleted; empty when no question is open. */
  files: Attachment[];
  resolve: ((choice: FilesChoice | null) => void) | null;
  ask: (files: Attachment[]) => Promise<FilesChoice | null>;
  /** null = the user backed out: nothing is deleted. */
  answer: (choice: FilesChoice | null) => void;
}

export const useDeleteFilesPromptStore = create<DeleteFilesPromptState>((set, get) => ({
  files: [],
  resolve: null,
  ask: (files) =>
    new Promise((resolve) => {
      // A question still open (it should not be — the dialog is modal) counts as backed out.
      get().resolve?.(null);
      set({ files, resolve });
    }),
  answer: (choice) => {
    const { resolve } = get();
    set({ files: [], resolve: null });
    resolve?.(choice);
  },
}));

/**
 * What the screen does before calling `blocksStore.remove` for each of `blockIds`.
 * No file hangs off any of them ⇒ no question, the delete goes ahead as it always did.
 * Otherwise the user is asked once for the whole set; null = they backed out.
 */
export const askBeforeDeletingBlocks = async (
  blockIds: string[],
): Promise<{ removeFiles: boolean } | null> => {
  const files = await listAttachmentsAnchoredTo(blockIds);
  if (files.length === 0) return { removeFiles: false };
  const choice = await useDeleteFilesPromptStore.getState().ask(files);
  return choice === null ? null : { removeFiles: choice === 'remove' };
};
