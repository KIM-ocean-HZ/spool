import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Attachment } from '@/lib/db/attachments';
import type { Block } from '@/lib/db/blocks';
import { suppressSelection } from '@/lib/sidebar/railDrag';
import { useBlocksStore } from '@/stores/blocksStore';
import { useFileDragStore } from '@/stores/fileDragStore';

// P5-2 (Ocean 2026-10-03:「用户可以直接把项目文件拖进 block 中」) — a row in the right rail's
// 「项目文件」 pressed and carried onto a block hangs that file off the block.
//
// ⚠️⚠️ Pointer events, never HTML5 `draggable` — lib/sidebar/railDrag explains why: Tauri's
// native drag-drop handler on the WKWebView swallows every drop over the page. That same
// handler is how a file dragged in from Finder arrives (useThreadDropTarget), and that path is
// unchanged: from Finder a file still only joins the project. This gesture is the one way onto
// a block.

/** DOM attribute a block marks itself with as a drop target; the value is the block id. */
export const DROP_BLOCK_ATTR = 'data-drop-block';
/** DOM attribute on the timeline's scrolling element, so a drag can scroll it. */
export const TIMELINE_SCROLLER_ATTR = 'data-timeline-scroller';

const THRESHOLD_PX = 4;
const EDGE_PX = 36;
const SCROLL_STEP_PX = 10;

/**
 * What dropping `file` on `blockId` should write: that block's id, or undefined when nothing
 * changes — dropped off any block, on the block it already hangs off, or on a block that is not
 * one of `blocks` (the file's own project).
 */
export function anchorForDrop(
  file: Attachment,
  blockId: string | null,
  blocks: Block[],
): string | undefined {
  if (!blockId || blockId === file.anchorBlockId) return undefined;
  return blocks.some((b) => b.id === blockId) ? blockId : undefined;
}

/**
 * Begin a file drag from a `pointerdown` on a project-file row. Nothing visible happens until
 * the pointer passes THRESHOLD_PX — up to then the press is still a click (which opens the file).
 */
export function startFileDrag(event: ReactPointerEvent<HTMLElement>, file: Attachment, label: string): void {
  if (event.button !== 0) return;

  const startX = event.clientX;
  const startY = event.clientY;
  let dragging = false;
  let x = startX;
  let y = startY;
  let frame = 0;

  suppressSelection(true);

  // The ghost is pointer-events:none, so it never hit-tests as the thing under the cursor.
  const hit = (): string | null =>
    document
      .elementFromPoint(x, y)
      ?.closest(`[${DROP_BLOCK_ATTR}]`)
      ?.getAttribute(DROP_BLOCK_ATTR) ?? null;

  const paint = (): void => useFileDragStore.getState().move(x, y, hit());

  // A project is usually longer than one screen, so near the timeline's top or bottom edge
  // it scrolls — otherwise only the blocks already on screen could be reached.
  const tick = (): void => {
    frame = requestAnimationFrame(tick);
    const scroller = document.querySelector(`[${TIMELINE_SCROLLER_ATTR}]`);
    if (!scroller) return;
    const r = scroller.getBoundingClientRect();
    if (x < r.left || x > r.right) return;
    const dy = y < r.top + EDGE_PX ? -SCROLL_STEP_PX : y > r.bottom - EDGE_PX ? SCROLL_STEP_PX : 0;
    if (dy === 0) return;
    scroller.scrollTop += dy;
    paint();
  };

  const onMove = (e: PointerEvent): void => {
    x = e.clientX;
    y = e.clientY;
    if (!dragging) {
      if (Math.abs(x - startX) < THRESHOLD_PX && Math.abs(y - startY) < THRESHOLD_PX) return;
      dragging = true;
      useFileDragStore.getState().begin(file.id, label, x, y);
      frame = requestAnimationFrame(tick);
    }
    paint();
  };

  const finish = (drop: boolean): void => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('keydown', onKey);
    suppressSelection(false);
    if (!dragging) return;
    cancelAnimationFrame(frame);
    const target = drop ? hit() : null;
    useFileDragStore.getState().end();

    // The click that follows this pointerup would otherwise land on the row and open the file.
    const eatClick = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();
    };
    window.addEventListener('click', eatClick, true);
    setTimeout(() => window.removeEventListener('click', eatClick, true), 0);

    const store = useBlocksStore.getState();
    const anchor = anchorForDrop(file, target, store.byThread[file.threadId] ?? []);
    if (anchor) void store.anchorAttachment(file.id, file.threadId, anchor);
  };

  const onUp = (): void => finish(true);
  const onCancel = (): void => finish(false);
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') finish(false);
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  window.addEventListener('keydown', onKey);
}
