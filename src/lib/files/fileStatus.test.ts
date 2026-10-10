import { describe, expect, it } from 'vitest';
import { countUnconfirmedLost, lookOf, lostActions, LOST_LABEL } from './fileStatus';
import { DISMISSED_NOTICE, type FileState, type FileWhere } from './locate';

const st = (state: FileWhere, opts: Partial<FileState> = {}): FileState => ({
  id: 'a',
  state,
  path: '/Users/x/Desktop/HAI/Lecture 3.pdf',
  foundAt: null,
  notice: null,
  ...opts,
});
const MOVED = JSON.stringify({ kind: 'moved', from: '/Users/x/Desktop/Lecture 3.pdf' });

// P9-4 — state → words and buttons, and what the panel's title counts.
describe('右栏怎么说一个文件 (P9-4)', () => {
  it('还没看过 / 在原处、没什么要说的 ⇒ 照常', () => {
    expect(lookOf(undefined)).toEqual({ kind: 'normal' });
    expect(lookOf(st('in_place'))).toEqual({ kind: 'normal' });
  });

  it('跟到了新位置、还没看过 ⇒「已跟到新位置」，带着从哪到哪', () => {
    const expected = {
      kind: 'followed',
      from: '/Users/x/Desktop/Lecture 3.pdf',
      to: '/Users/x/Desktop/HAI/Lecture 3.pdf',
    };
    expect(lookOf(st('moved', { notice: MOVED }))).toEqual(expected);
    // The next look says in_place; the mark stays until it is clicked.
    expect(lookOf(st('in_place', { notice: MOVED }))).toEqual(expected);
    // Clicked: the notice is gone.
    expect(lookOf(st('in_place', { notice: null }))).toEqual({ kind: 'normal' });
  });

  it('找不到的每一种都有自己的话', () => {
    expect(LOST_LABEL).toEqual({
      trash: '在废纸篓里',
      deleted: '已经删掉了',
      offline: '外接盘没接上',
      unknown: '不知道挪到哪了',
      held: '挪进了系统或隐藏文件夹',
    });
    expect(lookOf(st('trash', { foundAt: '/Users/x/.Trash/Lecture 3.pdf' }))).toEqual({
      kind: 'lost',
      why: 'trash',
      quiet: false,
      foundAt: '/Users/x/.Trash/Lecture 3.pdf',
    });
  });

  it('按钮：「找一找」只给不知道挪到哪了的、只在 Mac 上；外接盘不给「打开最近的文件夹」', () => {
    expect(lostActions('unknown', false, true)).toEqual(['find', 'nearest', 'relocate', 'dismiss']);
    expect(lostActions('unknown', false, false)).toEqual(['nearest', 'relocate', 'dismiss']);
    expect(lostActions('trash', false, true)).toEqual(['nearest', 'relocate', 'dismiss']);
    expect(lostActions('deleted', false, true)).toEqual(['nearest', 'relocate', 'dismiss']);
    expect(lostActions('offline', false, true)).toEqual(['relocate', 'dismiss']);
    expect(lostActions('held', false, true)).toEqual(['thisOne', 'relocate', 'dismiss']);
  });

  it('「知道了」之后：变安静，不再有「知道了」，别的路还在', () => {
    expect(lookOf(st('deleted', { notice: DISMISSED_NOTICE }))).toMatchObject({ kind: 'lost', quiet: true });
    expect(lostActions('deleted', true, true)).toEqual(['nearest', 'relocate']);
  });

  it('标题旁边只数没确认过的；确认过的不算；又找到了（在原处）就不算', () => {
    const states: Record<string, FileState> = {
      a: st('unknown', { id: 'a' }),
      b: st('trash', { id: 'b' }),
      c: st('deleted', { id: 'c', notice: DISMISSED_NOTICE }),
      d: st('in_place', { id: 'd' }),
      e: st('moved', { id: 'e', notice: MOVED }),
    };
    expect(countUnconfirmedLost(['a', 'b', 'c', 'd', 'e', 'not-looked-at'], states)).toBe(2);
    // b is found again (Rust clears its 「确认过」 then, and says in_place).
    expect(countUnconfirmedLost(['a', 'b'], { ...states, b: st('in_place', { id: 'b' }) })).toBe(1);
  });
});
