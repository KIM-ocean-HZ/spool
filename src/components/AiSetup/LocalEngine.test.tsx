import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useEngineStore } from '@/stores/engineStore';
import { useSettingsStore } from '@/stores/settingsStore';
import LocalEngine, { isChatGptCodex } from './LocalEngine';

// P9T — the three states, each with its one thing to press and no explanatory paragraph.
// zustand v5 renders getInitialState() on the server, so that is what each case sets.
const codex = (path: string) => ({
  available: true,
  selected: 'codex' as const,
  version: '0.147.0',
  path,
  engines: [{ kind: 'codex' as const, version: '0.147.0', path }],
});
const render = (status: unknown, settings: Record<string, unknown> = {}): string => {
  Object.assign(useSettingsStore.getInitialState(), {
    language: 'zh',
    mcpEnabled: false,
    mcpWriteEnabled: true,
    aiEnginePath: null,
    ...settings,
  });
  Object.assign(useEngineStore.getInitialState(), { status });
  return renderToStaticMarkup(<LocalEngine />);
};

describe('LocalEngine', () => {
  it('nothing found: install links, look again, pick a file by hand — and never Gemini', () => {
    const html = render({ available: false, selected: null, version: null, path: null, engines: [] });
    for (const s of ['没找到 Claude Code 或 Codex', '装 Claude Code', '装 Codex', '重新查找', '手动选择…']) {
      expect(html).toContain(s);
    }
    expect(html).not.toContain('Gemini');
    expect(html).not.toContain('which');
  });

  it('a hand-picked file that is not an engine says so, with a way out', () => {
    const html = render(
      { available: false, selected: null, version: null, path: null, engines: [] },
      { aiEnginePath: '/tmp/notes.txt' },
    );
    expect(html).toContain('不是 Claude Code / Codex');
    expect(html).toContain('清除');
  });

  it('found but the MCP switch is off: one 「连接」 button and the line that says what it opens', () => {
    const html = render(codex('/u/.nvm/versions/node/v24/bin/codex'));
    expect(html).toContain('找到了 Codex');
    expect(html).toContain('连接');
    expect(html).toContain('你接过的别的 AI 也能读写项目');
    expect(html).not.toContain('已连接');
  });

  it('connected: the name; ChatGPT’s own Codex is named as such', () => {
    const own = render(codex('/opt/homebrew/bin/codex'), { mcpEnabled: true });
    expect(own).toContain('✓ 已连接 Codex');
    expect(own).not.toContain('ChatGPT');
    const bundled = render(codex('/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex'), {
      mcpEnabled: true,
    });
    expect(bundled).toContain('Codex（ChatGPT 自带的）');
  });

  it('isChatGptCodex', () => {
    expect(isChatGptCodex('/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex')).toBe(true);
    expect(isChatGptCodex('/opt/homebrew/bin/codex')).toBe(false);
    expect(isChatGptCodex(null)).toBe(false);
  });
});
