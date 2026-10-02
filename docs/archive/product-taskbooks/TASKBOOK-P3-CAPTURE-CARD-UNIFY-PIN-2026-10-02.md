# 产品任务书 P3 —— 捕捉浮窗：两种卡统一、长按卡 Enter 完成、每张卡能固定、长按带上刚复制的内容

> **状态：COMPLETE。**（2026-10-02：P3-1 – P3-4 已提交、已换装，第一轮反馈三条已改并换装；**Ocean 同日验收通过**。回执在 §7。）
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

### 回执（执行窗 2026-10-02 填）

**开工**：`git log -1` = `f90056e`（上一笔 `e7ca5e9`），符合 §2。基线：`tsc -b` 干净；Vitest 65 文件 / **838**（⚠️ §2 写的 837 是笔误或数错了 ——
`e7ca5e9` 上实跑就是 838，后面每步都以 838 为起点比）；主 crate 144 过 · 4 跳过；sidecar 14；`i18n-check` → `(none missing)`；`--dead` 87 条。
之后每步做完都跑全套，`--dead` 每次和基线**逐行** `diff`（无输出），§2 那条浮窗文案核对每步都跑。

**界面怎么看的**：浮窗的样子没法写自动测试（仓库没有 DOM 测试环境），P3-2 / P3-3 / P3-4 各截了一次图：debug 构建 + Vite，把 `spool --overlay` **单独**起来
（它不开库、不走单实例；单独起时没有主进程替它抢前台），从 stdin 喂一张卡，按窗口 id `screencapture -l` 截，截完 `hide-now`、杀掉。卡在屏幕左上角露了约两秒。
⚠️ 截的都是「没固定、没点过」的样子；点击、键盘、手势一样都没用脚本试（正式版只能真手指，见 §5）。

**P3-1 · 长按卡正文框 Enter 完成**
- 提交：`efc7bab feat(capture): 长按 ⌥ 那张卡的正文框改成 Enter 保存、Shift+Enter 换行 —— 和批注框一样；输入法组字时的 Enter 照旧只上屏`
- 文件：
  - `src/overlay/CaptureOverlay.tsx`（正文框 `onKeyDown`：Enter 且没按 Shift ⇒ `finishNote()`；placeholder）
  - `src/lib/i18n/index.ts`（placeholder 那一条原地换掉，旧键只有这一处用，没留孤儿）
- 验：`tsc -b` 干净；Vitest 65 / 838；主 crate 144 · 4；sidecar 14；`(none missing)`；`--dead` 与基线相同；浮窗文案 `20 tr() literals, missing: []`。
- 施工时自己定的：
  - placeholder 用了任务书的例句原样：「写点什么…（Enter 保存，Shift+Enter 换行，Esc 放弃）」，英文 `Write something… (Enter saves, Shift+Enter for a new line, Esc discards)`。
    三行高的框放得下（截图：P3-3 把框收窄之后正好断成「…Shift+Enter / 换行，Esc 放弃）」两行；收窄之前「换 / 行」被拆在两行，是 P3-3 之后才顺的）。
  - **⌘↵ 留着**：它落在「Enter 且没按 Shift」那一支里，照旧是保存，没单独写。
  - 输入法：`isImeComposing` 那一句仍在最前面，组字时的 Enter 只上屏。
- 偏离：无。批注框没动。

**P3-2 · 两种卡同一套布局，长按卡也能改投**
- 提交：`497a5e8 feat(capture): 两种捕捉卡同一套布局 —— 底栏左边撤销（双击卡）/ 放弃（长按卡）、改投、右边完成；长按卡也能改投项目、置顶真的生效`
- 文件：`src/overlay/CaptureOverlay.tsx`、`src/lib/i18n/index.ts`（+4：「置顶这一块」「取消置顶这一块」「放弃」「放弃这一条 · Esc」）
- 验：`tsc -b` 干净；Vitest 65 / 838；主 crate 144 · 4（在 `497a5e8` 上跑）；sidecar 14；`(none missing)`；`--dead` 与基线相同；浮窗文案 `24 … missing: []`。
  截图：两张卡底栏同一个位置 —— 左「撤销」/「放弃」、「改投」、最右「完成」；右上角图钉 + ×。
- **「置顶」核查的结果：原来不完全生效。** 长按卡上点图钉走的是 `togglePin('')`（库里一行都不改，图标照样变亮），而存下去的 `pinned` 只在正文框打字时才刷新 ⇒
  **打完字再点图钉（或取消），存进去的还是点之前的值**。改成：长按卡上点图钉只记在卡片上，保存时随 `createBlock` 一起写；双击卡照旧直接写库。
- 施工时自己定的：
  - 底栏按钮从「只有图标」改成「图标 + 两个字」—— 验收是「并排看名字一样」，只有图标的话名字要悬停才看得见。「放弃」的图标用垃圾桶（`Trash2`），「撤销」「改投」图标没换。
  - 右上角图钉的名字改成「置顶这一块 / 取消置顶这一块」（任务书里的叫法；P3-3 加了「固定窗口」之后，光写「置顶」容易和它混）。
  - 长按卡「改投」：只改卡片上的目标（标题跟着换，工作区名 / 项目名的兜底和 `useCapture` 一样：「收件箱」「未命名」），⛔ 不建块、不删块、不动当前捕捉项目；选完把光标还回正文框，接着 Enter 就能存。
  - 「放弃」= 今天 Esc 那条路（`cancelNote`）。
- 偏离：无。撤销 / 改投的底层动作、卡片宽度都没动。

**P3-3 · 每张卡能单独固定**
- 提交：`7b34f76 feat(capture): 每张捕捉卡能单独「固定窗口」—— 固定着不自己消失、点外面也不收起，并把全局 ⌘Z 还给别的 app`
- 文件：
  - `src-tauri/src/double_tap.rs`（`OVERLAY_DISMISS_HELD` + `hold_overlay_dismiss`；`arm_overlay_dismiss` 每次清掉；点外面时固定着就不收起，只 `forget_restore_focus()`）
  - `src-tauri/src/capture.rs`（`CARD_CLAIMS_UNDO`：这张卡是不是替它占了全局 ⌘Z；新 `on_overlay_fixed`）
  - `src-tauri/src/overlay.rs`（浮窗命令 `set_capture_card_fixed`，`(async)`，照 `resize_capture_overlay` 的样子发一行 `{"t":"fixed","on":…}`；主进程收 `"fixed"`）
  - `src/lib/capture/overlayProtocol.ts`（`FIX_CARD_COMMAND`）、`src/lib/capture/overlayProtocol.test.ts`（+1 守卫）
  - `src/overlay/CaptureOverlay.tsx`（`fixed` 状态、右上角开关、8 秒计时跳过、正文那一格右边留白 56 → 72px 给第三个按钮）、`src/lib/i18n/index.ts`（+3）
- 验：`tsc -b` 干净；Vitest 65 / 839（+1：浮窗进程的命令表里有 `set_capture_card_fixed`、主进程认 `"fixed"`。**反向试过**：把它从命令表删掉 ⇒ 这条红，放回 ⇒ 绿。
  它守的是「开关只是卡片上变个颜色，主进程没听见 ⇒ 看着固定了、点外面照样收起」，那种情况别的测试全绿）；主 crate 144 · 4；sidecar 14；`(none missing)`；`--dead` 与基线相同；
  浮窗文案 `28 … missing: []`。截图：锁在图钉和 × 中间，没压到正文。
- 施工时自己定的：
  - **图标**：锁（`Lock`）。没固定是灰的，固定着是强调色（和图钉同一种表示法）。名字「固定窗口」；悬停「固定窗口：不会自己消失，点外面也不收起」/「取消固定窗口」。
  - **点外面收起**：⚠️ 和任务书写法不一样，效果一样 —— 任务书写的是「撤防 `disarm_overlay_dismiss`，取消固定再布防」，我做成**暂停**：框照旧跟着高度变化更新，取消固定立刻接着生效。
    原因：撤防会把框扔掉，再布防时主进程手里没有卡片现在的框（拖动过的更没有）。拖动过的卡照旧不再布防（和今天一样）；每张新卡布防时清零。
  - **全局 ⌘Z**：照建议做 —— 一固定就撤掉；取消固定时，只有「这张卡本来就拿不到前台、是替它占的」（`show_capture_overlay` 里 `!will_activate`、`on_overlay_shown` 里 `AXFrontmost` 被拒、
    Windows 上没拿到前台）才注册回去。`on_overlay_shown` 那一支没删，只在它注册之前多记一个标记。卡片上的「撤销」按钮固定着照样能用。
  - **休息提醒**：照建议「照等」，没改代码 —— 固定的卡走了休息卡再上（`capturingRef` 本来就只看「屏幕上是不是捕捉卡」）。
  - **多做的一处**（同一个理由，不做的话验收 ④ 会别扭）：固定着点到别的 app 时，忘掉「捕捉那一刻的来源 app」。不忘的话：在 Chrome 捕捉 → 固定 → 去备忘录复制 → 回来 ⌘V、Enter ⇒
    前台被拽回 Chrome，而不是人刚才在用的备忘录。今天「点外面收起」时本来就忘掉它（`overlay_dismiss` 那一句），这里是同一条规矩。
  - 从别的 app 回来点卡：没改代码，走的就是今天「点一下批注框」那条路（激活的是浮窗进程，不带主窗）；没有引入 `set_focus` / 按名字 activate。
  - Windows：固定只管 8 秒计时和全局 ⌘Z（那边没有「点外面收起」）。
- 偏离：上面「暂停 vs 撤防」那一处。

**P3-4 · 长按前 2 秒内 ⌘C ⇒ 填进正文框并记来源**
- 提交：`ec8e94a feat(capture): 长按 ⌥ 之前 2 秒内按过 ⌘C ⇒ 刚复制的字自动填进正文框，存下去带来源`
- 文件：
  - `src-tauri/src/double_tap.rs`（`LONG_PRESS_COPY_WINDOW_MS = 2_000`，紧挨 `COPY_GATE_WINDOW_MS`；纯函数 `copied_within` + 1 条测试；按下那一刻判一次，结果随 `note-trigger` 带走：`{"copied": bool}`）
  - `src-tauri/src/capture.rs`（`OverlayCapturePayload.copy_id` —— 这个结构体是收进来再原样发给浮窗的，不声明就会被丢掉）
  - `src/lib/capture/overlayProtocol.ts`（卡片 `copyId?`；`note-created` 带 `copyId?`）
  - `src/lib/capture/noteCopy.ts` + `noteCopy.test.ts`（新：纯函数 `copyIdAfterEdit` + 4 条测试）
  - `src/hooks/useCapture.ts`（长按：2 秒内有 ⌘C 才读剪贴板；查来源挪到最前面开始；按卡片的号记着来源；`note-created` 带号回来时回填）
  - `src/overlay/CaptureOverlay.tsx`（show 时正文框填好、同时记进 ref —— 一个字不改直接 Enter / 点外面也存得下去；正文改动时过 `copyIdAfterEdit`）
- 验：`tsc -b` 干净；Vitest 66 / 843（+4：留一点字 ⇒ 号还在；清空 / 只剩空白 ⇒ 没了；清空之后再打字 ⇒ 不回来；本来就没填 ⇒ 没有）；
  主 crate 145 · 4（+1 `a_copy_counts_only_within_two_seconds_before_the_press`：从没复制过 / 1 秒前 / 正好 2000ms / 2001ms / 按下之后才复制）；sidecar 14；`(none missing)`；
  `--dead` 与基线相同；浮窗文案 `28 … missing: []`。截图：正文框里已是那段字。
- 施工时自己定的：
  - **来源怎么带过去：存完由主窗回填**（和双击那一路「先存后补」同一个样子）。长按一到点，主窗**马上**开始查来源（和双击同一个 `readForegroundApp()`），按这张卡的号记着；
    浮窗存的时候正文还是复制来的 ⇒ `note-created` 把号带回来 ⇒ 主窗 `updateBlockSource`。
    没选「随 payload 带过去」：浏览器的来源要连跑两次 osascript，最长 2.2 秒，随 payload 带就得让卡片晚出来那么久。
    按号记、不按「最近那一次」记：第二次长按可能抢在第一张卡存完之前到，按号才不会把第二次的来源回填到第一块上。记着的号最多留 8 个（放弃掉的卡不会回来取）。
  - **「全删了」怎么判**：正文去掉首尾空白后是空的，就算全删了；删空过一次之后再打字也不带来源。改一部分、加几句不算，来源留着。
  - 「来源」是什么：和双击同一套 —— 浏览器是当前标签页的**标题**，别的 app 是 app 名。⚠️ 任务书写「前台 app / 网址」，现有那一套给的不是网址，这次没改它。
  - 长按卡上**不显示**来源那一行（双击卡回填后会显示）。任务书没要求；要的话是小改。
  - 剪贴板只在 Rust 说「2 秒内有 ⌘C」时才读；读出来是空的 ⇒ 空框、没有号、来源留空。⛔ 复制闸的 10 秒没动；前端没有另算时间。
- 没覆盖到的：「填好 → 存 → 回填」这一整条跨两个进程，没有端到端的自动测试，靠 §6 第 1 条手指验。
- Windows：没有长按，这一条只在 macOS 成立。

**Windows 编译**：本机 `cargo check --target x86_64-pc-windows-msvc` 跑不完（`libsqlite3-sys` 要 Windows SDK 的 C 头文件，本机没有），P3-3 / P3-4 的 Windows 分支是逐行看过的：
新加的原子量都写全路径（`Ordering` 在这个文件里只在 macOS 下 import），`#[cfg]` 加在语句上的写法和旁边已有的一样。

**新发现**：HANDOFF §9.9 新增三条（默认 captured，都没修）：
`DISCOVERED-20261002-3`（长按卡上 ⌘Z 撤的是别的操作）、`-4`（× 在两种卡上都是「存下」，提示却写「关闭 (Esc)」，而 Esc 是放弃）、
`-5`（失败提示卡顶掉捕捉卡时，没写完的批注 / 正文要等下一次捕捉才存进去）。

**换装（Ocean 10-02 在「现在换装吗」上选了「现在换装」）**
- 构建：`ec8e94a`（`src` / `src-tauri` 没有未提交改动，工作区只有 docs），`env -u APPLE_ID -u APPLE_PASSWORD -u APPLE_TEAM_ID -u APPLE_API_KEY -u APPLE_API_ISSUER -u APPLE_API_KEY_PATH
  APPLE_SIGNING_IDENTITY="Developer ID Application: Hanze JIN (Q5Y5JRXZ58)" npm run tauri build -- --bundles app`，日志进文件；没改 `tauri.conf.json`，日志里是「skipping app notarization」。
  TSA 第一遍就过（主程序 `Timestamp=Oct 2, 2026 at 17:17:16`，sidecar `spool-ai` 17:17:15），日志里没有 `timestamp was expected`；`--verify --deep --strict` 过，identifier `com.oceanjin.spool`。
- 装前：`codesign` = Developer ID、`spctl` = `Unnotarized Developer ID`、0.6.2、`spool` sha256 `ac596bf2…56bf411a4`（就是 P2 那一版）；真库 v29（代码也是 29，不迁移）。
- 停：GUI pid 77333 + `--overlay` pid 77342 按 pid `kill -TERM`，第一遍就都退了、再查已不在；`--mcp` 子进程一个没碰（前后数一样）。
- 真库备份：`~/Desktop/spool.before-p3-install-20261002-171755.db`（`VACUUM INTO`，integrity ok，v29，计数和活库一致）。
- 旧包：`mv` 到 `~/Desktop/Spool/spool-pre-install/Spool-old-20261002-171800-pre-p3.app`；新包 `ditto` 进 `/Applications`；`open --stdout … --stderr … /Applications/Spool.app` 起。
- 装后：`--verify --deep --strict` 过、Developer ID、`spctl` = `Unnotarized Developer ID`、identifier `com.oceanjin.spool`、0.6.2；`/Applications` 里 `spool` 的 sha256
  `74a0db9e…dea21b189` 和构建产物一致；主进程 65620、`--overlay` 65677 都起于 17:18:10（换装之后），两个的 `lsof` txt inode 都是 75287650 = 新文件；
  stderr `[double-tap] installed at HID/active`（两个授权都在）、`[overlay] helper started`，没有 error / panic；
  真库 v29 · 25 / 63 / 1013 / 1（工作区 / 项目 / 块 / 附件，含软删）· 正文总长 291894 · 捕捉目标没变，前后一致，没有新的迁移快照。
  手势和卡片都没用脚本试（HID tap 看不见合成事件），界面留给 Ocean 按 §6 真手指验。
- 没 push、没发版。

**Ocean 验收**：待验收（§6 六条）。

**Ocean 验收反馈第一轮（2026-10-02）与修改**
- 原话：「1. …功能没问题，但是如果复制后的内容已经被存了，或者说被 discard 了之后就不应该出现在第二次的操作中，也就是说这个快捷方式只能是单次操作；
  2. hold ⌥ within a second 显示的 card 捕捉文字的显示区域有点小了，扩大；3. 整个 spool 出现的上下移动的滑轨组件不美观，中间白色的部分太宽，改成简洁无痕的小滑轨提示」
- ① `6c38e41 fix(capture): 一下 ⌘C 只带进一张长按卡 …`：`src-tauri/src/double_tap.rs`。新 `LONG_PRESS_COPY_USED_NS` 记已经用掉的那一下 ⌘C 的时刻；
  `copied_within` 改名 `fresh_copy_within`，多一个「不是用过的那一下」条件。长按真正弹出带字的卡时记为用掉（之后那张卡存了还是放弃了都一样）；
  **双击捕捉走了那一下 ⌘C 也记为用掉**（字已经在库里了，再带进长按卡就是重复）—— 这半条是我按「单次」推的，Ocean 可改。
  ⛔ 复制闸用的 `LAST_COPY_CHORD_NS` 没动，双击的判定不变。+1 单测 `a_copy_is_used_once`（第一次带、第二次不带、新的 ⌘C 又带）。
- ② `d0de340 fix(capture): 长按卡的正文框放大 …`：`src/overlay/CaptureOverlay.tsx`。正文框挪到右上角那排按钮**下面**、占满整宽（原来右边让出 72px 给按钮）；
  跟着字长高，上限 240px（约 11 行），再多就在框里滚；空着的时候照旧 3 行。卡片宽度不变，双击卡不动。截图核过：中等长度 4 行、长的到上限出滑轨、空卡、双击卡。
- ③ `b3d9bca style: 全局滑轨改成 6px 的细圆条 …`：新 `src/styles/scrollbar.css`，`src/styles/global.css`（主窗）和 `src/overlay/style.css`（浮窗）各 `@import` 一行。
  6px 圆角、淡墨色（`--ink-rgb` 16%，指上去 30%，情人节主题自动跟着换）、没有底槽、没有箭头。项目里那条刻度轨（`.no-native-scrollbar`）照旧隐藏原生滑轨。
  ⚠️ 这一条**不在 P3 任务书范围里**，是 Ocean 当面要的（`EXECUTION_POLICY.md` §3.2 一次性指令），已记进 HANDOFF §9.8。
  主窗的样子没截图（不能起第二个连真库的主窗），浮窗里截到的是同一份样式。
- 验：`tsc -b` 干净；Vitest 66 / 843；主 crate 146 · 4（+1）；sidecar 14；`(none missing)`；`--dead` 与基线相同；浮窗文案 `28 … missing: []`。
- 换装（Ocean 10-02 又选了「现在换装」）：构建 `b3d9bca`，同一条命令；TSA 第一遍过（17:56:54），`--verify --deep --strict` 过。
  停 GUI 65620 + `--overlay` 65677（按 pid，第一遍就退，`--mcp` 前后都是 25 个没碰）；真库备份 `~/Desktop/spool.before-p3fb-install-20261002-175710.db`
  （integrity ok，和活库一致：v29 · 25 / 63 / 1014 / 1 · 正文总长 291916 —— 比上一次多一块，是 Ocean 验收时存的）；
  旧包 `~/Desktop/Spool/spool-pre-install/Spool-old-20261002-175719-pre-p3fb.app`。装后：sha256 `ee7f780d…27de58344` 和构建产物一致；
  主进程 34719 / `--overlay` 34729 起于 17:57:19–20，txt inode 都是 75319656 = 新文件；`[double-tap] installed at HID/active`，没有 error / panic；
  `spctl` = `Unnotarized Developer ID`；真库前后一致，没有新的迁移快照。没 push、没发版。

**Ocean 验收**：2026-10-02 回复「验收通过，下发下一轮」—— P3（含第一轮反馈的三处）通过。

## 8. 收尾的文档动作（执行窗做）

1. 本文件首屏状态改成 `COMPLETE —— 待 Ocean 验收`（Ocean 验过后改成 `COMPLETE`），`git mv` 进 `docs/archive/product-taskbooks/`。
2. `docs/HANDOFF-2026-09-04.md`：§9.3 路线图 P3 那一行改成「已完成，任务书在 archive/product-taskbooks/…」；
   §9.8「唯一下一步」改成「按 §9.4 下发 P4」；`docs/README.md` 入口表里 ACTIVE 产品任务书那一行改成「暂无，待下发 P4」（README 只暂存这一行）。
3. 这些文档改动单独一笔提交（同样只 add 自己改的路径）。
