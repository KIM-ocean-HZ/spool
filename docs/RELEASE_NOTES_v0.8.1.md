Spool is a context hub for long-running projects: capture fragments the moment they appear, keep them threaded under one project, and pack any project into a paste-ready briefing when you need to re-enter it — or re-brief an AI.

**v0.8.1 fixes the app icon on macOS 15 and earlier.** Nothing else changes.

## Download

**macOS** — `Spool_0.8.1_aarch64.dmg` · 13.1 MB · Apple Silicon (M1 or later), macOS 11 or newer

The macOS build is signed and notarized with a Developer ID, so it opens without the "unidentified developer" warning. `Spool-macOS-arm64.dmg` is the same file under a fixed name, for direct-download links — either name works.

**Windows** — `Spool_0.8.1_x64-setup.exe` · 9.7 MB · Windows 10 or 11, x64

The Windows installer is **not code-signed**, so SmartScreen warns once before it will install (*More info → Run anyway*). It installs for your user only and needs no administrator rights. `Spool-windows-x64-setup.exe` is the same file under a fixed name. Nothing in it changes from v0.8.0 except the version number.

```
sha256  c310f6b97c95b1cd897228ab7e99e2971119035af7a87438ba2023990e9a016d  Spool_0.8.1_aarch64.dmg
sha256  66cfdcbf69d23fc305488dc5595f073dc4e982dcda170abb8f5951053fc3583d  Spool_0.8.1_x64-setup.exe
```

**Upgrading changes nothing in your database** — it stays at schema v39.

## Fixed

- **macOS 15 and earlier showed a washed-out app icon** in the Dock, the Finder and the app switcher: lighter than designed, with a diagonal glass streak and a pale rim. Those systems now show the designed icon, the same one as in the installer window. On macOS 26 and later the icon does not change.

---

**Spool's main process still makes no network connections.** Content leaves this machine on exactly three routes, all of them yours to switch on: an MCP client you connected, a CLI engine subprocess on macOS (Claude Code, Codex CLI — including the copy inside the ChatGPT desktop app — or Gemini CLI), and the `spool-ai` subprocess, if you gave it a key.
