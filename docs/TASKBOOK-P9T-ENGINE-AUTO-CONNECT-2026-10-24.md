# 产品任务书 P9T —— 本机 AI 引擎：找得到、一键连上，设置页不再靠解释

> **状态：ACTIVE**（2026-10-24 下发，同一窗执行）。
>
> **唯一交付：** §3 的三步按顺序做完、每步一笔提交，§7 写回执；换装（先看有没有没存的字）→ Ocean 验收。发不发版到时候问。
>
> **来历：** Ocean 10-24：「在没有装 codex 的 mac 上模拟新用户使用 spool，发现 spool 根本找不到 codex CLI（其他 AI 用户可能也会有这个情况）。并且设置里面的 AI 引擎的注释根本起不了作用，解释这么多也比不过一个好用的自动连接，重做。」这是 **owner interruption**（`EXECUTION_POLICY.md` §3.2），插在「P9R 验收 → P10」前面，做完回到那里。
>
> **授权来源（Ocean 10-24，HANDOFF §9.2 第 181 – 183 条）：**
> - 第 181 条：这一件插队做（原话「重做」）。
> - 第 182 条：找到引擎之后，**一个「连接」按钮**（推荐项）—— 不自动打开「MCP 服务」，点一下才开。
> - 第 183 条：ChatGPT 桌面版里自带的 Codex **用，只在没有单独装的时候**（推荐项）。
>
> **边界：** 只动本机 CLI 这一路的「找」和「连」，以及设置页「AI 引擎」里本机引擎那一块、锁着的地方弹出来的那一块。DeepSeek 那一半、MCP 那一页、引擎跑起来之后的行为都不动。不改库。Windows 上引擎照旧关着。

---

## 1. 开工先读

`docs/EXECUTION_POLICY.md`；HANDOFF 首屏、§9.2 第 171 – 183 条、§9.8；`CLAUDE.md` §3、§5；记忆 `tauri-sync-commands-freeze-ui`、`isolated-verify-workflow`、`write-plainly-for-ocean`。

## 2. 起点（10-24 对着 `840dafc` 查的）

- **根因一：用 npm 装的 CLI 跑不起来。** 从访达 / 程序坞打开的 app 拿到的 PATH 只有 `/usr/bin:/bin:/usr/sbin:/sbin`。npm 装的 Codex（也包括 npm 装的 Claude Code、Gemini CLI）是 `#!/usr/bin/env node` 脚本，Spool 找到了文件、拿它跑 `--version` 时报 `env: node: No such file or directory` ⇒ 判成「没装」。这台 Mac 上就复现：`~/.nvm/versions/node/v24.11.0/bin/codex` 用那个 PATH 跑不通；官方安装器装的 Claude Code（`~/.local/bin/claude`，原生程序）跑得通 —— 所以只有一部分人撞上。真正运行（`run_env`）给 CLI 的也是这个 PATH，同一个问题。
- **根因二：只装了 ChatGPT 桌面版的人。** ChatGPT.app 里自带一份能用的 Codex：`/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex`（这台上 `codex-cli 0.163.0-alpha`），Spool 不去那里找。核过：Spool 给 Codex 的参数（`exec --json --sandbox --skip-git-repo-check --ignore-user-config -c -o`）它都认。
- Claude 桌面版的 `~/Library/Application Support/Claude/claude-code-vm/*/claude` 是 Linux（ELF）程序，给它自己的虚拟机用的 —— **不能用，不找它**。
- **设置页**（`Settings/EngineConfig.tsx`）：静止时一段说明 + 状态；找到了但「MCP 服务」关着时只有一句「要让它干活，MCP 那一页的……要都打开」，**没有按钮**；「详细说明」里七段字和手动填路径。新用户的「MCP 服务」默认关（`mcpEnabled: false`），「允许 AI 写入」默认开。
- 锁着的地方弹出来的那一块（`AiSetup/AiSetupPanel.tsx`）有「现在打开」按钮，但前面也是两段解释。

## 3. 三步

### P9T-1 · 找得到（Rust）

- 一份「这台电脑上 CLI 可能在的目录」：用户登录 shell 自己的 PATH（`$SHELL -ilc` 打印 PATH，前后加记号、3 秒超时、整个 app 只问一次）+ app 自己的 PATH + 常见目录（`~/.local/bin`、`~/.npm-global/bin`、`~/bin`、`~/.bun/bin`、`~/.volta/bin`、nvm 每个版本的 bin、`/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`），去重保序。
- 每个引擎在这些目录里找；Claude 另加 `~/.claude/local/claude`；Codex 最后加 ChatGPT 自带的那一份（`/Applications` 和 `~/Applications` 两处）—— 单独装的永远排在它前面（第 183 条）。
- 跑 `--version` 和真正运行时，PATH = 那个 CLI 自己所在的目录 + 上面那份 —— `env node` 就找得到 node。手动指定的路径也一样。
- **验收**：单元测试（记号解析、顺序、ChatGPT 那份排最后、PATH 里第一个是 CLI 自己的目录）；用和访达打开时一样的光 PATH（`env -i PATH=/usr/bin:/bin:/usr/sbin:/sbin …`）跑一次检测，这台上的 npm Codex 要被认出来。

### P9T-2 · 一键连上（界面）

- 设置「AI 引擎」里本机引擎那一块重做成三种样子，**不放说明段落**：
  - 没找到：「没找到 Claude Code 或 Codex」+「装 Claude Code」「装 Codex」+「重新查找」+「手动选择…」（直接弹文件选择，不再要人去终端敲 `which`）。
  - 找到了、没连上：「找到了 Codex」+「连接」按钮（打开 MCP 那两个开关里关着的那个），按钮下一行小字说清「连接之后，你接过的别的 AI 也能读写项目」（第 182 条要的「用户知道自己开了什么」）。
  - 连上了：「✓ 已连接 Codex」，ChatGPT 自带的那份写「（ChatGPT 自带的）」；装了不止一个照旧说「还装了另外 n 个」；路径放在悬停提示里；下面是「单次最长运行时间」。
- 锁着的地方弹出来的那一块用同一套样子和字；右栏 / 跟进面板里锁的那句改成「找到了 {engine}，还没连接」。
- **自动再找**：引擎还没找到时，Spool 窗口每次重新拿到焦点就再找一次（至少隔 10 秒）—— 装完 CLI 切回来，不用点任何东西它就出现。
- 死掉的字一并删。

### P9T-3 · 截图 + 换装

- 三种样子各截一张（设置页 + 锁的弹出块），中英。换装照 P9S。

## 4. 什么时候停下来问

- 要动 DeepSeek 那一半、MCP 那一页、或者改开关的默认值。
- 登录 shell 那一步在这台机器上超过 3 秒或者输出对不上。

## 6. 给 Ocean 的验收单（换装后给）

换装后单独写。

## 7. 回执（执行窗填写）
