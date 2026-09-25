# Claude Code 任务书 —— Stage 0-a development wave2 · GR14 trace-invalid-tool-calls exact-count separability envelope

> **状态：COMPLETE — 2026-09-21 验收为 `Accept with non-blocking note`；本文件仅供归档审计，不得开工。**
>
> **后续光标：** 返回 owner decision；当前没有 ACTIVE 实验任务书，未授权 GR15。
>
> **唯一交付：** 在任何本轮逐行 primitive value、class、collision 或 gate 结果产生前，预注册且只检验
> `len(trace.invalid_tool_calls)`。把它作为 GR9 `machine_observable_exact_count_shape_v1` 的唯一新增末槽，
> 机械判断该单一 refinement 能否切分 GR9 等价类，并能否在 GR7 同一组 16 个 development
> gold-oracle all-green target cells 中产生至少一格 class-closed all-green；另行发布 anonymous arm-count
> padding 的更弱上界。
>
> **这是单假设、development-only、零费用的 separability envelope。** 选择这一项只依据 accepted source
> 语义：冻结 `check_trace()` 从真实 call events 与 `allowed_tools` schema 机械构造
> `invalid_tool_calls`，它是与已检验 `wrong_param_calls` 最接近的剩余 content-blind trace-behavior count，
> 但不参与既有 `trace.ok = not missing` 或 scorer decision locals。该选择不来自 runtime value、频率、
> support、gold 效果、GR10 registry 顺序或前三项实验结果；不得解释为对剩余字段的排名、淘汰或推荐。
>
> **授权来源：** owner 于 2026-09-20 在 GR13R2 `Accept` 后明确“创建下一任务”。Codex 将授权收敛为本
> 单 primitive、单 signature、development-only GR14。授权不包括 primitive 组合、阈值搜索、selector、
> candidate、hidden、样本外、模型/API、费用、正式运行、promotion、freeze、G0、远端操作或 GR15。

## 1. 为什么是这一项

GR9 已证明：在 GR8 固定字段集内，把六个列表桶完整细化成 exact lengths，仍只有 34 个 class；34 个
GR8 bucket class 无一被切分，16 个 target cell 的 collision 恒为 42，Layer A / B 均为 `0/16`。GR10
随后只做 schema-surface audit，登记七项 structurally eligible primitives，不读取值、不做效果检验。

已经分别预注册并验收的三个单项是：

- GR11 `len(trace.missing)`：不与本轮组合，也不重读其逐行值；
- GR12R3 `len(trace.wrong_param_calls)`：不与本轮组合，也不重读其逐行值；
- GR13R2 `len(trace.satisfied)`：不与本轮组合，也不重读其逐行值。

本任务在看任何新结果前锁定：

```text
trace_invalid_tool_calls_exact_count_refinement_v1 := len(verdict["trace"]["invalid_tool_calls"])
```

accepted `check_trace()` source 对 `kind == "call"` 的实际 trace entries 取 tool，建立
`allowed = set(episode.get("allowed_tools") or [])`，并以 `c["tool"] not in allowed` 构造 `invalid`，最后
通过 direct key `invalid_tool_calls` 发布该 list。它不是现有 `trace.ok` 的组成条件，也不得被既有 scorer
decision locals 当作隐藏 gate。本轮只读取已发布 list 的 exact length，绝不读取 tool name 或任一元素。

其余尚未检验项继续保持未检验：

```text
len(suppressed_wrong_actions)
trace.calls_made
len(trace.failure_paths_fired)
```

其中 `suppressed_wrong_actions` 是 content matcher diagnostic，`failure_paths_fired` 含 prose-trigger
diagnostic，`calls_made` 语义更宽；这只是本轮 accepted-source-only 的边界说明，不是效果判断或永久排序。

预注册假设固定为：

> `len(trace.invalid_tool_calls)` may split one or more GR9 classes and may reduce the mandatory class-closure
> collision enough for at least one of the 16 frozen development target cells to satisfy the frozen gates.

假设可以全盘失败。失败不授权改字段、尝试下一项、分桶、组合或调阈值；成功也只证明 development
separability，不产生 deployable rule。

## 2. 唯一问题、完成定义与非目标

### 2.1 唯一问题

对 GR7 独立重建出的固定 target family：

```text
T_GR7 = { c : GR7.oracle_all_green_feasible(c) = true }
```

必须先机械确认 `|T_GR7|=16`，且全部 `matcher=MU`、`k7_selected=false`、原始 G4 pass；不得从任何前序
JSON / REPORT 复制逐格 membership 或 expected values。

对每个 `c ∈ T_GR7`：

1. 直接重建 GR7 的 `N(c)`、mandatory `M`、false negatives `F` 与 `U(c)=F\(N(c)∪M)`；
2. 对每行构造 GR9 `S_exact(r)`，再只追加 §3 的单一末槽，得到 `S_ti(r)`；
3. 由纯投影 `drop_last(S_ti(r))` 重建 `S_exact(r)`，证明本轮只细化、不改变 GR9 字段；
4. 令 `Q_ti(c)={S_ti(u):u∈U(c)}`，`K_ti(c)={r:S_ti(r)∈Q_ti(c)}`；
5. 计算 `A_ti(c)=K_ti(c)\N(c)` 与 collision `E_ti(c)=A_ti(c)\U(c)`；
6. 以 `N_ti(c)=N(c)∪K_ti(c)` 重算冻结 G1/G2/G3；G4 与 GR7 原格相同；
7. 以 `N_ti(c)` 为 lower bound，沿 GR7 的 7041-vector exact closure 判断 anonymous padding 上界；
8. 只发布 aggregate refinement / class / collision / gate 结果，不保存 primitive value、signature value、
   positive lookup、class member、row identity 或 join key。

### 2.2 完成定义

analyzer 与 independent validator 各自从钉死 git objects 直接重建两份器材、GR7 256 格与 7041-vector
closure、16 格 target family、GR8 / GR9 / GR10 anchors、本轮单槽 signature、class closure 与两层 gates。
两套 canonical JSON / REPORT 必须逐字节相同。

P0–P8 必须在实际控制流中闭合；whole-source AST self-provenance 必须让删闸、恒真化、提前读取、字段替换、
source-semantic 漂移或断开发布事实 provenance 都在读取 delivered products 或比较科学结论前 rc 2。三条目标
命令全绿并提交唯一一笔 commit 后立即停止并返回 owner。

### 2.3 非目标

本任务不做：

- 读取或重算前三个已检验 primitive 的逐行值，或读取其 signature/class membership；
- 读取剩余三个 eligible primitive 的逐行值；
- primitive sweep、排名、推荐、组合、交互项、bucket / cap / threshold 搜索；
- selector hypothesis、routing rule、candidate verifier、k8、第二 matcher 或 configuration selection；
- 读取任一 list 元素、tool / args / failure-path 字符串、answer / episode / trace / rubric 正文或逐行身份；
- validation / out-of-sample / hidden / G0、模型调用、费用、promotion、freeze 或正式执行；
- 修改 accepted commit、冻结件、matcher、routing/component、threshold、gold、rubric、runner 或
  `docs/EXECUTION_POLICY.md`。

## 3. 预注册 signature 与唯一允许关系

### 3.1 单槽 refinement

新 signature 名称固定为：

```text
machine_observable_exact_count_shape_plus_trace_invalid_tool_calls_v1
```

它必须逐槽保留 GR9 `machine_observable_exact_count_shape_v1` 的 15 槽，只在末尾追加：

```text
trace_invalid_tool_calls_count =
  ("available", exact nonnegative len(trace["invalid_tool_calls"]))
    iff type(trace) is dict,
        "invalid_tool_calls" is a direct key,
        and type(trace["invalid_tool_calls"]) is list
  ("not_applicable",)
    iff the already accepted GR9 schema path makes trace unavailable
```

合法 malformed verdict 仍走 GR9 的 malformed schema；新增末槽固定 `("not_applicable",)`。不得把缺
`trace.invalid_tool_calls`、错误类型、bool/int 混淆、异常或负值静默降为 0 / empty / not-applicable。
除 accepted schema 明确定义的 unavailable path 外，任何不匹配都必须在结果产生前 rc 2。

analyzer 与 validator 必须各自只有一个 canonical `S_ti` 函数和一个真实 length accessor。静态 AST gate
必须钉死：

- 唯一新增读取路径恰为 direct `trace.invalid_tool_calls`；
- 唯一新增变换恰为 built-in list length，不迭代、索引、切片、排序、集合化或读取元素；
- 不读取前三个既测项或其余三项，不使用 computed key、`.get(..., default)`、truthiness fallback、
  `eval/exec`、helper-injected value 或结果依赖分支；
- 新槽只在旧 tuple 末尾，旧槽数量、顺序、值与类型逐字节不变。

两套实现各自重算 canonical AST digest 并要求相同，但 digest 不写入交付物。

### 3.2 对 GR9 的纯投影与 refinement 证书

唯一允许投影：

```text
P_ti(S_ti) := drop exactly the final trace_invalid_tool_calls_count slot
```

必须逐行证明 `P_ti(S_ti(r)) == S_exact(r)`，并验证：

- 196 行 projected class partition 与 GR9 的 34 classes、support anchors 和 16 格 closure 完全重现；
- `S_ti(r1)=S_ti(r2) ⇒ S_exact(r1)=S_exact(r2)`；
- 每个 `S_ti` class 完整嵌套于唯一 GR9 class，全部 support 之和为 196；
- 对每个 target cell，`K_ti(c) ⊆ K_exact(c)`；
- 不构造或保存 `S_exact→S_ti`、count→row、positive-class 或任何逆向 lookup。

### 3.3 绝对禁止读取面

`S_ti`、`S_exact` 与投影不得读取、派生、拼接、hash、比较或按条件间接访问：

- `gold_pass`、gold label、`U(c)` membership；
- arm、`carries_memory`、configuration id / mask；
- run id、episode id、blind id、row index、排序位置、join key、时间戳；
- answer / episode / trace 正文、rubric 文本、任一 list 元素、tool / args / failure-path 字符串；
- registry 其它六项的值；
- 文件路径、SHA、commit、随机数、环境变量、网络、模型/API、数据库、hidden 或 sibling worktree。

gold 只可在 signature 构造完成后用于 `U(c)` 的 offline class labelling。所有 signature 与 exact count 只在
内存中作为等价类 key；不得回显到 JSON、REPORT、CHECKSUMS、stderr 或测试名。

## 4. 强制 evaluation order、scope 与 self-provenance

两套实现各自执行以下 P0–P8；阶段名必须对应真实调用顺序：

| phase | 允许动作 | 本轮 primitive 限制 |
|---|---|---|
| P0 | whole-source AST、禁止 import/field/read closure、order/scope gate self-provenance | 不打开 runtime inputs，不取值 |
| P1 | pinned objects、accepted source semantics、schema keyset 与 exact type identity | 可证 direct list；不得 `len`/`bool`/iter/hash/compare/index/slice/set |
| P2 | 独立重建两器材、GR7 256 格、7041 vectors 与 16 格 target | baseline-only，不可达 accessor |
| P3 | 独立重建 GR8 bucket、GR9 exact 与 GR10 registry anchors | baseline-only，不可达 accessor |
| P4 | 唯一 accessor 逐 available row恰一次读取长度并构造 `S_ti` | 首次且唯一真实 primitive value read |
| P5 | structural split / class containment / projected anchors | 先于任何 current Layer A |
| P6 | 全部 current Layer A 与 aggregate verdict | P5 后、P7 前 |
| P7 | 全部 current Layer B / 7041-vector padding closure | 不反哺 split 或 Layer A |
| P8 | canonical render、delivered byte comparison、回执 | 只消费闭合结果，不重读 primitive |

runtime ledger 必须记录 anchor-complete、primitive-read、Layer A 与 Layer B 事件，机械证明所有真实读取均在
P4、次数等于 runtime available rows、zero phase violation。不得预填行数、给 not-applicable 行伪造 event，
或只记录 wrapper 而遗漏 alias/helper/direct length read。

`evaluation_order_gate` 恰七键且按此顺序：

```text
phase_order
first_primitive_after_gr8_gr9_anchors
structural_split_before_current_layer_a
current_layer_a_before_current_layer_b
phase_violations
order_verified_from_runtime_events
order_claims_hardcoded
```

前三条实质顺序布尔必须调用 ledger；`order_verified_from_runtime_events` 必须复用三条实质布尔并机械核对
event phase/count/violations；`order_claims_hardcoded` 必须只由 whole-source static AST closure 派生。五条
bool claim 的 binding 与 return 都必须是可追溯表达式，不得为 bool literal。

P0 self-provenance 还必须从当前整份 analyzer / validator source 各自证明：

1. P1 type-only、P3 baseline-only、唯一 P4 accessor、all-runtime-read accounting 与 P5→P6→P7 闸仍在执行；
2. 本轮字段只绑定 `invalid_tool_calls`，没有读取 list element 或其它 primitive；
3. accepted source semantic 闸绑定真实 `check_trace()` AST：call extraction、allowed set、membership test、
   `invalid` append 与 direct return key 不能被删、反转、换 key 或架空；
4. `invalid_tool_calls` 不进入 accepted scorer decision locals / `trace.ok`；发布的 scope 事实必须绑定上述
   source AST 派生量；
5. 上述条件、调用与 published-fact provenance 的真实删除或恒真化都会在 P0 / P1、产品读取与 science
   compare 前失败；不得只搜注释、error string、函数名或测试名。

不得新增第四个 structure-gate evidence block或 `evaluation_order_gate` 第八键；self-provenance 可以是非发布
preflight invariant。

## 5. Class closure、两层 gate 与结论顺序

### 5.1 最小 class closure

对任何只依赖 `S_ti` 的 routing function `g`，若每个 `u∈U(c)` 均有 `g(u)=true`，则它必然路由
`K_ti(c)`。因此 `A_ti(c)` 是覆盖 `U(c)` 的唯一 set-inclusion minimum `S_ti`-class-closed additions。

两套实现必须证明 `U(c)⊆A_ti(c)`、不删除 `N(c)`、`K_ti(c)` 对等价类闭合；少任一 positive class 都
留下 G1 unrouted FN，加入不含 `U(c)` 的 class 不能替代 positive class。不得用 greedy、排序、count
大小或跨配置共享 membership 代替定义。

### 5.2 Layer A：single-refinement only

```text
N_ti(c) = N(c) ∪ K_ti(c)
```

- G1：`unrouted_false_negatives == 0`；
- G2：`|N_ti(c)| / 196 < 0.40 ⇔ |N_ti(c)| ≤ 78`；
- G3：四 arm review rate 的 `max-min ≤ 1/10`，只用 exact rational；
- G4：matcher-fixed，与 GR7 原格相同且 pass；
- `trace_invalid_tool_calls_signature_only_all_green=true` 当且仅当同一格四闸全过。

### 5.3 Layer B：anonymous padding 上界

只在不删除 `N_ti(c)` 前提下使用 GR7 已验收闭集：

```text
E = {x ∈ Z^4:
     0 ≤ x_a ≤ denominator_a,
     sum(x) ≤ 78,
     max_a(x_a/denominator_a) - min_a(x_a/denominator_a) ≤ 1/10}
```

令 `l^ti_a(c)=|N_ti(c)∩arm_a|`。存在 `x∈E` 且全部 `x_a≥l^ti_a(c)` 时 Layer B 可行；穷尽 7041
个 vectors，求 minimum final total、minimum padding 与全部 minimum ties。padding 只是匿名整数上界。

### 5.4 固定判定顺序与原因闭集

1. `split_gr9_class_count == 0`：第一步失败；仍闭合 16 格并证明结果与 GR9 相同；
2. 有 split 但 Layer A/B 均 0：只说 refinement 存在但冻结 gates 下不能实现 target；
3. Layer A 至少一格：只说 development class-closed separability exists；
4. Layer A 为 0、Layer B 至少一格：只说仍需 anonymous padding upper bound。

原因闭集：

```text
NO_GR9_CLASS_SPLIT
TRACE_INVALID_TOOL_CALLS_CLASS_COLLISION_EXCEEDS_G2_CAP
TRACE_INVALID_TOOL_CALLS_CLASS_CLOSURE_FAILS_G3
NO_TRACE_INVALID_TOOL_CALLS_G3_PADDING_VECTOR_WITHIN_G2_CAP
POSITIVE_TRACE_INVALID_TOOL_CALLS_CLASS_HAS_SINGLETON_SUPPORT
```

G2/G3 failure 可重叠；Layer B 先判 total >78，否则才判无 padding vector。singleton 是正交 development
overfit 风险，不改变 gate；G4 在 target family 中固定 pass，不新增 G4 reason。

## 6. 起点、branch、worktree 与提交拓扑

- parent / development head：accepted GR13R2 `9b8b1e299d5e80e0cc027a7829a3cb75e8f8c51a`
- projected scientific baseline：accepted GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- branch：`stage0a-wave2-trace-invalid-tool-calls-exact-count-separability-envelope-gr14`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-trace-invalid-tool-calls-exact-count-separability-envelope-gr14`
- 2026-09-20 Codex 已只读确认上述精确 branch（本地与已登记 remote refs）及 worktree path 均不存在；
  执行者创建前必须再次确认，若存在则停止，不删、不覆盖、不复用。
- 从 accepted GR13R2 新建；最终 commit 唯一 parent 必须为 GR13R2，相对 parent 恰一笔 commit。
- rejected GR13 `f206463…`、GR13R1 `0bedadfa…`、GR12 / GR12R1 / GR12R2、GR6、GR3 与 non-ancestry
  siblings 均不得进入 ancestry。
- 不 cherry-pick、merge 或读取 sibling worktree；历史输入只按 full `commit:path` 读取 git object。

三条目标命令全绿后只提交一次，message 固定：

```text
posthoc(stage0a): bound trace-invalid-tool-calls exact-count separability (GR14)
```

不得 merge、tag、fetch、pull、push。

## 7. 唯一允许的 changed paths

相对 GR13R2 必须恰六个新增路径、0 个已有文件修改：

```text
harness/verify_trace_invalid_tool_calls_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-invalid-tool-calls-exact-count-separability-envelope/analyze_trace_invalid_tool_calls_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-invalid-tool-calls-exact-count-separability-envelope/test_trace_invalid_tool_calls_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-invalid-tool-calls-exact-count-separability-envelope/TRACE-INVALID-TOOL-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-invalid-tool-calls-exact-count-separability-envelope/TRACE-INVALID-TOOL-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-invalid-tool-calls-exact-count-separability-envelope/CHECKSUMS-TRACE-INVALID-TOOL-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 目录必须恰五项；CHECKSUMS 只登记 analyzer、test、JSON、REPORT 四项且不自列。不得创建第七件
产物、runtime event file、registry copy、signature table、lookup、candidate 或仓内临时文件。

## 8. 输入、accepted objects 与 scaffold 闭包

### 8.1 完整独立重建

analyzer 与 validator 各自钉死并复核 accepted GR13R2 ancestry 中所需冻结闭包：

- 17 个 development inputs 与五份上游 CHECKSUMS 的反向注册；
- v1.20 freeze 两节；
- GR2A / GR2BR1 / GR2D 三个 accepted sibling 的 21 个 objects；
- GR3R1、GR4、GR5、GR7、GR8、GR9、GR10、GR11、GR12R3、GR13R2 各自 required objects；
- MB 工作树 accepted v1.20 与 MU 只按 GR2BR1 full `commit:path` 物化的不同 module/source SHA；
- 196 行、两轴 verdict schema、k1..k7、mandatory、pass/outcome、冻结 G1–G4；
- GR7 target family 与 7041-vector closure、GR8 bucket、GR9 exact、GR10 registry anchors；
- GR11 / GR12R3 / GR13R2 只做 accepted ancestry/object closure，不读取其 primitive runtime values。

完整 object tables 必须机械求和为 `pinned objects=81  generations=10  siblings=3`，不得写死总数。不得
import 前序 analyzer、validator 或 tests；不得把前序 JSON/REPORT 当 expected；不得复制 row value、target
membership、signature、class membership 或本轮 canonical result。

### 8.2 source semantics 必须先静态闭合

MU source 与它导入 `check_trace` 的冻结 base source必须分别钉死为 full objects：

```text
fae90ecfeed723748b80566b94d473cf25e45d0c:harness/verify_stage0a_v120_wrong_action_matcher_gr2b.py
fae90ecfeed723748b80566b94d473cf25e45d0c:harness/verify_stage0a.py
```

其 SHA-256 依次必须为：

```text
a9d6fcaad174b43a2555c72daf449769183d2902a1827e5be40ba3058862bd65
ce014e0850efc23617387ad01b3154d091abb3a5dfc9d7ccd40671f0b56c7dce
```

P1 在任何 runtime primitive read 前，必须从 base `check_trace()` 的 static AST 证明 §1 的 call extraction、
allowed-set membership、`invalid` list 与 direct return-key binding；从 MU scorer AST 证明该字段不进入
decision locals 或 `trace.ok`。本段 proof 不得读取 list length 或元素。

### 8.3 accepted GR13R2 六对象只作 scaffold / SHA closure

执行者必须从 full `9b8b1e299d5e80e0cc027a7829a3cb75e8f8c51a:path` 自行复核：

```text
886d2d04089a23c4891e5e4a0041182b6d2c903615a0d62e57babe22e1eb8cac  harness/verify_trace_satisfied_exact_count_separability_envelope_wave2.py
3496ef12b1032d008491556623d03a78503b89aade3ed3269eac19f0a7f02346  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/analyze_trace_satisfied_exact_count_separability_envelope_wave2.py
be5a4d6e40bde87bc37dac38df73951869cd3db1e90dc1edf579aca38222fa4d  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/test_trace_satisfied_exact_count_separability_envelope_wave2.py
4b6b12a8dda8e410a34bd5ef986edbc068606e5388676a98bc7d6e065ece5b82  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
4e2f8edc5e45153ad14b6ba69427b6b26001fac1832d0d7f88c4fb07043f730d  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
66f40f567bd4db68ca04992536429bcd4743b7d0eb0eb1adbb08f956976fe0eb  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/CHECKSUMS-TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

三份 Python object 可作为 P0–P8、self-provenance、independent validator 与 mutation harness 的机械
scaffold，但必须完整替换并静态证明本轮唯一 primitive/read path。JSON/REPORT/CHECKSUMS 只可 raw-byte
SHA closure，不得解析或 decode 取得 expected science。不得从 GR13R2 sibling worktree 取文件。

## 9. 必须先闭合的 baseline anchors

在第一次 `len(trace.invalid_tool_calls)` 之前，两套实现必须直接重现：

- 256 格、两轴各 128、bit order `k1..k7`、无缺格/重格；
- GR5 baseline all-green 0；G1/G2/G3/G4 passing `32/132/16/128`；
- GR7 denominators `56/56/56/28`、G2 cap 78、G3 ratio `1/10`、vectors 7041；
- GR7 G1–G3 envelope feasible 48、oracle-all-green 16；MB `32/0`、MU `16/16`；
- k7-off feasible/all-green `48/16`，k7-on `0/0`；target family 恰 16 格且全 MU/k7-off/G4 pass；
- GR8 bucket signature 34 classes、support `1…27`、11 singleton；
- GR8 16 格 collision 恒 42、final `82…88`、Layer A/B `0/16`；
- GR9 exact signature 34 classes；34 个 bucket classes split/unsplit `0/34`；
- GR9 16 格 collision 恒 42、final `82…88`、Layer A/B `0/16`；
- GR10 source universe 29 paths、43 entries四分 `15/2/19/7`、eligible 7、unknown/unclassified 0；
- `len(trace.invalid_tool_calls)` 恰在 eligible registry；其它六项没有进入本轮 signature/runtime read；
- routing 不改 matcher-fixed fields/G4；k7 AST digest 仍等于 accepted GR5。

任一 anchor 漂移必须在 P4 前退出 2。不得运行前序任务的目标命令。

## 10. 必须发布的 aggregate 结果

JSON 按固定顺序保存 16 格 aggregate table；每格至少包含：

- configuration id、matcher、七位 mask；
- baseline needs_review、GR7 `|U(c)|` 与 GR7 minimum padding anchor；
- signature schema version、projected GR9 class count、本轮 class count、positive class count；
- positive-class support min/max、singleton-positive-class count、`all_positive_classes_support_ge_2`；
- `|A_ti(c)|`、`|U(c)|`、`|E_ti(c)|` 与相对 GR9 collision 42 的 reduction；
- final total 与四 arm aggregate counts（过 k=2 suppression 后才发布）；
- Layer A G1/G2/G3/G4 与 `trace_invalid_tool_calls_signature_only_all_green`；
- Layer B feasibility、minimum final、minimum padding、minimum tie count 与上界布尔；
- reason set、suppression status 与该格 `K_ti⊆K_exact` 证明。

同时发布本轮 class/support/singleton 的全局单维 aggregate、34 个 GR9 classes 的 split/unsplit、本轮
subclass-count 单维分布、16 格 Layer A/B all-green 数、collision/reduction/singleton/blocker min/max/
distribution、minimum ties aggregate、16/16 refinement containment，以及完整 boundary flags。

绝不保存：primitive length value/频表、任一 exact/projected signature tuple/value/digest、positive signature
set、class members、`U/A/E` members、row order/id/hash、正文、绝对路径、其它 primitive values、
arm-conditioned rule 或可回连 join key。

三个 structure-gate evidence blocks 机械重建：`runtime_length_read_closure`、`p1_type_only_closure`、
`order_booleans_derived_from`。不得新增第四块、debug field 或 `evaluation_order_gate` 第八键。

## 11. 唯一允许结论

按 §5.4 只选最具体一条。

若 `split_gr9_class_count == 0`：

> `the preregistered trace.invalid_tool_calls exact-count refinement does not increase development separability beyond GR9`

若有 split，但 Layer A/B 都没有 all-green：

> `the preregistered trace.invalid_tool_calls exact-count refinement increases development separability but cannot realize any GR7 oracle-all-green cell under the frozen gates`

若 Layer A 存在 all-green：

> `trace.invalid_tool_calls exact-count class-closed separability exists on development; no deployable or out-of-sample selector has been identified`

若 Layer A 全失败而 Layer B 存在 all-green：

> `trace.invalid_tool_calls exact-count closure still requires anonymous padding; no deployable selector is closed`

所有结论始终附：

```text
single-preregistered-primitive development-only class-closure upper bound; no field ranking, combination, selector, candidate, configuration, out-of-sample, promotion, or freeze decision
```

REPORT 首行固定：

```text
TRACE.INVALID_TOOL_CALLS EXACT-COUNT SEPARABILITY ENVELOPE ONLY — single-preregistered-primitive development bound; no combination, selector, or candidate
```

末行固定：

```text
GR14 COMPLETE — return to owner before any further primitive, combination, selector, candidate, dataset expansion, or execution
```

## 12. 非识别与边界声明

canonical boundary flags 至少机械发布：

```text
preregistered_primitive="len(trace.invalid_tool_calls)"
preregistration_basis="accepted_source_semantics_only"
uses_gold_for_offline_class_labelling_only=true
single_primitive_only=true
previous_primitive_values_read_or_combined=false
other_eligible_primitives_evaluated=false
primitive_values_saved=false
signature_values_saved=false
positive_signature_lookup_saved=false
field_ranking_performed=false
primitive_combination_tested=false
selector_hypothesis_proposed=false
deployable_selector_identified=false
candidate_verifier_created=false
repair_configuration_selected=false
bucket_or_threshold_search_performed=false
threshold_changed=false
development_only=true
out_of_sample_validity="underdetermined"
hidden_touched=false
model_calls=0
cost_cny=0
promotion_decision="not_made"
freeze_decision="not_made"
```

任一 per-arm class/addition/collision/padding vector 含 `0 < cell < 2`，整个交叉 block 降级为
`suppressed_for_non_identification`；solver 内部精确验证，但数值不得落盘。support distribution 只允许全局
单维 aggregate，不得与 configuration/arm/outcome 拼表。

## 13. Independent validator 与真实负测

validator 必须独立钉死 inputs、commits、两器材、k1..k7、GR7 inverse projection、GR8/GR9 anchors、
GR10 registry、source semantics、P0–P8 ledger、single-slot signature、refinement、16 格 target、class closure、
two-layer gates、canonical JSON/REPORT 与净化边界。不得 import analyzer/tests/previous modules，不得把
delivered JSON/REPORT 当 expected。

测试在 `TemporaryDirectory()` 复制五份 posthoc 产物并黑盒运行 validator；每条 mutation 前先跑
byte-identical control rc 0，再 mutation + re-sign 后要求 rc 2。至少覆盖：

1. primitive 换成其它 eligible 项，或加入 missing / wrong-param / satisfied / 第二项组合；
2. 分桶、cap、round、threshold、truthiness、presence、sum、distinct、hash 或 fallback；
3. 读取 `invalid_tool_calls` element/tool name、computed key、default 或 exception fallback；
4. P1 schema/type helper 取长度，P2/P3 经 alias/helper 提前读取，或绕过唯一 P4 accessor；
5. event 与真实 length 分离、伪 event、重复读取、未记账读取或 not-applicable 记 event；
6. 新槽不在末尾、改变 GR9 旧槽、投影不是纯 drop-last、伪造 baseline anchors；
7. accepted source semantics 漂移：删/反转 `tool not in allowed`、改变 call filter、append binding 或 return key；
8. accepted scorer scope 漂移：让字段进入 `trace.ok` / decision local，或删掉 scope proof；
9. 删除或恒真化 order/read/source/scope gate family；analyzer 与 validator 都须有静态阳性对照，validator
   还须真实 source mutation 且在 product read / rebuild / compare 前失败；
10. 把五条 order claim 任一写成 bool literal，断开 ledger/static provenance，或硬编码 meta booleans；
11. 保存 primitive/signature value、频表、digest、positive lookup、class member 或 inverse mapping；
12. `U(c)` 少 FN/混 gold-fail，class closure 少扩/多塞/删除 existing review，或伪造 containment/split；
13. G2 cap 79、G3 float/adjacent-only/wrong denominator/threshold、7041 closure 漂移；
14. 在 split 前跑 Layer A、在 Layer A 前跑 Layer B，或把 Layer B 冒充 Layer A；
15. 发布 k<2 arm block、identity、正文、绝对/hidden path 或越界结论；
16. field ranking/further hypothesis/combination/selector/candidate/selected config/OOS/promotion/freeze 漂移；
17. 少/多产物、CHECKSUMS 漏项/多项/自列、input/parent object SHA 漂移、81-object count 漂移；
18. REPORT 首尾、结论、owner-decision、普通事实行、JSON key order/indent/trailing newline 漂移。

负测后五份工作树产物、validator、HEAD 与六 SHA 不得漂移；stderr 单行净化，不回显路径、primitive
value、signature、identity、正文或 traceback。

## 14. 目标命令

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-trace-invalid-tool-calls-exact-count-separability-envelope/test_trace_invalid_tool_calls_exact_count_separability_envelope_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-trace-invalid-tool-calls-exact-count-separability-envelope/analyze_trace_invalid_tool_calls_exact_count_separability_envelope_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_trace_invalid_tool_calls_exact_count_separability_envelope_wave2.py
```

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行 GR13R2、
rejected GR13 / GR13R1、GR12R3、GR11 或更早任务的目标命令，不得运行 `pytest harness/` 整目录、旧
sweep/rescore/probe、模型 runner、正式 development、样本外、G0 或 hidden。

## 15. 回执与停止条件

回执必须给出：

- branch/worktree/commit/唯一 parent、相对 GR13R2 六个 `A` / 0 个 `M`、ancestry/tag/status；
- 六 changed paths 与 SHA、posthoc 五项、CHECKSUMS 四项闭包；
- 完整冻结 inputs/accepted objects、机械 `81/10/3` summary 与 GR13R2 六对象双侧 SHA closure；
- 两器材、GR7 256 格/7041 closure/16 target、GR8/GR9/GR10 anchors 的独立重建；
- `invalid_tool_calls` accepted-source semantics、scorer scope、single accessor、P1 type-only、P2/P3
  baseline-only 与 P4 all-read closure；
- P0–P8 ledger、五条 derived order claims、gate-deletion/constant-true/source-drift positive controls，以及
  所有黑盒 mutation 的 control rc 0 / mutation rc 2 与失败 stage；
- drop-last projection、class containment、split、16 格 `U/K/A/E` aggregate、Layer A/B、collision
  reduction、singleton、blocker、k=2 suppression 与唯一结论；
- 三条目标命令原始结论，以及测试后 HEAD/status/tag/六 SHA 无漂移、无 `__pycache__` / `*.pyc` / temp
  candidate。

唯一 commit 完成后立即停止并返回 owner。不得继续下一 primitive、组合、selector、candidate、GR15、
hidden、样本外、模型、费用、promotion、freeze、G0、正式运行或任何远端操作。不得调用 subagent。
