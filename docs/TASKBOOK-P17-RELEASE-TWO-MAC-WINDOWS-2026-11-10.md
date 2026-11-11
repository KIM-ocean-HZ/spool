# 产品任务书 P17 —— 发版二：Mac + Windows

> **状态：ACTIVE（2026-11-10 夜下发，下一窗执行）**
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
