import { describe, expect, it } from 'vitest';
import type { Thread } from '@/lib/db/threads';
import type { Workspace } from '@/lib/db/workspaces';
import { tenThousands, wsMaterialChars, wsStaleAvailable, wsStalePlan, workspaceSubtree } from './workspace';

const ws = (id: string, parentId: string | null = null): Workspace => ({
  id,
  title: id.toUpperCase(),
  parentId,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
});
const th = (id: string, workspaceId: string, extra: Partial<Thread> = {}): Thread => ({
  id,
  workspaceId,
  title: id,
  summary: null,
  digest: null,
  deadline: null,
  status: 'active',
  isCaptureTarget: false,
  createdAt: 0,
  updatedAt: 0,
  completedAt: null,
  autoMaintain: null,
  isPrivate: false,
  ...extra,
});

describe('P9V-2 · 查整个工作区发哪些项目', () => {
  // 升学 ⊃ 学校；推荐信 是另一棵。
  const workspaces = [ws('shengxue'), ws('xuexiao', 'shengxue'), ws('tuijianxin')];
  const byWs = {
    shengxue: [th('a', 'shengxue', { createdAt: 30 }), th('done', 'shengxue', { status: 'done' })],
    xuexiao: [th('b', 'xuexiao', { createdAt: 10 }), th('secret', 'xuexiao', { isPrivate: true })],
    tuijianxin: [th('other', 'tuijianxin')],
  };

  it('⭐ 连子工作区一起；已完成的不发；私密的不发但数出来；按建立时间排', () => {
    const plan = wsStalePlan('shengxue', workspaces, byWs)!;
    expect(plan.workspace.id).toBe('shengxue');
    expect(plan.threads.map((t) => t.id)).toEqual(['b', 'a']);
    expect(plan.skippedPrivate).toBe(1);
  });

  it('子工作区只管它自己那一棵，不往上找', () => {
    expect(wsStalePlan('xuexiao', workspaces, byWs)!.threads.map((t) => t.id)).toEqual(['b']);
  });

  it('⛔ 已完成的私密项目不算「跳过的私密项目」—— 它本来就不参与', () => {
    const plan = wsStalePlan('w', [ws('w')], { w: [th('x', 'w', { isPrivate: true, status: 'done' })] })!;
    expect(plan.skippedPrivate).toBe(0);
  });

  it('能发的不到两个就不出「查整个工作区」', () => {
    expect(wsStaleAvailable(wsStalePlan('shengxue', workspaces, byWs))).toBe(true);
    expect(wsStaleAvailable(wsStalePlan('xuexiao', workspaces, byWs))).toBe(false);
    expect(wsStaleAvailable(wsStalePlan('gone', workspaces, byWs))).toBe(false);
  });

  it('库被手改出一个环也不会转死', () => {
    const ring = [ws('x', 'y'), ws('y', 'x')];
    expect([...workspaceSubtree(ring, 'x')].sort()).toEqual(['x', 'y']);
  });

  it('字数 = 各项目 pack + 名字 + 分隔行；「约几万字」', () => {
    expect(wsMaterialChars([{ title: 'ab', text: 'x'.repeat(100) }])).toBe(118);
    expect(tenThousands(58_000)).toBe('5.8');
    expect(tenThousands(120_000)).toBe('12');
    expect(tenThousands(30_000)).toBe('3');
  });
});
