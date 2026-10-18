# docs/ 里都有什么

本文件只是目录，回答两件事：**这份文件干什么用、它还活着吗**。
它不决定做什么。

**开工顺序（硬规矩，和 `CLAUDE.md` §0 一致）：**
先读 `EXECUTION_POLICY.md`，再读首屏明确写着 active、且没标 SUPERSEDED 的那份 handoff。
不要按 IDE 里碰巧开着的文件开工。

---

## 一、入口（只有这几份，2026-09-24 现状）

| 文件 | 干什么用 | 谁在改 |
|---|---|---|
| `EXECUTION_POLICY.md` | **长期顺序的唯一权威**，LOCKED。产品 / 记忆研究 / 营销的主次、交替节奏、任务准入 | 只有 Ocean 明确同意才能改，其他一律禁止 |
| `HANDOFF-2026-09-04.md` | **Knote 这边仍然生效的约束 + 还没做完的事**（2026-09-05 已精简到 190 行）。⛔ 不含执行光标 | 每窗结束时补未完成项 |
| `CODEX-HANDOFF-STAGE0A-D2-REVIEW-2026-09-03.md` | **实验线（Stage 0-a）的唯一滚动入口**；GR15R3 已 `Redo`，当前光标为 ACTIVE GR15R4。文件名里的日期和 D2 只是历史，内容是最新的 | Codex |
| `TASKBOOK-STAGE0A-GR15R4-DEVELOPMENT-TRACE-CALLS-MADE-PRE-PRODUCT-READ-CLOSURE-CORRECTION-2026-09-24.md` | **当前唯一 ACTIVE 实验任务书**；只纠正实际 product read / rebuild 顺序自保护，保留既有语义绑定与科学结果，完成即归档 | Codex 下发；Claude Code 执行 |
| `TASKBOOK-P<n>-*.md` | **当前 ACTIVE 产品任务书**：`TASKBOOK-P9R-RELEASE-ONE-MAC-V070-2026-10-18.md`（发版一：Mac 版 v0.7.0，下一窗执行，开工先问 §4 四件）。P9H（发版一之前的扫尾 + 插队的专注时间、织布）已验收通过，在 `archive/product-taskbooks/TASKBOOK-P9H-PRE-RELEASE-SWEEP-2026-10-16.md`。P9G（拆项目）已验收通过，在 `archive/product-taskbooks/TASKBOOK-P9G-PROJECT-SPLIT-2026-10-16.md`；P9E（私密项目）已验收通过，在 `archive/product-taskbooks/TASKBOOK-P9E-PRIVATE-PROJECTS-2026-10-15.md`；P9D（丢字修复）已验收通过，在 `archive/product-taskbooks/TASKBOOK-P9D-DRAFTS-SURVIVE-QUIT-2026-10-15.md`；P9C（AI 入口统一）已验收通过，在 `archive/product-taskbooks/TASKBOOK-P9C-AI-ENTRY-LOCKS-2026-10-14.md`；P9B 已验收通过，在 `archive/product-taskbooks/`；修补 P9F 已验收通过，在 `archive/product-taskbooks/TASKBOOK-P9F-PRE-RELEASE-FIXES-2026-10-11.md`；P9A 的核对和裁定在 `archive/product-taskbooks/TASKBOOK-P9A-AUDIT-KNOWN-ISSUES-DESIGN-DEBTS-2026-10-10.md`；P1、P1B、P2 – P9 都已验收，都在 `archive/product-taskbooks/`）；这一窗做什么、按什么顺序、怎么验。做完移进 `archive/product-taskbooks/`。产品线的任务库与红线已并进 `HANDOFF-2026-09-04.md` §10（原 `WORKPLAN-2026-08-22.md` 2026-09-30 归档） | 下发窗写；执行窗执行 |

两份 handoff 的分工，别搞混：**执行光标只在 Codex 那一份**（它的 §8 列了所有不许恢复的旧光标）；
`HANDOFF-2026-09-04.md` 只管「仍然生效的约束」和「还没做完的事」，里面不许再出现「下一步 = …」。

**文档管理规则写在 Codex handoff 的 §10**：三条硬规矩（一件事只待一个地方、首屏自报状态、
做完就搬走）、每轮任务的固定文档动作、以及每份现存文件的作用表。docs 由 Codex 统一管理，
本 README 是它的目录视图，改动文件时两边一起更新。

---

## 二、记忆研究线

| 文件 | 干什么用 | 状态 |
|---|---|---|
| `AI_MEMORY_EXPERIMENT_PROTOCOL-2026-08-26.md` | 实验协议 v0.1（预注册候选）。正式跑的冻结版在实验仓 `~/Desktop/spool-research`，不在这里 | 设计件，被 `EXECUTION_POLICY` 点名引用 |
| `DESIGN_PROJECT_MEMORY.md` | 「项目工作记忆」的设计稿 + 三线发展框架 | 研究前设计，未进入施工 |
| `RESEARCH_ANSWER_PROVENANCE-2026-08-29.md` | AI 回答可溯源的调查报告 | 只读调查，未批准施工 |
| `RESEARCH_RAG_CONTEXT-2026-08-24.md` | 用 RAG / 知识库技术增强上下文管理的调研 | 只读调研，未批准施工 |

---

## 三、产品设计稿（还有没做完的格，所以留在这里）

| 文件 | 还欠什么 |
|---|---|
| `DESIGN_WINDOWS_PORT.md` | 首版随 v0.6.0 / v0.6.1 发过；不签名是 Ocean 定的（红线，不再问）；下一次 Windows 包在发版二（第 73 条） |
| `WINDOWS-CHECK.md` | 第三、四轮还没装机验；发版二前先从 `main` 手动跑一次 `windows-build`，再照这份装机验（P1 – P9 的 Windows 部分还没在 Windows 上跑过，见 HANDOFF `DISCOVERED-20261010-9`） |
| `DESIGN_CASE_STUDY.md` | 申请用 case-study 的计划与维护规矩；后面几期还在等 |

---

## 四、事实与对外口径

| 文件 | 干什么用 |
|---|---|
| `CASE_STUDY_LEDGER.md` | **可披露数字的唯一权威台账**（英文），只增不改。别在设计稿里再记一份 |
| `CASE_STUDY_PAGE.md` | 给人读的那一版八栏正文（英文），不许出现台账查不到的数字 |
| `Deepseek-API-compress-test.md` | 压缩 / 作废检测的实测台账，六轮原始数据与真实账单，只增不改 |
| `METRICS.md` | 下载量看板。注意那 32 次全是自测，真实外部用户 = 0 |
| `SPOOL_OVERVIEW.md` | 给第一次来的人或外部 AI 看的英文总览。⚠️ 里面那张 Pack 表头的表**已经过期**，判审四带 / Reference 规则以 `src-tauri/src/mcp.rs` + `src/lib/pack/templates.ts` 为准 |

---

## 五、手册（需要时查，不常改）

| 文件 | 干什么用 |
|---|---|
| `RELEASE.md` | 发版流程（Developer ID 签名 + 公证 + `.dmg` 直发） |
| `RELEASE_NOTES_v0.6.2.md` 等四份 | 各版本发布说明原文，`gh release create --notes-file` 用的就是它们 |
| `DB_BACKUP_AND_RECOVERY.md` | 真库备份与恢复，动库之前必读 |
| `PRIVACY.md` | 隐私声明。改它必须同时改 `site/privacy.html` 和 `scripts/site-zh-privacy.html`，再跑 `node scripts/build-site-zh.mjs` |

---

## 六、`archive/` —— 做完的、作废的、只用来查历史

规矩不变：**archive 里的东西一律不用来开工**，只用来查「当初为什么这么定」。

2026-09-05 这次清理移进去的：

- 已 SUPERSEDED 的开工面：`HANDOFF-2026-08-22.md`、`HANDOFF-2026-08-30.md`、`NEXT-WINDOW-PROMPT-2026-08-27.md`
- 跑完就作废的一次性清单：`OVERNIGHT-TEST-PLAN-2026-08-23.md`、`OVERNIGHT-TEST-PLAN-2026-08-24.md`、`QA_SITE_2026-08-13.md`
- 已经全做完的那几摊：`TEN-ITEMS-2026-08-27.md`、`FIND-UX-2026-08-27.md`、`COMPRESS-UX-2026-08-22.md`、`CHECK-DISPLAY-2026-08-21.md`、`FIX_TAILWIND_ALPHA-2026-08-19.md`
- 已落地的设计稿：`DESIGN_CAPTURE_FOCUS.md`、`DESIGN_FIRST_DAY_VALUE.md`、`DESIGN_LIBRARY_TRANSFER.md`、`DESIGN_VALENTINE_EDITION.md`；2026-10-13 又移进 10 份（P9A 核过早已全部落地，Ocean 10-11 第 84 条）：`DESIGN_AI_ENGINE.md`、`DESIGN_CONTEXT_HYGIENE.md`、`DESIGN_FOLLOW_UP.md`、`DESIGN_MCP_INTENT_ROUTING.md`、`DESIGN_MCP_WRITE_ROLE.md`、`DESIGN_PROJECT_FILES.md`、`DESIGN_WORKBENCH.md`、`DESIGN_WORKSPACE_PACK.md`、`COMPRESS-UX-R2-2026-08-22.md`、`FEEDBACK-FORM-2026-08-22.md`
- 留档不开工的：`PROMO-VERDICT-2026-08-20.md`、`DEMO_SCRIPT.md`、`REVIEW_MEMTRAPBENCH-2026-08-21.md`、`MCP_LAB_PROMPT.md`、`MCP_SCREENSHOT_GUIDE.md`
- `archive/stage0a-taskbooks/` —— Stage 0-a 已验收 / 已被纠正的 36 份任务书（D2 到 GR15R3）；根目录当前另有 1 份 ACTIVE GR15R4 任务书
- `archive/HANDOFF-2026-09-04-FULL-PROCESS-LOG.md` —— 精简前的 2455 行完整过程流水（逐窗记录、已消耗的预算与提示词），一个字没删

原有的子目录：`archive/mcp-reviews/`（三轮 MCP 评审原始记录）、`archive/site/`（官网改版评审）、`archive/promo-2026-08-20-discarded/`（被否掉的第一批物料）。

---

## 七、不在 git 里的

- `ID.txt` —— 签名 / 公证用的 Apple 凭据，`.gitignore` 挡着，别提交、别贴进任何文档
- `screenshots/S2-1.png`、`S2-2.png`、`mcp-filed-full-2026-08-13.png` —— 拍了但没采用的图
