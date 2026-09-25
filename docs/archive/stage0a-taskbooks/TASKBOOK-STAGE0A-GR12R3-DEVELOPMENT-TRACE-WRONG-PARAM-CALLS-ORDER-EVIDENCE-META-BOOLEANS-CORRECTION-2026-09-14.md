# Claude Code 任务书 —— Stage 0-a development wave2 · GR12R3 order-evidence meta-boolean correction

> **状态：COMPLETE — 2026-09-15 Codex 验收 verdict `Accept`。**
>
> **验收提交：** `0ecd8d15a6eed905394791a9292faf640fe4ca2b`（唯一 parent
> `04ffebe89c3ef38bb7b042052983dac40d1b1dd3`）。无 blocking finding；无 non-blocking finding。
>
> **后续：** 无 ACTIVE 任务书；当前返回 owner decision。本文件已归档，不得作为开工入口。
>
> **唯一交付：** 从 accepted GR11 重新交付同一 GR12，只关闭 GR12R2 遗留的一项 blocking finding：
> `evaluation_order_gate.order_verified_from_runtime_events` 与
> `evaluation_order_gate.order_claims_hardcoded` 必须分别由本轮 runtime ledger 与 static AST closure
> 机械派生，不得在 analyzer 或 independent validator 的返回字典中继续写成字面 `True` / `False`。
>
> **验收来源：** GR12R2 commit `e11a589b2d8cba3584c146b172ea3d43176f6471` 于 2026-09-14
> 被 Codex 退回。其拓扑、六产物、科学读数、P1 type-only / P4 all-runtime-read closure 与目标命令均闭合；
> 唯一 blocking finding 是上述两个 meta booleans 仍为 AST `Constant`，而现有源码负测只覆盖另外三条
> 顺序布尔。
>
> **继续生效的只读任务书：**
> - `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR12-DEVELOPMENT-TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-2026-09-11.md`
> - `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR12R1-DEVELOPMENT-TRACE-WRONG-PARAM-CALLS-EVALUATION-ORDER-CORRECTION-2026-09-12.md`
> - `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR12R2-DEVELOPMENT-TRACE-WRONG-PARAM-CALLS-ALL-RUNTIME-READ-ORDER-CORRECTION-2026-09-14.md`
>
> 除本任务书明确替换的“两条 order-evidence meta booleans 的派生与负测”外，前三份任务书的 scientific
> scope、P0–P8、inputs、objects、anchors、canonical fields、结论闭集、禁止面、三条命令与停止条件全部
> 继续生效。不得借本轮重做已经闭合的 primitive、读取面或科学结果。

## 1. 唯一问题与完成定义

### 1.1 Blocking finding

GR12R2 的 analyzer 与 validator 都先机械计算并验证了三条实质顺序布尔：

- `first_primitive_after_gr8_gr9_anchors`
- `structural_split_before_current_layer_a`
- `current_layer_a_before_current_layer_b`

但两套 `evaluation_order_gate()` 的返回字典仍直接写着：

```python
"order_verified_from_runtime_events": True,
"order_claims_hardcoded": False,
```

GR12R2 任务书 §6 已明确要求这两项由 runtime / static closure 机械得到、不得只是常量声明。现有
`assert_order_gate_is_derived()` 只检查前三条实质顺序布尔；现有 source mutation 也只把前三条改为常量。
JSON forge 测试只能证明 expected document / byte-exact，不能证明这两项的 provenance。

### 1.2 完成定义

analyzer 与 validator 各自必须同时满足：

1. 三条实质顺序布尔继续由各自 ledger 的真实事件派生；任何一条改成常量仍 rc 2。
2. `order_verified_from_runtime_events` 必须由已经闭合的三条 runtime 顺序、event phase/count 与
   `phase_violations == 0` 等真实 runtime 证据机械合成；不得直接赋字面 bool。
3. `order_claims_hardcoded` 必须由全源码 AST closure 对前三条实质顺序布尔的绑定及 return provenance
   机械求得；不得直接赋字面 bool，也不得把“运行结果刚好为 true”冒充静态非硬编码证明。
4. 返回字典中的上述两项必须引用已派生的局部变量或等价的机械表达式；AST 正测必须证明它们不是
   `ast.Constant(True/False)`。
5. static closure 本身必须钉住：三条实质顺序布尔均含 ledger 调用、无 bool literal，返回字典复用这些
   绑定；若删掉任一 ledger/static provenance 或把任一 meta binding 写死，必须在比较科学结论前 rc 2。
6. `evaluation_order_gate` 仍恰七键、同顺序、同最终值；不得新增第八键或调试字段。
7. GR12R2 已闭合的唯一 P4 accessor、194 次 available read、P1/P3 不可达、P5→P6→P7、科学 aggregate
   与所有既有负测一个都不得回退。

## 2. 对 GR12R2 canonical shape 疑问的裁决

GR12R2 新增的以下三个 structure-gate 证据块可以保留：

- `runtime_length_read_closure`
- `p1_type_only_closure`
- `order_booleans_derived_from`

GR12R2 §6 的“七键保持不变、不新增第八键”只冻结 `evaluation_order_gate` 的七键；原 GR12 §9 使用
“每格至少包含 / 同时发布”列出 required canonical evidence，并未冻结整份 JSON 不准加入新的、非调试、
非识别且由两套实现独立重建的 static closure。`names_reachable_in_signature` 因 instrumentation 增加
`ledger` 也可保留；它不是 signature data parameter，canonical `parameters` 仍只含原三项。

本裁决不允许再新增第四个证据块、任何 primitive/signature value、debug field 或第八个 evaluation-order
键。若只修派生逻辑，canonical JSON / REPORT 的值与字节应保持 GR12R2 一致。

## 3. 科学范围保持不变

- parent：accepted GR11 `04ffebe89c3ef38bb7b042052983dac40d1b1dd3`
- baseline：accepted GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- 唯一 primitive：`len(trace.wrong_param_calls)`
- signature：`machine_observable_exact_count_shape_plus_trace_wrong_param_calls_v1`
- 不含、不读取、不重算 GR11 `len(trace.missing)`；其余五项也继续不检验
- target、G1–G4、G2 cap 78、G3 exact `1/10`、7041-vector closure、k=2 suppression 不变
- canonical 科学结论、16 格 aggregate 与 REPORT 均不得因本轮修复变化

GR12R3 不是第三 primitive，不检验组合、bucket、cap、threshold、selector 或 candidate。被退回 GR12 / R1 /
R2 不进入 accepted ancestry，也不是 accepted evidence。

## 4. Branch、worktree 与提交拓扑

- branch：`stage0a-wave2-trace-wrong-param-calls-order-evidence-meta-booleans-correction-gr12r3`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-trace-wrong-param-calls-order-evidence-meta-booleans-correction-gr12r3`
- 2026-09-14 Codex 已只读确认上述精确 branch 与 worktree path 均不存在；执行者创建前必须再次确认。
- 从 accepted GR11 新建；最终 commit 唯一 parent 必须为 GR11，相对 parent 恰一笔 commit。
- rejected GR12 `5e97492…`、GR12R1 `a0bdb775…`、GR12R2 `e11a589…`、GR6、GR3 与 non-ancestry
  siblings 均不得进入 ancestry。
- 不 cherry-pick、merge 或读取 rejected sibling worktree。只可按 §5.1 的六个 full `e11a589…:path`
  objects 读取 GR12R2 作为纠正 scaffold。

commit message 固定为：

```text
posthoc(stage0a): derive order evidence meta booleans (GR12R3)
```

不得 tag、fetch、pull、push。

## 5. 唯一允许的 changed paths

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

### 5.1 rejected GR12R2 六对象仅作纠正 scaffold

```text
f64bd1c46ef04af2e10f37495903f4b9867a9ccc4014e1e4ba32a75898153f76  harness/verify_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
0ab426ce2c828821a875a6bd8c352097ea563cb725a147f7163c1a6461e174d5  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/analyze_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
8611c4422cbd94e63868a1f2a667fdf5baa1fc787eff98da5b983e5db171db6b  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/test_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
be19847ef536f2af8cb6f52d908afdab11b237352c87fe6e968f866236854ad3  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
aa0cdc53132f0f9803072eb1d25b211151127004a0f92b69ba82ed7fca527eb2  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
b80091f7ba5cd2781ff4a8a340447746334918711f7df88e4577498a32a7f792  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/CHECKSUMS-TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

执行者必须从 full `e11a589b2d8cba3584c146b172ea3d43176f6471:path` 自行复核；不一致即停止。

## 6. 必须新增的负测

原 GR12 / GR12R1 / GR12R2 全部负测继续保留。至少再新增：

1. analyzer / validator AST 正测：`evaluation_order_gate` 返回字典中五条 bool claim 均引用机械绑定；
   特别是两条 meta booleans 不得是 `ast.Constant`。
2. validator source mutation：把 `order_verified_from_runtime_events` 的 binding 或 return value 写成 `True`，
   control rc 0、mutation rc 2。
3. validator source mutation：把 `order_claims_hardcoded` 的 binding 或 return value 写成 `False`，control rc 0、
   mutation rc 2。
4. validator source mutation：删除 meta claim 与 static closure 之间的 provenance，或让 static closure 对
   hardcoded substantive order claim 仍报 clean，control rc 0、mutation rc 2。
5. 只改 JSON 中两条 meta claim 的既有 forge 测试继续通过，证明 canonical byte-exact 未退化。

每条黑盒 mutation 仍须先跑 byte-identical control rc 0，再 mutation + re-sign 后 rc 2；stderr 单行净化，
不得回显路径、primitive value、signature、identity、正文或 traceback；工作树五产物 SHA 不得漂移。

## 7. Canonical 产物与 independent validator

- `evaluation_order_gate` 恰七键、顺序与最终值保持不变。
- 新增的三个 structure-gate evidence blocks 与 `names_reachable_in_signature += ledger` 保留；不新增其它字段。
- analyzer 与 validator 各自执行 runtime ledger 与 static closure，不共享可执行代码、缓存或 event 文件。
- validator 不得 import analyzer / tests / previous task modules，不得把 delivered JSON / REPORT 当 expected。
- 若派生修复不改变科学结果，JSON / REPORT 必须与 GR12R2 byte-identical；CHECKSUMS 随源码变更重建。

## 8. 目标命令

只运行：

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/test_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py -q -p no:cacheprovider
PYTHONDONTWRITEBYTECODE=1 python3 -B posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/analyze_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py --check-existing
PYTHONDONTWRITEBYTECODE=1 python3 -B harness/verify_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
```

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行 rejected GR12 /
GR12R1 / GR12R2、GR11 或更早任务的目标命令，不得运行 `pytest harness/` 整目录。

## 9. 绝对禁止与停止条件

GR12R2 §8 的全部禁止继续生效：不读 hidden / 正文 / list elements / 未登记 raw，不碰其它 primitive，
不试组合 / bucket / threshold / selector / candidate，不调用模型/API、不产生费用，不修改 accepted objects
或冻结件，不 merge/tag/fetch/pull/push，不调用 subagent，不自动创建 GR13。

回执必须给出拓扑、六 SHA、五项 / 四项闭包、两条 meta booleans 的 runtime/static provenance、四类新增
mutation 的 control rc 0 / mutation rc 2、GR12R2 全部 read/order/science 闭包、三条目标命令，以及测试后
HEAD / status / tag / 六 SHA 无漂移、无 `__pycache__`。

唯一 commit 完成后立即停止并返回 owner。
