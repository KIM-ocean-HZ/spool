import { MAX_STATE_FILES, type FolderCandidate, type StateNow } from './api';

// P9Y — the small decisions the folder card and the connect steps make, kept apart so they can be
// tested without a webview.

/** The connect step's pre-ticks: the recommended names, in Spool's order, up to the limit. */
export const defaultPicks = (candidates: FolderCandidate[]): string[] =>
  candidates
    .filter((c) => c.recommended)
    .slice(0, MAX_STATE_FILES)
    .map((c) => c.spec);

/** A state file's tag on the card: changed since the sync, or gone from the folder. */
export const stateTag = (s: StateNow): 'changed' | 'gone' | null =>
  s.path === null ? (s.changed ? 'gone' : null) : s.changed ? 'changed' : null;

/** `plans/dissertation/HANDOFF_2026-10-23.md` → `plans/…/HANDOFF_2026-10-23.md`: the file name whole,
 *  the folders between cut, so a deep path still fits on one rail line. */
export const shortRel = (rel: string): string => {
  const parts = rel.split('/');
  return parts.length <= 2 ? rel : `${parts[0]}/…/${parts[parts.length - 1]}`;
};

export type DiffLine = { kind: 'same' | 'del' | 'add'; text: string };

/** Line by line, what 「看差别」 shows: Spool's section as the file has it (`a`), and as Spool would
 *  write it now (`b`). A plain longest-common-subsequence; the section is a few dozen lines. */
export const lineDiff = (a: string, b: string): DiffLine[] => {
  const x = a.split('\n');
  const y = b.split('\n');
  const lcs: number[][] = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) {
    for (let j = y.length - 1; j >= 0; j--) {
      lcs[i]![j] = x[i] === y[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) {
      out.push({ kind: 'same', text: x[i]! });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      out.push({ kind: 'del', text: x[i++]! });
    } else {
      out.push({ kind: 'add', text: y[j++]! });
    }
  }
  while (i < x.length) out.push({ kind: 'del', text: x[i++]! });
  while (j < y.length) out.push({ kind: 'add', text: y[j++]! });
  return out;
};

/** P9Y-b: the weekly automatic follow-up waits while a project's folder has moved ahead of it. */
export const withoutAhead = <T extends { id: string }>(candidates: T[], ahead: readonly string[]): T[] =>
  ahead.length === 0 ? candidates : candidates.filter((c) => !ahead.includes(c.id));
