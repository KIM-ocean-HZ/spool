import { describe, expect, it } from 'vitest';
import type { Thread, ThreadStatus } from '@/lib/db/threads';
import type { Workspace } from '@/lib/db/workspaces';
import { buildWorkspaceTree } from '@/lib/workspaces/tree';
import { captureHome } from './captureHome';

const ws = (id: string, sortOrder: number, parentId: string | null = null): Workspace => ({
  id,
  title: id,
  parentId,
  sortOrder,
  createdAt: 0,
  updatedAt: 0,
});

let seq = 0;
const th = (workspaceId: string, status: ThreadStatus, extra: Partial<Thread> = {}): Thread => ({
  id: `t${++seq}`,
  workspaceId,
  title: '',
  summary: null,
  digest: null,
  deadline: null,
  status,
  isCaptureTarget: false,
  createdAt: 0,
  updatedAt: 0,
  completedAt: null,
  autoMaintain: null,
  isPrivate: false,
  ...extra,
});

const none = { threads: new Set<string>(), workspaces: new Set<string>() };

// DISCOVERED-20261112-7 (Ocean 第 338 条): where capture goes when its project is finished.
describe('captureHome', () => {
  const roots = buildWorkspaceTree([ws('inbox', 0), ws('work', 1), ws('sub', 0, 'work')]);

  it('finds the unfinished 未分类 by title, in either language, oldest first', () => {
    const en = th('work', 'active', { title: 'Unsorted ', createdAt: 5 });
    const zh = th('inbox', 'active', { title: '未分类', createdAt: 9 });
    expect(captureHome(roots, [zh, en], none)).toEqual({ to: en, newIn: null });
  });

  it('skips a finished one, and the projects being finished', () => {
    const finished = th('inbox', 'done', { title: '未分类' });
    const leaving = th('inbox', 'active', { title: '未分类' });
    const home = captureHome(roots, [finished, leaving], { ...none, threads: new Set([leaving.id]) });
    expect(home).toEqual({ to: null, newIn: 'inbox' });
  });

  it('never picks some other project — no 未分类 means a new one', () => {
    const busy = th('inbox', 'active', { title: 'Thesis', updatedAt: 99 });
    expect(captureHome(roots, [busy], none)).toEqual({ to: null, newIn: 'inbox' });
  });

  it('makes the new one in the first workspace that is not on its way out', () => {
    const leaving = { threads: new Set<string>(), workspaces: new Set(['inbox', 'work']) };
    expect(captureHome(roots, [], leaving)).toEqual({ to: null, newIn: 'sub' });
    const all = { threads: new Set<string>(), workspaces: new Set(['inbox', 'work', 'sub']) };
    expect(captureHome(roots, [], all)).toEqual({ to: null, newIn: null });
  });
});
