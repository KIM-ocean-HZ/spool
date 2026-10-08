import { X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MutableRefObject } from 'react';
import { IMAGE_LINE_RE, imageLine } from '@/lib/blocks/imageLines';
import type { BlockImage } from '@/lib/db/blockImages';
import { useT } from '@/lib/i18n';
import { imagePreview, previewIfReady } from '@/lib/images/blockImageIo';
import { isImeComposing } from '@/lib/utils/ime';

// P7 验收第一轮（Ocean 2026-10-08 第 4 条）：「编辑页面需要可以删除图片并且图片可以换行插入文字」.
//
// A block with pictures is edited as pieces: text, a picture, text, a picture, text — an (empty)
// text piece before, between and after the pictures, so there is always somewhere to type. Each
// picture is a card: its preview, a one-line caption, ×. Underneath it is still ONE string (the
// block's text with its picture lines — `imageLines.ts`), so 完成 / Esc work on the same draft
// as before. The panel's format buttons and 标为重点 act on the text piece holding the cursor:
// each of those text boxes says which piece it is (`data-seg`), and `segmentText` /
// `withSegmentText` read and write that piece. A block with no picture keeps the plain box.

export type Seg = { kind: 'text'; text: string } | { kind: 'image'; id: string; caption: string };

/** The draft as pieces: lines that are not picture lines run together into one text piece, and
 *  there is a text piece (maybe empty) before, between and after every picture. */
export const toSegments = (value: string): Seg[] => {
  const segs: Seg[] = [];
  let text: string[] = [];
  for (const line of value.split('\n')) {
    const m = IMAGE_LINE_RE.exec(line);
    if (!m) {
      text.push(line);
      continue;
    }
    segs.push({ kind: 'text', text: text.join('\n') });
    text = [];
    segs.push({ kind: 'image', id: m[2]!, caption: m[1]! });
  }
  segs.push({ kind: 'text', text: text.join('\n') });
  return segs;
};

/** Back to one string. An empty text piece leaves no line behind. */
export const fromSegments = (segs: readonly Seg[]): string =>
  segs
    .flatMap((s) => (s.kind === 'image' ? [imageLine(s.id, s.caption)] : s.text === '' ? [] : [s.text]))
    .join('\n');

const segIndexOf = (el: HTMLElement): number | null => {
  const raw = el.dataset.seg;
  return raw === undefined ? null : Number(raw);
};

/** The text `el` edits: its piece of `value`, or all of it for the plain text box. */
export const segmentText = (value: string, el: HTMLElement): string => {
  const i = segIndexOf(el);
  if (i === null) return value;
  const s = toSegments(value)[i];
  return s?.kind === 'text' ? s.text : '';
};

/** `value` with the text `el` edits replaced by `text`. */
export const withSegmentText = (value: string, el: HTMLElement, text: string): string => {
  const i = segIndexOf(el);
  if (i === null) return text;
  const segs = toSegments(value);
  if (segs[i]?.kind !== 'text') return value;
  segs[i] = { kind: 'text', text };
  return fromSegments(segs);
};

/** A text box that grows with what is in it. */
function GrowingText({
  index,
  value,
  onChange,
  onKeyDown,
  onFocus,
  placeholder,
  elRef,
}: {
  index: number;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  onFocus: (el: HTMLTextAreaElement) => void;
  placeholder: string;
  elRef: (el: HTMLTextAreaElement | null) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        elRef(el);
      }}
      data-seg={index}
      value={value}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onFocus={(e) => onFocus(e.currentTarget)}
      placeholder={placeholder}
      spellCheck={false}
      className="w-full flex-none resize-none overflow-hidden rounded-md border border-transparent bg-transparent px-2 py-1 font-ui text-[length:var(--block-text)] leading-[1.65] text-ink outline-none placeholder:text-muted/50 hover:border-line focus:border-accent"
    />
  );
}

function PictureCard({
  image,
  caption,
  onCaption,
  onRemove,
  onKeyDown,
}: {
  image: BlockImage | undefined;
  caption: string;
  onCaption: (v: string) => void;
  onRemove: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}) {
  const t = useT();
  const [src, setSrc] = useState<string | null>(() => (image ? previewIfReady(image.id) : null));
  useEffect(() => {
    if (!image) return;
    let gone = false;
    imagePreview(image.id)
      .then((url) => !gone && setSrc(url))
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [image]);
  return (
    <div className="flex flex-none items-start gap-3 rounded-md border border-line bg-paper-2/40 p-2">
      <div className="flex h-24 w-32 flex-none items-center justify-center overflow-hidden rounded border border-line bg-paper">
        {src ? (
          <img src={src} alt="" draggable={false} className="h-full w-full object-contain" />
        ) : (
          <span className="px-1 text-center font-ui text-[10px] text-muted">
            {image ? t('加载中…') : t('这张图已经不在了')}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <input
          value={caption}
          onChange={(e) => onCaption(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('这张图的注释（可以不写）')}
          spellCheck={false}
          className="w-full rounded border border-line bg-paper px-2 py-1 font-ui text-[13px] text-ink outline-none placeholder:text-muted/70 focus:border-accent"
        />
        {image && (
          <div className="mt-1 font-mono text-[10px] text-muted">
            {image.width}×{image.height}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        title={t('从这一块里删掉这张图（按「完成」才生效，Esc 放弃）')}
        aria-label={t('删掉这张图')}
        className="flex-none rounded p-1 text-muted transition-colors hover:bg-paper hover:text-ink"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * The content field of the edit panel, for a block with pictures. `textRef` is the panel's own
 * content-field ref: it points at the text piece holding the cursor (the last one until the
 * user clicks elsewhere), so the panel's focus-on-open, selection tracking and tools find it.
 */
export function PictureEditor({
  value,
  onChange,
  images,
  onCancel,
  textRef,
}: {
  value: string;
  onChange: (next: string) => void;
  images: ReadonlyMap<string, BlockImage>;
  onCancel: () => void;
  textRef: MutableRefObject<HTMLTextAreaElement | null>;
}) {
  const t = useT();
  const segs = toSegments(value);
  const textEls = useRef(new Map<number, HTMLTextAreaElement>());
  const lastText = segs.length - 1;

  // Before the panel's own layout effect focuses `textRef`: if it does not point at one of these
  // boxes (first render, or the piece it held merged away), point it at the last one.
  useLayoutEffect(() => {
    const cur = textRef.current;
    if (cur && [...textEls.current.values()].includes(cur)) return;
    textRef.current = textEls.current.get(lastText) ?? null;
  });

  const put = (index: number, next: Seg): void => {
    const copy = segs.slice();
    copy[index] = next;
    onChange(fromSegments(copy));
  };
  const onKey = (e: KeyboardEvent<HTMLElement>): void => {
    if (isImeComposing(e.nativeEvent)) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-md border border-line-strong bg-paper px-1.5 py-2">
      {segs.map((s, i) =>
        s.kind === 'text' ? (
          <GrowingText
            key={`text-${i}`}
            index={i}
            value={s.text}
            onChange={(v) => put(i, { kind: 'text', text: v })}
            onKeyDown={onKey}
            onFocus={(el) => {
              textRef.current = el;
            }}
            placeholder={
              i === 0 ? t('在图前面写字…') : i === lastText ? t('在图后面写字…') : t('在两张图中间写字…')
            }
            elRef={(el) => {
              if (el) textEls.current.set(i, el);
              else textEls.current.delete(i);
            }}
          />
        ) : (
          <PictureCard
            key={`image-${s.id}-${i}`}
            image={images.get(s.id)}
            caption={s.caption}
            onCaption={(v) => put(i, { ...s, caption: v.replace(/\n/g, ' ') })}
            onRemove={() => onChange(fromSegments(segs.filter((_, j) => j !== i)))}
            onKeyDown={onKey}
          />
        ),
      )}
    </div>
  );
}
