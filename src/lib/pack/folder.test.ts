import { describe, expect, it } from 'vitest';
import type { Attachment } from '@/lib/db/attachments';
import type { Block } from '@/lib/db/blocks';
import type { Thread } from '@/lib/db/threads';
import { assemble, blockSeqMap, filterBlocksForRange, type PackImage, type PackRange } from './assemble';
import {
  buildPackFolder,
  buildProjectExport,
  exportFileName,
  indexSummary,
  sanitizeFolderName,
  sanitizeSegment,
  type ExportChoice,
  type PackProject,
  type PackWorkspaceNode,
} from './folder';

const NOW = new Date('2026-08-17T14:30:00').getTime();

const thread = (id: string, title: string, opts: Partial<Thread> = {}): Thread => ({
  id,
  workspaceId: 'w1',
  title,
  summary: null,
  digest: null,
  deadline: null,
  status: 'active',
  isCaptureTarget: false,
  autoMaintain: null,
  createdAt: NOW,
  updatedAt: NOW,
  completedAt: null,
  ...opts,
});

const block = (id: string, threadId: string, content: string, opts: Partial<Block> = {}): Block =>
  ({
    id,
    threadId,
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

const project = (id: string, title: string, blocks: Block[], t?: Partial<Thread>): PackProject => ({
  thread: thread(id, title, t),
  blocks,
  attachments: [],
});

const build = (root: Parameters<typeof buildPackFolder>[0]['root']) =>
  buildPackFolder({
    root,
    range: 'all',
    refTitles: new Map(),
    refBlocks: new Map(),
    outputLanguage: 'zh',
    now: NOW,
  });

describe('sanitizeSegment', () => {
  it('keeps Chinese titles as they are', () => {
    expect(sanitizeSegment('材料准备')).toBe('材料准备');
  });

  it('turns separators and spaces into single dashes', () => {
    expect(sanitizeSegment('Georgia Tech MS')).toBe('Georgia-Tech-MS');
    expect(sanitizeSegment('a/b:c')).toBe('a-b-c');
  });

  it('never returns an empty path segment', () => {
    // A workspace created with ＋ and never named is the common case, not an edge one.
    expect(sanitizeSegment('')).toBe('untitled');
    expect(sanitizeSegment('   ')).toBe('untitled');
    expect(sanitizeSegment('...')).toBe('untitled');
  });

  it('refuses to end a name in a dot, which would confuse the extension', () => {
    expect(sanitizeSegment('v1.')).toBe('v1');
  });
});

// Ocean 2026-08-17: the export folder is now named by the user, not only derived.
describe('sanitizeFolderName', () => {
  // ⚠️ The point of this function existing next to sanitizeSegment: a name the USER typed
  // keeps its spaces. Routing this through sanitizeSegment would silently rewrite 「学校 2026
  // 秋」 to 「学校-2026-秋」 — a normalisation that is right for a derived filename and wrong
  // for one somebody chose.
  it('keeps what the user typed, spaces and all', () => {
    expect(sanitizeFolderName('学校 2026 秋', 'fallback')).toBe('学校 2026 秋');
    expect(sanitizeFolderName('My Pack v2', 'fallback')).toBe('My Pack v2');
  });

  it('still removes what a path segment cannot hold', () => {
    expect(sanitizeFolderName('a/b\\c:d', 'fallback')).toBe('a-b-c-d');
    expect(sanitizeFolderName('..', 'fallback')).toBe('fallback');
    expect(sanitizeFolderName('.hidden', 'fallback')).toBe('hidden');
  });

  it('an empty box means "use the name you suggested"', () => {
    expect(sanitizeFolderName('', 'spool-学校-20260817')).toBe('spool-学校-20260817');
    expect(sanitizeFolderName('   ', 'spool-学校-20260817')).toBe('spool-学校-20260817');
  });
});

describe('indexSummary', () => {
  it('prefers the project summary', () => {
    const t = thread('t1', '申请规划', { summary: '已经定了三所学校，等推荐信' });
    expect(indexSummary(t, [])).toBe('已经定了三所学校，等推荐信');
  });

  it('caps a long summary at the same 40 characters the fallback uses', () => {
    // Ocean 2026-08-17: 「不需要 120 字，每个项目的标题信息量足够了，加上 40 字辅助」— the file
    // NAME carries the first half of the line, so both kinds of half-line get one budget.
    const t = thread('t1', '申请规划', { summary: 'x'.repeat(60) });
    expect(indexSummary(t, [])).toBe('x'.repeat(40) + '…');
  });

  it('falls back to the head of the first live block', () => {
    const t = thread('t1', '申请规划');
    expect(indexSummary(t, [block('b1', 't1', 'GT 的截止日是 12 月 15 日')])).toBe(
      'GT 的截止日是 12 月 15 日',
    );
  });

  it('skips retired blocks when falling back', () => {
    const t = thread('t1', '申请规划');
    const blocks = [
      block('b1', 't1', '这条已经不成立了', { staleAt: NOW } as Partial<Block>),
      block('b2', 't1', '这条还成立'),
    ];
    expect(indexSummary(t, blocks)).toBe('这条还成立');
  });

  it('is empty rather than invented when the project has neither', () => {
    expect(indexSummary(thread('t1', '空项目'), [])).toBe('');
  });
});

describe('buildPackFolder', () => {
  const tree = {
    title: '升学',
    projects: [
      project('t1', '申请规划', [block('b1', 't1', '定了三所学校')], {
        summary: '等推荐信',
      }),
      project('t2', 'Georgia Tech MS', [block('b2', 't2', '截止 12/15')]),
    ],
    children: [
      {
        title: '材料准备',
        projects: [project('t3', '文书', [block('b3', 't3', 'PS 第三稿')])],
        children: [],
      },
    ],
  };

  it('names the export folder after the workspace and the day', () => {
    expect(build(tree).folderName).toBe('spool-升学-20260817');
  });

  it('puts INDEX.md first and maps sub-workspaces onto sub-directories', () => {
    expect(build(tree).files.map((f) => f.path)).toEqual([
      'INDEX.md',
      '01-申请规划.md',
      '02-Georgia-Tech-MS.md',
      '材料准备/01-文书.md',
    ]);
  });

  it('opens every project file with the order to read INDEX.md, with the right path', () => {
    const files = build(tree).files;
    const top = files.find((f) => f.path === '01-申请规划.md')!;
    const nested = files.find((f) => f.path === '材料准备/01-文书.md')!;
    expect(top.content.startsWith('> **Read `INDEX.md` in this folder first.**')).toBe(true);
    // ⚠️ One rules file for the whole export — a nested file points UP at it, not at a copy.
    expect(nested.content.startsWith('> **Read `../INDEX.md` at the top of this export first.**'))
      .toBe(true);
  });

  it('keeps the four-category rules in INDEX.md only (拍板乙, not 甲)', () => {
    const files = build(tree).files;
    const index = files.find((f) => f.path === 'INDEX.md')!;
    expect(index.content).toContain('## How to Read This Context');
    for (const f of files.filter((f) => f.path !== 'INDEX.md')) {
      expect(f.content).not.toContain('## How to Read This Context');
    }
  });

  it('states the rules before the catalogue, because INDEX.md is a rules file', () => {
    const index = build(tree).files[0]!.content;
    expect(index.indexOf('## How to Read This Context')).toBeLessThan(
      index.indexOf('## What is in this folder'),
    );
  });

  it('lists every project with its block count and summary', () => {
    const index = build(tree).files[0]!.content;
    expect(index).toContain('- `01-申请规划.md` — 1 block — 等推荐信');
    expect(index).toContain('- `材料准备/` — a workspace inside this one');
    expect(index).toContain('  - `材料准备/01-文书.md` — 1 block — PS 第三稿');
  });

  it('says the export is a snapshot, with the moment it was taken', () => {
    const index = build(tree).files[0]!.content;
    expect(index).toContain('Exported by Spool on 2026-08-17 14:30');
    expect(index).toContain('**This is a one-time snapshot**');
  });

  it('admits in INDEX.md when a range narrowed the export', () => {
    const narrowed = buildPackFolder({
      root: tree,
      range: 'pinned',
      refTitles: new Map(),
      refBlocks: new Map(),
      outputLanguage: 'zh',
      now: NOW,
    });
    expect(narrowed.files[0]!.content).toContain('Only blocks the user pinned as core context');
  });

  it('does not lose a project whose title collides with a sibling', () => {
    // Two projects can share a title; the numeric prefix already separates them, and this
    // pins that — a collision that silently overwrote a file would drop a whole project.
    const paths = build({
      title: '升学',
      projects: [
        project('t1', '文书', [block('b1', 't1', 'a')]),
        project('t2', '文书', [block('b2', 't2', 'b')]),
      ],
      children: [],
    }).files.map((f) => f.path);
    expect(paths).toEqual(['INDEX.md', '01-文书.md', '02-文书.md']);
  });

  it('does not lose a sub-workspace whose title collides with a sibling', () => {
    const paths = build({
      title: '升学',
      projects: [],
      children: [
        { title: '文书', projects: [project('t1', 'a', [])], children: [] },
        { title: '文书', projects: [project('t2', 'b', [])], children: [] },
      ],
    }).files.map((f) => f.path);
    expect(paths).toEqual(['INDEX.md', '文书/01-a.md', '文书-2/01-b.md']);
  });

  it('exports an empty workspace as an INDEX.md that says so', () => {
    const out = build({ title: '空工作区', projects: [], children: [] });
    expect(out.files.map((f) => f.path)).toEqual(['INDEX.md']);
    expect(out.files[0]!.content).toContain('(nothing was selected for export)');
  });
});

// ---------------------------------------------------------------------------------------
// P8 — files and pictures in an export.
// ---------------------------------------------------------------------------------------

const att = (id: string, target: string, opts: Partial<Attachment> = {}): Attachment => ({
  id,
  threadId: 't1',
  kind: 'file',
  target,
  label: target.split('/').pop()!,
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
  ...opts,
});

const CACHE = '/Users/ocean/Library/Application Support/com.oceanjin.spool/image-cache';
const pic = (id: string, ext = 'png'): PackImage => ({
  id,
  path: `${CACHE}/${id}.${ext}`,
  width: 4,
  height: 3,
  sizeBytes: 100,
});

const DAY = 86_400_000;
// #1 names its picture in the text; #2 is from before 图文混排 (its picture has no line and
// follows the text); #3 is retired; #4 is two months old — outside 「近 7 天」.
const p8Blocks = (threadId = 't1'): Block[] => [
  block('b1', threadId, '先看这张\n![架构图](spool-image:img1)\n后面的字', { seq: 1 } as Partial<Block>),
  block('b2', threadId, '旧块', { seq: 2 } as Partial<Block>),
  block('b3', threadId, '退役了 ![x](spool-image:img3)', { seq: 3, staleAt: NOW } as Partial<Block>),
  block('b4', threadId, '很早以前', { seq: 4, createdAt: NOW - 60 * DAY } as Partial<Block>),
];
const p8Images = (prefix = ''): Map<string, PackImage[]> =>
  new Map([
    [`${prefix}b1`, [pic(`${prefix}img1`)]],
    [`${prefix}b2`, [pic(`${prefix}img2`, 'jpg')]],
    [`${prefix}b3`, [pic(`${prefix}img3`)]],
    [`${prefix}b4`, [pic(`${prefix}img4`)]],
  ]);
const p8Files = (): Attachment[] => [
  att('a1', '/Users/ocean/Docs/Report.pdf', { anchorBlockId: 'b1' }),
  att('a2', '/Users/ocean/Other/report.pdf'),
  att('a3', '/Users/ocean/Docs/old.pdf', { supersededBy: 'a1' }),
  att('a4', '/Users/ocean/Notes', { kind: 'folder' }),
];

const exportOf = (choice: ExportChoice, range: PackRange = 'all') =>
  buildProjectExport({
    thread: thread('t1', 'Flux 研究'),
    blocks: p8Blocks(),
    attachments: p8Files(),
    range,
    refTitles: new Map(),
    refBlocks: new Map(),
    images: p8Images(),
    choice,
    instructions: true,
    outputLanguage: 'zh',
    now: NOW,
  });

const todayOf = (range: PackRange = 'all') =>
  assemble({
    thread: thread('t1', 'Flux 研究'),
    blocks: filterBlocksForRange(p8Blocks(), range, NOW),
    attachments: p8Files(),
    fileAnchorSeqs: blockSeqMap(p8Blocks()),
    refTitles: new Map(),
    refBlocks: new Map(),
    scope: { range, total: 4 },
    images: p8Images(),
    instructions: true,
    outputLanguage: 'zh',
    now: NOW,
  });

const ALL: ExportChoice = { files: new Set(['a1', 'a2', 'a3', 'a4']), images: true };
const NONE: ExportChoice = { files: new Set(), images: false };

/** A path of this computer, anywhere in the text: starting with `/`, `~/` or a drive letter. */
const LOCAL_PATH = /(^|[\s(<[`'"])(\/|~\/|[A-Za-z]:[\\/])\S/m;

const lineOf = (text: string, needle: string): string => text.split('\n').find((l) => l.includes(needle))!;

describe('buildProjectExport (P8)', () => {
  it('links a ticked file to its copy, and leaves an unticked one as it was', () => {
    const out = exportOf({ files: new Set(['a1']), images: false }).file.content;
    expect(lineOf(out, 'Report.pdf')).toBe('- [Report.pdf](files/Report.pdf) · on #1');
    expect(lineOf(out, 'report.pdf')).toBe(lineOf(todayOf(), 'report.pdf'));
    expect(lineOf(out, 'Notes')).toBe(lineOf(todayOf(), 'Notes'));
  });

  it('copies exactly the ticked files, a folder like a file, never a replaced one', () => {
    const { copies } = exportOf(ALL);
    expect(copies).toEqual([
      { source: '/Users/ocean/Docs/Report.pdf', path: 'files/Report.pdf' },
      // Same name on a case-insensitive disk ⇒ -2, before the extension.
      { source: '/Users/ocean/Other/report.pdf', path: 'files/report-2.pdf' },
      { source: '/Users/ocean/Notes', path: 'files/Notes' },
    ]);
  });

  it('keeps the extension of a long or oddly named file', () => {
    expect(exportFileName(`/x/${'很长'.repeat(40)}.pdf`)).toMatch(/\.pdf$/);
    expect(exportFileName('/x/第 3 周: 笔记.docx')).toBe('第-3-周-笔记.docx');
    expect(exportFileName('/x/.env')).toBe('env');
  });

  it('takes the pictures of the blocks in this pack only, named after their block', () => {
    const narrowed = exportOf(ALL, 'last7');
    // #3 is retired and #4 is outside the range: neither picture goes.
    expect(narrowed.pictures).toEqual([
      { id: 'img1', path: 'images/1-1.png' },
      { id: 'img2', path: 'images/2-1.jpg' },
    ]);
    const out = narrowed.file.content;
    expect(out).toContain('先看这张\n![架构图](images/1-1.png)\n后面的字');
    // The old block's unnamed picture still follows its text.
    expect(out).toContain('旧块\n![](images/2-1.jpg)');
  });

  it('without the pictures, keeps each caption only — and adds none after the text', () => {
    const { file, pictures } = exportOf({ files: new Set(['a1']), images: false });
    expect(pictures).toEqual([]);
    expect(file.content).toContain('先看这张\n![架构图](image)\n后面的字');
    // ⚠️ #2's picture has no line of its own; without the pictures nothing is added for it.
    expect(lineOf(file.content, '旧块')).toMatch(/旧块$/);
    expect(file.content).not.toContain('![](');
  });

  it('never writes a path of this computer into the .md, whichever way it is ticked', () => {
    const ways: ExportChoice[] = [
      ALL,
      { files: ALL.files, images: false },
      { files: new Set(), images: true },
      NONE,
    ];
    for (const choice of ways) {
      const out = exportOf(choice).file.content;
      expect(out).not.toContain('/Users/');
      expect(out).not.toMatch(LOCAL_PATH);
    }
    // …while the copied pack still prints them, exactly as before (§9.2 第 47 / 48 条) — which
    // is also what shows LOCAL_PATH can see one.
    expect(todayOf()).toContain(`${CACHE}/img1.png`);
    expect(todayOf()).toMatch(LOCAL_PATH);
  });

  it('is the dialog’s own pack plus the export’s two differences, byte for byte', () => {
    const expected = assemble({
      thread: thread('t1', 'Flux 研究'),
      blocks: p8Blocks(),
      attachments: p8Files(),
      fileAnchorSeqs: blockSeqMap(p8Blocks()),
      refTitles: new Map(),
      refBlocks: new Map(),
      scope: { range: 'all', total: 4 },
      images: new Map([
        ['b1', [{ ...pic('img1'), path: 'images/1-1.png' }]],
        ['b2', [{ ...pic('img2', 'jpg'), path: 'images/2-1.jpg' }]],
        ['b4', [{ ...pic('img4'), path: 'images/4-1.png' }]],
      ]),
      exportedFiles: new Map([
        ['a1', 'files/Report.pdf'],
        ['a2', 'files/report-2.pdf'],
        ['a4', 'files/Notes'],
      ]),
      instructions: true,
      outputLanguage: 'zh',
      now: NOW,
    });
    expect(exportOf(ALL).file.content).toBe(expected);
    expect(exportOf(ALL).file.path).toBe('pack.md');
  });

  it('with nothing ticked in a project without pictures, is today’s pack byte for byte', () => {
    const plain = (choice: ExportChoice | null) => {
      const args = {
        thread: thread('t1', 'Flux 研究'),
        blocks: [block('b1', 't1', 'hi', { seq: 1 } as Partial<Block>)],
        attachments: [att('a1', '/Users/ocean/Docs/Report.pdf')],
        refTitles: new Map(),
        refBlocks: new Map(),
        instructions: true,
        outputLanguage: 'zh' as const,
        now: NOW,
      };
      return choice
        ? buildProjectExport({ ...args, range: 'all', choice }).file.content
        : assemble({ ...args, fileAnchorSeqs: blockSeqMap(args.blocks), scope: { range: 'all', total: 1 } });
    };
    expect(plain(NONE)).toBe(plain(null));
  });
});

describe('buildPackFolder with files and pictures (P8)', () => {
  const p = (id: string, title: string, prefix: string): PackProject => ({
    thread: thread(id, title),
    blocks: p8Blocks(id).map((b) => ({
      ...b,
      id: `${prefix}${b.id}`,
      content: b.content.replace(/spool-image:img/g, `spool-image:${prefix}img`),
    })),
    attachments: p8Files().map((a) => ({
      ...a,
      id: `${prefix}${a.id}`,
      threadId: id,
      anchorBlockId: a.anchorBlockId && `${prefix}${a.anchorBlockId}`,
    })),
  });
  // Two levels deep, and a sub-workspace whose name would be the top project's folder.
  const tree: PackWorkspaceNode = {
    title: '升学',
    projects: [p('t1', '项目', 'x')],
    children: [
      { title: '01 项目', projects: [], children: [{ title: '空', projects: [p('t9', 'k', 'z')], children: [] }] },
      {
        title: '材料准备',
        projects: [],
        children: [{ title: '文书', projects: [p('t3', 'PS', 'y')], children: [] }],
      },
    ],
  };
  const images = new Map([...p8Images('x'), ...p8Images('y'), ...p8Images('z')]);
  const folderOf = (choice?: ExportChoice) =>
    buildPackFolder({
      root: tree,
      range: 'all',
      refTitles: new Map(),
      refBlocks: new Map(),
      outputLanguage: 'zh',
      images,
      choice,
      now: NOW,
    });

  it('puts each project’s files in the folder beside its own .md, two levels deep too', () => {
    const out = folderOf({ files: new Set(['xa1', 'ya1']), images: true });
    const ps = out.files.find((f) => f.path === '材料准备/文书/01-PS.md')!;
    expect(lineOf(ps.content, 'Report.pdf')).toBe('- [Report.pdf](01-PS/files/Report.pdf) · on #1');
    expect(ps.content).toContain('![架构图](01-PS/images/1-1.png)');
    expect(out.copies).toContainEqual({ source: '/Users/ocean/Docs/Report.pdf', path: '材料准备/文书/01-PS/files/Report.pdf' });
    expect(out.pictures).toContainEqual({ id: 'yimg1', path: '材料准备/文书/01-PS/images/1-1.png' });
  });

  it('every link, followed from its own .md, lands on something the export writes', () => {
    const out = folderOf({ files: new Set(['xa1', 'xa2', 'xa4', 'ya1', 'za2']), images: true });
    const written = new Set([...out.copies, ...out.pictures].map((c) => c.path));
    let links = 0;
    for (const f of out.files) {
      const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '';
      for (const [, target] of f.content.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (target === 'image') continue;
        expect(target).not.toContain('..');
        expect(written.has(dir ? `${dir}/${target}` : target)).toBe(true);
        links++;
      }
      expect(f.content).not.toMatch(LOCAL_PATH);
    }
    expect(links).toBe(written.size);
  });

  it('a sub-workspace named like a project’s folder steps aside — only when that folder exists', () => {
    const carried = folderOf({ files: new Set(['xa1']), images: false }).files.map((f) => f.path);
    expect(carried).toContain('01-项目-2/空/01-k.md');
    const bare = folderOf({ files: new Set(), images: false }).files.map((f) => f.path);
    expect(bare).toContain('01-项目/空/01-k.md');
  });

  it('says once in INDEX.md where those folders are — and only when there are some', () => {
    const sentence = 'A folder named like a project file';
    expect(folderOf({ files: new Set(['xa1']), images: false }).files[0]!.content).toContain(sentence);
    expect(folderOf({ files: new Set(), images: false }).files[0]!.content).not.toContain(sentence);
  });

  it('with nothing ticked and no pictures, writes today’s files exactly', () => {
    const noPictures = (choice?: ExportChoice) =>
      buildPackFolder({
        root: tree,
        range: 'all',
        refTitles: new Map(),
        refBlocks: new Map(),
        outputLanguage: 'zh',
        choice,
        now: NOW,
      });
    const today = noPictures();
    const ticked = noPictures(NONE);
    expect(ticked.files).toEqual(today.files);
    expect(ticked.copies).toEqual([]);
    expect(ticked.pictures).toEqual([]);
    // With pictures in the projects but the switch off: captions only, no path (第 52 条).
    const off = folderOf(NONE);
    expect(off.pictures).toEqual([]);
    for (const f of off.files) expect(f.content).not.toMatch(LOCAL_PATH);
    expect(off.files.find((f) => f.path === '01-项目.md')!.content).toContain('![架构图](image)');
  });
});
