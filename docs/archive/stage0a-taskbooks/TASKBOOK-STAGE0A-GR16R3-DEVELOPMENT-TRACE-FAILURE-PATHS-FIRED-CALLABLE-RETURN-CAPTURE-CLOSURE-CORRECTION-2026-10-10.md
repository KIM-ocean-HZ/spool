# 执行任务书 —— Stage 0-a GR16R3 callable-return capture closure correction

> **状态：COMPLETE — 2026-10-10 正式验收为 `Redo`；已归档，留档不开工。**
>
> 交付 `0a0d71327d05dde87fa67f0bd9abf87f4457fb6e` 不进入 accepted chain，accepted head 保持 GR15R8。
> 阻断：局部 def 遮蔽安全内建名称，参数→返回→默认值的 trace 来源仍被丢弃；两套纯 AST pin 不变。
> 完整 finding、源码行号、最小纠正与证据限度见 canonical handoff §4.35；执行回执保留于 §4.34。
> 本次未运行 analyzer/validator/pytest，未执行变异；三组已有执行日志及最终六 SHA 绑定已核实。
> 当前无 ACTIVE 实验任务，等待 owner decision；不恢复开发、不另建验收/纠正任务书或 GR17。

>
> owner 原话：“直接在本窗口进行redo，做完等我验收”。据此允许本窗口直接创建新隔离交付、
> 纠正源码、完整验证及唯一提交；覆盖 handoff §1(7) 默认分工，仅限本轮。
> GR16R2 已正式 Redo，不进入 accepted chain；本轮不能自行接受，accepted head 保持 GR15R8。
> 唯一任务为 handoff §4.32 的 callable 返回到默认参数来源丢失；科学问题仍为 GR16。

## 1. 合同继承与读取边界

已读 canonical handoff §4.32；继承归档 GR16R2 原合同及其继承的 GR16R1、GR16 合同。
原科学、17 development inputs、93 objects / 12 generations / 3 siblings、P0–P8、读取、隐私、
R4–R8 controls/probes/双 pin/完成链、自保护、三条完整命令及禁令全部保留。
本文件只替代执行身份、当前纠正、路径、rejected provenance 与明确冲突的角色限制。

GR16R2 合同：`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16R2-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-CALLABLE-DEFAULT-CAPTURE-CLOSURE-CORRECTION-2026-10-07.md`。
不得修改 rejected 或 accepted 交付，不 import 前序实现，不解析旧产品作科学 expected。
禁止人工打开 rows/trace/answer、episode/gold/M1 正文、逐行身份及本字段元素；
冻结器材的既有重建读取仅由允许命令执行。hidden 禁止 open/stat/hash/glob/预处理/引用。

## 2. 本轮纠正及负测

两套 P3 baseline 的 direct signature 构造前，原样反例：

```python
if verdict["trace"] is not None:
    (lambda t=(lambda: verdict["trace"])():
        t["".join(("failure_", "paths_fired"))])()
```

GR16R2 仅在 expression(default) 返回非空来源时拒绝 capture；立即调用 lambda 的返回来源被
当作空集合，Call.func 又不走普通 expression 检查。此前证据仅为静态 AST，未执行变异。

必须传播 callable 返回到默认值的来源，或保守拒绝无法证明安全的 callable 保留/返回来源。
覆盖立即调用 lambda、局部 lambda/helper、alias、嵌套/链式返回及 keyword-only/same-name
等价 capture；不能按反例字符串/变量名特判，不能只靠 pin mismatch 或晚期产品 mismatch。
保持正常 baseline 动态索引和不含受保护来源的 callable/default 对照可通过。
不得扩大为通用 Python 沙箱、全阶段 pin 或 captured proof→release 相邻 repair。

保留 GR16R2 原 1403 cases 的等价要求，新增：
- 原样及等价路径两套 predicate 实际拒绝，baseline-only mutation 的 pre-proof pin 不变。
- 使用安全 scalar/字段返回值的正常对照；明确覆盖局部 def 和 lambda。
- 新拒绝逻辑的删除/恒真/跳过自保护。
- 每条黑盒先同一只读 spy control rc 0，mutation rc 2，单行净化 stderr；
  零 product/rebuild-input opens、零 release、零 admitted rebuild，pre-proof 拒绝还需零 proof。
- 原 R1/R2 与 R4–R8 覆盖不删减，不把 spy 当成 completion evidence；旧选择性双跑范围不扩大。

只允许检查、等价负测、必要 pins、身份/provenance 与受限聚合自证变更；五面交付身份为
GR16R3 correction，科学问题 GR16；不改科学函数、P4 accessor、GR9 15 槽/drop-last 或结果数值。

## 3. 起点与精确路径

- 唯一 parent：accepted GR15R8 `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`；
  其 parent 为 GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`。
- scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`。
- branch：`stage0a-wave2-trace-failure-paths-fired-callable-return-capture-closure-correction-gr16r3`。
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-failure-paths-fired-callable-return-capture-closure-correction-gr16r3`。
- 新 local/origin ref、worktree 注册/目录、本任务书与 parent 六目标对象已精确确认不存在。
  创建时不得覆盖/复用已有路径；不 checkout/cherry-pick/merge rejected commit。
- GR16R2 加继承的 18 项，共 19 个明确排除项，不得进入 ancestry。
- 相对 parent 恰一笔 commit、六 A / 零 M。message 恰一行，无正文/trailer：

```text
posthoc(stage0a): close callable return capture reads (GR16R3)
```

唯一允许 changed paths：

```text
harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/CHECKSUMS-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
```

posthoc 恰五项、CHECKSUMS 恰四条（analyzer/tests/JSON/REPORT），不自列；不得新增第七件产物。

## 4. GR16R2 scaffold 的 full object SHA

GR16R2 `b886b4a491bce6ebf34d3382d932874897d15c93` 六对象仅作 raw-byte provenance，其中三份 Python 为直接 scaffold，
不算 accepted generation。先核 full commit:path SHA 后迁移，不读 sibling worktree。
既有 GR16/GR16R1 raw-byte provenance 保留，不新增旧产品解析，不恢复 GR15–R7 scaffold。

```text
1de0b0697bce0596e1ab561d5c99f99a91b6dfd6ad58d0e77bf25ccb9497aeeb  harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
00bedad409c3e24ce19e20933dbf9c3a2ada9c87845033b46cf141c9dca48228  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/CHECKSUMS-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
46e54ea162362e2035f808d2443c323d99ee02a18e7ab5481650f081ccb99cb3  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
e28a66b14d895f40924ee575cdb7de052ad87d57f9cf2690d50b68a7bbbcbeee  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
b5497acbab1c4d7f66ce2fb0fc3cf72cc91669bbaad20abc66d0f734e420c311  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
bc98039eae74bc99b177992db1875c89b032fa57f329b0cbfc41a7920dd17f24  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
```

## 5. 科学不变项

沿继承合同独立重建，不从旧产品拿答案：194 available / 2 malformed；raw integer/scalar sentinel；
split/unsplit 3/31，classes 37，support 1…27，singleton 13；collision 42、reduction 0、final 82…88；
Layer A/B 0/16，G1/G2/G3/G4 通过 16/0/0/16；containment 16/16、identical-to-GR9 0/16；
k=2 发布/抑制 16/0。唯一 conclusion sentence、REPORT 首末行/rider 与诊断归因局限保留。
原 evaluation-order 七键、非 literal bool、5→6/2→1 registry 口径不变。
有漂移停止，不改算法迎合预期，不检验 suppressed_wrong_actions 或组合前五项。

## 6. 构建及完整验证

固定 Python 3.12.2；禁 pyc。只允许以下完整命令，另外允许同一 analyzer --generate、
内存 parse/compile、必要精确 git/SHA/路径检查和仓外静态 AST 源码构造/pin 计算。
不额外 import 交付实现作独立 probe。pytest 子集、整目录、profile/spy 单跑与历史命令禁止。

```bash
PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 -m pytest   posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py   -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3   posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py   --check-existing

PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3   harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
```

三命令必须在最终源码/产品上完整通过；修复/重生成后重跑全部三命令。
仓外 `/tmp/gr16r3-construction/` 仅存本轮新建的静态构造脚本和点名日志：
generate-N.log/.rc；analyzer-full-N、validator-full-N、pytest-full-N 的 .log/.rc/.metadata.json。
记录 Python、命令、cwd、起止、运行前后六 SHA 与最终 commit 对应，不在科学产物加运行元数据。
进度仅在完成/失败/阶段转换时报告，长验证节约 token 监控；不重复启动已有运行。

## 7. 禁令与停止点

禁止联网/安装/subagent/模型/API/新费用、预算/approval、hidden/样本外/G0/正式运行、
promotion/freeze、selector/candidate/k8、primitive 组合/排名/选择、threshold/bucket 搜索、
新 matcher/配置及 captured 相邻 repair；不改 accepted/main/冻结件，不 merge/tag/fetch/pull/push。

路径检查只限点名 ref/worktree、六路径、posthoc 五项以及 harness/__pycache__ 与本 posthoc/__pycache__。
不递归遍历 worktree/父目录，不进入或清理 hidden/raw/旧临时目录；查约束只读精确祖先文件。
保留 Knote 已有未提交改动；仅维护 canonical handoff、本任务书和 README 的状态。
唯一提交后立即停止，给完整执行回执，标为 COMPLETE（执行交付）待 owner 验收；
accepted chain 不动，不自行给 Accept，不创建 GR17 或后续实验。
