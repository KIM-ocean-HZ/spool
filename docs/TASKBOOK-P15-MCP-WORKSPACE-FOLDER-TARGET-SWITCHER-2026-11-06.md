# TASKBOOK P15 —— MCP 建工作区 / 连文件夹 / 知道捕捉目标 + 切换捕捉目标（2026-11-06）

> **状态：ACTIVE**（2026-11-06 下发并开始执行）
>
> **性质：owner interruption。** Ocean 11-06 原话「我希望在 win 版验证之前评估并新加入以下功能」「我同意批准在 P13 之前把四条全部修完」。
> `EXECUTION_POLICY.md` 没动。**返回点：P13（Parallels Desktop 里的 Windows 验证）→ 发版二。** P13 在 Windows 上要把这四条一起验掉（§6）。
>
> 依据：HANDOFF §9.2 第 254 – 256 条（本窗记）。

---

## 0. Ocean 已经定了的（别再问）

| # | 问题 | 决定 |
|---|---|---|
| 1 | MCP 建工作区 | 加 `create_workspace`，**直接建**（和 `create_thread` 一样受「允许 AI 写入」开关管），同一层同名拒绝。引擎拿不到。 |
| 2 | MCP 连文件夹 | **甲**：`propose_link_folder` 只提议，Spool 待审里出卡，用户点了才连（连接走手动连同一个对话框，每一样写进文件夹的东西用户都看得见）。已连着的工作区，同一个工具改成「换现状文件」。引擎拿不到。 |
| 3 | MCP 知道用户在说哪个项目 | 「在哪个项目打开的捕捉」= **捕捉目标**（项目顶栏点了「捕捉到此」、菜单栏打 ● 的那个）。`list_threads` 标出来；用户没点名时默认是它，**写之前先说项目名等用户点头**；私密的不说。不动库。 |
| 4a | Windows 长按 Ctrl 写笔记 | 必须有（Ocean：「我不允许 windows 版没有类似 mac 的长按 option 功能」）。**松手时才判**：只按 Ctrl、按住 **0.8 秒以上**（Ocean：「0.5 还是有点短」）、3 秒以内松开、中间没按别的键 / 没点鼠标 / 没转滚轮 ⇒ 弹笔记卡；按下前 2 秒内 Ctrl+C 过 ⇒ 带字。按得久的那一下不算双击的一半。 |
| 4b | 切换捕捉目标怎么唤出 | **双击 ⇧（Shift）**，Mac 和 Windows 一样。不放进捕捉卡（Ocean：「把切换捕捉放进捕捉弹窗本身就没有逻辑」）。设置里单独一个开关；「暂停捕捉手势」也管它。 |
| 4c | 面板 | 在鼠标指针处弹出，**滚轮上下换项目**，点某一行 = 选它并关；**点外面 = 关掉、保留选中的那个**；再双击 ⇧ = 关；几秒没动自己收。关掉那一刻生效。不抢键盘、不带主窗口。 |
| 4d | 列表顺序 | **最近用过的在前**（和侧栏「最近」同一个排法：捕捉目标第一，其余没完成的按最近改动），当前目标在最上面、正在指针下。 |

---

## 1. 顺序

1 → 3 → 2 → 4。每一条做完：测试过、单独一笔提交（不推送）。四条都做完再建测试版给 Ocean 验收（§5）。

---

## 2. 第 1 条：`create_workspace`

**现状（11-06 已核）**：`create_thread` 能建项目（装着的版本在真库副本上实测：建进「学校」成功）；指定一个不存在的工作区被拒（`resolve_workspace`：「没有名为…的工作区」），没有任何能建工作区的工具。另外两处漏：
- `list_threads` 是按项目出行的，**空工作区 AI 看不见**；
- 开着的 Spool 不会显示 AI 新建的空工作区：`librarySignature.ts` 不盯 `workspaces`，`reloadOutsideWrites` 也不重读工作区。

**要做**：
- `mcp.rs`：工具 `create_workspace`（`title` 必填；`parent_workspace_title` 可选，按名字找，同 `resolve_workspace`）。同一层（同一个上层，或顶层）已有同名（去空白、不分大小写）⇒ 拒绝，回现有的名字，让 AI 直接用它。标题过 `reject_raw_ids`。`sort_order` = 同一层最大值 + 1（和 `workspaces.ts` `createWorkspace` 一样）。`annotations` 写全。进写入闸那一串。回执标题（`human_headline`）一句。
- `ENGINE_EXCLUDED_TOOLS` 加它。
- `create_thread` 描述、`resolve_workspace` 的报错：工作区不存在时告诉 AI 可以先问用户、再调 `create_workspace`。
- `list_threads` 的回执标题把**空工作区**的名字带上（行还是只出项目，形状不变）。
- 路由文字 `OPENERS` 加中英触发词一行；`INSTRUCTION_BODY` 写进 create_thread 那一句旁边。
- GUI：`librarySignature.ts` 盯 `workspaces`；`reloadOutsideWrites` 先重读工作区。

**不做**：删除 / 改名 / 挪工作区的工具；工作区私密。

**验收**：cargo test（新工具：建顶层、建子工作区、同名拒绝、开关关着拒绝、引擎看不到、路由文字测试过）；vitest（记号包含工作区、重读会读工作区）；库副本 + 新二进制 `--mcp` 探针实跑一遍。

---

## 3. 第 3 条：AI 知道捕捉目标

**现状**：库里 `threads.is_capture_target` 本来就有（11-06 真库副本里是 Flux 工作区的〈flux〉），MCP 进程读得到，但没有任何工具告诉 AI。

**要做**：
- `list_threads`：捕捉目标那一行加 `"capture_target": true`（只这一行有，像 `folder` 那样）。走 AI 那一侧的 `threads` 视图 ⇒ 私密项目自然看不见，⛔ 也不许说「有一个看不见的目标」。
- `list_threads` 回执标题加一句：当前捕捉目标是〈X〉（工作区 Y）。
- 描述 + `OPENERS`「存进去 / save this back」那一行改成：用户没点名 ⇒ 先用捕捉目标，**说出项目名、等点头再写**；「这个项目怎么样」没点名 ⇒ 可以直接读捕捉目标。`INSTRUCTION_BODY` 同步一句。

**不做**：主窗口当前开着哪个项目（不记、不给）；「目标是什么时候设的」（库里没有，不加列）。

**验收**：cargo test（标出来、私密的不标也不提、没有目标时不提、标题那一句）；探针实跑。

---

## 4. 第 2 条：`propose_link_folder`

**现状**：MCP 只有 `get_folder_status`（读）和 `mark_folder_synced`；连接只能在工作区页面手动点。连接会往用户的文件夹里写：根目录 `SPOOL.md`；按用户的勾，`.git/info/exclude` 一行、`CLAUDE.md` 末尾一行、`AGENTS.md` 末尾一行（P9Y 定的：每一样都要在连的时候让用户看见）。

**要做**：
- **库 v37 → v38**：一张新表 `folder_proposals`（`CREATE TABLE IF NOT EXISTS` + 它的索引，⛔ 已有表一列不动、没有回填、没有 rebuild 分支），`client.ts` 迁移一条、`schema.sql`、`SCHEMA_VERSION`、`mcp.rs` 的 `EXPECTED_SCHEMA_VERSION` 一起抬。往回：`DROP TABLE folder_proposals`。
  - 列：`id`、`kind`（`link` / `state_files`）、`client`、`workspace_id`（外键，删工作区跟着删）、`path`、`state_files`（JSON 数组）、`primary_thread_id`、`why`、`created_at`、`expires_at`（7 天）。
- `mcp.rs`：工具 `propose_link_folder`（`workspace_title`、`path`、`state_files` 1 – 3 个、`main_project` 可选、`why` 必填 ≤300）。
  - 路径闸：完整路径、是文件夹、不在隐藏文件夹里、不是系统文件夹、`~/Library` 只放过 iCloud Drive 和 CloudStorage（和 `propose_attach_file` 同一套规矩，只是要文件夹）。
  - 现状文件：相对文件夹的路径，过 `folder_link::check_specs`；不带 `*` 的必须是文件夹里存在的文档（`is_doc`）。
  - 工作区已经连着**同一个**文件夹 ⇒ `kind = state_files`；连着**别的**文件夹 ⇒ 拒绝（请用户先在 Spool 里断开）。
  - `main_project` 必须是这个工作区里 AI 看得见、没完成的项目。
  - 同一个工作区已经有一张没处理的 ⇒ 新的换掉旧的，回执里说。
  - 回执说「在 Spool 里等用户点」，⛔ 不许说连好了。
- `get_folder_status` 的描述和「没连文件夹」那条报错里「这是用户自己的事」改成指向 `propose_link_folder`；路由文字两段各一句；`ENGINE_EXCLUDED_TOOLS` 加它。
- GUI：
  - `src/lib/db/folderProposals.ts`（列、数、取一张、删）；`librarySignature` 盯这张表；`proposalsStore` 带上它，待审数字算进去。
  - 待审里一张卡：谁提的、哪个工作区、完整路径、三份现状文件、主项目、理由。
    - `link`：「去连接…」⇒ 打开**原来那个** `ConnectDialog`（现状文件那一步预先勾好 AI 提的；git、CLAUDE.md / AGENTS.md 那几步照原样让用户选），连好之后设主项目、删掉这张卡；「不要」⇒ 删卡。
    - `state_files`：卡上列出「现在 → 换成」，「换成这几份」⇒ `folder_set_state_files`；「不要」⇒ 删卡。
  - 文件夹找不到 / 已经被别的连接占了：卡上说清楚，只剩「不要」。

**不做**：AI 直接连；AI 断开连接；AI 改 git / CLAUDE.md / AGENTS.md 那三个选项（卡上不预填，用户在对话框里自己选，跟手动一样）。

**验收**：cargo test（每一条拒绝、两种 kind、换掉旧的、过期、开关、引擎）；vitest（迁移在真库副本上跑一遍、`fresh === false`；卡片两种 kind 的按钮；批准后删卡）；按 `isolated-verify-workflow` §53 / §55：库副本里的连接**先改指克隆的文件夹**，在克隆上真连一次，⛔ 真文件夹一个字不写。

---

## 5. 第 4 条：Windows 长按 Ctrl + 双击 ⇧ 切换捕捉目标

### 5a. Windows 长按 Ctrl（`double_tap_win.rs`）

**现状**：Windows 只有双击 Ctrl（Raw Input、只看不拦、不装钩子）；P13 任务书 B 第 12 条写着「长按 Ctrl 写笔记 —— 已知 Windows 没有」。一下 Ctrl 现在不管按多久都算一下。只收键盘，看不见鼠标。

**要做**：
- 判定逻辑从 `double_tap_win.rs` 搬进一个**不分平台**的文件（时间由调用方传进来），这样 Mac 上的 `cargo test` 也测得到它；Windows 文件只剩读 Raw Input、调它。
- 长按：Ctrl 按下时没有别的修饰键；按住 ≥ 800 ms、≤ 3000 ms 松开；按着期间没有别的键、没有鼠标按键、没有滚轮 ⇒ 发 `note-trigger`（和 Mac 同一个事件），`copied` = 这一下按下之前 2 秒内有没有 Ctrl+C / Ctrl+X。
- 按住 ≥ 800 ms 的那一下⛔ 不算双击的一半。
- 收鼠标的 Raw Input（同一个只收消息的窗口、`RIDEV_INPUTSINK`、只看不拦）：按键和滚轮把正在按着的 Ctrl 标脏；同一路也给 5c 的「点外面关面板」用。
- 「暂停捕捉手势」照样管它。

**在 P13 里要验的（这台 Mac 验不了）**：笔记卡能不能直接打字（和 P13 B 第 7 条同一套抢键盘）；触控板双指缩放会不会让卡误弹（Windows 可能把它变成伪造的 Ctrl + 滚轮；误弹就改成只认真键盘发的 Ctrl）；收了鼠标 Raw Input 之后主窗口的鼠标一切照常；Parallels 里 Mac 键盘哪个键是 Ctrl。

### 5b. 双击 ⇧（Mac `double_tap.rs` + Windows `double_tap_win.rs`）

- 同一个不分平台的判定：两下干净的 ⇧（按着期间没有别的键、没有别的修饰键），**第二下松开时**判；两下松开相隔 ≤ 300 ms；每一下按住 < 300 ms。⇒ 发 `switcher-trigger`。
- 左右 ⇧ 都算。⛔ 不删、不改任何事件（Mac 的主动 tap 也只看）。
- 设置里一个开关「双击 ⇧ 切换捕捉目标」（默认开），值由前端推给 Rust；「暂停捕捉手势」开着时也不触发。

### 5c. 面板

- 浮窗进程（`spool --overlay`）里**第二个窗口** `switcher`：和捕捉卡同样的无边框、透明、置顶、不进任务栏、`accept_first_mouse`；启动时建好、藏着；同一份 `overlay.html`，按窗口名字挂面板组件。⛔ 不开库（和捕捉卡同一条规矩）。capabilities 里加上这个窗口名。
- 主窗口 JS 收到 `switcher-trigger` ⇒ 按 §0 第 4d 条排好项目（没完成的；私密的也列，这是用户自己的界面）⇒ 调 Rust 命令；Rust 取鼠标位置，把面板放在指针处（第一行在指针下），夹在那块屏幕的工作区里，发给浮窗进程，⛔ 不给焦点。
- 面板：一行「工作区 · 项目」，选中那一行高亮，上下渐淡；滚轮一格走一行（触控板攒够一段距离才走一格）；点某一行 = 选它并关。
- 关：点外面（Mac 用现有 HID tap 里看鼠标按下的那一路，Windows 用 5a 的鼠标 Raw Input）/ 再双击 ⇧ / 约 6 秒没有滚动和点击。关掉时把选中的告诉主窗口，和现在不一样才 `setCaptureTarget`（菜单栏跟着换）。
- 已经开着的捕捉卡不受影响（它记着自己的目标，照旧能「改投」）。

**验收**：cargo test（长按 / 双击 ⇧ 的判定，含每种不算的情况；面板位置夹在屏幕里）；vitest（排序、滚轮攒距离、关掉时才生效、没变不写）；面板截图（真组件 + 假桥，`isolated-verify-workflow` §46）；测试版上用脚本发 HID 事件（双击 ⇧、滚轮、点外面）实测 Mac 这一侧；Windows 那一侧 CI 编译 + P13。

---

## 6. 测试版、换装、交给 P13

- 四条做完：建隔离测试版（另一个 identifier、另一个数据目录，`isolated-verify-workflow` §42），把 Ocean 要手指验的写成验收单（大白话、一步一动作）。
- 换装前**先问 Ocean 有没有没点「完成」的编辑**（§47），备份库 + json（§49），迁移在副本上先验过（v38）。
- P13 任务书 §6 要补的条目（P13 开窗时加）：Windows 长按 Ctrl 写笔记（5a 那几条）、Windows 双击 ⇧ 面板（滚轮、点外面关）、`create_workspace` / `propose_link_folder` 在 Windows 路径上（`C:\…`）跑一遍。
- 对外写着「MCP 28 个工具」的地方，发版二时按实际二进制重数（30 个；引擎 26 个）。

---

## 7. 停下来问 Ocean 的时候

- 任何一条要改库结构超出 §4 那一张表；
- 要碰真库、真文件夹、Ocean 正在用的 Spool（换装）；
- 推送；
- 发现 §0 的决定在代码里做不到、或者有更大的代价。

---

## 8. 回执

（执行中填写）
