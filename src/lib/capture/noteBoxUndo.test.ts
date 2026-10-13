import { describe, expect, it } from 'vitest';
import { noteBoxUndo } from './noteBoxUndo';

describe('noteBoxUndo', () => {
  it('双击卡：框里有字是撤销打字，空着是撤销这次捕捉（08-15 丙，不变）', () => {
    expect(noteBoxUndo(true, false)).toBe('typing');
    expect(noteBoxUndo(false, false)).toBe('capture');
  });

  it('长按卡：框里有字照旧撤销打字，空着什么都不做（10-11 第 81 条甲）', () => {
    expect(noteBoxUndo(true, true)).toBe('typing');
    expect(noteBoxUndo(false, true)).toBe('nothing');
  });
});
