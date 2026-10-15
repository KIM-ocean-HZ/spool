import { Fragment, type ReactNode } from 'react';
import { HighlightedContent } from './HighlightedContent';
import { parseImageLines } from './imageLines';
import { hasSegmentAnnotations, parseSegments, splitSegmentSource } from './segments';

/** One segment's text with its picture lines drawn as pictures (2026-10-15, Ocean:「合并图片就会
 *  失效」— a merged block with notes comes down this path, which used to print the raw line).
 *  ⚠️ Every text piece keeps its offset into the whole content, so 划词 still maps back. The
 *  newline on each side of a picture line is not drawn: the picture is its own row already, with
 *  the same gap around it as in MarkdownContent (`gapFor`). */
function SegmentBody({
  body,
  offset,
  withOffsets,
  renderImage,
}: {
  body: string;
  offset: number;
  withOffsets?: boolean;
  renderImage: (id: string, caption: ReactNode | null) => ReactNode;
}): ReactNode {
  const lines = parseImageLines(body);
  if (lines.length === 0) return <HighlightedContent content={body} withOffsets={withOffsets} offset={offset} />;
  const parts: ReactNode[] = [];
  const gap = (): string => (parts.length > 0 ? 'mt-[0.9em]' : '');
  const text = (from: number, to: number): void => {
    if (to <= from) return;
    parts.push(
      <div key={`t${from}`} className={gap()}>
        <HighlightedContent content={body.slice(from, to)} withOffsets={withOffsets} offset={offset + from} />
      </div>,
    );
  };
  let pos = 0;
  for (const l of lines) {
    text(pos, l.start > pos && body[l.start - 1] === '\n' ? l.start - 1 : l.start);
    const caption =
      l.captionEnd > l.captionStart ? (
        <HighlightedContent content={l.caption} withOffsets={withOffsets} offset={offset + l.captionStart} />
      ) : null;
    parts.push(
      <div key={`i${l.start}`} className={gap()}>
        {renderImage(l.id, caption)}
      </div>,
    );
    pos = body[l.end] === '\n' ? l.end + 1 : l.end;
  }
  text(pos, body.length);
  return <Fragment>{parts}</Fragment>;
}

// v2.8 §20.1 follow-up — display a merged block's content as a list of segments, each
// with its own annotation attached visually. Falls back to a plain HighlightedContent
// render for un-merged blocks (which is every block whose content carries no
// `↪ note: ` marker — see segments.ts on when the marker is emitted).
//
// The visual: each segment is a small group of "the text" + a quiet, indented
// per-segment note that mirrors the styling of the top-level annotation row in
// BlockItem.tsx. A thin left rule + extra space between segments makes the boundary
// readable without becoming a heavy list.
export function SegmentedContent({
  content,
  withOffsets,
  renderImage,
}: {
  content: string;
  /** Stamp raw offsets so a selection in a merged block maps back like any other. */
  withOffsets?: boolean;
  /** How to draw a picture line (the same one MarkdownContent takes). Without it the line stays text. */
  renderImage?: (id: string, caption: ReactNode | null) => ReactNode;
}): ReactNode {
  if (!hasSegmentAnnotations(content)) {
    // Fast path — un-merged block, or merged block with no annotations. Rendering
    // is identical to the pre-segments behavior.
    return <HighlightedContent content={content} withOffsets={withOffsets} />;
  }
  const segments = parseSegments(content);
  return (
    <Fragment>
      {segments.map((seg, i) => {
        const { source, body, offset } = splitSegmentSource(seg.text);
        return (
        <div
          key={i}
          // Segments after the first get a top divider so the reader can see the
          // boundary even when both adjacent segments are short. Kept quiet — a thin
          // dashed line in the line color, not a heavy border.
          className={i > 0 ? 'mt-2 border-t border-dashed border-line/70 pt-2' : ''}
        >
          <div className="whitespace-pre-wrap break-words">
            {/* ⭐ 2026-08-25（Ocean:「来源的文字特别大,和正文混在一起,太突兀」）—— 合并留下的
                `[from …]` 记号在这条路上也画成一枚小标签,和 ContentRuns 那条路一个样子。
                ⚠️ 偏移要加上记号本身占的字符数,否则在这一段里划词会整体左移几个字。 */}
            {source && (
              <span className="mr-1 rounded-sm border border-line px-1 text-[0.72em] text-muted">
                {source}
              </span>
            )}
            {renderImage ? (
              <SegmentBody body={body} offset={seg.start + offset} withOffsets={withOffsets} renderImage={renderImage} />
            ) : (
              <HighlightedContent content={body} withOffsets={withOffsets} offset={seg.start + offset} />
            )}
          </div>
          {seg.annotation && (
            // Styling mirrors BlockItem's top-level annotation row (paper-2 tint,
            // accent left rule, italic ink-2) so the visual vocabulary is the same.
            <div className="mt-1.5 border-l-2 border-accent/60 bg-paper-2/30 px-2 py-1 font-ui text-[13px] italic leading-[1.55] text-ink-2">
              {seg.annotation}
            </div>
          )}
        </div>
        );
      })}
    </Fragment>
  );
}
