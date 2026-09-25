# Claude Code 任务书 —— Stage 0-a development wave2 · GR2A review-routing 单轨修闸探索

> **状态：ACTIVE — 等待 Claude Code 执行。**
>
> **性质：** owner 已授权的双面修闸探索之第一条、且仅第一条轨道；只把 GR1R2 已登记的
> `review_routing` / `CF-DROP-K4` 候选实际化并在钉死的 196 条 development 证据上机械复核。
> 本任务不碰 `wrong_action_matcher`，不合并两条轨道，不作 promotion / freeze 决策。
>
> **授权来源：** owner 2026-09-04 明确授权 development-only 双面探索；允许读取和修改 v1.20
> verifier、使用已钉死的 196 条 development 证据机械复核；继续禁止 hidden、模型/API 调用、
> 新费用、未登记 raw、正式运行、freeze、merge/tag/push。

## 1. 为什么先做 GR2A

已接受的 GR1R2 commit `076a486bdaa111d6aa5654951e6890078afc3874` 独立重建出两个不同面：

- 唯一安全的预注册反事实 `CF-DROP-K4` 指向 `review_routing`；
- 唯一 G4 failure surface 指向 `wrong_action_matcher`。

owner 要求两面分开验证、不得未经证据直接合并。因此整个授权按三个独立任务推进：

1. **GR2A（当前）**：routing-only；
2. **GR2B（GR2A 验收后另发）**：matcher-only，仍从 GR1R2 建 sibling branch，不以 GR2A 为 parent；
3. **GR2C（两轨均验收后另发）**：comparison-only，只比较两轨证据，不合并 verifier 修改。

本任务的唯一问题是：把 v1.20 的 R2 / k4 路由分支拿掉形成一个隔离候选后，真实 verifier 输出
是否逐行精确等于 GR1R2 的 `CF-DROP-K4` 机械反事实，且除 routing 字段外没有任何行为漂移。

## 2. 起点、branch、worktree 与提交拓扑

- accepted parent：GR1R2 `076a486bdaa111d6aa5654951e6890078afc3874`
- branch：`stage0a-wave2-review-routing-repair-exploration-gr2a`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-review-routing-repair-exploration-gr2a`
- 必须从上述 commit 直接新建；最终交付 commit 的唯一 parent 必须恰为 GR1R2。
- GR1 `545f46a…`、GR1R1 `a24fe3e…`、未接受的 D2–D2R3 与任何 GR2B / matcher 试验均不得
  出现在 ancestry。
- 不 cherry-pick 未接受提交；不 merge、tag、fetch、pull、push。

提交前 worktree 必须 clean；只提交一次，message 必须为：

```text
posthoc(stage0a): evaluate review-routing repair candidate (GR2A)
```

## 3. 唯一允许的 changed paths

相对 GR1R2 恰七个新增路径，任何已有文件都不得修改：

```text
harness/verify_stage0a_v120_review_routing_gr2a.py
harness/verify_review_routing_repair_exploration_wave2.py
posthoc/stage0a-development-wave2-review-routing-repair/explore_review_routing_repair_wave2.py
posthoc/stage0a-development-wave2-review-routing-repair/test_review_routing_repair_wave2.py
posthoc/stage0a-development-wave2-review-routing-repair/REVIEW-ROUTING-REPAIR-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-review-routing-repair/REVIEW-ROUTING-REPAIR-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-review-routing-repair/CHECKSUMS-REVIEW-ROUTING-REPAIR-stage0a-development-wave2.sha256
```

候选 verifier 必须由 accepted `harness/verify_stage0a_v120.py` 的同字节副本起步。允许的源码差异
只有：候选身份说明 / `CANDIDATE_VERSION`，以及删除 R2 的
`outcome == "refused" and not blockers and _is_trailing_hedge_refusal(short)` 路由分支。
R2 helper 可保留为未调用参考；不得改 k1/k2/k3/k5/k6、pass/outcome、component matcher、
wrong-action matcher、suppression、mandatory、trace、阈值、词表、gold、rubric、题目源或 runner。

原始 `harness/verify_stage0a_v120.py`、既有 tests、GR1R2 五份 posthoc 产物与所有 accepted 文件
必须保持逐字节不变。隔离候选不能覆盖或冒充 v1.20，也不得被任何正式 runner 导入。

posthoc 目录必须恰五项；CHECKSUMS 只登记 analyzer、test、JSON、REPORT 四项且不得自列。

## 4. 读取面与数据闭包

只允许使用 GR1R2 已钉死并验证的 development 输入闭包：

- wave2 `rows.jsonl` 与同一 run 的 CHECKSUMS；
- 由这 196 个 `run_id` 精确构造、且已由该 CHECKSUMS 登记的 196 份 trace；
- `items/stage0a/episodes-development.json`；
- U1 adjudicated development gold 及其 CHECKSUMS；
- M1 labels 及其 CHECKSUMS；
- D1、D2R4 产物及各自 CHECKSUMS；
- v1.20 / v1.19 / `verify2.py` 与 v1.20 freeze HASHES；
- 已接受的 GR1R2 JSON、REPORT、CHECKSUMS 与 candidate verifier 源码。

所有输入 SHA 必须由 analyzer 重新核验，并在 JSON 中完整登记；上游 CHECKSUMS 的登记值必须
交叉核对，不能只信本任务常量。candidate verifier SHA 必须进入 JSON，并由独立 validator
用自身常量再钉一次。

禁止目录遍历或 glob `raw/`；只可先读钉死 rows，再按恰好 196 个 `run_id` 构造 trace 路径。
禁止 `raw_outputs/`、其它 raw run、未登记 trace 与 hidden；不得 stat/hash/list hidden。

答案与 trace 正文只可在进程内喂给 base / candidate verifier 做机械重算。不得打印、抛入异常、
写入 JSON/REPORT/test id，亦不得输出 run/blind/episode id、模型、逐行 arm、答案摘要、join key、
绝对路径或时间戳。不得人工摘录真实答案来给规则开单题特例。

## 5. 必须完成的逐行机械复核

对同一 196 行分别调用 accepted v1.20 base 与 routing-only candidate。gold 只在离线 analyzer 中
计算 gates，绝不得进入 verifier 运行时。必须逐行证明：

1. 除 `verifier_version`、`needs_review`、`review_reason` 外，candidate verdict 的所有字段与 base
   精确相同；尤其 `pass`、`outcome`、components、wrong actions、suppression、trace、mandatory
   不得改变。
2. candidate `needs_review` 必须等于 base 六口中的 `OR(k1,k2,k3,k5,k6)`，不能从 GR1R2 JSON
   抄最终布尔值。
3. changed set 必须恰为 base 中 k4 独占的 5 行：按聚合只能披露为 A0 5、其它 arm 0；baseline
   outcome 为 refused 5、其它 outcome 0。不得披露行身份。
4. candidate 的整行 needs-review 向量必须与 GR1R2 `CF-DROP-K4` 独立重建向量逐格相同；只比
   总数不算闭合。
5. accepted base 必须仍复现 GR1R2 基线，且 M1 agreement mismatch 0；在 M1 已登记的核心机器
   标签字段中，candidate 与 M1 的差异只能是预期的 5 个 `machine_needs_review`，不得把 M1
   改写成候选真值。

候选的 gate 结果必须精确复现 GR1R2 已预注册读数：

| 项 | routing-only candidate |
|---|---|
| G1 | `49/53`，unrouted `4`，fail |
| G2 | `77/196 = 0.3929`，pass |
| G3 | A0 `19/56`、A1 `22/56`、A2 `27/56`、A3 `9/28`；spread `16.07pp`，fail |
| G4 | `1`，fail |
| violation quadruple | `(4, 0, 6.0714, 1)` |
| 相对基线 | 逐项不增且 G2 严格下降，`safe_improvement=true` |

这只证明当前 wave 上 G2 转绿；不得写成四闸闭合、freeze-ready、样本外安全或最终应采用。
删 R2 对其它 wave / hidden 的真实漏审代价必须明确保留为 `underdetermined`。

## 6. 产物最低内容

JSON 与 REPORT 至少须包含：授权/禁止声明、全部输入 SHA、base 与 candidate 身份、候选源码差异
白名单、196 行闭包、逐字段等值证明、changed-set 聚合、base/candidate G1–G4、精确违约量四元组、
GR1R2 预测一致性、M1 差异边界、泄露检查及 `underdetermined` 清单。

报告必须首行写明：

```text
REVIEW-ROUTING REPAIR EXPLORATION ONLY — sibling matcher track not evaluated
```

末行必须为：

```text
ROUTING TRACK COMPLETE — do not promote before sibling matcher track and owner comparison
```

不得出现“推荐合并”“已选定最终 repair surface”或任何 GR2B 结果。GR2A 只给该轨自身证据。

## 7. 独立 validator 与负测

`harness/verify_review_routing_repair_exploration_wave2.py` 不得 import analyzer 或读取其常量/helper；
必须自有输入指纹、R2/k4 定义、六口公式、G1–G4、违约量四元组、changed-set 与报告关键块重建。
它可以导入 accepted base 和 candidate 作为待比较器材，但不能相信产物自报的向量、gates 或 safe。

测试必须在 `tempfile.TemporaryDirectory()` 中复制产物、同步重签 CHECKSUMS，再黑盒调用独立
validator `main()`，至少证明下列篡改均退出 2：

- 把 changed rows 从 5 改成别的值，或挪到别的 arm/outcome；
- 把任一非 routing verdict 字段伪造成发生变化；
- 把 candidate gates、违约量或 `safe_improvement` 改成更好结论；
- 把 candidate 源码换成同时修改 matcher 的版本；
- 报告单独写成“四闸闭合”或删除 `underdetermined`，JSON 保持正确；
- 添加额外产物、CHECKSUMS 漏项/多项/自列或输入 SHA 漂移。

每条负测先跑 byte-identical 控制组且退出 0；错误输出只能含净化阶段/字段名，无 traceback、身份、
正文、模型或绝对路径。全部临时篡改后，工作树五份 posthoc 产物 SHA 必须与 import 时快照一致。

## 8. 目标验证命令

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-review-routing-repair/test_review_routing_repair_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-review-routing-repair/explore_review_routing_repair_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_review_routing_repair_exploration_wave2.py
```

默认 Python 无 pytest 时可用机器已有环境；禁止联网安装。禁止运行 `pytest harness/` 整目录、
旧 sweep / semantic probe、旧 rescore、模型 runner、正式 development、G0 或 hidden。

## 9. 回执与停止条件

回执必须给出：branch/worktree/commit/唯一 parent、七个 changed paths、候选与 base 的源码差异位置、
逐字段不漂移证明、5 行 changed-set 聚合、base/candidate 全部 gate 数值、违约量四元组、GR1R2
向量逐格一致结果、新增负测逐类退出码、五产物 SHA 与三条目标命令原始结论。

提交后立即停止。不得创建 GR2B、不得修改 matcher、不得把 GR2A merge 回任何 accepted branch，
不得开始 comparison、promotion、freeze、正式运行或 hidden。下一步只能由 Codex 验收后另发。
