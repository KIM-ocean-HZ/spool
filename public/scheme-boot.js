// 深浅色的第一帧 (P9B-1, 2026-10-14). Runs synchronously in <head>, before the page paints:
// a dark-system user must not see a cream window first and then watch it turn dark when the
// settings arrive (P9B-1 第 6 条).
//
// ⚠️ Why this is a separate file and not a few lines in main.tsx: main.tsx is a module script —
// deferred, and large — so WebKit can paint the body once before it runs. And it cannot be an
// inline <script> in index.html: the CSP is `script-src 'self'` and is never edited (§10.6).
// A same-origin classic script in <head> is the one thing that runs before the first paint.
//
// ⚠️ It only sets the first frame. Once settings have loaded, hooks/useColorScheme.ts owns the
// attribute. The rule here must stay the same as lib/colorScheme.ts `effectiveScheme` +
// `schemeHint` (colorScheme.test.ts runs this file against them).
(function () {
  var hint = null;
  try {
    hint = window.localStorage.getItem('spool.schemeHint');
  } catch (e) {
    hint = null;
  }
  var dark;
  if (hint === 'light') dark = false;
  else if (hint === 'dark') dark = true;
  else {
    try {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {
      dark = false;
    }
  }
  document.documentElement.setAttribute('data-scheme', dark ? 'dark' : 'light');
})();
