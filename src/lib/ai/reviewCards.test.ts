import { describe, expect, it } from 'vitest';
import { splitReview } from './reviewCards';

// P9S-5 — the shapes below are the ones the real library's eleven reviews (2026-08-08 – 10-21) come in.
describe('splitReview', () => {
  it('the asked-for shape: one `## title` per project, three labelled rows, a closing line', () => {
    const r = splitReview(
      [
        '## 剩余推荐信',
        '- **做了什么**：问了两位老师。',
        '- **还剩什么**：宁波两位还在等回复。',
        '- **离截止还有几天**：没设截止日期。',
        '',
        '## HAI-Lecture6',
        '- **做了什么**：记了文本分类。',
        '- **还剩什么**：看不出来。',
        '- **离截止还有几天**：没设截止日期。',
        '',
        '接下来最该先做的，是把推荐信那三件小事推一下。',
      ].join('\n'),
    )!;
    expect(r.intro).toBe('');
    expect(r.cards.map((c) => c.title)).toEqual(['剩余推荐信', 'HAI-Lecture6']);
    expect(r.cards[0]!.lines).toEqual([
      { label: '做了什么', text: '问了两位老师。' },
      { label: '还剩什么', text: '宁波两位还在等回复。' },
      { label: '离截止还有几天', text: '没设截止日期。' },
    ]);
    expect(r.outro).toBe('接下来最该先做的，是把推荐信那三件小事推一下。');
  });

  it('the older shape: a bold name on its own line, and a short note after it stays with the card', () => {
    const r = splitReview(
      [
        '**Flux**（2026-09-23 截止，还剩 28 天）',
        '- **做了什么**：定了方向。',
        '',
        '**FLUX 导师沟通与汇报**',
        '- **做了什么**：记下了会谈结论。',
        '',
        '**接下来最该先做的：把 proposal 发出去。**',
      ].join('\n'),
    )!;
    expect(r.cards.map((c) => [c.title, c.note])).toEqual([
      ['Flux', '（2026-09-23 截止，还剩 28 天）'],
      ['FLUX 导师沟通与汇报', ''],
    ]);
    // A closing sentence written all in bold is not a project.
    expect(r.outro).toBe('**接下来最该先做的：把 proposal 发出去。**');
  });

  it('`### title` with unbulleted rows, and the colon inside the bold', () => {
    const r = splitReview(
      ['### Flux', '**做了什么**：六种变换已经实现。  ', '**还剩什么：** 硬约束层。', '', '建议先做硬约束层。'].join(
        '\n',
      ),
    )!;
    expect(r.cards[0]!.lines).toEqual([
      { label: '做了什么', text: '六种变换已经实现。' },
      { label: '还剩什么', text: '硬约束层。' },
    ]);
    expect(r.outro).toBe('建议先做硬约束层。');
  });

  it('plain labels on bullets (「- 做了什么：…」), and the last project keeps its rows', () => {
    const r = splitReview(
      [
        '**Flux**（2026-09-23 截止，还剩 28 天）',
        '- 做了什么：导师换成了 Paul。',
        '- 离截止还有 28 天。',
        '',
        '**UChicago MPCS**',
        '- 做了什么：决定退出。',
        '- 没设截止日期。',
        '',
        '其余项目基本这周没动。',
        '',
        '接下来最该做的，是先把第一次导师联系发出去。',
      ].join('\n'),
    )!;
    expect(r.cards.map((c) => c.title)).toEqual(['Flux', 'UChicago MPCS']);
    expect(r.cards[1]!.lines).toEqual([
      { label: '做了什么', text: '决定退出。' },
      { label: null, text: '没设截止日期。' },
    ]);
    expect(r.outro).toBe('其余项目基本这周没动。\n\n接下来最该做的，是先把第一次导师联系发出去。');
  });

  it('nothing is dropped: an unlabelled paragraph inside a card stays in that card, wrapped rows join theirs', () => {
    const r = splitReview(
      [
        '## A',
        '- **做了什么**：第一行',
        '  接着写的第二行',
        '',
        '另外一段没有标签的话。',
        '## B',
        '- **做了什么**：b',
      ].join('\n'),
    )!;
    expect(r.cards[0]!.lines).toEqual([
      { label: '做了什么', text: '第一行\n接着写的第二行' },
      { label: null, text: '另外一段没有标签的话。' },
    ]);
  });

  it('written inline (「**X**：…」 or 「**X** — 一整段」) — no cards, the page draws it as one block', () => {
    expect(splitReview('**填空**：这周主要在刷真题。\n**阅读**：上了直播课。\n\n最该先做的是 Flux。')).toBeNull();
    expect(
      splitReview(
        '**Flux** — 这一周没动。📌 置顶里还是产品方向简报，升学部分只留下硬日期，还没往里写。离截止还有 15 天。',
      ),
    ).toBeNull();
    expect(splitReview('')).toBeNull();
  });
});
