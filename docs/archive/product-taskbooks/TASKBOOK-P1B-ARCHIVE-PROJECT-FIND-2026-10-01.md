# 产品任务书 P1B —— 工作区归档、项目内查找（P1 的后两条）

> **状态：COMPLETE。**（A2 `afb50d4`、A3 `4328d57`，2026-10-01 已换装，Ocean 2026-10-02 验收通过；回执在 §7）
>
> **唯一交付：** 下面 §3 的两条（A2、A3），按顺序做完、各自测试通过、各自一笔提交，并在 §7 写回执。
>
> **来历：** P1（`docs/archive/product-taskbooks/TASKBOOK-P1-SIDEBAR-ARCHIVE-FIND-2026-09-30.md`）的五条里，A0 / A0b / A1
> 已做完、已换装、Ocean 2026-10-01 验收通过；A2 / A3 没做，同日按 Ocean 指令「写好下一个 taskbook，下一窗口开工」转到这里。
> 两条的正文从 P1 搬过来，**对着 `f8828d7` 的代码重核过**，不准的地方已更正（A3「现在」一栏）。
>
> **授权来源：** Ocean 2026-09-30 指令「恢复 app 层面的修复与改善」+ 同日对十条的逐条拍板
> （`docs/HANDOFF-2026-09-04.md` §9.2，本任务书只引用、不改）。
>
> **边界：** 只做这两条。不碰实验线（`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、
> `docs/README.md` 里研究那几行）；不动 `docs/EXECUTION_POLICY.md`；不改库结构（这两条都不需要）；不 push、不发版。
> 换装给 Ocean 验收之前先问一句（§5）。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：首屏、§9.0–§9.4、§9.9（上一窗的新发现）、§10.6（红线速查）。
3. `CLAUDE.md` §3（只改该改的）和 §5（提交信息里不许有任何工具署名）。
4. 上一份任务书的回执：`docs/archive/product-taskbooks/TASKBOOK-P1-SIDEBAR-ARCHIVE-FIND-2026-09-30.md` §7
   （尤其 A1 —— A2 要接着它的左栏折叠逻辑做）。
5. 记忆 `ui-language-follows-system`、`no-test-environment-spool`、`isolated-verify-workflow`（只有 §5 换装才需要）。
6. 每一条开工前，读该条「现在」一栏点名的文件。

## 2. 起点

- 分支：本地 `main`。开工时 `git log -1` 应该是收尾那笔 docs 提交（标题以 `docs: P1 前三条` 开头），它的上一笔是
  `f8828d7`；之后只多了 docs 提交也行。不是就停下来说明。
- ⚠️ 工作树里有**别人没提交的改动**（`docs/` 下研究线的文件、`docs/README.md` 里研究那几行）。**只 `git add` 你自己改的文件的路径**，
  绝不 `git add -A` / `git add .` / `git commit -a`。README 要改的话，照 P1 回执里那个办法只暂存自己那一行。
- ⚠️ **删文件 / 改文件名会被权限拦**（上一窗 `git rm` 被判成「不可逆的本地删除」）。需要删或改名时，
  把要跑的那一行写给 Ocean，请他在输入框里用 `! git rm …` / `! git mv …` 跑，别绕路。
- 每条一笔提交，提交信息用中文、一行标题 + 可选正文（例：`feat(sidebar): …`、`feat(search): …`）。
  提交后跑 `CLAUDE.md` §5 那条自查；命中产品内容里的 claude 字样按记忆 `attribution-grep-false-positive` 复核。
- 测试基线（`f8828d7` 上实测，开工前先跑一遍对一下，做完每条再跑）：

```bash
npx tsc -b                                                # 干净
npx vitest run                                            # 64 个文件 / 806 条全过
cargo test --manifest-path src-tauri/Cargo.toml           # 141 过 · 4 跳过
cargo test --manifest-path src-tauri/sidecar/Cargo.toml   # 14 过
node scripts/i18n-check.mjs                               # (none missing) —— 这一条现在也在 vitest 里
```

Vitest 输出里有 31 行 `[db] pre-migration backup FAILED … window is not defined`，是老噪声，基线就有，不用管。

## 3. 两条

### A2 · 工作区归档（HANDOFF §9.1 第 9 条；Ocean 09-30：按「项目全完成」自动推出来）

- 来源：「一个工作区内所有项目都完成了，工作区应该进入 archive，不显示在列表里面。右键也可以强制把工作区移入 archive，所有项目随之完成。」
- 现在（`f8828d7`）：
  - `workspaces` 表没有归档字段（`src/lib/db/schema.sql:8`）；项目完成 = `threads.status='done'`（完成时的结论可以空）。
  - 工作区的树：`src/lib/workspaces/tree.ts` 的 `buildWorkspaceTree`（头注释：**一个工作区都不许掉出去**）。
  - 左栏：`src/components/Sidebar/index.tsx` 建树、算哪些组展开（A1 新加的 `lib/workspaces/open.ts`：手动展开的存
    `expandedWorkspaceIds`，当前项目那一支派生展开）；`src/components/Sidebar/WorkspaceGroup.tsx` 画一组，
    右键菜单在 `:332` 起（已有「移到最外层」「移进工作区」「删除工作区」）。
  - 「重新打开」：`threadsStore.reopen`（`src/stores/threadsStore.ts:271`，status → active、清 `completedAt` 和 `digest`），
    界面入口在 `ThreadView/index.tsx:123`、`ProjectBoard/index.tsx:314`。
  - 捕捉目标自愈：`src/lib/db/threads.ts:223` `ensureCaptureTarget` —— **只在没有任何捕捉目标时**才动，管不到「目标是个已完成项目」。
  - 撤销环：`src/lib/undo/undoLog.ts`（`UndoOpKind` 和各 payload）、`src/stores/undoStore.ts`（builder、`reverseAndBuildRedo`、
    `threadIdForEntry`、`previewForEntry`）、`src/hooks/useUndo.ts`（`refreshAfterUndoRedo`）、
    `src/overlay/CaptureOverlay.tsx:64` `UNDO_OP_LABEL`（撤销浮窗上的动作名）。
  - 真库（2026-10-01 只读查）：活的工作区 13 个、活的项目 47 个；按下面的规则**正好 1 个**工作区算归档（顶层、4 个项目）。
- 要做（**不改库**，归档是推出来的）：
  1. 判定：一个工作区的**整棵子树**（它自己和所有子工作区）里至少有一个项目，且这些项目全部完成 ⇒ 这个工作区算归档。
     空工作区不算；子树里只要有一个没完成的项目就不算。判定写成 `src/lib/workspaces/` 里的纯函数，配单元测试。
  2. 归档的工作区从左栏树里拿掉，放进左栏最底下一个默认收起的「归档」节（英文 Archive）。子工作区单独归档时，
     在归档节里显示它的上级路径（「上级 / 子工作区」）。归档节里能打开项目照常读。
     ⚠️ **边角：上级归档了、它下面有一个没有任何项目的子工作区** —— 子工作区自己按规则不算归档，但它的上级离开了树。
     ⛔ 不能让它掉出去（`tree.ts` 那条规矩）。建议跟着上级一起进归档节；施工时定，写进回执，配一条测试。
  3. 右键工作区 →「归档」：确认框写清「这会把 N 个项目标为完成」，确认后把子树里所有没完成的项目标完成（结论留空）。
     这一整批要能 ⌘Z 一次撤回（接现有的撤销环，加一种操作类型）。撤回 = 只把**这一次**标完成的那几个项目改回去，
     原来就完成的不动；捕捉目标也要换回原来那个。
     ⚠️ 加一种撤销类型要动的地方：`UndoOpKind` + payload、builder、`reverseAndBuildRedo`（redo 也要能再做一遍）、
     `threadIdForEntry` / `previewForEntry`（switch 穷尽，TS 会逼你）、`refreshAfterUndoRedo`（刷工作区和项目两个 store）、
     `UNDO_OP_LABEL` 加一个动作名 —— ⚠️ 这张表的值是经 `tr()` 现翻的，`i18n-check` **看不见**常量表，字典里那一条要手动加、手动核。
  4. **捕捉目标**：归档后捕捉目标不能留在一个已完成的项目上。确认框里说清捕捉目标会换到哪（建议：最近更新的一个没完成的项目），
     归档后照做。
  5. 重新打开归档里的任何一个项目（现有的「重新打开」）⇒ 它的工作区自然回到树里。这就是「取消归档」，不另做按钮。
  6. 和 A1 接上：归档节默认收起；**当前打开的项目在归档节里时**，归档节要展开、能看见它（和 A1「当前项目那一支自动展开」同一个道理）。
     归档节自己的开合不用存 settings（施工时可改，写进回执）。
- 不做：不存归档标记；不给 MCP 加任何东西（完成的项目在 MCP 里怎么显示保持原样）；不改「最近」「聚焦」两节。
- 真库提醒：装上新版那一刻，那 1 个工作区会直接进归档。这是预期，验收单里已经提前告诉 Ocean（§6 第 1 条）。

### A3 · 项目里的查找改成「本项目范围」（HANDOFF §9.1 第 4 条）

- 来源：「cmd f 之后的整体搜索没问题，但是进入项目后的查找有问题，正常逻辑应该显示单个项目范围内的查找，不应该有块内查找这个功能。」
- 现在（`f8828d7`，⚠️ 和 P1 任务书写的有出入，以这里为准）：
  - ⌘F（窗口内，`src/App.tsx:202`）和 ⌘⇧F（全局）都打开全库搜索面板 —— **这部分不动**。
  - 点一个结果进项目后，`src/components/ThreadView/LogView.tsx:155–200` 在顶上挂 `src/components/Search/InBlockNavigator.tsx`：
    占位字「块内查找…」，`aria-label`「块内查找」；三个数：「这一块 第 i / n 处」「本项目 X 处 · Y 块」「全部 X 处 · Y 块」；
    「全部」那个按钮展开的列表列的是**全部工作区**的块。
  - **↵ / ⌘G / F3 / ▲▼ 按钮**（`InBlockNavigator.tsx:80–90`、`src/hooks/useSearch.ts:101–111`）走
    `src/stores/searchStore.ts` 的 `nextHit` / `prevHit`：先在这一块里一处一处走，走完**会跳进下一块** ——
    但下一块取自 `navResults`（全库搜索那一次的**全部结果**，按搜索排序，跨项目），跳到别的项目时会把那个项目选中
    （`goToHit` / `advanceBlock`，`:102–126`）。⇒ 问题不是「困在一块里」，是「范围是全库、顺序不是时间线」。
  - 改输入框里的词（`LogView.tsx` 的 `onQueryChange`）只在**当前这一块**里重算命中，不重新查。
  - 跳到的块：`BlockItem.tsx:281–284` 已经对当前目标强制展开截断、给每一处包 `<mark>`。
  - 计数函数 `countMatches`（`searchStore.ts:81`）有单元测试。
  - ⚠️ 这个组件里有几处中文没走 `t()`（`:180–181` 关闭按钮的 title / aria-label，`:207`「批注」，`:210`「收件箱」「无标题」），
    英文界面会露中文。已登记 HANDOFF `DISCOVERED-20261001-1`。
- 要做：
  1. 查找条改成「在本项目里查找」：↵ / ⌘G / ▲▼ 按块在**时间线上的先后**，在**本项目所有命中**之间跳（跨块），
     最后一处再按回到第一处（⇧ 方向同理）。⛔ 不再跳出本项目。
  2. 计数只留「本项目 第 i / N 处」；删掉「这一块 第 i / n 处」和块内模式（组件名、占位文字、字典条目一起改，孤儿一起清）。
     改组件文件名要 `git mv` —— 见 §2，先请 Ocean 跑。
  3. 列表只列本项目的命中；改输入框里的词就在**本项目**里重新查（不是只重算当前块）。列表底下留一行「在全部工作区里搜这个词」，点了回全库面板。
  4. 跳到的块如果是折叠着的，要展开到命中那一处。先确认 `BlockItem.tsx:281` 那套够不够（截断之外还有没有别的「折叠」：
     更正折叠、压缩过的块……），够就不改，在回执里写清查过哪几种。
- 工程护栏：命中位置照旧走 `data-o` 偏移映射，**不许**用 `content.indexOf`（HANDOFF §10.6 工程护栏第二条）。
  本项目的命中从哪来：优先复用 `lib/search/query.ts` 现有的查询与 `buildHitOffsets`，别另写一套匹配规则。
- 你重写到的那几行，新文案一律走 `t()`、中英都写；没碰到的那几处留给 `DISCOVERED-20261001-1`，别顺手扩。
  清孤儿用 `node scripts/i18n-check.mjs --dead` 前后对比（⚠️ 基线就有 87 条 DEAD，见 `DISCOVERED-20261001-2`，只看你造出来的那几条）。
- 不做：全库搜索面板（⌘F 打开的那个）不动；⌘F 的键位不动。

## 4. 什么时候停下来问

- 起点不是 §2 写的那样；
- 某条做下去要改库结构、加 MCP 工具、改 pack 输出、或碰捕捉浮窗 —— 这两条都不该需要，需要了就说明任务书漏算了什么；
- 发现和 §3 描述对不上的现状（代码已经变了）；
- 要删 / 改名文件（请 Ocean 跑，见 §2）；
- 发现新问题：**不顺手修**，按 HANDOFF §8 的 DISCOVERED 格式记进 HANDOFF §9.9，继续做本任务。

## 5. 做完两条之后：换装给 Ocean 验收（先问）

- 两条都提交、全部测试通过之后，**先问 Ocean「现在换装吗」**，得到同意再做。
- 照上一窗的做法（P1 回执「换装」那一段，每一步都写了命令和核对项），要点：
  - 先看现装的签名（上一窗是 Developer ID ⇒ 构建时 `APPLE_SIGNING_IDENTITY` 走环境变量，不改 `tauri.conf.json`，公证变量 unset）；
  - 构建日志重定向到文件；TSA 偶发失败就整个重跑；
  - 停 GUI 和 `--overlay` **按 pid**，杀完再查一遍还在不在（记忆 `isolated-verify-workflow` §40–§41）；`--mcp` 一个都不碰；
  - 换装前 `VACUUM INTO` 备份真库到桌面（文件名带日期）；旧包 `mv` 进 `~/Desktop/Spool/spool-pre-install/`，别删；
  - 换装后核：sha256 和构建产物一致、进程启动时间在换装之后、真库版本和计数前后一致。
- 这一批不改库结构，真库不会迁移。commit、build、换装分开记在回执里；**不 push、不发版**。

## 6. 给 Ocean 的验收单（大白话，换装后给 Ocean）

1. 装上新版那一刻，有 1 个工作区已经不在列表里了 —— 它的项目本来就全部完成了，去左栏最底下「归档」里能找到它。这是预期。
2. 找一个只剩一个没完成项目的工作区，把那个项目标完成 ⇒ 这个工作区从列表里消失，出现在「归档」里。
3. 在「归档」里打开刚才那个项目，点「重新打开」⇒ 工作区回到列表里。
4. 右键一个工作区 →「归档」⇒ 确认框里的项目数对得上；确认后它进了归档；按 ⌘Z ⇒ 全部回来。
   如果它里面有「捕捉中」的项目，确认框会说捕捉目标换到哪，归档后双击 ⌥ 捕捉进的是那个项目。
5. 用 ⌘F 搜一个词，点结果进项目 ⇒ 顶上的查找条写的是「本项目 第 1 / N 处」；一直按回车，会按时间线依次跳过这个项目里每一块的每一处，
   最后一处再按回车回到第一处；全程不会跳到别的项目；列表里只有这个项目的块。
6. 在查找条里改一个词 ⇒ 数字和列表跟着变，还是只在这个项目里。点列表底下「在全部工作区里搜这个词」⇒ 回到全库搜索。
7. 界面切成英文，把第 1–6 条里看到的新字（「归档」、确认框、查找条）看一眼 ⇒ 都是英文。

你只要告诉我：这七条里哪几条不对，不对的那条你看到了什么。

## 7. 回执（执行窗填写）

每条一小段：

- 提交：`<hash> <标题>`
- 改了哪些文件（一行一个）
- 怎么验的：命令 + 结果（vitest / cargo 的条数，i18n-check 的输出原文）
- 施工时自己定的（A2 第 2 条的边角、第 6 条；A3 第 4 条查过哪几种折叠）
- 还差什么、有没有偏离本任务书、新发现记在 HANDOFF 哪里

最后一段：换装（做了没有、装的是哪个 commit、`spctl` 结果、真库备份文件名）、Ocean 验收（还没有就写「待验收」）。

### 回执（执行窗 2026-10-01 填）

**开工**：`git log -1` = `7ec2e2e`（上一笔 `f8828d7`），符合 §2。基线和 §2 写的完全一致：`tsc -b` 干净；Vitest 64 文件 / 806 条；
主 crate 141 过 · 4 跳过；sidecar 14 过；`i18n-check` → `(none missing)`；`--dead` 87 条。

**A2 · 工作区归档**
- 提交：`afb50d4 feat(sidebar): 工作区归档 —— 项目全完成自动进左栏底部「归档」，右键可强制归档、⌘Z 一次撤回`
- 文件：
  - `src/lib/workspaces/archive.ts`（新：`splitArchived` 判定 + 拆树、`subtreeWorkspaceIds`、`archivePlan`）
  - `src/lib/workspaces/archive.test.ts`（新，14 条）
  - `src/components/Sidebar/index.tsx`（拆树、左栏最底下的「归档」节）
  - `src/components/Sidebar/WorkspaceGroup.tsx`（右键「归档」、归档节里显示「上级 / 子工作区」）
  - `src/components/Sidebar/ArchiveWorkspaceDialog.tsx`（新：确认框，App 里挂一次，同 `packingId` 的做法）
  - `src/App.tsx`、`src/stores/workspacesStore.ts`（`archivingId` / `archive`）
  - `src/lib/db/threads.ts`（`setThreadCompletion`：按给定值写 status / completed_at / updated_at）
  - `src/lib/undo/undoLog.ts`、`src/stores/undoStore.ts`、`src/hooks/useUndo.ts`、`src/overlay/CaptureOverlay.tsx`（新撤销类型 `workspace_archive`）
  - `src/stores/undoStore.test.ts`（+2 条，真 SQLite：归档 → ⌘Z → 重做；⌘Z 不动用户后来自己选的捕捉目标）
  - `src/lib/i18n/index.ts`
- 验：`tsc -b` 干净；Vitest 65 文件 / 822 条；主 crate 141 · 4 跳过；sidecar 14；`i18n-check` → `(none missing)`；`--dead` 与基线逐行相同（87）。
  `UNDO_OP_LABEL` 新加的「归档工作区」i18n-check 看不见，字典里那一条是手加、手核的（`'归档工作区': 'Archive workspace'`）。
  另用真库只读导出（`sqlite3 -readonly`）跑了一遍判定：13 个工作区、47 个项目，**正好 1 个**算归档（顶层、4 个项目），和 §3 写的一致；临时测试文件跑完即删。
- 施工时自己定的：
  - **第 2 条的边角**：上级归档了、下面有个没有项目的子工作区 ⇒ 跟着上级整棵进归档节（测试 `carries an empty sub-workspace along with its archived parent`）；
    另有一条「一个工作区都不许掉出去」的测试（含孤儿、环）。
  - **第 6 条**：归档节默认收起、开合不存 settings；当前项目在归档节里时自己展开，那时候手动收起只在这条链不变期间有效（和 A1 同一条规矩）。
    顺带的现象：当前项目在一个「上级没归档、自己归档了」的子工作区里时，A1 的派生展开也会把树里那个上级展开（它在这条链上）。没改，写在这里。
  - **捕捉目标**：只在目标落在这棵子树里时才换，换到子树外「最近更新的一个没完成的项目」；子树外一个没完成的都没有时，目标留在原处，确认框照实说
    「没有别的没完成的项目，捕捉目标仍留在『…』」—— 不替用户新建项目。⌘Z 时只有目标还停在归档换过去的那个项目上才换回去（用户中间自己改过就不动）。
  - **撤回不留痕**：撤回把这几个项目的 `updated_at` 也还原，不然 ⌘Z 之后它们会全部挤到「最近」最上面。
  - 右键「归档」只在子树里还有没完成的项目时出现（空工作区归不了档，全完成的已经在归档里）。
  - 执行中自己抓到并修掉的一处：拆树之后，树里的上级拿到的 `node.children` 已经不含归档的子工作区 ⇒ 它的「移进工作区」会把自己的子工作区列成目标（选了必抛「成环」），
    「删除工作区（连同里面的工作区）」也会少那半句。改成按**整棵树**算子树（`subtreeWorkspaceIds`）。
- 偏离：无。没改库结构、没碰 MCP、没碰「最近」「聚焦」。

**A3 · 在本项目里查找**
- 提交：`4328d57 feat(search): 项目里的查找改成「在本项目里查找」—— 按时间线跨块走、首尾相接、不跳出本项目`
- 文件：
  - `src/components/Search/InBlockNavigator.tsx` → `ProjectFindBar.tsx`（Ocean 跑的 `git mv`；计数只剩「本项目 第 i / N 处」、列表只列本项目、底下一行「在全部工作区里搜这个词」）
  - `src/stores/searchStore.ts`（按本项目、时间线顺序走，首尾相接；改词在整个项目里重查；`navResults` 和 `countMatches` 删掉，换成 `findPosition`）
  - `src/lib/search/query.ts`（新 `hitsInBlocks` / `BlockHit`；`hitLine` / `hitLead` 形参放宽成只要 `snippet`）
  - `src/components/ThreadView/LogView.tsx`、`ScaleRail.tsx`（刻度条和查找条读同一份命中）、`BlockFeed.tsx`（见下面「更正折叠」）、`BlockItem.tsx`（两处注释里的组件名）
  - `src/stores/searchCounts.test.ts`（重写：`findPosition` + 六条按项目走的测试）、`src/lib/search/query.test.ts`（+3 条 `hitsInBlocks`）
  - `src/lib/i18n/index.ts`（删 8 条块内模式 / 全库计数的键，加 6 条新键）
- 命中从哪来：`hitsInBlocks` = 对本项目已加载的块逐块跑全库搜索**同一套** `buildSnippet` + `buildHitOffsets`，按块在 store 里的顺序（= 时间线，`created_at` 升序）。
  ⛔ 没用 `search()` 再按项目过滤：它的 FTS / LIKE 查询对**全库**有 `LIMIT 60`，长项目会被截短、「第 i / N 处」会数错。命中位置照旧走 `data-o` 偏移，没碰 `content.indexOf`。
- 改词时落在哪：当前这一块还对得上就留在这一块；对不上就跳到时间线上它下面的第一处，没有就从头。一处都没有时查找条留着、写「本项目里没有」。
- 验：`tsc -b` 干净；Vitest 65 文件 / 829 条；主 crate 141 · 4 跳过；sidecar 14；`i18n-check` → `(none missing)`；`--dead` 与基线逐行相同（87）——
  删掉的 8 条键正好是改动造出来的孤儿，新键都在用。
- **第 4 条查过的「折叠」**：
  - 6 行截断：`isNavTarget` 时不截（`showCollapsed`）—— 够；
  - 退役块折到一行：`isNavTarget` 一票否决（`staleFolded`）—— 够；
  - 合并块（`SegmentedContent`）：`isNavTarget` 时摊平成 `MarkdownContent`，命中照画 —— 够；
  - 批注里的命中：`ContentRuns` 画 `<mark>` —— 够；
  - 压缩过的块：正文就是压缩稿，命中算的、画的都是它；压缩前原文在另开的只读区，FTS 也只索引 content + annotation，不在任何查找范围 —— 不涉及；
  - 尾部窗口（「查看更早的」）：落点走 `highlight`，BlockFeed 会把窗口放宽到够得着 —— 够；
  - **更正折叠：不够**。挂在句子底下的更正不在时间线上，原来只在 `highlightBlockId`（1.2 秒自清）期间放出来 ⇒ 按回车走进一条更正，它闪一下就折回去，命中跟着没了。
    改了 `BlockFeed.tsx`：查找停在它上面的整段时间都留在时间线上（`navBlockId`），走开就折回去。
  - 引用项目块（`kind = ref`）：它画的是被引项目的**现名**，没有命中高亮；落点能滚到那一行，但看不到 `<mark>`。没改，写在这里。
- 没碰到的那几处中文（关闭按钮的 `title` / `aria-label`）照任务书留给 `DISCOVERED-20261001-1`，HANDOFF 里那一条已更新还剩什么。
- 偏离：无。全库搜索面板、⌘F 键位都没动。

**新发现**：HANDOFF §9.9 新增 `DISCOVERED-20261001-3`（全库搜索结果上的「批注」标签英文显示成动词 Annotate）；`-1` 补了进度。

**换装（Ocean 10-01「做完后续步骤然后换装等我验收」）**
- 构建：`4328d57`（工作区只有 docs 改动），`env -u APPLE_ID -u APPLE_PASSWORD -u APPLE_TEAM_ID -u APPLE_API_KEY -u APPLE_API_ISSUER -u APPLE_API_KEY_PATH
  APPLE_SIGNING_IDENTITY="Developer ID Application: Hanze JIN (Q5Y5JRXZ58)" npm run tauri build -- --bundles app`，日志进文件；没改 `tauri.conf.json`，日志里是「skipping app notarization」。
  ⚠️ 第一次 TSA 失败（`A timestamp was expected but was not found`，`.app` 没签成），整个重跑一次过。
- 装前：`codesign` = Developer ID、`spctl` = `Unnotarized Developer ID`、0.6.2、`spool` sha256 `ac47d291…a55a79fb`（就是 P1 那一版）；真库 v29（代码也是 29，不迁移）。
- 停：GUI pid 53200 + `--overlay` pid 53222 按 pid `kill -TERM`，1 秒内都退了、再查已不在；`--mcp` 子进程（约 20 个）一个没碰。
- 真库备份：`~/Desktop/spool.before-p1b-install-20261001-145647.db`（`VACUUM INTO`，integrity ok，v29，计数和活库一致）。
- 旧包：`mv` 到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261001-145654-pre-p1b.app`；新包 `ditto` 进 `/Applications`。
- 装后：`--verify --deep --strict` 过、Developer ID、`spctl` = `Unnotarized Developer ID`、identifier `com.oceanjin.spool`；`/Applications` 里 `spool` 的 sha256
  `f3ded3e5…35981b97` 和构建产物一致；主进程 46012 起于 14:57:03（换装之后），`lsof` 的 inode 就是新文件；stderr `[double-tap] installed at HID/active`（两个授权都在）；
  真库 v29 · 25 / 63 / 1013 / 1（工作区 / 项目 / 块 / 文件，含软删）· 正文总长 291894 · 捕捉目标没变，前后一致。截了一张窗口图，正常出画面（归档节在左栏最底下，要往下滚才看得到）。
- 没 push、没发版。

**Ocean 验收**：2026-10-02 回复「验收通过」（§6 七条）。


## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 验收`（Ocean 验过后改成 `COMPLETE`），移进 `docs/archive/product-taskbooks/`（`git mv`，见 §2）。
2. `docs/HANDOFF-2026-09-04.md`：§9.3 路线图 P1 那一行改成「已完成，任务书在 archive/product-taskbooks/…（P1 与 P1B 两份）」；
   §9.8「唯一下一步」改成「按 §9.4 下发 P2」；`docs/README.md` 入口表里 ACTIVE 产品任务书那一行改成「暂无，待下发 P2」
   （README 只暂存这一行）。
3. 这些文档改动单独一笔提交（同样只 add 自己改的路径）。
