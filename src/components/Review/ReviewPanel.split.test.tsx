import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Attachment } from '@/lib/db/attachments';
import type { Block } from '@/lib/db/blocks';
import type { FollowUpItem } from '@/lib/db/followUpItems';
import type { SplitReviewItem } from '@/lib/split/projectSplit';
import { useProposalsStore } from '@/stores/proposalsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import ReviewPanel from './ReviewPanel';

// P9G-3 — the 「拆分」 card, rendered for real. It has to show what the click will do before
// anything moves: the AI's reason, each group's name (editable) and summary, every block where
// it is headed, what stays, the files and lines with where they go, and a plain sentence for
// each correction pair the grouping would pull apart (第 3 条).

const now = Date.now();
const block = (id: string, seq: number, content: string, extra: Partial<Block> = {}): Block =>
  ({
    id, threadId: 'big', kind: 'text', content, annotation: null, annotationBy: null,
    refThreadId: null, refBlockId: null, source: null, pinned: false, seq, createdAt: now + seq,
    staleAt: null, refKind: null, sourceUrl: null, retrievedAt: null, recheckAfter: null,
    correctedQuote: null, gist: null, refNote: null, gistBy: null, refReviewedStaleAt: null,
    replacedByBlockId: null, originalContent: null, compressedAt: null, ...extra,
  }) as Block;

const item = (groups: { title: string; summary: string; blockIds: string[] }[]): SplitReviewItem => ({
  proposal: {
    id: 'sp1',
    threadId: 'big',
    client: 'Claude · MCP',
    why: '项目太长了，调研和方案分开读。',
    plan: { groups, files: [{ attachmentId: 'f1', group: 1 }], followUps: [] },
    createdAt: now,
    expiresAt: now + 7 * 86_400_000,
  },
  thread: { id: 'big', title: '大项目', workspaceId: 'w', isPrivate: false, status: 'active' },
  blocks: [
    block('b1', 1, '第一轮调研笔记'),
    block('b2', 2, '场地定在老礼堂。'),
    block('b3', 3, '方案草稿'),
    block('b4', 4, '更正：场地在新礼堂。', { refBlockId: 'b2', refKind: 'corrects', correctedQuote: '老礼堂' }),
  ],
  files: [{ id: 'f1', label: 'plan.pdf', target: '/x/plan.pdf' } as Attachment],
  followUps: [{ id: 'l1', text: '押金退不退', status: 'open' } as FollowUpItem],
});

const render = (it: SplitReviewItem, language: 'zh' | 'en' = 'zh'): string => {
  // ⚠️ zustand v5 renders on the server from `getInitialState()` (memory isolated-verify-workflow §45).
  Object.assign(useSettingsStore.getInitialState(), { language });
  Object.assign(useProposalsStore.getInitialState(), {
    panelOpen: true,
    batches: [],
    fileRequests: [],
    followUpProposals: [],
    fileProposals: [],
    supersedeProposals: [],
    splitProposals: [it],
  });
  return renderToStaticMarkup(<ReviewPanel />);
};

describe('待审面的「拆分」卡 (P9G-3)', () => {
  it('shows the reason, the groups, where every block goes, what stays, and the split pair', () => {
    const html = render(
      item([
        { title: '调研', summary: '最早的调研。', blockIds: ['b1', 'b2'] },
        { title: '方案', summary: '后来的方案。', blockIds: ['b3'] },
      ]),
    );
    expect(html).toContain('Claude · MCP 提议把〈大项目〉拆成 2 个子项目');
    expect(html).toContain('项目太长了，调研和方案分开读。');
    expect(html).toContain('value="调研"'); // the names are inputs
    expect(html).toContain('AI 写的一句：最早的调研。');
    for (const text of ['第一轮调研笔记', '场地定在老礼堂。', '方案草稿', '更正：场地在新礼堂。']) expect(html).toContain(text);
    expect(html).toContain('留在〈大项目〉的块（1）'); // #4 is in no group
    expect(html).toContain('plan.pdf');
    expect(html).toContain('押金退不退');
    expect(html).toContain('#4 和 #2 分开之后，#2 那句话上的底色记号会没（两块都还在）。');
    expect(html).toContain('拆分（2 个子项目）');
    expect(html).toContain('不拆');
    expect(html).not.toContain('不会建这个子项目');
  });

  it('a group whose blocks are gone says it will not be created, and the button counts what will', () => {
    const html = render(
      item([
        { title: '调研', summary: '最早的调研。', blockIds: ['b1', 'b2', 'b4'] },
        { title: '方案', summary: '后来的方案。', blockIds: ['gone'] },
      ]),
    );
    expect(html).toContain('这一组没有块，拆的时候不会建这个子项目。');
    expect(html).toContain('拆分（1 个子项目）');
    expect(html).not.toContain('底色记号'); // #4 and #2 are together
  });

  it('a finished project: the card says to reopen it first, and 「拆分」 cannot be pressed', () => {
    const it0 = item([
      { title: '调研', summary: '最早的调研。', blockIds: ['b1', 'b2'] },
      { title: '方案', summary: '后来的方案。', blockIds: ['b3'] },
    ]);
    const html = render({ ...it0, thread: { ...it0.thread, status: 'done' } });
    expect(html).toContain('〈大项目〉已经完成了。要拆，先打开它、点项目头上的「重新打开」，再回来点「拆分」。');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*?拆分（2 个子项目）/);
  });

  it('English', () => {
    const html = render(
      item([
        { title: 'Research', summary: 'Early notes.', blockIds: ['b1', 'b2'] },
        { title: 'Plan', summary: 'Later plans.', blockIds: ['b3'] },
      ]),
      'en',
    );
    expect(html).toContain('Claude · MCP proposes splitting ‹大项目› into 2 sub-projects');
    expect(html).toContain('Blocks staying in ‹大项目› (1)');
    expect(html).toContain('Once #4 and #2 are apart, the highlighted sentence in #2 loses its mark (both blocks stay).');
    expect(html).toContain('Split (2 sub-projects)');
    expect(html).toContain('Don’t split');
    // No Chinese UI words left on the card (the project's own title is user data).
    expect(html).not.toMatch(/提议|子项目|拆分|不拆|留在|它说为什么|天后作废/);
  });

  // P9H-4（DISCOVERED-20261016-6）：只有图片的块，块号后面原来是空的。
  it('a block of only pictures reads 「[图片]」 (with its caption); a block with text keeps its text', () => {
    const it0 = item([
      { title: '截图', summary: '界面截图。', blockIds: ['b1', 'p1', 'p2', 'p3'] },
      { title: '方案', summary: '后来的方案。', blockIds: ['b3'] },
    ]);
    const withPictures = {
      ...it0,
      blocks: [
        ...it0.blocks,
        block('p1', 5, '![](spool-image:img_a)'),
        block('p2', 6, '![登录页](spool-image:img_b)\n![](spool-image:img_c)'),
        block('p3', 7, '![](spool-image:img_d)\n后面那句话'),
      ],
    };
    const zh = render(withPictures);
    expect(zh).toMatch(/>\[图片\]</);
    expect(zh).toContain('[图片] 登录页');
    expect(zh).toContain('后面那句话');
    expect(zh).not.toContain('spool-image');
    expect(render(withPictures, 'en')).toMatch(/>\[image\]</);
  });
});
