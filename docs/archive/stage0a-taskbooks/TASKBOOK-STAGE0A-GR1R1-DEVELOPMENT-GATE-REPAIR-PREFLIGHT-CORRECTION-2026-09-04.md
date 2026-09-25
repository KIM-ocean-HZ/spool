# Claude Code 任务书 —— Stage 0-a development wave2 · GR1R1 独立决策验证纠正

> **状态：REDO — 2026-09-04 独立 validator 未闭合完整 decision block 与报告 §8；由 GR1R2 纠正。**
>
> **纠正任务书：** `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR1R2-DEVELOPMENT-GATE-REPAIR-PREFLIGHT-CORRECTION-2026-09-04.md`
>
> **性质：** GR1 的最小纠正；只修独立 validator 的 fail-closed 决策验证与对应负测，
> 不进入 verifier repair，不改变 GR1 的实验读数或预注册结论。
>
> **上次任务书：** `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR1-DEVELOPMENT-GATE-REPAIR-PREFLIGHT-2026-09-04.md`

## 1. Redo 原因与唯一目标

GR1 commit `545f46ab205ef1f36c11a97b090bba21fcce7e07` 的三条目标命令均通过，
六个产物与回执读数也一致；但独立 validator 的最终决策并非真正独立重建。

在 `harness/verify_gate_repair_preflight_wave2.py::_check_counterfactuals` 中，安全反事实的
surface 直接取自待验 JSON 的 `item["candidate_surface"]`。因此把唯一安全的
`CF-DROP-K4` 从应有的 `review_routing` 同步篡改为 `wrong_action_matcher`，并同步修改
decision、顶层 recommendation 与报告后，validator 的全部语义检查仍接受
`wrong_action_matcher`。这能把正确的“两个面并列，退回 owner”伪造成“唯一 matcher 面”，
违反原任务书 §6–§7 的预注册映射、独立收敛规则和同步篡改负测要求。

GR1R1 的唯一目标是：让 validator 用自己的常量和逻辑钉死三组反事实对应的修复面，
独立重建完整 decision block，并用一条针对上述具体攻击的回归负测证明同步篡改必红。

## 2. 起点、隔离与 changed paths

从最后已接受的 D2R4 新建干净分支；不得把被退回的 GR1 纳入 ancestry：

- branch：`stage0a-wave2-gate-repair-preflight-gr1r1`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-gate-repair-preflight-gr1r1`
- 唯一 parent：D2R4 `6b67451c52a4c2760d6c939df8772e3bd41380da`
- GR1 `545f46a…`、D2 `3068b31…`、D2R1 `6a53404…`、D2R2 `2b2c07e…`、
  D2R3 `aaca216…` 均不得在 ancestry。

相对 D2R4 仍须恰六个 `A` 路径，路径集合与 GR1 完全相同：

```text
harness/verify_gate_repair_preflight_wave2.py
posthoc/stage0a-development-wave2-gate-repair-preflight/analyze_gate_repair_preflight_wave2.py
posthoc/stage0a-development-wave2-gate-repair-preflight/test_gate_repair_preflight_wave2.py
posthoc/stage0a-development-wave2-gate-repair-preflight/GATE-REPAIR-PREFLIGHT-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-gate-repair-preflight/GATE-REPAIR-PREFLIGHT-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-gate-repair-preflight/CHECKSUMS-GATE-REPAIR-PREFLIGHT-stage0a-development-wave2.sha256
```

posthoc 目录仍须恰五项；CHECKSUMS 仍只登记 analyzer、test、JSON、REPORT 四项且不自列。
不得修改任何已有文件，不得修改主仓，不得 merge/tag/fetch/pull/push。

## 3. 必须纠正的实现

独立 validator 不得从产物自报字段推导下一修改面。它必须在自身源码中独立钉死并逐格验证：

- 六个 `CF-DROP-K1`…`CF-DROP-K6` 的 `candidate_surface` 都必须是
  `review_routing`；
- `CF-G1-ZERO-EVIDENCE-FALLBACK` 的 `candidate_surface` 必须是
  `review_routing`；
- `CF-G4-RESTORE-DECLARED-BLOCKING-SUPPRESSED` 的 `candidate_surface` 必须是
  `wrong_action_suppression`；
- 安全反事实的 surface 集合必须从上述 validator 自有映射生成，不能
  `safe_surfaces.add(item["candidate_surface"])`；
- `decision.safe_improvements` 必须由 validator 按反事实 id、安全布尔和自有 surface 映射
  独立重建并精确比较；
- `decision.safe_improvement_surfaces`、`g4_failure_surface`、`candidate_surfaces`、
  decision 内外两份 `recommended_next_surface` 与报告尾行必须从独立重建结果闭合。

validator 还须独立钉死原 GR1 任务书列出的输入 SHA，而不是只验证其中一部分。至少要补齐
当前遗漏的 v1.20 HASHES、M1/U1/D1/D2R4 CHECKSUMS 与 D2R4 diagnostic；上游登记关系可按
独立实现交叉核验。不得 import generator 或读取 generator 的常量/helper。

## 4. 必须新增的回归负测

新增一条针对本次真实漏洞的负测：

1. 从真实 GR1 document 出发；
2. 把 `CF-DROP-K4.candidate_surface` 改为 `wrong_action_matcher`；
3. 同步修改 `decision.safe_improvements`、`safe_improvement_surfaces`、
   `candidate_surfaces`、decision 内外 recommendation 与报告尾行，使 JSON/报告内部自洽；
4. 若测试落盘，还要同步重签 CHECKSUMS；只准使用自动清理的临时目录，不得改工作树产物；
5. 断言独立 validator 因预注册 surface 映射不等而失败，并且错误输出已净化。

该负测必须实际调用 validator 的独立语义检查或其黑盒入口；只断言“篡改后字节不同于
generator 重建结果”不算覆盖本漏洞。保留 GR1 原有全部负测。

## 5. 数值与产物不得漂移

除 validator、测试与由源码 SHA 导致的 CHECKSUMS 必要变化外，GR1 的证据结论必须保持：

- 196 行两条等式全等，M1 逐格不等 0；
- 基线 G1 `49/53`、G2 `82/196`、G3 `16.07pp`、G4 `1`；
- incidence/exclusive 为 k1 51/35、k2 0/0、k3 37/24、k4 7/5、k5 3/2、k6 0/0；
- 唯一安全改进仍只有 `CF-DROP-K4`，其 surface 必须是 `review_routing`；
- G4 分类仍为 `matcher_miss`，surface 为 `wrong_action_matcher`；
- 两个候选面并列，`recommended_next_surface` 必须仍是
  `none_safe_from_preregistered_candidates`；
- 报告末行仍为
  `NO SAFE PREREGISTERED REPAIR SURFACE — return to owner`。

不得借纠正 validator 改 matcher、routing、谓词、阈值、gold、rubric、题目源或任何反事实公式。

## 6. 读取面与绝对边界

读取授权、产物泄露禁令与 GR1 完全相同。仍然：

- 不读 `raw_outputs/`、其它 raw run 或 hidden；不触碰 hidden 的目录项、路径、SHA 或正文；
- 不联网、不安装依赖、不调用模型、不产生费用、不创建预算/approval；
- 不修改 `harness/verify_stage0a_v120.py` 及其依赖，不新增 verifier candidate；
- 不重跑 C1/C2/J1/κ/M1/D1，不运行 sweep，不开始正式 development、G0 或 hidden；
- 不调用 subagent。

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
posthoc(stage0a): make GR1 decision validation independent (GR1R1)
```

回执除 GR1 原有现场与数值外，必须给出：validator 自有反事实→surface 映射的位置、
独立重建 decision block 的位置、上述同步篡改回归测试名与结果，以及 GR1/D2–D2R3 均不在
ancestry。提交后停止；不得开始实际 verifier repair。

## 8. 独立验收 —— 2026-09-04

### 8.1 已核通过

- commit `a24fe3ec26e27eb741409b89e28d12018fef52b6`，唯一 parent 为 D2R4
  `6b67451c52a4c2760d6c939df8772e3bd41380da`；GR1 与 D2–D2R3 均不在 ancestry；
- 相对 D2R4 恰六个 `A`，posthoc 目录恰五项，CHECKSUMS 恰四项且不自列；worktree clean；
- 六个 SHA 与回执一致，analyzer/JSON/REPORT 与 GR1 逐字节相同；主仓与 tag 未动；
- validator 已独立钉死反事实→surface 映射，并保护安全 surface、G4 surface、候选面、内外
  recommendation 与报告尾行；原 K4 同步 surface 伪造负测确实走黑盒入口；
- 三条命令退出 0：`49 passed`、三份产物 byte-identical、独立 validator `PASS`；基线、
  incidence/exclusive、反事实与最终 recommendation 均未漂移。

### 8.2 Blocking finding

`harness/verify_gate_repair_preflight_wave2.py:807-821` 未比较 decision 中的
`decision_rule`、`baseline_violation_quadruple`、`reason`，也未拒绝额外 decision 键；
`:708-722` 对报告 §8 只做片段包含检查，未闭合规则段和 recommendation 整行的 reason。
因此同步改写这些仍受产物控制的语义字段并重签 CHECKSUMS 不会触发失败，和本任务“完整
decision block”独立重建要求不符。

### 8.3 Verdict

`Redo`

原始 `CF-DROP-K4` surface 攻击已修复，实验结论未发现漂移；但完整决策块仍未 fail-closed。
只下发 GR1R2 闭合当前 validator 与负测，不进入实际 verifier repair。
