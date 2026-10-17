import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Attachment } from '@/lib/db/attachments';
import { useBlocksStore } from '@/stores/blocksStore';
import { useSettingsStore } from '@/stores/settingsStore';
import ProjectFiles from './ProjectFiles';

// P9H-4（DISCOVERED-20261016-1）：私密项目的右栏「项目文件」原来还说「AI 默认能读到」、每个文件
// 旁边照样画「AI 可读」—— 而通过 Spool 连接的 AI 一个都读不到（P9E-2 的视图把文件一起滤掉了）。

const file = (id: string, extra: Partial<Attachment> = {}): Attachment =>
  ({
    id,
    threadId: 't',
    kind: 'file',
    target: `/Users/a/${id}.pdf`,
    label: `${id}.pdf`,
    extractedText: '正文',
    extractedAt: 1,
    extractionKind: 'pdf',
    includeInPack: false,
    aiAccess: true,
    createdAt: 1,
    anchorBlockId: null,
    addedBy: null,
    supersededBy: null,
    supersededAt: null,
    ...extra,
  }) as Attachment;

const render = (files: Attachment[], isPrivate: boolean, language: 'zh' | 'en' = 'zh'): string => {
  // ⚠️ zustand v5 renders on the server from `getInitialState()` (memory isolated-verify-workflow §45).
  Object.assign(useSettingsStore.getInitialState(), { language });
  Object.assign(useBlocksStore.getInitialState(), { attachmentsByThread: { t: files }, byThread: { t: [] }, fileStates: {} });
  return renderToStaticMarkup(<ProjectFiles threadId="t" isPrivate={isPrivate} />);
};

describe('私密项目的「项目文件」', () => {
  it('没有文件：说 AI 读不到，不说「AI 默认能读到」（中英）', () => {
    const zh = render([], true);
    expect(zh).toContain('私密项目：通过 Spool 连接的 AI 读不到这里的文件。');
    expect(zh).not.toContain('AI 默认能读到');
    expect(render([], true, 'en')).toContain('Private project: no AI connected through Spool can read the files here.');
    // 公开的照旧。
    expect(render([], false)).toContain('AI 默认能读到');
  });

  // ⚠️ 收在新版下面的旧版是折叠着的（useState），服务端渲染画不出来 —— 那一行同样不画，测不到。
  it('有文件：不画「AI 可读」；「打包可读」照旧', () => {
    const files = [file('v2'), file('v1', { supersededBy: 'v2', supersededAt: 2 })];
    const pub = render(files, false);
    expect(pub).toContain('AI 可读');
    expect(pub).toContain('打包可读');
    const priv = render(files, true);
    expect(priv).not.toContain('AI 可读');
    expect(priv).toContain('打包可读');
    expect(priv).toContain('v2.pdf');
  });
});
