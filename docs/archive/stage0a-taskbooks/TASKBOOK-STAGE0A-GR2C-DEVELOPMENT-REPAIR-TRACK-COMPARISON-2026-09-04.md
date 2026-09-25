# Claude Code 任务书 —— Stage 0-a development wave2 · GR2C 隔离修闸轨比较

> **状态：COMPLETED — 原 GR2C `8e9cd645…` verdict `Redo`；GR2CR1 `eb190849…` 已于 2026-09-04 验收为 `Accept`。后续见 GR2D。**
>
> **后续任务书：**
> `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR2D-DEVELOPMENT-COMBINED-REPAIR-EXPERIMENT-2026-09-05.md`
>
> **性质：** owner 在 GR2A 与 GR2BR1 均验收后授权的 comparison-only 收口任务。
> 只比较两条已接受 sibling 轨的钉死聚合证据；不创建组合 verifier、不重跑 196 行、
> 不改任一候选、不作 promotion / freeze 决定。
>
> **授权来源：** owner 于 2026-09-04 在 Codex 接受 GR2BR1 后明确“授权下一步”。
> 该授权只打开既定 GR2C，不扩展到 hidden、模型/API 调用、费用、正式运行、组合试验或 freeze。

## 1. 唯一问题与输入事实

GR1R2 把当前四红闸归到两个不同 repair surface；owner 要求先分轨实测，再比较证据：

- routing-only：GR2A `da0bd254edc267bbd3d4536fb751c6aabb8c39e0`，已接受；
- matcher-only：GR2BR1 `fae90ecfeed723748b80566b94d473cf25e45d0c`，已接受；
- 两者唯一 parent 都是 GR1R2 `076a486bdaa111d6aa5654951e6890078afc3874`，彼此不在 ancestry。

被退回的 GR2B `5bbe24954ff40591a0cf59ee1bd9da9301c20ef3` 不是比较输入。它只保留为历史
`Redo` 证据；不得用它替代 GR2BR1、平均两版 matcher 读数或恢复其全对象递归实现。

GR2C 只回答：在同一 accepted base、同一 gate 定义和同一违约量规则下，两条**已独立验证**的
单轨证据各改善了什么、恶化了什么、哪些结论仍无法从边际证据推出。它不回答组合后会怎样，
也不替 owner 决定下一项实验。

## 2. 起点、branch、worktree 与提交拓扑

- parent：GR1R2 `076a486bdaa111d6aa5654951e6890078afc3874`
- branch：`stage0a-wave2-repair-track-comparison-gr2c`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-repair-track-comparison-gr2c`
- 当前已核：branch 与 worktree 均不存在；若执行时发现任一已存在，立即停止，不删除、不覆盖、
  不猜测可复用性。
- 最终交付 commit 的唯一 parent 必须恰为 GR1R2；GR2A、GR2BR1、被退回 GR2B、GR1/GR1R1、
  未接受 D2–D2R3 与任何组合试验都不得进入 ancestry。
- 只允许通过本地 git object 读取下面钉死的两个 sibling commit；不得 cherry-pick、merge、
  rebase、tag、fetch、pull 或 push，也不得依赖 sibling worktree 的当前 branch/status。

三条比较产物验证全绿后只提交一次，message 必须为：

```text
posthoc(stage0a): compare isolated repair tracks (GR2C)
```

## 3. 唯一允许的 changed paths

相对 GR1R2 必须恰六个新增路径，0 个已有文件修改：

```text
harness/verify_repair_track_comparison_wave2.py
posthoc/stage0a-development-wave2-repair-track-comparison/compare_repair_tracks_wave2.py
posthoc/stage0a-development-wave2-repair-track-comparison/test_repair_track_comparison_wave2.py
posthoc/stage0a-development-wave2-repair-track-comparison/REPAIR-TRACK-COMPARISON-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-repair-track-comparison/REPAIR-TRACK-COMPARISON-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-repair-track-comparison/CHECKSUMS-REPAIR-TRACK-COMPARISON-stage0a-development-wave2.sha256
```

本任务**没有 candidate verifier**。不得新增、复制、生成或修改任何 `verify_stage0a_v120_*`
候选；不得把两条候选源码拼接到同一个文件，也不得让正式 runner 导入任一候选。

posthoc 目录必须恰五项；CHECKSUMS 只登记 comparator、test、JSON、REPORT 四项且不得自列。
原 v1.20、GR2A/GR2BR1 七文件、所有 accepted 文件与输入必须逐字节不变。

## 4. 唯一读取面：两个 accepted commit 的钉死对象

比较器只能用本地 `git show <commit>:<exact-path>` / `git cat-file` 读取下面 14 个精确对象；
不得按 branch 名读取，不得遍历 sibling worktree，不得 glob 仓库或读取 raw/development 正文。

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

比较器与独立 validator 都必须自行验证：两 commit 存在、唯一 parent 都是 GR1R2、各自相对
GR1R2 恰一笔提交 / 七个 `A` / 0 个 `M`，14 个对象 SHA 全等，且各自 CHECKSUMS 的四项闭包成立。
对象、拓扑或 SHA 任一不等立即失败，不得降级为信任报告文本。

禁止读取：196 行 rows/trace/answer、episode/gold/M1 正文、GR2A/GR2BR1 工作树、被退回 GR2B
的七文件、`raw_outputs/`、其它 raw run、未登记 trace、hidden、模型输出或任何逐行身份。
两条单轨已经各自完成独立重建；GR2C 不重跑它们，也不把聚合比较伪装成第三次 verifier 运行。

## 5. 必须机械重建的比较矩阵

两个输入 JSON 的 base 必须先逐格相等，并同时复现 GR1R2：

| track | G1 | G2 | G3 | G4 | 违约量四元组 |
|---|---|---|---|---|---|
| base | `49/53`（unrouted 4） | `82/196` | `16.07pp` | `1` | `(4, 4, 6.0714, 1)` |
| GR2A routing-only | `49/53`（unrouted 4） | `77/196` | `16.07pp` | `1` | `(4, 0, 6.0714, 1)` |
| GR2BR1 matcher-only | `62/66`（unrouted 4） | `96/196` | `19.64pp` | `0` | `(4, 18, 9.6429, 0)` |

必须用精确整数 / 有理数重建，显示值只用于报告：

- GR2A 相对 base delta：`(0, -4, 0, 0)`；逐项不增且至少一项下降，分类
  `safe_improvement`。
- GR2BR1 相对 base delta：`(0, +14, +25/7, -1)`；G4 改善，但 G2/G3 上升，分类
  `unsafe_tradeoff`。
- 两候选相互比较：GR2A 在 G2/G3 违约量更小，GR2BR1 在 G4 更小，G1 持平；
  **任一方都不 componentwise dominate 另一方**。
- 两候选都仍有三个红闸；该数量相同不等于风险或价值相同。
- G1 的分母在 base / GR2A 为 `53`、在 GR2BR1 为 `66`，必须完整报告，不能只拿 coverage 百分比或
  unrouted 数做模糊排序。

除 gate / 四元组外，还须从钉死 JSON 重建并并列展示证据边界：

- GR2A：196 格 counterfactual vector mismatch 0；除 routing 允许字段外 18 字段漂移 0；
  changed rows 5，全部 A0 / baseline refused；M1 仅 `machine_needs_review` 5 格差异。
- GR2BR1：16 个显式内容叶；5 类 × 2 payload × 3 层 metamorphic drift 全 0；
  整对象递归阳性对照 1510；matcher 不变量 11 字段漂移 0；因果闭包 unexplained 0；
  changed rows 26、added hits 32、true-added 3、false-added 29、removed 0；
  M1 差异为 blocking 26 / pass 14 / outcome 14 / needs_review 14 / mandatory 0。

不得把两轨的 changed row 聚合当作可 join 的逐行数据；输入产物没有授权披露交集，故 changed-set
overlap、同一行上的先后作用、组合后的 G1–G4 / confusion / M1 差异全部必须是
`underdetermined`，不能用 `5 + 26`、delta 相加或“不同 repair surface”来假设独立。

## 6. 允许的结论与 owner-decision 边界

JSON / REPORT 必须明确给出且仅给出以下机械结论：

1. GR2A 是当前 development wave 上相对 base 的 componentwise safe improvement，只让 G2 转绿；
   它没有修复 G1/G3/G4，也不证明样本外删除 R2 安全。
2. GR2BR1 捕获唯一 G4 target、让 G4 转绿，但以 G2/G3 明确恶化为代价；按预注册规则是
   `unsafe_tradeoff`，不是可直接 promotion 的 standalone repair。
3. 两轨在违约量上互不支配；当前证据没有给出一个“四闸闭合”的单轨候选。
4. 组合结果、相互作用、执行顺序、样本外行为、false-added 的真实代价、最终 repair surface、
   promotion 与 freeze 全部 `underdetermined`。
5. GR2C 完成后返回 owner；任何新 matcher hypothesis、组合 development experiment、gate 规则
   变更、正式运行或 hidden 都需要新的明确授权。

报告首行必须为：

```text
REPAIR TRACK COMPARISON ONLY — no combined verifier was built or run
```

报告末行必须为：

```text
GR2C COMPLETE — return to owner for the next decision
```

不得写“应合并”“已选定”“可以 promotion”“freeze-ready”，不得推荐把 GR2A 或 GR2BR1 直接放进
accepted verifier。可以陈述上面的机械 safety 分类和互不支配关系，但不得把它升级为 owner 决策。

## 7. 独立 validator 与真实负测

`harness/verify_repair_track_comparison_wave2.py` 不得 import comparator，也不得读取 comparator 的
常量/helper；必须自己钉住两个 commit、GR1R2 parent、14 个 SHA、两份 JSON schema、gate 定义、
精确四元组、安全分类和 dominance 规则。它只可把 sibling 对象当输入证据，不得 import 或运行
任一 candidate verifier。

测试须在 `TemporaryDirectory()` 中复制 GR2C 五份 posthoc 产物、同步重签 CHECKSUMS，再黑盒运行
独立 validator。至少覆盖：

- 把 GR2A 或 GR2BR1 commit 换成 branch/ref、被退回 GR2B 或错误 parent，即使同步改 JSON 也退出 2；
- 修改任一 sibling 对象 SHA、漏掉一个七文件路径或伪造 CHECKSUMS 闭包，退出 2；
- 伪造任一 gate、四元组 delta、safety 分类、红闸数量或证据边界，退出 2；
- 把 pairwise 关系伪造成“GR2A dominates GR2BR1”或反向，退出 2；
- 用边际 delta 相加写出 combined gate、changed-row overlap 或组合安全结论，退出 2；
- 只改 REPORT 写成“建议合并 / 已选定 / promotion / freeze-ready”，JSON 保持正确，退出 2；
- 新增 candidate verifier、额外产物、CHECKSUMS 漏项/多项/自列，退出 2。

每条负测必须先跑 byte-identical 控制组并退出 0；错误输出只能含净化后的阶段名、字段名或相对路径，
不得含 traceback、身份、答案、模型、绝对路径或 sibling 正文。全部篡改后，工作树五份产物 SHA
必须与 import 时快照一致。

## 8. 目标命令

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-repair-track-comparison/test_repair_track_comparison_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-repair-track-comparison/compare_repair_tracks_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_repair_track_comparison_wave2.py
```

默认 Python 无 pytest 时可用机器已有环境；禁止联网安装。不得运行 GR2A / GR2BR1 的目标命令，
不得运行 `pytest harness/` 整目录，不得重跑 196 行、旧 sweep/rescore/semantic probe、模型 runner、
正式 development、G0 或 hidden。

## 9. 回执与停止条件

回执必须给出：branch/worktree/commit/唯一 parent、六个 changed paths、两个 accepted input commit
及 14 个 SHA 的闭合结果、base 一致性、三行 gate/四元组矩阵、两条 delta 与 safety 分类、pairwise
互不支配证明、两轨证据边界、全部 `underdetermined` 项、负测逐类退出码、五产物 SHA 与三条目标
命令原始结论。

提交后立即停止并返回 owner。不得创建组合候选、不得修改任一 verifier、不得自动下发下一任务，
不得开始 promotion、freeze、正式运行、G0 或 hidden。
