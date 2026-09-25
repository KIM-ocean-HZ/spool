# Claude Code 任务书 —— Stage 0-a development wave2 · GR2D 两轨组合直接实验

> **状态：COMPLETE — `073c109c95904c813a4cb2455760af67eb086f10` 已于 2026-09-05 验收为 `Accept`；
> 本任务书不再是可执行光标。owner 随后已授权 GR3。**
>
> **后续任务书：**
> `docs/TASKBOOK-STAGE0A-GR3-DEVELOPMENT-CLOSED-REPAIR-FAMILY-FEASIBILITY-2026-09-05.md`
>
> **性质：** owner 在 GR2CR1 comparison-only 验收后批准创建的唯一后续任务。Codex 选择信息增益
> 最大的最小下一步：把已接受的 GR2A routing 删除与 GR2BR1 matcher 补充**原样组合成一个候选**，
> 在同一钉死的 196 条 development 证据上直接运行四器材对照，回答组合结果与相互作用。
>
> **不是：** 新 hypothesis 搜索、调参、选定 repair surface、promotion、freeze、正式运行或 hidden。
> 即使组合候选四闸全绿，本任务也只能返回 owner decision。
>
> **授权来源：** owner 于 2026-09-05 明确“批准创建后续任务”。该授权只打开本任务书定义的
> development-only GR2D；不授权 hidden、模型/API 调用、费用、gate/阈值变更、正式运行、
> promotion、freeze、merge/tag/push 或 GR2D 之后的任务。

## 1. 唯一问题与为什么现在做

已接受的 GR2CR1 `eb1908491a1ad34a718c417f0a3e2caf57cc017d` 证明：

- GR2A routing-only 相对 base 是 `safe_improvement`，只让 G2 转绿；
- GR2BR1 matcher-only 捕获 G4 target，但以 G2/G3 恶化为代价，属于 `unsafe_tradeoff`；
- 两条单轨互不 componentwise dominate；
- changed-row overlap、同一行上的先后作用、组合后的 G1–G4 / confusion / M1 差异均未观测，
  不能用边际 delta 相加推断。

GR2D 只回答一个问题：**在不新增第三种机制、不改 gate 定义的前提下，两个已接受单轨 patch 的
直接源码并集实际产生什么逐行结果和交互？**

本任务只有一个组合候选，不搜索替代 matcher、不调阈值、不按结果选择版本。若两个 accepted patch
不能机械、无歧义地组合，或任一单轨复跑不能复现 accepted 证据，立即停止并如实回报。

## 2. 起点、branch、worktree 与提交拓扑

- accepted parent：GR1R2 `076a486bdaa111d6aa5654951e6890078afc3874`
- branch：`stage0a-wave2-combined-repair-experiment-gr2d`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-combined-repair-experiment-gr2d`
- 2026-09-05 已核：branch、worktree 与本任务书均未预先存在；若执行时 branch 或 worktree 已存在，
  立即停止，不删除、不覆盖、不猜测可复用性。
- 最终交付 commit 的唯一 parent 必须恰为 GR1R2；GR2A、GR2BR1、GR2C、GR2CR1、被退回 GR2B、
  GR1/GR1R1、未接受 D2–D2R3 与任何其它组合实验都不得进入 ancestry。
- GR2A / GR2BR1 / GR2CR1 只可作为本地 git object 中的钉死输入；不得 cherry-pick、merge、rebase，
  不得依赖或遍历 sibling worktree，不得按浮动 branch/ref 取证。
- 不 fetch、pull、tag、push。

三条目标命令全绿后只提交一次，message 必须为：

```text
posthoc(stage0a): evaluate combined repair candidate (GR2D)
```

## 3. 唯一允许的 changed paths

相对 GR1R2 必须恰七个新增路径，0 个已有文件修改：

```text
harness/verify_stage0a_v120_combined_repair_gr2d.py
harness/verify_combined_repair_experiment_wave2.py
posthoc/stage0a-development-wave2-combined-repair-experiment/analyze_combined_repair_experiment_wave2.py
posthoc/stage0a-development-wave2-combined-repair-experiment/test_combined_repair_experiment_wave2.py
posthoc/stage0a-development-wave2-combined-repair-experiment/COMBINED-REPAIR-EXPERIMENT-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-combined-repair-experiment/COMBINED-REPAIR-EXPERIMENT-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-combined-repair-experiment/CHECKSUMS-COMBINED-REPAIR-EXPERIMENT-stage0a-development-wave2.sha256
```

posthoc 目录必须恰五项；CHECKSUMS 只登记 analyzer、test、JSON、REPORT 四项且不得自列。
原 `harness/verify_stage0a_v120.py`、所有 accepted candidate / validator / posthoc 产物、gold、rubric、
protocol、runner 与 freeze 文件必须逐字节不变。组合候选不得覆盖或冒充 v1.20，不得被正式 runner
导入，不得进入任何 HASHES / freeze 清单。

## 4. 三份源码输入与组合候选的机械身份

只允许从本地 git object 读取下列三份源码；先验证 commit、唯一 parent、changed-path 闭包及
SHA-256，再用于组合：

| 角色 | commit:path | SHA-256 |
|---|---|---|
| accepted base | `076a486bdaa111d6aa5654951e6890078afc3874:harness/verify_stage0a_v120.py` | `351014ba7ab87696d400e735ce086257c49195a9394dc9892601468bee48ec1f` |
| GR2A routing-only | `da0bd254edc267bbd3d4536fb751c6aabb8c39e0:harness/verify_stage0a_v120_review_routing_gr2a.py` | `fcea0ea3082185a91a2c14d38f945764d37b2e6bb5f21591566447bc4e515dbf` |
| GR2BR1 matcher-only | `fae90ecfeed723748b80566b94d473cf25e45d0c:harness/verify_stage0a_v120_wrong_action_matcher_gr2b.py` | `a9d6fcaad174b43a2555c72daf449769183d2902a1827e5be40ba3058862bd65` |

完整 commit 为：

- GR2A `da0bd254edc267bbd3d4536fb751c6aabb8c39e0`
- GR2BR1 `fae90ecfeed723748b80566b94d473cf25e45d0c`

两轨七文件与 14 个 SHA 的闭包沿用并重新核对
`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR2C-DEVELOPMENT-REPAIR-TRACK-COMPARISON-2026-09-04.md` §4；不得只验证上表三项。

组合候选必须由 accepted base 的同字节副本起步，身份为
`CANDIDATE_VERSION = "v1.20-combined-repair-gr2d"`。除候选身份说明外，只允许两个既有语义变换：

1. **GR2A patch：** 删除 `score_episode()` 中 R2 的
   `outcome == "refused" and not blockers and _is_trailing_hedge_refusal(short)` 路由分支；
   R2 helper/常量保留不改，k1/k2/k3/k5/k6 与 R3 不改。
2. **GR2BR1 patch：** 原样加入已接受的 UQ 未获支持数量 matcher 常量/helper、显式内容叶投影与
   `wrong_actions_hit()` additive block；字段白名单、三道断言门、身份/gold 隔离、fail-closed shape
   行为与 accepted GR2BR1 必须逐字节/逐结构一致。

不得重写、概括或“等价优化”任一 patch；不得新增第三个 matcher/routing 机制、阈值、词表、特例、
case id、题目专名、gold/identity 读取或任一判定变化。两个 patch 在源码中的锚点必须不重叠；若组合
需要解决冲突，停止，不自行裁决。

analyzer 与独立 validator 必须各自实现下列三重逆投影，不能互相 import helper：

1. 组合候选去掉 UQ patch、规范化候选身份后，逐字节等于规范化后的 accepted GR2A source；
2. 组合候选恢复 R2 block、规范化候选身份后，逐字节等于规范化后的 accepted GR2BR1 source；
3. 同时去掉 UQ patch并恢复 R2、规范化候选身份后，SHA-256 等于 accepted base。

“规范化候选身份”只能处理三份源码中已知、钉死的 identity 注释块与唯一
`CANDIDATE_VERSION` 行；不能删除其它差异。组合候选 SHA 必须写入 JSON，并由独立 validator 的
自身常量再次钉死。

## 5. 数据读取面与执行隔离

只允许使用 GR1R2 已钉死并验证的 development 输入闭包：

- wave2 `rows.jsonl` 与同一 run 的 CHECKSUMS；
- 由这 196 个 `run_id` 精确构造、且由 CHECKSUMS 登记的 196 份 trace；
- `items/stage0a/episodes-development.json`；
- U1 adjudicated development gold 及其 CHECKSUMS；
- M1 labels 及其 CHECKSUMS；
- D1、D2R4、GR1R2 产物及各自 CHECKSUMS；
- v1.20 / v1.19 / `verify2.py` 与 v1.20 freeze HASHES；
- 上节钉死的两份 accepted candidate source 与 GR2CR1 比较 JSON
  `082abf613fa62f9d586dae0fae774735e28d8dfaaa3b185096bd9ca10bc8e327`，仅作 accepted 锚。

所有输入 SHA 必须由 analyzer 重新核验并在 JSON 完整登记，validator 用自身常量独立再核。
不得遍历或 glob `raw/`；只能先读钉死 rows，再按恰好 196 个 run id 构造 trace 路径。

必须在隔离模块命名空间中运行 base、GR2A、GR2BR1 与 combined 四份器材；每次运行前后清理本任务
加载的模块与 `sys.path`，避免 helper/module cache 串轨。accepted sibling source 只可按 git object
读取并在 `TemporaryDirectory()` 中物化；不得读取 sibling worktree，也不得修改任何 accepted 文件。

禁止 `raw_outputs/`、其它 raw run、未登记 trace、hidden；不得 list/stat/hash/read hidden。
答案、trace、episode 与 gold 正文只能在进程内参与机械重算，不能写入源码、测试名、JSON/REPORT、
stdout/stderr 或异常；不得输出 run/blind/episode id、模型、逐行 arm、答案摘要、join key、绝对路径
或时间戳。gold 只能由离线 analyzer/validator 计算 gates，绝不能进入 verifier 运行时。不得联网，
不得调用模型/API，不得产生费用，不得调用 subagent。

## 6. 四器材逐行直接复核

同一 196 行必须各运行一次 accepted base、GR2A、GR2BR1 与 combined；不得从边际 delta 生成 combined。

前三份器材必须先复现 accepted 锚，任一不等立即停止：

| track | G1 | G2 | G3 | G4 | 违约量四元组 |
|---|---|---|---|---|---|
| base | `49/53`（unrouted 4） | `82/196` | `16.07pp` | `1` | `(4, 4, 85/14, 1)` |
| GR2A | `49/53`（unrouted 4） | `77/196` | `16.07pp` | `1` | `(4, 0, 85/14, 1)` |
| GR2BR1 | `62/66`（unrouted 4） | `96/196` | `19.64pp` | `0` | `(4, 18, 135/14, 0)` |

同时复现：GR2A changed rows 5、只改 routing 允许字段；GR2BR1 changed rows 26、added hits 32、
true-added 3、false-added 29、removed 0，identity/gold/unknown-field metamorphic drift 全部 0。

combined 必须直接重建并逐行证明：

1. 相对 GR2BR1，除候选版本、`needs_review`、`review_reason` 外所有 verdict 字段逐字节相同；尤其
   `wrong_actions_hit` 完整 action-id/metadata、components、suppression、pass 与 outcome 必须相同。
2. combined 的 routing 必须等于在 GR2BR1 matcher 结果上应用 base 六口中的
   `OR(k1,k2,k3,k5,k6)`；R2 不得以其它名字或派生条件重新进入。
3. 相对 GR2A 的所有新增 matcher hit 及其 downstream 变化，都必须由 accepted UQ block 和既有
   判定链完整解释；任何无法解释的字段漂移硬失败。
4. GR2BR1 的 5 类 × 2 payload × 3 层 identity/gold/unknown mutation 必须直接对 combined 再跑，
   `supported_quantities`、断言谓词与 action-id hit 集合全为 0 drift。
5. M1 不改写；`blocking_wrong_actions` 按排序后的完整 action-id 列表比较，不能只比长度。
6. base/combined confusion、G1–G4、各 arm、精确违约量四元组与相对 base 的 delta 全部由直接结果
   计算；safety 只按预注册 componentwise 规则分类为 `safe_improvement`、`unsafe_tradeoff` 或
   `no_effect`，不得按红闸数量或显示值分类。

若任何上述结构不变量不成立，停止并报告 candidate composition failure；不得为通过测试修改 patch。

## 7. 必须报告的交互证据

JSON 与 REPORT 必须只披露聚合，并至少包含：

- 四器材完整 gate / confusion / violation matrix；combined 相对 base、GR2A、GR2BR1 的直接 delta；
- base→GR2A changed set 与 base→GR2BR1 changed set 的交集、各自独有、并集计数；已授权本任务在
  进程内按行 join，但不得披露任何成员身份；
- base→combined、GR2BR1→combined（matcher context 中的 routing effect）、GR2A→combined
  （routing context 中的 matcher effect）的 changed-row 与逐字段聚合；
- 对每个核心 verdict 字段，combined 分别等于 base / GR2A / GR2BR1 / 三者皆不等的行数；类别必须
  互斥且合计 196；
- routing effect 是否因 matcher context 改变、matcher effect 是否因 routing context 改变的
  聚合计数与严格定义；类别数据只能来自四份逐行向量，不能从总量反推；
- combined 的 added/removed action hits、true/false-added、G4 target、M1 完整字段差异与逐字段因果闭包；
- 输入闭包、源码三重逆投影、运行隔离、泄露检查和实际试验候选数 `1`。

禁止用 `5 + 26`、边际 delta 相加或“patch 位于不同函数”替代直接 join/运行。报告必须区分
“源码变换不重叠”与“行为独立”；只有四器材逐行证据才能支持后者。

无论结果如何，下列项继续写 `underdetermined`：其它 matcher hypothesis、其它 wave / 样本外、hidden、
29 条 false-added 的真实复核代价、最终 repair surface、promotion、freeze 与正式运行表现。

报告首行必须为：

```text
COMBINED REPAIR DEVELOPMENT EXPERIMENT ONLY — no promotion or freeze decision
```

报告末行必须为：

```text
GR2D COMPLETE — return to owner before any promotion, freeze, formal run, or hidden
```

不得写“已选定”“应 promotion”“freeze-ready”“可进入 hidden”或把 development 结果升级为正式结论。

## 8. 独立 validator 与真实负测

`harness/verify_combined_repair_experiment_wave2.py` 不得 import analyzer，也不得读取 analyzer 的
常量/helper/expected document；必须自己钉死 commits、input SHA、三份 source、候选 SHA、数据闭包、
source 三重逆投影、四器材运行、gate 定义、精确四元组、交互分类与 evidence boundary。

validator 必须在本文件内独立构造完整 canonical JSON 与 canonical REPORT，并与待验产物做严格结构
相等、canonical JSON 序列化逐字节相等及 REPORT 逐字节相等。所有 exact/display/threshold/passes、
delta `vs`、input checksum `registered`、交互说明、underdetermined、boundaries 与
owner-decision-required 字段都必须进入闭包，不能只校验“足够重算”的子集。

测试必须在 `TemporaryDirectory()` 中复制本任务五份 posthoc 产物与 candidate，必要时同步重签
CHECKSUMS，再黑盒运行独立 validator。每条负测先跑 byte-identical 控制组 rc 0，至少覆盖：

- candidate 漏掉 R2 deletion、漏掉 UQ、夹带第三个机制、改阈值/词表/判定链，或三重逆投影伪造；
- 把 accepted source 换成 branch/ref、错误 commit、错误 parent/path/SHA，或读取 sibling worktree；
- identity/gold/unknown mutation 影响 combined 的 supported set / predicate / hit，即使绕过 candidate
  SHA 常量也必须由运行时独立重建判红；
- 伪造任一单轨复现锚、overlap/union、四路 equality 分类、context effect、interaction count、
  combined changed/action-hit/M1/因果闭包；
- 伪造 combined gate/confusion/四元组/delta/safety/dominance，或用边际 delta 相加替换直接读数；
- JSON 或 REPORT 新增/删除/改写 promotion、freeze、hidden、选轨结论，或删除任一
  `underdetermined` / boundary / owner-decision 项；
- 新增额外 candidate/产物、CHECKSUMS 漏项/多项/自列、输入或 candidate SHA 漂移；
- 在值、键名、文件名、REPORT 或截断 JSON 中注入绝对路径、身份、答案/模型 token，stderr 仍只含
  固定 stage、canonical 字段路径或 REPORT 行号，且退出 2。

错误输出不得回显 expected/actual 值、未预期键名、任意正文、identity、模型、绝对路径或 traceback。
全部 mutation 后，工作树 candidate 与五份 posthoc 产物 SHA 必须与测试 import 时快照一致。

## 9. 目标命令

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-combined-repair-experiment/test_combined_repair_experiment_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-combined-repair-experiment/analyze_combined_repair_experiment_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_combined_repair_experiment_wave2.py
```

默认 Python 无 pytest 时可用机器已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行
`pytest harness/` 整目录、旧 sweep/rescore/semantic probe、模型 runner、正式 development、G0、
hidden 或任何 GR2D 之外的实验。

## 10. 回执与停止条件

回执必须给出：branch/worktree/commit/唯一 parent、七个 changed paths、三份 source SHA 与完整输入
闭包、candidate SHA、三重逆投影、四器材隔离复跑、前三份 accepted 锚、combined 完整 gate/confusion/
四元组/delta/safety、changed-set overlap、两种 context effect、逐字段 equality 分类、action-hit/M1/
因果闭包、metamorphic drift、负测逐类退出码、五份产物 SHA 与三条目标命令原始结论。

提交后立即停止并返回 owner。不得 merge/tag/push，不得把 combined candidate 放入 accepted verifier，
不得创建 GR2E/GR3，不得开始 promotion、freeze、正式运行、G0 或 hidden。
