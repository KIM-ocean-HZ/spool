# 调查报告 —— AI 回答可溯源、项目记忆与 Spool 的候选方向

> **Current pointer（2026-09-04）：** 本文件仍是只读调查/候选材料，不是执行入口；
> 当前唯一 active handoff 是 `docs/HANDOFF-2026-09-04.md`。本报告不改变其中的 Stage 0-a
> 状态、下一任务、角色边界或 owner 阻塞。

> 日期：2026-08-29
>
> 状态：**只读调查结论 / 决策候选，尚未批准施工**
>
> 研究边界：本报告讨论“如何解释一段 AI 回答依据了什么”，不把它与“项目工作指南如何长期影响未来 Agent”混为同一功能。
>
> 执行边界：本报告不改变 `docs/EXECUTION_POLICY.md`，不移动 active HANDOFF 的执行光标，不批准修改 schema、Pack、MCP 工具或实验协议。若后续决定吸收其中任何任务，必须按总执行方针进入 active HANDOFF，初始状态为 `captured`，再由 Ocean 批准。
>
> 证据日期：外部产品、标准和论文核对到 2026-08-29。厂商自报效果只作候选基线，不作为 Spool 已胜出或“市场最优”的证据。

配套文档：

- 长期顺序与授权：`docs/EXECUTION_POLICY.md`
- 项目工作指南候选设计：`docs/DESIGN_PROJECT_MEMORY.md`
- 记忆研究方法：`docs/AI_MEMORY_EXPERIMENT_PROTOCOL-2026-08-26.md`
- 当前动态执行入口：`docs/HANDOFF-2026-09-04.md`

---

## 0. 结论先行

### 0.1 当前项目记忆方案只能解决一部分问题

Project Working Guide 主要回答：

> 下一位 Agent 以后应该怎样处理这个项目？

回答可溯源主要回答：

> 这一次回答中的每个关键结论，依据了哪些当时可见的证据、工具结果和前提？

两者互补但不能互相代替。项目记忆可以减少遗忘和跨客户端分叉；如果它把未经验证的 AI 总结长期提升为事实，反而会把错误持续放大。严格可溯源需要额外维护原始证据、原子主张、主张与证据的关系、时间状态、修订关系及可观察执行记录。

### 0.2 当前没有单一“市场最优完整方案”

截至核对日，能力峰值分散在不同系统：

- Anthropic、Google、OpenAI、AWS、Cohere 提供不同粒度的回答片段与来源绑定；
- AWS、Azure 更强调查询规划、检索步骤和 activity/trace；
- Graphiti/Zep 更强调事实有效时间、失效历史与 episode provenance；
- W3C PROV、OpenTelemetry/OpenInference 更适合表达运行和数据谱系；
- 学术工作分别评估 citation correctness、completeness、source quality、argument structure 和 causal faithfulness；
- MCP 可以运输自定义结构，但没有协议原生的 claim/citation/provenance 语义。

没有一个已公开方案同时可靠覆盖：

1. 回答原子 claim/span → 多条证据；
2. 来源原文、定位、版本和快照；
3. 完整工具/检索轨迹；
4. 事实有效期和替换历史；
5. 独立支持性验证；
6. 跨客户端可移植；
7. local-first 与用户治理。

因此，Spool 值得研究的不是“再做一个 RAG”，而是一个供应商无关的：

> **Evidence Envelope + Claim Ledger + Temporal Provenance + Trace Ledger**

### 0.3 最重要的产品诚信原则

Spool 只能宣称自己真正观察到、保存过或验证过的 provenance。

对话结束后由 AI 经 MCP 写回的来源，默认最多属于：

- AI 自己声明的来源；或
- 回答后找到的佐证来源。

它们不能被显示成“模型真实思考时使用的来源”。若没有客户端 hook、执行 wrapper 或反事实实验，Spool 无法证明来源对生成具有因果贡献，也无法恢复隐藏 system/developer prompt 或模型内部 reasoning。

---

## 1. 需要严格区分的八种能力

| 能力 | 回答的问题 | 不能证明什么 |
|---|---|---|
| Citation presence | 回答有没有引用标记、链接或文件路径 | 来源是否真的支持主张 |
| Citation entailment / correctness | 引文是否支持对应主张 | 是否覆盖了所有关键主张；是否参与生成 |
| Citation completeness | 所有需要依据的主张是否都有证据 | 来源是否权威；整体论证是否成立 |
| Source quality | 来源是否直接、权威、独立、及时且版本正确 | 结论是否因果依赖该来源 |
| Argument provenance | 前提、假设、支持、反驳如何通向结论 | 隐藏 chain-of-thought 是否真实如此 |
| Tool trace | 实际调用了哪些工具、输入输出和错误 | 工具输出是否语义支持最终主张 |
| Data lineage | 原始数据经过哪些变换形成产物 | 变换和解释是否正确 |
| Temporal provenance | 信息何时发生、何时有效、何时记录和失效 | 信息本身是否真实 |

这些能力不能被压成一个含糊的“可信度分数”。产品界面和实验结果都应分别报告。

---

## 2. Spool 当前已经能追到什么

以下为代码中已存在的事实，不是候选设计。

### 2.1 Block 级来源与关系

`src/lib/db/schema.sql:116-293` 中的 block 已保存：

- `thread_id`、`source`、`seq`、`created_at`；
- `source_url`、`retrieved_at`、`recheck_after`；
- `ref_block_id` 与 `cites / corrects / supersedes`；
- `stale_at`、`corrected_quote`、`ref_note`；
- `gist`、`gist_by`、批注及来源。

这使 Spool 已具备块级来源、逐句更正、整块替换和复核日期的基础原语。

### 2.2 精确更正和人工批准

- `src-tauri/src/mcp.rs:4466-4491`、`4578-4610` 要求 `corrected_quote` 逐字出现在旧块中；
- `propose_supersede` 暂存旧块、新块、原因和引文；
- AI 不能直接批准自己的整块替换；
- Pack 能排除 stale block，并显示已有引用和更正关系。

### 2.3 Pack 和读取面已有 provenance 展示

`src-tauri/src/mcp.rs:765-817` 会在 Pack 中渲染网页来源、读取时间、复核时间、引用目标和引用理由。`get_blocks` 也会返回部分关系与来源字段。

### 2.4 App 内置执行已有最小 run 先例

`src/lib/db/schema.sql:454-489` 的 `engine_runs` 保存内置 Claude/Codex 任务的 engine、model、最终结果、token 和成本。

但代码注释同时明确：它只由 App 写，MCP 不写，也不被 Library、Pack 或 Digest 读取。因此它只是“App-owned 强捕获模式”的工程先例，不是现成回答可溯源系统。

---

## 3. 当前追不到什么，以及逻辑为什么会混乱

### 3.1 没有 answer → claim → evidence 结构

当前一个 block 可以包含多个结论，却只有一个 `ref_block_id`。真实关键回答通常由多个 block、文件、网页和工具输出共同支持，当前 schema 无法表达 N:M 证据关系，也没有 answer、claim、evidence edge 或 answer manifest 对象。

### 3.2 provenance 依赖 Agent 主动填写

`src-tauri/src/mcp.rs:6606-6665` 中，`add_block` 和 `propose_blocks` 的最小必填项只是项目和正文。URL、读取时间、引用、gist 等均可省略。

这意味着“工具提供了 provenance 字段”不等于 Agent 会填写，也不构成强保证。

### 3.3 MCP 服务端看不到完整回答过程

`src-tauri/src/mcp.rs:9401-9588` 表明 MCP 服务端处理的是 JSON-RPC method 与 params。它不能被动看到：

- 客户端最终显示的自然语言回答；
- 隐藏 system/developer prompt；
- 完整对话；
- 客户端在 Spool 之外调用的工具；
- 模型内部真实推理路径。

所以严格 Answer Receipt 必须由客户端/Agent 显式提交，或由 Spool/宿主插件拥有模型执行过程。

即使 Agent 在最终回答前提交一份草稿，若宿主不参与确认，Spool 仍不能证明它与用户最终看到的文本完全一致。

### 3.4 当前 MCP 结果仍以非结构化文本为主

`src-tauri/src/mcp.rs:6808-6810` 当前主要返回：

```json
{"content":[{"type":"text","text":"..."}],"isError":false}
```

最新 MCP 可以运输 `structuredContent`、`outputSchema`、resource links 和 trace context，但协议本身没有统一 citation/claim 类型。Spool 若采用 Evidence Envelope，需要定义应用层 schema，同时保留 text fallback；不能宣传为“MCP 原生回答溯源”。

### 3.5 URL 不是可复现证据快照

当前网页 provenance 保存 URL、读取日和复核日，但没有完整 source snapshot、页面内容 hash 或精确网页 span。

明确推论：网页后来改变、重定向或删除后，Spool 最多知道当时读过这个 URL，不能严格重建回答时看到的版本。

### 3.6 Block 引用也不是不可变证据

目标 block 可以被编辑或删除；如果原文变化，旧 `corrected_quote` 可能不再匹配。因此未来严格模式至少需要：

- 人类可读 locator；
- 内部稳定 ID；
- 当时的 exact quote；
- quote/content hash；
- mismatch 时明确显示“来源已变化”。

### 3.7 跨项目更正可在旧项目 Pack 中不可见

`src-tauri/src/mcp.rs:4520-4523` 允许跨项目引用；但 `src-tauri/src/mcp.rs:716-719` 明确说明 Pack 的 correction 集只从当前 Pack 内部推导，另一项目中的 correction 不在这里声明。

明确推论：只读取旧项目 Pack 的下一位 AI 可能继续使用已在另一项目更正的旧结论。

**2026-08-29 Ocean 结案 —— 这是刻意的，不是待修的逻辑缺口。** 让一个项目的 Pack 去认领另一个
项目里写的更正，等于把别的项目的内容搬进这份 Pack，撞项目隔离这条产品边界。`mcp.rs:716-719`
的注释逐字就是这个意思（"a correction written in another project is not claimed here"），
`assemble.ts` 的 `correctionsBySource` 同源。

⛔ 所以本节只描述现状，**不构成修复项**。要改必须先回答更大的那个问题：跨项目的内容到底能不能
进另一个项目的 Pack。在那之前，把它当 bug 修就是在拆隐私边界。

### 3.8 已批准 supersede 的理由没有完整持久化

- 临时 proposal 保存 `why`、`quote_stale`、`quote_new`：`src/lib/db/schema.sql:562-573`；
- 批准后主要写入新旧关系和 `stale_at`：`src/lib/db/blocks.ts:847-876`；
- proposal 随决定删除：`src/lib/db/supersedeProposals.ts:96-108`。

因此最终能知道“新块取代旧块”，却不能从持久记录完整恢复“用户当时基于什么理由和证据批准”。

这里应区分两件事：

- 被拒绝、过期的临时 proposal 不必变成永久垃圾日志；
- 已经生效、改变项目真值视图的决定，应有持久 decision/audit event。

### 3.9 `corrects` 和 `supersedes` 使用错误会让多代结论同时存活

代码中的真实案例注释已经记录：

- 有 AI block 在正文写“更正”，但没有设置正确的 `ref_kind`；旧结论仍被 Pack 当成 live；
- 三代内容都用了 `corrects`，而不是 `supersedes`，因此三代都保持 live。

这说明自由文本中的“更正”不是结构化状态变化，下一位 Agent 必须依赖持久关系而不是措辞猜测。

### 3.10 写回本质上是有损压缩

一次对话中的用户问题、证据、反例、工具结果、适用范围和推导，会被压成一个或几个自由文本 block。除非 Agent 主动保留结构，下一位 AI 只看到结论，无法重建当时证据集合、证据冲突、推断边界和哪些内容只是建议。

这正是“项目越来越有内容，关键问题逻辑反而越来越乱”的主要机制风险。

---

## 4. Project Working Guide 能解决与不能解决的边界

### 4.1 能改善

- 项目规则、工具经验、明确否决和适用范围长期丢失；
- scope、version、recheck 缺失；
- 不同客户端各自长出互不一致的记忆；
- AI 猜测未经用户批准成为 standing instruction；
- 旧经验被新情况替换后没有清楚状态。

### 4.2 不能独立解决

- 最终回答中的每个 claim 使用了哪些证据；
- 多个前提如何通向推断或建议；
- 完整工具调用与模型版本；
- 被引用文件、网页或 block 在回答时的版本；
- 最终回答和后续写回 block 的一一映射；
- 声明的来源是否真正参与生成。

### 4.3 两者应怎样连接

建议的数据流是：

```text
不可变 Evidence Snapshot
          │
          ▼
Answer Receipt / Claim-Evidence Graph ──────▶ 验证、争议、时间检查
          │                                      │
          │ 默认留在回答审计层                   │
          └──────── 用户批准后才提升 ────────────┘
                                  │
                                  ▼
                  Project Guide / Project Block
```

Answer Receipt 默认不能自动进入 Pack，否则容易形成来源漂白：

```text
AI 生成结论
→ AI 把自己的结论写回
→ 下一位 AI 将该 block 当项目事实
→ 同一结论因“已经在 Spool”而获得虚假权威
```

---

## 5. 当前市场与标准能力矩阵

> 表中的“最强”仅指已核实的接口形状，不代表统一 benchmark 下效果最好。

| 方案 | 已核实的强项 | Spool 可借鉴点 | 需要注意 |
|---|---|---|---|
| [Anthropic Citations](https://platform.claude.com/docs/en/build-with-claude/citations) | 输出 text block 可绑定一个或多个来源；支持 PDF 页、纯文本字符和自定义 content-block 范围；返回 `cited_text` | exact quote + source locator；允许一段回答多证据 | locator 有效不等于 entailment；只支持文本；citation 与严格 structured outputs 不兼容 |
| [Gemini Grounding Metadata](https://ai.google.dev/api/generate-content) / [Check Grounding](https://docs.cloud.google.com/generative-ai-app-builder/docs/check-grounding) | `GroundingSupport.segment` 提供回答 part、UTF-8 byte start/end；一个 span 可连多个 chunk；另有 claim 支持检查 | N:M claim-evidence；coverage 与 support 分开；中文 byte offset 必须测试 | 支持分数仍是模型判断；retrieval confidence 不是 entailment；没有事实有效区间 |
| [OpenAI Web Search](https://developers.openai.com/api/docs/guides/tools-web-search) / [File Search](https://developers.openai.com/api/docs/guides/tools-file-search) | Web citation 有回答 start/end；File citation 有 file ID；可显式 include 完整 search/file results | 区分 consulted sources 与 final cited evidence；保留 tool call ID | Web/File 粒度不同；file citation 不一定有精确源内 span；没有时态事实 |
| [AWS AgenticRetrieveStream](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-agentic-retrieve.html) / [AgentCore MCP Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-connector-managed-kb.html) | 回答 citation 有 start/end，并通过 `resultIndex[]` 指向去重结果；流式 trace 覆盖 planning、retrieval、speculative retrieval 和 full-document expansion | span→source + append-only retrieval trace；重要强基线 | 无独立 entailment verifier；无 valid interval；MCP trace 依赖客户端接收流式通知 |
| [Azure Agentic Retrieval](https://learn.microsoft.com/en-us/azure/search/agentic-retrieval-overview) | 查询拆解、子查询、来源、耗时、token、错误 activity 较完整 | 查询计划与检索失败审计 | activity 不等于 claim evidence；经 MCP 运输时可能退化为文本；部分能力为 preview |
| [Cohere Tool/Document Citations](https://docs.cohere.com/docs/tool-use-citations) | 回答 start/end 可关联多个 document/tool source | tool result 也可以成为明确来源 | 缺少统一原始源 offset、时态和独立 verifier |
| [Graphiti](https://github.com/getzep/graphiti) / Zep | 原始 episode、事实来源、`valid_at / invalid_at`、冲突失效与历史保留 | 双时态事实；失效而不删除；episode provenance | 是 memory 层，不提供完整回答 claim/span citation；时态读取路径必须有严格回归测试 |
| [MCP 2026-07-28 Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) | `structuredContent`、JSON Schema、resource link、跨客户端和 local transport | 用统一 output schema 运输 Evidence Envelope；保留 text fallback | 没有协议原生 citation/provenance 类型；服务端无法自动看到客户端外部行为 |
| [W3C PROV-O](https://www.w3.org/TR/prov-o/) | Entity / Activity / Agent，`used`、`wasGeneratedBy`、`wasDerivedFrom`、revision 等关系 | 作为导出语义和关系命名依据，不必一开始上 RDF | 表达 provenance，不验证语义支持 |
| [OpenInference](https://github.com/Arize-ai/openinference/blob/main/spec/README.md) / OpenTelemetry | LLM、AGENT、TOOL、RETRIEVER、RERANKER、EVALUATOR 等 trace span | 执行 trace 归一化与跨工具关联 | trace 说明“发生过什么”，不能冒充真实内部 reasoning 或事实验证 |

### 5.1 必须实际测试的外部强基线

若未来把回答可溯源纳入研究，至少应对以下七类做统一实测：

1. Anthropic Citations；
2. Google Grounding + Check Grounding；
3. OpenAI Responses Web Search + File Search；
4. AWS AgenticRetrieveStream + AgentCore MCP Gateway；
5. Azure Agentic Retrieval + Groundedness；
6. Cohere document/tool citations；
7. LlamaIndex CitationQueryEngine + FaithfulnessEvaluator，作为开源 prompt-citation 下限。

LangChain citation normalization、Graphiti/Zep、MCP、W3C PROV 和 OpenInference 更适合作为设计机制或消融组件，不应单独当成“完整回答可溯源产品”。

---

## 6. 学术研究给出的关键边界

### 6.1 引用正确、完整、来源好是三个问题

- [ALCE，EMNLP 2023](https://aclanthology.org/2023.emnlp-main.398/)分别评价答案质量、citation correctness/precision 和 citation completeness/recall；当时最好的系统仍有大量陈述缺少完整支持。
- [CiteEval，ACL 2025](https://aclanthology.org/2025.acl-long.1574/)不仅判断引用能否支持主张，还比较候选检索集里是否有更直接、更新或更可信的来源。
- [ALiiCE，NAACL 2025](https://aclanthology.org/2025.naacl-long.23/)把句子拆成更细的原子 claim，分别检查引用 recall、precision 和 placement。

对 Spool 的意义：一个 citation 即使“勉强相关”，如果项目里已有更新的一手代码、测试或用户决定，它仍不应获得最高来源质量。

### 6.2 事后引用不等于生成时因果来源

[Correctness is not Faithfulness in RAG Attributions](https://arxiv.org/abs/2412.18004)区分：

- citation correctness：来源事后可以支持主张；
- citation faithfulness：模型生成主张时确实因果依赖该来源。

该论文在其实验设置中发现最高约 57% 的引用呈现事后合理化迹象。它是研究证据，不应直接外推为所有模型的固定比例；但足以证明 Spool 必须把 declared/corroborative 与 generation-time/contributive provenance 分开。

### 6.3 证据优先通常比回答后补引用更可验证

- [Attribute First, then Generate，ACL 2024](https://aclanthology.org/2024.acl-long.182/)先选择证据 span，再规划句子并生成答案；
- [ReClaim，Findings NAACL 2025](https://aclanthology.org/2025.findings-naacl.55/)在生成过程中交替输出来源和句子级 claim；
- [LongCite，Findings ACL 2025](https://aclanthology.org/2025.findings-acl.264/)研究长上下文中的细粒度句子引用。

对 Spool 的意义：严格模式应优先“先取证、再回答、生成时绑定”，而不是在自由回答结束后再让另一个步骤猜引用。

### 6.4 Claim graph 不能代替 argument graph

[ReportLogic，ACL 2026](https://aclanthology.org/2026.acl-long.384/)将报告逻辑区分为整体主线、论述推进和 claim-support 结构。每个 claim 有引用，并不保证前提充分、推导有效或结论没有越界。

因此对 inference/recommendation，Spool 除证据边外还要允许：

- 明示前提；
- 假设；
- 反证或冲突证据；
- 推导规则的可见摘要；
- 未解决缺口。

这不是保存隐藏 chain-of-thought，而是保存用户可审计的 argument skeleton。

### 6.5 自动 verifier 不能成为唯一事实裁判

[AttributionBench，Findings ACL 2024](https://aclanthology.org/2024.findings-acl.886/)显示自动 attribution evaluator 仍有显著错误。LLM/NLI judge 会受到措辞、篇幅和自身偏好的影响。

所以未来的校验层应区分：

- locator/hash/exact quote：可以确定性硬校验；
- entailment/contradiction/coverage：只作 score、warning 或待人工审核；
- 高风险结论：需要盲化人工复核或可执行 verifier。

---

## 7. 推荐的供应商无关 Evidence Envelope

以下是候选信息模型，不是已批准 schema。

### 7.1 `answer_artifact`

```text
answer_id
project/thread
immutable_answer_text 或 content_hash
client/model/API/schema version（仅保存可观察部分）
pack_snapshot_hash
visible_instruction_hash
started_at / finished_at
provenance_capture_mode
```

### 7.2 `claim`

```text
claim_id
answer_id
claim_text
answer_start / answer_end
offset_encoding
type = fact | user_decision | requirement | inference |
       hypothesis | recommendation | abstention
scope
status = asserted | located | supported | disputed |
         approved | superseded | retracted
valid_from / valid_to
recorded_at / last_verified_at
```

回答 span 建议内部统一使用 UTF-8 byte offsets，同时保留 provider-native encoding。中文必须专门测试 UTF-8 byte、Unicode code point 和 JavaScript UTF-16 转换，否则会制造假的 span mismatch。

### 7.3 `evidence_snapshot`

```text
evidence_id
source_kind = user_turn | user_decision | spool_block | file |
              code | test | web | tool_result | prior_claim |
              guide_item | ai_observation
stable_source_id / URI / project#seq / file@commit
exact_quote
page / block / line / char / byte locator
snapshot / content_hash / commit
published_at / observed_at / retrieved_at / recorded_at
access_scope / privacy_class
provider_raw
```

原始证据是 store of record。摘要、gist 和 AI block 不能替代原始证据。

### 7.4 `claim_evidence`

```text
claim_id
evidence_id
relation = supports | refutes | contradicts | derived_from |
           assumption | context | implemented_by | verified_by
provenance_mode
locator_status
verifier_status
human_status
```

必须允许一条 claim 多证据，也允许一条证据支持多个 claim。

### 7.5 `trace_event`

```text
trace_id / parent_id / tool_call_id
event_kind = model | agent | tool | retriever | reranker |
             evaluator | transform
sanitized input metadata
result hash / evidence IDs
started_at / finished_at
tokens / cost / errors
tool/model/schema version
```

默认只保存必要 metadata。完整 prompt、工具参数和输出可能包含项目代码、隐私或密钥；内容捕获必须本地、可选、可脱敏并遵守保留和删除策略。

### 7.6 `decision_audit_event`

```text
event_id
subject claim/item/block
action = approve | dispute | correct | supersede | retire | retract
rationale
evidence_ids
actor
created_at
previous_state / new_state
```

这能持久保存已经改变项目状态的决定，同时不要求永久保存所有被拒绝的临时 proposal。

---

## 8. Provenance 强度分级

建议不要显示一个笼统的“已溯源”，而使用可审计等级：

| 级别 | 含义 | Spool 能否独立证明 |
|---|---|---|
| `declared` | AI 声称使用了该来源 | 能证明 AI 提交过该声明，不能证明来源参与生成 |
| `corroborative` | 回答后找到的内容能佐证主张 | 可验证支持关系，不能证明生成时因果依赖 |
| `generation_time` | 证据确实在生成请求或 retrieval context 中 | 需要客户端/runner 提供可验证 manifest |
| `contributive` | 执行结构或反事实实验支持来源对输出有实际贡献 | 普通 MCP 模式不能；研究或受控 runner 才可能近似 |
| `human_verified` | 人工审核了 claim、证据、范围和时间 | 能证明审核事件，不能让错误的人类判断自动变真 |

同一 claim 可以同时有多个标签，例如 `generation_time + human_verified`。这些标签描述证据边界，不是正确率分数。

---

## 9. 两种产品运行模式

### 9.1 Best-effort MCP 模式

适用于 Claude Code、Codex、Gemini CLI、Cursor 等 Spool 无法控制的客户端：

1. `get_evidence_bundle` 返回结构化证据及稳定 handles；
2. Agent 在回答前或回答后显式调用 `propose_answer_receipt`；
3. Receipt 标为 `declared`，若证据来自该次 bundle，可另标 `generation_time-visible-to-Spool-tool`；
4. Spool 做 locator/hash/权限校验；
5. 不声称掌握客户端外部工具或最终渲染回答。

这里的工具名只是候选，不授权增加 MCP surface。

### 9.2 Strong capture 模式

只适用于 Spool 内置 runner、宿主插件或有正式 hook 的客户端：

- 捕获最终 answer artifact；
- 捕获可观察模型/API 版本；
- 关联 retrieval/tool trace；
- 固定 Pack/evidence snapshot hash；
- 由宿主确认提交文本与用户看到的最终文本一致；
- 运行确定性检查和可选 verifier。

现有 `engine_runs` 可以作为这一路线的工程先例，但需要新的 claim/evidence/trace 关系，不能直接当答案。

---

## 10. 最小产品顺序候选

这些都是以后需要进入 HANDOFF 并由 Ocean 批准的候选，不改变当前 R1 → E-core → F1 顺序。

### Candidate A：先修现有逻辑完整性

- 让跨项目 correction/supersession 对被引用项目可见；
- 持久保存已经批准的 supersede 理由和证据；
- 补齐 `get_blocks` 遗漏的 provenance 字段；
- 明确 `corrects` 与 `supersedes` 的选择规则和回归测试。

这部分解决已存在的状态一致性问题，但仍不是完整 Answer Provenance。

### Candidate B：无 schema 的 Answer Receipt 实验

让 Agent 在合成、隔离任务中输出固定 JSON：

- 最终答案；
- 原子 claims；
- exact evidence quotes/IDs；
- supports/contradicts/assumption；
- 不确定项和 abstention；
- 可见工具调用关联。

先测模型是否稳定生成可校验结构，避免直接为一个未经验证的行为修改 schema。

### Candidate C：最小 Evidence Envelope

首版只追求：

- 精确 answer span；
- N:M 多来源；
- quote + locator + hash；
- source changed / stale / contradiction 状态；
- `structuredContent` + text fallback；
- 简单可展开的“为什么”界面。

不在首版做完整 graph、自动长期记忆、因果 attribution 或全量 tool replay。

### Candidate D：验证和时间层

- locator/hash 硬校验；
- entailment/coverage/contradiction 软校验；
- `valid_from / valid_to / observed_at / recorded_at`；
- claim 更新后重新验证下游依赖闭包；
- 未变化 claim 保持稳定 ID。

### Candidate E：研究级因果归因

Leave-one-source-out、evidence perturbation、irrelevant distractor 等测试只用于研究或关键决策模式。其成本和延迟不适合作为普通交互默认能力。

---

## 11. 如何扩展现有实验协议

本节只是 protocol amendment candidate。不得直接修改已冻结或待冻结的主要假设、条件 ID 和统计方案。

### 11.1 建议新增一条 Answer Provenance 子研究

为避免与现有 C0–C11 冲突，使用 `AP` 编号：

| 条件 | 说明 |
|---|---|
| AP0 | 当前 Pack + 普通 MCP 写回 |
| AP1 | Pack + governed Project Working Guide |
| AP2 | Pack + claim/evidence Answer Receipt |
| AP3 | AP2 + locator/hash 与独立 entailment/coverage 检查 |
| AP4 | AP3 + temporal supersession 与 dependency regression |
| AP5 | AP4 + 离线反事实/因果 attribution；仅研究 |

Project Working Guide 与 Answer Receipt 必须分别消融，不能把收益全部归因于“更多结构化文本”。

### 11.2 必须覆盖的失败模式

- claim 正确但引用错误；
- 来源相关但不支持具体 claim；
- 来源支持 claim，但低质量、过时或版本错误；
- 存在一手来源却引用 AI 摘要；
- 关键 claim 完全无证据；
- citation stuffing；
- AI 先回答、后寻找相似内容作来源；
- 多来源冲突未显示；
- 旧状态覆盖新状态；
- point-in-time 查询看到未来信息；
- 不同项目/scope 的事实互相失效；
- URL 可访问但内容已经改变；
- 同一路径文件被覆盖后 locator 仍冒充旧证据；
- 工具调用存在但未进入 claim 支持链；
- 多轮修改修复新问题却破坏既有结论；
- verifier 被流畅度、篇幅或自身偏好欺骗。

### 11.3 指标必须分层报告

引用和证据：

- claim citation precision；
- claim coverage / citation recall；
- exact quote correctness；
- locator resolvability；
- source-span exact match / IoU；
- 多来源证据完整率；
- source-quality facets 与 best-source regret。

逻辑和时间：

- unsupported conclusion rate；
- valid support-edge rate；
- contradiction surfaced rate；
- premise coverage；
- revision logical regression rate；
- stale claim use；
- future leakage；
- supersession-chain completeness；
- cross-project/cross-scope invalidation accuracy。

执行和跨生态：

- observed tool-span coverage；
- claim-to-tool-output linkage；
- trace completeness/replayability；
- raw-source reachability；
- source hash/version resolution；
- MCP 跨客户端 citation/trace 字段存活率。

人因和成本：

- time-to-verify / time-to-correct；
- unsupported claim detection；
- calibrated reliance；
- approval burden；
- latency、token、调用成本；
- 本地数据外发量与 secret exposure。

### 11.4 评分纪律

- deterministic locator/hash 检查优先；
- 关键 harmful/unsupported claim 做盲化人工复核；
- 不让同一个模型既生成、又作为唯一 judge；
- 公开 verifier prompt、模型/版本和系统偏差；
- 失败运行、无引用、解析失败和客户端未装载必须保留，不能只分析成功样本；
- 统一中文 offset 编码和转换测试。

---

## 12. 产品与 UI 需要注意的风险

### 12.1 精确 locator 不等于语义支持

一个引用可以精确落在原文上，却仍然只与问题相关、没有蕴含 claim。UI 不应只用绿色链接暗示“已证明”。

### 12.2 来源可以漂白 AI 记忆

“来源是另一个 AI block”与“来源是当前 commit 的代码和测试”权威不同。必须保留 source kind 和完整 derivation，不能让 AI 摘要冒充一手证据。

### 12.3 冲突证据不能被压平

同一 claim 可能同时有 supports 和 contradicts。系统应展示争议与适用范围，不让模型自动选择一边后覆盖另一边。

### 12.4 权限必须沿证据链传播

Evidence Snapshot 应继承文件的 AI-read、export、project scope 和隐私权限。工具参数、网页 token、代码 secret 和私有对话需要脱敏或不捕获。

### 12.5 外部证据是数据，不是指令

网页、附件和 tool output 中的 prompt injection 不能因被保存成 evidence 而获得 standing-instruction 权威。

### 12.6 引用 UI 会增加认知负担

默认界面建议逐层展开：

1. 总览：覆盖、争议、过期；
2. claim 列表；
3. exact evidence span；
4. 完整来源、论证链和运行记录。

普通问题不必强制展示完整 trace；关键决策可进入 strict mode。

### 12.7 图不是第一步

先建立可靠稳定的关系与审计事件，再做 graph。否则 graph 只会把不可靠关系画得更复杂。首个 UI 可以是简单 drawer/table，而不是大规模知识图。

---

## 13. 学术机会

只给 memory 加 citation，学术新意有限。更有潜力的问题是：

> 在 AI 客户端彼此不透明、只能通过 MCP 有限写回的条件下，如何建立诚实标注证据边界、支持时间更新、逻辑回归检测和跨生态重验证的长期项目记忆？

可能的贡献组合：

1. source agent → target agent 的跨生态 Answer Receipt 迁移矩阵；
2. declared / corroborative / generation-time / contributive provenance 分级；
3. claim-level evidence 与 temporal supersession 同时建模；
4. 多轮更新后的 dependency regression benchmark；
5. MCP writeback-only 条件下可观察与不可观察边界；
6. benchmark、供应商无关 schema、方法和纵向人因研究。

论文必须与产品胜负解耦：即使 FullText、原生 provider citation 或外部系统在某些画像更优，边界结果仍有学术和产品价值。

---

## 14. 商业机会与克制

若研究成立，Spool 的差异不应表述为“AI 记得更多”，而可以是：

> **跨生态、可更新、诚实标注证据边界的项目知识与回答审计层。**

潜在价值：

- 下一位 AI 不只是继承结论，还能重新核对原始依据；
- 用户能看见哪条是事实、推断、建议或未验证假设；
- 旧结论被替换时保留理由和历史；
- 同一份证据关系可跨不同 AI 客户端运输；
- local-first 与人工批准形成区别于云端 memory service 的信任基础。

但在统一实验完成前，不可对外声称：

- 市场最优；
- 完全防止幻觉或 memory trap；
- 能恢复模型真实思考；
- 原生支持所有客户端；
- 引用存在就等于事实正确；
- preprint、pilot、dogfood 或厂商成绩证明 Spool 胜出。

---

## 15. 开工前必须客观审计的候选决策

下一位 Agent 不应直接接受本报告的建议。施工前应逐项核对：

| ID | 候选决策 | 当前状态 | 必须回答的问题 |
|---|---|---|---|
| AP-D1 | Project Working Guide 与 Answer Provenance 分层 | 候选架构判断 | 是否有真实用户任务要求两者共同存在？能否用更小模型解决？ |
| AP-D2 | 新建独立 Claim/Provenance Ledger | 未批准 schema | 现有 block/ref 结构能否先通过无代码实验满足？迁移和备份代价多大？ |
| AP-D3 | Answer Receipt 默认不进入 Pack | 候选治理原则 | 是否能防来源漂白，同时仍让下一个 Agent便宜地找到结果？ |
| AP-D4 | exact quote + locator + snapshot/hash | 候选证据模型 | 文件、网页、block 各自需要保存多少；隐私和存储代价如何？ |
| AP-D5 | N:M claim-evidence 与 conflict edge | 候选关系模型 | 原子 claim 的稳定拆分和多轮修改如何实现？ |
| AP-D6 | declared/corroborative/generation-time/contributive 分级 | 候选产品语义 | 用户是否理解；客户端可观察性如何实测？ |
| AP-D7 | Best-effort MCP 与 strong capture 两种模式 | 候选系统边界 | 哪些客户端能提供 hook；显式提交是否可靠；Spool 是否应拥有 runner？ |
| AP-D8 | verifier 只作辅助，不自动批准 | 候选安全原则 | 哪些 deterministic checks 可硬 gate；哪些需人工？ |
| AP-D9 | 跨项目 correction 与批准理由持久化优先 | 候选产品修复 | 是否构成当前 bug、数据迁移要求和现有 UI 影响是什么？ |
| AP-D10 | 扩展实验协议为 Answer Provenance 子研究 | 未批准研究扩张 | 是否应在 E-core 后单独排期；功效、成本和论文新意是否足够？ |
| AP-D11 | “跨生态回答审计层”作为未来定位 | 未解锁营销候选 | 只有哪些实验证据达到后才能对外使用？ |

评估结果应明确分为：`accept / modify / reject / defer / insufficient-evidence`。任何 Agent 的评估都不能自行把候选升级为 active。

---

## 16. 本报告的最终建议

1. 保留 Project Working Guide 作为“未来工作治理层”，不要让它承担回答证据职责。
2. 在任何 schema 设计前，先做结构化 Answer Receipt 的隔离实验。
3. 若实验显示 claim/evidence 结构稳定且能显著降低审核与逻辑回退，再考虑独立 Provenance Ledger。
4. 第一版目标是 exact evidence、N:M 关系、时间状态和诚实来源等级，不追求完整因果归因。
5. 当前已存在的跨项目 correction 可见性与 supersede 理由丢失，应单独核定是否作为产品一致性修复进入 HANDOFF；不能借此直接开启完整 provenance 工程。
6. 研究协议如要吸收本报告，只能通过正式 amendment/冻结流程；不能在 E-core 中途扩大共同主要终点。
7. 商业表达必须等统一、可复现、跨客户端实验后再解锁。

最小、可证伪的下一步不是改库，而是：

> 用固定 Answer Receipt JSON 在隔离任务中比较“当前写回”和“claim + exact evidence 写回”，验证结构可生成、可校验、可跨客户端保留，并测它是否真的减少关键结论混乱。

这仍然只是研究候选；当前施工光标继续由 active HANDOFF 决定。

---

## 17. 参考资料

### Spool 本地事实

- `src/lib/db/schema.sql`
- `src/lib/db/blocks.ts`
- `src/lib/db/supersedeProposals.ts`
- `src-tauri/src/mcp.rs`
- `docs/DESIGN_PROJECT_MEMORY.md`
- `docs/AI_MEMORY_EXPERIMENT_PROTOCOL-2026-08-26.md`
- `docs/RESEARCH_RAG_CONTEXT-2026-08-24.md`
- `docs/EXECUTION_POLICY.md`
- `docs/HANDOFF-2026-09-04.md`
- `docs/archive/HANDOFF-NEXT-2026-08-26.md`（历史入口，已归档）

### 官方产品与标准

- [Anthropic Citations](https://platform.claude.com/docs/en/build-with-claude/citations)
- [Google Gemini GenerateContent / grounding metadata](https://ai.google.dev/api/generate-content)
- [Google Check Grounding](https://docs.cloud.google.com/generative-ai-app-builder/docs/check-grounding)
- [OpenAI Web Search](https://developers.openai.com/api/docs/guides/tools-web-search)
- [OpenAI File Search](https://developers.openai.com/api/docs/guides/tools-file-search)
- [AWS AgenticRetrieveStream](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-agentic-retrieve.html)
- [AWS AgentCore Managed KB MCP Gateway](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-connector-managed-kb.html)
- [Azure Agentic Retrieval](https://learn.microsoft.com/en-us/azure/search/agentic-retrieval-overview)
- [Cohere Tool Use Citations](https://docs.cohere.com/docs/tool-use-citations)
- [MCP Tools specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [W3C PROV-O](https://www.w3.org/TR/prov-o/)
- [OpenInference specification](https://github.com/Arize-ai/openinference/blob/main/spec/README.md)
- [Graphiti](https://github.com/getzep/graphiti)

### 学术研究

- [ALCE，EMNLP 2023](https://aclanthology.org/2023.emnlp-main.398/)
- [Measuring Attribution in Natural Language Generation Models，Computational Linguistics 2023](https://arxiv.org/abs/2112.12870)
- [Attribute First, then Generate，ACL 2024](https://aclanthology.org/2024.acl-long.182/)
- [AttributionBench，Findings ACL 2024](https://aclanthology.org/2024.findings-acl.886/)
- [Correctness is not Faithfulness in RAG Attributions，2024 preprint](https://arxiv.org/abs/2412.18004)
- [ALiiCE，NAACL 2025](https://aclanthology.org/2025.naacl-long.23/)
- [ReClaim，Findings NAACL 2025](https://aclanthology.org/2025.findings-naacl.55/)
- [CiteEval，ACL 2025](https://aclanthology.org/2025.acl-long.1574/)
- [LongCite，Findings ACL 2025](https://aclanthology.org/2025.findings-acl.264/)
- [ReportLogic，ACL 2026](https://aclanthology.org/2026.acl-long.384/)
