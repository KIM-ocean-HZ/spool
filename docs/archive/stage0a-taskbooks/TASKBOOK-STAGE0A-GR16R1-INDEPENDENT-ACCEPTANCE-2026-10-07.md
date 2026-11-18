# 验收任务书 —— Stage 0-a · GR16R1 independent acceptance

> **状态：SUPERSEDED — 重复验收任务书，已撤销并归档；未执行，不代表验收完成。**
>
> owner 要求提供验收提示词并归档不必要文件。本文件不再作为开工或强制重跑依据；以下正文仅保留历史。
> 当前入口为 `docs/CODEX-HANDOFF-STAGE0A-D2-REVIEW-2026-09-03.md`，待验合同为
> `docs/TASKBOOK-STAGE0A-GR16R1-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-PRE-PRIMITIVE-READ-CLOSURE-CORRECTION-2026-10-01.md`。
>
> **唯一任务：** 独立验收 GR16R1 `0b3d497cdc87286ca3153a4a939b58fabdaeb960`，
> 判断 pre-primitive unresolved-read closure 是否兑现原纠正合同，给出唯一 verdict。
>
> **授权来源：** owner 于 2026-10-07 要求“下发下一任务”，结合 canonical handoff §1 的先验收后续派顺序。
> 原执行已完成，尚无独立验收 verdict；本任务不预设 Accept，不创建 GR17，不开始下一 primitive。
>
> **本次下发只维护文档，未执行本验收任务。** accepted head 暂仍是 GR15R8；development-only、零费用。

## 1. 阅读顺序与依据

1. `docs/EXECUTION_POLICY.md`，只读，不修改。
2. `docs/CODEX-HANDOFF-STAGE0A-D2-REVIEW-2026-09-03.md`，尤其 §4.26–4.28。
3. 本任务书。
4. `docs/TASKBOOK-STAGE0A-GR16R1-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-PRE-PRIMITIVE-READ-CLOSURE-CORRECTION-2026-10-01.md`。
5. `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-2026-09-29.md`。

原 GR16 与 GR16R1 的科学、输入、隐私、P0–P8、负测、17 项 ancestry 排除及六路径合同继续作为
验收标准。旧执行入口已被本任务取代；不再创建原工作树、重做构建或提交修复。
原 GR16R1 合同在 verdict 前保留根目录，验收完成后与本任务书一起归档。

## 2. 钉死验收对象

- 实验仓：`/Users/hzjin/Desktop/spool-research`。
- 只读交付工作树：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-failure-paths-fired-pre-primitive-read-closure-correction-gr16r1`。
- branch：`stage0a-wave2-trace-failure-paths-fired-pre-primitive-read-closure-correction-gr16r1`。
- HEAD：`0b3d497cdc87286ca3153a4a939b58fabdaeb960`。
- 唯一 parent：accepted GR15R8 `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`。
- parent 的唯一 parent：GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`。
- scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`。
- 相对 parent 恰一笔 commit、六 A / 零 M；固定一行 message，无正文或 trailer：

```text
posthoc(stage0a): close pre-primitive unresolved reads (GR16R1)
```

2026-10-07 下发时已重核 HEAD、branch、唯一 parent、六 A、clean status、HEAD 无 tag；下列
六 SHA 均从完整 `commit:path` 重算并与工作树 bytes 相等。验收开始和结束均须复核，漂移即停止。

```text
951bdce512cf0d76d178f96ebe1f3221c1aa684d51ee9b406b73023e8ca6f0de  harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
22a979902437d5206b76847e803b8436f97b4c459d8d6c64f005198e9222366b  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
e0e11b1aac0f3ad7717e2ca5a70218c1134bd04de4459d12886c604a3cb9e60b  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
8df89fc3bc3d66c2861faaadcf36cfff00c03b25607291d5ee1d47b7a089fd8a  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
c225a1ccd941db82c3e6fa606dcb09a2973ca5c7006fe0f7f3f5e0972a130b84  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
63abdd2a078ec646dee5933a38b72d5d1dec8b2a2c98f3c75ff6e89032c7c642  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/CHECKSUMS-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 恰五项；CHECKSUMS 恰四项且不自列。accepted input inventory 仍为 93 objects / 12 generations /
3 siblings；rejected GR16 六对象仅作原合同限定的 raw-byte provenance/scaffold，分列且不计入 accepted
数量。GR16R1 待验收的状态不能写成已被接受；原 17 项排除不得遗漏。

## 3. 先审源码，再运行目标验证

两套实现分别追真实控制流；不能仅依据同名函数、发布计数、相同结果或测试全绿判断。

1. 从真实驱动入口枚举 P0–P3 到唯一 `ledger.open(PHASE_PRIMITIVE)` 前的分析路径，覆盖 P3 baseline、
   helper / callable alias；检查直接、method、computed、dynamic 读取及未知 key 的保守拒绝。
   钉住 scorer 的既有生成行为与分析读取须分开，不允许按 helper 名字豁免。
2. 针对原反例，在两套 P3 baseline 中、既有 `direct = machine_observable_exact_count_shape_v1(...)`
   前考察下列读取。纯内存 AST 对照须确认它由新闭包消费；不能只证明新 pin 变了：

   ```python
   if verdict["trace"] is not None:
       verdict["trace"]["".join(("failure_", "paths_fired"))]
   ```

3. 确认新 gate 真正执行，拒绝发生在 product/rebuild-input opens、release、被放行 rebuild 之前。
   检查 gate 删除、恒真化、跳过、移晚；审查负测 mutation 锚确实命中，同一只读 spy 的 control
   能看到正常活动、mutation rc 2 且零读取/零 release/零 admitted rebuild，stderr 为净化单行。
   按实际拒绝层报告 proof acceptance；不把 AST 推论冒充执行过的 mutation。
4. 检查合法动态索引的正常对照；保留 R4–R8 的 21/22 controls、8 probes、真实完成链、startup/prove
   双 pin、选择性双跑范围、comprehension、source-semantics/scorer-scope 保护。pin 不得扩大为全阶段
   pin，也不得把 captured proof→release 相邻问题扩成此次 repair。
5. 核 P4 唯一 direct literal accessor、exact list、同一容器一次 built-in len、194 available / 2 malformed、
   raw integer/scalar sentinel、GR9 15 槽及 drop-last。五面身份均为 GR16R1 correction / 科学问题 GR16。
6. 从源码审查科学不变项及独立重建，不从旧 JSON/REPORT 取 expected science。原纠正合同 §7 的
   aggregates、唯一 conclusion sentence、隐私聚合和 rider 全部保持；不能借结果选择另一 primitive。

已知执行回执称新增 70 条测试（30 条进程内/AST，40 条黑盒），总计 1357；它们是待核声明，
不得以相符计数替代上述审查。独立纯 AST 检查只能在内存中进行；不 import 实现跑额外 probe。

## 4. 仅三条完整目标命令

静态审查无阻断后，在上述交付工作树依次运行；验收不允许 `--generate` 或修改六件交付：

```bash
PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 \
  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 \
  harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py

PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 -m pytest \
  posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py \
  -q -p no:cacheprovider
```

固定 Python 3.12.2。完整 pytest 上次执行耗时 `45508.18s (12:38:28)`，只是排期参考，不能保证本次
耗时。当前没有独立重跑豁免；不得把历史 GR15R8 的豁免套到 GR16R1，也不得因路由窗口读过日志
就标为独立复跑。若 owner 随后明确豁免，记录原话与证据限制，不安排后台补跑。

运行时保留原始 summary、耗时、rc；低频监控，在完成、失败或阶段切换时更新。发现确定阻断及时
停止长测试，保留中断状态；中断 rc 2 与 mutation 正确拒绝的 rc 2 必须分开。失败后不在验收分支修复。

只另允许精确 git/SHA/路径检查及不落 cache 的内存静态分析；禁止 pytest 子集、probe/profile/spy
单跑、历史命令、全目录测试、pyflakes/py_compile。不得遍历实验工作树或父目录。

## 5. 证据归属与过程记录

执行阶段的最终日志在本次下发时只读确认：完整 pytest `1357 passed in 45508.18s (12:38:28)`、rc 0；
analyzer `--check-existing` PASS、rc 0；validator canonical JSON/REPORT byte-identical、PASS、rc 0。
这是执行证据，独立验收尚未运行；原始命令输出优先于本段摘要。

执行过程还披露过主动停止、会话丢失、owner 暂停，以及一轮旧 GR16 标题锚未迁移造成的
`3 failed, 812 passed` 中止；随后五处标题锚改为 GR16R1，重生成并完整重跑三命令取得上述最终结果。
验收须区分最终固定交付与这些过程记录；不得把早先失败隐去，也不把它们直接当成最终 commit 的失败。
完整过程偏差见 canonical handoff §4.28。

## 6. 交付、文档与停止点

输出先 findings（文件/行号、证据类型、影响与最小纠正范围），再给唯一 verdict：
`Accept`、`Accept with non-blocking note`、`Redo` 或 `Blocked`。

- 记录独立静态证据、独立运行结果、执行回执三者的区别；附拓扑、六 SHA、排除项、目录/CHECKSUMS、
  status/tag、两个精确 cache 的复核，科学不漂移及不能证明的部分。
- 将 verdict 写入 canonical handoff 和原执行任务书；验收结束后将两个任务书归档，同步 README。
- Accept 时才将 GR16R1 加入 accepted chain；返回 owner decision，下一科学任务另行路由。
- Redo 时仅列同一读取合同内最小纠正，不自动修代码或创建纠正工作树；证据不足则说明具体缺口。

不创建实验 branch/worktree，不改交付或 accepted/main，不 commit/merge/tag/fetch/pull/push。
不联网、安装、subagent、模型/API、费用/预算/approval、第二 primitive、组合/排名/selector/candidate、
hidden、样本外、正式运行、promotion/freeze；不扩修 captured 相邻观察。人工不打开 rows/trace/answer、
episode/gold/M1 正文，原合同点名 git objects 与 development 闭包仅按机械验证范围使用。

完成验收回执和文档更新即停止；本任务不授权 GR17 或 `len(suppressed_wrong_actions)` 实验。
