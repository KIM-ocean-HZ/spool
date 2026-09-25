# Claude Code 任务书 —— Stage 0-a development wave2 · GR4 G1 零口子假阴性定界

> **状态：COMPLETE — Codex 验收 verdict：`Accept`。**
>
> **后续：** 当前无可执行实验任务，返回 owner decision；未创建或下发 GR5，未定义、命名或实现 k7。
>
> **验收摘要：** 提交 `624055f9e41ff3e642744b3b351fa8dc1cac871d` 的唯一 parent、六路径闭包、
> 两套独立 target 重建、集合代数、结构化聚合、sealed-union 正文访问闸、净化边界与三条目标命令
> 均闭合；Codex 独立复跑得到 `93 passed in 303.81s`，analyzer 与 validator 均 `PASS`，测试后
> worktree clean、tag 为 0、六文件 SHA 无漂移。
>
> **性质：** GR3R1 已证明 `{MB,MU} × P({k1..k6})` 的封闭机制族始终被 G1 阻断；两条 matcher
> 轴在 full mask 下各有 4 条 `mandatory=false ∧ k1..k6=false` 的 false negative。本任务只把这些
> zero-opening FN 的集合关系、现有结构化失效面和受限内容特征定界清楚，供 owner 决定是否另行授权
> 第七个 routing 信号。它不发明信号、不创建 candidate、不修改 verifier、不作 promotion / freeze。
>
> **授权来源：** owner 于 2026-09-05 明确“批准根据文档下发后续任务”。Codex 将该授权收敛为
> 一个最小、development-only 的 GR4，并只开放对机械筛出的 target union 做受控正文复核；继续禁止
> hidden、模型/API 调用、费用、正式运行、阈值变更、candidate、promotion、freeze、merge/tag/push。
>
> **前序完整基线：** 先完整读取
> `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR3R1-DEVELOPMENT-CLOSED-REPAIR-FAMILY-INVERSE-PROJECTION-CLOSURE-2026-09-05.md`。
> 其中输入 SHA、accepted objects、隔离规则、净化要求与禁止项继续生效；本任务只新增下述定界面。

## 1. 唯一问题与完成定义

GR3R1 的 accepted 结论是：MB 与 MU 两轴的 `min_G1_unrouted=4`，且这 4 条在 full mask 下仍是
false negative、`mandatory_blind_review=false`、六个既有 opening 全 false。因此，继续排列六个
opening 已不可能让 G1 通过。

GR4 只回答三个问题：

1. MB 与 MU 各 4 条 zero-opening FN 是同一集合、部分重叠还是不同集合；
2. 它们在冻结的 arm、machine verdict、rubric component、wrong-action 与 adjudicated development
   gold 结构化字段上呈现什么聚合形状；
3. 对机械筛出的 union 做一次受限正文复核后，哪些现象只能作为探索性观察，哪些仍为
   `underdetermined`。

完成定义：两套独立实现从钉死输入重新运行 MB / MU 器材并逐行重建 target sets；集合关系和全部
结构化聚合机械闭合；正文访问被运行时 guard 限定在 target union；最终 JSON / REPORT 不含成员身份、
正文、引文、数字摘录或可回连 join key。无论观察结果如何，本任务都不得提出、命名、实现或推荐 k7。

## 2. 起点、branch、worktree 与提交拓扑

- parent：accepted GR3R1 `372703c4ca408f4d7158497bd1cc4eec9ccd4bc3`
- branch：`stage0a-wave2-g1-zero-opening-fn-characterization-gr4`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-g1-zero-opening-fn-characterization-gr4`
- 2026-09-05 已核：branch 与 worktree 均不存在。若执行时任一已存在，立即停止；不删、不覆盖、
  不复用、不猜测。
- 最终交付须恰一笔 commit，唯一 parent 为 GR3R1；GR3 `33f0d661…`、GR2B `5bbe249…`、GR2C
  `8e9cd64…`、GR1 `545f46a…`、GR1R1 `a24fe3e…` 等 Redo 提交不得进入 ancestry。
- GR2A / GR2BR1 / GR2D 只作为 GR3R1 已钉死的 full commit:path 输入，不得 merge、cherry-pick、
  rebase 或从 sibling worktree 读取。
- 不 fetch、pull、tag、push。

三条目标命令全绿后只提交一次，message 必须为：

```text
posthoc(stage0a): characterize G1 zero-opening false negatives (GR4)
```

## 3. 唯一允许的 changed paths

相对 GR3R1 必须恰六个新增路径、0 个已有文件修改：

```text
harness/verify_g1_zero_opening_fn_characterization_wave2.py
posthoc/stage0a-development-wave2-g1-zero-opening-fn-characterization/analyze_g1_zero_opening_fn_characterization_wave2.py
posthoc/stage0a-development-wave2-g1-zero-opening-fn-characterization/test_g1_zero_opening_fn_characterization_wave2.py
posthoc/stage0a-development-wave2-g1-zero-opening-fn-characterization/G1-ZERO-OPENING-FN-CHARACTERIZATION-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-g1-zero-opening-fn-characterization/G1-ZERO-OPENING-FN-CHARACTERIZATION-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-g1-zero-opening-fn-characterization/CHECKSUMS-G1-ZERO-OPENING-FN-CHARACTERIZATION-stage0a-development-wave2.sha256
```

posthoc 目录必须恰五项；CHECKSUMS 只登记 analyzer、test、JSON、REPORT 四项且不自列。不得新增
`verify_stage0a_v120_*`、候选 matcher/routing 文件、hypothesis lock、review packet、逐行清单或任何
第七件产物。原 v1.20、GR2A、GR2BR1、GR2D、GR3R1、freeze、protocol、gold、rubric、runner 与
accepted artifact 必须逐字节不变。

## 4. 钉死输入与前序证书

GR3R1 六对象必须先按 parent tree 核 SHA：

| path | SHA-256 |
|---|---|
| `harness/verify_closed_repair_family_feasibility_wave2.py` | `4abb65e866e332b398c774a31429ca457b835d05b4d5bb9f6834c3269845bd79` |
| `posthoc/stage0a-development-wave2-closed-repair-family-feasibility/enumerate_closed_repair_family_feasibility_wave2.py` | `0b6b4a63b47d0cca55c18c3e1fa31a1d37baf0128b5d505e3ac2fd770fc9bb41` |
| `posthoc/stage0a-development-wave2-closed-repair-family-feasibility/test_closed_repair_family_feasibility_wave2.py` | `295a743ac8e8dcebf31dedc6cf328651a190dedc8fd664561a015d1a9d061bd3` |
| `posthoc/stage0a-development-wave2-closed-repair-family-feasibility/CLOSED-REPAIR-FAMILY-FEASIBILITY-stage0a-development-wave2.json` | `7f569cdb40ae2dc90dfd89719905c2bb3d0da7358b60950d0a0d75583c2f61d0` |
| `posthoc/stage0a-development-wave2-closed-repair-family-feasibility/CLOSED-REPAIR-FAMILY-FEASIBILITY-REPORT-stage0a-development-wave2.md` | `f75e37410a5772ce6403c69bc9141d5063a458b6dfc046c742488efd5c3803f5` |
| `posthoc/stage0a-development-wave2-closed-repair-family-feasibility/CHECKSUMS-CLOSED-REPAIR-FAMILY-FEASIBILITY-stage0a-development-wave2.sha256` | `09f93d3c49aa0677fb41fb14aa96e1930598cf93d43d33da82a925da0f6589ed` |

GR3R1 CHECKSUMS 仍只登记其 enumerator、test、JSON、REPORT 四项且闭合。前序任务书钉住的 17 个
development 输入 SHA、三个 accepted sibling 的 21 个 object SHA、三份 sibling CHECKSUMS 与 v1.20
freeze 注册必须由 analyzer 和 validator 各自复核；不得从 GR3R1 Python 模块导入常量/helper。

GR3R1 JSON / REPORT 只是 accepted anchor。两套实现必须各自从 source objects 与 development 闭包
重建 MB / MU full-mask 结果，不能读取前序证书中的数字当作 target membership 或 expected document。

## 5. target set 的机械定义与访问闸

对同一 196 行独立直接运行：

- `MB`：accepted v1.20 base matcher；
- `MU`：accepted GR2BR1 UQ matcher；
- routing：固定 full mask `111111`，只取 `OR(k1..k6)`，mandatory 保持原定义。

每轴 target 必须使用 GR3R1 完全相同的 G1 false-negative 定义，并同时满足：

```text
G1 false negative
AND mandatory_blind_review == false
AND k1 == k2 == k3 == k4 == k5 == k6 == false
```

硬锚：MB target count 必须为 4，MU target count 必须为 4；任一不等立即失败，不得继续正文复核。
必须在内存中计算 MB set、MU set、intersection、union、MB-only、MU-only，并证明：

- `|intersection| + |MB-only| = 4`；
- `|intersection| + |MU-only| = 4`；
- `|union| = |intersection| + |MB-only| + |MU-only|`；
- 任一成员都由逐行谓词产生，没有 hardcoded id、位置或答案 token。

JSON / REPORT 只保存上述计数与集合关系标签；不得保存成员 id、index、hash、pseudonym、顺序、arm+特征
的唯一组合或任何其它可回连标识。

正文访问分两层：

1. 为重建 verifier，程序可按既有规则在进程内消费钉死 196 行；不得输出正文。
2. 新增的语义定界入口只能在 target sets 完全算定后调用，并由运行时 guard 拒绝任何不在 union 的
   row / answer / episode。target union 只在 `TemporaryDirectory()` 或内存中存在，退出即消失；
   不写逐行 artifact，不打印，不进异常。

## 6. 允许输出的定界内容

### 6.1 必须机械重建的结构化聚合

两套实现分别计算并闭合：

- MB / MU / intersection / union / axis-only 计数；
- target union 在四 arm 上的聚合计数；
- 两轴各自的 machine `pass/outcome/adverse/mandatory`、component completeness、wrong-action hit 与
  blocker cardinality 聚合；
- MB → MU 在 target union 上改变 pass/outcome/action hits 的聚合；
- 六个 opening 全 false、full-mask needs_review=false 与 G1 false-negative 条件逐项一致；
- 若 frozen adjudicated gold 提供结构化 failure basis，则只按其现有枚举做聚合；若没有，写
  `underdetermined`，不得从答案正文伪造“机械标签”。

所有 arm / 字段组合都须先做 k-anonymity 检查；任何会把单个成员唯一化的交叉表不得落盘，只降级为
更粗聚合或 `suppressed_for_non_identification`。

### 6.2 受限正文复核

允许对 target union 做一次人工探索性复核，但输出只能使用以下封闭、粗粒度主类：

- `missing_or_incomplete_required_content`
- `unsupported_or_incorrect_assertion`
- `prohibited_or_wrong_action`
- `refusal_or_non_answer`
- `mixed`
- `underdetermined`

每个 union 成员在内存中只能选一个主类；产物只保存每类计数。不得保存解释文本、逐例 paraphrase、
引文、数字、专名或成员顺序。该块必须明确标为 `exploratory_manual_observation`、
`not_independently_semantically_validated=true`、`not_a_signal_specification=true`；独立 validator 只验证
访问边界、封闭枚举、计数和、净化与声明，不能把人工标签冒充机械真值。

不得从这些观察生成 regex、token list、阈值、例外、候选谓词、推荐 surface 或“k7 应当……”句子。
如果粗分类本身需要泄露内容才能解释，全部记为 `underdetermined`。

## 7. JSON、REPORT 与结论边界

JSON / REPORT 至少包含：授权与禁止、全部输入 SHA、GR3R1 parent/object 闭包、两器材隔离、target
机械定义、集合代数证书、结构化聚合、正文访问 guard 统计、人工观察的非机械声明、泄露扫描、
`underdetermined`、boundaries 与 owner decision。

报告首行必须为：

```text
G1 ZERO-OPENING FN CHARACTERIZATION ONLY — no signal, candidate, promotion, or freeze decision
```

报告末行必须为：

```text
GR4 COMPLETE — return to owner before defining any seventh routing signal
```

顶层必须明确：

- `new_routing_signal_proposed=false`
- `candidate_verifier_created=false`
- `repair_surface_selected=false`
- `threshold_changed=false`
- `hidden_touched=false`

无论结果如何，只能得出“zero-opening FN 的集合关系与受限定界已完成”。第七个 routing signal、第二个
matcher、任何规则的开发集 FP/FN 代价、样本外/其它 wave、hidden、promotion、freeze 与正式运行均为
`underdetermined` 或 owner decision。

## 8. 独立 validator 与真实负测

`harness/verify_g1_zero_opening_fn_characterization_wave2.py` 不得 import analyzer、GR3R1 enumerator /
validator / test，也不得读取它们的常量/helper/expected document。它须自己钉死 inputs、commits、
source objects、target predicate、集合代数、结构化聚合、canonical JSON/REPORT 与输出边界。

测试必须在 `TemporaryDirectory()` 中复制五份 posthoc 产物，必要时重签 CHECKSUMS，再黑盒运行独立
validator。每条先跑 byte-identical control rc 0，至少覆盖：

- 把 MB 或 MU target count 从 4 改掉；
- 伪造 intersection / union / axis-only，使单项看似合理但集合代数不成立；
- 把一个非 target row 喂给语义定界入口，运行时 guard 必须在读取正文前失败；
- hardcode target id / row position / hash，或绕过 full-mask、mandatory、六 opening 条件；
- 伪造 arm、verdict、component、wrong-action 或 matcher-delta 聚合；
- 人工主类出现未知值、计数和不等 union、缺失非机械声明，或被写成 signal specification；
- 注入 row/run/blind/episode id、identity、model、答案、引文、数字摘录、绝对路径或 join key；stderr
  仍须单行净化并退出 2；
- 新增 candidate verifier、第七项产物、CHECKSUMS 漏项/多项/自列、输入 SHA 或 accepted object 漂移；
- 报告提出/推荐 k7、第二 matcher、promotion/freeze/hidden，或删除任一 boundary / owner-decision 项。

另加静态 AST 闸：analyzer 与 validator 的 target membership 不得包含整数位置表、id/hash 常量表或
从 GR3R1 JSON 读取成员；语义 accessor 必须显式接收 sealed target union 并做 membership check。
全部 mutation 后五份工作树产物 SHA 必须不漂移。

## 9. 目标命令

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-g1-zero-opening-fn-characterization/test_g1_zero_opening_fn_characterization_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-g1-zero-opening-fn-characterization/analyze_g1_zero_opening_fn_characterization_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_g1_zero_opening_fn_characterization_wave2.py
```

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行 GR3R1 或更早
任务的目标命令、`pytest harness/` 整目录、旧 sweep/rescore/semantic probe、模型 runner、正式
development、G0 或 hidden。

## 10. 回执与停止条件

回执必须给出：branch/worktree/commit/唯一 parent、六个 changed paths、GR3R1 六对象 SHA、17 个
输入与 21 个 sibling object 闭包、两套 target 重建入口、MB/MU 各 4 条锚、集合关系计数、结构化
聚合、语义 access guard 证据、人工观察块的明确非机械边界、负测 control/mutation rc、六文件 SHA、
三条目标命令原始结论，以及测试后 HEAD/status/tag/SHA。

提交后立即停止并返回 owner。不得创建 GR5，不得定义/命名/实现 k7，不得选择第二 matcher，不得
创建 candidate、读取非 target 正文、修改 accepted 文件、promotion、freeze、正式运行、G0 或 hidden。
