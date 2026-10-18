import { invoke } from '@tauri-apps/api/core';
import type { BlockImage } from '@/lib/db/blockImages';
import type { PackImage } from '@/lib/pack/assemble';
import { t } from '@/lib/i18n';

// P7-6 — talking to `src-tauri/src/images.rs`, the only place image bytes are handled. The
// webview gets `data:` URLs back (the CSP allows `img-src 'self' data:` and nothing else, and
// that line is not changed).

/** Rust's limit, mirrored for the message (`images.rs::MAX_IMAGE_BYTES`). */
export const MAX_IMAGE_MB = 20;

/** Store one image into a block. The bytes go as the request body, one image per call. */
export const addImageBytes = (blockId: string, bytes: Uint8Array): Promise<BlockImage> =>
  invoke<BlockImage>('add_block_image', bytes, { headers: { 'block-id': blockId } });

/** Rust answers with a code; this is the sentence the user reads. */
export const imageErrorMessage = (e: unknown): string => {
  const code = e instanceof Error ? e.message : String(e);
  if (code.startsWith('too_large:')) {
    const mb = Number(code.slice('too_large:'.length)) / 1024 / 1024;
    return t('这张图太大了（{n} MB），一张最多 {max} MB。', { n: mb.toFixed(1), max: MAX_IMAGE_MB });
  }
  if (code === 'unsupported') return t('这不是能放进块里的图片（认 PNG、JPEG、GIF、WebP、TIFF）。');
  if (code === 'no_block') return t('那一块已经不在了，图片没有放进去。');
  return t('图片没能存进去：{msg}', { msg: code });
};

// Previews are scaled in Rust once and kept here for the session — a block scrolled past
// twice should not decode a 10 MB photo twice. Keyed by image id: an image's bytes never
// change, so a cached preview is never wrong.
const previews = new Map<string, Promise<string>>();
/** The ones that have arrived, readable synchronously — a block that mounts again (switching
 *  projects and back) draws its pictures at once instead of an empty box first. */
const ready = new Map<string, string>();

export const imagePreview = (id: string): Promise<string> => {
  let p = previews.get(id);
  if (!p) {
    p = invoke<string>('block_image_preview', { id });
    previews.set(id, p);
    p.then((url) => ready.set(id, url)).catch(() => previews.delete(id)); // a failure is asked again
  }
  return p;
};

export const previewIfReady = (id: string): string | null => ready.get(id) ?? null;

/** The original, for 「点开看原图」. Not cached — it can be large, and it is one click. */
export const imageFull = (id: string): Promise<string> => invoke<string>('block_image_full', { id });

// ---------------------------------------------------------------------------------------
// P7-7 — where images come in from (`images.rs`): a screenshot that was just taken, files
// dragged onto the window, the clipboard.
// ---------------------------------------------------------------------------------------

/** Files a block takes as images when dragged in (Ocean 2026-10-08: 图片变块，别的照旧). HEIC is
 *  in the list so it is told why it cannot go in, rather than silently becoming a project file. */
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|tiff?|heic)$/i;
export const isImagePath = (path: string): boolean => IMAGE_EXT.test(path);

/** How long a capture waits for a ⌘⇧4 screenshot to be written (the floating thumbnail holds
 *  it back about five seconds). The least it waits: while the picture is still in the thumbnail
 *  Rust keeps waiting, up to a minute (images.rs `find_new_screenshot`). */
export const SHOT_WAIT_MS = 8_000;

/** 2026-10-18 — a ⌘C pressed after a screenshot chord: did it bring anything new to the clipboard?
 *  false = it did not, and the screenshot is what to capture. Any failure or a slow clipboard
 *  answers true, which is the behaviour from before (the clipboard wins). */
export const clipboardChangedSinceShot = (): Promise<boolean> =>
  Promise.race([
    invoke<boolean>('clipboard_changed_since_shot').catch(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 1_500)),
  ]);

/** The screenshot taken at `sinceMs`, once it is a file; null = none came in time.
 *  Rejects with 'denied' when the Desktop permission was refused. */
export const findNewScreenshot = (sinceMs: number, timeoutMs = SHOT_WAIT_MS): Promise<string | null> =>
  invoke<string | null>('find_new_screenshot', { sinceMs, timeoutMs });

export const screenshotGoesToClipboard = (): Promise<boolean> =>
  invoke<boolean>('screenshot_goes_to_clipboard').catch(() => false);

export interface AddReport {
  added: BlockImage[];
  /** One code per file that did not go in. */
  errors: string[];
}

export const addImagesFromPaths = (blockId: string, paths: string[]): Promise<AddReport> =>
  invoke<AddReport>('add_block_images_from_paths', { blockId, paths });

/** `[width, height]` of the clipboard's picture, or null when it holds none. */
export const clipboardImageSize = (): Promise<[number, number] | null> =>
  invoke<[number, number] | null>('clipboard_image_size').catch(() => null);

export const addImageFromClipboard = (blockId: string): Promise<BlockImage> =>
  invoke<BlockImage>('add_block_image_from_clipboard', { blockId });

// ---------------------------------------------------------------------------------------
// P7-8 — the paths a pack prints its pictures by (`![caption](<path>)` since 图文混排). Rust
// writes a copy of each picture beside the library (`image-cache/`) and says where; mcp.rs
// does the same for its own pack, so the two print the same path (Ocean 2026-10-08: 写完整路径).
// ---------------------------------------------------------------------------------------

/** block id → its pictures, as `assemble` wants them. Blocks without one are absent. */
export const cachedImagesOf = async (blockIds: readonly string[]): Promise<Map<string, PackImage[]>> => {
  const out = new Map<string, PackImage[]>();
  for (let i = 0; i < blockIds.length; i += 500) {
    const rows = await invoke<
      { id: string; blockId: string; path: string; width: number; height: number; sizeBytes: number }[]
    >('cached_block_images', { blockIds: blockIds.slice(i, i + 500) });
    for (const r of rows) {
      const list = out.get(r.blockId) ?? [];
      list.push({ id: r.id, path: r.path, width: r.width, height: r.height, sizeBytes: r.sizeBytes });
      out.set(r.blockId, list);
    }
  }
  return out;
};

/** P7 验收第一轮 第 2 条: image files copied in Finder (their paths), or none. */
export const clipboardImageFiles = (): Promise<string[]> =>
  invoke<string[]>('clipboard_image_files').catch(() => []);

/** A small preview for the capture card (第 1 条). */
export const imageThumb = (id: string, edge = 480): Promise<string> =>
  invoke<string>('block_image_thumb', { id, edge });
