/* The same scan as `node scripts/i18n-check.mjs`, run inside vitest. The script existed but
   nothing ran it, so a Chinese literal missing from the dictionary (and therefore shown in
   Chinese on the default English UI) sat there reported-but-unread (HANDOFF `20260830-17`). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

// P9F F3: the capture overlay names its translator `tr` (`const tr = useT()`, 26 calls). A
// scan that only knew `t(` / `ts(` could not see one of them — every key missing from the
// overlay would have been reported clean.
describe('a key only used through tr() is still checked', () => {
  it('reports a tr() literal the dictionary does not have', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spool-i18n-check-'));
    try {
      fs.mkdirSync(path.join(dir, 'src'));
      fs.writeFileSync(path.join(dir, 'src', 'Card.tsx'), "const a = tr('只在浮窗里的字');\nconst b = tr('字典里有的字');\n");
      const dict = path.join(dir, 'dict.ts');
      fs.writeFileSync(dict, "export const en = {\n  '字典里有的字': 'In the dictionary',\n};\n");
      const { missing } = scan(path.join(dir, 'src'), dict);
      expect(missing.map(([key]) => key)).toEqual(['只在浮窗里的字']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
