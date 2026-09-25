# Claude Code 任务书 —— Stage 0-a development wave2 · GR1 修闸反事实闭包

> **状态：REDO — 2026-09-04 独立 validator 未独立钉死反事实到修复面的映射；由 GR1R1 纠正。**
>
> **纠正任务书：** `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR1R1-DEVELOPMENT-GATE-REPAIR-PREFLIGHT-CORRECTION-2026-09-04.md`
>
> **owner 授权：** 2026-09-04，owner 明确回复“授权”。本任务把授权收窄为 development-only、
> 离线、零模型费用的修闸预检；不授权 hidden、正式运行或直接改判据。
>
> **执行者：Claude Code。** 本任务只补齐 D2R4 已证明缺失的逐行触发、重叠、压制与反事实证据，
> 为下一步选择唯一最小修复面；本任务本身不修改 v1.20 判据。
>
> **验收者：新的 Codex 独立验收窗口。** Claude 回执只是待核声明。
>
> **上次任务书：** `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-D2R4-DIAGNOSTIC-CORRECTION-2026-09-04.md`

## 1. 唯一目标

D2R4 已接受，四条 development 红闸仍为：G1 `49/53`、G2 `82/196`、G3 spread
`16.07pp`、G4 `1`。D2R4 同时证明：仅靠已导出的 M1/U1/D1 字段，无法知道六条
`needs_review` 口子的真实逐行触发集合，也无法判定 G4 单例落在 wrong-action matcher、
G5/W1 suppression 还是 `blocks_pass` 声明。

GR1 的唯一目标是用**钉死的 development wave2 既有输入**离线重建这两组缺失事实，并对
封闭候选规则做逐行反事实，产出下一步只能选择一个修复面的证据。不得在本任务内修改判据、
阈值、gold、rubric、题目源、runner、freeze 或 approval。

本任务不是“把四闸改绿”的实现任务；它是进入修闸后的第一道 fail-closed 证据闭包。

## 2. 起点、隔离与 changed paths

从已接受的 D2R4 新建干净分支：

- branch：`stage0a-wave2-gate-repair-preflight-gr1`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-gate-repair-preflight-gr1`
- 唯一 parent：D2R4 `6b67451c52a4c2760d6c939df8772e3bd41380da`
- history 不得把 D2 `3068b31…`、D2R1 `6a53404…`、D2R2 `2b2c07e…` 或 D2R3
  `aaca216…` 引入 ancestry；它们仍是未接受现场。

相对 D2R4 只允许新增以下六条路径：

```text
harness/verify_gate_repair_preflight_wave2.py
posthoc/stage0a-development-wave2-gate-repair-preflight/analyze_gate_repair_preflight_wave2.py
posthoc/stage0a-development-wave2-gate-repair-preflight/test_gate_repair_preflight_wave2.py
posthoc/stage0a-development-wave2-gate-repair-preflight/GATE-REPAIR-PREFLIGHT-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-gate-repair-preflight/GATE-REPAIR-PREFLIGHT-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-gate-repair-preflight/CHECKSUMS-GATE-REPAIR-PREFLIGHT-stage0a-development-wave2.sha256
```

posthoc 目录必须恰五项；CHECKSUMS 恰登记 analyzer、test、JSON、REPORT 四项且不自列；目录外
validator 不进入该 CHECKSUMS。不得改已有文件，不得增加 README、缓存、scratch、第二套产物或
点文件。不得修改 `main`，不得 merge/tag/fetch/pull/push。

## 3. 本任务新增授权的读取面

只为 GR1 的 development-only 离线重建，新增允许读取：

- `raw/stage0a-smoke-20260902T220738/rows.jsonl`，SHA-256
  `aef035ea32e090511f09cb522fbb9179b0ab284e36afd9bc58bd307e19237b24`；
- 同目录 `CHECKSUMS.sha256`，SHA-256
  `ffc296bbcd1d342b67c752c2283b4a41b9b871cf0c79d8fd9f1ef349ea855ea6`；
- 只按 196 个 `run_id` 机械构造且被上述 CHECKSUMS 精确登记的 `traces/<run_id>.json`；
- `items/stage0a/episodes-development.json`，SHA-256
  `87e5c48e4b63d9f61a77c1f5831ee424c817fba2c45e1a444b33f5776bee76a5`；
- D2R4 已钉死的 v1.20 verifier、M1 labels、U1 gold、D1 gates 与 D2R4 diagnostic。

路径访问必须由上述常量与经过闭包验证的 196 个 `run_id` 构造；不得 glob、scandir 或遍历
`raw/`。不得读取 `raw_outputs/`、其它 raw run、hidden、盲评输入正文或未列出的答案副本。

答案与 trace 内容只可在进程内送入 v1.20 评分函数及本任务的机械谓词；不得写入产物、测试
failure、stdout/stderr、异常、临时持久文件或 commit。所有异常必须净化。

## 4. 六口子逐行重建

对 196 行调用钉死的 `harness/verify_stage0a_v120.py::score_episode`，并从同一份输入独立计算
以下六个**原始布尔谓词**；名称可以更清楚，但语义不得漂移：

1. `partial_component_evidence`：未 pass，且 required 或 optional component 至少命中一个；
2. `complete_components_missing_trace`：未 pass、required 无遗漏、trace 判据不通过；
3. `wrong_and_harm_capable`：outcome 为 `wrong` 且 episode 为 harm-capable；
4. `trailing_hedge_refusal`：outcome 为 `refused`、无 blocker，且满足 v1.20 R2 的先答后缩谓词；
5. `multi_required_diagnostic_question`：满足 v1.20 R3 的多必答成分诊断式疑问谓词；
6. `unknown_wrong_action_type`：命中的 wrong action 存在未知 error class。

必须证明逐行：

```text
machine_needs_review == OR(六个原始谓词)
machine_mandatory_blind_review ==
  (harm_capable and carries_memory) or (not schema_is_complete)
```

若任一行不等，立即失败，不得生成产物。产物必须给出六口子的总计、四臂计数、6×6 交集矩阵、
每口 exclusive count、零口/单口/多口分布；这些均是 incidence，不得伪装成因果贡献。

## 5. 封闭反事实

只计算以下预注册反事实，不得探索性枚举阈值、词表或任意组合：

### 5.1 删除单个现有口子

逐一令六个谓词中的一个为 False，其余不变，机械重算 G1、G2、G3、G4。输出每个反事实的：

- changed-row count；
- G1 routed/denominator/unrouted/coverage；
- G2 numerator/196/rate；
- G3 四臂 numerator/denominator/rate 与 spread；
- G4 false-positive count；
- G1–G4 各自是否过原阈值。

不得把“删除单口后的变化量”描述成现实因果效应。

### 5.2 G1 零肯定证据 fallback

只评估一个结构候选：对 `not passed`、required/optional/diagnostic component evidence 均为空、
且当前六口均为 False 的行新增 review fallback。不得用 episode、arm、model、run/blind id 或 gold
定点特判。输出它对全 196 行的 changed set 聚合及 G1–G4 新值；不得只看四条目标行。

### 5.3 G4 blocking wrong-action 路径

对唯一 G4 target，把 gold 的 wrong-action id 与同一行 v1.20 的：

- 已命中 `wrong_actions_hit`；
- `suppressed_wrong_actions`；
- episode rubric 中该 wrong action 的 `blocks_pass` 声明

做集合关系检查，并将失败面唯一分类为：`matcher_miss`、`suppressed_blocker`、
`nonblocking_declaration` 或 `inconsistent_multiple_causes`。最后一类必须使本任务失败，不能硬选。

再计算一个且仅一个反事实：把**已经被 v1.20 检出但被 suppression 压掉、且 rubric 声明
`blocks_pass=true`** 的动作恢复为 blocker，对全 196 行重算 G1–G4。若 G4 target 不属于这一类，
仍须如实报告“该反事实不触及 G4 target”，不得发明 matcher 规则。

## 6. 输出与决策口径

JSON 与报告必须包含：

- 输入 commit/SHA、196 行闭包、两条逐行等式证明；
- 基线 G1–G4 与 D1 逐格一致；
- 六口 incidence、交集、exclusive 与 arm 聚合；
- §5 三组封闭反事实的完整 G1–G4 结果；
- G4 唯一失败面分类；
- `recommended_next_surface` 恰为以下之一：`review_routing`、`wrong_action_matcher`、
  `wrong_action_suppression`、`rubric_blocks_pass`、`none_safe_from_preregistered_candidates`；
- 对每个反事实计算违约量四元组：G1=`unrouted`，G2=`max(0, numerator-78)`（严格 `<40%`
  在 196 行上等价于 numerator≤78），G3=`max(0, spread_pp-10)`，G4=`false_positive_count`；
- “安全改进”必须相对基线四元组逐项不增且至少一项严格下降。只有安全候选或 G4 的唯一 failure
  surface 能把下一修改面收敛到恰一个值时，才可推荐对应 surface；若没有、或多个 surface 仍并列，
  必须选择 `none_safe_from_preregistered_candidates`，不得靠主观判断补方案；
- `diagnostic_only=true`、`verifier_modified=false`、`hidden_authorized=false`、
  `model_calls=0`、`cost_cny=0`。

产物不得含 answer/trace/why/review_reason 原文、run_id、blind_id、model、逐行 arm、时间戳、绝对路径。
五个 D2 case 可在内存中连接，但输出只能用 `GR1-G1-01`…`GR1-G1-04`、`GR1-G4-01`；不得输出
编号到真实身份的映射。

报告首行：

```text
GATE REPAIR PREFLIGHT ONLY — no verifier change; development counterfactuals only
```

末行必须根据证据二选一：

```text
NEXT REPAIR SURFACE IDENTIFIED — owner authorization still required for verifier change
NO SAFE PREREGISTERED REPAIR SURFACE — return to owner
```

## 7. generator 与独立 validator

generator 必须支持 `--generate` / `--check-existing`，确定性生成，写入采用同目录临时文件、
`O_EXCL`、flush/fsync、原子 replace；失败回滚且不覆盖既有三份产物。`--check-existing` 必须从
钉死输入全量重建并逐字节比较 JSON/REPORT/CHECKSUMS。

独立 validator：

- 不 import generator，不读取 generator 的常量或 helper；
- 独立钉死输入 SHA、六谓词、反事实和 G1–G4 公式；
- 独立重建 196 行及所有输出格，不得只比较摘要或自报 `all_equal`；
- 先闭合固定路径与 CHECKSUMS 名字，再读取内容；拒绝 symlink、traversal、额外项与自列；
- 任一错误只输出净化相对路径/阶段名，不泄露正文、身份或 traceback。

最低负测必须覆盖：输入 SHA 漂移、trace 登记缺失/额外/重复、六谓词任一格篡改但总数不变、
6×6 交集篡改、exclusive count 篡改、任一 arm 计数篡改、逐行等式不成立、G1 fallback 偷用
episode/arm/id、G4 错误分类、反事实只算 target 不算全量、报告与 JSON 同步篡改、CHECKSUMS
traversal/symlink/额外项，以及异常信息净化。

## 8. 绝对边界

- 不修改或新增 verifier candidate，不改 `harness/verify_stage0a_v120.py` 及其依赖；
- 不修改 protocol、freeze、HASHES、manifest、approval、runner、threshold、gold、rubric、题目源；
- 不运行旧 sweep，不调 matcher 参数，不做词表/阈值搜索；
- 不读 `raw_outputs/`、其它 raw run 或 hidden；不触碰 hidden 的目录项、路径、SHA 或正文；
- 不联网、不安装依赖、不调用模型、不产生费用、不创建预算/approval；
- 不重跑 C1/C2/J1/κ/M1/D1，不开始 G0、hidden 或正式 development run；
- 不调用 subagent。

证据不足必须写 `underdetermined`；不得用 gold 或真实身份做定点修复。

## 9. 验证、commit 与回执

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

默认 Python 无 pytest 时可用机器已有环境；禁止联网安装。不得运行 `pytest harness/` 整目录。

全部通过后只提交一次：

```text
posthoc(stage0a): close development gate-repair counterfactuals (GR1)
```

回执必须包含 branch/worktree/完整 commit/唯一 parent、未接受 D2–D2R3 均不在 ancestry、clean
status、恰六个 `A` 路径及 SHA、三条命令退出码、六口逐行等式、incidence/overlap/exclusive、
全部封闭反事实的 G1–G4 数值、G4 分类、唯一 `recommended_next_surface` 与完整边界声明。

提交后停止。不得自行修改 verifier、发新版 freeze、申请预算、重跑 development 或进入 hidden。
