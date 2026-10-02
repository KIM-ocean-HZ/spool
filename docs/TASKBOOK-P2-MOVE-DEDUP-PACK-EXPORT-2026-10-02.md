# 产品任务书 P2 —— 单项目 pack 导出 .md、「移除引用」进撤销、更正卡说清已记着、批量复制可移动并查重

> **状态：ACTIVE —— 当前唯一可执行的产品任务书。**
>
> **唯一交付：** 下面 §3 的四条（B1–B4），按顺序做完、各自测试通过、各自一笔提交，并在 §7 写回执。
>
> **来历：** HANDOFF §9.3 路线图的 P2 段。P1 / P1B 已于 2026-10-01 / 10-02 由 Ocean 验收通过（两份任务书在
> `docs/archive/product-taskbooks/`）。Ocean 2026-10-02「验收通过，下发下一个任务」⇒ 按 HANDOFF §9.4 下发本段。
> 四条正文从 HANDOFF §9.5 **搬过来**（HANDOFF 那边只留一行「已下发到 …」）；两条旧余项的原文从归档交接单搬过来。
> **每一条都对着 `8d74916` 的代码重核过**，和原文对不上的地方已在「现在」一栏更正并注明。
>
> **授权来源：** Ocean 2026-09-30 指令「恢复 app 层面的修复与改善」+ 同日对十条的逐条拍板（HANDOFF §9.2，第 2、3、18 条）；
> 本任务书只引用、不改。
>
> **边界：** 只做这四条。不碰实验线（`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、
> `docs/README.md` 里研究那几行）；不动 `docs/EXECUTION_POLICY.md`；**不改库结构**（四条都不需要）；不加 MCP 工具、不改 pack 的输出；
> 不 push、不发版。换装给 Ocean 验收之前先问一句（§5）。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：首屏、§9.0–§9.4、§9.8–§9.9、§10.6（红线速查，尤其工程护栏里「重复度探针必须走 `find_similar_blocks`」那一行）。
3. `CLAUDE.md` §3（只改该改的）和 §5（提交信息里不许有任何工具署名）。
4. 上一份任务书的回执：`docs/archive/product-taskbooks/TASKBOOK-P1B-ARCHIVE-PROJECT-FIND-2026-10-01.md` §7（撤销环加一种类型的做法，B2 / B4 照着来）。
5. 记忆 `tauri-sync-commands-freeze-ui`（新 Tauri 命令一律 `(async)`）、`ui-language-follows-system`、`no-test-environment-spool`、
   `isolated-verify-workflow`（只有 §5 换装才需要）。
6. 每一条开工前，读该条「现在」一栏点名的文件。

## 2. 起点

- 分支：本地 `main`。开工时 `git log -1` 应该是下发本任务书的那笔 docs 提交（标题以 `docs: 下发 P2` 开头），它的上一笔是 `8d74916`；
  之后只多了 docs 提交也行。不是就停下来说明。
- ⚠️ 工作树里有**别人没提交的改动**（`docs/` 下研究线的文件、`docs/README.md` 里研究那几行）。**只 `git add` 你自己改的文件的路径**，
  绝不 `git add -A` / `git add .` / `git commit -a`。README 要改的话只暂存自己那一行（P1 / P1B 回执里那个办法：HEAD 版本只换那一行，
  `git hash-object -w` + `git update-index --cacheinfo`）。
- ⚠️ **删文件会被权限拦**：`git rm` 写给 Ocean，请他在输入框里用 `! git rm …` 跑，别绕路。`git mv` 两次都能自己跑（记忆 `file-deletion-needs-ocean`）。
- 每条一笔提交，提交信息用中文、一行标题 + 可选正文。提交后跑 `CLAUDE.md` §5 那条自查；命中产品内容里的 claude 字样按记忆
  `attribution-grep-false-positive` 复核。
- 测试基线（`8d74916` 上实测，开工前先跑一遍对一下，做完每条再跑）：

```bash
npx tsc -b                                                # 干净
npx vitest run                                            # 65 个文件 / 829 条全过
cargo test --manifest-path src-tauri/Cargo.toml           # 141 过 · 4 跳过
cargo test --manifest-path src-tauri/sidecar/Cargo.toml   # 14 过
node scripts/i18n-check.mjs                               # (none missing) —— 这一条也在 vitest 里
node scripts/i18n-check.mjs --dead                        # 87 条 DEAD（基线噪声，DISCOVERED-20261001-2），只看你造出来的
```

Vitest 输出里有 31 行 `[db] pre-migration backup FAILED … window is not defined`，是老噪声，基线就有，不用管。

## 3. 四条

### B1 · 单个项目的 pack 导出成 .md，留一个复制键（原 DISCOVERED-20260930-7）

- 路线：P · 小功能 · 状态：approved
- 来源：「把单一工作区的 pack 也做成导出为 .md 文件，不再是复制到剪切板，服务于下面的第 8 条，附加文件。」
  + 09-30 答复「导出 .md 为主，留一个复制按键」（「工作区」= 项目，§9.2 第 2 条）。
- 现在（`8d74916`）：
  - `src/components/Pack/PackDialog.tsx:108` `onCopy` 是 `writeText(text)`，这是单项目 pack 唯一的出口。
  - 工作区 pack 走 `WorkspacePackHost` → Rust `write_pack_folder`（`src-tauri/src/pack.rs:63`，`(async)`；只新建目录、从不写进已有目录，
    路径段在 Rust 里再核一遍）。
  - 系统存储对话框已经有人在用：`src/components/Settings/LibraryTransfer.tsx:51` 的 `save(...)` + Rust `export_library`
    （`src-tauri/src/transfer.rs:72`，`(async)`；`clear_export_target` 先拒绝写进 Spool 自己的数据目录，再替换对话框已经问过的同名文件）。
    权限 `dialog:allow-save` 已在 `src-tauri/capabilities/default.json`。
- 要做：
  1. 主按钮「导出 .md」：系统存储对话框，默认文件名 = 项目名 + 日期（项目名里不能进文件名的字符替换掉；空标题用「无标题」那一套）。
  2. 旁边一个次要的「复制」键，保留原来的行为。
  3. 写文件走一个**新的 Rust 命令**（同 `pack.rs` 的理由：不给前端开全盘写权限），`#[tauri::command(async)]`，只写对话框返回的那一个路径；
     照 `export_library` 先拒绝 Spool 数据目录；覆盖不覆盖交给系统对话框自己的确认。
  4. 写进去的内容和「复制」出去的**逐字节一样**（同一个 `text`，Rust 一个字节不改，不加 BOM、不改换行）。
- 和 P8 的关系：块能挂文件以后，这里变成「有文件就导出文件夹（pack.md + 文件），没有就单个 .md」。**这一步只做纯 .md。**
- 不做：工作区 pack 不动；MCP 的 `get_pack` 不动；pack 的内容不动。
- 验收：① Rust 单测：写进去再读出来逐字节相等（含中文、`\r\n`、结尾无换行三种）、拒绝数据目录；
  ② 导出的 .md 和「复制」出去的文本逐字节一致；③ `assemble.test.ts` 的 golden 照旧过；④ 英文界面下按钮、对话框标题是英文。

### B2 · 「移除引用」进撤销环（原 `DISCOVERED-20260830-20`）

- 路线：P · 非阻断 bug · 严重度 P2 · 状态：approved（Ocean 09-30「全部批准」，§9.2 第 18 条）
- 原文（`docs/archive/HANDOFF-2026-08-30.md` §4.2）：「『移除引用』这个动作**没有 undo**：`clearSupersession` 把关系清掉之后，
  `ref_note` / `corrected_quote` 也一起没了（那两个字段属于那条关系），⛔ 撤销不回来。⚠️ 同一屏上『不作数』是个可逆开关、删块进 undo 环，
  只有这一个动作是单向的。要不要给它进 undo 环，等你说」。
- 现在（`8d74916`，⚠️ 和原文有出入，以这里为准）：
  - 唯一入口：`src/components/ThreadView/RefReviewActions.tsx:126–139`（被引的块退役之后，引用方块下面那三个动作之一）→
    `blocksStore.clearSupersession`（`src/stores/blocksStore.ts:436`）→ `setBlockSupersession(id, null, null, now)`（`src/lib/db/blocks.ts:874`）。
  - 清掉的是 `ref_block_id`、`ref_kind`、`ref_reviewed_stale_at`，以及 `corrected_quote`（`kind` 不是 `corrects` 就清）。
    ⚠️ **`ref_note` 现在不清**（原文说它也没了，已不成立）—— 它留在行上。
  - 仍然**没有** `pushUndo`，⌘Z 拿不回来 —— 原文这一半成立。
  - `BlockItem.tsx:1275` 那条「取消更正」以前也走 `clearSupersession`，现在改成删整块、走普通删除进撤销栈，不在本条范围。
- 要做：
  1. 加一种撤销类型（名字施工时定，例 `ref_remove`），payload 记下清掉之前的 `refBlockId` / `refKind` / `correctedQuote` / `refReviewedStaleAt`
     和所在项目；撤回 = 原样写回这四个字段；重做 = 再清一次。`affectedBlockIds = [引用方块]`（之后改了这一块就作废，和别的类型一样）。
  2. ⚠️ 加一种撤销类型要动的地方（P1B 回执里走过一遍）：`UndoOpKind` + payload、builder、`reverseAndBuildRedo`（redo 也要能再做一遍）、
     `threadIdForEntry` / `previewForEntry`（switch 穷尽，TS 会逼你）、`refreshAfterUndoRedo`（这一块所在项目的块 + 入向边要刷，
     `clearSupersession` 里那句 `refreshIncomingFor` 是现成的样子）、`UNDO_OP_LABEL` 加一个动作名 ——
     ⚠️ 那张表的值是经 `tr()` 现翻的，`i18n-check` **看不见**常量表，字典里那一条要手动加、手动核。
  3. 写回的那一下**不能**顺手改目标块的退役状态（`clearSupersession` 本来就故意不碰，撤回也不碰）。
- 不做：不改「移除引用」本身的语义；不动另外两个动作（保留为历史引用 / 改引当前块）。
- 验收：① 真 SQLite 单测（`undoStore.test.ts` 那一套）：移除 → ⌘Z ⇒ 四个字段和移除前逐一相等；重做 ⇒ 又清掉；
  ② 手指：在一条「引的这一块已经不作数了」下点「移除引用」，按 ⌘Z ⇒ 那条引用回来，撤销浮窗上的动作名中英都对。

### B3 · 「更正一处」那张卡说清「库里已经记着更正了」（原 `DISCOVERED-20260829-14`）

- 路线：P · 小功能 / UI · 严重度 P3 · 状态：approved（同上）
- 原文（`docs/archive/HANDOFF-2026-08-29.md`）：过滤放行之后，库里已经有 `corrects` 的那一对块会出现在「过期检测」上，而卡片上三个按钮的说明
  是按「这一对还没有任何关系」写的 ⇒ 点那个按钮对这两条几乎是空操作：关系已经是 `corrects` 了，只会把引文重写一遍。要退役旧块得点「整条取代」。
  「正是 T2 当初要躲的那个形状 ——『要求用户批准一件他已经批准过的事』。⚠️ 这次的区别是**另外两个按钮不是空操作**，所以这一条是措辞问题，
  不是要不要显示的问题。」建议：最小做法是卡片上加一行「库里已经记着 #N 更正了 #M」；验收标准：库里已有 `corrects` 的那一条，
  卡片上能看出那个按钮不会带来变化。
- 现在（`8d74916`）：
  - 原文里的按钮名「合并」已于 08-30 改成「更正一处」（Ocean 拍板，`DISCOVERED-20260829-15`），其余**仍然成立**。
  - 卡片在 `src/components/Compress/StaleReview.tsx:150–244`：三个 `Choice`，「更正一处」的 `hint` 写的是「两块都留着，只在 #n 上记一句
    『它更正了 #m』……」，不看这一对现在是什么关系。
  - 放行在 `src/stores/compressStore.ts` 的 `loadProposedStale`（`:1043` 起那段注释：已经带 `corrects` 的那一对**故意**放行，
    理由在 `src/lib/blocks/staleGuards.ts`）——**这一层不动**。
- 要做：
  1. 卡片上能判断出「新块已经以 `corrects` 指着旧块」时（看 store 里两块的 `refBlockId` / `refKind`，⛔ 不另查库），在两句引文下面加一行，
     草稿：「库里已经记着 #{n} 更正了 #{m}。再点『更正一处』只会把引文重写一遍；想让 #{m} 不再进打包，点『整条取代』。」
     「更正一处」那个按钮的 `hint` 跟着换成同一个意思。⚠️ **措辞是草稿，Ocean 验收时可改**（原文写明要他定措辞；界面上这件事只许有一个名字 ——
     用「更正」，不用「合并」）。
  2. 中英一起写，走 `t()`。
- 不做：不改放行规则；不改三个按钮的动作；不隐藏那个按钮（原文：这是措辞问题，不是要不要显示的问题）。
- 验收：① 组件或纯函数测试：已有 `corrects` 的一对 ⇒ 那一行出现；没有关系的一对 ⇒ 不出现；
  ② 英文界面下这一行是英文。

### B4 · 批量「复制到」→ 可以变成「移动」，并且查重（原 DISCOVERED-20260930-6）

- 路线：P · 小功能 · 状态：approved（Ocean 09-30）
- 来源：「把 blocks 批量转移到新工作区时需要提示用户是否删除原工作区的 blocks，并且新工作区如果有重复 blocks，需要提示用户，
  并且在建议被采纳后帮助用户删除。」（「工作区」= 项目，Ocean 09-30 确认）
- 现在（`8d74916`，⚠️ 第三、四、五点是这次重核新补的）：
  - 多选后浮条上的「复制到…」（`src/components/ThreadView/MergeToolbar.tsx:88` `handleForward`）→ `blocksStore.forwardToThread`
    （`src/stores/blocksStore.ts:676`）：只复制、原块不动、不查重；复制品是新 id、`created_at` 从现在起（排到目标底部），
    其余字段原样（含 `ref_block_id`）；文件不跟着走（v15 起有意如此）。撤销类型 `forward`：撤回只删复制品。
  - 查重那一套在 Rust：`find_similar_blocks_json`（`src-tauri/src/mcp.rs:2026`；字符三元组 Jaccard，`SIMILAR_THRESHOLD = 0.6`，
    只看 `kind = 'text'` 的正文），GUI 已经通过 `compress_duplicate_probe`（`src-tauri/src/api_engine.rs:489`）在用。
    ⚠️ **它只在一个范围里自己跟自己分组**（一个项目 / 一个工作区 / 全库，扫描上限 1000 块），**没有「这几块对那个项目」的问法**。
    ⇒ 要加一个新的 Rust 命令，**复用同一套** `trigram_set` / `jaccard` / `SIMILAR_THRESHOLD`（`mcp.rs:2001–2024`），
    ⛔ 不许在 TS 里另写相似度或「相同」的判断（§10.6 工程护栏）。新命令 `#[tauri::command(async)]`。
  - **批量删除今天是一块一条撤销**（`MergeToolbar.tsx:74` `handleDelete`，确认文案就写着「⌘Z 可逐个撤回」），而**撤销环只装 10 条**
    （`src/lib/undo/undoLog.ts` `CAPACITY = 10`）⇒ 用「复制 + 删原块」的办法移动超过 10 块，⌘Z 撤不全。
  - **块编号 `seq` 按项目唯一**（`schema.sql:315–324`，`UNIQUE(thread_id, seq)`，`MAX(seq)+1` 分配）⇒ 「直接改 `thread_id`」那条路
    必须在目标项目里重新分配编号（块的 #n 会变），撤回时原项目里的旧编号可能已经被新块占了（原项目最大那一块被移走后，下一块新捕捉会拿到同一个号）。
  - 「被别的块引用着」：`blocksStore.incomingByBlock`（一次 `load` 已经把整个项目的入向边取回来，`listIncomingRefsForTargets`）。
- 要做：
  1. **复制之前先查重**：目标项目里和选中块正文相同的，默认跳过（效果等于「复制完再帮你删掉重复的那份」，但不用先写再删）；
     相似但不完全一样的列出来，一条一条让人选「跳过 / 照样复制」。「相同」「相似」都由新的 Rust 命令判（「相同」= 正文逐字相同，施工时可定
     是否先去首尾空白，写进回执）。
  2. **复制完问一句**：「原项目里的这 N 块要删掉吗？（删掉就等于移动）」[删掉原块] [两边都留]。删掉能 ⌘Z 撤回。
  3. 原块里有被别的块引用或更正着的（别的块的 `ref_block_id` 指着它），删之前说清「其中 m 块被别的块引用着，删掉后那些引用会指向一块不存在的块」，
     给「只删没被引用的」这一档。
  4. **两种做法选一种，写进回执再选，不要两种都做**：
     - 甲「复制 + 删原块」：复制品是新 id ⇒ 指着原块的引用会断（所以有第 3 条）；删除要**整批一条撤销**才能 ⌘Z 一次撤回、不受 10 条上限所限
       （加一种撤销类型，或者把 `forward` 和删除合成一条，施工时定）。
     - 乙「移动直接改 `thread_id`」：id 不变、引用不断（第 3 条的提示就不需要了）；要处理编号重分配和撤回时的编号冲突（见「现在」第四点），
       还要定 `created_at` 留原值（排进目标时间线中间）还是改成现在（排到底部）。
  5. 结果提示说清跳过了几块、复制 / 移动了几块，中英都写。
- 不做：文件不跟着走（v15 的决定不变）；不碰内容页「合并」（`mergeBlocks`）；不加 MCP 工具（新命令是给界面用的 Tauri 命令，不进 `mcp.rs` 的工具表）。
- 工程护栏：查重**必须**走 Rust 那一套；新命令 `(async)`；跨项目引用、更正关系的写法不许绕开 `setBlockSupersession`。
- 验收：① 选 3 块复制到一个已经有其中 1 块的项目 ⇒ 提示「1 块重复，已跳过」，目标里只多 2 块；
  ② 复制完选「删掉原块」（或乙方案的「移动」）⇒ 原项目里这 3 块没了，**按一次 ⌘Z 全部回来**；
  ③ 甲方案：选中的块里有一块被别处引用 ⇒ 删之前看得到提示，「只删没被引用的」那一档管用；
  ④ Rust 单测：相同 / 相似 / 不相似三种，阈值和 `find_similar_blocks` 是同一个常量。

## 4. 什么时候停下来问

- 起点不是 §2 写的那样；
- 某条做下去要改库结构、加 MCP 工具、改 pack 输出、或碰捕捉浮窗（`UNDO_OP_LABEL` 加一行除外）—— 这四条都不该需要，需要了就说明任务书漏算了什么；
- 发现和 §3 描述对不上的现状（代码已经变了）；
- 要删文件（请 Ocean 跑，见 §2）；
- B4 第 4 条两种做法各有代价、比较完拿不定 —— 把比较写清楚问 Ocean，别两种都做；
- 发现新问题：**不顺手修**，按 HANDOFF §8 的 DISCOVERED 格式记进 HANDOFF §9.9，继续做本任务。

## 5. 做完四条之后：换装给 Ocean 验收（先问）

- 四条都提交、全部测试通过之后，**先问 Ocean「现在换装吗」**，得到同意再做。
- 照 P1B 回执「换装」那一段（每一步都写了命令和核对项），要点：
  - 先看现装的签名（现在是 Developer ID ⇒ 构建时 `APPLE_SIGNING_IDENTITY` 走环境变量，不改 `tauri.conf.json`，公证变量全部 unset）；
  - 构建日志重定向到文件；TSA 偶发失败（`A timestamp was expected but was not found`）就整个重跑 —— P1B 那次第一遍就是这样；
  - 停 GUI 和 `--overlay` **按 pid**，杀完再查一遍还在不在（记忆 `isolated-verify-workflow` §40–§41）；`--mcp` 一个都不碰；
  - 换装前 `VACUUM INTO` 备份真库到桌面（文件名带日期）；旧包 `mv` 进 `~/Desktop/Spool/spool-pre-install/`，别删；
  - 换装后核：sha256 和构建产物一致、进程启动时间在换装之后、stderr 有 `[double-tap] installed at HID/active`、真库版本和计数前后一致。
- 这一批不改库结构，真库不会迁移。commit、build、换装分开记在回执里；**不 push、不发版**。

## 6. 给 Ocean 的验收单（大白话，换装后给 Ocean）

1. 打开一个项目，点「打包」⇒ 主按钮是「导出 .md」，旁边有个小一点的「复制」。点导出，存到桌面 ⇒ 打开那个文件，和点「复制」粘出来的一模一样。
2. 找一条「引的这一块已经不作数了」的块，点「移除引用」⇒ 引用没了；按 ⌘Z ⇒ 引用回来，右下角提示写的是撤销了「移除引用」（或施工时定的名字）。
3. 「过期检测」里如果有一条两块之间已经记着更正的，卡片上会多一行说「库里已经记着 #N 更正了 #M」。这一行的说法你觉得不顺就直接告诉我怎么改。
4. 在一个项目里选 3 块，「复制到…」一个已经有其中 1 块的项目 ⇒ 提示 1 块重复、跳过了；去目标项目看，只多了 2 块。
5. 复制完选「删掉原块」（或「移动」）⇒ 原项目里那 3 块没了；按一次 ⌘Z ⇒ 全部回来。
6. 界面切成英文，第 1–5 条里看到的新字看一眼 ⇒ 都是英文。

你只要告诉我：这六条里哪几条不对，不对的那条你看到了什么。

## 7. 回执（执行窗填写）

每条一小段：

- 提交：`<hash> <标题>`
- 改了哪些文件（一行一个）
- 怎么验的：命令 + 结果（vitest / cargo 的条数，i18n-check 的输出原文）
- 施工时自己定的（B1 文件名规则；B2 撤销类型名；B3 最后的措辞；B4 选了甲还是乙、为什么，「相同」怎么定）
- 还差什么、有没有偏离本任务书、新发现记在 HANDOFF 哪里

最后一段：换装（做了没有、装的是哪个 commit、`spctl` 结果、真库备份文件名）、Ocean 验收（还没有就写「待验收」）。

## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 验收`（Ocean 验过后改成 `COMPLETE`），`git mv` 进 `docs/archive/product-taskbooks/`。
2. `docs/HANDOFF-2026-09-04.md`：§9.3 路线图 P2 那一行改成「已完成，任务书在 archive/product-taskbooks/…」；
   §9.8「唯一下一步」改成「按 §9.4 下发 P3」；`docs/README.md` 入口表里 ACTIVE 产品任务书那一行改成「暂无，待下发 P3」（README 只暂存这一行）。
3. 这些文档改动单独一笔提交（同样只 add 自己改的路径）。
