Spool is a context hub for long-running projects: capture fragments the moment they appear, keep them threaded under one project, and pack any project into a paste-ready briefing when you need to re-enter it — or re-brief an AI.

**v0.8.0 ships macOS and Windows together again, and closes the loop between you, your AI and Spool: an AI picks up where it left off, hands its work back into the project, and Spool's own checks tell you what has gone stale — with every change still waiting for your click.** It is the first Windows release since v0.6.1.

## Download

**macOS** — `Spool_0.8.0_aarch64.dmg` · TBD MB · Apple Silicon (M1 or later), macOS 11 or newer

The macOS build is signed and notarized with a Developer ID, so it opens without the "unidentified developer" warning. `Spool-macOS-arm64.dmg` is the same file under a fixed name, for direct-download links — either name works.

**Windows** — `Spool_0.8.0_x64-setup.exe` · TBD MB · Windows 10 or 11, x64

The Windows installer is **not code-signed**, so SmartScreen warns once before it will install (*More info → Run anyway*). It installs for your user only and needs no administrator rights. `Spool-windows-x64-setup.exe` is the same file under a fixed name.

```
sha256  TBD  Spool_0.8.0_aarch64.dmg
sha256  TBD  Spool_0.8.0_x64-setup.exe
```

## Upgrading

- **macOS, from v0.7.4**: your database is migrated from schema v37 to v39 — one new table for an AI's folder-link proposals, and one new column recording when you last edited a block. Nothing in your existing projects changes.
- **Windows, from v0.6.1**: your database is migrated from schema v23 to v39 in one go.
- Either way, Spool saves a snapshot of the old database next to it before migrating. AI clients still connected to the old version will say the database is newer than they are until you quit and reopen them.

## On Windows for the first time

Everything released for macOS in v0.6.2 – v0.7.4 is now on Windows too: compression with a character-by-character check, pictures and files in blocks, AI proposals that wait for your click, private projects, Weekly Review and Follow Up through your own API key, the out-of-date check, and linking a workspace to a folder. See the [v0.6.2](RELEASE_NOTES_v0.6.2.md), [v0.7.0](RELEASE_NOTES_v0.7.0.md), [v0.7.1](RELEASE_NOTES_v0.7.1.md), [v0.7.2](RELEASE_NOTES_v0.7.2.md), [v0.7.3](RELEASE_NOTES_v0.7.3.md) and [v0.7.4](RELEASE_NOTES_v0.7.4.md) notes for what each one does.

- **Hold Ctrl to write a note.** Press Ctrl alone for about a second and let go: the note card opens. If you copied something in the two seconds before, it comes with the note. Double-tap Ctrl still captures as before.
- **The capture card takes the keyboard**, so you can type your note straight away, and the window you were in gets its keyboard back when the card closes.
- **A capture from Edge, Chrome or Firefox is labelled with the page's title**, without the browser's name and profile after it.
- **No on-machine AI engine on Windows.** Weekly Review, Follow Up, compression and the out-of-date check run through an API key you paste in Settings → AI engine. The Claude Code / Codex / Gemini CLI route is macOS only for now.
- The installer and uninstaller now carry Spool's icon.

## New

**An AI picks up where it left off**

- **It reads only what changed.** Each time an AI reads a project, Spool tells it the newest block's number; next time it can ask for just the blocks added after that, and the ones you edited since. Blocks now record when you last edited them, so an AI can tell "#5 was just changed" from "#5 is old".
- **It hands its work back.** When an AI reads a project it is also told which files the project holds and what to do when it finishes: if it wrote a new file, propose attaching it; if it wrote a new version of a file already there, propose replacing the old one; if the plan changed, write one block back. Each of these waits for you on the review screen.
- **"This project" means the one you capture into.** When you say "this project" or "save it in" without a name, an AI connected over MCP takes the project marked *Capture here*, says its name, and waits for your yes before writing. A private project is never named.
- **An AI can create a workspace** when nothing you have fits, and **propose linking a workspace to a folder**. The link is only a card on the review screen until you go through Spool's own connect dialog.

**Weekly Review you can act on**

- **One card per project, in four parts**: what you did, where you are stuck, the signals it saw, and what to do next. Every signal quotes your project word for word; a line whose quote cannot be found there is dropped, and the page says how many were.
- **Suggested actions are buttons.** Mark a project done, set a deadline, add a follow-up line or close one — one click, and ⌘Z undoes it. A suggested correction or replacement goes to the review screen instead.
- **Finished projects are left out**, and Weekly Review is written in Spool's interface language.
- **A small card tells you a new review is ready**, in the same place the capture card appears. It does not take the keyboard; click it to open the review.

**Follow Up finishes what it starts**

- Besides closing a line it answered, Follow Up can now come back with **"Suggested closing"** (answered in part, or not sure) or **"Only you can answer this one"** (nothing on the open web will settle it). Each one gets its own pair of buttons on the result card — close the line, or keep it — and ⌘Z undoes your choice.
- **Blocks whose recheck date has passed are checked too**, as one-off questions; a block that still holds gets *Mark as checked* on the card.
- **A project linked to a folder is followed up against the folder.** The run reads the folder's state files and recent commit titles first, so it does not go searching on a plan you have dropped. Weekly automatic follow-up therefore no longer pauses when the folder has moved on.

**One out-of-date check, with your repository in it**

- If a project's workspace is linked to a folder, the out-of-date check brings the folder along: the state files, the commit titles since the last sync and the files changed since then. Besides blocks that later blocks overturned, it finds blocks the repository overturned, follow-up lines whose premise is gone, and AI-written summaries that no longer match. Nothing changes until you click.
- **One button, one list.** *This project* and *the whole workspace* both include the repository when there is one; the folder card's button opens the out-of-date check. *In sync now* is gone: going through the check's list is what marks the project and its folder as in line again.

**Reading your timeline**

- **Formulas, tables, links, quotes, strikethrough and rules are drawn**, in blocks, Weekly Review, summaries and the capture card. Formulas written as TeX (`\( … \)`, `$$ … $$`) are typeset; what is stored, and what an AI gets in a pack, is still the TeX you saved.
- **Capture keeps tables, lists and formulas.** When what you copied carries formatting that plain text cannot hold — a table from an AI chat, a formula on a web page — Spool saves it as Markdown, with formulas written back as TeX. Pasting into the input box does the same.
- **Corrections written together fold into one line.** A correction reads "#11 corrects a sentence in #4: …" on one line; two or more corrections or follow-up blocks written together become one line with their range of numbers. Click to see each one, and again to open its card. Every block keeps its own number and place.
- **Block numbers sit in true circles**, centred, the same size throughout a project, with the times after them lined up.
- **What an AI writes shows up without reopening the project**, even if Spool was in the background when it wrote.

**Smaller things**

- **Double-tap ⇧ to switch where captures go**, on macOS and Windows. A list of your recent projects opens at the pointer; scroll to choose, click outside or wait a few seconds to keep the choice. It has its own switch in Settings, and pausing the capture gesture pauses it too.
- **The pack dialog says which files' text is not all in the pack**, and why — not switched on, cut short, or a scan Spool could not read text from — so you know to send those files along.
- **A workspace's title can be renamed by double-clicking it** on the workspace page, as in the sidebar.
- **Capture setup lists both macOS permissions it needs**, each with a button straight to its page in System Settings.
- **A new app icon.**

## Changed

- **Spool's own engine no longer writes into your library directly.** Weekly Review, Follow Up and the other runs Spool starts get only the read tools and the ones that put something on the review screen (or close a follow-up line); a Follow Up run sees only the project it is following up. When the engine is Codex, Codex's own connectors, plugins, memories, browser and computer-use features are switched off for that run.
- An MCP client now sees **30 tools** (15 read-only, 15 write); Spool's own engine gets 22.
- **The out-of-date check through an API key can send up to 150,000 characters** in one run (was 120,000), so a workspace with a linked repository fits.
- **A single capture is limited to 500,000 characters.** A larger one is not saved, and the capture card says so; very large blocks no longer freeze Spool.
- **A new library's guide no longer says Spool "ships no AI of its own".** It now says your data stays on this machine unless you open a route yourself. Libraries created earlier keep their guide as it is.
- **The privacy notice** now says that when a workspace is linked to a folder, Follow Up and the out-of-date check through an API key also send the folder's state-file text, recent commit titles and, for the out-of-date check, the list of changed files.

## Fixed

- **Exporting your library could delete it.** If the export folder was Spool's own data folder written with different capital letters, the safety check let it through and the export removed the live database before writing. It is now refused, on both platforms.
- **A deleted project stayed named in its folder's `SPOOL.md`**; it is now removed the next time Spool opens. A state file's *changed* mark now stays until you open that file, across restarts.
- **The preview of a corrected sentence** now scrolls with the sentence, and closes when you double-click into the editor.

## Known limits

- **Capturing a screenshot on macOS waits for the thumbnail.** While the small preview is still in the corner, macOS has not written the picture anywhere Spool can read. To capture at once, open ⌘⇧5 → *Options* and turn off *Show Floating Thumbnail*.
- **School or work Windows computers** may run security software that stops Spool from starting; an administrator has to allow it.
- **Windows in Parallels on a Mac**: holding Ctrl to write a note needs Parallels' keyboard setting *Optimize modifier keys for games*; otherwise Windows only sees the key when you let go.
- **Windows in Parallels, and network drives**: a file in a folder shared from the Mac (the virtual machine's Desktop, Documents and Downloads by default) or on a network drive cannot be followed after you move it; point Spool at it again with *Choose where it is*.
- **This release was checked on Windows 11 in a virtual machine**, running the x64 build. It has not been checked on Windows 10, with a physical PC keyboard, or across monitors with different scaling.
- **Spool cannot stop an AI client from reading a linked folder itself.** An AI client with its own file tools can read anything there; Spool only decides what it hands over through its own tools.

---

**Spool's main process still makes no network connections.** Content leaves this machine on exactly three routes, all of them yours to switch on: an MCP client you connected, a CLI engine subprocess on macOS (Claude Code, Codex CLI — including the copy inside the ChatGPT desktop app — or Gemini CLI), and the `spool-ai` subprocess, if you gave it a key.
