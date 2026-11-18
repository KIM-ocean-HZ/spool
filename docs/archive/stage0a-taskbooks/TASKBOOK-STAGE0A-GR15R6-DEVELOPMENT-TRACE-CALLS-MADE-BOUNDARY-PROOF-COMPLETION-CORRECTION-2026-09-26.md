# Claude Code 任务书 —— Stage 0-a development wave2 · GR15R6 boundary-proof completion correction

> **状态：COMPLETE — 2026-09-27 验收为 `Redo`，不再作为执行入口。**
>
> 后续唯一任务书：`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR15R7-DEVELOPMENT-TRACE-CALLS-MADE-BOUNDARY-CONTROL-INVENTORY-CORRECTION-2026-09-27.md`。
> 验收证据见 canonical handoff §4.24；本文件正文保留当时授权。
>
> **唯一交付：** 从 accepted GR14 独立重建同一六件交付，只纠正 boundary closure 自身的
> 实际完成证明。保留 GR15R5 已闭合的 source-semantics 完成与读取防护，不重开科学实验。
>
> **固定科学范围：** 唯一 primitive 仍为 `trace.calls_made`，projected scientific baseline 仍为 GR9。
> 不增加 primitive，不做组合、排名、搜索、selector 或 candidate。
>
> **授权来源：** GR15R5 `87be12f9c39eff50c037aeb7e5ca17675bdc76cb` 于 2026-09-26 验收为
> `Redo`。依 canonical handoff §1(5)，这是同一 GR15 授权内的纠正，不构成 GR16。

## 1. Finding 与完成定义

GR15R5 正确将 source-semantics 自证末尾报到、binding 同一对象交接及 release 连起来；入口白名单、
三函数 digest、17 类新增 mutations 与四类 forged-pin variants 的实现方向正确。拓扑、六 SHA、
87/11/3 与科学结果闭合。Codex 独立复跑 analyzer / validator 均 rc 0；完整 pytest 因下述静态
finding 主动中止，实际为 `47 passed in 157.17s`，中断 rc 2，不是测试失败。执行者的
`952 passed in 16200.88s` 只登记为回执，非 Codex 独立完成。

**唯一 blocking finding：保护完成路径的 boundary closure 仍可被死调用跳过，guard 接受伪造的全零闭包。**

- validator `_assert_product_boundary_is_enforced()` 第 5068 行仍为
  `closure = _assert_product_boundary_is_closed()`；改成以下 RHS 即跳过整个八族 closure：

```python
closure = {
    "statements_before_the_guard_is_armed": 0,
    "boundary_transitions_off_their_stage": 0,
    "pre_boundary_statements_reaching_a_product_or_rebuild": 0,
    "pre_boundary_io_references_off_the_registry": 0,
    "product_or_rebuild_entries_without_the_guard": 0,
    "guard_implementation_drift": 0,
    "pre_boundary_path_off_its_whitelist": 0,
    "semantic_completion_off_its_pinned_proof": 0,
} or _assert_product_boundary_is_closed()
```

- `_enforcement_audit()` 第 4142 / 4163–4165 行仍用 `_invokes()` 检查 preflight→enforcer，
  只认调用存在；新 direct-call / 入口白名单只约束 `main`，没有关闭这条内部调用边。
  `_ProductBoundary.prove()` 第 182–185 行只验字典的八项数值，然后设 `proven=True`。
- analyzer 第 5012 行 `closure = assert_pre_product_boundary_is_closed()` 同构；把左侧字典
  换成其 `PRE_PRODUCT_FAMILIES` 八键全零即可。第 4103 / 4137 行仍只查 `_calls_named()`，
  `PreProductGuard.prove()` 第 190–193 行接受合格字典作为 `proof`。
- 这会跳过新增第七/八族、guard digest 和它们的 controls / probes；保护这些路径的 closure 自身
  没有完成证明。三函数 completion digest 也不含 boundary preflight，并且 digest 本来就在被跳过
  的 closure 内计算。后续真实 source-semantics 的 audit / binding 仍能完成，因而不能用它们补证
  boundary closure 已执行。现有负测覆盖删除整个入口 stage、删/恒真各族、删除 `prove()`，未覆盖
  保留内部调用节点并向 `prove()` 供给合格假结果。这违反 GR15R5 §4(3–4) 的 enforcement 自保护。
- Codex 仅作源码和内存 AST 对照：两套变异只改上述一个函数，Name/ctx、Call target、Attribute/ctx
  多重集、入口顺序、其它函数/类 AST 与模块常量不变；左侧字典由 `ast.literal_eval` 确认为非空且
  八值全零。未 import / 执行变异实现、未写变异文件，不声称实测 rc 0。正常版没有提前读取或
  科学污染证据；单独改源码造成的晚期 CHECKSUMS mismatch 也不能代替边界前拒绝。

完成定义：**boundary enforcement / closure 自身真实完成，必须成为 `prove` 与 release 的必要前提。**
不能把同一缺口搬到另一份合格字典、布尔、无来源 token 或未执行的 AST 调用；只把检查加在可被
跳过的 closure 内也不能证明它自己执行了。

## 2. 起点、branch、worktree 与提交

- accepted parent：GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`
- projected scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- 唯一优先 scaffold：rejected GR15R5 `87be12f9c39eff50c037aeb7e5ca17675bdc76cb`
- older rejected：GR15R4 `a7413a4d594bd862c98b461ce94ddc0f04b7a707`、GR15R3
  `4d6a419cae875d3c8595c890056791d75203097a`、GR15R2 `c42faaef5cc6661ed216c1162273c953a65beb58`、
  GR15R1 `160db5f1be90921c6959e63ad25ff0fd3a946039`、GR15 `08b70f5c35ee63152b7aa10c8795a1afd1acd369`
- branch：`stage0a-wave2-trace-calls-made-boundary-proof-completion-gr15r6`
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-calls-made-boundary-proof-completion-gr15r6`
- 2026-09-26 Codex 已以 exact ref / path 确认 branch、worktree 均不存在，且 GR14 没有六件目标
  object。创建前再查；任一已存在即停止，不删、不覆盖、不复用。
- 最终唯一 parent 必须为 GR14；相对 GR14 恰一笔 commit、六个 `A` / 0 个 `M`。
- GR15R5 / R4 / R3 / R2 / R1 / GR15、GR3 / GR6 / GR12 / GR12R1 / GR12R2 / GR13 / GR13R1
  与 metadata-only sibling GR6R1 均不得进入 ancestry。

固定 commit message，无正文、无 trailer：

```text
posthoc(stage0a): close calls-made boundary proof completion (GR15R6)
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

## 4. Boundary proof 的实际完成与自保护

两套实现分别完成，不共享可执行实现；validator 不 import analyzer / tests / 前序实现。

1. boundary 自证、真实八族 closure 与 controls / probes 完成，必须是接受 boundary proof 的必要
   前提。覆盖入口→boundary preflight→closure→prove→release 的实际调用、绑定与顺序；不能只靠
   `ast.walk` 调用存在性。可用保守控制流白名单或受保护的完成状态，不要求通用 Python 分析器。
2. 新完成状态的产生、消费和先后顺序也必须自保护。明确说明信任起点在哪里、哪项检查实际执行来
   保护它；不得仅由待证明的 closure 给自己签发可伪造摘要。未知赋值、分支或 callable 替换应
   fail closed，不为绕过语法增加放行特例。
3. 保留 source-semantics audit→同一 binding 对象→release 的已闭合路径；保留 R4 实际 reader /
   helper / alias / hash / git / rebuild 边界、R5 八族及其全部真实负测。允许更早正确 stage 拒绝，
   但必须保留真实零读取/零放行观测。若实现调整了内部名称/结构，应迁移等价 mutation 而非删除覆盖。
4. 只改上述完成证明、非发布自证与顺序观测；不改 accepted-source semantic gate、narrative、
   signature、科学计算、阈值、输入或披露范围，不新增科学字段。

两套实现均必须新增真实源码 mutations：

- §1 的八族全零非空字典 `or` 原 closure 调用；条件表达式、未执行 lambda / 死分支保留调用，
  实际把合格假结果交给 `prove()`。
- boundary closure 内提前返回合格结果，原 gates / controls 留在不可达代码；boundary preflight
  内保留死 closure 调用而提前把假闭包交给 `prove()`。
- closure 被同名局部或 callable alias 替换；新 boundary-completion 产生/消费的删除、恒真、
  跳过、挪后、常量替换与提前报告完成。
- 保护完成路径的 gate 被绕开时，不能只因源文件哈希在后续 preflight / CHECKSUMS compare 不同
  而拒绝。测试须观测任何 product read / rebuild 之前已拒绝。

每条先在 byte-identical sandbox 用同一 spy 跑 control rc 0，再 mutation rc 2；单行净化 stderr、
成功 product opens=0、rebuild-input opens=0、release=0、被放行 rebuild entries=0。control 的
观察器须真正命中 boundary closure 完成、proof 接受、source-semantics 完成与首次 read / rebuild，
证明必要完成早于对应放行。观察器只读内存事件、不调用 guard、不提供完成证据；事件只含阶段/计数，
不含路径、正文、身份或 primitive value，不落盘。所有 mutations 只通过 §9 完整 pytest 执行。

## 5. 已闭合部分：禁止回退

- accepted source：`67cf84c9d40057fec02be7a963694938bff78a58:harness/verify_stage0a.py`，
  SHA-256 `ce014e0850efc23617387ad01b3154d091abb3a5dfc9d7ccd40671f0b56c7dce`。
- narrative 逐字保留 `[t for t in trace if t.get("kind") == "call" and t.get("tool")]`；独立 AST gate、
  五族计数、九条 controls、四条派生链不回退。六个 `source_semantics_*` 计数仍为 `2/1/1/1/0/9`。
- P1 read-syntax closure、12 条阳性对照、四族删除/恒真化及绕开负测保留；全模块本字段真实读点
  恰一处，P1 可达闭包恰五名，到 definite / unknown-key read site 的路径为 0。
- 五面 delivery round 统一为 GR15R6 correction；科学问题仍为 GR15、accepted parent 为 GR14。
  identity closure 与旧负测保留。回执提到的相邻 P1 / round-identity preflight 完成性观察仅登记，
  不借本纠正任务扩成它们的独立 repair。
- available 第 16 槽仍为同一次 P4 read 的 raw exact nonnegative `int`；malformed 为 scalar
  `"not_applicable"`，194 available / 2 malformed；drop-last 逐行等于 GR9。
- P0–P8、runtime/static order claims、87 objects / 11 generations / 3 siblings 机械求和保留。

## 6. 科学 payload 与产物

保持 split / unsplit `16/18`、classes `58`、support `1…25`、singleton `28`、collision `7`、
reduction `35`、final `47…53`；Layer A `0/16`，G1/G2/G3/G4=`16/16/0/16`，G3 blocker 与
singleton risk 各 `16`；Layer B `16/16`，minimum final `76`、minimum padding `23`。

固定 conclusion：

```text
trace.calls_made exact-count closure still requires anonymous padding; no deployable selector is closed
```

REPORT 首行、末行与 conclusion 不变；`GR15 COMPLETE` 指科学问题。只更新 correction heading、
delivery labels、rejected-scaffold provenance。rejected 产品不作 expected science；任何科学读数或
class membership 漂移即停止报告，不调参、不改结论。

## 7. Scaffold 与原始字节闭包

GR15R5 六个 full `commit:path` object 的 SHA-256：

```text
eb4efff2e244f5ed10014ea05b8ef3d9433cbe41007afe97ad12d08404b053ca  harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
6ffbbc37c872043b8ac3791716475fd75916cbdb011e26bd756421b738ef37d7  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py
b5b6278f608e16b3d927f988054d3bb26d3a6f0fb765b35ab92d75be859ed5a5  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py
8b3045a1cffde9c10b0033f8ae901e38a4d62ef152e65fbc2b5aeaedcf3de8f4  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
13c5c53c53363f4b427574587aa6c0c15f7d2df91dfe86af7b7f791151c1611a  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
8315b174408708d5cfeb48c74183ecc3d1d5487d7f23f9bc8bb65727417270f8  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/CHECKSUMS-TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

只有 R5 三份 Python object 可作机械 scaffold；JSON / REPORT / CHECKSUMS 只作 raw-byte SHA closure
与 finding 文字对照，不解析为 expected science。R4 / R3 / R2 / R1 / GR15 各六对象既有 raw-byte
closure 保留，全部 older rejected，不 import、不当 accepted input。

## 8. 执行边界

只读钉住对象与既有 development aggregate 闭包。不人工读取 rows / trace / answer、episode / gold /
M1 正文，不接触 hidden、未登记 raw、sibling worktree 或其它 primitive runtime value。不保存/回显
primitive value / frequency、signature value / tuple / digest、member、identity、join key、正文、
绝对路径或 arm-conditioned rule。

路径检查只针对点名 ref / worktree、六件交付、posthoc 五项，以及 `harness/__pycache__` 与
`posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/__pycache__`
两个精确目录；不做全 worktree find / glob / scandir / walk，不进入或清理 hidden / raw / 旧系统临时目录。

继续发布 `model_calls=0`、`cost_cny=0`、`hidden_touched=false`、promotion / freeze=`not_made`。
禁止 subagent、联网、安装依赖、模型/API、费用、第二 primitive、组合、排名、selector、candidate、
bucket/cap/threshold 搜索、配置选择、阈值变更、样本外、hidden、G0、正式运行、promotion、freeze、
修改 accepted / main / 冻结件或远端操作。不改 Knote 文档；Codex 验收后维护。

只用不落 `.pyc` 的内存 parse / compile；不使用 `py_compile`。不得另跑计时 / profile / spy probe、
pytest 子集、前序目标命令、整目录 pytest、rescore、sweep 或模型 runner。临时 sandbox 不扩大权限。

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

构建另允许同一 analyzer `--generate` 与不落 cache 的语法检查。失败只据目标命令输出与源码修复；
修复并重生成产品后，三条完整命令从头重跑。

## 10. 提交与停止

闭合唯一 parent / 一笔提交 / 六 A 零 M / posthoc 五项 / CHECKSUMS 四项、六 SHA、87/11/3 与所有
scaffold / older raw bytes；新 boundary-proof completion mutations 与全部旧负测在边界前 rc 2；
control 的真实完成先于 proof 接受与读取/重建；三条目标命令 rc 0；source-semantics、P1、identity、
direct integer 与科学结果不回退；status clean、tag 0、两个精确 cache 目录不存在。

唯一 commit 后立即停止，只返回拓扑、六 SHA、三条命令、真实完成/读取顺序与执行边界自查；
不得创建 GR16、自动检验下一 primitive 或维护 Knote 文档。
