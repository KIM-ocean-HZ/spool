# Spool 教程（实录）· 定稿分镜与中英讲稿（约 26 分钟，13 章）

> **状态**：定稿设计，2026-10-29；10-31 随宣传片第三版核对过一遍，只改了两处界面原文（第 1 章「输入监控」、第 9 章 SPOOL.md 那一项的按钮名），教程的结构和风格不变。还没录、没剪、没发布。
>
> **怎么来的**：和宣传片同一个一次性任务（owner interruption，HANDOFF §9.8）。第二轮按你的回答定稿：**我来录屏，AI 配音，中英两版**，不拍 Windows 镜头，MCP 为主、Pack 带过。
>
> **配套**：宣传片 [`01`](01-promo-storyboard.md) · 依据 [`03`](03-research-and-claims.md) · 制作流程 [`04`](04-production-pipeline.md)（录制环境、演示数据、自动录屏都在那里，这里不重复）

---

## 0. 一屏看懂

- **是什么**：一段完整的实录教程，从第一次捕捉一直走到项目完成、归档。界面操作由我在你的 Mac 上自动录，旁白用 AI 配音。
- **两版**：**同一份录屏**，配两条旁白——英文版（英文旁白 + 英文字幕）和中文版（中文旁白 + 中文字幕，按钮名保留英文）。两版的画面标注各渲染一份。
- **多长**：约 26 分钟，13 章（第 0–12 章）。这是按英文旁白估的（全稿约 3,200 个英文词，每分钟约 150 词，再加上操作和停顿）；中文旁白短一些（约 4,100 个汉字），中文版单独出一条剪辑时间线的话约 23 分钟。每一章都能单独剪成一条 1–3 分钟的短视频（§7）。
- **顺序**（你给的流程，一步没改）：建项目 → 连文件夹、加文件 → 捕捉（文字 + 截图）→ 和 AI 讨论（讲清支持哪些 MCP 客户端）→ AI 写回新块 + 跟进 → 本机 CLI 或 API 跑跟进 → 压缩和过期检测（能自动）→ 给用仓库的人讲连仓库和 SPOOL.md → 周回顾、接受建议 → 完成项目、归档。前面加一章安装，后面加一章结尾。
- **一个项目走到底**：全片跟着宣传片里那个「Job search」（`04` §5.3），只有第 9 章换成连着代码仓库的「Portfolio site」。
- **必须用发版二构建录正片**：第 10 章的周回顾建议动作卡（P10）不在 v0.7.4 tag 里。

| 章 | 时间码 | 时长 | 讲什么 |
|---|---|---|---|
| 0 | 0:00 | 1:00 | 开场：Welcome 卡片，今天要做什么 |
| 1 | 1:00 | 1:40 | 安装、第一次打开、授权 |
| 2 | 2:40 | 1:20 | 工作区和项目 |
| 3 | 4:00 | 2:10 | 连文件夹、加文件 |
| 4 | 6:10 | 2:40 | 捕捉：文字、截图、长按写笔记 |
| 5 | 8:50 | 3:10 | **接上你的 AI（MCP）**，在 AI 里讨论；Pack 带过 |
| 6 | 12:00 | 2:00 | AI 写回来、提议、跟进清单 |
| 7 | 14:00 | 2:40 | 本机 CLI 或 API 替你跟进（含每周自动） |
| 8 | 16:40 | 2:50 | 压缩和过期检测（含夜里自动压缩、每月自动查） |
| 9 | 19:30 | 3:10 | 用代码仓库的人：连仓库和 SPOOL.md |
| 10 | 22:40 | 2:00 | 周回顾，接受建议动作 |
| 11 | 24:40 | 1:00 | 完成项目，归档 |
| 12 | 25:40 | 0:30 | 结尾：Byebye 卡片 |

---

## 1. 原则

1. **全部真做**。每一次 AI 运行都是真跑的，不拿假结果凑画面（方针 §4.3「不做 mock 冒充产品」）。等的时间剪短，加速的地方标出来。
2. **一个项目走到底**（Job search），第 9 章例外。
3. **界面上的字照原样念**；中文版的标注写成「中文 · English」，例如「完成项目 · Complete project」。
4. **大白话**（HANDOFF §10.6）。教程躲不开 MCP、CLI、API key 这些词——界面上就写着——**第一次出现时都用一句话讲明白**：
   - MCP：AI 软件用来连外部工具的通用接口。接上以后，你在 AI 里说话，它自己来 Spool 里查，也能写回来。
   - 本机 CLI：你电脑上已经登录好的 Claude Code 或 Codex。用的是你自己的订阅额度，Spool 不存任何钥匙。
   - API key：你在 AI 厂商那里开的一把钥匙，按用量花你自己的钱。
5. **限制照实说**：Mac 和 Windows 的差别、要花钱的地方、自动功能只在 Spool 开着时跑、AI 客户端能自己读你的文件夹。每章的「说准」和 §6 汇总了不能说错的话。
6. **不拍 Windows**：Windows 的差别用 2–3 秒的文字卡带过（第 1、4、7 章）。
7. **AI 声音不冒充作者**：讲稿用「我们 / 你」，不说「我是 Hanze」。你想自己配中文版的开头，可以另加一句自我介绍。
8. **用户不能看到测试环境的 Spool**（HANDOFF §10.6）：画面里不出现 "Spool Demo"、"Terminal probe"、"Path changed"、token 数、开发者菜单（`04` §4.3）。

---

## 2. 录之前

机器、授权、演示版改名、自动录屏的做法都在 `04` §3–§6。教程额外要准备的：

### 2.1 数据快照

| 快照 | 内容 | 用在 |
|---|---|---|
| T0 · 全新安装 | 演示版的数据目录是空的（换上一个空目录）；第一次打开会自动生成两个新手教程项目 | 第 1 章 |
| T1 · 开始前 | 录制用的库（`04` §5.1 清理过、§5.2 的工作区），但还没有 Job search | 第 2、3 章 |
| T2 · 故事中 | Job search 有 D01–D10（`04` §5.3）；Job hunt 连着 `~/spool-video/Job search/`，项目里挂着简历；Interview prep 有六块；Work 里有 Team offsite（有重复内容）；Life 里有 Half marathon | 第 4–8、10 章 |
| T3 · 仓库 | Side projects / Portfolio site **还没**连演示仓库 | 第 9 章 |
| T4 · 完成前 | Interview prep 已经标完成，只剩 Job search | 第 11 章 |

### 2.2 教程额外的东西

1. **一个有重复内容的项目**给第 8 章压缩用：Work / Team offsite，8–10 块，其中两三块是同一封转发邮件贴了两次，带日期和金额——这样才看得出「数字和日期一个都不许丢」。演示库里的项目都很短，压缩前的本地预检会说「压了也短不了多少」。
2. **过期的一对**给第 8 章：就用宣传片的 D08「Applications close 15 November.」和 D14「extended to 29 November」。第 6 章的「提议取代」另用一对：D04「call on Thursday」→ 你在 Claude 里说「Tidewick moved the call to Friday」。
3. **一个 API key**（第 7 章演示 API 那条路）：挑能联网搜索的那家，先在厂商后台设消费上限。**你在镜头外粘进去**，我录粘好之后的样子。
4. **演示仓库**：`~/spool-demo-v074/portfolio-site`（PORTFOLIO_FACTS §9.5 已有），录前确认 `CLAUDE.md`、`AGENTS.md` 在、内容几行就行。
5. **第 1 章的安装**：你的电脑上已经装着正式版，真把新的拖进「应用程序」会覆盖它。所以「拖进应用程序」只拍到松手之前，第一次打开用演示版 + 空数据目录（T0）。
6. **开拍当天再调日期**：故事里的截止日按开拍那天往后推两三周；周回顾要「这一周」有足够的新块。

---

## 3. 画面和剪辑

- **推近**：只在点小控件、读小字的时候推近（最多 2 倍），做完停 1 秒再拉回。
- **标注**：琥珀色细框（2px `#B45309`）+ 标签胶囊；同一时间最多一个。
- **按键**：底部居中的按键胶囊（Geist Mono）。
- **章节卡**：纸签样式，线上挂一张「Chapter 4 · Capture」/「第 4 章 · 捕捉」，1.2 秒。
- **加速**：等 AI 跑的那段 4–8 倍速，角上一行小字「4× faster」/「已加速」。不剪成「瞬间完成」。
- **两条旁白对不齐怎么办**：每一步的画面长度按两种语言里较长的那条定，另一条留一点停顿；需要时两版各出一条剪辑时间线（脚本录屏，出两版几乎不费事）。
- **字幕**：英文版英文 SRT、中文版中文 SRT；专有名词统一写法（Spool、Claude Code、Codex、MCP）。
- **打码**：AI 客户端的账户名、头像、历史对话；跟进结果里的真实公司名；任何个人路径。
- **重录**：说错一个功能、点错导致状态不对、AI 回答和项目对不上——重录那一段。

---

## 4. 章节时间码（直接贴进简介）

```text
00:00 开场：复制、双击
01:00 安装和第一次打开
02:40 工作区和项目
04:00 连文件夹、加文件
06:10 捕捉：文字、截图、长按写笔记
08:50 接上你的 AI（MCP）
12:00 AI 写回来、提议、跟进
14:00 本机 CLI / API 替你跟进
16:40 压缩和过期检测
19:30 连代码仓库和 SPOOL.md
22:40 周回顾，接受建议
24:40 完成项目，归档
25:40 结尾
```

```text
00:00 Copy, double-tap
01:00 Install and first launch
02:40 Workspaces and projects
04:00 Link a folder, add files
06:10 Capture text and screenshots
08:50 Connect your AI (MCP)
12:00 AI writes back
14:00 Follow-ups with your CLI or an API key
16:40 Compress and out-of-date check
19:30 Link a code repository
22:40 Weekly review
24:40 Finish and archive
25:40 Bye
```

---

## 5. 逐章分镜和讲稿

每章：**教会什么 / 录之前 / 分镜表（英文旁白、中文旁白各一列）/ 说准 / 重录点**。

### 5.0 第 0 章 · 开场（0:00–1:00）

**教会什么**：Spool 是干什么的，今天会做出什么。
**录之前**：快照 T2；捕捉目标设成「Hello / Welcome to Spool」；浏览器开着 Welcome 页。

| # | 画面与操作 | 英文旁白 | 中文旁白 | 标注 |
|---|---|---|---|---|
| 1 | 三击选中「Welcome to Spool!」→ ⌘C → 双击 ⌥ → 捕捉卡弹出 | (wait for the card) This is the move you'll use most in Spool: copy, then double-tap Option. | （等卡片弹出）这就是 Spool 最常用的一个动作：复制，然后双击 ⌥。 | 按键胶囊 ⌘C ⌥⌥ |
| 2 | 卡片落进项目；一段代码动画：捕捉 → 项目 → 几个 AI 读、写回 | Spool is a small app for Mac and Windows. Whenever you find something useful, copy it and double-tap — it goes into the project you're working on. Then the AI apps you already use, like Claude, Codex and Cursor, can read that project directly, and write their conclusions back. | Spool 是 Mac 和 Windows 上的一个小软件。在哪儿看到有用的东西，复制、双击，它就进了你正在做的那个项目。然后你已经在用的 AI，比如 Claude、Codex、Cursor，都能直接读这个项目，也能把结论写回来。 | — |
| 3 | 13 章的列表 | Today we'll follow one example — a job hunt — from creating the project all the way to finishing and archiving it. Along the way: connecting your AI, letting Spool keep watch for you, and the weekly review. If you work in a code repository, chapter 9 is for you. | 今天跟着一个例子走一遍：找工作。从建项目开始，一直到做完、归档。中间会讲怎么接上你的 AI、怎么让 Spool 替你盯着、怎么做周回顾。用代码仓库的朋友，第 9 章是给你的。 | 章节列表 |
| 4 | 回到桌面 | All you need is a Mac or a Windows PC. AI is optional — but Spool is most useful once you connect it. | 你只需要一台 Mac 或 Windows 电脑。AI 是可选的，但接上以后才是 Spool 最好用的时候。 | — |

**说准**：Spool 是「本地的项目资料库 + 给 AI 用的接口」，**不是**又一个聊天机器人。

### 5.1 第 1 章 · 安装和第一次打开（1:00–2:40）

**教会什么**：装好、授权、认识第一次打开时的两个新手项目。
**录之前**：快照 T0；官网下载页（发版二的）。

| # | 画面与操作 | 英文旁白 | 中文旁白 | 标注 |
|---|---|---|---|---|
| 1 | spoolapp.org → Download for Mac | Download Spool from spoolapp.org. The Mac version is notarized by Apple, so it opens without an "unidentified developer" warning. | 到 spoolapp.org 下载。Mac 版经过苹果公证，打开时不会弹「来自身份不明的开发者」。 | — |
| 2 | 打开安装包，往「应用程序」拖（拍到松手前，§2.2 第 5 条） | Drag it into Applications, and open it. | 拖进「应用程序」，打开。 | — |
| 3 | 左栏出现「Welcome to Spool」「Put your AI to work on Spool」 | On first launch you'll see two tutorial projects. Read them, then delete them whenever you like. | 第一次打开，左边会有两个新手教程项目。读完随时可以删掉。 | 框住两个项目 |
| 4 | 顶上的授权横幅 → 系统设置「输入监控」→ 打开 Spool → 退出 Spool 再打开 | To capture in other apps, Spool needs two switches in System Settings: "Input Monitoring" and "Accessibility". The banner has a button for each. Turn both on, then click "Restart Spool". | 在别的 app 里捕捉，要在系统设置里给 Spool 打开两项权限：「输入监控」和「辅助功能」。横幅上各有一个按钮，两项都打开后，点「Restart Spool」。 | 「输入监控 · Input Monitoring」 |
| 5 | 系统设置「辅助功能」→ 打开 Spool | Input Monitoring lets Spool notice the double-tap — nothing you type is kept. Accessibility lets you type into the capture card the moment it appears, and apps that also use a double-tap of Option, like Claude's quick-entry window, won't pop up too. | 「输入监控」让 Spool 识别双击，不会记录日常键盘输入；「辅助功能」让你在捕捉卡弹出时就能打字，别的软件如果也用双击 ⌥——比如 Claude 桌面版的快捷入口——也不会跟着弹。 | — |
| 6 | 设置 → General：语言、外观、正文字号 | In Settings you can switch between English and Chinese, follow your system's light or dark mode, and choose the text size. | 设置里可以切换中英文、跟随系统切换深浅色、调整正文字号。 | — |
| 7 | 文字卡（不拍 Windows）："On Windows: double-tap Ctrl · no permissions needed · first install: More info → Run anyway" | On Windows, you capture with a double-tap of Ctrl, and no permissions are needed. The Windows installer isn't code-signed yet, so the first time you'll see a SmartScreen warning: choose "More info", then "Run anyway". | Windows 上是双击 Ctrl 捕捉，不需要授权。Windows 安装包目前没有代码签名，第一次会弹 SmartScreen 提示：点「更多信息」，再点「仍要运行」。 | 文字卡 3 秒 |
| 8 | 回到 Mac 主窗口 | Everything you save stays on your own computer. It only leaves when you enable a feature that shares it — like connecting an AI, which we'll do in chapter 5. | 你存的东西都在自己的电脑上。只有你主动开启的功能——比如第 5 章要讲的连接 AI——才会把内容传出去。 | — |

**说准**：Windows 没签名要照实说（HANDOFF §10.6「Windows 不签名」）；「资料只在你电脑上」要带后半句（README 设计原则第 2 条）。
**别推近**：两个新手项目的正文里有几句旧说法（「Spool ships no AI of its own — your data never leaves this machine」「a task template」），和现在的产品对不上（HANDOFF `DISCOVERED-20261029-1`）。修好之前只拍项目名。
**重录点**：授权后**要完全退出再打开**，没退出就演示捕捉会失败。

### 5.2 第 2 章 · 工作区和项目（2:40–4:00）

**教会什么**：工作区和项目是什么，怎么建，「Capture here」是什么意思。
**录之前**：快照 T1。

| # | 画面与操作 | 英文旁白 | 中文旁白 | 标注 |
|---|---|---|---|---|
| 1 | 指着左栏的几个工作区 | Spool uses workspaces and projects. A workspace is a big area of your life — study, life, work. A project is one concrete thing inside it — a course, a flat hunt, a job search. Workspaces can hold smaller workspaces, but projects don't nest. That's on purpose: the more levels, the harder things are to find. | Spool 用工作区和项目来整理内容：大的一块叫「工作区」，比如学习、生活、工作；具体的一件事叫「项目」，比如一门课、一次找房、一次求职。工作区里可以再分小工作区，但项目下面不再分层——这是故意的，层越多越难找。 | — |
| 2 | 左下角「+ Workspace」→ 输入「Job hunt」 | Let's create a workspace called Job hunt. | 先建一个工作区，叫 Job hunt。 | 「+ Workspace」 |
| 3 | 在 Job hunt 里按 ⌘N → 输入「Job search」→ 回车 | Inside it, press Command-N for a new project: Job search. | 在它下面按 ⌘N 新建一个项目，叫 Job search。 | 按键胶囊 ⌘N |
| 4 | 点「+ Write a one-line summary」→ 输入 D01 | At the top, write one line about what this project is doing right now. When an AI lists your projects, this is the first thing it sees. | 顶上写一句摘要：这个项目现在在做什么。AI 列出你的项目时，最先看到的就是这一句。 | — |
| 5 | 点日期 → 选截止日 | Set a deadline. The Focus list on the left puts whatever is due soonest first. | 设一个截止日期。左边的「Focus」会把快到期的排在前面。 | 框住 Focus |
| 6 | 点「Capture here」→ 出现「Capturing ●」 | Click "Capture here". From now on, everything you double-tap goes into this project — and you can still send any single capture somewhere else, right from the card. | 点「Capture here」，以后双击捕捉的东西都会进这个项目；每一张捕捉卡上，也随时可以改投到别的项目。 | 「Capture here · 捕捉到此」 |
| 7 | 左栏「Projects」页 | The Projects page lists them all in one table — deadlines, sizes, workspaces — and finished projects keep their conclusion. | 「Projects」这一页把所有项目排成一张表：截止日期、大小、属于哪个工作区；做完的项目留着它的结论。 | — |

**说准**：Windows 上快捷键是 Ctrl+N（字幕里带一句，不拍）。

### 5.3 第 3 章 · 连文件夹、加文件（4:00–6:10）

**教会什么**：把工作区连到电脑上的文件夹；把文件放进项目；文件挪了 Spool 跟得上。
**录之前**：接第 2 章；`~/spool-video/Job search/` 准备好（`04` §5.2）；Finder 窗口在右边。

| # | 画面与操作 | 英文旁白 | 中文旁白 | 标注 |
|---|---|---|---|---|
| 1 | 点左栏工作区名「Job hunt」→ 工作区页 | Click a workspace's name to open its own page: summaries, follow-ups and files for every project inside. | 点工作区的名字，就能打开它的页面：里面每个项目的摘要、跟进和文件都在这里。 | — |
| 2 | 「Connect a folder…」→ 选 `Job search` 文件夹 | "Connect a folder" links this workspace to a folder on your computer — a CV folder, a thesis folder, or a code repository. | 「Connect a folder」把这个工作区连到电脑上的一个文件夹：可以是放简历的文件夹、论文文件夹，也可以是代码仓库。 | 「Connect a folder… · 连接文件夹…」 |
| 3 | 第一步：Spool 会做什么 | Step one explains what Spool will do: notice when the plan in that folder changes, and leave a small file called SPOOL.md that tells any AI working there what these projects are. | 第一步告诉你 Spool 会做什么：看那里的计划有没有改，再放一份叫 SPOOL.md 的小文件，告诉在那个文件夹里干活的 AI 这些项目是怎么回事。 | — |
| 4 | 第二步：勾 `PLAN.md` | Step two: pick one to three "state files" — files that say what's happening now, like a plan, a handoff note or a README. When they change, Spool knows the folder has moved on. | 第二步选一到三份「现状文件」：写着现在做什么、做到哪的文件，比如计划、交接、README。它们一改，Spool 就知道文件夹里的内容更新了。 | 「State files · 现状文件」 |
| 5 | 第三、四步很快过去（这个文件夹不是 git 仓库，也没有 CLAUDE.md / AGENTS.md） | The last two steps are for code repositories — chapter 9 covers them. | 后面两步是给代码仓库用的，第 9 章细讲。 | 2 倍速 |
| 6 | 连好后的卡片：Linked folder、Sync、State files、In sync now、Main project | Done. The card shows when it last synced, and whether a state file has changed since. | 连好了。卡片上写着上次同步是什么时候、现状文件有没有改过。 | 框住卡片 |
| 7 | 进 Job search → 右栏「Project files」→「Add file +」选简历；再从 Finder 拖进求职信 | A project's own files live in its right-hand panel. Click "Add file", or drag one in from Finder. Each file shows when it was added, and by whom. | 项目自己的文件放在右栏。点「Add file」，或者直接从 Finder 拖进来。每个文件都写着什么时候加的、谁加的。 | 「Project files · 项目文件」 |
| 8 | 指着文件那一行的开关 | Connected AIs can read the text of files you add yourself. Rather they didn't? Each file has its own switch. | 你亲手加的文件，连上的 AI 默认能读里面的文字；不想让它读，每个文件都有自己的开关。 | 框住开关 |
| 9 | 某一块的工具栏 → 回形针 → 挂一个文件 | You can also attach a file to one particular note, with the paperclip on that note. | 文件也可以只挂在某一块上，点那一块上的回形针。 | — |
| 10 | Finder 里把简历挪进子文件夹 → 回 Spool：标着「New place」 | Move a file in Finder, and Spool keeps track — it marks it "New place". If a file is really gone, it tells you. | 在 Finder 里挪了文件，Spool 跟得上，会标「New place」；真找不到了也会告诉你。 | — |
| 11 | 打开 PLAN.md 改一行、保存 → 工作区页：「1 state file(s) changed since」→ 点「In sync now」 | Now let's change a line in the plan and save. Back in Spool — it already knows. Once you, or your AI, have recorded the new direction in Spool, click "In sync now" to track changes from this point. | 现在改一下计划文件，保存。回来看，Spool 已经知道它改了。等你或者你的 AI 把新方向记进 Spool，点「In sync now」，从这里开始跟踪后续变化。 | 「In sync now · 已经对过了」 |

**说准**：连文件夹以后，Spool 只往文件夹里写四个地方：SPOOL.md、`.git/info/exclude` 里一行、（你同意的话）CLAUDE.md 里一行和 AGENTS.md 里一句（v0.7.4 发版说明）。这个文件夹不是仓库，就只有 SPOOL.md。
**重录点**：第 11 步之后要回到「In sync now」，不然第 7 章的每周自动跟进会因为「计划变了」停着。

### 5.4 第 4 章 · 捕捉：文字、截图、长按写笔记（6:10–8:50）

**教会什么**：复制双击；捕捉卡上每个东西是干什么的；截图；长按写笔记；在主窗口里自己写。
**录之前**：快照 T2；捕捉目标 = Job search；浏览器开着 Tidewick 招聘页；截图的浮动缩略图先**开着**（第 9 步当场关）。

| # | 画面与操作 | 英文旁白 | 中文旁白 | 标注 |
|---|---|---|---|---|
| 1 | 浏览器里选中一段 → ⌘C → 双击 ⌥ | Found something useful on a web page? Copy it, then quickly press Option twice. | 在网页上看到有用的一段，复制，然后快速按两下 ⌥。 | 按键胶囊 |
| 2 | 捕捉卡弹出，画面定格，逐个标注 | This is the capture card. At the top is what you copied. Below it: which project it's going into, and where it came from — in a browser, that's the web page. The cursor is already in the note box. | 弹出来的这张小卡就是捕捉卡。上面是你复制的内容；下面是存到哪个项目、内容来自哪里——从浏览器复制的，会记下网页。光标已经在批注框里了。 | 依次框：内容、路径和来源、批注框 |
| 3 | 打一句 → 回车 | Type one line about why you're keeping it, and press Return. That line becomes the note's title — and connected AIs treat your own words as the most important line. | 写一句为什么要存它，回车保存。这一句会变成这一块的标题；连上的 AI 也会把你自己写的话当成最重要的信息。 | 「Leave a thought… · 留一句想法…」 |
| 4 | 切到 Spool：新的一块，时间、来源、你的话、原文 | In Spool, the time, the source, your note and the original text are all there. And you never left the web page. | 回 Spool 看：时间、来源、你的话、原文，都在。整个过程你没离开那个网页。 | — |
| 5 | 再捕一段，不打字，点别处 | Don't feel like writing? Click anywhere else — it's saved anyway. | 不想写也没关系，点旁边任何地方，照样存好。 | — |
| 6 | 再捕一段 → 卡片上的项目选择器 → 改投到 Interview prep | Realise it belongs in another project? Switch it right on the card. | 发现这段应该进别的项目？卡片上点一下就改投过去。 | 「改投」 |
| 7 | 卡片左下「Undo」 | Saved the wrong thing? Click Undo, or press Command-Z. | 存错了，点撤销，或者按 ⌘Z。 | — |
| 8 | 卡片右上角三个小按钮：图钉、锁、× | The three small buttons at the top right: the pin pins this note to the top of the project; the lock keeps the card open, even when you click elsewhere; the cross saves and closes. Escape throws away what you typed in the box. | 右上角三个小按钮：图钉是把这一块置顶；锁是让这张卡一直开着，点外面也不收；× 是存下并关闭。按 Esc 会丢弃刚才在框里写的字。 | 「Pin this block」「Keep this card open」 |
| 9 | ⌘⇧5 →「选项」→ 关掉「显示浮动缩略图」 | Before screenshots, change one small setting. After a screenshot, macOS shows a floating thumbnail, and while it's there the file isn't actually saved yet. Press Command-Shift-5, open Options, and turn off "Show Floating Thumbnail". | 截图之前先改一个小设置：macOS 截完图右下角会挂一张小图，挂着的时候图还没真正存下来。按 ⌘⇧5，在「选项」里关掉「显示浮动缩略图」。 | 框住选项 |
| 10 | ⌘⇧4 框一块 → 双击 ⌥ → 卡片上有小图和注释框 → 打一句 → 回车 | Now take a screenshot and double-tap Option: you get a note with the picture in it, and you can add a caption. Screenshots straight to the clipboard, copied images, and image files copied in Finder work too. | 截完图，双击 ⌥，就是一块带图的笔记，还可以给图写一句注释。直接截到剪贴板、复制的图片、在 Finder 里复制的图片文件也都行。 | 「Caption for this image」 |
| 11 | 长按 ⌥ → 卡片上直接写一句 → 回车 | Hold down Option to write a quick note straight into the current project. If you pressed Command-C in the two seconds before, what you copied is already in the box. | 长按 ⌥，可以直接往当前项目里写一条笔记。如果长按之前两秒内按过 ⌘C，复制的内容已经在框里了。 | 按键胶囊「hold ⌥」 |
| 12 | 主窗口底部输入框：写一句、粘一张图 → 回车 | You can also write inside Spool, in the box at the bottom. Return sends, Shift-Return starts a new line, and you can paste or drag in pictures. | 在 Spool 主窗口里也能自己写：用底部这个框，回车发出，Shift+回车换行，图片可以直接粘贴或拖进来。 | — |
| 13 | 文字卡（不拍 Windows）："On Windows: double-tap Ctrl · Win+Shift+S, then double-tap Ctrl · long-press notes are Mac only" | On Windows: double-tap Ctrl. For screenshots, press Windows-Shift-S, then double-tap Ctrl. Long-press notes are Mac only. | Windows 上：双击 Ctrl；截图用 Win+Shift+S，再双击 Ctrl。长按写笔记只在 Mac 上有。 | 文字卡 3 秒 |

**说准**：
- 别说「截完图马上双击就能捕」——那一条 10-28 撤回了，要先关浮动缩略图（P12 验收第 237 条）。
- 第一次从某个浏览器捕捉，macOS 会问一次「自动化」权限，同意之后才记得到网页。
- Windows 上来源记的是你从哪个软件复制的，不是网页；Win+PrtScn 那条还没在真机上验过（P13 第 9 条），片子里不讲。

**重录点**：卡片弹出时打字没进框——多半是辅助功能没开，开了重录。

### 5.5 第 5 章 · 接上你的 AI（MCP），在 AI 里讨论（8:50–12:00）——全片的重点

**教会什么**：MCP 是什么；两道开关；一键接上哪些客户端；接上以后怎么说话；换一个 AI 也接得上；没有 MCP 的 AI 怎么办（Pack 带过）；私密项目。
**录之前**：快照 T2；Claude 桌面版、ChatGPT 桌面版装好但还没接 Spool（`04` §4.3：点「Connect」会改你 AI 客户端的设置，录前先问你；录完在正式 Spool 里再点一次改回来）。

| # | 画面与操作 | 英文旁白 | 中文旁白 | 标注 |
|---|---|---|---|---|
| 1 | 设置 → MCP | Now let's connect your AI. Spool uses MCP — a common way for AI apps to plug into outside tools. Once it's connected, you just talk to your AI: it looks things up in Spool by itself, and can write its conclusions back. No more copy and paste. | 接下来把 AI 接上。用的是 MCP——AI 软件连接外部工具的一种通用接口。接上以后，你只要在 AI 里说话，它自己来 Spool 里查，也能把结论写回来，不用再复制粘贴。 | — |
| 2 | 打开「MCP server」 | The first switch lets AI apps read your projects. | 第一道开关：让 AI 能读你的项目。 | 「MCP server」 |
| 3 | 打开「Allow AI writes」 | The second switch, separately, lets them write into Spool. You can allow reading only. | 第二道开关单独管写：让 AI 能往 Spool 里写。两道是分开的，你可以只让它读。 | 「Allow AI writes」 |
| 4 | 客户端列表，逐行高亮 | These connect in one click: Claude Desktop, Claude Code, and Codex — the Codex command line, its editor extensions and Codex in the ChatGPT app share one setup — plus Cursor, GitHub Copilot in VS Code, and Windsurf. Other tools that support MCP can be added by hand. | 能一键接上的有：Claude 桌面版、Claude Code、Codex，还有 Cursor、VS Code 里的 Copilot、Windsurf。Codex 命令行、编辑器插件和 ChatGPT 桌面版里的 Codex 共用一份设置。别的支持 MCP 的工具也能手动接。 | 录前在发版二界面上核一遍列表 |
| 5 | Claude Desktop 那一行点「Connect」→ 退出并重新打开 Claude → 回来看状态 | Click Connect. Spool updates that app's settings for you, after making a backup. Then quit the AI app and open it again. Spool shows you whether it really connected. | 点「Connect」，Spool 会替你改好那个软件的设置，还会先备份一份。改完要把那个 AI 软件退出、再打开一次。Spool 这边会显示它到底连上没有。 | 「Connect」 |
| 6 | Codex 那一行点「Connect」 | Codex in the ChatGPT app connects the same way. | ChatGPT 桌面版里的 Codex 也一样接。 | — |
| 7 | Claude 桌面版："Help me review my Job search project, then ask me two interview questions." → 第一次调用时的允许弹窗 → 允许 | Now, without going back to Spool, just ask Claude. For example: "Help me review my Job search project, then ask me two interview questions." The first time, Claude asks whether it may use Spool's tools — allow it. | 接好以后，不用回 Spool，直接在 AI 里说。比如：「帮我梳理 Job search 这个项目，再问我两个面试问题。」第一次它会问能不能用 Spool 的工具，允许就好。 | AI 回答 3 倍速 |
| 8 | Claude 读项目 → 总结 + 两个面试问题（D06 的 SQL 那条应该会被用上） | It reads the whole project — what you saved, your own notes, and which parts came from another AI — and then asks you interview questions. No need to keep re-reading your notes. | 它把整个项目读了一遍——你存的资料、你写的批注、哪些是别的 AI 说的，它都分得清——然后问你面试题。比自己翻笔记准备更方便。 | 对得上项目的词加下划线 |
| 9 | "Rewrite my CV summary for the Tidewick role, using my Job search project." | Next, let's work on your CV: "Rewrite my CV summary for the Tidewick role, using my Job search project." It uses the job ad you saved, and what you wrote about it. | 再请它帮你改简历：「根据 Job search，帮我改一下简历开头那段，投 Tidewick。」它会用到你存的招聘要求和你写的批注。 | — |
| 10 | "What have I been working on this week?" | Ask "What have I been working on this week?", and it goes through what's new across your projects. | 问它「我这一周在忙什么」，它会把各个项目这一周的新东西捋一遍。 | — |
| 11 | ChatGPT 桌面版的 Codex，新对话："What did I decide about my CV?" | Switch to a different AI and ask about the same project: Codex in the ChatGPT app knows what you decided, too. That's why we built Spool: you can switch AIs without having to explain everything again. | 换一个 AI 问同一个项目：ChatGPT 里的 Codex 也知道你定了什么。这就是 Spool 最想解决的事——换 AI，不用重新讲。 | 分屏 |
| 12 | **Pack 带过（约 20 秒）**：回 Spool 按 ⌘⇧P →「Copy」；再点「Export .md」 | Using an AI that can't reach the Spool on your computer — the ChatGPT website, Gemini, DeepSeek or Kimi? Press Command-Shift-P. Spool turns the whole project into one ready-to-paste brief. Copy it over, or export a Markdown file and upload that. | 网页版 ChatGPT、Gemini、DeepSeek、Kimi 这些连不上你电脑上的 Spool，那就按 ⌘⇧P：把整个项目整理成一份能直接粘贴的说明，复制过去；也可以导出成 .md 文件上传。 | 按键胶囊 ⌘⇧P |
| 13 | 右键 Half marathon →「Make private…」（顺手指一下 Apartment hunt 已有的私密标记） | Got a project you don't want AI to see? Right-click it and choose "Make private…". AIs connected through Spool can't read it, or even tell it exists — and Spool's own AI features leave it alone too. | 有不想给 AI 看的项目，右键「Make private…」：通过 Spool 连上的 AI 读不到它，连它存在都不知道；Spool 自己的 AI 功能也不碰它。 | 「Make private…」 |

**说准**：
- 私密「只管经过 Spool 的这条路」，你自己复制粘贴出去的不算，也不是加密（v0.7.0 发版说明）。
- 网页版 ChatGPT 连不上本机的 Spool，要用 ⌘⇧P（README「AI via MCP」一节）。
- 不说「不需要 API key」这句原话（HANDOFF §10.6）。

**重录点**：AI 没调用 Spool 就凭空回答——重来；改设置后没重启客户端导致没连上——重来。

### 5.6 第 6 章 · AI 写回来、提议、跟进清单（12:00–14:00）

**教会什么**：AI 怎么写回来、写回来的长什么样；什么会等你点头；跟进清单是什么。
**录之前**：接第 5 章，两道开关都开着。

| # | 画面与操作 | 英文旁白 | 中文旁白 | 标注 |
|---|---|---|---|---|
| 1 | Claude："Save that CV summary to Job search, with a note on why it matters." | Ask the AI to save its conclusion back. | 让 AI 把结论存回来。 | — |
| 2 | Spool：左栏 Job search 的小圆点变绿；时间线底部新的一块，标「Claude · MCP」，下面一行写它引了哪几块 | Back in Spool, the green dot means an AI wrote something new. This note is signed "Claude · MCP", and the line under it shows which notes it was based on. Your notes and the AI's are easy to tell apart. | 回 Spool：项目前面的小点变绿，是 AI 写了新东西。这一块署着「Claude · MCP」，下面一行写着它是根据哪几块得出来的。你的笔记和 AI 的，一眼分得清。 | 框住绿点、署名、引用行 |
| 3 | 指着自己写的那几块 | An AI can add notes, but it can't edit or delete anything you wrote. | AI 可以往后加新的块，但改不了你写的字，也删不了你的块。 | — |
| 4 | Claude："Tidewick moved the call to Friday — update my Job search." | But what if an old note is no longer right? | 那如果有一条旧的已经不对了呢？ | — |
| 5 | 左下角待审出现「1」→ 打开「Proposed by an AI, waiting for you」：旧的、新的两句原话和它的理由 | The AI can't change the old note directly — it can only propose. Proposals wait for you here: which line is old, which is new, and why it thinks so. | AI 不能直接动旧的，只能提议。提议会在这里等你：旧的是哪句、新的是哪句、它为什么这么认为。 | 框住待审图标 |
| 6 | 三个按钮，点「Replace in full」 | Three choices. "Correct one point" keeps both notes, and records that the new one corrects the old. "Replace in full" leaves the old note out of the project brief that AIs read from now on — it's still in your library, and still searchable. "Leave alone" means nothing happens. | 三个选择：「Correct one point」两块都留着，并标明新块更正了旧块；「Replace in full」以后 AI 读的项目说明里不带旧的那块，但它还在库里，搜得到；「Leave alone」就保持原样。 | 三个按钮逐个框 |
| 7 | Claude："Add a follow-up to Job search: new data analyst openings at small teams in London." | One more you'll use a lot: ask the AI to note something that's still open. | 还有一种很常用的：让 AI 记下还没弄清的事。 | — |
| 8 | 待审：「Claude wants to add something for ‹Job search› to watch」→「Add it」 | This needs your OK as well. Click "Add it", and it joins the project's follow-up list. | 这也要你点头。点「Add it」，它就进了这个项目的跟进清单。 | 「Add it」 |
| 9 | 右栏「Watching for」→「Edit」 | The follow-up list holds one question per line. "One-off" stops once it's answered; "Permanent" keeps going until you end it. | 跟进清单一行一件事。「One-off」查到答案就结束；「Permanent」会一直查下去，只有你能结束。 | 「One-off」「Permanent」 |

**说准**：AI 追加的块是直接写进来的（带署名、只能追加）；**更正、取代、拆分项目、挂文件、加跟进**才进待审（README、v0.7.0 发版说明）。别说成「AI 写的所有东西都要你批准」。连上的 AI 不能关掉 Permanent 的跟进；Spool 自己跑跟进时，如果判断某一行已经结束，可能会把它收起来并写一句理由，你能在编辑器里重新打开（v0.7.1 发版说明）。

### 5.7 第 7 章 · 本机 CLI 或 API 替你跟进（14:00–16:40）

**教会什么**：Spool 自己调用 AI 的两条路；怎么跑一次跟进；怎么让它每周自己跑。
**录之前**：快照 T2；Claude Code 已登录；**API key 由你在镜头外粘好**（§2.2 第 3 条）；Job search 里有 D12 那条跟进。

| # | 画面与操作 | 英文旁白 | 中文旁白 | 标注 |
|---|---|---|---|---|
| 1 | 章节卡 | So far, you've been talking to your AI. From here on, Spool calls an AI itself to work for you: follow-ups, compression, the out-of-date check, and the weekly review. There are two ways to do that. | 前面是你在 AI 里说话。从这一章开始，是 Spool 自己调用 AI 替你干活：跟进、压缩、过期检测、周回顾。它有两条路。 | — |
| 2 | 设置 → AI engine →「Show AI features」开着 | First, make sure "Show AI features" is on. If it's off, every AI button is hidden and nothing automatic runs. | 先确认「Show AI features」开着。关掉的话，所有要用 AI 的按钮都会藏起来，自动任务也不跑。 | — |
| 3 | 「Local CLI」：Found Claude Code → Connect → Connected | Route one is "Local CLI": the Claude Code or Codex already signed in on your computer. Spool finds it — one click to connect. This uses your own subscription, and Spool stores no keys. | 第一条路是本机 CLI，就是你电脑上已经登录好的 Claude Code 或 Codex。Spool 自己找得到，点一下连上。用的是你自己的订阅额度，Spool 不保存任何密钥。 | 「Local CLI」 |
| 4 | 「API key」：先拍空的输入框 → 切到粘好之后：认出是哪家、列出模型 | Route two is an API key — a key you create with an AI provider. Paste it in, and Spool recognises the provider and lists its models, starting with the cheaper one. The key is kept in your system keychain, and you pay the provider for what you use. | 第二条路是 API key，你在 AI 厂商那里创建的密钥。粘贴进来，Spool 会认出是哪一家、列出它的模型，默认先用便宜的那档。密钥存在系统钥匙串里，费用按用量付给厂商。 | 「API key」 |
| 5 | 指着两个框底下的「Can do」 | Both routes do the same four things; the card notes any exception. If both are connected, you can pick which one each button uses. | 两条路的功能基本一样，有例外会在卡片上说明。两条都连上的话，每个按钮旁边都能选这一次用哪条。 | — |
| 6 | 回 Job search → 右栏「Watching for」→「Edit」→「Let the AI see what is missing」 | Back in the project. The follow-up editor has "Let the AI see what is missing": it reads only your library — no web — and drafts a few questions worth watching. Edit or delete them as you like. | 回到项目。跟进编辑器里有个「Let the AI see what is missing」：它只读你的库，不上网，帮你起草几行值得盯的问题，你可以改、可以删。 | 标注 |
| 7 | 「Search the web」· 本机 CLI → 右栏显示在跑 → 结果 | Click "Search the web", and it goes out to check the lines you wrote. Of all Spool's AI features, only follow-ups can search the web for you. | 点「Search the web」，它就照你写的那几行上网去查。Spool 的 AI 功能里，只有跟进会上网搜索。 | 等待段 6 倍速 |
| 8 | 待审：带来源链接、标着 Follow up 的新发现（公司名打码）→ 存入 | Whatever it finds comes with source links, and waits in Review for you to check. If there's nothing new, it stays quiet. | 查到的东西带着来源链接，进待审，你看过再存。没有新消息，就不会打扰你。 | 打码 |
| 9 | 编辑器底部打开「Search once a week by itself」→ 右栏「Searches weekly · next around …」 | Don't want to click every time? Turn on "Search once a week by itself", and about once a week it checks for you — speaking up only when there's news. It's off by default, and set per project. | 不想每次自己点？打开「Search once a week by itself」，大约每周替你查一次，有新东西才出声。默认是关的，每个项目单独开。 | 「Search once a week by itself」 |
| 10 | 指着右栏那一行 | Two things to know. It only runs while Spool is open. And if a state file in the linked folder has changed since the last sync, it waits until you sync again — so it doesn't search based on an outdated plan. | 有两点要注意：自动跟进只在 Spool 开着时运行；连着的文件夹里，现状文件如果在上次同步后改过，相关项目的自动跟进就会暂停，等同步后再继续，免得还照着旧计划去查。 | — |
| 11 | 文字卡（不拍 Windows）："On Windows: API key only, for now" | On Windows, the API key route is the only one for now. | Windows 上目前只有 API key 这一条路。 | 文字卡 2 秒 |

**说准**：
- 用 API 跟进要那家自带联网搜索：OpenAI、Claude、Gemini、Kimi、通义千问可以；DeepSeek、智谱、OpenRouter、自定义地址的跟进还是走本机 CLI（v0.7.3 发版说明）。Gemini CLI 不跑跟进。
- 本机 CLI 那条路要求 MCP 和「Allow AI writes」开着，不然结果存不回来。
- **不报「一次多少钱」**（HANDOFF §10.6）。可以说「API 按用量花钱，跑完会告诉你这次实际花了多少」。

### 5.8 第 8 章 · 压缩和过期检测，也能自动（16:40–19:30）

**教会什么**：项目长了怎么变短但不丢东西；怎么找出被新消息取代的旧笔记；怎么让这两件事自动做。
**录之前**：快照 T2 + Team offsite；Job search 里有 D08、D14 那一对；Interview prep 六块都在。

| # | 画面与操作 | 英文旁白 | 中文旁白 | 标注 |
|---|---|---|---|---|
| 1 | Team offsite →「Compress」页签 | Projects get long — the same email forwarded twice, the same thing saved three times. "Compress" makes a project shorter, so it's easier to hand to an AI. | 项目做久了，内容会越积越多：同一封邮件转了两次、同一件事存了三遍。「Compress」把它压短，交给 AI 时更省事。 | 「Compress · 压缩」 |
| 2 | 「How hard?」三档 | Three levels: only drop repeats; keep conclusions and numbers; or make it as short as possible. The middle one is usually right. | 三档：只删重复；保留结论和数字；压到最短。一般选中间那档。 | — |
| 3 | 指着本地预检那句 | Before it runs, Spool checks on your computer how much repetition there is. If there isn't much, it tells you straight away that compressing won't save much. | 跑之前，Spool 先在本机看一眼有多少重复。要是没什么重复，它会直接告诉你压了也短不了多少。 | — |
| 4 | 选本机 CLI →「Compress」→ 等待 → 逐块对照 | When it's done, nothing is replaced yet. You get a note-by-note comparison: what was removed, what was reworded. | 跑完不会直接替换，而是一块一块给你对照：哪里删了、哪里改了。 | 等待段加速 |
| 5 | 指着底部那句 | One rule: if the shorter version loses even one number or date, it isn't allowed into your library. | 有一条规矩：压完的版本只要丢了一个数字或日期，就不许进你的库。 | 框住提示 |
| 6 | 「Use this version」→ 打开一块的原文 | Looks right? Click "Use this version". Every note keeps its original, so you can open it or switch back at any time. | 看过没问题，点「Use this version」。每一块都留着压缩前的原文，随时能打开看、能换回去。 | 「Use this version」 |
| 7 | 「Add to tonight's automatic compression」 | Want it automatic? Tick "Add to tonight's automatic compression". Overnight it compresses projects one by one, and in the morning each draft is waiting in its project's Compress tab. | 想自动做？勾上「Add to tonight's automatic compression」，夜里一个项目一个项目地压，第二天早上在各自的「Compress」页签里等你看。 | 框住 |
| 8 | Job search →「Out-of-date check」页签 | Next, the out-of-date check. It looks for old notes that a later note replaces outright. | 再看「Out-of-date check」：它找的是被后来的消息整条取代的旧笔记。 | 「Out-of-date check · 过期检测」 |
| 9 | 范围：「All of "Job hunt"」/「Just this project」；跑之前的说明 | By default it checks the whole workspace, so it can match notes across projects. Before it runs, it tells you which projects it will send; finished and private projects are never sent. | 默认查整个工作区，也能跨项目比对笔记。跑之前会告诉你要发哪些项目；做完的、私密的项目不发。 | — |
| 10 | 结果：「Applications close 15 November.」→「extended the deadline to 29 November」那一对 | Results come in pairs: the old line and the newer one, both word for word. | 结果一对一对列出来：旧的那句、新的那句，都是原话。 | — |
| 11 | 点「Replace in full」 | You decide each pair: correct one point, replace in full, or leave alone. This page only links notes and marks things done — it never rewrites a note's text. | 每一对你自己决定：更正一处、整条取代、不动。这一页只连线、标完成，不改任何一块的正文。 | — |
| 12 | 「Projects that may be finished」→ Interview prep →「Mark done」 | It also points out projects that look finished, quoting what made it think so. "Mark done" opens the Complete panel at the top of that project, so you can write one line to wrap it up. | 它还会告诉你哪些项目看起来已经结束了，并引用笔记里的原话作为依据。点「Mark done」，打开的就是项目顶上的「完成」面板，顺手写一句结论。 | 「Mark done」 |
| 13 | 「Check all of "Job hunt" once a month」 | It can also run once a month on its own — off by default. The page shows when it last ran, and roughly when it runs next. | 也可以让它每月自己查一次，默认关；页面上会写上次什么时候查的、下次大约什么时候。 | — |
| 14 | 收尾 | Like follow-ups, these automatic jobs only run while Spool is open. With an API key you pay the provider, and Spool shows what each run actually cost; with the local CLI, it uses your subscription. | 和跟进一样，这些自动的事只在 Spool 开着的时候跑。走 API 花你自己的钱，跑完会显示这次实际花了多少；走本机 CLI 用的是你的订阅额度。 | — |

**说准**：别说「压缩一次几分钱」「缓存省多少倍」——作废了（HANDOFF §10.6）。工作区太大一次发不完时，Spool 不会偷偷截断，会直接说发不了（v0.7.3 发版说明）。

### 5.9 第 9 章 · 用代码仓库的人：连仓库和 SPOOL.md（19:30–22:40）

**教会什么**：为什么要把仓库连到 Spool；SPOOL.md 是什么；在仓库里干活的 AI 怎么一直和 Spool 项目对齐。
**录之前**：快照 T3；终端开在 `~/spool-demo-v074/portfolio-site`；Claude Code 已经接上 Spool（第 5 章的一键接入里选 Claude Code）。按钮和选项的原文以发版二的界面为准，录前对一遍（第 4 步那一项在 v0.7.4 里是「Keep it on this computer only (suggested)」）。

| # | 画面与操作 | 英文旁白 | 中文旁白 | 标注 |
|---|---|---|---|---|
| 1 | 章节卡 | If you write code, you might ask: my plans already live in the repo, so why Spool? Because a repo holds what things are now — the code, the plan, how far you've got. What it can't hold is the why: what you read and when, ideas worked out with other AIs, options you rejected, questions still open, things to watch outside. That lives in Spool. | 写代码的朋友可能会问：我的计划都在仓库里了，为什么还要 Spool？因为仓库放的是「现在是什么样」：代码、计划、做到哪。它放不下「为什么」：读过的资料和读到它的那天、和别的 AI 讨论出的想法、否掉的方案、还没解决的问题、外面要盯的事。这些放在 Spool。 | — |
| 2 | 「Side projects」工作区页 →「Connect a folder…」→ 选 portfolio-site | Let's link the repository. | 把仓库连上。 | — |
| 3 | 现状文件：README.md（推荐，已勾）、PLAN.md | For state files, pick README and PLAN. If you keep a series of dated handoff notes, Spool always reads the newest one. | 现状文件选 README 和 PLAN。要是有一串带日期的交接文档，Spool 以后总读最新的那份。 | — |
| 4 | 「SPOOL.md 跟不跟 git」→「Keep it on this computer only (suggested)」 | Because this is a git repository, it asks whether SPOOL.md should be committed. We recommend keeping it on this computer only: it just adds one line to .git/info/exclude — git's own ignore list that only applies to this machine. | 这是个 git 仓库，所以这一步会问 SPOOL.md 要不要跟着提交。推荐「只留在这台电脑」：这样只会往 `.git/info/exclude` 里加一行——那是 git 自带的、只对这台电脑生效的忽略清单。 | 「只留在这台电脑（推荐）· Keep it on this computer only (suggested)」 |
| 5 | AI 说明文件：勾 CLAUDE.md 加 `@SPOOL.md`、AGENTS.md 加一句 | AIs working in this folder won't read SPOOL.md on their own. Tick these two: a line "@SPOOL.md" in CLAUDE.md, so Claude Code reads it when it starts; and a sentence in AGENTS.md — read SPOOL.md before you start — for Codex. If those files don't exist, Spool won't create them. | 在这个文件夹里干活的 AI 不会自己去读 SPOOL.md。勾上这两项：CLAUDE.md 里加一行 `@SPOOL.md`，Claude Code 开工时会一起读进来；AGENTS.md 里加一句「开工前先读 SPOOL.md」，给 Codex 看。文件本来没有的话，Spool 不会替你新建。 | 两个勾选框 |
| 6 | 编辑器打开 SPOOL.md，滚一遍 | This is SPOOL.md. It tells an AI five things: which Spool projects this folder belongs to; who wins when they disagree — the folder, for the current state, with anything in Spool that conflicts counted as history; when to look things up in Spool; when to write back; and what never to write into Spool. Spool only edits its own section — anything you add below stays put — and if you change its section, it asks first. | 这就是 SPOOL.md。它告诉 AI 五件事：这个文件夹属于哪几个 Spool 项目；两边冲突时谁说了算——现在的状态听文件夹的，Spool 里跟它冲突的算历史；什么时候该来 Spool 查；什么时候该写回去；什么不该往 Spool 里写。Spool 只改它自己那一段，你写在下面的不会动；你改过它那一段，它会先问你。 | 依次框五个小标题 |
| 7 | 工作区页「Make main project」→ Portfolio site | Set a main project — that's where AI write-backs go by default. | 设一个主项目，AI 写回来默认进它。 | — |
| 8 | 终端：`claude` → "What's the plan for this portfolio site, and why did we decide on only three projects?" | Now open Claude Code in the repo, and ask something only Spool knows. | 现在在仓库里开 Claude Code，问它一个只有 Spool 知道答案的问题。 | — |
| 9 | Claude Code 读 SPOOL.md、调用 Spool → 回答引出「Three projects maximum. Cut everything else.」和记下的日期 | It read SPOOL.md first, so it knew to check Spool — then it found the original decision, and the day it was made. | 它先读了 SPOOL.md，知道该去 Spool 查，然后把当时的决定和记录日期都找了出来。 | 回答加速，关键句下划线 |
| 10 | 改 PLAN.md（"Switch to a one-page site"）→ `git commit` | Now let's change the plan, and commit. | 现在改一下计划，提交。 | — |
| 11 | Spool 工作区页：「1 state file(s) changed since」；Portfolio site 右栏同样提示 | Spool already knows the repo has moved on, and the project's side panel says so too. Weekly follow-ups wait until this is synced. | 回到 Spool，它已经知道仓库往前走了，项目右栏也会提醒。这时每周自动跟进会先停着。 | — |
| 12 | Claude Code："Record this change of direction in Spool." → 它写一块（标明取代旧的那块，进待审）→ 标记已同步 | Ask Claude Code to record the new direction in Spool. For a change like this, it marks which note it replaces — that waits in Review for you — and finally it tells Spool what it brought across, so Spool tracks changes from this point. | 让 Claude Code 把新方向记回 Spool。改方向这种事，它会标明取代了哪一块，进待审等你点头；最后它会告诉 Spool「这次带过来了什么」，Spool 从这里跟踪后续变化。 | 待审卡片、「In sync now」 |
| 13 | 收尾 | From now on, whenever an AI starts work in this repo, it knows which Spool project it belongs to, which side to trust, and when to write back — however long the project runs. | 以后每次在这个仓库里开工，AI 都知道它对应哪个 Spool 项目、该信哪边、什么时候写回。项目做多久，它都能跟上。 | — |

**说准**：
- **Spool 管不了 AI 用它自己的文件工具读这个文件夹**——Claude Code、Codex 这类客户端能直接读仓库里的任何东西，Spool 只决定它自己递过去什么（v0.7.4 发版说明 Known limits）。
- 私密项目不会出现在 SPOOL.md 里；私密项目也不能连文件夹。
- Spool 自己的后台任务不能替你「标记已同步」，只有你或你在用的 AI 能。

**重录点**：Claude Code 没读 SPOOL.md（CLAUDE.md 里那一行没加上），或者没调 Spool 就凭空回答——重来。

### 5.10 第 10 章 · 周回顾，接受建议动作（22:40–24:40）

**教会什么**：「Activity」怎么看；怎么跑一次周回顾；每个建议动作点了会发生什么；怎么让它每周自动来。
**录之前**：快照 T2；这一周有足够的新块，至少三个项目有动静；**发版二构建**。

| # | 画面与操作 | 英文旁白 | 中文旁白 | 标注 |
|---|---|---|---|---|
| 1 | 左栏「Weekly review」 | Weekly review lives in the left rail. | 再看左栏的「Weekly review」。 | — |
| 2 | 顶上「Activity」：每天的专注时间；这周有新块的项目，分「Captured · Written by you · Written back by AI」；到期的事 | The Activity section at the top uses no AI and costs nothing: how long you were at the computer each day, which projects got something new — captured, written by you, or written back by AI — and what's due soon. Focus time means time at the computer, not time spent on one particular project. | 最上面的「Activity」不用 AI、不花钱：这周每天在电脑前多久，哪些项目有新东西——你捕捉的、你写的、AI 写回来的——还有什么快到期。这里的专注时间是你在电脑前的时间，不是花在某个项目上的时间。 | 「Activity」 |
| 3 | 选这次走本机 CLI 还是 API → 跑 | Below it, choose the local CLI or an API key for this run, and start. The automatic weekly run uses whatever you choose here. | 往下，先选这次用本机 CLI 还是 API，再运行。每周自动回顾也用这里选的方式。 | 等待段加速 |
| 4 | 一个项目一张卡：What moved / Stuck on / Signals / Suggested | One card per project: what's changed, where it's stuck, the signals it noticed, and suggested actions. Wherever it quotes your notes, the words are exactly yours. | 每个项目一张卡：做了什么、卡在哪、看到的信号、建议动作。引用你笔记的地方都是原话，不会改你的字。 | 框住四栏 |
| 5 | Job search 卡：「Set the deadline to …」→ 点 →「Done. ⌘Z undoes it.」 | Suggested actions take one click. Here it noticed the deadline changed, and suggests updating it — click, done. Not right? Command-Z undoes it. | 建议动作点一下就生效。比如它注意到截止日期变了，建议改截止日——点一下，改好了。不对？⌘Z 撤回。 | 建议动作是 AI 当次给的，录到有这一条的那一次 |
| 6 | 「Add a follow-up: …」→ 点 →「Added to follow-ups.」 | It may suggest a new follow-up — one click adds it. | 它也会建议加一条跟进，点一下就进清单。 | — |
| 7 | 「Close this follow-up: …」→ 点 →「Closed.」 | It suggests closing One-off follow-ups that already have an answer. It never closes Permanent ones. | 已经有答案的单次跟进，它会建议关掉。永久跟进它不会去关。 | — |
| 8 | 「Propose replacing the old block (goes to Review)」→ 点 →「Waiting for you in Review.」 | Suggestions that touch an old note never change it directly. They go to Review, with the same three buttons as in chapter 6. | 动到旧笔记的建议不会直接改，会进待审，还是用第 6 章那三个按钮。 | — |
| 9 | 「Mark done」 | It suggests marking projects done if they look finished. | 看起来做完的项目，它会建议标完成。 | — |
| 10 | 打开「Review automatically once a week」 | Turn on "Review automatically once a week", and it runs about once a week by itself — again, only while Spool is open. | 打开「Review automatically once a week」，以后大约每周它自己跑一次，同样只在 Spool 开着时跑。 | 标注 |
| 11 | 屏幕右上角弹出「Weekly review updated · … · click to open」→ 点 → 打开周回顾 | When a new review is ready, a small card pops up where the capture card appears. Click it to jump straight in. | 周回顾出来后，会在捕捉卡的位置弹一张小卡，点一下就能打开。 | 框住小卡 |
| 12 | 收尾 | Finished and private projects are left out of the weekly review. | 做完的项目和私密项目不进周回顾。 | — |

**说准**：建议动作卡是发版二才有的，**v0.7.4 里没有**；周回顾引的原话 Spool 会逐字核对，对不上的不放上来（P10）。

### 5.11 第 11 章 · 完成项目，归档（24:40–25:40）

**教会什么**：怎么收尾；做完的项目去哪了；怎么再打开。
**录之前**：快照 T4。

| # | 画面与操作 | 英文旁白 | 中文旁白 | 标注 |
|---|---|---|---|---|
| 1 | Job search 顶上「Complete project」 | The job hunt is over. Click "Complete project". | 求职结束了。点「Complete project」。 | 「Complete project · 完成项目」 |
| 2 | 面板里写结论 "Accepted the Tidewick offer. Starting in January." → 完成 | Write one line as the conclusion. Later, it'll be the most useful line in the whole project. | 写一句结论。以后回头看，这一句最有用。 | — |
| 3 | 项目变成摘要页：结论、置顶块、文件和链接 | A finished project becomes a summary page: the conclusion, pinned notes, files and links. | 做完的项目变成一个摘要页：结论、置顶的几块、文件和链接。 | — |
| 4 | 左栏：Job hunt 整个工作区移到底部「Archive」 | Once every project in a workspace is done, the workspace moves itself into the Archive at the bottom. Right-click to archive one by hand — that marks its projects done, and Command-Z undoes it. | 一个工作区里的项目全做完了，它会自己进底部的「Archive」。也可以右键手动归档，里面的项目会一起标成完成；⌘Z 撤回。 | 「Archive · 归档」 |
| 5 | ⌘⇧F 搜一个 Job search 里的词 → 搜得到 | Archiving isn't deleting: search still finds everything. | 归档不是删除：全局搜索照样搜得到。 | 按键胶囊 ⌘⇧F |
| 6 | 摘要页「Reopen」 | To pick it up again, click "Reopen" — note that this clears the completion date and the conclusion. | 要接着做，点「Reopen」重新打开——注意它会清掉完成时间和结论。 | 「Reopen」 |

**说准**：「完成」是你自己点的，不是 AI 自动结项（过期检测和周回顾只是建议「标完成」）。

### 5.12 第 12 章 · 结尾（25:40–26:10）

| # | 画面与操作 | 英文旁白 | 中文旁白 | 标注 |
|---|---|---|---|---|
| 1 | 一段代码动画，把 13 章串成一根线 | A quick recap. Make a project and add its files. When you see something useful, copy, double-tap, and add a line of your own. Connect your AI, and let it read and write back. Let Spool keep watch, and review your week. When you're done, write one line and archive it. | 最后再回顾一下：建项目，添加文件；看到有用的就复制、双击，留一句自己的话；接上你的 AI，让它读、让它写回来；让 Spool 替你盯着、每周回顾；做完写一句结论，归档。 | — |
| 2 | 复制「Byebye👋」→ 双击 ⌥ → 卡片弹出，不打字，自己收起 | Bye-bye! | Byebye！ | 教程保留这个真捕捉的结尾（宣传片 11-01 起不用） |
| 3 | 片尾卡：spoolapp.org | Downloads and feedback: spoolapp.org. | 下载和反馈都在 spoolapp.org。 | 反馈入口只放官网（HANDOFF §10.6） |

---

## 6. 全片「说准」汇总

| 别这么说 | 要这么说 | 依据 |
|---|---|---|
| Spool 不需要 API key | 在 Claude、Codex 这些 AI 里用 Spool，不需要任何 API key；Spool 自己的自动功能，Mac 上可以用你已经登录的 Claude Code / Codex，Windows 上要你自己的 API key | HANDOFF §10.6；P13 任务书 |
| AI 写的东西都要你批准 | AI 只能追加、带署名、改不了你的字；更正、取代、拆分、挂文件、加跟进进待审 | README；v0.7.0 发版说明 |
| 跑一次大概几分钱 | API 按用量花你自己的钱，跑完显示这次实际花了多少 | HANDOFF §10.6 |
| 截完图马上双击就能捕 | 先在 ⌘⇧5 选项里关掉浮动缩略图 | P12 验收第 237 条 |
| 它 24 小时替你盯着 | 每周自动跟进、每月自动查、夜里自动压缩、每周自动回顾，都只在 Spool 开着时跑，默认都是关的 | v0.7.1、v0.7.3 发版说明 |
| Spool 会读你整个文件夹 | Spool 读你选的现状文件、看改动和提交标题；AI 客户端自己有文件工具的话能直接读文件夹，Spool 管不了 | v0.7.4 发版说明 |
| 私密项目是加密的 | 私密只管经过 Spool 的这条路，不加密磁盘上的东西 | v0.7.0 发版说明 |
| 研究证明 / 准确率多少 / 多少人在用 | 不说（宣传片里那句「我们研究过」只在宣传片用，教程不用） | 方针 §4.2；HANDOFF §10.6 |
| Windows 上也能长按写笔记 | 长按写笔记只在 Mac 上有 | P13 任务书 |
| 我是 Spool 的作者…（AI 声音念） | 用「我们 / 你」；作者本人想露面就自己配那一句 | §1 第 7 条 |

---

## 7. 拆条（每条 60–90 秒，竖版，中英各一份）

| 条 | 取自 | 一句话标题（中 / EN） |
|---|---|---|
| 1 | 第 4 章 1–4、9–10 | 复制，双击，存好了 / Copy, double-tap, saved |
| 2 | 第 5 章 4–11 | 一次接上，换哪个 AI 都认识你的项目 / Connect once — every AI knows your project |
| 3 | 第 6 章 4–6 | AI 想改你的笔记？先过你这关 / The AI proposes, you decide |
| 4 | 第 7 章 6–10 | 让 AI 每周替你上网盯着 / Let your AI keep watch every week |
| 5 | 第 8 章 8–12 | 哪条笔记已经过期了？ / Which notes are out of date? |
| 6 | 第 9 章 1、6、8–13 | 给代码仓库一份 SPOOL.md / Give your repo a SPOOL.md |
| 7 | 第 10 章 4–11 | 周回顾，点一下就办 / A weekly review you can act on |

竖版构图照宣传片 `01` §9.4。每条开头 2 秒直接上结果画面，不放片头。
