# Claude Code 纠正任务书 —— Stage 0-a development wave2 · GR3R1 三重逆投影闭包

> **状态：COMPLETE — Codex 验收 verdict：`Accept`。**
>
> **后续：** 当前无可执行实验任务，返回 owner decision；未创建或下发 GR3R1 之后的任务。
>
> **验收摘要：** 提交 `372703c4ca408f4d7158497bd1cc4eec9ccd4bc3` 的唯一 parent、六路径闭包、
> 两套独立 inverse-projection 实现、真实 mutation 负测、128 格既有读数及三条目标命令均闭合；
> verdict 为 `Accept`，GR3R1 进入 accepted development evidence。
>
> **性质：** GR3 `33f0d6610eddde995f63e8ca41022d1428f683da` 的 Codex 验收 verdict 为
> `Redo`。GR3 的 128 格数值结果和三条目标命令均通过，但 GR2D 三重逆投影在 enumerator 与
> independent validator 中都只是三个预置 `True`，没有机械重建。本任务只纠正这一项验收缺口；
> 不新增实验问题、信号、matcher、candidate、promotion、freeze、正式运行、G0 或 hidden。
>
> **前序完整基线：** 先完整读取
> `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR3-DEVELOPMENT-CLOSED-REPAIR-FAMILY-FEASIBILITY-2026-09-05.md`。
> 其中全部边界、固定输入 SHA、21 个 accepted object SHA、六个 opening、128 格算法、报告披露、
> 安全净化与禁止项继续逐字生效；本任务只把缺失的 inverse-projection proof 收紧为可执行要求。

## 1. 唯一 finding 与完成定义

GR3 的以下三处把待证结论直接写成常量：

- enumerator 的 `GR2D_INVERSE_PROJECTION = {...True...}`；
- validator 的 `_INVERSE = {...True...}`；
- 测试只把产物字段从 `True` 改成 `False`，证明了 canonical comparison，却没有证明逆投影被计算。

因此，GR3 报告里的“本轮仍作为锚成立”不是本轮重建出的证据，不能满足前序任务书 §6 的硬停止线。

GR3R1 的完成定义只有一个：enumerator 与 validator 各自从钉死的 base / GR2A / GR2BR1 / GR2D
源码对象机械重建三重逆投影，三个结果必须来自真实比较；任一不成立时必须在生成 128 格之前失败。
其余已通过读数必须原样复现，不得借返工改变问题或结论。

## 2. 起点、branch、worktree 与提交拓扑

- parent：GR1R2 `076a486bdaa111d6aa5654951e6890078afc3874`
- branch：`stage0a-wave2-closed-repair-family-feasibility-gr3r1`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-closed-repair-family-feasibility-gr3r1`
- 2026-09-05 已核：branch 与 worktree 均不存在。若执行时已存在，立即停止，不删、不覆盖、不复用。
- 最终交付必须恰一笔 commit，唯一 parent 为 GR1R2；被退回 GR3 `33f0d661…` 及 GR2A / GR2BR1 /
  GR2D / GR2C(R1) / GR2B / GR1(R1) 均不得进入 ancestry。
- GR3 `33f0d661…` 只可作为 finding 的只读诊断参照，不得 cherry-pick、merge、rebase、复制其产物
  当作已验结果，也不得从它读取逐行正文。
- 不 fetch、pull、tag、push。

三条目标命令全绿后只提交一次，message 必须为：

```text
posthoc(stage0a): close GR3 inverse-projection proof (GR3R1)
```

## 3. changed paths 与不变面

相对 GR1R2 仍须恰六个新增路径、0 个已有文件修改：

```text
harness/verify_closed_repair_family_feasibility_wave2.py
posthoc/stage0a-development-wave2-closed-repair-family-feasibility/enumerate_closed_repair_family_feasibility_wave2.py
posthoc/stage0a-development-wave2-closed-repair-family-feasibility/test_closed_repair_family_feasibility_wave2.py
posthoc/stage0a-development-wave2-closed-repair-family-feasibility/CLOSED-REPAIR-FAMILY-FEASIBILITY-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-closed-repair-family-feasibility/CLOSED-REPAIR-FAMILY-FEASIBILITY-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-closed-repair-family-feasibility/CHECKSUMS-CLOSED-REPAIR-FAMILY-FEASIBILITY-stage0a-development-wave2.sha256
```

posthoc 目录仍恰五项；CHECKSUMS 仍只登记 enumerator、test、JSON、REPORT 四项且不自列。不得创建
`verify_stage0a_v120_*` candidate，不得修改 base、accepted commits、protocol、freeze、gold、rubric、
runner 或任何既有文件。

除 inverse-projection 证书及其必要测试/报告证据外，GR3 已有的 128 格定义、exact arithmetic、
aggregates、G1 证书、minimum、safety、Pareto、边界和 owner-decision 文本不得改变。若重建导致既有
数值不复现，立即停止并报告 `underdetermined`，不得调参或改锚。

## 4. 三重逆投影必须如何机械重建

enumerator 与 validator 必须各自实现，不得共享常量、helper、expected document，也不得 import
前序 GR2D / GR3 analyzer、validator 或 test。只可从前序任务书钉死的 full commit:path git objects
读取 source；不得用 branch/ref 或 sibling worktree。

每套实现都必须至少完成以下闭包：

1. 读取并核 SHA 的 accepted base、GR2A、GR2BR1、GR2D 四份源码；只在 `TemporaryDirectory()`
   物化 accepted sibling source。
2. 身份规范化只允许处理四份钉死源码中已知的 identity 注释块和唯一 `CANDIDATE_VERSION` 行；
   不得忽略、排序或泛化其它差异。
3. 从 normalized base → GR2BR1 的真实 diff 机械推出 accepted UQ patch；它必须仍是恰两个纯插入
   block，除唯一 identity 行外不得有 replace/delete。block 必须唯一定位且保留 accepted entry-point
   与 additive anchor 约束。
4. 从 base → GR2A 的真实 diff 机械推出 R2 删除；必须仍是 `score_episode()` 中钉死的唯一 R2
   branch，R2 helper/constant 保留，且删除块与 UQ 两段互不重叠。
5. 对 GR2D source 做三次真实逆投影并比较：
   - 删除 UQ 两段，规范化后必须 byte-identical 等于 accepted GR2A；
   - 在唯一 R3 anchor 恢复精确 R2 block，规范化后必须 byte-identical 等于 accepted GR2BR1；
   - 同时删除 UQ、恢复 R2，规范化后必须 byte-identical 且 SHA-256 等于 accepted base。
6. 三个 JSON 布尔值只能由上述比较表达式产生；禁止模块级/局部固定 `True` map，禁止先写结论再
   校验。任一比较失败必须在 `build_cells` / `_cells` 前退出 2，且错误信息保持净化。

可以独立重写算法，但必须与 accepted GR2D analyzer 已验的机械定义等价；不得直接复制/导入它的
结果字段充当证据。

## 5. 四器材、128 格与产物必须继续闭合

- 四份器材仍须隔离直接运行，并在穷尽前逐行复现：base=`MB-R-111111`、GR2A=`MB-R-111011`、
  GR2BR1=`MU-R-111111`、GR2D=`MU-R-111011`。
- accepted quadruple 仍为 `(4,4,85/14,1)`、`(4,0,85/14,1)`、`(4,18,135/14,0)`、
  `(4,13,130/7,0)`；逐行 mismatch 必须为 0。
- 配置宇宙仍恰 `{MB,MU} × P({k1..k6}) = 128`，固定 `k1..k6` 位序，只做所选 opening 的 OR，
  不改 mandatory / pass / outcome / action hits。
- 预期总结果仍须由直接重建得到：all-green `0`；G1/G2/G3/G4 passing 为 `0/104/16/64`；
  safety 为 `120 unsafe_tradeoff / 4 safe_improvement / 4 no_effect`；Pareto frontier 为 `40`；
  两轴 `min_G1_unrouted=4` 且 zero-opening FN 各 `4`。
- REPORT 首尾、全部 `underdetermined`、boundary、owner decision 与“不选择下一修复面”的边界不变。

## 6. 独立 validator 与必须新增的真实负测

validator 仍须独立重建完整 canonical JSON/REPORT；它自己的 inverse-projection 实现不得 import 或
读取 enumerator 的实现/常量/产物作为 expected。

保留前序全部正测与负测，并新增能证明“结论来自计算”的覆盖：

- 对 enumerator 的纯 inverse-projection helper 逐一破坏 UQ 第一段、UQ 第二段、R2 block、R3
  unique anchor、identity normalization，均须在产出 128 格前失败；不得只改最终 JSON 布尔值。
- 在黑盒 validator 沙箱中，分别把其 UQ/R2 投影规则改成一个仍能运行但比较错误的版本；每条先跑
  byte-identical control rc 0，再让真实投影比较 rc 2、单行净化 stderr。若把三个结果恢复成固定
  `True`，测试必须失败。
- 保留对最终 JSON 三个布尔值的伪造负测，但它只能作为产物防篡改测试，不能替代上述计算负测。
- 全部 mutation 后五份 posthoc 产物 SHA 不漂移。

测试数量可增加；不得为保持 `60 passed` 而删减原覆盖。

## 7. 目标命令、回执与停止条件

只运行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-closed-repair-family-feasibility/test_closed_repair_family_feasibility_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-closed-repair-family-feasibility/enumerate_closed_repair_family_feasibility_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_closed_repair_family_feasibility_wave2.py
```

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行旧任务命令、
其它 sweep/rescore、模型 runner、正式 development、G0 或 hidden。

回执除前序 GR3 的全部项目外，必须单列：两套 inverse-projection 实现入口、三个比较的真实来源、
失败发生在 128 格生成之前的证据、每类新增计算负测的 control/mutation rc、六个文件 SHA、三条目标
命令原始结论、测试后 HEAD/status/tag/产物 SHA。

提交后立即停止并返回 owner。不得创建后续任务，不得选择新信号或 matcher，不得读取答案正文来
解释四条 zero-opening FN，不得 promotion、freeze、正式运行、G0 或 hidden。
