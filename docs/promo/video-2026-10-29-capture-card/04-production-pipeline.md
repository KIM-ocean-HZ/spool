# 制作流程 · 我录屏、我做渲染和效果、你精剪

> **状态**：第三版，2026-10-31；11-01、11-02 更新。P0、P1a、P1b 已在 10-30、P1c 在 11-01 由你电脑上的 Claude Code 做完（报告在 `~/Movies/Spool-video/reports/`，HANDOFF 那条记录里有摘要）；你 11-01 验收样式帧后开头要返工，Claude Code 和 Codex 各做了一版（P1d）；11-01 晚你选定 Claude Code 那版，11-02 照你的三条意见改完。还没录正片。
> 10-31 改版：原来四段 AI 渲染舍弃，开头换成你的构想，渲染改成**代码做的 3D 动效**（§7），实录加同一套效果。
> 11-01：开头调亮；V05 改成窗口绕着 Spool 图标转、一扇扇被拽进去，接标准版标志动画；首尾不用捕捉卡弹窗（`01` §5、§7）。
> 11-01 晚（11-02 改完）：开头不放通知数字、不闪；V05 不用线，窗口直接被吸进图标，图标的圆环用标准版标志动画自己的帧一扇扇合上；变体不再出；「如果」加到 14 句。
> 这一份回答你问过的「我不会渲染，最好 Claude 直接做好录屏截图，再交给 AI 生成渲染，最后剪辑我来做，教程也一样——分析可行性」，并把两支片子共用的演示数据、录制环境写在这里。
> 分镜见 [`01`](01-promo-storyboard.md)、[`02`](02-tutorial-script.md)；镜头清单见 [`05`](05-shot-list.csv)；交给你电脑上的 Claude Code 分阶段去做的提示词见 [`06`](06-claude-code-prompts.md)。

---

## 0. 结论：能做

- **真实界面我来录**。宣传片里所有 Spool 镜头和整支教程，都在你的 Mac 上自动录：脚本开始、停止录屏；点击、打字、⌘C、双击 ⌥ 都由脚本发出，光标平滑移动；每条录完抽帧检查，再从演示库里确认真的多了那一块。
- **渲染也是我做，用代码**。开头、超级 agent、结尾三段是 3D 动效：画面里全是要读清楚的字和要一比一还原的界面，AI 视频模型画不准，所以不用 AI 视频生成。你不需要会渲染，也不用去网页上生成——你看**样式帧**和**动态小样**拍板（§7）。
- **实录加效果**：浮窗、线、「如果」卡翻面，和渲染同一套（`01` §7.4）。
- **旁白用 ElevenLabs 的 AI 配音**，宣传片英文，教程中英两版。你在网页上逐句生成。
- **最后交给你**：一版粗剪成片，加一整包素材和一条能导入 DaVinci Resolve / Final Cut 的时间线。精剪你来做。

**我查过你的 Mac（只读，10-29）**：OBS、ffmpeg、Claude 桌面版、ChatGPT 桌面版、Claude Code、Codex、Word、PowerPoint、Excel、Keynote、Pages、Chrome、Safari 都已装；macOS 27.0.1。Spool 的按键监听挂在系统会话层（`src-tauri/src/double_tap.rs` 的 CGEventTap），代码里没有过滤脚本发出的按键；P0 已经实测过。

---

## 1. 分工

| 事 | 谁 | 说明 |
|---|---|---|
| 系统授权（屏幕录制、辅助功能、输入监控）、勿扰、菜单栏图标、hosts | **你** | 改系统和安全设置只能你来；§3.1 |
| 往 Spool 里粘 API key（教程第 7 章） | **你** | 我不输入任何 key 和密码；你在镜头外粘，我录粘好之后的样子 |
| 改 AI 客户端的 MCP 设置（演示版点「Connect」） | 我，**先问你** | 它会改你 Claude / Codex 的设置，录完要改回来，§4.3 |
| 演示数据、虚构网页 / 邮件 / 文档 | 我 | §5 |
| 录屏脚本、录制、抽帧检查、素材记录 | 我 | §6 |
| 渲染 RO、RX、RE（代码做的 3D 动效）和实录效果 FX | 我；开头这一轮 Claude Code 和 Codex 各做一版（P1d） | §7 |
| 样式帧、动态小样；两版里挑一版 | **你拍板** | §7.3 |
| 旁白：逐句生成 | **你**（ElevenLabs 网页）；或者你把 key 放进自己电脑的环境变量，我批量生成 | §8 |
| 旁白稿、发音标注、对齐 | 我 | §8 |
| 音乐挑选、授权 | 你选曲库，我按分镜挑候选 | §9 |
| 粗剪、字幕、时间线、交接包 | 我 | §10 |
| 精剪、导出、上传 | **你** | §10 |
| 发片 | **你**，发版二发布之后 | `01` §11 核对单 |

我不会做的：输入密码或 API key、改系统或安全设置、发送邮件或消息、点同意条款、动你的真库。

---

## 2. 阶段

| 阶段 | 状态 | 做什么 | 产出 |
|---|---|---|---|
| P0 试录 | ✅ 10-30 | 改名演示版、授权、录制工具、8 项试验 | `reports/P0-dry-run.md` |
| P1a 来源和演示库 | ✅ 10-30 | 虚构来源文件、录制用的库、快照 A、B | `reports/P1a-sources-and-library.md` |
| P1b 动效、旁白表、渲染包 | ✅ 10-30（按第二版） | 动效 M01–M10、旁白分句表、字幕、给网页生成用的渲染包 | `reports/P1b-graphics-vo-renders.md`；其中渲染包和一部分动效被第三版淘汰（§7.5） |
| P1c 第三版改版 | ✅ 11-01 | 清点 P1b 的东西；补开头要的素材和来源；搭渲染工程；7 张样式帧 | `reports/P1c-v3-rework.md`；你 11-01 验收：V01–V03 太暗，V05 要改，首尾不用弹窗 |
| P1d 开头返工、两版对比 | ✅ 11-01；11-02 改完 | 照 `01` 11-01 版改开头：Claude Code 改它的工程，Codex 另起一个工程做完整的一版；各出 10 张 4K 样式帧、开头 26 秒的 1080p 动态测试、变体片段。11-01 晚你选定 Claude Code 那版、不跑互相验收；11-02 照你的三条意见改完（不出变体） | `review/P1d/claude/REPORT.md` |
| **P2 样片** | **下一步**（等你看完新版开头） | 录宣传片的实录 U02–U12，加效果；渲染出动态小样；配临时配音 → 粗剪 v0 | 你看 v0：节奏、内容 |
| P3 正片 | 发版二构建出来以后 | 从发版二源码做隔离演示版（§4.2），重跑同一套脚本；正式渲染；录教程 | 粗剪 v1 + 交接包 |
| P4 精剪 | P3 之后 | 你在剪辑软件里精剪、出各个版本 | 成片 |
| P5 发片 | 发版二发布之后 | YouTube、B 站、官网；简介里写来源和商标说明 | — |

所有操作都写成脚本、渲染都是工程文件，所以 P3 换成发版二构建重录、改一句字重渲，大部分只是重跑一遍。

---

## 3. 录之前，你的 Mac 要准备什么

### 3.1 你来做

1. **系统设置 → 隐私与安全**：
   - 屏幕录制 + 辅助功能：给 OBS（辅助功能让它的全局快捷键在后台也能用）。
   - 辅助功能 + 屏幕录制：给运行 Claude Code 的那个终端 app（发键盘鼠标事件、截图要用）。
   - 输入监控 + 辅助功能：给演示版 Spool。重新构建或重新签名之后要重给一次，然后完全退出、再打开。
2. **勿扰**：录制期间开专注模式，不弹通知。
3. **菜单栏**：录制画面会裁掉菜单栏，但保险起见先把个人的菜单栏图标隐藏。
4. **hosts**：把虚构网址指到本机的那几行（P1a 的 `hosts.txt`），录完删掉。
5. **Claude 桌面版的快捷入口**：它默认也是双击 ⌥，录制期间在 Claude 设置里先关掉。
6. **退出你自己的正式 Spool**（也可以让 Claude Code 按 pid 停，`--mcp` 子进程一个不动），录完再打开。
7. **只接自带屏的时候**（P1a 时外接屏拔掉了）：舞台就是自带屏，开录前把 VS Code（Claude Code 在里面跑）和程序坞藏起来，录完再显示。接着外接屏的话，把 VS Code 放到外接屏上。
8. **截图的浮动缩略图**：宣传片用不着（截图走剪贴板）；教程第 4 章要当场演示怎么关，录完那一章再说。

### 3.2 Claude Code 来做（会先告诉你要装什么、改什么）

- 装 Python 包（`pyobjc-framework-Quartz` 等，装在单独的虚拟环境里）和渲染要用的 Node 包（§7.4），都不装进系统。
- 配 OBS：场景、录制格式、开始 / 停止录制的全局快捷键。
- 写来源文件、镜头脚本；每条镜头录前截图检查舞台。

---

## 4. 演示版：改名、隔离、和你的真 Spool 错开

### 4.1 样片阶段的演示版（10-30 已做）

- 原来的演示版：`~/Desktop/Spool/Spool-Demo-v0.7.4/Spool Demo.app`（bundle id `com.oceanjin.spool.demo074`，数据在 `~/Library/Application Support/com.oceanjin.spool.demo074/`，PORTFOLIO_FACTS §9.5）。
- P1a 中途按你的要求修了左栏织布卡片的英文溢出（HANDOFF §9.2 第 242 条），并用 v0.7.4 源码 + 这一处修复重建了演示版：显示名「Spool」，「关于」窗口和权限列表里的「Spool Demo」都没了；四项授权你已重给。

### 4.2 正片：从发版二源码重新构建

- 照 PORTFOLIO_FACTS §9.5 的隔离办法，从发版二的 tag 构建一份：显示名「Spool」，identifier 用单独的（例如 `com.oceanjin.spool.demo-r2`），数据目录、钥匙串条目和你的真库分开。
- macOS 27 上 release 构建要带 `CARGO_PROFILE_RELEASE_BUILD_OVERRIDE_STRIP=none`（HANDOFF 记过）。
- 这是 P3 的事，要等发版二打 tag。

### 4.3 和你的真 Spool 错开

- **录制期间正式 Spool 必须退出**：两份都在听双击 ⌥，会捕两次。停 GUI 按 pid 停，绝不 `pkill -f spool`；`--mcp` 子进程是 AI 客户端起的，一个不杀（HANDOFF §10.6 工程护栏）。
- **脚本里激活演示版只用路径或 bundle id**，不用 `activate "Spool"`：按名字激活会拉起正式版，开出第二个实例打开同一个库。
- **AI 客户端的 MCP 设置**：Spool 的一键接入总是写一条叫 `spool` 的配置（`src-tauri/src/mcp.rs` `configure_client`）。在演示版里点「Connect」，会把你 Claude / Codex 里那条 `spool` 改成指向演示版（Spool 会先备份）。画面里显示的就是 `spool`，没有「demo」；代价是你日常的 AI 会连到演示库。**录完在正式 Spool 里再点一次「Connect」就改回来。** 每次录前先问你。
- **每条都查**：画面里没有「Spool Demo」「Terminal probe」「Path changed」、token、¥、模型 ID、开发者菜单、报错（HANDOFF §10.6）。

---

## 5. 演示数据（两支片子共用）

### 5.1 底子和清理（10-30 已做）

- 底子是 v0.7.4 演示库，存在演示版自己的数据目录里。⚠️ 种子脚本一开头就 `rm -rf "$DIR"`，一律不跑；新数据全用演示版的界面和真捕捉加。
- P1a 已经做好：去掉了 Terminal probe 的痕迹；删了种子的 Job search（宣传片 V07 当场新建）；Interview prep 挪进「Job hunt」；Portfolio site 挪进「Side projects」；Work 里建了 Team offsite（9 块，重复的转发邮件是从 Outlook 真捕捉的）。
- 故事里的日期在 `~/Movies/Spool-video/scripts/gen_sources.py` 顶上（目前仍是 15 / 29 November）。开拍前按开拍那天往后推两三周改，别让观众看到过去的截止日。

### 5.2 工作区和项目

| 工作区 | 项目 | 用途 |
|---|---|---|
| Hello | Welcome to Spool | 教程第 0、12 章的捕捉目标；宣传片 11-01 起首尾都不用捕捉卡 |
| Job hunt | **Job search**（主线）、Interview prep | 宣传片主线；教程第 2–8、10、11 章 |
| Study | Machine learning course（种子） | V18 卷轴上的「Learning」 |
| Side projects | Portfolio site（连演示仓库 `~/spool-demo-v074/portfolio-site`） | 教程第 9 章；V18 的「Projects」 |
| Life | Apartment hunt（私密，种子）、Half marathon | V18 的「Life」；教程第 5 章演示设私密 |
| Work | Team offsite | 教程第 8 章压缩 |

「Job hunt」连的文件夹是 `~/spool-video/Job search/`（`CV — Sam Rivera.docx`、`Cover letter.docx`、`PLAN.md`），放在家目录下，免得 macOS 弹文件夹授权。

### 5.3 Job search 的故事数据

D 是制片编号，不写进产品里。来源一栏是真捕捉时的那个软件。

| 编号 | 内容 / 你写的一句 | 来源 | 什么时候进库 | 用在 |
|---|---|---|---|---|
| D01 | 项目摘要："Junior data analyst role at a small London team — by the end of November." | 你写的 | V07 之后（镜头外） | 全程 |
| D02 | "You'll own our reporting end to end — SQL, dbt, and plenty of curiosity." / "Small team — I'd own the whole pipeline." | 浏览器 · Tidewick 招聘页 | V08 第 1 拍 | V09 回答要引到 |
| D03 | 流失看板图表截图 / "Lead with this in interviews." | PowerPoint · 案例 | V08 第 2 拍 | V11 |
| **D17** | **"Lead with your churn dashboard — it shows impact, not just tasks." / "Keep this."** | **浏览器 · 通用的 AI 聊天页**（第三版新增） | V08 第 3 拍 | 「如果」6 |
| D04 | "Could you do a 30-minute call on Thursday?" / "Prep the churn story." | 邮件 · Tidewick 招聘方 | V08 第 4 拍 | 教程第 6 章（改到周五） |
| D05 | "Built a churn dashboard the ops team uses every week." / "Move this to the top." | Word · 简历 | V08 第 5 拍 | V11 |
| D06 | "Expect a live SQL exercise." / "Practise window functions." | PDF · 面试准备清单 | V08 第 6–10 拍 | 教程第 5 章「问我两个面试问题」 |
| D07 | "Hiring night: small data teams from across London." / "Go. Bring CVs." | 浏览器 · 活动页 | V08 第 6–10 拍 | — |
| D08 | "Applications close 15 November." / "Deadline!" | 浏览器 · Quillhaven 招聘页 | V08 第 6–10 拍 | V13 旧的那条 |
| D09 | 投递表截图 / "3 sent, 2 to go." | Excel | V08 第 6–10 拍 | — |
| D10 | "Ask: who reviews my SQL? How do analysts and engineers split the work?" / "Ask both." | 文本编辑 | V08 第 6–10 拍 | — |
| D11 | 决定："Decision: apply to Tidewick first; lead with the churn dashboard; ask about their reporting stack." | **Claude · MCP 真写回**（引 D02、D03、D05） | V10 | V11 要读到 |
| D12 | 跟进："New data analyst openings at small teams in London"（永久，打开每周自动查） | Claude 提议 → 你点「Add it」 | V10 | V12 |
| D13 | 跟进查到的真实招聘信息 | Follow up **真跑** | V12 | 公司名打码 |
| D14 | "We've extended the deadline to 29 November." / "More time." | 邮件 · Quillhaven | **V13 开头真捕捉**（第三版改） | V13 新的那条 |
| D15 | Codex 写的求职信：存成 `~/spool-video/Job search/Cover letter — Tidewick.md`，不写回 Spool（第三版改） | Codex 自己写文件 | V11 | 写不进就只留在对话里 |
| D16 | "We're delighted to offer you the role." / "YES." + 完成结论 "Accepted the Tidewick offer. Starting in January." | 邮件 · Tidewick offer | V17 | — |

**Interview prep**（教程第 8 章「可能已经结束的项目」）：种子里原有的三块留着；"Tidewick final interview: Tuesday 2pm."、"Final interview done."、"Offer received — see Job search." 这三块按你 10-30 的决定，**在存快照 E 之前才加**（免得 AI 在 V09、V11 提前引到「Offer received」）。

**Welcome to Spool**：宣传片不再用（11-01）；教程第 0、12 章怎么用见 `02`。

### 5.4 虚构的人、公司、网址

- 求职者 **Sam Rivera**（虚构）。
- 公司 **Tidewick**、**Quillhaven**；P1a 核过英国公司注册处，照用，另备 Kestrelby、Moorlark、Saltgrove。
- 网址都用 `.example`：`careers.tidewick.example`、`jobs.quillhaven.example` 等。网页服务绑不上 80，用的是 8080（P1a）。
- 网页做成**通用**的样式，不仿任何真实网站；AI 聊天页也是通用的，不像任何一家产品。

### 5.5 来源文件

P1a 已经用 `gen_sources.py` 生成了网页、邮件、文档。第三版要补的：

| 文件 | 用在 | 补什么 |
|---|---|---|
| `web/ai-chat.html` | V08 第 3 拍 | 一页通用的 AI 聊天记录，里面有 D17 那句建议；标签页标题写成「AI chat」之类，不用任何产品名 |
| `docs/scribbles.txt` | 开头 A07 | 记事本里的潦草几行：「Tidewick call Thu?? / deadline 15th or 29th? / ask about the SQL test」 |
| 开头用的窗口截图 A01–A07 | V02 | 见 §7.2，用真实软件打开这些虚构文件截图 |

邮件只在本机用「邮件」打开 .eml，**不发送任何东西**。浏览器里捕捉时，Spool 记的来源是**当前标签页的标题**（`src-tauri/src/capture.rs` `browser_tab_title`），所以每个网页的 `<title>` 要写得像样。

### 5.6 宣传片的数据快照

换的办法：P1a 写的 `swap-snapshot.sh`（按 pid 退出演示版 → 换数据目录 → 用路径重开）。

| 快照 | 状态 | 录什么 |
|---|---|---|
| A | 底子 + Hello；Job hunt 里还没有 Job search | V07 |
| B | Job search 有 D01 + 两块镜头外的捕捉；连好文件夹 | V08 |
| C | D02–D10、D17 已在 | V09–V11 |
| D | + D11–D13 | V12–V14、V16（V13 当场捕 D14） |
| E | Interview prep 加了那三块并已完成 | V17 |

教程用的快照 T0–T4 见 `02` §2。

---

## 6. 自动录屏怎么做

### 6.1 舞台

- **自带屏当舞台**：3024×1964 像素、2 倍清晰，推近 2 倍也不糊。录制时裁掉顶上的菜单栏，留 16:9 的 3024×1701（菜单栏的确切高度在 P0 报告里）。
- 捕捉卡在「当前那块屏的右上角」弹出，所以前台窗口和光标都要在舞台上。
- 只有自带屏时，开录前把 VS Code 和程序坞藏起来（§3.1 第 7 条）。
- 每条镜头开头用 AppleScript 把窗口摆到同样的位置和大小（P0 报告里有坐标）。
- 壁纸换成纯色、桌面不放图标（录完换回）。第三版的效果会把窗口从录像里裁出来放进渲染的空间，所以壁纸颜色不重要，干净就行。

### 6.2 录制

- **OBS**（或 P0 报告里选定的方式）：60 fps，HEVC 高码率硬件编码；开始、停止用全局快捷键。
- 每条前后多录 3 秒。

### 6.3 输入

- P0 写好的 `scripts/spoolinput.py`：平滑移动光标、点击、拖选、组合键、按真人速度打字、双击 ⌥（Spool 要求两下之间不超过 250 毫秒，而且之前 10 秒内按过 ⌘C 或截图快捷键）。
- 每一步记一行时间和坐标（JSON）。**第三版的效果靠它**：线的起点终点、卡片翻面的时刻、推近的位置都从这份日志里取，不用手对。

### 6.4 一条镜头怎么录

1. 摆好舞台、截一张图，查有没有私人信息、窗口对不对。
2. 开始录制 → 跑这条镜头的脚本 → 停止录制。
3. 抽 4–6 帧看；再只读查一下演示库（sqlite3 只读打开），确认真的多了那一块、内容对。
4. 按分镜里写的「通过标准」判断，不过就重来。
5. 记进 `manifest.json`：镜号、第几条、app 版本、commit、快照、AI 客户端版本、有没有真调用模型、等待剪了多少。

### 6.5 AI 的真回答

- 提示词照 `01`、`02` 里写的。回答是真的，每次可能不一样：录到符合通过标准为止，**不改回答里的字**，只加下划线。
- 客户端第一次调用 Spool 工具会问要不要允许：录前先点好「总是允许」（教程第 5 章例外，要拍给观众看）。
- 等待时间剪短，并标 "Waiting time shortened"。

### 6.6 试录清单（P0，10-30 已做，结果见 P0 报告）

| 试什么 | 怎么算过 | 不过怎么办 |
|---|---|---|
| 脚本发出的 ⌘C + 双击 ⌥ | 捕捉卡弹出，内容对 | 那几下你手按：脚本停住，等卡片出现再接着跑 |
| ⌃⌘⇧4 + 拖框 + 双击 ⌥ | 卡片上有图 | 同上 |
| 驱动 Claude 桌面版 | 能打字，能截到回答 | V09、V10 你按提词稿手录，或换成终端里的 Claude Code |
| 驱动 ChatGPT 桌面版里的 Codex | 同上 | 换 Codex 命令行 |
| 录自带屏 | 文件正常，60 fps，有光标 | 换 `screencapture -v` |
| 卡片位置和裁切 | 卡片完整地在 16:9 画面里 | 调裁切 |
| 改名后的演示版 | 菜单栏、窗口、设置里都没有「Demo」 | 从源码重建（10-30 已这么做） |
| 左右分屏 + 时间线滚动 | 新块出现在看得见的地方 | 脚本替它滚 |

---

## 7. 渲染和效果（代码做的 3D 动效）

### 7.1 为什么是代码，不是 AI 视频生成

开头要读清楚 14 句「如果」和几十个文件名，要让 9 扇窗口绕着图标转、在图标正下方被吸进去，图标最后要和标准版标志动画对到 1 像素；结尾要把 14 张卡翻面、和真实截图串成卷轴。AI 视频模型写不准字、画不准界面、控制不了线抓哪一句，10-31 你看过的那四段也说明风格很难稳住。代码做的好处：每个字、每根线都可控；改一句字只要重渲；中文版只是换一份文字表。

### 7.2 要用的素材

| 编号 | 是什么 | 怎么来 |
|---|---|---|
| A01 | 邮件窗口：招聘方来信（D04） | 真实「邮件」打开 .eml，单封邮件的窗口截图（2 倍屏） |
| A02 | Word 窗口：简历 | 真实 Word 截图 |
| A03–A05 | 浏览器：Tidewick、Quillhaven、另一个招聘页 | 真实浏览器截图 |
| A06 | Excel 窗口：投递跟踪表，状态一栏有「?」 | 真实 Excel 截图 |
| A07 | 记事本：潦草的几行（`docs/scribbles.txt`） | 真实「文本编辑」截图 |
| A08 | 通用 AI 聊天窗口（在问：「Which of these roles suits me? I sent you my CV yesterday…」） | 代码画；可以从 P1b 的 M01 改过来 |
| A09 | 通用 AI agent 窗口（「Writing cover_letter_v7.docx… Can you paste your CV again?」） | 代码画 |
| A10 | 凌乱的桌面：通用文件图标和虚构文件名 | 代码画；不用真实桌面、不用系统自带图标 |
| 标志 | 液态玻璃图标、标准版标志动画（组装动效） | 图标 `docs/logo/exports/spool-artwork-srgb-1024.png`（带透明圆角；深色版 `-dark-`）；标志动画 `docs/logo/spool-logo-assembly.mp4`，4K 用本机的 ProRes 母版 `docs/logo/motion/clean-assembly-v1/spool-assembly-clean-v1-2160p60-master.mov`（2160×2160、60 fps、纸白不透明底，不进 git；时间轴和重建步骤在同目录 `README.md`） |
| 实录 | U02–U12 的录像和输入日志 | P2 录的；效果按日志里的坐标对位 |

截图里不许出现你的真实文件、账户、邮件列表。

### 7.3 三步拍板

1. **样式帧**（P1c ✅ 11-01）：7 张。你验收：V01–V03 内容可以但太暗；V05 改成窗口环绕、被拽进图标；首尾不用弹窗。
2. **开头返工、两版对比**（P1d ✅ 11-01；11-02 改完）：Claude Code、Codex 照同一份 `01` 各做一版——10 张 4K 样式帧、开头 26 秒的 1080p 动态测试、一个变体片段（不带线；完整播放标志动画）。11-01 晚你选定 Claude Code 那版、不跑互相验收；三条意见（去掉通知数字、去掉闪烁、V05 不用线、圆环随吸进的窗口合上）11-02 改完，变体不再出。这个工程（`~/Movies/Spool-video/graphics/promo-v3/`）接着做 RX、RE 和实录效果。
3. **动态小样**（P2）：整片 2:00 的低清版，渲染用简化的材质，实录用样片，配临时配音。你看节奏和内容。
4. **正式渲染**（P3）：4K、30 fps，接正式配音和音乐。

每一步不过就改，不往下走。

### 7.4 工具和规格

- **Remotion**（用 React 写视频）+ **three.js**（3D 平面、线、窗口环）。在你的 Mac 上用 Chromium 逐帧渲染。个人和 3 人以下的公司免费（Remotion 许可，Layer3 Labs 2026-10-11 整理）。
- 工程放 `~/Movies/Spool-video/graphics/promo-v3/`（Claude Code 的）；P1d 期间 Codex 的那一版在 `graphics/promo-v3-codex/`。都不进 git。两版的交付放 `review/P1d/claude/`、`review/P1d/codex/`，文件名一样，方便并排看。
- 一个工程管三段渲染（RO、RX、RE）和所有实录效果（FX1–FX6），共用同一套颜色、字体、线和卡片的组件，这样风格自然一致。
- 输出：整屏的 ProRes 422 HQ；叠加层带透明通道的 ProRes 4444；3840×2160、30 fps。
- 中文版：同一个工程，换一份文字表（「如果」、答案、大字）。
- 渲染前先画最满的那一帧看过；每段先写成临时文件名，正常结束再改名。

### 7.5 P1b 做好的东西，第三版怎么处理

| P1b 的东西 | 第三版 |
|---|---|
| M01 通用聊天窗口 | 改成开头的 A08 / A09（降饱和、放进 3D 空间） |
| M02 三个窗口收成一张卡 | 退 |
| M03 笔记卡发黄 | 退（V13 改成真捕捉那封延期邮件） |
| M04 研究那一句 + 四条原则 | 按第三版风格重做（V16） |
| M05 卷轴 | 退，换成 RE |
| M06 按键胶囊、下划线、涟漪、打码框、标签 | 留；颜色和字体对一下第三版 |
| M07 蒙太奇变速 | 留（V08，要等 P2 的录像） |
| M08 纸面换场 | 退 |
| M09 字幕 | 按第三版旁白重出 |
| M10 片尾卡 | 换成标志组装动效 + 网址 |
| S02 的 Reddit 引文小卡 | 退（片中不再引用） |
| `renders/BRIEF.md`（R1–R4，网页生成用） | 退；你生成的 R1–R4 留在原处不删，不再用 |
| `audio/vo-lines.csv` | 宣传片那 17 句按 `01` §6 改成第三版的 13 句；教程的不变 |
| 教程的中英标注、章节卡 | 不变（教程这一轮不改风格） |

P1c 做的 3D 线轴（`SpoolReel`）和捕捉卡（`WelcomeCard`）11-01 起不用，代码留着不删；A11 真卡片截图也不再用。

---

## 8. 旁白（AI 配音）

- **ElevenLabs**（11-02 Hanze 定）：模型 **Eleven v4**（`eleven_v4`），声音 **Adam - Distinct, Deep and Engaging**（`bfGb7JTLUnZebZRiFYyq`），**中英文都用它**；Starter 档。用 API 批量生成：`~/Movies/Spool-video/scripts/vo_generate.py`，key 在 Hanze 自己的钥匙串里（服务名 `spool-elevenlabs`），脚本不打印、不落盘；每次请求记在 `audio/vo-generation-log.csv`（种子、设置都在）。API 直接给 48 kHz / 16 bit WAV，不用再转。⚠️ v4 不认 `speed`（11-02 实测：1.1 和 1.0 一样长），句子长了只能改写，或在剪辑里借相邻镜头的空。
- **授权**：免费档不能商用，Starter 档起才有商用授权（ElevenLabs 价格页，2026-10 查）。
- **用量**：宣传片旁白约 1,200 个字符；教程英文约 1.8 万字符、中文约 4,500 字（含按钮名）；加上重读，Creator 档一个月够用。
- **中文**：ElevenLabs 的中文先试一段；不自然的话，再试一两家中文配音（比如 MiniMax、豆包），挑最自然的。
- **流程**：旁白分句表 `audio/vo-lines.csv` → `vo_generate.py` 逐句生成进 `audio/vo-en/`、`audio/vo-zh/`（不覆盖已有的，往后编 take 号）→ 提示词 4 审（`audio/REVIEW.md`），挑中的复制进 `audio/selected/` → 对到时间线上，哪句太长就改写或重生成。
- **不克隆任何真人的声音**；AI 声音也不冒充作者本人。
- 宣传片开头（V01–V05）**没有旁白**。

---

## 9. 音乐与音效

- **曲库授权**（Artlist、Epidemic Sound、Musicbed 之类）：宣传片一首，教程一首轻的底乐，授权单留档。宣传片的曲子要能分成两半：开头约 16 秒沉闷压抑（或只用音效），V04 双击之后才进主旋律。
- **不用 AI 生成的音乐**：YouTube 要求标注 AI 生成的音乐（`03` §8），而且可能被版权系统认领。
- **音效**：开头的通知声、打字、风扇、闷响、两声「哒」、窗口环绕的呼呼声、每扇窗被吸进图标的一声轻「嗒」、标志落定的一个音，用曲库自带或免版税的。

---

## 10. 粗剪与交接

**我做**：

- **粗剪成片**（1080p MP4）：渲染 + 实录（裁切、变速、推近、效果）+ 旁白 + 音乐（旁白段压低）+ 字幕。按分镜时长排好。
- **交接包**：
  - 每条实录的原素材（HEVC）和加好效果的版本（ProRes）；
  - 三段渲染、效果叠加层（ProRes 4444）；
  - 音频分轨：旁白、音乐、音效；
  - 字幕 SRT（英文、中文）；
  - 一份 **FCPXML 时间线**：DaVinci Resolve（免费）和 Final Cut 都能导入，镜头按分镜排好、长度对好；
  - 渲染工程本身（以后改字、改时长可以重渲）。

**你做**：精剪（节奏、转场、调色、混音细调）、导出各个版本（`01` §10）、上传。

---

## 11. 文件夹和命名

- 素材放 `~/Movies/Spool-video/`。**大文件不进 git。**

```text
Spool-video/
  sources/       虚构网页、邮件、文档（§5.5）
  scripts/       输入辅助脚本、每条镜头的脚本、gen_sources.py、swap-snapshot.sh
  footage/       实录，按镜号命名，如 V08-capture-montage-take02.mov
  graphics/      P1b 的动效；promo-v3/ 是第三版的渲染工程和输出；promo-v3-codex/ 是 Codex 那一版（P1d）
  renders/       第二版的 R1–R4（不再用，留着不删）
  audio/         vo-en/  vo-zh/  music/  sfx/
  edit/          粗剪、FCPXML、字幕
  reports/       每个阶段的报告
  review/P1d/    两版开头的交付和互评（claude/、codex/），左右对比片
  retired-v2/    第二版退下来的动效、渲染包、旧旁白（移动，不删）
  retired-takes/ 重录前移开的旧产物，比如上一条 V11 写出的求职信
  manifest.json  每条素材的来历
```

- 镜头脚本和 `manifest.json` 是小文本，定稿后可以复制一份进本文件夹的 `production/`，方便以后重拍。

---

## 12. 风险和退路

| 风险 | 退路 |
|---|---|
| 脚本发出的双击 ⌥ 不触发捕捉 | 那几下你手按，脚本等卡片出现再继续 |
| 驱动不了 Claude 桌面版 | 你按提词稿手录 V09、V10，或换成终端里的 Claude Code |
| AI 回答每次不一样 | 多录几条，按通过标准挑；绝不改字 |
| Codex 写不进文件夹 | V11 只拍对话里的信，去掉「写进文件夹」那一句（`01` V11） |
| 跟进查不到新东西 | 换一天再跑；实在没有就用真实的「没有新消息」画面（`01` V12） |
| 周回顾动作卡要发版二 | 样片先占位，正片用发版二构建 |
| 录到一半弹系统权限提示 | 每次录前先查一遍授权 |
| 画面露出私人信息 | 裁掉菜单栏、勿扰、单封邮件窗口、AI 侧栏收起；每条录前截图查 |
| 正式 Spool 和演示版同时开着 | 录前退出正式版；激活演示版只用路径或 bundle id |
| 渲染风格你不满意 | 样式帧阶段就停下来改，不往下做动态小样 |
| 实录和渲染接不上 | 两者在同一个渲染工程里合成，共用颜色、线、卡片组件 |
| 4K 渲染太慢 | 动态小样用 1080p；正式渲染分段跑，一段一个文件 |
| 两版各有好坏 | 可以混着挑（比如这家的 V05、那家的配色），说清楚后由被选中的那家照着改 |
| Codex 的沙盒拦住联网或 Chromium | 启动时打开联网（`06`「Codex 怎么开」）；渲染时它会请你批准在沙盒外跑那一条，批准就行 |

---

## 13. 工具现状（2026-10 查；价格以官网下单页为准）

第三版用到的：

| 工具 | 是什么 | 现状和价格 | 出处 |
|---|---|---|---|
| Remotion + three.js | 用代码做视频、做 3D | Remotion：个人和 3 人以下的公司免费 | [Layer3 Labs（2026-10-11）](https://www.layer3labs.io/comparisons/claude-motion-vs-remotion) |
| ElevenLabs | AI 配音 | 旗舰 Eleven v4 / v3；免费档不能商用，Starter 起有商用授权 | [ElevenLabs 价格页](https://elevenlabs.io/pricing) |
| OBS、ffmpeg | 录屏、编码 | 已装 | — |
| cliclick（备选） | 命令行发鼠标键盘事件 | `-e` 参数可以让光标平滑移动；需要辅助功能权限 | [GitHub](https://github.com/BlueM/cliclick) |
| Codex CLI | P1d 的第二版开头 | `-s workspace-write` 只许写工作文件夹，`--add-dir` 再加可写的文件夹；联网默认关，用 `-c 'sandbox_workspace_write.network_access=true'` 打开 | [命令行参考](https://developers.openai.com/codex/cli/reference)、[审批与安全](https://developers.openai.com/codex/agent-approvals-security) |

第二版查过、第三版不再用的（留作参考）：Gemini Omni Flash、Veo 3.1、Kling 3.0 / 4.0、Seedance 2.5、Runway Gen-4.5 等 AI 视频生成，GPT Image 2、Nano Banana 等生图（来源：[9to5Google](https://9to5google.com/2026/05/19/gemini-omni-create-anything-model-video/)、[shattered.io](https://shattered.io/best-ai-video-generators-kling-4-veo-3-1-sora-shutdown-2026/)、[techietory](https://techietory.com/best-ai-video-generators-2026/)、[NoteGPT](https://notegpt.io/blog/nano-banana-2-vs-gpt-image-2)）。Sora 的 app 2026-04-26 关闭、API 2026-09-24 停用（[Make 帮助中心](https://help.make.com/openai-sora-and-video-modules-deprecation-by-september-24-2026)）。AI 音乐不用：商用要付费档，YouTube 要求标注（[licenseorg](https://licenseorg.com/blog/ai-music-licensing-suno-elevenlabs)、[YouTube 帮助](https://support.google.com/youtube/answer/14328491)）。
