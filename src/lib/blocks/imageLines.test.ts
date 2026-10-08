import { describe, expect, it } from 'vitest';
import {
  appendImageLines,
  imageLine,
  imageLinesAsText,
  parseImageLines,
  referencedImageIds,
  remapImageIds,
  renderImageLines,
  withImageCaption,
} from './imageLines';

// P7 验收第一轮（Ocean 2026-10-08 第 4、5 条，「图文混排，像写文档」）：一张图是块正文里的一行。

describe('图片行', () => {
  it('一行一张；注释里可以有 ]；行尾只许空格', () => {
    const content = '前面的字\n![左边是旧版](spool-image:a1)\n中间\n![a](b](spool-image:a_2-) \n![x](spool-image:a3) 后面还有字';
    expect(parseImageLines(content).map((l) => [l.caption, l.id])).toEqual([
      ['左边是旧版', 'a1'],
      ['a](b', 'a_2-'],
    ]);
    const [first] = parseImageLines(content);
    expect(content.slice(first!.start, first!.end)).toBe('![左边是旧版](spool-image:a1)');
    expect(content.slice(first!.captionStart, first!.captionEnd)).toBe('左边是旧版');
    expect(referencedImageIds(content)).toEqual(['a1', 'a_2-']);
  });

  it('注释照打的字留着（编辑器每敲一个字都走这里，末尾的空格不能被吃掉），只把换行折成空格', () => {
    expect(imageLine('i', '两张 ')).toBe('![两张 ](spool-image:i)');
    expect(imageLine('i', '第一行\n第二行')).toBe('![第一行 第二行](spool-image:i)');
  });

  it('新块：图排在打的字后面；没字就只有图', () => {
    expect(appendImageLines('两版界面\n\n', ['i1', 'i2'])).toBe('两版界面\n![](spool-image:i1)\n![](spool-image:i2)');
    expect(appendImageLines('', ['i1'])).toBe('![](spool-image:i1)');
    expect(appendImageLines('只有字', [])).toBe('只有字');
  });

  it('双击 ⌥ 之后写的那句话就是这张图的注释（第 5 条）', () => {
    const content = '![](spool-image:i1)\n![](spool-image:i2)';
    expect(withImageCaption(content, 'i2', '  右边那张  ')).toBe('![](spool-image:i1)\n![右边那张](spool-image:i2)');
    expect(withImageCaption(content, null, '第一张')).toBe('![第一张](spool-image:i1)\n![](spool-image:i2)');
    expect(withImageCaption('没有图', null, 'x')).toBe('没有图');
  });

  it('复制到别的项目：行里的 id 换成复制品的，不认识的不动', () => {
    const content = '看\n![旧版](spool-image:i1)\n![](spool-image:zz)';
    expect(remapImageIds(content, new Map([['i1', 'n1']]))).toBe('看\n![旧版](spool-image:n1)\n![](spool-image:zz)');
  });

  it('预览和标签：[image] 注释，⛔ 从不露 id', () => {
    const content = '前\n![ 曲线 ](spool-image:i1)\n![](spool-image:i2)';
    expect(imageLinesAsText(content)).toBe('前\n[image] 曲线\n[image]');
    expect(imageLinesAsText(content, '图片')).toBe('前\n[图片] 曲线\n[图片]');
  });

  it('pack：图在它那一行的位置写成 ![注释](路径)；正文没点名的跟在后面；库里没有的只剩注释', () => {
    const content = '前\n![曲线](spool-image:i1)\n后\n![删了的](spool-image:gone)\n\n';
    const images = [
      { id: 'i1', path: '/c/i1.png' },
      { id: 'i2', path: '/c/i2.png' },
    ];
    expect(renderImageLines(content, images)).toBe('前\n![曲线](/c/i1.png)\n后\n![删了的](image)\n![](/c/i2.png)');
    expect(renderImageLines('只有字', [])).toBe('只有字');
    expect(renderImageLines('', [{ id: 'i2', path: '/c/i2.png' }])).toBe('![](/c/i2.png)');
  });
});
