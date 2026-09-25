# Claude Code 任务书 —— Stage 0-a development wave2 · GR1R2 完整决策块验证纠正

> **状态：ACTIVE — 等待 Claude Code 执行。**
>
> **性质：** GR1R1 的最小纠正；只闭合独立 validator 对完整 decision block 与报告 §8 的
> fail-closed 验证，不进入 verifier repair，不改变 GR1 的实验读数或预注册结论。
>
> **上次任务书：** `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR1R1-DEVELOPMENT-GATE-REPAIR-PREFLIGHT-CORRECTION-2026-09-04.md`

## 1. Redo 原因与唯一目标

GR1R1 commit `a24fe3ec26e27eb741409b89e28d12018fef52b6` 已正确修复原始 surface
伪造漏洞：validator 自有映射逐格钉死三组反事实的 `candidate_surface`，安全 surface、G4
surface、候选面、内外 recommendation 与报告尾行都由独立结果生成；同步篡改
`CF-DROP-K4` surface 的黑盒负测会判红。三条目标命令也全部通过。

但 `harness/verify_gate_repair_preflight_wave2.py:807-821` 所称“整个 decision block”只比较了
`safe_improvements`、`safe_improvement_surfaces`、`g4_failure_surface`、
`candidate_surfaces` 与内外 recommendation；没有比较待验 decision 中实际存在的：

- `decision_rule`；
- `baseline_violation_quadruple`；
- `reason`。

同时 `:708-722` 只在报告中搜索独立结果片段。§8 的规则段没有闭合，推荐行也只核到
`` `recommended_next_surface` = ... `` 的前缀，括号内的 `reason` 仍取自待验产物。因而同步
改写这些 JSON 字段和报告对应文字并重签 CHECKSUMS，validator 仍会接受。这违反 GR1R1
“独立重建完整 decision block”的明确要求。

GR1R2 的唯一目标是：让 validator 独立构造并精确比较 decision 的完整对象，同时对报告 §8
做完整、连续、唯一的块级比较，并用同步篡改负测证明遗漏字段不能再绕过验证。

## 2. 起点、隔离与 changed paths

仍从最后已接受的 D2R4 新建干净分支；不得把 GR1 或 GR1R1 纳入 ancestry：

- branch：`stage0a-wave2-gate-repair-preflight-gr1r2`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-gate-repair-preflight-gr1r2`
- 唯一 parent：D2R4 `6b67451c52a4c2760d6c939df8772e3bd41380da`
- GR1 `545f46a…`、GR1R1 `a24fe3e…`、D2 `3068b31…`、D2R1 `6a53404…`、
  D2R2 `2b2c07e…`、D2R3 `aaca216…` 均不得在 ancestry。

相对 D2R4 仍须恰六个 `A` 路径，路径集合与 GR1/GR1R1 相同：

```text
harness/verify_gate_repair_preflight_wave2.py
posthoc/stage0a-development-wave2-gate-repair-preflight/analyze_gate_repair_preflight_wave2.py
posthoc/stage0a-development-wave2-gate-repair-preflight/test_gate_repair_preflight_wave2.py
posthoc/stage0a-development-wave2-gate-repair-preflight/GATE-REPAIR-PREFLIGHT-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-gate-repair-preflight/GATE-REPAIR-PREFLIGHT-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-gate-repair-preflight/CHECKSUMS-GATE-REPAIR-PREFLIGHT-stage0a-development-wave2.sha256
```

允许只读参考 GR1R1 的六个新增文件，但不得 cherry-pick 未接受提交。posthoc 目录仍须恰五项；
CHECKSUMS 仍只登记 analyzer、test、JSON、REPORT 四项且不自列。不得修改任何已有文件、主仓，
不得 merge/tag/fetch/pull/push。

## 3. 必须纠正的实现

独立 validator 必须从自身常量与重建结果构造一份**完整 expected decision object**，然后对
待验 `doc["decision"]` 做精确对象等值比较；不能只挑部分键。至少须闭合：

- decision 的键集合恰为当前八项，拒绝缺项和额外项；
- `decision_rule` 来自 validator 自有的预注册规则常量；
- `baseline_violation_quadruple` 从独立基线四元组生成；
- `safe_improvements` 从反事实 id、安全布尔与 validator 自有 surface 映射生成；
- `safe_improvement_surfaces`、`g4_failure_surface`、`candidate_surfaces`；
- `recommended_next_surface`；
- `reason` 从独立候选面与 recommendation 确定性生成，不能从待验 JSON 或报告取值。

顶层 `recommended_next_surface` 仍须独立比较。

报告 §8 必须由 validator 用上述独立 expected decision 完整生成并验证：

- 预注册规则段；
- 安全改进行；
- G4 failure surface 行；
- 候选面行；
- recommendation **整行**，包括括号内 reason。

这五部分必须作为 `## 8. 下一修改面` 与 `## 9. 证据不足` 之间唯一、连续的规范块精确比较；
不能用 `fragment in report` 让正确片段与伪造/矛盾文字并存。报告尾行仍由独立 recommendation
决定。不得 import generator 或读取 generator 的常量/helper。

GR1R1 已补齐的 15 份输入 SHA、上游 CHECKSUMS 登记关系、v1.20 freeze 登记交叉核验与独立
反事实→surface 映射必须全部保留。

## 4. 必须新增的回归负测

保留 GR1R1 的 `CF-DROP-K4` 同步 surface 篡改黑盒负测，并新增针对本次缺口的负测。负测须从
真实、byte-identical 的 GR1 document 出发，只在 `tempfile.TemporaryDirectory()` 临时根落盘，
同步重签 CHECKSUMS，并实际调用独立 validator 的 `main()`：

1. 分别篡改 `decision.decision_rule`、`decision.baseline_violation_quadruple` 与
   `decision.reason`；凡报告会镜像的文字也同步修改，三类均须退出 2；
2. 给 decision 添加一个貌似自洽的额外键，证明精确键集合会拒绝；
3. 单独篡改报告 §8 的规则段或 recommendation 行括号内 reason，JSON 保持正确，仍须退出 2；
4. 错误输出只含净化阶段/字段名，不含 traceback、run/episode id、答案正文、模型名或绝对路径；
5. 控制组退出 0，且另行证明工作树五份 posthoc 产物在全部临时篡改后逐字节未变。

只比较 generator 重建字节不算；必须走 validator 的独立语义入口。

## 5. 数值与产物不得漂移

除 validator、测试与由 test 源码 SHA 导致的 CHECKSUMS 必要变化外，GR1/GR1R1 的证据结论
必须保持：

- analyzer、JSON、REPORT 与 GR1/GR1R1 逐字节相同；
- 196 行两条等式 mismatch 0/0，M1 mismatch 0；
- 基线 G1 `49/53`、G2 `82/196`、G3 `16.07pp`、G4 `1`；
- incidence/exclusive：k1 51/35、k2 0/0、k3 37/24、k4 7/5、k5 3/2、k6 0/0；
- 唯一安全改进仍为 `CF-DROP-K4`，surface=`review_routing`；
- G4 仍为 `matcher_miss`，surface=`wrong_action_matcher`；
- `recommended_next_surface=none_safe_from_preregistered_candidates`；
- 报告首行与末行不变。

不得借纠正 validator 修改 matcher、routing、谓词、阈值、gold、rubric、题目源或反事实公式。

## 6. 读取面与绝对边界

读取授权、产物泄露禁令与 GR1/GR1R1 完全相同。仍然：不读 `raw_outputs/`、其它 raw run 或
hidden；不触碰 hidden 的目录项、路径、SHA 或正文；不联网、不安装依赖、不调用模型、不产生
费用、不创建预算/approval；不修改 `harness/verify_stage0a_v120.py` 及其依赖；不重跑
C1/C2/J1/κ/M1/D1，不运行 sweep，不开始实际 verifier repair、正式 development、G0 或 hidden；
不调用 subagent。

## 7. 验证、commit 与回执

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-gate-repair-preflight/test_gate_repair_preflight_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-gate-repair-preflight/analyze_gate_repair_preflight_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_gate_repair_preflight_wave2.py
```

默认 Python 无 pytest 时可用机器已有环境；禁止联网安装。三条全绿后只提交一次：

```text
posthoc(stage0a): close full GR1 decision block validation (GR1R2)
```

回执除既有现场与数值外，必须给出：完整 expected decision object 的构造/精确比较位置、报告 §8
块级精确比较位置、新增同步篡改测试名与每类结果，以及 GR1/GR1R1/D2–D2R3 均不在 ancestry。
提交后停止；不得开始实际 verifier repair。
