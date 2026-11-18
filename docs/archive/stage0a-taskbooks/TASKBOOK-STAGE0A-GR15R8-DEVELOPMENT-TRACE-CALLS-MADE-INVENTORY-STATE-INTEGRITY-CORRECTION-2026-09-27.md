# Claude Code 任务书 —— Stage 0-a development wave2 · GR15R8 inventory-state integrity correction

> **状态：COMPLETE — 2026-09-29 owner 确认 `Accept with non-blocking note`，不再执行。**
>
> accepted commit：`7f3826f42a7ecdb0d4e1099b805cb0d271ce5959`。验收与三条非阻断说明见
> canonical handoff §4.26；完整 pytest 未独立复跑，owner 明确无需补跑。正文保留当时授权。
>
> **后续唯一任务书：**
> `docs/archive/stage0a-taskbooks/TASKBOOK-STAGE0A-GR16-DEVELOPMENT-TRACE-FAILURE-PATHS-FIRED-EXACT-COUNT-SEPARABILITY-ENVELOPE-2026-09-29.md`
>
> **唯一交付：** 从 accepted GR14 独立重建同一六件交付，只纠正 GR15R7 新 inventory 状态可被
> 未受保护 helper 经间接写入伪造的缺口；保留固定 controls 清单、实际完成证明与读取防护。
>
> **固定科学范围：** 唯一 primitive 为 `trace.calls_made`，projected scientific baseline 为 GR9。
> 不增加 primitive，不做组合、排名、搜索、selector 或 candidate。
>
> **授权来源：** GR15R7 `fc281526fd24efde89ccd006853343748d0b72d5` 于 2026-09-27 验收为
> `Redo`。依 canonical handoff §1(5)，这是同一 GR15 授权内的最小纠正，不构成 GR16。

## 1. Finding 与完成定义

GR15R7 正确钉住原 validator 21 项 / analyzer 22 项 controls 与八族 probes，并在 pinned driver
中逐项报到。拓扑、六 SHA、R6 scaffold raw bytes 与正常版科学结果均闭合；Codex 独立复跑 analyzer
与 validator 均 rc 0 / PASS。执行者的 `1151 passed in 20638.58s` 是回执；本窗因静态 blocking finding
未启动 pytest，不登记为独立完整复跑。

**唯一 blocking finding：新 inventory 的 expected 和 observed 同存于可间接改写的 guard 状态，
未受保护的 provenance helper 可以令空循环仍满足 proof 接受条件。**

- validator 第 295–306 行 `prove()` 从 `self.inventory` 同时取 expected / controls / probes；
  第 4901–4903 行只把 `ast.Attribute(ctx=Store)` 计为状态写入。
- analyzer 第 312–323 行与第 4859–4861 行同构。`__dict__["inventory"]` 的写入是
  `ast.Subscript(ctx=Store)`，`object.__setattr__` 也不属于当前登记的 builtin / 模块属性拼写。
- provenance helper（validator 第 5057 行、analyzer 第 5047 行）不在 guard、boundary 三函数
  或 semantic-completion 三函数的 AST pin 中。以 validator 为例，在该 helper 的 docstring 后加入：

  ```python
  type(_PRODUCT_BOUNDARY).executes.__globals__["_BOUNDARY_CONTROL_SPECS"] = ()
  type(_PRODUCT_BOUNDARY).executes.__globals__["BOUNDARY_FAMILIES"] = ()
  _PRODUCT_BOUNDARY.__dict__["inventory"] = (((), ()), (), ())
  ```

  analyzer 对应使用 `PRE_PRODUCT_GUARD`、`running`、`PRE_PRODUCT_CONTROL_SPECS`、
  `PRE_PRODUCT_FAMILIES`。源码里的两条 canonical 赋值、guard 和全部 pinned drivers 均保持不变。
  自证先真实完成并钉出原清单，随后 helper 改写实际循环表及 guard inventory；两循环零次执行，
  真实 closure driver 仍交出同一 provenance，`prove` 从被替换状态取得的 `(controls, probes)`
  等于被替换的 expected，帧 / 对象条件也仍成立。这没有修改信任起点源码，却伪造了本轮必要前提。
- 两套纯 AST 对照各只改变该 helper，其余 752 / 764 个顶层节点不变；新增已识别 I/O token、
  transition call、state write 与清单名字绑定均为 0。既有 namespace mutations 已覆盖清单间接写入，
  但未把它与新 inventory 状态伪造组合；93 条测试中的 guard mutations 直接改 guard，因 digest
  drift 拒绝，不能证明 guard 外的状态写入被拒。
- 这是源码与纯 AST 对照证据；未 import / 执行变异实现、未写变异文件，不声称变异版实测 rc 0
  或读取计数。正常版未发现提前读取或科学污染。即使晚期 CHECKSUMS 拒绝，也不满足零 proof 接受。

R7 §4(3) 已要求“完成状态的产生、消费、检查和新登记信息均须自保护”；因此该缺口属于本轮，
不能以“与 R6 同水平”为范围外理由。完成定义是：**原固定全部 controls / probes 实际完成，才可
接受 proof；同一进程内、未受保护代码不能改写 expected / observed 或其检查者而缩小此前提。**

## 2. 起点、branch、worktree 与提交

- accepted parent：GR14 `0120c5e1e3d6c20a7b8e997cd8d47c9fc557df17`
- projected scientific baseline：GR9 `48b9f720958fc409419d7c823c607192f6c57925`
- 唯一优先 scaffold：rejected GR15R7 `fc281526fd24efde89ccd006853343748d0b72d5`
- older rejected：R6 `64f173b44cbfdea9e020ec8df0f39962f31dc8d9`、R5
  `87be12f9c39eff50c037aeb7e5ca17675bdc76cb`、R4 `a7413a4d594bd862c98b461ce94ddc0f04b7a707`、
  R3 `4d6a419cae875d3c8595c890056791d75203097a`、R2 `c42faaef5cc6661ed216c1162273c953a65beb58`、
  R1 `160db5f1be90921c6959e63ad25ff0fd3a946039`、GR15 `08b70f5c35ee63152b7aa10c8795a1afd1acd369`
- branch：`stage0a-wave2-trace-calls-made-inventory-state-integrity-gr15r8`
- worktree：`/Users/hzjin/Desktop/spool-research/worktrees/spool-research-wave2-trace-calls-made-inventory-state-integrity-gr15r8`
- 2026-09-27 Codex 已精确核实 branch / worktree 不存在、GR14 无六件目标 object。创建前再查；
  任一已存在即停止，不删、不覆盖、不复用。
- 唯一 parent 必须为 GR14，相对 GR14 恰一笔 commit、六个 `A` / 0 个 `M`。
- R7 / R6 / R5 / R4 / R3 / R2 / R1 / GR15、GR3 / GR6 / GR12 / GR12R1 / GR12R2 / GR13 /
  GR13R1 与 metadata-only sibling GR6R1 均不得进入 ancestry。

固定 commit message，无正文、无 trailer：

```text
posthoc(stage0a): protect calls-made inventory state integrity (GR15R8)
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

posthoc 恰五项，CHECKSUMS 恰登记 analyzer / tests / JSON / REPORT 四项且不自列。不新增第七件产物、
事件文件、registry copy、signature table、lookup、candidate 或仓内临时文件。

## 4. Inventory 状态完整性与负测

两套实现分别完成，不共享可执行实现；validator 不 import analyzer / tests / 前序实现。

1. 原 validator 21 项 / analyzer 22 项 controls 及 family 映射、八族 probes 全保留。两条原赋值
   `sha256(ast.dump(node, include_attributes=False).encode("utf-8"))` 为：

   ```text
   472c0ecfc8cba0e2438ec3843de748fe70e9379681d0732a6895a137d72e3ce0  _BOUNDARY_CONTROL_SPECS
   3d71d0a8bef2faf9134b1215f8c731aae82931ecbbcdf860059fd1e43b5078b7  PRE_PRODUCT_CONTROL_SPECS
   ```

   可迁移结构，但须机械证明全部项目与映射保留，不能让 live table 自己决定 expected。
2. 从受保护信任起点，闭合本轮 inventory 的初始化、逐项记录、消费和检查；guard 外的间接状态
   写入、状态别名、方法替换不得伪造完成。不能只加 `__dict__` / `__setattr__` 两个字符串黑名单，
   也不能只把同一可改写 expected 再比较一次。可以保守钉住 proof 前可达 helper 及相关绑定，或
   用等价的受保护验证路径；不要求通用 Python 分析器。未知赋值或控制流须 fail closed。
3. 保留真实 preflight→self-audit→closure→prove→source-semantics→release、实际帧 / 同一对象、
   guard 自核、R5 semantic-completion 与 R4 实际 reader/rebuild 防护。受保护范围内新增状态及
   检查本身也必须必要执行，不能由待证明 helper 签发可伪造完成。无需扩修相邻 P1 / round-identity
   的独立 completion 问题，不建立进程外攻击或任意 Python 沙箱安全的额外目标。
4. 必须新增两套真实源码 mutations：§1 的清单 namespace 清空与 inventory 伪造组合；清单缺项或
   等长替换与伪造 expected / observed 组合；`__dict__` 下标、其别名 / `update` / `__setitem__`
   路径、`object.__setattr__` 的直接及 callable alias 写入；guard 外替换新检查方法或完成记录者。
   覆盖新保护层删除、恒真、跳过、挪后、常量替换及提前报告。至少有 mutation 保持原 guard、
   drivers、canonical inventories 源码及其原 pins 不变，只改 proof 前可达的未保护 helper。
5. 每条均先在 byte-identical sandbox 以同一只读 spy 跑 control rc 0，再 mutation rc 2；stderr
   单行净化，成功 product opens=0、rebuild-input opens=0、release=0、被放行 rebuild entries=0、
   proof acceptance=0。control 证明固定原 21/22 controls 与 8 probes 全部完成，且先于 proof / read。
   观察器不调用 guard、不写 guard 状态、不提供完成证据；事件只含阶段/计数，不落盘。
6. R4/R5/R6/R7 既有真实负测全部保留，含 R7 的 93 条清单 mutations、运行时重绑、重复绑定与
   R6 finding 对照。若结构变化，迁移等价 mutation 并确认锚命中，不删覆盖；更早正确 stage 拒绝
   可接受，但不能仅因晚期源码哈希 / CHECKSUMS mismatch 失败。全部 mutations 只经 §9 完整 pytest。

## 5. 已闭合部分：禁止回退

- accepted source：`67cf84c9d40057fec02be7a963694938bff78a58:harness/verify_stage0a.py`，
  SHA-256 `ce014e0850efc23617387ad01b3154d091abb3a5dfc9d7ccd40671f0b56c7dce`。
- narrative 逐字保留 `[t for t in trace if t.get("kind") == "call" and t.get("tool")]`，独立 AST gate、
  五族计数、九 controls、四派生链保留，六个 `source_semantics_*` 计数为 `2/1/1/1/0/9`。
- P1 read-syntax closure、12 阳性对照、四族删除/恒真/绕开负测保留；本字段全模块真实读点恰一处，
  P1 可达闭包恰五名，到 definite / unknown-key read site 的路径为 0。
- 五面 delivery round 统一为 GR15R8 correction，科学问题仍 GR15、accepted parent 为 GR14。
  identity closure 与旧负测保留。
- available 第 16 槽仍为同一次 P4 read 的 raw exact nonnegative `int`，malformed 为 scalar
  `"not_applicable"`，194 available / 2 malformed，drop-last 逐行等于 GR9。
- P0–P8、runtime/static order claims、87 objects / 11 generations / 3 siblings 机械求和保留。

## 6. 科学 payload 与产物

保持 split / unsplit `16/18`、classes `58`、support `1…25`、singleton `28`、collision `7`、
reduction `35`、final `47…53`；Layer A `0/16`，G1/G2/G3/G4=`16/16/0/16`，G3 blocker 与
singleton risk 各 `16`；Layer B `16/16`，minimum final `76`、minimum padding `23`。

```text
trace.calls_made exact-count closure still requires anonymous padding; no deployable selector is closed
```

REPORT 首行、末行和 conclusion 不变；`GR15 COMPLETE` 指科学问题。只更新 correction heading、
delivery labels、rejected-scaffold provenance；不新增科学字段，不改科学计算、输入、阈值或披露范围。
科学读数或 class membership 漂移即停止报告，不调参、不改结论；rejected 产品不作 expected science。

## 7. Scaffold 与原始字节闭包

GR15R7 六个 full `commit:path` object 的 SHA-256：

```text
5b54f3a159f01ebf5f401f7e087789583eafe4c3f85dfeae9f489122f4d2e4cd  harness/verify_trace_calls_made_exact_count_separability_envelope_wave2.py
c9427b6df28cc6ef04d57aac1602e6725d1b05a6000f4fdf1910e10d22444dec  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/analyze_trace_calls_made_exact_count_separability_envelope_wave2.py
1122e3ea21aac38938b22d80654b35c2527636b2a807a0c3708fcb1c67da7f4a  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/test_trace_calls_made_exact_count_separability_envelope_wave2.py
4244692b1e2ea8f0db096ac9a571716257311ae37f72cec2b5fe4b2bfeee43ae  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.json
86fc33cc15c09a4b70121763198c4667438cf345e4920fd11ef6b44a2c3b118f  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-REPORT-stage0a-development-wave2.md
366356691192b276cbbfa957ce036cc97c41f62285a69929e78bad229dff8a8b  posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/CHECKSUMS-TRACE-CALLS-MADE-EXACT-COUNT-SEPARABILITY-ENVELOPE-stage0a-development-wave2.sha256
```

只有 R7 三份 Python object 可作机械 scaffold；其 JSON / REPORT / CHECKSUMS 只作 raw-byte SHA
closure 与 finding 文字对照，不解析为 expected science。R6 / R5 / R4 / R3 / R2 / R1 / GR15 各六对象
既有 raw-byte closure 全保留；全部 older rejected，不 import，不当 accepted input。

## 8. 执行边界

只读钉住对象与既有 development aggregate 闭包；不人工读取 rows / trace / answer、episode / gold /
M1 正文，不接触 hidden、未登记 raw、sibling worktree 或其它 primitive runtime value。不保存/回显
primitive value / frequency、signature value / tuple / digest、member、identity、join key、正文、
绝对路径或 arm-conditioned rule。

路径检查只针对点名 ref / worktree、六件交付、posthoc 五项，以及 `harness/__pycache__` 与
`posthoc/stage0a-development-wave2-trace-calls-made-exact-count-separability-envelope/__pycache__`
两个精确目录；禁止对 worktree 或其父目录递归 find / glob / scandir / walk。查 AGENTS 等约束也只用
明确祖先/目录的精确路径，不进入或清理 hidden / raw / 旧系统临时目录。

继续发布 `model_calls=0`、`cost_cny=0`、`hidden_touched=false`、promotion / freeze=`not_made`。
禁止 subagent、联网、安装依赖、模型/API、费用、第二 primitive、组合、排名、selector、candidate、
bucket/cap/threshold 搜索、配置选择、阈值变更、样本外、hidden、G0、正式运行、promotion、freeze、
修改 accepted / main / 冻结件或远端操作。不改 Knote 文档；Codex 验收后维护。

只用不落 `.pyc` 的内存 parse / compile，不用 `py_compile`。禁止单独计时 / profile / spy probe、
pytest 子集、前序目标命令、整目录 pytest、rescore、sweep、模型 runner；临时 sandbox 不扩大权限。

## 9. 验证命令

固定 Python 3.12.2，仅三条目标验证命令：

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

构建另允许同一 analyzer `--generate` 与不落 cache 的语法检查。失败只据目标命令输出与源码修复；
修复并重生成产品后，三条完整命令从头重跑。

## 10. 提交与停止

闭合唯一 parent / 一笔提交 / 六 A 零 M / posthoc 五项 / CHECKSUMS 四项、六 SHA、87/11/3 及全部
scaffold / older raw bytes。固定全部 controls / probes 实际完成是 proof 的必要前提，新 inventory
状态不能从未保护 helper 伪造；新增与旧 mutations 均保留真实零 proof / 读取 / 放行证据。
三条目标命令 rc 0，科学结果无漂移，status clean、tag 0、两个精确 cache 目录不存在。

唯一 commit 后立即停止，只返回拓扑、六 SHA、三条命令、状态完整性/完成顺序证据与执行边界自查。
不得创建 GR16、自动检验下一 primitive 或维护 Knote 文档。
