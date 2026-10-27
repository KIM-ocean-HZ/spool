import { invoke } from '@tauri-apps/api/core';

// P9Y (task book §3.2 「Spool 什么时候重写自己那一段」): a project renamed, moved to another workspace,
// deleted or brought back changes what a linked folder's SPOOL.md says. Rust rewrites every folder's
// section where it is still as Spool left it (folder_link.rs `refresh_all`); a section the user edited
// is left alone and the folder's card asks.
//
// ⚠️ Debounced: a title is saved every 200 ms while it is typed (threadsStore.patch), and a pause after
// 「Lecture 3」 on the way to 「Lecture 3 notes」 must not write a file into the user's folder.
//
// P12-2: `before` = when this window started. ⌘Z lives in this window and starts empty, so a workspace
// deleted earlier is gone for good — its names leave its folder's SPOOL.md (folder_link.rs
// `forget_deleted`). One deleted since then stays named, in case it comes back.
const WAIT_MS = 2_000;
let timer: ReturnType<typeof setTimeout> | null = null;

export const scheduleProtocolRefresh = (): void => {
  if (typeof window === 'undefined') return;
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    try {
      invoke('folder_refresh_protocols', { before: Math.floor(performance.timeOrigin) }).catch((e) =>
        console.warn('[folders] SPOOL.md refresh failed', e),
      );
    } catch (e) {
      // No Tauri bridge (a test page): nothing to refresh.
      console.warn('[folders] SPOOL.md refresh unavailable', e);
    }
  }, WAIT_MS);
};
