import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { parseImageLines } from '@/lib/blocks/imageLines';
import type { BlockImage } from '@/lib/db/blockImages';
import { useT } from '@/lib/i18n';
import { imageFull, imagePreview, previewIfReady } from '@/lib/images/blockImageIo';
import { useBlocksStore } from '@/stores/blocksStore';

// P7-6, reworked in P7 验收第一轮 (Ocean 2026-10-08):
//   第 4 条 图文混排 —— a picture is a line of the block's text (`imageLines.ts`), drawn where
//     that line is by `MarkdownContent` → `PictureThumb`, its caption under it;
//   第 3 条 双击进编辑 —— a single click opens the viewer only after a moment, so a double click
//     can still reach the block's own 「双击编辑」;
//   第 6 条 左右翻 —— the viewer steps through THIS block's pictures (Ocean: 只翻这一块里的图),
//     ←/→, the arrows on screen, or a sideways swipe; each with its caption.
// Pictures no line names (blocks from before 图文混排) are drawn after the text by `BlockImages`.
// Previews and originals arrive as `data:` URLs from Rust — the CSP is not touched.

const EMPTY: BlockImage[] = [];
/** A picture in the feed is at most this tall; the box is reserved from the stored size, so the
 *  feed does not jump when the picture arrives. */
const THUMB_MAX_H = 200;
/** Long enough to tell a single click from the first half of a double click. */
const CLICK_WAIT_MS = 250;

export interface Picture {
  image: BlockImage;
  caption: string;
}

/** The block's pictures in reading order — the ones its text places, then the rest. */
export function useBlockPictures(blockId: string, content: string): {
  pictures: Picture[];
  unplaced: BlockImage[];
} {
  const images = useBlocksStore((s) => s.imagesByBlock[blockId]) ?? EMPTY;
  return useMemo(() => {
    const byId = new Map(images.map((i) => [i.id, i]));
    const placed: Picture[] = [];
    const seen = new Set<string>();
    for (const l of parseImageLines(content)) {
      const image = byId.get(l.id);
      if (!image || seen.has(l.id)) continue;
      seen.add(l.id);
      placed.push({ image, caption: l.caption.trim() });
    }
    const unplaced = images.filter((i) => !seen.has(i.id));
    return { pictures: [...placed, ...unplaced.map((image) => ({ image, caption: '' }))], unplaced };
  }, [images, content]);
}

const humanSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** One picture in the feed. `onOpen` runs on a single click; a double click is left to bubble
 *  up to whatever opens the editor. */
export function PictureThumb({
  image,
  caption,
  onOpen,
}: {
  image: BlockImage;
  caption?: ReactNode;
  onOpen: () => void;
}) {
  const t = useT();
  const [src, setSrc] = useState<string | null>(() => previewIfReady(image.id));
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    let gone = false;
    imagePreview(image.id)
      .then((url) => !gone && setSrc(url))
      .catch(() => !gone && setFailed(true));
    return () => {
      gone = true;
      window.clearTimeout(timer.current);
    };
  }, [image.id]);
  const h = Math.min(THUMB_MAX_H, image.height);
  const w = Math.round((h * image.width) / Math.max(1, image.height));
  return (
    <figure className="my-1 inline-flex max-w-full flex-col">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (e.detail > 1) return;
          timer.current = window.setTimeout(onOpen, CLICK_WAIT_MS);
        }}
        onDoubleClick={() => window.clearTimeout(timer.current)}
        title={t('点一下看大图，双击编辑')}
        style={{ width: w, height: h }}
        className="flex max-w-full items-center justify-center overflow-hidden rounded border border-line bg-paper-2 transition-colors hover:border-line-strong"
      >
        {src ? (
          <img src={src} alt="" draggable={false} className="h-full w-full object-contain" />
        ) : failed ? (
          <span className="px-2 font-ui text-[11px] text-muted">{t('这张图读不出来')}</span>
        ) : null}
      </button>
      {caption && (
        <figcaption className="mt-1 max-w-full font-ui text-[0.85em] leading-[1.5] text-ink-2">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Pictures the block holds that its text does not place — drawn after the text, in order. */
export default function BlockImages({
  unplaced,
  pictures,
  onOpen,
  onEdit,
}: {
  unplaced: BlockImage[];
  pictures: Picture[];
  onOpen: (index: number) => void;
  onEdit?: () => void;
}) {
  if (unplaced.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2" onDoubleClick={onEdit}>
      {unplaced.map((img) => (
        <PictureThumb
          key={img.id}
          image={img}
          onOpen={() => onOpen(pictures.findIndex((p) => p.image.id === img.id))}
        />
      ))}
    </div>
  );
}

/** The original, over everything, one picture at a time with its caption. ←/→ or a sideways
 *  swipe step through the block's pictures; a click on the backdrop or Esc closes. */
export function PictureViewer({
  pictures,
  start,
  onClose,
}: {
  pictures: Picture[];
  start: number;
  onClose: () => void;
}) {
  const t = useT();
  const [at, setAt] = useState(Math.max(0, Math.min(start, pictures.length - 1)));
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const swipe = useRef(0);
  const current = pictures[at];
  const step = (d: number) => setAt((i) => Math.max(0, Math.min(pictures.length - 1, i + d)));

  useEffect(() => {
    if (!current) return;
    let gone = false;
    setSrc(previewIfReady(current.image.id));
    setFailed(false);
    imageFull(current.image.id)
      .then((url) => !gone && setSrc(url))
      .catch(() => !gone && setFailed(true));
    return () => {
      gone = true;
    };
  }, [current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, pictures.length]);

  if (!current) return null;
  const many = pictures.length > 1;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-ink/75 p-6"
      onClick={onClose}
      // A two-finger swipe on a trackpad arrives as horizontal wheel movement.
      onWheel={(e) => {
        if (!many || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
        swipe.current += e.deltaX;
        if (Math.abs(swipe.current) > 80) {
          step(swipe.current > 0 ? 1 : -1);
          swipe.current = 0;
        }
      }}
    >
      <div className="flex max-w-full items-center gap-3">
        {many && (
          <button
            type="button"
            disabled={at === 0}
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label={t('上一张')}
            className="flex-none rounded-full bg-paper/15 p-2 text-paper transition-colors enabled:hover:bg-paper/30 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {src ? (
          <img
            src={src}
            alt=""
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] max-w-[80vw] rounded object-contain"
          />
        ) : (
          <span className="font-ui text-xs text-paper">{failed ? t('这张图读不出来') : t('加载中…')}</span>
        )}
        {many && (
          <button
            type="button"
            disabled={at === pictures.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label={t('下一张')}
            className="flex-none rounded-full bg-paper/15 p-2 text-paper transition-colors enabled:hover:bg-paper/30 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>
      {current.caption && (
        <p
          onClick={(e) => e.stopPropagation()}
          className="max-w-[70vw] text-center font-ui text-[13px] leading-[1.55] text-paper"
        >
          {current.caption}
        </p>
      )}
      <span className="font-ui text-[11px] text-paper/70">
        {many ? `${at + 1} / ${pictures.length} · ` : ''}
        {current.image.width}×{current.image.height} · {humanSize(current.image.sizeBytes)}
      </span>
    </div>,
    document.body,
  );
}
