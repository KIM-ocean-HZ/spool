# Claude Code 任务书 —— Stage 0-a development wave2 · GR12 trace wrong-param-calls exact-count separability envelope

> **状态：COMPLETE — 2026-09-12 Codex 验收 verdict：`Redo`。**
>
> **退回原因：** analyzer 与 independent validator 都在 GR8 / GR9 anchors 闭合前计算了本轮
> `len(trace.wrong_param_calls)`，并在 structural split 判定前计算了 Layer A / B；产物与测试只自报
> 顺序布尔，没有验证真实控制流。数值结果可复现，但没有满足本任务反复钉死的前置顺序门。
>
> **后续纠正任务：**
> `docs/TASKBOOK-STAGE0A-GR12R1-DEVELOPMENT-TRACE-WRONG-PARAM-CALLS-EVALUATION-ORDER-CORRECTION-2026-09-12.md`
>
> **唯一交付：** 在任何本轮逐行 primitive value、class、collision 或 gate 结果产生前，预注册且只检验
> `len(trace.wrong_param_calls)` 这一项 content-blind primitive。把它作为 GR9
> `machine_observable_exact_count_shape_v1` 的唯一新增末槽，机械判断这个单一 refinement 能否切分 GR9
> 等价类，并能否在 GR7 同一组 16 个 development gold-oracle all-green target cells 中产生至少一格
> class-closed all-green；另行发布 anonymous arm-count padding 的更弱上界。
>
> **这是第二个被单独检验的 primitive，不是两个 primitive 的组合。** 本轮 signature 不含 GR11 的
> `len(trace.missing)` 末槽，也不得 import、复用或扩展 GR11 signature。scientific parent 采用 accepted
> GR11 只是提交链与对象闭包；本轮 separability baseline 仍是 accepted GR9 exact-count signature。
>
> **预注册依据只来自 accepted source 语义：** `wrong_param_calls` 初始化为空 list；仅当某个 required
> call 没有被满足时，才对同名工具的已发生调用追加其错误参数尝试。它因此是对 GR9 已有 `trace_state`
> 中失败状态的一种局部、content-blind exact-count refinement。该选择不来自 registry 顺序、runtime
> value、频率、support、gold 效果或 field ranking；其余五个未检验项保持完全未检验。
>
> **授权来源：** owner 于 2026-09-11 在 GR11 `Accept` 后明确“授权创建下一任务”。Codex 将这句收敛为
> 本单 primitive、单 signature、development-only GR12。授权包括用既有钉死 development gold 做离线
> class labelling 与冻结 G1–G4 可分性上界；不包括 `trace.missing + trace.wrong_param_calls` 组合、第三
> primitive、bucket / cap / threshold 搜索、selector、candidate、hidden、样本外、模型/API、费用、
> 正式运行、promotion、freeze、G0、远端操作或 GR12 之后的任务。

## 1. 为什么是这一项

GR11 已证明：`len(trace.missing)` 没有切分 34 个 GR9 class 中的任何一个，16 格的 collision 仍恒为 42，
Layer A / B 均为 `0/16`。该结论只淘汰这一个预注册假设，不构成对 GR10 registry 其余六项的排名。

本任务不按 registry 顺序取“下一项”，而只沿 accepted source 中一个机械、局部的语义分支预注册：

```text
trace_wrong_param_calls_exact_count_refinement_v1 :=
    len(verdict["trace"]["wrong_param_calls"])
```

accepted `check_trace` source 中：

1. `wrong_param_calls` 与 `satisfied`、`missing` 一起初始化为空 list；
2. 只有在当前 required call 没有 exact tool+args match 的 `else` 分支里才可能 append；
3. append 的前提是已发生调用与 required call 的工具名相同，因此它表示“工具方向正确但参数不匹配”的尝试；
4. `trace.ok` 仍只由 `not missing` 决定，`wrong_param_calls` 不直接改变 pass，因此它可能、也可能不可能在
   同一 GR9 `trace_state=not_ok` class 内增加结构区分。

这个语义基础只用于在结果前锁定 primitive，不构成有效性预测。预注册假设固定为：

> `len(trace.wrong_param_calls)` may split one or more GR9 classes and may reduce the mandatory class-closure
> collision enough for at least one of the 16 frozen development target cells to satisfy the frozen gates.

假设允许全盘失败。失败不授权改字段、加入 `trace.missing`、试第三项、分桶、组合或调阈值；成功也只证明
development separability，不产生 deployable rule。

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
2. 对每行构造 GR9 `S_exact(r)`，再只追加 §3 的单一末槽，得到 `S_wp(r)`；
3. 由纯投影 `drop_last(S_wp(r))` 重建 `S_exact(r)`，证明本轮只细化、不改变 GR9 字段；
4. 令 `Q_wp(c)={S_wp(u):u∈U(c)}`，`K_wp(c)={r:S_wp(r)∈Q_wp(c)}`；
5. 计算 `A_wp(c)=K_wp(c)\N(c)` 与 collision `E_wp(c)=A_wp(c)\U(c)`；
6. 以 `N_wp(c)=N(c)∪K_wp(c)` 重算冻结 G1/G2/G3；G4 必须与 GR7 原格相同；
7. 以 `N_wp(c)` 为 lower bound，沿 GR7 的 7041-vector exact closure 判断 anonymous padding 上界；
8. 只发布 aggregate refinement / class / collision / gate 结果，不保存 primitive value、signature value、
   positive lookup、class member、row identity 或 join key。

### 2.2 完成定义

analyzer 与 independent validator 各自从钉死 git objects 直接重建两份器材、GR7 256 格与 7041-vector
closure、16 格 target family、GR8 / GR9 anchors、GR10 registry 与 accepted source semantic gate；本轮
signature 必须是 GR9 加 `trace.wrong_param_calls` 单一末槽，明确不含 GR11 `trace.missing` 末槽。

两套 canonical JSON / REPORT 必须逐字节相同；真实负测必须拒绝 field substitution、GR11+GR12 组合、
第三 primitive、bucket / threshold、value leakage、class 漏扩、伪造 gate、越界结论与普通 REPORT 事实漂移。

三条目标命令全绿并提交唯一一笔 commit 后立即停止并返回 owner。不得自动试 registry 下一项。

### 2.3 非目标

本任务不做：

- 重算、读取或组合 GR11 的逐行 `len(trace.missing)` value；
- 检验或读取 `len(suppressed_wrong_actions)`、`len(trace.satisfied)`、
  `len(trace.invalid_tool_calls)`、`trace.calls_made`、`len(trace.failure_paths_fired)` 的逐行值；
- primitive / field sweep、排名、选择、推荐、组合、交互项、bucket / cap / threshold 搜索；
- selector hypothesis、routing rule、candidate verifier、k8、第二 matcher 或配置选择；
- 读取 `trace.wrong_param_calls` 任一元素、tool / args / failure-path 字符串、answer / episode / trace /
  rubric 正文或逐行身份；
- validation / out-of-sample / hidden / G0、模型调用、费用、promotion、freeze 或正式执行；
- 修改 accepted commit、冻结件、matcher、routing/component、threshold、gold、rubric 或 runner。

## 3. 预注册 signature 与唯一允许关系

### 3.1 单槽 refinement

新 signature 名称固定为：

```text
machine_observable_exact_count_shape_plus_trace_wrong_param_calls_v1
```

它必须逐槽保留 GR9 `machine_observable_exact_count_shape_v1`，只在末尾追加：

```text
trace_wrong_param_calls_count =
  ("available", exact nonnegative len(trace["wrong_param_calls"]))
    iff type(trace) is dict,
        "wrong_param_calls" is a direct key,
        and type(trace["wrong_param_calls"]) is list
  ("not_applicable",)
    iff the already accepted GR9 schema path makes trace unavailable
```

合法 malformed verdict 仍走 GR9 的 malformed schema；新增末槽固定为 `("not_applicable",)`。不得把缺
`trace.wrong_param_calls`、错误类型、bool/int 混淆、异常或负值静默降为 0 / empty / not-applicable。
除 accepted schema 明确定义的 unavailable path 外，任何不匹配都必须在结果产生前 rc 2。

analyzer 与 validator 必须各自只有一个 canonical `S_wp` 函数。静态 AST gate 必须钉死：

- 唯一新增读取路径恰为 direct `trace.wrong_param_calls`；
- 唯一新增变换恰为 built-in list length，且不迭代、索引、切片、排序、集合化或读取元素；
- 不读取 `trace.missing` exact count 或 registry 的其余五项，不使用 computed key、`.get(..., default)`、
  truthiness fallback、动态 `eval/exec`、helper-injected value 或结果依赖分支；
- 新槽只能在旧 tuple 末尾，旧槽数量、顺序、值与类型逐字节不变。

两套实现各自重算 canonical AST digest 并要求相同，但 digest 不写入交付物。

### 3.2 accepted source semantic gate

本闸的两个 source objects 固定为：

```text
67cf84c9d40057fec02be7a963694938bff78a58:harness/verify_stage0a.py
  SHA-256 ce014e0850efc23617387ad01b3154d091abb3a5dfc9d7ccd40671f0b56c7dce
fae90ecfeed723748b80566b94d473cf25e45d0c:harness/verify_stage0a_v120_wrong_action_matcher_gr2b.py
  SHA-256 a9d6fcaad174b43a2555c72daf449769183d2902a1827e5be40ba3058862bd65
```

前者定义冻结的 `check_trace`；后者是 accepted MU 的 `score_episode` call site，并通过其冻结 import
关系使用同一 `check_trace`。两套实现必须从这两个 full `commit:path` 读取并复核 SHA，不得改用工作树
浮动源码、相似函数或 GR10/GR11 analyzer 的转述。

在任何本轮 primitive value 产生前，两套实现必须分别从 pinned accepted source AST 证明：

- `wrong_param` local 恰初始化为 empty list，且最终 direct 发布为 `"wrong_param_calls": wrong_param`；
- 对 `wrong_param` 的 mutation 只能是 `.append(...)`，不得 extend、重绑定或由 helper 注入；
- 每次 append 都处在“当前 required call 没有 exact match”的 `else` 分支内；
- append 还必须受 `called_tool == required_tool` 的 direct equality 闸约束；
- exact-match 判定仍调用 accepted `_args_match(required_args, called_args)`；
- `trace.ok` 仍由 `not missing` 构造，`wrong_param_calls` 不直接进入 `ok` 或 pass 判定。

该 semantic gate 只证明预注册依据，不读取 runtime element、频率、support 或 gold 效果；AST digest 不落盘。

### 3.3 对 GR9 的纯投影与 refinement 证书

唯一允许投影为：

```text
P_wp(S_wp) := drop exactly the final trace_wrong_param_calls_count slot
```

必须逐行证明 `P_wp(S_wp(r)) == S_exact(r)`，并验证：

- 196 行 projected class partition 与 GR9 的 34 classes、support anchors 和 16 格 closure 完全重现；
- `S_wp(r1)=S_wp(r2) ⇒ S_exact(r1)=S_exact(r2)`；
- 每个 `S_wp` class 完整嵌套于唯一 GR9 class，全部 support 之和为 196；
- 对每个 target cell，`K_wp(c) ⊆ K_exact(c)`，所以本轮 closure 不会大于 GR9 closure；
- 不构造或保存 `S_exact→S_wp`、count→row、positive-class 或任何逆向 lookup。

不得从 GR11 signature 加槽；不得另写一套可漂移的 GR9 row reader；不得从 GR9 / GR10 / GR11 JSON、
REPORT 或源码复制本轮结果。

### 3.4 绝对禁止读取面

`S_wp`、`S_exact` 与投影都不得读取、派生、拼接、hash、比较或按条件间接访问：

- `gold_pass`、gold label、`U(c)` membership；
- arm、`carries_memory`、configuration id / mask；
- run id、episode id、blind id、row index、排序位置、join key、时间戳；
- answer / episode / trace 正文、rubric 文本、`trace.wrong_param_calls` 任一元素、tool / args 字符串；
- GR11 `trace.missing` exact value 或 registry 其余五项的值；
- 文件路径、SHA、commit、随机数、环境变量、网络、模型/API、数据库、hidden 或 sibling worktree。

gold 只可在 signature 构造完成后，用于 `U(c)` 的 offline class labelling。所有 signature 与 exact count
只在内存中作为等价类 key；不得回显到 JSON、REPORT、CHECKSUMS、stderr 或测试名。

## 4. Class closure、两层 gate 与判定顺序

### 4.1 最小 class closure

对任意只依赖 `S_wp` 的 routing function `g`，若对每个 `u∈U(c)` 都有 `g(u)=true`，则它必然路由
`K_wp(c)`。因此 `A_wp(c)` 是覆盖 `U(c)` 的唯一 set-inclusion minimum `S_wp`-class-closed additions。

两套实现必须机械验证：

- `U(c) ⊆ A_wp(c)`，且不删除任何 `N(c)`；
- `K_wp(c)` 对 `S_wp` equivalence class 闭合；
- 少任一个 positive class 都留下至少一个 G1 unrouted FN；
- 加入任意不含 `U(c)` 的 class 不能替代 positive class；
- 不用 greedy、排序、count 大小或跨配置共享 membership 代替定义。

### 4.2 Layer A：single-refinement signature only

```text
N_wp(c) = N(c) ∪ K_wp(c)
```

- G1：`unrouted_false_negatives == 0`；
- G2：`|N_wp(c)| / 196 < 0.40 ⇔ |N_wp(c)| ≤ 78`；
- G3：四 arm review rate 的 `max-min ≤ 1/10`，只用 exact rational；
- G4：matcher-fixed，必须与 GR7 原格相同且 pass；
- `trace_wrong_param_signature_only_all_green=true` 当且仅当同一格四闸全过。

### 4.3 Layer B：加 anonymous padding 的更弱上界

只在不删除 `N_wp(c)` 的前提下使用 GR7 已验收闭集：

```text
E = {x ∈ Z^4:
     0 ≤ x_a ≤ denominator_a,
     sum(x) ≤ 78,
     max_a(x_a/denominator_a) - min_a(x_a/denominator_a) ≤ 1/10}
```

令 `l^wp_a(c)=|N_wp(c)∩arm_a|`。存在 `x∈E` 且全部 `x_a≥l^wp_a(c)` 时 Layer B 可行；必须穷尽
7041 个 vectors，求 minimum final total、minimum padding 与全部 minimum ties。padding 只能是匿名整数
上界，不能编码内容、signature、row 或配置。

### 4.4 固定判定顺序

必须先判 structural split，再判 Layer A，再判 Layer B：

1. `split_gr9_class_count == 0`：假设第一步失败；仍须闭合 16 格并证明结果与 GR9 相同；
2. 有 split 但 Layer A / B 均 0：只允许说细化存在但冻结 gates 下不可实现 target；
3. Layer A 至少一格 all-green：只允许说 development class-closed separability exists；
4. Layer A 为 0、Layer B 至少一格：只允许说仍需 anonymous padding upper bound。

不得因任一结果修改 signature、加入 `trace.missing`、再试第三项、选最优格或建立 deployable lookup。

### 4.5 原因闭集

```text
NO_GR9_CLASS_SPLIT
TRACE_WRONG_PARAM_CLASS_COLLISION_EXCEEDS_G2_CAP
TRACE_WRONG_PARAM_CLASS_CLOSURE_FAILS_G3
NO_TRACE_WRONG_PARAM_G3_PADDING_VECTOR_WITHIN_G2_CAP
POSITIVE_TRACE_WRONG_PARAM_CLASS_HAS_SINGLETON_SUPPORT
```

Layer A 的 G2 / G3 failure 可重叠；Layer B 先判 total > 78，否则才判无 padding vector。singleton 是正交
development overfit 风险，不改变 gate。G4 在 target family 中固定 pass，不得新增 G4 原因。

## 5. 起点、branch、worktree 与提交拓扑

- scientific parent：accepted GR11 `04ffebe89c3ef38bb7b042052983dac40d1b1dd3`
- scientific baseline：accepted GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- branch：`stage0a-wave2-trace-wrong-param-calls-exact-count-separability-envelope-gr12`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-trace-wrong-param-calls-exact-count-separability-envelope-gr12`
- 2026-09-11 已核：上述精确 branch 与 worktree 均不存在。执行时若任一已存在，立即停止；不删、不覆盖、
  不复用。
- 最终恰一笔 commit，唯一 parent 为 GR11；所有被退回 commits 与非 ancestry siblings 均不得额外进入。
- 不从 sibling worktree 读文件，不用浮动 ref；历史输入只按 full `commit:path` 读取 git object。

三条目标命令全绿后只提交一次，message 必须为：

```text
posthoc(stage0a): bound wrong-param exact-count separability (GR12)
```

不得 merge、tag、push、fetch 或 pull。

## 6. 唯一允许的 changed paths

相对 GR11 必须恰六个新增路径、0 个已有文件修改：

```text
harness/verify_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/analyze_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/test_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/CHECKSUMS-TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 目录必须恰五项；CHECKSUMS 只登记 analyzer、test、JSON、REPORT 四项且不自列。不得创建 formula
lock、registry copy、signature table、positive-class manifest、第七件产物或仓内临时文件。

## 7. 输入与 accepted-object 闭包

### 7.1 独立重建完整基线

analyzer 与 validator 必须各自独立钉死并复核 accepted GR11 ancestry 中本任务所需的完整冻结闭包：

- 17 个 development inputs 与五份上游 CHECKSUMS 的反向注册；
- v1.20 freeze 两节；
- GR2A / GR2BR1 / GR2D 三个 accepted sibling 的 21 个 objects；
- GR3R1、GR4、GR5、GR7、GR8、GR9、GR10、GR11 各六 objects；
- MB 工作树 accepted v1.20 与 MU 只按 GR2BR1 full `commit:path` 物化的不同 module / source SHA；
- 196 行、两轴 verdict schema、k1..k7、mandatory、pass/outcome、冻结 G1–G4；
- GR7 target family 与 7041-vector closure、GR8 bucket anchors、GR9 exact-count anchors；
- GR10 source-AST schema universe 与七项资格 registry，以及 §3.2 的 wrong-param accepted source semantic gate；
- GR11 只作为 parent 拓扑与六对象 SHA 闭包，不解析其 JSON / REPORT、不重算 `trace.missing` value、
  不 import 其模块、不把其 signature 当本轮 baseline。

不得 import 前序 analyzer、validator 或 tests；不得把前序 JSON / REPORT 当 expected document；不得从前序
artifacts 复制 row value、target membership、signature 或 class membership。GR10 registry 只用于验证
`len(trace.wrong_param_calls)` 在执行前确属登记项，以及其余项没有进入实现。

### 7.2 parent GR11 六对象

必须从 parent commit 与工作树两侧各自核 SHA：

| path | SHA-256 |
|---|---|
| `harness/verify_trace_missing_exact_count_separability_envelope_wave2.py` | `00f03a34dc7f5aad79760b55d4de9095074be430a9f9e851ad644b760197d0d0` |
| `posthoc/stage0a-development-wave2-trace-missing-exact-count-separability-envelope/analyze_trace_missing_exact_count_separability_envelope_wave2.py` | `d6f7be26144e796af4c7994facae17c3b77e972750611bc12b4b7f4baf2897d0` |
| `posthoc/stage0a-development-wave2-trace-missing-exact-count-separability-envelope/test_trace_missing_exact_count_separability_envelope_wave2.py` | `bde5a52c92b80ddad5e2cbe293163ddb05d300892340bb2fecfc67ab451c4588` |
| `posthoc/stage0a-development-wave2-trace-missing-exact-count-separability-envelope/TRACE-MISSING-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json` | `27b8cffa492f928b79088d7d3171a2a73b95ed1a87ba01db43b9192e15ca96ce` |
| `posthoc/stage0a-development-wave2-trace-missing-exact-count-separability-envelope/TRACE-MISSING-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md` | `034aede1c053c67f579009f1fa2e87145ddc76b184e2c46addbf28bb43029e0c` |
| `posthoc/stage0a-development-wave2-trace-missing-exact-count-separability-envelope/CHECKSUMS-TRACE-MISSING-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256` | `0191f313b413089f6d3ba14b1bd4ab321fcac7e4085db666f467e390e887e237` |

### 7.3 accepted GR10 registry 六对象

GR10 是本轮 eligible-registry 与 source-universe 锚，必须按 full `commit:path` 另核：

| path | SHA-256 |
|---|---|
| `harness/verify_remaining_machine_observable_schema_surface_audit_wave2.py` | `6bd4a003f0a8ffaa7e69f706d7246c0731a6a371ea0712b7440830d3249ed942` |
| `posthoc/stage0a-development-wave2-remaining-machine-observable-schema-surface-audit/analyze_remaining_machine_observable_schema_surface_audit_wave2.py` | `971a2b42afc01834e7ea2433dc6918253d6f76c5a38d38a3f226032bb2f3175c` |
| `posthoc/stage0a-development-wave2-remaining-machine-observable-schema-surface-audit/test_remaining_machine_observable_schema_surface_audit_wave2.py` | `90ac3a6715977707ad3d3918e670a31439d4ac0cd4fe1c431bbda66cb38aac5e` |
| `posthoc/stage0a-development-wave2-remaining-machine-observable-schema-surface-audit/REMAINING-MACHINE-OBSERVABLE-SCHEMA-SURFACE-AUDIT-stage0a-development-wave2.json` | `6310a9abaede3ee60d0c29e7d19cc322a4294532fc63140e81108f5c973c1995` |
| `posthoc/stage0a-development-wave2-remaining-machine-observable-schema-surface-audit/REMAINING-MACHINE-OBSERVABLE-SCHEMA-SURFACE-AUDIT-REPORT-stage0a-development-wave2.md` | `6a7905965777bfdb3e26f78c2d5a8051fa5bc620b01f9a7c45192200e2850245` |
| `posthoc/stage0a-development-wave2-remaining-machine-observable-schema-surface-audit/CHECKSUMS-REMAINING-MACHINE-OBSERVABLE-SCHEMA-SURFACE-AUDIT-stage0a-development-wave2.sha256` | `ebf3ef8ee6ab3207ed4175cfdad97559d4d298680560d1bc97f2f2ffa759a440` |

### 7.4 accepted GR9 baseline 六对象

GR9 是本轮 projected scientific baseline，必须按 full `commit:path` 另核：

| path | SHA-256 |
|---|---|
| `harness/verify_exact_count_signature_separability_envelope_wave2.py` | `914864c1320c7597bf8634525ab025c5561757bcc810e6068ead61b4e3054187` |
| `posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/analyze_exact_count_signature_separability_envelope_wave2.py` | `d15d76cf3ff8761b8d53b04cc1d888d95ee265446e014e1e2e6d498af6344ede` |
| `posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/test_exact_count_signature_separability_envelope_wave2.py` | `0e1024064bca849b8459428362e0cc2fe8f4cf84bdfe495c758a22335be4c00d` |
| `posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/EXACT-COUNT-SIGNATURE-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json` | `ac7f143c60887c7b023ba2492bf164403d9224bfe5a0076c8628a38c5e12fd34` |
| `posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/EXACT-COUNT-SIGNATURE-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md` | `4d3bd567e534eef1c09fa148ab574e5ea420a4cfc7636892779925df49348fcb` |
| `posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/CHECKSUMS-EXACT-COUNT-SIGNATURE-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256` | `e1fc24c56cbff0c1d8a7a0ca9ad201e33d9bbf07a4ebb37963e2c9576f4d74e9` |

前序 JSON 只作为 SHA 已钉死的 accepted objects；本轮运行不得解析它们取得 expected values。

## 8. 必须先闭合的 anchors

任何本轮 primitive value、class 或 gate 结果产生前，两套实现必须直接重现：

- 256 格、两轴各 128、bit order `k1..k7`、无缺格/重格；
- GR5 baseline all-green 0；G1/G2/G3/G4 passing `32/132/16/128`；
- GR7 denominators `56/56/56/28`、G2 cap 78、G3 ratio `1/10`、vectors 7041；
- GR7 G1–G3 envelope feasible 48、oracle-all-green 16；MB `32/0`、MU `16/16`；
- k7-off feasible / all-green `48/16`，k7-on `0/0`；target family 恰 16 格且全 MU / k7-off / G4 pass；
- GR8 bucket signature 34 classes、support `1…27`、11 singleton；
- GR8 16 格 collision 恒 42、final `82…88`、Layer A / B `0/16`；
- GR9 exact signature 34 classes；34 个 bucket classes 中 split / unsplit `0/34`；
- GR9 16 格 collision 恒 42、final `82…88`、Layer A / B `0/16`，且同 fixed-field tuple 所有确定性
  coarsenings 均不可行；
- GR10 canonical source universe 29 paths、43 entries 四分 `15/2/19/7`、eligible 7、unknown / unclassified 0；
- `len(trace.wrong_param_calls)` 恰在 eligible registry 中，且 §3.2 accepted source semantic gate 完整成立；
- GR11 commit / parent / 六对象闭合；GR11 JSON / REPORT parsed count=0、module import count=0、
  `trace.missing` runtime recomputation count=0；
- routing 不改变 matcher-fixed fields 或 G4；k7 AST digest 仍等于 accepted GR5。

任一 anchor 漂移必须在读取本轮 `len(trace.wrong_param_calls)` 或生成结果前退出 2。

## 9. 必须发布的结果

JSON 必须按固定顺序保存 16 格 aggregate table。每格至少包含：

- configuration id、matcher、七位 mask；
- baseline needs_review、GR7 `|U(c)|` 与 GR7 minimum padding anchor；
- signature schema version、projected GR9 class count、本轮 class count、positive class count；
- positive-class support min/max、singleton-positive-class count、`all_positive_classes_support_ge_2`；
- `|A_wp(c)|`、`|U(c)|`、`|E_wp(c)|`，以及相对 GR9 collision 42 的 reduction；
- final total 与四 arm aggregate counts（过 k=2 suppression 后才发布）；
- Layer A G1/G2/G3/G4 与 `trace_wrong_param_signature_only_all_green`；
- Layer B feasibility、minimum final、minimum padding、minimum tie count 与上界布尔；
- 原因闭集、suppression status 与该格 `K_wp⊆K_exact` 证明结果。

同时发布：

- 本轮 class 总数、support min/max、singleton 数，不发布 primitive 值或 count-frequency table；
- 34 个 GR9 classes 中 split / unsplit 数、本轮 subclass-count 的单维 aggregate distribution；
- 每格 pure-target / mixed / non-target class 数的单维 aggregate distribution；
- 16 格 Layer A / B all-green 数；
- collision、reduction、singleton-positive-class 与 blocker 的 min/max/distribution；
- minimum ties 的 aggregate 数，不选 winner、不排序配置；
- 16/16 refinement containment；
- hypothesis、registry、selector、candidate、configuration、hidden、model、cost、promotion、freeze 与
  out-of-sample 边界声明。

绝对不得保存：`trace.wrong_param_calls` 长度值、其频表、任一 exact / projected signature tuple/value/digest、
positive signature set、class member list、`U/A/E` members、row 顺序、id/hash、答案、episode、trace、rubric
文本、模型、绝对路径、GR11 `trace.missing` value、其它五项 primitive value、arm-conditioned rule 或 join key。

## 10. 唯一允许结论

按 §4.4 顺序只选最具体的一条。

若 `split_gr9_class_count == 0`：

> `the preregistered trace.wrong_param_calls exact-count refinement does not increase development separability beyond GR9`

若有 split，但 Layer A / B 都没有 all-green：

> `the preregistered trace.wrong_param_calls exact-count refinement increases development separability but cannot realize any GR7 oracle-all-green cell under the frozen gates`

若 Layer A 存在 all-green：

> `trace.wrong_param_calls exact-count class-closed separability exists on development; no deployable or out-of-sample selector has been identified`

若 Layer A 全失败而 Layer B 存在 all-green：

> `trace.wrong_param_calls exact-count closure still requires anonymous padding; no deployable selector is closed`

所有结论始终附：

```text
single-preregistered-primitive development-only class-closure upper bound; no field ranking, primitive combination, selector, candidate, configuration, out-of-sample, promotion, or freeze decision
```

REPORT 首行必须为：

```text
TRACE.WRONG_PARAM_CALLS EXACT-COUNT SEPARABILITY ENVELOPE ONLY — single-preregistered-primitive development bound; no combination, selector, or candidate
```

末行必须为：

```text
GR12 COMPLETE — return to owner before any third primitive, combination, selector, candidate, dataset expansion, or execution
```

## 11. 非识别、边界声明与静态闸

- `preregistered_primitive="len(trace.wrong_param_calls)"`
- `preregistration_basis="accepted_source_semantics_only"`
- `uses_gold_for_offline_class_labelling_only=true`
- `single_primitive_only=true`
- `gr11_trace_missing_combined=false`
- `trace_missing_runtime_values_read=0`
- `other_remaining_eligible_primitives_evaluated=false`
- `primitive_values_saved=false`
- `signature_values_saved=false`
- `positive_signature_lookup_saved=false`
- `field_ranking_performed=false`
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

任一 per-arm class / addition / collision / padding vector 含 `0 < cell < 2` 时，整个交叉 block 降级为
`suppressed_for_non_identification`。solver 内部仍须精确验证，但数值不得落盘。support distribution 只允许
全局单维 aggregate，不得和 configuration / arm / outcome 拼表。

analyzer / validator AST 必须拒绝动态 `eval/exec`、网络、模型 runner、递归目录遍历 / glob、hidden 路径、
随机选择、成员常量表、signature 常量表、list 元素访问、GR11 `trace.missing` count、其余五项 primitive、
禁用字段、结果驱动的 field/threshold 分支或导入前序任务模块。validator 不得写仓库；analyzer 只可在
显式 `--generate` 下无覆盖地写本轮三产物，`--check-existing` 必须严格只读。固定目录的 `os.listdir`
只允许用于五产物闭包与 candidate-verifier 闸。

## 12. Independent validator 与真实负测

`harness/verify_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py` 必须独立钉死 inputs、
commits、两器材、k1..k7、GR7 inverse projection、GR8 / GR9 anchors、GR10 registry、GR11 parent objects、
accepted source semantic gate、单槽 signature、refinement、16 格 target、class closure、两层 gates、canonical
JSON / REPORT 与净化边界。不得 import analyzer / tests / 前序任务模块，不得把前序 JSON、本轮 delivered
JSON 或 REPORT 当 expected document。

测试在 `TemporaryDirectory()` 复制五份 posthoc 产物并黑盒运行 validator；每条 mutation 前先跑
byte-identical control rc 0，再施加 mutation、重签 CHECKSUMS，确认 rc 2。至少覆盖：

1. 把 primitive 换成 registry 其它项、加入 GR11 `trace.missing` 或第三 primitive / 组合 / interaction；
2. 对 `len(trace.wrong_param_calls)` 分桶、cap、round、threshold，或改用 truthiness / presence / sum / distinct；
3. 读取 wrong-param 元素、tool / args / 字符串，使用 computed key、default 或异常 fallback；
4. signature 加入 gold、arm、configuration、identity、正文、环境值或新字段；
5. 新槽不在末尾、改变 GR9 旧槽、投影不是纯 drop-last、从 GR11 signature 继续加槽或伪造 34-class anchors；
6. 保存 primitive/signature value、频表、digest、positive lookup、class members 或逆向 mapping；
7. source semantic gate 漂移：wrong-param 非空初始化、非 append mutation、append 移出 missing `else`、
   去掉 same-tool equality、绕过 `_args_match`，或让 wrong-param 直接进入 `trace.ok` / pass；
8. `U(c)` 少一个 FN、混入 gold-fail、重复计 mandatory-only FN；
9. class closure 少扩同签名 row、多塞不同签名 row、删除 existing review；
10. 伪造 `K_wp⊆K_exact`、class nesting、minimum closure、split/unsplit 或 collision reduction；
11. 16 格 target 少/多/换 matcher/打开 k7/让 G4 fail 进入；
12. GR7 256 格、7041 closure、GR8 / GR9 / GR10 anchor 或 GR11 parent-object closure 漂移；
13. G2 cap 79、G3 float/adjacent-only/wrong denominator/threshold 漂移；
14. 把 Layer B 冒充 Layer A、伪造 padding/ties、跳过固定判定顺序；
15. 发布 k<2 arm block、身份、正文、模型、绝对路径、hidden 路径或越界结论；
16. field ranking / combination / third hypothesis / selector / candidate / selected config / OOS / promotion /
    freeze 任一边界漂移；
17. 少/多产物、CHECKSUMS 漏项/多项/自列、input / parent object SHA 漂移、浮动 ref、REPORT 首尾、
    结论、owner-decision、普通事实行或 JSON key order / indent / trailing newline 漂移。

负测后五份工作树产物 SHA 必须与导入快照一致；stderr 必须单行净化，不回显待验值、路径、identity、
signature、exact count 或 traceback。

## 13. 目标命令

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/test_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/analyze_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
```

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行 GR11 或更早任务的
目标命令、`pytest harness/` 整目录、旧 sweep/rescore/probe、模型 runner、正式 development、样本外、
G0 或 hidden。

## 14. 回执与停止条件

回执必须给出：

- branch/worktree/commit/唯一 parent、相对 parent 六个 `A` / 0 个 `M`、ancestry/tag/status；
- 六 changed paths 与 SHA、posthoc 五项、CHECKSUMS 四项闭包；
- 完整冻结 inputs、accepted objects、GR11 / GR10 / GR9 六对象在 commit / 工作树两侧的 SHA 闭包；
- 两器材直接装载、GR7 256 格 / 7041 closure / 16 格 target、GR8 / GR9 / GR10 anchors 的机械逆投影；
- wrong-param accepted source semantic gate、单一 primitive AST gate、drop-last projection、class containment、
  禁止字段、GR11-combination prohibition 与 value-leakage 扫描；
- structural split、16 格 `U/K/A/E` aggregate、Layer A/B、collision reduction、singleton、blocker 与唯一结论；
- k=2 suppression、负测 control/mutation rc、三条目标命令原始结论；
- 测试后 HEAD/status/tag 与六文件 SHA 无漂移，无 `__pycache__`。

提交后立即停止并返回 owner。不得加入 GR11 `trace.missing`，不得检验 registry 中第三项，不得创建 selector
hypothesis、candidate、k8、第二 matcher、GR13 或新字段，不得选择 bucket / threshold / configuration，
不得改 matcher / gate，不得读正文、hidden 或样本外数据，不得调用模型、产生费用、promotion、freeze、
正式运行、G0、merge、tag 或 push。

## 15. Codex 验收 —— 2026-09-12

### 15.1 已核通过

- commit `5e97492ae073771ae0aa7b1915748bca08afedb3` 唯一 parent 为 accepted GR11
  `04ffebe89c3ef38bb7b042052983dac40d1b1dd3`；相对 parent 恰一笔 commit、六个 `A`、0 个 `M`；
  branch / worktree / reflog / message / tag / clean status 均与任务书一致。
- posthoc 目录恰五项；CHECKSUMS 恰登记 analyzer / test / JSON / REPORT 四项且不自列；六个工作树文件与
  `HEAD:path` 一致，测试后 HEAD、status、tag、SHA 均无漂移，无 `__pycache__`。实验主仓仍为
  `67cf84c9d40057fec02be7a963694938bff78a58`、clean。
- source semantic gate、单槽 signature、drop-last projection、GR11 不组合、value-leakage 边界与唯一结论
  的静态内容正确。产物数值为 split `0/34`、16 格逐格与 GR9 相同、collision `42`、final `82…88`、
  Layer A / B `0/16`、reduction `0…0`；组合结果仍明确为 `underdetermined`。
- Codex 复跑：pytest `299 passed in 1756.33s (0:29:16)`；analyzer `--check-existing` PASS，三产物
  byte-identical；independent validator PASS，canonical JSON / REPORT byte-identical。

### 15.2 Blocking finding

1. analyzer 的 `build_document()` 先调用 `signature_index(records)`，该函数立即为每行调用本轮
   `machine_observable_exact_count_shape_plus_trace_wrong_param_calls_v1()` 并取
   `len(verdict["trace"]["wrong_param_calls"])`；随后才调用 `gr8_anchor_closure()` 与
   `gr9_anchor_closure()`。validator 的 `_build_document()` / `_signature_index()` 具有同样顺序。
   同时，两套实现都先用 `class_closure_cell()` 计算当前 refinement 的 Layer A 与 Layer B，之后才调用
   `structural_split_block()`。这违反 §2.2、§4.4、§8 与 handoff §6 的硬顺序门。
2. 现有顺序负测没有观察真实调用顺序：它们只读取 canonical document 中硬编码的
   `checked_before_* = true`，或把该输出布尔改成 `false` 后确认 byte-exact validator 拒绝。因此
   `299 passed` 不能证明前置门成立，产物中的顺序声明也与实际控制流不符。

### 15.3 Verdict

`Redo`

GR12 不进入 accepted chain。GR12R1 只从 accepted GR11 重新纠正真实执行顺序与对应负测；不得把
GR12 commit 纳入 ancestry，不得改变 primitive / signature / target / threshold / scientific scope，不得
扩展到第三 primitive、组合、selector、candidate、hidden、样本外、模型、费用、promotion、freeze、G0、
正式运行或 GR13。
