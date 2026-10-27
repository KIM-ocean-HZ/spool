// P10 (Ocean 2026-10-26) — a weekly review that came back as data rather than prose.
//
// Both roads (API, local CLI) ask for one JSON object, and Rust reads it before anything is stored
// (`src-tauri/src/weekly_review.rs`): what lands in `engine_runs.result_text` is that reading, marked
// with `format`. Anything else in that column — every review written before P10 — is prose, and the
// page keeps splitting it into cards the old way (`reviewCards.ts`).
//
// ⛔ Nothing here re-checks a quote. The gate is Rust's, run once against the material that was
// actually sent; a second copy on this side would drift from it the first time either is edited.

export const WEEKLY_FORMAT = 'spool-weekly-1';

export type ActionKind =
  | 'mark_done'
  | 'set_deadline'
  | 'add_follow_up'
  | 'propose_supersede'
  | 'correct'
  // 验收第一轮（Ocean 2026-10-27）：周回顾也能关掉一条跟进行。
  | 'close_follow_up';

export interface WeeklySignal {
  /** ⛔ Shown exactly as stored — it passed the gate byte for byte. */
  quote: string;
  why: string;
  /** Only the punctuation differed from the material. */
  retyped: boolean;
}

export interface WeeklyAction {
  kind: ActionKind;
  why: string;
  /** The evidence for mark_done / set_deadline / add_follow_up. */
  quote: string | null;
  /** set_deadline: YYYY-MM-DD. */
  date: string | null;
  /** add_follow_up: the line to add. */
  text: string | null;
  /** propose_supersede / correct. */
  oldQuote: string | null;
  newQuote: string | null;
  /** The two blocks the quotes were found in (propose_supersede / correct). */
  staleBlockId: string | null;
  byBlockId: string | null;
  /** close_follow_up: the line as the model copied it, the open line it matched, and the block that
   *  answers it (null when none of the project's blocks holds the quote). */
  line?: string | null;
  followUpId?: string | null;
  answerBlockId?: string | null;
  retyped: boolean;
}

export interface WeeklyProject {
  /** As the model wrote it. */
  title: string;
  /** The project it was matched to; null when it was not. */
  threadId: string | null;
  did: string;
  stuck: string;
  signals: WeeklySignal[];
  actions: WeeklyAction[];
}

export interface WeeklyDropped {
  project: string;
  what: 'project' | 'signal' | 'action';
  reason: string;
  /** What the model wrote, untouched. */
  item: Record<string, unknown>;
}

export interface WeeklyReview {
  format: typeof WEEKLY_FORMAT;
  projects: WeeklyProject[];
  next: string;
  dropped: WeeklyDropped[];
}

/** The stored reading, or null for prose (a review from before P10). */
export const readWeeklyReview = (text: string): WeeklyReview | null => {
  if (!text.startsWith('{')) return null;
  try {
    const v = JSON.parse(text) as Partial<WeeklyReview>;
    return v.format === WEEKLY_FORMAT && Array.isArray(v.projects) ? (v as WeeklyReview) : null;
  } catch {
    return null;
  }
};
