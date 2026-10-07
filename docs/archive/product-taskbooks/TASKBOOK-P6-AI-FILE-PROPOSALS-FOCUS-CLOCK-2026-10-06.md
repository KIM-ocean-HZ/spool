# 产品任务书 P6 —— AI 提议挂文件 / 提议新版取代旧版 / AI 看得见文件挂在哪 + 专注时钟加秒针

> **状态：COMPLETE。**（2026-10-07 执行窗做完五步并换装，回执在文末；Ocean 10-07 验收通过。）
>
> **唯一交付：** 下面 §3 的五步（P6-1 – P6-5），按顺序做完、各自测试通过、各自一笔提交，并在 §7 写回执。
>
> **来历：** HANDOFF §9.3 路线图的 P6 段（§9.2 第 7、8、10、25 条）。P5 已于 2026-10-06 由 Ocean 验收通过（「验收通过，下发新任务」）⇒ 按 HANDOFF §9.4 下发本段。
> 施工要点原文从 HANDOFF §9.6 搬过来（那里只留「已下发到 …」）。下发这一窗问了 Ocean 五件 HANDOFF 没写到的事，答复在 §3「Ocean 10-06 拍板」，也记进了 HANDOFF §9.2 第 30–35 条。
> **P6-5（专注时钟加秒针）是 Ocean 10-06 下发时追加的**（原话「新任务加一个需要修改的地方，专注时钟的 interface 需要有指针，每秒转动更新，并且倒计时转盘也每秒刷新」）—— 和文件那四步无关，单独一步、单独一笔提交。
> **「现在」一栏每一条都对着 `ae5354b` 的代码重核过。**
>
> **授权来源：** Ocean 2026-09-30 拍板（HANDOFF §9.2 第 7、8、10 条）+ 10-03（第 25 条）+ 10-05（第 26–29 条）+ 10-06 下发时的五条答复（§3）。本任务书只引用、不改。
>
> **边界：** 只做这五步。不碰实验线（`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行）；不动 `docs/EXECUTION_POLICY.md`；
> **库结构只许这一次、只许新建一张表（`CREATE TABLE` + 它自己的索引）**（P6-1）—— 已有的表一列都不动；
> **MCP 工具只加两个**（P6-2）；⛔ 不碰「文件可读只认 `ai_access`」那条红线（HANDOFF §10.6）；⛔ 「两个 pack 渲染器故意不一致」管的是喂进去的数据，P6-4 只改文件那一行的格式，两边喂的数据照旧不同。
> 不 push、不发版。换装给 Ocean 验收之前先问一句（§5）—— ⚠️ 这一批换装会把真库从 v30 迁到 v31。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：首屏、§9.0–§9.4、§9.8–§9.9、§10.6（产品红线 + 工程护栏，尤其「文件可读只认 `ai_access`」「两个 pack 渲染器故意不一致」「加 MCP 工具」那两行「表头在 TS 和 Rust 里各写一遍」）、§8 的 `DISCOVERED-20260924-1`（Codex 引擎无人值守时会取消非只读工具）。
3. `CLAUDE.md` §3（只改该改的）和 §5（提交信息里不许有任何工具署名）。
4. 上一份任务书：`docs/archive/product-taskbooks/TASKBOOK-P5-PROJECT-FILES-ANCHOR-DEFAULT-READABLE-2026-10-03.md` —— §3 的 P5-1（动库的做法，P6-1 照抄）、§7 回执（换装那一段，§5 照着走；第一、二轮反馈那两节说明右栏现在为什么长这样）。
5. 记忆：⛔ `spool-db-wipe-incident`（**动库之前必读**：只加不改、不碰重建分支、真库副本跑真迁移、同抬 `EXPECTED_SCHEMA_VERSION`、新二进制起 `--mcp` 探针验版本闸）、
   `isolated-verify-workflow`（§34 探针进程、§40–§41 换装、⭐ §44 探针别连真库目录）、`mcp-tool-annotations-required`、`mcp-tool-routing-required`（⛔ 只写描述不改路由文本 = 工具不存在）、
   `tauri-sync-commands-freeze-ui`（新 Tauri 命令一律 `(async)`）、`no-test-environment-spool`、`write-plainly-for-ocean`、`ui-language-follows-system`（新字中英都进字典；MCP 给人看的报错走 `t!`）、
   `pack-header-source-of-truth`、`file-deletion-needs-ocean`、`attribution-grep-false-positive`。
6. 设计稿（只读）：`docs/DESIGN_PROJECT_FILES.md`（§2「路径只来自文件选择器」—— 这一条被 §9.2 第 7 条改成「AI 能提议、点头才挂」，§3.4 申请读文件那条队列是 P6 新队列的样板）、`docs/DESIGN_MCP_WRITE_ROLE.md` §4（待审面）。
7. 每一步开工前，读该步「现在」一栏点名的文件。

## 2. 起点

- 分支：本地 `main`。开工时 `git log -1` 应该是下发本任务书的那笔 docs 提交（标题以 `docs: 下发 P6` 开头），它的上一笔是 `ae5354b`；之后只多了 docs 提交也行。不是就停下来说明。
- ⚠️ 工作树里有**别人没提交的改动**（`docs/` 下研究线的文件、`docs/README.md` 里研究那几行）。**只 `git add` 你自己改的文件的路径**，
  绝不 `git add -A` / `git add .` / `git commit -a`。README 要改的话只暂存自己那一行（HEAD 版本只换那一行，`git hash-object -w` + `git update-index --cacheinfo`）。
- ⚠️ **删文件会被权限拦**：`git rm` 写给 Ocean，请他在输入框里用 `! git rm …` 跑。`git mv` 能自己跑。
- 每步一笔提交，提交信息用中文、一行标题 + 可选正文。提交后跑 `CLAUDE.md` §5 那条自查；命中产品内容里的 claude 字样按记忆 `attribution-grep-false-positive` 复核。
- 测试基线（`7db0d3b` 上实测，开工前先跑一遍对一下，做完每步再跑）：

```bash
npx tsc -b                                                # 干净
npx vitest run                                            # 70 个文件 / 878 条全过
cargo test --manifest-path src-tauri/Cargo.toml           # 153 过 · 4 跳过
cargo test --manifest-path src-tauri/sidecar/Cargo.toml   # 14 过
node scripts/i18n-check.mjs                               # (none missing) —— 这一条也在 vitest 里
node scripts/i18n-check.mjs --dead                        # 87 条 DEAD（基线噪声），每步做完和开工时那份逐行 diff
cd src-tauri && cargo tree -e normal | grep -iE "ureq|rustls|reqwest|hyper|openssl"   # 必须是空的（HANDOFF §10.7）
```

Vitest 输出里有 33 行 `[db] pre-migration backup FAILED … window is not defined`、Rust 编译有 3 条老警告（`spawn_sidecar` 没用、两处 `updated_at` 没读），都是基线噪声。

## 3. 五步

### 原文（从 HANDOFF §9.6 搬过来的，不改）

**P6 · 文件二：AI 提议挂文件、提议取代、读路径**

- 新 MCP 工具两个（名字施工时定）：「提议把某路径挂到某块 / 某项目」「提议用新文件取代旧文件」。都只进待审面，点头才生效。
  待审卡片上显示**完整路径、大小、谁提的、理由**。
- 路径闸（在 Rust 里做，先把路径解析成真实路径、跟过软链接再判）：必须存在；隐藏目录（任何一段以 `.` 开头）、
  系统目录（`/System`、`/Library`、`/private`、`/usr`、`/bin`、`/etc` 这一类）和 `~/Library` 直接拒 ——
  但 `~/Library/Mobile Documents`（iCloud 云盘）和 `~/Library/CloudStorage`（Dropbox / OneDrive / Google Drive）要放行，用户的文件常在那里。
  拒绝语大白话。旧的「传路径当场拒」只对 `request_file_access` 那条路保留。
- `get_blocks` 的文件信息里给路径；「AI 可读」开着时照旧递抽出来的正文（能抽的 pdf / docx / 纯文本）。
- （10-03 加）**「挂在哪一块」给 AI 看**：`get_blocks` 的文件信息和 pack 里文件那一行都写上「挂在 #12 / 挂在项目」（§9.2 第 25 条）。⚠️ pack 那一行两个渲染器都要改、golden 重生；「两个渲染器故意不一致」那条红线管的是喂进去的数据，不是这一行的格式。
- （10-03 从 P5 挪来）右栏「项目文件」里**被取代的收在折叠里仍能看**（P5 已经加了「被谁取代 / 何时取代」两列，P6 不用再动库；P5 里没有任何路能让文件被取代，所以那一格放到这里）。
- 加工具的三条规矩：annotations（这两个都不是只读）、进 `OPENERS` 或 `INSTRUCTION_BODY`、引擎白名单（测试会自动盯）；
  走写入开关；对外说工具个数前重数（现在 22）。注意 §8 的 `20260924-1`：Codex 引擎无人值守时会取消非只读工具。

### Ocean 10-06 拍板（下发这一窗问的，别再问）

| # | 问题 | Ocean 的答复 |
|---|---|---|
| 1 | AI 的提议要排队等点头，得再动一次库（v31，只新建一张表，已有的表一列不动），批不批 | **批准 v31 新建这张表** |
| 2 | AI 提议挂的文件，点头挂上之后默认让不让 AI 读 | **默认可读**（点头就是同意；卡片上要写清楚点头同时给了「挂上」和「读」） |
| 3 | 右栏里 AI 提议、点头挂上的文件怎么标（10-05 他说过「只有 MCP 写回的时候特殊标记」） | **小机器人图标**：文件名前那个文件图标换成和 AI 写的块同一个机器人图标（`lib/blocks/sourceIcon.ts` 给 MCP 来源用的 `Bot`），鼠标停上去写是哪个 AI 提议的。不加字 |
| 4 | 新版取代旧版、点头之后，旧文件在右栏怎么放 | **缩在新文件下面**：旧文件不单占一行；新文件那一行多一个小箭头，点开才在下面显示旧版（变灰）。旧文件不进 pack；AI 读文件列表时仍看得到、标着已被取代 |
| 5 | 专注时钟「指针每秒转动」是哪一种 | **加一根秒针**：另加一根细的秒针，每秒跳一格、一分钟转一圈；原来那根指针和红弧也改成每秒更新。人不在电脑前时它停，回来再走 |

另外记着（10-05，HANDOFF §9.2 第 26–29 条，P5 验收时定的，P6 新加的界面都要守）：右栏是**一张表**、新的在上、带添加时间；块文件只标块号圆圈（`SeqBadge`，不写 `#`）；
「打包可读 / AI 可读」悬停才出现；**不许再出现「你加的 / 挂在项目 / 挂在 #n」这类字**。⚠️ 上面原文里「挂在 #12 / 挂在项目」那几个字**只用在给 AI 的那一侧**（`get_blocks`、pack），界面上不用。

### 现在（`ae5354b`，对着代码重核过）

- **库**：v30（`src/lib/db/client.ts` `SCHEMA_VERSION = 30`，`src-tauri/src/mcp.rs` `EXPECTED_SCHEMA_VERSION: i64 = 30`）。`attachments` 已经有 P5 加的四列 `anchor_block_id` / `added_by` / `superseded_by` / `superseded_at`，
  其中 `added_by` 只写过 `'user'`（`schema.sql` 注释写好了 P6 写什么：那个客户端的 MCP 来源标签，形如 `<客户端> · MCP`），`superseded_by` / `superseded_at` 一行都没写过。
  最后一步迁移 v29→v30（`add-attachment-anchor-and-provenance`）的注释和写法是 P6-1 的样板。
- **已有的三条「AI 提、人点头」队列，各一张表**：`proposals` + `proposal_batches`（`propose_blocks`）、`file_access_requests`（v18，`request_file_access`，`schema.sql:572`）、`supersede_proposals`（v25，`propose_supersede`）。
  `file_access_requests` 的形状（`request_id` 一次请求一组、`client`、`thread_id`、`why`、`created_at`、`expires_at` 7 天）最接近 P6 要的。
- **待审面**：`src/components/Review/ReviewPanel.tsx`（卡片：一批块的提议、`FileRequestCard`（`:176`）、跟进行）；数据在 `src/stores/proposalsStore.ts`
  （`pendingCount` = 三种之和（`:110`）、并行读三样（`:67`）、批准 / 拒绝 `:170` / `:189`、清过期 `:234`）。DB 层样板：`src/lib/db/fileAccess.ts`。
  「整条取代」那一种不在这个面板，在项目里的「过期检测」页签（`compressStore`）。
- **Spool 开着时自己冒出来**（P4-2）：`src/stores/outsideWrites.ts` 每 3 秒查一次 `src/lib/db/librarySignature.ts` 的记号，变了才重读；记号盯的表在 `WATCHED` 里（项目、块、四种待审）。⇒ **新表不加进 `WATCHED`，AI 提了 Spool 开着也看不见**。
- **MCP 工具**：22 个（`mcp.rs` `tools/list` 那一段，`:6553` 起）。`request_file_access`（描述 `:6835`、实现 `request_file_access_json` `:5415`、分发 `:7484`）只收 `attachment_id`，**传路径当场拒**（`:5391` 那段注释）。
  写入开关 `mcp_write_enabled`（`:1268`，默认开）。三道自动盯的测试：`every_tool_declares_its_read_write_annotation`（`:10099`）、`every_tool_is_reachable_from_the_routing_text`（`:12504`，`OPENERS` `:9628` / `INSTRUCTION_BODY` `:9626`）、
  `the_engine_whitelist_is_every_spool_tool`（引擎白名单 `src-tauri/src/engine.rs:75` `ALLOWED_TOOL_NAMES: [&str; 22]`，Gemini 那份 `includeTools` 也读它）。对外文案里没有一处写工具个数（`site/`、README、PRIVACY、SPOOL_OVERVIEW 都核过）。
- **路径**：仓库里**没有**现成的「解析真实路径 + 判目录」的函数（只有 `src-tauri/src/transfer.rs` 的 `same_file` 用了 `canonicalize`）。文本抽取在主窗口里做（`src/lib/attachments/extractor.ts`，走 fs 插件的 `readFile`），
  fs 插件的范围是 `**`（`src-tauri/capabilities/default.json`）⇒ 点头之后主窗口读得到那个路径，不用改权限。
- **`get_blocks` 的文件信息**（`mcp.rs:3156` 起）：已经有 `target`（完整路径）—— 原文「`get_blocks` 的文件信息里给路径」**今天就成立**，不用做；没有挂在哪一块、没有谁加的、没有被取代。
- **pack 文件那一行**：Rust `render_project_file`（`mcp.rs:607`）、TS `renderProjectFile`（`src/lib/pack/assemble.ts:211`），格式 `- 名字 — 路径 (pdf)` / `[extracted: yes, not inlined]`；两边由 golden 盯着（`src/lib/pack/fixtures/golden-pack.json` + `golden-pack.expected.txt`，`golden_pack_matches_fixture` + `assemble.test.ts`）。两边都列项目的**全部**文件，没有「被取代的不列」。
- **右栏**（`src/components/RightRail/ProjectFiles.tsx`，P5 第二轮之后）：一张表新的在上；每行 = 图标（`File` / `Folder`）、名字、块文件的 `SeqBadge`、66px 宽的时间（悬停换成两个勾）、34px 宽的按钮格（块文件「移到项目」+ ×）。不显示谁加的。
- **专注时钟**：`src/components/Sidebar/BreakClock.tsx`（侧栏那张卡的第二面，`SpoolCard` 决定哪一面露出来）。表盘 = 12 个刻度、一圈红弧（这一坐用掉多少）、一根指针（同一个比例）。
  两样都读 `breakStore.activeMs`（`src/stores/breakStore.ts`），而它**每 30 秒才发布一次**：`src/hooks/useBreakReminder.ts` 的 `setInterval(…, TICK_MS)`，`TICK_MS = 30 * 1000`（`src/lib/breakReminder.ts:110`）。
  ⚠️ 30 秒一跳是**有意的**：每一跳都问一次系统空闲时间（`system_idle_ms`）、只给「在工作」的那一跳记时间、单跳最多记一跳的量 —— 这是防「合盖睡觉也记成专注」的那道闸（`src/lib/breakReminder.ts` 的 `MAX_TICK_CREDIT_MS` 那段注释，一跳最多记两跳的量）。
  休息锁屏（`src/components/BreakReminder.tsx`）中间那一圈倒计时**已经每秒重画**（`:57` 的 `setInterval`），不用动。

### P6-1 · 库 v31：新建一张「AI 提的文件」排队表

- 要做：
  1. 迁移 v30→v31，**只许 `CREATE TABLE IF NOT EXISTS` + 它自己的 `CREATE INDEX IF NOT EXISTS`**。一张表装两种提议（挂文件 / 取代），用一列分种类；列名施工时定，至少要能存：
     请求 id、种类、`client`（谁提的，原样存 MCP 来源标签）、`thread_id`、要挂的完整路径（**Rust 路径闸放行之后的真实路径**）、文件大小（提的那一刻量的）、
     挂到哪一块（可空 = 挂在项目）、取代的是哪个文件（`attachment_id`，挂文件那一种为空）、`why`、`created_at`、`expires_at`（7 天，和另外三条队列一样）。
     注释照 v30 写：做了什么、往前老库是什么样（没有这张表 = 没有待审的文件提议）、往回怎么退（`DROP TABLE` 退回 v30，不丢 v30 就有的数据）。
  2. `schema.sql` 同步建这张表（新装的库走这里）；`SCHEMA_VERSION` 31；`mcp.rs` `EXPECTED_SCHEMA_VERSION` 31（注释照 v30 那样写一行）。
  3. `src/lib/db/librarySignature.ts` 的 `WATCHED` 加上这张表（否则 Spool 开着时 AI 提了看不见，P4-2 那条就破了）；`transfer.ts` 的 `MERGE_TABLES` **不加**（待审的提议不跟着库搬，和 `file_access_requests` 同一个理由 —— `transfer.test.ts` 有一条「运行痕迹和授权状态不跟着走」）。
- 不做：⛔ 已有的表一列不改、不回填、不加外键级联到 `attachments` 以外的表；不碰 `ai_access` 的默认。
- 验收：① `client.test.ts` 加 `downgradeToV30` + v30→v31 一条（表在、是空的、别的表逐字节不变），整条历史链照过；新装的空库照 `schema.sql` 也有这张表；
  ② **真库副本跑真迁移**：拿最新的真库备份复制到 scratchpad（P5 那次的写法在 P5 回执里），`fresh === false`、版本 31、所有表计数和正文总长不变、`integrity_check ok`；⛔ 不许碰真库；
  ③ 新二进制起 `--mcp` 探针对着迁好的副本（`SPOOL_DATA_DIR` 指副本，记忆 §44：⛔ 别连真库目录），版本闸两个方向都对（v31 副本通、v30 副本报「库还是旧版本」）；
  ④ `librarySignature` 的测试：往新表插一行，记号变。

### P6-2 · 两个新 MCP 工具 + 路径闸（Rust）

- 要做：
  1. **路径闸**（一个函数，两个工具共用，带单元测试）：先 `canonicalize`（跟过软链接）再判。拒：不存在；不是普通文件（⚠️ 文件夹也拒 —— 原文只说「挂文件」，抽正文也只对文件有意义；施工时定的这一条写进回执，Ocean 要放开再说）；
     任何一段以 `.` 开头；`/System`、`/Library`、`/private`（`/tmp`、`/var`、`/etc` 解析出来都落在这里）、`/usr`、`/bin`、`/sbin`、`/dev`、`/opt`、`/cores` 这一类；`~/Library` —— 但 `~/Library/Mobile Documents` 和 `~/Library/CloudStorage` 放行。
     ⚠️ Spool 自己的数据目录在 `~/Library/Application Support/…` 下 ⇒ 自然被拒，AI 挂不上 `spool.db`，测试里钉一条。拒绝语大白话、中英两份（走 `t!`），说清楚是哪一条挡住的，不说「invalid path」。
     这个项目里已经挂着同一个路径（未被取代的那些里）⇒ 不排队，回一句「已经在这个项目里了」并给出那个 `attachment_id`。
  2. **工具一「提议挂文件」**：参数 = 项目、路径、可选的块（只认这个项目里的块，⛔ 不认别的项目的）、`why`（必填，最多 300 字，和 `request_file_access` 一样）。只排队、什么都不挂；回复告诉 AI「在 Spool 里等用户点头」，⛔ 不许说「已挂上」。
  3. **工具二「提议新版取代旧版」**：参数 = 项目、旧文件的 `attachment_id`（必须在这个项目里、还没被取代）、新文件路径（过同一道闸）、`why`。新文件挂在哪 = 旧文件挂在哪（跟着旧的锚定），不另给参数 —— 施工时定，写进回执。
  4. 两个工具都：`annotations` 写成非只读（`readOnlyHint: false`）；走写入开关；名字进 `OPENERS`（中英两种说法各一行，例：「把这个文件挂到项目里」「attach this file」/「新版本替换旧的」「replace the old file with this one」）和 `INSTRUCTION_BODY`（一句话说清：路径只能提议、要等用户在 Spool 里点头）；
     进引擎白名单（`ALLOWED_TOOL_NAMES` 22 → 24，三道测试会盯）；描述里写清和 `request_file_access` 的分工（那一个只收 `attachment_id`、只要读权限；这两个收路径、要的是「挂上」）。
  5. `request_file_access` 的「传路径当场拒」**原样保留**。
- 不做：⛔ 不在 MCP 进程里写 `attachments`（挂上只发生在 GUI 点头那一刻）；不读文件内容（只量大小）；不改别的工具的输出。
- 验收：Rust 测试钉住路径闸每一类（放行：普通文件、iCloud 云盘、CloudStorage 下的文件、软链接指向普通位置；拒：不存在、文件夹、隐藏目录、系统目录、`~/Library`、软链接指进 `~/Library`、Spool 数据目录、已在项目里）；
  两个工具写进新表的那一行；写入开关关着时拒；三道自动测试过；对外不说工具个数（核过没有地方写）。

### P6-3 · 待审面：两种新卡片，点头才生效（GUI）

- 要做：
  1. `proposalsStore` 读新表、`pendingCount` 加上它；`ReviewPanel` 加卡片（照 `FileRequestCard` 的样子）：**完整路径、大小、谁提的、理由**，挂文件那种写「挂在第 n 块」或「挂在项目」，取代那种写「取代 旧文件名」。
     卡上一句话说清点头意味着什么（Ocean 10-06 #2）：例「同意之后这个文件挂进项目，AI 也能读到里面的文字（右栏随时能关）」。文案大白话、中英都进字典。
  2. **点头 · 挂文件**：走 `createAttachment`（带 `anchorBlockId`），`added_by` = 那一行的 `client`，`ai_access = 1`（10-06 #2），`include_in_pack` 照旧 0；照常触发抽正文（和右栏加文件同一条路）。
     点头那一刻再核一次：文件还在不在、块还在不在（不在就挂在项目、并在卡上说一句）、路径是不是已经在项目里了（是就不重复挂）。⚠️ 别在 GUI 里重写一遍路径闸 —— 排队的路径已经过了闸；点头时只核「还在不在」。
  3. **点头 · 取代**：先像上面一样挂上新文件（锚定 = 旧文件当时的锚定），再给旧文件写 `superseded_by` = 新文件 id、`superseded_at` = 现在。旧文件**不删**、它的 `ai_access` 不动。
  4. **不同意**：那一行删掉，什么都不留（和 `request_file_access` 被拒一样）。过期的照另外三种的规矩清。
  5. 撤销：点头挂上的那一下要不要进 ⌘Z，看接进撤销环的成本，施工时定、写进回执（不进的话，右栏的 × 就是反向操作；取代那一种要能「取消取代」吗 —— 不进撤销环就不做，写进回执）。
- 不做：⛔ 不改 `request_file_access` 那种卡片；不弹窗、不抬窗口（P4-2 的规矩：数字和面板自己变就是全部反馈）。
- 验收：真库 SQLite 测试钉住：点头挂文件（锚定、`added_by`、`ai_access` 1）、点头取代（新文件挂上 + 旧文件两列写上、旧文件还在）、不同意、点头时块已删 / 文件已不在 / 已在项目、过期清理；`pendingCount` 算上新的一种；卡片新字中英都有；Ocean 手指（§6 第 1–3 条）。

### P6-4 · 右栏的机器人图标、被取代的收在新文件下面、AI 看得见挂在哪

- 要做：
  1. **右栏**（`ProjectFiles.tsx`）：`added_by` 是 MCP 来源标签的文件，文件名前的图标换成 `Bot`（和 AI 写的块同一个，`sourceIcon.ts` 的 `isMcpSource` 判），悬停写是哪个 AI 提议的（例「Claude Code 提议、你同意的」，中英）。不加字（10-06 #3）。
     被取代的文件**不单占一行**：缩在取代它的那个新文件下面；新文件那一行多一个小箭头，点开才在下面显示旧版（变灰、带它自己的添加时间，悬停写被取代的时间）；默认收着（10-06 #4）。
     旧版也能打开（点名字 = 用默认程序打开）。连着被取代好几次（v1 ← v2 ← v3）的，全部收在最新那个下面，按时间新的在上。排序、时间列、悬停两个勾的规矩照 P5（§9.2 第 27–29 条）。
  2. **块上那一行文件名**：被取代的不显示（块上只露现在用的那个）。
  3. **`get_blocks` 的文件信息**（`mcp.rs` 那段）加三样：挂在哪一块（块号 `#12` 和块 id，没挂写项目）、谁加的（`user` 或那个 AI 的标签）、被取代（`superseded_by` 的 `attachment_id` + 时间，没被取代就不出这两个字段或为 null）。
     ⚠️ 被取代的文件**照样列出**（AI 读文件列表时看得到，10-06 #4），`ai_readable` 照旧只认 `ai_access`。
  4. **pack 文件那一行**，两个渲染器同时改、golden 重生：每个文件写上挂在哪（例 `- 方案.pdf — /Users/…/方案.pdf (pdf) · on #12` / `· on project`，具体写法施工时定，两边逐字一致）；**被取代的文件不进 pack**（10-06 #4）。
     ⚠️ 只改这一行的格式和「被取代的不列」。两个渲染器喂进去的数据照旧不同（GUI 的 pack 和 MCP 的 pack 对 `ai_access` / `include_in_pack` 的判法，§10.6 那条红线），⛔ 别顺手「对齐」。
     pack 表头说明里要不要加一句讲这个新记号，看 `pack-header-source-of-truth` 那条记忆和两边表头的 `byte-identical` 测试再定；加了两边逐字一致。
- 不做：pack 别的地方不动；`request_file_access` 的输出不动。
- 验收：`assemble.test.ts` / Rust 测试钉住：被取代的不进两边的 pack、文件那一行带挂在哪、golden 两边过；`get_blocks` 三个新字段的样子（被取代的照样列出）；右栏新字中英都有；`(none missing)`；Ocean 手指（§6 第 3–4 条）。

### P6-5 · 专注时钟：加秒针，表盘每秒走（Ocean 10-06 追加）

- 要做：
  1. `BreakClock.tsx` 加一根**秒针**：比现在那根指针细、短一点或长一点（施工时看着定，别和刻度、现在那根指针打架），**每秒跳一格、一分钟转一圈**。颜色、粗细进同一个 40×36 的格子，⛔ 卡片不许变大（那段头注释写了 Ocean 两次定的尺寸约束）。
  2. 原来那根指针和红弧**每秒更新**（10-06 #5）。
  3. **记账照旧 30 秒一跳，界面每秒往前推**：`breakStore` 发布的时候多带两样 —— 这一跳是什么时候、这一跳算不算「在工作」；`BreakClock` 自己每秒重画一次，
     显示的时间 = 上一跳发布的 `activeMs` +（这一跳在工作的话）离这一跳过了多久，**最多推 30 秒**（一跳的量）。秒针、指针、红弧都读这个数。
     这一跳判「不在工作」⇒ 三样都停（Ocean 选项里写的「人不在电脑前时它停，回来再走」）。⚠️ 代价写进回执：人刚走开的那 30 秒里界面会多走、下一跳再退回去（最多退 30 秒）。
     ⛔ **不许为了让它走而改记账**：`TICK_MS`、`tickBreakState`、空闲判断、写盘全部不动 —— 那是防「合盖也算专注」的闸。
  4. 休息锁住的那 5 分钟里（`lockUntil` 有值）：侧栏时钟照旧归零、秒针不走（今天的行为不变）。
  5. 只在这张卡露出来、窗口看得见的时候走；卡片不在、窗口隐藏时不跑定时器（WebKit 后台本来就会把定时器压到 1 秒一次，也别依赖它）。
- 不做：⛔ 休息锁屏那一圈（`BreakReminder.tsx`，已经每秒走）不动；「今天已专注 N 分钟」「N 分钟后歇一会儿」两行字照旧按分钟（⛔ 别改成秒，那一行是 Ocean 定的「两行字」）；不碰 P9 的「活动」图表那摊。
- 验收：纯函数测试钉住「显示的时间」怎么推（在工作：每秒加 1 秒、最多加 30 秒；不在工作：不动；锁住：0）；用 `scripts/wk-snapshot.m` 渲一下表盘（秒针在 0 / 15 / 30 / 45 秒四个位置）看一眼不和别的打架；Ocean 手指（§6 第 5 条）。

## 4. 什么时候停下来问

- 起点不是 §2 写的那样；
- 迁移要做 `CREATE TABLE` / 它自己的索引以外的任何事；真库副本跑迁移失败、计数或正文总长变了；
- 路径闸碰上本任务书没写到的一类（例：外接硬盘 `/Volumes/…`、网络盘）—— 先按「放行 + 写进回执」还是「拒」问 Ocean，别自己定；
- 做下去要加第三个 MCP 工具、改别的工具的输出、或者让窗口自己抬起来；
- P6-5 要动记账（`TICK_MS` / `tickBreakState` / 空闲判断）才能做下去；
- 发现和「现在」一栏对不上的现状（代码已经变了）；
- 要删文件（请 Ocean 跑，见 §2）；
- 发现新问题：**不顺手修**，按 HANDOFF §8 的 DISCOVERED 格式记进 HANDOFF §9.9，继续做本任务。

## 5. 做完五步之后：换装给 Ocean 验收（先问）

- 五步都提交、全部测试通过之后，**先问 Ocean「现在换装吗」**，得到同意再做。问的时候说清 ⚠️ 下面那条（真库要升级、AI 客户端要重启）。
- 照 P5 回执「换装」那一段（命令和核对项都写了）：先看现装的签名（现在是 Developer ID ⇒ `APPLE_SIGNING_IDENTITY` 走环境变量，不改 `tauri.conf.json`，公证变量全部 unset）；构建日志进文件，TSA 偶发失败就整个重跑；
  停 GUI 和 `--overlay` **按 pid**，杀完再查一遍；`--mcp` 一个都不碰；换装前 `VACUUM INTO` 备份真库到桌面；旧包 `mv` 进 `~/Desktop/Spool/spool-pre-install/`；
  换装后核 sha256、进程启动时间、`lsof` 的 txt inode、`[double-tap] installed at HID/active`。
- ⚠️ **这一批会迁移真库（v30 → v31），第一次启动时由 GUI 自己做。** 换装后多核：`PRAGMA user_version` = 31；所有表计数和正文总长和备份一致；真库目录里**正好多出一个** pre-migration 快照；新表在、是空的。任何一样不对：先别动，把新进程停掉，报给 Ocean。
- ⚠️ 迁完之后，所有还在跑的旧 `--mcp` 子进程**每一次调用都会报「库比服务新」**。⛔ 不许去杀它们；回执里写清楚，§6 开头也提醒 Ocean 重启 AI 客户端。
  新版那边是不是通的，用新二进制起探针对着**迁好之后的真库副本**（`VACUUM INTO` 到 scratchpad，记忆 §44），⛔ 别连真库目录。
- commit、build、换装分开记在回执里；**不 push、不发版**。

## 6. 给 Ocean 的验收单（大白话，换装后给 Ocean）

开始前：**把你的 AI 客户端（Claude / Codex）重启一下。** 这次库又升级了一次，换装之前就开着的那些连接每次调用都会报错，重启就好。

1. 在 Claude 或 Codex 里说一句「把我电脑上的 某某.pdf 挂到 Spool 的 某项目 里」（给它完整路径）⇒ 它说在 Spool 里等你点头；Spool 的待审那里多了一张卡，写着完整路径、多大、哪个 AI 提的、为什么。点同意 ⇒ 右栏最上面多一行，图标是小机器人，鼠标停上去写是哪个 AI 提的；「AI 可读」已经勾上。
2. 再让它把一个**隐藏文件夹里的**文件（或者 `~/Library` 里的）挂进来 ⇒ 它当场被拒，拒绝的话你看得懂；Spool 里不多出卡片。
3. 让它「用 某某-v2.pdf 替换项目里的 某某.pdf」⇒ 待审卡写着「取代 某某.pdf」。点同意 ⇒ 右栏只剩 v2 那一行，旁边有个小箭头；点开，下面露出灰掉的旧版，还能打开。
4. 打一次这个项目的 pack ⇒ 文件那一节里有 v2、没有旧版；挂在块上的文件那一行写着挂在第几块。
5. 侧栏专注时钟（就是那张卡翻到时钟那一面时）⇒ 多了一根细秒针，每秒跳一格；你走开不碰电脑，半分钟之内它停下来；回来接着走。

你只要告诉我：这几条里哪几条不对，不对的那条你看到了什么。

## 7. 回执（执行窗填写）

每步一小段：

- 提交：`<hash> <标题>`
- 改了哪些文件（一行一个）
- 怎么验的：命令 + 结果（vitest / cargo 的条数，i18n-check 的输出原文，`cargo tree` 那条的输出；P6-1 另写真库副本迁移和 `--mcp` 探针的结果）
- 施工时自己定的（表和列叫什么；两个工具叫什么、参数；路径闸的完整拒绝清单和文件夹那一条；取代时新文件挂在哪；点头进不进撤销环；pack 那一行的写法、表头加没加；秒针的长短粗细；每秒推算的代价）
- 还差什么、有没有偏离本任务书、新发现记在 HANDOFF 哪里

最后一段：换装（做了没有、装的是哪个 commit、`spctl` 结果、真库备份文件名、真库迁移前后的核对、`--mcp` 子进程还在跑旧二进制这件事）、Ocean 验收（还没有就写「待验收」）。

## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 验收`（Ocean 验过后改成 `COMPLETE`），`git mv` 进 `docs/archive/product-taskbooks/`。
2. `docs/HANDOFF-2026-09-04.md`：§9.3 路线图 P6 那一行改成「已完成，任务书在 archive/product-taskbooks/…」；§9.6 P6 那一行同样改；
   §9.8「唯一下一步」改成「按 §9.4 下发 P7」；`docs/README.md` 入口表里 ACTIVE 产品任务书那一行改成「暂无」（README 只暂存这一行）。
3. 这些文档改动单独一笔提交（同样只 add 自己改的路径）。

### 回执（2026-10-07 执行窗）

起点核过：`git log -1` = `1b859c4`（`docs: 下发 P6…`），上一笔 `ae5354b`。开工前基线和 §2 一样：tsc 干净、vitest 70 个文件 / 878 条、cargo 153 过 · 4 跳过、sidecar 14、`(none missing)`、`--dead` 87 条、`cargo tree` 那条是空的。

施工中问了 Ocean 一次（§4「路径闸碰上本任务书没写到的一类」）：外接硬盘 / 网络盘（`/Volumes`、`/Network`）**放行**；`/Applications` **拒**（算系统目录）。记进 HANDOFF §9.2 第 36、37 条。

#### P6-1 · 库 v31

- 提交：`f46f220 feat(db): 库 v31 —— 新建一张「AI 提的文件」排队表（提议挂文件 / 提议取代旧文件，点头才生效）`
- 改了：`src/lib/db/client.ts`（`SCHEMA_VERSION` 31 + v30→v31 `add-file-proposals`）、`src/lib/db/schema.sql`、`src-tauri/src/mcp.rs`（只有 `EXPECTED_SCHEMA_VERSION` 31 + 一行注释）、`src/lib/db/librarySignature.ts`（`WATCHED` 加新表）、`src/lib/db/client.test.ts`、`src/stores/outsideWrites.test.ts`、`src/lib/db/transfer.test.ts`
- 施工时定的：表叫 `file_proposals`，一次调用一行 = 一张卡（`id` 就是请求 id）。列：`id`、`kind`（`attach` / `supersede`）、`client`（原样存 `<客户端> · MCP`）、`thread_id`、`path`（路径闸放行之后的真实路径）、`size_bytes`、`anchor_block_id`（只给挂文件那种用，空 = 挂在项目）、`supersedes_id`（只给取代那种用）、`why`、`created_at`、`expires_at`（7 天）。索引 `idx_file_proposals_thread(thread_id, created_at)`。外键只有 `supersedes_id → attachments ON DELETE CASCADE`；项目和块不设外键（项目是软删，读的时候 JOIN；块删了点头时挂在项目）。取代那一种**不存锚定**：点头那一刻跟着旧文件当时挂在哪。`MERGE_TABLES` 不加，`transfer.test.ts`「不跟着走」那条把它也钉上了。
- 怎么验的：
  - ① `client.test.ts` 加 `downgradeToV30`（`downgradeToV29` 先调它）+ 两条：v30→v31（表在、11 列、是空的、索引在；别的表逐行相等、别的表的建表语句一个字没变）、新装的库照 `schema.sql` 也有这张表。整条历史链（v2 起）照过。
  - ② 真库副本跑真迁移：`~/Desktop/spool.before-p5fb2-install-20261006-151312.db`（sha256 `8cc1ab80…ba79a53c`）复制进 scratchpad，vitest 里用产品的 `__migrateSchemaForTest` 跑：`fresh === false`、30 → 31、22 张表行数全部不变（工作区 25 / 项目 63 / 块 1020 / 文件 6 / …）、正文总长 293157、批注 12197、文件正文 37833、摘要 674 都不变、`attachments` 整表逐行相等、新表 0 行、`integrity_check ok`。真库没碰。
  - ③ 新 debug 二进制起 `--mcp` 探针（`SPOOL_DATA_DIR` 指副本）：v31 副本 `initialize` 通、`list_threads` 47 个项目 / 13 个工作区；同一个二进制对着 v30 副本，回「Spool's database is still the older v30; this MCP server is v31」⇒ 版本闸两个方向都对。
  - ④ `outsideWrites.test.ts` 的记号测试多一步「提议挂文件」：往新表插一行，记号变。
  - 全套：tsc 干净；vitest 70 / 880；cargo 153 · 4；sidecar 14；`(none missing)`；`--dead` 和开工时逐行一样；`cargo tree` 空。
  - cargo 有一次跑出「151 过 · 2 失败」，没留下是哪两条；之后连跑 18 次（含压着 vitest 同时跑）全过。这一步 Rust 只改了一个常量，判断是老的偶发；记成 `DISCOVERED-20261007-2`。

#### P6-2 · 两个新 MCP 工具 + 路径闸

- 提交：`dd73bad feat(mcp): 两个新工具 —— AI 提议挂文件 / 提议新版取代旧版（只排队，点头才挂）+ 路径闸`
- 改了：`src-tauri/src/mcp.rs`、`src-tauri/src/engine.rs`（`ALLOWED_TOOL_NAMES` 22 → 24）
- 施工时定的：
  - 两个工具叫 `propose_attach_file`（`thread_id`、`path`、可选 `block_id`、`why`）和 `propose_replace_file`（`thread_id`、旧文件的 `attachment_id`、新文件 `path`、`why`）。`why` 必填、最多 300 字。都标 `readOnlyHint: false`、走写入开关、进 `OPENERS`（中英各一行）和 `INSTRUCTION_BODY`（一句：路径只能提议、点头之前什么都没挂）。描述里写清和 `request_file_access` 的分工。
  - 路径闸（`gate_proposed_path`）的完整拒绝清单：空；不是完整路径（`~` 和相对路径都不展开）；不存在；**不是普通文件（文件夹也拒）**；任何一段以 `.` 开头；系统目录 `/System` `/Library` `/private` `/usr` `/bin` `/sbin` `/dev` `/opt` `/cores` `/Applications` `/etc` `/var` `/tmp`；`~/Library`（`~/Library/Mobile Documents` 和 `~/Library/CloudStorage` 放行）。放行：其余位置，包括 `/Volumes`、`/Network`、`/Users/Shared`。判两次：先对 AI 写的那个路径判（禁区里的东西不先告诉它「那儿有没有文件」），再对解析之后的真实路径判（软链接和 `..` 绕不过去，以这一次为准）。拒绝语中英两份，说清是哪一条挡住的。
  - Windows 那一侧照同一个意思写了（系统目录取 `SystemRoot` / `ProgramFiles` / `ProgramFiles(x86)` / `ProgramData`，`%USERPROFILE%\AppData` 当作 `~/Library`）。本机编不了 Windows，只逐行看过。
  - 「已经在这个项目里了」：**不是报错**，正常返回 `queued: false` + 那个文件的 `attachment_id` —— 报错正文是客户端最可能原样念给用户的东西，那里从来不放 id（`mcp.rs` 的 §3.1-3 规矩）；头一句话只说文件名。同样的提议还在等点头，就不排第二张卡。
  - 块只认这个项目里的**文字块**：引用块在界面上不显示文件，挂上去只会出现在卡片上。
  - 取代：旧文件必须在这个项目里、还没被取代；新文件挂在哪 = 点头那一刻旧文件挂在哪。
- 怎么验的：
  - Rust 测试三条：路径闸只看路径（每一类放行 / 拒，含 `spool.db`、`/Volumes`、`/Applications`）；走真磁盘（普通文件、iCloud 云盘、CloudStorage、软链接指向普通位置放行并排真实路径；不存在、文件夹、隐藏目录、系统目录、`~/Library`、Spool 数据目录、`..` 绕路、软链接指进 `~/Library` 和隐藏目录都拒）；两个工具只往新表排一行、`attachments` 一行没动（含已在项目、重复提议、别的项目的块、引用块、why 空 / 超长、已被取代的旧文件、别的项目的旧文件且拒绝语不报它的名字）。三道自动测试（annotations、路由文本、引擎白名单）都过。
  - 真二进制探针对着真库副本：`tools/list` 24 个；提议挂 `README.md` 到某一块 ⇒ 排队、回复「Nothing is attached yet…」；`~/.zshrc` ⇒「hidden location」；`~/Library/Application Support/com.oceanjin.spool/spool.db` ⇒「inside /Users/hzjin/Library…」；提议取代 ⇒ 排队；新表两行、`attachments` 行数没变。`settings.json` 写 `mcpWriteEnabled:false` 再调两个工具 ⇒ 都回「Spool 未允许 MCP 写入…」，一行没排。
  - 对外文案（`site/`、README、PRIVACY、SPOOL_OVERVIEW）没有一处写工具个数，现在是 24。
  - 全套：tsc 干净；vitest 70 / 880；cargo 156 · 4；sidecar 14；`(none missing)`；`--dead` 不变；`cargo tree` 空。

#### P6-3 · 待审面两种新卡片

- 提交：`005c859 feat(review): 待审面多两种卡片 …`，`cbbe178 fix(review): 取代那张卡的标题换行而不截断 …`
- 改了：`src/lib/db/fileProposals.ts`（新）、`src/lib/files/fileProposals.ts`（新，点头那一刻的逻辑）、`src/stores/fileProposals.approve.test.ts`（新）、`src/lib/db/attachments.ts`（`createAttachment` 能带 `addedBy`；`setAttachmentSuperseded`；`findLiveAttachmentByTarget`）、`src/stores/proposalsStore.ts`、`src/components/Review/ReviewPanel.tsx`、`src/lib/i18n/index.ts`；`schema.sql` / `attachments.ts` / `fileAccess.ts` 里「路径只来自文件选择器」那几句注释改成现在的样子（这一步让它们变成了假话）
- 施工时定的：
  - 按钮叫「同意」「不同意」（§6 验收单的说法）。卡片：标题一句「Claude Code · MCP 提议把一个文件挂进〈项目〉」/「… 提议用新版本取代〈项目〉里的「旧文件名」」、文件名 + 大小、完整路径（等宽小字，能选中）、「它说为什么」、一句同意意味着什么。**挂在哪写在这一句里**（「同意之后挂到第 12 块上，AI 也能读到里面的文字（右栏随时能关）。」），不另立「挂在 #n / 挂在项目」这种标签（10-05 那条）。块已删时这一句换成「原来要挂的那一块已经删了。同意之后挂在这个项目上…」。
  - 点头那一刻：文件不在了 ⇒ 不挂、**卡片留着**（可能只是外接盘没插），提示一句；路径已经在项目里 ⇒ 不重复挂、卡片清掉；块不在了 ⇒ 挂在项目。文件在不在复用已有的 `count_missing_targets`（本来就是 async 命令），没加新命令。路径闸没在 GUI 里重写。
  - 挂上走 `blocksStore.attach`（和右栏加文件同一条路，照常抽正文）；`added_by` = 那一行的 client，`ai_access` 1，`include_in_pack` 0。取代：先挂新的，再给旧的写 `superseded_by` / `superseded_at`，旧的不删、它的 `ai_access` 不动。之后整份重读那个项目（没打开过的项目也一样，不留半份）。
  - **不进撤销环**：挂上的反向操作是右栏的 ×；「取消取代」不做（任务书 P6-3 ⑤）。
- 怎么验的：`fileProposals.approve.test.ts` 七条（真 SQLite）：点头挂文件（锚定、`added_by`、`ai_access` 1、`include_in_pack` 0、排队那行没了、右栏那一份里有它）、点头取代（新文件挂在旧文件的块上、旧文件两列写上且 `ai_access` 没变、旧文件还在）、不同意、点头时块已删、文件已不在（卡片留着）、已在项目、待审数算上它 / 旧文件没了的取代提议不算 / 过期的不算且被清掉。用 WKWebView（`scripts/wk-snapshot.m`）中英各渲了一遍卡片，英文标题被截断那处改成换行（`cbbe178`）。全套：tsc 干净；vitest 71 / 887；cargo 156 · 4；sidecar 14；`(none missing)`；`--dead` 不变；`cargo tree` 空。

#### P6-4 · 右栏机器人图标、被取代的收起来、AI 看得见挂在哪

- 提交：`1040aa6 feat(files): 右栏 AI 提议挂上的文件用机器人图标，被取代的收在新文件下面；AI 看得见文件挂在哪`
- 改了：`src/components/RightRail/ProjectFiles.tsx`、`src/lib/files/versions.ts`（新）+ 测试、`src/components/ThreadView/BlockItem.tsx`（块上只露现在用的那个）、`src/lib/pack/assemble.ts` + 测试、`src/components/Pack/PackDialog.tsx`、`src/lib/pack/folder.ts`、`src/lib/pack/fixtures/golden-pack.json` + `.expected.txt`、`src-tauri/src/mcp.rs`、`src/lib/i18n/index.ts`
- 施工时定的：
  - 右栏：`added_by` 是 MCP 来源标签的，图标换成 `Bot`（和 AI 写的块同一个、同一个颜色），悬停「Claude Code 提议、你同意的」。有旧版的那一行，文件名后面多一个小箭头，默认收着，点开在下面露出旧版：缩进、变灰、带自己的添加时间、悬停写「被取代于 …」、点名字能打开；悬停时只出「AI 可读」一个勾和 ×（旧版不进 pack，「打包可读」勾了也没用；AI 读文件列表时还看得到它，所以「AI 可读」有意义）；不标块号。连着取代几次的全收在最新那个下面，新的在上。**新版已经不在这张表里的旧版**（新版被 × 掉了，或者跟着它的块挪去了别的项目）自己站一行、变灰，不会凭空消失 —— 这种情况怎么办记成 `DISCOVERED-20261007-1` 等你定。
  - pack 那一行：两个渲染器都在文件那一行**末尾**加 ` · on #12` / ` · on project`（例 `- rubric.docx  [extracted: yes, not inlined] · on #2`）。只写文件名、不写完整路径 —— 那是已有的规矩（pack 是要贴出去的东西，不带本机目录，`assemble.test.ts` 有一条专门钉它），任务书例子里的完整路径没照搬。被取代的不进 pack，MCP pack 里「没让你读的文件」那一节也不列它。块号由调用方给：TS 加了一个可选参数 `fileAnchorSeqs`（默认取传进来的块），按范围筛过的 pack（PackDialog、工作区导出）传整个项目的，免得挂在范围外那块上的文件写成 `on project`；Rust 在查询里 JOIN。**表头说明没加句子**：`on #12` 本身看得懂，两边表头逐字一致的测试也不用动。
  - `get_blocks` 的每个文件多：`attached_to`（`"#12"` / `"project"`）、挂在块上时的 `anchor_block_id`、`added_by`（空 = `"user"`）、被取代时才出现的 `superseded_by` + `superseded_at`。被取代的照样列出，`ai_readable` 照旧只认 `ai_access`。工具描述补了一句说明这几个字段。
- 怎么验的：golden 两边逐字一致（夹具里 `a3` 挂在 b2 上、新加的 `a5` 已被取代、不许出现）；TS 一条「范围筛过的 pack 仍写对块号、被取代的不进」；`versions.test.ts` 四条（各占一行新的在上、v1←v2←v3 全收在 v3 下、新版不在了的旧版自己站一行、手改出来的环不卡死且每个文件只出现一次）；Rust 一条（`get_blocks` 三个新字段的样子、被取代的照样列出、pack 里新版带 `on #12`、旧版一个字不出现、锁着的那一节也不列）。WKWebView 中英各渲了一遍右栏。全套：tsc 干净；vitest 72 / 892；cargo 157 · 4；sidecar 14；`(none missing)`；`--dead` 不变；`cargo tree` 空。

#### P6-5 · 专注时钟加秒针

- 提交：`1b8ac23 feat(focus): 专注时钟加一根秒针，指针和红弧每秒走；人不在电脑前时停`
- 改了：`src/components/Sidebar/BreakClock.tsx`、`src/stores/breakStore.ts`、`src/hooks/useBreakReminder.ts`（只是发布时多带两样）、`src/lib/focusClock.ts`（新）+ 测试
- 施工时定的：秒针 0.6 粗（指针 1.3）、灰色（`--muted`，红色留给「这一坐」）、从中心伸到 12.4（指针 8.2；刻度 9.0–11.3；红弧内沿约 12.9），穿过刻度但不碰红弧；不加过渡动画，一秒跳一格。卡片尺寸（40×36）没变。指针和红弧照旧带原来那 450ms 的过渡，每秒更新一次。定时器只在：时钟那一面露着、窗口看得见、上一跳算「在工作」、没在休息 —— 四样都满足才跑，否则停着。休息锁着时归零、秒针停在 12 点（今天的行为不变）。两行字照旧按分钟、照旧读上一跳发布的数。
- 记账没动：`TICK_MS`、`tickBreakState`、空闲判断、写盘一行没改；hook 只是把同一份输入先存进变量，再把「这一跳的时间、`isWorking` 的结果」一起发布出去。
- 代价：人刚走开的那半分钟里表盘还会走，下一跳判「不在工作」时退回去，最多退 30 秒。
- 怎么验的：`focusClock.test.ts` 五条（在工作每秒加 1 秒、最多加 30 秒、下一跳迟迟不来也不再往上走、钟往回拨不倒走；不在工作不动；还没跳过就是发布的数；锁着为 0；秒针一秒一格一分钟一圈）。用 react-dom/server 把真组件渲成静态页，再用 `scripts/wk-snapshot.m` 截了秒针在 0 / 15 / 30 / 45 秒四个位置（真实大小 + 放大四倍），秒针分别指 12 / 3 / 6 / 9 点，不和指针、刻度、红弧打架。全套：tsc 干净；vitest 73 / 897；cargo 157 · 4；sidecar 14；`(none missing)`；`--dead` 不变；`cargo tree` 空。

#### 新发现（记在 HANDOFF §9.9，都是 captured，没修）

- `DISCOVERED-20261007-1` 新版文件被去掉之后，旧版仍然标着「被取代」—— 不进 pack，界面上也没有地方把它恢复成现用
- `DISCOVERED-20261007-2` cargo test 偶发 2 条失败（19 次里 1 次），没抓到是哪两条
- `DISCOVERED-20261007-3` `list_threads` 的 `approx_pack_chars` 还把被取代的文件算进去

#### 换装（Ocean 10-07 在下发消息里说「做好换装，我来验收」）

- 构建：`cbbe178`（`src` / `src-tauri` / `site` / `scripts` 没有未提交改动），`env -u APPLE_ID -u APPLE_PASSWORD -u APPLE_TEAM_ID -u APPLE_API_KEY -u APPLE_API_ISSUER -u APPLE_API_KEY_PATH APPLE_SIGNING_IDENTITY="Developer ID Application: Hanze JIN (Q5Y5JRXZ58)" npm run tauri build -- --bundles app`，日志进文件；没改 `tauri.conf.json`，日志里是「skipping app notarization」。TSA 第一遍就过（主程序和 `spool-ai` 都是 01:10:40），没有 `timestamp was expected`；`--verify --deep --strict` 过；打出来的前端里有这一轮的新字。
- 装前：Developer ID、`spctl` = `Unnotarized Developer ID`、0.6.2、`spool` sha256 `8b988601…aa9d715`（P5 第二轮那版）；真库 v30 · 25 / 63 / 1020 / 2（工作区 / 项目 / 块 / 文件）· 正文总长 293157 · 批注 12197 · 文件正文 30490，迁移快照 22 个，`mcp-clients.json` 4 行。
- 停：GUI 50766 + `--overlay` 50789 按 pid `kill -TERM`，2 秒内都退了、再查已不在；`--mcp` 子进程 7 个一个没碰（前后都是 7）。
- 真库备份：`~/Desktop/spool.before-p6-install-20261007-011113.db`（`VACUUM INTO`，integrity ok，v30，各表行数和正文总长与活库一致）。
- 旧包：`mv` 到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261007-011119-pre-p6.app`；新包 `ditto` 进 `/Applications`；`open --stdout … --stderr …` 起。
- 装后：`--verify --deep --strict` 过、Developer ID、`spctl` = `Unnotarized Developer ID`、identifier `com.oceanjin.spool`、0.6.2；`spool` sha256 `42532bb3…eea07f0` 和构建产物一致；主进程 84732（01:11:19）、`--overlay` 84750（01:11:20）都起于换装之后，两个的 `lsof` txt inode 都是 76568363 = 新文件；stderr `[overlay] helper started`、`[double-tap] installed at HID/active`，没有 error / panic。
- 真库迁移（第一次启动时 GUI 自己做的）：`PRAGMA user_version` = 31、`integrity_check ok`；各表行数、正文 / 批注 / 文件正文总长和备份逐项一致；捕捉目标没变（还是那两个项目）；`file_proposals` 在、是空的、索引在；真库目录里**正好多出一个**快照 `spool.pre-migration-v30-2026-10-07T00-11-20-535Z.db`（22 → 23）。
- `--mcp` 探针：拿新装的 `/Applications/Spool.app/Contents/MacOS/spool --mcp`，`SPOOL_DATA_DIR` 指向迁好之后的真库 `VACUUM INTO` 副本（scratchpad 里）：`initialize` 通、`tools/list` 24 个、`list_threads` 47 个项目 / 13 个工作区、`get_blocks` 的文件带上了新字段（那个 PDF：`attached_to: project`、`added_by: user`、`ai_readable: true`）。没连真库目录，真库的 `mcp-clients.json` 前后都是 4 行。
- **`--mcp` 那 7 个子进程跑的还是旧二进制，而库已经是 v31 ⇒ 它们每一次调用都会报「库比服务新」**（别人家 AI 客户端起的，没杀）。Ocean 重启 Claude / Codex 之后就好；§6 开头那句提醒的就是这个。
- commit、build、换装分开记在上面；没 push、没发版。

#### Ocean 验收

**2026-10-07 回复「其他验收通过」—— P6 通过。** `DISCOVERED-20261007-1` 他选了甲（去掉新版时旧版恢复成现用），和他同一条消息里报的 Flux「取代 / 更正点不动」一起并进 P7（`docs/TASKBOOK-P7-RELATION-SUGGESTIONS-IMAGES-2026-10-07.md`）。没发版。
