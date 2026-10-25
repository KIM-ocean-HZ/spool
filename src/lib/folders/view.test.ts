import { describe, expect, it } from 'vitest';
import { defaultPicks, lineDiff, shortRel, stateTag, withoutAhead } from './view';

describe('folder view helpers (P9Y)', () => {
  it('pre-ticks the recommended files, three at most, in order', () => {
    const c = (spec: string, recommended: boolean) => ({ spec, path: spec, recommended, modified: 0 });
    expect(
      defaultPicks([c('README.md', true), c('a/HANDOFF_*.md', true), c('notes.md', false), c('PLAN.md', true), c('TODO.md', true)]),
    ).toEqual(['README.md', 'a/HANDOFF_*.md', 'PLAN.md']);
    expect(defaultPicks([c('notes.md', false)])).toEqual([]);
  });

  it('tags a state file that changed or went away, and nothing else', () => {
    expect(stateTag({ spec: 'a.md', path: 'a.md', changed: true })).toBe('changed');
    expect(stateTag({ spec: 'a.md', path: 'a.md', changed: false })).toBeNull();
    expect(stateTag({ spec: 'H_*.md', path: null, changed: true })).toBe('gone');
    expect(stateTag({ spec: 'H_*.md', path: null, changed: false })).toBeNull();
  });

  it('shortens a deep path but keeps the file name whole', () => {
    expect(shortRel('README.md')).toBe('README.md');
    expect(shortRel('docs/PLAN.md')).toBe('docs/PLAN.md');
    expect(shortRel('plans/dissertation/HANDOFF_2026-10-23.md')).toBe('plans/…/HANDOFF_2026-10-23.md');
  });

  it('diffs line by line', () => {
    expect(lineDiff('a\nb\nc', 'a\nB\nc')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'del', text: 'b' },
      { kind: 'add', text: 'B' },
      { kind: 'same', text: 'c' },
    ]);
    expect(lineDiff('x', 'x\ny').map((l) => l.kind)).toEqual(['same', 'add']);
  });

  it('keeps a project whose folder moved ahead out of the automatic follow-up', () => {
    const list = [{ id: 't1' }, { id: 't2' }];
    expect(withoutAhead(list, ['t1'])).toEqual([{ id: 't2' }]);
    expect(withoutAhead(list, [])).toBe(list);
  });
});
