# Claude Code 任务书 —— Stage 0-a development wave2 · D2R2 validator 收口

> **状态：REVIEWED — 2026-09-04 Codex verdict `Redo`；后续 D2R3、D2R4 已完成。**
>
> **执行者：Claude Code。** 本任务只纠正 D2R1 的独立 validator 与相应测试/再生产物，不修实验红闸。
>
> **验收者：新的 Codex 独立验收窗口。** Claude 回执只是待核声明。
>
> **上次任务书：** `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-D2R1-DIAGNOSTIC-CORRECTION-2026-09-03.md`

## 1. Verdict 与唯一目标

D2R1 提交 `6a53404a4c20edc48ca9167a622cab5a8de8e1b0` 的拓扑、六文件闭包、固定输入、授权字段面、G2 表述、生成器正常事务路径、逐格 incidence、既有产物和三条目标命令均已复核通过；但独立 validator 仍有两个阻断，因此 verdict 为 `Redo`：

1. D2 CHECKSUMS 的 `name` 在证明属于四个封闭文件名之前就被拼接、`isfile` 并 hash，篡改后的 `../` 路径可让 validator 读取输出目录外文件，违反 hidden/raw 等路径的绝对禁止；
2. case 核心字段使用 Python 宽松相等比较，且 case 分层叙述只核非空/词表/禁词，不能保证 exact type 或与独立重建核心字段一致。

D2R2 只闭合这两个 validator 阻断并保持 D2R1 其余已核事实不变。本任务不是 gate repair，不修改 G1–G4，不提出 matcher、routing、threshold、rubric 或 gold 方案。

## 2. 起点、隔离与 changed paths

必须从已接受的 D1 重新建立干净分支：

- branch：`stage0a-wave2-red-gates-diagnostic-d2r2`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-red-gates-diagnostic-d2r2`
- 唯一 parent：D1 `8b2bd021ece2be1ac6a17bf47a68e4f0f64337a8`
- history 不得包含未接受的 D2 `3068b31df80de74be43e0c672270f2f78df9916b` 或 D2R1 `6a53404a4c20edc48ca9167a622cab5a8de8e1b0`

允许只读参考 D2R1 的恰六个新增文件；不得 cherry-pick D2/D2R1。相对 D1，最终仍须恰为原任务书列出的六个 `A` 路径，不得增加 README、缓存、点文件或第二套目录。

不得修改 `main`，不得 merge、tag、fetch、pull、push。只可显式 `git add` 六条目标路径，禁止 `git add -A`。

## 3. 阻断一 —— CHECKSUMS 必须先封闭名字，再做任何文件访问

D2R1 validator 在 `harness/verify_red_gates_diagnostic_wave2.py:875–895` 解析新 CHECKSUMS 时，先把不可信 `name` 拼到输出目录、调用 `os.path.isfile()` 和 `_digest()`，最后才比较 `listed == _EXPECTED_ENTRIES`。因此把一条 name 改成 `../../hidden/...`、`../../raw/...` 或其他 `../` 路径并不会在读取前失败。

D2R2 必须：

- 先把 CHECKSUMS 全部读成纯文本结构，只做内存语法验证；
- 在任何由条目名驱动的 `stat/open/hash` 前，证明条目恰为 `_EXPECTED_ENTRIES`、顺序正确、无重复、无自列；
- 每个名字必须是封闭常量中的单个 basename；拒绝绝对路径、`..`、路径分隔符、空名、额外条目和 symlink 绕出目录；
- digest 必须先验证为 64 位小写 hex；
- 验名完成后只用四个预先声明的常量路径逐一 hash，不再用不可信 name 构造路径；
- 失败输出继续只含净化后的相对路径/字段路径/计数，不回显恶意条目值、绝对路径或 traceback。

最低新增负测（全部只在 tmp 副本）：

- 将一条 CHECKSUMS name 改为 `../../hidden/sentinel`，并 monkeypatch `open` / `_digest` / `os.path.isfile` 记录目标；validator 必须在任何目录外访问前失败；测试不得真实创建、stat、open 或 hash hidden；
- 分别覆盖 `../`、绝对路径、含 `/` 的 name、重复合法 name、额外 name、非法 digest、symlink 目标；均须 fail-closed；
- 断言所有实际被读取/哈希的 D2 产物路径都严格属于输出目录内四个封闭 regular files。

## 4. 阻断二 —— case exact type 与叙述语义必须独立闭合

D2R1 validator 的 `_cmp()` 在 `verify_red_gates_diagnostic_wave2.py:530–532` 只使用 `!=`；case 核心字段在 `700–724` 直接走该比较。Python 中 `False == 0.0`、`True == 1`，所以把某个 `partial_credit: 0.0` 改成 `false`，或把布尔格改成 `0/1`，同步 JSON CHECKSUMS 后仍可能通过核心逐格检查。

同时，`725–759` 对 case evidence、diagnostic axes 与三层叙述只核合法词表、非空和少量禁词；把 `established` 改成与重建核心字段矛盾但不含禁词的句子，并同步报告/CHECKSUMS，validator 仍不能独立拒绝。这不满足“叙述文本与核心字段不矛盾”。

D2R2 必须：

- 对 case 的 machine/adjudicated/structural_difference/routing_clause_state 每个字段做 exact type + exact value 比较；布尔不得与 0/1 等价，float 不得与 bool/int 等价，list/dict 形状与字段集合必须精确；
- 独立从重建核心字段生成每个 case 的 diagnostic axes、evidence、episode harm-capable 状态、established、supported inference、underdetermined、summary template id 与 summary，并逐格比较；不得只做非空或关键词黑名单扫描；
- 对 gate-level findings 采用独立封闭模板重建并逐格核对，至少保证其中的 G1–G4 数值、51/82 k1 重叠口径、事实/推断/未知分层与核心重建一致；
- 报告中五个 case 的标题、核心读数、summary 和三层叙述必须与已验证 JSON/独立重建一致；删除、替换或互换任一 case 块都必须失败；
- 所有错误 shape/type/叙述篡改继续净化失败，无 traceback、绝对路径或行级身份值。

最低新增负测（篡改后同步 JSON/REPORT/CHECKSUMS）：

- case `partial_credit` 的 `0.0 -> false`；
- case 布尔字段的 `false -> 0` 和 `true -> 1`；
- case `established` 改成与 machine/adjudicated 核心字段相反、但不含现有 banned phrase 的句子；
- case evidence level 改成词表内但与重建证据不一致的值；
- gate-level G2 established 把 `82/196` 改成错误数值，同时在报告同步替换；
- 从报告删除一个完整 case 块或互换两个 case 的 summary；

以上均必须由独立 validator 自身拒绝，不能只靠未同步的 CHECKSUMS 拒绝。

## 5. 必须保持不变的已核事实

- generator、validator、tests 不访问非必要 `answer_sha256`、全量 `run_id/model/why`；测试本身不得越界；
- G2 只陈述非互斥 incidence 与 `51/82` 满足 k1 条件的可证重叠，不得恢复“主要来源/最宽/抬过阈值”等因果结论；
- `--generate` 的 preflight、O_EXCL staging、publish 失败回滚、byte-identical 与五项目录闭包继续成立；
- 十份输入 SHA 和三份既有 CHECKSUMS 原样钉死；
- target：G1 4、G4 1、交集 0；
- G1：49/53、unrouted 4、coverage 0.9245；
- G2：82/196 = 0.4184；
- G3：24/56、22/56、27/56、9/28，spread 16.07pp；
- G4：1；
- 报告首行 `DIAGNOSTIC ONLY — no repair authorized; current development gates remain red`；
- 报告末行 `NOT READY — current development gates have 4 red gates`；
- current development gates 继续四红，hidden 继续未授权。

## 6. 绝对边界

继续完整继承 D2 与 D2R1 的授权边界，尤其：

- 不接触 hidden，不 open/stat/hash/glob；路径逃逸负测只能靠 monkeypatch 证明“未访问”，不得创建或探测真实 hidden；
- 不读 `raw/`、`raw_outputs/`、`traces/`、答案正文或逐轮工具返回；
- 不联网、不安装依赖、不调用模型、不产生费用、不调用 subagent；
- 不修改 U1/M1/D1、protocol、freeze、verifier（除本任务新增 D2 validator）、matcher、routing、threshold、rubric、gold、runner、approval、Knote 或 Spool；
- 不开始 gate repair、M1 重算、D1 重闭包、G0、hidden 或正式运行。

## 7. 验证、commit 与回执

只运行：

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

默认 Python 无 pytest 时可用机器已有环境，禁止联网安装；不得运行 `pytest harness/` 整目录。

全部通过后只提交一次：

```text
posthoc(stage0a): close D2 validator gaps (D2R2)
```

回执必须包含 branch/worktree/完整 commit/唯一 parent、D2/D2R1 均不在 ancestry、clean status、恰六个 `A` 路径及 SHA、三条命令退出码、两个阻断的修复证据和负测名称、4+1 与 G1–G4 精确值、完整边界声明。提交后停止，不得进入 gate repair。
