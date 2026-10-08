import { invoke } from '@tauri-apps/api/core';
import type { BlockImage } from '@/lib/db/blockImages';
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
 *  it back about five seconds). */
export const SHOT_WAIT_MS = 8_000;

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
