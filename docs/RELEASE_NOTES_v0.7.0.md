Spool is a context hub for long-running projects: capture fragments the moment they appear, keep them threaded under one project, and pack any project into a paste-ready briefing when you need to re-enter it — or re-brief an AI.

**v0.7.0 is the release where a project holds more than text, and where an AI asks before it changes anything.** Blocks can carry pictures, a project keeps its files in one list, and an AI connected over MCP can now propose a correction, a replacement, a file or a split — each one waits for your click instead of landing in your timeline. It also adds private projects, an Activity view at the top of Weekly Review, a dark appearance, and a sidebar that knits what you save into patches.

Several things earlier versions told you now work differently. They are collected under **What changes for you** — read that section even if you skip the rest.

## Download

**macOS** — `Spool_0.7.0_aarch64.dmg` · __ MB · Apple Silicon (M1 or later), macOS 11 or newer

The macOS build is signed and notarized with a Developer ID, so it opens without the "unidentified developer" warning. `Spool-macOS-arm64.dmg` is the same file under a fixed name, for direct-download links — either name works.

```
sha256  ________________________________________________________________  Spool_0.7.0_aarch64.dmg
```

**Windows is not in this release.** The Windows download stays at v0.6.1, the last release that shipped a Windows installer. Windows catches up in the next release, together with macOS.

**Upgrading runs eleven small migrations.** From v0.6.2 the schema goes from v24 to v35. Every step only adds — new empty columns, new tables, new indexes. No existing row is rewritten and no table is rebuilt, and Spool snapshots your database before it touches anything.

## What changes for you

- **Files you add to a project yourself are readable by a connected AI by default** — from the right-hand rail or dragged in from Finder. Files already in your projects keep the setting they had. Every file still has its own switch; with it off, an AI has to ask, and you answer in Spool.
- **An AI's "this corrects that" or "this replaces that" is now only a suggestion.** The block it writes is saved as before, but the relationship waits on the review screen until you press one of its buttons. Until then the older block stays in your packs exactly as it was.
- **Pictures are copied into your library.** A picture you put in a block is stored inside the database, so the library file grows with them. A pack refers to each picture by its path in an `image-cache` folder next to the database. An AI connected over MCP can ask for the pictures themselves with the new `get_block_images` tool — and so can a Follow Up or Weekly Review run that Spool starts with your CLI engine, which means a project's pictures reach that CLI's vendor the same way its text does.
- **Three new files sit next to your library**: `focus.json` (how long you were at the computer each day), `drafts.json` (text you typed but had not pressed Done on) and `knit.json` (what you have knitted). They are not in the database, they do not travel with an exported library, and Spool never sends them anywhere.
- **A project can be private.** An AI connected through Spool cannot read a private project or see that it exists, but it can still write into it. Spool's own AI features stay off inside it. This covers the route through Spool only — what you paste or upload somewhere yourself is outside it.
- **Focus time now means time at the computer**: any stretch where the keyboard or mouse was touched within the last 15 minutes, whichever app was in front. It is not time spent in Spool, and not time spent on any one project. The break reminder, the focus clock in the sidebar and Weekly Review's Activity all read this one number.
- **The spool in the sidebar is gone.** The counter that wound a spool every hundred notes is replaced by knitting (below).

## The network: what still holds

Unchanged from v0.6.2: **Spool's main process makes no network requests**, and you can check that yourself:

```bash
cd src-tauri && cargo tree -e normal | grep -iE "ureq|rustls|reqwest|hyper|openssl"   # empty
```

Content leaves this machine only on routes you switch on: an MCP client you connected, a CLI engine subprocess, and the `spool-ai` subprocess if you gave it a key. Two things now use that last route:

- **Weekly Review can run through your API key** (DeepSeek by default). It sends the cross-project digest plus the blocks added this week — not whole packs.
- **Spool can show your provider balance.** It asks only when you press the check button, or right after a run that already went out. There is no timer.

## New: pictures in blocks

- **Take a screenshot, then double-tap ⌥**, and it is captured as a picture block. A picture already on the clipboard works too, and so does copying an image file in Finder — you get the picture, not the file name. iPhone HEIC photos are converted to JPEG on your Mac.
- **Pictures and text mix in one block.** Each picture has its own caption, sits where you put it in the text, and opens full size on a click. Pictures pasted or dragged into the main window land in the block you are writing.
- Deleting, merging, moving and copying blocks all carry their pictures, and undo puts them back.

## New: project files in one place

- The right-hand rail lists a project's files newest first, with the date added and who added them — you, or an AI (robot icon).
- **A file can belong to one block**: use the paperclip on the block's action bar. Deleting that block asks whether its files go too; moving or merging blocks takes the files along.
- **Spool follows a file you move** on disk and marks it *New place*; one it cannot find any more is marked *Not found*.
- An AI can **propose attaching a file** from your computer, or **propose that a new version replaces an older file**. Neither happens until you approve it; a replaced file is tucked under the one that replaced it.

## New: AI proposals wait for you

Everything an AI proposes — blocks split across several projects, a correction, a replacement, a file, a project split — appears as a card on the review screen. Cards an AI files while Spool sits in the background now show up on their own within seconds.

**Splitting a long project.** An AI can propose splitting one project into a few sub-projects. Nothing moves until you press Split on the card, where you can regroup first, and one ⌘Z undoes the whole split. Completed projects are not split — reopen one first.

## New: private projects

Right-click a project → **Make private…**. Private projects carry a mark in the sidebar, and the right-hand rail no longer says an AI can read their files. See **What changes for you** for exactly what "private" covers.

## New: Activity in Weekly Review

The top of Weekly Review now shows your week without any AI and without spending anything: average focus time per day, a bar for each day from Monday to Sunday, the projects that got new blocks this week (split into captured, written by you, and written back by an AI), and anything due or overdue. The Weekly Review entry is always in the sidebar now.

Weekly Review itself also changed: choose the route (CLI engine or API key) first, and that is also the route the automatic weekly run takes; pick the model on the page; runs are grouped by week; a run can be stopped; failed runs can be deleted.

## New: dark appearance

Settings → **Match system / Light / Dark**. The main window and the capture card both follow it.

## New: knitting in the sidebar

Every block you save yourself — captured or written — is one stitch. AI-written blocks do not count. Thirty-five stitches make a patch, and patches knit into things: twenty-four items on four shelves, from a dishcloth to a patchwork blanket, each one dearer than the last. Click the knitting in the sidebar and the cupboard slides up from the bottom of the window. Weekly Review shows this week's knitting in one line under Activity. It is all counted on your Mac; nothing is sent anywhere.

## Undo, redo, and text that is no longer lost

- **Undo now has Redo.**
- **Text you have not finished is saved as you type** — in the edit panel and in the box under a project. Quit, update, or crash, and it is still there when you reopen; Spool tells you which blocks were left unfinished and takes you to them with **Show me**.
- A failed save no longer clears what you typed.

## Capture

- **Long-press ⌥ to write a note** straight into the current capture project. If you pressed ⌘C in the two seconds before, the copied text is already in the box, with its source.
- **Both capture cards share one layout**: Undo or Discard on the left, a project picker to send it elsewhere, Done on the right. On the long-press card, Enter saves and Shift+Enter starts a new line.
- **Keep this card open** pins a card so it does not disappear on its own or when you click elsewhere.
- **With several browser windows open, the source is the window you captured from**, not whichever one the browser considers frontmost.
- A ⌘C pressed just after a screenshot no longer replaces the screenshot unless it actually changed the clipboard, and Spool waits for a screenshot that lingers in the corner preview instead of giving up after a few seconds.

## Also in this release

- **Sidebar**: "dormant" projects are gone. Workspaces start collapsed except the one holding the project you are in. A workspace whose projects are all done moves to **Archive** at the bottom; right-click archives one by hand, and ⌘Z brings it back.
- **Find in this project** walks through the whole project in time order and wraps around. ⌘F opens it when Spool is in front, starting from the text you selected, and it stays open until ✕ or Esc.
- **Export a project**: **Export .md** saves one project's pack as a file, and an export can be a folder that carries the project's files and pictures, with a checklist of what goes in. Workspace exports carry them too.
- **Copy to…** checks for duplicates first — identical blocks are skipped, similar ones you decide one by one — and **Delete originals** turns the copy into a move. One ⌘Z undoes it.
- **Who cites this block**: every block shows the blocks that cite it and why. A citation that points at something no longer valid waits for you: keep it as a historical citation, point it somewhere else, or remove it.
- **Gist**: a new tab lists the one-line gist of each block — the line an AI sees in search results. Edit it there; an AI cannot overwrite a gist you wrote. Gists never go into a pack.
- **Annotations** can be highlighted and corrected, and an AI's annotation sits on top of the block like yours, labelled as the AI's.
- **Replace in full** is recorded on the old block, so one new block can replace several.
- **Reading**: blocks open expanded, ↓ / ↑ jump between them, a tick bar on the right edge has one tick per block, and each project remembers where you were.
- **Block text size**: Settings → General → Small / Medium / Large.
- **Names**: a project or workspace that would share a name with another in the same place gets " 2" added.
- **The main window opens sized to your screen.**
- **AI features that need an engine show a lock** and can be set up on the spot. **Show AI features** (Settings → AI engine) hides all of them, and with it off the automatic weekly review and overnight compression do not run.
- **Follow Up with the Codex CLI can write its findings back** to Spool.
- **Fixed**: a keyboard freeze of several seconds while Spool waited on the system (keychain, file checks, exports); text lost when Find jumped to another project; a compressed pack that wrote its closing `---` line into the last block; pictures shown as raw text after merging annotated blocks; several English-interface strings that appeared in Chinese.

## Known limits

- **macOS only.** Windows stays at v0.6.1 until the next release.
- **A pack names pictures by path.** An AI that reads a pasted pack sees where each picture is on your Mac, not the picture; over MCP it can fetch the pictures with `get_block_images`.
- **Private covers the Spool route only.** It hides a project from AI connected through Spool; it does not encrypt anything on disk.

---

**Spool's main process still makes no network connections.** Content leaves this machine on exactly three routes, all of them yours to switch on: an MCP client you connected, a CLI engine subprocess (Claude Code, Codex CLI, Gemini CLI), and the `spool-ai` subprocess, if you gave it a key.
