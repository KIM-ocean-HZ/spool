# Claude Code 任务书 —— Stage 0-a development wave2 · GR15R4 pre-product read closure correction

> **状态：ACTIVE — 本文件是当前唯一可执行实验任务书。**
>
> **唯一交付：** 从 accepted GR14 独立重建 GR15 同一单 primitive 交付，只纠正 GR15R3 的
> pre-product ordering self-provenance 缺口。当前正常执行顺序和科学结果没有被推翻；本轮不重开实验。
>
> **固定科学范围：** 唯一 primitive 仍为 `trace.calls_made`，projected scientific baseline 仍为 GR9。
> 不加入其它 primitive，不做组合、排名、搜索、selector 或 candidate。
>
> **授权来源：** GR15R3 `4d6a419cae875d3c8595c890056791d75203097a` 于 2026-09-24 验收为
> `Redo`。依 canonical handoff §1(5)，本轮只是同一 GR15 授权内纠正当前交付，不构成 GR16。

## 1. Finding 与完成定义

GR15R3 已正确绑定 accepted source 的 `.get("kind")` / `.get("tool")` 与 narrative。拓扑、六文件
SHA、87-object closure、既有 P1 / identity / direct-integer / science 均闭合；Codex 独立运行 analyzer
与 validator 均 rc 0。Codex 的 pytest 在静态阻断 finding 确认后主动中止，得到 `209 passed in
2263.24s`；执行者的完整 `763 passed` 仍是其回执，不冒充 Codex 独立完成。

**唯一 blocking finding：实际 product read 没有进入顺序自证。**

- validator 第 3869–3882 行 `_main_order_holds()` 只把 `_preflight`、`_build_document`、`_compare`
  三个名字作为晚阶段。第 9701 行比较参数中的 `_read_text(_DIR + "/" + _DOC)` 不单独计入。
- 仅把这个现有 JSON read 提到 source-semantics invocation 前，并在 `_compare` 中复用其结果，
  六个被审计函数的相对顺序仍完全相同，ordering predicate 仍为 true。binding、其五族判据、九条
  controls、四条 derivation links 与科学函数均无需改动。这是对 §4(4) “把 product read/rebuild
  挪到它之前必须提前 rc 2” 的漏检。
- GR15R3 tests 第 5381–5386 行只将整个 `_preflight()` 提前；没有移动实际 JSON / REPORT /
  CHECKSUMS read，也没有通过真实读取观测证明拒绝发生在 I/O 之前。
- Codex 只做了源文件静态审查与内存 AST 对照，没有修改交付文件、运行额外 runtime probe，
  也不声称变异版 validator 已实测 rc 0。现有正常版本没有发生提前读取，未发现科学 payload 污染。

本轮必须让两套实现各自守住**实际 product read / science rebuild 边界**，补上真实 relocation
mutations 与 fail-before-read 证据。不能只给上述三个包装函数再加名字、靠最终 byte mismatch、
检查 stage 文本、或仅篡改发布布尔来充当闭合。

## 2. 起点、branch、worktree 与提交

- accepted parent：GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`
- projected scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- 唯一优先 scaffold：rejected GR15R3 `4d6a419cae875d3c8595c890056791d75203097a`
- older rejected：GR15R2 `c42faaef5cc6661ed216c1162273c953a65beb58`、GR15R1
  `160db5f1be90921c6959e63ad25ff0fd3a946039`、GR15 `08b70f5c35ee63152b7aa10c8795a1afd1acd369`
- branch：`stage0a-wave2-trace-calls-made-pre-product-read-closure-gr15r4`
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-calls-made-pre-product-read-closure-gr15r4`
- 2026-09-24 Codex 已用 exact ref 与 exact path 确认上述 branch / worktree 均不存在。执行者创建前
  再查一次；任一已存在即停止，不删、不覆盖、不复用。
- 最终唯一 parent 必须为 GR14；相对 GR14 恰一笔 commit、六个 `A` / 0 个 `M`。
- GR15R3 / R2 / R1 / GR15、GR3 / GR6 / GR12 / GR12R1 / GR12R2 / GR13 / GR13R1 与
  metadata-only sibling GR6R1 全部不得进入 ancestry。

固定 commit message，不附 trailer：

```text
posthoc(stage0a): close calls-made pre-product reads (GR15R4)
```

不得 checkout / cherry-pick / merge rejected commit；不得 tag、fetch、pull、push。

## 3. 唯一允许的 changed paths

```text
harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/CHECKSUMS-TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

posthoc 目录恰五项；CHECKSUMS 恰登记 analyzer、tests、JSON、REPORT 四项，不自列。不新增第七件产物、
runtime event file、registry copy、signature table、lookup、candidate 或仓内临时文件。

## 4. 实际读取与重建的顺序闭合

两套实现各自完成，不共享可执行实现，不让 validator import analyzer / tests / 前序实现：

1. 明确区分合法的 own-source / pinned-source 静态读取，与本轮 delivered JSON、REPORT、CHECKSUMS 的
   open/read/hash。前者可以为 preflight 提供证据，后者必须在 source-semantics enforcement 完成后。
2. whole-source self-provenance 必须覆盖入口及 preflight 可达闭包里的实际读取点，以及实际 science
   rebuild 入口。移动 reader 本身、通过 helper / alias 委托读取、或把读取搬入 preflight helper，
   都不得因包装函数名字仍按顺序出现就被认为安全。可用严格 AST / 调用白名单或等价的保守闭包；
   不要求实现通用 Python 分析器。无法证明安全的新增前置读取或调用应 fail closed。
3. 正常路径先完成 source-semantics self-provenance 与 AST→narrative binding，再允许产物读取 /
   science rebuild / canonical compare。若采用 runtime reader guard，必须在底层 open/read/hash
   **之前**拒绝；已经读取后才 rc 2 不算完成。
4. enforcement 自身不得因删除、恒真化、跳过 invocation 或将检查挪后而失效。既有针对整个
   `_preflight()` / `build_document()` 搬移的检查与负测继续保留，新增对真实读取点的检查。
5. 只修顺序与证据；不改变 source narrative、source semantic gate、signature、科学计算、阈值、输入
   与输出披露范围。新顺序证据保持非发布自证或测试内观测，不新增科学字段或磁盘事件文件。

必须覆盖的真实源码 mutations（analyzer / validator 各自适用的路径均覆盖）：

- 将现有 JSON reader 从最终比较处提前到 source-semantics 前，晚处复用读取结果；
- 同样提前 REPORT reader；将 CHECKSUMS 的实际 read/hash 从其包装函数抽出提前；
- 包装函数顺序保持原样，通过 helper / callable alias 提前完成上述读取；
- 将读取放入 source-semantics 之前执行的现有 preflight helper；
- 跳过 source-semantics invocation，或提前实际 science rebuild；
- 删除 / 恒真化新增 read-order enforcement，或绕开其调用。

每条先在 byte-identical sandbox 跑正常 control rc 0，再施加 mutation，要求 rc 2、单行净化 stderr。
必须用内存计数、spy、受控 reader 或等价机制观察真实 product read / rebuild 是否发生，证明拒绝在
边界前；只检查 `FAIL [stage]`、没有 `PASS` 或没有 `byte-identical` 输出不足以证明提前拒绝。
观测不得保存 / 回显产物正文、逐行数据、身份或绝对路径，不新增磁盘日志。

## 5. GR15R3 已闭合部分：禁止回退

- 钉住 accepted source：`67cf84c9d40057fec02be7a963694938bff78a58:harness/verify_stage0a.py`，
  SHA-256 `ce014e0850efc23617387ad01b3154d091abb3a5dfc9d7ccd40671f0b56c7dce`。
- narrative 继续逐字使用 `[t for t in trace if t.get("kind") == "call" and t.get("tool")]`；各自的
  AST gate、五族计数、九条 controls、四条派生链自证与已有真实 mutations 都保留。
- 六个 `source_semantics_*` 新计数保持原值 `2 / 1 / 1 / 1 / 0 / 9`；其余 canonical facts 不漂移。
- P1 read-syntax closure、12 条阳性对照、四族删除 / 恒真化、detector 删除与绕开测试不得回退。
  全模块本字段真实读点仍恰一处，P1 可达闭包恰五名，到 definite / unknown-key read site 的路径为 0。
- analyzer / validator / tests / JSON / REPORT 的 delivery round 统一为 GR15R4 correction，科学问题仍
  为 GR15，accepted parent 仍为 GR14；五面身份 closure 与旧的负测覆盖保留。
- available 第 16 槽仍是同一次 P4 read 的 raw exact nonnegative `int`，不能是 `bool` 或包装 tuple；
  malformed 两行仍是 scalar `"not_applicable"`；194 available / 2 malformed；drop-last 逐行等于 GR9。
- P0–P8、runtime/static order claims、87 objects / 11 generations / 3 siblings 的机械求和均保留。

## 6. 科学 payload 与产物

科学内容必须保持：GR9 classes split / unsplit `16 / 18`；本轮 classes `58`、support `1…25`、singleton
`28`；collision `7`、reduction `35`、`|N_tc|=47…53`；Layer A `0/16`，G1/G2/G3/G4=`16/16/0/16`；
G3 blocker `16`、singleton risk `16`；Layer B `16/16`，minimum final `76`、minimum padding `23`。

固定 conclusion：

```text
trace.calls_made exact-count closure still requires anonymous padding; no deployable selector is closed
```

REPORT 首行、末行与 conclusion 不变；末尾 `GR15 COMPLETE` 指科学问题，不改成 GR15R4。
只更新 correction heading、delivery labels 与 rejected-scaffold provenance。不得将 rejected 产物作为
expected science；若科学读数或 class membership 漂移，停止报告，不调参或改结论。

## 7. Scaffold 与原始字节闭包

GR15R3 六个 full `commit:path` object 及 SHA-256：

```text
1bd84999fc0ecee75dd7578e841ba9a2b7149f8a8da32624f5192585515c0e31  harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
43d0b63a2f7ec0b3a3fab389dd52b37118f7d055d79ec660147fa42f1d559a50  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py
9321fe2bca0ad0f4ba856e3db5ae22c5a2cf94435fa94e99b8121cdbe9debd9d  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py
12349bbd826c5850f2193eb1b745a6c51fb31a1d75c1417eaebdf853c78b3992  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
17eec1a8f58687d8b9c2efdd3e0810db621a3000c080e6d2a40bf01acde6f5b9  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
2492704ef78431ecaa2ece28b1898c5fdcec9c312c42fca335d71ef82426661d  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/CHECKSUMS-TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

只有 GR15R3 三份 Python object 可作机械 scaffold；其 JSON / REPORT / CHECKSUMS 只作 raw-byte SHA
closure 与 finding 的文字对照，不解析为 expected science。GR15R2 / GR15R1 / GR15 的既有六对象
raw-byte closure 继续保留，全部降为 older rejected，不 import，不作为 accepted input。

## 8. 执行边界

只读钉住对象与既有 development aggregate 闭包。不人工读取 rows / trace / answer、episode / gold /
M1 正文；不接触 hidden，不读取未登记 raw、sibling worktree 或其它 primitive 的 runtime value。
不得保存 primitive value / frequency、signature value / tuple / digest、member、identity、join key、
正文、绝对路径或 arm-conditioned rule。

路径检查定向于本任务点名 ref / worktree、六个交付路径、posthoc 五项及两个明确的
`harness/__pycache__` / `posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/__pycache__`
路径。不得全 worktree find / glob / scandir / walk，不进入或清理 hidden / raw / 旧系统临时目录。
不得因补测试扩大为全树目录枚举。保留的定向器材检查不得扩成全树扫描。

继续发布 `model_calls=0`、`cost_cny=0`、`hidden_touched=false`、promotion / freeze=`not_made`。
禁止 subagent、联网、安装依赖、模型/API、费用、第二 primitive、组合、排名、selector、candidate、
bucket/cap/threshold 搜索、配置选择、阈值变更、样本外、hidden、G0、正式运行、promotion、freeze、
修改 accepted / main / 冻结件或远端操作。不改 Knote 文档；Codex 负责验收后维护。

## 9. 验证命令

固定 Python 3.12.2。三条目标验证命令：

```bash
PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 -m pytest \
  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py \
  -q -p no:cacheprovider

PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 \
  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py \
  --check-existing

PYTHONDONTWRITEBYTECODE=1 /opt/anaconda3/bin/python3 \
  harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
```

交付构建只允许同一 analyzer 的 `--generate` 生成本任务三份产品，以及源文件语法检查；这不是新增
科学 probe。不得运行前序目标命令、整目录 pytest、额外 runtime probe、rescore、sweep 或模型 runner。
新 mutations 放入本轮目标 test file，由上面的完整 pytest 执行。validator 失败为单行净化 stderr。

## 10. 提交与停止

逐项闭合唯一 parent / 一笔提交 / 六 A 零 M / posthoc 五项 / CHECKSUMS 四项、六 SHA、87/11/3、
scaffold 与 older raw-byte closure；真实提前 read / rebuild mutations 均在边界前 rc 2；三条目标命令
rc 0；五面 GR15R4 identity、P1、source semantics、direct integer 与 science 无回退；status clean、
tag 0，定向目录无 cache / 临时产物。

唯一 commit 完成后立即停止，只返回 topology、六 SHA、三条验证命令、实际读取顺序负测证据、
无回退的科学结果与执行边界自查。不得创建 GR16 或自动检验下一 primitive。
