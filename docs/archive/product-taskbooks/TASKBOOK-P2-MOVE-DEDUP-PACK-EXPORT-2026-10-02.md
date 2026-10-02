# 产品任务书 P2 —— 单项目 pack 导出 .md、「移除引用」进撤销、更正卡说清已记着、批量复制可移动并查重

> **状态：COMPLETE —— 待 Ocean 验收。**（B1–B4 已提交 `39b267f` `bf1ae8e` `1de95cf` `cb6ba57`，已换装；回执在 §7）
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

### 回执（执行窗 2026-10-02 填）

**开工**：`git log -1` = `6cbd91c`（上一笔 `8d74916`），符合 §2。基线和 §2 一致：`tsc -b` 干净；Vitest 65 文件 / 829；主 crate 141 过 · 4 跳过；
sidecar 14；`i18n-check` → `(none missing)`；`--dead` 87 条。之后每条做完都跑全套，`--dead` 每次都和基线**逐行**比（`diff` 无输出）。

**B1 · 单项目 pack 导出 .md**
- 提交：`39b267f feat(pack): 单个项目的 pack 导出成 .md —— 主按钮「导出 .md」走系统存储对话框，旁边留一个小的「复制」`
- 文件：
  - `src-tauri/src/pack.rs`（新命令 `write_pack_file`，`(async)`；`write_pack_file_to` + 2 条测试）
  - `src-tauri/src/transfer.rs`（`data_dir`、`clear_export_target` 改成 `pub(crate)` —— pack.rs 用的是 `export_library` **同一道闸**，不是抄一份）
  - `src-tauri/src/lib.rs`（注册）
  - `src/components/Pack/PackDialog.tsx`（主按钮「导出 .md」+ 小的「复制」）
  - `src/lib/i18n/index.ts`（+3 条；「复制到剪贴板」随按钮改名成了孤儿，删掉）
- 验：`tsc -b` 干净；Vitest 65 / 829（`assemble.test.ts` golden 照旧过）；主 crate 143 · 4 跳过（+2：`a_pack_file_reads_back_byte_for_byte` —— 中文、`\r\n`、结尾无换行三种，
  外加覆盖已有文件；`a_pack_file_is_never_written_into_the_data_dir` —— 拒绝、而且被拒时数据目录里同名文件一个字节没动）；sidecar 14；`(none missing)`；`--dead` 与基线相同。
- 施工时自己定的：
  - **文件名** = `sanitizeFolderName(项目名, t('无标题'))` + `-YYYYMMDD.md`（例 `申请规划-20261002.md`）。用的是工作区导出里「用户自己起的名字」那一套清洗：
    只换掉 `/ \ :` 和控制字符、去首尾的点和空白，空格和中文都保留；空标题跟界面语言（无标题 / Untitled）。日期写法同工作区导出文件夹（`spool-…-20261002`）。
  - 覆盖已有文件：先过 `clear_export_target`（先拒数据目录，再删掉对话框已经问过的同名文件），再 `fs::write`，和 `export_library` 同一个顺序。
  - 导出成功：按钮变成「✓ 已导出」1.5 秒（和「复制」同一种反馈），对话框不关 —— 方便接着点「复制」对一下。失败：底栏左边那行换成「没导出成，换个位置再试一次」，
    原始错误进控制台（Rust 的报错是中文，不直接给英文界面看）。
  - 存储对话框的标题传了 `t('导出 .md')`。⚠️ macOS 存储面板以 sheet 形式出现时不一定显示标题，以实机为准。
  - 对话框副标题「纯本地组装 · 直接粘贴给 AI 即可」没动（任务书没要求）。
- 偏离：无。pack 内容、工作区 pack、MCP `get_pack` 都没动。验收 ②「导出的和复制的逐字节一致」靠结构保证（两个出口拿的是同一个 `text`，Rust 原样写）+ 上面的单测；真机核对是 §6 第 1 条。

**B2 · 「移除引用」进撤销环**
- 提交：`bf1ae8e feat(undo): 「移除引用」进撤销环 —— ⌘Z 把引用方那一行的四个字段原样写回，重做再清一次`
- 文件：
  - `src/lib/undo/undoLog.ts`（新类型 `ref_remove` + `RefRemovePayload`）
  - `src/stores/undoStore.ts`（builder、`threadIdForEntry` / `previewForEntry`、`reverseAndBuildRedo`）
  - `src/lib/db/blocks.ts`（新 `restoreRefFields`：只写引用方这一行的四个字段）
  - `src/stores/blocksStore.ts`（`clearSupersession`：清之前从库里读这一行，清完 push 撤销）
  - `src/hooks/useUndo.ts`（`refreshAfterUndoRedo`：引用方项目 `load`，引用方和被引方两个项目 `reloadIncoming`）
  - `src/overlay/CaptureOverlay.tsx`（`UNDO_OP_LABEL` 加 `ref_remove: '移除引用'`）
  - `src/stores/undoStore.test.ts`（+2 条真 SQLite）
- 验：`tsc -b` 干净；Vitest 65 / 831（+2：`corrects` + 引文 + 已审过 + 被引块已退役的一对，移除 → ⌘Z ⇒ 引用方**整行**和移除前相等、被引块整行三步都不变，重做 ⇒ 又清掉；
  普通引用撤回后还是普通引用）；主 crate 143 · 4；sidecar 14；`(none missing)`；`--dead` 与基线相同。
- 施工时自己定的：类型名 `ref_remove`。撤销浮窗上的动作名用现成的「移除引用」（英文 `Remove the citation`）—— 按钮本身就用这个键，字典里早就有，这次不用手加。
  撤回**不走** `setBlockSupersession`（它在 `supersedes` 时会顺手退役目标、还会无条件清掉 `ref_reviewed_stale_at`），另写了只动这一行的 `restoreRefFields`；
  重做走 `setBlockSupersession(id, null, null)`，和按钮同一条路。`clearSupersession` 里「原来指着谁」从读 store 改成读库，撤回要写回的四个字段以库为准。
- 偏离：无。另外两个动作、「移除引用」本身的语义都没动。

**B3 · 更正卡说清已记着**
- 提交：`1de95cf feat(stale): 「过期检测」卡片说清「库里已经记着更正了」—— 已是 corrects 的那一对，引文下面多一行、「更正一处」的提示跟着换`
- 文件：`src/lib/blocks/staleGuards.ts`（新 `alreadyCorrects`）、`src/lib/blocks/staleGuards.test.ts`（+4 条）、`src/components/Compress/StaleReview.tsx`、`src/lib/i18n/index.ts`
- 验：`tsc -b` 干净；Vitest 65 / 835（+4：已有 `corrects` ⇒ 出现；没关系 ⇒ 不出现；`supersedes` / 普通引用 / `corrects` 指着别处 ⇒ 不出现；块还没读进来 ⇒ 不出现）；
  主 crate 143 · 4；sidecar 14；`(none missing)`；`--dead` 与基线相同。
- 最后的措辞（**草稿，等 Ocean 定**）：「库里已经记着 #{n} 更正了 #{m}。再点「更正一处」只会把引文重写一遍；想让 #{m} 不再进打包，点「整条取代」。」
  英文 `The library already records #{n} correcting #{m}. Clicking “Correct one point” again only rewrites the quote; to keep #{m} out of packs, click “Replace in full”.`
  引文下面那一行和「更正一处」按钮的悬停提示用的是**同一句**（一个键），只在这一条还没决定时出现。判断只看 store 里两块（`useBlocksStore.byThread[项目]`，按 `#n` 找），不另查库。
- 偏离：无。放行规则、三个按钮的动作都没动，按钮也没藏。

**B4 · 批量复制可移动并查重**
- 提交：`cb6ba57 feat(forward): 批量「复制到…」先查重，复制完可以变成移动 —— 相同的跳过、相似的逐条选，「删掉原块」是真移动、⌘Z 一次撤回`
- **选了乙**。比较完把两边的好处 / 代价写给 Ocean，他 10-02 选了「乙 · 真移动」。要点：甲删掉的是原块、留下的是复制品 —— 真库（只读查）**23 块**被别的块引用着，删了引用就断；
  **34 块**压缩过，复制品按设计不带压缩前原文，原块一删原文就没了；「已审过」记号也不跟着复制。乙搬过去的还是原来那一块，这三样都跟着走；代价是施工多（编号重分配、撤回撞号、
  整条取代提案对不上项目）。
- 文件：
  - `src-tauri/src/mcp.rs`（`ForwardDuplicate` + `forward_duplicates`，紧挨 `find_similar_blocks_json`，复用 `trigram_set` / `jaccard` / `SIMILAR_THRESHOLD`；**不进** MCP 工具表；+1 条测试）
  - `src-tauri/src/api_engine.rs`（新命令 `forward_duplicate_check`，`(async)`，放在 `compress_duplicate_probe` 旁边，只开库）、`src-tauri/src/lib.rs`（注册）
  - `src/components/ThreadView/MergeToolbar.tsx`（查重 → 相似的逐条选 → 复制 → 问「删掉原块 / 只删没被引用的 / 两边都留」）
  - `src/stores/blocksStore.ts`（`forwardToThread` 改为返回「复制品 ← 原块」对照；新 `moveForwarded`）
  - `src/lib/db/blocks.ts`（新 `moveBlock`：只改 `thread_id` / `seq` / `created_at`，号被占就拿 MAX+1）
  - `src/lib/undo/undoLog.ts`、`src/stores/undoStore.ts`、`src/hooks/useUndo.ts`、`src/overlay/CaptureOverlay.tsx`（新撤销类型 `move`，动作名「移动」——
    `UNDO_OP_LABEL` 的值 i18n-check 看不见，`'移动': 'Move'` 是手加、手核的）
  - `src/lib/db/supersedeProposals.ts`（见下面「跟着改的一处」）、`src/lib/i18n/index.ts`（+19 条）
  - 测试：`src/stores/undoStore.test.ts`（+2）、`src/stores/compressStore.stale.test.ts`（+1）
- 验：`tsc -b` 干净；Vitest 65 / 837；主 crate 144 · 4 跳过（+1：`forward_duplicates_reports_same_and_similar_with_the_find_similar_ruler` —— 相同（只差首尾空白）/ 相似（≥ 阈值且 < 1）/
  不相似、ref 块、不存在的 id 都不出现；最后拿 `find_similar_blocks_json` 交叉核：它把相似那一对分进同一组、不相似的那块不进任何组 ⇒ 同一把尺子、同一个常量）；sidecar 14；
  `(none missing)`；`--dead` 与基线相同。
  真 SQLite：`undo(move) puts every moved and deleted block back exactly, in one press`（2 块移过去 + 1 块一模一样的删掉：原块占复制品的编号、别处的引用还指着它、压缩前原文还在；
  一次 ⌘Z ⇒ 原项目三块逐字段和之前相等、目标里只剩原有的；重做 ⇒ 又移过去）；`undo(move) survives a moved block’s old number having been taken since`（挪空后新捕捉的块拿到 #1，
  ⌘Z ⇒ 原块回来、换成 #2、不报错）。
- 施工时自己定的：
  - **「相同」**= 两边都去掉首尾空白之后逐字相同（中间的空白、标点一个不改）。「相似」= 不相同、Jaccard ≥ `SIMILAR_THRESHOLD`（0.6）。每块只报一条：有相同的报相同，否则报最像的一块。
    只看 `kind = 'text'`，同 `find_similar_blocks`。
  - 相同的直接跳过、不逐条列（面板上一句「另有 k 块一模一样，会直接跳过」）；相似的逐条「跳过 / 照样复制」，默认「照样复制」（相似不等于重复，默认不丢东西）。没有相似的就不弹面板，直接复制。
    查重本身失败就不复制，报「查重没做成，这次没有复制」。
  - 复制完的那一问挂在原来浮条的位置：「已复制 n 个块到「…」，k 块重复，已跳过 · 原项目里的这 m 块要删掉吗？（删掉就等于移动）」。
    m = 复制过去的 + 一模一样被跳过的；**相似而被跳过的不算、不删**（它们的内容目标里没有）。
  - 「删掉原块」= 乙：每块复制品删掉、原块（id 不变）挪进复制品的编号和位置（目标底部、目标里的新 #n）；一模一样被跳过的那几块，原项目里这一份真删。
    第 3 条的提示只对这几块**真删的**出现（有被别的块引用着的才出现，同时多一个「只删没被引用的」）。
  - 撤销：整件事一条 `move`，同时把 forward 那一条作废（复制品已经不在了）⇒ **按一次 ⌘Z 回到复制之前**（原块回原项目、原编号、原时间，目标里什么都不多）。
    原编号被新捕捉的块占了就换新号、不报错；删掉的那几块撤回时走同一个退路（先不带号插回去，再拿回原号或新号）。「两边都留」时 forward 那一条照旧，⌘Z 删复制品。
  - `created_at`：移过去用复制品的时间（排到目标底部，和复制看起来一样）；撤回原样还原。
  - **跟着改的一处**：`listSupersedeProposals` 加了「两块都还在这个项目里」的条件。卡片和 `decideStale` 按**本项目**的 `#n` 找块 —— 提案里有一块被移走后，读出来的是它在另一个项目里的编号，
    拿这个号在本项目里找会落到一块不相干的块上。现在这一条先不出现，撤回移动后又出现（测试 `⛔ 两块里有一块被移动到别的项目`）。真库此刻 0 条待审提案。
- 偏离：工程护栏都守着（查重走 Rust、新命令 `(async)`；乙不写任何关系字段，所以没有绕开 `setBlockSupersession` 的写法）。文件不跟着走（v15）、内容页「合并」、MCP 工具表都没动。
- 没覆盖到的：查重 → 跳过的提示文字（验收 ①）和「只删没被引用的」那一档（验收 ③）在界面那一层没有组件测试（仓库没有 DOM 测试环境），靠 §6 第 4、5 条手指验。
  一个边角没拦：那一问挂着的时候先按 ⌘Z 撤掉复制、再点「删掉原块」，原块照样会被挪过去（排到目标底部、拿新号）—— 结果等于「移动」，没丢东西。

**新发现**：HANDOFF §9.9 新增 `DISCOVERED-20261002-1`（删掉项目里编号最大的那块、再捕捉一块之后，⌘Z 撤不回那次删除；B4 的 `move` 撤回已绕开，旧的 `delete` / `merge` 没碰）。

**换装（Ocean 10-02 在「现在换装吗」上选了「现在换装」）**
- 构建：`cb6ba57`（工作区只有 docs 改动），`env -u APPLE_ID -u APPLE_PASSWORD -u APPLE_TEAM_ID -u APPLE_API_KEY -u APPLE_API_ISSUER -u APPLE_API_KEY_PATH
  APPLE_SIGNING_IDENTITY="Developer ID Application: Hanze JIN (Q5Y5JRXZ58)" npm run tauri build -- --bundles app`，日志进文件；没改 `tauri.conf.json`，日志里是「skipping app notarization」。
  这次 TSA 第一遍就过（`Timestamp=Oct 2, 2026 at 13:14:54`），`--verify --deep --strict` 过，产物 identifier `com.oceanjin.spool`。
- 装前：`codesign` = Developer ID、`spctl` = `Unnotarized Developer ID`、0.6.2、`spool` sha256 `f3ded3e5…35981b97`（就是 P1B 那一版）；真库 v29（代码也是 29，不迁移）。
- 停：GUI pid 46012 + `--overlay` pid 46017 按 pid `kill -TERM`，1 秒内都退了、再查已不在；`--mcp` 子进程（25 个）一个没碰。
- 真库备份：`~/Desktop/spool.before-p2-install-20261002-131513.db`（`VACUUM INTO`，integrity ok，v29，计数和活库一致）。
- 旧包：`mv` 到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261002-131526-pre-p2.app`；新包 `ditto` 进 `/Applications`。
- 装后：`--verify --deep --strict` 过、Developer ID、`spctl` = `Unnotarized Developer ID`、identifier `com.oceanjin.spool`、0.6.2；`/Applications` 里 `spool` 的 sha256
  `ac596bf2…56bf411a4` 和构建产物一致；主进程 77333 起于 13:15:33（换装之后），`lsof` 的 txt inode 75252519 就是新文件；stderr `[double-tap] installed at HID/active`（两个授权都在），
  stderr 里没有 error / panic；真库 v29 · 25 / 63 / 1013 / 1（工作区 / 项目 / 块 / 文件，含软删）· 正文总长 291894 · 捕捉目标没变，前后一致，没有新的迁移快照。
  没截窗口图：本机 21 个包认领同一个 id，按名字 / id 抬窗口有起第二个实例的风险（§10.6），界面留给 Ocean 亲眼看。
- 没 push、没发版。

**Ocean 验收**：待验收（§6 六条）。

## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 验收`（Ocean 验过后改成 `COMPLETE`），`git mv` 进 `docs/archive/product-taskbooks/`。
2. `docs/HANDOFF-2026-09-04.md`：§9.3 路线图 P2 那一行改成「已完成，任务书在 archive/product-taskbooks/…」；
   §9.8「唯一下一步」改成「按 §9.4 下发 P3」；`docs/README.md` 入口表里 ACTIVE 产品任务书那一行改成「暂无，待下发 P3」（README 只暂存这一行）。
3. 这些文档改动单独一笔提交（同样只 add 自己改的路径）。
