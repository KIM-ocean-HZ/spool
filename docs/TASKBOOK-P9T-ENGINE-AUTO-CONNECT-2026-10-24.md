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

截图在桌面 `Spool/P9T-screenshots-20261024/`。

1. **这台 Mac**：打开 设置 → AI 引擎，拉到最下面「本机 AI 引擎」。应该写「✓ 已连接 Codex（还装了另外 2 个）」—— 你设置里选的就是 Codex，之前它装在 nvm 里、app 里找不到，实际跑的多半是 Claude Code。
2. **新用户（那台没装 Codex 的 Mac / 那个测试用的 macOS 用户）**，什么都不装，打开同一个地方：应该写「找到了 Codex（ChatGPT 自带的）」和一个「连接」按钮（那台装了 ChatGPT 桌面版的话）。点「连接」，变成「✓ 已连接 Codex（ChatGPT 自带的）」。
3. 同一个新用户，用你上次的办法装 Codex，回到 Spool，把设置关掉再打开：「（ChatGPT 自带的）」那几个字没了 —— 用的是你装的那一份。没装 ChatGPT 的话：装完切回 Spool，不用点任何东西，几秒内就从「没找到」变成「找到了 Codex」。
4. 一个锁着的 AI 按钮（比如周回顾那一条，连接之前）点开：弹出来的是同一块，按「连接」就通，弹块自己合上。
5. 整个过程中**不应该**弹出「“Spool”想访问你的桌面 / 文稿 / 下载文件夹」。

只要告诉我：哪几条不对；第 2、3 条是在另一台 Mac 上试的还是同一台的另一个用户（另一台的话要先把这一版装过去）。

## 7. 回执（执行窗填写）

### 7.1 P9T-1 · 找得到 —— `7fd643b` + 补 `fed39b6`

- 根因在这台上复现：`env -i PATH=/usr/bin:/bin:/usr/sbin:/sbin … ~/.nvm/…/bin/codex --version` → `env: node: No such file or directory`；`~/.local/bin/claude`（原生）跑得通。ChatGPT.app 自带 `codex-cli 0.163.0-alpha`，Spool 用到的参数它都认；Claude 桌面版那份是 Linux 程序，不用。
- 改：一份目录清单 `search_dirs`（登录 shell `-ilc` 的 PATH，只问一次、3 秒超时、带记号；app 自己的 PATH；常见目录；nvm 新版本在前；去重）；找 CLI 和启动 CLI（`--version` 和真正运行的 `run_env`）都用它，CLI 自己的目录排第一；Codex 最后看 ChatGPT.app（`/Applications`、`~/Applications`）；**桌面 / 文稿 / 下载 / iCloud / 外接卷不进清单**（补的那一笔：这台的 `.zshrc` 把 `~/Desktop/nand2tetris/tools` 放进了 PATH，光看一眼里面就会弹「Spool 想访问桌面」）。
- 验：单元测试 5 条（记号解析、顺序、ChatGPT 那份最后、CLI 目录排第一、受保护目录不进）；光 PATH 实测三种：正常 → Claude / Codex（nvm）/ Gemini（nvm）都认出；登录 shell 失败 → 照样都认出；空的家目录 → 只剩 ChatGPT 自带的 Codex 0.163，认出。登录 shell 那一步这台约 1.5 秒，在后台线程。cargo 229 过 · 6 跳过。

### 7.2 P9T-2 · 一键连上 —— `308fa84`

- `AiSetup/LocalEngine.tsx`：没找到 / 找到了·连接 / 已连接三种，设置页和锁的弹出块共用；「连接」只开关着的那个开关；ChatGPT 自带的写明；路径在悬停提示里。设置页「详细说明」七段、填路径框和 `which` 教程、指去 MCP 页的那句都去掉；`turnOnCli` 和它的测试删了（补丁本身 `cliSwitchesPatch` 在 gate.test 里有测）；26 句死字删了（`--dead` 回到 87，`用哪个引擎` 本来就死，没动）。
- 没找到时窗口拿到焦点再找（`probeIfMissing`，至少隔 10 秒）。右栏 / 跟进面板的锁改成「找到了 {engine}，还没连接」。
- 验：tsc 干净 · vitest 1177（新加 LocalEngine 5 条；engineSentences ② 改成新句子，意思不变）· i18n 无缺。截图：四种样子 + 弹出块 + 英文。

### 7.3 换装（10-24 凌晨，两次）

- 装前：v0.7.1 正式版（`Notarized Developer ID`）；`drafts.json` 两个都空；真库 v35 · ok · 项目 90 / 块 1297 · 正文 538045。
- 第一次（01:08，`308fa84`）装完才查到桌面那个问题 ⇒ 补一笔、重编、**第二次（01:10，`fed39b6`）**。每次都：备份到 `~/Desktop/Spool/db/`（`…before-p9t-install-…` / `…before-p9t2-install-20261024-011014…`，库 + 五个 json），旧包进 `spool-pre-install/`，`open --stdout/--stderr` 留日志（`~/Desktop/Spool/logs/spool-p9t2-20261024-011014.log`）。
- 装后：sha256 和构建一致；日志两行（overlay、双击 ⌥ HID/active）；真库那几个数一样；四个 json 逐字节一样。`spctl` 是开发版（没公证），版本号还是 0.7.1。
- **没验的**：界面上的三种样子只在离屏渲染里看过；真机上「装完切回来自己出现」和「没有弹访问桌面」等 Ocean。
