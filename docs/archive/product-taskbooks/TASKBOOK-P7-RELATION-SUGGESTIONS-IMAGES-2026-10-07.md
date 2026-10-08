# 产品任务书 P7 —— AI 的「更正 / 取代」只算建议、一块能取代好几块 + 图片

> **状态：COMPLETE —— 待 Ocean 验收。**（八步已提交、已换装，真库已迁到 v32；回执在 §7 末尾。10-08 验收第一轮第 1–6 条已改、已提交、已换装；第 7 条并进 P8。10-09 第二轮两条已改已提交、已换装。）
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

### 回执（2026-10-07 – 10-08 执行窗）

起点核过：`git log -1` = `4e86786`（`docs: 下发 P7…`），上一笔 `0817ebd`。开工前基线和 §2 一样：tsc 干净、vitest 73 / 897、cargo 157 · 4、sidecar 14、`(none missing)`、`--dead` 87 条、`cargo tree` 那条是空的。cargo 的输出每次都整份落了文件（`DISCOVERED-20261007-2`），这一窗没再出现偶发失败。

施工中问了 Ocean 三件（都记进 HANDOFF §9.2 第 45–47 条）：
- P7-7 查清四件之后、动手之前：读桌面上的截图第一次会弹「“Spool”想访问“桌面”文件夹中的文件」—— **照做，弹一次就弹一次**；
- P7-7：从访达拖进来的图片和 P5「访达拖进来是项目文件」打架 —— **图片变块，别的照旧**；
- P7-8：pack 里图片那一行和「pack 不许出现本机目录」那条规矩打架 —— **写完整路径**。

#### P7-1 · 去掉新版时，旧版恢复成现用

- 提交：`3e2dac3 fix(files): 去掉新版时，被它取代的旧版恢复成现用（右栏 ×、删块「一起去掉」都算；撤销会把旧版重新收回新版下面）`
- 改了：`src/lib/db/attachments.ts`、`src/lib/undo/undoLog.ts`、`src/stores/blocksStore.ts`、`src/stores/undoStore.ts`、`src/stores/projectFiles.revive.test.ts`（新）
- 施工时定的：`deleteAttachment` 删那一行之前先把 `superseded_by` 指着它的旧版两列清空，并把清了哪几个交回来。**撤销会记旧版**（成本十来行）：删块「一起去掉」撤销时新版插回来，旧版也重新收回它下面、`superseded_at` 原样；重做再恢复。
- 怎么验的：真 SQLite 四条（右栏 × 掉新版 ⇒ 旧版两列空、进 pack、块上那一行回来；删块带走新版 ⇒ 同样，撤销 / 重做各一遍；v1 ← v2 ← v3 去掉 v3 ⇒ 只有 v2 回来；去掉一个没取代过别人的文件别的行不动）。把那句 UPDATE 拿掉，三条变红。Rust 那个渲染器读的是同两列（`superseded_by IS NULL`），没另测。全套：tsc 干净；vitest 74 / 901；cargo 157 · 4；sidecar 14；`(none missing)`；`--dead` 和开工时逐行一样；`cargo tree` 空。

#### P7-2 · 库 v32

- 提交：`03122d6 feat(db): 库 v32 —— 旧块记住被哪一块取代、AI 建议的是哪一种、新建图片表（导入时图片字节原样跟着走）`
- 改了：`src/lib/db/client.ts`（`SCHEMA_VERSION` 32 + v31→v32 `add-block-replacement-suggested-kind-and-images`）、`src/lib/db/schema.sql`、`src-tauri/src/mcp.rs`（只有 `EXPECTED_SCHEMA_VERSION` 32 + 一行注释）、`src/lib/db/blocks.ts`、`src/stores/blocksStore.ts`、`src/lib/db/transfer.ts`、`src/lib/db/client.test.ts`、`src/lib/db/transfer.test.ts`、两个测试夹具
- 施工时定的：
  - `blocks.replaced_by_block_id`（旧块被哪一块取代）、`supersede_proposals.suggested_kind`（`'supersedes'` / `'corrects'`，NULL 读作取代）、新表 `block_images`（`id`、`block_id`、`position`、`bytes` BLOB、`format`、`width`、`height`、`size_bytes`、`created_at`）+ 索引 `idx_block_images_block(block_id, position)`。外键写了指 `blocks`，但这个连接不开 `PRAGMA foreign_keys`，级联不会发生 —— 生命周期全写在 `blocks.ts` 最底层（P7-6）。
  - `Block` 带上 `replacedByBlockId`（读整行、`createBlock`、`insertBlocks`、`restoreBlock` 都带）；**复制到别的项目不带**（取代它的那一块没跟着复制过去）。
  - ⚠️ 查出来一件任务书没写到的事：tauri-plugin-sql 2.4 把 BLOB 读成一串数字、把非字符串非数字的参数当 JSON 文本绑定 —— 照通用写法合并，图片会变成一段文字 `"[137,80,…]"`，而 node:sqlite 的测试照样绿。所以导入时图片这一张表的字节只在 SQL 里搬（`hex()` 出、`unhex()` 进，一张一句）；bundled SQLite 是 3.46.0，有 `unhex`。测试用一个照插件真实行为写的适配器跑，把这段特殊处理拿掉测试就红。
- 怎么验的：① `client.test.ts` 加 `downgradeToV31` + v31→v32 一条（两列在、全空；图片表在、空的、索引在；别的表逐行相等、别的建表语句一个字不变）+ 新装的库照 `schema.sql` 也有；更老的迁移测试比对 `blocks` 时去掉新列。② 真库副本跑真迁移：拿真库 `sqlite3 -readonly … VACUUM INTO` 到 scratchpad 的 v31 副本（另外也跑了 `~/Desktop/spool.before-p6-install-20261007-011113.db` 那份 v30），`fresh === false`、32、各表行数和几样总长迁移前后都不变（v31 副本：工作区 25 / 项目 64 / 块 1053 / 文件 12 / 取代建议 1，正文 303172、批注 12222、文件正文 130320、摘要 735；v30 那份：块 1020，正文 293157、批注 12197、文件正文 30490），两列全空、图片表空的，`integrity_check ok`。真库只被只读导出过，没起 debug GUI。③ 新 debug 二进制 `--mcp` 探针：v32 副本 `initialize` 通、24 个工具、48 个项目；v31 副本回「Spool's database is still the older v31; this MCP server is v32」。④ `transfer` 测试：带两张图的块导出再导入，字节原样回来、是 BLOB、再导一次不重复。全套：vitest 74 / 904；cargo 157 · 4；其余同上。

#### P7-3 · 「整条取代」不再占新块那一格

- 提交：`c08f28d feat(blocks): 「整条取代」记在旧块上，不再占新块那一格 —— …`
- 改了：`src/lib/db/blocks.ts`（`replaceBlock` 一句 UPDATE；手动「取回来」清那一列；「引用待审」的 SQL 版排除「被引用方自己取代的」）、`src/stores/compressStore.ts`（「只退旧的」走 `replaceBlock`；`wouldOverwriteRelation` 只再拦「更正一处」）、`src/stores/blocksStore.ts`、`src/lib/blocks/staleGuards.ts`（`alreadyReplaced`：v32 前后两种记法都认）、`src/lib/blocks/provenance.ts`、`src/components/ThreadView/ReplacementLine.tsx`（新）、`BlockItem.tsx`、`src-tauri/src/mcp.rs`（`get_blocks` 的 `replaced_by`）、i18n、测试
- 入口核过：写 `ref_kind='supersedes'` 的只有过期检测卡「只退旧的」一处（`blocksStore.setSupersession` 有一档没人用，收窄成只收 `corrects`；`add_block` / `propose_blocks` 本来就拒）—— 没有任务书以外的入口，没停。
- 施工时定的：
  - 界面：旧块在「不作数」那一行下面写「已被整条取代：⑳」（折起来也看得见，那就是它退役的原因）；新块在引用行那里写「整条取代了 ④ ⑭」（只在界面上）。都能点过去。
  - **「先更正、后取代」照旧渲**：新块那一行仍是 `↩ corrects one point in: (cited block is no longer valid)`。理由：这句是真的；改写成「它取代了那一块」等于把入向边写进 pack，正是 Ocean 接受的代价和 F2 红线不许的。格式没动，golden 没动。这一对也不进「引用了不作数的块，等你看一眼」（TS 和 SQL 两把尺子一起改）。
  - `get_blocks`：被取代的旧块多 `replaced_by: {seq, block_id}`，描述补了一句。
- 怎么验的：真 SQLite 六条（Flux #20 的形状：已经更正着 A 的新块，经真的「查过期」+「只退旧的」取代 B、C，它的更正一字不动；一块取代三块；已退役的再被取代不挪退役时间；手动取回清那一列；pack 里被取代的不进、底部照旧计数、新块下面只有自己的更正；先更正后取代）；把那道闸改回拦两个按钮，Flux 那条变红。Rust 一条（`replaced_by` 的样子、老记法照旧、pack）。全套：vitest 75 / 916；cargo 158 · 4。

#### P7-4 · AI 的「更正 / 取代」只算建议

- 提交：`6700c5f feat(mcp): AI 的「更正 / 取代」只算建议 —— …`
- 改了：`src-tauri/src/mcp.rs`
- 施工时定的：
  - `add_block` 带 `ref_kind`（`corrects` 或新接受的 `supersedes`）：块照常存、**身上一条关系都不带**，往 `supersede_proposals` 排一行（`suggested_kind` 记哪一种，`quote_stale` = 引文，`why` = `ref_note`，`quote_new` 空串）。参数名沿用 `corrected_quote`（老调用法照旧能用）；取代也要它，也要 `ref_note`（原来那道闸本来就要求非更正的引用给理由）。取代只许同一个项目（和 `propose_supersede` 一样）；更正照旧可以跨项目。
  - ⚠️ **偏离任务书一处**：引文闸用的是 `add_block` 一直用的那道（`check_quote_occurs`：在旧块正文或批注里一字不差），不是任务书写的 `api_engine::quote_passes`。理由：`quote_passes` 只看正文（引批注的老调用会失效，和「别让老调用法失效」冲突），而且放行「只差标点的重打」—— 那种引文到了「更正一处」那一下会写成一个画不出记号的准星。原来那道更严，没有放宽任何东西；它的输入照旧（`parse_corrected_quote` 原来就去首尾空白，没改）。
  - 回复的头一句：「存进 Spool 了，是〈Flux〉的 #24 块。对第 2 块的更正在 Spool 的待审里等用户点 —— 还没生效。」（取代那一句同理）；回复 JSON 带 `suggestion: {kind, old_block_seq, applied: false}`；`dry_run` 带 `would_suggest`。
  - `propose_supersede`：照旧排队，现在明写 `'supersedes'`；描述改成「在 Spool 的待审里等用户，用户在更正 / 取代 / 不动里选」，不再说 "that project's review screen"。
  - 路由文本：`INSTRUCTION_BODY` 讲更正的那一段、`OPENERS` 的「这条结论不对了」「这个名单整个重做了」两行改成「AI 自己选更正还是取代，两种都只是建议，用户在待审里定」；中英触发词没动；「改旧块的 gist」那句改成「等 get_blocks 看得到更正已经生效再改」（建议还没生效就改 gist 会让它和正文对不上）。工具还是 24 个，三道自动测试照过。
- 怎么验的：Rust 一条大测试替掉了原来那条「能更正、不能退役」（更正 ⇒ 块在、三列空、建议表一行 `corrects`、头一句不说「已更正」、pack 里旧块没被更正；取代 ⇒ 同理 `supersedes`、`why` = `ref_note`；只带引用 ⇒ 当场写；引文对不上 / 没给引文 / 取代没说为什么 / 取代跨项目 / 没说哪一块 / 不认识的关系 ⇒ 全拒、块数建议数都不变）；另两条老测试改成「用户点了更正之后」才断言更正的样子。真二进制探针对着真库副本：更正 ⇒ #24 存了、建议一行；取代 ⇒ #25；引用 ⇒ #26 当场带上引用；引文对不上 ⇒ 拒、什么都没存；`mcpWriteEnabled:false` ⇒ 两种都拒、一行没写。全套：vitest 75 / 916；cargo 158 · 4。

#### P7-5 · 待审面三选一；过期检测只放用户自己跑的

- 提交：`39e1aad feat(review): AI 的「更正 / 取代」建议进待审，三个按钮都能点（被占时「更正一处」灰掉并说清原因）；过期检测只放用户自己跑的`
- 改了：`src/lib/db/supersedeProposals.ts`、`src/lib/blocks/supersedeReview.ts`（新）、`src/stores/proposalsStore.ts`、`src/components/Review/ReviewPanel.tsx`、`src/stores/compressStore.ts`、`src/components/Compress/StaleReview.tsx`、`src/components/ThreadView/index.tsx`、`src/stores/outsideWrites.ts`、i18n、测试
- 施工时定的：
  - 按钮名用过期检测卡上同一件事已有的名字「更正一处」「整条取代」「不动」（任务书写的是「更正 / 取代」；`更正` 这个词字典里已经是名词 Correction，而且屏幕上一件事只许一个名字）。AI 建议的那个按钮高亮、带「（AI 建议）」，三个都能点。
  - 卡片：标题「Claude · MCP 建议：用第 20 块整条取代〈Flux〉里的第 4 块」/「…更正〈Flux〉里第 2 块的一处」；「旧的 ④ 开头一句」+「不再成立的那一句：「…」」；「新的 ⑳ 开头一句」（在别的项目时加「在〈X〉」）；「它说为什么」（有才显示）；被占时「更正一处」灰掉，下面一句「第 20 块已经在更正第 3 块了，一块只能更正一块；要更正这一块，让 AI 另写一块。」；底下一行说清三个按钮各做什么。
  - 已经做完的不再问（v32 记法已取代 / 老记法两半都成了 / 建议更正且已经更正着）；老记法只成一半、或新块只是引用着它 ⇒ 照样出现。一块被挪到别的项目，卡片照样出现（按块认，不按编号）。过期的在刷新时清掉。
  - 过期检测：`loadProposedStale` 整个拿掉，扫描也不再把 AI 提的并进来；页签只在扫出来的还没点完时出现。08-24 S2 的注释都改了。
- 怎么验的：真 SQLite 九条（待审数算上它、过期的不算；Flux #4 的形状「更正一处」点不了且说得出在更正谁、「整条取代」点得成且 #20 的更正还在；一块新的取代三块；三个按钮各自落库；做完的不再问、没做完的不许藏；删块 / 挪块）；把点击时那道「被占」检查拿掉，Flux 那条变红。过期检测那份测试改成只剩扫描的两条（AI 提的不再出现、扫描去重照旧）。`outsideWrites` 测试改成「AI 提了取代 ⇒ 待审数算上、过期检测不冒出来、在待审里点取代」。WKWebView 中英各渲了一遍两张卡；英文第一版按钮折行、引号是「」，改了。拿真库新导出的副本（只读 `VACUUM INTO`，在 vitest 里迁到 v32）跑：待审里正好一张卡「④ ← ⑳，建议取代，更正一处被 #3 占着」，点「整条取代」之后 #4 记着被 #20 取代、#20 仍在更正 #3。全套：vitest 76 / 915；cargo 158 · 4。

#### P7-6 · 图片：存进库、在块里显示

- 提交：`3a98c12 feat(images): 块里能放图片 —— …`
- 改了：`src-tauri/src/images.rs`（新）、`src-tauri/Cargo.toml` / `Cargo.lock`（`image` 0.25 只开 png/jpeg/gif/webp/tiff、`base64` 0.22；锁文件新增 `gif`、`image-webp`、`color_quant`）、`src-tauri/src/lib.rs`、`src-tauri/src/mcp.rs`（`new_id` 改成 crate 内可见）、`src/lib/db/blockImages.ts`（新）、`src/lib/db/blocks.ts`、`src/lib/undo/undoLog.ts`、`src/stores/undoStore.ts`、`src/stores/blocksStore.ts`、`src/lib/images/blockImageIo.ts`（新）、`src/components/ThreadView/BlockImages.tsx`（新）、`BlockItem.tsx`、i18n、测试
- 施工时定的：
  - **单张上限 20 MB**；解码时边长超过 20000 像素拒。PNG / JPEG / GIF / WebP 原样存；TIFF（Mac 剪贴板给的就是它）转成 PNG；HEIC 这类拒。拒的时候 Rust 回代号，界面说「这张图太大了（31.2 MB），一张最多 20 MB。」/「这不是能放进块里的图片（认 PNG、JPEG、GIF、WebP、TIFF）。」
  - 预览：长边超过 960 像素才缩（有透明的出 PNG，没有的出 JPEG 85），小图原样给（GIF 照样会动）；转 `data:` 给界面，一会话内缓存。点开看原图（原字节转 `data:`），点哪儿或 Esc 关。三个命令都是 async。**CSP 一个字没改。**
  - `image` 本来就在依赖图里（剪贴板插件带进来的，只开了 TIFF）；`cargo tree` 那条照样是空的。
  - **删块和撤销**：删块时图片行当场从库里删掉，同时在主窗内存里按块存一份（和撤销环一样，关了 Spool 就没了），`restoreBlock` 再放回去 —— 所以所有「删了又放回」的路（删块、撤销捕捉 / 新建、撤销复制、移动时删掉的重复块）都不用各自带着图。这样删掉的图不会留在库文件里被导出带走。内存里最多存 200 MB，超了先丢最早的。合并：被并掉那块的图挪到留下那块、排在它自己的后面，撤销各回原位；移块：块 id 不变，图自然跟着；复制到别的项目：在 SQL 里复制一份（新 id、同样的字节），撤销复制连图一起撤。
- 怎么验的：Rust 四条（四种格式原样存、TIFF 转 PNG；拒非图片、拒半截文件、拒太大；按顺序追加、字节逐个相等、是 BLOB、块不在就拒；预览缩图和小图原样）。TS 六条，用照插件真实行为写的适配器跑（读和顺序；删块 → 撤销 → 重做 → 再撤销，字节一个不差；撤销捕捉 / 重做；合并 + 撤销 + 重做；移块 + 撤销；复制 + 撤销）；把放回和复制那两句拿掉，三条变红。WKWebView 把真的块组件渲成「批注 + 正文 + 两张图」。全套：vitest 77 / 921；cargo 162 · 4。

#### P7-7 · 图片入口

- 提交：`e78dd13 feat(capture): 截完图直接双击 ⌥ 就能捕成图片块 …`
- **动手前查清的四件**（10-08，先告诉了 Ocean 再动手）：
  1. 这台 Mac：`com.apple.screencapture` 的 `target = file`，`location` 没设（= 桌面），`show-thumbnail` 没设（= 显示缩略图），macOS 26.5。`⌃⌘⇧3/4` 进剪贴板；`⌘⇧3/4` 在右下角缩略图消失后（约 5 秒）才写到桌面；`⌘⇧5` 看工具条自己的设置。
  2. 复制闸是 HID 层监听里的 ⌘C / ⌘X 按下；截图快捷键也是按下，同一个监听看得见 ⇒ 像 ⌘C 一样打开这道闸，同样 10 秒。局限：`⌘⇧5` 的工具条上停留超过 10 秒，闸就关了。
  3. 读桌面会弹一次「“Spool”想访问“桌面”文件夹中的文件」；Ocean 答「照做」。被拒时浮窗告诉他去「系统设置 → 隐私与安全性 → 文件和文件夹」打开。
  4. 「刚截的那张」= 截图文件夹里、带系统「这是截图」标记（`com.apple.metadata:kMDItemIsScreenCapture`，文件名会随语言变，标记不会）、并且是快捷键之后（留 2 秒余量）写出来的最新那张图。没写出来时每 150 毫秒看一次，最多等 8 秒，浮窗写「等截图存好… 右下角的小图消失之后就有了」；等不到就说怎么办。
- 改了：`src-tauri/src/double_tap.rs`、`src-tauri/src/images.rs`、`src-tauri/src/lib.rs`、`src/hooks/useCapture.ts`、`src/lib/capture/ingest.ts`、`src/lib/capture/overlayProtocol.ts`、`src/overlay/CaptureOverlay.tsx`、`src/overlay/db.ts`、`src/hooks/useOverlayDbHost.ts`、`src/lib/db/blockImages.ts`、`src/components/ThreadView/Composer.tsx`、`src/stores/draftStore.ts`、`src/hooks/useThreadDropTarget.ts`、`src/stores/blocksStore.ts`、`src/lib/images/blockImageIo.ts`、i18n、测试
- 施工时定的：
  - 双击 ⌥：截图快捷键打开的闸 ⇒ 存成文件的等文件、进剪贴板的先拿图；⌘C 打开的闸 ⇒ 照旧先拿字，没有字、剪贴板里是图片才捕图片。图片块没有正文，捕捉卡写「一张图片（1240×800）」，照 P3 那一套能写批注、能改投、能固定、Enter 完成；**改投时图片跟着到新项目**（浮窗那边先删后建，主窗把暂存的图挂到新块上）。存不进去时那一块撤掉，不留空块。
  - 主窗粘贴：在输入框里、或者焦点不在任何输入框时 ⌘V 图片 ⇒ 图片挂在输入框正在写的那一块上（上面一排小图，每张能 ×），回车和字一起存成一块；好几张就是一块里好几张。拖入：图片文件（PNG/JPEG/GIF/WebP/TIFF，HEIC 也认出来好告诉他放不进）一起拖进来 ⇒ 一块新块装着全部，别的文件照旧是项目文件。两种都能 ⌘Z；一张都没放进去也没有字 ⇒ 不留空块。
  - Windows（双击 Ctrl）：那边没有复制闸，触发从不带截图信息；捕捉时没有字就拿剪贴板里的图 ⇒ `Win+Shift+S`、`PrtScn`（进剪贴板）能捕。**`Win+PrtScn`（存成文件）没做**。本机编不了 Windows，只逐行看过（只用了跨平台的剪贴板读图；读截图文件夹那部分只在 Mac 上走）。
- 怎么验的：Rust：快捷键判断（⌘⇧3/4 文件、⌃ 剪贴板、⌘⇧5 工具条，⌘4 不算）、闸（截图和 ⌘C 同一个 10 秒、谁新算谁、边界）、挑「刚截的那张」（临时目录 + 真的写扩展属性：没标记的、不是图片的、快捷键之前的都不算，最新的胜出）。TS 五条（拖入的分拣；好几张进一块且能撤销；一张都没进去不留空块、有字留字；双击捕图片进捕捉项目、存不进去把块撤掉；输入框的图按项目存、发出去才清）。真截图 / 粘贴 / 拖入只能真手指（§6 第 5 条）。全套：vitest 78 / 926；cargo 165 · 4。

#### P7-8 · 图片进 pack / MCP

- 提交：`004e000 feat(pack): 带图的块在 pack 里多几行「image: 路径 (宽×高)」…`
- 改了：`src-tauri/src/images.rs`、`src-tauri/src/lib.rs`、`src-tauri/src/mcp.rs`、`src/lib/pack/assemble.ts`、`src/lib/pack/templates.ts`、`src/lib/pack/fixtures/golden-pack.json` / `.expected.txt`、`src/lib/pack/assemble.test.ts`、`src/lib/images/blockImageIo.ts`、`src/components/Pack/PackHost.tsx`、`PackDialog.tsx`、`WorkspacePackDialog.tsx`、`src/lib/pack/folder.ts`
- 施工时定的：
  - 那一行：块的来源行下面、批注上面，`    image: <完整路径> (1240×800)`，两个渲染器逐字一致（Ocean 10-08 选了完整路径；「pack 不带本机目录」那条规矩从此只管文件那一行，新加一条测试把两件事都钉住）。⛔ 字节不进 pack。
  - 放在哪：库文件旁边的 `image-cache/<图片 id>.<扩展名>`，随时能删、下次打 pack 自己再写。什么时候放：要用的时候（MCP 的 `get_pack` / `get_blocks`；界面上打开 pack 对话框、工作区导出时）没有才写。两边都从「打开的那个库文件」的真实路径推这个文件夹，保证两边写出来的路径一字不差。
  - 表头：**没加句子**。试过加三行，结果把固定表头推过了 `budgeted_pack_squeezes_extracts_and_range_keeps_pinned` 那条测试守着的预算底线（那条测试的注释写明「别再抬上限，那说明表头长过头了」）；`image: 路径 (宽×高)` 本身看得懂，和 P6-4 的 ` · on #12` 同一个决定。
  - `get_blocks`：带图的块多 `images: [{path, format, width, height, size_bytes}]`，描述补了一句。压缩 / 查过期送出去的 pack 不带图片行（它们只处理文字）。
- 怎么验的：golden 两边都过（夹具里置顶的 b1 一张、b5 两张；expected 只多了三行，时间戳没被重写）；TS 新一条（图片写完整路径、文件仍只写名字、不给图片就一行都没有）；Rust 一条（文件库里放一张真 PNG：`get_blocks` 的样子、放出来的那份和原字节相等、pack 那一行、没有字节）。真二进制探针：往 scratchpad 的真库副本里 Flux #26 塞一张真截图，`get_blocks` 给出 600×573、100808 字节和路径，pack 写出 `image: …/image-cache/probeimg1.png (600×573)`，那份文件和原图逐字节相等。全套：tsc 干净；vitest 78 / 927；cargo 167 · 4；sidecar 14；`(none missing)`；`--dead` 和开工时逐行一样；`cargo tree` 空；Rust 警告只有基线那三条。

#### 新发现（记在 HANDOFF §9.9，都是 captured，没修）

- `DISCOVERED-20261008-1` 把图片本身递给 AI（MCP 的图片内容类型）—— 任务书点名记成候选
- `DISCOVERED-20261008-2` 块里的一张图片没法单独去掉（只能删整块）
- `DISCOVERED-20261008-3` 截图那几处没覆盖到的：`⌘⇧5` 工具条停留超过 10 秒、HEIC、Windows 的 `Win+PrtScn`（存成文件）

#### 换装（Ocean 10-08 答「现在换装」）

- 构建：`004e000`（`src` / `src-tauri` / `site` / `scripts` 没有未提交改动），`env -u APPLE_ID -u APPLE_PASSWORD -u APPLE_TEAM_ID -u APPLE_API_KEY -u APPLE_API_ISSUER -u APPLE_API_KEY_PATH APPLE_SIGNING_IDENTITY="Developer ID Application: Hanze JIN (Q5Y5JRXZ58)" npm run tauri build -- --bundles app`，日志进文件；没改 `tauri.conf.json`，日志里是「skipping app notarization」。TSA 第一遍就过（主程序 11:45:27、`spool-ai` 11:45:26），没有 `timestamp was expected`；`--verify --deep --strict` 过；打出来的前端里有这一轮的新字（「等截图存好」「已被整条取代」「一张图片（」）。
- 装前：Developer ID、`spctl` = `Unnotarized Developer ID`、0.6.2、`spool` sha256 `42532bb3…`（P6 那版）；真库 v31 · 25 / 64 / 1073 / 12（工作区 / 项目 / 块 / 文件）· 正文 319509 · 批注 13111 · 文件正文 130320 · 摘要 863 · 取代建议 1 条，迁移快照 23 个，`mcp-clients.json` 18 行。
- 停：GUI 84732 + `--overlay` 84750 按 pid `kill -TERM`，3 秒内都退了、再查已不在；`--mcp` 子进程 9 个一个没碰（前后都是 9）。
- 真库备份：`~/Desktop/spool.before-p7-install-20261008-114601.db`（`VACUUM INTO`，integrity ok，v31，各表行数和几样总长与活库一致）。
- 旧包：`mv` 到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261008-114608-pre-p7.app`；新包 `ditto` 进 `/Applications`；`open --stdout … --stderr …` 起。
- 装后：`--verify --deep --strict` 过、Developer ID、`spctl` = `Unnotarized Developer ID`、identifier `com.oceanjin.spool`、0.6.2；`spool` sha256 `84004882…` 和构建产物一致；主进程 66334（11:46:08）、`--overlay` 66377（11:46:09）都起于换装之后，两个的 `lsof` txt inode 都是 77276508 = 新文件；stderr `[overlay] helper started`、`[double-tap] installed at HID/active`，没有 error / panic。
- 真库迁移（第一次启动时 GUI 自己做的）：`PRAGMA user_version` = 32、`integrity_check ok`；各表行数、正文 / 批注 / 文件正文 / 摘要总长和备份逐项一致；两列在、图片表在、是空的、索引在；真库目录里**正好多出一个**快照 `spool.pre-migration-v31-2026-10-08T10-46-09-515Z.db`（23 → 24）。
  ⚠️ 核对时看到 1 块已经「被取代」、取代建议 0 条：那是 11:46:21（启动后 12 秒）在待审里点了「整条取代」—— Flux #4 退役、记着被 #20 取代，#20 原来对 #3 的更正还在（§6 第 2 条要的样子），不是迁移写的（迁移只加列建表，不写数据）。
- `--mcp` 探针：拿新装的 `/Applications/Spool.app/Contents/MacOS/spool --mcp`，`SPOOL_DATA_DIR` 指向迁好之后的真库 `VACUUM INTO` 副本（scratchpad 里）：`initialize` 通、`tools/list` 24 个（`add_block` 的 `ref_kind` 是 `corrects` / `supersedes`）、`list_threads` 48 个项目 / 13 个工作区、`get_blocks` 里 Flux #4 带 `replaced_by: {seq: 20, …}`。没连真库目录，真库的 `mcp-clients.json` 前后都是 18 行。
- **`--mcp` 那 9 个子进程跑的还是旧二进制，而库已经是 v32 ⇒ 它们每一次调用都会报「库比服务新」**（别人家 AI 客户端起的，没杀）。Ocean 重启 Claude / Codex 之后就好；§6 开头那句提醒的就是这个。
- commit、build、换装分开记在上面；没 push、没发版。

#### Ocean 验收

**第一轮（10-08）**，七条，原话：

> 1.双击option之后需要有图片预览，不知道不知道存了什么图片；2.没用 Screenshot 2026-07-29 at 11.38.39 直接cmd c图片，再双击option并不能存，只存下了Screenshot 2026-07-29 at 11.38.39图片文件名；3.双击图片block需要可以直接进入编辑页面添加文字；4.编辑页面需要可以删除图片并且图片可以换行插入文字；5.图片需要可选包含注释，注释就用双击option之后输入的字6.点击进入图片后可以左右滑动浏览剩余图片，显示图片注释7.打包整个文件夹或者项目时需要带上项目的文件和图片，可选，默认带上（打包项目时出来一个md文件和其他文件+图片），保证用户上传打包文件夹到web ai也可以正常使用；

问了三件，答复记进 HANDOFF §9.2 第 48–50 条：第 4、5 条「图文混排，像写文档」；第 6 条「只翻这一块里的图」；第 7 条「先修 P7 的 1–6，P8 下一轮做」。

改了（三笔）：

- `1b46457` 图文混排（第 3、4、6 条，加上数据的样子）
  - 一张图是块正文里的一行 `![注释](spool-image:<图片 id>)`。库结构没改，图的字节照旧在 `block_images`。字可以在图前、图后、两张图中间。删掉那一行就是删掉那张图。
  - 块里在那一行的位置画图，最高 200px，注释在图下面。单击要等 0.25 秒才开大图，所以双击照旧进编辑面板（第 3 条）。
  - 编辑面板（第 4 条）：块里有图时，正文框变成「一段字、一张图、一段字…」。每张图是一张卡，有预览、注释框和 ×。
    - 点 × 之后按「完成」才真删，Esc 放弃。删掉的图出库，不进撤销，和改正文一样。
    - 标题 / 正文 / 斜体和「标为重点」只作用在光标所在的那一段字。
  - 大图（第 6 条）：可以用 ←/→、屏幕上的箭头或触控板左右划，只翻这一块里的图。每张带注释和「第几张 / 共几张」。
  - 这一轮之前存进来的块，图没有对应的行，就画在正文后面。打开编辑面板时会给它们补上行，但要改了字、按「完成」才写进库。
  - 顺带修了一处：复制到别的项目时，复制品的图有新 id，正文里那几行也跟着改。不然复制品上会显示「这张图已经不在了」。
  - 预览里图片行读作「[图片] 注释」。改到的地方有撤销提示、右栏 AI 活动、合并查重和搜索结果。
- `afe2f40` pack / MCP（第 4 条在 pack 里的那一半）
  - 每张图在它那一行的位置写成 `![注释](<完整路径>)`，取代 P7-8 的 `    image: <路径> (宽×高)`，宽×高不再写。
  - 正文没点名的图（旧块）跟在正文后面，写成 `![](<路径>)`。库里已经没有的那张写成 `![注释](image)`。
  - 两个渲染器逐字一致，golden 夹具补了这四种情况。
  - `get_blocks` 的正文同样换成路径；引用标签和摘要读作 `[image] 注释`。
  - 每个 MCP 工具的回复、prompt 和 resource 最后都过一道 `hide_image_ids`，内部 id 不出库。`get_blocks` 描述里的那一句也改了。
  - 压缩：送出去之前，图片行整行换成 ⟦Hn⟧ 占位符（和重点同一套），压完原样放回，写回库的还是原来那一行。没放回去的图单独报「有 N 张图片没能放回原来的位置」。
- `ee3f78e` 捕捉卡（第 1、2、5 条）
  - 第 1 条：捕到图片时，卡片上有缩略图（Rust 现缩，最长边 480），旁边写「一张图片（W×H）」。
  - 第 2 条的根因：在访达里 ⌘C 一个文件，剪贴板上是文件链接加文件名这段字，旧逻辑先拿了字。
    - 现在先读剪贴板里的文件，只认图片文件；别的文件照旧拿字。
    - 为此新加了 `arboard`。剪贴板插件本来就带着它，版本相同，Cargo.lock 没多出包，`cargo tree` 网络那条仍然是空的。Windows 那边同一个调用也有，但没编过。
  - 第 5 条：捕到一张图时，卡片上写的那句话就是这张图的注释，占位字改成「给这张图写一句注释…」。改投到别的项目时注释也带着。一次捕到好几张时，那句话照旧是批注。
  - 顺带：`images.rs` 一个测试里有原始零字节，整份文件在 grep 眼里是二进制。改成了转义写法，字节没变。
- 怎么验的
  - tsc 干净；vitest 80 / 946；cargo 169 · 4；sidecar 14；golden 两边都过。
  - i18n `(none missing)`，`--dead` 和开工时一样；`cargo tree` 网络那条是空的；CSP 没动。
  - 三笔里每一笔都在单独导出的树里跑过 tsc 和 vitest，第二笔还加跑了 cargo。
  - 需要真手指的部分（编辑面板、大图左右划、访达 ⌘C、捕捉卡缩略图）只能换装后验。
- 没做：第 7 条（并进 P8）。
- 换装（Ocean 10-08 答「现在换装」）
  - 构建：在 `32eff8e` 上构建，`src` / `src-tauri` / `site` / `scripts` 没有未提交改动。命令和 P7 那次一样，日志写进文件，日志里是「skipping app notarization」。
    - TSA 第一遍就过（主程序 16:13:27，`spool-ai` 16:13:26），`--verify --deep --strict` 也过。
    - 打出来的前端里有这一轮的新字（「在图后面写字」「给这张图写一句注释」「有 {n} 张图片没能放回原来的位置」）。
  - 装前：`spool` sha256 `84004882…`（P7 那版）。真库 v32，工作区 / 项目 / 块 / 文件 = 27 / 66 / 1078 / 12，图片 7 张（共 2912959 字节），正文 321773、批注 13113。迁移快照 24 个，`mcp-clients.json` 18 行。
  - 停：GUI 66334 和 `--overlay` 66377 按 pid `kill -TERM`，3 秒内都退了。`--mcp` 子进程 5 个一个没碰（前后都是 5）。
  - 真库备份：`~/Desktop/spool.before-p7r1-install-20261008-161358.db`（`VACUUM INTO`，integrity ok，各项和活库一致）。
  - 旧包挪到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261008-161405-pre-p7r1.app`，新包 `ditto` 进 `/Applications`，再用 `open --stdout … --stderr …` 启动。
  - 装后
    - `--verify --deep --strict` 过，Developer ID，`spctl` = `Unnotarized Developer ID`，版本 0.6.2。
    - `spool` sha256 `c9eec2d8…`，和构建产物一致。
    - 主进程 6078（16:14:05）和 `--overlay` 6089（16:14:06）的 `lsof` txt inode 都是 77318759，就是新文件。
    - stderr 里有 `[overlay] helper started` 和 `[double-tap] installed at HID/active`，没有 error / panic。
  - 真库：这一轮不改库结构，没有迁移。`user_version` 仍是 32，`integrity_check ok`，各项计数和总长和装前逐项一致，迁移快照仍是 24 个。
  - `--mcp` 探针：用新装的二进制，`SPOOL_DATA_DIR` 指向备份的 `VACUUM INTO` 副本（在 scratchpad 里）。在副本的 HAI-Lecture4 #27（6 张图）里写进两行图（第一行带注释），中间夹一行字。
    - `get_pack` 那一块是 `![第一张的注释](<路径>)`、`中间的字`、`![](<路径>)`，没点名的 4 张跟在后面；#26（旧块，1 张）的图跟在 `sss` 后面。
    - `get_pack`、`get_blocks`、`search_blocks` 三份回复里都没有 `spool-image`。
    - 放出来的图片文件和库里存的字节逐字节一致。
    - 真库目录的 `mcp-clients.json` 前后都是 18 行。
    - （探针第一遍是脚本写错了：zsh 数组从 1 开始，第一行的 id 变成空的。那一行于是不算图片行，兜底那一道把 `spool-image:` 换成了 `image`，这正是设计好的行为。）
  - 那 5 个 `--mcp` 子进程跑的还是旧二进制。库没变，所以不会报错，但它们打 pack 时会把图片行原样印出来。Ocean 重启 Claude / Codex 之后就是新版。
  - commit、build、换装分开记在上面；没 push、没发版。

**第二轮（10-09）**，原话：

> 截一张图（⌘⇧4），双击 ⌥出来的是![](spool-image RmdhmpfDAKDdfoUN22ND0)，不是预览图；在第 1 条那张卡上直接打一句话，按回车。看：主窗那一块里，这句话出现在图的下面，当这张图的注释。批注能写了，还需要能学图片的注释，给图片一个额外的注释，默认隐藏，需要展开。其他没问题

- 查出来的：主进程把捕捉卡的内容转给浮窗时，要先收进 `capture.rs` 的 `OverlayCapturePayload` 再原样发出去。我新加的 `image` 那一格（小图、几张、注释给哪一张）没在结构体里声明，半路就被丢了。
  - 于是卡片上没有小图，只显示原始的图片行；那句话也因为不知道是给哪张图的，存成了批注。
  - `copy_id` 上面那条注释早就写过这个坑。单元测试没测到，是因为它们只测到浮窗收到之后那一段。
- 问了一件（HANDOFF §9.2 第 51 条）：「默认隐藏、需要展开」指哪里？Ocean 选**卡片上收起**。
- 改了（`f291879`）
  - 结构体补上 `image`，加一条往返测试：图片卡的三样都在，文字卡不带这一格。
  - 卡片上那句话改回**批注**。批注框下面加一行「+ 图片注释」，点开才出一个单行框，只在一次捕到一张图时有。
  - 图片注释的保存和批注同一个出口：Enter、点外面、×、换一张卡都存；Esc 放弃；改投时写进新块的那一行。框里有字时卡片不会自己消失。
  - 卡片上万一收到原始图片行，也只显示「[图片]」。
- 怎么验的
  - tsc 干净；vitest 80 / 946；cargo 170 · 4（新加 1 条）；i18n `(none missing)`，`--dead` 和开工时一样；`cargo tree` 网络那条是空的。
  - 按 isolated-verify §43 单独起了 debug 版 `spool --overlay`（加 vite，不开库），喂它一张带图的卡，截到卡片上有小图、「一张图片（128×128）」、批注框和「+ 图片注释」。
  - 展开之后的样子、Enter 存不存得进去，要真手指验。截图时真 Spool（6078 / 6089）没被碰过。
- 换装（Ocean 10-09 答「现在换装」）
  - 构建：在 `b862b4e` 上构建，`src` / `src-tauri` / `site` / `scripts` 没有未提交改动，命令和上一轮一样。
    - TSA 第一遍就过（主程序、`spool-ai` 都是 00:22:29），`--verify --deep --strict` 也过。
    - 前端里有「+ 图片注释」，二进制里有 `captionFor`。
  - 停：GUI 6078 和 `--overlay` 6089 按 pid `kill -TERM`，3 秒内都退了。`--mcp` 子进程 9 个一个没碰（前后都是 9）。
  - 真库备份：`~/Desktop/spool.before-p7r2-install-20261009-002246.db`（`VACUUM INTO`）。和活库逐项一致：v32 · ok · 27 / 66 / 1082 / 12 · 图片 10 张。
  - 旧包挪到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261009-002253-pre-p7r2.app`，新包 `ditto` 进 `/Applications`，再 `open` 起来。
  - 装后
    - `--verify --deep --strict` 过，`spctl` = `Unnotarized Developer ID`。
    - `spool` sha256 `e8eecf70…`，和构建产物一致。
    - 主进程 96363（00:22:53）和 `--overlay` 96409（00:22:54）的 txt inode 都是 77548479，就是新文件。
    - stderr 里只有 `helper started` 和 `double-tap installed` 两行，没有 error / panic。
  - 真库：不改库结构，没有迁移。各项和装前逐项一致，快照仍是 24 个，`mcp-clients.json` 18 行。
  - 没 push、没发版。
