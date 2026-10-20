# 产品任务书 P9W —— Windows 上验证 v0.7.0（只验，不发）

> **状态：ACTIVE**（2026-10-20 下发）—— 下一窗执行，**在 Ocean 的 Windows 电脑上**，用 Windows 版 VS Code 里的 Claude Code。
> 开工先做 §0（环境），再问 Ocean §4 的几件，答完再动手。
>
> **唯一交付：** 用 `main`（代码 = Mac 上发出去的 v0.7.0）在 Windows 上**第一次**编译、跑全套测试、打出 NSIS 安装包、装上去，
> 照 §6 和 Ocean 一起把 v0.7.0 在 Windows 上走一遍；每一条结果、每一个问题记下来（§7 回执 + HANDOFF）。
>
> **来历：** Ocean 2026-10-20：「下一个窗口我需要做win版v0.7的验证，我会在win的vscode上使用Claude code验证spool的v0.7，
> 写好taskbook推送，我在github上重新pull项目」（HANDOFF §9.2 第 164 条，**owner interruption**）。
> 发版一（Mac v0.7.0）10-19 已发布、等 Ocean 验收；这一窗验完回到原来的顺序：P9R 验收 → P10（正文 HANDOFF §9.7）。
>
> **边界：**
> - **只验，不发。** 不建 Release、不上传安装包、不打 tag、不改 `.github/workflows/windows-build.yml` 的触发分支。
>   要不要把 Windows 也发成 v0.7.0（这会改第 73 条「Windows 等 P11 之后和 Mac 一起发」）—— 验完问 Ocean，不自己定。
> - **默认不改产品代码。** 发现问题记 DISCOVERED（HANDOFF §9.9，格式照那里已有的条目），验完把清单给 Ocean 挑。
>   例外只有一种：**编译不过、或测试在 Windows 上红** —— 停下，把报错原文给 Ocean，问要不要在这一窗修（只修 `cfg(windows)` 那几行 / 只在 Windows 才走的那条路）。
> - 不加依赖（`cargo tree` 那条必须照旧是空的，§3 W-0）、CSP 不改、不改库结构（库 v35）。
> - 不碰实验线（`TASKBOOK-STAGE0A-*`、`CODEX-HANDOFF-*`、`docs/README.md` 里研究那几行）；**不动 `docs/EXECUTION_POLICY.md`**。
> - ⛔ 不加 LICENSE、README 不写许可一节；不引 95/5 那个数；MemTrapBench 的百分数不进讲 Spool 的句子。
> - **提交照 `CLAUDE.md` §5：任何地方都不写 AI 署名**（没有 `Co-Authored-By`、没有「Generated with」）—— Claude Code 的默认模板会建议加，**不许加**。
>   每次提交后跑 `CLAUDE.md` §5 那条自查 grep；命中的若只是产品内容里的 claude（比如来源识别），用窄一点的 grep 复核，别为了让它变绿改代码。
> - **推送先问 Ocean。** 仓库是公开的。

---

## 0. 开工前的环境（Ocean 拉代码之前就要做的那一条在最前面）

1. ⚠️ **`git config --global core.autocrlf false`，然后再 clone / pull。**
   Git for Windows 默认把文本文件改成 CRLF，而这里有两套测试逐字节比对提交进来的文件（跨语言 pack 的 golden、官网中文页 build 是否同步）——
   一个 `\r` 就红，和 Windows 毫无关系。**如果这台机器上的工作区是在 autocrlf=true 时 clone 的，删了重 clone**（或 `git rm --cached -r . && git reset --hard` 重新检出）。
   核：`git ls-files --eol src/lib/pack | head` 里工作区那一列应是 `w/lf`。
2. 工具：Git for Windows、Node 22（CI 用的 22；`node:sqlite` 要 22.5+）、Rust stable（rustup，`x86_64-pc-windows-msvc`）、
   Visual Studio 2022 Build Tools 的「使用 C++ 的桌面开发」（MSVC 链接器 + Windows SDK）、WebView2 运行时（Win11 自带）。NSIS 不用装，打包时 Tauri 自己下。
3. 代码：`git log -1` 应是推这份任务书的那一笔或更新。**核代码和 Mac 发出去的 v0.7.0 一样**：
   `git diff --stat v0.7.0 HEAD -- src src-tauri package.json package-lock.json` 应该是空的（之后只改过文档）。不空就停下问。
4. Claude Code 在 Windows 上的 Bash 是 Git Bash：有 `grep`、`sha256sum`，**多半没有 `sqlite3`** —— 读库、`VACUUM INTO` 都用 `node:sqlite`（附录 A）。
5. 这台机器上**没有** Mac 那边的记忆文件（Claude 的 memory 是按机器存的）。这份任务书把用得上的都写进来了；别的以 `CLAUDE.md`、`docs/HANDOFF-2026-09-04.md` 为准。

## 1. 开工前读

1. `CLAUDE.md`（会自动载入）、`docs/EXECUTION_POLICY.md`（只读）。
2. `docs/HANDOFF-2026-09-04.md`：首屏 + §9.2 第 73、152、160 – 164 条 + §9.3 + §9.8 + §9.9 的 `DISCOVERED-20261010-9`、`-20261014-3`、`-20261018-3`、`-20261018-4`。
3. `docs/RELEASE_NOTES_v0.7.0.md` —— v0.7.0 有什么（§6 那张单就是照它排的）。
4. `docs/WINDOWS-CHECK.md` —— 08-15 – 08-18 前四轮 Windows 验收（第三、四部分的验法、「这些我知道是不行的」那一节）。⚠️ 那时候还没有双击 Ctrl、没有 P1 – P9H，
   里面「Ctrl+Alt+Space 出厂就绑好」那几条已经过期（v0.5.0 起捕捉是**双击 Ctrl**，两个平台都不出厂绑组合键）。
5. `docs/archive/product-taskbooks/TASKBOOK-P9R-RELEASE-ONE-MAC-V070-2026-10-18.md` §7 —— Mac 那边怎么验的、数字是多少（拿来对照）。

## 2. 现在（2026-10-20 对着 `9a609ee` 核过）

| 项 | 现在 |
|---|---|
| 代码 | `main` 上 v0.7.0 tag → `20cebca`；之后只有文档提交。版本号三处都是 0.7.0 |
| Windows 上编过没有 | **P1 – P9H 的 Windows 部分一次都没在 Windows 上编过、跑过。** `windows-port` 分支停在 `ba8c394`（08-19），是 `main` 的祖先、落后 329 笔；CI（`windows-build.yml`）只在推 `windows-port` 或手动触发时跑。P9 的 Windows 那一半只在单开的 crate 里做过类型检查；P9H-7 的 Win+PrtScn 是照着 `windows-sys 0.61.2` 源码盲写的 |
| Windows 专有的代码 | `src-tauri/src/`：`double_tap_win.rs`（双击 Ctrl，Raw Input，不是键盘钩子；Win+PrtScn 记时间）、`win32.rs`（前台窗口标题 = 来源、`GetLastInputInfo` = 专注时间）、`capture.rs`（17 处：关窗进托盘提示、用默认程序打开文件……）、`images.rs`（截图文件夹 `FOLDERID_Screenshots`、剪贴板里的图片文件）、`file_identity.rs`（卷号 + 文件号，文件挪了能跟上）、`overlay.rs`、`systime.rs`、`mcp.rs`（`%APPDATA%` 下的库和各客户端配置）、`lib.rs`（托盘、主窗按屏幕大小开） |
| Windows 上故意没有的 | 本机 AI 引擎（跟进的「联网搜索 / 让 AI 看看还缺什么」、用 claude / codex 跑周回顾）—— `engine.rs` `detect()` 在 Windows 直接返回没有（停不掉整棵进程树，`DISCOVERED-20261014-3`）；**长按 ⌥ 写笔记**只有 Mac（`double_tap.rs`），Windows 没有长按；浏览器自动化权限那一节；HEIC 转 JPEG 靠 Mac 的 `sips` |
| 库在哪 | `%APPDATA%\com.oceanjin.spool\`（Roaming）：`spool.db`、`settings.json`、`mcp-clients.json`、`focus.json`、`drafts.json`、`knit.json`、`image-cache\`。App 和 `--mcp` 读同一个 |
| 库版本 | v0.7.0 = **v35**。Windows 上最后发过的是 **v0.6.1（库 v23）** ⇒ Windows 老用户升级要走 **12 步**（v23 → v35），比 Mac 多一步（v23 → v24：块多两个可空列）。12 步全是只加不改（加可空列 / 加表 / 加索引），升级前 app 自动在库旁边留 `spool.pre-migration-v23-….db` |
| MCP（Mac 发版二进制上数的） | 普通连接 **26** 个工具（只读 14、写 12）；`--engine-run` 25 个（少 `propose_split`；Windows 上没有引擎，这个模式不会被用到，但数一下无妨） |
| Mac 上的测试基线（`a78955b` / `20cebca`） | `npx tsc -b` 干净 · vitest **113 个文件 / 1173 条**（`knitStore.test.ts` 撤销那条偶发红，`DISCOVERED-20261018-3`，同一毫秒的问题，不是 Windows 的事）· cargo **222 过 · 5 跳过** · sidecar 14 · `i18n-check` `(none missing)` · `--dead` 87 · `cargo tree` 那条空。Windows 上 cargo 的条数会不一样（有 `cfg` 只在一边编的测试），**记下真实数字，红的逐条记** |
| 安装包 | 不签名（Ocean 08-15 定的）⇒ SmartScreen 拦一下是预期；NSIS `currentUser` 安装（不要管理员）；WebView2 用联网引导安装 |
| 官网 / README 的 Windows 按钮 | 现在指向 **v0.6.1** 的安装包（10-19 定的，`DISCOVERED-20261018-4`）。这一窗**不改** |

## 3. 步骤（按顺序；每一步做完再下一步）

### W-0 · 环境 + 基线（不改任何东西）

- §0 那几条核完；`node -v`、`rustc -V`、`cargo -V` 记进回执。
- 基线，日志进文件（别用 `| tail` 吞退出码）：`npx tsc -b`；`npx vitest run`；`cargo test --manifest-path src-tauri/Cargo.toml`；
  `cargo test --manifest-path src-tauri/sidecar/Cargo.toml`；`node scripts/i18n-check.mjs` 和 `--dead`；
  `cargo tree --manifest-path src-tauri/Cargo.toml -e normal | grep -iE "ureq|rustls|reqwest|hyper|openssl"`（必须空）。
- **这是 P1 – P9H 的 Windows 代码第一次在 Windows 上编译。** 编不过 / 测试红 ⇒ §5 停下问。`knitStore` 那一条单独重跑几遍，偶发红就记「同 Mac」。

### W-1 · 打安装包（不签名）

- `npx tauri build --bundles nsis`（和 CI 一样；`beforeBuildCommand` 会顺带把 `spool-ai` 编成 `spool-ai-x86_64-pc-windows-msvc.exe` 打进去）。⛔ 不设任何签名环境变量。
- 产物 `src-tauri/target/release/bundle/nsis/Spool_0.7.0_x64-setup.exe`：记大小、`sha256sum`。装之前不动它。

### W-2 · 升级验证（先保护 Ocean 的数据）

- 照 §4 ① 的答复走：
  - **这台机器上有 Spool、库里有他在乎的东西**：先把整个 `%APPDATA%\com.oceanjin.spool\` 拷一份到桌面（带日期的文件夹名）；
    再照附录 A 用**副本**跑一遍真迁移（v23 或它现在的版本 → v35）：断言 `fresh === false`、每张老表条数和每一列 `SUM(LENGTH)` 不变、新表空。过了再装。
  - **有 Spool 但只是测试数据 / 没装过**：推荐先装 GitHub 上的 **v0.6.1**（`https://github.com/KIM-ocean-HZ/spool/releases/download/v0.6.1/Spool-windows-x64-setup.exe`），
    写几块（文字、一个挂文件、一个更正关系），数一下（附录 A 的读库办法），**再用 W-1 的包覆盖安装** —— 这就是 Windows 老用户真实会走的那条路（12 步迁移 + 安装器原地升级）。
- 装完核：库版本 35、`integrity_check` ok、老表条数和正文长度和装前一样、库旁边多了 `spool.pre-migration-v23-….db`。
- ⛔ **任何时候都别让旧版本的 Spool 打开新版本的库**（2026-05-29 Mac 上抹过一次真库，就是版本不一致走了重建分支）；`npm run tauri dev` 起来的也是同一个 identifier、开的就是真库 —— 这一窗**不用 dev 模式**。

### W-3 · 装上、起来

- 双击安装包；SmartScreen → 「更多信息」→「仍要运行」。装完开 Spool：不白屏。版本看 Windows「设置 → 应用 → 已安装的应用」里 Spool 那一行（或 `spool.exe` 右键属性 → 详细信息）是 0.7.0 —— Spool 界面里没有显示版本的地方；W-5 的 `serverInfo` 也会报。
- 换装 / 重装 / 退出 Spool **之前先问 Ocean 有没有没点「完成」的字**（`drafts.json` 会存，但照旧问）。

### W-4 · 和 Ocean 一起走 §6 那张单

- 一条一条来，每条记「过 / 不过 / 没测（为什么）」+ 不过时他看到了什么（截图、原话）。要真手指的让 Ocean 做，你看结果、读库、读日志。
- 要看运行中 Spool 的日志（双击 Ctrl 每一下、截图组合键都会记一行）：先从托盘退出，再从终端起 `spool.exe`，把 stdout 和 stderr 都重定向到一个文件。Windows 上捕捉不要授权，从终端起不影响结果。

### W-5 · MCP（你自己在终端跑，不用 Ocean）

- 照附录 B：用**库的副本** + `SPOOL_DATA_DIR`（旁边放 `{"mcpEnabled":true}` 的 `settings.json`）起 `spool.exe --mcp`（装好的那个，`currentUser` 一般在 `%LOCALAPPDATA%\Spool\`；或 `src-tauri/target/release/spool.exe`）。
  ⛔ 别直接连真库目录：探针 `initialize` 报的客户端名会被记进 `mcp-clients.json`，设置里就多出一个假客户端。
- 要的结果：`serverInfo.version` 0.7.0；普通 26（只读 14、写 12）；`--engine-run` 25（没有 `propose_split`）；
  `get_block_images` 对一块有图的块回 `image/png`（或 jpeg）；对一份**没升级过的老库副本**（v23）调 `list_threads` 被拒，说要先打开 Spool 升级。
- 真客户端那一半（Settings → MCP → 一键接入、重启客户端、读写）在 §6 G，要 Ocean。

### W-6 · 记录 + 收尾（一笔提交）

- 回执写 §7（数字、命令、结果、每条 §6 的结论）。
- HANDOFF：§9.2 记 Ocean 这一窗的答复（从第 165 条往下编）；§9.3 P9W 那一行改状态；§9.8 唯一下一步；每个问题一条 `DISCOVERED-YYYYMMDD-N`（§9.9 末尾，格式照抄那里的）。
  ⚠️ HANDOFF 和 `docs/README.md` 里常年有**别的窗口没提交的改动** —— 只暂存你自己的那几块（`git add -p` 在 Claude Code 里用不了：拿 `git diff` 生成补丁、删掉别人的 hunk、`git apply --cached`）。
- 任务书做完移进 `docs/archive/product-taskbooks/`（`git mv`），`docs/README.md` 入口那一行跟着改。
- 提交后跑 `CLAUDE.md` §5 的自查；**推送先问 Ocean**。
- 最后问 Ocean 两件：问题清单里哪些要修、在哪一窗修；Windows 要不要现在就发 v0.7.0（会改第 73 条）还是照旧等发版二。

## 4. 开工先问 Ocean（答完再动手）

1. **这台 Windows 上现在有没有 Spool、库里有没有你在乎的东西？**
   - 有，是真东西：先整份备份、在副本上跑迁移，过了再装（W-2 第一种）。好处：一点风险都不冒。代价：多十几分钟。
   - 有，但只是以前测试留下的 / 没装过：装 v0.6.1 → 写几块 → 用新包覆盖（W-2 第二种）。好处：验的就是老用户真实的升级路。代价：要装两次。
2. **验的时候发现问题怎么办？**
   - 甲（推荐）：这一窗只记，验完给你一张清单你挑。好处：不在没验完的时候改东西，改了也要重新打包重验。代价：修要等下一窗。
   - 乙：小的（文案、明显一两行）当场修，修完重打包重验。好处：一窗做完。代价：这一窗变长；每修一次都要重编（Windows 上一次十几分钟）。
3. **AI 那一半测不测？**（Windows 上只有 DeepSeek 那一条路）要你的 DeepSeek key，会花你 DeepSeek 账户里的钱（按用量算，跑一两次很少）。
   - 测：周回顾（API）跑一次、查余额一次。代价：花钱、key 进这台机器（Windows 上存在库旁边一个只有你能读的文件里，不进 settings）。
   - 不测：只看「活动」那一块和锁着的入口长什么样。
4. **首启（全新用户第一次打开）要不要在这台机器上验？** 办法：把 `%APPDATA%\com.oceanjin.spool` 临时改名 → 打开 Spool（会建一个全新的库、出现教程和示例项目）→ 看完关掉 → 删掉新建的那个文件夹、把原来的改回来。
   - 验：好处：Windows 上首启只有这样才验得到。代价：要小心改回来（我会一步一步说）。
   - 不验：留到以后。
5. **Windows 上装了哪些 AI 客户端？**（Claude Desktop / Claude Code / Codex / Cursor / VS Code……）—— §6 G 用。

## 5. 什么时候停下来问

- `git diff --stat v0.7.0 HEAD -- src src-tauri …` 不空。
- 编译不过、`tsc` / vitest / cargo 在 Windows 上红（`knitStore` 那条偶发的除外）—— 把报错原文给 Ocean，问要不要在这一窗修。
- 迁移验证任何一张表条数或正文长度对不上 —— 停，这是数据完整性。
- 安装后打不开 / 白屏 / 库版本不对 —— 停，先确认数据还在（备份在桌面），再看日志（白屏：右键 → 检查 → Console 的红字）。
- 任何要改产品代码、要推送、要对外的动作。

## 6. 和 Ocean 一起走的单（大白话，一步一个动作；每条记「过 / 不过 / 没测」）

> 给 Ocean 看的时候照这个样子念给他：先说这条要他做什么，再说看到什么算对。Windows 上「⌘」都是 Ctrl、「⌥」都是 Alt；捕捉手势是**双击 Ctrl**。

**A. 装和开**
1. ☐ 安装包双击，SmartScreen 点「更多信息」→「仍要运行」，一路下一步，不要管理员密码。
2. ☐ 打开 Spool：不白屏；主窗大小合适（不超出屏幕、四周留一点缝）。
3. ☐ Windows「设置 → 应用 → 已安装的应用」里 Spool 是 0.7.0；Spool 的界面语言跟着 Windows 的语言。
4. ☐ 右下角托盘有 Spool 图标（彩色，看得见）；右键有菜单、有「退出」；点 ✕ 窗口藏起来、app 还在托盘；左键点托盘图标窗口回来。
5. ☐ 升级装的：原来的项目、块、文件都在（W-2 已经数过，这里用眼睛再看一遍）。

**B. 捕捉（双击 Ctrl）**
6. ☐ 浏览器里选一段字 Ctrl+C，然后双击 Ctrl：右上角弹卡片，字对；「来源」是那个窗口的标题（浏览器就是网页标题）。开两个浏览器窗口，在后面那个里复制再捕，来源是你复制的那个窗口。
7. ☐ 卡片弹出来直接能打字（批注），回车存；卡片底栏：撤销、改投到别的项目、完成；「固定窗口」按了之后卡片不自己消失、点外面也不收。
8. ☐ 截图：Win+Shift+S 截一块（进剪贴板）→ 双击 Ctrl：存成一块**图片**，卡片上有小图；卡片上写的字是这张图的注释。
9. ☐ Win+PrtScn（整屏存进「图片\屏幕截图」文件夹）→ 10 秒内双击 Ctrl：存的是**这张截图**（P9H-7 写的，**从来没在真机上跑过**）。
10. ☐ 资源管理器里选中一张 .png / .jpg，Ctrl+C → 双击 Ctrl：存进来的是**图片本身**，不是文件名。
11. ☐ 主窗里往输入框粘贴一张图、或者拖一张图进来：进的是你正在写的这一块。
12. ☐ （已知 Windows 没有）长按 Ctrl 写笔记 —— 不测；记一下「长按没反应」是预期。

**C. 图片**
13. ☐ 块里的图：单击看大图、左右翻；双击进编辑面板，图前图后能写字、能写注释、能删图（点完成才生效）。
14. ☐ 有图的块合并、移到别的项目、复制到别的项目：图都跟着走；⌘Z（Ctrl+Z）撤回后图回来。
15. ☐ 打包（Ctrl+Shift+P）带图的项目：pack 里图那一行是 `![注释](路径)`；**看这个路径在 Windows 上长什么样**（反斜杠 / 正斜杠、能不能在资源管理器里打开）—— 记原样。

**D. 项目文件**
16. ☐ 右栏「项目文件」加一个文件（按钮 / 从资源管理器拖进来）：列出来、新的在上、带时间、标「你加的」；**默认 AI 可读**的开关是开的。
17. ☐ 块上的回形针把文件挂到这一块：右栏标块号；删这块时问文件去不去；撤销后放回原处。
18. ☐ 在资源管理器里把那个文件**挪到同一个盘的另一个文件夹** → 回到 Spool：标「已跟到新位置」（New place）；把它**删掉** → 标「找不到了」。
19. ☐ 点文件名用默认程序打开（pdf / docx 各试一个）。

**E. 打包 / 导出**
20. ☐ 单个项目「导出 .md」：存储对话框、存出来的 .md 打得开。
21. ☐ 导出成文件夹（带文件和图片）：清单、大小、勾选；导出的文件夹里文件和图都在、.md 里的相对链接**在 Windows 上点得开**（记斜杠方向）。
22. ☐ 工作区导出成文件夹：`INDEX.md` + 每个项目一个 .md，带文件和图片那张清单。

**F. 界面上的新东西**
23. ☐ 深浅色：设置里「跟随系统 / 浅色 / 深色」；Windows 设置里切深色，主窗和捕捉卡片都跟着变。
24. ☐ 左栏织布：自己写 / 捕捉一块，针数 +1（AI 写的不算）；点左栏那一块，柜子从底部滑上来；兑换、撤销。`%APPDATA%\com.oceanjin.spool\knit.json` 有记录。
25. ☐ 专注时间：左栏专注时钟在走；**15 分钟不碰键盘鼠标**之后停（`GetLastInputInfo`，Windows 专有那条路）；周回顾「活动」里今天那根柱子对得上。
26. ☐ 周回顾：入口一直在；最上面「活动」（平均每天专注、周一到周日七根柱、这周加了块的项目分三段、到期的）；不用 AI、不花钱。
27. ☐ 撤销 / 重做：Ctrl+Z 撤、**Ctrl+Shift+Z 或 Ctrl+Y** 重做。
28. ☐ 没写完的字不丢：编辑面板里写一段不点完成 → 托盘「退出」→ 再开：提示上次没点完成的块，「去看」跳过去、字在。
29. ☐ 左栏：工作区默认折叠、只展开当前项目那一支；项目全完成的工作区进底部「归档」；右键强制归档，Ctrl+Z 撤回。
30. ☐ 项目里查找（Ctrl+F）：在本项目里按时间跨块走、首尾相接。
31. ☐ 「复制到…」先查重，「删掉原块」变成移动，Ctrl+Z 一次撤回。
32. ☐ 私密项目：右键「设为私密…」→ 项目上有标记、右栏不说 AI 读得到；Spool 自己的 AI 入口（压缩 / 过期检测）在这个项目里关着。
33. ☐ 休息提醒（时间调成最短那一档）：到点弹出，盖在别的窗口上面；点一下能提前结束。
34. ☐ 跟进面板：清单能加、能改；「联网搜索」那类按钮在 Windows 上是锁着 / 没有的（预期）。

**G. MCP（要 Ocean 装着的客户端）**
35. ☐ 设置 → MCP：装了的客户端显示「未配置」，没装的显示「未安装」（装了却说未安装 = Windows 路径猜错了，记是哪个）。
36. ☐ 一键接入 → 「已配置」；**完全退出客户端再打开**。
37. ☐ 在客户端里问「我 Spool 里有哪些项目」：列得出来；**私密项目不在里面**。
38. ☐ 「把『这是 Windows 上 v0.7 的测试』存进 XX 项目」：Spool 里看得到这一块，标着是哪个 AI 写的。
39. ☐ 让 AI「看一下 #n 那一块里的图」（挑一块有图的）：AI 说得出图上是什么（`get_block_images`）。
40. ☐ 让 AI 提议一件要你点头的事（比如「把 XX 项目拆成两个子项目」或「这一块被那一块取代了」）：Spool 待审里冒出一张卡（Spool 开着、在后台也会几秒内自己出来）；点同意 / 拆分后生效，Ctrl+Z 能整个撤回。

**H. AI（§4 ③ 答「测」才做）**
41. ☐ 设置 → AI 引擎：只有 DeepSeek（API）那一节，没有「本机 AI 引擎」；填 key；「查一下」余额显示出来。
42. ☐ 周回顾选 API 跑一次：跑得完、能停；结果按周归组。

**I. 首启（§4 ④ 答「验」才做）**
43. ☐ 临时改名之后第一次打开：建了新库、出现「欢迎使用 Spool」教程和示例项目；教程里说的是 **Ctrl** 的说法（不是 ⌥ / 输入监听权限）；Ctrl+Shift+P 打包示例项目有东西。看完照步骤改回来，原来的库都在。

## 7. 回执（执行窗填写）

（待执行）

---

## 附录 A · 不碰真库地读库 / 在副本上跑真迁移（Windows，`node:sqlite`）

**拷副本 / 数东西**（Node 22.5+；在仓库根跑；`<src>` / `<dst>` 用正斜杠写的绝对路径）：

```js
// read-db.mjs —— 只读打开，VACUUM INTO 一份副本，并打印版本、完整性和各表条数
import { DatabaseSync } from 'node:sqlite';
const [src, dst] = process.argv.slice(2);
const db = new DatabaseSync(src, { readOnly: true });
if (dst) db.exec(`VACUUM INTO '${dst.replace(/'/g, "''")}'`);
const q = (s) => db.prepare(s).all();
console.log('user_version', q('PRAGMA user_version')[0].user_version, q('PRAGMA integrity_check')[0]);
for (const { name } of q("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"))
  console.log(name, q(`SELECT count(*) c FROM "${name}"`)[0].c);
```

**在副本上跑仓库里真的迁移**（Mac 上 10-18 就是这么验的，P9R 回执 §7.3）：把 `@tauri-apps/plugin-sql` 换成一个用 `node:sqlite` 的桩，
其余全是仓库里的真代码。三个文件放在仓库外面的一个临时目录（`<T>`），**不进仓库**：

```js
// <T>/stubs/plugin-sql.mjs
import { createRequire } from 'node:module';
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
const num = (sql) => sql.replace(/\$(\d+)/g, '?$1');
export const openAdapter = (file) => {
  const h = new DatabaseSync(file);
  return {
    __handle: h,
    execute: async (sql, p = []) => { const r = h.prepare(num(sql)).run(...p); return { rowsAffected: Number(r.changes), lastInsertId: Number(r.lastInsertRowid) }; },
    select: async (sql, p = []) => h.prepare(num(sql)).all(...p),
    close: async () => h.close(),
  };
};
export default { load: async () => openAdapter(globalThis.__dbFile) };
```

```js
// <T>/vitest.mig.config.mjs  （⚠️ 写成纯对象：临时目录里 import 不到 vitest/config）
export default {
  root: '<仓库根，正斜杠>',
  resolve: { alias: [
    { find: /^@tauri-apps\/plugin-sql$/, replacement: '<T>/stubs/plugin-sql.mjs' },
    { find: /^@\//, replacement: '<仓库根>/src/' },
  ] },
  test: { globals: true, dir: '<T>', include: ['**/*.test.ts'], testTimeout: 120000 },
};
```

```ts
// <T>/mig.test.ts  （不 import vitest，用 globals）
import { openAdapter } from '<T>/stubs/plugin-sql.mjs';
import { __migrateSchemaForTest, CURRENT_SCHEMA_VERSION } from '@/lib/db/client';
const shape = (h: any) => {
  const out: Record<string, any> = {};
  for (const { name } of h.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) {
    const cols = h.prepare(`PRAGMA table_info("${name}")`).all().map((c: any) => c.name);
    out[name] = { n: h.prepare(`SELECT count(*) c FROM "${name}"`).get().c,
      cols: Object.fromEntries(cols.map((c: string) => [c, h.prepare(`SELECT COALESCE(SUM(LENGTH("${c}")),0) l, COUNT("${c}") nn FROM "${name}"`).get()])) };
  }
  return out;
};
it('old copy -> v35: not fresh, nothing old changed, new things empty', async () => {
  const db: any = openAdapter('<副本路径>'); const h = db.__handle;
  const before = shape(h);
  expect(await __migrateSchemaForTest(db)).toBe(false);          // true = 走了空库重建那条路，绝不能是 true
  expect(h.prepare('PRAGMA user_version').get().user_version).toBe(CURRENT_SCHEMA_VERSION);
  const after = shape(h);
  for (const [t, b] of Object.entries<any>(before)) {
    expect(after[t].n).toBe(b.n);
    for (const [c, v] of Object.entries<any>(b.cols)) expect(after[t].cols[c]).toEqual(v);
  }
  for (const t of Object.keys(after)) if (!(t in before)) expect(after[t].n).toBe(0);
  expect(h.prepare('PRAGMA integrity_check').get().integrity_check).toBe('ok');
});
```

跑：在仓库根 `npx vitest run --config <T>/vitest.mig.config.mjs`。日志里的 `[db] pre-migration backup FAILED … window is not defined` 是测试环境没有 Tauri 的路径接口，正常。
新加的列除了 `threads.private`（全 0）都应该是 NULL；Mac 上那一次只有一处和全新建库不一样：`attachments.thread_id` 可空（v15 用 ALTER 加的，老库一直这样，不是这一版的事）。

## 附录 B · MCP 探针（Node，连库的副本）

```js
// probe.mjs  用法：node probe.mjs <spool.exe> <副本所在目录> <有图的 block_id 或 -> [--engine-run]
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
const [exe, dir, block, ...extra] = process.argv.slice(2);
const p = spawn(exe, ['--mcp', ...extra], { env: { ...process.env, SPOOL_DATA_DIR: dir }, stdio: ['pipe', 'pipe', 'ignore'] });
const waiting = new Map();
createInterface({ input: p.stdout }).on('line', (l) => { try { const m = JSON.parse(l); waiting.get(m.id)?.(m); } catch {} });
const call = (id, method, params) => new Promise((res) => { waiting.set(id, res); p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
const init = await call(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'p9w-probe', version: '0' } });
p.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
const tools = (await call(2, 'tools/list', {})).result.tools;
const ro = tools.filter((t) => t.annotations?.readOnlyHint).length;
console.log(init.result.serverInfo, 'tools', tools.length, 'read-only', ro, 'write', tools.length - ro, 'propose_split', tools.some((t) => t.name === 'propose_split'));
if (block !== '-') {
  const r = (await call(3, 'tools/call', { name: 'get_block_images', arguments: { block_id: block } })).result;
  console.log('images', r.isError ?? false, r.content.map((c) => c.type === 'image' ? `${c.mimeType} ${c.data.length}` : c.text.slice(0, 60)));
}
const lt = (await call(4, 'tools/call', { name: 'list_threads', arguments: {} })).result;
console.log('list_threads', lt.isError ?? false, lt.content[0].text.slice(0, 120));
p.stdin.end();
```

副本目录里放 `spool.db`（附录 A 的 `VACUUM INTO` 拷出来的）和一个内容是 `{"mcpEnabled":true}` 的 `settings.json`。
有图的块：`SELECT bi.block_id FROM block_images bi JOIN blocks b ON b.id = bi.block_id JOIN threads t ON t.id = b.thread_id WHERE t.private = 0 AND t.deleted_at IS NULL LIMIT 1`。
