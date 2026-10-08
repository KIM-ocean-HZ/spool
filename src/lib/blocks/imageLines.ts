// P7 验收第一轮（Ocean 2026-10-08 第 4、5 条，选「图文混排，像写文档」）—— a picture is a LINE of
// the block's own text:
//
//   ![caption](spool-image:<image id>)
//
// so text can sit above, below and between pictures, deleting the line deletes the picture,
// and each picture carries its own caption (双击 ⌥ 时写的字). The bytes stay in `block_images`;
// the line only says where the picture goes and what it is called. No schema change.
//
// ⚠️ The id is internal: every surface that shows text to a person or an AI turns these lines
// into something else — the block renderer draws the picture (`markdown.ts` 'image'), a pack
// prints `![caption](<path of the copy>)` (`renderImageLines`, mirrored in mcp.rs), previews and
// labels print `[image] caption` (`imageLinesAsText`). Only the stored content and the editor's
// own draft hold the raw line.
// ⚠️ One line, one picture: a caption never contains a newline (`imageLine` folds them).
// A picture in `block_images` that no line names (blocks from before this change, or a line lost
// in compression) is still the block's — it is drawn after the text, never dropped.

/** Exactly one picture line. `]` is allowed inside the caption: the LAST `](spool-image:` wins. */
export const IMAGE_LINE_RE = /^!\[(.*)\]\(spool-image:([A-Za-z0-9_-]+)\)[ \t]*$/;

export interface ImageLine {
  id: string;
  caption: string;
  /** The whole line, `[start, end)` in `content` (no newline). */
  start: number;
  end: number;
  /** The caption inside it. */
  captionStart: number;
  captionEnd: number;
}

/** The picture line for one image. The caption is kept as typed (the editor writes through this
 *  on every keystroke, so a trailing space must survive) — only newlines are folded. */
export const imageLine = (id: string, caption = ''): string =>
  `![${caption.replace(/\s*\n\s*/g, ' ')}](spool-image:${id})`;

/** Every picture line in `content`, in order. */
export const parseImageLines = (content: string): ImageLine[] => {
  const out: ImageLine[] = [];
  let pos = 0;
  while (pos <= content.length) {
    const nl = content.indexOf('\n', pos);
    const end = nl === -1 ? content.length : nl;
    const m = IMAGE_LINE_RE.exec(content.slice(pos, end));
    if (m) {
      out.push({
        id: m[2]!,
        caption: m[1]!,
        start: pos,
        end,
        captionStart: pos + 2,
        captionEnd: pos + 2 + m[1]!.length,
      });
    }
    if (nl === -1) break;
    pos = nl + 1;
  }
  return out;
};

export const referencedImageIds = (content: string): string[] => parseImageLines(content).map((l) => l.id);

/** `text` with these pictures' lines added after it (a new block from a paste or a drop). */
export const appendImageLines = (text: string, ids: readonly string[]): string => {
  const lines = ids.map((id) => imageLine(id));
  const body = text.replace(/\s+$/, '');
  return [body, ...lines].filter((s) => s.length > 0).join('\n');
};

/** The same content with one picture's caption replaced (the first picture when `id` is null). */
export const withImageCaption = (content: string, id: string | null, caption: string): string => {
  const line = parseImageLines(content).find((l) => id === null || l.id === id);
  if (!line) return content;
  return content.slice(0, line.start) + imageLine(line.id, caption.trim()) + content.slice(line.end);
};

/** The same content with picture ids swapped (`from → to`) — a copied block's lines must name
 *  the copy's own pictures, which have new ids. Lines whose id is not in `map` are left alone. */
export const remapImageIds = (content: string, map: ReadonlyMap<string, string>): string => {
  let out = '';
  let at = 0;
  for (const l of parseImageLines(content)) {
    const to = map.get(l.id);
    if (!to) continue;
    out += content.slice(at, l.start) + imageLine(to, l.caption);
    at = l.end;
  }
  return out + content.slice(at);
};

/** For previews and labels: each picture line as `[image] caption` — never the id. The pack's
 *  labels keep `image` (mirrored in mcp.rs); the app's own previews pass the word in its UI
 *  language. */
export const imageLinesAsText = (content: string, label = 'image'): string => {
  const lines = parseImageLines(content);
  if (lines.length === 0) return content;
  let out = '';
  let at = 0;
  for (const l of lines) {
    out += content.slice(at, l.start) + (l.caption.trim() ? `[${label}] ${l.caption.trim()}` : `[${label}]`);
    at = l.end;
  }
  return out + content.slice(at);
};

/** One picture as a pack prints it. */
export interface PackImageRef {
  id: string;
  path: string;
}

/**
 * A pack's view of the block text: each picture line becomes `![caption](<path of the copy>)`
 * — standard Markdown, readable by any AI, openable by one that reads local files — and the
 * block's pictures that no line names follow at the end as `![](<path>)`. A line whose picture
 * is not in `images` becomes `![caption](image)`: the id never leaves the library.
 * ⚠️ Byte-for-byte with mcp.rs `render_image_lines` (the golden pins both).
 */
export const renderImageLines = (content: string, images: readonly PackImageRef[]): string => {
  const byId = new Map(images.map((i) => [i.id, i.path]));
  const lines = parseImageLines(content);
  let out = '';
  let at = 0;
  for (const l of lines) {
    out += content.slice(at, l.start) + `![${l.caption}](${byId.get(l.id) ?? 'image'})`;
    at = l.end;
  }
  out += content.slice(at);
  const named = new Set(lines.map((l) => l.id));
  const rest = images.filter((i) => !named.has(i.id)).map((i) => `![](${i.path})`);
  if (rest.length === 0) return out;
  const body = out.replace(/\s+$/, '');
  return [body, ...rest].filter((s) => s.length > 0).join('\n');
};
