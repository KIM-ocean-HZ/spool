import { beforeEach, describe, expect, it, vi } from 'vitest';

// P14 hotfix (Ocean 2026-11-06: Spool quit after a long-press ⌥). The capture read the clipboard plugin's text
// and a second command's HTML AT THE SAME TIME — two threads on the macOS clipboard, which crashed the app
// (images.rs `PASTEBOARD`). ⛔ One command, nothing else, for every read.

const invoke = vi.fn();
const readText = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...a: unknown[]) => invoke(...a) }));
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({ readText: (...a: unknown[]) => readText(...a) }));

const { readClipboardText } = await import('./clipboard');

describe('readClipboardText —— 一次只碰一下剪贴板', () => {
  beforeEach(() => {
    invoke.mockReset();
    readText.mockReset();
  });

  it('⛔ 只调 clipboard_text_html 一次；不再同时去问剪贴板插件', async () => {
    invoke.mockResolvedValue({ text: '  一段字 \n', html: '' });
    expect(await readClipboardText()).toBe('一段字');
    expect(invoke.mock.calls).toEqual([['clipboard_text_html']]);
    expect(readText).not.toHaveBeenCalled();
  });

  it('命令失败 / 卡住都当剪贴板是空的，不抛', async () => {
    invoke.mockRejectedValue(new Error('no clipboard'));
    expect(await readClipboardText()).toBe('');
    vi.useFakeTimers();
    invoke.mockReturnValue(new Promise(() => {}));
    const pending = readClipboardText();
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toBe('');
    vi.useRealTimers();
  });
});
