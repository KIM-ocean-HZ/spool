import { describe, expect, it } from 'vitest';
import type { Attachment } from '@/lib/db/attachments';
import type { Block } from '@/lib/db/blocks';
import type { Thread } from '@/lib/db/threads';
import { t } from '@/lib/i18n';
import type { PackImage, PackRange } from './assemble';
import { exportErrorMessage, formatBytes, isFound, pickedFiles, type SourceSize } from './exportList';
import { buildProjectExport, carriesAnything } from './folder';

const NOW = new Date('2026-10-10T12:00:00').getTime();

const thread: Thread = {
  id: 't1',
  workspaceId: 'w1',
  title: 'Flux',
  summary: null,
  digest: null,
  deadline: null,
  status: 'active',
  isCaptureTarget: false,
  autoMaintain: null,
  createdAt: NOW,
  updatedAt: NOW,
  completedAt: null,
};

const block = (id: string, seq: number, content: string, opts: Partial<Block> = {}): Block =>
  ({
    id,
    threadId: 't1',
    seq,
    kind: 'text',
    content,
    annotation: null,
    refThreadId: null,
    refBlockId: null,
    source: null,
    pinned: false,
    createdAt: NOW,
    ...opts,
  }) as Block;

const att = (id: string, target: string): Attachment => ({
  id,
  threadId: 't1',
  kind: 'file',
  target,
  label: '',
  extractedText: null,
  extractedAt: null,
  extractionKind: null,
  includeInPack: false,
  aiAccess: false,
  createdAt: NOW,
  anchorBlockId: null,
  addedBy: 'user',
  supersededBy: null,
  supersededAt: null,
});

const files = [att('a1', '/Users/o/a.pdf'), att('a2', '/Users/o/gone.pdf')];
const sizes = new Map<string, SourceSize>([
  ['/Users/o/a.pdf', { kind: 'file', bytes: 2048 }],
  ['/Users/o/gone.pdf', { kind: null, bytes: 0 }],
]);
const pic: PackImage = { id: 'i1', path: '/c/image-cache/i1.png', width: 1, height: 1, sizeBytes: 10 };

/** The way the dialog decides: its ticks → buildProjectExport → folder or single .md. */
const route = (o: {
  unticked?: string[];
  pictures: boolean;
  withPicture?: boolean;
  range?: PackRange;
  attachments?: Attachment[];
}): 'folder' | 'md' => {
  const attachments = o.attachments ?? files;
  const blocks = [block('b1', 1, '![图](spool-image:i1)', { createdAt: NOW - 90 * 86_400_000 })];
  const plan = buildProjectExport({
    thread,
    blocks,
    attachments,
    range: o.range ?? 'all',
    refTitles: new Map(),
    refBlocks: new Map(),
    images: o.withPicture === false ? new Map() : new Map([['b1', [pic]]]),
    choice: { files: pickedFiles(attachments, sizes, new Set(o.unticked)), images: o.pictures },
    instructions: true,
    outputLanguage: 'zh',
    now: NOW,
  });
  return carriesAnything(plan) ? 'folder' : 'md';
};

describe('which way an export goes (P8-3)', () => {
  it('as opened — everything ticked — it is a folder', () => {
    expect(route({ pictures: true })).toBe('folder');
  });

  it('a file alone, or the pictures alone, is still a folder', () => {
    expect(route({ pictures: false })).toBe('folder');
    expect(route({ unticked: ['a1'], pictures: true })).toBe('folder');
  });

  it('nothing ticked is the single .md, as before', () => {
    expect(route({ unticked: ['a1'], pictures: false })).toBe('md');
  });

  it('a project with nothing on this computer and no pictures is the single .md', () => {
    expect(route({ attachments: [att('a2', '/Users/o/gone.pdf')], pictures: true, withPicture: false })).toBe('md');
  });

  it('pictures outside the range do not make it a folder', () => {
    expect(route({ unticked: ['a1'], pictures: true, range: 'last7' })).toBe('md');
  });
});

describe('the export list (P8-3)', () => {
  it('starts with every file ticked — except one not on this computer, which cannot be', () => {
    expect([...pickedFiles(files, sizes, new Set())]).toEqual(['a1']);
    expect([...pickedFiles(files, sizes, new Set(['a1']))]).toEqual([]);
  });

  it('a size not known yet does not lock a row (Rust checks again before writing)', () => {
    expect(isFound(null, files[1]!)).toBe(true);
    expect(isFound(new Map(), files[1]!)).toBe(true);
    expect(isFound(sizes, files[1]!)).toBe(false);
  });

  it('writes sizes the way the rest of the app does', () => {
    expect(formatBytes(0)).toBe('0 KB');
    expect(formatBytes(300)).toBe('1 KB');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(6.5 * 1024 * 1024)).toBe('6.5 MB');
  });

  it('names the files that disappeared after the list was drawn', () => {
    const msg = exportErrorMessage('missing:["/Users/o/Docs/a.pdf","/Users/o/b c.docx"]');
    expect(msg).toContain('a.pdf、b c.docx');
    expect(msg).not.toContain('/Users/');
    expect(exportErrorMessage('no_image')).toBe(t('有图片已经不在库里了，所以什么都没导出。关掉再打开一次试试。'));
    expect(exportErrorMessage('disk full')).toBe(t('没导出成，换个位置再试一次'));
    // The workspace export keeps showing Rust's own words for everything else, as it always did.
    expect(exportErrorMessage('目录不存在：/x', '目录不存在：/x')).toBe('目录不存在：/x');
  });
});
