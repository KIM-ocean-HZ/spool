import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BlockImage } from '@/lib/db/blockImages';
import { useT } from '@/lib/i18n';
import { imageFull, imagePreview, previewIfReady } from '@/lib/images/blockImageIo';
import { useBlocksStore } from '@/stores/blocksStore';

// P7-6 (Ocean 2026-09-30 §9.2 第 1、11 条 + 10-07 第 44 条) — a block's images, in order, under
// its text: text, images and the note are all there at once. Each is a preview scaled in Rust;
// a click opens the original. Both arrive as `data:` URLs — the CSP is not touched.

const EMPTY: BlockImage[] = [];
/** A preview row is at most this tall; the box is reserved from the stored size, so the feed
 *  does not jump when the picture arrives. */
const THUMB_MAX_H = 200;

const humanSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function BlockImages({ blockId }: { blockId: string }) {
  const images = useBlocksStore((s) => s.imagesByBlock[blockId]) ?? EMPTY;
  const [open, setOpen] = useState<BlockImage | null>(null);
  if (images.length === 0) return null;
  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {images.map((img) => (
          <Thumb key={img.id} image={img} onOpen={() => setOpen(img)} />
        ))}
      </div>
      {open && <ImageViewer image={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Thumb({ image, onOpen }: { image: BlockImage; onOpen: () => void }) {
  const t = useT();
  const [src, setSrc] = useState<string | null>(() => previewIfReady(image.id));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let gone = false;
    imagePreview(image.id)
      .then((url) => !gone && setSrc(url))
      .catch(() => !gone && setFailed(true));
    return () => {
      gone = true;
    };
  }, [image.id]);
  const h = Math.min(THUMB_MAX_H, image.height);
  const w = Math.round((h * image.width) / Math.max(1, image.height));
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      title={t('点开看原图（{w}×{h}）', { w: image.width, h: image.height })}
      style={{ width: w, height: h }}
      className="flex max-w-full items-center justify-center overflow-hidden rounded border border-line bg-paper-2 transition-colors hover:border-line-strong"
    >
      {src ? (
        <img src={src} alt="" draggable={false} className="h-full w-full object-contain" />
      ) : failed ? (
        <span className="px-2 font-ui text-[11px] text-muted">{t('这张图读不出来')}</span>
      ) : null}
    </button>
  );
}

/** The original, over everything; a click anywhere or Esc closes it. */
function ImageViewer({ image, onClose }: { image: BlockImage; onClose: () => void }) {
  const t = useT();
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let gone = false;
    imageFull(image.id)
      .then((url) => !gone && setSrc(url))
      .catch(() => !gone && setFailed(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      gone = true;
      window.removeEventListener('keydown', onKey);
    };
  }, [image.id, onClose]);
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-ink/70 p-6"
      onClick={onClose}
    >
      {src ? (
        <img src={src} alt="" draggable={false} className="max-h-[88vh] max-w-[92vw] rounded object-contain" />
      ) : (
        <span className="font-ui text-xs text-paper">{failed ? t('这张图读不出来') : t('加载中…')}</span>
      )}
      <span className="font-ui text-[11px] text-paper/80">
        {image.width}×{image.height} · {humanSize(image.sizeBytes)}
      </span>
    </div>,
    document.body,
  );
}
