# 产品任务书 P9F（修补）—— 发版前修补：P9A 裁定要修的那几件 + 主窗默认大小

> **状态：COMPLETE。**（2026-10-13：九步都已提交、已换装；**Ocean 2026-10-14 验收通过**；回执在 §7 末尾。）
>
> **唯一交付：** 下面 §3 的九步（F1 – F9），按 §3 开头写的顺序做，每一步测试通过、单独一笔提交，并在 §7 写回执。F8 中途要停下来给 Ocean 看截图、等他定（§3 F8）。
>
> **来历：** P9A 核对（`archive/product-taskbooks/TASKBOOK-P9A-AUDIT-KNOWN-ISSUES-DESIGN-DEBTS-2026-10-10.md` 回执）之后，Ocean 2026-10-11 裁定（HANDOFF §9.2 第 80 – 86 条）。条目正文从 HANDOFF §8 / §9.9 **搬过来**了，HANDOFF 那边每条只留一行「已下发到 …」。
> **「现在」一栏每一条都对着 `e58e5b3` 的代码（和 P9 最后一笔代码 `7efc7b5` 一样，之后只有 docs 提交）和真库只读副本核过；P9A 回执里有完整证据。**
>
> **授权来源：** 都是 Ocean 自己的拍板，本任务书只引用、不改：
> - 第 80 条（Codex 写不回来）：「先验证甲，Codex 必须能写回，不允许只读」；
> - 第 81 条（长按卡 ⌘Z）：甲；第 82 条（捕捉卡 ×）：甲；
> - 第 83 条（淡底色）：「放在修补里，先把变化后的效果图给我验收，我来决定是否删除」；
> - 第 84 条（做完的设计稿）：甲，挪进 `archive/`；Codex handoff 里那几行留给研究线；
> - 第 85 条（主窗默认大小，Ocean 自己发现的）：「spool 打开后的默认长宽比不对，现在近似一个正方形，不好看，需要改成和电脑窗口一致的长宽比，并且放大，保留小部分缝隙」；
> - 第 86 条：P9A 建议表其余各条「照建议办」（8 条进这一份；以后再说的留在 HANDOFF；C-a / C-c / C-e 和摘要题关掉；隐私说明两条放发版一那一窗）。
>
> **和 P9B 的先后：** 这一份排在 P9B 前面（P9A 回执 §7.4 的建议；F8 的结果 P9B 要用 —— P9B 任务书 §2 第 3 条点名等它）。P9B 任务书仍是 `QUEUED`，这一份 Ocean 验收之后再开工。
>
> **边界：**
> - 只做这九步。**库结构不改**（不加表、不加列、不加迁移）；**pack 的格式和 golden 不改**；**MCP 的工具、描述、输出格式不改**（F6 只改 Spool 启动 Codex 时传给它的设置）。
> - 不碰实验线：`TASKBOOK-STAGE0A-*`、`docs/CODEX-HANDOFF-STAGE0A-D2-REVIEW-2026-09-03.md`（F9 也不碰它）、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行。
> - 不动 `docs/EXECUTION_POLICY.md`。不 push、不发版。隐私说明那两条（`DISCOVERED-20261004-1`、`-20261010-7`）是发版一那一窗的事，这一份不碰。
> - 深浅色、「活动」图表、专注历史是 P9B 的事，这一份不碰。
> - 花钱的只有 F6 那几次 Codex 真跑（Ocean 第 80 条批准了验证），上限写在 F6 里。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：首屏、§9.0 – §9.4、§9.8、§9.9；§9.2 第 26 – 29、35、45、48 – 51、57、75、80 – 86 条；§10.6 红线速查（「少用 emoji，一屏最多一个 ⚠️」那一行照着做）。
3. P9A 任务书回执（`archive/product-taskbooks/TASKBOOK-P9A-…`）§7.2 – §7.4：每一条当时怎么核的、复现用的办法。
4. `CLAUDE.md` §3（只改该改的）和 §5（提交信息里不许有任何工具署名）。
5. 记忆：`write-plainly-for-ocean`、`no-test-environment-spool`、`ui-language-follows-system`、`capture-note-first`（F4）、`tauri-sync-commands-freeze-ui`（新命令一律 `(async)`）、`mcp-tool-annotations-required`（F6，含「翻 codex 会话先看 `originator`」）、`isolated-verify-workflow`（§21 / §40 / §41 换装，§42 演示版，§45 截图）、`scratchpad-vitest-against-repo`、`spool-db-wipe-incident`（⛔ 别起 debug 版 GUI，会碰真库）、`file-deletion-needs-ocean`、`attribution-grep-false-positive`。
6. 每一步开工前，读那一步「现在」一栏点名的文件。

## 2. 起点

- **分支和提交：** 本地 `main`。开工时 `git log -1` 应该是下发本任务书的那笔 docs 提交（标题以 `docs: 下发 P9F` 开头），它的上一笔是 `e58e5b3`。之后只多了 docs 提交也行；不是这样就停下来说明。
- **只提交自己的文件：** 工作树里有研究线没提交的改动（`docs/` 下 Stage 0-a 的文件、`docs/README.md` 里研究那几行）。只 `git add` 自己改的路径，绝不 `git add -A` / `.` / `commit -a`。README 只暂存自己那几行（拿 HEAD 版本只换那几行，`git hash-object -w` + `git update-index --cacheinfo`）。
- **删文件会被权限拦：** `git rm` 写给 Ocean 跑；`git mv` 能自己跑（F9 全是 `git mv`）。
- **提交：** 每步一笔，中文提交信息，提交后跑 `CLAUDE.md` §5 的自查。
- **测试基线**（P9A 开工和收尾各跑一遍，一样）：

```bash
npx tsc -b                                                # 干净
npx vitest run                                            # 85 个文件 / 1016 条全过
cargo test --manifest-path src-tauri/Cargo.toml           # 190 过 · 5 跳过（偶尔假红，F5 修的就是它）
cargo test --manifest-path src-tauri/sidecar/Cargo.toml   # 14 过
node scripts/i18n-check.mjs                               # (none missing)
node scripts/i18n-check.mjs --dead                        # 87 行（这一份不清它，只看你造出来的）
cargo tree --manifest-path src-tauri/Cargo.toml -e normal | grep -iE "ureq|rustls|reqwest|hyper|openssl"   # 必须是空的
```

- **真库现状**（10-10 只读副本）：v33；1097 块、50 个活着的项目、13 个文件、4 张图。⛔ 不写库（F2 那一块由 Ocean 自己手改，见 F2）。

## 3. 九步

**顺序：F5 → F1 → F2 → F3 → F8（效果图，问 Ocean）→ F4 → F7 → F6 → F9。**
先修测试假红（F5），后面每一步跑全套才可信；F8 越早问 Ocean 越好，等他答的时候接着做 F4 往后。

### 共同的规矩

- 大白话，少用 emoji；所有新字都要有英文（`ui-language-follows-system`）。
- 每一步先写一条会红的测试（能写的话），再改到它绿。
- 发现新问题：不顺手修，按 HANDOFF §8 的格式记进 §9.9，继续做。

---

### F5 · 测试假红：一条测试改了整个测试进程的 `HOME`（原 `DISCOVERED-20261007-2`）

**现在：**
- `src-tauri/src/mcp.rs:15189` `one_click_client_config_status_merge_backup` 用 `std::env::set_var("HOME", …)`（Windows 上是 `USERPROFILE` / `APPDATA`）把全进程的 home 改成临时目录，注释写着「No other test reads them」—— P6 – P9 之后不对了。
- 读 `HOME` 的测试（而且多半是「自己读一次、被测函数里再读一次」）：`engine.rs:1728` `candidate_paths_cover_the_version_managed_install_dirs`（断言在 `:1735`）、`file_identity.rs:451` `knows_the_trash_and_an_unplugged_disk`、`mcp.rs` 的 `the_path_gate_judges_where_a_path_really_leads` / `the_path_gate_sorts_every_kind_of_place`（`path_gate_rules` 在 `:5931` 读 `HOME`）、`images.rs` 的 `the_new_screenshot_is_the_newest_marked_one_since_the_chord`（`:489` 读 `HOME`）。
- P9A 实测：全套连跑 30 遍全过；只挑这几条一起连跑 150 遍，红 37 遍，红的都是 `candidate_paths_…`。
  复现命令：`cargo test --manifest-path src-tauri/Cargo.toml -q -- one_click_client_config candidate_paths knows_the_trash path_gate the_new_screenshot`，循环 150 次数红几次。

**要做：** 只改测试。读 `HOME` 的那几条和改 `HOME` 的那一条共用一把锁（测试模块里一个 `static` 的 `Mutex<()>`，取锁时别让一次 panic 毒死它：`lock().unwrap_or_else(|e| e.into_inner())`）；或者让那条测试不再改全局 `HOME`（只要不动产品代码的行为）。改掉那句错的注释，写清楚「读 `HOME` 的测试都要拿这把锁」。

**不做：** 不改任何产品代码的行为；不给产品函数加只为测试用的参数（除非锁的办法走不通，那就停下来说明）。

**验收：** 上面那条只挑几条的命令连跑 150 遍，0 红；全套连跑 10 遍全过；条数不变（190 · 5）。

---

### F1 · 删掉最新那块、又冒出一块新的，⌘Z 撤不回（原 `DISCOVERED-20261002-1`）+ 顺带删掉没人用的 `updateBlockThread`（原 `DISCOVERED-20261004-3`）

**现在：**
- 块编号按项目 `MAX(seq)+1` 分配（`blocks.ts:472`），块是硬删。删掉的正好是编号最大的那块时，下一块新块拿到同一个号。之后 ⌘Z 撤那次删除，`restoreBlock`（`blocks.ts:681`）原样插回旧号，撞唯一索引 `idx_blocks_thread_seq` ⇒ 撤销失败，那一条撤销记录已经被用掉，块回不来。
- 撤回 / 重做里调 `restoreBlock` 带旧号的：`undoStore.ts:311–313`（删除）、`:328–331`（合并，被并掉的块）、`:291–310`（捕捉 / 新建的重做）、`:415–422`（转发的重做）。只有 P2 加的「移动」（`:437–447`）先不带号插回去再拿号，绕开了。
- 注释写错了：`blocks.ts:678`（「Numbers are never reused after a delete」）、`schema.sql:331–333`（「never reused after a delete」）。
- P9A 在 scratchpad 复现了三种触发，都报 `UNIQUE constraint failed: blocks.thread_id, blocks.seq`：① 删掉后 AI 写进来一块（`createBlock` 直接写，没有撤销记录，模拟 MCP `add_block`）；② 删掉后在主窗敲一块（`append`），再改它的批注（`setAnnotation` 会让那一块的撤销记录作废，⌘Z 越过它去撤删除）；③ 删的时候选了「一起去掉」文件 ⇒ 文件那一行也回不来。对照组（中间没有新块）正常撤回。写法见记忆 `scratchpad-vitest-against-repo`。
- P5-3 起删块的撤销条目带着挂在那块上的文件：撤销先插块，插不进去就整条失败，文件那一步走不到。
- `updateBlockThread`（`blocks.ts:581`）全仓库零调用方；它换项目时不带挂着的文件走（捕捉卡改投走的是「先删再建」，真正在用的是 `moveBlock`）。

**要做：**
1. 在 `restoreBlock` 里统一处理：给的编号在这个项目里已经被占了（或者是 `null`），就拿 `MAX(seq)+1`；没被占就用原号。所有撤回 / 重做都经过它，`undoStore.ts` 里「移动」那一支的绕法可以保留也可以改成直接用它（选更简单的，别两套）。
2. 撤回之后屏幕上那一块显示的是库里真实的新编号（检查 `blocksStore` 是不是从库里重读；不是就补上）。
3. 改掉那两处错注释。
4. 删掉 `updateBlockThread` 这一个函数（只删函数，不删文件）。
5. 测试（真 SQLite，照 `projectFiles.lifecycle.test.ts` 的写法）：上面三种触发各一条 + 对照组一条，断言块回来了（编号可以变）、文件也回来了、挂回原块上。

**不做：** 不改编号的分配方式（仍然 `MAX+1`，不加「编号永不重用」的计数器 —— 那要动库结构）；不改撤销环的容量和作废规则。

**验收：** 新测试绿；全套不少；`grep -rn updateBlockThread src` 为空。

---

### F2 · 压缩后「用这一份」，最后一块正文末尾多一行 `---`（原 `DISCOVERED-20261003-1`）

**现在：**
- `assemble.ts:696` 在最后一块之后推一行 `---`（「Output Language」前面那条分隔线；项目没有文件时中间没有别的小节）。`splitPackEntries`（`compressBlocks.ts:73`）把一块的正文切到下一个小节标题为止，于是这行 `---` 算进了最后一块。
- 写回在 `compressStore.ts:259` `draftWrites`：对每一块调 `stripInventedSkeleton(block.content, contentFromEntryBody(after.body, held))`，按「压缩前那一块（库里的 `content`）里有几次」减掉压缩发明出来的骨架行；但 `skeleton.ts:38` 的 `FIXED_LINES` 里没有 `---`，所以它不被当成骨架。
- 真库只读副本：压过的 34 块里有 1 块（「申请帮助」#13）正文以 `---` 结尾、原文没有。

**要做：** 写回前把最后一块末尾那行 pack 级的 `---` 按「压缩前那一块里有几个」减掉（和 `stripInventedSkeleton` 同一套「按原文减」的纪律）。最小的办法是让 `FIXED_LINES` 认 `---`；但 `draftWrites` 剔掉的行会进 `skeletonLines`，如果界面上有「剔掉了几行骨架」之类的提示，**不能让它每次压缩都冒出来**（这一行不是模型发明的，是切条目时带进来的）—— 施工时看哪种改法不带这个副作用，在回执里写清楚选了哪种。补一条测试：没有项目文件的项目，压缩稿里最后一块没写 `---` ⇒ 写回的正文末尾没有 `---`；块正文本来就有 `---` 的照样留着。

**真库那一块：** ⛔ 不碰库。验收单里请 Ocean 自己双击「申请帮助」#13，删掉最后那一行 `---`。

**不做：** 不改 pack 的格式、不改 `assemble.ts` 推 `---` 的那一行、不动 golden。

**验收：** 新测试绿；`compressStore.boundary.test.ts` 等压缩那几份测试照样绿。

---

### F3 · 英文界面三处 + 字典检查看得见浮窗（原 `DISCOVERED-20261001-1`、`-20261001-3`、`-20261002-2`）

**现在：**
1. `ProjectFindBar.tsx:156–157` 关闭按钮是裸字面量 `title="关闭 (Esc)"`、`aria-label="关闭查找"`。字典里已有 `'关闭 (Esc)': 'Close (Esc)'`（`i18n/index.ts:1088`），没有 `'关闭查找'`。
2. 字典 `i18n/index.ts:201` `'批注': 'Annotate'`（动词）。全仓库只有两处用这个键，都是名词：`SearchResultItem.tsx:86`（搜索结果上「命中在批注里」的标签）、`BlockItem.tsx:1683`（块编辑面板里批注框上面的小标签）。没有测试钉着 `'Annotate'`。
3. `scripts/i18n-check.mjs:30` 的 `CALL = /\bts?\(…/` 只认 `t(` / `ts(`；全仓库只有 `CaptureOverlay.tsx` 用 `const tr = useT()`（26 处 `tr('…')`），检查看不见。P9A 用加上 `tr` 的正则扫过：今天一条都不缺。

**要做：**
1. 两处改成 `t('关闭 (Esc)')`、`t('关闭查找')`，字典加 `'关闭查找': 'Close find'`。
2. 字典那一条改成 `'Note'`（不用改组件；不要另起新键）。
3. 正则改成 `\bt[rs]?\(`；`scripts/i18n-check.test.mjs` 补一条：只出现在 `tr('…')` 里、字典里没有的中文，要被报出来。

**不做：** 不清 `--dead` 那 87 条（P9A 定了以后再说）；不让脚本去认 JSX 里的裸中文（另一件事）。

**验收：** `node scripts/i18n-check.mjs` 仍是 `(none missing)`；临时删掉浮窗用到的一条字典项，它能报出来（验完恢复）；`--dead` 不多于 87。

---

### F8 · 那 27 处「淡底色」：先出效果图给 Ocean 看，他定删掉还是补上（原 `DISCOVERED-20261010-4`）

**现在：**
- 15 个文件、27 处写了 `bg-accent-soft`（24 处）/ `bg-accent-soft/40`（2 处）/ `hover:bg-accent-soft`（1 处）：`Compress/CompressBoard.tsx`、`Pack/PackDialog.tsx`、`Pack/WorkspacePackDialog.tsx`、`Review/ReviewPanel.tsx`、`RightRail/LiveRun.tsx`、`RightRail/RunCard.tsx`、`RightRail/index.tsx`、`Settings/GeneralConfig.tsx`、`Sidebar/index.tsx`、`ThreadView/BlockItem.tsx`、`ThreadView/FollowUpPanel.tsx`、`ThreadView/MergeToolbar.tsx`、`ThreadView/ScaleRail.tsx`、`ThreadView/ThreadHeader.tsx`、`overlay/CaptureOverlay.tsx`。开工时用 `grep -rn "accent-soft" src` 再数一遍。
- `tailwind.config.js:18` 的颜色表里只有 `accent`，没有 `accent-soft` ⇒ 这个类从来没生成过（P9A 在 scratchpad 编过一遍 Tailwind，产物里没有 `.bg-accent-soft`）。`--accent-soft` 只是 `tokens.css` 里的变量（经典版 `:41` `#fef3c7`，情人节版 `:146` `#fce7ee`）；另有 4 处直接写 `var(--accent-soft)`（`CompressBoard.tsx:516`、`EntryCard.tsx:253`、`:276`、`ApiEngineConfig.tsx:158`），那几处一直是生效的，不在这一步里。
- 用户一直看到的就是「没有底色」的样子 ⇒ 现在发出去的经典版就是没底色的。

**要做（分两半，中间停下来问）：**
1. **效果图**：做一份「补上」的样子，**真截图**（不是渲染图、不是 mock），一处一张、和现在的样子并排（左边现在、右边补上之后）。15 个文件里能截到的地方都截；截不到的（比如只在某种运行状态才出现）写清楚是哪一处、为什么截不到。经典版为主，情人节版各截一张总览就行。
   - 截法：记忆 `isolated-verify-workflow` §45（把真组件渲染成静态页再截）或 §42（演示版）。⛔ 不起 debug 版 GUI（和正式版同一个 identifier，会碰真库）；⛔ 不用真库的内容截图给别人看（这一份只给 Ocean 自己看，但照样用演示 / 实验库）。
   - 「补上」的做法：在 `tailwind.config.js` 里加 `accent-soft`。要让 `/40` 那种写法也生效，可能需要在 `tokens.css` 里给两套主题各加一个 `--accent-soft-rgb` 通道值 —— `tokens.css` 的裸 `:root` 是 §10.6 红线管的文件（「经典版 = 发布版本身」）：**只许加新变量、不许改任何已有的值**，并且在给 Ocean 看效果图时把这一点说出来。截图做完之前不提交这一半。
2. **问 Ocean**：把截图（放在 scratchpad，或用 SendUserFile 发给他）和一句话的取舍一起给他：
   - 删掉：界面一个像素不变，代码说实话；
   - 补上：截图上那些地方会多一块淡琥珀底；P9B 做深色时还要给它配一个深色值。
   他定了再做：**删掉** = 那 27 处类去掉（不碰那 4 处 `var(--accent-soft)`）；**补上** = 提交上面那一半，把 15 处都过一眼确认没有哪里糊成一片。等他回答的时候接着做 F4 往后，不要停工。

**不做：** 不碰那 4 处直接用变量的；不改 `--accent-soft` 的颜色值；深色值是 P9B 的事。

**验收：** 删掉 ⇒ `grep -rn "bg-accent-soft" src` 为空，截图和现在一模一样；补上 ⇒ Tailwind 产物里有 `.bg-accent-soft`，Ocean 看过截图点了头，经典版其它地方一个像素不变。回执里写 Ocean 选了哪个、原话。

---

### F4 · 捕捉浮窗三件（原 `DISCOVERED-20261002-3` 甲、`-20261002-4` 甲、`-20261002-5`）

**现在：**
1. **长按卡上的 ⌘Z**：`CaptureOverlay.tsx:1071–1074` 批注框的 `onKeyDown` 不分卡片种类，框空着就 `onUndo()` ⇒ 主窗 `runUndo()` 撤撤销环最上面那一条。长按卡还没有块（`blockId` 是空串，`useCapture.ts` note-trigger 那一支），所以撤的是之前另一件事（上一次捕捉、一次删除……），写到一半的正文跟着卡片没了。长按卡和双击卡走同一个显示命令，卡拿不到键盘时 `capture.rs:1434–1436`（`show_capture_overlay` 里 `!will_activate` 那一支）照样注册全局 ⌘Z；`on_overlay_shown` 在 AXFrontmost 被拒时也会补注册（`capture.rs` 那一支）。长按卡的正文框（`:980` 起的 `onKeyDown`）没有 ⌘Z 分支，不会触发。
2. **× 的提示**：`CaptureOverlay.tsx:940–941` × 按钮 `onClick={dismissToast}`（`:852`：先 `flushPendingNote()` 存下再关），`title={tr('关闭 (Esc)')}`、`aria-label={tr('关闭')}`；而 Esc 走 `cancelNote`（`:882`，丢掉）。两种卡都这样。长按卡左下角另有「放弃」（`:1153`）。
3. **提示卡顶掉捕捉卡**：`CaptureOverlay.tsx:407` 的 `OVERLAY_NOTICE_EVENT` 监听直接换内容，没先 `flushPendingNote()`（显示新卡的 `OVERLAY_SHOW_EVENT` 那一路 `:367` 有）。卡上写着的批注 / 长按正文留在 ref 里，直到下一次捕捉才存，Spool 退出前没再捕捉就丢。触发：卡开着时又触发一次捕捉、但这次失败（剪贴板里没有能捕的东西 / 没有目标 / 出错）。

**要做（Ocean 第 81、82 条都选甲）：**
1. 长按卡：空的批注框里按 ⌘Z **什么都不做**（框里有字时照旧是撤销打字，交给输入框）。长按卡**不注册全局 ⌘Z**：`show_capture_overlay` 那一支和 `on_overlay_shown` 补注册那一支都按「这是长按卡」跳过（payload 里有 `noteMode`）。双击卡的行为一个字不变。
2. ×：行为不变（存下再关），提示改成「存下并关闭」（英文如 `Save and close`），两种卡一样；`aria-label` 跟着说实话。
3. 提示监听里先 `flushPendingNote()` 再换内容。

**红线：** §10.6「`on_overlay_shown` 里补注册全局 ⌘Z 那一支**不许删**」—— 不删，只让长按卡不走它；双击卡（那条红线护的对象）照旧。回执里写清楚。

**不做：** 不改 Esc、Enter、「放弃」「撤销」按钮的行为；不改双击卡上 ⌘Z 的任何一条路。

**验收：** 能写单元测试的写（比如把「这张卡该不该抢 ⌘Z」抽成一个判断函数测）；浮窗只能真手指，进 §6 验收单第 4 – 6 条。

---

### F7 · 主窗打开时的默认大小跟着屏幕走（新，`DISCOVERED-20261011-1`）

**Ocean 原话（第 85 条）：** 「spool打开后的默认长宽比不对，现在近似一个正方形，不好看，需要改成和电脑窗口一致的长宽比，并且放大，保留小部分缝隙」

**现在：**
- `tauri.conf.json:18–21`：主窗 `1600 × 1000`，最小 `860 × 560`，没有 `center`。窗口状态不保存（每次启动都回到这个大小）。
- 启动时 `lib.rs:701` `fit_main_window_to_work_area`：先看 1600 × 1000 装不装得下这块屏幕的可用区域（去掉菜单栏和程序坞），**装得下就直接返回**（`:716`），什么都不动；装不下才缩到可用区域那么大、居中。
- Ocean 的机器（10-11 只读查的）：外接屏 2560 × 1440（可用 2560 × 1352，是主屏）+ 笔记本 1512 × 982（可用 1512 × 950）。主窗开在外接屏上 ⇒ 1600 × 1000 装得下 ⇒ 原样 1600 × 1000（16:10），在一块 2560 宽的屏上显得又小又方。笔记本上会被缩成大约 1512 × 879。
- 版面会跟着窗口变宽：左右两栏有上限（`src/lib/layout.ts`：左栏 ≤ 300、右栏 ≤ 480，默认 340），多出来的宽度都给中间。

**要做：**
1. 启动时，不管装不装得下，都按主窗**所在那块屏幕的可用区域**定大小：宽和高**按同一个比例**取（所以长宽比和这块屏幕的可用区域一样），四周留一圈小缝，居中。缝的大小施工时定一个起始值（比如每边约 4%：外接屏上左右各约 100 点、上下各约 54 点；笔记本上左右各约 60 点、上下各约 38 点），截图给 Ocean 看两块屏上的样子，他验收时可以说大一点 / 小一点。
2. 最小 `860 × 560` 照旧是底线。
3. 只在**启动时**定一次：从托盘重新打开主窗、或者用户自己拖过大小之后，不再改。
4. 冷启动不要让人看到窗口先是 1600 × 1000、再跳成新大小（看一下主窗是不是一开始就显示；要的话先不显示、定好大小再显示，或者直接在建窗口时就用算好的大小）。
5. 宽屏变宽之后看一眼中间那一栏：正文是不是被拉成很长的一行难读（块正文有没有最大宽度）。有问题记成 DISCOVERED 问 Ocean，不顺手改版面。
6. Windows 走同一个函数（可用区域去掉任务栏）；本机编不了 Windows，回执里写清楚 Windows 那一半没跑过。

**不做：** 不保存窗口大小 / 位置（那是另一件事）；不改三栏的宽度规则；不改最小尺寸。

**验收：** 能抽出来的计算（给可用区域和缝的比例，算出大小和位置）写单元测试；真机截图两块屏各一张；进 §6 验收单第 7 条。HANDOFF §10.1 的 C-e（「更多空间」档下窗口不变）随这一步作废 —— 已经在第 86 条关掉了。

---

### F6 · 用 Codex 跑跟进，必须能写回（原 `DISCOVERED-20260924-1`，Ocean 第 80 条：先验证甲；**不允许只读**）

**现在：**
- `engine.rs:761–781` `codex_config_overrides`：给 Codex 传 `approval_policy="never"`、`tools.web_search`、`mcp_servers.spool.command/args/enabled_tools`（`ALLOWED_TOOL_NAMES`，等于 Spool 的全部 22 个工具）。`codex_args`（`:887`）还带 `--ignore-user-config`、`--sandbox read-only`、`--json`。测试：`codex_args_isolate_the_run_from_the_users_own_config`（`:1795`）、`codex_config_quotes_a_path_as_toml`（`:2040`）。本机 codex 是 0.147.0。
- 2026-09-24 取证（`~/.codex/sessions/2026/09/24/rollout-2026-09-24T14-22-56-…jsonl` 第 40 行）：`close_follow_up_item` `"readOnlyHint":false`，`"status":"failed"`，`"error":"user cancelled MCP tool call"`，耗时 0 秒，没到 Spool。
- P9A 翻了 Spool 起过的全部 `codex exec` 会话（第一行 `originator` = `codex_exec` 的）：只有 09-24 那一次调过写工具；**`propose_blocks` 在 Codex 引擎下一次都没被调过**。8 月那几次写成功的是 `originator` = `Codex Desktop`（有人在旁边），不能拿来比。
- 已装 codex 二进制里（`strings`，没运行）有按 MCP 服务器设的 `default_tools_approval_mode`，和 `enabled_tools` / `disabled_tools` 在同一层；还有每个工具的 `approval_mode`。取值和效果都**没验证**（字符串里看到 `auto` / `prompt` / `approve` 一类的词）。
- Claude Code 引擎那边，22 个工具本来就全部预先放行（`--allowedTools`）。

**要做：**
1. **先验证，不改代码。** 用已装的正式版 Spool 二进制当 MCP 服务器、连一份**真库的副本**（`VACUUM INTO` 到 scratchpad，用 `-c "mcp_servers.spool.env={SPOOL_DATA_DIR=\"<副本目录>\"}"` 指过去，做法见 `DESIGN_AI_ENGINE.md` §7.6 和记忆 `isolated-verify-workflow` §44），照 `codex_args` 拼一条 `codex exec`，外加 `-c mcp_servers.spool.default_tools_approval_mode=<取值>`。提示词直接点名：调 `close_follow_up_item`、`propose_blocks`、`add_block` 各一次，原样报结果。判据只看 `--json` 事件流里每个 `mcp_tool_call` 的 `status` / `error`，和副本库里是不是真多了东西（⛔ 别信模型自己的总结）。
2. **花费上限：** 这一步最多跑 **4 次** Codex（找对取值 + 一次确认）。Codex 报额度用完、要登录、或者 4 次里还没找到能写回的办法 ⇒ **停下来**，把试过什么、每次的原始结果写进回执，问 Ocean。
3. **验通了**：把那一行加进 `codex_config_overrides`，测试里钉住它（改一个字就红）；再用演示版或副本完整跑一次真正的「跟进」（这一次计在上限里），确认一条问题被关掉、一条提案进了待审面。
4. **验不通**：⛔ **不许退到「只读 + 说明」**（Ocean 第 80 条明确否了）；⛔ 不许把工具标成只读来绕（`mcp.rs` 那条测试注释禁止）；⛔ 不许用去掉沙箱的开关（`--dangerously-bypass-approvals-and-sandbox` 一类）—— `--sandbox read-only` 是 Codex 那一槽唯一的安全闸。把其它还能试的办法（比如每个工具单独设 `approval_mode`、换 `approval_policy` 的组合）列成甲乙丙，写清好处和代价，停下来问 Ocean。

**不做：** 不改 MCP 的工具、描述、annotations；不改 Claude Code / Gemini 那两槽；不碰真库（验证只用副本）。

**验收：** 验证那几次的原始事件流存在 scratchpad，回执里写清每次传了什么、结果是什么、花了几次；单元测试钉住新加的那一行；进 §6 验收单第 8 条（Ocean 自己用 Codex 跑一次跟进）。

---

### F9 · 10 份已经做完的设计稿挪进 `archive/`（P9A 第 5 件，Ocean 第 84 条选甲）

**现在（P9A 核过，证据在 P9A 回执 §7.2 D）：** README §三「产品设计稿（还有没做完的格）」13 行里，下面 10 份其实早就全做完了：
`DESIGN_AI_ENGINE.md`、`DESIGN_CONTEXT_HYGIENE.md`、`DESIGN_FOLLOW_UP.md`、`DESIGN_MCP_INTENT_ROUTING.md`、`DESIGN_MCP_WRITE_ROLE.md`、`DESIGN_PROJECT_FILES.md`、`DESIGN_WORKBENCH.md`、`DESIGN_WORKSPACE_PACK.md`、`COMPRESS-UX-R2-2026-08-22.md`、`FEEDBACK-FORM-2026-08-22.md`。
其中几份自己的首屏还写着「未开工 / F 仍未开工 / §7 未提交」。代码里约 180 个文件、在用的文档里约 90 处按文件名提到它们。

**要做：**
1. 10 份都 `git mv` 进 `docs/archive/`。每份首屏加一行：「已全部落地（日期，见 P9A 回执 §7.2 D），2026-10-11 移进 archive，只供查当初为什么这么定」。别的字一个不改。
2. `docs/README.md`：§三 删掉这 10 行；`DESIGN_WINDOWS_PORT.md` 那一行改成「首版随 v0.6.0 / v0.6.1 发过；不签名是 Ocean 定的（红线，不再问）；下一次 Windows 包在发版二（第 73 条）」；`WINDOWS-CHECK.md` 那一行改成「第三、四轮还没装机验；发版二前先从 `main` 手动跑一次 `windows-build`，再照这份装机验（P1 – P9 的 Windows 部分还没在 Windows 上跑过，见 HANDOFF `DISCOVERED-20261010-9`）」；§六「已落地的设计稿」那一行加上这 10 份。只暂存自己改的这几行。
3. `docs/HANDOFF-2026-09-04.md` 里**按路径**提到它们的地方改成 `archive/…`（§10.6 红线表「全稿」那一列等）；只写了文件名、没写路径的不改。
4. 代码注释一个不改（按文件名搜得到）。
5. ⛔ 不碰 `docs/CODEX-HANDOFF-STAGE0A-D2-REVIEW-2026-09-03.md`（第 1163 – 1168 行也列着这几份，Ocean 第 84 条：留给研究线）。在 HANDOFF §9.9 记一行提醒：那几行的路径和状态要研究线改。

**验收：** `ls docs/*.md` 里不再有这 10 份；`docs/archive/` 里有，首屏那一行在；README §三 只剩 `DESIGN_WINDOWS_PORT.md`、`WINDOWS-CHECK.md`、`DESIGN_CASE_STUDY.md`。

---

## 4. 什么时候停下来问

- 起点不是 §2 写的那样；「现在」一栏和代码对不上。
- 任何一步要动库结构、pack 格式 / golden、MCP 的工具 / 描述 / 输出。
- F5 的锁走不通，要给产品函数加参数。
- F6：到了 4 次上限、额度用完、或者验不通（按 F6 第 4 条列选项问）。
- F8：截图做完，问 Ocean 删还是补。
- F7：宽屏下正文变得很难读、或者冷启动避免不了跳一下。
- 发现新问题：不顺手修，记进 HANDOFF §9.9，继续做。

## 5. 做完之后：换装给 Ocean 验收（先问）

- 九步都提交、全部测试通过之后，**先问 Ocean「现在换装吗」**，得到同意再做。这一次**不改库结构**，真库仍是 v33。
- 换装照 P9 任务书回执里「换装」那一段：构建日志进文件，`APPLE_SIGNING_IDENTITY` 走环境变量、不改 `tauri.conf.json`；停 GUI 和 `--overlay` **按 pid**，`--mcp` 一个都不碰；旧包挪进 `~/Desktop/Spool/spool-pre-install/`；换装前 `VACUUM INTO` 备份真库到桌面；换装后核 sha256、两个进程是新文件、`[double-tap] installed at HID/active`、真库各表计数装前装后一致。TSA 偶发失败就整个重跑。
- commit、build、换装分开记在回执里；**不 push、不发版**。

## 6. 给 Ocean 的验收单（大白话，换装后给）

1. 打开任意一个项目，删掉最下面（编号最大）那一块；在主窗输入框里敲一句、回车；再双击这一句改一下它的批注；然后按 ⌘Z 两次 ⇒ 第二次时删掉的那块回来了（编号可以和原来不一样）。
2. 「申请帮助」项目的 #13：双击它，把正文最后那一行 `---` 删掉（这一块是以前的压缩留下的，修好之后不会再有新的）。
3. 设置里把语言切成英文：全库搜索搜一个批注里有的词，结果上的小标签写 Note；打开一块的编辑面板，批注框上面也写 Note；项目里按 ⌘F，鼠标停在关闭按钮上是英文。
4. 长按 ⌥ 弹出卡片，点一下批注框（空着），按 ⌘Z ⇒ 什么都没发生，上一次捕捉的块还在。
5. 双击 ⌥ 捕一条，鼠标停在卡片右上角 × 上 ⇒ 提示是「存下并关闭」；在批注框里写一句，点 × ⇒ 那句批注存进去了。
6. 双击 ⌥ 捕一条，在批注框里写一句先别关；再让下一次捕捉失败一次（比如剪贴板是空的时候再双击 ⌥）⇒ 出现一张提示卡，同时刚才那句批注已经在那一块上了。（「让捕捉失败一次」最简单的做法，执行窗换装前自己试出来，写成一步一个动作再给你。）
7. 退出 Spool 再打开 ⇒ 主窗几乎铺满屏幕、四周留一圈小缝、长宽比和屏幕一样，外接屏和笔记本各看一次（把主窗拖到另一块屏上不算 —— 要在那块屏是主屏时启动）。缝要大一点还是小一点，直接说。
8. 设置 → 引擎选 Codex，挑一个有跟进问题的项目跑一次「跟进」⇒ 查到答案的问题被关掉；如果它提了东西，待审面里能看到。（会花你一次 Codex 额度）
9. 淡底色：按你在 F8 定的 —— 删掉的话界面和现在一样；补上的话截图里那几处多了淡琥珀底。

你只要告诉我：哪几条不对，不对的那条你看到了什么。

## 7. 回执（执行窗填写）

每步一小段：提交（hash + 标题）· 改了哪些文件 · 怎么验的（命令 + 结果）· 施工时自己定的（F2 选的改法、F4 的英文措辞、F7 的缝的大小、F6 用的取值）· 还差什么、有没有偏离本任务书、新发现记在哪。
F6 另写：每一次 Codex 运行传了什么、事件流里每个工具调用的结果、副本库里多了什么、一共跑了几次。
F8 另写：截图在哪、Ocean 选了哪个、原话。
最后一段：换装（做了没有、装的是哪个 commit、`spctl` 结果、真库备份文件名、计数核对）、Ocean 验收（还没有就写「待验收」）。


### 7.1 开工

- 起点：`git log -1` = `a9cd19c`（`docs: 下发 P9F`），上一笔 `e58e5b3`，和 §2 一样。
- 测试基线和 §2 一样：tsc 干净；vitest 85 / 1016；cargo 190 · 5 跳过；sidecar 14；`(none missing)`；`--dead` 87；`cargo tree` 空。

### 7.2 九步（按 §3 的顺序做；每步一笔提交，提交后都跑了 §5 的署名自查）

**F5 · `147bdd9`** `fix(test): 读 HOME 的测试和改 HOME 的那一条共用一把锁`
- 改了：`lib.rs`（只在测试里存在的 `home_lock()`，被 panic 毒过也照样能拿）、`mcp.rs`（改 HOME 的那一条整段拿锁、那句错注释改掉）、`engine.rs`、`file_identity.rs`（各一行拿锁）。产品代码一行没动。
- 验：只挑那几条连跑 150 遍：改前红 19 遍（全是 `candidate_paths_…`，`engine.rs:1735`），改后 0 遍；全套连跑 10 遍全过，190 · 5。
- 和「现在」一栏不一样的地方：真正读两次 HOME 的只有 `candidate_paths_cover_the_version_managed_install_dirs` 和 `knows_the_trash_and_an_unplugged_disk`；两条路径闸测试和截图那一条自己带规则 / 目录、不读 HOME，所以没拿锁。

**F1 · `9347b36`** `fix: 删掉最新那块之后又来了一块新的，⌘Z 照样撤得回来；删掉没人用的 updateBlockThread`
- 改了：`blocks.ts` 的 `restoreBlock` 在 INSERT 里判：旧号还空着就用旧号，被占了（或 NULL）就拿 MAX+1；「移动」那一支的两步绕法改成直接调它（只剩一套）；两处错注释（`blocks.ts`、`schema.sql`，只改注释）；删掉 `updateBlockThread`。
- 屏幕上的编号：`runUndo` 之后 `blocksStore.load` 本来就从库里整份重读，不用补。
- 验：新测试 `undoRestoreNumber.test.ts`（真 SQLite，走 ⌘Z 调的同一个 `runUndo`）：对照组 + 三种触发，改前三种都 `UNIQUE constraint failed`、对照组绿，改后四条绿（块回来换成 #4、文件挂回原块）。`grep -rn updateBlockThread src` 空。

**F2 · `5fc8f83`** `fix: 压缩后「用这一份」不再把 pack 的那行 --- 写进最后一块`
- 选的改法：`skeleton.ts` 加 `stripPackRule`（按「压缩前那一块里有几个 `---`」减，只去掉末尾多出来的那一行），`draftWrites` 先过它。**没**让 `FIXED_LINES` 认 `---`：那张表剔掉的行会报「有 n 行是 Spool 自己印的说明」，每压一个没有文件的项目就会冒一句（`compressStore.boundary.test.ts` 本来就钉着只有一句 notice）。pack 格式、`assemble.ts`、golden 没动。
- 验：`skeleton.test.ts` +3、`compressStore.packRule.test.ts` 2 条（真库写回，改前两条都红）；压缩那几份测试照样绿。
- 真库「申请帮助」#13 没碰，留给 Ocean（§6 第 2 条）。

**F3 · `47c4d5b`** `fix(i18n): 英文界面三处 + 字典检查看得见捕捉浮窗的 tr()`
- 改了：`ProjectFindBar.tsx` 两处走 `t()`，字典加「关闭查找 → Close find」；「批注」改成 Note；`i18n-check.mjs` 正则改 `\bt[rs]?\(`，`scan()` 多两个默认参数（只给它自己的测试用）；`i18n-check.test.mjs` 补一条（改前红）。
- 验：`(none missing)`；临时删掉只有浮窗用的「固定窗口」⇒ `MISSING 固定窗口 src/overlay/CaptureOverlay.tsx`、退出码 1，已恢复；`--dead` 87。

**F8 · 第一半没提交（补上那一半的效果图）· 第二半 `68a4c2b`** `chore(ui): 删掉那 27 处从没生效过的淡底色类`
- 开工时数：27 行 / 15 个文件，和「现在」一栏一样；另 4 处 `var(--accent-soft)` 没碰。
- 「补上」怎么做的：`tailwind.config.js` 加 `accent-soft`、`tokens.css` 两套主题各**加**一个 `--accent-soft-rgb`（已有的值一个没改，给 Ocean 看图时说了）。改前改后两份 css 逐条比：只多 `.bg-accent-soft`、`.bg-accent-soft/40`、`.hover:bg-accent-soft` 三条规则和两个新变量。这一半存成补丁、工作树恢复，没提交。
- 截图（真组件、Spool 自己构建的样式、和 app 同一个 WebKit；内容是编的，不是真库）：27 处截到 26 处，另加情人节版两张总览，共 23 页 PDF：`scratchpad/f8/P9F-F8-accent-soft.pdf`（单张在 `scratchpad/f8/shots/`；scratchpad = 这一窗的 `/private/tmp/claude-501/-Users-hzjin-Desktop-Knote/b9ce420f-c37a-436f-a14c-a57c864886c3/scratchpad/`，会话结束后可能被清掉）。
  - 静态渲染（记忆 §45）：设置三组、运行卡两处、正在跑、两个打包对话框、项目顶栏两处、待审面五种卡、跟进面板开关、左栏待审按钮、压缩页两处、多选方框。
  - 要点开才出现的：自己写了一个只在 scratchpad 的小页面，把真组件挂上去、Tauri 那一层换成一个假的桥，再用脚本真的点开 —— 编辑面板（格式那一档、完成）、划词更正表单、「复制到…」查重那一步（假桥替 Rust 回答 `forward_duplicate_check`）、查找时刻度旁的预览卡；捕捉卡是从 vite 加载真的浮窗页面、用假桥送一次 show。
  - 截不到的 1 处：右栏「AI 提了几条等你过目」那一行，只有鼠标停上去才有底色。
  - 顺带撞到的：这一窗没有「屏幕录制」权限，`screencapture` 截别的进程的窗口是空白（所以没用记忆 §43 的截法）；离屏的 WebKit 不跑 CSS 动画和 requestAnimationFrame（捕捉卡的入场动画在截图页里关掉了，它的最后一帧就是正常样子）。
- Ocean 选了哪个、原话：先回「我没看到截图，再显示一遍」，用「预览」在他电脑上打开、重发 PDF 和三张样例图之后，答「**删掉**」。
- 删掉：15 个文件里这 27 处类名去掉；ScaleRail 两句注释「描边和底色」改成「描边和阴影」（底色从来没有过）。验：`grep -rn "bg-accent-soft" src` 空；重新构建的 main / overlay 两份 css 和改前逐条一致；15 张静态渲染改前改后逐像素一样（屏幕缩放中途从 2× 变成 1×，所以是同一缩放下重新渲染旧代码再比的）。

**F4 · `14202ee`** `fix(capture): 捕捉浮窗三件`
- ① 长按卡：空批注框 ⌘Z 什么都不做（`noteBoxUndo.ts`）；Rust `card_claims_undo(will_activate, note_mode)` + `NOTE_CARD`，`show_capture_overlay` 和 `on_overlay_shown` 两处补注册都按它判，长按卡跳过。⛔ 红线那一支（`on_overlay_shown` 补注册）**没删**，双击卡照旧走它，双击卡上 ⌘Z 的每条路没变。
- ② × 的提示：「存下并关闭」，英文 `Save and close`，`aria-label` 一样；行为不变。
- ③ 提示监听先 `flushPendingNote()` 再换内容。
- 验：`noteBoxUndo.test.ts` 2 条、Rust 1 条；浮窗交互只能真手指（§6 第 4 – 6 条）。
- 改完后第一遍 cargo 全套有 2 条红，没抓到是哪两条；之后连跑 43 遍全过。记成 `DISCOVERED-20261013-3`。

**F7 · `a651648`** `feat(window): 主窗打开时的大小跟着屏幕走`
- 改了：`lib.rs` 的 `fit_main_window_to_work_area` 每次启动都按主窗所在那块屏幕的可用区域定大小（整个窗口每边让出 `MAIN_WINDOW_GAP` = 4%，宽高同一个比例），居中，最小 860 × 560 照旧；计算抽成 `main_window_size` / `centred` 两个纯函数 + 测试。只在 `setup` 里跑一次；不保存窗口；`tauri.conf.json` 没动。
- 缝的起始值：4%。外接屏（可用 2560 × 1352）上左右约 102 点、上下约 54 点；笔记本（1512 × 950）上左右约 60 点、上下约 38 点。
- 冷启动：`setup` 在事件循环 Ready 回调里、窗口建好后马上跑，第一次画之前大小已经定了（08-21 起缩小那一支就在这里跑），所以没改成「先隐藏再显示」；这一条只能靠 Ocean 冷启动时看（§6 第 7 条）。截图没做：这一窗截不到别的进程的窗口（见 F8）。
- 宽屏下中间那一栏会到约 1700 像素宽、块正文没有最大宽度（一行约 100 个汉字）：记成 `DISCOVERED-20261013-2` 问了 Ocean，他答「先不管，验收时看」。
- Windows 走同一个函数，本机编不了 Windows，那一半没跑过。

**F6 · `0669190`** `fix(engine): 用 Codex 跑跟进能写回了 —— 给 Spool 自己的工具预先放行`
- 取值先免费探（不花额度）：`codex mcp get` 喂一个错值，报错列出 `auto` / `prompt` / `writes` / `approve`；每个工具单独的 `approval_mode` 也认同样四个。
- 真跑（codex-cli 0.147.0；MCP 服务器是已装的正式版 `--mcp`，`SPOOL_DATA_DIR` 指向 scratchpad 里真库的 `VACUUM INTO` 副本；判据只看 `--json` 事件流里 `mcp_tool_call` 的 `status` / `error` 和副本库）：
  - 没算的一次：第一次起的时候 stdin 是开着的，codex 一直「Reading additional input from stdin」，一个事件都没出、没开始，按 pid 停掉了；Spool 自己起 codex 时 stdin 是 null。
  - 第 1 次（13:36 UTC）：照 `codex_args` 拼、加 `default_tools_approval_mode="approve"`，提示词直接点名三个写工具 ⇒ `close_follow_up_item` / `propose_blocks` / `add_block` 都 `completed`；副本里那条问题变成 answered、多 1 批 1 条提案、多 1 块（#13，来源 `Codex · MCP`）。
  - 第 2 次（13:37 UTC，对照）：同样的提示词、**不带**这一行、新副本 ⇒ 三个都 `user cancelled MCP tool call`，副本一字没变。
  - 第 3 次（13:39 – 13:41 UTC，确认）：改过的代码生成的参数原样跑一次真正的「跟进」（`guidance_text_headless` 的无人值守提示词、联网，项目〈Fall 2027 国际生政策风险台账〉）⇒ 读了一圈之后 `propose_blocks` 5 条进待审面、`close_follow_up_item` 收掉一条问题，都 `completed`。提示词和参数是用一个只在工作树里临时加、跑完就删的 ignored 测试打出来的，没进提交。
  - 一共 3 次真跑（上限 4）。原始事件流：`scratchpad/f6/run-1.jsonl`、`run-2.jsonl`、`run-3.jsonl`。
- 代码：`codex_config_overrides` 加那一行；`codex_args_isolate_the_run_from_the_users_own_config` 整串钉住（先加断言跑红、再改代码跑绿）。`--sandbox read-only` 照旧，没用去沙箱的开关，工具没标只读，MCP 没动。
- 「现在」一栏写的 22 个工具现在是 24 个（P6 加了两个），不影响这一步。
- 提交自查那条宽 grep 命中了正文里的「Claude Code」（产品里引擎槽的名字），窄版干净、作者是 KIM-ocean-HZ，没 amend。

**F9 · `18b9429`** `docs: 10 份已经做完的设计稿挪进 archive`
- 10 份 `git mv` 进 `docs/archive/`，每份标题下面加一行「已全部落地（日期，见 P9A 回执 §7.2 D）。2026-10-13 按 Ocean 10-11 的决定移进 archive …」—— 和任务书模板差一处：写的是实际挪的日期 10-13，不是 10-11。
- README：§三 只剩 `DESIGN_WINDOWS_PORT.md`、`WINDOWS-CHECK.md`、`DESIGN_CASE_STUDY.md`（前两行照任务书改），§六 加上这 10 份；只暂存了自己的行。
- HANDOFF：§10.6「全稿」那一列改成 `archive/…`；只写了文件名的两处没改；§9.9 记 `DISCOVERED-20261013-1` 的提醒（Codex handoff 那几行留给研究线）。Codex handoff 没碰。

### 7.3 收尾的测试数字

tsc 干净；vitest 88 个文件 / 1028 条（+3 个文件 / +12 条）；cargo 192 · 5 跳过（+2）；sidecar 14；`(none missing)`；`--dead` 87；`cargo tree … | grep` 空。

### 7.4 换装（Ocean 2026-10-13 答「现在换装」）

- 构建：在 `68a4c2b` 上（`src` / `src-tauri` / `site` / `scripts` 没有未提交改动），命令和 P9 一样（`APPLE_SIGNING_IDENTITY` 走环境变量，`tauri.conf.json` 没改），日志进文件；「skipping app notarization」；TSA 一遍过（主程序和 `spool-ai` 都有 Timestamp）；`--verify --deep --strict` 过。二进制里有 `default_tools_approval_mode`；前端有「存下并关闭」「Close find」，css 里没有 `bg-accent-soft`。
- 新二进制的 `--mcp` 探针连 scratchpad 里的副本（没连真库目录）：24 个工具，`list_threads` 正常。
- 装前：Developer ID，`spctl` = `Unnotarized Developer ID`，0.6.2，`spool` sha256 `473b5288…`（P9 那版）。真库 v33 · ok · 14 / 51 / 1099 / 13（工作区 / 项目 / 块 / 文件）· 正文 334659 · 批注 13558 · 文件正文 143894 · 图片 4 张 764139 字节 · 跟进 19 · 待审 0；迁移快照 25 个。
- 停：GUI 30812 和 `--overlay` 30821 按 pid `kill -TERM`，第一次就退了。`/Applications` 那 15 个 `--mcp` 子进程一个没碰（前后同一组 pid）。
- 真库备份：`~/Desktop/spool.before-p9f-install-20261013-232228.db`（停了之后 `VACUUM INTO`），和活库逐项一致。
- 旧包挪到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261013-232228-pre-p9f.app`；新包 `ditto` 进 `/Applications`，`open --stdout … --stderr …` 起来。
- 装后：`--verify --deep --strict` 过；`spctl` = `Unnotarized Developer ID`；`spool` sha256 `74c7c73e…`，和构建产物一致；主进程 27752 和 `--overlay` 27843 都是 23:22:36（换装之后）起的，`lsof` txt inode 都是 80222695，就是新文件；stderr 只有 `[overlay] helper started` 和 `[double-tap] installed at HID/active` 两行。真库和装前逐项一致（这一次不迁移，快照仍是 25 个）。
- 那 15 个 `--mcp` 子进程还是旧二进制；库结构没变，它们照常能用。F6 改的是 Spool 自己起 Codex 的那条路，不在它们身上，不用重启客户端。
- commit、build、换装分开记在上面；没 push，没发版。

### 7.5 新发现记在哪

HANDOFF §9.9：`DISCOVERED-20261013-1`（Codex handoff 那几行要研究线改）、`-2`（宽屏正文没有最大宽度，Ocean：先不管，验收时看）、`-3`（cargo 一次 2 条红没抓到名字）。

### 7.6 Ocean 验收

**2026-10-14 通过**（原话「验收通过，提交」）。§6 九条没有报回来的问题；第 88 条那件（宽屏正文）他没再提，`DISCOVERED-20261013-2` 仍是 captured。

§6 第 6 条「让捕捉失败一次」的做法（照代码推出来的：双击 ⌥ 只在 10 秒内按过 ⌘C 时才算捕捉，剪贴板是空的就弹「剪贴板为空」那张提示卡；这一窗按不了真的双击 ⌥，没亲手试过）：
1. 随便选一句字，按 ⌘C，双击 ⌥ —— 弹出捕捉卡。
2. 在批注框里写一句，比如「测试批注」，先别关。
3. 点卡片右上角的锁（固定窗口）—— 这样等一下点别处，卡片不会自己收起来。
4. 在 Claude Code 的输入框里敲 `! pbcopy < /dev/null` 回车 —— 这一步把剪贴板清空。
5. 点一下桌面空白的地方（什么都别选中），按一次 ⌘C，马上双击 ⌥。
6. 看：卡片换成一张「剪贴板为空 — 先按 ⌘C 复制要捕捉的内容，再双击 ⌥」的提示卡；打开主窗，刚才那一块的批注是「测试批注」。

## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 验收`（验过后改成 `COMPLETE`），`git mv` 进 `docs/archive/product-taskbooks/`。
2. `docs/HANDOFF-2026-09-04.md`：§9.3「修补」那一行改成「已完成，任务书在 archive/…」；§9.8 唯一下一步写成「Ocean 按 §6 验收 P9F → 验收通过后 P9B 开工（任务书改成 `ACTIVE`、按它 §2 重核起点；F8 的结果写进去）」。
3. `docs/README.md` 入口表 ACTIVE 产品任务书那一行改成「暂无，待 Ocean 验收 P9F；之后 P9B」（只暂存这一行）。
4. 文档改动单独一笔提交（只 add 自己改的路径）。
