import { getDb } from './client';

// P6-3 (Ocean 2026-09-30 §9.2 第 7、10 条 + 10-06 第 31–34 条) — the read / refuse half of
// 「AI 提议挂文件 / 提议新版取代旧版」. The only writer of `file_proposals` is the Rust MCP
// server (`propose_attach_file` / `propose_replace_file`), and only after its path gate let
// the path through. Nothing here re-runs that gate: what the click re-checks is whether the
// things the card talks about are still there (`lib/files/fileProposals.ts`).
//
// Refusal deletes the row and records nothing (§4.3, the proposal queue's rule: what the user
// turned away leaves no trace). Expiry is that same deletion on the same 7-day timer.

export type FileProposalKind = 'attach' | 'supersede';

export interface FileProposal {
  id: string;
  kind: FileProposalKind;
  /** Source label of the AI that proposed it (`<client> · MCP`), captured when it asked. */
  client: string;
  threadId: string;
  /** The resolved path the gate let through — shown in full on the card. */
  path: string;
  /** Measured when it was proposed. */
  sizeBytes: number;
  /** 'attach' only: the block it was proposed for; null = the project. */
  anchorBlockId: string | null;
  /** That block's number now; null when there is none — or when the block has since gone. */
  anchorSeq: number | null;
  /** P9H-3: the project that block is in NOW, and its name — a split or a move can have taken
   *  it out of `threadId` since. Null with `anchorSeq`. */
  anchorThreadId: string | null;
  anchorThreadTitle: string | null;
  /** 'supersede' only: the file it would replace, and that file's name. */
  supersedesId: string | null;
  supersedesLabel: string | null;
  why: string;
  createdAt: number;
  expiresAt: number;
}

interface Row {
  id: string;
  kind: FileProposalKind;
  client: string;
  thread_id: string;
  path: string;
  size_bytes: number;
  anchor_block_id: string | null;
  anchor_seq: number | null;
  anchor_thread_id: string | null;
  anchor_thread_title: string | null;
  supersedes_id: string | null;
  old_label: string | null;
  old_target: string | null;
  why: string;
  created_at: number;
  expires_at: number;
}

const baseName = (p: string): string => p.split(/[\\/]/).filter(Boolean).pop() ?? p;

// A proposal is worth showing only while what it talks about still exists: its project (not
// deleted), and for a replacement, the old file — still in that project and not already
// replaced. Approving a replacement of a file that is gone would attach a file and say it
// replaced something. The block is LEFT joined on purpose: a block deleted since only moves
// the file onto the project, and the card says so (P6-3).
// P9H-3 (DISCOVERED-20261016-4): found by its id wherever it is now — a split (P9G) or 「移到…」
// moves a block, id and all, and it used to read as deleted here. Only a block whose project is
// gone counts as gone (`bt`).
const FROM_LIVE = `
    FROM file_proposals p
    JOIN threads t ON t.id = p.thread_id AND t.deleted_at IS NULL
    LEFT JOIN blocks b ON b.id = p.anchor_block_id
    LEFT JOIN threads bt ON bt.id = b.thread_id AND bt.deleted_at IS NULL
    LEFT JOIN attachments a ON a.id = p.supersedes_id
   WHERE p.expires_at > $1
     AND (p.kind = 'attach'
          OR (a.id IS NOT NULL AND a.thread_id = p.thread_id AND a.superseded_by IS NULL))`;

const fromRow = (r: Row): FileProposal => ({
  id: r.id,
  kind: r.kind,
  client: r.client,
  threadId: r.thread_id,
  path: r.path,
  sizeBytes: r.size_bytes,
  anchorBlockId: r.anchor_block_id,
  anchorSeq: r.anchor_seq,
  anchorThreadId: r.anchor_thread_id,
  anchorThreadTitle: r.anchor_thread_title,
  supersedesId: r.supersedes_id,
  supersedesLabel:
    r.supersedes_id === null ? null : r.old_label?.trim() || baseName(r.old_target ?? ''),
  why: r.why,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
});

export const listPendingFileProposals = async (now: number): Promise<FileProposal[]> => {
  const db = await getDb();
  const rows = await db.select<Row[]>(
    `SELECT p.id, p.kind, p.client, p.thread_id, p.path, p.size_bytes, p.anchor_block_id,
            CASE WHEN bt.id IS NOT NULL THEN b.seq END AS anchor_seq,
            bt.id AS anchor_thread_id, bt.title AS anchor_thread_title,
            p.supersedes_id, a.label AS old_label, a.target AS old_target,
            p.why, p.created_at, p.expires_at
       ${FROM_LIVE}
      ORDER BY p.created_at ASC`,
    [now],
  );
  return rows.map(fromRow);
};

/** One per card — the badge counts decisions, not files. */
export const countPendingFileProposals = async (now: number): Promise<number> => {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>(`SELECT COUNT(*) AS c ${FROM_LIVE}`, [now]);
  return rows[0]?.c ?? 0;
};

/** One live proposal by id, read again at the moment of the click. */
export const getPendingFileProposal = async (
  id: string,
  now: number,
): Promise<FileProposal | null> => {
  const db = await getDb();
  const rows = await db.select<Row[]>(
    `SELECT p.id, p.kind, p.client, p.thread_id, p.path, p.size_bytes, p.anchor_block_id,
            CASE WHEN bt.id IS NOT NULL THEN b.seq END AS anchor_seq,
            bt.id AS anchor_thread_id, bt.title AS anchor_thread_title,
            p.supersedes_id, a.label AS old_label, a.target AS old_target,
            p.why, p.created_at, p.expires_at
       ${FROM_LIVE} AND p.id = $2`,
    [now, id],
  );
  return rows[0] ? fromRow(rows[0]) : null;
};

/** Refuse — or clear one that has been dealt with: the row goes and nothing records it. */
export const deleteFileProposal = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.execute('DELETE FROM file_proposals WHERE id = $1', [id]);
};

export const purgeExpiredFileProposals = async (now: number): Promise<void> => {
  const db = await getDb();
  await db.execute('DELETE FROM file_proposals WHERE expires_at <= $1', [now]);
};

// Test-only seam: the queue's only writer is the Rust MCP server. Never called by the app.
export const __insertFileProposalForTest = async (
  p: Pick<FileProposal, 'id' | 'kind' | 'client' | 'threadId' | 'path' | 'sizeBytes' | 'why'> &
    Partial<Pick<FileProposal, 'anchorBlockId' | 'supersedesId' | 'createdAt' | 'expiresAt'>>,
): Promise<void> => {
  const db = await getDb();
  const createdAt = p.createdAt ?? Date.now();
  await db.execute(
    `INSERT INTO file_proposals (id, kind, client, thread_id, path, size_bytes, anchor_block_id,
                                 supersedes_id, why, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      p.id,
      p.kind,
      p.client,
      p.threadId,
      p.path,
      p.sizeBytes,
      p.anchorBlockId ?? null,
      p.supersedesId ?? null,
      p.why,
      createdAt,
      p.expiresAt ?? createdAt + 7 * 86_400_000,
    ],
  );
};
