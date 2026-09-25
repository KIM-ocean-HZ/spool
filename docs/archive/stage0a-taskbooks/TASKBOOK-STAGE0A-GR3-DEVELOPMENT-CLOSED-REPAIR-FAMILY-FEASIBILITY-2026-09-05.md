# Claude Code 任务书 —— Stage 0-a development wave2 · GR3 封闭 repair family 可行性普查

> **状态：COMPLETE — Codex 验收 verdict：`Redo`。**
>
> **后续纠正任务书：**
> `docs/TASKBOOK-STAGE0A-GR3R1-DEVELOPMENT-CLOSED-REPAIR-FAMILY-INVERSE-PROJECTION-CLOSURE-2026-09-05.md`
>
> **验收 finding：** 提交 `33f0d6610eddde995f63e8ca41022d1428f683da` 的数值闭包与三条
> 目标命令均通过，但 GR2D 三重逆投影未由 enumerator / validator 机械重建；两边都把三个结果
> 直接写成 `True`，对应负测也只篡改待验 JSON 字段，无法发现这项计算缺失。因此本交付不进入
> accepted development evidence；只允许按 GR3R1 修正当前 GR3，不得跨阶段续派。
>
> **性质：** owner 在 GR2D 验收为 `Accept` 后明确“授权下一步任务”。本任务只对已经实现并接受的
> 两种 matcher 状态与六个既有 review-routing 口子做一个**封闭、穷尽、development-only** 的
> 机械可行性普查，回答现有机制族里是否存在四闸全绿配置，并给出可审计的不可能性或可行性证书。
>
> **不是：** 新 matcher / routing hypothesis、调参、阈值搜索、候选 verifier、repair surface
> 选定、promotion、freeze、正式运行、G0 或 hidden。
>
> **授权来源：** owner 于 2026-09-05 明确“授权下一步任务”。Codex 将授权收敛为本 GR3；它只
> 允许复用钉死的 development 闭包、按 git object 读取三个 accepted sibling，并新增本任务六个
> 诊断路径。它不授权在进程外读取或披露答案正文、不授权模型/API 调用、费用、hidden、修改既有 verifier、
> merge/tag/push 或自动创建 GR3 之后的任务。

## 1. 唯一问题与为什么现在做

已接受的 GR2D `073c109c95904c813a4cb2455760af67eb086f10` 已把两条单轨真实组合并闭合交互：

- GR2A routing-only 是相对 base 的 `safe_improvement`，但只让 G2 转绿；
- GR2BR1 UQ matcher 让 G4 转绿，却新增 32 个 hit，其中 true-added 3 / false-added 29，并使
  G2 / G3 恶化；
- GR2D 精确组合仍是 G1 / G2 / G3 红，且相对 base 为 `unsafe_tradeoff`；
- 两轨逐行 effect 不重叠，但 G3 因 arm 极值切换而不具边际可加性。

在发明第七个 routing 信号或第二个 matcher hypothesis 之前，先回答一个更小且可完全闭合的问题：

**只使用现有六个 routing 原语 `k1..k6`，并把 matcher 限定为 accepted base 或 accepted UQ 两种
状态时，全部 128 个全局配置中是否存在 G1–G4 同时通过的配置？若不存在，是哪条结构约束阻断？**

这是一个封闭机制族的可行性证明，不是 128 个候选实现。任务不得按结果追加配置、发明新谓词或
挑一个配置进入 verifier。

## 2. 起点、branch、worktree 与提交拓扑

- parent：GR1R2 `076a486bdaa111d6aa5654951e6890078afc3874`
- branch：`stage0a-wave2-closed-repair-family-feasibility-gr3`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-closed-repair-family-feasibility-gr3`
- 2026-09-05 已核：branch、worktree 与本任务书均未预先存在；若执行时发现 branch 或 worktree
  已存在，立即停止，不删除、不覆盖、不猜测可复用性。
- 最终交付 commit 的唯一 parent 必须恰为 GR1R2；GR2A、GR2BR1、GR2C/GR2CR1、GR2D、被退回
  GR2B、GR1/GR1R1、未接受 D2–D2R3 与其它实验均不得进入 ancestry。
- GR2A / GR2BR1 / GR2D 只可作为本地 git object 的钉死输入；不得 cherry-pick、merge、rebase，
  不得读取或遍历 sibling worktree，不得按浮动 branch/ref 取证。
- 不 fetch、pull、tag、push。

三条目标命令全绿后只提交一次，message 必须为：

```text
posthoc(stage0a): enumerate closed repair family feasibility (GR3)
```

## 3. 唯一允许的 changed paths

相对 GR1R2 必须恰六个新增路径，0 个已有文件修改：

```text
harness/verify_closed_repair_family_feasibility_wave2.py
posthoc/stage0a-development-wave2-closed-repair-family-feasibility/enumerate_closed_repair_family_feasibility_wave2.py
posthoc/stage0a-development-wave2-closed-repair-family-feasibility/test_closed_repair_family_feasibility_wave2.py
posthoc/stage0a-development-wave2-closed-repair-family-feasibility/CLOSED-REPAIR-FAMILY-FEASIBILITY-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-closed-repair-family-feasibility/CLOSED-REPAIR-FAMILY-FEASIBILITY-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-closed-repair-family-feasibility/CHECKSUMS-CLOSED-REPAIR-FAMILY-FEASIBILITY-stage0a-development-wave2.sha256
```

posthoc 目录必须恰五项；CHECKSUMS 只登记 enumerator、test、JSON、REPORT 四项且不得自列。
不得新增任何 `verify_stage0a_v120_*` candidate，不得复制、修改或覆盖 base / GR2A / GR2BR1 /
GR2D verifier，不得让正式 runner 导入任何 accepted candidate。原 verifier、accepted 产物、gold、
rubric、protocol、freeze、HASHES 与 runner 必须逐字节不变。

## 4. 钉死的 accepted 输入对象

三个 sibling commit 均须先验证存在、唯一 parent 为 GR1R2、相对 GR1R2 恰一笔提交 / 七个 `A` /
0 个 `M`，changed-path 集合与下表精确相同，21 个 object SHA 全部匹配。只能使用
`git cat-file -p <full-commit>:<exact-path>` 或等价的 full-commit object 读取；不得用 branch/ref。

### 4.1 GR2A routing-only

commit：`da0bd254edc267bbd3d4536fb751c6aabb8c39e0`

| path | SHA-256 |
|---|---|
| `harness/verify_stage0a_v120_review_routing_gr2a.py` | `fcea0ea3082185a91a2c14d38f945764d37b2e6bb5f21591566447bc4e515dbf` |
| `harness/verify_review_routing_repair_exploration_wave2.py` | `dde8ac74e9c7aded30f82d38410931ba7f01b556569c7053bab06fe7fd2b0658` |
| `posthoc/stage0a-development-wave2-review-routing-repair/explore_review_routing_repair_wave2.py` | `9fb052bcf3720bff900e7fcbd66d295fc9cf34ec33091a8dd936a4bb6f2448ff` |
| `posthoc/stage0a-development-wave2-review-routing-repair/test_review_routing_repair_wave2.py` | `f973d503b7781e12fa5d4a80608e8d3663aec951f9d969e00bb8280da27d2846` |
| `posthoc/stage0a-development-wave2-review-routing-repair/REVIEW-ROUTING-REPAIR-stage0a-development-wave2.json` | `3e19bbb867a493b6541f8d7eb5cf4f612a2469f714e135ae481e218dda85abab` |
| `posthoc/stage0a-development-wave2-review-routing-repair/REVIEW-ROUTING-REPAIR-REPORT-stage0a-development-wave2.md` | `e0033bd8a6484a84749b3c9558a2d122f5a528166c2433e3ced7570da9a0005e` |
| `posthoc/stage0a-development-wave2-review-routing-repair/CHECKSUMS-REVIEW-ROUTING-REPAIR-stage0a-development-wave2.sha256` | `181c0369251a33637676f98d66850905edc1a8cfe2b04f389d7b0f8eaad69917` |

### 4.2 GR2BR1 matcher-only

commit：`fae90ecfeed723748b80566b94d473cf25e45d0c`

| path | SHA-256 |
|---|---|
| `harness/verify_stage0a_v120_wrong_action_matcher_gr2b.py` | `a9d6fcaad174b43a2555c72daf449769183d2902a1827e5be40ba3058862bd65` |
| `harness/verify_wrong_action_matcher_repair_exploration_wave2.py` | `e5152963f08954b1f247481e39c04763c87c85290609ddfe09bd6dc94c9a1809` |
| `posthoc/stage0a-development-wave2-wrong-action-matcher-repair/explore_wrong_action_matcher_repair_wave2.py` | `87003b0cd565c878037037d513dde4c6c716caadea8e1f471718d11c19dcf1cb` |
| `posthoc/stage0a-development-wave2-wrong-action-matcher-repair/test_wrong_action_matcher_repair_wave2.py` | `6eef37fb133430b3770c99936704151ea037c89c48d760f27bd66efef7616467` |
| `posthoc/stage0a-development-wave2-wrong-action-matcher-repair/WRONG-ACTION-MATCHER-REPAIR-stage0a-development-wave2.json` | `4a9679a2cc149dfc6107f8e5411bdd376103cacb37f6c02a4b742b9405243c8f` |
| `posthoc/stage0a-development-wave2-wrong-action-matcher-repair/WRONG-ACTION-MATCHER-REPAIR-REPORT-stage0a-development-wave2.md` | `8deb05825ccf3e88784d7c1dbd69de30c4fb5a9510b5545d2015eeb1b8cff552` |
| `posthoc/stage0a-development-wave2-wrong-action-matcher-repair/CHECKSUMS-WRONG-ACTION-MATCHER-REPAIR-stage0a-development-wave2.sha256` | `8b443ac0ee0e40a20480422fd4e21f7d8f3e6608d900ac141531546b3b805666` |

### 4.3 GR2D combined direct experiment

commit：`073c109c95904c813a4cb2455760af67eb086f10`

| path | SHA-256 |
|---|---|
| `harness/verify_stage0a_v120_combined_repair_gr2d.py` | `31bf9f5ad3b4ecd4c41b38d4a25cc3eb999c6e7ce6b3510f0c364e2c9ad59a99` |
| `harness/verify_combined_repair_experiment_wave2.py` | `c1b9f01eb66e6ad928c6a6056db24c8966b49fc4a1fb0deba21210cc584854fa` |
| `posthoc/stage0a-development-wave2-combined-repair-experiment/analyze_combined_repair_experiment_wave2.py` | `7592e9f123858e56a3b1cf142b133108b23c3725c6428555df8b2d89207f9181` |
| `posthoc/stage0a-development-wave2-combined-repair-experiment/test_combined_repair_experiment_wave2.py` | `736cdebec6d8200c51e7fd71fce5279f5eb8bed775a08303f22e8830cdfb28dc` |
| `posthoc/stage0a-development-wave2-combined-repair-experiment/COMBINED-REPAIR-EXPERIMENT-stage0a-development-wave2.json` | `63e02f0d898fd1d404923b18afa5c634fbebe94a26ebe477a0f23a83523c81df` |
| `posthoc/stage0a-development-wave2-combined-repair-experiment/COMBINED-REPAIR-EXPERIMENT-REPORT-stage0a-development-wave2.md` | `a0ed9b356c607667c4e2c02f873198520bcac029786d288e825bddeac23044dd` |
| `posthoc/stage0a-development-wave2-combined-repair-experiment/CHECKSUMS-COMBINED-REPAIR-EXPERIMENT-stage0a-development-wave2.sha256` | `338594125f2f8bfa30bfdacb3ee50b9651df070f340029b68893335192f72b6e` |

三个 CHECKSUMS 必须各自恰登记本轨 enumerator/analyzer、test、JSON、REPORT 四项并闭合，不得自列。
accepted source 只在 `TemporaryDirectory()` 中物化；不得修改 git object 或 sibling worktree。

## 5. development 数据闭包与执行隔离

只允许使用 GR2D 任务书 §5 已钉死的同一闭包与 SHA：wave2 `rows.jsonl`、由其 196 个 `run_id`
精确构造且由 CHECKSUMS 登记的 196 份 trace、development episodes、U1 adjudicated gold、M1 labels、
D1 / D2R4 / GR1R2 产物、v1.20 / v1.19 / `verify2.py`、v1.20 freeze HASHES，以及上节三个 accepted
commit 的钉死对象。enumerator 与 validator 必须各自持有完整 expected SHA 常量并逐项核验；不得从
待验 JSON、REPORT 或另一个程序导入 expected。

不得遍历或 glob `raw/`；只能先读钉死 rows，再按恰好 196 个 run id 构造 trace 路径。禁止
`raw_outputs/`、其它 raw run、未登记 trace 与 hidden；不得 list/stat/hash/read hidden。

答案、trace、episode、gold 与 M1 正文只可在进程内参与机械重算；不得写入源码、测试名、JSON、
REPORT、stdout/stderr 或异常。不得输出 run/blind/episode id、模型、逐行 arm、答案摘要、join key、
绝对路径或时间戳。gold 只用于离线 gate 计算，绝不能进入任一 verifier 运行时。

base、GR2A、GR2BR1、GR2D 四份器材必须在隔离模块命名空间中运行；每次运行前后清理本任务加载的
模块与 `sys.path`。不得 import accepted analyzer / validator / test 作为计算 helper。

## 6. 封闭配置宇宙：恰好 128 个

matcher 轴只有两格：

- `MB=base`：accepted v1.20 的 matcher / pass / outcome；
- `MU=accepted_uq`：accepted GR2BR1 的 matcher / pass / outcome。

routing 轴只有六个既有布尔原语的全部子集：

- `k1=partial_component_evidence`
- `k2=complete_components_missing_trace`
- `k3=wrong_and_harm_capable`
- `k4=trailing_hedge_refusal`
- `k5=multi_required_diagnostic_question`
- `k6=unknown_wrong_action_type`

每个 matcher 语境都须从该器材的判据原语逐行独立重算 `k1..k6`。对每个六位 mask，唯一 routing
定义为 `needs_review = OR(mask 中选中的 k)`；空 mask 为恒 false，全 mask 为 OR(k1..k6)。不得改变
`mandatory_blind_review`，不得新增第七个信号、否定项、arm/model/identity/gold 条件、阈值、权重、
顺序、例外或逐行定点选择。

配置全集必须是 `{MB,MU} × P({k1..k6})`，恰 `2 × 64 = 128`，一次性由固定顺序生成。配置 id 使用
不含身份的稳定形式，例如 `MB-R-101011`；不得按结果增删或重新编号。`M1` 专指既有冻结 machine
labels，不得拿来命名 matcher 轴。

四个 accepted direct-run 锚必须先逐行与对应配置相等：

| accepted track | matcher | routing mask |
|---|---|---|
| base | MB | `111111` |
| GR2A | MB | `111011`（k4=0）|
| GR2BR1 | MU | `111111` |
| GR2D | MU | `111011`（k4=0）|

mask 位顺序固定为 `k1,k2,k3,k4,k5,k6`。四锚任一逐行不等、gate/四元组不复现或 accepted source
不满足 GR2D 已接受的三重逆投影时立即停止；不得继续输出 128 格。

## 7. 每个配置必须机械计算的内容

每格必须从 196 行直接计算并进入 JSON：

- matcher、六位 routing mask、选中与删除的 opening 列表；
- `needs_review` 总数及四 arm 精确分子/分母；
- G1 的 FN denominator、routed、unrouted、exact coverage 与 pass；
- G2 exact numerator/rate/threshold/pass；
- G3 四 arm exact rate、max/min arm、exact spread/threshold/pass；
- G4 false-positive count/threshold/pass；
- exact violation quadruple `(G1_unrouted, G2_excess_over_78, G3_excess_pp,
  G4_false_positives)`；
- 相对 accepted base 的 exact delta 与封闭安全分类；
- 相对同 matcher 全 mask 的 changed-row 聚合；
- 四闸同时通过布尔值。

显示值不得代替整数 / `Fraction` 判定。G2 严格 `< 0.40`，所以最大 passing numerator 是 78；G3
严格按四个 arm rate 的 `max-min ≤ 10pp`；safety 与 dominance 严格按 exact violation quadruple。

## 8. 必须输出的全局证书

JSON 必须保存按配置 id 排序的完整 128 格；REPORT 至少给出以下聚合与可审计证书：

1. `configurations_evaluated=128`、matcher 两格各 64、mask 无缺失/重复，及唯一 review-vector、
   gate-vector、violation-quadruple 的数量。
2. 四个 accepted anchor 的完整 gate / confusion / quadruple 复现；不得信 GR2D 自报。
3. 全体与每个 matcher 轴的 all-green 数量、G1/G2/G3/G4 passing 数量、安全分类数量。
4. exact violation quadruple 的全局 Pareto frontier；并列配置必须全列，不得按主观偏好挑一个。
5. 对每个 matcher 轴，独立构造 **G1 不可能性证书**：在 full mask 下仍为 FN、mandatory=false、
   `k1..k6` 全 false 的行数；若该数大于 0，则证明该 matcher 下任何 routing 子集都不可能通过 G1。
   只输出聚合计数，不输出成员。
6. 对每个 matcher 轴报告 `min_G1_unrouted_over_all_masks`；在达到该最小值的配置中，再报告最小
   G2/G3 违约量与对应的全部 mask。不得把词典序第一个 mask 冒充推荐。
7. matcher 对 G4 的结构作用：routing mask 不得改变 pass/outcome/G4；MB 与 MU 的 G4 读数分别由
   直接器材结果固定。若任一 mask 改变同 matcher 的 pass/outcome/action hits，硬失败。
8. `closed_family_sufficient` 仅在至少一个配置四闸全绿时为 true；若为 false，只能得出“现有封闭
   机制族不足”，不得推断新信号应长什么样。

已知 accepted 锚必须复现：base `(4,4,85/14,1)`、GR2A `(4,0,85/14,1)`、GR2BR1
`(4,18,135/14,0)`、GR2D `(4,13,130/7,0)`。这些只是 anchor，不是其它 124 格的预期答案。

无论普查结果如何，下列内容继续为 `underdetermined`：第七个 routing 信号、其它 matcher
hypothesis、任何新规则的 false-positive / false-negative 代价、29 个 false-added 的真实复核代价、
其它 wave / 样本外、hidden、最终 repair surface、promotion、freeze 与正式运行表现。

## 9. 独立 validator 与真实负测

`harness/verify_closed_repair_family_feasibility_wave2.py` 不得 import enumerator，也不得读取其
常量/helper/expected document；必须自己钉死 commits、21 个 accepted object SHA、development 输入
SHA、六个 opening 定义、128 格生成规则、四个 direct anchors、gate/quadruple/safety/dominance 与
证据边界。

validator 必须独立运行四器材、重建完整 128 格、构造完整 canonical JSON 与 canonical REPORT，
然后做严格结构相等、canonical JSON 序列化字节相等与 REPORT 字节相等。mismatch 只回报 canonical
侧的稳定字段路径；额外键折叠为 `<unexpected-key>`，REPORT 只报行号。不得回显 expected/actual
值、未预期键名、正文、identity、模型、绝对路径或 traceback。

测试必须在 `TemporaryDirectory()` 中复制五份 posthoc 产物，必要时同步重签 CHECKSUMS，再黑盒
运行独立 validator。每条负测先跑 byte-identical 控制组 rc 0，至少覆盖：

- 128 格漏一格、重复一格、增加第 129 格、mask 位序交换或 matcher 轴少一格；
- 把 routing 从 OR 改成 AND、加入否定项/第七个信号，或让 mask 改变 pass/outcome/action hits；
- 用 branch/ref、错误 commit/parent/path/SHA 读取任一 accepted source，或读取 sibling worktree；
- 伪造四个 direct anchor 的逐行等值、gate、quadruple 或 GR2D 三重逆投影；
- 伪造任一格 G1–G4、exact rate、quadruple、delta、safety、all-green 或 dominance；
- 删除 full-mask zero-opening FN，伪造 G1 不可能性证书、minimum 或 Pareto frontier；
- 把某个配置写成“推荐/已选定/promotion/freeze-ready/可进入 hidden”，或删除任一
  `underdetermined` / boundary / owner-decision 项；
- 新增 candidate verifier、额外产物、CHECKSUMS 漏项/多项/自列、输入或产物 SHA 漂移；
- 在 JSON key/value、REPORT、截断 JSON 或路径中注入 identity、答案、模型 token 或绝对路径，
  stderr 仍须单行、净化并退出 2。

全部 mutation 后，工作树五份 posthoc 产物 SHA 必须与测试 import 时快照一致。

## 10. 报告边界、目标命令与停止条件

报告首行必须为：

```text
CLOSED REPAIR FAMILY FEASIBILITY ONLY — no candidate, promotion, or freeze decision
```

报告末行必须为：

```text
GR3 COMPLETE — return to owner before inventing any new repair signal
```

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-closed-repair-family-feasibility/test_closed_repair_family_feasibility_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-closed-repair-family-feasibility/enumerate_closed_repair_family_feasibility_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_closed_repair_family_feasibility_wave2.py
```

默认 Python 无 pytest 时可用机器已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行旧任务的
目标命令、`pytest harness/` 整目录、旧 sweep/rescore/semantic probe、模型 runner、正式
development、G0 或 hidden。

回执必须给出：branch/worktree/commit/唯一 parent、六个 changed paths、21 个 accepted object SHA、
完整输入闭包、四器材隔离与四锚逐行复现、128 格闭包、每轴/all-green/pass/safety 计数、G1
不可能性证书、minimum、Pareto frontier、独立 validator 闭包、负测逐类退出码、五份产物 SHA 与
三条目标命令原始结论。

提交后立即停止并返回 owner。不得创建 candidate verifier，不得修改任一 accepted verifier，不得
选定新信号、开始正文探索、promotion、freeze、正式运行、G0 或 hidden，不得自动创建后续任务。
