import { describe, expect, it } from 'vitest';
import { titleKey, uniqueTitle } from './uniqueTitle';

// P9-1 — the rule on its own. Where it is applied (and what counts as "beside it": live rows
// only, projects never against workspaces) is pinned in lib/db/uniqueNames.test.ts.
describe('uniqueTitle (P9-1)', () => {
  it('keeps a name nobody beside it has', () => {
    expect(uniqueTitle('Flux', ['申请规划', 'Lecture 4'])).toBe('Flux');
  });

  it('adds 「 2」 to a name already taken, 「 3」 when that is taken too', () => {
    expect(uniqueTitle('Flux', ['Flux'])).toBe('Flux 2');
    expect(uniqueTitle('Flux', ['Flux', 'Flux 2'])).toBe('Flux 3');
  });

  it('does not tell case apart — a Mac disk does not either', () => {
    expect(uniqueTitle('notes', ['Notes'])).toBe('notes 2');
    expect(uniqueTitle('flux', ['Flux', 'FLUX 2'])).toBe('flux 3');
  });

  it('ignores blanks around a name, and does not carry them into the new one', () => {
    expect(uniqueTitle('  Flux ', ['Flux'])).toBe('Flux 2');
    expect(uniqueTitle('Flux', [' flux  '])).toBe('Flux 2');
  });

  it('never renames an empty name — several 「无标题」 are fine', () => {
    expect(uniqueTitle('', ['', ''])).toBe('');
    expect(uniqueTitle('   ', ['', '  '])).toBe('   ');
  });

  it('an empty name beside it does not make a named one collide', () => {
    expect(uniqueTitle('Flux', ['', ' '])).toBe('Flux');
  });

  it('compares by trimmed, lower-cased text', () => {
    expect(titleKey('  Lecture 3 ')).toBe('lecture 3');
  });
});
