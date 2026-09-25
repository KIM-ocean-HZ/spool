# Claude Code 任务书 —— Stage 0-a development wave2 · GR15 trace-calls-made exact-count separability envelope

> **状态：COMPLETE — 2026-09-22 Codex verdict：`Redo`。本文件只供审计，不再执行。**
>
> **后续唯一任务书：**
> `docs/TASKBOOK-STAGE0A-GR15R1-DEVELOPMENT-TRACE-CALLS-MADE-DIRECT-INTEGER-FACTUAL-CLOSURE-CORRECTION-2026-09-22.md`
>
> **退回范围：** 数值 payload、拓扑与三条目标命令可闭合；退回只因 P1 提前读取
> `trace.calls_made`、第 16 槽把 raw integer 包成 availability tuple，以及 canonical JSON / REPORT
> 对 primitive/source semantics/历史计数的事实闭包错误。GR15 不进入 accepted chain。
>
> **唯一交付：** 在任何本轮逐行 primitive value、class、collision 或 gate 结果产生前，预注册且只检验
> `trace.calls_made`。把这个已发布的非负整数作为 GR9 `machine_observable_exact_count_shape_v1` 的唯一新增
> 末槽，机械判断该单一 refinement 能否切分 GR9 等价类，并能否在 GR7 同一组 16 个 development
> gold-oracle all-green target cells 中产生至少一格 class-closed all-green；另行发布 anonymous arm-count
> padding 的更弱上界。
>
> **这是单假设、development-only、零费用的 separability envelope。** 选择本项只依据 accepted source
> 语义：冻结 `check_trace()` 先以单条 comprehension 从真实 call events 构造 `calls`，再以
> `calls_made: len(calls)` 直接发布 content-blind count；accepted scorer 不读取 `calls_made`。该选择不来自
> runtime value、频率、support、gold 效果、GR10 registry 顺序或前四项实验结果；不得解释为对剩余字段的
> 排名、淘汰或推荐。
>
> **授权来源：** owner 于 2026-09-21 在 GR14 `Accept with non-blocking note` 后明确“下发下一个任务”。
> Codex 将授权收敛为本单 primitive、单 signature、development-only GR15。授权不包括 primitive 组合、
> threshold 搜索、selector、candidate、hidden、样本外、模型/API、费用、正式运行、promotion、freeze、
> G0、远端操作或 GR16。

## 1. 预注册理由与假设

GR9 已证明：把原六个列表桶细化为 exact lengths，34 个 GR8 bucket classes 无一被切分；16 个 target
cells 的 collision 恒为 42，Layer A / B 均为 `0/16`。GR10 只登记七项 structurally eligible primitives，
没有读取它们的值或做 efficacy 排名。随后四项各自独立完成且不得组合：

- GR11 `len(trace.missing)`；
- GR12R3 `len(trace.wrong_param_calls)`；
- GR13R2 `len(trace.satisfied)`；
- GR14 `len(trace.invalid_tool_calls)`。

本轮在看任何新结果前锁定：

```text
trace_calls_made_exact_count_refinement_v1 := verdict["trace"]["calls_made"]
```

accepted `check_trace()` 以 `kind == "call"` 且 `t.get("tool")` 的真实 trace entries 构造 `calls`，并直接以
`len(calls)` 绑定 `calls_made`。它不是 `trace.ok = not missing` 的组成条件，也不被 accepted scorer 的
decision locals 读取。本轮只读取这个已发布整数，不读取 call element、tool、args 或原始 trace。

其余尚未检验项保持未检验：

```text
len(suppressed_wrong_actions)
len(trace.failure_paths_fired)
```

固定 preregistered hypothesis：

> `trace.calls_made` may split one or more GR9 classes and may reduce the mandatory class-closure collision enough
> to realize at least one frozen GR7 oracle-all-green target cell; this is a development-only separability test and
> does not identify a deployable selector.

结果无论正负都只按 §4.3 的原因树与 §10 的固定结论报告，不得改题、换字段、合并 primitive 或追加
解释性 probe。

## 2. 唯一科学问题与完成定义

### 2.1 唯一科学问题

1. 直接重建 GR7 的 `N(c)`、mandatory `M`、false negatives `F` 与 `U(c)=F\(N(c)∪M)`；
2. 对每行构造 GR9 `S_exact(r)`，只追加 `trace.calls_made`，得到 `S_tc(r)`；
3. 用 `drop_last(S_tc(r))` 逐行重建 `S_exact(r)`，证明只细化、不改 GR9 字段；
4. 令 `Q_tc(c)={S_tc(u):u∈U(c)}`，`K_tc(c)={r:S_tc(r)∈Q_tc(c)}`；
5. 计算 `A_tc(c)=K_tc(c)\N(c)` 与 `E_tc(c)=A_tc(c)\U(c)`；
6. 以 `N_tc(c)=N(c)∪K_tc(c)` 重算冻结 G1/G2/G3；G4 与 GR7 原格相同；
7. 以 `N_tc(c)` 为 lower bound，沿 GR7 的 7041-vector exact closure 判断 anonymous padding 上界；
8. 只发布 aggregate refinement/class/collision/gate 结果，不保存 primitive value、signature value、
   positive lookup、class member、row identity 或 join key。

### 2.2 完成定义

analyzer 与 independent validator 必须各自从钉死 git objects 直接重建两份器材、GR7 256 格与
7041-vector closure、16 格 target family、GR8 / GR9 / GR10 anchors、本轮单槽 signature、class closure
与两层 gates。两套 canonical JSON / REPORT 必须逐字节相同。

P0–P8 必须在实际控制流闭合；whole-source AST self-provenance 必须让删闸、恒真化、提前读取、字段替换、
source-semantic 漂移或断开发布事实 provenance 都在读取 delivered products 或比较科学结论前 rc 2。
三条目标命令全绿并提交唯一一笔 commit 后立即停止并返回 owner。

### 2.3 非目标

本任务不做：

- 读取或重算前四个已检验 primitive 的逐行值、signature 或 class membership；
- 读取剩余两个 eligible primitive 的逐行值；
- primitive sweep、排名、推荐、组合、交互项、bucket/cap/threshold 搜索；
- selector hypothesis、routing rule、candidate verifier、k8、第二 matcher 或 configuration selection；
- 读取 call element、tool、args、failure-path 字符串、answer/episode/trace/rubric 正文或逐行身份；
- validation/out-of-sample/hidden/G0、模型调用、费用、promotion、freeze 或正式执行；
- 修改 accepted commit、冻结件、matcher、routing/component、threshold、gold、rubric、runner 或
  `docs/EXECUTION_POLICY.md`。

## 3. 预注册 signature 与唯一允许关系

新 signature 固定为：

```text
machine_observable_exact_count_shape_plus_trace_calls_made_v1
```

每行只能是 GR9 15 槽 `S_exact(r)` 原样加一个末槽：

```text
S_tc(r) = S_exact(r) + (verdict["trace"]["calls_made"],)
```

唯一允许读取必须是 direct two-level string-literal subscript；值必须为 `int`、不得为 `bool`、且 `>=0`。
不得用 `.get`、computed key、default、fallback、truthiness、presence、`len()`、cap、bucket、round、sum、
distinct、normalization 或异常吞掉。每行只能读取一次；不得缓存为第二个科学字段。

纯投影必须逐行满足：

```text
drop_last(S_tc(r)) == S_exact(r)
```

不得构造包含 missing / wrong-param / satisfied / invalid-tool-calls / suppressed-wrong-actions /
failure-paths 的组合 signature。

## 4. 冻结 target family 与两层 envelope

target family 仍为 GR7 已接受的 16 个 `oracle_all_green=true` 格；不得因本轮结果增加、删除、换序或筛格。

### 4.1 Layer A：class-closed lower bound

对每格按 §2 的 `K_tc/A_tc/E_tc/N_tc` 计算：

- G1：`N_tc(c) ∩ M = ∅`；
- G2：`|N_tc(c)| ≤ 78`；
- G3：四 arm 归一化差 `≤ 1/10`；
- G4：matcher-fixed，与 GR7 原格相同且 pass；
- `trace_calls_made_signature_only_all_green=true` 当且仅当同一格四闸全过。

### 4.2 Layer B：anonymous padding 上界

只在不删除 `N_tc(c)` 前提下使用 GR7 已验收闭集：

```text
E = {x ∈ Z^4:
     0 ≤ x_a ≤ denominator_a,
     sum(x) ≤ 78,
     max_a(x_a/denominator_a) - min_a(x_a/denominator_a) ≤ 1/10}
```

以 `l^tc_a(c)=|N_tc(c)∩arm_a|` 为 lower bound，穷尽 7041 vectors，求 minimum final total、minimum
padding 与全部 minimum ties。padding 只是匿名整数上界，不得生成成员或 selector。

### 4.3 固定判定顺序与原因闭集

1. `split_gr9_class_count == 0`：第一步失败；仍闭合 16 格并证明与 GR9 相同；
2. 有 split 但 Layer A/B 均 0：只说 refinement 存在但冻结 gates 下不能实现 target；
3. Layer A 至少一格：只说 development class-closed separability exists；
4. Layer A 为 0、Layer B 至少一格：只说仍需 anonymous padding upper bound。

原因闭集：

```text
NO_GR9_CLASS_SPLIT
TRACE_CALLS_MADE_CLASS_COLLISION_EXCEEDS_G2_CAP
TRACE_CALLS_MADE_CLASS_CLOSURE_FAILS_G3
NO_TRACE_CALLS_MADE_G3_PADDING_VECTOR_WITHIN_G2_CAP
POSITIVE_TRACE_CALLS_MADE_CLASS_HAS_SINGLETON_SUPPORT
```

G2/G3 failure 可重叠；Layer B 先判 total >78，否则才判无 padding vector。singleton 只作 development
overfit 风险，不改变 gate；G4 不新增 reason。

## 5. 起点、branch、worktree 与提交拓扑

- parent / accepted development head：GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`
- projected scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- branch：`stage0a-wave2-trace-calls-made-exact-count-separability-envelope-gr15`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-trace-calls-made-exact-count-separability-envelope-gr15`
- 2026-09-21 Codex 已只读确认上述精确 branch（local 与登记的 origin ref）和 worktree path 均不存在；
  执行者创建前必须再次确认，若存在则停止，不删、不覆盖、不复用。
- 从 accepted GR14 新建；最终 commit 唯一 parent 必须为 GR14，相对 parent 恰一笔 commit。
- GR6R1 / GR6 / GR3 / GR12 / GR12R1 / GR12R2 / GR13 / GR13R1 均不得进入 ancestry。
- 不 cherry-pick、merge 或读取 sibling worktree；历史输入只按 full `commit:path` 读取 git object。

三条目标命令全绿后只提交一次，message 固定：

```text
posthoc(stage0a): bound trace-calls-made exact-count separability (GR15)
```

不得 merge、tag、fetch、pull、push。

## 6. 唯一允许的 changed paths

相对 GR14 必须恰六个新增路径、0 个已有文件修改：

```text
harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/CHECKSUMS-TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 目录必须恰五项；CHECKSUMS 只登记 analyzer、test、JSON、REPORT 四项且不自列。不得创建第七件
产物、runtime event file、registry copy、signature table、lookup、candidate 或仓内临时文件。

## 7. 输入、accepted objects 与 scaffold 闭包

### 7.1 完整独立重建

analyzer 与 validator 各自钉死并复核 accepted GR14 ancestry 所需冻结闭包：

- 17 个 development inputs 与五份上游 CHECKSUMS 的反向注册；
- v1.20 freeze 两节；
- GR2A / GR2BR1 / GR2D 三个 accepted siblings 的 21 个 objects；
- GR3R1、GR4、GR5、GR7、GR8、GR9、GR10、GR11、GR12R3、GR13R2、GR14 各自 required objects；
- MB 工作树 accepted v1.20 与 MU 只按 GR2BR1 full `commit:path` 物化的不同 module/source SHA；
- 196 行、两轴 verdict schema、k1..k7、mandatory、pass/outcome、冻结 G1–G4；
- GR7 target family 与 7041-vector closure、GR8 bucket、GR9 exact、GR10 registry anchors；
- GR11 / GR12R3 / GR13R2 / GR14 只作 ancestry/object closure，不读取其 primitive runtime values。

完整 object tables 必须机械求和为 `pinned objects=87  generations=11  siblings=3`，不得写死总数。不得
import 前序 analyzer、validator 或 tests；不得把前序 JSON/REPORT 当 expected；不得复制 row value、target
membership、signature、class membership 或本轮 canonical result。

### 7.2 accepted source semantics 必须先静态闭合

以下两个 full objects 必须钉死：

```text
fae90ecfeed723748b80566b94d473cf25e45d0c:harness/verify_stage0a_v120_wrong_action_matcher_gr2b.py
fae90ecfeed723748b80566b94d473cf25e45d0c:harness/verify_stage0a.py
```

SHA-256 依次必须为：

```text
a9d6fcaad174b43a2555c72daf449769183d2902a1827e5be40ba3058862bd65
ce014e0850efc23617387ad01b3154d091abb3a5dfc9d7ccd40671f0b56c7dce
```

在任何 runtime primitive read 前，两套实现必须由 base `check_trace()` static AST 证明：

1. `calls` 恰由一条 list comprehension 绑定，迭代 direct `trace`；
2. comprehension 条件恰包含 `t.get("kind") == "call"` 与 `t.get("tool")`，不得用 truthiness 替代 equality；
3. return dict 的 direct key `calls_made` 恰绑定 `len(calls)`，且 `len` 恰一参、参数恰为 `calls`；
4. `trace.ok` 仍 direct 绑定 `not missing`，不含 `calls_made`；
5. `calls_made` 的局部发布绑定可达且唯一，不允许常量、别名或其它 collection 替代。

同时由 MU scorer AST 证明：accepted scorer 确实读取 `tr` 且 direct keys 非空并包含 `ok`；
`tr["calls_made"]` 全函数读取次数恒为 0；五个 decision locals `passed/outcome/review/reason/mandatory`
均有真实 bindings，且这些 binding 中该字段读取数也全为 0。

上述 scorer-scope 五族 gate 固定为：

```text
trace_ok_still_read
reads_zero
decision_bindings_non_empty
decision_locals_complete
decision_reads_zero
```

analyzer 与 validator 都必须以 whole-source AST self-provenance 证明五族 gate 存在、由 AST 事实计算并被
真实 enforcement 消耗。validator 必须在 `scorer-scope` 首 stage、读取产物或 rebuild/compare 前执行；
analyzer 必须在 `build_blobs()` 顶部、canonical bytes 生成前执行。每族真实删闸与恒真化都必须 control
rc 0 → mutation rc 2，stderr 单行 `FAIL [scorer-scope]`，且不得到达 rebuild/compare。

### 7.3 accepted GR14 六对象只作 scaffold / SHA closure

执行者必须从 full `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17:path` 自行复核：

```text
df6f9ed9124412d037366ba70fb127b7b172ac58d670ed525524bfa089002841  harness/verify_trace_invalid_tool_calls_exact_count_separability_envelope_wave2.py
142413593aec46291b3731161ca57bc50ef1b4c7b97b0eb3540fd3fbb46000e4  posthoc/stage0a-development-wave2-trace-invalid-tool-calls-exact-count-separability-envelope/analyze_trace_invalid_tool_calls_exact_count_separability_envelope_wave2.py
58fe101fd222b755aded52f055ab287c48fbacda6f590ca8d319cb0755e038d1  posthoc/stage0a-development-wave2-trace-invalid-tool-calls-exact-count-separability-envelope/test_trace_invalid_tool_calls_exact_count_separability_envelope_wave2.py
06012953e22f0302f7d4bdad5fe306d63744376dfb744ad86b7ece0ea7977533  posthoc/stage0a-development-wave2-trace-invalid-tool-calls-exact-count-separability-envelope/TRACE-INVALID-TOOL-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
afac4ecbfcacf6a9b27bbb70518381a29e55738b4fc58ac324d93d5ae170cf95  posthoc/stage0a-development-wave2-trace-invalid-tool-calls-exact-count-separability-envelope/TRACE-INVALID-TOOL-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
150f5edefd68eb523aa5cca193ee02392fcd5d870f0afc26c64863130ea34247  posthoc/stage0a-development-wave2-trace-invalid-tool-calls-exact-count-separability-envelope/CHECKSUMS-TRACE-INVALID-TOOL-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

三份 Python object 可作 P0–P8、self-provenance、independent validator 与 mutation harness 的机械 scaffold，
但必须完整替换并静态证明本轮唯一 primitive/read path；必须删除 GR14 的两段矛盾旧 scorer-scope 注释，
不得复制其事实错误。JSON/REPORT/CHECKSUMS 只可 raw-byte SHA closure，不得解析取得 expected science。

## 8. P0–P8 与 baseline anchors

实际 runtime event ledger 固定为：

```text
P0 pin-and-verify-objects
P1 source-semantics-and-scorer-scope-static-closure
P2 reconstruct-frozen-baselines
P3 verify-gr8-gr9-gr10-anchors
P4 first-and-only-trace-calls-made-runtime-read
P5 split-and-projection-closure
P6 layer-a
P7 layer-b
P8 canonicalize-products
```

P1 只能做 static AST/type/dependency proof，不得读取 runtime value。P4 前必须直接重现：

- 256 格、两轴各 128、bit order `k1..k7`；GR5 baseline all-green 0；G1/G2/G3/G4 passing
  `32/132/16/128`；
- GR7 denominators `56/56/56/28`、G2 cap 78、G3 ratio `1/10`、vectors 7041；G1–G3 feasible
  48、oracle-all-green 16；MB `32/0`、MU `16/16`；
- k7-off feasible/all-green `48/16`，k7-on `0/0`；target family 恰 16 且全 MU/k7-off/G4 pass；
- GR8 bucket signature 34 classes、support `1…27`、11 singleton；16 格 collision 42、final `82…88`、
  Layer A/B `0/16`；
- GR9 exact signature 34 classes；34 个 bucket classes split/unsplit `0/34`；16 格 collision 42、final
  `82…88`、Layer A/B `0/16`；
- GR10 source universe 29 paths、43 entries 四分 `15/2/19/7`、eligible 7、unknown/unclassified 0；
- `trace.calls_made` 恰在 eligible registry；其它六项没有进入本轮 signature/runtime read；
- routing 不改 matcher-fixed fields/G4；k7 AST digest 仍等于 accepted GR5。

发布的七键 order block 固定为：

```text
phases
primitive_after_anchors
split_before_layerA
layerA_before_layerB
violations
from_runtime_events
order_claims_hardcoded
```

五条 bool 必须都是可追溯表达式；不得写 literal 结论。任一 anchor/order/source-scope 漂移必须在 P4 或
canonical compare 前退出 2。

## 9. 必须发布与绝对禁止保存的 aggregate

JSON 按固定顺序保存 16 格 aggregate table；每格至少包含 configuration/matcher/mask、GR7 `|U(c)|` 与
padding anchor、projected GR9 与本轮 class counts、positive-class support min/max、singleton count、
`all_positive_classes_support_ge_2`、`|A_tc|/|U|/|E_tc|`、相对 collision 42 的 reduction、final total 与四 arm
aggregate counts、Layer A G1–G4 与 all-green、Layer B feasibility/minimum final/minimum padding/ties、reason
set、suppression status、`K_tc⊆K_exact`。

同时发布本轮 class/support/singleton 的全局单维 aggregate、34 个 GR9 classes 的 split/unsplit、本轮
subclass-count 单维分布、16 格 Layer A/B counts、collision/reduction/blocker min/max/distribution、minimum
ties aggregate、16/16 refinement containment 与 boundary flags。

绝不保存：primitive value/频表、exact/projected signature tuple/value/digest、positive signature set、class
members、`U/A/E` members、row order/id/hash、正文、绝对路径、其它 primitive values、arm-conditioned rule
或可回连 join key。三个 structure-gate evidence blocks 只能是 `runtime_direct_read_closure`、
`p1_type_only_closure`、`order_booleans_derived_from`；不得增加 debug field。

## 10. 唯一允许结论

按 §4.3 只选最具体一条。

若 `split_gr9_class_count == 0`：

> `the preregistered trace.calls_made exact-count refinement does not increase development separability beyond GR9`

若有 split 且 Layer A/B 均为 0：

> `the preregistered trace.calls_made exact-count refinement increases development separability but cannot realize any GR7 oracle-all-green cell under the frozen gates`

若 Layer A 至少一格：

> `trace.calls_made exact-count class-closed separability exists on development; no deployable or out-of-sample selector has been identified`

若 Layer A 为 0、Layer B 至少一格：

> `trace.calls_made exact-count closure still requires anonymous padding; no deployable selector is closed`

REPORT 首行固定：

```text
TRACE.CALLS_MADE EXACT-COUNT SEPARABILITY ENVELOPE ONLY — single-preregistered-primitive development bound; no combination, selector, or candidate
```

REPORT 末行固定 rider：

```text
Development-only aggregate evidence; no hidden or out-of-sample data was accessed, no selector or candidate was created, and no promotion or freeze decision was made.
```

还必须发布：

```text
preregistered_primitive="trace.calls_made"
model_calls=0
cost_cny=0
hidden_touched=false
promotion_decision=not_made
freeze_decision=not_made
```

## 11. Tests 与 independent validator

测试必须覆盖正常重建、边界、determinism、canonical ordering、projection、16/16 containment、k=2 arm
publish/suppression、reason/conclusion direction 与以下 mutation；所有科学 mutation 必须在 canonical compare
前 rc 2：

1. parent/message/path/object SHA/ancestry/object count 任一漂移；
2. `calls` comprehension 的 source、filter、`kind == "call"` 或 `t.get("tool")` 漂移；
3. `calls_made` return binding 改为常量、别名、其它 collection、`.get`、`len()` 包装或别的字段；
4. `trace.ok` 不再 direct `not missing`；
5. scorer-scope 五族任一删闸或恒真化；
6. P1 提前读取 value、P4 前访问本轮 primitive、order bool 写死或断开 runtime event provenance；
7. signature 混入其它字段、少槽/多槽/换序、drop-last projection 失真；
8. target family、G1–G4、7041 vectors、k=2 suppression、Layer A/B 顺序或 reason set 漂移；
9. 删除、增加、换序 canonical JSON key/table row 或修改 REPORT 固定首末行；
10. 将 case ①写成更具体结论、将 case ②/③/④降格为不切分，或删除固定 rider。

independent validator 不得 import analyzer/test/前序实现，不得信任 delivered JSON/REPORT/CHECKSUMS；必须
独立 materialize git objects、重建 canonical bytes、逐字节比较并核 CHECKSUMS。失败只输出单行
`FAIL [stage]: reason`，不得泄露值、identity、正文或绝对路径。

## 12. 唯一目标命令

本机默认 Python 3.14 会改变继承的 GR5 AST dump；本任务固定使用已验证的 Python 3.12.2：

```bash
PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 -m pytest \
  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 \
  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 \
  harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
```

不得运行整个 `pytest harness/`、前序任务目标命令、额外 probe、rescore、sweep、模型 runner 或任何 hidden
命令。不得安装依赖或联网。

## 13. 提交前清单与停止点

- branch/worktree 在创建前仍不存在，parent 精确为 GR14，最终唯一 parent 不变；
- 相对 parent 恰六个 `A` / 0 个 `M`，posthoc 恰五项，CHECKSUMS 恰四条且不自列；
- 87 objects / 11 generations / 3 siblings 机械闭合；禁止 ancestry 全部 rc 1；
- source semantics、scorer scope、P0–P8、删闸/恒真化与 canonical compare 顺序全部有真实 provenance；
- 三条目标命令 rc 0；六文件 SHA 回执；status clean；tag 0；
- 无 `__pycache__`、`*.pyc`、candidate、临时文件或第七件产物；
- 没有 hidden、模型/API、费用、selector、candidate、promotion、freeze、远端操作或 GR16。

唯一 commit 完成后立即停止并返回 owner。回执只报告 topology、六 SHA、三条命令、aggregate scientific
结论与边界自查；不得继续下一 primitive、组合、selector、candidate、hidden、样本外或远端操作。
