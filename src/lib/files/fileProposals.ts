import { invoke } from '@tauri-apps/api/core';
import { findLiveAttachmentByTarget, listAttachmentsByThread, setAttachmentSuperseded } from '@/lib/db/attachments';
import { deleteFileProposal, getPendingFileProposal } from '@/lib/db/fileProposals';
import { basename } from '@/lib/utils/openTarget';
import { useBlocksStore } from '@/stores/blocksStore';

// P6-3 — the user's 「同意」 on an AI's file proposal. This click is the only thing that turns
// a path an AI named into a project file (Ocean 2026-09-30 §9.2 第 7 条: AI 只能提议，点头才挂).
//
// ⛔ The path gate is NOT run again here. The path in the queue already passed it in Rust
// (`mcp.rs::gate_proposed_path`), and a second copy of it in TypeScript would be a second
// rulebook that can drift. What the click re-checks is what may have changed since the card
// was queued: is the file still there, is the block still there, is it already in the project.
//
// The attach itself goes through `blocksStore.attach` — the same road the right rail's 「加文件」
// takes, so text extraction starts the same way. `ai_access` is the same default as the user's
// own files (Ocean 2026-10-06: 点头就是同意); `include_in_pack` stays off.
//
// Not on the undo ring (P6-3 ⑤): the inverse is already one click away in the right rail —
// the × takes an attached file off again. A replacement is not undone either; the old file
// stays in the project, folded under the new one, and can still be opened.

export type FileProposalOutcome =
  /** Attached. `blockGone`: the block it was proposed for was deleted, so it went on the project.
   *  `movedTo`: that block is in another project now (P9H-3), and the file went with it there. */
  | { kind: 'attached'; label: string; blockGone: boolean; movedTo: string | null }
  | { kind: 'replaced'; label: string; oldLabel: string }
  /** The same path is already in the project — nothing attached, the card is cleared. */
  | { kind: 'already'; label: string }
  /** Nothing at that path any more (moved, deleted, or a drive that is not plugged in).
   *  Nothing attached, and the card STAYS — plugging the drive back in makes it approvable. */
  | { kind: 'missing'; label: string }
  /** The proposal, its project, or the file it would replace is gone — the card is cleared. */
  | { kind: 'gone' };

let fileExists = async (path: string): Promise<boolean> =>
  (await invoke<number>('count_missing_targets', { paths: [path] })) === 0;

/** Test-only seam: node has no Tauri to ask whether a path exists. */
export const __setFileExistsForTest = (fn: (path: string) => Promise<boolean>): void => {
  fileExists = fn;
};

export const approveFileProposal = async (
  id: string,
  now: number = Date.now(),
): Promise<FileProposalOutcome> => {
  const p = await getPendingFileProposal(id, now);
  if (!p) {
    await deleteFileProposal(id);
    return { kind: 'gone' };
  }
  const label = basename(p.path);
  if (!(await fileExists(p.path))) return { kind: 'missing', label };

  // Where it hangs. An attach goes onto the block it was proposed for — in whichever project that
  // block is NOW (P9H-3: a split or a move takes the block, id and all, elsewhere) — or onto the
  // proposal's project if the block has since been deleted. A replacement goes where the old file
  // hangs NOW — the AI never names a block for it (P6-2), so there is nothing to drift.
  const blockGone = p.kind === 'attach' && p.anchorBlockId !== null && p.anchorSeq === null;
  let anchorBlockId = p.kind === 'attach' && !blockGone ? p.anchorBlockId : null;
  const home = anchorBlockId !== null && p.anchorThreadId ? p.anchorThreadId : p.threadId;
  if (await findLiveAttachmentByTarget(home, p.path)) {
    await deleteFileProposal(id);
    return { kind: 'already', label };
  }
  if (p.kind === 'supersede') {
    const old = (await listAttachmentsByThread(p.threadId)).find((a) => a.id === p.supersedesId);
    anchorBlockId = old?.anchorBlockId ?? null;
  }

  const blocks = useBlocksStore.getState();
  const attached = await blocks.attach({
    threadId: home,
    kind: 'file',
    target: p.path,
    label,
    anchorBlockId,
    addedBy: p.client || 'MCP',
  });
  if (p.kind === 'supersede' && p.supersedesId) {
    await setAttachmentSuperseded(p.supersedesId, attached.id, Date.now());
  }
  await deleteFileProposal(id);
  // `attach` appended to that project's list in memory; read the whole project back so the
  // replaced file and a project nobody had opened yet are both right everywhere it is shown.
  await useBlocksStore.getState().load(home);

  return p.kind === 'attach'
    ? { kind: 'attached', label, blockGone, movedTo: home !== p.threadId ? p.anchorThreadTitle ?? '' : null }
    : { kind: 'replaced', label, oldLabel: p.supersedesLabel ?? '' };
};
