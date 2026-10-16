import { getDb } from './client';

// P9G-3 (Ocean 2026-10-16 第 125 – 131 条) — the read / refuse half of 「AI 提议拆项目」.
// The only writer of `split_proposals` is the Rust MCP server (`propose_split`), which has
// already checked every id against the project. What the click re-checks is whether the
// project and its blocks are still there (`lib/split/projectSplit.ts`).
//
// Refusal deletes the row and records nothing — the review queue's rule: what the user turned
// away leaves no trace. Expiry is that same deletion on the same 7-day timer.

export interface SplitPlanGroup {
  title: string;
  /** The AI's one line on what this sub-project is — shown on the card, and its summary. */
  summary: string;
  blockIds: string[];
}

/** What the AI proposed. `group` is a place in `groups`, from 0. */
export interface SplitPlan {
  groups: SplitPlanGroup[];
  files: { attachmentId: string; group: number }[];
  followUps: { itemId: string; group: number }[];
}

export interface SplitProposal {
  id: string;
  threadId: string;
  /** Source label of the AI that proposed it (`<client> · MCP`). */
  client: string;
  why: string;
  plan: SplitPlan;
  createdAt: number;
  expiresAt: number;
}

interface Row {
  id: string;
  thread_id: string;
  client: string;
  why: string;
  plan: string;
  created_at: number;
  expires_at: number;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const index = (v: unknown): number => (typeof v === 'number' && Number.isInteger(v) ? v : -1);

/** The stored JSON, read defensively: the Rust side wrote it, but a row is still only text. */
export const parseSplitPlan = (json: string): SplitPlan => {
  let raw: Record<string, unknown> = {};
  try {
    const v: unknown = JSON.parse(json);
    if (v && typeof v === 'object') raw = v as Record<string, unknown>;
  } catch {
    // An unreadable plan is an empty one: the card shows every block staying, nothing to split.
  }
  const list = (k: string): Record<string, unknown>[] =>
    Array.isArray(raw[k]) ? (raw[k] as unknown[]).filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [];
  const groups = list('groups').map((g) => ({
    title: str(g.title),
    summary: str(g.summary),
    blockIds: Array.isArray(g.block_ids) ? g.block_ids.map(str).filter(Boolean) : [],
  }));
  const inRange = (i: number): boolean => i >= 0 && i < groups.length;
  return {
    groups,
    files: list('files')
      .map((f) => ({ attachmentId: str(f.attachment_id), group: index(f.group) }))
      .filter((f) => f.attachmentId && inRange(f.group)),
    followUps: list('follow_ups')
      .map((f) => ({ itemId: str(f.item_id), group: index(f.group) }))
      .filter((f) => f.itemId && inRange(f.group)),
  };
};

const fromRow = (r: Row): SplitProposal => ({
  id: r.id,
  threadId: r.thread_id,
  client: r.client,
  why: r.why,
  plan: parseSplitPlan(r.plan),
  createdAt: r.created_at,
  expiresAt: r.expires_at,
});

// Worth showing only while the project is still there (projects are soft-deleted).
const FROM_LIVE = `
    FROM split_proposals p
    JOIN threads t ON t.id = p.thread_id AND t.deleted_at IS NULL
   WHERE p.expires_at > $1`;

const COLS = 'p.id, p.thread_id, p.client, p.why, p.plan, p.created_at, p.expires_at';

export const listPendingSplitProposals = async (now: number): Promise<SplitProposal[]> => {
  const db = await getDb();
  const rows = await db.select<Row[]>(`SELECT ${COLS} ${FROM_LIVE} ORDER BY p.created_at ASC`, [now]);
  return rows.map(fromRow);
};

/** One per card. */
export const countPendingSplitProposals = async (now: number): Promise<number> => {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>(`SELECT COUNT(*) AS c ${FROM_LIVE}`, [now]);
  return rows[0]?.c ?? 0;
};

/** One live proposal by id, read again at the moment of the click. */
export const getPendingSplitProposal = async (id: string, now: number): Promise<SplitProposal | null> => {
  const db = await getDb();
  const rows = await db.select<Row[]>(`SELECT ${COLS} ${FROM_LIVE} AND p.id = $2`, [now, id]);
  return rows[0] ? fromRow(rows[0]) : null;
};

/** 「不拆」 — or clear one that has been carried out: the row goes and nothing records it. */
export const deleteSplitProposal = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.execute('DELETE FROM split_proposals WHERE id = $1', [id]);
};

export const purgeExpiredSplitProposals = async (now: number): Promise<void> => {
  const db = await getDb();
  await db.execute('DELETE FROM split_proposals WHERE expires_at <= $1', [now]);
};

// Test-only seam: the queue's only writer is the Rust MCP server. Never called by the app.
export const __insertSplitProposalForTest = async (p: {
  id: string;
  threadId: string;
  client?: string;
  why?: string;
  plan: unknown;
  createdAt?: number;
  expiresAt?: number;
}): Promise<void> => {
  const db = await getDb();
  const createdAt = p.createdAt ?? Date.now();
  await db.execute(
    `INSERT INTO split_proposals (id, thread_id, client, why, plan, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      p.id,
      p.threadId,
      p.client ?? 'Claude · MCP',
      p.why ?? 'It is too long.',
      typeof p.plan === 'string' ? p.plan : JSON.stringify(p.plan),
      createdAt,
      p.expiresAt ?? createdAt + 7 * 86_400_000,
    ],
  );
};
