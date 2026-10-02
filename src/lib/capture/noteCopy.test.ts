import { describe, expect, it } from 'vitest';
import { copyIdAfterEdit } from './noteCopy';

describe('copyIdAfterEdit (P3-4)', () => {
  it('keeps the copy id while any of the text remains', () => {
    expect(copyIdAfterEdit('7', '刚复制的字，后面加一句')).toBe('7');
    expect(copyIdAfterEdit('7', '刚')).toBe('7');
  });

  it('drops it once the box is emptied, whitespace counting as empty', () => {
    expect(copyIdAfterEdit('7', '')).toBeNull();
    expect(copyIdAfterEdit('7', '  \n ')).toBeNull();
  });

  it('never brings it back after that — what is typed next is their own', () => {
    let id: string | null = '7';
    for (const body of ['刚复制的', '', '自己重写的一句']) id = copyIdAfterEdit(id, body);
    expect(id).toBeNull();
  });

  it('a card that was never pre-filled has nothing to keep', () => {
    expect(copyIdAfterEdit(null, '自己写的')).toBeNull();
  });
});
