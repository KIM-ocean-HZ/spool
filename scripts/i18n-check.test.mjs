/* The same scan as `node scripts/i18n-check.mjs`, run inside vitest. The script existed but
   nothing ran it, so a Chinese literal missing from the dictionary (and therefore shown in
   Chinese on the default English UI) sat there reported-but-unread (HANDOFF `20260830-17`). */
import { describe, expect, it } from 'vitest';

import { scan } from './i18n-check.mjs';

describe('every Chinese t()/ts() literal is in the dictionary', () => {
  const { used, missing } = scan();

  // A scan that matched nothing would pass the next test vacuously.
  it('finds t()/ts() calls at all', () => {
    expect(used.size).toBeGreaterThan(0);
  });

  it('has none missing', () => {
    expect(missing.map(([key, file]) => `${file}  ${key}`)).toEqual([]);
  });
});
