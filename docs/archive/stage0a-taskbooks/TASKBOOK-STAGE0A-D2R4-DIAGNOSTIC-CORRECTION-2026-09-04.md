# Claude Code 任务书 —— Stage 0-a development wave2 · D2R4 预检 fail-fast 闭包

> **状态：REVIEWED — 2026-09-04 Codex verdict `Accept`。**
>
> **执行者：Claude Code。** 本任务只纠正 D2R3 预检未在首个条目失败后立即返回的问题，不修实验红闸。
>
> **验收者：新的 Codex 独立验收窗口。** Claude 回执只是待核声明。
>
> **上次任务书：** `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-D2R3-DIAGNOSTIC-CORRECTION-2026-09-04.md`

## 1. Verdict 与唯一目标

D2R3 提交 `aaca2160ffdc12416dc3b1162c02545cea2db056` 的拓扑、六文件闭包、固定输入、
symlink 拒绝前零内容读取、CHECKSUMS 名字闭包、case / findings 独立重建和三条目标命令
均已复核通过；但 verdict 为 `Redo`。

唯一阻断位于 `harness/verify_red_gates_diagnostic_wave2.py:1345–1365`：
`_preflight_outputs()` 对缺失、symlink、非 regular file 与 realpath 父目录漂移使用
`ok=False; continue`，因此首个失败后仍会探测后续常量路径，五项走完才返回。D2R3 负测只
证明零内容 open/hash，没有证明任务书要求的“任一预检失败立即返回”。

D2R4 的唯一目标：把预检改成首个目录或条目判据失败后当场 fail-fast，并用路径访问日志
证明失败点之后没有任何后续产品路径探测。除此之外保持 D2R3 已闭合事实不变。

## 2. 起点、隔离与 changed paths

必须从已接受的 D1 重新建立干净分支：

- branch：`stage0a-wave2-red-gates-diagnostic-d2r4`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-red-gates-diagnostic-d2r4`
- 唯一 parent：D1 `8b2bd021ece2be1ac6a17bf47a68e4f0f64337a8`
- history 不得包含 D2 `3068b31…`、D2R1 `6a53404…`、D2R2 `2b2c07e…` 或 D2R3 `aaca216…`

允许只读参考 D2R3 的恰六个新增文件；不得 cherry-pick 任一未接受提交。相对 D1 最终仍须
恰为同六个 `A` 路径，不得增加 README、缓存、点文件或第二套目录。不得修改 `main`，不得
merge/tag/fetch/pull/push；只可显式 `git add` 六条目标路径。

## 3. 唯一纠正 —— 首个预检失败后零后续路径探测

D2R4 必须同时满足：

- 输出目录的任一判据失败立即返回 `False`；
- 五个常量条目按固定顺序预检时，缺失、symlink、非 regular file 或 realpath 父目录漂移
  任一判据首次失败，登记一条净化错误后立即 `return False`，不得继续循环；
- 从失败点到 `main()` 返回之间，不得再对任何后续产品路径调用 `lstat`、`stat`、`realpath`、
  `isfile`、`islink`、`scandir`、open 或 `_digest`；
- 错误仍只含 `posthoc/…/<name>` 相对路径，不含绝对路径、恶意值或 traceback；
- 干净路径上仍须先完成全部五条常量路径预检，再读取 CHECKSUMS；之后仍先纯内存封闭四个
  basename，再只 hash 四个常量路径，最后才读取 JSON / REPORT 语义内容；
- 不要求处理并发替换；任务书要求的是 validator 单线程正常执行中的确定调用顺序。

最低负测：

- 至少参数化覆盖五个产品位置，令每个位置分别成为首个失败点；访问日志必须证明只探测到该
  位置，未出现任何顺序在后的产品路径；
- 至少对 missing、symlink、非 regular file 三类失败各给出路径级 fail-fast 证据；
- symlink 继续使用 tmp 内目录外 byte-identical 副本，并继续断言零内容读取、零目录外读取；
- 干净副本继续断言首次内容读取前五个条目均已 `lstat`；
- 保留 D2R3 的 traversal、绝对路径、分隔符、空名、自列、重复、额外条目、非法 digest、
  重排、恰四个常量 hash 路径及全部既有生成器/validator 测试。

## 4. 必须保持不变的已核事实

- generator 的 preflight / O_EXCL / 回滚 / byte-identical / 五项目录闭包保持；
- case exact type + value、`_same()`、五个 case / 四个 findings 与报告块独立重建保持；
- G2 只陈述非互斥 incidence 与 `51/82` 可证重叠，不恢复因果；
- 十份输入 SHA、三份既有 CHECKSUMS、4+1 target、G1 `49/53` / unrouted 4 / `0.9245`、
  G2 `82/196 = 0.4184`、G3 `24/56, 22/56, 27/56, 9/28` / `16.07pp`、G4 `1` 原样成立；
- 报告首尾、`ready_for_hidden=false`、`repair_authorized=false` 保持；
- provenance 标签统一推进为 D2R4；除标签与本次 validator/test 改动外，不改变诊断语义。

## 5. 绝对边界

继续继承 D2R3 全部边界：不接触 hidden，不读 `raw/`、`raw_outputs/`、`traces/`、答案正文
或逐轮工具返回；不访问非必要 `answer_sha256`、全量 `run_id/model/why`；不联网、不安装依赖、
不调用模型、不产生费用、不调用 subagent；不修改 U1/M1/D1、protocol、freeze、gold、rubric、
matcher、routing、threshold、runner 或 approval；不开始 gate repair、G0、hidden 或正式运行。

## 6. 验证、commit 与回执

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
posthoc(stage0a): fail fast on D2 product preflight (D2R4)
```

回执必须包含 branch/worktree/完整 commit/唯一 parent、四个未接受提交均不在 ancestry、clean
status、恰六个 `A` 路径及 SHA、三条命令退出码、首个预检失败后零后续路径探测的负测证据、
4+1 与 G1–G4 精确值、完整边界声明。提交后停止，不得进入 gate repair。
