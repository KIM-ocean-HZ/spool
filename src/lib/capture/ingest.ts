import type { BlockImage } from '@/lib/db/blockImages';
import type { Block } from '@/lib/db/blocks';
import { createBlock, deleteBlock } from '@/lib/db/blocks';
import { addImageFromClipboard, addImagesFromPaths } from '@/lib/images/blockImageIo';
import { getCaptureTargetThread } from '@/lib/db/threads';

export interface IngestResult {
  block: Block;
  threadId: string;
  workspaceId: string;
  threadTitle: string;
}

// Pure local write path. AI classification (§9.11) runs asynchronously after this
// returns and is wired up in Phase 10 — never in the capture hot path (Principle 4).
export const ingestCapture = async (
  content: string,
  source: string | null,
): Promise<IngestResult | null> => {
  const trimmed = content.trim();
  if (!trimmed) return null;
  const target = await getCaptureTargetThread();
  if (!target) return null;
  const block = await createBlock({
    threadId: target.id,
    kind: 'text',
    content: trimmed,
    source: source ?? null,
  });
  return {
    block,
    threadId: target.id,
    workspaceId: target.workspaceId,
    threadTitle: target.title,
  };
};

/** P7-7 — where a captured picture comes from. */
export type ImageSource = { kind: 'paths'; paths: string[] } | { kind: 'clipboard' };

export interface ImageIngestResult extends IngestResult {
  images: BlockImage[];
}

/** Capture a picture (the clipboard's, or a screenshot file) as a block of its own in the
 *  capture target: the block has no text — the picture is what was captured, and the card's
 *  note is where words go. If the picture cannot be stored, the block is taken back out and
 *  the error code is thrown (worded by `imageErrorMessage`). null = no capture target. */
export const ingestImageCapture = async (
  source: ImageSource,
  sourceLabel: string | null,
): Promise<ImageIngestResult | null> => {
  const target = await getCaptureTargetThread();
  if (!target) return null;
  const block = await createBlock({ threadId: target.id, kind: 'text', content: '', source: sourceLabel });
  let images: BlockImage[];
  try {
    if (source.kind === 'clipboard') {
      images = [await addImageFromClipboard(block.id)];
    } else {
      const report = await addImagesFromPaths(block.id, source.paths);
      if (report.added.length === 0) throw new Error(report.errors[0] ?? 'unsupported');
      images = report.added;
    }
  } catch (e) {
    await deleteBlock(block.id);
    throw e;
  }
  return { block, threadId: target.id, workspaceId: target.workspaceId, threadTitle: target.title, images };
};
