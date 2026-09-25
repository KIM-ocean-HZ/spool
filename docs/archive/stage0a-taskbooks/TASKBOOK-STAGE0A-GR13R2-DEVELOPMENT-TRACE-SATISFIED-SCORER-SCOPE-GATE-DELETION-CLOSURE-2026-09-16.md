# Claude Code 任务书 —— Stage 0-a development wave2 · GR13R2 scorer-scope gate-deletion closure

> **状态：COMPLETE — Codex verdict `Accept`（2026-09-20，Europe/London）；归档，不再作为开工入口。**
>
> **验收结果：** commit `9b8b1e299d5e80e0cc027a7829a3cb75e8f8c51a` 无 blocking finding、
> 无 non-blocking finding；439 tests、analyzer `--check-existing` 与 independent validator 均 rc 0，
> 测试后现场无漂移。后续任务书：无，等待 owner decision；不得自动创建 GR14。
>
> **唯一交付：** 从 accepted GR12R3 再次重建同一 GR13，只关闭 GR13R1 遗留的一项 validator
> negative-test finding：让 scorer-scope enforcement 自身具有 P0 / whole-source provenance，并用真实删除或
> 恒真化 gate 的黑盒 mutation 证明任一 gate 缺失都会在 canonical 科学结论比较前 rc 2。
>
> **验收来源：** GR13R1 commit `0bedadfa7d47d03528cae7864e00634c7511d8fc` 于
> 2026-09-16 被 Codex 退回。其拓扑、六产物、conclusion detail、lineage map、75-object summary、
> scorer-scope source mutations、P0–P8、科学 aggregate 与三条目标命令均闭合；本任务不得重开这些结果。
>
> **继续生效的只读任务书：**
> `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR13R1-DEVELOPMENT-TRACE-SATISFIED-FACTUAL-CLOSURE-CORRECTION-2026-09-16.md`
>
> 除本任务书明确替换的 gate-deletion closure 外，GR13R1 任务书及其引用的原 GR13 scientific scope、
> inputs、objects、P0–P8、signature、anchors、canonical aggregate、结论闭集、禁止面与停止条件全部继续生效。

## 1. 唯一 blocking finding 与完成定义

GR13R1 任务书 §6(5) 明确要求：删除任一 scorer-scope gate，必须在比较科学结论前 rc 2。交付中的测试：

```python
def test_dropping_the_scorer_scope_gate_from_the_validator_is_rejected():
    _mutate_validator((
        '        "decision_local_bindings_checked": len(decision_bindings),',
        '        "decision_local_bindings_checked": len(decision_bindings) + 1,'))
```

并没有删除或架空 validator 的真实 enforcement；它只改错一个 canonical 发布值，最终依靠 JSON byte mismatch
在 compare 阶段被拒绝。若单独删除 `_need(decision_reads == 0)`、`JoinedStr` ancestry 闸、
`satisfied_reads` 非空闸或五个 decision-local 全绑定闸，accepted source 下 canonical 输出不变，当前
validator 没有 self-provenance closure 能发现缺闸。因此 403-case suite 全绿不能兑现该条款。

完成条件：

1. analyzer 与 independent validator 的 scorer-scope closure 继续各自从 pinned accepted source AST 推导；
   现有发布值与 REPORT 文字不变。
2. validator 在 P0 或等价的 pre-comparison static phase，从当前整份源码机械证明 scorer-scope enforcement
   仍完整存在且绑定到实际计算：读取非空、五名全绑定、decision-local read 为 0、每个 read 位于
   `ast.JoinedStr`、narrative count 等于全部 read。不得只搜索注释 / error string / test 名称。
3. 不新增第四个 structure-gate evidence block，不增加 `evaluation_order_gate` 第八键；该 self-check 可只作
   非发布的 preflight invariant，canonical JSON / REPORT 的科学与 factual payload 应保持不变。
4. 新增真实 validator-source mutations，分别删除或恒真化上述 gate families；每条必须先 control rc 0，
   mutation rc 2，且 stderr stage 必须证明在 canonical product / science comparison 之前退出。
5. 至少再覆盖一条 analyzer-side gate 被删或 provenance 断开的静态阳性对照，证明两套实现的 published
   scorer-scope facts 都仍由执行闸支撑；不得靠修改 delivered JSON / REPORT 制造 mismatch 冒充 gate deletion。
6. 原 GR13R1 的六条 accepted-scorer source mutations继续保留：逃出 `JoinedStr`、进入 `passed`、进入
   tuple `outcome`、进入其余 decision-local、移除读取、架空 binding closure，均须 control rc 0 → mutation rc 2。

## 2. 必须保持 byte/science 不变的闭包

- parent：accepted GR12R3 `0ecd8d15a6eed905394791a9292faf640fe4ca2b`
- projected baseline：accepted GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- 唯一 primitive：`len(trace.satisfied)`；signature 仍只是在 GR9 15 槽末尾追加一个 exact-count 槽
- classes 41、support `1…26`、singleton 14、split `7/34`
- 16 格 collision 恒 36、reduction 恒 6、`|N_ts|=76…82`
- Layer A `0/16`，G1/G2/G3/G4 passing=`16/8/0/16`；Layer B `0/16`
- `K_ts⊆K_exact=16/16`，P0–P8、single accessor、194 次 P4 read 与全部 boundary flags 不变
- conclusion sentence / rider 原样；detail 仍发布 G2 pass/fail `8/8`、G3 pass `0/16`
- commits map 仍为 GR12R3→GR11→GR10→GR9…，validator summary 仍机械输出 75 objects
- canonical JSON 与 REPORT 除非 self-provenance 的非发布实现绝对需要，否则应与 GR13R1 逐字节相同；
  任何 payload 变化必须逐字段证明只属于本 finding，科学字段不得变化

不得把本轮变成第四 primitive、组合、selector、candidate、configuration、样本外或 hidden 任务。

## 3. Branch、worktree 与提交拓扑

- branch：`stage0a-wave2-trace-satisfied-exact-count-separability-scorer-scope-gate-deletion-closure-gr13r2`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-trace-satisfied-exact-count-separability-scorer-scope-gate-deletion-closure-gr13r2`
- 2026-09-16 Codex 已只读确认上述精确 branch（本地与已登记 remote refs）及 worktree path 均不存在；
  执行者创建前必须再次确认。
- 从 accepted GR12R3 新建；最终 commit 唯一 parent 必须为 GR12R3，相对 parent 恰一笔 commit。
- rejected GR13 `f206463…`、GR13R1 `0bedadfa…`、GR12 / GR12R1 / GR12R2、GR6、GR3 与
  non-ancestry siblings 均不得进入 ancestry。
- 不 cherry-pick、merge 或读取 rejected sibling worktree；GR13R1 只可按 §5 的六个 full
  `0bedadfa…:path` objects 作为纠正 scaffold。

commit message 固定为：

```text
posthoc(stage0a): close scorer scope gate deletion (GR13R2)
```

不得 tag、fetch、pull、push。

## 4. 唯一允许的 changed paths

相对 accepted GR12R3 仍须恰六个新增路径、0 个已有文件修改：

```text
harness/verify_trace_satisfied_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/analyze_trace_satisfied_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/test_trace_satisfied_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/CHECKSUMS-TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 目录仍须恰五项；CHECKSUMS 只登记 analyzer / test / JSON / REPORT 四项且不自列。

## 5. rejected GR13R1 六对象仅作纠正 scaffold

```text
82e37d52816df3956fae3e630f7a88f087826ac5e7d4000b03f1c2de4e12e2e8  harness/verify_trace_satisfied_exact_count_separability_envelope_wave2.py
34880c698d834afae168cd254e553d57d01e233ebfe917a367bc003eaef2f761  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/analyze_trace_satisfied_exact_count_separability_envelope_wave2.py
ffdefb1b402b82168b5f1a6fb72074834628451698245cf7a6942aae12583b4d  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/test_trace_satisfied_exact_count_separability_envelope_wave2.py
4b6b12a8dda8e410a34bd5ef986edbc068606e5388676a98bc7d6e065ece5b82  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
4e2f8edc5e45153ad14b6ba69427b6b26001fac1832d0d7f88c4fb07043f730d  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
a1edc4ac4274b5dde22af9accbe281b482f0f40d68802038d38fbefcdcdf200a  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/CHECKSUMS-TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

执行者必须从 full `0bedadfa7d47d03528cae7864e00634c7511d8fc:path` 自行复核；不一致即停止。
不得解析 rejected GR13R1 JSON / REPORT 取得 expected science；它们只可作 raw-byte SHA closure。

## 6. Independent validator 与负测

- validator 不得 import analyzer / tests / previous modules，不得把 delivered JSON / REPORT 当 expected。
- actual gate-deletion tests 必须改 validator executable source，而不是只改 product、REPORT、published count、
  error string 或 test assertion；删除后仍产生相同 canonical payload也必须被 preflight self-check 拒绝。
- self-check 必须基于 AST binding/call/condition provenance；单纯 `source.count()`、注释锚或函数名存在不足以
  证明 enforcement 生效。
- 每条 mutation 先跑 byte-identical control rc 0，再 mutation rc 2；stderr 单行净化，不回显路径、
  primitive value、signature、identity、正文或 traceback。
- 现有 conclusion / lineage / scorer-source / object-count 负测、product forge 与全部 GR13 tests 不得删弱。
- 测试后五份工作树产物、validator、HEAD 与六 SHA 不得漂移，不得留下 `__pycache__` 或临时 candidate。

## 7. 目标命令

只运行：

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/test_trace_satisfied_exact_count_separability_envelope_wave2.py -q -p no:cacheprovider
PYTHONDONTWRITEBYTECODE=1 python3 -B posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/analyze_trace_satisfied_exact_count_separability_envelope_wave2.py --check-existing
PYTHONDONTWRITEBYTECODE=1 python3 -B harness/verify_trace_satisfied_exact_count_separability_envelope_wave2.py
```

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行 rejected GR13 / GR13R1、
GR12R3、GR11 或更早任务的目标命令，不得运行 `pytest harness/` 整目录。

## 8. 绝对禁止、回执与停止条件

继续禁止 hidden、正文、list elements、未登记 raw、其它 primitive runtime values、第四 primitive、组合、
bucket/threshold、selector、candidate、configuration selection、dataset expansion、样本外、模型/API、费用、
promotion、freeze、正式运行、G0、修改 accepted objects / freeze / protocol / `EXECUTION_POLICY.md` / Knote
handoff，以及 merge/tag/fetch/pull/push；不得调用 subagent，不得自动创建 GR14。

回执必须给出拓扑、六 SHA、五项 / 四项闭包、真实 gate-deletion / constant-true mutations 的 control rc 0 /
mutation rc 2 与失败 stage、GR13R1 全部 factual/read/order/science 闭包、三条目标命令，以及测试后
HEAD/status/tag/六 SHA 无漂移、无 `__pycache__`。

唯一 commit 完成后立即停止并返回 owner。
