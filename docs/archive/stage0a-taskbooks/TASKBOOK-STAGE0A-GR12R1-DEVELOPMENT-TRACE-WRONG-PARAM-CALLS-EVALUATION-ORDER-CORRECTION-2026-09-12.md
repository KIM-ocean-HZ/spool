# Claude Code 任务书 —— Stage 0-a development wave2 · GR12R1 evaluation-order correction

> **状态：COMPLETE — 2026-09-14 Codex 验收 verdict：`Redo`。**
>
> **退回原因：** analyzer 与 independent validator 虽把 canonical `S_wp` helper 守到 P4，但 P1 的
> `verdict_schema_gate()` 仍经 `trace_wrong_param_contract()` 直接执行
> `len(trace["wrong_param_calls"])`。phase ledger 没有记录这次真实读取，现有测试也只检查 helper 内的
> `len()`，所以发布的 first-primitive 顺序证书不成立。
>
> **后续纠正任务：**
> `docs/TASKBOOK-STAGE0A-GR12R2-DEVELOPMENT-TRACE-WRONG-PARAM-CALLS-ALL-RUNTIME-READ-ORDER-CORRECTION-2026-09-14.md`
>
> **唯一交付：** 从 accepted GR11 重新交付 GR12，只纠正 analyzer 与 independent validator 的真实执行
> 顺序及其负测：全部 preregistration / input / object / source-semantic / GR7 / GR8 / GR9 / GR10 / GR11
> 前置门必须在首个 `len(trace.wrong_param_calls)` runtime value 产生前闭合；本轮 structural split 必须在
> 本轮 Layer A 之前闭合，Layer A 必须在 Layer B 之前闭合。不得只在产物中自报顺序布尔。
>
> **验收来源：** GR12 commit `5e97492ae073771ae0aa7b1915748bca08afedb3` 于 2026-09-12 被 Codex
> 退回。其数值、拓扑、产物与 299 项测试均可复现；唯一 blocking finding 是真实控制流违反 GR12
> 任务书 §2.2 / §4.4 / §8 的前置顺序门，而测试只验证硬编码的 `checked` 声明。
>
> **只读基线任务书：**
> `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR12-DEVELOPMENT-TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-2026-09-11.md`。
> 除本任务书明确替换的 evaluation-order 实现与负测条款外，原 GR12 的 signature、input / object closure、
> anchors、changed paths、canonical fields、结论闭集、禁止面、三条命令与停止条件全部继续生效。
>
> **不是新实验：** GR12R1 不提出第三 primitive，不检验组合，不改变 GR12 的 hypothesis、signature、
> target family、阈值、原因闭集或允许结论。被退回 GR12 不进入 ancestry，也不是 accepted evidence。

## 1. 唯一问题与完成定义

### 1.1 Blocking finding

被退回 GR12 的 analyzer 在 `build_document()` 中先调用 `signature_index(records)`；该调用立刻取本轮
`len(trace.wrong_param_calls)`，之后才执行 GR8 / GR9 anchor closure。validator 的 `_build_document()`
同样如此。

两套实现还先以 `class_closure_cell()` 计算本轮 Layer A 与 Layer B，再调用
`structural_split_block()`。现有负测只篡改 canonical document 的 `checked_before_*` 布尔，未观察调用顺序，
所以 `299 passed` 没有闭合这两项协议要求。

### 1.2 完成定义

analyzer 与 validator 必须各自实现并验证以下不可逆阶段顺序：

```text
P0  static preregistration / signature / projection gates
 -> P1 input, topology, accepted-object and source-semantic closure
 -> P2 GR7 256-cell / 7041-vector / 16-cell target anchors
 -> P3 GR8 bucket and GR9 exact baseline anchors, built without S_wp
 -> P4 first runtime evaluation of len(trace.wrong_param_calls); all such reads stay in P4
 -> P5 structural split verdict
 -> P6 current-refinement Layer A closure and aggregate verdict
 -> P7 current-refinement Layer B anonymous-padding verdict
 -> P8 canonical document / REPORT rendering and comparison
```

任何越级、倒序、重复开启 primitive phase、在 P3 前调用 GR12 helper，或在 P5 前计算当前 Layer A / B，
都必须 rc 2。产物里的顺序声明只能来自本次运行中实际验证的 phase ledger；常量 `true` 不能作为证据。

三条目标命令全绿、唯一 commit 完成后立即停止并返回 owner。

## 2. 科学范围保持不变

- scientific parent：accepted GR11 `04ffebe89c3ef38bb7b042052983dac40d1b1dd3`
- scientific baseline：accepted GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- 唯一 primitive：`len(trace.wrong_param_calls)`
- signature：`machine_observable_exact_count_shape_plus_trace_wrong_param_calls_v1`
- 旧 15 槽逐槽等于 GR9；只追加一个末槽；pure projection 仍为 drop-last
- 不含、不读取、不重算 GR11 `len(trace.missing)` runtime value
- target 仍为机械重建的 GR7 16 个 MU / k7-off / G4-pass oracle-all-green cells
- G1–G4、G2 cap 78、G3 exact `1/10`、7041-vector closure、k=2 suppression 全部不变
- 唯一结论仍按 GR12 §10 的四句闭集与固定顺序选择；不得预填被退回 GR12 的结果

GR12R1 必须重新计算科学结果。可以披露“纠正后 scientific aggregates 是否与 rejected GR12 一致”，但不得把
rejected GR12 JSON / REPORT 当 expected document，也不得因为已知结果而跳过任一 phase。

## 3. Branch、worktree 与提交拓扑

- branch：`stage0a-wave2-trace-wrong-param-calls-evaluation-order-correction-gr12r1`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-trace-wrong-param-calls-evaluation-order-correction-gr12r1`
- 2026-09-12 Codex 已只读确认上述精确 branch 与 worktree path 都不存在；执行者创建前必须再次确认。
- 从 accepted GR11 新建；最终 commit 唯一 parent 必须为 GR11，且相对 parent 恰一笔 commit。
- rejected GR12 `5e97492…`、GR6、GR3 与所有 non-ancestry siblings 都不得进入 ancestry。
- 不 cherry-pick rejected GR12 commit，不 merge。可只按六个 pinned `5e97492…:path` objects 读取其实现作为
  纠正 scaffold；不得读 rejected sibling worktree，不得把 rejected products 当 accepted baseline。
- commit message 固定为：

```text
posthoc(stage0a): enforce preregistered evaluation order (GR12R1)
```

不得 tag、fetch、pull、push。

## 4. 唯一允许的 changed paths

相对 accepted GR11 必须仍为恰六个新增路径、0 个已有文件修改：

```text
harness/verify_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/analyze_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/test_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/CHECKSUMS-TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 目录仍须恰五项；CHECKSUMS 只登记 analyzer / test / JSON / REPORT 四项且不自列。

### 4.1 rejected GR12 六对象仅作纠正 scaffold

```text
20cd8b46872c1f0b53524a0931a13dcc58e4149f45f3d752f2448b80f427856d  harness/verify_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
ecd93ab779c792c3c3fc7425d868b563b218f8998ae08ed453763bd58e8d93ca  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/analyze_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
548094dca53e79b257fab55965596a913d3b0ec0f301712232d5fc4e2f164a85  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/test_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
b9f061d53566be163b80b23a9fb869e3addcea9d3f4ee3ec97e7106e50bee681  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
fe3c1031ff9bc82629409831005d08c92e73f9945bccb008a086574955c67ff4  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
d13fcaf52c338d7a49dd02616a6434642f10d72804c28cf78091e5fd367db870  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/CHECKSUMS-TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

执行者必须从 full `5e97492…:path` 自行复核完整路径与 SHA；上表若与 git object 不一致，停止并回报，
不得从 sibling worktree 补取。最终 GR12R1 六 SHA 必然重新登记，不得沿用 scaffold CHECKSUMS。

## 5. 前置 phase 的实现要求

### 5.1 P0–P1：不产生本轮 primitive value

必须先闭合原 GR12 的全部静态与对象门：17 个 inputs、五份上游 CHECKSUMS back-registration、v1.20 freeze、
21 sibling objects、GR3R1 / GR4 / GR5 / GR7 / GR8 / GR9 / GR10 / GR11 六对象 closure、parent topology、
MB / MU source isolation、GR10 registry 与 accepted source semantic gate。

P0 可以 AST-inspect GR12 helper，但不得调用它。P1 可以直接运行 accepted instruments 并在内存保留 verdict，
但不得取、比较、hash、分桶、保存或以条件访问 `len(trace.wrong_param_calls)`。

### 5.2 P2–P3：先独立重建 accepted baseline

P2 先由 records 重建 256 cells、7041 vectors、GR7 anchors 与 16-cell target family。

P3 必须走不调用 GR12 helper 的 baseline-only path：逐行直接构造 GR9 `S_exact`，再做 accepted GR8 bucket
projection，建立两套 baseline partitions，并完整闭合 GR8 / GR9 class、support、closure、Layer A / B anchors。
不得通过先构造 `S_wp` 再 drop-last 的方式取得 P3 输入；drop-last equality 留到 P4 后逐行验证。

### 5.3 P4：第一次打开单 primitive

只有 P0–P3 全绿后才能第一次调用唯一 canonical `S_wp` 与
`trace_wrong_param_calls_count()`。phase gate 必须能在 runtime 拒绝任何早调用；analyzer 与 validator 各自
实现，不能共享模块或共享产物声明。

P4 构造完 refined partition 后先验证 pure drop-last、class nesting 与 `K_wp⊆K_exact` 所需的结构关系；
不得在此 phase 计算当前 Layer A / B。

## 6. 固定判定顺序

### 6.1 P5 structural split

只用 P3 / P4 的 partitions 计算 `split_gr9_class_count`、unsplit 与 subclass distribution，并先锁定
structural verdict。不得读取当前 cell 的 Layer A / B 结果，因为这些结果尚不存在。

### 6.2 P6 Layer A

P5 闭合后，才对 16 cells 计算 `U/K/A/E`、current-refinement class closure、G1/G2/G3/G4 与 Layer A
aggregate。必须先完成全部 16 格 Layer A 与 aggregate verdict，再开放 P7。

### 6.3 P7 Layer B

P6 闭合后，才用 P6 lower bounds 穷尽 accepted 7041-vector closure，计算 anonymous-padding upper bound、
minimum final / padding / ties。若 split 为 0，仍须按同一顺序完成 16 格并证明与 GR9 逐格相同。

不得继续使用一个同时计算 Layer A 与 Layer B、随后才判断 split 的 combined cell helper。

## 7. 顺序证书与新增负测

两套实现必须各自在内存维护单调 phase ledger；只允许发布 phase 名、phase count、first-call / completed
booleans 与 `violations=0`，不得发布 row、primitive、signature 或 membership value。

测试不得只读取产物中的 `checked_before_*`。至少新增并闭合：

1. runtime instrument analyzer：在 GR8 / GR9 anchor closure 返回前调用 GR12 helper，必须立即失败；正常运行中
   first primitive event 必须严格晚于两个 anchor-complete events；
2. 对 validator 做真实 source mutation，把 first S_wp call 移到 P3 前或删除 phase guard，control rc 0、
   mutation rc 2，stderr 单行净化；
3. runtime / AST 双证据证明 current structural split 完成早于任一 current Layer A call；全部 Layer A 完成
   早于任一 current Layer B solver call；
4. 把 current Layer A/B combined helper 恢复为 rejected GR12 顺序、交换 P6/P7、或仅把输出顺序布尔改成
   `true`，均不得得到有效交付；
5. 原 GR12 的 field substitution、GR11 combination、third primitive、bucket/threshold、element read、
   class under/over-expansion、gate forgery、REPORT ordinary-fact drift、CHECKSUMS 与 leakage 负测全部保留。

每条黑盒 mutation 仍须先有 byte-identical control rc 0，再 mutation + re-sign 后 rc 2；工作树产物 SHA
不得漂移。

## 8. Canonical 产物

原 GR12 §9–§12 的字段、净化、非识别、结论与边界要求全部继续生效。新增 `evaluation_order_gate` 时只允许：

```text
phase_order = [P0, P1, P2, P3, P4, P5, P6, P7, P8]
first_primitive_after_gr8_gr9_anchors = true
structural_split_before_current_layer_a = true
current_layer_a_before_current_layer_b = true
phase_violations = 0
order_verified_from_runtime_events = true
order_claims_hardcoded = false
```

这些布尔必须由 phase ledger 派生。REPORT 必须说明 rejected GR12 的数值是否重现，但不得称 rejected commit
accepted；唯一科学结论仍只从本轮重建结果按原四句闭集选择。

## 9. Independent validator

validator 仍不得 import analyzer / tests / previous task modules，不得把 delivered JSON / REPORT 当 expected
document。它必须独立重建 canonical JSON / REPORT，并独立执行 P0–P8 state machine。两套 phase ledger 的
实现可以结构相似，但不得共享可执行代码、缓存、event 文件或 rejected product。

validator 对任何阶段错序必须在生成或比较待验科学结论前 rc 2；stderr 不回显路径、primitive value、
signature、identity、正文或 traceback。

## 10. 目标命令

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

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行 rejected GR12、
GR11 或更早任务的目标命令，不得运行 `pytest harness/` 整目录。

## 11. 绝对禁止

- 不读取 hidden、题目 / answer / trace 元素正文、未登记 raw、sibling worktree 或样本外数据；
- 不读取 `trace.missing` runtime count 或其余五个未检验 eligible primitive 的 runtime value；
- 不试第三 primitive、任何 combination / interaction / bucket / cap / threshold / selector hypothesis；
- 不创建 candidate、k8、第二 matcher，不选 configuration，不改 gate / matcher / threshold / routing；
- 不调用模型/API、不产生费用，不做 promotion / freeze / G0 / 正式运行；
- 不修改 accepted commits、冻结件、`EXECUTION_POLICY.md` 或 Codex handoff；
- 不 merge、tag、fetch、pull、push，不调用 subagent，不自动创建 GR13。

证据不足一律 `underdetermined`。

## 12. 回执与停止条件

回执必须给出：

- branch / worktree / commit / unique parent、相对 GR11 六 `A` / 0 `M`、reflog / ancestry / tag / clean；
- 六 changed paths 与 SHA、posthoc 五项、CHECKSUMS 四项闭包；
- P0–P8 runtime event order、first primitive event、first current Layer A / B event 与 `violations=0`；
- GR8 / GR9 baseline-only path 不调用 S_wp 的静态与 runtime 证据；
- 真实 order mutation controls 与 rc 2，不得只报 output-boolean mutation；
- 原 GR12 全部 source / signature / closure / gate / leakage / boundary 证据；
- 三条目标命令原始结论，以及测试后 HEAD / status / tag / 六 SHA 无漂移、无 `__pycache__`。

唯一 commit 完成后立即停止并返回 owner。不得继续第三 primitive、组合、selector、candidate、GR13、
hidden、样本外、模型、费用、promotion、freeze、G0、正式运行或远端操作。

## 13. Codex 验收 —— 2026-09-14

### 13.1 已核通过

- commit `a0bdb7757bacee748c817ec103e191bc49554297` 唯一 parent 为 accepted GR11
  `04ffebe89c3ef38bb7b042052983dac40d1b1dd3`；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`；
  rejected GR12 与列明的 Redo commits 均不在 ancestry。branch / worktree / reflog / message / tag 0 /
  clean status 均闭合，实验主仓仍为 `67cf84c9…`、main、clean。
- 六文件 SHA 与回执逐项一致；posthoc 恰五项，CHECKSUMS 恰登记 analyzer / test / JSON / REPORT 四项且
  不自列。复跑后 HEAD、status、tag、六 SHA 无漂移，无 `__pycache__`。
- baseline-only P3、split → current Layer A → current Layer B 的主 pipeline 顺序已纠正；科学结果重新得到
  split `0/34`、16 格逐格与 GR9 相同、collision 42、final `82…88`、Layer A / B `0/16`、reduction 0，
  没有扩大到组合、第三 primitive、selector、candidate、hidden 或样本外。
- Codex 复跑三条目标命令：pytest `330 passed in 1895.90s (0:31:35)`；analyzer `--check-existing` rc 0，
  三产物 byte-identical；independent validator rc 0，重建 69 pinned objects 后 canonical JSON / REPORT
  byte-identical。

### 13.2 Blocking finding

1. analyzer 的 P1 `rebuild_all()` 在每个 matcher 上调用 `verdict_schema_gate()`；该函数进入
   `trace_wrong_param_contract()`，并在 analyzer 第 2774 行直接执行
   `exact_count(len(trace[TRACE_WRONG_PARAM_KEY]), ...)`。validator 在第 2756 行有同一读取，且同样从 P1
   `_rebuild_all()` 到达。这与本任务 §5.1 “P1 不得取 `len(trace.wrong_param_calls)`”及 §5.3 “P4 才第一次
   打开 primitive”直接冲突。
2. ledger 的 `EVENT_PRIMITIVE` 只由 `refined_signature_of_row()` wrapper 记录，无法观察上述 P1 直接读取；
   测试 `test_only_the_helper_may_take_the_new_length_and_only_once()` 也只数 helper 自身的 `len()`，没有扫描
   全源码的第二读取点。因此 `first_primitive_after_gr8_gr9_anchors=true` 只证明 wrapper 顺序，不能证明真实
   primitive value 的首次读取顺序；三条命令全绿不能替代这个实现级闭包。

### 13.3 Verdict

`Redo`

GR12R1 不进入 accepted chain。GR12R2 只从 accepted GR11 重新交付同一六件产物：把 P1 schema/type 闭包
与本轮长度 value 闭包彻底分开，并让 runtime / AST 证据覆盖每一个实际
`len(trace.wrong_param_calls)` 读取。不得改变已经纠正的 baseline-only P3 与 split → Layer A → Layer B
顺序，也不得扩大科学范围。
