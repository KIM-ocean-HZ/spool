import type { Attachment } from '@/lib/db/attachments';
import type { Block } from '@/lib/db/blocks';
import type { Thread } from '@/lib/db/threads';
import {
  assemble,
  baseName,
  blockSeqMap,
  filterBlocksForRange,
  formatPackDate,
  formatPackTime,
  headAnchor,
  type CitedBlock,
  type PackImage,
  type PackRange,
} from './assemble';
import { INSTRUCTION_HEADER } from './templates';

// Packing a whole workspace as a real folder — DESIGN_WORKSPACE_PACK §1.2 / §2.
//
// ⭐⭐ The rule this whole module is built around (Ocean 2026-08-17): 「不能降级……spool 不能
// 损失信息……但是文字内容不应该损失」. Nothing here trims, budgets, or summarises away a block.
// The saving comes from SHAPE — a directory the receiving AI opens selectively, 「类似代码
// 阅读」 — not from sending less. Every project's body is byte-for-byte what the single-project
// pack would have produced.
//
// English throughout, for the reason templates.ts already states: these lines are a contract
// with the receiving model, and receiving AIs follow English instructions (especially the
// negative ones) more reliably. The user's own content stays in whatever language they wrote.

/** One file of the export: path relative to the export root, plus its whole content. */
export interface PackFile {
  path: string;
  content: string;
  /** Which project produced this file; absent on INDEX.md. The dialog shows a per-project
   *  character count and reads it from here — measuring the actual bytes rather than
   *  estimating them a second way, which is how a footer total starts disagreeing with the
   *  rows above it. */
  threadId?: string;
}

/** A project the user ticked, with everything assemble() needs for it. */
export interface PackProject {
  thread: Thread;
  /** ALL of the project's blocks — the range filter is applied here, not by the caller. */
  blocks: Block[];
  attachments: Attachment[];
}

/** A workspace and the part of its subtree the user ticked. */
export interface PackWorkspaceNode {
  title: string;
  projects: PackProject[];
  children: PackWorkspaceNode[];
}

export interface BuildPackFolderArgs {
  root: PackWorkspaceNode;
  range: PackRange;
  refTitles: Map<string, string>;
  refBlocks: Map<string, CitedBlock>;
  outputLanguage: 'zh' | 'en';
  /** P7-8: block id → its pictures, for the `image:` lines (any project in the tree). */
  images?: ReadonlyMap<string, readonly PackImage[]>;
  /** P8: what the user ticked in the export list. Omitted = the .md files only, exactly as before. */
  choice?: ExportChoice;
  now?: number;
}

export interface PackFolder {
  /** Name for the export folder itself. The caller picks the directory it goes in. */
  folderName: string;
  files: PackFile[];
  /** P8: what goes beside the .md files — empty unless something was ticked. Paths are
   *  relative to the export root, like `files`'. */
  copies: PackCopy[];
  pictures: PackPicture[];
}

/** Fallback name for a workspace or project with no title — never an empty path segment. */
const UNTITLED = 'untitled';

const oneLine = (s: string): string => s.replace(/\s+/g, ' ').trim();

/**
 * A user's title as one path segment. Mirrored by `segment_is_safe` in src-tauri/pack.rs,
 * which rejects rather than cleans — this is the cleaning half, that is the check that does
 * not trust it.
 *
 * ⚠️ Non-ASCII is kept. 「材料准备」 is a perfectly good folder name on macOS, and
 * transliterating it would make the folder unrecognisable to the person who named it.
 */
export const sanitizeSegment = (title: string): string => {
  const cleaned = oneLine(title)
    .replace(/[/\\:*?"<>|\s-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 60)
    .replace(/[-.]+$/g, '');
  return cleaned || UNTITLED;
};

/**
 * Clean a folder name the USER typed (Ocean 2026-08-17: 「打包工作区变成文件夹需要让用户
 * 可以自主命名」).
 *
 * ⭐ Deliberately NOT `sanitizeSegment`. That one normalises a name DERIVED from a project
 * title — it turns spaces into dashes so generated filenames come out uniform. A name the
 * user typed is not one we generated: 「学校 2026 秋」 should stay exactly that, spaces and
 * all, and only what a filesystem genuinely cannot take gets removed. Still mirrored by
 * `segment_is_safe` in pack.rs, which rejects rather than cleans.
 *
 * Falls back rather than failing: an empty box means "use the name you suggested".
 */
export const sanitizeFolderName = (input: string, fallback: string): string => {
  const cleaned = oneLine(input)
    .replace(/\p{Cc}/gu, '')
    .replace(/[/\\:]/g, '-')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 80)
    .trim();
  return cleaned || fallback;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Makes a name unique within one directory. Sub-workspaces have no numeric prefix to
 *  separate them, so two sibling workspaces called 「文书」 would otherwise be one folder. */
const uniqueIn = (taken: Set<string>, name: string): string => {
  if (!taken.has(name)) {
    taken.add(name);
    return name;
  }
  for (let i = 2; ; i++) {
    const candidate = `${name}-${i}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
};

// ---------------------------------------------------------------------------------------
// P8 (Ocean 2026-09-30 §9.2 第 12 条, 10-08 第 50 条, 10-10 第 52–53 条) — an export can carry the
// project's files and pictures. The .md then links to them by RELATIVE path, always downward
// (`files/…`, `images/…`, never `..`), so the folder works as a whole wherever it is handed — a
// web AI included — and ⛔ no path of this computer is written into the .md, however it is ticked.
// ---------------------------------------------------------------------------------------

/** What the user ticked in the export list. */
export interface ExportChoice {
  /** Attachment ids, one by one (第 12 条). */
  files: ReadonlySet<string>;
  /** One switch for every picture in the export (第 53 条). Off ⇒ each picture line keeps its
   *  caption only, `![caption](image)` (第 52 条). */
  images: boolean;
}

/** A project file copied as it is — `write_pack_export`'s `copies`. */
export interface PackCopy {
  source: string;
  path: string;
}

/** A picture written out of the library — `write_pack_export`'s `images`. */
export interface PackPicture {
  id: string;
  path: string;
}

/** The files an export can carry: the ones its pack lists. A file a newer version replaced is in
 *  neither (P6-4). */
export const exportableFiles = (attachments: readonly Attachment[]): Attachment[] =>
  attachments.filter((a) => a.supersededBy == null);

/** The pictures this pack really prints: blocks inside the range, minus the retired ones
 *  assemble drops. ⚠️ Not the project's files — those follow the project, not the range (v15). */
export const packedPictures = (
  blocks: Block[],
  range: PackRange,
  images: ReadonlyMap<string, readonly PackImage[]> | undefined,
  now: number,
): { block: Block; images: readonly PackImage[] }[] =>
  filterBlocksForRange(blocks, range, now).flatMap((block) => {
    const list = block.staleAt == null ? images?.get(block.id) : undefined;
    return list && list.length > 0 ? [{ block, images: list }] : [];
  });

/** A file's name inside `files/`: its own name on disk, cleaned like a title, the extension kept
 *  whole (sanitizeSegment stops at 60 characters and would take a `.pdf` with it). */
export const exportFileName = (target: string): string => {
  const name = baseName(target);
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return sanitizeSegment(name);
  return `${sanitizeSegment(name.slice(0, dot))}.${sanitizeSegment(name.slice(dot + 1))}`;
};

/** Two files of one project with the same name: the second becomes `name-2.ext`. ⚠️ Compared
 *  case-folded — a Mac disk is case-insensitive by default, so 「Report.pdf」 and 「report.pdf」
 *  would be one file there. */
const uniqueFileName = (taken: Set<string>, name: string): string => {
  const dot = name.lastIndexOf('.');
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  for (let i = 1; ; i++) {
    const candidate = i === 1 ? name : `${stem}-${i}${ext}`;
    if (!taken.has(candidate.toLowerCase())) {
      taken.add(candidate.toLowerCase());
      return candidate;
    }
  }
};

/** `.png` / `.jpg` / … of the cached copy — the extension Rust checks the picture against. */
const extOf = (path: string): string => /\.[A-Za-z0-9]+$/.exec(path)?.[0] ?? '.png';

interface ProjectPlan {
  /** For assemble: attachment id → link, relative to the .md. */
  exportedFiles: Map<string, string>;
  /** For assemble: the pictures under their new names — undefined when they are not taken. */
  images: Map<string, PackImage[]> | undefined;
  /** For Rust, also relative to the .md; the caller adds the .md's own directory. */
  copies: PackCopy[];
  pictures: PackPicture[];
}

/** One project's share of an export. `dir` is the project's own folder as seen from its .md:
 *  '' when `files/` and `images/` sit right beside it (one project), `01-项目` in a workspace. */
const planProject = (
  blocks: Block[],
  attachments: readonly Attachment[],
  range: PackRange,
  images: ReadonlyMap<string, readonly PackImage[]> | undefined,
  choice: ExportChoice,
  dir: string,
  now: number,
): ProjectPlan => {
  const under = (sub: string, name: string): string => (dir ? `${dir}/${sub}/${name}` : `${sub}/${name}`);
  const exportedFiles = new Map<string, string>();
  const copies: PackCopy[] = [];
  const taken = new Set<string>();
  for (const a of exportableFiles(attachments)) {
    if (!choice.files.has(a.id)) continue;
    const path = under('files', uniqueFileName(taken, exportFileName(a.target)));
    exportedFiles.set(a.id, path);
    copies.push({ source: a.target, path });
  }
  if (!choice.images) return { exportedFiles, images: undefined, copies, pictures: [] };

  // Named after the block that holds them (`12-1.png` = #12's first picture), so a reader of
  // the folder can tell where each one belongs without the .md.
  const renamed = new Map<string, PackImage[]>();
  const pictures: PackPicture[] = [];
  for (const { block, images: list } of packedPictures(blocks, range, images, now)) {
    renamed.set(
      block.id,
      list.map((img, i) => {
        const stem = block.seq != null ? `${block.seq}-${i + 1}` : img.id;
        const path = under('images', `${stem}${extOf(img.path)}`);
        pictures.push({ id: img.id, path });
        return { ...img, path };
      }),
    );
  }
  return { exportedFiles, images: renamed, copies, pictures };
};

/**
 * The half-line after a project's file name in INDEX.md: its own summary when it has one,
 * otherwise the head of its first block. Empty when it has neither — an invented sentence
 * would be worse than a missing one.
 *
 * ⚠️ 40 characters (headAnchor) for BOTH, and that is a decision rather than a leftover.
 * The real export of 学校 gave every one of its 23 projects the fallback (none had a summary),
 * and I proposed widening it to 120 so a pasted table would say more. Ocean 2026-08-17:
 * 「不需要 120 字，每个项目的标题信息量足够了，加上 40 字辅助」.
 *
 * ⭐ He is pointing at something the proposal had missed: **the file NAME is already the
 * first half of this line**, and he writes his project titles to be read (「Georgia Tech MS
 * HCI (Computing track)」). The summary is the supporting half, not the whole answer — so
 * the question was never 「is 40 characters enough to describe a project」 but 「is 40 enough
 * ON TOP OF the title」. Widening it would have paid 23 lines of pasted table for a question
 * the title had already answered.
 */
export const indexSummary = (thread: Thread, blocks: Block[]): string => {
  const summary = oneLine(thread.summary ?? '');
  if (summary) return headAnchor(summary);
  const first = blocks.find((b) => b.staleAt == null && b.content.trim());
  return first ? headAnchor(first.content) : '';
};

/**
 * The instruction at the top of every project file (§2.1 拍板乙 — Ocean: 「index 类似于
 * claude.md 的作用，让 ai 按照规则执行」).
 *
 * ⚠️ It is an imperative plus a CONSEQUENCE, not a cross-reference. 乙 buys its saving with a
 * bet that the AI actually opens INDEX.md, and a pointer that only says 「see also」 gives it
 * every reason not to. The consequence half is what makes the bet payable.
 *
 * ⚠️ A file in a sub-workspace points at the SAME top-level INDEX.md — the rules exist once.
 */
const readIndexFirst = (depth: number): string => {
  const ref =
    depth === 0
      ? '`INDEX.md` in this folder'
      : `\`${'../'.repeat(depth)}INDEX.md\` at the top of this export`;
  return (
    `> **Read ${ref} first.** It carries the rules for how this context must be\n` +
    `> read — which blocks are ground truth and which are another AI's framing.\n` +
    `> Applying the content below without those rules will treat someone else's\n` +
    `> guess as fact.\n`
  );
};

interface IndexEntry {
  /** Path relative to the export root, or the directory itself for a sub-workspace. */
  path: string;
  depth: number;
  kind: 'project' | 'workspace';
  blockCount: number;
  summary: string;
}

// What a narrowed export has to admit about itself, in INDEX.md. Without it the folder looks
// like the whole workspace and the AI has no way to know a window was applied.
const RANGE_NOTE: Record<PackRange, string> = {
  all: '',
  pinned:
    '\nOnly blocks the user pinned as core context were exported; the rest are still in Spool.',
  last7:
    '\nOnly the last 7 days of blocks (plus every pinned block) were exported; the rest are\nstill in Spool.',
  last30:
    '\nOnly the last 30 days of blocks (plus every pinned block) were exported; the rest are\nstill in Spool.',
};

/**
 * INDEX.md — ⚠️ **rules first, catalogue second**, because of what Ocean said it IS: 「index
 * 类似于 claude.md 的作用，让 ai 按照规则执行」. A CLAUDE.md starts giving orders on line one; it
 * does not open with a file listing and append an explanation.
 *
 * The name is capitalised so it sorts first in a directory listing and is the first thing an
 * AI sees when it lists the folder — §2.3's cheap half of the bet that it gets opened.
 */
const renderIndex = (
  workspaceTitle: string,
  entries: IndexEntry[],
  range: PackRange,
  at: number,
  withProjectFolders: boolean,
): string => {
  const out: string[] = [];
  out.push(`# ${workspaceTitle.trim() || UNTITLED} — Spool context export`);
  out.push('');
  out.push(
    '**Read this file to the end before opening any other file in this folder.** It is\n' +
      'not a table of contents: it is the rules this context must be read under. Every\n' +
      'other file here is material, and applying any of it without the rules below will\n' +
      "treat another AI's guess as established fact.",
  );
  out.push('');
  out.push(INSTRUCTION_HEADER);
  out.push('');
  // §3 #5: an export is a snapshot and nothing keeps it current. Saying so with the moment
  // it was taken is what stops a three-week-old folder from being read as the present.
  out.push(
    `Exported by Spool on ${formatPackTime(at)}. **This is a one-time snapshot** — the\n` +
      "user's library has kept changing since, and nothing updates this folder." +
      RANGE_NOTE[range],
  );
  out.push('');
  out.push('## What is in this folder');
  out.push('');
  if (entries.length === 0) {
    out.push('(nothing was selected for export)');
  }
  for (const entry of entries) {
    const indent = '  '.repeat(entry.depth);
    if (entry.kind === 'workspace') {
      out.push(`${indent}- \`${entry.path}\` — a workspace inside this one`);
      continue;
    }
    const summary = entry.summary ? ` — ${entry.summary}` : '';
    const n = entry.blockCount;
    out.push(`${indent}- \`${entry.path}\` — ${n} block${n === 1 ? '' : 's'}${summary}`);
  }
  // P8: those folders are not in the list above, and without this an AI listing the export
  // could take one for a sub-workspace. Only when there is one, so an export of .md files alone
  // is byte-for-byte what it was.
  if (withProjectFolders) {
    out.push('');
    out.push(
      "A folder named like a project file, without `.md`, holds that project's attached files and\n" +
        'images; the links in the project file point into it.',
    );
  }
  out.push('');
  return out.join('\n');
};

/**
 * Build every file of a workspace export. Pure — the caller writes the bytes.
 *
 * ⚠️ `instructions: false` on every project file is not a saving I chose: it IS 拍板乙. The
 * four-category rules live in INDEX.md once, and the line above each file points at them.
 * Turning them back on per file would be 甲, which Ocean did not pick.
 */
export function buildPackFolder({
  root,
  range,
  refTitles,
  refBlocks,
  outputLanguage,
  images,
  choice,
  now,
}: BuildPackFolderArgs): PackFolder {
  const at = now ?? Date.now();
  const files: PackFile[] = [];
  const copies: PackCopy[] = [];
  const pictures: PackPicture[] = [];
  const entries: IndexEntry[] = [];

  const walk = (node: PackWorkspaceNode, dir: string, depth: number): void => {
    const takenHere = new Set<string>();
    const fromRoot = (p: string): string => (dir ? `${dir}/${p}` : p);
    node.projects.forEach((project, i) => {
      const packedAll = filterBlocksForRange(project.blocks, range, at);
      // assemble() drops retired blocks itself; the count in INDEX.md has to match what the
      // file actually holds, so it is counted the same way here rather than off `packedAll`.
      const blockCount = packedAll.filter((b) => b.staleAt == null).length;
      const name = uniqueIn(
        takenHere,
        `${pad2(i + 1)}-${sanitizeSegment(project.thread.title)}.md`,
      );
      const path = dir ? `${dir}/${name}` : name;
      // P8: the project's files and pictures go in a folder beside its .md, named the same
      // without `.md`. Projects are named before sub-workspaces and carry a unique `NN-`, so the
      // name is free here; it is reserved only when something goes in it, which is what lets a
      // sub-workspace called the same thing keep today's name when nothing does.
      const plan = choice
        ? planProject(project.blocks, project.attachments, range, images, choice, name.replace(/\.md$/, ''), at)
        : null;
      if (plan && (plan.copies.length > 0 || plan.pictures.length > 0)) {
        takenHere.add(name.replace(/\.md$/, ''));
        copies.push(...plan.copies.map((c) => ({ ...c, path: fromRoot(c.path) })));
        pictures.push(...plan.pictures.map((p) => ({ ...p, path: fromRoot(p.path) })));
      }
      files.push({
        path,
        threadId: project.thread.id,
        content:
          readIndexFirst(depth) +
          '\n' +
          assemble({
            thread: project.thread,
            blocks: packedAll,
            attachments: project.attachments,
            // P6-4: the whole project's numbers — a file on a block outside the range still says which.
            fileAnchorSeqs: blockSeqMap(project.blocks),
            refTitles,
            refBlocks,
            scope: { range, total: project.blocks.length },
            images: plan ? plan.images : images,
            exportedFiles: plan?.exportedFiles,
            instructions: false,
            outputLanguage,
            now: at,
          }),
      });
      entries.push({
        path,
        depth,
        kind: 'project',
        blockCount,
        summary: indexSummary(project.thread, project.blocks),
      });
    });

    for (const child of node.children) {
      const name = uniqueIn(takenHere, sanitizeSegment(child.title));
      const childDir = dir ? `${dir}/${name}` : name;
      entries.push({ path: `${childDir}/`, depth, kind: 'workspace', blockCount: 0, summary: '' });
      walk(child, childDir, depth + 1);
    }
  };

  walk(root, '', 0);
  const withProjectFolders = copies.length > 0 || pictures.length > 0;
  files.unshift({ path: 'INDEX.md', content: renderIndex(root.title, entries, range, at, withProjectFolders) });

  return {
    folderName: `spool-${sanitizeSegment(root.title)}-${formatPackDate(at).replace(/-/g, '')}`,
    files,
    copies,
    pictures,
  };
}

/** The .md of a one-project export, with `files/` and `images/` beside it. */
export const PROJECT_PACK_FILE = 'pack.md';

export interface BuildProjectExportArgs {
  thread: Thread;
  /** ALL of the project's blocks — the range filter is applied here, not by the caller. */
  blocks: Block[];
  attachments: Attachment[];
  range: PackRange;
  refTitles: Map<string, string>;
  refBlocks: Map<string, CitedBlock>;
  images?: ReadonlyMap<string, readonly PackImage[]>;
  choice: ExportChoice;
  instructions: boolean;
  outputLanguage: 'zh' | 'en';
  now?: number;
}

export interface ProjectExport {
  /** `pack.md`. Written alone (the single-.md route) when there is nothing to copy. */
  file: PackFile;
  copies: PackCopy[];
  pictures: PackPicture[];
}

/**
 * P8-3 — one project exported (PackDialog). The same assemble() the dialog previews and copies,
 * plus the two export-only differences: ticked files' names link to `files/…`, and pictures are
 * `images/…` when taken, `![caption](image)` when not.
 */
export function buildProjectExport({
  thread,
  blocks,
  attachments,
  range,
  refTitles,
  refBlocks,
  images,
  choice,
  instructions,
  outputLanguage,
  now,
}: BuildProjectExportArgs): ProjectExport {
  const at = now ?? Date.now();
  const plan = planProject(blocks, attachments, range, images, choice, '', at);
  const content = assemble({
    thread,
    blocks: filterBlocksForRange(blocks, range, at),
    attachments,
    fileAnchorSeqs: blockSeqMap(blocks),
    refTitles,
    refBlocks,
    scope: { range, total: blocks.length },
    images: plan.images,
    exportedFiles: plan.exportedFiles,
    instructions,
    outputLanguage,
    now: at,
  });
  return { file: { path: PROJECT_PACK_FILE, content }, copies: plan.copies, pictures: plan.pictures };
}
