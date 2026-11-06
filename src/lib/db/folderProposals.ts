import { getDb } from './client';

// P15-2（Ocean 2026-11-06 选甲，HANDOFF §9.2 第 254 条）：AI 通过 MCP（`propose_link_folder`）提议的「把工作区连到
// 这个文件夹」或「把它的现状文件换成这几份」。`spool --mcp` 只往 `folder_proposals` 排一行；⛔ 连接本身由用户在
// 待审卡上点「去连接…」、走完原来那个连接对话框才写（SPOOL.md、git、CLAUDE.md / AGENTS.md 每一样都看得见）。

export type FolderProposalKind = 'link' | 'state_files';

export interface FolderProposal {
  id: string;
  kind: FolderProposalKind;
  /** Source label of the AI that proposed it (`<client> · MCP`). */
  client: string;
  workspaceId: string;
  workspaceTitle: string;
  /** The folder's full path, as the MCP side resolved it. */
  path: string;
  /** What the AI picked: relative to the folder, `/`-separated, `*` = a dated series. */
  stateFiles: string[];
  /** The main project it suggested, if it is still there; null = none suggested (or gone). */
  primaryThreadId: string | null;
  primaryTitle: string | null;
  /** The workspace's own link now — what a 'state_files' card swaps out. Null = not linked. */
  linkedPath: string | null;
  linkedStateFiles: string[] | null;
  why: string;
  createdAt: number;
  expiresAt: number;
}

interface Row {
  id: string;
  kind: FolderProposalKind;
  client: string;
  workspace_id: string;
  workspace_title: string;
  path: string;
  state_files: string;
  primary_thread_id: string | null;
  primary_title: string | null;
  linked_path: string | null;
  linked_state_files: string | null;
  why: string;
  created_at: number;
  expires_at: number;
}

const parseList = (raw: string | null): string[] => {
  if (raw === null) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

// A deleted workspace takes its card with it; a finished or deleted main project is just not named.
const SELECT = `
  SELECT p.id, p.kind, p.client, p.workspace_id, w.title AS workspace_title, p.path, p.state_files,
         CASE WHEN t.id IS NOT NULL THEN p.primary_thread_id END AS primary_thread_id,
         t.title AS primary_title,
         f.path AS linked_path, wf.state_files AS linked_state_files,
         p.why, p.created_at, p.expires_at
    FROM folder_proposals p
    JOIN workspaces w ON w.id = p.workspace_id AND w.deleted_at IS NULL
    LEFT JOIN threads t ON t.id = p.primary_thread_id AND t.deleted_at IS NULL AND t.status != 'done'
    LEFT JOIN workspace_folders wf ON wf.workspace_id = p.workspace_id
    LEFT JOIN folders f ON f.id = wf.folder_id
   WHERE p.expires_at > $1`;

const fromRow = (r: Row): FolderProposal => ({
  id: r.id,
  kind: r.kind,
  client: r.client,
  workspaceId: r.workspace_id,
  workspaceTitle: r.workspace_title,
  path: r.path,
  stateFiles: parseList(r.state_files),
  primaryThreadId: r.primary_thread_id,
  primaryTitle: r.primary_title,
  linkedPath: r.linked_path,
  linkedStateFiles: r.linked_state_files === null ? null : parseList(r.linked_state_files),
  why: r.why,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
});

export const listPendingFolderProposals = async (now: number): Promise<FolderProposal[]> => {
  const db = await getDb();
  const rows = await db.select<Row[]>(`${SELECT} ORDER BY p.created_at ASC`, [now]);
  return rows.map(fromRow);
};

/** One per card. */
export const countPendingFolderProposals = async (now: number): Promise<number> => {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>(
    `SELECT COUNT(*) AS c FROM folder_proposals p
       JOIN workspaces w ON w.id = p.workspace_id AND w.deleted_at IS NULL
      WHERE p.expires_at > $1`,
    [now],
  );
  return rows[0]?.c ?? 0;
};

/** Read again at the moment of the click — another window, or the AI, may have changed it. */
export const getPendingFolderProposal = async (id: string, now: number): Promise<FolderProposal | null> => {
  const db = await getDb();
  const rows = await db.select<Row[]>(`${SELECT} AND p.id = $2`, [now, id]);
  return rows[0] ? fromRow(rows[0]) : null;
};

export const deleteFolderProposal = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.execute('DELETE FROM folder_proposals WHERE id = $1', [id]);
};

export const purgeExpiredFolderProposals = async (now: number): Promise<void> => {
  const db = await getDb();
  await db.execute('DELETE FROM folder_proposals WHERE expires_at <= $1', [now]);
};
