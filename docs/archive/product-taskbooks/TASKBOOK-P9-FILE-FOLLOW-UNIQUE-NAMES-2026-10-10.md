# 产品任务书 P9 —— 文件挪了 Spool 跟着找到、右栏提示丢失；同一个工作区里不许重名

> **状态：COMPLETE。** 四步已提交（`7d6afd6` `10fef6a` `53486c3` `7efc7b5`），10-10 已换装（真库已迁到 v33），**Ocean 10-10 验收通过**。回执在 §7 末尾。
>
> **唯一交付：** 下面 §3 的四步（P9-1 – P9-4），按顺序做完，每一步测试通过、单独一笔提交，并在 §7 写回执。
>
> **来历：** P8 交付和验收时 Ocean 提的（2026-10-10），HANDOFF §9.2 第 54、56–62 条。原来路线图上的 P9（周回顾「活动」图表）连同深浅色改叫 **P9B**，这一份做完、验收之后再下发（第 59 条：「拆两份：先文件，后深色+图表」）。
> 正文从 HANDOFF §9.9 `DISCOVERED-20261010-1` / `-3` **搬过来**（HANDOFF 那边只留一行「已下发到 …」）。
> **「现在」一栏每一条都对着 `cc0f301` 的代码和真库只读查询核过。**
>
> **授权来源：** 都是 Ocean 自己的拍板，本任务书只引用、不改：
> - 第 54 条（重名）+ 第 62 条（他的澄清：「如果有两个重名的project，文件名相同会报错，所以一个工作区不能有一样名字的项目」）；
> - 第 57 条（P8 验收第一轮：文件挪走、标清楚、右栏主动提示）、第 58 条（老文件先自动找同名再问）；
> - 第 63–66 条（下发这一窗问的：批准 v33、空名字不算重名、撞名自动加「 2」、跟上之后右栏标一下）。
>
> **边界：** 只做这四步。
> - 不碰实验线：`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行。
> - 不动 `docs/EXECUTION_POLICY.md`。
> - **库结构只许改这一次：v33，只给 `attachments` 加两列**（第 63 条）。别的表、别的列一个不动；不加唯一索引（重名靠代码管，见 P9-1）。
> - **MCP 的工具、描述、输出格式都不改。** 库里的路径更新之后，`get_blocks` / pack 里印出来的自然是新路径，这是预期。`create_thread` 照旧**拒绝**重名（mcp.rs 里 R6 B-10 那条），⛔ 不改成加「 2」。
> - 不改 pack 的格式、不改 golden。
> - 深浅色、「活动」图表是 P9B 的事，这一份不碰。
> - 不 push、不发版。换装给 Ocean 验收之前先问一句（§5）。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：
   - 首屏、§9.0 – §9.4、§9.8 – §9.9；
   - §9.2 第 6、12、22–24、27–29、33–37、50、54、56–66 条；
   - §10.6 红线速查（「少用 emoji，一屏最多一个 ⚠️」那一行要照着做）。
3. `CLAUDE.md` §3（只改该改的）和 §5（提交信息里不许有任何工具署名）。
4. 上一份任务书：`docs/archive/product-taskbooks/TASKBOOK-P8-PACK-EXPORT-FILES-IMAGES-2026-10-10.md` §7 回执，尤其末尾「Ocean 验收 · 第一轮」：`8dc204a` 那三条**还没换装**，这一份换装时一起带上（§6 第 1–3 条）。
5. 文件那一摊的来历（只读回执，别重做）：`archive/product-taskbooks/` 里 P5（文件挂块、右栏一张表）、P6（AI 提议挂文件、路径闸、被取代的收在新文件下面）。
6. 记忆：
   - `spool-db-wipe-incident`：⛔ 迁移必须同抬 `mcp.rs` 的 `EXPECTED_SCHEMA_VERSION`；两条不碰真库的迁移验证法；⛔ 验迁移别起 debug 版 GUI；
   - `tauri-sync-commands-freeze-ui`：新 Tauri 命令一律 `(async)`；
   - `ui-language-follows-system`、`no-test-environment-spool`、`write-plainly-for-ocean`；
   - `isolated-verify-workflow`：§21 / §40 / §41 换装，§44 `--mcp` 探针连副本，§45 截图。
7. 每一步开工前，读该步「现在」一栏点名的文件。

## 2. 起点

- **分支和提交：** 本地 `main`。开工时 `git log -1` 应该是下发本任务书的那笔 docs 提交（标题以 `docs: 下发 P9` 开头），它的上一笔是 `cc0f301`。之后只多了 docs 提交也行；不是这样就停下来说明。
- **只提交自己的文件：** 工作树里有别人没提交的改动（`docs/` 下研究线的文件、`docs/README.md` 里研究那几行）。
  - 只 `git add` 你自己改的文件的路径，绝不 `git add -A` / `git add .` / `git commit -a`。
  - README 要改的话只暂存自己那一行：拿 HEAD 版本只换那一行，用 `git hash-object -w` + `git update-index --cacheinfo`。
- **删文件会被权限拦：** `git rm` 写给 Ocean，请他在输入框里用 `! git rm …` 跑；`git mv` 能自己跑。
- **提交：** 每步一笔，提交信息用中文。提交后跑 `CLAUDE.md` §5 那条自查；命中产品内容里的 claude 字样，按记忆 `attribution-grep-false-positive` 复核。
- **测试基线**（`cc0f301` 上实测；开工前先跑一遍对一下，每步做完再跑）：

```bash
npx tsc -b                                                # 干净
npx vitest run                                            # 81 个文件 / 969 条全过
cargo test --manifest-path src-tauri/Cargo.toml           # 176 过 · 4 跳过
cargo test --manifest-path src-tauri/sidecar/Cargo.toml   # 14 过
node scripts/i18n-check.mjs                               # (none missing)
node scripts/i18n-check.mjs --dead                        # 87 行 DEAD（基线噪声），只看你造出来的
cargo tree --manifest-path src-tauri/Cargo.toml -e normal | grep -iE "ureq|rustls|reqwest|hyper|openssl"   # 必须是空的
```

  Vitest 输出里那几十行 `[db] pre-migration backup FAILED … window is not defined` 是老噪声。Rust 警告基线是三条（`updated_at` 两条、`spawn_sidecar` 一条）。

- **真库现状**（10-10 只读查询，⛔ 别写库）：
  - `user_version` = 32；工作区 / 项目 / 块 / 文件 = 28 / 67 / 1097 / 13；
  - 活着的文件 13 个，**2 个不在原来的位置**，正好是两种情况，都拿来当实测例子：
    - HAI-Lecture3 的 `~/Desktop/Lecture 3 - Introduction to Natural Language Processing for HAI - 2.pdf`：10-07 14:07 被挪进了 `~/Desktop/HAI/`。Spotlight 按名字**只找到一份**（就是 `HAI/` 里那份）。证据在本任务书 §3 P9-3 前面的「查清的事实」。
    - 申请规划的 `~/Desktop/Fall_2027_美国申研完整方案_2026-08-07.pdf`：Spotlight 按名字找到**四份同名 PDF**（`~/Desktop/申请规划/`、`~/Downloads/`、`~/Documents/ChatGPT/申研选校规划/` 和它下面的 `qa_render/`）—— Spool 不能替他猜，必须列出来让他认。
  - **同名**：活着的项目里，同一个工作区内没有两个同名的（空名字也没有）；同一层的活工作区也没有同名的。⇒ 这一份**不用改已有数据的名字**。

## 3. 四步

### 共同的规矩

- **大白话，少用 emoji**：界面上的提示一屏最多一个警示符号，用图标不用 emoji（§10.6）。所有新字都要有英文。
- **Spool 只在两种时候动库里的路径**：用户自己点了「是这个 / 重新选位置」；或者记着身份的文件被系统认出来挪到了新地方。⛔ 不凭名字自己猜着改。
- **文件本身永远不动**：只读、只看，不移动、不复制、不删用户的文件。

### P9-1 · 同一个工作区里不许重名（项目 / 子工作区）

- **来历：** 第 54、62 条（Ocean：「一个工作区不能有一样名字的项目」），第 64 条（空名字不算），第 65 条（撞名时自动在后面加「 2」）。顺带关掉 `DISCOVERED-20261010-1`（只差大小写的子工作区导出时写进同一个文件夹）。
- **现在**（`cc0f301`）：
  - AI 那一侧已经有规矩：`src-tauri/src/mcp.rs` 约 4278 行 `create_thread` 里的 R6 B-10，同一个工作区里 `lower(trim(title))` 相同就**拒绝**。
  - 界面这一侧一处都没管：
    - `src/lib/db/threads.ts:97` `createThread(workspaceId, title = '')`（按 ＋ 建的项目一开始是空名字）；
    - `:122` `updateThread(id, patch)`：改名（`title`）和挪到别的工作区（`workspaceId`）都走它；
    - `:265` `restoreThread`（撤销删除）；
    - `src/lib/db/workspaces.ts:40` `createWorkspace`、`:71` `renameWorkspace`、`:116` `setWorkspaceParent`（拖成子工作区）、`:170` `restoreWorkspace`；
    - `src/lib/db/transfer.ts`：导入别的库时按 id 并进来，可能带进同名的。
  - 导出：`src/lib/pack/folder.ts` 的 `uniqueIn` 按原样比名字（大小写不同算两个），而 Mac 的盘默认不分大小写。
- **要做：**
  1. 一个规则、一个函数：给一个名字和同一层已有的名字，撞了就在后面加「 2」「 3」…（一个空格加数字）。
     - 比较时去掉首尾空白、**不分大小写**（Mac 的盘不分，导出的文件夹会撞）。
     - **空名字不算**（第 64 条）：「无标题」可以有好几个，导出时它们本来就带编号（`01-untitled.md`、`02-untitled.md`）。
     - 已经删掉的（`deleted_at` 不为空）不算。
     - 「同一层」：项目 = 同一个工作区里的项目；工作区 = 同一个父工作区下（或都在最顶层）的工作区。项目和子工作区之间不比。
  2. 用在上面「现在」列的每一处：新建、改名、挪到别的工作区 / 别的父工作区、撤销删除、导入别的库。
     - 是用户自己的动作（新建、改名、拖动）被改了名 ⇒ 弹一句提示，比如「这个工作区里已经有一个叫「X」的项目了，这个改叫「X 2」」（措辞施工时定，英文要有）。
     - 撤销删除、导入这种自动发生的 ⇒ 同样加「 2」，不用弹提示，回执里写清楚。
  3. `uniqueIn` 也改成不分大小写比（导出那一层再兜一次底：空名字的子工作区、以前留下来的数据）。
- **不做：** 不加唯一索引、不改库结构；不改 MCP 的 `create_thread`（它照旧拒绝）；不回头改已有数据（真库里没有重名的）。
- **验收（vitest）：**
  - 规则本身：撞了加「 2」，「X 2」也有了就「X 3」；`Notes` 和 `notes` 算撞；首尾空白算撞；空名字不算；删掉的不算；项目和子工作区不互相比。
  - 每一处入口各一条：新建、改名、挪工作区、拖成子工作区、撤销删除、导入。
  - 导出：两个只差大小写的子工作区导出成 `Notes/` 和 `notes-2/`。

### P9-2 · 库 v33：文件表加两列

- **来历：** 第 63 条（Ocean 批准：「只给文件表加两列」）。
- **现在**（`cc0f301`）：
  - `src/lib/db/client.ts:41` `SCHEMA_VERSION = 32`，迁移链在同一个文件里；`src/lib/db/schema.sql` 是新库的样子。
  - `src-tauri/src/mcp.rs:3989` `EXPECTED_SCHEMA_VERSION: i64 = 32`；mcp.rs 里另有一条测试从 `client.ts` 读 `SCHEMA_VERSION` 对数。
  - ⚠️ 前端走 tauri-plugin-sql，**存不了 BLOB**（`images.rs` 文件头那段写了为什么）。文件的「身份」是一段字节，只能由 Rust 用自己的连接读写（和图片同一个做法）。
- **要做：**
  1. `attachments` 加两列，名字施工时定，意思是这样：
     - **身份**（BLOB，可空）：系统用来认出这个文件的那段字节（Mac 的书签 / Windows 的文件号，见 P9-3）。空 = 还没记（v33 之前挂的、或者挂的时候没记成）。
     - **还要告诉用户的事**（TEXT，可空）：空 = 没什么要说的。施工时定格式，至少要能表示两种状态：「Spool 跟到了新位置、用户还没看过」（要带着旧路径，悬停时给他看「从哪到哪」）和「用户已经确认过这个文件丢了，别再提示」。
     - ⛔ 只这两列。做到一半发现非要第三列，停下来问 Ocean。
  2. 迁移：照 `client.ts` 里已有的迁移写法；`schema.sql` 同步；**同一笔里**把 `mcp.rs` 的 `EXPECTED_SCHEMA_VERSION` 抬到 33。
  3. 迁移只加列，不往里填任何东西（填身份是 P9-3 运行时的事）。
- **验收：**
  - 现有的迁移测试照旧过，加一条 v32 → v33 的；
  - **在真库副本上跑一遍真迁移**（记忆 `spool-db-wipe-incident` 里那两种不碰真库的办法，`VACUUM INTO` 拷到 scratchpad）：迁完 `user_version` = 33、`integrity_check ok`、各表行数和总长和迁之前逐项一样、两列在、全是空的；
  - ⛔ 验迁移不许起 debug 版 GUI（同一个 identifier，会迁真库）。

### P9-3 · Rust：记住文件的身份、按身份找、分清楚是哪一种

**查清的事实（10-10 下发这一窗查的，只读，没写库）：** HAI-Lecture3 的文件打不开**不是 Spool 的错**。

- Spool 记的路径是 `~/Desktop/Lecture 3 - … - 2.pdf`，Ocean 10-06 11:31:51 亲手挂上，当场抽了 13545 字正文。
- 现在那份文件在 `~/Desktop/HAI/`，是 10-06 11:31:03 建出来的（挂上之前 48 秒，同一份，不是重新下载的，两边下载来源一样）；系统记着它 10-07 14:07:22 被放进 `HAI/`（`kMDItemDateAdded` 和 inode 的 ctime 一致）。两分钟后 Lecture 4 是从 `HAI/` 挂上的。
- 10-07 之后每一份备份和迁移快照里，这一行的路径都一样；代码里没有任何一处改 `attachments.target`。

- **来历：** 第 57 条（路径跟着文件走，除非删了；标清楚是哪一种），第 58 条（老文件先自动找同名、问一句）。
- **现在**（`cc0f301`）：
  - 挂文件只有一个口子：`src/stores/blocksStore.ts:659` 调 `attachments.ts` 的 `createAttachment`。用户点选、从访达拖进来、同意 AI 的提议、新版取代旧版，都从这里进。
  - 打开文件：`src/lib/files/openFile.ts` → `capture.rs:894` `open_target`，文件不在就报「文件不存在或已被移动」。
  - 导出清单：`pack.rs` 的 `pack_source_sizes`（P8-1），找不到的给「打开最近的文件夹」（`open_nearest_folder`，`8dc204a`）。
  - 依赖：macOS 那一段已经有 `core-foundation = "0.9"`；Windows 那一段已经有 `windows-sys = "0.61"`（feature 列表在 `src-tauri/Cargo.toml:84`）。
- **要做：**
  1. **记身份**（Rust，自己的 rusqlite 连接写那一列）：
     - Mac：系统的「书签」（`CFURLCreateBookmarkData`）。挂上的那一刻记；以前挂的、现在还在原处的文件，第一次被看到时补记（Lecture 4、Flux 那几个就会补上）。
     - Windows：卷序列号 + 文件号（`GetFileInformationByHandleEx` 拿 `FileIdInfo`）。⚠️ 本机编不了 Windows，只能逐行看，回执里写清楚哪些没编过。
     - 别的平台：不记，照旧只看路径。
  2. **按身份找**：一个 `(async)` 命令，给一组文件（id、记着的路径、身份），回每个文件现在是哪一种：
     - **在原处**；
     - **挪走了**：身份认出它在新地方（Mac 用 `CFURLCreateByResolvingBookmarkData`，带上「不弹界面、不自动挂载」那两个选项；Windows 用 `OpenFileById` + `GetFinalPathNameByHandleW`）；
     - **在废纸篓里**：认出来的新位置在废纸篓里（`~/.Trash`、外接盘的 `.Trashes`；Windows 的 `$Recycle.Bin`）；
     - **外接盘没接上**：记着的路径在 `/Volumes/<盘名>/…`，而那个盘现在不在；
     - **删掉了**：有身份但认不出来了；
     - **不知道去哪了**：没有身份（v33 之前挂的），原处也没有。
     - 书签过期（系统说 stale）时顺手换一份新的。
  3. **挪走了 ⇒ 跟过去**：库里的路径改成新的、身份更新、记下「跟到了新位置，用户还没看过」+ 旧路径（P9-2 那一列）。正文不重抽（同一个文件）。
     - P6 的路径闸（隐藏目录、系统目录、`~/Library`）是管 **AI 提议的路径**的；文件是用户自己挂的或者用户同意过的，跟过去时不再过闸。⚠️ 有例外要停下来问：比如跟过去的新位置在 `~/Library` 里、而这个文件开着「AI 可读」。
  4. **不知道去哪了的老文件**（第 58 条）：
     - Mac：用 Spotlight 按**完整文件名**找（`mdfind`，只认名字完全一样的），把找到的每一个都交给界面（路径、大小、修改时间），⛔ 不自己挑。
     - Windows：没有 Spotlight，只给「重新选位置」（照「做不到想其他办法」，回执里写一句）。
     - 用户点了「是这个」或者用「重新选位置」选了一个 ⇒ 改路径、记身份。
  5. 什么时候找：项目的右栏打开时、点开一个文件之前、导出清单打开时（找到挪走的就先跟过去，导出就能带上它）。⛔ 不在后台扫整个库。
- **不做：** 不移动、不复制用户的文件；不改 MCP；按名字找到一个候选也**不自动改**，一定要用户点。
- **验收（Rust 单测 + 真文件）：**
  - 临时目录里：挂一个文件记身份 → 挪到别的文件夹 / 改名 ⇒「挪走了」+ 新路径；挪进废纸篓 ⇒「在废纸篓里」；真删掉 ⇒「删掉了」；没有身份、原处没有 ⇒「不知道去哪了」；在原处 ⇒「在原处」。
  - 「外接盘没接上」：用一个不存在的 `/Volumes/<随便一个名字>/x.pdf` 测。
  - Spotlight 那条：临时目录里放两个同名文件，两个都回来（Spotlight 收录有延迟，测试要能等或者跳过，跳过要写理由）。
  - 跟过去之后库里那一行：路径新、身份新、「还要告诉用户的事」写着旧路径；正文没变。
  - `cargo tree` 网络那条仍然是空的；没加新的包（要加 windows-sys 的 feature 可以，回执写出来）。

### P9-4 · 右栏：主动提示丢失、标出跟上了、帮老文件找回来

- **来历：** 第 57 条（「项目右侧边栏的文件管理需要能够主动提示文件被删除或者丢失，让用户确认后才可不提示」「需要标清楚文件是被删除的还是spool自己的错误」），第 58 条，第 66 条（跟上之后标一下、看过就消失）。
- **现在**（`cc0f301`）：`src/components/RightRail/ProjectFiles.tsx` 一张表，新的在上，每行：图标（AI 提议的是机器人）、名字（悬停看完整路径）、块号圆圈、添加时间；悬停才出「打包可读 / AI 可读」和两个按钮。找不到的文件和找得到的长得一样，点了才报错。
- **要做：**
  1. **跟上了**：那个文件上一个小标记「已跟到新位置」。悬停写从哪到哪（两条完整路径）；点一下标记就不再显示（清掉 P9-2 那一列）。
  2. **找不到的**，那一行明显标出来，写清楚是哪一种（P9-3 那几种，大白话）：在废纸篓里 / 已经删掉了 / 外接盘没接上 / 不知道挪到哪了。下面给能做的事：
     - 「打开最近的文件夹」（和导出清单同一个命令）；
     - 「找一找」（只有「不知道挪到哪了」才有，Mac 上）：列出 Spotlight 找到的同名文件（文件夹、大小、修改时间），用户点「是这个」才改过去；一个都没找到就直接说没找到；
     - 「重新选位置」：系统的选文件对话框，选好了改路径、记身份；
     - 「知道了」：不再提示（记进 P9-2 那一列），那一行变成安静的灰色标记，文件还在列表里。
  3. **主动**：右栏「项目文件」那一栏的标题旁边写有几个文件找不到了（没确认过的才算），用户不用一个个点开才发现。确认过的不算进去。文件后来又找到了 ⇒ 自动回到正常，那条「确认过」也清掉。
  4. 导出清单（`PackCopyList.tsx`）用同一套状态：「找不到了」换成具体是哪一种；挪走了的已经跟过去，就能照常勾选、导出。
- **不做：** 不在左边栏、项目列表、别的地方加提示（只在右栏和导出清单）；不加系统通知。
- **验收：**
  - vitest：状态 → 文字和按钮的对应；数「几个找不到了」只算没确认过的；确认之后不再算；又找到了自动清掉。
  - 截图按记忆 isolated-verify §45：右栏里「已跟到新位置」「在废纸篓里」「不知道挪到哪了 + 找到 4 个同名文件」三种各一张，经典、情人节两个主题，再加一张英文界面。
  - 真找回来要 Ocean 手指（§6）。

## 4. 什么时候停下来问

- 起点不是 §2 写的那样；「现在」一栏和代码对不上。
- 需要第三列，或者要动别的表；要改 MCP 的工具、描述、输出格式；要改 pack 的格式或 golden。
- 书签 / 文件号的做法走不通（比如解析时会弹系统对话框、会去挂载网络盘），要换别的办法。
- 跟过去的新位置撞到 P6 路径闸管的那些地方（P9-3 第 3 条）。
- 要删文件（请 Ocean 跑，见 §2）。
- 发现新问题：**不顺手修**，按 HANDOFF §8 的 DISCOVERED 格式记进 HANDOFF §9.9，继续做本任务。

## 5. 做完四步之后：换装给 Ocean 验收（先问）

- 四步都提交、全部测试通过之后，**先问 Ocean「现在换装吗」**，得到同意再做。这一次会带上 P8 验收第一轮那三条（`8dc204a`，还没装过）。
- 照 P8 任务书回执里「换装」那一段，每一步都有命令和核对项。和 P8 不一样的地方：**这一次真库会从 v32 迁到 v33。**
  - 换装前：`VACUUM INTO` 备份真库到桌面（文件名带日期）；再拷一份到 scratchpad，用**新构建的** `--mcp` 二进制连副本做一次迁移前后的核对（记忆 §44：别连真库目录）。
  - 现装的是 Developer ID：构建时 `APPLE_SIGNING_IDENTITY` 走环境变量，不改 `tauri.conf.json`，公证变量全部 unset；日志进文件。TSA 偶发失败就整个重跑。
  - 停 GUI 和 `--overlay` **按 pid**，杀完再查一遍还在不在；`--mcp` 一个都不碰。旧包 `mv` 进 `~/Desktop/Spool/spool-pre-install/`，别删。
  - 换装后核：sha256 和构建产物一致；两个进程的 txt inode 是新文件；stderr 有 `[double-tap] installed at HID/active`；真库 `user_version` = 33、`integrity_check ok`、各表计数和装前一致、正好多出一个迁移快照。
  - ⚠️ 换装后旧的 `--mcp` 子进程每次调用都会报「库比服务新」：告诉 Ocean 重启 Claude / Codex。
- commit、build、换装分开记在回执里；**不 push、不发版**。

## 6. 给 Ocean 的验收单（大白话，换装后给 Ocean）

P8 验收第一轮那三条（这次一起装上的）：

1. 打开一个有文件的项目，点「打包」⇒ 清单下面多了「文件夹名」，可以改；导出来的文件夹叫你改的名字。
2. 清单里每个文件下面一行是它的完整路径，太长会换行，不会被截掉。
3. 申请规划那个找不到的 PDF 下面有「打开最近的文件夹」，点了打开桌面。

P9：

4. 在同一个工作区里新建一个项目，起一个已经有的名字（比如大小写不一样的 `flux`）⇒ 它自动叫「flux 2」，并提示了你一句。把一个项目拖到另一个有同名项目的工作区 ⇒ 同样加「 2」。连按两次 ＋ ⇒ 两个「无标题」都在，没有被改名。
5. 打开 HAI-Lecture3 ⇒ 右栏那个 PDF 标着「不知道挪到哪了」，点「找一找」⇒ 列出 `桌面/HAI/` 里那一份 ⇒ 点「是这个」⇒ 点文件能打开了。
6. 打开申请规划 ⇒ 那个 PDF 点「找一找」⇒ 列出 4 份同名的，你挑对的那一份。
7. 随便挂一个新文件，然后在访达里把它挪到别的文件夹 ⇒ 回到 Spool，右栏那个文件标着「已跟到新位置」，悬停能看到从哪到哪，点一下标记就没了；点文件能打开。
8. 再把它丢进废纸篓 ⇒ 右栏写「在废纸篓里」，标题旁边写有 1 个文件找不到了；点「知道了」⇒ 提示没了，文件还在列表里、是灰的。
9. 界面切成英文，上面看到的新字看一眼 ⇒ 都是英文。

你只要告诉我：这九条里哪几条不对，不对的那条你看到了什么。

## 7. 回执（执行窗填写）

每步一小段：

- 提交：`<hash> <标题>`
- 改了哪些文件（一行一个）
- 怎么验的：命令 + 结果（vitest / cargo 的条数，i18n-check 的输出原文）
- 施工时自己定的：提示措辞、两列叫什么、「还要告诉用户的事」那一列的格式、Spotlight 怎么调、Windows 哪些没编过、导入时撞名的处理。
- 还差什么、有没有偏离本任务书、新发现记在 HANDOFF 哪里

最后一段：换装（做了没有、装的是哪个 commit、`spctl` 结果、真库备份文件名、迁移前后的核对）、Ocean 验收（还没有就写「待验收」）。

## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 验收`（Ocean 验过后改成 `COMPLETE`），`git mv` 进 `docs/archive/product-taskbooks/`。
2. `docs/HANDOFF-2026-09-04.md`：§9.3 路线图 P9 那一行改成「已完成，任务书在 archive/product-taskbooks/…」；P8 那一行写上第一轮三条装了没有、验了没有；§9.8「唯一下一步」写清楚。
   - 下一段是 **P9B**（深浅色 + 周回顾「活动」图表，正文在 HANDOFF §9.7 和 §9.9 `DISCOVERED-20261010-2`，第 59–61 条已经拍板了三件）。下发前先读 §9.7，并核一下 `EXECUTION_POLICY.md` §5.2 的交替：P1–P11 是 Ocean 09-30 批准的同一个 P 里程碑，按 §9.0 不算连开两个里程碑。
3. `docs/README.md` 入口表里 ACTIVE 产品任务书那一行改成「暂无，待下发 P9B」（只暂存这一行）。
4. 这些文档改动单独一笔提交（同样只 add 自己改的路径）。

### 回执（2026-10-10 执行窗）

开工核对：起点 `7e52b0b docs: 下发 P9`，上一笔 `cc0f301`，和 §2 一致。基线和 §2 写的一字不差：tsc 干净；vitest 81 / 969；cargo 176 · 4；sidecar 14；`(none missing)`；`--dead` 87 行；`cargo tree` 网络那条是空的；Rust 警告三条。

#### P9-1 · 同一个工作区里不许重名

- 提交：`7d6afd6 feat(names): P9-1 同一个工作区里不许重名 —— …`
- 改了：
  - `src/lib/names/uniqueTitle.ts`（新：规则本身）、`src/lib/names/uniqueTitle.test.ts`（新）
  - `src/lib/names/renameNotice.ts`（新：那一句提示）
  - `src/lib/db/threads.ts`、`src/lib/db/workspaces.ts`、`src/lib/db/transfer.ts`
  - `src/stores/threadsStore.ts`、`src/stores/workspacesStore.ts`
  - `src/components/Sidebar/ThreadListItem.tsx`、`src/components/Sidebar/WorkspaceGroup.tsx`、`src/components/ThreadView/ThreadHeader.tsx`
  - `src/lib/pack/folder.ts`、`src/lib/pack/folder.test.ts`
  - `src/lib/db/uniqueNames.test.ts`（新）、`src/lib/i18n/index.ts`
- 施工时定的：
  - **规则放在库那一层**：新建、改名、挪工作区、拖成子工作区（右键「移到…」那条路）、撤销删除、导入，全在写库的函数里加「 2」，所以以后再加入口也绕不过去。比的时候 `trim()` + `toLowerCase()`；空名字不算；删掉的不算；项目只和同一个工作区的项目比，工作区只和同一个父工作区（或都在最顶层）的工作区比。「X 2」也有了就「X 3」；原来就叫「X 2」又撞了就是「X 2 2」，没做聪明的拆数字。
  - **提示措辞**：项目「同一个工作区里已经有叫「{name}」的项目了，这个改叫「{renamed}」」（This workspace already has a project called "{name}", so this one is now "{renamed}".）；工作区「同一层已经有叫「{name}」的工作区了，这个改叫「{renamed}」」（There is already a workspace called "{name}" here, …）。
  - **改名的提示什么时候出**：改名框每 200ms 就存一次，库里每一次都照样不重名；但提示等改完才说一次（回车、Esc、离开输入框）。打字时输入框不跳成「X 2」—— 不然在「Lecture 3」停一下、想打「Lecture 3 notes」，就会变成「Lecture 3 2 notes」。项目标题那个框以前没有「改完」这一说，加了获得 / 离开焦点；左栏两个框改完时把还没存的最后几个字也存进去（以前回车太快会丢掉最后 200ms 打的字，这次顺带补上，是提示要对得上必须的）。
  - **挪动的提示**：右键「移到…」、拖到别的工作区（项目），右键挪工作区，撞了名都当场说一句。连按两次 ＋ 是两个空名字，不改、不说。
  - **撤销删除、导入**：照样加「 2」，不弹提示。导入时只改真会进来的、活着的行（已经有的 id 照旧被跳过、名字不动；删掉的行等撤销删除时再查），带进来的行之间也互相比。现有测试「两个库里各自建的同名项目，合并之后是两个」照旧过：那两个「Flux」在两个不同的工作区里（两个库各有一个「升学」，带进来的那个现在叫「升学 2」）。
  - **导出兜底**：`uniqueIn` 不分大小写比，`Notes/` 和 `notes-2/`；项目同名文件夹那一格也按小写记。
  - 和 MCP 的小差别：界面这边用 JS 的 `trim` / `toLowerCase`（认 Unicode），MCP 的 `create_thread` 用 SQLite 的 `lower(trim())`（只认 ASCII）。MCP 照旧拒绝、没改；只差大小写的非英文字母（比如 Ä / ä）界面会加「 2」，MCP 不会拒。
- 怎么验的：vitest 规则 7 条 + 入口 23 条（新建 / 改名 / 挪工作区 / 拖成子工作区 / 撤销删除项目和工作区 / 导入 4 条 / 提示 5 条含英文）+ 导出 1 条（`Notes/`、`notes-2/`）。全套 vitest 83 / 1000。
- 没偏离任务书。

#### P9-2 · 库 v33：文件表加两列

- 提交：`10fef6a feat(db): P9-2 库 v33 —— …`
- 改了：`src/lib/db/client.ts`、`src/lib/db/schema.sql`、`src-tauri/src/mcp.rs`（`EXPECTED_SCHEMA_VERSION` = 33，同一笔）、`src/lib/db/client.test.ts`、`src/lib/db/transfer.ts`、`src/lib/db/transfer.test.ts`
- 施工时定的：
  - **两列**：`target_identity`（BLOB，系统认文件用的那段字节，只有 Rust 读写）、`target_notice`（TEXT，JSON）。`target_notice` 两种：`{"kind":"moved","from":"<旧路径>"}` = Spool 跟到了新位置、用户还没看过（挪了两次还没看，`from` 仍是用户最后知道的那一个）；`{"kind":"dismissed"}` = 用户点过「知道了」。没有第三列。
  - **导入时这两列不跟着走**（落成空的）：Mac 的书签只在记下它的那台电脑上认得，带到别的电脑会把好好在那儿的文件说成「删掉了」；而且导入那条路搬不了 BLOB（会变成 "[1,2,3]" 这样的文本）。在原处的文件第一次被看到时会再记上。
  - 老的迁移测试补了 `downgradeToV32`：之前它们从 v33 的表开始「降级」，没真走到 v33 那一步（加完列测试照样全绿，就是这么发现的）。
- 怎么验的：
  - vitest：v32 → v33 逐表逐行相等、建表语句只在 attachments 尾巴上多两列、半跑一次能重跑、新装直接有两列；导入那两列不跟着走（用照插件真实行为写的适配器）。全套 83 / 1004；cargo 176 · 4（mcp.rs 那条读 `SCHEMA_VERSION` 对数的测试也过）。
  - **真库副本**：`sqlite3 -readonly … "VACUUM INTO '<scratchpad>/realcopy/spool.db'"`，在 vitest 里用 `__migrateSchemaForTest` 跑真迁移：v32 → v33、`fresh` = false、`integrity_check ok`、工作区 / 项目 / 块 / 文件 = 28 / 67 / 1097 / 13、24 张表每一列的条数和总长都和迁之前一样（正文 332541、批注 13558、文件正文 130320、图片 764139 字节）、别的表 / 索引 / 触发器的建表语句一字没变、两列在且全空。没起 debug 版 GUI，真库没碰。

#### P9-3 · Rust：记身份、按身份找、分清楚是哪一种

- 提交：`53486c3 feat(files): P9-3 记住文件的身份、按身份找、分清楚是哪一种 —— …`
- 改了：
  - `src-tauri/src/file_identity.rs`（新：平台那一层，不依赖本 crate 别的东西）
  - `src-tauri/src/file_follow.rs`（新：每看一次分成哪一种、跟过去、三个命令）
  - `src-tauri/src/lib.rs`（两个模块、三个命令）、`src-tauri/src/images.rs`（`open_library` 改成 `pub(crate)` 共用）、`src-tauri/src/mcp.rs`（P6 路径闸那几样改成 `pub(crate)`，规则一个字没改）
  - `src-tauri/Cargo.toml`：windows-sys 加一个 feature `Win32_Storage_FileSystem`。⛔ 没加新的包，`cargo tree` 网络那条是空的
  - `src/lib/files/locate.ts`（新：包三个命令）、`src/lib/db/attachments.ts`（`setAttachmentNotice`）、`src/stores/blocksStore.ts`、`src/stores/fileFollow.test.ts`（新）
- 施工时定的：
  - **身份的格式**：两个字节的标签打头，另一个平台写的身份读成「没有」。Mac `M1` + 设备号 + inode + 系统书签（`CFURLCreateBookmarkData`）；Windows `W1` + 卷序列号 + 128 位文件号。⚠️ Mac 多带设备号 + inode 的原因：很多编辑器保存时是「写一个新文件再改名盖过去」，同一个路径 inode 变了，书签就还指着旧的 inode，以后一挪就会被说成「删掉了」。每看一次比一下（一次 stat），对不上就重记，⛔ 绝不因此「跟过去」。
  - **分成哪一种**（命令 `locate_files`，`(async)`）：路径上有东西 ⇒ 在原处（没身份或身份对不上就补记；「确认过丢了」自动清掉）；路径在 `/Volumes/<盘名>/…` 而那个盘不在 ⇒ 外接盘没接上（先于身份判）；没有身份 ⇒ 不知道去哪了；书签认不出 ⇒ 删掉了；认出来在 `~/.Trash` 或别的盘的 `.Trashes` 里 ⇒ 在废纸篓里（不跟进废纸篓，「放回原处」之后下一次就是在原处）；认出来在别处 ⇒ 跟过去：路径改成新的、身份重记、记下「跟到了新位置」+ 旧路径，正文不重抽。解析书签带「不弹界面、不自动挂载」。
  - **任务书 P9-3 第 3 条要停下来问的那一种，先没跟**：文件开着「AI 可读」、原来不在 P6 路径闸管的地方、现在被认出挪进了闸管的地方（隐藏文件夹、系统文件夹、`~/Library`）⇒ 标成 `held`，给出找到的位置，界面上写「挪进了系统或隐藏文件夹」，用户点「是这个」才跟过去。**这一条等 Ocean 定**，已记进 HANDOFF §9.9 `DISCOVERED-20261010-5`。没开「AI 可读」的照常跟过去。
  - **按名字找**（命令 `find_same_name`）：`/usr/bin/mdfind -0`，查询是 `kMDItemFSName == 名字 || kMDItemDisplayName == 名字 || kMDItemDisplayName == 去掉扩展名的名字`，结果再按完整文件名筛一遍、只留同类（文件 / 文件夹）、废纸篓里的不列、新的在前。⚠️ 实测（10-10，只读）：只用 `kMDItemFSName ==` 对「Fall_2027_美国申研完整方案_2026-08-07.pdf」一个都找不到（带中文的名字，等号对 FSName 不灵，通配符倒是灵的），`kMDItemDisplayName ==` 正好找到 4 份 PDF；HAI 那份两种都只找到 `桌面/HAI/` 那一份。Windows 没有 Spotlight，返回空，界面只给「重新选位置」。
  - **选位置**（命令 `relocate_file`）：改路径、记身份、清掉要说的事；路径上没东西回 `missing`，文件 / 文件夹选反了回 `wrong_kind`。不过 P6 路径闸（是用户自己选的）。正文不重抽。
  - **挂上的那一刻记**：`blocksStore.attach` 挂完就看一次（用户点选、访达拖入、同意 AI 的提议、新版取代旧版都从这里进）。
  - P9-4 里顺带补的一处（在 `7efc7b5`）：跟过去 / 选位置时，标签还是旧文件名的就换成新文件名 —— 选文件对话框和访达拖进来的标签就是文件名，不换的话在访达里改了名的文件还显示旧名；用户自己起的名不动。
- 怎么验的：
  - Rust 新加 14 条（`file_identity` 5、`file_follow` 9）：临时目录里挪到别的文件夹 / 改名 ⇒ 挪走了 + 新路径、库里路径新、身份新、`target_notice` 写着旧路径、正文没变；挪两次 `from` 仍是第一次的；挪进 `.Trashes` ⇒ 在废纸篓里、不跟；真删掉 ⇒ 删掉了；没身份、原处没有 ⇒ 不知道去哪了；在原处 ⇒ 第一次补记、之后不再写库；`/Volumes/spool-p9-no-such-disk/x.pdf` ⇒ 外接盘没接上；编辑器式重写 ⇒ 对不上要重记；文件夹也能跟；「确认过」又找到了自动清；held；选位置三种拒绝；两种 JSON；Spotlight 查询的转义。⛔ 测试里没往用户自己的废纸篓放任何东西（用的是临时目录里的 `.Trashes`）。
  - Spotlight 真找同名那条：标 `#[ignore]`（Spotlight 收录新文件要几秒到几分钟；刚编译完、索引忙的时候 30 秒都没收录过），手动 `cargo test -- --ignored spotlight_finds` 跑过一遍是过的（两个同名文件都找到了）；等待时间放到了 2 分钟。
  - **Windows 那一半没编过、没跑过**：本机编不了整个 app（记忆 isolated-verify §43），在 scratchpad 单开一个 crate 用 `#[path]` 引同一个 `file_identity.rs`、同一组 windows-sys feature，`cargo check --target x86_64-pc-windows-msvc` 带 `deny(warnings)` 过了 —— 只证明类型对，没链接、没在 Windows 上跑过。
  - vitest 6 条（`fileFollow.test.ts`）：跟过去之后列表里的路径换成新的；找不到的路径不动；Rust 报错时列表照旧；挂上就去记；「是这个」；「知道了」写进库里那一列。
  - 全套：vitest 84 / 1010；cargo 190 · 5 跳过（多的那一条跳过就是 Spotlight）；sidecar 14；警告仍是基线三条。

#### P9-4 · 右栏：主动提示丢失、标出跟上了、帮老文件找回来

- 提交：`7efc7b5 feat(files): P9-4 右栏主动提示丢失、标出跟上了、帮老文件找回来 —— …`
- 改了：
  - `src/lib/files/fileStatus.ts`（新：状态 → 文字和按钮、标题旁边数几个）、`src/lib/files/fileStatus.test.ts`（新）
  - `src/components/RightRail/ProjectFiles.tsx`、`src/components/RightRail/RailSection.tsx`（标题能放一个节点）
  - `src/lib/files/openFile.ts`（`openAttachment`）、`src/components/ThreadView/BlockItem.tsx`、`src/components/ThreadView/DigestView.tsx`
  - `src/components/Pack/PackCopyList.tsx`、`src/lib/i18n/index.ts`、`src-tauri/src/file_follow.rs`（上面那条标签）
- 施工时定的：
  - **什么时候看**：右栏「项目文件」打开时，和每次 Spool 回到前台时（窗口 focus）—— 第 7 条验收是「在访达里挪了、回到 Spool 就看到标记」，只在打开时看就看不到。只看这个项目、只看顶层那几行；收在新版下面的旧版不标、不数，点开它时再看。⛔ 不扫整个库。
  - **跟上了**：名字后面一个小标记「已跟到新位置」（英文 New place —— 英文原句 Followed to its new place 把名字挤成「Lectur…」，截图里看出来的）；悬停写「从 <旧路径> 挪到了 <新路径>，Spool 已经跟过去了，点一下这个标记就不再显示」；点一下清掉。
  - **找不到的**：开头的文件图标换成表示「怎么没的」的图标（废纸篓 / 带叉的文件 / 硬盘 / 问号 / 带锁的文件夹），⛔ 没用警示符号（三个找不到就是一列警示）；颜色用设置里「路径已变」那个 `--status-parked`。下面一行：在废纸篓里 / 已经删掉了 / 外接盘没接上 / 不知道挪到哪了 / 挪进了系统或隐藏文件夹（In the Trash / Deleted / Its disk is not connected / Moved — not sure where / Moved into a system or hidden folder）。再下面的按钮：
    - 找一找（只有「不知道挪到哪了」、只在 Mac 上）⇒「正在找…」⇒「找到 N 个同名文件」，每个写它所在的完整文件夹（折行，不截断）、大小、修改时间、「是这个」；一个都没有就写「没找到同名的文件」。
    - 是这个（held 那种，找到的位置写在上面）。
    - 打开最近的文件夹（和导出清单同一个命令；外接盘没接上的不给 —— 最近的就是 `/Volumes`，没用）。
    - 重新选位置（系统的选文件对话框，文件夹就选文件夹）。
    - 知道了 ⇒ 那一行变灰、按钮只在鼠标停上去时出来、不再算进标题旁边的数；文件还在列表里。
  - **主动**：标题「项目文件」旁边「N 个找不到了」（英文 N missing），只数没点过「知道了」的。
  - **点开文件**：右栏、块上那一行文件、已完成项目的总览三处都先看一遍再开（`openAttachment`）：挪走了就从新位置开；找不到就说「打不开：<是哪一种>」，不再是「文件不存在或已被移动」。
  - **导出清单**：打开时先看一遍，挪走了的先跟过去（列表里的路径变了，大小就按新位置重查），能照常勾选、导出；找不到的「找不到了」换成具体是哪一种（还没看完时仍写「找不到了」）。
- 怎么验的：
  - vitest 6 条（`fileStatus.test.ts`）：状态 → 文字和按钮的对应；「找一找」只给不知道挪到哪了的、只在 Mac；外接盘不给打开最近的文件夹；数「几个找不到了」只算没确认过的；确认之后不再算；又找到了（在原处）就不算。
  - **截图**按记忆 isolated-verify §45（真组件渲成静态页、WKWebView 截；样式是单独编到 scratchpad 的 `vite build`，没碰 `dist/`）：一张右栏里同时有「已跟到新位置」「在废纸篓里」「不知道挪到哪了 + 找到 4 个同名文件」（4 个用的是真库那份 PDF 的 4 个真实位置、真实大小和时间），经典、情人节各一张，再加一张英文；另截了导出清单中英文各一张。都看过：标题旁边的数、标记、图标、折行的完整文件夹路径、按钮都放得下。⚠️「找到 4 个同名文件」那一块是组件里的状态，静态渲染到不了，截图那个 scratchpad 测试文件里替换了 `useState` 的第一次 `null` 初值，只在截图时用。图在 scratchpad 的 `shots/`，没进仓库。
  - 全套（`7efc7b5` 上）：tsc 干净；vitest 85 个文件 / 1016 条全过（比基线多 4 个文件、47 条）；cargo 190 过 · 5 跳过（多 14 条、多 1 条跳过）；sidecar 14；`(none missing)`；`--dead` 和开工时逐行一样（87 行）；`cargo tree` 网络那条是空的；Rust 警告只有基线那三条。
  - 真找回来要 Ocean 手指（§6）。

#### 新发现（记在 HANDOFF §9.9）

- `DISCOVERED-20261010-4`：`bg-accent-soft` 这个类在 Tailwind 里没有定义，10 个组件在用，生成的 CSS 里一条都没有（那些地方本该有的淡底色从来没显示过）。P8 之前就有，没修 —— 补上会改经典版的样子，要 Ocean 定。
- `DISCOVERED-20261010-5`：P9-3 第 3 条那种（AI 可读的文件挪进了 P6 路径闸管的地方）现在先不跟、等用户点「是这个」，要 Ocean 定以后怎么办。
- `DISCOVERED-20261010-6`：删一块、选了「一起从项目里去掉」它挂着的文件，再 ⌘Z，撤回走 `restoreAttachment`，那两列没带回来（落成空的）：在原处的下次看会重新记上；「知道了」会丢、要再点一次。

#### 换装（Ocean 10-10 答「换装」；`DISCOVERED-20261010-5` 选甲 = 现在的做法，不改代码）

- 构建：
  - 在 `1a32482` 上构建（代码就是 `7efc7b5`），`src` / `src-tauri` / `site` / `scripts` 没有未提交改动。
  - 命令和 P8 一样：`env -u APPLE_ID -u APPLE_PASSWORD -u APPLE_TEAM_ID -u APPLE_API_KEY -u APPLE_API_ISSUER -u APPLE_API_KEY_PATH APPLE_SIGNING_IDENTITY="Developer ID Application: Hanze JIN (Q5Y5JRXZ58)" npm run tauri build -- --bundles app`，日志写进文件；没改 `tauri.conf.json`，日志里是「skipping app notarization」。
  - TSA 第一遍就过（主程序 12:23:06、`spool-ai` 12:23:05），没有 `timestamp was expected`；`--verify --deep --strict` 过。
  - 二进制里有 `locate_files`、`find_same_name`、`relocate_file`、`kMDItemDisplayName`；前端（`dist/`）里有 v33 那一步迁移、「已跟到新位置」「个找不到了」和英文 New place。
- 新二进制的 `--mcp` 探针（记忆 §44，连的是 scratchpad 里的两份真库副本，⛔ 没连真库目录）：v32 的副本 ⇒ 拒绝，「Spool's database is still the older v32; this MCP server is v33…」；迁到 v33 的副本（`fresh` = false）⇒ `list_threads` 正常，HAI-Lecture3 1 个文件。两个方向都对。
- 装前：
  - Developer ID，`spctl` = `Unnotarized Developer ID`，0.6.2；`spool` sha256 `df8c7565…`（P8 那版）。
  - 真库 v32 · ok · 28 / 67 / 1097 / 13（工作区 / 项目 / 块 / 文件）· 图片 4 张（764139 字节）· 正文 332541 · 批注 13558 · 文件正文 130320；迁移快照 24 个，`mcp-clients.json` 18 行。
- 停：GUI 91116 和 `--overlay` 91142 按 pid `kill -TERM`，1 秒内都退了，再查已不在。`/Applications` 那 7 个 `--mcp` 子进程一个没碰（前后都是 7）。
- 真库备份：`~/Desktop/spool.before-p9-install-20261010-122358.db`（停了之后 `VACUUM INTO`）。和活库逐项一致：v32 · ok，各项计数和总长都一样。
- 旧包挪到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261010-122406-pre-p9.app`；新包 `ditto` 进 `/Applications`，再 `open --stdout … --stderr …` 起来。
- 装后：
  - `--verify --deep --strict` 过；`spctl` = `Unnotarized Developer ID`；identifier `com.oceanjin.spool`；0.6.2。
  - `spool` sha256 `473b5288…`，和构建产物一致。
  - 主进程 7761（12:24:06 起）和 `--overlay` 7777（12:24:07 起）都是换装之后起的，`lsof` txt inode 都是 78291323，就是新文件。
  - stderr 只有 `[overlay] helper started` 和 `[double-tap] installed at HID/active` 两行，没有 error / panic。
- 真库：GUI 自己从 v32 迁到了 v33。`user_version` = 33、`integrity_check ok`，工作区 / 项目 / 块 / 文件、图片张数和字节、正文、批注、文件正文和装前逐项一致；`attachments` 尾巴上多了 `target_identity` / `target_notice` 两列；迁移快照 24 → 25，正好多一个 `spool.pre-migration-v32-2026-10-10T11-24-07-470Z.db`；`mcp-clients.json` 仍是 18 行。
  - 起来时开着的项目是「Lecture 1」，它那个还在原处的 .pptx 当场记上了身份（`M1` 开头，1102 字节）—— 「第一次看到就补记」在真机上走通了。别的文件要等打开它们的项目时才记。
- ⚠️ 那 7 个 `--mcp` 子进程跑的还是旧二进制（v32），库已经是 v33 了，它们每次调用都会报「库比服务新」：要 Ocean 重启 Claude / Codex。
- commit、build、换装分开记在上面；没 push，没发版。

#### Ocean 验收

- **10-10 通过**，原话「验收通过push，准备新窗口做下一任务」。§6 九条全过（第 1–3 条是 P8 验收第一轮的，P8 也随之验收通过）。
- **没有 push**：远端还停在 08-27，这一推会顺带重新部署官网（P5 那一笔改了首页和隐私说明），而官网能下载的还是 v0.6.2。问了 Ocean，他选「先不推，等下次发版时一起推」（HANDOFF §9.2 第 70 条）。
