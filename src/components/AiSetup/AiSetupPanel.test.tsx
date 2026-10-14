import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useEngineStore } from '@/stores/engineStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { AiSetupPanel, turnOnApi, turnOnCli } from './AiSetupPanel';

vi.mock('@/lib/platform', async (orig) => ({
  ...(await orig<typeof import('@/lib/platform')>()),
  IS_MAC: true,
}));

// P9C — 「现在打开」 changes exactly what it names, and nothing is sent anywhere.
describe('现在打开', () => {
  it('CLI half: only the switches that were off', async () => {
    const update = vi.fn(async () => {});
    await turnOnCli(['mcpWriteEnabled'], update);
    expect(update.mock.calls).toEqual([[{ mcpWriteEnabled: true }]]);

    update.mockClear();
    await turnOnCli(['mcpEnabled', 'mcpWriteEnabled'], update);
    expect(update.mock.calls).toEqual([[{ mcpEnabled: true, mcpWriteEnabled: true }]]);
  });

  it('DeepSeek half, key typed: stores the key (trimmed), then only apiEngineEnabled', async () => {
    const update = vi.fn(async () => {});
    const saveKey = vi.fn(async () => {});
    await turnOnApi('  sk-test  ', update, saveKey);
    expect(saveKey.mock.calls).toEqual([['sk-test']]);
    expect(update.mock.calls).toEqual([[{ apiEngineEnabled: true }]]);
  });

  it('DeepSeek half, key already stored: no key write, only apiEngineEnabled', async () => {
    const update = vi.fn(async () => {});
    const saveKey = vi.fn(async () => {});
    await turnOnApi(null, update, saveKey);
    expect(saveKey).not.toHaveBeenCalled();
    expect(update.mock.calls).toEqual([[{ apiEngineEnabled: true }]]);
  });
});

describe('AiSetupPanel', () => {
  it('no CLI on a Mac: Claude Code and Codex to install, never Gemini', () => {
    // zustand v5 renders getInitialState() on the server
    Object.assign(useSettingsStore.getInitialState(), { language: 'zh', apiEngineEnabled: false });
    Object.assign(useEngineStore.getInitialState(), {
      status: { available: false, selected: null, version: null, path: null, engines: [] },
    });
    const html = renderToStaticMarkup(<AiSetupPanel route="any" />);
    expect(html).toContain('装 Claude Code');
    expect(html).toContain('装 Codex');
    expect(html).not.toContain('Gemini');
    // The free road comes first.
    expect(html.indexOf('不花钱')).toBeLessThan(html.indexOf('DeepSeek'));
  });

  it('a CLI-only entry never offers DeepSeek', () => {
    Object.assign(useSettingsStore.getInitialState(), { language: 'zh', apiEngineEnabled: false });
    const html = renderToStaticMarkup(<AiSetupPanel route="cli" />);
    expect(html).not.toContain('DeepSeek');
  });
});
