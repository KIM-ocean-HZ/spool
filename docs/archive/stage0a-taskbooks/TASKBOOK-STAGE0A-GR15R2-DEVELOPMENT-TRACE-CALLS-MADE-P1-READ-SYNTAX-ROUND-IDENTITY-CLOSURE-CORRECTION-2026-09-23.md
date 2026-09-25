# Claude Code 任务书 —— Stage 0-a development wave2 · GR15R2 trace-calls-made P1 read-syntax / round-identity closure correction

> **状态：COMPLETE — Codex verdict：`Redo`（2026-09-23）。本文件仅供归档，不得开工。**
>
> **验收结论：** GR15R2 已关闭 P1 read-syntax 与 round-identity 两项原 finding，但 canonical
> source-semantics narrative 把 accepted source 的 `t.get("kind")` 错写成 `t["kind"]`；另有一次
> 全 worktree `find .` 广域目录遍历，不能作为 hidden 未接触的合规证据。GR15R2 不进入 accepted chain。
>
> **后续唯一任务书：**
> `docs/TASKBOOK-STAGE0A-GR15R3-DEVELOPMENT-TRACE-CALLS-MADE-SOURCE-SEMANTICS-BOUNDARY-CLOSURE-CORRECTION-2026-09-23.md`
>
> **唯一交付：** 从 accepted GR14 独立重建 GR15 同一单 primitive、development-only、零费用
> separability envelope；不重开字段选择或科学问题。只纠正 rejected GR15R1 的两处验收 finding：
> P1 whole-source no-read provenance 没有覆盖 `.get("calls_made")` 与一般 computed-key 读取，以及
> analyzer / validator / tests 的文件级 round identity 没有统一为 correction round。
>
> **固定科学范围：** 唯一 primitive 仍为 `trace.calls_made`；projected baseline 仍为 GR9；不得加入
> `trace.invalid_tool_calls` 或任何其它 primitive，不得重新选择、排名、组合或搜索。
>
> **授权来源：** GR15R1 `160db5f1be90921c6959e63ad25ff0fd3a946039` 于 2026-09-23 验收为
> `Redo`。本轮只是同一 GR15 授权内的限定纠正，不构成 GR16，也不开放 hidden、样本外、模型、费用、
> selector、candidate、promotion、freeze、正式运行或远端操作。

## 1. GR15R1 findings 与本轮完成定义

GR15R1 的提交拓扑、六文件 SHA、accepted-object closure、raw-integer 第 16 槽、canonical JSON / REPORT
与科学数值均可闭合；analyzer `--check-existing` 与 independent validator 由 Codex 独立复跑均 rc 0。
完整 pytest 在交互会话中断前运行到 45% 且无 failure，但测试全绿仍不能覆盖以下 implementation / factual
findings：

1. analyzer 的 `_is_calls_made_subscript()` 只接受 `ast.Subscript` 且 key 为 literal
   `"calls_made"` 或 `TRACE_CALLS_MADE_KEY`；`_unguarded_dynamic_trace_reads()` 又只接受 slice 为
   `ast.Name`。validator 同构。因此 P1 加入未使用结果的 `trace.get("calls_made")`、
   `trace.get(TRACE_CALLS_MADE_KEY)`、`trace["calls_" + "made"]` 或等价 computed-key 读取时，
   runtime value 已被读取，但 whole-source site count 仍是 1、P1 reachability 仍报 0、产品也不变。
   这违反 GR15R1 §4 明列的 `.get("calls_made")` 禁止面，以及 direct / constant / computed / dynamic /
   helper-alias 全读取面要求。
2. GR15R1 §6 要求 JSON、REPORT、analyzer、validator 与 tests 统一声明 correction round。JSON 的
   `produced_by` 与 REPORT heading 已是 GR15R1，但 analyzer module docstring 仍写 GR15，validator 仍写
   GR15，tests 更写成 GR14。现有 `assert_canonical_facts_are_closed()` 没有覆盖三份 Python 的文件级
   identity，因此 canonical expected 可以与交付源码共同错写。

本轮完成定义：两套实现必须在读取 delivered product、重建 science 或 canonical compare 前，机械证明
P1 对本轮字段的所有可能读取语法均为零；真实 `.get` / computed-key / alias mutations 必须 rc 2；五类
交付面必须统一为 GR15R2 correction、科学问题仍为 GR15；direct-integer、canonical facts、数值 payload
与全部边界不得回退；三条目标命令全绿；唯一 commit 后立即停止。

## 2. 起点、branch、worktree 与拓扑

- parent / accepted development head：GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`
- projected scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- rejected scaffold：GR15R1 `160db5f1be90921c6959e63ad25ff0fd3a946039`
- older rejected scaffold：GR15 `08b70f5c35ee63152b7aa10c8795a1afd1acd369`
- branch：`stage0a-wave2-trace-calls-made-p1-read-syntax-round-identity-closure-gr15r2`
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-calls-made-p1-read-syntax-round-identity-closure-gr15r2`
- 2026-09-23 Codex 已只读确认上述 local branch 与 worktree path 均不存在；创建前必须再次确认，存在即停止，
  不删、不覆盖、不复用。
- 最终 commit 唯一 parent 必须为 accepted GR14；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`。
- rejected GR15R1、GR15 与 GR3 / GR6 / GR12 / GR12R1 / GR12R2 / GR13 / GR13R1，以及
  metadata-only sibling GR6R1，全部不得进入 ancestry。
- rejected GR15R1 只可按六个 full `160db5f…:path` object 作 scaffold / finding 对照；不得 checkout、
  cherry-pick、merge 或把它当 accepted scientific input。older GR15 只保留 raw-byte closure / 历史对照。

固定 commit message：

```text
posthoc(stage0a): close calls-made read syntax and round identity (GR15R2)
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

## 4. P1 whole-source read-syntax closure

P0–P8 顺序不变；P4 仍是 available row 第一次且唯一读取 `trace.calls_made` runtime value 的阶段。

P1 只允许：accepted-source AST semantics、verdict/trace key presence、`tuple(trace)` keyset、以及明确
`continue` 掉 `calls_made` 后对其余七个 trace key 做 type contract。以下任何出现或可达路径均算真实读取：

```text
trace["calls_made"]
trace[TRACE_CALLS_MADE_KEY]
trace[name]                         # name 可能是 calls_made
trace["calls_" + "made"]
trace.get("calls_made")
trace.get(TRACE_CALLS_MADE_KEY)
trace.__getitem__("calls_made")
helper(trace) / helper_alias(trace) # helper 可读取本轮字段
```

实现不得靠不断枚举两个 known spelling 来假装完备。必须至少同时做到：

1. 对 P1 两个 gate 及其可达 helper 建立 AST 白名单或等价的保守闭包：除已钉死的 presence / keyset /
   guarded-loop 结构外，任何以 `trace` 为 receiver 的 method call、任何未被证明排除本轮 key 的 subscript、
   任何 computed/default/fallback 读取都 rc 2；
2. whole-module read-site scanner 覆盖 literal、constant-name、computed/dynamic subscript、`.get` /
   `__getitem__` 与 helper/callable alias；无法静态证明 key 不可能为 `calls_made` 时必须保守拒绝；
3. 调用图不能只识别 `ast.Call(func=ast.Name)` 的直接函数名后就声称 alias 已闭合；必须钉死 P1 reachable
   closure，或拒绝 P1 gate 内任何未白名单 callable / callable alias；
4. `p1_provenance_is_clean` 自身、它的 invocation 与 fail-before-product 顺序必须有 whole-source
   self-provenance；删除、恒真化或绕开任一族 enforcement 都必须在 canonical compare 前 rc 2；
5. analyzer 与 validator 各自实现，不共享可执行 code、cache 或 event file。

以下真实 source mutation 每条都必须先有 byte-identical control rc 0，再在 product read、science rebuild 或
canonical compare 前 rc 2，且 stderr 保持单行净化：

1. P1 加 `trace.get("calls_made")`；
2. P1 加 `trace.get(TRACE_CALLS_MADE_KEY)`；
3. P1 加 `trace["calls_" + "made"]`；
4. P1 把 computed key 先绑定到 local name 再 subscript；
5. P1 通过 helper 读取，再把 helper 绑定到 callable alias 后调用；
6. P1 加 `trace.__getitem__("calls_made")`；
7. 删除或恒真化 method-call、computed-key、alias 或 P1-reachability enforcement 任一族。

现有 GR15R1 的 literal `type(...)`、constant-key `isinstance(...)`、unguarded GR10 loop 与 direct helper
四条阳性对照必须保留并继续失败。

## 5. round identity / canonical closure

五类交付面必须统一以下区分：

- **交付 correction round：** GR15R2；JSON `produced_by="GR15R2"`、REPORT heading、analyzer module
  docstring、validator module docstring、tests module docstring 与定向正测全部一致；
- **科学问题：** 仍是 GR15 的单 primitive `trace.calls_made` separability envelope；不得改称 GR16；
- **parent：** accepted GR14；GR15 / GR15R1 都是 rejected scaffold，不进入 accepted chain。

P0 factual closure 必须解析三份 Python 的 module docstring / round constants，并证明上述区分；不能只检查
JSON / REPORT，也不能只证明 analyzer 与 validator 彼此相同。至少新增：

1. analyzer / validator / tests 任一文件首部写回 GR14 ⇒ rc 2；
2. 任一写成无 correction qualifier 的 GR15 delivery round ⇒ rc 2；
3. JSON / REPORT 写回 GR15R1 或把 scientific question 写成 GR15R2 / GR16 ⇒ rc 2；
4. 删除 Python-source identity closure 或将其恒真化 ⇒ compare 前 rc 2。

REPORT 固定首行、固定末行与科学 conclusion 保持原样；只有 correction-round heading / provenance 随本轮
机械更新。GR15R1 已纠正的 primitive spelling、`calls_made=len(calls)` source semantics、历史 4 项 / 当前
共 5 项 / never-tested 2 项与 `trace.invalid_tool_calls` 未重读未组合全部不得回退。

## 6. direct-integer 与科学 payload：禁止漂移

GR15R1 已正确关闭的部分必须原样保留：

- available 第 16 槽是同一次 P4 raw read 的 exact `int`、不是 `bool`、且 `>=0`；
- malformed 两行是 scalar `"not_applicable"`，只出现在 `schema_shape == "malformed"` 且 `trace is None`；
- 194 available / 2 malformed；逐行 drop-last 等于 GR9 的 15 槽；
- GR7 / GR8 / GR9 / GR10 anchors 不变；34 个 GR9 classes split `16` / unsplit `18`；
- 本轮 classes `58`，support `1…25`，singleton `28`；collision `7`，reduction `35`，`|N_tc|=47…53`；
- Layer A `0/16`，G1/G2/G3/G4=`16/16/0/16`；G3 blocker `16`，singleton risk `16`，其余 blocker 0；
- Layer B `16/16` feasible，minimum final `76`，minimum padding `23`；
- fixed conclusion：

```text
trace.calls_made exact-count closure still requires anonymous padding; no deployable selector is closed
```

若任一 class membership、cell aggregate 或科学读数漂移，停止并报告；不得调参或改结论。

## 7. accepted object 与 rejected scaffold closure

accepted closure 仍为 `87 objects / 11 generations / 3 siblings`，必须从每代 full `commit:path`、CHECKSUMS、
唯一 parent 与六新增路径规则机械求和，不得写死总数。

单独钉住 rejected GR15R1 六个 scaffold object 的 raw-byte SHA-256：

```text
a5ea11d2f9b9136c3d48d1d4837809c903cadcf8263e3d836acfefb6352d573d  harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
5c62b95370122201f46fae10b9cbd5c91156a84f4f286909e455d8e84bd588d2  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py
62506c7570859096fc20efb1eb2874ed2006c53bccca09beb2425742523d5a84  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py
c494925e69a04bafda61811d8d3f4b76234370894aa3a8fd63afaf5229bcdc90  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
af0328789620302671e849d292f619deb261056d672ddf28ba861ffa011d1e2a  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
4d31d9da15a758c5d69f4327f0bf89ecf4aaad8cd67834acd64e046a58fbdd2f  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/CHECKSUMS-TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

只可用 GR15R1 三份 Python object 作机械 scaffold；其 JSON / REPORT / CHECKSUMS 不得解析为 expected
science，只可 raw-byte SHA closure 与 finding 对照。older GR15 六 SHA 继续 raw-byte 闭合，其 Python 也不得
优先于 GR15R1 scaffold 或变成 accepted input。

## 8. 输出、边界与禁止面

继续发布 `preregistered_primitive="trace.calls_made"`、`model_calls=0`、`cost_cny=0`、
`hidden_touched=false`、`promotion_decision=not_made`、`freeze_decision=not_made`。

绝不保存 primitive value/frequency、signature tuple/value/digest、positive lookup、class member、row identity、
join key、正文、绝对路径、其它 primitive values 或 arm-conditioned rule。

不授权：另一 primitive、组合、排名、selector hypothesis、candidate、k8、第二 matcher、bucket/cap/threshold
搜索、配置选择、阈值变更、dataset expansion、样本外、hidden、G0、模型/API、费用、正式运行、promotion、
freeze、merge/tag/fetch/pull/push 或 GR16。

## 9. independent validator 与 tests

validator 不得 import analyzer/test/前序实现；必须独立 materialize accepted objects、运行两份器材、重建
canonical JSON / REPORT、逐字节比较并核 CHECKSUMS。失败只输出单行 `FAIL [stage]: reason`。

GR15R1 的全部正负测必须保留；本任务 §4–§5 的新增 mutation 每条都必须先跑 byte-identical control，并证明
在 product read / science rebuild / canonical compare 前 rc 2。不得通过最终 product mismatch 特判 P1
source mutation，也不得只验证发布布尔。

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

- branch/worktree 创建前仍不存在；parent 精确为 accepted GR14；GR15R1 / GR15 不在 ancestry；
- 相对 parent 恰六个 `A` / 0 个 `M`；posthoc 恰五项；CHECKSUMS 恰四条且不自列；
- accepted `87 / 11 / 3` closure、GR15R1 六 scaffold SHA 与 older GR15 raw closure分别闭合；
- P1 对 literal / constant / computed / dynamic / `.get` / `__getitem__` / helper-alias 全读取面为零；
- analyzer / validator / tests / JSON / REPORT 都声明 GR15R2 correction，科学问题仍为 GR15；
- direct-integer、194/2、drop-last、canonical facts与 §6 scientific payload全部无漂移；
- 三条目标命令 rc 0；status clean；tag 0；无 `__pycache__`、`*.pyc`、临时文件或第七件产物；
- 无 hidden、模型/API、费用、远端操作、第二 primitive、组合、selector、candidate 或 GR16。

唯一 commit 完成后立即停止并返回 owner。回执只报告 topology、六 SHA、三条命令、两项 finding closure、
无漂移 scientific payload 与边界自查；不得继续下一 primitive、组合、selector、candidate、hidden、样本外、
远端操作或 GR16。
