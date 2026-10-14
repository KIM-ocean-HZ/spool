import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Sidebar from '@/components/Sidebar';
import { useEngineStore } from '@/stores/engineStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { emptyReviewsHint, reviewKind } from './index';

// P9B-3 (Ocean 2026-10-10 第 76 条「一直显示」): the weekly review page has 「活动」 now, which needs
// no AI — so its door is open on every machine, and the page never tells anyone to install a CLI.

describe('周回顾 entry', () => {
  it('is in the sidebar with no AI engine on the machine (and on Windows, where there never is one)', () => {
    // zustand v5 renders getInitialState() on the server
    Object.assign(useSettingsStore.getInitialState(), { language: 'zh' });
    Object.assign(useEngineStore.getInitialState(), { status: { available: false, selected: null, version: null, path: null, engines: [] } });
    expect(renderToStaticMarkup(<Sidebar onCollapse={() => {}} />)).toContain('周回顾');
  });
});

// P9C (第 93 – 98 条): the sentence follows the bar above it.
describe('emptyReviewsHint', () => {
  it('invites a first run when a road is ready', () => {
    expect(emptyReviewsHint('ready')).toContain('点上面那一下');
  });

  it('says nothing more while locked — the locked bar above already says it', () => {
    expect(emptyReviewsHint('locked')).toBeNull();
  });

  it('says nothing at all with 「显示 AI 功能」 off', () => {
    expect(emptyReviewsHint('hidden')).toBeNull();
  });
});

// P9C 验收第一轮（Ocean 10-15 第 104 – 105 条）: one button, the type picked first.
describe('reviewKind', () => {
  it('API off: only the local CLI', () => {
    expect(reviewKind(false, true, 'api')).toBe('cli');
  });

  it('not a Mac: there is no local-CLI type, so API (第 97 条)', () => {
    expect(reviewKind(true, false, 'cli')).toBe('api');
  });

  it('both there: the type the user picked — the same one the weekly run uses', () => {
    expect(reviewKind(true, true, 'cli')).toBe('cli');
    expect(reviewKind(true, true, 'api')).toBe('api');
  });
});
