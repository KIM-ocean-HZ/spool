# Spool 功能流程宣传渲染 · 三个版本

日期：2026-10-17。用户选中上一轮第三版，并要求以当前真实使用流程为 motif 制作三张偏功能科技向宣传图。全部延续英文文案、暖纸、琥珀线轴，加入精密的半透明功能模块。使用内置 imagegen，每版独立生成并按功能事实局部修正。

## 最终图与设计理由

| 文件 | 标题 | 构图与用途 |
| --- | --- | --- |
| spool-functional-01-connected-journey.png | Every step, connected. | 七阶段全景，最适合向首次接触者解释使用流程。 |
| spool-functional-02-working-loop.png | Think with AI. Keep the thread. | 项目为中心，展示 MCP 读取/追加笔记、人工审阅更正，以及本机 CLI 的辅助作用；最突出功能科技感。 |
| spool-functional-03-days-to-done.png | A little further. Closer to done. | 逐渐上升的纸带呈现每日积累、每周反思和用户最终完成；最贴近用户已选中的上一轮第三版。 |

三张均为 1672 × 941 PNG。推荐第三张作为这轮主图，第一张作功能说明，第二张强调 AI 协作关系。原图字节与 SHA-256 见 `manifest.json`，完整提示词与最终修正指令见 `PROMPTS.md`。

## 核心用户流程

建立项目 → 从网页/文档捕捉或亲自写笔记 → 带着项目背景与现有 AI 讨论 → 追加有来源的 AI 笔记、提议更正并由用户决定 → 选择关注问题并检查进展 → 跨项目回顾这一周和未完成事项 → 人持续推进并标记项目完成。

这是一条允许反复往返的长期工作流程。图中的顺序用于叙事，不意味着每个项目每次都必须经过全部步骤，也不意味着 AI 会自动替用户完成。

## 当前功能核对依据

核对方式为只读当前代码与公开演示素材，没有运行 AI 引擎、模型测试或真实数据库。读取时 HEAD 为 `df2f1a0`，工作区有并行产品修改；以下说明以读到的当前实现为依据，不声称都已对外发布。

| 用户能力 | 当前实现与边界 | 源码位置 |
| --- | --- | --- |
| 建立并选中项目 | 用户可建立项目；捕捉目标单独指定。 | `src/stores/threadsStore.ts:160`、`:203` |
| 捕捉或主动写入 | 从外部复制内容后触发捕捉；用户可在项目输入自己的文字与图片，写入项目记录。 | `src-tauri/src/capture.rs:1361`；`src/components/ThreadView/Composer.tsx:54` |
| 让 AI 读项目 | 用户启用 MCP 后，现有 AI 客户端通过 get_pack / get_blocks 读取项目上下文；不是 Spool 内置聊天机器人。 | `src-tauri/src/mcp.rs:8051`、`:8100` |
| AI 追加笔记 | 允许写入时，add_block 可直接追加带 AI 来源的新块，不能直接编辑/删除用户原文。不能把所有写回都描述为逐条待审。 | `src-tauri/src/mcp.rs:8186`、`:5298` |
| 更正与取代 | 针对旧句的更正/整条取代关系进入待审，用户决定“更正一处 / 整条取代 / 不动”。 | `src-tauri/src/mcp.rs:5189`、`:5289`；`src/components/Review/ReviewPanel.tsx:423` |
| 批量结论提案 | propose_blocks 先形成提案，用户批准后成为项目笔记。 | `src-tauri/src/mcp.rs:6284`；`src/lib/db/proposals.ts:302` |
| 选择跟进问题 | 用户可自己写跟进项；外部 MCP AI 建议的项先待审。用户主动点击“让 AI 看看还缺什么”的起草路径会直接加进有效清单，随后可编辑/删除。 | `src-tauri/src/mcp.rs:7478`；`src/lib/db/followUpItems.ts:274`；`src/components/ThreadView/FollowUpPanel.tsx:103` |
| 检查 Follow Up | 当前入口是用户点击“联网搜索”，按已选关注项调用本机 CLI。新发现以带来源的提案送审，运行后去重；没有发现也允许零结果。没有 24 小时自动轮询跟进器。 | `src/components/RightRail/index.tsx:368`；`src-tauri/src/mcp.rs:10894`；`src/lib/engine/followUp.ts:177` |
| CLI 的读取与写回 | Spool 启动用户已安装/登录的 CLI 子进程，连接同一 spool --mcp 服务。它不是随 Spool 附带的通用内置模型；引擎动作范围限定。联网跟进用 Claude Code/Codex；当前本机 CLI 入口仅 macOS。 | `src-tauri/src/engine.rs:77`、`:566`、`:1388`、`:1411` |
| 周回顾读取什么 | CLI 读取跨项目 digest，必要时补读记录；回顾实际推进、未决事项、截止日期，最后建议优先处理的一件事。 | `src-tauri/src/mcp.rs:10577` |
| 周回顾两条路径 | 当前可通过 CLI 或用户配置的 API 运行；图中聚焦 CLI 路径，不表示 API 不存在。API 路径读取 digest 历史与本周新增记录，单次请求不调 MCP 工具。 | `src-tauri/src/mcp.rs:10115`；`src/lib/ai/weeklyReview.ts:24` |
| 周回顾输出 | 作为跨项目报告存于本机 engine_runs，按周展示；成功回顾是只读内容，没有批准/存成块/自动执行计划按钮。 | `src/lib/ai/weeklyReview.ts:31`；`src/components/ReviewBoard/index.tsx:493`、`:554`；`src/lib/engine/activity.ts:100` |
| 自动周回顾 | 默认关闭，可启用；应用运行时检查，距上次成功满 7 天才运行。不能把周回顾定时行为套到 Follow Up 上。 | `src/hooks/useAutoMaintain.ts:68`、`:106` |
| 完成项目 | 由用户手动标记 done，可写一句结论，也可留空；不是 AI 自动结项。 | `src/components/ThreadView/CompleteThreadPanel.tsx:31` |

## 图面检验与修正

- 已检查英文标题、副文案、七阶段名称、Spool 与网址。
- MCP 的 Read context 方向为项目→AI；Append notes 为 AI→项目。
- 跟进新发现标为 Pending review，更正旁边保留 You decide。
- Weekly Review 使用 This week / Next，未放保存或执行按钮；以多个项目入口表示其跨项目范围。
- 最后阶段使用 Mark complete，并保留用户动作标记。
- 最终第二版移除了生成出的 OpenAI 标志。
- 最终第三版移除了生成出的虚构跟进操作菜单，改为 Watch list + Check updates。

## 事实边界

三张是功能叙事的 AI 概念渲染，半透明面板和实体装置是视觉表达，不是当前 App 的原始界面或新增硬件。原始产品界面依据可查看 `site/assets/shots/project-window.png`、`story-project.png`、`story-ai-writeback.png`；这些来自公开隔离演示库，属于过去构建，不标作最新发布界面。

当前代码存在一处旧文案残留：`mcp.rs:10554–10564` 的后台回顾提示仍说“Store as a block”，但当前 `ReviewBoard/index.tsx:554–603` 实际没有这个按钮。本次图按当前 UI 行为设计，没有把残留文字画成现有功能，也没有改动产品实现。

本次仅交付宣传素材及依据记录；未发布、未改现有官网、未写回 Spool。原有产品/研究执行顺序由现行 HANDOFF 管理。

