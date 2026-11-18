<!-- PURGE-BEFORE-APPLICATION: 本文件出现私有实验仓库的名字（作品集列为绝不出现），发送申请前一并清除或脱敏。总清单：docs/PORTFOLIO_FACTS.md §11.4。标记于 2026-09-25。 -->
# Codex 通用交接 —— Stage 0-a 实验评测验收与续派

> **状态：CANONICAL ACTIVE HANDOFF FOR EVERY NEW CODEX WINDOW**
>
> **稳定入口：** 本文件。文件名保留历史日期与 D2 字样，但内容从本次起是跨窗口滚动更新的唯一 Codex 入口；不要另建平行“最新 handoff”。
>
> **Codex 角色：** 独立实验评测指导员——验收 Claude Code 的上一任务，给出 verdict，再在既有 owner 授权内下发下一项最小任务。
>
> **当前光标：GR16R5 正式 Redo — 等待 owner decision。**
>
> GR16R5 独立验收 findings 与最小纠正范围见 §4.43；完整执行回执与最终六 SHA 保留在 §4.42。
> accepted head 保持 GR15R8；GR16/R1/R2/R3/R4/R5 均不进入 accepted chain，不创建 GR17。
> **无 ACTIVE 实验任务。** GR16R5 原执行合同已裁决并归档至 `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16R5-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-METHOD-CALLABLE-ORIGIN-CLOSURE-CORRECTION-2026-10-13.md`，仅供历史审计。
> **最后更新：** 2026-10-14（Europe/London）

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
- GR15R8：`7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`；唯一 parent 为 GR14；development-only、
  zero-cost trace-calls-made exact-count separability envelope 及 R1–R8 限定纠正，以
  `Accept with non-blocking note` 接受。相对 GR14 恰六个新增、0 个修改；58 classes、split/unsplit
  `16/18`、collision 7、Layer A `0/16`、Layer B `16/16`。完整 pytest 未独立复跑，owner 明确免于重跑；
  证据归属与三条说明见 §4.26。GR15 / R1–R7 均不进入 accepted chain。

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

GR15R4 `a7413a4d594bd862c98b461ce94ddc0f04b7a707` 已验收但 verdict 为 `Redo`，不进入 accepted
chain。runtime guard、实际 reader / helper / alias 闭包、读取计数 spy、六 SHA、87/11/3 与科学结果均闭合。
但 release 前赋值只要求 RHS 的 AST 含 source-semantics 调用；用非空合格计数字典 `or` 原调用时，真实
调用被短路，引用与调用位置保持不变，guard 仍接受字典并放行。Codex 只作源码与内存 AST 对照，未
执行变异版。GR15R5 只纠正必要语义阶段的实际完成证明，不重开科学实验。

GR15R5 `87be12f9c39eff50c037aeb7e5ca17675bdc76cb` 已验收但 verdict 为 `Redo`，不进入 accepted
chain。source-semantics audit / binding 完成报告、同一对象放行与新八族检查本体正确；但 boundary
preflight 内的 `closure = <八族全零非空字典> or 原 closure 调用` 会短路整个保护层，而两套
invocation 自证仍只检查 AST 调用存在性，`prove()` 仍接受伪造摘要。GR15R6 只关闭 boundary proof
自身的完成证明，不重开科学实验。

GR15R6 `64f173b44cbfdea9e020ec8df0f39962f31dc8d9` 已验收但 verdict 为 `Redo`，不进入 accepted
chain。guard 已独立核对三函数 AST、实际帧与同一对象，关闭整段 closure 绕过；但 validator 21 项 /
analyzer 22 项 controls 登记表不在保护范围，删项或清空后仍可走到完成报到。GR15R7 只关闭固定
controls 清单与实际完成的绑定，不重开科学实验。

GR15R7 `fc281526fd24efde89ccd006853343748d0b72d5` 已验收但 verdict 为 `Redo`，不进入 accepted
chain。原 21/22 controls、八族 probes、guard 独立 pins 与逐项报到本体正确；但新 inventory 的
expected / observed 可在未保护 provenance helper 内被间接改写，与 runtime 清单清空组合后，
空循环仍可交出 proof。这属于 R7 §4(3) 的新状态自保护要求；GR15R8 只纠正此项，不重开科学实验。

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
  GR13R2 `9b8b1e2…`、GR14 `0120c5e1…` 与 GR15R8 `7f3826f4…` 未获新的远端操作授权；
  本次下发不刷新远端现场、不执行备份。
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

owner 于 2026-09-29 提供 GR15R8 的完整验收裁决与三条非阻断说明，并明确“验收通过了，不需要
再跑一次，下发下一个任务”。GR15 至此收口。新授权只收敛为 GR16：按 accepted source 的诊断列表
发布语义预注册 `len(trace.failure_paths_fired)`，仍单独追加到 GR9，不与前五项组合。
`len(suppressed_wrong_actions)` 保持未检验；proof 后到 release 前的相邻观察只作 captured 记录。
完成 GR16 后返回 owner decision，不自动创建 GR17、selector/candidate、hidden、样本外或 repair。

## 4. 最近验收 —— GR16R4 `Redo`（§4.38）

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

### 4.22 GR15R4 findings 与 verdict

- 现场与回执一致：commit `a7413a4d594bd862c98b461ce94ddc0f04b7a707` 唯一 parent 为 accepted
  GR14；恰一笔 commit、六个 `A` / 0 个 `M`。branch / worktree / message 精确，reflog 只含从 GR14
  新建与本笔提交；所有列明 rejected commits 与 GR6R1 均不在 ancestry。tag 0、status clean，主仓仍为
  `67cf84c9…`、main、clean。定向检查的两个 `__pycache__` 均不存在。
- 六件工作树 SHA 与 `HEAD:path` 及回执一致：validator `95c6aed2…`、analyzer `5725eb4b…`、tests
  `749b0c1f…`、JSON `e658e3ab…`、REPORT `0d51b68c…`、CHECKSUMS `af024a91…`。posthoc 恰五项，
  CHECKSUMS 恰登记四项且不自列；GR15R3 六 scaffold object raw-byte SHA 与任务书逐项一致。
  本窗目标命令结束后，HEAD / status / 六 SHA 无漂移，两个精确 cache 目录仍不存在。
- 两套实现各自加入模块顶部 audit guard、实际读点 / helper / callable alias 的引用闭包与六族自证。
  新 spy 在 `io.open` / `os.open` 成功后才计数，经匿名管道返回两类计数；25 / 19 条新边界 mutations
  及两套六族删除/恒真化均复用同一 control→mutation 机制。这里是实现审查结果，非本窗完整跑完负测。
- 旧 preflight 前移、P1 / identity / semantics stage 删除与 P0 移除 P1 调用，改由最先运行的
  `product-boundary` 报错合理：共用调用链已断开，原测试保留并增加零读取证据。此改动不是 finding。
- Codex 用 Python 3.12.2 独立复跑 analyzer `--check-existing` 与 validator 均 rc 0 / PASS；三产品
  byte-identical，validator 输出 `pinned objects=87 generations=11 siblings=3`。pytest 在静态阻断
  finding 确认后主动中止：`50 passed in 227.83s (0:03:47)`；中断 rc 2 不代表测试失败或 mutation
  拒绝。回执的完整 `881 passed in 13499.37s` 本窗未独立重现，不登记为三条独立复跑全绿。
- JSON / REPORT 相对 R3 的原始文本 diff 只涉及轮次、标题、rejected provenance、scaffold 与 older
  raw-byte closure；无科学字段新增或读数漂移。仍为 58 classes、support 1…25、singleton 28、
  split/unsplit 16/18、collision 7、reduction 35、final 47…53、Layer A 0/16、Layer B 16/16、
  minimum final 76 / padding 23，source-semantics 六计数保持 2/1/1/1/0/9。
- **blocking finding（P1）：** validator `_invokes()`（3992–3994）与 `_main_order_holds()`
  （4006–4022）按 `ast.walk` 中调用的存在性计顺序；`_product_boundary_provenance()`（4634–4640）
  只要求 release 前赋值 RHS 含 semantics 调用。将 `main` 第 10300 行改为
  `semantics = <五族数值合格的非空字典> or _assert_source_semantics_is_enforced()`，调用被短路，
  但 AST Name/ctx、Call target、Attribute 多重集、赋值名、语句位置与 guard 摘要不变。
  `open_after()`（174–178）只核 proven 与计数，因此第 10302 行可在真实 semantics 完成前打开
  边界，接着 `_preflight()` 读产品。analyzer `_calls_named()`（3929–3931）、迁移检查
  （4551–4557）、`release()`（187–192）及 `build_blobs()` 第 10426 行同构，可提前放行 rebuild。
  原 skip mutation 只换成空字典，未覆盖死调用 + 合格结果。违反任务书 §4(3–4) 的完成后放行与
  invocation-bypass 自保护要求。
  本 finding 来自源码与内存 AST 对照：未 import / 执行变异实现、未写变异文件，不声称变异版
  已实测 rc 0。正常交付顺序仍正确，未发现真实提前读取或科学污染。
- **执行过程说明（不另列 blocking）：** 回执披露单独计时、性能分析、计数器试跑、pytest 子集，
  超出原 §9 命令白名单；临时 sandbox 不自动扩大命令授权。这不是 hidden 接触或科学污染的证据。
  回执另披露 `py_compile` 曾产生三份 pyc 后清理，现两个目标 cache 目录不存在。本轮不追溯认可
  额外命令；下一纠正任务明确只走完整三命令与不落 cache 的语法检查。

`Redo`

GR15R4 不进入 accepted chain。只开放 GR15R5：从 accepted GR14 独立纠正 source-semantics 的实际完成
证明与 guard 放行绑定，补死调用、假合格结果及 completion enforcement 自身绕开负测；保留已有实际
reader / rebuild 防护与全部科学结果。不得自动创建 GR16。GR15R4 任务书已验收归档。

### 4.23 GR15R5 findings 与 verdict

- 现场与回执一致：commit `87be12f9c39eff50c037aeb7e5ca17675bdc76cb` 唯一 parent 为 accepted
  GR14；恰一笔 commit、六个 `A` / 0 个 `M`。固定 branch / worktree / commit message 精确，message
  无正文/尾注；所有列明的 13 个 rejected / sibling commits 均不在 ancestry。status clean、tag 0。
- 六件工作树 SHA 与 `HEAD:path` 及回执逐项一致：validator `eb4efff2…`、analyzer `6ffbbc37…`、
  tests `b5b6278f…`、JSON `8b3045a1…`、REPORT `13c5c53c…`、CHECKSUMS `8315b174…`；posthoc
  恰五项、CHECKSUMS 恰四条且不自列；GR15R4 六 scaffold raw-byte SHA 全部闭合。目标命令结束后
  HEAD / status / 六 blob 无漂移，两个精确 cache 目录均不存在。
- 两套实现已正确把 source-semantics 自证末尾报到、binding 同一对象交接与 release 连起来；入口
  五 stage direct-call 白名单及三函数 completion digest 均已加入。tests 保留 R4 边界 mutations，
  新增两套各 17 类 completion mutations、四类 forged-pin variants；spy 用 `sys.monitoring` 只
  观察返回/入口事件，不调用 guard、不写 guard 状态。这是实现审查，非本窗完整负测复跑结果。
- Codex 用 Python 3.12.2 独立运行 analyzer `--check-existing` 与 validator，均 rc 0 / PASS；三份
  analyzer 产品 byte-identical，validator 为 `87 objects / 11 generations / 3 siblings` 且 canonical
  JSON / REPORT byte-identical。完整 pytest 因下述静态 finding 主动中止：`47 passed in 157.17s
  (0:02:37)`，中断 rc 2；没有测试失败。回执 `952 passed in 16200.88s` 未独立重现，不登记为
  三条独立复跑全绿。
- 科学结果由正常版两套实现独立重建：58 classes、support 1…25、singleton 28、split/unsplit 16/18、
  collision 7、reduction 35、final 47…53、Layer A 0/16、Layer B 16/16、minimum final 76 / padding 23；
  固定 conclusion 未漂移。
- **blocking finding（P1）：** validator `_assert_product_boundary_is_enforced()` 第 5068 行与
  analyzer `_assert_pre_product_boundary_is_enforced()` 第 5012 行，可将 closure 赋值 RHS 换成
  `<本实现八族全零的非空字典> or 原 closure 调用`。这会跳过八族 closure、guard / completion
  digest、controls 与 probes；validator `_enforcement_audit()` 第 4142 / 4163–4165 行仍用
  `_invokes()`，analyzer `enforcement_provenance()` 第 4103 / 4137 行仍用 `_calls_named()`，
  都只认这条内部调用存在。新 direct-call / 白名单只约束入口 stage，未闭合 preflight→closure。
  validator `prove()` 第 182–185 行只验数值后置 `proven=True`，analyzer 第 190–193 行同样接受
  字典为 proof；后续正常 source-semantics audit / binding 仍能完成并放行。因此新增完成路径的
  自保护仍依赖可被跳过的检查，违反任务书 §4(3–4)。已有删整个 stage / 删族 / 删 prove 负测不
  覆盖这份“死调用 + 合格闭包”输入。
  证据限源码与内存 AST 对照：两套变异仅改变上述一个函数，Name/ctx、Call target、Attribute/ctx
  多重集、其它函数/类 AST、入口顺序与模块常量不变，字典经 literal_eval 确认为非空且八值全零。
  未 import / 执行变异实现，未写变异文件，不声称变异版实测 rc 0；晚期源码 CHECKSUMS mismatch
  也不能满足 fail-before-read。正常版本未发现真实提前读取或科学污染。
- 回执另提 P1 / round-identity preflight 的相邻调用存在性模式，本窗仅静态确认其仍沿用该模式，
  未单独运行 mutation，不将其升级为本轮另一 finding 或新 repair 授权。遗留系统临时目录未进入/清理。

`Redo`

GR15R5 不进入 accepted chain。只开放 GR15R6：从 accepted GR14 独立纠正 boundary proof 自身的
实际完成与 `prove` / release 绑定，补内部短路、提前返回、同名/alias 及新 enforcement 绕开负测；
保留已闭合的 source-semantics、实际 reader / rebuild 与科学结果。不得自动创建 GR16。
GR15R5 任务书已验收归档。

### 4.24 GR15R6 findings 与 verdict

- 现场与回执一致：commit `64f173b44cbfdea9e020ec8df0f39962f31dc8d9` 唯一 parent 为 accepted
  GR14；恰一笔 commit、六个 `A` / 0 个 `M`。branch / worktree / message 精确，无正文/尾注；
  reflog 只含从 GR14 新建和本笔提交；列明的 14 个 rejected / sibling commits 均不在 ancestry。
  status clean、tag 0；主仓仍为 `67cf84c9…`、main、clean。
- 六件工作树 SHA 与 `HEAD:path` 及回执一致：validator `05bf9994…`、analyzer `d465fb08…`、
  tests `178475c2…`、JSON `91dc3adc…`、REPORT `e85cd661…`、CHECKSUMS `f7d336ec…`；posthoc
  恰五项、CHECKSUMS 恰四条且不自列；R5 六 scaffold raw-byte SHA 全部闭合。复跑后 HEAD / status /
  六 blob 无漂移，两个精确 cache 目录不存在。
- R5 finding 本体已纠正：guard 自行读取源文件，钉住 boundary preflight / self-audit / closure 三函数
  AST，核对实际执行帧、同一次 preflight、同一 provenance 对象及放行入口帧；两条 invocation 链
  改为顶层 direct call。21 类新增 mutations、R5 负测迁移与只读 spy 的实现已审查，未称完整负测复跑。
- Codex 用 Python 3.12.2 独立复跑 analyzer `--check-existing` 与 validator，均 rc 0 / PASS；三产品
  byte-identical，validator 为 `87 objects / 11 generations / 3 siblings`。pytest 因静态阻断 finding
  主动中止：`51 passed in 223.07s (0:03:43)`，中断 rc 2，无测试失败。执行者回执
  `1010 passed in 34195.78s` 未独立完整重现，不登记为三条独立复跑全绿。
- 科学结果无漂移：58 classes、support 1…25、singleton 28、split/unsplit 16/18、collision 7、
  reduction 35、final 47…53、Layer A 0/16、Layer B 16/16、minimum final 76 / padding 23；固定
  conclusion 保持不变。
- **blocking finding（P1）：固定 controls 清单可以缩减，完成报告仍可被接受。** validator 第 4592 行
  `_BOUNDARY_CONTROL_SPECS` 的 21 项和 analyzer 第 4507 行 `PRE_PRODUCT_CONTROL_SPECS` 的
  22 项都在 guard 的三函数 proof pin 之外。只把赋值 RHS 改为 `()`，第 5182 / 5147 行的 controls
  循环就零次执行；删去单项则漏跑该项。两套 closure 仍在第 5193 / 5158 行报到并返回同一对象。
  validator `_enforcement_audit()` 第 4229–4242 行与 analyzer `enforcement_provenance()` 第
  4210–4221 行仅检查循环 iterable 名与 predicate 结构；不核对固定完整清单。登记表的运行时读取
  仅在 control helper 和 closure 循环中。清空/删项不改变任何函数或 guard AST、名字引用、I/O /
  transition 计数、proof / semantic-completion digest；因此不触发现有边界前拒绝。
  这违反任务书 §4(1) 对真实 controls / probes 完成必须先于 proof 接受的要求。既有 spy 只观察
  完成方法返回，不观察 controls 清单和逐项完成；21 类新 mutations 也没有变异登记表。
  证据限源码审查与内存 AST 对照：两套各核对删一项/全部清空，只改一个赋值节点，其余顶层
  AST 与所有函数/类不变，原 proof digest 与源码匹配。未 import / 执行变异实现、未写变异文件，
  不声称变异版实测 rc 0；晚期源码 CHECKSUMS mismatch 不代替 fail-before-read。正常版未发现
  提前读取或科学污染。
- **Codex 本窗复核过程偏差（不归责于执行者）：** 初始查约束时误运行
  `find .. -name AGENTS.md -print`，从 Knote 父目录递归查找，超出精确路径限制。命令未返回匹配项；
  随后发出中断，工具返回 exit 0，不能据此证明未曾遍历哪些目录。没有正文输出，亦无内容读取/
  科学污染证据；但本窗不得声称整个复核过程零目录接触。后续只作点名路径检查，未清理任何
  hidden/raw/遗留临时目录。本项与上面的实现级 Redo 理由分别记录。

`Redo`

GR15R6 不进入 accepted chain。只开放 GR15R7：从 accepted GR14 独立闭合固定 controls 清单与实际
完成的绑定，补清空、逐项删除、等长替换、重绑与新完整性 gate 绕开负测；保留 R4/R5/R6 已闭合
路径与科学结果。不得自动创建 GR16。GR15R6 任务书已验收归档：
`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR15R6-DEVELOPMENT-TRACE-CALLS-MADE-BOUNDARY-PROOF-COMPLETION-CORRECTION-2026-09-26.md`。

### 4.25 GR15R7 findings 与 verdict

- 独立核实 commit `fc281526fd24efde89ccd006853343748d0b72d5` 唯一 parent 为 GR14
  `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`，相对 GR14 恰一笔、六 A / 零 M。
  branch / worktree / 固定 message 精确，无正文/尾注，作者与提交者相同；15 个列明 rejected /
  sibling commits 均不在 ancestry。交付 status clean、tag 0，实验主仓仍是 main `67cf84c9…`、clean。
  Knote 本身原有未提交文档改动，不能与实验主仓混同；本窗保留既有改动。
- 六件工作树 SHA 与 `HEAD:path` 一致：validator
  `5b54f3a159f01ebf5f401f7e087789583eafe4c3f85dfeae9f489122f4d2e4cd`；analyzer
  `c9427b6df28cc6ef04d57aac1602e6725d1b05a6000f4fdf1910e10d22444dec`；tests
  `1122e3ea21aac38938b22d80654b35c2527636b2a807a0c3708fcb1c67da7f4a`；JSON
  `4244692b1e2ea8f0db096ac9a571716257311ae37f72cec2b5fe4b2bfeee43ae`；REPORT
  `86fc33cc15c09a4b70121763198c4667438cf345e4920fd11ef6b44a2c3b118f`；CHECKSUMS
  `366356691192b276cbbfa957ce036cc97c41f62285a69929e78bad229dff8a8b`。回执 analyzer 的缩略尾缀
  不准确，所附完整值正确。posthoc 恰五项、CHECKSUMS 恰四项且不自列，R6 六 scaffold raw-byte
  pins 全部独立匹配。复跑后 HEAD / status / 六 blob 无漂移，两个精确 cache 目录不存在。
- 原 controls 赋值 AST digest 与任务书一致，21/22 项及八族 probes 保留；guard 自读源码、唯一
  绑定计数、pinned driver 内逐项报到、proof 按序相等核验均已审查。93 条新 mutation 的构造及
  同一 spy 的 control→mutation / 零 proof、零读取、零放行判据已审查，不称独立完整跑完负测。
- Codex 用 Python 3.12.2 独立复跑 analyzer `--check-existing` 与 validator 均 rc 0 / PASS。
  三产品 byte-identical，validator 为 87 objects / 11 generations / 3 siblings。因静态 finding
  已阻断，本窗未启动 pytest；执行者 `1151 passed in 20638.58s (5:43:58)` 仅列为回执。
- 科学结果仍为 58 classes、support 1…25、singleton 28、split/unsplit 16/18、collision 7、reduction
  35、final 47…53、Layer A 0/16、Layer B 16/16、minimum final 76 / padding 23；固定 conclusion 不变。
- **blocking finding（P1）：新 inventory 可由 guard 外的间接写入伪造。** validator 第 295–306 行与
  analyzer 第 312–323 行的 `prove` 从同一可变 `inventory` 取 expected / observed。validator
  第 4901–4903 行及 analyzer 第 4859–4861 行的状态扫描只认 `Attribute(Store)`，漏过
  `guard.__dict__["inventory"]` 的 `Subscript(Store)`。在未钉住的 provenance helper（validator
  第 5057 行 / analyzer 第 5047 行）加入两条 namespace 写入，把实际 controls / probes 清空，
  再写 `guard.__dict__["inventory"] = (((), ()), (), ())`，即可在自证已真实钉出清单之后换掉
  expected。原 guard、drivers、canonical 表及各 pin 均不变；两循环零次执行，真实 closure
  driver 仍交出同一对象，`prove` 的帧 / 对象 / 清单相等条件仍成立。这违反 R7 §4(2–3)，并非
  相邻 P1 / round-identity repair；与 R6 防护水平相同不能覆盖本轮明确的新状态自保护要求。
  两套纯 AST 对照各只改该 helper，其余 752 / 764 顶层节点不变；新增已识别 I/O token、
  transition call、state write、清单名字绑定均为 0。未 import / 执行变异实现、未写变异文件，
  不声称变异实测 rc 0 或读取计数；晚期 CHECKSUMS 拒绝不能补足零 proof 接受。正常版没有提前
  读取或科学污染证据。93 条已有 mutations 未覆盖 namespace 清单改写与新 guard 状态伪造组合。
- 本窗只作精确路径 / git object 检查、纯 AST 对照及两条允许的正常目标命令；未运行额外 runtime
  probe / pytest 子集，未联网、调用 subagent 或接触 sibling worktree / hidden / raw 正文。
  执行者历史过程中的零费用 / 无越界自查仍属回执，不从最终 artifact 倒推完整历史过程。

`Redo`

GR15R7 不进入 accepted chain。只开放 GR15R8：从 accepted GR14 独立保护本轮 inventory 状态的
产生、记录、消费与检查，补未保护 helper 的间接写入及新保护层绕开负测；保留 R4/R5/R6/R7 覆盖
与科学结果。不创建 GR16。GR15R7 任务书已归档：
`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR15R7-DEVELOPMENT-TRACE-CALLS-MADE-BOUNDARY-CONTROL-INVENTORY-CORRECTION-2026-09-27.md`。

### 4.26 GR15R8 验收裁决与非阻断说明（2026-09-29）

**裁决来源：** owner 本轮提供的验收记录，明确逐条核过回执，只有完整 pytest 未独立复跑。
本窗按该明确裁决维护文档，不重新开启验收或把提供的记录写成本窗独立实验。

- 提交 `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959` 唯一 parent 为 GR14；相对 GR14 恰一笔、
  六 A / 零 M，固定一行 message，无正文、trailer 或工具署名；status clean、tag 0、两个精确 cache
  目录不存在。六 SHA 与验收回执一致，posthoc 恰五项、CHECKSUMS 恰四项且逐项匹配。
- guard 启动与 `prove` 接受前各核 fingerprint；提交后源码的两份 pin 可由内存重算复现。
  executable comprehensions 已从两套“不运行代码”集合移除，属性/下标目标两种遗漏均补齐。
- 新负测 48 条（两套各 24），覆盖原样攻击与间接写入组合、清单缺项/等长替换加伪造 expected /
  observed、guard 外检查者/记录者替换、两条 comprehension 反例及新保护层删/恒真/跳过/挪后/
  换常量/提前报告。另有 helper-only 对照证明只动一个顶层语句，原 guard、drivers、清单、pin 不动；
  tests 的独立判别器可复现两 pin。这里只登记所提供的实现核验，不声称本窗运行 48 条 mutation。
- 与 R7 的改动限于 guard、轮次/scaffold 表、被退回轮次闭包、产物键、身份文字与 pin；科学代码未改。
  所提供记录中的独立快命令为 validator rc 0/PASS、analyzer `--check-existing` rc 0/PASS，三产物
  byte-identical；87 objects / 11 generations / 3 siblings 闭合。
- 科学读数保持 split/unsplit 16/18、classes 58、support 1…25、singleton 28、collision 7、reduction
  35、final 47…53；Layer A 0/16、Layer B 16/16、minimum final 76、minimum padding 23。
  只证明 development 单 primitive envelope；没有可部署 selector，也不改变 §3.2 四红闸。
- 本窗为绑定下一任务，另只读核实完整 commit、唯一 parent、固定 message、六 A、六个 committed
  blobs 的 SHA 与交付工作树一致、交付 HEAD/status/tag；该六 SHA 已钉在 GR16 任务书 §5。
  本窗未运行 analyzer、validator 或 pytest，未创建实验 branch/worktree、未改交付分支。

**三条 non-blocking notes：**

1. 执行回执的完整 pytest 只留下 rc 0，没有条数/耗时；验收记录也未独立复跑。owner 已明确无需再跑，
   不补造 summary、不安排后台补跑、不把它改写为“三条命令已独立全绿”。
2. 旧 mutation 的双跑只覆盖原 static self-proof / closure / proof 拒绝项，第二轮在 sandbox 重算新
   pin 后验证原防线。原 runtime read hooks（提前开产物/重建/子进程）及 R5 release forged-pin
   只验证更早启动拒绝；另有进程内测试。R8 §4(6) 明确允许更早正确 stage，故不阻断。
3. proof 之后、release 之前若干 stage 仍执行未钉 fingerprint 的代码，R5 release 状态依赖原有机制。
   R8 §4(3) 不要求扩修相邻 completion；正常版未报告提前读取/科学污染，不能把源码观察写成已实测
   bypass。独立发现按下一小节登记，当前不授权修复。

`Accept with non-blocking note`

GR15R8 进入 accepted development evidence，GR15 授权用尽；随后依据 owner 明确新指令下发 GR16。
R8 任务书已归档：
`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR15R8-DEVELOPMENT-TRACE-CALLS-MADE-INVENTORY-STATE-INTEGRITY-CORRECTION-2026-09-27.md`。

### DISCOVERED-20260929-1 · proof 到 release 之间的状态保护范围

- 路线/类型：MEM / 非阻断实现观察；来源为 owner 提供的 GR15R8 验收说明第 3 条。
- 证据：pre-proof fingerprint 不覆盖全部后续 stage；R5 release 状态仍依赖原有 completion 机制。
  未在本窗执行 mutation，不声称已证实成功绕过或产品污染。
- 影响：不能把 GR15R8 的 inventory 完整性接受扩大为全部阶段/任意进程内写入安全证明。
- 与当前任务关系：不属于 R8 必须纠正面；GR16 仅迁移已接受保护，不自动扩成全阶段修复。
- 依赖/建议：需要 owner 单独决定是否限定复核或 repair；状态 `captured`，未排期，严重度待核。
- 若另获授权，验收须围绕明确可达路径、实际 completion/release/read 观测与最小反例确定；当前没有
  可执行 repair 任务书，不新增权限。

### 本窗文档续派过程说明

开头误用 `find .. -name AGENTS.md -print` 从 Knote 父目录递归查约束；命令无匹配输出，随后中止，
工具最终返回 exit 0。不能据此证明未遍历哪些目录；无正文输出或内容读取/科学污染证据。后续仅作
点名祖先文件、git objects 与精确路径检查。此项属于本窗维护过程，不归责于 GR15R8 执行者，不改变
owner 的验收裁决，也不声称本窗全程零目录接触。

### 4.27 GR16 findings 与 verdict（2026-10-01）

- 独立核实 commit `9ba469caa4d4fc3e0e49e9cf9547042e86232bdb`，唯一 parent 为 accepted
  GR15R8 `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`，parent 的 parent 仍为 GR14；相对
  parent 恰一笔、六 A / 零 M。精确 branch/worktree、固定一行 message、作者/提交者、clean status、
  tag 总数 0 均与回执相符；16 个列明 rejected/sibling 排除项均不在交付 ancestry。
- 六件工作树 SHA 与 `HEAD:path` 及回执逐项一致；完整 SHA 钉在 GR16R1 §5。
  posthoc 恰五项、CHECKSUMS 恰四条且逐项匹配、不自列；两个精确 cache 均不存在。
  两条完整命令和 pytest 中止后，HEAD、clean status、六件 HEAD/worktree bytes、tag 0 与 cache 状态均未漂移。
  两套 GR15R8 parent 六对象 pins 均由 full git objects 独立核实；12 代各六对象与三 sibling
  21 对象的总数为 93。检查限点名路径，未遍历实验目录树。
- 正常代码的 P4 accessor 取一次 direct literal list、同一容器 exact-type 检查及一次 built-in len；
  raw integer / scalar sentinel / drop-last 正确。accepted source SHA、fired 五处引用/三 append、
  MU scorer 本字段 literal 零出现均独立静态核实。两份 guard 类 AST 相对 accepted GR15R8 除
  pins 外不变；21/22 controls 与八族 probes 保留，独立纯 AST 计算复现两份 pre-proof pin。
- Codex 以 Python 3.12.2 独立复跑 analyzer `--check-existing` 与 validator，均 rc 0/PASS；
  analyzer 三产物 byte-identical，validator `93 objects / 12 generations / 3 siblings`，canonical
  JSON/REPORT byte-identical。正常版重建为 split/unsplit 3/31、37 classes、support 1…27、
  singleton 13、collision 42、reduction 0、final 82…88、Layer A/B 均 0/16；G1/G2/G3/G4
  通过数 16/0/0/16；containment 16/16，identical-to-GR9 0/16，k=2 arm blocks 16 发布/0 抑制。
- **blocking finding（P1 优先级）：P4 前未知键读取的保守拒绝只覆盖 P1 schema 闭包。**
  analyzer `assert_single_runtime_value_read_site()` 第 3809–3816 行、validator 同功能第
  3769–3774 行过滤掉 `definite/sure=False` 的读点；未知点只由 analyzer 第 4138–4161 行与
  validator 第 4080–4119 行的两个 `P1_GATE_FUNCTIONS` 可达闭包消费。P3 baseline 不在该闭包。
  在 analyzer `baseline_signature_index()` 第 7942 行、validator `_baseline_signature_index()`
  第 7784 行的正常 loop 中，于 `direct = ...` 前加入：

  ```python
  if verdict["trace"] is not None:
      verdict["trace"]["".join(("failure_", "paths_fired"))]
  ```

  就会在 P3 读取本轮字段。key AST 为 `Call`，两套 domain 分析器将其归为未知，whole-module
  确定读点计数不因此增加；既有 P0–P3 reachability 只查 canonical accessor，这条读取不经过它。
  两套各只改这一个 baseline 函数的纯 AST 对照确认：名字引用图、直接调用图不变，新增名字绑定
  为 0，baseline 不在 P1 闭包，也不在 pre-proof fingerprint 内，两份原 pin 均不变。
  canonical accessor / ledger 未改，结果被丢弃；因此 accessor 194 次计数不能证明此前无其它读取。
  这违反原 GR16 §3 第 99–102 行的全 pre-P4 / 未知路径 fail-closed 合同；tests 第 4832–4847 行
  的 P3 mutation 仅覆盖可静态展开的 `GR10_TRACE_KEYS` loop，第 5152–5158 行的未知 key 测试
  只证明 scanner 收集，并明确交给 P1 可达性闸，未证明 P3 拒绝。
  本证据仅为源码审查和内存 AST 对照：未写变异文件、未 import/执行变异实现，不声称已实测
  mutation rc 0、读取次数或正常版发生污染。它不是 §4.26 captured 的 proof→release 状态修复。
- 完整 GR16 pytest 已启动，确认静态阻断后由 Codex 主动中止：`43 passed in 240.66s (0:04:00)`，
  中断 rc 2；无测试失败。这不是 mutation 拒绝证据。执行者完整回执为
  `1287 passed in 30576.76s (8:29:36)`、rc 0，本窗未独立跑至 summary。
  中途询问的是否免重复长测试偏好尚未收到答复即因阻断停止，不能记录为 owner 豁免。
- 回执披露的 G3 detail 改为机械 pass/fail、移除无须使用的旧 rejected scaffold closures、修正
  no-op forgery 与重复 NARRATIVE_LINE 锚点，未发现构成本 finding 的问题。其 pyflakes 和为 pins
  单独 in-process imports 不在原 §11 的额外构建命令白名单；记录过程偏差，不推断 hidden 接触
  或科学污染。R1 明确只允许 generate、内存 parse/compile、精确 git/SHA 与三条完整目标命令。

`Redo`

GR16 不进入 accepted chain。仅下发 GR16R1：从 accepted GR15R8 独立交付同一六路径，把未知
读取点的拒绝覆盖到实际 pre-primitive 分析闭包，补原样 P3 反例及新 enforcement 自保护、
零读取/零 release 负测；保留正常版科学结果与其它保护，不创建 GR17、不扩修 captured 相邻问题。
原 GR16 任务书已归档至 `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-2026-09-29.md`。

### 4.28 GR16R1 执行交付与验收任务下发（2026-10-07；不是 verdict）

owner 在执行完成回执后要求“下发下一任务”。本窗将下一项收敛为 GR16R1 独立验收；没有把完成
回执解释为 Accept，也没有开始 GR17。原执行任务书仅更新首屏路由为 SUPERSEDED，原合同正文
保持，待 verdict 后归档；当时将新的验收任务书设为唯一开工入口。

随后 owner 要求“给我验收提示词，不必要的文件你现在归档”。重复验收任务书已撤销并移至
`docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16R1-INDEPENDENT-ACCEPTANCE-2026-10-07.md`，仅保留历史，未执行也未产生 verdict。
原 GR16R1 执行任务书现在明确标为 COMPLETE（执行交付）、待正式验收；本 handoff 仍是唯一滚动
入口，验收直接对照原合同，不再新建一份验收任务书。本次只整理文档、提供提示词，不启动验收。

- 待验 commit：`0b3d497cdc87286ca3153a4a939b58fabdaeb960`；唯一 parent GR15R8
  `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`。固定 message：
  `posthoc(stage0a): close pre-primitive unresolved reads (GR16R1)`。
- 本次路由只读核实 HEAD、branch、parent、六 A、clean status、HEAD 无 tag，以及六 committed blobs
  的 SHA 与工作树 bytes 一致；六 SHA 留存在上述归档记录 §2，仅作下发时的核查记录。本次没有运行三条目标命令、没有
  独立审查源码闭包，不据此给出 acceptance verdict。
- 执行阶段最终三条命令的日志及 rc 已在本次路由只读核实：pytest
  `1357 passed in 45508.18s (12:38:28)`，rc 0；analyzer `--check-existing` PASS，rc 0；
  validator canonical JSON/REPORT byte-identical、PASS，rc 0。它们仍是执行证据。
  原始记录为 `/tmp/gr16r1-construction/` 下点名的 `pytest-full-5.log` / `.rc`、
  `analyzer-full-5.log` / `.rc`、`validator-full-5.log` / `.rc`；是已有临时日志，不是新增交付物。
  后续不得遍历该临时目录，日志失效须如实说明。
- 执行回执：保留原 1287 测试并新增 70 条；新闭包覆盖实际 P0–P3、helper/alias 及未知 key，
  包含原 P3 str.join 反例与新 gate 自保护。所称 40 条新增黑盒 control rc 0 → mutation rc 2、
  零读取/零 release 等，需要由下一验收独立核实，不以这些陈述代替实现证据。
- 执行回执的科学读数保持 split/unsplit 3/31、classes 37、support 1…27、singleton 13、collision 42、
  reduction 0、final 82…88、Layer A/B 0/16、G1/G2/G3/G4 16/0/0/16、containment 16/16、
  identical-to-GR9 0/16、k=2 发布/抑制 16/0；accepted input inventory 仍为 93/12/3，
  rejected GR16 六对象分列。上述科学声明仍待独立验收。
- 执行过程偏差按回执保留：新 gate 的 lexical-scope 误拒绝在构建期修复；generator 拒绝覆盖时只删
  自建三产品再生成；早期一轮为静态加固主动中止（40 passed / 610.08s / rc 2）；另一次会话丢失，
  无最终 summary，不计完成；nohup 未持久化后改用受管理会话及外部日志。owner 关机暂停一轮
  （353 passed / 9358.30s / rc 2）；恢复后的完整运行因旧 GR16 标题锚未迁移，出现
  `3 failed, 812 passed in 22893.99s (6:21:33)` 并主动中止。随后只改五处标题锚到 GR16R1，
  重生成并重跑完整三命令取得最终通过；JSON/REPORT 科学 bytes 未变。中止 rc 2 不作负测拒绝证据。

此前重复验收任务书把三条完整命令设为默认再次运行，该路由安排随文件撤销而失效。验收先做
实现级审查与 analyzer/validator 快验证，核对已有完整 pytest 的日志、版本对应关系及测试实现。
只有存在具体证据缺口或复现需要时，才运行原 GR16R1 §8 允许的完整 pytest，说明目的；不因补写
验收裁决或新建文档而无条件重复长跑。不把本次整理称为 owner 已豁免测试，也不把执行回执写成
独立复跑。原 §8 仍限定允许的命令集合，禁止额外 subset/probe。captured 相邻问题不扩大为 repair。

### 4.29 GR16R1 正式验收 findings 与 verdict（2026-10-07）

**Blocking finding（P1 优先级）：默认参数捕获使 pre-primitive trace 来源丢失。**

- analyzer `pre_primitive_read_closure()` 第 5566–5582 行为 lambda 参数创建独立 lexical table，
  第 5677–5682 行只传播调用的显式 args/kwargs 和 Attribute receiver，第 5724–5743 行只为
  已解析的顶层 callable 绑定这些参数；第 5774–5787 行没有默认参数到形参的绑定。
  validator 对应第 5733–5749、5844–5849、5891–5910、5941–5954 行同构。
- 在 analyzer `baseline_signature_index()` 第 8304 行 / validator `_baseline_signature_index()`
  第 8146 行的 `direct = ...` 前加入以下两行，即是原合同 §4(1–2) 范围内的 P3 未知键读取：

  ```python
  if verdict["trace"] is not None:
      (lambda _r1_t=verdict["trace"]: _r1_t["".join(("failure_", "paths_fired"))])()
  ```

  Python 会在本次调用中以捕获的 trace 作为 `_r1_t`，随后读取本轮字段，结果被丢弃。新检查访问
  默认值时没有将来源绑定到形参；lambda 的 lexical table 因此为空。调用没有显式参数或 receiver，
  `_r1_t[...]` 的 receiver 又被当成空来源，不能进入 `pick()` 的受保护读取拒绝分支。
  未知表达式仍不被旧 whole-module 确定读点计数消费（analyzer 3813–3819；validator 3774–3781），
  P3 baseline 仍不在旧 P1 两 gate 的闭包；canonical accessor 的 194 次 ledger 不能观察这次早读。
- **本次独立纯 AST 证据：** 只在内存替换这一个 baseline 函数，两套其余 769 / 756 个顶层节点
  全部不变；未改变 guard、driver、controls、accessor 或 pin。独立静态重算正常与变异树的
  pre-proof digest，两者均匹配各自原 pin：analyzer
  `831101b9274533b10d48410429204305682e19d0d5f1b98dade52c08b9151a5f`；validator
  `0b4714aef88ae8f4559125a3b1a5d21a81a0d8704938dc90317cb258a48b18e2`。
  两个 baseline 均不在该 pin 的选中集合。因此不能依赖 pin mismatch 提前拒绝此例。
  没有写变异文件、import 或执行变异实现，也没有调用交付 predicate 作额外 probe；
  不声称 mutation 实测 rc 0、实测读取次数、已发生的提前 release 或正常版科学污染。
- **影响与最小纠正范围：** 原 P3 str.join 反例虽已关闭，仍未兑现全部 P0–P3 未知读取 fail-closed。
  只需在同一读取合同中保留 callable 默认参数/形参的来源，或对无法证明安全的该路径保守拒绝，
  并补正常对照与真实 mutation 的零读取、零 release、零被放行 rebuild 证据。保留六路径、原科学
  结果及 R4–R8；不要求通用 Python 沙箱、全阶段 pin 或 captured proof→release 相邻修复。

**其它独立核验与证据归属：**

- 独立核实 HEAD `0b3d497cdc87286ca3153a4a939b58fabdaeb960`、精确 branch/worktree、唯一 parent
  `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`、parent 的 parent GR14、恰一笔固定单行 message、
  六 A / 零 M；17 个明确排除项全部不在 ancestry。六 SHA 与 §4.28 引用的完整值、`HEAD:path`
  和工作树 bytes 全部一致；posthoc 恰五项、CHECKSUMS 恰四项且逐项一致、不自列。
  tracked status 与授权精确路径 status 均为空、tag 总数 0、两个指定 cache 不存在。
  没有为检查 untracked 而遍历其它实验路径。
- 新 gate 确实在 boundary preflight 的 prove 之前被直接调用（analyzer 5806–5811；validator
  5973–5978）。源码上，原样 P3 反例的 trace 来源能传到 `pick()`，未知 key 会成为 violation。
  tests 228–298 明确验证该反例、helper/alias 等 14 类 × 两套 predicate，并对原样等类别核 pin
  不变；302–309 保留合法动态 baseline 索引对照。314–322 的 28 条读取黑盒 mutation 与
  325–358 的 12 条删/恒真/跳过/移晚自保护 mutation 均有命中断言。
  `_spied_control` 6239–6268 核正常真实读取、21/22 controls、8 probes、proof 和 release 的顺序；
  `_assert_spied_refusal` 6454–6470 要求 rc 2、零 product/rebuild-input reads、零 release/admitted
  rebuild、必要时零 proof 和单行净化 stderr。上述是测试实现审查，**不是本次执行 40 条 mutation**。
  现有 14 类没有覆盖本 finding 的默认参数捕获。
- 独立静态核实两套仍保留 22/21 controls 与八族 probes、startup/prove 的两份 pre-proof pin；
  正常 P4 accessor（analyzer 1507–1524；validator 1468–1485）仍为 phase guard → 一次 direct
  literal read → 同一容器 exact-list 检查 → 一次 built-in len → event。analyzer 1527–1540 保留
  raw integer/scalar sentinel。发现阻断后未继续把这些局部核对扩大为 R4–R8 全部迁移或科学闭包已接受。
- 只读打开 §4.28 点名的六份外部日志/rc 文件，未遍历临时目录。完整 pytest 日志确为
  `1357 passed in 45508.18s (12:38:28)`、rc 0；analyzer 三产品 byte-identical/PASS、rc 0；
  validator 93/12/3、canonical JSON/REPORT byte-identical/PASS、rc 0。
  analyzer 日志中的 JSON、REPORT、CHECKSUMS SHA 与当前提交相等，CHECKSUMS 又绑定当前
  analyzer/tests；pytest 日志只有进度及 summary，未内嵌 commit/source manifest，故其与最终
  文件的运行对应仍部分依赖执行记录，不能称作独立重跑或完整历史过程证明。
- 科学 aggregate（3/31、37 classes、collision 42、A/B 0/16 等）、194/2、93/12/3 和未漂移
  结论沿用执行日志及既有回执；本窗未独立运行重建，不升级为本次实测。
  **本次 analyzer、validator、完整 pytest 均未启动：** 源码阶段已确认足以阻断接受的合同缺口，
  按 owner 的“发现确定阻断及时停止”结束目标验证；这不是 owner 豁免，也不是命令失败。
  不运行 subset/probe/profile，不联网、不改交付、不创建 worktree 或提交。

`Redo`

GR16R1 不进入 accepted chain；accepted head 保持 GR15R8。原执行任务书写入本裁决并归档，README
同步；本窗不重新开发、不创建验收/纠正任务书或 GR17。完成文档维护后停止，等待 owner decision。

### 4.30 GR16R2 开工授权（2026-10-07）

owner 在 GR16R1 Redo 后明确“开始重做”，并选择“改由本窗口直接开发并完整验证”。本窗因此
直接执行 GR16R2，而非仅下发任务；仅此轮覆盖 §1(7) 的默认角色分工。保持 accepted GR15R8
为唯一 parent、GR9 baseline、原六路径与科学结果；不扩修 captured 相邻问题。

开工前只读核实：新精确 local/origin ref、工作树注册/目录与任务书均不存在，accepted parent
中无本轮六对象/目标 posthoc；GR16R1 六 full objects 的 SHA 与 §4.28 完全一致。
没有联网、读取 sibling worktree、运行旧命令或改旧交付。后续进展与最终回执在此更新。

2026-10-08 执行进展：已从 accepted parent 创建唯一 GR16R2 隔离 branch/worktree，按 full object
核 SHA 后迁移 GR16R1 六件。两套新增默认参数携带受保护来源的保守拒绝，并修正 lambda defaults
外层作用域求值；保留原测试并新增 46 cases。纯 AST 对比：两套科学函数未改、无旧函数/测试删除，
只改读取闭包、身份、rejected provenance 与必要 pins。`--generate` rc 0/PASS，科学 aggregates
保持 3/31、37 classes、collision 42、A/B 0/16。仅删除自己复制的三件旧产品再生成，无旧交付修改。

完整三命令已于 2026-10-08 17:47:34 UTC 启动，顺序 analyzer `--check-existing` → validator →
完整 pytest。受管理会话 `91624`；仓外 `/tmp/gr16r2-construction/` 的点名
`analyzer-full-1`、`validator-full-1`、`pytest-full-1` 各有 `.log` / 完成后 `.rc` / `.metadata.json`，
metadata 记录命令、Python、cwd、时间和运行前后六 SHA。当前尚未声明整套完成、提交或正式接受。
不要遍历该目录；续窗只检查这些点名文件与当前受管理会话，不重复启动正在运行的测试。


### 4.31 GR16R2 执行交付（2026-10-09；不是独立验收 verdict）

- 最终 commit：`b886b4a491bce6ebf34d3382d932874897d15c93`；唯一 parent
  `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`，其 parent 仍为 GR14。独立于 rejected
  GR16 / GR16R1，从 accepted GR15R8 新建隔离 branch/worktree，恰一笔提交、六 A / 零 M。
  message 精确为 `posthoc(stage0a): close callable default capture reads (GR16R2)`，无正文/trailer。
- branch：`stage0a-wave2-trace-failure-paths-fired-callable-default-capture-closure-correction-gr16r2`。
  worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-failure-paths-fired-callable-default-capture-closure-correction-gr16r2`。
- 两套 `pre_primitive_read_closure` 对 callable 默认值捕获的受保护来源保守拒绝；lambda defaults
  按外层作用域求值，覆盖 posonly/普通/kwonly 参数，避免同名形参遮蔽来源。未改科学函数，未改
  scorer、P4 accessor、GR9 15 槽/drop-last 或 captured 相邻 completion；五面身份迁移为 GR16R2。
- 原 1357 cases 保留，新增 46：16 条 predicate 原样/等价捕获负测、6 条安全默认值正常对照、
  16 条带只读 spy 的 capture 黑盒、8 条新 gate/default-scope 自保护黑盒。八种捕获覆盖原样 lambda、
  lambda alias、keyword-only、同名默认值、positional-only、局部 def、def alias、def kwonly。
  16 条捕获 mutation 的 pre-proof pin 不变，predicate 真实消费来源；control rc 0，mutation
  在 boundary stage rc 2，零 proof、零 product/rebuild-input reads、零 release/admitted rebuild。
  新 gate 变异在 module pin 层拒绝。既有 R1 原样反例、R4–R8 等价覆盖随完整套件通过。
- 正常生成及最终三条完整命令均使用 `/opt/anaconda3/bin/python3` 3.12.2、禁 pyc。
  analyzer `--check-existing`：三产品 byte-identical、PASS、rc 0；validator：canonical JSON/REPORT
  byte-identical、93 objects / 12 generations / 3 siblings、PASS、rc 0；完整 pytest：
  **`1403 passed in 42111.91s (11:41:51)`，rc 0**。pytest 于 2026-10-08 17:48:26 UTC 启动，
  外部管理器于 2026-10-09 05:40:59 UTC 收到结束；上述耗时保留 pytest 原 summary，不用 wall time 替换。
  本轮完整三命令一次通过，没有 subset/probe/profile、失败中止或补跑旧交付。
- 正常重建科学读数：split/unsplit 3/31，classes 37、support 1…27、singleton 13；collision 42、
  reduction 0、final 82…88；Layer A/B 0/16，G1/G2/G3/G4 通过数 16/0/0/16；containment
  16/16、identical-to-GR9 0/16；k=2 arm blocks 16 发布/0 抑制。194/2、raw integer/scalar
  sentinel 与唯一 conclusion 保持。GR16 / GR16R1 raw-byte provenance 分列，不计入 93 accepted objects。
- 18 项排除（R1 原 17 项 + rejected GR16R1）均不在交付 ancestry。posthoc 恰五项、CHECKSUMS
  恰四项且不自列；tracked status 与授权精确路径 status 均为空、tag 0、两个指定 cache 不存在。
  六文件运行前后 SHA、最终 `HEAD:path` 与工作树 bytes 全部相等，提交没有改动已测试源码。
- 外部原始证据仅按点名文件读取：`/tmp/gr16r2-construction/` 中的 `generate-1.log`；
  `analyzer-full-1` / `validator-full-1` / `pytest-full-1` 各自 `.log`、`.rc`、`.metadata.json`。
  metadata 含命令、cwd、Python、起止时间、运行前后六 SHA，并已补 final commit 的 object 匹配。
  不新增仓内第七件产物、不遍历临时目录；此为本窗口**开发执行证据**，不改写为后续独立验收结果。
- 过程记录：先复制并核对 GR16R1 六对象，再只删除自建工作树里三件未改动的旧产品以便正常
  `--generate`；pins 仅用仓外静态 AST 构造脚本重算，无独立 import/probe。`EXECUTION_POLICY`
  SHA 未变；保留 Knote 原有及并行产品文档变更。没有联网、模型/API、新费用、旧交付修改或远端操作。

六件最终 SHA-256（相同既有六路径；V=validator，A=analyzer，T=tests，J=JSON，R=REPORT，C=CHECKSUMS）：

```text
V 1de0b0697bce0596e1ab561d5c99f99a91b6dfd6ad58d0e77bf25ccb9497aeeb
A b5497acbab1c4d7f66ce2fb0fc3cf72cc91669bbaad20abc66d0f734e420c311
T bc98039eae74bc99b177992db1875c89b032fa57f329b0cbfc41a7920dd17f24
J e28a66b14d895f40924ee575cdb7de052ad87d57f9cf2690d50b68a7bbbcbeee
R 46e54ea162362e2035f808d2443c323d99ee02a18e7ab5481650f081ccb99cb3
C 00bedad409c3e24ce19e20933dbf9c3a2ada9c87845033b46cf141c9dca48228
```

### 4.32 GR16R2 正式验收 findings 与 verdict（2026-10-10）

**Blocking finding（P1）：默认值经立即调用 lambda 返回 trace 时，捕获来源仍被丢弃。**

- analyzer `pre_primitive_read_closure()` 第 5783–5786 行、validator 第 5950–5953 行只在
  `expression(default, env)` 返回非空来源时拒绝 capture。新 gate 正确处理直接默认值
  `verdict["trace"]`，但没有闭合默认值经 callable 返回的等价来源。
- analyzer 第 5683–5688 / 5730 / 5776–5778 行与 validator 第 5850–5855 / 5897 /
  5943–5945 行：当 Call.func 是 lambda 时，既不解析其返回来源，也不进入顶层 named
  callable 的 results 传播；无显式 args/kwargs/Attribute receiver 的调用落到空集合。
  analyzer 第 5562 行 / validator 第 5729 行把所有 Call.func（不仅 Attribute）纳入
  `called_attributes`；第 5797 / 5964 行又跳过这些节点的普通 expression 检查。
  因此独立遍历内层 lambda 的 body 只能看到安全的 `verdict["trace"]` 取容器，
  不能把来源交回外层 default；外层形参的 lexical table 仍为空。
- 在 analyzer `baseline_signature_index()` 第 8324 行 / validator
  `_baseline_signature_index()` 第 8166 行的 `direct = ...` 前加入：

  ```python
  if verdict["trace"] is not None:
      (lambda _r2_t=(lambda: verdict["trace"])():
          _r2_t["".join(("failure_", "paths_fired"))])()
  ```

  Python 会先求值内层立即调用，取回 trace 并绑定外层默认形参，随后在 P3 读取本轮字段。
  新 gate 的空来源无法触发拒绝，computed key 仍不进入旧 whole-module 确定读点计数；
  P3 也不在旧 P1 闭包。该读不经 canonical accessor，不改变其 194 次 ledger。
  这是原合同 §2、§4(1–2) 的 callable/default 与未知读取 fail-closed 范围内缺口，
  不是 captured proof→release 相邻修复。
- **独立纯 AST 核对：** 只在内存改这一处 baseline，analyzer 其余 771 个、validator 其余
  758 个顶层节点全部不变。独立静态重算正常与变异树，pre-proof digest 均等于原 pin：
  analyzer `c4ad0ca93f7d1f6013b688e5cd57ee6ca1c98dbb0d8569a01b83f265bef1dd73`；
  validator `47fd41dc14e86cdd4730c47b287b6a9f5817879ec6792ac593fc6cbe831853ba`。
  baseline 不在 pin 选中集合，两层 lambda 都位于 Call.func。未写变异文件、
  未 import/执行交付或变异实现、未调用交付 predicate 作独立 probe；
  不声称实测 mutation rc 0、实测早读/放行或正常版科学污染。
- tests 第 217–247 行的八种 capture 都直接以 `verdict["trace"]` 为默认值，
  没有默认值经 callable 返回来源的覆盖；第 255–304 行虽有 predicate、pin 不变、
  正常对照及黑盒拒绝要求，完整通过不能关闭这个未覆盖分支。
- **最小纠正：** 在相同读取合同内，保留 callable 返回到默认值的受保护来源，
  或对无法证明安全的此类调用保守拒绝；加入上述原样例及等价局部 callable/alias、
  安全返回值对照、pin 不变的 predicate 覆盖和 control→mutation 零读取/零 release/
  零 admitted rebuild 证据。保留六路径、GR15R8 parent、科学结果及 R4–R8；
  不要求通用 Python 沙箱、全阶段 pin、另一 primitive 或相邻 repair。

**其它核查与证据归属：**

- 独立核实 HEAD、精确 branch、唯一 parent GR15R8、其 parent GR14、固定单行 message、
  六 A / 零 M；18 个明确排除项全部不在 ancestry。六 SHA 与 §4.31、HEAD:path、
  工作树 bytes 一致；posthoc 恰五项、CHECKSUMS 恰四条且逐项匹配、不自列。
  tracked status 和授权精确路径 status 均为空，tag 0，两个指定 cache 不存在。
- 只读核对 §4.31 点名三组日志/rc/metadata；pytest 确为
  `1403 passed in 42111.91s (11:41:51)`、rc 0；analyzer 三产品 byte-identical/PASS、
  validator 93/12/3 及 canonical JSON/REPORT byte-identical/PASS，均 rc 0。
  三份 metadata 的运行前后六 SHA 均与最终六对象一致，final commit 均为本次交付。
  这些仍是已有开发执行证据，不是本次独立运行，也不能倒推完整历史过程零越界。
- 科学 aggregate 与 194/2 等声明保留为执行证据，本次未独立重建，不升级为本次实测。
  **本次 analyzer、validator、完整 pytest 均未启动**：源码阶段已有确定阻断，按 §6
  停止目标验证；不是 owner 豁免或命令失败。未运行 subset/probe/profile、未联网、
  未使用 subagent、未改交付或创建实验 worktree/提交。
- 本窗初始在 Knote 仓误查交付 object，得到 `bad object` 后按 handoff 切换到点名交付
  worktree；未修改任何实验文件。独立 AST 摘要脚本首次因两套 guard 方法名不同而停止，
  修正审查脚本后两 pin 均复现；这不是交付命令失败或 mutation 执行。

`Redo`

GR16R2 不进入 accepted chain，accepted head 保持 GR15R8。原任务书已写入裁决并归档，
README 同步；无 ACTIVE 任务，等待 owner decision。不重新开发、不另建验收/纠正任务书或 GR17。

### 4.33 GR16R3 开工授权（2026-10-10）

owner 在 GR16R2 Redo 后明确“直接在本窗口进行redo，做完等我验收”。
本窗直接执行新隔离工作树的最小纠正、完整三命令与唯一提交，仅此轮覆盖 §1(7)。
新 local/origin ref、worktree 注册/目录、任务书和 parent 六路径已精确确认不存在；
GR16R2 六 full objects 的 SHA 与 §4.31 一致；accepted chain 未改变。

本轮进展：已从 accepted GR15R8 创建新隔离工作树，按 full objects 核 SHA 后复制六件，
只删除自建工作树里三份未改的旧产品供 --generate 正常重建。两套 callable 返回来源改为保守拒绝，
新增 68 cases（24 predicate、12 安全对照、24 capture 黑盒、8 新 gate 自保护）；原 1403 cases 保留。
静态 AST 对照无旧函数删除，科学函数未改；只改闭包、身份、19 排除/provenance 与 pins。
正常 --generate PASS/rc 0，科学 aggregates 保持 3/31、37 classes、collision 42、A/B 0/16。

完整三命令于 2026-10-09 23:28:27 UTC 开始，受管理会话 `9592`；
顺序 analyzer --check-existing → validator → 完整 pytest。
仓外 `/tmp/gr16r3-construction/` 点名 `analyzer-full-1`、`validator-full-1`、
`pytest-full-1` 的 .log/.rc/.metadata.json 记录运行前后六 SHA；续窗先查此会话及点名文件，
不重复启动。上述为开工时记录；三命令现已结束，最终交付见 §4.34，未作正式接受裁决。

构建过程记录：首次新增测试的仓外构造字符串转义错误，内存 compile 拒绝，未写入源码；
改用补丁后语法检查通过。pins 由仓外静态 AST 构造脚本计算，未 import 交付作独立 probe。

### 4.34 GR16R3 执行完成回执（2026-10-10；待 owner 验收）

- 交付 `0a0d71327d05dde87fa67f0bd9abf87f4457fb6e`，唯一 parent 为 accepted GR15R8
  `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`，其 parent 仍为 GR14。
  相对 parent 恰一笔、六 A / 零 M，message 恰一行
  `posthoc(stage0a): close callable return capture reads (GR16R3)`，无正文/trailer。
- branch：`stage0a-wave2-trace-failure-paths-fired-callable-return-capture-closure-correction-gr16r3`。
  worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-failure-paths-fired-callable-return-capture-closure-correction-gr16r3`。
- 两套读取闭包对 lambda body 与局部 def/async def 的受保护 return 来源保守拒绝；
  检查独立于 Call.func 的普通 expression 跳过规则。保留直接 default capture、外层作用域、
  原 R1 未知键闭包及 R4–R8；不改科学函数、P4 accessor、GR9 15 槽/drop-last 或相邻 completion。
  五面身份为 GR16R3 correction，科学问题仍为 GR16；GR16R2 六 raw-byte provenance 分列。
- 原 1403 cases 保留，新增 68，完整 **1471 passed**。新增 24 条 predicate 及 24 条 capture
  黑盒覆盖原样立即调用、provider/def alias、nested lambda/def、keyword/same-name default、
  mapping/sequence 返回、直接返回后读取与 helper keyword default；这些 baseline-only 变异
  的 pre-proof pin 不变。黑盒每条均先同一只读 spy control rc 0，再 mutation 在 boundary
  stage rc 2，零 proof、零 product/rebuild-input reads、零 release/admitted rebuild。
  12 条安全返回值对照通过；8 条新 gate 条件恒假/跳过变异在 module pin 层拒绝。
- 固定 `/opt/anaconda3/bin/python3` 3.12.2，禁 pyc。最终完整三命令一次通过：
  analyzer --check-existing PASS/rc 0，三产品 byte-identical；
  validator PASS/rc 0，93 objects / 12 generations / 3 siblings，
  canonical JSON/REPORT byte-identical；
  pytest **`1471 passed in 32827.07s (9:07:07)`，rc 0**。
  pytest 于 2026-10-09 23:29:20 UTC 启动，管理器于 2026-10-10 08:44:14 UTC 收到结束；
  耗时使用 pytest 原 summary，不以外部 wall time 替换。没有子集/probe/profile 或中止/失败重跑。
- 正常重建结果保持 split/unsplit 3/31、classes 37、support 1…27、singleton 13、collision 42、
  reduction 0、final 82…88、Layer A/B 0/16，G1/G2/G3/G4 通过 16/0/0/16；
  containment 16/16、identical-to-GR9 0/16，k=2 arm blocks 发布/抑制 16/0，194/2、
  raw integer/scalar sentinel 及唯一 conclusion 保持。它们是本窗执行重建结果，不是后续独立验收。
- 19 个明确排除项均不在 ancestry；posthoc 恰五项，CHECKSUMS 恰四条、逐项匹配且不自列。
  三命令前后六 SHA、最终 HEAD:path 与工作树 bytes 全部相等；提交没有改变已测试源码。
  tracked status 与授权精确路径 status 均为空，tag 0，两个指定 cache 不存在。
- 仓外证据：`/tmp/gr16r3-construction/generate-1.log` / .rc；
  `analyzer-full-1`、`validator-full-1`、`pytest-full-1` 各自 .log/.rc/.metadata.json。
  metadata 含命令、cwd、Python、起止时间、运行前后六 SHA，已补
  `verified_final_commit` 及 object bytes 匹配；不遍历临时目录、不新增仓内第七件产物。
- 本窗构建偏差见 §4.33：一次仓外字符串转义导致内存 compile 拒绝，未写入交付；
  后用补丁完成。未联网、使用 subagent、模型/API、新费用、修改旧交付或远端操作。
  Knote 既有未提交改动保留；原 GR16R2 归档首屏只同步当前路由。

六件最终 SHA-256（V=validator，A=analyzer，T=tests，J=JSON，R=REPORT，C=CHECKSUMS）：

```text
V da64c2d923d2515558c1b2746d936edfcf6edaeee141c010fce2cbdf8270ccd0
A 622b631ed7744b21150e79ffa660ada7d5956e396bbe617d0bac94fee2f99fa2
T 2e6f17a3b494da2b5f607679ba0efced87cb33445d44f594c65cb9360ee49a13
J b3ca5fba88fae7a9fd887293e28008728ad8daef8756d2ad6d9d3486f6f565ce
R 7965daf01fa125d6b62bece8bb8bdac67575f7506690546fed9ad3d4149384c8
C f4d54fdf13c7afc0cf9e681cfc37d9cd62222e3fd42076996fcf0ba092e0ed3f
```

### 4.35 GR16R3 正式验收 findings 与 verdict（2026-10-10）

**Blocking finding（P1 优先级）：局部 def 遮蔽安全内建名称，使 callable 返回/default 来源再次丢失。**

- analyzer `pre_primitive_read_closure()` 第 5592–5594 行、validator 第 5759–5761 行的
  `local_bindings` 只纳入当前函数参数及 `ast.Name(Store/Del)`，漏掉局部 `FunctionDef.name`。
  顶层 definitions / callable aliases 也不登记这个局部 def。因此局部 `def id(...)` 的调用
  不进入 analyzer 5752–5755 / validator 5919–5922 的不透明局部 callable 拒绝分支，
  而落到 analyzer 5767–5768 / validator 5934–5935 的安全内建分支并返回空来源。
- 新增 local-return gate（analyzer 5794–5797；validator 5961–5964）只检查 return 表达式
  当前来源；局部 helper 的实参没有绑定到其形参时，`return _r3_value` 仍是空来源。
  默认值 gate（analyzer 5785–5788；validator 5952–5955）也因此看不到 trace。
- 在 analyzer `baseline_signature_index()` 第 8339 行 / validator `_baseline_signature_index()`
  第 8181 行的 `direct = ...` 前插入以下反例：

  ```python
  if verdict["trace"] is not None:
      def id(_r3_value):
          return _r3_value
      (lambda _r3_t=id(verdict["trace"]):
          _r3_t["".join(("failure_", "paths_fired"))])()
  ```

  按 Python 名称绑定语义，这里调用的是局部 identity helper，返回 trace 后绑定默认参数，
  随后在 P3 读取本轮字段；不是内建 `id()` 的整数结果。未知 key 仍不会增加旧 whole-module
  确定读点计数，baseline 仍在旧 P1 闭包之外，读取也不经过 canonical P4 accessor。
  这是 GR16R3 §2 继承的局部 callable 返回/default 与 GR16R2 §4(1–2) fail-closed 缺口，
  不属于 captured proof→release 相邻状态修复。
- **独立纯 AST 对照：** 只在内存改上述 baseline，analyzer 其余 773 个、validator 其余
  760 个顶层节点完全不变。独立静态重算正常与变异树的 pre-proof digest，均匹配原 pin：
  analyzer `b0aaa71d455d9e312fde2fec3b25a384b393bafcab384e8845b29aaf8e065518`；
  validator `a9f793ae77c9bfa85e390d7c63993df0052947e8271e59d7217646ad9a1ca800`。
  两个 baseline 均不在 pin 选中集合；AST 亦确认 `id` 未进入上述 local_bindings，且无顶层
  `id` 定义。没有写变异文件、import/执行交付或变异实现、调用交付 predicate 作额外 probe；
  不声称 mutation 实测 rc 0、实测读取/放行或正常版科学污染。
- tests 221–254 的 12 类新增返回变体均直接或嵌套捕获外层 trace，没有覆盖局部 def 遮蔽
  安全内建、经显式实参返回的路径。原 R1 `shadowed_builtin` 是顶层 helper 形参遮蔽，
  不覆盖 `FunctionDef.name` 绑定缺口。1471 tests 全绿不能证明这一分支已关闭。
- **最小纠正：** 安全内建分支须以名称确实解析到内建为前提；对局部 callable 的绑定及
  参数→返回→默认值保留来源，或在不能证明安全时保守拒绝。补上述原样及等价名称/作用域
  变体、真实内建/安全返回值对照、pin 不变 predicate 覆盖和 control→mutation 的零 proof、
  零 product/rebuild-input reads、零 release/admitted rebuild 证据，以及新规则的自保护。
  保留 GR15R8 parent、六路径、全部旧覆盖、科学结果及 R4–R8；不要求通用 Python 沙箱、
  全阶段 pin、其它 primitive 或相邻 repair。本次只登记最小纠正范围，不创建新执行任务。

**其它核查与证据归属：**

- 独立核实 HEAD、精确 branch/worktree、唯一 parent GR15R8、其 parent GR14、固定单行 message、
  相对 parent 恰一笔六 A / 零 M；19 个明确排除项全部不在 ancestry。
  六 SHA 与 §4.34、HEAD:path、工作树 bytes 一致；posthoc 恰五项、CHECKSUMS 恰四条逐项
  匹配且不自列；tracked status 与六路径 status 为空，tag 0，两个点名 cache 不存在。
- 只读核对点名三组日志/rc/metadata：pytest 原 summary 确为
  `1471 passed in 32827.07s (9:07:07)`、rc 0；analyzer 三产品 byte-identical/PASS、
  validator 93/12/3 及 canonical JSON/REPORT byte-identical/PASS，均 rc 0。
  三组运行前后六 SHA 均独立与最终 objects 对齐。它们是已有执行证据，不是本次独立运行，
  也不构成完整历史过程零越界的证明。科学 aggregate 保留为日志证据，本次未独立重建。
- **本次 analyzer、validator、完整 pytest 均未启动：** 源码阶段已确认阻断，按 §6 停止
  目标验证；不是命令失败或 owner 豁免。未运行 subset/probe/profile、未联网、未使用 subagent、
  未改交付或创建实验 worktree/提交。一次源码读取误用 Knote cwd 返回 No such file，随后
  在点名交付 worktree 正确读取；未修改文件，不是交付命令失败。

`Redo`

GR16R3 不进入 accepted chain，accepted head 保持 GR15R8。原执行合同写入裁决并归档，
README 同步；无 ACTIVE 实验任务，等待 owner decision，不自动创建纠正任务书或 GR17。

### 4.36 GR16R4 开工授权（2026-10-10）

owner 在 GR16R3 Redo 后明确“直接在本窗口进行redo，开始”。本窗直接执行最小纠正、完整
三命令和唯一提交，仅本轮覆盖 §1(7)。新点名 refs/worktree/任务书/parent 六路径已确认不存在；
GR16R3 六 full objects SHA 与 §4.34 一致。accepted head 保持 GR15R8。

构建进展（2026-10-12 Europe/London）：两套闭包保守登记局部 def/class、参数、import、
exception/pattern captures；安全内建分支前拒绝无法证明安全的受遮蔽调用。新增 76 cases
（24 predicate、16 安全对照、24 capture 黑盒、12 gate 自保护），保留原 1471 等价覆盖。
科学函数/P4 accessor/GR9 projection 的 AST 未改；只改闭包、身份/provenance、pins 与测试。
首次 generate 因轮次校验仍用 R3 后缀而 rc 2，修正到 R4 后 generate-2 PASS。
续窗补静态发现的排除项测试计数 19→20，仅删除新工作树自建三产品后 generate-3 PASS；
科学 aggregates 仍为 3/31、37 classes、collision 42、A/B 0/16。未运行 subset/probe/profile。

完整三命令于 2026-10-11 23:42:59 UTC 开始，管理会话 `95410`，
顺序 analyzer --check-existing → validator → 完整 pytest。仓外 `/tmp/gr16r4-construction/`
点名 `analyzer-full-1`、`validator-full-1`、`pytest-full-1` 的 .log/.rc/.metadata.json 保存
运行前后六 SHA、命令、Python、时间及 pid；续窗先查已有运行，不重复启动。
当时尚未完成完整验证、尚未提交、尚未正式验收；最终交付见 §4.37。

第一轮完整命令：analyzer-full-1 PASS/rc 0；validator-full-1 在 product-boundary rc 2，
因新增检查误用 analyzer 的 facts['bindings']，而 validator 对应键是 counts；pytest 未启动。
已改为各自读取正确审计键的 module_bindings，再重算 pins、重生成并从完整三命令重新验证。
原失败日志保留，不作为 mutation 拒绝证据。
第二轮完整三命令于 2026-10-11 23:44:30 UTC 启动，管理会话 `71709`；
当时点名日志为 analyzer-full-2 / validator-full-2 / pytest-full-2。

2026-10-12 再次续窗核查：第二轮 analyzer/validator 均 PASS/rc 0；pytest 日志停在
1424/1547 个通过标记，无最终摘要、无 .rc，metadata 无 ended_utc/returncode；
原 manager 1334、pytest 2771 均已不存在，会话 71709 已失效。终止原因未确定，
该 pytest 只记未完成，不记 PASS。六交付 SHA 仍与该轮运行前一致，HEAD 仍为 GR15R8。
已保留全部第二轮证据，不补跑子集；第三轮完整三命令由独立进程 manager 83302 启动，
点名 analyzer-full-3 / validator-full-3 / pytest-full-3 的 .log/.rc/.metadata.json 为该轮证据。
没有修改源码或产品。第三轮现已完整通过并提交，最终状态与停止点见 §4.37。


### 4.37 GR16R4 完整执行回执（2026-10-12 Europe/London，待 owner 验收）

**COMPLETE（执行交付），不是 Accept。** 本窗口按 owner 直接 redo 授权完成纠正、完整验证及
唯一提交；accepted chain 仍停在 GR15R8，最近正式 verdict 仍为 §4.35 的 GR16R3 Redo。
GR16R4 合同保留在根目录作为唯一待验收合同，未创建 GR17，停止实验执行。

- 提交：`f00a720820f6379277a4c61aa2c4d9a56034dc73`。
- 唯一 parent：GR15R8 `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`；其 parent 为 GR14
  `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`。相对 GR15R8 恰一笔提交，六 A／零 M。
- branch：`stage0a-wave2-trace-failure-paths-fired-local-callable-binding-closure-correction-gr16r4`。
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-failure-paths-fired-local-callable-binding-closure-correction-gr16r4`。
- 单行 message：`posthoc(stage0a): close local callable binding reads (GR16R4)`；无正文/trailer。
- 20 个明确排除项全部非 ancestor；GR16/R1/R2/R3 均未进入 accepted ancestry。
- 提交后 tracked status 与六路径 status 均干净，HEAD tags 为零；posthoc 恰五项、CHECKSUMS
  恰四条且校验一致；两个精确 cache 目录均不存在。没有 merge/tag/fetch/pull/push。

**最终完整三命令（第三轮，固定 Python 3.12.2，PYTHONDONTWRITEBYTECODE=1）：**

| 命令 | 实际结果 | 起止 UTC |
|---|---|---|
| analyzer --check-existing | PASS / rc 0 | 2026-10-12T11:54:12.068595+00:00 → 2026-10-12T11:54:37.207745+00:00 |
| validator | PASS / rc 0 | 2026-10-12T11:54:37.209277+00:00 → 2026-10-12T11:55:03.679612+00:00 |
| 完整 pytest | 1547 passed / rc 0 | 2026-10-12T11:55:03.680970+00:00 → 2026-10-12T22:13:55.080597+00:00 |

pytest 使用任务书 §6 原完整文件命令 `-q -p no:cacheprovider`；未使用 subset/probe/profile。
其摘要耗时是 **36671.99s（10:11:11）**，进程退出收尾后 rc 0 于 22:13:55 UTC 落盘；
起止 wall time 包含退出收尾，不能把摘要时间误写为整个进程 wall time。
analyzer 三产品 byte-identical，validator canonical JSON/REPORT byte-identical，均 PASS。
完整测试为 **1547 passed = 原 1471 等价覆盖 + 新增 76**。

本次 correction 在两套闭包中登记局部 def/class、参数、import、exception/pattern captures，
并将本地/模块遮蔽调用的保守拒绝置于安全内建分支之前。新增覆盖为 24 predicate、16 安全对照、
24 capture 黑盒与 12 gate 自保护：包括原样 local-def id、等价内建名、参数形式、alias、nested、
class/import 和 direct return。完整测试覆盖 baseline-only 变体 pre-proof pin 不变、真实拒绝、
同一只读 spy 正常对照及拒绝前零 proof/product-read/release/admitted rebuild；这些是执行证据，
不代替下一窗对名称解析与实现边界的独立验收。

**科学结果保持不变：** 194 available / 2 malformed；raw integer/scalar sentinel；split/unsplit
3/31，37 classes、support 1…27、singleton 13；collision 42、reduction 0、final 82…88；
Layer A/B 0/16，G1/G2/G3/G4 16/0/0/16；containment 16/16、identical-to-GR9 0/16；
k=2 published/suppressed 16/0；93 objects / 12 generations / 3 siblings。科学函数/P4 accessor/
GR9 15 槽/drop-last 未改。唯一 conclusion 仍为：

> the preregistered len(trace.failure_paths_fired) exact-count refinement increases development separability but cannot realize any GR7 oracle-all-green cell under the frozen gates

**六 SHA（最终三命令运行前 = 运行后 = 工作树 = f00a720820f6379277a4c61aa2c4d9a56034dc73:path）：**

```text
0b71bc2f9beadb61e2aa986fa17d5bfa5ed11a3bf8f844190417c947aeb49622  harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
7d1c4f342a519e6d6b99caa6b33a5608b862c9bac0ab7d2d8b655de3bc7c5e8a  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
2ef92e8a7c9aff3049c273357017678863268a5dadf391a4ac2759f30cd720b0  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
f7f123290c2bfaade9bc36927a404b4acf7eebfe3a52c7742a5a70bf30b89e51  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
2d6074aede62439269adec5790d0b5ebf8816247209eed560279e8d74dec0a74  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
4b1875f825f782ed0b371e6850abbf26c0dd300075ae161abd5a36175b6a90f1  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/CHECKSUMS-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

仓外证据：`/tmp/gr16r4-construction/` 下 `analyzer-full-3`、`validator-full-3`、`pytest-full-3`
各自的 `.log/.rc/.metadata.json`。metadata 记录完整 argv、cwd、Python、UTC、manager/child PID、
前后六 SHA，并补 `verified_final_commit=f00a720820f6379277a4c61aa2c4d9a56034dc73` 与
`commit_object_sha256_matches_run_bytes=true`。科学产物未加入运行元数据。

历史过程如 §4.36：generate-1 轮次后缀校验失败、第一轮 validator 审计键错误均已纠正；
第二轮 pytest 在 1424 个通过标记后无进程、无最终摘要/rc，原因未确定，只记未完成。
第三轮从原完整三命令重跑，未复用部分通过为最终成功，也未改源码来缩短验证。
未接触 hidden、未人工读取 rows/trace/answer 或字段元素，未联网、安装、subagent、模型/API、
新费用、promotion/freeze；不扩到相邻 repair、primitive 组合或新实验。

### 4.38 GR16R4 正式验收 findings 与 verdict（2026-10-12）

**Blocking finding（P1 优先级）：局部 callable 的属性调用按 method 名特判，仍丢弃受保护实参的返回/default 来源。**

- analyzer `pre_primitive_read_closure()` 第 5737–5749 行、validator 第 5904–5916 行，
  仅凭 `Call.func` 为 Attribute 且属性名属于 `values/items/keys/copy` 就进入 method 特例。
  `.copy` 分支直接返回 receiver 来源；整段不消费已求出的 args/kwargs 来源，也未证明 receiver
  是真实字典方法。新局部/模块遮蔽防线（analyzer 5770–5773；validator 5937–5940）只处理
  `ast.Name`，在这个 Attribute 分支之后，不能保护局部 class 的同名 staticmethod。
- 在 analyzer `baseline_signature_index()` 第 8363 行 / validator `_baseline_signature_index()`
  第 8205 行的 `direct = ...` 前插入以下反例：

  ```python
  if verdict["trace"] is not None:
      class _r4_provider:
          @staticmethod
          def copy(_r4_value):
              return _r4_value
      (lambda _r4_t=_r4_provider.copy(verdict["trace"]):
          _r4_t["".join(("failure_", "paths_fired"))])()
  ```

  按 Python 语义，局部 staticmethod 原样返回 trace，随后在 P3 的 lambda body 读取本轮字段。
  分析时 class receiver 是空来源，`.copy` 特例忽略非空 trace 实参并返回空来源；局部 def 的形参
  没有绑定该实参，return 检查（analyzer 5812–5815；validator 5979–5982）也看不到来源。
  default 检查因此不拒绝，lambda 形参的 lexical table 仍为空。未知 `str.join` key 不增加旧
  whole-module 确定读点计数，P3 baseline 不在旧 P1 闭包；读取也不经 P4 accessor/ledger。
  这属于继承的 GR16R2 §4(1–2) method/helper/alias fail-closed 与 GR16R4 §2 局部 callable
  来源合同，不是 captured proof→release 相邻修复。
- **独立纯 AST 对照：** 只在内存修改这一处 baseline，analyzer 其余 775 个、validator 其余
  762 个顶层节点全部不变，内存 compile 通过。用独立静态算法重算正常/变异树的 pre-proof
  digest，均等于原 pin：analyzer
  `e3e04227b006eaabd24229eeff1eaa3d91bdddf1dc89a2b8f1e425ba40ee041f`；validator
  `a0baa647457a64134faadd2be595061be14923eb6c1779d9e291c95dd3498e82`。
  两个 baseline 均不在 pin 选中集合，不能依靠 pin mismatch 提前拒绝此例。
  未写变异文件、import/执行交付或变异实现、调用交付 predicate 作独立 probe；不声称 mutation
  实测 rc 0、实测早读/放行或正常版科学污染。
- tests 第 221–245 行的十二类新增 binding 变体均以 Name 调用 provider；`class_name` 只调用
  class 本身，`import_alias` 也改为 Name。没有覆盖局部 class 属性上与 method 特例同名的
  callable。第 266–322 行的 predicate/pin/黑盒/自保护要求是有效覆盖，但 1547 tests 全绿
  不能关闭上述未覆盖分支。
- **最小纠正：** method 特例必须有真实 receiver/callable 与参数形态的静态依据；不能把未知
  Attribute callable 按属性名当成容器内建并丢弃 args/kwargs。保留受保护参数→返回→default
  来源，或对不能证明安全的路径保守拒绝。补原样及等价 method 名、alias/keyword 变体、真实
  容器方法和安全返回值对照、pin 不变的 predicate 覆盖及 control→mutation 零 proof、
  零 product/rebuild-input reads、零 release/admitted rebuild 证据，并保护新检查自身。
  保留 GR15R8 parent、六路径、全部旧覆盖和科学结果；不要求通用 Python 沙箱、全阶段 pin、
  另一 primitive 或相邻 repair。本次只登记最小纠正范围，不创建执行任务。

**其它核查与证据归属：**

- 独立核实交付 HEAD `f00a720820f6379277a4c61aa2c4d9a56034dc73`、点名 branch/worktree、
  唯一 parent GR15R8、其 parent GR14、固定单行 message、相对 parent 恰一笔六 A / 零 M。
  两套源码的 20 个明确排除项全部不在 ancestry；tracked status 与六路径 status 均为空，
  HEAD tags 为零，两个精确 cache 不存在。未修改实验交付、创建实验 worktree 或提交。
- 六件工作树 bytes 与最终 `commit:path` 相同，六 SHA 逐项等于 §4.37；posthoc 恰五项、
  CHECKSUMS 恰四条且逐项匹配、不自列。第三轮三份 metadata 的运行前/后六 SHA 均独立
  与最终 objects 对齐，argv/cwd/Python/起止/rc 和 final-commit 绑定一致。
- 点名第三轮日志/rc 证实 pytest 原摘要为 `1547 passed in 36671.99s (10:11:11)`、rc 0；
  analyzer 三产品 byte-identical/PASS、validator 93/12/3 及 canonical JSON/REPORT
  byte-identical/PASS，均 rc 0。它们是已有执行证据，不是本次独立运行，也不能证明完整历史
  过程零越界。摘要耗时与进程起止 wall time 继续分列。
- 独立 AST 比较 R3/R4：科学函数、P4 accessor、GR9 15 槽/drop-last 均未变；两套旧顶层
  definitions 无删除。科学 aggregate 保留为第三轮日志证据，本次未独立重建。
  **本次 analyzer、validator、完整 pytest 均未启动：** 源码已有确定阻断，按 §6 停止目标
  验证；不是命令失败或 owner 豁免。未运行 subset/probe/profile、未联网、未使用 subagent。
- **本窗复核过程偏差（不归责于执行者）：** 初始查约束误用
  `find .. -name AGENTS.md -print`，从 Knote 父目录递归查找，超出精确路径限制；未返回匹配项，
  最终 exit 0。无正文输出，但不能据此证明未遍历哪些目录，不声称本窗全程零目录接触。
  后续只作点名文件/objects/路径检查，不清理 hidden/raw/旧临时目录。一次混用 Knote cwd
  读取交付源码报 No such file，随后切回点名工作树；两个静态核查脚本版本先后因误判排除表
  结构、未处理 tuple 拼接而停止，修正后两套 pin/20 排除项均核实。这些不是交付命令失败
  或 mutation 执行。

`Redo`

GR16R4 不进入 accepted chain，accepted head 保持 GR15R8。原执行合同写入裁决并归档，
README 同步；无 ACTIVE 实验任务，等待 owner decision，不自动创建新纠正任务书或 GR17。

### 4.39 GR16R5 开工授权（2026-10-13）

owner 在 GR16R4 Redo 后明确“在本窗口开始redo”。本窗直接执行 §4.38 最小纠正、完整三命令
及唯一提交，仅本轮覆盖 §1(7)。accepted head 保持 GR15R8。
精确 local/origin ref、worktree 注册/目录、新任务书和 parent 六路径已确认不存在；GR16R4 六
full objects SHA 逐项匹配 §4.37 后复制，从 GR15R8 新建 GR16R5 隔离工作树。
唯一 ACTIVE 合同：`docs/TASKBOOK-STAGE0A-GR16R5-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-METHOD-CALLABLE-ORIGIN-CLOSURE-CORRECTION-2026-10-13.md`。
本轮只修 method/callable 来源与参数形态，保留科学问题、六路径及全部原覆盖；不创建 GR17。
初始一次混用 Knote cwd 读交付源码报 No such file，随后限定点名 GR16R5 工作树；一次文档
构造脚本在内存替换时锚点未命中，未写 handoff，随后改用精确补丁。未递归遍历目录或 import 前序实现作 probe。

执行进度（2026-10-13）：两套闭包已加入 receiver 来源、调用形态、bound/unbound default 与
setdefault 存储传播；新增 122 cases，预期总数 1669（保留原 1547）。首次 generate-1 rc 2
因真实容器解包绑定未被识别，补齐后 generate-2 / generate-3 均 PASS；后者含最终测试 SHA。
只保存静态源码与聚合诊断，未增加独立 import/probe。三命令 manager PID `62026`，
仓外证据前缀 `/tmp/gr16r5-construction/{analyzer,validator,pytest}-full-1`；当前尚未取得完整
三命令终态、未提交。续窗先查这些精确 metadata/log/rc 与 PID，禁止重复启动。
analyzer（23:33:33–23:33:59 UTC）与 validator（23:33:59–23:34:26 UTC）均 rc 0 / PASS，
各自命令前后六 SHA 与当前文件相同，JSON/REPORT byte-identical。完整 pytest 于
2026-10-12 23:34:26 UTC 启动（PID `63373`），使用同组六 SHA；最终 summary/rc 与提交仍待。
完整 pytest 进入原覆盖前，本轮新增 122 cases 已全部显示通过（含原样反例、真实容器对照、
零 proof/read/release 黑盒及新检查自保护）；这仅是在途标记，不能替代全量最终 summary/rc。
在途累计 708 项未出现失败标记后，因多次墙钟跳跃伴随日志推进很少（未确认原因），于
2026-10-13 05:22:41 UTC 加临时 `caffeinate -i -w 63373`（PID `76584`）防空闲休眠；
随 pytest 退出，无电源配置/测试 argv/env/交付文件改动，证据为同目录 `pytest-full-1-awake.metadata.json`。
full-1 于标题身份正测首次失败后中断：`1 failed, 1100 passed in 29255.70s (8:07:35)`，
pytest rc 2，终态 2026-10-13 07:42:26 UTC，六文件命令前后 SHA 相同；旧 manager/pytest/awake
均已退出，未提交。失败是执行者漏更新的旧测试标题白名单仍允许 `# GR16R4 `，正确 R5 标题
被拒绝；已改为仅允许 `# ` + 当前 `DELIVERY_ROUND` + 空格，保留其余轮次拒绝语义。
原样/等价 method 防护和本轮新增 122 cases 已在失败前通过；不把这次部分运行当全量通过。
目前正以 generate-4 重生成，随后从 analyzer 起完整重跑 full-2 三命令，不运行子集。
generate-4 已 PASS / rc 0；full-2 于 2026-10-13 07:45:04 UTC 启动，manager PID `70577`，
对应临时 awake PID `70578`（观察 manager，退出即结束），证据 `full-2-awake.metadata.json`。
当前续窗入口改为 `/tmp/gr16r5-construction/{analyzer,validator,pytest}-full-2`，先查精确
metadata/log/rc 与 PIDs；full-1 已终止，不得恢复或重复启动 full-2。
full-2 analyzer / validator 均 PASS / rc 0，六 SHA 各自前后及相互一致；重建 JSON/REPORT
byte-identical。完整 pytest 已启动（PID `71968`），同组六 SHA；最终 summary/rc 及唯一提交仍待。

### 4.40 Owner 暂停（2026-10-13）

owner 明确“先暂停，等我指令再继续”。于 2026-10-13 10:58:09 UTC 对原 full-2
process group `70577` 及已知 descendants 发 SIGSTOP；manager `70577`、pytest `71968`、
当前 child `28157` 均核实为 T 状态。临时 awake `70578` 与 monitor `70580` 已结束。
第二轮在途通过标记 581 项、无失败标记，最终 summary/rc 尚无；analyzer/validator 已 PASS。
六 SHA 与 full-2 开始时相同，记录在 `/tmp/gr16r5-construction/pause-full-2.metadata.json`。
未提交、未 Accept；accepted head 仍为 GR15R8，未创建 GR17。
只有 owner 明确恢复后才核对原 PID/PGID、暂停快照六 SHA 与当前状态，再以 SIGCONT 恢复
原 group/记录的进程。禁止自行启动另一组完整测试；若进程已丢失，先报告事实并等新指令。

### 4.41 Owner 恢复（2026-10-13）

owner 明确“continue”。2026-10-13 18:20:54 UTC 核对暂停记录、原 PIDs/PGID/亲子关系
及 T 状态；六 SHA 同时匹配暂停快照与 full-2 起点，日志仍为 581 个通过标记、无失败标记。
已 SIGCONT 原 group `70577`（manager 70577 / pytest 71968 / child 28157），不启动新一轮。
本次暂停 26565.135864 秒；现场为 `/tmp/gr16r5-construction/resume-full-2.metadata.json`。
临时 awake PID `49957` 观察原 manager，退出即结束，不改电源配置或测试 argv/env。
只恢复既有 method/callable 最小纠正、完整三命令、唯一提交及停止点；accepted head GR15R8。

收尾阶段日志先给出 `1669 passed in 75475.68s (20:57:55)`；当时尚待自然退出与提交。
此为历史进度；最终 rc 0、六 SHA/HEAD 绑定与唯一提交见 §4.42。

### 4.42 GR16R5 完整执行交付回执（2026-10-14；待 owner 验收）

**COMPLETE（执行交付），尚未 Accept。** owner 的同窗 redo 授权已完成，全部验证进程自然退出；
仅维护本回执、任务书和 README 后停止。accepted chain 保持 GR15R8，未创建 GR17。

- commit：`c92e00f6fa20f42315ee4d76bb0567349db63c72`。
- 唯一 parent：GR15R8 `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`；其 parent 为 GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`。
- branch：`stage0a-wave2-trace-failure-paths-fired-method-callable-origin-closure-correction-gr16r5`。
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-failure-paths-fired-method-callable-origin-closure-correction-gr16r5`。
- 唯一单行 message：`posthoc(stage0a): close method callable origin reads (GR16R5)`。
- 相对 parent 恰一笔提交、六 A / 零 M；21 个明确排除项均非 ancestor（含 rejected GR16/R1/R2/R3/R4），HEAD tags 为 0。
- 已核实 tracked 与六路径状态 clean；posthoc 恰五项、CHECKSUMS 恰四条且不自列。
  `harness/__pycache__` 与本 posthoc 的 `__pycache__` 均不存在；未递归扫描目录。

两套独立闭包现先证明 receiver/callable 来源及参数形态，再应用容器方法语义；属性名本身
不能授权丢弃 protected args/kwargs 或返回来源。保留真实容器/未遮蔽 builtin 的建模，
补齐 bound/unbound default、setdefault 存储和 tuple/list 解包来源传播；不能证明的 protected
调用保守拒绝。科学函数、P4 accessor、GR9 15 槽/drop-last 不变。
新增 122 cases：21 类反例的双实现 predicate 与黑盒（共 84）、11 类安全/真实容器双对照
（22）、8 类新检查双自保护（16）。原 1547 等价覆盖保留，总数 1669。

最终完整三命令为任务书 §5 原样命令；Python 3.12.2，`PYTHONDONTWRITEBYTECODE=1`，
pytest 带 `-q -p no:cacheprovider`，cwd 为上述精确工作树。下表均为 UTC：

| 命令 | PID | 开始 | 自然退出 | rc |
|---|---|---|---|---|
| analyzer | 70579 | 2026-10-13T07:45:04.521946+00:00 | 2026-10-13T07:45:29.305768+00:00 | 0 |
| validator | 71233 | 2026-10-13T07:45:29.307237+00:00 | 2026-10-13T07:45:55.668021+00:00 | 0 |
| pytest | 71968 | 2026-10-13T07:45:55.669499+00:00 | 2026-10-14T04:53:46.299673+00:00 | 0 |

analyzer `--check-existing` 与 validator 均 PASS，既有 JSON/REPORT/CHECKSUMS 校验及重建
产物 byte-identical。pytest 原始终态：**`1669 passed in 75475.68s (20:57:55)`，rc 0**。
该原始耗时包含 owner 暂停 `26565.135864` 秒（7:22:45）；扣除明确暂停为
`48910.544136` 秒，约 13:35:10。没有替换原始 summary。
summary 后继续等解释器自然收尾，直到上表最终 rc 0 才提交；未强制结束成功进程。
暂停/恢复沿用同一个 full-2 group/pytest，未重启验证。

完整证据位于 `/tmp/gr16r5-construction/`：
`analyzer-full-2`、`validator-full-2`、`pytest-full-2` 各自的 `.log/.rc/.metadata.json`，
以及 `pause-full-2.metadata.json`、`resume-full-2.metadata.json`、`full-2-awake.metadata.json`
和 `final-receipt.json`。三份最终 metadata 均记录
`verified_final_commit=c92e00f6fa20f42315ee4d76bb0567349db63c72`、`final_commit_objects_match=true`。
六文件在三命令各自开始/结束、相互之间、最终 live bytes 及 `HEAD:path` objects 完全一致。
提交前 staged `git diff --check` 通过，最终提交核实于 `2026-10-14T04:56:18.056739+00:00`。

最终六 SHA-256（相对上述工作树）：

```text
4cb58bfcb3e4cd91863cf341b211e309bc020929a70ccc6cc05be3de00341b36  harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
ff858b12446740123aabb22e30c7138892325c3a92bb6b916e92577c4a035c13  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
869753769edec062a0b732032093cadba2639239bd29730ae492633d9754b73a  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
3044324daa76ac425ee0025ef46b83dd395e0ecf11710c8b543936c8f60b596b  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
d7fbe83feccf30abca3a669cf6a279338ec1fc9c933822ea2fea99941568c4de  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
66de0825542f24d2c36c683a32ecdfb2fe6fb00c90600031cb2426e6e5ab3f17  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/CHECKSUMS-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

保留全部失败与中间回执：generate-1 因未建模真实 tuple 解包 rc 2，静态补齐后
下一次 generate PASS；full-1 因执行者漏更新旧 R4 标题白名单被中断，
`1 failed, 1100 passed in 29255.70s (8:07:35)`、rc 2、前后六 SHA 未变。
该断言改为严格绑定当前 `DELIVERY_ROUND` 后 generate-4 PASS，再从 analyzer 起完整
重跑 full-2 三命令。未删减测试、未运行子集或额外 import/probe；历史细节见 §4.39–4.41。
最终文档整理脚本一次 f-string 字面花括号导致 NameError，在任何文件写入前停止；
修正后仅写点名三份路由文档，没有改交付文件或重跑实验。

科学结果保持：194 available / 2 malformed，raw integer/scalar sentinel，split/unsplit 3/31；
classes 37（GR9 34），support 1…27，singleton 13，collision 42，reduction 0，final 82…88；
Layer A/B 均 0/16，G1/G2/G3/G4 为 16/0/0/16，containment 16/16，identical-to-GR9 0/16，
k=2 published/suppressed 16/0。17 inputs、93 objects / 12 generations / 3 siblings 不变；
P0–P8 runtime events、violation 0、hardcoded false。唯一 conclusion 不变：

> the preregistered len(trace.failure_paths_fired) exact-count refinement increases development separability but cannot realize any GR7 oracle-all-green cell under the frozen gates

未新增 primitive/组合/实验/模型/API/费用/hidden/样本外/promotion/freeze；未改 accepted/main
或旧交付、未 merge/tag/push。Knote 三份路由文档单独维护，不属于交付六文件，也未纳入提交。
本节是执行回执，不能替代 owner 的独立验收 verdict；现已停止等待验收。

### 4.43 GR16R5 正式验收 findings 与 verdict（2026-10-14）

**Blocking finding（P1 优先级）：setdefault 存储传播未闭合容器别名，P3 经原名取回的 trace 来源消失。**

- analyzer `pre_primitive_read_closure()` 第 5823–5826 行、validator 第 5990–5993 行，
  对真实容器的 `setdefault(key, protected_default)` 仅向调用处的 `receiver_node` 写入来源。
  analyzer 第 5685–5689 行 / validator 第 5852–5856 行的 Name assignment 只向该名字的
  来源集合做 union，没有共享容器身份或向其它可能别名回传写入的机制。
  `literal_origins` 能证明两个名字都是 map，不能证明两个来源集合随同一对象的写入一起更新。
- 在 analyzer `baseline_signature_index()` 第 8467 行 / validator `_baseline_signature_index()`
  第 8309 行的 `direct = ...` 前插入以下反例（仅内存构造，未执行）：

  ```python
  if verdict["trace"] is not None:
      _r5_box = {}
      _r5_alias = _r5_box
      _r5_alias.setdefault("payload", verdict["trace"])
      (lambda _r5_t=_r5_box["payload"]:
          _r5_t["".join(("failure_", "paths_fired"))])()
  ```

  按 Python 语义，两个名字指向同一字典，`setdefault` 将 trace 存入该对象，随后 lambda
  在 P3 读取本轮字段。按源码的数据流，空字典赋值与别名赋值均给出空 protected 来源；
  receiver origin 为 map、两个实参符合 shape，因此 method guard 不拒绝。存储只给
  `_r5_alias` 增加 `('map', 'payload')` 来源；`_r5_box` 仍为空。后续原名 subscript、lambda
  default 与 lambda body 都看不到来源。固定点重走也只从 box 向 alias 传播，不能反向补齐。
  未知 `str.join` key 不增加旧 whole-module 确定读点计数，baseline 不在旧 P1 闭包，也不调用
  P4 accessor/ledger。这是本合同 §2 已建模 method 的 alias/default/storage 来源闭包缺口，
  不涉及 captured proof→release 状态问题或另一 primitive。
- **独立纯 AST 对照：** 只改上述 baseline 顶层函数，analyzer 其余 777 个、validator
  其余 764 个顶层节点全部不变，内存 compile 通过。独立静态算法重算正常/变异树的 pre-proof
  digest，两者分别仍等于原 pin：analyzer
  `20399cae0ca7b84189b61f075346105c176c15739a3967176d3b0eb54cee11a7`；validator
  `c38c9bf5ca2540407b62ba90bc22f2f9fe422ed94c0c09d7f8adee6e66705696`。
  两个 baseline 都不在 pin 选中集合，不能依赖 pin mismatch 拒绝此例。未写变异文件、
  import/执行交付或变异实现、调用交付 predicate 作独立 probe；不声称 mutation 实测 rc 0、
  实测早读/放行或正常版科学污染。
- tests 第 266–269 行的 `stored_default` 只覆盖同一个变量名写后读；`receiver_alias` 是
  provider class 的别名，安全 `copy_alias` 是有初始来源的 copy，均未覆盖空容器经别名写后
  从原名读取。现有原样 method 反例覆盖及 1669 个通过回执不能证明这一分支闭合。
- **最小纠正：** 对已建模容器方法的 protected 存储保留共享对象到所有可能别名的来源，
  或在不能证明后续取回闭合时保守拒绝。补原名→别名与别名→原名、alias chain、等价 bound/
  unbound `setdefault` 存储/default 路径的双实现 predicate 与不变 pin 对照；每条黑盒仍先
  同一只读 spy control rc 0，再 mutation rc 2、单行净化、零 proof/product/rebuild-input
  reads/release/admitted rebuild，并补合法容器与安全字段对照及新检查自保护。检查其它已建模
  mutating method 的同一别名机制，不扩成通用 Python 沙箱。保留 GR15R8 parent、六路径、
  原覆盖和科学结果；本次仅登记最小纠正范围，不创建新任务书或执行修复。

**其它核查与证据归属：**

- 独立核实 HEAD `c92e00f6fa20f42315ee4d76bb0567349db63c72`、点名 branch/worktree、
  唯一 parent GR15R8、其 parent GR14、固定单行 message、相对 parent 恰一笔六 A / 零 M。
  两套源码的 21 个明确排除项均非 ancestor；tracked 与六路径 status 为空，HEAD tags 为零，
  posthoc 恰五项，CHECKSUMS 四条逐项匹配且不自列，两个精确 cache 不存在。
- 六件 live bytes 与 `commit:path` 相同，六 SHA 逐项等于 §4.42。full-2 三份 metadata 的
  argv/cwd/Python 3.12.2/env/UTC/PID/rc、开始/结束六 SHA 与 final-commit 绑定均独立核实。
  点名 log/rc 证实 analyzer / validator PASS、byte-identical，pytest 原摘要
  `1669 passed in 75475.68s (20:57:55)`、rc 0。这些是已有执行证据，不是本次独立运行。
  pause/resume metadata 的同一 pytest PID 71968 / group 70577、六 SHA 与
  `26565.135864` 秒暂停均匹配；不据此声称完整历史过程零越界。
- 独立 AST 比较 R4/R5：科学函数、P4 accessor、GR9 15 槽/drop-last 不变；两套旧顶层
  definitions 无删除。科学聚合只保留执行日志证据，本次未独立重建。
  **本次 analyzer、validator、完整 pytest 均未启动：** 已有确定源码阻断，停止目标验证；
  不是命令失败或 owner 豁免。未运行 subset/probe/profile、未联网、未使用 subagent，
  未修改实验工作树或创建实验提交。
- **本窗复核过程偏差（不归责于执行者）：** 初始误用
  `find .. -name AGENTS.md -print` 从 Knote 父目录递归查约束，违反精确路径限制；未返回正文，
  exit 0，不能据此声称未遍历哪些目录。此后仅检查明确祖先文件和点名路径。初始两次 git
  object 核查在 Knote cwd 报 bad object，随后改用点名实验工作树；一次 memory 查找用了错误
  文件名 glob、无匹配，随后按 registry 精确文件读取。一次只读核查脚本误把 CHECKSUMS 的
  相对 basename 当成仓库相对路径而停止，改按 posthoc 相对路径后全部核实。这些不是交付
  命令失败，未运行变异实现或读取 hidden/raw 正文。

`Redo`

GR16R5 不进入 accepted chain，accepted head 保持 GR15R8。原执行合同写入 verdict 并归档，
README 同步；无 ACTIVE 实验任务，等待 owner decision，不自动创建下一轮纠正任务或 GR17。

## 5. 当前状态 —— GR16R5 正式 Redo；等待 owner decision

GR16R5 执行回执保留在 §4.42，独立验收 findings、唯一 verdict 与最小纠正范围见 §4.43。
原执行合同已归档；accepted head 保持 GR15R8，无 ACTIVE 实验任务，不创建 GR17。

## 6. 下一窗方法与停止点

先读 §4.43。没有新执行授权；不得恢复 GR16R5 进程、重跑目标命令或将回执当 Accept。
只等待 owner 对最小纠正范围的决定；明确授权后才建立新的单一执行合同，从 GR15R8 起点
执行，拒绝交付不作为 parent。不得自动扩到相邻 repair、另一 primitive 或 GR17。

## 7. 当前权限与绝对禁止

owner 的 continue 已完成 GR16R5 同窗 redo 授权；原进程自然退出、唯一提交完成后，本窗
正式验收为 Redo。该执行授权已履行，现等待 owner decision，不继续实验或恢复旧授权。
旧交付、accepted/main、冻结件不改，不 merge/tag/push。

当前一律禁止：

- 接触 hidden（open/stat/hash/glob/预处理/内容引用）；人工打开或披露 rows/trace/answer、
  episode/gold/M1 正文；未登记 raw、sibling worktree、逐行身份或本字段列表元素；
- 以“诊断解释”为由读取 trigger、工具/参数、标签 ID 或重新归因；本轮只读已发布 list 的长度；
- 联网、安装依赖、subagent、模型/API、新费用/预算/approval、正式运行、G0、样本外、promotion/freeze；
- 修改 matcher/routing/component/suppression/blocks-pass/threshold、k7、词表、runner、protocol/gold/rubric；
- merge/tag/fetch/pull/push；旧远端备份授权不自动续期；
- 所有实验命令；归档 GR16R5 及更早合同不作为恢复执行依据。包括所有历史目标命令（含 GR15R8 与被退回 GR16 完整 pytest）、pytest 子集/整目录、
  单独计时/profile/spy probe、rescore/sweep/runner、重算 κ；
- 重算或保存前五项 primitive 的逐行值、frequency、signature 或 membership；读取/检验尚未授权的
  `len(suppressed_wrong_actions)`；把本轮与任一项组合、排名、选择或推荐；
- 搜索 bucket/cap/threshold、创建 selector/candidate/k8/新 matcher/新配置或改 target family；
- 把 §4.26 三条非阻断说明自动转为 repair，把当前授权扩到 GR17。

路径和残留检查仅限任务书点名的 ref/worktree、六路径、posthoc 五项与两个精确 cache 目录；查约束
仅用明确祖先文件。禁止递归 find/glob/scandir/walk worktree 或父目录，不进入/清理 hidden/raw/旧系统
临时目录。证据不足写 `underdetermined`，不得为解释结果自行扩权。

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
  GR11 `04ffebe8…`、GR12R3 `0ecd8d15…`、GR13R2 `9b8b1e2…`、GR14 `0120c5e1…` 与 GR15R8
  `7f3826f4…` 均已接受；不得重复执行。GR2A / GR2BR1 /
  GR2CR1 只是后续任务的钉死输入或锚，不是其 parent。GR6 `a76a2c6…` 同样未接受，只能按 GR6R1
  归档任务书解释其历史地位，不得作为 parent。GR12 `5e97492…` 也已验收为 `Redo`，不得作为 parent、
  accepted baseline 或可恢复执行光标。GR12R1 `a0bdb775…` 与 GR12R2 `e11a589…` 也已验收为 `Redo`，
  同样不得作为 parent 或 accepted evidence；GR12R3 已完成对它们的限定纠正，不得重开。
  GR13 `f206463d…` 与 GR13R1 `0bedadfa…` 也已验收为 `Redo`，不得作为 parent 或 accepted evidence；
  GR13R2 已完成对它们的限定纠正。不得恢复被退回的 GR2B / GR2C / GR3 / GR6 / GR12 / GR12R1 /
  GR12R2 / GR13 / GR13R1 / GR15 / GR15R1 / GR15R2 / GR15R3 / GR15R4 / GR15R5 / GR15R6 / GR15R7 或任何已完成执行光标；当前光标为 GR16R5 正式 Redo、等待 owner decision；GR16R2 / GR16R3 / GR16R4 / GR16R5 同样不得作为 parent。GR16R1 `0b3d497c…` 与 GR16 `9ba469ca…` 均已 Redo，不得作为 parent。
  GR9 的 exact-count closure、GR10 的 registry、GR11 的
  `trace.missing`、GR12R3 的 `trace.wrong_param_calls`、GR13R2 的 `trace.satisfied` 与 GR14 的
  `trace.invalid_tool_calls`、GR15R8 的 `trace.calls_made` 单 primitive 结论都不得扩成真实 selector、
  candidate、cohort execution、primitive 组合、promotion、freeze、G0、hidden 或其它 repair。GR16R1
  对既有 `len(trace.failure_paths_fired)` 的 pre-primitive 读取防线纠正已裁决为 Redo，不得借此恢复或组合前五项。GR15 `08b70f5…`、GR15R1 `160db5f…`、GR15R2 `c42faaef…` 与
  GR15R3 `4d6a419…`、GR15R4 `a7413a4…`、GR15R5 `87be12f…`、GR15R6 `64f173b…`、GR15R7 `fc281526…` 均已 `Redo`，不得作为 parent 或 accepted evidence。

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

**当前入口（3 份；GR16R5 正式 Redo，等待 owner decision，无 ACTIVE 实验任务）**

| 文件 | 作用 | 谁能改 |
|---|---|---|
| `EXECUTION_POLICY.md` | 长期顺序唯一权威，LOCKED | ⛔⛔ 只有 owner 明确同意才能改，Codex 与 Claude 一律禁止 |
| `CODEX-HANDOFF-STAGE0A-D2-REVIEW-2026-09-03.md` | 本文件：实验线唯一滚动入口；GR16R5 正式 Redo（§4.43），accepted head GR15R8，等待 owner decision | Codex |
| `HANDOFF-2026-09-04.md` | Knote 侧仍然生效的约束 + 还没做完的事。⛔ 已精简，⛔ 不含执行光标 | 每窗结束时补未完成项 |

GR16R5 原执行合同已裁决为 Redo，归档至 `archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16R5-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-METHOD-CALLABLE-ORIGIN-CLOSURE-CORRECTION-2026-10-13.md`；仅供历史审计，不恢复执行。

GR16R4 原执行合同已裁决为 Redo，归档至 `archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16R4-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-LOCAL-CALLABLE-BINDING-CLOSURE-CORRECTION-2026-10-10.md`；仅供历史审计。

GR16R3 原执行合同已裁决为 Redo，归档至 `archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16R3-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-CALLABLE-RETURN-CAPTURE-CLOSURE-CORRECTION-2026-10-10.md`；仅供历史审计。

GR16R2 原执行合同已裁决为 Redo，归档至 `archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16R2-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-CALLABLE-DEFAULT-CAPTURE-CLOSURE-CORRECTION-2026-10-07.md`；仅供历史审计。

重复验收任务书已撤销并归档至 `archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16R1-INDEPENDENT-ACCEPTANCE-2026-10-07.md`；仅留历史，不是开工入口。

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

**视频制作方案（设计交付件，不是产品 / 实验任务入口）**

`promo/video-2026-10-29/README.md`：ChatGPT 署名的 promo / tutorial 设计包入口；分镜、旁白、演示录屏说明、竞品来源与素材 CSV 均在同目录。状态以入口首屏为准，不选择或改变本文件的实验光标。

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
