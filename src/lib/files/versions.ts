import type { Attachment } from '@/lib/db/attachments';

// P6-4 (Ocean 2026-10-06 #4): a file a newer version replaced does not get a row of its own in
// the right rail — it folds under the file that replaced it, behind a small arrow.
//
// A chain (v1 ← v2 ← v3) folds whole under the newest. A replaced file whose replacement is
// NOT in this list (taken off the project, or moved away with its block) has nothing to fold
// under, so it stands as its own row — ⚠️ never dropped: a file that silently vanished from
// the rail would read as Spool losing it. It is still marked as replaced (`replaced`), so the
// rail can grey it the way it greys an older version.

export interface FileGroup {
  file: Attachment;
  /** True when `file` itself is marked as replaced but its replacement is not here. */
  replaced: boolean;
  /** Older versions folded under `file`, newest first. */
  older: Attachment[];
}

const newestFirst = (a: Attachment, b: Attachment): number => b.createdAt - a.createdAt;

export const groupFileVersions = (files: readonly Attachment[]): FileGroup[] => {
  const byId = new Map(files.map((f) => [f.id, f]));
  // Follow superseded_by while it points at a file in this list. A cycle — nothing writes
  // one, but a hand-edited library could hold it — is cut at its newest member, so every
  // file still lands in exactly one group.
  const headOf = (f: Attachment): Attachment => {
    const path: Attachment[] = [f];
    let cur = f;
    while (cur.supersededBy != null) {
      const next = byId.get(cur.supersededBy);
      if (!next) break;
      const loopAt = path.indexOf(next);
      if (loopAt >= 0) return path.slice(loopAt).sort(newestFirst)[0]!;
      path.push(next);
      cur = next;
    }
    return cur;
  };
  const groups = new Map<string, FileGroup>();
  for (const f of files) {
    const head = headOf(f);
    let g = groups.get(head.id);
    if (!g) {
      g = { file: head, replaced: head.supersededBy != null, older: [] };
      groups.set(head.id, g);
    }
    if (f.id !== head.id) g.older.push(f);
  }
  const out = [...groups.values()];
  for (const g of out) g.older.sort(newestFirst);
  return out.sort((a, b) => newestFirst(a.file, b.file));
};
