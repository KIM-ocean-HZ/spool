import { nanoid } from 'nanoid';
import { getDb } from './client';

// DESIGN_PROJECT_FILES (Ocean 2026-08-08) — a file belongs to a PROJECT, not to one block.
//
// ⚠️ The one rule this module exists to hold: a row only ever appears because the USER did
// something — picked the file in the system file dialog, dropped it from Finder, or (P6,
// Ocean 2026-09-30 §9.2 第 7 条) clicked 「同意」 on an AI's proposal whose path the Rust gate
// had already let through. Nothing here takes a path straight from an AI or from captured web
// content. That is why 「自动挂本地文件」 was rejected in DESIGN_CONTEXT_HYGIENE §2: an AI can
// propose a file and ask about one, and only the user's click puts one here.
export type AttachmentKind = 'file' | 'folder';

// v2.7: which extractor produced an attachment's cached text (or 'failed').
export type AttachmentExtractionKind = 'pdf' | 'docx' | 'plaintext' | 'failed' | null;

export interface Attachment {
  id: string;
  threadId: string;
  kind: AttachmentKind;
  target: string;                              // absolute path: file picker, Finder drop, or an approved AI proposal
  label: string;                               // display name
  extractedText: string | null;                // v2.7: auto-extracted text for file kinds
  extractedAt: number | null;                  // v2.7: ms epoch when extraction completed; null if unattempted
  extractionKind: AttachmentExtractionKind;     // v2.7: which extractor handled this (or 'failed')
  includeInPack: boolean;                       // v2.8 §20.2: opt-in flag for inlining extracted_text into pack/summaries
  aiAccess: boolean;                            // v15 §5.1 ①: the user has let an AI ask for this file's text
  createdAt: number;
  // v30 (P5). All four are NULL on every row from before v30 — read as「挂在项目、用户加的、
  // 没被取代」. schema.sql has what each one means.
  anchorBlockId: string | null;                 // block it hangs off; null = the project
  addedBy: string | null;                       // 'user'; P6 adds `<client> · MCP`; null = the user
  supersededBy: string | null;                  // P6: id of the attachment that replaced this one
  supersededAt: number | null;                  // P6: ms epoch of that replacement
}

export interface CreateAttachmentArgs {
  threadId: string;
  kind: AttachmentKind;
  target: string;
  label?: string;
  /** P5 (Ocean 2026-10-05): picked from a block's own 「加文件」 — the file hangs off that block. */
  anchorBlockId?: string | null;
  /** P6-3: the `<client> · MCP` label of the AI whose proposal the user just approved.
   *  Left out = the user's own hand ('user'). */
  addedBy?: string;
}

interface Row {
  id: string;
  thread_id: string;
  kind: AttachmentKind;
  target: string;
  label: string;
  extracted_text: string | null;
  extracted_at: number | null;
  extraction_kind: AttachmentExtractionKind;
  include_in_pack: number;
  ai_access: number;
  created_at: number;
  anchor_block_id: string | null;
  added_by: string | null;
  superseded_by: string | null;
  superseded_at: number | null;
}

const fromRow = (r: Row): Attachment => ({
  id: r.id,
  threadId: r.thread_id,
  kind: r.kind,
  target: r.target,
  label: r.label,
  extractedText: r.extracted_text,
  extractedAt: r.extracted_at,
  extractionKind: r.extraction_kind,
  includeInPack: r.include_in_pack === 1,
  aiAccess: r.ai_access === 1,
  createdAt: r.created_at,
  anchorBlockId: r.anchor_block_id,
  addedBy: r.added_by,
  supersededBy: r.superseded_by,
  supersededAt: r.superseded_at,
});

const SELECT_COLS =
  'id, thread_id, kind, target, label, extracted_text, extracted_at, extraction_kind, include_in_pack, ai_access, created_at, ' +
  'anchor_block_id, added_by, superseded_by, superseded_at';

const ALL_COLS = `(${SELECT_COLS})`;

const allValues = (a: Attachment): unknown[] => [
  a.id,
  a.threadId,
  a.kind,
  a.target,
  a.label,
  a.extractedText,
  a.extractedAt,
  a.extractionKind,
  a.includeInPack ? 1 : 0,
  a.aiAccess ? 1 : 0,
  a.createdAt,
  a.anchorBlockId,
  a.addedBy,
  a.supersededBy,
  a.supersededAt,
];

export const listAttachmentsByThread = async (threadId: string): Promise<Attachment[]> => {
  const db = await getDb();
  const rows = await db.select<Row[]>(
    `SELECT ${SELECT_COLS} FROM attachments WHERE thread_id = $1 ORDER BY created_at ASC`,
    [threadId],
  );
  return rows.map(fromRow);
};

// v30 (P5-3): the files hung off any of these blocks, as full rows — what a delete / merge /
// move snapshots so its undo can put each one back where it hung.
export const listAttachmentsAnchoredTo = async (blockIds: string[]): Promise<Attachment[]> => {
  if (blockIds.length === 0) return [];
  const db = await getDb();
  const slots = blockIds.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await db.select<Row[]>(
    `SELECT ${SELECT_COLS} FROM attachments WHERE anchor_block_id IN (${slots}) ORDER BY created_at ASC`,
    blockIds,
  );
  return rows.map(fromRow);
};

// v2.7: file attachments that have never had an extraction pass — used by the one-time
// startup backfill for rows created before v2.7 (PLAN §8.1 lazy backfill). All three
// extraction columns being NULL means extraction was never attempted.
export const listAttachmentsNeedingExtraction = async (): Promise<Attachment[]> => {
  const db = await getDb();
  const rows = await db.select<Row[]>(
    `SELECT ${SELECT_COLS} FROM attachments
      WHERE kind = 'file'
        AND extracted_text IS NULL AND extracted_at IS NULL AND extraction_kind IS NULL
      ORDER BY created_at ASC`,
  );
  return rows.map(fromRow);
};

export const createAttachment = async (args: CreateAttachmentArgs): Promise<Attachment> => {
  const db = await getDb();
  // Extraction columns start NULL — filled in asynchronously by the v2.7 extraction
  // pipeline (see updateAttachmentExtraction). include_in_pack defaults to false (v2.8
  // §20.2): extraction stays always-on for preview, but inlining is opt-in per attachment.
  // ⚠️ ai_access defaults to TRUE since P5-4 (Ocean 2026-09-30 §9.2 第 9 条:「默认可读（挂上去
  // 就是同意）」). It used to default to false (DESIGN_PROJECT_FILES §5.1 ①); both callers are
  // the user's own hand, and putting a file here is the consent. The switch in the right rail
  // still turns it off, and an AI then has to ask (request_file_access) exactly as before.
  const a: Attachment = {
    id: nanoid(),
    threadId: args.threadId,
    kind: args.kind,
    target: args.target,
    label: args.label ?? '',
    extractedText: null,
    extractedAt: null,
    extractionKind: null,
    includeInPack: false,
    aiAccess: true,
    createdAt: Date.now(),
    // The right rail's picker and a drop from Finder put it on the project, a block's own
    // 「加文件」 puts it on that block — the user's own hand. P6-3: an AI's proposal the user
    // approved records that AI; the click is still the user's, which is why ai_access is the
    // same default (Ocean 2026-10-06: 点头就是同意).
    anchorBlockId: args.anchorBlockId ?? null,
    addedBy: args.addedBy ?? 'user',
    supersededBy: null,
    supersededAt: null,
  };
  await db.execute(
    `INSERT INTO attachments (id, thread_id, kind, target, label, created_at, added_by, ai_access, anchor_block_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [a.id, a.threadId, a.kind, a.target, a.label, a.createdAt, a.addedBy, a.aiAccess ? 1 : 0, a.anchorBlockId],
  );
  return a;
};

// P9-4 (v33): `target_notice` — NULL once the user has looked at 「已跟到新位置」, the dismissed
// shape for 「知道了」 on a file that is gone. The JSON shapes belong to src-tauri/src/file_follow.rs
// (`Notice`); lib/files/locate reads them. ⚠️ `target_identity` is never written here: it is a BLOB
// and only Rust can carry it.
export const setAttachmentNotice = async (id: string, notice: string | null): Promise<void> => {
  const db = await getDb();
  await db.execute('UPDATE attachments SET target_notice = $1 WHERE id = $2', [notice, id]);
};

// P12-2 (DISCOVERED-20261025-11): 「改过」 kept until the user opens the file. Both writes are guarded in
// SQL — a 「已跟到新位置」 or 「知道了」 that is there is never replaced, and only this mark is cleared.
/** True when the mark went in (nothing else was waiting to be said). */
export const markAttachmentChanged = async (id: string, notice: string): Promise<boolean> => {
  const db = await getDb();
  const r = await db.execute('UPDATE attachments SET target_notice = $1 WHERE id = $2 AND target_notice IS NULL', [
    notice,
    id,
  ]);
  return r.rowsAffected > 0;
};

export const clearAttachmentChanged = async (id: string, notice: string): Promise<void> => {
  const db = await getDb();
  await db.execute('UPDATE attachments SET target_notice = NULL WHERE id = $1 AND target_notice = $2', [id, notice]);
};

// §20.1 forward (copy to thread): INSERT pre-built copy attachments (one multi-row, atomic
// statement — additive only, same data-safety contract as blocks.insertBlocks). Every cached
// field (extracted_text, extracted_at, extraction_kind, include_in_pack) is copied verbatim,
// so no re-extraction runs. ⚠️ `ai_access` is copied too — the rows are the same files the
// user already granted, arriving in a project they chose to copy into.
export const insertAttachments = async (attachments: Attachment[]): Promise<void> => {
  if (attachments.length === 0) return;
  const db = await getDb();
  const COLS = 15;
  const tuples = attachments
    .map((_, i) => {
      const o = i * COLS;
      return `(${Array.from({ length: COLS }, (_, k) => `$${o + k + 1}`).join(', ')})`;
    })
    .join(', ');
  const params = attachments.flatMap(allValues);
  await db.execute(`INSERT INTO attachments ${ALL_COLS} VALUES ${tuples}`, params);
};

// v2.7: record the result of a text-extraction pass on an attachment. Called by the
// extraction pipeline once `extractAttachmentText` resolves — with the text and the
// extractor kind on success, or `(null, 'failed')` on failure / unsupported type.
// `extracted_at` is always stamped, marking that extraction was attempted.
// v36 (P9Y-c): `stamp` is the file's [size, modified ms] taken just BEFORE it was read — so a file
// that changes while it is being read still reads as changed afterwards. Null when the file could
// not be looked at; the next look then falls back to comparing its modified time with extracted_at.
export const updateAttachmentExtraction = async (
  id: string,
  text: string | null,
  kind: AttachmentExtractionKind,
  stamp: [number, number] | null = null,
): Promise<void> => {
  const db = await getDb();
  await db.execute(
    `UPDATE attachments
        SET extracted_text = $1, extracted_at = $2, extraction_kind = $3,
            extracted_size = $4, extracted_mtime = $5
      WHERE id = $6`,
    [text, Date.now(), kind, stamp?.[0] ?? null, stamp?.[1] ?? null, id],
  );
};

// v2.8 §20.2: flip per-attachment opt-in for inlining extracted_text into pack/summaries.
// Extraction itself is untouched — only whether assemble.ts / status / digest prompts
// inline the cached text. Persisted as 0/1; the in-memory model carries it as boolean.
export const setIncludeInPack = async (id: string, value: boolean): Promise<void> => {
  const db = await getDb();
  await db.execute('UPDATE attachments SET include_in_pack = $1 WHERE id = $2', [
    value ? 1 : 0,
    id,
  ]);
};

// v15 §5.1 ①: grant or revoke an AI's standing permission to ask for this file. The grant is
// long-lived on purpose (Ocean 2026-08-08 — approving the same file every time is the
// approval fatigue DESIGN_MCP_WRITE_ROLE §3.3 is about), which is exactly why revoking it
// has to be one click in the panel where the file is listed.
export const setAiAccess = async (id: string, value: boolean): Promise<void> => {
  const db = await getDb();
  await db.execute('UPDATE attachments SET ai_access = $1 WHERE id = $2', [value ? 1 : 0, id]);
};

// v30 (P5): move a block's file back onto the project (null), or — undo only — hang it off a
// block again. Only the anchor moves; the file stays in the same project, every other column as
// it was.
export const setAttachmentAnchor = async (id: string, blockId: string | null): Promise<void> => {
  const db = await getDb();
  await db.execute('UPDATE attachments SET anchor_block_id = $1 WHERE id = $2', [blockId, id]);
};

// P9G-3: a split moves a project file to a sub-project (and back, on ⌘Z). Only the project
// changes; where it hangs, who added it and what it replaced stay as they are. (A file hung on a
// block is not moved here — it follows its block inside moveBlock.)
export const moveAttachmentsToThread = async (ids: string[], threadId: string): Promise<void> => {
  if (ids.length === 0) return;
  const db = await getDb();
  const slots = ids.map((_, i) => `$${i + 2}`).join(', ');
  await db.execute(`UPDATE attachments SET thread_id = $1 WHERE id IN (${slots})`, [threadId, ...ids]);
};

// P6-3: the user approved an AI's 「新版取代旧版」. The old row stays — readable as before,
// openable from the right rail — and only these two columns say what replaced it and when.
export const setAttachmentSuperseded = async (id: string, byId: string, at: number | null): Promise<void> => {
  const db = await getDb();
  await db.execute('UPDATE attachments SET superseded_by = $1, superseded_at = $2 WHERE id = $3', [
    byId,
    at,
    id,
  ]);
};

// P6-3: a file already in this project at this path and not replaced — approving a proposal
// for it again would put the same file in twice.
export const findLiveAttachmentByTarget = async (
  threadId: string,
  target: string,
): Promise<Attachment | null> => {
  const db = await getDb();
  const rows = await db.select<Row[]>(
    `SELECT ${SELECT_COLS} FROM attachments
      WHERE thread_id = $1 AND target = $2 AND superseded_by IS NULL
      LIMIT 1`,
    [threadId, target],
  );
  return rows[0] ? fromRow(rows[0]) : null;
};

/** P7-1: an older version that `deleteAttachment` brought back into use — kept so undo can
 *  mark it replaced again. */
export interface RevivedVersion {
  id: string;
  supersededBy: string;
  supersededAt: number | null;
}

// P7-1 (Ocean 2026-10-07, DISCOVERED-20261007-1 甲): taking a newer version out of the project
// puts the version it replaced back into use — otherwise that one would stay 「被取代」 by a file
// that is gone: out of every pack and off its block, with nothing on screen to bring it back.
// Done here, at the bottom, for the same reason as P5-3: every path that removes a file (the
// right rail's ×, 「一起去掉」 when a block is deleted, an undo or redo) comes through this one
// call, and a path added later lands on this side without anyone remembering. Only the version
// directly under it comes back; in v1 ← v2 ← v3, removing v3 leaves v1 under v2.
export const deleteAttachment = async (id: string): Promise<RevivedVersion[]> => {
  const db = await getDb();
  const revived = await db.select<{ id: string; superseded_at: number | null }[]>(
    'SELECT id, superseded_at FROM attachments WHERE superseded_by = $1',
    [id],
  );
  if (revived.length > 0) {
    await db.execute(
      'UPDATE attachments SET superseded_by = NULL, superseded_at = NULL WHERE superseded_by = $1',
      [id],
    );
  }
  await db.execute('DELETE FROM attachments WHERE id = $1', [id]);
  return revived.map((r) => ({ id: r.id, supersededBy: id, supersededAt: r.superseded_at }));
};

// §9.13 Undo (delete): re-insert an attachment verbatim from an undo snapshot, preserving
// every column (incl. extracted_text and include_in_pack).
export const restoreAttachment = async (a: Attachment): Promise<void> => {
  const db = await getDb();
  await db.execute(
    `INSERT INTO attachments ${ALL_COLS}
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    allValues(a),
  );
};
