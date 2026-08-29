# 交接 —— 2026-08-26（下一件：**渠道**）

> ⛔ **SUPERSEDED / 已归档，禁止作为开工入口。** 2026-08-29 起当前入口是
> **`docs/HANDOFF-2026-08-29.md`**（下一件：E-core）。这一份留着只为查两样东西：
> `Q`/`W`/`X` 三批和 08-27 那三件 + 十件当初为什么那么做；以及 §3-bis 里
> 08-29 审计窗那七条 captured 的**全文**（新那份 §5 只留索引）。
> 里面「下一件就是渠道」「§5 下一窗开工提示词」已经**全部失效** —— 渠道 R1 已于 08-29 发布。

> **本文件同时取代 docs/HANDOFF-2026-08-22.md 的开工入口地位。** 08-22 只作历史现场记录。
>
> **这一份取代 `archive/HANDOFF-NEXT-2026-08-24.md`。** 那一份 975 行、十六节，装的是
> `S` / `V` / `Q` / `W` / `X` 五批的施工记录 —— **全部做完、全部验过**，所以它整份归档，
> ⛔ 别再照着它开工。要翻某一批当时为什么那么做，去 `docs/archive/` 里找它。
>
> 换一份的理由是 Ocean 自己定的规矩（`WORKPLAN` §0）：
> 「不允许任务无限堆积在一个文件夹，这会导致上下文过长，执行不准确」。

> **2026-08-27 新增长期入口：先读 docs/EXECUTION_POLICY.md。** 用户已将产品完善设为
> 永久主线、AI 记忆研究设为第二中心；营销在研究成果形成前只收集自然产生的真实素材。
> 当前下一件仍是 R1，但 R2 Show HN 属营销，继续封存，**不再挡住 E 批**：R1 完成或
> 被证伪后进入协议冻结与 E1/E2。开发中发现的新任务、小功能和非阻断问题只写进本
> HANDOFF，不得插队；除非用户明确同意，禁止修改总执行方针。

---

## 1. 现在是什么状态

~~**代码**：`main` 干净，`c57b41c` 之后**四个提交没推**~~

⚠️ **上面这句记漏了，2026-08-27 核实后更正**：当时远端 `main` 停在 `37b9c99`
（v0.6.2 换装那次），本地实际比它多 **18 个**提交 —— `S` / `V` / `Q` / `W` / `X`
五批全都没推，不是四个。**08-27 已经连同这一窗的改动一起推完**，远端 `main` = `6a94e30`。

⭐ 以后写这一行之前，⛔ 别照抄上一份交接单，用
`git fetch <HTTPS URL> main && git log --oneline FETCH_HEAD..HEAD` 数一次 ——
`origin/main` 这个本地 ref 是**过期的**（SSH 推不动，一直走 HTTPS URL 推，
它不会自己跟上），照它算出来的数字必然偏小。

**装机**：`/Applications/Spool.app` 是 `5894dbc` 那一版（2026-08-26 11:47 换的）。
签名 `Developer ID Application: Hanze JIN`，`spctl` 报 `Unnotarized Developer ID`
= 本机 dev build（记忆 `isolated-verify-workflow` §33）。

**库**：v28，54 条脉络 / 335 块 / 22 个工作区。⛔ 换装前后一条没少。

**验收**：✅ **Ocean 08-26 逐条走完，原话「验收都走过了，没问题」。**
`Q` / `W` / `X` 三批到此收口。

**测试**：TS 704 / Rust 139 全绿，`npm run build` 通过。

⚠️ 桌面上留着两份备份（`spool-snapshot-20260826-114634-pre-wx.db` /
`Spool-old-20260826-114634-pre-wx.app`），确认没事了可以删。

---

## 1-bis. 2026-08-27 插进来的三件（Ocean 口头点的，已做完并验过）

⚠️ **这三件不改执行顺序，下一件仍然是渠道 R1。** 它们是 Ocean 08-27 直接点的界面问题，
和渠道无关，也没有动 `docs/EXECUTION_POLICY.md`。

| # | 事 | 一句话 |
|---|---|---|
| 1 | 正文字号三档 | 设置 → 通用 → 正文字号：小 / 中 / 大。**只**改块里的正文和批注，别处不动。默认「中」= 已发布版本的字号 |
| 2 | 查找对齐别的软件 | 窗口在最前面时 **⌘F** 就是查找；划了词再按，搜索框里已经是那个词；查找条不再点一下外面就消失（只有 ✕ / Esc 关得掉）；「所有匹配」那张列表不再被正文压在底下 |
| 3 | 右侧刻度兼作命中图 | 查找开着时，本项目里对上的块，刻度变橙加长；悬浮看**对上的那一行**；点一下跳过去 |

⛔ **有一句没照字面做**：「查找快捷键默认为 cmd F」做成了「**窗口里的** ⌘F」，系统级那个
仍是 ⌘⇧F。系统级的 ⌘F 会把这个键从每一个别的软件手里抢走（撞记忆
`spool-must-not-cost-other-tools`）。要真换，是一句话的事，但代价要 Ocean 点头。
理由全稿在 `docs/FIND-UX-2026-08-27.md` §2。

顺手修了一个旧毛病：全局搜索面板里**按 ↵** 跳转，查找条的框是空的（点结果那条路一直没事）。

**去处 / 改了哪些文件 / 怎么验：`docs/FIND-UX-2026-08-27.md`。**

状态：TS 测试 **712** 全绿（新增 8 个），`npm run build` 通过，隔离构建实机截图逐条核过。
**已换装**（2026-08-27 11:31，`/Applications/Spool.app`）—— 授权没掉、真库正文与批注总字节
前后完全相同，回执在 `FIND-UX-2026-08-27.md` §6。旧的挪到
`Spool.app.pre-finduX-20260827-113057`。

---

## 1-ter. 2026-08-27 傍晚又插进来的十件（Ocean 口头点的，已做完并验过）

⚠️ **这十件同样不改执行顺序，下一件仍然是渠道 R1。** 它们是 Ocean 08-27 直接点的界面问题和
小功能，和渠道无关，也没有动 `docs/EXECUTION_POLICY.md`。

**全稿（去处 / 证据 / 验收单 / 换装回执）：`docs/TEN-ITEMS-2026-08-27.md`。**

一句话一件：

| # | 事 | 结果 |
|---|---|---|
| ⓪ | 键盘假死三十秒 | 量到了病根这一类：**不带 `(async)` 的 Tauri 命令跑在主线程上**，它卡多久窗口就冻多久。对照实验：同步命令占 3 秒 → 主线程冻 3001ms；同一段加 `(async)` → 一次都不冻。十条会阻塞的命令已搬下主线程 |
| ① | 刻度旁的命中预览列 | **重做过一轮**：上下滑动或鼠标靠近都展开；卡片一样大、最多 6 张、字从命中词开始并高亮；中心点在刻度上点一个小圆点；鼠标移向卡片时预览不消失。刻度仍然 16px |
| ② | 搜索计数有歧义 | 改成三段：这一块第几处 / 本项目多少处多少块 / 全部多少处多少块 |
| ③ | 长按 ⌥ 直接写笔记 | 按住 ⌥ 约半秒 → 同一个浮窗，正文空着直接写；存进当前捕捉项目，来源留空（💭 Personal） |
| ④ | **按 ⌘F 草稿没了** | 修好。草稿按项目存进 store，跳走再回来还在，补了 5 个测试钉死 |
| ⑤ | 搜索结果先是空白 | 修好。真库量过：常见词 60 条命中里 25 条画空白行 → 0 条 |
| ⑥ | 底下那个虚线框 | 没拖拽不再冒出来；**文案原来是错的**（写「新建一个块」，实际是把文件加进项目），已改成说实话 |
| ⑦ | 发完自动定位 | 发出去之后滚到刚写的那一条 |
| ⑧ | 去掉第一行自动加粗 | 自动加粗去掉，换成编辑面板顶上的「标题 / 正文 / 斜体」，字号跟着三档走 |
| ⑨ | 专注时间一直累积 | **按天算**：写「今天已专注 N 分钟」，落盘跨重启；⭐ 24:00 不切 —— 熬夜到凌晨仍记在前一天，人真的停下来才翻篇 |

⛔ **两处没照字面做**，写在 `TEN-ITEMS-2026-08-27.md` §3：③ 的双击**没有**跟着长按一起等半秒
（会拖慢捕捉，改用可取消的定时器做互斥）；⑥ 的文案原来是错的所以改了。
⭐ **⑨ 和 ① 后来又重定过一轮**（Ocean 当天晚些时候），最终形态见那份 **§8**。

状态：TS 测试 **747** 全绿（新增 35 个），`npm run build` 通过。**已换装两次**
（20:45 十件；21:54 第三轮的 ⑨ ①）—— 两次授权都没掉（`installed at HID/active`），
真库四个计数和正文/批注总字节前后完全相同，回执在那份 §6 和末尾。

---

## 2. ⛔ 下一件就是**渠道**，别再往前面插东西

`WORKPLAN-2026-08-22.md` §1 的现序：
`A` → `D` → `T` → `B 发版` ✅ → `S` ✅ → `V` ✅ → `Q` ✅ → `W` ✅ → `X` ✅ → **`渠道`** → `E` → `F`。

⚠️ **渠道已经被往后推过五次**（`T` 一次、`S` 一次、`Q` 一次、`W`+`X` 一次，加上
最早那次发版）。每一次都有正当理由，每一次也都是真的推了。

### 2.1 这一批只有两条，而且第二条不能先做

| 序 | 渠道 | 说明 |
|---|---|---|
| **R1** | **官方 MCP Registry**（`mcp-publisher` CLI 提交） | 最便宜的一条 —— 受众**不需要被说服「上下文丢失」这个问题存在**，他们已经在装 MCP server 了 |
| **R2** | ⛔ **Show HN** | **一次性机会，放最后。** ⛔ 前面全部做完再开 |

⚠️ **这一批是被知情削薄的，⛔ 不是漏排**：四带格式发成 skill（`F1`）跟着 `E2` 走，
所以 Show HN 之前**只剩 MCP Registry 一条**。想让它厚起来，唯一的杠杆是把 `E2` 往前挪。

### 2.2 ⛔ 开工前必须先核的一件（**这一件可能整个挡住 R1**）

**Spool 的 MCP server 是装在 `.dmg` 里的一个桌面 app 的子命令（`spool --mcp`），
⛔ 不是 npm / pypi / docker 包。** 而官方 MCP Registry 的条目要指向一个**包**或者
一个**远端 URL**。

⇒ **先去看 registry 今天接受哪几种 package type，Spool 这个形态对不对得上。**
⛔ **别先写 `server.json`**：形态对不上的话，写出来的东西一行都用不上。

三种可能的结局，先想清楚哪种可接受：
- **甲**：registry 收「本地二进制 / 自托管安装」这一类 → 直接提交。
- **乙**：只收包 → 得**额外**发一个 npm 包当安装器（`npx` 拉 dmg？装 app？）。
  ⚠️ 那是一件新工程，⛔ 不是填个表，要先问 Ocean 值不值得。
- **丙**：只收远端 HTTPS MCP server → ⛔ **撞产品红线**（记忆
  `chatgpt-cloud-cannot-reach-local-mcp`：把 Spool 架到公网就不是 Spool 了）。⇒ R1 作废，
  这一批只剩 Show HN，要回去重排。

### 2.3 对外引用数字之前，重数一次（我 08-26 数过了）

⛔ **`WORKPLAN` 里「20 个工具 + 7 个 prompt」那句已经旧了。**
拿装机那一版的二进制探过（`SPOOL_DATA_DIR` 指临时库，⛔ 不碰真库）：

```
tools   = 22
prompts = 7   compress_pack, weekly_review, thread_health, distill,
              triage_conversation, file_this, catch_up
```

⚠️ **每次对外说这个数之前都要重数一遍** —— `Q 批` 刚加过 `set_block_gist`，
一批新工具就是一个新数字。探法：

```bash
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"probe","version":"1"}}}' \
 '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
 '{"jsonrpc":"2.0","id":3,"method":"prompts/list"}' \
 | SPOOL_DATA_DIR=/tmp/probe-lib /Applications/Spool.app/Contents/MacOS/spool --mcp 2>/dev/null
```

### 2.4 ⛔ 渠道这一批的红线（都在记忆里，这里只点名）

- ⛔ **95/5 那个数字一个字都不许出现**（`stat-95-5-is-void`）。
- ⛔ **MemTrapBench 那篇论文的百分数一个都不许放进讲 Spool 的句子里**（`memtrapbench-paper`）。
- ⛔ **下载量那 32 次全是 Ocean 自测，真实外部用户 = 0**（`spool-download-metrics`）——
  ⛔ 别拿 32 去算任何比例。
- ⚠️ **宣发目前是暂停状态**（`mockups-vs-installing`）：08-20 第一批物料被整批否掉。
  「效果图解禁」只对**宣传物料**那一格有效，且**海报后面必须跟真截图**。
  ⇒ R1 只是一个 registry 条目，不算宣发；R2 是宣发，⛔ 开它之前先问。
- ⚠️ **收费前仓库要转私有，但时机是死的**：渠道 → 付费功能 → 挪走公开文档 → 才转
  （`paid-licensing-mechanics`）。⇒ **R1 在转私有之前，顺序是对的。**
- ⛔ **绝不加 LICENSE**（`no-license-file`，问过三次都是否）。

---

## 3. 还挂着没做的（⛔ 都不挡渠道，但别忘）

### 3.1 发版留下的两条尾巴

| # | 是什么 | 怎么做 |
|---|---|---|
| ① | **`.app` 那次的 submission id 没截住** —— 台账 `CASE_STUDY_LEDGER` §1.2 那一格现在是标记不是数字 | `xcrun notarytool history`，Apple 还留着就能捞。⚠️ 捞到直接填，⛔ 别编 |
| ② | **`RELEASE.md` §3 验收单没走完** —— 「全新机器装 dmg 首启建库」「双击 ⌥ 授权」几条 | ⛔ 只有真手指做得了。已经发出去了 ⇒ 这是**发后复核**，撞到问题就是 0.6.3 |

### 3.2 第六轮实测挖出来、仍然没修的三条

| # | 是什么 | 证据 |
|---|---|---|
| ① | **`split_cuts` 之后没人看一眼正文空不空** —— 撞到一次 `ok=true` 配 **0 字节**压缩稿 | `worthRetrying` 接住了，**但信封是假的** |
| ② | **失败信封不带用量** —— `Envelope::Err` 只有 `ok`/`kind`/`message`/`status`。「已经跑出去的那一段照样算钱」那句护栏**至今拿不到证据** | 那一夜 8 次失败全记 ¥0 ⇒ ¥2.92 是**下限** |
| ③ | **实测台重编一次就要重新授权一次**，而授权框**锁屏状态下弹不出来** | 那一夜因此丢了八小时 |

①② 各是一处判断 / 一个结构体加字段。③ 的做法在记忆 `isolated-verify-workflow` 末尾那一节。

⭐ **`X 批`把 ② 往前推了半步**：`BalanceOutcome` 是照着「失败也要说清是哪一种」那条
纪律新写的，形状可以照抄；但 `Envelope::Err` 本身还是没有 usage。

### 3.3 一个一直没问 Ocean 的（不挡任何事）

**批注要不要能「更正」？** 现在**不能** —— 划在批注上的选区只出「标为重点」。
理由是数据模型：一条更正存 `corrected_quote`，而 pack / `check_quote_occurs` /
`correctedSpans` 三处都拿它去**正文**里找。存批注里的句子 = 一条谁也定位不到的更正。
⇒ 真要做是**另一件事**（得先决定「批注上的更正卡画在哪儿」），
⛔ 不是在 `startCorrection` 里加一行。

### 3.4 ⚠️ `/Applications` 底下堆着八个旧 bundle，266 MB

`Spool.app.previous-*`（08-11 / 08-12 六个）、`Spool.app.pre-v062-*`（08-24 一个）。
⛔ **不是我这一窗留下的**，也⛔ 没删 —— 换装规程说「挪开别直接删」，但没人回头清过。
⇒ 问一句就能全清掉。⚠️ 清之前 `lsof +D` 看一眼有没有进程还执行着里面的 inode
（记忆 §34：换装不打断跑着的 `--mcp` 子进程）。

---

## 3-bis. 2026-08-29 审计窗新增（Ocean 同意写入，状态一律 captured，⛔ 都不挡 R1）

> 这一节是 2026-08-29 那一窗自己加的，⛔ 没有改动上面任何一段。
> 那一窗的任务是「先审计决策、再决定要不要施工」，全稿留在临时目录，没进仓库。

### DISCOVERED-20260829-1 · R1 的形态核完了：registry 收「嵌在桌面应用里」这种条目

- 路线：P
- 类型：**当前验收必要项**（§2.2 要求「开工前必须先核」的那一件）
- 来源：官方 `server.schema.json`（2025-12-11）与 `generic-server-json.md`，原文抓下来 grep 过，2026-08-29
- 证据：
  - `packages[].registryType` 实收 `npm` / `pypi` / `nuget` / `oci` / `mcpb`（另有 `cargo`）——
    **没有「本地二进制 / 自托管」这一类**，§2.2 写的「甲」字面上不存在；
  - **但 `ServerDetail.required` 只有 `name` / `description` / `version`，
    `packages` 和 `remotes` 都是可选的**；
  - 官方文档里有一个例子标题就叫 **Server with Custom Installation Path**，
    说明是「嵌在应用里、没有独立包的 MCP server，用 `websiteUrl` 指向安装说明」，
    例子的 description 逐字是 **“MCP server embedded in a Desktop app”**。
- 影响：**R1 不作废，也不需要新工程。** §2.2 的三选一变成两条：
  metadata-only 条目（选了这条），或额外发一个 `.mcpb`（否掉了，理由见下一条）。
- 与当前任务关系：这就是 R1 的开工前置，已完成。
- 建议：立即最小处理（写 `server.json`，四个字段）
- 验收标准：`mcp-publisher validate` 通过；条目里不出现任何被禁的数字。
- 严重度：P1
- 状态：**completed**（核查这一步）

### DISCOVERED-20260829-2 · `.mcpb` 那条路否掉的理由（存档，免得下次重想一遍）

- 路线：P
- 类型：战略候选（已否）
- 来源：`src-tauri/src/mcp.rs:1277`、`mcp.rs:3717`；官方 mcpb README
- 证据：读写两条路都硬检查 `PRAGMA user_version`，不等就拒答 / 拒写；
  **拒答那条的错误原文是「请把客户端配置指向新版 Spool.app 里的执行文件」**——
  mcpb 装出来的二进制不在 `Spool.app` 里，**产品自己的报错文案和这条安装路径打架**。
  另外官方今天明写会装 `.mcpb` 的客户端只有 Claude Desktop。
- 影响：⚠️ 只是支持成本，**不是数据风险**——MCP 那侧只读连接是 `SQLITE_OPEN_READ_ONLY`，
  写连接从不创建也从不迁移库（迁移只在 GUI）。2026-05-29 那次抹库是 GUI 的 `migrateSchema`，不是这条路。
- 建议：候选等待（真要一键装的时候再翻出来）
- 严重度：P3
- 状态：captured

### DISCOVERED-20260829-3 · `get_blocks` 不返回 `ref_note`

- 路线：P
- 类型：小功能
- 来源：`src-tauri/src/mcp.rs` `get_blocks_json` 的 SELECT
- 证据：SELECT 里有 `source_url` / `retrieved_at` / `recheck_after` / `corrected_quote` /
  `ref_kind` / `stale_at`，**没有 `ref_note`**（也没有 `gist` / `gist_by` / `annotation_by`）。
  而 `ref_note` 是 v28（Q 批）刚加的「为什么引这一块」，**Pack 会渲染它，读块的工具却不给**。
- 影响：AI 读块时只看得到「引了哪一块」，看不到「当初为什么引」——正是那个字段加进来要解决的事。
- 依赖：无。SELECT 加一列 + 一个 json 字段 + 测试。
- 建议：候选等待
- 验收标准：`get_blocks` 返回的每一块带 `ref_note`；补一个测试钉死。
- 严重度：P2
- 状态：captured

### DISCOVERED-20260829-4 · 批准 supersede 之后，理由没了

- 路线：P
- 类型：小功能
- 来源：`src/stores/compressStore.ts:975-994`、`src/lib/db/supersedeProposals.ts:100`
- 证据：提案里存着 `why` / `quote_stale` / `quote_new`；批准时只写关系 + `stale_at`
  （走「只连线」那档还会写 `corrected_quote`），然后 `deleteSupersedeProposal` 把那一行删掉。
  ⇒ 最后能知道「新块取代了旧块」，**但拿不回「当初凭什么批的」**。
- 影响：不影响正确性，影响的是几个月后回头看时讲不清理由。
- 与既有设计的关系：⛔ **不是要推翻「不留拒绝日志」那条**（那条是对的）。
  要留的只是**已经生效、已经改变项目真值的那个决定**，不是被拒绝的提案。
- 建议：候选等待
- 严重度：P2
- 状态：captured

### DISCOVERED-20260829-5 · Spool 现在是 MCP 新规范定义的 legacy 服务端

- 路线：P
- 类型：非阻断 bug / 长期隐患
- 来源：modelcontextprotocol.io 版本页与 2026-07-28 兼容性页（2026-08-29 查）；本机实测
- 证据：MCP 规范当前版本是 **2026-07-28**，它取消了 `initialize` 握手，改成每个请求自带版本，
  并规定**服务端 MUST 实现 `server/discover`**。拿装机那一版探——`server/discover` 返回
  `-32601 method not found`。
- 影响：**今天没坏。** 同一次实测里，带新式 `_meta` 的 `tools/list` 照样返回 22 个工具
  （Spool 忽略 `_meta`），而且规范写明 dual-era 客户端会先探 `server/discover`、失败就回落到
  `initialize`——现在跑的就是这条路。⚠️ 长期是，等客户端开始只讲新协议，Spool 会连不上。
- 与当前任务关系：和 R1 有关——挂上目录 = 更多客户端会指过来。
- 建议：候选等待（这一窗不做）
- 严重度：P2
- 状态：captured

### DISCOVERED-20260829-6 · 「跨项目更正在旧项目里看不见」不是 bug，是刻意的

- 路线：P
- 类型：需要 Ocean 决定
- 来源：`src-tauri/src/mcp.rs` `corrections_by_source` 的注释
- 证据：注释逐字写着「Derived from the pack's own list: a correction written in another
  project is not claimed here」。
- 影响：`RESEARCH_ANSWER_PROVENANCE-2026-08-29.md` §3.7 把它归进「先修现有逻辑完整性」，
  读起来像 bug。**它不是**。改它 = 一个项目的 Pack 里会出现另一个项目的内容，撞隐私边界。
- 建议：需要用户决定；⛔ 在他拍板前不能当「修复」顺手做。
- 严重度：P3
- 状态：captured

### DISCOVERED-20260829-7 · 还没量过：库里有几块是 `corrects` / `supersedes` 用错的

- 路线：P
- 类型：研究/取证前置
- 来源：`mcp.rs` 与 `blocks.ts` 里记着的真实案例注释（三代都用 `corrects`，所以三代都 live）
- 证据：护栏已经有了（`staleGuards`、`wouldOverwriteRelation`、写入时逐字闸），
  **但没人数过真库里现存多少块是这种。**
- 建议：需要用户决定——量真库要他点头（⛔ 审计那一窗没碰真库）
- 严重度：P3
- 状态：captured

### 顺带核过的几个数（2026-08-29 实测，不是照抄）

| 事 | 实测 |
|---|---|
| TS 测试 | 61 文件 / **747 全绿** |
| Rust 测试 | **139 全绿**（4 ignored） |
| 工具 / prompt | **22 / 7**，22 个工具全部带 `annotations` |
| schema 版本 | `client.ts` 与 `mcp.rs` 都是 **28**，没偏斜 |
| 装机 | ⚠️ 是 **08-27 21:54** 那一版（十件第三轮），**不是 §1 写的 `5894dbc`**。§1 那一行被 §1-bis / §1-ter 更新过；按当窗规矩没有顺手改它，在这里记一笔 |

---

## 4. 这一窗留下的、下一窗会用到的三条经验

1. ⭐ **验一个厂商 API 的地址存不存在，不用碰用户的真 key** —— 拿一个明显是假的 key 去打，
   401/403 = 地址存在，404/405 = 这家没有。⚠️ 反过来不成立（有的网关认证在路由之前）。
   全稿进了记忆 `isolated-verify-workflow` §37。
2. ⭐ **交接文档里写的「根子」要自己去代码里核一遍。** 这一窗 §14.2 ① 那条就是错的
   （说模型选择器的闸是 `showModels`，实际是 `models.length > 0`）——
   照着修会修错地方。
3. ⭐ **「只认成功」的判据 + 定时循环 = 失败时无限重试。** `weeklyReviewDue` 只认
   `outcome='ok'`，所以一次失败之后它一直是 true。CLI 那边只是白转，**API 那边是每十分钟
   烧一次钱**。⇒ 以后凡是「到点了就自动花钱」的东西，都要问一句「失败之后它多久再试一次」。

---

## 5. ⭐ 下一窗开工提示词（照抄）

```
读 docs/HANDOFF-NEXT-2026-08-26.md（整份，不长），以及 docs/WORKPLAN-2026-08-22.md
的「渠道」那一节。

现状一句话：Q / W / X 三批全部做完、换装、并且 Ocean 逐条验过没问题
（四个提交没推：3e6b8a5 / 487d3b5 / 5894dbc / c57b41c）。
⛔ 别回头动那三批。

这一窗做渠道 R1（官方 MCP Registry），按这个顺序：

一、⛔ 先核一件可能整个挡住 R1 的事（§2.2），别先写 server.json：
    Spool 的 MCP server 是桌面 app 的一个子命令（spool --mcp），装在 .dmg 里，
    ⛔ 不是 npm / pypi / docker 包。去看 registry 今天接受哪几种 package type。
    - 收「本地二进制/自托管」→ 直接提交。
    - 只收包 → 得额外发一个安装器包，⚠️ 那是新工程，先问 Ocean 值不值得。
    - 只收远端 HTTPS server → ⛔ 撞产品红线（记忆 chatgpt-cloud-cannot-reach-local-mcp），
      R1 作废，回去重排。

二、形态对得上再动手写条目。⛔ 对外写任何数字之前，用 §2.3 那段命令重数一次
    工具和 prompt（08-26 数是 22 / 7，⛔ WORKPLAN 里「20 个」那句已经旧了）。

三、⛔ R2（Show HN）这一窗不碰 —— 一次性机会，放最后。

红线（§2.4，都在记忆里）：⛔ 95/5 那个数字作废；⛔ MemTrapBench 的百分数不许进
讲 Spool 的句子；⛔ 下载量那 32 次全是自测、真实外部用户 = 0，别拿它算比例；
⚠️ 宣发暂停中，R2 属于宣发，开它之前先问；⛔ 绝不加 LICENSE；
⛔ 不做悬浮窗；⛔ 浏览位置不许按 scrollTop 存；⛔ 用户不能看到测试环境的 Spool；
⛔ 提交不许带任何署名（CLAUDE.md §5，自查 grep 会误报，见记忆
attribution-grep-false-positive）；⛔ 换装必须带 APPLE_SIGNING_IDENTITY
（记忆 isolated-verify-workflow §6-bis）。

⚠️ 顺手可以问 Ocean 的两件（都不挡渠道）：§3.4 那八个旧 bundle（266 MB）要不要清；
§3.1 那两条发版尾巴什么时候补。
```
