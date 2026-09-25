# 下一窗开工提示词（⛔ SUPERSEDED · 历史现场）

> ⛔ **禁止复制本文件开工。** 它已由 `docs/HANDOFF-2026-09-04.md` supersede。
> 当前唯一 active handoff 与可直接复制的 Claude Code 提示词见该文件 §14。
> 下方原提示词完整保留，仅用于追溯 2026-08-27/29 当时的决策审计与执行光标。

```text
这是一次“先审计决策、再决定是否施工”的开工窗口。评估完成前只允许读取、搜索、
检查 Git/代码/测试定义和查询外部一手资料；禁止写代码、改 schema、运行会改变真实数据或
外部状态的命令，也禁止为了保持文档“一致”而顺手修改任何文件。

先完整读取以下三份文档，顺序不要改变：

1. docs/EXECUTION_POLICY.md

这是 LOCKED 的长期总执行方针，负责：

- 产品、AI 记忆研究、营销三线的主次和交替；
- 当前任务能否进入执行面；
- 新任务、小功能如何进入 HANDOFF；
- 阻塞、插队和营销解锁规则。

除非 Ocean 明确要求修改这份文件或长期方针，否则禁止编辑、补充、删减、格式化、
重命名、拆分或“顺手同步”它。任务完成、新发现、客观评估认为它不够理想，都不构成
修改许可。若认为长期规则需要改变，只能在 HANDOFF 写 policy change proposal，等待 Ocean。

2. docs/DESIGN_PROJECT_MEMORY.md

这是项目工作指南 / 项目专属记忆的产品设计与三线战略依据。它用于理解：

- 为什么不能做成 AI 任意改写的大段 memory；
- Project Working Guide 的产品语义、治理、来源、范围和状态；
- 项目记忆与 Pack、通用 prompt、当前对话之间的边界；
- 产品、研究、营销三条线如何互相提供证据。

它仍是研究前设计稿，不代表项目记忆功能已经批准施工，也不授权修改 schema。
其中的候选数据模型、工具、UI 和市场判断都要接受本窗口的客观决策审计。

3. docs/AI_MEMORY_EXPERIMENT_PROTOCOL-2026-08-26.md

这是 AI 记忆研究的方法和证据标准，负责：

- E1/E2；
- Project Working Guide 实验；
- Track A 受控实验、Track B 跨客户端实验、Track C 纵向研究；
- utility/harm 共同主要终点；
- 样本量、聚类统计、基线公平性、预注册和停止条件。

协议目前是 v0.1 preregistration candidate，实验尚未运行。pilot、dogfood、内部下载、
厂商自报结果或论文里的别家数字，都不能当作 Spool 胜出或营销证据。协议是研究候选，
不是产品施工授权；冻结前仍需补齐的项目必须客观检查，不能为了赶进度假装已经决定。

读完以上三份后，再完整读取当前 active HANDOFF：

4. docs/HANDOFF-NEXT-2026-08-26.md

以文件首屏的 active / supersedes 声明识别入口，不要只看日期。HANDOFF 中较早的装机、
测试和提交数字可能已被同文件后面的 08-27 记录更新；事实必须用当前代码、测试、实际
二进制或最新运行记录复核，不能照抄文件前段。

不要把以下文件当开工入口：

- docs/HANDOFF-2026-08-22.md：已经 SUPERSEDED，只作历史现场；
- docs/archive/HANDOFF-NEXT-2026-08-24.md：已经归档；
- docs/NEXT-WINDOW-PROMPT-2026-08-27.md 自己：它只负责启动检查，不是状态权威；
- docs/TEN-ITEMS-2026-08-27.md：十件已经完成的验收记录，不是待办清单。

读完 active HANDOFF 后，再读本轮新增的调查报告：

5. docs/RESEARCH_ANSWER_PROVENANCE-2026-08-29.md

它调查的是“回答为什么这样答”，与 Project Working Guide 的“以后怎样继续做”不同。
报告中的 Evidence Envelope、Claim Ledger、Answer Receipt、provenance 分级、跨项目更正、
supersede 审计、实验扩展和未来商业定位全部是候选建议，不是 Ocean 已批准的产品任务，
也不自动改变 E-core 的共同主要终点或执行顺序。

如果某个外部事实会影响判断，例如 MCP Registry 当天 package type、MCP 最新规范、
供应商 citation/grounding 能力、论文是否同行评审，必须查当天的一手官方文档或论文原文，
记录访问日期；不能只相信上述文档截至 08-26/08-29 的快照，也不能用搜索摘要代替来源。

截至本提示词建立时，前序 Codex 完成的是文档和研究设计，不是产品实现：

- 基于 Spool 代码和现有文档完成 Project Working Guide 候选设计；
- 完成论文级跨生态 AI 记忆实验协议 v0.1 candidate；
- 建立 LOCKED 三线总执行方针；
- 把 R1 官方 MCP Registry 与 R2 Show HN 拆开：R1 仍属产品，R2 继续封存；
- 建立新任务默认只以 captured 进入 active HANDOFF 的规则；
- 完成回答可溯源市场/学术/本地代码调查，并提出未批准的候选架构；
- 没有实现 Project Working Guide 或 Answer Provenance，没有修改产品代码，也没有运行实验。

────────────────────────────────────────────────────────
一、施工前强制完成“新决策客观审计”
────────────────────────────────────────────────────────

不要为了表示独立而机械反对，也不要因为文档写得完整就默认同意。先从四份长期/研究文档
中抽出所有最近新增、尚会影响产品或研究的决定与候选，至少覆盖：

A. 已由 Ocean 明确批准、受锁保护的长期决定

- 产品完善永远是主线；
- AI 记忆研究是第二中心，按有边界里程碑与产品交替；
- 营销闸门前只收集自然产生的真实素材；
- R1 与 R2 分离；R2 Show HN 继续封存；
- 新任务只进 active HANDOFF，Agent 发现时默认 captured；
- Agent 未获明确许可不能修改 EXECUTION_POLICY.md。

这些决定可以检查事实前提和风险，但不能由 Agent 单方面废止、改写或重新排期。

B. 尚未批准施工的项目记忆候选

- Project Working Guide 是否真的需要独立于 block/Pack；
- AI proposal + user approval、scope/version/recheck/supersession；
- 候选 schema、Pack 段、MCP tools 与 UI；
- Stage 0 无代码实验和产品 kill criteria。

C. 尚未批准施工的回答可溯源候选

- Project Working Guide 与 Answer Provenance 分层；
- Evidence Snapshot、Claim Ledger、Answer Receipt、N:M evidence edges；
- declared / corroborative / generation-time / contributive / human-verified 分级；
- Answer Receipt 默认不自动进入 Pack；
- Best-effort MCP 与 strong capture 两种模式；
- 跨项目 correction 可见性与批准 supersede 理由持久化；
- verifier 只作辅助、因果 attribution 只作研究；
- 对实验协议增加 AP 子研究是否有足够价值、成本和学术新意；
- “跨生态回答审计层”是否只能作为未来、待证实的商业定位。

D. 研究协议里的未冻结决定

- utility SESOI、harm 非劣界、目标模型/客户端、baseline eligibility；
- dataset、split、项目/episode 数、power simulation、最终 N；
- timeout/retry/failure policy、cost ceiling、artifact 许可与数据保留；
- E-core 只能做协议冻结、harness/smoke、E1、E2，不能吸收完整 Track A/B、
  Project Working Guide 产品实现、Answer Provenance 产品实现或论文工程。

对每项输出 Decision Audit 表，至少包含：

| 字段 | 要求 |
|---|---|
| 来源 / 决策 ID | 文件、章节、代码或外部一手来源 |
| 当前性质 | implemented fact / owner-approved locked decision / research assumption / candidate / stale claim |
| 要解决的问题 | 是否有代码、真实使用或实验依据；不能只写“可能更好” |
| 当前实现事实 | 代码/schema/测试现在到底能做什么 |
| 支持证据 | 一手来源和它实际能证明什么 |
| 反证与替代 | 最强反对理由；是否有更小、更便宜方案 |
| 收益与伤害 | utility、harm、隐私、审批负担、跨生态、可维护性 |
| 依赖与成本 | 迁移、UI、MCP、研究、模型调用、人工审核 |
| 可逆性 | 能否先无代码验证；失败后如何退出 |
| 与现有方针/协议的关系 | 是否冲突、是否扩 scope、是否需要 amendment 或 Ocean 新授权 |
| 建议结论 | accept / modify / reject / defer / insufficient-evidence |
| 执行状态 | locked / existing active / captured candidate / not scheduled |

评估必须主动挑战以下问题：

1. “项目关键逻辑混乱”究竟由自由文本写回、跨项目更正不可见、supersede 理由丢失、
   读取纪律、文档陈旧还是其他原因造成？不同原因不能用一个大功能概括。
2. Project Working Guide 能解决哪些，Answer Provenance 又能解决哪些？是否有重复建设？
3. 是否能先复用现有 block/ref/source_text/engine_runs/run manifest，做无 schema 实验？
4. exact locator 是否只是定位正确，而非语义支持？verifier 的误报/漏报如何处理？
5. MCP server 看不到最终回答和客户端外工具这一边界，是否让某些主张根本不可实现？
6. 新结构是否会把 AI 生成内容漂白成项目事实，或增加隐私、存储与审批疲劳？
7. 论文贡献是否独立于 Spool 胜出？若强基线获胜，研究是否仍有价值？
8. 哪些建议是已存在 bug 的最小修复，哪些是新的战略工程，不能混着排期？

不得用下面这些作为结论依据：

- “某厂商说 grounded/accurate”；
- Agent 自述“我确实使用了这些来源”；
- 引用链接可打开；
- 一次 dogfood、pilot 或 smoke；
- 论文 preprint 的单次数字直接外推到 Spool；
- 文档写了字段，所以真实客户端一定会调用或填写；
- 图更完整，所以产品一定更可信。

评估结果必须先向 Ocean / 当前审阅 Agent 汇报。汇报至少包括：

- 哪些新决定有充分证据，建议保留；
- 哪些应修改、推迟或拒绝；
- 哪些只是事实修复，哪些是新 scope；
- 是否有任何内容与 LOCKED 方针或 active HANDOFF 冲突；
- 是否建议把某项以 captured 状态写入 HANDOFF；
- active lane；
- active milestone；
- 准入依据；
- 已有 acceptance；
- protected next；
- 评估后是否仍建议保持当前执行光标 P / R1；
- 本窗口在得到回应前明确不做什么。

在完成这份评估并向 Ocean 汇报前，禁止开始 R1，也禁止修改任何文档或代码。
评估本身不授权修改 LOCKED 方针、schema、Pack、MCP、实验协议或 HANDOFF 状态。

────────────────────────────────────────────────────────
二、若 Ocean 确认保持现有执行光标，才进入下面的现行工作
────────────────────────────────────────────────────────

当前 active lane：P / 产品完善。

当前 active milestone：R1 官方 MCP Registry。

准入依据：

- EXECUTION_POLICY §6.2；
- active HANDOFF §2；
- R1 属产品分发，不是营销内容制作；
- R2 已与 R1 拆开，不再阻塞 E-core。

已有 acceptance / 红线：

- 先核当天 Registry 接受的 package type；
- 形态确认前禁止先写 server.json；
- 对外数字从实际发布二进制重新测量，不沿用旧文档；
- 真实外部用户仍不得用 owner test/download 冒充；
- 不加 LICENSE；
- 不把 Spool 改成公网服务；
- 不为了提交 Registry 顺手做安装器、远程服务或营销物料。

R1 分支：

- 接受本地二进制或自托管安装：继续 R1；
- 只接受 package：这是额外安装器工程，先在 HANDOFF 记录证据和影响，再问 Ocean；
- 只接受远程 HTTPS：撞 Spool 本地产品边界，记录一手证据并请求决定，不能把 Spool
  改成公网服务；
- 官方规则含糊或相互冲突：停止，不猜测可提交性，不先造 package/server.json。

protected next：

R1 完成或被正式证伪后，进入 E-core：

协议冻结 → harness/smoke → E1 → E2。

E-core 是一个有成本/时间停止线的原子研究里程碑，只能包含运行 E1/E2 必需工作。
E2 结束后必须返回产品 F1 闸门。不得吸收完整 Track A/B、Project Working Guide 实现、
Answer Provenance 实现、完整论文工作或营销细化。

本窗口明确不做：

- 不做 R2 Show HN；
- 不改 EXECUTION_POLICY.md；
- 不实现 Project Working Guide；
- 不实现 Claim Ledger / Evidence Envelope / Answer Receipt；
- 不改 schema、Pack、Pinned 或 provenance graph；
- 不扩写并运行完整 Track A/B/C；
- 不把调查报告中的建议升级为 active；
- 不为营销制作 Logo、海报、视频、文案、定价或发布；
- 不回头重做已经完成并验收的十件、Q/W/X 或旧批次；
- 不顺手修 HANDOFF 中的非阻断尾项。

────────────────────────────────────────────────────────
三、Git 与文档保护
────────────────────────────────────────────────────────

先运行 git status 和针对相关文件的 git diff。当前工作区已有用户/Codex 留下的未提交、
未跟踪文档，不要覆盖、删除、重命名、格式化或自动提交：

- docs/EXECUTION_POLICY.md
- docs/DESIGN_PROJECT_MEMORY.md
- docs/AI_MEMORY_EXPERIMENT_PROTOCOL-2026-08-26.md
- docs/RESEARCH_ANSWER_PROVENANCE-2026-08-29.md
- docs/NEXT-WINDOW-PROMPT-2026-08-27.md
- docs/HANDOFF-NEXT-2026-08-26.md 的 active/supersedes 入口与已有新增内容
- docs/HANDOFF-2026-08-22.md 的 superseded 入口标记与已有修改

若以后获准施工，提交时只暂存自己本窗口明确产生的文件和行。共享 HANDOFF 只能追加
自己的独立小节，不能重写别人已有段落；提交前再次检查 diff 和 status。

执行中发现任何非阻断 bug、小功能、重构机会、研究变量或营销想法：

- 先写当前 active HANDOFF；
- 默认状态 `captured`；
- 不加入 EXECUTION_POLICY 或继续增长 WORKPLAN；
- 不因“只有几行”“顺手”“与当前文件相邻”而施工；
- 只有 Ocean 批准或已属于既有 acceptance，才可升级为 approved/active。

发生数据损坏、隐私/安全、失控付费、发布完整性或研究污染时，按 EXECUTION_POLICY §8
做最小止损并保留证据，然后回到原执行光标；紧急中断也不授权扩大范围。
```
