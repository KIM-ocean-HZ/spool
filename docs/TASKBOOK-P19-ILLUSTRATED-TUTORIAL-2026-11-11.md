# 产品任务书 P19 —— 图文教程（中英两版，放上官网）

> **状态：ACTIVE —— 页面已做完、本地提交（`c84ef53`、`2b6e9da`，没推），等 Ocean 点头推送上线（P19-6）；进度看 §7.2**
>
> **唯一交付**：官网上一页英文教程、一页中文教程（`spoolapp.org/guide.html`、`spoolapp.org/zh/guide.html`），从安装一直讲到项目做完归档；每一步配 **v0.8.1 正式版界面的真截图**，用演示数据拍；官网导航能点进去，手机上也能读。
>
> **来历**：HANDOFF §5.1「内测前的顺序：图文教程 → 重构问卷 → 内测海报 + 奖励 → 内测」；Ocean 11-11（第 316 条）原话「先做教程，我需要 Agent 全部做完，并且配备中英文两个版本，在官网也放」；11-11 开 P18 / P19 这一窗时补的要求：全部由 Agent 做完（写稿、真截图、排版、放上官网），Ocean 只看结果；中英两版、官网两页都要有；只许真截图，用 v0.8.1 正式版的界面和演示数据，不碰真库；截图要占用屏幕时先问 Ocean 能不能离开一会儿。
>
> **授权来源（只引用、不改）**：第 316 条；HANDOFF 附录 B 红线「产品内、官网功能说明、文档里只许真截图」「用户不能看到测试环境的 Spool」「大白话」「少用 emoji」；旧第 261 条（推送每次都问）；记忆 `isolated-verify-workflow` §42（演示版）、§56（截图前先问能不能离开）、`demo-project-two-copies`、`video-shoot-p0-lessons`、`next-stage-goals-website-portfolio`（官网文案大白话、截图多场景）。
>
> **边界**
> - 只加官网页面和图片（`site/guide.html`、`site/zh/guide.html`、`site/assets/guide/…`），加导航入口（`site/index.html` / `story.html` / `privacy.html` 的导航和页脚、`scripts/site-zh-strings.mjs`、`node scripts/build-site-zh.mjs` 重生成中文页），README 加一行链接。**不改产品代码、不改产品行为。** 拍的过程中发现产品的毛病只记 HANDOFF，不顺手修。
> - ⛔ 不碰真库：演示版是同一份 v0.8.1 源码（tag `v0.8.1`）改 identifier 编出来的，数据目录、钥匙串条目都和正式版分开（§42 的三处 + productName 仍叫「Spool」，画面里不出现「Spool Demo」）。⛔ 演示版设置页 MCP 那一页的「Update config」不点（会把真客户端指向演示版）；要接 AI 客户端只按 §4 第 3 题的答案做，改之前备份、拍完改回。
> - 只写现在 v0.8.1 真有的东西；数字只用台账里查得到的；不写「一次多少钱」、95/5、MemTrapBench 的百分数、「研究证明」；限制照实说（视频讲稿 §6「说准」那张表照用，以 v0.8.1 为准再核一遍）。
> - 这是产品说明，不是营销物料：不做渲染图、不加宣传话，截图不美化（只裁切、只加标注框）。
> - 不碰实验线；不动 `docs/EXECUTION_POLICY.md`。

---

## 1. 开工前读

1. `docs/EXECUTION_POLICY.md`（不改）；`docs/HANDOFF-2026-11-09.md` 首屏、§1、§2、§4、§5.1、附录 B。
2. 视频教程定稿讲稿 `docs/promo/video-2026-10-29-capture-card/02-tutorial-script.md`（13 章，中英旁白，每章的「说准」和 §6 汇总）和 `04-production-pipeline.md` §3 – §6（录制环境、演示数据、自动操作）。图文教程沿用它的章节结构和说法，但**按 v0.8.1 的界面逐条重核**（见 §2）。
3. 官网结构：`site/index.html`、`site/story.html`（长文页的样式可以照它）、`site/assets/site.css`、`site/assets/lang.js`、`scripts/build-site-zh.mjs`（中文页怎么生成）、`scripts/build-site-shots.sh`（截图怎么裁、怎么转无损 WebP、换图后框要重量）。
4. 记忆：`isolated-verify-workflow` §40 – §46、§51、§56；`video-shoot-p0-lessons`；`demo-project-two-copies`；`ui-language-follows-system`；`write-plainly-for-ocean`。

## 2. 现在（2026-11-11 对着 `v0.8.1` 查的）

**已有的材料**
- 视频讲稿 13 章：开场、安装和第一次打开、工作区和项目、连文件夹加文件、捕捉（文字 / 截图 / 长按）、接上 AI（MCP）、AI 写回 + 提议 + 跟进清单、本机 CLI 或 API 替你跟进、压缩和过期检测、连代码仓库和 SPOOL.md、周回顾、完成归档、结尾。故事是一个求职项目「Job search」从建到归档，第 9 章换成连着代码仓库的「Portfolio site」。没录、没剪。
- 拍视频时搭好的环境（`~/Movies/Spool-video/`）：演示版源码 `build/demo074-r1/`（v0.7.4 + 演示改动，productName「Spool」、identifier `com.oceanjin.spool.demo074`）、数据快照 `snapshots/A`、`B`、`C`、`C10`、`C11`（库 v37，10 – 11 个项目、34 – 47 块）、换快照脚本 `scripts/swap-snapshot.sh`（认死演示版的数据目录，碰到真库路径就停）、自动操作脚本 `scripts/shots/`。演示文件夹 `~/spool-video/Job search/`（简历、求职信、PLAN.md、SPOOL.md）、演示仓库 `~/spool-demo-v074/portfolio-site`。
- 官网截图的做法：演示库上拍真窗口 → 只裁切、不重画 → 无损 WebP（`build-site-shots.sh`）。

**讲稿写完之后产品改过的、拍之前要对的**（不全，P19-1 逐条对 v0.8.1 的界面）
- 连文件夹卡上的「In sync now / 已经对过了」按钮 P16-4 去掉了；对照仓库 P16-7 并进了过期检测（一个按钮、一张单子）。
- 首启两个新手项目的说法 P17 改过（第 1 章可以推近拍正文了）。
- 跟进结果卡多了「关掉 / 留着」按钮（P16-3）；更正块在时间线上合成一行（P16-8）；块编号圈改成画出来的正圆（`661b829`）。
- 周回顾的建议动作卡、v0.8.0 的引擎只读一个项目（P16）。
- 按钮原文中英两份都以 v0.8.1 为准（`src/i18n/`）。

**磁盘**：数据盘约 13 GB 空闲。演示版在原来的 `build/demo074-r1/` 上换源码增量编（不另起 7 GB 的 target）。

## 3. 步骤

### P19-0 · 开工核对 + 问 §4

- `git status`（研究线没提交的改动照旧不碰）；`node scripts/build-site-zh.mjs` 和它的测试现状。
- §4 一次问完。

### P19-1 · 对稿、写正文（不碰屏幕）

- 把讲稿 13 章按 v0.8.1 逐条核：每一步的按钮原文（中英）、行为、限制。对不上的改说法，记在回执里（哪一章哪一步、原来怎么写、现在是什么）。
- 写教程正文中英两份：每章「这一章教会什么」一两句 → 一步一个动作（动词开头）→ 配图 → 「注意」只写真会踩到的；Windows 的差别按 §4 第 4 题。大白话；一屏最多一个 ⚠️；不用装饰性 emoji。
- 列出截图清单（每章哪几张、拍什么状态、哪张要加标注框），估出要占屏幕多久。

### P19-2 · 演示版 v0.8.1

- `build/demo074-r1/` 换成 tag `v0.8.1` 的源码（保留 `node_modules`、`target`），再把 §42 的演示改动加回去（identifier、`mcp.rs` 的 `APP_IDENTIFIER`、`api_engine.rs` 的 `KEYCHAIN_SERVICE`、productName「Spool」、签名 `-`），增量编出 `.app`，替换 `~/Desktop/Spool/Spool-Demo-v0.7.4/Spool-video.app`（旧的挪走不删）。核：界面和正式版 v0.8.1 一致（版本号、设置页、按钮文字）；`lsof` 核它只开自己的库。
- 快照照 §4 第 2 题准备（英文一套沿用视频的；要中文示例内容的话另做一套），先在副本上让演示版迁到 v39。
- 授权（输入监控 / 辅助功能 / 自动化）：重编会让授权失效，要 Ocean 在系统设置里点一下 —— 到那一步写一步一个动作的说明给他。拍捕捉卡时先从菜单栏暂停正式版的捕捉（§42 第 5 条），拍完恢复。

### P19-3 · 截图（要占屏幕，先问 Ocean 能不能离开、多久）

- 每段开始前问一次；用脚本驱动演示版（HID 层发事件，`video-shoot-p0-lessons`），按窗口 id 截（`screencapture -l`），不截到别的窗口和个人信息；AI 客户端的账户名、头像、历史对话打码（不透明色块）。
- 中英两套按 §4 第 2 题；浅色外观；窗口大小固定，同一章的图对齐。
- AI 真跑按 §4 第 3 题：每一张 AI 回答都是那一次真跑的结果，不改字；跑的次数和花费写回执。
- 截完：恢复正式版的捕捉、按备份改回 AI 客户端的设置并核对、演示版退出。

### P19-4 · 排版成官网页面

- `site/guide.html`（英文）、`site/zh/guide.html`（中文）：长文页，章节目录（桌面在侧边、手机折叠在顶上）、每章锚点、图下一行说明、图可以点开看大图；样式用 `site.css` 的现有变量，深浅色都要看得清。两页手写（不走 `build-site-zh` 的逐串替换 —— 截图和示例内容两种语言不一样），互相用语言切换链接指过去，`lang.js` 的老链接转发照旧能用。
- 截图：`site/assets/guide/en|zh/…`，PNG 原图 + 无损 WebP（照 `build-site-shots.sh`），带宽高、`loading="lazy"`、中英各自的 alt。
- 入口：首页、story、隐私页的导航和页脚各加「Guide / 教程」（`site-zh-strings.mjs` 加词条，重生成中文页，`build-site-zh` 测试要过）；README 加一行链接。

### P19-5 · 本地检查

- 本地起服务看两页：每张图都加载、每个锚点能跳、两种语言互相切换对；320 / 390 / 768 / 1280 像素宽都没有横向滚动（`DISCOVERED-20261031-1` 那种别再出）；深色模式能看。
- 文字核一遍：没有「Spool Demo」、token 数、开发者菜单、测试项目名；没有台账查不到的数字；按钮原文和截图里一致。
- 页面总大小记下来。

### P19-6 · 上线（推送先问 Ocean）

- 推 `main`（`site/` 改了会触发官网部署）；部署后线上两页、导航入口、图片都核一遍（带 `?v=` 绕缓存）。

### P19-7 · 收尾

- 回执写在 §7；首屏改 `COMPLETE — 待 Ocean 验收`，移进 `archive/product-taskbooks/`；HANDOFF §1、§2、§5.1 那一行改成教程已做完，唯一下一步按 §5.1 的顺序是「重构问卷」（开工先和 Ocean 确认用哪几份材料）。
- 拍的过程中发现的产品问题按方针 §7.2 记 `DISCOVERED-…`。

## 4. 开工先问 Ocean 的（一次问完）

11-11 一次问完，答复（HANDOFF 第 326 – 329 条）：

1. **讲多少**：选「全 13 章，一页带目录」（推荐）。
2. **中文页的截图**：选「中文界面 + 中文示例内容」（推荐）⇒ 两套截图、两份演示数据（同一个求职故事改写成中文）、AI 中英各真跑一遍。
3. **AI 真跑**：四项都允许 —— Claude 桌面版和 Codex 临时接演示版（先备份设置、拍完改回、核对；那段时间 Ocean 别在里面用 Spool）；Claude Code 只在终端那一次会话接演示版（不改设置）；本机 CLI 替演示库跑跟进 / 压缩 / 过期检测 / 周回顾（每种语言约 10 次以内，超了停下来问）；API key 那条路真跑一次（Ocean 当场在对话里给 key，只进演示版、拍完删，总花费上限 1 美元，超了停）。
4. **Windows**：选「在虚拟机里补拍几张」（不是推荐的文字说明）⇒ Windows 特有的 5 – 8 张（SmartScreen、双击 Ctrl 的捕捉卡、托盘图标等），**11-20 Parallels 到期前拍完**；每章末尾仍有一小段「Windows 上」文字。

## 5. 什么时候停下来问

- 每一段要占屏幕之前。
- 要改 AI 客户端的设置、要用 API key 之前（§4 第 3 题之外的都不做）。
- 拍的时候发现产品行为和讲稿差得多，教程得删一节或换讲法 —— 先问。
- 推送之前。

## 6. 给 Ocean 的验收单（上线后给，大白话）

1. 打开 spoolapp.org，点导航上的「Guide」；再点右上角「中文」，应该到中文教程。
2. 随便挑两章，对着你自己的 Spool 照着做一遍：教程写的按钮你都找得到、截图和你看到的一样。
3. 用手机打开中文教程，从上滑到下：字能读、图不出界、目录能点。
4. 有不对的直接说哪一章、哪一步。

## 7. 回执（执行窗填写）

### 7.1 进度（2026-11-11 晚，第一窗到这里结束）

- **P19-0 完成**：§4 已答（第 326 – 329 条）。
- **P19-2 演示版已编好、已就位**：`~/Movies/Spool-video/build/demo074-r1/` 换成 tag `v0.8.1` 源码（`git archive` + `rsync --delete`，保留 `node_modules` / `target`；`npm ci` 补了 katex）+ 三处演示改动（`tauri.conf.json` identifier、`mcp.rs` `APP_IDENTIFIER`、`api_engine.rs` `KEYCHAIN_SERVICE` 都是 `com.oceanjin.spool.demo074`；v0.8.1 源码里没有别处写死正式 identifier，测试除外），productName「Spool」，**Developer ID 签名**（授权不会每次重编就掉；没公证）。装在 `~/Desktop/Spool/Spool-Demo-v0.7.4/Spool-video.app`（swap-snapshot.sh 认死这个路径），旧的 0.7.4 演示版改名 `Spool-video-0.7.4-before-p19.app` 留着。**还没启动过**：演示数据目录 `~/Library/Application Support/com.oceanjin.spool.demo074` 仍是视频那份（库 v37，第一次打开会迁到 v39）；新签名 ⇒ 输入监控 / 辅助功能 / 自动化要 Ocean 重新给一次。
- 查过的事实：视频快照 `A`（有 Job hunt、没有 Job search）/ `B`（Job search 2 块 + 连好 `~/spool-video/Job search`）/ `C`（12 块）/ `C10`、`C11`（13 块，第 13 块是 Claude 真写回的决定）都在、都是 v37；演示文件夹和演示仓库 `~/spool-demo-v074/portfolio-site` 在；`/etc/hosts` 里视频那几个 `.example` 网址还在（`sources/serve.py` 起 8080）；视频的脚本工具在 `~/Movies/Spool-video/scripts/`（`spoolinput.py` HID 层鼠标键盘 / 按文字找控件 / 双击 ⌥ / 中文输入法打字，`shots/apps.py` Safari 选字复制、等捕捉卡，`p0_common.py` 演示版 pid / 查库）。连着的文件夹靠系统书签认（`folders.identity`），换路径造不出来 ⇒ **中文那套的文件夹要在演示版里当场连**，之后关掉 app 再用 SQL 写入中文块、存快照。
- 讲稿里要按 v0.8.1 改的已经查到两处：「In sync now / 已经对过了」按钮没了（P16-4）；「+ Workspace」不是这个说法了。界面字符串都在 `src/lib/i18n/index.ts`（中文原文 → 英文）。
- 工作计划（章节截图清单、快照方案、拍摄铁律、中文数据怎么做）在 `~/Desktop/Spool/P19-guide-20261111/PLAN.md`；英文数据导出在本窗 scratchpad（会没，重导很快：`snapshots/C11/spool.db` 里读 workspaces / threads / blocks / follow_up_items / attachments / block_images）。
- **还没做**：中文示例数据（映射、四张块内图片的中文版、`~/spool-video-zh/` 文件夹和简历 / 求职信、中文演示仓库、中文网页）；拍摄脚本；全部截图（每段前问 Ocean）；Windows 虚拟机那几张（**11-20 前**）；P19-1 正文；P19-4 页面；推送上线。

### 7.2 进度（2026-11-11 23:04 – 11-12 01:55，第二窗）

- **P19-1 – P19-5 做完**：`site/guide.html`、`site/zh/guide.html`，13 章一页带目录，**50 张图 × 中英两套，一张不缺**（`build_guide.py --strict` 过）。图片只用无损 WebP（比 PNG 小约 4 倍），按一半像素显示、点开看原图，共约 6.3 MB，放 `site/assets/guide/{en,zh}/`。导航和页脚加「Guide / 教程」，README 加一行链接。按钮名按 `src/lib/i18n/index.ts` 逐条核过；第 9 章的 SPOOL.md 用原文摘录（中英各取自己那份仓库，脚本核过逐字一致），不截图。1280 / 390 宽整页渲染看过、站内链接和锚点全在、`npx vitest run scripts/build-site-zh.test.mjs` 14 过。
- **提交**：`c84ef53`（页面 + 图 + 导航 + README）、`2b6e9da`（Windows AI 引擎那张重拍成正常的「还没有 key」样子，第 7 章补 Windows 上 key 存在数据文件夹的 `api-key` 文件里）。**都没推。**
- **拍摄**（Ocean 23:11 – 01:35 不在；Windows 那段 Ocean 01:35 同意这段时间不用虚拟机）：
  - Mac：演示版 v0.8.1（`com.oceanjin.spool.demo074`），中英两套快照；捕捉卡跑到主屏的老问题用「把自带屏临时挪到左边」绕开，拍完挪回；输入法拍摄时切 ABC、拍完切回。
  - AI 真跑：Claude 桌面版和 Codex（ChatGPT 的 Work）临时把 `spool` 指到演示版 —— 先备份，拍完改回；Claude 桌面版设置逐项一致（91 项，只是它自己重写时换了键的顺序），Codex 多的两行是 ChatGPT 自己升级写的版本号。终端里的 Claude Code 只用 `--strict-mcp-config --mcp-config <只接演示版>`。本机 CLI 中英各 7 次 + 终端 2 次（上限 10）。
  - API：DeepSeek（Ocean 当场给的 key），中英各真跑一次过期检测，合计约 ¥0.019；key 用完从演示版钥匙串删掉，扫了 964 个文件零命中，剪贴板清空。⚠️ key 还在那次对话记录里，建议 Ocean 到 DeepSeek 后台作废。
  - 连仓库：中英各连一次演示仓库，只勾仓库里的 CLAUDE.md / AGENTS.md，**全局那一项没勾**（前后核了 `~/.claude/CLAUDE.md`、`~/.codex/AGENTS.md` 的哈希没变）；英文用的是拍宣传片那份的克隆 `~/spool-demo-en/portfolio-site`，原仓库没动。
  - Windows（「Windows 11」虚拟机，v0.8.1）：SmartScreen、首启、关窗进托盘的提示、记事本里复制 + 双击 Ctrl 的捕捉卡、AI 引擎页；中英各 5 张（SmartScreen 共用一张英文系统的）。虚拟机自己的库**改名放一边、换演示数据、拍完换回**，17 个文件逐个哈希和拍之前一致；Spool 已普通启动（调试口关了）；放进去的安装包副本和两份示例文字已删，开的两个记事本标签已关，Ocean 自己的标签没动。
- **工作文件**：`~/Desktop/Spool/P19-guide-20261111/`（`PLAN.md` 进度和发现、`scripts/` 拍摄 / 裁图 / 出页脚本、`shots/` 原图、`snapshots/` 快照、`text/guide-{en,zh}.md` 正文）。正文改了要 `python3 scripts/build_guide.py --strict` 重出页；图要换先改 `scripts/prep_images.py` 再跑。
- **拍摄时看到的产品问题**：记成 HANDOFF `DISCOVERED-20261112-1` – `19`（附录 I）。Ocean 11-12：发版前全部修，教程提交后直接做（HANDOFF 第 334 条）。
- **还没做**：P19-6 推送上线（等 Ocean 点头；推了 `site/` 会触发官网部署，部署后带 `?v=` 核两页和图）；P19-7 收尾（上线后把首屏改成 `COMPLETE — 待 Ocean 验收`、移进 `archive/product-taskbooks/`）。
