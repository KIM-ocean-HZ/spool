import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SwitcherPayload } from '@/lib/capture/overlayProtocol';
import { useSettingsStore } from '@/stores/settingsStore';
import { SwitcherPanel, visibleRows } from './TargetSwitcher';

// P15-4 —— 面板画出来的样子：中间那一行是选中的，上下没有项目的格子空着，当前目标和私密的有标记。

const payload: SwitcherPayload = {
  items: ['Flux', '内测', '宣传片', 'MIT 文书', 'COMP3074', '推荐信', 'GRE', 'Portfolio', '第一章'].map((title, i) => ({
    id: `t${i}`,
    title,
    workspaceTitle: i % 2 ? 'Spool' : '升学',
    private: title === '推荐信',
  })),
  currentId: 't0',
};

const render = (index: number, p: SwitcherPayload = payload, language: 'zh' | 'en' = 'zh'): string => {
  Object.assign(useSettingsStore.getInitialState(), { language });
  return renderToStaticMarkup(<SwitcherPanel view={{ payload: p, index }} />);
};

describe('切换捕捉目标的面板', () => {
  it('刚打开：当前目标在中间那一行，上面三格空着，下面三个是最近的', () => {
    expect(visibleRows({ payload, index: 0 }).map((r) => r.at)).toEqual([null, null, null, 0, 1, 2, 3]);
    const html = render(0);
    expect(html).toContain('捕捉到哪个项目');
    expect(html).toContain('滚轮换项目 · 点一行，或点外面完成');
    expect(html.match(/<button/g)).toHaveLength(4);
    // The middle row carries the highlight and the 「现在」 tag.
    const middle = html.slice(html.indexOf('ring-1'), html.indexOf('</button>', html.indexOf('ring-1')));
    expect(middle).toContain('Flux');
    expect(middle).toContain('现在');
  });

  it('往下滚了几格：中间换成那一个，上下各三个；私密的有锁', () => {
    expect(visibleRows({ payload, index: 5 }).map((r) => r.at)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    const html = render(5);
    const middle = html.slice(html.indexOf('ring-1'), html.indexOf('</button>', html.indexOf('ring-1')));
    expect(middle).toContain('推荐信');
    expect(middle).toContain('aria-label="私密"');
    expect(html.match(/<button/g)).toHaveLength(7);
  });

  it('没有项目：中间一行说清楚（中英）', () => {
    expect(render(0, { items: [], currentId: null })).toContain('还没有没完成的项目');
    expect(render(0, { items: [], currentId: null }, 'en')).toContain('No unfinished projects yet');
  });
});
