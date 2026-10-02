# 产品任务书 P3 —— 捕捉浮窗：两种卡统一、长按卡 Enter 完成、每张卡能固定、长按带上刚复制的内容

> **状态：ACTIVE —— 当前唯一可执行的产品任务书。**
>
> **唯一交付：** 下面 §3 的四步（P3-1 – P3-4），按顺序做完、各自测试通过、各自一笔提交，并在 §7 写回执。
>
> **来历：** HANDOFF §9.3 路线图的 P3 段（Ocean 十条里的第 2 条，`DISCOVERED-20260930-2`）。P2 已于 2026-10-02 由 Ocean 验收通过
> （任务书在 `docs/archive/product-taskbooks/`）。Ocean 同日「验收通过，发布下一阶段」⇒ 按 HANDOFF §9.4 下发本段。
> 正文从 HANDOFF §9.5 **搬过来**（HANDOFF 那边只留一行「已下发到 …」），原来的四条「要做」拆成四步。
> **「现在」一栏每一条都对着 `e7ca5e9` 的代码重核过**；行号有挪动的已更正，原文没提到、这次核出来的三处标了「⚠️ 新补」。
>
> **授权来源：** Ocean 2026-09-30 指令「恢复 app 层面的修复与改善」+ 同日拍板（HANDOFF §9.2 第 4、5 条：长按带进来的复制内容**记来源**；
> 「固定窗口」**每张卡单独开**）；本任务书只引用、不改。
>
> **边界：** 只做这四步。不碰实验线（`TASKBOOK-STAGE0A-*`、Codex handoff、`~/Desktop/spool-research`、`docs/README.md` 里研究那几行）；
> 不动 `docs/EXECUTION_POLICY.md`；**不改库结构**；不加 MCP 工具；不改 pack；**双击手势本身的判定（250ms 双击窗、10 秒复制闸、HID tap 删事件）不动**；
> 不碰「主窗永不跳前」（记忆 `capture-note-first`）。不 push、不发版。换装给 Ocean 验收之前先问一句（§5）。

---

## 1. 开工先读（按顺序）

1. `docs/EXECUTION_POLICY.md` 全文（一个字不改）。
2. `docs/HANDOFF-2026-09-04.md`：首屏、§9.0–§9.4、§9.8–§9.9、§10.6。§10.6 里这几行和本段直接相关：
   `on_overlay_shown` 补注册全局 ⌘Z 那一支**不许删**；抬主窗只许 `AXFrontmost` 打自己的 pid；休息浮窗点卡片不许走 `on_overlay_hide`；
   捕捉暂停时 `on_event` 必须 `return true`。
3. `CLAUDE.md` §3（只改该改的）和 §5（提交信息里不许有任何工具署名）。
4. 上一份任务书的回执：`docs/archive/product-taskbooks/TASKBOOK-P2-MOVE-DEDUP-PACK-EXPORT-2026-10-02.md` §7（换装那一段，§5 照着走）。
5. 记忆：`capture-note-first`（**主窗永不跳前 > 直接打字**；三条不许回退的判断：点外面空框才算没写、批注框不许 onBlur 提交、焦点 show 时拿 hide 时还）、
   `double-tap-exclusivity`（HID tap 看不见合成事件 ⇒ 手势只能真手指验；浮窗本身可以喂 stdin 单独起）、`overlay-cannot-read-settings`（浮窗是独立进程、读不到设置）、
   `tauri-sync-commands-freeze-ui`（新 Tauri 命令一律 `(async)`；⛔ 碰 AppKit 的窗口命令除外）、`ui-language-follows-system`、`no-test-environment-spool`、
   `isolated-verify-workflow`（§5 换装才需要，尤其 §40–§41）、`file-deletion-needs-ocean`。
6. 设计稿（只读，不改）：`docs/archive/DESIGN_CAPTURE_NOTE_FIRST.md`、`docs/archive/DESIGN_CAPTURE_HELPER_PROCESS.md`。
7. 每一步开工前，读该步「现在」一栏点名的文件。

## 2. 起点

- 分支：本地 `main`。开工时 `git log -1` 应该是下发本任务书的那笔 docs 提交（标题以 `docs: 下发 P3` 开头），它的上一笔是 `e7ca5e9`；
  之后只多了 docs 提交也行。不是就停下来说明。
- ⚠️ 工作树里有**别人没提交的改动**（`docs/` 下研究线的文件、`docs/README.md` 里研究那几行）。**只 `git add` 你自己改的文件的路径**，
  绝不 `git add -A` / `git add .` / `git commit -a`。README 要改的话只暂存自己那一行（HEAD 版本只换那一行，`git hash-object -w` + `git update-index --cacheinfo`）。
- ⚠️ **删文件会被权限拦**：`git rm` 写给 Ocean，请他在输入框里用 `! git rm …` 跑，别绕路。`git mv` 能自己跑（记忆 `file-deletion-needs-ocean`）。
- 每步一笔提交，提交信息用中文、一行标题 + 可选正文。提交后跑 `CLAUDE.md` §5 那条自查；命中产品内容里的 claude 字样按记忆
  `attribution-grep-false-positive` 复核。
- 测试基线（`e7ca5e9` 上实测，开工前先跑一遍对一下，做完每步再跑）：

```bash
npx tsc -b                                                # 干净
npx vitest run                                            # 65 个文件 / 837 条全过
cargo test --manifest-path src-tauri/Cargo.toml           # 144 过 · 4 跳过
cargo test --manifest-path src-tauri/sidecar/Cargo.toml   # 14 过
node scripts/i18n-check.mjs                               # (none missing) —— 这一条也在 vitest 里
node scripts/i18n-check.mjs --dead                        # 87 条 DEAD（基线噪声），每步做完和开工时那份逐行 diff
```

Vitest 输出里有 31 行 `[db] pre-migration backup FAILED … window is not defined`，是老噪声，基线就有，不用管。

- ⚠️⚠️ **浮窗里的字 `i18n-check` 看不见**（⚠️ 新补，`DISCOVERED-20261002-2`）：它只认 `t('…')` / `ts('…')`，而 `CaptureOverlay.tsx` 里全是 `tr('…')`。
  这一段新加、改动的浮窗文案**每一条都要手动加进字典、手动核**。核法（`e7ca5e9` 上是 20 条、缺 0 条）：

```bash
node -e "const fs=require('fs');const d=fs.readFileSync('src/lib/i18n/index.ts','utf8');const s=fs.readFileSync('src/overlay/CaptureOverlay.tsx','utf8');const re=/\btr\(\s*(['\"])((?:(?!\1)[^\\\\]|\\\\.)*)\1/g;let m,n=0,miss=[];while((m=re.exec(s))){if(/[一-鿿]/.test(m[2])){n++;if(!d.includes(\"'\"+m[2]+\"'\")&&!d.includes('\"'+m[2]+'\"'))miss.push(m[2])}}console.log(n,'tr() literals, missing:',miss)"
```

## 3. 四步

### 原文（`DISCOVERED-20260930-2`，搬过来的，不改）

- 路线：P · 小功能 + 一致性 · P1（每天用）· 状态：approved
- 来源：「长按 option 需要可以选择进入的项目，长按 option 和双击 option 需要可以把捕捉窗口长期固定，以此额外做一些操作：
  比如重新复制新内容，粘贴到注释中，然后回车可以直接完成输入而不是换行（另外长按 option 没有取消，撤回键，所有捕捉窗口需要一致）。
  再新加一个交互逻辑，如果用户在长按住 option 之前的两秒钟之内使用过 cmd c，则被复制的内容会自动存进文本框。」
- 不做：双击手势本身的判定（250ms、10 秒复制闸）不动；不碰「主窗永不跳前」（记忆 `capture-note-first`）。
- 工程注意：浮窗是独立进程，**不开 SQLite**；固定时同时关掉「点外面收起」和 8 秒计时；从别的 app 回来点卡片，键盘要进卡片、
  主窗不跳前。**只能真手指验**（HID tap 看不见合成事件）。
- Windows 上没有长按手势 ⇒ 长按那几条只在 macOS 上成立。

### 现在（`e7ca5e9`，对着代码重核过）

- 卡片全在 `src/overlay/CaptureOverlay.tsx`（1016 行），`noteMode`（长按那一路）由 `toast.noteMode` 判（`:740` `isNote`）。
  - 双击 ⌥ 的卡：复制的内容 + 批注框（Enter 保存，Shift+Enter 换行）；**「完成」按钮在批注框下面**（`:944`），不在底栏；
    右上角「置顶」图钉（`Pin` 图标，管的是**这一块**的 pinned）和 ×；底栏：撤销（`RotateCcw`）、改投（`Forward`，下拉列项目）。
  - 长按 ⌥ 的卡：正文框 **Enter 换行、⌘↵ 保存**（`onKeyDown` 在 `:838` 一带，placeholder `:856`「写点什么…（⌘↵ 保存，Esc 放弃）」）；**底栏整条不画**（`:959` `{!isNote && (`）。
    这时候块还不存在（`blockId: ''`），保存时才由浮窗 `createBlock`（`flushPendingNote` 开头那一支，`:198`），`source: null`。
  - 自己走：`TOAST_AUTO_DISMISS_MS = 8000`（`:51`），只在**两个框都空**、鼠标不在卡上、下拉没开时计时（`:452` 那个 effect）。
  - 点外面收起：**在主进程**。`capture.rs` show 时 `double_tap::arm_overlay_dismiss(…)` 布防（`:1389`；`:1537` 那一处是撤销确认卡 `show_undo_overlay` 的，不是捕捉卡，固定不涉及它），主进程的 CGEventTap 看到框外的鼠标按下
    就发 `OVERLAY_DISMISS_EVENT`，浮窗收到后 `flushPendingNote()` + `leaveCard()`（`:524`）。没有「固定」。
  - 新捕捉顶掉旧卡：`OVERLAY_SHOW_EVENT` 里先 `flushPendingNote()` 再换内容，`setPinned(false)` 等全部复位（`:315`）。
- 浮窗写库**不开 SQLite**：`src/overlay/db.ts` 每一个调用都是请主窗代办（`OVERLAY_DB_REQUEST_COMMAND` → 主窗 → `overlay_db_reply`）。
  浮窗 → 主进程的消息走 helper 的 stdout，一行一个 JSON（`src-tauri/src/overlay.rs` 头注释「Wire protocol」）；`hide_capture_overlay`、`resize_capture_overlay` 是现成的样子。
- 长按：`src-tauri/src/double_tap.rs`，一次干净的 ⌥ 按下起一个 `LONG_PRESS_MS = 450` 的定时线程（`:505` 一带），到点发 `note_trigger`
  → `emit("note-trigger", ())`（`:336`，**没有 payload**）。前端 `src/hooks/useCapture.ts` 的 `note-trigger` 监听（`:374` 一带）**不读剪贴板**、
  `source: null`、`prevSourceApp` 取前台 app（`readForegroundApp()`，只等 hot-path 那一小段）。
- 最近一次 ⌘C / ⌘X 的时刻 Rust 已经在记：`LAST_COPY_CHORD_NS`（`double_tap.rs:133`，`:433` 写入，`:545` 复制闸在读）。
  ⚠️ 它只在**输入监听**授权在的时候才更新得了（没授权 tap 看不见 keyDown）—— 没授权 ⇒ 「2 秒内按过 ⌘C」永远不成立 ⇒ 照旧空框，不会坏。
- 双击那一路的来源：主窗 `readForegroundApp()` 得到 `{ app, source }`，块先存、`source` 由 `updateBlockSource` **事后回填**（`useCapture.ts` 双击那一支）。
- Windows：`double_tap_win.rs` 里没有长按，`note-trigger` 只有 macOS 发。点外面收起也是 macOS 才有（`capture.rs` `#[cfg(not(target_os = "macos"))]` 那一句）。
- ⚠️ 新补 ①：**全局 ⌘Z**。`capture.rs` 在卡片**拿不到前台**的时候注册全局 ⌘Z（`show_capture_overlay` 里 `if !will_activate`；`on_overlay_shown` 里
  `AXFrontmost` 被拒时补注册 —— 这一支是 §10.6 红线，不许删；Windows 上 `!focused` 时同理），卡片收起时撤掉。今天卡片顶多挂几十秒；
  **固定以后它可以挂一整天** ⇒ 那段时间里用户在别的 app 按 ⌘Z 撤销打字，会被 Spool 截走、撤掉的是这次捕捉。
- ⚠️ 新补 ②：**休息提醒**。到点的休息卡会**等**正在写的捕捉卡走完再上（`pendingBreakRef`，Ocean 08-25「休息弹窗会强制关闭我正在写批注的捕捉弹窗」）。
  固定的卡不走 ⇒ 休息卡会一直等。
- ⚠️ 新补 ③：浮窗文案 `i18n-check` 看不见（见 §2）。

### P3-1 · 长按卡的正文框：Enter = 完成保存，Shift+Enter 换行（原「要做」第 2 条）

- 要做：长按卡正文框改成和批注框一样 —— **Enter 完成保存，Shift+Enter 换行**；输入法组字时的 Enter 照旧只确认组字（`isImeComposing` 那一套）。
  placeholder 中英一起改（例「写点什么…（Enter 保存，Shift+Enter 换行，Esc 放弃）」，字太长就删到放得下，Ocean 嫌字多）。
- 不做：批注框的行为不动；⌘↵ 留不留施工时定（留着无害），写进回执。
- 验收：① 长按 ⌥，打一句，Enter ⇒ 存进去、卡片关掉；② Shift+Enter ⇒ 换行不保存；③ 中文输入法组字时按 Enter 只上屏、不保存。

### P3-2 · 两种卡同一套布局，长按卡也能改投项目（原「要做」第 1 条）

- 要做：
  1. 两种卡**按钮位置和名字一样**：右上角「置顶这一块」/（P3-3 加的）「固定窗口」/ ×；底栏：撤销（双击卡）或**放弃**（长按卡，= 今天 Esc 那条路）、改投项目、**完成**。
     「完成」从批注框下面挪进底栏，两种卡同一个位置。
  2. 长按卡底栏画出来。长按卡的「改投」= **保存之前换目标项目**：只换卡片上记着的目标（标题跟着换），⛔ 不建块、不删块；
     双击卡的「改投」照旧（块已经存在，挪过去）。项目列表照旧只列没完成的。
  3. 长按卡的「置顶这一块」：块还没建出来，置顶是记下来、保存时一起写（今天 `pendingBodyRef` 里已经有 `pinned`）—— 核一下现在点它是不是真的生效。
- 不做：撤销 / 改投的底层动作不变；卡片宽度（`OVERLAY_WIDTH`）不变。
- 验收：③ 长按卡底栏换一个项目再保存 ⇒ 块在换过的那个项目里，原来的捕捉目标没变；⑤ 两种卡并排看，按钮位置和名字一样（长按卡是「放弃」、双击卡是「撤销」）。

### P3-3 · 每张卡能单独固定（原「要做」第 3 条）

- 要做：
  1. 右上角加「固定窗口」开关，**每张卡单独开**（Ocean 09-30），下一张卡默认不固定。图标**不能和「置顶这一块」的图钉撞**（那个是 `Pin`）。
  2. 固定着的时候：**不自己消失**（8 秒计时停掉，不管框里有没有字）、**点外面也不收起**（主进程那边撤防 `disarm_overlay_dismiss`，取消固定再布防 ——
     浮窗进程告诉主进程走现成的 stdout 那条线，照 `resize_capture_overlay` 的样子加一条消息）；只有「完成」/ Esc / × 才走。
  3. 固定着的时候又双击 ⌥ 捕捉了一次 ⇒ 照今天：先存下这张卡上写的，再换成新捕捉（新卡不固定）。又长按 ⌥ 同理。
  4. ⚠️ **全局 ⌘Z（新补 ①）**：固定期间**不许一直占着全局 ⌘Z**。建议：一固定就撤掉全局 ⌘Z（卡片上的撤销按钮照样能用），取消固定时
     如果卡片仍然拿不到前台再按今天的规则注册回来。⛔ `on_overlay_shown` 里那一支不许删（§10.6）—— 改的是「固定时撤掉」，不是「不再注册」。
     做不到这样、或者发现别的路更好，停下来问。
  5. ⚠️ **休息提醒（新补 ②）**：建议照今天的规矩**照等**（不打断正在写的人），固定的卡走了休息卡再上；写进回执。Ocean 想要别的说法以他为准。
  6. 从别的 app 回来点这张卡：键盘要进卡片里被点的那个框；**主窗不跳前**（浮窗是独立进程，激活它不带主窗 —— 照现在的路走，别引入 `set_focus` / 按名字 activate）。
- 不做：固定状态不存设置、不记住（每张卡单独开）；Windows 上没有「点外面收起」，固定在那边只管 8 秒计时那一半。
- 验收：④ 双击 ⌥ 捕捉一次，点「固定」，去别的 app 点几下、复制一句 ⇒ 卡片还在；回来点批注框，⌘V、Enter ⇒ 存进去、卡片关掉；全程主窗没跳前；
  固定着的时候在别的 app 里按 ⌘Z 撤销打字 ⇒ 撤的是那个 app 里的字，不是这次捕捉。

### P3-4 · 长按前 2 秒内按过 ⌘C ⇒ 刚复制的字自动填进正文框，并记来源（原「要做」第 4 条）

- 要做：
  1. Rust 判「这一下长按之前 2 秒内按过 ⌘C / ⌘X」：拿 `LAST_COPY_CHORD_NS` 和**这一下 ⌥ 按下的时刻**比（⛔ 不是长按到点的时刻 —— 原话是「长按住 option 之前的两秒钟之内」），
     结果随 `note-trigger` 带过去（今天它没有 payload）。2 秒写成一个常量，和 `COPY_GATE_WINDOW_MS` 放在一起；⛔ 复制闸那 10 秒不动。
  2. 成立 ⇒ 主窗读剪贴板（和双击同一个 `readClipboardWithRetry`），把字填进长按卡的正文框，**并且像捕捉一样记来源**（前台 app / 网址，
     和双击同一套 `readForegroundApp()`；Ocean 09-30 第 4 条：记）。来源要在浮窗保存那一刻已经到手 —— 双击那一路是先存后补，这一路块是浮窗存的，
     施工时定是随 payload 带过去还是存完由主窗回填，写进回执。
  3. 用户把正文**全删了**自己重写 ⇒ 来源随之清空（那就是自己写的）。这条是施工细节，Ocean 可改。
  4. 超过 2 秒、或者剪贴板是空的 ⇒ 照旧空框、来源留空。
- 不做：双击那一路不动；不读图片（那是 P7）。
- 工程护栏：判「2 秒」只在 Rust 里判一次，⛔ 前端不另算时间；纯判断写成可单测的函数（例 `copied_within(copy_ns, press_ns, window_ms)`），
  「全删了就清来源」也写成纯函数测掉。
- 验收：① 浏览器里 ⌘C 一段字，1 秒内长按 ⌥ ⇒ 正文框里已是那段字，Enter 就存进去，块上有来源；② 不复制直接长按 ⇒ 正文空、存进去没有来源；
  把带进来的字全删了重写再存 ⇒ 没有来源。

## 4. 什么时候停下来问

- 起点不是 §2 写的那样；
- 某步做下去要改库结构、加 MCP 工具、改 pack、改双击手势的判定、让浮窗开 SQLite、或者让主窗跳前 —— 都不该需要，需要了就说明任务书漏算了什么；
- 发现和「现在」一栏对不上的现状（代码已经变了）；
- 要删文件（请 Ocean 跑，见 §2）；
- P3-3 第 4 条（全局 ⌘Z）照建议做不到，或者有更好的路；
- 发现新问题：**不顺手修**，按 HANDOFF §8 的 DISCOVERED 格式记进 HANDOFF §9.9，继续做本任务。

## 5. 做完四步之后：换装给 Ocean 验收（先问）

- 四步都提交、全部测试通过之后，**先问 Ocean「现在换装吗」**，得到同意再做。
- 照 P2 回执「换装」那一段（每一步都写了命令和核对项），要点：
  - 先看现装的签名（现在是 Developer ID ⇒ 构建时 `APPLE_SIGNING_IDENTITY` 走环境变量，不改 `tauri.conf.json`，公证变量全部 unset）；
  - 构建日志重定向到文件；TSA 偶发失败（`A timestamp was expected but was not found`）就整个重跑；
  - 停 GUI 和 `--overlay` **按 pid**，杀完再查一遍还在不在（记忆 `isolated-verify-workflow` §40–§41）；`--mcp` 一个都不碰；
  - 换装前 `VACUUM INTO` 备份真库到桌面（文件名带日期）；旧包 `mv` 进 `~/Desktop/Spool/spool-pre-install/`，别删；
  - 换装后核：sha256 和构建产物一致、进程启动时间在换装之后、stderr 有 `[double-tap] installed at HID/active`、真库版本和计数前后一致。
  - ⚠️ 这一段改的是浮窗进程：`--overlay` 也要确认是换装之后起的那一个。
- 这一批不改库结构，真库不会迁移。commit、build、换装分开记在回执里；**不 push、不发版**。
- **这一段只能真手指验**（HID tap 看不见合成事件）：换装后不要试着用脚本按 ⌥，直接把 §6 交给 Ocean。

## 6. 给 Ocean 的验收单（大白话，换装后给 Ocean）

1. 在浏览器里选一段字按 ⌘C，1 秒内长按 ⌥ ⇒ 弹出来的卡片正文框里已经是那段字；直接按 Enter ⇒ 存进去、卡片关掉；去 Spool 里看这一块，上面有来源（浏览器 / 网址）。
2. 不复制，直接长按 ⌥ ⇒ 正文框是空的；打一句，Shift+Enter 能换行，Enter 存进去。
3. 长按 ⌥，在卡片底栏换一个项目，写一句存进去 ⇒ 这一块在你换过的那个项目里。
4. 双击 ⌥ 捕捉一次，点卡片右上角的「固定」，去别的 app 点几下、复制一句话 ⇒ 卡片一直在；在那个 app 里按 ⌘Z ⇒ 撤的是那个 app 里的字。
   回来点批注框，⌘V、Enter ⇒ 存进去、卡片关掉。整个过程 Spool 主窗口没有跳到最前面。
5. 把长按的卡和双击的卡对比着看 ⇒ 按钮位置和名字一样（长按卡左下是「放弃」，双击卡是「撤销」）。
6. 界面切成英文，把第 1–5 条看到的新字看一眼 ⇒ 都是英文。

你只要告诉我：这六条里哪几条不对，不对的那条你看到了什么。

## 7. 回执（执行窗填写）

每步一小段：

- 提交：`<hash> <标题>`
- 改了哪些文件（一行一个）
- 怎么验的：命令 + 结果（vitest / cargo 的条数，i18n-check 的输出原文，§2 那条浮窗文案核对的输出）
- 施工时自己定的（P3-1 placeholder 和 ⌘↵ 留不留；P3-3 用了什么图标、全局 ⌘Z 和休息提醒最后怎么处理；P3-4 来源怎么带过去、「全删了」怎么判）
- 还差什么、有没有偏离本任务书、新发现记在 HANDOFF 哪里

最后一段：换装（做了没有、装的是哪个 commit、`spctl` 结果、真库备份文件名）、Ocean 验收（还没有就写「待验收」）。

## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 验收`（Ocean 验过后改成 `COMPLETE`），`git mv` 进 `docs/archive/product-taskbooks/`。
2. `docs/HANDOFF-2026-09-04.md`：§9.3 路线图 P3 那一行改成「已完成，任务书在 archive/product-taskbooks/…」；
   §9.8「唯一下一步」改成「按 §9.4 下发 P4」；`docs/README.md` 入口表里 ACTIVE 产品任务书那一行改成「暂无，待下发 P4」（README 只暂存这一行）。
3. 这些文档改动单独一笔提交（同样只 add 自己改的路径）。
