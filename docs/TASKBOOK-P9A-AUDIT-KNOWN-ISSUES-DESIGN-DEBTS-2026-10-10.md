# 产品任务书 P9A —— 零散的已知问题 + 设计稿欠账：逐条核对，给建议，Ocean 裁定

> **状态：ACTIVE。**
>
> **唯一交付：** 一张建议表（格式见 §4），写进本任务书 §7 回执。**这一窗不改任何代码**，修哪几条由 Ocean 看完建议表再裁定，裁定之后另写任务书（HANDOFF §9.3 里暂叫「修补」）。
>
> **来历：** Ocean 2026-10-10（HANDOFF §9.2 第 71–72 条）：下一版 = 做完 P9B 再发 Mac 版，加上修好零散的已知问题；原话「把修好零散的已知问题+设计稿里登记的欠账核对，作为单独一个窗口的task，Claude code思考后给我建议，我来裁定」。
>
> **和别的任务书不一样的地方：** 条目正文**不从 HANDOFF 搬过来**。这一窗只核对、不施工，条目照旧留在 HANDOFF 里；核对的结论写在本任务书回执里，HANDOFF 每一条只补一行「P9A 核对：…，见任务书」。
>
> **边界：**
> - ⛔ 不改代码、不改测试、不改 schema；⛔ 不写库（只许 `sqlite3 -readonly`，或者 `VACUUM INTO` 拷到 scratchpad 再看）；⛔ 不起 debug 版 GUI；⛔ 不花钱（不跑任何会调付费 API 的东西）。
> - 为了核对可以在 scratchpad 里写临时测试 / 脚本，⛔ 不进仓库。
> - 不碰实验线：`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行。
> - 不动 `docs/EXECUTION_POLICY.md`。不 push、不发版。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：首屏、§8、§9.0 – §9.4、§9.8、§9.9、§10.1、§10.4 – §10.6、§11。
3. `docs/README.md` §三「产品设计稿（还有没做完的格，所以留在这里）」那张表。
4. `CLAUDE.md` 全文。
5. 记忆：`write-plainly-for-ocean`（给 Ocean 的选项必须写好处 / 代价，代价写成「你将来会遇到的那个具体场景」）、`no-test-environment-spool`、`spool-must-not-cost-other-tools`、`mcp-tool-annotations-required`、`mcp-tool-routing-required`、`pack-header-source-of-truth`。
6. 每一条开核之前，读那一条点名的文件。

## 2. 起点

- 本地 `main`。开工时 `git log -1` 应该是下发本任务书的那笔 docs 提交（标题以 `docs: 下发 P9A` 开头）。之后只多了 docs 提交也行；不是这样就停下来说明。
- 测试基线（P9 最后一遍，`7efc7b5` 上）：`npx tsc -b` 干净；`npx vitest run` 85 个文件 / 1016 条；`cargo test --manifest-path src-tauri/Cargo.toml` 190 过 · 5 跳过；sidecar 14 过；`node scripts/i18n-check.mjs` `(none missing)`；`--dead` 87 行；`cargo tree … | grep -iE "ureq|rustls|reqwest|hyper|openssl"` 空。开工跑一遍对一下（这一窗不改代码，收尾时数字应该一样）。
- 真库现状：v33（P9 已换装）。
- 只提交自己改的 docs 路径；README 只暂存自己那一行（`git hash-object -w` + `git update-index --cacheinfo`）；提交信息里不许有任何工具署名，提交后跑 `CLAUDE.md` §5 的自查。

## 3. 要核的清单

### 3.A HANDOFF §8 / §9.9 里还是 captured 的（18 条）

| 编号 | 一句话 | HANDOFF 写的严重度 / 状态 |
|---|---|---|
| `DISCOVERED-20260924-1` | Codex 引擎无人值守时自己取消所有会写库的 Spool 调用 | P2（若 `propose_blocks` 也被取消则 P1）· 需要决定 |
| `DISCOVERED-20261001-1` | 查找条关闭按钮的 `title` / `aria-label` 还是裸中文 | P3 |
| `DISCOVERED-20261001-2` | `i18n-check --dead` 报 87 条没人用的键（可能有常量表误报） | P3 · 技术债 |
| `DISCOVERED-20261001-3` | 全库搜索结果上的「批注」英文显示成动词 Annotate | P3 |
| `DISCOVERED-20261002-1` | 删掉编号最大的那块、再捕捉一块，之后 ⌘Z 撤不回那次删除（连带去掉的文件也回不来） | P2 |
| `DISCOVERED-20261002-2` | `i18n-check` 看不见捕捉浮窗里的 `tr('…')` | P3 · 技术债 |
| `DISCOVERED-20261002-3` | 长按 ⌥ 那张卡上按 ⌘Z，撤的是之前另一件事 | P2 · 需要决定 |
| `DISCOVERED-20261002-4` | 捕捉卡 × 实际是「存下再关」，提示却写「关闭 (Esc)」 | P3 · 需要决定 |
| `DISCOVERED-20261002-5` | 提示卡顶掉捕捉卡时，没写完的批注要等下一次捕捉才存 | P3 |
| `DISCOVERED-20261003-1` | 压缩「用这一份」写回库时最后一块多带一行 `---`（真库有 1 块已经这样） | P2 |
| `DISCOVERED-20261004-1` | 隐私说明「最后更新」日期发版时要跟着改（三处） | P3 · 发版时的文档动作 |
| `DISCOVERED-20261004-3` | `blocks.ts::updateBlockThread` 没人调用，而且不带文件走 | P3 · 技术债（删的话是删一个函数，不是删文件） |
| `DISCOVERED-20261007-2` | `cargo test` 偶发 2 条失败（19 次里 1 次） | P3 |
| `DISCOVERED-20261007-3` | `list_threads` 的 `approx_pack_chars` 把被取代的文件和图片行算错 | P3（⚠️ 修了会改 MCP 输出的数字） |
| `DISCOVERED-20261008-1` | 把图片本身递给 AI（MCP 的图片内容类型） | P3 · 小功能（⚠️ 新 MCP 能力要过 annotations 和路由文本两道） |
| `DISCOVERED-20261008-3` | 截图捕捉没覆盖到的三种（⌘⇧5 工具条停太久、HEIC、Windows 的 Win+PrtScn） | P3 |
| `DISCOVERED-20261010-4` | `bg-accent-soft` 从来没生效，10 个组件在用 | P3 · 需要决定（⚠️ 和 P9B 深浅色碰同一批 token） |
| `DISCOVERED-20261010-6` | 删块连带去掉的文件，⌘Z 撤回之后身份和「知道了」没跟着回来 | P3 |

### 3.B HANDOFF §10.1 的五条小项

`C-a`（拿现成 39 条标注重扫 `scope_limited`，零 API —— ⚠️ 核一下是不是真的不花钱）、`C-b`（Safety 面纸面复核）、`C-c`（`assemble({ instructions: false })` 这条路没有表头，还有哪些调用方）、`C-d`（五处文档顺手改，§10.8）、`C-e`（主窗尺寸在 More Space 档下不变 —— 要 Ocean 切一下显示设置，核的时候写清楚需要他做什么）。

### 3.C HANDOFF §10.1 里 2026-08-22 起还没答的那道产品题

一句话摘要要不要从「最淡的一行」升级成「能看清的一段」（HANDOFF 里附了当时的建议「不升级」）。只核它今天还成不成立、还要不要问，给建议。机器上认领 `com.oceanjin.spool*` 的 app 数是环境问题，不在这一窗。

### 3.D README §三 登记的设计稿欠账

| 设计稿 | README 写的欠账 |
|---|---|
| `DESIGN_AI_ENGINE.md` | §7.6「模型真的写进一块」没验到；§7.7 免费档要不要再补一个 |
| `DESIGN_CONTEXT_HYGIENE.md` | 第 5 件（AI 一句话标签）当初压后，§8 说「现在该看了」 |
| `DESIGN_FOLLOW_UP.md` | §8 会话内跟进这条新形状；M4 定时已明确不做 |
| `DESIGN_MCP_INTENT_ROUTING.md` | A – E 已落地，F 未开工，要单独一窗 |
| `DESIGN_MCP_WRITE_ROLE.md` | M1 已落地，M2 等真实使用后再定 |
| `DESIGN_PROJECT_FILES.md` | 评估 + 计划，未开工（⚠️ P5 – P9 做了一大批文件的事，很可能已经过时） |
| `DESIGN_WORKBENCH.md` | §9 那轮重构是主线，§9.5 有两处冲突要先解 |
| `DESIGN_WORKSPACE_PACK.md` | 嵌套已提交；打包那半（§7）还没提交（⚠️ P8 做了工作区导出，可能已经过时） |
| `DESIGN_WINDOWS_PORT.md` | 首版已发，未签名是已知欠账（⛔ Windows 不签名是红线，「这条不要再问」；Windows 发版等 P11，第 73 条） |
| `WINDOWS-CHECK.md` | 第三、四轮还没装机验（⚠️ Windows 等 P11，第 73 条 —— 只核还差什么，不建议提前做） |
| `COMPRESS-UX-R2-2026-08-22.md` | 八条里 1、5、7 没做（第 1 条最大：压缩稿直接替换原库正文） |
| `FEEDBACK-FORM-2026-08-22.md` | 等 Ocean 在问卷星建好两份并把链接发回（⚠️ 和 §11 `POLICY-PROPOSAL-20261010-1` 的问卷有关） |
| `DESIGN_CASE_STUDY.md` | 申请用 case-study 的后面几期还在等 |

### 3.E 不在这一窗的（已经定了，别重提）

P9B / P10 / P11、F1 / F3 / F4、T11、R5b、R2、G 批、H 批（HANDOFF §9.3、§10.1、§10.4、§10.5）；Windows 发版时间（第 73 条）；宣发（§11 等 Ocean 定）。核对中发现它们有新情况，记进 HANDOFF §9.9，不放进建议表。

## 4. 每一条要回答什么（建议表的格式）

一条一行，按 §3 的分组排：

| 列 | 写什么 |
|---|---|
| 编号 | 原编号 |
| 一句话 | 大白话，用户看得见的现象；技术债写「用户看不见，影响的是……」 |
| 现在还成立吗 | 对着哪个 commit、哪个文件哪一行核的；已经不成立就写为什么（比如被 P5 – P9 顺带改掉了），成立就写怎么确认的（读代码 / scratchpad 里的临时测试 / 只读查询） |
| 碰到的机会和后果 | 多常见、碰到了会怎样（丢数据 / 看着不对 / 白花钱 / 只是开发者看得见） |
| 修法和大小 | 最小修法一两句；大小：小（一两个文件、半小时级）/ 中 / 大；⚠️ 标出是不是要动库结构、MCP 工具或输出、pack 格式或 golden、只能真手指验 |
| 碰不碰红线 | 对着 HANDOFF §10.6 查；碰的写哪一条 |
| 建议 | 四选一：**放进下一版修** / **以后再说** / **不做（关掉）** / **要你先定一件事** |
| 理由 | 一两句 |

- 「要你先定一件事」的，下面单列：甲 / 乙 / 丙，每个写好处、代价（代价写成具体场景），再写你推荐哪个。
- 表后面写一段小结：建议放进下一版的有哪几条、加起来多大、建议的先后（哪几条最好和 P9B 一起或排在它前面，比如 `DISCOVERED-20261010-4`），以及这一窗新发现的东西。
- 设计稿那几行（3.D）里已经过时的，建议直接写「README 那一行改成……」，由 Ocean 点头后在修补任务里改。

## 5. 怎么核

- 每一条的「证据」都在 HANDOFF 里写过一次，**照着它重新核一遍，不要照抄**：行号、函数名、条数都可能被 P5 – P9 改过。
- 能便宜地复现就复现（scratchpad 里写临时 vitest，用 `node:sqlite` 适配器；Rust 的可以读代码推）。复现不了的写清楚为什么。
- 需要真手指或要花钱才能确认的，写清楚「要你做什么才能确认」，⛔ 不自己跑付费的东西。
- 核对中发现新问题：按 HANDOFF §7.2 / §8 的格式记进 §9.9（默认 captured），也放进建议表。

## 6. 什么时候停下来问

- 起点不是 §2 写的那样。
- 某一条只有改代码才能判断（比如要加日志才知道是哪两条测试偶发失败）：⛔ 不改，写进建议表「要你先定」或者「建议修的时候顺带查」。
- 发现任何一条其实是数据损坏 / 隐私 / 出网 / 白花钱这一类（方针 §8 的硬条件）：停下来先告诉 Ocean。

## 7. 回执（执行窗填写）

- 开工核对（起点、测试基线）。
- 建议表（§4 格式）+ 小结。
- 收尾时测试数字（应该和开工时一样，因为没改代码）。
- 新发现记在 HANDOFF 哪里。

## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 裁定`，`git mv` 进 `docs/archive/product-taskbooks/`。
2. `docs/HANDOFF-2026-09-04.md`：
   - §8 / §9.9 每一条核过的，补一行「P9A 核对（日期）：还成立 / 已不成立，建议……，见 P9A 任务书回执」；
   - §9.3 P9A 那一行改成「已完成，待 Ocean 裁定」；
   - §9.8 唯一下一步写成「Ocean 裁定 P9A 建议表 → 下发 P9B 和修补（先后按裁定）」。
3. `docs/README.md` 入口表 ACTIVE 产品任务书那一行改成「暂无，待 Ocean 裁定 P9A」（只暂存这一行）。
4. 这些文档改动单独一笔提交（只 add 自己改的路径）。
