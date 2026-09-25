# Claude Code 任务书 —— Stage 0-a development wave2 · GR15R3 trace-calls-made source-semantics / boundary-closure correction

> **状态：COMPLETE — 2026-09-24 验收 verdict：Redo。留档不开工。**
>
> source-semantics binding 与科学结果已闭合；实际 product read 前移的顺序自保护仍有缺口。
> 验收证据以 canonical handoff §4.21 为准。后续唯一任务书：
> `docs/TASKBOOK-STAGE0A-GR15R4-DEVELOPMENT-TRACE-CALLS-MADE-PRE-PRODUCT-READ-CLOSURE-CORRECTION-2026-09-24.md`。
>
> **唯一交付：** 从 accepted GR14 独立重建 GR15 同一单 primitive、development-only、零费用
> separability envelope；不重开字段选择或科学问题。只纠正 rejected GR15R2 的一处 canonical factual
> finding，并用一份不做全 worktree 广域遍历的干净执行闭合边界。
>
> **固定科学范围：** 唯一 primitive 仍为 `trace.calls_made`；projected baseline 仍为 GR9；不得加入
> `trace.invalid_tool_calls` 或任何其它 primitive，不得重新选择、排名、组合或搜索。
>
> **授权来源：** GR15R2 `c42faaef5cc6661ed216c1162273c953a65beb58` 于 2026-09-23 验收为
> `Redo`。本轮只是同一 GR15 授权内的限定纠正，不构成 GR16，也不开放 hidden、样本外、模型、费用、
> selector、candidate、promotion、freeze、正式运行或远端操作。

## 1. GR15R2 findings 与本轮完成定义

GR15R2 的提交拓扑、六文件 SHA、P1 read-syntax closure、五类 delivery round identity、direct-integer
第 16 槽、58-class 科学 payload、analyzer 与 independent validator 均可闭合；退回只因以下 finding：

1. 钉住的 accepted source `67cf84c9…:harness/verify_stage0a.py` 实际在 `check_trace()` 中写的是
   `t.get("kind") == "call" and t.get("tool")`。analyzer / validator 的独立 AST gate 也都明确只接受
   `.get("kind")`；但两份实现的 `CALLS_MADE_SOURCE_SEMANTICS`、canonical JSON 与 REPORT 第 6 / 706 行
   却逐字宣称 `t["kind"] == "call"`。两种写法在缺少 `kind` 时行为不同，不能当作同一 accepted-source
   事实。现有 canonical-fact closure 只查到 `calls_made=len(calls)` 和 invalid/allowed 边界，没有把
   comprehension 的实际 access form 与发布叙述机械绑定。
2. 执行者披露开发期曾运行一次 `find .` 遍历整个 worktree。没有证据表明任何文件正文被打开、哈希或
   保存，因此不登记为内容泄漏或数据事故；但全 worktree 目录遍历不能作为“hidden 未接触”的合规证据。
   本轮必须从 accepted GR14 新建干净 worktree，只对任务书点名路径做定向检查，不清理或进入旧系统
   临时目录。

本轮完成定义：canonical narrative 必须逐字写成 accepted source 的 `.get("kind")` / `.get("tool")`
comprehension；两套实现必须在读取 delivered product、重建 science 或 canonical compare 前，把该叙述与
各自从钉住 source AST 重建的 access form 机械绑定；真实错写、删闸、恒真化和绕开 mutation 必须 rc 2；
GR15R2 已关闭的 P1 / round-identity findings、direct-integer、canonical 其余事实、数值 payload 与边界均
不得回退；三条目标命令全绿；唯一 commit 后立即停止。

## 2. 起点、branch、worktree 与拓扑

- parent / accepted development head：GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`
- projected scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- rejected scaffold：GR15R2 `c42faaef5cc6661ed216c1162273c953a65beb58`
- older rejected scaffolds：GR15R1 `160db5f1be90921c6959e63ad25ff0fd3a946039`、GR15
  `08b70f5c35ee63152b7aa10c8795a1afd1acd369`
- branch：`stage0a-wave2-trace-calls-made-source-semantics-boundary-closure-gr15r3`
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-calls-made-source-semantics-boundary-closure-gr15r3`
- 2026-09-23 Codex 已只读确认上述 local branch 与 worktree path 均不存在；创建前必须再次确认，存在即停止，
  不删、不覆盖、不复用。
- 最终 commit 唯一 parent 必须为 accepted GR14；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`。
- rejected GR15R2 / GR15R1 / GR15 与 GR3 / GR6 / GR12 / GR12R1 / GR12R2 / GR13 / GR13R1，
  以及 metadata-only sibling GR6R1，全部不得进入 ancestry。
- rejected GR15R2 只可按六个 full `c42faa…:path` object 作 scaffold / finding 对照；不得 checkout、
  cherry-pick、merge 或把它当 accepted scientific input。

固定 commit message：

```text
posthoc(stage0a): close calls-made source semantics (GR15R3)
```

不得 merge、tag、fetch、pull、push。

## 3. 唯一允许的 changed paths

相对 accepted GR14 必须仍为以下六个新增路径、0 个已有文件修改：

```text
harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/CHECKSUMS-TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 目录恰五项；CHECKSUMS 只登记 analyzer、test、JSON、REPORT 四项且不自列。不得创建第七件产物、
runtime event file、registry copy、signature table、lookup、candidate 或仓内临时文件。

## 4. accepted-source semantics factual closure

两套实现各自钉住并解析 accepted source object：

```text
67cf84c9d40057fec02be7a963694938bff78a58:harness/verify_stage0a.py
sha256 ce014e0850efc23617387ad01b3154d091abb3a5dfc9d7ccd40671f0b56c7dce
```

该对象的 `check_trace()` 中，`calls` 的唯一 accepted comprehension 是：

```python
[t for t in trace if t.get("kind") == "call" and t.get("tool")]
```

必须同时做到：

1. analyzer / validator / JSON / REPORT 的共享 source-semantics narrative 逐字使用
   `t.get("kind") == "call" and t.get("tool")`；不得再写成 `t["kind"]`，也不得降格成只说“kind equality”。
2. 两套实现各自从钉住 source AST 证明：单 comprehension、direct `trace` iterator、两段合取、
   `.get("kind") == "call"`、`.get("tool")`、direct return key `calls_made=len(calls)` 与
   `trace.ok=not missing`；validator 不 import analyzer。
3. canonical-fact closure 必须把 narrative 的两个 access forms 与同一轮 AST gate 的机械结果绑定；
   不能只搜 `len(calls)` / “不定义 calls_made”子串，也不能靠最终 JSON / REPORT byte mismatch 兜底。
4. 这套 exact-source-semantics enforcement 自身必须有 whole-source self-provenance：删除、恒真化、
   断开 AST→narrative 绑定、跳过 invocation 或把 product read/rebuild 挪到它之前，均须提前 rc 2。
5. 以下真实 mutation 每条都先跑 byte-identical control rc 0，再在 product read、science rebuild 或
   canonical compare 前 rc 2，stderr 单行净化：
   - narrative 把 `t.get("kind")` 写回 `t["kind"]`；
   - narrative 把 `t.get("tool")` 写回 `t["tool"]`；
   - narrative 省略 kind/tool 任一 access form；
   - 删除或恒真化 exact narrative gate；
   - 删除 AST-derived access-form binding 或把它改成固定常量；
   - 绕开 analyzer / validator 的 pre-product invocation。

REPORT 固定首行、固定末行与科学 conclusion 保持原样；末尾 `GR15 COMPLETE` 指科学问题 GR15，不是
delivery-round 标识，不得改成 GR15R3 COMPLETE。只有 correction heading / provenance 与上述 factual
narrative 随本轮更新。

## 5. GR15R2 已闭合部分：禁止回退

- P1 whole-source read-syntax closure 必须继续保守覆盖 literal / constant / computed / dynamic subscript、
  `.get` / `__getitem__`、unbound get-like call、`operator.getitem` / `itemgetter`、helper / callable alias；
  key 无法证明不可能是 `calls_made` 时不得当作安全。
- P1 两个 gate 经名字引用可达的闭包仍恰五名；全模块可证的本字段读取仍恰一处，P1 到任何 definite /
  unknown-key read site 的路径仍为 0。
- 12 条 read-syntax 阳性对照、四族删除 / 恒真化、detector 删除与三种绕开测试全部保留。
- analyzer / validator / tests / JSON / REPORT 的 delivery round 统一为 GR15R3 correction，科学问题仍为
  GR15，parent 仍为 accepted GR14；三份 Python 首部与 round constants 的 identity closure 不得回退。
- available 第 16 槽仍是同一次 P4 raw read 的 exact `int`、不是 `bool`、且 `>=0`；malformed 两行仍是
  scalar `"not_applicable"`；194 available / 2 malformed；逐行 drop-last 等于 GR9 的 15 槽。

## 6. 科学 payload：禁止漂移

- GR7 / GR8 / GR9 / GR10 anchors 不变；34 个 GR9 classes split `16` / unsplit `18`；
- 本轮 classes `58`，support `1…25`，singleton `28`；collision `7`，reduction `35`，`|N_tc|=47…53`；
- Layer A `0/16`，G1/G2/G3/G4=`16/16/0/16`；G3 blocker `16`，singleton risk `16`；
- Layer B `16/16` feasible，minimum final `76`，minimum padding `23`；
- fixed conclusion：

```text
trace.calls_made exact-count closure still requires anonymous padding; no deployable selector is closed
```

若任一 class membership、cell aggregate 或科学读数漂移，停止并报告；不得调参或改结论。

## 7. accepted object 与 rejected scaffold closure

accepted closure 仍为 `87 objects / 11 generations / 3 siblings`，必须机械求和，不得写死总数。

单独钉住 rejected GR15R2 六个 scaffold object 的 raw-byte SHA-256：

```text
59e4f974b1f0695d30585abf57689af69e137c586b70a75c9c0253e8248bf4b3  harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
a65807fbd757eff4735f3bc201968bb18e6afec8c364fa11d1aa6fabac52ce6e  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py
c7f5762014e308df2a1c4ef977001fa448eb62f41cfd8ae21bcf3d4e26cc4373  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py
9dcf9877ea7e28b8b5f7e0d9109ec7f050b77811bf8e0eb1c95bcc5d286e4ec4  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
a26a724b9536c29b150ed48e7c2c3eaa3c6a953536b006fc91a39182b18ec551  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
751952c96b1d0012eeeb9079101728b573f3b9caf29cf7ef92ab24eaa16ad0fe  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/CHECKSUMS-TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

只可用 GR15R2 三份 Python object 作机械 scaffold；其 JSON / REPORT / CHECKSUMS 不得解析为 expected
science，只可 raw-byte SHA closure 与 finding 对照。GR15R1 / GR15 的既有 raw-byte closure 继续保留，
二者不得优先于 GR15R2 scaffold 或变成 accepted input。

## 8. 输出、边界与干净执行

继续发布 `preregistered_primitive="trace.calls_made"`、`model_calls=0`、`cost_cny=0`、
`hidden_touched=false`、`promotion_decision=not_made`、`freeze_decision=not_made`。

绝不保存 primitive value/frequency、signature tuple/value/digest、positive lookup、class member、row identity、
join key、正文、绝对路径、其它 primitive values 或 arm-conditioned rule。

本轮不得运行 `find .`、全 worktree `find`、全树 glob/scandir/walk 或等价广域目录枚举。branch/worktree、
六个 changed paths、posthoc 五项、cache/pyc/candidate 只允许用任务书点名的精确路径做定向检查。不得进入、
列举、stat、hash、清理或引用 hidden/raw/旧系统临时目录；359 个旧沙箱目录保持未动。

不授权：另一 primitive、组合、排名、selector hypothesis、candidate、k8、第二 matcher、bucket/cap/threshold
搜索、配置选择、阈值变更、dataset expansion、样本外、hidden、G0、模型/API、费用、正式运行、promotion、
freeze、merge/tag/fetch/pull/push 或 GR16。

## 9. independent validator 与 tests

validator 不得 import analyzer/test/前序实现；必须独立 materialize accepted objects、运行两份器材、重建
canonical JSON / REPORT、逐字节比较并核 CHECKSUMS。失败只输出单行 `FAIL [stage]: reason`。

GR15R2 的全部正负测必须保留；本任务 §4 的新增 mutation 每条都必须先跑 byte-identical control，并证明
在 product read / science rebuild / canonical compare 前 rc 2。不得通过最终 product mismatch 特判 source
semantics mutation，也不得只验证发布布尔。

## 10. 唯一目标命令

固定 Python 3.12.2，只运行：

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

不得运行整个 `pytest harness/`、前序目标命令、额外 probe、rescore、sweep、模型 runner 或 hidden 命令；
不得安装依赖或联网。

## 11. 提交前清单与停止点

- branch/worktree 创建前仍不存在；parent 精确为 accepted GR14；GR15R2 / R1 / GR15 不在 ancestry；
- 相对 parent 恰六个 `A` / 0 个 `M`；posthoc 恰五项；CHECKSUMS 恰四条且不自列；
- accepted `87 / 11 / 3` closure、GR15R2 六 scaffold SHA 与 older rejected raw closure 分别闭合；
- source narrative 与钉住 AST 都是 `.get("kind") == "call"` + `.get("tool")`，且绑定闸自证闭合；
- P1 read-syntax 与五类 round identity closure 无回退；delivery round 为 GR15R3，科学问题仍为 GR15；
- direct-integer、194/2、drop-last、canonical 其余事实与 §6 scientific payload 全部无漂移；
- 三条目标命令 rc 0；status clean；tag 0；无 `__pycache__`、`*.pyc`、临时文件或第七件产物；
- 无全 worktree 广域遍历、hidden、模型/API、费用、远端操作、第二 primitive、组合、selector、candidate 或 GR16。

唯一 commit 完成后立即停止并返回 owner。回执只报告 topology、六 SHA、三条命令、source-semantics finding
closure、P1 / round-identity 无回退、无漂移 scientific payload 与边界自查；不得继续下一 primitive、组合、
selector、candidate、hidden、样本外、远端操作或 GR16。
