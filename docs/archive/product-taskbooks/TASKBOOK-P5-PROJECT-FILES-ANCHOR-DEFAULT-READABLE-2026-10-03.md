# 产品任务书 P5 —— 文件能挂在块上、右栏统一列出、用户亲手加的文件默认 AI 可读

> **状态：COMPLETE —— 待 Ocean 验收。**（2026-10-04：P5-1 – P5-4 已提交（`f322750` `f956e7d` `d3bed3f` `0dad7e7`）、已换装，真库已迁到 v30。2026-10-05：验收第一轮反馈已改（`1cc753e`）、已换装 —— 拖到块上那一套已删掉，块上的入口改成动作条的回形针。2026-10-06：第二轮（块号对齐、时间排齐）已改（`7db0d3b`）、已换装。回执在 §7 末尾。）
>
> **唯一交付：** 下面 §3 的四步（P5-1 – P5-4），按顺序做完、各自测试通过、各自一笔提交，并在 §7 写回执。
>
> **来历：** HANDOFF §9.3 路线图的 P5 段（第 8 条的前半，§9.2 第 6、9 条）。P1–P4 已于 2026-10-03 由 Ocean 验收通过，
> 同日「验收通过，不发版，继续下发下一任务」⇒ 按 HANDOFF §9.4 下发本段。施工要点原文从 HANDOFF §9.6 搬过来（那里只留「已下发到 …」）。
> 下发这一窗又问了 Ocean 三个 HANDOFF 没写到的问题，答复定了四件事（删块时文件怎么办、从哪里挂、移块时文件怎么办、AI 那边看不看得到），在 §3「Ocean 10-03 拍板」，也记进了 HANDOFF §9.2 第 22–25 条。
> **「现在」一栏每一条都对着 `1fc88a2` 的代码重核过**（`src` / `src-tauri` 自 `aa32b8a` 起没变）。
>
> **授权来源：** Ocean 2026-09-30 拍板（HANDOFF §9.2 第 6、9 条）+ 2026-10-03 的三条答复（§3）。本任务书只引用、不改。
>
> **边界：** 只做这四步。不碰实验线（`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行）；
> 不动 `docs/EXECUTION_POLICY.md`；**库结构只许这一次、只许 `ADD COLUMN`**（P5-1）；**不加 MCP 工具**；
> **pack 和 MCP 输出一个字不改**（「挂在哪一块」给 AI 看是 P6 的事，Ocean 10-03 定的）；不碰「文件可读只认 `ai_access`」那条红线（HANDOFF §10.6）。
> 不 push、不发版。换装给 Ocean 验收之前先问一句（§5）—— ⚠️ 这一批换装会把真库从 v29 迁到 v30。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：首屏、§9.0–§9.4、§9.8–§9.9、§10.6（产品红线 + 工程护栏，尤其「文件可读只认 `ai_access`」「两个 pack 渲染器故意不一致」）。
3. `CLAUDE.md` §3（只改该改的）和 §5（提交信息里不许有任何工具署名）。
4. 上一份任务书的回执：`docs/archive/product-taskbooks/TASKBOOK-P4-MCP-PENDING-REFRESH-PACK-BOUNDARY-2026-10-02.md` §7（换装那一段，§5 照着走）。
5. 记忆：⛔ `spool-db-wipe-incident`（**动库之前必读**：只许 ADD COLUMN、不碰重建分支、真库副本跑真迁移、同抬 `EXPECTED_SCHEMA_VERSION`、新二进制起 `--mcp` 探针验版本闸）、
   `isolated-verify-workflow`（§34 探针进程、§40–§41 换装）、`tauri-sync-commands-freeze-ui`（新 Tauri 命令一律 `(async)`）、
   `no-test-environment-spool`（界面不许出现只给开发者看的东西）、`write-plainly-for-ocean`（文案大白话）、`ui-language-follows-system`（新字中英都进字典）、
   `mcp-tool-routing-required`（只改描述不改路由文本等于没改）、`next-stage-goals-website-portfolio`（官网文案铁律）、`file-deletion-needs-ocean`、`attribution-grep-false-positive`。
6. 设计稿（只读）：`docs/DESIGN_PROJECT_FILES.md`（§2 路径只来自文件选择器、§3.2 右栏、§5.1 ① AI 可读开关）—— 其中「AI 默认不读」「文件只挂项目」两条被这一段取代（P5-4 在它首屏加一句说明）。
7. 每一步开工前，读该步「现在」一栏点名的文件。

## 2. 起点

- 分支：本地 `main`。开工时 `git log -1` 应该是下发本任务书的那笔 docs 提交（标题以 `docs: 下发 P5` 开头），它的上一笔是 `1fc88a2`；之后只多了 docs 提交也行。不是就停下来说明。
- ⚠️ 工作树里有**别人没提交的改动**（`docs/` 下研究线的文件、`docs/README.md` 里研究那几行）。**只 `git add` 你自己改的文件的路径**，
  绝不 `git add -A` / `git add .` / `git commit -a`。README 要改的话只暂存自己那一行（HEAD 版本只换那一行，`git hash-object -w` + `git update-index --cacheinfo`）。
- ⚠️ **删文件会被权限拦**：`git rm` 写给 Ocean，请他在输入框里用 `! git rm …` 跑。`git mv` 能自己跑。
- 每步一笔提交，提交信息用中文、一行标题 + 可选正文。提交后跑 `CLAUDE.md` §5 那条自查；命中产品内容里的 claude 字样按记忆 `attribution-grep-false-positive` 复核。
- 测试基线（`aa32b8a` 上实测，开工前先跑一遍对一下，做完每步再跑）：

```bash
npx tsc -b                                                # 干净
npx vitest run                                            # 68 个文件 / 858 条全过
cargo test --manifest-path src-tauri/Cargo.toml           # 153 过 · 4 跳过
cargo test --manifest-path src-tauri/sidecar/Cargo.toml   # 14 过
node scripts/i18n-check.mjs                               # (none missing) —— 这一条也在 vitest 里
node scripts/i18n-check.mjs --dead                        # 87 条 DEAD（基线噪声），每步做完和开工时那份逐行 diff
cd src-tauri && cargo tree -e normal | grep -iE "ureq|rustls|reqwest|hyper|openssl"   # 必须是空的（HANDOFF §10.7）
```

Vitest 输出里有 31 行 `[db] pre-migration backup FAILED … window is not defined`、Rust 编译有 3 条老警告（`spawn_sidecar` 没用、两处 `updated_at` 没读），都是基线噪声。

## 3. 四步

### 原文（从 HANDOFF §9.6 搬过来的，不改）

**P5 · 文件一：挂法、列表、默认可读**

- 现在：`attachments`（`src/lib/db/schema.sql:347`）只挂项目（`thread_id`），`kind` = file / folder，`target` 是文件选择器给的绝对路径，
  有 `extracted_text`、`include_in_pack`、`ai_access`；右栏 `src/components/RightRail/ProjectFiles.tsx` 列文件、勾「AI 可读」。
- 要做：库加列（v30，只许 ADD COLUMN）：挂在哪一块（可空 = 挂项目）、谁加的（用户 / 哪个 AI 客户端）、被哪个文件取代、何时取代；
  块上能挂文件（入口放块的动作条或拖到块上，施工时定一处，别两处都加）；右栏「项目文件」统一列出项目的全部文件，
  按挂上的时间排，标「你加的 / 某 AI 加的」和「挂在 #12 / 挂在项目」，被取代的收在折叠里仍能看。
  **用户亲手挂的默认 AI 可读**，开关照旧能关。
- 相应描述全部改掉（09-30「修改相应的描述」）：右栏文案、MCP 工具描述和路由文本里讲「默认不读、要申请」的地方、
  `docs/PRIVACY.md` + `site/privacy.html` + `scripts/site-zh-privacy.html`（改完跑 `node scripts/build-site-zh.mjs`）、
  `docs/DESIGN_PROJECT_FILES.md` 首屏加一句「§2 / §5 的默认与挂法已被 2026-09-30 的决定取代」。
- 动库规矩见 §10.6 工程护栏和记忆 `spool-db-wipe-incident`（备份、真库副本跑真迁移、抬 `EXPECTED_SCHEMA_VERSION`）。

### Ocean 10-03 拍板（下发这一窗问的，别再问）

| # | 问题 | Ocean 的答复 |
|---|---|---|
| 1 | 文件挂在某一块上，这一块被删掉时怎么办 | 「**提示用户是否删除，获得许可后直接删除，不然就留在项目**」 |
| 2 | 从哪里挂（原文的「动作条或拖到块上，施工时定一处」） | 「**用户可以直接把项目文件拖进 block 中，因为当前拖拽本地文件进入 spool 走的就是项目文件**」⇒ 入口 = 右栏项目文件拖到块上；从访达拖进来照旧是项目文件 |
| 3 | 把那一块移到别的项目时 | **跟着块走** |
| 4 | AI 那边（pack 的文件那一行、`get_blocks` 的文件信息）要不要知道挂在哪一块 | **P6 一起做** ⇒ P5 不碰 pack 和 MCP 输出 |

另外，下发这一窗把原文里「被取代的收在折叠里仍能看」**挪到了 P6**：P5 里没有任何一条路能让一个文件被取代（取代只来自 P6 的 AI 提议），
在 P5 画一格永远是空的折叠，Ocean 验不到。P5-1 照旧把「被谁取代 / 何时取代」两列加上，P6 不用再动库。HANDOFF §9.6 的 P6 条目已经写上这一格。

### 现在（`1fc88a2`，对着代码重核过）

- **表的两种形状**：真库（v29，10-03 备份只读查的）的 `attachments` 列是 `id, kind, target, label, extracted_text, extracted_at, extraction_kind, include_in_pack, created_at, thread_id, ai_access`
  —— `thread_id` 是 v15 用 `ALTER` 加的（可空、没有外键、没有级联）；新装的库照 `schema.sql` 建（`thread_id NOT NULL REFERENCES threads(id) ON DELETE CASCADE`）。
  ⇒ v30 两种形状都要走得通。
- **v15 用 `DROP COLUMN` 去掉过一列 `block_id`**（那时文件属于某一块，`client.ts` v14→v15 `move-attachments-to-thread` 那一步）。
  `client.test.ts` 的老库样本里还有这一列，v15 那一步也按名字认它 ⇒ 新的锚定列**别再叫 `block_id`**，免得读代码的人把两种意思混在一起。
- **迁移注册表**：`src/lib/db/client.ts` `SCHEMA_VERSION = 29`，最后一步 v28→v29（`add-ref-reviewed-and-ref-block-index`，只 ADD COLUMN + CREATE INDEX，注释里写了怎么退回 v28 —— 照它写）。
  Rust `src-tauri/src/mcp.rs:3771` `EXPECTED_SCHEMA_VERSION: i64 = 29`。
- ⚠️ **`--mcp` 每次开库都核版本**（`mcp.rs:1282` `open_db`）⇒ 真库一迁到 v30，所有还在跑的旧 `--mcp` 子进程**每一次调用**都会报「库比服务新」，直到那些 AI 客户端重启 MCP（§5、§6 都要说）。
- **新加文件只有两条路，都是用户走的**：右栏「加文件」走系统文件选择器（`ProjectFiles.tsx:45` `add` → `pickFiles` → `blocksStore.attach`（`:547`）→ `attachments.ts:108` `createAttachment`，写死 `aiAccess: false`）；
  从访达拖进时间线也加成项目文件（`src/hooks/useThreadDropTarget.ts`）。MCP 那一侧没有任何写 `attachments` 的路。
- **右栏 `ProjectFiles.tsx`**：按 `created_at` 升序（`listAttachmentsByThread`，`attachments.ts:85`）；每行：图标、名字（点开 = 用默认程序打开）、× 去掉（文件本身不动）；
  两个勾「打包时带上这个文件的文字」「AI 可以读这个文件」；空的时候那句「这个项目还没有文件。加进来的文件默认谁都不读，打包时也不会带上正文。」（`:83`，字典 `src/lib/i18n/index.ts:464`）。
- **块那一侧**：v15 起块上不显示任何文件。删块（`blocksStore.ts:359` `remove`）、合并（`:645` `mergeBlocks`）的注释都写着「v15 起删块 / 合并不碰文件」；
  移动是 P2 · B4 的两段（`:704` `forwardToThread` 先复制、`:806` `moveForwarded` 再把原块挪过去并删掉副本 / 查重删掉的块），撤销在 `undoStore.ts` 的 `delete` / `merge` / `move`。
  复制到别的项目（转发）不复制文件（`attachments.ts:141` `insertAttachments` 现在没有调用方）。
  删块的入口：块上的删除（`BlockFeed.tsx:559` / `BlockItem.tsx:146`）、多选工具条（`MergeToolbar.tsx:42`）。
- **拖拽**：app 里拖东西**不能用 HTML5 拖放** —— `src/lib/sidebar/railDrag.ts` 头注释写了原因（Tauri 装在 WKWebView 上的原生拖放把事件吞了）；左栏拖项目进工作区是自己用 pointer 事件做的
  （`railDrag.ts` + `stores/railDragStore.ts`，落点用 `data-drop-workspace` 属性认）。
- **库搬迁**（`src/lib/db/transfer.ts`）：`attachments` 在 `MERGE_TABLES` 里，按导出行自带的列名逐列插入 —— 新列应该能跟着走，要用测试证明。
- **对外说明里讲「默认不读」的地方**：右栏那一句；官网首页 `site/index.html:504` `gate-x1`（「Files have their own switch. A document you dropped into a project is not readable by an AI until you say it is, file by file.」）
  和中文 `scripts/site-zh-strings.mjs:176`（「文件有独立权限。对于添加到项目的文档，你需要逐份批准 AI 读取；未获批准时，AI 无法访问文件内容。」）。
  `docs/PRIVACY.md` / `site/privacy.html` / `scripts/site-zh-privacy.html` 里**没有**一句讲文件默认读不读（只说「只保存路径和本地提取的文字」）—— 要加一句说清新默认。
  MCP 工具描述和路由文本里讲的都是「`ai_readable:false` 的文件要用 `request_file_access` 申请」（`search_blocks`、`get_blocks` 的 `include_extracted_text`、`request_file_access`、`INSTRUCTION_BODY`），
  没有一句说「默认」—— 新默认下仍然成立（用户关掉的那些），预计不用改。
- 真库现状（10-03 备份只读）：项目文件 1 个；v29。

### P5-1 · 库 v30：四列 + 两边版本号

- 要做：
  1. 迁移 v29→v30，只许 `ALTER TABLE attachments ADD COLUMN`，四列：**锚定的块**（块 id，可空 = 挂在项目）、**谁加的**、**被哪个文件取代**（文件 id）、**何时取代**（毫秒）。
     名字施工时定（⛔ 别叫 `block_id`）。每一列可空、**不回填** —— 老行读出来就是「挂在项目、用户加的、没被取代」。ADD COLUMN 撞上已存在的列 catch 掉（和 v29 同一个写法）。
     迁移那一段注释照 v29：做了什么、往前老库是什么样、往回怎么退（`DROP COLUMN` ×4 退回 v29，不丢 v29 就有的数据）。
  2. `schema.sql` 的建表语句同步加这四列（新装的库走这里）。`SCHEMA_VERSION` 30；`mcp.rs` `EXPECTED_SCHEMA_VERSION` 30（注释照 v29 那样写一行）。
  3. `Attachment` 类型、`attachments.ts` 里读写整行的那几处（`SELECT_COLS` / `fromRow` / `restoreAttachment` / `ALL_COLS`）带上四列；`transfer.ts` 搬得过去。
  4. 「谁加的」：用户加的存什么、以后 AI 加的存什么，施工时定（P6 才有 AI 加的；这一步只要用户那一种写对，并在注释里说清 P6 会写什么）。
- 不做：⛔ 不重建表、不改已有列、不回填、不加外键级联（真库那一份 `thread_id` 都没有外键，靠 ADD COLUMN 加外键两种形状行为不一样 —— 块删了文件怎么办由 P5-3 的代码管）；
  不碰 `ai_access` 的默认（P5-4 管）；Rust 那边除了版本号一行不改（MCP 读文件的查询都是点名列的，加列不影响 —— 核一遍，写进回执）。
- 验收：
  ① `client.test.ts` 那套历史库样本走到 v30（从 v14 带旧 `block_id` 的老库一路走上来也要过）；新装的空库走 `schema.sql` 也有这四列；
  ② **真库副本跑真迁移**（记忆 `spool-db-wipe-incident`）：拿最新的真库备份复制一份到 scratchpad，用产品的迁移函数跑，断言 `fresh === false`、版本 30、
     工作区 / 项目 / 块 / 附件计数和正文总长不变、四列都在、那 1 个文件的 `ai_access` 没变；⛔ 不许碰真库本身；
  ③ 新二进制起一个 `--mcp` 探针对着迁好的副本（同一条记忆、`isolated-verify-workflow` §34 的探针法），版本闸通过、`get_blocks` 的 `files` 照常返回；
  ④ `transfer` 测试：导出再导入，四列的值原样回来。

### P5-2 · 把项目文件拖到块上；块上看得见；右栏标清楚

- 要做：
  1. 右栏「项目文件」里的一行按住拖到时间线上某一块松手 ⇒ 这个文件挂到那一块上（写锚定列）。⛔ 用 pointer 事件做（照 `railDrag.ts` 那一套），⛔ 不许在行上加 HTML5 `draggable`。
     拖的时候鼠标下面那一块要有落点提示；拖到另一块 = 改挂到那一块；松在块外面 = 什么都不变。
  2. 从访达拖文件进来**照旧**只加成项目文件（Ocean 10-03 原话「当前拖拽本地文件进入 spool 走的就是项目文件」）。⛔ 不加「从访达直接拖到块上就挂」，⛔ 不加块动作条上的按钮 —— 入口只有右栏拖这一处。
  3. 块上显示挂着的文件：正文下面一行，一个文件一个名字，点开 = 用默认程序打开（和右栏同一个函数，打不开时同一句提示）。没挂文件的块一个像素都不多画。
  4. 右栏每一行加两样标注：「挂在 #12」/「挂在项目」，「你加的」（P6 起会有「某某 AI 加的」，这一步只有一种）。
     「挂在 #12」旁边一个小 × = 改回挂在项目（只清锚定，文件留在项目里）。排序照旧按加进项目的时间。
  5. ⌘Z 撤不撤「挂上 / 改回」：看撤销环接进来的成本，施工时定，写进回执。不进撤销环的话，那个 × 就是反向操作。
- 不做：pack、MCP 输出一个字不改（Ocean 10-03 #4）；被取代那一格（挪到 P6）；`include_in_pack` / `ai_access` 不动；不改左栏的拖拽。
- 工程注意：列表按块 id 做 key（`BlockFeed.tsx:550`）；落点识别可以学 `railDrag.ts` 的 `data-drop-*` 属性；时间线会滚，拖到上下边缘要不要自动滚，施工时定。
  界面新字中英都进字典；新 Tauri 命令（如果要）一律 `(async)`。
- 验收：测试钉住「挂上 / 改挂 / 改回」写进库的样子；块上那一行和右栏标注的字中英都有；Ocean 手指（§6 第 2 条）。

### P5-3 · 删块、移块、合并、撤销：挂着的文件跟着规矩走（Ocean 10-03 #1、#3）

- 要做：
  1. **用户亲手删块**（块上的删除、多选批量删）时，要删的块里有挂着文件的 ⇒ 先问一句：列出这些文件的名字，两个选择「一起从项目里去掉」/「留在项目里」（留下 = 改成挂在项目）。
     Ocean 原话：「提示用户是否删除，获得许可后直接删除，不然就留在项目」。没挂文件的删除照旧不问。
     问的那一层放在发起删除的界面；store 的删除函数多一个参数说文件去不去（⛔ store 里不弹框）。字要说清「从项目里去掉，电脑上的文件不动」。
  2. **不是用户亲手删的路径**（撤销一次捕捉、移动时查重删掉的那一块、……把所有会删块的路径列全，写进回执）⇒ 不问，挂着的文件一律回到项目上（不丢东西的那一边）。
  3. **移到别的项目**：挂着的文件跟着块走（`thread_id` 改成新项目，锚定不变）。Ocean 10-03 选的。B4 的「先复制再挪原块」两段都要核：最后挂着文件的是挪过去的原块。
  4. **合并**：被并掉的块上的文件改挂到留下的那一块。
  5. **撤销**：删块的撤销 ⇒ 文件回到删之前的样子（去掉了的回来、挂回原块；留在项目的挂回原块）；移动的撤销 ⇒ 文件跟着块回原项目、挂回原块；合并的撤销 ⇒ 挂回原来那几块。
     撤销条目里要带上「当时挂着哪些文件、选的是去掉还是留下」。
- 不做：删项目照旧（文件跟着项目走，不问）；复制到别的项目照旧不复制文件；⛔ 不改 `DISCOVERED-20261002-1`（删掉编号最大的那块再捕捉、⌘Z 撤不回）那条老问题 —— 撞上了在回执里写一句。
- 验收：真库 SQLite 测试（照 `compressStore.stale.test.ts` 的写法）逐条钉住：删块两种选择、批量删、非亲手删的路径、移块、合并、三种撤销；
  删块提示的字中英都有；Ocean 手指（§6 第 3、4 条）。

### P5-4 · 用户亲手加的文件默认 AI 可读，相应说明全部改掉

- 要做：
  1. `createAttachment`（右栏「加文件」、访达拖进来）写 `ai_access = 1`。开关照旧能关；关了之后 AI 要读就得 `request_file_access` 申请（今天的行为不变）。
     ⛔ 已有的行不动（真库那一个文件本来就开着）。`include_in_pack` 默认照旧关。
  2. 说明改成新默认（**和第 1 条同一笔提交** —— 默认变了而界面还说「默认谁都不读」，就是界面在说谎）：
     - 右栏空状态那句（`ProjectFiles.tsx:83` + 字典）；
     - 官网首页 `gate-x1`：英文 `site/index.html:504`、中文 `scripts/site-zh-strings.mjs:176`；
     - `docs/PRIVACY.md` + `site/privacy.html` + `scripts/site-zh-privacy.html`：在讲 MCP 的地方加一句 —— 你亲手加进项目的文件，AI 默认能读到 Spool 从里面抽出来的文字；
       每个文件旁边的开关随时能关，关了之后 AI 只能向你申请。改完跑 `node scripts/build-site-zh.mjs`；
     - `docs/DESIGN_PROJECT_FILES.md` 首屏加一句：「§2 / §5 讲的默认（AI 默认不读）和挂法（只挂项目）已被 2026-09-30 / 10-03 的决定取代，见 `archive/product-taskbooks/TASKBOOK-P5-…`」。
  3. MCP 工具描述和路由文本：逐条核一遍讲文件可读的那几句（「现在」一栏点名的四处）。讲的是「`ai_readable:false` 的要申请」，新默认下仍然成立 ⇒ 预计一句都不改；
     真有一句说「默认不读」的才改，改了要同时过 `mcp-tool-routing-required` 那条。改了什么、为什么不改，写进回执。
  4. 文案大白话；官网文案守 `next-stage-goals-website-portfolio` 那几条铁律。
- 不做：⛔ 不碰「文件可读只认 `ai_access`、没有 `|| include_in_pack`」（§10.6 红线）；不改 `request_file_access` 的行为；官网不部署（不 push）。
- 验收：测试钉住新加的文件 `aiAccess === true`、老行不变；`(none missing)`；中文官网页重新生成过且 diff 只有这一句；Ocean 手指（§6 第 1 条）。

## 4. 什么时候停下来问

- 起点不是 §2 写的那样；
- 迁移要做 `ADD COLUMN` 以外的任何事（重建表、改列、回填、加外键）；真库副本跑迁移失败、计数或正文总长变了；
- 某一条删块 / 移块 / 合并的路径套不进 §3 那几条规矩；
- 做下去要改 pack 或 MCP 输出、加 MCP 工具、或者让窗口自己抬起来；
- 发现和「现在」一栏对不上的现状（代码已经变了）；
- 要删文件（请 Ocean 跑，见 §2）；
- 发现新问题：**不顺手修**，按 HANDOFF §8 的 DISCOVERED 格式记进 HANDOFF §9.9，继续做本任务。

## 5. 做完四步之后：换装给 Ocean 验收（先问）

- 四步都提交、全部测试通过之后，**先问 Ocean「现在换装吗」**，得到同意再做。问的时候要说清 ⚠️ 下面那条（真库要升级、AI 客户端要重启）。
- 照 P4 回执「换装」那一段（每一步都写了命令和核对项），要点：
  - 先看现装的签名（现在是 Developer ID ⇒ 构建时 `APPLE_SIGNING_IDENTITY` 走环境变量，不改 `tauri.conf.json`，公证变量全部 unset）；
  - 构建日志重定向到文件；TSA 偶发失败（`A timestamp was expected but was not found`）就整个重跑；
  - 停 GUI 和 `--overlay` **按 pid**，杀完再查一遍还在不在；`--mcp` 一个都不碰；
  - 换装前 `VACUUM INTO` 备份真库到桌面（文件名带日期）；旧包 `mv` 进 `~/Desktop/Spool/spool-pre-install/`，别删；
  - 换装后核：sha256 和构建产物一致、进程启动时间在换装之后、`lsof` 的 txt inode 是新文件、stderr 有 `[double-tap] installed at HID/active`。
- ⚠️ **这一批会迁移真库（v29 → v30），第一次启动时由 GUI 自己做。** 换装后多核四样：`PRAGMA user_version` = 30；工作区 / 项目 / 块 / 附件计数和正文总长和备份一致；
  真库目录里**正好多出一个** pre-migration 快照；`attachments` 多了那四列。任何一样不对：先别动，把新进程停掉，报给 Ocean（退路：旧包在 `spool-pre-install`、备份在桌面）。
- ⚠️ 迁完之后，**所有还在跑的旧 `--mcp` 子进程每一次调用都会报「库比服务新」**（它们开库就核版本）。⛔ 不许去杀它们；回执里写清楚，§6 开头也提醒 Ocean 重启 AI 客户端。
  可以自己起一个新二进制的 `--mcp` 探针对真库只读调一次 `list_threads`，证明新版那边是通的（`isolated-verify-workflow` §34）。
- commit、build、换装分开记在回执里；**不 push、不发版**。

## 6. 给 Ocean 的验收单（大白话，换装后给 Ocean）

开始前：**把你的 AI 客户端（Claude / Codex）重启一下。** 这次 Spool 的库升级了一次，换装之前就开着的那些连接，每次调用 Spool 都会报错，重启一下就好。

1. 在某个项目的右栏「项目文件」点「加文件」，加一个文件 ⇒ 那一行写着「你加的」「挂在项目」，「AI 可以读这个文件」已经勾上。空项目里那句说明也换成了新的说法。
2. 按住右栏那个文件，拖到时间线上某一块上松手 ⇒ 那一块正文下面出现这个文件名，点它能打开；右栏那一行变成「挂在 #几」。
   点「挂在 #几」旁边的 × ⇒ 变回「挂在项目」，块上那一行没了。
3. 再挂一次，然后删掉那一块 ⇒ 先问你那个文件要不要一起去掉。选「留在项目里」⇒ 文件还在右栏，写着「挂在项目」。
   再挂到另一块、再删、这次选「一起去掉」⇒ 右栏里没了。按 ⌘Z ⇒ 块和文件都回来，文件又挂在那一块上。
4. 把挂着文件的一块移到别的项目 ⇒ 文件跟着到了那个项目的右栏，还挂在那一块上。
5. 界面切成英文，看一眼这一轮新加的字（右栏的标注、块上那一行、删块时那句提问）⇒ 都是英文。

你只要告诉我：这几条里哪几条不对，不对的那条你看到了什么。

## 7. 回执（执行窗填写）

每步一小段：

- 提交：`<hash> <标题>`
- 改了哪些文件（一行一个）
- 怎么验的：命令 + 结果（vitest / cargo 的条数，i18n-check 的输出原文，`cargo tree` 那条的输出；P5-1 另写真库副本迁移和 `--mcp` 探针的结果）
- 施工时自己定的（四列叫什么、「谁加的」存什么；拖拽怎么认落点、要不要自动滚；挂上 / 改回进没进撤销环；删块路径的完整清单；MCP 描述改没改、为什么）
- 还差什么、有没有偏离本任务书、新发现记在 HANDOFF 哪里

最后一段：换装（做了没有、装的是哪个 commit、`spctl` 结果、真库备份文件名、真库迁移前后的核对、`--mcp` 子进程还在跑旧二进制这件事）、Ocean 验收（还没有就写「待验收」）。

## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 验收`（Ocean 验过后改成 `COMPLETE`），`git mv` 进 `docs/archive/product-taskbooks/`。
2. `docs/HANDOFF-2026-09-04.md`：§9.3 路线图 P5 那一行改成「已完成，任务书在 archive/product-taskbooks/…」；§9.6 P5 那一行同样改；
   §9.8「唯一下一步」改成「按 §9.4 下发 P6」；`docs/README.md` 入口表里 ACTIVE 产品任务书那一行改成「暂无」（README 只暂存这一行）。
3. 这些文档改动单独一笔提交（同样只 add 自己改的路径）。

### 回执（2026-10-04 执行窗）

起点核过：`git log -1` = `2b02cc4`（`docs: 下发 P5…`），上一笔 `1fc88a2`。开工前基线和 §2 写的一样：tsc 干净、vitest 68 个文件 / 858 条、cargo 153 过 · 4 跳过、sidecar 14、`(none missing)`、`--dead` 87 条、`cargo tree` 那条是空的。

#### P5-1 · 库 v30

- 提交：`f322750 feat(db): 库 v30 —— 项目文件加四列（挂在哪一块、谁加的、被谁取代、何时取代）`
- 改了：`src/lib/db/client.ts`（`SCHEMA_VERSION` 30 + v29→v30 `add-attachment-anchor-and-provenance`）、`src/lib/db/schema.sql`（建表四列 + 注释）、`src/lib/db/attachments.ts`（类型、`SELECT_COLS` / `fromRow` / `ALL_COLS` / `allValues` / `insertAttachments` / `restoreAttachment`，`ALL_COLS` 改成直接由 `SELECT_COLS` 拼，免得两份列表各写各的）、`src-tauri/src/mcp.rs`（只有 `EXPECTED_SCHEMA_VERSION` 30 那一行 + 一行注释）、`src/lib/db/client.test.ts`、`src/lib/db/transfer.test.ts`、`src/lib/pack/assemble.test.ts`（测试夹具补四个字段）
- 施工时定的：四列叫 `anchor_block_id`（块 id，空 = 挂在项目；⛔ 没叫 `block_id`）、`added_by`、`superseded_by`（文件 id）、`superseded_at`（毫秒）。`added_by`：用户加的写 `'user'`；空 = v30 之前的行 = 用户加的；P6 起 AI 提议、用户点头挂上的写那个客户端的 MCP 来源标签（和它写块时 `source` 那一格同一个，形如 `<客户端> · MCP`），写在 `schema.sql` 注释里了。四列都可空、不回填、不加外键；ADD COLUMN 撞上已有列 catch 掉（照 v28 的写法）；注释写了往前老库什么样、往回 `DROP COLUMN` ×4 退回 v29。
- Rust 那边核过：读 `attachments` 的查询全部点名列（`mcp.rs` 的 `search_attachments` 的 `{cols}`、`get_blocks` 文件段、pack 文件段、`request_file_access`、`PACK_CHARS_ATTACHMENTS`、overview 那几处），没有 `SELECT *` ⇒ 加列不影响，除了版本号没改别的。
- 怎么验的：
  - ① `client.test.ts` 新加三条：v29→v30（四列都在、全空、其余列逐字节相等、块表不动）、从 v14 带老 `block_id` 的库一路走到 v30 再用产品的 `listAttachmentsByThread` 读回来（这正是真库那种 ALTER 出来的形状）、新装的库照 `schema.sql` 就有四列。原有的整条历史链（v2 起）照样过。
  - ② 真库副本跑真迁移：拿 `~/Desktop/spool.before-p4-install-20261003-220055.db`（sha256 `e0b7053f…f903a`）复制到 scratchpad，在 vitest 里用产品的 `__migrateSchemaForTest` 跑：`fresh === false`、版本 29 → 30、十二张表的行数全部不变（工作区 25 / 项目 63 / 块 1014 / 文件 1 / …）、块正文总长 291916 不变、批注总长 12011 不变、那 1 个文件整行不变（`ai_access` 仍是 1、`include_in_pack` 1、正文 16945 字）、四列都在且全空、`integrity_check ok`。⛔ 真库本身没碰。
  - ③ 新二进制（`cargo build` 的 debug 版）起 `--mcp` 探针，`SPOOL_DATA_DIR` 指向迁好的副本：`initialize` 通、`list_threads` 正常（47 个项目 / 13 个工作区）、`get_blocks` 的 `files` 照常返回那个 PDF（`ai_readable: true`、`extracted_chars: 16945`）。反方向也试了：同一个新二进制对着没迁的 v29 副本，每次调用都回「库还是旧版本 v29，这个服务是 v30」⇒ 版本闸两个方向都活着。
  - ④ `transfer.test.ts` 新加一条：一个文件挂在某块上、被另一个取代、另一个标成 AI 加的 —— 导出再导入，四列原样回来。
  - 全套：tsc 干净；vitest 68 / 862；cargo 153 过 · 4 跳过；sidecar 14；`(none missing)`；`--dead` 和开工时逐行一样（87 条）；`cargo tree` 那条空。vitest 输出里「pre-migration backup FAILED」从 31 行变 33 行（新加的两条迁移测试各一行，同一类噪声），「SQL logic error」多出来的 8 行是 v21→v22 重跑那条测试在四个新列上走「列已存在」的 catch（设计里的那条路）。

#### P5-2 · 拖到块上、块上看得见、右栏标清楚

- 提交：`f956e7d feat(files): 右栏的项目文件按住拖到块上就挂在那一块；块上列出挂着的文件，右栏标「你加的」「挂在 #n / 挂在项目」`
- 改了：`src/lib/files/fileDrag.ts`（新，拖拽手势 + `anchorForDrop` 判断）、`src/stores/fileDragStore.ts`（新）、`src/components/RightRail/FileDragGhost.tsx`（新）、`src/lib/files/openFile.ts`（新，右栏和块上共用的「打开文件」和文件名）、`src/components/RightRail/ProjectFiles.tsx`、`src/components/ThreadView/BlockItem.tsx`、`src/components/ThreadView/LogView.tsx`（时间线滚动区加一个属性）、`src/lib/db/attachments.ts`（`setAttachmentAnchor`）、`src/stores/blocksStore.ts`（`anchorAttachment`）、`src/lib/sidebar/railDrag.ts`（只把 `suppressSelection` 改成 export）、`src/lib/i18n/index.ts`、`src/stores/projectFiles.anchor.test.ts`（新）
- 施工时定的：
  - 落点：块的 `<article>` 上加 `data-drop-block`（只读视图不加），松手时 `elementFromPoint` 往上找这个属性；只认这个文件**自己项目**里的块（`anchorForDrop` 对着 `byThread[file.threadId]` 查）；松在块外面、松在它已经挂着的那块上 = 什么都不变；Esc 取消。按住的地方是右栏那一行的文件名（拖过 4px 才算拖，不动就是原来的「点开」）；拖完那一下的 click 吃掉，免得松手顺带打开文件。⛔ 没加 HTML5 `draggable`。
  - 自动滚：做了，照左栏那一套 —— 时间线滚动区上下 36px 以内每帧滚 10px。
  - 落点提示：鼠标下面那一块浅底色 + 一圈细框；鼠标旁边跟一个写着文件名的小牌子。
  - 撤销：挂上 / 改挂 / 改回**不进撤销环** —— 和置顶同一个理由（手势自己就是反向操作：「挂在 #n」旁边的 ×，或者再拖到别的块上），测试钉了「撤销环里没多东西」。
  - 块上那一行：正文下面（引用行上面），一个文件一个名字带小图标，点开走 `openFile`（和右栏同一个函数、打不开时同一句提示）；没挂文件的块不画这一行。
  - 右栏：每个文件名下面一行小字「你加的 · 挂在 #12」+ ×，或「你加的 · 挂在项目」。「你加的」只在 `added_by` 是空或 `'user'` 时写（P6 才有 AI 加的）。排序照旧按加进项目的时间。
  - 只有普通的文字块能接住文件；「引用」那一种块（`kind = 'ref'`）不接、也不画文件行 —— 真库副本里 1014 块全是文字块，一块引用块都没有。
- 怎么验的：`projectFiles.anchor.test.ts` 四条（真 SQLite）：新加的文件挂在项目、记着 `'user'`；挂上 → 改挂 → 改回库里只动锚定那一列、重读回来一致；挂上不进撤销环；松手落点五种情况。全套：tsc 干净；vitest 69 / 866；cargo 153 · 4；sidecar 14；`(none missing)`；`--dead` 不变；`cargo tree` 空。

#### P5-3 · 删块、移块、合并、撤销

- 提交：`d3bed3f feat(files): 删块先问挂着的文件去不去；移块文件跟着走、合并改挂到留下那块；三种撤销都把文件放回原处`
- 改了：`src/lib/db/blocks.ts`（`deleteBlock` / `moveBlock` / `mergeBlocks` 各加一句）、`src/lib/db/attachments.ts`（`listAttachmentsAnchoredTo`）、`src/lib/undo/undoLog.ts`（三种撤销条目各带上文件）、`src/stores/undoStore.ts`、`src/stores/blocksStore.ts`（`remove` 多一个参数、合并和移动记下文件）、`src/stores/deleteFilesPromptStore.ts`（新）、`src/components/ThreadView/DeleteBlockFilesDialog.tsx`（新）、`src/App.tsx`（挂上那个对话框）、`src/components/ThreadView/BlockFeed.tsx`、`src/components/ThreadView/BlockItem.tsx`、`src/components/ThreadView/MergeToolbar.tsx`、`src/lib/i18n/index.ts`、`src/stores/projectFiles.lifecycle.test.ts`（新）
- 删块路径的完整清单（对着代码一条条找的）：
  - **用户亲手删**（先问）：① 块上的删除（`BlockActions` → `BlockFeed` 的 `onDelete`；引用块 `RefBlockItem` 走同一个 `onDelete`）；② 更正卡上的删除（`BlockItem` 里两处 `removeBlock(c.id)`：正文里的更正卡、和「取消更正」那一下）；③ 多选工具条的批量删（`MergeToolbar`）。三处都先调 `askBeforeDeletingBlocks`：没挂文件 ⇒ 照旧不问；挂着 ⇒ 弹一次框，列出文件名，「一起从项目里去掉」/「留在项目里」，再加一个「取消」（Esc、点框外也一样）= 这次什么都不删。批量删是先过工具条原有的「删除 N 个块？」那一步，再问文件（一次问完，选择管全部）。store 的 `remove(id, { removeFiles })` 只收答案，⛔ 不弹框。
  - **不是用户亲手删**（不问，文件回到项目上）：撤销一次捕捉、撤销一次自己写的块（`create`）、撤销一次复制（删复制品）、移动时删掉复制品、移动时查重删掉的那一块（以及重做这次移动）、浮窗改投（先删再建）。这些全部经过 `db.deleteBlock`，它在删之前先把挂在这一块上的文件改回挂在项目 —— 不丢东西的那一边写在最底层，以后新加的删块路径也自动落到这一边。用户选「一起去掉」时，`remove` 先删文件再调它。
  - Rust 那边没有任何生产代码删块（`DELETE FROM blocks` 只在测试里）。
  - 删项目照旧是软删，文件跟着项目走，没碰。复制到别的项目照旧不复制文件。
- 移块：`moveBlock` 里先把挂在这块上的文件 `thread_id` 改成新项目、锚定不变。B4 两段核过：复制品被删掉（上面没挂文件），挂着文件的是挪过去的原块。撤销 / 重做移动也走 `moveBlock`，文件跟着来回。
- 合并：`mergeBlocks` 在删被并掉的块之前，先把挂在它们上面的文件改挂到留下的那一块。
- 撤销：删块条目带「当时挂着的文件（整行）+ 选的是去掉还是留下」——撤销时块回来，去掉的整行插回（挂回原块、AI 可读照旧），留下的挂回原块；重做按同一个选择再来一次。合并条目带「被并掉那几块上的文件」，撤销时各自挂回。移动条目带「查重删掉的那几块上的文件」，撤销时挂回；挪过去的块上的文件由 `moveBlock` 带回。
- 怎么验的：`projectFiles.lifecycle.test.ts` 十条（真 SQLite，照 `compressStore.stale.test.ts` 的写法）：删块两种选择各带 ⌘Z 和重做、没挂文件不问、问了之后照选择删 / 取消就不删、批量删一个选择管全部且 ⌘Z 一块块撤回、撤销捕捉、直接删块（改投那一类）、移块带 ⌘Z 和重做、移块查重删掉的块带 ⌘Z、合并带 ⌘Z 和重做（文件特意挂在会被并掉的那块上）。全套：tsc 干净；vitest 70 / 876；cargo 153 · 4；sidecar 14；`(none missing)`；`--dead` 不变；`cargo tree` 空。
- 撞上的老问题：`DISCOVERED-20261002-1`（删掉编号最大的那块、再捕捉一块之后 ⌘Z 撤不回）没改。它现在多牵连一样：那种情况下撤销失败，被选了「一起去掉」的文件也跟着回不来。补在那一条底下了。

#### P5-4 · 默认可读 + 说明

- 提交：`0dad7e7 feat(files): 用户亲手加的文件默认 AI 可读，相应说明同一笔改掉`
- 改了：`src/lib/db/attachments.ts`（`createAttachment` 写 `ai_access = 1`）、`src/components/RightRail/ProjectFiles.tsx` + `src/lib/i18n/index.ts`（空状态那句换成新键：「这个项目还没有文件。你加进来的文件，AI 默认能读到里面的文字，每个文件旁边的开关随时能关；打包时默认不带正文。」）、`site/index.html` + `scripts/site-zh-strings.mjs`（`gate-x1`）、`docs/PRIVACY.md` + `site/privacy.html` + `scripts/site-zh-privacy.html`（MCP 那一行的说明里加一句：你亲手加进项目的文件，AI 默认能读到 Spool 从里面提取的文字；每个文件旁边都有开关，随时能关，关掉之后 AI 只能向你申请）、`site/zh/index.html` + `site/zh/privacy.html`（`node scripts/build-site-zh.mjs` 重新生成，各只差这一句）、`docs/DESIGN_PROJECT_FILES.md`（首屏加一段「已被取代」）、测试三个（`fileAccess.test.ts` 的文件改成先关掉开关再申请 —— 申请本来就是给关掉的文件用的；`projectFiles.anchor.test.ts` 钉 `aiAccess === true` + 开关能关；`client.test.ts` 的 v29→v30 多一个开关关着的老行，迁移后照旧是 0）
- MCP 工具描述和路由文本：逐条核了 `search_blocks`（「the user has not opened up to AI」）、`get_blocks` 的 `include_extracted_text`（「files the user opened up」）、`request_file_access`（「call this only for the ones where ai_readable is false」）、`INSTRUCTION_BODY` / `OPENERS`（「A file you cannot read is a request you have not made yet」「request_file_access for every file with ai_readable:false」），还有两句 `locked` 提示。没有一句说「默认不读」，讲的都是「关着的要申请」，新默认下照样成立 ⇒ 一个字没改（P5 本来也不许动 MCP 输出）。
- 「文件可读只认 `ai_access`」那条红线没碰；`request_file_access` 的行为没改；`include_in_pack` 默认照旧关；已有的行一行没动。
- 怎么验的：全套 tsc 干净；vitest 70 / 877（含 `build-site-zh.test.mjs` 12 条，证明中文页是重新生成过的）；cargo 153 · 4；sidecar 14；`(none missing)`；`--dead` 不变；`cargo tree` 空。
- 没改的一处：三份隐私说明顶上「最后更新：2026-08-23（对应 Spool v0.6.2）」没动 —— 任务书要中文页 diff 只有那一句，而且这批改动还没有版本号。发版时要一起改，记成 `DISCOVERED-20261004-1`。

#### 新发现（记在 HANDOFF §9.9，都是 captured，没修）

- `DISCOVERED-20261004-1` 隐私说明的「最后更新」日期发版时要跟着改
- `DISCOVERED-20261004-2` 界面上没有任何地方告诉用户「文件可以拖到块上」
- `DISCOVERED-20261004-3` `blocks.ts::updateBlockThread` 没有调用方，而且它不带文件走
- 补在 `DISCOVERED-20261002-1` 底下：撤销失败那种情况现在也会让「一起去掉」的文件回不来

#### 换装（Ocean 10-04 在「现在换装吗」上选了「现在换装」）

- 构建：`0dad7e7`（`src` / `src-tauri` / `site` / `scripts` 没有未提交改动），`env -u APPLE_ID -u APPLE_PASSWORD -u APPLE_TEAM_ID -u APPLE_API_KEY -u APPLE_API_ISSUER -u APPLE_API_KEY_PATH
  APPLE_SIGNING_IDENTITY="Developer ID Application: Hanze JIN (Q5Y5JRXZ58)" npm run tauri build -- --bundles app`，日志进文件；没改 `tauri.conf.json`，日志里是「skipping app notarization」。
  TSA 第一遍就过（主程序和 `spool-ai` 都有 23:59:41 的时间戳），日志里没有 `timestamp was expected`；`--verify --deep --strict` 过；打出来的前端里有这一轮的新字。
- 装前：Developer ID、`spctl` = `Unnotarized Developer ID`、0.6.2、`spool` sha256 `cab59972…54d4ece`（P4 那一版）；真库 v29 · 25 / 63 / 1014 / 1（工作区 / 项目 / 块 / 文件，含软删）· 正文总长 291916 · 批注总长 12011，迁移快照 21 个。
- 停：GUI pid 96295 + `--overlay` pid 96310 按 pid `kill -TERM`，1 秒内都退了、再查已不在；`--mcp` 子进程 15 个一个没碰（前后都是 15）。
- 真库备份：`~/Desktop/spool.before-p5-install-20261005-000010.db`（`VACUUM INTO`，integrity ok，v29，计数和正文总长和活库一致）。
- 旧包：`mv` 到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261005-000016-pre-p5.app`；新包 `ditto` 进 `/Applications`；`open --stdout … --stderr …` 起。
- 装后：`--verify --deep --strict` 过、Developer ID、`spctl` = `Unnotarized Developer ID`、identifier `com.oceanjin.spool`、0.6.2；`spool` sha256 `cda7a76e…5d4e4e5` 和构建产物一致；
  主进程 52692、`--overlay` 52709 都起于 00:00:16（换装之后），两个的 `lsof` txt inode 都是 75593490 = 新文件；stderr `[double-tap] installed at HID/active`、`[overlay] helper started`，没有 error / panic。
- 真库迁移（第一次启动时 GUI 自己做的）：`PRAGMA user_version` = 30、`integrity_check ok`；工作区 / 项目 / 块 / 文件 25 / 63 / 1014 / 1、正文总长 291916、批注总长 12011，和备份一致；捕捉目标没变；
  那 1 个文件整行没变（`ai_access` 1、`include_in_pack` 1），四个新列都在、都是空的；真库目录里**正好多出一个**快照 `spool.pre-migration-v29-2026-10-04T23-00-17-277Z.db`（21 → 22）。
- `--mcp` 探针：拿新装的 `/Applications/Spool.app/Contents/MacOS/spool --mcp`，`SPOOL_DATA_DIR` 指向迁好之后的真库 `VACUUM INTO` 副本（scratchpad 里），`initialize` 通、`list_threads`（47 个项目 / 13 个工作区）、`get_blocks` 的文件照常（那个 PDF `ai_readable: true`）。
  ⚠️ 没对着真库目录本身起探针：探针一连上就会往真库目录的 `mcp-clients.json` 记一行「客户端」，设置里会冒出一个只有开发者才认得的名字（那里已经有一行以前留下的 `probe`）；用副本证明的是同一个二进制、同一份数据。真库的 `mcp-clients.json` 前后都是 4 行。
- **`--mcp` 那 15 个子进程跑的还是旧二进制，而且库已经是 v30 ⇒ 它们每一次调用都会报「库比服务新」**（别人家 AI 客户端起的，没杀）。Ocean 重启 Claude / Codex 之后就好；§6 开头那句提醒的就是这个。
- 没 push、没发版。

#### 验收第一轮反馈（Ocean 2026-10-05，五条 + 下发时问的四个问题）

Ocean 原话五条：① 项目文件和块文件不要用「你加的 挂在项目 / 你加的 挂在 #1」区分，纯文字不清晰，改为分区；② 块不要用 #1，直接写数字，不要写「你加的」，只有 MCP 写回的时候特殊标记；
③ 块上也要有加文件的入口，删掉拖入文件这个操作；④「打包时带上这个文件的文字」「AI 可以读这个文件」文字太多太乱，改成「打包可读」「AI 可读」，只有鼠标悬浮才显示；⑤ 文件按时间最新的放最上面，记录添加时间。
问了四件，答复：删的是「右栏拖到块上」（从访达拖进来照旧是项目文件）；块上的入口只从电脑里选新文件；右栏**仍然一个面板、所有文件放一起，块文件单独标注但要更简洁、尽量不用字**；块文件保留「移到项目」，悬浮时出现。

- 提交：`1cc753e fix(files): P5 验收第一轮 —— 块上加文件改成动作条的回形针，去掉拖到块上；右栏一张表新的在上、带添加时间，块文件只标块号，两个开关悬浮才出现`
- 改了：`BlockActions.tsx`（回形针「给这一块加文件」）、`BlockItem.tsx`（接上它；去掉落点属性和落点高亮）、`src/lib/files/addFiles.ts`（新，右栏和块上共用的「选文件再加进来」）、`attachments.ts`（`createAttachment` 能带 `anchorBlockId`）、
  `ProjectFiles.tsx`（重写成一张表）、`LogView.tsx` / `railDrag.ts`（撤回 P5-2 加的那两处，和 P5 之前逐字一样）、`blocksStore.ts`（注释）、`i18n/index.ts`、`projectFiles.anchor.test.ts`；
  删掉 `src/lib/files/fileDrag.ts`、`src/stores/fileDragStore.ts`、`src/components/RightRail/FileDragGhost.tsx`（Ocean 跑的 `git rm`）。
- 右栏现在的样子：一张表，按添加时间新的在上；每行 = 图标、文件名、（挂在块上的）那一块的号码圆圈 —— 和块自己头上的号码同一个样子（`SeqBadge`），悬停写「挂在第 n 块上」、添加时间（和块上同一种时间写法）。
  鼠标停在那一行（或键盘焦点在里面）时，时间那一格换成「打包可读」「AI 可读」两个勾 —— ⚠️ 施工时自己定的：换在**同一行**，没另起一行，免得鼠标往下扫的时候每一行都撑开、列表跟着跳；
  块文件再多一个「移到项目」（断开的链子图标），所有文件都有 ×（从项目里去掉）。「你加的」不再写；AI 加的标记留给 P6。块上那一行文件名没动。
- 怎么验的：`projectFiles.anchor.test.ts` 换掉了拖拽落点那条，新加「块上加文件 ⇒ 新文件挂在那一块、你加的、AI 可读」「移到项目只清锚定」；全套 tsc 干净、vitest 70 / 878、cargo 153 · 4、sidecar 14、`(none missing)`、`--dead` 不变、`cargo tree` 空。
- 换装：`1cc753e`，同一套命令，TSA 第一遍过（00:36:05）、`--verify --deep --strict` 过；装前是 P5 第一版（`cda7a76e…`），GUI 52692 / `--overlay` 52709 按 pid 停、1 秒内退；`--mcp` 17 个没碰；
  真库备份 `~/Desktop/spool.before-p5fb1-install-20261005-003622.db`（integrity ok，v30）；旧包 → `~/Desktop/Spool/spool-pre-install/Spool-old-20261005-003632-pre-p5fb1.app`；
  装后 `spool` sha256 `9ba8bb11…1b7c85` 和构建产物一致、主进程 17651 / `--overlay` 17664 起于 00:36:32、txt inode 都是新文件、`[double-tap] installed at HID/active`、`spctl` = `Unnotarized Developer ID`；
  库没迁移（还是 v30），计数 25 / 63 / 1014 / 2（第 2 个文件是 Ocean 验收时加的）、正文总长 291916，快照还是 22 个。
- 这一轮的验收单（替换 §6 第 1–2 条，3–5 条照旧，只是「挂一次」改成用块上的回形针）：
  1. 右栏「加文件」加一个 PDF ⇒ 出现在列表最上面，后面是添加时间；鼠标停上去，时间换成「打包可读」「AI 可读」两个勾，「AI 可读」已经勾上。
  2. 鼠标移到某一块上，动作条里点回形针，选一个文件 ⇒ 那一块正文下面出现文件名；右栏最上面多一行，带那一块的号码圆圈。鼠标停在这一行，点断开的链子 ⇒ 圆圈没了，块上那一行也没了。
  3. 右栏的文件按住拖到块上 ⇒ 什么都不发生（这个操作删掉了）；从访达拖文件进来 ⇒ 照旧加成项目文件。

#### 验收第二轮反馈（Ocean 2026-10-06）

Ocean 原话：「block 的数字符号没有和文字对齐，数字也不在中心，修复；让每个文件时间对齐，当前的时间会受到 block 标号的影响导致不整齐」。

- 提交：`7db0d3b fix(files): 右栏块号圆圈和文字对齐、时间排成一列`（只改 `ProjectFiles.tsx`）
- 原因（WKWebView 量出来的，`scripts/wk-snapshot.m` + 真字体 Geist / Geist Mono，照归档 HANDOFF §6.2-sexies 的配方：圆圈画红、数字画蓝、numpy 量墨迹）：
  ① 圆圈外面包的那个 span 没有字号，继承页面的 16px、建了一个 24px 的行盒，把圆圈放在那条基线上 ⇒ 圆圈中心比旁边的时间**低 5 个物理像素（2.5px）**，块文件那一行还比项目文件高 6px；
  ② 块文件那一行时间后面多一个（看不见的）「移到项目」按钮 ⇒ 时间右边缘在块文件行是 513、项目文件行是 555（物理像素），差 21px。
- 改法：外层 span 改成 `flex items-center`（没有行盒了）；时间改成固定 66px 宽、右对齐、不换行；时间后面的按钮放进固定 34px 宽的一格。
- 改完量的：五行的时间右边缘 516–518（差 2 个物理像素以内，是字形本身）；圆圈中心和时间中心在同一行像素；块号圆圈排成一列（右边缘都是 375）；块文件行和项目文件行一样高。
  圆圈里面的数字：改前改后都是偏下 1 个物理像素 —— 9px 字墨迹 13 个物理像素高、奇数除不开，是这个徽章在全 app 一样的下限（`SeqBadge.tsx` 头注释），没去动共用的那个组件。
  ⚠️ 前一次量用了构建出来的 CSS，那里字体写的是 `/assets/…` 绝对路径、本地页面加载不到，量的是回退字体（读数偏 5 个物理像素，是假的）；改成直接指 `src/assets/fonts` 之后才对。
- 全套：tsc 干净、vitest 70 / 878、cargo 153 · 4、sidecar 14、`(none missing)`、`--dead` 不变、`cargo tree` 空。
- 换装：`7db0d3b`，TSA 第一遍过、`--verify --deep --strict` 过；GUI 17651 / `--overlay` 17664 按 pid 停、1 秒内退；`--mcp` 2 个没碰；
  真库备份 `~/Desktop/spool.before-p5fb2-install-20261006-151312.db`（integrity ok，v30）；旧包 → `~/Desktop/Spool/spool-pre-install/Spool-old-20261006-151312-pre-p5fb2.app`；
  装后 sha256 `8b988601…aa9d715` 一致、主进程 50766 / `--overlay` 50789 起于 15:13、txt inode 是新文件、`[double-tap] installed at HID/active`、`spctl` = `Unnotarized Developer ID`；
  库没迁移（v30），计数和备份一致（块 1020 / 文件 6 —— Ocean 验收时加的）。

#### Ocean 验收

待验收（第一、二轮反馈都已改、已换装）。
