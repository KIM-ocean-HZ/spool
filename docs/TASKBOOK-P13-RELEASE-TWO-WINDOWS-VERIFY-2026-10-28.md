# 产品任务书 P13 —— 发版二之前：Windows 真机验证（只验，不发）

> **状态：ACTIVE（2026-10-28 下发）—— 下一窗执行，在 Ocean 自己的 Windows 电脑上，用 Windows 上的 Claude Code。**
> 开工先做 §0（环境），再问 Ocean §4 的几件，答完再动手。
>
> **唯一交付：** 用 `main`（代码 = Mac 上 10-28 14:51 装的那一版，`33a2390`）在 Windows 上编译、跑全套测试、打不签名的 NSIS 安装包、
> 装上去，照 §6 和 Ocean 一起走一遍；每一条结果、每一个问题记下来（§7 回执 + HANDOFF）。验收通过之后的下一件是**发版二：Mac + Windows 统一发版**（另开一窗，不在这里）。
>
> **来历：** Ocean 2026-10-28：「全部做完之后提交，下一步我会在 Windows 电脑上做真机验证，用 Claude code 验收，把 taskbook 写好，验收通过就是 win+mac 统一发版」
> （HANDOFF §9.2 第 241 条）。P12（发版二之前的扫尾）10-28 验收第一轮改完、已归档。
> 上一次 Windows 验证 P9W（10-20）在一台学校电脑上被安全软件拦住，§6 那 43 条**一条都没测**；之后 P9X 修了 Windows 上测试编不过等问题（GitHub 的 Windows 机器上全绿）。
> **这一次是 P1 – P12 的 Windows 部分第一次在一台真 Windows 上装起来用。**
>
> **边界：**
> - **只验，不发。** 不建 Release、不上传安装包、不打 tag、不改版本号（仍是 0.7.4，发版那一窗才改）、不改 `.github/workflows/`。
> - **默认不改产品代码。** 发现问题记 DISCOVERED（HANDOFF §9.9，格式照那里已有的条目），验完给 Ocean 一张清单挑。
>   例外：**编译不过、测试在 Windows 上红** —— 停下，把报错原文给 Ocean，问要不要在这一窗修（只修 `cfg(windows)` 那几行 / 只在 Windows 才走的那条路）。§4 第 2 条 Ocean 选「当场修」时照他说的。
> - 不加依赖（`cargo tree` 那条照旧空，§3 W-0）、CSP 不改、**不改库结构（库 v37）**。
> - 不碰实验线（`TASKBOOK-STAGE0A-*`、`CODEX-HANDOFF-*`、`docs/README.md` 里研究那几行）；**不动 `docs/EXECUTION_POLICY.md`**。
> - ⛔ 不加 LICENSE、README 不写许可一节；不引 95/5 那个数；MemTrapBench 的百分数不进讲 Spool 的句子。
> - **提交照 `CLAUDE.md` §5：任何地方都不写 AI 署名**（没有 `Co-Authored-By`、没有「Generated with」）—— Claude Code 的默认模板会建议加，**不许加**；提交说明里也别写「用什么工具执行的」（写「在 Ocean 的 Windows 电脑上」）。
>   每次提交后跑 `CLAUDE.md` §5 那条自查 grep；命中的若只是产品内容（来源识别里的 claude、`CLAUDE.md` 这个文件名、引擎名），用窄一点的 grep（`co-authored|🤖|generated with|anthropic`）复核，别为了让它变绿改代码。
> - **推送先问 Ocean。** 仓库是公开的。

---

## 0. 开工前的环境（拉代码之前就要做的那一条在最前面）

1. ⚠️ **`git config --global core.autocrlf false`，然后再 clone / pull。** Git for Windows 默认把文本文件改成 CRLF，而这里有测试逐字节比对提交进来的文件（跨语言 pack 的 golden、官网中文页是否同步）—— 一个 `\r` 就红，和 Windows 毫无关系。
   这台机器上的工作区要是在 autocrlf=true 时 clone 的，删了重 clone。核：`git ls-files --eol src/lib/pack | head` 工作区那一列是 `w/lf`。
2. 工具：Git for Windows、Node 22（`node:sqlite` 要 22.5+）、Rust stable（rustup，`x86_64-pc-windows-msvc`）、Visual Studio 2022 Build Tools 的「使用 C++ 的桌面开发」（MSVC 链接器 + Windows SDK）、WebView2 运行时（Win11 自带）。NSIS 不用装，打包时 Tauri 自己下。
3. 代码：`git log -1` 是推这份任务书的那一笔或更新。**核代码和 Mac 上装的那一版一样**：`git diff --stat 33a2390 HEAD -- src src-tauri package.json package-lock.json` 应该是空的（之后只改过文档）。不空就停下问。
4. Claude Code 在 Windows 上的 Bash 是 Git Bash：有 `grep`、`sha256sum`，**多半没有 `sqlite3`** —— 读库、`VACUUM INTO` 都用 `node:sqlite`（附录 A）。
5. 这台机器上**没有** Mac 那边的记忆文件。这份任务书把用得上的都写进来了；别的以 `CLAUDE.md`、`docs/HANDOFF-2026-09-04.md` 为准。

## 1. 开工前读

1. `CLAUDE.md`（会自动载入）、`docs/EXECUTION_POLICY.md`（只读）。
2. `docs/HANDOFF-2026-09-04.md`：首屏 + §9.2 第 73、177、231、237 – 241 条 + §9.3（P9W、P9X、P13、发版二那几行）+ §9.8 + §9.9 的 `DISCOVERED-20261020-1` – `-9`、`-20261025-9`、`-20261028-1`。
3. `docs/archive/product-taskbooks/TASKBOOK-P9W-WINDOWS-V070-VERIFY-2026-10-20.md` —— 上一次的做法、附录 A / B（读库、在副本上跑真迁移、MCP 探针，这一次照用，数字按 §2 改）、§7 回执里撞过的坑。
4. `docs/archive/product-taskbooks/TASKBOOK-P9X-WINDOWS-TEST-FIXES-2026-10-20.md` §6 第 3 条 —— 当时说「等真机再看」的三件（下面 §6 里都有）。
5. 发版说明 `docs/RELEASE_NOTES_v0.7.1.md` – `v0.7.4.md` 和 `docs/archive/product-taskbooks/` 里 P9S、P9T、P9U、P9V、P9Y、P10、P12 的任务书 —— §6 F、H、J 里那些新功能是什么、Mac 上怎么验的（只在不明白某一条时去查）。

## 2. 现在（2026-10-28 对着 `33a2390` 核过）

| 项 | 现在 |
|---|---|
| 代码 | `main`，代码和 Mac 上 10-28 14:51 装的那一版一样（`33a2390`）；版本号三处都是 0.7.4 |
| Windows 上编过没有 | GitHub 的 Windows 机器上（P9X，10-20，`windows-build` 手动触发）：vitest 1176 · cargo 200 过 · 0 红 · 4 忽略 · 安装包打得出来。**P9S – P12 的 Windows 部分从没在 Windows 上编过、跑过**；真机上从没装起来用过 |
| Mac 上的测试基线（`33a2390`） | `npx tsc -b` 干净 · vitest **131 个文件 / 1256 条** · cargo `--lib` **291 过 · 14 ignored** · sidecar **31** · `i18n-check` `(none missing)` · `--dead` **0** · `cargo tree` 那条空。Windows 上 cargo 的条数会不一样（有 `cfg` 只在一边编的测试），**记真实数字，红的逐条记** |
| Windows 专有的代码 | `src-tauri/src/`：`double_tap_win.rs`（双击 Ctrl，Raw Input；Win+PrtScn 记时间）、`win32.rs`（前台窗口标题 = 来源、`GetLastInputInfo` = 专注时间）、`capture.rs`、`images.rs`（截图文件夹 `FOLDERID_Screenshots`、剪贴板里的图片文件）、`file_identity.rs`（卷号 + 文件号：项目文件、连接的文件夹挪了能跟上）、`overlay.rs`、`systime.rs`、`mcp.rs`（`%APPDATA%` 下的库和各客户端配置、路径闸去 `\\?\`）、`lib.rs`（托盘、主窗按屏幕大小开） |
| Windows 上故意没有的 | **本机 AI 引擎**（Claude Code / Codex 跑周回顾、跟进、压缩、过期检测）—— `engine.rs` `detect()` 在 Windows 直接返回没有（停不掉整棵进程树）⇒ Windows 上 AI 功能**只有 API 那一条路**；**长按 ⌥ 写笔记**只有 Mac；浏览器自动化权限那一节；HEIC 转 JPEG 靠 Mac 的 `sips` |
| API key 在哪 | Mac 是钥匙串；**Windows 是 app 配置目录里一个叫 `api-key` 的文件**（`%APPDATA%\com.oceanjin.spool\api-key`），不进 settings、不跟着导出走 |
| 库在哪 | `%APPDATA%\com.oceanjin.spool\`（Roaming）：`spool.db`、`settings.json`、`mcp-clients.json`、`focus.json`、`drafts.json`、`knit.json`、`stale.json`、`ai-seen.json`、`image-cache\`、`folder-backups\`。App 和 `--mcp` 读同一个 |
| 库版本 | **v37**。Windows 上最后发过的是 **v0.6.1（库 v23）**，之后 Windows 一版都没发过（官网 Windows 按钮还指着 v0.6.1）⇒ Windows 老用户升级要走 **14 步**（v23 → v37），全是加可空列 / 加表 / 加索引；升级前 app 自动在库旁边留 `spool.pre-migration-v23-….db` |
| MCP（Mac 上 `--mcp` 探针连库副本数的） | 普通连接 **28** 个工具（只读 15、写 13）；`--engine-run` 26（Windows 上没有引擎，这个模式用不到，数一下无妨） |
| 安装包 | 不签名（Ocean 08-15 定的）⇒ SmartScreen 拦一下是预期；NSIS `currentUser` 安装（不要管理员）；WebView2 联网引导安装 |
| 还没在 Windows 真机上验过的（HANDOFF） | P9X 修的 `-4`（pack / 导出里图片路径改成 `C:/…` 正斜杠）、`-7`（AI 可读的文件挪进 AppData 不跟、停下来问）、`-2`（测试 exe 的清单开关不影响发出去的 exe）；`DISCOVERED-20261020-9`（路径闸消息不带 `\\?\`，P12-1 修了）；`DISCOVERED-20261025-9`（连接的文件夹挪了能不能跟过去）；P9B-1（系统切深浅色 Spool 跟着变、标题栏是不是跟着变） |

## 3. 步骤（按顺序；每一步做完再下一步）

### W-0 · 环境 + 基线（不改任何东西）

- §0 那几条核完；`node -v`、`rustc -V`、`cargo -V` 记进回执。
- 基线，日志进文件（别用 `| tail` 吞退出码）：`npx tsc -b`；`npx vitest run`；`npm run build:sidecar`（Rust 测试要它）；`cd src-tauri && SPOOL_TEST_CC6_MANIFEST=1 cargo test --lib`（Mac 基线 291 是 `--lib` 的数；想和 CI 对，再跑一次不带 `--lib`）；
  `cargo test --manifest-path src-tauri/sidecar/Cargo.toml`；`node scripts/i18n-check.mjs` 和 `--dead`；
  `cargo tree --manifest-path src-tauri/Cargo.toml -e normal | grep -iE "ureq|rustls|reqwest|hyper|openssl"`（必须空）。
- ⚠️ `SPOOL_TEST_CC6_MANIFEST=1` 不能省：Windows 上的 Rust 测试 exe 没有 Common Controls v6 清单会在加载时死掉（0xc0000139）；这个变量只在测试时给测试 exe 加清单，打安装包那一步不设（`.github/workflows/windows-build.yml` 就是这么做的）。
- 编不过 / 测试红 ⇒ §5 停下问。

### W-1 · 打安装包（不签名）

- `npx tauri build --bundles nsis`（`beforeBuildCommand` 会顺带把 `spool-ai` 编成 `spool-ai-x86_64-pc-windows-msvc.exe` 打进去）。⛔ 不设任何签名环境变量。
- 产物 `src-tauri/target/release/bundle/nsis/Spool_0.7.4_x64-setup.exe`：记大小、`sha256sum`。装之前不动它。

### W-2 · 升级验证（先保护 Ocean 的数据）

- 照 §4 第 1 条的答复走：
  - **这台机器上有 Spool、库里有他在乎的东西**：先把整个 `%APPDATA%\com.oceanjin.spool\` 拷一份到桌面（带日期的文件夹名）；再照 P9W 附录 A 用**副本**跑一遍真迁移（它现在的版本 → v37）：断言 `fresh === false`、每张老表条数和每一列 `SUM(LENGTH)` 不变、新表空。过了再装。
  - **有 Spool 但只是测试数据 / 没装过**：推荐先装 GitHub 上的 **v0.6.1**（`https://github.com/KIM-ocean-HZ/spool/releases/download/v0.6.1/Spool-windows-x64-setup.exe`），写几块（文字、一个挂文件、一个更正关系），数一下（附录 A），**再用 W-1 的包覆盖安装** —— 这就是 Windows 老用户真实会走的路（14 步迁移 + 安装器原地升级）。
- 装完核：库版本 37、`integrity_check` ok、老表条数和正文长度和装前一样、库旁边多了 `spool.pre-migration-v23-….db`（或它原来那个版本号）。
- ⛔ **任何时候都别让旧版本的 Spool 打开新版本的库**（Mac 上 05-29 抹过一次真库，就是版本不一致走了重建分支）；`npm run tauri dev` 起来的也是同一个 identifier、开的就是真库 —— 这一窗**不用 dev 模式**。

### W-3 · 装上、起来

- 双击安装包；SmartScreen →「更多信息」→「仍要运行」。装完开 Spool：不白屏。版本看 Windows「设置 → 应用 → 已安装的应用」里 Spool 那一行是 0.7.4（Spool 界面里没有显示版本的地方；W-5 的 `serverInfo` 也会报）。
- ⛔ **换装 / 重装 / 退出 Spool 之前先问 Ocean 有没有没点「完成」的字**（`drafts.json` 会存，但照旧问）。
- 要看运行中 Spool 的日志（双击 Ctrl 每一下、截图组合键都会记一行）：先从托盘退出，再从终端起 `spool.exe`，stdout 和 stderr 都重定向到一个文件。Windows 上捕捉不要授权，从终端起不影响结果。

### W-4 · 和 Ocean 一起走 §6 那张单

- 一条一条来，每条记「过 / 不过 / 没测（为什么）」+ 不过时他看到了什么（截图、原话）。要真手指的让 Ocean 做，你看结果、读库（附录 A，读真库只读、或者读副本）、读日志。
- ⛔ 不往 Ocean 的真文件夹里写东西来「试」：§6 J 那几条用一个新建的空文件夹。

### W-5 · MCP（你自己在终端跑，不用 Ocean）

- 照 P9W 附录 B：用**库的副本** + `SPOOL_DATA_DIR`（旁边放 `{"mcpEnabled":true}` 的 `settings.json`）起 `spool.exe --mcp`（装好的那个，一般在 `%LOCALAPPDATA%\Spool\`；或 `src-tauri/target/release/spool.exe`）。
  ⛔ 别直接连真库目录：探针 `initialize` 报的客户端名会被记进 `mcp-clients.json`，设置里就多出一个假客户端。
  ⛔ 副本里要是有连着的文件夹（`folders` 表有行），那些路径指着**真文件夹** —— 探针只读，不会写；但别在副本上跑任何会刷新 SPOOL.md 的东西。
- 要的结果：`serverInfo.version` 0.7.4；普通 28（只读 15、写 13）；`--engine-run` 26；`get_block_images` 对一块有图的块回 `image/png`（或 jpeg）；对一份**没升级过的老库副本**（v23）调 `list_threads` 被拒，说要先打开 Spool 升级。
- 路径闸（P12-1）：对副本调 `propose_attach_file`，路径填 `%APPDATA%` 下随便一个真文件（完整路径）⇒ 被拒，**拒绝消息里的目录是 `C:\Users\…\AppData`，没有 `\\?\`**；再填 `C:\Windows\` 下一个文件 ⇒ 拒绝消息里是 `C:\Windows`。原话记进回执。

### W-6 · 记录 + 收尾

- 回执写 §7（数字、命令、结果、§6 每一条的结论）。
- HANDOFF：§9.2 记 Ocean 这一窗的答复（从第 242 条往下编）；§9.3 P13 那一行改状态；§9.8 唯一下一步；每个问题一条 `DISCOVERED-YYYYMMDD-N`（§9.9 末尾，格式照抄那里的）；验过的旧条目（上面 §2 最后一行那几条）改状态。
  这台机器上是新 clone，一般没有别的窗口没提交的改动；`git status` 先看一眼，有的话只暂存你自己的（Claude Code 里用不了 `git add -p`：拿 `git diff` 生成补丁、删掉别人的 hunk、`git apply --cached`；⛔ 别用 `git stash`）。
- 任务书做完移进 `docs/archive/product-taskbooks/`（`git mv`），`docs/README.md` 入口那一行跟着改。
- 提交后跑 `CLAUDE.md` §5 的自查；**推送先问 Ocean**。
- 最后问 Ocean：问题清单里哪些要修、在哪一窗修（Mac 上修、还是这台上修）；然后才是发版二。

## 4. 开工先问 Ocean（答完再动手；每个选项都写清好处 / 代价）

1. **这台 Windows 上现在有没有 Spool、库里有没有你在乎的东西？**
   - 有，是真东西：先整份备份、在副本上跑迁移，过了再装（W-2 第一种）。好处：一点风险都不冒。代价：多十几分钟。
   - 有，但只是测试 / 没装过：装 v0.6.1 → 写几块 → 用新包覆盖（W-2 第二种）。好处：验的就是老用户真实的升级路。代价：要装两次。
2. **验的时候发现问题怎么办？**
   - 甲（推荐）：这一窗只记，验完给你一张清单挑。好处：不在没验完的时候改东西（改了要重打包重验）。代价：修要等下一窗。
   - 乙：小的（文案、明显一两行）当场修，修完重打包重验。好处：一窗做完。代价：这一窗变长；每修一次重编（Windows 上一次十几分钟）；改的代码 Mac 上也要再验。
3. **AI 那一半测不测？**（Windows 上只有 API 这一条路）会花你那家 API 账户里的钱（周回顾一次几分钱人民币）。
   - 测 DeepSeek：周回顾（结构化卡片 + 「周回顾更新了」小卡）、过期检测各一次，查余额。DeepSeek 不能联网 ⇒ 跟进那一项照旧锁着。
   - 测一家能联网的（OpenAI / Claude / Gemini / Kimi / 通义）：上面那些之外，跟进也能跑一次。代价：那家的钱。
   - 不测：只看锁着的入口和「活动」那一块。
   key 只在 Spool 设置里粘，⛔ 别发进对话、别写进任何文件或提交。
4. **首启（全新用户第一次打开）要不要在这台机器上验？** 办法：把 `%APPDATA%\com.oceanjin.spool` 临时改名 → 打开 Spool（会建一个全新的库、出现教程和示例项目）→ 看完关掉 → 删掉新建的那个、把原来的改回来。
   - 验：Windows 上首启只有这样才验得到。代价：要小心改回来（我会一步一步说）。
   - 不验：留到发版那一窗之后。
5. **Windows 上装了哪些 AI 客户端？**（Claude Desktop / Claude Code / Codex / Cursor / VS Code……）—— §6 G 用。

## 5. 什么时候停下来问

- `git diff --stat 33a2390 HEAD -- src src-tauri package.json package-lock.json` 不空。
- 编译不过、`tsc` / vitest / cargo 在 Windows 上红 —— 把报错原文给 Ocean，问要不要在这一窗修。
- 迁移验证任何一张表条数或正文长度对不上 —— 停，这是数据完整性。
- 安装后打不开 / 白屏 / 库版本不对 —— 停，先确认数据还在（备份在桌面），再看日志（白屏：右键 → 检查 → Console 的红字）。
- 任何要改产品代码、改库结构、推送、对外的动作。

## 6. 和 Ocean 一起走的单（大白话，一步一个动作；每条记「过 / 不过 / 没测」）

> 念给 Ocean 的时候：先说这条要他做什么，再说看到什么算对。Windows 上「⌘」都是 Ctrl、「⌥」都是 Alt；捕捉手势是**双击 Ctrl**。他的界面是中文，按钮名照中文说。

**A. 装和开**
1. ☐ 双击安装包，SmartScreen 点「更多信息」→「仍要运行」，一路下一步，不要管理员密码。
2. ☐ 打开 Spool：不白屏；主窗大小合适（不超出屏幕、四周留一点缝）。
3. ☐ Windows「设置 → 应用 → 已安装的应用」里 Spool 是 0.7.4；界面语言跟着设置里选的（中文 / English）。
4. ☐ 右下角托盘有 Spool 图标（彩色，看得见）；右键有菜单、有「退出 Spool」；点 ✕ 窗口藏起来、app 还在托盘；左键点托盘图标窗口回来。
5. ☐ 升级装的：原来的项目、块、文件都在（W-2 已经数过，这里用眼睛再看一遍）。

**B. 捕捉（双击 Ctrl）**
6. ☐ 浏览器里选一段字 Ctrl+C，然后双击 Ctrl：弹卡片，字对；「来源」是那个窗口的标题（浏览器就是网页标题）。开两个浏览器窗口，在后面那个里复制再捕，来源是你复制的那个窗口。
7. ☐ 卡片弹出来直接能打字（批注），回车存；卡片底栏：撤销、改投到别的项目、完成；「固定窗口」按了之后卡片不自己消失、点外面也不收。
8. ☐ 截图：Win+Shift+S 截一块（进剪贴板）→ 双击 Ctrl：存成一块**图片**，卡片上有小图。
9. ☐ Win+PrtScn（整屏存进「图片\屏幕截图」文件夹）→ 10 秒内双击 Ctrl：存的是**这张截图**（P9H-7 写的，**从没在真机上跑过**）。
10. ☐ 资源管理器里选中一张 .png / .jpg，Ctrl+C → 双击 Ctrl：存进来的是**图片本身**，不是文件名。
11. ☐ 主窗里往输入框粘贴一张图、或者拖一张图进来：进的是你正在写的这一块。
12. ☐ （已知 Windows 没有）长按 Ctrl 写笔记 —— 不测；「长按没反应」是预期。

**C. 图片**
13. ☐ 块里的图：单击看大图、左右翻；双击进编辑面板，图前图后能写字、能写注释、能删图（点完成才生效）。
14. ☐ 有图的块合并、移到别的项目、复制到别的项目：图都跟着走；Ctrl+Z 撤回后图回来。
15. ☐ 打包（Ctrl+Shift+P）带图的项目：pack 里图那一行是 `![注释](C:/Users/…)` **正斜杠**（P9X `-4`），复制路径在资源管理器里打得开。

**D. 项目文件**
16. ☐ 右栏「项目文件」加一个文件（按钮 / 从资源管理器拖进来）：列出来、新的在上、带时间；**默认 AI 可读**的开关是开的。
17. ☐ 块上的回形针把文件挂到这一块：右栏标块号；删这块时问文件去不去；撤销后放回原处。
18. ☐ 资源管理器里把那个文件**挪到同一个盘的另一个文件夹** → 回到 Spool：标「已跟到新位置」；把它**删掉** → 标「找不到了」。
19. ☐ 把一个「AI 可读」的项目文件挪进 `C:\Users\<你>\AppData\` 下随便一个文件夹 → 回到 Spool：显示「找到了，但没跟过去」那一种，点「是这个」才跟（P9X `-7`）。看完挪回原处。
20. ☐ 点文件名用默认程序打开（pdf / docx 各试一个）。
21. ☐ 「改过」重启之后还在（P12-2）：挂一个 .md / .txt，用记事本改一个字保存 → 回到 Spool 打开那个项目，右栏那一行旁边出现「改过」→ 托盘「退出 Spool」再打开 →「改过」还在 → 点文件名打开它 → 回到 Spool，「改过」没了。

**E. 打包 / 导出**
22. ☐ 单个项目「导出 .md」：存储对话框、存出来的 .md 打得开。
23. ☐ 导出成文件夹（带文件和图片）：导出的文件夹里文件和图都在、.md 里的相对链接**在 Windows 上点得开**（记斜杠方向）。
24. ☐ 工作区导出成文件夹：`INDEX.md` + 每个项目一个 .md，带文件和图片那张清单。

**F. 界面**
25. ☐ 深浅色（P9B-1）：设置里「跟随系统 / 浅色 / 深色」；Windows 设置里切深色，主窗和捕捉卡片都跟着变；**窗口标题栏**跟不跟着变也看一眼（记原样）。
26. ☐ 左栏织布：自己写 / 捕捉一块，针数 +1（AI 写的不算）；点左栏那一块，柜子从底部滑上来；兑换、撤销。`knit.json` 有记录。
27. ☐ 专注时间：左栏专注时钟在走；**15 分钟不碰键盘鼠标**之后停（`GetLastInputInfo`，Windows 专有）；周回顾「活动」里今天那根柱子对得上。
28. ☐ 撤销 / 重做：Ctrl+Z 撤、**Ctrl+Shift+Z 或 Ctrl+Y** 重做。
29. ☐ 没写完的字不丢：编辑面板里写一段不点完成 → 托盘「退出 Spool」→ 再开：提示上次没点完成的块，「去看」跳过去、字在。
30. ☐ 左栏：工作区默认折叠、只展开当前项目那一支；单击工作区名打开工作区页面，双击改名；项目全完成的工作区进底部「归档」。
31. ☐ **工作区页面顶上的大标题双击也能改名**（P12，10-28 新加）：回车 / 点别处存；左栏的名字跟着变；改成同一层已有的名字 → 存成「名字 2」并提示一句。
32. ☐ 项目里查找（Ctrl+F）：在本项目里按时间跨块走、首尾相接。
33. ☐ 「复制到…」先查重，「删掉原块」变成移动，Ctrl+Z 一次撤回。
34. ☐ 私密项目：右键「设为私密…」→ 项目上有标记、右栏不说 AI 读得到；Spool 自己的 AI 入口在这个项目里关着。
35. ☐ 休息提醒（时间调成最短那一档）：到点弹出，盖在别的窗口上面；点一下能提前结束。
36. ☐ AI 写进来的项目亮绿点（P9S）：让一个 MCP 客户端往某个项目写一块（G 组顺带）→ 左栏那个项目亮绿点；点开之后绿点消失。

**G. MCP（要 Ocean 装着的客户端）**
37. ☐ 设置 → MCP：装了的客户端显示「未配置」，没装的显示「未安装」（装了却说未安装 = Windows 路径猜错了，记是哪个）。
38. ☐ 一键接入 →「已配置」；**完全退出客户端再打开**。
39. ☐ 在客户端里问「我 Spool 里有哪些项目」：列得出来；**私密项目不在里面**。
40. ☐ 「把『这是 Windows 上 0.7.4 的测试』存进 XX 项目」：Spool 里看得到这一块，标着是哪个 AI 写的。
41. ☐ 让 AI「看一下 #n 那一块里的图」（挑一块有图的）：AI 说得出图上是什么。
42. ☐ 让 AI 提议一件要你点头的事（「这一块被那一块取代了」或「把 XX 项目拆成两个子项目」）：Spool 待审里冒出一张卡（Spool 在后台也会几秒内自己出来）；点同意后生效，Ctrl+Z 能整个撤回。

**H. AI（§4 第 3 条答「测」才做；Windows 上只有 API）**
43. ☐ 设置 →「AI 引擎」：本机 CLI 那一块在 Windows 上没有 / 写着用不了（预期）；API 那一块粘 key，自动认出是哪家、模型列表拉得出来；「查一下」余额（DeepSeek 有）。
44. ☐ 周回顾选 API 跑一次：一个项目一张卡（做了什么 / 卡在哪 / 信号 / 建议动作），依据原话照原文；点一个「加一条跟进」→ 生效，Ctrl+Z 撤回。
45. ☐ 周回顾跑的时候切到别的窗口：跑完在捕捉卡的位置弹「周回顾更新了」小卡，不抢键盘，8 秒自己收；点它主窗回来、停在周回顾页。
46. ☐ 设置里语言切 English 再跑一次周回顾：内容是英文、依据原话和项目名照原文（P12-5）。看完切回中文。
47. ☐ 过期检测：在一个有几个项目的工作区里「查整个工作区」：跑得完、结果能点（取代 / 不动）。
48. ☐ （选了能联网的那家才做）跟进：右栏跟进面板里「查一下」跑一次，结果标出来、能关。

**J. 连接文件夹（P9Y / P12；⛔ 用一个新建的空文件夹，别用真仓库）**
49. ☐ 桌面新建空文件夹 `spool-test`（里面 `git init` 一下，好验 exclude）；新建一个工作区「Win 测试」并在里面建一个项目；项目右栏「连接文件夹…」选 `spool-test`，一路「下一步」→「连接」（「让 AI 读到它」那一步勾上 CLAUDE.md）。看：`spool-test` 里有 `SPOOL.md`，里面写着这个工作区和项目、**路径是 Windows 的写法**；`.git\info\exclude` 多一行 `/SPOOL.md`；`CLAUDE.md` 多一行 `@SPOOL.md`。
50. ☐ 把 `spool-test` 整个挪到另一个文件夹（同一个盘）→ 回到 Spool 打开「Win 测试」工作区页面：「连接的文件夹」跟到了新位置（`DISCOVERED-20261025-9`）。
51. ☐ 删除工作区「Win 测试」→ `SPOOL.md` 还在（这时 Ctrl+Z 还能撤回）→ 托盘「退出 Spool」再打开，等 5 秒 →`SPOOL.md` 没了，`CLAUDE.md` 里那一行、exclude 那一行也没了（P12-2）。之后把 `spool-test` 删掉。

**I. 首启（§4 第 4 条答「验」才做）**
52. ☐ 临时改名之后第一次打开：建了新库、出现「欢迎使用 Spool」教程和示例项目；教程里说的是 **Ctrl** 的说法（不是 ⌥ / 输入监听权限）；Ctrl+Shift+P 打包示例项目有东西；**库旁边没有 `pre-migration-v0` 空快照**（P9X `-5`）。看完照步骤改回来，原来的库都在。

## 7. 回执（执行窗填写）

（W-0 基线数字、W-1 安装包大小 / 哈希、W-2 迁移前后条数、W-5 MCP 数字和路径闸原话、§6 每一条「过 / 不过 / 没测」、新发现编号、提交号。）

---

附录：读库 / 在副本上跑真迁移、MCP 探针 —— 照 `docs/archive/product-taskbooks/TASKBOOK-P9W-WINDOWS-V070-VERIFY-2026-10-20.md` 的附录 A、B；那里写的库版本 35、工具数 26 / 25 换成这里 §2 的 **37、28 / 26**。
