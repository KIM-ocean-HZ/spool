import { describe, expect, it } from 'vitest';
import { fromSegments, segmentText, toSegments, withSegmentText } from './PictureEditor';

// P7 验收第一轮（Ocean 2026-10-08 第 4 条）：编辑带图的块 = 一段字、一张图、一段字……
// 底下仍然是一个字符串；这里盯的是「拆开再拼回去，一个字不差」，以及删图之后字接得上。

const box = (seg: number | null): HTMLElement =>
  ({ dataset: seg === null ? {} : { seg: String(seg) } }) as unknown as HTMLElement;

describe('图文混排的编辑器', () => {
  it('图前、两图之间、图后各有一段字（可以是空的），好让人在哪儿都能写', () => {
    expect(toSegments('![a](spool-image:i1)\n![](spool-image:i2)')).toEqual([
      { kind: 'text', text: '' },
      { kind: 'image', id: 'i1', caption: 'a' },
      { kind: 'text', text: '' },
      { kind: 'image', id: 'i2', caption: '' },
      { kind: 'text', text: '' },
    ]);
  });

  it('拆开再拼回去，一个字不差（空行、段落、图前图后的字都算）', () => {
    for (const v of [
      '只有字\n\n第二段',
      '前面\n![注释](spool-image:i1)\n\n后面一段\n还有一行',
      '![](spool-image:i1)\n中间\n![](spool-image:i2)',
      '![](spool-image:i1)\n\n',
    ]) {
      expect(fromSegments(toSegments(v))).toBe(v);
    }
    // 每敲一个字都要拆一次、拼一次：拼出来的再拆，必须还是同样那几段（不然光标会跳格）。
    for (const segs of [
      toSegments('\n![](spool-image:i1)\n\n'),
      [
        { kind: 'text' as const, text: '\n' },
        { kind: 'image' as const, id: 'i1', caption: '有空格 ' },
        { kind: 'text' as const, text: 'a\n' },
      ],
    ]) {
      expect(toSegments(fromSegments(segs))).toEqual(segs);
    }
  });

  it('在两张图中间打字：字落在两行图中间', () => {
    const segs = toSegments('![](spool-image:i1)\n![](spool-image:i2)');
    segs[2] = { kind: 'text', text: '这两张对着看' };
    expect(fromSegments(segs)).toBe('![](spool-image:i1)\n这两张对着看\n![](spool-image:i2)');
  });

  it('删掉一张图：前后两段字接上', () => {
    const segs = toSegments('上面\n![](spool-image:i1)\n下面');
    expect(fromSegments(segs.filter((s) => s.kind !== 'image'))).toBe('上面\n下面');
  });

  it('排版和标为重点只改光标所在的那一段字', () => {
    const value = '上面\n![图](spool-image:i1)\n下面';
    expect(segmentText(value, box(2))).toBe('下面');
    expect(withSegmentText(value, box(2), '## 下面')).toBe('上面\n![图](spool-image:i1)\n## 下面');
    expect(withSegmentText(value, box(1), 'x')).toBe(value); // 那一格是图，不是字
    // 普通的那个大文本框（没有 data-seg）：整段就是它。
    expect(segmentText('整段', box(null))).toBe('整段');
    expect(withSegmentText('整段', box(null), '新的')).toBe('新的');
  });
});
