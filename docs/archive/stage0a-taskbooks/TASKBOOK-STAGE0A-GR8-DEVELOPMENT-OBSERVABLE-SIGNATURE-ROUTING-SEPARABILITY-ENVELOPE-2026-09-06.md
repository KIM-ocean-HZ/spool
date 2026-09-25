# Claude Code 任务书 —— Stage 0-a development wave2 · GR8 observable-signature routing separability envelope

> **状态：COMPLETE — verdict `Accept`（2026-09-11）；归档，不再作为开工入口。**
>
> **验收提交：** `a4320c8428f94b304dcf097c7d55acd8e6eae6f8`；唯一 parent 为 accepted GR7
> `9b8a57e8ffde224b4bc25a2221ba18937884a9d5`。无 blocking finding；无 non-blocking finding。
>
> **后续任务书：** 无。GR8 授权已用尽，当前返回 owner decision；不得自动创建 GR9。
>
> **唯一交付：** 在不读取 hidden、不人工阅读正文、不调用模型、不产生费用、不创建 candidate verifier、
> 不保存任何 signature value 或成员表的前提下，机械判断：GR7 的 16 个 development gold-oracle
> all-green 格中，是否至少有一格可由一套**预先固定、只含机器可观测结构化字段**的等价类闭包覆盖其
> 全部 G1-required rows，同时仍通过冻结 G2/G3/G4；另行发布加入匿名 arm-count padding 后的更弱上界。
>
> **本任务不是 selector 交付。** gold 只在离线分析中标出 `U(c)` 以及含 `U(c)` 的 signature classes；
> 这些 class 的值、成员与映射一律不落盘。即使结果可行，也只说明 development 上存在 class-closure
> separability upper bound，⛔ 不等于已经提出可实现规则、识别可部署 selector、创建 candidate 或获得
> 样本外效力。
>
> **授权来源：** owner 于 2026-09-06 在 GR7 `Accept` 并返回 owner decision 后明确“批准新任务”。
> Codex 将这次授权收敛为本 development-only、零费用、单问题 GR8；不把它扩成新 signal / k8、
> matcher 或 threshold 修改、正文探索、dataset 扩展、hidden、模型/API、正式运行、promotion、freeze、
> G0 或 GR8 之后的任务。

## 1. 为什么是这一项

GR7 已证明：在固定 G2/G3/G4 下，知道 gold 的 routing 上界并非空集——G1–G3 envelope 可行
`48/256`，其中 G4 基线同时通过的格为 `16/256`，且 16 格全部位于 MU、k7-off。它没有回答：这些
oracle-required rows 在**现有机器结构化输出**上是否可分，还是会与大量不应新增 review 的 rows 落入
同一不可区分等价类。

直接提出 k8 或 candidate 会把“可分性是否存在”和“某条规则是否有效”混在一起。本任务先固定一个
低基数、无正文、无身份、无 arm 的 observable signature，并计算任何对相同 signature 必须一视同仁的
routing 所不可避免的 class-closure 代价。结果决定下一步是否值得请求一条预注册 selector hypothesis；
本任务本身不创建那条 hypothesis。

## 2. 唯一问题与完成定义

对 GR7 独立重建出的 target family：

```text
T_GR7 = { c : GR7.oracle_all_green_feasible(c) = true }
```

必须先机械确认 `|T_GR7|=16`、全部 `matcher=MU`、全部 `k7_selected=false`、全部原始 G4 pass；不得从
GR7 JSON 复制这 16 格的逐格值。

对每个 `c ∈ T_GR7`：

1. 直接重建 GR7 的 `N(c)`、mandatory `M`、false negatives `F` 与 `U(c)=F\(N(c)∪M)`；
2. 对每行仅从 §3 固定的机器可观测字段生成 `S(r)`；
3. 令 `Q(c)={S(u):u∈U(c)}`，再令 `K(c)={r:S(r)∈Q(c)}`；
4. 计算最小 class-closed 新增集合 `A(c)=K(c)\N(c)` 与不可避免 collision
   `E(c)=A(c)\U(c)`；
5. 以 `N_S(c)=N(c)∪K(c)` 逐格重算 G1/G2/G3，G4 必须与 GR7 原格完全相同；
6. 另以 `N_S(c)` 为 lower bound，沿 GR7 同一个 exact arm-count closure 求是否存在匿名 padding 使
   G2/G3 通过；该层必须明确标为 `signature_plus_anonymous_padding_upper_bound`，不得冒充 selector；
7. 发布 16 格的 aggregate 结果、class collision 代价、support 分布与 k=2 风险，但不保存任何
   signature value、成员、row identity、join key 或 positive-class lookup table。

完成定义：analyzer 与 independent validator 各自从钉死 source objects 直接重建两份器材、GR7 的
256 格与 7041-vector closure、16 格 target family、observable signature、class closure 与两层 gate；
两套 canonical JSON / REPORT 逐字节相同；真实负测能拒绝 signature 越界、class 漏扩、gold 泄漏、
伪造 gate、伪造结论与普通 REPORT 事实漂移。提交后立即返回 owner decision。

## 3. Observable signature 必须预先写死

### 3.1 唯一 signature 版本

signature 名称固定为：

```text
machine_observable_shape_v1
```

只在 MU accepted verifier 的逐行输出上构造；matcher 不是可变输入。先按 GR7 schema gate 区分
`complete` / `malformed`，任何 truthy/falsy 容错、缺字段默认为 0、字符串内容检查或异常吞掉都必须失败。

对 complete verdict，字段顺序固定为：

```text
(
  schema_shape = "complete",
  opening_bits = exact booleans (k1,k2,k3,k4,k5,k6,k7),
  outcome ∈ {pass, wrong, adverse, refused, malformed},
  pass,
  adverse,
  mandatory_blind_review,
  rubric_schema_complete,
  fabrication_suspected,
  trace_state ∈ {missing, ok, not_ok},
  bucket(len(components_required_hit)),
  bucket(len(components_required_missed)),
  bucket(len(components_optional_hit)),
  bucket(len(diagnostic_component_evidence)),
  bucket(len(wrong_actions_hit)),
  bucket(len(blocking_wrong_actions))
)
```

其中：

```text
bucket(n) = zero if n=0; one if n=1; two_plus if n>=2
```

对合法 malformed verdict，signature 固定为：

```text
(
  schema_shape = "malformed",
  opening_bits = exact booleans (k1,k2,k3,k4,k5,k6,k7),
  outcome = "malformed",
  pass,
  rubric_schema_complete,
  all_remaining_slots = "not_applicable"
)
```

不得根据本轮结果增加、删除、重排字段或改变 bucket 边界。analyzer 与 validator 必须各自包含一个、
且只有一个 canonical signature 函数；静态 AST gate 必须核函数参数、字段集合、顺序、bucket 常量与
禁止访问面。canonical AST digest 由两套实现各自重算并要求相同，不能从交付 JSON 读取 expected digest。

### 3.2 signature 绝对禁止项

`S(r)` 不得读取、派生、拼接、hash、比较或按条件间接访问：

- `gold_pass`、gold label、`U(c)` membership；
- arm、`carries_memory`、configuration id / mask；
- run id、episode id、blind id、row index、排序位置、join key、时间戳；
- answer / episode / trace 正文、rubric 文本、list 元素内容、wrong-action 字符串或模型标识；
- 文件路径、SHA、commit、随机数、环境变量或外部配置；
- hidden、网络、模型/API、数据库或 sibling worktree。

`opening_bits` 必须由 GR7 相同的 accepted primitives 与 accepted k7 formula 直接重算；不得从 GR7 JSON
复制。list-valued 字段只许取 `len()` 后过固定三桶，禁止读取元素或把原始长度直接当 signature 值。

### 3.3 class-closure 最小性

对任意必须满足以下条件的 routing function `g`：

```text
g(r) only depends on S(r)
for every u in U(c), g(u)=true
```

它必然对 `K(c)` 全部返回 true。因此 `A(c)=K(c)\N(c)` 是覆盖 `U(c)` 所需的唯一 set-inclusion
minimum class-closed additions。两套实现都必须机械验证：

- `U(c) ⊆ A(c)`；
- `N(c)` 没有删除；
- `K(c)` 对 signature equivalence class 闭合；
- 少任一个 positive class 都会留下至少一个 G1 unrouted FN；
- 加入任意不含 `U(c)` 的 class 不能替代 positive class；
- 不用 greedy、排序或配置间共享 membership 代替该定义。

注意：`Q(c)` 的值来自 development gold，因此它本身不是允许落盘或部署的 lookup table。只发布
`|Q(c)|`、class support / target / collision 的 aggregate 计数。

## 4. 两层 gate 语义

### 4.1 Layer A：signature-only class closure

```text
N_S(c) = N(c) ∪ K(c)
```

- G1：仍为 `unrouted_false_negatives == 0`；
- G2：`|N_S(c)| / 196 < 0.40 ⇔ |N_S(c)| ≤ 78`；
- G3：四个 arm 的 `N_S(c)` rate 之 `max-min ≤ 1/10`，用 exact rational；
- G4：逐格复制 matcher-fixed 事实而非值，必须与 GR7 原格相同且 pass；
- `signature_only_all_green=true` 当且仅当同一格四闸全过。

### 4.2 Layer B：signature + anonymous padding upper bound

只在不删除 `N_S(c)` 的前提下，使用 GR7 已验收的全局闭集：

```text
E = {x ∈ Z^4:
     0 ≤ x_a ≤ denominator_a,
     sum(x) ≤ 78,
     max_a(x_a/denominator_a) - min_a(x_a/denominator_a) ≤ 1/10}
```

令 `l^S_a(c)=|N_S(c)∩arm_a|`。存在 `x∈E` 且对全部 arm 有 `x_a≥l^S_a(c)` 时，Layer B 可行；
必须穷尽全部 7041 个 vector，求 minimum final total、minimum padding 与全部 minimum ties。匿名 padding
只给数学上界，不能编码内容、signature、row 或配置；不得写成 selector / implementation。

### 4.3 不可行原因闭集

每层原因必须分开：

```text
SIGNATURE_CLASS_COLLISION_EXCEEDS_G2_CAP
SIGNATURE_CLASS_CLOSURE_FAILS_G3
NO_EXACT_G3_PADDING_VECTOR_WITHIN_G2_CAP
POSITIVE_SIGNATURE_CLASS_HAS_SINGLETON_SUPPORT
```

singleton support 是 development overfit 风险标记，可与 gate 原因重叠；它本身不改变 gate 数值。G4 在
target family 中固定为 pass，不得伪造新的 G4 原因。不得把 Layer B 可行写成 Layer A 可行。

计数顺序固定：Layer A 分别发布 G2 与 G3 direct failure，二者允许重叠；Layer B 先判 `|N_S(c)|>78`，
命中时只沿用 `SIGNATURE_CLASS_COLLISION_EXCEEDS_G2_CAP`，否则才判
`NO_EXACT_G3_PADDING_VECTOR_WITHIN_G2_CAP`。singleton 原因与两层都正交，可重叠计数。

## 5. 起点、branch、worktree 与提交拓扑

- scientific parent：accepted GR7 `9b8a57e8ffde224b4bc25a2221ba18937884a9d5`
- branch：`stage0a-wave2-observable-signature-routing-separability-envelope-gr8`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-observable-signature-routing-separability-envelope-gr8`
- 2026-09-06 已核：branch 与 worktree 均不存在。执行时若任一已存在，立即停止；不删、不覆盖、不复用。
- 最终恰一笔 commit，唯一 parent 为 GR7。accepted GR6R1 是 metadata-only sibling，不在 ancestry；
  被退回 GR6 / GR3 与所有 Redo commit 同样不得进入 ancestry。
- 不从 sibling worktree 读文件，不用浮动 ref；accepted siblings 只按 full `commit:path` 读取 git object。

三条目标命令全绿后只提交一次，message 必须为：

```text
posthoc(stage0a): bound observable-signature routing separability (GR8)
```

## 6. 唯一允许的 changed paths

相对 GR7 必须恰六个新增路径、0 个已有文件修改：

```text
harness/verify_observable_signature_routing_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-observable-signature-routing-separability-envelope/analyze_observable_signature_routing_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-observable-signature-routing-separability-envelope/test_observable_signature_routing_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-observable-signature-routing-separability-envelope/OBSERVABLE-SIGNATURE-ROUTING-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-observable-signature-routing-separability-envelope/OBSERVABLE-SIGNATURE-ROUTING-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-observable-signature-routing-separability-envelope/CHECKSUMS-OBSERVABLE-SIGNATURE-ROUTING-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 目录必须恰五项；CHECKSUMS 只登记 analyzer、test、JSON、REPORT 四项且不自列。不得创建
`verify_stage0a_v120_*` candidate、signature lookup table、positive-class manifest、formula lock、第七件产物
或临时仓内文件。

## 7. 输入与 accepted-object 闭包

### 7.1 继承并独立重建 GR7 完整闭包

analyzer 与 validator 必须各自独立钉死并复核 GR7 的完整冻结闭包：

- 17 个 development 输入与五份上游 CHECKSUMS 反向注册；
- v1.20 freeze 两节；
- GR2A / GR2BR1 / GR2D 三个 accepted sibling 的 21 个对象；
- GR3R1、GR4、GR5 各六对象；
- MB 工作树 accepted v1.20 与 MU 按 GR2BR1 full `commit:path` 物化的不同 module / source SHA；
- 196 行、两轴 verdict schema、k1..k7、mandatory、pass/outcome 与冻结 G1–G4。

不得 import GR7 / GR5 / GR4 / GR3R1 analyzer、validator 或 tests；不得把任何前序 JSON / REPORT 当
expected document；不得从 GR7 configurations 复制 row 值、target membership 或 signature。

### 7.2 GR7 六对象

必须从 parent commit 与工作树两侧各自核 SHA：

| path | SHA-256 |
|---|---|
| `harness/verify_g1_oracle_routing_feasibility_envelope_wave2.py` | `9f2c7b2c3d5f8041fa1731d84680869271cff876a79e44fc965a54f61f3d3a1a` |
| `posthoc/stage0a-development-wave2-g1-oracle-routing-feasibility-envelope/analyze_g1_oracle_routing_feasibility_envelope_wave2.py` | `beac4263b0a6036471502ab52d754149c7ed2d58e98b71dd4449c94a50209ef3` |
| `posthoc/stage0a-development-wave2-g1-oracle-routing-feasibility-envelope/test_g1_oracle_routing_feasibility_envelope_wave2.py` | `18dfc5771ab781ad42e220660b289b095986430d323da586ec731cc985cd4a16` |
| `posthoc/stage0a-development-wave2-g1-oracle-routing-feasibility-envelope/G1-ORACLE-ROUTING-FEASIBILITY-ENVELOPE-stage0a-development-wave2.json` | `b2b9b57439f4ff73847e2370348fc0483f7a05c43c8c2d5bff078cdac12a6477` |
| `posthoc/stage0a-development-wave2-g1-oracle-routing-feasibility-envelope/G1-ORACLE-ROUTING-FEASIBILITY-ENVELOPE-REPORT-stage0a-development-wave2.md` | `f5dada42aa1bf6625d70ece7f068da49cd723d46f45cb7984584df7e4ada7dfa` |
| `posthoc/stage0a-development-wave2-g1-oracle-routing-feasibility-envelope/CHECKSUMS-G1-ORACLE-ROUTING-FEASIBILITY-ENVELOPE-stage0a-development-wave2.sha256` | `7484ca58d4cd6f9dee486110158ce585795b5ace8c4d1997621b02bd0fbcdebe` |

GR7 JSON 只作为 SHA 已钉死的 accepted object；本任务的 aggregate anchors 已写在 §8，运行时不得解析
GR7 JSON 取得 expected 逐格值。两套实现必须直接重建 expected document；validator 可以解析**本轮**
delivered JSON 以和独立 canonical document 比对。

## 8. 必须先闭合的 GR7 anchors

任何 signature 结果产生前，两套实现必须直接重现：

- 256 格、两轴各 128、bit order `k1..k7`、无缺格/重格；
- GR5 baseline all-green 0；G1/G2/G3/G4 passing `32/132/16/128`；
- GR7 exact vector closure：denominators `56/56/56/28`、G2 cap 78、G3 ratio `1/10`、vectors 7041；
- GR7 G1–G3 envelope feasible 48、oracle-all-green 16；
- MB feasible / all-green `32/0`，MU `16/16`；
- k7-off feasible / all-green `48/16`，k7-on `0/0`；
- required additions `0…40`、minimum final `55…76`、minimum padding `0…36`；
- infeasibility counts `176/32/128`；
- target family 恰 16 格，全部 MU、k7-off、G4 pass；
- routing 不改变 matcher-fixed fields 或 G4，k7 AST digest 仍等于 accepted GR5。

任一锚漂移必须在 observable signature 或结论产生前退出 2。

## 9. 必须发布的结果

JSON 必须按固定顺序保存 16 格 aggregate table。每格至少包含：

- configuration id、matcher、七位 mask；
- baseline needs_review、GR7 `|U(c)|` 与 GR7 minimum padding anchor；
- signature schema version、total signature classes、positive signature classes；
- positive-class support min/max、singleton-positive-class count、`all_positive_classes_support_ge_2`；
- class-closure additions `|A(c)|`、oracle-required `|U(c)|`、collision additions `|E(c)|`；
- class-closure final total与四 arm aggregate counts（过 k=2 后才发布）；
- Layer A 的 G1/G2/G3/G4 与 `signature_only_all_green`；
- Layer B 的 feasibility、minimum final、minimum padding、minimum tie count 与
  `signature_plus_padding_all_green_upper_bound`；
- 对应的闭集原因与 suppression status。

同时发布：

- 196 行 signature class 总数与全局单维 class-support distribution；
- 每格 pure-target / mixed / non-target class 数，以及 16 格上的单维 aggregate distribution；不得把它们
  和 arm / outcome 交叉，也不发布 signature value；
- 16 格 Layer A all-green 数与 Layer B upper-bound all-green 数；
- class collision additions 与 singleton-positive-class 的 min/max/distribution；
- G2 cap、G3 direct、G3 padding 三类 blocker 计数；
- 所有 ties 的 aggregate 数，不选 winner、不排序配置；
- oracle / signature-table / selector / candidate / configuration / threshold / hidden / model / cost /
  promotion / freeze / out-of-sample 边界声明。

绝对不得保存：signature tuple/value/digest、positive signature set、class member list、`U(c)` / `A(c)` /
`E(c)` 成员、row 顺序、id/hash、答案、episode、trace、rubric 文本、模型、绝对路径、arm-conditioned rule
或可回连 join key。

## 10. 唯一允许结论

按以下顺序选择最具体的一条：

若存在 `signature_only_all_green=true`：

> `machine-observable signature separability exists on development; no deployable or out-of-sample selector has been identified`

若 Layer A 全部失败，但存在 `signature_plus_padding_all_green_upper_bound=true`：

> `machine-observable signature closure still requires anonymous padding; no deployable selector is closed`

若两层都没有 all-green：

> `the fixed machine-observable signature cannot realize any GR7 oracle-all-green cell under the frozen gates`

结论始终附：

```text
development-only class-closure upper bound; no signature values, selector, candidate, configuration, out-of-sample, promotion, or freeze decision
```

REPORT 首行必须为：

```text
OBSERVABLE-SIGNATURE ROUTING SEPARABILITY ENVELOPE ONLY — development upper bound; no selector or candidate
```

末行必须为：

```text
GR8 COMPLETE — return to owner before any selector hypothesis, candidate, dataset expansion, or execution
```

## 11. 非识别、边界声明与静态闸

- `uses_gold_for_offline_class_labelling_only=true`
- `observable_signature_values_saved=false`
- `positive_signature_lookup_saved=false`
- `deployable_selector_identified=false`
- `selector_hypothesis_proposed=false`
- `new_routing_signal_proposed=false`
- `candidate_verifier_created=false`
- `repair_configuration_selected=false`
- `threshold_changed=false`
- `development_only=true`
- `out_of_sample_validity="underdetermined"`
- `hidden_touched=false`
- `model_calls=0`
- `cost_cny=0`
- `promotion_decision="not_made"`
- `freeze_decision="not_made"`

任一 per-arm class / addition / collision / padding vector 含 `0 < cell < 2` 时，整个交叉 block 降级为
`suppressed_for_non_identification`；solver 内部仍须精确验证，但被抑制数值不落盘。signature support
distribution 只允许全局单维 aggregate；不得和 configuration / arm / outcome 拼表。

analyzer / validator AST 必须拒绝动态 `eval/exec`、网络、模型 runner、递归目录遍历 / glob、hidden 路径、
随机选择、成员常量表、signature value 常量表、读取 list 元素、读取禁用字段或导入前序任务模块。
validator 不得写仓库；analyzer 只可在显式 `--generate` 下无覆盖地写本轮 JSON / REPORT / CHECKSUMS，
`--check-existing` 必须严格只读。固定目录的 `os.listdir` 只允许用于五产物闭包与 candidate-verifier 闸。

## 12. Independent validator 与真实负测

`harness/verify_observable_signature_routing_separability_envelope_wave2.py` 必须独立钉死 inputs、commits、
两器材装载、k1..k7、GR7 逆投影、signature schema、16 格 target、class closure、两层 gates、canonical
JSON / REPORT 与净化边界。不得 import analyzer / tests / 前序 task module，不得把 GR7 JSON、本轮 delivered
JSON 或 REPORT 当 expected document。

测试在 `TemporaryDirectory()` 复制五份 posthoc 产物并黑盒运行 validator；每条 mutation 前先跑
byte-identical control rc 0，再施加 mutation、重签 CHECKSUMS，确认 rc 2。至少覆盖：

1. signature 加入 gold、arm、configuration、row index、identity、正文、list element、原始长度或环境值；
2. signature 漏字段、换顺序、把 `two_plus` 改为 exact length、malformed fallback 漂移；
3. 保存 signature value / digest、positive lookup 或 class members；
4. `U(c)` 少一个 FN、混入 gold-fail、重复计 mandatory-only FN；
5. class closure 少扩一个同签名 row、多塞一个不同签名 row、删除 existing review；
6. 伪造 minimum-class-closure 证明、用 greedy / sorted first class 代替全闭包；
7. 16 格 target 少格/多格/换 matcher/打开 k7/让 G4 fail 进入；
8. GR7 256 格、7041 closure、axis / k7 分层、infeasibility anchor 漂移；
9. G2 cap 79 / denominator 漂移，G3 rounded float / adjacent-only / wrong denominator / threshold 漂移；
10. 把 Layer B padding 可行冒充 Layer A selector 可行，或伪造 minimum padding / ties；
11. 伪造 class count、support distribution、collision count、singleton risk 或 blocker count；
12. 发布 k<2 arm block、身份、正文、模型、绝对路径、hidden 路径或越界结论；
13. selector / hypothesis / signal / candidate / selected configuration / threshold / OOS / promotion / freeze
    任一边界从 false / underdetermined 漂移；
14. 少/多产物、CHECKSUMS 漏项/多项/自列、input / parent object SHA 漂移、浮动 ref；
15. REPORT 首尾、结论、owner-decision、普通事实行或 JSON key order / indent / trailing newline 漂移。

负测后五份工作树产物 SHA 必须与导入快照一致；stderr 必须单行净化，不回显待验值、路径、identity、
signature 或 traceback。

## 13. 目标命令

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-observable-signature-routing-separability-envelope/test_observable_signature_routing_separability_envelope_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-observable-signature-routing-separability-envelope/analyze_observable_signature_routing_separability_envelope_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_observable_signature_routing_separability_envelope_wave2.py
```

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行 GR7 或更早任务的
目标命令、`pytest harness/` 整目录、旧 sweep/rescore/probe、模型 runner、正式 development、样本外、
G0 或 hidden。

## 14. 回执与停止条件

回执必须给出：

- branch/worktree/commit/唯一 parent、相对 parent 六个 `A` / 0 个 `M`、ancestry/tag/status；
- 六 changed paths 与 SHA、posthoc 五项、CHECKSUMS 四项闭包；
- GR7 完整冻结输入、accepted objects 与六对象在 parent / 工作树两侧的 SHA 闭包；
- 两器材直接装载、GR7 256 格 / 7041 closure / 16 格 target 的机械逆投影；
- signature schema AST gate、class count、support distribution、positive/mixed classes 与禁止字段扫描；
- 16 格 `U/K/A/E` aggregate、Layer A / Layer B、collision / singleton / blocker 结果与唯一结论；
- k=2 suppression、泄漏扫描、负测 control/mutation rc 与三条目标命令原始结论；
- 测试后 HEAD/status/tag 与六文件 SHA 无漂移，无 `__pycache__`。

提交后立即停止并返回 owner。不得创建 selector hypothesis、candidate、k8、第二 matcher 或 GR9，不得选择
配置，不得改 matcher / threshold / gate，不得读正文、hidden 或样本外数据，不得调用模型、产生费用、
promotion、freeze、正式运行、G0、merge/tag/push。
