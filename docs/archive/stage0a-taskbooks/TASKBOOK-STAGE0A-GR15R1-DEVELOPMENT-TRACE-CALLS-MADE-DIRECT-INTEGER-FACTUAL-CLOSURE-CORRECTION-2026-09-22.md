# Claude Code 任务书 —— Stage 0-a development wave2 · GR15R1 trace-calls-made direct-integer / factual-closure correction

> **状态：COMPLETE — 2026-09-23 验收 verdict：`Redo`。**
>
> **后续任务书：**
> `docs/TASKBOOK-STAGE0A-GR15R2-DEVELOPMENT-TRACE-CALLS-MADE-P1-READ-SYNTAX-ROUND-IDENTITY-CLOSURE-CORRECTION-2026-09-23.md`
>
> GR15R1 不进入 accepted chain。其 topology、六文件 SHA、direct-integer、canonical JSON / REPORT、
> scientific payload、analyzer 与 validator 均闭合；退回只因 P1 whole-source read provenance 未覆盖
> `.get("calls_made")` 与一般 computed-key 访问，且 analyzer / validator / tests 的文件首部仍把本轮
> 分别写成 GR15 / GR15 / GR14，没有统一为 GR15R1 correction。GR15R2 只纠正这两项。
>
> **唯一交付：** 从 accepted GR14 独立重建 GR15 同一单 primitive、development-only、零费用
> separability envelope；不重开字段选择或科学问题。只纠正 rejected GR15 的三处验收 finding：
> P1 对 `trace.calls_made` 的真实提前读取、把 direct integer 末槽改成 availability tuple、以及 canonical
> JSON / REPORT 对 primitive/source semantics/历史计数的事实错写。
>
> **固定科学范围：** 唯一 primitive 仍为 `trace.calls_made`；projected baseline 仍为 GR9；不得加入
> `trace.invalid_tool_calls` 或任何其它 primitive，不得重新选择、排名、组合或搜索。
>
> **授权来源：** GR15 `08b70f5c35ee63152b7aa10c8795a1afd1acd369` 于 2026-09-22 验收为
> `Redo`。本轮只是同一 GR15 授权内的限定纠正，不构成 GR16，也不开放 hidden、样本外、模型、费用、
> selector、candidate、promotion、freeze、正式运行或远端操作。

## 1. GR15 finding 与本轮完成定义

GR15 的提交拓扑、六文件 SHA、accepted object closure 与数值读数可闭合；analyzer / validator rc 0，
pytest 也必须由本轮重新复核。但测试全绿不能覆盖以下 implementation / factual findings：

1. analyzer 与 validator 在 P1 的 `trace_calls_made_contract()` 中执行
   `type(trace["calls_made"])`，并在 `for name in GR10_TRACE_KEYS` 中再次执行 `type(trace[name])`。
   Python 必须先求值 subscript 才能调用 `type()`；因此这已经是 P1 runtime read。现有 whole-source
   closure 特意把 `type(...)` 的 subscript 排除，导致发布的 “P4 first-and-only read” 与真实控制流不符。
2. 预注册关系是 `S_tc(r)=S_exact(r)+(verdict["trace"]["calls_made"],)`；GR15 对 available rows 实际追加
   `("available", count)`，测试也把这个二元组钉成正确形态。这个同构包装仍不是任务书预注册的 direct
   non-negative integer slot。
3. canonical REPORT / JSON 多处把 primitive 写成不存在的 `len(trace.calls_made)`，把
   `calls_made=len(calls)` 错述成 `invalid` / allowed-set 计数；REPORT 标题仍写 GR14；owner-decision 与
   underdetermined 段又把“历史已单独检验四项 / 连同本轮共五项 / 从未检验两项”写成三项或四项并漏掉
   GR14 `trace.invalid_tool_calls`。

本轮完成定义：两套实现必须先关闭真实 P0–P3 no-read closure，再于 P4 对 available row 各读一次 raw
integer；signature available slot 必须就是该 integer 本身；canonical facts 全部纠正；数值 payload 不漂移；
三条目标命令全绿；唯一 commit 后立即停止。

## 2. 起点、branch、worktree 与拓扑

- parent / accepted development head：GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`
- projected scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- rejected scaffold：GR15 `08b70f5c35ee63152b7aa10c8795a1afd1acd369`
- branch：`stage0a-wave2-trace-calls-made-direct-integer-factual-closure-correction-gr15r1`
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-calls-made-direct-integer-factual-closure-correction-gr15r1`
- 2026-09-22 Codex 已只读确认上述 local branch、登记的 origin ref 与 worktree path 均不存在；创建前
  必须再次确认，存在即停止，不删、不覆盖、不复用。
- 最终 commit 唯一 parent 必须为 accepted GR14；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`。
- rejected GR15 与 GR3 / GR6 / GR12 / GR12R1 / GR12R2 / GR13 / GR13R1，以及 metadata-only
  sibling GR6R1，全部不得进入 ancestry。
- rejected GR15 只可按六个 full `08b70f5…:path` object 作 scaffold / finding 对照；不得 checkout、
  cherry-pick、merge 或把它当 accepted scientific input。

固定 commit message：

```text
posthoc(stage0a): correct trace-calls-made direct-integer closure (GR15R1)
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

## 4. P1 不得提前读取 `trace.calls_made`

P0–P8 顺序不变：

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

P1 可做且只可做：

- 由 accepted `check_trace()` AST 静态证明 `calls` comprehension、两个 filter、
  `calls_made: len(calls)`、`trace.ok = not missing`；
- 证明 verdict/trace key presence 与 accepted schema path；
- 证明 accepted source 的 `len(calls)` 产物在语义上是 non-negative integer；
- 重建 GR10 key/type registry，但不得通过任何 runtime subscript 求值本轮字段。

P1 禁止出现或可达：

```text
trace["calls_made"]
trace[TRACE_CALLS_MADE_KEY]
trace[name]  # 当 name 可取 calls_made
.get("calls_made")
type(trace[...calls_made...])
isinstance(trace[...calls_made...], ...)
```

`type()` / `isinstance()` 会先求值参数，不是 no-read 例外。exact `int`、not-bool、`>=0` 检查必须移到 P4
phase gate 之后，作用于同一次 raw read 得到的内存值；不得二次 subscript。

whole-source AST / call-graph provenance 必须覆盖 direct literal、constant-key、computed/dynamic-key 与 helper
alias 路径。以下真实 mutation 必须在读取 delivered product、重建科学结论或 canonical compare 前 rc 2：

1. 在 P1 加 `type(trace["calls_made"])`；
2. 在 P1 加 `isinstance(trace[TRACE_CALLS_MADE_KEY], int)`；
3. 让 P1 的 `trace[name]` loop 可取到 `calls_made`；
4. 用 helper/alias 把本轮字段读入 P1；
5. 删除或恒真化上述 no-read enforcement。

测试不得再通过“父节点是 `type(...)`”把真实 subscript 当成零读取。

## 5. direct-integer signature 闭包

signature version 仍为：

```text
machine_observable_exact_count_shape_plus_trace_calls_made_v1
```

available row 的唯一允许关系：

```text
S_tc(r) = S_exact(r) + (verdict["trace"]["calls_made"],)
```

第 16 槽必须直接是 exact `int`、不得为 `bool`、且 `>=0`。不得包装成 `("available", count)`、list、dict、
namedtuple、dataclass 或其它容器；不得 `len()`、cap、bucket、round、sum、distinct、normalization、fallback。

accepted malformed/unavailable path 必须显式收成单个 canonical scalar sentinel `"not_applicable"`；只允许在
`schema_shape == "malformed"` 且 `trace is None` 时使用。不得用一元 tuple `("not_applicable",)`；sentinel
不能与任何 available row 合并，因为 GR9 前 15 槽已经钉死 malformed shape。

逐行必须满足：

```text
drop_last(S_tc(r)) == S_exact(r)
```

测试必须直接断言 194 个 available rows 的 slot 是 raw integer 且等于同一次 P4 read；2 个 malformed rows
为 scalar sentinel。必须有 mutation 拒绝旧 `("available", count)` 与旧 `("not_applicable",)` 形态。

## 6. factual / canonical closure

JSON、REPORT、analyzer、validator 与 tests 必须统一以下事实：

- round 是 GR15R1 correction；科学问题是 GR15 `trace.calls_made` envelope，不得再把 REPORT 标题写 GR14；
- primitive 精确拼写为 `trace.calls_made`，不是 `len(trace.calls_made)`；
- accepted source 语义只能写为：`calls` 从 `kind == "call"` 且具名 tool 的 trace events 构造，
  `calls_made` 直接发布 `len(calls)`；
- `allowed` / `invalid` comprehension 只解释 `trace.invalid_tool_calls`，不得用来定义 `calls_made`；
- 历史已单独检验四项：GR11 missing、GR12R3 wrong-param-calls、GR13R2 satisfied、GR14 invalid-tool-calls；
- 连同本轮 `calls_made` 共五项被逐项检验；从未检验恰两项：
  `len(suppressed_wrong_actions)` 与 `len(trace.failure_paths_fired)`；
- “其余六项未进入本轮 signature/runtime read”可以保留，但不得把它误写成六项历史上都未检验；
- underdetermined、boundary、next-owner-decision、REPORT 普通事实行与 JSON arrays 必须彼此一致，并明确
  `trace.invalid_tool_calls` 未在本轮重读或组合。

普通 factual line mutation 必须在独立重建后的整文件 byte comparison 被拒绝；同时增加定向正测，防止
canonical expected 自己再次共同写错。不得只证明 analyzer 与 validator 彼此相同。

## 7. accepted object 与 scaffold closure

accepted closure 与 GR15 相同：11 代 ancestry + 3 个 accepted siblings，必须机械求和为
`87 objects / 11 generations / 3 siblings`。每代 full `commit:path` object、CHECKSUMS、唯一 parent 与
六新增路径规则全部重建；不得写死总数。

另外单独钉住 rejected GR15 六个 scaffold object 的 SHA-256：

```text
82a27f4a020615158f30668d7f57bfd52d8a3a4973d6e194723247548f046944  harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
7f699d368a40166385d66654176c206e2d039655b2684328082b6177e6ec56b6  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py
887eaf797b6daa8e9acd8ea93aa41301ea91bac20f9a7ddb3bce1fb132c1f0f8  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py
18664df138e7ad35cb2ea186fd2ed889b2d766befdd0847eb7bc09eebe4da292  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
c23a54a6a3e61e5ec88008d3ce1559ecad2bef1723486e8c10a03434195f32e9  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
3ebe2b95385a00d2308d92b31f7132dfbe0ef24addd71e9207d1de01133fd694  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/CHECKSUMS-TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

只可用三份 Python object 作机械 scaffold。GR15 JSON / REPORT / CHECKSUMS 不得解析为 expected science；
只可 raw-byte SHA closure 与 finding 对照。

## 8. 固定科学 payload：只允许无漂移纠正

direct integer 替代 `("available", count)` 是一一同构；因此以下 payload 必须由两套实现各自重建并保持：

- GR7 / GR8 / GR9 / GR10 anchors 与原任务书完全相同；
- 34 个 GR9 classes 中 split `16`、unsplit `18`；本轮 classes `58`，support `1…25`，singleton `28`；
- 16 格 collision 恒 `7`，相对 GR9 reduction 恒 `35`；`|N_tc|=47…53`；
- Layer A `0/16`；G1/G2/G3/G4 passing=`16/16/0/16`；
- `TRACE_CALLS_MADE_CLASS_CLOSURE_FAILS_G3=16`，singleton risk `16`，其它三项 blocker count 0；
- Layer B `16/16` feasible，minimum final `76`，minimum padding min `23`；
- fixed conclusion：

```text
trace.calls_made exact-count closure still requires anonymous padding; no deployable selector is closed
```

若 direct-integer correction 产生任何 class membership、cell aggregate 或科学读数漂移，停止并报告，不得
调参或改结论。

## 9. 输出与禁止面

保持原 GR15 的 aggregate-only 输出、k=2、泄漏扫描、reason 闭集、Layer A / B 定义、固定 REPORT 首末行与
顶层声明。必须继续发布：

```text
preregistered_primitive="trace.calls_made"
model_calls=0
cost_cny=0
hidden_touched=false
promotion_decision=not_made
freeze_decision=not_made
```

绝不保存 primitive value/frequency、signature tuple/value/digest、positive lookup、class member、row identity、
join key、正文、绝对路径、其它 primitive values 或 arm-conditioned rule。

不授权：另一 primitive、组合、排名、selector hypothesis、candidate、k8、第二 matcher、bucket/cap/threshold
搜索、配置选择、阈值变更、dataset expansion、样本外、hidden、G0、模型/API、费用、正式运行、promotion、
freeze、merge/tag/fetch/pull/push 或 GR16。

## 10. independent validator 与 tests

validator 不得 import analyzer/test/前序实现；必须独立 materialize accepted objects、运行两份器材、重建
canonical JSON / REPORT、逐字节比较并核 CHECKSUMS。失败只输出单行 `FAIL [stage]: reason`。

除原 GR15 的 mutation closure 外，至少新增并闭合：

1. P1 literal-key `type(...)` / `isinstance(...)` 提前读取；
2. P1 dynamic `trace[name]` 可达本轮字段；
3. P1 helper/alias 提前读取；
4. 删除或恒真化 pre-P4 no-read provenance；
5. 恢复 `("available", count)` 或 `("not_applicable",)` wrapper；
6. 把 raw integer 再取 `len()`、bucket、cap、round 或 offset；
7. REPORT 标题写回 GR14；
8. 任一 `len(trace.calls_made)` 文本重新进入 canonical JSON / REPORT；
9. 用 allowed/invalid 语义定义 calls_made；
10. 把 never-tested count 写成 3、把 historically tested count 写成 3/4（漏 GR14）或 owner-decision 漏掉
    `trace.invalid_tool_calls`。

每条 source mutation 必须先有 byte-identical control rc 0，再在产品读取 / scientific compare 前 rc 2；
不能只靠最终 product mismatch 特判。

## 11. 唯一目标命令

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

## 12. 提交前清单与停止点

- branch/worktree 创建前仍不存在；parent 精确为 accepted GR14；rejected GR15 不在 ancestry；
- 相对 parent 恰六个 `A` / 0 个 `M`；posthoc 恰五项；CHECKSUMS 恰四条且不自列；
- accepted `87 / 11 / 3` closure 与 rejected GR15 六 scaffold SHA 分别闭合；
- P1 对本轮字段零 runtime subscript，P4 是真实 first-and-only read；
- available slot 是 raw non-negative integer，malformed slot 是 scalar sentinel；drop-last 逐行闭合；
- canonical facts、历史四项 / 当前五项 / never-tested 两项与 owner-decision 全部一致；
- 科学 payload 与 §8 全部无漂移；三条目标命令 rc 0；status clean；tag 0；
- 无 `__pycache__`、`*.pyc`、candidate、临时文件、第七件产物、hidden、模型/API、费用或远端操作。

唯一 commit 完成后立即停止并返回 owner。回执只报告 topology、六 SHA、三条命令、三类 finding closure、
无漂移 scientific payload 与边界自查；不得继续下一 primitive、组合、selector、candidate、hidden、样本外、
远端操作或 GR16。
