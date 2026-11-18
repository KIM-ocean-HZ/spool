# 竞品研究、用户反馈与视频表述依据

> 状态：**COMPLETE · 2026-10-29 检索与源码核对版本；不是竞品完整评测。**
> **方案署名：ChatGPT｜版本：2026-10-29 v1.0**
> 用途：为两支视频选冲突、核对能力和保留来源。用户反馈按个案使用，发布前再看原链接状态。

## 1. 结论先行

三个比较方向都值得用，但最强的表述是：**AI 工具已经越来越能做事；Spool 让用户选择留下的资料和思考，成为能在这些工具之间继续使用的项目上下文。**

竞争优势应该由一条完整操作链证明：捕捉成本低 → 用户判断有独立位置 → AI 能读取和写回 → 换 AI 仍能继续 → 用户能检查变化 → 项目走到成果。不要把整个故事押在竞品某个今天存在、明天可能修复的 bug 上。

这也是本方案选择一个作品集项目贯穿的原因：比“别的软件缺少 X 功能”更长久的价值，是观众能看见自己的某个决定跨过时间和工具，最后仍然影响成品。

## 2. 当下 AI 项目 / 文件 / 记忆：需要更新的比较

### 2.1 Codex

官方在 2026-04-16 的 [Codex for (almost) everything](https://openai.com/index/codex-for-almost-everything/) 已介绍 memory 预览与利用项目、插件、记忆接续工作。官方的 [App Server 文档](https://learn.chatgpt.com/docs/app-server) 也有线程持久化、恢复和读取相关能力。

因此，用户最初举的“同一项目窗口不能主动串联”可以作为真实使用体验和研究问题，**不能转述成 Codex 在所有配置下没有跨线程能力或记忆**。地区、账户、工具暴露和功能更新会影响体验，影片无需为某个版本写死结论。

适合影片的冲突：用户希望重要结论有一个自己看得见、能交给不同 AI 的项目位置，而不只是依赖某个客户端当时是否能找到某段聊天。

### 2.2 Claude / Claude Cowork / Claude Code

- [Claude 的聊天搜索和记忆](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context)：已支持查历史和跨对话记忆，也说明项目、云端与本地 Cowork 的范围差异。
- [Cowork 项目说明](https://support.claude.com/en/articles/14116274-organize-your-tasks-with-projects-in-claude-cowork)：已有文件夹、指令、项目上下文和记忆；文档反映正在演进的产品体验。
- [Claude Code power user tips](https://support.claude.com/en/articles/14554000-claude-code-power-user-tips)：有按仓库的 auto-memory，也支持用户维护指令和笔记。

因此不要说“Claude 只有上传文件夹，无法读当前文件”或“Claude 没有跨对话记忆”。区分上传快照、文件夹访问、项目知识、Agent 记忆与用户主动记录，才是有用的比较。

适合影片的冲突：保留原始来源、某一刻的用户判断、哪些信息后来变了，以及这些内容怎样交到另一个常用 AI。

## 3. 可以追溯的真实用户反馈

以下是第一手用户报告，不等于厂商已确认，也不是所有用户的普遍体验。检索日期均为 2026-10-29；来源中的状态可能在发行前改变。

| 编号 | 来源与时间 | 反馈内容（中文转述） | 可以支持什么 | 不能据此说什么 |
|---|---|---|---|---|
| F1 | [openai/codex #49770](https://github.com/openai/codex/issues/49770)，2026-10-01 开帖，检索时 Open | 新建 Desktop 线程没有拿到预期的跨线程读取 / 列表工具；用户此前观察另一线程可用，本地 transcript 回退可以找到旧信息 | “知道有历史”与“这个会话能顺利取到历史”可能有落差；用户希望稳定接续 | Codex 永远不能跨线程；同项目完全不共享信息；该报告是受控实验 |
| F2 | [anthropics/claude-code #93153](https://github.com/anthropics/claude-code/issues/93153)，2026-09-09，报告实际指 Claude Desktop 项目 | 旧项目没有绑定本地文件夹的入口，只能手动上传；已有积累让迁移成本更明显 | 某些项目 / 版本中，手动刷新上下文和迁移会打断连续性 | 所有 Claude 项目都不能链接文件夹；厂商已确认根因。检索结果显示该帖标记为不属于 Claude Code（invalid），更需清楚标注其产品范围 |
| F3 | [anthropics/claude-code #86647](https://github.com/anthropics/claude-code/issues/86647)，检索时的用户报告 | 项目 UI 显示文件夹连接，实际 Cowork 会话报告没有连接文件夹 | 用户需要验证“配置显示成功”是否等于“会话实际拿到资料” | 所有文件夹连接都不可靠；Spool 自动不会遇到连接问题 |
| F4 | [openai/codex #24222](https://github.com/openai/codex/issues/24222)，检索时的功能请求 | 新对话该从哪个项目开始、之后怎样移动以及当前上下文是否明显，给工作带来摩擦 | “项目在哪里、当前用什么上下文”值得做得清晰 | Codex 没有项目管理；所提需求没有任何其他解决途径 |

**主片只优先选 F1 + F2**，其余留作背景。用两张转述卡约 6 秒，完整链接放简介。避免把 UI bug 拍成 Spool 在功能上必然胜出；Spool 也要用一次真实读取和写回来证明连接。

若需要逐字引用，应重新核对原文、截取很短的一句并保存出处；本方案不要求下载整页、头像或私人聊天。不把不同用户的话拼成一条引文，不造星级评分和点赞数。

## 4. 笔记软件：把比较对象写得公平也有力

现代笔记产品已有轻捕捉和 AI 功能：

- [Obsidian Web Clipper 官方帮助](https://obsidian.md/help/web-clipper/capture) 有快捷键、选区和高亮捕捉。因此不能把“快速捕捉”说成 Spool 独有。
- [Notion Enterprise Search](https://www.notion.com/help/enterprise-search) 有工作区与连接应用搜索、来源引用。
- [Notion AI Connectors](https://www.notion.com/help/notion-ai-connectors) 还说明外部 AI 通过 Notion MCP 搜索连接来源的能力。因此也不能说“所有笔记都无法用于多 AI”。

更好的三组对比：

| 观众可能遇到的习惯 | Spool 片中要展示的替代 | 对应镜头 |
|---|---|---|
| 先想怎么分类、排版，抓资料时打断阅读 | 当前捕捉目标，文字 / 图片原处存，按需要加一句理解 | P06–P08；T04–T05 |
| 信息留下了，每次开始任务还要重新拼给 AI | 以项目组织来源、判断、文件和新结论；Pack 或 MCP 交接 | P09–P12；T06–T09 |
| 旧计划和新计划挤在一起，任务结束后笔记失去用途 | 保留变化依据、待解决问题和结果；完成归档仍可取回 | P15–P17；T13–T17 |

“漂亮笔记并不自动等于理解”可以做情绪切口；“大部分人做笔记都不理解”没有本轮证据，不当统计事实讲。“主动提示一句为什么”表现为帮助表达理解的入口，不声称软件已测量或证明学习效果。

本片可以强调记录是为了做成事，同时承认理解课程仍需要练习和复习。观众更容易接受“让记录参与工作”，而不是“你原来的笔记方法都错了”。

## 5. 超级 Agent：选择 OpenClaw，比较用户体验

### 5.1 为什么本轮仍选 OpenClaw

用户举 OpenClaw 是合适的。检索时 [官方 GitHub 仓库](https://github.com/openclaw/openclaw) 显示约 39 万 stars，足以作为当前高热度通用个人 Agent 的代表。stars 不是活跃用户、产品质量或全市场第一的证据；主片无需念排名或数字。

本轮不需要为了换名字而改用另一个热门词。发行时再看热度与目标受众；镜头主旨不依赖品牌名称。

### 5.2 不能忽略它已经有的能力

[OpenClaw 官方 Memory 文档](https://docs.openclaw.ai/concepts/memory) 说明以 Markdown 保存长期记忆与每日资料、来源相关机制、用户审核，以及从 Codex / Claude Code / Hermes 导入部分记忆。其 [Agent workspace 文档](https://docs.openclaw.ai/agent-workspace) 也说明工作区文件和上下文预算。

所以“OpenClaw 没有记忆 / 没有来源 / 不支持用户决定 / 完全不能复用已有资料”都不是合理比较；“Spool 是唯一跨工具记忆”也站不住。

### 5.3 更好的镜头语言

不要问一个无法替所有人回答的指控：“它到底丢了你多少想法？”

可以问：“当 AI 做得越来越多，我想保留哪些判断？我能在哪里看到它们？”然后立刻展示：用户写下保留音乐案例 → AI 的新结论独立署来源 → 用户选择是否改变旧计划。

Spool 是个人工作资料与判断的积累位置，可以和能执行任务的 Agent 配合。它不是必须再造一个超能力 Agent，也不需要劝观众放弃原有助手。

成本也用实际路线证明：Pack 和本地 MCP 接入不要求 Spool API key，CLI 可用已登录账户；对应账户仍有配额、费用与服务限制。不要把 OpenClaw 或别的 Agent 一概说成“只能 API、一定贵”，其认证方案也在变化。

## 6. Spool 表述与真实实现的映射

以下链接相对本目录，优先采用当前代码和 v0.7.4 release 说明，不把早期总览中仍然过时的数字当最新事实。

| 片中表述 | 可核对的仓库依据 | 录制 / 表述条件 |
|---|---|---|
| 不切屏捕捉文字和截图，时间、来源、批注 | [README 捕捉与权限](../../../README.md)、[CaptureOverlay](../../../src/overlay/CaptureOverlay.tsx)、[capture.rs](../../../src-tauri/src/capture.rs) | 权限已完成、剪贴板有新内容、目标正确。批注可选，不是“无需任何用户判断” |
| Pack 可交给常用聊天软件 | [README AI via MCP](../../../README.md)、[Pack 模板](../../../src/lib/pack/templates.ts) | 文本手动交接；不保证远程聊天直接访问本机附件或自动写回 |
| 六个一键 MCP 客户端 | [clients.ts](../../../src/lib/mcp/clients.ts) | Claude Desktop / Code、Codex、Cursor、Visual Studio Code、Windsurf；实际可用性还取决于客户端 |
| 普通追加结论可出现，取代 / 批量等会等待用户 | [mcp.rs](../../../src-tauri/src/mcp.rs)、[ReviewPanel](../../../src/components/Review/ReviewPanel.tsx) | 不把“所有写入都审批”说成事实；AI 来源不冒充用户 |
| CLI 和 API 都可做维护动作 | [v0.7.3 release](../../RELEASE_NOTES_v0.7.3.md)、[routes](../../../src/lib/engine/roads.ts)、[EngineConfig](../../../src/components/Settings/EngineConfig.tsx) | CLI / API 必须已配置；联网跟进有额外能力限制；存在账户成本 |
| 自动每周跟进、每月工作区查过期 | [README schedules](../../../README.md)、[followUp.ts](../../../src/lib/engine/followUp.ts)、[compressStore](../../../src/stores/compressStore.ts) | 默认关闭、用户启用、应用运行时触发；自动扫描不等于自动接受修改 |
| 压缩可以夜间排队，检查后保存 | [NightlyRunner](../../../src/components/Compress/NightlyRunner.tsx)、[compressStore](../../../src/stores/compressStore.ts) | 到时运行 / 下次启动补跑；不假装关机后由云端完成；节省比例用当次实测 |
| 项目与仓库靠 SPOOL.md 保持对应 | [v0.7.4 release](../../RELEASE_NOTES_v0.7.4.md)、[folder_link.rs](../../../src-tauri/src/folder_link.rs) | 工作区连接；最多选三个状态文件；仓库当前状态权威；客户端还需发现并遵循指令 |
| 计划变化会提示并暂停该项目自动跟进 | [v0.7.4 release](../../RELEASE_NOTES_v0.7.4.md)、[folderStore](../../../src/stores/folderStore.ts) | 状态文件与上次同步比较；不是全目录文件全文实时同步 |
| 周回顾后接受建议 | [v0.7.4 卡片](../../../src/components/ReviewBoard/ReviewCards.tsx)、[P10 动作](../../../src/lib/ai/weeklyActions.ts) | v0.7.4 手动采纳；包含 P10 的后续构建可用动作按钮。教程已提供两版 |
| 完成项目、之后仍可找回 | [threads](../../../src/lib/db/threads.ts)、[README](../../../README.md) | 用户确认完成；保留结果与资料，未来需要时重新打开 |

“零 API 成本”要拆成“使用 Pack / MCP 无需 Spool API key”；这不是“AI 本身免费”。“不用切屏”特指捕捉流程，不是整个项目从头到尾永远不切应用。

## 7. 关于 AI memory 的有力表达

可以说：

- Your project deserves a memory of its own.
- Keep your thinking beyond the chat.
- Built around how AI reads project context.
- Your sources, your decisions, ready for the next step.

支撑这些话的真实画面是来源、时间、用户 / AI 区分、引用、更正、过期、原文回查和跨 AI 接续。只说“研究了 memory”不如把这些设计演示出来。

不把资料保存等同于“模型每次必然检索全部内容”；Pack 有预算和上下文范围，AI 也可能漏读或误解。用户可以主动保留、核对、补读，过去被压缩或取代的内容也有相应查阅方式。“永不遗忘、永远准确、最可靠、任何信息”可作为用户向往的感受，但不写成已经验证的性能保证。

## 8. 发布时的简短来源说明模板

视频简介可写：

> Product footage uses a Spool demo library. Concept animation illustrates the workflow. AI waiting time is shortened where indicated. Pack and MCP do not require a Spool API key; AI services use your existing account or optional provider key. Examples of context friction are individual public user reports, not claims about every account or current product version.

随后列 F1 / F2 的链接和日期，以及本片实际构建号。不需要把整张研究表塞进片尾。

如果片尾保留 macOS + Windows，按用户确认的两平台目标执行；发行阶段与实际安装包同步。不为这个设计任务重开平台发布验证。
