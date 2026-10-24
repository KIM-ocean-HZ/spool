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
// ① 原来 API 那一节说自己是「给不想装命令行工具的人的第二条路」，还指着一个 Windows 上不存在的「AI 引擎」那一节；
//    P9U-5（Ocean 10-24：「两个比重一样」）整句拿掉了 —— 两块都不再说自己是第二条路；
// ② 「Spool 不存 API key」紧挨在 key 框下面，单读像是在说整个 Spool 不存 key。

const render = (el: JSX.Element, language: 'zh' | 'en'): string => {
  // ⚠️ zustand v5 renders on the server from `getInitialState()` (memory isolated-verify-workflow §45).
  Object.assign(useSettingsStore.getInitialState(), { language });
  return renderToStaticMarkup(el);
};

describe('设置「AI 引擎」页的两块', () => {
  it('① 两块分量一样：API 那一块不再说自己是第二条路、也不指向别的一节（Mac / Windows，中英）', () => {
    for (const mac of [true, false]) {
      platform.mac = mac;
      const zh = render(<ApiEngineConfig />, 'zh');
      expect(zh).not.toContain('第二条路');
      expect(zh).not.toContain('AI 引擎」那一节');
      expect(render(<ApiEngineConfig />, 'en')).not.toContain('section below');
      // the same line at the bottom of both cards
      expect(zh).toContain('能做：');
    }
    platform.mac = true;
    expect(render(<EngineConfig />, 'zh')).toContain('能做：');
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
