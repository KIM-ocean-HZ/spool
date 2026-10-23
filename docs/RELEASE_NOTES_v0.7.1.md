Spool is a context hub for long-running projects: capture fragments the moment they appear, keep them threaded under one project, and pack any project into a paste-ready briefing when you need to re-enter it — or re-brief an AI.

**v0.7.1 is a smaller release about noticing what changed without having to go looking.** A project an AI has written into lights up in the sidebar, Weekly Review reads as one card per project, and Follow Up can search once a week by itself and come back only when it found something. It also removes a review step that asked too many questions, adds a dark Valentine appearance, and fixes a layout bug from v0.7.0.

## Download

**macOS** — `Spool_0.7.1_aarch64.dmg` · SIZE · Apple Silicon (M1 or later), macOS 11 or newer

The macOS build is signed and notarized with a Developer ID, so it opens without the "unidentified developer" warning. `Spool-macOS-arm64.dmg` is the same file under a fixed name, for direct-download links — either name works.

```
sha256  SHA256  Spool_0.7.1_aarch64.dmg
```

**Windows is not in this release.** The Windows download stays at v0.6.1. The next Windows installer will be v0.7.1 itself, once that build has been checked on a Windows machine.

**Upgrading from v0.7.0 changes nothing in your database** — it stays at schema v35. Upgrading from v0.6.2 runs the same eleven additive migrations as v0.7.0 (v24 → v35), with a snapshot taken first.

## What changes for you

- **A citation to a block that no longer holds is removed automatically.** When you mark a block as no longer valid, or approve a replacement for it, the other blocks that cite or correct it stop pointing at it — no block is deleted, and the retired block stays retired. The *Citations to review* list and its three choices are gone. A citation you had already chosen to keep as historical stays. If you take the block back before quitting Spool, its citations come back with it. On first launch, v0.7.1 clears any citations that were still waiting in the old list.
- **Search the web moved one level down.** It is now in the follow-up editor (**Edit** next to *Watching for* in the right-hand rail). The rail itself shows the lines being watched and one line about the last search: when it ran and what it brought back.
- **Follow Up can search once a week by itself.** Each project has its own switch in the follow-up editor, **off by default**. When it is on, Spool runs that project's follow-up about once a week through the CLI engine you installed (Claude Code or Codex), on your own quota. A run that finds nothing new says nothing; what it does find waits on the review screen, marked **Follow up** — and keeps that mark on the block once you approve it.
- **A follow-up run may retire a line it judges finished** — including a standing one, with a sentence saying why, and you can reopen it from the editor. It may also suggest a better line; a suggested line waits for your approval. AI clients connected over MCP still cannot close a standing line.
- **One new file next to your library**: `ai-seen.json`, one time per project recording how far you have looked at what AIs added — it decides whether a project's dot is green. Like `focus.json`, `drafts.json` and `knit.json`, it is not in the database, does not travel with an exported library, and is never sent anywhere.

## New

- **A green dot for new AI writes.** When an AI adds something to a project — over MCP, or through a proposal you approved — that project's dot in the sidebar turns green. It goes back once the new block has actually been on screen. Your own captures never light it. If the project sits in a collapsed workspace, the workspace opens once so you can see it.
- **Weekly Review, one card per project.** Each project gets a card: its name (click it to open the project), then *What moved*, *What is left* and *Days to the deadline* lined up in one column. The closing suggestion sits under the last card. Earlier reviews are shown as cards where their layout allows; the rest are shown as before. Nothing is shortened.
- **Recent can show more.** A small arrow next to *Recent* opens up to ten recent projects in a box that scrolls; closing it returns the sidebar to exactly how it was.
- **Valentine has a dark appearance.** Settings → General → Light / Dark / Match system now works under the Valentine look as well: deep berry paper, blush text, a brighter rose, and the peonies faint in the corners. The capture card follows.

## Fixed

- **The whole page could shift upward** after jumping to a block near the end of a project — the project title disappeared at the top and an empty strip opened under the input box, until the window was resized. Introduced in v0.7.0 with the knitting cabinet.

## Known limits

- **macOS only** for now; Windows stays at v0.6.1 until the v0.7.1 installer has been checked.
- **Weekly follow-up needs a Mac with Claude Code or Codex installed**, MCP and *Allow AI writes* switched on, and *Show AI features* on. Gemini CLI does not run Follow Up.
- **The green dot is per computer.** It lives in `ai-seen.json`, so a library carried to another machine starts with every dot off.

---

**Spool's main process still makes no network connections.** Content leaves this machine on exactly three routes, all of them yours to switch on: an MCP client you connected, a CLI engine subprocess (Claude Code, Codex CLI, Gemini CLI) — now including a weekly follow-up you switched on for a project — and the `spool-ai` subprocess, if you gave it a key.
