# 产品任务书 P13 —— 发版二之前：Windows 验证（在 Mac 上的 Parallels Desktop 里做；只验，不发）

> **状态：COMPLETE（2026-11-09 晚 Ocean 手指验收通过，§7.10；同日移进 `archive/product-taskbooks/`，下一件是 P16，见 `docs/HANDOFF-2026-11-09.md` §2）** —— 之前：ACTIVE（2026-11-06 夜重新开始） —— 10-28 下发（HANDOFF §9.2 第 241 条），11-05 夜暂停、改在 Parallels 里做（第 248 条）；P14、P15 插在前面，都已验收（第 252、257 条），Windows 那一半带进本任务书 §6 K、L。**11-07 – 11-09 修复轮**（Ocean：`-3` – `-8` 发版前全修 + 两条现场反馈）做完，修复包 `adee9a9` 装在虚拟机里。**11-09 晚 Ocean 手指验收做完：§6 全部做了，除第 18 条里「Parallels 共享文件夹 / 网络盘上挪走的文件跟不上」外全过；这一种 Ocean 选记为已知限制、不改代码**。回执在 §7.9、§7.10；下一步 = 发版二（另开一窗）。
> 这一窗在 **Mac 上**执行，Windows 是 Parallels 里的虚拟机，命令从 Mac 用 `prlctl` 发进去（§0.1）。
> 开工先做 §0（环境），再问 Ocean §4 的几件，答完再动手。
>
> **唯一交付：** 用 `main`（代码 = `87c9261`，P15 最后一笔代码；之后只改过文档；= Mac 上 11-06 17:31 装的那一版）在 Windows 上编译、跑全套测试、打不签名的 NSIS 安装包，
> 装进虚拟机，照 §6 和 Ocean 一起走一遍；每一条结果、每一个问题记下来（§7 回执 + HANDOFF）。验收通过之后的下一件是**发版二：Mac + Windows 统一发版**（另开一窗，不在这里）。
>
> **来历：** Ocean 2026-10-28：「全部做完之后提交，下一步我会在 Windows 电脑上做真机验证，用 Claude code 验收，把 taskbook 写好，验收通过就是 win+mac 统一发版」
> （HANDOFF §9.2 第 241 条）。11-05 夜：「Windows 真机验证（我选择parallel desktop测试）」（第 248 条）。
> 上一次 Windows 验证 P9W（10-20）在一台学校电脑上被安全软件拦住，§6 那些条目**一条都没测**；之后 P9X 修了 Windows 上测试编不过等问题（GitHub 的 Windows 机器上全绿）。
> **这一次是 P1 – P15 的 Windows 部分第一次装进一台 Windows 里用。**
>
> **边界：**
> - **只验，不发。** 不建 Release、不上传安装包、不打 tag、不改版本号（仍是 0.7.4，发版那一窗才改）、不改 `.github/workflows/`。
> - **默认不改产品代码。** 发现问题记 DISCOVERED（HANDOFF §9.9，格式照那里已有的条目），验完给 Ocean 一张清单挑。
>   例外：**编译不过、测试在 Windows 上红** —— 停下，把报错原文给 Ocean，问要不要在这一窗修（只修 `cfg(windows)` 那几行 / 只在 Windows 才走的那条路）。§4 第 3 条 Ocean 选「当场修」时照他说的。
> - 不加依赖（`cargo tree` 那条照旧空，§3 W-0）、CSP 不改、**不改库结构（库 v38）**。
> - 不碰实验线（`TASKBOOK-STAGE0A-*`、`CODEX-HANDOFF-*`、`docs/README.md` 里研究那几行）；**不动 `docs/EXECUTION_POLICY.md`**。
> - ⛔ 不加 LICENSE、README 不写许可一节；不引 95/5 那个数；MemTrapBench 的百分数不进讲 Spool 的句子。
> - **提交照 `CLAUDE.md` §5：任何地方都不写 AI 署名**（没有 `Co-Authored-By`、没有「Generated with」）—— 默认模板会建议加，**不许加**；提交说明里也别写「用什么工具执行的」（写「在 Parallels 虚拟机里」）。
>   每次提交后跑 `CLAUDE.md` §5 那条自查 grep；命中的若只是产品内容（来源识别里的 claude、`CLAUDE.md` 这个文件名、引擎名），用窄一点的 grep（`co-authored|🤖|generated with|anthropic`）复核，别为了让它变绿改代码。
> - **推送先问 Ocean。** 仓库是公开的。本地 `main` 比 `origin/main` 多 8 笔（`19923fd` + P15 那 7 笔；11-06 夜开窗时），推的时候连同 P13 的文档一起带上。
> - ⛔ **虚拟机里 Windows 的「桌面 / 文档 / 下载」就是 Mac 上的那三个真文件夹**（§0.1）。测试用的文件、文件夹一律放 `C:\Users\hzjin\spool-p13\`。

---

## 0. 环境：Parallels 里的 Windows（2026-11-06 夜对着这台 Mac 核过）

### 0.1 这台虚拟机是什么

| 项 | 现在 |
|---|---|
| 主机 | Apple M4 Max；Parallels Desktop 27.1.0，**试用版，2026-11-20 到期** —— P13 和发版二要在那之前做完，或者 Ocean 买授权 |
| 虚拟机 | 「Windows 11」：Windows 11 **ARM 版**（`10.0.26300.9711`，26H2）、4 核、9 GB 内存；用户 `hzjin`；系统语言英文（en-US），只有英文输入法 |
| Spool 怎么跑 | Spool 的 Windows 包是 **x64**，Windows 11 ARM 靠系统自带的转译跑它。WebView2 运行时已经有（157）；x64 的 Spool 能不能顺利用上它，W-3 第一次打开时就知道 |
| 已经装了的 | 只有 winget。没有 Git、Node、Rust、VS Build Tools；**没装过 Spool**（`%APPDATA%\com.oceanjin.spool` 不存在） |
| 和 Mac 共用的 | Windows 的**桌面、文档、下载就是 Mac 的 `~/Desktop`、`~/Documents`、`~/Downloads`**（Parallels「共享配置文件」开着，桌面 = `C:\Mac\Home\Desktop`，Knote 仓库和 `~/Desktop/Spool/` 的备份都在里面）；剪贴板两边同步；Windows 里的文件和链接可能交给 Mac 的程序打开（「共享应用程序」两个方向都开着） |
| 磁盘 | 虚拟机的硬盘是随用随涨的文件，涨在 Mac 的硬盘上。**Mac 现在只剩约 21 GB**，虚拟机里看到的「剩余空间」就是这个数（§4 第 1 条） |
| 我从 Mac 能做什么 | `prlctl exec "Windows 11" --current-user …` 在虚拟机里跑命令（实测和资源管理器在同一个会话里，所以起的窗口应该出现在 Ocean 的屏幕上、收得到键盘 —— W-3 第一次起 Spool 时核）；`prlctl capture` 截虚拟机屏幕；`prlctl send-key-event` 往虚拟机的虚拟键盘发按下 / 松开（能控制时间，测长按、双击的边界）；`prlctl snapshot` 做快照（虚拟机开着时快照连内存一起存，一次约 9 GB，磁盘不够时不用）。⇒ 执行这一窗不用在 Windows 里另装一套执行环境，也不用 Parallels 的 MCP 或 VS Code 插件。点鼠标、拖文件、看界面是 Ocean 的手 |
| 交换文件夹 | Mac `~/Desktop/Spool/P13-vm-20261106/` = 虚拟机 `C:\Mac\Home\Desktop\Spool\P13-vm-20261106\`：只用来传安装包、日志、库的副本。⛔ Windows 版 Spool 不碰它（不挂文件、不连文件夹、不导出到这里） |

### 0.2 开工前的四件事（顺序别换）

1. **Mac 上的 Spool 打开「暂停捕捉手势」**（菜单栏 Spool 图标里，Ocean 自己点；P13 做完关回去）。原因：Mac 上装的是 P15 那一版，双击 ⇧、双击 / 长按 ⌥、⌘C 它都在听；在虚拟机里按键时 Mac 那边很可能也看得见（还没测），会在 Mac 上弹切换面板、捕捉卡，甚至换掉 Mac 真库的捕捉目标。
2. **磁盘**：照 §4 第 1 条的答复。Mac 剩余空间低于 **8 GB** 就停（Spool 的真库在 Mac 上，磁盘写满了库就写不进去）。
3. **虚拟机用窗口模式**，别用 Coherence（融合）模式：融合模式下 Windows 的窗口混在 Mac 桌面上，「捕捉卡盖在最上面」「托盘」这几条分不清是谁的。
4. **测试用的东西一律放 `C:\Users\hzjin\spool-p13\`**（虚拟机自己的硬盘）。⛔ 不放 Windows 的桌面 / 文档 / 下载：在那里「连接文件夹」，Windows 版 Spool 会往 Mac 上的真文件夹里写 `SPOOL.md`、改 `CLAUDE.md`；挪文件、删文件动的也是 Mac 的真文件；文件跟踪（盘号 + 文件号）在共享文件夹上也不算数。网上下的安装包也先挪进这里再双击（从共享文件夹双击，Windows 会多弹一个「网络位置」的安全提示，那不是 Spool 的事）。

### 0.3 键盘：Mac 键盘在虚拟机里

- Parallels 没改过 Windows 的键位，用的是默认映射：**Mac 的 control = Windows 的 Ctrl**，option = Alt，⌘ 单按 = Windows 键（开始菜单），⌘ 加字母大多被翻成 Ctrl 加字母（⌘C → Ctrl+C）。
- ⇒ §6 里所有「Ctrl」都按 Mac 的 **control**；「双击 Ctrl」「长按 Ctrl」只用 control。⌘C 复制也行，但 W-3 先实测一次 Spool 是不是把它当成 Ctrl+C（「长按带上刚复制的字」靠这个）。
- Mac 键盘没有 PrtScn：Win+PrtScn 用 Windows 的屏幕键盘（`osk`）点，或者我用 `prlctl send-key-event` 发；Win+Shift+S 先试 ⌘⇧S，被翻成 Ctrl+Shift+S 的话改用开始菜单里的「Snipping Tool / 截图工具」→ 新建（截完同样进剪贴板，Spool 只看剪贴板）。
- 按键怎么进的 Windows：Parallels 可能从虚拟键盘送（像真键盘），也可能是注入的。Spool 的 Raw Input 两种都收（`double_tap_win.rs` 不看设备句柄），所以虚拟机里能触发；以后要是改成「只认真键盘」，必须在真电脑上验。
- Windows 版 Spool 的日志只在手势**成立**时写一行（`TRIGGER` / `LONG-PRESS Ctrl` / `DOUBLE-TAP ⇧`），每一下按键不记。

### 0.4 代码怎么进虚拟机（§4 第 1 条选「甲」才用）

- 先 `git config --global core.autocrlf false`，再拿代码。Git for Windows 默认把文本文件改成 CRLF，而这里有测试逐字节比对提交进来的文件（跨语言 pack 的 golden、官网中文页是否同步）—— 一个 `\r` 就红，和 Windows 毫无关系。核：`git ls-files --eol src/lib/pack | head` 工作区那一列是 `w/lf`。
- 两种拿法都**拷到 `C:\src\Knote`**；⛔ 别在共享文件夹里直接编（慢；文件锁、大小写、文件号都和本地盘不一样）：
  - 推荐：在虚拟机里 `git clone C:\Mac\Home\Desktop\Knote C:\src\Knote` —— 从 Mac 上的仓库直接克隆，只拿提交过的东西（研究线那些没提交的文档不会过去），**不用先推送**。
  - 或者：推送之后从 GitHub 克隆 `main`（P15 那几笔还没推，Ocean 点头才推）。
- 核代码：`git log -1` 是 `cb85413` 或更新；`git diff --stat 87c9261 HEAD -- src src-tauri package.json package-lock.json` 是空的。不空就停下问。
- 工具（winget 装；除了 Rust，ARM 原生的就行）：Git for Windows、Node 22（`node:sqlite` 要 22.5+，和 CI 一样用 22）、Visual Studio 2022 Build Tools 的「使用 C++ 的桌面开发」，**勾上 x64/x86 的 MSVC 生成工具**和 Windows 11 SDK。NSIS 不用装，打包时 Tauri 自己下。
- **Rust 要用 x64 的工具链**：`rustup` 装好后 `rustup default stable-x86_64-pc-windows-msvc`，核 `rustc -vV` 里是 `host: x86_64-pc-windows-msvc`。原因：`scripts/build-sidecar.sh` 按 rustc 的 host 给 `spool-ai` 起名，Tauri 也按它决定打什么包 —— 用 ARM 原生的 Rust 会**不声不响地打出一个 ARM64 的包**，不是要发的 x64。代价：rustc 自己也在转译下跑，第一次从头编会慢。
- **打包要写明目标**：`npx tauri build --bundles nsis --target x86_64-pc-windows-msvc`。Tauri 的命令行工具是 ARM 原生的，不写 `--target` 时它按**自己的**平台定包的架构（日志 `Target: arm64`），去找 `spool-ai-aarch64-…exe`、找不到就失败（11-06 实测）。写了之后产物在 `src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\`。GitHub 的 x64 机器上不用写。
- `bash` 要在 PATH 里，而且是 Git 带的那个（`where bash` 第一行在 `C:\Program Files\Git\` 下面）：`npm run build:sidecar` 用它。
- 打出来的包核一下是 x64：`spool.exe` 的 PE 头 Machine = `0x8664`（交换文件夹里拷一份，Mac 上几行 Python 读）。

### 0.5 虚拟机的结果代表什么、不代表什么

能当结论的：Spool 在 Windows 11 上功能对不对、界面对不对、升级对不对、MCP 和各种 Windows 路径对不对。另外它正好就是「骁龙那种 Windows ARM 笔记本上跑 x64 的 Spool」的真实情况。

测不了，或者测了也只算虚拟机的（回执里这些条目标「虚拟机」，发版说明不拿它们当一台 x64 电脑的结论）：

1. 真 x64 电脑上的速度、只在 x64 上才有的问题 —— 这里全在转译下跑。
2. 真 PC 键盘：左右 Ctrl、PrtScn、Win 键都是 Parallels 翻过来的。
3. 真触控板：「双指缩放会不会让长按 Ctrl 误弹」这里测的是 Parallels 怎么翻 Mac 触控板，不是 Windows 笔记本的触控板驱动。
4. 多屏、混合缩放（125% / 150%）：虚拟机只有一块虚拟屏，「主窗大小合适」是对这块屏说的。
5. 安全软件 / 学校公司管的电脑（P9W 就是被这个拦的）：这里是干净的个人系统，SmartScreen 看得到，别的杀毒软件看不到。
6. 没有 WebView2 的电脑（老的 Windows 10）：这里已经装了，安装包联网装 WebView2 那条路走不到。
7. Windows 10，和大多数人用的 Windows 11 23H2 / 24H2 x64：这里是 26H2 的 ARM 版。
8. 中文 Windows、中文用户名（`C:\Users\张三`）的路径：这里是英文系统、英文用户名（中文**文件夹名**可以测，§6 第 16 条顺带）。
9. 剪贴板：Parallels 在两边之间转了一道；只算在虚拟机**里面**复制的。
10. 「15 分钟不碰键盘鼠标」：人在用 Mac 时，虚拟机也算「没碰」。
11. 睡眠 / 唤醒：虚拟机挂起不等于电脑睡眠。
12. 显卡：虚拟显卡。

## 1. 开工前读

1. `CLAUDE.md`（会自动载入）、`docs/EXECUTION_POLICY.md`（只读）。
2. `docs/HANDOFF-2026-09-04.md`：首屏 + §9.2 第 73、177、231、237 – 241、248 – 257 条 + §9.3（P9W、P9X、P13、P14、P15、发版二那几行）+ §9.8 最上面几段 + §9.9 的 `DISCOVERED-20261020-1` – `-9`、`-20261025-9`、`-20261028-1`、`-20261106-1`、`-2`。
3. `docs/archive/product-taskbooks/TASKBOOK-P9W-WINDOWS-V070-VERIFY-2026-10-20.md` —— 上一次的做法、附录 A / B（读库、在副本上跑真迁移、MCP 探针，这一次照用，数字按 §2 改）、§7 回执里撞过的坑。
4. `docs/archive/product-taskbooks/TASKBOOK-P9X-WINDOWS-TEST-FIXES-2026-10-20.md` §6 第 3 条 —— 当时说「等真机再看」的三件（§6 里都有）。
5. `docs/archive/product-taskbooks/TASKBOOK-P14-H2-H3-2026-11-05.md` §9.6、§10 – §12；`TASKBOOK-P15-MCP-WORKSPACE-FOLDER-TARGET-SWITCHER-2026-11-06.md` §0、§5、§6、§8.5 —— §6 K、L 那些条目是什么、Mac 上怎么验的。
6. 发版说明 `docs/RELEASE_NOTES_v0.7.1.md` – `v0.7.4.md` 和 `docs/archive/product-taskbooks/` 里 P9S – P12 的任务书 —— 只在不明白 §6 某一条时去查。
7. 记忆：`windows-ci-verify-from-mac`、`isolated-verify-workflow`（§44 探针别连真库、§47 停 GUI 前先问、§53 / §55 碰文件夹的只在副本上）、`spool-db-wipe-incident`。

## 2. 现在（2026-11-06 夜对着 `cb85413` 核过）

| 项 | 现在 |
|---|---|
| 代码 | 本地 `main` 是 `cb85413`，比 `origin/main`（`5f762da`）多 9 笔，都没推。代码 = `87c9261`（P15-4），之后只改过文档；= Mac 上 11-06 17:31 装的那一版。版本号三处都是 0.7.4 |
| Windows 上编过没有 | GitHub 的 Windows 机器最后一次全绿是 10-31（run 41181284579，代码到 `f35e8c2`）。**P14（读剪贴板 HTML、读剪贴板加锁）和 P15（长按 Ctrl、双击 ⇧ 面板、鼠标 Raw Input）的 Windows 部分从没在 Windows 上编过**；P15 只在 Mac 上用一个小 crate 对 Windows 目标 check / clippy 过那两个文件。从没在任何一台 Windows 上装起来用过 |
| Mac 上的测试基线 | P15 回执（11-06）：`tsc` 干净 · vitest **141 个文件 / 1332 条** · `cargo test` **309 过 · 15 跳过** · `i18n-check --dead` 0。W-0 在 Mac 上再跑一遍，`--lib`、sidecar 的数也记下来。Windows 上 cargo 的条数会不一样（有 `cfg` 只在一边编的测试），**记真实数字，红的逐条记** |
| Windows 专有的代码 | `src-tauri/src/`：`double_tap_win.rs`（Raw Input：键盘 + 11-06 起多收鼠标，只看不拦；Win+PrtScn 记时间）、`modifier_gestures.rs`（不分平台的判定：双击 Ctrl、长按 Ctrl 0.8 – 3 秒、双击 ⇧）、`switcher.rs` + `overlay.rs`（切换面板 = 浮窗进程里的第二个窗口）、`win32.rs`（前台窗口标题 = 来源、`GetLastInputInfo` = 专注时间）、`capture.rs`、`images.rs`（截图文件夹 `FOLDERID_Screenshots`、剪贴板里的图片文件、剪贴板的 `HTML Format`（头在 TS 里去掉）、所有读剪贴板的地方一把锁 `PASTEBOARD`）、`file_identity.rs`（卷号 + 文件号：项目文件、连接的文件夹挪了能跟上）、`systime.rs`、`mcp.rs`（`%APPDATA%` 下的库和各客户端配置、路径闸去 `\\?\`）、`lib.rs`（托盘、主窗按屏幕大小开）；`tauri.windows.conf.json`（安装 / 卸载图标，`f35e8c2`） |
| Windows 上故意没有的 | **本机 AI 引擎**（Claude Code / Codex 跑周回顾、跟进、压缩、过期检测）—— `engine.rs` `detect()` 在 Windows 直接返回没有（停不掉整棵进程树）⇒ Windows 上 AI 功能**只有 API 那一条路**；浏览器自动化权限那一节；HEIC 转 JPEG 靠 Mac 的 `sips` |
| API key 在哪 | Mac 是钥匙串；**Windows 是 app 配置目录里一个叫 `api-key` 的文件**（`%APPDATA%\com.oceanjin.spool\api-key`），不进 settings、不跟着导出走 |
| 库在哪 | `%APPDATA%\com.oceanjin.spool\`（Roaming）：`spool.db`、`settings.json`、`mcp-clients.json`、`focus.json`、`drafts.json`、`knit.json`、`stale.json`、`ai-seen.json`、`image-cache\`、`folder-backups\`。App 和 `--mcp` 读同一个 |
| 库版本 | **v38**。Windows 上最后发过的是 **v0.6.1（库 v23）**，之后 Windows 一版都没发过（官网 Windows 按钮还指着 v0.6.1）⇒ Windows 老用户升级要走 **15 步**（v23 → v38），全是加可空列 / 加表 / 加索引；升级前 app 自动在库旁边留 `spool.pre-migration-v23-….db` |
| MCP | 普通连接 **30** 个工具（P15 加了 `create_workspace`、`propose_link_folder`）；`--engine-run` 26（Windows 上没有引擎，这个模式用不到，数一下无妨）。只读 / 写各几个，W-5 用探针数 |
| 安装包 | 不签名（Ocean 08-15 定的）⇒ SmartScreen 拦一下是预期；NSIS `currentUser` 安装（不要管理员）；WebView2 联网引导安装（虚拟机里已经有，走不到） |
| 还没在 Windows 上验过的（HANDOFF） | P9X 修的 `-4`（pack / 导出里图片路径改成 `C:/…` 正斜杠）、`-7`（AI 可读的文件挪进 AppData 不跟、停下来问）、`-2`（测试 exe 的清单开关不影响发出去的 exe）；`DISCOVERED-20261020-9`（路径闸消息不带 `\\?\`，P12-1 修了）；`DISCOVERED-20261025-9`（连接的文件夹挪了能不能跟过去）；P9B-1（系统切深浅色 Spool 跟着变、标题栏跟不跟着变）；P14 H2 在 WebView2 上（后台页面的定时器会被放慢）；P14 的 `HTML Format`；P15 的长按 Ctrl、双击 Shift 面板、两个新工具在 `C:\…` 路径上 |

## 3. 步骤（按顺序；每一步做完再下一步）

### W-0 · 环境 + 基线（不改任何东西）

- §0 那几条核完。
- **Mac 上**（两种选法都做）：`npx tsc -b`；`npx vitest run`；`npm run build:sidecar`；`cd src-tauri && cargo test --lib`；`cargo test --manifest-path src-tauri/sidecar/Cargo.toml`；`node scripts/i18n-check.mjs` 和 `--dead`；
  `cargo tree --manifest-path src-tauri/Cargo.toml -e normal --target x86_64-pc-windows-msvc | grep -iE "ureq|rustls|reqwest|hyper|openssl"`（必须空；`cargo tree` 不编译，Mac 上就能看 Windows 目标的依赖）。日志进文件，别用 `| tail` 吞退出码。
- **甲（虚拟机里编）**：照 §0.4 装工具、拿代码；`node -v`、`rustc -vV`、`cargo -V` 记进回执。在 `C:\src\Knote` 里跑：`npx tsc -b`；`npx vitest run`；`npm run build:sidecar`；`cd src-tauri && SPOOL_TEST_CC6_MANIFEST=1 cargo test`（CI 就是不带 `--lib` 跑的）；sidecar 的测试；`i18n-check`。日志写到 `C:\Users\hzjin\spool-p13\logs\`，每一份拷进交换文件夹。
  - `SPOOL_TEST_CC6_MANIFEST=1` 不能省：Windows 上的 Rust 测试 exe 没有 Common Controls v6 清单会在加载时死掉（0xc0000139）；这个变量只在测试时给测试 exe 加清单，打安装包那一步不设（`.github/workflows/windows-build.yml` 就是这么做的）。
- **乙（GitHub 的 Windows 机器编）**：Ocean 点头后推一个非 main 分支（如 `ci/p13-windows`），`gh workflow run windows-build.yml --repo KIM-ocean-HZ/spool --ref <分支>`，`gh run watch <id> --exit-status` 放后台（约 20 分钟）。从 `gh run view <id> --log` 里抄 vitest、cargo test 的条数。sidecar 的测试 CI 不跑 —— 回执写明「Windows 上没跑」。
- 编不过 / 测试红 ⇒ §5 停下问。

### W-1 · 安装包（不签名）

- 甲：`npx tauri build --bundles nsis`（`beforeBuildCommand` 会顺带把 `spool-ai` 编成 `spool-ai-x86_64-pc-windows-msvc.exe` 打进去）。⛔ 不设任何签名环境变量。产物 `src-tauri\target\release\bundle\nsis\Spool_0.7.4_x64-setup.exe`。
- 乙：`gh run download <id> --name spool-windows-nsis`，下到交换文件夹。
- 记大小、`sha256`、`spool.exe` 是 x64（§0.4 最后一条；乙的话从安装包里拆，见记忆 `windows-ci-verify-from-mac` 末尾的拆法）。拷进 `C:\Users\hzjin\spool-p13\`，装之前不动它。
- 核 `spool.exe`、`spool-ai.exe` 的导入表（Mac 上 `objdump -p <exe> | grep "DLL Name"`）：有 `VCRUNTIME140.dll` / `MSVCP140.dll` 就记一条 DISCOVERED —— 没装 Visual C++ 运行库的电脑上会打不开，而这台虚拟机装了 Build Tools 之后测不出来（§7.2）。

### W-2 · 升级验证（虚拟机里没装过 Spool ⇒ 走老用户真实会走的路）

- 下 GitHub 上的 **v0.6.1**（`https://github.com/KIM-ocean-HZ/spool/releases/download/v0.6.1/Spool-windows-x64-setup.exe`）到 `C:\Users\hzjin\spool-p13\`，装上、打开。Ocean 写几块：文字、一个挂文件（文件放 `spool-p13` 里）、一个更正关系；中文、英文都写一点。托盘退出。
- 把 `%APPDATA%\com.oceanjin.spool\spool.db` 拷进交换文件夹（Spool 已退出，WAL 已合并；拷之前看一眼旁边没有 `-wal` 或它是空的）。Mac 上：`sqlite3 -readonly` 数各表、各列 `SUM(LENGTH)`；照 P9W 附录 A 的 `mig.test.ts`（Mac 上跑，路径换成 Mac 的）在**副本的副本**上跑一遍真迁移 v23 → v38：`fresh === false`、每张老表条数和每一列 `SUM(LENGTH)` 不变、新表空。过了再往下。
- 双击 W-1 的包**覆盖安装**；打开一次、等首页出来、托盘退出。再把库拷出来：版本 38、`integrity_check` ok、老表条数和正文长度和装前一样、库旁边多了 `spool.pre-migration-v23-….db`。
- ⛔ **任何时候都别让旧版本的 Spool 打开新版本的库**（Mac 上 05-29 抹过一次真库，就是版本不一致走了重建分支）：覆盖安装之后不再装回 v0.6.1。这一窗**不用 dev 模式**。

### W-3 · 起来、对键盘

- 安装位置一般是 `%LOCALAPPDATA%\Spool\spool.exe`，装完核一下。要日志时：托盘退出 → 从 Mac 用 `prlctl exec … --current-user powershell Start-Process <spool.exe> -RedirectStandardError <spool-p13\logs\run-<时间>.err.log> -RedirectStandardOutput <…out.log>` 起（起来的窗口要出现在 Ocean 的屏幕上；不出现就改成在 `spool-p13` 里放一个 `.cmd`，请 Ocean 双击）。Windows 上捕捉不要授权，这样起不影响结果。
- ⛔ **换装 / 重装 / 退出 Spool 之前先问 Ocean 有没有没点「完成」的字**（`drafts.json` 会存，但照旧问）。
- 先对键盘（§0.3），每一样看日志：Mac 的 control 连按两下 ⇒ 出 `TRIGGER`；⌘ 连按两下 ⇒ 不出（开始菜单弹两次是预期）；⌘C 之后 2 秒内长按 control ⇒ `LONG-PRESS Ctrl … (unused Ctrl+C within 2s before: true)`；Shift 连按两下 ⇒ `DOUBLE-TAP ⇧`；同时看 Mac 那边什么都没弹（§0.2 第 1 条）。结果写进回执，§6 照这个说法念给 Ocean。
- `prlctl send-key-event` 试一下：发一次「control 按下 → 松开 → 按下 → 松开」，日志出 `TRIGGER` 就说明这条路能用（W-4 测时间边界用）。

### W-4 · 和 Ocean 一起走 §6 那张单

- 一条一条来，每条记「过 / 不过 / 没测（为什么）」+ 不过时他看到了什么（截图、原话）；只在虚拟机里成立的标「虚拟机」（§0.5）。要真手指的让 Ocean 做，你看结果：`prlctl capture` 截屏、读日志、把库拷出来读（只读）。
- 长按 / 双击的时间边界我用 `prlctl send-key-event` 补测（Ocean 的手指结果才算验收；这一组只是量边界）：长按 0.7 / 0.9 / 2.9 / 3.2 秒；双击 ⇧ 两下松开相隔 0.25 / 0.35 秒、每一下按住 0.25 / 0.35 秒。
- ⛔ 不往 Ocean 的真文件夹里写东西来「试」：§6 J、L 那几条用 `spool-p13` 里新建的空文件夹。
- 虚拟机里的库全是测试数据，不是 Ocean 的真库；但它照样是那台「Windows 用户」的数据 —— 不手动改库，只通过 Spool 和 MCP 动它。

### W-5 · MCP（你自己跑，不用 Ocean）

- 照 P9W 附录 B：用**库的副本**（`C:\Users\hzjin\spool-p13\probe\`，旁边放 `{"mcpEnabled":true}` 的 `settings.json`）+ `SPOOL_DATA_DIR` 起装好的 `spool.exe --mcp`。附录 B 要 Node：虚拟机里装 Node 22（ARM 原生，一百多 MB）；乙也装。
  ⛔ 别直接连 `%APPDATA%\com.oceanjin.spool`：探针 `initialize` 报的客户端名会被记进 `mcp-clients.json`，设置里就多出一个假客户端。
- 要的结果：`serverInfo.version` 0.7.4；普通 30、`--engine-run` 26，只读 / 写各几个记下来；`get_block_images` 对一块有图的块回 `image/png`（或 jpeg）；对一份**没升级过的老库副本**（W-2 拷出来的 v23）调 `list_threads` 被拒，说要先打开 Spool 升级。
- 路径闸（P12-1）：`propose_attach_file` 填 `%APPDATA%` 下随便一个真文件（完整路径）⇒ 被拒，**拒绝消息里的目录是 `C:\Users\…\AppData`，没有 `\\?\`**；再填 `C:\Windows\` 下一个文件 ⇒ 拒绝消息里是 `C:\Windows`。原话记进回执。
- P15 两个新工具（在副本上）：`create_workspace` 建顶层和子工作区、同名被拒；`propose_link_folder` 填 `C:\Users\hzjin\spool-p13\link-test`（正常排进待审）、同一个路径写成 `C:/Users/hzjin/spool-p13/link-test`（看它怎么处理、存进去的是哪种写法）、`C:\Windows`、`C:\Users\hzjin\AppData\Local`、`C:\Users\hzjin`（整个用户文件夹）、一个隐藏文件夹 —— 后四个都应该被拒；再填一个共享文件夹路径 `C:\Mac\Home\Desktop\Spool\P13-vm-20261106`，**只记它收不收、怎么说，⛔ 不批准、不连**。`list_threads` 的开头说出捕捉目标。

### W-6 · 记录 + 收尾

- 回执写 §7（数字、命令、结果、§6 每一条的结论，哪些是「虚拟机」）。
- HANDOFF：§9.2 记 Ocean 这一窗的答复（从第 258 条往下编）；§9.3 P13 那一行改状态；§9.8 唯一下一步；每个问题一条 `DISCOVERED-YYYYMMDD-N`（§9.9 末尾，格式照抄那里的）；验过的旧条目（§2 最后一行那几条）改状态。
  `git status` 先看一眼：Knote 的工作树常年带着研究线没提交的文档，只暂存你自己的（拿 `git show HEAD:<文件>` 那一份只换上自己的段落，`git hash-object -w` + `git update-index --cacheinfo`；⛔ 别用 `git stash`、别 `git add -p`）。
- 任务书做完移进 `docs/archive/product-taskbooks/`（`git mv`），`docs/README.md` 入口那一行跟着改。
- 提交后跑 `CLAUDE.md` §5 的自查；**推送先问 Ocean**。
- 问 Ocean：问题清单里哪些要修、在哪一窗修；虚拟机里装的工具留不留到发版二（不留就删掉，再用 Parallels 的「释放磁盘空间」把空间还给 Mac）；Mac 上的「暂停捕捉手势」关回去。然后才是发版二。

## 4. 开工先问 Ocean（答完再动手；每个选项都写清好处 / 代价）

1. **在哪儿编？**（Mac 只剩约 21 GB；在虚拟机里装编译工具、从头编一次，估计要占 15 – 18 GB）
   - 甲：先在 Mac 上腾空间，再在虚拟机里编。可以腾的：Windows 安装镜像 `~/Library/Parallels/Downloads/` 里那个 7 GB 的 `.iso`（系统已经装好、光驱已断开，用不上了）；Mac 的编译缓存 `src-tauri/target`（36 GB，`cargo clean` 清掉，下次在 Mac 上编从头来、多十来分钟 —— 发版二打正式包本来也要编）。好处：照任务书原样，编、测、打包都在这台 Windows 里，改了能马上重编。代价：要你先删东西；装工具 + 第一次在转译下从头编，估计一到两小时；测试是在转译下跑的。
   - 乙（推荐）：用 GitHub 的 Windows 机器编、跑测试、打包（P9X、10-31 都是这么验的），虚拟机只装和验。好处：编和测在真的 x64 Windows 上，比转译下跑更能说明问题；装进虚拟机的就是 CI 打的那种包（发版时 Windows 包也是这条线打的）；虚拟机几乎不占空间；二十分钟左右。代价：要先把一个非 main 分支推到公开仓库（P15 的代码会先公开）；sidecar 的测试在 Windows 上没人跑；§4 第 3 条要是选「当场修」，每修一次就再推一次、再等二十分钟。
2. **（不用答，告诉你一声）** 虚拟机里没装过 Spool ⇒ 照 W-2：先装 v0.6.1、你写几块、再用新包覆盖。这就是 Windows 老用户真实会走的路（15 步迁移 + 原地升级）。
3. **验的时候发现问题怎么办？**
   - 甲（推荐）：这一窗只记，验完给你一张清单挑。好处：不在没验完的时候改东西（改了要重打包重验）。代价：修要等下一窗。
   - 乙：小的（文案、明显一两行）当场修，修完重打包重验。好处：一窗做完。代价：这一窗变长；每修一次重编；改的代码 Mac 上也要再验。
4. **AI 那一半测不测？**（Windows 上只有 API 这一条路）会花你那家 API 账户里的钱（周回顾一次几分钱人民币）。
   - 测 DeepSeek：周回顾（结构化卡片 + 「周回顾更新了」小卡）、过期检测各一次，查余额。DeepSeek 不能联网 ⇒ 跟进那一项照旧锁着。
   - 测一家能联网的（OpenAI / Claude / Gemini / Kimi / 通义）：上面那些之外，跟进也能跑一次。代价：那家的钱。
   - 不测：只看锁着的入口和「活动」那一块。
   key 只在虚拟机里 Spool 的设置里粘，⛔ 别发进对话、别写进任何文件或提交。
5. **首启（全新用户第一次打开）要不要验？** 办法：把 `%APPDATA%\com.oceanjin.spool` 临时改名 → 打开 Spool（会建一个全新的库、出现教程和示例项目）→ 看完退出 → 删掉新建的那个、把原来的改回来。
   - 验（推荐）：Windows 上首启只有这样才验得到；虚拟机里全是测试数据，改坏了也不丢你的东西。代价：多十分钟。
   - 不验：留到发版那一窗之后。
6. **虚拟机里装哪个 AI 客户端？**（现在一个都没有；§6 G、K、L 里要 AI 说话的那几条用）
   - Claude 桌面版（推荐）：有 Windows ARM 版，你登录自己的账号。好处：§6 G 那几条（「一键接入」、重开客户端、私密项目不在里面）都能走。代价：要你登录一次。
   - Claude Code：要先装 Node、在浏览器里登录。好处：和 Mac 上的用法一样。代价：多一步。
   - 不装：要 AI 说话的那几条由我用探针代替（工具调对了没有能验，「一键接入」和客户端那一侧验不到）。

## 5. 什么时候停下来问

- `git diff --stat 87c9261 HEAD -- src src-tauri package.json package-lock.json` 不空。
- 编译不过、`tsc` / vitest / cargo 在 Windows 上红 —— 把报错原文给 Ocean，问要不要在这一窗修。
- 打出来的包不是 x64。
- 迁移验证任何一张表条数或正文长度对不上 —— 停，这是数据完整性。
- 安装后打不开 / 白屏 / 库版本不对 —— 停，先确认数据还在，再看日志（白屏：右键 → 检查 → Console 的红字；正式版没开开发者工具的话看 stderr 日志）。
- Mac 剩余空间低于 8 GB。
- 发现 Windows 版 Spool 往 `C:\Mac\…`（Mac 的真文件夹）里写了任何东西 —— 停，先看写了什么、在哪。
- Mac 上的 Spool 被虚拟机里的按键触发了（弹卡、弹面板、换了捕捉目标）—— 停，先确认 Mac 真库没被写。
- 任何要改产品代码、改库结构、推送、对外的动作；任何要碰 Mac 上那个 Spool 的动作（换装先问有没有没点「完成」的编辑）。

## 6. 和 Ocean 一起走的单（大白话，一步一个动作；每条记「过 / 不过 / 没测」，只在虚拟机里成立的标「虚拟机」）

> 念给 Ocean 的时候：先说这条要他做什么，再说看到什么算对。虚拟机里「Ctrl」都按 Mac 的 **control**，「Alt」是 option，「Win 键」是单按 ⌘（W-3 实测过的说法为准）；捕捉手势是**双击 Ctrl**。
> 虚拟机是英文系统，Spool 第一次打开会是英文（跟随系统，这本身就是第 3 条）；Ocean 要中文就在设置里切，按钮名照他界面上的语言说。
> 测试用的文件都在 `C:\Users\hzjin\spool-p13\`，别用桌面 / 文档 / 下载（那是 Mac 的）。

**A. 装和开**
1. ☐ 双击 `spool-p13` 里的安装包，SmartScreen 点「更多信息」→「仍要运行」，一路下一步，不要管理员密码。
2. ☐ 打开 Spool：不白屏；主窗大小合适（不超出虚拟机的屏幕、四周留一点缝）。
3. ☐ Windows「设置 → 应用 → 已安装的应用」里 Spool 是 0.7.4；界面语言跟着系统（英文），设置里切中文能切。
4. ☐ 右下角托盘有 Spool 图标（彩色，看得见）；右键有菜单、有「退出 Spool」；点 ✕ 窗口藏起来、app 还在托盘；左键点托盘图标窗口回来。
5. ☐ 升级装的：原来的项目、块、文件都在（W-2 已经数过，这里用眼睛再看一遍）。

**B. 捕捉（双击 Ctrl）**
6. ☐ 浏览器（Edge）里选一段字 Ctrl+C，然后双击 Ctrl：弹卡片，字对；「来源」是那个窗口的标题（浏览器就是网页标题）。开两个浏览器窗口，在后面那个里复制再捕，来源是你复制的那个窗口。
7. ☐ 卡片弹出来直接能打字（批注），回车存；卡片底栏：撤销、改投到别的项目、完成；「固定窗口」按了之后卡片不自己消失、点外面也不收。
8. ☐ 截图：截一块进剪贴板（Win+Shift+S；不行就用「截图工具」→ 新建，§0.3）→ 双击 Ctrl：存成一块**图片**，卡片上有小图。
9. ☐ Win+PrtScn（整屏存进「图片\屏幕截图」文件夹；Mac 键盘没有 PrtScn，用屏幕键盘 `osk` 点，或我发）→ 10 秒内双击 Ctrl：存的是**这张截图**（P9H-7 写的，**从没在 Windows 上跑过**）。（虚拟机：键是屏幕键盘 / Parallels 送的）
10. ☐ 资源管理器里打开 `spool-p13`，选中一张 .png / .jpg，Ctrl+C → 双击 Ctrl：存进来的是**图片本身**，不是文件名。
11. ☐ 主窗里往输入框粘贴一张图、或者拖一张图进来：进的是你正在写的这一块。
12. ☐ 长按 Ctrl 写笔记 —— 11-06 起 Windows 也有了，见 L 组第 63 – 68 条。

**C. 图片**
13. ☐ 块里的图：单击看大图、左右翻；双击进编辑面板，图前图后能写字、能写注释、能删图（点完成才生效）。
14. ☐ 有图的块合并、移到别的项目、复制到别的项目：图都跟着走；Ctrl+Z 撤回后图回来。
15. ☐ 打包（Ctrl+Shift+P）带图的项目：pack 里图那一行是 `![注释](C:/Users/…)` **正斜杠**（P9X `-4`），复制路径在资源管理器里打得开。

**D. 项目文件**（文件都放 `spool-p13` 里）
16. ☐ 右栏「项目文件」加一个文件（按钮 / 从资源管理器拖进来）：列出来、新的在上、带时间；**默认 AI 可读**的开关是开的。再加一个放在中文名文件夹里的文件（`spool-p13\中文 测试\说明.txt`）：照样列出来、打得开。
17. ☐ 块上的回形针把文件挂到这一块：右栏标块号；删这块时问文件去不去；撤销后放回原处。
18. ☐ 资源管理器里把那个文件**挪到 `spool-p13` 下另一个文件夹**（同一个盘）→ 回到 Spool：标「已跟到新位置」；把它**删掉** → 标「找不到了」。
19. ☐ 把一个「AI 可读」的项目文件挪进 `C:\Users\hzjin\AppData\` 下随便一个文件夹 → 回到 Spool：显示「找到了，但没跟过去」那一种，点「是这个」才跟（P9X `-7`）。看完挪回原处。
20. ☐ 点文件名用默认程序打开（pdf / docx 各试一个）。（虚拟机：Parallels 可能交给 Mac 的程序打开 —— 打开了就算过，记是哪边开的）
21. ☐ 「改过」重启之后还在（P12-2）：挂一个 .md / .txt，用记事本改一个字保存 → 回到 Spool 打开那个项目，右栏那一行旁边出现「改过」→ 托盘「退出 Spool」再打开 →「改过」还在 → 点文件名打开它 → 回到 Spool，「改过」没了。

**E. 打包 / 导出**（导出到 `spool-p13\exports\`，别导到桌面）
22. ☐ 单个项目「导出 .md」：存储对话框、存出来的 .md 打得开。
23. ☐ 导出成文件夹（带文件和图片）：导出的文件夹里文件和图都在、.md 里的相对链接**在 Windows 上点得开**（记斜杠方向）。
24. ☐ 工作区导出成文件夹：`INDEX.md` + 每个项目一个 .md，带文件和图片那张清单。

**F. 界面**
25. ☐ 深浅色（P9B-1）：设置里「跟随系统 / 浅色 / 深色」；虚拟机的 Windows 设置 → 个性化 → 颜色里切深色，主窗和捕捉卡片都跟着变；**窗口标题栏**跟不跟着变也看一眼（记原样）。
26. ☐ 左栏织布：自己写 / 捕捉一块，针数 +1（AI 写的不算）；点左栏那一块，柜子从底部滑上来；兑换、撤销。`knit.json` 有记录。
27. ☐ 专注时间：左栏专注时钟在走；**15 分钟不碰虚拟机的键盘鼠标**之后停（`GetLastInputInfo`，Windows 专有；这 15 分钟你在 Mac 上干别的就行）；周回顾「活动」里今天那根柱子对得上。（虚拟机）
28. ☐ 撤销 / 重做：Ctrl+Z 撤、**Ctrl+Shift+Z 或 Ctrl+Y** 重做。
29. ☐ 没写完的字不丢：编辑面板里写一段不点完成 → 托盘「退出 Spool」→ 再开：提示上次没点完成的块，「去看」跳过去、字在。
30. ☐ 左栏：工作区默认折叠、只展开当前项目那一支；单击工作区名打开工作区页面，双击改名；项目全完成的工作区进底部「归档」。
31. ☐ **工作区页面顶上的大标题双击也能改名**（P12，10-28 新加）：回车 / 点别处存；左栏的名字跟着变；改成同一层已有的名字 → 存成「名字 2」并提示一句。
32. ☐ 项目里查找（Ctrl+F）：在本项目里按时间跨块走、首尾相接。
33. ☐ 「复制到…」先查重，「删掉原块」变成移动，Ctrl+Z 一次撤回。
34. ☐ 私密项目：右键「设为私密…」→ 项目上有标记、右栏不说 AI 读得到；Spool 自己的 AI 入口在这个项目里关着。
35. ☐ 休息提醒（时间调成最短那一档）：到点弹出，盖在别的窗口上面；点一下能提前结束。
36. ☐ AI 写进来的项目亮绿点（P9S）：让一个 MCP 客户端往某个项目写一块（G 组顺带）→ 左栏那个项目亮绿点；点开之后绿点消失。

**G. MCP（要 §4 第 6 条装的客户端）**
37. ☐ 设置 → MCP：装了的客户端显示「未配置」，没装的显示「未安装」（装了却说未安装 = Windows 路径猜错了，记是哪个）。
38. ☐ 一键接入 →「已配置」；**完全退出客户端再打开**。
39. ☐ 在客户端里问「我 Spool 里有哪些项目」：列得出来；**私密项目不在里面**。
40. ☐ 「把『这是 Windows 上 0.7.4 的测试』存进 XX 项目」：Spool 里看得到这一块，标着是哪个 AI 写的。
41. ☐ 让 AI「看一下 #n 那一块里的图」（挑一块有图的）：AI 说得出图上是什么。
42. ☐ 让 AI 提议一件要你点头的事（「这一块被那一块取代了」或「把 XX 项目拆成两个子项目」）：Spool 待审里冒出一张卡（Spool 在后台也会几秒内自己出来）；点同意后生效，Ctrl+Z 能整个撤回。

**H. AI（§4 第 4 条答「测」才做；Windows 上只有 API）**
43. ☐ 设置 →「AI 引擎」：本机 CLI 那一块在 Windows 上没有 / 写着用不了（预期）；API 那一块粘 key，自动认出是哪家、模型列表拉得出来；「查一下」余额（DeepSeek 有）。
44. ☐ 周回顾选 API 跑一次：一个项目一张卡（做了什么 / 卡在哪 / 信号 / 建议动作），依据原话照原文；点一个「加一条跟进」→ 生效，Ctrl+Z 撤回。
45. ☐ 周回顾跑的时候切到别的窗口：跑完在捕捉卡的位置弹「周回顾更新了」小卡，不抢键盘，8 秒自己收；点它主窗回来、停在周回顾页。
46. ☐ 设置里语言切另一种再跑一次周回顾：内容跟着界面语言、依据原话和项目名照原文（P12-5）。看完切回来。
47. ☐ 过期检测：在一个有几个项目的工作区里「查整个工作区」：跑得完、结果能点（取代 / 不动）。
48. ☐ （选了能联网的那家才做）跟进：右栏跟进面板里「查一下」跑一次，结果标出来、能关。

**J. 连接文件夹（P9Y / P12；⛔ 用 `spool-p13` 里新建的空文件夹，别用真仓库，别用桌面）**
49. ☐ 新建空文件夹 `C:\Users\hzjin\spool-p13\spool-test`（里面 `git init` 一下，好验 exclude；虚拟机里要有 Git）；新建一个工作区「Win 测试」并在里面建一个项目；项目右栏「连接文件夹…」选 `spool-test`，一路「下一步」→「连接」（「让 AI 读到它」那一步勾上 CLAUDE.md）。看：`spool-test` 里有 `SPOOL.md`，里面写着这个工作区和项目、**路径是 Windows 的写法**；`.git\info\exclude` 多一行 `/SPOOL.md`；`CLAUDE.md` 多一行 `@SPOOL.md`。
50. ☐ 把 `spool-test` 整个挪到 `spool-p13` 下另一个文件夹里（同一个盘）→ 回到 Spool 打开「Win 测试」工作区页面：「连接的文件夹」跟到了新位置（`DISCOVERED-20261025-9`）。
51. ☐ 删除工作区「Win 测试」→ `SPOOL.md` 还在（这时 Ctrl+Z 还能撤回）→ 托盘「退出 Spool」再打开，等 5 秒 →`SPOOL.md` 没了，`CLAUDE.md` 里那一行、exclude 那一行也没了（P12-2）。之后把 `spool-test` 删掉。

**I. 首启（§4 第 5 条答「验」才做；放在最后）**
52. ☐ 临时改名之后第一次打开：建了新库、出现「欢迎使用 Spool」教程和示例项目（英文系统 ⇒ 英文教程）；教程里说的是 **Ctrl** 的说法（不是 ⌥ / 输入监听权限）；Ctrl+Shift+P 打包示例项目有东西；**库旁边没有 `pre-migration-v0` 空快照**（P9X `-5`）。看完照步骤改回来，原来的库都在。

**K. P14 带进来的（11-06：AI 写回自己刷新、附件说清楚、公式表格、读剪贴板 HTML、连着捕不崩、捕捉上限）**
53. ☐ AI 写回之后正开着的项目页自己更新（H2）：Spool 开着某个项目，和 AI 客户端左右并排；点 AI 窗口，让它往这个项目记一条「H2 测试一」→ **不点 Spool**，三秒左右出现在最下面，只一条。（没装客户端就由我用探针写，探针连这台虚拟机里的测试库）
54. ☐ 看不见的时候写：把 Spool 最小化（或者点 ✕ 关到托盘）→ 让 AI 记「H2 测试二」→ 等 10 秒再把 Spool 叫回来：那一条已经在了，或者一叫回来就出现；只一条；不用搜索、不用重开项目。
55. ☐ 看不见很久再写：Spool 最小化**超过 6 分钟**（WebView2 和 Chrome 是同一个内核，后台页面藏久了定时器会被放慢到一分钟一次）→ 让 AI 记一条 → 马上叫回来：照样一叫回来就在。记从叫回来到看见用了几秒。
56. ☐ 没发出去的字和滚动位置不动：输入框里打半句话别发，页面往上滚到中间，让 AI 再记一条 → 半句话还在，页面没跳，新的那条在最下面。
57. ☐ 打包对话框那一行（H3）：一个项目挂 3 个文件，「AI 可读」开着、「打包可读」关着 → 点「打包」：底栏上面一行「有 3 个文件的文字没全在这份里……」，鼠标停在上面列出是哪三个、原因；换一个没有文件的项目，这一行不出现。再点「导出文件夹」导到 `spool-p13\exports\`：`pack.md` 里「Related Files & Links」下第一行是那句说明，`files\` 里是原文件，链接在 Windows 上点得开。
58. ☐ AI 自己读文件（H3，要装了客户端）：对 AI 说「看看 Spool 里〈那个项目〉那几个文件写了什么」→ AI **自己去读**，不叫你另外把文件发给它；把其中一个的「AI 可读」关掉再问 → AI 说这个要你同意，Spool 里出「想读这个文件」的卡。测完开回去。
59. ☐ 公式 / 表格显示：我往库里放一块（或者你从网页捕一块）带 `\( \)`、`$$ $$`、表格、引用、分隔线、删除线、链接的 → 都画出来；`$5 和 $10` 这种钱数照原样；捕捉卡上的公式也画出来；划词选中一个公式、复制出来贴进记事本是 TeX。可选：Parallels 里临时断开网络再打开那个项目 —— 公式照样画（字体是打包进来的）。点链接用默认浏览器开（Parallels 可能交给 Mac 的浏览器，记原样）。
60. ☐ 读剪贴板的 HTML（Windows 的 `HTML Format`）：在虚拟机里的 Edge 打开一个带表格和公式的网页（比如维基百科一个数学条目），选一段 Ctrl+C → 双击 Ctrl：存进去的是表格 + `\( \)` 公式，不是 Tab 隔开的乱字；开头**没有** `Version:0.9 StartHTML:…` 那几行。再在 ChatGPT / Claude 网页（或装了的 Claude 桌面版）选一段带表格的回答复制、捕一次；往输入框 Ctrl+V 贴一次，同样是表格。⛔ 只在虚拟机**里面**复制（Mac 上复制过来的被 Parallels 转过，不算）。
61. ☐ 连着捕不崩（读剪贴板加锁）：复制一段 → 双击 Ctrl，连着做 10 次，中间夹几次长按 Ctrl 带字、截图之后双击 Ctrl → Spool 一直在：托盘图标还在、`spool.exe` 进程还在、日志里没有 panic。
62. ☐ 一次捕捉 50 万字的上限：我在 `spool-p13` 里放两个文本文件（40 万字、60 万字）。记事本打开 60 万字那个 → 全选复制 → 双击 Ctrl：卡片上说这次复制的文字太多、超过上限、请分几段，库里没多东西。再用 40 万字那个：存进去了，卡片只画开头；主窗打开那个项目不卡（几秒内能滚、能打字）。（虚拟机：转译下比真 x64 电脑慢，只看「不卡死」）

**L. P15 带进来的（11-06：Windows 长按 Ctrl 写笔记、双击 Shift 换捕捉目标、两个新的 MCP 工具）**
63. ☐ 长按 Ctrl 写笔记：按住 control 大约 1 秒松开 → 弹笔记卡，**直接能打字**（不用先点卡片），回车存。
64. ☐ 不该弹的五种：按住半秒就松开；按住 4 秒才松开；按住时按了别的键（比如 Ctrl+A）；按住时点了一下鼠标；按住时转了一下滚轮 —— 都不弹。
65. ☐ 带上刚复制的字：选一段字 Ctrl+C，2 秒内长按 control → 卡片里带着那段字；接着再长按一次 → 这次不带（只带一次）。复制之后等 3 秒以上再长按 → 不带。
66. ☐ 长按的那一下不算双击的一半：长按 1 秒松开、马上再短按一下 control → 只弹笔记卡，不弹捕捉卡。
67. ☐ 在 Edge 里用触控板双指捏合缩放几次 → 不弹笔记卡。（虚拟机：测的是 Parallels 怎么翻 Mac 触控板）
68. ☐ 主窗里鼠标一切照常（Spool 现在也收鼠标的原始输入，只看不拦）：点、拖选文字、滚动、拖文件进来、右键菜单。
69. ☐ 双击 Shift 弹面板：在记事本里连按两下 Shift → 鼠标指针那儿弹出小面板，中间一行是现在的捕捉目标；转滚轮一格换一个，上下渐淡；点面板外面 → 关掉，托盘菜单「切换捕捉目标」里换成了刚才中间那个。
70. ☐ 面板：直接点某一行 → 选它并关；打开以后再连按两下 Shift → 关；什么都不动约 6 秒 → 自己收、目标不变；面板开着时打几个字 → 字进记事本，面板不抢键盘；主窗一直不跳到前面。
71. ☐ 不该弹的：按住 Shift 打大写、Shift+方向键选字 → 不弹。设置里关掉「双击 Shift 切换捕捉目标」→ 不弹，打开恢复；托盘「暂停捕捉手势」开着 → 双击 Shift、双击 Ctrl、长按 Ctrl 都不弹。
72. ☐ Windows 上写的是「Shift」不是「⇧」（设置页、面板）。
73. ☐ AI 建工作区（要装了客户端；没有就我用探针做、你看界面）：「在 Spool 里新开一个工作区叫 Win 论文，在里面建一个项目」→ 左栏自己多出来，不用重开。
74. ☐ AI 提议连文件夹，Windows 路径：我先建好 `C:\Users\hzjin\spool-p13\link-test`（一个 `README.md`、`git init`）；对 AI 说「把 C:\Users\hzjin\spool-p13\link-test 关联到 Win 论文，用里面的 README.md 当现状文件」→ 待审里出一张卡，路径是 `C:\…` 写法；点「去连接…」→ 平常那几步、现状文件已经勾好，一路点到「连接」→ 卡消失，`link-test` 里有 `SPOOL.md`。
75. ☐ 没点名的「存进去」：在一个项目顶栏点「捕捉到此」，然后对 AI 说「把这句话存进我现在这个项目」→ AI 说出这个项目的名字、问你要不要存，**没有直接存**。

## 7. 回执（执行窗填写）

### 7.1 Ocean 11-06 夜对 §4 的答复

1. **甲：在虚拟机里编。** 腾空间（Ocean 当场让查、让删）：
   - Mac 的 `src-tauri/target` 已 `cargo clean`。Ocean 的磁盘工具显示 `debug/deps` 124.89 GB、`cargo clean` 报 136.5 GiB，都是把共用磁盘块的文件（硬链接 / APFS 克隆）一份份重复算；`du` 实占整个 `target` 36 GB。删之前核过：没有 MCP 配置、启动项、正在跑的进程指着 `target` 里的程序。⚠️ 下次在 Mac 上打 release 包会撞记忆 §56 那个过程宏 strip 的坑（`CARGO_PROFILE_RELEASE_BUILD_OVERRIDE_STRIP=none`）。
   - `~/Documents/Logic Pro 升级备份 2026-10-24 141408`（179 GB）已删。它是 10-24 卸载两个旧版 Logic（11.0.1、10.7.4）之前做的保护副本；删之前逐个文件核过：副本里 143,538 个文件在原处全都还在、没有一个工程只剩在副本里、没有链接指进去、Logic 的设置文件不提它；现在装的是 Logic Pro 12.4。两个旧版 app 在 OWC Data 的 `Logic备份/` 里另有一份。
   - 删掉的空间要等 Time Machine 这次备份（22:20 开始）做完、本机快照释放后才回来。
2. （不用答）虚拟机里没装过 Spool ⇒ 照 W-2。
3. **只记**，验完给清单（推荐项）。
4. **测：API + GPT 的 MCP。** API 用哪家：到 H 组时 Ocean 粘哪家的 key 就测哪家（能联网的那家，第 48 条跟进也跑）。
5. **验首启。**
6. **AI 客户端装 GPT 那一侧**（ChatGPT / Codex 在 Windows 上哪个能连本地 MCP，装的时候核）。

### 7.2 W-0 进度（11-06 夜）

- **Mac**（`51ed272`，代码 = `87c9261`）：`tsc -b` 干净；vitest **141 个文件 / 1332 条**全过；`i18n-check` 和 `--dead` 都是 `(none missing)`；`cargo tree … --target x86_64-pc-windows-msvc` 那条 grep 空（整棵树 1073 行）；`npm run build:sidecar` 过；`cargo test --lib` **309 过 · 15 ignored**；sidecar **31 过**（从清空的 `target` 从头编）。
- **磁盘**：Ocean「能不能直接删除快照，我不在乎这次的备份」⇒ 停掉 22:20 开始的那次 Time Machine 备份（`tmutil stopbackup`），删掉本机全部 18 个本地快照（`tmutil deletelocalsnapshots /`）；Mac 剩余空间 16 GB → 76 GB → 135 GB。OWC Backup 还接着，之后的自动备份照常。
- **虚拟机工具（不用管理员）**：`C:\Users\hzjin\spool-p13\tools\` 里 Node **v22.23.4**（官方 win-arm64 zip，sha256 对上）、PortableGit **2.56.0.4 arm64**、`rustup-init`（arm64）；`core.autocrlf=false`；用户 PATH 加了 node、git 的 `cmd` 和 `usr\bin`、`~\.cargo\bin`。脚本 `~/Desktop/Spool/P13-vm-20261106/scripts/prep-tools.ps1`。
- **Rust**：`rustup-init -y --default-host x86_64-pc-windows-msvc --profile minimal` ⇒ stable **1.99.1**（2026-10-13），默认 `stable-x86_64-pc-windows-msvc`（转译下跑，第一次读版本超时是正常的）。
- **VS 2022 Build Tools**：`winget` 从 `prlctl exec` 里起，管理员提示一出来连接就断（`PRL_ERR_IO_STOPPED`），winget 跟着没了；改成下官方 `vs_BuildTools.exe`（签名 Microsoft，Valid）、`Start-Process -Verb RunAs` 脱离会话起：`--passive --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64`。⇒ 以后在虚拟机里跑久的命令都用 `scripts/start-detached.ps1` 脱离会话起、写完成记号，别让 `prlctl exec` 一直挂着。
- **代码进虚拟机**：`git clone C:\Mac\Home\Desktop\Knote C:\src\Knote`（共享文件夹的属主是 Everyone，git 要先 `safe.directory` 放行那一个路径）；HEAD `51ed272`，`git diff --stat 87c9261 HEAD -- src src-tauri package.json package-lock.json` 空，工作区干净，`src/lib/pack` 全是 `w/lf`。
- **虚拟机前端那一半**（`scripts/w0-frontend.cmd`，日志在交换文件夹 `logs/w0-*.log`）：`npm ci` 过（npm 10.9.9）；`tsc -b` 干净；`i18n-check` 两条都 `(none missing)`；**vitest 没起来**：`@rollup/rollup-win32-arm64-msvc` 的 `.node` 加载失败（`ERR_DLOPEN_FAILED`），提示缺 Visual C++ 运行库（ARM64）—— 这台虚拟机是全新系统、没装运行库，是开发工具那一侧的事，不是 Spool。装 VS Build Tools 时会一起装上，之后重跑。
- **VS 2022 Build Tools** 23:17 装完（`vswhere` 找到带 `VC.Tools.x86.x64` 的 `…\2022\BuildTools`）。
- **虚拟机 W-0 第二段**（`scripts/w0-rust.cmd`，23:20 – 23:27；rustc 1.99.1 `host: x86_64-pc-windows-msvc`，`bash` = PortableGit 的）：vitest **重跑过了**（装了 Build Tools 之后运行库有了）；`npm run build:sidecar` 过，出 `spool-ai-x86_64-pc-windows-msvc.exe`；sidecar 测试过；`SPOOL_TEST_CC6_MANIFEST=1 cargo test` **库测试 282 过 · 2 红 · 14 ignored**（cargo 在第一个红的测试程序就停，后面的测试程序没跑 ⇒ 又用 `--no-fail-fast` 跑一遍，见下）。
  - 红 1 `mcp::tests::on_windows_a_path_into_appdata_or_a_system_folder_stops_with_or_without_the_prefix`（mcp.rs:18572，`stops(format!(r"{system}\System32\a.dll"))`）：这台机器 `SystemRoot` = **`C:\WINDOWS`（大写）**，规则里是磁盘上的真写法 `C:\Windows`，`Path::starts_with` 分大小写 ⇒ 测试用环境变量拼出来的路径不算在里面。**产品不漏**：`propose_attach_file` / `propose_link_folder` 都是先按 AI 写的判一次、`canonicalize`（得到磁盘上的真写法）之后再判一次；跟着挪动找文件那条拿到的也是系统给的真写法。GitHub 的 Windows 机器上 `SystemRoot` 多半是 `C:\Windows`，所以 CI 一直绿。⇒ 测试的写法问题（`DISCOVERED-20261106-3`）。
  - 红 2 `mcp::tests::propose_link_folder_queues_one_card_per_workspace_and_refuses_what_it_cannot_link`（mcp.rs:20431，P15-2 加的）：库里存的是 `C:\Users\…\thesis`（产品对：给人 / 给 AI 的路径都去掉 `\\?\`），测试拿 `canonicalize` 出来的 `\\?\C:\…\thesis` 去比。P15 这条测试只在 Mac 上跑过。⇒ 同上，测试的写法问题。
  - `cargo test --no-fail-fast`（`scripts/w0b-w1.cmd`）：库测试同样 282 / 2 / 14；`src\main.rs` 和文档测试 0 条。⇒ **Windows 上全部测试 = 282 过 · 2 红（都是测试写法）· 14 ignored。**
  - release 编译 6 分 20 秒（转译下），Windows 上多 10 条「没用到」警告（`screenshot_landed_since`、`spawn_sidecar`、`read_api_key`、`legacy_file_key`、`ThreadMeta.updated_at`、`ShiftTaps::reset`、`WinKeys::reset_gestures`、三个 import）。后两个看过：Windows 上暂停期间是照喂状态、只是不发（`double_tap_win.rs` 那段注释写明了），重新打开要点鼠标，鼠标本身就清掉半截手势 ⇒ 不是漏了复位，只是没用到的代码。
- **W-1 第一次打包失败**：`Target: arm64` → `binaries\spool-ai-aarch64-pc-windows-msvc.exe doesn't exist`（ARM 主机上的 Tauri 命令行按自己的平台定目标）。改用 `--target x86_64-pc-windows-msvc` 重打（`scripts/w1b.cmd`，§0.4 已补）。
- **W-1 安装包**（23:38 – 23:42，release 4 分 26 秒，`Target: x64`）：`Spool_0.7.4_x64-setup.exe` **10,042,083 字节**，sha256 `d563672518b1ed409afec98342edef4fced8e079a51f05a5a776195d51332414`；`spool.exe` 28,192,256 字节 `6855037853f1…2557`、`spool-ai-x86_64-pc-windows-msvc.exe` 1,428,992 字节 `03cbdfd116cc…0bad6`；两个都是 PE、Machine **0x8664（x64）**。拷在 `~/Desktop/Spool/P13-vm-20261106/build/`。
- **导入表**（Mac 上 `objdump -p`）：`spool.exe` **不要** VC++ 运行库（只要系统自带的 `api-ms-win-crt-*`，Windows 10 起都有）；**`spool-ai.exe` 要 `VCRUNTIME140.dll`** ⇒ 没装 Visual C++ 运行库的电脑上，所有走 API 的 AI 功能（周回顾、过期检测、压缩、跟进、认 key / 拉模型列表）都起不来（主程序里没有联网的库，这些全走 spool-ai；`api_engine.rs` 六处 `spawn_sidecar_with`）。v0.6.1 没有 sidecar（装好的文件夹里只有 `spool.exe`）⇒ 发版二是 Windows 上第一次带它。这台虚拟机装 Build Tools 时运行库（x64 / arm64 14.44）已经装上了，⛔ 测不出来，只有静态证据。⇒ `DISCOVERED-20261106-4`。

### 7.3 W-2 进度（11-06 夜，Ocean 睡前让我把能自己做的都做完）

- **v0.6.1 安装包**：`Spool-windows-x64-setup.exe` 6,982,762 字节，sha256 `8814690c…db350a`，没签名（预期）；`/S` 静默装，退出码 0，装在 `%LOCALAPPDATA%\Spool\`（`spool.exe` 21,223,424 字节），「已安装的应用」里 Spool 0.6.1。
- **第一次打开**（从 `prlctl exec` 起，窗口出现在 Ocean 的虚拟机屏幕上 —— §0.1 那一条核过了）：英文界面（跟系统）、英文教程，教程说「double-tap Ctrl」；日志 `Raw Input registered`；库旁边有 v0.6.1 自己留的空 `pre-migration-v0`（老问题，P9X `-5` 修的是新版）。截图 `logs/v061-first-run.png`。
- **往老库里放东西**（`scripts/seed-v061.mjs`，走 v0.6.1 自己的 `--mcp`，`serverInfo` 0.6.1）：两个项目（〈迁移测试（Windows）〉、〈Migration test (EN)〉），7 块（中英文、带 `source_url` / `retrieved_at`、列表 + 表格、约 6000 字的长块、一块用 `ref_kind: corrects` + `corrected_quote` 更正另一块、一块引用另一块）、一条待审的跟进、一句摘要；再照 v0.6.1 的存法插一个挂着的文件（`spool-p13\files\迁移说明.txt`，AI 可读）。之后库 v23、`integrity_check` ok：项目 5、块 19、文件 1、跟进 1、工作区 1。种子用的客户端记录（`mcp-clients.json`，原来没有）已删。
- **副本上跑真迁移**（Mac 上，附录 A 的 `mig.test.ts`，库是从虚拟机拷出来的 `db/v061-seeded-v23.db` 的副本）：v23 → **v38**，`__migrateSchemaForTest` 回 `false`（没走空库重建）；老的 **20 张表、138 列**条数和每列 `SUM(LENGTH)` 一个不差；新的 9 张表（`supersede_proposals` `read_positions` `file_proposals` `block_images` `split_proposals` `folders` `folder_links` `workspace_folders` `folder_proposals`）都空；`integrity_check` ok。
- **为明天备好的**：Codex CLI **0.167.0**（`npm i -g @openai/codex`，`%USERPROFILE%\.codex` 已出现 ⇒ Spool 设置里应显示「已安装」）；`spool-p13\link-test`（README.md + `.env` + `git init`）、隐藏的 `spool-p13\.hidden-dir`、`spool-p13\中文 测试`。
- ⇒ W-1 多核一条：**`spool.exe` 和 `spool-ai.exe` 的导入表里有没有 `VCRUNTIME140.dll` / `MSVCP140.dll`**（Mac 上 `objdump -p` 读）。有的话，没装运行库的 Windows 电脑上 Spool 打不开；装了 Build Tools 之后这台虚拟机就测不出这一点了，只能静态看。

### 7.4 W-2 升级 + W-3 起来（11-06 23:44）

- 升级前在虚拟机上拍了快照 **「P13 before upgrade」**（`{13116fcd-…}`：v0.6.1 + 种好的库 v23 + 新安装包在 `spool-p13\downloads`，工具链和 `C:\src\Knote` 都在）。要重走一遍升级就切回它（`prlctl snapshot-switch "Windows 11" --id {13116fcd-188f-4aee-9d8b-418b28eb4a5e}`）。
- 新包 `/S` 覆盖装：退出码 0，「已安装的应用」里 Spool **0.7.4**，装好的文件夹里 `spool.exe` + **`spool-ai.exe`** + `uninstall.exe`；装完、第一次打开之前库没动。
- 第一次打开（`scripts/run-spool.cmd`，stdout / stderr 进 `spool-p13\logs\run-<时间>.*.log`）：自己迁移，库旁边多了 `spool.pre-migration-v23-2026-11-06T23-44-31-106Z.db`；日志 `Raw Input registered — double-tap Ctrl, long-press Ctrl and double-tap ⇧ armed`、`[overlay] helper started`。
- **升级前后对比**（`scripts/compare_dbs.py`，Mac 上读两份副本）：v23 ok → **v38 ok**；老的 **20 张表、138 列**条数和每列 `SUM(LENGTH)` **0 处不一样**；新的 9 张表都空；项目 5、块 19、文件 1、工作区 1、跟进 1。界面截图 `logs/after-upgrade.png`：两个测试项目在、待审 1。
- ⚠️ 同一秒（23:44:31）`%LOCALAPPDATA%\com.oceanjin.spool\` 里多出一个 **0 字节的 `spool.db`** ⇒ `DISCOVERED-20261106-7`。

### 7.5 W-5 MCP（库的副本，`scripts/probe-w5.mjs`，日志 `logs/w5-probe-*.log`）

- `serverInfo.version` **0.7.4**；普通连接 **30**（只读 15、写 15，全部有 annotations）；`--engine-run` **26**（只读 15、写 11）。
- 没升级的 v23 副本：`list_threads` 被拒 ——「Spool's database is still the older v23; this MCP server is v38. The upgrade happens inside the app — launch Spool once and try again. Nothing is at risk.」
- 路径闸原话（P12-1）：「This file is inside **C:\Users\hzjin\AppData**, where apps keep their own data — Spool's own database included. An AI may not propose files from there.」「This file is inside the system folder **C:\Windows**. An AI may not propose files from system folders.」—— 都没有 `\\?\`。
- `create_workspace`：顶层「Win 探针」、它下面「子工作区」都建成；「win 探针」（大小写不同）被拒、回现有的名字。
- `propose_link_folder`：`C:\Users\hzjin\spool-p13\link-test` 排进待审；同一个文件夹写成 `C:/Users/hzjin/spool-p13/link-test` ⇒ 存成反斜杠写法、换掉前一张；`C:\Windows`、`…\AppData\Local`、整个 `C:\Users\hzjin`、隐藏文件夹、`.env` 当现状文件都被拒，各有一句原因。**Parallels 共享文件夹**（`C:\Mac\Home\…`）被收下、存成 `\\?\UNC\psf\Home\…` ⇒ `DISCOVERED-20261106-5`（只记，没批准）。
- `list_threads` 开头：「The user's capture target right now is ‹Unsorted› …」。
- `get_block_images`：库里存不进图片（`-7`），**没测到**。

### 7.6 不用 Ocean 的手先验了一遍（11-06 23:45 – 11-07 00:40；Ocean 明天的手指才算验收）

按键用 `prlctl send-key-event` 从 Mac 发（`-j` 从标准输入读 `[{"scancode":29,"event":"press"},…]`，一次发完间隔够短；Ctrl = 29，⇧ = 42），走的是虚拟机的虚拟键盘、和人手打字同一条路，**Mac 上的 Spool 收不到**。剪贴板测试期间关了 Parallels 的剪贴板共享（结束已开回）。截图在本窗 scratchpad，关键的几张拷到 `~/Desktop/Spool/P13-vm-20261106/logs/`。

| §6 | 结果 | 怎么验的 / 看到什么 |
|---|---|---|
| 2、3 | 过 | 不白屏；英文界面（跟系统）。版本 0.7.4 见 7.4 |
| 5 | 过 | 7.4 对比 0 处不一样 |
| 6 | 过（虚拟机） | 记事本在前台双击 Ctrl ⇒ 来源「p13-source.txt - Notepad」；Edge 里复制再捕 ⇒ 来源是 Edge 窗口标题（带尾巴，`-8`） |
| **7** | **不过** | 卡片弹出来**拿不到键盘**：日志「the toast did not get the foreground — note box needs a click」，前台一直是记事本 ⇒ `-6` |
| 8 – 11、13 – 15 | **不过（被 `-7` 挡住）** | 剪贴板放一张图双击 Ctrl ⇒ 卡片「The image could not be stored: no such table: blocks」 |
| 25 | 过（待 Ocean 看标题栏） | 改注册表切 Windows 深色 ⇒ 主窗整体变深、标题栏看着也深；已切回浅色 |
| 34 | 部分 | AI 建的私密项目左栏带标记（右键设私密那条路要 Ocean） |
| 36 | 过 | Codex 往 Unsorted 写了之后左栏 Unsorted 亮绿点 |
| 39 | 过 | Codex「我 Spool 里有哪些项目」⇒ 5 个，**不含**私密的〈私密测试〉 |
| 40 | 过 | Codex 先 `dry_run` 再 `add_block`，存进 Unsorted |
| 42 | 卡已排好、待 Ocean 点 | Codex `propose_supersede`（〈Migration test (EN)〉第 2 块取代第 3 块） |
| 52 | 过 | 库临时改名后首启：新库 v38、三个教程项目（6 / 6 / 5 块）、教程说 Ctrl、**没有** `pre-migration-v0`、没有 ⌥ / 输入监控的说法；看完已改回、原库所有文件在 |
| 53 | 过 | Spool 半露在记事本后面、不点它 ⇒ 字数 400,389 → 400,545，自己读到了 |
| 54 | 过 | Spool 最小化时 Codex 写一块，10 秒后**不激活**地还原 ⇒ 字数 400,545 → 400,578 |
| 55 | 过 | Spool 最小化 **33 分钟**、期间 Codex 建工作区 / 排两张卡 ⇒ 不激活地还原 2.5 秒时左栏已有〈第一章〉、待审数字 3 |
| 58 | 前半过 | Codex `list_threads` → `get_blocks(include_extracted_text)`，把〈迁移说明.txt〉全文念出来；关掉「AI 可读」那半要 Ocean 在右栏点 |
| 60 | 过 | 手工造的 HTML Format 和**真 Edge 复制**（Ctrl+A / Ctrl+C）两种都存成 `**粗体**` + `\(a^2+b^2=c^2\)` + 表格（格里 `\(\frac{1}{2}\)`、`` `sqrt(x)` ``）+ 列表，没有 `Version:0.9` 头 |
| 61 | 过 | 连着 10 次换剪贴板 + 双击，夹 3 次长按 ⇒ 10 块都在，两个进程一直没换、日志没有 panic |
| 62 | 过 | 60 万字 ⇒ 卡片「Too much text this time (600,000 characters) — over the 500,000-character limit for one capture. Nothing was saved; copy it in parts and capture each.」，库没变；40 万字 ⇒ 存进去（400,000 字），主窗照常画出来 |
| **63** | **不过** | 长按 1.2 秒弹笔记卡（截图），接着打 `abc` ⇒ 字进了**记事本** ⇒ `-6` |
| 64 | 键盘那三种过 | 按 0.45 秒、3.4 秒、按着 Ctrl 再按 A ⇒ 都不弹；按着点鼠标 / 转滚轮要 Ocean |
| 65 | 过 | 记事本里 Ctrl+A、Ctrl+C，0.3 秒后长按 ⇒ `copied: true`、卡片里是那段字；接着再长按 ⇒ `false`（只带一次） |
| 66 | 过 | 长按 1 秒松开马上短按一下 ⇒ 只一条 LONG-PRESS、没有 TRIGGER |
| 69 | 过（截图） | 双击 ⇧ ⇒ 鼠标处弹「Capture into」面板，当前 Unsorted「now」在中间，下面三个项目，底下提示「Scroll to change · click one, or click outside to finish」 |
| 70 | 部分过 | 约 6 秒不动自己收；面板开着时前台一直是记事本（不抢键盘）；滚轮、点一行、点外面要 Ocean |
| 71 | 部分过 | ⇧ 按住 0.4 秒再点一下、⇧+A 打两次大写 ⇒ 都不弹；设置开关、托盘暂停要 Ocean |
| 73 | 过 | Codex `create_workspace`「Win 论文」+ `create_thread`「第一章」，Spool 最小化着也自己出现 |
| 74 | 卡已排好、待 Ocean 点「去连接…」 | Codex `propose_link_folder`（`C:\Users\hzjin\spool-p13\link-test`、README.md） |
| 75 | 过 | 「把这句话存进我现在这个项目」⇒ Codex 只 `dry_run`、说出〈Unsorted〉、问要不要存，**没写** |

Codex：CLI 0.167.0，Ocean 11-06 23:27 登录（ChatGPT 账号）；`scripts/codex-run.mjs` 用 `-c mcp_servers.spool.*` 临时挂 Spool（`default_tools_approval_mode="approve"`），**`~/.codex/config.toml` 没动** ⇒ 明天第 37 / 38 条照旧从「未配置」开始。九次对话（c0 – c8）每次 10 – 30 秒，记录在 `logs/codex-runs.log`、`logs/codex-c5..c8.log`。

### 7.7 这一夜的新发现（HANDOFF §9.9）

`DISCOVERED-20261106-3`（2 条测试红，测试写法）· **`-4`（spool-ai 要 VC++ 运行库，P1）** · `-5`（UNC 路径带 `\\?\UNC\`）· **`-6`（双击 / 长按 Ctrl 的卡片拿不到键盘，P1）** · **`-7`（Windows 数据目录不一致：图片存不进、导出库会导出空文件，P0）** · `-8`（来源带浏览器尾巴）。

### 7.8 明天给 Ocean 的（只剩要手指、要他定的）

见 HANDOFF §9.8 最上面那段的清单。

（§0 实测的键位、W-0 基线数字（Mac + Windows）、W-1 安装包大小 / 哈希 / 是不是 x64、W-2 迁移前后条数、W-5 MCP 数字和路径闸原话、§6 每一条「过 / 不过 / 没测」和哪些是「虚拟机」、新发现编号、提交号 —— 上面 7.1 – 7.7；没走完的在 HANDOFF §9.8。）

### 7.9 修复轮（11-07 下发，11-09 做完；Ocean 手指验收见 §7.10）

**Ocean 的话（11-07）**：`DISCOVERED-20261106-3` – `-8` 六项发版前全修，连同两条现场反馈 ——「Win 论文」连 `link-test` 报 `Not changed: no such table: workspaces`；**真手长按 Ctrl 完全不弹**。先交最小 diff 审，批准后实现 / 测试 / 重打包 / 装机验证 / 交待验收。不推送、不发版、不改版本号、不换装 Mac 的 Spool。审阅稿在 `~/Desktop/Spool/P13-vm-20261106/research-20261107/03-fix-diff-for-review.md`；11-09「同意，开始任务」（两个待定项按推荐：B0 先量、-4 建干净虚拟机）。中途 Ocean 叫停一次（「先暂停」），之后「continue」。

**提交**（都在 `main`，⛔ 没推送；本地比 `origin/main` 多 18 笔）：`3608575`（-7 + 导出保护）· `9729485`（-6 第一版 + 长按诊断 + -8）· `8d1f315`（-5 + -3）· `bc80a95`（-4）· `130e1a2`（-3 第三处）· `cae94cd`（-6 改正一，作废）· `adee9a9`（-6 改正二，定稿）。实验分支 `exp/p13-fg`（`d52b05a`，只在本地，没合并，已删）。

**每一项：根因 → 改了什么 → 证据**

| 项 | 根因（实测 / 读码） | 改动 | 证据 |
|---|---|---|---|
| **-7** P0 | SQL 插件、前端、MCP 都用 `app_config_dir`（Windows = Roaming），只有 Rust 的 `transfer::data_dir` 用 `app_local_data_dir`（Local）；`images::open_library` 用 `Connection::open` ⇒ 在 Local 建了一个 0 字节的 `spool.db`。图片、文件夹连接 21 个命令、文件跟踪 5 个命令、带图导出、导出 / 导入整库全读它 —— **「no such table: workspaces」就是这条**，和文件夹在哪无关 | `data_dir` → `app_config_dir`，setup 只建这一个目录；Rust 打开库不再新建（去掉 CREATE），打开后验「是 Spool 的库」（`user_version` + `blocks` 表）；导出整库先验源库再动目标 | 装好的包上：剪贴板图片 → 存进 Roaming 真库（`block_images` 一行，png 320×120）+ 打的注释；MCP 探针 `get_block_images` 回这张图；**Codex 真客户端读出图上的字「P13 fix image 1109」**；Local 那个 0 字节文件从 11-06 23:44 起一直没变（没删，按 Ocean 说的留着）。测试：空 / 外来源库不导出且旧备份还在、WAL 里没合并的一行在导出里、不新建也不接受空库、钉住三处同一个目录（Mac + Windows 都过） |
| 导出保护（新发现） | `clear_export_target` 原样比较路径：目录名大小写写得不一样就放行，紧接着 `remove_file` 删的是真库。scratchpad 假目录实测：`FakeData/spool.db` 写成 `fakedata/SPOOL.db` ⇒ 返回 Ok、文件没了（**Mac 上也一样**）；Windows 上另外因为 `data_dir` 指 Local，Roaming 真库根本不在保护里 | 原样比较之外再按磁盘真路径（`canonicalize`）比一次，拒绝仍在任何删除之前 | 新测试修复前红、修复后绿（Mac）；Windows（NTFS）也过 |
| **B0** 真手长按不弹 | **Parallels 的键盘翻译**：默认（`Keyboard optimization mode: auto`）把单独按下的修饰键憋到松开才和松开一起送进 Windows —— 诊断记录里你按了 1 秒的 control，按下和松开是**同一毫秒**到的，按住时长永远 0。prlctl 直接从虚拟键盘注入，绕过这一层，所以昨晚能弹 | Spool 判定**不改**；加了 `SPOOL_GESTURE_TRACE=1` 时才写的诊断（只记 Ctrl / Shift / Alt / Win 的码、时间、判定）+ 三处 emit 失败写日志 + 每张卡一行转权结果 | 虚拟机改成「为游戏优化修饰键」（`prlctl set --keyboard-optimize on`，随时可改回）后，**Ocean 真手**：长按 4 次都弹（按住 1.2 – 1.8 秒），复制后 2 秒内长按卡里带字，`abc` 进卡、Esc 后 `xyz` 进记事本 |
| **-6** P1 | 主进程 `AllowSetForegroundWindow` 对 Raw Input 旁听永远失败 ⇒ 浮窗收到 `focus:false` 连试都不试 | 卡片不管转权成没成都自己抢；**在浮窗主线程上**（排在 show 之后）先直接 `SetForegroundWindow`，被拒就发一个**位移为零的鼠标输入**再试（最多 5 次，每次重发）；回给主进程的是事后真看前台的结果 | 第三版（`adee9a9`）：本次启动以来 **20 张卡 20 张拿到键盘**，记事本 / Edge / 主窗在前 / 主窗最小化 / 主窗藏在托盘 × 双击 + 长按，打的字全进库；关卡（Esc / 空框 Ctrl+Z / 回车）后下一个字母 **10 / 10 进了记事本**；双击 ⇧ 面板照旧不抢键盘；主窗藏在托盘时没被拉出来 |
| -6 走过的两步弯路 | ① 第一版用 tao 的 `set_focus`：能拿到键盘，但它被拒时补的是**光 Alt 按下 + 松开**，落在来源程序上 ⇒ 卡片用 Esc / 空框 Ctrl+Z 关掉后，记事本吃掉下一个字母（弹出菜单）—— 同样步骤 6 / 6 复现；没发这下 Alt 的一次干净；测试脚本自己的终端闪现排除过。② `cae94cd` 换成「Alt + 0xE8」但在**读管道的线程**上调：`SetForegroundWindow` 回 TRUE、卡片却没到前面（12 张只 2 张拿到键盘）。实验版（同一个包里切换做法）量出来：主线程上「Alt+0xE8」和「零位移鼠标」都是 9 / 9 拿到键盘、9 / 9 下一个字母不丢；选鼠标，因为它不往前台程序里按任何键 | —— | 原生小程序和实验版日志在 `fix-20261109/logs/fgtool-*`、`logs/exp/` |
| **-4** P1 | `scripts/build-sidecar.sh` 普通 `cargo build`，sidecar 动态链 VC++ 运行库 | 只在 `*-windows-msvc`：写明 `--target` + `RUSTFLAGS=+crt-static`（只给目标产物），从 `target/<triple>/release` 拷；编完 grep 产物里还有没有 `vcruntime140` / `msvcp140`，有就停。Mac 那一支逐字不变 | 新 `spool-ai.exe` 普通 + 延迟导入只剩系统 DLL（三版同一个哈希 `a17d926d…`）。**新建的干净虚拟机**（无人值守装的 Windows 11 ARM、没有任何 VC++ 运行库，`*_clr0400.dll` 是 .NET 自带的私有副本）：旧 `spool-ai` 退出码 `0xC0000135`（缺 DLL）；新的回它自己的「stdin 不是合法 JSON」、退出码 2 = 起得来；装 Spool 前后系统运行库状态一字不差。**用 key 跑 API：没测**（要你在那台里粘一次 key） |
| **-3** | 测试写法：`SystemRoot` = `C:\WINDOWS`；期望值用了带 `\\?\` 的写法（两处） | 只动测试：先 canonicalize 真目录再拼文件；期望值用 `plain_path`；新加 Windows 测试：磁盘上真有的系统 / AppData 文件、AppData 文件夹，原样 / 小写 / 大写都被拒 | Windows `SPOOL_TEST_CC6_MANIFEST=1 cargo test --no-fail-fast`：**292 过 · 0 红 · 14 ignored**（三版都是）；Mac `--lib` 316 过 · 15 ignored |
| **-5** | `folder_link::plain` 把 `\\?\UNC\server\share` 去成**相对路径** `UNC\server\share`（连上以后读写会按当前目录解析）；另两处保留 `\\?\UNC\` | 三处一个规则（`mcp::plain_path`）：`\\?\C:\…` → `C:\…`，`\\?\UNC\…` → `\\server\share\…`，`Volume{…}` / `GLOBALROOT` 原样。政策不变（照旧要你最后点「连接」） | MCP 探针和 Codex 提议 `\\localhost\C$\Users\hzjin\spool-p13\unc-test`（虚拟机自己的回环共享，不碰 Mac）⇒ 存成 `\\localhost\C$\…`；纯函数测试。**界面上连一次：没测**（Codex 已排好「UNC 测试」那张卡） |
| **-8** | Windows 来源 = 窗口标题原样 | 只对 Edge / Chrome / Firefox 去认得出的品牌尾巴，Edge 另去「Profile N」「and N more pages」；认不准原样留；不碰别的程序、不改旧块 | 第三版真 Edge 捕捉 ⇒ 来源「P13 Edge 复制测试」；纯函数测试（含标题里本来就有 ` - `、`Profile 1`、零宽字符） |

**安装包**（不签名、x64、在 `~/Desktop/Spool/P13-vm-20261106/fix-20261109/`）：

| 版本 | 代码 | 安装包 SHA-256 | 装上的 `spool.exe` | 结论 |
|---|---|---|---|---|
| `build/` | `bc80a95` | `21d3ebb978fa…22068c` | `895b8c5b…9549` | -6 有 Alt 副作用，作废 |
| `build2/` | `cae94cd` | `a5799dd8c84f…a48846` | `7ba75ad3…c93d` | -6 大多拿不到键盘，作废 |
| `build-exp/` | `d52b05a`（实验分支） | `bceaa3b3…f8df` | `11245a76…4850` | 只用来量，作废 |
| **`build3/`** | **`adee9a9`（工作区干净）** | **`6cf618ffeeea51ca6b8360b98dddbfe72bc4c88031be6a159d3ae117fc786f87`**（10,097,725 字节） | **`5b37aee4137f…93c7`**（= 产物打包标记换算后；`spool-ai.exe` `a17d926d…`） | **现在装在「Windows 11」里，就是要你验的这一版** |

装好的 `spool.exe` 和 `target` 里那份差的只是 Tauri 打包时就地改的一个等长标记（`__TAURI_BUNDLE_TYPE_VAR_UNK` → `…_NSS`）—— 昨晚「装好的和交换目录那份哈希不同」也是这个，不是装错。旧的 from-web 包是 11-06 那版，⛔ 别再拿它验修复。

**虚拟机现场**：主虚拟机快照「P13 before fix install (2026-11-09)」（装第一版前，可回退）；键盘「为游戏优化修饰键」= **开**（真手长按要它）；剪贴板共享已开回；Spool 是用 `run-spool-trace.cmd` 起的（带诊断开关，日志在 `C:\Users\hzjin\spool-p13\logs\fix-20261109\`）；记事本里 `p13-source.txt` 有测试打的字没保存（关时选不保存）。干净虚拟机「Spool-clean-P13」开着（4 GB 内存，只读挂了一张放安装包的光盘，没有共享文件夹 / 剪贴板）。

**§6 全部 75 条（这一轮之后）** —— 过 = PASS · 不过 = FAIL · 没测 = NOT RUN · 被挡 = BLOCKED；「手」= Ocean 真手，「自」= 我用自动按键 / 探针 / Codex，「虚」= 只在虚拟机里成立

| § | 结论 | 说明 |
|---|---|---|
| 1 | NOT RUN | 新包是我静默装的；SmartScreen 那一步要你从下载的文件双击（虚） |
| 2 | PASS（自） | 不白屏、主窗大小合适 |
| 3 | PASS（自） | 0.7.4；语言跟随（昨晚） |
| 4 | 部分 | ✕ 收进托盘、进程还在 PASS（自）；托盘图标 / 右键菜单 / 左键点回 NOT RUN（手） |
| 5 | PASS（自） | W-2 对比 0 处不一样 |
| 6 | PASS（自·虚） | 来源是窗口标题；Edge 只剩网页标题（-8） |
| 7 | PASS（自 + 手） | 20 / 20 张卡直接打字、回车存；长按卡 Ocean 真手打 abc 进卡；空框 Ctrl+Z 撤回捕捉 PASS（自）；改投、固定窗口 NOT RUN（手） |
| 8 | PASS（自） | 剪贴板位图 → 图片块 + 注释进真库；用截图工具实际截一次 NOT RUN（手） |
| 9 | NOT RUN | Win+PrtScn（虚） |
| 10 | NOT RUN | 资源管理器复制图片文件（手） |
| 11 | NOT RUN | 往输入框粘 / 拖图（手） |
| 12 | —— | 见 63 – 68 |
| 13 – 15 | NOT RUN | 看图 / 编辑 / 合并移动 / 打包带图（手；-7 修好之前被挡） |
| 16 – 21 | NOT RUN | 项目文件（手；Rust 文件跟踪原来也读错库） |
| 22 – 24 | NOT RUN | 导出（手） |
| 25 | PASS（自） | 标题栏跟不跟着变待你看一眼 |
| 26 – 33 | NOT RUN | 界面（手） |
| 34 | 部分 | AI 建的私密项目有标记（自）；右键设私密 NOT RUN |
| 35 | NOT RUN | 休息提醒（手） |
| 36 | PASS（自） | |
| 37 – 38 | NOT RUN | 一键接入 Codex（手） |
| 39 – 40 | PASS（自） | Codex（昨晚） |
| 41 | PASS（自） | Codex 读出图上的字 |
| 42 | NOT RUN | 取代卡在待审里等你点 |
| 43 – 48 | NOT RUN | API（你已配好 key，要手点） |
| 49 – 51 | NOT RUN | 连接文件夹（手；-7 修好之前被挡） |
| 52 | PASS（自） | 首启（昨晚） |
| 53 – 55 | PASS（自） | |
| 56 | NOT RUN | 半句话和滚动位置（手） |
| 57 | NOT RUN | 打包对话框那一行 + 导出文件夹（手） |
| 58 | 前半 PASS（自）/ 后半 NOT RUN | 关「AI 可读」后请求卡（手） |
| 59 | NOT RUN | 公式 / 表格显示（手） |
| 60 – 62 | PASS（自） | |
| 63 | PASS（手·虚） | **只在虚拟机键盘设成「为游戏优化」时**；默认设置下不弹是 Parallels 的原因（B0）；真 PC 键盘 NOT RUN |
| 64 | 部分 | 键盘那三种 PASS（自）；按住点鼠标 / 转滚轮 NOT RUN（手） |
| 65 | PASS（手） | 带字、只带一次 |
| 66 | PASS（自） | |
| 67 | NOT RUN | 触控板缩放（虚） |
| 68 | NOT RUN | 主窗鼠标（手） |
| 69 | PASS（自） | |
| 70 | 部分 | 不抢键盘 PASS（自，两版）；滚轮 / 点一行 / 点外面 NOT RUN（手） |
| 71 | 部分 | 大写 / ⇧+字母不弹 PASS（自）；设置开关 / 托盘暂停 NOT RUN（手） |
| 72 | NOT RUN | 写「Shift」（手） |
| 73 | PASS（自） | |
| 74 | NOT RUN | 修好了，原来那张「Win 论文 ↔ link-test」卡还在，等你点「去连接…」 |
| 75 | PASS（自） | |
| 加 · 整库往返 | NOT RUN | 单元测试过（含 WAL）；装好的包上「导出 → 导进隔离的新库 → 逐表逐字段 + 图片字节比」要你点导出、导入两下，比对脚本 `fix-20261109/scripts/deep_compare.py` 已备好 |
| 加 · UNC 界面连接 | NOT RUN | 「UNC 测试」卡已排好 |
| 加 · 干净机器跑 API | NOT RUN | 要你在「Spool-clean-P13」里粘 key |

**还剩、要你手指的**（这几条直接挂着这次修的东西，先做；其余 NOT RUN 照 §6 原文）：
1. 待审里两张连接卡点「去连接…」走完：「Win 论文 ↔ link-test」（74）和「UNC 测试」（UNC）⇒ 卡消失、文件夹里有 `SPOOL.md`；再走 49 – 51。
2. 图片：8（截图工具）、10、11、13 – 15。
3. 项目文件：16 – 21。
4. 导出：22 – 24、57；再「设置 → 导出整个库」存到 `C:\Users\hzjin\spool-p13\exports\lib-1109.db` 后告诉我，我做隔离导入和逐字段比对（中间还要你点一次「导入」）。
5. API：43 – 48（用已配好的 key）；干净虚拟机里打开 Spool、粘一次 key、拉一次模型列表。
6. 7 / 63 再真手各来一两次：弹出直接打字、Esc 关掉后马上在记事本里打字 —— 字都该在该在的地方。

**剩下的限制**：
- 63 / 64 的真手结论只在 Parallels 键盘「为游戏优化」下成立；默认设置下 Mac 键盘的 control 长按在 Parallels 里根本到不了 Windows。用 Parallels 跑 Windows 版的 Mac 用户会撞上，建议发版说明写一句（`DISCOVERED-20261107-2`）。
- 抢前台用的是「零位移鼠标输入」，靠的是实测，不是官方保证；抢不到时退回「点一下才能打字」并记日志。
- 物理 x64 电脑、真 PC 键盘、多屏混合缩放、Windows 10、中文用户名，照 §0.5 都没测。
- 干净机器用 key 跑 API、整库往返、UNC 界面连接：没测（上面清单 4、5、1）。
- 最终包是 `adee9a9`；它之后只改文档。

附录：读库 / 在副本上跑真迁移、MCP 探针 —— 照 `docs/archive/product-taskbooks/TASKBOOK-P9W-WINDOWS-V070-VERIFY-2026-10-20.md` 的附录 A、B；那里写的库版本 35、工具数 26 / 25 换成这里 §2 的 **38、30 / 26**。附录 A 的迁移测试在 Mac 上跑（库副本经交换文件夹拷过来）；附录 B 的探针在虚拟机里跑（要 Node 22）。

### 7.10 Ocean 手指验收（11-09 晚）

**Ocean 的话**：「桌面的文件移动到一个文件夹，spool无法自动找回文件，只能手动定位；其他验收都通过了」。追问后：「§6 全部都做了」；本地盘挪动那一行「写着『已跟到新位置』」；第 18 条「记为已知限制，不改代码」；整库导入「现在做，没有未完成的编辑」。

**§6 结论**（取代 §7.9 那张表里的 NOT RUN / 部分）：§7.9 表里凡是 NOT RUN、「部分」里要手做的那半，按 Ocean 口头确认改记 **PASS（手）**，第 18 条见下；已经 PASS（自）的不变；标「虚」的照旧只在虚拟机里成立（63 / 64 的真手结论只在键盘「为游戏优化」下成立）。加的三条 —— 整库往返、UNC 界面连接、干净机器跑 API —— 也 PASS，前两条的证据在下面。

**第 18 条**

| 情形 | 结论 | 证据 |
|---|---|---|
| 本地盘：`spool-p13` 里挪进同一个盘上的子文件夹 | PASS（自 + 手） | 我把 `files\迁移说明.txt` 挪进 `files\挪动测试-1109\`；装好的包读库副本（MCP `get_blocks`）报的是新路径；Ocean 在右栏看到「已跟到新位置」 |
| 虚拟机的桌面（= Parallels 共享过来的 Mac 桌面）里挪 | **已知限制**（Ocean 选，不改代码） | 那条记录的 `target_identity` 是空的。`GetFileInformationByHandleEx(FileIdInfo)` 在 `C:\Mac\Home\…`、`Z:\…`（真路径 `\\psf\Home\…`、`\\Mac\Home\…`）上回错误 87；`spool-p13` 里 16 个文件全拿得到（卷序列号 `642EF522…`）。没有身份就只能显示「不知道挪到哪了」，给「打开最近的文件夹 / 重新选位置」—— 设计好的退路，和 v33 之前挂的文件一样。`DISCOVERED-20261109-3` |

顺带：那个 PDF 是 Ocean Mac 桌面上的真文件。手动定位到 `feiyue\` 之后又挪回了桌面，所以库里那条现在又是「不知道挪到哪了」；Spool 只读不改。

**整库往返（装好的包上）**
- 导出：Ocean 21:37 导到 `spool-p13\exports\lib-1109.db`（SHA-256 `a912fac74147e9170b80ca889582bfa121ff28884024c0cbd940b9e0791f702f`，7,340,032 字节，v38，integrity ok）。和 21:43 的真库副本比（`deep_compare.py import`）：8 张合并表里导出的每一行都在、逐字段一样；多出来的只有 21:41 Ocean 真手捕捉的 4 块和那个项目的 `updated_at` ⇒ 导出就是导出那一刻的库。
- 隔离导入：停掉 GUI（Ocean 确认没有没点完成的编辑）→ `%APPDATA%\com.oceanjin.spool` 改名 `…keep-1109` → 起一个空的（v38，自带教程 4 个项目 17 块）→ Ocean「导入一个库」选 `lib-1109.db`，没报错。导入后的副本：workspaces 4 / threads 8 / blocks 99 / block_images 4（图片字节按 SHA-256 一样）/ attachments 2 / follow_up_items 1 全在。逐字段的差异只有设计好的三种：同名工作区「Default workspace」→「Default workspace 2」；捕捉目标让给新库（`is_capture_target` 1 → 0）；文件的本机字段（`target_identity` / `extracted_size` / `extracted_mtime`）留在原来那台。
- 连接的文件夹（`folders` 2 条、`workspace_folders` 2 条）不跟着走：P9Y 定的「导入导出不搬本机连接」，`transfer.ts` 的 `MERGE_TABLES` 里没有它们。Ocean 导完问「工作区连接的文件夹好像没了，还是说本来就没有链接」⇒ 导入完成时没说一声，记 `DISCOVERED-20261109-4`（候选，没做）。
- 换回：停掉 → 测试库改名 `…import-test-1109`（留着，可删）→ 原库改回 → 重启。换回后的库和导入前的副本 `deep_compare.py same`：29 张表全一样（470 个二进制字段按哈希比过）。

**连接文件夹 / UNC**：库里 `folders` 两条 —— `C:\Users\hzjin\spool-p13\link-test` 和 `\\localhost\C$\Users\hzjin\spool-p13\unc-test`，两个文件夹里都有 `SPOOL.md`；UNC 那条也记下了文件夹身份（`W1`，26 字节）。`spool-test` 里没有 `SPOOL.md`，49 – 51 应是在这两条连接上验的。

**剩下的限制**（前两句发版说明要写）：
- 在 Parallels 里长按 Ctrl 要开「为游戏优化修饰键」（`DISCOVERED-20261107-2`）。
- Parallels 共享文件夹（虚拟机默认的桌面 / 文档 / 下载）和网络盘上的文件，挪走后 Spool 跟不上，要手动「重新选位置」（`DISCOVERED-20261109-3`）。
- 抢前台靠实测（零位移鼠标），不是官方保证。
- 物理 x64 电脑、真 PC 键盘、多屏混合缩放、Windows 10、中文用户名：照 §0.5 没测。
- 界面上「导出到数据目录被拒」没手测，只有单元测试（`DISCOVERED-20261109-1`）。

证据文件在 `~/Desktop/Spool/P13-vm-20261106/fix-20261109/`：`db/`（`export-lib-1109.db`、`move1109.db`、`pre-import1109.db`、`fresh1109.db`、`imported1109.db`、`restored1109.db`）、`move-probe/`（身份探针、挪动、MCP 探针和日志）。
