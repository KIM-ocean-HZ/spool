# 产品任务书 P9G —— 拆项目：项目太长时，AI 提议拆成几个子项目，用户在待审里点头才拆

> **状态：QUEUED**（2026-10-16 下发）—— **P9E 验收之后开工**，发版一之前做完（Ocean 10-16，HANDOFF §9.2 第 126 条）。开工那一窗先看 P9E 验收报回来的问题有没有修完。
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

（基线测试数字；开工时 HEAD；P9E 验收结果；§2.1 有没有对不上的）

### 7.1 P9G-1 · 库 v35

### 7.2 P9G-2 · MCP `propose_split`

### 7.3 P9G-3 · 待审卡 + 拆分

### 7.4 还差什么、偏离、新发现

### 7.5 换装

## 8. 收尾的文档动作（执行窗做）

- 首屏改成 `COMPLETE —— 待 Ocean 验收`，移进 `docs/archive/product-taskbooks/`。
- HANDOFF：§9.3 P9G 那一行写「已完成，任务书在 archive/…」；§9.2 记换装那一问；§9.8 写唯一下一步（Ocean 验收 P9G ⇒ 发版一）；新发现进 §9.9。
- `docs/README.md` 入口那一行跟着改（只暂存自己那一行）。
