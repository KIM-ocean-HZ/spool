# 产品任务书 P1B —— 工作区归档、项目内查找（P1 的后两条）

> **状态：ACTIVE —— 当前唯一可执行的产品任务书。**
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

## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 验收`（Ocean 验过后改成 `COMPLETE`），移进 `docs/archive/product-taskbooks/`（`git mv`，见 §2）。
2. `docs/HANDOFF-2026-09-04.md`：§9.3 路线图 P1 那一行改成「已完成，任务书在 archive/product-taskbooks/…（P1 与 P1B 两份）」；
   §9.8「唯一下一步」改成「按 §9.4 下发 P2」；`docs/README.md` 入口表里 ACTIVE 产品任务书那一行改成「暂无，待下发 P2」
   （README 只暂存这一行）。
3. 这些文档改动单独一笔提交（同样只 add 自己改的路径）。
