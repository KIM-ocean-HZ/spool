import { readNotice, type FileState } from './locate';

// P9-4 (Ocean 2026-10-10, HANDOFF §9.2 第 57、58、66 条) — what the right rail and the export
// list say about a file, from what the last look found (lib/files/locate). One place, so the
// two lists say the same words and offer the same ways out.
//
// Ocean: 「项目右侧边栏的文件管理需要能够主动提示文件被删除或者丢失，让用户确认后才可不提示」
// 「需要标清楚文件是被删除的还是spool自己的错误」 — so a file that is gone says WHICH way it is
// gone, in plain words, and offers what can be done about it.

/** How a file that cannot be opened from its recorded path is gone. */
export type LostWhy = 'trash' | 'deleted' | 'offline' | 'unknown' | 'held';

export type FileLook =
  /** Nothing to say (or not looked at yet). */
  | { kind: 'normal' }
  /** Spool followed it and the user has not looked yet (第 66 条) — click the mark to clear it. */
  | { kind: 'followed'; from: string; to: string }
  /** Gone from its path. `quiet` = the user already said 「知道了」: grey, and not counted. */
  | { kind: 'lost'; why: LostWhy; quiet: boolean; foundAt: string | null };

const LOST: ReadonlySet<string> = new Set<LostWhy>(['trash', 'deleted', 'offline', 'unknown', 'held']);

export const lookOf = (st: FileState | undefined): FileLook => {
  if (!st) return { kind: 'normal' };
  const notice = readNotice(st.notice);
  if (LOST.has(st.state)) {
    return {
      kind: 'lost',
      why: st.state as LostWhy,
      quiet: notice?.kind === 'dismissed',
      foundAt: st.foundAt,
    };
  }
  if (notice?.kind === 'moved') return { kind: 'followed', from: notice.from, to: st.path };
  return { kind: 'normal' };
};

/** The words for each way a file is gone — t() keys, the Chinese is the source. */
export const LOST_LABEL: Record<LostWhy, string> = {
  trash: '在废纸篓里',
  deleted: '已经删掉了',
  offline: '外接盘没接上',
  unknown: '不知道挪到哪了',
  held: '挪进了系统或隐藏文件夹',
};

/** What the row offers, in the order it shows them:
 *  - `find`: 「找一找」 — files with the same name (only for a file Spool has no identity for,
 *    第 58 条, and only on a Mac — Spotlight);
 *  - `thisOne`: 「是这个」 on where a held file was found;
 *  - `nearest`: 「打开最近的文件夹」 (the export list's command) — not for an unplugged disk,
 *    whose nearest folder is just `/Volumes`;
 *  - `relocate`: 「重新选位置」, the system's file dialog;
 *  - `dismiss`: 「知道了」 — not once it has been said. */
export type LostAction = 'find' | 'thisOne' | 'nearest' | 'relocate' | 'dismiss';

export const lostActions = (why: LostWhy, quiet: boolean, canFind: boolean): LostAction[] => {
  const out: LostAction[] = [];
  if (why === 'unknown' && canFind) out.push('find');
  if (why === 'held') out.push('thisOne');
  if (why !== 'offline' && why !== 'held') out.push('nearest');
  out.push('relocate');
  if (!quiet) out.push('dismiss');
  return out;
};

/** 「N 个找不到了」 beside the panel's title: gone files the user has not said 「知道了」 to. */
export const countUnconfirmedLost = (
  ids: readonly string[],
  states: Readonly<Record<string, FileState>>,
): number =>
  ids.filter((id) => {
    const look = lookOf(states[id]);
    return look.kind === 'lost' && !look.quiet;
  }).length;
