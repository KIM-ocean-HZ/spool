# Claude Code 任务书 —— Stage 0-a development wave2 · GR2BR1 matcher 身份隔离纠正

> **状态：ACTIVE — 等待 Claude Code 执行。**
>
> **性质：** GR2B 的最小纠正；保留同一个“未获支持的数量断言” matcher hypothesis，
> 只把数量来源收紧为显式内容字段投影、闭合 identity/gold 数据流隔离，并补齐对应独立验证。
> 不开始 GR2C，不读取或组合 sibling routing candidate，不作 promotion / freeze 决策。
>
> **上次任务书：**
> `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR2B-DEVELOPMENT-WRONG-ACTION-MATCHER-REPAIR-EXPLORATION-2026-09-04.md`

## 1. Redo 原因与唯一目标

GR2B commit `5bbe24954ff40591a0cf59ee1bd9da9301c20ef3` 的拓扑、七文件闭包、
base 复现、逐行读数、负测和三条目标命令均已核对；候选也如实报告了
`unsafe_tradeoff`。但候选不满足原任务书最核心的运行时隔离边界。

`harness/verify_stage0a_v120_wrong_action_matcher_gr2b.py:1140-1162` 的
`_uq_strings()` 对任意 dict 遍历全部 values，随后 `supported_quantities()` 把整个
episode 原对象交给它。钉死的 episode schema 同时含 `episode_id`、`project_id`、
`family`、`gold_actions`、`gold_evidence` 等身份/答案字段。因此候选虽然没有在源码中写出
`episode_id` 标识符，实际仍读取其值并把其中数字纳入“有出处数量”。这与任务书 §4.2
“不能从 gold / identity 决定运行时命中”和产物自报
`reads_gold_or_identity_at_runtime=false` 直接冲突。

独立聚合复核未披露任何正文或身份，得到：

- 去掉 identity / item-gold 顶层字段后，14 个 episode 中 9 个的 supported set 改变；
- 单独去掉 `episode_id`，196 行中 1 行的 `unsupported_quantity_asserted()` 结果改变；
- 只把待判 answer 中出现的数量写进 `episode_id`、其它内容不变，161 个含数量的行中
  12 行最终 wrong-action hit 集合改变，共少 12 个 hit。

这证明身份值能够控制 matcher，而不只是静态上的可疑访问。现有 validator 只扫描新增源码是否
显式含 `episode_id` 等禁用字面量；测试也只构造直接 `episode.get("episode_id")` 特判，无法拦截
经通用递归器间接读取身份的实现。

另有一个必须随本次纠正闭合的验证缺口：generator 与 validator 对 M1
`blocking_wrong_actions` 都只比较 `len(...)`，没有比较排序后的 action-id 集合。当前固定数据的
完整集合复核结果仍是 base 0 行不等、candidate 8 行不等，与已报数量一致；但“同基数、不同内容”
会被现有逻辑误报为相同，不满足逐字段机械等值要求。

GR2BR1 的唯一目标是交付同一 matcher hypothesis 的身份无关实现，并让独立 validator 与负测
证明 identity、gold 和任意未列字段不能影响 supported set、断言谓词或 wrong-action hits；同时
把 M1 blocker 比对改为完整集合等值。不得借纠正搜索第二个机制、调参或美化闸门结果。

## 2. 起点、隔离与提交拓扑

从最后已接受的 GR1R2 重新建立干净 sibling；不得把被退回的 GR2B 纳入 ancestry：

- branch：`stage0a-wave2-wrong-action-matcher-repair-exploration-gr2br1`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-wrong-action-matcher-repair-exploration-gr2br1`
- 唯一 parent：GR1R2 `076a486bdaa111d6aa5654951e6890078afc3874`
- GR2B `5bbe249…`、GR2A `da0bd25…`、GR1 `545f46a…`、GR1R1 `a24fe3e…` 与未接受的
  D2–D2R3 均不得在 ancestry。

branch 与 worktree 当前均未占用；若执行时发现任一已存在，立即停止并回报，不删除、不覆盖、
不猜测可复用性。

允许只读参考 GR2B 的七个新增文件，但不得 cherry-pick GR2B，也不得把它的 JSON / REPORT
作为本次读数来源。实现与产物必须从 GR1R2 输入闭包独立重建。不 merge、tag、fetch、pull、push。

相对 GR1R2 仍须恰七个 `A` 路径，路径集合与 GR2B 相同：

```text
harness/verify_stage0a_v120_wrong_action_matcher_gr2b.py
harness/verify_wrong_action_matcher_repair_exploration_wave2.py
posthoc/stage0a-development-wave2-wrong-action-matcher-repair/explore_wrong_action_matcher_repair_wave2.py
posthoc/stage0a-development-wave2-wrong-action-matcher-repair/test_wrong_action_matcher_repair_wave2.py
posthoc/stage0a-development-wave2-wrong-action-matcher-repair/WRONG-ACTION-MATCHER-REPAIR-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-wrong-action-matcher-repair/WRONG-ACTION-MATCHER-REPAIR-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-wrong-action-matcher-repair/CHECKSUMS-WRONG-ACTION-MATCHER-REPAIR-stage0a-development-wave2.sha256
```

这是 GR2B replacement，保留上述路径名；candidate 身份改为
`v1.20-wrong-action-matcher-gr2br1`，provenance 记为 `GR2BR1`。原 v1.20 与所有 accepted 文件
仍不得修改。posthoc 目录恰五项，CHECKSUMS 只登记 analyzer、test、JSON、REPORT 且不自列。

## 3. 必须纠正的 candidate 数据流

保留一个且仅一个机制：对 `error_class == fabrication`，若 answer 在既有三道断言门之后主张了
一个内容材料中没有出处的规范化数量，则新增该 wrong-action hit。阿拉伯数字/汉语数词规范化、
三道门、matcher 插入位置与 additive 行为可以保留；不得换成第二个 hypothesis。

`supported_quantities()` 必须改为**显式、封闭、逐叶字段投影**，不得把原 episode dict、任意
sub-dict 或 `dict.values()` 交给通用递归字符串收集器。允许进入数量来源的只能是语义内容叶：

- `live_task` 与 `visible_events[]` 的文本；
- `project_history.through_line`；
- `memory_state.items[]` 中实际承载记忆语义的 `content`、`conflict_note`、`guide_type_note`；
- `rubric.pass_rule`、`rubric.components[].means`、`rubric.components[].accept_variants[]`；
- `wrong_actions[].means`、`wrong_actions[].example_phrasings[]`；
- `acceptable_rewrites[]`；
- `tool_fixtures` 中明确的 case `args` / `returns` 内容。

不得读取或把下列值纳入 supported set：任何层级的 id / identity / join / evidence id、
`episode_id`、`project_id`、`family`、`domain`、`polarity`、`_revision`、`gold_actions`、
`gold_evidence`、`trap_tags`、`verifier`、`allowed_tools`、memory linkage/provenance/time 字段、
wrong-action/component 的 `id`，以及 schema 中未显式列入上方白名单的新字段。`error_class` 只可
用于决定当前 wrong action 是否属 fabrication，不得作为 supported-number 文本来源。

必须有 fail-closed shape 校验：被允许叶的类型不合预期时净化失败，不能退回全对象递归；出现
未知 schema 字段可以忽略，但其值不得影响 matcher。candidate 仍不得读取 adjudicated gold、arm、
model、run/blind id、case alias 或目标集合。

## 4. 必须新增的独立不变性证明与负测

generator 与独立 validator 都必须从各自源码中的字段投影常量/逻辑重建以下证明；validator
不得 import analyzer 或读取 analyzer 的常量/helper：

1. 在全部 196 行上，复制对应 episode，只改 identity / gold / 未列字段为含任意阿拉伯数字与
   汉语数词的值；`supported_quantities`、`unsupported_quantity_asserted` 与最终
   `wrong_actions_hit` action-id 集合必须逐行不变。
2. 单独对 `episode_id` 做数值型 identity mutation；当前 GR2B 会出现的“12 行 / 12 hit 漂移”
   在 GR2BR1 必须为 0。只输出聚合计数，不输出被改值、行身份或正文。
3. 对 `gold_actions` / `gold_evidence` 做同类 mutation，三层结果也必须全部为 0 drift。
4. 加入一个未列 top-level dict 与一个未列 nested field，证明未来 schema 扩展不会被通用递归
   悄悄吸入 supported set。
5. 独立 validator 必须把上述 drift=0 作为硬条件，并把精确聚合与 JSON / REPORT 对齐；不得只
   验证待验产物自报的 `reads_gold_or_identity_at_runtime=false`。

测试须保留 GR2B 原有负测，并新增至少两类真实回归：

- 直接对正式 candidate 做上述内存 metamorphic 测试；任何一个 identity/gold/unknown mutation
  改变 hit 集合即失败；
- 在临时 validator sandbox 中把 candidate 改回“遍历整个 episode values”的间接身份读取，
  绕过 candidate SHA 后黑盒运行独立 validator，控制组退出 0、篡改组必须退出 2。测试不能只放
  一个显式 `episode.get("episode_id")` 字面量让静态 banned-token 扫描抓住。

错误输出仍只能含净化阶段名/字段名。测试与 validator 不得输出真实身份、数量、正文、model 或
绝对路径。全部 mutation 只在内存或 `TemporaryDirectory()`，不得改工作树文件。

## 5. M1 blocker 必须按完整内容比较

generator 与独立 validator 对每行 `blocking_wrong_actions` 必须比较规范化后的完整 action-id
集合（或排序列表），不能只比较长度。base vs M1 必须完整集合零不等；candidate vs M1 的差异行
按完整集合统计。

新增一个合成单元负测：M1 与 rebuilt blocker 列表长度相同但 action id 不同，比较器必须判为
mismatch。不得为了做该测试修改任何正式 M1 输入。

## 6. 读数与报告纪律

GR2BR1 必须重新从钉死输入跑 196 行；不得复制 GR2B 的 JSON / REPORT 数值，也不得把旧读数当作
必须保持的目标。以下只有 base 是固定验收锚：

- base M1 完整字段 mismatch 0；G1 `49/53`（unrouted 4）、G2 `82/196`、
  G3 `16.07pp`、G4 `1`；违约量 `(4, 4, 6.0714, 1)`；
- matcher 非目标字段逐行零漂移，candidate patch 逆变换仍逐字节还原 accepted v1.20；
- `GR2B-G4-01` 仍必须由 matcher hit、`blocks_pass=true` 导致 `pass → wrong`；若在合法字段投影下
  做不到，停止并如实回报，不得恢复 identity/gold 读取；
- candidate 的 changed/action-hit、true/false-added、still-missed、confusion、各 arm、G1–G4、
  四元组、M1 完整字段差异和安全分类全部重新机械计算，任何变化都保留；
- 结论仍只能是 `safe_improvement`、`unsafe_tradeoff` 或 `no_effect`。

JSON / REPORT 必须列出精确内容字段投影、明确排除的 identity/gold 字段、metamorphic drift 聚合、
实际实现的 hypothesis 数量与纠正过程。`reads_gold_or_identity_at_runtime=false` 只有在独立证明
通过后才可写。样本外、其它 hypothesis、与 GR2A 的相对选择、组合结果和 freeze 继续写
`underdetermined`；不得出现 GR2A 数值或两轨排序。

报告首尾仍为：

```text
WRONG-ACTION MATCHER REPAIR EXPLORATION ONLY — sibling routing track not compared
MATCHER TRACK COMPLETE — do not promote before owner comparison
```

## 7. 读取面与绝对边界

除允许只读参考被退回 GR2B 七文件外，读取面与原 GR2B 任务书 §5 完全相同。继续禁止 hidden
（不 stat/hash/list/read）、`raw_outputs/`、其它 raw run、未登记 trace、GR2A candidate/产物、
联网、安装依赖、模型/API 调用、新费用、正式运行、旧 sweep/rescore/semantic probe、修改原
v1.20 / gold / rubric / runner、merge/tag/push、GR2C、组合 repair、promotion 与 freeze。
不得调用 subagent。

## 8. 目标命令、commit 与停止条件

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-wrong-action-matcher-repair/test_wrong_action_matcher_repair_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-wrong-action-matcher-repair/explore_wrong_action_matcher_repair_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_wrong_action_matcher_repair_exploration_wave2.py
```

默认 Python 无 pytest 时可用机器已有环境；禁止联网安装。三条全绿后只提交一次：

```text
posthoc(stage0a): make GR2B matcher identity-independent (GR2BR1)
```

回执除原 GR2B 要求的拓扑、SHA、读数和边界外，必须给出：显式字段投影位置、identity/gold/unknown
三类 metamorphic drift 的聚合、绕过 SHA 的间接递归篡改负测、M1 同基数异内容负测，以及新的
candidate 数值（不得假定等于 GR2B）。提交后立即停止；不得开始 GR2C 或任何比较。
