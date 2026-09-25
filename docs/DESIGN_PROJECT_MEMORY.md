# 设计稿 —— 项目工作记忆与三线发展框架

> 状态：**研究前设计稿，未进入施工**
>
> 日期：2026-08-26
>
> 本稿回答“Spool 是否应为每个项目提供一份可由 AI 协助维护的专属记忆”，并把后续工作拆成产品、营销商业、AI 记忆研究三条路线。
>
> **本稿不改变当前施工顺序。** 现行入口仍是 `HANDOFF-NEXT-2026-08-26.md`，下一件仍是渠道 R1；任何实现都必须经实验和正式工作计划另行排期。

---

## 0. 结论先行

### 0.1 功能可行，但不应做成“一段 AI 可以随时改的固定 memory”

建议把它定义为每个项目一份用户拥有的 **Project Working Guide（项目工作指南）**：

- 它保存的不是项目原始材料，也不是当前进度，而是“未来 AI 继续处理这个项目时，仍然需要知道的工作约定、已验证经验、明确否决和有期限的假设”。
- AI 可以在正常回答或写回结束时提出“新增 / 替换 / 退役”某一条；**未经用户批准，不能进入有效指南，也不能进入 Pack、Search 或 Digest**。
- 每条都带类型、适用范围、来源、状态和时间；旧结论被替换后保留审计链，不静默覆写。
- 用户可以完全不借助 AI，手工新增、编辑和退役。AI 是增强，不是产品成立的前提。
- 指南在 Pack 中以确定性顺序出现；不根据调用者的当前任务做语义检索，不引入向量库或 RAG。

这与 Pack 前的通用 Prompt 是两层不同内容：

| 层 | 作用域 | 典型内容 | 谁维护 |
|---|---|---|---|
| Spool 通用指令 | 所有项目、所有客户端 | 如何读来源、如何更正、何时写回 | 产品版本维护 |
| 项目工作指南 | 单个项目 | 这个项目特有的约定、坑、否决、适用规则 | 用户拥有；AI 可提议 |
| Pack / 项目记录 | 单个项目的事实历史 | 原始块、引文、更正、文件、状态 | 用户和经批准的 AI 写回 |
| 当前对话指令 | 这一次任务 | “本窗口只读”“先做渠道” | 当前用户请求优先 |

### 0.2 它能保住“经验的后果”，不能读取或复制隐藏提示词

Spool 的 MCP 服务只能收到 MCP 方法和参数；代码中的 `handle_request(method, params)` 看不到 AI 客户端的隐藏 system/developer prompt，也看不到完整对话。`propose_blocks` 的整窗写回还明确要求调用者提供 `source_text`，且只使用用户轮次。事实依据见 `src-tauri/src/mcp.rs` 的 `handle_request`、`OPENERS` 和 `propose_blocks` 路径。

所以目标不能写成“完整保存系统/开发者提示词”。可行且正确的目标是：当 AI 在一次真实工作中确认某个项目专属经验后，保存它对未来工作的**持久影响**。例如：

> 已验证经验：为 Spool 新增 MCP 工具时，必须同时补 `annotations`，并把调用入口写入 `OPENERS` 或 `INSTRUCTION_BODY`。
>
> 适用范围：Spool MCP 工具变更。
>
> 来源：本项目代码与既有工作计划。
>
> 状态：active。

不应保存“某个隐藏开发者提示词原文”；一是 Spool 根本拿不到，二是不同客户端的隐藏指令可能属于厂商实现，也可能随版本改变。

### 0.3 最便宜、最有信息量的下一步不是改 schema，而是先做无代码实验

在同一批项目任务上比较：

1. 当前 Pack；
2. 当前 Pack + 未整理的现有客户端项目 memory；
3. 当前 Pack + 人工整理的项目工作指南；
4. 当前 Pack + 带来源、范围、状态、复核时间的项目工作指南。

先用完全相同的文本拼接模拟新功能，测任务成功、有害历史、纠正轮次、工具错误、过期规则使用、token、成本和延迟。只有实验过门，才设计正式表、界面和 MCP 工具。完整协议见 `AI_MEMORY_EXPERIMENT_PROTOCOL-2026-08-26.md`。

### 0.4 学术和商业结论必须克制

- “跨客户端 memory”“本地 event-sourced memory”“AI 提议、用户批准”都已有直接先例，单独拿任何一项都不足以构成首创。
- 更可能形成论文和产品差异的组合是：**跨生态运输 + 用户治理 + 来源/时效/适用范围 + 正向效用与有害历史同时评估 + 长期项目工作而非只测个人事实召回**。
- 在实验完成前，只能说“提出一种候选方案”，不能说“市场最优”。最终也不应靠一个任意加权总分宣布绝对第一，而应按隐私优先、准确率优先、成本优先、跨客户端优先等使用画像给出 Pareto 前沿。

---

## 1. 这项设计建立在哪些已查证事实上

### 1.1 Spool 当前是什么

Spool 的既有定义是长期项目的上下文枢纽：捕捉碎片，归入 `Workspace → Project`，再把项目确定性地组装成 Pack，让人或新开的 AI 对话快速重入。产品北极星是把“十分钟考古”降到“一次粘贴”。见 `SPOOL_OVERVIEW.md` §0 和 `PLAN_EN.md` §2。

与本设计直接相关的现有约束：

- 主进程本地、无账号、无遥测；Pack 和 Search 不调用 AI。
- MCP 是 opt-in；内容一旦交给客户端，之后是否发往厂商由客户端决定。准确边界见 `PRIVACY.md`。
- 项目是日志，不是聊天；用户原文不被 AI 覆写。
- MCP 的角色已定为“回答者，不是维护者”；维护只能是回答的副产品。见 `DESIGN_MCP_WRITE_ROLE.md` §0。
- 任何会成为长期控制面、像 standing instruction 一样持续指导下一轮 AI 的内容都需要一个人类步骤。普通 AI block 不是这种控制面：在用户已开启 MCP 与 AI 写入权限后，`add_block` 可以直接追加，但会标明 AI 来源且不能覆写用户原文。项目工作指南属于前一种，所以不能沿用普通 block 的直接写入语义。见 `SPOOL_OVERVIEW.md` §10.2、`src-tauri/src/mcp.rs` 的 `add_block` 路径。
- 待审提案在批准前不得进入 Pack、Digest、Search 或块流。见 `DESIGN_MCP_WRITE_ROLE.md` §4.2。
- `get_pack` 不增加 `current_task`，Spool 不按调用者当前任务做语义过滤。见 `archive/REVIEW_MEMTRAPBENCH-2026-08-21.md` §7。
- 当前规模下，`RESEARCH_RAG_CONTEXT-2026-08-24.md` 已判定向量检索不是瓶颈；AI 写回建立的结构比读时再猜结构更值得使用。

### 1.2 当前 schema 没有等价位置

现有字段各有明确角色，不能借名复用：

| 现有对象 | 当前职责 | 为什么不能冒充项目工作指南 |
|---|---|---|
| `threads.summary` | 项目状态卡 | 状态会更新；不是持久操作约定 |
| block | 事实、材料、AI 回填结论 | 时间流里的记录；不代表每次都应执行 |
| `gist` | block 的一行检索提示 | 只服务单块搜索；当前不进 Pack |
| follow-up item | 开放问题或持续关注 | 要被回答/关闭，生命周期不同 |
| pinned block | 用户强调的一段项目记录 | 同时获得位置、全文、符号权重；适用性并未因此提高 |
| 全局 MCP instructions / prompts | 所有项目的共同行为 | 放项目名会陈旧，也会泄露无关项目 |

`src/lib/db/schema.sql` 当前已把 follow-up 从一个大字段迁成逐条有状态的行，也已有 AI proposal queue。这个先例支持“逐条、可审计、可退役”，不支持再加一个不可解释的大文本 blob。

### 1.3 当前系统确实会丢失项目专属操作经验

现有 MCP 初始化说明和 7 个 prompts 教的是所有项目共用的 Spool 使用方式。它们故意不写真实项目标题，避免陈旧与隐私问题；因此也不可能承载“这个项目的某个工具在这个版本上有何坑”。

另一方面，Claude Code、Cursor、Gemini CLI 等客户端已经各自提供项目规则或自动 memory。这证明需求真实存在，也证明如果 Spool 不提供跨生态来源，同一个项目会在每个客户端长出一份互不一致的记忆孤岛。

2026-08-26 的本机只读 dogfood 盘点还发现：同一 Spool 仓库的 Claude 项目 memory 有 36 个文件、共 2,088 行，其中包含真实工具/调试经验；最新 handoff 的渠道红线也明确写着其详细内容“都在记忆里”。这个数字只说明“项目专属经验已在真实使用中积累”，**不是外部用户或产品效果指标，也不能用于宣传**。

---

## 2. “项目工作指南”究竟保存什么

### 2.1 四类允许进入的内容

| 类型 | 定义 | 示例 | 默认时效 |
|---|---|---|---|
| `agreement` | 用户明确决定、未来工作仍需遵守 | “不添加 LICENSE 文件” | 长期，直到用户替换 |
| `verified_lesson` | 在这个项目上已由代码、文档或实测验证的操作经验 | “新增 MCP 工具需同步 annotations 与 opener” | 随适用版本复核 |
| `rejected_path` | 已尝试或已拍板否掉、重走会浪费成本的路径 | “不把 follow-up item 当事件存储” | 条件改变时复核 |
| `hypothesis` | 可能帮助未来工作的预测或适用判断，但尚未证实 | “某类 Authority Band 可能放大陷阱” | 必须有 `recheck_after` |

### 2.2 不允许进入的内容

- 密钥、token、账号凭证、未脱敏个人数据。
- AI 客户端隐藏 system/developer prompt 的原文或模型声称的“内部规则”。
- 从当前代码或 Pack 便宜地就能推导出的目录树、依赖表和全文摘要。
- 一次性任务描述、临时草稿和当前对话的操作命令。
- 无期限的“下一步预测”或自动推断的完成度。
- 没有来源、没有适用范围、无法区分事实与猜测的模型总结。
- 为了让某个模型听话而堆叠的通用提示词；那属于客户端规则或 Spool 通用指令。

### 2.3 对“预测工作内容”的查证结论

`archive/REVIEW_MEMTRAPBENCH-2026-08-21.md` 没有提出“预测用户下一步工作”。它提出的是：

- 为历史增加 applicability / 适用性表达；
- 用 `scope_limited` 等方式降低跨任务误用；
- 先做正向题与陷阱题并存的 E1/E2 实验；
- 不给 `get_pack` 增加 `current_task`，也不做任务语义过滤。

仓库里最接近“未来工作提示”的旧构想是 handoff card：确认过的下一步和未解决问题，而不是模型预测。由于 `PLAN_EN.md` 已明确否掉会腐烂的手工 `next_step`，本设计只允许把预测作为 `hypothesis`，必须标注范围、证据、创建时间和复核时间；它绝不能获得与用户决定相同的权威。

如果用户想到的是学术上的 **prospective memory（前瞻记忆）**，它指“未来某个 cue/state 出现时执行此前延迟的意图”，不是预测未来结果；可参考 [PM-Bench](https://arxiv.org/abs/2607.12385)。它更接近 follow-up、事件和提醒路线，适合以后单独研究，不应混进第一轮 retrospective project-memory 实验。

---

## 3. 推荐的产品语义

### 3.1 所有权与权限

**有效指南属于用户。AI 只能提议。**

允许的 AI 操作：

- 提议新增一条；
- 提议以新条目替换旧条目；
- 提议把旧条目退役；
- 指出两条可能冲突，请用户选择。

不允许的 AI 操作：

- 静默直接编辑 active 条目；
- 在后台定期“整理整个指南”；
- 批准自己的提案；
- 删除历史证据；
- 把 proposed 条目提供给下一次 AI；
- 把 hypothesis 自动升级成 verified lesson。

这保持了 `DESIGN_MCP_WRITE_ROLE.md` 的既有定论：MCP 仍是回答者，记忆维护只是本次工作产生的新知识的副产品。

### 3.2 状态机

```text
AI 提议 ──▶ proposed ──用户批准──▶ active
   │                               │
   └──用户拒绝/到期──▶ 删除提案    ├──新条目替换──▶ superseded
                                   └──用户退役────▶ retired
```

- 只有 `active` 且未越过强制复核边界的条目进入有效指南和 Pack。派生的 `needs_review` 最多出现在独立 `needs_attention` 元数据中，明确不是现行指令；最终是完全隐藏还是带警告降权仍由 §9 的产品决策拍板。
- `superseded` / `retired` 仍可在 UI 中查看，并保留“被哪一条替代”。
- `hypothesis` 到达复核日后派生显示 `needs_review`，不能静默删除；是否继续有效由用户决定。这个标记由 `recheck_after <= now` 计算，不另存一个会漂移的状态。
- 冲突不是让模型自行合并，而是生成一个待处理提示。
- 沿用现有 proposal queue 规则：被拒绝或过期的**提案**删除，不另建拒绝日志；需要审计的是已经生效过的指南条目及其替换/退役链，不能让审批队列变成第二份历史库。

### 3.3 候选数据模型

不要使用 `threads.project_memory TEXT` 单字段，也不要伪装成 pinned block。候选结构应是逐条表和独立提案表：

```text
project_guide_items
  id
  thread_id
  kind                  agreement | verified_lesson | rejected_path | hypothesis
  content
  applicability         人可读适用条件
  scope_client          可空；仅某客户端时填写
  scope_version         可空；版本/日期边界
  status                active | superseded | retired
  source_url            可空
  created_by            user | mcp:<client>
  created_at
  reviewed_at
  recheck_after         hypothesis 必填，其他可选
  supersedes_id         可空

project_guide_proposals
  id
  thread_id
  operation             add | replace | retire
  target_item_id        replace/retire 时必填
  proposed_item_payload
  rationale
  source_client
  source_conversation   仅保存可见且获准的来源标识，不保存隐藏 prompt
  created_at
  expires_at

project_guide_item_evidence
  item_id
  block_id
```

批准时通过普通写入路径建立/更新指南条目并删除提案；拒绝或到期也删除提案。证据采用关联表而不是在单列中塞 ID 数组，便于外键、删除行为和多证据查询。

这只是实验通过后的候选，不是已拍板 schema。进入实现时还需：

- 同步 TS/Rust schema version（当前为 v28）；
- 迁移前按 `DB_BACKUP_AND_RECOVERY.md` 创建一致快照；
- 让旧构建拒绝打开新库；
- 同步 GUI 与 Rust Pack renderer、golden fixtures；
- 明确 GUI/clipboard Pack 与 MCP Pack 的权限差异，而不是盲目对齐。

### 3.4 Pack 中的位置和权威表达

候选顺序：

```text
Spool 通用 How to Read
→ Project Working Guide
→ 项目状态 / Follow up
→ 项目文件与历史记录
```

指南段顶部必须写清：

1. 当前用户在本次对话中的明确要求优先；
2. `agreement` 是用户决定，`verified_lesson` 是已验证经验，`rejected_path` 是避免重走，`hypothesis` 只是待验证假设；
3. 超出 `applicability`、客户端或版本范围时不得套用；
4. 过复核日的条目应提示用户，不应继续当成现行事实；
5. 指南不是安全策略，真正必须强制的动作仍应由 hook、权限或代码约束完成。

顺序固定、文本确定，不因调用问题而改变。指南需要一个用户可见的大小预算；预算阈值由实验确定。达到阈值时要求合并或退役，**不允许静默截断**。

### 3.5 MCP 面最小化

实验通过后，优先考虑两个工具，而不是给每个状态各造一个工具：

| 工具 | 作用 | 权限 |
|---|---|---|
| `get_project_guide` | 分开返回 `effective_items` 与明确非现行指令的 `needs_attention`；Pack 只用前者 | read-only |
| `propose_project_guide_change` | 提议 add / replace / retire | destructive=false，但明确“未生效” |

有效指南也可直接进入 `get_pack` 和 `get_project_overview`，避免要求客户端一定会主动发现新工具。真实项目已经证伪：`initialize.instructions`、prompts 和 resources 被服务端支持，不等于所有客户端会调用。因此跨生态实验必须记录实际工具流量，不能相信模型自述。

每个新 MCP 工具仍须遵守仓库硬规则：有正确 `annotations`，并进入 `OPENERS` 或 `INSTRUCTION_BODY`。

### 3.6 UI 原则

- 项目详情里一块安静的“工作指南”，不是新顶层，也不改变两层结构。
- active 条目少而可扫读；类型、范围、来源、复核状态一眼可见。
- 提案进入既有待审心智模型，不弹窗、不抢焦点。
- 默认批量浏览，但替换/退役必须清楚显示旧条目和新条目。
- 用户可以手工编辑自己的条目；AI 来源的历史版本仍保留审计。
- 捕捉路径保持一次动作，不要求用户在捕捉时分类“这是不是记忆”。

---

## 4. 直接先例与真正的竞争边界

以下均为截至 2026-08-26 查到的官方文档或论文事实；厂商自报成绩只作候选基线，不视为独立证据。

| 方案 | 已有能力 | 对 Spool 的含义 |
|---|---|---|
| [Claude Code memory](https://code.claude.com/docs/en/memory) | 用户写 `CLAUDE.md`；Claude 自动写 per-repo memory；纯 Markdown，可审计编辑；启动加载 `MEMORY.md` 前 200 行或 25KB | “项目专属、AI 可写、文件可审计”已经存在；但 machine-local、客户端专属，且官方明确只是 context，不保证执行 |
| [Codex `AGENTS.md`](https://github.com/openai/codex/blob/main/docs/agents_md.md) | 目录分层的项目指令文件 | 是跨工具文件规范的重要运输基线，不是完整记忆生命周期 |
| [Cursor Rules / Memories](https://docs.cursor.com/en/context/memories) | project rules、AGENTS、自动 memories；官方流程包含保存前用户批准 | 需实测其冻结版本、隐私模式、实际装载与跨项目边界 |
| [Devin Desktop / legacy Windsurf memories](https://docs.devin.ai/desktop/cascade/memories) | workspace-local 自动 memory；官方建议持久知识写 Rules/AGENTS；新默认 agent 已不保留 legacy memories | 证明原生 memory 会随产品架构变化，不能把某客户端私有机制当永久底座 |
| [Gemini CLI memory](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/memory.md) | repo `GEMINI.md`、私有项目 memory、全局 memory 分层 | 与“按项目保存架构决策和工具经验”直接重合 |
| [Gemini CLI `experimental.autoMemory`](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md) | 从历史会话提取 memory/skill patch，统一 diff 进入 `.inbox`，用户批准前不应用 | “AI 提议、用户审批后生效”已有官方直接先例，不能声称首创 |
| [ProjectMem](https://github.com/riponcm/projectmem) / [论文](https://arxiv.org/abs/2606.12329) | local-first、typed append-only events、MCP 跨 Claude/Cursor/Codex、stale detection、supersede、brief、与 plan 分离 | 与“本地 MCP 项目经验层”高度重合，必须是 coding 场景强制基线；其公开证据主要是作者两个月、10 项目、207 事件 dogfood，不是强外部验证 |
| [Basic Memory](https://github.com/basicmachines-co/basic-memory) | 人与 AI 双向读写、搜索项目 Markdown，经 MCP 接入 Claude、Codex、Cursor、ChatGPT 等客户端 | “项目专属 + AI 可修改 + Markdown/MCP 跨客户端”也已有直接先例；应作为开放文件式强基线 |
| [Supermemory MCP](https://supermemory.ai/docs/supermemory-mcp/mcp) | 远程 MCP、space 隔离、来源文档、memory versions、guided-save 审批、graph、多模态上传 | 是跨生态、项目空间、审核和来源能力的强制市场基线；代价是账号/云端路径不同于 Spool |
| [Mem0 MCP](https://docs.mem0.ai/platform/mem0-mcp) | 多客户端远程 MCP；add/search/update/delete 与事件查询 | 是通用 memory-as-a-service 基线；官方 hosted MCP 的记忆存云端账号，不是本地 Spool 路径 |
| [Graphiti / Zep](https://help.getzep.com/graphiti/getting-started/overview) | 双时间知识图、事实失效、来源 episode、混合检索 | 时间变化和失效处理的强相关工作；厂商 benchmark 数字须独立复跑后才能比较 |
| [Letta memory blocks](https://docs.letta.com/) | core blocks、archival memory、共享 archive | 表明 agent-owned memory 与共享 memory 已有成熟框架；其产品边界不同于通用项目日志 |

另有跨生态标准方向：[Stanford Portable Memory / Human Context Protocol](https://digitaleconomy.stanford.edu/project/portable-memory/)、[Portable AI Memory 规范](https://github.com/portable-ai-memory/portable-ai-memory/blob/master/spec.md)、[Agent-Memory Protocol](https://proceedings.mlr.press/v317/wu26a.html)。因此“可携带 memory”本身也不是空白领域。

### 4.1 Spool 仍可能形成的差异

不能再主张：

- 第一个跨客户端 memory；
- 第一个 local-first agent memory；
- 第一个 event-sourced 项目经验库；
- 第一个 AI 提议、用户批准的 memory；
- 第一个带 graph、版本或来源的 memory。

值得实证的差异组合是：

1. **通用长期项目，而不只 coding agent 或个人偏好。** Spool 已能收 AI、网页、邮件式碎片、文件和人工想法；项目指南与证据 ledger 相连。
2. **同一个用户拥有的来源跨客户端使用。** 不把 Claude/Cursor/Gemini 各自 memory 当真值源。
3. **治理信息是一等数据。** 不是只有文本和相似度，而是来源、权威、适用范围、复核日期、替换/退役链。
4. **同时优化帮助与不伤害。** 正向历史题必须受益，陷阱、过期和跨任务历史不得把答案拉偏。
5. **确定性 Pack 与本地隐私底座。** 在不依赖模型检索的前提下，同样内容可审计地交给不同生态；具体供应商出网仍透明披露。

这五项必须靠实验成立，不能只靠架构描述。

---

## 5. 可行性判断与主要风险

### 5.1 技术可行性：高

现有工程已经具备大部分原语：

- project/thread 作用域；
- 逐条状态表和 proposal queue；
- AI 来源标记、证据引用、逐句更正、supersede、recheck；
- GUI 与 Rust 两条 Pack renderer；
- MCP 读写开关、工具 annotations、客户端来源；
- 本地 schema migration、备份和实验假库脚本。

真正新增的是新的语义层、逐条表、审批 UI、Pack 段和两个 MCP 接口，不需要先引入网络服务、向量数据库或后台 agent。

### 5.2 产品可行性：中高，但必须证伪

它直接服务 Spool 的北极星：让下一次重入不只知道“发生了什么”，还知道“这个项目应该怎样处理”。但它也可能把正确的项目历史变成高权威、长期存在的错误指令。是否值得做取决于：

- 是否显著减少纠正轮次和重复工具错误；
- 是否在正向题上提升，而不只是教模型忽略历史；
- 是否会增加过期规则、跨任务套用和 prompt injection 风险；
- 用户是否愿意审，而不是形成审批疲劳；
- 相同内容能否在至少三种真实客户端上稳定生效；
- 相比 ProjectMem、Supermemory 和原生 memory 是否有明确优势画像。

### 5.3 风险与控制

| 风险 | 失败形态 | 设计控制 | 必测指标 |
|---|---|---|---|
| 记忆污染 | AI 猜测变成长期事实 | 类型 + 来源 + 用户批准 | write precision、unsupported memory rate |
| 过期 | 旧工具经验继续指导新版本 | scope/version/recheck + supersede | obsolete-memory use |
| 跨任务伤害 | 上次任务方法绑架新任务 | applicability + clean-start 控制 | harmful-memory rate |
| 权威冲突 | 项目指南与当前用户要求冲突 | 当前请求优先写入段首 | instruction-conflict errors |
| 审批疲劳 | 用户无脑批准 | 少量逐条提议、过期、批审不批写 | 审批时间、拒绝率、误批率 |
| 体积膨胀 | 每次都加载越来越长 | 可见预算、合并/退役、不静默截断 | context tokens、adherence |
| 客户端差异 | 有的客户端不读 prompt/resource | 让核心内容随 Pack；记录真实工具流 | transport success、tool traces |
| 隐私 | 项目规则被不必要外发 | 现有 AI-read 权限与路径披露 | bytes egress、privacy incidents |
| 自动维护越界 | MCP 变成后台管理员 | 只允许回答副产品提案 | unsolicited-write rate |

---

## 6. 分阶段落地建议

### Stage 0：先研究，不改产品

- 用固定文本模拟 plain guide 与 governed guide。
- 复用 `scripts/seed-mcp-lab.sh` 和隔离 `SPOOL_DATA_DIR`。
- 跑现有 E1/E2 加扩展条件，不插到渠道 R1 前。
- 把 ProjectMem、Gemini autoMemory、Supermemory MCP、Mem0/Graphiti 和原生客户端 memory 纳入基线资格审查。
- 产出原始 JSONL、运行 manifest、盲评、置信区间和实际账单。

**过门条件：** Pack + governed guide 在至少两个模型家族上有稳定、实际有意义的正向增益；有害历史不超过预注册边界；至少三种客户端能从同一来源取得相同有效指南；没有严重隐私/审批事故。

### Stage 1：最小内部原型

- 新表 + 手工 CRUD；
- active / retired / superseded；
- 固定 Pack 段；
- 暂不做自动提取，不做 graph，不做预测。

先让用户手工建立少量条目，验证信息模型和 UI，不把 AI 提案质量与基础模型混在一起。

### Stage 2：AI 提议闭环

- `propose_project_guide_change`；
- 待审新增/替换/退役；
- 来源、范围、版本、复核日；
- `get_project_guide` 与 overview；
- export/backup。

### Stage 3：只做被数据证明的增强

- provenance graph 中浮出指南与证据关系；
- 时间/事件层提供复核触发；
- 音视频提取出的事实能否成为证据来源；
- 多项目共享规则或可携带标准适配。

这些不能因为“以后可能有用”一起进入第一版。

### Kill criteria

出现任一情况，应停止产品化或退回研究：

- 相比当前 Pack 没有实际有意义的任务成功提升；
- stale / trap 伤害超过预注册边界；
- 跨客户端效果主要来自各自私有 prompt，而非同一 Spool 内容；
- 用户审批负担抵消重入收益；
- 代表性竞品在目标画像上稳定占优，而 Spool 没有隐私、治理或通用项目差异；
- 为了成立必须破坏主进程零网络、append-only 或人类批准红线。

---

## 7. 后续三条路线

三条路线是三个独立 backlog，共用证据和发布闸门，不应混成一条不断插队的长清单。当前每条最多维持一个 active deliverable。

| 路线 | 目标 | 交付物 | 核心衡量 | 当前事实 |
|---|---|---|---|---|
| A. 产品完善 | 让 Spool 更完整、可靠、易用 | UI/UX、细节功能、渠道安装、graph、事件/时间、音视频 | 激活、成功重入、任务完成、缺陷、使用负担 | 当前下一件仍是渠道 R1 |
| B. 营销商业 | 被正确的人看到并产生收入 | Logo/品牌、宣传图视频、真实交互视频、平台渠道、定价与销售实验 | 合格曝光→安装→激活→留存→付费 | 宣发目前暂停；外部用户证据为 0，不能虚构数字 |
| C. AI 记忆研究 | 找到可复现的跨生态上下文前沿 | benchmark、harness、协议、数据、论文、可验证方法 | 效用、伤害、可携带、成本、治理、可复现 | 现有 E1/E2 尚未跑，先写协议 |

### 7.1 A 线：产品完善

**Now**

- 完成官方 MCP Registry 的包装/形态核查与 R1；这属于产品分发，不等于营销内容投放。
- 保持当前发布尾项和质量红线，不在用户界面暴露实验环境。

**Next**

- 研究线先跑 E1/E2 及项目指南扩展；产品线不提前改 Pack。
- 处理 UI/UX 细节与现有尾项。
- F1 四带 skill 仍等 E2；F2 provenance graph 已有真实关系数据，可在正式排期时重排。
- F3 事件/时间层在动工前重定数据模型；F4 音视频先完成既定五项权限、体积、sidecar 调研。

**Later**

- 只把研究过门的项目工作指南转成产品功能。
- graph、时间和多模态围绕“更快重入/更可靠上下文”服务，不为展示功能数量而做。

### 7.2 B 线：营销与商业

**Now**

- 仍是 paused。用户本次表达的是后期战略方向，不等于立即重启物料制作。
- 先建立可证据化定位：Spool 是长期项目的本地上下文枢纽；“跨生态、用户治理的项目记忆”只有实验成功后才加入主张。

**Next（明确重开后）**

- 细化 spool / 线轴视觉系统和 Logo；
- 用真实产品状态制作宣传图、短视频和完整交互录屏；
- 区分用户价值素材与开发案例：前者讲结果，后者讲设计与证据；
- 按渠道做小规模测试，记录曝光、到站、下载、成功激活和后续访谈；
- 研究目标用户和付费任务，再做定价实验。

**Later**

- 只引用已注册、可复现、写明限制的研究结果；论文预印本不等于同行评审。
- 收费与仓库转私有仍遵守现有顺序：渠道 → 付费功能 → 挪走公开文档 → 转私有。

### 7.3 C 线：AI 记忆研究

**Now**

- 冻结问题、基线、指标、数据 schema、统计与公开边界；
- 复查 LongMemEval、MemTrapBench、ProjectMem、portable memory 标准与当前商业产品；
- 完成无代码 guide 拼接实验设计。

**Next**

- 跑受控 pilot，估计方差、难度和成本；
- 基于 pilot 做功效分析，冻结 confirmatory protocol；
- 运行多模型、真实客户端、正向/陷阱并存的核心实验；
- 公开合成 benchmark 和可脱敏复现材料前，先决定 IP 与独立研究仓库许可。

**Later**

- 最小原型与消融；
- 跨生态纵向用户研究；
- 论文、数据集和 artifact；
- 研究结果反哺产品与营销，而不是由营销结论倒逼实验。

### 7.4 三条线之间的闸门

```text
研究结果 ──效果/安全/负担过门──▶ 产品实现
    │                                  │
    └──可复现、限制写清──────────────▶ 营销证据

营销反馈 ──只提供问题与招募──────────▶ 研究选题
产品真实交互 ────────────────────────▶ 营销素材
```

- 研究 → 产品：不能只看平均准确率；必须同时过 utility、harm、portability、approval burden。
- 研究 → 营销：可披露数字最终进入 `CASE_STUDY_LEDGER.md`，设计稿不是数字权威。
- 营销 → 研究：可以招募参与者和暴露真实问题，不能筛掉不利样本或改主要指标。
- 产品 → 营销：只拍真实可交付界面；不拿实验 mock 当产品功能。

---

## 8. 为商业发展最值得精进的地方

这些判断来自当前代码、文档和公开市场先例，不是对用户需求的臆测。

### 8.1 先证明“成功重入”，不要只证明“收了很多内容”

`archive/DESIGN_FIRST_DAY_VALUE.md` 已指出，当前 first-day panel 更接近“收了多少”，而北极星是“能否成功重入”。产品和营销都应围绕可观察任务：

- 新对话是否少问背景；
- 用户是否更少重复纠正；
- 是否避免重走已知失败路径；
- 从打开项目到做出正确下一步用了几轮、多少分钟；
- 相同项目换客户端后是否仍能继续。

Spool 保持零遥测时，可以用本地可导出的自愿研究记录、任务实验和访谈收集，不应悄悄加入远程 analytics。

### 8.2 当前最大的商业瓶颈不是再加功能，而是分发与外部证据

最新 handoff 明确记录渠道已被推后五次；当前 32 次下载全是 owner tests、外部用户为 0。因此：

- 先把 R1 安装入口跑通，比继续堆一个未验证功能更有信息量；
- 外部用户前，不把 dogfood 数字写成市场 traction；
- 找到少量真实目标用户后，先观察激活和复用，再判断 graph、时间、音视频谁最值得提前；
- 定价要建立在目标用户和高价值任务上，而不是功能数量。

### 8.3 定位需要避开已经拥挤的“AI memory”泛词

Mem0、Supermemory、Zep、Letta、ProjectMem 和各大客户端都在使用 memory 这个词。Spool 更可信的定位不是“又一个 AI memory”，而是：

> **用户拥有的长期项目上下文：本地记录、可审计地整理，并把同一个项目交给不同 AI 继续。**

如果研究成立，再加第二层：

> **不仅让 AI 记得更多，还能知道哪条只在何时、何处适用，并让用户决定它何时失效。**

### 8.4 把现有信任机制做成看得见的产品价值

Spool 已有很多竞品表格难以表达的结构性能力：原文不覆写、AI 来源、逐句更正、supersede、recheck、文件 AI-read 权限、主进程零网络。商业上更值得精进的是让用户在真实界面中理解这些机制，而不是新增一排“AI 功能”按钮。

### 8.5 论文可以反向背书，但研究问题必须独立于产品胜负

一篇“我们做了 Spool，它很好”的产品文章学术贡献有限。更有机会的是发布：

- 跨生态项目上下文的可复现任务定义；
- 用户治理 memory 的结构化协议；
- 同时覆盖帮助与伤害的 benchmark；
- 真实客户端工具流与黑箱装载差异；
- Spool、native memory、fulltext、RAG/graph、ProjectMem、Supermemory 等基线的诚实比较。

即使最后 Spool 没赢所有画像，清楚说明什么条件下哪种方法最好，仍有研究与商业价值。反过来，若为了宣传只挑 Spool 赢的题，论文和产品信誉都会受损。

### 8.6 三线并行要控制 WIP

三条线长期都重要，但当前是单人/小团队产品，若每条同时开多个 deliverable，会重复历史上的插队。建议任何时点：

- 产品线 1 个 active deliverable；
- 营销线 1 个 active experiment；
- 研究线 1 个 active protocol/run；
- 每月或每个里程碑只在共享闸门处重排。

### 8.7 已接受的内部架构视角：可复利的项目资产，而不是新的一级定位

> **状态：Accepted（内部产品审计框架）**
>
> **决定日期：2026-09-03**
>
> **证据来源：** owner 提供的 2026-08-30 Codex 讨论与当时的外部资料检索摘要。
> 本节只固定已经拍板的产品判断；外部案例属于带日期的研究线索，任何公开引用或实施决策前必须重新核验。

“Agentic Asset Loop”提出了一个值得长期追问的问题：**每次 AI 工作之后，什么真正成为了项目资产；它下一次是否被复用；复用后结果是否更好。** Spool 接受这个问题意识，但不采用该词作为行业类别或一级产品定位，也不接受“工具必然被替代、编排必然被吞噬、只有资产层会赢”之类无法证实的强结论。

Spool 的一级定位继续保持为：

> **用户拥有的长期项目上下文：本地记录、可审计地整理，并把同一个项目交给不同 AI 继续。**

内部可以用 **compounding project assets（可复利的项目资产）** 检查产品是否真的越用越有价值，但它是审计框架，不是当前营销口号。Spool 也不因此变成长期目标规划器、Agent 编排器或后台自治维护者；外部 AI 负责执行，Spool 锚定用户拥有、可以复核和退役的项目资产。

#### 8.7.1 资产晋升链

并非每条 Block 或 AI 输出都自动是资产。建议的概念链是：

```text
原始输出 / Block
→ 候选资产
→ 来源、时间、适用范围与验证状态校验
→ 用户确认或外部证据验证
→ Active Asset
→ Pack / Search / Digest / 跨 AI 复用
→ 更正、替代、到期复核或退役
```

这条链复用现有 source、引用、更正、supersede、recheck 和用户控制，不授权现在新增 schema。Project Working Guide 若将来过门，主要承接流程资产与经验资产，而不是复制项目原始事实。

#### 8.7.2 三类资产必须分开衡量

| 资产类型 | 内容 | 当前主要载体 | 不能混淆的边界 |
|---|---|---|---|
| 状态资产 | 已确认事实、决定、证据与关系 | Block、引用、更正、文件、Pack | “被记录”不等于“仍适用” |
| 流程资产 | 工作方针、检查表、限制与审批规则 | 通用指令、候选 Project Working Guide | 不能把历史流程当成当前命令 |
| 经验资产 | 成功/失败路径、人工纠正及其适用情境 | 当前散落在 Block 与项目说明；Guide 是候选载体 | 不能从一次经历过度概括成永久规则 |

#### 8.7.3 复用价值的指标

“存了多少”不构成资产价值。至少分别测量：

- 是否被正确检索或装载；
- 是否在答案或行动中被实际采用；
- 是否减少背景追问、纠错轮次和重复失败；
- 是否提高依赖历史任务的成功率，同时不增加 stale / out-of-scope / harmful use；
- 换模型或客户端后，收益是否仍然存在；
- 用户为审核、更正和退役付出的时间是否抵消收益。

这些指标由 `AI_MEMORY_EXPERIMENT_PROTOCOL-2026-08-26.md` 的 utility、harm、transfer、cost 与 human-burden 路线验证；不得用产品界面中的计数替代。

#### 8.7.4 明确否决：通用 confidence 总分

不新增一个貌似精确的通用 `confidence` 分数。模型自信、来源权威、证据覆盖、人工确认和时效是不同维度，压成单一数字会隐藏含义。继续优先使用可审计字段：source、scope、validity/recheck、status、reviewer、correction 与 supersession。

#### 8.7.5 实施闸门

- 本决定**不改变** `EXECUTION_POLICY.md` 的 P / MEM / MKT 顺序，也不构成插入新功能的授权。
- Stage 0 与后续实验未过门前，不实现资产晋升 schema、自动规划器或自治维护循环。
- 若研究支持继续，第一优先是“候选 → 验证/批准 → active → superseded/retired”的最小闭环，而不是增加自主执行能力。
- Project Working Guide 的产品化仍须同时通过 utility、harm、portability 与 approval burden；只证明 Pack 能被复用，不等于证明经验资产层值得上线。
- 营销在取得可复现结果和真实用户证据前，不得宣称“越用越厚形成护城河”或把 “Agentic Asset Loop” 描述为成熟行业标准。

#### 8.7.6 带日期的外部参照，不作为产品结果

2026-08-30 的检索把 Case-Based Reasoning 的 Retrieve/Reuse/Revise/Retain、NASA Experience Factory，以及 data flywheel、agent memory、provenance、human-in-the-loop 视为成熟思想来源；把 Alibaba Cloud AgentLoop、Palantir Ontology+AIP、Salesforce、ServiceNow、Vanta、Glean 与 Clay 视为相邻产品路径。它们共同支持的较弱判断是：**typed domain state + 写回 + 生命周期 + 治理 + 高频高价值工作流可能产生复利。** 它们不能证明 Spool 有效果，也不能把相关公司的增长归因于“资产循环”。

当时保留的核查入口如下；链接只用于后续复核，不表示本次文档收口重新验证了页面内容：

- [Case-Based Reasoning](https://journals.sagepub.com/doi/10.3233/AIC-1994-7104)
- [NASA Experience Factory](https://ntrs.nasa.gov/citations/19950024815)
- [Alibaba Cloud AgentLoop](https://www.alibabacloud.com/help/en/agentloop/latest/core-concept)
- [Palantir Ontology](https://www.palantir.com/docs/foundry/ontology/why-ontology)
- [Salesforce agentic CRM](https://www.salesforce.com/welcome-to-the-agentic-enterprise/crm-ai-agents/?bc=OTH)
- [ServiceNow investor releases](https://newsroom.servicenow.com/press-releases/)
- [Vanta resources](https://www.vanta.com/resources)
- [Glean context for AI](https://www.glean.com/blog/context-for-ai)
- [Clay account research agents](https://www.clay.com/blog/account-research-agents)
- [Bessemer: State of AI](https://www.bvp.com/atlas/the-state-of-ai-2025)
- [a16z: system of intelligence](https://a16z.com/from-system-of-record-to-system-of-intelligence/)

---

## 9. 需要以后单独拍板的问题

本稿不替用户决定：

1. UI 中文名最终叫“项目工作指南”“项目记忆”还是别的；
2. active 指南的字节/token 预算；
3. hypothesis 到期后是从 Pack 隐藏，还是保留并显著降权；
4. 用户手工编辑 AI-origin 条目时，是生成新版本还是转成 user-origin；
5. 是否导出为 `AGENTS.md` / `CLAUDE.md` / `GEMINI.md`，以及谁是单一真值源；
6. 论文 benchmark、代码与数据是否另建仓库、采用何种许可；当前产品仓库“绝不加 LICENSE”的红线不在本稿中改变；
7. 营销线何时正式解除 paused；
8. 收费画像、价格和私有化时点。

---

## 10. 本地事实索引与外部参考

### 本地权威/相关文档

- 当前施工入口：`HANDOFF-NEXT-2026-08-26.md`
- 全量工作顺序：`WORKPLAN-2026-08-22.md`
- 产品定义与否决：`PLAN_EN.md`
- 产品总览：`SPOOL_OVERVIEW.md`
- MCP 写入角色：`DESIGN_MCP_WRITE_ROLE.md`
- MCP 入口实测：`DESIGN_MCP_INTENT_ROUTING.md`
- 上下文卫生：`DESIGN_CONTEXT_HYGIENE.md`
- MemTrapBench 评审：`archive/REVIEW_MEMTRAPBENCH-2026-08-21.md`
- RAG/上下文研究：`RESEARCH_RAG_CONTEXT-2026-08-24.md`
- 隐私边界：`PRIVACY.md`
- 可公开数字唯一台账：`CASE_STUDY_LEDGER.md`

### 学术与标准（用于定边界，不表示已经复现实验）

- [LoCoMo, ACL 2024](https://aclanthology.org/2024.acl-long.747/)
- [LongMemEval](https://arxiv.org/abs/2410.10813)
- [LongMemEval-V2](https://arxiv.org/abs/2605.12493)
- [MemoryAgentBench](https://arxiv.org/abs/2507.05257)
- [MemBench, Findings of ACL 2025](https://aclanthology.org/2025.findings-acl.989/)
- [MemTrapBench](https://arxiv.org/abs/2608.20202)
- [Memora / FAMA](https://arxiv.org/abs/2604.20006)
- [SteeM: Controllable Memory Usage, ACL 2026](https://aclanthology.org/2026.acl-long.670/)
- [Portable Agent Memory](https://arxiv.org/abs/2605.11032)
- [Agent-Memory Protocol](https://proceedings.mlr.press/v317/wu26a.html)
- [PM-Bench](https://arxiv.org/abs/2607.12385)

外部页面和产品能力按 2026-08-26 冻结；正式实验前必须再次记录版本和访问日期。
