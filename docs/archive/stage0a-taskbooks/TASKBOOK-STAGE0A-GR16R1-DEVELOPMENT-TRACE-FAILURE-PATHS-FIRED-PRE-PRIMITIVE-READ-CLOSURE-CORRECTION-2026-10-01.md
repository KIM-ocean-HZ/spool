# 执行任务书 —— Stage 0-a development wave2 · GR16R1 pre-primitive unresolved-read closure correction

> **状态：COMPLETE — 2026-10-07 正式验收为 `Redo`；已归档，留档不开工。**
>
> 交付 commit：`0b3d497cdc87286ca3153a4a939b58fabdaeb960`，不进入 accepted chain。
> 阻断：P3 callable 默认参数捕获 trace 后，新闭包没有把来源绑定到形参，未知键读取漏检；
> 两套纯内存 AST 对照的 pre-proof pin 均不变。证据、行号、最小纠正范围和未运行项见
> `docs/CODEX-HANDOFF-STAGE0A-D2-REVIEW-2026-09-03.md` §4.29。
> 本次未运行 analyzer/validator/pytest，未执行变异实现；执行日志不冒充独立复跑。
> accepted head 仍为 GR15R8；后续唯一执行入口：`docs/TASKBOOK-STAGE0A-GR16R2-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-CALLABLE-DEFAULT-CAPTURE-CLOSURE-CORRECTION-2026-10-07.md`。本归档文件不恢复开发。
>
> **唯一任务：** 纠正 GR16 的 P4 前未知键读取闭包：不能只在 P1 schema 闭包拒绝不可确定的读取，
> 而让 P3 baseline 等其余 pre-primitive 路径漏过。保留单项 `len(trace.failure_paths_fired)` 的科学结果。
>
> **授权来源：** canonical handoff §1 的 Redo 纠错循环及原 GR16 §3、§8、§9；不是新实验授权。
> GR16 `9ba469caa4d4fc3e0e49e9cf9547042e86232bdb` 于 2026-10-01 被裁决为 `Redo`，不进入 accepted chain。
>
> **起点：** accepted GR15R8 `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`，科学 baseline 仍是 GR9。
> development-only、零费用；不扩修 captured 的 proof→release 相邻状态问题，不创建 GR17。

## 1. 开工顺序与本轮边界

先完整阅读：

1. `docs/CODEX-HANDOFF-STAGE0A-D2-REVIEW-2026-09-03.md`，以 §4.27 为本次 finding 依据；
2. 本任务书；
3. `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-2026-09-29.md`。

原 GR16 的科学合同、source semantics、读取限制、P0–P8、隐私限制和禁令继续适用；原文中的 ACTIVE
状态、branch/worktree、commit message、交付身份与执行光标由本任务书替代。归档原文不能单独开工。
不重新选 primitive，不改 hypothesis、target family、signature、gates、threshold 或 scientific baseline。

## 2. 阻断证据与纠正目标

GR16 analyzer 第 3809–3816 行和 validator 第 3769–3774 行，只把 `definite/sure=True` 的读点
计入 whole-module 唯一 accessor 断言。未知 key 的读点虽被 scanner 收集，但 analyzer
`p1_no_early_read_provenance()` 第 4138–4161 行、validator 第 4080–4119 行，只用两个
`P1_GATE_FUNCTIONS` 的名字可达闭包消费这些读点。

在两套 P3 baseline signature loop 中、既有 `direct = machine_observable_exact_count_shape_v1(...)`
之前加入下列语句，即是范围内必须拒绝的例子：

```python
if verdict["trace"] is not None:
    verdict["trace"]["".join(("failure_", "paths_fired"))]
```

此键在 Python 中确定为本轮字段，但两套 key-domain 分析器不解释 `ast.Call`，所以把它记为未知
读点。它不经 canonical accessor，不产生 primitive ledger event，结果未被使用。baseline 函数不在
两个 P1 gates 的可达闭包；只检查“P0–P3 不可达 canonical accessor”也覆盖不到这个直接读取。

验收方纯内存 AST 对照已确认：两套各只改一个 baseline 函数，名字引用图和直接调用图不变，
没有新增名字绑定；独立重算两份原始 pre-proof pin 均匹配，并且上述变异不改变 pin，因为 baseline
不在 pre-proof fingerprint 内。没有写变异文件、没有 import 或执行变异实现；不把本证据写成
实测 mutation rc 0、实际读取次数或已发生的数据污染。

**目标：** 两套实现各自兑现原 GR16 §3 第 99–102 行：所有 P4 前分析路径上的本字段读取都须被
拒绝，不能证明安全的读取 fail closed。修复须在产物/重建输入读取、release 和被放行 rebuild 前生效。
只补当前读取合同，不建设通用 Python 沙箱，不改变已接受的 R8 威胁范围。

## 3. 起点、精确路径与提交

- 唯一 parent：GR15R8 `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`。
- parent 的唯一 parent：GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`。
- scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`。
- branch：`stage0a-wave2-trace-failure-paths-fired-pre-primitive-read-closure-correction-gr16r1`。
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-failure-paths-fired-pre-primitive-read-closure-correction-gr16r1`。
- 2026-10-01 下发前已只读确认：精确 local ref / 已登记 origin ref、worktree、新任务书、新 harness /
  posthoc / 六路径均未占用；accepted parent 中无六件目标 object。没有联网或创建实验工作树。
- 执行者创建前再次精确检查；任一已存在即停止，不删除、不覆盖、不复用、不清理其它目录。
- 从上述 parent 独立交付，最终恰一笔 commit、六 A / 零 M；不得以 rejected GR16 为 parent，
  不 checkout/cherry-pick/merge GR16，不读取其 sibling worktree。
- GR16 加原 GR16 `NON_ANCESTORS` 的 16 项，共 17 个明确排除项；原 rejected / GR6R1 排除不减。

固定 commit message，恰一行，无正文、trailer 或工具署名：

```text
posthoc(stage0a): close pre-primitive unresolved reads (GR16R1)
```

唯一允许 changed paths，保持原 GR16 六路径：

```text
harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/CHECKSUMS-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 恰五项；CHECKSUMS 恰登记 analyzer / tests / JSON / REPORT 四项，不自列。
不新增第七件产物、事件文件、signature 表、lookup、registry copy 或仓内临时文件。

## 4. 只允许的纠正

1. 明确机械枚举实际 pre-primitive 分析路径：覆盖 P1 schema 外的 P0–P3 驱动函数、P3 baseline
   及可达 helper / callable alias；不能只看 canonical accessor 是否可达。冻结 scorer 的既有生成
   行为与分析读取分开处理，不能修改 scorer，也不能把分析 helper 冒充 scorer 例外。
2. 对这些路径上的直接、method、computed、dynamic、helper/alias 读点，只有能证明不会读取本轮
   字段的路径才放行；未知 key 不能因 `definite=False` 消失。保留正常 baseline 的合法索引，
   不把本轮键的另一种拼写加入特判来代替 fail-closed 合同。
3. 正常版必须仍只在 P4 通过唯一 direct literal accessor 取一次 exact `list`、对同一容器取一次
   built-in `len`。194 available / 2 malformed、裸整数/scalar sentinel、GR9 15 槽与 drop-last 不变。
4. 新 enforcer 必须真实执行并在 product/rebuild-input opens、release、被放行 rebuild 之前拒绝。
   不依赖晚期 CHECKSUMS mismatch、canonical byte mismatch 或只是调用名字出现在 AST。
5. 保留 R4–R8 的原 controls、probes、真实完成链、startup/prove 双 pin、comprehension 覆盖、
   scorer-scope 五族、source-semantics 十六对照与九族判据；必要 pin 和原负测锚点须同步迁移。
6. JSON、REPORT、analyzer、validator、tests 五面身份统一为 **GR16R1 correction；科学问题 GR16**。
   parent GR15R8、baseline GR9、七项 registry 的历史 5→6 / 未检验 2→1 口径不变。

允许变更只包括上述检查、等价负测、轮次/历史 provenance/必要 pins 和有限聚合自证信息。
若新增自证计数，限定 phase / 读点数量 / zero violations；不发布表达式、逐行值、event 或源码 digest。
保持 evaluation-order 原七键，不把 bool 写成 literal。不得借修复扩大为全阶段 pin 或相邻 release repair。

## 5. 钉死输入与 rejected scaffold

原 GR16 §5 的 17 development inputs、五 CHECKSUMS、两 freeze sections、accepted inventory 不变：
12 代各六对象 + 三 sibling 共 21 对象，机械总和 **93 objects / 12 generations / 3 siblings**。
原任务书所钉 GR15R8 六 SHA 继续核实，parent lineage 继续闭合。

GR16 六对象只作本纠正的 raw-byte provenance / 三份 Python scaffold；不算 accepted generation，
不 import 前序实现，不解析其 JSON / REPORT / CHECKSUMS 作 expected science，不增加另一 primitive。
先核 full `9ba469caa4d4fc3e0e49e9cf9547042e86232bdb:path`，SHA 为：

```text
d0c84f5ae108b1df3c767004c0f0c8f8729750df2bc2ef356cc86faafb5c9b41  harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
c803e7e0c320793f8bd41dc97b898166422b8c0d808544bc13b3aec58608f1ec  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
f1f68c3d2e7db0a0797c1287c026cab03cac13f5803dc03cee8414a56b7853cb  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
48fee5e81c3adb41f218a0071bb2667f3e4e661fbc096161a864b10a3ca1007b  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
8e44f59968ca80b8af7bb7446a449ca0ccecb1a8242eccf83aaf09639d1e37c8  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
fb342f235854ff148e853f2a5982d829bfd0e74ae1025cb2cb4068c026424803  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/CHECKSUMS-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

不得恢复 GR15–GR15R7 的旧 raw-byte/scaffold 闭包；它们继续只按已列排除关系审查。

## 6. 负测与独立证据

保留全部等价覆盖，不因迁移而删除、空改或降低原拒绝要求。新负测至少包括：

- 两套 P3 baseline 内的 §2 原样 `str.join` 未知键读取；对应 `.get`、`__getitem__`、
  `type(...)` 包装、局部未知键、helper / callable alias 变体；锚必须确实命中。
- 其余实际 pre-primitive 入口的代表路径，证明拒绝面来自可达闭包而非函数名或该字符串特判。
- 对可静态证明安全的现有动态索引提供正常对照；不得简单把所有 subscript 禁掉。
- 新读点过滤/可达检查/入口调用的删除、恒真化、跳过或移晚。新 gate 不能凭发布计数存在而自证。
- 正常 P4 accessor 仍恰 194 次真实读取，未知 schema / 错误容器继续拒绝；被拦的新增早读不能
  只靠 accessor ledger 看不见就算通过。

每条黑盒 mutation 在 byte-identical sandbox 先用同一只读 spy 跑 control rc 0，再要求 mutation
rc 2、单行净化 stderr，并观察 product opens / rebuild-input opens / release / 被放行 rebuild
entries 全为 0。若拒绝在 pre-proof 层，proof acceptance 也为 0；若在正确的后续 preflight 层，
可以已有 proof，但不能已有 release 或读取。不得以调用存在或晚期产物拒绝代替这些事件条件。

新 pre-proof pin 若更早拒绝变异，按原 R8 已接受的选择性双跑范围验证旧防线；不能把同一个 pin
摘要不同当作新读取闭包的唯一证明。新拒绝谓词应另有纯 AST / 进程内覆盖证明未知读点被消费，
所有这些测试都只随下节完整 pytest 执行，不单独运行 probe / profile / spy / subset。
测试中的 spy 不写 guard、不调用 guard、不提供 completion evidence，不保存或回显数据值。

## 7. 科学不变项与结论

仍从钉死 development 闭包独立重建两套器材及 GR7/GR8/GR9/GR10 anchors，不从旧产品取答案。
本轮修复不改变科学算法；机械重建应保持下列已核 aggregate：

| 项 | GR16 原正常版读数 |
|---|---|
| split / unsplit | 3 / 31（共 34 GR9 classes） |
| 当前 classes / support / singleton | 37 / 1…27 / 13 |
| collision / reduction | 42 / 0，全部 16 格 |
| final review 总数 | 82…88 |
| Layer A / Layer B | 0/16 / 0/16 |
| G1 / G2 / G3 / G4 通过格数 | 16 / 0 / 0 / 16 |
| containment / identical-to-GR9 | 16/16 / 0/16 |
| arm blocks published / suppressed，k=2 | 16 / 0 |

这些数只作纠错不漂移的审查约束，不可代替源码重建或据此修改算法。若出现差异，停止并报告；
不选新的结论分支，不改数值来迎合表格。

唯一 conclusion sentence 保持：

```text
the preregistered len(trace.failure_paths_fired) exact-count refinement increases development separability but cannot realize any GR7 oracle-all-green cell under the frozen gates
```

REPORT 原首行、末行 rider、诊断归因局限、source semantics、G2/G3 mechanical pass/fail 保持；
只更新 delivery round / completion 为 GR16R1 correction，科学问题仍为 GR16。

## 8. 仅三条完整目标命令

固定 Python 3.12.2，在新工作树执行：

```bash
PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 -m pytest \
  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 \
  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 \
  harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
```

构建另允许同一 analyzer `--generate`、不落 `.pyc` 的内存 parse/compile 与必要精确 git/SHA/路径
检查。pin 计算需放在源码静态构造或完整测试/目标命令流程内；不额外 import 交付实现作独立 probe。
不运行 pyflakes、py_compile、pytest 子集、整目录 pytest、历史命令、单独计时/profile/spy、
rescore/sweep/runner 或重算 κ；不重跑 GR15R8 / 被退回 GR16 的完整测试。
失败修复并重生成后，三条本轮完整命令重跑，保存原始 summary、条数、耗时、rc。

只读钉死 objects 与既有 development 闭包；不人工打开 rows/trace/answer、episode/gold/M1 正文。
路径检查仅限本任务点名 ref/worktree、六路径、posthoc 五项、`harness/__pycache__` 与本 posthoc
的 `__pycache__`。查约束只用明确祖先文件。禁止递归 find/glob/scandir/walk worktree 或父目录，
不进入/清理 hidden、未登记 raw、sibling worktree 或旧系统临时目录。

## 9. 禁止面、交付与停止点

不联网、安装、subagent、模型/API、费用、预算/approval、第二 primitive、组合/排名/选择、
threshold/bucket 搜索、selector/candidate/k8/新 matcher、样本外、hidden、G0、正式运行、
promotion/freeze、远端操作；不改 accepted/main/冻结件，不 merge/tag/fetch/pull/push。
不修 captured 的 proof→release 相邻观察，不回修 GR15R8 测试，不把本纠正改成其它 repair。

回执给：唯一 parent/一笔固定 message/六 A 零 M、六 SHA 及 HEAD:path 相等、93/12/3 与 rejected
scaffold 分列、原样反例和新增 gate 自保护的 control→mutation 证据、三条命令原始 summary、
aggregate 不漂移、status clean/tag 0、两个精确 cache 不存在，以及所有过程偏差。

唯一 commit 后立即停止并返回 owner；不修改 Knote 文档、不创建 GR17、不执行下一 primitive。
若无法在本范围兑现读取合同，停止并报告最小证据，不自行扩权或改写授权。
