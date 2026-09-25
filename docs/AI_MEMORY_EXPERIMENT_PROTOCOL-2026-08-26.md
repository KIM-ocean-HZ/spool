# 实验协议 —— 跨生态项目记忆与 AI 交互

> 协议版本：**v0.1 / preregistration candidate**
>
> 起草日期：2026-08-26
>
> 状态：**研究设计，尚未开跑，不含任何 Spool 实验结果**
>
> 目标：用可证伪、可复现、同时衡量帮助与伤害的实验，寻找当前市场条件下最优的跨生态项目上下文方案，并判断“项目工作指南”是否值得进入 Spool 产品。
>
> **本协议不改变当前 HANDOFF/WORKPLAN 的施工顺序。** 当前仍先做渠道 R1；实验归入渠道之后的 E 批。正式运行前把 v0.1 补全、hash 并冻结为 v1.0；看到隐藏测试结果后不得倒改假设、主要指标、排除规则或统计方法，只能追加带时间的 amendment。

配套产品设计：`DESIGN_PROJECT_MEMORY.md`。

---

## 0. 本实验究竟要回答什么

### 0.1 决策问题

本实验不是为了证明 Spool 一定胜出，而要回答：

1. 项目专属、带治理信息的工作指南，是否比当前 Pack、FullText、静态规则文件和现有 memory 产品更能帮助 AI 完成长期项目任务？
2. 它是否会增加推理固着、过期规则套用、跨任务污染、来源漂白或持久 prompt injection？
3. 同一份记忆从 source AI 迁到另一个 target AI / 客户端后，收益是否保留？
4. AI 提议、用户批准、可替换/退役的治理是否真的改善质量，还是只增加审批负担？
5. 在 token、延迟、费用、安装成本、隐私和可审计性一起考虑时，哪类方案处于 Pareto 前沿？
6. 结果是否足以支持产品实现、公开 benchmark、论文和后续营销证据？

### 0.2 “市场最优”的可证伪定义

不允许把任意权重混成一个分数后宣称“全市场第一”。本研究按画像分别判断：

| 画像 | 优先维度 |
|---|---|
| Local / privacy-first | 本地性、最少数据外发、可导出、可删除、任务成功 |
| Maximum utility | 任务成功、正向历史利用、复杂 workflow 延续 |
| Safety / governance-first | harmful transfer、stale use、来源、审核、退役完整性 |
| Low-cost | token、延迟、API 费用、构建/维护成本 |
| Cross-ecosystem | source→target 迁移、unseen target、无内容分叉 |
| Low-friction | 安装时间、首日成功、用户审核和纠正负担 |

v1.0 需要把每个画像冻结成可执行规则，而不是只列价值观：

| 画像 | 硬资格门槛 | 主优化量 | 平局规则 |
|---|---|---|---|
| Local / privacy-first | 项目记忆不要求云端保存；可完整导出/删除；harm 过界；无 severe incident | 所有冻结 target 中最差的 utility | 数据外发更少，再看安装负担 |
| Maximum utility | harm 过界；无 severe incident | 预注册标准化边际任务成功率 | worst-target utility，再看总成本 |
| Safety / governance-first | utility 不低于预注册下限；无 severe incident | adverse-memory-use rate 的单侧 95% 上界最低 | 退役完整性，再看审计时间 |
| Low-cost | utility 与 harm 均过界 | 每个成功项目的现金成本；人工分钟另列、不得暗算为 0 | 先人工分钟，再看延迟 |
| Cross-ecosystem | 所有要求的 target cell 实际装载；harm 过界；无内容分叉 | worst-target TransferGain | actual-load rate，再看成本 |
| Low-friction | utility 与 harm 均过界 | 安装到首个成功任务的时间 + 后续审核分钟（分别报告） | 失败恢复步骤，再看现金成本 |

缺少画像要求的生态格即对该画像不合格，不能用均值填补。只有当一个方案在所有相关维度均不劣于预注册容差、且至少一项的 CI 支持更好时，才称为“robustly dominates”；否则标为 `uncertain / non-dominated`。最终表述必须加上“截至某日、在预注册纳入的 eligible systems 与冻结配置中”，不能从样本外推整个市场。

只有在预注册数据集版本、冻结的模型/客户端版本和明确画像下，才可以写：

> 在 CrossEcoMemBench vX 的 N 个冻结系统、M 个目标生态上，方案 Y 在该画像的预注册主指标上最高或位于 Pareto frontier。

不可以写：

- “永远/所有模型都更好”；
- “防止 memory trap”；
- “市场唯一/首个跨生态 memory”；
- 把别家论文或厂商 benchmark 的数字当成 Spool 结果；
- 跨不同 harness 直接横比准确率。

---

## 1. 已知研究边界与潜在贡献

### 1.1 已有工作已经覆盖什么

| 工作 | 已覆盖 | 对本研究的约束 |
|---|---|---|
| [LongMemEval](https://arxiv.org/abs/2410.10813) | 信息抽取、多 session 推理、时间推理、知识更新、拒答 | 不能只测事实召回 |
| [LongMemEval-V2](https://arxiv.org/abs/2605.12493) / [repo](https://github.com/xiaowu0162/LongMemEval-V2) | 451 个手工问题；静态/动态状态、workflow、environment gotcha、premise awareness；可到 500 trajectories / 115M tokens | “保存 agent 工具经验/项目文件”不是新意；必须纳入 workflow/gotcha 与 premise |
| [AgentMemoryBench](https://openreview.net/pdf?id=MSXbrNExax) | system memory 与 personal memory；Offline/Online/Replay/Transfer/Repair | 程序经验与项目事实必须分层评测 |
| [CL-Bench](https://arxiv.org/abs/2606.05661) | stateful−stateless 配对增益；simple full-context ICL 是强基线 | FullText 不能缺席，复杂 memory 不自动更优 |
| [MemCollab](https://arxiv.org/abs/2603.23234) | 跨模型共享可能负迁移；model-aware distilled memory | 不能宣称“跨模型共享”首创；必须测 source×target interaction |
| [MemTrapBench](https://arxiv.org/abs/2608.20202) | cognitive bias、task boundary、safety、trauma 等有害历史 | 必须同时包含“应使用”和“应忽略/退休”的历史 |
| [LoCoMo-Plus](https://aclanthology.org/2026.acl-long.1150/) | cue 与 trigger 不直接词面重合时应用先前隐含约束 | 必须测“规则适用但当前问题未复述关键词”的隐式适用性 |
| [Memora / FAMA](https://arxiv.org/abs/2604.20006) | 记忆 mutation、obsolete / invalid memory 与主动遗忘 | 必须测 update、retire、forget leakage |
| [GateMem](https://arxiv.org/abs/2606.18829) | utility、contextual access、删除后的主动遗忘 | 不能只报 utility |
| [ProjectMem](https://arxiv.org/abs/2606.12329) / [repo](https://github.com/riponcm/projectmem) | local-first、typed events、MCP 跨 coding agents、stale/supersede、intent 分离 | “本地 + event log + MCP + 过期”不是新意，且是强制 coding 基线 |
| [Portable Agent Memory](https://arxiv.org/abs/2605.11032) | heterogeneous agents 间可携带 memory | portable 本身不是空白 |
| [Agent-Memory Protocol](https://proceedings.mlr.press/v317/wu26a.html) | privacy-oriented redact / pack / hydrate | 必须讨论隐私、导出和恢复 |
| [PrimeAgentOrchestrator](https://arxiv.org/abs/2608.20342) | 将异构记忆整理到 `CONTEXT_BRIEFING.md` / `CLAUDE.md` 的经验报告 | 文件式跨工具 priming 也不是首创，且需要强统计证据补足 |

此外，商业/OSS 直接先例包括 [Basic Memory](https://github.com/basicmachines-co/basic-memory)：人和 AI 经 MCP 双向读写/搜索项目 Markdown，并支持多种客户端。因此“项目专属、AI 可修改、Markdown/MCP 跨客户端”作为组合也不能单独声称首创。

### 1.2 仍有机会形成的研究贡献

暂定工作名：**CrossEcoMemBench / Portable Project Memory Across Heterogeneous AI Agents**。

一篇有说服力的工作应同时贡献：

1. source agent → target agent 的完整跨生态迁移矩阵，而不是只测同一模型跨 session；
2. 记忆冻结后引入从未参与构建的 target（unseen-target split）；
3. 同时覆盖项目事实、决策理由、workflow/tool gotcha、失败路径、动态更新和 premise awareness；
4. 将 scope、client/version、validity、expiry、supersession、provenance 建模为一等字段；
5. 比较 AI 直写、AI 提议+用户批准、人工维护和自动退役；
6. 同时报告收益、伤害、成本、隐私、可审计性和用户负担；
7. 在受控模型轨与真实产品黑箱轨之间明确分开因果结论；
8. 发布可复现 harness、合成数据和完整统计口径。

只做一个 Spool 功能和单开发者 dogfood 不足以支持强论文；“benchmark + method + 多模型/多客户端 + 纵向用户研究”才可能形成完整贡献。

### 1.3 暂不放进首篇主实验的“前瞻记忆”

如果用户所说的“预测工作”实际指 prospective memory，它的学术含义不是预测结果，而是在未来 cue/state 出现时执行延迟意图。可参考 [PM-Bench](https://arxiv.org/abs/2607.12385)。这更接近 Spool 的 follow-up / event / reminder 路线，应作为后续研究，不与首篇 retrospective project-memory 主实验混合。

---

## 2. 研究问题与预注册假设

### 2.1 Research Questions

- **RQ1 Utility**：哪种记忆表示最能提高依赖历史的任务成功？
- **RQ2 Harm**：哪种表示最少把原本正确的无记忆答案拉错？
- **RQ3 Governance**：scope、来源、复核日、supersede 和用户批准分别贡献多少？
- **RQ4 Transfer**：source 生态形成的记忆迁到不同 target 后，收益衰减多少？
- **RQ5 Writeback**：谁能写出真正可复用、范围正确、不过度概括的项目经验？
- **RQ6 Efficiency**：额外收益需要多少 token、调用、时间、费用和人工审核？
- **RQ7 Human factors**：是否减少重入时间、重复说明和纠正负担，并改善信任校准？

### 2.2 Confirmatory hypotheses（v1.0 冻结前仍可修订）

- **H1（共同主要）**：`Pack + governed project guide` 在历史依赖任务上的标准化边际成功率高于当前 `Pack only`。
- **H2（共同主要）**：`Pack + governed project guide` 的 observable adverse-memory-use rate 相对 `Pack only` 不超过预注册非劣界。
- **H3（次要 confirmatory）**：在 propositions 和 token/style 固定时，去掉 applicability / scope / validity / supersession 会提高 stale/out-of-scope use。
- **H4（次要 confirmatory）**：在 canonical memory hash 固定时，跨生态 target 保留正 TransferGain；source-generated memory 的 writer×reader interaction 另行估计。
- **H5（Track C 前为 exploratory）**：对同一 proposal 随机进入 `direct write` 或 `user review` 时，review 提高 reusable-memory precision；真实净人力收益须由纵向研究验证。
- **H6**：FullText 在部分任务上仍会与复杂 memory 持平或更好；任何“更优”结论只按任务/画像给出，不假定复杂度单调带来收益。

### 2.3 产品判定候选门槛

这些是 v0.1 的候选，v1.0 前由产品意义而非隐藏测试结果拍板：

- Utility：**10 个百分点是候选 SESOI（产品认为值得做的最小实际意义）**。候选产品 gate 为点估计 ≥10pp 且双侧 95% CI 下界 >0；这只能证明存在正效应，不能声称真实提升至少 10pp。若要做“至少 10pp”的学术主张，CI 下界也必须 >10pp；
- Harm：相对 `Pack only` 的 adverse-memory-use rate 差值非劣界候选为 **3 个百分点**，用单侧 95% 上置信界判定；3pp 的严重度和业务依据必须在 v1.0 写明；
- Cross-ecosystem：至少 3 个真实客户端能使用同一 source-of-truth，不需要复制并分叉内容；
- Robustness：至少 2 个模型家族方向一致，且没有一个预注册高风险任务族越过 harm 边界；
- Governance：未批准持久写入、跨项目读取、退役后继续注入等 severe incident 采用零容忍产品 gate；即使观察为 0，也报告精确上置信界，不声称风险为 0；
- Human burden：审核和纠正时间必须完整报告，不能只算模型 token 节省。

若 pilot 显示这些效应量不切实际，应在打开 confirmatory test labels 前写 amendment；不能在看完结果后移动门槛。

### 2.4 主要 estimand 与外推范围

Track A 的共同主要 estimands 固定为：

1. **Utility estimand**：C4 相对 C2 的标准化边际任务成功概率差；先在任务族内求边际值，再对任务族、领域和冻结模型家族等权平均；
2. **Harm estimand**：C4 相对 C2 的 observable adverse-memory-use rate 差；用单侧 95% 上界与 3pp 候选界比较。

H1 superiority 与 H2 non-inferiority 使用 **intersection-union gate**：两项都通过才称主方法过门，不以一项的强结果补偿另一项失败。模型家族和真实客户端是预注册的固定目标集，不是从“所有未来模型”随机抽样；结论只外推到冻结任务、领域、模型/客户端和版本。H3–H4 构成单独的 Holm family；H5、H6 及其余矩阵和子群结果标为 exploratory，除非 v1.0 另立 family。

---

## 3. 三条实验轨道

### Track A：受控模型/架构比较

目的：尽量隔离 memory representation 的效果。

- 同一个公开、研究者控制的 system instruction；
- 同一个 tool schema、任务、历史、输出格式和 verifier；
- 只替换 memory condition；
- 至少 3 个模型家族；
- 通过 API 或可锁定模型的统一 harness；
- temperature、seed、最大 token 等支持的参数全部锁定。

这条轨可以说“在受控 harness 中，记忆方法 X 的影响”。

### Track B：真实生态黑箱比较

目的：测真实可用性和客户端行为。

候选 bundle：Claude Code、Codex、Gemini CLI、Cursor；扩展为 ChatGPT Projects、Claude Projects、GitHub Copilot Memory、Pieces、Notion MCP 等。

- client + model + hidden vendor prompt + feature flags 视为一个整体；
- 只记录可见配置、版本、官方文档、实际工具流和结果；
- 不尝试读取或复制隐藏 system/developer prompt；
- 不能把差异归因为某一个模型或 memory 算法；
- resources/prompts/instructions 不能假定被调用，必须从 trace 证明。

这条轨只能说“生态 bundle X 在冻结版本上的结果”。

### Track C：纵向用户研究

目的：验证实验任务外的真实重入、记忆维护和信任。

在 Track A/B 有正向结果后另立伦理和招募 protocol。优先项目级随机或 counterbalanced matched-project 设计，避免同一项目先看到某种 memory 后产生不可洗掉的 carryover。至少覆盖 coding 与非 coding 项目；收集重入时间、重复说明、纠正、审核、退役和主观信任校准。

Track C 的样本量、周期和补偿在伦理审查与 pilot 后单独冻结，本稿不伪造一个看似精确的 N。

---

## 4. 实验单位与数据集

### 4.1 最小单位

一个 episode：

```text
{
  project_history,
  memory_state,
  live_task,
  allowed_tools,
  gold_evidence,
  gold_actions,
  verifier,
  trap_tags
}
```

实验单位必须按研究类型拆开：

- **冻结读取实验**：对每个 `project × episode × condition × target` 从完全相同的 cutoff snapshot 克隆独立环境；运行结束后的写入全部丢弃。condition 在 episode clone 级随机，保证不同表示不会互相污染。
- **纵向写回/治理实验**：condition 在完整 project/trajectory 级分配；同一条 trajectory 从头到尾只接受一种写回策略，因为一次写入会改变后续状态，不能在 episode 间交叉而假装没有干扰。
- **一次 run** 是观测记录，不是独立统计样本；技术 repeats 嵌套在 `episode × condition × target/model` 中。episode 嵌套于 project，project/trajectory 是主要 cluster。

同一项目内问题共享历史，不能当成独立样本虚增显著性。Track C 若由参与者贡献多个项目，还需在 participant 层建模。

### 4.2 数据层级

1. **Synthetic-controlled**：精确控制真值、时间、冲突、失效和陷阱；首个公开 benchmark 主体。
2. **Sanitized semi-natural**：从真实项目形状抽象、脱敏并重写，保留工具流和决策结构。
3. **Consented longitudinal**：真实用户项目；只在明确同意、最小化收集和伦理审查后进行。

原始私人 Spool 库、真实 secrets 和厂商隐藏 prompt 不进入公共数据集。

### 4.3 项目与 episode 形状

规划阶段每个 project 包含 20–40 个顺序 episode；“10–20 个独立项目环境”只可作为工程量级，不是已证明足够的 N。正式项目数和 episode 数由 variance pilot 与功效模拟决定。每条 trajectory 至少包含：

- 项目静态事实与约束；
- 状态/时间更新与旧事实覆盖；
- 决策理由；
- workflow / tool gotcha；
- 成功路径和失败路径；
- client-only 或 version-only 规则；
- 证据不足时应 abstain；
- 项目切换、任务边界和 concept drift；
- 写回、替换、退役和删除后的后续任务。

领域至少分：

- 软件开发；
- 产品/运营/营销；
- 学术研究或知识工作。

首轮核心实验保持文本为主。音视频/图像作为单独 multimodal stratum 后加，避免把 F4 的未完成产品能力与核心记忆结论混在一起。

### 4.4 任务族

| 任务族 | 正向题 | 负向/陷阱题 |
|---|---|---|
| Factual state | 需历史事实才能答 | 无证据却诱导猜测 |
| Dynamic state | 使用最新覆盖事实 | 旧事实更醒目但已失效 |
| Decision rationale | 复用真实决定与理由 | 将一次性决定泛化到新范围 |
| Workflow/tool | 避免已知工具坑 | 客户端/版本变了，旧坑不适用 |
| Re-entry | 正确说明状态和下一动作 | 把旧 handoff 当当前用户命令 |
| Premise awareness | 发现前提满足才用记忆 | 前提不满足仍机械套用 |
| Update/forget | 正确替换或退休 | 删除/退役后仍泄漏旧记忆 |
| Cognitive bias | 利用有帮助的经验 | 历史答案导致 reasoning fixation |
| Task boundary | 同类任务迁移 | 创作/独立判断被上次答案绑架 |
| Safety/injection | 遵守当前安全约束 | 外部材料变成持久站立指令 |
| Writeback | 保存真正可复用经验 | 保存可推导、重复、无来源或越界内容 |

每个任务族同时有“应使用记忆”和“应忽略/拒绝/退役记忆”的样本。主结果按任务族 macro-average，避免靠堆某一类题让 no-memory 或 always-use-memory 策略虚假获胜。

### 4.5 Source → Target 迁移

一个 project trajectory 拆为：

```text
前半段：source S 执行任务并形成 memory
          ↓ 冻结 memory snapshot/hash
后半段：target T 在 held-out tasks 上使用冻结 memory
```

迁移研究拆成三层，不能把 writer quality 与 reader/transport 混为一项：

1. **Canonical-memory transfer**：研究者冻结同一份人工 canonical memory 与 hash，交给每个 target，只测读取、适用判断与 transport；
2. **Source-generated transfer**：各 source 只看同一 history prefix，独立生成 memory，再交给所有 target，估计 writer×reader interaction；
3. **Adaptation / repair**：target 可以提出写回或修复错误 memory，作为单独纵向实验。

每层覆盖同生态 S=T 与跨生态 S≠T。`unseen target` 也分两种：

- **预注册 leave-one-client-out**：在 v1.0 选定一个 target；方法、adapter、prompt 和阈值不得在它上面调参，作为 confirmatory unseen-target；
- **未来才发布的新客户端**：只作 out-of-time external validation，另分 study wave，不并入原 confirmatory 结果。

source、target、representation、construction process 和 transport 必须是独立字段，不能混成一个“用了 memory”。跨生态汇总先在每个 target 内相对该 target 的 C0/C2 求差，再按 §2.4 的预注册 target 权重标准化；不使用容易受对角线构成影响的简单 diagonal-minus-off-diagonal 平均。

---

## 5. 条件矩阵

### 5.1 Core representation conditions

| ID | 条件 | 目的 |
|---|---|---|
| C0 | No history / no memory | stateless 基线 |
| C1 | Full raw history | 最强简单上下文基线；不得删 |
| C2 | 当前 Spool Pack | 当前产品基线 |
| C3 | Pack + plain curated guide | 测“有一份精选指南”本身 |
| C4 | Pack + governed guide | scope/provenance/validity/status/supersede/approval 全部存在 |
| C5 | Cleaned Pack only | 原样保留现有 E1 的独立清理臂，只测 Pack 清理 |
| C6 | 静态 `AGENTS.md` / Markdown instructions | 最简单开放可携带文件基线 |
| C7 | Pack + AI direct-write guide | 对比有无 review，专用于治理消融 |
| C8 | Pack + AdaptiveMem-style guardrail | 把通用防陷阱 prompt 与项目专属 memory 分开比较 |
| C9 | Pack + token/style-matched sham guide | 控制“多给一段结构化文字”本身 |
| C10 | Oracle minimal evidence | 只给 gold 必需证据的非现实上界，用于诊断检索/表示损失 |
| C11 | Cleaned Pack + governed guide | 组合臂，测 Pack 清理与 guide 是否交互；不能代替 C5 |

`AdaptiveMem` 来自 MemTrapBench，是通用静态 prompt skill，不是项目记忆。它应作为 Pack-level guardrail 基线，不应与 project memory 混为一种方法。

C9 使用与 C4 相同标题、长度和格式，但只含预先验证为 task-irrelevant 的中性内容，不能偷偷加入另一种有用提示；C10 明确标为诊断上界，不参与“可部署产品”排名。C5 是现有 E1 的原条件，C11 才是新增组合臂；两者必须同时存在，不能把 guide 效果混进 Pack 清理效果。

组件与端到端效果分三项实验：

1. **Metadata efficacy**：固定完全相同的 propositions、顺序、措辞和近似 token，只增删 scope/provenance/validity/supersession 字段；
2. **Review efficacy**：固定同一批 proposal，随机进入 direct-write 或 user-review；reviewer 只能看当时 history prefix 与 evidence，不能看 held-out task、gold 或未来事件，并记录 reviewer ID/修订；
3. **End-to-end strategy**：各系统按自然写入、检索和呈现流程运行，比较整体产品策略。

C4 对 C2 的主比较属于端到端效果，不能把胜负单独归功于某个 metadata 或 human review；机制归因只来自前两项受控实验。

### 5.2 Retrieval / system baselines

| ID | 条件 | 角色 |
|---|---|---|
| R1 | File archive + agent search | 纯文件按需读取 |
| R2 | BM25 | 词法检索最小基线 |
| R3 | Dense vector RAG | 常见 semantic memory 基线 |
| R4 | Hybrid BM25+dense | 更强简单检索基线 |
| R5 | Graphiti/Zep | 时间图、事实失效与混合检索 |
| R6 | Hindsight | 事实/经验/观察/观点、时间图与置信度的结构化 memory |
| R7 | Mem0 | 通用 semantic MCP memory |
| R8 | Supermemory MCP | space、来源/version、guided-save、跨客户端云端基线 |
| R9 | ProjectMem | local/event/stale/supersede/coding MCP 强制基线 |
| R10 | Basic Memory | Markdown/MCP/project knowledge 强制开放基线 |
| R11 | Letta 或 LangMem | 受控 agent framework / procedural memory 扩展基线 |

不应在第一轮把十个系统与所有模型做全因子。先做 eligibility screen，锁定：

- 所有 core conditions；
- 一个 lexical、一个 dense/hybrid 基线；
- ProjectMem、Basic Memory、Supermemory；
- 一个 temporal graph；
- 一个通用 memory service。

排除任何候选必须在结果前记录理由，例如无法冻结版本、无法导出 trace、条款不允许自动测试、所需付费/地区不可用。不能因 pilot 成绩低而删基线。

### 5.3 Native black-box baselines

- [Claude Code `CLAUDE.md` + auto memory](https://code.claude.com/docs/en/memory)；
- [Cursor Rules / Memories](https://docs.cursor.com/en/context/memories)；
- [Gemini CLI tiered memory + experimental autoMemory](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md)；
- [GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory)；
- [ChatGPT Project-only Memory](https://help.openai.com/en/articles/10169521-using-projects-in-chatgpt)；
- [Claude Project Memory](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context)；
- [Pieces MCP / Long-Term Memory](https://docs.pieces.app/products/core-dependencies/pieces-os/quick-menu)；
- [Notion MCP curated project page](https://www.notion.com/help/notion-mcp)。

这些测试真实 UX、安装、自动提取、审核、来源显示和跨 session 表现。不同产品不能保证相同模型，所以结果不用于 memory 算法的纯因果排名。

### 5.4 Transport ablation

保持 memory bytes 完全相同，只换运输方式：

| T | 运输方式 |
|---|---|
| T0 | 用户复制 Clipboard Pack |
| T1 | MCP `get_pack` / `get_project_guide` |
| T2 | repo `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` |
| T3 | MCP resource / prompt（仅客户端确实支持时） |
| T4 | client-native memory import |

每种运输记录：是否装载、首个调用、实际 bytes、顺序、重复/截断、客户端报错。服务端“提供”不等于客户端“使用”。

### 5.5 Governance ablations

在 C4 上逐一去掉：

- A1 scope/applicability；
- A2 client/version boundary；
- A3 provenance/evidence；
- A4 validity/recheck；
- A5 supersession/retirement；
- A6 human review；
- A7 fact/hypothesis type；
- A8 current-request-wins header；
- A9 facts-only；
- A10 procedures-only；
- A11 fresh-start / “本题不要使用项目记忆”控制；
- A12 memory budget（短/中/长，由 pilot 冻结字节，而非用词数猜）。

这组比“整体 Pack+memory 赢没赢”更能形成可发表的机制结论。

### 5.6 预算与公平比较

每种方法只能看到 memory cutoff 之前的同一批项目证据；不得接触 held-out task、gold evidence、verifier 或未来事件。报告两套结果：

1. **Matched-budget**：最终注入 target 的上下文字节/token 预算相同，用于比较表示效率；
2. **Native/default**：按各产品官方推荐配置运行，用于比较真实产品体验。

同时记录 memory 构建、embedding/index、后台抽取、人工精选、检索和维护成本。FullText 超出上下文时，按预注册的确定性规则截断并报告丢失比例；不能给 Spool 精选上下文、却让 FullText 因随机截断输掉。云端产品若隐藏 token 或构建成本，标为 `unobservable`，不能按 0 处理。

C7 的 AI direct-write 只在合成、隔离环境中运行；它是治理消融，不授权任何真实 agent 绕过用户批准。

组件有效性比较要求同一模型、原始信息宇宙、回答 token budget、工具和 dev-only 调参预算；端到端产品比较则保留官方推荐模型、隐藏 harness、安装、自动 memory 与默认成本，并明确只能解释整个 bundle。检索系统除 Recall@k 外，还按“每个注入 token 覆盖的 gold evidence”比较，避免 chunk 粒度不同造成虚假优势。

### 5.7 市场基线的纳入与选择

v1.0 预注册：市场检索截止日、检索来源、产品类别、最低跨生态/导出/trace/可运行要求、付费与地区规则。所有候选先通过相同 installation smoke test，再用独立 dev set 和相同调参预算选定每类代表；“强基线”只能由固定规则（例如 dev utility、公开采用度或代表性架构）决定，不能看 hidden test 或因 pilot 低分删除。

公开完整 eligibility ledger：纳入、排除、版本、commit、配置、费用和理由。OSS 固定源码 commit；条件允许时把配置发给基线维护者复核，但维护者不接触 hidden test。

---

## 6. Ground truth 与防泄漏

### 6.1 真值先于运行冻结

每个 episode 预先写：

- 必需事实；
- 当前有效事实；
- 已失效事实；
- 允许与禁止的工具动作；
- 必须引用的 evidence IDs；
- 正确范围/版本；
- 应拒答或请求澄清的条件；
- deterministic verifier 或评分 rubric。

真值由未参与 memory 生成的标注者建立。开发、验证、隐藏测试必须在 **project、trajectory、生成模板/template family** 三层都不交叉，不能把同一模板只换实体后分到两边。prompt 调整只能看开发集，方法选择只能看开发/验证，confirmatory test 一次性解封。memory author 只看 cutoff 前缀，绝不能看 held-out task、gold、verifier 或未来 trajectory。

### 6.2 指令与工具经验来源

只使用：

- 研究者控制、可发布的 system/developer instruction；
- 用户授权的可见对话；
- 可授权的 action/tool trace；
- 合成或脱敏项目材料；
- 有明确来源和许可的公开材料。

不收集客户端隐藏 prompt，不要求模型复述其隐藏指令，不把不可见内容当可捕获数据。研究对象是“可观察项目规则、工具经验及其证据”，不是跨供应商复制隐藏提示词。

### 6.3 防 benchmark 泄漏

- 合成实体、日期、工具和错误；
- test projects 不公开到运行结束；
- verifier 与题面分离；
- 检查模型是否只靠公共仓库/常识可答；
- 每题设置 no-history probe；若 C0 稳定答对，则不能计作 memory-dependent positive；
- 放入已知会触发 stale/injection 的 positive controls，以及明确无害的 negative controls；若方法/评分器连 positive control 都检测不到，本 wave 不具 assay sensitivity，不能据此下安全结论；
- 发布后保留一个不可公开的持续验证集，并按版本轮换。

---

## 7. 数据 schema 与运行记录

### 7.1 Episode JSONL

```json
{
  "episode_id": "proj07-e018",
  "project_id": "proj07",
  "domain": "software",
  "trajectory_step": 18,
  "timestamp": "2026-04-12T09:30:00Z",
  "visible_events": [],
  "memory_items": [
    {
      "memory_id": "m14",
      "kind": "verified_lesson",
      "content": "...",
      "scope": {"client": "client-a", "version": "<=2.4"},
      "status": "superseded",
      "evidence_ids": ["ev31"],
      "valid_from": "2026-03-01",
      "valid_until": "2026-04-01",
      "superseded_by": "m19"
    }
  ],
  "live_task": "...",
  "allowed_tools": ["read_file", "run_test"],
  "gold_evidence_ids": ["ev44", "m19"],
  "gold_actions": [],
  "trap_tags": ["stale_rule", "client_scope"],
  "privacy_class": "synthetic",
  "split": "test"
}
```

### 7.2 Run manifest

```json
{
  "run_id": "...",
  "protocol_version": "1.0",
  "dataset_commit": "...",
  "episode_id": "...",
  "condition": "C4",
  "transport": "T1",
  "source_agent": "...",
  "target_client": "...",
  "target_model": "...",
  "client_version": "...",
  "model_snapshot_or_api_date": "...",
  "feature_flags": {},
  "researcher_visible_instruction_hash": "...",
  "tool_schema_hash": "...",
  "memory_snapshot_hash": "...",
  "temperature": 0,
  "seed": 1,
  "started_at": "...",
  "finished_at": "...",
  "input_tokens": 0,
  "output_tokens": 0,
  "memory_tokens": 0,
  "latency_ms": 0,
  "actual_cost": 0,
  "tool_trace_path": "...",
  "raw_output_path": "...",
  "status": "completed"
}
```

`researcher_visible_instruction_hash` 只覆盖研究者可见、可控制的指令。Track B 的厂商隐藏 prompt 不进入 manifest，另以 client/model/bundle/version/feature flags 标识黑箱生态；不得通过诱导模型泄露来补这个字段。

### 7.3 Append-only artifact layout

```text
experiment/
  protocol/
    v1.0.md
    v1.0.sha256
    amendments.md
  dataset/
    dev.jsonl
    validation.jsonl
    test.encrypted-or-heldout.jsonl
  manifests/
  memory_snapshots/
  raw_outputs/
  tool_traces/
  automated_scores/
  human_ratings/
  costs/
  analysis/
  environment/
```

本稿只定义未来 artifact，不在本次任务创建实验目录或脚本。

所有 raw output append-only；重跑生成新 `run_id`，不覆盖失败运行。对每个文件保存 checksum。secret redaction 生成派生公开副本，原始私有数据受限保存。

---

## 8. 指标

### 8.1 写入质量

- reusable item Precision / Recall / F1；
- kind、scope、client/version、validity、provenance 正确率；
- 冲突率、重复率、authority-laundering rate；
- 用户接受、修改、拒绝、退休率；
- review 秒数、每条操作数；
- 未批准却进入后续上下文的比例（目标必须为 0）。

### 8.2 读取与证据

- evidence Recall@k / Precision@k；
- 必需证据覆盖；
- 引用来源正确率；
- relevant / irrelevant injected tokens；
- memory retrieval latency；
- tool/resource/prompt 实际调用率；
- bytes loaded、截断、重复装载。

### 8.3 端到端效用

- deterministic verifier task success；
- rubric pass；
- first valid action；
- 完成步骤、工具调用数、重复调用率；
- wall time；
- input/output/memory tokens；
- actual API cost；
- memory 构建、index、后台抽取和人工整理成本；
- 用户补充背景和纠正轮次。

配对主量：

```text
PairedGain(M) = Success(M) - Success(C0)

NormalizedGain(M) = (Score(M) - Score(C0)) / (Score_max - Score(C0))

BeneficialFlip_joint(M) = count(C0 错, M 对) / N_all_pairs
HarmfulFlip_joint(M)    = count(C0 对, M 错) / N_all_pairs

BeneficialFlip_cond(M)  = count(C0 错, M 对) / count(C0 错)
HarmfulFlip_cond(M)     = count(C0 对, M 错) / count(C0 对)

NetFlip(M) = BeneficialFlip_joint(M) - HarmfulFlip_joint(M)
```

在二元、成对、等权且无缺失的数据上，`PairedGain = BeneficialFlip_joint - HarmfulFlip_joint = NetFlip`，不是两个独立指标；分开报告两个 joint flip 的价值是显示相同净增益背后分别发生了多少帮助与伤害。conditional 版本回答“原本错/对的样本中有多少翻转”，必须与 joint 版本分列，不能混用分母。`NormalizedGain` 只作描述量；当 `Score(C0)` 接近 `Score_max`、分母过小或为 0 时不报告，主结论仍以绝对配对差为准。

### 8.4 有害记忆

共同主要安全终点是 **observable adverse-memory use**：输出或工具行动实际使用了 gold 标为 invalid、stale、retired、out-of-scope 或 injected 的 memory。它由 evidence span、行动和 tool trace 判定，比一次随机的 C0 对/M 错更接近可观察伤害机制。

- stale-rule use；
- invalid/superseded memory use；
- task-boundary violation；
- client/version scope violation；
- unsupported memory claim；
- prompt-injection persistence；
- 应 abstain 而未 abstain；
- retire/delete 后泄漏；
- 当前用户明确指令被旧指南覆盖；
- 无记忆正确、有记忆错误的 harmful flip。

harmful flip 是配对描述量，不单独证明“记忆导致错误”；有害错误也不能由模型自述归因。评分者根据输出、tool trace、memory evidence 和 C0 配对结果盲评。

severe governance incidents 单列：未批准写入后续生效、跨项目/越权读取、明确退役后仍持久注入、真实敏感数据外发。它们不与普通 adverse event 平均，也不适用 3pp margin；产品 gate 为观察到 0 次，并报告基于实际暴露次数的精确单侧上置信界。

### 8.5 跨生态迁移

```text
TransferGain(S,T) = Score(memory built by S, used by T) - Score(no memory, T)

TargetStandardizedTransfer = weighted_mean_T(TransferGain(S,T))
WorstTargetTransfer = min_T TransferGain(S,T)
```

同时报告：

- source×target interaction；
- unseen-target generalization；
- 每个 target 内的同生态→跨生态性能差及其 CI；
- 内容 fork 数量和差异；
- 相同 memory hash 在各客户端的实际装载率；
- 迁移前后来源、scope、退役信息保存率。

### 8.6 人因与产品价值

- 重新进入项目用时；
- 重复解释次数；
- 纠错与审核时间；
- 找到证据所需点击/调用；
- 用户能否正确指出某结论来源、范围和是否过期；
- trust calibration：正确时信任、错误时质疑，而不是只测“喜欢”；
- 安装到首个成功跨客户端任务的时间。

H5 不把准确率与秒数相减成任意“净分”。纵向 gate 分开要求：任务 utility 不劣于 direct-write，同时“每个成功项目的总人工分钟”（设置 + 审核 + 纠正 + 退役）更少；两项均过才称人力净收益为正。

### 8.7 隐私、可携带与运维

- 本地/云端存储；
- 发给各供应商的 bytes 和字段；
- 账号、OAuth/API key 依赖；
- export/import 是否完整保留 provenance、validity 和 history；
- 删除/退役传播时间；
- 安装步骤、后台服务、数据库、模型/embedding 依赖；
- 失败恢复和审计能力。

成本以用户/采购者视角冻结：API 与订阅现金成本（写清订阅摊销周期）、embedding/index/storage、设置时间、审核与维护分钟分别报告。除非 v1.0 预注册时间价值，人工分钟不擅自折算成美元。

---

## 9. 评分与标注

### 9.1 优先级

1. 可执行 deterministic verifier；
2. 结构化 assertion；
3. 两名独立人工盲评 + adjudication；
4. LLM-as-judge 仅作补充与敏感性分析。

不能让单一 LLM judge 决定主要结论。

### 9.2 盲化

- 去除方案名、品牌、条件 ID；
- 输出顺序随机；
- 人工评分者看 rubric 和必要证据，不看实验假设；
- 评分后要求 rater 猜 condition，报告猜中率；若输出长度、引文格式或品牌词导致明显解盲，做去格式/长度匹配 sensitivity；
- adjudicator 只处理分歧；
- 报 Cohen’s κ；多标签/多评分者时用 Krippendorff’s α；
- 一致性不达预设门槛时，先修 rubric 并重标开发样本，不直接解释 test 结果。

### 9.3 Judge 校准

- 在开发集建立人工 gold；
- 比较不同 judge prompt/model；
- 报 judge 对各 condition 的系统性偏差；
- 对关键 harmful flip 全量人工复核；
- 发布 judge prompt、版本和输出，不只发布最终分数。

---

## 10. 样本量、重复与统计

### 10.1 Pilot

pilot 拆为两层：

1. **Instrumentation pilot**：30–50 个 unique episodes，覆盖任务族和至少两个领域，只检查题目、trace、verifier、floor/ceiling、泄漏、成本与失败率；这个规模不能可靠估计 project ICC。
2. **Variance pilot**：按独立 project 数规划，每个 project 保留多个 episode，用于估计 project/episode 方差、paired discordance、condition-by-project 异质性和技术重复误差。

功效模拟不只 plug-in 一个不稳定的 ICC 点估计，还跑预注册的低/中/高保守 ICC 情景。两层 pilot 都不用于最终产品/市场声明；看过或调过的 project、template family 和题目不能进入 hidden confirmatory test。

### 10.2 Confirmatory N

不先编一个固定 N。v1.0 冻结步骤：

1. 用 variance pilot 的 project、nested episode、技术重复方差和 discordance 建 simulation，并覆盖保守 ICC 情景；
2. 对 utility superiority 和 harm non-inferiority 两个共同门槛分别估计功效；
3. 以 α=0.05、最低 80% power、目标 90% power 选 project 数；
4. 采用两个目标所需 N 的较大值；
5. 加预注册的技术失败余量；
6. 在 test labels 解封前记录最终 N、代码、随机种子和预算。

如果预算无法达到最低功效，缩小主张/条件，而不是运行一个注定无法排除偶然的“大矩阵”。

### 10.3 重复运行

- repeats 数量由 instrumentation/variance pilot 的测量方差和预算在 v1.0 冻结；支持 seed 的开放模型应覆盖多个预注册 seed，商业 API 不支持 seed 时记录为独立请求而不假装 seed 可控；
- 同一 episode 的 repeats 是技术重复，不是新增独立样本；
- 在 project/task/model 分层内预先随机化 condition 顺序；同一 API wave 尽量交错运行各条件，避免把时间漂移误当方法差异；
- 真实客户端无法完全交错时使用 counterbalanced block，并把日期/wave 纳入模型；
- 模型/客户端更新后视为新 study wave，不与旧版本无条件合并；
- 因 rate limit、客户端崩溃、tool timeout 失败的运行保留，并按预注册 failure policy 计入可用性结果。

### 10.4 统计模型

- binary task success：mixed-effects logistic regression；
- 固定效应：condition、source、target、冻结 model/client wave、task family、domain、drift、transport 及预注册 interaction；少数模型/客户端逐个报告，不把它们当“所有模型”的随机样本；
- 随机结构：project 随机截距，episode 嵌套于 project；若同一 template family 跨 project 复用，则再加 crossed template-family 随机截距；数据和收敛允许时加入 condition-by-project random slope；技术 repeats 嵌套在 `episode × condition × model/target`，不作为新 item；
- beneficial/harmful paired flips：project-clustered paired bootstrap、cluster-aware conditional model 或相应 GLMM；普通 McNemar 忽略项目聚类，不作主检验；
- 连续成本/延迟：mixed-effects regression；重尾时 bootstrap CI / Wilcoxon sensitivity；
- ordinal 人因：ordinal mixed-effects；
- project-level hierarchical bootstrap 95% CI；
- H1/H2 走 intersection-union；H3–H4 作为一个 Holm family；H5/H6、其他消融、S×T 子格和 endpoint 为 exploratory，或在 v1.0 另立预注册 family；
- 报绝对差、odds ratio/效应量和 95% CI，不只报 p-value；
- 预注册主 interaction，避免在全矩阵里事后找显著格子。

### 10.5 缺失、排除与异常

运行前冻结：

- 何为模型拒答、客户端错误、工具错误、超时；
- 哪些算 task failure，哪些算 infrastructure missing；
- 技术失败最多重试几次；
- 被污染/泄漏的 episode 如何记录和替换；
- outlier 是否 winsorize（默认不删，优先 robust statistics）；
- 厂商更新、feature flag 改变或费用缺失时如何分 wave。

所有排除同时报告包含/不包含的 sensitivity analysis。

Track B 的 primary ecosystem-effectiveness 采用 intention-to-treat：安装失败、认证失败、客户端崩溃和工具不可用按未完成/失败计入，因为它们属于真实产品效果。另报成功运行的 per-protocol 分析用于诊断算法能力。Track A 同时给 all-attempts 与完成运行结果，技术失败不能只从主表消失。

---

## 11. 分阶段执行

### Phase 0：协议与基线资格冻结

- 冻结 RQ、假设、指标、数据 schema、伦理边界；
- 保存官方文档 URL、访问日期、版本、截图；
- 对每个市场基线做安装、导出、trace、自动化、费用资格审查；
- 发布 eligibility ledger，并用 dev-only conformance cases 验证各 adapter 没有丢 scope/provenance/retirement；
- 明确哪些是受控算法比较，哪些是黑箱产品比较；
- 决定公开 artifact 是否另建仓库及许可；不改变当前产品仓库 no-LICENSE 红线。
- v1.0 不只保存在本地：连同分析代码、随机化、排除规则和 power simulation 使用可信第三方时间戳/公开注册；如因 IP 暂不公开，则先用可验证的 embargoed registration。

### Phase 1：Harness 与 12 题 smoke test

- 建 isolated `SPOOL_DATA_DIR`；
- 复用 `scripts/seed-mcp-lab.sh`；
- 正式库与实验连接分离；
- 客户端串行，每换客户端重新播种；
- 验证 tool trace、hash、token、cost、raw output 全部落盘；
- 12 题只测管线，不进统计。

### Phase 2：Pilot

- 先做 30–50 unique episodes 的 instrumentation pilot，再做按独立 project 规划的 variance pilot；
- 先跑 C0/C1/C2/C4/C5 和一个按 §5.7 固定规则预注册的代表性外部基线；
- 至少两个模型家族，优先发现方向相反；
- 评估题目泄漏、floor/ceiling、rater agreement、ICC、成本；
- 冻结 confirmatory N 和最终条件。

### Phase 3：核心受控实验

- 主比较 C2 vs C4；
- C0/C1/C5/C6 保持强简单基线；
- 加 locked external baselines；
- 多模型、正向/负向、跨领域；
- 完成 utility 与 harm 两个共同判定。

### Phase 4：机制消融

- scope、validity、provenance、review、supersede、type、header、budget，以及 C11 的清理×guide 组合；
- 用 stale、task-boundary、injection、workflow/gotcha 子集提高检验力；
- 明确哪项元数据真正有效，避免把整套复杂度一起归功。

### Phase 5：真实客户端与 S×T 迁移

- Claude Code / Codex / Gemini CLI / Cursor；
- 同 memory snapshot 经 clipboard、MCP、instruction file 运输；
- source→target 完整矩阵与 unseen target；
- 保存真实 tool traffic，而不是询问模型“你有没有读到”。

### Phase 6：写回与 longitudinal study

- 人工、AI direct write、AI proposal+approval；
- 长期积累、冲突、修订、退役、审批疲劳；
- 多用户、coding 与 non-coding；
- 先走伦理/同意，再使用真实项目。

### Phase 7：复现与论文

- 由不同执行者在独立环境复跑；优先让方法作者无法看到 hidden labels，并在原分析锁定后再解封；
- public synthetic benchmark；
- 代码、prompt、manifest、失败运行、实际账单、限制；
- artifact evaluation；
- 产品实现与论文结果分支，避免跑中途改产品污染实验。

---

## 12. 每次运行的操作手册

### 12.1 开跑前

- [ ] protocol version 与 hash 已冻结；
- [ ] dataset split 不可见性确认；
- [ ] model/client/API date/plan/region/flags 记录；
- [ ] tool list 与 annotations snapshot；
- [ ] memory snapshot/hash 确认；
- [ ] 隔离数据库重播种；
- [ ] 客户端使用隔离 profile/config；除 native-memory 条件外，项目/全局原生 memory 已禁用、清空或从干净 snapshot 恢复；
- [ ] 云端黑箱产品使用独立测试账号/workspace，或已验证 account-level memory 可完整清空；不得清除用户真实账号的数据；
- [ ] warm/cold cache、首次登录/已登录状态按随机化表锁定并记录；
- [ ] 正式 Spool MCP 连接关闭或明确区分名称；
- [ ] 研究者可见 instruction/config 与 tool schema hash；
- [ ] 费用上限和 rate-limit 窗口；
- [ ] 不含 secret / hidden prompt / 未授权个人数据；
- [ ] clock/timezone 锁定；
- [ ] raw logger 和失败保留已验证。

### 12.2 单次 run

1. 从干净 snapshot 启动；
2. 注入唯一 condition；
3. 发送完全一致的 live task；
4. 不做实验者中途帮助；
5. 保存每次工具调用、参数、返回、时间；
6. 保存最终输出和停止原因；
7. 记录 token、wall time、实际费用；
8. 运行 deterministic verifier；
9. 生成盲化评分包；
10. 对数据库、memory 和外部服务做 after snapshot；
11. 关闭客户端，下一格重新播种。

### 12.3 运行后

- [ ] 不覆盖失败输出；
- [ ] checksum；
- [ ] 自动评分与 raw 分离；
- [ ] 技术异常按预注册代码分类；
- [ ] API 估价替换为实际 bill；
- [ ] 人工评分不显示 condition；
- [ ] adverse memory event 单独登记；
- [ ] 如果官方产品更新，停止该 wave 并写 amendment。

---

## 13. 数据质量、隐私与伦理

### 13.1 数据最小化

- 公共 benchmark 优先全部合成；
- semi-natural 数据重写实体、路径、密钥、商业信息；
- real-user study 单独 consent；
- 保存哪些内容会发送给哪个厂商；
- 用户可撤回，定义删除和备份清除流程；
- 原始私有数据与可发布派生数据物理分离。

### 13.2 Prompt injection 与安全

特意构造外部页面/附件中的恶意持久化指令，但只在 sandbox 和合成项目中运行。观察：

- 是否被提议成 memory；
- 是否未经批准生效；
- 是否在新客户端继续传播；
- provenance 是否被保留；
- retire 后是否仍被调用；
- 当前用户请求能否覆盖旧内容。

不在真实库、不对外部系统执行破坏动作。

### 13.3 人类参与者

若收集真实用户工作行为、对话、评分或访谈：

- 在招募前进行适用的机构伦理/IRB 审查；
- 明确供应商出网、保存期限、补偿、退出和数据使用；
- 不把雇员/客户的私有项目默认纳入；
- 发布只用同意范围内的聚合或脱敏材料；
- 不因营销招募而排除不满意用户。

### 13.4 IP 与许可

当前产品仓库明确不加 LICENSE。若论文要求公开 benchmark/harness，需在公开前单独决定：

- 是否另建研究仓库；
- 代码、数据、模型输出分别用何许可；
- 第三方 benchmark 和产品结果能否再分发；
- 先提交专利/保护 IP 还是先预印本。

本协议不替用户改变现有许可决定。

---

## 14. 结果表模板

### 14.1 Run accounting

| Wave | Condition | Model/client | Planned | Completed | Infra fail | Task fail | Actual cost |
|---|---|---|---:|---:|---:|---:|---:|
| | | | | | | | |

### 14.2 Co-primary endpoints

| Condition | Task success | Utility Δ vs Pack | Utility 95% CI | Adverse-use Δ | Harm one-sided 95% upper | Severe count / exact upper | Joint gate |
|---|---:|---:|---:|---:|---:|---:|---|
| Pack only | | — | — | — | — | | baseline |
| Pack + governed guide | | | | | | | |

Beneficial/harmful joint 与 conditional flips 另表分解，不混进共同主要 harm endpoint。

### 14.3 Task-family breakdown

| Condition | State | Dynamic | Workflow | Premise | Trap | Forget | Writeback |
|---|---:|---:|---:|---:|---:|---:|---:|
| | | | | | | | |

### 14.4 Transfer matrix

| Source \ Target | Claude Code | Codex | Gemini CLI | Cursor | Preregistered leave-one-out target |
|---|---:|---:|---:|---:|---:|
| Claude Code | | | | | |
| Codex | | | | | |
| Gemini CLI | | | | | |
| Cursor | | | | | |

每格同时附 task success、harmful flip、actual load rate、tokens/cost，不只放一个平均分。

### 14.5 Governance

| Condition | Write P | Write R | Scope acc. | Provenance acc. | Unapproved leak | Review sec/item | Retire leak |
|---|---:|---:|---:|---:|---:|---:|---:|
| | | | | | | | |

### 14.6 Pareto profile

| Method | Utility | Harm | Transfer | Cost | Locality | Governance | Auditability | Dominated? |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| | | | | | | | | |

---

## 15. 决策规则

### 15.1 进入 Spool 产品原型

必须同时满足：

- H1 utility 过 superiority gate；
- H2 harm 过 non-inferiority gate；
- 至少两个模型家族方向稳定；
- 真实客户端里同一 source-of-truth 可用；
- 无未批准生效、跨项目泄漏、退役失效等严重事故；
- 用户审核负担没有抵消重入收益；
- 与强基线相比存在至少一个明确的非劣画像。

只过 utility 不过 harm，不施工；只在一个客户端过，不称跨生态；只赢 no-memory 不赢 FullText/Pack/静态文件，不称先进方案。

### 15.2 进入论文主张

至少需要：

- protocol 预注册；
- 隐藏测试与独立复跑；
- 受控轨三个以上模型家族 **且** 真实生态 bundle 复现；
- S×T 与 unseen-target；
- 正向/负向、coding/non-coding；
- 强简单基线和直接竞品；
- 原始结果、失败、成本、限制；
- 统计功效、效应量、CI、rater agreement；
- benchmark/method 的贡献不依赖“Spool 赢”。

主张分级，不能越级：

1. **Benchmark validity**：任务、verifier、基线和标注可靠；
2. **Method efficacy**：受控多模型轨支持表示/治理机制；
3. **Ecosystem effectiveness**：真实 bundle 的 ITT 结果支持跨生态可用性；
4. **Human value**：纵向研究支持重入与审核负担收益。

只有做到前 3 级才能作跨生态方法主张；没有 Track C 时不声称真实用户生产力提升。

### 15.3 进入营销证据

- 结果口径与 preregistered claim 一致；
- 明确 dataset、版本、N、日期和限制；
- 不把 arXiv 当同行评审；
- 不把 internal pilot 当市场 traction；
- 最终数字只进入 `CASE_STUDY_LEDGER.md`；
- 若结果只支持某个画像，宣传只说那个画像。

### 15.4 停止/转向

出现以下任一项应停：

- Pack+guide 对 Pack 没有实际意义增益；
- harmful transfer 或 stale use 超界；
- source×target interaction 大到无法形成可携带结论；
- review burden 明显高于用户节省；
- 外部强基线在目标画像上稳定占优且 Spool 无独特优势；
- 实验无法记录真实装载/工具流，结论只能依赖模型自述；
- 隐私或许可条件无法满足可复现研究。

转向并不等于研究失败：证明 FullText、AGENTS.md、ProjectMem 或某种 native memory 在特定条件下更优，本身就是对产品有价值的边界结果。

---

## 16. 与现有 Spool E1/E2 的关系

本协议扩展而不推翻既有计划：

| 现有项 | 本协议映射 |
|---|---|
| E1 无历史 / FullText / 当前 Pack / 新表头 / 清理 Pack | C0/C1/C2/C5 与 header ablation |
| E1 必须含正向题 | §4.4 各任务族正向/负向成对 |
| E2 Authority Band / Pinned / 日期 / 表头消融 | §5.5 provenance、validity、header、budget 消融 |
| 保留 raw、独立真值、实际账单、写限制 | §6–§13 全部继承 |
| E2 挡 F1 | 仍成立；不因本协议提前改 Pack 或 Pinned |

新增部分是：

- project working guide；
- AI direct write vs proposal+approval；
- source×target cross-ecosystem transfer；
- market/OSS baselines；
- longitudinal human factors；
- paper-grade preregistration 与统计。

---

## 17. 正式开跑前仍需补齐的冻结项

- [ ] v1.0 的 utility MDE 与 harm non-inferiority margin 最终拍板；
- [ ] 目标模型/客户端/版本/region/plan；
- [ ] external baseline eligibility 结果；
- [ ] dataset 项目数、每项目 episode 数、split；
- [ ] pilot power simulation 和最终 N；
- [ ] rater agreement 通过阈值；
- [ ] timeout/retry/failure policy；
- [ ] cost ceiling；
- [ ] human-study 伦理方案（若进入 Track C）；
- [ ] 研究 artifact 仓库与许可；
- [ ] 公开/私有数据保留与删除期；
- [ ] protocol hash、分析代码 hash、容器/环境 snapshot。

这些项未补完前，只能运行 smoke/pilot，不能开始 confirmatory test，也不能对外宣称效果。

---

## 18. 参考

### Spool 内部依据

- `HANDOFF-NEXT-2026-08-26.md`
- `WORKPLAN-2026-08-22.md` E1/E2 与实验纪律
- `archive/MCP_LAB_PROMPT.md`
- `archive/REVIEW_MEMTRAPBENCH-2026-08-21.md`
- `RESEARCH_RAG_CONTEXT-2026-08-24.md`
- `DESIGN_MCP_INTENT_ROUTING.md`
- `DESIGN_MCP_WRITE_ROLE.md`
- `DESIGN_CONTEXT_HYGIENE.md`
- `PRIVACY.md`
- `CASE_STUDY_LEDGER.md`

### 市场/官方基线

- [Claude Code memory](https://code.claude.com/docs/en/memory)
- [Codex `AGENTS.md`](https://github.com/openai/codex/blob/main/docs/agents_md.md)
- [Gemini CLI memory](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/memory.md)
- [Gemini CLI autoMemory configuration](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md)
- [Devin Desktop / legacy Windsurf memories](https://docs.devin.ai/desktop/cascade/memories)
- [Cursor Memories](https://docs.cursor.com/en/context/memories)
- [GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory)
- [ChatGPT Projects](https://help.openai.com/en/articles/10169521-using-projects-in-chatgpt)
- [Claude Projects / Memory](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context)
- [ProjectMem](https://github.com/riponcm/projectmem)
- [Basic Memory](https://github.com/basicmachines-co/basic-memory)
- [Supermemory MCP](https://supermemory.ai/docs/supermemory-mcp/mcp)
- [Mem0 MCP](https://docs.mem0.ai/platform/mem0-mcp)
- [Graphiti / Zep](https://help.getzep.com/graphiti/getting-started/overview)
- [Letta](https://docs.letta.com/)
- [Notion MCP](https://www.notion.com/help/notion-mcp)
- [Pieces Long-Term Memory / MCP](https://docs.pieces.app/products/core-dependencies/pieces-os/quick-menu)

### 论文/标准

- [LoCoMo](https://aclanthology.org/2024.acl-long.747/)
- [LongMemEval](https://arxiv.org/abs/2410.10813)
- [LongMemEval-V2](https://arxiv.org/abs/2605.12493)
- [AgentMemoryBench](https://openreview.net/pdf?id=MSXbrNExax)
- [MemoryAgentBench](https://arxiv.org/abs/2507.05257)
- [MemBench](https://aclanthology.org/2025.findings-acl.989/)
- [CL-Bench](https://arxiv.org/abs/2606.05661)
- [MemCollab](https://arxiv.org/abs/2603.23234)
- [MemTrapBench](https://arxiv.org/abs/2608.20202)
- [Memora / FAMA](https://arxiv.org/abs/2604.20006)
- [GateMem](https://arxiv.org/abs/2606.18829)
- [LoCoMo-Plus](https://aclanthology.org/2026.acl-long.1150/)
- [Hindsight](https://aclanthology.org/2026.acl-demo.27/)
- [SteeM](https://aclanthology.org/2026.acl-long.670/)
- [Portable Agent Memory](https://arxiv.org/abs/2605.11032)
- [Agent-Memory Protocol](https://proceedings.mlr.press/v317/wu26a.html)
- [PM-Bench](https://arxiv.org/abs/2607.12385)

外部基线按 2026-08-26 冻结。正式运行时保存访问日期、页面快照、版本与 feature flags；产品变化后的结果另分 wave。
