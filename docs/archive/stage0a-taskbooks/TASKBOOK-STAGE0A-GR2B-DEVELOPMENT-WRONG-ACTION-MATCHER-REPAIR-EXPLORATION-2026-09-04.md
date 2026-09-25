# Claude Code 任务书 —— Stage 0-a development wave2 · GR2B wrong-action matcher 单轨修闸探索

> **状态：COMPLETED — commit `5bbe24954ff40591a0cf59ee1bd9da9301c20ef3` 已验收，verdict `Redo`；后续见 GR2BR1。**
>
> **纠正任务书：**
> `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR2BR1-DEVELOPMENT-WRONG-ACTION-MATCHER-REPAIR-EXPLORATION-CORRECTION-2026-09-04.md`
>
> **性质：** owner 已授权的双面修闸探索之第二条、且仅第二条轨道；从 GR1R2 直接建立
> sibling，只把唯一 G4 `matcher_miss` 对应的 `wrong_action_matcher` 面实际化为一个隔离候选，
> 并在钉死的 196 条 development 证据上机械复核。本任务不继承、不读取、不组合 GR2A
> routing candidate，不作两轨比较、promotion 或 freeze 决策。
>
> **授权来源：** owner 2026-09-04 明确授权 development-only 双面探索；允许读取和修改 v1.20
> verifier、使用已钉死的 196 条 development 证据机械复核；继续禁止 hidden、模型/API 调用、
> 新费用、未登记 raw、正式运行、freeze、merge/tag/push。

## 1. 为什么现在做 GR2B

已接受的 GR1R2 把当前四个红闸拆出两个不同面：

- `CF-DROP-K4` 指向 `review_routing`；GR2A 已把它实际化并验收为当前 wave 上的安全改善，
  但只让 G2 转绿，G1 / G3 / G4 一格未动；
- 唯一 G4 failure case `GR1-G4-01` 被独立分类为 `matcher_miss`，对应
  `wrong_action_matcher`；它不是 suppression 或 `blocks_pass` 声明问题。

两面必须分开验证。GR2B 的唯一问题是：能否用一个不读 identity / arm / gold、也不改 routing、
component matcher、suppression 或判定规则的通用 matcher 机制，捕获这项漏检；然后在全部 196 行上
如实量出新增 wrong-action hits、逐字段影响、G1–G4 与违约量。即使候选带来 trade-off，也必须如实
交付；不得为了得到绿数搜索多个版本、调参网格或加入单题词表。

## 2. 起点、branch、worktree 与提交拓扑

- accepted parent：GR1R2 `076a486bdaa111d6aa5654951e6890078afc3874`
- branch：`stage0a-wave2-wrong-action-matcher-repair-exploration-gr2b`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-wrong-action-matcher-repair-exploration-gr2b`
- 必须从上述 commit 直接新建；最终交付 commit 的唯一 parent 必须恰为 GR1R2。
- GR2A `da0bd254edc267bbd3d4536fb751c6aabb8c39e0` 必须 absent；GR1、GR1R1、未接受的
  D2–D2R3 与任何组合 repair 试验也不得出现在 ancestry。
- 不 cherry-pick GR2A 或未接受提交；不 merge、tag、fetch、pull、push。

提交前 worktree 必须 clean；只提交一次，message 必须为：

```text
posthoc(stage0a): evaluate wrong-action matcher repair candidate (GR2B)
```

## 3. 唯一允许的 changed paths

相对 GR1R2 恰七个新增路径，任何已有文件都不得修改：

```text
harness/verify_stage0a_v120_wrong_action_matcher_gr2b.py
harness/verify_wrong_action_matcher_repair_exploration_wave2.py
posthoc/stage0a-development-wave2-wrong-action-matcher-repair/explore_wrong_action_matcher_repair_wave2.py
posthoc/stage0a-development-wave2-wrong-action-matcher-repair/test_wrong_action_matcher_repair_wave2.py
posthoc/stage0a-development-wave2-wrong-action-matcher-repair/WRONG-ACTION-MATCHER-REPAIR-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-wrong-action-matcher-repair/WRONG-ACTION-MATCHER-REPAIR-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-wrong-action-matcher-repair/CHECKSUMS-WRONG-ACTION-MATCHER-REPAIR-stage0a-development-wave2.sha256
```

候选 verifier 必须由 accepted `harness/verify_stage0a_v120.py` 的同字节副本起步，身份必须为
`v1.20-wrong-action-matcher-gr2b`。允许的语义差异只有一个有界、通用的 wrong-action matcher
补充机制，位置限于 matcher 常量/helper 与 `wrong_actions_hit()`；候选 patch 中不得出现
run/blind/episode/case id、arm、model、gold、真实答案摘录或题目专名，不得按某一项 `w3` id 特判。

必须用固定 patch block 或等价的精确逆变换证明：去候选身份、还原版本、撤掉该 matcher patch 后，
结果与 accepted v1.20 逐字节相同。R2/R3 与其它 routing opening、component matcher、原有
`_v19.wrong_actions_hit` 路径、G5/W1 suppression、`blocks_pass` 映射、pass/outcome 决策、mandatory、
trace、阈值、既有词表、gold、rubric、题目源与 runner 均不得修改。不得导入或复制 GR2A candidate。

原始 v1.20、既有 tests、GR1R2 五份产物与所有 accepted 文件必须逐字节不变。隔离候选不能覆盖或
冒充 v1.20，也不得被任何正式 runner 导入。posthoc 目录必须恰五项；CHECKSUMS 只登记 analyzer、
test、JSON、REPORT 四项且不得自列。

## 4. 候选选择纪律

这是开发集探索，不是假装独立验证。只允许实现并交付**一个**最小 matcher hypothesis：

1. 可以在进程内读取已授权的 development answer、trace、episode rubric 与 adjudicated gold，定位
   `GR1-G4-01` 漏检的结构；不得把正文、真实身份或 join key写入源码、测试名、日志或产物。
2. 机制必须从 rubric 的通用 wrong-action 描述与待判 answer 计算，不能从 gold、arm、identity、
   case alias 或目标集合反向决定运行时命中。
3. 禁止阈值/词表 grid、禁止多个候选择优、禁止旧 sweep / semantic probe / rescore。开发中若试过
   其它方向，全部视为探索草稿，不得提交；最终回执须如实声明试验候选数与选择过程。
4. 最低目标是让唯一 G4 target 的 gold wrong action 被候选命中并成为 blocker；若在不违反上述
   约束下做不到，停止且不伪造成功。全 wave 上出现的任何额外命中或判定变化都必须如实计入，
   不能把不利行排除。
5. 不预设候选必然安全。结论只能按机械结果记为 `safe_improvement`、`unsafe_tradeoff` 或
   `no_effect`；GR2B 不得声称优于 GR2A，也不得推荐最终 repair surface。

## 5. 读取面与数据闭包

只允许使用 GR1R2 已钉死并验证的 development 输入闭包：

- wave2 `rows.jsonl` 与同一 run 的 CHECKSUMS；
- 由这 196 个 `run_id` 精确构造、且由该 CHECKSUMS 登记的 196 份 trace；
- `items/stage0a/episodes-development.json`；
- U1 adjudicated development gold 及其 CHECKSUMS；
- M1 labels 及其 CHECKSUMS；
- D1、D2R4、GR1R2 产物及各自 CHECKSUMS；
- v1.20 / v1.19 / `verify2.py` 与 v1.20 freeze HASHES；
- 本任务新增的隔离 candidate verifier。

GR2A candidate、GR2A JSON/REPORT/CHECKSUMS 不在 GR2B 输入闭包内；不得读取、导入、复制或把其
数值当作本轨基线。所有输入 SHA 必须由 analyzer 重新核验，并在 JSON 中完整登记；上游
CHECKSUMS 的登记值必须交叉核对。candidate SHA 必须进 JSON，并由独立 validator 用自身常量再钉。

禁止目录遍历或 glob `raw/`；先读钉死 rows，再按恰好 196 个 `run_id` 构造 trace 路径。禁止
`raw_outputs/`、其它 raw run、未登记 trace 与 hidden；不得 stat/hash/list hidden。答案与 trace
正文只可进程内参与机械重算，不得进入异常、stdout/stderr、JSON/REPORT/test id；不得输出真实
run/blind/episode id、模型、逐行 arm、答案摘要、join key、绝对路径或时间戳。

## 6. 必须完成的逐行机械复核

对同一 196 行分别调用 accepted v1.20 base 与 matcher-only candidate，并证明：

1. base 仍精确复现 GR1R2：M1 mismatch 0；G1 `49/53`（unrouted 4）、G2 `82/196`、
   G3 `16.07pp`、G4 `1`；违约量 `(4, 4, 6.0714, 1)`。
2. matcher 不变量逐行相同：components 全族、partial credit、trace、mandatory、rubric schema、
   diagnostic evidence、suppressed wrong actions 均零漂移；routing 源码与六口公式逐字节不变。
3. 每个 candidate 新增/移除的 wrong-action hit 均在 196 行上逐 action 机械枚举，并只按聚合披露：
   总行数、总 action 数、error class、base outcome、arm，以及与 adjudicated gold action 的
   true-added / false-added / still-missed；不得披露行身份或正文。
4. `GR1-G4-01` 必须由新增的 matcher hit 捕获 adjudicated `w3`，`blocks_pass=true`，机器判定由
   pass 翻为 fail；证明它不是 routing、suppression 或声明恢复造成的。产物只用 case alias。
5. 对每条 verdict drift 建立因果闭包：先发生 wrong-action hit 差异，随后才允许
   blocking/fabrication/adverse/pass/outcome/needs_review/review_reason/why 的派生差异；任何无法由
   matcher hit 与未改判定规则解释的字段漂移都硬失败。
6. 全量重算 candidate 的 confusion、G1–G4、各 arm、违约量四元组与相对 base 的逐项 delta；
   用精确有理数判断 `safe_improvement`。即使某闸变差也必须保留，不得只报告 G4。
7. M1 保持冻结的 base 标签，不得改写；candidate 与 M1 的所有差异按字段聚合报告。

GR2B 只证明这一 matcher candidate 在当前 development wave 上的实测结果。样本外/hidden 行为、
其它 matcher hypothesis、与 GR2A 的相对选择以及组合后结果全部必须写为 `underdetermined`。

## 7. 产物最低内容

JSON 与 REPORT 至少须包含：授权/禁止声明、全部输入 SHA、base/candidate 身份、候选源码白名单、
候选选择纪律与实际试验候选数、196 行闭包、matcher 不变量、changed-set 与 action-hit 聚合、
唯一 G4 target 的 case-alias 证据、base/candidate confusion 和 G1–G4、违约量四元组、M1 差异、
泄露检查、`safe_improvement`/`unsafe_tradeoff`/`no_effect` 的机械分类及 `underdetermined` 清单。

报告首行必须为：

```text
WRONG-ACTION MATCHER REPAIR EXPLORATION ONLY — sibling routing track not compared
```

末行必须为：

```text
MATCHER TRACK COMPLETE — do not promote before owner comparison
```

不得出现 GR2A 数值、两轨排序、推荐合并、最终 repair surface、四闸闭合或 freeze-ready 结论。

## 8. 独立 validator 与负测

`harness/verify_wrong_action_matcher_repair_exploration_wave2.py` 不得 import analyzer 或读取其
常量/helper；必须自有输入指纹、候选 SHA/patch 逆变换、base 读数、逐 action matcher delta、
字段因果闭包、G1–G4、四元组、M1 边界与报告关键块重建。它可以导入 base/candidate 作为待比较
器材，但不能相信产物自报的 changed set、gates、precision 或安全分类。

测试必须在 `tempfile.TemporaryDirectory()` 中复制产物、同步重签 CHECKSUMS，再黑盒调用独立
validator `main()`；每条负测先跑 byte-identical 控制组且退出 0，至少证明下列篡改均退出 2：

- 候选源码夹带 routing / component / suppression / threshold / identity 特判，或绕过 SHA 后仍不
  能通过 patch 逆变换；
- 伪造 G4 target 已命中、伪造 added hit 的 true/false 聚合，或把不利 changed row 隐去；
- 伪造非 matcher 不变量、从逐字段比对集合删字段，或伪造 downstream 因果闭包；
- 把 confusion、任一 gate、四元组、M1 差异或安全分类改成更好结论；
- 报告单独写入两轨排序/可合并/可冻结，或删除 `underdetermined` 与 development-only 警示；
- 添加额外产物、CHECKSUMS 漏项/多项/自列、输入 SHA 漂移或候选 SHA 漂移。

错误输出只能含净化阶段/字段名，无 traceback、身份、正文、模型或绝对路径。全部临时篡改后，
工作树五份 posthoc 产物与隔离候选 SHA 必须和测试 import 时快照一致。

## 9. 目标验证命令

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

默认 Python 无 pytest 时可用机器已有环境；禁止联网安装。禁止运行 `pytest harness/` 整目录、
旧 sweep / semantic probe / rescore、模型 runner、正式 development、G0 或 hidden。

## 10. 回执与停止条件

回执必须给出：branch/worktree/commit/唯一 parent、七个 changed paths、base/candidate 源码差异位置、
候选机制的通用性说明与实际试验候选数、matcher 不变量、changed/action-hit 聚合、G4 target 的
case-alias 结果、base/candidate confusion 与全部 gate 数值、违约量和安全分类、M1 差异、负测逐类
退出码、五产物 SHA 与三条目标命令原始结论。

提交后立即停止。不得读取或继承 GR2A candidate，不得组合两轨，不得创建 GR2C，不得 merge 回
任何 accepted branch，不得开始 comparison、promotion、freeze、正式运行或 hidden。下一步只能
由 Codex 验收后另发。

## 11. 独立验收 —— 2026-09-04

### 11.1 已核通过

- branch / worktree / commit / 唯一 parent 与任务书一致；相对 GR1R2 恰一笔提交、七个 `A` 路径，
  GR2A、GR1/GR1R1 与 D2–D2R3 均不在 ancestry；worktree clean；
- candidate 相对 accepted v1.20 只有身份行 replace 与 matcher 区间内两块 / 124 行 insert，
  逆变换逐字节还原；routing / suppression / `score_episode` 等锚点全等；
- 固定数据重建与回执一致：8 行 / 8 added hit、true-added 3 / false-added 5；base 四闸
  `49/53、82/196、16.07pp、1`，candidate `51/55、85/196、16.07pp、0`，分类
  `unsafe_tradeoff`；G4 target 由 UQ hit 与既有 `blocks_pass=true` 翻为 wrong；
- 默认 `python3` 无 pytest；使用机器已有 `/opt/anaconda3/bin/python3` 得到 `46 passed`；
  analyzer `--check-existing` 三份 byte-identical，独立 validator `PASS`；运行后 SHA 与工作树未漂移。

### 11.2 Findings

1. **Blocking — candidate 实际读取 identity / item-gold 字段。**
   `_uq_strings()` 递归遍历原 episode 的全部 values，故 `episode_id`、`gold_actions` 等未被隔离。
   聚合 metamorphic 复核证明只改数值型 identity 即可改变 12 行 / 12 个最终 hit；产物自报
   `reads_gold_or_identity_at_runtime=false` 不成立，违反 §4.2。
2. **Validation gap — M1 blocker 只比长度。** generator 与 validator 均用 `len(...)` 比较
   `blocking_wrong_actions`，不能拒绝同基数、不同 action-id 的内容漂移；固定数据的独立完整集合
   复核仍为 base 0 / candidate 8，不改变本次读数，但验证没有按任务书闭合。

### 11.3 Verdict

`Redo`

只下发 GR2BR1 身份隔离纠正；GR2C 继续未开放。GR2B commit 保留为被退回证据，不进入 accepted
chain，不得作为纠正任务的 parent。
