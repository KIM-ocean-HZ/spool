# 产品任务书 P9B —— 深浅色跟随系统；周回顾「活动」；存每天的专注时间

> **状态：COMPLETE。**（2026-10-14：三步都已提交、已换装；**Ocean 2026-10-14 验收通过**；回执在 §7 末尾。开工那天的记录：P9A 已裁定、修补 P9F 已验收通过 —— HANDOFF §9.2 第 90 条，原来是 QUEUED。）
> 开工条件：P9A 那一窗做完、Ocean 裁定了它的建议表；如果裁定里有「修补」要排在 P9B 前面，修补也做完。开工的那一窗先把这一行改成 `ACTIVE`，再照 §2 重核起点（Ocean 10-10 第 75 条：「先 P9A，P9B 排队」；HANDOFF §9.4 第 1 条：同一时间只有一份 ACTIVE）。
>
> **唯一交付：** 下面 §3 的三步（P9B-1 – P9B-3），按顺序做完，每一步测试通过、单独一笔提交，并在 §7 写回执。
>
> **来历：** Ocean 09-30 第 5 条（周回顾加工作时间图表、内容统计）和 10-10 的深色（HANDOFF §9.2 第 55 条）。10-10 拆分时这两件合成 P9B（第 59 条）。
> 正文从 HANDOFF §9.7「P9B（原 P9）」那一段和 §9.9 `DISCOVERED-20261010-2` **搬过来**（HANDOFF 那边只留一行「已下发到 …」）。
> **「现在」一栏每一条都对着 `c5f129b` 的代码和真库只读查询核过。** P9A 不改代码，但修补可能会改；开工时按 §2 重核。
>
> **授权来源：** 都是 Ocean 自己的拍板，本任务书只引用、不改：
> - 第 13 条（图表中文叫「活动」、英文 Activity；像 Apple 屏幕使用时间，最直观、占最小的位置）、第 15 条（不做效率打分、不按 app 记时间）、第 16 条 C-D1（存每天的专注时间历史）；
> - 第 55 条（跟随系统的深浅色，默认开；Windows 要照顾到，跟不了就另想办法）、第 59–61 条（拆成 P9B；情人节版保持浅色；设置里留「跟随系统 / 浅色 / 深色」，默认跟随系统）；
> - 第 75–79 条（下发这一窗问的：先 P9A 后 P9B；周回顾入口一直显示；关了休息提醒也照记专注时间；左栏那张卡照旧；深色用暖深色）。
>
> **边界：** 只做这三步。
> - 不碰实验线：`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行。
> - 不动 `docs/EXECUTION_POLICY.md`。
> - **库结构一个字不改**（真库停在 v33）。专注历史照旧不进库（理由见 P9B-2）。
> - **MCP 的工具、描述、输出格式都不改**；pack 的格式、golden 都不改。「活动」不喂给任何 AI。
> - **不花钱**：这三步没有一处要调付费接口。
> - CSP 一个字不改；不加网络依赖（`cargo tree` 那条照旧必须是空的）。
> - 周回顾的 AI 部分（DeepSeek 改结构化、建议动作卡片、更新时弹消息）是 P10，这一份不碰。
> - 不 push、不发版。换装给 Ocean 验收之前先问一句（§5）。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：
   - 首屏、§9.0 – §9.4、§9.8 – §9.9；
   - §9.2 第 13、15、16、55、59–61、75–79 条；
   - §10.6 红线速查。这一份尤其要照着做的几条：「经典版 = 发布版本身，`tokens.css` 裸 `:root` 不许动」「`--accent` 不是 `#e66d98`」「少用 emoji，一屏最多一个 ⚠️」「用户不能看到一个测试环境的 Spool」「主进程零出网，CSP 一个字不改」。
3. `docs/archive/product-taskbooks/TASKBOOK-P9A-…`（P9A 做完之后会在那里）的回执和 Ocean 的裁定：尤其 `DISCOVERED-20261010-4`（`bg-accent-soft` 那 10 处）裁成了什么。
4. `CLAUDE.md` §3（只改该改的）和 §5（提交信息里不许有任何工具署名）。
5. 记忆：
   - `overlay-cannot-read-settings`：捕捉浮窗是另一个进程、读不到设置，只能由 Rust 在 show 之前推（情人节主题当初就是这么漏的）；
   - `isolated-verify-workflow`：§42 建演示版（改三处常量 + productName，别放 /private/tmp）、§43 单独起 `--overlay` 截捕捉卡、本机做不了 Windows 的整包 cargo check、§45 把真组件 SSR 成静态页给 wk-snapshot 截图、§21 / §40 换装；
   - `spool-db-wipe-incident`：这一份不迁库，但⛔ 别起 debug 版 GUI（同一个 identifier，会打开真库）；
   - `tauri-sync-commands-freeze-ui`：如果要加 Tauri 命令，一律 `(async)`；
   - `ui-language-follows-system`、`no-test-environment-spool`、`write-plainly-for-ocean`。
6. **画图之前加载 `dataviz` skill**，按它的配色与标记规范画（HANDOFF §9.7 原文要求）。
7. 每一步开工前，读该步「现在」一栏点名的文件。

## 2. 起点

- **分支和提交：** 本地 `main`。下发本任务书的那笔 docs 提交（标题以 `docs: 下发 P9B` 开头）的上一笔是 `c5f129b`（`docs: 下发 P9A`）。开工时 `git log` 里应该还多了：P9A 的收尾提交、Ocean 裁定的记录，可能还有修补的提交。
  - 只多了 docs 提交 ⇒ 「现在」一栏照旧成立，直接开工。
  - 多了改代码的提交（修补）⇒ 先 `git diff c5f129b..HEAD --stat` 看动了哪些文件；凡是碰到 `src/styles/`、`tailwind.config.js`、`src/lib/theme.ts`、`src/hooks/useTheme.ts`、`src/components/Settings/GeneralConfig.tsx`、`src/components/ReviewBoard/`、`src/components/Sidebar/`、`src/lib/db/focusDay.ts`、`src/hooks/useBreakReminder.ts`、`src-tauri/src/overlay.rs` 的，对应那一步的「现在」重核一遍，回执里写核的结果。对不上就停下来说明。
- **只提交自己的文件：** 工作树里有别人没提交的改动（`docs/` 下研究线的文件、`docs/README.md` 里研究那几行）。
  - 只 `git add` 你自己改的文件的路径，绝不 `git add -A` / `git add .` / `git commit -a`。
  - README 要改的话只暂存自己那一行：拿 HEAD 版本只换那一行，用 `git hash-object -w` + `git update-index --cacheinfo`。
- **删文件会被权限拦：** `git rm` 写给 Ocean，请他在输入框里用 `! git rm …` 跑；`git mv` 能自己跑。
- **提交：** 每步一笔，提交信息用中文。提交后跑 `CLAUDE.md` §5 那条自查；命中产品内容里的 claude 字样，按记忆 `attribution-grep-false-positive` 复核。
- **测试基线**（P9 最后一遍，`7efc7b5` 上实测；P9A 不改代码，所以没有修补的话开工时应该一样。开工前先跑一遍对一下，每步做完再跑）：

```bash
npx tsc -b                                                # 干净
npx vitest run                                            # 85 个文件 / 1016 条全过
cargo test --manifest-path src-tauri/Cargo.toml           # 190 过 · 5 跳过
cargo test --manifest-path src-tauri/sidecar/Cargo.toml   # 14 过
node scripts/i18n-check.mjs                               # (none missing)
node scripts/i18n-check.mjs --dead                        # 87 行 DEAD（基线噪声），只看你造出来的
cargo tree --manifest-path src-tauri/Cargo.toml -e normal | grep -iE "ureq|rustls|reqwest|hyper|openssl"   # 必须是空的
```

  Vitest 输出里那几十行 `[db] pre-migration backup FAILED … window is not defined` 是老噪声。`cargo test` 偶发 2 条失败（`DISCOVERED-20261007-2`），重跑一遍再判。

- **真库和本机现状**（10-10 只读，⛔ 别写）：
  - 库 `user_version` = 33；这一份不改。
  - `settings.json`：`theme` = `classic`，`language` = `en`，`blockFontSize` = `large`，**没有** `breakReminderEnabled` 这个键（= 默认开着）。
  - `focus.json`：只有一个键 `today` = `{dayKey: "2026-10-10", totalMs: 1819913, lastActiveAt: …}`（约 30 分钟）。换装之后这个数要原样接进历史里（P9B-2 第 1 条）。
  - 左栏「周回顾」在 Ocean 的机器上看得见（装了 CLI）。

## 3. 三步

### 共同的规矩

- **大白话，少用 emoji**：界面上一屏最多一个警示符号，用图标不用 emoji（§10.6）。所有新字都要有英文，走 `t()`。
- **颜色只从 token 来。** 组件里不许按深浅色分支挑颜色（`hooks/useTheme.ts` 头注释那条：「Anything that is only a colour … must come from a token」）。新颜色写成 token，深浅两套、情人节一套。
- **经典版浅色一个像素都不许变。** `tokens.css` 原来那个裸 `:root` 块、`[data-theme='valentine']` 块一个字节不动；要加的新 token 写在**新的** `:root { … }` 块里（照文件末尾「正文字号三档」那样另起一块），值和今天浅色下看到的一样。
- **情人节版永远是浅色**（第 60 条），不管系统、不管「深浅」那个设置。
- 不加系统通知、不加系统权限。

### P9B-1 · 深浅色：一套暖深色 + 设置里三选一 + 主窗和捕捉浮窗跟着变

- **来历：** 第 55、59–61 条；第 79 条（暖深色：和经典版的纸同一个色系，深棕黑底、米白字、琥珀色强调照旧）。原条目 `DISCOVERED-20261010-2`（搬过来了）。
- **现在**（`c5f129b`）：
  - **颜色全在 token 里。** `src/styles/tokens.css` 只有两套：经典版（裸 `:root`，已发布的样子）和情人节版（`:root[data-theme='valentine']`）。上 Tailwind 的八个颜色（paper / paper-2 / ink / ink-2 / muted / line / line-strong / accent）每个是**两个 token**：`*-rgb` 通道值 + 完整颜色，文件头那段注释写了为什么两个都要（缺了通道值，`bg-ink/30` 这类类会整条被丢掉，而构建和测试全绿）。另外直接用 `var()` 的：`--paper-edge`、`--accent-2`、`--accent-soft`、`--highlight`、`--selection`、`--block-active-bg`、`--notice-warm` / `-edge`、`--status-*`、`--urgent` / `-strong`、`--shadow-card` / `-toast`。`scrollbar.css` 用的是 `--ink-rgb`，会自己跟着走。
  - 组件里**没有**用 Tailwind 自带色板的类（`bg-white`、`text-red-500` 这类，扫过是 0）。
  - **token 以外写死的颜色**（深色下要处理的）：
    - `src/styles/global.css` `.paper-bg` 的两层琥珀色径向渐变（`rgba(180, 83, 9, 0.04 / 0.03)`）；`@keyframes flash` 的琥珀底（`rgba(251, 191, 36, 0.18)`）；
    - `src/components/ThreadView/ScaleRail.tsx:465` 和 `src/components/Search/SearchResultItem.tsx:24` 搜索命中的底色 `rgba(251, 191, 36, 0.45)`（行内 style）。
  - **写死、但这一份不动的**：`App.tsx` / `main.tsx` / `ErrorBoundary.tsx` 三处出错页（十六进制写死的经典浅色，CSS 没加载出来时也要能显示）；`global.css` 和 `src/overlay/style.css` 里 `rgba(253, 248, 245, …)` 那几行（只在情人节版）；`src/lib/valentine/heart.ts` 的 `HEART_ROSE`（情人节）。
  - **没有任何地方声明 `color-scheme`** ⇒ 深色下系统自带的控件（周回顾那个「用哪个模型」下拉框、日期选择这类）还会画成浅色。
  - **主题怎么挂上去：** `src/lib/theme.ts`：`Theme = 'classic' | 'valentine'`，写成 `<html data-theme=…>`；`src/hooks/useTheme.ts` 的 `useAppliedTheme()` 在主窗（`App.tsx:121`）和捕捉浮窗（`CaptureOverlay.tsx:177`）各挂一次。
    - 主窗：`settingsStore` 直接读 `settings.json`，收到 `settings:changed` 再读。
    - 捕捉浮窗：**另一个进程**，没有 `store:` 权限、收不到那个广播。Rust 每次 show 之前现读 `settings.json`，把语言和主题推过去（`src-tauri/src/overlay.rs`：`THEME_EVENT = "overlay:theme"`、`ui_theme()`、`settings_string()`；前端 `src/lib/capture/overlayProtocol.ts` 的 `OVERLAY_THEME_EVENT`，`overlayProtocol.test.ts` 核两边写的是同一个名字；浮窗在 `CaptureOverlay.tsx:325–336` 收）。
  - **窗口本身：** `tauri.conf.json` 主窗没写 `theme`，浮窗的 `WebviewWindowBuilder`（`overlay.rs:251`）也没写 ⇒ 两个窗口都跟着系统，网页里的 `prefers-color-scheme` 能读到系统的深浅。
  - **设置页：** 设置 → 通用，「外观」一行是「经典 / 情人节」两个按钮（`src/components/Settings/GeneralConfig.tsx:81` 起），下面是「正文字号」。三处按钮选中时用的 `bg-accent-soft` 从来没生效过（`DISCOVERED-20261010-4`，看 P9A 的裁定）。
  - 冷启动：主窗第一帧是经典浅色，设置读回来之后才换主题（`useTheme.ts` 的注释：故意的，免得经典用户每次启动闪一下粉色）。
- **要做：**
  1. **暖深色一套 token**，只给经典版用。选择器要保证情人节版永远不吃到它，比如 `:root[data-scheme='dark']:not([data-theme='valentine'])`（名字施工时定）。裸 `:root` 里每一个颜色 token 都要有深色的值，`*-rgb` 和完整颜色两个都写（同一个形状，理由同上）。在同一个选择器里写 `color-scheme: dark`，让系统自带的控件也变深。
     - 色调：第 79 条，深棕黑的底、米白的字、琥珀色强调照旧（为了深底上看得清可以提亮，但还是琥珀那一族）。阴影改成深底上看得见的样子。
     - **每一档字都量对比度，不凭眼睛**，照情人节那段注释的做法把数字写进 CSS 注释：`--ink`、`--ink-2`、`--muted`、`--accent`、`--accent-2`、`--status-*`、`--urgent` 对 `--paper`。下限：正文 `--ink` ≥ 7 : 1，`--ink-2` 和 `--accent`（它也当小字用）≥ 4.5 : 1，`--muted` 不低于经典浅色今天的 3.42 : 1。
  2. **写死的颜色：** `.paper-bg` 和 `flash` 在深色选择器下另写一份（经典浅色那两条原样留着）；两处搜索命中底色改成读一个新 token（新 token 写在新的 `:root` 块里，浅色值就是今天的 `rgba(251, 191, 36, 0.45)`，深色另给一个上面的字看得清的值）。出错页不动。
  3. **设置：三选一，默认跟随系统**（第 61 条）。`settingsStore` 加一个键（名字施工时定，比如 `colorScheme`：`system` / `light` / `dark`），照 `themeOrDefault` 的样子写一个校验：不认识的值一律当「跟随系统」（`settings.json` 可以手改，库也能带到别的版本上去）。设置 → 通用，「外观」下面紧跟一行「深浅」，三个按钮：跟随系统 / 浅色 / 深色（英文 Match system / Light / Dark，施工时可以改，但要短）。用和上面两行**同一个**按钮样子，不另做控件。外观选了情人节 ⇒ 这一行变灰、点不动，下面一行小字写「情人节版只有浅色」。
  4. **主窗跟着变：** 算出该用深还是浅（设置是「跟随系统」就问 `matchMedia('(prefers-color-scheme: dark)')`，否则照设置），写到 `<html>` 上（和 `data-theme` 各管各的，两个可以同时在）。监听 `matchMedia` 的变化 ⇒ 系统一切，Spool 马上跟着变，不用重启、不用点什么。
  5. **捕捉浮窗跟着变：** 照主题那条路，Rust 每次 show 之前把这个设置也推过去（`overlay.rs` 加一个事件常量 + 读 `settings.json` 的那个键；`overlayProtocol.ts` 加对应的常量，`overlayProtocol.test.ts` 加一条核两边同名）。浮窗自己用 `matchMedia` 算「跟随系统」时该深该浅，卡片开着时系统切了也跟着变。推送要排在内容事件之前（和主题一样），卡片第一帧就是对的。
  6. **冷启动不闪：** 系统是深色、设置是跟随系统 ⇒ 主窗第一帧就是深色，不许先白一下再变深（这一条和「经典浅色第一帧」不冲突：浅色的人第一帧照旧是浅色）。办法施工时定：比如在 `main.tsx` 挂 React 之前同步问一次 `matchMedia` 先把属性写上；用户手选了「浅色 / 深色」而系统相反的那种，可以用 `localStorage` 记一个「上次用的是哪个」当第一帧的提示（读写都包 try/catch，读不到就照系统）。原生窗口在网页画出来之前那一下的底色也看一眼；要改 `tauri.conf.json` 或窗口的 builder 才能不闪 ⇒ 停下来问（§4）。
  7. **Windows：** 同一份代码（WebView2 也认 `prefers-color-scheme` 和 `matchMedia`），不另写一套。本机编不了也跑不了 Windows（记忆 §43），所以：回执里写清「Windows 没验过」；收尾时在 HANDOFF §9.3「发版二」那一行加一句「Windows 装机时验：系统切深浅色 Spool 跟着变；跟不上的话设置里的深色 / 浅色就是兜底（第 61 条）；标题栏是不是跟着变也看一眼」。
- **不做：** 情人节版的深色；补那 10 处 `bg-accent-soft`（看 P9A 裁定，裁了「补」就是修补那一份的事，这一份只保证 `--accent-soft` 在深色下有一个合适的值）；出错页；官网。
- **验收：**
  - vitest：设置校验（不认识的值 ⇒ 跟随系统）；深浅怎么算（跟随系统 + 系统深 ⇒ 深；选浅色 ⇒ 永远浅；情人节 ⇒ 永远浅）；浮窗那个事件名两边一致。
  - 经典浅色没变：`git diff c5f129b -- src/styles/tokens.css` 里原来的裸 `:root` 块和情人节块一行没变（只有新加的块）；构建出来的 css 里经典那一段的规则和 `c5f129b` 构建出来的逐字一样（两边各 `vite build` 一次对比，回执写怎么比的）。
  - 截图按记忆 §45：主窗（打开一个有块、有文件、有图片的项目，左栏、右栏都开着）、设置 → 通用、周回顾页 —— 经典浅色、经典深色、情人节（系统是深色时）三种；捕捉卡按 §43 浅色、深色各一张；再加一张英文界面。另外拿经典浅色的同一页，改之前和改之后各截一张，用 `scripts/compare-visual-snapshots.py` 比，门槛设成 0，回执写结果。
  - 真跟着系统变：用演示版（§42，不碰真库）开着，切系统深浅色，看主窗和捕捉卡跟着变。⚠️ 切系统深浅色会改整台电脑的样子，切完马上切回原来的样子，回执里写切过几次、切回去了。
  - Windows 那一半写进 HANDOFF（见第 7 条），不在这一窗验。

### P9B-2 · 存每天的专注时间；关了休息提醒也照记

- **来历：** 第 16 条 C-D1（存每天的专注时间历史）；第 77 条（休息提醒关着也照记，只是不弹休息）；第 78 条（左栏那张卡照旧：关了提醒只显示捕捉数）。HANDOFF §9.7 原文：「`focus.json` 从只存今天改成存最近若干周每天一个总数（仍然不进库、不随库导出，理由和原来一样）；查 `docs/PRIVACY.md` 要不要加一句『这份数字只在本机』」。
- **现在**（`c5f129b`）：
  - `src/lib/db/focusDay.ts`：`focus.json` 里一个键 `today` = `{dayKey, totalMs, lastActiveAt}`，只存今天。文件头写了三条为什么**不进库、不进 `settings.json`**：它不是库里的内容（库能搬到别的电脑，「今天专注了 47 分钟」跟过去就是假话）；它不是设置；为一个随时可以丢的数字动库结构不值。读不到就当今天从零开始。
  - `src/hooks/useBreakReminder.ts`：开机读回今天那条（L71–87）；**休息提醒关着时整个计时器不跑**（L89–97：`if (!enabled)` 清掉这一坐、放下锁、直接 return，不起 interval）⇒ 今天关了提醒的人，专注时间根本不记。每 30 秒一次 tick，数字变了才写盘（L146–158）。
  - 「专注」是怎么算的（`src/lib/breakReminder.ts` 的 `isWorking`）：**电脑 15 分钟内有人动过，并且 Spool 在前台、或者 15 分钟内捕捉过**。所以它不是「这台电脑在用的时间」，也不是「在某个项目上花的时间」。
  - 「今天」什么时候翻篇（`shouldRollDay`）：人停下来超过 15 分钟**并且**日期变了才翻；熬夜过了 0 点还在干，那段时间记在前一天。
  - 左栏那张卡：提醒开着时在「捕捉数」和「时钟」之间轮流显示；关着时只显示捕捉数（`SpoolCard.tsx` 的 `usePanelFace(breakReminderEnabled)`，Ocean 08-19 定的）。
- **要做：**
  1. **`focus.json` 多存每天一个总数。** 加一个键（比如 `days`：`{"2026-10-10": 毫秒数, …}`），每次写今天那一条时同一天的数一起更新；`today` 那个键的样子不变（这样万一要装回旧版，旧版照样读得懂）。第一次读到只有 `today` 的老文件 ⇒ 把那一天的数接进去（Ocean 机器上今天那 30 分钟不能丢）。翻篇时前一天的数就留在 `days` 里当那天的最终数。只留最近 53 周，更早的写盘时丢掉。读不到、形状不对 ⇒ 当空的，不挡启动（和今天一样）。
  2. 仍然**不进库、不进 `settings.json`、不随库导出**，理由照 `focusDay.ts` 文件头那三条，注释跟着改成「每天一个数」的说法。
  3. **关了休息提醒也照记**（第 77 条）：计时器总在跑，提醒关着时只是不弹休息、不锁窗、不出时钟那一面。今天的总数、翻篇规则和提醒开着时**完全一样**（同一个 reducer，不另写一套）。提醒从关到开 ⇒ 这一坐从零开始（今天就是这样），今天的总数不动。左栏那张卡**不改**（第 78 条）。
  4. 给「活动」用的读法：最近 N 天每天的数，今天那天用 `breakStore` 里正在走的数（不是上次写盘的数），这样和左栏时钟那一面的「今天已专注 N 分钟」是同一个数。
  5. **隐私说明加一句**（「数据存放在哪里」那一节）：Spool 在本机记每天专注了多久（一句话说清怎么算：你在电脑前、并且 Spool 在前台或刚捕捉过），每天一个数，存在同一目录的 `focus.json`，不进数据库、不随库导出、不离开这台电脑；删掉那个目录就清掉了。照 P5-4（`0dad7e7`）的改法三处一起改：`docs/PRIVACY.md`、`site/privacy.html`、`scripts/site-zh-privacy.html`（再用 `scripts/build-site-zh.mjs` 生成 `site/zh/privacy.html`）。⛔ 「最后更新」的日期不改，发版时三处一起改（`DISCOVERED-20261004-1`）。官网只在 push 时才会重新部署，这一份不 push。
- **不做：** 按项目记时间、按 app 记时间（第 15 条不做）；把专注时间搬进库；左栏那张卡在提醒关着时显示专注时间（第 78 条）。
- **验收：**
  - vitest：老文件（只有 `today`）读进来，那一天的数接进历史；写盘时只留 53 周；翻篇之后前一天的数还在；读到坏文件当空的；提醒关着时 tick 照样记上、永远不触发休息、不上锁；提醒从关到开，这一坐从零开始、今天的总数不变。
  - 换装之后（§5）：Ocean 机器上 `focus.json` 里今天那个数原样在新的历史里。

### P9B-3 · 周回顾顶上的「活动」；周回顾入口一直显示

- **来历：** 第 13 条（中文「活动」、英文 Activity；必须优美简洁，像 Apple 的屏幕使用时间，用最直观的方式、占最小的位置）、第 15 条、第 76 条（周回顾入口一直显示：没装 CLI 或在 Windows 上，这一页只有「活动」，AI 那一栏和「去装 CLI」那句都不出现）。HANDOFF §9.7 原文的样子：「一个大数字 + 一排七根细柱 + 一张短列表，占周回顾页顶上最小的一块」。
- **现在**（`c5f129b`）：
  - `src/components/ReviewBoard/index.tsx`：顶上标题「周回顾」+「跨所有项目，不属于任何一个」（L193 起）；下面一根引擎条，`(engineReady || apiOn)` 时才有（L204 起：手动跑一次、选模型、DeepSeek 那个按钮、自动回顾开关）；再下面按自然周分组的回顾列表（`lib/weeks.ts`，**周一为一周之始**）；一条都没有时写「还没有回顾。点上面那一下……」或「装了 Claude Code 或 Codex，并打开「允许 AI 写入」之后，这里才有东西。」（L362–370）。
  - `src/components/Sidebar/index.tsx` L232–257：左栏「周回顾」那一行**只有 `engineAvailable`（本机找得到 Claude Code / Codex / Gemini CLI）时才出现**。注释引的是 Ocean 08-17：没有 CLI 就不显示，免得点进去只有一句「去装一个」；Windows 上引擎在门口就关着，所以那一行永远不出现。只填了 DeepSeek、没装 CLI 的人现在也进不了这一页。
  - 块的三种来历已经有现成的、唯一的写法（`src/lib/db/blocks.ts`）：AI 写回的 = `MCP_SOURCE_PREDICATE`（L194，和 `sourceIcon.ts` 的 `isMcpSource` 逐条对应，测试盯着）；捕捉的 = `captureClause()`（L295，`source` 有值、不是 MCP、不是教程）；自己写的 = `source` 为空（`countUserWrittenChars` 用的同一条，L375）；教程那几块按 `tutorialSourceLabels()` 排除。
  - 截止日期：`threads.deadline`；`src/lib/threads/deadline.ts` 的 `dueInDays`（按本地午夜算整天，已完成的项目永不到期）。
- **要做：**
  1. **「活动」一块**，放在周回顾页内容区的最上面（引擎条下面、回顾列表上面），占的地方越小越好：
     - **大数字**：这一周（周一到今天，和 `lib/weeks.ts` 同一个周）平均每天专注多久。只除「有记录」的那些天：P9B 装上之前的日子没有记录，不当 0 算；装上之后某天没开电脑，那天就是 0。
     - **七根细柱**：周一到周日每天的专注分钟数；今天那根标出来；还没到的日子空着；没有记录的日子和「0」画得不一样（不画柱子、给一个淡的记号），不许冒充 0。
     - **短列表**：这一周加了块的项目，一行一根细条 = 这一周新加的块数，分三段颜色：捕捉的 / 自己写的 / AI 写回的。按块数从多到少，最多 5 行，其余收进「另外 N 个项目」，点开才出。点项目名跳到那个项目。
     - **一行到期**：这一周到期、或者已经逾期的项目（没完成的），写名字和「今天到期 / 还剩 N 天 / 已逾期 N 天」。一个都没有就不占这一行。
     - **说实话**：一行小字（或悬停）写清「专注时间 = 你在电脑前、并且 Spool 在前台或 15 分钟内捕捉过的时间，和休息提醒是同一个计时；不是在某个项目上花的时间」。块数就是块数，不换算成时间，不打分、不比上周（第 15 条）。
     - 颜色：三段颜色、柱子颜色都从 token 来（新 token 写在新的 `:root` 块里），**经典浅色、经典深色、情人节三种都要好看、分得开**。照 `dataviz` skill 的规范挑颜色、定柱子粗细和间距。
     - 数字要新：今天那根柱子用正在走的数（P9B-2 第 4 条）；页面开着时窗口回到前台就重读一次（照 `SpoolCard.tsx` 的做法）。
  2. **数据：** 一条 SQL 按项目数这一周新加的块，三种来历分开数。⛔ 不许另写第二份判断：直接用 `MCP_SOURCE_PREDICATE` / `captureClause()`，「自己写的」用同一条「`source` 为空」，教程排除照旧。范围 = `created_at` 从这周一零点到现在；已经删掉的块不在库里，自然不算；标了「不作数了」的块照算（它是这一周加的）。
  3. **周回顾入口一直显示**（第 76 条）：去掉左栏那一行的 `engineAvailable` 闸，把那段引 08-17 的注释改成引第 76 条（写清：这一页现在有不用 AI 的「活动」，所以门一直开着；AI 那一部分照旧只在引擎准备好时出现）。周回顾页：CLI 和 DeepSeek 都没准备好 ⇒ 不画引擎条，也不写「装了 Claude Code 或 Codex……」那句；以前跑过的回顾照旧列在下面（那是用户的历史，不是提示），一条都没有就只有「活动」。Windows 同样。
     - 预期的副作用，回执里写一句：只填了 DeepSeek、没装 CLI 的人，从此也能进这一页、用 DeepSeek 那个按钮 —— 那根条子本来就是「随便哪条准备好了」就出现（L204），只是以前门没开。
- **不做：** 不用 AI、不花钱；「活动」不进任何 prompt、不进 MCP（P10 / P11 再说）；不翻看以前几周的「活动」（只有这一周）；不做「比上周多了多少」、效率分；不弹消息（P10）。
- **验收：**
  - vitest：周的起止（周一零点、跨夏令时）；平均数只除有记录的天；没记录的天和 0 分得开；三种来历的归类和 `isMcpSource` / 捕捉 / 自己写的那几条一致（拿 `blocks.test.ts` 里现成的例子）；教程块不算；到期那一行（已完成的不算、逾期的在前）；入口在没有引擎时也在、页面上没有「去装 CLI」那句。
  - 真库副本（`VACUUM INTO` 到 scratchpad，⛔ 别连真库）上跑一遍那条 SQL，回执写这一周每个项目三种各几块；截图里的数要和它一样。
  - 截图（§45）：周回顾页顶上「活动」—— 经典浅色、经典深色、情人节；一张英文；一张「没有引擎」时的整页（只有「活动」）；一张左栏有「周回顾」那一行而本机没有 CLI 的样子（SSR 静态页里把引擎状态设成没有即可）。
  - i18n：`node scripts/i18n-check.mjs` 照旧 `(none missing)`，`--dead` 不比基线多。

## 4. 什么时候停下来问

- 起点不是 §2 写的那样，或者修补动过的文件让「现在」一栏对不上。
- 要动 `tokens.css` 原来的裸 `:root` 块或情人节块的任何一个字节；暖深色按 P9B-1 第 1 条的对比度下限做不出来。
- 要改 `tauri.conf.json` 或窗口的 builder 才能做到冷启动不闪、或者才能跟着系统变。
- 要动库、要改 MCP 的工具 / 描述 / 输出、要改 pack 或 golden、要改 CSP、要加网络依赖。
- 想让左栏那张卡在提醒关着时也显示专注时间，或者想改 `usePanelFace`（第 78 条说照旧）。
- 发现「专注」的算法本身有毛病、想改 `isWorking` / `shouldRollDay`（这一份只改「关着提醒也跑」，不改怎么算）。
- 要删文件（请 Ocean 跑，见 §2）。
- 发现新问题：**不顺手修**，按 HANDOFF §8 的 DISCOVERED 格式记进 HANDOFF §9.9，继续做本任务。

## 5. 做完三步之后：换装给 Ocean 验收（先问）

- 三步都提交、全部测试通过之后，**先问 Ocean「现在换装吗」**，得到同意再做。
- 照 P9 任务书回执里「换装」那一段，每一步都有命令和核对项。和 P9 不一样的地方：**这一次不迁库**（真库停在 v33），但 `focus.json` 和 `settings.json` 的样子会变：
  - 换装前：`VACUUM INTO` 备份真库到桌面（文件名带日期）；把 `focus.json`、`settings.json` 各拷一份到桌面（文件名带日期）。
  - 现装的是 Developer ID：构建时 `APPLE_SIGNING_IDENTITY` 走环境变量，不改 `tauri.conf.json`，公证变量全部 unset；日志进文件。TSA 偶发失败就整个重跑。
  - 停 GUI 和 `--overlay` **按 pid**，杀完再查一遍还在不在；`--mcp` 一个都不碰。旧包 `mv` 进 `~/Desktop/Spool/spool-pre-install/`，别删。
  - 换装后核：sha256 和构建产物一致；两个进程的 txt inode 是新文件；stderr 有 `[double-tap] installed at HID/active`；真库 `user_version` 仍是 33、`integrity_check ok`、各表计数和装前一致；`focus.json` 里装前今天那个数原样在、过一个 tick 之后有了每天的那一栏；`settings.json` 里没有被写进别的键（深浅那个键在 Ocean 动设置之前可以不存在，不存在就是跟随系统）。
  - 这一次不改 MCP，旧的 `--mcp` 子进程照常能用，不用重启 AI 客户端（库没变）。
- commit、build、换装分开记在回执里；**不 push、不发版**。

## 6. 给 Ocean 的验收单（大白话，换装后给 Ocean）

1. 打开系统设置 → 外观，切到「深色」⇒ Spool 主窗跟着变深，不用重启；切回「浅色」⇒ 跟着变回来。
2. 系统是深色时双击 ⌥ ⇒ 捕捉卡也是深色的。
3. Spool 设置 → 通用，「外观」下面多了一行「深浅」：跟随系统 / 浅色 / 深色，现在选的是「跟随系统」。点「浅色」，再把系统切到深色 ⇒ Spool 不变；点回「跟随系统」⇒ 马上变深。
4. 「外观」点「情人节」⇒ 不管系统深浅都是浅色，「深浅」那一行是灰的，写着情人节版只有浅色。点回「经典」。
5. 系统切回浅色，看一眼平时用的几页 ⇒ 和以前一模一样。
6. 左栏点「周回顾」⇒ 顶上一小块「活动」：一个大数字（这一周平均每天专注多久）、七根细柱（周一到周日）、几行这一周加了块的项目（每行三种颜色：捕捉的 / 自己写的 / AI 写回的）；有到期的项目的话还有一行。今天之前的日子没有柱子，写的是没有记录（因为今天才开始存）。
7. 今天那根柱子的数，和左栏时钟那一面写的「今天已专注 N 分钟」是同一个数。
8. 设置里关掉休息提醒，正常用二三十分钟 ⇒ 不弹休息；左栏那张卡只显示捕捉数；回到周回顾，今天的专注时间照样涨了。用完把休息提醒打开回来。
9. 界面切成英文，上面看到的新字看一眼 ⇒ 都是英文（Activity 等）。

Windows 那一半这次验不了，等发版二在 Windows 上装机时一起验（HANDOFF §9.3「发版二」那一行）。

你只要告诉我：这九条里哪几条不对，不对的那条你看到了什么。

## 7. 回执（执行窗填写）

每步一小段：

- 提交：`<hash> <标题>`
- 改了哪些文件（一行一个）
- 怎么验的：命令 + 结果（vitest / cargo 的条数，i18n-check 的输出原文）
- 施工时自己定的：深浅那个设置键叫什么、`<html>` 上那个属性叫什么、暖深色每个 token 的值和量出来的对比度、冷启动不闪用的什么办法、`focus.json` 新那一栏叫什么和长什么样、「活动」的尺寸和颜色、三段颜色在三种主题下的值、英文措辞。
- 还差什么、有没有偏离本任务书、新发现记在 HANDOFF 哪里

最后一段：换装（做了没有、装的是哪个 commit、`spctl` 结果、真库和两个 json 的备份文件名、装前装后的核对）、Ocean 验收（还没有就写「待验收」）。


### 7.1 开工

- 起点：`c25c4b5`（`docs: P9F 验收通过；P9B 开工`）。`c5f129b` 之后碰到 §2 点名文件的只有 P9F F8 删类名（`GeneralConfig.tsx`、`Sidebar/index.tsx`，`bg-accent-soft` 那几处），「现在」一栏照旧成立；左栏「周回顾」那道闸挪到了第 241 行。
- 测试基线（P9F 收尾之后）：tsc 干净；vitest 88 / 1028；cargo 192 · 5；sidecar 14；`(none missing)`；`--dead` 87；`cargo tree` 空。
- 真库和本机（10-14 只读）：v33；`settings.json` `theme` = classic、**`language` = zh**（任务书 10-10 记的是 en，现在是中文）、`blockFontSize` = medium、没有 `breakReminderEnabled`（= 开着）；`focus.json` 只有 `today`。

### 7.2 三步

**P9B-1 · `3f49053`** `feat(ui): 深浅色跟随系统 —— 一套暖深色、设置里「跟随系统 / 浅色 / 深色」、主窗和捕捉浮窗跟着变`
- 改了：`src/styles/tokens.css`（末尾新加两块：`--search-hit` 的 `:root`、暖深色 `:root[data-scheme='dark']:not([data-theme='valentine'])`）、`src/styles/global.css`（`.paper-bg` / `flash` 的深色一份）、`ScaleRail.tsx`、`SearchResultItem.tsx`（命中底色读 `--search-hit`）、新文件 `src/lib/colorScheme.ts`、`src/hooks/useColorScheme.ts`、`public/scheme-boot.js`、`index.html`（`<head>` 里加那个脚本）、`settingsStore.ts`、`GeneralConfig.tsx`、`App.tsx`、`overlay.rs`、`overlayProtocol.ts`、`CaptureOverlay.tsx`、`i18n/index.ts`；测试 `colorScheme.test.ts`、`overlayProtocol.test.ts`。
- 施工时定的：设置键 `colorScheme`（`system` / `light` / `dark`，默认 `system`，认不出的值当 `system`）；`<html>` 上的属性 `data-scheme`（`light` / `dark`，和 `data-theme` 各管各的）。冷启动不闪：设置读回来之前 hook 不动，第一帧由 `public/scheme-boot.js` 定 —— `<head>` 里一个同源的普通脚本（CSP `script-src 'self'` 不许内联、一个字没改），读 `localStorage` 的 `spool.schemeHint`（上一次应用的是什么，情人节记成 light），读不到就照系统。`tauri.conf.json` 和窗口 builder 没动。英文 Light or dark / Match system / Light / Dark。
- 暖深色每个 token 的值和对比度（对 `--paper` #1e1b17）：paper 30 27 23 · paper-2 40 36 30 · ink 240 233 218（14.19）· ink-2 204 195 177（9.81）· muted 138 129 113（4.46，浅色 3.42）· line 48 43 36（1.22，浅色 1.24）· line-strong 68 61 51（1.60，浅色 1.48）· accent 230 145 52（6.91，浅色 4.69）· accent-2 #f5b762（9.66）· status-active #96ac7a（6.93）· status-parked #d6925c（6.64）· status-done #968d7c（5.23）· urgent #e87a64（6.04）· urgent-strong #f39884（7.87）；底上压字：selection #4b3a17 上 ink 9.06 · highlight #7a5714 上 5.43 · accent-soft #3d2e14 上 10.86 · notice-warm 上 11.01 · search-hit 上 6.65；阴影换成黑色。`--accent-soft` 深色给了值（直接写 `var(--accent-soft)` 的那 4 处要用；那 27 处类 P9F 已经删了）。
- 验：构建出来的 main / overlay css 和 P9B 之前逐条比，只多了新加的规则；经典浅色的主窗、设置、周回顾三页同一份标记、前后两份 css 渲染，`compare-visual-snapshots.py` 门槛 0（`--pixel-delta 0 --max-changed-ratio 0 --max-channel-diff 0`）三页都是 0 个像素不同；深色、情人节（系统深色）、英文设置页、捕捉卡浅 / 深都截了图（`scratchpad/p9b/shots/`）。「跟着系统变」：在 WebKit 里把视图外观从浅切到深、从深切到浅，真组件 + 真 hook 的页面当场跟着变（底色 250 247 240 ⇄ 30 27 23）；只放 `scheme-boot.js` 的页面在深色外观下第一帧就是深色。
- 偏离任务书：**没用演示版真切系统深浅色**。这一窗没有「屏幕录制」权限，截不到别的进程的窗口（P9F 已记进记忆 §46），切了也看不见；而切系统外观会动整台电脑。用上面那个 WebKit 视图外观切换代替，真机这一条交给 Ocean 验收第 1 – 3 条。原生窗口在网页画出来之前那一下的底色同理没验到，放进验收单。Windows 没验过（同一份代码，本机编不了）。

**P9B-2 · `662a88f`** `feat(focus): 存每天的专注时间；关了休息提醒也照记`
- 改了：`src/lib/db/focusDay.ts`、`src/lib/breakReminder.ts`（`focusTick`）、`src/hooks/useBreakReminder.ts`、`src/stores/breakStore.ts`（多存 `dayKey`）、`App.tsx`（一句注释）、`docs/PRIVACY.md`、`site/privacy.html`、`scripts/site-zh-privacy.html`、`site/zh/privacy.html`（`build-site-zh.mjs` 生成）；测试 `focusDay.test.ts`、`breakReminder.test.ts`。
- `focus.json` 新那一栏叫 `days`，长这样：`{"today": {原来那三个数，样子没改}, "days": {"2026-10-14": 1966266, …}}`；只留 53 周（371 天）。
- 关了提醒也照记：计时器总在跑，每个 tick 走 `focusTick`（同一个 `tickBreakState`，提醒关着时 `remind` 永远 false）；提醒切换都 `keepDay`（这一坐清零、今天不动）；`isWorking` / `shouldRollDay` / `usePanelFace` 没碰。
- 隐私说明三处加一句，「最后更新」没改；没 push，官网不会动。
- 验：vitest（老文件接进历史、只留 53 周、翻篇后昨天的数还在、坏文件当空的、提醒关着连做两个半小时一次都不提醒且总数和开着时一样、关→开这一坐清零今天不动）。

**P9B-3 · `76c8d10`** `feat(review): 周回顾顶上的「活动」；周回顾入口一直显示`
- 改了：新文件 `src/components/ReviewBoard/ActivityPanel.tsx`、`src/lib/activity.ts`；`src/lib/db/blocks.ts`（`countBlocksByProjectSince`）、`ReviewBoard/index.tsx`、`Sidebar/index.tsx`、`tokens.css`（`--activity-*`）、`i18n/index.ts`、`focusDay.ts`（删掉 P9B-2 加的 `focusByDay`，被 `weekFocus` 取代）；测试 `activity.test.ts`、`blocks.test.ts`、`ReviewBoard/reviewEntry.test.tsx`。
- 「活动」的尺寸：一个卡片，宽跟着页面；大数字 48px（Geist 半粗，单位 16px）；七根柱子每根 14px 宽、区域 56px 高、4px 圆头、最低 1 小时当刻度顶（两分钟的一天不会画成一堵墙）；列表每行 8px 高的细条、三段之间 2px 空隙；整块在演示数据下约 350px 高。
- 颜色：柱子过去的日子 `--muted`、今天 `--accent`（三种主题自动跟着走）；三段用 dataviz 参考调色板前三格按顺序：捕捉的 `--activity-capture` #2a78d6（深色 #3987e5）、自己写的 `--activity-self` #eb6834（#d95926）、AI 写回的 `--activity-ai` #1baf7a（#199e70）；情人节用浅色那一套。校验脚本：浅色、情人节、深色三种底上明度、彩度、色盲相邻 ΔE（9.2 / 9.4）、正常视力 ΔE（27.6 / 26.5）全过；浅色下橙、青对纸不到 3 : 1 ⇒ 图例带每一种的总数、每行带总数（脚本要求的「看得见的数字」）。
- 英文措辞：Activity · Average focus per day · h / min · Today · no record · still to come · Captured / Written by you / Written back by AI · {n} more projects · No blocks added this week. · Due: · 「这一周」那颗悬停的说明全文。
- 真库副本上那条 SQL（`VACUUM INTO` 到 scratchpad，直接调产品里的 `countBlocksByProjectSince`(本周一零点 = 10-12 00:00)）：**0 个项目、0 块** —— 库里最新一块是 10-11（周日）的，这一周还没加过块（之后 Ocean 又加了 2 块：10-14 10:58，都在〈个人网站素材〉、都是自己写的 —— 换装之后打开「活动」，列表里应该是这一个项目、2 块橙色）。截图里用真数据的那一张（`a5-real.png`）也是「这一周还没有加过块」、今天 10 分钟、周一周二没有记录；另用演示数据截了浅色 / 深色 / 情人节 / 英文 / 没有引擎的整页 / 没有 CLI 的左栏（`scratchpad/p9b/pages/a1 – a7`）。
- 预期的副作用：只填了 DeepSeek、没装 CLI 的人，从此也能进这一页、用 DeepSeek 那个按钮。另一个副作用记成 `DISCOVERED-20261014-2`：装了 CLI 但「允许 AI 写入」关着的人，以前空列表会写一句「装了 Claude Code 或 Codex，并打开『允许 AI 写入』」，照任务书现在什么都不写了。

### 7.3 收尾的测试数字

tsc 干净；vitest 92 个文件 / 1056 条（开工 88 / 1028）；cargo 192 · 5；sidecar 14；`(none missing)`；`--dead` 87；`cargo tree … | grep` 空。

### 7.4 换装（Ocean 2026-10-14 答「现在换装」）

- 构建：在 `76c8d10` 上，代码树干净；命令和 P9F 一样（签名身份走环境变量、公证变量全 unset、日志进文件），「skipping app notarization」；TSA 一遍过；`--verify --deep --strict` 过。二进制里有 `overlay:scheme`；包里有 `scheme-boot.js`、`index.html` 加载它；css 里有深色那一块。新二进制 `--mcp` 连副本：24 个工具。
- 装前：Developer ID、`Unnotarized Developer ID`、`spool` sha256 `74c7c73e…`（P9F 那版）。真库 v33 · ok · 14 / 51 / 1101 / 13 · 正文 336130 · 批注 13558 · 文件正文 143894 · 图片 4 张 764139 字节 · 跟进 19 · 待审 0；快照 25 个；`focus.json` 只有 `today`（1966266）；`settings.json` 25 个键、没有 `colorScheme`。
- 停：GUI 27752、`--overlay` 27843 按 pid `kill -TERM`，第一次就退了；13 个 `--mcp` 一个没碰。
- 备份（桌面）：`spool.before-p9b-install-20261014-162641.db`（和活库逐项一致）、`focus.before-p9b-install-20261014-162641.json`、`settings.before-p9b-install-20261014-162641.json`。旧包挪到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261014-162641-pre-p9b.app`。
- 装后：sha256 `f8c62bff…` 和构建产物一致；主进程 49535、`--overlay` 49540 都是 16:26:52 – 53（换装之后）起的，txt inode 都是 80600771，就是新文件；`spctl` = `Unnotarized Developer ID`；stderr 只有 `[overlay] helper started` 和 `[double-tap] installed at HID/active`。真库逐项和装前一样（不迁移，快照仍是 25 个）。`focus.json`：`today` 原样（1966266），第一个 tick 之后多了 `"days": {"2026-10-14": 1966266}`。`settings.json`：没有新键；`railWidth` 从 410.39 变成 316 —— 那个键只在拖右栏把手时写（`App.tsx` 的 `onCommit`），16:27:11 写的，是装好之后在这台电脑上拖过一次，不是换装写的。
- 旧的 `--mcp` 子进程照常能用（库没变、MCP 没改），不用重启 AI 客户端。
- commit、build、换装分开记在上面；没 push，没发版。

### 7.5 新发现记在哪

HANDOFF §9.9：`DISCOVERED-20261014-1`（没有引擎时周回顾页顶上那一大块空着）、`-2`（装了 CLI 但「允许 AI 写入」关着的人，空列表不再提示那个开关）。

### 7.6 Ocean 验收

**2026-10-14 通过**（原话「验收完毕，其他都通过」）。§7.5 那两条新发现他给了做法（「所有界面保持统一……锁着的地方提示用户去打开，给一个快捷键，不需要返回设置」），并进 P9C —— HANDOFF §9.2 第 92 – 96 条。

## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 验收`（Ocean 验过后改成 `COMPLETE`），`git mv` 进 `docs/archive/product-taskbooks/`。
2. `docs/HANDOFF-2026-09-04.md`：
   - §9.3 路线图 P9B 那一行改成「已完成，任务书在 archive/product-taskbooks/…」；「发版二」那一行加上 Windows 要验深浅色那一句（P9B-1 第 7 条）；
   - §9.8「唯一下一步」写清楚：问 Ocean 换不换装 / 等验收；之后按 §9.3 是修补（如果还没做）→ 发版一（Mac）→ P10。
3. `docs/README.md` 入口表里 ACTIVE 产品任务书那一行跟着改（只暂存这一行）。
4. 这些文档改动单独一笔提交（同样只 add 自己改的路径）。
