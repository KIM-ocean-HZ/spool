import { afterEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn(async (_cmd: string, _args?: Record<string, unknown>) => null);
vi.mock('@tauri-apps/api/core', () => ({ invoke: (cmd: string, args?: Record<string, unknown>) => invoke(cmd, args) }));

import { scheduleProtocolRefresh } from './refresh';

describe('scheduleProtocolRefresh', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    invoke.mockClear();
  });

  // P12-2: Rust takes a deleted workspace's names out of SPOOL.md only when it was deleted before this
  // window started — ⌘Z lives in the window, so anything older can no longer come back.
  it('waits out the typing, then refreshes once with when this window started', () => {
    vi.stubGlobal('window', {});
    vi.useFakeTimers();
    scheduleProtocolRefresh();
    scheduleProtocolRefresh();
    vi.advanceTimersByTime(1_999);
    expect(invoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(invoke.mock.calls).toEqual([['folder_refresh_protocols', { before: Math.floor(performance.timeOrigin) }]]);
  });
});
