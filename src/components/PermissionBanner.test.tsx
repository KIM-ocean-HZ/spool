import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn(async (..._a: unknown[]): Promise<unknown> => undefined);
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

import { usePermissionStore } from '@/stores/permissionStore';
import PermissionBanner from './PermissionBanner';

// DISCOVERED-20261030-5 (Ocean 10-30「需要在设置打开两个按钮，需要在提示中清晰指出，并且每次一键引导
// 用户去设置打开」): the bar names both switches, has one button per switch that is still off,
// and does not go away while either is off.
const initial = { ...usePermissionStore.getInitialState() };

// zustand v5 hands the server render `getInitialState()`, not `getState()`.
const render = (state: Partial<ReturnType<typeof usePermissionStore.getState>>): string => {
  Object.assign(usePermissionStore.getInitialState(), initial, state);
  return renderToStaticMarkup(<PermissionBanner />);
};

afterEach(() => {
  Object.assign(usePermissionStore.getInitialState(), initial);
  usePermissionStore.setState(initial);
  invoke.mockClear();
});

describe('捕捉的两个系统权限 (DISCOVERED-20261030-5)', () => {
  it('两个都没开：两项都列出来，各有一个按钮', () => {
    const html = render({ inputMonitoring: false, accessibility: false, asked: false });
    expect(html).toContain('needs two switches');
    expect(html).toMatch(/>Open Input Monitoring</);
    expect(html).toMatch(/>Open Accessibility</);
    expect(html).toContain('Works without them too');
  });

  it('只开了输入监控：提示条不消失，只剩辅助功能那个按钮', () => {
    const html = render({ inputMonitoring: true, accessibility: false, asked: true });
    expect(html).not.toBe('');
    expect(html).toMatch(/>Open Accessibility</);
    expect(html).not.toMatch(/>Open Input Monitoring</);
    expect(html).toContain('Input Monitoring');
  });

  it('只开了辅助功能：同样不消失，只剩输入监控那个按钮', () => {
    const html = render({ inputMonitoring: false, accessibility: true, asked: true });
    expect(html).toMatch(/>Open Input Monitoring</);
    expect(html).not.toMatch(/>Open Accessibility</);
  });

  it('去过系统设置之后：提示要重启一次，并给重启按钮', () => {
    const html = render({ inputMonitoring: false, accessibility: false, asked: true, requested: true });
    expect(html).toContain('restart Spool once');
    expect(html).toMatch(/>Restart Spool</);
  });

  it('一直都开着（Windows 上两个也都答 true）：什么都不显示', () => {
    expect(render({ inputMonitoring: true, accessibility: true, asked: true })).toBe('');
  });

  it('这一次打开过程中刚开好：给重启按钮', () => {
    const html = render({ inputMonitoring: true, accessibility: true, asked: true, everDenied: true });
    expect(html).toContain('takes effect after Spool restarts');
    expect(html).toMatch(/>Restart Spool now</);
  });

  it('还没查过：不显示，不凭空说缺了什么', () => {
    expect(render({})).toBe('');
  });
});

describe('permissionStore', () => {
  it('check 同时查两个开关和「系统问没问过」', async () => {
    invoke.mockImplementation(async (cmd: unknown) =>
      cmd === 'input_monitoring_granted' ? true : cmd === 'accessibility_granted' ? false : true,
    );
    await usePermissionStore.getState().check();
    const s = usePermissionStore.getState();
    expect(s.inputMonitoring).toBe(true);
    expect(s.accessibility).toBe(false);
    expect(s.asked).toBe(true);
    expect(s.everDenied).toBe(true);
  });

  it('open 只请求那一个开关、直达它那一页，然后重查', async () => {
    invoke.mockImplementation(async () => true);
    await usePermissionStore.getState().open('accessibility');
    expect(invoke).toHaveBeenNthCalledWith(1, 'open_capture_permission', { which: 'accessibility' });
    expect(invoke.mock.calls.map((c) => c[0])).toContain('accessibility_granted');
    expect(usePermissionStore.getState().requested).toBe(true);
  });
});
