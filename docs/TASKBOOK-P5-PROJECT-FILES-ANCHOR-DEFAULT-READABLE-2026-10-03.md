# 产品任务书 P5 —— 文件能挂在块上、右栏统一列出、用户亲手加的文件默认 AI 可读

> **状态：ACTIVE —— 当前唯一可执行的产品任务书。**
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
