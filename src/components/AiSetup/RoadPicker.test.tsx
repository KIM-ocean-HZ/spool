import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useEngineStore } from '@/stores/engineStore';
import { useSettingsStore } from '@/stores/settingsStore';
import RoadPicker from './RoadPicker';

vi.mock('@/lib/platform', async (orig) => ({ ...(await orig<typeof import('@/lib/platform')>()), IS_MAC: true }));

// P9U-2 — a switch only when both roads are connected; otherwise the road in use, or nothing.
const render = (cli: boolean, api: boolean, pick: 'cli' | 'api' = 'cli'): string => {
  Object.assign(useSettingsStore.getInitialState(), {
    language: 'zh',
    mcpEnabled: true,
    mcpWriteEnabled: true,
    aiEngineActionsEnabled: true,
    apiEngineEnabled: api,
    compressRoute: pick,
  });
  Object.assign(useEngineStore.getInitialState(), {
    status: cli
      ? { available: true, selected: 'codex', version: '1', path: '/x/codex', engines: [] }
      : { available: false, selected: null, version: null, path: null, engines: [] },
  });
  return renderToStaticMarkup(<RoadPicker setting="compressRoute" />);
};

describe('RoadPicker', () => {
  it('both connected: two buttons, the picked one marked', () => {
    const html = render(true, true, 'api');
    expect((html.match(/<button/g) ?? []).length).toBe(2);
    expect(html).toMatch(/bg-accent\/10 text-accent[^>]*>API</);
  });
  it('one connected: just its name; none: nothing', () => {
    expect(render(true, false)).toContain('本机 CLI');
    expect(render(true, false)).not.toContain('<button');
    expect(render(false, true)).toContain('API');
    expect(render(false, false)).toBe('');
  });
});
