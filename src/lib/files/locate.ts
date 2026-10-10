import { invoke } from '@tauri-apps/api/core';

// P9-3 (Ocean 2026-10-10, HANDOFF §9.2 第 57、58、63 条) — where a project file is now. The
// looking is Rust's (src-tauri/src/file_follow.rs): only it can read the identity the system
// recognises a file by (v33 `attachments.target_identity`, a BLOB this side's SQL plugin
// cannot carry). A look may also WRITE: a file that moved is followed (its path updated), one
// seen for the first time gets its identity, a 「确认过丢了」 that no longer holds is cleared.

/** What one look found. `moved` is the look that followed it; after that it is `in_place`
 *  (the 「已跟到新位置」 mark is the notice, not the state). */
export type FileWhere =
  | 'in_place'
  | 'moved'
  | 'held' // found elsewhere, in a place AI proposals may not reach — not followed (see file_follow.rs)
  | 'trash'
  | 'offline' // on a disk that is not connected
  | 'deleted'
  | 'unknown'; // attached before v33, not at its path: only its name is left

export interface FileState {
  id: string;
  state: FileWhere;
  /** The path Spool records now — after a follow, the new one. */
  path: string;
  /** `trash`: where it sits in the Trash. `held`: where it was found. */
  foundAt: string | null;
  /** `target_notice`, as JSON text — read it with `readNotice`. */
  notice: string | null;
}

/** `target_notice`: what the user still has to hear. The shapes are file_follow.rs's `Notice`. */
export type FileNotice = { kind: 'moved'; from: string } | { kind: 'dismissed' };

export const DISMISSED_NOTICE = JSON.stringify({ kind: 'dismissed' });

export const readNotice = (raw: string | null): FileNotice | null => {
  if (!raw) return null;
  try {
    const n = JSON.parse(raw) as FileNotice;
    return n.kind === 'moved' || n.kind === 'dismissed' ? n : null;
  } catch {
    return null;
  }
};

/** A file Spotlight found under the same name (第 58 条: shown, never picked for the user). */
export interface SameNameCandidate {
  path: string;
  bytes: number;
  modifiedMs: number;
}

export const locateFiles = (ids: string[]): Promise<FileState[]> =>
  ids.length === 0 ? Promise.resolve([]) : invoke<FileState[]>('locate_files', { ids });

/** Empty off macOS (no Spotlight there — the rail offers only 「重新选位置」). */
export const findSameName = (id: string): Promise<SameNameCandidate[]> =>
  invoke<SameNameCandidate[]>('find_same_name', { id });

/** The user said where it is. Rejects with `missing` / `wrong_kind` / `no_file`. */
export const relocateFile = (id: string, path: string): Promise<FileState> =>
  invoke<FileState>('relocate_file', { id, path });
