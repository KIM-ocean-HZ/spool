# Claude Code 任务书 —— Stage 0-a development wave2 · D2R3 symlink 预访问闭包

> **状态：REVIEWED — 2026-09-04 Codex verdict `Redo`。**
>
> **执行者：Claude Code。** 本任务只纠正 D2R2 validator 的 symlink 检查时序与对应负测，不修实验红闸。
>
> **验收者：新的 Codex 独立验收窗口。** Claude 回执只是待核声明。
>
> **上次任务书：** `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-D2R2-DIAGNOSTIC-CORRECTION-2026-09-04.md`

验收记录：提交 `aaca2160ffdc12416dc3b1162c02545cea2db056`，唯一 parent 为 D1
`8b2bd021ece2be1ac6a17bf47a68e4f0f64337a8`。相对 D1 恰六个新增路径；D2 / D2R1 /
D2R2 均不在 ancestry；工作树 clean；目标测试 `162 passed`，`--check-existing` 与独立
validator 均退出 0 并报 `PASS`。阻断：`_preflight_outputs()` 对条目失败使用
`ok=False; continue`，并非任务书要求的“任一预检失败立即返回”；现有负测只证明零内容
open/hash，没有证明首个失败后零后续路径探测。唯一 verdict：`Redo`。

## 1. Verdict 与唯一目标

D2R2 提交 `2b2c07e5cefaabd5469c7e4b4e717d53a7426cb0` 的拓扑、六文件闭包、固定输入、CHECKSUMS 条目名先验封闭、case exact type、case / findings 独立重建、报告逐块重建和三条目标命令均已复核通过；但 symlink 的“拒绝”发生得太晚，因此 verdict 仍为 `Redo`。

当前 validator 的调用顺序是：

1. `main()` 在 JSON 阶段直接 `open` 诊断 JSON；
2. report 阶段直接 `open` 报告；
3. 最后才进入 `_check_checksums_and_closure()`，用 `_is_contained_regular_file()` 拒绝 symlink。

因此把 JSON 或 REPORT 换成指向输出目录外的 symlink 时，validator 会先跟随链接读取目录外内容，之后才返回失败。D2R2 的 `test_validator_rejects_a_symlinked_product` 只断言 exit 2，没有证明拒绝前零目录外访问。

D2R3 的唯一目标：让五个输出条目在任何 D2 产物内容被 open/hash 之前完成固定路径、非 symlink、regular-file、realpath containment 预检；随后仍先纯内存封闭 CHECKSUMS 名字，再只 hash 四个常量路径。除此之外保持 D2R2 已闭合事实不变。

## 2. 起点、隔离与 changed paths

必须从已接受的 D1 重新建立干净分支：

- branch：`stage0a-wave2-red-gates-diagnostic-d2r3`
- worktree：`/Users/hzjin/Desktop/spool-research-wave2-red-gates-diagnostic-d2r3`
- 唯一 parent：D1 `8b2bd021ece2be1ac6a17bf47a68e4f0f64337a8`
- history 不得包含未接受的 D2 `3068b31df80de74be43e0c672270f2f78df9916b`、D2R1 `6a53404a4c20edc48ca9167a622cab5a8de8e1b0` 或 D2R2 `2b2c07e5cefaabd5469c7e4b4e717d53a7426cb0`

允许只读参考 D2R2 的恰六个新增文件；不得 cherry-pick D2/D2R1/D2R2。相对 D1，最终仍须恰为原任务书列出的六个 `A` 路径，不得增加 README、缓存、点文件或第二套目录。

不得修改 `main`，不得 merge、tag、fetch、pull、push。只可显式 `git add` 六条目标路径，禁止 `git add -A`。

## 3. 唯一阻断 —— symlink 必须在任何产物内容访问前被拒绝

D2R3 必须同时满足：

- 在打开或 hash `_GEN`、`_TEST`、`_DOC`、`_MD`、`_SUMS` 任一内容之前，对输出目录及五个预先声明的常量路径做只读预检；
- 输出目录本身不得是 symlink，其 realpath 必须是仓库内钉死的目标目录；五个条目必须存在、不是 symlink、是 `follow_symlinks=False` 意义下的 regular file，且 realpath 的直接父目录必须等于已验证输出目录 realpath；
- 预检不得使用目录条目名构造待访问路径；路径构造只允许使用五个预先声明的常量 basename；
- 任一预检失败立即返回，不得继续打开或 hash 任一 D2 产物；错误输出只含净化后的相对路径/字段路径/计数，不含绝对路径、恶意值或 traceback；
- 只有五条路径全部通过预检后，才允许从常量 `_SUMS` 路径读取 CHECKSUMS；仍须先用 `_parse_checksums()` 做纯内存语法/digest 检查，再用 `_names_are_closed()` 封闭四个名字、顺序、重复、自列和额外条目；
- 只有名字闭包成功后，才可逐一 hash `_EXPECTED_ENTRIES` 的四个常量路径；解析出来的 `name` 不得参与任何路径构造；
- 完成上述闭包后才进入 JSON 与 REPORT 的语义读取。若保留一次性预检与后续 open 的分阶段结构，至少保证 validator 单线程正常执行中不存在“先读、后验 symlink”的路径；
- 不得把“最终 exit 2”当作零目录外访问的充分证据。

最低新增/加强负测（全部只在 tmp 副本）：

- 至少分别把 JSON 与 REPORT 换成指向输出目录外、内容 byte-identical 的 symlink；monkeypatch validator 的 `open`、`_digest` 及相关 `os.path`/`os.scandir` 调用，断言在失败前没有一次 D2 内容 open/hash 解析到输出目录外；
- 最好参数化覆盖五个输出条目，至少必须覆盖语义阶段会读取的 JSON、REPORT 与 CHECKSUMS；
- 负测必须能在 D2R2 的原调用顺序上失败，避免只断言 exit 2 的弱测试；
- 保留并继续通过 traversal、绝对路径、分隔符、空名、自列、重复、额外条目、非法 digest、重排与干净副本恰四个 hash 路径的测试；
- 删除 D2R2 traversal 负测中 `os.path.exists(.../hidden)` 之类对 would-be hidden 路径的真实探测。该测试只用 monkeypatch 的访问日志证明 validator 未尝试访问；不得创建、stat、open、hash 或 glob 任何名为 hidden 的逃逸目标。

## 4. 必须保持不变的已核事实

- D2R2 的 case exact type + exact value、字段集合、`_same()` 递归比较继续成立；`false/0/0.0` 不得互相等价；
- case layers、evidence、harm-capable、summary template/summary、G1–G4 findings 与报告五个 case / 四个 findings 块继续由独立重建钉住；
- G2 只陈述非互斥 incidence 与 `51/82` 满足 k1 条件的可证重叠；不得恢复不可识别因果；
- generator 的 preflight、O_EXCL staging、publish 失败回滚、byte-identical 与五项目录闭包继续成立；
- generator、validator、tests 不访问非必要 `answer_sha256`、全量 `run_id/model/why`，不读答案正文；
- 十份输入 SHA 和三份既有 CHECKSUMS 原样钉死；
- target：G1 4、G4 1、交集 0；
- G1：49/53、unrouted 4、coverage 0.9245；
- G2：82/196 = 0.4184；
- G3：24/56、22/56、27/56、9/28，spread 16.07pp；
- G4：1；四闸继续红；
- 报告首行 `DIAGNOSTIC ONLY — no repair authorized; current development gates remain red`，末行 `NOT READY — current development gates have 4 red gates`；
- `ready_for_hidden=false`、`repair_authorized=false`。

## 5. 绝对边界

继续完整继承 D2/D2R1/D2R2 的授权边界，尤其：

- 不接触 hidden，不 open/stat/hash/glob；路径逃逸负测只能靠 monkeypatch 证明“未尝试访问”，不得创建或探测真实/临时 hidden 目标；
- 不读 `raw/`、`raw_outputs/`、`traces/`、答案正文或逐轮工具返回；
- 不联网、不安装依赖、不调用模型、不产生费用、不调用 subagent；
- 不修改 U1/M1/D1、protocol、freeze、verifier（除本任务的 D2 validator）、matcher、routing、threshold、rubric、gold、runner、approval、Knote 或 Spool；
- 不开始 gate repair、M1 重算、D1 重闭包、G0、hidden 或正式运行。

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
posthoc(stage0a): preflight D2 products before access (D2R3)
```

回执必须包含 branch/worktree/完整 commit/唯一 parent、D2/D2R1/D2R2 均不在 ancestry、clean status、恰六个 `A` 路径及 SHA、三条命令退出码、预访问 symlink 闭包的调用顺序与负测证据、4+1 与 G1–G4 精确值、完整边界声明。提交后停止，不得进入 gate repair。
