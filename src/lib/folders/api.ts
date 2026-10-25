import { invoke } from '@tauri-apps/api/core';
import { t } from '@/lib/i18n';

// P9Y (Ocean 2026-10-25 第 206、208 条; docs/TASKBOOK-P9Y-FOLDER-LINK-SPOOL-PROTOCOL-2026-10-25.md) —
// a project linked to a folder on disk. Everything about the folder lives on the Rust side
// (src-tauri/src/folder_link.rs): the two tables hold a BLOB this webview's SQL plugin cannot carry,
// and the listing, the snapshot and the SPOOL.md writes are file work. This file is only the calls.

/** A state file now, against the last sync. `spec` carries a `*` for a dated series. */
export interface StateNow {
  spec: string;
  /** The file it stands for now; null = nothing there any more. */
  path: string | null;
  changed: boolean;
}

export interface FolderChange {
  path: string;
  kind: 'added' | 'modified' | 'deleted';
  modified: number | null;
}

export interface FolderCommit {
  at: number;
  title: string;
}

export type FolderLocation = 'in_place' | 'moved' | 'offline' | 'trash' | 'deleted' | 'unknown';
export type ProtocolState = 'ok' | 'edited' | 'removed' | 'missing';

/** `folder_link::View`, as the right rail's card is drawn from it. */
export interface FolderView {
  folderId: string;
  path: string;
  short: string;
  name: string;
  location: FolderLocation;
  primary: boolean;
  others: string[];
  syncedAt: number;
  syncNote: string | null;
  syncBy: string | null;
  state: StateNow[];
  ahead: boolean;
  changes: FolderChange[];
  commits: FolderCommit[];
  truncated: boolean;
  notListed: string[];
  protocol: ProtocolState;
  git: boolean;
  exclude: boolean;
  pointerClaude: boolean;
  pointerAgents: boolean;
  hasClaudeMd: boolean;
  hasAgentsMd: boolean;
  claudePoints: boolean;
  agentsPoints: boolean;
  needsText: { rel: string; path: string }[];
}

export interface FolderCandidate {
  spec: string;
  path: string;
  recommended: boolean;
  modified: number;
}

export interface FolderInspect {
  path: string;
  short: string;
  name: string;
  git: boolean;
  hasClaudeMd: boolean;
  hasAgentsMd: boolean;
  hasProtocol: boolean;
  linkedTo: string[];
  parent: string | null;
  children: string[];
  candidates: FolderCandidate[];
  files: number;
  truncated: boolean;
  notListed: string[];
}

export interface ConnectArgs {
  threadId: string;
  path: string;
  stateFiles: string[];
  gitExclude: boolean;
  pointerClaude: boolean;
  pointerAgents: boolean;
}

/** How many state files a project may pick (folder_link.rs `MAX_STATE_FILES`). */
export const MAX_STATE_FILES = 3;

export const inspectFolder = (path: string): Promise<FolderInspect> => invoke('folder_inspect', { path });
export const connectFolder = (args: ConnectArgs): Promise<void> => invoke('folder_connect', { args });
export const folderView = (threadId: string): Promise<FolderView | null> => invoke('folder_view', { threadId });
export const markFolderSynced = (threadId: string): Promise<void> => invoke('folder_mark_synced', { threadId });
export const setFolderStateFiles = (threadId: string, stateFiles: string[]): Promise<void> =>
  invoke('folder_set_state_files', { threadId, stateFiles });
export const setFolderPrimary = (threadId: string): Promise<void> => invoke('folder_set_primary', { threadId });
export const disconnectFolder = (threadId: string, remove: boolean, isPrivate = false): Promise<void> =>
  invoke('folder_disconnect', { threadId, remove, private: isPrivate });
export const rewriteProtocol = (threadId: string): Promise<void> => invoke('folder_rewrite_protocol', { threadId });
export const protocolDiff = (threadId: string): Promise<[string, string]> =>
  invoke('folder_protocol_diff', { threadId });
export const relocateFolder = (threadId: string, path: string): Promise<void> =>
  invoke('folder_relocate', { threadId, path });
export const cacheStateText = (threadId: string, rel: string, text: string): Promise<void> =>
  invoke('folder_cache_text', { threadId, rel, text });
export const aheadThreads = (): Promise<string[]> => invoke('folder_ahead_threads');
export const setFolderPointers = (threadId: string, claude: boolean, agents: boolean): Promise<void> =>
  invoke('folder_set_pointers', { threadId, claude, agents });
export const setGlobalHint = (on: boolean): Promise<string[]> => invoke('folder_global_hint', { on });
/** [threadId, shortened path] for each of these projects that is linked. */
export const linkedPaths = (threadIds: string[]): Promise<[string, string][]> =>
  invoke('folder_linked_paths', { threadIds });

/** What a refusal from folder_link.rs means, in words. */
export const folderError = (e: unknown): string => {
  const code = e instanceof Error ? e.message : String(e);
  switch (code) {
    case 'private':
      return t('私密项目不连文件夹：连了之后仓库里的 AI 会知道它存在');
    case 'already_linked':
      return t('这个项目已经连着一个文件夹了');
    case 'missing':
      return t('那个位置上已经没有这个文件夹了');
    case 'not_a_folder':
      return t('这里要选一个文件夹');
    case 'too_many':
      return t('现状文件最多选 {n} 份', { n: MAX_STATE_FILES });
    case 'folder_missing':
      return t('Spool 现在找不到这个文件夹');
    default:
      return t('没改成：{msg}', { msg: code });
  }
};
