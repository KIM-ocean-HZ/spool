# 产品任务书 P8 —— pack 导出带上项目的文件和图片（单项目 + 工作区）

> **状态：COMPLETE —— 待 Ocean 验收。**（2026-10-10：四步已提交、已换装；验收第一轮三条已改、还没换装；回执在 §7 末尾。）
>
> **唯一交付：** 下面 §3 的四步（P8-1 – P8-4），按顺序做完，每一步测试通过、单独一笔提交，并在 §7 写回执。
>
> **来历：** HANDOFF §9.3 路线图的 P8 段。P7 已于 2026-10-10 由 Ocean 验收通过（「验收通过，下发P8」），他同一句话要求下发 P8。
> 正文从 HANDOFF §9.6 **搬过来**（HANDOFF 那边只留一行「已下发到 …」）。其中有一条来自 P7 验收第 7 条，10-08 并进来，见 §9.2 第 50 条。
> 下发这一窗问了 Ocean 两件事，答复记在 HANDOFF §9.2 第 52–53 条，§3 里也写了。
> **「现在」一栏每一条都对着 `854310d` 的代码和真库只读查询重核过。**
>
> **授权来源：** 都是 Ocean 自己的拍板，本任务书只引用、不改：
> - 09-30 第 7 条和第 8 条的后半（HANDOFF §9.1、§9.2 第 3、12 条）；
> - 10-08 P7 验收第 7 条（§9.2 第 50 条）；
> - 10-10 两条答复（§9.2 第 52、53 条）。
>
> **边界：** 只做这四步。
> - 不碰实验线：`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行。
> - 不动 `docs/EXECUTION_POLICY.md`。
> - **不改库结构。**
> - **不改 MCP**：`get_pack`、`get_blocks` 的输出和工具描述都不动。
> - **不改「复制」出去的 pack，也不改 golden。** 导出时才有的写法只在导出那条路上出现。
> - 不 push、不发版。换装给 Ocean 验收之前先问一句（§5）。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：
   - 首屏、§9.0 – §9.4、§9.8 – §9.9；
   - §9.2 第 3、8、12、47、48、50、52、53 条；
   - §10.6 红线速查，尤其「两个 pack 渲染器」「表头 TS / Rust 各写一遍」那几行。
3. `CLAUDE.md` §3（只改该改的）和 §5（提交信息里不许有任何工具署名）。
4. 上两份任务书的回执：
   - `docs/archive/product-taskbooks/TASKBOOK-P2-MOVE-DEDUP-PACK-EXPORT-2026-10-02.md` §3 B1 和 §7：单个 .md 导出那一套，这一批在它上面长；
   - `docs/archive/product-taskbooks/TASKBOOK-P7-RELATION-SUGGESTIONS-IMAGES-2026-10-07.md` §7 末尾：图文混排、图片缓存目录、两个渲染器怎么对齐。
5. 记忆：
   - `tauri-sync-commands-freeze-ui`：新 Tauri 命令一律 `(async)`；
   - `ui-language-follows-system`、`no-test-environment-spool`；
   - `isolated-verify-workflow`：§5 换装时才需要，§43 / §45 是截图的办法。
6. 每一步开工前，读该步「现在」一栏点名的文件。

## 2. 起点

- **分支和提交：** 本地 `main`。开工时 `git log -1` 应该是下发本任务书的那笔 docs 提交（标题以 `docs: P7 验收通过` 开头），它的上一笔是 `854310d`。之后只多了 docs 提交也行；不是这样就停下来说明。
- **只提交自己的文件：** 工作树里有别人没提交的改动（`docs/` 下研究线的文件、`docs/README.md` 里研究那几行）。
  - 只 `git add` 你自己改的文件的路径，绝不 `git add -A` / `git add .` / `git commit -a`。
  - README 要改的话只暂存自己那一行：拿 HEAD 版本只换那一行，用 `git hash-object -w` + `git update-index --cacheinfo`。
- **删文件会被权限拦：** `git rm` 写给 Ocean，请他在输入框里用 `! git rm …` 跑，别绕路；`git mv` 能自己跑（记忆 `file-deletion-needs-ocean`）。
- **提交：** 每步一笔，提交信息用中文。提交后跑 `CLAUDE.md` §5 那条自查；命中产品内容里的 claude 字样，按记忆 `attribution-grep-false-positive` 复核。
- **测试基线**（`854310d` 上实测；开工前先跑一遍对一下，每步做完再跑）：

```bash
npx tsc -b                                                # 干净
npx vitest run                                            # 80 个文件 / 946 条全过
cargo test --manifest-path src-tauri/Cargo.toml           # 170 过 · 4 跳过
cargo test --manifest-path src-tauri/sidecar/Cargo.toml   # 14 过
node scripts/i18n-check.mjs                               # (none missing) —— 这一条也在 vitest 里
node scripts/i18n-check.mjs --dead                        # 87 行 DEAD（基线噪声），只看你造出来的
cargo tree --manifest-path src-tauri/Cargo.toml -e normal | grep -iE "ureq|rustls|reqwest|hyper|openssl"   # 必须是空的
```

  Vitest 输出里那几十行 `[db] pre-migration backup FAILED … window is not defined` 是老噪声，不用管。

- **真库现状**（10-10 只读查询，给你估规模用，⛔ 别写库）：
  - 项目文件 13 个，全是 `file`，没有 `folder`。2 个的路径在电脑上已经找不到了，其余共约 7.4 MB，最大的一个 6.5 MB。
  - 图片 4 张（共 0.76 MB），在同一个项目里。

## 3. 四步

### 共同的规矩（四步都照这个）

- **默认全带：** 文件和图片默认都带上，可以选不带（§9.2 第 50 条）。清单里文件一个一个勾，有「全选」和「只选其中几个」（第 12 条）。
- **清单里怎么列：**
  - 文件每个一行：**名字、路径、大小、挂在哪**（§9.6 原文）。「挂在哪」照右栏「项目文件」的写法：挂在块上的写块号（数字，不带 `#`，§9.2 第 27 条），挂在项目上的不标。路径是给用户自己看的，只在清单里出现，⛔ 不进 .md。
  - 图片是**一个开关**：「图片 N 张，共 X MB」，全带或全不带（第 53 条）。
  - 文件夹（`kind = 'folder'`）和文件一样列出来、一样能勾，大小按里面所有文件加起来算（第 12 条：「文件夹拷不拷由用户在这里勾，不再单独定规则」）。
  - 电脑上找不到的文件标「找不到了」，不能勾（§9.6 原文）。
  - 已被取代的旧文件本来就不进 pack，**不进清单**。
  - 底部写一共多少个文件、多大。
- **导出出来的样子：**
  - 有东西要拷 ⇒ 导出一个**文件夹**：`.md` 加上文件和图片；
  - 一样都没勾（或者项目里本来就没有文件、没有图）⇒ 照旧导出**单个 .md**（P2 那一套，一个字节都不变）。
- **.md 里怎么写**（这是「整个文件夹传到网页 AI 也能用」那一半，§9.2 第 50 条）：
  - **勾了的文件：** 那一行的名字写成 Markdown 链接，指向它在导出文件夹里的**相对路径**；这一行其余部分（类型、`· on #12`、抽出来的正文）照旧。
  - **没勾的文件：** 那一行照旧。
    - ⚠️ §9.6 原文写的是「没勾的文件照旧只写原路径」，但今天的 pack 里文件那一行**只写名字、从来不写路径**：§3.1-5「pack 不许出现本机目录」，第 47 条又说这条规矩从此只管文件那一行。所以「照旧」= 只写名字。
  - **带了图：** 图片行写成 `![注释](<相对路径>)`。
  - **没带图：** 写 `![注释](image)`，只留注释、不写任何路径（第 52 条）。这正是今天渲染器里「找不到那张图」的写法。
  - **验收的硬指标：** 不管怎么勾，导出的 .md 里都**不出现任何本机绝对路径**。
- **相对路径一律往下走，不出现 `..`：**
  - 单项目：`pack.md` 旁边放 `files/`、`images/`。
  - 工作区：每个项目的 `01-项目.md` 旁边有一个同名文件夹 `01-项目/`，里面放 `files/`、`images/`。
- **哪些图跟着走：** 只拷「这一次 pack 里真出现了的那几块」的图。范围选「最近 20 块」时，范围外的块的图不拷；退役的块（assemble 本来就丢掉）的图也不拷。
  文件跟项目走，不跟范围走：v15 的规矩，`PackDialog.tsx` 里有注释。
- **「复制」键不动：** 拷出去的还是今天那份（图片写完整路径，§9.2 第 47 / 48 条）。

### P8-1 · Rust：清单要的数字 + 导出命令

- **现在**（`854310d`）：
  - `src-tauri/src/pack.rs`
    - `:62` `write_pack_folder(parent, folder_name, files)`：只新建目录（重名就 `-2`、`-3`…），写之前把每一个目标路径都过一遍 `resolve_within`（拒绝 `..`、绝对路径、不能用的字段），`(async)`。
    - `:111` `write_pack_file`：单个 .md，先过 `transfer::clear_export_target` 拒绝写进 Spool 自己的数据目录。
  - 文件大小：今天没有能问「这个路径在不在、多大、是不是文件夹」的命令，只有 `capture.rs:853` 的 `path_is_dir`。
  - 图片：字节在库里，`images.rs` 有 `:152 read_image(conn, id)` → `(format, bytes)`、`:315 open_library(app)`、`cache_ext`（扩展名）。
- **要做：**
  1. 一个新命令，问一组路径各自「在不在、是文件还是文件夹、多大」。
     - 文件夹的大小把里面所有文件加起来。⛔ 不跟着符号链接走，碰到的符号链接不算。
     - `(async)`。一次问完一个项目（工作区就是所有勾了的项目）。
  2. 一个新命令，导出带文件的 pack：把 .md 写进去，同时拷文件、写图片。在 `write_pack_folder` 的规矩上加：
     - **写之前全部先核一遍，任何一样不对就一样都不写**（和现在「每个目标路径先过一遍」同一个意思）。要核的是：每一个目标路径过 `resolve_within`；每一个要拷的源都还在；每一张图都还在库里。
       - 源刚好在列清单之后被删了 ⇒ 整个导出拒绝，报出是哪几个；⛔ 不导出一份链接指向空文件的 .md。
     - 拷文件：只读源；文件夹整个拷，⛔ 不跟符号链接（跳过并记个数，回执里写）。
     - 写图片：从库里读字节原样写出去，扩展名照 `cache_ext`。⛔ 不重新编码，⛔ 不从 `image-cache/` 拷（那是可以随时删的缓存）。
     - 导出目标在 Spool 自己的数据目录里 ⇒ 拒绝，照 `clear_export_target` 的理由。
     - 只新建文件夹，不写进已有的（照现在）。
  3. 两个命令都注册进 `lib.rs`。前端不拿任何新的文件系统权限，`capabilities` 不动。
- **不做：** 不改 `write_pack_folder` / `write_pack_file` 现有的行为（工作区「不带文件」照旧走前者，单个 .md 照旧走后者）；不压缩、不打 zip。
- **验收（Rust 单测）：**
  - 拷出来的文件和源逐字节相等；文件夹递归拷、符号链接没跟；
  - 图片和库里的字节逐字节相等；
  - 源不在 ⇒ 拒绝，而且目标位置什么都没建；`..` / 绝对路径 ⇒ 拒绝；目标在数据目录里 ⇒ 拒绝；
  - 第二次导出同名 ⇒ `-2`；
  - 「在不在 / 多大」那条：文件、文件夹（含子文件夹）、不存在、符号链接四种情况。

### P8-2 · 渲染：导出时文件和图片写相对路径

- **现在**（`854310d`）：
  - `src/lib/pack/assemble.ts`
    - `:240` `renderProjectFile`：文件那一行，名字取 `attachmentLabel` / `packTarget`，后者只取文件名；
    - `:673` `files = attachments.filter(supersededBy == null)`，`:677` 进「Related Files & Links」；
    - `:327` 块的头行走 `renderImageLines(b.content, images)`，图片行的路径就是 `PackImage.path`，库里没有那张图时写 `![注释](image)`。
  - `src/lib/blocks/imageLines.ts` `renderImageLines` 在 mcp.rs 里有一模一样的 `render_image_lines`，golden 两边都盯着。
  - `src/lib/pack/folder.ts:285`：工作区里每个项目一个 `01-项目.md`，子工作区是子目录，根上有 `INDEX.md`。
- **要做：**
  1. 给 `assemble` 加一个**只有导出才传**的选项：哪些文件导出了、各自的相对路径。
     - 传了 ⇒ 那几个文件的名字写成 Markdown 链接；没传 ⇒ 输出和今天逐字节一样。
     - golden 两边都不用改：Rust 那边不会有这个选项，因为 MCP 不导出。
  2. 图片不用改渲染器：带图就把 `PackImage.path` 换成相对路径传进去；不带图就不传，渲染器本来就写 `![注释](image)`。
     ⚠️ 不带图时还要确认**整块正文末尾补图那一行**（旧块里没有对应行的图）也不出现：今天没传图就不补。在回执里写清楚你核过。
  3. `folder.ts`：按 §3「共同的规矩」把每个项目的 `files/`、`images/` 放进 `01-项目/`，算出相对路径。
     - 同一个项目里两个文件同名 ⇒ 第二个加 `-2`（加在扩展名前面）。
     - 文件名里不能进路径的字符照 `sanitizeSegment` 那一套洗掉；Rust 那边 `segment_is_safe` 照样再核一遍。
  4. 单项目也有一个对应的函数，算出 `pack.md` + `files/` + `images/` 的清单（给 P8-3 用）。
- **不做：** 不改 Rust 渲染器、不改 golden 夹具、不改表头。
- **验收（vitest）：**
  - 勾了的文件 ⇒ 链接、相对路径对；没勾的 ⇒ 那一行和今天一样；
  - 带图 ⇒ `![注释](images/…)`；不带 ⇒ `![注释](image)`，而且没有补在末尾的那几行；
  - **四种勾法（全带 / 只带文件 / 只带图 / 都不带）各导一次，.md 里都没有 `/Users/` 或任何以 `/`、`~`、盘符开头的路径**；
  - 不传导出选项时，和今天的输出逐字节一样，golden 两边照旧过；
  - 工作区那一份的相对路径从它自己那个 .md 出发是对的（子工作区两层深也对）。

### P8-3 · 单项目导出：清单 + 文件夹

- **现在**（`854310d`）：
  - `src/components/Pack/PackDialog.tsx`：`:130` `onExport` 弹系统存储对话框，`invoke('write_pack_file', …)` 写单个 .md；`:122` `onCopy` 复制；`:257` 按钮「导出 .md」。
  - `src/components/Pack/PackHost.tsx` 把项目的块、文件、图片（`cachedImagesOf`）凑齐了交给它。
- **要做：**
  1. 对话框里加那张清单（§3「共同的规矩」）。只有项目里有文件或者有图时才出现；文件的大小和找不到的标记用 P8-1 那条命令现查。
  2. 有勾选 ⇒ 按钮写「导出文件夹」（措辞施工时定，英文界面要有对应）。
     - 选目录用系统的「选文件夹」对话框，照工作区导出那样（`WorkspacePackHost.tsx:148` 的 `open({ directory: true })`）；
     - 文件夹名 = 项目名 + 日期，照单个 .md 的默认文件名规则；
     - 导完写一句导出到哪了。
  3. 一样都没勾 ⇒ 照旧「导出 .md」，走 `write_pack_file`，和今天逐字节一样。
  4. 「复制」不动。
- **不做：** 不在这里加压缩、不改范围选择器。
- **验收：**
  - vitest 能测的部分测：哪种勾法走哪条路、文件夹里的 .md 和 `assemble` 带导出选项的输出逐字节一样；
  - 清单的样子按记忆 `isolated-verify-workflow` §45 截一张图给自己看（浅色、深色各一张）；
  - 真导出要 Ocean 手指（§6）。

### P8-4 · 工作区导出：同一张清单

- **现在**（`854310d`）：
  - `src/components/Pack/WorkspacePackDialog.tsx`：一棵项目树，每个项目一个勾，底部算字数；
  - `WorkspacePackHost.tsx:145` `onExport` → `write_pack_folder`。
- **要做：**
  1. 项目树下面加文件和图片的清单，按项目分组，只列勾了的项目。
     - 图片还是**一个开关**：管整个导出的所有图片，写「图片 N 张，共 X MB」。
     - 文件一个一个勾，规矩同上。
  2. 有要拷的 ⇒ 走 P8-1 的新命令；一样都没有 ⇒ 照旧走 `write_pack_folder`，输出和今天一样。
  3. `INDEX.md` 要不要提一句「每个项目的文件在它旁边那个同名文件夹里」：表头是给收件 AI 读的英文契约。
     - 加不加施工时定。加的话只加一句英文，写进回执；
     - 不加也要在回执里说为什么。
- **验收：**
  - vitest：两层深的工作区导出，每个项目的链接都指向自己那个文件夹；没勾任何文件和图时 `files` 列表和今天一样；
  - 截图同 P8-3；
  - 真导出要 Ocean 手指。

## 4. 什么时候停下来问

- 起点不是 §2 写的那样。
- 某一步做下去要改库结构、改 MCP、改「复制」出去的 pack 或 golden。这四样都不该需要，需要了就说明任务书漏算了什么。
- 发现和「现在」一栏对不上的现状（代码已经变了）。
- 要删文件（请 Ocean 跑，见 §2）。
- 一个文件夹大到你觉得该拦一下（比如几个 GB）：先别自己加上限，把比较写清楚问 Ocean。
- 发现新问题：**不顺手修**，按 HANDOFF §8 的 DISCOVERED 格式记进 HANDOFF §9.9，继续做本任务。

## 5. 做完四步之后：换装给 Ocean 验收（先问）

- 四步都提交、全部测试通过之后，**先问 Ocean「现在换装吗」**，得到同意再做。
- 照 P7 任务书回执末尾第二轮「换装」那一段，每一步都有命令和核对项。要点：
  - 现装的是 Developer ID：构建时 `APPLE_SIGNING_IDENTITY` 走环境变量，不改 `tauri.conf.json`，公证变量全部 unset；日志进文件。TSA 偶发失败就整个重跑。
  - 停 GUI 和 `--overlay` **按 pid**，杀完再查一遍还在不在；`--mcp` 一个都不碰。
  - 换装前 `VACUUM INTO` 备份真库到桌面，文件名带日期；旧包 `mv` 进 `~/Desktop/Spool/spool-pre-install/`，别删。
  - 换装后核：
    - sha256 和构建产物一致；
    - 两个进程的 txt inode 是新文件；
    - stderr 有 `[double-tap] installed at HID/active`；
    - 真库版本和计数前后一致。
- 这一批不改库结构，真库不会迁移。commit、build、换装分开记在回执里；**不 push、不发版**。

## 6. 给 Ocean 的验收单（大白话，换装后给 Ocean）

1. 打开有文件、也有图的那个项目，点「打包」⇒ 预览下面多了一张清单：每个文件一行（名字、路径、大小、挂在哪一块），一行「图片 N 张」，底部写一共多大，默认全勾着。
2. 什么都不改，点导出，选桌面 ⇒ 桌面上多一个文件夹，里面有 `pack.md`、`files/`、`images/`。
3. 把这个文件夹整个拖进网页版的 ChatGPT 或 Claude，问它「看一下 pack.md，里面提到的文件和图片你都能打开吗」⇒ 它能对上。
4. 再导一次，这次把图片那一行的勾去掉 ⇒ 文件夹里没有 `images/`；打开 `pack.md`，原来放图的地方只剩 `![注释](image)`。
5. 把文件全部取消、图片也取消，再导 ⇒ 这次只出来一个 `.md`，和以前一样。
6. 如果有电脑上已经删掉的文件 ⇒ 清单里那一行写「找不到了」，勾不上。
7. 在左边栏工作区上点「打包整个工作区」⇒ 同样有这张清单（按项目分组）。导出来每个项目的 .md 旁边有一个同名文件夹，装着它自己的文件和图。
8. 界面切成英文，上面看到的新字看一眼 ⇒ 都是英文。

你只要告诉我：这八条里哪几条不对，不对的那条你看到了什么。

## 7. 回执（执行窗填写）

每步一小段：

- 提交：`<hash> <标题>`
- 改了哪些文件（一行一个）
- 怎么验的：命令 + 结果（vitest / cargo 的条数，i18n-check 的输出原文）
- 施工时自己定的：按钮措辞、同名文件怎么加后缀、`INDEX.md` 加没加那一句、符号链接跳过了几个、两个新命令叫什么。
- 还差什么、有没有偏离本任务书、新发现记在 HANDOFF 哪里

最后一段：换装（做了没有、装的是哪个 commit、`spctl` 结果、真库备份文件名）、Ocean 验收（还没有就写「待验收」）。

## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 验收`（Ocean 验过后改成 `COMPLETE`），`git mv` 进 `docs/archive/product-taskbooks/`。
2. `docs/HANDOFF-2026-09-04.md`：§9.3 路线图 P8 那一行改成「已完成，任务书在 archive/product-taskbooks/…」；§9.8「唯一下一步」写清楚。
   - 下一段是 P9。下发 P9 之前先读 §9.7，并核一下 `EXECUTION_POLICY.md` §5.2 的交替：P1–P11 是 Ocean 09-30 批准的同一个 P 里程碑，按 §9.0 不算连开两个里程碑。
3. `docs/README.md` 入口表里 ACTIVE 产品任务书那一行改成「暂无，待下发 P9」（只暂存这一行）。
4. 这些文档改动单独一笔提交（同样只 add 自己改的路径）。

### 回执（2026-10-10 执行窗）

开工核对：起点 `339222b`，上一笔 `854310d`，和 §2 一致。基线和 §2 写的一字不差：tsc 干净；vitest 80 / 946；cargo 170 · 4；sidecar 14；`(none missing)`；`--dead` 87 行；`cargo tree` 网络那条是空的。

#### P8-1 · Rust：清单要的数字 + 导出命令

- 提交：`0fa2670 feat(pack): 带文件导出的 Rust 那一半 —— …`
- 改了：
  - `src-tauri/src/pack.rs`
  - `src-tauri/src/images.rs`（只加一个 `stored_ext`：库里那张图导出时用的扩展名，和 `cache_ext` 同一套）
  - `src-tauri/src/lib.rs`（注册两个命令）
- 两个新命令：
  - `pack_source_sizes(paths)` ⇒ 每个路径回 `{kind, bytes}`；`kind` 是 `file` / `folder`，`null` = 电脑上找不到了。
  - `write_pack_export(parent, folderName, files, copies, images)` ⇒ 回 `{root, skipped}`。
- 施工时定的：
  - **符号链接**：文件夹**里面**碰到的，不跟、不算大小、拷的时候跳过，记进 `skipped`（管道、socket 这种也算在里面）。**挂上去的那个路径本身**是符号链接时，按它指向的东西算，因为那是用户挂的文件；指向的东西不在 = 找不到了。测试里跳过了 2 个；真库没有文件夹，真导出应该是 0。
  - **写之前全部核一遍**：每个目标过 `resolve_within`；同一个位置不许写两次；每个源都还在；每张图都还在库里，扩展名和 `cache_ext` 对得上。任何一样不对，连导出文件夹都不建。
  - **报错**：文件被删掉回代号 `missing:<路径列表>`，图片不在库里回 `no_image`，界面翻成用户的语言（和 `images.rs` 回代号是同一个做法）；别的错误照旧是中文原话。
  - **写到一半出错**（比如盘满了）：把这一次新建的文件夹整个删掉再报错，不留半份。那个文件夹是这一次 `create_dir` 新建的，里面只有这一次写的东西。
  - **数据目录**：直接调 `clear_export_target`。新文件夹这时还不存在，它只会拒绝，不会删任何东西。
  - **图片**：只读连接读库（和导出整库同一种），写的是 `block_images` 里的原字节。⛔ 不重新编码，⛔ 不从 `image-cache/` 拷。
  - `write_pack_folder` 里「重名加 -2」那段抽成 `free_folder`，两边共用，行为不变，原来那条测试照旧过。
- 怎么验的：新加 6 条 Rust 测试。
  - 拷出来的文件、文件夹和源逐字节相等：含不是 UTF-8 的字节、子文件夹；两个符号链接没跟，`skipped` = 2；源文件没被动过。
  - 图片和库里的字节逐字节相等；扩展名不对拒；图不在库里回 `no_image`。
  - 源不在拒，报出是哪一个；`..`、绝对路径、两样写到同一个位置、导出到数据目录都拒；这几种情况下目标位置什么都没建。
  - 第二次同名导出 ⇒ `-2`。
  - 「在不在 / 多大」：文件、文件夹（子文件夹加进去，里面的符号链接不算）、不存在、挂上去的符号链接（跟）、断掉的符号链接（找不到了）。
  - cargo 175 · 4（比基线多 5；pack 模块 11 条），警告只有基线那三条，`cargo tree` 网络那条是空的。

#### P8-2 · 渲染：导出时文件和图片写相对路径

- 提交：`6604e9a feat(pack): 导出时文件和图片写相对路径 —— …`
- 改了：
  - `src/lib/pack/assemble.ts`
  - `src/lib/pack/folder.ts`
  - `src/lib/pack/folder.test.ts`
  - `src/lib/images/blockImageIo.ts`（`cachedImagesOf` 带上图片大小，给清单用）
  - `src-tauri/src/pack.rs`（一行注释里的文件名写错了，改成 `folder.ts`）
- 施工时定的：
  - `assemble` 的新选项叫 `exportedFiles`（附件 id ⇒ 相对路径）。传了，那一行写成 `- [名字](files/名字.pdf) · on #12`，其余照旧；不传，逐字节和今天一样。`PackImage` 多一个可选的 `sizeBytes`，渲染器不读它。
  - `files/` 里的文件叫它在电脑上的名字（不是界面上改过的标签），照 `sanitizeSegment` 洗（空格变 `-`），扩展名单独保住：`sanitizeSegment` 截 60 个字，会把 `.pdf` 截掉。
  - **同名文件**：第二个写成 `report-2.pdf`。比的时候不分大小写，因为 Mac 的盘默认不分，`Report.pdf` 和 `report.pdf` 在盘上是同一个文件。
  - **图片按块号起名**：`images/12-1.png` = 第 12 块的第 1 张（没有块号的旧块用图片 id）。只拷这一次 pack 里真出现的那几块的图，范围外的、退役的都不拷。
  - **不带图**：不传图，渲染器写 `![注释](image)`。**核过末尾补图那一行**：`renderImageLines` 只有拿到图才会在正文后面补，没传就一行都不补。测试钉住了：不带图时 `![](` 一次都不出现，旧块正文后面什么都没多。
  - **工作区**：项目旁边的同名文件夹只有真有东西放进去时才占这个名字。子工作区要是正好也叫「01 项目」：有东西拷时它变成 `01-项目-2/`，没东西拷时和今天一样。
  - **`INDEX.md` 加了一句英文**，只在有同名文件夹时才加：`A folder named like a project file, without .md, holds that project's attached files and images; the links in the project file point into it.` 理由：这些文件夹不在 INDEX 的目录里，AI 列文件夹时会把它们当成子工作区。没东西拷时 INDEX 一个字不变。
  - 链接用的是原样的相对路径（不加尖括号），和图片行的写法一致。文件名里的括号不洗：成对的括号 Markdown 认得；只有一边括号的文件名（比如 `a(1.pdf`）链接会断，这种名字很少，没处理。
- ⚠️ **一处和任务书字面不一致**，我按第 52 条和硬指标做了：
  - §3 写「一样都没勾 ⇒ 照旧导出单个 .md（P2 那一套，一个字节都不变）」，P8-4 验收写「没勾任何文件和图时 files 列表和今天一样」。
  - 但今天（P7-8 之后）导出的 .md 里，图片行写的是本机完整路径。项目里有图、用户把图片取消的时候，「一个字节都不变」就等于写出本机绝对路径，违反「不管怎么勾都不出现本机绝对路径」，也违反第 52 条「没带图只留注释」。
  - 所以：**没有图的项目**，单个 .md 和工作区导出都和今天逐字节一样（有测试）。**有图但不带时**，图片那几行写 `![注释](image)`，别的逐字节一样。走的命令（`write_pack_file` / `write_pack_folder`）没变；「复制」出去的照旧写完整路径。
- 怎么验的（vitest，`folder.test.ts` 新加 13 条）：
  - 勾了的文件 ⇒ 链接、相对路径对；没勾的 ⇒ 那一行和今天一样；被取代的文件不拷。
  - 带图 ⇒ `![注释](images/1-1.png)`，旧块的图跟在正文后面写 `![](images/2-1.jpg)`；范围外、退役的图不拷。
  - 不带图 ⇒ `![注释](image)`，末尾一行都没补。
  - 四种勾法（全带 / 只带文件 / 只带图 / 都不带）各导一次，.md 里都没有 `/Users/`，也没有任何以 `/`、`~/`、盘符开头的路径。同一个测试先确认这个检查在今天的 pack 上确实查得出路径，免得它是一条怎么都过的测试。
  - 导出的 .md 和 `assemble` 带导出选项的输出逐字节一样；不传导出选项时 golden 两边照旧过。
  - 工作区两层深（`材料准备/文书/01-PS.md`）：每个 .md 里的每个链接，从它自己那个 .md 出发都落在这次要写的某个文件上，没有 `..`，链接数和要写的文件数一样多。
  - 全套：vitest 80 / 959。

#### P8-3 · 单项目导出：清单 + 文件夹

- 提交：`71c7e90 feat(pack): 单项目导出带上文件和图片 —— …`
- 改了：
  - `src/components/Pack/PackDialog.tsx`
  - `src/components/Pack/PackCopyList.tsx`（新：清单本身，P8-4 也用它）
  - `src/lib/pack/exportList.ts`（新：问大小、哪些勾着、字节怎么写、导出失败那句话）
  - `src/lib/pack/exportList.test.ts`（新）
  - `src/lib/pack/folder.ts`（加 `carriesAnything`：两个对话框和测试用同一个判断决定走哪条路）
  - `src/lib/i18n/index.ts`
- 施工时定的：
  - **按钮措辞**：有要拷的 ⇒「导出文件夹」（和工作区导出同一个键，英文 Export folder）；一样都没有 ⇒ 照旧「导出 .md」。
  - **清单放在哪**：预览下面、底栏上面，自己能滚（最高 168px）。
    - 标题「一起导出的文件和图片」，右边「全选」。
    - 每个文件一行：图标、名字、完整路径（太长截断，悬停看全）、大小、块号圆圈（和右栏同一个圆圈）。
    - 找不到的文件那一行变灰，写「找不到了」，勾不上。
    - 图片一行：「图片 N 张，共 X KB / MB」。
    - 最下面一行写「一共 N 个文件，X MB」，N 算的是勾着的文件加上带着的图片。
  - 打开对话框时现查大小；没查完之前按导出什么都不做（没有用置灰，见下面 `f9470b9`）。查失败时大小写「—」，不把文件说成找不到：真导出时 Rust 会再核一遍。
  - **文件夹名** = 「项目名-日期」，和单个 .md 的默认文件名同一套，只是不带 .md。选目录用工作区导出那个「选文件夹」对话框。
  - **导完**：底栏写「已导出到 <路径>」；文件夹里有替身（符号链接）没拷的话，后面加「（文件夹里的 N 个替身没有拷）」。对话框不关，和导出 .md 一样。
  - 勾选不记住，和范围一样，是这一次导出的选择。
- 怎么验的：
  - vitest（`exportList.test.ts` 9 条）：
    - 哪种勾法走哪条路：一打开（全勾）⇒ 文件夹；只带一个文件、或者只带图 ⇒ 文件夹；什么都不勾 ⇒ 单个 .md；文件全找不到又没图 ⇒ 单个 .md；图都在范围外 ⇒ 单个 .md。
    - 找不到的勾不上；大小还没回来时不锁行；字节的写法；文件刚被删掉时报出文件名（不带路径）。
  - 「文件夹里的 .md 和 `assemble` 带导出选项的输出逐字节一样」在 P8-2 那条测试里；对话框写出去的就是那一份，一个字节不改。
  - **截图**按记忆 isolated-verify §45：把真的 `PackCopyList` 渲成静态页，用 WKWebView 截。数据是编的：4 个文件（一个挂在第 12 块、一个文件夹、一个找不到了），外加 4 张图。图在 scratchpad 的 `shots/` 里，没进仓库。
    - ⚠️ **Spool 没有深色主题**：`tokens.css` 只有经典版（`:root`）和情人节版。所以截的是经典、情人节两张，另加一张英文界面。
    - 三张都看过：路径截断正常；块号圆圈和大小对齐；找不到的那行变灰；英文「Files and images to include / Select all / Not found / 4 images, 778 KB in all / 7 files in all, 8.8 MB / Export folder」都放得下。
  - 全套：vitest 81 / 968；i18n `(none missing)`，`--dead` 和开工时逐行一样。

#### P8-4 · 工作区导出：同一张清单

- 提交：`2e53a26 feat(pack): 工作区导出也带上文件和图片 —— …`
- 改了：
  - `src/components/Pack/WorkspacePackDialog.tsx`
  - `src/components/Pack/WorkspacePackHost.tsx`
  - `src/components/Pack/PackCopyList.tsx`
  - `src/lib/pack/exportList.ts`
  - `src/lib/pack/exportList.test.ts`
  - `src/lib/pack/folder.test.ts`
- 施工时定的：
  - **清单**：项目树下面，按项目分组，只列勾了的项目；没有文件的项目不出标题。
  - **图片**：还是一个开关，管整个导出所有项目的图。上面加一条细线隔开，不然看着像最后一个项目的图（截图里看出来的）。
  - **大小**：对话框打开时整棵树的文件一次问完，勾项目时不会闪「…」。
  - **走哪条命令**：有要拷的 ⇒ `write_pack_export`，导完提示「已导出到 …」，能点「打开文件夹」；一样都没有 ⇒ 照旧 `write_pack_folder`，提示也照旧「已导出 N 个文件」。
  - **报错**：文件刚被删掉、图片不在库里这两种说成用户的语言；别的照旧显示 Rust 原话（和今天一样）。
  - **`INDEX.md` 那一句**：加了，见 P8-2。
- 怎么验的：
  - vitest：
    - 两层深的工作区里，每个项目 .md 里的链接都只指向它自己那个同名文件夹，没有一个指到隔壁；
    - 没勾任何文件和图、项目里也没有图时，`files` 列表和今天逐字节一样；有图但不带时只有图片行变成 `![注释](image)`（P8-2 那几条）；
    - Rust 原话照旧显示。
  - 分组的样子截了经典、情人节两张，看过。
  - 全套：vitest 81 / 969。

#### 收尾时补的一笔

- 提交：`f9470b9 fix(pack): 清单大小还没查完时，导出键不再置灰 —— …`
- 我在 P8-3 / P8-4 里让导出键在「大小还没查完」时置灰。复查时发现这会让对话框打开那一刻 `autoFocus` 落空（置灰的按钮拿不到焦点），有文件的项目里按回车就导不出了。改成：大小没回来之前按下去什么都不做，按钮不置灰。

#### 最后一遍全套（`f9470b9` 上）

- tsc 干净
- vitest 81 个文件 / 969 条全过（比基线多 1 个文件、23 条）
- cargo 175 过 · 4 跳过；sidecar 14 过
- i18n `(none missing)`；`--dead` 和开工时逐行一样（87 行）
- `cargo tree` 网络那条是空的；Rust 警告只有基线那三条
- `src-tauri/capabilities/`、`tauri.conf.json`、golden 夹具、`mcp.rs`、`EXECUTION_POLICY.md` 都没动
- 没改库结构，没改 MCP，没改「复制」出去的 pack

#### 新发现

- `DISCOVERED-20261010-1`：工作区导出里，两个只差大小写的子工作区会写进同一个文件夹（P8 之前就有）。记在 HANDOFF §9.9，captured，没修。

#### 换装（Ocean 10-10 答「现在换装」）

- 构建：
  - 在 `377a06b` 上构建，`src` / `src-tauri` / `site` / `scripts` 没有未提交改动。
  - 命令和 P7 一样：`env -u APPLE_ID -u APPLE_PASSWORD -u APPLE_TEAM_ID -u APPLE_API_KEY -u APPLE_API_ISSUER -u APPLE_API_KEY_PATH APPLE_SIGNING_IDENTITY="Developer ID Application: Hanze JIN (Q5Y5JRXZ58)" npm run tauri build -- --bundles app`，日志写进文件；没改 `tauri.conf.json`，日志里是「skipping app notarization」。
  - TSA 第一遍就过（主程序、`spool-ai` 都是 01:24:15），没有 `timestamp was expected`；`--verify --deep --strict` 过。
  - 二进制里有 `write_pack_export`、`pack_source_sizes`。前端（`dist/`，01:23）里有「一起导出的文件和图片」和对应的英文。
- 装前：
  - Developer ID，`spctl` = `Unnotarized Developer ID`，0.6.2；`spool` sha256 `e8eecf70…`（P7 第二轮那版）。
  - 真库 v32 · ok · 28 / 67 / 1097 / 13（工作区 / 项目 / 块 / 文件）· 图片 4 张（764139 字节）· 正文 332541 · 批注 13558 · 文件正文 130320；迁移快照 24 个，`mcp-clients.json` 18 行。
- 停：GUI 96363 和 `--overlay` 96409 按 pid `kill -TERM`，1 秒内都退了，再查已不在。`--mcp` 子进程 8 个一个没碰（前后都是 8）。
- 真库备份：`~/Desktop/spool.before-p8-install-20261010-012502.db`（`VACUUM INTO`）。和活库逐项一致：v32 · ok，各项计数和总长都一样。
- 旧包挪到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261010-012507-pre-p8.app`；新包 `ditto` 进 `/Applications`，再 `open --stdout … --stderr …` 起来。
- 装后：
  - `--verify --deep --strict` 过；Developer ID；`spctl` = `Unnotarized Developer ID`；identifier `com.oceanjin.spool`；0.6.2。
  - `spool` sha256 `df8c7565…`，和构建产物一致。
  - 主进程 91116 和 `--overlay` 91142 都是 01:25:07 起的（换装之后），`lsof` txt inode 都是 77921741，就是新文件。
  - stderr 只有 `[overlay] helper started` 和 `[double-tap] installed at HID/active` 两行，没有 error / panic。
- 真库：这一批不改库结构，没有迁移。`user_version` 仍是 32，`integrity_check ok`，各项计数和总长和装前逐项一致；快照仍是 24 个，`mcp-clients.json` 仍是 18 行。
- 那 8 个 `--mcp` 子进程跑的还是旧二进制。这一批没改 MCP，库也没变，所以它们和新版的行为完全一样，不用重启 AI 客户端。
- commit、build、换装分开记在上面；没 push，没发版。

#### Ocean 验收

**第一轮（10-10）**，原话：

> 验收结束：1.打包项目不能给项目文件夹命名，只能选择默认名字；2.严重问题：当前COMP3074工作区HAI-Lecture3项目的文件无法打开，我不知道是文件被我转移了之后路径失效无法打开了（这个问题也需要解决，路径需要跟随文件位置变化，除非用户删除了）还是spool储存的路径丢失。/Users/hzjin/Desktop/HAI/Lecture 3 - Introduction to Natural Language Processing for HAI - 2.pdf有可能是我重新下载了一遍，删掉了原版？需要标清楚文件是被删除的还是spool自己的错误，在导出COMP3074工作区时也会显示Lecture 3 - Introduction to Natural Language Processing for HAI - 2.pdf /Users/hzjin/Desktop/Lecture 3 - Introduction to Natural Language Processing for HAI - 2.pdf（在spool的页面里，路径其实无法显示完整：Lecture 3 - Introduction to Natural Lang...是这样的，用户根本不知道真实路径）找不到了 一共 1 个文件，766 KB；找不到了不能解决问题，应该帮助用户点击跳转到最近的文件夹查证。并且项目右侧边栏的文件管理需要能够主动提示文件被删除或者丢失，让用户确认后才可不提示。

- **先查清楚第 2 条是不是 Spool 的错**（只读查询，没写库）：**不是。** 文件 10-06 挂上时在桌面上，10-07 14:07 被挪进了 `桌面/HAI/`（同一份文件，不是重新下载的）；Spool 记的路径从挂上那一刻起每一份备份里都一样，代码里也没有任何地方改路径。证据写在 HANDOFF §9.9 `DISCOVERED-20261010-3`。
- 问了 Ocean 两件（HANDOFF §9.2 第 57–58 条）：
  - 「路径跟着文件走 + 右栏主动提示丢失、确认后不再提示 + 标清楚挪走 / 废纸篓 / 删掉」这一整套要改库结构 ⇒ Ocean 选**放进下一任务（P9）**；
  - 以前挂的文件 ⇒ **先自动找同名文件，问一句**。
- 当场改了（`8dc204a fix(pack): P8 验收第一轮 —— …`，不改库结构）：
  - 改了：`src-tauri/src/pack.rs`、`src-tauri/src/lib.rs`、`src/components/Pack/PackDialog.tsx`、`src/components/Pack/PackCopyList.tsx`、`src/lib/pack/exportList.ts`、`src/lib/i18n/index.ts`
  - 第 1 条：单项目导出成文件夹时，底栏上面多一个「文件夹名」框（和工作区导出那个一样），默认「项目名-日期」，空着就用默认名。只导单个 .md 时照旧在存储对话框里起名。
  - 路径看不全：清单里每个文件的完整路径单独占一行，太长就折行，不再截断；名字那一行可以截断，因为下一行的路径里有完整名字。
  - 「找不到了」：下面多一个「打开最近的文件夹」。新命令 `open_nearest_folder` 从记着的路径一路往上，打开第一个还在的文件夹（Mac 上是访达，Windows 上是资源管理器）。Lecture 3 那一行点了会打开桌面。
- 怎么验的：
  - Rust 新加 1 条（往上找几层都能找到最近还在的那个文件夹；空路径回不出来）：cargo 176 · 4。
  - tsc 干净；vitest 81 / 969；i18n `(none missing)`，`--dead` 和开工时一样；`cargo tree` 网络那条是空的。
  - 截图用的是这次的真实情况（Lecture 3 找不到、Lecture 4 在 `HAI/`）：经典、情人节、英文三张都看过，完整路径折行正常，「打开最近的文件夹」单独一行。
  - 点下去真的打开访达，要换装后手指验。
- 还没换装。
