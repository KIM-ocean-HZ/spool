# 执行任务书 —— Stage 0-a GR16R4 local-callable binding closure correction

> **状态：COMPLETE — 2026-10-12 正式验收为 `Redo`；已归档，留档不开工。**
>
> 交付 `f00a720820f6379277a4c61aa2c4d9a56034dc73` 不进入 accepted chain，accepted head 保持 GR15R8。
> 阻断：局部 callable 通过 `.copy` 属性调用时，method 特例忽略显式参数来源，仍可丢失 trace 的返回/default 来源。
> 完整 finding、原样反例、两套 pin 不变的静态证据和最小纠正范围见 canonical handoff §4.38。
> 第三轮完整日志/rc/metadata 与最终六 SHA 已独立核实；本次未启动 analyzer/validator/pytest，未执行变异实现。
> 当前无 ACTIVE 实验任务，等待 owner decision；不创建新纠正任务书或 GR17。以下为原执行合同及执行回执。
>
> owner 原话：“直接在本窗口进行redo，开始”。仅本轮覆盖 handoff §1(7) 默认角色分工。
> 唯一纠正为 handoff §4.35 的局部 callable 名称绑定/安全内建误判；科学问题仍为 GR16。
> GR16R3 已 Redo；accepted head 保持 GR15R8，不自行接受、不创建 GR17。

## 1. 继承合同与边界

继承 `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16R3-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-CALLABLE-RETURN-CAPTURE-CLOSURE-CORRECTION-2026-10-10.md` 及其 GR16R2、R1、GR16 合同。
17 development inputs、93 objects / 12 generations / 3 siblings、P0–P8、隐私及科学边界、
R4–R8 controls/probes/完成链/双 pin、原 1471 cases 等价要求、完整三命令与禁令全部保留。
本合同仅替代执行身份、当前纠正、路径、rejected provenance 和明确冲突的角色限制。
不 import 前序实现、不解析旧产品作 expected；不改 accepted/rejected 交付。
禁止人工打开 rows/trace/answer、episode/gold/M1 正文、逐行身份、本字段元素；
hidden 禁止 open/stat/hash/glob/预处理/引用。既有器材重建仅由允许完整命令执行。

## 2. 最小纠正与验收要求

P3 的 direct signature 构造前，原样反例：

```python
if verdict["trace"] is not None:
    def id(_r3_value):
        return _r3_value
    (lambda _r3_t=id(verdict["trace"]):
        _r3_t["".join(("failure_", "paths_fired"))])()
```

两套 local_bindings 漏掉 FunctionDef.name，按名称套用安全内建分支，丢弃受保护实参来源。
必须以静态名称解析到真实内建为安全内建分支前提；保留局部 callable 参数→返回→默认值来源，
或保守拒绝不能证明安全的调用。覆盖等价名称、局部/嵌套作用域与 callable alias；不得特判 id
或反例变量名。真实内建、safe scalar/字段返回、合法 baseline 动态索引仍可通过。
只改检查、等价负测、必要 pins、身份/provenance；不改科学函数、P4 accessor、GR9 15 槽/drop-last。
不扩成通用 Python 沙箱、全阶段 pin 或 captured proof→release 相邻 repair。

新增测试须包含：
- 原样及等价变体，两套 predicate 真实拒绝；baseline-only mutation 的 pre-proof pin 不变。
- 真实内建和安全返回值对照；新名称绑定/内建分支规则的删除、恒假或跳过自保护。
- 每条黑盒先同一只读 spy control rc 0，再 mutation rc 2、单行净化 stderr；
  零 proof、零 product/rebuild-input opens、零 release/admitted rebuild。
- 保留原 1471 cases 等价要求、R1–R3 与 R4–R8；旧选择性双跑范围不扩大。

## 3. 起点与精确交付

- 唯一 parent：GR15R8 `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`；parent 的 parent GR14。
- scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`。
- branch：`stage0a-wave2-trace-failure-paths-fired-local-callable-binding-closure-correction-gr16r4`。
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-failure-paths-fired-local-callable-binding-closure-correction-gr16r4`。
- 新 local/origin ref、worktree 注册/目录、任务书与 parent 六路径已精确确认不存在。
- GR16R3 加原 19 项，共 20 个明确排除项均不得进入 ancestry。
- 从 accepted parent 新建，不 checkout/cherry-pick/merge rejected commit；恰一笔、六 A / 零 M。

固定单行 commit message，无正文/trailer：

```text
posthoc(stage0a): close local callable binding reads (GR16R4)
```

唯一 changed paths：

```text
harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/CHECKSUMS-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
```

posthoc 恰五项，CHECKSUMS 恰四条（analyzer/tests/JSON/REPORT），不自列，不增第七件。
五面交付身份为 GR16R4 correction；科学问题 GR16，parent GR15R8。

## 4. GR16R3 full object scaffold

仅 raw-byte provenance，三份 Python 为直接 scaffold，不计 accepted generation；先核 SHA 后复制。
保留既有 GR16/R1/R2 历史 provenance，不读 sibling worktree、不新增旧产品解析。

```text
da64c2d923d2515558c1b2746d936edfcf6edaeee141c010fce2cbdf8270ccd0  harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
f4d54fdf13c7afc0cf9e681cfc37d9cd62222e3fd42076996fcf0ba092e0ed3f  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/CHECKSUMS-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
7965daf01fa125d6b62bece8bb8bdac67575f7506690546fed9ad3d4149384c8  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
b3ca5fba88fae7a9fd887293e28008728ad8daef8756d2ad6d9d3486f6f565ce  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
622b631ed7744b21150e79ffa660ada7d5956e396bbe617d0bac94fee2f99fa2  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
2e6f17a3b494da2b5f607679ba0efced87cb33445d44f594c65cb9360ee49a13  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
```

## 5. 科学不变项

独立重建保持：194 available / 2 malformed、raw integer/scalar sentinel；split/unsplit 3/31、
classes 37、support 1…27、singleton 13；collision 42、reduction 0、final 82…88；
Layer A/B 0/16，G1/G2/G3/G4 16/0/0/16；containment 16/16、identical-to-GR9 0/16；
k=2 发布/抑制 16/0，唯一 conclusion、REPORT 首末行/rider、诊断归因局限不变。
原 evaluation-order 七键、非 literal bool、历史 5→6/2→1 不变。漂移即停，不改算法迎合数值。

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
仓外 `/tmp/gr16r4-construction/` 仅存本轮新建的静态构造脚本和点名日志：
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

## 8. 最终执行回执（2026-10-12 Europe/London）

提交 `f00a720820f6379277a4c61aa2c4d9a56034dc73`，唯一 parent GR15R8，恰一笔、六 A／零 M。
第三轮 analyzer/validator 均 PASS、byte-identical；完整 pytest **1547 passed in 36671.99s（10:11:11），rc 0**。
三命令前后六 SHA 与最终 commit objects 一致；tracked/六路径 status 干净，20 排除项非 ancestor。
完整六 SHA、命令起止、历史失败/未完成记录与证据路径见 canonical handoff **§4.36–4.37**。
本合同保留为唯一待验收合同；不是 Accept，accepted chain 仍为 GR15R8；已停止，未创建 GR17。
