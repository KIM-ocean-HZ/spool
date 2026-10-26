import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** P9Y: prose ends at the Pack button's left edge, including after a pane resize or
 *  a header status/language change. Measure each surface's own start so pinned blocks,
 *  nested previews and the editor do not depend on hardcoded padding offsets. */
export default function ThreadPane({ children, className = 'relative flex h-full flex-col' }: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const pane = ref.current;
    if (!pane) return;

    const measure = (): void => {
      const pack = pane.querySelector<HTMLElement>('[data-thread-pack]');
      if (!pack) return;
      const right = pack.getBoundingClientRect().left;
      const widths = Array.from(pane.querySelectorAll<HTMLElement>('[data-thread-text]'), (el) => ({
        el,
        width: `${Math.max(0, right - el.getBoundingClientRect().left)}px`,
      }));
      for (const { el, width } of widths) {
        if (el.style.maxWidth !== width) el.style.maxWidth = width;
      }
    };

    const resized = new ResizeObserver(measure);
    const watch = (): void => {
      resized.disconnect();
      resized.observe(pane);
      // The action row's overall width stays fixed when a status appears; observe
      // its children too so the Pack position is refreshed when their widths change.
      const row = pane.querySelector('[data-thread-pack]')?.parentElement;
      if (row) {
        resized.observe(row);
        for (const child of row.children) resized.observe(child);
      }
      measure();
    };
    const changed = new MutationObserver((records) => {
      if (records.some((record) => record.type !== 'attributes' ||
        (record.target as Element).hasAttribute('data-thread-measure-row'))) watch();
    });
    // Newly loaded blocks and portalled editor fields need the same boundary.
    // Only the measurement row's explicit width matters among style mutations;
    // ignore our own maxWidth writes and the picture editor's height adjustments.
    changed.observe(pane, {
      childList: true, characterData: true, subtree: true,
      attributes: true, attributeFilter: ['style'],
    });
    watch();
    return () => {
      resized.disconnect();
      changed.disconnect();
    };
  }, []);

  return <div ref={ref} className={className}>{children}</div>;
}
