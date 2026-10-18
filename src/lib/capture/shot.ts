/** P7-7 — set by double_tap.rs when a screenshot chord opened the copy gate. */
export interface Shot {
  /** Wall clock of the chord — the screenshot file is written after it. */
  atMs: number;
  kind: 'file' | 'clipboard' | 'toolbar';
  /** 2026-10-18 — a ⌘C came after the chord: it only wins if it brought something new. */
  copiedAfter?: boolean;
}

export const shotOf = (payload: unknown): Shot | null => {
  const shot = (payload as { shot?: Shot } | null)?.shot;
  return shot && typeof shot.atMs === 'number' ? shot : null;
};

/**
 * ⭐ 2026-10-18（Ocean，〈HAI- Lecture5〉「框选截图双击 option 无法捕捉截图，粘贴板一直保留着文本数据」）：
 * ⌘⇧4 的图进的是文件、不是剪贴板，截完再按 ⌘C（或者一个连 ⌘C 带双击的按键宏），剪贴板上还是
 * 截图前那段字 —— 以前那下 ⌘C 一来，截图就整个不算了。现在先问剪贴板（`changed`）：那下 ⌘C
 * 带来了新东西才捕字（返回 null），否则捕截图。
 */
export const screenshotToTake = async (
  offered: Shot | null,
  changed: () => Promise<boolean>,
): Promise<Shot | null> => (offered?.copiedAfter && (await changed()) ? null : offered);
