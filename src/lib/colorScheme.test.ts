import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  COLOR_SCHEMES,
  SCHEME_ATTR,
  SCHEME_HINT_KEY,
  colorSchemeOrDefault,
  effectiveScheme,
  schemeHint,
  type ColorScheme,
} from './colorScheme';

// 深浅色 (P9B-1, 2026-10-14; Ocean 第 55、60、61 条).

describe('colorSchemeOrDefault', () => {
  it('keeps the three it knows', () => {
    for (const v of COLOR_SCHEMES) expect(colorSchemeOrDefault(v)).toBe(v);
  });

  it('reads anything else as 跟随系统 — settings.json can be edited by hand', () => {
    for (const v of ['Dark', 'auto', '', null, undefined, 1, true, {}]) {
      expect(colorSchemeOrDefault(v)).toBe('system');
    }
  });
});

describe('effectiveScheme', () => {
  it('跟随系统 follows the system', () => {
    expect(effectiveScheme('classic', 'system', true)).toBe('dark');
    expect(effectiveScheme('classic', 'system', false)).toBe('light');
  });

  it('浅色 / 深色 hold whatever the system does', () => {
    for (const systemDark of [true, false]) {
      expect(effectiveScheme('classic', 'light', systemDark)).toBe('light');
      expect(effectiveScheme('classic', 'dark', systemDark)).toBe('dark');
    }
  });

  it('⛔ 情人节 is always light — no setting, no system reaches past it (第 60 条)', () => {
    for (const setting of COLOR_SCHEMES) {
      for (const systemDark of [true, false]) {
        expect(effectiveScheme('valentine', setting, systemDark)).toBe('light');
      }
    }
  });
});

// public/scheme-boot.js paints the first frame before React exists, so it cannot import the
// rule above — it repeats it. These run the real file in a sandbox and hold the two together:
// for every theme × setting × system, the first frame the boot script paints from the hint the
// app left is the scheme the app itself would paint.
describe('public/scheme-boot.js', () => {
  const boot = readFileSync(
    fileURLToPath(new URL('../../public/scheme-boot.js', import.meta.url)),
    'utf8',
  );
  const run = (stored: string | null, systemDark: boolean, storageThrows = false): string => {
    const attrs: Record<string, string> = {};
    runInNewContext(boot, {
      window: {
        localStorage: {
          getItem: (k: string) => {
            if (storageThrows) throw new Error('blocked');
            return k === SCHEME_HINT_KEY ? stored : null;
          },
        },
        matchMedia: (q: string) => ({ matches: q === '(prefers-color-scheme: dark)' && systemDark }),
      },
      document: { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } },
    });
    return attrs[SCHEME_ATTR];
  };

  it('paints the same first frame the app paints after loading settings', () => {
    for (const theme of ['classic', 'valentine']) {
      for (const setting of COLOR_SCHEMES as readonly ColorScheme[]) {
        for (const systemDark of [true, false]) {
          expect(run(schemeHint(theme, setting), systemDark), `${theme} ${setting} ${systemDark}`).toBe(
            effectiveScheme(theme, setting, systemDark),
          );
        }
      }
    }
  });

  it('with no hint (first launch), or an unreadable one, follows the system', () => {
    expect(run(null, true)).toBe('dark');
    expect(run(null, false)).toBe('light');
    expect(run('garbage', true)).toBe('dark');
    expect(run('dark', false, true)).toBe('light');
  });
});
