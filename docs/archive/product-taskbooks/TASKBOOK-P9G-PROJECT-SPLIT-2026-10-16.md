# 产品任务书 P9G —— 拆项目：项目太长时，AI 提议拆成几个子项目，用户在待审里点头才拆

> **状态：COMPLETE —— Ocean 10-16 验收通过（HANDOFF §9.2 第 139 条）。**（2026-10-16 执行完三步：`1800586` `009722d` `37a1631`；**10-16 已换装，真库已迁到 v35** —— 回执 §7.5）。回执在 §7。
>
> 原来的状态：QUEUED（2026-10-16 下发）—— P9E 验收之后开工，发版一之前做完（Ocean 10-16，HANDOFF §9.2 第 126 条）。Ocean 10-16「读TASKBOOK-P9G-PROJECT-SPLIT-2026-10-16.md，开始任务」开的工（HANDOFF §9.2 第 136 条）。
>
> **唯一交付：** 下面 §3 的三步（P9G-1 – P9G-3），按顺序做完，每一步测试通过、单独一笔提交，并在 §7 写回执。
>
> **来历：** 2026-10-16〈Memo产品复活｜Claude独立调研〉#20 看不到（HANDOFF §9.2 第 124 条）。查下来不是字数上限，但这个项目约 5.8 万字，超了 AI 读项目（`get_pack`）的 5 万字默认上限，AI 第一眼看到的 #1 – #5 只有一行标题。Ocean：上限不动，「提示用户自己或者让AI做一次拆分，把大项目拆成几个子项目，最好MCP可以直接有这个接口能力，识别到文字过多，主动问用户要不要拆分成子项目，然后原项目进入archive或者消失」（第 125 条）。下发前把利弊摊开问了五件（第 127 – 131 条），都选了推荐项。
> **「现在」一栏每一条都对着 `3047bf5` 核过。**
>
> **授权来源（Ocean 10-16 拍板，本任务书只引用、不改）：**
> - 第 127 条：块是**移**过去，不是复制（块的身份不变，引用、挂在块上的文件、图片、压缩前原文都跟着走）。
> - 第 128 条：原项目**留一个总览**（名字还在，里面一块「拆成了 A、B、C」带指向子项目的链接；没分走的块留在原项目）。
> - 第 129 条：AI **只能提议**，进 Spool 的待审，用户在卡上看、能改分组，点头才拆。
> - 第 130 条：没挂在某一块上的**项目文件、跟进行**在卡上**逐个指定**去哪（默认留在原项目）；每个子项目的一句话摘要由 AI 提、卡上看得到；私密标记跟原项目一样。
> - 第 131 条：**只靠 AI 提**，Spool 界面不加「太长了」的提示，也不加用户自己拆的入口。
>
> **边界：** 只做这三步。
> - 不碰实验线：`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行。
> - 不动 `docs/EXECUTION_POLICY.md`。
> - 库结构只加**一张表**（v35，§3 P9G-1）；不改已有的表。
> - AI **一个字都不改**、**一块都不挪**：这个新工具只排队。真正的拆分只在用户点「拆分」那一下发生，在 GUI 里。
> - 不加网络依赖（`cargo tree` 那条照旧必须是空的），CSP 一个字不改；新的 Tauri 命令一律 `(async)`。
> - 不 push、不发版。换装前先问（§5），**这次换装会把真库迁到 v35**，开着的 AI 客户端又要重启一次。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：首屏、§9.0 – §9.4、§9.8 – §9.9；§9.2 第 119 – 131 条；§10.6 红线速查。
3. `CLAUDE.md` §3 和 §5。
4. `docs/archive/product-taskbooks/TASKBOOK-P9E-PRIVATE-PROJECTS-2026-10-15.md` §7.2：P9E-2 之后 `mcp.rs` 的连接挂着 TEMP 视图，**写表要写 `main.<表>`**，私密项目对 AI 不存在。
5. 记忆：`spool-db-wipe-incident`（迁移验证两法、同抬 `EXPECTED_SCHEMA_VERSION`、⛔ 别起 debug 版 GUI）、`mcp-tool-routing-required`、`mcp-tool-annotations-required`、`isolated-verify-workflow`（§44 探针连副本、§46 / §48 截图、§47 停 GUI 前先问）、`no-git-stash-in-knote`、`ui-language-follows-system`、`write-plainly-for-ocean`。

## 2. 起点

### 2.1 现在（`3047bf5`）

| # | 地方 | 现在是什么样 |
|---|---|---|
| 1 | AI 读项目的上限 | `mcp.rs` `PACK_DEFAULT_MAX_CHARS = 50_000`（3812 行）。超了走 `budgeted_pack`：最早的块只给一行标题，pack 里一行 `[... N older timeline entries are listed below as one line each — bodies dropped for budget …]`（1255 行起）。`list_threads` 每个项目带 `approx_pack_chars`。**这条线不动**（第 125 条） |
| 2 | 用户自己「移动到…」 | `lib/db/blocks.ts` `moveBlock`（1002 行）：**只改这一行的 `thread_id` / `seq` / `created_at`，id 不变**；挂在这一块上的文件（`attachments.anchor_block_id`）跟着改 `thread_id`；块号在目标里没被占就保留，占了就拿 MAX+1。图片（`block_images`）按块 id 挂着，自然跟着走。撤销：`blocksStore.moveForwarded` 推 `buildMoveUndo`（`stores/undoStore.ts` 189 行） |
| 3 | 更正 / 取代成对 | 一条更正的记号只在**同一个项目**里算（`correctionsBySource` 拿的是本项目的块，界面 `BlockItem`、MCP 的 pack 都是）—— 更正块和被更正块分到两个项目，被更正那一句的底色记号就没了。「整条取代」规定只在同一个项目里（P7） |
| 4 | 链接块 | `kind = 'ref'`、`ref_thread_id` = 被链接的项目、`content` = 那个项目当时的标题（`Composer.tsx` 137 行 `append({ threadId, kind: 'ref', content: c.title, refThreadId })`）。⚠️ P9E：指向私密项目的链接块对 AI 整块不可见 |
| 5 | 项目级的东西 | 没挂在某一块上的文件：`attachments.anchor_block_id IS NULL`；跟进行：`follow_up_items.thread_id`；摘要：`threads.summary` / `summary_source`；私密：`threads.private`（v34）；读到哪：`read_positions`；引擎记录：`engine_runs.thread_id` |
| 6 | 待审 | `components/Review/ReviewPanel.tsx`：每一种 AI 提议一张卡（读文件申请、挂文件、取代 / 更正、跟进行、一批块）；`stores/proposalsStore.ts` 管加载、点头、拒绝。AI 那一侧写进各自的表（`proposal_batches` / `proposals`、`file_proposals`、`supersede_proposals`、`file_access_requests`），7 天过期（`PROPOSAL_TTL_DAYS`） |
| 7 | 项目重名 | 用户那一侧撞名自动加「 2」（`lib/names/uniqueTitle`、`threads.ts` `createThread`）；AI 那一侧 `create_thread` 撞名拒绝（只和它看得见的比，P9E） |
| 8 | 库版本 | `client.ts` `SCHEMA_VERSION = 34`、`mcp.rs` `EXPECTED_SCHEMA_VERSION = 34`；真库 10-16 已是 v34 |

## 3. 三步

### 共同的规矩

- 每一步单独一笔提交；提交前跑全套测试（`npx tsc -b`、`npx vitest run`、`cargo test` 主程序和 sidecar、`node scripts/i18n-check.mjs` 和 `--dead`、`cargo tree` 那条），数字比基线只多不少（删掉的要说清删的是什么）。开工先记基线。
- 每一处改动都要有测试，测试先红后绿。新加的中英文字串都进字典。
- ⛔ 不起 debug 版 GUI。验迁移用真库副本 + `__migrateSchemaForTest`；验 MCP 用新二进制 `--mcp` 连副本（记忆 §44）。

### P9G-1 · 库 v35：一张「拆分提议」表

- 要做：新表（名字执行窗定，建议 `split_proposals`）：`id`、`thread_id`（被拆的项目，`REFERENCES threads(id) ON DELETE CASCADE`）、`client`（哪个 AI 提的）、`why`（AI 说为什么拆，卡片顶上那一句）、`plan`（JSON：几组，每组 `title`、`summary`、`block_ids`；外加 AI 对项目文件 / 跟进行的建议去向，可以没有）、`created_at`、`expires_at`（7 天，和别的提议一样）。只建表 + 它自己的索引；`SCHEMA_VERSION = 35`、`EXPECTED_SCHEMA_VERSION = 35` 同一笔。导出导入不带它（和 `file_proposals`、`supersede_proposals` 一样，待审的提议不跟着库搬）。
- 验收：v34 → v35 逐表逐行相等、只多一张空表；半跑一次能重跑；新装直接有；真库副本跑真迁移（`fresh === false`、各表计数和总长不变）；装着的 v34 `--mcp` 连迁过的副本报「库比服务新」。

### P9G-2 · MCP：`propose_split` —— 只排队，一块都不挪

- 要做：
  1. 新工具 `propose_split`：参数 `thread_id`、`groups`（2 – 8 组；每组 `title`、`block_ids`、`summary` 一句）、`why`；可选 `files` / `follow_ups`（AI 建议哪个文件、哪条跟进行去哪一组）。**只写进 P9G-1 那张表**，回执和标题行说清「还没拆，等用户在 Spool 里点头」（照 `propose_blocks` 的说法），⛔ 绝不说「拆好了」。
  2. 核对：项目存在（走视图，私密项目 = 没有这个项目）；每个 `block_id` 都在这个项目里、每块最多进一组；没分进任何一组的块**留在原项目**（回执里报几块留下）；组名不能空、组和组之间不重名；`why` 必填、有长度上限（照 `file_proposal_why`）；同一个项目已经有一份没过期的拆分提议 ⇒ 拒绝并说「已经有一份在等用户」。
  3. **更正 / 取代成对**：一条 `corrects` / 取代关系的两块被分进不同的组 ⇒ 不拒绝，回执里点名是哪几对、说清「分开之后被更正那一句的记号会没」，让 AI 自己决定要不要改（卡片上也会提醒，P9G-3）。
  4. 写入开关：和别的提议一样受「允许 AI 写入」管。`annotations`：`readOnlyHint: false`、`destructiveHint: false`。
  5. 路由：`OPENERS` 加一行（中英，例如「这个项目太长了 / 拆成几个子项目 / split this project」→ `propose_split`）；`get_pack` 超了上限时那一行 `[... N older timeline entries …]` 后面加一句：这个项目很长，问用户要不要拆成几个子项目，用 `propose_split` 提（⚠️ 那一行是 pack 正文，只在 MCP 这一侧，`templates.ts` 那一侧不跟 —— 用户自己复制的 pack 不需要这句；照 P9E `REF_BLOCK_HIDDEN` 的先例）。`list_threads` 不加（只在 AI 真读到被截断时才问，第 131 条「只靠 AI 提」）。
  6. 写表照 P9E 的规矩写 `main.<表>`；私密项目的金丝雀测试（`private_projects_are_invisible_on_every_ai_surface`）加上这个工具的调用，照样逐字节一致。
- 验收（测试）：排进去一份、回执里没有「拆好了」；各种拒绝（别的项目的块、一块进两组、私密项目、已有一份在等、`why` 空）；成对被拆开时回执点名；路由测试 / annotations 测试照旧绿；金丝雀多一条。新二进制 `--mcp` 连真库副本调一次，表里多一行、别的一个字节没变。

### P9G-3 · 待审卡 + 用户点头之后真的拆

- 要做：
  1. 待审面多一种卡（`ReviewPanel`）：顶上 AI 的 `why`；每一组一段：组名（能改）、AI 写的一句摘要（看得到）、组里的块（块号 + 第一行，照别的卡的样子）；每一块能改去哪一组（或「留在原项目」）；没挂在块上的项目文件、跟进行，每一个旁边一个「去哪」（默认留在原项目，AI 提了就照 AI 的）；成对的更正 / 取代被分开时，卡上一句提醒（大白话：「#20 和 #21 分开之后，#20 那句话上的底色记号会没」）；两个按钮「拆分 / 不拆」。私密项目：卡上照常显示（用户看得见私密项目），AI 本来就提不了。
  2. 点「拆分」：
     - 在**同一个工作区**里建子项目（撞名自动加「 2」，和用户那一侧一样），私密跟原项目一样；摘要用 AI 那一句（`summary_source` 照 AI 写的算，之后 AI 能更新）；
     - 每一块用 `moveBlock` 移过去（id 不变、块号能留就留、挂在块上的文件跟着）；选了去向的项目文件、跟进行改 `thread_id`；
     - 原项目里写一块总览（「这个项目在 2026-10-16 拆成了 3 个子项目：〈A〉〈B〉〈C〉」，来源标成 Spool 自己），后面每个子项目一个链接块（`kind = 'ref'`）；没分走的块原样留在原项目；
     - **一次 ⌘Z 撤回整次拆分**（块移回去、文件和跟进行回去、子项目和总览块删掉），照 `buildMoveUndo` 的路子；
     - 拆完删掉那一行提议；左栏、右栏、待审数字跟着刷新。
  3. 「不拆」：删掉提议，什么都不动。过期的照别的提议一样清。
- 验收：测试 —— 拆完块的 id 和块号、挂在块上的文件、图片、引用（别的项目引用它的那条边照样通）都在；项目文件和跟进行去了指定的地方；总览块和链接块在、指向对；私密跟原项目一样；⌘Z 一下全部回到拆之前（逐块比 id、`thread_id`、`seq`）；「不拆」什么都没动。截图（中英，§46 / §48 的办法）：卡片、改分组、成对被拆开的提醒、拆完的总览。真手指交给 Ocean（§6）。

## 4. 什么时候停下来问

- 总览那块的说法、卡片上的措辞 Ocean 没定死：按上面写的做，截图里给他看；要大改就问。
- 一组只剩一块、或者 AI 把几乎所有块都留在原项目这类边角，执行窗按「照用户在卡上改」处理；要加规矩（比如每组至少几块）先问。
- 发现拆完之后有东西「存在于库里、屏幕上和 AI 都看不到」（就是 10-16 #21 那一类）—— 先停下来说。
- 换装（会迁库到 v35）—— 先问。

## 5. 做完三步之后：换装（先问）

- 先问 Ocean「现在换装吗」，说清：真库从 v34 迁到 v35；装完开着的 AI 客户端都要重启，旧的会一直报「库比服务新」。
- 做法照 P9E 任务书回执 §7.6：真库最新副本先跑真迁移 + 新二进制 `--mcp` 探针；装前记数字；`VACUUM INTO` 备份真库，`settings` / `focus` / `drafts` 三个 json 拷到桌面；Developer ID 构建（环境变量、公证变量 unset、日志进文件，TSA 失败就整个重跑）；停 GUI 之前问有没有正在编辑的字；按 pid 停 GUI 和 `--overlay`，`--mcp` 一个不碰；旧包挪进 `~/Desktop/Spool/spool-pre-install/`，新包 `ditto` 成 `.new` 再改名；装后核 sha256、进程启动时间和 txt inode、stderr 两行、真库 `user_version` = 35 / `integrity_check ok` / 各表数字不变 / 多一个 `pre-migration-v34` 快照、`settings.json` 不变、`--mcp` 一个没少。
- commit、build、换装分开记；不 push、不发版。

## 6. 给 Ocean 的验收单（换装后给，大白话）

1. 先把开着的 AI（Claude Code、Codex、Claude 桌面版）都重启一下。
2. 跟 Claude 说：「看一下〈Memo产品复活｜Claude独立调研〉」。它读到这个项目太长，应该问你要不要拆，并提一份拆法。
3. 回到 Spool，打开待审：有一张「拆分」卡。看一眼分组；把一块挪到另一组，改一个组名；把一个文件或一条跟进行指到某个子项目。
4. 点「拆分」：左栏多了几个子项目；原项目里只剩一块总览，点里面的链接能跳到子项目；子项目里的块号还是原来的号。
5. 按 ⌘Z：一切回到拆之前。再让 Claude 提一次，这次点「不拆」：什么都没变。
6. 有问题直接说哪一步、看到了什么。

## 7. 回执（执行窗填写）

### 7.0 开工

- 开工指令：Ocean 10-16「读TASKBOOK-P9G-PROJECT-SPLIT-2026-10-16.md，开始任务」。
- **P9E 验收结果**：HANDOFF 记到 §9.2 第 135 条（验收第二轮那一条已修 `a54406d`、已换装），**没有一句「P9E 验收通过」**。按 Ocean 这句开的工，收尾时请他确认 P9E（HANDOFF §9.2 第 136 条）。P9E 两轮报回来的问题都已修完、已换装。
- 起点：HEAD `d24641e`（`3047bf5` 之后多了 P9E 两轮验收的修复 `13b6e7b` `a54406d` 和几笔 docs），`src` / `src-tauri` 没有未提交的改动；工作树里研究线那几份 docs 是别人的，没碰、没暂存。
- 基线（`d24641e` 实测）：`npx tsc -b` 干净 · `npx vitest run` 101 个文件 / 1121 条 · `cargo test` 200 过 · 5 跳过 · sidecar 14 · `i18n-check` `(none missing)` · `--dead` 87 · `cargo tree` 那条空。
- §2.1 对着代码核过，**八行都对得上**（`3047bf5` 之后改过的只有左栏菜单那几个文件，§2.1 没点名）：`PACK_DEFAULT_MAX_CHARS = 50_000`（3812 行）、省略行（1255 行起）、`moveBlock`（`blocks.ts` 1002 行，只改 `thread_id` / `seq` / `created_at`，挂在块上的文件跟着改）、`buildMoveUndo`、`correctionsBySource` 只看本项目的块、`Composer.tsx` 137 行的链接块、项目级的那几样、待审的四张表和 `PROPOSAL_TTL_DAYS`、撞名加「 2」、v34。§2.1 没列、做的时候碰到的一件：`engine.rs` 的 `ALLOWED_TOOL_NAMES` 有测试钉着「必须等于全部工具」，加工具要跟着加（见 7.2）。
- 收尾时的数字：tsc 干净 · vitest **103 个文件 / 1136 条** · cargo **207 过** · 5 跳过 · sidecar 14 · `(none missing)` · `--dead` 和开工逐行一样 · `cargo tree` 那条空 · clippy 没有落在改动行上的警告。

### 7.1 P9G-1 · 库 v35

- 提交：`1800586 feat(db): P9G-1 库 v35 —— 一张拆分提议表 split_proposals（Ocean 10-16 第 125 – 131 条）`
- 改的文件：`src/lib/db/schema.sql`（新表 `split_proposals` + 索引 `idx_split_proposals_thread`，注释写了每一列）、`src/lib/db/client.ts`（v34 → v35 一步 + `SCHEMA_VERSION = 35`）、`src-tauri/src/mcp.rs`（`EXPECTED_SCHEMA_VERSION = 35`，同一笔）、测试：`client.test.ts`、`transfer.test.ts`。
- 表：`id`、`thread_id`（`REFERENCES threads(id) ON DELETE CASCADE`）、`client`、`why`、`plan`（JSON：`groups` 每组 `title` / `summary` / `block_ids`，`files` / `follow_ups` 每条带组的下标）、`created_at`、`expires_at`。只有 `CREATE TABLE IF NOT EXISTS` + 它自己的索引，没有 rebuild 分支。导出导入不带它（`MERGE_TABLES` 本来就是白名单，加了一条测试钉住）。
- 验：
  - 测试：v34 → v35 逐表逐行相等、别的建表语句一个字没变、只多一张空表和索引；半跑一次（表建了、版本没盖章）能重跑；新装直接有。老的迁移测试（v31 / v32 / v33 / v34）比建表语句时把 v35 这张表抹掉（`notV35`）；v34 那条「`CURRENT_SCHEMA_VERSION` 是 34」挪成 v35 测试里的「是 35」，v33 → v34 半跑那条改成跟 `CURRENT_SCHEMA_VERSION` 比。
  - **真库副本**（`sqlite3 -readonly … VACUUM INTO` 到 scratchpad，scratchpad 里的 vitest 跑 `__migrateSchemaForTest`）：v34 → v35、`fresh` = false、`integrity_check ok`、14 张表每一列的条数和总长都和迁之前一样（项目 76、块 1198 · 正文 477206、文件正文 718253、图片 18 张 9136780 字节、跟进 23），新表是空的。没起 debug 版 GUI，真库没碰。
  - **装着的 v34 `--mcp`**（`/Applications/Spool.app`）连迁过的副本：`Spool's database is v35, newer than this MCP server (v34) …`，`isError: true`。

### 7.2 P9G-2 · MCP `propose_split`

- 提交：`009722d feat(mcp): P9G-2 propose_split —— AI 提议拆项目，只排队，一块都不挪…`
- 改的文件：`src-tauri/src/mcp.rs`、`src-tauri/src/engine.rs`（白名单加一个名字）。
- 工具：`propose_split(thread_id, groups, why, files?, follow_ups?)`。只写 `main.split_proposals` 一行；回执标题行开头是「还没拆 / Nothing was split yet」，说清「现在一块都没动，他在卡上能改分组，点『拆分』之后才会拆」；payload 是 `queued: true` / `written: false`、每组几块、几块留在原项目、成对被分开的有哪些。
- 核对（都在排进去之前，报错只说位置，不回显 id）：项目走视图（私密项目 = 不存在的项目，一字不差）；每个 `block_id` 在这个项目里（别的项目的块、私密块、不存在的 id 回同一句）；每块只进一组；2 – 8 组；组名不空、不重名（不分大小写、不看首尾空白）；why 必填、300 字内；已有一份没过期的 ⇒ 「已经有一份在等用户」。
- 成对：项目里 `corrects` / `supersedes`（`ref_kind`）和 v32 起记在旧块上的 `replaced_by_block_id`，两块落到不同地方的按块号列出来；更正那一种说「被更正那一句上的底色记号就没了（两块都还在）」，取代那一种说跨项目照样指得过去；末尾一句让 AI 告诉用户在卡上把一对挪进同一组。不拒绝。
- 写入开关：和别的提议一样（报错多一句「它本身不写入，但用户点头就会改库」）。annotations：`readOnlyHint: false`、`destructiveHint: false`、`idempotentHint: false`。
- 路由：`OPENERS` 加一行（「这个项目太长了 / 拆成几个子项目 / split this project / get_pack 被截短 → 先问用户，同意了再 propose_split，只排队，说在等他」）。`get_pack` 被截短时，省略那一行（`[... N older timeline entries …]` 和只报数的那一种都算）**下一行**出一句：这个项目很长，问用户要不要拆，同意了用 `propose_split` 提。只在项目本身超过 5 万字时出（传小 `max_chars` 读一个不长的项目不出），这句算进 `max_chars`；只在 `get_pack` 这一个工具里（`distill` / `follow_up` / `follow_up_brief` 三个 prompt 不带，`templates.ts` 不跟，`list_threads` 不加）。
- 测试（先红后绿，7 条新的）：排进去一份、别的表逐字节不变、plan 按组下标存、回执没有「拆好了」（中英各一条）；各种拒绝（上面那些，外加挂在块上的文件、旧版、别的项目 / 私密的文件、组名对不上、待审中的跟进行、空组、summary 空、why 超长），每条都没写进任何东西、没回显 id；成对被拆开时回执点名；写入开关；annotations / 必填参数 / 路由 / `list_threads` 不提；超过上限的 pack 在省略行下一行出提示、小项目小 `max_chars` 不出、没超不出。金丝雀多 5 次调用（私密项目、私密块、私密文件、私密跟进行、一份正常的），两个库输出照样逐字节一样。另外两条已有的测试跟着改：写工具名单加 `propose_split`；`ALLOWED_TOOL_NAMES` 24 → 25（两处写着「24 个工具」的注释改成 25）。
- **真库副本**冒烟（新构建的 `target/debug/spool --mcp`，不是 GUI，连迁到 v35 的副本）：25 个工具；〈Memo产品复活｜Claude独立调研〉的 `get_pack`（49905 字）在「5 older timeline entries」下一行出提示；`propose_split`（#1 – #8 一组、#9 – #14 一组）排进一行，回执点名 `#16 corrects #3`、`#19 corrects #9`、`#20 corrects #14`、7 块留下；除 `split_proposals` 以外 `.dump` 逐字节一样。

### 7.3 P9G-3 · 待审卡 + 拆分

- 提交：`37a1631 feat(review): P9G-3 待审「拆分」卡 + 用户点头之后真的拆，一次 ⌘Z 全部撤回…`
- 改的文件：`src/components/Review/ReviewPanel.tsx`（`SplitCard`）、`src/lib/split/projectSplit.ts`（新：读卡片要的东西、卡片初始样子、成对识别、拆、撤、重做）、`src/lib/db/splitProposals.ts`（新：列表 / 计数 / 重读 / 删 / 过期清）、`src/lib/db/threads.ts`（`setThreadAiSummary`）、`attachments.ts`（`moveAttachmentsToThread`）、`followUpItems.ts`（`moveFollowUpItemsToThread`）、`src/stores/proposalsStore.ts`（`approveSplit` / `rejectSplit`、计数、过期清）、`src/lib/undo/undoLog.ts` + `src/stores/undoStore.ts` + `src/hooks/useUndo.ts`（撤销种类 `split`）、`src/overlay/CaptureOverlay.tsx`（撤销浮窗动作名「拆分项目」）、`src/lib/db/librarySignature.ts`（盯 `split_proposals`）、`src/lib/i18n/index.ts`，测试：`src/stores/projectSplit.test.ts`（新）、`src/components/Review/ReviewPanel.split.test.tsx`（新）、`outsideWrites.test.ts`。
- 卡：顶上 AI 的 why；每一组一段（组名是输入框、AI 那一句摘要、组里的块：块号 + 第一行 + 「去哪」下拉）；「留在〈项目〉的块」一段；没挂在块上的项目文件、跟进行各一行带「去哪」（只列会建的组 + 留在原项目）；成对被分开时每对一句；一组没有块时写「拆的时候不会建这个子项目」；底下一句「拆分之后……按 ⌘Z 能一次撤回」；按钮「拆分（N 个子项目）」（N 只数会建的）/「不拆」。
- 点「拆分」（`applySplit`，点的那一刻重读提议和项目）：同一个工作区里建子项目（撞名加「 2」）、私密跟原项目、摘要用 AI 那一句（`summary_source = 'mcp'`）；块用 `moveBlock` 移过去（id / 块号 / 时间不变，挂在块上的文件跟着，图片按块 id 本来就跟着）；项目文件连同它的旧版、跟进行去卡上选的组；原项目末尾写一块总览（来源 `Spool`）+ 每个子项目一个链接块；删掉提议。待审数、左栏、原项目时间线刷新；toast「拆成了 N 个子项目。按 ⌘Z 能一次撤回。」
- ⌘Z（`reverseSplit`）：先删总览和链接块（腾出块号）、块回原来的块号和时间、文件和跟进行回去、子项目软删。**拆完之后有人往子项目里写的块、文件、跟进行也一起回原项目**，撤销不会把东西留在一个删掉的项目里。重做（`redoSplit`）照记录恢复子项目再拆一次。撤销记录边拆边填：拆到一半出错，toast 说「已经挪过去的，按 ⌘Z 能撤回」，那一条撤销照样进去。
- 「不拆」：删掉那一行，别的不动，不进撤销。过期的和别的提议一样（「清掉」那一下一起清）。
- 测试：`projectSplit.test.ts` 9 条（真 SQLite + 真 schema）—— 拆完块的 id / 块号 / 时间都在、挂在块上的文件和图片、别的项目对它的引用、项目文件连旧版、跟进行、总览和链接块（指向对）、提议删掉、待审数归零、子项目在同一个工作区（撞名「调研 2」）、摘要是 AI 写的；**⌘Z 一下逐块比 id / thread_id / seq / created_at 全部回到拆之前**、文件和跟进行回去、子项目没了，重做再拆、再撤一次照样回去；「不拆」四张表逐行不变；卡上改组名 / 挪块 / 改去处照卡上的拆；空组不建、指到它的文件留下；拆完往子项目写的块撤销后回到原项目；私密拆出私密；提议之后删掉的块不出现、新来的块默认留下；成对拆开的识别。`ReviewPanel.split.test.tsx` 3 条（真组件服务端渲染，中英）。`outsideWrites` 的记号测试多一步「提议拆项目」（改之前当场红）。
- **截图**（`~/Desktop/Spool/P9G-screenshots-20261016/`，中英各一张；数据是真库副本 + 真 lib 跑出来的：`harness/gen.test.ts` 在副本上排提议、读卡、**真跑一次 `applySplit`**，截图脚本在同一个文件夹的 `harness/`，办法同记忆 `isolated-verify-workflow` §46 / §48）：
  - `p9g3-card-*`：〈Memo产品复活｜Claude独立调研〉的卡（#1 – #8「早期调研」、#9 – #14「方案」、#15 – #21 留下；三对更正被分开的提醒）。⚠️ 卡上「谁提的」显示成 Claude · MCP：那份提议是本窗的 `--mcp` 探针排进副本的（它报的名字是 p9g-probe）。
  - `p9g3-card-regrouped-*`：改分组之后（第二组改名「最终方案」、#16 挪进 #3 那一组 ⇒ 那一条提醒没了，还剩两条）。
  - `p9g3-card-followups-*`（〈Flux〉的 6 条跟进行，各有去处）、`p9g3-card-files-*`（〈Lecture 1〉的 2 个项目文件）—— 这两个项目的拆法是截图用、照 AI 的口气写的。
  - `p9g3-after-split-*`：拆完的原项目 —— 左栏多了「早期调研」「方案」；时间线 #15 – #21 留下，#22 总览「这个项目在 2026-10-16 拆成了 2 个子项目：〈早期调研〉、〈方案〉」，#23 #24 两个链接块；#21 底下「更正了其中一处：⑳」照样指得到 #20。
  - `p9g3-subproject-*`：子项目「早期调研」，块号还是从 #1 起。
- 真手指：交给 Ocean（§6）。

### 7.4 还差什么、偏离、新发现

- 还差：换装（§7.5，先问）和 Ocean 按 §6 验收。没 push、没发版。
- 偏离 / 执行窗定的（任务书没写死的地方）：
  1. MCP 那一侧每组**至少一块**（空组不是一个子项目）、每组的 `summary` 必填（一句，200 字内）—— 照参数表「每组 `title`、`block_ids`、`summary`」理解成必填。卡上用户把一组挪空是允许的：那一组不建（§4「照用户在卡上改」）。
  2. `files` / `follow_ups` 里的 `group` 写组名（AI 好写），存的时候换成组的下标。
  3. `files` 只认没挂在块上、没被取代的文件（挂在块上的跟着块走，旧版跟着新版走）；`follow_ups` 不认还在待审的那几条。卡上同样只列这些；文件挪的时候连它的旧版一起挪。
  4. 成对提醒也报「取代」那一种（任务书写的是「更正 / 取代成对」）；取代跨项目照样点得过去（`ReplacedByLine` 本来就跨项目），所以那一句说法不同。
  5. 拆分提示只在 `get_pack` 这一个工具里出，`distill` 和两个跟进 prompt 不带（跟进是无人值守的引擎跑，没人可问）。
  6. `engine.rs` 的 `ALLOWED_TOOL_NAMES` 加了 `propose_split`（测试要求「白名单 = 全部工具」，DISCOVERED-20260923-1 的教训）⇒ 无人值守的引擎跑也调得到它，见新发现 `-5`。
  7. 组名清空了就用 AI 原来那个名字；两组同名时第二个照「撞名加 2」。
  8. 撤销时子项目是**软删**（和用户删项目一样），不是硬删；拆完之后写进子项目的东西一起回原项目（上面 7.3）。
  9. 总览块的日期用本机日期，语言用拆的那一刻的界面语言（它是库里的一块，和教程一样不跟着切换重译）。
- 新发现（HANDOFF §9.9，默认 captured）：
  - `DISCOVERED-20261016-4`：待审里一条「挂文件」提议指着某一块，那一块被拆分挪走之后，卡上说「原来那一块已经删了」，点同意挂到原项目上，不跟着块走。
  - `DISCOVERED-20261016-5`：无人值守的引擎跑（跟进、周回顾）如果自己调 `get_pack` 读到一个超过 5 万字的项目，会看到「问用户要不要拆」—— 没人可问，它可能直接排一张拆分卡。只是一张卡（点「不拆」就没了），但不是用户要的。要 Ocean 定。
  - `DISCOVERED-20261016-6`：待审卡上只有图片的块，块号后面是空的（取第一行文字，图片行不算）—— 拆分卡和取代卡都一样。

### 7.5 换装

- **已换装**（Ocean 10-16「P9E 验收过了吗：通过，现在换装」，HANDOFF §9.2 第 137 – 138 条；停 GUI 之前又问了一次有没有没点「完成」的字，答「没有，直接换」，`drafts.json` 停之前是空的）：
  - 构建：在 `09042b8` 上（`src` / `src-tauri` / `site` / `scripts` 没有未提交改动，`tauri.conf.json` 没改；P9G 三步都在里面），命令同 P9C §7.5（`APPLE_SIGNING_IDENTITY` 走环境变量、公证变量全 unset、日志进文件）；「skipping app notarization」；TSA 一遍过（`spool` 22:25:12、`spool-ai` 22:25:11）；`--verify --deep --strict` 过。真库最新副本（`VACUUM INTO` 到 scratchpad）先跑真迁移：v34 → v35、`fresh` = false、ok、14 张表每列条数和总长不变、新表空。新二进制 `--mcp` 连迁过的副本：**25 个工具**（含 `propose_split`）、列表 58 个项目（活着的 59 个里那 1 个私密的照旧看不到）。
  - 装前：`spool` sha256 `1454e210…`（P9E 第二轮那版）、`Unnotarized Developer ID`。真库 v34 · ok · 工作区 30 / 项目 76（私密 1）/ 块 1206 · 正文 486664 · 批注 14800 / 文件 66 · 正文 718253 / 图片 18 张 9136780 字节 / 跟进 27 / 引擎记录 26 / 待审 0；迁移快照 26 个；`settings.json` 26 个键。
  - 备份（桌面）：`spool.before-p9g-install-20261016-222533.db`（数字和上面逐项一样）、`settings.before-p9g-install-20261016-222533.json`、`focus.before-…json`、`drafts.before-…json`。
  - 停：GUI 50386、`--overlay` 50459 按 pid `kill -TERM`，半秒内都退了；**17 个 `--mcp` 一个没碰**（装后逐个核过还活着）。旧包挪到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261016-222533-pre-p9g.app`；新包先 `ditto` 成 `Spool.app.new` 再改名换进去，`open --stdout … --stderr …` 起来。
  - 装后：sha256 `404e2caf…` 和构建产物一致；主进程 25128（22:32:06）、`--overlay` 25209（22:32:07），txt inode 都是 81550555 = 新文件；`spctl` = `Unnotarized Developer ID`（和装前一样）；stderr 只有 `[overlay] helper started` 和 `[double-tap] installed at HID/active` 两行。**真库 v35** · ok，上面那一串数逐项和装前一样，`split_proposals` 0 行；快照 26 → 27，多的是 `spool.pre-migration-v34-2026-10-16T21-32-08-251Z.db`；`settings.json` 逐键一样（26 个）。
  - ⚠️ 开着的 AI 客户端（Claude Code、Codex、Claude 桌面版）要重启，没重启的会一直报「库比服务新」（故意的）。
  - commit、build、换装分开记在上面；**没 push、没发版**。

### 7.6 验收（Ocean 2026-10-16）

- Ocean 原话「验收通过」（HANDOFF §9.2 第 139 条）。验收那一份拆分提议是执行窗应 Ocean「你来作为 MCP 访问项目，然后提出请求」提的：执行窗自己那条 MCP 连接还是换装前的旧程序（报「库比服务新」），所以用 `/Applications` 里的新程序 `--mcp` 连真库，`clientInfo` 报 `claude-code`（设置里只刷新已有的「Claude Code」那一行，没多出客户端），卡上显示「Claude Code · MCP」。真库上 `get_pack` 读〈Memo产品复活｜Claude独立调研〉（约 5.86 万字）时，拆分提示就在省略行下一行。
- 之后 Ocean「再提一次拆分，另外，把其他字数多的项目都提一次拆分」（第 140 条）：照「超过 5 万字」那条线，AI 看得见的有三个 ——〈Memo产品复活｜Claude独立调研〉（照原拆法再提一次，**Ocean 已点「拆分」**：原项目留 #1 #14 #15 #18 #20 #21 + #22 总览 + #23 #24 链接，两个子项目块号照旧）、〈老师信息〉（33 块，按推荐人状态拆两组，三对更正都在同一边）、〈填空〉（396 块，正文只有 3 万字、超线主要是块多；按真题 / 单词拆两组，方法笔记、两道数学题和两块误存的 CODEX-HANDOFF 留下）。后两份在待审里等他。〈Memo产品复活｜Codex独立调研〉是私密项目，AI 看不到，没提。

## 8. 收尾的文档动作（执行窗做）

- 首屏改成 `COMPLETE —— 待 Ocean 验收`，移进 `docs/archive/product-taskbooks/`。
- HANDOFF：§9.3 P9G 那一行写「已完成，任务书在 archive/…」；§9.2 记换装那一问；§9.8 写唯一下一步（Ocean 验收 P9G ⇒ 发版一）；新发现进 §9.9。
- `docs/README.md` 入口那一行跟着改（只暂存自己那一行）。
