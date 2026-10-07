import { describe, expect, it } from 'vitest';
import {
  incomingNeedsReview,
  incomingReason,
  incomingVerbKey,
  partyState,
  refNeedsReview,
} from './provenance';
import type { Block, IncomingRef } from '@/lib/db/blocks';

/** 只造这几条判断看得见的字段。 */
const block = (
  id: string,
  over: Partial<Block> = {},
): Block =>
  ({
    id,
    seq: 1,
    threadId: 't',
    kind: 'text',
    content: '',
    annotation: null,
    annotationBy: null,
    refThreadId: null,
    refBlockId: null,
    source: null,
    pinned: false,
    createdAt: 0,
    staleAt: null,
    refKind: null,
    sourceUrl: null,
    retrievedAt: null,
    recheckAfter: null,
    correctedQuote: null,
    gist: null,
    refNote: null,
    gistBy: null,
    refReviewedStaleAt: null,
    replacedByBlockId: null,
    originalContent: null,
    compressedAt: null,
    ...over,
  }) as Block;

/** 被引的那一块，⚠️ 已经退役 —— 待审的四个条件里的第二条。 */
const RETIRED = block('old', { staleAt: 111 });
const LIVE = block('old');

describe('refNeedsReview —— §3.2 ② 那条判据', () => {
  it('引用方仍有效 + 被引块已退役 + cites + 没审过 ⇒ 待审', () => {
    expect(refNeedsReview(block('new', { refBlockId: 'old' }), RETIRED)).toBe(true);
  });

  it('被引块还有效 ⇒ 不待审（没有异常）', () => {
    expect(refNeedsReview(block('new', { refBlockId: 'old' }), LIVE)).toBe(false);
  });

  it('引用方自己也不作数了 ⇒ 不待审（这条边不用再管）', () => {
    expect(refNeedsReview(block('new', { refBlockId: 'old', staleAt: 222 }), RETIRED)).toBe(false);
  });

  // ⛔⛔ 这一条是施工单逐字点名的：`supersedes → retired` **正是正常状态**，不是异常。
  // 把它放进队列，等于让「整条取代」这个动作每做一次就自己生一条待办。
  it('⛔ supersedes 指着一块已退役的块 ⇒ 不待审', () => {
    expect(
      refNeedsReview(block('new', { refBlockId: 'old', refKind: 'supersedes' }), RETIRED),
    ).toBe(false);
  });

  // v32（P7-3）：同一条「正常状态」的新记法 —— 被引块正是被引用方自己取代的（先更正、后取代）。
  it('⛔ 被引块是被引用方自己整条取代的（v32 记在旧块上）⇒ 不待审；被别的块取代的照样待审', () => {
    const corrects = block('new', { refBlockId: 'old', refKind: 'corrects' });
    expect(refNeedsReview(corrects, block('old', { staleAt: 111, replacedByBlockId: 'new' }))).toBe(false);
    expect(refNeedsReview(corrects, block('old', { staleAt: 111, replacedByBlockId: 'other' }))).toBe(true);
  });

  it('corrects 指着一块已退役的块 ⇒ 照样待审', () => {
    expect(refNeedsReview(block('new', { refBlockId: 'old', refKind: 'corrects' }), RETIRED)).toBe(
      true,
    );
  });

  it('指的根本不是这一块 ⇒ 不待审', () => {
    expect(refNeedsReview(block('new', { refBlockId: 'somewhere-else' }), RETIRED)).toBe(false);
  });

  it('压根没有引用 ⇒ 不待审', () => {
    expect(refNeedsReview(block('new'), RETIRED)).toBe(false);
  });
});

/** ⭐⭐ §3.2 ④ 那条存储不变量的三条要求，⛔ 一条都不能少 ——
 *  确认绑定的是「引用方 + 被引方 + 被引方**本次的** `stale_at`」。 */
describe('§3.2 ④ 不变量：审过的确认怎么绑', () => {
  it('① 审过之后不再重复询问', () => {
    const reviewed = block('new', { refBlockId: 'old', refReviewedStaleAt: 111 });
    expect(refNeedsReview(reviewed, RETIRED)).toBe(false);
  });

  // ⛔⛔ 这一条是布尔答不对的地方之一：换了目标，那句「我看过那一块退役了」就不成立了。
  // 库那一层由 `setBlockSupersession` / `repointCitation` 把这一列清成 NULL 来保证；
  // 这里钉的是**判据本身**：就算那一列没被清，指向新目标时也不许当成审过。
  it('② 引用改到别处 ⇒ 不继承确认', () => {
    const other = block('other', { staleAt: 999 });
    const repointed = block('new', { refBlockId: 'other', refReviewedStaleAt: 111 });
    expect(refNeedsReview(repointed, other)).toBe(true);
  });

  // ⛔⛔ 布尔答不对的第二处，而且**走的是日常路径**：退役按钮是个纯开关
  // （`BlockItem` → `setStale`，「the action is its own inverse」）。
  // 用户把旧块取回来、后来又重新退役 —— 那是**新的一次**退役。
  it('③ 目标恢复有效、以后又重新退役 ⇒ 重新进待审', () => {
    const reviewed = block('new', { refBlockId: 'old', refReviewedStaleAt: 111 });
    // 取回来：还有效 ⇒ 没有异常。
    expect(refNeedsReview(reviewed, LIVE)).toBe(false);
    // 又退了一次，这次是另一个时刻 ⇒ 记住的 111 对不上，再问一遍。
    expect(refNeedsReview(reviewed, block('old', { staleAt: 333 }))).toBe(true);
  });

  it('⛔ 审过的那一刻存的是被引块的 stale_at，⛔ 不是「现在几点」', () => {
    // 存成别的值（比如按下按钮时的 Date.now()）就对不上，这条边会永远留在队列里。
    const wrong = block('new', { refBlockId: 'old', refReviewedStaleAt: 999 });
    expect(refNeedsReview(wrong, RETIRED)).toBe(true);
  });
});

/** 真库 2026-08-30 那 5 条待审边（都在〈申请规划〉，`ref_reviewed_stale_at` 全 NULL）。
 *  ⚠️ 钉的是**这一版的判据认得出它们** —— 施工单 §3.2 ② 逐条列了这五条，
 *  它们是这个功能第一次运行时屏幕上该出现的东西。 */
describe('真库那 5 条待审边', () => {
  const cases: [number, number, Block['refKind']][] = [
    [13, 2, null],
    [15, 3, null],
    [17, 3, null],
    [19, 2, null],
    [25, 21, 'corrects'],
  ];
  it.each(cases)('#%i → #%i 认得出来', (from, to, kind) => {
    const cited = block(`b${to}`, { staleAt: 111 });
    const citing = block(`b${from}`, { refBlockId: cited.id, refKind: kind, seq: from });
    expect(refNeedsReview(citing, cited)).toBe(true);
  });
});

describe('入向边', () => {
  const edge = (over: Partial<IncomingRef> = {}): IncomingRef => ({
    id: 'c1',
    seq: 13,
    threadId: 't',
    threadTitle: '申请规划',
    createdAt: 0,
    refKind: null,
    refNote: null,
    gist: null,
    annotation: null,
    staleAt: null,
    refReviewedStaleAt: null,
    ...over,
  });

  it('用的是同一把尺子', () => {
    expect(incomingNeedsReview(edge(), RETIRED)).toBe(true);
    expect(incomingNeedsReview(edge({ refKind: 'supersedes' }), RETIRED)).toBe(false);
    expect(incomingNeedsReview(edge({ refReviewedStaleAt: 111 }), RETIRED)).toBe(false);
    // 引用方自己不作数了。
    expect(incomingNeedsReview(edge({ staleAt: 222 }), RETIRED)).toBe(false);
  });

  // ⛔ 方向相反的同一组事 —— 合并成一组的结果是有一头把话说反。
  it('动词是从被引方看的', () => {
    expect(incomingVerbKey(null)).toBe('引用了这一块');
    expect(incomingVerbKey('cites')).toBe('引用了这一块');
    expect(incomingVerbKey('corrects')).toBe('更正了这里的一处');
    expect(incomingVerbKey('supersedes')).toBe('整条取代了这一块');
  });

  it('理由的梯子：refNote 在最上面，且分得出主语', () => {
    expect(incomingReason(edge({ refNote: '教授回复了邮件', gist: '一封邮件' }))).toEqual({
      text: '教授回复了邮件',
      isWhy: true,
    });
    expect(incomingReason(edge({ gist: '一封邮件' }))).toEqual({ text: '一封邮件', isWhy: false });
    expect(incomingReason(edge({ annotation: '我的批注' }))).toEqual({
      text: '我的批注',
      isWhy: false,
    });
    // ⛔ 都没有 ⇒ null，由界面明确写「未记录为什么引用」，⛔ 不是留白。
    expect(incomingReason(edge())).toBeNull();
    // 全是空白也算没有。
    expect(incomingReason(edge({ refNote: '   ', gist: '  ' }))).toBeNull();
  });
});

describe('partyState —— §3.2 ① 的三种状态', () => {
  it('有效 / 已不作数 / 已删除', () => {
    expect(partyState({ staleAt: null })).toBe('live');
    expect(partyState({ staleAt: 111 })).toBe('stale');
    expect(partyState(null)).toBe('missing');
    expect(partyState(undefined)).toBe('missing');
  });
});
