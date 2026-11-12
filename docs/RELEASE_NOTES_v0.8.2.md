Spool is a context hub for long-running projects: capture fragments the moment they appear, keep them threaded under one project, and pack any project into a paste-ready briefing when you need to re-enter it — or re-brief an AI.

**v0.8.2 is a round of fixes** — things we ran into while writing the illustrated guide. No new features.

## Download

**macOS** — `Spool_0.8.2_aarch64.dmg` · 13.1 MB · Apple Silicon (M1 or later), macOS 11 or newer

The macOS build is signed and notarized with a Developer ID, so it opens without the "unidentified developer" warning. `Spool-macOS-arm64.dmg` is the same file under a fixed name, for direct-download links — either name works.

**Windows** — `Spool_0.8.2_x64-setup.exe` · 9.7 MB · Windows 10 or 11, x64

The Windows installer is **not code-signed**, so SmartScreen warns once before it will install (*More info → Run anyway*). It installs for your user only and needs no administrator rights. `Spool-windows-x64-setup.exe` is the same file under a fixed name.

```
sha256  a627b11458b2c63ccabe7b65ef702922a300b452eb2c61956f314e9aa1107c58  Spool_0.8.2_aarch64.dmg
sha256  a9e948c051869d88c563deb597d64932a91263a39488069aac6b2fec97133ea5  Spool_0.8.2_x64-setup.exe
```

**Upgrading changes nothing in your database** — it stays at schema v39.

## Changed

- **Windows: your API key now lives in Windows Credential Manager**, as it does in the Keychain on macOS. Until now it was a separate file in Spool's data folder. A key saved by an earlier version moves over the first time Spool reads it, and the old file is deleted once the move has worked. It still never goes into the settings file or an exported library.
- **Finishing or archiving the project that receives your captures now sends capture to "Unsorted"**, and Spool tells you so. Before, captures kept landing in a project that was already done. If you no longer have an unfinished "Unsorted", Spool makes one.

## Fixed

- **Two displays with different scaling (macOS).** With a standard-resolution display as the main one and a Retina screen beside it, the capture card opened on the wrong screen, and files dragged into Spool on the Retina screen landed off target or not at all.
- **The first capture after granting Automation** — made while macOS was still asking — was saved without a source. It now records the app it came from.
- **Compression: the "Length" figure at the top** counted Spool's own instructions at the head of the pack, so a project whose blocks shrank by a quarter could show −2%. It now counts the blocks, the same way each block's own figure does.
- **Runs on a local CLI** (Claude Code, Codex) no longer show a cost line or "cost unknown" — they run on your own subscription. Weekly-review records say who ran them and when, without model IDs.
- **If the API switch was on but the key had gone** (deleted outside Spool), the AI buttons stayed available and failed only once started. They now ask for a key, as Settings does.
- **Approving a follow-up from Review** now shows it under "Watching for" straight away, without switching projects.
- **English interface:** quoted words use “ ” instead of 「」; counts read "1 block", "1 project", "1 commit"; amounts priced in yuan read CN¥; the button that closes a follow-up says "Close it" instead of "Off".
- **Layout:** in the Projects table, rows with a duplicate warning no longer push the other columns out of line; at narrower window sizes the buttons at the bottom of the Compress and Out-of-date check pages no longer break across lines.
- **The first-run guide** now names the banner's actual buttons ("Open Input Monitoring", "Open Accessibility", "Restart Spool").
- **Linking a folder** now also recommends status files with Chinese names (计划.md, 交接.md, 进度.md …).
- **An `sk-` key Spool cannot place** now says which vendors use that format (DeepSeek, Qwen, Kimi, older OpenAI keys) and lists them first. Spool still never tries your key on a vendor you did not pick.

---

**Spool's main process still makes no network connections.** Content leaves this machine on exactly three routes, all of them yours to switch on: an MCP client you connected, a CLI engine subprocess on macOS (Claude Code, Codex CLI — including the copy inside the ChatGPT desktop app — or Gemini CLI), and the `spool-ai` subprocess, if you gave it a key.
