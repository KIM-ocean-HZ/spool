<!-- PURGE-BEFORE-APPLICATION: 本文件出现私有实验仓库的名字（作品集列为绝不出现），发送申请前一并清除或脱敏。总清单：docs/PORTFOLIO_FACTS.md §11.4。标记于 2026-09-25。 -->
# Codex 通用交接 —— Stage 0-a 实验评测验收与续派

> **状态：CANONICAL ACTIVE HANDOFF FOR EVERY NEW CODEX WINDOW**
>
> **稳定入口：** 本文件。文件名保留历史日期与 D2 字样，但内容从本次起是跨窗口滚动更新的唯一 Codex 入口；不要另建平行“最新 handoff”。
>
> **Codex 角色：** 独立实验评测指导员——验收 Claude Code 的上一任务，给出 verdict，再在既有 owner 授权内下发下一项最小任务。
>
> **当前光标：ACTIVE GR15R4 — trace-calls-made pre-product read closure correction。**
> GR15R3 `4d6a419cae875d3c8595c890056791d75203097a` 已于 2026-09-24 验收为 `Redo`，不进入
> accepted chain。accepted-source narrative / AST binding、P1、五面 identity、direct-integer 与科学
> 结果均已闭合；退回只因顺序自证仅跟踪包装函数名，实际 JSON read 提前到 source-semantics 前时
> 仍会被静态审计判为 clean。当前正常执行顺序正确，没有发现科学结果漂移。现只授权 GR15R4 从
> accepted GR14 独立纠正实际 product read / rebuild 的顺序自保护，不重开科学实验或扩大权限。
>
> **当前唯一任务书：**
> `docs/TASKBOOK-STAGE0A-GR15R4-DEVELOPMENT-TRACE-CALLS-MADE-PRE-PRODUCT-READ-CLOSURE-CORRECTION-2026-09-24.md`
>
> **最后更新：** 2026-09-24（Europe/London）

## 1. 每个新 Codex 窗口的固定工作循环

1. 完整读取本文件；若存在当前任务书，再完整读取该任务书。当前光标为 owner decision 时不得把历史任务书当作待执行任务。
2. 若用户给出 Claude 回执，把它视为待核声明；先核 commit、唯一 parent、branch/worktree、changed paths、status 与文件 SHA。
3. 按任务书做静态审查和被明确允许的目标验证；测试通过不能代替实现级审查。
4. 先列带文件与行号的 findings，再给唯一 verdict：`Accept`、`Accept with non-blocking note`、`Redo` 或 `Blocked`。
5. `Accept` 后，在现有 owner 授权内选择下一项最小任务，写新任务书并更新本文件的当前光标；`Redo` 时只下发纠正当前交付的任务，不跨阶段。
6. 若下一步需要扩大授权——包括 gate repair、读取答案正文/题目源、hidden、模型调用、费用、approval 或正式运行——只把它登记为 owner decision，不得擅自下发为可执行任务。
7. Codex 不代替 Claude Code 执行任务，不修改实验仓的交付分支，不 merge/tag/push；完成验收与文档续派后停止。

维护规则：每次窗口结束前直接更新本文件中的“当前光标 / 当前任务书 / 最近 verdict / 下一窗验收方法”。历史只保留足以审计的摘要，并链接任务书，避免复制出多个相互冲突的 handoff。

## 2. 事实来源优先级

冲突时按以下顺序裁定：

1. 实验仓钉住 commit 中的冻结件、协议与正式 artifact；
2. 当前任务书的明确边界与验收条件；
3. git object、实际 diff、工作树状态、文件 SHA 与目标命令输出；
4. Claude 回执；
5. 本 handoff 和其他 Knote 派生说明。

Claude 回执与文档都不能覆盖实验 artifact。`docs/HANDOFF-2026-09-04.md` 是 D1 之前的历史现场，不是当前光标。

## 3. 当前状态快照

### 3.1 已接受的提交链

- BASE / source main：`67cf84c9d40057fec02be7a963694938bff78a58`
- C1：`9df7140b800edb82e26614bdb5dafcbda0cb75bd`
- C2：`0271d4cb5f517141a6ffabf7c202ede0e8f093dd`
- κ：`95fae2ab5e8b5e9ba496f77552246f28b3372e0d`；κ = `0.9686032`，floor `0.6`，gate `true`
- J1：`afb93f4fcd7ff10ac012fb99b53135ee2a138813`；196 行，pass 115 / fail 81
- integration：`be86bc4c1d8ca0f2681bdc45e1d595e7dfce55e0`
- U1：`d77a96049636664e9a8feb6db93866e90e758aa4`；唯一 parent 为 integration
- M1：`4dcb70e79c1c7b1981001e69535a1a210f5e667b`；唯一 parent 为 U1
- D1：`8b2bd021ece2be1ac6a17bf47a68e4f0f64337a8`；唯一 parent 为 M1；已接受
- D2R4：`6b67451c52a4c2760d6c939df8772e3bd41380da`；唯一 parent 为 D1；已接受
- GR1R2：`076a486bdaa111d6aa5654951e6890078afc3874`；唯一 parent 为 D2R4；已接受
- GR2A：`da0bd254edc267bbd3d4536fb751c6aabb8c39e0`；唯一 parent 为 GR1R2；routing-only
  探索证据已接受。
- GR2BR1：`fae90ecfeed723748b80566b94d473cf25e45d0c`；唯一 parent 为 GR1R2；matcher-only
  identity-isolation 纠正已接受。它与 GR2A 是 sibling，二者都不是另一方的 parent。
- GR2CR1：`eb1908491a1ad34a718c417f0a3e2caf57cc017d`；唯一 parent 为 GR1R2；comparison-only
  独立 validator 纠正已接受。GR2A / GR2BR1 仅为钉死输入，均不在其 ancestry。
- GR2D：`073c109c95904c813a4cb2455760af67eb086f10`；唯一 parent 为 GR1R2；combined-candidate
  development 直接实验已接受。GR2A / GR2BR1 / GR2CR1 仅为钉死输入或锚，均不在其 ancestry。
- GR3R1：`372703c4ca408f4d7158497bd1cc4eec9ccd4bc3`；唯一 parent 为 GR1R2；closed-family
  feasibility 与三重逆投影证书已接受。GR3 / GR2A / GR2BR1 / GR2D 等均不在其 ancestry。
- GR4：`624055f9e41ff3e642744b3b351fa8dc1cac871d`；唯一 parent 为 GR3R1；G1 zero-opening FN
  集合关系、结构化聚合与受限正文定界已接受。GR3 / GR2A / GR2BR1 / GR2D 等均不在其 ancestry。
- GR5：`f94898367e8e5238b54ad3a7de43bf829bc0c9cb`；唯一 parent 为 GR4；锁定 k7 的 256 格
  development feasibility 与 k7-off 逆投影证书已接受。GR3 / GR2A / GR2BR1 / GR2CR1 / GR2D / GR2B /
  GR2C / GR1 / GR1R1 全部不在其 ancestry。
- GR6R1：`847fbf83c539854f380fded8a330f006fcf65a12`；唯一 parent 为 GR5；metadata-only
  out-of-sample validation readiness 与完整独立 canonical validator 纠正已接受。被退回 GR6、GR1 /
  GR1R1 / GR2B / GR2C / GR3，以及 GR2A / GR2BR1 / GR2CR1 / GR2D 均不在其 ancestry。
- GR7：`9b8a57e8ffde224b4bc25a2221ba18937884a9d5`；唯一 parent 为 GR5；development-only
  gold-oracle routing feasibility envelope 已接受。GR6R1 是 metadata-only sibling，不在其 ancestry，
  也不是其科学输入。
- GR8：`a4320c8428f94b304dcf097c7d55acd8e6eae6f8`；唯一 parent 为 GR7；development-only
  observable-signature routing separability envelope 已接受。相对 GR7 恰六个新增、0 个修改；不保存
  signature value / lookup，不创建 selector / candidate / k8，不进入 hidden 或样本外。
- GR9：`48b9f720958fc409419d7c823c607192f6c57925`；唯一 parent 为 GR8；development-only
  exact-count signature separability envelope 已接受。相对 GR8 恰六个新增、0 个修改；同六个列表字段
  的 exact length 没有切分任何 GR8 bucket class，Layer A / B 均为 `0/16`。
- GR10：`2231eb6674db23c4ce4fb7f4e63acd2113a620c4`；唯一 parent 为 GR9；development-only、zero-cost
  remaining machine-observable schema-surface eligibility audit 已接受。相对 GR9 恰六个新增、0 个修改；
  43 个 canonical audit entries 四分为 `15 / 2 / 19 / 7`，七项只登记结构资格，未做效果检验或选择。
- GR11：`04ffebe89c3ef38bb7b042052983dac40d1b1dd3`；唯一 parent 为 GR10；development-only、zero-cost
  trace-missing exact-count separability envelope 已接受。相对 GR10 恰六个新增、0 个修改；
  `len(trace.missing)` 未切分任何 GR9 class，16 格逐格与 GR9 相同，Layer A / B 均为 `0/16`。
- GR12R3：`0ecd8d15a6eed905394791a9292faf640fe4ca2b`；唯一 parent 为 GR11；development-only、
  zero-cost trace-wrong-param-calls exact-count separability envelope 及 order-evidence meta-boolean 纠正已接受。
  相对 GR11 恰六个新增、0 个修改；`len(trace.wrong_param_calls)` 未切分任何 GR9 class，
  16 格逐格与 GR9 相同，Layer A / B 均为 `0/16`；两条 meta booleans 已分别由
  runtime ledger 与 whole-source static AST closure 机械派生。
- GR13R2：`9b8b1e299d5e80e0cc027a7829a3cb75e8f8c51a`；唯一 parent 为 GR12R3；development-only、
  zero-cost trace-satisfied exact-count separability envelope 及 scorer-scope gate-deletion closure 已接受。
  相对 GR12R3 恰六个新增、0 个修改；GR13 / GR13R1 均不在 ancestry；科学 payload 与 GR13R1
  逐字节相同，五族真实删除 / 恒真化由 pre-comparison whole-source AST provenance 拒绝。
- GR14：`0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`；唯一 parent 为 GR13R2；development-only、
  zero-cost trace-invalid-tool-calls exact-count separability envelope 已接受。相对 GR13R2 恰六个新增、
  0 个修改；34 个 GR9 class 无一被切分，16 格逐格与 GR9 相同，Layer A / B 均为 `0/16`。

GR13 `f206463d9cebc3081d2ad4bde189569d4aa3217f` 已验收但 verdict 为 `Redo`，不进入 accepted
chain。其 `len(trace.satisfied)` 科学读数、P0–P8、六产物与三条目标命令闭合；退回只因 canonical
factual / evidence closure 不完整：结论 detail 把 G2 `8 pass / 8 fail` 错写为 16 格全部超限；commits
map 把 GR10 错标成 GR12R3 的 parent；validator stdout 漏计 GR11 六对象；REPORT 与测试没有兑现回执
所称的 scorer narrative-only scope 披露及四条 mutation。GR13R1 从 accepted GR12R3 独立纠正，
不把 GR13 纳入 ancestry，也不重开科学实验。

GR13R1 `0bedadfa7d47d03528cae7864e00634c7511d8fc` 已验收但 verdict 为 `Redo`，不进入 accepted
chain。它正确关闭 conclusion detail、GR12R3→GR11→GR10 lineage、75-object summary、REPORT
scorer-scope disclosure 与六条 accepted-source mutation；403 tests、analyzer 与 validator 均通过，科学
payload 未漂移。但任务书 §6(5) 要求删除任一 scorer-scope enforcement gate 本身也必须在 compare 前
rc 2，现有同名测试只篡改发布字段 `decision_local_bindings_checked += 1`，没有删除 gate，也没有
validator self-provenance closure。GR13R2 只纠正这一处 negative-test 自保护缺口。

GR15 `08b70f5c35ee63152b7aa10c8795a1afd1acd369` 已验收但 verdict 为 `Redo`，不进入 accepted
chain。其 `trace.calls_made` 数值 payload、87-object closure、六件交付与三条目标命令闭合；退回只因
P1 的 `type(trace[...])` / dynamic type loop 已真实求值本轮字段但被读点扫描排除、available signature
末槽实际是 `("available", count)` 而非预注册 raw integer，以及 REPORT / JSON 把本轮写成 GR14、把
primitive 写成 `len(trace.calls_made)`、把 `calls_made=len(calls)` 错述为 invalid/allowed-set count，且
历史已检验 / 从未检验 primitive 计数相互矛盾。GR15R1 只从 accepted GR14 独立纠正这三类 finding。

GR15R1 `160db5f1be90921c6959e63ad25ff0fd3a946039` 已验收但 verdict 为 `Redo`，不进入 accepted
chain。它正确关闭 GR15 的实际 P1 direct-subscript early read、raw-integer 第 16 槽、scalar malformed
sentinel 与 canonical JSON / REPORT factual contradictions；87-object closure、58 classes、split 16、
collision 7、Layer A `0/16`、Layer B `16/16` 均无漂移。但 whole-source scanner 仍只识别两个
`ast.Subscript` spelling 与 `ast.Name` dynamic slice，因而会漏过 P1 的 `.get("calls_made")`、
`trace["calls_" + "made"]` 等真实读取；三份 Python 交付的 module docstring 又分别把 delivery round
写成 GR15 / GR15 / GR14，而非 GR15R1 correction。GR15R2 只纠正这两处 self-provenance / factual
identity 缺口。

GR15R2 `c42faaef5cc6661ed216c1162273c953a65beb58` 已验收但 verdict 为 `Redo`，不进入 accepted
chain。它正确关闭 GR15R1 的 P1 whole-source read-syntax 与五类 delivery identity findings；六文件 SHA、
87-object closure、58 classes、split 16、collision 7、Layer A `0/16`、Layer B `16/16` 与三条目标命令
均闭合。但 canonical source-semantics narrative 把钉住 accepted source 的
`t.get("kind") == "call"` 错写为 `t["kind"] == "call"`；两套 AST gate 自己反而明确只接受 `.get`，
现有 factual closure 又只检查 `len(calls)` 等子串，未把 access form 与 narrative 绑定。另披露一次
全 worktree `find .` 广域目录遍历；无内容泄漏证据，但不能作为 hidden 未接触的干净执行证明。GR15R3
只纠正 factual closure，并在 fresh worktree 以精确路径检查重做边界证据。

GR15R3 `4d6a419cae875d3c8595c890056791d75203097a` 已验收但 verdict 为 `Redo`，不进入 accepted
chain。两套实现已将 narrative 逐字绑定到 pinned source 的 `.get` comprehension，并闭合九条 controls
及四条 derivation links；六 SHA、analyzer / validator 与科学 payload 无漂移。但 validator 的顺序自证
只观察 `_preflight` / `_build_document` / `_compare`，不观察实际 `_read_text`；移动现有 JSON read
到 source-semantics 前时，被审计的相对顺序仍不变。既有负测只提前整个 `_preflight`，没有关闭此类
actual-read relocation。GR15R4 只纠正这一自保护缺口，仍从 accepted GR14 独立交付。

GR6 `a76a2c675046628445ee98243fe138c0b4d819f2` 已验收但 verdict 为 `Redo`，不进入 accepted chain。
其 readiness 科学结论没有被推翻；退回只因 independent validator 未完整独立重建 canonical JSON /
REPORT，且会接受缺失 failure-policy blocker 或普通 REPORT 事实篡改。GR6R1 已从 GR5 独立纠正并验收为
`Accept`，未把 GR6 纳入 ancestry。

GR1 `545f46ab205ef1f36c11a97b090bba21fcce7e07` 与 GR1R1
`a24fe3ec26e27eb741409b89e28d12018fef52b6` 均已验收但 verdict 为 `Redo`，不进入 accepted
chain。GR1R2 已从 D2R4 独立重做并闭合两轮 finding，未把 GR1 / GR1R1 纳入 ancestry。

GR2B `5bbe24954ff40591a0cf59ee1bd9da9301c20ef3` 已验收但 verdict 为 `Redo`，不进入 accepted
chain。其 matcher 对原 episode 全对象递归取字符串，运行时实际读取 identity / item-gold 字段；
GR2BR1 已从 GR1R2 独立纠正并闭合该 finding。GR2B 仍不是 GR2C 输入。

GR2C `8e9cd645fb1ee1ff5138d855df1bd92b0ab7e55f` 已验收但 verdict 为 `Redo`，不进入 accepted
chain。其独立 validator 未闭合所有自报字段与 owner-decision 文本边界，且 mismatch 会回显待验值；
GR2CR1 已从 GR1R2 独立纠正并闭合三项 finding，未把 GR2C 纳入 ancestry。

GR3 `33f0d6610eddde995f63e8ca41022d1428f683da` 已验收但 verdict 为 `Redo`，不进入 accepted
development evidence。其 128 格、G1 不可能性证书与三条目标命令均闭合，但 enumerator 和 validator
都把 GR2D 三重逆投影直接写成三个 `True`，没有按任务书在穷尽前机械重建；GR3R1 已从 GR1R2
独立纠正并验收为 `Accept`，未把 GR3 纳入 ancestry。

### 3.2 当前门状态

- G1：FN 53，routed 49，unrouted 4，coverage `49/53 = 0.9245`；fail。
- G2：needs_review `82/196 = 0.4184`，阈值严格 `< 0.40`；fail。
- G3：A0 `24/56`、A1 `22/56`、A2 `27/56`、A3 `9/28`；spread `16.07pp`，阈值 `≤ 10pp`；fail。
- G4：machine pass ∧ gold fail = 1，阈值 0；fail。
- G5–G13：来自冻结 v1.20 器材证据，未重跑，全部 pass。
- `hard_gates_ok=false`
- `frozen_instrument_assurance_ok=true`
- `kappa_gate_pass=true`
- `current_development_gate_closure_ok=false`
- `hidden_authorized=false`
- 当前结论：`NOT READY — current development gates have 4 red gates`

### 3.3 预算、主仓与备份

- 实验主仓 `main`：`67cf84c9d40057fec02be7a963694938bff78a58`，与 `origin/main` 一致，clean。
- ledger：`spent_cny=121.511499`、`calls=7592`、`estimated_calls=15`。
- tag 总数：0。
- 私有远端 `KIM-ocean-HZ/spool-memory-research` 已保存恰 21 条 accepted heads；逐条 SHA 闭合，GR8
  远端 tip 为 `a4320c8428f94b304dcf097c7d55acd8e6eae6f8`；远端 tag 为 0，十条 Redo / 未接受分支未推送。
  后续接受的 GR9 `48b9f720…`、GR10 `2231eb66…`、GR11 `04ffebe8…`、GR12R3 `0ecd8d15…` 与
  GR13R2 `9b8b1e2…` 仍只在本地，未获新的远端操作授权。
- 2026-09-10，31 个实验 worktree 目录曾被整体挪入 `~/Desktop/Spool/spool- research/`，导致 git
  worktree 指针暂时指向旧路径；目录已原样移回 `~/Desktop/` 顶层，git 历史与文件无损失。这是操作性
  路径事件，不是数据事故，不写 `EXECUTION_POLICY` §8 中断；一条上个会话遗留的 prunable 临时
  worktree 保持未动。
- owner 于 2026-09-04 在 GR1R2 接受后明确授权继续 development-only 双面修闸探索：以 GR1R2
  为起点，在新隔离 branch/worktree 中分别评估 `review_routing` 与 `wrong_action_matcher`，允许读取
  和修改 v1.20 verifier，并使用已钉死的 196 条 development 证据机械复核。继续禁止 hidden、
  模型/API 调用、新费用、未登记 raw、正式运行、freeze、merge/tag/push；两轨必须分开验证，
  未经证据不得合并，比较报告后返回 owner。

该授权被拆为 GR2A routing-only、GR2B matcher-only sibling、GR2C comparison-only 三个验收光标。
GR2A 已接受；GR2B 被退回后由 GR2BR1 从 GR1R2 独立纠正，GR2BR1 也已接受。GR2C 被退回后由
GR2CR1 从 GR1R2 独立纠正，现已接受。comparison-only 授权已经用尽并按要求返回 owner；当前不再
开放 promotion、freeze、正式运行或 hidden。

owner 于 2026-09-05 明确“批准创建后续任务”。Codex 据此只开放一个最小、development-only 的
GR2D：把 GR2A 的 R2 routing deletion 与 GR2BR1 的 accepted UQ matcher patch 原样组合为唯一候选，
直接复跑钉死的 196 行并做 base / GR2A / GR2BR1 / combined 四器材对照，消除 overlap 与 interaction
的未决性。该授权不包括新 hypothesis、调参、gate/阈值变更、模型/API 调用、费用、正式运行、
promotion、freeze、hidden、merge/tag/push 或 GR2D 之后的任务。GR2D 已完成并验收为 `Accept`，该授权
现已用尽；当前必须返回 owner decision。

owner 于 2026-09-05 在 GR2D 接受后明确“授权下一步任务”。Codex 将授权收敛为一个不新增
hypothesis、不创建 candidate 的 development-only GR3：对 `{base matcher, accepted UQ matcher}` ×
`P({k1..k6})` 的 128 个封闭配置做穷尽普查，给出现有机制族能否四闸全绿的证书与 exact Pareto
frontier。该授权仍不包括正文探索、新信号、调参、阈值变更、模型/API 调用、费用、正式运行、G0、
promotion、freeze、hidden、merge/tag/push 或 GR3 之后的任务。

GR3 的数值结果为 closed family 不足、G1 结构阻断，但验收 verdict 为 `Redo`；按固定工作循环，
GR3R1 只纠正该 inverse-projection 证据缺口，仍在同一 GR3 授权内，不构成 GR3 之后的新任务。
GR3R1 随后验收为 `Accept`，该轮授权用尽并返回了 owner decision。

owner 于 2026-09-05 明确“批准根据文档下发后续任务”。Codex 未把这句扩成 candidate、hidden 或
正式运行，而只开放一个最小 development-only GR4：从钉死的 MB / MU 器材重新筛出两轴各 4 条
zero-opening FN，闭合集合关系与结构化失效面，并只对机械确定的 target union 做受控正文定界。
该任务不得定义 k7 或第二 matcher；GR4 已验收为 `Accept`，本轮授权现已用尽并返回 owner decision。

owner 于 2026-09-05 在 GR4 `Accept` 后明确“批准下一任务”。Codex 将授权收敛为一个最小、单假设、
development-only GR5：在逐行结果产生前锁定 `k7_complete_component_evidence_absence`，用既有结构化
verdict 字段直接重建 MB / MU，并穷尽 `{MB,MU} × P({k1..k7})` 的 256 格来测完整 gate 与安全代价。
本轮只允许提出这一个 routing hypothesis，不创建 candidate、不选择配置、不再读正文、不改阈值，
不授权第二 matcher、k8、模型/API、费用、promotion、freeze、正式运行、G0、hidden、merge/tag/push
或 GR5 之后的任务。GR5 已完成并验收为 `Accept`；该授权现已用尽，当前返回 owner decision。

owner 于 2026-09-06 在 GR5 `Accept` 后明确“批准下一任务”。Codex 没有把这句扩成 hidden、付费新 wave、
candidate 或阈值变更，而只开放 metadata-only GR6 readiness preflight：读取钉死的 GR5 六对象与九份
freeze / manifest / role metadata，判定是否已经存在可另行授权用于 locked-k7 样本外检验的独立 cohort，
并把缺失的 independence、role、approval、预算和 execution 条件机械列成 blocker。GR6 不读取任何
dataset 正文、不解引用 hidden 文件、不运行 scorer / model / cohort、不产生费用；结束后必须返回 owner，
不得自动创建 GR7。

GR6 随后以 `a76a2c6…` 交付；2026-09-06 验收为 `Redo`。按固定工作循环，GR6R1 只纠正独立 validator
与负测闭包，仍使用同一 GR6 授权，不构成后续实验任务，也不开放任何 dataset / hidden / 模型 / 预算 /
execution 权限。Codex 已确认 hidden=`underdetermined` 的保守判定正确；GR6R1 不得借 validator 修复改成
结论 4。

GR6R1 随后以 `847fbf83…` 交付；2026-09-06 验收为 `Accept`。GR6 的 metadata-only 授权至此用尽，
当前返回 owner decision；没有 ACTIVE 任务，不得自动创建 GR7、接触 dataset / hidden、执行 cohort、
申请预算或扩大到任何下一步实验。

owner 于 2026-09-06 随后明确“批准下发新任务”。Codex 没有把这句扩成 GR6R1 所列的 hidden
独立性审计、sealed hidden execution 或新 paid wave，也没有直接提出 k8 / 第二 matcher；只开放一个
development-only GR7 gold-oracle routing feasibility envelope。它沿 GR5 的固定 256 格，对每格加入
闭合 G1 必需的未路由 false negatives，再以四个 arm 的匿名整数计数求固定 G2/G3 下是否存在 exact
padding。该授权不包括内容阅读、新 hypothesis、candidate、selector、阈值、模型、费用、样本外、
promotion、freeze、正式运行、hidden、merge/tag/push 或 GR7 之后的任务。

GR7 随后以 `9b8a57e8ffde224b4bc25a2221ba18937884a9d5` 交付；2026-09-06 验收为 `Accept`。
本轮只得到 development gold-oracle routing 数学上界：G1–G3 envelope 可行 48/256，连同原有 G4
基线后 oracle-all-green 16/256；没有可部署 selector、candidate、配置选择、阈值变更或样本外结论。
GR7 授权至此用尽，当前返回 owner decision。

owner 于 2026-09-06 随后明确“批准新任务”。Codex 没有把这句扩成直接创建 k8 / selector candidate、
正文探索、dataset / hidden、模型调用、费用或正式运行；只开放一个 development-only GR8
observable-signature routing separability envelope。它对 GR7 的 16 个 oracle-all-green 格，使用预先固定、
不含 gold / arm / identity / 正文的低基数机器结构化 signature，计算覆盖全部 required rows 的最小
class-closed superset 与 collision 代价，并把匿名 padding 作为独立的更弱上界。本轮不保存 signature values /
positive lookup，不选择配置，也不自动下发 GR9。

GR8 随后以 `a4320c8428f94b304dcf097c7d55acd8e6eae6f8` 交付；2026-09-11 验收为 `Accept`。
固定 signature 形成 34 个等价类，覆盖 required rows 时 16 格均不可避免新增 42 行 collision，使
`|N_S(c)|=82…88`，全部超过 G2 上限 78；Layer A 与 Layer B 上界均为 `0/16`。本轮授权至此用尽，
当前返回 owner decision；不得自动创建 selector hypothesis、candidate、GR9 或扩大到 hidden / 样本外。

owner 于 2026-09-11 随后明确“创建下一任务”。Codex 将授权收敛为一个单 signature、development-only
GR9：完整保留 GR8 的字段集与禁止面，只把六个列表字段从三档桶替换成 exact nonnegative length，计算
新的最小 class closure、两层 gate 与对同一 exact tuple 全部确定性粗化的单调性上界。本轮不增加字段、
不搜索 bucket / threshold / field combination、不提出 selector hypothesis 或 candidate，不读取正文，
也不开放 dataset 扩展、样本外、hidden、模型/API、费用、正式运行、promotion、freeze、G0、远端操作
或 GR9 之后的任务。

GR9 随后以 `48b9f720958fc409419d7c823c607192f6c57925` 交付；2026-09-11 验收为 `Accept`。
exact-count 与 GR8 bucket signature 都形成 34 个等价类，34 个 bucket class 无一被再切分；16 格的
collision 仍恒为 42，`|N_exact(c)|=82…88`，Layer A / B 均为 `0/16`。同一 fixed-field exact tuple 的
所有确定性粗化因此也不可行。本轮授权已用尽，当前返回 owner decision；不得自动创建 GR10。

owner 于 2026-09-11 随后明确“下发下一任务”。Codex 未把它扩成按 gold 选字段、k8、selector、
candidate 或 hidden execution，只开放一个 pre-hypothesis、development-only、零费用 GR10：从 accepted
MU source AST 与同一 196 行 runtime key/type shape 穷尽 verdict schema，在任何 runtime value 产生前按
固定 grammar 完成资格注册表与无漏项证明。GR10 不打开 U1/M1 result，不计算字段值、频率、support、
class、collision 或 gate，不排名/选择/推荐字段；即使留下 structurally eligible primitive，也必须返回
owner，不能在本轮预注册或检验。本授权不包括 GR10 之后的任务或任何远端操作。

GR10 随后以 `2231eb6674db23c4ce4fb7f4e63acd2113a620c4` 交付；2026-09-11 验收为 `Accept`。
43 个 canonical entries 四分 `15/2/19/7`，七项只登记结构资格，未做任何 value / gold / efficacy 检验。
owner 随后明确“发出下一任务”。Codex 在不查看七项 runtime value、频率或效果的前提下，只按 accepted
source 语义预注册 `len(trace.missing)`：`trace.ok` 本来就是 `not missing`，故它是对 GR9 已有 trace
布尔状态的最小 exact-count refinement。GR11 只做这一项的 development class-closure separability
envelope；其余六项保持未检验，不开放 sweep、selector、candidate、hidden、样本外、模型、费用、正式
运行、promotion、freeze、远端操作或 GR11 之后的任务。

GR11 随后以 `04ffebe89c3ef38bb7b042052983dac40d1b1dd3` 交付；2026-09-11 验收为 `Accept`。
`len(trace.missing)` 没有切分 34 个 GR9 等价类中的任何一个；16 格 `A=78…82`、collision 恒 42、
reduction 恒 0、`|N_tm|=82…88`，Layer A / B 均为 `0/16`，逐格与 GR9 相同。本轮授权至此用尽，
当前返回 owner decision；不得自动检验第二 primitive、组合/阈值或创建 GR12。

owner 于 2026-09-11 随后明确“授权创建下一任务”。Codex 没有把这句扩成 primitive 组合、阈值搜索、
selector hypothesis、candidate、hidden 或样本外；只按 accepted source 的局部语义预注册第二个单项
primitive `len(trace.wrong_param_calls)`，创建 development-only GR12。GR12 的提交 parent 为 accepted
GR11，但科学 baseline 仍是 GR9 exact-count signature；本轮 signature 明确不含 GR11 的
`len(trace.missing)`。其余五项继续未检验，完成后必须返回 owner，不得自动创建 GR13。

GR12 随后以 `5e97492ae073771ae0aa7b1915748bca08afedb3` 交付；2026-09-12 验收为 `Redo`。
数值结果、六产物、拓扑与三条目标命令均闭合，但 analyzer 与 independent validator 都在 GR8 / GR9
anchors 闭合前先计算了本轮 `len(trace.wrong_param_calls)`，并在 structural split 前计算当前 Layer A / B；
现有顺序负测只验证硬编码产物布尔，未观察真实控制流。GR12 不进入 accepted chain。GR12R1 仅从 accepted
GR11 重做这两个 evaluation-order gate 与真实负测，不构成 GR12 之后的新实验，也不开放第三 primitive、
组合、selector、candidate、hidden、样本外或 GR13。

GR12R1 随后以 `a0bdb7757bacee748c817ec103e191bc49554297` 交付；2026-09-14 验收为 `Redo`。
拓扑、六产物、科学读数与三条目标命令均闭合，baseline-only P3 以及 split → Layer A → Layer B 已按要求
纠正；但 analyzer 与 validator 的 P1 schema gate 仍经 `trace_wrong_param_contract()` 直接执行
`len(trace[TRACE_WRONG_PARAM_KEY])`。ledger 只观察 P4 的 S_wp wrapper，测试也只统计 named helper
内的 `len()`，因此 first-primitive 证书漏掉真实早读。GR12R1 不进入 accepted chain。GR12R2 只从
accepted GR11 重做 P1 type-only / P4 value-read 分离与全读取面负测，不构成新实验。

GR12R2 随后以 `e11a589b2d8cba3584c146b172ea3d43176f6471` 交付；2026-09-14 验收为 `Redo`。
拓扑、六产物、科学读数、P1 type-only / P4 all-runtime-read closure 与三条目标命令均闭合；两套实现
各自只剩一处 P4-gated 真 `len()`，194 次 available read 全部由 accessor 帧在 P4 记账，P1/P3 在静态
调用图上不可达。但 `evaluation_order_gate` 的 `order_verified_from_runtime_events` 与
`order_claims_hardcoded` 仍直接返回字面 `True` / `False`，现有 source mutation 也未覆盖这两项，违反
GR12R2 §6 的明确派生要求。GR12R2 不进入 accepted chain。GR12R3 只从 accepted GR11 重做这两条
meta booleans 的 runtime/static provenance 与负测，不构成新实验。

GR12R3 随后以 `0ecd8d15a6eed905394791a9292faf640fe4ca2b` 交付；2026-09-15 验收为 `Accept`。
两条 meta booleans 分别由实际 runtime ledger 与 whole-source static AST closure 机械派生，五条 claim 的
binding / return provenance 与阳性对照负测闭合；GR12R2 已纠正的读取面、阶段顺序与科学读数无回退。
原 GR12 授权至此用尽，返回 owner decision。

GR13 / GR13R1 两次交付因 factual / scorer-scope negative-test closure 依次被退回；GR13R2 随后从
accepted GR12R3 独立重建并以 `9b8b1e299d5e80e0cc027a7829a3cb75e8f8c51a` 交付，2026-09-20 验收为
`Accept`。`len(trace.satisfied)` 的 development 科学 payload 保持不变，scorer-scope 真实删闸与恒真化
self-provenance 已闭合；GR13 / GR13R1 不进入 accepted chain。

owner 于 2026-09-20 随后明确“创建下一任务”。Codex 未把授权扩成 primitive 组合、字段排名、selector、
candidate、hidden 或样本外；只按 accepted `check_trace()` source 语义预注册第四个单项 primitive
`len(trace.invalid_tool_calls)`，创建 development-only GR14。parent 为 accepted GR13R2，科学 baseline
仍为 GR9；前三个已检验 primitive 不重读、不组合，其余三个继续未检验。完成后必须返回 owner，不得
自动创建 GR15。

## 4. 最近验收 —— GR6 / GR12 / GR12R1 / GR12R2 / GR13 / GR13R1 / GR15 / GR15R1 / GR15R2 / GR15R3 `Redo`、GR6R1 / GR7 / GR8 / GR9 / GR10 / GR11 / GR12R3 / GR13R2 `Accept`、GR14 `Accept with non-blocking note`

### 4.1 已核现场与通过项

- branch：`stage0a-wave2-k7-complete-component-evidence-absence-feasibility-gr5`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-k7-complete-component-evidence-absence-feasibility-gr5`
- commit：`f94898367e8e5238b54ad3a7de43bf829bc0c9cb`
- 唯一 parent：GR4 `624055f9e41ff3e642744b3b351fa8dc1cac871d`
- 相对 GR4 恰一笔提交、六个 `A`、0 个 `M`；GR3、GR2A、GR2BR1、GR2CR1、GR2D、GR2B、GR2C、
  GR1 / GR1R1 全部 absent；tag 总数 0；worktree clean。实验主仓仍为 `67cf84c…`、ahead 68、clean。
- 六个 changed paths、六文件 SHA 与任务书及回执逐项相同；posthoc 恰五项，CHECKSUMS 只登记 analyzer /
  test / JSON / REPORT 四项且不自列。测试后 HEAD、status、tag 与六 SHA 均未漂移。
- analyzer 与 independent validator 各自闭合 17 个 development 输入、五份上游 CHECKSUMS、v1.20
  freeze 两节、三个 accepted sibling 的 21 个对象、GR3R1 六对象与 GR4 六对象。validator 不 import
  analyzer / GR4 / GR3R1 模块，也不把前序 JSON / REPORT 当 expected document。
- 两套实现各自直接运行 MB 与按 GR2BR1 full `commit:path` 物化到临时目录的 MU；module object、source
  path 与 source SHA 均不同。k7 canonical AST digest 为 `ac4ddc09…1b1a7c`；结构闸逐项钉住 11 个合取
  条件，392 条 verdict 的 schema 闸为 388 complete / 4 malformed、truthy/falsy fallback 为 0。
- GR4 target 两轴各 4 条，k7 命中 4、漏 0，集合关系 `identical`。k7 全体命中 MB 74 / MU 72；与
  k1–k6 全开 overlap 27 / 26、mandatory overlap 均 20、增量 47 / 46；两轴交集 72、仅 MB 2、仅 MU 0。
- k7-off 128 格先机械重现 GR3R1：all-green 0，G1/G2/G3/G4 通过数 `0/104/16/64`，safety
  `120 unsafe_tradeoff / 4 safe_improvement / 4 no_effect`，Pareto 40，两轴 min unrouted 与 zero-opening
  FN 均为 4，四个 accepted quadruple 全部相同。
- 完整 256 格 all-green 0；G1/G2/G3/G4 通过数 `32/132/16/128`，Pareto 56，safety
  `4 safe_improvement / 248 unsafe_tradeoff / 4 no_effect`。128 对配对的 matcher 固定字段全部相同、
  G4 变化 0、routing 全单调；32 对 G1-unrouted 归零。
- 结构阻断者为 G1：8 格通过其余三闸但无一格再过 G1；任一格最多同时通过 3 闸。每个 gate 的 exact
  best achievable value 均为 0，分别由 32 / 8 / 8 / 128 格达到，但不构成推荐或 candidate 选择。
- k=2 下六张交叉表发布 2、抑制 4；泄漏扫描命中 0。候选 verifier、配置选择、第二 matcher、阈值变更、
  hidden、promotion / freeze 决定均为 0 / false / not_made。
- `/opt/anaconda3/bin/python3` 于 2026-09-06 独立复跑：pytest `150 passed in 746.34s`；analyzer
  `--check-existing` 三产物 byte-identical 且 `PASS`；independent validator 重建 33 个 pinned object、
  两份器材、canonical JSON 与 REPORT，均逐字节相同且 `PASS`。三条命令均 rc 0。

### 4.2 Findings 与 verdict

无 blocking finding；无 non-blocking finding。测试中把 target 静态闸从禁止含 `gr4` 名称调整为禁止
`open/read/load/git` 等读取调用是合理纠正：`GR4_TARGET_ANCHOR` 是任务书要求的计数锚，成员仍只由
内存 records 的逐行谓词产生，且 analyzer / validator 与真实 mutation 测试共同闭合这一点。

`Accept`

GR5 进入 accepted development evidence。它只证明锁定 k7 在钉死的 256 格 development-only 封闭族内
仍不足以闭合 G1–G4；没有创建 candidate、选择配置、改变阈值、提出第二 matcher / k8，亦不产生样本外、
promotion、freeze、正式运行、G0 或 hidden 结论。

### 4.3 GR6 findings 与 verdict

- 现场与回执一致：branch / worktree 正确；commit `a76a2c675046628445ee98243fe138c0b4d819f2`
  唯一 parent 为 GR5；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`；九个被退回 commit 均不在
  ancestry；tag 0、worktree clean；六文件 SHA、posthoc 五项与 CHECKSUMS 四项闭包均正确。
- GR5 六对象与九份 metadata 在工作树和 parent object 两侧的 SHA-256 均与任务书逐项相同；固定五行
  matrix、blocker、边界声明和唯一结论的科学内容正确。特别是 hidden 的同组 `parts/*.json` 只是不利
  线索，不是 project / trajectory / template family 三层任一层明确交叉的 metadata 证明；因此 hidden
  科学状态应保持 `underdetermined`，结论应为闭集第 5 条，不改成第 4 条。
- 三条目标命令由 Codex 复跑均 rc 0：pytest `37 passed in 13.50s`；analyzer `--check-existing` OK；
  validator 输出 `GR6 VALIDATOR OK · cohorts=5 · eligible_non_hidden=0`。测试后 HEAD / status / 六文件
  SHA 无漂移，两个目标目录无 `__pycache__`。
- **blocking finding：** validator 的 `v_check_matrix()` 只校验部分字段与 blocker 子集，
  `v_check_report()` 只校验 banner / 结论 / 禁词 / cohort 名称，没有从 15 个钉死输入独立构造完整
  expected payload 与 REPORT 并做逐字节比较。临时黑盒 mutation 删除 hidden 行
  `FAILURE_POLICY_NOT_FROZEN`、把 `failure_policy_ready=true` 后仍 rc 0；只把 REPORT 一处
  `role separation false` 改成 `true` 后也仍 rc 0。两次都已重签 CHECKSUMS，故不是摘要漂移误报。

`Redo`

GR6 不进入 accepted chain。GR6R1 只闭合上述 independent-validator / negative-test finding；不得扩大
为科学重判、dataset access、hidden、真实 validation、新 wave、预算或 GR7。

### 4.4 GR6R1 findings 与 verdict

- 现场与回执一致：branch / worktree 正确；commit
  `847fbf83c539854f380fded8a330f006fcf65a12` 唯一 parent 为 GR5；相对 parent 恰一笔 commit、六个
  `A` / 0 个 `M`；被退回 GR6 与所有禁止 sibling / Redo commit 均不在 ancestry；tag 0、worktree clean。
  实验主仓仍为 `67cf84c…`、ahead 68、clean。
- 六文件 SHA 与回执逐项相同；posthoc 恰五项，CHECKSUMS 只登记 analyzer / test / JSON / REPORT
  四项且不自列。GR5 六对象与九份 metadata 在工作树与 parent object 两侧的 15 条 SHA 全部闭合。
- analyzer、JSON 与 REPORT blob 和被退回 GR6 完全相同，科学 payload 没有漂移；hidden 仍为
  `underdetermined`，eligible / ready / eligible-hidden 均为 0，唯一结论仍为闭集第 5 条。
- validator 没有 import analyzer / tests / GR5 模块，也没有解析交付 JSON。它只从 15 个钉死输入独立
  重建 input closure、八个 GR5 边界、十项 metadata 自洽、registrations、derived facts、完整固定五行
  matrix、blocker 集、decision、owner-decision 与 not-this；随后独立 canonicalize JSON、render REPORT，
  并分别对交付整文件做 byte-exact 比较。
- 64 条黑盒测试全部先跑 byte-identical control，再施加 mutation；被退回的 failure-policy blocker /
  ready 联合篡改与 REPORT role-separation 普通事实篡改均在重签 CHECKSUMS 后被拒绝。新增逐字段、顶层
  派生事实、普通 REPORT 行及 key 顺序 / 缩进 / 末尾换行 mutation 也全部被同一整字节闸拒绝，不是特判。
- Codex 独立复跑：默认 `python3` 没有 pytest，按任务书允许改用 `/opt/anaconda3/bin/python3` 后
  pytest `64 passed in 25.25s`、rc 0；analyzer `--check-existing` 与 validator 均 rc 0。复跑后 HEAD、
  status、tag、六 SHA 无漂移，目标目录无 `__pycache__`。

无 blocking finding；无 non-blocking finding。

`Accept`

GR6R1 进入 accepted metadata-only readiness evidence。它只关闭 GR6 validator / 负测缺口，不证明 k7
有效、无效或可泛化，不授权 dataset / hidden / 新 wave / 模型 / 预算 / validation execution，也不创建 GR7。

### 4.5 GR7 findings 与 verdict

- 现场与回执一致：branch / worktree 正确；commit
  `9b8a57e8ffde224b4bc25a2221ba18937884a9d5` 唯一 parent 为 GR5；相对 parent 恰一笔 commit、六个
  `A` / 0 个 `M`；GR6R1、被退回 GR6 / GR3 与列明的 accepted siblings 均不在 ancestry；tag 0、
  worktree clean。实验主仓仍为 `67cf84c…`、ahead 68、clean。
- 六个 changed paths 的工作树与 `HEAD:path` SHA 均和回执逐项相同；posthoc 恰五项，CHECKSUMS 只登记
  analyzer / test / JSON / REPORT 四项且不自列。commit message 精确，未带 footer。
- analyzer 与 validator 各自闭合 17 个 development 输入、五份上游 CHECKSUMS、v1.20 freeze 两节、
  三个 accepted sibling 的 21 个对象、GR3R1 / GR4 / GR5 各六对象；MB 直接装载 accepted v1.20，MU
  从 GR2BR1 full `commit:path` 物化，未把前序 JSON / REPORT 当 expected document。
- GR5 256 格在 oracle 计算前完整逆投影：all-green 0，G1/G2/G3/G4 passing `32/132/16/128`，
  gate-vector 闭集、k7-off 锚、Pareto 40、四个 accepted quadruple 与 arm denominators `56/56/56/28`
  全部闭合；k7 AST digest 仍为 accepted `ac4ddc09…1b1a7c`，本轮没有新增 routing signal。
- `U(c)=F\(N∪M)` 逐行现算；每格加入后 G1 unrouted 为 0，删任一 required row 后恰回到 1。G2 用
  integer cap 78；G3 用 `Fraction` 对四个 arm 的 max-min 做 exact `≤1/10`；7041 个全局向量闭集由
  必要条件剪枝 DFS 生成，并由只带 sum 约束的暴力枚举逐点证明无漏解。
- 结果为 G1–G3 envelope 可行 48/256，oracle-all-green 16/256；MB 为 32/128 可行、0 all-green，
  MU 为 16/128 可行且 16 all-green；k7-off 为 48/128 可行，k7-on 为 0/128。最小 final review
  `55…76`，padding `0…36`，最小 vector tie 恒为 1。阻断计数为 G2 cap 176、G3 balance 32、G4
  baseline 128，分层与可重叠语义正确。
- k=2 非识别闸发布 96、抑制 160；输出不含成员集合、逐行 gold 映射、身份 / join key、正文、模型标识、
  绝对路径或 hidden 路径。selector / hypothesis / candidate / configuration selection / threshold / hidden /
  model / cost / promotion / freeze 边界均保持 false / 0 / `not_made` / `underdetermined`。
- Codex 独立复跑：`/opt/anaconda3/bin/python3` pytest `124 passed in 774.14s`、rc 0；analyzer
  `--check-existing` 三产物 byte-identical 且 `PASS`；independent validator 重建 39 个 pinned objects、
  两份器材、canonical JSON 与 REPORT，均逐字节相同且 `PASS`。复跑后 HEAD / status / tag / 六 SHA
  无漂移，目标目录无 `__pycache__`。

无 blocking finding；无 non-blocking finding。

`Accept`

GR7 进入 accepted development evidence。它只证明固定门槛下 routing-only mathematical feasibility
在 development gold oracle 上存在；没有识别可部署 selector，不创建 candidate、不选择配置、不改阈值，
也不产生样本外、promotion、freeze、正式运行、G0 或 hidden 结论。

### 4.6 GR8 findings 与 verdict

- 现场与回执一致：branch / worktree 正确；commit
  `a4320c8428f94b304dcf097c7d55acd8e6eae6f8` 唯一 parent 为 GR7；相对 parent 恰一笔 commit、六个
  `A` / 0 个 `M`；GR6R1、被退回 GR6 / GR3 与其余八条 Redo commit 均不在 ancestry；tag 0、
  worktree clean。commit message 精确，无 footer。
- 六个 changed paths 的工作树与 `HEAD:path` SHA 逐项相同；posthoc 恰五项，CHECKSUMS 只登记 analyzer /
  test / JSON / REPORT 四项且不自列。复跑后 HEAD / status / tag / 六 SHA 无漂移，无 `__pycache__`。
- analyzer 与 independent validator 各自闭合 17 个 development 输入、五份上游 CHECKSUMS、v1.20
  freeze、三份 accepted sibling 的 21 个对象、GR3R1 / GR4 / GR5 / GR7 对象链，并直接装载两份器材。
  signature AST 固定为 15 slots；禁止字段、动态读取、成员表、signature value / lookup 与泄漏扫描均闭合。
- 196 行形成 34 个 signature 等价类，support `1…27`，11 个 singleton。GR7 target family 恰 16 格、
  全部 MU / k7-off / G4 pass；最小 class closure 新增 `78…82` 行，其中 collision 恒为 42 行，最终
  `|N_S(c)|=82…88`。Layer A all-green `0/16`，Layer B 匿名 padding 上界 `0/16`。
- Codex 独立复跑三条目标命令：pytest `174 passed in 849.70s`、rc 0；analyzer `--check-existing`
  三产物 byte-identical 且 `PASS`；independent validator 重建 45 个 pinned objects、两份器材、canonical
  JSON 与 REPORT，均逐字节相同且 `PASS`。
- 私有远端只读复核：恰 21 个 heads，逐条 tip 与 accepted 白名单相同；GR8 tip 为 `a4320c84…`，
  `main` 为 `67cf84c9…`，远端 tag 0，仓库 visibility=`PRIVATE`。

无 blocking finding；无 non-blocking finding。

`Accept`

GR8 进入 accepted development evidence。它只证明固定 `machine_observable_shape_v1` 无法在冻结门限下
实现任一 GR7 oracle-all-green 格；不识别可部署 selector、不创建 candidate、不选择配置、不改阈值，
也不产生样本外、promotion、freeze、正式运行、G0 或 hidden 结论。

### 4.7 GR9 findings 与 verdict

- 现场与回执一致：branch / worktree 正确；commit
  `48b9f720958fc409419d7c823c607192f6c57925` 唯一 parent 为 GR8；相对 parent 恰一笔 commit、六个
  `A` / 0 个 `M`；GR6R1、被退回 GR6 / GR3 与 GR2A / GR2BR1 / GR2D 均不在 ancestry；tag 0、
  worktree clean。commit message 精确，无 footer。实验主仓仍为 `67cf84c9…`、main、clean。
- 六个 changed paths 的工作树与 `HEAD:path` SHA 和回执逐项相同；posthoc 恰五项，CHECKSUMS 只登记
  analyzer / test / JSON / REPORT 四项且不自列。GR8 六对象在 parent 与工作树两侧的 SHA 也逐项闭合。
- analyzer 与 independent validator 各自闭合 17 个 development 输入、五份上游 CHECKSUMS、v1.20
  freeze、三个 accepted sibling 的 21 个对象、GR3R1 / GR4 / GR5 / GR7 / GR8 对象链，并直接装载
  MB 与按 full `commit:path` 物化的 MU。exact signature 固定为 15 slots，只有六个 list-valued slots
  从 bucket 改为裸 `len(list)`；纯投影、禁止字段、动态读取、成员表、signature value / lookup 与泄漏闸闭合。
- exact 与 bucket 均形成 34 个 class，support `1…27`、11 个 singleton；34 个 bucket class 无一被
  exact count 切分。16 格 target 均为 MU / k7-off / G4 pass；`U=36…40`、`A_exact=78…82`、collision
  恒为 42、`|N_exact|=82…88`，Layer A / B 均为 `0/16`，`K_exact⊆K_bucket` 为 `16/16`。
- 单调性证书发布条件成立：exact Layer B 全部不可行，因此同一 fixed-field exact tuple 的所有确定性
  粗化也不可能在这 16 格中实现可行性。该结论仍只限 development class-closure upper bound。
- Codex 独立复跑三条目标命令：pytest `220 passed in 1150.68s`、rc 0；analyzer `--check-existing`
  三产物 byte-identical 且 `PASS`；independent validator 重建 51 个 pinned objects、两份器材、canonical
  JSON 与 REPORT，均逐字节相同且 `PASS`。复跑后 HEAD / status / tag / 六 SHA 无漂移，无 `__pycache__`。

无 blocking finding；无 non-blocking finding。

`Accept`

GR9 进入 accepted development evidence。它只证明同一 GR8 fixed-field tuple 的 exact-count ceiling 与
全部确定性粗化，在钉死的 development 16 格中仍不足以闭合冻结门；不识别可部署 selector、不创建
candidate、不选择配置、不改阈值，也不产生样本外、promotion、freeze、正式运行、G0 或 hidden 结论。

### 4.8 GR10 findings 与 verdict

- 现场与回执一致：branch / worktree 正确；commit
  `2231eb6674db23c4ce4fb7f4e63acd2113a620c4` 唯一 parent 为 GR9；相对 parent 恰一笔 commit、六个
  `A` / 0 个 `M`；列明的 accepted siblings 与 Redo commits 均不在 ancestry；tag 0、worktree clean。
  commit message 精确，无 footer。
- 六个 changed paths 的工作树 SHA 与回执逐项相同；posthoc 恰五项，CHECKSUMS 只登记 analyzer / test /
  JSON / REPORT 四项且不自列。八个 runtime/source input、MU full `commit:path` 与 GR9 六对象在 parent /
  工作树两侧的 SHA 全部闭合；MU accepted commit 相对 GR1R2 实为七个新增路径，source 在其中。
- analyzer 从通用 AST 种类推断重建 schema；independent validator 以逐 path 固定 AST 形状走另一条推导路，
  未 import analyzer / tests / 前序任务模块，也未把交付 JSON / REPORT 或 GR9 result 当 expected。两者均闭合
  21 个顶层 key、18 个 base key、末三项 enriched overlay、8 个 `trace` direct key、29 个 source path 与
  5 个 source-closed outcome literal；无第三 keyset、computed key 或 `.update(**x)`。
- 43 个 canonical audit entries 的四分类为 `15 / 2 / 19 / 7`，pairwise disjoint + exhaustive，unknown 0、
  unclassified 0，13 个 element-subtree marker 全部禁止。runtime 只核 key 与 exact type identity，196 行及
  两种 variant 均覆盖，保存/比较值 0、读取 list element 0，未发布 per-variant 行数。
- 七项 structurally eligible registry 按任务书固定顺序发布；唯一结论与 development-only 限定精确，报告
  明示序号不是排名、优先级或推荐。gold / efficacy / selection / leak / hidden / model / cost / promotion /
  freeze 边界均闭合。
- Codex 独立复跑：默认 `python3` 无 pytest；按任务书允许使用 `/opt/anaconda3/bin/python3` 后 pytest
  `147 passed in 277.95s`、rc 0；analyzer `--check-existing` 与 independent validator 均 rc 0 / `PASS`，
  canonical JSON / REPORT 逐字节相同。复跑后 HEAD / status / tag / 六 SHA 无漂移，无 `__pycache__`。
- 执行者披露曾把提交态写入产物，提交后暴露自失效并删除该字段，再以 `--amend` 保持最终单提交拓扑；最终
  commit 的产物已由提交后全套命令闭合。该过程说明不改变最终 artifact、拓扑或科学边界。

无 blocking finding；无 non-blocking finding。

`Accept`

GR10 进入 accepted development-only schema eligibility evidence。它只证明 accepted MU schema 在冻结 grammar
下仍有七项结构合格但未检验的 content-blind primitive；不证明任何一项有效，不构成 hypothesis、candidate、
field ranking、selector、k8、配置选择、样本外、promotion 或 freeze 结论。GR10 授权至此用尽，返回 owner。
GR10 任务书已归档于
`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR10-DEVELOPMENT-REMAINING-MACHINE-OBSERVABLE-SCHEMA-SURFACE-AUDIT-2026-09-11.md`。

### 4.9 GR11 findings 与 verdict

- 现场与回执一致：branch / worktree 正确；commit
  `04ffebe89c3ef38bb7b042052983dac40d1b1dd3` 唯一 parent 为 GR10；相对 parent 恰一笔 commit、
  六个 `A` / 0 个 `M`；列明的 accepted siblings 与 Redo commits 均不在 ancestry；tag 0、worktree clean。
  reflog 确认规定分支从 GR10 新建后只产生这一笔 GR11 commit；实验主仓仍为 `67cf84c9…`、main、clean。
- 六个 changed paths 的工作树 SHA 与 `HEAD:path` SHA 和回执逐项相同；posthoc 恰五项，CHECKSUMS
  只登记 analyzer / test / JSON / REPORT 四项且不自列。复跑后 HEAD / status / tag / 六 SHA 无漂移，
  无 `__pycache__`。
- analyzer 与 independent validator 各自闭合 17 个 development 输入、五份上游 CHECKSUMS、v1.20
  freeze、三个 accepted sibling 的 21 个对象，以及 GR3R1 / GR4 / GR5 / GR7 / GR8 / GR9 / GR10
  各六对象；validator 未 import analyzer / tests / 前序任务模块，也未把前序 JSON / REPORT 当 expected。
- 单槽 AST 闸确认唯一新增读取为 direct `trace.missing`、唯一变换为 built-in list length；新槽只在 GR9
  15-slot tuple 末尾，投影只 drop-last。accepted source AST 同时证明 `trace.ok` 由 `not missing`
  构造，`missing` 是 append-only list；其余六项未做效果检验或排名。
- GR7 / GR8 / GR9 / GR10 anchors 全部机械重建：256 格、7041-vector、target family 16 格；34 class、
  support `1…27`、11 singleton；GR9 split / unsplit `0/34`、collision 42、final `82…88`、两层 `0/16`；
  GR10 source paths 29、entries 43、四分 `15/2/19/7`、eligible 7。
- 本轮结果为 `split_gr9_class_count=0`、`identical_to_gr9=16/16`；16 格 `A=78…82`、`E=42`、
  reduction 0、`|N_tm|=82…88`，Layer A / B 均为 `0/16`，每格存在 singleton positive class。
- Codex 独立复跑三条目标命令：pytest `265 passed in 1450.13s`、rc 0；analyzer `--check-existing`
  三产物 byte-identical 且 `PASS`；independent validator 重建 63 个 pinned objects、两份器材、canonical
  JSON 与 REPORT，均逐字节相同且 `PASS`。负测的每条 mutation 均先跑 byte-identical control rc 0。

无 blocking finding；无 non-blocking finding。

`Accept`

GR11 进入 accepted development evidence。它只证明预注册的 `len(trace.missing)` 在钉死的 development
16 格中没有增加 GR9 的 class-closure separability；不识别可部署 selector、不创建 candidate、不选择配置、
不改阈值，也不产生样本外、promotion、freeze、正式运行、G0 或 hidden 结论。GR11 授权至此用尽，返回 owner。
GR11 任务书已归档于
`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR11-DEVELOPMENT-TRACE-MISSING-EXACT-COUNT-SEPARABILITY-ENVELOPE-2026-09-11.md`。

### 4.10 GR12 findings 与 verdict

- 现场与回执一致：commit `5e97492ae073771ae0aa7b1915748bca08afedb3` 唯一 parent 为 accepted
  GR11；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`；branch、worktree、reflog、message、tag 0、
  clean status 均闭合。实验主仓仍为 `67cf84c9…`、main、clean。
- 六文件工作树 SHA 与 `HEAD:path` 一致；posthoc 恰五项，CHECKSUMS 恰登记 analyzer / test / JSON /
  REPORT 四项且不自列。测试后 HEAD、status、tag、六 SHA 无漂移，无 `__pycache__`。
- source semantic gate、单槽 AST、drop-last、GR11 不组合与泄漏边界的内容正确；两套实现都可复现
  split `0/34`、16 格逐格等于 GR9、collision 42、final `82…88`、Layer A / B `0/16`、reduction 0。
  REPORT 正确保留 `trace.missing + trace.wrong_param_calls` 为 `underdetermined`，没有排名剩余五项。
- Codex 复跑三条命令：pytest `299 passed in 1756.33s (0:29:16)`；analyzer `--check-existing` PASS，
  三产物 byte-identical；independent validator 重建 69 pinned objects、两器材、canonical JSON / REPORT
  后 PASS。
- **blocking finding：** analyzer `build_document()` 在 `signature_index(records)` 内先调用本轮 S_wp 并取
  `len(trace.wrong_param_calls)`，随后才调用 GR8 / GR9 anchor closure；validator 同序。两套实现又先以
  combined cell helper 计算当前 Layer A / B，再调用 structural split。现有测试只断言 canonical document
  的 `checked_before_* = true`，或篡改该布尔后确认 byte-exact 拒绝，没有验证真实调用顺序。因此实现违反
  GR12 §2.2 / §4.4 / §8 的硬门，产物顺序声明与控制流不符；测试全绿不能替代该实现级闭包。

`Redo`

GR12 不进入 accepted chain。只开放 GR12R1：从 accepted GR11 重建同一六件交付，先以 baseline-only
path 闭合 GR8 / GR9，再第一次打开本轮 primitive；之后按 structural split → current Layer A → current
Layer B 的真实阶段顺序执行，并用 runtime event ledger 与 source mutation 负测闭合。不得改变科学范围。
GR12 任务书已归档于
`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR12-DEVELOPMENT-TRACE-WRONG-PARAM-CALLS-EXACT-COUNT-SEPARABILITY-ENVELOPE-2026-09-11.md`。

### 4.11 GR12R1 findings 与 verdict

- 现场与回执一致：commit `a0bdb7757bacee748c817ec103e191bc49554297` 唯一 parent 为 accepted
  GR11；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`；rejected GR12 与列明的 Redo
  commits 均不在 ancestry。branch、worktree、reflog、message、tag 0、clean status 均闭合；实验主仓
  仍为 `67cf84c9…`、main、clean。
- 六文件 SHA 与回执逐项一致；posthoc 恰五项，CHECKSUMS 恰登记 analyzer / test / JSON / REPORT 四项且
  不自列。复跑后 HEAD、status、tag、六 SHA 无漂移，无 `__pycache__`。
- P3 baseline-only path 与 split → current Layer A → current Layer B 主 pipeline 已纠正；两套实现重新得到
  split `0/34`、16 格逐格与 GR9 相同、collision 42、final `82…88`、Layer A / B
  `0/16`、reduction 0。边界声明、无组合、无第三 primitive、无 selector / candidate 均闭合。
- Codex 复跑三条目标命令：pytest `330 passed in 1895.90s (0:31:35)`；analyzer
  `--check-existing` rc 0，三产物 byte-identical；independent validator rc 0，重建 69 pinned
  objects 后 canonical JSON / REPORT byte-identical。
- **blocking finding：** analyzer P1 的 `rebuild_all()` 在每个 matcher 上调用
  `verdict_schema_gate()`，后者进入 `trace_wrong_param_contract()` 并在第 2774 行直接执行
  `exact_count(len(trace[TRACE_WRONG_PARAM_KEY]), ...)`；validator 第 2756 行同样从 P1
  `_rebuild_all()` 到达。ledger 的 `EVENT_PRIMITIVE` 只在 P4 wrapper 中记录，现有
  `test_only_the_helper_may_take_the_new_length_and_only_once()` 也只检查 helper 自身，均未观察
  该早读。因此发布的 first-primitive-after-anchors 只证明 wrapper 顺序，不证明真实 primitive value 的
  首次读取顺序，违反 GR12R1 §5.1 / §5.3 / §7。

`Redo`

GR12R1 不进入 accepted chain。只开放 GR12R2：从 accepted GR11 重建同一六件交付，把 P1 schema/type
闭包与长度 value 闭包彻底分开，并让 runtime / AST 负测覆盖全部真实 wrong-param length reads。
不得改变 GR12R1 已纠正的其余阶段顺序或扩大科学范围。GR12R1 任务书已归档于
`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR12R1-DEVELOPMENT-TRACE-WRONG-PARAM-CALLS-EVALUATION-ORDER-CORRECTION-2026-09-12.md`。

### 4.12 GR12R2 findings 与 verdict

- 现场与回执一致：commit `e11a589b2d8cba3584c146b172ea3d43176f6471` 唯一 parent 为 accepted
  GR11；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`；branch、worktree、reflog、message、tag 0、
  clean status 均闭合。GR12、GR12R1、GR6、GR3 均不在 ancestry；实验主仓仍为 `67cf84c9…`、main、clean。
- 六文件 SHA 与回执逐项一致；posthoc 恰五项，CHECKSUMS 恰登记 analyzer / test / JSON / REPORT 四项且
  不自列。GR12R1 六个 full `commit:path` scaffold SHA 全部闭合；复跑后现场无漂移、无 `__pycache__`。
- 两套实现各自只剩一处 direct wrong-param `len()`，都在 byte-identical 的
  `read_trace_wrong_param_length`；phase guard 在真实 `len` 前、ledger event 紧贴其后。194 次 available read
  全部由 accessor 帧在 P4 发出，两个 not-applicable 行不记 event；P1 / P3 入口静态不可达 accessor。
- baseline-only P3 与 P5→P6→P7 保持正确；split `0/34`、16 格与 GR9 相同、collision 42、final
  `82…88`、Layer A / B `0/16`、reduction 0。三个新增 structure-gate evidence blocks 与
  `names_reachable_in_signature += ledger` 不违反 canonical shape：§6 只冻结 evaluation-order 七键并禁止
  debug / 越界字段，原 GR12 §9 没有冻结整份 JSON。
- Codex 独立复跑：pytest `351 passed in 2028.63s (0:33:48)`；analyzer `--check-existing` 三产物
  byte-identical 且 `PASS`；validator 重建 69 pinned objects 后 canonical JSON / REPORT byte-identical 且 `PASS`。
- **blocking finding：** analyzer `evaluation_order_gate()` 第 4922–4923 行与 validator 第 4904–4905 行把
  `order_verified_from_runtime_events` / `order_claims_hardcoded` 直接返回为字面 `True` / `False`，违反
  GR12R2 §6 第 141–143 行的机械派生要求。`assert_order_gate_is_derived()` 与新增 source mutations 只覆盖
  另外三条顺序布尔；JSON forge 只证明 byte-exact，不能证明这两项的 runtime/static provenance。

`Redo`

GR12R2 不进入 accepted chain。只开放 GR12R3：从 accepted GR11 重建同一六件交付，仅让这两条 meta
booleans 分别由 runtime ledger 与 static AST closure 派生并补足真实 source mutations。不得改变已经闭合的
read/order/science 结果或扩大范围。GR12R2 任务书已归档于
`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR12R2-DEVELOPMENT-TRACE-WRONG-PARAM-CALLS-ALL-RUNTIME-READ-ORDER-CORRECTION-2026-09-14.md`。

### 4.13 GR12R3 findings 与 verdict

- 现场与回执一致：commit `0ecd8d15a6eed905394791a9292faf640fe4ca2b` 唯一 parent 为 accepted
  GR11 `04ffebe89c3ef38bb7b042052983dac40d1b1dd3`；相对 parent 恰一笔 commit、六个 `A` / 0 个
  `M`；branch / worktree / reflog / message 精确，tag 0、status clean。被退回的 GR12 / R1 / R2、GR6
  与 GR3 均不在 ancestry；实验主仓仍为 `67cf84c9…`、main、与 `origin/main` 一致且 clean。
- 六文件 SHA 与回执逐项一致；posthoc 恰五项，CHECKSUMS 只登记 analyzer / test / JSON / REPORT
  四项且不自列。GR12R2 六个 full `commit:path` scaffold object 的 SHA 也与任务书逐条一致。
- analyzer 与 independent validator 各自实现 runtime ledger 和 whole-source AST closure，不共享可执行代码、
  cache 或 event 文件。`order_verified_from_runtime_events` 复用三条实质顺序布尔并核对 event
  phase / count / zero violations；`order_claims_hardcoded` 只由当前整份源码的 AST provenance 求得。
- P0 的 structure gate 钉住五条 claim 的非字面 binding、三条实质 claim 的 ledger 调用、五条 return
  binding 复用，并逐条把五个 binding 改写为 `True` 做阳性对照。新增五条黑盒 mutation 覆盖两条
  meta literal、static provenance 断开与两种 closure 架空；每条都由同一 `_mutate_validator` 先跑 control
  rc 0，再要求 mutation rc 2。既有两 meta JSON forge 测试继续通过。
- `evaluation_order_gate` 仍恰七键且顺序 / 最终值为
  `true / true / true / 0 / true / false`。两套实现各自仍只剩一处 P4-gated 真 `len()`；194 次
  available read、P1 / P3 不可达、baseline-only P3、P5→P6→P7、16 格 aggregate 与 k=2 结论全部无回退。
  JSON / REPORT 与 GR12R2 逐字节相同。
- Codex 独立复跑三条目标命令：python test `360 passed in 2696.47s (0:44:56)`；analyzer
  `--check-existing` 三产物 byte-identical 且 `PASS`；independent validator 重建 69 个 pinned objects、
  两份器材与 canonical JSON / REPORT 后 byte-identical 且 `PASS`。复跑后 HEAD / status / tag / 六 SHA
  无漂移，全树无 `__pycache__`。

无 blocking finding；无 non-blocking finding。

`Accept`

GR12R3 进入 accepted development evidence。它只证明预注册的 `len(trace.wrong_param_calls)` 在钉死的
development 16 格中没有增加 GR9 的 class-closure separability，且该结论的 evaluation-order
evidence 已由 runtime/static provenance 机械闭合。不识别可部署 selector、不创建 candidate、不选配置、
不改阈值，也不产生样本外、promotion、freeze、正式运行、G0 或 hidden 结论。原 GR12 授权至此用尽。

### 4.14 GR13 findings 与 verdict

- 现场与回执一致：commit `f206463d9cebc3081d2ad4bde189569d4aa3217f` 唯一 parent 为 accepted
  GR12R3；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`；branch / worktree / reflog / message 精确，
  tag 0、status clean。GR12 / R1 / R2、GR6、GR3、GR6R1 与列明 sibling 均不在 ancestry。
- 六文件工作树 SHA 与 `HEAD:path` 相同；posthoc 恰五项，CHECKSUMS 恰登记 analyzer / test / JSON /
  REPORT 四项且不自列。P0–P8、single accessor、194 次 P4 read、drop-last、16/16 containment 与边界闭合。
- 科学读数可重建：41 classes、support `1…26`、14 singleton；split `7/34`；collision 42→36；
  `|N_ts|=76…82`；Layer A `0/16`（G1/G2/G3/G4=`16/8/0/16`），Layer B `0/16`；case-② 英文
  conclusion 与 rider 正确。
- 三条目标命令由 Codex 用任务书允许的 `/opt/anaconda3/bin/python3` 复跑：pytest
  `364 passed in 4220.55s (1:10:20)`；
  analyzer 三产物 byte-identical 且 `PASS`；validator canonical JSON / REPORT byte-identical 且 `PASS`。
- **blocking finding 1：** analyzer `conclusion_block()`、validator `_conclusion_block()`、JSON 第 2575 行与
  REPORT 第 18 行把 `|N_ts|=76…82` 解释为“全部越过 G2 上限 78”。逐格分布实际为
  `76×4 / 77×4 / 81×4 / 82×4`，所以 G2 是 8 pass / 8 fail；16 格共同失败的是 G3。
- **blocking finding 2：** JSON `commits.gr12r3_parent_gr10=2231eb66…` 发布了错误 parent 关系；
  GR12R3 的唯一 parent 是 GR11 `04ffebe8…`，GR11 的 parent 才是 GR10。
- **blocking finding 3：** validator 的 summary 求和漏掉 `GR11_OBJECTS`，实际完整闭包为
  `9×6+21=75` objects，却打印 69；同时 REPORT 未披露 accepted scorer 的 satisfied narrative-only read，
  tests 也没有任何 mutation 针对 `JoinedStr` / decision-local closure，故回执称“四条新 mutation tests
  已钉住且 REPORT 已明示”不成立。

`Redo`

GR13 不进入 accepted chain。只开放 GR13R1：从 accepted GR12R3 重建同一六件交付，仅纠正上述
canonical factual statements、object count 与 scorer-scope REPORT / mutation closure；不得改变已经闭合的
primitive/read/order/science 结果或扩大范围。GR13 任务书已归档于
`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR13-DEVELOPMENT-TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-2026-09-15.md`。

### 4.15 GR13R1 findings 与 verdict

- 现场与回执一致：commit `0bedadfa7d47d03528cae7864e00634c7511d8fc` 唯一 parent 为 accepted
  GR12R3；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`；reflog / message / branch / worktree 精确，
  tag 0、status clean。GR13、GR12 / R1 / R2、GR6 / GR6R1 与 GR3 均不在 ancestry。
- 六文件工作树 SHA 与 `HEAD:path` 一致；posthoc 恰五项、CHECKSUMS 恰四条且不自列；GR13 六个
  full `commit:path` scaffold SHA 与任务书一致。测试后 HEAD / status / tag / 六 SHA 无漂移，无
  `__pycache__` 或 `verify_stage0a_v120_*` 残留。
- 三类 factual correction 本体正确：结论逐格发布 G2 pass/fail `8/8` 与 G3 pass `0/16`；commits map
  逐代为 GR12R3→GR11→GR10→GR9；REPORT / validator 机械发布 75 objects；scorer-scope block 与
  REPORT 发布 read `1`、narrative in/out `1/0`、5 名 / 21 bindings、decision-local read `0`。
- 六条 accepted-scorer 黑盒 mutation 均实际改 SHA 复核后的临时 source，覆盖 `JoinedStr` 逃逸、
  `passed`、tuple `outcome`、`mandatory`、移除读取与架空 binding closure；原 read/order/science payload
  保持 41 classes、split `7/34`、collision 36、reduction 6、Layer A/B `0/16`。
- Codex 独立复跑三条目标命令均 rc 0：pytest `403 passed in 3484.66s (0:58:04)`；analyzer 三产物
  byte-identical；validator 输出 `pinned objects=75 generations=9 siblings=3` 且 canonical JSON / REPORT
  byte-identical。回执“新增 37 条测试”计数不准：实际新增 38 个 test functions / 39 个 collected cases，
  不削弱覆盖。
- **blocking finding：** `test_dropping_the_scorer_scope_gate_from_the_validator_is_rejected()` 没有删除
  `gr10_registry_closure()` 内任何 enforcement；它只把发布字段从 `len(decision_bindings)` 改成 `+1`，
  因最终 product mismatch 被拒绝。直接删除 `_need(satisfied_reads)`、五名全绑定、
  `_need(decision_reads == 0)`、`JoinedStr` ancestry 或 narrative-count gate 会保持 canonical output 不变，
  而源码没有 self-provenance closure 发现缺闸，故违反 GR13R1 §6(5)。

`Redo`

GR13R1 不进入 accepted chain。只开放 GR13R2：从 accepted GR12R3 重建同一六件交付，保持全部
factual/read/order/science 结果不变，仅补 scorer-scope enforcement 自身的 P0/static provenance 与真实
gate-deletion / constant-true mutations。GR13R1 任务书已归档于
`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR13R1-DEVELOPMENT-TRACE-SATISFIED-FACTUAL-CLOSURE-CORRECTION-2026-09-16.md`。

### 4.16 GR13R2 findings 与 verdict

- 现场与回执一致：commit `9b8b1e299d5e80e0cc027a7829a3cb75e8f8c51a` 唯一 parent 为 accepted
  GR12R3；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`；GR13、GR13R1、GR12 / R1 / R2、GR6 与
  GR3 均不在 ancestry。branch / worktree / message 精确，tag 0、status clean。
- 六文件 SHA 与回执逐项一致；posthoc 恰五项，CHECKSUMS 恰登记 analyzer / test / JSON / REPORT 四项且
  不自列。GR13R1 六个 full `commit:path` scaffold object 也与任务书逐条一致。
- analyzer 与 independent validator 各自加入非发布 whole-source AST closure，机械闭合五族 gate、四个
  accepted-source 派生局部量、逐 read `JoinedStr` ancestry loop 与七项发布事实绑定。validator 在
  `scorer-scope` 首 stage、读产物和 rebuild / compare 前执行；analyzer 在 `build_blobs()` 顶部执行。
- 五族 validator gate 的真实删除 5 条与恒真化 5 条均 control rc 0 → mutation rc 2，stderr 为单行
  `FAIL [scorer-scope]` 且排除 rebuild / compare；analyzer 两条真实删除同样在 byte compare 前 rc 2。
  两套实现 × 五族 × 删除/恒真的 20 个静态阳性对照均报脏；直接对照证明移除 gate 与本轮自证后旧
  validator 仍会 rc 0，故本轮确实关闭 GR13R1 finding，而非依赖 product mismatch。
- canonical JSON / REPORT 与 GR13R1 逐字节相同；41 classes、support `1…26`、14 singleton、split `7/34`、
  collision 36、reduction 6、`|N_ts|=76…82`、Layer A / B `0/16`、G2 `8/8`、G3 `0/16`、
  containment `16/16`、七键 evaluation-order、lineage 与 75-object summary 均无回退。
- Codex 独立复跑三条目标命令均 rc 0：pytest `439 passed in 6406.34s (1:46:46)`；analyzer 三产物
  byte-identical 且 `PASS`；validator 输出 `pinned objects=75 generations=9 siblings=3`，canonical JSON /
  REPORT byte-identical 且 `PASS`。复跑后 HEAD / status / tag / 六 SHA 无漂移，无 `__pycache__`、`*.pyc`
  或 `verify_stage0a_v120_*` 残留。

无 blocking finding；无 non-blocking finding。

`Accept`

GR13R2 进入 accepted development evidence。它只关闭 scorer-scope gate-deletion self-provenance 缺口并保留
GR13R1 已纠正的 factual/read/order/science payload；不识别 selector、不创建 candidate、不选配置、不改阈值，
也不产生样本外、promotion、freeze、正式运行、G0 或 hidden 结论。任务书已归档；当前返回 owner decision。

### 4.17 GR14 findings 与 verdict

- 现场与回执一致：commit `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17` 唯一 parent 为 accepted
  GR13R2；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`；GR6R1 / GR6 / GR3 / GR12 / GR12R1 /
  GR12R2 / GR13 / GR13R1 均不在 ancestry。branch / worktree / message 精确，tag 0、status clean。
- 六文件 SHA 与回执逐项一致；posthoc 恰五项，CHECKSUMS 恰登记 analyzer / test / JSON / REPORT 四项且
  不自列。10 代 accepted ancestry 与 3 个 accepted sibling 共 81 个 full `commit:path` objects 全部闭合；
  GR13R2 六对象双侧 SHA 与任务书一致。
- accepted-source AST gate 机械闭合 `calls`、`allowed`、`invalid`、direct return 与 `trace.ok = not missing`；
  scorer scope 证明 `trace` 与 `ok` 确实被读、`invalid_tool_calls` 全程零读取，并以五族 gate 的删除与恒真化
  在 `scorer-scope` stage、canonical compare 前 rc 2。P0–P8 runtime ledger 与七项 order claims 均可追溯。
- 34 个 GR9 class 无一被切分；16/16 格逐格重现 GR9 且 `K_ti ⊆ K_exact`；collision 恒 42、reduction 0、
  `|N_ti|=82…88`、Layer A / B 均为 `0/16`；k=2 的 16 个 arm blocks 全部发布、0 抑制。固定结论为
  该 exact-count refinement 不增加 development separability，并保留任务书 §11 rider。
- Codex 独立复跑三条目标命令均 rc 0：pytest `448 passed in 5287.31s (1:28:07)`；analyzer 三产物
  byte-identical 且 `PASS`；validator 输出 `pinned objects=81 generations=10 siblings=3`，canonical JSON /
  REPORT byte-identical 且 `PASS`。复跑后 HEAD / status / tag / 六 SHA 无漂移，无 cache、pyc 或 candidate 残留。
- 环境说明：机器默认 Python 3.14.2 会在继承的 GR5 K7 AST-digest compatibility check 报旧 digest；任务书
  明确允许的 `/opt/anaconda3/bin/python3` 3.12.2 下三条目标命令全部闭合。它不是 GR14 source、产物或
  科学 payload 漂移，但后续复核应继续使用钉住的 3.12 环境。

无 blocking finding。Non-blocking：analyzer 与 validator 的 scorer-scope 段各残留一条紧邻旧注释，误称
accepted scorer 在 narrative f-string 中读取 `tr["invalid_tool_calls"]`；下一条更正注释、实际 source gate、
canonical JSON / REPORT 与 mutation tests 均正确证明读取次数恒为 0，不影响本轮事实或结论。

`Accept with non-blocking note`

GR14 进入 accepted development evidence。它只闭合单个 `len(trace.invalid_tool_calls)` primitive；不识别
selector、不创建 candidate、不做 primitive 组合、不选配置、不改阈值，也不产生样本外、promotion、freeze、
正式运行、G0 或 hidden 结论。任务书已归档；当前返回 owner decision。

### 4.18 GR15 findings 与 verdict

- 现场与回执一致：commit `08b70f5c35ee63152b7aa10c8795a1afd1acd369` 唯一 parent 为 accepted
  GR14；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`；GR6R1 / GR6 / GR3 / GR12 / GR12R1 /
  GR12R2 / GR13 / GR13R1 均不在 ancestry。branch / message 精确，tag 0、status clean。
- 六文件 SHA 与回执逐项一致；posthoc 恰五项，CHECKSUMS 恰登记 analyzer / test / JSON / REPORT 四项且
  不自列。11 代 accepted ancestry 与 3 个 accepted sibling 共 87 个 full `commit:path` objects 全部闭合；
  工作树六 blob 与 `HEAD:path` 一致，复跑后无 `__pycache__` / `*.pyc`。
- 数值 payload 可由 analyzer 与 independent validator 各自重建：34→58 classes、split `16/34`、collision
  42→7、reduction 35、`|N_tc|=47…53`；Layer A `0/16`，G1/G2/G3/G4=`16/16/0/16`；Layer B
  `16/16` feasible，minimum final 76 / minimum padding 23；固定 case ④ conclusion 正确。
- Codex 独立复跑三条目标命令均 rc 0：pytest `453 passed in 4689.83s (1:18:09)`；analyzer 三产物
  byte-identical 且 `PASS`；validator 输出 `pinned objects=87 generations=11 siblings=3`，canonical JSON /
  REPORT byte-identical 且 `PASS`。测试全绿不替代以下 implementation / factual closure。
- **blocking finding 1：** analyzer `trace_calls_made_contract()` 第 3328 行执行
  `type(trace[TRACE_CALLS_MADE_KEY])`，第 3332–3334 行的 dynamic loop 又执行 `type(trace[name])`；它由
  `verdict_schema_gate()` 第 3306 行在 P1 调用。Python 会先求值 subscript 才能调用 `type()`，所以本轮
  字段已在 P1 被真实读取。whole-source scanner 第 2492–2565 行却专门把 `type(...)` 下的 subscript 排除，
  测试第 4269–4287 行也把这个错误假设钉成正测，故发布的 P4 first-and-only read / runtime order 声明不实；
  validator 有同构缺口。
- **blocking finding 2：** 任务书 §3 钉死 available row 的第 16 槽为 raw
  `verdict["trace"]["calls_made"]` integer；analyzer 第 948–961 行与 validator 第 916–929 行实际追加
  `("available", count)`，tests 第 350–366 行明确接受该二元组。这个包装虽不改变本次 partition 数值，仍
  不是预注册 signature；结果同构不能覆盖 preregistration drift。
- **blocking finding 3：** canonical REPORT 第 3 / 5–6 行把本轮标题写成 GR14、把 primitive 写成不存在的
  `len(trace.calls_made)`，并把 `calls_made=len(calls)` 错述为 invalid / allowed-set count；JSON 第 454、
  705–706、2946 行复制同类错误。REPORT 第 718–719 行又把从未检验项写成 3、历史已检验项写成 4 且
  漏掉 GR14 `trace.invalid_tool_calls`，与同报告第 40 行的正确“两项 / 五项”直接矛盾。

`Redo`

GR15 不进入 accepted chain。只开放 GR15R1：从 accepted GR14 重建同一六件交付，把 P1 对本轮字段的
所有 runtime subscript 移到 P4 后、把 available slot 改回 raw integer，并关闭 JSON / REPORT factual
contradictions；科学 payload 必须保持不变，不得扩大为第二 primitive、组合、selector、candidate、hidden
或样本外。实际 GR15 worktree 已按 owner 指示移入 `~/Desktop/spool-research/worktrees/`；路径偏离原任务书
不进入 commit，六 blob 与目标命令均未因此漂移，不另列 finding。主仓当前登记 44 个 worktree（主仓 +
42 个实验 worktree + 1 个已披露 stale scratchpad），仍恰一条 unrelated `prunable`。

### 4.19 GR15R1 findings 与 verdict

- 现场与回执一致：commit `160db5f1be90921c6959e63ad25ff0fd3a946039` 唯一 parent 为 accepted
  GR14；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`；rejected GR15、GR3 / GR6 / GR12 /
  GR12R1 / GR12R2 / GR13 / GR13R1 与 sibling GR6R1 均不在 ancestry。branch / message 精确，tag 0、
  status clean；reflog 显示分支从 GR14 创建后只产生这一笔 commit。
- 六文件 SHA 与回执逐项一致；posthoc 恰五项，CHECKSUMS 恰登记 analyzer / test / JSON / REPORT 四项且
  不自列。运行前后 HEAD、status 与六 SHA 无漂移，无 `__pycache__` / `*.pyc`。11 代 accepted ancestry +
  3 sibling 的 validator summary 为 87 objects；rejected GR15 六 scaffold SHA 也闭合。
- GR15 的三类 finding 本体已正确纠正：P1 现有 direct literal / constant-key / guarded GR10 loop / direct
  helper 路径不读本轮值；available 第 16 槽为 raw exact nonnegative integer，194 available / 2 malformed、
  scalar `not_applicable` 与 drop-last 逐行闭合；JSON / REPORT 的 GR15R1 heading、`trace.calls_made` spelling、
  `calls_made=len(calls)` source semantics、历史 4 / 当前 5 / never-tested 2 均一致。
- analyzer `--check-existing` 与 independent validator 由 Codex 独立复跑均 rc 0，canonical JSON / REPORT
  byte-identical。pytest 在交互会话中断前运行到 45% 且无 failure；执行者回执的完整 `471 passed` 本轮未
  再独立跑到 summary，但这不覆盖以下静态 blocking findings。
- 数值 payload 由两套实现各自重建且与 GR15 无漂移：58 classes、support `1…25`、singleton 28、split
  `16/34`、collision 7、reduction 35、`|N_tc|=47…53`；Layer A `0/16`，G1/G2/G3/G4=`16/16/0/16`；
  Layer B `16/16` feasible，minimum final 76 / minimum padding 23；固定 conclusion 正确。
- **blocking finding 1：** analyzer 的 `_is_calls_made_subscript()` 第 2514–2520 行只识别
  `ast.Subscript` 且 slice 为 literal `"calls_made"` 或 `TRACE_CALLS_MADE_KEY`；
  `_unguarded_dynamic_trace_reads()` 第 2633–2638 行又只识别 slice 为 `ast.Name`。因此在 P1 加未使用
  结果的 `trace.get("calls_made")`、`trace.get(TRACE_CALLS_MADE_KEY)` 或
  `trace["calls_" + "made"]` 时，真实 runtime read 已发生，但 whole-module site count 仍为 1、P1
  reachability 仍为 0、产品也不变；validator 第 2485–2504 / 2604–2609 行同构。任务书 §4 明列
  `.get("calls_made")` 为禁止面，并要求 direct / constant / computed / dynamic / helper-alias 全闭包。
- **blocking finding 2：** GR15R1 任务书 §6 第 158–160 行要求 JSON、REPORT、analyzer、validator 与
  tests 都统一声明 delivery round 为 GR15R1 correction、科学问题为 GR15。JSON 与 REPORT 已正确，但
  analyzer 第 3 行仍写 GR15，validator 第 3 行仍写 GR15，tests 第 3 行甚至仍写 GR14；P0 factual closure
  没有解析三份 Python 的 module identity，因此没有兑现“五类交付面一致”。

`Redo`

GR15R1 不进入 accepted chain。只开放 GR15R2：从 accepted GR14 重建同一六件交付，为 P1 建立覆盖
literal / constant / computed / dynamic / `.get` / `__getitem__` / helper-callable-alias 的保守 whole-source
read closure 与真实 fail-before-product mutations，并把 Python / JSON / REPORT 五类 delivery identity
统一成 GR15R2 correction、科学问题仍为 GR15。不得改变 direct-integer、canonical facts 或科学 payload，
不得扩大为第二 primitive、组合、selector、candidate、hidden、样本外或 GR16。

### 4.20 GR15R2 findings 与 verdict

- 现场与回执一致：commit `c42faaef5cc6661ed216c1162273c953a65beb58` 唯一 parent 为 accepted
  GR14；相对 parent 恰一笔 commit、六个 `A` / 0 个 `M`；GR15R1 / GR15、GR3 / GR6 / GR12 /
  GR12R1 / GR12R2 / GR13 / GR13R1 与 sibling GR6R1 均不在 ancestry。branch / worktree / message
  精确，tag 0、status clean；实验主仓仍为 `67cf84c9…`、main、clean。
- 六文件工作树 SHA 与 `HEAD:path` 一致并逐项等于回执；posthoc 恰五项，CHECKSUMS 恰四条且不自列；
  GR15R1 六个 scaffold object SHA 与任务书一致。P1 的 12 条阳性对照、四族 enforcement、三份 Python
  首部 / round constants、raw-integer 第 16 槽、scalar sentinel 与 58-class scientific payload 均闭合。
- Codex 独立复跑三条目标命令均 rc 0：pytest `656 passed in 8693.78s (2:24:53)`；analyzer 三产物 byte-identical 且 `PASS`；
  validator 输出 `pinned objects=87 generations=11 siblings=3`，canonical JSON / REPORT byte-identical
  且 `PASS`。测试后 HEAD / status / tag / 六 SHA 无漂移，无目标目录 cache / pyc / candidate 残留。
- **blocking finding 1：** 钉住 source `67cf84c9…:harness/verify_stage0a.py` 的 `check_trace()` 实际
  是 `t.get("kind") == "call" and t.get("tool")`；analyzer 第 5317–5324 行与 validator 第
  5266–5273 行的独立 AST gate 也明确只接受 `.get`。但 analyzer 第 1851 行、validator 第 1799 行、
  canonical REPORT 第 6 / 706 行与 JSON 第 3050 行都发布
  `t["kind"] == "call" and t.get("tool")`。缺 `kind` 时两者行为不同，故这是 canonical factual
  contradiction。两套 `assert_canonical_facts_are_closed()` 又只检查 `len(calls)`、invalid/allowed
  等子串，没有把 access form 与 AST gate 机械绑定；测试也未覆盖该 drift。
- **blocking finding 2（执行边界）：** 执行者披露开发期运行过一次 `find .` 并遍历整个 worktree。
  未发现文件正文读取、哈希、保存或科学 payload 污染证据，因此不登记为内容泄漏 / 数据事故；但 broad
  directory walk 不满足当前“不得接触 hidden”的绝对边界，也不能支撑回执中的 `hidden_touched=false`
  过程声明。旧系统临时目录与本轮无关，保持未动。

`Redo`

GR15R2 不进入 accepted chain。只开放 GR15R3：从 accepted GR14 重建同一六件交付，把 canonical
source-semantics narrative 改为并机械绑定到 `.get("kind") == "call"` + `.get("tool")`，补真实错写、删闸、
恒真化与绕开 mutations；同时在 fresh worktree 只做精确路径检查，不再全树遍历。不得改变已闭合的 P1 /
round-identity / direct-integer / science 结果，不得扩大为第二 primitive、组合、selector、candidate、hidden、
样本外或 GR16。

### 4.21 GR15R3 findings 与 verdict

- 现场与回执一致：commit `4d6a419cae875d3c8595c890056791d75203097a` 唯一 parent 为 accepted
  GR14；恰一笔 commit、六个 `A` / 0 个 `M`。branch / worktree / message 精确；branch reflog 显示从
  GR14 新建后只产生此提交；列明 rejected commits 与 GR6R1 均不在 ancestry。tag 0、status clean，
  实验主仓仍为 `67cf84c9…`、main、clean。
- 六文件工作树 SHA 与 `HEAD:path` 及回执逐项一致；posthoc 恰五项，CHECKSUMS 恰四条且不自列。
  GR15R2 六 scaffold object 的 raw-byte SHA 也逐项闭合；检查只针对点名路径，没有全树遍历。
- analyzer 第 4297–4385 行、validator 第 4129–4206 行已正确把 narrative 与钉住 source 的实际
  comprehension / kind / tool 原文绑定；source SHA 为 `ce014e…`，其 `check_trace` 第 452 行是
  `.get("kind") == "call" and t.get("tool")`。九条 controls、五族判据与四条 derivation links 的
  本体正确；新增六个 JSON 计数属于绑定证据，不含逐行数据，也不扩大科学范围，非本次退回原因。
- GR15R2 已闭合的 P1 / identity / raw-integer 科学代码没有回退。REPORT 相对 R2 只改标题、两处
  narrative 与一条 excluded commit；JSON 只改轮次、rejected provenance、narrative 与六个计数。
  科学读数仍为 58 classes、support 1…25、singleton 28、split/unsplit 16/18、collision 7、reduction
  35、final 47…53、Layer A 0/16、Layer B 16/16、minimum final 76 / padding 23。
- Codex 用 Python 3.12.2 独立复跑 analyzer `--check-existing` 与 validator，均 rc 0 / PASS；三份
  analyzer 产品逐字节一致，validator 为 `87 objects / 11 generations / 3 siblings`，canonical JSON /
  REPORT 逐字节一致。pytest 因下述静态 finding 已足以决定 Redo 而由 Codex 主动中止，summary 为
  `209 passed in 2263.24s (0:37:43)`，无测试失败；中断退出码 2 不是 mutation 拒绝证据。执行者回执
  的完整 `763 passed` 本窗未独立跑至结束，不登记为三条独立复跑全绿。
- **blocking finding（P1）：** validator 第 3869–3882 行 `_main_order_holds()` 的晚阶段只列出
  `_preflight`、`_build_document`、`_compare`；不跟踪第 9701 行比较参数中的实际
  `_read_text(_DIR + "/" + _DOC)`。只将现有 JSON read 移到 source-semantics invocation 前，晚处
  复用其结果，六个被检查函数的相对顺序完全相同，order predicate 仍为 true；binding、五族判据、
  九条 controls、四条 derivation links 与科学代码均无需改变。其余 self-provenance 不检查这处
  product reader。tests 第 5381–5386 行只提前整个 `_preflight()`，也没有观测实际 product I/O。
  因而未兑现任务书 §4(4) 对实际 product read 前移的 fail-before-product 要求。
  这是源文件审查与内存 AST 对照证据：未修改交付分支，未运行额外 runtime probe，不声称变异版
  已实测 rc 0。当前正常版本实际顺序正确；本 finding 不代表已经发生提前读取或科学污染。

`Redo`

GR15R3 不进入 accepted chain。只开放 GR15R4：从 accepted GR14 重建同一六件交付，使顺序自证覆盖
实际 product readers / science rebuild 与前置可达闭包，补 actual-read relocation 和边界前拒绝的真实
观测；保留 source-semantics、P1、identity、direct-integer 与全部科学结果。不得扩大到第二 primitive、
组合、selector、candidate、hidden、样本外或 GR16。GR15R3 任务书已验收归档。

## 5. 当前状态 —— ACTIVE GR15R4

GR15R3 已验收为 `Redo` 并归档；当前唯一 ACTIVE 任务书：

`docs/TASKBOOK-STAGE0A-GR15R4-DEVELOPMENT-TRACE-CALLS-MADE-PRE-PRODUCT-READ-CLOSURE-CORRECTION-2026-09-24.md`

- parent / accepted development head：GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`。
- rejected scaffold：GR15R3 `4d6a419cae875d3c8595c890056791d75203097a`；R2 / R1 / GR15 为 older
  rejected raw-byte closure；projected scientific baseline 仍为 GR9。
- branch：`stage0a-wave2-trace-calls-made-pre-product-read-closure-gr15r4`。
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-calls-made-pre-product-read-closure-gr15r4`。
- 唯一纠正面：实际 product read / rebuild 提前时必须在边界前 rc 2，不能只看包装函数名或失败 stage。
- 保留 GR15R3 已闭合的 source-semantics / P1 / identity / direct-integer / science；五面 delivery round
  更新为 GR15R4 correction，科学问题仍为 GR15。
- 六个新增路径、一笔固定 message commit、Python 3.12.2 三条目标验证命令；定向路径检查。
- 不授权第二 primitive、组合、排名、selector/candidate、hidden、样本外、模型/API、费用、正式运行、
  promotion、freeze、G0、远端操作或 GR16。

## 6. 下一窗验收方法与工作重点

1. 完整读取本文件与 GR15R4 ACTIVE 任务书；已归档的 GR15R3 及更早任务书只供审计，不当作 ACTIVE 重跑。
2. 收到交付后先核 commit / 唯一 parent / branch / worktree / changed paths / 六 SHA / status / tag；
   不因旧回执的测试全绿跳过实现级审查。
3. 重点核实际 JSON / REPORT / CHECKSUMS reader 的前置可达闭包；检查搬移真实读取、helper / alias
   委托与搬入 preflight helper 的 mutations，以及“拒绝前真实 I/O / rebuild 为零”的观测。
4. 核 source-semantics 的九条 controls 与六个计数、P1 / round identity / direct-integer / science 无回退；
   只运行任务书 §9 的三条目标验证命令，不添加 runtime probe。
5. 给出唯一 verdict，归档任务书并维护当前入口；不得自动创建 GR16。

`docs/HANDOFF-2026-09-04.md` 继续保持历史现场，不补入 D / GR 系列当前光标。

## 7. 当前权限与绝对禁止

当前 ACTIVE 授权只覆盖 GR15R4 任务书：从 accepted GR14 创建精确 branch/worktree，读取钉死 git
objects 与既有 aggregate schema，新增恰六个路径，运行 §9 三条目标验证命令及其明确允许的产品生成 /
语法检查，创建一笔固定 message commit。GR15R3 三份 Python object 只作机械 scaffold；其产品只作
raw-byte closure / finding 文字对照。GR15R2 / GR15R1 / GR15 只作 older raw-byte closure；四者都不进
ancestry，不作 expected science。accepted commits、原器材与所有冻结件仍不得修改。

当前一律禁止：

- 接触 hidden；不得 open、stat、hash、glob、预处理或引用其内容；
- 人工读取或披露 rows/trace/answer、episode/gold/M1 正文；读取任务书闭包外的 `raw_outputs/`、其它 raw
  run、未登记 trace、sibling worktree、被退回 GR2B 七文件或任何逐行身份；
- 联网、安装依赖、模型调用、费用、新预算或 approval；
- 修改实验主 worktree、accepted commits、原 `harness/verify_stage0a_v120.py`、freeze、protocol、gold、
  rubric、任一 accepted candidate、任一 routing/component/matcher/suppression/blocks-pass/threshold、
  既有词表或 runner；
- merge、tag、fetch、pull、push；2026-09-11 已完成的 21 条 accepted refs 私有远端备份是 owner 单独
  明确批准并已收口的历史动作，不构成继续操作远端的授权；
- 运行 GR15R4 任务书 §9 以外的实验命令，包括 rejected GR15R3 / GR15R2 / GR15R1 / GR15、已完成的 GR14、GR13R2、rejected GR13R1 / GR13、GR12R3、
  rejected GR12 / GR12R1 / GR12R2、GR11 或任何更早任务的目标命令、`pytest harness/` 整目录、旧
  rescore/sweep/semantic probe、模型 runner 或重算 κ；
- 读取/保存/比较 taskbook 允许的 aggregate 之外的 verdict actual values、list elements、result、frequency、
  support、identity 或正文；重算或保存 `trace.wrong_param_calls` / `trace.missing` exact value、frequency、
  signature、member 或 identity；
- 读取或检验 GR10 registry 中本轮 `trace.calls_made` 以外的六项 runtime value；读取原始 call list 的
  元素/tool/args；重读或重算 missing / wrong-param-calls / satisfied / invalid-tool-calls 的逐行值；把多项做 sweep、排名、
  选择、组合或推荐；搜索 bucket/cap/threshold，
  创建 candidate verifier、新 routing signal、selector hypothesis、第二 matcher，改写 k7/扩展 target、调参、
  阈值变更、promotion、M1 改写、D1 重闭包、新 freeze、G0、hidden、正式运行或自动派发 GR16；
- 调用 subagent。

此外，本轮路径与残留检查只能定向到任务书点名的 branch/worktree、六个 changed paths 与 posthoc 五项；
禁止 `find .`、全 worktree `find`、全树 glob/scandir/walk，禁止进入或清理 hidden/raw/旧系统临时目录。

证据不足时必须写 `underdetermined`，不得为了得到根因自行扩权。

## 8. 不得恢复的旧光标

- `docs/HANDOFF-2026-09-04.md` 把 C1 写成下一步；C1/C2/κ/J1/U1/M1/D1 均已完成，不得重做。
- 旧 R1/R2 v1.21 hidden architecture 讨论被当前四红闸挡住，不得恢复。
- 未接受的 D2 `3068b31…`、D2R1 `6a53404…`、D2R2 `2b2c07e…`、D2R3 `aaca216…`、
  GR1 `545f46a…`、GR1R1 `a24fe3e…`、GR2B `5bbe249…`、GR2C `8e9cd64…` 与 GR3
  `33f0d66…` 都不是
  accepted parent。
- D2R4 `6b67451…`、GR1R2 `076a486…`、GR2A `da0bd25…`、GR2BR1 `fae90ec…`、GR2CR1
  `eb19084…`、GR2D `073c109…`、GR3R1 `372703c…`、GR4 `624055f…`、GR5 `f948983…`、GR6R1
  `847fbf83…`、GR7 `9b8a57e…`、GR8 `a4320c84…`、GR9 `48b9f720…`、GR10 `2231eb66…`、
  GR11 `04ffebe8…`、GR12R3 `0ecd8d15…`、GR13R2 `9b8b1e2…` 与 GR14 `0120c5e1…` 均已接受；不得重复执行。GR2A / GR2BR1 /
  GR2CR1 只是后续任务的钉死输入或锚，不是其 parent。GR6 `a76a2c6…` 同样未接受，只能按 GR6R1
  归档任务书解释其历史地位，不得作为 parent。GR12 `5e97492…` 也已验收为 `Redo`，不得作为 parent、
  accepted baseline 或可恢复执行光标。GR12R1 `a0bdb775…` 与 GR12R2 `e11a589…` 也已验收为 `Redo`，
  同样不得作为 parent 或 accepted evidence；GR12R3 已完成对它们的限定纠正，不得重开。
  GR13 `f206463d…` 与 GR13R1 `0bedadfa…` 也已验收为 `Redo`，不得作为 parent 或 accepted evidence；
  GR13R2 已完成对它们的限定纠正。不得恢复被退回的 GR2B / GR2C / GR3 / GR6 / GR12 / GR12R1 /
  GR12R2 / GR13 / GR13R1 / GR15 / GR15R1 / GR15R2 / GR15R3 或任何已完成执行光标；当前唯一光标是 ACTIVE GR15R4 任务书。
  GR9 的 exact-count closure、GR10 的 registry、GR11 的
  `trace.missing`、GR12R3 的 `trace.wrong_param_calls`、GR13R2 的 `trace.satisfied` 与 GR14 的
  `trace.invalid_tool_calls` 单 primitive 结论都不得扩成真实 selector、
  candidate、cohort execution、primitive 组合、promotion、freeze、G0、hidden 或其它 repair。GR15R4 只允许
  纠正 `trace.calls_made` 同一单 primitive 交付的实际 product read / rebuild 顺序自保护，
  不得借此恢复或组合前四项。GR15 `08b70f5…`、GR15R1 `160db5f…`、GR15R2 `c42faaef…` 与
  GR15R3 `4d6a419…` 均已 `Redo`，不得作为 parent 或 accepted evidence。

## 9. 下一次更新本文件时必须保留

- 稳定入口声明与固定工作循环；
- accepted commit chain 和当前四闸读数；
- 最近一次 verdict 及其最小证据；
- 唯一当前任务书，或“无任务、等待 owner decision”的明确状态；若有任务则保留其
  branch/worktree/parent、读取面与停止条件；
- 授权边界、hidden 禁止与 owner decision 条件；
- 陈旧光标警告；
- §10 的 Knote 文档管理规则与文件清单（新增文件、归档文件时同步更新那张表）。

不要让本文件再次变成某个单次窗口的静态说明；它必须始终只暴露一个最新有效光标（可执行任务或 owner decision）。


---

## 10. Knote 文档管理规则（Codex 负责维护）

2026-09-05 由 owner 指定：Knote 的 `docs/` 由 Codex 统一管理。目的只有一个 ——
**任何一个新窗口打开 `docs/` 都能立刻分清「现在要做的」「还没做完的」「只用来查历史的」**，
不必翻文件日期或猜。

### 10.1 三条硬规矩

1. **一件事只许待在一个地方。** 任务只写进任务书；进度只写进 handoff；长期顺序只在
   `EXECUTION_POLICY.md`。⛔ 不得为了「保持一致」把同一件事抄进第二个文件。
2. **文件首屏必须自报状态。** 每份文档第一屏要写清 `ACTIVE` / `COMPLETE` / `SUPERSEDED` /
   `留档不开工` 中的一种，以及它被谁取代。⛔ 靠文件名日期判断新旧是无效的。
3. **做完就搬走。** 任务书验收后（无论 `Accept` 还是 `Redo`）立即移入
   `docs/archive/stage0a-taskbooks/`；被取代的 handoff、跑完的一次性清单、已落地的设计稿
   移入 `docs/archive/`。⛔ archive 里的东西一律不作为开工入口。

### 10.2 每一轮任务的固定文档动作

| 时机 | 动作 |
|---|---|
| 下发新任务 | 新任务书写在 `docs/` 根目录，首屏写 `ACTIVE`；同时更新本文件的「当前光标 / 当前任务书」 |
| 收到 Claude 回执 | 只核 git object 与文件 SHA，⛔ 不改任务书 |
| 给出 verdict | 把 verdict 写进该任务书首屏（`COMPLETE` + verdict + 后续任务书路径），再把它移进 `docs/archive/stage0a-taskbooks/` |
| 无可执行任务 | 本文件光标明确写「等待 owner decision」，⛔ 不留一份没人执行的 ACTIVE 任务书在根目录 |
| 发现文档过期 | 只改路由句（哪份是入口），⛔ 不改历史记录里写成当时状态的句子 |

### 10.3 `docs/` 现存文件与各自的作用

**入口（当前 4 份，只有这 4 份能决定「现在做什么」）**

| 文件 | 作用 | 谁能改 |
|---|---|---|
| `EXECUTION_POLICY.md` | 长期顺序唯一权威，LOCKED | ⛔⛔ 只有 owner 明确同意才能改，Codex 与 Claude 一律禁止 |
| `CODEX-HANDOFF-STAGE0A-D2-REVIEW-2026-09-03.md` | 本文件：实验线唯一滚动入口；当前光标为 ACTIVE GR15R4 | Codex |
| `TASKBOOK-STAGE0A-GR15R4-DEVELOPMENT-TRACE-CALLS-MADE-PRE-PRODUCT-READ-CLOSURE-CORRECTION-2026-09-24.md` | 当前唯一 ACTIVE 实验任务书；只纠正实际 product read / rebuild 顺序自保护，完成即归档 | Codex 下发；Claude Code 执行 |
| `HANDOFF-2026-09-04.md` | Knote 侧仍然生效的约束 + 还没做完的事。⛔ 已精简，⛔ 不含执行光标 | 每窗结束时补未完成项 |

**任务库与研究线**

| 文件 | 作用 |
|---|---|
| `WORKPLAN-2026-08-22.md` | 产品线未完成任务总表，只减不增 |
| `AI_MEMORY_EXPERIMENT_PROTOCOL-2026-08-26.md` | 实验协议 v0.1；正式冻结版在实验仓，不在这里 |
| `DESIGN_PROJECT_MEMORY.md` | 项目工作记忆设计稿 + 三线框架，未进入施工 |
| `RESEARCH_ANSWER_PROVENANCE-2026-08-29.md` / `RESEARCH_RAG_CONTEXT-2026-08-24.md` | 只读调查，未批准施工 |

**产品设计稿（都还有没做完的格，所以留在根目录）**

`DESIGN_AI_ENGINE.md`（§7.6 未验、§7.7 待拍板）· `DESIGN_CONTEXT_HYGIENE.md`（§8）·
`DESIGN_FOLLOW_UP.md`（§8 会话内跟进）· `DESIGN_MCP_INTENT_ROUTING.md`（F 未开工）·
`DESIGN_MCP_WRITE_ROLE.md`（M2 等真实使用）· `DESIGN_PROJECT_FILES.md`（未开工）·
`DESIGN_WORKBENCH.md`（§9 重构）· `DESIGN_WORKSPACE_PACK.md`（§7 未提交）·
`DESIGN_WINDOWS_PORT.md` + `WINDOWS-CHECK.md`（未签名、三四轮未装机验）·
`COMPRESS-UX-R2-2026-08-22.md`（8 条里 1/5/7 未做）· `FEEDBACK-FORM-2026-08-22.md`（等 owner 建问卷）·
`DESIGN_CASE_STUDY.md`（后几期在等）。

**事实与对外口径（只增不改）**

`CASE_STUDY_LEDGER.md`（可披露数字的唯一台账）· `CASE_STUDY_PAGE.md` ·
`Deepseek-API-compress-test.md`（六轮 API 实测台账）· `METRICS.md`（下载量，⚠️ 32 次全是自测）·
`SPOOL_OVERVIEW.md`（英文总览，⚠️ 其中 Pack 表头那张表已过期，以 `src-tauri/src/mcp.rs` +
`src/lib/pack/templates.ts` 为准）。

**手册**

`RELEASE.md` · `RELEASE_NOTES_v0.5.0/0.6.0/0.6.1/0.6.2.md` · `DB_BACKUP_AND_RECOVERY.md` ·
`PRIVACY.md`（改它必须同时改 `site/privacy.html` 与 `scripts/site-zh-privacy.html` 并重跑
`node scripts/build-site-zh.mjs`）· `README.md`（docs 目录索引，改动文件时同步更新）。

### 10.4 2026-09-05 的一次性整理回执（Claude Code 执行，⛔ 未提交）

- `docs/` 根目录 md 从 **68 份降到 35 份**；工作树里有 34 处新增/删除/重命名，
  ⛔ **一笔都没提交**，index 已清空，由 Codex 决定何时、以什么粒度提交。
- 移入 `docs/archive/`（20 份）：已 SUPERSEDED 的 `HANDOFF-2026-08-22.md`、
  `HANDOFF-2026-08-30.md`、`NEXT-WINDOW-PROMPT-2026-08-27.md`；跑完作废的
  `OVERNIGHT-TEST-PLAN-2026-08-23/24.md`、`QA_SITE_2026-08-13.md`；已完成的
  `TEN-ITEMS-2026-08-27.md`、`FIND-UX-2026-08-27.md`、`COMPRESS-UX-2026-08-22.md`、
  `CHECK-DISPLAY-2026-08-21.md`、`FIX_TAILWIND_ALPHA-2026-08-19.md`；已落地设计稿
  `DESIGN_CAPTURE_FOCUS.md`、`DESIGN_FIRST_DAY_VALUE.md`、`DESIGN_LIBRARY_TRANSFER.md`、
  `DESIGN_VALENTINE_EDITION.md`；留档不开工的 `PROMO-VERDICT-2026-08-20.md`、
  `DEMO_SCRIPT.md`、`REVIEW_MEMTRAPBENCH-2026-08-21.md`、`MCP_LAB_PROMPT.md`、
  `MCP_SCREENSHOT_GUIDE.md`。
- 移入 `docs/archive/stage0a-taskbooks/`（13 份）：D2、D2R1–D2R4、GR1、GR1R1、GR1R2、
  GR2A、GR2B、GR2BR1、GR2C、GR2D 的任务书。此后 GR3、GR3R1 与 GR4 任务书也已按轮次验收后归档；
  当前 `docs/` 根目录没有 ACTIVE 实验任务书。
- `HANDOFF-2026-09-04.md` 由 2455 行精简到 190 行：只留仍然生效的约束、未完成项、
  事实优先级、SHA 绑定与验收命令；⭐ 全文原样存为
  `docs/archive/HANDOFF-2026-09-04-FULL-PROCESS-LOG.md`（一个字没删）。
- 9 份文件里 62 处指向被移走文档的路径已改成 `archive/…`；`WORKPLAN` 与 `SPOOL_OVERVIEW`
  首屏那句「开工只看 `HANDOFF-2026-08-22.md`」已改为「先读 `EXECUTION_POLICY.md`，
  再读首屏标 active 的最新 HANDOFF」。
- ⛔ `EXECUTION_POLICY.md` 一个字未动；⛔ 源码里按名字（不带路径）引用设计稿的注释一律未动。

以上 §10.4 是整理完成当时的一次性历史快照；当前执行光标与 ACTIVE 文件以 §10.3 为准。
