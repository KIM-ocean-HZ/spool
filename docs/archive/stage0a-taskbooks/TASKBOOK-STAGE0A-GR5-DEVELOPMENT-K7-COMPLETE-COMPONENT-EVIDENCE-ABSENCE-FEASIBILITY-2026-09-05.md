# Claude Code 任务书 —— Stage 0-a development wave2 · GR5 锁定 k7 可行性普查

> **状态：COMPLETE — Codex verdict `Accept`（2026-09-06）。**
>
> **accepted commit：** `f94898367e8e5238b54ad3a7de43bf829bc0c9cb`，唯一 parent 为 GR4
> `624055f9e41ff3e642744b3b351fa8dc1cac871d`。
>
> **后续：** 当前无 ACTIVE 任务书；返回 owner decision。不得自动创建 candidate、GR6、第二 matcher
> 或 k8，不得调整阈值，不得进入样本外、promotion / freeze、正式运行、G0 或 hidden。
>
> **唯一交付：** 在任何逐行结果产生前，锁定且只锁定一个 routing hypothesis
> `k7_complete_component_evidence_absence`；从钉死的 MB / MU 器材独立重建 196 条 development
> 证据，穷尽 `{MB,MU} × P({k1..k7})` 的 256 个配置，回答这个 k7 是否足以让封闭扩展族在
> development 上出现四闸全绿配置，以及它带来的完整路由与安全代价。
>
> **性质：** development-only、单假设、可证伪的 feasibility study。不是 candidate，不选 repair
> 配置，不改 verifier，不作 promotion / freeze / 正式运行结论。
>
> **授权来源：** owner 于 2026-09-05 在 GR4 `Accept` 后明确“批准下一任务”。Codex 将这次授权
> 收敛为一个最小 GR5；该授权只覆盖本文，不永久改变产品 / 研究节奏，也不授权 GR5 之后的任务。
>
> **为什么是这一项：** GR3R1 已证明 `{MB,MU} × P({k1..k6})` 的 128 格封闭机制族始终被 G1
> 阻断；GR4 又证明两轴各 4 条 zero-opening FN 是同一集合，accepted UQ matcher 在这 4 条上一格
> 未动，而它们在两轴都呈现“schema 与 trace 有效、required 全漏、其它已结构化证据全空”的同一
> 形状。GR4 的正文观察仍全为 `underdetermined`，因此本任务不再读正文、不试第二 matcher；只检验
> 由 accepted 结构化聚合直接预先锁定的一个 routing 假设。
>
> **前序必读：** 开工前完整读取 canonical handoff、GR4 归档任务书和 GR3R1 归档任务书：
>
> - `docs/CODEX-HANDOFF-STAGE0A-D2-REVIEW-2026-09-03.md`
> - `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR4-DEVELOPMENT-G1-ZERO-OPENING-FN-CHARACTERIZATION-2026-09-05.md`
> - `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR3R1-DEVELOPMENT-CLOSED-REPAIR-FAMILY-INVERSE-PROJECTION-CLOSURE-2026-09-05.md`
>
> 其中钉死输入 SHA、accepted sibling objects、隔离规则、净化要求与禁止项继续生效；本任务只新增
> 下述唯一 k7 和 256 格 feasibility 面。

## 1. 唯一问题、目标与完成定义

本任务只回答：

1. 预先锁定的 `k7_complete_component_evidence_absence` 在 MB / MU 两轴各命中多少 development 行，
   是否机械覆盖 GR4 的 4 条 zero-opening FN；
2. 把它作为第七个 routing opening 后，完整 256 格中是否出现同时通过冻结 G1 / G2 / G3 / G4 的
   配置；若没有，哪个 gate 继续构成结构阻断；
3. k7 的全局与增量代价是什么，包括 review load、arm spread、gold-pass / gold-fail 路由、既有
   opening overlap、mandatory overlap 与安全分类；
4. 结论在什么边界内成立：只限钉死 development wave2、两条 matcher 轴、七个固定 opening 与
   unchanged mandatory / gate definitions。

完成定义：analyzer 与独立 validator 各自从 source objects 直接重建 MB / MU、七个 opening、256 格、
G1–G4、safety classes 与 exact Pareto frontier；两套 canonical JSON / REPORT 逐字节相同；k7-off 的
128 格投影重现 GR3R1 accepted anchors；GR4 target coverage 由逐行谓词重算而非成员表；产物不含逐行
身份、正文或可回连 join key。结果无论正负，都只能返回 owner decision。

## 2. 明确非目标与绝对红线

本任务不做：

- 不创建 `verify_stage0a_v120_*` candidate verifier，不修改 accepted v1.20 verifier；
- 不选择 256 格中的某一格作为 candidate、推荐修复面或 promotion 对象；
- 不提出第二个 matcher、第八个 routing signal、k7 变体、词表、regex、例外或阈值；
- 不在见到逐行或聚合结果后增删、改名、放宽、收紧或重解释 k7；
- 不改 mandatory、pass、outcome、action hits、blocks-pass、suppression、rubric、gold、protocol、freeze
  或任一 gate / threshold；
- 不做新的人工语义复核，不再次打开 GR4 union 正文，不读取 episode / gold / M1 的自由文本用于解释；
- 不访问 hidden，不做 G0、正式 development run、模型/API 调用、联网、费用或新 approval；
- 不 merge、tag、fetch、pull、push，不修改实验主仓或任一 accepted commit；
- 不调用 subagent，不自动创建 GR6。

如果锁定公式无法仅靠既有结构化 verdict 字段机械计算，或完成需要扩大上述任一边界，立即停止并写
`Blocked`；不得临场换一个“更好”的 k7。

## 3. k7 在开工前锁定

### 3.1 唯一名称与精确公式

- signal id：`k7`
- canonical name：`complete_component_evidence_absence`
- 稳定全名：`k7_complete_component_evidence_absence`

对某一 matcher 器材产生的同一行 `verdict`，k7 必须逐项等价于：

```python
def k7_complete_component_evidence_absence(verdict):
    return (
        verdict["pass"] is False
        and verdict["rubric_schema_complete"] is True
        and verdict["trace"] is not None
        and verdict["trace"]["ok"] is True
        and len(verdict["components_required_hit"]) == 0
        and len(verdict["components_required_missed"]) > 0
        and len(verdict["components_optional_hit"]) == 0
        and len(verdict["diagnostic_component_evidence"]) == 0
        and len(verdict["wrong_actions_hit"]) == 0
        and len(verdict["blocking_wrong_actions"]) == 0
        and verdict["fabrication_suspected"] is False
    )
```

必须先验证字段存在、类型正确，再计算；不得用 truthy/falsy 容错掩盖 schema 漂移。公式的 11 个合取
条件缺一不可，不得加入任何条件。

### 3.2 允许与禁止的数据依赖

k7 只允许读取上式列出的既有 machine verdict 字段。它明确不得读取：

- gold / adjudication / M1 label；
- arm、model、run / blind / episode id、row index、hash、文件路径；
- raw answer、episode prompt、rubric 文本、trace 文本或任意 token / substring；
- `needs_review`、`mandatory_blind_review`、k1..k6 的布尔结果、target membership；
- matcher 名称或当前配置 bitmask。

同一公式分别作用于 MB 和 MU 各自产生的 verdict；不得用一条轴算出的 k7 复制到另一轴。

### 3.3 预注册推论与证伪条件

GR4 accepted 聚合机械蕴含：其 MB / MU 各 4 条 zero-opening target 都满足本公式，所以两套实现各自
重建时，`target_count=4` 且 `k7_hit_on_target=4` 是输入闭包锚，而不是待调参数。任一轴不满足即说明
器材、target 或 k7 重建发生漂移，任务必须失败；不得改公式去追结果。

这个假设由同一 development wave2 的 4 条 target 聚合产生，也在同一 development wave2 上评估，
因此必须显式标记 `in_sample_hypothesis=true` 与 `overfit_risk="high"`。GR5 只能回答封闭族内部的
development feasibility，不能把命中这 4 条解释成独立验证、泛化证据或样本外效果。

除此之外不预设 k7 的全体命中数、false-positive 代价、arm 分布、passing cells、all-green cells 或
Pareto frontier。这些都必须由 196 行直接计算。

### 3.4 防止结果后调义

analyzer 与 validator 源码都必须各自包含同一显式公式和 canonical name；测试用 AST / 源码结构闸
逐项证明没有动态规则、外部配置、成员常量表或环境变量能改变公式。JSON / REPORT 必须记录公式的
canonical AST digest 或等价的稳定规范化 digest，并明确：

- `signal_locked_before_evaluation=true`
- `signal_definition_changed_after_evaluation=false`
- `single_new_routing_hypothesis=true`
- `evidence_origin="accepted_GR4_structured_aggregate_only"`
- `manual_content_observation_used=false`
- `in_sample_hypothesis=true`
- `overfit_risk="high"`

不得新增单独的 hypothesis-lock 文件；本文就是 owner/Codex 的预先锁定面。

## 4. 起点、branch、worktree 与提交拓扑

- parent：accepted GR4 `624055f9e41ff3e642744b3b351fa8dc1cac871d`
- branch：`stage0a-wave2-k7-complete-component-evidence-absence-feasibility-gr5`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-k7-complete-component-evidence-absence-feasibility-gr5`
- 2026-09-05 已核：branch 与 worktree 均不存在。执行时若任一已存在，立即停止；不删、不覆盖、
  不复用、不猜测。
- 最终恰一笔 commit，唯一 parent 为 GR4。GR3、GR2B、GR2C、GR1、GR1R1 等 Redo 提交不得进入
  ancestry；GR2A / GR2BR1 / GR2CR1 / GR2D 仍只作 full `commit:path` 钉死输入或锚，不得合入。
- 不从 sibling worktree 读文件，不用浮动 ref；只允许由完整 commit SHA 读取 git object，并物化到
  `TemporaryDirectory()`。

三条目标命令全绿后只提交一次，message 必须为：

```text
posthoc(stage0a): evaluate locked k7 routing feasibility (GR5)
```

## 5. 唯一允许的 changed paths

相对 GR4 必须恰六个新增路径、0 个已有文件修改：

```text
harness/verify_k7_complete_component_evidence_absence_feasibility_wave2.py
posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/analyze_k7_complete_component_evidence_absence_feasibility_wave2.py
posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/test_k7_complete_component_evidence_absence_feasibility_wave2.py
posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/K7-COMPLETE-COMPONENT-EVIDENCE-ABSENCE-FEASIBILITY-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/K7-COMPLETE-COMPONENT-EVIDENCE-ABSENCE-FEASIBILITY-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/CHECKSUMS-K7-COMPLETE-COMPONENT-EVIDENCE-ABSENCE-FEASIBILITY-stage0a-development-wave2.sha256
```

posthoc 目录必须恰五项；CHECKSUMS 只登记 analyzer、test、JSON、REPORT 四项且不自列。不得创建
candidate verifier、review packet、逐行清单、formula lock、第七件产物或临时仓内文件。原 v1.20、
GR2A、GR2BR1、GR2CR1、GR2D、GR3R1、GR4 与所有冻结件必须逐字节不变。

## 6. 输入与 accepted object 闭包

### 6.1 继续钉死的完整闭包

analyzer 与 validator 必须各自独立复核：

1. GR4 / GR3R1 任务书列出的 17 个 development 输入路径与 SHA-256；
2. 五份上游 CHECKSUMS 的注册内容与 v1.20 freeze 注册；
3. accepted GR2A / GR2BR1 / GR2D 三个 sibling 的 21 个 object 与三份 sibling CHECKSUMS；
4. GR3R1 六对象及其 CHECKSUMS；
5. 下表所列 GR4 六对象，以及 parent tree 中工作树副本逐字节未改。

GR4 六对象：

| path | SHA-256 |
|---|---|
| `harness/verify_g1_zero_opening_fn_characterization_wave2.py` | `05cf1a10654b74e8cd9a461be569ee412adde064786ec7d470da846fb8472c7b` |
| `posthoc/stage0a-development-wave2-g1-zero-opening-fn-characterization/analyze_g1_zero_opening_fn_characterization_wave2.py` | `75afb9dd789ba5a71884d946dc0f030f36ede111f18ff0158fcafcd0a9a4ff8a` |
| `posthoc/stage0a-development-wave2-g1-zero-opening-fn-characterization/test_g1_zero_opening_fn_characterization_wave2.py` | `6a63957c9ccf43082fbe54da14d9b378c1cba2c7bebf22260c88622ca871aa9c` |
| `posthoc/stage0a-development-wave2-g1-zero-opening-fn-characterization/G1-ZERO-OPENING-FN-CHARACTERIZATION-stage0a-development-wave2.json` | `75689ee299b355859e6ad0eafd1fb8f4d79772cd2bd5022725ba04cf848cccae` |
| `posthoc/stage0a-development-wave2-g1-zero-opening-fn-characterization/G1-ZERO-OPENING-FN-CHARACTERIZATION-REPORT-stage0a-development-wave2.md` | `528be488634b2f37bceee2ff78a40242682328b7a6d036fdfd5bf6e6739c0b09` |
| `posthoc/stage0a-development-wave2-g1-zero-opening-fn-characterization/CHECKSUMS-G1-ZERO-OPENING-FN-CHARACTERIZATION-stage0a-development-wave2.sha256` | `13b005e1c48837e2b690dca7e704c0052311bfa168712c347c81cf2249866b26` |

validator 不得 import analyzer、GR4、GR3R1 或 sibling 模块，也不得从其 Python 源读取常量/helper。
GR4 / GR3R1 JSON 与 REPORT 只能作为 SHA 钉住的 accepted evidence objects，不能提供逐行 membership、
预期 256 格或 canonical expected document。

### 6.2 两条器材轴必须直接运行

- `MB`：工作树中的 accepted v1.20 base matcher / pass / outcome；
- `MU`：从 GR2BR1 full commit SHA 的 verifier source 物化出的 accepted UQ matcher / pass / outcome；
- 同一 196 行分别喂给两份隔离模块；module object、source path、identity 与 source SHA 均须证明不同；
- 两套实现分别直接计算 score verdict 与 k1..k7，不从 M1、GR3R1 或 GR4 复制逐行值；
- MB 对冻结 M1 的 pass / outcome / needs_review / mandatory mismatch 仍须为 0；M1 只作冻结对照，不改写。

## 7. 256 格封闭扩展族

### 7.1 配置宇宙

必须恰为：

```text
{MB, MU} × P({k1,k2,k3,k4,k5,k6,k7}) = 256
```

- bit 位序固定为 `k1,k2,k3,k4,k5,k6,k7`，0000000 与 1111111 都必须存在；
- `needs_review = OR(selected openings)`；空 mask 恒为 false；
- G1 的 routed 仍按冻结定义组合 `needs_review` 与 unchanged `mandatory_blind_review`；
- 选择 mask 只影响 routing，不得影响 pass、outcome、adverse、component hits、wrong-action hits、
  blockers 或 mandatory；
- k1..k6 必须按 GR3R1 的公式由各轴器材原语重新计算；k7 只按 §3 公式重新计算；
- 不允许按 arm、gold、target 或结果对某格应用例外。

### 7.2 k7-off 逆投影锚

删除每个配置的 k7 位并只保留 `k7=0` 的 128 格，必须机械重现 GR3R1 的封闭族：

- 配置数 128，all-green 0；
- G1 / G2 / G3 / G4 passing cells 分别为 `0 / 104 / 16 / 64`；
- safety classes 为 `120 unsafe_tradeoff / 4 safe_improvement / 4 no_effect`；
- exact Pareto frontier 为 40；
- 两轴 `min_G1_unrouted=4`，zero-opening FN 各 4；
- accepted quadruple 仍为 MB-111111 `(4,4,85/14,1)`、MB-111011 `(4,0,85/14,1)`、
  MU-111111 `(4,18,135/14,0)`、MU-111011 `(4,13,130/7,0)`。

这些锚必须来自本任务的直接重建。不得读取 GR3R1 cells 后补一列 k7，也不得用固定布尔或固定计数
替代计算。任一锚漂移，必须在生成 k7-on 结论前退出 2。

### 7.3 k7 paired comparison

对每个 matcher 与每个相同的六位 mask，形成 `k7=0` / `k7=1` 配对，共 128 对。每对必须证明：

- pass / outcome / adverse / mandatory 与全部 component / wrong-action 字段逐行不变；
- 只允许 needs_review、由其派生的 routing 与 G1–G3 结果变化；G4 不得因 bit 变化；
- 记录 k7 新增路由数、与既有 routing overlap、mandatory overlap、G1 新增覆盖和四 arm 增量；
- 不保存新增路由成员或顺序。

## 8. 必须重建和发布的结果

### 8.1 k7 全体与 GR4 target 证书

两套实现分别输出 MB / MU 的：

- k7 总命中数、mandatory overlap、k1..k6 full-mask overlap、相对 full-mask 的 incremental hits；
- 按 arm、machine pass/outcome、gold pass/fail 的一维边际；
- `gold-pass ∧ machine-fail`、`gold-fail ∧ machine-pass`、adverse / harm 相关计数；
- GR4 zero-opening target count=4、k7 hit=4、miss=0；两轴 target relationship 仍为 identical；
- MB → MU 的 k7 命中总数、增量数和 target coverage 差异。

arm 与字段交叉表继续先过 `k=2`：任一非零格小于 2，整表只记
`suppressed_for_non_identification`，不得落格数。允许发布预先列明的一维边际与全局计数；不允许组合
出可唯一识别 target 成员的表。

### 8.2 256 cells、gates 与 Pareto

JSON 必须保存固定顺序的完整 256 格 aggregate table；每格至少包含 matcher、七位 mask、review
count/rate、四 arm review counts/rates、G1 numerator/denominator/coverage/unrouted、G2、G3 spread、G4、
四闸布尔、hard-gates 布尔与 safety classification。不得含逐行数据。

同时机械给出：

- 256 格总数、各 gate passing cells、all-green count 与 all-green 配置的 aggregate rows；
- 按 matcher 分轴的 min/max、每个 gate 的 exact best achievable value 与 achieving-cell count；
- k7-on / k7-off 各自的 gate pass counts；
- exact Pareto frontier，dominance 方向与 tie 规则必须与 GR3R1 一致；
- 每个 G1-unrouted 值的格数、最小 G1-unrouted 及达到最小值的配置数；
- 所有 all-green 格若存在，只能列 aggregate configuration，不得称为 selected / recommended / candidate。

G1–G4 的公式、阈值、四舍五入与 strict / inclusive 语义全部沿用冻结 v1.20；报告不得重新解释阈值。

### 8.3 唯一允许的结论

若 `all_green_count == 0`：

> `locked k7 is insufficient to close G1–G4 within the 256-cell development-only family`

并机械列出仍阻断的 gate 与 exact best achievable value。

若 `all_green_count > 0`：

> `at least one aggregate configuration is development-feasible within the locked 256-cell family`

但必须紧接：`no configuration selected; out-of-sample validity and promotion remain underdetermined`。

两种结果都不得写“已修复”“可 promotion”“应冻结”“可进 hidden”“选某格做 candidate”，也不得根据
结果修改 k7。REPORT 首行必须为：

```text
K7 DEVELOPMENT FEASIBILITY ONLY — one locked routing hypothesis; no candidate, promotion, or freeze decision
```

末行必须为：

```text
GR5 COMPLETE — return to owner before creating any candidate verifier or further hypothesis
```

顶层至少明确：

- `new_routing_signal_proposed=true`
- `new_routing_signal_count=1`
- `locked_signal_id="k7"`
- `locked_signal_name="complete_component_evidence_absence"`
- `candidate_verifier_created=false`
- `repair_configuration_selected=false`
- `second_matcher_proposed=false`
- `threshold_changed=false`
- `hidden_touched=false`
- `promotion_decision="not_made"`
- `out_of_sample_validity="underdetermined"`
- `in_sample_hypothesis=true`
- `overfit_risk="high"`

## 9. 身份、正文与净化边界

- 程序为直接运行冻结 scorer 可在进程内消费已钉死 196 行的 raw answer / episode / trace；不得打印、
  保存、引用、paraphrase 或暴露它们；
- 本任务没有人工正文入口、sealed union 入口或语义分类器。任何为“理解命中原因”而读取正文都越权；
- JSON / REPORT 不得含 run / blind / episode id、row index/hash/pseudonym、model identity、答案、题目、
  rubric 文本、trace 文本、数字摘录、绝对路径、derived join key 或成员顺序；
- 对 196 个 run id、episode id、derived join key、答案正文、模型标识和任务书列出的禁止 key 做逐项扫描；
  命中必须失败且 stderr 只给单行净化错误，不回显值；
- 不得通过 singleton cross-tab、排序、稳定哈希或多表拼接间接恢复 GR4 的四个成员。

## 10. 独立 validator 与真实负测

`harness/verify_k7_complete_component_evidence_absence_feasibility_wave2.py` 必须独立钉死 inputs、commits、
source objects、两器材装载、k1..k7、target predicate、256 cells、G1–G4、safety、Pareto、canonical
JSON / REPORT 和净化边界。不得 import analyzer / tests / GR4 / GR3R1 / sibling module，不能把它们的
JSON / REPORT 或源码常量当 expected document。

测试在 `TemporaryDirectory()` 复制五份 posthoc 产物，必要时重签 CHECKSUMS，再黑盒运行 validator；
每条 mutation 前先跑 byte-identical control rc 0。至少覆盖：

1. 分别删掉、反转或放宽 k7 的 11 个合取条件；把 `> 0` 改为 `>= 0`；把 `is True/False` 退化为
   truthy/falsy；每项都必须被公式 digest、AST 闸或独立重建拒绝；
2. 向 k7 注入 gold、arm、model、id/hash、answer token、mandatory、needs_review、k1..k6 或 mask；
3. 把两轴 k7 共用、按 arm/位置 hardcode 命中、硬编码 GR4 四成员或把 target-hit=4 写成常量；
4. 少一格、重复一格、位序交换、漏 empty/full mask、用 AND 替代 selected-openings OR、增加 k8；
5. 让 k7 bit 改变 pass/outcome/action/mandatory/G4，或伪造 paired delta；
6. 破坏 k7-off 128 格逆投影、accepted quadruple、GR4 target coverage、全体 hit/overlap/增量、arm /
   gold 边际；
7. 伪造 G1/G2/G3/G4、all-green、best achievable、safety、Pareto、per-matcher 或 k7-on/off 聚合；
8. 发布 k<2 的交叉表，或用多表 / 排序 / 哈希泄露成员；
9. 注入身份、join key、正文、模型、绝对路径、禁止 key，stderr 仍须单行净化且 rc 2；
10. 新增 candidate verifier、第七件产物、第二 matcher / k8、CHECKSUMS 漏项/多项/自列、输入或
    accepted object SHA 漂移；
11. REPORT 选配置、推荐 candidate、宣称 promotion/freeze/hidden，删 boundary / owner-decision /
    `underdetermined` 或改首尾行；
12. validator import analyzer / GR4 / GR3R1，读取前序 JSON / REPORT 当 expected document，或使用浮动 ref。

另加静态 AST 闸：两套 k7 实现必须显式包含 11 个字段条件，且不存在 id/index/hash/token 常量表、动态
`eval`、配置驱动规则或 result-dependent branch。全部 mutation 后五份工作树产物 SHA 必须与测试导入
时快照一致。

## 11. 目标命令

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/test_k7_complete_component_evidence_absence_feasibility_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-k7-complete-component-evidence-absence-feasibility/analyze_k7_complete_component_evidence_absence_feasibility_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_k7_complete_component_evidence_absence_feasibility_wave2.py
```

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行 GR4 / GR3R1
或更早任务的目标命令、`pytest harness/` 整目录、旧 sweep/rescore/semantic probe、模型 runner、
正式 development、G0 或 hidden。

## 12. 回执与停止条件

回执必须给出：

- branch/worktree/commit/唯一 parent、相对 parent 的六个 `A` / 0 个 `M`、ancestry 与 tag/status；
- 六个 changed paths 与 SHA-256、posthoc 五项和 CHECKSUMS 四项闭包；
- 17 inputs、五份上游 CHECKSUMS、freeze、21 sibling objects、GR3R1 / GR4 各六对象的独立核验；
- 两套 MB/MU 装载与逐行重建入口、k7 formula digest、11 条 AST 闸与预注册声明；
- GR4 两轴 target count=4 / k7 hit=4、k7 全体命中/overlap/incremental 摘要；
- k7-off 128 格逆投影、完整 256 格、paired comparison、G1–G4、all-green、safety 与 Pareto 结论；
- k-anonymity 与净化扫描、负测 control/mutation rc、三条目标命令原始结论；
- 测试后 HEAD/status/tag 与六文件 SHA 无漂移。

提交后立即停止并返回 owner。不得创建 GR6，不得创建 candidate verifier，不得选择某格，不得提出
第二 matcher / k8，不得调整 k7、阈值或既有机制，不得 promotion、freeze、正式运行、G0 或 hidden。
