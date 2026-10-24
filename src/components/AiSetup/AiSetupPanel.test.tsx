import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useEngineStore } from '@/stores/engineStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { AiSetupPanel } from './AiSetupPanel';

vi.mock('@/lib/platform', async (orig) => ({
  ...(await orig<typeof import('@/lib/platform')>()),
  IS_MAC: true,
}));

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
    // ⛔ No Gemini CLI to install (its free tier is gone). The API half's vendor list may name
    // Gemini — that is a key, not a CLI — but it is not drawn before the key check answers.
    expect(html).not.toContain('装 Gemini');
    // The free road comes first.
    expect(html.indexOf('不花钱')).toBeLessThan(html.indexOf('API key'));
    // P9U-3 (Ocean: 「去掉 deepseek 这个例子」): the API half names no vendor.
    expect(html).not.toContain('DeepSeek');
  });

  it('a CLI-only entry never offers an API key', () => {
    Object.assign(useSettingsStore.getInitialState(), { language: 'zh', apiEngineEnabled: false });
    const html = renderToStaticMarkup(<AiSetupPanel route="cli" />);
    expect(html).not.toContain('API key');
  });
});
