import { describe, expect, it } from 'vitest';
import type { Thread, ThreadStatus } from '@/lib/db/threads';
import type { Workspace } from '@/lib/db/workspaces';
import { archivePlan, splitArchived, subtreeWorkspaceIds } from './archive';
import { buildWorkspaceTree, type WorkspaceNode } from './tree';

const ws = (id: string, parentId: string | null = null): Workspace => ({
  id,
  title: id,
  parentId,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
});

let seq = 0;
const th = (
  workspaceId: string,
  status: ThreadStatus,
  extra: Partial<Thread> = {},
): Thread => ({
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

const group = (threads: Thread[]): Record<string, Thread[]> => {
  const out: Record<string, Thread[]> = {};
  for (const t of threads) (out[t.workspaceId] ??= []).push(t);
  return out;
};

const outline = (nodes: WorkspaceNode[]): string[] => {
  const out: string[] = [];
  const walk = (ns: WorkspaceNode[]): void => {
    for (const n of ns) {
      out.push(`${n.workspace.id}@${n.depth}`);
      walk(n.children);
    }
  };
  walk(nodes);
  return out;
};

const split = (workspaces: Workspace[], threads: Thread[]) => {
  const r = splitArchived(buildWorkspaceTree(workspaces), group(threads));
  return {
    live: outline(r.live),
    archived: r.archived.map(
      (e) => `${[...e.ancestors.map((a) => a.id), e.node.workspace.id].join(' / ')}`,
    ),
    archivedOutline: outline(r.archived.map((e) => e.node)),
  };
};

describe('splitArchived (Ocean 2026-09-30 #9: archived = every project done)', () => {
  it('archives a workspace whose projects are all done', () => {
    expect(split([ws('a'), ws('b')], [th('a', 'done'), th('a', 'done'), th('b', 'active')])).toEqual({
      live: ['b@0'],
      archived: ['a'],
      archivedOutline: ['a@0'],
    });
  });

  it('keeps an empty workspace in the tree — nothing to be finished with', () => {
    expect(split([ws('a')], []).live).toEqual(['a@0']);
  });

  it('keeps a workspace with even one unfinished project, parked counts as unfinished', () => {
    expect(split([ws('a')], [th('a', 'done'), th('a', 'parked')]).archived).toEqual([]);
  });

  it('judges the whole subtree: an unfinished project in a child keeps the parent', () => {
    const r = split([ws('p'), ws('c', 'p')], [th('p', 'done'), th('c', 'active')]);
    expect(r.live).toEqual(['p@0', 'c@1']);
    expect(r.archived).toEqual([]);
  });

  it('archives a parent with no projects of its own when everything below it is done', () => {
    expect(split([ws('p'), ws('c', 'p')], [th('c', 'done')]).archived).toEqual(['p']);
  });

  it('moves a finished sub-workspace out alone, naming the parent it left', () => {
    const r = split(
      [ws('p'), ws('c', 'p'), ws('g', 'c'), ws('d', 'p')],
      [th('p', 'active'), th('g', 'done'), th('d', 'active')],
    );
    expect(r.live).toEqual(['p@0', 'd@1']);
    expect(r.archived).toEqual(['p / c']);
    // Drawn from the top in the 归档 section, its own child one level in.
    expect(r.archivedOutline).toEqual(['c@0', 'g@1']);
  });

  // ⚠️ The edge the taskbook flagged: the empty child is NOT archived by the rule, but the
  // group it was drawn inside has left the tree. It goes along rather than falling out.
  it('carries an empty sub-workspace along with its archived parent', () => {
    const r = split([ws('p'), ws('empty', 'p')], [th('p', 'done')]);
    expect(r.live).toEqual([]);
    expect(r.archived).toEqual(['p']);
    expect(r.archivedOutline).toEqual(['p@0', 'empty@1']);
  });

  it('drops no workspace: every one lands in exactly one half', () => {
    const workspaces = [
      ws('a'),
      ws('a1', 'a'),
      ws('a2', 'a'),
      ws('a2x', 'a2'),
      ws('b'),
      ws('b1', 'b'),
      ws('orphan', 'gone'),
      ws('r1', 'r2'),
      ws('r2', 'r1'),
    ];
    const threads = [
      th('a', 'active'),
      th('a1', 'done'),
      th('a2x', 'done'),
      th('b1', 'done'),
      th('orphan', 'done'),
      th('r1', 'done'),
    ];
    const r = split(workspaces, threads);
    const seen = [...r.live, ...r.archivedOutline].map((s) => s.split('@')[0]);
    expect(seen.sort()).toEqual(workspaces.map((w) => w.id).sort());
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe('archivePlan (right-click 归档)', () => {
  const tree = buildWorkspaceTree([ws('w'), ws('w1', 'w'), ws('other')]);

  it('finishes only the unfinished projects in the subtree', () => {
    const open = th('w', 'active');
    const parked = th('w1', 'parked');
    const done = th('w', 'done');
    const elsewhere = th('other', 'active');
    const plan = archivePlan(tree, [open, parked, done, elsewhere], 'w');
    expect(plan.toComplete.map((t) => t.id).sort()).toEqual([open.id, parked.id].sort());
  });

  it('leaves the capture target alone when it is outside the subtree', () => {
    const plan = archivePlan(
      tree,
      [th('w', 'active'), th('other', 'active', { isCaptureTarget: true })],
      'w',
    );
    expect(plan.captureFrom).toBeNull();
    expect(plan.captureTo).toBeNull();
  });

  it('moves the capture target to the most recently updated unfinished project outside', () => {
    const target = th('w1', 'active', { isCaptureTarget: true });
    const older = th('other', 'active', { updatedAt: 10 });
    const newer = th('other', 'parked', { updatedAt: 20 });
    const newestButDone = th('other', 'done', { updatedAt: 30 });
    const plan = archivePlan(tree, [target, older, newer, newestButDone], 'w');
    expect(plan.captureFrom?.id).toBe(target.id);
    expect(plan.captureTo?.id).toBe(newer.id);
  });

  // An already-finished project can hold the target too; after archiving it is still in a
  // finished workspace, so it moves all the same.
  it('moves a capture target that was already on a done project in the subtree', () => {
    const target = th('w', 'done', { isCaptureTarget: true });
    const out = th('other', 'active');
    const plan = archivePlan(tree, [target, th('w', 'active'), out], 'w');
    expect(plan.captureTo?.id).toBe(out.id);
  });

  it('has nowhere to send captures when nothing unfinished is left outside', () => {
    const target = th('w', 'active', { isCaptureTarget: true });
    const plan = archivePlan(tree, [target, th('other', 'done')], 'w');
    expect(plan.captureFrom?.id).toBe(target.id);
    expect(plan.captureTo).toBeNull();
  });

  it('subtreeWorkspaceIds covers the workspace and everything inside it', () => {
    expect([...subtreeWorkspaceIds(tree, 'w')].sort()).toEqual(['w', 'w1']);
    expect([...subtreeWorkspaceIds(tree, 'missing')]).toEqual([]);
  });
});
