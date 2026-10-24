import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Which platform this render pretends to be on — flipped per test.
const platform = vi.hoisted(() => ({ mac: true }));
vi.mock('@/lib/platform', async (orig) => ({
  ...(await orig<typeof import('@/lib/platform')>()),
  get IS_MAC() {
    return platform.mac;
  },
}));

import { useSettingsStore } from '@/stores/settingsStore';
import ApiEngineConfig from './ApiEngineConfig';
import EngineConfig from './EngineConfig';

// P9H-5（DISCOVERED-20261014-6，Ocean 10-16 第 150 条）—— 设置「AI 引擎」页的两句：
// ① 「……用『AI 引擎』那一节就行」指着的那一节只在 Mac 上画，Windows 上这句指向一个不存在的地方；
// ② 「Spool 不存 API key」紧挨在 DeepSeek 的 key 框下面，单读像是在说整个 Spool 不存 key。

const render = (el: JSX.Element, language: 'zh' | 'en'): string => {
  // ⚠️ zustand v5 renders on the server from `getInitialState()` (memory isolated-verify-workflow §45).
  Object.assign(useSettingsStore.getInitialState(), { language });
  return renderToStaticMarkup(el);
};

describe('设置「AI 引擎」页的两句', () => {
  it('① 指向「AI 引擎」那一节的那句：Mac 上有，Windows 上没有（中英）', () => {
    platform.mac = true;
    expect(render(<ApiEngineConfig />, 'zh')).toContain('用「AI 引擎」那一节就行');
    expect(render(<ApiEngineConfig />, 'en')).toContain('use the section below instead');
    platform.mac = false;
    expect(render(<ApiEngineConfig />, 'zh')).not.toContain('AI 引擎」那一节');
    expect(render(<ApiEngineConfig />, 'en')).not.toContain('section below');
  });

  it('② 说清是「走这条路」不用存 key（中英）', () => {
    platform.mac = true;
    const zh = render(<EngineConfig />, 'zh');
    // P9T（10-24）重写成一句；「走这条路」那层意思留着。
    expect(zh).toContain('走这条路 Spool 不存 key。');
    expect(zh).not.toContain('Spool 不存 API key');
    expect(render(<EngineConfig />, 'en')).toContain('On this route Spool stores no key.');
  });
});
