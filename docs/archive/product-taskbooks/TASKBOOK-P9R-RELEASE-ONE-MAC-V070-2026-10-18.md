# 产品任务书 P9R —— 发版一：Mac 版 v0.7.0

> **状态：已完成，等 Ocean 验收**（2026-10-19 发布）—— v0.7.0 已签名公证、推送、打 tag、建 Release，官网和 MCP Registry 已更新，本机已换成正式版；回执 §7，验收单 §6。2026-10-18 下发，当晚卡在苹果协议 403、10-19 下午通了。
>
> ⚠️ **10-18 插队（HANDOFF §9.2 第 159 条）**：开工前修了两个捕捉 bug（`f74dfab`：浏览器多窗口的来源、截图后再按 ⌘C）。
> 等 Ocean 真机验过再开工；这一笔也进 v0.7.0（发版说明要写）。§2 的基线随之变了：vitest **113 个文件 / 1173 条**、cargo **222 过 · 5 跳过**。
>
> **唯一交付：** 把 v0.6.2 之后到 P9H（含织布）为止的全部改动，作为 **v0.7.0、只发 Mac**，签名 + 公证，
> 发到 GitHub Release，官网跟着上线；本机换成正式版；台账记一行。步骤见 §3，每一步一笔提交（发版本身没有提交的除外），
> 回执写在 §7。
>
> **来历：** HANDOFF §9.3「发版一」那一行。Ocean 10-18「验收通过，发布下一任务」（§9.2 第 158 条）—— P9H 验收通过，
> 照 §9.8 的顺序，下一件就是发版一。
>
> **授权来源（Ocean 拍板，这份任务书只引用、不改）：**
> - 第 70 条：本地没推的那些提交**等发版一一起推**（推 `main` 会顺带重新部署官网）。
> - 第 71、73 条：这一版**只发 Mac**；Windows 等 P11 之后和 Mac 一起发（发版二）。
> - 第 149 条：版本号 **v0.7.0**；隐私说明写「对应 Spool v0.7.0」，日期写改的那天 —— **发版那天不是 10-17 就改成发版那天**。
> - 第 155 条：隐私说明的措辞 Ocean 看过「ok」（之后加的 `knit.json` 那一句交付时说过）。
>
> **边界：**
> - **不加功能、不改产品行为。** 这一窗只动：版本号、发版说明、README / 官网里跟这一版对不上的说法、台账。
>   做的时候发现产品 bug：发布完整性相关的（打不开、迁移坏库、公证不过、隐私说明说错）停下来问；别的记 HANDOFF §9.9，不顺手修。
> - 不出 Windows 包；不碰 `windows-port` 分支。
> - 不碰实验线（`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行）；不动 `docs/EXECUTION_POLICY.md`。
> - 不加依赖（`cargo tree` 那条照旧必须是空的），CSP 不改，不改库结构（真库 v35，这一版不迁库以外的东西）。
> - **对外的动作每一样都先问**：推送、打 tag、建 Release、上传文件。它们推出去就收不回（仓库是公开的）。
> - ⛔ 不加 LICENSE、README 不写许可一节（记忆 `no-license-file`）；95/5 那个数字作废；MemTrapBench 的百分数不进讲 Spool 的句子。
> - 提交照 `CLAUDE.md` §5：不写任何 AI 署名，提交后跑自查 grep。

---

## 1. 开工前读

1. `docs/EXECUTION_POLICY.md`（只读）、`docs/HANDOFF-2026-09-04.md` 首屏 + §9.2（第 70 – 74、149、155 – 158 条）+ §9.3 + §9.8。
2. `docs/RELEASE.md` 全文 —— 发布步骤、固定名资产、`bundle_dmg.sh` 卷名、验收清单。
3. `docs/CASE_STUDY_LEDGER.md` §1.2 —— v0.6.2 那一行（格式照抄），和它下面那段「凭据」说明。
4. `docs/RELEASE_NOTES_v0.6.2.md` —— 上一版发版说明的写法（英文、先一句话说这一版是什么、下载、迁移、新东西、改了什么说法）。
5. 记忆：`release-v062-shipped`（打包三个坑）、`push-requires-gh-token`（推送和补 `origin/main`）、
   `isolated-verify-workflow`（§40 换装三连坑、§42 演示版、§44 探针连副本、§47 停 GUI 前问、§49 多拷 `knit.json`）、
   `spool-db-wipe-incident`（两条不碰真库的迁移验证法）、`distribution-route-notarized-dmg`、`demo-project-two-copies`、
   `mockups-vs-installing`、`next-stage-goals-website-portfolio`（截图多场景铁律、文案大白话）。
6. `docs/archive/product-taskbooks/` 里 P1 – P9H 的回执 —— 写发版说明的素材（**用户看得见的**改动，不写内部重构）。

## 2. 现在（2026-10-18 对着 `97fd530` 核过）

| 项 | 现在 |
|---|---|
| 版本号 | 三处都是 `0.6.2`：`package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`（还有 `Cargo.lock` 里 `spool` 那一项跟着变） |
| 库结构 | 真库 **v35**；`mcp.rs` `EXPECTED_SCHEMA_VERSION = 35`。v0.6.2 发出去的是 **v24** ⇒ 老用户升级要连走 **11 次迁移**（v24 → v35） |
| MCP | 新二进制普通连接 **26 个工具**、`--engine-run` **25 个**（P9H 换装时数的；发版前从发版二进制重数，记忆和方针都要求「对外数字从实际二进制重数」） |
| 远端 | 10-18 `fetch` 过：远端 `main` 停在 `e37950c`（08-27），本地多 **210 笔**；其中改到 `site/` 的 4 笔（`0dad7e7` 首页和隐私说明、`662a88f`、`8fe186b` 隐私说明 v0.7.0、`16ba9fb` 隐私说明 `knit.json`）⇒ 一推就重新部署官网 |
| ⚠️ 推上去会公开的 | 仓库是 **PUBLIC**。210 笔里 `docs/` 改了 **130 个文件**，含 HANDOFF、P1 – P9H 的任务书和回执、`PORTFOLIO_FACTS.md` —— 里面有 Ocean 真库里的项目名和内容（〈老师信息〉、推荐信、申请相关的项目名和截止日期；HANDOFF 首行就标着 `PURGE-BEFORE-APPLICATION`）。按「推荐信 / 老师信息 / 个人网站素材」三个词数：远端现在有 3 个文件提到，推完是 9 个 |
| 官网 | 首页「And then it compounds」那一节第二段（英文 `grow-p2`、中文 `site/zh/index.html` 第 341 行 / `scripts/site-zh-strings.mjs` `grow-p2`）还写着「侧栏的线轴每一百条绕满一个」—— **v0.7.0 里已经没有线轴了**（织布，第 154 – 157 条）；配图 `growth-day1` / `growth-week6` 也是旧左栏 |
| README | 还停在 v0.5.0 的说法：「**v0.5.0** — feature-complete…」、「19 tools, 12 read…」「Read tools (12)」—— 都过期了 |
| 隐私说明 | 三份（`docs/PRIVACY.md`、`site/privacy.html`、`scripts/site-zh-privacy.html` → `site/zh/privacy.html`）写着「最后更新：2026-10-17（对应 Spool v0.7.0）」 |
| 签名 | `tauri.conf.json` 里是 `Spool Dev`，发版靠环境变量 `APPLE_SIGNING_IDENTITY` 盖过去（覆盖失败是静默的，§3 要亲眼看 Authority） |
| 公证凭据 | Tauri 只认环境变量 `APPLE_ID` / `APPLE_PASSWORD`（App 专用密码）/ `APPLE_TEAM_ID`（或 App Store Connect 那三个），**读不了钥匙串档案**；`.dmg` 的补公证可以用 `notarytool --keychain-profile`。执行窗拿不到 Ocean 的 App 专用密码 ⇒ §4 第 ② 件 |
| 基线（`97fd530`） | `npx tsc -b` 干净 · vitest **112 个文件 / 1168 条** · cargo 218 过 · 5 跳过（P9H 收尾时数的，之后没改 Rust）· sidecar 14 · `i18n-check` `(none missing)` · `--dead` 87 · `cargo tree` 那条空 |
| 本机 | `/Applications/Spool.app` 是 P9H + 织布第二轮的 Developer ID 构建（sha256 `33811bfd…`，没公证），`spctl` = `Unnotarized Developer ID` |

## 3. 步骤（按顺序；每一步做完再下一步）

### P9R-0 · 开工核对 + 问 §4 的四件

- 跑基线，数字写回执；`git fetch`（HTTPS + gh token，见记忆）后再数一次没推的提交、改到 `site/` 的提交、会公开的 `docs/` 文件。
- 把 §4 四件一次问完（每件写好处 / 代价，大白话）。**④ 没答之前不碰官网；① 没答之前不推。**

### P9R-1 · 版本号和对外说法（一笔提交）

- 三处版本号 → `0.7.0`，`Cargo.lock` 跟着；`cargo check` 过。
- 隐私说明三份的日期 → 发版那天（第 149 条），改完跑 `node scripts/build-site-zh.mjs`、`npx vitest run scripts/build-site-zh.test.mjs`。
- README：状态那一段改成 v0.7.0（只发 Mac；Windows 下一版）、MCP 工具数从**发版二进制**重数（普通 / `--engine-run` 两个数都写清是哪个）、去掉过期的「v0.5.0 feature-complete」说法。只改事实，不加营销话（方针 §4.3）。
- 官网：照 §4 第 ④ 件的答案改（线轴那一段 + 两张图）。截图只许真截图（记忆 `mockups-vs-installing`），演示库照记忆 §42 建，两份种子照 `demo-project-two-copies` 同步改。

### P9R-2 · 升级和首启验证（不碰真库）

- **老用户升级**：拿真库数据目录里的 `spool.pre-migration-v24-2026-08-25T03-39-22-515Z.db`（v24，就是 v0.6.2 用户的库）复制到 scratchpad，照记忆 `spool-db-wipe-incident` 的「副本跑真迁移」法连走 v24 → v35：断言 `fresh === false`、每张老表条数和正文总长不变、新表空。⛔ 不起 debug 版 GUI（同一个 identifier，会迁真库）。
- **新用户首启**：⛔ **不在这台机器上起发版版的界面来测首启** —— 同一个 identifier（`com.oceanjin.spool`）打开的就是真库，`SPOOL_DATA_DIR` 只管 `--mcp`。执行窗只验空库：同一个「副本跑真迁移」法从空库走到 v35（`fresh === true`、教程种子写进去）；真正的首启建库、教程项目出现、双击 ⌥ 授权放进 §6 第 4 条，Ocean 在没装过 Spool 的机器 / 新 macOS 用户上做。
- **MCP**：发版二进制 `--mcp` 连真库最新副本（`VACUUM INTO`），普通 / `--engine-run` 各一次，数工具，看 `get_block_images` 回图片。

### P9R-3 · 发版说明 `docs/RELEASE_NOTES_v0.7.0.md`（一笔提交）

- 英文（照前几版；要不要中文版是 §4 第 ③ 件）。写法照 v0.6.2：开头一段说这一版是什么，然后下载、升级（v24 → v35，升级前自动留快照）、新东西、**改了什么说法**、已知边界。
- 必写的「改了什么」（用户会撞到的行为变化，不能只写新功能）：
  - 用户亲手加的文件默认 **AI 可读**（P5）；AI 的「更正 / 取代」现在只是建议，要你点（P7）；
  - 块里的图片**复制一份进数据库**，AI 能通过 `get_block_images` 拿到图片本身（P7、P9H-6）；
  - 新的本地文件：`focus.json`（每天专注多久）、`drafts.json`（没点「完成」的字）、`knit.json`（织成了什么）—— 都不进库、不随库导出、不出这台电脑；
  - 私密项目（P9E）：AI 读不到、但能往里写；只管通过 Spool 这一条路；
  - 专注时间 = 在电脑前的时间（10-17 改的）；左栏换成织布（线轴没了）；
  - 「Spool 本体不出网」照旧成立的那部分和不成立的那部分，说法和 v0.6.2 一致，别说过头。
- 新东西按用户看得见的分组：项目文件、图片、待审、私密项目、拆项目、周回顾「活动」、深浅色、撤销 / 重做、丢字修复、织布。每条一两句。
- ⛔ 不写台账查不到的数字；不写 95/5；不引 MemTrapBench 的百分数；不写「feature-complete」。
- **写好先给 Ocean 看**，他点头才进 Release。

### P9R-4 · 构建 + 公证（不提交）

- 照 `RELEASE.md` §2（先清 `/Volumes` 和 `rw.*.dmg`）+ 记忆 `release-v062-shipped` 三个坑（`$DMG` 用绝对路径；TSA 偶发失败重跑；凭据见 §4 ②）。
- 构建日志进文件，别接管道。**公证 submission id 当场记下**（`.app` 在 `notarytool history` 里叫 `Spool.zip`）。
- 验：两个产物 `spctl -a -vv -t install` 都是 `accepted` + `source=Notarized Developer ID`；`codesign -dvv` Authority 第一行是 Developer ID；`--verify --deep --strict` 过；`stapler validate` 过；dmg 的 sha256 记下。

### P9R-5 · 推送 + Release（全部先问，§4 ① 答了才做）

- 推 `main`（记忆 `push-requires-gh-token`；推完 `git update-ref refs/remotes/origin/main HEAD`）；官网 Pages 部署跑完后看 spoolapp.org 首页和隐私页是新的。
- 本地 `git tag -a v0.7.0` 打在发版那个提交上、推 tag，再 `gh release create v0.7.0 --verify-tag`（`RELEASE.md` 记过：`--target <短 sha>` 会被拒）。
- 上传两个资产：`Spool_0.7.0_aarch64.dmg` + 同一个文件改名的 `Spool-macOS-arm64.dmg`；`curl` 固定名 URL 必须 200；从 Release 下载回来 sha256 一样、staple 还在。

### P9R-6 · 本机换成正式版

- 照 P9G / P9H 的换装做法（VACUUM INTO 备份 + 五个 json 拷桌面、停之前看 `drafts.json`、按 pid 停 GUI 和 `--overlay`、`--mcp` 一个不碰、旧包进 `spool-pre-install/`、装后逐项核）。这次装的是从 Release **下载回来的那个 dmg 里的** `.app`（`ditto` 出来记得 `chmod -R go+rX`，记忆 `release-v062-shipped`）。装后 `spctl` 应该是 `Notarized Developer ID`。

### P9R-7 · 台账和收尾（一笔提交）

- `docs/CASE_STUDY_LEDGER.md` §1.2 照 v0.6.2 那一行加 v0.7.0：日期、tag → 提交、签名身份、两个 submission id、文件名 / 大小 / sha256、Gatekeeper 结论、Windows「这一版故意不出」、固定名 200、库 v24 → v35。⚠️ 那一行**不写它自己所在提交的 sha**（v0.6.2 那段写过为什么）。
- `docs/RELEASE.md` §0.0 那张过期快照表：只加一句「最新发布是 v0.7.0（日期），回执看台账 §1.2」，别重写整节。
- 任务书回执、HANDOFF §9.3 发版一那一行、§9.8 下一步（P10，正文在 §9.7）、`docs/README.md` 入口那一行（只暂存自己那一行）。

## 4. 开工先问 Ocean 的四件（答完再动手）

1. **推送会把哪些东西公开**（仓库是公开的，推上去收不回）。210 笔里除了代码和官网，还有 130 个 `docs/` 文件，里面有你真库里的项目名和内容（推荐信、申请相关的项目和截止日期等）。
   - 甲：照推。好处：发版按原计划走，一次推完。代价：这些名字和内容公开在 GitHub 上。
   - 乙：推之前在最新版里把真名换成代称，再推。好处：随手翻仓库看不到。代价：**历史里还在**，懂 git 的人翻得到；要多花一段时间逐个文件改。
   - 丙：先不发版，另开一窗想清楚（比如改写这 210 笔的历史把真名洗掉）。好处：真正不公开。代价：所有回执里引用的提交号全部失效，实验线绑定的提交号也会断；发版往后推。
2. **公证要用你的 App 专用密码**，执行窗拿不到。
   - 甲：你把它存进钥匙串（执行窗给你一行 `! security add-generic-password …`），构建那条命令现读、不打印。好处：你只输一次。代价：钥匙串里多一条。
   - 乙：到构建那一步，执行窗把整条命令写好，你自己用 `! …` 跑。好处：密码不经过执行窗。代价：那一步要你在场。
3. **发版说明**：只写英文（和前几版一样），还是中英两份？写好都先给你看。
4. **官网首页讲线轴那一段和两张图**（现在写着「每一百条绕满一个线轴」，这一版已经没有线轴了）：
   - 甲：这一版就改，文字改成织布，两张图用演示库重新真截。好处：官网和下载到的东西一致。代价：多半天（要建演示版、截图）。
   - 乙：先只改文字，图下一版再换。好处：快。代价：图里还是旧左栏，和文字对不上。
   - 丙：都不改，下一版一起改。代价：官网说的东西装上之后找不到。

## 5. 什么时候停下来问

- §4 四件没答之前：不推、不碰官网、不建 Release。
- 迁移验证（P9R-2）任何一张表条数或正文长度对不上 —— 停，这是发布完整性。
- 公证不过（不是 TSA 偶发失败那种）—— 停，把 Apple 的日志拿给 Ocean 看。
- 发版说明、README、官网文字：写好先给 Ocean 看。
- 任何要改产品代码的事 —— 停。

## 6. 给 Ocean 的验收单（发完给，大白话）

1. 打开 GitHub 的 Release 页：v0.7.0 在，两个下载文件都在，说明读着没问题。
2. 打开 spoolapp.org：首页下载按钮能下到 v0.7.0；隐私说明写的是 v0.7.0 和发版那天。
3. 你这台 Mac 上的 Spool 已经是正式版：打开不弹「无法验证开发者」，库里的东西都在，织成的东西都在。
4. **只有你做得了的两件**（`RELEASE.md` §3）：找一台没装过 Spool 的 Mac（或者新建一个 macOS 用户），从官网下载、装、打开：首启建库、出现教程项目；双击 ⌥ 弹授权、授权重开后能捕捉。
5. 有问题直接说哪一步、看到了什么。

## 7. 回执（执行窗填写）

### 7.1 P9R-0 · 开工核对 + Ocean 的答复（10-18 晚）

- 前提：插队修的两个捕捉 bug（`f74dfab`）16:13 已换装；Ocean 10-18「试过了，两条都好」⇒ 开工。
- 基线（`a78955b`）：tsc 干净 · vitest 113 个文件 / 1173 条（第一遍 1 条红：`knitStore.test.ts` 撤销那条，单独连跑 6 遍红 1 遍 ——
  `unredeem` 拿 `Date.now()` 当身份，测试里两次兑换落在同一毫秒时旧 toast 的撤销对上了新的那件；人点不出同一毫秒，
  是测试不稳不是产品 bug，记 HANDOFF，不在这一窗修）· cargo 222 过 · 5 跳过 · sidecar 14 · `(none missing)` · `--dead` 87 · `cargo tree` 那条空。
- `fetch`（HTTPS + gh token）：远端 `main` 仍是 `e37950c`；本地多 **213** 笔（任务书写时 210，之后多了 P9R 任务书和插队那两笔）；
  改到 `site/` 的 4 笔不变；`docs/` 改了 **131** 个文件；「推荐信 / 老师信息 / 个人网站素材」：`docs/` 里远端 3 个、推完 10 个
  （多出的 1 个是这份任务书自己）；另有几个测试文件把这几个词当样例用，远端已经有 4 个。
- §4 四件的答复：① **甲 照推**（第一次选了 Other 没写字，重问后选甲）；② Ocean 直接给了三个环境变量（只当环境变量传给构建命令，
  没写进任何文件、提交或记忆）；③ **只写英文**；④ **丙 都不改**（首页线轴那一段和两张图这一版不动）。
- 另问的一件（发布完整性，§5「停下来问」）：官网中英各 3 个 + README 1 个「下载 Windows 版」按钮指向
  `releases/latest/download/Spool-windows-x64-setup.exe`，**从 08-24 v0.6.2 起就是 404**（v0.6.2 只发 Mac，`latest` 里没有 Windows 包；
  台账 v0.6.2 那行写了「故意只发一个平台」，没人注意到按钮跟着坏了）。v0.7.0 也只发 Mac ⇒ Ocean 选**甲：按钮改指 v0.6.1**
  （最后一个有 Windows 包的版本），按钮写「(v0.6.1)」、小字写「还是 v0.6.1，下一版跟上」。发版二要改回 `latest`。

### 7.2 P9R-1 · 版本号和对外说法（`f92b937`）

- 三处版本号 → 0.7.0，`Cargo.lock` 跟着，`cargo check` 过；隐私说明三份日期 → 2026-10-18，`build-site-zh` 重跑、它的测试 12 条过。
- README：状态段（只发 Mac、Windows 停在 v0.6.1、链到发版说明、去掉 v0.5.0 feature-complete）、Windows 链接、MCP 工具数。
- MCP 工具数（真库 `VACUUM INTO` 副本 + `{"mcpEnabled":true}`，`SPOOL_DATA_DIR` 指副本，`/Applications` 里那个二进制 = `f74dfab` 的代码，
  P9R-1 不改代码）：普通连接 **26**（只读 14、写 12）；`--engine-run` **25**（少 `propose_split`）。P9R-4 用发版二进制再数一遍。
- 官网：Windows 按钮（见 7.1）；线轴那一段不动（④ 丙）。提交前 tsc 干净、vitest 1173 全过。

### 7.3 P9R-2 · 升级和首启验证（只在副本上）

scratchpad 里一份 vitest 配置把 `@tauri-apps/plugin-sql` 和 `@tauri-apps/api/path` 换成桩（`Database.load` 打开 scratchpad 里的文件、
快照目录指 scratchpad），跑的是仓库里真的 `migrateSchema` / `initDb`。⛔ 没起 GUI，真库一个字节没碰。

- **A · v24 副本直接走 `migrateSchema`**（源：`spool.pre-migration-v24-2026-08-25T03-39-22-515Z.db`，`VACUUM INTO` 出来，`integrity_check` ok）：
  `fresh === false`；`user_version` 24 → 35；**每张老表条数、每一列 `SUM(LENGTH)` 和非空数逐项相等**（工作区 21 · 项目 53 · 块 296 · 文件 1 ·
  引擎记录 12 · 跟进 13 ……）；新表 5 张（`block_images`、`file_proposals`、`read_positions`、`split_proposals`、`supersede_proposals`）全空；
  新列 14 个全是 NULL（`threads.private` 全 0，没有项目被迁成私密）；`integrity_check` ok、`foreign_key_check` 空、`blocks_fts` 的
  `integrity-check` 过。和空库按 `schema.sql` 建出来的比：只差 `attachments.thread_id` 可空（v15 用 ALTER 加的，真库从 v15 起就这样，不是这一版新来的）。
- **B · 另一份 v24 副本走真的 `getDb()` → `initDb`**（迁移 + `seedDefaults`）：结果和 A 逐项相同、没有播种任何东西；
  升级前自动快照写出来了（`spool.pre-migration-v24-…db`，`user_version` 24，和原件逐项相等）。
- **C · 空库走真的 `initDb`**：`fresh` 路径建到 v35，播进默认工作区 + 教程两个项目 + 示例项目（4 个项目、17 块），`integrity_check` ok。
  真正的首启（新机器 / 新用户、双击 ⌥ 授权）照 §6 第 4 条留给 Ocean。

### 7.4 P9R-3 · 发版说明（`7b7b466`）

`docs/RELEASE_NOTES_v0.7.0.md`，英文，Ocean 10-18 看过「可以」。大小和 sha256 留空，打完包填。

### 7.5 P9R-4 · 构建 + 公证 —— ⛔ 第一次卡在苹果账号（10-18 21:38）

- `/Volumes` 只有 `Macintosh HD`；在 `7b7b466` 上跑 `npm run tauri build`（日志进 scratchpad 文件，没接管道），
  环境变量带 `APPLE_SIGNING_IDENTITY="Developer ID Application: Hanze JIN (Q5Y5JRXZ58)"` 和公证三件。
- 编译、sidecar、签名都过了（`Spool.app` 的 Authority 第一行是 Developer ID，时间戳 21:39:20）；**交公证那一下苹果回 403**：
  `A required agreement is missing or has expired. This request requires an in-effect agreement that has not been signed or has expired.`
  构建退出 1，没出 dmg，**没有 submission id**（请求在排队之前就被拒了）。
- 拿同一套凭据跑只读的 `xcrun notarytool history` 也是同一个 403 ⇒ 是账号那边（苹果更新了开发者协议、要账号持有人重新同意），
  不是 TSA 那种偶发失败，也不是这次构建的问题。照 §5 停下来问 Ocean。
- Ocean 10-18 晚在 developer.apple.com 同意了新版《Apple Developer Program License Agreement》（签发 2026-10-13，账号页显示接受日期 2026-10-18）。
  之后每 1 – 3 分钟只读地查一次 `notarytool history`：**到 10-19 04:58 仍是同一个 403**；App Store Connect「商务 → 协议」顶上
  那条黄条（10-18 22:08 截图、23:3x 再看）仍在。
- 插曲：10-18 晚这台机器升到 macOS 27.0.1、Xcode 27.1，新 Xcode 的许可没同意时 `xcrun notarytool` 根本不出网、报的是 Xcode 许可那一句 ——
  轮询脚本只看「没有 403」就当成通了，**误报过一次**（已向 Ocean 更正）；Ocean 跑了 `sudo xcodebuild -license accept` 之后又回到 403。
  之后的轮询改成「`notarytool history` 退出 0 才算通」。
- 发版日已经不是 10-18 ⇒ 构建前要先把隐私说明三份的日期改成真正发版那天（第 149 条），一笔小提交。

- **10-19 通了**：Ocean 10-19「应该可以了，官网的提示消失了」（App Store Connect 的黄条没了；他 10-19 也给 Apple Support 发过邮件，到底是哪个让它好的不知道）。
  16:21 只读 `notarytool history` **退出 0、列出了历史**（最上面是 v0.6.2 那两次，和台账对得上）。

### 7.6 P9R-4 · 构建 + 公证（10-19）

- 发版日变成 10-19 ⇒ 先改隐私说明三份日期 → 2026-10-19、重跑 `build-site-zh`（测试 12 条过）：`20cebca`。
- `/Volumes` 只有 `Macintosh HD` 和系统的 `Recovery`；`xcodebuild -version` 不报许可。在 **`20cebca`** 上 `npm run tauri build`（16:21:34 – 16:23:27，退出 0）。
- **`.app` 公证 Accepted，submission `e49524ae-4533-4d9a-ab12-c116e8b092fd`**（日志里当场记的）。
- **`.dmg` 补公证 Accepted，submission `0e012752-73dc-45cc-8ef7-5b41005ef510`**（`$DMG` 用绝对路径），`stapler staple` 过。
- 验：两个产物 `spctl` 都是 `accepted` · `source=Notarized Developer ID`；`codesign -dvv` Authority 第一行 `Developer ID Application: Hanze JIN (Q5Y5JRXZ58)`
  （`.app` 时间戳 16:22:13、dmg 16:23:27）；`--verify --deep --strict` 过；`spool-ai` 也是 Developer ID；两个 `stapler validate` 都过；`Info.plist` 版本 0.7.0；
  二进制 `minos 11.0`（发版说明写的「macOS 11 or newer」对）。
- dmg：**11,478,440 字节**（staple 之后），**sha256 `5c2fb81784a57eed5d0d69a28fbe41733cf95eaeaa334d363f41b89aa65b0d5c`**；填进发版说明（10.9 MB，按 1024² 和 v0.6.2 一样）：`efe2265`。
- **发版二进制的 MCP**（真库 `VACUUM INTO` 副本 + `{"mcpEnabled":true}`，`SPOOL_DATA_DIR` 指副本）：`serverInfo.version` = 0.7.0；普通 **26**（只读 14、写 12）、
  `--engine-run` **25**（没有 `propose_split`）—— 和 README 一致；`get_block_images` 回了一张 `image/png`；连**没迁移的 v24 副本**时 `list_threads` 被拒，
  文案「Spool's database is still the older v24; this MCP server is v35…」。真库目录的 `mcp-clients.json` 里没有探针那一行。

### 7.7 P9R-5 · 推送 + Release + Registry（Ocean 10-19「三步都做」「改成 0.7.0 并发布」）

- 推之前再 `fetch`：远端仍 `e37950c`，没推的 **218** 笔、改到 `site/` 的 6 笔。HTTPS + gh token 推 `main`：`e37950c..efe2265`；`update-ref` 补 `origin/main`，再 fetch 核过远端 = 本地。
- `git tag -a v0.7.0 20cebca`（打在真正构建的那一笔上）并推；`ls-remote` 核过 `v0.7.0^{}` = `20cebca`。
- `gh release create v0.7.0 --verify-tag --latest --title "Spool 0.7.0 (macOS)" --notes-file docs/RELEASE_NOTES_v0.7.0.md`，两个资产
  `Spool_0.7.0_aarch64.dmg` + 同一个文件改名的 `Spool-macOS-arm64.dmg`（sha256 先比过一样）；`releases/latest` = v0.7.0；不是草稿、不是预发布。
- `latest/download/Spool-macOS-arm64.dmg` → 跳到 `download/v0.7.0/…`、**200**；`download/v0.6.1/Spool-windows-x64-setup.exe` **200**。
- 从 Release 两个名字各**下载回来**：sha256 都是 `5c2fb817…`，`stapler validate` 过，`spctl` `accepted` · `Notarized Developer ID`。
- 官网：Pages 部署跟着这一推跑了（`efe2265`）；`spoolapp.org` 的 `last-modified` 15:49:47 GMT，英文 / 中文隐私页都是「2026-10-19（对应 Spool v0.7.0）」，
  中英首页各 3 个 Windows 按钮指 v0.6.1、3 个 macOS 按钮走 `latest`。
- **MCP Registry**：`server.json` 0.6.2 → 0.7.0，`mcp-publisher validate` 过；08-29 存的登录过期了（401），用 `gh auth token` 重新 `login github --token` 后 publish 成功；
  线上 API 核过 `0.7.0 status=active isLatest=true`（publishedAt 2026-10-19T15:32:29Z），0.6.2 还在、`isLatest=false`。提交 `server.json`（本地，收尾时一起推）。

### 7.8 P9R-6 · 本机换成正式版（Ocean 10-19「没有，可以换」—— 没有没点「完成」的字）

- 装前：`/Applications/Spool.app` 版本 0.6.2 字样的 Developer ID 构建（`spool` sha256 `0292a0f7…`，`Unnotarized Developer ID`）；GUI 3404、`--overlay` 3466；`--mcp` 9 个；
  真库 v35 · ok · 工作区 30 · 项目 88 · 块 1261 · 文件 67 · 图片 20 · 正文总长 497,659；快照 27 个；`drafts.json` 空。
- 备份（`~/Desktop/Spool/db/`）：`spool.before-v070-install-20261019-165138.db`（v35 · ok · 1261 块）+ 同名的 `settings` / `focus` / `drafts` / `knit` 四个 json。
- 装的是**从 Release 下载回来的那个 dmg 里的** `.app`：只读挂载 → `ditto` 出来 → `chmod -R go+rX` → `codesign --verify --deep --strict` 过；`spool` sha256 `5a8fefb5…` = 构建产物。
- 停：GUI 3404、`--overlay` 3466 按 pid `kill -TERM`，几秒内都退了；`--mcp` 一个没碰（装后还是 9 个）。旧包 → `~/Desktop/Spool/spool-pre-install/Spool-old-20261019-165138-pre-v070.app`。
- 起：`open -a /Applications/Spool.app --stdout/--stderr ~/Desktop/Spool/logs/spool-v070-20261019-165138.log`（记忆 §50）。主进程 29466、`--overlay` 29494（16:52:01）；
  运行中的二进制 inode 83841284 = 新文件。
- 装后：`spctl` = **`accepted` · `Notarized Developer ID`**，版本 0.7.0；真库 v35 · ok，上面那几个数逐项一样、快照仍 27 个（同版本库，没迁移）；
  `settings.json` / `knit.json` / `drafts.json` 和备份逐字节一样；日志两行：overlay 起来了、双击 ⌥ 装在 HID/active（独占）——授权没掉。

### 7.9 P9R-7 · 台账和收尾

- `docs/CASE_STUDY_LEDGER.md` §1.2 加了 v0.7.0 那一行（照 v0.6.2：日期、tag → 构建提交、签名身份、两个 submission id、文件名 / 大小 / sha256、Gatekeeper、
  Windows 故意不出且按钮改指 v0.6.1、固定名 200、库 v24 → v35、MCP 26 / 25、Registry），外加一段「这一行多了什么」：卡在账号协议、不是构建。⛔ 没写它自己所在提交的 sha。
- `docs/RELEASE.md` §0.0 顶上加一句「最新发布是 v0.7.0」，别的没动。
- HANDOFF §9.2 第 163 条、§9.3 发版一那一行、§9.8 唯一下一步；`DISCOVERED-20261018-5` 结案；任务书移进 `archive/product-taskbooks/`；`docs/README.md` 入口那一行。
- **没做的**：§6 第 4 条（新机器 / 新 macOS 用户上从官网下载、首启建库、双击 ⌥ 授权）只有 Ocean 做得了。
