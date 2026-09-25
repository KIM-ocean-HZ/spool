# Claude Code 任务书 —— Stage 0-a development wave2 · GR9 exact-count signature separability envelope

> **状态：COMPLETE — verdict `Accept`（2026-09-11）；归档，不再作为开工入口。**
>
> **验收提交：** `48b9f720958fc409419d7c823c607192f6c57925`；唯一 parent 为 accepted GR8
> `a4320c8428f94b304dcf097c7d55acd8e6eae6f8`。无 blocking finding；无 non-blocking finding。
>
> **后续任务书：** 无。GR9 授权已用尽，当前返回 owner decision；不得自动创建 GR10。
>
> **唯一交付：** 在不读取 hidden、不人工阅读正文、不调用模型、不产生费用、不创建 candidate verifier、
> 不保存 exact-count signature value 或成员表的前提下，把 GR8 固定 signature 的六个列表计数从
> `zero / one / two_plus` 唯一地细化为**精确非负整数长度**，机械判断这一组既有机器字段的
> content-blind 最大计数细化，能否在 GR7 的 16 个 development gold-oracle all-green 格中至少实现一格；
> 另行发布加入匿名 arm-count padding 后的更弱上界。
>
> **这里的“最大”只限于 GR8 已固定的同一组字段，且列表只可取长度。** 本任务不增加字段、不读取列表
> 元素、不搜索 bucket / threshold / 字段组合、不提出 selector hypothesis，也不把 exact count 当成可部署
> 特征。若连该 exact-count ceiling 的 Layer B 都不可行，才允许用单调性结论排除其所有确定性粗化；若
> 可行，只能说 development separability 上界存在，不能据此选规则或创建 candidate。
>
> **授权来源：** owner 于 2026-09-11 在 GR8 `Accept`、归档与私有远端备份收口后明确“创建下一任务”。
> Codex 将这句收敛为本 development-only、零费用、单问题 GR9；它只授权这一套替代 signature 的离线
> 上界分析，不开放正文探索、新字段、selector / candidate、threshold、dataset 扩展、样本外、hidden、
> 模型/API、费用、正式运行、promotion、freeze、G0 或 GR9 之后的任务。

## 1. 为什么是这一项

GR8 已接受的结论不是“机器字段都不可分”，而是更窄的：固定 `machine_observable_shape_v1` 把六个列表
长度压成 `0 / 1 / 2+` 后，196 行只形成 34 个等价类；覆盖每格全部 G1-required rows 时不可避免带入
42 行 collision，使 16 格的 `|N_S(c)|=82…88`，全部越过 G2 上限 78，Layer A / B 均为 `0/16`。

下一步若直接试若干 bucket、字段组合或 selector，会把可分性、特征搜索与 candidate 选择混在一起。
本任务只考察一个预先固定的上界：保留 GR8 的全部非列表槽位，把同六个列表的长度完整保留。它是所有
只对这组 exact tuple 再做确定性分桶/粗化的 signature 中最细的分区。因此：

- 若该分区连匿名 padding 上界也失败，则任何更粗的确定性分桶只会合并 class、扩大 required closure，
  不能恢复可行性；
- 若该分区可行，只说明值得另行向 owner 请求一个预注册、可部署且隐私可接受的 hypothesis；本轮仍不
  选择 bucket、阈值、字段、配置或 selector。

## 2. 唯一问题、目标与非目标

### 2.1 唯一问题

对 GR7 独立重建出的 target family：

```text
T_GR7 = { c : GR7.oracle_all_green_feasible(c) = true }
```

必须先机械确认 `|T_GR7|=16`、全部 `matcher=MU`、全部 `k7_selected=false`、全部原始 G4 pass；不得从
GR7 或 GR8 JSON 复制逐格值。

对每个 `c ∈ T_GR7`：

1. 直接重建 GR7 的 `N(c)`、mandatory `M`、false negatives `F` 与 `U(c)=F\(N(c)∪M)`；
2. 对每行仅用 §3 的 `S_exact(r)`，并由纯投影 `P(S_exact(r))` 重建 GR8 的 `S_bucket(r)`；
3. 令 `Q_exact(c)={S_exact(u):u∈U(c)}`，`K_exact(c)={r:S_exact(r)∈Q_exact(c)}`；
4. 计算 `A_exact(c)=K_exact(c)\N(c)` 与 collision `E_exact(c)=A_exact(c)\U(c)`；
5. 以 `N_exact(c)=N(c)∪K_exact(c)` 重算 G1/G2/G3；G4 必须与 GR7 原格相同；
6. 以 `N_exact(c)` 为 lower bound，沿 GR7 的 7041-vector exact closure 判断匿名 padding 上界；
7. 发布 aggregate class / collision / gate / refinement 结果与 k=2 风险，但不保存任何 exact tuple、成员、
   row identity、join key 或 positive-class lookup。

### 2.2 完成定义

analyzer 与 independent validator 各自从钉死 source objects 直接重建两份器材、GR7 的 256 格与
7041-vector closure、16 格 target family、GR8 bucket-signature anchors、exact-count refinement、class
closure、两层 gate 与单调性证书。两套 canonical JSON / REPORT 必须逐字节相同；真实负测必须拒绝
字段/长度越界、非精确计数、投影漂移、class 漏扩、伪造 gate、泄漏、伪造结论与普通 REPORT 事实漂移。
三条目标命令全绿并提交唯一一笔 commit 后立即返回 owner decision。

### 2.3 非目标

本任务不做：

- bucket / cap / threshold sweep，字段增删、交互项、特征选择或按结果挑 signature；
- selector hypothesis、routing rule、candidate verifier、k8、第二 matcher 或配置选择；
- 读取 list 元素、wrong-action 字符串、answer / episode / trace / rubric 正文或逐行身份；
- validation / out-of-sample / hidden / G0、模型调用、费用、promotion、freeze 或正式执行；
- 修改任一 accepted commit、冻结件、matcher、routing/component、threshold、gold、rubric 或 runner。

## 3. 两个 signature 与唯一允许关系

### 3.1 exact-count ceiling

新 signature 名称固定为：

```text
machine_observable_exact_count_shape_v1
```

它只在 MU accepted verifier 的逐行输出上构造；matcher 不是变量。必须先按 GR7 schema gate 区分
`complete` / `malformed`。任何 truthy/falsy 容错、缺字段默认为 0、字符串内容检查、异常吞掉、负长度、
浮点长度或非 `list` 值都必须失败。

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
  len(components_required_hit) as exact nonnegative integer,
  len(components_required_missed) as exact nonnegative integer,
  len(components_optional_hit) as exact nonnegative integer,
  len(diagnostic_component_evidence) as exact nonnegative integer,
  len(wrong_actions_hit) as exact nonnegative integer,
  len(blocking_wrong_actions) as exact nonnegative integer
)
```

对合法 malformed verdict，signature 与 GR8 完全相同：

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

不得根据本轮结果增加、删除、重排槽位，或把任一列表的元素、集合内容、hash、首尾项、字符串长度、
distinct count 等替代 `len(list)`。analyzer 与 validator 必须各自只含一个 canonical exact-signature
函数；静态 AST gate 必须钉死参数、字段集合、顺序、类型检查与禁止访问面。两套实现各自重算 canonical
AST digest 并要求相同，但 digest 不写进交付物。

### 3.2 GR8 bucket 投影

只允许一个无数据依赖的投影：

```text
P(S_exact):
  each of the six exact lengths n -> zero if n=0; one if n=1; two_plus if n>=2
  every other slot -> byte-for-byte unchanged
```

`S_bucket(r)=P(S_exact(r))` 必须重现 `machine_observable_shape_v1`。不得另写一套可漂移的 row reader，
不得从 GR8 JSON / REPORT 复制 signature、class 或 target membership。两套实现必须验证：

- 196 行的 projected bucket classes、support distribution 与全部 GR8 aggregate anchors 完全重现；
- `S_exact(r1)=S_exact(r2) ⇒ S_bucket(r1)=S_bucket(r2)` 对全部行成立；
- 每个 exact class 完整嵌套于唯一 bucket class，所有 exact classes 的 support 和为 196；
- 对每个 target cell，`K_exact(c) ⊆ K_bucket(c)`，因此 exact closure 不会比 GR8 closure更大；
- 不把 `P` 反向当成 exact tuple 恢复器，不构造或保存 bucket→exact lookup。

### 3.3 绝对禁止项

`S_exact` 与 `P` 都不得读取、派生、拼接、hash、比较或按条件间接访问：

- `gold_pass`、gold label、`U(c)` membership；
- arm、`carries_memory`、configuration id / mask；
- run id、episode id、blind id、row index、排序位置、join key、时间戳；
- answer / episode / trace 正文、rubric 文本、任一 list 元素、wrong-action 字符串或模型标识；
- 文件路径、SHA、commit、随机数、环境变量或外部配置；
- hidden、网络、模型/API、数据库或 sibling worktree。

`opening_bits` 必须由 GR7 相同的 accepted primitives 与 accepted k7 formula 直接重算。exact lengths 只可
在内存中作为 tuple 槽位和等价类 key；不得在 JSON、REPORT、CHECKSUMS、stderr 或测试名中回显其值。

## 4. Class closure、两层 gate 与单调性证书

### 4.1 exact class closure

对任意 routing function `g`，若：

```text
g(r) only depends on S_exact(r)
for every u in U(c), g(u)=true
```

则它必然对 `K_exact(c)` 全部返回 true。因此 `A_exact(c)` 是覆盖 `U(c)` 的唯一 set-inclusion minimum
exact-class-closed additions。两套实现必须机械验证：

- `U(c) ⊆ A_exact(c)`，且 `N(c)` 没有删除；
- `K_exact(c)` 对 exact equivalence class 闭合；
- 少任一个 positive exact class 都留下至少一个 G1 unrouted FN；
- 加入任意不含 `U(c)` 的 class 不能替代 positive class；
- 不用 greedy、排序、tuple 大小或跨配置共享 membership 代替定义。

`Q_exact(c)` 来自 development gold，因此不是可部署 lookup；只发布 class 数、support、target 与
collision 的 aggregate。

### 4.2 Layer A：exact-count signature only

```text
N_exact(c) = N(c) ∪ K_exact(c)
```

- G1：`unrouted_false_negatives == 0`；
- G2：`|N_exact(c)| / 196 < 0.40 ⇔ |N_exact(c)| ≤ 78`；
- G3：四个 arm 的 `N_exact(c)` rate 之 `max-min ≤ 1/10`，只用 exact rational；
- G4：matcher-fixed，必须与 GR7 原格相同且 pass；
- `exact_signature_only_all_green=true` 当且仅当同一格四闸全过。

### 4.3 Layer B：exact-count signature + anonymous padding upper bound

只在不删除 `N_exact(c)` 的前提下使用 GR7 已验收闭集：

```text
E = {x ∈ Z^4:
     0 ≤ x_a ≤ denominator_a,
     sum(x) ≤ 78,
     max_a(x_a/denominator_a) - min_a(x_a/denominator_a) ≤ 1/10}
```

令 `l^exact_a(c)=|N_exact(c)∩arm_a|`。存在 `x∈E` 且全部 `x_a≥l^exact_a(c)` 时 Layer B 可行；
必须穷尽 7041 个 vector，求 minimum final total、minimum padding 与全部 minimum ties。匿名 padding
只能作为数学上界，不能编码内容、signature、row 或配置。

### 4.4 单调性证书

对任一只由 `S_exact` 经确定性函数 `h` 得到的粗化 `S_h=h(S_exact)`，覆盖同一 `U(c)` 的 class closure
满足 `K_exact(c) ⊆ K_h(c)`，所以其四个 arm lower bounds componentwise 不小于 exact closure。两套实现
必须对实际 GR8 投影逐格验证该包含关系，并以集合/整数定义生成同一份固定证明文字，不靠结果后写结论。

只有当 16 格的 Layer B 全部不可行时，REPORT 才可写：

```text
all deterministic coarsenings of the same fixed-field exact tuple are also infeasible for these 16 target cells
```

若任一格 Layer B 可行，不得作该全称结论，也不得搜索哪个粗化可能实现它。

### 4.5 原因闭集

```text
EXACT_COUNT_CLASS_COLLISION_EXCEEDS_G2_CAP
EXACT_COUNT_CLASS_CLOSURE_FAILS_G3
NO_EXACT_G3_PADDING_VECTOR_WITHIN_G2_CAP
POSITIVE_EXACT_COUNT_CLASS_HAS_SINGLETON_SUPPORT
```

Layer A 分别发布 G2 与 G3 direct failure，允许重叠。Layer B 先判 `|N_exact(c)|>78`，命中时只沿用
G2 原因，否则才判无 padding vector。singleton 是正交 development overfit 风险，不改变 gate 数值。
G4 在 target family 中固定 pass，不得新增 G4 原因。

## 5. 起点、branch、worktree 与提交拓扑

- scientific parent：accepted GR8 `a4320c8428f94b304dcf097c7d55acd8e6eae6f8`
- branch：`stage0a-wave2-exact-count-signature-separability-envelope-gr9`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-exact-count-signature-separability-envelope-gr9`
- 2026-09-11 已核：branch 与 worktree 均不存在。执行时若任一已存在，立即停止；不删、不覆盖、不复用。
- 最终恰一笔 commit，唯一 parent 为 GR8；所有被退回 commit 与 accepted siblings 均不得额外进入 ancestry。
- 不从 sibling worktree 读文件，不用浮动 ref；历史输入只按 full `commit:path` 读取 git object。

三条目标命令全绿后只提交一次，message 必须为：

```text
posthoc(stage0a): bound exact-count signature separability (GR9)
```

不得 merge、tag、push、fetch 或 pull。

## 6. 唯一允许的 changed paths

相对 GR8 必须恰六个新增路径、0 个已有文件修改：

```text
harness/verify_exact_count_signature_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/analyze_exact_count_signature_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/test_exact_count_signature_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/EXACT-COUNT-SIGNATURE-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/EXACT-COUNT-SIGNATURE-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/CHECKSUMS-EXACT-COUNT-SIGNATURE-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 目录必须恰五项；CHECKSUMS 只登记 analyzer、test、JSON、REPORT 四项且不自列。不得创建
formula lock、signature table、positive-class manifest、第七件产物或仓内临时文件。

## 7. 输入与 accepted-object 闭包

### 7.1 继承并独立重建 GR8 完整闭包

analyzer 与 validator 必须各自独立钉死并复核 GR8 已验收的完整冻结闭包：

- 17 个 development 输入与五份上游 CHECKSUMS 的反向注册；
- v1.20 freeze 两节；
- GR2A / GR2BR1 / GR2D 三个 accepted sibling 的 21 个对象；
- GR3R1、GR4、GR5、GR7 各六对象；
- MB 工作树 accepted v1.20 与 MU 按 GR2BR1 full `commit:path` 物化的不同 module / source SHA；
- 196 行、两轴 verdict schema、k1..k7、mandatory、pass/outcome、冻结 G1–G4、GR7 target family；
- GR8 bucket projection、34 classes、16 格 class closure 与两层上界 anchors。

不得 import GR8 / GR7 / GR5 / GR4 / GR3R1 analyzer、validator 或 tests；不得把任何前序 JSON / REPORT
当 expected document；不得从前序 artifacts 复制 row 值、target membership、signature 或 class membership。

### 7.2 GR8 六对象

必须从 parent commit 与工作树两侧各自核 SHA：

| path | SHA-256 |
|---|---|
| `harness/verify_observable_signature_routing_separability_envelope_wave2.py` | `5a9d8d39b3f384be371150c46e72109512c8aa1a2003201d24952c3589c35e40` |
| `posthoc/stage0a-development-wave2-observable-signature-routing-separability-envelope/analyze_observable_signature_routing_separability_envelope_wave2.py` | `3f1bbd73f5855f55eddab7f99d535f3fd9a9ae792292a8461e173c86014b548b` |
| `posthoc/stage0a-development-wave2-observable-signature-routing-separability-envelope/test_observable_signature_routing_separability_envelope_wave2.py` | `2308a6daaa83ea63f0faadd5acec5613e4139055f7b9526fb5c73a0b3cf5dd6a` |
| `posthoc/stage0a-development-wave2-observable-signature-routing-separability-envelope/OBSERVABLE-SIGNATURE-ROUTING-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json` | `19adc87b75293e2ccafdb86176a827b5feb8b3f48fc9354b6c6484659664cb38` |
| `posthoc/stage0a-development-wave2-observable-signature-routing-separability-envelope/OBSERVABLE-SIGNATURE-ROUTING-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md` | `bb103e99ceb9d49685bc2c0747da83078185efbc7a0ec2e1d70453b266641a2a` |
| `posthoc/stage0a-development-wave2-observable-signature-routing-separability-envelope/CHECKSUMS-OBSERVABLE-SIGNATURE-ROUTING-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256` | `994becdc3a66759b294d22e3986a45e03db782247101ee1fa1c7363b7d1344be` |

GR8 JSON 只作为 SHA 已钉死的 accepted object；本任务的 aggregate anchors 已写在 §8，运行时不得解析
GR8 JSON 取得 expected 值。validator 可以解析**本轮** delivered JSON 以和独立 canonical document 比对。

## 8. 必须先闭合的 anchors

任何 exact-count 结果产生前，两套实现必须直接重现：

- 256 格、两轴各 128、bit order `k1..k7`、无缺格/重格；
- GR5 baseline all-green 0；G1/G2/G3/G4 passing `32/132/16/128`；
- GR7 closure：denominators `56/56/56/28`、G2 cap 78、G3 ratio `1/10`、vectors 7041；
- GR7 G1–G3 envelope feasible 48、oracle-all-green 16；MB `32/0`、MU `16/16`；
- k7-off feasible / all-green `48/16`，k7-on `0/0`；target family 恰 16 格且全为 MU / k7-off / G4 pass；
- GR8 projected signature：34 classes、support `1…27`、11 singleton；
- GR8 16 格的 class-closure additions `78…82`、collision 恒 42、final `82…88`；
- GR8 Layer A all-green `0/16`、Layer B upper-bound all-green `0/16`，且全部由 G2 cap 阻断；
- routing 不改变 matcher-fixed fields 或 G4，k7 AST digest 仍等于 accepted GR5。

任一锚漂移必须在 exact tuple、class 或结论产生前退出 2。

## 9. 必须发布的结果

JSON 必须按固定顺序保存 16 格 aggregate table。每格至少包含：

- configuration id、matcher、七位 mask；
- baseline needs_review、GR7 `|U(c)|` 与 GR7 minimum padding anchor；
- signature schema version、projected bucket class count、exact class count、positive exact class count；
- positive-class support min/max、singleton-positive-class count、`all_positive_classes_support_ge_2`；
- `|A_exact(c)|`、`|U(c)|`、`|E_exact(c)|`，以及相对 GR8 collision 42 的 reduction；
- exact-closure final total 与四 arm aggregate counts（过 k=2 后才发布）；
- Layer A 的 G1/G2/G3/G4 与 `exact_signature_only_all_green`；
- Layer B feasibility、minimum final、minimum padding、minimum tie count 与
  `exact_signature_plus_padding_all_green_upper_bound`；
- 对应原因闭集、suppression status 与该格 `K_exact⊆K_bucket` 证明结果。

同时发布：

- exact class 总数、全局单维 support distribution、support min/max、singleton 数；
- 34 个 GR8 bucket classes 中 split / unsplit 数、每个 bucket class 的 exact-subclass-count 单维分布；
- 每格 pure-target / mixed / non-target exact class 数的单维 aggregate distribution；
- 16 格 Layer A 与 Layer B all-green 数；
- collision、collision reduction、singleton-positive-class 与 blocker 的 min/max/distribution；
- 所有 minimum ties 的 aggregate 数，不选 winner、不排序配置；
- 16/16 refinement containment；仅在 §4.4 条件满足时发布 all-coarsenings 单调性证书；
- oracle / signature-table / selector / candidate / configuration / threshold / hidden / model / cost /
  promotion / freeze / out-of-sample 边界声明。

绝对不得保存：exact 或 bucket signature tuple/value/digest、长度值频表、bucket→exact 映射、positive
signature set、class member list、`U/A/E` 成员、row 顺序、id/hash、答案、episode、trace、rubric 文本、
模型、绝对路径、arm-conditioned rule 或可回连 join key。

## 10. 唯一允许结论

按以下顺序选择最具体的一条。

若存在 `exact_signature_only_all_green=true`：

> `fixed-field exact-count machine-observable separability exists on development; no deployable or out-of-sample selector has been identified`

若 Layer A 全部失败，但存在 `exact_signature_plus_padding_all_green_upper_bound=true`：

> `fixed-field exact-count closure still requires anonymous padding; no deployable selector is closed`

若两层都没有 all-green：

> `even the fixed-field exact-count machine-observable ceiling cannot realize any GR7 oracle-all-green cell under the frozen gates`

第三种结论必须追加 §4.4 的 all-coarsenings 句；前两种不得追加。所有结论始终附：

```text
development-only class-closure upper bound within the GR8 field set; no signature values, selector, candidate, configuration, out-of-sample, promotion, or freeze decision
```

REPORT 首行必须为：

```text
EXACT-COUNT SIGNATURE SEPARABILITY ENVELOPE ONLY — fixed-field development upper bound; no selector or candidate
```

末行必须为：

```text
GR9 COMPLETE — return to owner before any selector hypothesis, candidate, new field, dataset expansion, or execution
```

## 11. 非识别、边界声明与静态闸

- `uses_gold_for_offline_class_labelling_only=true`
- `alternative_signature_defined_for_offline_upper_bound_only=true`
- `exact_count_signature_values_saved=false`
- `positive_signature_lookup_saved=false`
- `deployable_selector_identified=false`
- `selector_hypothesis_proposed=false`
- `new_routing_signal_proposed=false`
- `candidate_verifier_created=false`
- `repair_configuration_selected=false`
- `bucket_or_threshold_search_performed=false`
- `threshold_changed=false`
- `development_only=true`
- `out_of_sample_validity="underdetermined"`
- `hidden_touched=false`
- `model_calls=0`
- `cost_cny=0`
- `promotion_decision="not_made"`
- `freeze_decision="not_made"`

任一 per-arm class / addition / collision / padding vector 含 `0 < cell < 2` 时，整个交叉 block 降级为
`suppressed_for_non_identification`。solver 内部仍须精确验证，但数值不得落盘。support distribution 只允许
全局单维 aggregate；不得和 configuration / arm / outcome 拼表。

analyzer / validator AST 必须拒绝动态 `eval/exec`、网络、模型 runner、递归目录遍历 / glob、hidden 路径、
随机选择、成员常量表、signature 常量表、list 元素访问、禁用字段、结果驱动的字段/threshold 分支，或
导入前序任务模块。validator 不得写仓库；analyzer 只可在显式 `--generate` 下无覆盖地写本轮三产物，
`--check-existing` 必须严格只读。固定目录的 `os.listdir` 只允许用于五产物闭包与 candidate-verifier 闸。

## 12. Independent validator 与真实负测

`harness/verify_exact_count_signature_separability_envelope_wave2.py` 必须独立钉死 inputs、commits、两器材、
k1..k7、GR7 逆投影、GR8 bucket anchors、exact signature、refinement、16 格 target、class closure、两层
gates、单调性证书、canonical JSON / REPORT 与净化边界。不得 import analyzer / tests / 前序任务模块，
不得把 GR8 JSON、本轮 delivered JSON 或 REPORT 当 expected document。

测试在 `TemporaryDirectory()` 复制五份 posthoc 产物并黑盒运行 validator；每条 mutation 前先跑
byte-identical control rc 0，再施加 mutation、重签 CHECKSUMS，确认 rc 2。至少覆盖：

1. exact signature 加入 gold、arm、configuration、identity、正文、list element、环境值或新字段；
2. 对长度再分桶/cap/round、漏一个计数字段、换顺序、用 sum/distinct/string length 或 malformed fallback；
3. bucket 投影边界漂移、非纯 `P(S_exact)`、伪造 34 classes / support / 42 collision anchors；
4. 保存 exact/bucket tuple、长度频表、digest、positive lookup、bucket→exact map 或 class members；
5. `U(c)` 少一个 FN、混入 gold-fail、重复计 mandatory-only FN；
6. exact class closure 少扩一个同签名 row、多塞不同签名 row、删除 existing review；
7. 伪造 `K_exact⊆K_bucket`、exact-class nesting、minimum-closure 或 all-coarsenings 证明；
8. 16 格 target 少格/多格/换 matcher/打开 k7/让 G4 fail 进入；
9. GR7 256 格、7041 closure、axis / k7 分层、GR8 aggregate anchor 漂移；
10. G2 cap 79、G3 float/adjacent-only/wrong denominator/threshold 漂移；
11. 把 Layer B 冒充 Layer A、伪造 minimum padding/ties、在存在可行格时发布全称粗化结论；
12. 伪造 exact class count、support、split/unsplit、collision reduction、singleton 或 blocker count；
13. 发布 k<2 arm block、身份、正文、模型、绝对路径、hidden 路径或越界结论；
14. selector / hypothesis / signal / candidate / selected config / threshold search / OOS / promotion / freeze
    任一边界漂移；
15. 少/多产物、CHECKSUMS 漏项/多项/自列、input / parent object SHA 漂移或浮动 ref；
16. REPORT 首尾、结论、owner-decision、普通事实行或 JSON key order / indent / trailing newline 漂移。

负测后五份工作树产物 SHA 必须与导入快照一致；stderr 必须单行净化，不回显待验值、路径、identity、
signature、exact length 或 traceback。

## 13. 目标命令

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/test_exact_count_signature_separability_envelope_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-exact-count-signature-separability-envelope/analyze_exact_count_signature_separability_envelope_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_exact_count_signature_separability_envelope_wave2.py
```

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行 GR8 或更早任务的
目标命令、`pytest harness/` 整目录、旧 sweep/rescore/probe、模型 runner、正式 development、样本外、
G0 或 hidden。

## 14. 回执与停止条件

回执必须给出：

- branch/worktree/commit/唯一 parent、相对 parent 六个 `A` / 0 个 `M`、ancestry/tag/status；
- 六 changed paths 与 SHA、posthoc 五项、CHECKSUMS 四项闭包；
- GR8 完整冻结输入、accepted objects 与六对象在 parent / 工作树两侧的 SHA 闭包；
- 两器材直接装载、GR7 256 格 / 7041 closure / 16 格 target、GR8 anchors 的机械逆投影；
- exact signature AST gate、projected bucket containment、class/support/split 与禁止字段扫描；
- 16 格 `U/K/A/E` aggregate、Layer A/B、collision reduction、singleton、blocker 与唯一结论；
- 单调性证书是否允许发布、k=2 suppression、泄漏扫描、负测 control/mutation rc；
- 三条目标命令原始结论；测试后 HEAD/status/tag 与六文件 SHA 无漂移，无 `__pycache__`。

提交后立即停止并返回 owner。不得创建 selector hypothesis、candidate、k8、第二 matcher、GR10 或新字段，
不得选择 bucket / threshold / configuration，不得改 matcher / gate，不得读正文、hidden 或样本外数据，
不得调用模型、产生费用、promotion、freeze、正式运行、G0、merge、tag 或 push。
