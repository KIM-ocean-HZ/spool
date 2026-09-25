# Claude Code 任务书 —— Stage 0-a development wave2 · D2 红闸只读诊断

> **Owner 授权：2026-09-03，已明确授权 D2 development-only 只读诊断。**
>
> **执行者：Claude Code。** 本任务只诊断，不修复。
>
> **验收者：新的 Codex 独立验收窗口。** Claude 的回执只是待核声明。

## 1. 唯一目标

从已接受的 U1、M1、D1 固定产物中，机械重建并诊断：

1. G1 的 **4 个未路由 FN**；
2. G4 的 **1 个 machine pass ∧ gold fail**；
3. G2 `needs_review = 82/196` 的结构性来源；
4. G3 四臂 `24/56、22/56、27/56、9/28` 以及 **16.07pp spread** 的结构性来源。

诊断必须把“可由既有派生字段直接证明的事实”“有证据支持的推断”“当前证据不足”分开。若不读取原始答案就无法确定根因，结论必须写 `underdetermined_from_authorized_derived_evidence`，不得扩大读取范围。

本任务不追求让 gate 变绿，不提出或实现补丁，不重判 gold，不调整任何阈值。

## 2. 起点与隔离

共同事实：

- source main：`67cf84c9d40057fec02be7a963694938bff78a58`
- U1：`d77a96049636664e9a8feb6db93866e90e758aa4`
- M1：`4dcb70e79c1c7b1981001e69535a1a210f5e667b`
- D1：`8b2bd021ece2be1ac6a17bf47a68e4f0f64337a8`
- D1 唯一 parent 必须是 M1；D2 唯一 parent 必须是 D1。

新建：

- branch：`stage0a-wave2-red-gates-diagnostic-d2`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-red-gates-diagnostic-d2`
- parent：`8b2bd021ece2be1ac6a17bf47a68e4f0f64337a8`

若 branch 或 worktree 已存在，先停止并回报；不得猜测它是否可复用，不得删除或覆盖。

不得改 `main`，不得 merge、tag、push、fetch、pull。提交时只 `git add` 本任务列出的确切新路径，禁止 `git add -A`。

## 3. 已授权读取范围

### 3.1 全量机械连接允许读取

只允许读取下列既有派生产物和源码：

- `posthoc/stage0a-development-wave2-machine-confusion/MACHINE-LABELS-stage0a-development-wave2.jsonl`
- `posthoc/stage0a-development-wave2-machine-confusion/MACHINE-CONFUSION-stage0a-development-wave2.json`
- `posthoc/stage0a-development-wave2-machine-confusion/CHECKSUMS-MACHINE-CONFUSION-stage0a-development-wave2.sha256`
- `posthoc/stage0a-development-wave2-unblinded/adjudicated-gold-stage0a-development-wave2.json`
- `posthoc/stage0a-development-wave2-unblinded/CHECKSUMS-UNBLIND-stage0a-development-wave2.sha256`
- `posthoc/stage0a-development-wave2-current-gates/` 内 D1 的生成器、测试、JSON、报告和 CHECKSUMS
- `harness/verify_current_development_gates_wave2.py`
- 为解释已有字段含义而静态阅读 `harness/verify_stage0a_v120.py`、`harness/verify_stage0a.py`、`harness/verify2.py`

全量连接时，只读取重建 G1–G4 与 G2/G3 聚合所需字段。`arm` 只允许用于 G3 的既有四臂聚合；不得生成逐模型、逐 family 或任意探索性子群统计。

### 3.2 五个目标行允许读取

目标集合必须由 gate 定义从 196 行中现算，禁止硬编码 `blind_id`、episode、arm、model 或数组位置：

```text
G1 target = (not machine_pass) and gold_pass
            and not (machine_needs_review or machine_mandatory_blind_review)

G4 target = machine_pass and (not gold_pass)
```

只在目标集合机械得到 **4 + 1** 且两集合不相交后，才允许读取这五行在 U1/M1 中已有的派生字段：machine outcome、review flags、partial credit、machine component evidence、blocking wrong actions、adjudicated components、adjudicated wrong actions，以及 adjudicated `why`。

`why` 只能用于形成一句不含原答案原句的诊断摘要；不得整段复制进新产物，不得打印到 stdout。

### 3.3 固定输入指纹

至少钉死并在写入前逐一验证：

| 输入 | SHA-256 |
|---|---|
| `MACHINE-LABELS-stage0a-development-wave2.jsonl` | `e0979c2329c744e22c40d3be592e13f27cc3b59aa3a9a1e7971fa415f6146046` |
| `MACHINE-CONFUSION-stage0a-development-wave2.json` | `b0424703a7dcef0ec6c612a7e4b39bba95ef8b6e9ad01389b681599b0dfe3566` |
| `CHECKSUMS-MACHINE-CONFUSION-stage0a-development-wave2.sha256` | `fd438699457616ab125479b64314e503ff26fd6326d977f27e3ea8f4272b3e6f` |
| `adjudicated-gold-stage0a-development-wave2.json` | `c04ba2975cac763f0a14a8ef1391b4aa98493bd32e4ff5a1a58ec1d1c5136cca` |
| `CHECKSUMS-UNBLIND-stage0a-development-wave2.sha256` | `e0aa3ea548976660c958e2f7498ecaac89e8d76294bcfe956bae6605a7c38902` |
| D1 `CURRENT-DEVELOPMENT-GATES-…json` | `498c29cd9571f7b087d161d6440e6e99eaa7556874b2e14fde0ff1df5eb4c8f9` |
| D1 `CURRENT-DEVELOPMENT-GATES-REPORT-…md` | `a2908771e246837cd08cc879536cd0087ef0184e825edde3d59fe923518a10f1` |
| D1 `CHECKSUMS-CURRENT-DEVELOPMENT-GATES-…sha256` | `96ef4787584360ddeb8c74145582006652f86b18ff17b0a1b4754254633bec4d` |
| D1 `compute_current_development_gates_wave2.py` | `203ab54858d340a86d67ffe5da38c22995ede725fa1d999ca2ac9d2b3b92e2fe` |
| `harness/verify_current_development_gates_wave2.py` | `2d08a844e400209d5b9f4a4d67f74b6bcc4e48e6cfc93fdae622b36e6d9c76f4` |

任一输入缺失、SHA 漂移、CHECKSUMS 失败、行数或集合不符，必须在生成任何正式产物前硬失败。

## 4. 绝对禁止

- 不接触任何 hidden：不得 open、stat、hash、glob、解析或引用其内容。
- 不读取 `raw/`、`raw_outputs/`、`traces/`、运行答案正文或逐轮工具返回。
- 不调用评测模型，不运行 live、probe、旧 rescore、sweep、semantic probe，不重算 κ。
- 不联网，不安装依赖，不读取 `.env` 或任何 key。
- 不调用 subagent。
- 不修改 verifier、matcher、gate、runner、threshold、rubric、gold、freeze、protocol、approval、Knote 或 Spool。
- 不修改 U1、M1、D1 的任何既有文件；新产物只许 additive。
- 不按 `blind_id`、episode、arm、model 建白名单，不建议 blanket routing，不调阈值，不删除样本。
- 不产生 G0、hidden、approval、预算建议或“可以正式运行”的结论。

## 5. Changed paths —— 必须恰为六个新增文件

```text
A  posthoc/stage0a-development-wave2-red-gates-diagnostic/diagnose_red_gates_wave2.py
A  posthoc/stage0a-development-wave2-red-gates-diagnostic/test_red_gates_diagnostic_wave2.py
A  posthoc/stage0a-development-wave2-red-gates-diagnostic/RED-GATES-DIAGNOSTIC-stage0a-development-wave2.json
A  posthoc/stage0a-development-wave2-red-gates-diagnostic/RED-GATES-DIAGNOSTIC-REPORT-stage0a-development-wave2.md
A  posthoc/stage0a-development-wave2-red-gates-diagnostic/CHECKSUMS-RED-GATES-DIAGNOSTIC-stage0a-development-wave2.sha256
A  harness/verify_red_gates_diagnostic_wave2.py
```

不得新增 README、临时文件、缓存、点文件或第二套平行目录。

## 6. 机械产物要求

### 6.1 JSON

schema 固定为 `stage0a-red-gates-diagnostic/v1`，至少包含：

- scope、parent/source commits、完整输入指纹；
- D1 current gate 复核：G1–G4 原值逐格一致；
- `target_set_proof`：G1 4、G4 1、交集 0；
- 五个 case，case key 只可为 `D2-G1-01`…`D2-G1-04`、`D2-G4-01`；编号由内部按 `blind_id` 排序后确定，但不得输出排序映射；
- 每个 case 的机器/裁决结构差异、诊断轴和证据等级；
- G2 needs_review 按 machine outcome、partial credit、component evidence、blocking wrong action、mandatory overlap 的**非互斥 incidence**；
- G3 在四个既有 arm 上采用相同 incidence 口径，并证明四臂计数之和等于 G2 的 82；
- `limitations` 与 `boundary`。

诊断轴使用封闭词表：

```text
component_detection
wrong_action_detection
answer_state_classification
review_routing
decision_rule_interaction
underdetermined_from_authorized_derived_evidence
```

证据等级只允许：`established`、`supported_inference`、`underdetermined`。非互斥 incidence 只能说明相关结构出现频率，禁止写成因果分解或把各列相加当总数。

逐 case 可以保留 component/wrong-action 的局部 id 和集合差，但禁止包含或嵌套出现：`blind_id`、`run_id`、`episode_id`、model、逐 case arm、答案/答案 SHA、trace、原始 `why`、原始引文。arm 名只可出现在 G3 聚合表。

### 6.2 报告

报告开头必须写：

```text
DIAGNOSTIC ONLY — no repair authorized; current development gates remain red
```

报告必须依次说明：证据范围、输入绑定、目标集合证明、五个 case 的事实/推断/未知、G2/G3 聚合来源、能确认与不能确认的根因、边界声明。

不得出现补丁、伪代码、阈值调整、运行批准或“修完即可进入 hidden”。结尾必须保持：

```text
NOT READY — current development gates have 4 red gates
```

## 7. 生成器、独立 validator 与测试

### 7.1 生成器

- `--generate`：所有输入与内存结果全部验证后，才原子写入本目录三份生成物（JSON、REPORT、CHECKSUMS）；任一正式产物已存在即拒绝，永不覆盖。
- `--check-existing`：内存重算并逐字节比较，严格只读，不写 temp/cache/log。
- stdout 只打印计数、SHA、PASS/FAIL；不得打印 case 内容或任何行级身份。
- 无时间戳、随机数、绝对路径和机器相关字段，重复构建 byte-identical。
- CHECKSUMS 恰登记 generator、test、JSON、REPORT 四份，不自列。
- 目录闭包必须通过 `os.scandir()` 或等价方式检查**所有目录项，包含点文件**；任一额外项硬失败。

### 7.2 独立 validator

`harness/verify_red_gates_diagnostic_wave2.py` 必须：

- 不 import generator，不复用它的常量、helper 或目标选择函数；
- 独立读取固定输入，重建 4+1 target set、G2/G3 数值和 case key；
- 独立检查禁止字段、报告首尾结论、CHECKSUMS、目录闭包与全部输入 SHA；
- 任何异常只打印净化后的路径/计数，不泄漏行级内容；
- 成功退出 0，任一漂移或额外点文件非零。

### 7.3 测试最低覆盖

- D1 原值精确复现：G1 `49/53`、unrouted 4；G2 `82/196`；G3 四臂计数与 16.07pp；G4 1。
- 目标集合由定义推导，禁止硬编码身份；集合少/多一行、交集非空均 fail-closed。
- exact bool/int，拒绝 truthy、null、字符串数字和重复 id。
- 输入 SHA/CHECKSUMS 漂移、行数 195/197、集合不等、episode 对不上均拒绝。
- case key 确定性、封闭诊断轴、证据等级与禁止字段递归扫描。
- G2/G3 incidence 的总数与分母闭合；非互斥字段明确标记，不允许伪装成 partition。
- `--generate` 拒绝覆盖；`--check-existing` 完好退出 0、篡改副本非零且零写入。
- generator 与 validator 的目录闭包都能抓住普通额外文件和 `.unexpected`。
- 静态证明无网络、subprocess、模型调用与 raw 路径读取面。

运行测试必须使用：

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

不得运行 `pytest harness/` 整目录。默认 Python 没有 pytest 时，可使用机器上已经存在的 Python 环境；禁止联网安装。

## 8. Commit 与回执

全部检查通过后提交一次：

```text
posthoc(stage0a): diagnose wave2 G1-G4 red gates (D2)
```

回执必须包含：

1. branch、worktree、完整 commit SHA、唯一 parent；
2. `git status --short --branch`；
3. changed paths，证明恰六个新增文件；
4. 六个文件 SHA；
5. 三条验证命令、退出码与摘要；
6. 4+1 target proof、G2/G3 机械聚合摘要；
7. findings：逐 case 的诊断轴、证据等级和无法确定的部分；
8. 明确声明：未修复、未改既有文件、未接触 hidden/raw、未联网、未调用模型、未产生费用、未 merge/tag/push。

提交后停止。不得自行开始 repair、M1 重算、D1 重闭包、G0、approval 或任何正式运行。
