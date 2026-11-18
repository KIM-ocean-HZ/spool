# 给 Claude Code（和 Codex）的提示词（分阶段）

> 10-30 写；10-31 按宣传片第三版更新；11-01 加了开头返工、两家各做一版再互相验收的提示词（3c、3d）；11-02 记：3c 做完，你 11-01 晚选定 Claude Code 那版、3d 不跑，开头已按你的三条意见改完。按 `04-production-pipeline.md` §2 的阶段拆成几段提示词，交给你电脑上的 Claude Code（3c、3d 还有 Codex）去做。
> 每段提示词都让它先读本文件的 §0（共同规则）和本目录的方案文件，所以提示词本身不长，规则只写一处。

---

## 怎么用

1. **Claude Code**：开一个终端（或 VS Code 里的终端），`cd ~/Desktop/Knote`，运行 `claude`。只有自带屏时，录制前它会请你把 VS Code 和程序坞藏起来。
2. 把下面某一段提示词整段复制进去；或者只说一句「读 docs/promo/video-2026-10-29-capture-card/06-claude-code-prompts.md，执行里面的提示词 3c（Claude Code）」。
3. **Codex**（只用于 3c、3d）：照下面「Codex 怎么开」打开，再把「提示词 3c（Codex）」整段贴进去。
4. 进度：

| 提示词 | 做什么 | 谁 | 状态 | 你在不在场 |
|---|---|---|---|---|
| 1 | P0 试录 | Claude Code | ✅ 10-30 | — |
| 2 | P1a 来源文件、录制用的演示库、快照 A / B | Claude Code | ✅ 10-30 | — |
| 3 | P1b 动效、旁白表、渲染包（第二版） | Claude Code | ✅ 10-30，一部分被第三版淘汰 | — |
| 3b | P1c 第三版改版：清点、补素材、搭渲染工程、样式帧 | Claude Code | ✅ 11-01；你验收后开头要返工 | — |
| 3c | P1d 照 11-01 的意见重做开头：10 张样式帧 + 开头 26 秒的动态测试 + 变体 | Claude Code、Codex 各做一版 | ✅ 11-01；11-01 晚你选定 Claude Code 那版；11-02 照你的三条意见改完（不再出变体） | — |
| 3d | 互相验收对方那一版 | 两家各跑一次 | 不跑（你 11-01 晚定的） | — |
| 4 | 生成并审旁白（每批用一次） | Claude Code | ✅ 11-02 第 1 批：宣传片 13 句 + 教程中英各 3 句试音；第 2 批：第二轮语言复核改过的 26 句（`audio/REVIEW.md`）；教程其余等 P3 | 不用 |
| **5** | **P2 宣传片实录 + 效果 + 渲染小样 → 粗剪 v0** | Claude Code | **下一步**（等你看完新版开头） | **要在场** |
| 6 | P3 发版二之后：正式渲染、正片、教程、交接包 | Claude Code | 发版二打 tag 之后 | **要在场** |

5. 它跑命令时可能会问你批不批，你可以逐条批，也可以对它说某个文件夹里的脚本直接跑——你自己定。
6. 中途断了：`claude --continue`（Codex 用 `codex resume`）接着上次；或者新开一个会话，贴同一段提示词，再加一句「上次做到第 X 步，先看报告再接着做」。
7. 每个阶段做完，它会写报告（一般在 `~/Movies/Spool-video/reports/`；3c、3d 写在 `~/Movies/Spool-video/review/P1d/` 下各自的文件夹里），下一段提示词会先读这些报告。
8. 你挑定之后，对选中的那一家说一句「用你的版本，再按这些意见改：……改完把结果记进 HANDOFF」，然后再用提示词 5。

### Codex 怎么开（3c、3d 用）

在终端里一次贴进去（`codex` 命令行）：

```bash
mkdir -p ~/Movies/Spool-video/graphics/promo-v3-codex ~/Movies/Spool-video/review/P1d/codex
cd ~/Movies/Spool-video/graphics/promo-v3-codex
codex --add-dir ~/Movies/Spool-video/review/P1d/codex -s workspace-write -a on-request -c 'sandbox_workspace_write.network_access=true'
```

- 这样它只能写自己的工程文件夹和自己的交付文件夹；读仓库里的方案、读 Claude Code 那边的素材不受影响。
- 联网是给 `npm install` 和 Remotion 第一次下载渲染用的浏览器的；Codex 默认不联网（[审批与安全](https://developers.openai.com/codex/agent-approvals-security)）。
- 渲染时它要是说 Chromium 在沙盒里起不来、要在沙盒外跑那一条，批准就行。
- 用 Codex 桌面 app 的话：工作文件夹选 `~/Movies/Spool-video/graphics/promo-v3-codex`，权限里打开联网，并允许写 `~/Movies/Spool-video/review/P1d/codex`。

---

## 0. 共同规则（每段提示词都会让它先读这一节）

方案在 Knote 仓库（`~/Desktop/Knote`）里。任务是按 `docs/promo/video-2026-10-29-capture-card/` 里的方案，制作 Spool 的宣传片和教程。方案文件是唯一依据：

- `README.md`：定下来的事；
- `01-promo-storyboard.md`：宣传片分镜（第三版，镜号 V01–V18；11-01 改过开头、去掉了 Byebye）；
- `02-tutorial-script.md`：教程分镜；
- `03-research-and-claims.md`：每句说法的边界；
- `04-production-pipeline.md`：制作流程；
- `05-shot-list.csv`：镜头清单。

和方案冲突时以方案为准；方案没写的，停下来问用户。

开工前照仓库 `CLAUDE.md` 的要求，先读 `docs/EXECUTION_POLICY.md` 和最新的 HANDOFF（仓库没有 `AGENTS.md`；`CLAUDE.md` 的规则对 Codex 同样适用）。营销在方针里本来是封着的；这件事是用户本人直接交代的一次性任务，按方针 §3.2 记成了 owner interruption（HANDOFF 里搜「视频设计第二份方案已定稿」），所以可以做。产品光标不变，做完回到 P13。

**不能做的**：

1. 不改 `docs/EXECUTION_POLICY.md`；不改 `docs/promo/video-2026-10-29/`（另一份方案）。
2. 不改产品代码（`src/`、`src-tauri/`、`site/` 等），除非用户明确要你修某个产品问题。要构建演示版，在仓库外的临时副本里做。
3. 不碰用户的真库 `~/Library/Application Support/com.oceanjin.spool/`，连只读都尽量不要。`scripts/seed-*.sh` 一开头就 `rm -rf "$DIR"`，一律不跑。
4. 停 Spool 的界面只按 pid 停，绝不 `pkill -f spool`；带 `--mcp` 的子进程一个都不杀（那是各个 AI 客户端起的）。
5. 打开、激活演示版只用完整路径或 bundle id，绝不写 `tell application "Spool"`：按名字会拉起正式版，开出第二个实例打开同一个库。
6. 不输入任何密码、API key、token；要用时停下来，请用户自己输。
7. 系统设置（隐私权限、勿扰、菜单栏、hosts、壁纸）由用户改：你写出一步一步的做法，等他说好了再继续。
8. 演示版里点「Connect」会改用户 AI 客户端的 MCP 设置。点之前先问用户、先备份那几个配置文件；用完提醒他在正式 Spool 里再点一次「Connect」改回来，或者恢复备份。
9. 不发送任何邮件或消息；`.eml` 只在本机打开。不点任何同意条款、登录、购买。
10. 跑 AI 引擎（跟进、过期检测、周回顾、压缩）会用掉用户的订阅额度或 API 费用：每次跑之前说一声。
11. 画面里不许有测试环境的痕迹：「Spool Demo」「Terminal probe」「Path changed」、token 数、¥ 金额、模型 ID、开发者菜单、报错（HANDOFF §10.6）。每条录完都要查。
12. AI 的回答必须是真的：不改回答里的字，不拿事先写好的答案冒充。只能剪短等待、加下划线、打码。
13. 渲染和效果只加在界面的**外面和上面**（空间、线、卡片、下划线、打码），**不改真实界面里的任何一个字**。开头、结尾都不画任何 Spool 界面或捕捉卡；标志只用 `docs/logo/` 里采纳的图标和标准版标志动画，不重画、不调色。开头的桌面、文件名、AI 窗口全部是画的或虚构的，不许出现用户电脑上的真实文件和账户；两个 AI 窗口不像任何一家产品。
14. 大文件（录像、渲染、渲染工程、音频、粗剪）一律放 `~/Movies/Spool-video/`，不进 git。
15. 不提交、不推送，除非用户明说。文件里、提交信息里不写你自己的署名。
16. 录制期间请用户别碰鼠标键盘。只有自带屏时，开录前把 VS Code 和程序坞藏起来，录完再显示。

**每个阶段做完**：

- 在 `~/Movies/Spool-video/reports/` 写一份报告：做了什么、每一项的结果、还要用户做什么、下一步用哪段提示词。
- 在 HANDOFF 那条 owner interruption 记录（搜「视频设计第二份方案已定稿」）末尾补一句这一阶段的结果和报告路径。发现的产品问题按 §9.9 的格式另记 `DISCOVERED-…`。
- 用三五句话告诉用户结果。

---

## 提示词 1 · P0 试录（✅ 10-30 已做完，留作重跑参考）

```text
先读 docs/promo/video-2026-10-29-capture-card/06-claude-code-prompts.md 的 §0（共同规则），再读同一目录的 README.md 和 04-production-pipeline.md 全文。

这一次做 P0 试录（04 §2、§6.6）：把录制工具搭起来，跑 8 项试验，弄清哪些能自动、哪些要我手动。不录正式镜头。我在场。

1. 只读检查：屏幕的分辨率、哪块是主屏、各自的全局坐标范围；OBS、ffmpeg、Claude 桌面版、ChatGPT 桌面版、Claude Code、Codex、Word、PowerPoint、Excel、Chrome、Safari 在不在；演示版和它的数据目录 ~/Library/Application Support/com.oceanjin.spool.demo074/ 在不在；现在有哪些 Spool 进程（列出来，先不动）。

2. 建 ~/Movies/Spool-video/，结构照 04 §11；在 scripts/ 下建一个 Python 虚拟环境，装 pyobjc-framework-Quartz。

3. 写输入辅助脚本 scripts/spoolinput.py（04 §6.3）：
   - 平滑移动（缓入缓出，速度像真人）、点击、拖选、组合键、按真人速度打字（不打错字）、双击 ⌥、等待；
   - 每一步往 JSON 日志里记时间和坐标；每个动作都能从命令行单独调用；坐标一律用全局点坐标；
   - ⌥ 必须发成「修饰键变化」事件（kCGEventFlagsChanged，键码 58；按下时带 Alternate 标志，抬起时清掉），两次按下之间约 120 毫秒。Spool 的判定在 src-tauri/src/double_tap.rs：两下之间不超过 250 毫秒，而且之前 10 秒内要有 ⌘C 或截图快捷键；
   - 要点的按钮，尽量用 System Events 的辅助功能接口拿到它的位置，再平滑移过去点，不要猜坐标。

4. 给我列一张清单，我做完会告诉你：给运行你的终端 app「辅助功能」和「屏幕录制」权限（然后我用 claude --continue 回来）；开勿扰；隐藏个人菜单栏图标；在 Claude 桌面版设置里先关掉快捷入口；同意你按 pid 停掉我正在用的正式 Spool（不动 --mcp 子进程）。

5. 改名演示版（04 §4.1）：先备份原来的 app；做一份显示名「Spool」的演示版；用完整路径打开，请我给它「输入监控」和「辅助功能」，然后按 pid 退出、再用路径打开一次。截图核对菜单栏、窗口标题、「关于」、托盘菜单、设置页，任何地方出现「Demo」都记下来。

6. 录制：请我在 OBS 里按你写的步骤建场景（macOS 屏幕捕捉 → 舞台那块屏，带光标），HEVC 硬件编码、60 fps，存到 ~/Movies/Spool-video/footage/，设好开始 / 停止录制的全局快捷键；你按快捷键录 10 秒，用 ffprobe 查。再试 screencapture -v 作备选，选一个。

7. 跑 04 §6.6 的 8 项试验，每项记：怎么做的、结果、截图或录像路径、不过的话用哪条退路。顺手再试：「邮件」打开 .eml 是不是只开单封邮件的窗口；Word、PowerPoint 第一次打开有没有要我处理的弹窗；第一次从浏览器捕捉时 Spool 要的「自动化」权限，请我点同意。

8. 清理试验时捕进去的块（在演示版界面里删）；退出演示版；提醒我可以把正式 Spool 打开回来。

9. 写报告 ~/Movies/Spool-video/reports/P0-dry-run.md：8 项结果、选定的录制方式、菜单栏高度和裁切参数、窗口摆放坐标、哪几下要我手按、哪几镜要我手录。按 §0 记 HANDOFF。
```

---

## 提示词 2 · P1a 来源文件、录制用的演示库、快照 A 和 B（✅ 10-30 已做完）

```text
先读 docs/promo/video-2026-10-29-capture-card/06-claude-code-prompts.md 的 §0，再读同一目录的 README.md、04 §5 全文和 02 §2。先看 ~/Movies/Spool-video/reports/P0-dry-run.md。

这一次做 P1 的前一半：来源文件、录制用的演示库、快照 A 和 B。不录正式镜头。

1. 公司名核对：到英国公司注册处和网上搜 Tidewick、Quillhaven，撞名就换成 04 §5.4 的备选；报告里写清用了什么。
2. 来源文件（04 §5.5），用一个脚本生成，放 ~/Movies/Spool-video/sources/：网页（通用样式，不仿任何真实网站，<title> 写得像真的）、本地网页服务和要加的 hosts 行、三封 .eml、简历 / 案例 PPT / 面试清单 PDF / 投递表 / 面试问题、~/spool-video/Job search/ 里的三个文件。04 §5.3 里要被选中的句子原样写进去；内容全是虚构的；故事里的日期放在脚本顶上，按开拍日期往后推两三周。
3. 录制用的演示库：先按 pid 退出演示版、把整个数据目录备份到 snapshots/original-v074/；按 04 §5.1、§5.2 改好。能在演示版界面里做的就用界面做；用户写的块、带真实来源的块用真捕捉做，不用 MCP 写。
4. 快照 A、B（04 §5.6），以及 scripts/swap-snapshot.sh（路径写死成演示版的数据目录，碰到正式库的路径就报错退出）。
5. 报告 ~/Movies/Spool-video/reports/P1a-sources-and-library.md。按 §0 记 HANDOFF。
```

---

## 提示词 3 · P1b 动效、旁白表、渲染包（✅ 10-30 已做完；渲染包和一部分动效被第三版淘汰）

```text
（第二版的提示词，不要再跑。第三版改用下面的提示词 3b。）
```

---

## 提示词 3b · P1c 第三版改版：清点、补素材、搭渲染工程、6 张样式帧（✅ 11-01 已做完，留作参考）

> 11-01 验收后，这里写的 V05（线抓字、线轴）、V06（Welcome 卡放大）和 A11 都作废了；开头照提示词 3c 重做。

```text
先读 docs/promo/video-2026-10-29-capture-card/06-claude-code-prompts.md 的 §0，再读同一目录的 README.md、01-promo-storyboard.md 全文（第三版）、03 §0 和 §7、04 §5 和 §7，以及 ~/Movies/Spool-video/reports/ 里所有报告。

10-31 宣传片改成了第三版：
- 原来四段 AI 渲染（R1–R4）舍弃；
- 开头换成「凌乱的桌面 → 窗口炸出来 → 满屏的『如果』→ 双击 → 线把『如果』全卷进线轴 → Welcome 卡放大占满屏幕」，没有旁白；
- 三段渲染（RO 开头、RX 超级 agent、RE 结尾）改用代码做 3D 动效，不用 AI 视频生成；
- 实录加同一套效果（01 §7.4 的 FX1–FX6）；
- 镜号从 S 改成 V01–V19（01 §4 有对照）。

这一次做 P1c：清点 P1b 的东西、补素材、搭渲染工程、出 6 张样式帧。不录正式镜头，不调用任何 AI 生成服务。

1. 清点（04 §7.5）：
   - 要退的（M02、M03、M05、M08、S02 的引文小卡、renders/BRIEF.md）移进 ~/Movies/Spool-video/retired-v2/——移动，不删；
   - 我生成的 R1–R4 留在 renders/ 不动；
   - 要留的（M06、M07）和要改的（M01 → 开头的 A08 / A09，M04 重做，M09 重出，M10 换成标志组装动效）列一张清单。

2. 旁白和字幕：
   - audio/vo-lines.csv 里宣传片那 17 句，换成 01 §6 的 13 句，文件名按新镜号（如 vo-en/V08.wav）；教程的不动；
   - 我要是已经按旧表生成过宣传片的旁白，把那些文件移进 retired-v2/，不删；
   - 宣传片字幕（英文、中文 SRT）按第三版重出；中文版屏幕上的「如果」和答案用 01 §3.1 的中文。

3. 来源补两样（04 §5.5），改 gen_sources.py 生成：
   - web/ai-chat.html：一页通用的 AI 聊天记录，里面有 D17 那句建议；不像任何真实产品，<title> 不用产品名；
   - docs/scribbles.txt：开头记事本里的潦草几行。

4. 开头要的素材（04 §7.2）：
   - A01–A07：用真实软件打开这些虚构文件，单独截窗口（2 倍屏）。画面里不许有我的真实文件、账户、收件箱列表。
     窗口里的内容以 01 V02 为准：A06 投递表的状态一栏要有「?」，原表没有就在 gen_sources.py 里加上再生成；浏览器地址栏要显示虚构的 .example 网址（hosts 那几行要生效，没生效就请我加，或者把地址栏裁掉）。
   - A11：用 P0 报告里截到的真捕捉卡；没有的话截一张新的。
   - A08、A09（通用 AI 窗口）、A10（凌乱桌面：通用文件图标 + 01 V01 里的虚构文件名）用代码画，不用系统自带图标。

5. 渲染工程 ~/Movies/Spool-video/graphics/promo-v3/：
   - 先查 node、npm 在不在、版本多少；没有的话停下来问我，用哪种方式装由我定；
   - Remotion + three.js，装在这个文件夹里，不装进系统；字体用开源的 Geist、Geist Mono、思源黑体（Noto Sans SC），放进工程里；
   - 先做共用组件：空间（暗场、亮场）、窗口平面（圆角、投影、最多 8° 透视）、线（暗场象牙白、亮场琥珀，弹簧运动）、「如果」卡（正面灰、翻面白底琥珀条）、线轴（照 docs/logo/exports/spool-artwork-srgb-1024.png 里那个从上往下看的线轴）、Welcome 卡（照 A11 一比一重画；样式参考 src/overlay/ 和 src/styles/tokens.css，只读）；
   - 颜色、字体、动效照 01 §7；英文、中文各一份文字表；
   - 这个工程以后也负责实录效果 FX1–FX6，所以线和卡片的组件要能按录制日志里的坐标放。

6. 样式帧（01 §8.4 第 1 步）：6 张 3840×2160 的静图（英文主版）——
   - V01 凌乱桌面；
   - V02 窗口炸开；
   - V03 最后一帧（满屏「如果」，一点背景都看不见）；
   - V05 线抓住「如果」的一瞬，右上角 Welcome 卡刚弹出；
   - V06 Welcome 卡放大到一半；
   - V08 一帧加了效果的实录：用快照 B 的真截图拼，左右两块浮窗、一根线连着来源和新的一块、左上角一张刚翻好的卡。
   另外出一张中文版的 V03，看中文排得怎么样。
   自己先对着 01 §7 和 §11 查一遍：字有没有拼错、有没有像真实产品的地方、有没有我的个人信息。

7. 报告 ~/Movies/Spool-video/reports/P1c-v3-rework.md：退了什么、留了什么、新加了什么、7 张样式帧的路径、你自己觉得哪里还不确定。按 §0 记 HANDOFF。
   然后停下来，等我看样式帧。不要往下做动态小样。
```

---

## 提示词 3c（Claude Code）· P1d 照 11-01 的意见重做开头（✅ 11-01 已做完，11-02 照 11-01 晚的意见改完；留作参考）

```text
先读 docs/promo/video-2026-10-29-capture-card/06-claude-code-prompts.md 的 §0，再读同一目录的 README.md、01-promo-storyboard.md（11-01 改过：§1、§2.4、§4，§5 的 V01–V06 和 V18，§7 全部），以及 ~/Movies/Spool-video/reports/P1c-v3-rework.md。

11-01 我验收了你出的样式帧：
1. V01–V03 内容没问题，但太暗，氛围正常一点（像阴天的白天，不像深夜）。
2. V05 有大问题：线又僵又乱；线不要去抓字，改成抓 V02 上那一扇扇窗口；3D 线轴太抽象，看不懂，不要了。
3. 改成：双击之后字散开，V02 的窗口绕着正中的 Spool 图标转起来（像转盘，远近不同、大小跟着变），每扇转到正前方（图标正下方）就被一根线拽进图标；图标随着一扇扇窗口进去越长越大，最后接标准版标志动画。
4. 开头结尾都不用 Spool 弹窗：开头不画 Welcome 卡，结尾不拍 Byebye。
细节都写进 01 了：§5 的 V04、V05、V06（布局数字、节奏、通过标准、两个变体）和 §7（颜色；§7.5 线怎么动）。

这一次做 P1d 你这一半：在你的工程 ~/Movies/Spool-video/graphics/promo-v3/ 里照 01 改开头，出图和开头的动态测试。Codex 会照同一份 01、在另一个文件夹里从头做一版。做完你们互相验收（提示词 3d），我挑一版往下做。

1. 改工程：
   - 开头的颜色照 01 §7.2 调亮，V01–V03 的桌面、窗口、「如果」都跟着改；
   - 不再用 SpoolReel（3D 线轴）和 WelcomeCard，代码留着不删；
   - 线照 01 §7.5 重写：一次一根、软的、有松弛和回弹、不横穿字；V08 那一帧的线也照这个重出；
   - V04：第二圈波纹把字抹开、露出窗口（不用线）；
   - V05：照 01 V05 做窗口环——图标的位置和起止大小、环的俯角和大小、远近缩放和遮挡、正前方在图标正下方且始终不挡图标、线从图标里那根白线的线头伸出来（在 PNG 上量准）、九扇的顺序和节奏、画面一档档变亮；
   - V06：接标准版标志动画。母版 ~/Desktop/Knote/docs/logo/motion/clean-assembly-v1/spool-assembly-clean-v1-2160p60-master.mov 只读：要用的那段先用 ffmpeg 导成图片序列放进工程（或者让 Remotion 直接读视频，你定）；接缝处图标的位置和大小对到 1 像素以内；V05 结尾的背景从母版画面取色，过渡到一样的纸白；
   - 两个开关：线 开 / 关；标志动画 接后半段 / 完整播放（01 V05、V06 的变体）。
2. 交付，全部放进 ~/Movies/Spool-video/review/P1d/claude/（文件名和 Codex 那边一模一样，我要并排看）：
   - frames/ 下 10 张 3840×2160 PNG（英文主版，中文只出 F03z）：
     F01-V01-desktop、F02-V02-windows、F03-V03-ifs（最后一帧）、F03z-V03-ifs-zh（中文版）、F04-V04-double-tap（第二圈波纹正把字抹开）、F05-V05-orbit（九扇在转、图标还小）、F06-V05-pull（第一扇正被线拽向图标）、F07-V05-late（只剩两三扇、图标变大、画面变亮）、F08-V06-lockup（标准版标志 + 大字）、F09-V08-fx（加了效果的实录一帧，线照新规矩）；
     frames/preview/ 下每张一个 1920 宽的 JPG；frames/contact-sheet.jpg（10 张缩在一页，每张下面写文件名）。
   - opening-1080p.mp4：开头 0:00–0:26，1920×1080、30 fps、H.264、无声；左下角小字烧上镜号和时间码；最后 1 秒用 V08-right-spool-B.png 当 V07 第一帧的占位（角上标「占位」），看标志怎么交给真实窗口。
   - variants-1080p.mp4：V04–V06 两遍，规格同上——A「不带线」，B「完整播放标志动画」；每遍前面 1 秒黑底白字写明是哪个。
   - REPORT.md：怎么重渲（命令）；改了什么；V05 实际用的数字（图标起止大小和位置、环的俯角和半径、正前方窗口的大小、九扇的时间点）；开头颜色最后定的值；哪里和 01 不一样、为什么；你自己觉得哪里还不好。
3. 自查：对着 01 §5（V01–V06 的通过标准）、§7、§11 查一遍；动态测试里的线逐帧看（同时两根、直线段、折角、抖动、横穿字都算不过）；接缝前后各 5 帧截出来对比；用 ffprobe 核规格。
4. 这一轮不改 HANDOFF，不改仓库里的任何文件，不碰演示版、快照、~/spool-video/，不打开任何 app。做完停下来，三五句话告诉我结果和文件在哪。
```

---

## 提示词 3c（Codex）· 照同一份分镜从头做一个完整的开头（✅ 11-01 已做完，没被选上；留作参考）

先照上面「Codex 怎么开」打开 Codex，再整段贴进去：

```text
你要在我的 Mac 上给 Spool（一个 macOS / Windows 桌面 app）的宣传片做开头 26 秒的渲染。方案在 Knote 仓库 ~/Desktop/Knote（只读：不改、不提交）。你的工程文件夹是 ~/Movies/Spool-video/graphics/promo-v3-codex/，交付放 ~/Movies/Spool-video/review/P1d/codex/。

先读（都只读）：
- ~/Desktop/Knote/CLAUDE.md：仓库规则（仓库没有 AGENTS.md，这里的规则对你同样适用）；
- ~/Desktop/Knote/docs/promo/video-2026-10-29-capture-card/06-claude-code-prompts.md 的 §0：共同规则，里面说的「你」也指你；
- 同一目录的 README.md、01-promo-storyboard.md 全文（重点 §2.4、§3.1、§5 的 V01–V06、§7）、04-production-pipeline.md 的 §7；
- ~/Movies/Spool-video/reports/P1c-v3-rework.md：另一个 agent（Claude Code）上一轮做的，看清楚现成素材在哪、哪些设计被我否了。

背景：Claude Code 已经做过一版开头的样式帧，我 11-01 验收后提了意见，01 已经照意见改好；Claude Code 会在它的工程里返工。你照同一份 01 从头做一个完整的版本。做完你们互相验收，我挑喜欢的那版往下做。被选中的那一版，后面的超级 agent、结尾两段渲染和实录上的效果（01 §7.4 的 FX1–FX6）都在它的工程里接着做，所以工程要能接着用。

我 11-01 的意见（01 已经写进去了）：
1. V01–V03 内容可以，但太暗，氛围正常一点（像阴天的白天，不像深夜）。
2. V05：线又僵又乱；线不要去抓字，改成抓 V02 上那一扇扇窗口；抽象的 3D 线轴看不懂，不要。
3. 改成：双击之后字散开，V02 的窗口绕着正中的 Spool 图标转起来（像转盘，远近不同、大小跟着变），每扇转到正前方（图标正下方）就被一根线拽进图标；图标越长越大，最后接标准版标志动画。
4. 开头结尾都不用 Spool 弹窗。

现成素材（只读；复制进你的工程再用）：
- ~/Movies/Spool-video/graphics/promo-v3/public/assets/ 里的 A01–A07（真软件截图，私人信息已经处理掉，记录在 EDITS.json），以及 V08-left-safari-tidewick.png、V08-right-spool-B.png（F09 用）；
- ~/Movies/Spool-video/graphics/promo-v3/public/fonts/：Geist、Geist Mono、思源黑体，许可文件在旁边；
- ~/Desktop/Knote/docs/logo/exports/spool-artwork-srgb-1024.png：图标（透明圆角）；
- ~/Desktop/Knote/docs/logo/motion/clean-assembly-v1/spool-assembly-clean-v1-2160p60-master.mov：标准版标志动画的 ProRes 母版（2160×2160、60 fps、纸白不透明底），时间轴在同目录 README.md。
不能用：promo-v3/assets-raw/（里面有我的私人信息）。A08、A09（两个通用 AI 窗口）、A10（凌乱桌面）、文字表（13 句「如果」中英文），你自己照 01 做；不要复制 promo-v3 的代码。

要求：
- 用 Remotion + three.js，装在你的工程文件夹里，不装进系统，版本钉死。先查 node、npm 在不在（本机 nvm 里有 node v24.11.0，Claude Code 用的就是它；命令行里找不到的话先试 source ~/.nvm/nvm.sh）；还是没有就停下来问我。
- 工程要能接着用：中英文字表能切换；有一个把录制日志里的全局点坐标换算成 3D 空间里的点的模块（01 §7.4 FX2 的线要从真实坐标出发）；颜色、字体、动效集中在一处。
- 不打开任何 app（邮件、Word、Safari、Spool 都不开），不碰演示版、快照、~/spool-video/、我的真 Spool 库；~/Movies/Spool-video/ 下除了你那两个文件夹，别的一律不改；不改仓库。
- 不调用任何 AI 生成服务。标志只用上面那两个文件，不重画、不调色。
- 两个开关：线 开 / 关；标志动画 接后半段 / 完整播放（01 V05、V06 的变体）。

交付，放 ~/Movies/Spool-video/review/P1d/codex/（文件名和 Claude Code 那边一模一样，我要并排看）：
- frames/ 下 10 张 3840×2160 PNG（英文主版，中文只出 F03z）：F01-V01-desktop、F02-V02-windows、F03-V03-ifs（最后一帧）、F03z-V03-ifs-zh（中文版）、F04-V04-double-tap（第二圈波纹正把字抹开）、F05-V05-orbit（九扇在转、图标还小）、F06-V05-pull（第一扇正被线拽向图标）、F07-V05-late（只剩两三扇、图标变大、画面变亮）、F08-V06-lockup（标准版标志 + 大字）、F09-V08-fx（照 01 V08 和 §7.4，用两张 V08 真截图拼一帧加了效果的实录）；frames/preview/ 下每张一个 1920 宽的 JPG；frames/contact-sheet.jpg（10 张缩在一页，每张下面写文件名）。
- opening-1080p.mp4：开头 0:00–0:26，1920×1080、30 fps、H.264、无声；左下角小字烧上镜号和时间码；最后 1 秒用 V08-right-spool-B.png 当 V07 第一帧的占位（角上标「占位」）。
- variants-1080p.mp4：V04–V06 两遍，规格同上——A「不带线」，B「完整播放标志动画」；每遍前面 1 秒黑底白字写明是哪个。
- REPORT.md：工程怎么跑（命令）、目录结构、FX 坐标换算怎么用；V05 实际用的数字（图标起止大小和位置、环的俯角和半径、正前方窗口的大小、九扇的时间点）；开头颜色最后定的值；哪里和 01 不一样、为什么；你自己觉得哪里还不好。

自查：对着 01 §5（V01–V06 的通过标准）、§7、§11 查一遍；动态测试里的线逐帧看（同时两根、直线段、折角、抖动、横穿字都算不过）；接缝前后各 5 帧截出来对比；用 ffprobe 核规格；13 句「如果」和 01 §3.1 逐字对。
这一轮不改 HANDOFF。做完停下来，三五句话告诉我结果和文件在哪。
```

---

## 提示词 3d · 互相验收（11-01 晚你定了不跑；留作参考）

Claude Code 和 Codex 都用这一段（Codex 照「Codex 怎么开」打开）：

```text
先读 ~/Desktop/Knote/docs/promo/video-2026-10-29-capture-card/06-claude-code-prompts.md 的 §0，和同一目录的 01-promo-storyboard.md（重点 §2.4、§3.1、§5 的 V01–V06、§7、§11）。

你和另一个 agent 照同一份 01 各做了一版开头：Claude Code 的在 ~/Movies/Spool-video/review/P1d/claude/，Codex 的在 ~/Movies/Spool-video/review/P1d/codex/。现在验收对方那一版：只读，不改对方的任何文件，也不改你自己已经交的东西。

逐条查，每条写「过 / 不过 / 说不准」；不过的写清楚哪个文件、哪一帧（时间码）、怎么改：
1. 字：13 句「如果」（中英）、窗口里的字、大字和 01 §3.1、§5 逐字一致，没有错字。
2. 01 V01–V06 每一镜的通过标准。
3. 线（01 §7.5）：在 opening-1080p.mp4 里逐帧看——有没有同时两根、直线段、折角、抖动、横穿字。
4. V05：前三扇看不看得出是什么；正前方的窗口有没有挡住图标；窗口大小有没有随远近变；九扇的顺序和节奏；画面是不是一档档变亮。
5. 标志：图标和标准版标志动画有没有被重画、调色；接缝前后 5 帧图标有没有跳（截图并排对比）；背景过渡到纸白有没有色差。
6. 颜色：V01–V03 比 P1c 那版明显亮了（对比 ~/Movies/Spool-video/graphics/promo-v3/out/preview/ 里的旧图），但还是沉闷；双击之后是不是一步步变亮。
7. 红线（01 §2.4、§11）：开头结尾没有画 Spool 界面或捕捉卡；没有我的私人信息；两个 AI 窗口不像任何一家产品；没用 assets-raw/。
8. 交付齐不齐、规格对不对（ffprobe 查分辨率、帧率、时长；10 张帧是不是 3840×2160）。
9. 工程能不能接着用：看它的 REPORT 和代码结构，判断后面接 RX、RE 和实录效果顺不顺（中英文字表、坐标换算、颜色字体集中在一处）。不用真去跑它的工程。

最后写总评：对方最好的三处、最该改的三处；哪些地方对方比你自己那版做得好（老实说）。
写进你自己那一边：Claude Code 写 review/P1d/claude/REVIEW-of-codex.md；Codex 写 review/P1d/codex/REVIEW-of-claude.md。这一轮不改 HANDOFF。

只由 Claude Code 再做一件事：把两版的 opening-1080p.mp4 左右拼成一条 ~/Movies/Spool-video/review/P1d/compare-opening.mp4，左右只标 A、B，哪边是谁写在同目录的 key.txt 里，方便我先盲看。
```

---

## 提示词 4 · 审你生成的旁白（每生成一批都可以用）

> 11-02 起旁白由 Claude Code 用 `~/Movies/Spool-video/scripts/vo_generate.py` 生成（Eleven v4 + Adam，`04` §8），API 直接给 48 kHz。照用这段时，把「我放了新生成的旁白」换成「先生成 X、Y，再审」。第 1 批的结果在 `audio/REVIEW.md`。

```text
先读 docs/promo/video-2026-10-29-capture-card/06-claude-code-prompts.md 的 §0，再读同一目录的 01 §6、04 §8，以及 ~/Movies/Spool-video/audio/vo-lines.csv。

我在 audio/vo-en/ 或 audio/vo-zh/ 里放了新生成的旁白。逐个审：

1. 每个文件的时长和 vo-lines.csv 里的目标时长差多少；
2. 用本机能装的语音转文字工具（比如 faster-whisper，装在虚拟环境里）转写一遍，和原文逐字对；装不了就至少核时长和音量；
3. 用 ffmpeg 的 ebur128 量响度；44.1 kHz 的另存一份 48 kHz（原文件不动）；
4. 读错、漏字、太快、太慢的列出来，给出改写建议，或者请我重新生成。

写 audio/REVIEW.md，告诉我哪些要重做。不改我生成的原文件；挑中的复制一份到 audio/selected/。
```

---

## 提示词 5 · P2 宣传片实录 + 效果 + 渲染小样 → 粗剪 v0（你在场）

> 开头已经定了：11-01 晚你选定 Claude Code 那版，11-02 照你的三条意见改完（没有通知数字、不闪、V05 不用线、图标的圆环随吸进的窗口合上；「如果」加到 14 句）。报告在 `~/Movies/Spool-video/review/P1d/claude/REPORT.md`。

```text
先读 docs/promo/video-2026-10-29-capture-card/06-claude-code-prompts.md 的 §0，再读同一目录的 README.md、01 全文、04 全文、05-shot-list.csv，以及 ~/Movies/Spool-video/reports/ 里所有报告和 ~/Movies/Spool-video/review/P1d/claude/REPORT.md（选定的开头，11-02 已按意见改过）。开头还要改什么，我会直接告诉你；先照意见改好，再开始录。

这一次做 P2：录宣传片的实录 U02–U12，加效果，出三段渲染的动态小样，拼成粗剪 v0。我在场。V14 的周回顾建议动作卡在现在的构建里没有：先录现有的周回顾页面占位，标成占位。

录之前：
- 用 swap-snapshot.sh 换到对应快照（04 §5.6）；正式 Spool 已退出；勿扰开着；Claude 的快捷入口关着；网页服务（8080）和 hosts 好了；只有自带屏的话，VS Code 和程序坞藏好；舞台上的窗口按 P0 报告里的位置摆好。
- 故事日期按开拍日期往后推两三周（gen_sources.py 顶上），改了就重生成来源文件。
- V09、V10、V11 要让 AI 客户端连上 Spool：先问我。我同意后，备份 ~/Library/Application Support/Claude/claude_desktop_config.json 和 ~/.codex/config.toml，再在演示版「设置 → MCP」里点 Claude Desktop、Codex 的「Connect」，然后请我重启这两个 app。第一次调用 Spool 工具时的允许弹窗，录之前先点掉（选总是允许）。
- V12、V13 要跑演示版的 AI 引擎（本机 CLI 选 Claude Code）：跑之前告诉我会用我的额度。

每一镜照 01 §5 的画面、时长、通过标准，和 04 §6.4 的流程：
1. 截图查舞台 → 开始录制 → 跑这一镜的脚本（scripts/shots/V08.py 这样，用 spoolinput.py，输入日志一定要存）→ 停止录制。
2. 抽 4–6 帧看；用 sqlite3 只读查演示库，确认真的多了那一块，内容和来源都对。
3. 不过就重录：会改库的镜头，重录前先用 swap-snapshot.sh 换回这一镜的快照。AI 回答对不上（没引到我的批注、V11 没读到前一天写回的决定）就重来，不改字。
4. 记进 manifest.json。
5. 按 04 §5.6，在该存的时候存快照 C、D、E（Interview prep 那三块在存 E 之前才加）。
几处第三版的变化：V08 第 3 拍是 AI 聊天页（D17）；V11 让 Codex 把求职信存进 ~/spool-video/Job search/，写不进就按 01 V11 的退路（每次录 V11 之前，把上一条留下的 Cover letter — Tidewick.md 移进 ~/Movies/Spool-video/retired-takes/，移动，不删）；V13 开头先真捕捉 D14 那封延期邮件；V17 最后加 1 秒 ⌘⇧F 搜「Tidewick」。
V12 查到的真实招聘信息：录完记下每个公司名出现的时间和位置，后面打码用。

效果和渲染（在 P1d 挑定的那个工程里；挑的是 Codex 那版的话，渲染这部分也可以交给 Codex，我来定）：
- 用输入日志里的坐标做 FX1–FX6（01 §7.4）：浮窗、线、「如果」卡翻面（哪一张在哪一镜翻见 01 §3.1）、聚焦、标注、匹配转场。效果只加在界面外面和上面，不改界面里的任何字。
- RX、RE 出 1080p 的动态小样（简化材质就行），RO 用 P1d 挑定的那版；三段和实录接上，V06 的标志要交给 V07 实录的第一帧。

粗剪 v0：~/Movies/Spool-video/edit/promo-v3-v0.mp4，1920×1080，按 01 §4 的时长。我还没生成的旁白先用 macOS 的 say 临时配音，画面角上标「临时配音」；音乐先空着或放临时的；V12 公司名打码；该标的地方加 "Waiting time shortened"。

录完：先问我，然后用备份恢复 claude_desktop_config.json 和 config.toml，或者请我在正式 Spool 里重新点一次「Connect」；告诉我正式 Spool 可以打开回来了。
报告 ~/Movies/Spool-video/reports/P2-promo-draft.md：每一镜录了几条、结果、没过的和原因、占位的地方、粗剪路径、要我重点看的地方。按 §0 记 HANDOFF。
```

---

## 提示词 6 · P3 发版二之后：正式渲染、正片、教程、交接包（你在场）

```text
先读 docs/promo/video-2026-10-29-capture-card/06-claude-code-prompts.md 的 §0，再读同一目录的 README.md、01、02、04 全文，~/Movies/Spool-video/reports/ 里所有报告，以及 docs/PORTFOLIO_FACTS.md §9.5（隔离构建的做法）。

前提：发版二已经打了 tag，我看过粗剪 v0 并给了意见，我说开始。我在场。

1. 隔离构建：把仓库 git clone 一份到 ~/Movies/Spool-video/build/（不用 worktree，免得往仓库的 .git 里写东西），从发版二的 tag 构建一份演示版：显示名「Spool」，identifier 用 com.oceanjin.spool.demo-r2，数据目录、钥匙串条目都和真库分开（照 PORTFOLIO_FACTS §9.5）。macOS 27 上 release 构建要带 CARGO_PROFILE_RELEASE_BUILD_OVERRIDE_STRIP=none。构建日志重定向到文件，不要接 | tail。不改仓库工作区里的任何文件。构建完截图核对没有「Demo」。

2. 把录制用的快照复制到新的数据目录（复制，不移动）；第一次打开时看它有没有正常升级、内容对不对。

3. 宣传片正片：照我对 v0 的意见改好；用新构建把 U02–U12 全部重录（同一套脚本；V11 之前照提示词 5 先移走旧的求职信）。这次 V14 录真的周回顾建议动作卡，录到出现「Set the deadline」那一次为止。

4. 正式渲染：RO、RX、RE 和所有实录效果出 3840×2160、30 fps 的 ProRes（整屏 422 HQ，叠加层 4444）；分段渲，一段一个文件，正常结束再改名。英文主版和中文版各一套文字。

5. 教程：按 02 逐章录 T00–T12，快照 T0–T4 照 02 §2.1 做。第 1 章安装只拍到松手前；第 7 章的 API key 请我在镜头外粘好，你只录粘之前的空框和粘好之后的样子；跑引擎之前先告诉我。

6. 接上已经审过的旁白（audio/REVIEW.md 里挑中的）；音乐用我买好授权的那首，问我放在哪。

7. 出片：
   - 宣传片粗剪 v1：16:9 主版（英文）、中文版，加 01 §9 的 60 / 30 / 15 秒版和竖版；
   - 教程英文版、中文版粗剪：两条旁白各自对齐，需要时各出一条剪辑时间线（02 §3）；
   - 交接包 ~/Movies/Spool-video/edit/handoff/：实录原素材和加好效果的版本、三段渲染、效果叠加层、音频分轨、英文和中文 SRT、FCPXML 时间线（导入 DaVinci Resolve 试一次能不能打开；没有 Resolve 就写明没验证）、渲染工程、manifest.json。

8. 恢复我的 AI 客户端设置（同提示词 5）。

9. 最后对着 01 §11 的发布前核对单逐条打勾，没法确认的写出来交给我。

10. 报告 ~/Movies/Spool-video/reports/P3-final.md。按 §0 记 HANDOFF。
```
