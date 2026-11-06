import { describe, expect, it } from 'vitest';
import type { Attachment } from '@/lib/db/attachments';
import type { Block } from '@/lib/db/blocks';
import type { Thread } from '@/lib/db/threads';
import { assemble, blockSeqMap } from './assemble';
import { packFileGaps } from './fileGaps';
import { buildProjectExport, exportableFiles } from './folder';
import { EXPORTED_FILES_NOTE } from './templates';

// P14 (H3, Ocean 2026-11-06) — the TS half of the seven-file matrix (the Rust half is mcp.rs
// `p14_file_states_do_not_mix_across_mcp_reads`, same files, same states). Here: the pack the user COPIES,
// the folder they EXPORT, and the line PackDialog shows. Four facts that must not bleed into each other —
// may an AI read it, did Spool get text out of it, is that text in this pack, is the file itself handed
// over — and in the user's own copy the first one does not apply: they are the one handing it over.

const NOW = new Date('2026-11-05T23:40:00').getTime();
const thread: Thread = {
  id: 't1', workspaceId: 'w1', title: 'CV', summary: null, digest: null, deadline: null, status: 'active',
  isCaptureTarget: false, autoMaintain: null, isPrivate: false, createdAt: NOW, updatedAt: NOW, completedAt: null,
};
const blocks = [
  { id: 'b1', threadId: 't1', kind: 'text', content: 'Compare the two CVs.', annotation: null, refThreadId: null,
    refBlockId: null, source: null, pinned: false, seq: 1, createdAt: NOW } as Block,
];
const body = (tag: string, n: number): string => tag.repeat(Math.ceil(n / tag.length)).slice(0, n);
const file = (
  id: string, label: string, inPack: boolean, ai: boolean, kind: Attachment['extractionKind'], text: string | null,
): Attachment => ({
  id, threadId: 't1', kind: 'file', target: `/x/${label}`, label, extractedText: text,
  extractedAt: kind == null ? null : NOW, extractionKind: kind, includeInPack: inPack, aiAccess: ai,
  createdAt: NOW + Number(id.slice(1)), anchorBlockId: null, addedBy: 'user', supersededBy: null, supersededAt: null,
});
const attachments: Attachment[] = [
  file('a1', 'notes.pdf', true, true, 'pdf', body('CANARY-A1 ', 1200)),
  file('a2', 'cv-teacher.docx', false, true, 'docx', body('CANARY-A2 ', 3600)),
  file('a3', 'reference.docx', true, false, 'docx', body('CANARY-A3 ', 2000)),
  file('a4', 'transcript.pdf', false, false, 'pdf', body('CANARY-A4 ', 900)),
  file('a5', 'scan.pdf', false, true, 'failed', null),
  file('a6', 'slides.key', false, false, null, null),
  file('a7', 'report.pdf', true, true, 'pdf', body('CANARY-A7 ', 12000)),
];
const common = {
  thread, blocks, attachments, fileAnchorSeqs: blockSeqMap(blocks), refTitles: new Map(), refBlocks: new Map(),
  scope: { range: 'all' as const, total: 1 }, instructions: true, outputLanguage: 'en' as const, now: NOW,
};
const rows = (pack: string): string[] =>
  pack.slice(pack.indexOf('## Related Files & Links')).split('\n').filter((l) => l.startsWith('- '));

describe('P14 · H3 —— 附件四种状态在手工复制和导出文件夹里不混', () => {
  it('复制：「打包可读」是用户自己的勾（锁着的也照放）；没放进来、截断、读不出、没有文字各说各的', () => {
    const pack = assemble(common);
    expect(rows(pack)).toEqual([
      '- notes.pdf (pdf) · on project',
      '- cv-teacher.docx  [extracted: yes, not inlined] · on project',
      '- reference.docx (docx) · on project',
      '- transcript.pdf  [extracted: yes, not inlined] · on project',
      '- scan.pdf  [text could not be extracted] · on project',
      '- slides.key · on project',
      '- report.pdf (pdf) · on project',
    ]);
    expect(pack).toContain('CANARY-A1');
    expect(pack).toContain('CANARY-A3'); // the user handing it over themselves
    expect(pack).not.toContain('CANARY-A2');
    expect(pack).not.toContain('CANARY-A4');
    expect(pack).toContain('[... truncated, 4000 more chars not shown ...]');
    // A copy carries no files, so nothing may claim they sit beside it.
    expect(pack).not.toContain(EXPORTED_FILES_NOTE);
    // The header no longer sends every reader to the user: a section after the pack (MCP only) comes first.
    expect(pack).toContain('To read it, follow\nthe section after the pack if there is one; else ask the user.');
    expect(pack).not.toContain('you may ask the user for it');
  });

  it('导出文件夹：勾上的原件都拷出去、名字链到拷贝，且只说一次「原件就在旁边」；文字照复制那份的规矩', () => {
    const ticked = new Set(exportableFiles(attachments).map((a) => a.id).filter((id) => id !== 'a6'));
    const exp = buildProjectExport({ ...common, range: 'all', choice: { files: ticked, images: true } });
    const md = exp.file.content;
    expect(exp.copies.map((c) => c.source)).toEqual(
      ['notes.pdf', 'cv-teacher.docx', 'reference.docx', 'transcript.pdf', 'scan.pdf', 'report.pdf'].map((n) => `/x/${n}`),
    );
    expect(md.split(EXPORTED_FILES_NOTE)).toHaveLength(2);
    expect(rows(md)).toEqual([
      '- [notes.pdf](files/notes.pdf) (pdf) · on project',
      '- [cv-teacher.docx](files/cv-teacher.docx)  [extracted: yes, not inlined] · on project',
      '- [reference.docx](files/reference.docx) (docx) · on project',
      '- [transcript.pdf](files/transcript.pdf)  [extracted: yes, not inlined] · on project',
      '- [scan.pdf](files/scan.pdf)  [text could not be extracted] · on project',
      '- slides.key · on project', // not ticked: no link, nothing copied
      '- [report.pdf](files/report.pdf) (pdf) · on project',
    ]);
    // Nothing ticked ⇒ no file beside the .md ⇒ the note is not there either.
    const bare = buildProjectExport({ ...common, range: 'all', choice: { files: new Set(), images: true } });
    expect(bare.file.content).not.toContain(EXPORTED_FILES_NOTE);
  });

  it('Pack 对话框那一行：复制那份里没全带上的文件，一个一条、为什么；锁着的照用户自己的勾算', () => {
    expect(packFileGaps(attachments)).toEqual([
      { name: 'cv-teacher.docx', reason: 'notInPack' },
      { name: 'transcript.pdf', reason: 'notInPack' },
      { name: 'scan.pdf', reason: 'failed' },
      { name: 'slides.key', reason: 'noText' },
      { name: 'report.pdf', reason: 'cut' },
    ]);
    // A replaced file is not in the pack at all, and a folder is not a file with missing text.
    const extra: Attachment[] = [
      { ...file('a8', 'old-cv.docx', false, true, 'docx', 'old'), supersededBy: 'a2' },
      { ...file('a9', 'repo', false, false, null, null), kind: 'folder' },
    ];
    expect(packFileGaps([...attachments, ...extra])).toHaveLength(5);
    expect(packFileGaps([attachments[0]!])).toEqual([]);
  });
});
