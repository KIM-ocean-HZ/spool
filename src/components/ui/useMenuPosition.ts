import { useLayoutEffect, useRef, useState } from 'react';

// Keeping a cursor-anchored menu inside the window.
//
// ⚠️ Both right-click menus in the rail (project rows and workspace headings) are
// `position: fixed` at the cursor. Ocean 2026-08-17: 「最底下的工作区点右键显示不全，甚至无法
// 删除」— for a row near the bottom of the screen the menu simply extended past the edge, and
// 删除 is the LAST item, so the one action that has no other route was the first to be cut off.
//
// The measure has to happen after the menu is in the DOM (its height depends on how many
// workspaces the move list holds), so it renders hidden for one layout pass and is placed
// before the browser paints — a layout effect's state update is flushed synchronously.

const MARGIN_PX = 8;

/** Where a menu of `size` opened at `anchor` goes so all of it is on screen: left / up as far
 *  as needed, never past the top-left margin. */
export const clampMenu = (
  anchor: { x: number; y: number },
  size: { width: number; height: number },
  view: { width: number; height: number },
): { x: number; y: number } => ({
  x: Math.max(MARGIN_PX, Math.min(anchor.x, view.width - size.width - MARGIN_PX)),
  y: Math.max(MARGIN_PX, Math.min(anchor.y, view.height - size.height - MARGIN_PX)),
});

export function useMenuPosition(anchor: { x: number; y: number } | null): {
  ref: React.RefObject<HTMLDivElement>;
  style: React.CSSProperties;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!anchor || !el) {
      setPlaced(null);
      return;
    }
    const place = () => {
      const r = el.getBoundingClientRect();
      setPlaced(clampMenu(anchor, r, { width: window.innerWidth, height: window.innerHeight }));
    };
    place();
    // ⛔ 2026-10-16 (Ocean, P9E 验收第一轮): a menu can GROW after it opens — 「设为私密…」 opens
    // its explanation inside the menu — and placed only once, it ran off the bottom of the window
    // with its buttons. Re-placed whenever its size changes, measured from the same anchor.
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
    // The anchor object is rebuilt every render; its two numbers are what actually changed.
  }, [anchor?.x, anchor?.y]);

  return {
    ref,
    style: {
      left: placed?.x ?? anchor?.x ?? 0,
      top: placed?.y ?? anchor?.y ?? 0,
      // ⚠️ Hidden rather than unmounted: it has to be laid out to be measured.
      visibility: placed ? 'visible' : 'hidden',
    },
  };
}
