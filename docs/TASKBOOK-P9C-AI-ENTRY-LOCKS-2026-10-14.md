# 产品任务书 P9C —— AI 入口统一：没准备好的地方锁着，当场就能打开

> **状态：ACTIVE。**（2026-10-14 下发。P9B 已验收通过 —— HANDOFF §9.2 第 92 条。）
>
> **唯一交付：** 下面 §3 的四步（P9C-1 – P9C-4），按顺序做完，每一步测试通过、单独一笔提交，并在 §7 写回执。
>
> **来历：** P9B 验收时 Ocean 对 `DISCOVERED-20261014-1` / `-2` 给的做法（HANDOFF §9.2 第 93 条原话：「所有界面保持统一，但是没装AI engine的用户看到有地方是锁着的，然后锁着的地方提示用户去打开，给一个快捷键，不需要返回设置；装了 CLI、但「允许 AI 写入」关着的人：周回顾有关的也可以直接让用户在窗口打开，不需要回设置」），P9B 执行窗问的三件（第 94 – 96 条），下发这一窗问的三件（第 97 – 99 条）。
> 那两条 DISCOVERED 的正文从 HANDOFF §9.9 **搬过来**了（§3 P9C-2；HANDOFF 那边只留一行「已下发到 …」）。
> **「现在」一栏每一条都对着 `9243602`（代码 = `76c8d10`）核过**，真机设置是 10-14 只读看的。
>
> **授权来源：** 都是 Ocean 自己的拍板，本任务书只引用、不改：
> - 第 93 条（上面那段原话）；
> - 第 94 条：所有用 AI 的地方都这样 ⇒ 推翻 08-17「没有 CLI 就不显示」（以及 `lib/engine/gate.ts` 头注释、DESIGN_AI_ENGINE §1.1 的「安静原则」）；
> - 第 95 条：锁上的按钮在当前页弹一小块设置，不跳设置页；第 96 条：发版一之前做；
> - 第 97 条：Windows 上只靠本机引擎的两个按钮照旧不显示，本机引擎上 Windows 记进 HANDOFF 以后研究；
> - 第 98 条：「显示 AI 维护动作」关掉 = 什么 AI 的地方都不显示，锁也不显示（这个开关挪到「AI 引擎」页最上面，管所有地方）；
> - 第 99 条：块工具条上的「压缩」、项目管理每一行的「排进今晚自动压缩」不放锁，项目里那个页签上的锁就够了。
>
> **边界：** 只做这四步。
> - 不碰实验线：`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行。
> - 不动 `docs/EXECUTION_POLICY.md`。
> - **库结构一个字不改**（真库停在 v33）。`settings.json` 不加新键（「显示 AI 功能」还是 `aiEngineActionsEnabled`）。
> - **MCP 的工具、描述、输出格式都不改**；pack 的格式、golden 都不改。
> - **「准备好了没有」的判断本身不改**：`canShowEngineActions` 的四个条件、`effectiveAutoRoute`、DeepSeek 看的 `apiEngineEnabled`、跟进面板只看 CLI 在不在 —— 全照旧。这一份只改「没准备好的时候显示什么」。唯一的例外是第 98 条那个开关管的范围（P9C-1 第 3、4 条）。
> - **不花钱**：做和验都不需要调付费接口。DeepSeek 那一半的「打开」只存 key、拨开关，不发请求、不查余额。
> - **不碰 `engine.rs`**（Windows 上本机引擎那件事是 `DISCOVERED-20261014-3`，以后研究）。尽量不加 Tauri 命令（要用的都有了，见 P9C-1）；真要加，一律 `(async)`。
> - CSP 一个字不改；不加网络依赖（`cargo tree` 那条照旧必须是空的）。
> - 周回顾的 AI 部分（DeepSeek 改结构化、建议动作卡片、更新时弹消息）是 P10，这一份不碰。
> - 不 push、不发版。换装给 Ocean 验收之前先问一句（§5）。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：
   - 首屏、§9.0 – §9.4、§9.8 – §9.9；
   - §9.2 第 76、92 – 99 条；
   - §10.6 红线速查。这一份尤其要照着做的几条：「少用 emoji，一屏最多一个 ⚠️」「用户不能看到一个测试环境的 Spool」「主进程零出网，CSP 一个字不改」。
3. `CLAUDE.md` §3（只改该改的）和 §5（提交信息里不许有任何工具署名）。
4. 记忆：
   - `mcp-first-pivot`：「出去」走 sidecar 子进程、默认关闭，「不需要 API key」那句已经作废 —— DeepSeek 那一半要把「会出网、到哪家」说清楚；
   - `gemini-free-tier-closed`：弹出那一块为什么不劝人装 Gemini CLI；
   - `isolated-verify-workflow`：§45（把真组件 SSR 成静态页给 wk-snapshot 截图）、§46（WKWebView 加假 `__TAURI_INTERNALS__`、脚本点按钮再截）、§21 / §40 换装；
   - `spool-db-wipe-incident`：⛔ 别起 debug 版 GUI（同一个 identifier，会打开真库）；
   - `tauri-sync-commands-freeze-ui`、`ui-language-follows-system`、`no-test-environment-spool`、`write-plainly-for-ocean`。
5. 每一步开工前，读该步「现在」一栏点名的文件。

## 2. 起点

- **分支和提交：** 本地 `main`。下发本任务书的那笔 docs 提交（标题以 `docs: 下发 P9C` 开头）的上一笔是 `9243602`；代码停在 `76c8d10`（P9B-3）。
  - 开工时只多了 docs 提交 ⇒ 「现在」一栏照旧成立，直接开工。
  - 多了改代码的提交 ⇒ 先 `git diff 76c8d10..HEAD --stat`；凡是碰到 §2.1 表里那些文件的，对应那一行重核，回执里写核的结果。对不上就停下来说明。
- **只提交自己的文件：** 工作树里有别人没提交的改动（`docs/` 下研究线的文件、`docs/README.md` 里研究那几行）。
  - 只 `git add` 你自己改的文件的路径，绝不 `git add -A` / `git add .` / `git commit -a`。
  - README 要改的话只暂存自己那一行：拿 HEAD 版本只换那一行，用 `git hash-object -w` + `git update-index --cacheinfo`。
- **删文件会被权限拦：** `git rm` 写给 Ocean，请他在输入框里用 `! git rm …` 跑；`git mv` 能自己跑。
- **提交：** 每步一笔，提交信息用中文。提交后跑 `CLAUDE.md` §5 那条自查；命中产品内容里的 claude 字样，按记忆 `attribution-grep-false-positive` 复核。
- **测试基线**（`76c8d10` 上 P9B 收尾时实测；开工前先跑一遍对一下，每步做完再跑）：

```bash
npx tsc -b                                                # 干净
npx vitest run                                            # 92 个文件 / 1056 条全过
cargo test --manifest-path src-tauri/Cargo.toml           # 192 过 · 5 跳过
cargo test --manifest-path src-tauri/sidecar/Cargo.toml   # 14 过
node scripts/i18n-check.mjs                               # (none missing)
node scripts/i18n-check.mjs --dead                        # 87 行 DEAD（基线噪声），只看你造出来的
cargo tree --manifest-path src-tauri/Cargo.toml -e normal | grep -iE "ureq|rustls|reqwest|hyper|openssl"   # 必须是空的
```

  Vitest 输出里那几十行 `[db] pre-migration backup FAILED … window is not defined` 是老噪声。`cargo test` 偶发 2 条失败（`DISCOVERED-20261007-2`），重跑一遍再判。

- **真机现状**（10-14 只读，⛔ 别写）：`settings.json` 里 `mcpEnabled` = true、`mcpWriteEnabled` = true、**没有** `aiEngineActionsEnabled`（= 默认开着）、`apiEngineEnabled` = true、`aiAutoMaintain` = true、`compressNightlyAt` = `23:55`、`compressQueue` = `[]`、`language` = `zh`；`claude` 和 `codex` 都装着。
  ⇒ Ocean 的机器上平时看到的是「全都准备好了」。锁着的样子要靠他临时关开关来看（§6）；**「本机没有 CLI」那种样子他的机器上做不出来，只能看截图**。
- 新装的默认值（`settingsStore.ts` 371 – 427 行）：`mcpEnabled` = **false**、`mcpWriteEnabled` = true、`aiEngineActionsEnabled` = true、`apiEngineEnabled` = false。⇒ 一个刚装好、也装了 Claude Code 的人，差的是「MCP 服务」那一个开关。

### 2.1 现在：每一处用 AI 的地方（`76c8d10`）

「准备好」= 那个入口今天画出来、能点的条件。

| # | 地方（文件:行） | 走哪条路 | 准备好 = | 没准备好时今天什么样 | P9C 之后 |
|---|---|---|---|---|---|
| 1 | 周回顾顶上的引擎条：「回顾这一周（用 X）」两个按钮、选模型、「每周自动回顾一次」（`ReviewBoard/index.tsx` 170 – 175、211 – 364） | 本机 CLI 或 DeepSeek | CLI：`canShowEngineActions`（CLI 在 + MCP 服务 + 允许 AI 写入 + 显示 AI 维护动作）；DeepSeek：`apiEngineEnabled` | 两条都不通：整条不画，标题底下空一块（`-1`）；空列表那句也不写（`emptyReviewsHint` 给 null，`-2`）。CLI 在、开关没开全、DeepSeek 开着：只出 DeepSeek 那个**按字数花钱**的按钮，免费那条差一个开关这件事一个字不提 | 锁 / 就地打开开关（P9C-2） |
| 2 | 右栏「跟进内容」底下的「联网搜索」（`RightRail/index.tsx` 341 – 364） | 本机 CLI | `canShowEngineActions` 且开着一个项目；还要有跟进行。Gemini 换成一句说明 | 不画 | 锁（P9C-3，只在 Mac） |
| 3 | 右栏结果区那句「装了 Claude Code 或 Codex，并打开「允许 AI 写入」之后，这里才有东西。」（`RightRail/index.tsx` 255 – 267） | — | — | 只在 CLI 在、闸不通、又没有卡片时出现；一句话，没有按钮 | 删掉（P9C-3） |
| 4 | 跟进面板（编辑）里「让 AI 看看还缺什么」（`ThreadView/FollowUpPanel.tsx` 38 – 45、181 – 203） | 本机 CLI | `engineStatus.available`（**只看 CLI 在不在，不看开关**） | 换成一句「这台电脑上没有本机 AI 引擎……接了 MCP 的 AI……读得到它们」 | 锁（P9C-3，只在 Mac） |
| 5 | 跟进面板底部选引擎 / 模型那一行（`FollowUpPanel.tsx` 230 – 241、`RightRail/EngineBar.tsx`） | — | CLI 在 | 不画 | 不变（是选择器，不是入口） |
| 6 | 项目里的「压缩」页签（`ThreadView/index.tsx` 60、136 – 155、183 – 186；`Compress/CompressBoard.tsx`） | DeepSeek | `apiEngineEnabled` | 页签不画 | 锁，页签里当场填（P9C-4） |
| 7 | 项目里的「过期检测」页签（`ThreadView/index.tsx` 65 – 70、187 – 190；`Compress/StaleReview.tsx` 82） | DeepSeek | `apiEngineEnabled`，或者之前扫出来的还没点完 | 不画（有没点完的照出） | 锁，页签里当场填（P9C-4） |
| 8 | 块工具条上的「压缩」（`ThreadView/BlockItem.tsx` 150、1214 – 1220） | DeepSeek | `apiEngineEnabled` 且项目还在 | 不画 | **不变**（第 99 条） |
| 9 | 项目管理每一行「排进今晚自动压缩」（`ProjectBoard/index.tsx` 87、291） | DeepSeek | `apiEngineEnabled` 且项目没完成 | 不画 | **不变**（第 99 条） |
| 10 | 右栏「压缩」格：别的项目压好的（`Compress/CompressRail.tsx`） | DeepSeek | `apiEngineEnabled`，且有东西要认领 | 不画 | 不变（是结果单，不是入口） |
| 11 | 自动的两样：每周自动回顾（`hooks/useAutoMaintain.ts` 72 – 124）、今晚自动压缩（`Compress/NightlyRunner.tsx`） | 两条 / DeepSeek | 同 #1 / `apiEngineEnabled` | 后台跑，没有界面 | 「显示 AI 功能」关着就不跑（P9C-1 第 4 条） |
| 12 | 设置 →「AI 引擎」页（`Settings/index.tsx` 112 – 121）：上面 DeepSeek（`ApiEngineConfig.tsx`），下面「本机 AI 引擎」（`EngineConfig.tsx`，只在 Mac）。「显示 AI 维护动作」在 `EngineConfig.tsx` 里，**只在检测到 CLI 时才出现**，也只管 CLI 那条路 | — | — | — | 挪到页最上面，管所有地方（P9C-1 第 3 条） |

**不是 AI 入口、P9C 不碰：** 右栏 `LiveRun`、项目顶栏「在跑」那颗、`RunCard`、右栏「AI 写的」、周回顾的「活动」和过去的回顾、「摘要」页签（MCP 写进来的）、待审。这些是结果和历史，「显示 AI 功能」关着也照旧在。

## 3. 四步

### 共同的规矩

- **大白话，少用 emoji**：锁用图标（lucide `Lock`），不用 emoji；一屏最多一个警示符号（§10.6）。所有新字都要有英文，走 `t()`。
- **颜色只从 token 来**，经典浅色 / 经典深色 / 情人节三套都不用在组件里分支。
- **锁着的样子各处一个样：** 那个入口本来的名字（灰的）+ 一把锁 + 一句「为什么锁着」+ 一个按钮。按钮点了在**当前页**弹出那一小块（P9C-1 的「AI 引擎」小块），不跳设置页、不切页签、不换视图。
- **只在「一条能走的路都没有」时才锁。** 有一条通了就照今天画 —— 不劝已经能用的人去开第二条，尤其不劝人去开花钱的那条。唯一例外是第 93 条点名的：本机有 CLI、只是开关没开全，那条免费的路就差一下，在那个位置直接给打开（P9C-2）。
- **「显示 AI 功能」关着 ⇒ 锁也不画、入口也不画**（第 98 条），连已经准备好的也不画。
- **Windows**（`IS_MAC` 为假）：只靠本机引擎的入口照旧不画（第 97 条）；弹出那一小块里不出 CLI 那一半。
- **截图：** 每一步回执附截图路径。「本机没有 CLI」的样子用记忆 `isolated-verify-workflow` §45 / §46 的办法截；中文、英文各一套。

### P9C-1 · 共用的两样：一条规则 +「AI 引擎」那一小块；「显示 AI 功能」管所有地方

- **来历：** 第 95、97、98 条。
- **现在：** §2.1 第 11、12 行；`lib/engine/gate.ts` 全文（头注释写的是 08-17 的「安静原则」：没装就整组不画、不给灰的、不给提示）；设置里现成能用的：`saveApiKey` / `loadApiKey` / `apiKeyPresent` / `sidecarPresent`（`lib/ai/compress.ts`）、`open_mcp_client_page`（`EngineConfig.tsx` 装 CLI 那几个链接用的）、`useEngineStore.probe`、`ui/useMenuPosition.ts`。
- **要做：**
  1. **一条规则**（纯函数，写在 `lib/engine/gate.ts`，有测试）：一个入口给进来「它今天准备好了没有」（**各处照今天的算法算**，见边界那条）、它要哪条路（`any` = CLI 或 DeepSeek / `cli` / `api`）、「显示 AI 功能」开没开、是不是 Mac，得出 `ready` / `locked` / `hidden`：
     - 「显示 AI 功能」关着 ⇒ `hidden`；
     - 准备好了 ⇒ `ready`；
     - 只要 CLI 的入口、又不是 Mac ⇒ `hidden`（第 97 条）；
     - 其余 ⇒ `locked`。
     再给一个：锁着的时候弹出那一块该出哪几样 —— 要不要 CLI 那一半、那一半是「去装」还是「打开开关」（差的是哪几个）、要不要 DeepSeek 那一半。
     `gate.ts` 头上那段「安静原则」注释改写成现在的规矩，写明推翻了什么（08-17、DESIGN_AI_ENGINE §1.1），引第 93 – 99 条。
  2. **「AI 引擎」那一小块**（一个组件）：贴着点的那个按钮弹出（定位用 `ui/useMenuPosition.ts` 那一套，或者执行窗找到的更合适的现成做法，回执说明）；Esc 和点外面都能关；也要能直接放进一个页面里（P9C-4 用）。里面按需要出两半，**不花钱的在前**：
     - **「用本机的 Claude Code / Codex（不花钱）」—— 只在 Mac：**
       - 没检测到：「装 Claude Code」「装 Codex」两个链接（和设置里那两个一样，走 `open_mcp_client_page`），一句「装好之后，在终端里登录一次它自己的账号」，一个「装好了，再检测一次」（`probe()`）。⛔ 不出 Gemini（记忆 `gemini-free-tier-closed`；跟进的联网搜索它也跑不了）。
       - 检测到了、开关没开全：说清还差哪几个（「MCP 服务」「允许 AI 写入」），一个「打开」把差的一起打开。⚠️ 要老实说：这两个开关也管你接的别的 AI（Claude、ChatGPT 里的 Codex 这些），打开之后它们也能往库里加块，加的块都带来源（意思照 `McpConfig.tsx` 157 行那句）。
     - **「用 DeepSeek（按字数花钱，用你自己的 key）」：**
       - ⚠️ 设置里那段常驻的话原样带上：「Spool 主程序不发任何网络请求。打开这个开关之后，请求由 Spool 启动的一个本地小程序发出，用你自己的 key 和额度，内容会到达你选的那家模型厂商。」（`ApiEngineConfig.tsx` 头注释：§6.3「不要因为不好讲就不讲」。）
       - 已经存过 key（`apiKeyPresent`）⇒ 只给一个「打开」；没存过 ⇒ 一个 key 框（密码框，存法和设置里一样，进钥匙串）+「打开」，框空着点不了。
       - 「打开」= 存 key + `apiEngineEnabled: true`。⛔ 不发任何请求、不查余额。
       - 接口地址、模型、思考力度不放这里（默认就是 DeepSeek），一句「接口地址和模型在设置里改」就够。
       - 找不到那个小程序（`sidecarPresent` 为假）⇒ 照设置里那句红字，不给「打开」。
     - 打开之后：这一小块自己关上，原来锁着的地方**马上**能用（不切页、不重启）。
  3. **「显示 AI 维护动作」改名「显示 AI 功能」**（英文执行窗定），挪到「AI 引擎」页最上面：Mac 和 Windows 都有、不管检测没检测到 CLI 都在。一句说明：关掉之后，所有要用 AI 的按钮和锁都藏起来；已经写好的回顾、AI 写的块照旧在。键还是 `aiEngineActionsEnabled`（不迁、不改名）。`EngineConfig.tsx` 里跟着它的那两句（「需要 MCP 那一页的两个开关都打开……」和第 130 行那句提示）搬走或者删，执行窗看着办，回执写清。
  4. **关着它的时候，自动的两样也不跑：** 每周自动回顾（两条路都不跑）、今晚自动压缩。⛔ 看不见的东西不许花钱。（这一条是下发这一窗从第 98 条推出来的：开关藏起了「每周自动回顾一次」那个开关和夜里那张队列，藏起来还照跑，就是一个看不见的地方在花钱。Ocean 开工前说不要，就删掉这一条。）
- **不做：** 不改「准备好」的判断 —— DeepSeek 开着但没填 key 照旧算开着（按了会报「key 不能是空的」）；不改设置页别的东西（`EngineConfig.tsx` 详细说明里那句过时的「Spool 里没有填 API key 的地方，以后也不会有」记成 `DISCOVERED-20261014-4`，这里不改）。
- **验收：**
  - 规则的 vitest 覆盖整张表：三种入口 × 准备好没有 × 「显示 AI 功能」开关 × Mac / Windows；弹出内容那一个也覆盖：CLI 没装 / CLI 在差 MCP 服务 / CLI 在差允许 AI 写入 / 两个都差 / DeepSeek 有 key / 没 key / 找不到小程序。
  - 「打开」那几下只改它该改的键：测试里断言 `update` 收到的就是那几个键。
  - 截图：小块的几种样子；设置页最上面那一行（`IS_MAC` 真 / 假各一张）。

### P9C-2 · 周回顾

- **来历：** 第 93、94 条。下面两条是从 HANDOFF §9.9 **搬过来**的原文。
- **`DISCOVERED-20261014-1` · 没有引擎时，周回顾页顶上那一大块空着**
  - 路线：P · 类型：UI 细节 · 严重度：P3 · 状态：approved（Ocean 10-14 第 93 – 96 条，并进 P9C）
  - 来源：P9B-3 截「没有引擎」的整页时看到
  - 证据：`ReviewBoard` 的标题栏用的是和项目顶栏一样的固定高度（`CENTRE_HEADER_HEIGHT`），以前那块下面紧跟着引擎条；P9B-3 之后没有 CLI / DeepSeek 的人也能进这一页，引擎条不画，于是标题和「活动」之间空着一大块
  - 影响：只在没有引擎时；看着像少了什么，功能没问题
  - 建议：等 Ocean 验收时看一眼，嫌空再定（比如没有引擎时标题栏收矮）
  - 验收标准：没有引擎时这一页上半截不显得空
- **`DISCOVERED-20261014-2` · 装了 CLI 但「允许 AI 写入」关着的人，周回顾空列表不再提示那个开关**
  - 路线：P · 类型：非阻断 · 严重度：P3 · 状态：approved（Ocean 10-14 第 93 – 96 条，并进 P9C）
  - 来源：P9B-3 照任务书改空列表那句话时
  - 证据：以前 `engineReady` 为假时写「装了 Claude Code 或 Codex，并打开『允许 AI 写入』之后，这里才有东西」，那句话在「装了 CLI、开关关着」这种情况下点出了一个能拨的开关；任务书 P9B-3 第 3 条要求 CLI 和 DeepSeek 都没准备好时不写那句，于是这一种情况现在什么都不写（引擎条也不画）
  - 影响：这一小类人进了周回顾只看得到「活动」，不知道打开开关就能让 AI 写回顾；设置里那个开关照旧在
  - 建议：需要的话只给「本机有 CLI、开关关着」这一种情况留一句指向开关的话（不提「去装」）—— 要 Ocean 定
  - 验收标准：Ocean 定了之后照办 ⇒ **他定的是：在这个窗口里直接打开（第 93 条），下面第 2 条**
- **现在：** §2.1 第 1 行；`ReviewBoard/index.tsx` 62 – 67（`emptyReviewsHint`）、366 – 381（P9B-3 那段注释和空列表）；`reviewEntry.test.tsx`。
- **要做：**
  1. **一条路都不通（`locked`）：** 引擎条照样画（顶上那一块就不空了 —— `-1` 这样解决），里面是灰的「回顾这一周」+ 锁 + 一句（意思：写回顾要用一个 AI —— 本机的 Claude Code / Codex，或者 DeepSeek）+ 按钮 → 那一小块（`any`）。锁着时「每周自动回顾一次」、选模型都不画。
  2. **CLI 在、开关没开全（不管 DeepSeek 开没开）：** 在 CLI 那个按钮原来的位置，给「用 {Claude Code} 回顾，不花钱 —— 先打开写入」那一下，直接把差的开关打开（可以就是弹那一小块，也可以是一个就地的按钮，执行窗定，回执写）。DeepSeek 开着的话它的按钮照旧在旁边。打开之后 CLI 那个按钮马上回来。
  3. **空列表那句话：** 准备好了 ⇒ 照今天那句；锁着 ⇒ 不另写（锁那一行已经说了）；`hidden` ⇒ 什么都没有。`emptyReviewsHint` 和它的测试跟着改；`366 – 381` 那段注释照新规矩改写。
  4. **「显示 AI 功能」关着：** 整条不画、空列表什么都不写，这一页只剩「活动」和过去的回顾（和 P9B-3 一样）。那时标题底下空出来的那一块不管 —— 是他自己关的。
- **不做：** 不改两个按钮、选模型、自动回顾那几样准备好之后的样子；不碰 P10 那几件。
- **验收：** `emptyReviewsHint` 的测试按新规矩改；截图五种：都准备好 / 全锁着 / CLI 差开关 + DeepSeek 关 / CLI 差开关 + DeepSeek 开 / 「显示 AI 功能」关着。

### P9C-3 · 跟进的两个按钮（只在 Mac）

- **来历：** 第 94、97 条。
- **现在：** §2.1 第 2 – 5 行。
- **要做：**
  1. **右栏「联网搜索」**：`locked` ⇒ 灰的「联网搜索」+ 锁 + 按钮 → 那一小块（`cli`）。照旧只在有跟进行的时候出现；用的是 Gemini 时那句说明照旧。
  2. **右栏结果区那句**「装了 Claude Code 或 Codex，并打开「允许 AI 写入」之后，这里才有东西。」**删掉** —— 入口上已经有锁了，同一件事不说两遍。那段注释（255 – 261 行）照新规矩改写。
  3. **跟进面板「让 AI 看看还缺什么」**：`locked` ⇒ 灰的按钮 + 锁 + 按钮 → 那一小块（`cli`）。那句「接了 MCP 的 AI……读得到它们，也能替你加一条、结束一条」留着、放在锁底下 —— 它说的是另一条路，照样对；前半句「这台电脑上没有本机 AI 引擎」只在真没检测到时才说。⚠️ 这个按钮今天只看 CLI 在不在，「准备好」的判断照旧，所以 CLI 在、开关关着时它照旧能点，不锁。
  4. **Windows：** 两处照旧不画（第 97 条）；跟进面板那句 MCP 的话照旧在。
  5. **「显示 AI 功能」关着：** 两处都不画，跟进面板那句话也不出。
- **不做：** 不改跟进行本身、编辑面板、选引擎那一行（§2.1 第 5 行）。
- **验收：** 截图：右栏锁着 / 准备好；跟进面板锁着 / 准备好；`IS_MAC` 为假时两处都没有。

### P9C-4 · 项目里的「压缩」「过期检测」两个页签

- **来历：** 第 94、99 条。
- **现在：** §2.1 第 6 – 10 行；`ThreadView/index.tsx` 60 – 80（`engineOn`、`showTabs` 和 Q4 那段注释）、130 – 190。
- **要做：**
  1. **DeepSeek 没开（`locked`）：** 两个页签照样画，名字后面一把小锁；点进去，页里是一句说清这一页干什么、要按字数花钱（用你自己的 DeepSeek key），底下直接摆着那一小块（`api`，不用再点一下才出来）。打开之后这一页马上变成平常的压缩 / 过期检测。
  2. 「过期检测」有之前扫出来、还没点完的：照今天出，不锁（那是等他决定的东西，不是入口）。
  3. 块工具条上的「压缩」、项目管理每行的「排进今晚自动压缩」、右栏「压缩」格：**不变**（第 99 条）。
  4. **「显示 AI 功能」关着：** 两个页签都不画（还没点完的过期检测照出）；块工具条上的「压缩」、项目管理那一行也不画 —— DeepSeek 开着也不画（第 98 条：什么 AI 的地方都不显示）。
- **不做：** 不改压缩、过期检测准备好之后的任何东西。
- **验收：** 截图：页签锁着、点进去那一页、打开之后；「显示 AI 功能」关着时项目页签条和块工具条。

## 4. 什么时候停下来问

- 起点不是 §2 写的那样，或者改过代码的提交让 §2.1 对不上。
- 要改「准备好」的判断本身（`canShowEngineActions` 的条件、`effectiveAutoRoute`、`apiEngineEnabled`），或者要动 `engine.rs`。
- 弹出那一小块里想放 Gemini、接口地址、模型；或者做不成「贴着按钮弹出」、只能跳设置页。
- 要加 Tauri 命令、要动库、要改 MCP 的工具 / 描述 / 输出、要改 pack 或 golden、要改 CSP、要加网络依赖。
- 想给块工具条或项目管理那一行加锁（第 99 条说不加）。
- 要删文件（请 Ocean 跑，见 §2）。
- 发现新问题：**不顺手修**，按 HANDOFF §8 的 DISCOVERED 格式记进 HANDOFF §9.9，继续做本任务。

## 5. 做完四步之后：换装给 Ocean 验收（先问）

- 四步都提交、全部测试通过之后，**先问 Ocean「现在换装吗」**，得到同意再做。
- 照 P9B 任务书回执 §7.4 那一段（`archive/product-taskbooks/TASKBOOK-P9B-…`），这一次也不迁库：
  - 换装前：`VACUUM INTO` 备份真库到桌面（文件名带日期）；`settings.json` 拷一份到桌面（文件名带日期）。
  - 现装的是 Developer ID：构建时 `APPLE_SIGNING_IDENTITY` 走环境变量，不改 `tauri.conf.json`，公证变量全部 unset；日志进文件。TSA 偶发失败就整个重跑。
  - ⚠️ **停 GUI 之前先问 Ocean：有没有开着、还没点「完成」的块编辑，或者输入框里没发出去的字。** 这两样都只在内存里，停进程就没了（`DISCOVERED-20261014-5`，10-14 他丢过两段）。他说没有了再停。
  - 停 GUI 和 `--overlay` **按 pid**，杀完再查一遍还在不在；`--mcp` 一个都不碰。旧包 `mv` 进 `~/Desktop/Spool/spool-pre-install/`，别删。
  - 换装后核：sha256 和构建产物一致；两个进程的 txt inode 是新文件；stderr 有 `[double-tap] installed at HID/active`；真库 `user_version` 仍是 33、`integrity_check ok`、各表计数和装前一致；`settings.json` 和装前一样（Ocean 动设置之前一个键都不该变）。
  - 这一次不改 MCP，旧的 `--mcp` 子进程照常能用，不用重启 AI 客户端。
- commit、build、换装分开记在回执里；**不 push、不发版**。

## 6. 给 Ocean 的验收单（大白话，换装后给 Ocean）

你的电脑上 AI 那些东西全开着，所以下面几条要你先关一个开关、看完再打开回来。最后一条说怎么全部还原。

1. 设置 →「AI 引擎」：最上面多了一行「显示 AI 功能」，开着。
2. 同一页把 DeepSeek 那个开关关掉（key 不会丢）。打开一个项目 ⇒ 「压缩」「过期检测」两个页签名字后面有一把小锁。点「压缩」⇒ 页里是一句说明，底下一个「打开」。点「打开」⇒ 马上变回平常的压缩页，不用再填 key。
3. 再把 DeepSeek 关掉。设置 →「MCP」把「允许 AI 写入」关掉。左栏点「周回顾」⇒ 顶上那一条写着用 Claude Code 回顾要先打开写入；点那一下 ⇒「回顾这一周（用 Claude Code）」那个按钮回来了。回设置看，「允许 AI 写入」已经开着。不用真的点回顾。
4. 再关掉「允许 AI 写入」（DeepSeek 也关着）。打开一个有跟进行的项目 ⇒ 右栏「联网搜索」是灰的，带一把锁。点旁边那个按钮 ⇒ 当场弹出一小块，点「打开」⇒「联网搜索」能点了。不用真的点。
5. 设置 →「AI 引擎」把「显示 AI 功能」关掉 ⇒ 周回顾只剩「活动」和以前的回顾；项目里没有「压缩」「过期检测」两个页签；右栏没有「联网搜索」；块的工具条上没有「压缩」。再打开回来。
6. 没装 Claude Code / Codex 的人看到的样子，你的电脑上做不出来（两个都装着），看我附的截图：周回顾、右栏、跟进面板、项目页签各一张。
7. 界面切成英文，上面看到的新字看一眼 ⇒ 都是英文。
8. 还原：DeepSeek 开着、「允许 AI 写入」开着、「显示 AI 功能」开着 —— 和验收之前一样。

你只要告诉我：这八条里哪几条不对，不对的那条你看到了什么。

## 7. 回执（执行窗填写）

每步一小段：

- 提交：`<hash> <标题>`
- 改了哪些文件（一行一个）
- 怎么验的：命令 + 结果（vitest / cargo 的条数，i18n-check 的输出原文），截图路径
- 施工时自己定的：规则函数叫什么、弹出那一小块的组件叫什么、放在哪、怎么定位；每一处锁着时那一句话和按钮上的字（中英）；「显示 AI 功能」的英文；P9C-2 第 2 条用的是弹出还是就地按钮；`EngineConfig.tsx` 那两句搬了还是删了
- 还差什么、有没有偏离本任务书、新发现记在 HANDOFF 哪里

最后一段：换装（做了没有、装的是哪个 commit、`spctl` 结果、真库和 `settings.json` 的备份文件名、装前装后的核对）、Ocean 验收（还没有就写「待验收」）。

## 8. 收尾的文档动作（执行窗做）

- 本任务书首屏改成 `COMPLETE —— 待 Ocean 验收`，`git mv` 进 `docs/archive/product-taskbooks/`。
- HANDOFF：§9.3 P9C 那一行写「已完成，任务书在 archive/…」；§9.2 记换装那一问；§9.8 写唯一下一步（Ocean 验收 P9C ⇒ 发版一）；新发现进 §9.9。
- `docs/README.md` 入口那一行跟着改（只暂存自己那一行，见 §2）。
