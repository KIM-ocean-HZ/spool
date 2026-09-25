# Claude Code 任务书 —— Stage 0-a development wave2 · D2R1 诊断器材返工

> **状态：COMPLETED — commit `6a53404a4c20edc48ca9167a622cab5a8de8e1b0` 已验收，verdict `Redo`；后续见 D2R2 任务书。**
>
> **执行者：Claude Code。** 本任务只返工 D2 诊断器材，不修实验红闸。
>
> **验收者：新的 Codex 独立验收窗口。** Claude 回执只是待核声明。
>
> **原任务书：** `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-D2-DEVELOPMENT-DIAGNOSTIC-2026-09-03.md`

## 1. 任务性质与唯一目标

D2 提交 `3068b31df80de74be43e0c672270f2f78df9916b` 的提交拓扑、六文件闭包、固定输入、核心计数和三条目标验证均已复核通过，但 Codex 实现级审查判为 `Redo`。D2R1 必须从已接受的 D1 重新建立干净分支，交付一份可独立接受的六文件 D2 替代件，并一次闭合下面四类阻断：

1. 删除超出授权字段范围的全量身份值读取；
2. 把 G2 非互斥 incidence 的事实、推断与不可确定项重新分层，删除无证据的因果归因；
3. 让 `--generate` 在任何正式写入前完成目录预检，并在所有失败路径上保持零正式产物残留；
4. 让独立 validator 真正逐格重建并核对 case 结构与 G2/G3 incidence，且所有异常净化失败。

原 D2 任务书除被本任务书明确替换的部分外继续全部有效。两份任务书冲突时，以本任务书为准。

本任务不是 gate repair，不追求让 G1–G4 变绿，不提出 matcher、routing、threshold、rubric 或 gold 修改。

## 2. 起点与隔离

已接受的 parent：

- D1：`8b2bd021ece2be1ac6a17bf47a68e4f0f64337a8`
- D1 唯一 parent：`4dcb70e79c1c7b1981001e69535a1a210f5e667b`（M1）

新建：

- branch：`stage0a-wave2-red-gates-diagnostic-d2r1`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-red-gates-diagnostic-d2r1`
- 唯一 parent：`8b2bd021ece2be1ac6a17bf47a68e4f0f64337a8`

若 branch 或 worktree 已存在，立即停止并回报，不删除、不覆盖、不猜测可复用性。

允许只读参考 D2 commit 的恰六个新增文件；不得 cherry-pick D2 commit，不得把未接受的 D2 放进 D2R1 ancestry。不得修改 `main`，不得 merge、tag、push、fetch、pull。

## 3. Changed paths —— 仍须恰为六个新增文件

相对 D1，最终 diff 必须恰为：

```text
A  posthoc/stage0a-development-wave2-red-gates-diagnostic/diagnose_red_gates_wave2.py
A  posthoc/stage0a-development-wave2-red-gates-diagnostic/test_red_gates_diagnostic_wave2.py
A  posthoc/stage0a-development-wave2-red-gates-diagnostic/RED-GATES-DIAGNOSTIC-stage0a-development-wave2.json
A  posthoc/stage0a-development-wave2-red-gates-diagnostic/RED-GATES-DIAGNOSTIC-REPORT-stage0a-development-wave2.md
A  posthoc/stage0a-development-wave2-red-gates-diagnostic/CHECKSUMS-RED-GATES-DIAGNOSTIC-stage0a-development-wave2.sha256
A  harness/verify_red_gates_diagnostic_wave2.py
```

只可显式 `git add` 这六条路径，禁止 `git add -A`。不得新增 README、缓存、临时文件、点文件或第二套目录。

## 4. 阻断一 —— 收紧字段读取范围

D2 的 generator 与 validator 为做泄漏值扫描，遍历了 196 行的 `answer_sha256`，并遍历了全部 gold 行的 `run_id`、`model`、`why`。原任务只允许：

- 全量连接读取 G1–G4 与 G2/G3 聚合必需字段；
- 只对机械选出的 4+1 目标行读取列明的诊断字段；
- `why` 最多只可用于五个目标行的一句释义，本任务实际不需要它时应完全不读。

D2R1 必须做到：

- generator、validator、tests 均不得通过 `get`、下标、推导式或其他方式访问 `answer_sha256`、全量 `run_id`、全量 `model`、全量 `why`；
- `model` 不得用于任何统计；`arm` 仍只可用于 G3 聚合；
- 目标行诊断若不需要 `why`，不得读取；不得为了泄漏扫描扩大输入字段访问；
- 输出安全采用封闭构造、禁止键递归扫描、允许字段校验及静态访问面测试来证明；不得靠读取全部敏感值再逐值搜索；
- 测试不得自行越过同一字段边界来“证明”生产代码没泄漏。

允许继续使用 `blind_id` 做 196 行 join、集合推导和内部确定性排序，使用 `episode_id` 做逐格连接一致性校验；两者均不得输出。

新增静态测试：AST 级证明 generator 与 validator 不访问禁止的非必要输入字段；测试源码本身也不得读取这些字段。

## 5. 阻断二 —— 删除 G2 的无证据因果归因

以下 D2 结论不能保留：

- 把“送审量主要由答了一半撑起”列为 `established`；
- 声称 k1 是六个口子中“覆盖面最宽”；
- 声称 k1 把送审率抬过阈值。

原因：incidence 跨族非互斥，且 `review_reason`、`opt_hit`、harm-capable、R2 和 unknown wrong-action 的逐行触发信息并未导出。仅凭 51 行存在 required-component hit，无法得到各口子的排他贡献、排序或移除 k1 的反事实结果。

D2R1 的准确口径：

- `established`：只陈述 82/196、outcome/partial-credit/component/mandatory incidence 的精确计数；可陈述“在这 82 行中，51 行具备 required-component hit，因此按冻结规则它们满足 k1 条件”；
- `supported_inference`：只允许把 51/82 解释为 k1 与送审集合存在广泛、可证的重叠，不得写边际贡献、主要来源、最大口子或阈值反事实；
- `underdetermined_from_authorized_derived_evidence`：明确列出各口子真实触发集合、重叠、排他贡献、最大来源及移除任一口子后的送审率均不可确定。

JSON、报告和逐 case summary 都必须维持事实 / supported inference / underdetermined 的分层。非互斥 incidence 不得在任何位置被写成因果分解。

## 6. 阻断三 —— `--generate` 必须先验闭包且事务失败零残留

D2 把最终 `dir_closure()` 放在三份正式产物发布之后。若一个新目录只有 generator、test 和 `.unexpected`，它会先写出 JSON、REPORT、CHECKSUMS，再因额外文件失败，且正式产物不会回滚。

D2R1 必须：

1. 在构建或写入任何正式产物前，先检查 pre-generate 目录恰含 generator 与 test 两项；普通额外文件、`.unexpected`、遗留 `.partial`、正式产物或任意其他目录项都立即失败；
2. preflight 失败时，目录字节与 mtime 集合不变，零 temp、零正式产物；
3. 三份 blob 全部在内存验证完成后才开始 staging；临时文件不得覆盖既有条目；
4. staging、任一 publish、最终闭包或其他异常失败时，清除本次创建的 temp 与正式产物，恢复到写入前两项闭包；
5. 成功后目录恰为五项，三份正式产物 byte-identical、CHECKSUMS 恰四条。

最低新增测试：

- fresh pre-generate 副本 + `README.md`；调用 `--generate` 非零且零产物、零写入；
- fresh pre-generate 副本 + `.unexpected`；同上；
- fresh pre-generate 副本 + 遗留 `.partial`；同上；
- monkeypatch 第二次 `os.replace` 或等价发布步骤失败；断言三份正式产物与所有 temp 均不存在；
- clean fresh pre-generate 副本成功一次，第二次拒绝覆盖。

测试只能在临时副本执行，不得删除或改写真实 D1/D2 产物。

## 7. 阻断四 —— 独立 validator 的重建与净化失败

validator 不得 import generator，也不得读取 generator 的常量/helper。除此之外还必须独立完成：

- 拒绝 duplicate `blind_id`、195/197 行、集合差、episode mismatch、非 exact bool/int/float；
- 由闸门定义机械得到排序后的 4+1 target，并独立构造五个 case key；
- 对五个 case 的 machine/adjudicated/structural-difference/routing 核心字段逐格重建并与 JSON 比较；叙述文本至少验证封闭模板、证据等级和与核心字段不矛盾；
- 独立重算 G2 的每一列 incidence；不得只检查族内加总为 82；
- 独立重算 G3 四个 arm 的 n、needs_review、rate 及每一列 incidence，并逐格比较；
- 核 G2/G3 非互斥标记、族内闭合、跨族非 partition、四臂加总与 spread；
- 核报告的必需章节、G1–G4 精确值、4+1 proof、G2/G3 关键计数、非互斥警告和首尾结论；
- 捕获 JSON shape/type、I/O 与其他预期验证异常，只输出相对路径、字段路径或计数；不得抛 traceback、绝对机器路径或行级值。

最低新增 validator 负测：

- 把 G2 outcome 两列做 `-1/+1`，保持族内仍合计 82，并同步测试副本中的 D2 CHECKSUMS；validator 必须失败；
- 篡改一个 G3 arm incidence，保持该族加总不变并同步 CHECKSUMS；必须失败；
- 篡改一个 case 核心字段并同步 CHECKSUMS；必须失败；
- 把 JSON 节点改成错误 shape/type；validator 必须净化失败且无 traceback/绝对路径；
- duplicate 输入行与 truthy bool 在测试副本中即使绕过测试用 pin，也必须由结构校验拒绝。

## 8. 继续有效的固定事实与边界

下列数值不得因 D2R1 改变：

- G1：49/53，unrouted 4；
- G2：82/196 = 0.4184；
- G3：24/56、22/56、27/56、9/28，spread 16.07pp；
- G4：1；
- target：G1 4、G4 1、交集 0；
- current conclusion：`NOT READY — current development gates have 4 red gates`。

原 D2 任务书 §3.3 的十份输入 SHA 原样继续有效。任一漂移必须在正式写入前硬失败。

绝对禁止：

- 不接触 hidden，不 open/stat/hash/glob；
- 不读 `raw/`、`raw_outputs/`、`traces/`、答案正文或逐轮工具返回；
- 不联网、不安装依赖、不调用模型、不产生费用、不调用 subagent；
- 不修改 U1/M1/D1、harness 既有文件（除本任务新增的 D2 validator）、protocol、freeze、Knote 或 Spool；
- 不修改 verifier、matcher、routing、threshold、rubric、gold、runner 或 approval；
- 不开始 gate repair、M1 重算、D1 重闭包、G0、hidden 或正式运行。

## 9. 验证、commit 与回执

必须执行：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest \
  posthoc/stage0a-development-wave2-red-gates-diagnostic/test_red_gates_diagnostic_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  posthoc/stage0a-development-wave2-red-gates-diagnostic/diagnose_red_gates_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 python3 -B \
  harness/verify_red_gates_diagnostic_wave2.py
```

默认 Python 无 pytest 时，可使用机器已有环境；禁止联网安装。不得运行 `pytest harness/` 整目录。

全部通过后只提交一次：

```text
posthoc(stage0a): correct wave2 red-gates diagnostic (D2R1)
```

回执必须包含：branch/worktree/完整 commit/唯一 parent、clean status、恰六个 `A` 路径及 SHA、三条命令退出码、四类阻断各自的修复证据与负测名称、4+1 与 G1–G4 精确数值，以及完整边界声明。

提交后停止。不得自行开始任何 gate repair 或后续阶段。
