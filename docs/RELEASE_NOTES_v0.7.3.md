Spool is a context hub for long-running projects: capture fragments the moment they appear, keep them threaded under one project, and pack any project into a paste-ready briefing when you need to re-enter it — or re-brief an AI.

**v0.7.3 makes a CLI you already have and an API key two equal routes to every AI action, and lets the out-of-date check look across a whole workspace.**

## Download

**macOS** — `Spool_0.7.3_aarch64.dmg` · 11.1 MB · Apple Silicon (M1 or later), macOS 11 or newer

The macOS build is signed and notarized with a Developer ID, so it opens without the "unidentified developer" warning. `Spool-macOS-arm64.dmg` is the same file under a fixed name, for direct-download links — either name works.

```
sha256  014a692597a8c748cbf7f5e4d6f2f1616902de8ce3a03a6e81d4e9a28e3a9927  Spool_0.7.3_aarch64.dmg
```

**Windows is not in this release.** The Windows download stays at v0.6.1 until the current release has been checked on a Windows machine.

**Upgrading changes nothing in your database** — it stays at schema v35.

## New

- **Two equal routes, the same four actions.** Settings → AI engine now shows two boxes of the same size: *Local CLI* and *API key*. Both list what they can do — weekly review, follow-up, compression and the out-of-date check. Compression and the out-of-date check no longer need an API key: with a connected local CLI they run on your own subscription. When both routes are connected, each action has its own *Local CLI / API* switch next to its button; with only one connected, the button says which one it uses.
- **A key from any of nine providers.** Paste a key from OpenAI, Claude, Gemini, DeepSeek, Kimi, Qwen, Zhipu GLM or OpenRouter and Spool recognises the provider, fills in the address and fetches that provider's model list for you to choose from, starting on its cheaper tier (a Claude key starts on Haiku 5.5). DeepSeek, Qwen and Kimi keys look alike, so for those Spool asks which provider the key belongs to instead of guessing. A custom HTTPS endpoint still works. An existing DeepSeek setup carries over without re-entering anything, and "DeepSeek" no longer appears in the interface unless it is the provider you use.
- **Follow up through an API key.** With an OpenAI, Claude, Gemini, Kimi or Qwen key, Follow Up runs on that provider's own web search; what it finds arrives in the review queue, marked with the provider's name, the same way a CLI run's findings do. A provider without web search says so next to Follow Up. The weekly automatic follow-up uses whichever route Follow Up is set to.
- **The out-of-date check can cover a whole workspace.** The out-of-date tab now checks every unfinished project in the workspace at once, sub-workspaces included — *All of “…”* is the default, with *Just this project* one click away. Besides older blocks that a newer block replaced, now also across projects, it lists **projects that may be finished**, quoting what makes it think so, with a **Mark done** button that opens the same panel as the project's own *Done*. Finished and private projects are never sent.
- **Out-of-date results are kept.** Quitting Spool no longer loses them, and anything you already acted on stays crossed out.
- **A monthly check, if you want one.** When checking a whole workspace you can switch on *Check all of “…” once a month* (off by default). About every 30 days, while Spool is open, it runs the check on the route the out-of-date check is set to; the page says when it last ran and roughly when it runs next.
- **You can see which projects follow up by themselves.** A project with weekly automatic follow-up switched on now shows *Searches weekly · next around …* under its follow-up list in the right-hand rail, before its first run as well as after.

## Changed

- **Compression's settings moved to where they apply.** Keeping a block's original wording has its own *Compression* section in Settings; reasoning effort sits in the *API key* box and only appears for providers that accept it.
- **The copyright line** in the Finder's Get Info and in About Spool now reads © 2026 Hanze Jin.

## Known limits

- **macOS only** for now; on Windows the local CLI route stays off.
- **A whole-workspace check sends every unfinished, non-private project in it at once.** Before a run Spool says how many projects it will send, and after an API run it shows what the run actually cost. A workspace too large to send in one go is not cut down — Spool says so and sends nothing; you can check just the one project, or mark finished projects done first. A sub-workspace with a single project has no whole-workspace option.
- **Spool reads an attached file's text once, when you attach it.** If you keep editing that file, packs and the out-of-date check still see the version you attached.

---

**Spool's main process still makes no network connections.** Content leaves this machine on exactly three routes, all of them yours to switch on: an MCP client you connected, a CLI engine subprocess (Claude Code, Codex CLI — including the copy inside the ChatGPT desktop app — or Gemini CLI), and the `spool-ai` subprocess, if you gave it a key.
