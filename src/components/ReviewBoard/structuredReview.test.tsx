import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { readWeeklyReview, WEEKLY_FORMAT, type WeeklyReview } from '@/lib/ai/weeklyStructured';
import { useSettingsStore } from '@/stores/settingsStore';
import type { Thread } from '@/lib/db/threads';
import { useThreadsStore } from '@/stores/threadsStore';
import StructuredReview from './StructuredReview';

const review = (over: Partial<WeeklyReview> = {}): WeeklyReview => ({
  format: WEEKLY_FORMAT,
  projects: [
    {
      title: '申请规划',
      threadId: null,
      did: '写完了文书初稿',
      stuck: '推荐信还没人答应',
      signals: [{ quote: '文书初稿写完了', why: '主线推进了', retyped: false }],
      actions: [
        {
          kind: 'set_deadline',
          why: '学校改了日期',
          quote: '截止改到 11 月 30 日',
          date: '2026-11-30',
          text: null,
          oldQuote: null,
          newQuote: null,
          staleBlockId: null,
          byBlockId: null,
          retyped: false,
        },
      ],
    },
  ],
  next: '先找推荐人。',
  dropped: [],
  ...over,
});

// P10-1: what Rust stored is told apart from prose by its format mark; every review from before
// P10 is prose and keeps the old P9S-5 path.
describe('readWeeklyReview', () => {
  it('reads what Rust stored', () => {
    expect(readWeeklyReview(JSON.stringify(review()))?.projects[0]!.title).toBe('申请规划');
  });

  it('leaves prose — and anything that is not the stored shape — to the old path', () => {
    expect(readWeeklyReview('## 申请规划\n- **做了什么**：…')).toBeNull();
    expect(readWeeklyReview('{"projects":[]}')).toBeNull();
    expect(readWeeklyReview('{"format":"spool-weekly-1","projects":')).toBeNull();
  });
});

describe('StructuredReview', () => {
  it('puts every word on the card — no cut, no ellipsis — even for a project gone since', () => {
    Object.assign(useSettingsStore.getInitialState(), { language: 'zh' });
    Object.assign(useThreadsStore.getInitialState(), { threadsByWorkspace: {} });
    const long = '很长的一句话'.repeat(200);
    const html = renderToStaticMarkup(
      <StructuredReview review={review({ next: long })} client="周回顾 · m" />,
    );
    for (const s of ['申请规划', '写完了文书初稿', '推荐信还没人答应', '「文书初稿写完了」', '主线推进了', '2026-11-30', '「截止改到 11 月 30 日」', long]) {
      expect(html).toContain(s);
    }
    expect(html).not.toContain('…');
    expect(html).not.toMatch(/truncate|line-clamp/);
    // Gone: the words stay, the button does not.
    expect(html).toContain('这个项目已经不在了');
    expect(html).not.toContain('<button');
  });

  // 任务书 §3 P10-3: a finished or private project gets no buttons.
  it('gives a finished project one line instead of buttons, and a private one nothing', () => {
    Object.assign(useSettingsStore.getInitialState(), { language: 'zh' });
    const th = (over: Partial<Thread>): Thread => ({
      id: 't1', workspaceId: 'w', title: '申请规划', summary: null, digest: null, deadline: null,
      status: 'active', isCaptureTarget: false, createdAt: 1, updatedAt: 1, completedAt: null,
      autoMaintain: null, isPrivate: false, ...over,
    });
    const render = (thread: Thread) => {
      Object.assign(useThreadsStore.getInitialState(), { threadsByWorkspace: { w: [thread] } });
      return renderToStaticMarkup(<StructuredReview client="周回顾 · m" review={review()} />);
    };
    expect(render(th({ status: 'done' }))).toContain('这个项目已标完成，不再出建议动作');
    expect(render(th({ status: 'done' }))).not.toContain('截止日期设成');
    expect(render(th({ isPrivate: true }))).not.toContain('建议动作');
    // An open project: the suggestion is there (the button itself appears once the library is read).
    expect(render(th({}))).toContain('截止日期设成 2026-11-30');
  });

  // P10-2: what the gate dropped is said at the bottom — how many, why, and what the AI wrote.
  it('says what was dropped, with what the AI said', () => {
    Object.assign(useSettingsStore.getInitialState(), { language: 'zh' });
    const html = renderToStaticMarkup(
      <StructuredReview
        client="周回顾 · m"
        review={review({
          dropped: [
            { project: '申请规划', what: 'signal', reason: 'quote', item: { quote: '推荐信全齐了', why: '编的' } },
            { project: '没有的项目', what: 'project', reason: 'no_project', item: { title: '没有的项目', did: '做了点事' } },
          ],
        })}
      />,
    );
    expect(html).toContain('AI 还说了 2 条');
    expect(html).toContain('「推荐信全齐了」');
    expect(html).toContain('编的');
    expect(html).toContain('它引的原话在发过去的材料里找不到');
    expect(html).toContain('〈没有的项目〉');
  });
});
