import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';

// The two macOS grants capture needs, shared by the two surfaces that must never contradict
// each other (DESIGN_FIRST_RUN 拍板点 2/4): the onboarding banner and the empty-thread
// copy. `null` = unknown (outside Tauri, or before the first check) — callers keep the
// granted wording in that case rather than claiming something is missing with no
// evidence. PermissionBanner owns the re-check on window focus, i.e. on the way back
// from System Settings.
//
// 2026-10-30 (DISCOVERED-20261030-5): Accessibility is checked too. The banner used to look
// at Input Monitoring alone, so it went away as soon as that one was on, while the capture
// card still could not take the keyboard.
export type CapturePermission = 'input_monitoring' | 'accessibility';

interface PermissionState {
  inputMonitoring: boolean | null;
  accessibility: boolean | null;
  // false = macOS has never asked about Input Monitoring: its dialog is still to come, so
  // the banner explains before the first press sends the user there.
  asked: boolean | null;
  // Seen something missing at least once this session — what tells "granted all along"
  // (say nothing) apart from "granted just now" (the tap is deaf until relaunch).
  everDenied: boolean;
  // The user went to System Settings from the banner this session.
  requested: boolean;
  check: () => Promise<void>;
  open: (which: CapturePermission) => Promise<void>;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  inputMonitoring: null,
  accessibility: null,
  asked: null,
  everDenied: false,
  requested: false,

  check: async () => {
    try {
      const [inputMonitoring, accessibility, asked] = await Promise.all([
        invoke<boolean>('input_monitoring_granted'),
        invoke<boolean>('accessibility_granted'),
        invoke<boolean>('input_monitoring_asked'),
      ]);
      set((s) => ({
        inputMonitoring,
        accessibility,
        asked,
        everDenied: s.everDenied || !inputMonitoring || !accessibility,
      }));
    } catch {
      // Non-Tauri context (tests / plain vite) — leave the grants unknown.
    }
  },

  // 拍板点 3: startup only preflights, so a press here is where macOS's dialogs come from.
  // Rust asks for that one switch (which puts Spool in its list) and opens its pane.
  open: async (which) => {
    set({ requested: true });
    try {
      await invoke('open_capture_permission', { which });
    } catch (e) {
      console.warn('[permission] open_capture_permission failed', e);
    }
    await get().check();
  },
}));
