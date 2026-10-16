# 产品任务书 P9E —— 私密项目：右键设为私密，连着 Spool 的 AI 读不到它

> **状态：COMPLETE —— 待 Ocean 验收**（2026-10-16 四步做完：`b725625` `74ffd87` `058e305` `b0bbad2`；换装前插进来的更正块修复 `5b9b226`；**10-16 已换装，真库已迁到 v34** —— 回执 §7.6）
>
> （2026-10-15 下发时：**ACTIVE**）
>
> **唯一交付：** 下面 §3 的四步（P9E-1 – P9E-4），按顺序做完，每一步测试通过、单独一笔提交，并在 §7 写回执。
>
> **来历：** Ocean 10-15（HANDOFF §9.2 第 119 条）。他让 Codex 做一件事、写回 Spool，要求新建的项目不让别的 AI（比如 Claude）看见；Codex 回他「没有找到“仅禁止 Claude 读取某项目”的开关……这不构成技术上的访问封锁」。Ocean 的提法：做一个 Private 的项目类型，右键选 private 触发，说明 AI 读不到这个项目，项目上出现一个小图标或特殊标记；**排在发版一之前**。
> **「现在」一栏每一条都对着 `2eaa53f` 核过。**
>
> **授权来源：** 都是 Ocean 10-15 的拍板，本任务书只引用、不改：
> - 第 119 条：做私密项目，右键触发、说明、项目上有标记；发版一之前做；
> - 第 120 条：**AI 读不了，但写得进**（让 Codex 做任务时能一路写回）；
> - 第 121 条：**AI 建项目时能直接建成私密**；
> - 第 122 条：**Spool 自己用 AI 的功能都不碰私密项目**（周回顾不读它；项目里压缩 / 过期检测 / 跟进锁住，写一句为什么）；
> - 第 123 条：**外面的 AI 完全不知道私密项目存在**（列表、搜索、周回顾里都没有，问到就是「没有这个项目」）。
>
> **边界：** 只做这四步。
> - 不碰实验线：`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行。
> - 不动 `docs/EXECUTION_POLICY.md`。
> - 库结构只加**一列**（`threads.private`，v34，§2.2）；不改别的表。
> - 只有项目能设私密；**工作区不做**、单个块不做。
> - 用户自己的动作一律照常：复制 pack、导出、移动 / 复制块、捕捉进私密项目、「活动」图表（不用 AI 的）都不受影响。
> - 不加网络依赖（`cargo tree` 那条照旧必须是空的），CSP 一个字不改；新的 Tauri 命令一律 `(async)`。
> - 不 push、不发版。换装给 Ocean 验收之前先问一句（§5），**这次换装会把真库迁到 v34**。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：首屏、§9.0 – §9.4、§9.8 – §9.9；§9.2 第 116 – 123 条；§10.6 红线速查（「少用 emoji，一屏最多一个 ⚠️」「用户不能看到一个测试环境的 Spool」「主进程零出网」）。
3. `CLAUDE.md` §3（只改该改的）和 §5（提交信息里不许有任何工具署名）。
4. 记忆：`spool-db-wipe-incident`（⛔ 别起 debug 版 GUI；迁移的两条验证法；⛔ **每次迁移都要同抬 `mcp.rs` 的 `EXPECTED_SCHEMA_VERSION`**）、`mcp-tool-routing-required`（改了工具能做的事，路由文本要跟着改）、`mcp-tool-annotations-required`、`isolated-verify-workflow`（§44 探针连副本、§47 停 GUI 之前先问、§40 / §41 换装）、`ui-language-follows-system`、`no-test-environment-spool`、`write-plainly-for-ocean`。
5. 每一步开工前，读该步「现在」一栏点名的文件。

## 2. 起点

### 2.1 现在（`2eaa53f`）

| # | 地方 | 现在是什么样 |
|---|---|---|
| 1 | 项目表 | `src/lib/db/schema.sql` 的 `threads`（21 – 70 行）没有任何「对 AI 隐藏」的列；`auto_maintain` 是每个项目的自动维护开关，**不是**这个意思（08-11 起自动的只剩周回顾，那一列已经没人读来挑项目）。前端类型在 `src/lib/db/threads.ts` 的 `Thread`，改字段走 `patchThread` |
| 2 | 库版本 | `src/lib/db/client.ts` `SCHEMA_VERSION = 33`，迁移在同一个文件的登记表里（只许 ADD COLUMN 这类不动数据的步）；`mcp.rs` `EXPECTED_SCHEMA_VERSION = 33`。**MCP 的版本闸是双向的**（`open_db` 1405 行起）：库比服务新也拒 ⇒ 库一迁到 v34，换装前就开着的旧 `--mcp` 进程每次调用都报「库比服务新」，**不会**因为不认识新列而把私密项目交出去。这是选「库里加一列」而不是「写进 settings.json」的理由 |
| 3 | 导出导入 | `src/lib/db/transfer.ts` 按表列出要带的列（第 62 行 `attachments: ['target_identity', 'target_notice']` 是先例）；新列不登记的话，导出再导入私密就没了 |
| 4 | MCP 读 | 24 个工具 + 9 个提示词（`compress_pack` `weekly_review` `thread_health` `triage_conversation` `file_this` `catch_up` `distill` `follow_up_brief` `follow_up`，10137 行起）+ resources（`resources/list` / `resources/read`，10676 行起，按项目列出、按项目读）。挡「已删项目」的条件 `deleted_at IS NULL` 在 `mcp.rs` 里出现 **34 次**，「找不到项目」统一走 `no_such_thread()`（4276 行，10 处用到）和 `live_thread_title`（5301 行） |
| 5 | 跨项目引用 | 一个块引用了**别的项目**里的块时，pack 那一行会印出被引用块的前 40 个字（或它的批注）和那个项目的标题（`RefBlock`，453 – 474 行：`content` / `annotation` / `foreign_title`）；`get_blocks` 每一行带 `ref_thread_id`。⇒ 私密项目里的块被公开项目引用，就从这里漏出去 |
| 6 | MCP 写 | `add_block_json`（4891 行）的回执带 `thread_title`、`would_be_seq`（= 块数）；`corrected_quote` 要去被更正的那一块里逐字核对 —— 拿它对一个看不见的块反复试，就能一个字一个字探出里面写了什么。`propose_attach_file` / `propose_replace_file` 查「已经在项目里」时回已有文件的名字（`file_already_in_project`）。`create_thread_json`（4328 行）没有私密这个参数 |
| 7 | Spool 自己的 AI | 周回顾两条路：本机 CLI 那条是 CLI 里的 AI 自己调 MCP；API 那条 `weekly_review_via_api` 读的是 `mcp::weekly_material_for_api`（`api_engine.rs` 1433 行）—— 两条都从 MCP 那一层拿料。压缩（`compress_pack_via_api`、CLI）和过期检测（`stale_scan_via_api`）是用户在**一个项目上**点的，pack 由前端拼好交过去（`src/lib/ai/compress.ts`）；跟进在 `src/components/ThreadView/FollowUpPanel.tsx`。P9C 做的「锁着的 AI 入口」组件在 `src/components/AiSetup/LockedAiEntry.tsx`（灰掉 + 锁 + 一句 + 打开「AI 引擎」的按钮），用在 `RightRail`、`ReviewBoard`、`FollowUpPanel` |
| 8 | 不经 AI、但借用 `mcp::` 函数的 | `forward_duplicate_check`（用户移动 / 复制块时查重，`api_engine.rs` 507 行）和 `compress_duplicate_probe`（压缩前的查重）直接调 `mcp::forward_duplicates` / `mcp::find_similar_blocks_json`。⚠️ 过滤要是加在这些共用函数**里面**，用户往私密项目里移块的查重就坏了 |
| 9 | 右键菜单 | `src/components/Sidebar/ThreadListItem.tsx` 159 行 `onContextMenu`：现在菜单里只有「移到工作区」；多选时作用于整个选区（`acting`）。项目头在 `ThreadView` 里 |
| 10 | 图标 | `lucide-react` 的 `Lock` 已经被 P9C 用来表示「AI 入口没开」（`LockedAiEntry.tsx`）。私密项目的标记**别再用 `Lock`**，否则两件事长得一样 |

### 2.2 要先知道的一件事：「私密」挡的是什么

私密挡的是 **Spool 交给 AI 的东西**：通过 Spool 的 MCP 连上来的 AI，和 Spool 自己调用的 AI。它**挡不住**一个自己能读你电脑上文件的 AI（比如 Claude Code、Codex 在终端里）绕开 Spool 直接去读库文件或原文件。
⇒ 界面上所有说明都要照实说「**通过 Spool 连接的 AI 读不到**」，⛔ 不许写成「AI 读不到」「完全保密」「加密」这种绝对的话（Ocean 原话里的「AI无法读取本项目」落到界面上就按这个口径写）。

## 3. 四步

### 共同的规矩

- 每一步单独一笔提交；提交前跑全套测试（`npx vitest run`、`cargo test`），数字比基线只多不少。开工先记基线。
- 每一处改动都要有测试，测试先红后绿。
- 新加的中英文字串都进字典（字典检查那条测试会抓）。
- ⛔ 不起 debug 版 GUI（它会打开、迁移真库）。验迁移用真库副本 + `__migrateSchemaForTest`；验 MCP 用新二进制 `--mcp` 连副本（记忆 §44）。

### P9E-1 · 库 v34：项目多一列「私密」

- 现在：§2.1 第 1 – 3 行。
- 要做：
  1. `threads` 加 `private INTEGER NOT NULL DEFAULT 0`（ADD COLUMN，不回填，不走 rebuild 分支）；`schema.sql`、`client.ts` 登记表 v34、`SCHEMA_VERSION = 34`；`mcp.rs` `EXPECTED_SCHEMA_VERSION = 34`（同一笔里，别分开）。
  2. 前端 `Thread` 类型带上 `private`，`patchThread` 能改它。
  3. `transfer.ts` 导出导入带上这一列。
- 不做：界面（P9E-4）、MCP 过滤（P9E-2）。
- 验收：真库副本（`VACUUM INTO` 到 scratchpad）上跑真迁移，`fresh === false`、各表计数和正文总长前后相等、所有项目 `private = 0`；导出再导入，私密还在；旧版本号的 `--mcp`（装着的那个）连迁过的副本，报「库比服务新」。

### P9E-2 · MCP：读看不见，写得进，AI 能建成私密

- 现在：§2.1 第 2、4、5、6、8 行。
- 要做（一条一条都要有测试）：
  1. **读一律看不见**（第 123 条）：所有工具、提示词、resources 里，私密项目和它的块、文件、图片、跟进、摘要都不出现，**连数量都不出现**（`list_threads` 的条数、`get_digest` 里工作区的项目数、`weekly_review` 的统计、`search_blocks` 的 total、`find_similar_blocks` / `thread_health` / `check_library` 跨库的那些）。点名私密项目的 id 去读，回的话和「没有这个项目」**一字不差**。
  2. **跨项目引用**：公开项目里的块引用了私密项目里的块 —— pack 那一行和 `get_blocks` 都只说「引用的那一块 AI 看不到」，不带它的字、批注、项目标题；`ref_thread_id` 给 null。私密项目里的块引用公开块，不受影响（那个私密块本来就不出现）。
  3. **写得进**（第 120 条）：`add_block`、`propose_blocks` 能写进私密项目，`propose_attach_file` 能提给私密项目。
     - ⛔ 回执里**不带私密项目里的任何东西**：不带标题、块数、序号（`would_be_seq` 之类）、已有块的字、已有文件的名字。只说写进去了、它自己写的那条的 id。「已经在项目里了」这种回执也不说是哪个文件。
     - ⛔ `ref_block_id` 指向私密项目里的块（不管写到哪个项目），一律当「没有这一块」处理 —— `corrected_quote` 的核对**不许**对私密块跑（§2.1 第 6 行：那是一个能逐字探内容的口子）。
     - 写到私密项目时，凡是会把已有内容拿出来比的检查（查重、相似块提示……）都不跑、或者跑了也不报。
  4. 其他碰**已有内容**的写工具 —— `set_thread_summary`、`set_block_gist`、`propose_supersede`、`propose_replace_file`、`request_file_access`、`suggest_follow_up_item`、`close_follow_up_item` —— 对私密项目都当「没有这个项目 / 没有这一块」。
  5. **AI 能直接建成私密**（第 121 条）：`create_thread` 加一个可选参数 `private`（默认 false）。工具说明写清：建成私密之后，连着 Spool 的 AI（包括你自己）都读不到它，只能往里写；用户在 Spool 里全看得见、能取消。annotations 不变。
     路由文本跟着改（`mcp-tool-routing-required`）：`OPENERS` 加一行，大意「这个项目别让别的 AI 看到 / keep this project away from other AIs → create_thread(private=true)」。⛔ 指令和说明里**只讲怎么建**，不讲「库里现在有几个私密项目」这种事。
  6. **过滤加在「交给 AI」那一层**：§2.1 第 8 行那几条用户自己的动作（移动 / 复制时的查重）在私密项目上照常能用。具体怎么分层由执行窗定，但要有一条测试证明：往私密项目里移块，查重照样查。
- 验收（最要紧的一条，写成测试）：**金丝雀测试** —— 建一个库：一个私密项目，里面的标题、块、批注、gist、文件名、文件正文、图片说明、跟进行、项目摘要都含同一个怪字符串；一个公开项目，里面有块引用私密项目的块。然后把 24 个工具、9 个提示词、`resources/list` / `resources/read` 用各种参数全调一遍（包括直接点名私密项目和它的块的 id），**任何一个输出里都不许出现那个字符串，也不许出现私密项目的 id**（写工具回执里那条新写的块 id 除外）。再加：写进私密项目成功、回执里没有标题和序号；`create_thread(private=true)` 建出来的，`list_threads` 里没有。

### P9E-3 · Spool 自己的 AI 不碰私密项目

- 现在：§2.1 第 7 行。
- 要做（第 122 条）：
  1. 周回顾两条路都不读私密项目（API 那条读的是 `mcp::weekly_material_for_api`，P9E-2 过滤到了就到了 —— 要有一条测试证明；CLI 那条走 MCP，同理）。
  2. 私密项目里，压缩、过期检测、跟进、右栏 AI 那几格：显示成锁着的样子，一句「私密项目，通过 Spool 连接的 AI 读不到」。⚠️ 和 P9C 的锁不是一回事：这里**没有**「打开 AI 引擎设置」那个按钮（设置好了也没用），出路是右键取消私密。样子可以借 `LockedAiEntry` 的灰和排版，图标不用 `Lock`（§2.1 第 10 行）。
  3. 后台挑项目的地方（若有自动跟进 / 自动跑的）一律跳过私密项目。执行窗开工时把「后台会挑项目去用 AI 的地方」全列一遍写进回执。
- 不做：「活动」图表（不用 AI）照常算私密项目。
- 验收：测试 —— 私密项目上压缩 / 过期检测的入口点不出去（invoke 没被调）；周回顾的材料里没有私密项目。截图 —— 私密项目里那几处锁着的样子（中英各一张）。

### P9E-4 · 界面：右键设为私密，项目上有标记

- 现在：§2.1 第 9、10 行。
- 要做（第 119 条）：
  1. 项目右键菜单加一项「设为私密」/「取消私密」（多选时作用于整个选区，和「移到工作区」一样）。
  2. 点「设为私密」先弹一小块说明，确定才生效。说明大白话、短，意思是：**通过 Spool 连接的 AI（Claude、Codex……）读不到这个项目，也不知道它存在；它们还能往里写。Spool 自带的 AI 功能（周回顾、压缩、过期检测、跟进）也不碰它。你自己用起来和平常一样。** 外加一句照实的话：自己能读你电脑文件的 AI 绕开 Spool 直接读文件，这个管不了（§2.2）。
     「取消私密」也问一句：取消之后，连着 Spool 的 AI 又能读到它。
  3. 标记：左栏项目名后面、项目头标题旁边各一个小图标（建议 `lucide-react` 的 `EyeOff`，别用 `Lock`），悬停一句「私密项目：通过 Spool 连接的 AI 读不到」。AI 建成私密的项目和用户设的一模一样。
  4. 中英文都要有（跟随系统语言）。
- 不做：工作区级的私密；设置页里的总开关。
- 验收：截图（中英、浅色深色各一张左栏 + 项目头 + 说明那一小块）；真手指交给 Ocean（§6）。

## 4. 什么时候停下来问

- 发现 §2.1 没列到的、会把项目内容交给 AI 的地方 —— 先记下来，能在这四步里挡就挡，挡不住的停下来问。
- 某个「用户自己的动作」被过滤误伤、又没法在不改它行为的前提下分层 —— 停下来问。
- 说明文案、图标 Ocean 没定死：按上面写的做，截图里给他看；要大改就问。
- 换装（会迁库到 v34）—— 先问。

## 5. 做完四步之后：换装给 Ocean 验收（先问）

- 四步都提交、全部测试通过之后，**先问 Ocean「现在换装吗」**，说清：**这次会把真库从 v33 迁到 v34；装完之后所有已经开着的 AI 客户端都要重启，旧的会一直报「库比服务新」**（这是故意的，见 §2.1 第 2 行）。
- 照 P9C 任务书回执 §7.5 的做法：
  - 换装前：`VACUUM INTO` 备份真库到桌面（文件名带日期）；`settings.json`、`focus.json`、`drafts.json` 拷一份到桌面。
  - Developer ID 构建：`APPLE_SIGNING_IDENTITY` 走环境变量，不改 `tauri.conf.json`，公证变量全部 unset，日志进文件；TSA 偶发失败就整个重跑。
  - 停 GUI 之前问 Ocean 有没有正在编辑的东西（P9D 之后字会留住，但照样问）。
  - 停 GUI 和 `--overlay` **按 pid**，杀完再查；`--mcp` 一个都不碰。旧包 `mv` 进 `~/Desktop/Spool/spool-pre-install/`，新包先 `ditto` 成 `Spool.app.new` 再改名换进去。
  - 换装后核：sha256 和构建产物一致；两个进程的 txt inode 是新文件；stderr 有 `[double-tap] installed at HID/active`；真库 `user_version` = 34、`integrity_check ok`、各表计数和装前一致、多出一个 `pre-migration-v33` 快照；`settings.json` 和装前一样。
- commit、build、换装分开记在回执里；**不 push、不发版**。

## 6. 给 Ocean 的验收单（大白话，换装后给 Ocean）

1. 先把开着的 AI（Claude Code、Codex、Claude 桌面版）都重启一下。
2. 在 Spool 左栏右键一个项目，点「设为私密」。看一眼那段说明，点确定。项目名后面多了一个小图标。
3. 问 Claude：「我有哪些项目」。那个项目不在里面。再让它搜那个项目里的一句话，搜不到。
4. 让 Codex 新建一个私密项目，往里写两条。回到 Spool：这个项目在、带小图标、两条都在。再问 Claude，看不到它。
5. 点开那个私密项目：压缩、过期检测、跟进那几处是锁着的，写着一句为什么。
6. 右键它，取消私密。再问 Claude，能看到了。
7. 有问题直接说哪一步、看到了什么。

## 7. 回执（执行窗填写）

### 7.0 开工

- 起点：HEAD `58cef82`（`2eaa53f` 之后只多了下发本任务书那一笔 docs），`src` / `src-tauri` 没有未提交的改动；工作树里研究线那几份 docs 是别人的，没碰、没暂存。
- 基线（`58cef82` 实测）：`npx tsc -b` 干净 · `npx vitest run` 95 个文件 / 1106 条 · `cargo test` 194 过 · 5 跳过 · sidecar 14 · `i18n-check` `(none missing)` · `--dead` 87 · `cargo tree` 那条空。
- §2.1 对不上的只有一处：第 3 行说「新列不登记的话，导出再导入私密就没了」—— 实际 `transfer.ts` 是按两边都有的列搬的（`LOCAL_ONLY_COLUMNS` 是**排除**名单），新列不用登记就跟着走。P9E-1 没加代码，加了一条测试钉住。其余行号大致对得上（`onContextMenu` 在 161 行左右）。
- 收尾时的数字：tsc 干净 · vitest **99 个文件 / 1122 条** · cargo **200 过** · 5 跳过 · sidecar 14 · `(none missing)` · `--dead` 87（和开工一样）· `cargo tree` 那条空 · clippy 没有落在改动行上的新警告。

### 7.1 P9E-1 · 库 v34

- 提交：`b725625 feat(db): P9E-1 库 v34 —— 项目多一列 private（Ocean 10-15 第 119 条）…`
- 改的文件：`src/lib/db/schema.sql`、`src/lib/db/client.ts`（v34 一步 + `SCHEMA_VERSION = 34`）、`src-tauri/src/mcp.rs`（`EXPECTED_SCHEMA_VERSION = 34`，同一笔）、`src/lib/db/threads.ts`（`Thread.isPrivate`）、测试：`client.test.ts`、`threads.test.ts`（新）、`transfer.test.ts`，外加六个手写 `Thread` 的测试夹具补一个字段。
- 迁移：一句 `ALTER TABLE threads ADD COLUMN private INTEGER NOT NULL DEFAULT 0`，默认 0（迁移不替用户藏任何东西），没有 rebuild 分支，撞上已有的列 catch 掉（v33 同一个写法）。
- 验：
  - 测试：v33 → v34 逐表逐行相等、建表语句只在 threads 尾巴上多一列、半跑一次能重跑、新装直接有这一列且默认 0；老的迁移测试补上 `downgradeToV33`；按 tauri-plugin-sql 真实绑法（布尔绑成文本 `'true'`）设私密再取消；私密项目导出再导入还是私密。
  - **真库副本**（`sqlite3 -readonly … VACUUM INTO` 到 scratchpad，scratchpad 里的 vitest 跑 `__migrateSchemaForTest`）：v33 → v34、`fresh` = false、`integrity_check ok`、工作区 / 项目 / 块 = 29 / 73 / 1181（含已删的）、24 张表每一列的条数和总长都和迁之前一样（正文 439797、批注 14448、文件正文 711117、图片 18 张 9136780 字节、跟进 23）、73 个项目全是 0。没起 debug 版 GUI，真库没碰。
  - **装着的 v33 `--mcp`**（`/Applications/Spool.app`）连迁过的副本：回 `Spool's database is v34, newer than this MCP server (v33) …`，`isError: true`。⇒ 换装之后、AI 客户端重启之前，旧进程不会把私密项目交出去。
- 偏离：任务书写「`patchThread` 能改它」，P9E-1 照做了；P9E-4 发现走 patch 会改 `updated_at`、项目在左栏跳到最上面，就换成单独一条写法、patch 那一支去掉了（见 7.4）。

### 7.2 P9E-2 · MCP

- 提交：`74ffd87 feat(mcp): P9E-2 私密项目 —— 通过 Spool 连上来的 AI 读不到、也不知道它存在，但写得进…`
- 改的文件：`src-tauri/src/mcp.rs`、`src-tauri/src/api_engine.rs`（两行：用户自己的查重改用 `open_db_whole`）。
- **怎么分层（执行窗定的）**：MCP 给 AI 开的每一条连接（读的 `open_db`、写的 `open_db_rw`）开出来就挂上同名的 TEMP 视图，`threads` / `blocks` / `attachments` / `follow_up_items` / `block_images` 里私密项目的行滤掉。SQLite 先找 temp 再找 main，所以这个文件里一百多条读查询一条不用改就全看不见，条数、合计、搜索 total、库体检、相似块都只算 AI 能看见的那一份；以后新写的查询也默认是滤过的。写一律点名 `main.`，漏写的话报「cannot modify … because it is a view」—— 是报错，不是漏。用户自己的动作走新的 `open_db_whole`（`forward_duplicate_check` 移 / 复制块的查重、`compress_duplicate_probe` 压缩前的查重）。
- 每一条要求怎么落的：
  1. 读一律看不见、连数量都不出现：视图。点名私密项目 / 块 / 文件 / 跟进行的 id，回的话和「没有这个 id」一字不差（金丝雀测试逐字节比）。
  2. 公开块引用私密块：pack 那一行写 `(cited block is not visible to AI)`（新常量 `REF_BLOCK_HIDDEN`，只在 MCP 这一侧，`templates.ts` 不用跟 —— 用户自己复制的 pack 本来就看得见所有项目）；`get_blocks` 里 `ref_block_id`、`corrected_quote` 给 null，`cited` 只说 `visible: false`；项目概览、`check_library`、`thread_health` 不把它算成悬空引用（不然 AI 会叫用户去修一条好好的引用）。**另外**：公开项目里指向私密项目的**链接块**（`kind = 'ref'`，正文就是那个项目的标题，用户建链接时拷过来的）整块不给 AI —— §2.1 没列到，挡在视图里。
  3. 写得进：`add_block` / `propose_blocks` / `propose_attach_file` 认 `main.threads`（新的 `write_target`）。回执和标题行里不带项目标题、id、块号、已有文件的名字，只说「存进 Spool 了，在一个私密项目里 —— 连着 Spool 的 AI（包括你自己）读不回来」；预演那一句同理。块号照旧按**整个项目**往后排（`MAX(seq)` 读 `main.blocks`，不然会撞号）。`ref_block_id` 指向私密块、`corrected_quote` 的逐字核对，都走视图 ⇒ 私密块就是「没有这一块」，核对不会对它跑。`propose_attach_file` 碰到「已经在这个项目里」只说已经在了，不说是哪个文件。写进私密项目时没有别的查重会把已有内容拿出来比（这几个工具本来就没有块级查重）。
  4. 其余碰已有内容的写工具（`set_thread_summary`、`set_block_gist`、`propose_supersede`、`propose_replace_file`、`request_file_access`、`suggest_follow_up_item`、`close_follow_up_item`）：都走视图，私密的就是「没有这个项目 / 这一块 / 这一条」。
  5. `create_thread` 加可选 `private`（默认 false），回执带 `thread_id`（往里写要用）和 `private`；标题行说清楚「用这个 id 往里写，你自己也读不回来，用户在 Spool 里看得见、能取消」。工具说明加一段；`OPENERS` 加一行「这个项目别让别的 AI 看到 / 建一个私密项目 / keep this project away from other AIs → create_thread with private=true，再用它回的 thread_id add_block」。annotations 没动；只讲怎么建，没讲库里有几个。
  6. 用户的动作不受误伤：有一条测试 —— 往私密项目里移一块和里面某块一模一样的，用户那条查重照样报出来；同一个库用 AI 的连接查，什么都没有。
- **金丝雀测试**（`private_projects_are_invisible_on_every_ai_surface`）：两个库只差两个私密项目 —— 标题、摘要、结论、遗留的跟进简报和 AI 提的那一句、四个块（正文 / 批注 / gist / 来源 / 网址 / 图片说明，一块更正私密块、一块更正公开块、一块链接到公开项目）、一张图、一个文件（文件名 / 路径 / 正文）、两条跟进行（一条在用、一条待审）、一个待审文件、一批待审块、一条待审取代、一条读文件申请、一条引擎记录，全带怪字符串 `Zq7canary`。同样的 **133 次调用**两边各跑一遍，**输出逐字节相同**，而且没有一个输出里出现那个字符串或任何一个私密 id（这次调用自己传进去的除外）：
  - 24 个工具里：`list_threads`（无参 / 按怪字符串 / 按标题里的词）、`get_digest`（默认 / 3650 天 / 只有私密项目的那个工作区 / 公开工作区）、`search_blocks`（公私都有的词 / 怪字符串 / 只在私密里的词 / 只在私密文件里的词 / 两个字的短查询）、`check_library`、`get_follow_up_brief` 和 `get_project_overview`（公开 / 私密 id）、`weekly_review`（默认 / 90 天）、`thread_health`（无参 / 公开 / 私密 id / 怪字符串）、`distill`（公开 / 私密 id）、`find_similar_blocks`（全库 / 私密 id / 只有私密项目的工作区）、`get_block_original`（公开 / 私密块）、`get_blocks`（公开 / 带文件正文 / 围着私密块读 / 两个私密 id）、`get_pack`（公开带 id 表 / 私密 / 私密只看置顶）；写工具里会碰已有内容的那些全用私密的 id 调一遍，外加引用 / 更正私密块的 `add_block` 和 `propose_blocks`、更正答案块指向私密块的 `close_follow_up_item`、建到不存在的工作区的 `create_thread`。
  - 提示词：`prompts/get` 的 7 个，每个（需要项目的）用「不给 / 公开 / 私密 id / 怪字符串」各一次；`weekly_review` 加一次只看私密那个工作区；再把 9 个组装（含只给引擎用的 `follow_up_brief`、`follow_up`）按 MCP 和无人值守两种各用「不给 / 公开 / 私密 id」调一遍。
  - resources：`resources/list`、`resources/read`（公开 / 私密）。
  - 关掉视图（让 `hide_private_projects` 直接返回）这条当场红：第一条 `list_threads` 就多出两个项目和「3 projects」。
- 其余测试：公开块引用私密块（pack 两行都是 `REF_BLOCK_HIDDEN`、没有 `REF_BLOCK_MISSING`；`get_blocks` 那三个字段；概览 / 体检里悬空引用是 0；链接块不在）；往私密项目写（预演 / 真写 / 引公开块、块号是 4、写完还是「没有这个项目」；`propose_blocks` 回执只有公开项目的名字、`blocks_on_approval` 照算；`propose_attach_file` 排队和「已经在了」都不报名字；`create_thread(private)` 建出来列表里没有、能往里写、读不到；不带 `private` 照旧公开）；工具说明和路由文本。
- **真库副本**冒烟：迁到 v34 的副本里把块最多的项目（396 块）设成私密，新构建的 `--mcp`（`src-tauri/target/debug/spool --mcp`，不是 GUI）连副本：`list_threads` 从 56 变 55、`get_blocks` 那个 id 回「No project has that id」、`get_digest` 里没有它的标题、搜它里面的一个词 0 条。
- 偏离 / 执行窗定的：
  - AI 建项目查重名只和它**看得见的**比：撞上同一个工作区里的私密项目不拒（拒了就等于告诉它有一个），于是那个工作区里会有两个同名项目（一个带小眼睛）。和第 65 条「AI 那一侧 create_thread 照旧拒绝」冲突，记成 HANDOFF `DISCOVERED-20261016-2` 等 Ocean 定。
  - 工作区不滤：只装着私密项目的工作区，AI 那边看到的是一个空的工作区（工作区名字不是私密内容，任务书也说只有项目能设私密）。
  - AI 往私密项目里写时，引不了这个项目里的块（包括它自己刚写的那块）—— 它读不到，引用核对就是「没有这一块」。这是「读不了」的直接结果，没另开口子。

### 7.3 P9E-3 · Spool 自己的 AI

- 提交：`058e305 feat(ai): P9E-3 Spool 自带的 AI 不碰私密项目（Ocean 10-15 第 122 条）…`
- 改的文件：`src/lib/engine/gate.ts`（+测试）、`src/components/AiSetup/PrivateAiEntry.tsx`（新）、`src/components/ThreadView/index.tsx`、`BlockItem.tsx`、`FollowUpPanel.tsx`、`src/components/RightRail/index.tsx`、`src/components/ProjectBoard/index.tsx`、`src/stores/compressStore.ts`、`src/stores/engineStore.ts`、`src/stores/privateProjectsAi.test.ts`（新）、`src/lib/i18n/index.ts`、`src-tauri/src/mcp.rs`（一条测试）。
- 做法：
  - `aiEntryState` 多一种 `private`：「显示 AI 功能」关着照旧什么都不画；Windows 上只靠本机引擎的照旧不画；其余在私密项目里一律 `private`，**不管引擎准备好没有**。
  - 锁着的样子借 `LockedAiEntry` 的灰和排版，图标是 `EyeOff`（不用 `Lock`），没有按钮，一句话：「私密项目：通过 Spool 连接的 AI 读不到它，Spool 自带的 AI 也不碰它。要用这里，先在左栏右键这个项目，点「取消私密」。」/ "Private project: AIs connected through Spool can't read it, and Spool's own AI leaves it alone. To use this, right-click the project in the sidebar and choose “Turn off private”."
  - 用在：「压缩」「过期检测」两个页签（名字后面一个小眼睛，点进去是那一句；过期检测**之前扫出来还没点完的**也一起关着，要处理先取消私密）、跟进面板「让 AI 看看还缺什么」、右栏「联网搜索」（私密项目里不管有没有跟进行都显示这一格，「定几行之后才能让 AI 出去查」那句不出）。块工具条上的「压缩」和项目管理那一行「排进今晚自动压缩」在私密项目上**不画**（第 99 条：不逐行放锁）。跟进面板里「接了 MCP 的 AI 读得到它们」那句在私密项目上不出（那句不对了）。
  - 锁后面的门：`compressStore.run` / `runStaleScan` 碰到私密项目直接返回（变成私密之前开着的整理稿也一样）；`engineStore.enqueue` 不收私密项目（Rust 那边 `ai_engine_run` 组提示词走 P9E-2 过滤过的连接，本来也找不到它）。
- **「后台会挑项目去用 AI 的地方」清单**（开工时全找了一遍）：
  1. 每周自动回顾（`hooks/useAutoMaintain.ts`）：整库、不挑项目。API 那条读 `mcp::weekly_material_for_api`，CLI 那条是 CLI 里的 AI 调 MCP，都走 P9E-2 的视图 ⇒ 私密项目不在材料里。测试 `spools_own_weekly_review_reads_no_private_project`（公开项目在、私密的字和 id 一个都没有），CLI 那条在金丝雀里用无人值守的 `weekly_review` 覆盖。
  2. 今晚自动压缩（`Compress/NightlyRunner.tsx` → `compressStore.runQueue`）：队里的私密项目跳过，早上那张单子上写「私密项目，没有发给 AI」（排进去之后才设成私密的会走到这里）。
  3. 本机引擎的队（`engineStore`）：只有用户点了才排（跟进面板、右栏），`enqueue` 不收私密项目。
  4. 没有别的：08-11 起项目级的自动维护已经没人读（`auto_maintain` 那一列），`useAutoMaintain` 只跑周回顾；压缩 / 过期检测的两个面板只在页签打开时跑，锁着就不渲染。
- 不做：「活动」图表照常算私密项目（它不用 AI）。
- 验：`privateProjectsAi.test.ts` 4 条 —— 压缩、过期检测、今晚一批、本机引擎排队：私密项目上 `invoke` 一次都没被调，同一条路在公开项目上照常发出去（证明假的 invoke 接通了）；gate 的 `private` 那一支；周回顾材料那条 Rust 测试。
- 截图（桌面 `~/Desktop/Spool/P9E-screenshots-20261016/`，中英各一张，引擎是**准备好**的状态）：`p9e3-project-tabs-*`（两个页签后面的小眼睛）、`p9e3-compress-tab-*`、`p9e3-stale-tab-*`、`p9e3-followup-panel-*`、`p9e3-right-rail-*`。截法同记忆 `isolated-verify-workflow` §46 / §48，脚本在同一个文件夹的 `harness/`。

### 7.4 P9E-4 · 界面

- 提交：`b0bbad2 feat(ui): P9E-4 右键设为私密，项目上有标记（Ocean 10-15 第 119 条）…`
- 改的文件：`src/components/Sidebar/ThreadListItem.tsx`、`src/components/Sidebar/MenuPrivateItem.tsx`（新，+测试）、`src/components/ui/PrivateMark.tsx`（新）、`src/components/ThreadView/ThreadHeader.tsx`、`src/stores/threadsStore.ts`（`setPrivate`）、`src/lib/db/threads.ts`（`setThreadPrivate`）、`src/stores/threadPrivate.test.ts`（新）、`threads.test.ts` / `transfer.test.ts`、`src/lib/i18n/index.ts`。
- 右键菜单：在「移动到工作区」和「删除」之间多一行「设为私密…」/「取消私密…」（Make private… / Turn off private…），多选时作用于整个选区；选区里只要有一个还不是私密的就是「设为私密」，全是私密才是「取消私密」。点了先在菜单里展开一小块说明，再点一次才生效（和「删除」同一种两步）：
  - 设为私密：「通过 Spool 连接的 AI（Claude、Codex……）读不到私密项目，也不知道它存在，但还能往里写。」「Spool 自带的 AI 功能（周回顾、压缩、过期检测、跟进）也不碰它。你自己用起来和平常一样。」灰字一句照实的：「管不了的一种：能直接读你电脑上文件的 AI，绕开 Spool 去读，还是读得到。」按钮「设为私密 / 取消」。
  - 取消私密：「取消私密之后，通过 Spool 连接的 AI 又能读到它，Spool 自带的 AI 功能也能用了。」按钮「取消私密 / 保持私密」。
  - 英文都在字典里；测试里钉了不许出现 encrypt / completely / fully 这类绝对的词。
- 标记：`EyeOff` 小眼睛，左栏项目名后面、项目头标题**前面**（标题是一个占满整行的输入框，放后面会挨着右边的「打包」按钮、离名字很远），悬停「私密项目：通过 Spool 连接的 AI 读不到」。AI 建成私密的和用户设的一模一样（同一列）。
- 偏离：写库不走 `patch`，改成单独的 `setThreadPrivate`（store 里 `setPrivate` 管一个选区）—— `patch` 会把 `updated_at` 改成现在，左栏按它排，设成私密的项目会跳到工作区最上面；和归档 `setThreadCompletion` 同一个理由。P9E-1 加在 `patch` 上的那一支去掉了，只留这一条写法。
- 验：`MenuPrivateItem.test.tsx` 3 条（菜单出哪一种、两种说明里该有的话、照实那句、没有绝对的词）、`threadPrivate.test.ts`（作用于选区、库和左栏一起变、顺序不动）、`threads.test.ts`（不改 `updated_at`）。
- 截图（同一个文件夹）：`p9e4-sidebar-*`、`p9e4-header-*`、`p9e4-menu-make-private-*`、`p9e4-menu-turn-off-*`，中英 × 浅色深色各一张。
- 真手指：交给 Ocean（§6）。

### 7.5 还差什么、偏离、新发现

- 还差：换装（§7.6，先问）和 Ocean 按 §6 验收。没 push、没发版。
- 偏离（上面各步都写了，这里合一处）：P9E-1 的 patch 那一支 P9E-4 换掉了；AI 建项目撞私密项目的名字不拒（`DISCOVERED-20261016-2`）；项目头的标记放在标题前面；过期检测页签在私密项目上连「之前扫出来的」一起关着；公开项目里指向私密项目的链接块整块不给 AI。
- 新发现（HANDOFF §9.9，默认 captured）：
  - `DISCOVERED-20261016-1`：私密项目的右栏「项目文件」—— 空的时候那句「这个项目还没有文件。你加进来的文件，AI 默认能读到里面的文字，每个文件旁边的开关随时能关……」和每个文件旁边那个开关，在私密项目里都不对了（通过 Spool 连接的 AI 一个都读不到）。不漏东西，只是话不对。
  - `DISCOVERED-20261016-2`：上面那条重名。
- 过程里的一件事：P9E-2 收尾时为了比编译警告用过一次 `git stash`，把研究线那几份没提交的 docs 也一起收起来又放回去了；核过放回来的和收之前逐个文件、逐行数一样（4 个文件 · 1186 增 / 284 删），stash 列表是空的。之后没再用。

### 7.6 换装

- **已换装**（Ocean 10-16「换装」，HANDOFF §9.2 第 126 条；换装前问过有没有没点「完成」的字，他没另说，`drafts.json` 停之前是空的 `{"blocks": {}, "composer": {}}`）：
  - 构建：在 `3047bf5` 上（`src` / `src-tauri` 没有未提交改动；P9E 四步 + `5b9b226` 更正块修复都在里面），命令同 P9C §7.5（`APPLE_SIGNING_IDENTITY` 走环境变量、公证变量全 unset、日志进文件、`tauri.conf.json` 没改）；「skipping app notarization」；TSA 一遍过（主程序和 `spool-ai` 都是 13:14:13）；`--verify --deep --strict` 过。新二进制 `--mcp` 连真库最新副本（`VACUUM INTO`、scratchpad 里先跑真迁移 v33 → v34，24 张表每列条数和总长不变）：24 个工具、`create_thread` 有 `private`、列表 58 个项目。
  - 装前：`spool` sha256 `4c7757be…`（10-15 那版）、`Unnotarized Developer ID`。真库 v33 · ok · 工作区 30 / 项目 75 / 块 1197 · 正文 477160 · 批注 14528 / 文件 65 · 正文 714597 / 图片 18 张 9136780 字节 / 跟进 23 / 引擎记录 26 / 待审 0；快照 25 个；`settings.json` 26 个键。
  - 停：GUI 36895、`--overlay` 36903 按 pid `kill -TERM`，1 秒内都退了；20 个 `--mcp` 一个没碰（装后逐个核过还活着）。
  - 备份（桌面）：`spool.before-p9e-install-20261016-131529.db`（v33 · ok · 数字和上面逐项一样）、`settings.before-p9e-install-20261016-131529.json`、`focus.before-…json`、`drafts.before-…json`。旧包挪到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261016-131529-pre-p9e.app`；新包先 `ditto` 成 `Spool.app.new` 再改名换进去，`open --stdout … --stderr …` 起来。
  - 装后：sha256 `b470e343…` 和构建产物一致；主进程 89254（13:15:37）、`--overlay` 89345（13:15:38），txt inode 都是 81411119 = 新文件；`spctl` = `Unnotarized Developer ID`（和装前一样）；stderr 只有 `[overlay] helper started` 和 `[double-tap] installed at HID/active`。**真库 v34** · ok，上面那一串数逐项和装前一样，75 个项目 `private` 全是 0；快照 25 → 26，多的是 `spool.pre-migration-v33-2026-10-16T12-15-38-666Z.db`；`settings.json` 逐键一样（26 个）。
  - ⚠️ 开着的 AI 客户端（Claude Code、Codex、Claude 桌面版）要重启，没重启的会一直报「库比服务新」（故意的）。
  - commit、build、换装分开记在上面；**没 push、没发版**。
- 换装前 Ocean 插进来一件（HANDOFF §9.2 第 124 – 125 条，owner interruption）：〈Memo产品复活｜Claude独立调研〉#20 看不到 —— 更正块被折进了被更正那一句底下。已修 `5b9b226`（更正块回到时间线，点被更正那一句在浮窗里预览），**跟 P9E 一起装**。验收时多看一条：打开这个项目，#16、#19、#20、#21 都在时间线上；点 #14 里那句有底色的话，旁边弹出 #20；点 #20 里那句，弹出 #21。

### 7.7 验收第一轮（Ocean 2026-10-16）

- Ocean 原话：「验收不通过，点击设为私密之后菜单窗口太长，导致用户无法看见底部信息」（HANDOFF §9.2 第 132 条）。
- 复现：600×380 的窗口里右键最下面一行、点「设为私密…」—— 说明在原地展开，菜单变长，「设为私密 / 取消」和「删除项目」都在窗口底边外面（截图 `p9e-r1-before-menu-cut-off.png`）。原因：`useMenuPosition` 只在菜单打开那一刻按当时的高度摆一次，菜单后来长高了不重摆。
- 提交：`13b6e7b fix(sidebar): 右键「设为私密…」展开说明之后，菜单不再跑出窗口底边（P9E 验收第一轮…）`
- 改的文件：`src/components/ui/useMenuPosition.ts`（+ 新测试 `useMenuPosition.test.ts`）、`src/components/Sidebar/ThreadListItem.tsx`、`src/components/Sidebar/MenuPrivateItem.tsx`。
- 做法：① 菜单大小一变就按同一个锚点重新摆（`ResizeObserver`），往左 / 往上挪到整块都在窗口里 —— 左栏两种右键菜单和「AI 引擎」小块都用这一个；② 说明展开时它就是整个菜单：「移动到工作区」和「删除」先收起来，只剩说明和两个按钮（多选时顶上照旧写选中了几个），点「取消 / 保持私密」回到原来的菜单。
- 验：`clampMenu` 三条测试；全量 tsc 干净、vitest 101 / 1121、`(none missing)`、`--dead` 87。截图（桌面 `Spool/P9E-screenshots-20261016/`）：`p9e-r1-after-make-private-zh` / `-en`、`p9e-r1-after-turn-off-zh`（600×380，最下面一行）、`p9e-r1-after-very-short-window`（600×270，说明放不下时菜单整体上移，按钮照样看得见）。
- **已换装**（Ocean 10-16「换装」，HANDOFF §9.2 第 133 条；停之前 `drafts.json` 是空的，没有没存的字）：在 `711c2ab` 上构建（`src` / `src-tauri` 没有未提交改动），命令同 §7.6；TSA 一遍过（主程序和 `spool-ai` 都是 13:55:11）；`--verify --deep --strict` 过；新二进制 `--mcp` 连真库最新副本 24 个工具。装前 sha256 `b470e343…`（P9E 那版），真库 v34 · ok · 工作区 30 / 项目 75（私密 0）/ 块 1197 · 正文 477160 / 文件 65 / 图片 18 / 跟进 23；快照 26 个；`settings.json` 26 个键。GUI 89254、`--overlay` 89345 按 pid 停，1 秒内都退了；21 个 `--mcp` 一个没碰（装后逐个核过还活着）。备份（桌面）`spool.before-p9e-r1-install-20261016-135535.db` 和同名的 `settings` / `focus` / `drafts` 三个 json；旧包 `~/Desktop/Spool/spool-pre-install/Spool-old-20261016-135535-pre-p9e-r1.app`。装后 sha256 `09cd60d6…` 和构建产物一致；主进程 91817、`--overlay` 91831 都是 13:55:35 起的，txt inode 81428250 = 新文件；`spctl` = `Unnotarized Developer ID`；stderr 只有 `[overlay] helper started` 和 `[double-tap] installed at HID/active`。真库逐项和装前一样（不迁移，快照仍 26 个）；`settings.json` 逐键一样。没 push、没发版。

### 7.8 验收第二轮（Ocean 2026-10-16）

- Ocean 原话：「还有一个bug，设为隐私后的项目如果点击已完成，再去右键关闭隐私，弹窗会变成半透明，无法点击。」（HANDOFF §9.2 第 134 条）
- 复现（截图脚本，真组件）：私密项目标成已完成、右键、「取消私密…」—— 菜单半透明；在「取消私密」按钮正中间问 `document.elementFromPoint` 最上面是谁，答案是下面那一行「毕业论文」（`p9e-r2-before-done-row-menu.png`）。
- 原因（和私密无关，所有已完成项目的右键菜单一直如此）：已完成的项目那一行是 `opacity-50`，右键菜单画在这一行**里面** ⇒ 跟着半透明；`opacity` 让这一行自成一层，菜单的 `z-50` 只在这一层里算数，下面几行盖在菜单上、把点击接走。
- 提交：`a54406d fix(sidebar): 已完成的项目右键菜单不再半透明、点得动（P9E 验收第二轮…）`
- 改的文件：`src/components/Sidebar/ThreadListItem.tsx`（菜单用 `createPortal` 画到 `document.body`；这一行自己的样子不变）。
- 验：单元测试测不出（node 里没有排版和层叠），用真组件截图脚本做命中测试 —— 改后按钮正中间就是按钮本身（`p9e-r2-after-done-row-menu-zh` / `-en`）；照真手指的顺序 mousedown → mouseup → click：菜单没被「点外面就关」误关，私密取消、小眼睛消失、菜单关上（`p9e-r2-after-press-turns-off.png`）。上一轮「菜单长高了往上挪」照样成立。全量 tsc 干净、vitest 101 / 1121、`(none missing)`。
- **已换装**（Ocean 10-16「换装」，HANDOFF §9.2 第 135 条；停之前 `drafts.json` 是空的）：在 `b9ce6cd` 上构建（`src` / `src-tauri` 没有未提交改动），命令同 §7.6；TSA 一遍过（主程序和 `spool-ai` 都是 14:18:54）；`--verify --deep --strict` 过；新二进制 `--mcp` 连真库最新副本：24 个工具，**列表 57 个项目 —— 库里活着的 58 个里有 1 个是 Ocean 验收时设成私密的，AI 那边看不到它**（真数据上又核了一遍私密）。装前 sha256 `09cd60d6…`（第一轮那版），真库 v34 · ok · 30 / 75 / 1197 · 正文 477160 / 文件 65 / 图片 18 / 跟进 23，私密 1 个；快照 26 个；`settings.json` 26 个键。GUI 91817、`--overlay` 91831 按 pid 停，1 秒内都退了；24 个 `--mcp` 一个没碰（装后逐个核过还活着）。备份（桌面）`spool.before-p9e-r2-install-20261016-141915.db` 和同名的 `settings` / `focus` / `drafts` 三个 json；旧包 `~/Desktop/Spool/spool-pre-install/Spool-old-20261016-141915-pre-p9e-r2.app`。装后 sha256 `1454e210…` 和构建产物一致；主进程 50386（14:19:15）、`--overlay` 50459（14:19:16），txt inode 81435140 = 新文件；`spctl` = `Unnotarized Developer ID`；stderr 只有 `[overlay] helper started` 和 `[double-tap] installed at HID/active`。真库逐项和装前一样（不迁移，快照仍 26 个），私密那个项目还是私密；`settings.json` 逐键一样。没 push、没发版。

## 8. 收尾的文档动作（执行窗做）

- 首屏改成 `COMPLETE —— 待 Ocean 验收`，移进 `docs/archive/product-taskbooks/`。
- HANDOFF：§9.3 P9E 那一行写「已完成，任务书在 archive/…」；§9.2 记换装那一问；§9.8 写唯一下一步（Ocean 验收 P9E ⇒ 发版一）；新发现进 §9.9。
