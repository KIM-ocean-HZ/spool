# 产品任务书 P9D —— 丢字修复：编辑面板和输入框里的字边写边存，退出、换装、崩溃都丢不了

> **状态：COMPLETE —— 待 Ocean 验收。**（2026-10-15 做完、已换装：三步 `c0f1f27` `6d1bfc6` `a5a5ab7` + 补 `17c988e`，开工时插进来的合并块图片修复 `4b714d6` 一起装了；回执在 §7，验收单在 §6（七条）+ §7.5 末尾那一条合并的。）
>
> （2026-10-15 下发时：P9C 已验收：其他七条通过，第一轮那一条（周回顾一个按钮、先选类型）已改 `b87e86e`、已换装，等 Ocean 看一眼 —— HANDOFF §9.2 第 104 – 111 条。）
>
> **唯一交付：** 下面 §3 的三步（P9D-1 – P9D-3），按顺序做完，每一步测试通过、单独一笔提交，并在 §7 写回执。
>
> **来历：** `DISCOVERED-20261014-5`（Ocean 10-14 丢了两段字），正文从 HANDOFF §9.9 **搬过来**了（§1.1）；HANDOFF 那边只留一行「已下发到 …」。排期是 Ocean 10-14 第 101 条（P9C 之后、发版一之前），做法是 Ocean 10-15 第 108 – 110 条。
> **「现在」一栏每一条都对着 `b87e86e` 核过。**
>
> **授权来源：** 都是 Ocean 自己的拍板，本任务书只引用、不改：
> - 第 101 条：排在 P9C 之后、发版一之前；
> - 第 108 条：**边写边存，编辑面板和项目输入框都管** ⇒ 推翻 08-27「输入框草稿只在内存里、不落盘」（`stores/draftStore.ts` 头注释）那一条；
> - 第 109 条：下次打开 Spool 时**提示一句，点一下跳过去**；
> - 第 110 条：输入框里粘进去、还没发出去的**图不留，只留字**。
>
> **边界：** 只做这三步。
> - 不碰实验线：`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行。
> - 不动 `docs/EXECUTION_POLICY.md`。
> - **库结构一个字不改**（真库停在 v33）；草稿**不进** `spool.db`、**不进** `settings.json`（理由和 `focus.json` 一模一样，见 §2.1 第 6 行）。`settings.json` 不加新键。
> - **MCP 的工具、描述、输出格式都不改**；pack 的格式、golden 都不改。草稿**不进 pack、MCP 读不到、不随库导出**。
> - 不加 Tauri 命令（plugin-store 够用，`focus.json` 就是这么写的）；真要加，一律 `(async)`。CSP 一个字不改；不加网络依赖（`cargo tree` 那条照旧必须是空的）。
> - 划词「更正这里？」那个小表单、捕捉浮窗里没存的字**不在这一份**（Ocean 点名的是编辑面板和输入框）。
> - 不 push、不发版。换装给 Ocean 验收之前先问一句（§5）。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：首屏、§9.0 – §9.4、§9.8 – §9.9；§9.2 第 101、104 – 111 条；§10.6 红线速查（「少用 emoji，一屏最多一个 ⚠️」「用户不能看到一个测试环境的 Spool」「主进程零出网，CSP 一个字不改」）。
3. `CLAUDE.md` §3（只改该改的）和 §5（提交信息里不许有任何工具署名）。
4. 记忆：`isolated-verify-workflow`（§47 停 GUI 之前先问有没有没存的字；§48 截图用的那套脚本；§21 / §40 换装）、`spool-db-wipe-incident`（⛔ 别起 debug 版 GUI）、`ui-language-follows-system`、`no-test-environment-spool`、`write-plainly-for-ocean`。
5. 每一步开工前，读该步「现在」一栏点名的文件。

### 1.1 搬过来的原文：`DISCOVERED-20261014-5` · 块的编辑面板没点「完成」时退出 Spool（或者换装停掉进程），写的字直接没了

- 路线：P · 类型：数据丢失 · 严重度：P2 · 状态：approved（第 101 条排期、第 108 – 110 条做法），本任务书下发
- 来源：Ocean 10-14「spool的个人网站素材里面，创作决策短文我本来后面写了两段文字，但是好像写完了没有点完成，现在消失了，什么情况」
- 证据：
  - 真库里〈个人网站素材〉那一块（#9，10-14 10:58 建的）正文只有「创作决策短文」六个字；P9B 换装前那份备份（`~/Desktop/spool.before-p9b-install-20261014-162641.db`）里也是这六个字 ⇒ 那两段从没进过库。库里没有任何草稿或历史表能找回来。
  - `BlockItem.tsx`：编辑面板的字只在 React 的内存里（`contentDraft`），只在三种时候落库：点「完成」、在 Spool 窗口里点面板外面（mousedown 那一条 effect）；按 Esc 是放弃（面板顶上就写着「Esc 放弃」）。前端没有 `beforeunload` / 退出前保存；关窗口只是藏起来（`lib.rs` `CloseRequested` 改成 hide），字还在；但退出（⌘Q / 托盘退出）、进程被停（换装就是按 pid 停 GUI）、崩溃，字都没了，没有任何提示。
  - 项目底下的输入框草稿（`stores/draftStore.ts`）也只在内存里，同一个问题；那是 08-27 故意定的「不落盘」（理由写在文件头），但当时管的是切项目，没管退出。
  - 10-14 那天下午 16:26 左右执行窗给 P9B 换装停了 GUI；如果那时这一块的编辑面板开着，字就是那一下没的。换装手册里当时没有「先确认没有开着的编辑」这一步（现在有了：记忆 §47、各任务书 §5）。
- 影响：用户以为写好了的字，在下一次退出 / 更新时悄悄没了；找不回来
- 验收标准：编辑面板开着、写了字，退出 Spool 再打开 ⇒ 字还在（第 108 条定的是「边写边存」，所以这一条对换装停进程、崩溃也要成立）

## 2. 起点

- **分支和提交：** 本地 `main`。下发本任务书的那笔 docs 提交（标题以 `docs: 下发 P9D` 开头）的上一笔是 `b87e86e`（P9C 验收第一轮那一条）。
  - 开工时只多了 docs 提交 ⇒ 「现在」一栏照旧成立，直接开工。
  - 多了改代码的提交 ⇒ 先 `git diff b87e86e..HEAD --stat`；凡是碰到 §2.1 表里那些文件的，对应那一行重核，回执里写核的结果。对不上就停下来说明。
- **只提交自己的文件：** 工作树里有别人没提交的改动（`docs/` 下研究线的文件、`docs/README.md` 里研究那几行）。只 `git add` 你自己改的文件的路径，绝不 `git add -A` / `git add .` / `git commit -a`。README 要改的话只暂存自己那一行：拿 HEAD 版本只换那一行，用 `git hash-object -w` + `git update-index --cacheinfo`。
- **删文件会被权限拦：** `git rm` 写给 Ocean，请他在输入框里用 `! git rm …` 跑；`git mv` 能自己跑。
- **提交：** 每步一笔，提交信息用中文。提交后跑 `CLAUDE.md` §5 那条自查；命中产品内容里的 claude 字样，按记忆 `attribution-grep-false-positive` 复核。
- **测试基线**（`b87e86e` 上实测）：

```bash
npx tsc -b                                                # 干净
npx vitest run                                            # 93 个文件 / 1080 条全过
cargo test --manifest-path src-tauri/Cargo.toml           # 192 过 · 5 跳过
cargo test --manifest-path src-tauri/sidecar/Cargo.toml   # 14 过
node scripts/i18n-check.mjs                               # (none missing)
node scripts/i18n-check.mjs --dead                        # 87 行 DEAD（基线噪声），只看你造出来的
cargo tree --manifest-path src-tauri/Cargo.toml -e normal | grep -iE "ureq|rustls|reqwest|hyper|openssl"   # 必须是空的
```

  Vitest 输出里那几十行 `[db] pre-migration backup FAILED … window is not defined` 是老噪声。`cargo test` 偶发 2 条失败（`DISCOVERED-20261007-2` / `-20261013-3`），重跑一遍再判；撞上了就把完整输出留下来。

### 2.1 现在（`b87e86e`）

| # | 在哪（文件:行） | 今天是什么样 |
|---|---|---|
| 1 | 块的编辑面板（`ThreadView/BlockItem.tsx`）：`contentDraft` 340、`annotationDraft` 366；`openEditor` 724 – 740；`commitContent` 742 – 758、`commitAnnotation` 760 – 770、`commitAll` 776（「完成」和点面板外面）；`cancelAll` 780 – 785（Esc） | 两份字都只在 `useState` 里。打开时从块上拷一份（有图的块会在正文末尾补上图片那几行，`openedWith` 记下打开时引用了哪些图，「完成」时据此删掉被拿掉的图）。这个面板里**粘不进新图**，只有已经在库里的图的引用行 ⇒ 面板的草稿就是两段纯文字 |
| 2 | 项目输入框（`ThreadView/Composer.tsx` 48 – 60、119、125；`stores/draftStore.ts`） | 按项目存：`byThread`（字）+ `images`（粘进来还没发的图，字节在内存里）。只在内存里；头注释写着 08-27 为什么不落盘 —— 第 108 条推翻了字那一半，第 110 条保留了图那一半 |
| 3 | 退出的几条路：托盘「退出 Spool」`capture.rs` 322 → `app.exit(0)`；`lib.rs` 679 `ExitRequested { code: None }` 被拦下（只拦「没人要的退出」）；`lib.rs` 499 关窗口 = 藏起来；换装按 pid `kill -TERM` | 前端拿不到任何「要退出了」的机会 ⇒ 「退出前存一下」这条路走不通，所以第 108 条定的是**边写边存** |
| 4 | 划词「更正这里？」表单（`BlockItem.tsx` 430 `correctionDraft`） | 也只在内存里 —— **不在这一份**（边界那条） |
| 5 | 「清空所有数据」（`lib/db/client.ts` 1661 `clearAllData`，设置 → 高级） | 只清库里的表 |
| 6 | 先例：`lib/db/focusDay.ts` → `focus.json`（plugin-store，`Store.load(FILE)`） | 头注释三条理由：不是库里的内容（库会被导出、搬到别的电脑）、不是设置、动 schema 最贵 ⇒ 存自己的文件。草稿三条全中 |
| 7 | 提示条：`stores/toastStore.ts`（`push(message, kind, detail, action)`，带 `action` 的活 `UNDO_LIFETIME_MS`）；跳到一块：`searchStore.highlight(blockId)` + 选中项目 | toast 几秒就自己没了；Spool 常常是开机自启、窗口藏着起来的 ⇒ 开机那一下弹的 toast 用户根本看不见 |

## 3. 三步

### 共同的规矩

- **大白话，少用 emoji**；所有新字都要有英文，走 `t()`；颜色只从 token 来。
- **草稿文件**：一个文件（建议 `drafts.json`，执行窗定名，回执写），和 `focus.json` 同一种写法、同一个目录；**不进库、不进 `settings.json`、不进 pack、MCP 读不到、不随库导出**。「清空所有数据」时一起清掉。
- **什么时候写**：字停下来一小会儿就写（执行窗定多久，建议 1 秒以内），每次写完马上落盘（`save()`）—— 要的是「刚写完那一刻被停掉也还在」。没变的时候不写。
- **什么时候删**：点「完成」**存成功之后**删；按 Esc 放弃时删；那一块 / 那个项目不在了时删。⚠️ 存失败的话**不删**（那正是最需要留着的时候）。
- **读坏了就当没有**（和 `focus.json` 一样）：草稿文件坏了的后果只能是「这次没恢复出来」，⛔ 不能让 Spool 打不开或者别的东西跟着坏。

### P9D-1 · 草稿文件 + 编辑面板

- **来历：** 第 108 条。
- **现在：** §2.1 第 1、3、5、6 行。
- **要做：**
  1. 草稿的读写放在一个地方（执行窗定名，比如 `lib/db/drafts.ts`，有测试）：按块存「正文、批注、开面板那一刻块上的正文」，按项目存输入框的字（P9D-2 用）；开机读一次。
  2. 编辑面板开着、字变了 ⇒ 按上面的规矩写；「完成」存成功 ⇒ 删；Esc ⇒ 删；点面板外面（也是存）⇒ 存成功后删。
  3. **恢复：** 一块画出来时，草稿里有它 ⇒ 编辑面板直接开着，里面是草稿的字（不是块上的字），面板顶上一句（意思：这是上次没点「完成」的字；点「完成」存进去，按 Esc 不要了）。⚠️ `openedWith`（删图的依据）照旧按**块上**现在的样子算，⛔ 不按草稿算 —— 不然「完成」时会删错图。
  4. **那一块在那之后被改过**（块上的正文和草稿里记的「开面板那一刻的正文」不一样）⇒ 照样恢复，顶上那句多说半句（意思：这一块后来被改过，点「完成」会用你这一份盖掉）。
  5. 「清空所有数据」把草稿文件一起清掉。
- **不做：** 不改「完成 / Esc / 点外面」三条路本身的含义；不做草稿历史（只留最后一份）；不碰划词更正表单。
- **验收：** vitest：读写（写了能读回、坏文件当没有、块不在了就丢）、「该不该恢复 / 要不要说被改过」那个判断、`openedWith` 不受草稿影响；截图：恢复出来的面板（被改过 / 没被改过各一张，中英）。

### P9D-2 · 项目输入框的字

- **来历：** 第 108、110 条。
- **现在：** §2.1 第 2 行。
- **要做：**
  1. 输入框的字（`byThread`）按同样的规矩写进草稿文件、开机读回来；发出去（`clearDraft`）⇒ 删；项目不在了 ⇒ 删。
  2. **图不留**（第 110 条）：粘进去还没发的图照旧只在内存里；退出之后字回来、图没有。
  3. `draftStore.ts` 头注释照新规矩改写：08-27「不落盘」字那一半被第 108 条推翻（写清楚原来的理由和为什么推翻），图那一半照旧（第 110 条）。
- **不做：** 不给输入框加「上次没发的」提示（打开那个项目就看得到，字就在框里）—— 执行窗觉得需要，停下来问。
- **验收：** vitest：写、读回、发出去就删、只有字没有图；截图：重开之后输入框里的字。

### P9D-3 · 打开 Spool 时提示一句，点一下跳过去

- **来历：** 第 109 条。
- **现在：** §2.1 第 7 行。
- **要做：**
  1. 开机读到编辑面板的草稿 ⇒ 提示一句（意思：〈项目名〉#9 上次没点「完成」，写的字还在）+ 一个「去看」。好几块 ⇒ 说有几块，「去看」到第一块（或者列出来，执行窗定，回执写）。
  2. 「去看」⇒ 选中那个项目、跳到那一块、面板开着、字在（P9D-1 第 3 条那个样子）。
  3. ⚠️ **提示要等到用户看得见、而且一直留到他点了「去看」或者关掉为止** —— 开机自启时窗口是藏着的，几秒就没的 toast 不行。用现成的提示条加一个「一直留着」的做法，或者执行窗找到的更合适的现成做法，回执说明。
  4. 只为编辑面板的草稿提示；输入框的草稿不提示（P9D-2「不做」那条）。
- **不做：** 不在托盘菜单 / 系统通知里提示。
- **验收：** vitest：要不要提示、提示哪几块（块不在了的不算）；截图：提示条（一块 / 好几块，中英）、点了「去看」之后。

## 4. 什么时候停下来问

- 起点不是 §2 写的那样，或者改过代码的提交让 §2.1 对不上。
- 想把草稿放进库、`settings.json`，或者要加 Tauri 命令、要动 `lib.rs` 的退出流程。
- 想连划词更正表单、捕捉浮窗一起管，或者想把输入框里的图也留下（第 110 条说不留）。
- 「完成 / Esc / 点外面」的含义要变。
- 发现新问题：**不顺手修**，按 HANDOFF §8 的 DISCOVERED 格式记进 HANDOFF §9.9，继续做本任务。

## 5. 做完三步之后：换装给 Ocean 验收（先问）

- 三步都提交、全部测试通过之后，**先问 Ocean「现在换装吗」**，得到同意再做。
- 照 P9C 任务书回执 §7.5（`archive/product-taskbooks/TASKBOOK-P9C-AI-ENTRY-LOCKS-2026-10-14.md`），这一次也不迁库：
  - 换装前：`VACUUM INTO` 备份真库到桌面（文件名带日期）；`settings.json`、`focus.json` 拷一份到桌面（文件名带日期）。
  - 现装的是 Developer ID：构建时 `APPLE_SIGNING_IDENTITY` 走环境变量，不改 `tauri.conf.json`，公证变量全部 unset；日志进文件。TSA 偶发失败就整个重跑。
  - ⚠️ **停 GUI 之前先问 Ocean：有没有开着、还没点「完成」的块编辑，或者输入框里没发出去的字。** ⚠️ 这一次换装停的还是**旧版**（没有草稿文件的那一版），所以照旧要问；从这一版装上之后，下一次换装才真正不怕。
  - 停 GUI 和 `--overlay` **按 pid**，杀完再查一遍还在不在；`--mcp` 一个都不碰。旧包 `mv` 进 `~/Desktop/Spool/spool-pre-install/`，别删。
  - 换装后核：sha256 和构建产物一致；两个进程的 txt inode 是新文件；stderr 有 `[double-tap] installed at HID/active`；真库 `user_version` 仍是 33、`integrity_check ok`、各表计数和装前一致；`settings.json` 和装前一样。
- commit、build、换装分开记在回执里；**不 push、不发版**。

## 6. 给 Ocean 的验收单（大白话，换装后给 Ocean）

1. 打开一个项目，双击一块进编辑面板，在正文后面加一句话，**别点「完成」**。从菜单栏图标点「退出 Spool」，再打开 Spool ⇒ 一打开就有一句提示，说这个项目这一块上次没点完成、字还在，旁边一个「去看」。
2. 点「去看」⇒ 跳到那个项目、那一块，编辑面板开着，你加的那句话在里面，面板顶上一句说明。点「完成」⇒ 存进去了；再退出、再打开 ⇒ 不再提示。
3. 再进编辑面板加一句，别点完成，退出再打开，点「去看」⇒ 这次按 Esc ⇒ 那句话不要了，块回到原样；再退出、再打开 ⇒ 不再提示。
4. 在一个项目底下的输入框里打几个字，别发。退出再打开，回到那个项目 ⇒ 字还在输入框里。发出去之后再退出、再打开 ⇒ 输入框是空的。
5. 输入框里粘一张图、打几个字，都别发，退出再打开 ⇒ 字在，图没了（你定的：图不留）。
6. 「被停掉」那种情况你不用自己试：我下次换装停 Spool 之前，你可以故意留一块没点完成的，换装之后看第 1、2 条是不是一样。
7. 界面切成英文，上面看到的新字看一眼 ⇒ 都是英文。

你只要告诉我：这七条里哪几条不对，不对的那条你看到了什么。

## 7. 回执（执行窗填写）

每步一小段：

- 提交：`<hash> <标题>`
- 改了哪些文件（一行一个）
- 怎么验的：命令 + 结果（vitest / cargo 的条数，i18n-check 的输出原文），截图路径
- 施工时自己定的：草稿文件叫什么、存的样子、多久写一次；恢复时面板顶上那句话（中英）；提示条那句话和按钮（中英）、它怎么做到「一直留着」；好几块时怎么提示
- 还差什么、有没有偏离本任务书、新发现记在 HANDOFF 哪里

最后一段：换装（做了没有、装的是哪个 commit、`spctl` 结果、真库和 `settings.json` 的备份文件名、装前装后的核对）、Ocean 验收（还没有就写「待验收」）。

### 7.0 开工

- 起点：`b87e86e` 之后只多了下发本任务书那一笔 docs（`f745aa8`），§2.1 照旧成立，没重核。
- Ocean 开工时说「上一窗口任务验收通过」⇒ P9C 全部通过（HANDOFF §9.2 第 112 条）。
- **插进来一件 owner interruption**（第 113 条，P9D 还没动代码时）：〈个人网站素材〉#21 – 25 合并之后图片坏了。修在 `4b714d6`：带批注的块合并后走 `SegmentedContent`，它不认图片行，屏幕上露出 `![](spool-image:…)` 原文；现在接 `BlockItem` 同一个 `renderImage`，库里的字不动，pack 本来就对。真库只读查过，眼下没有处在坏状态的块。同类的另一条（来源不同时 `[from …]` 贴在图片行前面）没一起改，记成 HANDOFF `DISCOVERED-20261015-2`。Ocean 选了「等 P9D 做完一起装」（第 114 条）。

### 7.1 P9D-1 · 草稿文件 + 编辑面板

- 提交：`c0f1f27 feat(drafts): 编辑面板的字边写边存，退出、换装、崩溃之后再打开，面板开着、字还在（P9D-1）`
- 改的文件：`src/lib/db/drafts.ts`（新）、`src/lib/db/drafts.test.ts`（新）、`src/stores/draftStore.ts`、`src/components/ThreadView/BlockItem.tsx`、`src/App.tsx`、`src/components/Settings/AdvancedConfig.tsx`、`src/lib/i18n/index.ts`
- 自己定的：
  - 文件叫 **`drafts.json`**，和 `focus.json` 同一个目录、同一种写法（plugin-store）。样子：`{"blocks": {"<块 id>": {"content", "annotation", "baseContent", "baseAnnotation", "savedAt"}}, "composer": {"<项目 id>": "字"}}`（`composer` 是 P9D-2 加的）。`base*` 是开面板那一刻块上的正文和批注。
  - **字停下 300 毫秒写一次盘**（`DRAFT_SAVE_DELAY_MS`），每次写完 `save()`；删（「完成」两格都存进去之后、Esc、改回和打开时一样）**当场写**，不等。写盘排队，后一次不会被前一次盖回去。没变不写；开机读回来没丢东西也不写。
  - 「被改过」比的是正文**和批注**（任务书写的是正文；批注也会被「完成」盖掉，所以一起比）。恢复之后再写，`base` 沿用草稿起笔时那一份，下一次恢复照样知道。
  - 恢复走的是 `openEditor` 本身：**有草稿的块不管从哪儿打开（画出来时、双击、工具条），面板里都是草稿的字**，不会拿块上的字把草稿盖掉。`openedWith`（删图的依据）照旧按块上现在的样子算（`editorOpening`，有测试）。
  - 开机读：库开好之后读（`App.tsx`，不 await，读不到也不挡启动）；块或项目不在了的丢掉，盘上那份跟着改。插件读坏文件时自己当空的，下一次写会盖掉。
  - 「清除所有数据」：`clearAllData` 在 `client.ts` 里，`drafts.ts` 要用 `client.ts` 查库，反过来引会绕成圈 ⇒ 在设置页那个按钮里 `clearAllData()` 之后接着 `clearDraftsFile()`。
  - 同一个项目里两块都有草稿：两个面板叠在一起，点完一个露出下一个（每个面板的「完成 / Esc」只管自己）。
  - 恢复时面板顶上那句话（橙色，太长就折行，按钮不挤）：
    - 没被改过：「这是上次没点「完成」的字。点「完成」存进去，按 Esc 不要了」/ "You didn't press Done on this last time. Done saves it, Esc throws it away"
    - 被改过：「这是上次没点「完成」的字。这一块后来被改过，点「完成」会用你这一份盖掉；按 Esc 不要了」/ "You didn't press Done on this last time. The block has changed since — Done replaces it with this version; Esc throws it away"
  - 顺带的变化：以前面板开着时用键盘跳到别的项目（查找、全局搜索），面板被卸掉、字没了；现在字留在草稿里，回到那个项目面板又开着。
- 验：vitest `drafts.test.ts` 11 条（写了 300 毫秒后落盘、「重开」读回来；删当场写；块删了 / 项目删了读回来就丢；坏文件当没有；清除所有数据；`cleanBlockDrafts`；`editorOpening` 五条，含「openedWith 按块不按草稿」）。全量 tsc 干净、vitest 94 / 1094、`(none missing)`、`--dead` 87（和开工一样）。
- 截图（桌面 `Spool/P9D-screenshots-20261015/`）：`p9d1-restored`（没被改过）、`p9d1-restored-changed`（被改过），各中英。

### 7.2 P9D-2 · 项目输入框的字

- 提交：`6d1bfc6 feat(drafts): 项目底下输入框没发出去的字也边写边存，图不留（P9D-2）`
- 改的文件：`src/lib/db/drafts.ts`、`src/lib/db/drafts.test.ts`、`src/stores/draftStore.ts`（头注释照新规矩改写：原来的理由、第 108 条为什么推翻字那一半、第 110 条图那一半照旧）
- 自己定的：输入框的字和面板草稿进同一个文件（`composer`），同一套写法；发出去（`clearDraft`）或删空了当场删；空的不落盘；开机读回来，项目不在了的丢掉（删工作区时它底下的项目也标了 `deleted_at`，所以只看项目表）。图只在内存里。没给输入框加提示（任务书「不做」）。
- 验：vitest 加 4 条（写进盘、重开回到输入框且没有图；发出去当场删；删空也算删；项目不在了就丢）。全量 tsc 干净、vitest 94 / 1098、`(none missing)`。
- 截图：`p9d2-composer`（重开之后输入框里的字）。

### 7.3 P9D-3 · 打开时提示一句，点一下跳过去

- 提交：`a5a5ab7 feat(drafts): 打开 Spool 时提示上次没点「完成」的块，「去看」一下跳过去（P9D-3）`；`17c988e fix(drafts): 点开机提示上的「去看」或 × 不算「点面板外面」…（P9D-3 补）`
- 改的文件：`src/stores/draftPrompt.ts`（新）、`src/stores/draftPrompt.test.ts`（新）、`src/stores/toastStore.ts`、`src/components/ui/Toast.tsx`、`src/lib/db/drafts.ts`（`loadDrafts` 返回从盘上读回来的那几块）、`src/App.tsx`、`src/lib/i18n/index.ts`；补的那一笔改 `BlockItem.tsx`、`Toast.tsx`
- 自己定的：
  - 「一直留着」：现成的 toast 加一个 `sticky` —— 不计时、Esc（清别的 toast）也不清它，只有「去看」或 × 关得掉。开机自启时窗口藏着，提示条就在那儿等着，窗口一露出来就看得见。
  - 只为**开机时从盘上读回来的**那几块提示（这一次打开之后才写的不提示）；块或项目不在了的、草稿已经了结的不算（每次提示前查库）。
  - 一块：「〈{项目}〉#{编号} 上次没点「完成」，写的字还在」/ "You didn't press Done on “{title}” #{seq} last time — what you wrote is still there"（没有编号时：「〈{项目}〉里有一块……」）。好几块：「有 {n} 块上次没点「完成」，写的字还在」/ "You didn't press Done on {n} blocks last time — …"，「去看」到**最近写的那一块**；那一块点了「完成」或 Esc 之后，还剩的**再提示一次**（按 × 关掉的不再冒出来）。按钮「去看」/ "Show me"。
  - 「去看」= 回到「内容」页签、选中那个项目、跳到那一块；面板由那一块画出来时自己开（P9D-1 的恢复）。
  - **补的那一笔**：自己复查时发现，恢复出来的面板已经开着时去点那条提示，会先触发「点外面 = 存」—— 字被悄悄存掉、面板关了，「被改过」那句用户根本没看到。现在一直留着的提示条不算「外面」，别的 toast 照旧。截图台上真的按下（mousedown）「去看」验过：改之前面板关了（`check-without-fix`），改之后还开着（`check-prompt-go-open`）。
- 验：vitest `draftPrompt.test.ts` 8 条（要不要提示、去哪一块；块删了 / 项目删了 / 草稿了结了都不算；一块的那句话、不计时、Esc 清不掉；「去看」选中项目、跳到那一块；好几块走一遍；× 之后不再冒出来；没有留下的不提示）。全量 tsc 干净、vitest 95 / 1106、`(none missing)`、`--dead` 87；cargo 192 过 · 5 跳过；sidecar 14；`cargo tree` 那条空。
- 截图：`p9d3-prompt-one`、`p9d3-prompt-many`、`p9d3-prompt-go`（点了「去看」之后：跳到那个项目，面板开着、字在），各中英。

### 7.4 还差什么、偏离、新发现

- **已经完成的项目（done）里的块**：项目完成后默认画的是只读的摘要视图，那里不恢复面板，「去看」也只能把人带到摘要视图，要再点一下「看全部」才开。完成了的项目里改块很少见，没在这一份里改，记成 HANDOFF `DISCOVERED-20261015-3`。
- 输入框「发出去」是先清草稿再存进库（P9D 之前就这样）；存进库失败的话那段字没了，现在盘上那份也是当场删的。没改（任务书写的是「发出去就删」），记成 HANDOFF `DISCOVERED-20261015-4`。
- 写盘用的是插件的 `fs::write`（不是先写临时文件再换名）：正好在写的那一下被停掉，文件可能写坏 ⇒ 下次读当没有（照任务书「读坏了就当没有」）。窗口只有写盘那几毫秒。
- 偏离：「被改过」多比了批注（见 7.1）；「清除所有数据」从设置页按钮清，不在 `clearAllData` 里（见 7.1）。

## 8. 收尾的文档动作（执行窗做）

- 本任务书首屏改成 `COMPLETE —— 待 Ocean 验收`，`git mv` 进 `docs/archive/product-taskbooks/`。
- HANDOFF：§9.3「丢字修复」那一行写「已完成，任务书在 archive/…」；§9.2 记换装那一问；§9.8 写唯一下一步（Ocean 验收 P9D ⇒ 发版一）；新发现进 §9.9。
- `docs/README.md` 入口那一行跟着改（只暂存自己那一行，见 §2）。

### 7.5 换装（Ocean 10-15 答「现在换装，没有没存的字」）

- 构建：在 `17c988e` 上，`src` / `src-tauri` / `site` / `scripts` 没有未提交改动；命令同 P9C §7.5（`APPLE_SIGNING_IDENTITY` 走环境变量、公证变量全 unset、日志进文件、`tauri.conf.json` 没改）；「skipping app notarization」；TSA 一遍过（主程序 12:01:01、`spool-ai` 12:01:00）；`--verify --deep --strict` 过；新二进制 `--mcp` 连真库副本（`VACUUM INTO` 到 scratchpad）：24 个工具，和上一版一样。
- 装前：Developer ID、`Unnotarized Developer ID`。真库 v33 · ok · 工作区 15 / 项目 53（都是没删的）/ 块 1130 · 正文 365523 · 批注 13802 / 文件 33 · 正文 224068 / 图片 18 张 9136780 字节 / 跟进 19 / 回顾记录 26 / 待审 0；快照 25 个；`settings.json` 26 个键；数据目录里还没有 `drafts.json`。
- 停：GUI 91835、`--overlay` 91869 按 pid `kill -TERM`，第一次就退了；17 个 `--mcp` 一个没碰。
- 备份（桌面）：`spool.before-p9d-install-20261015-120205.db`（v33 · ok · 1130 块 · 正文 365523）、`settings.before-p9d-install-20261015-120205.json`、`focus.before-p9d-install-20261015-120205.json`。旧包挪到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261015-120205-pre-p9d.app`。新包 `ditto` 进 `/Applications`，`open --stdout … --stderr …` 起来。
- 装后：sha256 `c190c3c6…` 和构建产物一致；主进程 59723、`--overlay` 59732 都是 12:02:24（换装之后）起的，txt inode 都是 81000145，就是新文件；`spctl` = `Unnotarized Developer ID`（和装前一样）；stderr 只有 `[overlay] helper started` 和 `[double-tap] installed at HID/active` 两行。真库上面那一串数逐项和装前一样（不迁移，快照仍 25 个）；`settings.json` 和装前逐字节一样。`drafts.json` 还没有 —— 第一次在面板或输入框里打字才写（读回来没丢东西不写）。
- 这一次不改 MCP、不改库，旧的 `--mcp` 子进程照常能用，不用重启 AI 客户端。
- ⚠️ 这一次停的还是旧版（没有边写边存），所以照旧先问了；从这一版起，下一次换装停 GUI 时没点「完成」的字也留得住。
- commit、build、换装分开记在上面；**没 push，没发版**。
- Ocean 验收：**待验收** —— §6 七条，外加开工时插进来的那一条：
  8. 打开〈个人网站素材〉，选中 #21 – #25 合并 ⇒ 合并出来的那一块里五张图都画成图（在原来的位置，批注跟在各自那张图底下），⛔ 不出现 `![](spool-image:…)` 这样一行字。不想留就 ⌘Z 撤回。
