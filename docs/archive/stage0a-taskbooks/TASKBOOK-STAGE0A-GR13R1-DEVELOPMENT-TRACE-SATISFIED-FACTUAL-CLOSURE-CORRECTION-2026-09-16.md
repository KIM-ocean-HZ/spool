# Claude Code 任务书 —— Stage 0-a development wave2 · GR13R1 factual-closure correction

> **状态：COMPLETE — 2026-09-16 Codex 验收 verdict `Redo`。**
>
> **验收提交：** `0bedadfa7d47d03528cae7864e00634c7511d8fc`（唯一 parent
> `0ecd8d15a6eed905394791a9292faf640fe4ca2b`）。拓扑、六产物、三类 factual correction、P0–P8、
> 75-object summary 与三条目标命令均闭合；但任务书 §6(5) 要求的“删掉任一 scorer-scope gate 也必须在
> 比较科学结论前 rc 2”没有兑现：名为 dropping-gate 的测试只把发布计数改为 `+1`，没有删除或架空真实
> `_need` enforcement，也没有 validator self-provenance gate，故不进入 accepted chain。
>
> **后续：** 唯一 ACTIVE 纠正任务书为
> `docs/TASKBOOK-STAGE0A-GR13R2-DEVELOPMENT-TRACE-SATISFIED-SCORER-SCOPE-GATE-DELETION-CLOSURE-2026-09-16.md`。
> 本任务书已归档，不得作为开工入口。
>
> **唯一交付：** 从 accepted GR12R3 重新交付同一 GR13，只纠正 GR13 的 canonical 事实陈述、
> ancestry 摘要、validator object-count 摘要，以及 `score_episode` 对 `trace.satisfied` 的静态
> scope 证书 / 真实负测闭包。科学 primitive、P0–P8、16 格 aggregate 与唯一结论不得改变。
>
> **验收来源：** GR13 commit `f206463d9cebc3081d2ad4bde189569d4aa3217f` 于
> 2026-09-16 被 Codex 退回。其拓扑、六产物、P0–P8、科学数值与三条目标命令均闭合；本任务只处理
> §1 的三类 blocking finding，不构成第四 primitive、组合、selector、candidate 或 GR14。
>
> **继续生效的只读任务书：**
> `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR13-DEVELOPMENT-TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-2026-09-15.md`
>
> 除本任务书明确替换的事实闭包与负测外，原 GR13 任务书的 scientific scope、inputs、objects、
> P0–P8、signature、anchors、canonical aggregate、结论闭集、禁止面、三条命令与停止条件全部继续生效。

## 1. Blocking findings 与完成定义

### 1.1 canonical conclusion detail 与 G2 aggregate 自相矛盾

GR13 canonical JSON `conclusion` 与 REPORT 第 18 行写：

```text
|N_ts(c)| 落在 76…82，全部越过 G2 的整数上限 78
```

但同一 canonical document 机械发布：final 分布为 `76×4 / 77×4 / 81×4 / 82×4`，Layer A
`G2_passing=8`、`G3_passing=0`。因此只有 8 格越过 G2；16 格共同失败的是 G3。两套实现复制了同一错误
模板，byte-identical validator 无法发现该语义矛盾。

完成条件：

1. §11 case-② 英文唯一结论与 rider 原样不变。
2. 结论 detail 必须由逐格 Layer A aggregate 机械生成，准确说明 `G2 pass/fail=8/8`、`G3 pass=0/16`；
   不得再写“全部越过 G2”。
3. analyzer 与 validator 必须分别证明 detail 中的 G2/G3 计数等于 16 格的机械计数，而不是共享常量。
4. 新增 source mutation / product forge：把 `8/8`、`0/16` 或“共同阻断为 G3”任一改错，control rc 0、
   mutation rc 2。

### 1.2 canonical lineage map 发布了错误 parent 关系

GR13 JSON 的 `commits.gr12r3_parent_gr10=2231eb66…` 是错误事实。GR12R3 的唯一 parent 是
GR11 `04ffebe8…`，GR11 的唯一 parent 才是 GR10 `2231eb66…`；详细 `ancestry_closure` 虽然正确，
不能抵消顶层 commits map 的错误陈述。

完成条件：

- commits map 必须按顺序发布 `parent_gr12r3=0ecd8d15…`、
  `gr12r3_parent_gr11=04ffebe8…`、`gr11_parent_gr10=2231eb66…`，再接原 GR10→GR9 链；
- analyzer / validator 都必须从 git object 的唯一 parent 机械核对这三条，不得只复制常量名值；
- 新增 mutation：交换、跳过或误标 GR11 任一关系必须 rc 2；
- REPORT ancestry 表继续保持正确，且 import / object 摘要不得漏掉 GR11。

### 1.3 scorer scope 的回执、REPORT 与 mutation closure 不一致

GR13 analyzer / validator 已有静态 gate，正确观察到 accepted `score_episode` 会在已经判定 pass 后的
`why` f-string 中读取 `tr["satisfied"]`，并检查五个 decision-local bindings 不含该读取。但：

- REPORT 没有披露这项与 GR11 / GR12R3 不同的事实；
- tests 没有任何 mutation 引用 `ast.JoinedStr`、`SCORE_DECISION_LOCALS`、`decision_bindings` 或
  `narrative_reads`，与回执所称“四个新 mutation tests 钉住”不符；
- validator stdout 写 `pinned objects=69`，但实际闭合 9 代 × 6 objects + 21 sibling objects = 75；
  求和漏了 `GR11_OBJECTS`。

完成条件：

1. 在既有 source-semantics block 内发布且在 REPORT 明示：accepted scorer 确实读取
   `trace.satisfied`；每个该读取都位于 `ast.JoinedStr` narrative；五个 decision-local bindings 中此类读取为 0。
   不得新增第四个 structure-gate evidence block。
2. analyzer 与 validator 各自从 pinned accepted source AST 推导这些值，不共享 cache / event / executable code。
3. 至少四个真实黑盒 source mutation 分别覆盖：读取逃出 `JoinedStr`；读取进入 `passed`；读取进入其余
   decision-local binding；移除或架空 narrative / decision binding closure。每条先 control rc 0，再 mutation rc 2。
4. validator 的 pinned-object 总数必须从完整 object tables 机械求和并输出 75；新增负测确保遗漏
   `GR11_OBJECTS` 或写回 69 时 rc 2。

## 2. 科学范围保持不变

- parent：accepted GR12R3 `0ecd8d15a6eed905394791a9292faf640fe4ca2b`
- projected baseline：accepted GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- 唯一 primitive：`len(trace.satisfied)`
- signature：`machine_observable_exact_count_shape_plus_trace_satisfied_v1`
- split `7/34`，本轮 classes 41、support `1…26`、singleton 14
- 16 格 collision 恒 36、reduction 恒 6、`|N_ts|=76…82`
- Layer A `0/16`，其中 G1/G2/G3/G4 passing=`16/8/0/16`
- Layer B `0/16`；`K_ts⊆K_exact=16/16`
- 唯一结论仍为原任务书 §11 case ②及其 rider

不得因本轮修复改变任何 primitive read、class membership、cell membership、gate、reason count、
suppression、boundary flag 或科学 aggregate。

## 3. Branch、worktree 与提交拓扑

- branch：`stage0a-wave2-trace-satisfied-exact-count-separability-factual-closure-correction-gr13r1`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-trace-satisfied-exact-count-separability-factual-closure-correction-gr13r1`
- 2026-09-16 Codex 已只读确认上述精确 branch 与 worktree path 均不存在；执行者创建前必须再次确认。
- 从 accepted GR12R3 新建；最终 commit 唯一 parent 必须为 GR12R3，相对 parent 恰一笔 commit。
- rejected GR13 `f206463…`、GR12 / GR12R1 / GR12R2、GR6、GR3 与 non-ancestry siblings 均不得进入 ancestry。
- 不 cherry-pick、merge 或读取 rejected sibling worktree；GR13 只可按 §5.1 的六个 full
  `f206463…:path` objects 作为纠正 scaffold。

commit message 固定为：

```text
posthoc(stage0a): correct trace-satisfied factual closure (GR13R1)
```

不得 tag、fetch、pull、push。

## 4. 唯一允许的 changed paths

相对 accepted GR12R3 仍须恰六个新增路径、0 个已有文件修改：

```text
harness/verify_trace_satisfied_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/analyze_trace_satisfied_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/test_trace_satisfied_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/CHECKSUMS-TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 目录仍须恰五项；CHECKSUMS 只登记 analyzer / test / JSON / REPORT 四项且不自列。

## 5. rejected GR13 六对象仅作纠正 scaffold

```text
4186b3e28d06acd44b4985073e63d90f5a3f1279ed3e3cf4a196b6542f956395  harness/verify_trace_satisfied_exact_count_separability_envelope_wave2.py
da8274708fbc8efb8ef1a89c3b3b49bf04699ddf20ac1ef6d009ccea806cfa79  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/analyze_trace_satisfied_exact_count_separability_envelope_wave2.py
0494fabfd7f0babb6905798231fd0161de37a9de7c61101989bf04dd5122ec85  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/test_trace_satisfied_exact_count_separability_envelope_wave2.py
f77d23d9a09a85f90e43da875b96030f654041d6f12e709eb21be754959172f8  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
e1bcfc9550b198e7bb8ce99b5fe9e24bc93620f4d119030aa9bf791d5f52cdd9  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
513aa350cd2f6e3ae58788af3990d440d2067ff66c891619d385eae194393f9d  posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/CHECKSUMS-TRACE-SATISFIED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

执行者必须从 full `f206463d9cebc3081d2ad4bde189569d4aa3217f:path` 自行复核；不一致即停止。
不得解析 rejected GR13 JSON / REPORT 取得 expected science；它们只可作 raw-byte SHA closure。

## 6. Independent validator 与负测

原 GR13 全部正测、mutation tests、P0–P8 runtime ledger、whole-source AST closure 与 product forge tests
继续保留。除 §1 明列的新负测外，还必须新增：

1. canonical `conclusion` 的 prose detail 与 `layer_aggregates.layer_a.G2_passing/G3_passing` 机械一致；
2. commits map 与 git 的三段 parent chain 机械一致；
3. REPORT 普通事实行必须含 scorer narrative-only disclosure，并与 source-semantics block 一致；
4. validator summary object count 必须等于 object tables 求和，不能写死 75；
5. 删除 GR11 object table、把 GR11 跳接为 GR10、恢复“全部 G2 失败”、或删掉任一 scorer-scope gate，
   都必须在比较科学结论前 rc 2。

每条 mutation 仍须先跑 byte-identical control rc 0，再 mutation + re-sign 后 rc 2；stderr 单行净化，
不得回显路径、primitive value、signature、identity、正文或 traceback。validator 不得 import analyzer / tests /
previous modules，不得把 delivered JSON / REPORT 当 expected document。

## 7. 目标命令

只运行：

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/test_trace_satisfied_exact_count_separability_envelope_wave2.py -q -p no:cacheprovider
PYTHONDONTWRITEBYTECODE=1 python3 -B posthoc/stage0a-development-wave2-trace-satisfied-exact-count-separability-envelope/analyze_trace_satisfied_exact_count_separability_envelope_wave2.py --check-existing
PYTHONDONTWRITEBYTECODE=1 python3 -B harness/verify_trace_satisfied_exact_count_separability_envelope_wave2.py
```

默认 Python 无 pytest 时可用已有 `/opt/anaconda3/bin/python3`；禁止联网安装。不得运行 rejected GR13、
GR12R3、GR11 或更早任务的目标命令，不得运行 `pytest harness/` 整目录。

## 8. 绝对禁止与停止条件

原 GR13 §2.3、§3.3、§12 与 §15 的全部禁止继续生效：不读 hidden / 正文 / list elements / 未登记 raw，
不读其它 primitive runtime value，不试第四 primitive、组合、bucket、threshold、selector、candidate、
configuration selection、dataset expansion 或样本外；不调用模型/API、不产生费用；不修改 accepted objects、
冻结件、`EXECUTION_POLICY.md` 或 Knote handoff；不 merge/tag/fetch/pull/push；不调用 subagent；不自动创建 GR14。

回执必须给出拓扑、六 SHA、五项 / 四项闭包、三类 factual correction、至少四条 scorer-scope mutation 的
control rc 0 / mutation rc 2、完整 75-object count、原 GR13 全部 read/order/science 闭包、三条目标命令，
以及测试后 HEAD / status / tag / 六 SHA 无漂移、无 `__pycache__`。

唯一 commit 完成后立即停止并返回 owner。
