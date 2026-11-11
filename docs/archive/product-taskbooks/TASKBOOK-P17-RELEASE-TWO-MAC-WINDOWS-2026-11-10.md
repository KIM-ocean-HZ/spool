# 产品任务书 P17 —— 发版二：Mac + Windows

> **状态：COMPLETE — 待 Ocean 验收（2026-11-11 发出 v0.8.0：Mac + Windows，Release 四个资产、官网和 README 已上线、本机已换正式版；MCP Registry 要 Ocean 跑一条命令，见 §7.7）。** 回执 §7，验收单 §6。之前：ACTIVE（2026-11-10 夜下发）。
>
> **唯一交付**：把 v0.7.4 之后到现在的全部改动（P10、P12 – P16、编号圈）作为一个新版本**同时发 Mac 和 Windows**：Mac 签名 + 公证，Windows 不签名的 NSIS 包；GitHub Release 带四个资产（两个带版本号、两个固定名）；官网和 README 跟着改；MCP Registry 发新版本；本机换成正式版；台账记一行。步骤见 §3，每一步一笔提交（构建和发布本身没有提交的除外），回执写在 §7。
>
> **来历**：HANDOFF §2 / §3。Ocean 11-09「我选择乙先做这三件再发版」（第 266 条）⇒ P16 做完再发版二；11-10 夜「剩下测试我验收了，没问题」（第 301 条）⇒ P16 全部验收通过；同晚插的编号圈（第 302 条，`661b829`）也进这一版。
>
> **授权来源（Ocean 拍板，这份任务书只引用、不改）**
> - 旧第 160 条：发版说明**只写英文**；公证凭据只在对话里当环境变量用，⛔ 不写进任何文件、提交或记忆（旧第 190、223 条同）。
> - 旧第 161 条 + `DISCOVERED-20261018-4`：Windows 下载按钮发版二改回 `latest`。
> - 旧第 207 条：推之前扫一遍新加的行里有没有第三方的名字。
> - 旧第 261 条：推送、发版、改版本号、换装 Mac Spool，**每一次**都要 Ocean 明说。
> - 2026-08-15：**Windows 不签名**，「这条不要再问」。
> - 旧第 231 条：Parallels 来不及就换 Ocean 自己那台 Windows（但那台是学校管理的，`DISCOVERED-20261020-6`，见 §4 第 3 题）。
>
> **边界**
> - **不加功能、不改产品行为。** 只动：版本号、发版说明、README / 官网 / 隐私说明里跟这一版对不上的说法、`server.json`、台账；§4 第 4 题 Ocean 点了头的那几处小改。
> - 做的时候发现产品 bug：发布完整性相关的（打不开、迁移坏库、公证不过、安装包坏、隐私说明说错）停下来问；别的按方针 §7.2 记 HANDOFF §5，不顺手修。
> - 不碰实验线（`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行）；不动 `docs/EXECUTION_POLICY.md`。
> - ⏰ **Parallels 试用 11-20 到期**。Windows 那一半要在那之前做完；看着来不及就提前说（§5）。

---

## 1. 开工前读

1. `docs/EXECUTION_POLICY.md`（不改它）。
2. `docs/HANDOFF-2026-11-09.md`：首屏、§1、§3（这份任务书就是它的展开）、§4、§6（已知限制，发版说明要用）、§8 的 `POLICY-PROPOSAL-20261010-1`、附录 B。
3. 本任务书全文（附录 A 是从 HANDOFF 搬过来的六条原文）。
4. `docs/RELEASE.md` §1、§2、§2.0.1、§2.1、§3；`docs/WINDOWS-CHECK.md`；上一次发版的样子：`docs/RELEASE_NOTES_v0.7.4.md`、`docs/archive/product-taskbooks/TASKBOOK-P9R-RELEASE-ONE-MAC-V070-2026-10-18.md`（§3 – §7）。
5. 这一版里有什么（写发版说明用）：`docs/archive/product-taskbooks/` 里 P10、P12、P13、P14、P15、P16 六份任务书的「要做」和回执，加 `661b829`。
6. 记忆：`release-v062-shipped`（打包三个坑）、`notarization-403-agreement`、`push-requires-gh-token`、`distribution-route-notarized-dmg`（Registry 是 metadata-only）、`isolated-verify-workflow`（§40 – §41 换装、§44 探针、§56 strip、§57）、`spool-db-wipe-incident`（副本跑真迁移）、`parallels-windows-vm-verify`、`windows-ci-verify-from-mac`、`copyright-name-hanze-jin`、`stat-95-5-is-void`、`memtrapbench-paper`、`write-plainly-for-ocean`、`no-license-file`。

## 2. 现在（2026-11-10 夜对着 `f724d15` 核过）

- **版本**：代码里还是 `0.7.4`（三处 + `Cargo.lock`）。最后一个 tag `v0.7.4` → `ba7d2a7`（10-26）。之后 114 笔提交，58 笔碰了代码 / 脚本。
- **库结构**：v0.7.4 用户的库是 **v37**，现在是 **v39**（P15 的 v38、P16-1 的 v39，都只加表 / 加列）。Windows 上真用户只有 v0.6.1，库是 **v23**。
- **推送**：本地比 `origin/main`（`5f762da`，11-06）多 52 笔（之后每窗还会加），没有一笔碰 `site/` 或 `README.md`；碰了 9 个 `docs/` 文件，其中 `HANDOFF-2026-11-09.md` 首行有 PURGE 标记（真库里的校名、项目名、截止日期）。
- **测试基线**：Mac vitest **1360**、`tsc -b` 干净、i18n 干净；`cargo test --lib` 开工时重跑写回执（P16 加了测试，HANDOFF §1 写的 316 是 `adee9a9` 的）。Windows（虚拟机）`SPOOL_TEST_CC6_MANIFEST=1 cargo test --no-fail-fast` 302 过 · 0 红 · 17 跳过（`333c803`，之后 Rust 没改）。
- **本机**：Mac 装着本机构建 `661b829`（11-10 23:55，Developer ID，没公证）；虚拟机里也是 `661b829`。Mac 的 Spool 开着「暂停捕捉手势」。
- **线上**：Mac 下载 = v0.7.4（公证 Accepted）；Windows 下载按钮指 **v0.6.1**；MCP Registry `io.github.KIM-ocean-HZ/spool` 0.7.4 是 isLatest。
- **公证**：10-18 起遇过 403（苹果协议），v0.7.4（10-26）已经通过；升过 macOS 后要 `sudo xcodebuild -license accept`（记忆 `notarization-403-agreement`）。

## 3. 步骤（按顺序；每一步做完再下一步）

### P17-0 · 开工核对 + 问 §4

- 跑基线（Mac：`npx tsc -b`、`npx vitest run`、`cargo test --lib`、sidecar 测试、`node scripts/i18n-check.mjs`），数字写回执；`git fetch`（HTTPS + gh token）后再数一次没推的提交、碰 `site/` 的提交、会公开的 `docs/` 文件。
- `git status`：研究线没提交的改动照旧不碰、⛔ 不用 `git stash`。
- §4 一次问完（每件写好处 / 代价，大白话；Ocean 可以一句「按推荐」）。**第 1 题没答不改版本号；第 2 题没答不推、不建 Release；第 3 题没答不打 Windows 包。**

### P17-1 · 版本号和对外说法（一笔提交）

- 三处版本号（`package.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml`）→ §4 第 1 题的答案，`Cargo.lock` 跟着；`cargo check` 过。
- 隐私说明三份的版本和日期 → 这一版、发版那天；改完 `node scripts/build-site-zh.mjs` + `npx vitest run scripts/build-site-zh.test.mjs`。
- 官网 + README 的 Windows 按钮改回 `latest`（附录 A `DISCOVERED-20261018-4`，`scripts/site-zh-strings.mjs` 三个键一起改）。
- README 状态那一段写这一版（Mac + Windows）；工具数**从发版二进制重数**（`--mcp` 普通一次、`--engine-run` 一次，两个数都写清是哪个；附录 A `DISCOVERED-20261029-2`，要 §4 第 4 题点头）。只改事实，不加营销话（方针 §4.3）。
- 首启教程过期那几句（附录 A `DISCOVERED-20261029-1`）：§4 第 4 题点了头才改；改的是 `src/lib/db/client.ts` 的 `TUTORIAL` 中英两份，注意切语言时逐字匹配那套逻辑和它的测试；只影响以后的新安装。

### P17-2 · 升级和首启验证（只在副本上）

- **Mac 老用户（v0.7.4 → 新版）**：真库数据目录里的 `spool.pre-migration-v37-2026-11-06T17-32-17-931Z.db` 就是一份 v37 的真库，复制到 scratchpad，照记忆 `spool-db-wipe-incident`「副本跑真迁移」走 v37 → v39：断言 `fresh === false`、每张老表条数和正文总长不变、新列为空。⛔ 不起 debug 版 GUI（同一个 identifier，会迁真库）。
- **Windows 老用户（v0.6.1 → 新版）**：虚拟机 `%APPDATA%\com.oceanjin.spool\spool.pre-migration-v23-2026-11-06T23-44-31-106Z.db`（v23）拷出来，同样的副本迁移一次走到 v39（P13 走过 v23 → v38、P16 走过 v38 → v39，这次一次走完）。
- **新用户**：空库走到 v39（`fresh === true`、教程种子写进去）。真正的首启建库、双击 ⌥ 授权是 §6 第 4 条，只有 Ocean 做得了。
- **MCP**：发版二进制 `--mcp` 连真库最新副本（`VACUUM INTO`，⛔ 别连真库目录，记忆 §44），普通 / `--engine-run` 各一次，数工具（给 README 用）。

### P17-3 · 发版说明 `docs/RELEASE_NOTES_v<版本>.md`（一笔提交）

- 只写英文（旧第 160 条）。写法照 v0.7.4：开头一段说这一版是什么，然后下载（Mac / Windows 各一行）、升级（Mac v37 → v39、Windows v23 → v39，升级前自动留快照）、新东西、**改了什么说法**、已知边界。
- 新东西从 §1 第 5 条那六份任务书里摘，按用户看得见的分组写，每条一两句。Windows 是第一次拿到 0.7 之后的全部东西（API 引擎、过期检测、跟进、对照仓库……），单独一段说清楚 Windows 上**没有**本机 CLI 引擎（`DISCOVERED-20261014-3`）。
- **必写**（HANDOFF §3 第 3 条，原文在附录 A）：
  - 在 Parallels 里用 Mac 键盘长按 Ctrl 写笔记，要打开「为游戏优化修饰键」（`DISCOVERED-20261107-2`）；
  - Parallels 共享文件夹（虚拟机默认的桌面 / 文档 / 下载）和网络盘上的文件，挪走后要手动「重新选位置」（`DISCOVERED-20261109-3`）。
- **§4 第 4 题点了头才写**：学校 / 公司管理的 Windows 电脑上安全软件可能不让 Spool 运行、要管理员放行（`DISCOVERED-20261020-6`）；跟进卡上「要你定」的几条退出 Spool 后就不再显示（`DISCOVERED-20261110-10` 的甲，原文在 HANDOFF 附录 I）。
- ⛔ 不写台账查不到的数字；不写 95/5；不引 MemTrapBench 的百分数；不写「feature-complete」；不写「这一次大概花多少钱」。
- **写好先给 Ocean 看**，他点头才进 Release。

### P17-4 · Mac 构建 + 公证（不提交）

- 照 `RELEASE.md` §2（先清 `/Volumes` 和 `rw.*.dmg`），加 `CARGO_PROFILE_RELEASE_BUILD_OVERRIDE_STRIP=none`（macOS 27，记忆 §56）；记忆 `release-v062-shipped` 三个坑（`$DMG` 用绝对路径、TSA 偶发失败整个重跑、`.app` 没签成不能用）。
- 凭据（`APPLE_ID` / `APPLE_PASSWORD` App 专用密码 / `APPLE_TEAM_ID`）到这一步请 Ocean 当场给，只当环境变量传给这一条构建命令。
- 构建日志进文件，别接管道；**公证 submission id 当场记下**（`.app` 在 `notarytool history` 里叫 `Spool.zip`）；dmg 补公证 + staple。
- 验：两个产物 `spctl -a -vv -t install` 都是 `accepted` + `source=Notarized Developer ID`；`codesign -dvv` 第一行 Authority 是 Developer ID；`--verify --deep --strict` 过；`stapler validate` 过；dmg sha256 记下。

### P17-5 · Windows 包 + 照单补验（不提交，除非改了 `WINDOWS-CHECK.md`）

- 按 §4 第 3 题的答案打包。Parallels 做法照 P16-6（`~/Desktop/Spool/P16-vm-20261110/scripts/r4-build.cmd` 那一套，记忆 `parallels-windows-vm-verify`）：先拍快照、从 Mac 仓库 `git pull`（不推送）、全套测试、`npx tauri build --bundles nsis --target x86_64-pc-windows-msvc`，仓库不留改动。安装包 sha256 记下。
- 静默装在主虚拟机上（停 GUI 两个进程、`--mcp` 不碰），库前后逐列一致。
- `docs/WINDOWS-CHECK.md` 第三、四轮从没照单装机验过：拿它逐条对 P13 任务书 §6 的 75 条（`docs/archive/product-taskbooks/TASKBOOK-P13-RELEASE-TWO-WINDOWS-VERIFY-2026-10-28.md`）和 P16-6 回执，列出没被覆盖的，在虚拟机里补验；界面上的照 P16-6 用 WebView2 调试口驱动（验完重启成普通启动、核调试口关了）。补验结果写回执；`WINDOWS-CHECK.md` 要改的话单独一笔提交。
- ⛔ 不签名（红线）。

### P17-6 · 推送 + Release（全部先问，§4 第 2 题答了才做）

- 推之前扫一遍这次要推的新增行里有没有第三方的名字（旧第 207 条）。
- 推 `main`（记忆 `push-requires-gh-token`；推完 `git update-ref refs/remotes/origin/main HEAD`）。`site/` 改了会顺带重新部署官网：部署跑完看 spoolapp.org 首页、隐私页、中文页是新的。
- 本地 `git tag -a v<版本>` 打在发版那个提交上、推 tag，再 `gh release create v<版本> --verify-tag`（`--target <短 sha>` 会被拒）。
- 四个资产：`Spool_<版本>_aarch64.dmg` + 同一个文件的 `Spool-macOS-arm64.dmg`；`Spool_<版本>_x64-setup.exe` + 同一个文件的 `Spool-windows-x64-setup.exe`。两个固定名 URL `curl -sIL` 都要 200；从 Release 下载回来 sha256 一样、dmg 的 staple 还在。

### P17-7 · MCP Registry

- `server.json` 版本改成新版本（一笔提交，可以和 P17-1 合并）。`mcp-publisher publish` 上次被执行权限拦了：写好整条命令（`mcp-publisher login github --token "$(gh auth token)" && mcp-publisher publish`），请 Ocean 用 `! …` 跑；跑完查线上新版本是 isLatest。

### P17-8 · 本机换成正式版

- 换装要 Ocean 明说（旧第 261 条）。照 P16-5 的换装做法：停之前看 `drafts.json`（并问一声有没有没点「完成」的编辑）、`VACUUM INTO` 备份 + 7 个 json、`lsappinfo` 找 GUI、按 pid 停 GUI 和 `--overlay`、`--mcp` 一个不碰、旧包进 `~/Desktop/Spool/spool-pre-install/`、`open --stdout/--stderr` 留日志、装后核 sha / 进程启动时间 / 库的数字。
- 这次装的是从 Release **下载回来的 dmg 里的** `.app`（`ditto` 出来 `chmod -R go+rX`）。装后 `spctl` 应该是 `Notarized Developer ID`。
- 「暂停捕捉手势」按 §4 第 5 题的答案处理。

### P17-9 · 台账和收尾（一笔提交）

- `docs/CASE_STUDY_LEDGER.md` §1.2 照 v0.7.4 那一行加这一版：日期、tag → 提交、签名身份、submission id、四个文件名 / 大小 / sha256、Gatekeeper 结论、Windows 不签名、两个固定名 200、库 v37 → v39（Windows v23 → v39）。⚠️ 那一行不写它自己所在提交的 sha。
- `docs/RELEASE.md` §0.0：只加一句「最新发布是 v<版本>（日期），回执看台账 §1.2」。
- 任务书回执；首屏改 `COMPLETE — 待 Ocean 验收`，移进 `docs/archive/product-taskbooks/`（`git mv`）；`docs/README.md` 入口那一行（只提交自己那一行，研究线的改动不碰）。
- HANDOFF：§1、§2 改成发版二之后的状态；唯一下一步按 §5.1 的顺序（图文教程 → 重构问卷 → 内测海报 + 奖励 → 内测）**问 Ocean**；附录 A 里做完的条目在 HANDOFF 那一行改成「已完成」。

## 4. 开工先问 Ocean 的（一次问完，答完再动手）

1. **版本号**
   - 甲（推荐）**0.8.0**。好处：v0.7.4 之后 114 笔、库 v37 → v39、Windows 第一次拿到 0.7 之后的全部功能，用一个新的中间号让人一眼看出这是一次大更新。代价：没有。
   - 乙 **0.7.5**。好处：延续 0.7.x。代价：看不出这一版比 0.7.1 – 0.7.4 那几个小版大得多。
2. **推送和发布**（仓库是公开的，推上去收不回）。这次要推 52 笔以上，其中 `HANDOFF-2026-11-09.md` 等文档里有你真库里的项目名、校名、截止日期（之前推过的旧 HANDOFF 里也有同类内容）。
   - 甲（推荐）照推，发版照原计划。代价：这些内容公开在 GitHub 上（和以前一样）。
   - 乙 推之前把这次新增文件里的真名换成代称。好处：最新版里看不到。代价：没推过的这 52 笔历史里还在，推了一样公开；要真不公开得改写这 52 笔的历史，回执里引用的提交号全部失效。
   - 丙 这一窗只打包不推，想清楚再说。代价：发版往后推。
3. **Windows 包在哪打**
   - 甲（推荐）**Parallels 虚拟机**，11-20 前。好处：环境、脚本、快照都现成，P16-6 刚用过。代价：ARM 上转译出来的 x64 包，不等于在真 x64 电脑上打。
   - 乙 **GitHub Actions 的 `windows-build`**（真 x64）。好处：干净环境、真 x64。代价：要先推一个分支或手动触发（推了就公开）；CI 要先编 sidecar（记忆 `windows-ci-verify-from-mac`）。
   - 丙 你自己那台 Windows。代价：那台是学校管理的，HitmanPro 不让 Spool 运行（`DISCOVERED-20261020-6`），装不了也验不了。
4. **要你点头的小改**（可以多选，不选的照旧不改）
   - a. 发版说明加一句：学校 / 公司管理的 Windows 上安全软件可能不让 Spool 运行、要管理员放行（附录 A `DISCOVERED-20261020-6`）。
   - b. 发版说明加一句：跟进卡上「要你定」的几条，退出 Spool 后就不再显示，下次跟进会再提（`DISCOVERED-20261110-10` 的甲）。
   - c. README 工具数从发版二进制重数、两处统一（附录 A `DISCOVERED-20261029-2`）。
   - d. 首启教程里过期的几句（新用户第一屏写着「它自己不带 AI——你的数据永远只在本机」，和隐私说明对不上；附录 A `DISCOVERED-20261029-1`）。代价：动产品里的教程文字，要过它的测试；只影响以后的新安装。
5. **开窗三件**（HANDOFF §3 第 1 条）
   - Mac 上的 Spool 关掉「暂停捕捉手势」吗？推荐**关掉**（正式用要能双击 ⌥ 捕捉；P13 为了不和虚拟机抢 Ctrl 才开的）。
   - 虚拟机键盘改回默认吗？推荐**先不改**（P17-5 还要用）。
   - 干净虚拟机「Spool-clean-P13」删吗？推荐**发版之后删**（P17-5 补验可能还要用它看缺运行库的情况）。
6. **`POLICY-PROPOSAL-20261010-1`**（稳定版之后转向推广，和营销闸门冲突；旧第 232 条定的「到发版二再说」，正文在 HANDOFF §8）：这一窗定，还是放到内测之后再定？这一题不挡发版。

## 5. 什么时候停下来问

- §4 第 1 – 3 题没答之前：不改版本号、不推、不建 Release、不打 Windows 包。
- 迁移验证（P17-2）任何一张表条数或正文长度对不上 —— 停，这是发布完整性。
- 公证不过（不是 TSA 偶发失败那种）—— 停，把 Apple 的日志拿给 Ocean 看。
- Windows 包装不上、起不来、库迁移有差 —— 停。
- 看得出 11-20 前 Windows 那一半做不完 —— 提前说，按 §4 第 3 题换路。
- 发版说明、README、官网文字：写好先给 Ocean 看。
- 任何要改产品代码的事（§4 第 4 题 d 除外）—— 停。

## 6. 给 Ocean 的验收单（发完给，大白话）

1. 打开 GitHub 的 Release 页：新版本在，四个下载文件都在，说明读着没问题。
2. 打开 spoolapp.org：Mac 和 Windows 两个下载按钮都下到新版本；中文页也一样；隐私说明写的是新版本和发版那天。
3. 你这台 Mac 上的 Spool 已经是正式版：打开不弹「无法验证开发者」，库里的东西都在。
4. **只有你做得了的**（HANDOFF §1 末尾、`RELEASE.md` §3）：
   - 找一台没装过 Spool 的 Mac（或者新建一个 macOS 用户），从官网下载、装、打开：首启建库、出现教程项目；双击 ⌥ 弹授权、授权重开后能捕捉；
   - 另一台 Mac 上，Spool 自己找到本机的 Codex / Claude Code、一键连上；
   - 一台 Windows 电脑从官网下载装一次（不能是学校管理的那台）。
5. 有问题直接说哪一步、看到了什么。

## 7. 回执（执行窗填写）

### 7.1 P17-0 开工核对（2026-11-11，对着 `bdcfd92`）

- 基线：`tsc -b` 干净 · vitest **1360**（147 个文件）· `cargo test --lib` **326 过 · 18 ignored** · sidecar **31** · i18n 干净。
- `git fetch`（HTTPS + gh token）：远端 `main` = `5f762da`；本地多 **53** 笔，没有一笔碰 `site/` 或 `README.md`；会公开的 `docs/` 文件 10 个，其中 `HANDOFF-2026-11-09.md`、`archive/HANDOFF-2026-09-04.md` 首行有 PURGE 标记。`v0.7.4..HEAD` = 115 笔。
- 工作树里研究线没提交的改动（Codex handoff、`docs/README.md`、`archive/HANDOFF-2026-09-04.md`、`archive/stage0a-taskbooks/` 等）没碰，没用 `git stash`；`docs/promo/`、`generated_images/` 不是这一窗的，没碰。
- 虚拟机两台都是 suspended。
- §4 的答复：HANDOFF 第 304 – 309 条（0.8.0 · 照推 · **Windows 云端打** · 小改 a / c / d · 三件按推荐 · 方针选甲但本窗不改方针文件）。

### 7.2 P17-1（`21a60b6`）和 P17-3（`33b8088`）

- 版本号六处（含 `package-lock.json` 根版本和 `server.json`），`cargo check` 过。
- 隐私说明三份：日期 2026-11-11 / v0.8.0；API 那一行加了「连着文件夹时跟进和过期检测还发现状文件文字、提交标题、改过的文件名单」—— 对着 `mcp.rs` 的 `follow_up_folder_state`（现状文件 + 提交标题）和 `repo_section`（再加 `changes`）核过。原文没写这件，属于「隐私说明里跟这一版对不上的说法」。
- 首启教程中英各四处 + `formerly`（切语言时认旧说法）；新测试 `still switches a tutorial seeded with the wording before v0.8.0`，拿掉 `formerly` 那一处当场红。之后 vitest **1361**、tsc、i18n 干净；`build-site-zh` 测试 14 过。
- 工具数从装着的 `661b829`（Rust 和 HEAD 一样）在真库 `VACUUM INTO` 副本上数：普通 `--mcp` **30**（只读 15、写 15）、`--mcp --engine-run` **22**（只读 15 + 写 7：`close_follow_up_item`、`propose_attach_file`、`propose_blocks`、`propose_replace_file`、`propose_supersede`、`request_file_access`、`suggest_follow_up_item`）。P17-4 出包后用发版二进制再数一次。
- README 另改三句对不上的：官网交互演示（11-05 已删）→ 两分钟视频；Windows 捕捉「记程序名」→ 记窗口标题（`capture.rs` `browser_caption`，浏览器去尾巴）。
- 发版说明里删掉了一条「修好的」：剪贴板文字和 HTML 同时读导致崩溃是 `cbd8c14` 带进来、`094aad1` 修的，用户从没拿到过；大块文字卡死留着（v0.7.4 的渲染就有，表格格子放大了它）。
- Ocean 11-11「都可以，开始」（第 310 条）。

### 7.3 P17-2 升级和首启验证（库副本，scratchpad vitest 跑真 `__migrateSchemaForTest`）

| 来源 | 结果 |
|---|---|
| Mac：真库数据目录 `spool.pre-migration-v37-2026-11-06T17-32-17-931Z.db`（sha256 `cdaec334…`） | v37 → v39，`fresh = false`，`integrity_check` ok，外键 0；18 张老表条数、每一个文字列的总长度都不变（1386 块、块正文 933,012 字、104 项目）；新表 `folder_proposals`（0 行）、新列 `blocks.edited_at`（全空） |
| Windows：P13 升级前的 v0.6.1 库 `~/Desktop/Spool/P13-vm-20261106/db/pre-upgrade-v23.db`（sha256 `31133f0a…`，11-06 23:44，和虚拟机里那份 `pre-migration-v23-…T23-44-31` 同一分钟） | v23 → v39 一次走完，`fresh = false`，ok，外键 0；10 张老表条数和文字长度都不变（19 块、5 项目）；新表 9 张、新列 19 个，全空；`edited_at` 全空 |
| 新用户：空库 | `fresh = true`，v39，教程两条项目 12 块 |

- 没起 debug 版 GUI；测试里的「升级前快照」写不出来（没有 Tauri 的 path API），这是测试环境的预期，app 里照写。
- 用 Mac 上的 v23 副本而不是从虚拟机里拷，是为了不为这一步唤醒虚拟机；两份是同一分钟的同一个库。
- `--mcp` 连真库最新副本、两种模式数工具：见 7.2，发版二进制出来后再核。

### 7.4 P17-4 Mac 构建 + 公证（2026-11-11，代码 `85d9499`，不提交）

- 构建前：`xcodebuild -version` 正常（许可已同意）；Developer ID 在钥匙串；`/Volumes` 干净、没有 `rw.*.dmg`；`notarytool history` 退出 0（账号协议没卡）。凭据 Ocean 当场在对话里给，只当环境变量传给构建和补公证两条命令，⛔ 没写进任何文件、提交、记忆。
- `APPLE_SIGNING_IDENTITY="Developer ID Application: Hanze JIN (Q5Y5JRXZ58)"` + `CARGO_PROFILE_RELEASE_BUILD_OVERRIDE_STRIP=none npm run tauri build`，日志进文件，`BUILD EXIT 0`；`spool-ai`、`spool`、`.app` 三处都是 Developer ID 签的，TSA 没出错。
- **`.app` 公证 submission `f1d3a4e9-ad75-4b21-ae24-122af3d88d77` · Accepted**（`notarytool history` 里叫 `Spool.zip`）。
- **dmg 补公证 submission `61211a65-5e75-4035-8974-9965db50a2e5` · Accepted**，`stapler staple` 成功。
- 验：两份 `spctl -a -vv -t install` 都是 `accepted` · `source=Notarized Developer ID` · `origin=Developer ID Application: Hanze JIN (Q5Y5JRXZ58)`；`codesign -dvv` 第一行 Authority = Developer ID，`flags=0x10000(runtime)`，Timestamp 2026-11-11 13:19:03；`--verify --deep --strict` 过；两份 `stapler validate` 过；`CFBundleShortVersionString` = 0.8.0；构建后 `/Volumes` 干净。
- 产物：`Spool_0.8.0_aarch64.dmg` **15,667,512 字节**（14.9 MB），sha256 **`7325074ad5410bc0b3d2569b6ad770c45e89f427595379c901af912d878033cf`**；`spool` `64028828…a741a1`、`spool-ai` `b2c6f586…afb198`。副本在 `~/Desktop/Spool/P17-release-20261111/`（dmg + `.app`）。
- 发版二进制 `--mcp`（真库 `VACUUM INTO` 副本，v39）：`serverInfo` = spool 0.8.0；普通 **30**（只读 15、写 15）、`--engine-run` **22**（15 + 7），每个工具都带 annotations —— 和 README 一致。对没升级的 v37 副本：`list_threads` 回「库还是旧版 v37……打开一次 Spool 再试」，`isError`，库仍是 v37（版本闸活着）。

### 7.5 P17-5 Windows 包 + 照单补验（2026-11-11）

**打包（第 306 条：GitHub Actions）**
- Ocean 批准后把本地 `main`（`85d9499`）推成远端分支 `release-0.8.0`（不是 main，官网没部署），`gh workflow run windows-build.yml --ref release-0.8.0` ⇒ run `43027680552`（`windows-latest`，真 x64），全绿：vitest **1361**（147 个文件）· `cargo test`（`SPOOL_TEST_CC6_MANIFEST=1`）**302 过 · 0 红 · 17 ignored** · sidecar 编译走 `crt-static`，`build-sidecar.sh` 对 `vcruntime140` / `msvcp140` 的检查过了 · `makensis` 出 `Spool_0.8.0_x64-setup.exe`。
- 产物（artifact `spool-windows-nsis`）：**10,200,942 字节**（9.7 MB），sha256 **`788067a1037cdcf8a57029ae939dd074b4e1fe680d7a0dbcc2dfcbb37cf842ac`**，在 `~/Desktop/Spool/P17-vm-20261111/build/`。⛔ 不签名（红线）。

**主虚拟机「Windows 11」装机**（快照「P17 before 0.8.0 install (2026-11-11)」先拍）
- `r4-install.ps1`（P16 那套，路径换成 P17）：只停 GUI 两个进程（`--mcp` 前后都是 0 个），装前 `VACUUM INTO` 一份，`/S` 静默装（退出码 0），装后再一份。装上的 `spool.exe` `2298f058…0780`、`spool-ai.exe` `c99d2c98…1b55`；「已安装的应用」和 exe 版本都是 **0.8.0**。
- 库：装前装后 `deep_compare.py same` ⇒ **RESULT SAME**（v39，逐行逐列，501 个 BLOB 按哈希），没有新的迁移快照。

**`WINDOWS-CHECK.md` 第三、四轮（第 49 – 75 条）逐条对过**（真界面走 WebView2 调试口，真键盘走 `prlctl send-key-event`；测完 Spool 重启成普通启动、9222 关了）

| 条 | 结论 | 怎么验的 |
|---|---|---|
| 49 – 51 第一次 ✕ 的说明卡 | 过 | 把 `closeToTrayHintSeen` 临时改回 false；发 `WM_CLOSE`（✕ 同一条消息）⇒ 窗口不藏、弹「Spool 没有退出 …… 拖到任务栏上 …… 要它回来：单击那个图标」；点「知道了」⇒ 窗口藏、进程在、设置记成 true；再启动一次 `spool.exe`（单实例把原窗口叫回来，同一个进程）⇒ 再 `WM_CLOSE` 直接藏、没卡；重启 Spool 再关 ⇒ 没卡 |
| 52 把托盘图标拖到任务栏 | 没测 | Windows 外壳的拖动，只有真手做得了；P13 第 4 条托盘那一组 Ocean 11-09 手验过 |
| 53 – 54 撤销卡自己走 | 过 | 真键盘：剪贴板放字 → 双击 Ctrl 弹卡（字对、项目对）→ 卡里打字回车 → Ctrl+Z ⇒「已撤销：捕获」，3.4 秒内收；连按 ⇒ 第二张「已撤销：写下的一条」、第三张「没有可撤销的操作」，都在 3.4 秒内收 |
| 55 – 57 录快捷键时全局键让路 | 过 | 用已绑的搜索键 Ctrl+Shift+F：进「按键中…」、Spool 抬到前台 → 真 Ctrl+Z ⇒ 被拒「Ctrl+Z 是所有软件通用的『撤销』……」，没弹撤销卡；真 Ctrl+Shift+F ⇒ 录进去、没弹搜索；再进录制按 Esc 退出 → 在记事本里按 Ctrl+Shift+F ⇒ Spool 的搜索出来了（键装回去了） |
| 58 – 60 默认 Ctrl+Alt+Space | 作废 | v0.5.0 起 Windows 和 Mac 一样默认不绑（`shortcut.ts` `DEFAULT_CAPTURE_ACCEL = null`），入口是双击 Ctrl；设置页写「备用 — 双击 Ctrl 之外的捕捉键」「未设置」 |
| 61 捕捉键那一行没有清除 ✕ | 照现在的设计 | 默认「未设置」，没有东西可清；原文的理由（它是唯一入口）已经不成立 |
| 62 – 63 没有引擎时的跟进面板 | 过（按现在的说法） | 没有 API key 时：「让 AI 看看还缺什么」锁着 +「怎么打开」+「要用你自己的 API key。」，下面那句「这台电脑上没有本机 AI 引擎……接了 MCP 的 AI 读得到它们」照旧；「联网搜索」同样锁着 |
| 64 手写 / 编辑 / 已解决 / 删除 / 撤销 | 过 | 加一条、直接改字（右栏跟着变）、「已解决」⇒ 进「收起不再跟进的」、「重新跟进」拿回；删除 ⇒ 提示里「撤销」拿回；测完删掉 |
| 65 – 66、68 MCP 页 | 过 | 两个开关 + 客户端列表 + 一行「▸ 详细说明：接好后在哪儿说、会改哪些文件」；Codex 底下只一句「ChatGPT 的普通对话连不上本机——用不了 Spool」；没有「当前是开发构建」（只在路径含 `target\debug|release` 时出） |
| 67 详细说明四小块 | 过 | 展开是「在哪儿说，说什么」「接入会动到哪些文件」「你的 AI 工具不在上面？」（带「复制配置」和 JSON）三块；VS Code 那一块只在检测到 VS Code 时出（`McpConfig.tsx:348`），这台没装 |
| 69、73 – 75 | 不适用 | 只在 Mac 上 |
| 70 – 72 撤销自己写的一块 | 过 | 写一条回车 → Ctrl+Z ⇒ 收回、浮窗「已撤销：写下的一条」、点「重做」⇒ 回来；删一块 → Ctrl+Z ⇒ 回来；框里有字时 Ctrl+Z 撤的是字、块不动 |

- 测法踩到的一个假象：用调试口在浮窗里「点」过「重做」之后，浮窗以为鼠标还停在卡上（卡片悬停时不收，好让人点「重做」），下一张撤销卡就不走；补一下「鼠标移出」就照常 3.5 秒内收。真鼠标会离开，不是产品问题。
- 测试库状态：`closeToTrayHintSeen` 回到 true（和测之前一样）；`apiEngineEnabled` 原来是 true 但 key 文件早在 P16-6 被脚本删了，这次改成 false（和「没有 key」对上）。设置原件备份在 `~/Desktop/Spool/P17-vm-20261111/db/settings.before-p17-checks.json`。写进 Unsorted / 私密测试的测试块和跟进行都撤掉或删掉了。

**干净虚拟机「Spool-clean-P13」**（没有 VC++ 运行库：System32 里没有 `vcruntime140.dll` / `msvcp140.dll`，注册表没有 VC Runtimes）
- 安装包做成光盘挂上，`/S` 装（退出码 0，`spool.exe` 哈希和主虚拟机那份一样），第一次打开：主窗口 + 浮窗两个进程都起来了、建了新库、没有 `pre-migration-v0` 空快照；英文界面落在「Welcome to Spool」，左栏两条教程 + 示例项目。库文件里搜：新说法「unless you open a route yourself」「"Allow AI writes"」「pinned blocks, or the last 7 or 30 days」都在，旧说法「ships no AI of its own」「task template」「"Allow AI to write"」都是 0；说的是「double-tap Ctrl」，没有「Input Monitoring」。
- 时间显示成 11/9 22:16：这台是 11-09 晚上挂起的，唤醒后 Spool 先建了库、时钟后同步，不是 Spool 的问题。
- ⚠️ 读库那一步我写了一个叫 `Rd` 的 PowerShell 函数，`rd` 是 Remove-Item 的内置别名、比函数优先 ⇒ 实际执行成了删除 `spool.db` / `spool.db-wal`；文件被 Spool 占着，没删成，随后核过文件和进程都在。之后改名重读。这台是干净测试机里刚建的空库，不是任何人的数据；教训记进记忆。
- 验完挂起，光盘还挂着（第 308 条：发版之后删这台）。

### 7.6 P17-6 推送 + Release（2026-11-11，Ocean「五步都做」）

- 推之前扫了要推的新增行（12,103 行）：找「老师 / 教授 / 推荐人 / Prof / Dr / 邮箱」和英文「名 姓」两种样子，命中的只有「导师」「推荐人」这种身份词（测试数据和验收记录）、Edge 标题里的 `Profile 1`、软件名；没有真人的名字，没有邮箱（旧第 207 条）。
- ① 附注标签 `v0.8.0` → `85d9499`（两个包都是从它打的），推上去。② `gh release create v0.8.0 --verify-tag --latest`，标题「Spool 0.8.0 (macOS + Windows)」，说明 = `docs/RELEASE_NOTES_v0.8.0.md`，四个资产：`Spool_0.8.0_aarch64.dmg` + `Spool-macOS-arm64.dmg`（同一文件）、`Spool_0.8.0_x64-setup.exe` + `Spool-windows-x64-setup.exe`（同一文件）；Release 列表里是 Latest。③ 两个固定名 `releases/latest/download/…` 都是 **200**，分别落到 `download/v0.8.0/…`；四个文件下回来 sha256 和本地一样；下回来的 dmg `stapler validate` 过、`spctl` 仍是 `Notarized Developer ID`。④ `main` 推 `5f762da..084bedc`（58 笔，快进），`git update-ref refs/remotes/origin/main HEAD`；Pages 部署 run `43032650446` 成功；线上 spoolapp.org 中英首页各 3 个 Windows 按钮都指 `latest`、页面上没有 v0.6.1，中英隐私页是 v0.8.0 / 2026-11-11、API 那一行新加的那句都在。⑤ 远端临时分支 `release-0.8.0` 删了。
- 这一窗推送用的都是 HTTPS + gh token（记忆 `push-requires-gh-token`）。

### 7.7 P17-7 MCP Registry

- `server.json` 已是 0.8.0（`21a60b6`，随 main 推上去了）；`mcp-publisher` 1.8.1 在本机。`publish` 会被执行权限拦（Create Public Surface），这一步写好命令请 Ocean 跑：在仓库根目录 `mcp-publisher login github --token "$(gh auth token)" && mcp-publisher publish`。跑完我查线上 0.8.0 是不是 isLatest，结果补在这里和台账那一行。

### 7.8 P17-8 本机换成正式版（2026-11-11 13:51，Ocean「现在换，没有没点完成的」）

- 换之前：`drafts.json` 两项都空；GUI 是 26604（主）/ 26686（`--overlay`），11-10 23:55 起的；`--mcp` 19 个。
- 备份 `~/Desktop/Spool/db/*before-p17-install-20261111-135149*`：库（`VACUUM INTO`，`integrity_check` ok，v39）+ 7 个 json。换装前库：v39 · 1461 块 · 正文 948,941 字 · 109 项目 · 65 跟进行 · 41 工作区 · 89 文件。
- 装的是从 Release 下回来的 dmg 里的 `.app`（`ditto` 出来 `chmod -R go+rX`；`spool` `64028828…`、`spool-ai` `b2c6f586…`，和发版构建一样；`Notarized Developer ID`、`--deep --strict` 过）。按 pid `kill -TERM` 两个 GUI 进程，一轮就退；`--mcp` 前后都是 19 个。旧包挪到 `~/Desktop/Spool/spool-pre-install/Spool-0.7.4-661b829-before-p17-20261111-135149.app`。
- 「暂停捕捉手势」按第 308 条关掉：GUI 停着时把 `settings.json` 的 `captureDisabled` 从 true 改成 false。
- `open -a /Applications/Spool.app --stdout/--stderr` ⇒ 新进程 34527 / 34544，13:52:22 起（换装之后）；日志两行：`[overlay] helper started`、`[double-tap] installed at HID/active`（授权没掉）；库还是 v39，七个数和换装前一样，没有新的迁移快照。
- 开着的 AI 客户端跑的还是旧二进制，完全退出重开一次就换上（库结构没变，不重开也能用）。

### 7.9 收尾

- 台账 `CASE_STUDY_LEDGER.md` §1.2 加 v0.8.0 那一段（不写它自己所在提交的 sha）；`RELEASE.md` §0.0 那句改成「最新发布是 v0.8.0（2026-11-11，Mac + Windows）」。
- 本任务书移进 `archive/product-taskbooks/`；`docs/README.md` 只提交产品那两行（研究线没提交的改动照旧不碰）。
- HANDOFF：§1、§2 改成发版之后；新发现记成 `DISCOVERED-20261111-1` – `-3`；唯一下一步按 §5.1 的顺序问 Ocean。
- 测试数字：Mac 开工基线 vitest 1360 → 改完 1361、`cargo test --lib` 326、sidecar 31、tsc / i18n 干净；CI（Windows x64）vitest 1361、`cargo test` 302 / 0 / 17。

---

## 附录 A · 搬进来的条目原文（从 HANDOFF 附录 I 搬走，HANDOFF 那里只留一行「已下发到 P17」）

#### DISCOVERED-20261018-4 · 发版二要把 Windows 下载按钮改回 `latest`

- 路线：P · 类型：当前验收必要（发版二）· 严重度：P2 · 状态：captured
- 来源：P9R-1；§9.2 第 161 条
- 证据：官网 `site/index.html` 三个 `dl-btn-win`（中文页由 `build-site-zh` 生成）+ README 顶上那一个，`f92b937` 起指向 `releases/download/v0.6.1/Spool-windows-x64-setup.exe`，按钮字和两行小字写着 v0.6.1；`scripts/site-zh-strings.mjs` 的 `dl-btn-win` / `mid-cta-fine` / `cta-fine` 同样。
- 影响：发版二出了新的 Windows 包之后，不改回去的话 Windows 用户会一直下到 v0.6.1。
- 建议：发版二那一窗：上传 `Spool-windows-x64-setup.exe` 固定名资产，再把这几处改回 `latest/download/…`、去掉「(v0.6.1)」和小字那半句；发完 `curl -L` 两个固定名都要 200。
- 验收标准：官网中英、README 的 Windows 按钮都落到最新 Release 的 Windows 包。

#### DISCOVERED-20261020-6 · 受管理的 Windows 电脑（学校 / 公司）上，安全软件不让装好的 Spool 运行

- 路线：P · 类型：发版二的前置 / 已知限制 · 严重度：P2 · 状态：captured
- 来源：P9W W-2（回执 §7.3）
- 证据：Ocean 这台 Windows（学校管理）装着 HitmanPro.Alert，「应用程序」日志 911 号事件：`Mitigation Lockdown · Policy LockdownNewFile · DenyNewFileExecute`，对象是安装程序刚放出来的 `%LOCALAPPDATA%\Spool\spool.exe`（v0.6.1）；两次启动都一启动就被杀，没有输出、没建库。v0.7.0 的包是同一种装法（currentUser、不签名）。
- 影响：① P9W 的界面那一半（真安装器升级、§6 的 43 条）在这台电脑上做不了；② 真实用户里学生 / 公司电脑不少，这类电脑上 Spool 可能直接打不开，Spool 自己连提示都给不了。
- 建议：① 验收换一台不受管理的 Windows 电脑，或请 IT 放行；② 发版二的安装说明 / 已知限制写一句「学校、公司管理的电脑上可能被安全软件拦下，需要管理员放行」。签名能不能让这类规则放行没验过（`DenyNewFileExecute` 多半不看签名），别先这么写。
- 验收标准：① 有一台 Windows 照 P9W §6 走完；② 发版二的说明里有这一句。

#### DISCOVERED-20261029-1 · 首启新手教程里有几句和现在的产品对不上

- 路线：P · 类型：文案 / 界面细节 · 严重度：P3 · 状态：captured
- 来源：视频设计窗（2026-10-29）写教程第 1 章时核对首启播种内容
- 证据：`src/lib/db/client.ts` 的 `TUTORIAL`（中英两份，首启时写进库）：「Welcome to Spool」第 1 块「Spool ships no AI of its own — your data never leaves this machine.」/「它自己不带 AI——你的数据永远只在本机。」——v0.6.2 起有 API 引擎、v0.4.0 起有本机 CLI 引擎，接上 MCP / CLI / API 时内容会离开本机（README 设计原则第 2 条的说法是「只有你打开的路才会递出去」）；第 5 块「Pick a range (pinned only / last 7 days) and a task template.」/「可选范围（仅置顶/近 7 天）与任务模板」——任务模板 v0.4.0 已去掉；「Put your AI to work on Spool」第 1 块同样写着「Spool ships no AI of its own; your data stays on this machine.」，开关名写成「Allow AI to write」，界面上是「Allow AI writes (experimental)」
- 影响：新用户第一屏读到的就是过期说法。教程第 1 章因此只拍项目名、不推近正文。播种内容写进库以后就不跟着改（同文件注释），修了主要影响以后的新安装
- 建议：候选等待；要改就是改 `TUTORIAL` 两种语言的这几句，并照顾切语言时逐字匹配那套逻辑；要 Ocean 点头

#### DISCOVERED-20261029-2 · README 的「AI via MCP」一节读写工具数和同一份 README 对不上

- 路线：P · 类型：文档 · 严重度：P3 · 状态：captured
- 来源：同一窗，核对教程第 5 章的说法时
- 证据：`README.md` 的 Stack 一节写「28 tools, 15 read … plus 13 … write tools」（和 PORTFOLIO_FACTS §3.6 实数一致），「AI via MCP」一节却写「Read tools (14)」「Write tools (12, …)」
- 影响：对外 README 自相矛盾。视频里不报工具数，不挡视频
- 建议：候选等待；发版二那一窗本来就要改 README（Windows 下载按钮、版本号），可以一起核对；要 Ocean 点头

#### DISCOVERED-20261107-2 · 在 Parallels 里用 Mac 键盘长按 control，Windows 收不到「按住」

- 路线：P · 类型：环境限制 / 发版说明候选 · 严重度：P2
- 来源：Ocean 11-07「真手长按约 1 秒完全不弹」；11-09 诊断记录（`SPOOL_GESTURE_TRACE=1`）。
- 证据：虚拟机默认 `Keyboard optimization mode: auto` 时，真手按住 1 秒的 control 在 Raw Input 里按下和松开同一毫秒到（`fix-20261109/logs/b0-hand-trace.err.log`）；改成「为游戏优化」（`prlctl set "Windows 11" --keyboard-optimize on`）后按住时长正常、长按弹卡。prlctl 从虚拟键盘注入，不经过这一层，所以 11-06 夜能弹。
- 影响：Mac 上用 Parallels 跑 Spool Windows 版的人，长按 Ctrl 写笔记用不了（双击 Ctrl 不受影响）；物理 PC 键盘不受影响（没测）。
- 建议：发版二的发版说明 / 帮助写一句「在 Parallels 里要打开『为游戏优化修饰键』」；Spool 不改。· 状态：captured

#### DISCOVERED-20261109-3 · Windows 上 Parallels 共享文件夹 / 网络盘上的文件挪走后跟不上，只能手动重新选位置

- 路线：P · 类型：环境限制 / 发版说明候选 · 严重度：P3
- 来源：Ocean 11-09 晚 P13 手指验收第 18 条「桌面的文件移动到一个文件夹，spool无法自动找回文件，只能手动定位」。
- 证据：虚拟机的桌面是 `C:\Mac\Home\Desktop`，也就是 Parallels 共享过来的 Mac 桌面，真路径 `\\psf\Home\Desktop`。`GetFileInformationByHandleEx(FileIdInfo)` 在那里回错误 87 ⇒ `file_identity::record` 返回 None，那条记录的 `target_identity` 是空的，挪走后只能是 `unknown`（「不知道挪到哪了」）。本地盘 `spool-p13` 里 16 个文件都拿得到身份；同一套步骤在本地盘上跟到了新位置，Ocean 看到「已跟到新位置」。另外，回环 SMB 共享 `\\localhost\C$\…` 拿得到身份，但 `resolve` 只问 A–Z 盘符的卷 ⇒ 网络盘上的文件就算记了身份，挪走也跟不上（读码，没实测）。
- 影响：在 Parallels 里跑 Windows 版的 Mac 用户（默认共享桌面 / 文档 / 下载），以及公司网络盘上的文件。真 Windows 电脑的本地盘不受影响；OneDrive 里的桌面没测。
- 处理：Ocean 11-09 选「记为已知限制，不改代码」。候选改法（没做）：Windows 上给没有身份的文件加「找一找」，在原文件夹和下面几层里找同名文件，让用户点「是这个」。· 建议：发版二的发版说明写一句。· 状态：captured（已知限制）
