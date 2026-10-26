# TASKBOOK P10 · 周回顾二：结构化 + 建议动作卡片 + 更新时弹消息（2026-10-26）

> **状态：ACTIVE（10-26 下发）。** §4 五题 Ocean 10-26 都答了（HANDOFF §9.2 第 217 – 221 条）：先做 P10、**API 和本机 CLI 两条一起改（原 P11 并进来）**、取代 / 更正进待审、弹消息用捕捉浮窗卡的位置弹小卡、真跑总花费不超过 1 美元。还没开工、没改代码、没花钱。
>
> 来源：HANDOFF §9.7「P10」（09-30 写的正文，本任务书 §1 原样搬来）、§9.3 路线图 P10 那一行、§10.7 真跑纪律。
> 返回点：P11 已并进本任务书（第 218 条）。P10 之后的下一件由 Ocean 在验收时定；P9T、P9R §6 仍等 Ocean 真手指。

---

## 0. 一句话

周回顾现在是一段纯文字（拆成一个项目一张卡）。P10 让它回一份有结构的结果：每个项目「做了什么 / 卡在哪 / 看到的信号 / 建议动作」，信号必须逐字引原句、对不上就整条丢；建议动作变成卡片上的按钮，点一下才生效、能撤销；周回顾更新时弹一个浮窗消息，点它跳过去。

---

## 1. 原始要求（HANDOFF §9.7，09-30）

- 提示词改成要 JSON：每个项目 {做了什么, 卡在哪, 看到的信号, 建议动作}；「看到的信号」必须逐字引用材料里的原句。
- 建议动作只能是 Spool 已有的几种：把项目标完成（接 P1 的归档）、设或改项目截止日期、加一条跟进问题、提一次整条取代或更正。
- 回来的每条先过逐字闸（引文对不上整条丢，和查过期的 `gate_proposals` 同一套），再变成周回顾页上的卡片，**点一下才生效、能撤销**，AI 永远不直接改库。
- **禁止话说到一半被截断**：字数上限只写在提示词里当要求，Spool **绝不自己截字**，卡片上也不用省略号截断正文；回复被厂商截断（`finish_reason` = length）⇒ 整次报失败，不端半份（沿用 T3 那条）；某个字段超了上限就整段照登。
- **每次周回顾更新弹一个消息，点它跳到周回顾**：默认做法 = 用浮窗那张卡（和休息提醒同一套：盖在当前 app 上、不抢键盘，点卡片才把主窗抬上来并打开周回顾）；不引入系统通知权限。施工前在任务书里复述这个选择。
- 改提示词要真跑几次花钱：按 §10.7 的六条纪律（先写判定标准、原始数据全存、用真实账单）。

---

## 2. 现在（10-26 对着 `HEAD` 重核；09-30 那段背景有几处已经不对）

| 09-30 正文说的 | 现在的代码 |
|---|---|
| 周回顾「DeepSeek 那条」 | P9U 之后 API 那条不再是 DeepSeek 专用：九家厂商 + 自填地址（`src/lib/ai/vendors.ts`）。API 那条：`weekly_review_via_api`（`src-tauri/src/api_engine.rs:2014`），提示词 `WEEKLY_API_SYSTEM`（`src-tauri/src/mcp.rs:10735`），材料 = digest 当历史 + 这一周新块原文（`weekly_fresh_blocks_text`），一发、没有工具 |
| P11 才改 CLI 那条 | P9U 让本机 CLI 和 API 做同样的四件事，周回顾有「本机 CLI / API」开关（`ReviewBoard/index.tsx`）。CLI 那条：`weekly_review_prompt_text`（`mcp.rs:11184`），能用 `get_pack` / `get_blocks` 补读，后台跑时不许写（`review_filing_line`） |
| 结果存成一段纯文字 | 仍是 `engine_runs.result_text` 一段 Markdown；P9S-5 起页面按 `## 项目名` 拆成一项目一张卡（`src/lib/ai/reviewCards.ts` + `ReviewBoard/ReviewCards.tsx`），三行标签对齐；没有任何按钮 |
| 截断要整次报失败 | 已经是这样：`spool-ai` 读 `finish_reason`，`length` 整次失败（T3，`src-tauri/sidecar/src/main.rs:1039`、`:1260`）。CLI 那条没有这个信号 |
| 逐字闸 | `gate_proposals`（`api_engine.rs:1323`）和工作区版（`:1592`）在过期检测里用，引文一个字符都不动 |
| 建议动作的落点 | 标完成：项目顶上「完成」面板（P9V 的「标完成」打开的就是它）；截止日期：项目抬头；跟进行：`suggest_follow_up_item` 进待审、或用户在跟进面板自己加；取代 / 更正：`propose_supersede` / `add_block ref_kind` 进待审 |
| 弹消息 | 没有。浮窗（`overlay.rs`）现在承载捕捉卡；休息提醒在主窗里锁屏（`BreakReminder.tsx`），**不是浮窗卡** —— 09-30 那句「和休息提醒同一套」要改说法，见 §4 第 4 题 |
| 自动跑 | 每周自动周回顾已有（`useAutoMaintain.ts`，`WEEKLY_REVIEW_PERIOD_MS`），走「周回顾」选的那条路 |

---

## 3. 要做的（按 §4 的回答定稿；按顺序，每步一笔提交）

1. **P10-1 结果格式**：**API 和本机 CLI 两条路**都要求回一个 JSON：`projects[]` 每项 `{title, did, stuck, signals[{quote, why}], actions[{kind, …, quote}]}` + `next`（最该先做的一句）。`kind` 只许四种：`mark_done` / `set_deadline{date}` / `add_follow_up{text}` / `propose_supersede{old_quote, new_quote}`（或 `correct`）。Rust 侧解析；解析不了整次失败，**不退回显示半份**。CLI 那条没有 `finish_reason`：JSON 不完整 = 截断 = 整次失败；CLI 后台跑时仍不许调写入工具（`review_filing_line`），动作只在 JSON 里提。
2. **P10-2 逐字闸**：每条 signal / action 的 `quote` 必须逐字出现在这次发出去的材料里（复用 `gate_proposals` 的比对，不另写一份）；对不上整条丢，丢了几条在页面底下说一句。标题对不上真项目的整项丢。
3. **P10-3 卡片 + 按钮**：沿用 P9S-5 的卡片排版，下面加建议动作按钮。标完成 / 改截止日期 / 加跟进行点一下生效、进 ⌘Z 撤销；**取代 / 更正点下去是进待审**（第 219 条），卡上说「在待审里等你」；已完成 / 私密项目不出现动作。旧的纯文字周回顾照旧显示。
4. **P10-4 更新时弹消息**（第 220 条，施工前复述）：一次新的周回顾存好（手动或自动），在**捕捉那张浮窗卡的位置**弹一张小卡：盖在当前 app 上、不抢键盘、几秒后自己收起；点它把主窗抬上来并打开周回顾。不加系统通知权限。浮窗读不到设置（记忆 `overlay-cannot-read-settings`），要显示的东西由 Rust 在 show 前推。
5. **P10-5 真跑**：按 §10.7 先写判定标准（JSON 解析率、逐字闸通过率、动作是否落在已有四种），在库副本上跑，原始数据全存，用真实账单。**上限：总花费不超过 1 美元（API 至多 6 次、CLI 至多 3 次），超了停下来问 Ocean**（第 221 条）。

**不做**：AI 直接改库；Spool 自己截字或加省略号；新的建议动作种类；系统通知权限；改 digest / 新块材料的范围（Ocean 拍过）。

---

## 4. 下发时问的五件（每题写了好处 / 代价；**Ocean 10-26 的回答写在每题末尾**）

1. **先试用还是先做 P10**（DISCOVERED-20261025-6，挂了两天）
   - a 先做 P10（照路线图）。好处：周回顾马上能用上建议动作。代价：又一个只按你一个人的用法做的功能。
   - b 先找 5–8 个同学试用 v0.7.4 一两周，再定 P10 / P11。好处：知道别人卡在哪，P10 可能要改方向。代价：P10 推后几周。
   - **答：a 先做 P10**（第 217 条）
2. **CLI 那条一起改吗**（原来 P11 才改）
   - a 两条一起改（推荐）。好处：P9U 之后两条路本来就做同样的事，只改一条，选 CLI 的人看到的周回顾还是纯文字。代价：这一份任务书更大；CLI 那条没有 `finish_reason`，截断只能靠「JSON 不完整」判。
   - b 照原计划只改 API，CLI 留给 P11。好处：小、先验一条。代价：两条路的结果长得不一样。
   - **答：a 两条一起改**（第 218 条）
3. **「提一次取代或更正」点下去是什么**
   - a 进待审（推荐）。好处：和 AI 别处的更正提议一样，你在待审里选「更正 / 取代 / 不动」。代价：要点两次。
   - b 点了直接取代。好处：一下就好。代价：周回顾成了唯一一个能直接退掉旧块的 AI 入口。
   - **答：a 进待审**（第 219 条）
4. **弹消息长什么样**（09-30 说「和休息提醒同一套」，但休息提醒现在是主窗里的锁屏，不是浮窗）
   - a 用捕捉那张浮窗卡的位置弹一张小卡：盖在当前 app 上、不抢键盘，几秒后自己收起（推荐）。好处：你在别的 app 里也看得见。代价：浮窗进程要加一种卡。
   - b 只在 Spool 主窗里冒一条。好处：最简单。代价：不在 Spool 里时看不到。
   - **答：用捕捉那张浮窗卡的位置弹一张小卡**（第 220 条）
5. **真跑花多少**：建议上限 —— API 至多 6 次（2 家 × 3 次），CLI 至多 3 次，总花费不超过 1 美元；超了停下来问你。
   - **答：可以**（第 221 条）

---

## 5. 要读的文件和命令

`src-tauri/src/mcp.rs`（`WEEKLY_API_SYSTEM`、`weekly_review_prompt_text`、`weekly_fresh_blocks_text`）· `src-tauri/src/api_engine.rs`（`weekly_review_via_api`、`gate_proposals`）· `src-tauri/sidecar/src/main.rs`（`finish_reason`）· `src/lib/ai/weeklyReview.ts` · `src/lib/ai/reviewCards.ts` · `src/components/ReviewBoard/` · `src/hooks/useAutoMaintain.ts` · `src-tauri/src/overlay.rs` · `src/stores/undoStore.ts`。
检查照惯例：tsc / vitest / cargo test / i18n（含 `--dead`）/ clippy；真跑在库副本上（记忆 `isolated-verify-workflow` §44）。

---

## 6. 回执

（执行窗填写。）
