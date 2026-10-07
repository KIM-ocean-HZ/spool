import { describe, expect, it } from 'vitest';
import type { Attachment } from '@/lib/db/attachments';
import { groupFileVersions } from './versions';

const file = (id: string, createdAt: number, supersededBy: string | null = null): Attachment => ({
  id,
  threadId: 't1',
  kind: 'file',
  target: `/x/${id}.pdf`,
  label: `${id}.pdf`,
  extractedText: null,
  extractedAt: null,
  extractionKind: null,
  includeInPack: false,
  aiAccess: true,
  createdAt,
  anchorBlockId: null,
  addedBy: 'user',
  supersededBy,
  supersededAt: supersededBy ? createdAt + 1 : null,
});

const shape = (files: Attachment[]) =>
  groupFileVersions(files).map((g) => [g.file.id, g.replaced, g.older.map((o) => o.id)]);

describe('右栏：被取代的收在新文件下面 (P6-4)', () => {
  it('没被取代的各占一行，新的在上', () => {
    expect(shape([file('a', 1), file('b', 3), file('c', 2)])).toEqual([
      ['b', false, []],
      ['c', false, []],
      ['a', false, []],
    ]);
  });

  it('v1 ← v2 ← v3：全部收在最新那个下面，新的在上；最新那个按自己的时间排', () => {
    expect(shape([file('v1', 1, 'v2'), file('v2', 5, 'v3'), file('v3', 9), file('other', 7)])).toEqual([
      ['v3', false, ['v2', 'v1']],
      ['other', false, []],
    ]);
  });

  it('新版不在这张表里了 ⇒ 旧版自己站一行、标着被取代，⛔ 不消失', () => {
    expect(shape([file('old', 1, 'gone'), file('x', 2)])).toEqual([
      ['x', false, []],
      ['old', true, []],
    ]);
  });

  it('手改出来的环不会卡死', () => {
    expect(shape([file('p', 1, 'q'), file('q', 2, 'p')]).length).toBe(1);
  });
});
