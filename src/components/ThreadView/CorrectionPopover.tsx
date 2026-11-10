import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// 2026-10-16 (Ocean, 甲 + 预览): a correction has its own card in the timeline now, and the
// sentence it corrects keeps its mark. Clicking the mark previews the correction right there,
// in this floating panel, so the reader does not have to leave the sentence to read it
// (「避免让用户来回跳转丢失方向」). Closes on Esc, on a click anywhere else, or on the mark again.
//
// P16 验收（11-10 Ocean：「更正的批注会随着滑动移动，不是固定的」，修了之后「上下滑动，批注会抖动」）：
// it used to be `position: fixed` where the sentence was at the click, so the text scrolled away under it. Following
// the sentence from a scroll listener then trailed a frame behind — WebKit scrolls the feed on its own thread — which
// is the shake. ⇒ It now lives INSIDE the feed's scroll area (a zero-height `relative` host appended to the scrolling
// content), so the browser moves it with the text in the same frame, and clips it at the feed's edges like any block.
// ⛔ Do not go back to chasing the scroll from JS. Off the feed (no scrolling ancestor) it is `fixed` on the body.

/** The mark a click on which opens a preview (set in lib/blocks/contentRuns) — a mousedown on
 *  it must not close the panel first, or a second click on the same mark would close and
 *  reopen it in one go. */
const CORRECTION_MARK_ATTR = 'data-correction-mark';

const MARGIN_PX = 8;
const GAP_PX = 4;

/** Where the marked sentence is on screen: its left edge, and its top and bottom. `el` = the mark itself, so the
 *  panel can be put in the box that scrolls it. */
export type SentenceRect = { x: number; top: number; bottom: number; el?: Element };

type Rect = { left: number; right: number; top: number; bottom: number };

/** Where the panel goes, in screen coordinates: never over the sentence it is about — below it when it fits, above
 *  when that fits better, shortened (it scrolls) to whichever side has more room — inside `box` (the feed's visible
 *  area, or the window). */
export const placePanel = (
  anchor: { x: number; top: number; bottom: number },
  panel: { width: number; height: number },
  box: Rect,
): { left: number; top: number; maxHeight: number } => {
  const want = Math.min(panel.height, (box.bottom - box.top) * 0.6);
  const below = box.bottom - anchor.bottom - GAP_PX - MARGIN_PX;
  const above = anchor.top - box.top - GAP_PX - MARGIN_PX;
  const putBelow = want <= below || below >= above;
  const maxHeight = Math.max(80, Math.min(want, putBelow ? below : above));
  return {
    left: Math.max(box.left + MARGIN_PX, Math.min(anchor.x, box.right - panel.width - MARGIN_PX)),
    top: putBelow ? anchor.bottom + GAP_PX : anchor.top - GAP_PX - maxHeight,
    maxHeight,
  };
};

/** The nearest ancestor that scrolls (the feed), or null. */
const scrollBox = (el: Element): HTMLElement | null => {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if (o === 'auto' || o === 'scroll') return p;
  }
  return null;
};

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
  // Where it is drawn: a host inside the scrolling content (scrolls with the text), or the body (fixed).
  const [host, setHost] = useState<{ el: HTMLElement; box: HTMLElement | null } | null>(null);
  const [place, setPlace] = useState<{ left: number; top: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    const box = anchor.el ? scrollBox(anchor.el) : null;
    if (!box) {
      setHost({ el: document.body, box: null });
      return;
    }
    const el = document.createElement('div');
    el.style.position = 'relative';
    el.style.height = '0';
    box.appendChild(el);
    setHost({ el, box });
    return () => el.remove();
  }, [anchor.el]);

  // Measured once laid out (unseen), before paint; then turned into the host's own coordinates.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !host) return;
    const b = host.box?.getBoundingClientRect();
    const box: Rect = b
      ? { left: b.left, right: b.right, top: b.top, bottom: b.bottom }
      : { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
    const p = placePanel(anchor, { width: el.offsetWidth, height: el.scrollHeight }, box);
    const origin = host.box ? host.el.getBoundingClientRect() : { left: 0, top: 0 };
    setPlace({ left: p.left - origin.left, top: p.top - origin.top, maxHeight: p.maxHeight });
  }, [host, anchor.x, anchor.top, anchor.bottom]);

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

  if (!host) return null;
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      className={`${host.box ? 'absolute' : 'fixed'} z-50 w-[420px] max-w-[calc(100vw-16px)] overflow-y-auto rounded-md border border-line-strong bg-paper px-3 py-2.5 shadow-[var(--shadow-card)]`}
      style={
        place
          ? { left: place.left, top: place.top, maxHeight: place.maxHeight }
          : // Laid out once unseen, at its natural height, to be measured.
            { left: 0, top: 0, visibility: 'hidden' }
      }
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    host.el,
  );
}
