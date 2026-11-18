# Claude Code 任务书 —— Stage 0-a development wave2 · GR15R5 semantic-completion closure correction

> **状态：COMPLETE — 2026-09-26 已验收，verdict：`Redo`。留档不开工。**
>
> 后续唯一任务书：`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR15R6-DEVELOPMENT-TRACE-CALLS-MADE-BOUNDARY-PROOF-COMPLETION-CORRECTION-2026-09-26.md`。
> 验收证据见 canonical handoff §4.23；本轮不进入 accepted chain。
>
> **唯一交付：** 从 accepted GR14 独立重建同一六件交付，只纠正 GR15R4 的 source-semantics
> 实际完成证明缺口。正常版本的顺序与科学结果没有被推翻；不重开科学实验。
>
> **固定科学范围：** 唯一 primitive 仍为 `trace.calls_made`，projected scientific baseline 仍为 GR9。
> 不增加 primitive，不做组合、排名、搜索、selector 或 candidate。
>
> **授权来源：** GR15R4 `a7413a4d594bd862c98b461ce94ddc0f04b7a707` 于 2026-09-25 验收为
> `Redo`。依 canonical handoff §1(5)，这是同一 GR15 授权内的纠正，不构成 GR16。

## 1. Finding 与完成定义

GR15R4 正确加入模块顶部 runtime guard、实际 reader / helper / alias 的保守引用闭包、六族检查及
读取成功后才计数的 spy。拓扑、六 SHA、87/11/3、source narrative、P1、identity、direct integer 与科学
结果闭合。Codex 独立复跑 analyzer / validator 均 rc 0；pytest 因下述静态 finding 主动中止，实际为
`50 passed in 227.83s`，中断 rc 2。执行者的完整 `881 passed in 13499.37s` 是其回执，不冒充 Codex
独立完成。旧负测改由最先运行的 `product-boundary` 报错本身合理，不是退回原因。

**唯一 blocking finding：guard 消费的是可伪造的合格计数字典；AST 中有调用不等于调用已执行。**

- validator 第 3992–3994 行 `_invokes()` / 第 4006–4022 行 `_main_order_holds()` 用 `ast.walk`
  计调用；第 4634–4640 行只要求 release 前的赋值 RHS 中存在 source-semantics 调用，再复用赋值名。
  第 174–178 行 `open_after()` 只核 `proven` 与 `_semantics_is_bound(binding)` 的数值。
- 将第 10300 行的 RHS 从 `_assert_source_semantics_is_enforced()` 改成下面这个表达式：

```python
{
    "gate_proven_get_access_forms": 2,
    "narrative_comprehensions_bound_to_the_ast": 1,
    "narrative_kind_forms_bound_to_the_ast": 1,
    "narrative_tool_forms_bound_to_the_ast": 1,
    "narrative_subscript_access_forms": 0,
} or _assert_source_semantics_is_enforced()
```

  左侧非空字典使右侧调用被短路；实际 source-semantics enforcement 与 AST→narrative binding 均未在
  此处执行。但赋值名、调用节点、所在语句位置、名字引用次数、I/O token 与 guard AST 块均不变。
  第 10302 行仍会接受这份合格字典打开边界，随后 `_preflight()` 读取 CHECKSUMS / products，早于
  后续 signature / P0 中的真正 binding。
- analyzer 第 3929–3931 行 `_calls_named()`、第 4551–4557 行 release 前赋值审计及第 187–192 行
  `release()` 同构；第 10426 行可作同样替换，随后放行实际 science rebuild。
- 现有两套 `source_semantics_invocation_skipped` mutation 仅把调用换成 `{}`，既移除了调用节点又
  给了不合格结果，未覆盖保留死调用并供给合格结果的路径。
- 证据是源码审查和内存 AST 对照：两套变异的 Name/ctx 多重集、Call target 多重集、Attribute
  多重集、赋值目标与语句位置均保持不变，字典由 `ast.literal_eval` 确认为非空。未 import / 执行
  变异实现、未写变异文件，不声称变异版已实测 rc 0 或发生了数据污染。

必须证明 source-semantics 自证与 binding **实际完成后**才允许 product read / rebuild。不能仅要求
调用名出现在 AST、收到等于预期的计数、或最后产物仍然相同。

## 2. 起点、branch、worktree 与提交

- accepted parent：GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`
- projected scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- 唯一优先 scaffold：rejected GR15R4 `a7413a4d594bd862c98b461ce94ddc0f04b7a707`
- older rejected：GR15R3 `4d6a419cae875d3c8595c890056791d75203097a`、GR15R2
  `c42faaef5cc6661ed216c1162273c953a65beb58`、GR15R1 `160db5f1be90921c6959e63ad25ff0fd3a946039`、
  GR15 `08b70f5c35ee63152b7aa10c8795a1afd1acd369`
- branch：`stage0a-wave2-trace-calls-made-semantic-completion-closure-gr15r5`
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-calls-made-semantic-completion-closure-gr15r5`
- 2026-09-25 Codex 已用 exact ref 与 exact path 确认二者均不存在。创建前再查；任一已存在即停止，
  不删、不覆盖、不复用。
- 最终唯一 parent 必须为 GR14；相对 GR14 恰一笔 commit、六个 `A` / 0 个 `M`。
- GR15R4 / R3 / R2 / R1 / GR15、GR3 / GR6 / GR12 / GR12R1 / GR12R2 / GR13 / GR13R1
  与 metadata-only sibling GR6R1 均不得进入 ancestry。

固定 commit message，无正文、无 trailer：

```text
posthoc(stage0a): close calls-made semantic completion (GR15R5)
```

不得 checkout / cherry-pick / merge rejected commit；不得 tag、fetch、pull、push。

## 3. 唯一允许的 changed paths

```text
harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/CHECKSUMS-TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 恰五项；CHECKSUMS 恰登记 analyzer、tests、JSON、REPORT 四项，不自列。不新增第七件产物、
事件文件、registry copy、signature table、lookup、candidate 或仓内临时文件。

## 4. 实际完成与边界放行闭合

两套实现各自完成，不共享可执行实现，validator 不 import analyzer / tests / 前序实现。

1. source-semantics preflight 的完整 enforcement、自证与 AST→narrative binding 返回成功，必须是
   guard 放行的必要前提。合格计数字典本身不能代替完成证明。可以用严格 AST / 控制流白名单，或
   由真实完成点产生且受同等自保护的内部状态；不要求实现通用 Python 分析器。
2. 证明范围包含入口到放行点的绑定与控制流：不能把 `BoolOp`、条件表达式、未执行 lambda、死分支
   或提前 return 后的调用当成已执行；不能经同名局部 / callable alias 替换必要的 enforcer。
   无法证明安全的新增赋值、分支或调用应 fail closed，不为这些语法增加运行特例。
3. 若增加 completion 状态 / token，其产生、消费与先后次序也要受检查；删除或恒真化产生/消费的
   gate、提前放行、绕开真实 completion 或改为常量，必须在 product read / rebuild 前 rc 2。
   不把本 finding 从可伪造计数字典转移到可任意置真的新布尔。
4. GR15R4 的实际 JSON / REPORT / CHECKSUMS relocation、hash、helper / alias、preflight 内读取、
   所有静态检查之前读取、经 git 读取、rebuild 提前、guard / 六族 gate 删除与恒真化、绕开与挪后
   的检查和负测全部保留。报错允许由更早的正确 stage 给出，但必须保留真实边界观测。
5. 只修改完成证明、读取顺序与非发布自证；不得改变 narrative、accepted-source semantic gate、
   signature、科学计算、阈值、输入与披露范围，不新增科学字段。

必须新增的真实源码 mutations（两套实现分别覆盖）：

- §1 的非空合格字典 `or` 死调用；条件表达式中返回同一合格字典、另一分支保留检查调用；
- 调用放入未执行 lambda / 死分支，实际走常量返回路径；
- 在 source-semantics preflight 内提前返回合格结果，原 enforcement / binding 调用留在不可达代码中；
- 入口的必要 enforcer 被同名局部绑定或 callable alias 替换为返回合格字典的函数；
- 新 completion enforcement 自身的删除、恒真化、跳过与挪后。

每条先在 byte-identical sandbox 用同一 spy 跑 control rc 0，再施加 mutation，要求 rc 2、单行净化
stderr、成功 product opens 为 0、成功 rebuild-input opens 为 0。新增只在内存记录的语义完成与实际
rebuild 入口观测：control 必须证明真实 completion 先于第一次 product open / rebuild entry，且观察器
确实命中过这些点；变异不得先发生 read / rebuild 再拒绝。事件只传阶段枚举或计数，不带路径、内容、
逐行身份或 primitive value，不落磁盘。观察器本身不得为被测 guard 提供假的完成证据。

所有新 mutations 放入本轮目标 test file，仅由 §9 完整 pytest 执行；不在外部另跑 runtime probe。

## 5. 已闭合部分：禁止回退

- accepted source：`67cf84c9d40057fec02be7a963694938bff78a58:harness/verify_stage0a.py`，
  SHA-256 `ce014e0850efc23617387ad01b3154d091abb3a5dfc9d7ccd40671f0b56c7dce`。
- narrative 逐字保留 `[t for t in trace if t.get("kind") == "call" and t.get("tool")]`；独立 AST gate、
  五族计数、九条 controls、四条派生链与已有真实 mutations 不回退。
- 六个 `source_semantics_*` 发布计数仍为 `2 / 1 / 1 / 1 / 0 / 9`；新 completion 证据不发布。
- P1 read-syntax closure、12 条阳性对照、四族删除/恒真化、detector 与绕开测试保留；全模块本字段
  真实读点仍恰一处，P1 可达闭包恰五名，到 definite / unknown-key read site 的路径为 0。
- analyzer / validator / tests / JSON / REPORT 五面 delivery round 统一为 GR15R5 correction；科学
  问题仍为 GR15、accepted parent 为 GR14；identity closure 与全部旧负测保留。
- available 第 16 槽仍为同一次 P4 read 的 raw exact nonnegative `int`，不是 bool 或包装 tuple；
  malformed 仍为 scalar `"not_applicable"`，194 available / 2 malformed；drop-last 逐行等于 GR9。
- P0–P8、runtime/static order claims、87 objects / 11 generations / 3 siblings 的机械求和保留。

## 6. 科学 payload 与产物

科学内容保持：split / unsplit `16 / 18`；classes `58`、support `1…25`、singleton `28`；collision
`7`、reduction `35`、final `47…53`；Layer A `0/16`，G1/G2/G3/G4=`16/16/0/16`，G3 blocker 与
singleton risk 各 `16`；Layer B `16/16`，minimum final `76`、minimum padding `23`。

固定 conclusion：

```text
trace.calls_made exact-count closure still requires anonymous padding; no deployable selector is closed
```

REPORT 首行、末行与 conclusion 不变；`GR15 COMPLETE` 指科学问题，不改成 GR15R5。只更新 correction
heading、delivery labels、rejected-scaffold provenance。不得把 rejected 产物当 expected science；若科学
读数或 class membership 漂移，停止报告，不调参或改结论。

## 7. Scaffold 与原始字节闭包

GR15R4 六个 full `commit:path` object 的 SHA-256：

```text
95c6aed28d78d9bb6ee3a807e70d015949881e7860892af87e9c0339feedd17b  harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
5725eb4bc170c246454560948d20c00043dc637d3b61c433f6081cfb2f9134a0  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py
749b0c1fc1990b477ced45dfdf79a321bd11e9ae852bf522e2091d36ad287926  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py
e658e3ab448260cae2946ad5cb9d17fbc656b41c8677aab303d2c78829d0dae7  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
0d51b68cf391bb272bd8b7bac738e2f0f7126b82b1a6d3c66523b1b8a034d04f  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
af024a912dee2953560ce6749c9f31b67a1c9a20a5c345fa04f47fa60a271633  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/CHECKSUMS-TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

只有 GR15R4 三份 Python object 可作机械 scaffold；JSON / REPORT / CHECKSUMS 只作 raw-byte SHA
closure 与 finding 文字对照，不解析为 expected science。R3 / R2 / R1 / GR15 各六对象的既有 raw-byte
closure 保留，全部为 older rejected，不 import，不当 accepted input。

## 8. 执行边界

只读钉住对象与既有 development aggregate 闭包。不人工读取 rows / trace / answer、episode / gold /
M1 正文，不接触 hidden、未登记 raw、sibling worktree 或其它 primitive runtime value。不保存或回显
primitive value / frequency、signature value / tuple / digest、member、identity、join key、正文、绝对路径
或 arm-conditioned rule。

路径检查只针对本任务点名 ref / worktree、六件交付、posthoc 五项，以及 `harness/__pycache__` 与
`posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/__pycache__` 两个
精确目录；不做全 worktree find / glob / scandir / walk，不进入或清理 hidden / raw / 旧系统临时目录。

继续发布 `model_calls=0`、`cost_cny=0`、`hidden_touched=false`、promotion / freeze=`not_made`。
禁止 subagent、联网、安装依赖、模型/API、费用、第二 primitive、组合、排名、selector、candidate、
bucket/cap/threshold 搜索、配置选择、阈值变更、样本外、hidden、G0、正式运行、promotion、freeze、
修改 accepted / main / 冻结件或远端操作。不改 Knote 文档；Codex 验收后维护。

GR15R4 回执披露的单独计时、性能分析、计数器试跑和 pytest 子集不在该轮命令白名单内，不能沿用为
本轮权限；未据此推断科学污染或 hidden 接触。语法检查使用不落 `.pyc` 的内存 parse / compile；
不得再用会落 cache 的 `py_compile`。所有运行验证只走 §9 明确命令。

## 9. 验证命令

固定 Python 3.12.2；仅三条目标验证命令：

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

交付构建另允许同一 analyzer `--generate` 生成三份产品与不落 cache 的源文件语法检查。不得另跑计时 /
profile / spy probe、pytest 子集、前序目标命令、整目录 pytest、rescore、sweep 或模型 runner。若失败，
只据目标命令输出与源码定位修复；修复并重生成产物后，三条完整命令从头重跑。

## 10. 提交与停止

闭合唯一 parent / 一笔提交 / 六 A 零 M / posthoc 五项 / CHECKSUMS 四项、六 SHA、87/11/3、scaffold
及 older raw bytes；新死调用 / 假完成 mutations 与既有实际提前 read / rebuild mutations 均在边界前
rc 2；control 的真实语义完成先于 read / rebuild；三条目标命令 rc 0；P1、identity、source narrative、
direct integer 与 science 不回退；status clean、tag 0、两个精确 cache 目录不存在。

唯一 commit 完成后立即停止，只返回拓扑、六 SHA、三条命令、真实完成/读取顺序证据、科学结果与
执行边界自查；不得创建 GR16、自动检验下一 primitive 或维护 Knote 文档。
