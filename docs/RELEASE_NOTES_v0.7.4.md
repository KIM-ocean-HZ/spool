Spool is a context hub for long-running projects: capture fragments the moment they appear, keep them threaded under one project, and pack any project into a paste-ready briefing when you need to re-enter it — or re-brief an AI.

**v0.7.4 lets a workspace link to a folder on your computer — a code repository, a thesis folder — so Spool notices when the plan in that folder has moved on, and so the AI working in that folder knows which Spool projects it belongs to.**

## Download

**macOS** — `Spool_0.7.4_aarch64.dmg` · 11.4 MB · Apple Silicon (M1 or later), macOS 11 or newer

The macOS build is signed and notarized with a Developer ID, so it opens without the "unidentified developer" warning. `Spool-macOS-arm64.dmg` is the same file under a fixed name, for direct-download links — either name works.

```
sha256  e70c78f74c582728ea2821ea0ef14ce7ac19aeeecd5566b044ce19e1d9a5c9ad  Spool_0.7.4_aarch64.dmg
```

**Windows is not in this release.** The Windows download stays at v0.6.1 until the current release has been checked on a Windows machine.

**Upgrading migrates your database from schema v35 to v37** (two new tables for linked folders; nothing in your existing projects changes). Spool saves a snapshot of the old database next to it before migrating. AI clients that are still connected to the old version will say the database is newer than they are until you quit and reopen them.

## New

- **Link a workspace to a folder.** Click a workspace's name in the left rail to open its own page, then *Connect a folder…*. Four short steps: what Spool will do, which files say what you are doing now (the "state files" — up to three, recommended ones pre-ticked, or any file inside the folder), whether `SPOOL.md` stays on this computer only, and which AI instruction files should point to it. Every unfinished, non-private project in the workspace — and in its sub-workspaces — shares the folder; one of them is the *main project* an AI writes into by default. A private project cannot be linked.
- **Spool notices when the folder has moved on.** After a sync, if a state file changes, the workspace page, the project's right-hand rail and anything an AI reads about the project say so. Weekly automatic follow-up pauses for that project, so it does not keep searching on a plan you have dropped. When you, or the AI you are talking to, have brought the new direction across, *In sync now* starts counting again from there.
- **A `SPOOL.md` in the folder.** It tells an AI working in that folder which Spool projects the folder belongs to, that the folder is the authority on the current state, when to read Spool and when to write back. Spool only ever changes its own section and leaves alone a section you edited — you can see the difference and choose to replace it. The language follows Spool's interface language. By default it stays on this computer (one line in `.git/info/exclude`); optionally Spool adds `@SPOOL.md` to the folder's `CLAUDE.md` and one sentence to its `AGENTS.md`, if the folder already has them.
- **Two new MCP tools.** `get_folder_status` (read-only) gives an AI the state files' text, the files changed and commit titles since the last sync; `mark_folder_synced` records that the folder and the project are in line again, with one sentence on what was brought across. `list_threads` and the project overview show which projects have a linked folder that moved on. Spool's own background runs cannot mark a folder as synced. 28 tools in all (15 read-only, 13 write); Spool's own engine gets 26.
- **A workspace page.** Besides the linked folder, it lists every project in the workspace and its sub-workspaces: its summary, and buttons that open its follow-up lines and its files.
- **Attached files that changed are read again.** When a file you attached to a project has changed since Spool read it, Spool reads its text again the next time it is used, and the right-hand rail marks it as changed.

## Changed

- **Block text runs up to the Pack button.** Text, notes and the edit panel now use the width up to the left edge of the Pack button, whatever the window size, instead of a fixed narrow column. Workspace summaries use the same width as the project's own text.

## Known limits

- **Spool cannot stop an AI client from reading the folder itself.** An AI client with its own file tools (Codex, Claude Code and the like) can read anything in a linked folder directly; Spool only decides what it hands over through its own tools. One without file tools gets only what Spool hands over, and is told to ask you for anything else.
- **macOS only** for now.

---

**Spool's main process still makes no network connections.** Content leaves this machine on exactly three routes, all of them yours to switch on: an MCP client you connected, a CLI engine subprocess (Claude Code, Codex CLI — including the copy inside the ChatGPT desktop app — or Gemini CLI), and the `spool-ai` subprocess, if you gave it a key. Linking a folder adds no route: Spool reads it locally, and writes only the four places listed in the privacy notice.
