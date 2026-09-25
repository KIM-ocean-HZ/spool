# Claude Code 任务书 —— Stage 0-a development wave2 · GR10 remaining machine-observable schema-surface eligibility audit

> **状态：COMPLETE — verdict `Accept`（2026-09-11，Europe/London）。**
>
> **验收提交：** `2231eb6674db23c4ce4fb7f4e63acd2113a620c4`；唯一 parent 为 accepted GR9
> `48b9f720958fc409419d7c823c607192f6c57925`。
>
> **后续任务书：** 无。GR10 授权已用尽；当前返回
> `docs/CODEX-HANDOFF-STAGE0A-D2-REVIEW-2026-09-03.md` 的 owner decision 光标，不自动创建 GR11。
>
> **唯一交付：** 对 accepted MU verifier 的返回 schema 做一次 development-only、零费用、无效果检验的
> 资格审计：从钉死 source AST 与同一 196 行 runtime key/type shape 独立重建完整字段面，按本任务在任何
> runtime value 产生前写死的 grammar，把每个 primitive 唯一归入“GR9 已表示 / 确定性别名或常量 /
> 禁止面 / 结构上合格但尚未检验”四类，并证明没有漏项或未分类项。
>
> **这不是 k8、selector hypothesis 或 candidate。** 不读取 gold label，不计算字段值、频率、support、
> class、collision、gate 或与配置/arm/outcome 的关系；不排序、不挑选、不推荐任何合格 primitive。若审计
> 留下合格项，只能返回 owner，由后续单独授权决定是否预注册其中一个假设。
>
> **授权来源：** owner 于 2026-09-11 在 GR9 `Accept`、归档并返回 owner decision 后明确“下发下一任务”。
> Codex 将其收敛为本 pre-hypothesis schema audit；不开放正文探索、gold efficacy、新字段创造、字段组合、
> k8、selector/candidate、matcher/threshold、dataset 扩展、样本外、hidden、模型/API、费用、正式运行、
> promotion、freeze、G0、远端操作或 GR10 之后的任务。

## 1. 为什么是这一项

GR9 已证明：GR8 固定字段集内，把六个 bucketed list counts 换成 exact counts 仍没有切分任何 class；
34 个 class 全部不变，16 个 target 格的 collision 仍恒为 42，Layer A / B 都是 `0/16`。因此继续在同一
exact tuple 上换 bucket、cap 或 threshold 已被单调性证书排除。

下一步若直接从 verifier 里挑一个新字段并看 gold，会把“字段是否有资格”“字段是否有效”“按结果选择
哪个字段”和“是否创建 routing hypothesis”混成一次事后搜索。本任务先完成更窄的一件事：把 accepted
MU verdict schema 的剩余机器结构面穷尽登记，并在不看效果的前提下证明哪些 primitive 至少满足以后
单独预注册的结构资格。它不回答任何 primitive 是否能修 G1–G4。

## 2. 唯一问题、完成定义与非目标

### 2.1 唯一问题

在 §4 的 frozen eligibility grammar 下，accepted MU verdict schema 是否还存在 GR9 未表示、同时又不依赖
identity、正文、list element、自由文本、gold label、arm、配置或外部状态的 content-blind primitive？

审计只允许回答：

1. 完整 schema surface 是什么；
2. 每个 primitive 属于哪一个固定类别，理由码是什么；
3. `structurally_eligible_untested` 集合是否为空；
4. source AST inventory 与 196 行 runtime key/type shape 是否闭合。

### 2.2 完成定义

analyzer 与 independent validator 必须各自从钉死 source objects 重建：

- MU module 的 `_verdict`、`score_episode` overlay 与 `check_trace` 返回 schema；
- base / enriched 两种顶层 keyset、`trace` 的固定一层 mapping schema及禁止展开的 list-element subtrees；
- §4 的 primitive universe、固定分类表与 completeness partition；
- 同一 196 行只读 runtime shape confirmation；
- canonical JSON / REPORT 与五产物闭包。

两套 canonical JSON / REPORT 必须逐字节相同；真实负测必须拒绝漏 key、漏 nested path、值驱动分类、
越界 primitive、伪造分类、泄漏与普通 REPORT 事实漂移。三条目标命令全绿、唯一 commit 提交后立即返回
owner decision。

### 2.3 非目标

本任务不做：

- 读取或使用 U1 gold、M1 label、`gold_pass`、target membership、GR7 的 16 格或任何 gate efficacy；
- 保存或比较任一 verdict scalar/list value，计算 value frequency/cardinality/support/class/collision；
- 按 arm、configuration、mask、outcome、pass/fail 或 row 做切片、排序、相关性或交叉表；
- 提出 k8 / selector hypothesis、选择字段、组合字段、构造 signature、运行 closure/gate 或创建 candidate；
- 人工打开、打印、引用或 paraphrase answer / episode / trace / rubric / wrong-action 正文或 list element；
- 修改 accepted verifier、matcher、routing、threshold、gold、rubric、runner、freeze 或任何 accepted artifact；
- validation / out-of-sample / hidden / G0、模型调用、费用、promotion、freeze、正式执行或远端操作。

## 3. 必须穷尽的 schema surface

### 3.1 顶层 keyset

两套实现必须从 source AST 独立证明顶层 union 恰为以下 21 个 literal keys；不得把本清单当作 runtime
枚举的替代，source 少一项、多一项、动态 key 或类型不闭合都失败：

```text
episode_id
outcome
pass
adverse
needs_review
review_reason
mandatory_blind_review
rubric_schema_complete
components
components_required_hit
components_required_missed
components_optional_hit
partial_credit
wrong_actions_hit
blocking_wrong_actions
fabrication_suspected
trace
why
verifier_version
diagnostic_component_evidence
suppressed_wrong_actions
```

`_verdict` base keyset 恰 18 项；normal-score enriched keyset 只新增末三项。keyset variant 本身作为
`schema_variant` 登记，不以 row count、outcome 或答案内容定义。任何 computed key、`dict.update(**x)`、
条件性未知 key 或第三种 keyset 都硬失败，不允许现场扩表。

### 3.2 `trace` 固定 mapping

`trace` 为唯一允许展开一层的 dict-valued verdict field。其 direct-key union 必须从 `check_trace` source
独立证明恰为：

```text
required_calls
satisfied
missing
wrong_param_calls
invalid_tool_calls
calls_made
failure_paths_fired
ok
```

`components`、`wrong_actions_hit`、`suppressed_wrong_actions` 等 list-valued fields 的 element schema 不进入
primitive universe；必须以 `path[*] = forbidden_subtree` 整体登记。不得以“元素里有 bool/int”为由下钻，
也不得枚举、hash、比较、计 distinct 或读取任一 element。

### 3.3 Runtime shape confirmation

只允许把钉死的 196 行按 accepted MU scorer 的原有接口逐行传入；audit code 对输入只可做既有 loader 所需
的 SHA、类型和一一连接，不得读取内容用于分类。accepted scorer 可以按其冻结逻辑消费 answer、episode、
trace 与 `carries_memory`；audit code 只可观察返回对象的：

- exact key names；
- exact Python type identity（`bool` 不得当 `int`）；
- `None` / mapping / list 这种 schema shape；
- list-element subtree 是否被完整拒绝访问。

不得保存、比较、分桶、打印或按条件使用任何实际 bool、enum、integer、float、string、list length 或元素值。
不得发布 base/enriched 各有多少行，只可发布 `rows_shape_checked=196`、两种 source-declared variants 均被
runtime shape 覆盖以及 `unknown_key_count=0` / `unclassified_primitive_count=0`。

## 4. Frozen eligibility grammar 与唯一分类

### 4.1 Primitive universe

只有以下五种定义形态可成为 primitive；grammar 在任何 runtime verdict 产生前锁死：

```text
direct_bool(path)
source_closed_enum(path)
dict_presence_state(path)        # only None vs dict; never string presence
exact_nonnegative_integer(path)  # bool/float/string rejected
exact_list_length(path)          # list container only; never reads elements
```

另登记 `schema_variant`，但它已被 GR9 的 `schema_shape` 表示。禁止 direct string、float、dict content、
list element、string length、distinct、sum、hash、ordering、truthy/falsy、fallback default、dynamic path、
derived threshold/bucket、跨字段交互或任何 data-dependent transform。

为闭合完整 schema，每个 source path 必须生成一个或多个 canonical audit entries：符合上面五种形态的
才是 primitive；不符合的 direct value / container / element subtree 必须生成 `prohibited` marker。下面
四分类作用于全部 canonical audit entries；`prohibited` marker 不是可供后续检验的 primitive。

### 4.2 四个互斥类别

每个 canonical audit entry 必须恰落入一个类别：

1. `represented_by_gr9`：与 GR9 一个固定 slot / opening state 相同；
2. `deterministic_alias_or_constant`：由 GR9 已表示 primitive 确定，或在钉死 source 的全部合法分支为常量；
3. `prohibited_source_or_value_kind`：来自 identity / episode-only requirement capacity / prose / element subtree，
   或 value kind 不在 §4.1；
4. `structurally_eligible_untested`：固定机器输出、content-blind、非 identity、非 prose/element、非既有 slot 的
   exact bool/enum/presence/count，且本任务不检验其效果。

四类必须构成 disjoint exhaustive partition；unknown / undecided / multiple classification 一律失败。

### 4.3 预注册分类表

以下映射在 runtime shape 检查前固定，执行者不得根据观察值、频率、support、gold、gate 或“看起来有用”
改动。若钉死 source 不能证明对应 type / dependency contract，任务必须报 drift 并停止，不得现场重分类。

`represented_by_gr9`：

```text
schema_variant
outcome
pass
adverse
mandatory_blind_review
rubric_schema_complete
fabrication_suspected
dict_presence_state(trace)
trace.ok
len(components_required_hit)
len(components_required_missed)
len(components_optional_hit)
len(diagnostic_component_evidence)
len(wrong_actions_hit)
len(blocking_wrong_actions)
```

`deterministic_alias_or_constant`：

```text
needs_review                    # accepted k1..k6 openings 的 OR；k7 是外加 hypothesis，不改原字段
verifier_version                # accepted source constant / instrument identity
```

`prohibited_source_or_value_kind`：

```text
episode_id                      # identity
why                             # free prose
review_reason                   # free prose；string presence 也不在 grammar
partial_credit                  # float 不在 grammar，且由 required-hit/missed counts 的固定公式导出
len(components)                 # episode rubric capacity，不是答题行为证据
trace.required_calls            # episode gold-action requirement capacity
components[*]
components_required_hit[*]
components_required_missed[*]
components_optional_hit[*]
diagnostic_component_evidence[*]
wrong_actions_hit[*]
blocking_wrong_actions[*]
suppressed_wrong_actions[*]
trace.satisfied[*]
trace.missing[*]
trace.wrong_param_calls[*]
trace.invalid_tool_calls[*]
trace.failure_paths_fired[*]
```

其中 list container 仍可按下面的固定 count primitive 另行分类；禁止的是 element subtree，不得把二者混同。

`structurally_eligible_untested` 的 canonical set 在 source/type contract 闭合时恰为：

```text
len(suppressed_wrong_actions)
len(trace.satisfied)
len(trace.missing)
len(trace.wrong_param_calls)
len(trace.invalid_tool_calls)
trace.calls_made
len(trace.failure_paths_fired)
```

这七项只是资格注册表，不是七个候选、不是 field sweep，也不授权下一轮全测。不得输出它们的实际值、
频率、support 或任何 efficacy 顺序。

## 5. Completeness 与 non-selection 证书

两套实现必须独立证明：

- source-declared 顶层 union 恰 21 keys，base 18、enriched 21；`trace` 恰 8 direct keys；
- 每个 direct path 的 source value kind 与 runtime type shape 一致；bool/int 严格分离；
- §4.1 对每个 path 生成的 canonical audit entry 数量固定，无重复 alias / prohibited marker；
- 四类 pairwise disjoint，union 等于完整 audit-entry universe，unknown / unclassified 均为 0；
- 七项 eligible set 只由 frozen table 与 type/dependency contract产生，不读取 runtime values；
- no-gold import/read gate：不得打开 U1/M1/D1/D2/GR7/GR8/GR9 JSON 或 report 取得 label/target/anchor；
- no-selection gate：没有 score、rank、winner、best、promising、recommended、candidate、k8 或组合；
- no-efficacy gate：没有 per-field frequency/cardinality/support/class/collision/gate/arm/config/outcome table；
- no-leak gate：没有 row/run/episode/blind id、answer、trace/episode正文、list element、实际值、绝对路径或 hidden。

允许发布的数字只限 schema/闭包本身：21、18、8、196、四分类的 primitive 数量、eligible 7、unknown 0、
unclassified 0，以及输入/object/checksum 数。不得发布七项各自的 observed nonzero count 或 type 以外统计。

## 6. 起点、branch、worktree 与提交拓扑

- scientific parent：accepted GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- branch：`stage0a-wave2-remaining-machine-observable-schema-surface-audit-gr10`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-remaining-machine-observable-schema-surface-audit-gr10`
- 2026-09-11 已核：branch 与 worktree 均不存在。执行时若任一已存在，立即停止；不删、不覆盖、不复用。
- 最终恰一笔 commit，唯一 parent 为 GR9；所有 Redo commits 与 accepted siblings 均不得额外进入 ancestry。
- 不从 sibling worktree 读文件，不用浮动 ref；MU source 只按 full `commit:path` 读取 git object。

三条目标命令全绿后只提交一次，message 必须为：

```text
posthoc(stage0a): audit remaining machine-observable schema surface (GR10)
```

不得 merge、tag、push、fetch 或 pull。

## 7. 唯一允许的 changed paths

相对 GR9 必须恰六个新增路径、0 个已有文件修改：

```text
harness/verify_remaining_machine_observable_schema_surface_audit_wave2.py
posthoc/stage0a-development-wave2-remaining-machine-observable-schema-surface-audit/analyze_remaining_machine_observable_schema_surface_audit_wave2.py
posthoc/stage0a-development-wave2-remaining-machine-observable-schema-surface-audit/test_remaining_machine_observable_schema_surface_audit_wave2.py
posthoc/stage0a-development-wave2-remaining-machine-observable-schema-surface-audit/REMAINING-MACHINE-OBSERVABLE-SCHEMA-SURFACE-AUDIT-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-remaining-machine-observable-schema-surface-audit/REMAINING-MACHINE-OBSERVABLE-SCHEMA-SURFACE-AUDIT-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-remaining-machine-observable-schema-surface-audit/CHECKSUMS-REMAINING-MACHINE-OBSERVABLE-SCHEMA-SURFACE-AUDIT-stage0a-development-wave2.sha256
```

posthoc 目录必须恰五项；CHECKSUMS 只登记 analyzer、test、JSON、REPORT 四项且不自列。不得创建 field
value table、runtime dump、candidate file、formula lock、第七件产物或仓内临时文件。

## 8. 输入与 accepted-object 闭包

### 8.1 只允许的 runtime/source inputs

analyzer 与 validator 各自钉死并核验：

| path / object | SHA-256 |
|---|---|
| `raw/stage0a-smoke-20260902T220738/rows.jsonl` | `aef035ea32e090511f09cb522fbb9179b0ab284e36afd9bc58bd307e19237b24` |
| `raw/stage0a-smoke-20260902T220738/CHECKSUMS.sha256` | `ffc296bbcd1d342b67c752c2283b4a41b9b871cf0c79d8fd9f1ef349ea855ea6` |
| `items/stage0a/episodes-development.json` | `87e5c48e4b63d9f61a77c1f5831ee424c817fba2c45e1a444b33f5776bee76a5` |
| `harness/verify_stage0a_v120.py` | `351014ba7ab87696d400e735ce086257c49195a9394dc9892601468bee48ec1f` |
| `harness/verify_stage0a.py` | `ce014e0850efc23617387ad01b3154d091abb3a5dfc9d7ccd40671f0b56c7dce` |
| `harness/verify2.py` | `3730216e7834c5465751f7b6b90dfeb2ec119a5b40a54616c495c67492cfdab6` |
| `protocol/HASHES-stage0a-verifier-v1.20.json` | `18166e09e5d93f73be26f6efb06a51fb0c940230ba26e80142802a6417011e76` |
| `fae90ecfeed723748b80566b94d473cf25e45d0c:harness/verify_stage0a_v120_wrong_action_matcher_gr2b.py` | `a9d6fcaad174b43a2555c72daf449769183d2902a1827e5be40ba3058862bd65` |

run CHECKSUMS 中 196 个 trace 必须按 rows 的既有安全 run-id loader 一一构造并核 SHA；禁止 glob/scandir
整个 raw tree。run id / episode id 只可在 loader 内存中完成连接，不得进入分类或产物。不得打开 U1 gold、
M1 label、D1/D2/GR7/GR8/GR9 result JSON/REPORT；GR9 六对象只做 object SHA closure。

### 8.2 GR9 六对象

必须从 parent commit 与工作树两侧各自核 SHA：

| path | SHA-256 |
|---|---|
| `harness/verify_exact_count_signature_separability_envelope_wave2.py` | `914864c1320c7597bf8634525ab025c5561757bcc810e6068ead61b4e3054187` |
| `posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/analyze_exact_count_signature_separability_envelope_wave2.py` | `d15d76cf3ff8761b8d53b04cc1d888d95ee265446e014e1e2e6d498af6344ede` |
| `posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/test_exact_count_signature_separability_envelope_wave2.py` | `0e1024064bca849b8459428362e0cc2fe8f4cf84bdfe495c758a22335be4c00d` |
| `posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/EXACT-COUNT-SIGNATURE-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json` | `ac7f143c60887c7b023ba2492bf164403d9224bfe5a0076c8628a38c5e12fd34` |
| `posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/EXACT-COUNT-SIGNATURE-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md` | `4d3bd567e534eef1c09fa148ab574e5ea420a4cfc7636892779925df49348fcb` |
| `posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/CHECKSUMS-EXACT-COUNT-SIGNATURE-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256` | `e1fc24c56cbff0c1d8a7a0ca9ad201e33d9bbf07a4ebb37963e2c9576f4d74e9` |

不得 import GR9 analyzer/validator/tests，也不得解析、decode 或查询 GR9 JSON/REPORT 取得 expected result；
六路径只可按 exact path 读取 raw bytes 做 SHA closure。允许从任务书固定表中实现 `represented_by_gr9`
注册表；这不是读取 GR9 result。

## 9. 必须发布的结果

JSON 顶层至少包含：

- scope、scientific parent、development-only / zero-cost / no-gold / no-efficacy 边界；
- source-object closure、MU materialization identity 与 runtime-shape confirmation；
- frozen grammar 五种 primitive kind 与四个 classification；
- schema variants、21 个 top-level paths、8 个 trace paths、forbidden subtree markers；
- 每个 canonical audit entry 的 stable id、path、kind、source type、classification、reason code、GR9 slot/alias
  （若适用）；
- 四类计数、disjoint/exhaustive 证书、unknown/unclassified 计数；
- 七项 `structurally_eligible_untested` 名称，按 §4.3 固定顺序；
- no-selection / no-efficacy / no-leak / no-hidden / no-model / no-cost boundary；
- 唯一结论与 owner-decision stop。

不得包含任何 observed field value、enum distribution、list length、row count by schema variant、field
frequency/cardinality/support、arm/config/outcome/pass/gate 交叉表、rank/winner、identity、正文或路径。

REPORT 首行必须为：

```text
REMAINING MACHINE-OBSERVABLE SCHEMA-SURFACE AUDIT ONLY — eligibility inventory; no efficacy test, selector, or candidate
```

末行必须为：

```text
GR10 COMPLETE — return to owner before preregistering or testing any new primitive
```

## 10. 唯一允许结论

若 eligible set 非空，只能写：

> `one or more untested content-blind primitives remain structurally eligible for separate preregistration; no hypothesis, candidate, field ranking, or efficacy claim is made`

若 eligible set 为空，只能写：

> `the accepted MU verdict schema contains no untested content-blind primitive beyond the GR9 exact-count surface under the frozen eligibility grammar`

在本任务钉死 source/type contract 闭合时，§4.3 预注册表要求前一种结论与 eligible count 7。任何偏离必须
作为 source/schema drift 停止，不得通过改 grammar、删除项目或转用第二种结论“修好”。两种结论都必须附：

```text
development-only schema eligibility audit; no observed values, gold efficacy, selector, candidate, out-of-sample, promotion, or freeze decision
```

## 11. 边界声明与静态闸

- `gold_labels_loaded=false`
- `runtime_values_saved_or_compared=false`
- `field_frequency_or_support_computed=false`
- `gate_or_class_closure_computed=false`
- `selector_hypothesis_proposed=false`
- `new_routing_signal_proposed=false`
- `candidate_verifier_created=false`
- `field_or_configuration_selected=false`
- `field_ranking_performed=false`
- `development_only=true`
- `out_of_sample_validity="underdetermined"`
- `hidden_touched=false`
- `model_calls=0`
- `cost_cny=0`
- `promotion_decision="not_made"`
- `freeze_decision="not_made"`

analyzer / validator AST 必须拒绝 `eval/exec`、网络、模型 runner、recursive glob/scandir、hidden 路径、
随机、gold/M1/D1/D2/GR7/GR8/GR9 result 的解析/decode reader（GR9 六对象 raw-byte SHA closure 除外）、
值集合/Counter/sort/rank、field-value serialization、
动态 path、list element access、变更 §4 registry 或 import 前序任务模块。validator 不得写仓库；analyzer
只可在显式 `--generate` 下无覆盖地写本轮三产物，`--check-existing` 必须严格只读。固定 posthoc 目录的
`os.listdir` 只可用于五产物闭包。

## 12. Independent validator 与真实负测

`harness/verify_remaining_machine_observable_schema_surface_audit_wave2.py` 必须独立钉死 inputs、parent
objects、MU source、schema AST、runtime shape、grammar、classification partition、canonical JSON / REPORT
与净化边界。不得 import analyzer / tests / GR9 或更早任务模块，不得把 delivered JSON / REPORT 或 GR9
result artifacts 当 expected document。

测试在 `TemporaryDirectory()` 复制五份 posthoc 产物并黑盒运行 validator；每条 mutation 前先跑
byte-identical control rc 0，再施加 mutation、重签 CHECKSUMS，确认 rc 2。至少覆盖：

1. 顶层 21 keys 少/多/换名，base/enriched overlay 漏项，第三 keyset 或动态 key；
2. `trace` 8 keys 少/多、未知 nested path、list-element subtree 被展开；
3. bool 当 int、truthy/falsy、float/count、None/dict/list type contract 漂移；
4. grammar 增删 primitive kind、开放 string presence / element / hash / distinct / bucket / interaction；
5. 四分类重叠、漏 primitive、unknown/unclassified 非零或 forged exhaustive certificate；
6. 已表示项伪装 eligible、eligible 项伪装 constant/forbidden、reason code 或 GR9 slot 伪造；
7. eligible 七项少/多/换序，或依据 observed frequency/support/gold/gate 改分类；
8. 打开 U1/M1/D1/D2/GR7/GR8/GR9 result、读取 gold/arm/config/outcome/pass 用于审计；
9. 保存或比较 bool/enum/int/string/list length/value set，输出 per-variant row count；
10. rank/best/winner/promising/recommended、k8、selector hypothesis、candidate 或字段组合；
11. 泄漏 row/run/episode/blind id、answer、trace/episode/rubric正文、element、绝对路径或 hidden；
12. parent/input/object SHA、MU commit:path、196 trace registration 或 topology 漂移；
13. no-gold/no-efficacy/no-selection/no-hidden/model/cost/promotion/freeze 边界漂移；
14. 少/多产物、CHECKSUMS 漏项/多项/自列、validator 写工作树；
15. REPORT 首尾、唯一结论、owner-decision、普通事实行或 JSON key order/indent/trailing newline 漂移。

负测后五份工作树产物 SHA 必须与导入快照一致；stderr 必须单行净化，不回显待验值、identity、正文、
路径、traceback 或 eligible primitive 的 observed value。

## 13. 目标命令

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-remaining-machine-observable-schema-surface-audit/test_remaining_machine_observable_schema_surface_audit_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-remaining-machine-observable-schema-surface-audit/analyze_remaining_machine_observable_schema_surface_audit_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_remaining_machine_observable_schema_surface_audit_wave2.py
```

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行 GR9 或更早任务的
目标命令、`pytest harness/` 整目录、旧 sweep/rescore/probe、gate closure、模型 runner、正式
development、样本外、G0 或 hidden。

## 14. 回执与停止条件

回执必须给出：

- branch/worktree/commit/唯一 parent、相对 parent 六个 `A` / 0 个 `M`、ancestry/tag/status；
- 六 changed paths 与 SHA、posthoc 五项、CHECKSUMS 四项闭包；
- 八个 runtime/source input 与 GR9 六对象在 parent / 工作树两侧的 SHA 闭包；
- MU source 的 full `commit:path` 物化、module/source identity 与 196 trace registration；
- source AST 的 base/enriched/trace schema、runtime key/type confirmation 与 unknown-key 0；
- audit-entry universe、四分类 partition、eligible 七项与 unknown/unclassified 0；
- no-gold/no-values/no-efficacy/no-selection/no-leak 静态闸及所有 boundary flags；
- independent validator 的重建方式、负测 control/mutation rc 与 canonical byte equality；
- 三条目标命令原始结论；测试后 HEAD/status/tag 与六文件 SHA 无漂移，无 `__pycache__`。

提交后立即停止并返回 owner。不得预注册或测试七项中的任何一个，不得创建 k8、selector、candidate、
GR11、新 matcher 或字段组合；不得计算 gold/gate/class/support、读正文/hidden/样本外、调用模型、产生费用、
promotion、freeze、正式运行、G0、merge、tag 或 push。
