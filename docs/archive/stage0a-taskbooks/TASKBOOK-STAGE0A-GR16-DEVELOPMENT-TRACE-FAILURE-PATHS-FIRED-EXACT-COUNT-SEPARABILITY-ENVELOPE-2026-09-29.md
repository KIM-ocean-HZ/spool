# 执行任务书 —— Stage 0-a development wave2 · GR16 trace-failure-paths-fired exact-count separability envelope

> **状态：COMPLETE — 2026-10-01 验收为 `Redo`；本文件只供历史审计，不再执行。**
>
> 后续唯一任务书：`docs/TASKBOOK-STAGE0A-GR16R1-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-PRE-PRIMITIVE-READ-CLOSURE-CORRECTION-2026-10-01.md`。
> 原交付 `9ba469caa4d4fc3e0e49e9cf9547042e86232bdb` 不进入 accepted chain；
> 只纠正 P4 前未知键读取未在 P3 baseline 闭包拒绝的问题，详见 canonical handoff §4.27。
>
> **唯一交付：** 预注册并只检验 `len(trace.failure_paths_fired)`，作为 GR9 15 槽 exact-count
> signature 的唯一新增末槽，测同一 16 格 development class-closure separability 与匿名 padding 上界。
>
> **授权来源：** owner 于 2026-09-29 接受 GR15R8，裁决为 `Accept with non-blocking note`，并明确
> “验收通过了，不需要再跑一次，下发下一个任务”。本轮是新的单 primitive GR16 授权；不重跑已接受
> GR15R8 的完整 pytest，不是 GR15R9，也不把三条非阻断说明转成修复任务。
>
> **起点与边界：** parent 为 accepted GR15R8，科学 baseline 仍为 GR9；development-only、零费用。
> 不与前五项组合，不做排名、selector、candidate、hidden、样本外、模型/API、远端操作或 GR17。

## 1. 预注册理由、语义限制与假设

GR10 的七项资格表中，五项已分别检验：GR11 `len(trace.missing)`、GR12R3
`len(trace.wrong_param_calls)`、GR13R2 `len(trace.satisfied)`、GR14 `len(trace.invalid_tool_calls)`、
GR15R8 `trace.calls_made`。它们都是独立追加到 GR9 的单槽实验，不是累计 signature。

本轮只按 accepted `check_trace()` 的源码语义选择 `len(trace.failure_paths_fired)`：`fired` 初始化为
空列表，三个固定诊断分支追加 `fp["id"]`，return 发布 `sorted(set(fired))`；accepted MU scorer
不读取 `failure_paths_fired`。因此本轮测的是**已发布、去重后的诊断标签列表长度**，不是原 trace
长度、调用次数、失败次数、append 次数或语义正确的失败归因数。

该诊断器使用既有 trigger 文本和工具/参数的机械匹配；本轮的 content-blind 只指下游仅取已发布
列表长度，不表示上游生成不依赖文本。不得把标签命中解释为已验证的因果归因，不得重读 trigger、
标签 ID、工具名、参数或列表元素来解释结果。固定源码重建器材的既有计算边界保留，不新增内容探索。

选择依据不含本轮 runtime value、频率、support、gold 效果、GR10 表序或前五项效果。另一项
`len(suppressed_wrong_actions)` 继续未检验；本轮前为已检验 5 / 未检验 2，完成后为 6 / 1。

在任何本轮逐行结果产生前锁定：

```text
trace_failure_paths_fired_exact_count_refinement_v1 := len(verdict["trace"]["failure_paths_fired"])
```

固定 hypothesis：

> `len(trace.failure_paths_fired)` may split GR9 classes and reduce mandatory class-closure collision enough
> to realize a frozen GR7 oracle-all-green target cell; this is a development-only separability test,
> not an identified deployable selector or a validation of diagnostic attribution.

结果无论正负，只走 §4 的原因树与 §10 的固定结论；不换字段、不加组合、不追加解释性 probe。

## 2. 起点、精确路径与提交

- 唯一 parent：GR15R8 `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`。
- parent 的唯一 parent：GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`。
- projected scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`。
- branch：`stage0a-wave2-trace-failure-paths-fired-exact-count-separability-envelope-gr16`。
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-failure-paths-fired-exact-count-separability-envelope-gr16`。
- 2026-09-29 下发时只读预检：精确 local / 已登记 origin ref、worktree、任务书均不存在；parent
  中无新 harness、posthoc 目录与六件目标 object。执行者创建前再查；任一已存在即停止，不删、不覆盖、
  不复用。这里只下发任务，未创建实验 branch/worktree。
- 从上述 parent 新建，最终恰一笔 commit、六个 `A`、0 个 `M`。GR15 / R1–R7、GR3、GR6、
  GR12 / R1 / R2、GR13 / R1 与 metadata-only sibling GR6R1 不得进入 ancestry。
- 不 checkout/cherry-pick/merge rejected commit，不读 sibling worktree。历史输入只经钉住的 git object。

固定 commit message，恰一行，无正文、trailer 或工具署名：

```text
posthoc(stage0a): bound trace-failure-paths-fired exact-count separability (GR16)
```

唯一允许 changed paths：

```text
harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/CHECKSUMS-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 恰五项；CHECKSUMS 恰登记 analyzer / tests / JSON / REPORT 四项，不自列。不得修改 parent
已有文件，不增加第七件产物、registry copy、event file、signature table、lookup 或仓内临时文件。

## 3. Signature 与实际读取边界

版本固定：`machine_observable_exact_count_shape_plus_trace_failure_paths_fired_v1`。

```text
S_ff(r) = S_exact(r) + (len(verdict["trace"]["failure_paths_fired"]),)
drop_last(S_ff(r)) == S_exact(r)
```

前 15 槽原样重建 GR9，不能带入 GR11–GR15 的附加槽。available row 末槽是裸非负整数，不得包成
`("available", count)`；沿用 accepted MU schema 的 194 available / 2 malformed，malformed 末槽为
scalar `"not_applicable"`，不得把未知 schema、缺 key 或错误类型吞成 sentinel。

本轮唯一 accessor 在 P4 对 direct literal path 读取一次、验证容器 exact type 为 `list`，只执行一次
built-in `len`，返回裸整数；类型检查复用同一次取得的容器。不得使用 `.get`、computed key、alias
path、fallback、truthiness、元素访问、迭代、排序、去重、sum、hash、cap 或 bucket。上游已经去重，
本轮不能再转成 `set` 或重算 `fired`。唯一 accessor 自身必须受 AST 与实际 phase guard 保护。

P4 前，分析层对本轮字段的 direct subscript、`.get`、`__getitem__`、动态键循环、helper/callable
alias、`type(...)` 包装下的求值也都算实际读取，必须拒绝。P1 的 schema 检查可以核 keyset、trace
容器和源码类型契约，但必须跳过本字段 runtime value；不能先读后声称“只查类型”。未知读取路径
fail closed。原冻结 scorer 在重建 verdict 时产生该字段不计为分析 accessor read；不得修改 scorer。

## 4. 同一 target family、两层 envelope 与判定

target family 固定为 GR7 的 16 个 oracle-all-green 格，全部 MU / k7-off / G4 pass，保留顺序。
不得因本轮结果筛格、换格、扩 target 或选择配置。

对每格机械重建既有 review 集 `N(c)`、mandatory 集 `M`、false negatives `F`，定义：

```text
U(c) = F \ (N(c) ∪ M)
Q_ff(c) = {S_ff(u): u ∈ U(c)}
K_ff(c) = {r: S_ff(r) ∈ Q_ff(c)}
A_ff(c) = K_ff(c) \ N(c)
E_ff(c) = A_ff(c) \ U(c)
N_ff(c) = N(c) ∪ K_ff(c)
```

Layer A 必须闭合 `U⊆A`、`N⊆N_ff`、完整 positive classes、minimality、逐行 drop-last 与
`K_ff⊆K_exact`。G1 按 accepted gate 重建，即 `F \ (N_ff ∪ M)` 为空；G2 为总数 ≤78；G3 为
四 arm 归一化差 ≤`1/10`；G4 与原格相同且 pass。不将 mandatory 当作排斥集合，不改 gate 语义。

Layer B 只在保留 `N_ff` 的前提下，沿 GR7 的 7041 个 exact integer vectors 求 anonymous padding：

```text
denominators = (56, 56, 56, 28)
0 ≤ x_a ≤ denominator_a
sum(x) ≤ 78
max(x_a / denominator_a) - min(x_a / denominator_a) ≤ 1/10
x_a ≥ |N_ff(c) ∩ arm_a|
```

使用 exact rational arithmetic，输出 minimum final total、minimum padding 与全部 minimum ties 的
匿名计数；不生成成员、selector 或 tie winner。匿名可行不能冒充 Layer A 可行。

判定顺序固定：无 split → 闭合 16 格与 GR9 相同；有 split 且 A/B 均 0 → 仍不可实现；A≥1 →
development class-closed separability；A=0 且 B≥1 → 仍需匿名 padding。

原因闭集：

```text
NO_GR9_CLASS_SPLIT
TRACE_FAILURE_PATHS_FIRED_CLASS_COLLISION_EXCEEDS_G2_CAP
TRACE_FAILURE_PATHS_FIRED_CLASS_CLOSURE_FAILS_G3
NO_TRACE_FAILURE_PATHS_FIRED_G3_PADDING_VECTOR_WITHIN_G2_CAP
POSITIVE_TRACE_FAILURE_PATHS_FIRED_CLASS_HAS_SINGLETON_SUPPORT
```

G2/G3 failure 可重叠；Layer B 先判 total>78，否则才判无 vector。singleton 只记 overfit 风险，不改闸。
GR15 的 58 classes、collision 7、A=0/B=16 不是本轮 expected，不得据此调参或预填结果。

## 5. 钉死输入、accepted objects 与 scaffold

两套实现各自闭合 inherited 17 个 development inputs、五份上游 CHECKSUMS 反向注册、v1.20 freeze
两节；直接重建 MB 与从 accepted GR2BR1 full object 物化的 MU，module/source SHA 必须不同。

accepted scientific object inventory 为 GR3R1 / GR4 / GR5 / GR7 / GR8 / GR9 / GR10 / GR11 /
GR12R3 / GR13R2 / GR14 / GR15R8 各六对象，加 GR2A / GR2BR1 / GR2D 三 sibling 共 21 对象：
机械求和 `pinned objects=93 generations=12 siblings=3`，不得写死总数。GR15R8→GR14→GR13R2→
GR12R3→GR11→GR10 的 lineage 逐条核实；不得因 science baseline 是 GR9 而错写 commit parent。

GR11–GR15R8 的交付只用于 ancestry、raw-byte SHA 或 Python scaffold，不重算五项 primitive；
前序 JSON / REPORT / CHECKSUMS 一律不解析作 expected science。validator 不 import analyzer、tests
或任何前序实现，不共享可执行 helper、cache 或 event 文件。保留 scaffold 需要的 rejected raw-byte
closure 时，单独标为历史 provenance，不计入 93 个 accepted objects、不进入 ancestry。

accepted GR15R8 的 full `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959:path` 六对象 SHA-256：

```text
3ef4a09dcbc7e3f5b2974a6e9039d9d6d30b901e93c38743bee77fbe13805a81  harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
c261acabf203e615b7a94feaed15ffc071d78d8f1dcee3554452ee19a3b451c6  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py
c25149b39e710e719bfb1c6e94a32bd66b2c318d05c348f21c662e2042980ee3  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py
b0baf0f1d92107e5780924d6c18525bc25df539f434ddf4d16a1b10de50edf19  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
4a8499f5ca01403b51205cd0c4c66f958aca32649369e5a50645d25d3d2ee903  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
510095984574545693c03b73ae29ef746fb1f6813a5554811e411200dfdfeffc  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/CHECKSUMS-TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

三份 Python 可机械迁移为本轮实现。必须替换 primitive、source semantics、轮次、路径、事实计数与 pins；
禁止只全文换字段名而保留 `calls_made=len(calls)` 的源码合同或上一轮科学 expected。

## 6. Source semantics、scorer scope 与事实闭包

钉死以下 full objects，先核 SHA，再作两套独立 static AST 证明：

```text
67cf84c9d40057fec02be7a963694938bff78a58:harness/verify_stage0a.py
ce014e0850efc23617387ad01b3154d091abb3a5dfc9d7ccd40671f0b56c7dce
fae90ecfeed723748b80566b94d473cf25e45d0c:harness/verify_stage0a_v120_wrong_action_matcher_gr2b.py
a9d6fcaad174b43a2555c72daf449769183d2902a1827e5be40ba3058862bd65
```

1. `check_trace` 内 `fired=[]` 唯一初始化；三条 append 均为 `fired.append(fp["id"])`，前两诊断
   分支各有 continue；无其它写入、别名逃逸或 return 替换。固定三分支的 predicates 与其依赖绑定
   必须由钉住 source 闭合；不在本轮重写、简化、优化或重新解释诊断器。
2. direct return key `failure_paths_fired` 恰为 `sorted(set(fired))`，逐层单实参，不能换成
   `fired`、`len(fired)`、常量或别的列表；`trace.ok` 仍为 `not missing`。
3. MU `score_episode` 真实读取 `tr` 与 `ok`；`failure_paths_fired` 全函数 read 为 0。
   `passed/outcome/review/reason/mandatory` 五名有实际 bindings，该字段在其中读取也为 0。
4. 五族 scorer-scope gates 保留：`trace_ok_still_read / reads_zero / decision_bindings_non_empty /
   decision_locals_complete / decision_reads_zero`，由源码事实派生且被 enforcement 消耗。
5. JSON / REPORT / 三份 Python 五面身份统一为 GR16；parent 是 GR15R8，baseline 是 GR9。
   narrative 机械绑定真实 AST，包括 `sorted(set(fired))`、诊断而非决策、仅下游长度及 5→6 的历史计数。
   不以关键词子串出现代替绑定，不把旧 source-semantics 计数 `2/1/1/1/0/9` 当本轮固定结果。

## 7. 保留 GR15R8 的完成证明与边界防护

本轮迁移 accepted GR15R8 已闭合的保护层，不扩修其已披露相邻问题：

- guard 启动时和接受 `prove` 前各重算 pre-proof fingerprint；两套实现及 tests 的独立判别器须
  在最终源码上复现各自 pin。可执行 comprehension 不得重新加入 `INERT` / `QUIET_NODES`。
- 原 validator 21 / analyzer 22 项 controls 的职责、family 映射及八族 probes 均保留；字段、函数名
  与必要源码谓词迁移时逐项映射，不能静默删项。expected 不由可写 live table 自己定义。
- 保留真实 preflight→self-audit→closure→prove→source-semantics→release，原 driver 的实际帧、
  同一对象、逐项完成记录、R5 semantic completion、R4 实际 reader/rebuild 防护。
- P1 read-syntax closure、五面 identity、whole-source gate-deletion self-provenance 与非字面
  runtime/static order claims 不得退回。新 primitive 的必要迁移必须先静态闭合，再生成科学产品。
- proof 后到 release 前的未钉住代码与 R5 放行状态问题保留为 handoff 的 captured 观察；不借本轮
  追加全阶段 pin、通用 Python 沙箱或邻近 completion repair。若本轮必要迁移暴露无法保持既有
  合同的阻断，只停下报最小证据与受影响条款，不自行扩修。

## 8. P0–P8 与 baseline anchors

沿 accepted 实现的 phase 状态机与真实 event ledger，保证对象与源码闸、baseline anchors 先于本轮
首次实际读取，split 先于 Layer A，Layer A 先于 Layer B，canonicalization 最后。阶段职责为：

```text
P0 pin-and-verify-objects / static enforcement preconditions
P1 reconstruct frozen instruments and schema, without reading the new primitive
P2 reconstruct frozen baseline family
P3 verify GR8 / GR9 / GR10 anchors
P4 first-and-only trace-failure-paths-fired list read and exact length
P5 split-and-projection closure
P6 Layer A
P7 Layer B
P8 canonicalize products
```

pre-product guard 的启动、自证与 release 顺序另按 §7，不能因 phase 文案替换而移动实际调用。
P4 前直接重现：256 格、两轴各 128、bit order `k1..k7`；GR5 all-green 0 与 G1/G2/G3/G4
`32/132/16/128`；GR7 denominators `56/56/56/28`、cap 78、ratio `1/10`、7041 vectors、G1–G3
feasible 48 / oracle-all-green 16、MB `32/0`、MU `16/16`、k7-off `48/16`、k7-on `0/0`。

GR8/GR9 都为 34 classes、support `1…27`、11 singleton；GR9 对 GR8 split/unsplit `0/34`；
16 格 collision 42、final `82…88`、Layer A/B `0/16`。GR10 universe 29 paths、43 entries、
四分 `15/2/19/7`、eligible 7、unknown/unclassified 0；本字段在 eligible 中，其余六项没有进入
本轮 signature/accessor。k7 AST digest、matcher-fixed fields 与 G4 不变。

order block 恰七键：`phases / primitive_after_anchors / split_before_layerA / layerA_before_layerB /
violations / from_runtime_events / order_claims_hardcoded`。五个 bool 由真实 ledger 与 whole-source
AST provenance 派生，不写 literal 结论；证据只能发布 phase/count/zero violations，不落盘 events。

## 9. Tests、独立 validator 与披露

新六件交付保留 scaffold 的等价负测覆盖，迁移锚必须命中；不能用字符串替换未命中、测试删除或
晚期 CHECKSUMS mismatch 冒充边界拒绝。至少覆盖：

1. parent/lineage/message/paths/SHA/93-object 求和；正常重建、determinism、canonical ordering。
2. `fired` 初始化、三分支、append、去重/排序 return、`trace.ok` 与 scorer-scope 五族删闸/恒真化。
3. 本字段 early-read 的 direct/type/get/computed/dynamic/helper-alias 路径；取元素、对原列表再
   去重、以 append 数代替列表长度、错误容器、sentinel 漂移、单槽包装或混入前五项。
4. P0–P8 顺序、order bool provenance、drop-last、16/16 containment、positive-class minimality、
   target family、冻结 gates、7041 vectors、Layer A/B 顺序、k=2 arm-block suppression、reason/conclusion。
5. R4–R8 已有实际读取、completion、inventory 与 fingerprint mutations，包括 R7 93 条、R8
   两套各 24 条以及 helper-only 单顶层语句对照；适配新命名与 pin，不弱化原攻击目的。
6. JSON/REPORT 删增键、换序、普通事实篡改、结论分支误写、首末行或 rider 删除；五面 identity 漂移。

每条黑盒 mutation 先在 byte-identical sandbox 用同一只读 spy 跑 control rc 0，再要求 mutation
rc 2、stderr 单行净化。inventory/pre-proof mutations 要求 proof acceptance/product opens/
rebuild-input opens/release/被放行 rebuild entries 全为 0；control 证明 21/22 controls 与 8 probes
全部完成且先于 proof/read。source-semantics/completion 等 proof 后拒绝允许 proof 已完成，但成功
product/rebuild-input opens、release 与被放行 rebuild entries 必须为 0。不得以调用存在替代必要执行。

旧 mutation 可在更早正确 stage 拒绝；延续 R8 已接受的选择性双跑范围：原 static/closure/proof
拒绝项在沙箱重签新 pin 后还须原防线拒绝；原 runtime hook 与 R5 release forged-pin 项可保留
启动拒绝加进程内覆盖。不得据此声称全部旧 mutation 都有第二次端到端运行。spy 不写 guard、不调用
guard、不提供完成证据，只观察事件；mutations/spy 只随 §11 完整 pytest，不单独运行。

validator 独立重建 canonical JSON / REPORT 并逐字节比较、核 CHECKSUMS，不信任待验产品。
失败仅单行 `FAIL [stage]: reason`，不回显值、identity、正文或绝对路径。

aggregate 发布沿 scaffold schema 迁移 primitive/轮次与必要 source facts：16 格固定顺序，保留
configuration/matcher/mask、GR7 required/padding anchors、GR9/current class counts、positive support
min/max/singletons、A/U/E counts、collision reduction、final 与四 arm 匿名计数、Layer A G1–G4、
Layer B feasibility/minimum/ties、reason/suppression、containment；全局 class/support/subclass 的
单维分布、split/unsplit 与两层总数。k=2 的 arm block 发布/抑制规则原样迁移，不能借新字段放宽。

绝不保存/回显 primitive value 或频表、signature tuple/value/digest、positive lookup、成员、row
order/id/hash、正文、join key、绝对路径、其它 primitive value 或 arm-conditioned rule。
structure evidence 只用现有受限计数/布尔面及本轮 source facts，不新增 debug、事件或逐行字段。

## 10. 唯一允许结论

按 §4 顺序选恰一条：

1. 无 split：`the preregistered len(trace.failure_paths_fired) exact-count refinement does not increase development separability beyond GR9`
2. 有 split，A/B 均 0：`the preregistered len(trace.failure_paths_fired) exact-count refinement increases development separability but cannot realize any GR7 oracle-all-green cell under the frozen gates`
3. A≥1：`len(trace.failure_paths_fired) exact-count class-closed separability exists on development; no deployable or out-of-sample selector has been identified`
4. A=0、B≥1：`len(trace.failure_paths_fired) exact-count closure still requires anonymous padding; no deployable selector is closed`

REPORT 首行：

```text
TRACE.FAILURE_PATHS_FIRED EXACT-COUNT SEPARABILITY ENVELOPE ONLY — single-preregistered-primitive development bound; no combination, selector, or candidate
```

末行 rider：

```text
Development-only aggregate evidence; no hidden or out-of-sample data was accessed, no selector or candidate was created, and no promotion or freeze decision was made.
```

发布 `preregistered_primitive="len(trace.failure_paths_fired)"`、`model_calls=0`、`cost_cny=0`、
`hidden_touched=false`、promotion/freeze=`not_made`；保留 §1 的诊断归因局限。
结果未闭合写 `underdetermined` 并停止，不预填科学数值，不把已有四红闸改成已修复。

## 11. 验证命令与执行边界

固定 Python 3.12.2，仅三条本轮目标命令：

```bash
PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 -m pytest \
  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 \
  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 \
  harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
```

构建另允许同一 analyzer `--generate`、不落 `.pyc` 的内存 parse/compile 与必要的精确 git/SHA/路径
检查。禁止 `py_compile`、pytest 子集、前序目标命令、整目录 pytest、单独 profile/计时/spy probe、
rescore/sweep/runner；失败修复并重生成后，三条本轮完整命令重跑。**不重跑 GR15R8 完整 pytest**；
本轮迁移后的 GR16 tests 属于新交付，仍须完整验证并保留 summary、条数、耗时和 rc。

只读钉住 objects 与既有 development 闭包；不人工打开 rows/trace/answer、episode/gold/M1 正文。
路径/残留检查只到本轮精确 ref/worktree、六路径、posthoc 五项及 `harness/__pycache__` 和
`posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/__pycache__`。
查约束也只读明确祖先路径。禁止对 worktree 或父目录递归 find/glob/scandir/walk；不接触 hidden、
未登记 raw、sibling worktree 或旧系统临时目录，不进入/清理它们。

禁止联网、安装、subagent、模型/API、费用、新预算、第二 primitive、组合/排名/选择、threshold/bucket
搜索、candidate、selector、k8、新 matcher、样本外、hidden、G0、正式运行、promotion、freeze、修改
accepted/main/冻结件与 merge/tag/fetch/pull/push。不修改 Knote 文档；验收后由文档维护方收口。

## 12. 交付回执与停止点

交付必须闭合：唯一 parent / 一笔固定 message / 六 A 零 M；六 SHA 与 HEAD:path；posthoc 五项 /
CHECKSUMS 四项；93/12/3；source semantics、P4 唯一列表读取/长度、projection、guard/pins 与真实
mutations；三条本轮命令 rc 0，analyzer 三产品与 validator canonical bytes 一致；status clean、tag 0、
两个精确 cache 目录不存在。摘要不包含当前 commit 自引用或无法稳定闭合的耗时字段。

唯一 commit 后立即停止。回执给 topology、六 SHA、三命令原始 summary（含 pytest 条数和耗时）、
aggregate 结论、边界与任何偏差。不得自动创建 GR17、检验 suppressed-wrong-actions、合并前五项、
修复 captured 相邻问题或重跑历史交付；验收后返回 owner decision。
