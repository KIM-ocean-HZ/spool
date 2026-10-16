import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Thread } from '@/lib/db/threads';
import { t } from '@/lib/i18n';
import { useCompressStore } from './compressStore';
import { useEngineStore } from './engineStore';
import { useSettingsStore } from './settingsStore';
import { useThreadsStore } from './threadsStore';

// P9E-3 (Ocean 2026-10-15 第 122 条): Spool's own AI features never take a private project.
// The pages lock (ThreadView, FollowUpPanel, RightRail); these are the doors behind them — a
// queued run, a session left open from before the project went private, tonight's batch.
// ⚠️ Only `invoke` is fake, so what is asserted is that the request never left.

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...a: unknown[]) => invoke(...a) }));
vi.mock('@tauri-apps/api/event', () => ({
  listen: () => Promise.resolve(() => {}),
  emit: () => Promise.resolve(),
}));
vi.mock('@/lib/pack/forThread', () => ({
  buildThreadPack: () => Promise.resolve({ text: 'pack text', blocks: [], skippedCompressed: 0 }),
}));

const thread = (id: string, isPrivate: boolean): Thread => ({
  id,
  workspaceId: 'ws',
  title: isPrivate ? '体检' : '课表',
  summary: null,
  digest: null,
  deadline: null,
  status: 'active',
  isCaptureTarget: false,
  createdAt: 1,
  updatedAt: 1,
  completedAt: null,
  autoMaintain: null,
  isPrivate,
});

const called = (cmd: string): number => invoke.mock.calls.filter((c) => c[0] === cmd).length;

const okOutcome = {
  ok: true, text: 'short', cuts: null, kind: null, message: null, status: 200,
  inputTokens: 1, outputTokens: 1, cachedInputTokens: null, reasoningTokens: null, ms: 1, model: 'm',
};

describe('私密项目：Spool 自带的 AI 不碰 (P9E-3)', () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockImplementation((cmd: string) => {
      if (cmd === 'compress_pack_via_api') return Promise.resolve(okOutcome);
      if (cmd === 'stale_scan_via_api') return Promise.resolve({ proposals: [], dropped: [], outcome: okOutcome });
      if (cmd === 'api_key_load') return Promise.resolve('key');
      return Promise.resolve(null);
    });
    useThreadsStore.setState({
      threadsByWorkspace: { ws: [thread('secret', true), thread('open', false)] },
    });
    useCompressStore.setState({ sessions: {}, running: false, results: [], failures: [], batchRunning: false });
  });

  afterEach(() => {
    useThreadsStore.setState({ threadsByWorkspace: {} });
  });

  const session = (threadId: string) =>
    ({
      target: { kind: 'project', threadId, title: 't' },
      source: 'pack text',
      blocks: [],
      level: 'balanced',
      reasoning: 'off',
      outcome: null,
      patched: null,
      addedBack: [],
      restoredLines: [],
      retry: null,
      shield: null,
      probe: null,
      skippedCompressed: 0,
      startedAt: 0,
    }) as never;

  it('压缩：私密项目上一份留着的整理稿，点「开始压缩」也发不出去', async () => {
    useCompressStore.setState({ sessions: { secret: session('secret'), open: session('open') } });
    await useCompressStore.getState().run('secret');
    expect(called('compress_pack_via_api')).toBe(0);
    // The same path on a public project does go out — the fake is wired.
    await useCompressStore.getState().run('open');
    expect(called('compress_pack_via_api')).toBeGreaterThan(0);
  });

  it('过期检测：私密项目上不发', async () => {
    await useCompressStore.getState().runStaleScan('secret');
    expect(called('stale_scan_via_api')).toBe(0);
    expect(useCompressStore.getState().running).toBe(false);
    await useCompressStore.getState().runStaleScan('open');
    expect(called('stale_scan_via_api')).toBe(1);
  });

  it('今晚自动压缩：排在队里的私密项目跳过，早上的单子上说一声', async () => {
    useSettingsStore.setState({ compressQueue: ['secret', 'open'] });
    await useCompressStore.getState().runQueue();
    expect(called('compress_pack_via_api')).toBeGreaterThan(0);
    const results = useCompressStore.getState().results;
    expect(results.map((r) => r.target.threadId)).toEqual(['open']);
    expect(useCompressStore.getState().failures).toEqual([
      { title: '体检', why: t('私密项目，没有发给 AI') },
    ]);
  });

  it('本机引擎：私密项目排不进队', () => {
    const queued = useEngineStore.getState().enqueue('secret', '体检', 'follow_up', 60);
    expect(queued).toBe(false);
    expect(useEngineStore.getState().queue).toEqual([]);
    expect(called('ai_engine_run')).toBe(0);
  });
});
