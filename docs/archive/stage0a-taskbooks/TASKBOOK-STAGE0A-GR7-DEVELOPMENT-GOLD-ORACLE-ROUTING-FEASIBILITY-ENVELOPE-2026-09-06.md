# Claude Code 任务书 —— Stage 0-a development wave2 · GR7 gold-oracle routing feasibility envelope

> **状态：COMPLETE — verdict `Accept`（2026-09-06）。**
>
> **后续：** 本任务书归档至
> `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR7-DEVELOPMENT-GOLD-ORACLE-ROUTING-FEASIBILITY-ENVELOPE-2026-09-06.md`；
> 当前无可执行实验任务，返回 owner decision。⛔ 不自动创建 GR8。
>
> **唯一交付：** 在不提出新 routing signal、不创建 candidate、不读取任何 hidden、不调用模型且不产生
> 费用的前提下，对 GR5 的固定 256 个 development 配置计算一个 gold-oracle routing 上界：每格先加入
> 闭合 G1 所必需的全部未路由 false negatives，再只按四个 arm 的匿名整数计数求是否存在最小额外 padding，
> 能同时保持冻结 G2 严格上限与 G3 exact spread；G4 必须保持不变。
>
> **本任务只回答：** 固定 scorer / matcher / mandatory / gate / threshold 下，routing-only repair 在数学上
> 是否还存在可行空间。oracle 使用 gold 只为了构造不可部署的上界，⛔ 不是可实现 selector、不是 hypothesis、
> 不是 candidate、不是配置选择，也不是样本外或产品结论。
>
> **授权来源：** owner 于 2026-09-06 在 GR6R1 `Accept` 并返回 owner decision 后明确
> “批准下发新任务”。Codex 将该授权收敛为本 development-only、零费用、单问题 GR7；不把它扩成
> hidden、内容级独立性审计、新 paid wave、模型调用、阈值修改、正式运行或 GR7 之后的任务。
>
> **为什么先做这一项：** GR5 已经完整发布 256 格、gate-vector、Pareto 与 k7 配对代价，重复 aggregate
> posthoc 没有信息增益；但它没有回答：k7 的失败究竟只是 selector 过宽，还是即使存在知道 gold 的完美
> routing oracle，在 G2/G3 固定约束下也没有任何 routing-only 解。本任务先给这个上界，再决定是否值得
> 请求新 signal / 正文探索 / matcher 或 protocol 权限。

## 1. 唯一问题与完成定义

对 GR5 封闭族的每个配置 `c = (matcher, k1..k7 mask)`：

1. 直接重建该格现有 `needs_review` 与冻结 `mandatory_blind_review`；
2. 找出为使 G1 的 `unrouted_false_negatives == 0` 必须新增 `needs_review=true` 的唯一集合 `U(c)`；
3. 在不删除任何既有 review、不改 mandatory、不改 pass / outcome / gold / G4 的前提下，判断加入
   `U(c)` 后是否已经通过 G2 / G3；
4. 若尚未通过 G3，只允许把其它尚未 `needs_review` 的行按 arm 匿名计数加入 padding `P(c)`，求是否存在
   `U(c) ∪ P(c)` 使 G2 与 G3 同时通过；
5. 若存在，给出最小 final `needs_review` 总数、最小 padding 数与全部最小 arm-count vector 的 aggregate
   计数；若不存在，给出精确不可行原因；
6. G4 必须逐格与 GR5 基线相同。只有 G4 原本通过且 oracle envelope 对 G1–G3 可行的格，才记为
   `oracle_all_green_feasible=true`。

完成定义：analyzer 与 independent validator 各自从钉死 source objects 直接重建 MB / MU、k1..k7、
256 格、`U(c)` 与 exact integer envelope；两套 canonical JSON / REPORT 逐字节相同；GR5 的 256 格与
已接受 anchors 全部逆投影闭合；产物不含逐行身份、正文、成员集合或可部署规则。无论结果为何，提交后
立即返回 owner decision。

## 2. 明确非目标与绝对红线

本任务不做：

- 不提出、命名、实现或试探 k8、k7 变体、第二 matcher、词表、regex、语义规则或任何新 hypothesis；
- 不创建 `verify_stage0a_v120_*` candidate，不修改 accepted v1.20 / GR2BR1 verifier；
- 不把 gold-oracle membership、arm padding vector 或任一配置变成运行时 selector；
- 不选择、推荐、排序第一名或 promotion 任一配置；ties 必须全部保留；
- 不删除既有 `needs_review`，不改变 mandatory、pass、outcome、wrong-action/component 字段、gold、rubric、
  gate、阈值、strict / inclusive 语义或四舍五入；
- 不人工打开或解释 episode / answer / trace / gold / rubric 正文；程序可按 GR5 相同冻结入口消费钉死
  development rows，但不得打印、保存、引用或 paraphrase 正文；
- 不读取 GR6 / GR6R1 readiness 产物作为科学输入，不做样本外、cohort readiness 或 validation execution；
- 不 open/stat/hash/glob/walk hidden 本体，不进入 `items/stage0a/parts/`，不运行 `build_stage0a.py`；
- 不联网、不安装依赖、不调用模型/API、不申请或消耗预算，不生成 approval；
- 不 merge、tag、fetch、pull、push，不修改实验主仓或任一 accepted commit；
- 不调用 subagent，不自动创建 GR8。

若 exact envelope 需要正文判断、结果后定义新规则、改阈值、扩大数据面或使用 hidden，立即停止并写
`Blocked`；不得为了得到可行解临场改变 oracle 定义。

## 3. Gold-oracle 与 exact envelope 必须预先写死

### 3.1 每格的集合定义

对同一 matcher 下的 196 行，令：

```text
N(c) = 当前 mask 的 selected openings OR 后得到 needs_review=true 的行
M    = frozen mandatory_blind_review=true 的行（不随配置变化）
F    = not machine_pass AND gold_pass 的 false-negative 行
U(c) = F \ (N(c) ∪ M)
```

`U(c)` 是闭合 G1 必须新增的唯一集合：少一行则 G1 仍红；加入非 `U(c)` 行不能替代其中任何一行。
oracle repair 的最终 `needs_review` 集合为：

```text
N'(c) = N(c) ∪ U(c) ∪ P(c)
```

其中 `P(c)` 只能从 `N(c) ∪ U(c)` 之外选择；它只用于在 G2 允许的总量内平衡 G3，不能改变 G1 的必需
集合，也不能读取或编码内容特征。`P(c)` 可与 `M` 重叠，因为真实 routing signal 也可能命中 mandatory
行；但这种 overlap 必须单列 aggregate 计数，不能被当作新增 G1 覆盖。

### 3.2 G2 与 G3 的 exact 约束

必须先从钉死 rows 机械确认 arm denominators 恰为：

```text
A0=56, A1=56, A2=56, A3=28; total=196
```

G2 沿用冻结 strict 语义：

```text
|N'(c)| / 196 < 0.40  ⇔  |N'(c)| ≤ 78
```

G3 不用 float/rounded percentage 判定。令 `x_a = |N'(c) ∩ arm_a|`，必须用 exact rational 比较：

```text
max_a(x_a / denominator_a) - min_a(x_a / denominator_a) ≤ 1/10
```

允许先独立生成全局有限闭集：

```text
E = {x ∈ Z^4:
     0 ≤ x_a ≤ denominator_a,
     sum(x) ≤ 78,
     max(x_a/denominator_a) - min(x_a/denominator_a) ≤ 1/10}
```

再对每格计算 lower bound `l_a(c)=|(N(c) ∪ U(c)) ∩ arm_a|`。可行当且仅当存在 `x ∈ E` 且
`x_a ≥ l_a(c)` 对四个 arm 全部成立。禁止用启发式、greedy 或单个候选 vector 代替 exhaustive exact
closure。

### 3.3 最优与 ties

若可行：

- `minimum_final_needs_review = min(sum(x))` over all feasible `x`；
- `minimum_padding = minimum_final_needs_review - |N(c) ∪ U(c)|`；
- 所有达到最小值的 arm-count vectors 都是 ties，不得 lexicographic 选一个；
- 只允许发布 vector 的 aggregate 形态，并先过 §9 的非识别闸。

若不可行，原因闭集只能来自：

```text
G2_CAP_EXCEEDED_BY_REQUIRED_ORACLE
NO_EXACT_G3_BALANCING_VECTOR_WITHIN_G2_CAP
G4_BASELINE_FAILS
```

`G4_BASELINE_FAILS` 不等于 G1–G3 envelope 不可行；两层必须分别发布。

### 3.4 Oracle 边界声明

JSON / REPORT 必须明确：

- `uses_gold_for_oracle_only=true`
- `deployable_selector_identified=false`
- `new_routing_hypothesis_proposed=false`
- `candidate_verifier_created=false`
- `repair_configuration_selected=false`
- `threshold_changed=false`
- `routing_only_upper_bound=true`
- `development_only=true`
- `out_of_sample_validity="underdetermined"`
- `hidden_touched=false`
- `model_calls=0`
- `cost_cny=0`
- `promotion_decision="not_made"`
- `freeze_decision="not_made"`

任何把 oracle 称为 signal、selector、candidate、repair implementation、validation 或 generalization 的输出
都必须失败。

## 4. 起点、branch、worktree 与提交拓扑

- scientific parent：accepted GR5 `f94898367e8e5238b54ad3a7de43bf829bc0c9cb`
- branch：`stage0a-wave2-g1-oracle-routing-feasibility-envelope-gr7`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-g1-oracle-routing-feasibility-envelope-gr7`
- 2026-09-06 已核：branch 与 worktree 均不存在。执行时若任一已存在，立即停止；不删、不覆盖、不复用。
- 最终恰一笔 commit，唯一 parent 为 GR5。accepted GR6R1 `847fbf83…` 是 metadata-only sibling，不在
  ancestry，也不是本轮输入；被退回 GR6 `a76a2c6…` 与所有 Redo commit 同样不得进入 ancestry。
- GR2A / GR2BR1 / GR2CR1 / GR2D 仍只可按 GR5 的 full `commit:path` 规则作为钉死输入或锚，不得合入。
- 不从 sibling worktree 读文件，不用浮动 ref；只按完整 commit SHA 读 git object。

三条目标命令全绿后只提交一次，message 必须为：

```text
posthoc(stage0a): bound gold-oracle routing feasibility (GR7)
```

## 5. 唯一允许的 changed paths

相对 GR5 必须恰六个新增路径、0 个已有文件修改：

```text
harness/verify_g1_oracle_routing_feasibility_envelope_wave2.py
posthoc/stage0a-development-wave2-g1-oracle-routing-feasibility-envelope/analyze_g1_oracle_routing_feasibility_envelope_wave2.py
posthoc/stage0a-development-wave2-g1-oracle-routing-feasibility-envelope/test_g1_oracle_routing_feasibility_envelope_wave2.py
posthoc/stage0a-development-wave2-g1-oracle-routing-feasibility-envelope/G1-ORACLE-ROUTING-FEASIBILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-g1-oracle-routing-feasibility-envelope/G1-ORACLE-ROUTING-FEASIBILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-g1-oracle-routing-feasibility-envelope/CHECKSUMS-G1-ORACLE-ROUTING-FEASIBILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 目录必须恰五项；CHECKSUMS 只登记 analyzer、test、JSON、REPORT 四项且不自列。不得创建 oracle
membership、row list、candidate、formula lock、review packet、第七件产物或临时仓内文件。

## 6. 输入与 accepted-object 闭包

### 6.1 GR5 科学输入闭包

analyzer 与 validator 必须各自独立复核 GR5 任务书 §6 的完整冻结闭包：17 个 development 输入、五份
上游 CHECKSUMS、v1.20 freeze 两节、三个 accepted sibling 的 21 个 objects、GR3R1 六对象与 GR4
六对象；不得缩成只读 GR5 JSON。

两套实现必须和 GR5 相同地直接装载：

- MB：工作树 accepted v1.20 base matcher / pass / outcome；
- MU：GR2BR1 full SHA 物化出的 accepted UQ matcher / pass / outcome；
- 两条轴各自直接运行 196 行并重算 k1..k7、mandatory、pass/outcome 与 gates；
- 不从 GR5 configurations 复制 row 值、oracle membership 或 expected document。

### 6.2 GR5 六对象

必须从 parent commit 与工作树两侧各自核 SHA：

| path | SHA-256 |
|---|---|
| `harness/verify_k7_complete_component_evidence_absence_feasibility_wave2.py` | `da5bc2e9746ae3d91d43cb675cf954f417520713c0a26d2e7d06e32a5b1a0172` |
| `posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/analyze_k7_complete_component_evidence_absence_feasibility_wave2.py` | `6c7f5595bdf65e7b037d19609902ac63712c64cddffbb9e716fca96db191fa36` |
| `posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/test_k7_complete_component_evidence_absence_feasibility_wave2.py` | `314d9a7cccd9aca26e57c5a58eebabb4db2dd06a05676b7526854989d7acd652` |
| `posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/K7-COMPLETE-COMPONENT-EVIDENCE-ABSENCE-FEASIBILITY-stage0a-development-wave2.json` | `41759ff8fa2e5d51370a7d7cbdd4e46e51847ce7221baea0ecc3d9b9aba6564b` |
| `posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/K7-COMPLETE-COMPONENT-EVIDENCE-ABSENCE-FEASIBILITY-REPORT-stage0a-development-wave2.md` | `4d500a61f807d674390528b76e5337ddebef717101cbe49adc4d4a3c413d4d9e` |
| `posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/CHECKSUMS-K7-COMPLETE-COMPONENT-EVIDENCE-ABSENCE-FEASIBILITY-stage0a-development-wave2.sha256` | `7d2d3d8ee160871592401beff0d85f97ea813092e63568551c4a6d8409d6bdc8` |

GR5 JSON 的完整 256 格只可作为 accepted aggregate anchor：本轮直接重建的每格 matcher、mask、review
counts、arm counts、G1–G4、safety 与 violation quadruple 必须逐项相同。不得把它或 GR5 REPORT 当作
本轮 oracle expected document；validator 也不得 import GR5 analyzer / validator / test。

### 6.3 必须先闭合的 GR5 anchors

任何 oracle 计算前，两套实现必须直接重现：

- 256 格、两轴各 128、bit order `k1..k7`、无缺格/重格；
- all-green 0；G1/G2/G3/G4 passing cells `32/132/16/128`；
- gate-vector 闭集与计数：`0000×44, 0001×48, 0100×60, 0101×56, 0110×8, 0111×8,
  1000×16, 1001×16`；
- k7-off 128 格逆投影锚与 GR5 accepted quadruples；
- G4 在 MB 全部 fail、MU 全部 pass，且 routing bit 不改变 G4；
- arm denominators `56/56/56/28` 与 total 196。

任一锚漂移必须在 oracle 结论产生前退出 2。

## 7. 必须发布的结果

JSON 必须保存固定顺序的 256 格 aggregate table，每格至少包含：

- matcher、七位 mask、原始 `needs_review` 总数、原始 G1-unrouted、原始 G2/G3/G4；
- `required_oracle_additions_total=|U(c)|`；
- required-only final total、G1/G2/G3 状态；
- envelope feasibility、minimum final total、minimum padding、最小 vector tie 数；
- oracle G1/G2/G3/G4、`oracle_all_green_feasible`；
- 不可行原因闭集与 suppression 状态。

不得保存 `U(c)` / `P(c)` 成员、row 顺序、id/hash、答案、题目、trace、模型、绝对路径或可回连 join key。

同时发布：

- 全局与 MB/MU 分轴的 envelope-feasible / oracle-all-green 配置数；
- k7-on / k7-off 分层计数；
- minimum / maximum required oracle additions、minimum final review 与 padding 的 exact aggregates；
- G2-cap-exceeded、G3-balance-infeasible、G4-baseline-fail 的计数，原因可重叠时明确计数规则；
- 所有达到全局最小 violation / review 的配置只作 aggregate ties，不能选 winner；
- oracle conclusion 与下一步 owner-decision 分支。

## 8. 唯一允许结论

若存在 `oracle_all_green_feasible=true` 的格：

> `routing-only mathematical feasibility exists under a development gold oracle; no deployable selector has been identified`

这只证明 fixed gates 下存在匿名选择上界；不得说 k7/某 signal 有效，不得创建 candidate。下一步仍需 owner
另行授权一个不读取 gold 的 selector hypothesis 形成任务。

若 envelope 对 G1–G3 有可行格但全部因 G4 基线失败：

> `the routing envelope can close G1–G3, but no fixed-matcher configuration reaches all four gates`

若连 G1–G3 envelope 都无可行格：

> `even a development gold oracle cannot close G1–G3 under the fixed G2/G3 constraints`

结论按上述顺序选择最具体的一条，并始终附：

```text
development-only upper bound; no selector, candidate, threshold, out-of-sample, promotion, or freeze decision
```

REPORT 首行必须为：

```text
G1 GOLD-ORACLE ROUTING FEASIBILITY ENVELOPE ONLY — development upper bound; no deployable selector or candidate
```

末行必须为：

```text
GR7 COMPLETE — return to owner before any new routing hypothesis, candidate, dataset expansion, or execution
```

## 9. 非识别与内容边界

- 程序内使用 gold 只构造 oracle upper bound；输出不得出现 gold label 的逐行映射或 membership；
- arm-count vector、required additions 与 padding 的交叉发布必须先过 `k=2`。任一非零增量格小于 2 时，
  整个 vector 降级为 `suppressed_for_non_identification`；solver 仍须内部精确验证，但不得输出小格；
- 允许发布总数、布尔可行性、最小总 review 与 tie count；这些不得与其它表拼出成员；
- 对 196 个 run id、episode id、derived join key、答案正文、模型标识、禁止 key 与绝对路径逐项扫描；
- stderr 必须单行净化，只报 finding class，不回显注入值、路径或 traceback；
- JSON / REPORT 不得含 hidden path 或 hidden SHA；本任务完全没有 hidden 输入。

## 10. Independent validator 与真实负测

`harness/verify_g1_oracle_routing_feasibility_envelope_wave2.py` 必须独立钉死输入、commits、MB/MU 装载、
k1..k7、GR5 逆投影、`U(c)`、全局 exact vector 闭集、256 格 envelope、canonical JSON / REPORT 与净化
边界。不得 import analyzer / tests / GR5 模块，不得把 GR5 JSON、交付 JSON 或 REPORT 当 expected document。

测试在 `TemporaryDirectory()` 复制五份 posthoc 产物并黑盒运行 validator；每条 mutation 前先跑
byte-identical control rc 0，再施加 mutation、重签 CHECKSUMS，确认 rc 2。至少覆盖：

1. `U(c)` 少一个 false negative、混入 gold-fail、把 mandatory-only FN 重复计入 required additions；
2. 删除既有 needs_review、把 padding 当 G1 coverage、让 oracle 改 pass/outcome/gold/G4；
3. G2 把 `<0.40` 错写成 `≤0.40`、允许 total 79、分母不是 196；
4. G3 用 rounded float、错误 arm denominator、`<10pp` 或 `>10pp`、只检查相邻 arm；
5. 用 greedy / 单 vector 冒充 exhaustive closure、漏 feasible vector、漏 ties、伪造 minimum padding；
6. 少一格、重复 mask、交换 bit order、k7-off / GR5 anchor 漂移；
7. 把 G4 fail 配置标 oracle-all-green，或让 routing 改变 G4；
8. 把 oracle 改写成 deployable selector / new hypothesis / candidate / selected configuration；
9. 注入 row identity、member list、正文、模型、绝对路径或发布 k<2 vector；
10. 少/多一件产物、CHECKSUMS 漏项/多项/自列、输入/parent object SHA 漂移；
11. validator import analyzer / GR5 module、使用浮动 ref、读取 delivered JSON/REPORT 当 expected；
12. REPORT 改普通事实行、结论、首尾边界或 owner-decision 文本；JSON key 顺序、缩进、末尾换行漂移。

另加静态 AST 闸：analyzer / validator 不得含新 signal 函数、动态 `eval`、网络/model runner、目录遍历、
hidden 路径、成员常量表或 dataset 路径的人工输出入口。负测后五份工作树产物 SHA 必须与导入快照一致。

## 11. 目标命令

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-g1-oracle-routing-feasibility-envelope/test_g1_oracle_routing_feasibility_envelope_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-g1-oracle-routing-feasibility-envelope/analyze_g1_oracle_routing_feasibility_envelope_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_g1_oracle_routing_feasibility_envelope_wave2.py
```

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行 GR5 / GR6R1 或
更早任务的目标命令、`pytest harness/` 整目录、旧 sweep/rescore/probe、模型 runner、正式 development、
样本外、G0 或 hidden。

## 12. 回执与停止条件

回执必须给出：

- branch/worktree/commit/唯一 parent、相对 parent 的六个 `A` / 0 个 `M`、ancestry/tag/status；
- 六 changed paths 与 SHA、posthoc 五项、CHECKSUMS 四项闭包；
- GR5 完整冻结输入与六对象在工作树 / parent object 两侧的 SHA 闭包；
- MB/MU 直接装载、256 格与 GR5 anchors 的机械逆投影；
- `U(c)` 定义、arm denominators、G2 integer cap 78、G3 exact rational 与 global vector closure 数；
- required-only、padding envelope、MB/MU、k7-on/off、infeasibility reason 与唯一结论；
- oracle / candidate / selector / threshold / hidden / model / cost / promotion / freeze 边界声明；
- k=2 suppression、泄漏扫描、负测 control/mutation rc 与三条目标命令原始结论；
- 测试后 HEAD/status/tag 与六文件 SHA 无漂移，无 `__pycache__`。

提交后立即停止并返回 owner。不得创建新 routing hypothesis、candidate、selector 或 GR8，不得选择配置，
不得改 matcher / threshold / gate，不得读正文、hidden 或样本外数据，不得调用模型、产生费用、promotion、
freeze、正式运行、G0、merge/tag/push。
