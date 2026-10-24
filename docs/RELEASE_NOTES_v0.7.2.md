Spool is a context hub for long-running projects: capture fragments the moment they appear, keep them threaded under one project, and pack any project into a paste-ready briefing when you need to re-enter it — or re-brief an AI.

**v0.7.2 fixes Spool not finding a Codex you had installed, and makes connecting one a single click.**

## Download

**macOS** — `Spool_0.7.2_aarch64.dmg` · 11.0 MB · Apple Silicon (M1 or later), macOS 11 or newer

The macOS build is signed and notarized with a Developer ID, so it opens without the "unidentified developer" warning. `Spool-macOS-arm64.dmg` is the same file under a fixed name, for direct-download links — either name works.

```
sha256  ef4fedf29a90092fae3519a9958ef82cab219efe9c5d16f596e4226a27b3a915  Spool_0.7.2_aarch64.dmg
```

**Windows is not in this release.** The Windows download stays at v0.6.1 until the current release has been checked on a Windows machine.

**Upgrading changes nothing in your database** — it stays at schema v35.

## Fixed

- **A Codex, Gemini CLI or Claude Code installed with npm was reported as not installed.** An app opened from the Finder or the Dock starts with a much shorter search path than your Terminal, and a CLI installed with npm needs Node, which was not on it — so the CLI was found but could not run, even to report its version. Spool now uses the search path your Terminal uses, plus the usual install folders, both to find a CLI and to run it. If you picked Codex as your engine and it lives in an nvm folder, runs may have been using Claude Code instead until now.
- **Spool never looks inside your Desktop, Documents, Downloads or iCloud Drive folders, or on external drives, for a CLI**, even if your shell's search path lists one — looking would make macOS ask for permission. A CLI kept there can still be chosen by hand.

## Changed

- **The ChatGPT desktop app's own Codex counts.** If you have the ChatGPT desktop app and no Codex of your own, Spool uses the copy built into ChatGPT, and says so. A Codex you installed yourself always comes first.
- **Settings → AI engine → On-machine AI engine is now three states**, with one thing to press in each: *No Claude Code or Codex found* (install links, *Look again*, *Choose by hand…*), *Found Codex* with a **Connect** button, and *Connected*. The long explanations are gone. The panel a locked AI button opens shows the same block.
- **Installing a CLI while Spool is open is enough**: switch back to Spool and it looks again by itself.

## Known limits

- **macOS only** for now.
- **Spool reads your login shell's search path once per launch**, by starting your shell for a moment. If your shell's startup files are slow or ask for input, Spool gives up after three seconds and falls back to the usual install folders.

---

**Spool's main process still makes no network connections.** Content leaves this machine on exactly three routes, all of them yours to switch on: an MCP client you connected, a CLI engine subprocess (Claude Code, Codex CLI — including the copy inside the ChatGPT desktop app — or Gemini CLI), and the `spool-ai` subprocess, if you gave it a key.
