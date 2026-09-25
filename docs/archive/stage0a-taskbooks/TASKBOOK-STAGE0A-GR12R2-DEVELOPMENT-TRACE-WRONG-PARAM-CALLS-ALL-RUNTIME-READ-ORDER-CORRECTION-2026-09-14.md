# Claude Code 任务书 —— Stage 0-a development wave2 · GR12R2 all-runtime-read order correction

> **状态：COMPLETE — Codex verdict `Redo`（2026-09-14）；已停止，不得继续执行。**
>
> **后续唯一任务书：**
> `docs/TASKBOOK-STAGE0A-GR12R3-DEVELOPMENT-TRACE-WRONG-PARAM-CALLS-ORDER-EVIDENCE-META-BOOLEANS-CORRECTION-2026-09-14.md`
>
> **唯一交付：** 从 accepted GR11 重新交付同一 GR12，只关闭 GR12R1 遗留的一项 blocking finding：
> P1 schema/type closure 不得执行、比较、保存或以条件访问 len(trace.wrong_param_calls)；所有真实长度读取
> 必须第一次发生在 GR8 / GR9 anchors 完整闭合后的 P4，并被 analyzer 与 independent validator 各自的
> runtime ledger 真实观察。不得改变 GR12R1 已纠正的 baseline-only P3 与
> structural split → current Layer A → current Layer B 顺序。
>
> **验收来源：** GR12R1 commit a0bdb7757bacee748c817ec103e191bc49554297 于 2026-09-14 被 Codex
> 退回。其拓扑、六产物、科学读数与 330 项测试均可复现；唯一 blocking finding 是
> trace_wrong_param_contract() 在 P1 直接取长度，但 ledger 与测试只观察 canonical S_wp wrapper。
>
> **继续生效的只读任务书：**
> - docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR12-DEVELOPMENT-TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-2026-09-11.md
> - docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR12R1-DEVELOPMENT-TRACE-WRONG-PARAM-CALLS-EVALUATION-ORDER-CORRECTION-2026-09-12.md
>
> 除本任务书明确替换的“全部 runtime length 读取面与负测”外，原 GR12 的 signature、inputs、objects、
> anchors、canonical fields、结论闭集、禁止面、三条命令，以及 GR12R1 的 P0–P8、baseline-only P3、
> split → Layer A → Layer B 和停止条件全部继续生效。

## 1. 唯一问题与完成定义

### 1.1 Blocking finding

GR12R1 的 analyzer 在 P1 rebuild_all() 中调用 verdict_schema_gate()；该函数经
trace_wrong_param_contract() 执行：

    exact_count(len(trace[TRACE_WRONG_PARAM_KEY]), ...)

independent validator 有同一条路径。P1 注释虽明确禁止取本轮长度，phase ledger 却只在
refined_signature_of_row() wrapper 中记录 EVENT_PRIMITIVE，因而漏掉这次真实读取。

现有 test_only_the_helper_may_take_the_new_length_and_only_once() 只统计
trace_wrong_param_calls_count() helper 内的 len()，没有扫描整个 analyzer / validator 的第二个直接读取点；
现有 early-call mutations 也只把 S_wp / wrapper 挪早，不能拒绝在 schema gate、contract 或其它 P0–P3
函数里直接取长度。

### 1.2 完成定义

analyzer 与 validator 各自必须同时满足：

1. P0–P1 只做静态、keyset 与 exact type identity 闭包。可以证明 trace 是 dict、direct key 存在且值的
   type 恰为 list；不得对该 list 调 len、bool、iter、hash、比较、索引、切片、集合化或保存派生值。
2. P2–P3 继续走 GR12R1 已验收的 baseline-only path；不得调用 S_wp、长度 helper，或以任何别名 /
   contract / validation helper 读取本轮长度。
3. P4 才允许第一次产生本轮长度 value。每一个实际长度读取必须经过 P4 runtime guard；ledger 事件必须
   紧贴真实 len 调用，而不是仅记录一个可能不读取长度的外层 wrapper。
4. P4 内不得为同一行重复重读长度来做 contract 或 equality 检查。应复用 canonical accessor 已返回的
   单个内存值完成 slot、drop-last 与 schema 验证；not-applicable 行不得伪记成已读取 primitive value。
5. 全源码 AST closure 必须枚举所有对 direct trace.wrong_param_calls、TRACE_WRONG_PARAM_KEY 或其简单别名
   施加 len 的调用点，并证明不存在 P4-gated accessor 之外的第二入口。
6. P5 structural split、P6 全部 current Layer A 与 aggregate verdict、P7 current Layer B 的真实顺序保持
   不变；P8 只渲染与比较已经闭合的结果。
7. canonical JSON / REPORT 只能从本轮 ledger 与重建结果产生；科学 aggregate 必须重新计算。

任一 P0–P3 length read、未记账的 length read、虚构的 primitive event、直接绕过 accessor、重复取值或
顺序布尔硬编码，必须在生成或比较科学结论前 rc 2。

## 2. 科学范围保持不变

- parent：accepted GR11 04ffebe89c3ef38bb7b042052983dac40d1b1dd3
- baseline：accepted GR9 48b9f720958fc409419d7c823c607192f6c57925
- 唯一 primitive：len(trace.wrong_param_calls)
- signature：machine_observable_exact_count_shape_plus_trace_wrong_param_calls_v1
- 旧 15 槽逐槽等于 GR9，只追加一个末槽；投影只 drop-last
- 不含、不读取、不重算 GR11 len(trace.missing)
- target 仍为机械重建的 GR7 16 个 MU / k7-off / G4-pass cells
- G1–G4、G2 cap 78、G3 exact 1/10、7041-vector closure、k=2 suppression 不变
- 结论仍只按原 GR12 四句闭集与固定顺序选择

GR12R2 不是新实验，不提出第三 primitive，不检验组合、bucket、cap、threshold、selector 或 candidate。
被退回 GR12 / GR12R1 不进入 accepted ancestry，也不是 accepted evidence。

## 3. Branch、worktree 与提交拓扑

- branch：stage0a-wave2-trace-wrong-param-calls-all-runtime-read-order-correction-gr12r2
- worktree：/Users/hzjin/Desktop/spool-research-wave2-trace-wrong-param-calls-all-runtime-read-order-correction-gr12r2
- 2026-09-14 Codex 已只读确认上述精确 branch 与 worktree path 均不存在；执行者创建前必须再次确认。
- 从 accepted GR11 新建；最终 commit 唯一 parent 必须为 GR11，相对 parent 恰一笔 commit。
- rejected GR12 5e97492…、GR12R1 a0bdb775…、GR6、GR3 与所有 non-ancestry siblings 均不得进入 ancestry。
- 不 cherry-pick、merge 或读取 rejected sibling worktree。可只按下一节六个 pinned a0bdb775…:path
  objects 读取 GR12R1 作为纠正 scaffold。

commit message 固定为：

    posthoc(stage0a): close all primitive read order gaps (GR12R2)

不得 tag、fetch、pull、push。

## 4. 唯一允许的 changed paths

相对 accepted GR11 必须仍为恰六个新增路径、0 个已有文件修改：

    harness/verify_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
    posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/analyze_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
    posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/test_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
    posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
    posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
    posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/CHECKSUMS-TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256

posthoc 目录仍须恰五项；CHECKSUMS 只登记 analyzer / test / JSON / REPORT 四项且不自列。

### 4.1 rejected GR12R1 六对象仅作纠正 scaffold

    e1a0d0d9c4c203a1530013f6ab4174fe72b812eec6186c1462563fc25573380f  harness/verify_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
    08c815d8c8139bfe8063b88f5f96961288addcb9d96faa40cd1cb289f4470ad5  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/analyze_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
    2c01ed157438076078dcfd3a57078865654d19c4bf48080e2fa75858993a1c62  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/test_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py
    f55e5e463344e199ac4d5eb54ad89401ca99bf09ee6030c353696b01de6049e6  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
    aa0cdc53132f0f9803072eb1d25b211151127004a0f92b69ba82ed7fca527eb2  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
    24547046c9d2cfd782882b5a3c28f6f8ba9a38bfe75e3d6fecf3a5d0167c3fd2  posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/CHECKSUMS-TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256

执行者必须从 full a0bdb775…:path 自行复核完整路径与 SHA；不一致即停止，不得从 sibling worktree 补取。

## 5. 必须新增并闭合的真实负测

原 GR12 与 GR12R1 全部负测继续保留。至少再新增：

1. analyzer runtime instrument：让 trace.wrong_param_calls 的长度读取可观察；正常运行中第一次真实
   length-read event 必须严格晚于 GR8 与 GR9 anchor-complete，所有真实读取都只发生在 P4。
2. not-applicable / malformed 路径不得产生伪 primitive-read event；event 数必须与本轮实际 available
   rows 的读取数机械一致，不预填 196。
3. validator source mutation：在 verdict_schema_gate、trace_wrong_param_contract、rebuild_all 或任一 P1
   helper 中加入 direct len(trace[TRACE_WRONG_PARAM_KEY])，control rc 0、mutation rc 2。
4. validator source mutation：在 P2 / P3 baseline path 中通过别名、contract helper 或直接 subscript 取
   wrong-param length，control rc 0、mutation rc 2。
5. validator source mutation：绕过 canonical P4 accessor、把 ledger.note 与真实 len 分离、只记录 wrapper
   事件、或对同一 row 重读长度，均须 rc 2。
6. 全源码 AST 正测必须证明 analyzer / validator 各自只有一个 P4-gated runtime length accessor；不能只
   统计 named helper 的函数体。
7. 仅把 evaluation_order_gate 的返回布尔写死为 true / false，即使真实 pipeline 顺序未另行破坏，也不得
   得到有效交付。

每条黑盒 mutation 仍须先跑 byte-identical control rc 0，再 mutation + re-sign 后 rc 2；stderr 单行净化，
不得回显路径、primitive value、signature、identity、正文或 traceback；工作树五产物 SHA 不得漂移。

## 6. Canonical 产物与 independent validator

原 GR12 canonical 字段及 GR12R1 evaluation_order_gate 七键保持不变，不新增第八键或调试字段。
first_primitive_after_gr8_gr9_anchors 必须从“所有真实 length read”的 ledger events 派生；
order_verified_from_runtime_events 与 order_claims_hardcoded 必须由本轮 runtime / static closure 机械得到，
不得只是常量声明。

validator 仍不得 import analyzer / tests / previous task modules，不得把 delivered JSON / REPORT 当 expected
document。它必须独立重建 canonical JSON / REPORT、独立执行 P0–P8、独立证明全 runtime-read closure。

## 7. 目标命令

只运行：

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/test_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py -q -p no:cacheprovider
    PYTHONDONTWRITEBYTECODE=1 python3 -B posthoc/stage0a-development-wave2-trace-wrong-param-calls-exact-count-separability-envelope/analyze_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py --check-existing
    PYTHONDONTWRITEBYTECODE=1 python3 -B harness/verify_trace_wrong_param_calls_exact_count_separability_envelope_wave2.py

默认 Python 无 pytest 时可用已有 /opt/anaconda3/bin/python3；禁止联网安装。不得运行 rejected GR12 /
GR12R1、GR11 或更早任务的目标命令，不得运行 pytest harness/ 整目录。

## 8. 绝对禁止

- 不读取 hidden、题目 / answer / trace 元素正文、未登记 raw、sibling worktree 或样本外数据；
- 不读取 trace.missing runtime count 或其余五个未检验 eligible primitive 的 runtime value；
- 不试第三 primitive、combination、interaction、bucket、cap、threshold 或 selector hypothesis；
- 不创建 candidate、k8、第二 matcher，不选 configuration，不改 gate / matcher / routing；
- 不调用模型/API、不产生费用，不做 promotion / freeze / G0 / 正式运行；
- 不修改 accepted commits、冻结件、EXECUTION_POLICY.md 或 Codex handoff；
- 不 merge、tag、fetch、pull、push，不调用 subagent，不自动创建 GR13。

证据不足一律 underdetermined。

## 9. 回执与停止条件

回执必须给出：

- branch / worktree / commit / unique parent、相对 GR11 六 A / 0 M、reflog / ancestry / tag / clean；
- 六 changed paths 与 SHA、posthoc 五项、CHECKSUMS 四项闭包；
- P0–P8 runtime order，以及所有真实 wrong-param length reads 的 event phase / count；
- P1 type-only schema closure 不取长度、P3 baseline-only 不可达任何 length accessor 的 AST 与 runtime 证据；
- direct P1 / P2 / P3 length-read mutations、绕过 accessor、伪 event、重复读取、硬编码布尔的 control rc 0 /
  mutation rc 2；
- 原 GR12 / GR12R1 全部 source、signature、closure、gate、leakage、boundary 证据；
- 三条目标命令原始结论，以及测试后 HEAD / status / tag / 六 SHA 无漂移、无 __pycache__。

唯一 commit 完成后立即停止并返回 owner。不得继续第三 primitive、组合、selector、candidate、GR13、
hidden、样本外、模型、费用、promotion、freeze、G0、正式运行或远端操作。

## 10. Codex 验收 —— 2026-09-14

### 10.1 已核通过

- commit `e11a589b2d8cba3584c146b172ea3d43176f6471` 唯一 parent 为 accepted GR11
  `04ffebe89c3ef38bb7b042052983dac40d1b1dd3`；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`。
  branch / worktree / reflog / message / tag 0 / clean status 均闭合；GR12、GR12R1、GR6、GR3 均不在 ancestry。
- 六文件 SHA 与回执逐项相同；posthoc 恰五项，CHECKSUMS 恰登记 analyzer / test / JSON / REPORT 四项且
  不自列。GR12R1 六个 full `commit:path` scaffold SHA 全部与 §4.1 相同。
- 两套实现各自只有一处 direct wrong-param `len()`，均位于 `read_trace_wrong_param_length`；accessor AST
  逐字节相同，phase guard 在真实 `len` 前、ledger event 紧贴其后。194 次 available read 全部由该 accessor
  帧在 P4 发出，not-applicable 两行不记 event；P1 / P3 五个入口在静态调用图上不可达 accessor。
- P3 baseline-only 与 P5 structural split → P6 全部 Layer A → P7 Layer B 均保持正确；split `0/34`、
  16 格与 GR9 相同、collision 42、final `82…88`、Layer A / B `0/16`、reduction 0。无组合、第三 primitive、
  selector、candidate、hidden、模型或费用。
- Codex 独立复跑三条目标命令均 rc 0：pytest `351 passed in 2028.63s (0:33:48)`；analyzer
  `--check-existing` 三产物 byte-identical 且 `PASS`；validator 重建 69 pinned objects 后 canonical JSON /
  REPORT byte-identical 且 `PASS`。复跑后 HEAD / status / tag / 六 SHA 无漂移，无 `__pycache__`。
- §6 的 canonical-shape 疑问裁定为：三个新增 structure-gate evidence blocks 可以保留；
  `evaluation_order_gate` 的七键仍精确未变，原 GR12 §9 未冻结整份 JSON 禁止加入由两套实现独立重建、
  非调试且不泄漏的 static closure。JSON 相对 GR12R1 的实际 diff 除三块证据外，还包含 instrumentation
  必然带来的 `names_reachable_in_signature += ledger`；该项同样不构成 scientific parameter 或 blocking finding。

### 10.2 Blocking finding

- analyzer 的 `evaluation_order_gate()` 在第 4922–4923 行仍直接返回
  `order_verified_from_runtime_events=True` 与 `order_claims_hardcoded=False`；validator 第 4904–4905 行同样
  是两个 AST `Constant`。本任务书 §6 第 141–143 行明确要求这两项由本轮 runtime / static closure 机械得到，
  不得只是常量声明。
- 新增 `assert_order_gate_is_derived()` 只检查三条实质顺序布尔；新增 source mutations 也只把这三条写死。
  测试第 1263–1286 行只要求三条返回 value 为 `ast.Name`，没有检查上述两条 meta booleans。JSON forge
  测试只能证明 byte-exact，不能证明 provenance。因而 351 项全绿仍接受当前规范违例。

### 10.3 Verdict

`Redo`

GR12R2 不进入 accepted chain。只开放 GR12R3：从 accepted GR11 重建同一六件交付，仅让上述两条
meta booleans 分别由真实 runtime ledger 与 static AST closure 派生，并新增常量替代 / provenance 断开
source mutations。不得改变 GR12R2 已闭合的 read/order/science 结果或扩大实验范围。
