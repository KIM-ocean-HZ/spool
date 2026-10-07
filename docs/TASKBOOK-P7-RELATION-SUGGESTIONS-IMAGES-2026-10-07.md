# 产品任务书 P7 —— AI 的「更正 / 取代」只算建议、一块能取代好几块 + 图片

> **状态：ACTIVE —— 当前唯一可执行的产品任务书。**
>
> **唯一交付：** 下面 §3 的八步（P7-1 – P7-8），按顺序做完、各自测试通过、各自一笔提交，并在 §7 写回执。
>
> **来历：** P6 已于 2026-10-07 由 Ocean 验收通过（「其他验收通过」），`DISCOVERED-20261007-1` 他选了甲。同一条消息里他报了一个新问题，要求「从头开始查」、查清楚之后**并进 P7** 一起下发：
> Flux 项目里 #4、#14 两块「整条取代」和「更正」都点不动，提示「第 20 块已经指着另一块了，一块只记得住一条这样的关系」；
> 外加一条交互要求（原话）：「MCP 端加入的 block 应该自动让 AI 选择整条取代或者更正（AI 可以自行使用这两个策略进行安全删除或者更正操作）。AI 给出操作建议后，用户在待审中检查，选择最后的更正，取代还是不动。过期检测只适用于用户自主检测。」
> 原来的 P7（图片，HANDOFF §9.6）照搬进来，排在后面。查问题的结果在 §3「查出来的」，下发这一窗问了 Ocean 四件事，答复在 §3「Ocean 10-07 拍板」（也记进了 HANDOFF §9.2 第 38–44 条）。
> **「现在」一栏每一条都对着 `0817ebd` 的代码和真库只读副本重核过。**
>
> **授权来源：** Ocean 2026-10-07 那条消息 + 下发时的四条答复（§3）+ 原 P7 的 09-30 拍板（HANDOFF §9.2 第 11 条）。本任务书只引用、不改。
>
> **边界：** 只做这八步。不碰实验线（`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行）；不动 `docs/EXECUTION_POLICY.md`；
> **库结构只许这一次（v32），只许：`blocks` 加一列、`supersede_proposals` 加一列、新建一张图片表（`CREATE TABLE` + 它自己的索引）** —— 已有的列一个都不改、不回填；
> **MCP 工具一个都不加**（还是 24 个），只改 `add_block` / `propose_supersede` 的行为和说明、`get_blocks` 的输出；
> **界面安全策略（CSP）一个字不改**；新依赖不许带网络库（`cargo tree` 那条照样是空的）。
> 不 push、不发版。换装给 Ocean 验收之前先问一句（§5）—— ⚠️ 这一批换装会把真库从 v31 迁到 v32。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：首屏、§9.0–§9.4、§9.8–§9.9（尤其 `DISCOVERED-20261007-1`）、§10.6（产品红线 + 工程护栏，尤其「更正折叠只在读者够得着时发生」「引文逐字闸的输入一个字符都不许动」「加 MCP 工具 / 表头在 TS 和 Rust 里各写一遍」「过期检测的错误落 `staleErrors`」那几行）。
3. `CLAUDE.md` §3（只改该改的）和 §5（提交信息里不许有任何工具署名）。
4. 上一份任务书：`docs/archive/product-taskbooks/TASKBOOK-P6-AI-FILE-PROPOSALS-FOCUS-CLOCK-2026-10-06.md` —— P6-1（动库的做法，P7-2 照抄）、§7 回执（换装那一段，§5 照着走）。
5. 设计稿（只读）：`docs/DESIGN_CONTEXT_HYGIENE.md` §3.1（取代关系当初为什么记在新块上 —— 这一点被 Ocean 10-07 改了）、§10（更正贴在那句话底下）；`docs/DESIGN_MCP_WRITE_ROLE.md` §4（待审面）。
6. 代码里的长注释（这几处的来龙去脉都写在注释里）：`src/lib/blocks/staleGuards.ts` 全文、`src/stores/compressStore.ts` 的 `decideStale` / `loadProposedStale`、`src/lib/db/blocks.ts` 的 `setBlockSupersession`、`src-tauri/src/mcp.rs` 的 `add_block_json` 里 `ref_kind` 那一段和 `propose_supersede_json`。
7. 记忆：⛔ `spool-db-wipe-incident`（**动库之前必读**；⛔ 验迁移别起 debug 版 GUI —— 同一个 identifier，会迁真库）、`isolated-verify-workflow`（§34、§40–§41 换装、§44 探针别连真库目录、§45 把真组件渲成静态页截图）、
   `mcp-tool-annotations-required`、`mcp-tool-routing-required`（改了 `add_block` 的行为就要改路由文本里讲更正的那几句）、`tauri-sync-commands-freeze-ui`（新 Tauri 命令一律 `(async)`）、`no-test-environment-spool`、`write-plainly-for-ocean`、`ui-language-follows-system`、
   `pack-header-source-of-truth`、`file-deletion-needs-ocean`、`attribution-grep-false-positive`。
8. 每一步开工前，读该步「现在」一栏点名的文件。

## 2. 起点

- 分支：本地 `main`。开工时 `git log -1` 应该是下发本任务书的那笔 docs 提交（标题以 `docs: 下发 P7` 开头），它的上一笔是 `0817ebd`；之后只多了 docs 提交也行。不是就停下来说明。
- ⚠️ 工作树里有**别人没提交的改动**（`docs/` 下研究线的文件、`docs/README.md` 里研究那几行）。**只 `git add` 你自己改的文件的路径**，
  绝不 `git add -A` / `git add .` / `git commit -a`。README 要改的话只暂存自己那一行（HEAD 版本只换那一行，`git hash-object -w` + `git update-index --cacheinfo`）。
- ⚠️ **删文件会被权限拦**：`git rm` 写给 Ocean，请他在输入框里用 `! git rm …` 跑。`git mv` 能自己跑。
- 每步一笔提交，提交信息用中文、一行标题 + 可选正文。提交后跑 `CLAUDE.md` §5 那条自查；命中产品内容里的 claude 字样按记忆 `attribution-grep-false-positive` 复核。
- 测试基线（`cbbe178` / `0817ebd` 上实测，开工前先跑一遍对一下，做完每步再跑；**cargo 的输出整份落文件**，见 `DISCOVERED-20261007-2`）：

```bash
npx tsc -b                                                # 干净
npx vitest run                                            # 73 个文件 / 897 条全过
cargo test --manifest-path src-tauri/Cargo.toml           # 157 过 · 4 跳过
cargo test --manifest-path src-tauri/sidecar/Cargo.toml   # 14 过
node scripts/i18n-check.mjs                               # (none missing) —— 这一条也在 vitest 里
node scripts/i18n-check.mjs --dead                        # 87 条 DEAD（基线噪声），每步做完和开工时那份逐行 diff
cd src-tauri && cargo tree -e normal | grep -iE "ureq|rustls|reqwest|hyper|openssl"   # 必须是空的（HANDOFF §10.7）
```

Vitest 输出里的 `[db] pre-migration backup FAILED … window is not defined`、Rust 编译的 3 条老警告（`spawn_sidecar` 没用、两处 `updated_at` 没读）都是基线噪声。

## 3. 八步

### 查出来的（10-07 下发这一窗，对着真库只读副本和代码查的）

**#4、#14 为什么点不动 —— 不是数据坏了，是结构做不到。**

- 「更正」和「整条取代」都记在**新块**身上：`blocks.ref_block_id` + `ref_kind`（引用 = `ref_kind` 为空、`'supersedes'`、`'corrects'`），**一块只有这一格**（`setBlockSupersession`，`src/lib/db/blocks.ts:879`，覆盖式写入；`supersedes` 时顺带给旧块写 `stale_at`）。
- 真库 Flux（`tkC7v4…`）：Claude 10-07 写的 #17–#21 **写进来的那一刻就各自「更正」了一块旧的**（#17→#15、#18→#1、#19→#10、#20→#3、#21→#16，都是 `add_block` 带 `ref_kind:"corrects"`，当场生效）；随后它又用 `propose_supersede` 提了 7 条「整条取代」，其中 #3、#4、#14 **三条都指望 #20 去取代**。
- 「#20 取代 #3」指的是同一块，能升级；「#20 取代 #4 / #14」要把 #20 那一格改去指别的块，会冲掉「#20 更正 #3」—— `wouldOverwriteRelation`（`src/lib/blocks/staleGuards.ts:47`）在 `decideStale`（`src/stores/compressStore.ts:964`）里把「更正一处」「只退旧的」**两个按钮一起拦住**，报的就是 Ocean 看到的那句（`compressStore.ts:985`）。
- 现在库里只剩一条待定：「#4 由 #20 取代」（10-14 21:56 过期）。#14 那一条已经被处理掉了，#14 没有退役。Flux 里此刻一块都没退役。

**顺带查出来的三处（都和 Ocean 的交互要求是同一件事）**

1. **MCP 端收提案时不检查那一格**：`propose_supersede_json`（`mcp.rs:5006`）只查同一项目、有编号、两句引文逐字对得上 ⇒ AI 能排进一条界面上永远点不成的提案，还对用户说「在 Spool 等你」。
2. **AI 的「更正」绕过了用户**：`add_block` 带 `ref_kind:"corrects"` 当场生效（`mcp.rs` `add_block_json` 里 `ref_kind` 那一段；它拒的只是 `"supersedes"`），#17–#23 就是这么进来的；同一对块上它又另提了「整条取代」。
3. **AI 提的「整条取代」不在待审面**：只在那个项目的「过期检测」页签里（`loadProposedStale`，`compressStore.ts:1034`，由 `ThreadView/index.tsx:94` 和 `stores/outsideWrites.ts:25` 调），左栏的待审数（`proposalsStore.refresh`）也不算它。工具描述写的是 "puts the question on that project's review screen"，Claude 转述成 "waiting for you on Spool's review screen" —— 用户去待审里找不到。

### Ocean 10-07 拍板（下发这一窗问的，别再问）

| # | 问题 | Ocean 的答复 |
|---|---|---|
| 1 | P6 验收 | **通过**；`DISCOVERED-20261007-1` 选**甲**：去掉新版时，指着它的旧版恢复成现用（⇒ P7-1） |
| 2 | 新交互（原话见首屏） | AI 写进来的块要是推翻 / 取代了旧块，AI 自己选「整条取代」还是「更正」，但**只算建议**；建议进**待审**，用户在那里选最后的「更正 / 取代 / 不动」。**过期检测页签只给用户自己点「查过期」跑出来的结果** —— 推翻 08-24 S2「AI 提的并进过期检测那张卡」 |
| 3 | 一块新的要取代好几块旧的，怎么改 | **旧块记住被谁取代**：「取代」不再占新块那一格，旧块退役时自己记着被第几块取代（v32，`blocks` 只加一列），一块新的可以取代任意多块，新块原来的更正 / 引用不受影响。**接受代价**：pack 里新块下面不再写「取代了哪一块」那一行（被取代的旧块本来就不进 pack，底部照旧写「有 N 块已不再有效」） |
| 4 | AI 写的那一块本身怎么处理 | **块照常存，关系等你点**：AI 写的新内容当场存进项目（和现在的 `add_block` 一样）；它对旧块的更正或取代进待审，用户点了才生效。**接受代价**：点之前旧块在 pack 里照旧当成有效结论。⚠️ 已经生效的 #17–#23 不回头改 |
| 5 | 图片存哪 | **存进库文件里**（一张表）：导出 / 搬到新电脑照旧一个文件全带走，导出导入不改。**接受代价**：库文件变大；pack 里要写图片路径，得先把图片放一份文件出来 |
| 6 | 一块能放几张图 | **可以好几张**：主窗一次粘贴 / 拖进来好几张都进同一块；双击 ⌥ 捕一张就是一张。动库是新建一张表 |

### 原文（原 P7，从 HANDOFF §9.6 搬过来的，不改）

**P7 · 图片**

- 存：图片由 Spool 存进自己的数据目录（和 `spool.db` 放一起，库导出 / 搬迁时一起带走 —— 查 `src-tauri/src/transfer.rs` 要不要跟着改）。
- 显示：安全策略现在是 `img-src 'self' data:`（`src-tauri/tauri.conf.json:27`）。由 Rust 读出来、缩成预览、转成 `data:` 显示，
  **安全策略一个字不改**（§10.6 产品红线）。块里文字、图片、批注同时在。
- pack：两个渲染器都写「图片：路径」，表头说明两侧逐字一致，golden 重生。
- 入口：双击 ⌥ 时剪贴板里是图片 ⇒ 捕成图片块（今天会报「剪贴板为空」）；主窗粘贴 / 拖入。
- **硬要求：截完图直接双击 ⌥ 就能捕到。开工前先查清这四件，查完写进任务书回执再动手：**
  1. macOS 截图分两种：`⌃⌘⇧3/4` 进剪贴板；`⌘⇧3/4/5` 默认存成文件（位置看 `defaults read com.apple.screencapture location`，默认桌面），
     右下角还会先挂一个缩略图，**缩略图消失前文件可能还没写出来**。两种都要能捕。
  2. 双击 ⌥ 现在要求 10 秒内按过 ⌘C（给 Claude Desktop 让路的复制闸）。截图快捷键要能像 ⌘C 一样打开这道闸 —— 事件监听看得见这些组合键。
  3. 读截图文件要碰桌面（或用户设的截图目录）⇒ 可能弹一次「Spool 想访问桌面文件夹」的系统授权。这一句话要先告诉 Ocean。
  4. 找「刚截的那张」的规则：截图目录里、截图快捷键之后出现的最新图片文件；缩略图还挂着时怎么等（等多久、等的时候浮窗说什么）。

（⚠️ 「存」那一条被 10-07 第 5 条细化了：存进**库文件里面**，`transfer.rs` 的导出（`VACUUM INTO` 单个文件，`transfer.rs:72`）因此不用改；导入走 `MERGE_TABLES`，要加上图片表。）

### 现在（`0817ebd`，对着代码重核过）

- **库**：v31（`src/lib/db/client.ts` `SCHEMA_VERSION = 31`，`mcp.rs` `EXPECTED_SCHEMA_VERSION: i64 = 31`）。最后一步迁移 v30→v31（`add-file-proposals`）的注释和写法是 P7-2 的样板。
- **关系**：一块一格（见上面「查出来的」）。v32 以前所有「取代」都记在新块的 `ref_kind='supersedes'` 上；手动退役是 `BlockItem.tsx:1166` 的开关（`blocksStore.setStale`，纯开关、没有确认、没有撤销），只写 `stale_at`。
  `supersede_proposals`（v25，`schema.sql` 那一段）：`stale_block_id` / `by_block_id`（都带 `ON DELETE CASCADE`）、`client`、`why`、`quote_stale` / `quote_new`（`NOT NULL`，逐字闸放行过的）、`retyped`、7 天过期；DB 层 `src/lib/db/supersedeProposals.ts`。
- **过期检测卡**（`src/components/Compress/StaleReview.tsx` + `compressStore`）：三个按钮 `merge`（「更正一处」：新块写 `corrects` + 引文）/ `retire`（「只退旧的」：新块写 `supersedes` + 旧块 `stale_at`）/ `keep`（「不动」，AI 提的那一行删掉）。页签在 `ThreadView/index.tsx` 里，AI 提了东西在等时也会冒出来。
- **待审面**（`src/components/Review/ReviewPanel.tsx` + `src/stores/proposalsStore.ts`）：四种 —— 一批块、申请读文件、跟进行、P6 的文件提议；`pendingCount` 是这四种之和，**不含** `supersede_proposals`。库变化记号（`librarySignature.ts` 的 `WATCHED`）已经盯着 `supersede_proposals`。
- **MCP**：24 个工具。`add_block` 带 `ref_kind:"corrects"` 必须带 `corrected_quote`（逐字出现在旧块里），当场写进新块；`"supersedes"` 当场拒。`propose_blocks` 的条目也能带 `corrects`，整批过待审时用户已经看过。`get_blocks` 每一块有 `stale_at`、`ref_kind`。
- **pack**：被退役的块不进 pack，底部一行 `[... N block(s) the user has marked as no longer valid ...]`；新块的 `ref_kind='supersedes'` 渲成 `↩ replaces (that block no longer holds): …`（golden 的 b10）；引用一块已退役的块渲成 `(cited block is no longer valid)`（`assemble.ts:345` / `mcp.rs:838`）。F2 红线：**入向边一个字都不许进 pack**（`assemble.ts` 那段注释）。
- **文件（P7-1）**：`attachments.ts::deleteAttachment`（`:275`）只删那一行；所有删文件的路都经过它（右栏 ×、删块时「一起去掉」、撤销里删回去）。
- **图片**：块只有 `text` / `ref` 两种（`schema.sql` `blocks.kind`）；捕捉只读剪贴板里的**文字**（`tauri-plugin-clipboard-manager`），没字时报「剪贴板为空」（`src/overlay/CaptureOverlay.tsx:146`）；CSP `img-src 'self' data:`；导出是 `VACUUM INTO` 一个文件（`transfer.rs:72`），导入走 `transfer.ts` 的 `MERGE_TABLES`（`:20`）。

### P7-1 · 去掉新版时，旧版恢复成现用（`DISCOVERED-20261007-1` 甲）

- 要做：`deleteAttachment` 在删那一行之前，把 `superseded_by` 指着它的那些旧文件的 `superseded_by` / `superseded_at` 清掉（一句 UPDATE，写在最底层 —— 和 P5-3 同一个理由：以后新加的删文件路径自动落到这一边）。右栏、块上、pack 不用改：它们本来就按这两列判。
  删块「一起去掉」的撤销会把新版插回来，但旧版**不会**自动回到「被取代」—— 要不要把旧版这两列也记进撤销快照，看成本施工时定、写进回执（不记的话撤销之后两个都是现用，不丢东西）。
- 不做：⛔「取消取代」按钮（P6-3 ⑤）；⛔ 不碰 `superseded_by` 以外的列。
- 验收：真 SQLite 测试 —— 右栏 × 掉新版 ⇒ 旧版两列为空、重新进两个渲染器的 pack、块上那一行重新出现；删块时「一起去掉」带走新版 ⇒ 同样；连着取代（v1 ← v2 ← v3）× 掉 v3 ⇒ 只有 v2 回到现用（v1 仍收在 v2 下面）。

### P7-2 · 库 v32：两列 + 一张图片表（一次迁移）

- 要做：
  1. 迁移 v31→v32，**只许**：
     - `ALTER TABLE blocks ADD COLUMN <旧块被谁取代>`（块 id，可空）。名字施工时定，⛔ **别叫 `superseded_by`**（`attachments` 上那一列装的是文件 id，同名会看错）。NULL = 没被取代 / 手动退役 / v32 以前的取代（那些仍记在新块的 `ref_kind='supersedes'` 上，⛔ 不回填）。
     - `ALTER TABLE supersede_proposals ADD COLUMN <AI 建议的是哪一种>`（`'supersedes'` / `'corrects'`，可空）。NULL = v32 以前的行 = `'supersedes'`。
     - `CREATE TABLE IF NOT EXISTS <图片表>` + 它自己的索引：至少要能存 id、所属块、在块里的顺序、图片字节（BLOB）、格式、宽、高、字节数、`created_at`。外键只指 `blocks`（块删了图跟着走 —— 但别靠级联，见 P7-6）。
     ADD COLUMN 撞上已存在的列 catch 掉（照 v30 的写法）；注释照 v31 写：做了什么、往前老库是什么样、往回怎么退（`DROP COLUMN` ×2 + `DROP TABLE` 退回 v31，不丢 v31 就有的数据）。
  2. `schema.sql` 同步；`SCHEMA_VERSION` 32；`mcp.rs` `EXPECTED_SCHEMA_VERSION` 32（注释照 v31 写一行）。
  3. `Block` 类型和读写整行的地方带上新列；`transfer.ts` 的 `MERGE_TABLES` **加上图片表**（排在 `blocks` 后面 —— Ocean 10-07 选「存进库文件里」就是为了图片跟着库走）；`supersede_proposals` 照旧不跟着走。`librarySignature` 的 `WATCHED` 不加图片表（MCP 不写图片）。
- 不做：⛔ 已有的列一个都不改、不回填；⛔ 不碰 `ref_block_id` / `ref_kind` 已有的值。
- 验收（照 P6-1）：① `client.test.ts` 加 `downgradeToV31` + v31→v32 一条（两列在、全空；图片表在、是空的；别的表逐行相等、别的建表语句一个字不变），新装的库照 `schema.sql` 也有；
  ② **真库副本跑真迁移**：拿最新的真库备份（`~/Desktop/spool.before-p6-install-20261007-011113.db` 或之后更新的）复制到 scratchpad，`fresh === false`、版本 32、所有表计数和正文总长不变、`integrity_check ok`；⛔ 不许碰真库；⛔ 不许起 debug 版 GUI；
  ③ 新二进制起 `--mcp` 探针对着迁好的副本（`SPOOL_DATA_DIR` 指副本），版本闸两个方向都对；
  ④ `transfer` 测试：带图片的块导出再导入，图片字节原样回来。

### P7-3 · 「整条取代」不再占新块那一格（Ocean 10-07 #3）

- 要做：
  1. 「取代」= 旧块写 `stale_at`（已经有就不动）+ 写 P7-2 那一列 = 新块 id；**新块一个字不动**（它原来的更正 / 引用照旧）。所有走「取代」的路都改：P7-5 的待审卡、过期检测卡的「只退旧的」（用户自己跑的那一种）。`wouldOverwriteRelation` 只再拦「更正」。
  2. 手动退役开关把块「取回来」时，那一列一起清（不然取回之后还写着被谁取代）。
  3. 界面：被取代的旧块写「被第 n 块取代」，新块写「取代了第 a、b、c 块」—— ⚠️ **只在界面上**（新块那一句是入向，F2 红线：入向边不进 pack）。样子照现有的引用行 / 来龙去脉那几个组件，别另起一套。
  4. `get_blocks`：被取代的旧块多一个字段说被哪一块取代（块号 + 块 id）；工具描述补一句。
  5. pack：**格式不动** —— 被取代的旧块本来就不进 pack，底部照旧计数；新块下面不写「取代了哪一块」（Ocean 接受的代价）；v32 以前那些 `ref_kind='supersedes'` 照旧渲染，golden 不用动。
     ⚠️ 要核一种情形：新块本来就引用 / 更正着它后来取代掉的那一块（例：先「更正」、后来用户选了「取代」）⇒ 那一行会渲成 `(cited block is no longer valid)`。照旧渲还是另写一句，施工时定、写进回执；要改格式的话两个渲染器同时改、逐字一致、golden 重生。
  6. `staleGuards.ts` 里判「这条取代做完了没有」的那几把尺子跟着新列改（做完了 = 旧块已退役 **且** 那一列 = 新块），注释里写清 v32 前后两种记法都认。
- 不做：⛔ 不把旧的 `ref_kind='supersedes'` 搬到新列（不回填）；⛔ 不改「更正」的记法（仍在新块那一格，一块只更正一块）。
- 验收：真 SQLite 测试钉住 —— **一块已经「更正」着 A 的新块，还能取代 B、C**（Flux #20 的形状）；一块新的取代三块；手动取回清掉那一列；v32 以前的 `supersedes` 照旧渲染（golden 不变）；`get_blocks` 新字段的样子。

### P7-4 · AI 的「更正 / 取代」只算建议（MCP，Ocean 10-07 #2、#4）

- 要做：
  1. `add_block` 带 `ref_kind:"corrects"`：**块照常存**，但新块**不带**那条关系（`ref_block_id` / `ref_kind` / `corrected_quote` 都不写）；同时往 `supersede_proposals` 排一条建议（P7-2 那一列 = `'corrects'`，`quote_stale` = 原来的 `corrected_quote`）。
     **新接受 `ref_kind:"supersedes"`**，同样只排一条建议（`'supersedes'`）—— 原来拒它的理由（「整条作废只有用户能定」）现在由待审保证。两种都要逐字引旧块里不再成立的那一句（同一道 `quote_passes` 闸，⛔ 输入一个字符都不许动）。参数名沿用 `corrected_quote` 还是另起，施工时定，⛔ 别让老调用法失效。
  2. 只带 `ref_block_id`、不带 `ref_kind`（引用）：照旧当场生效 —— 引用不改旧块在 pack 里的样子。
  3. `propose_supersede`：照旧排队（`'supersedes'`）；描述改成「在 Spool 的待审里等用户，用户会在更正 / 取代 / 不动里选」，⛔ 不再说 "that project's review screen"。
  4. 回复和给人看的头一句：`add_block` 带了这两种之一时，说「块存好了；对第 n 块的更正 / 取代在 Spool 的待审里等用户点」，⛔ 不许说「已更正」。
  5. 路由文本：`OPENERS` / `INSTRUCTION_BODY` 里讲更正的那几句（「Correcting ONE point inside a block … is ref_kind:"corrects"」「这条结论不对了 / 更正一下」那一行、「这个名单/计划整个重做了」那一行）改成：AI 自己选更正（一处）还是取代（整块），两种都只是建议，用户在待审里定。中英触发词照旧。
- 不做：⛔ 不加工具（还是 24 个，三道自动测试照过）；⛔ `propose_blocks` 里带 `corrects` 的条目不改（整批过待审时用户已经看过）；⛔ 用户自己在界面上做的更正（选中那句、写对的）照旧当场生效；⛔ 已经生效的关系（#17–#23 等）一条不动。
- 验收：Rust 测试 —— `add_block` 带 `corrects` ⇒ 块在、它的 `ref_block_id` / `ref_kind` / `corrected_quote` 为空、建议表多一行 `'corrects'`；带 `supersedes` ⇒ 同理 `'supersedes'`；只带引用 ⇒ 照旧当场写；引文对不上 ⇒ 当场拒、什么都不存；写入开关关着 ⇒ 拒。真二进制探针对着真库副本各调一次。

### P7-5 · 待审面：「更正 / 取代 / 不动」；过期检测只放用户自己跑的（Ocean 10-07 #2）

- 要做：
  1. `proposalsStore` 读 `supersede_proposals`（未过期、两块都还在、项目没删），`pendingCount` 加上；`ReviewPanel` 加卡片：哪个 AI 提的、哪个项目、**旧块**（块号圆圈 + 开头一句 + 不再成立的那一句）、**新块**（块号圆圈 + 开头一句）、它说为什么、**AI 建议的是哪一种**（标出来），三个按钮「更正」「取代」「不动」—— 不管 AI 建议的是哪一种，三个都能点。文案大白话、中英都进字典。
  2. 「更正」：新块那一格空着（或者本来就指着这一块旧的）才能点；占着别的块 ⇒ 按钮灰掉，旁边一句大白话（例「第 20 块已经在更正第 3 块了，一块只能更正一块；要更正这一块，让 AI 另写一块」）。点了 = 新块写 `corrects` + 引文（逐字闸照旧）。
  3. 「取代」：走 P7-3 那条路。「不动」：那一行删掉（和现在一样 —— 不动是一个决定，留着下次又问）。
  4. 过期检测：`loadProposedStale` 不再读 `supersede_proposals`；那个页签只在用户自己点「查过期」跑出东西时出现。08-24 S2「AI 提的并进同一张卡」作废（Ocean 10-07）。`ThreadView/index.tsx`、`outsideWrites.ts` 里调它的地方跟着改；P4-1 那条「AI 提的跟着别的待审一起刷新」由待审面接手。
  5. 换装后真库里那一条（Flux「#4 由 #20 取代」，10-14 21:56 过期）应该出现在待审里，并且「取代」点得成。
- 不做：⛔ 不弹窗、不抬窗口（P4-2 的规矩：数字和面板自己变就是全部反馈）；⛔ 过期检测卡（用户自己跑的那一种）的三个按钮文字和行为不动，只是「只退旧的」底下换成 P7-3 的记法。
- 验收：真 SQLite 测试钉住三种选择各自落库、「更正」被占时点不了、一块新的取代三块、`pendingCount` 算上它、过期检测不再出现 AI 提的；WKWebView 中英各渲一遍卡片（记忆 §45）；Ocean 手指（§6 第 2–4 条）。

### P7-6 · 图片：存进库、在块里显示（Ocean 09-30 第 11 条 + 10-07 #5、#6）

- 要做：
  1. 图片存进 P7-2 的图片表（BLOB）。一块可以好几张，按顺序显示；块里文字、图片、批注同时在。
  2. 显示：Rust 命令读出来、缩成预览、转成 `data:` 给界面（命令一律 `(async)`），**CSP 一个字不改**；点开看原图（同样走 `data:`）。单张大小上限施工时定、写进回执，超了就拒并说一句大白话。
     解码 / 缩图要加的 Rust 依赖：⛔ 不许带任何网络库，加完 `cargo tree` 那条照样是空的；⛔ 不许挪进 sidecar 以外的出网路径。
  3. 块的生命周期跟着走（照 P5-3 的写法写在最底层 `blocks.ts`，⛔ 不靠外键级联）：删块（含撤销把图放回来）、合并（图挪到留下那块）、移块（图跟着块）、复制到别的项目（图跟着复制）。
- 不做：⛔ 不改导出（`VACUUM INTO` 本来就带走）；⛔ 不做图片里的文字识别、不进搜索。
- 验收：真 SQLite 测试钉住存 / 读 / 顺序 / 删块撤销 / 合并 / 移块 / 复制；`transfer` 测试（P7-2 ④）；WKWebView 渲一遍块里「文字 + 两张图 + 批注」的样子。

### P7-7 · 图片入口：截完图双击 ⌥ 就能捕到；主窗粘贴 / 拖入

- 要做：按「原文」那五条做。**动手前先把原文那四件查清、写进回执**；第 3 件（可能弹「Spool 想访问桌面文件夹」）**查清之后、动手之前先告诉 Ocean**。
  双击 ⌥ 时剪贴板里是图片 ⇒ 捕成图片块（捕捉卡照 P3 那一套：能改投、能固定、Enter 完成）；主窗粘贴 / 拖进来好几张 ⇒ 进同一块（Ocean 10-07 #6）。
  Windows 那一侧（双击 Ctrl）照同一个意思写；本机编不了 Windows，写到哪儿在回执里说清。
- 不做：⛔ 不动复制闸对 ⌘C 的原有行为；⛔ 不让主窗自己抬起来（`capture-note-first` 那条铁律）。
- 验收：**只能真手指**（§6 第 5 条）；能测的部分（「刚截的那张」怎么挑、等多久）写成纯函数测试。

### P7-8 · 图片进 pack / MCP

- 要做：
  1. pack：两个渲染器都给带图的块写图片那几行（原文「图片：路径」）。图片存在库里，所以要先放一份文件出来才有路径：放在哪（建议数据目录下一个能随时重建的缓存文件夹）、什么时候放、那一行怎么写（例 `图片：<路径>（1240×800）`），施工时定、写进回执；**两边逐字一致，golden 重生**。⛔ 图片字节不进 pack。
     表头说明要不要加一句，看 `pack-header-source-of-truth` 那条记忆和两边表头 `byte-identical` 的测试再定；加了两边逐字一致。
  2. `get_blocks`：每块带图片的几样元数据（几张、尺寸、大小、放出来的那份路径）。
- 不做：⛔ 把图片本身递给 AI（MCP 的图片内容类型）不在这一批 —— 记成 DISCOVERED 候选；⛔ pack 别的地方不动。
- 验收：golden 两边过；`get_blocks` 的样子；Ocean 手指（§6 第 6 条）。

## 4. 什么时候停下来问

- 起点不是 §2 写的那样；
- 迁移要做 P7-2 列出的那三样以外的任何事；真库副本跑迁移失败、计数或正文总长变了；
- 做下去要加 MCP 工具、改 CSP、加带网络的依赖、或者让窗口自己抬起来；
- P7-3 / P7-5 发现「取代」或「更正」还有本任务书没写到的入口（还有别的地方在写 `ref_kind='supersedes'`）；
- P7-7 查清那四件之后（尤其第 3 件的系统授权）—— 先告诉 Ocean 再动手；
- 发现和「现在」一栏对不上的现状（代码已经变了）；
- 要删文件（请 Ocean 跑，见 §2）；
- 发现新问题：**不顺手修**，按 HANDOFF §8 的 DISCOVERED 格式记进 HANDOFF §9.9，继续做本任务。

## 5. 做完八步之后：换装给 Ocean 验收（先问）

- 八步都提交、全部测试通过之后，**先问 Ocean「现在换装吗」**，得到同意再做。问的时候说清 ⚠️ 下面那条（真库要升级、AI 客户端要重启）。
- 照 P6 回执「换装」那一段（命令和核对项都写了）：先看现装的签名（现在是 Developer ID ⇒ `APPLE_SIGNING_IDENTITY` 走环境变量，不改 `tauri.conf.json`，公证变量全部 unset）；构建日志进文件，TSA 偶发失败就整个重跑；
  停 GUI 和 `--overlay` **按 pid**，杀完再查一遍；`--mcp` 一个都不碰；换装前 `VACUUM INTO` 备份真库到桌面；旧包 `mv` 进 `~/Desktop/Spool/spool-pre-install/`；
  换装后核 sha256、进程启动时间、`lsof` 的 txt inode、`[double-tap] installed at HID/active`。
- ⚠️ **这一批会迁移真库（v31 → v32），第一次启动时由 GUI 自己做。** 换装后多核：`PRAGMA user_version` = 32；所有表计数和正文总长和备份一致；真库目录里**正好多出一个** pre-migration 快照；两列在、全空，图片表在、是空的。任何一样不对：先别动，把新进程停掉，报给 Ocean。
- ⚠️ 迁完之后，所有还在跑的旧 `--mcp` 子进程**每一次调用都会报「库比服务新」**。⛔ 不许去杀它们；回执里写清楚，§6 开头也提醒 Ocean 重启 AI 客户端。
  新版那边是不是通的，用新二进制起探针对着**迁好之后的真库副本**（`VACUUM INTO` 到 scratchpad，记忆 §44），⛔ 别连真库目录。
- commit、build、换装分开记在回执里；**不 push、不发版**。

## 6. 给 Ocean 的验收单（大白话，换装后给 Ocean）

开始前：**把你的 AI 客户端（Claude / Codex）重启一下。** 这次库又升级了一次，换装之前就开着的那些连接每次调用都会报错，重启就好。

1. 右栏里把一个「新版」文件用 × 去掉 ⇒ 它下面收着的旧版回到普通的一行（不再灰），打 pack 时又有它。
2. 待审里应该有 Flux 那一条「#4 由 #20 取代」（10-14 之前）⇒ 点「取代」，这一次点得成：#4 写着「被第 20 块取代」，#20 写着「取代了第 4 块」，#20 原来对 #3 的更正还在。
   （#14 那一条已经被处理掉了：想退掉 #14 的话，让 Claude 再提一次「#20 取代 #14」。）
3. 在 Claude 里让它写一块推翻旧结论的块（例：「把 Flux 里某某的新情况记下来，旧的那块不对了」）⇒ 新块马上出现，旧块还没变；待审里多一张卡，写着它建议「更正」还是「取代」，三个按钮都能点。点「不动」⇒ 卡片消失，旧块不变。
4. 项目上方的「过期检测」：AI 提了东西时不会再冒出来；自己点「查过期」照旧。
5. 截一张图（`⌃⌘⇧4` 进剪贴板，或者 `⌘⇧4` 存成文件），直接双击 ⌥ ⇒ 捕成一块带图的；主窗里粘贴或拖进来两三张图 ⇒ 进同一块；块里文字、图片、批注同时在。
6. 打一次带图那个项目的 pack ⇒ 有图片那一行；导出库再导入到别的地方（或者看回执里那条测试）⇒ 图片跟着走。

你只要告诉我：这几条里哪几条不对，不对的那条你看到了什么。

## 7. 回执（执行窗填写）

每步一小段：

- 提交：`<hash> <标题>`
- 改了哪些文件（一行一个）
- 怎么验的：命令 + 结果（vitest / cargo 的条数，i18n-check 的输出原文，`cargo tree` 那条的输出；P7-2 另写真库副本迁移和 `--mcp` 探针的结果）
- 施工时自己定的（两列和图片表叫什么；P7-1 撤销要不要记旧版；P7-3 那种「先更正后取代」怎么渲；`add_block` 的参数；卡片文案；单张图片上限；缩图依赖；P7-7 那四件查出来的结论；P7-8 图片放在哪、那一行怎么写、表头加没加）
- 还差什么、有没有偏离本任务书、新发现记在 HANDOFF 哪里

最后一段：换装（做了没有、装的是哪个 commit、`spctl` 结果、真库备份文件名、真库迁移前后的核对、`--mcp` 子进程还在跑旧二进制这件事）、Ocean 验收（还没有就写「待验收」）。

## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 验收`（Ocean 验过后改成 `COMPLETE`），`git mv` 进 `docs/archive/product-taskbooks/`。
2. `docs/HANDOFF-2026-09-04.md`：§9.3 路线图 P7 那一行改成「已完成，任务书在 archive/product-taskbooks/…」；§9.6 P7 那一行同样改；
   §9.8「唯一下一步」改成「按 §9.4 下发 P8」；`docs/README.md` 入口表里 ACTIVE 产品任务书那一行改成「暂无」（README 只暂存这一行）。
3. 这些文档改动单独一笔提交（同样只 add 自己改的路径）。
