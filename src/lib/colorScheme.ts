// 深浅色 (P9B-1, 2026-10-14; Ocean 2026-10-10 第 55、60、61 条) — what the setting IS and
// which scheme it comes to. The hooks that read the store live in hooks/useColorScheme.ts.
//
// Ocean: 「我觉得可以加入一个跟随系统切换颜色深浅的功能，自动开启」 and, when asked, a three-way
// switch in Settings — 跟随系统 / 浅色 / 深色, default 跟随系统 (第 61 条) — with 情人节版 staying
// light whatever the system does (第 60 条).
//
// ⚠️ Separate from the theme on purpose. The theme says WHICH palette (经典 / 情人节); this says
// light or dark, and only 经典 has a dark one. They are two attributes on <html>
// (`data-theme`, `data-scheme`) that CSS combines — tokens.css has the dark block under
// `:root[data-scheme='dark']:not([data-theme='valentine'])`.
//
// ⚠️ **This module imports nothing**, same reason as lib/theme.ts: settingsStore imports it for
// the default and the validator.

/** The user's choice in Settings. `system` = follow macOS / Windows. */
export type ColorScheme = 'system' | 'light' | 'dark';

/** What actually gets painted. */
export type Scheme = 'light' | 'dark';

/** The order the Settings switch draws them. 跟随系统 first — it is the default. */
export const COLOR_SCHEMES: readonly ColorScheme[] = ['system', 'light', 'dark'] as const;

export const DEFAULT_COLOR_SCHEME: ColorScheme = 'system';

export const isColorScheme = (v: unknown): v is ColorScheme =>
  v === 'system' || v === 'light' || v === 'dark';

/** settings.json is hand-editable and a library can be carried to another build, so an
 *  unrecognised value has to mean 跟随系统 — the default — rather than a half-painted page. */
export const colorSchemeOrDefault = (v: unknown): ColorScheme =>
  isColorScheme(v) ? v : DEFAULT_COLOR_SCHEME;

/** Light or dark, given the theme, the setting and what the system is doing.
 *  ⛔ 情人节 is always light (第 60 条) — checked first, so no setting can reach past it. */
export const effectiveScheme = (theme: string, setting: ColorScheme, systemDark: boolean): Scheme => {
  if (theme === 'valentine') return 'light';
  if (setting === 'light' || setting === 'dark') return setting;
  return systemDark ? 'dark' : 'light';
};

/** The attribute CSS selects on. Named once so the windows, the boot script's test and
 *  tokens.css cannot drift. */
export const SCHEME_ATTR = 'data-scheme';

/** The media query the system's appearance answers. */
export const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

/** Put the scheme on <html>. `light` is written out too, like applyTheme does with `classic`. */
export const applyScheme = (scheme: Scheme, root: Element): void => {
  root.setAttribute(SCHEME_ATTR, scheme);
};

// ---- The first frame ---------------------------------------------------------------------
//
// Settings arrive a few hundred milliseconds after the window first paints, and a dark-system
// user must not see a cream window first (P9B-1 第 6 条). public/scheme-boot.js runs before the
// first paint and decides from this hint — the last thing the app applied — or, with no hint,
// from the system. ⚠️ A separate file because the CSP (`script-src 'self'`, never edited) refuses
// inline scripts.

/** localStorage key the boot script reads. ⚠️ Spelled the same in public/scheme-boot.js
 *  (colorScheme.test.ts reads that file and holds the two together). */
export const SCHEME_HINT_KEY = 'spool.schemeHint';

/** What the boot script should do next launch: a fixed answer, or 'system' to ask the system.
 *  情人节 is stored as 'light' because that is what it always paints. */
export const schemeHint = (theme: string, setting: ColorScheme): ColorScheme =>
  theme === 'valentine' ? 'light' : setting;

/** Remember the hint. A missing or blocked localStorage only costs the first frame. */
export const writeSchemeHint = (hint: ColorScheme): void => {
  try {
    localStorage.setItem(SCHEME_HINT_KEY, hint);
  } catch {
    // private storage, quota — the next launch just asks the system
  }
};
