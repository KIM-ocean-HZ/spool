# 产品任务书 P9E —— 私密项目：右键设为私密，连着 Spool 的 AI 读不到它

> **状态：ACTIVE**（2026-10-15 下发）
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

（基线测试数字；开工时 HEAD；§2.1 有没有对不上的）

### 7.1 P9E-1 · 库 v34

### 7.2 P9E-2 · MCP

（金丝雀测试调了哪些工具、提示词、resources，各用了什么参数）

### 7.3 P9E-3 · Spool 自己的 AI

（「后台会挑项目去用 AI 的地方」清单）

### 7.4 P9E-4 · 界面

### 7.5 还差什么、偏离、新发现

### 7.6 换装

## 8. 收尾的文档动作（执行窗做）

- 首屏改成 `COMPLETE —— 待 Ocean 验收`，移进 `docs/archive/product-taskbooks/`。
- HANDOFF：§9.3 P9E 那一行写「已完成，任务书在 archive/…」；§9.2 记换装那一问；§9.8 写唯一下一步（Ocean 验收 P9E ⇒ 发版一）；新发现进 §9.9。
