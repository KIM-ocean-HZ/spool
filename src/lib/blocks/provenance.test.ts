import { describe, expect, it } from 'vitest';
import { incomingReason, incomingVerbKey, partyState } from './provenance';
import type { IncomingRef } from '@/lib/db/blocks';

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
