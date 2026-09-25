# Claude Code 任务书 —— Stage 0-a development wave2 · GR13 trace-satisfied exact-count separability envelope

> **状态：COMPLETE — 2026-09-16 Codex 验收 verdict `Redo`。**
>
> **验收提交：** `f206463d9cebc3081d2ad4bde189569d4aa3217f`（唯一 parent
> `0ecd8d15a6eed905394791a9292faf640fe4ca2b`）。拓扑、六产物、P0–P8、科学 aggregate 与三条目标命令
> 闭合；canonical conclusion detail 错称 16 格全部越过 G2、commits map 跳过 GR11、validator 69-object
> 摘要漏计 GR11，且回执所称 scorer-scope REPORT / 四条 mutation closure 未兑现，故不进入 accepted chain。
>
> **后续：** 唯一 ACTIVE 纠正任务书为
> `docs/TASKBOOK-STAGE0A-GR13R1-DEVELOPMENT-TRACE-SATISFIED-FACTUAL-CLOSURE-CORRECTION-2026-09-16.md`。
> 本任务书已归档，不得作为开工入口。
>
> **唯一交付：** 在任何本轮逐行 primitive value、class、collision 或 gate 结果产生前，预注册且只检验
> `len(trace.satisfied)` 这一项 content-blind primitive。把它作为 GR9
> `machine_observable_exact_count_shape_v1` 的唯一新增末槽，机械判断该单一 refinement 能否切分 GR9
> 等价类，并能否在 GR7 同一组 16 个 development gold-oracle all-green target cells 中产生至少一格
> class-closed all-green；另行发布 anonymous arm-count padding 的更弱上界。
>
> **这是第三个彼此隔离的单 primitive study，不是三项组合或 sweep。** GR11 已单独检验
> `len(trace.missing)`，GR12R3 已单独检验 `len(trace.wrong_param_calls)`；本轮 signature 不得读取、复算、
> 拼接或比较那两项的 runtime value。它们只作为 accepted ancestry / object closure 存在。
>
> **选择依据只来自 accepted source semantics：** `check_trace` 在同一轮 required-call 遍历中，仅当某个
> required call 找到 tool+args 匹配时向 `satisfied` append；`missing` 是相反分支，而已表示的 `trace.ok`
> 只由 `not missing` 构造。因此 `len(trace.satisfied)` 是对正确工具调用覆盖量的最小一维 exact-count
> refinement。该选择不来自任何运行时值、频率、support、gold 效果、GR10 registry 顺序或前两项结果，
> 不构成对余下 primitive 的排名、淘汰或推荐。
>
> **授权来源：** owner 于 2026-09-15 在 GR12R3 `Accept`、归档并返回 owner decision 后明确
> “下发下一个任务”。Codex 将其收敛为本单 primitive、单 signature、development-only、零费用 GR13。
> 授权包括用既有钉死 development gold 做离线 class labelling 与冻结 G1–G4 可分性上界；不包括第四
> primitive、任意 primitive 组合、bucket/cap/threshold、selector、candidate、样本外、hidden、模型/API、
> 费用、正式运行、promotion、freeze、G0、远端操作或 GR14。

## 1. 为什么是这一项

GR9 已证明：在 GR8 固定字段集内，把六个 bucketed list counts 全部细化成 exact lengths，仍没有切分
任何 class；16 个 target cell 的 collision 与 Layer A / B 均未改善。GR10 随后只登记七项结构上合格、
尚未检验的 content-blind primitives，没有读取其值或做效果排名。GR11 与 GR12R3 又各自隔离检验一项，
均不授权把单项结果拼成组合。

本任务在看任何新结果前只锁定：

```text
trace_satisfied_exact_count_refinement_v1 := len(verdict["trace"]["satisfied"])
```

accepted source 对每个 required call 只在 tool 与 required args 匹配时向 `satisfied` append；这使它成为
“已经满足多少个 required calls”的直接机器计数。它不是 identity、自由文本、list element、bucket、
threshold 或动态派生字段，且在 GR10 的 frozen grammar 中已登记为 `structurally_eligible_untested`。

预注册假设固定为：

> `len(trace.satisfied)` may split one or more GR9 classes and may reduce the mandatory class-closure collision enough
> for at least one of the 16 frozen development target cells to satisfy the frozen gates.

该假设允许全盘失败。失败不授权换字段、试组合或调阈值；成功也只证明 development class-closed
separability，不产生 deployable rule。

## 2. 唯一问题、完成定义与非目标

### 2.1 唯一问题

对 GR7 独立重建的固定 target family：

```text
T_GR7 = { c : GR7.oracle_all_green_feasible(c) = true }
```

先机械确认 `|T_GR7|=16`，且全部 `matcher=MU`、`k7_selected=false`、原始 G4 pass。不得从任何前序
JSON / REPORT 复制逐格 membership、signature、class 或 expected current result。

对每个 `c ∈ T_GR7`：

1. 直接重建 GR7 的 `N(c)`、mandatory `M`、false negatives `F` 与 `U(c)=F\(N(c)∪M)`；
2. 对每行先构造 GR9 `S_exact(r)`，再且只追加 §3 的单一末槽，得到 `S_ts(r)`；
3. 由纯投影 `drop_last(S_ts(r))` 重建 `S_exact(r)`，证明旧 15 槽逐槽未变；
4. 令 `Q_ts(c)={S_ts(u):u∈U(c)}`，`K_ts(c)={r:S_ts(r)∈Q_ts(c)}`；
5. 计算 `A_ts(c)=K_ts(c)\N(c)` 与 collision `E_ts(c)=A_ts(c)\U(c)`；
6. 以 `N_ts(c)=N(c)∪K_ts(c)` 重算冻结 G1/G2/G3；G4 与 GR7 原格相同；
7. 以 `N_ts(c)` 为 lower bound，沿 GR7 的 7041-vector exact closure 判断 anonymous padding 上界；
8. 只发布 aggregate refinement/class/collision/gate 结果，不保存 primitive value、signature value、
   positive lookup、class member、row identity 或 join key。

### 2.2 完成定义

analyzer 与 independent validator 必须各自从钉死 git objects 直接重建两份器材、GR7 256 格与
7041-vector closure、16 格 target family、GR8 / GR9 anchors、本轮单槽 signature、class closure 与两层
gates。两套实现不得共享可执行代码、cache 或 runtime event file；canonical JSON / REPORT 必须逐字节
相同。

本轮必须从一开始保留 GR12R3 已纠正的全部 read/order provenance：P1 只做 key/type closure，所有真实
`len(trace.satisfied)` 第一次且只在 P4 canonical accessor 内发生；P5 structural split、P6 Layer A、P7
Layer B；五条 order claims 均为机械 binding，不得写死。三条目标命令全绿并提交唯一一笔 commit 后立即
停止并返回 owner。

### 2.3 非目标

本任务不做：

- 读取、复算、保存或比较 `len(trace.missing)`、`len(trace.wrong_param_calls)` 或其余四项 eligible
  primitive 的逐行值；
- primitive/field sweep、排名、选择、推荐、组合、交互项、bucket/cap/threshold 搜索；
- selector hypothesis、routing rule、candidate verifier、k8、第二 matcher 或 configuration 选择；
- 读取任一 list element、tool/args/failure-path string、answer/episode/trace/rubric 正文或逐行身份；
- validation/out-of-sample/hidden/G0、模型调用、费用、promotion、freeze 或正式执行；
- 修改 accepted commit、冻结件、matcher、routing/component、threshold、gold、rubric、runner、protocol、
  `EXECUTION_POLICY.md` 或 Knote handoff。

## 3. 预注册 signature 与唯一允许关系

### 3.1 单槽 refinement

新 signature 固定为：

```text
machine_observable_exact_count_shape_plus_trace_satisfied_v1
```

逐槽保留 GR9 `machine_observable_exact_count_shape_v1`，只在末尾追加：

```text
trace_satisfied_count =
  ("available", exact nonnegative len(trace["satisfied"]))
    iff type(trace) is dict,
        "satisfied" is a direct key,
        and type(trace["satisfied"]) is list
  ("not_applicable",)
    iff the already accepted GR9 schema path makes trace unavailable
```

合法 malformed verdict 仍走 GR9 的 malformed schema；新增末槽固定为 `("not_applicable",)`。缺 key、
错误类型、bool/int 混淆、异常或负值不得静默降为 `0` / empty / not-applicable。除 accepted schema 明确
定义的 unavailable path 外，任何不匹配都必须在结果产生前 rc 2。

analyzer 与 validator 必须各自只有一个 canonical `S_ts` 函数和一个 canonical P4 length accessor。
全源码 AST gate 必须钉死：

- 唯一新增读取路径恰为 direct `trace.satisfied`；
- 唯一新增变换恰为 built-in list length，且不迭代、索引、切片、排序、集合化或读取元素；
- 不读取 registry 的另外六项，不使用 computed key、`.get(..., default)`、truthiness fallback、
  `eval/exec`、helper-injected value 或结果依赖分支；
- 新槽只能在旧 tuple 末尾；旧槽数量、顺序、值与类型逐字节不变；
- accessor 在真实 `len` 前检查 P4 phase，event 紧贴读取之后；not-applicable 行不得记 primitive-read。

两套实现各自重算 canonical AST digest 并要求相同，但 digest 不写入交付物。

### 3.2 对 GR9 的纯投影与 refinement 证书

唯一允许投影为：

```text
P_ts(S_ts) := drop exactly the final trace_satisfied_count slot
```

逐行证明 `P_ts(S_ts(r)) == S_exact(r)`，并验证：

- 196 行 projected class partition 重现 GR9 的 34 classes、support anchors 与 16 格 closure；
- `S_ts(r1)=S_ts(r2) ⇒ S_exact(r1)=S_exact(r2)`；
- 每个 `S_ts` class 完整嵌套于唯一 GR9 class，全部 support 之和为 196；
- 每个 target cell 都有 `K_ts(c) ⊆ K_exact(c)`；
- 不构造或保存 `S_exact→S_ts`、count→row、positive-class 或任何逆向 lookup。

不得从 GR9 / GR11 / GR12R3 JSON、REPORT 或源代码复制本轮 result、target membership、signature 或 class。

### 3.3 绝对禁止读取面

`S_ts`、`S_exact` 与投影不得读取、派生、拼接、hash、比较或按条件间接访问：

- `gold_pass`、gold label、`U(c)` membership（signature 构造完成后的 offline labelling 除外）；
- arm、`carries_memory`、configuration id/mask；
- run/episode/blind id、row index、排序位置、join key、时间戳；
- answer/episode/trace/rubric 正文、任一 list element、tool/args/failure-path string；
- `trace.missing`、`trace.wrong_param_calls` 与其余 eligible primitive 的 runtime value；
- 文件路径、SHA、commit、随机数、环境变量、网络、模型/API、数据库、hidden 或 sibling worktree。

gold 只可在 signature 全部构造并封闭后用于 `U(c)` offline class labelling。所有 signature 与 exact count
只在内存中作为等价类 key，不得回显到 JSON、REPORT、CHECKSUMS、stderr 或测试名。

## 4. 强制 evaluation order 与 provenance

两套实现各自执行以下 P0–P8，不得把阶段名当注释而让实际调用越序：

| phase | 允许动作 | 本轮 primitive 限制 |
|---|---|---|
| P0 | 自身源码 AST、禁止 import/field/read closure、order-claim static gate | 不打开 runtime inputs，不取值 |
| P1 | pinned objects、source/schema keyset 与 exact type identity | 可证 `trace.satisfied` 为 direct list；不得 `len`/`bool`/iter/hash/compare/index/slice/set |
| P2 | 独立重建两器材、GR7 256 格、7041 vectors 与 16 格 target | baseline-only，不可达 length accessor |
| P3 | 独立重建 GR8 bucket 与 GR9 exact anchors、drop-last baseline | baseline-only，不可达 length accessor |
| P4 | 唯一 accessor 逐 available row 恰一次读取长度并构造 `S_ts` | 首次真实 primitive value 只在此发生 |
| P5 | structural split / class containment / projected anchors | 必须先于任何 current Layer A |
| P6 | 全部 current Layer A 与 aggregate verdict | 必须在 P5 完成后且先于 P7 |
| P7 | 全部 current Layer B / 7041-vector padding closure | 不得反哺 split 或 Layer A |
| P8 | canonical render、delivered byte comparison、回执 | 只消费已闭合结果，不重读 primitive |

runtime ledger 必须记录 anchor-complete、primitive-read、Layer A 与 Layer B 事件，机械证明所有真实读取均
在 P4、读数次数等于 runtime available rows、zero phase violation。不得预填 `196`、给 not-applicable 行
伪造 event，或只记录外层 wrapper 而遗漏其它 direct `len`。

`evaluation_order_gate` 必须恰七键且按此顺序：

```text
phase_order
first_primitive_after_gr8_gr9_anchors
structural_split_before_current_layer_a
current_layer_a_before_current_layer_b
phase_violations
order_verified_from_runtime_events
order_claims_hardcoded
```

前三条实质顺序布尔必须调用 ledger；`order_verified_from_runtime_events` 必须复用三条实质布尔并机械
核对 event phase/count/violations；`order_claims_hardcoded` 必须只由 `read_own_source`、
`static_order_claim_provenance`、`order_provenance_is_clean` 的 whole-source AST closure 派生，且不得引用
本轮运行结果。五条 bool claim 的 binding 与 return 必须是对应 `ast.Name` provenance，不得是 bool
`Constant`。

static closure 继续机械求并钉死：

```text
order_gate_definitions = 1
substantive_claims_bound_to_ledger = 3
bool_literals_in_claim_bindings = 0
claim_keys_returned_as_bindings = 5
```

对五个 claim binding 逐个 AST 改写为字面 `True` 的阳性对照必须全部报脏。任一 P0–P3 length read、
未记账读取、重复读取、绕过 accessor、伪 event、越序或硬编码 order claim，都必须在比较科学结论前 rc 2。

## 5. Class closure、两层 gate 与判定顺序

### 5.1 最小 class closure

对任何只依赖 `S_ts` 的 routing function `g`，若每个 `u∈U(c)` 均有 `g(u)=true`，则它必然路由
`K_ts(c)`。因此 `A_ts(c)` 是覆盖 `U(c)` 的唯一 set-inclusion minimum `S_ts`-class-closed additions。

两套实现必须证明 `U(c)⊆A_ts(c)`、不删除 `N(c)`、`K_ts(c)` 对等价类闭合；少任一 positive class
都会留下 G1 unrouted FN，而任意不含 `U(c)` 的 class 不能替代 positive class。不得用 greedy、排序、
count 大小或跨配置共享 membership 代替定义。

### 5.2 Layer A：single-refinement only

```text
N_ts(c) = N(c) ∪ K_ts(c)
```

- G1：`unrouted_false_negatives == 0`；
- G2：`|N_ts(c)| / 196 < 0.40 ⇔ |N_ts(c)| ≤ 78`；
- G3：四 arm review rate 的 `max-min ≤ 1/10`，只用 exact rational；
- G4：matcher-fixed，与 GR7 原格相同且 pass；
- `trace_satisfied_signature_only_all_green=true` 当且仅当同一格四闸全过。

### 5.3 Layer B：anonymous padding 上界

只在不删除 `N_ts(c)` 前提下使用 GR7 已验收闭集：

```text
E = {x ∈ Z^4:
     0 ≤ x_a ≤ denominator_a,
     sum(x) ≤ 78,
     max_a(x_a/denominator_a) - min_a(x_a/denominator_a) ≤ 1/10}
```

令 `l^ts_a(c)=|N_ts(c)∩arm_a|`。存在 `x∈E` 且全部 `x_a≥l^ts_a(c)` 时 Layer B 可行；必须穷尽
7041 个 vectors，求 minimum final total、minimum padding 与全部 minimum ties。padding 只是匿名整数
上界，不得编码内容、signature、row 或 configuration preference。

### 5.4 固定判定顺序与原因闭集

1. `split_gr9_class_count == 0`：第一步失败；仍闭合 16 格并证明结果与 GR9 相同；
2. 有 split 但 Layer A/B 均 0：只说 refinement 存在但冻结 gates 下不能实现 target；
3. Layer A 至少一格：只说 development class-closed separability exists；
4. Layer A 为 0、Layer B 至少一格：只说仍需 anonymous padding upper bound。

原因闭集：

```text
NO_GR9_CLASS_SPLIT
TRACE_SATISFIED_CLASS_COLLISION_EXCEEDS_G2_CAP
TRACE_SATISFIED_CLASS_CLOSURE_FAILS_G3
NO_TRACE_SATISFIED_G3_PADDING_VECTOR_WITHIN_G2_CAP
POSITIVE_TRACE_SATISFIED_CLASS_HAS_SINGLETON_SUPPORT
```

Layer A 的 G2/G3 failure 可重叠；Layer B 先判 total >78，否则才判无 padding vector。singleton 是正交
development overfit 风险，不改变 gate；G4 在 target family 中固定 pass，不新增 G4 reason。

## 6. 起点、branch、worktree 与提交拓扑

- parent / development head：accepted GR12R3 `0ecd8d15a6eed905394791a9292faf640fe4ca2b`
- projected scientific baseline：accepted GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- branch：`stage0a-wave2-trace-satisfied-exact-count-separability-envelope-gr13`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-trace-satisfied-exact-count-separability-envelope-gr13`
- 2026-09-15 Codex 已只读确认上述精确 branch 与 worktree path 均不存在；执行者创建前必须再次确认。
- 从 accepted GR12R3 新建；最终 commit 唯一 parent 必须为 GR12R3，相对 parent 恰一笔 commit。
- rejected GR12 `5e97492…`、GR12R1 `a0bdb775…`、GR12R2 `e11a589…`、GR6、GR3 与 non-ancestry
  siblings 均不得进入 ancestry。
- 不 cherry-pick、merge 或读取 sibling worktree；历史输入只按 full `commit:path` 读取 git object。

三条目标命令全绿后只提交一次，message 固定为：

```text
posthoc(stage0a): bound trace-satisfied exact-count separability (GR13)
```

不得 merge、tag、fetch、pull、push。

## 7. 唯一允许的 changed paths

相对 GR12R3 必须恰六个新增路径、0 个已有文件修改：

```text
harness/verify_trace_satisfied_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/analyze_trace_satisfied_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/test_trace_satisfied_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/CHECKSUMS-TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 目录必须恰五项；CHECKSUMS 只登记 analyzer、test、JSON、REPORT 四项且不自列。不得创建 formula
lock、registry copy、signature table、runtime event file、positive-class manifest、第七件产物或仓内临时文件。

## 8. 输入、accepted objects 与 scaffold 闭包

### 8.1 完整独立重建

analyzer 与 validator 各自钉死并复核 accepted GR12R3 ancestry 中本任务所需的完整冻结闭包：

- 17 个 development inputs 与五份上游 CHECKSUMS 的反向注册；
- v1.20 freeze 两节；
- GR2A / GR2BR1 / GR2D 三个 accepted sibling 的 21 个 objects；
- GR3R1、GR4、GR5、GR7、GR8、GR9、GR10、GR11、GR12R3 各自 required objects；
- MB 工作树 accepted v1.20 与 MU 只按 GR2BR1 full `commit:path` 物化的不同 module/source SHA；
- 196 行、两轴 verdict schema、k1..k7、mandatory、pass/outcome、冻结 G1–G4；
- GR7 target family 与 7041-vector closure、GR8 bucket anchors、GR9 exact-count anchors；
- GR10 source-AST schema universe 与七项资格 registry，但只允许本轮 `trace.satisfied` 产生 runtime value。

不得 import 前序 analyzer、validator 或 tests；不得把前序 JSON/REPORT 当 expected document；不得从前序
artifacts 复制 row value、target membership、signature、class membership 或本轮 canonical result。

### 8.2 source semantics 必须先静态闭合

MU source 与它导入 `check_trace` 的冻结 base source 必须分别钉死为 full objects：

```text
fae90ecfeed723748b80566b94d473cf25e45d0c:harness/verify_stage0a_v120_wrong_action_matcher_gr2b.py
fae90ecfeed723748b80566b94d473cf25e45d0c:harness/verify_stage0a.py
```

其 SHA-256 依次必须为：

```text
a9d6fcaad174b43a2555c72daf449769183d2902a1827e5be40ba3058862bd65
ce014e0850efc23617387ad01b3154d091abb3a5dfc9d7ccd40671f0b56c7dce
```

MU module 必须继续以冻结 import closure 使用该 base `check_trace`。base source 中 `check_trace` 的 static
AST 必须在 P1、任何 runtime primitive read 之前证明：`satisfied` / `missing` / `wrong_param` 三个 direct
list bindings；对每个 `must` 只由 `_args_match` 的 match branch 向 `satisfied` append、else branch 向
`missing` append；return direct key `satisfied` 绑定该 list。不得把本段 source semantic proof 变成读取
list length 或元素的借口。

### 8.3 accepted GR12R3 六对象只作 source scaffold / SHA closure

执行者必须从 full `0ecd8d15a6eed905394791a9292faf640fe4ca2b:path` 自行复核：

```text
efdab05bfa02fd7fcec357330d90806d48f9d0634d7c369e23b86ef5ea04582c  harness/verify_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
7fd568c4439d10719de1546c30e22183f1fc4177b909383527cbdb0130902f28  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/analyze_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
2b3a1043b2fa0d6eeb6958a281439df42f83a198dd405d3a723b7a6e51317147  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/test_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
be19847ef536f2af8cb6f52d908afdab11b237352c87fe6e968f866236854ad3  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
aa0cdc53132f0f9803072eb1d25b211151127004a0f92b69ba82ed7fca527eb2  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
152075a2bb4617ff1786b8d7a0326e855713917225e762740bea54bc4fc46808  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/CHECKSUMS-TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

三份 Python object 可作为 P0–P8、独立 validator 与 mutation harness 的机械 scaffold，但必须完整替换并
静态证明本轮唯一 primitive/read path。JSON/REPORT/CHECKSUMS 只可 raw-byte SHA closure，不得解析或
decode 取得 expected result。不得从 GR12R3 sibling worktree 取文件。

## 9. 必须先闭合的 baseline anchors

在第一次 `len(trace.satisfied)` 之前，两套实现必须直接重现：

- 256 格、两轴各 128、bit order `k1..k7`、无缺格/重格；
- GR5 baseline all-green 0；G1/G2/G3/G4 passing `32/132/16/128`；
- GR7 denominators `56/56/56/28`、G2 cap 78、G3 ratio `1/10`、vectors 7041；
- GR7 G1–G3 envelope feasible 48、oracle-all-green 16；MB `32/0`、MU `16/16`；
- k7-off feasible/all-green `48/16`，k7-on `0/0`；target family 恰 16 格且全 MU/k7-off/G4 pass；
- GR8 bucket signature 34 classes、support `1…27`、11 singleton；
- GR8 16 格 collision 恒 42、final `82…88`、Layer A/B `0/16`；
- GR9 exact signature 34 classes；34 个 bucket classes split/unsplit `0/34`；
- GR9 16 格 collision 恒 42、final `82…88`、Layer A/B `0/16`；
- GR10 source universe 29 paths、43 entries 四分 `15/2/19/7`、eligible 7、unknown/unclassified 0；
- `len(trace.satisfied)` 恰在 eligible registry；另外六项没有进入本轮 signature/runtime read；
- routing 不改 matcher-fixed fields/G4；k7 AST digest 仍等于 accepted GR5。

GR11 与 GR12R3 只做 parent/object/topology closure，不重跑其目标命令，不读取或重算它们的 primitive
runtime values。任一 anchor 漂移必须在 P4 之前退出 2。

## 10. 必须发布的结果

JSON 按固定顺序保存 16 格 aggregate table；每格至少包含：

- configuration id、matcher、七位 mask；
- baseline needs_review、GR7 `|U(c)|` 与 GR7 minimum padding anchor；
- signature schema version、projected GR9 class count、本轮 class count、positive class count；
- positive-class support min/max、singleton-positive-class count、`all_positive_classes_support_ge_2`；
- `|A_ts(c)|`、`|U(c)|`、`|E_ts(c)|` 与相对 GR9 collision 42 的 reduction；
- final total 与四 arm aggregate counts（过 k=2 suppression 后才发布）；
- Layer A G1/G2/G3/G4 与 `trace_satisfied_signature_only_all_green`；
- Layer B feasibility、minimum final、minimum padding、minimum tie count 与上界布尔；
- reason set、suppression status 与该格 `K_ts⊆K_exact` 证明。

同时发布本轮 class/support/singleton 的全局单维 aggregate、34 个 GR9 classes 的 split/unsplit、本轮
subclass-count 单维分布、16 格 Layer A/B all-green 数、collision/reduction/singleton/blocker min/max/
distribution、minimum ties aggregate、16/16 refinement containment，以及完整 boundary flags。

绝不保存：`trace.satisfied` length value/频表、任一 exact/projected signature tuple/value/digest、positive
signature set、class members、`U/A/E` members、row order/id/hash、正文、绝对路径、其它 primitive values、
arm-conditioned rule 或可回连 join key。

三个 structure-gate evidence blocks沿用并机械重建：`runtime_length_read_closure`、
`p1_type_only_closure`、`order_booleans_derived_from`。不得新增第四块、debug field 或
`evaluation_order_gate` 第八键。

## 11. 唯一允许结论

按 §5.4 只选最具体一条。

若 `split_gr9_class_count == 0`：

> `the preregistered trace.satisfied exact-count refinement does not increase development separability beyond GR9`

若有 split，但 Layer A/B 都没有 all-green：

> `the preregistered trace.satisfied exact-count refinement increases development separability but cannot realize any GR7 oracle-all-green cell under the frozen gates`

若 Layer A 存在 all-green：

> `trace.satisfied exact-count class-closed separability exists on development; no deployable or out-of-sample selector has been identified`

若 Layer A 全失败而 Layer B 存在 all-green：

> `trace.satisfied exact-count closure still requires anonymous padding; no deployable selector is closed`

所有结论始终附：

```text
single-preregistered-primitive development-only class-closure upper bound; no field ranking, combination, selector, candidate, configuration, out-of-sample, promotion, or freeze decision
```

REPORT 首行固定为：

```text
TRACE.SATISFIED EXACT-COUNT SEPARABILITY ENVELOPE ONLY — single-preregistered-primitive development bound; no combination, selector, or candidate
```

末行固定为：

```text
GR13 COMPLETE — return to owner before any fourth primitive, combination, selector, candidate, dataset expansion, or execution
```

## 12. 非识别、边界声明与静态闸

- `preregistered_primitive="len(trace.satisfied)"`
- `preregistration_basis="accepted_source_semantics_only"`
- `uses_gold_for_offline_class_labelling_only=true`
- `single_primitive_only=true`
- `previous_primitive_values_read_or_combined=false`
- `other_eligible_primitives_evaluated=false`
- `primitive_values_saved=false`
- `signature_values_saved=false`
- `positive_signature_lookup_saved=false`
- `field_ranking_performed=false`
- `primitive_combination_tested=false`
- `selector_hypothesis_proposed=false`
- `deployable_selector_identified=false`
- `candidate_verifier_created=false`
- `repair_configuration_selected=false`
- `bucket_or_threshold_search_performed=false`
- `threshold_changed=false`
- `development_only=true`
- `out_of_sample_validity="underdetermined"`
- `hidden_touched=false`
- `model_calls=0`
- `cost_cny=0`
- `promotion_decision="not_made"`
- `freeze_decision="not_made"`

任一 per-arm class/addition/collision/padding vector 含 `0 < cell < 2`，整个交叉 block 降级为
`suppressed_for_non_identification`。solver 内部仍精确验证，但数值不得落盘。support distribution 只允许
全局单维 aggregate，不得与 configuration/arm/outcome 拼表。

analyzer/validator AST 必须拒绝动态 `eval/exec`、网络、模型 runner、递归目录遍历/glob、hidden、随机
选择、member/signature 常量表、list element access、另外六项 primitive、禁用字段、结果驱动的
field/threshold branch 或 import 前序任务模块。validator 不得写仓库；analyzer 只可在显式 `--generate`
下无覆盖地写本轮三产物，`--check-existing` 必须严格只读。固定 posthoc 目录的 `os.listdir` 只允许用于
五产物闭包与 candidate-verifier gate。

## 13. Independent validator 与真实负测

`harness/verify_trace_satisfied_exact_count_separability_envelope_wave2.py` 必须独立钉死 inputs、commits、
两器材、k1..k7、GR7 inverse projection、GR8/GR9 anchors、GR10 registry、source semantics、P0–P8 runtime
ledger、single-slot signature、refinement、16 格 target、class closure、two-layer gates、canonical JSON/
REPORT 与净化边界。不得 import analyzer/tests/previous modules，不得把 delivered JSON/REPORT 当 expected。

测试在 `TemporaryDirectory()` 复制五份 posthoc 产物并黑盒运行 validator；每条 mutation 前先跑
byte-identical control rc 0，再 mutation + re-sign，要求 rc 2。至少覆盖：

1. 把 primitive 换成 registry 其它任一项，或加入 `trace.missing` / `trace.wrong_param_calls` / 第二项组合；
2. 分桶、cap、round、threshold，或改用 truthiness/presence/sum/distinct；
3. 读取 `trace.satisfied` element/tool/args string，computed key、default 或 exception fallback；
4. P1 schema/type helper 取长度、bool、iter、compare，或 P2/P3 经 alias/helper 提前读取；
5. 绕过唯一 P4 accessor、让 event 与真实 `len` 分离、伪 event、重复读取或 not-applicable 记 event；
6. 全源码出现第二个 direct/alias `len(trace.satisfied)`，即使 canonical helper 仍正确；
7. 新槽不在末尾、改变 GR9 旧槽、投影不是纯 drop-last、伪造 34-class anchors；
8. 保存 primitive/signature value、频表、digest、positive lookup、class members 或 inverse mapping；
9. `U(c)` 少 FN/混 gold-fail/重复 mandatory-only FN，或 class closure 少扩/多塞/删除 existing review；
10. 伪造 containment/minimum closure/split/collision reduction，或改变 16 格 target/G4/k7；
11. G2 cap 79、G3 float/adjacent-only/wrong denominator/threshold、7041 closure 漂移；
12. 在 structural split 前跑 current Layer A，或在 Layer A 前跑 Layer B；
13. 将五条 order binding/return 任一写成 bool literal，断开 ledger/static provenance，或架空阳性对照；
14. `order_verified_from_runtime_events` 不复用三条 substantive claims/event counts，或
    `order_claims_hardcoded` 引用 runtime/current booleans；
15. 把 Layer B 冒充 Layer A、伪造 padding/ties、跳过固定判定顺序；
16. 发布 k<2 arm block、identity、正文、模型、绝对/hidden path 或越界结论；
17. field ranking/fourth hypothesis/combination/selector/candidate/selected config/OOS/promotion/freeze 边界漂移；
18. 少/多产物、CHECKSUMS 漏项/多项/自列、input/parent object SHA 漂移或浮动 ref；
19. REPORT 首尾、结论、owner-decision、普通事实行、JSON key order/indent/trailing newline 漂移。

负测后五份工作树产物 SHA 必须与导入快照一致；stderr 必须单行净化，不回显待验值、路径、identity、
signature、exact count、正文或 traceback。

## 14. 目标命令

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/test_trace_satisfied_exact_count_separability_envelope_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/analyze_trace_satisfied_exact_count_separability_envelope_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_trace_satisfied_exact_count_separability_envelope_wave2.py
```

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行 GR12R3、GR11
或任何更早任务的目标命令，不得运行 `pytest harness/` 整目录、旧 sweep/rescore/probe、模型 runner、
正式 development、样本外、G0 或 hidden。

## 15. 回执与停止条件

回执必须给出：

- branch/worktree/commit/唯一 parent、相对 GR12R3 六个 `A` / 0 个 `M`、ancestry/reflog/tag/status；
- 六 changed paths 与 SHA、posthoc 五项、CHECKSUMS 四项闭包；
- 完整冻结 inputs/accepted objects 与 GR12R3 六对象在 commit/worktree 两侧的 SHA closure；
- 两器材、GR7 256 格/7041 closure/16 target、GR8/GR9/GR10 anchors 的独立重建；
- `trace.satisfied` source semantics、single accessor、P1 type-only、P2/P3 baseline-only 与 P4 all-read closure；
- P0–P8 ledger、五条 derived order claims、static positive controls 与所有 control rc 0/mutation rc 2；
- drop-last projection、class containment、split、16 格 `U/K/A/E` aggregate、Layer A/B、collision reduction、
  singleton、blocker、k=2 suppression 与唯一结论；
- 三条目标命令原始结论，以及测试后 HEAD/status/tag/六 SHA 无漂移、无 `__pycache__`。

唯一 commit 完成后立即停止并返回 owner。不得继续第四 primitive、组合、selector、candidate、GR14、
hidden、样本外、模型、费用、promotion、freeze、G0、正式运行或任何远端操作。
