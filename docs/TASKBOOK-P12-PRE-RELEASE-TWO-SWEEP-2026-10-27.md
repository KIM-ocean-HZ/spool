# TASKBOOK P12 · 发版二之前的扫尾（2026-10-27）

> **状态：ACTIVE（10-27 下发）。** P10 10-27 验收通过（HANDOFF §9.2 第 229 条）；Ocean 定「先一轮扫尾再发版」（第 230 条），十二条全是他自己从 DISCOVERED 里挑的（第 233 条），真跑上限也定了（第 234 条）。**§4 没有要再问的**。还没开工、没改代码、没花钱。
>
> 来源：HANDOFF §9.9 / §9.10 里还是 captured 的条目；路线图 §9.3 P12 那一行。
> 返回点：P12 验收之后是**发版二（Mac + Windows 稳定版）** —— Ocean 有一台能装 Spool 的 Windows 电脑了（第 231 条）；稳定版之后的推广和营销闸门冲突那条（POLICY-PROPOSAL-20261010-1）**到发版二再问**（第 232 条）。

---

## 0. 一句话

发版二之前，把 Ocean 挑的十二条小毛病修掉：周回顾三条（跟界面语言、本机 CLI 少读、材料里的标题分开）、测试偶发红、Windows 路径消息、连文件夹两条、引擎认实验库、字典死键、截完图立刻能捕；外加两件「验一下」（项目级过期检测、Cowork 读不读 CLAUDE.md）。

---

## 1. Ocean 挑的十二条（10-27，第 233 条；HANDOFF 里的条目号）

| # | 条目 | 一句话 |
|---|---|---|
| 1 | DISCOVERED-20261027-4 | 英文界面下周回顾的内容还是中文 |
| 2 | DISCOVERED-20261027-3 | 本机 CLI 周回顾有时把每个项目都展开读一遍（一次 43 万 token） |
| 3 | DISCOVERED-20261027-1 | 周回顾材料里，块正文自己的 `## ` 小标题和项目标题是同一级 |
| 4 | DISCOVERED-20261027-2 | 引擎起 CLI 时 `SPOOL_DATA_DIR` 传不到它的 `spool --mcp` |
| 5 | DISCOVERED-20261026-1（= -20261018-3、-20261023-1，同一个 bug） | 织布那条测试偶发红 |
| 6 | DISCOVERED-20261020-9 | Windows 上路径闸的拒绝消息里目录显示成 `\\?\C:\…` |
| 7 | DISCOVERED-20261025-12 | 文件夹唯一的项目被删除时，SPOOL.md 里还留着它的名字 |
| 8 | DISCOVERED-20261025-11 | 「改过」标记只在这次打开 Spool 期间显示 |
| 9 | DISCOVERED-20261018-2 | 截完图立刻就能捕，不用等右下角小图消失 |
| 10 | DISCOVERED-20261025-5 | 项目级过期检测还没在「证据就在 Spool 里」的地方验过 |
| 11 | DISCOVERED-20261001-2 | `i18n-check --dead` 报的没人用的字典键（现在 99 条） |
| 12 | DISCOVERED-20261025-8 | Claude 桌面版的 Cowork 读不读文件夹里的 CLAUDE.md |

⛔ 只做这十二条。施工中发现的别的事记进 HANDOFF（`EXECUTION_POLICY.md` §7），不顺手做。

---

## 2. 现在（10-27 对着 `HEAD` 查的指针；开工时再核一遍，对不上写进回执）

| # | 现在的代码 |
|---|---|
| 1 | API 那条的提示词 `WEEKLY_API_SYSTEM` + `WEEKLY_JSON_ZH` 只有中文（`src-tauri/src/mcp.rs`，`weekly_messages_for_api` 一带）；CLI 那条 `weekly_review_json_prompt_text` 按界面语言出中 / 英，但材料是中文，10-27 真跑 CLI 也回了中文。现成的做法：过期检测的 `stale_ws_why_rule()`（只规定 why 用界面语言，引文照抄原文） |
| 2 | `weekly_review_json_prompt_text` 第 1 条：「要展开某个项目，先用 get_pack / get_blocks 补读，再下判断」。两轮真跑 CLI 第一次都是 20 – 24 次 `get_pack`、43 – 44 万 token，另两次 3 万 |
| 3 | `weekly_fresh_blocks_text` 每个项目一行 `## 项目名`，块正文原样跟在下面；块里自己的 `## ` 小标题和它同级。15 次真跑模型都没认错，认错了闸也会整项丢（`weekly_review.rs` `thread_for`） |
| 4 | `engine::run_env` 只给 CLI PATH / HOME / USER（Codex 加 CODEX_HOME）；MCP 服务的参数在 `server_args` / `mcp_config_json` / `codex_config_overrides` / `gemini_settings_json`。试验台 `api_engine::p10_real_runs::real_cli_weekly_on_a_copy` 现在是自己插一个 `-c mcp_servers.spool.env={SPOOL_DATA_DIR=…}` 绕过去的 |
| 5 | `src/stores/knitStore.ts:100` 拿 `Date.now()` 当这一次织成的身份，`unredeem(at)` 按它找；测试连着织两件落在同一毫秒时撤销认错。真人两次点击落在同一毫秒几乎不可能 |
| 6 | `mcp.rs` `gate_stop_message`（约 7090 行）把规则里的目录原样写进给 AI 的消息；Windows 上是 canonicalize 出来的 `\\?\C:\…`。同文件 `plain_path`（约 7128 行）就是去前缀的那一个 |
| 7 | ⚠️ **Spool 没有回收站**：删项目是软删，只能在这一次打开期间 ⌘Z 回来（撤销环在内存里、10 条，重启就空）。SPOOL.md 现在对「文件夹唯一的项目被删」先不动（等可能的撤销）。⇒ 条目原来写的「回收站清空那一刻」不存在；合适的时机是**Spool 下一次启动**（那时已经撤销不了） |
| 8 | 「改过」是 `blocksStore.reExtracted`（内存里的 Set，`src/stores/blocksStore.ts`），右栏 `ProjectFiles.tsx` 照它画；重启就没。P9Y v36 给 `attachments` 加过两个可空列 —— 先看能不能从已有的列推出来 |
| 9 | `src-tauri/src/images.rs` 约 600 – 620 行：`TemporaryItems/NSIRD_screencaptureui_*` 里有新图 = 「截图还没存好，继续等」（P7-7 的 `shot-waiting` 提示）。图其实已经在那个临时文件夹里了 |
| 10 | 过期检测「查整个工作区」有项目级（建议标完成），P9V 真跑在 Flux 上没出过项目级的；Ocean 10-25 说 Flux 的证据在仓库里、不在 Spool 里（HANDOFF §9.2 第 203 条），所以要换一个证据就在 Spool 里的工作区验 |
| 11 | `node scripts/i18n-check.mjs --dead` 99 条。P9A 10-10 逐条核过当时的 87 条：全是真没人用、没有常量表误报（`--dead` 认「在哪儿出现都算」）；这十几条新增的还没核 |
| 12 | P9Y 往连着的文件夹里写 SPOOL.md、`.git/info/exclude` 一行、CLAUDE.md / AGENTS.md 各一行指针；Claude Code 读 CLAUDE.md 已验过，Claude 桌面版的 Cowork 没测过 |

---

## 3. 要做的（按顺序；一步一笔提交；每一步的验收写在后面）

1. **P12-1 测试与小 bug**（第 5、6 条）：
   - 织布：先确认根因，再做最小改动（测试里让两次时间不一样，或者给每次织成一个独立身份，选改动小、不改用户可见行为的那一种）。验收：`knitStore.test.ts` 单独连跑 50 次全过，整套 vitest 连跑 3 次全过。
   - 路径闸消息：目录过一遍 `plain_path`。验收：单元测试拿一个 `\\?\C:\…` 形态的目录，消息里没有 `\\?\`；判断逻辑一个字不改。Windows 真机上看一眼留到发版二。
2. **P12-2 连文件夹两条**（第 7、8 条）：
   - SPOOL.md：Spool 启动时，把「已经软删、这一次已经撤销不了」的项目从它所在文件夹的 SPOOL.md 里拿掉。⛔ 只写标记之间、手改不覆盖、私密项目的规矩不变（P9Y 红线，HANDOFF §9.8 P9Y 那一段）。
   - 「改过」：重启之后还在。默认规矩：**标到用户打开（点开看）那个文件为止**。能从已有的列推出来就不加东西；⛔ 要加列或加表，先停下来问 Ocean（库结构改动）。
   - 验收：在库副本 + 仓库 APFS 克隆上做（记忆 `isolated-verify-workflow` §53，⛔ 真的 `~/flux` 一个字不写）；单元测试。
3. **P12-3 字典死键**（第 11 条）：逐条核（拼出来的键、常量表里在用的不算死；P9A 核过的 87 条可以直接用它的结论，新增的那十几条自己核），真没人用的删掉。验收：`--dead` 只剩核过是误报的（回执里逐条写为什么留）；英文界面截图抽查几页，没有露中文。
4. **P12-4 引擎认 `SPOOL_DATA_DIR`**（第 4 条）：GUI 进程设了这个变量时，写进引擎给 Spool MCP 服务的那份配置的 env（三种引擎都要），没设就和现在一字不差。试验台 `p10_real_runs` 去掉自己那一行 `-c` 绕法。验收：三个配置构建函数的测试（设 / 不设）；P12-5 真跑时照旧用副本目录里的 `mcp-clients.json` 证明读的是副本。
5. **P12-5 周回顾三条 + 真跑**（第 1、2、3 条）：
   - 语言：did / stuck / signals.why / actions.why / add_follow_up 的 text / next 按界面语言写；⛔ quote / old_quote / new_quote / close_follow_up 的 line 照抄原文，不翻译。两条路都改（API 那条的提示词本来只有中文，照 `stale_ws_why_rule` 的样子加一句，别整段翻译）。
   - 少读：CLI 那一版第 1 条改成「只在 digest 里看不出来、又是判断要用的时候，才补读那一个项目」。
   - 标题分开：「这一周新加的」里项目那一行换一种和块正文的 `## ` 分得开的写法；⚠️ 闸要照样对得上项目（`thread_for`），提示词里「title 照材料原样抄」那句跟着改；材料范围不变。
   - 真跑：**先写死判定标准再跑**（建议：P10 任务书 §7.2 那九条，再加「英文界面下这几栏是英文」和「CLI 每次输入不超过某个数」—— 数自己定、写进任务书再跑）；在真库 `VACUUM INTO` 的副本上跑，原始数据存桌面 `~/Desktop/Spool/P12-realrun-<日期>/`，⛔ 不进仓库（仓库公开）。**上限：DeepSeek 3 次 + 本机 Codex 3 次，总共不超过 0.5 美元，超了先停下来问**（第 234 条）。DeepSeek 的 key 开工时问 Ocean 要，只走环境变量，不写进任何文件 / 提交 / 记忆。真账单用余额前后差（余额有十几分钟延迟，记忆 `api-vendor-quirks`）。
6. **P12-6 截完图立刻能捕**（第 9 条）：小图还挂着的时候，直接拿 `NSIRD_screencaptureui_*` 里那张图当这次捕捉的内容。⛔ 只读那个临时文件，不挪、不删、不改 —— 系统之后照常把正式截图存到桌面。验收：单元测试（挑图的规则）+ Ocean 真手指（⌘⇧4 截一张，马上双击 ⌥，捕到的就是这张，不用等小图消失；桌面上的截图照常出现）。
7. **P12-7 项目级过期检测再验**（第 10 条）：在一个证据就在 Spool 里的工作区（建议〈升学〉或〈推荐信〉，开工时看副本里哪个最合适）的库副本上，用 app 自己的代码跑「查整个工作区」，DeepSeek 1 次（算在上面那 0.5 美元里）。只记结果：有没有项目级的、对不对、块级的有几条。⛔ 不改提示词（要改先问 Ocean）。
8. **P12-8 Cowork 读不读 CLAUDE.md**（第 12 条）：写一份给 Ocean 照着做的步骤（用已经连着的 Flux 文件夹，⛔ 不新连、不往文件夹里写东西）：在 Claude 桌面版 Cowork 里打开它，不提 Spool，问「这个文件夹对应哪个项目 / 有什么协议」，看它有没有自己读 CLAUDE.md → SPOOL.md。结果等 Ocean 做完记进回执和 DISCOVERED-20261025-8。

**最后**：全套检查（tsc、vitest、cargo test、i18n 含 `--dead`、clippy 改动的行上没有新警告）→ 改了界面的地方用真组件加假数据截图（harness 最新在 `~/Desktop/Spool/P10-screenshots-20261027/harness/`），放 `~/Desktop/Spool/P12-screenshots-<日期>/` → 换装（照 P10 任务书 §6.7 / §7.5 的做法：同一个 Developer ID、`APPLE_SIGNING_IDENTITY`、只出 .app；停 GUI 之前先问 Ocean 有没有没点「完成」的编辑；`lsappinfo` 看 GUI；备份库和 json；旧 app 挪到 `~/Desktop/Spool/spool-pre-install/`；装完核哈希、签名、库版本、各表逐行、stderr 有 `[double-tap] installed at HID/active`）→ 回执 + 给 Ocean 的验收单（大白话、一步一个动作、按他的英文界面写按钮名）→ HANDOFF §9.3 / §9.8 跟着改。

---

## 4. 已经定了的（Ocean 10-27，别再问）

- 先扫尾再发版（第 230 条）；发版二要 Mac + Windows，Windows 电脑他有了（第 231 条）。
- 推广 / 营销闸门那条到发版二再说（第 232 条）。
- 十二条全做（第 233 条）；改提示词的真跑 = DeepSeek 3 + Codex 3、≤ 0.5 美元（第 234 条）。
- 「改过」标到什么时候：§3 第 2 步写的默认（打开过就消失）是执行窗定的；Ocean 验收时不同意再改。

---

## 5. 红线

- ⛔ 不碰 `docs/EXECUTION_POLICY.md`。
- ⛔ 只做这十二条；不加新的建议动作种类、不改周回顾材料的范围、不加系统权限。
- ⛔ 要改库结构，先停下来问 Ocean。
- ⛔ 不推送、不发版（问过再说）；仓库是 PUBLIC。
- ⛔ 提交说明里不带任何署名尾巴、不写执行用的工具名（CLAUDE.md §5），每次提交后跑 §5 那条自查。
- ⛔ HANDOFF 和 `docs/README.md` 里有别的窗口没提交的段落：只提交自己的改动（记忆 `isolated-verify-workflow` §54 的 `hash-object` / `update-index` 做法；⛔ 别用 `git stash`）。
- ⛔ 真跑只在库副本上；引擎的 CLI 拿不到 `SPOOL_DATA_DIR` 这件事 P12-4 修完之前，试验台照旧自己绕（§54）。

---

## 6. 要读的文件和命令

`src-tauri/src/mcp.rs`（周回顾提示词、`weekly_fresh_blocks_text`、`gate_stop_message`、`plain_path`、`stale_ws_why_rule`）· `src-tauri/src/weekly_review.rs` · `src-tauri/src/engine.rs`（`run_env`、`server_args` 和三个配置函数）· `src-tauri/src/api_engine.rs`（`p10_real_runs`）· `src-tauri/src/folder_link.rs` · `src-tauri/src/images.rs` · `src/stores/knitStore.ts` · `src/stores/blocksStore.ts` · `src/components/RightRail/ProjectFiles.tsx` · `scripts/i18n-check.mjs`。
上一轮的做法和回执：`docs/archive/product-taskbooks/TASKBOOK-P10-STRUCTURED-WEEKLY-REVIEW-2026-10-26.md`（§6.3 / §7.2 判定标准、§6.7 / §7.5 换装）。

---

## 7. 回执

### 7.1 开工核对 §2（10-27，对着 `7ffa2b8`）

基线：`tsc` 干净；vitest 129 个文件 / 1252 条（织布那条单独连跑 30 次挂 4 次，就是第 5 条）；cargo 287 过 / 14 ignored；`i18n-check` 不缺，`--dead` 99。

| # | 对不对得上 | 说明 |
|---|---|---|
| 1 | 对 | `WEEKLY_API_SYSTEM` 和它拼进去的 `WEEKLY_JSON_ZH` 只有中文；CLI 那条按界面语言挑 `_ZH` / `_EN`，但两份 JSON 说明里都没说 did / why 这几栏用什么语言写 |
| 2 | 对 | `weekly_review_json_prompt_text` 第 1 条原样就是那句（中英两份都是） |
| 3 | 对，多一处 | 「这一周新加的」每个项目一行 `## 项目名`；「还开着的跟进」那一段（P10 验收第一轮加的 `weekly_follow_ups_text`）也是 `## 项目名`，但那一段下面只有跟进行、没有块正文，撞不上，这一窗不动它 |
| 4 | 对 | `run_env` 只给 PATH / HOME / USER（Codex 加 CODEX_HOME、Gemini 加 GEMINI_API_KEY）；试验台的绕法在 `api_engine.rs` `real_cli_weekly_on_a_copy` 那一行 `-c mcp_servers.spool.env=…` |
| 5 | 对 | `knitStore.ts` `redeem` 拿 `Date.now()` 当身份。复现：让两次织成落在同一毫秒，5 次挂 5 次 |
| 6 | 对 | 行号也对（7090 / 7128） |
| 7 | **对不上** | 「文件夹唯一的项目被删，SPOOL.md 先不动」**现在已经不是这样**：P9Y 第二轮把连接改成工作区级之后，删项目（哪怕是唯一一个）下一次刷新就写成「（这里还没有项目）」，名字已经没了（单元测试实测）。**现在还留名字的是另一种：连着文件夹的那个工作区整个被删**（工作区连同里面的项目一起软删）——那时文件夹没有一个活着的连接，刷新什么都不写，工作区名和项目名都留在 SPOOL.md 里（实测）。P12-2 修的就是这一种：下一次启动时，删得比这一次打开更早的（已经撤销不了），从 SPOOL.md 里拿掉 |
| 8 | 对，补一条 | v36 那两列（`extracted_size` / `extracted_mtime`）只说得出「文字是从哪一版读的」，说不出「用户打开过没有」。能用的是 v33 的 `target_notice` —— 它在库里的意思本来就是「还要告诉用户的事」（现在有「跟到了新位置」「知道了」两种）。P12-2 打算往里多放一种「改过、还没打开看」，**不加列、不加表**；细节见 P12-2 回执 |
| 9 | 对 | `images.rs` 600 – 625 行；那张图在 `TemporaryItems/NSIRD_screencaptureui_*` 里，Spool 现在只拿它当「继续等」的信号 |
| 10 | 对 | `STALE_WS_SYSTEM` 的 B 类就是项目级 |
| 11 | 对 | 99 条。P9A 那 87 条（在 `7efc7b5` 上重跑同一个脚本复原的清单）一条不少都还在；新增 12 条 |
| 12 | 对 | 四处写入都在 `folder_link.rs`（SPOOL.md、`.git/info/exclude`、CLAUDE.md 的 `@SPOOL.md`、AGENTS.md 一行） |

### 7.2 P12-5 真跑：先写死的判定标准（跑之前写的，跑完不改）

**在哪跑**：`~/Desktop/Spool/P12-realrun-20261027/lib/` —— 10-27 23:02 真库 `VACUUM INTO` 的副本（v37、1310 块、67 个活项目）+ 一份 settings.json，**界面语言改成 en**（要验的就是英文界面；⚠️ 真库那份 settings.json 现在写的是 `zh`，和「我的界面是英文」对不上，回执里问）。真库一个字不碰；证明：CLI 那条起的 `spool --mcp` 把 `mcp-clients.json` 写进副本目录，真库那份的修改时间跑前跑后不变。原始数据（提示词、材料、模型原话、读好的 JSON、token、余额）全存在那个文件夹里，⛔ 不进仓库；key 只走环境变量，跑完 `grep -r` 那个文件夹确认没有。
**用什么跑**：和 app 一样。API 那条 `weekly_material_for_api` + `weekly_messages_for_api` + `spool-ai`（DeepSeek：`deepseek-v4-flash`、思考 low、温度 0.2，和你的设置一样）；CLI 那条 `weekly_review_headless` + `engine::codex_args`（`SPOOL_DATA_DIR` 走 P12-4 那条路，试验台不再自己插 `-c`），MCP 服务是这一次构建的 `target/debug/spool`（`--engine-run --engine-weekly`）。两条都过 `weekly_structured`。
**次数和钱**：DeepSeek 3 次、本机 Codex 3 次；P12 一共（含 P12-7 那 1 次 DeepSeek）不超过 0.5 美元，以 DeepSeek 余额前后差为准（余额有十几分钟延迟：跑完至少 15 分钟再读一次）。Codex 走订阅，只记 token。

**判定标准**（每条路分开算，跑成的几次合在一起）：

| # | 看什么 | 过的线 |
|---|---|---|
| 1 – 9 | 和 P10 任务书 §7.2 一样：解析 100%；引文过闸 ≥ 80%；**标题对不上整项丢 = 0**（这一条现在也是在验 `==== 项目名 ====`）；六种以外的动作 = 0；模型自己截断的字段 = 0；花费（见上）；结果里的已完成项目 = 0；和还开着的某一行一字不差的新跟进 = 0；关跟进照实报、不设线 | 同 P10 |
| 10 | **英文界面下这几栏是英文**：did、stuck、signals[].why、actions[].why、add_follow_up 的 text、next。一栏怎么算「英文」：先去掉这一栏里出现的项目标题原文（材料里有的那些）和成对引号里的内容（「」『』“”"" 〈〉），剩下的非空白字符里汉字占比 ≤ 10% | 两条路各自 **≥ 95% 的栏是英文，并且没有一栏汉字占比 > 50%**（整句中文）。不是英文的栏原话列进回执 |
| 11 | 照抄的没被翻译：quote、old_quote、new_quote、关跟进的 line | 已经由第 2 条的闸量着（翻了就对不上原文）；另报丢掉的引文里有几条是翻译造成的 |
| 12 | **CLI 每次的输入**（P10 两轮：第一次 43 – 44 万 token，另两次 3.1 – 3.4 万） | **每次 ≤ 100,000 token**；另报每次调了几次 `get_pack` / `get_blocks` |

没过的那一条照实写进回执，⛔ 不为了让它过去改判定标准或改提示词再跑（要改提示词先问 Ocean，次数照算）。

### 7.3 P12-5 真跑结果（10-27 23:06 – 23:10 Europe/London）

DeepSeek 3 次、本机 Codex 3 次，全在 §7.2 那份副本上；原始数据、逐条分析、汇总表在 `~/Desktop/Spool/P12-realrun-20261027/`（`SUMMARY.md`、`raw/analysis.txt`），⛔ 没进仓库。**真库没碰**：CLI 那条起的 `spool --mcp` 把 `mcp-clients.json` 写进了副本的 `lib/`（P12-4 那条路生效了 —— 试验台没插 `-c`）；真库那份修改时间、codex 的 `last_seen` 跑前跑后一样。key 在那个文件夹里 grep 不到。

| # | 判定标准 | 本机 CLI（Codex） | DeepSeek | 过没过 |
|---|---|---|---|---|
| 1 | 解析 100% | 3 / 3 | 3 / 3 | ✓ |
| 2 | 引文过闸 ≥ 80% | 69 / 69 | 63 / 63 | ✓ |
| 3 | 标题对不上整项丢 = 0 | 0 | 0 | ✓（`==== 项目名 ====` 没让模型抄错标题） |
| 4 | 六种以外 = 0 | 0 | 0 | ✓ |
| 5 | 模型截断 = 0 | 0 | 0 | ✓ |
| 6 | 花费 ≤ 0.5 美元（P12 合计） | 订阅 | **¥0.09**（余额 ¥44.87 → ¥44.78，跑完 8 分钟就动了、11 分钟时没再变；余额是整个账户的数） | ✓ |
| 7 | 结果里的已完成项目 = 0 | 0 | 0 | ✓ |
| 8 | 和已有跟进一字不差的新跟进 = 0 | 0 | 0 | ✓ |
| 9 | 关跟进 | 3 次都没提 | 3 次都提、都过闸：都是〈Flux〉「MIDI-GPT 是否发布新版本…」那一行，依据「MIDI-GPT 于 2026-10-20 发布 v0.4.0」，都找到了回答它的块 | 照实报 |
| 10 | 英文界面下这几栏是英文：≥ 95%、没有整句中文 | **139 / 139**，整句中文 0 | **19 / 121（16%）**，整句中文 91 | CLI ✓ · **DeepSeek ✗** |
| 11 | 照抄的没被翻译 | 引文 69 / 69 过闸、标题全对上 | 63 / 63 过闸、标题全对上 | ✓（丢掉的引文 0 条，没有翻译造成的） |
| 12 | CLI 每次输入 ≤ 100,000 token | 35,522 / 35,522 / 33,656；**三次一次 `get_pack` / `get_blocks` 都没调** | — | ✓（P10 两轮第一次都是 43 – 44 万） |

- **DeepSeek 那条没过第 10 条**：提示词里那一句在（发出去的 system 第 7 条是 "Write did, stuck, every why, the text of add_follow_up and next in English…"，第 2 条也已经是「nothing this week」），可三次里两次整份中文（0 / 42、0 / 41），一次一半英文（19 / 38，next 是英文）。我的判断：一份几乎全中文的 system（规则和 JSON 说明都是中文、字数上限也按「字」写）+ 全中文的材料，中间夹一句英文，压不过去。⛔ 照 §7.2 没改提示词再跑 —— 怎么改要你定，见 §7.12 第 1 条。
- CLI 那条三项都过，英文 100%、一个工具都不调（以前第一次会把 20 多个项目 `get_pack` 一遍）。截图 `review-en.png` 就是 cli-1 那一份真结果放进周回顾页的样子：做了什么 / 卡在哪 / 为什么 / 建议是英文，依据原话和项目名照原文。
- **这一轮不足以支撑什么**：只有一周的材料；英文那几栏只看了「是不是英文」，没评写得好不好；DeepSeek 的语言只有 3 次，第 3 次一半英文说明它不是完全不听，是不稳。
