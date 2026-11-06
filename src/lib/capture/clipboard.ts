import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { invoke } from '@tauri-apps/api/core';
import { clipboardMarkdown, domParse } from './htmlToMarkdown';

// macOS NSPasteboard.string(forType:) can block when the clipboard data is a "promised
// type" still being materialized by a slow source app (e.g. Chrome paused under load,
// some PDF readers). A hard wall-clock cap on each read keeps the capture hot path
// honest: better to treat the clipboard as empty and let the user retry than to freeze
// for tens of seconds with no feedback.
const CLIPBOARD_READ_TIMEOUT_MS = 800;

const timeout = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);

// P14 插队（Ocean 2026-11-06，第 250 条）: the plain text of a copied AI answer or page has already lost
// its tables, lists and formulas; the HTML beside it on the clipboard has not. When that HTML adds
// something (and has not lost the text on the way), what is stored is its markdown — formulas as TeX.
// Otherwise the plain text, exactly as before. Same cap on the read, same answer when it fails.
const readClipboardHtml = (): Promise<string> =>
  timeout(invoke<string>('clipboard_html').catch(() => ''), CLIPBOARD_READ_TIMEOUT_MS, '');

export const readClipboardText = async (): Promise<string> => {
  try {
    const [t, html] = await Promise.all([timeout(readText(), CLIPBOARD_READ_TIMEOUT_MS, null), readClipboardHtml()]);
    const plain = (t ?? '').replace(/^\s+|\s+$/g, '');
    return (html ? clipboardMarkdown(html, plain, domParse) : null) ?? plain;
  } catch {
    return '';
  }
};

// `app` is the plain app name (for focus-restore); `source` is the provenance label —
// the browser tab title for Safari/Chromium browsers, else the app name.
export interface ForegroundApp {
  app: string;
  source: string;
}

export const readForegroundApp = async (): Promise<ForegroundApp | null> => {
  try {
    const fg = await invoke<ForegroundApp | null>('get_foreground_app');
    return fg ?? null;
  } catch {
    return null;
  }
};
