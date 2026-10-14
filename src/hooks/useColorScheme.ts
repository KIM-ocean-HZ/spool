// 深浅色 (P9B-1, 2026-10-14) — reading the setting and the system, writing <html>. The type and
// the rule are in lib/colorScheme.ts (it imports nothing, so settingsStore can import it); this
// file is the half that touches the store and the window.

import { useEffect, useSyncExternalStore } from 'react';
import {
  applyScheme,
  effectiveScheme,
  schemeHint,
  SYSTEM_DARK_QUERY,
  writeSchemeHint,
  type Scheme,
} from '@/lib/colorScheme';
import { useSettingsStore } from '@/stores/settingsStore';

const subscribeSystem = (onChange: () => void): (() => void) => {
  const mq = window.matchMedia(SYSTEM_DARK_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};

/** Whether the system is dark right now — and it re-renders when the user switches macOS /
 *  Windows between light and dark, so Spool follows at once with no restart (第 4 条).
 *  Light when rendered outside a window (the static-page screenshots). */
export const useSystemDark = (): boolean =>
  useSyncExternalStore(
    subscribeSystem,
    () => window.matchMedia(SYSTEM_DARK_QUERY).matches,
    () => false,
  );

/** Light or dark, as painted. ⚠️ For a component that has to DRAW something different in the
 *  dark — not for picking a colour: colours come from tokens.css (see hooks/useTheme.ts). */
export const useScheme = (): Scheme => {
  const theme = useSettingsStore((s) => s.theme);
  const setting = useSettingsStore((s) => s.colorScheme);
  return effectiveScheme(theme, setting, useSystemDark());
};

/** Mounted once per window (App, CaptureOverlay).
 *
 *  - main: `ready` is `loaded`. ⚠️ Until the settings arrive the store holds its defaults, and
 *    applying those would undo what public/scheme-boot.js painted the first frame with — a
 *    user who picked 浅色 on a dark system would see light → dark → light at every launch. So
 *    nothing is written before then; the boot script's attribute stands. `rememberHint` leaves
 *    what was applied for the next launch's first frame.
 *  - capture overlay: always ready. It cannot read settings.json (separate process, no `store:`
 *    permission); Rust pushes the setting with every show, BEFORE the content, and the card
 *    draws nothing until its content arrives — so the first visible frame is already right.
 *    It does not write the hint: the main window is the one that knows the settings. */
export const useAppliedColorScheme = ({
  ready,
  rememberHint,
}: {
  ready: boolean;
  rememberHint: boolean;
}): void => {
  const theme = useSettingsStore((s) => s.theme);
  const setting = useSettingsStore((s) => s.colorScheme);
  const scheme = effectiveScheme(theme, setting, useSystemDark());
  useEffect(() => {
    if (!ready) return;
    applyScheme(scheme, document.documentElement);
    if (rememberHint) writeSchemeHint(schemeHint(theme, setting));
  }, [ready, rememberHint, scheme, theme, setting]);
};
