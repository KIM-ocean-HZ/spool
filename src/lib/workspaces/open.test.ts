import { describe, expect, it } from 'vitest';
import type { Workspace } from '@/lib/db/workspaces';
import { nextExpandedIds, workspaceChain } from './open';

const ws = (id: string, parentId: string | null = null): Workspace => ({
  id,
  title: id,
  parentId,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
});

describe('workspaceChain', () => {
  it('walks from the workspace up to the top level', () => {
    const all = [ws('升学'), ws('材料准备', '升学'), ws('文书', '材料准备'), ws('求职')];
    expect(workspaceChain(all, '文书')).toEqual(['文书', '材料准备', '升学']);
    expect(workspaceChain(all, '求职')).toEqual(['求职']);
  });

  it('is empty when no project is open, or its workspace is not in the list', () => {
    expect(workspaceChain([ws('a')], null)).toEqual([]);
    expect(workspaceChain([ws('a')], 'gone')).toEqual([]);
  });

  it('stops at an orphan and at a ring instead of spinning', () => {
    expect(workspaceChain([ws('a', 'gone')], 'a')).toEqual(['a']);
    expect(workspaceChain([ws('a', 'b'), ws('b', 'a')], 'a')).toEqual(['a', 'b']);
  });
});

describe('nextExpandedIds', () => {
  const all = [ws('a'), ws('b'), ws('c')];

  it('adds on open without duplicating, removes on close', () => {
    expect(nextExpandedIds(['a'], all, ['b'], true)).toEqual(['a', 'b']);
    expect(nextExpandedIds(['a'], all, ['a'], true)).toEqual(['a']);
    expect(nextExpandedIds(['a', 'b'], all, ['a'], false)).toEqual(['b']);
  });

  it('drops ids the library no longer has', () => {
    expect(nextExpandedIds(['gone', 'a'], all, ['c'], true)).toEqual(['a', 'c']);
    expect(nextExpandedIds(['gone', 'a'], all, ['a'], false)).toEqual([]);
    expect(nextExpandedIds([], all, ['gone'], true)).toEqual([]);
  });
});
