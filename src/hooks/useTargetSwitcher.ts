import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { SHOW_SWITCHER_COMMAND, SWITCHER_TRIGGER_EVENT } from '@/lib/capture/overlayProtocol';
import { buildSwitcherPayload } from '@/lib/capture/switcher';
import { t } from '@/lib/i18n';
import { useThreadsStore } from '@/stores/threadsStore';
import { useWorkspacesStore } from '@/stores/workspacesStore';

// P15-4（Ocean 2026-11-06 第 255 – 256 条）：双击 ⇧ —— Rust 看见手势，这里排好项目（最近用过的在前），交回 Rust 在
// 鼠标指针那儿弹面板（switcher.rs）。选了什么回来走 useCapture 的 `switch-target`。
// 红线：主窗永不跳前（记忆 capture-note-first）—— 这里一次 `raise_main_window` 都没有，主窗藏着也照样答。
export function useTargetSwitcher(): void {
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      const dispose = await listen(SWITCHER_TRIGGER_EVENT, () => {
        const payload = buildSwitcherPayload(
          useThreadsStore.getState().threadsByWorkspace,
          useWorkspacesStore.getState().workspaces,
          t('未命名'),
        );
        void invoke(SHOW_SWITCHER_COMMAND, { payload }).catch((e) => console.error('[switcher] show failed', e));
      });
      if (cancelled) dispose();
      else unlisten = dispose;
    })();
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, []);
}
