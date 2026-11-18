# 执行任务书 —— Stage 0-a development wave2 · GR16R2 pre-primitive unresolved-read closure correction

> **状态：COMPLETE — 2026-10-10 正式验收为 `Redo`；已归档，留档不开工。**
>
> 交付 `b886b4a491bce6ebf34d3382d932874897d15c93` 不进入 accepted chain，accepted head 保持 GR15R8。
> 阻断：默认值经立即调用 lambda 返回 trace 时，来源仍被丢弃；两套内存 AST 对照的 pre-proof pin 不变。
> 完整 finding、源码行号、证据限度及最小纠正见 canonical handoff §4.32。
> 本次未运行 analyzer/validator/pytest，未执行变异实现；已有完整执行日志及六 SHA 绑定已核实。
> 当前执行入口：`docs/TASKBOOK-STAGE0A-GR16R3-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-CALLABLE-RETURN-CAPTURE-CLOSURE-CORRECTION-2026-10-10.md`；本归档合同不开工。
>
> **唯一任务：** 纠正 P0–P3 callable 默认参数捕获导致受保护 trace 来源丢失；科学问题仍为 GR16。
> owner 于 2026-10-07 明确“开始重做”，并选择“改由本窗口直接开发并完整验证”；这是本次
> 对 canonical handoff §1(7) 角色分工的明确例外，允许执行本合同的新隔离工作树、六件交付、
> 三条完整命令及唯一提交；不授权修改 rejected/accepted 交付或开启下一实验。
>
> GR16R1 `0b3d497cdc87286ca3153a4a939b58fabdaeb960` 已正式 `Redo`，finding 见 handoff §4.29。
> 唯一 parent 为 accepted GR15R8 `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`，baseline GR9。
> 原 GR16 与 GR16R1 合同的读取、科学、测试及禁止边界继续适用；本文件只替代执行身份、路径、
> 当前纠正范围及明确冲突的角色限制。development-only、零费用；不扩修 captured 相邻问题。

## 1. 开工顺序与本轮边界

先完整阅读：

1. `docs/CODEX-HANDOFF-STAGE0A-D2-REVIEW-2026-09-03.md`，以 §4.29 为本次 finding 依据；
2. 本任务书及 `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16R1-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-PRE-PRIMITIVE-READ-CLOSURE-CORRECTION-2026-10-01.md`；
3. `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-2026-09-29.md`。

原 GR16 的科学合同、source semantics、读取限制、P0–P8、隐私限制和禁令继续适用；原文中的 ACTIVE
状态、branch/worktree、commit message、交付身份与执行光标由本任务书替代。归档原文不能单独开工。
不重新选 primitive，不改 hypothesis、target family、signature、gates、threshold 或 scientific baseline。

## 2. 阻断证据与纠正目标

在两套 P3 baseline 的 `direct = machine_observable_exact_count_shape_v1(...)` 前：

```python
if verdict["trace"] is not None:
    (lambda _r1_t=verdict["trace"]: _r1_t["".join(("failure_", "paths_fired"))])()
```

GR16R1 analyzer 5566–5582 / 5677–5682 / 5724–5743 / 5774–5787 与 validator 对应行
为 lambda 创建 lexical table，却未绑定默认值的 trace 来源；无显式实参的调用丢失来源。
验收只做源码与内存 AST 核对：两套各只改 baseline，其余 769/756 顶层节点不变，两份
pre-proof pin 仍匹配。未执行该变异，不把此 finding 写成已实测绕过或正常版污染。

修复须跟踪默认参数捕获与形参，或保守拒绝不能证明安全的捕获路径；覆盖立即调用、局部 callable
alias、同名形参/default 外层求值、keyword-only defaults 与等价局部 helper 默认参数。
不得只特判反例字符串、参数名或函数名；默认值按 Python 的外层作用域求值，不能误当 lambda
形参本地值。正常 baseline 合法动态索引继续通过。不建设通用 Python 沙箱或全阶段 pin。

拒绝必须先于 product/rebuild-input opens、release、被放行 rebuild；保留 R1 原样 str.join
及 helper/alias 的闭包，不退回只检查 P1。所有科学算法、P4 accessor 与输出数值不变。

## 3. 起点、精确路径与提交

- 唯一 parent：GR15R8 `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`。
- parent 的唯一 parent：GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`。
- scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`。
- branch：`stage0a-wave2-trace-failure-paths-fired-callable-default-capture-closure-correction-gr16r2`。
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-failure-paths-fired-callable-default-capture-closure-correction-gr16r2`。
- 2026-10-07 开工前已只读确认：精确 local ref / 已登记 origin ref、worktree、新任务书、新 harness /
  posthoc / 六路径均未占用；accepted parent 中无六件目标 object。没有联网或创建实验工作树。
- 执行者创建前再次精确检查；任一已存在即停止，不删除、不覆盖、不复用、不清理其它目录。
- 从上述 parent 独立交付，最终恰一笔 commit、六 A / 零 M；不得以 rejected GR16 / GR16R1 为 parent，
  不 checkout/cherry-pick/merge rejected commit，不读取其 sibling worktree。
- GR16R1、GR16 加原 GR16 `NON_ANCESTORS` 的 16 项，共 18 个明确排除项；原 rejected / GR6R1 排除不减。

固定 commit message，恰一行，无正文、trailer 或工具署名：

```text
posthoc(stage0a): close callable default capture reads (GR16R2)
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

## 4. 必须保留的合同与限定纠正

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
6. JSON、REPORT、analyzer、validator、tests 五面身份统一为 **GR16R2 correction；科学问题 GR16**。
   parent GR15R8、baseline GR9、七项 registry 的历史 5→6 / 未检验 2→1 口径不变。

允许变更只包括上述检查、等价负测、轮次/历史 provenance/必要 pins 和有限聚合自证信息。
若新增自证计数，限定 phase / 读点数量 / zero violations；不发布表达式、逐行值、event 或源码 digest。
保持 evaluation-order 原七键，不把 bool 写成 literal。不得借修复扩大为全阶段 pin 或相邻 release repair。

## 5. 钉死输入与 rejected scaffold

原 GR16 §5 的 17 development inputs、五 CHECKSUMS、两 freeze sections、accepted inventory 不变：
12 代各六对象 + 三 sibling 共 21 对象，机械总和 **93 objects / 12 generations / 3 siblings**。
原任务书所钉 GR15R8 六 SHA 继续核实，parent lineage 继续闭合。

GR16R1 六对象只作本纠正的 raw-byte provenance / 三份 Python scaffold；不算 accepted generation，
不 import 前序实现，不解析其 JSON / REPORT / CHECKSUMS 作 expected science，不增加另一 primitive。
先核 full `0b3d497cdc87286ca3153a4a939b58fabdaeb960:path`，SHA 为：

```text
951bdce512cf0d76d178f96ebe1f3221c1aa684d51ee9b406b73023e8ca6f0de  harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
22a979902437d5206b76847e803b8436f97b4c459d8d6c64f005198e9222366b  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
e0e11b1aac0f3ad7717e2ca5a70218c1134bd04de4459d12886c604a3cb9e60b  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
8df89fc3bc3d66c2861faaadcf36cfff00c03b25607291d5ee1d47b7a089fd8a  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
c225a1ccd941db82c3e6fa606dcb09a2973ca5c7006fe0f7f3f5e0972a130b84  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
63abdd2a078ec646dee5933a38b72d5d1dec8b2a2c98f3c75ff6e89032c7c642  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/CHECKSUMS-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

GR16 六对象继续仅保留原 R1 已有的 raw-byte provenance；不新增旧产品解析或科学依赖。
不得恢复 GR15–GR15R7 的旧 raw-byte/scaffold 闭包；它们继续只按已列排除关系审查。

## 6. 负测与独立证据

保留 GR16R1 全部等价覆盖（原 1357 cases），不删除、空改或降低原拒绝要求。新增：

- §2 原样 default-capture、局部 lambda alias、keyword-only default、形参与外层同名、局部 def
  default、局部 helper alias 等价变体；每种两套实现的 predicate 均必须实际识别并拒绝。
- 对默认参数处理/作用域分离检查的删除、恒真、跳过等做自保护；不能只观察发布计数。
- 正常版及不携带受保护来源的默认值/安全索引对照通过；不把合法 baseline 全禁掉。
- 原样反例不能只靠新 pin mismatch 拒绝；保留纯 AST / 进程内 predicate 覆盖及 pin 不变证据。

同时继续包括：

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
只更新 delivery round / completion 为 GR16R2 correction，科学问题仍为 GR16。

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
rescore/sweep/runner 或重算 κ；不重跑 GR15R8 / 被退回 GR16 / GR16R1 的旧完整测试。
失败修复并重生成后，三条本轮完整命令重跑，保存原始 summary、条数、耗时、rc；另在仓外执行日志记录 Python、命令、cwd、六文件 SHA 与最终 HEAD 对应，
不把这些运行元数据写进科学产物或增加第七个仓内交付物。

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

唯一 commit 后立即停止并返回 owner；本窗口仅维护既有 canonical handoff / 本任务书 / README 的执行状态，不创建 GR17、不执行下一 primitive。
若无法在本范围兑现读取合同，停止并报告最小证据，不自行扩权或改写授权。
