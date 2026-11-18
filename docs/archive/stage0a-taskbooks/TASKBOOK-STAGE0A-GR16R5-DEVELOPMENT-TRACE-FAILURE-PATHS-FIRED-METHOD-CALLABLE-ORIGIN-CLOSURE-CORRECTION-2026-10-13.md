# 执行任务书 —— Stage 0-a GR16R5 method-callable origin closure correction

> **状态：COMPLETE（执行交付）；独立验收 verdict：Redo — 2026-10-14。留档不开工。**
>
> 本窗直接执行 handoff §4.38 的最小纠正、完整三命令及唯一提交；仅此轮覆盖 handoff §1(7)。
> 科学问题仍为 GR16；accepted head 保持 GR15R8，GR16R4 已 Redo。
> 唯一提交及完整验证回执保留；正式验收发现 setdefault 存储的容器别名来源闭包缺口，详见 canonical handoff §4.43。
> 本合同已归档，不作为恢复执行依据；accepted chain 不动，无后续任务书，等待 owner decision，不创建 GR17。

## 1. 继承合同与边界

继承 `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16R4-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-LOCAL-CALLABLE-BINDING-CLOSURE-CORRECTION-2026-10-10.md` 及其 R3/R2/R1/GR16 合同。
17 development inputs、93 objects / 12 generations / 3 siblings、P0–P8、R4–R8 controls/probes、
真实完成链/startup-prove 双 pin、原 1547 cases 等价覆盖、科学与隐私边界不变。
只替代本轮身份、路径、当前纠正、rejected provenance 和明确冲突的角色限制。

禁止人工打开 rows/trace/answer、episode/gold/M1 正文、逐行身份或字段元素；
hidden 禁止 open/stat/hash/glob/预处理/引用。只允许完整命令机械重建既有 development 闭包。
不联网/安装/subagent/模型/API/费用，不改旧交付或 accepted/main/冻结件，不 merge/tag/fetch/pull/push。

## 2. 最小纠正与验收要求

以 handoff §4.38 的 P3 原样 local staticmethod copy → trace → lambda default → 未知 key 反例为依据。
method 特例必须有 receiver/callable 来源和参数形态的静态依据；未知 Attribute callable 不能
仅凭属性名套用容器方法语义、丢弃 args/kwargs。保留受保护来源或保守拒绝不能证明安全的路径。
同组 values/items/keys/copy 及其它已建模方法的等价来源路径一并检查；不扩成通用 Python 沙箱。
保留真实内建、真实容器方法、安全返回值、合法 baseline 动态索引及原所有覆盖。

新增覆盖须包含：
- 原样及等价 method 名、alias/keyword/嵌套变体，两套 predicate 真拒绝；
  baseline-only mutation 的 pre-proof pin 不变。
- 真实容器方法和安全 scalar/字段返回对照。
- 每条黑盒先同一只读 spy control rc 0，再 mutation rc 2、单行净化 stderr；
  零 proof、product/rebuild-input reads、release/admitted rebuild。
- 新 receiver/shape/保守拒绝检查删除、恒假/跳过的自保护。
只改检查、等价测试、身份/provenance/必要 pins；不改科学函数、P4 accessor、GR9 15 槽/drop-last，
不扩修 captured proof→release 相邻状态问题。

## 3. 起点、预检与精确交付

- 唯一 parent：GR15R8 `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`；其 parent 为 GR14。
- scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`。
- branch：`stage0a-wave2-trace-failure-paths-fired-method-callable-origin-closure-correction-gr16r5`。
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-failure-paths-fired-method-callable-origin-closure-correction-gr16r5`。
- 开工前已确认精确 local/origin ref、登记 worktree/目录、本任务书和 parent 六路径不存在。
- 从 GR15R8 新建；不 checkout/cherry-pick/merge rejected commit。最终恰一笔、六 A / 零 M。
- GR16R4 加原二十项，共 21 个明确排除项不得进入 ancestry。

固定单行 message，无正文/trailer：

```text
posthoc(stage0a): close method callable origin reads (GR16R5)
```

唯一 changed paths：

```text
harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/CHECKSUMS-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 恰五项，CHECKSUMS 恰四条（analyzer/tests/JSON/REPORT），不自列、不增第七件。
五面身份统一 GR16R5 correction，科学问题 GR16，parent GR15R8。

## 4. Scaffold 与科学不变项

仅按 full `f00a720820f6379277a4c61aa2c4d9a56034dc73:path` 六 objects 核 SHA 后复制；
不读 sibling worktree、不 import 前序实现、不解析旧产品作 expected science。
六 SHA 以 canonical handoff §4.37 为钉死依据，开工已逐项匹配。
GR16/R1/R2/R3 历史 raw-byte provenance 保留，R4 分列且不计 accepted generation。

科学重建须保持 194 available / 2 malformed、raw integer/scalar sentinel、split/unsplit 3/31、
classes 37、support 1…27、singleton 13、collision 42、reduction 0、final 82…88；
Layer A/B 0/16，G1/G2/G3/G4 16/0/0/16、containment 16/16、identical-to-GR9 0/16、
k=2 发布/抑制 16/0。evaluation-order 七键与非 literal bool、唯一 conclusion、REPORT rider、
历史已检验 5→6 / 未检验 2→1 不变。漂移即停，不改算法迎合数值。

## 5. 仅完整三命令与构建许可

固定 Python 3.12.2、禁 pyc：

```bash
PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/analyze_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py --check-existing
PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 harness/verify_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py
PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 -m pytest posthoc/stage0a-development-wave2-trace-failure-paths-fired-exact-count-separability-envelope/test_trace_failure_paths_fired_exact_count_separability_envelope_wave2.py -q -p no:cacheprovider
```

另允许同一 analyzer --generate、内存 parse/compile、精确 git/SHA/路径检查、仓外静态 AST 构造与 pin 计算。
不额外 import 交付实现作独立 probe；禁止 pytest 子集/整目录、单独 profile/spy/probe、历史命令。
修复/重生成后完整重跑三命令，保存失败和最终完整证据。
仓外 `/tmp/gr16r5-construction/` 只存本轮静态构造/pin 脚本、验证 manager 及点名日志：
generate-N.log/.rc；analyzer-full-N、validator-full-N、pytest-full-N 的 .log/.rc/.metadata.json。
metadata 记录 argv/cwd/Python/UTC/PIDs/前后六 SHA 与最终 commit 绑定，不写入科学产物。
仓外 monitor.py 只读上述日志/rc/metadata 与点名 PID；finalize.py 仅在完整三命令 rc 0、
1669 passed、六 SHA 和交付边界全部匹配后执行本合同唯一提交，保存 final-receipt.json。
两者属于验证/提交编排，不额外运行交付实现或实验命令；finalize.py 已在最终全量通过后
完成唯一提交与最终核对，见 §9；不再次提交或 amend。
2026-10-13 05:22:41 UTC 为已有 pytest PID 63373 加临时 `/usr/bin/caffeinate -i -w 63373`
（PID 76584），仅防空闲休眠并随 pytest 退出；不改电源配置、测试 argv/env 或交付文件。
编排证据 `pytest-full-1-awake.metadata.json` 留在同一仓外目录。
full-1 因旧标题白名单漏更新而失败后已中断（1 failed / 1100 passed，rc 2，六 SHA 未变）；
将该检查绑定当前 DELIVERY_ROUND 后 generate-4 PASS，按同一合同完整重跑 full-2。
full-2 manager PID 70577 / 临时 awake PID 70578，证据 full-2-awake.metadata.json；
最终只认 full-2 三命令完整终态及对应 SHA/commit 绑定，失败记录保留。
不重复启动已有运行；阶段转换/失败/完成报告须明确，长验证期间按窗口要求提供简短在途状态。

## 6. 禁令与停止点

路径检查只限点名 ref/worktree、六路径、posthoc 五项和两个精确 cache；
约束只读明确祖先文件。禁止递归 find/glob/scandir/walk worktree/父目录，不进入/清理 hidden/raw/旧临时目录。
保留 Knote 既有未提交改动，仅维护 canonical handoff、本任务书和 README 路由。
不授权新 primitive/组合/排名/selector/candidate/k8、bucket/threshold 搜索、样本外/G0/hidden、
预算/approval/正式运行/promotion/freeze、相邻 repair 或 GR17。
唯一提交后立即停止，完整回执标为 COMPLETE（执行交付）待 owner 验收，accepted chain 不动。


## 7. 暂停现场与恢复门槛

2026-10-13 10:58:09 UTC 暂停 full-2 group 70577；manager 70577 / pytest 71968 /
child 28157 均为 T，awake 70578 / monitor 70580 已结束。581 个通过标记、无失败标记；
无最终 pytest summary/rc、无提交。暂停六 SHA 与 full-2 起点一致；仓外 pause-full-2.metadata.json
保存现场。accepted chain 保持 GR15R8。
只在 owner 明确恢复后核对原 PIDs/PGID、六 SHA、状态，再 SIGCONT 原进程；不重启另一组测试。
若原进程已丢失，报告并等指令。暂停状态不等于 COMPLETE 或验收通过。

## 8. Owner 明确恢复

2026-10-13 18:20:54 UTC 核对原 PIDs/PGID、T 状态、亲子关系及六 SHA 后，已 SIGCONT
原 group 70577，继续同一个 pytest 71968，不重启。恢复时 581 个通过标记、无失败标记；
暂停 26565.135864 秒，resume-full-2.metadata.json 保存证据。临时 awake PID 49957
观察原 manager，退出即结束。仅恢复原合同范围，完整通过及唯一提交后停等 owner 验收。

## 9. 最终执行交付（2026-10-14；待 owner 验收）

commit `c92e00f6fa20f42315ee4d76bb0567349db63c72`；唯一 parent GR15R8 `7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`。
message：`posthoc(stage0a): close method callable origin reads (GR16R5)`。恰一笔、六 A / 零 M，21 排除项非 ancestor，HEAD 无 tag；
tracked/六路径 clean，posthoc 五项、CHECKSUMS 四条，两精确 cache 不存在。

full-2 analyzer / validator 均 PASS / rc 0，产物 byte-identical；完整 pytest
**`1669 passed in 75475.68s (20:57:55)`，rc 0**，自然退出 UTC `2026-10-14T04:53:46.299673+00:00`。
原始耗时含 owner 暂停 26565.135864 秒（7:22:45），扣除该暂停约 13:35:10。
同一原进程恢复后完成，未重启；三命令各自前后六 SHA 与最终提交 objects 一致。
原 1547 等价覆盖及新增 122 cases 全部通过；§4 科学结果和唯一 conclusion 不变。

完整时间/PID/六 SHA/失败历史与边界见 canonical handoff §4.42；仓外证据为
`/tmp/gr16r5-construction/{analyzer,validator,pytest}-full-2` 的 `.log/.rc/.metadata.json`
及同目录 `final-receipt.json`、pause/resume metadata。
此前 generate-1 与 full-1 失败记录保留；最终只认完整 full-2 三命令终态。

本合同执行授权已履行，所有验证进程已结束。三份 Knote 路由文档单独维护，未纳入交付。
停止等 owner 独立验收，不自行 Accept；accepted chain 仍 GR15R8，无 GR17、无 ACTIVE 实验任务。

## 10. 独立验收裁决（2026-10-14）

`Redo`。findings、纯 AST 对照、证据归属与最小纠正范围统一记录在
`docs/CODEX-HANDOFF-STAGE0A-D2-REVIEW-2026-09-03.md` §4.43。
执行回执仍成立，但不能代替容器别名写入/default 取回的实现闭包；本次没有重跑三命令。
GR16R5 不进入 accepted chain，accepted head 保持 GR15R8。本合同归档且不恢复执行；
无后续任务书、无 ACTIVE 实验任务，等待 owner decision，不创建 GR17。
