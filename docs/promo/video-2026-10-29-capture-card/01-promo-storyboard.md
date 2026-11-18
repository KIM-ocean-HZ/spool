# Spool 宣传片 · 分镜（第三版，主版 2:00）

> **状态**：设计稿，第三版（2026-10-31）；11-01 按你对样式帧的验收改过开头和结尾，11-01 晚按你对 P1d 开头的验收又改了开头（11-02 改完，见下）。还没录正片、没剪、没发布。现在开始制作，等发版二发布之后再发片。
>
> **怎么来的**：Hanze 2026-10-29 交代的一次性任务（owner interruption，HANDOFF 里那条「视频设计第二份方案已定稿」）。10-29 第二版定稿；10-30 按 `06` 的提示词做完了 P0、P1a、P1b；10-31 Hanze 看了 AI 生成的四段渲染，不喜欢，给了新的开头构想，于是改成这一版：
> - 原来四段穿插的 AI 渲染（笔记本抽屉、黑盒子、自动机器、纸卷轴）**全部舍弃**；
> - 换成 Hanze 设计的开头：凌乱的桌面 → 窗口炸出来 → 满屏的「如果」→ 双击 → 线把「如果」全卷进线轴 → 「Welcome to Spool!」弹窗放大占满屏幕；
> - 中段、结尾的渲染由我按故事节奏重新设计；实录加上和渲染同一套的效果；
> - 风格不再追求温暖、拟物。
>
> **11-01 第一次验收**（P1c 的 7 张样式帧）：V01–V03 内容可以，但太暗；V05 的线又僵又乱，抽象的 3D 线轴看不懂。改成：开头调亮（像阴天的白天）；双击之后字散开，V02 的窗口绕着正中的 Spool 图标转起来，转到正前方就被一根线拽进图标，图标越长越大，最后接标准版标志动画（§5 V04–V06、§7）；开头的 Welcome、结尾的 Byebye 弹窗都不用了，全片 V01–V18，仍是 2:00。接下来 Claude Code 和 Codex 照这一版各做一个开头，互相验收，你挑一版（`06` 提示词 3c、3d）。
>
> **11-01 晚第二次验收**（P1d 的两版开头）：你选定 Claude Code 那版往下做，不跑互相验收（3d）。三条意见：窗口上、屏幕上的通知数字去掉；第一幕屏幕和窗口的闪烁全部去掉；V05 不要线——窗口转到正前方直接被吸进图标，图标的圆环随每吸进一扇合上一点（直接用标准版标志动画 1.00–3.97 秒的帧），图标照旧由小长大。11-02 按这三条改完（§5 V01、V02、V05、V06，§7），变体不再出。同一天你加了第 14 句「如果」（§3.1），并把 V06 的大字定成官网首屏的大标题（§2.2）。
>
> **配套**：教程 [`02`](02-tutorial-script.md) · 依据和口径 [`03`](03-research-and-claims.md) · 制作流程 [`04`](04-production-pipeline.md) · 镜头清单 [`05`](05-shot-list.csv) · 给 Claude Code 的提示词 [`06`](06-claude-code-prompts.md)

---

## 0. 一屏看懂

**一句话**：开头是每个人都熟悉的求职乱局和一屏的「如果」；双击一下，字散开，那些乱糟糟的窗口绕着正中的 Spool 图标转起来，一扇扇被吸进去，图标的圆环一圈圈合上、越长越大，Spool 登场；之后每一段真实操作，都把一句「如果」翻成答案；结尾所有「如果」一起翻面，卷成你自己的数据卷轴，再收回 Spool 图标。

**看完要能说出四件事**：

1. **怎么存**：复制，双击。不用离开正在看的页面。
2. **存进去的怎么用**：我在用的 AI 直接读、直接写回来；第二天换一个 AI，也接得上。
3. **它还替我做什么**：盯着我关心的问题，找出过期的，每周告诉我下一步。
4. **为什么不干脆交给全自动 agent**：Spool 只从我给它的东西出发，我一直在里面。

| 段落 | 时间 | 内容 | 做法 |
|---|---|---|---|
| 开头 | 0:00–0:26 | 凌乱的桌面 → 窗口炸出来 → 满屏「如果」→ 双击 → 窗口绕着 Spool 图标转、一扇扇被吸进去 → 标准版标志动画 | 渲染（只在最后说一句 "Meet Spool."） |
| 建项目 | 0:26–0:32 | 一个项目装下整个求职，连上文件夹 | 实录 + 效果 |
| 存 | 0:32–0:49 | **加速捕捉**：左边来源一直换，右边项目一直长；「如果」一张张翻成答案 | 实录 + 效果 |
| AI 读写 | 0:49–1:06 | AI 读你的整个项目作答 → 写回、署名、等你点头 | 实录 + 效果 |
| 换 AI | 1:06–1:15 | 第二天换一个 AI，读出上一个写回的决定，还把求职信写进文件夹 | 实录 + 效果 |
| 保持新鲜 | 1:15–1:32 | 跟进替你查 → 过期的被标出来 → 周回顾 | 实录 + 效果 |
| 是你的 | 1:32–1:46 | 超级 agent（点名 OpenClaw、Hermes Agent）→ 研究那一句 + 四条原则 | 渲染 → 实录 |
| 收尾 | 1:46–2:00 | 拿到 offer、归档 → 所有「如果」翻面、卷成数据卷轴 → 收回 Spool 图标 → 标志和网址 | 实录 → 渲染 |

**版本**：主版 2:00（16:9，英文 AI 旁白 + 屏幕字 + 音乐），另出中文版（屏幕上的「如果」和答案换成中文，加中文字幕）；60 秒、30 秒竖版、15 秒（§9）。

---

## 1. 定下来的事

| 问题 | 定了什么 | 什么时候 |
|---|---|---|
| 主线故事 | 求职：伦敦小团队的初级数据分析师岗位 | 第二轮 |
| 主片长度 | 约 2:00 | 第二轮 |
| **开头** | **Hanze 的构想**：凌乱桌面、窗口炸出来、满屏「如果」、双击。**11-01 改**：双击之后字散开，V02 的窗口绕着正中的 Spool 图标转起来，转到正前方就被吸进图标，图标越长越大，最后接标准版标志动画；不另画线轴，不用 Welcome 弹窗。**11-01 晚改**：不要线；图标的圆环随每吸进一扇合上一点；不放通知数字，不闪。双击之前没有旁白，基调沉闷但不阴暗 | 第三轮；**11-01**；**11-01 晚** |
| **「如果」** | Hanze 给的 8 句原话照用，我补了 5 句，按普通用户最常遇到的程度排（§3）；11-02 Hanze 加了第 14 句（换 AI 账号，记录一并带过去） | **第三轮**；**11-02** |
| **渲染** | 原来四段 AI 渲染**舍弃**。新的三段渲染（开头、超级 agent、结尾）**用代码做 3D 动效**，不用 AI 视频生成：画面里全是要读清楚的字和界面，AI 视频模型画不准。你看样式帧和动态小样拍板（§8） | **第三轮** |
| **风格** | 不追求温暖、拟物：开头是阴天那样的冷灰、沉闷（11-01 调亮，不要阴暗）；双击之后一步步变亮、干净；线要软、要少（§7） | 第三轮；**11-01** |
| **实录** | 加和渲染同一套的效果：窗口浮在同一个空间里、信息流动画成线、「如果」卡翻面当每段的标题（§7.4） | **第三轮** |
| 对比 | 「AI 各记各的」「笔记」「AI 记忆是黑箱」「知识过期」**并进开头的「如果」**（不点名任何产品）；**超级 agent 保留点名** OpenClaw、Hermes Agent，换成新风格的渲染 | 第三轮 |
| **捕捉卡弹窗** | **首尾都不用**：开头不画 Welcome 卡，结尾不拍 Byebye，片子最后落在标志和网址上。教程第 0、12 章照旧用真捕捉教手势 | **11-01** |
| 研究那一句 | "We studied how AI memory fails — then designed Spool with that in mind." + 四条原则；**只这两支视频例外**，方针不改 | 第二轮 |
| MCP | MCP 为主，Pack 一闪而过 | 第二轮 |
| 旁白 | 英文 AI 配音（ElevenLabs）；中文版用字幕 | 第二轮 |
| 录屏 | 我来录（你电脑上的 Claude Code，`06`），用改名成「Spool」的演示版 | 第二轮 |
| 跟进那一镜 | 真实的「New data analyst openings at small teams in London」，公司名打码 | 第一轮 |
| Windows | 不拍 Windows 镜头；片尾写「Mac & Windows」 | 第二轮 |
| 「AI 不会忘」 | 照用："Your AI never forgets." | 第一轮 |
| 标志 | 用 10-30 采纳的液态玻璃图标和 10-31 采纳的组装动效（下文叫「标准版标志动画」，`docs/logo/README.md`）；开头、结尾都由图标把东西收进去（开头不带线，图标的圆环随之合上，11-01 晚），再接标准版标志动画；旧的平面 SVG 只作几何参照 | 10-30、10-31、11-01 |
| 什么时候发 | 发版二发布之后 | 第一轮 |
| **谁来做开头** | Claude Code 和 Codex 照这一版各做一个开头，你挑喜欢的那版往下做（`06` 提示词 3c）。**11-01 晚你选定 Claude Code 那版，不跑互相验收（3d）** | **11-01**；**11-01 晚** |

---

## 2. 创作简报

### 2.1 给谁看

- **主要**：在校学生和刚工作的人，用 AI 学习、做项目、找工作、处理生活杂事，同时开着两三个 AI。
- **次要**：重度 AI 用户、独立开发者（仓库、SPOOL.md 放教程第 9 章）。
- 观众是用户，不是开发者（PROMO-VERDICT §2）：讲「它能为你做什么」。

### 2.2 一句话

> **EN** · Never explain your project twice.
>
> **中** · 同一个项目，不必解释第二遍。
>
> 11-02 Hanze 定：用官网首屏的大标题（`site/index.html`、`site/zh/index.html`），意思和原来那句（"One memory for your project — and every AI you use can read it." / 「给你的项目一份记忆，你用的每个 AI 都能读。」）一样，更好记。

### 2.3 基调

- **开头**：沉闷、压迫、乱，但不阴暗——像阴天的白天，不像深夜（11-01）。没有旁白，只有声音（通知声、打字、风扇、闷响），「如果」一句一句砸下来。
- **双击之后**：安静一拍；乱糟糟的窗口一扇扇被吸进 Spool 图标，画面一步步变亮、变干净。旁白温和、口语、不急。
- 可以「形式略大于内容」（PROMO-VERDICT §1），但**不放任何讲效果、讲用量的数字**。

### 2.4 硬约束，逐条落实

| 约束 | 出处 | 片中怎么做 |
|---|---|---|
| 观众是用户 | PROMO-VERDICT §2、§3.2 | 旁白不用 §2.5 的禁用词 |
| 不放台账里查不到的数字 | PROMO-VERDICT §3.1；HANDOFF §10.6 | 全片没有效果、用量数字 |
| 渲染后面必须跟真截图 | HANDOFF §10.6 | 开头渲染后面紧跟实录；超级 agent 渲染后面紧跟真实界面。结尾 11-01 起不再接 Byebye：结尾之前每一句说法都已经由实录演示过，结尾的卷轴本身用的是真实截图，最后只落在标志和网址上 |
| 渲染不能冒充产品 | HANDOFF §10.6（产品界面只许真截图） | 开头、结尾都不画任何 Spool 界面，只用采纳版图标和标准版标志动画；Spool 的每个功能都只用实录演示 |
| 线轴是中心主题 | PROMO-VERDICT §4.1 | Spool 图标画的就是一个线轴：开头它把窗口一扇扇收进去、圆环一圈圈合上、越长越大；结尾卷轴也收回它。不再另画抽象的线轴（11-01：看不懂） |
| 无限延长，再收束成一点 | PROMO-VERDICT §4.3 | V18：卷轴一直展开，再收回正中的 Spool 图标，接标准版标志动画 |
| 用户不能看到测试环境的 Spool | HANDOFF §10.6（08-22） | 演示版已改名「Spool」；画面里不许有 "Spool Demo"、"Terminal probe"、"Path changed"、token、¥、模型 ID、开发者菜单 |
| 少用 emoji | HANDOFF §10.6（08-22） | 全片不用 emoji（Byebye 那一镜 11-01 去掉了） |
| 「不需要 API key」作废 | HANDOFF §10.6（08-20） | 跟进的脚注写清楚本机 CLI / 自己的 API key |
| 研究结果不能当宣传证据 | 方针 §4.2、§4.3 | **这一次例外**（第二轮的决定，方针不改）；不放任何研究数字（`03` §6） |
| 真实外部用户 = 0 | HANDOFF §10.6 | 不说多少人在用 |
| 价格、许可封着 | HANDOFF §10.4 | 不说 free / 免费 |

### 2.5 用词

**旁白和大字里不出现**：压缩、缓存命中、token、上下文预算、provenance、SQL、pack / 打包、块 / block、零出网、sidecar、prompt、CLI、API。

例外：**MCP** 只在 V09 那行兼容列表的末尾小字里（"via MCP"）；**CLI / API key** 只在 V12 的脚注小字里。界面截图里本来就有 "Pack"、"Compress"、"Blocks" 这些字，不用处理，但不要把镜头推到它们身上当主角。

---

## 3. 「如果」

### 3.1 怎么排的

按**普通人用 AI 找工作时最常遇到、而 Spool 正好有办法**的程度排：人人都有的习惯问题在前（懒得记、记不住），然后是 AI 的记忆问题，然后是求职里的具体事，最后是「回顾」「AI 到底记住了什么」这类不那么常被意识到的。前 4 句要让观众读清楚，后面越来越快、越来越密。

Hanze 给的 8 句**原话照用**（中文版）；我补的 5 句标了「新」。英文主版是我的译写。

第 14 句是 Hanze 11-02 加的，原话是「如果我切换AI账号的时候所有的记录能被一并带过去就好了」；屏幕上去掉了句尾的「就好了」，和前 13 句一样只留「如果……」（AI 前后照全片的写法加空格）。它的英文、答案和在哪一镜翻面是我提的，11-02 你都同意了（去掉「就好了」也同意）。

| # | 屏幕上（中文版） | 屏幕上（英文主版） | 翻过来的答案（英 / 中） | 在哪一镜翻面 |
|---|---|---|---|---|
| 1 | 如果我没有这么懒得做笔记 | If I weren't so lazy about taking notes… | Copy. Double-tap. Saved. / 复制，双击，存好了。 | V08 第 1 拍 |
| 2 | 如果我还记得上个月那家公司的详细信息 | If I still remembered that company from last month… | Everything you saved stays — and it's searchable. / 存过的都在，还搜得到。 | V17 |
| 3 | 如果 AI 可以一直记得我的简历和我聊天 | If my AI could remember my CV — and every chat… | Your AI reads your project. / 你的 AI 直接读你的项目。 | V09 |
| 4 | 如果我能每天都做好信息整理 | If I kept my job-hunt info organised every day… | Every capture lands in the project you're working on. / 捕捉的都落进你正在做的项目。 | V08 结尾 |
| 5 | 如果换一个 AI，不用再从头讲一遍（新） | If switching AI didn't mean starting over… | Different AI. Same project. / 换个 AI，还是同一个项目。 | V11 |
| 6 | 如果我没有忘记上次 AI 给我的那句建议 | If I hadn't lost that advice my AI gave me… | Saved — not buried in a chat. / 存进项目，不再淹没在聊天记录里。 | V08 第 3 拍 |
| 7 | 如果截图没有堆满桌面（新） | If my screenshots weren't piling up on my desktop… | Screenshots go straight into the project. / 截图直接进项目。 | V08 第 2 拍 |
| 8 | 如果我还记得那句话是在哪儿看到的（新） | If I could remember where I read that… | Every note keeps its source. / 每一条都带着出处。 | V08 第 4 拍 |
| 9 | 如果那次 AI 对话我把信息给全了 | If I'd given the AI the whole picture that time… | It sees the whole project — not just this chat. / 它看的是整个项目，不只是这一次对话。 | V09 |
| 10 | 如果我没有忘记每天查看新开放的岗位信息 | If I hadn't forgotten to check for new openings… | Spool checks for you, every week. / Spool 每周替你查。 | V12 |
| 11 | 如果我早点发现截止日期改了（新） | If I'd noticed the deadline had moved… | Out-of-date notes get flagged. / 过期的会被标出来。 | V13 |
| 12 | 如果我可以每周都给自己做一个总结 | If I gave myself a review every week… | A weekly review, written for you. / 每周回顾，替你写好。 | V14 |
| 13 | 如果我知道 AI 到底记住了我什么（新） | If I knew what my AI actually remembers about me… | Every line visible. You decide. / 每一行都看得见，你说了算。 | V10 |
| 14 | 如果我切换 AI 账号的时候所有的记录能被一并带过去（11-02 加） | If all my history came with me when I switched AI accounts… | New account. Same project. / 换个账号，还是同一个项目。 | V11（和 5 一起） |

**这张表就是全片的骨架**：开头 14 句砸满屏幕；中间每一段实录，把对应的那一句翻成答案；结尾 14 句一起翻面。

### 3.2 分寸

- 「如果」是观众自己的心里话，不点任何产品的名，也不是对别家的指控。
- 翻过来的答案是 Spool 的产品说法，每一句的依据和边界在 `03` §7。几处要留意：
  - 10「Spool checks for you, every week」：每周自动查默认是关的，V12 要拍到它被打开，并配脚注。
  - 11「Out-of-date notes get flagged」：过期检测要你点一下或打开每月自动查才会跑，不是每时每刻都在查。
  - 3、9「Your AI reads your project」「It sees the whole project」：只对接上了 Spool 的 AI 成立。
  - 14「New account. Same project.」：带过去的是存进 Spool 的东西，不是 AI 账号自己的聊天记录；新账号要先在 Spool 里接上（Connect）。
- 原来第二版的五组对比（AI 各记各的、笔记软件、记忆黑箱、知识过期、超级 agent）：前四组的意思现在都在「如果」里（3、5、9、13、14 是 AI 记忆；1、4、7 是笔记；11 是过期），不再单独做渲染；超级 agent 保留（V15）。

---

## 4. 分镜总览（主版 2:00）

类型：**R** = 渲染（代码做的 3D 动效）；**U** = 真实界面录屏；**FX** = 加在实录上的效果。素材编号见 §8.3 和 `04` §7.2。

| 镜号 | 时间码 | 时长 | 画面一句话 | 类型 | 素材 |
|---|---|---|---|---|---|
| V01 | 0:00 | 4s | 冷灰的电脑屏幕，桌面上堆满文件和截图 | R | RO、A10 |
| V02 | 0:04 | 4s | 邮件、简历、招聘网页、Excel、两个 AI、记事本从屏幕里炸出来 | R | RO、A01–A09 |
| V03 | 0:08 | 8s | 14 句「如果」一句句砸下来，越来越快，铺满整个屏幕 | R | RO |
| V04 | 0:16 | 1s | 一下子安静；一颗没有字的键被按了两下，两圈波纹把满屏的字抹开，露出后面的窗口 | R | RO |
| V05 | 0:17 | 6s | 窗口绕着正中的 Spool 图标转起来；转到正前方的那扇被吸进图标，图标的圆环合上一点、长大一点，画面亮一点 | R | RO、A01–A09、图标、标志动画母版 |
| V06 | 0:23 | 3s | 标准版标志动画的后半段：字标出现、停住；"Meet Spool."；接真实的 Spool 窗口 | R → U | RO、标志动画母版、U02 |
| V07 | 0:26 | 6s | 一个项目装下整个求职：⌘N、Capture here、连文件夹、拖进简历 | U + FX | U02 |
| V08 | 0:32 | 17s | **加速捕捉**：网页 → PPT 截图 → AI 的建议 → 邮件 → Word → 越来越快 | U + FX | U03 |
| V09 | 0:49 | 10s | 一键接上 AI；Claude 读整个项目作答 | U + FX | U04、U05 |
| V10 | 0:59 | 7s | 决定写回来、署名、绿点亮；跟进等你点「Add it」 | U + FX | U05、U06 |
| V11 | 1:06 | 9s | 第二天，ChatGPT 里的 Codex 读出这个决定，把求职信写进文件夹 | U + FX | U07 |
| V12 | 1:15 | 6s | 跟进替你上网查，结果进待审（公司名打码） | U + FX | U08 |
| V13 | 1:21 | 6s | 新邮件说截止延期 → 过期检测配出这一对 →「Replace in full」 | U + FX | U09 |
| V14 | 1:27 | 5s | 周回顾 →「Set the deadline」 | U + FX | U10 |
| V15 | 1:32 | 7s | 开头那堆窗口又回来，被一个自己会动的光标飞快做完；你的卡片被吹走 | R | RX |
| V16 | 1:39 | 7s | 线把卡片接回来；研究那一句 + 四条原则压在真实界面上 | R + U | RX、U11 |
| V17 | 1:46 | 5s | 捕捉 offer 邮件 → 完成项目 → 归档 → 一搜还在 | U + FX | U12 |
| V18 | 1:51 | 9s | 14 句「如果」回来，一起翻面，卷成数据卷轴，收回 Spool 图标，接标志和网址 | R | RE |

**和第二版的镜号对照**：V07 = 原 S04，V08 = S06，V09 = S08，V10 = S09，V11 = S11，V12 = S12，V13 = S14（并进了原 S13 那封延期邮件），V14 = S15，V15 = 新做的 S16，V16 = S17，V17 = S18，V18 = 新做的 S19。原 S01（真实 Welcome 捕捉）、S02、S03、S05、S07、S10 不再用；原 S20（Byebye，第三版里曾叫 V19）11-01 去掉。录屏编号 U02–U12 不变，U01、U13 不再用。

---

## 5. 逐镜脚本

每镜：**画面 / 镜头 / 大字 / 旁白（英文）/ 中文字幕 / 声音 / 依据与注意 / 通过标准**。

### V01 · 凌乱的桌面（0:00–0:04，RO）

- **画面**：一片暗的空间里浮着一块电脑屏幕（简洁的外框，不画写实的笔记本）。屏幕上是一张乱成一团的桌面：几十个文件图标叠在一起——`CV_final.docx`、`CV_final_v2.docx`、`CV_FINAL_really.docx`、`cover letter (3).docx`、一长串 `Screenshot 2026-11-… .png`、`jobs links.txt`、`Untitled 7.txt`、`offer?.pdf`。光标漫无目的地晃，停一下，又晃走。不放通知数字（11-01 晚：没人解释的数字只会让人分心）。
- **镜头**：缓慢推近屏幕。
- **颜色**：阴天那样的冷灰、降饱和，轻颗粒（花样固定，不每帧变）；屏幕不闪（11-01 晚）。**不要黑底**（11-01：P1c 那版太暗），颜色见 §7.2。
- **大字 / 旁白**：无。
- **声音**：低沉的底噪、钟表滴答、一声通知、远处的打字声。
- **注意**：桌面、图标、文件名全部用代码画，**不用你电脑的真实桌面**（会露出个人文件），也不用系统自带的图标。

### V02 · 窗口炸出来（0:04–0:08，RO）

- **画面**：屏幕里的东西「炸」出来，一扇扇窗口冲向镜头，悬在空间里，互相压着：
  - 邮件：招聘方来信「Re: Tidewick — next steps」；
  - Word：简历；
  - 浏览器：三个招聘页（Tidewick、Quillhaven、另一家）；
  - Excel：投递跟踪表，状态一栏写着「?」；
  - AI 一号（通用聊天窗口）：你问「Which of these roles suits me? I sent you my CV yesterday…」；
  - AI 二号（通用 agent 窗口）：「Writing cover_letter_v7.docx… Can you paste your CV again?」；
  - 记事本：潦草的几行「Tidewick call Thu?? / deadline 15th or 29th? / ask about the SQL test」。
  窗口都降了饱和；不闪，窗口外也不加通知数字（11-01 晚）。
- **镜头**：炸开那一下轻微一震，之后在窗口之间缓慢漂移。
- **声音**：一声闷闷的爆开，然后通知声、打字声、风扇声越叠越多。
- **素材**：邮件、Word、浏览器、Excel、记事本用**真实软件的截图**（虚构内容，`04` §7.2 的 A01–A07）；两个 AI 窗口**用代码画成通用样子**，不像任何一家产品（A08、A09）。

### V03 · 满屏的「如果」（0:08–0:16，RO）

- **画面**：§3.1 的 14 句「如果」一句一句砸到画面上，压在乱糟糟的窗口前面：
  - 前 4 句每句约 1.1 秒，字大、读得清；
  - 第 5–14 句越来越快，字有大有小、有斜有正，互相压着；
  - 句子之间的空隙被它们自己的「回声」填满（更小、更淡的重复）；
  - 最后一秒，画面被字完全盖满，一点背景都看不见。
- **大字**：就是这 14 句（英文主版用英文，中文版用中文）。
- **颜色**：开头最压抑的一刻，靠密度和声音压人，不靠黑（11-01）：底是冷灰，字近白、读得清，颜色见 §7.2。
- **旁白**：无。
- **声音**：每落一句一声闷响，越来越密；底噪越来越厚，最后是一片压抑的嗡鸣。

### V04 · 双击（0:16–0:17，RO）

- **画面**：所有东西突然定住，声音全部消失（0.3 秒）。画面底部露出一角简化的键盘，一颗**没有任何字**的键被按了两下：第一下，一圈波纹荡开，满屏的字跟着一颤；第二下，第二圈波纹扫过，字像被抹掉一样往外散开、淡掉，露出后面还悬着的那些窗口。
- **声音**：两声清脆的「哒、哒」；第二声之后，底噪一下子空了。
- **注意**：不标是哪个键（Hanze 指定）。字是被波纹抹开的，**不用线去抓字**（11-01）。

### V05 · 窗口环绕，一扇扇被吸进 Spool 图标（0:17–0:23，RO）

- **画面**（11-01 晚改：没有线）：
  1. （0.6s）V02 那 9 扇窗口一扇接一扇（各错开约 0.03 秒）散开，排成一个环；环的正中，Spool 图标轻轻弹出来，起始约为画面高度的 9%。这时的图标是标准版标志动画 1.00 秒的样子：橙色圆角方块、一圈很淡的玻璃盘、中间一个小点，三道环都还没有。
  2. （0.4s）环转起来，像一个转盘绕着图标转：正前方的窗口从画面右边过来、往左走，再从左后方绕到图标后面。
  3. （2.4s）前三扇慢一点，让人看清是什么：**Tidewick 招聘页 → 简历 → 招聘方来信**。每一扇转到正前方（图标正下方）时停一小下（约 0.15 秒），然后被吸进图标——先慢后快，一边缩小、一边微微后仰，钻到图标后面淡掉；同时环转向下一扇。每吸进一扇：图标的圆环合上一点，图标长大一圈、带一点回弹，画面亮一档。
  4. （1.6s）剩下六扇不再停，环越转越快：AI 聊天窗、Excel、记事本、AI agent、Quillhaven、Kestrelby，每扇经过正前方时直接被吸走，路线从它当时的位置出发、弯进图标。剩下的窗口在环上重新均匀排开，左右大致对称；窗口的颜色也一点点回来。
  5. （1.0s）第 9 扇进去时，圆环正好合成完整的采纳版图标；图标轻轻一跳，再平稳地长到标准版标志动画里图标的位置和大小；背景正好变成标志动画的纸白。接 V06。
- **圆环怎么合上**（11-01 晚）：直接用标准版标志动画母版 1.00–3.97 秒的帧——这一段正好是「中心小环、浅色中环先合上，白色问号大线最后长全」，3.97 秒那一帧就是采纳版图标。每一帧按图标的形状从纸白里原样抠出来，不重画、不调色；分成 9 步，每步的变化量大致相等，每吸进一扇就把母版往前播一步。
- **空间和大小**（3840×2160 下的起点数字，以画面舒服为准；改了写进报告）：
  - 图标的中心固定在标准版标志动画里图标的中心：2160×2160 的母版居中放进 4K 画面后，图标中心在 (1920, 907) 左右，即水平正中、离顶约 42%。
  - 环的中心就是图标。相机微微俯视（约 15–20°），环看起来是个扁椭圆：正前方在图标正下方，离顶约 78%；正后方在图标后面偏上，离顶约 32%；左右两端接近画面两边。
  - 窗口的大小 = 它本来的大小（浏览器比记事本大，按 V02 的比例）× 远近：正前方最大（宽约画面的 30–34%），两侧中等，正后方最小（约 12%）；越远越虚一点、淡一点；转到图标后面的被图标挡住。窗口基本正对镜头，只随位置偏转不超过 15°，保证读得清。
  - **两样东西都在「中间」，但上下错开**：正前方那扇窗的上沿，始终比图标的下沿低至少画面高度的 3%，谁也不挡谁。图标长大时，环跟着略微下移、收一点半径，保持这段空隙。
  - 图标从约 9% 开始，九扇进完时约 24%；最后一秒长到标志动画里的大小（约 47%）。
- **声音**：环转起来一阵低低的呼呼声；每吸进一扇一声轻「嗒」，越来越密；画面每亮一档，底噪薄一层；最后一扇进去，音乐第一下亮起来。
- **注意**：图标只用 `docs/logo/exports/spool-artwork-srgb-1024.png` 和标准版标志动画母版的帧（原样抠出），不重画、不调色；不再画 3D 线轴（11-01：看不懂）；**不用线**（11-01 晚）。窗口还是 V02 那几张（真软件截图 + 代码画的两个通用 AI 窗口）。
- **通过标准**：不看说明也能看懂「乱七八糟的东西被一样样收进 Spool」；前三扇每一扇都看得出是什么；画面里没有线；前三扇每进一扇，圆环都看得出合上了一点，第 9 扇进去时图标和采纳版一模一样；图标始终没被窗口挡住；最后一帧的图标和 V06 第一帧的图标，位置、大小对到 1 像素以内。

### V06 · 标准版标志动画（0:23–0:26，RO → U02）

- **画面**：接 V05：标准版标志动画的后半段——「Spool」字标在图标下面柔和出现，玻璃盘里一道高光掠过，停住；字标下面再出一行大字。最后 0.6 秒，真实的 Spool 主窗口从景深里浮上来（FX1），标志淡出，接 V07 的第一帧。
- **大字**：Spool 标志 + "Never explain your project twice."（官网首屏大标题，11-02）；中文版的大字：同一个项目，不必解释第二遍。（官网中文首屏大标题，11-02 Hanze 定）
- **旁白**："Meet Spool."
- **中文字幕**：这是 Spool。
- **注意**：
  - 标志动画用本机的 ProRes 母版 `docs/logo/motion/clean-assembly-v1/spool-assembly-clean-v1-2160p60-master.mov`（2160×2160、60 fps、纸白不透明底），居中放进 4K 画面，两边用同一个纸白补满；不重画、不调色。时间轴见同目录 `README.md`：图标约 4.05 秒收成采纳版完整的样子，字标 3.70–5.10 秒出现，5.10–6.95 秒停留。
  - 接点选在母版里图标已经完整、字标刚开始出现的那一刻（约 3.70–4.05 秒，逐帧对），用不超过 0.3 秒的交叉淡化盖住接缝；接缝前后图标不能跳。
  - **变体「完整播放」不再出**（11-01 晚）：母版的前半段（1.00–3.97 秒）已经在 V05 里随吸进的窗口一段段播过，从头再放一遍是重复。

### V07 · 一个项目装下整个求职（0:26–0:32，U02 + FX）

- **画面**：
  1. （2s）真实 Spool 主窗口：「Job hunt」工作区里 ⌘N → 输入「Job search」→ 回车 →「Capture here」→ 标题旁出现「Capturing ●」。
  2. （3s，2 倍速）点工作区名「Job hunt」→「Connect a folder…」→ 选「Job search」文件夹 → 向导走完 →「Linked folder」卡片；从 Finder 把「CV — Sam Rivera.docx」拖进项目右栏「Project files」。
  3. （1s）在文本编辑里给 PLAN.md 改一行、保存 → 工作区页提示「1 state file(s) changed since」。
- **效果**：窗口浮在明亮的空间里（FX1）；拖简历那一下，一根琥珀线从文件连到「Project files」（FX2）。
- **大字**："One project for the whole job hunt."
- **旁白**："One project for the whole job hunt. Link a folder — Spool notices when your plan changes."
- **中文字幕**：整个求职过程，一个项目。连上文件夹，计划一改，Spool 就知道。

### V08 · 加速捕捉蒙太奇（0:32–0:49，U03 + FX）——全片的主角

- **构图**：录制时屏幕真的分成左右两块：左边是来源（各种软件轮流上来），右边是 Spool 主窗口，开着「Job search」的时间线。捕捉卡在屏幕右上角弹出，回车后新的一块落进右边的时间线。整段是一条连续的真实录屏，后期只做变速、剪短和加效果。
- **节拍**（来源数据见 `04` §5.3）：

| 拍 | 时长 | 速度 | 左边 | 动作 | 卡片里写的一句 | 翻面的「如果」 |
|---|---|---|---|---|---|---|
| 1 | 5.5s | 1× | 浏览器 · Tidewick 招聘页 | 选中 "You'll own our reporting end to end — SQL, dbt, and plenty of curiosity." → ⌘C → 双击 ⌥ → 打字 → 回车 | Small team — I'd own the whole pipeline. | 1 |
| 2 | 4.5s | 1× | PowerPoint · 流失看板案例 | ⌃⌘⇧4 框住图表 → 双击 ⌥ → 卡片上是小图和注释框 → 打字 → 回车 | Lead with this in interviews. | 7 |
| 3 | 约 2.3s | 3× | 浏览器 · 通用的 AI 聊天页 | 选中 AI 的一句建议 "Lead with your churn dashboard — it shows impact, not just tasks." → 捕捉 | Keep this. | 6 |
| 4 | 约 1.8s | 4× | 邮件 · 招聘方来信 | 选中 "Could you do a 30-minute call on Thursday?" → 捕捉；新的一块的来源行写着「Mail」 | Prep the churn story. | 8 |
| 5 | 约 1.2s | 6× | Word · 简历 | 选中 "Built a churn dashboard the ops team uses every week." → 捕捉 | Move this to the top. | — |
| 6–10 | 约 2s | 10× 左右，剪成跳切 | PDF 面试清单、活动页、Quillhaven 招聘页（"Applications close 15 November."）、Excel 投递表截图、文本里的面试问题 | 每一下只留「卡片弹出 → 落进时间线」那一瞬 | 各自一句 | 结尾：4 |

- **效果**：左右两块窗口浮在空间里、微微相向（FX1）；每捕一下，一根琥珀线从选中的那句话连到右边新落下的那一块（FX2）；「如果」卡在左上角一张张翻面，翻完摞成一小叠（FX3）；第 1 拍卡片弹出时推近 1.6 倍，之后不推近；最后 1 秒拉远，右边时间线已经长了一大截。
- **大字**：第 1 拍按键胶囊 `⌘C`、`⌥ ⌥`（这里要教手势，所以标出按键；开头不标）；其余由翻面的卡片说话。
- **旁白**（压在第 1–3 拍上，后面让音乐带）："Found something useful? Copy it and double-tap. It's saved — with the source, the time, and a thought of your own. Screenshots too. You never leave the page."
- **中文字幕**：看到有用的？复制，双击，就存好了——带着来源、时间，和你自己的一句话。截图也行。全程不用离开这一页。
- **依据**：复制后 10 秒内双击 ⌥ 才算捕捉；两下之间不超过 250 毫秒；截图快捷键也算「复制」；浏览器的来源记的是标签页标题（`03` §7）。
- **和开头的呼应**：左边轮流上来的，正是 V02 里炸出来的那几扇窗（招聘页、AI 的建议、邮件、简历、Excel、记事本）——乱局被一下一下收进同一个项目。
- **通过标准**：每一下都是真捕捉（右边真的多出一块）；第 1、2 拍完整、1 倍速；左边始终在前台。

### V09 · AI 读你的整个项目（0:49–0:59，U04 + U05 + FX）

- **画面**：
  1. （1.5s，加速）Spool 设置 → MCP：打开「MCP server」「Allow AI writes」→ Claude Desktop 那一行点「Connect」→ 已连接。
  2. （7.5s）Claude 桌面版，新对话，侧栏收起。输入 "Which of my saved roles fits me best? Use my Job search project in Spool." → Claude 显示在用 Spool（工具调用折叠）→ 回答引到你自己的话，例如 "You noted 'Small team — I'd own the whole pipeline'…"。
  3. （1s）Pack 一闪："Another chat app? ⌘⇧P copies the whole project."
- **效果**：工具调用那一刻，一根线从 Spool 窗口连到 Claude 窗口（FX2）；回答里引到的那句话，和 Spool 里的原文同时亮起下划线；「如果」3、9 翻面（FX3）。
- **小字**："Works with Claude · Claude Code · Codex · Cursor · VS Code · Windsurf — via MCP"
- **旁白**："Spool plugs straight into the AI apps you already use. They read your whole project — your notes, your files, your decisions."
- **中文字幕**：Spool 直接连接你已经在用的 AI 应用。它们读的是你的整个项目——你的笔记、你的文件、你做过的决定。
- **注意**：回答录到引对了你的批注的那一次为止，不改字；第一次调用的允许弹窗录前先点掉。
- **通过标准**：回答里至少一处原样引到你的批注；没有账户名、头像、历史对话。

### V10 · 写回来、署名、等你点头（0:59–1:06，U05 + U06 + FX）

- **画面**：Claude 里接着说 "Save that as my decision — and add a follow-up: new data analyst openings at small teams in London." → 切到 Spool：Job search 的小圆点变绿；新的一块标着「Claude · MCP」，下面一行写它引了哪几块；待审出现「1」→ "Claude wants to add something for ‹Job search› to watch" →「Add it」。
- **效果**：一根线从 Claude 窗口回到 Spool（FX2）；「如果」13 翻面。
- **大字**："Written back — signed." → 翻面的卡片 "Every line visible. You decide."
- **旁白**："Good answers get written back — signed. Your notes stay yours; bigger changes wait for you."
- **中文字幕**：好的答案会写回来，也会署名；你的笔记不动，大的改动都等你点头。
- **说准**：AI 追加的块是直接写进来的（只能追加，带署名）；加跟进、更正、取代才进待审。不说「AI 写的一切都要你批准」。

### V11 · 接力：换一个 AI，还写进了文件（1:06–1:15，U07 + FX）——核心证明镜头

- **画面**：左上角小字 "Next day"。ChatGPT 桌面版里的 Codex，新对话，什么都不贴，只输入 "Write a short cover letter for Tidewick from my Spool project, and save it in my Job search folder." → 它读 Spool → 信里用上了你的话（"own your reporting end to end"）和昨天 Claude 写回的决定（"lead with the churn dashboard"）→ 文件夹里出现「Cover letter — Tidewick.md」。最后 2 秒三格并排：Claude 昨天的回答 / Spool 里那块决定 / Codex 今天的信，同一句话依次亮起下划线。
- **效果**：线从 Spool 连到 Codex 窗口，再从 Codex 连到新出现的文件（FX2）；「如果」5 翻面。这一镜回应开头 V02 里「一个 AI 在问、一个 AI 在写文件」。
- **大字**：翻面的卡片 "Different AI. Same project." → 停 1.5 秒的大字 "Your AI never forgets."；小标签 "Codex in the ChatGPT app"。
- **旁白**："Next day, a different AI picks up right where you left off. Nothing to re-explain. Your AI never forgets."
- **中文字幕**：第二天换一个 AI，接着上次往下做。什么都不用重讲。你的 AI 不会忘。
- **注意**：不能换成事先写好的答案；等待可以剪短。Codex 写不进文件夹的话（权限或沙盒），就只拍对话里的信，去掉「写进文件夹」那一句旁白和画面。
- **通过标准**：新对话里没有贴任何上下文；信里真的用上了昨天写回的决定。

### V12 · 跟进替你查（1:15–1:21，U08 + FX）

- **画面**：Job search 右栏「Watching for」：「New data analyst openings at small teams in London」，打开「Search once a week by itself」→ 点「Search the web」，选本机 CLI → 等待加速，角上小字 "Waiting time shortened" → 待审出现数字 → 带来源链接、标着 Follow up 的新发现 → 存入。
- **效果**：线从 Spool 伸出画面再带着结果回来（FX2）；公司名、标志打码；「如果」10 翻面。
- **脚注小字**（必须有）："Runs with Claude Code or Codex on your Mac, or your own API key · only while Spool is open"
- **旁白**："Spool keeps checking the questions you care about — and brings back what it finds."
- **中文字幕**：你在意的问题，Spool 会一直替你查，查到了就拿给你看。
- **注意**：结果必须是真跑的。查不到新东西就换一天再跑；实在没有，换成真实的「没有新消息」画面，卡片答案改成 "Quiet when there's nothing new."。

### V13 · 截止日期改了（1:21–1:27，U09 + FX）

- **画面**：（1.5s，加速）邮件「We've extended the deadline to 29 November.」→ ⌘C → 双击 → 存进 Job search（真捕捉，D14）。→ Job search「Out-of-date check」页签 → 跑（加速）→ 结果一对：旧的「Applications close 15 November.」/「In the newer #…: We've extended the deadline to 29 November.」→「Correct one point / Replace in full / Leave alone」→ 点「Replace in full」。
- **效果**：旧的那一块在画面上稍微褪色，被一根线连到新的那一块（FX2）；「如果」11 翻面。
- **旁白**："When something goes out of date, Spool flags it — and asks before replacing anything."
- **中文字幕**：有东西过期了，Spool 会标出来；换不换，先问你。
- **依据**：过期检测找出被后面的块整条取代的旧块；你不点，库里一个字都不动（界面原话，`03` §5）。

### V14 · 周回顾（1:27–1:32，U10 + FX，必须用发版二构建）

- **画面**：屏幕右上角弹出「Weekly review updated · … · click to open」→ 点开 → Job search 那张卡：What moved / Stuck on / Signals / Suggested → 点「Set the deadline to …」→「Done. ⌘Z undoes it.」
- **效果**：「如果」12 翻面。
- **旁白**："Every week: what moved, what's stuck, and the next step — one click away."
- **中文字幕**：每周告诉你：做了什么，卡在哪，下一步做什么——点一下就办。
- **注意**：建议动作卡（P10）不在 v0.7.4 tag 里；样片先占位，正片用发版二构建，录到出现「改截止日」的那一次为止。

### V15 · 超级 agent（1:32–1:39，RX）

- **画面**：画面稍微冷下来。开头 V02 那堆窗口又回来了，但这次没有人在操作：一个自己会动的光标飞快地穿过所有窗口，表单自己填好、信自己发出去、一个个窗口被盖上「Applied ✓」后关掉。左上角那一叠已经翻好面的卡片（你的东西）被这阵风吹得散开、飘出画面。
- **大字**："OpenClaw · Hermes Agent" → "They can run the whole job hunt for you." → "How much of it is still you?"
- **旁白**："OpenClaw and Hermes Agent can run the whole job hunt for you. But how much is still you?"
- **中文字幕**：OpenClaw、Hermes Agent 能替你走完整个求职流程。可这里面，还有多少是你？
- **分寸**：前半句是事实（它们确实能替你跑完整个项目），后半句是问题，不是指控；名字只用文字，不画任何一家的标志，不出现龙虾、爪子（`03` §3）。

### V16 · 研究那一句 + 四条原则（1:39–1:46，RX + U11）

- **画面**：飘走的卡片被线一张张接住、拉回来，重新摞好（一次最多两根线，§7.5）。画面亮回来，依次出现四条原则，每条下面压一个 1 秒的真实界面画面（浮在同一个空间里）：
  1. "Your words, unedited." —— 一块里你自己写的批注
  2. "Every note keeps its source." —— 一块的来源和时间那一行
  3. "AI changes wait for you." —— 待审卡片
  4. "Old facts get flagged." —— V13 那一对
- **大字**（顶部，全程）："We studied how AI memory fails — then designed Spool with that in mind."
- **旁白**："Spool works only from what you give it. We studied how AI memory fails — then designed Spool with that in mind."
- **中文字幕**：Spool 只从你给它的东西出发。我们研究过 AI 的记忆会怎样出错，再据此设计了 Spool。
- **边界**：只这两支视频例外；不放任何研究数字，不说「证明了」「最准确」（`03` §6）。

### V17 · 拿到 offer，完成，归档（1:46–1:51，U12 + FX）

- **画面**：邮件「Offer — Junior Data Analyst」→ 选中 "We're delighted to offer you the role." → ⌘C → 双击 → 卡片上打 "YES." → 回车。切 Spool：「Complete project」→ 结论 "Accepted the Tidewick offer. Starting in January." → 完成 → 摘要页 → 左栏「Job hunt」整个工作区滑进「Archive」→（1s，加速）⌘⇧F 搜「Tidewick」，归档里的内容照样搜得到。
- **效果**：「如果」2 翻面。
- **旁白**："Got the offer? Mark it done. Spool archives it — still searchable."
- **中文字幕**：拿到 offer 了？标完成。Spool 把它归档，随时还能搜到。
- **注意**：工作区里的项目全完成才会自己进归档，所以录这一镜前 Interview prep 已经标完成（`04` §5.6 快照 E）。

### V18 · 所有「如果」翻面，卷成数据卷轴，收回 Spool 图标（1:51–2:00，RE）

- **画面**：
  1. （1s）开头那 14 句「如果」回到画面，铺满——但这次画面是亮的。
  2. （2s）一阵波浪从一角扫过，14 张卡依次翻面，全部变成答案。
  3. （3s）线把翻好的卡片，连同片子里真实捕捉过的那些块（截图合成），一张张串起来，铺成一卷长长的卷轴，在空间里一直展开，望不到头。
  4. （3s）卷轴收紧，像开头那些窗口一样被吸回画面正中的 Spool 图标；图标长大，接标准版标志动画的后半段（字标出现、停住），落成标志 + 网址，停到片尾。
- **大字**："Learning. Projects. Job hunting. Everyday life." → "Build your own data scroll." → 标志 + "spoolapp.org · Mac & Windows"
- **旁白**："For studying, projects, job hunting — even chores: stop using AI the hard way. Let Spool build your own data scroll."
- **中文字幕**：学习、做项目、找工作，甚至日常琐事——别再低效地用 AI 了。让 Spool 帮你整理出一卷属于自己的数据卷轴。
- **声音**：最后一个音落在标志停住的那一刻。
- **注意**：这一镜同时落实 PROMO-VERDICT §4.3 的「无限延长，再收束成一点」：卷轴一直展开，再收回图标。卷轴上的卡片用真实截图，不让生成器画界面。和开头 V05、V06 用同一套图标和标志动画，首尾呼应。**片子在这里结束**（11-01 起不再接 Byebye）；网址和平台写法发片前和官网对一遍。

---

## 6. 英文旁白净稿

开头 V01–V05 没有旁白。全稿约 213 个英文词；最快的一句是 V16（每秒约 3.0 个词，11-02 改成 designed… 之后多了两个词），其次 V07（约 2.7），其余都在 2.6 以下。V07、V10、V12 的旁白 11-02 对照代码改过（`03` §7.2）。

| 镜号 | 目标时长 | 旁白 |
|---|---|---|
| V06 | 1.5s | Meet Spool. |
| V07 | 6s | One project for the whole job hunt. Link a folder — Spool notices when your plan changes. |
| V08 | 前 12s | Found something useful? Copy it and double-tap. It's saved — with the source, the time, and a thought of your own. Screenshots too. You never leave the page. |
| V09 | 8.5s | Spool plugs straight into the AI apps you already use. They read your whole project — your notes, your files, your decisions. |
| V10 | 7s | Good answers get written back — signed. Your notes stay yours; bigger changes wait for you. |
| V11 | 8s | Next day, a different AI picks up right where you left off. Nothing to re-explain. Your AI never forgets. |
| V12 | 6s | Spool keeps checking the questions you care about — and brings back what it finds. |
| V13 | 6s | When something goes out of date, Spool flags it — and asks before replacing anything. |
| V14 | 5s | Every week: what moved, what's stuck, and the next step — one click away. |
| V15 | 7s | OpenClaw and Hermes Agent can run the whole job hunt for you. But how much is still you? |
| V16 | 7s | Spool works only from what you give it. We studied how AI memory fails — then designed Spool with that in mind. |
| V17 | 5s | Got the offer? Mark it done. Spool archives it — still searchable. |
| V18 | 9s | For studying, projects, job hunting — even chores: stop using AI the hard way. Let Spool build your own data scroll. |

**读法**：温和、口语、不急；V06 那一句轻轻地说，像推开一扇门。发音："Spool" /spuːl/；"Hermes" /ˈhɜːrmiːz/；"OpenClaw" 读作 open-claw。

---

## 7. 画面风格：渲染和实录用同一套

### 7.1 总原则

- **不追求温暖、拟物**。一个干净的、看不到边的空间；窗口、卡片、字都是浮在里面的平面。**Spool 图标和线是贯穿全片的两样东西**：开头图标把乱局一样样收进去（开头不用线，11-01 晚）；中间线连起每一次信息流动；结尾卷轴回到图标。
- 开头冷、乱、沉闷，但**不黑**（11-01：像阴天的白天，不像深夜）；双击之后一步步变亮、变干净、有秩序。超级 agent 那一镜稍微冷回去，然后再亮。
- **真实界面不调色**：实录里 Spool 和各个软件的界面保持原样，只给它们周围的空间调色。开头 V02–V05 的窗口是「乱局」的一部分，可以降饱和。

### 7.2 颜色

开头那几个灰是 11-01 调亮后的起点，以样式帧看着舒服为准；改了写进报告。

| 用途 | 值 |
|---|---|
| 开头的空间 | 阴天那样的冷灰：中间 `#5D636C` → 四角 `#474C54`，轻颗粒（花样固定，不每帧变）。原来的 `#121417` → `#1B1E23` 太暗；整个开头最暗处不低于 `#3A3E45` |
| 开头的屏幕（V01） | 桌面底色 `#7C838E`，屏幕外框 `#2E3136`；文件图标浅灰白，文件名 `#EEF0F2` |
| 开头的窗口（V02–V05） | 降饱和约 35%，不压暗；不闪（11-01 晚）。V05 里随着画面变亮，颜色一点点回来 |
| 「如果」的字（V03） | 主句近白 `#F2F3F5`（不透明度 90–100%），回声 `#D3D7DD`（30–60%）；字下的条 `#50565F`（约 70%） |
| V05 的空间 | 从开头的冷灰起，每吸进一扇窗亮一档；最后一扇进去时正好到标准版标志动画的纸白（`#FAF7F0`，从母版的画面取色，对到一致） |
| 实录段的空间 | 中性浅灰 `#F2F2F0` → 白，柔和投影（不偏暖） |
| 线（灰场） | 象牙白 `#FBF7EE`，带和图标里那根线一样的偏移阴影 |
| 线（亮场） | 琥珀 `#B45309`（品牌色） |
| 翻过来的答案卡 | 白底、近黑字 `#1C1A16`，左边一道琥珀细条 |
| AI 新写入的绿点 | `#2E9E57`（界面原有，只在 V10 出现） |

### 7.3 字、标志、动效

- 字：英文 **Geist**（「如果」、大字、标注），中文 **思源黑体**；按键胶囊 **Geist Mono**。
- 标志：10-30 采纳的液态玻璃图标（`docs/logo/exports/spool-artwork-srgb-1024.png`，带透明圆角；深色版 `spool-artwork-dark-srgb-1024.png`）和 10-31 采纳的组装动效，也就是**标准版标志动画**（`docs/logo/spool-logo-assembly.mp4`；4K 用本机的 ProRes 母版 `docs/logo/motion/clean-assembly-v1/spool-assembly-clean-v1-2160p60-master.mov`，字标是 app 里的 Fraunces 400）。都不重画、不调色。旧的平面 `spool-logo-*.svg` 不再出现在画面里。
- **不另画线轴**（11-01：P1c 做的 3D 线轴太抽象，看不懂）。开头、结尾「收进去」的那一点就是图标本身（图标画的就是一个线轴）；开头它的圆环随吸进的窗口一扇扇合上（用的是标准版标志动画自己的帧，11-01 晚），长大到最后，接标准版标志动画的后半段。
- 动效：界面类的移动统一 cubic-bezier(0.22, 1, 0.36, 1)；线和图标长大用带一点回弹的弹簧；V02 的炸开用快速的减速曲线；V05 的环平滑加速，不要匀速。
- 字幕每屏最多两行，每行不超过约 42 个英文字符。

### 7.4 实录上加的效果（FX）

和渲染同一套空间、同一根线、同一种卡片，让观众感觉是一部片，不是「动画 + 录屏」拼起来的。

| 编号 | 效果 | 用在 |
|---|---|---|
| FX1 | **浮窗**：录下来的窗口裁出来，放进同一个空间（同样的背景、投影，最多 8° 的透视），镜头缓慢移动；需要看清的细节最多推近 2 倍 | 全部实录 |
| FX2 | **线**：每一次信息流动画一根线——来源 → 新的一块；Spool → AI；AI → Spool；Spool → 另一个 AI → 文件；Spool → 网上 → 回来。线的起点终点取自录制日志里的真实坐标；怎么动见 §7.5 | V07–V14、V17 |
| FX3 | **「如果」卡翻面**：对应的那句「如果」从左上角外滑进来，翻成答案，停约 2 秒，摞进左上角那一叠（这一叠在全片里越摞越厚，V15 被吹散、V16 被接回、V18 全部回到画面） | V08–V14、V17 |
| FX4 | **聚焦**：要看的细节保持清晰，周围压暗、虚化 | 全部实录 |
| FX5 | **统一的标注**：按键胶囊、下划线、打码框、"Waiting time shortened"、"Next day" | 全部实录 |
| FX6 | **匹配转场**：标志 → Spool 窗口；窗口 → 卡片；卡片 → 卷轴 → 图标 | V06、V16、V18 |

**真实性**：效果只加在界面**外面**和界面**上面**（线、卡片、下划线、打码），**不改界面里的任何一个字**，AI 的回答原样保留。

### 7.5 线怎么动（11-01）

P1c 的线又僵又乱：13 根直线从一点同时射出去。全片的线都照这几条（开头 V01–V06 不用线，11-01 晚）：

1. **一次最多一根**（V16 接卡片最多两根）。不许一把线同时射出去。
2. **线是软的**：伸出去时带一点下垂的弧度（悬链线或三次贝塞尔，端点用弹簧跟着走），落到地方之后才绷直；收回时线头先走、整根跟着收，收完轻轻一弹。
3. **不许**出现直线段、折角、锯齿、抖动，也不许横穿要读的字。
4. **粗细一致**：4K 下约 6–8 像素，两头圆头。灰场象牙白带偏移阴影，亮场琥珀。
5. **起点、终点都说得出是哪儿**：被复制那句话的末尾、新块的引文、窗口上沿正中。
6. **节奏**：伸出 0.15–0.25 秒 → 落点停半拍 → 拽回或淡掉 0.3–0.4 秒。快的段落可以压短，但每一根都要看得出这三步。

---

## 8. 渲染怎么做

### 8.1 为什么不用 AI 视频生成

开头和结尾的画面里全是要读清楚的字（14 句「如果」、文件名、窗口内容）；窗口要精确地转到图标正下方再被吸进去，图标最后要和标准版标志动画对到 1 像素。现在的 AI 视频模型写不准字、画不准界面，也控制不了这些位置。所以这三段**用代码做 3D 动效**：每一个字、每一根线的位置都可控，改一句字只要重渲一遍。你不需要会渲染，也不用再去网页上生成——你只要看样式帧和动态小样拍板。

### 8.2 三段渲染

| 编号 | 用在 | 内容 | 时长 |
|---|---|---|---|
| RO | V01–V06 | 开头：桌面 → 窗口炸出来 → 满屏「如果」→ 双击 → 窗口环绕、一扇扇被吸进 Spool 图标 → 标准版标志动画，最后接上实录 | 约 26 秒，一镜到底 |
| RX | V15–V16 前半 | 超级 agent：窗口被自动做完、卡片被吹散、线把卡片接回来 | 约 10 秒 |
| RE | V18 | 结尾：「如果」回来 → 翻面 → 卷轴 → 收回 Spool 图标 → 标准版标志动画 + 网址 | 约 9 秒 |

### 8.3 素材

| 编号 | 是什么 | 怎么来 |
|---|---|---|
| A01 | 邮件窗口：招聘方来信（虚构，D04） | 真实邮件软件打开 .eml 截图（2 倍屏） |
| A02 | Word 窗口：简历 | 真实 Word 截图 |
| A03–A05 | 浏览器：三个招聘页 | 真实浏览器截图（P1a 做好的虚构网页） |
| A06 | Excel 窗口：投递跟踪表（状态一栏有「?」） | 真实 Excel 截图 |
| A07 | 记事本：潦草的几行 | 真实「文本编辑」截图 |
| A08 | 通用 AI 聊天窗口（在问问题） | 代码画 |
| A09 | 通用 AI agent 窗口（在写文件） | 代码画 |
| A10 | 凌乱的桌面：通用文件图标和虚构文件名 | 代码画，不用真实桌面、不用系统图标 |
| 标志 | 图标 PNG；标准版标志动画的 ProRes 母版 | `docs/logo/`（§7.3） |

A01–A07 在 P1c 已经截好，私人信息也处理掉了（`~/Movies/Spool-video/graphics/promo-v3/public/assets/`，处理记录在 `EDITS.json`）。原来的 A11（真捕捉卡截图，给 Welcome 卡用）11-01 起不用了。

### 8.4 步骤（每一步都等你拍板）

1. **样式帧**（P1c，10-31 提示词 3b）：出了 7 张。11-01 你验收：V01–V03 内容可以但太暗；V05 要改；首尾不用弹窗。
2. **开头返工、两版对比**（P1d，11-01 加）：Claude Code 和 Codex 照同一份分镜各做一版——10 张样式帧 + 开头 26 秒的 1080p 动态测试 + 一个变体片段；然后互相验收，你挑一版往下做（`06` 提示词 3c、3d）。**11-01 晚你选定 Claude Code 那版，不跑互相验收；11-02 照你的三条意见改完，变体不再出。**
3. **动态小样**（P2）：整片 2:00 的低清版，渲染用简化的材质，实录用样片，配临时配音。你看节奏和内容。
4. **正式渲染**（P3）：4K 渲染，接正式配音和音乐。

工具（Remotion + three.js）、规格和交接见 `04` §7。

---

## 9. 短版本

### 9.1 60 秒（16:9 和 9:16 各一版）

| 顺序 | 取自 | 时长 |
|---|---|---|
| 1 | V02 + V03（窗口炸开 + 「如果」压缩成 5 秒） | 7s |
| 2 | V04–V06（双击 → 窗口被吸进图标，留前三扇和最后的快速段 → 标志） | 6s |
| 3 | V08（第 1、2 拍 + 最后的跳切） | 12s |
| 4 | V09（只留 Claude 那段） | 7s |
| 5 | V10 | 4s |
| 6 | V11 | 8s |
| 7 | V14 | 4s |
| 8 | V16（只留研究那一句 + 四条原则各 0.8 秒） | 5s |
| 9 | V18（卷轴 → 图标 → 标志和网址） | 7s |
|  | 合计 | 60s |

### 9.2 30 秒竖版（9:16）

V03（「如果」一句句往下堆，竖屏正好堆满，3s）→ V04–V06（5s）→ V08 第 1 拍 + 跳切（8s）→ V11（7s）→ V18（7s）。

### 9.3 15 秒

V03（3s）→ V05（只留最后的快速段，3s）→ V08 第 1 拍（5s）→ V18 标志和网址（4s）。

### 9.4 竖版构图

- 「如果」在竖屏里改成从上往下一句句堆，堆满整屏。
- V05 的环在竖屏里收窄：图标在上三分之一，正前方的窗口在画面中间偏下。
- 分屏蒙太奇改成上下两块：上来源、下 Spool 时间线。
- 翻面的卡片放在上三分之一；底部 20% 留给平台按钮和字幕。

---

## 10. 交付规格

| 项 | 规格 |
|---|---|
| 母版 | 3840 × 2160，30 fps，ProRes 422 HQ |
| 网络版 | 1920 × 1080 H.264；YouTube 另传 4K；竖版 1080 × 1920 |
| 响度 | −14 LUFS，true peak −1 dBTP |
| 字幕 | 英文、中文两份 SRT；中文版屏幕上的「如果」和答案换成中文 |
| 封面 | 1280 × 720：窗口绕着正中的 Spool 图标转、一扇正被吸进图标、圆环合上一半的一瞬；不放数字 |
| 文件名 | `spool-promo-<版本>-<语言>-<比例>-<日期>.mov` |
| 素材记录 | 每条真录的 app 版本、commit、库快照、日期写进 `manifest.json`（`04` §11） |

---

## 11. 发布前核对单

- [ ] 发版二已经发布，Mac 和 Windows 都能下载；片尾写的平台和官网一致。
- [ ] 全片没有效果、用量数字；没有 free / 免费 / 多少人在用 / 研究证明。
- [ ] 旁白和大字里没有 §2.5 的禁用词（MCP 只在 V09 小字里）。
- [ ] 开头、超级 agent 两段渲染后面都紧跟真实界面；结尾的卷轴用的是真实截图；Spool 的每个功能都是实录演示的。
- [ ] 开头、结尾没有画任何 Spool 界面或捕捉卡；图标和标准版标志动画用的是采纳版文件，没有重画、没有调色。
- [ ] 画面里没有 "Spool Demo"、"Terminal probe"、"Path changed"、token、¥、模型 ID、开发者菜单。
- [ ] 开头的桌面、文件名、AI 窗口都是画的或虚构的，没有你电脑上的真实文件；两个 AI 窗口不像任何一家产品。
- [ ] 效果没有改动界面里的任何一个字；AI 的回答是真跑的，只加了下划线。
- [ ] 线照 §7.5：任何时候最多一根（V16 两根），没有直线段、折角、抖动；开头 V01–V06 没有线。
- [ ] 开头没有通知数字，屏幕和窗口没有闪烁。
- [ ] V11 的新对话里没有贴任何上下文。
- [ ] V12 的结果是真跑的，有来源链接，公司名和标志打了码；脚注在。
- [ ] V14 用的是发版二构建，周回顾是真跑的。
- [ ] OpenClaw、Hermes Agent 只出现文字，没有标志和像它们的形象；说法和 `03` §3 一致。
- [ ] 14 张答案卡的说法和 `03` §7 一致（尤其 10、11、14 的边界）。
- [ ] 第三方界面（Claude、ChatGPT）里没有私人账户、头像、历史对话。
- [ ] 简介里写商标说明和来源（`03` §8.4）。
- [ ] 音乐、字体、AI 配音的授权留档。
- [ ] 找一个没用过 Spool 的人看一遍，不先讲产品。他能说出「怎么存」「AI 怎么用它」「换 AI 会怎样」「从哪开始」，片子才算讲清楚。
