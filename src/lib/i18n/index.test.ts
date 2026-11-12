import { afterEach, describe, expect, it } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';
import { quote, t } from './index';

afterEach(() => useSettingsStore.setState({ language: 'zh' }));

// DISCOVERED-20261112-14: the English screens said "1 commit(s)", "1 blocks", "1 projects".
describe('English singular / plural', () => {
  it('reads singular at 1 and plural otherwise', () => {
    useSettingsStore.setState({ language: 'en' });
    expect(t('{n} 块', { n: 1 })).toBe('1 block');
    expect(t('{n} 块', { n: 2 })).toBe('2 blocks');
    expect(t('{n} 块', { n: 0 })).toBe('0 blocks');
    expect(t('{n} 次提交', { n: 1 })).toBe('1 commit');
    expect(t('{n} 次提交', { n: 3 })).toBe('3 commits');
  });

  it('fills a slot inside the chosen form, and agrees the verb', () => {
    useSettingsStore.setState({ language: 'en' });
    expect(t('删除这 {n} 个项目', { n: 1 })).toBe('Delete this project');
    expect(t('删除这 {n} 个项目', { n: 4 })).toBe('Delete these 4 projects');
    expect(t('私密项目 {n} 个不发。', { n: 1 })).toBe('1 private project is not sent.');
    expect(t('私密项目 {n} 个不发。', { n: 2 })).toBe('2 private projects are not sent.');
  });

  it('leaves Chinese alone', () => {
    expect(t('{n} 块', { n: 1 })).toBe('1 块');
  });
});

// DISCOVERED-20261112-6: 「」 around a verbatim quote showed up on the English screens.
describe('quote marks follow the UI language', () => {
  it('uses 「」 in Chinese and “ ” in English, and never touches the words', () => {
    expect(quote('Applications close 15 November.')).toBe('「Applications close 15 November.」');
    useSettingsStore.setState({ language: 'en' });
    expect(quote('Applications close 15 November.')).toBe('“Applications close 15 November.”');
    expect(quote('申请 11 月 15 日截止')).toBe('“申请 11 月 15 日截止”');
  });
});
