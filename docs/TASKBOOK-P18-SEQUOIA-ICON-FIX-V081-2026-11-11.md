# 产品任务书 P18 —— v0.8.1：修 macOS 15 及更早系统上发灰的 App 图标

> **状态：ACTIVE（2026-11-11 下发，下一窗执行）**
>
> **唯一交付**：macOS 15（Sequoia）及更早系统上，程序坞 / 访达 / ⌘Tab 里的 Spool 图标显示成**设计的那一版**（和 ICNS、安装包窗口里一样的饱和深橙色），macOS 26 以上的玻璃图标外观不变；作为 **v0.8.1** 发出去（Mac 公证、Release、官网下载照常可用、MCP Registry、本机换装、台账）。
>
> **来历**：Ocean 11-11 在一台没装过 Spool 的 Mac（M4，macOS Sequoia 15.6）上验收 v0.8.0，原话「新版的 spool logo 有问题……spool 在程序坞的显示有问题，但是该用户的安装包 spool 图案没有问题，和设计的一致，寻找 bug」。查清原因后问「什么时候修」，Ocean 选「**下一窗先修，再做教程**」（HANDOFF 第 315 条）。
>
> **授权来源（只引用、不改）**：旧第 160 条（发版说明只写英文；公证凭据只在对话里当环境变量用，⛔ 不写进任何文件、提交、记忆）；旧第 261 条（推送、发版、改版本号、换装 Mac Spool，每一次都要 Ocean 明说）；2026-08-15 Windows 不签名；记忆 `tauri-build-actool-needs-stdin`（图标生成）、`release-v062-shipped`、`notarization-403-agreement`、`push-requires-gh-token`、`isolated-verify-workflow` §40 – §41、§56。
>
> **边界**
> - 只动图标的生成和打包（`scripts/generate-icon.mjs`、`src-tauri/icons/`、需要的话 `tauri.conf.json` 的 `bundle.icon` / Info.plist 键），加上发版要改的版本号、发版说明、隐私说明日期、`server.json`、台账。**不加功能、不改产品行为。**
> - ⛔ macOS 26 以上的玻璃图标外观不改（那是 Ocean 10-30 / 10-31 选定的，记忆 `tauri-build-actool-needs-stdin`）。修法如果会动到它，停下来问。
> - ⛔ 不改 `docs/logo/Spool.icon` 这个设计源文件本身的外观；要改也先问。
> - 不碰实验线；不动 `docs/EXECUTION_POLICY.md`。
> - 做完这一份，下一件是 **P19 图文教程**（HANDOFF §5.1，Ocean 11-11 的要求在那里），由执行窗写任务书再做。

---

## 1. 开工前读

1. `docs/EXECUTION_POLICY.md`（不改）。
2. `docs/HANDOFF-2026-11-09.md`：首屏、§1、§2、§4、附录 B。
3. 本任务书全文。
4. `scripts/generate-icon.mjs`（图标怎么生成：`ictool` 导出 Default / Dark → 缩进安全边距做 ICNS / PNG；`actool` 把 `docs/logo/Spool.icon` 编成 `src-tauri/icons/Assets.car`，`--minimum-deployment-target 26.0`）；`docs/logo/README.md`；`src-tauri/tauri.conf.json` 的 `bundle.icon`。
5. 上一次发版的做法：`docs/archive/product-taskbooks/TASKBOOK-P17-RELEASE-TWO-MAC-WINDOWS-2026-11-10.md` §3、§7（P17-4 Mac 构建公证、P17-5 Windows 云端打包、P17-6 Release、P17-8 换装都照它）；`docs/RELEASE.md` §2、§2.0.1；`docs/RELEASE_NOTES_v0.8.0.md`。

## 2. 现在（2026-11-11 对着 `8070004` 查的）

**症状**：Sequoia 15.6 程序坞上的图标比设计的浅、发灰，上半截更亮，带一道斜着的玻璃反光，边上一圈浅色内框。截图在 `~/Desktop/截屏2026-11-11 16.22.08.png`（仓库根目录里也有一份没被 git 跟踪的拷贝，⛔ 别提交它）。

**原因（已查清）**
- 装好的 `Spool.app` 的 Info.plist 同时有 `CFBundleIconFile = icon.icns` 和 `CFBundleIconName = Spool`；`Contents/Resources/` 里有 `icon.icns` 和 `Assets.car`。
- macOS 看到 `CFBundleIconName` 而且 `Assets.car` 里有这个名字的图标时，优先用 `Assets.car`，不用 ICNS —— Sequoia 也是。
- `Assets.car` 是 `actool` 从 `Spool.icon` 编出来的。除了 26 以上用的玻璃图层，里面还有一套名叫 `Spool`、类型 `Icon Image` 的压平 PNG（32 – 1024 像素），那是 `actool` **自动**给旧系统生成的，渲染成了浅色、带反光的那一版。
- ICNS（`ictool --rendition Default --design-generation 27` 导出 → 转 sRGB → 加安全边距）才是设计的那一版；dmg 窗口、安装包显示的是它，所以那边看着对。
- 证据（scratchpad，这一窗结束会没，重做很快）：截图里的图标、ICNS、`Assets.car` 压平版三张放大并排 —— 截图和压平版几乎一样，和 ICNS 不一样；压平版对 ICNS 的平均逐像素差（RGBA）约 6 / 10 / 15 / 4。取压平版的办法：建一个只有 `Info.plist` + `Assets.car` 的假 `.app`，`Bundle(path:).image(forResource: "Spool")` 把每个 representation 写成 PNG（Swift，十几行）。
- **试过、不行的**：把 ICNS 那几张图做成同名的 `Spool.appiconset`，和 `Spool.icon` 一起交给 `actool`（`--minimum-deployment-target 11.0`）⇒ `actool` 直接忽略 appiconset，`Assets.car` 一个字节都不差（另外吐出一个没用的 `Spool.icns`）。`actool --help` 没有控制「给旧系统压平」的开关。

**影响**：所有 macOS 15 及更早系统的用户（内测要招的学生、老师多半在这一档）。Windows 用 `icon.ico`，不受影响。macOS 26 / 27 用玻璃图层，不受影响。

## 3. 步骤

### P18-0 · 开工核对 + 问 §4

- 跑基线（`npx tsc -b`、`npx vitest run`、`cargo test --lib`、sidecar 测试、`node scripts/i18n-check.mjs`），数字写回执。`git status`：研究线没提交的改动照旧不碰，⛔ 不用 `git stash`。
- §4 一次问完。

### P18-1 · 找到能用的修法（只在 scratchpad 里试，不改仓库）

判定标准先写死再试：**(a)** 旧系统读到的那套图标和 ICNS 逐像素一致（或平均差 < 1）；**(b)** macOS 27 上 `Spool.app` 在程序坞 / 访达里的样子和现在一样（截图逐像素比，玻璃图层还在）；**(c)** 不靠私有接口改写 `.car`，除非 §4 第 3 题点了头。

按这个顺序试，哪个先过就用哪个：
1. **查 Apple 怎么说**：Icon Composer / Xcode 26 文档和开发者论坛里「给旧系统提供自己的图标」的官方做法（`WebSearch`，standard）。如果有官方做法（比如特定的命名、`actool` 参数、`.icon` 里的设置），照它做。
2. **让旧系统回到 ICNS**：编出一份**没有**那套 `Icon Image` 压平图的 `Assets.car`（只有玻璃图层），看旧系统是不是就回去读 `CFBundleIconFile` 的 ICNS。办法要自己找（`actool` 的参数组合、`.icon` 的平台设置……）。
3. **换名字分开**：两套图标用不同名字、看 macOS 26+ 和旧系统各自读哪一个键（`CFBundleIconName` / `CFBundleIconFile` / `CFBundleIcons`）。
4. 上面都不行：停下来，把试过的和结果写给 Ocean，问要不要用私有接口改 `.car`（§4 第 3 题）。

**怎么验「旧系统读到什么」**：最可靠的是在真的 macOS 15 上看（§4 第 1 题）。没有之前，用假 `.app` + `Bundle.image(forResource:)` 取图只能当参考 —— 那是 macOS 27 在读，不保证和 Sequoia 选的是同一份。

### P18-2 · 改图标生成（一笔提交）

- 把选定的修法写进 `scripts/generate-icon.mjs`（注释写清为什么：旧系统会优先读 `Assets.car` 里自动压平的那套），重新生成 `src-tauri/icons/` 下受影响的文件（`npm run icons:generate`；记忆 `tauri-build-actool-needs-stdin`：stdin 要真的、`ibtoold` 坏了 `pkill -x ibtoold`）。
- 只提交图标相关文件；`site/assets/` 里的官网图标如果跟着变，确认和现在一样再提交（官网图标没问题，不该变）。
- 本机构建一个 `.app`（Developer ID，记忆 §56 的 `CARGO_PROFILE_RELEASE_BUILD_OVERRIDE_STRIP=none`，只出 `.app`），验 P18-1 的 (a)(b)。

### P18-3 · 在 macOS 15 上验

- 按 §4 第 1 题的答案。看三处：程序坞、访达（应用程序文件夹里的图标）、⌘Tab。截图和 ICNS 并排比，结论写回执。
- macOS 27（这台）上同样看三处，和修之前的截图比。

### P18-4 · v0.8.1 发版

照 P17 的做法（任务书 §3 P17-1 – P17-9），只是规模小：
- 版本号 0.8.0 → 0.8.1（六处：`package.json`、`package-lock.json` 根版本两行、`tauri.conf.json`、`Cargo.toml`、`Cargo.lock`、`server.json`）；隐私说明三份的版本和日期（内容不变）。
- 发版说明 `docs/RELEASE_NOTES_v0.8.1.md`（只写英文，短）：修了什么一句话（macOS 15 and earlier showed a washed-out app icon in the Dock and Finder）；下载两行；升级：库结构不变（v39）。**写好先给 Ocean 看。**
- Mac：构建 + 公证（凭据到这一步请 Ocean 当场给，只当环境变量）+ dmg 补公证 + staple；两份 `spctl` 都是 `Notarized Developer ID`。
- Windows：按 §4 第 2 题。
- 推送、tag、Release（四个资产，两个固定名 200，下回来字节一样）、推 main（官网隐私页日期跟着变）—— 每一步照旧先问。
- MCP Registry：`server.json` 0.8.1，请 Ocean 跑命令（见 §5 的写法），跑完查线上 isLatest。
- 本机换装（问没点「完成」的编辑；按 pid 停 GUI；`--mcp` 不碰；装 Release 下回来的那份）。
- 台账 `CASE_STUDY_LEDGER.md` §1.2 加 v0.8.1 一段；`RELEASE.md` §0.0 改成最新 v0.8.1。

### P18-5 · 收尾，接着下发 P19

- 回执写在 §7；首屏改 `COMPLETE — 待 Ocean 验收`，`git mv` 进 `docs/archive/product-taskbooks/`；`docs/README.md` 只提交产品那两行（研究线的改动不碰；记忆 `isolated-verify-workflow` §54 的 `hash-object` / `update-index` 做法）。
- HANDOFF §1、§2 改成 v0.8.1 之后；唯一下一步 = **P19 图文教程**：照 HANDOFF §5.1 那一行的要求写任务书 `docs/TASKBOOK-P19-…`，问它的几件（一次问完），然后执行。

## 4. 开工先问 Ocean 的（一次问完）

1. **在哪台 macOS 15 上验**
   - 甲（推荐）**在这台 Mac 的 Parallels 里装一个 macOS 15 虚拟机**，我全程自己验。好处：不用麻烦你朋友，改几轮都能马上看。代价：要下载约 15 GB 的系统镜像；Parallels 试用 **11-20 到期**，要在那之前用完。
   - 乙 **你朋友那台 M4**：我把测试版做好，你或他装上看程序坞。好处：真机。代价：每改一轮都要麻烦一次人；测试版不是公证的，第一次打开要右键「打开」。
2. **v0.8.1 的 Windows 包**（Windows 图标本来就没问题）
   - 甲（推荐）**也用 GitHub Actions 打一个 0.8.1**。好处：两个平台版本号一样，官网 Windows 按钮下到的也是 0.8.1。代价：要推一个临时分支、触发一次（推之前问你），虚拟机里再装一次核对库。
   - 乙 **只发 Mac**，Release 里把 0.8.0 的 Windows 安装包以固定名再传一份。好处：省一轮。代价：Release 叫 0.8.1，Windows 下到的却是 0.8.0。
3. **如果正规办法都不行**：允许用 macOS 的私有接口直接改写 `Assets.car` 里给旧系统的那套图吗？好处：一定能把那套图换成设计的。代价：靠的是 Apple 没公开的接口，以后的 Xcode / macOS 可能就失效，每次重新生成图标都要多跑这一步。推荐：**先不允许**，真走到这一步再问。

## 5. 什么时候停下来问

- §4 第 1 – 2 题没答之前：不下载系统镜像、不推送。
- 修法会改到 macOS 26 以上的玻璃图标外观、或要改 `Spool.icon` 本身 —— 停。
- P18-1 四种都不行 —— 停（§4 第 3 题）。
- 公证不过（不是 TSA 偶发那种）—— 停，把 Apple 的日志拿给 Ocean 看。
- 发版说明写好 —— 先给 Ocean 看。
- 推送、tag、Release、换装 —— 每一次先问。
- MCP Registry：11-11 Ocean 说 0.8.0 发好了，但线上查到的最新仍是 0.7.4、本机 `~/.config/mcp-publisher/token.json` 还是 10-26 的（`mcp-publisher validate` 过）⇒ 这次请 Ocean **在对话里**用 `! cd ~/Desktop/Knote && mcp-publisher login github --token "$(gh auth token)" && mcp-publisher publish` 跑，好看到输出；跑完查 `https://registry.modelcontextprotocol.io/v0/servers/io.github.KIM-ocean-HZ%2Fspool/versions/latest`。

## 6. 给 Ocean 的验收单（发完给，大白话）

1. 在那台 Sequoia 的 Mac 上（或虚拟机截图里）：程序坞上的 Spool 图标是饱和的深橙色，和安装包窗口里的一样，没有发灰、没有斜着的反光线。
2. 你这台 Mac 上：程序坞上的 Spool 图标和以前一样（玻璃的那一版）。
3. GitHub 上最新的 Release 是 0.8.1，官网两个下载按钮都下到 0.8.1。
4. 有问题直接说哪一步、看到了什么。

## 7. 回执（执行窗填写）
