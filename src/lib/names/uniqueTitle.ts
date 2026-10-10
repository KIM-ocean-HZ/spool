// P9-1 (Ocean 2026-10-10, HANDOFF §9.2 第 54、62、64、65 条) — one name per place.
//
// 「一个工作区不能有一样名字的项目」: two projects with the same name in one workspace export
// as two files with one name, and a Mac disk does not tell `Notes` from `notes` either. So a
// name that is already taken BESIDE it gets 「 2」 (「 3」 if that is taken too) rather than
// being refused — the user's rename or drag still happens, it just cannot collide.
//
// The one rule, used by every way a name lands somewhere (create, rename, move, undo of a
// delete, import). The caller decides what "beside it" means and hands those names in:
//   - a project: the other live projects of the same workspace;
//   - a workspace: the other live workspaces with the same parent (or the other top-level ones).
// Projects and workspaces are never compared with each other.
//
// ⚠️ An empty name never collides (第 64 条): ＋ makes 「无标题」 projects, several of them are
// normal, and the exports number them anyway (`01-untitled.md`, `02-untitled.md`).

/** What two names are compared by: no surrounding blanks, no case. */
export const titleKey = (title: string): string => title.trim().toLowerCase();

/** `title` itself when nothing in `taken` has its key, else `<title> 2`, `<title> 3`, … */
export const uniqueTitle = (title: string, taken: Iterable<string>): string => {
  const key = titleKey(title);
  if (key === '') return title;
  const keys = new Set<string>();
  for (const other of taken) keys.add(titleKey(other));
  if (!keys.has(key)) return title;
  const base = title.trim();
  for (let n = 2; ; n++) {
    const candidate = `${base} ${n}`;
    if (!keys.has(titleKey(candidate))) return candidate;
  }
};
