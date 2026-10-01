# 产品任务书 P1 —— 左栏（去沉睡 + 默认折叠 + 工作区归档）、项目内查找、两处小修

> **状态：COMPLETE（A0、A0b、A1）—— Ocean 2026-10-01 验收通过。A2、A3 没做，2026-10-01 按 Ocean 指令转入
> `docs/TASKBOOK-P1B-ARCHIVE-PROJECT-FIND-2026-10-01.md`，以那一份为准。** 回执在 §7。
>
> **唯一交付：** 下面 §3 的五条（A0、A0b、A1、A2、A3），按顺序做完、各自测试通过、各自一笔提交，并在 §7 写回执。
>
> **授权来源：** Ocean 2026-09-30 指令「恢复 app 层面的修复与改善」+ 同日对十条的逐条拍板
> （全文记录在 `docs/HANDOFF-2026-09-04.md` §9.2，本任务书只引用、不改）。
>
> **边界：** 只做这五条。不碰实验线（`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`）；
> 不动 `docs/EXECUTION_POLICY.md`；不改库结构（这五条都不需要）；不 push、不发版。
> 换装给 Ocean 验收之前先问一句（§5）。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：首屏、§9.0–§9.4（为什么做、Ocean 的拍板、路线图、TASKBOOK 规矩）、
   §10.6（红线速查 —— 动手前扫一眼）。
3. `CLAUDE.md` §3（只改该改的）和 §5（提交信息里不许有任何工具署名）。
4. 记忆 `ui-language-follows-system`（新文案中英都要有）、`no-test-environment-spool`（界面上不放开发者才用的东西）、
   `isolated-verify-workflow`（只有到 §5 换装那一步才需要）。
5. 每一条开工前，读该条「现在」一栏点名的文件。

## 2. 起点

- 分支：本地 `main`。开工时 `git log -1` 应该是 `44fc2cf`（或之后只多了 docs 提交）；不是就停下来说明。
- 2026-09-30 规划窗改的产品文档（本任务书、`docs/HANDOFF-2026-09-04.md`、`docs/archive/WORKPLAN-2026-08-22.md` 的移动、
  `docs/SPOOL_OVERVIEW.md` / `docs/PORTFOLIO_FACTS.md` / `docs/DESIGN_CONTEXT_HYGIENE.md` 里指向 WORKPLAN 的句子、`docs/README.md` 的一行）
  当时没提交。开工时若 `git status` 里它们还是未提交，**先问 Ocean 要不要先单独提交它们**，别和代码提交混在一起。
- ⚠️ 工作树里有**别人没提交的改动**（`docs/` 下研究线的文件、`docs/README.md` 等）。**只 `git add` 你自己改的文件的路径**，
  绝不 `git add -A` / `git add .` / `git commit -a`。
- 每条一笔提交，提交信息用中文、一行标题 + 可选正文，照最近几笔的风格（例：`fix(ui): …`、`feat(sidebar): …`）。
  提交后跑 `CLAUDE.md` §5 那条自查；命中产品内容里的 claude 字样按记忆 `attribution-grep-false-positive` 复核。
- 测试基线（开工前先跑一遍记下来，做完每条再跑）：

```bash
npx tsc -b
npx vitest run
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/sidecar/Cargo.toml   # A0 之前它编译不过，这是预期
node scripts/i18n-check.mjs                               # 看输出，别只看退出码
```

2026-09-30 下发时的已知现状：`node scripts/i18n-check.mjs` 报 1 条 MISSING（就是 A0b 那条）；sidecar 测试编译不过（就是 A0）。

## 3. 五条

### A0 · spool-ai 的测试修到能编译（HANDOFF §8 的 DISCOVERED-20260925-1）

- 现在：`cargo test --manifest-path src-tauri/sidecar/Cargo.toml` 报两个编译错 ——
  `E0063 missing field kind in initializer of Request`（`src-tauri/sidecar/src/main.rs:669`，测试辅助函数 `req()`）和
  `E0004 non-exhaustive patterns: &Envelope::Balance { .. } not covered`（`:683-685`）。起因是 `5894dbc` 给 `Request` 加了 `kind`、
  给 `Envelope` 加了 `Balance`，测试没跟上。app 本身不受影响，但这 13 条测试从 08-26 起没跑过（其中有「截断的回复必须报失败」那条）。
- 要做：补上测试里的 `kind` 字段和 `Balance` 分支，让 13 条重新跑起来；可以顺便给余额信封补一条测试。
- 不做：不改 sidecar 的产品代码。
- 验收：sidecar 测试编译通过且 13 条以上全过；主 crate 测试不受影响。

### A0b · 一条提示在英文界面显示中文（`20260830-17`，Ocean 09-30 批准）

- 现在：`src/components/Compress/StaleReview.tsx:225` 的调用写「……顶上去的那句「这一块已经被取代」比它本身还长。」，
  字典 `src/lib/i18n/index.ts:1377` 的键写「……已经被**整条**取代……」，差三个字 ⇒ 英文界面显示中文。
  `node scripts/i18n-check.mjs` 其实报了它（MISSING），只是这个脚本不在任何测试里，没人跑。
- 要做：
  1. 调用点改成和字典键一致（「整条取代」是 S1 统一过的叫法，以字典为准）。
  2. 让「每个 `t()` / `ts()` 的中文字面量都必须在字典里」进测试：加一条 vitest，做的事和 `scripts/i18n-check.mjs` 的 MISSING 判断一样
     （复用它的逻辑或把判断抽成可 import 的函数，**别另写一套规则**）。这样以后「vitest 全绿」就包含这一条。
- 验收：`node scripts/i18n-check.mjs` 输出 `(none missing)`；故意删掉字典里一个在用的键，新测试变红，恢复后变绿（回执里写你做过这一下）。

### A1 · 去掉「沉睡」，工作区默认折叠（HANDOFF §9.1 第 10 条）

- 来源：「去除沉睡这个功能，转而用默认折叠工作区，只展示最近打开的工作区项目（类似 vscode 的逻辑），保证左侧边栏的清晰。」
- 现在：
  - `src/lib/threads/dormancy.ts`：14 天没动、没截止、不是捕捉目标 ⇒ 沉睡（真库 47 个活项目里此刻 38 个是沉睡）。
  - `src/components/Sidebar/WorkspaceGroup.tsx` 的 `sortThreads` 把项目分成 fresh / dormant / done，组尾一行「沉睡 N 条」（约 302–326 行）。
  - 项目顶栏有一个「沉睡」标签（`src/components/ThreadView/ThreadHeader.tsx:380`）。
  - 工作区折叠是组件里的 `useState(false)`（`WorkspaceGroup.tsx:53`）—— 不记、默认展开。
  - 左栏顶上「最近」（3 个）和「聚焦」两节另有其事。
- 要做：
  1. 删掉沉睡：派生逻辑、组尾那一行、顶栏标签、字典里 `沉睡` / `沉睡 {n} 条` 两条、`dormancy.test.ts`（都是这次造出来的孤儿）。
     组内排序保持原 fresh 的规则：有截止的按截止，其余按最近更新，完成的在最后。
  2. 每个工作区默认折叠；**当前打开的项目所在的工作区（连同它的上层）自动展开**。
  3. 用户手动展开 / 收起的状态记住，重启后照旧。存法照 `railWidth`：放进 `src/stores/settingsStore.ts`（settings.json），
     存「展开着的工作区 id 列表」；读的时候丢掉库里已经不存在的 id。
- 不做：不动 `threads.status` 里的旧值 `parked`；不动「最近」「聚焦」两节；不做 F3 里的 C5。
- 验收（Ocean 手指，写进 §6）：见 §6 的 1–4。

### A2 · 工作区归档（HANDOFF §9.1 第 9 条；Ocean 09-30：按「项目全完成」自动推出来）

> 2026-10-01：本条没做，已转入 `TASKBOOK-P1B-…`，以那一份为准（那份对着 `f8828d7` 的代码重核过现状）。

- 来源：「一个工作区内所有项目都完成了，工作区应该进入 archive，不显示在列表里面。右键也可以强制把工作区移入 archive，所有项目随之完成。」
- 现在：`workspaces` 表没有归档字段（`src/lib/db/schema.sql:8`）；项目完成 = `threads.status='done'`（完成时的结论可以空）；
  工作区的树在 `src/lib/workspaces/tree.ts`；左栏右键菜单在 `WorkspaceGroup.tsx`（已有「移到…」）。
- 要做（**不改库**，归档是推出来的）：
  1. 判定：一个工作区的**整棵子树**（它自己和所有子工作区）里至少有一个项目，且这些项目全部完成 ⇒ 这个工作区算归档。
     空工作区不算；子树里只要有一个没完成的项目就不算。判定写成 `src/lib/workspaces/` 里的纯函数，配单元测试。
  2. 归档的工作区从左栏树里拿掉，放进左栏最底下一个默认收起的「归档」节（英文 Archive）。子工作区单独归档时，
     在归档节里显示它的上级路径（「上级 / 子工作区」）。归档节里能打开项目照常读。
  3. 右键工作区 →「归档」：确认框写清「这会把 N 个项目标为完成」，确认后把子树里所有没完成的项目标完成（结论留空）。
     这一整批要能 ⌘Z 一次撤回（接现有的撤销环，加一种操作类型）。
  4. **捕捉目标**：归档后捕捉目标不能留在一个已完成的项目上。确认框里说清捕捉目标会换到哪（建议：最近更新的一个没完成的项目），
     归档后照做。注意 `src/lib/db/threads.ts:219` 那条「自愈」只在**没有**捕捉目标时才动，管不到这种情况。
  5. 重新打开归档里的任何一个项目（现有的「重新打开」）⇒ 它的工作区自然回到树里。这就是「取消归档」，不另做按钮。
- 不做：不存归档标记；不给 MCP 加任何东西（完成的项目在 MCP 里怎么显示保持原样）。
- 真库提醒：09-30 只读查过，有 1 个工作区的项目已经全部完成 ⇒ 装上新版那一刻它会直接进归档。这是预期，验收单里要提前告诉 Ocean。

### A3 · 项目里的查找改成「本项目范围」（HANDOFF §9.1 第 4 条）

> 2026-10-01：本条没做，已转入 `TASKBOOK-P1B-…`。⚠️ 下面「现在」一栏有一处不准：↵ / ⌘G 并不是只在一块里跳，
> 已经会跳进下一块 —— 但走的是**全部工作区**的结果列表。更正写在 P1B 里。

- 来源：「cmd f 之后的整体搜索没问题，但是进入项目后的查找有问题，正常逻辑应该显示单个项目范围内的查找，不应该有块内查找这个功能。」
- 现在：⌘F（窗口内，`src/App.tsx:202`）和 ⌘⇧F（全局）都打开全库搜索面板 —— **这部分不动**。点一个结果进项目后，
  顶上挂 `src/components/Search/InBlockNavigator.tsx`（`src/components/ThreadView/LogView.tsx:184`）：输入框写「块内查找…」，
  ↵ / ⌘G / 上下键只在**这一块**里跳（`src/stores/searchStore.ts` 的 `startNavigation(blockId, hits, query)`）；
  旁边有「这一块 第 i / n 处」「本项目 X 处 · Y 块」「全部 X 处 · Y 块」三个数，列表列的是**全部工作区**的块。
- 要做：
  1. 查找条改成「在本项目里查找」：↵ / ⌘G / 上下键按块在时间线上的先后，在**本项目所有命中**之间跳（跨块），最后一处再按回到第一处。
  2. 计数只留「本项目 第 i / N 处」；删掉「这一块 第 i / n 处」和块内模式（组件名、占位文字、字典条目一起改，孤儿一起清）。
  3. 列表只列本项目的命中；改输入框里的词就在本项目里重新查。列表底下留一行「在全部工作区里搜这个词」，点了回全库面板。
  4. 跳到的块如果是折叠着的，要展开到命中那一处。
- 工程护栏：命中位置照旧走 `data-o` 偏移映射，**不许**用 `content.indexOf`（HANDOFF §10.6 工程护栏第二条）。
- 不做：全库搜索面板（⌘F 打开的那个）不动；⌘F 的键位不动。

## 4. 什么时候停下来问

- 起点不是 §2 写的那样；
- 某条做下去要改库结构、加 MCP 工具、改 pack 输出、或碰捕捉浮窗 —— 这五条都不该需要，需要了就说明任务书漏算了什么；
- 发现和 §3 描述对不上的现状（代码已经变了）；
- 发现新问题：**不顺手修**，按 HANDOFF §8 的 DISCOVERED 格式记进 HANDOFF §9 末尾，继续做本任务。

## 5. 做完五条之后：换装给 Ocean 验收（先问）

- 五条都提交、全部测试通过之后，**先问 Ocean「现在换装吗」**，得到同意再做。
- 按记忆 `isolated-verify-workflow`（尤其 §21「先看现装的是什么签名，看到什么用什么」、§40 换装三连坑）。
  这一批不改库结构，真库不会迁移；换装前照旧备份一次真库（`VACUUM INTO` 到桌面，文件名带日期）。
- commit、build、换装分开记在回执里；**不 push、不发版**。

## 6. 给 Ocean 的验收单（大白话，换装后给 Ocean）

1. 重启 Spool：左栏除了你正在看的那个项目所在的工作区，其余工作区全是收起的。
2. 点开另一个工作区，再重启：它还是开着的。
3. 左栏和项目顶栏里再也找不到「沉睡」两个字（中文、英文界面都看一眼）。一个很久没动的项目，照常在它的工作区里，没有消失。
4. 装上新版那一刻，有 1 个工作区已经不在列表里了 —— 它的项目本来就全部完成了，去左栏最底下「归档」里能找到它。这是预期。
5. 找一个只剩一个没完成项目的工作区，把那个项目标完成 ⇒ 这个工作区从列表里消失，出现在「归档」里。
6. 在「归档」里打开刚才那个项目，点「重新打开」⇒ 工作区回到列表里。
7. 右键一个工作区 →「归档」⇒ 确认框里的项目数对得上；确认后它进了归档；按 ⌘Z ⇒ 全部回来。
   如果它里面有「捕捉中」的项目，确认框会说捕捉目标换到哪，归档后双击 ⌥ 捕捉进的是那个项目。
8. 用 ⌘F 搜一个词，点结果进项目 ⇒ 顶上的查找条写的是「本项目 第 1 / N 处」；一直按回车，会依次跳过这个项目里每一块的每一处，
   最后一处再按回车回到第一处；列表里只有这个项目的块。
9. 界面切成英文，打开「查过期」那一页里一条「整条取代」的卡片（短块那种）⇒ 提示是英文，不是中文。

你只要告诉我：这九条里哪几条不对，不对的那条你看到了什么。

## 7. 回执（执行窗填写）

每条一小段：

- 提交：`<hash> <标题>`
- 改了哪些文件（一行一个）
- 怎么验的：命令 + 结果（vitest / cargo 的条数，i18n-check 的输出原文）
- 还差什么、有没有偏离本任务书、新发现记在 HANDOFF 哪里

最后一段：换装（做了没有、装的是哪个 commit、`spctl` 结果、真库备份文件名）、Ocean 验收（还没有就写「待验收」）。

### 回执（执行窗 2026-09-30 → 10-01 填）

**开工**：`git log -1` = `44fc2cf`，符合 §2。基线：`tsc -b` 干净；Vitest 63 文件 / 803 条全过；主 crate 141 过 · 4 跳过；
sidecar 编译不过（E0063 + E0004，正是 A0）；`i18n-check` 报 1 条 MISSING（正是 A0b）。和下发时写的完全一致。

**开工前的一笔**：`cb38212 docs: 切回产品线 —— HANDOFF 加 §9–§11、WORKPLAN 并入并归档、下发 P1 任务书`。
按 §2 问了 Ocean，他选「先单独提交，README 只提产品那一行」。README 用「HEAD 版本 + 只换那一行」造了一个 blob 放进暂存区
（`git hash-object -w` + `git update-index --cacheinfo`），研究线那几行原样留在工作区没提交。

**A0**
- 提交：`ef84e95 test(sidecar): 测试跟上 kind 字段和余额信封，13 条重新能跑`
- 文件：`src-tauri/sidecar/src/main.rs`（只动 `#[cfg(test)]` 里面）
- 做法：`req()` 补 `kind: String::new()`；`kind_of()` 补 `Envelope::Balance` 分支；加一条
  `a_balance_query_over_plain_http_is_refused_before_anything_is_sent`（钉住 https 闸排在「查余额」分支前面）。
- 验：sidecar 14 / 14 过（原 13 + 新 1），无警告；主 crate 141 过 · 4 跳过不变。

**A0b**
- 提交：`84f8b74 fix(i18n): 「整条取代」那条提示在英文界面显示中文；中文字面量查字典进 vitest`
- 文件：`src/components/Compress/StaleReview.tsx`、`scripts/i18n-check.mjs`、`scripts/i18n-check.test.mjs`（新）
- 做法：调用点补上「整条」两个字（任务书写「差三个字」，实际是两个）。`i18n-check.mjs` 的扫描抽成 `export function scan()`，
  命令行那段用 `process.argv[1] === fileURLToPath(import.meta.url)` 包住（照 `build-site-zh.mjs` 的先例），输出一字不变；
  新测试直接调 `scan()`，规则只有一套。另加一条「至少扫到一个调用」，防扫描坏了之后空过。
- 验：`node scripts/i18n-check.mjs` → `(none missing)`，退出码 0。**故意删掉字典里在用的 `'整条取代'` 那一行** ⇒ 新测试红，
  报 `src/components/Compress/StaleReview.tsx  整条取代`；从备份恢复（`cmp` 一致、`git diff` 为空）⇒ 绿。Vitest 64 文件 / 805 条。

**A1**
- 提交：`f8828d7 feat(sidebar): 去掉「沉睡」，工作区默认折叠、只展开当前项目所在的那一支`
- 文件：`src/components/Sidebar/WorkspaceGroup.tsx`、`src/components/Sidebar/index.tsx`、`src/components/ThreadView/ThreadHeader.tsx`、
  `src/lib/i18n/index.ts`、`src/stores/settingsStore.ts`、`src/lib/workspaces/open.ts`（新）、`src/lib/workspaces/open.test.ts`（新）、
  删 `src/lib/threads/dormancy.ts`、`src/lib/threads/dormancy.test.ts`
- 做法：沉睡的派生、组尾那一行、顶栏标签、两条字典键全删；组内排序 = 原来不沉睡那一档的规则。
  settings.json 新键 `expandedWorkspaceIds`（手动展开的工作区；读时类型不对就当空，库里没有的 id 不生效、下一次写的时候丢掉）。
  当前项目所在的工作区连同上层**派生**展开、不存（`workspaceChain`）；用户把这一支收起只在这一支不变期间有效。
- **两处任务书没写、执行窗自己定的（Ocean 10-01 验收时已看过，通过）**：
  ① 切到别的工作区里的项目时，原来自动展开的那一支会收回去（除非手动点开过）—— 照「只展示最近打开的」理解；
  代价是点下面工作区里的项目时，上面那一支收起、列表会往上挪。
  ② 新建工作区（左下 ＋、组上的 📁+）建好就展开 —— 不然默认折叠会把「+ 创建第一个项目」藏起来，📁+ 建在折叠的组里更是什么都看不见。
- 验：`tsc -b` 干净；Vitest 64 文件 / 806 条（+5 新、-4 删掉的沉睡测试）；主 crate 141 · sidecar 14；`(none missing)`。
- ⚠️ 过程：执行窗跑 `git rm` 删那两个文件被权限分类器拦了（判成「不可逆的本地删除」），Ocean 自己在输入框里跑了
  `! git rm …`。下一窗凡是要删 / 改名文件，提前请 Ocean 跑。

**新发现**：记在 HANDOFF §9.9（`DISCOVERED-20261001-1`、`-2`）。另：任务书 A3「现在」一栏有一处不准（见 A3 开头的说明）。

**换装（Ocean 10-01 明确指令「下面换装，我来验收」，装的是 A0–A1，A2/A3 还没做）**
- 构建：`f8828d7`，`env -u APPLE_ID … APPLE_SIGNING_IDENTITY="Developer ID Application: Hanze JIN (Q5Y5JRXZ58)" npm run tauri build -- --bundles app`
  （现装的是 Developer ID ⇒ 照用；没改 `tauri.conf.json`；公证变量全部 unset，日志里是「skipping app notarization」）。TSA 一次过。
- 装前：`codesign` = Developer ID、`spctl` = `Unnotarized Developer ID`、0.6.2；真库 v29（代码也是 29，不迁移）。
- 停：GUI pid 40075 + `--overlay` pid 40084 按 pid `kill -TERM`，一次就退；`--mcp` 子进程一个没碰。
- 真库备份：`~/Desktop/spool.before-p1-install-20261001-111607.db`（`VACUUM INTO`，integrity ok，v29，计数和活库一致）。
- 旧包：`mv` 到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261001-111614-pre-p1.app`；新包 `ditto` 进 `/Applications`。
- 装后：`--verify --deep --strict` 过、Developer ID、`spctl` = `Unnotarized Developer ID`；`/Applications` 里 `spool` 的 sha256
  `ac47d291…a55a79fb` 和构建产物一致；主进程 53200 起于 11:16:22（换装之后），`lsof` 的 inode 就是新文件；
  真库 v29 · 25 / 63 / 1013 / 1（工作区 / 项目 / 块 / 文件，含软删）· 正文总长 291894，前后一致。
- 没 push、没发版。

**Ocean 验收**：2026-10-01 回复「验收通过」—— 对应换装时给他的 7 条：§6 的 1、2、3、9，A1 自定的两处行为，双击 ⌥ 还能捕捉。
§6 的 4–8（归档、本项目查找）随 A2/A3 转入 P1B。

## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 验收`（Ocean 验过后改成 `COMPLETE`），移进 `docs/archive/product-taskbooks/`（目录不在就建）。
2. `docs/HANDOFF-2026-09-04.md`：§9.3 路线图 P1 那一行改成「已完成，任务书在 archive/product-taskbooks/…」；
   §9.8「唯一下一步」改成「按 §9.4 下发 P2」；`docs/README.md` 入口表里 ACTIVE 产品任务书那一行改成「暂无，待下发 P2」。
3. 这些文档改动单独一笔提交（同样只 add 自己改的路径）。
