# Claude Code 任务书 —— Stage 0-a development wave2 · GR15R7 boundary-control inventory correction

> **状态：COMPLETE — 2026-09-27 验收为 `Redo`，不再作为执行入口。**
>
> 当时后续任务书（现已验收归档）：`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR15R8-DEVELOPMENT-TRACE-CALLS-MADE-INVENTORY-STATE-INTEGRITY-CORRECTION-2026-09-27.md`。
> 当前执行入口以 canonical handoff 首屏为准。
> 验收证据见 canonical handoff §4.25；本文件正文保留当时授权。
>
> **唯一交付：** 从 accepted GR14 独立重建同一六件交付，只纠正 boundary controls 登记表可被
> 缩减而完成证明仍被接受的缺口。保留 GR15R6 的实际帧、同一对象、调用顺序与读取防护。
>
> **固定科学范围：** 唯一 primitive 仍为 `trace.calls_made`，projected scientific baseline 仍为 GR9。
> 不增加 primitive，不做组合、排名、搜索、selector 或 candidate。
>
> **授权来源：** GR15R6 `64f173b44cbfdea9e020ec8df0f39962f31dc8d9` 于 2026-09-27 验收为
> `Redo`。依 canonical handoff §1(5)，这是同一 GR15 授权内的纠正，不构成 GR16。

## 1. Finding 与完成定义

GR15R6 已关闭 R5 的整段 closure 短路、提前返回、同名/alias 替换及完成报到伪造路径。
guard 直接读取自身源文件，钉住 boundary preflight、自证 driver、closure driver 三函数，核对实际
调用帧、同一 provenance 对象及入口帧。科学结果不变；Codex 独立复跑 analyzer / validator 均 rc 0。
完整 pytest 因下述静态 finding 主动中止，实际 `51 passed in 223.07s`、中断 rc 2、无测试失败；
执行者回执 `1010 passed in 34195.78s` 未由 Codex 独立完整重现。

**唯一 blocking finding：完成证明没有保护必须完成的 controls 清单，空循环也能报告完成。**

- validator 第 4592 行 `_BOUNDARY_CONTROL_SPECS` 为 21 项；第 5182–5187 行按它执行
  controls，第 5193 行报告完成。analyzer 第 4507 行 `PRE_PRODUCT_CONTROL_SPECS` 为 22 项；
  第 5147–5152 行执行 controls，第 5158 行报告完成。
- 只把上述赋值 RHS 改成 `()`，全部 controls 就不再执行；删去单项则漏跑该项。两种变异都不改
  guard、任何函数、三函数 proof digest、semantic-completion digest、调用帧或交接对象。
- validator `_enforcement_audit()` 第 4229–4242 行只认 `for` 的 iterable 名及循环内 predicate
  结构；analyzer `enforcement_provenance()` 同构。没有独立固定清单与实际清单的比较。
  各自登记表的运行时读取仅在 control helper 和 closure 循环中，前者又只能经后者到达。
- 八族 provenance 依赖名字引用、I/O token、transition、入口白名单及既有 digest；这项纯字面
  tuple 的删减不改变这些证据。guard 的 proof path 只含三个函数，不含登记表；guard 自身无需
  修改，即可收到真实 driver 在不完整 controls 后交出的同一对象，并通过现有接受条件。
- 这违反 GR15R6 §4(1)：“boundary 自证、真实八族 closure 与 controls / probes 完成，必须是
  接受 boundary proof 的必要前提”。晚期 CHECKSUMS / 源码哈希差异不能替代 proof / read 前拒绝。
- 证据为源码审查及内存 AST 对照：逐套确认只改一条赋值、其余顶层语句与所有函数/类 AST 不变，
  登记表由 21/22 项变为 20/21 或 0，名字引用不变。未 import / 执行变异实现、未写变异文件，
  不声称变异版实测 rc 0。正常版本没有提前读取或科学污染证据。

完成定义：**固定的全部 controls 与八族 probes 确实完成，才可接受 boundary proof；清单自身的
缺项、替换或改绑不得把必要前提缩小。** 不能用“完成了当前表里的全部项目”代替固定清单完整性，
不能仅检查长度或仅在可为空的循环内部检查登记。

## 2. 起点、branch、worktree 与提交

- accepted parent：GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`
- projected scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- 唯一优先 scaffold：rejected GR15R6 `64f173b44cbfdea9e020ec8df0f39962f31dc8d9`
- older rejected：GR15R5 `87be12f9c39eff50c037aeb7e5ca17675bdc76cb`、GR15R4
  `a7413a4d594bd862c98b461ce94ddc0f04b7a707`、GR15R3 `4d6a419cae875d3c8595c890056791d75203097a`、
  GR15R2 `c42faaef5cc6661ed216c1162273c953a65beb58`、GR15R1
  `160db5f1be90921c6959e63ad25ff0fd3a946039`、GR15 `08b70f5c35ee63152b7aa10c8795a1afd1acd369`
- branch：`stage0a-wave2-trace-calls-made-boundary-control-inventory-gr15r7`
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-calls-made-boundary-control-inventory-gr15r7`
- 2026-09-27 Codex 已定向确认 branch / worktree 不存在，GR14 没有六件目标 object。
  创建前再查；任一已存在即停止，不删、不覆盖、不复用。
- 最终唯一 parent 必须为 GR14；相对 GR14 恰一笔 commit、六个 `A` / 0 个 `M`。
- GR15R6 / R5 / R4 / R3 / R2 / R1 / GR15、GR3 / GR6 / GR12 / GR12R1 / GR12R2 / GR13 /
  GR13R1 与 metadata-only sibling GR6R1 均不得进入 ancestry。

固定 commit message，无正文、无 trailer：

```text
posthoc(stage0a): close calls-made boundary control inventory (GR15R7)
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

## 4. 固定 controls 清单与完成证明

两套实现分别完成，不共享可执行实现；validator 不 import analyzer / tests / 前序实现。

1. 保留 R6 的全部原 controls 及 family 映射：validator 21 项、analyzer 22 项；八族 probes 不变。
   本轮允许增加针对清单完整性的非发布检查与负测，不删除或替换旧 controls。
   R6 原赋值节点的 `sha256(ast.dump(node, include_attributes=False).encode("utf-8"))` 分别为：

   ```text
   472c0ecfc8cba0e2438ec3843de748fe70e9379681d0732a6895a137d72e3ce0  _BOUNDARY_CONTROL_SPECS
   3d71d0a8bef2faf9134b1215f8c731aae82931ecbbcdf860059fd1e43b5078b7  PRE_PRODUCT_CONTROL_SPECS
   ```

   此二值只固定已有控制集合，不要求沿用变量名或特定实现；如迁移结构，必须机械证明原项目与
   family 映射逐项保留，不能靠执行者文字声称等价。
2. 在接受 proof 前，从受保护的信任起点核明固定清单和实际使用清单相符，且清单完整性检查确实
   执行。清单不能自己决定 expected count / expected members；只检查非空、长度或最后报到不足。
   可扩展 R6 的 guard 自行读取/钉住的证明范围或采用等价保守控制流；不要求通用 Python 分析器。
3. 清单的模块级重绑、同名局部、callable/iterator 替换不能使实际循环与被证明的清单分离。
   未知赋值或控制流 fail closed；完成状态的产生、消费、检查和新登记信息均须自保护。
4. 保留 R6 的 preflight→self-audit→closure→prove→source-semantics→release 真实帧与同一对象
   交接，保留 guard 自核、guard digest、R5 semantic-completion 与 R4 实际 reader/rebuild 防护。
   此任务不扩成相邻 P1 / round-identity 的独立 completion repair。
5. 只改上述证明、非发布自证与顺序观测；不改 accepted-source semantic gate、narrative、signature、
   科学计算、阈值、输入或披露范围，不新增科学字段。

两套实现均新增真实源码 mutations，至少覆盖：

- 将本实现 controls 清单整体清空；逐一删除每个原项目。
- 保持原长度但以重复项目替换另一项目；更换项目名或 family 映射。
- 保留 canonical 表在源码中，但通过重绑、同名局部或 callable/iterator 替换让实际循环使用
  空表或缺项表；不依靠未执行的 AST 赋值证明实际清单。
- 新完整性 gate / 完成状态产生或消费的删除、恒真、跳过、挪后、常量替换与提前报告。
  不能只因晚期源码哈希或 CHECKSUMS 不同而拒绝。

每条先在 byte-identical sandbox 用同一 spy 跑 control rc 0，再 mutation rc 2。mutation 必须单行
净化 stderr，成功 product opens=0、rebuild-input opens=0、release=0、被放行 rebuild entries=0、
proof acceptance=0。control 的只读观察须证明原 21/22 项 controls 与八族 probes 完成，且早于
proof 接受和首次读取/重建。可以补内部阶段/计数观测，不调用 guard、不写 guard 状态、不提供
完成证据；事件只含阶段/计数，不含路径、正文、身份或 primitive value，不落盘。

R4/R5/R6 既有真实负测全部保留；允许更早的正确 stage 拒绝，但须保留真实零读取/零放行观测。
若内部结构变化，迁移等价 mutation，不删除覆盖。所有 mutations 只通过 §9 完整 pytest 执行。

## 5. 已闭合部分：禁止回退

- accepted source：`67cf84c9d40057fec02be7a963694938bff78a58:harness/verify_stage0a.py`，
  SHA-256 `ce014e0850efc23617387ad01b3154d091abb3a5dfc9d7ccd40671f0b56c7dce`。
- narrative 逐字保留 `[t for t in trace if t.get("kind") == "call" and t.get("tool")]`；独立 AST gate、
  五族计数、九条 controls、四条派生链保留；六个 `source_semantics_*` 计数仍为 `2/1/1/1/0/9`。
- P1 read-syntax closure、12 条阳性对照、四族删除/恒真化及绕开负测保留；全模块本字段真实读点
  恰一处，P1 可达闭包恰五名，到 definite / unknown-key read site 的路径为 0。
- 五面 delivery round 统一为 GR15R7 correction；科学问题仍为 GR15、accepted parent 为 GR14。
  identity closure 与全部旧负测保留。
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

GR15R6 六个 full `commit:path` object 的 SHA-256：

```text
05bf9994aaab73b2bbf566354467804c18cac0574230f22b7cb0a751f242a3e3  harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
d465fb08063e108c916e3171af26cf1003858edfde836349dc434abcd65f51d8  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py
178475c23ce9dc0ef8b22e5631ad78880725aa47bc46f4184798e2da704b7c65  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py
91dc3adc8c9fd553cbf363e9cf424f123ef8e0cbbb888347763c79d3f0746517  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
e85cd66159c917efb23ee70c6f7176d2e8f6c535565259f3027ac6f0908dfd34  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
f7d336ecd8d1ef609d19622fa93244136eedd7e921657e4eb32eb2f41ef2c0bf  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/CHECKSUMS-TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

只有 R6 三份 Python object 可作机械 scaffold；JSON / REPORT / CHECKSUMS 只作 raw-byte SHA closure
与 finding 文字对照，不解析为 expected science。R5 / R4 / R3 / R2 / R1 / GR15 各六对象既有
raw-byte closure 保留，全部 older rejected，不 import、不当 accepted input。

## 8. 执行边界

只读钉住对象与既有 development aggregate 闭包。不人工读取 rows / trace / answer、episode / gold /
M1 正文，不接触 hidden、未登记 raw、sibling worktree 或其它 primitive runtime value。不保存/回显
primitive value / frequency、signature value / tuple / digest、member、identity、join key、正文、
绝对路径或 arm-conditioned rule。

路径检查只针对点名 ref / worktree、六件交付、posthoc 五项，以及 `harness/__pycache__` 与
`posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/__pycache__`
两个精确目录；不做 worktree 或其父目录的递归 find / glob / scandir / walk，不进入或清理
hidden / raw / 旧系统临时目录。查 AGENTS 等约束文件也只能用明确祖先/目录的精确路径。

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

闭合唯一 parent / 一笔提交 / 六 A 零 M / posthoc 五项 / CHECKSUMS 四项、六 SHA、87/11/3 与全部
scaffold / older raw bytes。固定 controls 清单与八族 probes 必须完成才能接受 proof；新增清单及
enforcement mutations 全部在 proof / read 前 rc 2；旧负测等价保留。三条目标命令 rc 0，科学结果
无漂移，status clean、tag 0、两个精确 cache 目录不存在。

唯一 commit 后立即停止，只返回拓扑、六 SHA、三条命令、固定清单/完成顺序与执行边界自查；
不得创建 GR16、自动检验下一 primitive 或维护 Knote 文档。
