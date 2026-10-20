# 产品任务书 P9X —— 修 P9W 在 Windows 上记下的问题（测试、图片路径、空快照、路径闸）

> **状态：COMPLETE —— 待 Ocean 验收**（2026-10-20 下发并执行完）：`-1` `-2` `-3` `-4` `-5` `-7` 都改了，另修了 CI 从 08-20 起就跑不到 `cargo test` 的问题
> （`-8`，第 169 条）；GitHub 的 Windows 机器上 **vitest 1176 · cargo 200 过 · 0 红 · 4 忽略 · 安装包打得出来**（run 39494949228），Mac 上数字只多不少。
> 提交在本地 `main` 和远端分支 `p9x-windows-test-fixes`；**还没合进远端 main**（要问 Ocean）。界面那部分等不受管理的 Windows 真机（§6 第 3 条）。回执在 §7。
>
> （下发时：ACTIVE —— 2026-10-20 下发，同一窗执行；Ocean 选完就是授权，HANDOFF §9.2 第 168 条）
>
> **唯一交付：** P9W（`c07a799`）记下的 `DISCOVERED-20261020-1`、`-3`、`-4`、`-5`，加上这一窗新发现、Ocean 让并进来的 `-7`，
> 在 Mac 上改完、测完，再到 GitHub 的 Windows 机器上（`windows-build` 手动触发，**新分支，不是 main**）跑到 `cargo test` 全绿；
> `-2` 先看 GitHub 的机器撞不撞，撞了才用「只在测试时生效」的办法修。
>
> **来历：** Ocean 2026-10-20：「win窗口的Claude code推送了修改，给我提示词，在下一窗口做审核和修复」（**owner interruption**）。
> 这一窗先审了 `c07a799`（§2.1，全过），再把六条摆给 Ocean 选（§4）。做完回到原来的顺序：**P9R 验收（Mac）→ P10**。
>
> **边界：**
> - 只改选中那几条牵涉的代码；**不加依赖**（`cargo tree` 网络库那条照旧空；`\\?\` 前缀自己写几行去掉，⛔ 不加 dunce 之类）、CSP 不改、库结构不改（v35）。
> - **Mac 的输出一个字节都不变**：pack golden、导出、MCP 的文字在 Mac 上和现在一样；Mac 上测试条数只多不少。
> - `windows-build.yml` 的**触发条件不改**；`-2` 真要动它，只加一行环境变量（§3 P9X-6）。
> - 不碰实验线（`TASKBOOK-STAGE0A-*`、`CODEX-HANDOFF-*`、`docs/README.md` 里研究那几行）；**不动 `docs/EXECUTION_POLICY.md`**。
> - 提交照 `CLAUDE.md` §5：任何地方都不写 AI 署名，提交说明里也不写执行用的工具名；每次提交后跑 §5 的自查。
> - **推分支、触发 CI、合进 main、推 main、换装 —— 每一样先问 Ocean。** 推新分支 + 手动跑 CI，Ocean 已经答「可以」（§4 ③）；合进 main、推 main 绿了再问。
>   这几条不影响 Mac 上已有的库，默认不换装。

---

## 1. 开工前读

1. `docs/EXECUTION_POLICY.md`（只读）、`docs/HANDOFF-2026-09-04.md` 首屏 + §9.2 第 164 – 168 条 + §9.3 P9W / P9X 两行 + §9.4 + §9.9 `DISCOVERED-20261010-9`、`-20261020-6`。
2. `docs/archive/product-taskbooks/TASKBOOK-P9W-WINDOWS-V070-VERIFY-2026-10-20.md` §7.1（Windows 上 cargo 的报错原文和副本上往下探的两层）。
3. 本任务书附录 A（`-1` – `-5` 的原文，从 HANDOFF 搬过来的）和 §2.2（`-7`）。

## 2. 现在（2026-10-20 对着 `c07a799` 核过）

### 2.1 审 `c07a799`（只读，全过，没有要改的文档）

| 核什么 | 结果 | 证据 |
|---|---|---|
| 只改了 docs | 过 | `86487d6..c07a799` 只动 3 个 docs 文件；`src` `src-tauri` `package*.json` 差异为空 |
| 署名 | 过 | §5 自查 clean；作者 / 提交者 KIM-ocean-HZ。新加的几处工具名是环境事实（装了哪些客户端、权限闸），下发时也这么写 |
| 没有对外动作 | 过 | v0.7.0 Release 仍只有两个 Mac dmg；远端 16 个 tag 和本地一样、最新 v0.7.0；`windows-build` 最后一次跑 08-19，10-19 之后只有发版那次官网部署 |
| `gmtime_r` | 过 | `compress_sweep.rs:275`，整个模块 `#[cfg(test)]`（`lib.rs:8`） |
| 废纸篓 / AppData | 过 | `file_identity.rs:336` 起 Windows 版 `in_trash` 认 `$Recycle.Bin`；`mcp.rs:6724` 起 `path_gate_rules` 的 Windows 分支 `home_private: "AppData"` |
| 10 条测试 | 过（原因要改一处，见 §2.2） | 逐条找到；6 条期望值是测试自己 canonicalize 出来的 `\\?\` 路径，产品在 `file_identity::plain` / `mcp::plain_path` 里去掉了前缀 |
| `-4` 两个渲染器 | 过 | `imageLines.ts` `renderImageLines` 和 `mcp.rs` `render_image_lines` 都原样写路径；路径只有一个来处 `images.rs:383` |
| `-5` | 过 | `client.ts:1159`：版本不对就先快照，0 也走 |
| 「08-19 依赖一样」 | 过 | muda / rfd / tauri-runtime-wry / tauri-build 都和 `ba8c394` 一样 |
| 文档结构 | 过 | §9.2 第 1 – 167 条连续；§9.3 / §9.8 / §9.9 / README 入口 / 归档路径一致；首屏和回执自洽；没碰 EXECUTION_POLICY 和实验线文件 |

### 2.2 这一窗新发现：`DISCOVERED-20261020-7` · Windows 上 AI 可读的文件挪进 AppData / 系统目录，不会「停下来问」

- 路线：P · 类型：非阻断 bug（隐私边上）· 严重度：P2 · 状态：**approved**（Ocean 10-20「并进 P9X 一起修」，第 168 条）
- 来源：这一窗读 `-3` 那两条 held 测试时对着代码推出来的（这台 Mac 编不了 Windows，CI 上证实）
- 证据：`path_gate_rules()` 在 Windows 上的 `home` 和 `system_roots` 都过了 `canonical_or_same`（`mcp.rs:6727` 起）⇒ `\\?\C:\Users\…`、`\\?\C:\Windows`；
  `file_follow::where_now` 拿去问 `path_gate_stop` 的是 `file_identity::resolve` 找到的新位置，那条路去掉了前缀（`file_identity::plain`）⇒ `C:\Users\…`。
  Rust 的 `Path` 认为 `\\?\C:`（VerbatimDisk）和 `C:`（Disk）是两个盘：`strip_prefix(home)` 失败、`starts_with(root)` 失败 ⇒ 只剩「路径里有点开头的一段」那条还管用。
  P9W 记成「测试用 `Library/Caches`、Windows 是 `AppData`」的那两条 held 测试，红的真正原因是这个（测试里的规则是显式给的 `Library`，平台不同不影响它）。
  `gate_proposed_path` 不受影响：它比的两边都是 canonicalize 出来的。
- 影响：Windows 上，一个「AI 可读」的文件被挪进 `%USERPROFILE%\AppData` 或系统目录，Spool 会悄悄跟过去，`get_blocks` 把新路径交给 AI —— 设计上这里应该停下来、等用户点「是这个」。
  Windows 上还没发过带这段代码的版本（Windows 用户在 v0.6.1，文件跟踪是 P9 / v33 才有的）。
- 建议：`path_gate_stop` 比较之前，路径、`home`、每个系统目录都先去掉 `\\?\`（复用 `plain_path`）；Mac 上没有这种前缀，行为一点不变。
- 验收标准：Windows 上用真的 `path_gate_rules()`，`%USERPROFILE%\AppData\…` 和 `%SystemRoot%\…` 的普通路径（不带 `\\?\`）都被拦、`Documents` 不拦；held 那两条测试照产品的样子建规则（家目录是 canonicalize 过的）也是绿的。

### 2.3 基线（Mac，`c07a799`）

tsc 干净 · vitest 113 个文件 / 1173 · cargo 222 过 · 5 跳过 · sidecar 14 · `i18n-check` `(none missing)` · `--dead` 87 · `cargo tree … | grep` 网络库 空。

## 3. 步骤（按顺序；每一步一笔提交，提交后跑 §5 自查）

### P9X-0 · 下发（这一笔，只有 docs）

本任务书 + HANDOFF（§9.2 第 168 条、§9.3 P9X 一行、§9.8、§9.9 `-1` – `-5` 只留「已下发到 …」、`-7` 一行）+ `docs/README.md` 入口那一行。
HANDOFF 和 README 里有别的窗口没提交的改动 —— 只暂存自己的 hunk（`git diff` 出补丁、删掉别人的 hunk、`git apply --cached`）。

### P9X-1 · `-1` 测试编不过

- `compress_sweep.rs` 的 `chrono_ish` 改用 `crate::systime::utc_from_epoch_ms`（纯算术、两个平台同一段，`libc` 不用了），格式不变。
- 加一条钉住输出的测试（几个时刻，含闰年 2 月 29 日和年末）；先在**改之前**的实现上跑一遍确认同样是绿的 ⇒ Mac 上输出逐字不变。
- 验：`cargo test` Mac 223 过 · 5 跳过。

### P9X-2 · `-7` 路径闸两边都去掉 `\\?\`

- `mcp.rs` `path_gate_stop`：比较前 `path`、`rules.home`、`system_roots` 都过 `plain_path`。只这一处，`gate_proposed_path` / `where_now` 都经过它。
- 加一条 `#[cfg(windows)]` 测试：真的 `path_gate_rules()`，`%USERPROFILE%\AppData\Local\…`、`%SystemRoot%\…` 的普通路径被拦，`%USERPROFILE%\Documents\…` 不拦。
- 验：Mac 上 cargo 条数不变、全绿（Windows 那条在 CI 上看）。

### P9X-3 · `-4` Windows 上图片路径写正斜杠

- `images.rs` `cached_images_of` 里 `path` 那一行：Windows 上 `\` 换成 `/`，别的平台原样。两个渲染器和 `get_blocks` 都从这里拿路径 ⇒ 自然逐字一致，Mac 输出一个字节不变，golden 不动。
- 导出成文件夹时 .md 里的相对链接本来就是 `/` 拼的（`folder.ts` `under()`），不动。
- 加一条 `#[cfg(windows)]` 测试钉住样子。
- 验：Mac 上 golden 两边（vitest `golden` + cargo）照旧绿；cargo 条数不变。

### P9X-4 · `-3` 10 条测试不再写死 Mac

- 路径那 6 条：测试里比较用的路径去掉 `\\?\`，用户 / AI 给的路径也写成不带前缀的（产品真实的样子）；`file_follow` 测试模块里 `path_text` 换成去前缀的版本；
  `mcp` 那 4 条用 `plain_path`。规则里的家目录**照旧**用 canonicalize 出来的（和产品一样），这样 `-7` 有测试盯着。
  `pictures_reach_get_blocks…`：库开在 canonicalize + 去前缀的临时目录下（Windows 上 GitHub 机器的临时目录可能是 `RUNNER~1` 这种短名，sqlite 不展开短名），期望值照 `-4` 的写法。
- 废纸篓那条：Mac `.Trashes/501`，Windows `$Recycle.Bin/<SID 样子的一段>`。
- held 那两条：家目录下的「私有」那一段按平台给（Mac `Library/Caches`，Windows `AppData/Local`）。
- Spotlight、截图小图临时文件夹那两条：`#[cfg(target_os = "macos")]`；`spotlight_query` 加 `#[cfg_attr(not(target_os = "macos"), allow(dead_code))]`（照 `images.rs` `shot_pending_in` 的现成写法，Windows 上不多出警告）。
- 验：Mac 上 cargo 条数和 P9X-3 之后一样、全绿。

### P9X-5 · `-5` 全新首启不写空快照

- `client.ts` `migrateSchema`：**只有「版本是 0、而且库里一行用户数据都没有」**才跳过快照。
  版本 0 但有数据时走的是「拒绝重建」那条，报错里写着刚留了快照 ⇒ 照写（2026-05-29 抹库那一类）。
- `client.test.ts`：把 `@tauri-apps/api/path` 换成一个可以指向临时目录的假的（默认照旧失败，其他测试的行为不变），加三条：全新空库不写；升级（v34 → v35）写一个 `spool.pre-migration-v34-…db`；版本 0 但有数据，拒绝重建之前照样写。
- 验：vitest 1173 + 3 = 1176。

### P9X-6 · 在 GitHub 的 Windows 机器上验（`-2` 在这一步定）

1. 推新分支 `p9x-windows-test-fixes`（HTTPS + gh token），`gh workflow run windows-build.yml --ref p9x-windows-test-fixes`。
2. 看 `cargo test` 那一步：
   - 测试 exe 起得来 ⇒ `-2` 在 GitHub 的机器上不撞：只记一句，留到发版二（那台不受管理的 Windows 上再看）。
   - 退出 `0xc0000139`（和 P9W 一样）⇒ **只在测试时生效的开关**：`build.rs` 只有在环境变量 `SPOOL_TEST_CC6_MANIFEST` 设了的时候，才改用 `new_without_app_manifest()` + 链接器 `/MANIFEST:EMBED /MANIFESTINPUT:<tauri-build 自带那份 v6 清单的副本>`；
     `windows-build.yml` 的 `cargo test` 那一步加这一行 `env`。打安装包那一步不设 ⇒ **发出去的 exe 一点不变**。再跑一次。
3. 红的逐条看：属于这几条的照改，再跑；**不属于这几条的，停下来问 Ocean**（记 DISCOVERED）。
4. 安装包那一步的产物只看「打得出来」，不下载、不装、不发。

### P9X-7 · 收尾

- 回执 §7；首屏改 `COMPLETE —— 待 Ocean 验收`，`git mv` 进 `docs/archive/product-taskbooks/`。
- HANDOFF §9.2 / §9.3 / §9.8 / §9.9（`-2` 的结论、`DISCOVERED-20261010-9` 补一行、新发现）、`docs/README.md` 入口那一行；只暂存自己的 hunk。§9.8 唯一下一步：**P9R 验收（Mac）→ P10**。
- 问 Ocean：分支合进 main、推 main（纯代码 + docs，不改 `site/` ⇒ 不触发官网部署）。

## 4. 已经问过 Ocean 的（10-20，这一窗）

1. 修哪几条：**`-1` + `-3`、`-4`、`-5` 都修**（都是推荐项）；`-6` 这一窗不做（发版二的安装说明）。
2. `-2`：**先看 GitHub 机器撞不撞**（推荐项）；撞了用只在测试时生效的开关。
3. 推新分支、手动跑 `windows-build`（可能两三次）：**可以**。
4. 新发现 `-7`：**并进 P9X 一起修**（推荐项）。

## 5. 什么时候停下来问

- CI 上红的不属于 `-1` / `-2` / `-3` / `-4` / `-5` / `-7`。
- 要改 `src-tauri` 以外的东西（`client.ts` 那一处除外）、要加依赖、要改 workflow 的触发条件。
- Mac 上任何 golden / 导出 / MCP 文字的输出变了。
- 合进 main、推 main、换装。
- 每次提交后：`git log -1 --pretty=full | grep -iE 'claude|anthropic|co-authored|🤖|generated with' && echo "ATTRIBUTION FOUND — DO NOT PUSH" || echo "clean"`；命中就停。

## 6. 验收（给 Ocean）

这一批改的全是 Windows 上才走的路和测试；Mac 上看不到区别（这一点本身就是要验的：Mac 的数字只多不少、golden 不变）。

1. ☐ GitHub 上 `windows-build` 在 `p9x-windows-test-fixes` 上那一次：`cargo test` 绿、安装包打得出来（链接在回执里）。
2. ☐ Mac：tsc、vitest、cargo、sidecar、i18n、`cargo tree` 的数字（回执 §7）。
3. ☐ 等一台**不受管理的 Windows** 真机（发版二之前，照 P9W §6 走的时候顺带看）：
   - `-4`：pack / 导出的 .md 里图片那一行是 `C:/Users/…` 正斜杠，在资源管理器、常用的 Markdown 查看器里点得开（P9W §6 第 15、20 条）；
   - `-7`：一个「AI 可读」的项目文件挪进 `AppData` 里 → 右栏显示「找到了，但没跟过去」那一种，点「是这个」才跟（P9W §6 第 18 条那一套）；
   - `-2`：如果最后用了 P9X-6 第 2 步的开关 —— 发出去的 exe 没变，托盘菜单、文件对话框照 P9W §6 第 4、20 条看一眼就行。

## 7. 回执（2026-10-20 执行）

### 7.1 开工

- 同步：本地落后 `c07a799` 一笔，`docs/HANDOFF-2026-09-04.md`、`docs/README.md` 里有别的窗口没提交的改动 ⇒ 先存补丁
  （`~/Desktop/Spool/patches/uncommitted-{HANDOFF,README}-before-c07a799-20261020.patch`）→ checkout 这两个文件 → fetch（HTTPS + gh token）→ `merge --ff-only`
  → `apply --3way` 放回。README 一处相邻行冲突，两边都留（研究线改过的 CODEX 那一行 + `c07a799` 的 P9W 入口行）。放回后两份文件的未提交差异和同步前一样
  （HANDOFF +18；README +15 / -4）。没用 stash。之后每次提交这两个文件都只暂存自己的改动（拼出「HEAD + 只有我的改动」写进索引，核过它加上别人的补丁正好等于工作区）。
- 基线：§2.3；审核：§2.1；Ocean 的答复：§4（下发时）+ 下面第 169 条。

### 7.2 提交（本地 `main`；同样推到了远端分支 `p9x-windows-test-fixes`）

| 步 | 提交 | 做了什么 | Mac 上怎么验的 |
|---|---|---|---|
| P9X-0 | `b432254` | 下发：本任务书 + HANDOFF / README（只暂存自己的） | — |
| P9X-1 | `950c574` | `-1`：`chrono_ish` 改用 `systime::utc_from_epoch_ms` | 新测试（1970、2000-02-29、2026 年末）先在旧的 `gmtime_r` 上跑过是绿的 ⇒ 输出逐字不变；cargo 223 过 · 5 跳过（+1） |
| P9X-2 | `f6842ea` | `-7`：`path_gate_stop` 比较前路径、家目录、系统目录都过 `plain_path`；加一条 `#[cfg(windows)]` 测试（真的 `path_gate_rules()`） | cargo 223 · 5，警告不变 |
| P9X-3 | `c5d625a` | `-4`：`images.rs` 新增 `shown_path`，Windows 上 `\` → `/` | golden 两边照旧（cargo `golden_pack_matches_fixture`、vitest `src/lib/pack` 120 条）；cargo 223 · 5。**和 §3 的出入**：没另加 `#[cfg(windows)]` 测试，改在 `cached_copies_are_written_once_and_named_by_id` 里加一句「路径里没有 `\`」—— 走的是真的生成路径，两个平台都跑，Windows 上就是钉住这次改动 |
| P9X-4 | `15f5552` | `-3`：路径 6 条、废纸篓、held 两条、Spotlight / 截图临时文件夹两条（见 §3 P9X-4） | cargo 223 · 5，10 条在 Mac 上照样在跑 |
| P9X-5 | `9ec936f` | `-5`：版本 0 **且**一行用户数据都没有才不写快照；`client.test.ts` 假的 path 模块 + 三条测试 | vitest 1176（+3）；临时把条件换成「总是快照」，「全新库不写」那条变红、另两条照旧绿，再改回来 |
| P9X-6 | `a44b2b7` | **`-8`**（第 169 条）：`windows-build.yml` 在 `cargo test` 前加一步 `npm run build:sidecar` | YAML 能解析、触发条件没变 |
| P9X-6 | `738e3b0` | `-2`：`build.rs` 只在设了 `SPOOL_TEST_CC6_MANIFEST` 时改用 `new_without_app_manifest()` + `/MANIFEST:EMBED /MANIFESTINPUT:windows-test-manifest.xml`；workflow 只在 `cargo test` 那一步设它 | cargo 223 · 5；`windows-test-manifest.xml` = tauri-build 2.6.0 自带那份逐字节（sha256 `4636f3ba…3d43`） |
| P9X-6 | `13662fd` | `-3` 里 `a_moved_or_renamed_file…` 在 Windows 上露出的第二处 Mac 假设：挪动后的身份 Mac 重新记一份（bookmark 带位置），Windows 不变（盘号 + 文件号） | cargo 223 · 5，Mac 照旧断言「不同」 |

每笔提交后都跑了 `CLAUDE.md` §5 的自查：全部 clean。

### 7.3 GitHub 的 Windows 机器（`windows-latest`，手动触发，分支 `p9x-windows-test-fixes`）

| run | 提交 | 结果 |
|---|---|---|
| 39470669135 | `9ec936f` | `cargo test` 连构建脚本都没过：`resource path binaries\spool-ai-x86_64-pc-windows-msvc.exe doesn't exist` —— 08-20 加 sidecar 以来 CI 一直会这样（`-8`），和 P9X 无关 ⇒ 问 Ocean（第 169 条） |
| 39492440800 | `a44b2b7` | 编过了（`-1` 在 Windows 上成立）；测试 exe 退出 `0xc0000139 STATUS_ENTRYPOINT_NOT_FOUND` ⇒ **`-2` GitHub 的机器也撞** |
| 39493581115 | `738e3b0` | 测试跑起来了：199 过 · 1 红 · 4 忽略；红的是上面 `13662fd` 那一处 |
| **39494949228** | **`13662fd`** | **全绿**（2026-10-20 20:47 – 21:04 UTC）：vitest 113 个文件 / 1176 · sidecar 编过 · cargo **200 过 · 0 红 · 4 忽略**（忽略的 4 条是要真钱 / 真库 / 联网的那几条）· 安装包 `Spool_0.7.0_x64-setup.exe` 打出来了（artifact `spool-windows-nsis` 的 zip 8,567,806 字节；没下载、没装、没发） |

- 链接：https://github.com/KIM-ocean-HZ/spool/actions/runs/39494949228
- P9W 记的 10 条 + 这一批新加的，在 Windows 上全是 ok：`a_moved_or_renamed_file…`、`seen_reports_where…`、`deleted_trash_and_unknown…`、`an_ai_readable_file_moved_into…held_not_followed`（`-7`）、
  `mcp::a_moved_file_is_reported…`、`file_proposals_queue…`、`pictures_reach_get_blocks…`（`-4`）、`the_path_gate_judges…`、`on_windows_a_path_into_appdata_or_a_system_folder_stops…`（`-7`）、
  `cached_copies_are_written_once_and_named_by_id`（`-4`）、`chrono_ish_writes_utc_the_same_on_every_platform`（`-1`）；Spotlight、截图临时文件夹两条在 Windows 上不编（预期）。
- 条数：Windows 200 + 4 忽略，Mac 223 + 5 跳过 —— `cfg` 两边各编一部分。
- 编译警告：8 条（`capture.rs` 3 个没用到的 import、几个只在 Mac 用的函数等），**都是改之前就有的**，这一批没多出一条（`spotlight_query` 的 `allow` 起作用了）。
- 发出去的 exe：打安装包那一步不设 `SPOOL_TEST_CC6_MANIFEST` ⇒ `build.rs` 走原来的 `tauri_build::build()`，嵌清单的办法和以前一样。这一点是按构造推的，**没有拆开安装包核清单**。

### 7.4 Mac 最终数字（`13662fd`）

tsc 干净 · vitest 113 / **1176**（+3）· cargo **223 过 · 5 跳过**（+1）· sidecar 14 · `i18n-check` `(none missing)` · `--dead` 87 · `cargo tree … | grep` 网络库 空 · 编译警告和开工时逐行一样。
（最后一遍整套跑的时候 `knitStore.test.ts` 撤销那条红了一次 —— 就是 `DISCOVERED-20261018-3` 那个同一毫秒的偶发红，这一批没碰 knitStore；马上重跑 1176 全绿。）

### 7.5 还差什么

- **合进远端 main、推 main**：要问 Ocean（本地 `main` 已经是这些提交；推 main 不改 `site/` ⇒ 不触发官网部署；`windows-build` 只认 `windows-port` 和手动 ⇒ 也不会自己跑）。
- 界面那部分（§6 第 3 条）：等不受管理的 Windows 真机，发版二之前照 P9W §6 走的时候顺带看。
- 没换装（这几条都不影响 Mac 上已有的库；Mac 上的行为没变）。

### 7.6 新发现（记在 HANDOFF §9.9）

- `DISCOVERED-20261020-8` · Windows CI 的 `cargo test` 从 08-20 加 sidecar 起就跑不到 —— Ocean 10-20 让修（第 169 条），`a44b2b7` 已修。
- `DISCOVERED-20261020-9` · Windows 上路径闸的拒绝消息里，家目录 / 系统目录显示成 `\\?\C:\…`（`gate_stop_message` 用的是 canonicalize 过的规则）—— 只是显示，captured，P3。
- `-2` 的结论：GitHub 的机器也撞，用只在测试时生效的开关修了；`DISCOVERED-20261010-9` 补了一行（合进 main 之后从 main 跑 CI，`cargo test` 能绿）。

---

## 附录 A · 从 HANDOFF §9.9 搬过来的原文（2026-10-20，P9W 记的）

#### DISCOVERED-20261020-1 · Rust 测试在 Windows 上编不过：`compress_sweep.rs` 用了 Windows 没有的 `libc::gmtime_r`

- 路线：P · 类型：非阻断 bug（测试）· 严重度：P2 · 状态：captured（Ocean 10-20「Record, don't fix」，§9.2 第 166 条）→ **approved（第 168 条，P9X）**
- 来源：P9W W-0
- 证据：Windows（rustc 1.99.1、MSVC）上 `cargo test --manifest-path src-tauri/Cargo.toml`：`error[E0425]: cannot find function gmtime_r in crate libc --> src\compress_sweep.rs:275:20`。`compress_sweep` 是 `#[cfg(test)]` 模块，发布构建不受影响（P9W W-1 打包过了）；这一行 08-21（`4f60c69`）进来，Windows CI 最后一次跑在 08-19。
- 影响：Windows 上整套 Rust 测试一条都跑不起来。
- 建议：`cfg(unix)` 照旧 `gmtime_r`，`cfg(windows)` 用 `libc::gmtime_s(&mut tm, &secs)`（参数顺序反过来）—— P9W 在仓库外副本上验过能编；或者换成 `systime::utc_from_epoch_ms`（纯算术，两边一样）。
- 验收标准：Windows 上 `cargo test` 编得过（之后是 `-2`）。

#### DISCOVERED-20261020-2 · Windows 上 Rust 测试程序起不来：测试 exe 没有 Common Controls v6 清单

- 路线：P · 类型：非阻断 bug（测试基础设施）· 严重度：P2 · 状态：captured（同第 166 条）→ **approved，有条件（第 168 条：先看 GitHub 的机器撞不撞）**
- 来源：P9W W-0（在仓库外副本上修了 `-1` 之后）
- 证据：测试 exe 退出 `0xc0000139 STATUS_ENTRYPOINT_NOT_FOUND`；`dumpbin /imports`：它从 `comctl32.dll` 进 `TaskDialogIndirect`（只有 v6 有；来自 Tauri 自己的依赖 `muda` / `rfd` / `tauri-runtime-wry`）。tauri-build 只给 app 的 exe 嵌 v6 清单；`cargo:rustc-link-arg-tests` 管不到库的单元测试（cargo 报「does not have a test target」）。08-19 那次 CI 依赖版本一样却是绿的，原因没查清（工具链换了是一个可能）。
- 影响：同 `-1`；CI 一旦从 `main` 跑，`cargo test` 那一步会红（`DISCOVERED-20261010-9`）。
- 建议：照 tauri-build 的做法：`build.rs` 在 Windows 上用 `WindowsAttributes::new_without_app_manifest()`，再用 `cargo:rustc-link-arg=/MANIFEST:EMBED` + `/MANIFESTINPUT:<清单>` 嵌同一份 v6 清单（tauri-build 2.6.0 自带的 `windows-app-manifest.xml`）—— P9W 在副本上验过测试能跑起来。⚠️ 这一改连**发出去的 exe** 嵌清单的方式也变了：改完要重新打包、装机看托盘菜单和文件对话框。
- 验收标准：Windows 上 `cargo test` 跑到出结果；装上的发布包托盘右键菜单、文件对话框照常。
- 2026-10-20（P9X 下发时补）：tauri-build 的清单走资源文件、只用 `rustc-link-arg-bins` 链给 bin（`embed-resource` 3.0.9）⇒ 库的单元测试 exe 拿不到，这和 P9W 的诊断一致。Ocean 选的做法见本任务书 P9X-6 第 2 步（只在设了环境变量时生效，发布的 exe 不变）。

#### DISCOVERED-20261020-3 · 10 条 Rust 测试写死了 Mac 的假设，在 Windows 上红

- 路线：P · 类型：非阻断 bug（测试）· 严重度：P3 · 状态：captured（同第 166 条）→ **approved（第 168 条，P9X）**
- 来源：P9W W-0（副本上修了 `-1`、`-2` 之后：190 过 · 10 红 · 4 忽略；Mac 222 过 · 5 跳过，条数不同是 `cfg` 两边各编一部分）
- 证据：① 6 条期望值用 `std::fs::canonicalize`，Windows 上带 `\\?\` 前缀，产品给 `C:\…`（`file_follow::a_moved_or_renamed_file…`、`seen_reports_where…`；`mcp::a_moved_file_is_reported…`、`file_proposals_queue…`、`pictures_reach_get_blocks…`、`the_path_gate_judges…`）；② `file_follow::deleted_trash_and_unknown…` 用 `.Trashes/501` 当废纸篓（Windows 产品认 `$Recycle.Bin`，`file_identity.rs`）；③ `file_follow::an_ai_readable_file_moved_into…held_not_followed` 用 `Library/Caches`（Windows 产品是 `AppData`，`mcp.rs` `path_gate_rules`）；④ `file_follow::the_spotlight_query…` 测 Spotlight（只有 Mac），文件名里的 `\` 在 Windows 是分隔符；⑤ `images::a_picture_in_the_screenshot_uis_temp_folder_is_pending` 用只读的 `File::open` 改修改时间（Windows 上 `Access is denied`），测的又是 Mac 截图小图的临时文件夹。逐条原文在 P9W 回执 §7.1。
- 影响：只在测试；但 Windows 那几条分支（`$Recycle.Bin`、`AppData`、路径）因此一直没有单元测试盖着。
- 建议：①：比较前两边都去掉 `\\?\`（或期望值走产品同一个函数）；②③：按平台给目录，顺带补上 Windows 那条分支的测试；④⑤：`#[cfg(target_os = "macos")]`。
- 验收标准：Windows 上 `cargo test` 全绿，Mac 上条数不少。
- 2026-10-20（P9X 下发时补）：③ 和 `seen_reports_where…` 的 held 那一段，红的真正原因不是 `Library` / `AppData`，是 `-7`（§2.2）。

#### DISCOVERED-20261020-4 · Windows 上 pack 里的图片路径是反斜杠的绝对路径

- 路线：P · 类型：小功能 / 兼容 · 严重度：P3 · 状态：captured → **approved（第 168 条，P9X）**
- 来源：P9W W-5（任务书 §6 第 15 条要「记原样」，界面起不来，用 MCP `get_pack` 看的）
- 证据：`![](C:\Users\…\image-cache\p9wimg0000000000000001.png)`。
- 影响：CommonMark 里反斜杠后面跟标点算转义（`\_`、`\#`、`\[` ……），路径里一旦有这种文件夹名，粘出去渲染时路径就坏；不少 Markdown 查看器也不把 `C:\…` 当本地文件。导出成文件夹时 .md 里的相对链接什么样，这一窗没看到（`-6`）。
- 建议：先在真 Windows 上看一眼导出的 .md 点不点得开；不行的话 Windows 上 pack / 导出里的路径统一写正斜杠（`C:/Users/…`）。
- 验收标准：Windows 上 pack 和导出的 .md 里，图片路径在常见 Markdown 查看器和资源管理器里打得开。
- 2026-10-20（P9X 下发时补）：导出成文件夹时 .md 里的图片 / 文件链接是 `folder.ts` 用 `/` 拼的相对路径（`images/12-1.png`），不分平台；反斜杠只出在绝对的缓存路径（pack、复制、单个 .md、MCP 的 `get_pack` / `get_blocks`），它们都来自 `images.rs:383` 一处。

#### DISCOVERED-20261020-5 · 全新首启也在库旁边写一个空的 `pre-migration-v0` 快照

- 路线：P · 类型：小 bug · 严重度：P3 · 状态：captured → **approved（第 168 条，P9X）**
- 来源：P9W 回执 §7.4 C（空库走真 `initDb`）
- 证据：`migrateSchema` 在 `user_version` 不等于当前版本时先 `backupDbBeforeMigration(db, current, …)`；全新空库 `current = 0` 也走这一步，写出 4 KB 的 `spool.pre-migration-v0-<时间>.db`。代码各平台一样，不是 Windows 才有。
- 影响：新用户库旁边多一个没用的文件；无害。
- 建议：`current === 0` 时跳过快照。
- 验收标准：全新首启后库旁边没有 `pre-migration-v0`；升级时快照照旧。
- 2026-10-20（P9X 下发时补）：Ocean 选的是「版本 0 **而且**一行用户数据都没有」才跳过 —— 版本 0 但有数据时走拒绝重建，那条的报错说刚留了快照。
