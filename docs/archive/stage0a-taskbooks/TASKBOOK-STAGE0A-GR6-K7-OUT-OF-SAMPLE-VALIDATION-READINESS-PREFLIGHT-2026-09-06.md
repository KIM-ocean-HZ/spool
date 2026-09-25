# Claude Code 任务书 —— Stage 0-a · GR6 k7 样本外验证就绪性预检

> **状态：COMPLETE — 2026-09-06 验收 verdict：`Redo`。**
>
> **退回原因：** commit `a76a2c675046628445ee98243fe138c0b4d819f2` 的科学判定与正式三条命令
> 均通过，但 independent validator 没有独立重建 canonical JSON / REPORT 的完整字节，也没有闭合
> 所有 matrix / blocker 字段。临时黑盒 mutation 删除 `FAILURE_POLICY_NOT_FROZEN`、把
> `failure_policy_ready` 改成 `true` 后仍 rc 0；单独篡改 REPORT 的 role-separation 事实后也仍 rc 0。
>
> **纠正任务：**
> `docs/TASKBOOK-STAGE0A-GR6R1-K7-OUT-OF-SAMPLE-VALIDATION-READINESS-INDEPENDENT-VALIDATOR-CORRECTION-2026-09-06.md`。
> GR6 未进入 accepted chain；hidden=`underdetermined` 与结论 5 经 Codex 验收确认，GR6R1 不得借机改判。
>
> **唯一交付：** 在不打开任何 episode / answer / trace / gold 正文、不运行 scorer、不调用模型、
> 不产生费用且不接触 hidden 文件本体的前提下，只从钉死的冻结、执行与角色 metadata 机械判断：
> 是否已经存在一个可用于检验 locked k7 的、独立于 GR4/GR5 hypothesis 形成面的非 hidden cohort；
> 若不存在，精确列出下一次真正样本外验证仍缺少的 dataset、independence、role、approval、预算与
> execution 条件。
>
> **性质：** metadata-only、readiness-only、零模型调用、零费用。不是 k7 效果验证，不创建 candidate，
> 不选择 repair configuration，不改阈值，不解封 hidden，不新建数据或 wave，不作 promotion / freeze /
> 正式运行结论。
>
> **授权来源：** owner 于 2026-09-06 在 GR5 `Accept` 后明确“批准下一任务”。Codex 将授权收敛为
> 最小 GR6 readiness preflight：先证明有没有合格验证面，再决定是否申请 hidden / 新 wave / 费用。
> 该授权不永久改变执行方针，也不授权 GR6 之后的任务。
>
> **为什么不是直接建 candidate：** GR5 明确记录 `in_sample_hypothesis=true`、`overfit_risk=high`，且
> 256 格 `all_green_count=0`、结构阻断者为 G1；当前没有 development-feasible configuration 可安全
> 提升。把当前 196 行重新切片、重排或重算不产生样本外证据。

## 1. 唯一问题与完成定义

本任务只回答四个 readiness 问题：

1. 冻结 metadata 是否登记了 development、validation、hidden 或其它 wave/cohort；
2. 已登记的任一非 hidden cohort 是否能证明在 project、trajectory、template family 三层都与
   GR4/GR5 hypothesis 形成面不交叉，并且未参与 k7 定义、筛选或阈值选择；
3. 若 cohort 存在，是否已有足够的器材绑定、角色隔离、批准、预算、runner 与失败规则，可以在
   **另一个任务**中执行；
4. 若不存在，下一步究竟只能是申请新 paid wave、申请 sealed hidden execution，还是仍被更早的
   protocol/role 条件阻断。

完成定义：analyzer 与 independent validator 各自只读同一组钉死 metadata 与 GR5 git objects，生成
逐 cohort 的 readiness matrix、证据来源和 blocker 集；两套 canonical JSON / REPORT 逐字节相同；
不存在证明时必须写 `underdetermined` 或 `ineligible`，不得靠文件名、同一 wave 子集或 agent 推断
补足独立性。结果无论为何，都返回 owner decision。

## 2. 明确非目标与绝对红线

本任务不做：

- 不打开、stat、hash、glob、diff、复制或预处理 `items/stage0a/episodes-hidden.json`；
- 不遍历 `items/`、`raw/`、`blind/`、`raw_outputs/`，不读取任何 episode、answer、trace、gold、rubric
  或逐行身份；
- 不运行 v1.20 scorer、runner、rescore、sweep、semantic probe、旧任务 analyzer 或任何 196 行重算；
- 不把 current development wave2 的切片、交叉验证、重排、bootstrap 或 k7-off 配对称为样本外；
- 不把旧 measurement anchor、control set 或其它历史 development 面称为独立验证，除非 metadata 同时
  证明三层 split 独立且从未参与 hypothesis / verifier / matcher / threshold development；
- 不运行 hidden，不创建 hidden approval，不生成 approval 文件，不进入 hidden 执行/盲评/adjudication；
- 不新建 episode、project、template、wave、runner、candidate verifier 或 k8；
- 不选择 GR5 的任一 cell，不改 k7、k1–k6、mandatory、matcher、gold、rubric、gate 或阈值；
- 不联网、不安装依赖、不调用模型/API、不申请或消耗费用；
- 不修改 `docs/EXECUTION_POLICY.md`、实验主仓、accepted commit 或任何冻结件；
- 不 merge、tag、fetch、pull、push，不调用 subagent，不自动创建 GR7。

任何需要读取数据正文、运行 scorer、接触 hidden 本体、创建新 wave 或消耗费用的发现，都只能登记为
owner decision；不得在本任务里继续。

## 3. Readiness 判定规则必须预先写死

### 3.1 cohort 闭集

只允许从 §6 的 metadata 中机械发现并归入以下闭集；不得从目录遍历补对象：

- `current_development_wave2`
- `prior_measurement_anchor`
- `registered_validation_cohort`
- `sealed_hidden_baseline`
- `other_registered_wave`

若 metadata 未登记某类，记录 `registered=false`；不得因为本地“可能有文件”而把它加进来。

### 3.2 科学资格与执行就绪必须分层

某 cohort 只有同时满足下列五项科学条件，才可记为
`eligible_for_locked_k7_validation=true`：

1. `registered=true`，且 source manifest 与 SHA 已钉死；
2. 不是 GR4/GR5 使用的 `current_development_wave2`，也不是它的任何子集或变换；
3. metadata 明确证明 project、trajectory、template family 三层与 hypothesis 形成面不交叉；
4. metadata 明确证明 cohort 未参与 k7 定义、target 发现、matcher/verifier/gold/rubric/gate/threshold
   调整或 cell 选择；
5. 运行 locked k7 不要求修改任何 accepted scorer、matcher、formula、gate 或 threshold。

科学资格闭合后，还必须独立判断执行条件：

1. 若是 hidden，另有 owner 明确的 hidden approval、合格 clean execution role 与一次性 execution plan；
   本 GR6 授权本身不得被当作 hidden approval；
2. 若需要新模型调用，另有预算批准、有效 approval、冻结 runner/manifest 与 failure policy；
3. 对应 labels/gold 的不可见性、执行/评分/adjudication 角色隔离已由 metadata 明确证明。

不得用执行授权的缺失反向否定已经闭合的科学资格，也不得用科学资格代替执行授权。两层状态必须区分：

- `ineligible`：已有 metadata 明确否定至少一项科学条件；
- `underdetermined`：metadata 没有提供判定科学资格所需的事实；
- `eligible_but_not_authorized`：科学资格已闭合，但 execution/hidden/budget approval 缺失；
- `ready`：科学资格、器材、角色、批准与预算全部闭合；仅此状态才允许建议另立执行任务。

### 3.3 当前 wave 禁止伪独立

analyzer 与 validator 都必须机械断言：

- `current_development_wave2` 永远不能因 row split、fold、bootstrap、matcher axis、mask、k7 bit 或
  target/non-target 分组变成样本外；
- GR5 的 256 cells 只是同一 196 行上的 aggregate family，不是 256 个独立 cohorts；
- `in_sample_hypothesis=true` 与 `overfit_risk=high` 在 readiness 报告中必须保留；
- 若输出把 current development 的任何派生面标成 eligible，立即退出 2。

### 3.4 hidden 的授权隔离

本任务只允许读取 §6 中已经钉死的 metadata 对 hidden 的**登记声明与 manifest 内 SHA 文本**；不得
解引用 hidden path，不得用 `os.path.exists/stat/open/glob/scandir/walk`、shell hash 或 git blob 读取
hidden 文件本体。报告必须明确：

- `hidden_file_touched=false`
- `hidden_content_read=false`
- `hidden_file_hashed=false`
- `hidden_execution_run=false`
- `hidden_authorized_for_execution=false`
- `gr6_is_hidden_approval=false`

任何“hidden 有 SHA”只证明 metadata 登记，不等于 execution approval、内容独立性审计或可运行。

## 4. 起点、branch、worktree 与提交拓扑

- parent：accepted GR5 `f94898367e8e5238b54ad3a7de43bf829bc0c9cb`
- branch：`stage0a-wave2-k7-out-of-sample-validation-readiness-gr6`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-k7-out-of-sample-validation-readiness-gr6`
- 2026-09-06 已核：branch 与 worktree 均不存在。执行时若任一已存在，立即停止；不删、不覆盖、
  不复用、不猜测。
- 最终恰一笔 commit，唯一 parent 为 GR5。GR2A / GR2BR1 / GR2CR1 / GR2D 与 Redo commits 仍不得
  合入 ancestry；需要核其历史地位时只按 full commit SHA 读 git metadata。
- 不从 sibling worktree 读文件，不用浮动 ref。

三条目标命令全绿后只提交一次，message 必须为：

```text
posthoc(stage0a): preflight k7 out-of-sample validation readiness (GR6)
```

## 5. 唯一允许的 changed paths

相对 GR5 必须恰六个新增路径、0 个已有文件修改：

```text
harness/verify_k7_out_of_sample_validation_readiness_wave2.py
posthoc/stage0a-k7-out-of-sample-validation-readiness/analyze_k7_out_of_sample_validation_readiness_wave2.py
posthoc/stage0a-k7-out-of-sample-validation-readiness/test_k7_out_of_sample_validation_readiness_wave2.py
posthoc/stage0a-k7-out-of-sample-validation-readiness/K7-OUT-OF-SAMPLE-VALIDATION-READINESS-stage0a.json
posthoc/stage0a-k7-out-of-sample-validation-readiness/K7-OUT-OF-SAMPLE-VALIDATION-READINESS-REPORT-stage0a.md
posthoc/stage0a-k7-out-of-sample-validation-readiness/CHECKSUMS-K7-OUT-OF-SAMPLE-VALIDATION-READINESS-stage0a.sha256
```

posthoc 目录必须恰五项；CHECKSUMS 只登记 analyzer、test、JSON、REPORT 四项且不自列。不得创建
dataset inventory 原始清单、hidden digest 文件、approval、candidate、review packet 或第七件产物。

## 6. 唯一允许读取的输入闭包

### 6.1 accepted GR5 六对象

必须从 parent commit 与工作树各自核 SHA，不读取 GR5 JSON / REPORT 当 expected readiness document：

| path | SHA-256 |
|---|---|
| `harness/verify_k7_complete_component_evidence_absence_feasibility_wave2.py` | `da5bc2e9746ae3d91d43cb675cf954f417520713c0a26d2e7d06e32a5b1a0172` |
| `posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/analyze_k7_complete_component_evidence_absence_feasibility_wave2.py` | `6c7f5595bdf65e7b037d19609902ac63712c64cddffbb9e716fca96db191fa36` |
| `posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/test_k7_complete_component_evidence_absence_feasibility_wave2.py` | `314d9a7cccd9aca26e57c5a58eebabb4db2dd06a05676b7526854989d7acd652` |
| `posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/K7-COMPLETE-COMPONENT-EVIDENCE-ABSENCE-FEASIBILITY-stage0a-development-wave2.json` | `41759ff8fa2e5d51370a7d7cbdd4e46e51847ce7221baea0ecc3d9b9aba6564b` |
| `posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/K7-COMPLETE-COMPONENT-EVIDENCE-ABSENCE-FEASIBILITY-REPORT-stage0a-development-wave2.md` | `4d500a61f807d674390528b76e5337ddebef717101cbe49adc4d4a3c413d4d9e` |
| `posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/CHECKSUMS-K7-COMPLETE-COMPONENT-EVIDENCE-ABSENCE-FEASIBILITY-stage0a-development-wave2.sha256` | `7d2d3d8ee160871592401beff0d85f97ea813092e63568551c4a6d8409d6bdc8` |

允许从 GR5 JSON 读取的值只有下列已验收顶层边界声明，不得读 `configurations` 或任何 per-cell table：

- `in_sample_hypothesis=true`
- `overfit_risk="high"`
- `all_green_count=0`
- `structurally_blocking_gates=["G1"]`
- `candidate_verifier_created=false`
- `repair_configuration_selected=false`
- `hidden_touched=false`
- `out_of_sample_validity="underdetermined"`

analyzer 与 validator 应自行从 parent object 解析这些字段并逐项断言，不从 analyzer 共享结果。

### 6.2 九份 metadata

只允许读取下表九份文件；任一 SHA 漂移即失败：

| path | SHA-256 |
|---|---|
| `protocol/FREEZE-stage0a-verifier-v1.20.md` | `3aaa8d3819b49b55f197b868a64c9382ddbecf862012c53b9116a2376c9a74f3` |
| `protocol/HASHES-stage0a-verifier-v1.20.json` | `18166e09e5d93f73be26f6efb06a51fb0c940230ba26e80142802a6417011e76` |
| `protocol/EXECUTION-MANIFEST-stage0a-v1.20.json` | `7e996819f24e6047e1981f4ef463c33feea355276e856ad24d9fa3ee028f8319` |
| `protocol/ERRATUM-01-stage0a-v1.20-2026-09-02.md` | `1febe277670b84a6c0e7f7ffd5b1331e0154bb95acfc3bc8e46434115b05f93e` |
| `protocol/ERRATUM-02-stage0a-wave2-boundary-and-price-2026-09-02.md` | `ce5a14240751e9ae53430dc5027c3b6d965fee813aea284b817f9c1f92d0ad96` |
| `protocol/AMENDMENT-07-stage0a-v1.7.md` | `cb49276941ef2afc0007e6e877fc66936214703fa54ae2186601725ca3bdc4dc` |
| `protocol/ROLE-LOG-stage0a-post-v1.20-freeze.json` | `d2c4bf082364e3424c5324b3309d2db617c3cfe575862163fa3b91589e4212cc` |
| `protocol/ROLE-LOG-stage0a-v1.20.json` | `887dbae0992a13ec7dd35532faab9582169a11ed06ec3375e1c6441cd2bf217c` |
| `protocol/ROLE-DECLARATION-stage0a-development-wave2.json` | `18d48937a815b12e9e47b182fb0245d8f95501554c6c4445424f419be996a32d` |

这九份文件只用于 metadata 事实；不得从其中出现的 path 继续解引用任何 dataset/raw/blind 对象。不得
列目录、glob、walk 或读取未列出的 protocol/archive 文件。

### 6.3 metadata 自洽检查

两套实现各自至少闭合：

- freeze doc、HASHES 与 execution manifest 对 v1.20 身份和 next-wave baseline 的注册一致性；
- execution manifest 精确为 `stage0a-development-wave2`、`development-only`、196 runs，且
  `hidden_authorized=false`；
- GR5 parent object 的 locked signal、in-sample/high-risk 与 no-candidate/no-hidden 声明；
- role declaration 与 role logs 对执行、评分、hidden 边界事件、clean-window 要求的相容性；
- metadata 中是否存在明确命名且独立性证据完整的 validation/other-wave cohort；
- 不把“有 SHA”“有路径”“有历史 artifact”误当作已生成、独立、已授权或可执行。

## 7. 必须发布的 readiness matrix

JSON 必须保存固定顺序的 cohort aggregate table。每行只含 metadata，不含文件路径以外的身份数据：

- cohort class；
- registered / generated / content_touched；
- current-wave derivative；
- split independence：project / trajectory / template family 三项，值只能为 `proven`、`failed`、
  `underdetermined`；
- hypothesis-development exposure；
- scorer/matcher/formula change required；
- model calls required；
- hidden execution required；
- role separation ready；
- owner approval ready；
- budget ready；
- failure policy ready；
- scientific status 与 execution status；
- `eligible_for_locked_k7_validation` 与 blocker codes。

blocker codes 必须来自闭集，例如：

```text
CURRENT_WAVE_DERIVATIVE
THREE_LEVEL_SPLIT_NOT_PROVEN
HYPOTHESIS_EXPOSURE_NOT_EXCLUDED
COHORT_NOT_REGISTERED
CONTENT_OR_LABEL_AVAILABILITY_UNDERDETERMINED
HIDDEN_EXECUTION_NOT_AUTHORIZED
CLEAN_ROLE_NOT_ASSIGNED
BUDGET_NOT_AUTHORIZED
APPROVAL_NOT_PRESENT
EXECUTION_PLAN_NOT_FROZEN
FAILURE_POLICY_NOT_FROZEN
```

不得输出逐 episode、project、template、run、model 或 person 身份；不得给 hidden 内容摘要。

## 8. 决策输出与唯一允许结论

顶层必须机械给出：

- `eligible_existing_non_hidden_cohort_count`
- `ready_existing_non_hidden_cohort_count`
- `eligible_but_not_authorized_hidden_cohort_count`
- `new_paid_wave_required`
- `hidden_execution_required`
- `current_development_reuse_rejected=true`
- `candidate_verifier_created=false`
- `repair_configuration_selected=false`
- `threshold_changed=false`
- `new_routing_hypothesis_proposed=false`
- `model_calls=0`
- `cost_cny=0`
- §3.4 的六个 hidden false 声明
- `out_of_sample_k7_effect_evaluated=false`
- `promotion_decision="not_made"`

结论只能从以下闭集中选一个：

1. `an existing non-hidden cohort is ready for a separately authorized locked-k7 validation task`
2. `an existing non-hidden cohort may be scientifically eligible but execution prerequisites remain open`
3. `only sealed hidden could provide the registered independent validation surface, but hidden execution is not authorized`
4. `a new separately frozen and funded wave is required before locked-k7 out-of-sample validation`
5. `out-of-sample validation readiness is underdetermined from the pinned metadata`

若多个条件同时存在，按 1 → 2 → 3 → 4 → 5 的顺序选择最具体、证据已闭合的句子，并在 blockers 中
保留其它缺口。不得写 k7 “有效/无效/泛化/失败”，因为本任务没有评估效果。

REPORT 首行必须为：

```text
K7 OUT-OF-SAMPLE VALIDATION READINESS ONLY — no cohort execution, candidate, threshold, promotion, or hidden decision
```

末行必须为：

```text
GR6 COMPLETE — return to owner before any dataset access or validation execution
```

## 9. independent validator 与负测

`harness/verify_k7_out_of_sample_validation_readiness_wave2.py` 必须独立钉死 §6 输入、GR5 objects、
readiness 规则、cohort matrix、blocker 闭集、canonical JSON / REPORT 和边界声明。不得 import analyzer /
tests / GR5 analyzer，也不得把 analyzer 生成的 JSON / REPORT 当 expected document。

测试在 `TemporaryDirectory()` 复制五份 posthoc 产物，必要时重签 CHECKSUMS，再黑盒运行 validator；
每条 mutation 前先跑 byte-identical control rc 0。至少覆盖：

1. 把 current development 的 fold/subset/bootstrap/mask/axis 标成样本外；
2. 把 256 cells 当成 256 cohorts；
3. 在三层 split 任一项为 underdetermined/failed 时仍标 eligible；
4. 未排除 hypothesis exposure 时仍标 eligible；
5. 把 metadata 内的 hidden SHA 登记解释为 hidden approval、内容审计或可执行；
6. 宣称读取/hash/运行 hidden，或解引用 `items/raw/blind` 路径；
7. 把本 GR6 owner 授权改写成 hidden、预算、approval、模型调用或正式运行授权；
8. 忽略 clean-window、role separation、approval、预算或 failure-policy blocker；
9. 伪造 registered validation/other-wave cohort，或用目录遍历发现额外数据；
10. 读取 GR5 per-cell table、旧 posthoc result 或逐行 artifact 来构造 readiness；
11. 创建 candidate、选择 cell、修改 k7/threshold、提出 k8/第二 matcher；
12. 少一份/多一份产物、CHECKSUMS 漏项/多项/自列、输入或 parent object SHA 漂移；
13. validator import analyzer/GR5 模块、使用浮动 ref 或读取 analyzer output 当 expected；
14. REPORT 声称 k7 已验证、可泛化、可 promotion/freeze/hidden，或删 owner-decision 边界。

另加静态 AST 闸：两套实现的数据读取入口只允许 §6 明确路径；不得出现 `os.walk`、`glob`、`scandir`、
递归目录遍历、网络库、模型/API runner 或任何 dataset path 解引用。失败 stderr 必须单行净化，不能
回显注入路径、隐藏内容或 traceback。

## 10. 目标命令

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-k7-out-of-sample-validation-readiness/test_k7_out_of_sample_validation_readiness_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-k7-out-of-sample-validation-readiness/analyze_k7_out_of_sample_validation_readiness_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_k7_out_of_sample_validation_readiness_wave2.py
```

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行 GR5 或任何
更早任务命令、`pytest harness/` 整目录、scorer、runner、rescore、sweep、probe、模型或 hidden。

## 11. 回执与停止条件

回执必须给出：

- branch/worktree/commit/唯一 parent、相对 parent 的六个 `A` / 0 个 `M`、ancestry/tag/status；
- 六 changed paths 与 SHA、posthoc 五项与 CHECKSUMS 四项闭包；
- GR5 六对象与九份 metadata 的独立 SHA/self-consistency 核验；
- cohort matrix 的固定行数、每类 scientific/execution status、blocker codes；
- eligible/ready non-hidden count，hidden/new-wave requirement 与唯一结论句；
- hidden 六项 false、dataset path dereference 0、model_calls 0、cost 0；
- 负测 control/mutation rc 与三条目标命令原始结论；
- 测试后 HEAD/status/tag 与六文件 SHA 无漂移。

提交后立即停止并返回 owner。不得创建 GR7，不得读取任何 dataset 正文，不得执行验证，不得创建
candidate，不得选择配置，不得调整 k7/阈值，不得申请或消耗费用，不得 promotion、freeze、正式运行、
G0 或 hidden。
