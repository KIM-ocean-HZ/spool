import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// 2026-10-16 (Ocean, 甲 + 预览): a correction has its own card in the timeline now, and the
// sentence it corrects keeps its mark. Clicking the mark previews the correction right there,
// in this floating panel, so the reader does not have to leave the sentence to read it
// (「避免让用户来回跳转丢失方向」). Closes on Esc, on a click anywhere else, or on the mark again.

/** The mark a click on which opens a preview (set in lib/blocks/contentRuns) — a mousedown on
 *  it must not close the panel first, or a second click on the same mark would close and
 *  reopen it in one go. */
const CORRECTION_MARK_ATTR = 'data-correction-mark';

const MARGIN_PX = 8;
const GAP_PX = 4;

/** Where the marked sentence is on screen: its left edge, and its top and bottom. */
export type SentenceRect = { x: number; top: number; bottom: number };

export default function CorrectionPopover({
  anchor,
  onClose,
  children,
}: {
  anchor: SentenceRect;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number; maxHeight: number } | null>(null);

  // ⚠️ Never over the sentence it is about: below it when it fits, above it when that fits
  // better, and shortened (it scrolls) to whichever side has more room. A panel that covers
  // the marked words reads as having replaced them. Measured once laid out, before paint.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const want = Math.min(el.scrollHeight, vh * 0.6);
    const below = vh - anchor.bottom - GAP_PX - MARGIN_PX;
    const above = anchor.top - GAP_PX - MARGIN_PX;
    const putBelow = want <= below || below >= above;
    const maxHeight = Math.max(80, Math.min(want, putBelow ? below : above));
    setPlace({
      left: Math.max(MARGIN_PX, Math.min(anchor.x, vw - el.offsetWidth - MARGIN_PX)),
      top: putBelow ? anchor.bottom + GAP_PX : anchor.top - GAP_PX - maxHeight,
      maxHeight,
    });
  }, [anchor.x, anchor.top, anchor.bottom]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (ref.current?.contains(target as Node) || target?.closest?.(`[${CORRECTION_MARK_ATTR}]`)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      className="fixed z-50 w-[420px] max-w-[calc(100vw-16px)] overflow-y-auto rounded-md border border-line-strong bg-paper px-3 py-2.5 shadow-[var(--shadow-card)]"
      style={
        place
          ? { left: place.left, top: place.top, maxHeight: place.maxHeight }
          : // Laid out once unseen, at its natural height, to be measured.
            { left: anchor.x, top: anchor.bottom, visibility: 'hidden' }
      }
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
