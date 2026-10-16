-- Spool data model (PLAN_EN.md §8.1). Three tiers: Workspace → Thread → Block.

-- Workspace: big topic. The thinnest tier — just a grouping container.
-- v23 (DESIGN_WORKSPACE_PACK §4): a workspace may sit inside another one. `parent_id` is
-- NULL for a top-level workspace and holds another workspace's id otherwise. No foreign
-- key on purpose — deletes here are soft (deleted_at), so the row a child points at is
-- still present; orphan handling lives in lib/db/workspaces.ts, not in the engine.
CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,            -- nanoid
  title       TEXT NOT NULL DEFAULT '',
  parent_id   TEXT,                        -- NULL = top level; else the enclosing workspace
  sort_order  INTEGER NOT NULL DEFAULT 0,  -- manual sidebar ordering
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER
);

-- Thread: small project.
-- v2.6 rollback: dropped `progress` (manual % theater) and `next_step` (manual note that
-- failed dogfooding) — see §2.6. Schema migrates via ALTER TABLE DROP COLUMN (SQLite 3.35+).
CREATE TABLE IF NOT EXISTS threads (
  id                 TEXT PRIMARY KEY,
  workspace_id       TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title              TEXT NOT NULL DEFAULT '',
  summary            TEXT,                        -- active-stage status summary (optional)
  summary_source     TEXT,                        -- 'user' | 'mcp' | NULL; MCP never overwrites a non-'mcp' summary
  -- v16 (§5-5, Ocean 2026-08-08): when the summary above was last written, ms epoch.
  -- ⚠️ Deliberately NOT shown in the UI — Ocean asked for it recorded, not displayed. It
  -- exists so "is this card stale?" stops being a guess. NULL = written before v16.
  summary_at         INTEGER,
  digest             TEXT,                        -- conclusion summary at completion (optional, may be empty)
  deadline           INTEGER,                     -- optional, ms epoch
  status             TEXT NOT NULL DEFAULT 'active', -- active | parked | done
  is_capture_target  INTEGER NOT NULL DEFAULT 0,  -- exactly one row globally may be 1
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  completed_at       INTEGER,                     -- time status became done
  deleted_at         INTEGER,
  -- v11 (DESIGN_FOLLOW_UP §3.2): what this project wants watched on the open web, and
  -- what the last run already saw. NULL brief = follow-up is off for this project, which
  -- is why there is no separate on/off column.
  --
  -- ⚠️ v22 (DESIGN_FOLLOW_UP §8.2, Ocean 2026-08-16「合成一份清单」): `follow_up_brief` is
  -- a LEGACY column. What a project follows up now lives one row per line in
  -- `follow_up_items`, because the list holds two kinds of line with different lifetimes
  -- and only rows can be pointed at individually. The v22 migration copied every line
  -- across; nothing reads this column any more.
  -- ⚠️⚠️ It is kept, not dropped, and so are the three `follow_up_brief_suggested*`
  -- columns below: dropping a column in SQLite rebuilds the whole table, and a rebuild
  -- branch is what emptied the live library on 2026-05-29. An unread column costs nothing.
  follow_up_brief    TEXT,
  follow_up_state    TEXT,                        -- JSON: last run time + URLs/fingerprints already proposed
  -- v12 (DESIGN_WORKBENCH §4.3): per-project opt-out for automatic maintenance.
  -- NULL = follow the master switch; 0 = never touch this project automatically.
  -- Deliberately not a boolean defaulting to 1: "the user has not said" and "the user said
  -- yes" are different states, and only the first should follow a switch flipped later.
  auto_maintain      INTEGER,
  -- v19 (决定 5, HANDOFF §4-1): an AI's proposed rewrite of `follow_up_brief`, parked until
  -- the user reads it. It is NEVER written into `follow_up_brief` by the tool.
  --
  -- ⚠️ This column exists because the brief is not content — it is the standing instruction
  -- Spool goes out to the open web with. A page a follow-up run fetched could otherwise
  -- rewrite what the next run goes looking for (web page → brief → next search), which is
  -- exactly the injection-to-privilege chain DESIGN_FOLLOW_UP §2.5 draws. Parking the
  -- suggestion here keeps the human step §6-2 拍板 in place: the user reads it on the review
  -- screen, and only their click moves it across.
  follow_up_brief_suggested    TEXT,
  follow_up_brief_suggested_by TEXT,     -- the client that proposed it, for the review card
  follow_up_brief_suggested_at INTEGER,
  -- v34 (P9E, Ocean 2026-10-15 第 119 – 123 条): 1 = a private project. The AIs connected
  -- through Spool's MCP cannot read it and are not told it exists (they may still write into
  -- it), and none of Spool's own AI features touch it. The user sees and uses it as usual.
  -- ⚠️ It keeps out what Spool hands to an AI — not an AI that reads this file off the disk.
  private            INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_threads_workspace
  ON threads(workspace_id, updated_at DESC) WHERE deleted_at IS NULL;

-- v22 (DESIGN_FOLLOW_UP §8.7) — one row per line of what a project follows up.
-- One list, as Ocean decided on 2026-08-16, holding two kinds of line:
--
--   standing = 1  a watch that never completes ("has the deadline moved"). An AI may NOT
--                 close it — it can only propose retiring it, which the user settles.
--   standing = 0  a question that retires the moment it is answered.
--
-- ⚠️ The marker is what keeps merging the two into one list safe (§8.2): without it, an AI
-- that answers "the deadline is March 1" closes the standing watch as well, and the project
-- silently stops being watched — the one thing this feature exists to do.
CREATE TABLE IF NOT EXISTS follow_up_items (
  id              TEXT PRIMARY KEY,
  thread_id       TEXT NOT NULL,
  text            TEXT NOT NULL,             -- one line: the thing watched, or the open question
  why             TEXT,                      -- one line: why it matters here (AI-proposed rows)
  standing        INTEGER NOT NULL DEFAULT 0,
  -- Identity for the duplicate check, computed on BOTH sides (followUpFingerprint in
  -- lib/engine/followUp.ts, follow_up_fingerprint in mcp.rs): lowercase + collapsed
  -- whitespace, kept that simple precisely so the two agree exactly.
  fingerprint     TEXT NOT NULL,
  -- 'proposed' → waiting on the review screen (§8.4: an AI may never file one directly,
  -- because a line here outlives this conversation and steers the next one's searches)
  -- 'open'     → live
  -- 'answered' → retired but still visible and reopenable (§8.6: closing is not deleting)
  -- A rejected proposal leaves no row at all — same rule as a rejected block proposal.
  status          TEXT NOT NULL,
  proposed_by     TEXT,                      -- the client that proposed it, for the review card
  sort_order      INTEGER NOT NULL,
  created_at      INTEGER NOT NULL,
  approved_at     INTEGER,
  last_raised_at  INTEGER,                   -- §8.5: so the same line is not raised twice a day
  answered_at     INTEGER,
  answer_block_id TEXT,                      -- the block that answered it; NULL is legitimate
  outcome         TEXT                       -- one line: what the answer was ("nothing changed")
);

CREATE INDEX IF NOT EXISTS idx_follow_up_items_thread
  ON follow_up_items(thread_id, status, sort_order);

-- Block: a captured fragment, a handwritten draft, or an @-reference.
-- A file/folder/URL becomes an attachment on a block (see §9.6) — there is no anchor kind.
CREATE TABLE IF NOT EXISTS blocks (
  id            TEXT PRIMARY KEY,
  thread_id     TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL DEFAULT 'text',  -- text | ref
  content       TEXT NOT NULL DEFAULT '',       -- the block's main text (captured or written) / ref display name
  annotation    TEXT,                           -- the user's own note about this block (optional)
  ref_thread_id TEXT,                           -- kind=ref: the thread pointed to
  ref_block_id  TEXT,                           -- v7 (§20.13 v2.4 D2): block-level citation, declared by the writer at insert; unenforced FK (cited block may be deleted later)
  source        TEXT,                           -- provenance label; auto-filled at capture, user-editable
  pinned        INTEGER NOT NULL DEFAULT 0,      -- marked as core context
  seq           INTEGER,                        -- v9: the block's human-visible number within its thread (#12); see below
  created_at    INTEGER NOT NULL,
  -- v13 (DESIGN_CONTEXT_HYGIENE §3.1): supersession — the one memory-governance strategy
  -- Spool did not have. Age, recency and salience were all covered; nothing recorded that a
  -- block had stopped being TRUE, so a conclusion overturned three weeks ago still read as
  -- current to every AI the pack was handed to.
  --
  -- `stale_at` is Zep/Graphiti's `invalid_at`, not an invention: when the user said this no
  -- longer holds. NULL = still valid. The block itself is never edited and never deleted —
  -- TOKI's distinction, which this column exists to honour: superseding keeps the evidence
  -- of how a belief changed, deleting erases the history. A stale block stays searchable,
  -- stays readable through get_blocks, and simply stops being served as current in packs.
  --
  -- ⚠️ Only the user writes it. AI may not declare supersession (§3.1 «谁能用»): whether a
  -- conclusion still holds is information only the user has, and a wrong guess deletes a
  -- correct conclusion from every future pack — far worse than one more noisy block.
  stale_at      INTEGER,
  -- v13: what the existing `ref_block_id` MEANS. NULL / 'cites' is every row written before
  -- v13 and every citation since — unchanged behaviour. 'supersedes' = this block replaces
  -- that one wholesale (the old one carries stale_at too). 'corrects' = one point inside
  -- that block is wrong; the old block is NOT touched and keeps rendering in full, which is
  -- the §3.1.1 answer to «替代信息大多是大段文字里的一句话» — correcting a sentence must not
  -- cost a re-paste of the other 1,900 characters.
  ref_kind      TEXT,
  -- v14 (DESIGN_CONTEXT_HYGIENE §9.3 拍板乙): WHO wrote `annotation`. The pack's Notation
  -- section tells every receiving AI that `note:` is the user's own words and to weigh it as
  -- 💭 Personal even on a 📖 Reference block — and `add_block` / `propose_blocks` both let an
  -- AI supply `annotation`. So an AI-written sentence could take the highest authority the
  -- pack has, and after W7 (§3.2, annotation-as-title) it could take the block's NAME too.
  -- Nothing recorded the difference, because before MCP could write there was none.
  --
  -- NULL = unknown: every row written before v14. Readers fall back to the block's `source`
  -- for those (an MCP-labelled block's note was written by that client) — the same proxy the
  -- cheap version of this fix would have used everywhere, but confined to rows that predate
  -- the column. 'user' / 'ai' are explicit and always win over the proxy.
  --
  -- ⚠️ The proxy is why this is not a backfill: the migration writes no user data at all
  -- (2026-05-29 wipe class), and the first time the user edits any note the row self-heals
  -- to an explicit 'user' — which is exactly the case the proxy gets wrong.
  annotation_by TEXT,
  -- v20 (DESIGN_MCP_INTENT_ROUTING §4.6, Ocean 拍板乙 2026-08-09): where a block came from
  -- OUTSIDE the library, and whether it has gone off.
  --
  -- `source` already carries a provenance LABEL, but it is one line rendered inside every
  -- block bracket on every surface, so a URL in it pushes the reader's eye off the body —
  -- and it says nothing about time. A block written from a program's admissions page is
  -- true on the day it is read and quietly false a year later; nothing in Spool could tell
  -- those two apart, which is the same disease v13 treated for conclusions the user
  -- retired by hand, one step upstream.
  --
  -- All three are NULL on every row written before v20 and on every row the user writes by
  -- hand — the UI has no input for them and deliberately does not get one (§4.6: their user
  -- is the model that went and looked something up; an input box would tax the main path
  -- for a case it never hits). Only add_block and propose_blocks fill them in.
  --
  -- ⚠️ `retrieved_at` / `recheck_after` are DATES, stored as UTC midnight in unix ms. They
  -- are not moments — "查于 2026-08-09" means the day, and a day rendered through the
  -- machine's local zone would read as a different day either side of the date line. Every
  -- other timestamp here IS a moment (created_at, stale_at) and stays local-rendered; these
  -- two are formatted by format_utc_date / formatUtcDate, which is what makes them
  -- round-trip to the same characters the caller sent.
  source_url    TEXT,
  retrieved_at  INTEGER,
  recheck_after INTEGER,
  -- v21 (Ocean 2026-08-10, after §7 sentence 5 ran on ChatGPT): the sentence in the CITED
  -- block that this block corrects — quoted verbatim from it, by whoever wrote the
  -- correction. Meaningful only on a row whose ref_kind is 'corrects'.
  --
  -- v13 gave a correction a target (`ref_block_id`) but no aim. Ocean read the result in
  -- the real library: 「展开也不知道到底是哪里被修改了」— a 1,900-character block flagged as
  -- containing one wrong point, and no way to find which. The §3.1.1 bargain (correcting a
  -- sentence must not cost a re-paste of the other 1,900 characters) is what makes that
  -- unavoidable without this column: the correction never contains the old text.
  --
  -- Stored as the quote and matched by substring at render time rather than as offsets.
  -- Offsets would be a lie the moment the user edits the cited block by one character,
  -- and they would be a lie SILENTLY — pointing at the wrong words is worse than pointing
  -- at none. A quote that no longer matches simply stops being drawn, and the block-level
  -- 「one point in this block was corrected later」 warning stands on its own.
  --
  -- NULL on every pre-v21 row and on every model that does not fill it in; both degrade to
  -- exactly the v13 behaviour.
  -- ⚠️ 2026-08-19: hand-written corrections now DO carry it. They are made by selecting the
  -- wrong sentence in the block itself, and the quote is cut out of `content` by the raw
  -- offsets of that selection (selectionRange.ts) — never by searching for the words on
  -- screen, which the renderer has already stripped `**` and `## ` out of. So the invariant
  -- holds for every writer alike: whatever is stored here occurs verbatim in the block.
  corrected_quote TEXT,
  -- v24 (COMPRESS-UX-R2-2026-08-22 §1, Ocean 2026-08-22): 压缩前的原文，跟着块走。
  --
  -- 他的原话：「不行，复制入库摩擦太大……直接让用户自己审核、替换原库文字；但是未压缩的
  -- 原库需要备份保存，默认备份，用户可关……被压缩的 block 带一个 compressed 的标签，
  -- 用户可以回 spool 拿到原始信息。」
  --
  -- ⚠️ 他明说推翻了「库里一个字都不动」那条锁。锁是他定的，也只有他能解 —— 他解了。
  --
  -- **为什么是「原文跟着块走」，不是整库快照。** 快照做不到一一对应：压缩会合并、会重编号，
  -- 于是「这一块压之前长什么样」在快照里根本定位不到。一块自己带着自己的原文，天然对得上，
  -- 导出、备份、换机器都跟着走。代价是库大约 1.8 倍 —— 只是磁盘，⛔ 不进 pack。
  --
  -- NULL 有两种意思，⚠️ 两种都不能当成「有原文」：
  --   * 这一块从来没被压过（v24 之前的每一行，和之后没压过的每一行）；
  --   * 压过，但用户把「备份原文」关掉了 —— 那一次压缩**不可逆**，界面必须当场说清楚。
  -- 分辨这两种看 `compressed_at`：它非空而这一列是 NULL，就是第二种。
  original_content TEXT,
  -- v24: 这一块是什么时候被压过的。NULL = 从来没压过。
  -- ⚠️ 它同时是「只压新块」那条规则的依据（R2 §1e）：组压缩用的 pack 时跳过它非空的块 ——
  -- 一块压过一次就不再花第二笔钱去压，也不会被压第二遍越压越短。
  compressed_at INTEGER,
  -- v26 (WORKPLAN §2.S8, Ocean 2026-08-24) —— **这一块整体是什么**，一句话（50–100 字）。
  --
  -- 要解决的:一个 2,000 字的长块,`search_blocks` 今天只还得回一个命中片段,**还不出这块
  -- 整体是什么**。跨项目找东西时(实测 39 个项目 / 195 块),那是唯一的入口。
  --
  -- ⭐ 这是从整套 RAG 工具箱里**唯一活下来**的那一条(`RESEARCH_RAG_CONTEXT-2026-08-24` §7)。
  -- 它能过红线,靠的是三条:**它是文本不是向量** —— 所以确定、能 diff、**用户能改**。
  --
  -- ⛔ **三条不许**:
  --  ① 不建向量索引、不算嵌入(理由:确定性 / 写入路径被拖下水 / 体积 10–50 倍);
  --  ② 不做 AI 生成的层级或摘要树(`DESIGN_CONTEXT_HYGIENE` §2.6:会过时,而用户维护的层级不会);
  --  ③ ⛔⛔ **这句话不许进 pack 正文冒充块** —— 它是给搜索用的,不是第五种权威。
  --     pack 有四带(📖/🧩/🔄/💭),这一句一带都不属于。
  --
  -- ⚠️ 渐进披露那条泼冷水的证据仍然管着它(§2.5 第 2 条:「第二层路由从来没帮上忙,
  -- 有时候直接把准确率弄坏」)——⭐ 所以它只做**搜索命中的说明**,
  -- ⛔ 不许长成「先看目录再决定读哪块」那种第二层路由。
  --
  -- ⚠️ 它**不进 `blocks_fts`**:落点是「命中之后多告诉你一句这块是什么」,不是「多一处能被
  -- 匹配到的地方」。要改成可匹配得动 FTS 触发器,那是另一件事,另开一版。
  gist TEXT,
  -- v28 (WORKPLAN §2.Q1, Ocean 2026-08-25) —— **为什么引它**,一句话。
  --
  -- 起因是他读真库 Flux `#16`(引用 `#9`)：引用行截出来的是被引块的正文开头
  -- 「Dear Hanze, I have great news for you — …」,既不是那一块说了什么,也不是为什么引它。
  -- `gist` 补的是前一半(「那一块整体是什么」),这一列补的是后一半 ——
  -- **这一头的块为什么要指过去**。他的例子：「比如这里 block 9,可以让 AI 写一句：
  -- 教授回复了邮件,项目重启」。
  --
  -- ⭐ **为什么是往 `blocks` 加一列,不是另开一张表**(Ocean 2026-08-25 原话:「认可：加一列,
  -- 不开新表」)：它和 `corrected_quote` **是同一个形状** —— 同一条关系的元数据,挂在**声明
  -- 这条关系的那一行**上。拆到第二张表意味着每次渲染 pack、每条引用行都多查一次,
  -- 而且删块时要自己收拾(blocks 这边有 FK 级联,新表没有)。
  --
  -- ⚠️⚠️ 那条「别往 blocks 表加列」**不是废了,是有了例外**。它当初是在 `V 批`(浏览位置)
  -- 的语境里定的：那一次要存的是**视图状态**,寿命和块本身不是一回事,所以落在新表
  -- `read_positions` 上,对。这一次要存的是**内容**(AI 写下的一句话,进 pack、给下一个模型读)。
  -- ⛔ 下次再有人想往 blocks 上加列,仍然要**重新问一次** —— 这一条不是通行证。
  --
  -- ⚠️ 只在 `ref_block_id` 非空时才有意义,**没有引用却给了理由 = 写入被拒**(mcp.rs)。
  -- 而且非 `corrects` 的引用**必须**给(Ocean 2026-08-25 拍)：`corrects` 已经有
  -- `corrected_quote` 和更正正文两处在说「为什么」,再要一句是重复收费。
  --
  -- NULL:老引用一条都没有(v28 之前写的每一行),和用户手写的引用 —— 界面照旧退回 `gist`。
  ref_note TEXT,
  -- v28 (§2.Q1)：`gist` 这一行是谁写的。'user' | 'ai' | NULL。
  --
  -- 为什么现在才需要：v26 的 `gist` 只有 `add_block` 那一刻能写,写它的只有 AI,所以「谁写的」
  -- 没有第二种答案。`Q2`(`set_block_gist`)和 `Q4`(「摘要」页签)一起把它变成**两边都能改**
  -- 的一行 —— 那一刻起,一句 `set_block_gist` 就能把用户改过的那句悄悄盖掉。
  --
  -- ⚠️ 这不是新发明,是第三次：`threads.summary_source`(v6)和 `blocks.annotation_by`(v14)
  -- 是同一件事的两次先例,连拒绝的话术都是现成的(`set_thread_summary`)。
  -- 规矩同样照抄：**MCP 永远不盖掉非 'ai' 的那一行**,拒绝时把自己那句建议说给用户听。
  --
  -- NULL = 不知道,也就是 v28 之前写的每一行。⚠️ 那些**全是 AI 写的**(v26–v27 期间
  -- `gist` 只有 `add_block` 一条写入路径),所以读的时候按 'ai' 待,⛔ 但不回填 ——
  -- 迁移不写用户数据(2026-05-29 抹库那一类),用户第一次自己改摘要时这一行自愈成 'user'。
  gist_by TEXT,
  -- v29 (F2 施工单 §3.2 ④, Ocean 2026-08-30)：**这条引用的「已经审过」记号。**
  --
  -- 存的是「用户按下『我知道了』的那一刻,**被引的那一块** `stale_at` 是多少」——
  -- ⛔ 不是一个布尔。三件事必须同时成立,而只有「对方当时退役在哪一刻」这一个值同时给得出:
  --   ① 下次打开不再重复问 → 记住的值 == 对方现在的 `stale_at`;
  --   ② 引用改到别处**不继承**确认 → `setBlockSupersession` 改写 `ref_block_id` 时
  --      顺手把这一列清空(那条确认说的是「我看过**那一块**退役了」,换了目标就作废);
  --   ③ 对方恢复有效、以后又重新退役 → 新的 `stale_at` 和记住的值不等 → **重新进待审**。
  --   ⚠️ 布尔在 ② 和 ③ 上都会给错答案,而 ③ 走的是日常路径 ——
  --   退役按钮是个纯开关(`BlockItem.tsx`,「the action is its own inverse」)。
  --
  -- ⚠️ 挂在**声明这条关系的那一行**上,和 `corrected_quote` / `ref_note` 同一个形状:
  -- 一块只有一条出向关系(`ref_block_id` 是单列),所以不需要第二张表。
  -- ⛔ 这**不是**「往 blocks 加列」那条规矩的通行证 —— 见上面 `ref_note` 那一段,下次仍要重新问。
  --
  -- ⛔ `proposals` **不加这一列**:待审的提案从来没有被审过,那一列在那边恒为 NULL。
  --
  -- NULL = 这条引用没被审过(v29 之前的每一行,以及每一条新写的引用)。
  ref_reviewed_stale_at INTEGER,
  -- v32 (P7-3, Ocean 2026-10-07 HANDOFF §9.2 第 41 条)：**这一块被第几块整条取代了** —— 记在
  -- **旧块**身上的块 id，和 `stale_at` 一起写（取代 = 退役 + 记住被谁取代）。
  --
  -- 为什么挪到旧块上：v13 起「取代」占的是**新块**那一格（`ref_block_id` + `ref_kind='supersedes'`），
  -- 一块只有一格 ⇒ 一块新的只能取代一块旧的，而且取代了就不能再更正别的块（Flux #20 那一摊）。
  -- 记在旧块上，一块新的可以取代任意多块，新块原来的更正 / 引用一个字不动。
  -- ⚠️ 只有这一种入向关系存在旧块上；「更正」仍在新块那一格（一块只更正一块）。
  -- ⛔ 不叫 `superseded_by`：`attachments` 上那一列装的是**文件** id，同名会看错。
  --
  -- NULL = 没被取代 / 用户手动退役 / v32 以前的取代（那些仍记在新块的
  -- `ref_kind='supersedes'` 上，⛔ 没有回填）。手动「取回来」时和 `stale_at` 一起清。
  replaced_by_block_id TEXT
);

-- v9 (DESIGN_SCHEMA_V9 H-1): `seq` is the number a human sees and says out loud — "#12"
-- in the block stream, "#12" in the pack — so an AI can point at one block and the user
-- can find it. It is STORED, never derived: a "12th by time" rule would renumber every
-- later block the moment one is deleted, and the #12 the user wrote down yesterday would
-- silently point somewhere else. Assigned per thread as MAX(seq)+1 inside the INSERT
-- statement (WAL serialises writers, so the app and the MCP subprocess cannot collide).
-- A delete is a real delete, so deleting the newest block frees its number for the next
-- one; undoing that delete then takes a fresh MAX+1 (restoreBlock). NULL only on rows
-- written before v9's backfill.
-- Internal ids stay invisible: `seq` is for people, `id` is still a tool parameter.
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_thread_seq
  ON blocks(thread_id, seq);

CREATE INDEX IF NOT EXISTS idx_blocks_thread
  ON blocks(thread_id, created_at ASC);

-- v29 (F2 §3.3 三)：「**谁引用了我**」是一次**全库反查** —— 引用可以跨项目指
-- (真库 58 条边里 30 条跨项目,涉及 17 个项目),所以入向边**不能**只在本项目里找,
-- 也就用不上 `idx_blocks_thread`。在这之前每展开一个块的「来龙去脉」都是一次全表扫描。
-- ⚠️ 部分索引:`ref_block_id` 全库只有 58 行非空,索引 485 个 NULL 没有意义。
CREATE INDEX IF NOT EXISTS idx_blocks_ref_block
  ON blocks(ref_block_id) WHERE ref_block_id IS NOT NULL;

-- Attachment: a file or folder belonging to a PROJECT.
-- v2.7: `extracted_text` added — for `file` kinds with extractable text (PDF, docx, txt,
-- md, …), Spool auto-extracts the file's content on attach and caches it here.
-- v2.8 (§20.2): `include_in_pack` splits the formerly-conflated "extract" and "inline into
-- pack/summary" — extraction stays always-on (cheap, local, powers preview); inlining is
-- opt-in per attachment (default 0) so the user controls pack length / token cost.
-- v15 (DESIGN_PROJECT_FILES, Ocean 2026-08-08): an attachment used to hang off ONE BLOCK.
-- It now belongs to the project. The `url` kind is gone with the same decision — a link is
-- not a file, and the two entry points that created them are gone from the block action bar.
-- ⚠️ `target` is only ever written from the system file picker. Nothing may accept a path
-- from anywhere else — that is the whole reason this shape was allowed at all (§2).
-- P6 (Ocean 2026-09-30 §9.2 第 7 条) adds exactly one more door, and it is still the user's
-- hand: an AI may PROPOSE a path (`file_proposals`, after the Rust path gate), and the row
-- here is written only when the user clicks 「同意」 on that card.
-- v30 (P5, Ocean 2026-09-30 / 10-03): a project file can ALSO hang off one block of that
-- project, and the row says who added it and what replaced it. Four nullable columns, all
-- NULL on every row written before v30 — which reads as「挂在项目、用户加的、没被取代」,
-- exactly the v29 behaviour. ⛔ No foreign keys: the real library's `thread_id` came in
-- through ALTER (v15) without one, and what happens to a file when its block goes is the
-- delete path's job (blocksStore), not a cascade's.
--   anchor_block_id  the block this file hangs off; NULL = hangs off the project. ⛔ Not
--                    called `block_id`: v15 dropped a column of that name (a file used to
--                    belong to ONE block) and the v14→v15 step still recognises it by name.
--   added_by         'user' = the user added it (file picker / dropped from Finder).
--                    P6 adds the AI-proposed kind: the same `<client> · MCP` source label
--                    a block written by that client carries. NULL = before v30 = the user.
--   superseded_by    id of the attachment that replaced this one (P6, AI proposal approved).
--   superseded_at    ms epoch when that happened.
CREATE TABLE IF NOT EXISTS attachments (
  id              TEXT PRIMARY KEY,
  thread_id       TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,                   -- file | folder
  target          TEXT NOT NULL,                   -- absolute path, from the file picker only
  label           TEXT NOT NULL DEFAULT '',        -- display name; defaults to basename
  extracted_text  TEXT,                            -- v2.7: nullable; auto-extracted text for file kinds
  extracted_at    INTEGER,                         -- v2.7: ms epoch; null if extraction not attempted
  extraction_kind TEXT,                            -- v2.7: 'pdf' | 'docx' | 'plaintext' | 'failed' | null
  include_in_pack INTEGER NOT NULL DEFAULT 0,      -- v2.8 §20.2: 1 = inline extracted_text into pack/summaries
  ai_access       INTEGER NOT NULL DEFAULT 0,      -- v15 §5.1 ①: 1 = an AI may ask for this file's text
  created_at      INTEGER NOT NULL,
  anchor_block_id TEXT,                            -- v30: block it hangs off; NULL = the project
  added_by        TEXT,                            -- v30: 'user' | P6 `<client> · MCP`; NULL = user
  superseded_by   TEXT,                            -- v30: attachment id that replaced this one
  superseded_at   INTEGER,                         -- v30: ms epoch of that replacement
  -- v33 (P9-2, Ocean 2026-10-10 HANDOFF §9.2 第 63 条)：文件挪了 Spool 跟着找到、找不到的主动说。
  -- 两列都只在运行时写（迁移不填）；NULL = v33 以前挂的 / 还没记成 / 没什么要说的。
  target_identity BLOB,                            -- v33: the bytes the OS recognises this file by
                                                   --   (macOS bookmark / Windows volume + file id);
                                                   --   ⚠️ written and read by Rust only — the front
                                                   --   end's SQL plugin cannot carry bytes
  target_notice   TEXT                             -- v33: JSON, what the user still has to hear:
                                                   --   {"kind":"moved","from":<old path>} = Spool
                                                   --   followed it, not seen yet; {"kind":"dismissed"}
                                                   --   = the user confirmed it is gone, stay quiet
);

CREATE INDEX IF NOT EXISTS idx_attachments_thread
  ON attachments(thread_id, created_at ASC);

-- Full-text search over block text AND the user's annotations.
-- The `trigram` tokenizer indexes every 3-character window, so a keyword is matched
-- mid-word — including inside an unbroken run of Chinese, which the default unicode61
-- tokenizer would treat as a single token and miss. trigram needs a query of ≥3
-- characters; 1–2 character queries fall back to a LIKE scan in lib/search/query.ts.
CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts5(
  content, annotation, content=blocks, content_rowid=rowid,
  tokenize = 'trigram'
);

CREATE TRIGGER IF NOT EXISTS blocks_ai AFTER INSERT ON blocks BEGIN
  INSERT INTO blocks_fts(rowid, content, annotation) VALUES (new.rowid, new.content, new.annotation);
END;

CREATE TRIGGER IF NOT EXISTS blocks_ad AFTER DELETE ON blocks BEGIN
  INSERT INTO blocks_fts(blocks_fts, rowid, content, annotation) VALUES('delete', old.rowid, old.content, old.annotation);
END;

CREATE TRIGGER IF NOT EXISTS blocks_au AFTER UPDATE ON blocks BEGIN
  INSERT INTO blocks_fts(blocks_fts, rowid, content, annotation) VALUES('delete', old.rowid, old.content, old.annotation);
  INSERT INTO blocks_fts(rowid, content, annotation) VALUES (new.rowid, new.content, new.annotation);
END;

-- v9 (DESIGN_SCHEMA_V9 H-3): the text Spool extracts out of an attached PDF/docx used to
-- sit entirely outside the search index — the sentence was demonstrably in the lecture
-- notes and search returned nothing. It gets its own FTS table rather than a column on
-- blocks_fts: blocks_fts is an external-content index (content=blocks), so every one of
-- its columns must be a real column of `blocks`, and the extracted text lives on
-- `attachments`. A second external-content index over `attachments` costs no duplicated
-- storage and keeps the attachment that matched identifiable, which is what lets a hit
-- say "this sentence is in the file, not in the block's own text".
CREATE VIRTUAL TABLE IF NOT EXISTS attachments_fts USING fts5(
  extracted_text, content=attachments, content_rowid=rowid,
  tokenize = 'trigram'
);

CREATE TRIGGER IF NOT EXISTS attachments_ai AFTER INSERT ON attachments BEGIN
  INSERT INTO attachments_fts(rowid, extracted_text) VALUES (new.rowid, new.extracted_text);
END;

CREATE TRIGGER IF NOT EXISTS attachments_ad AFTER DELETE ON attachments BEGIN
  INSERT INTO attachments_fts(attachments_fts, rowid, extracted_text) VALUES('delete', old.rowid, old.extracted_text);
END;

-- Extraction happens AFTER the row is inserted (attach first, extract async), so this
-- update trigger — not the insert one — is what actually indexes most attachment text.
CREATE TRIGGER IF NOT EXISTS attachments_au AFTER UPDATE ON attachments BEGIN
  INSERT INTO attachments_fts(attachments_fts, rowid, extracted_text) VALUES('delete', old.rowid, old.extracted_text);
  INSERT INTO attachments_fts(rowid, extracted_text) VALUES (new.rowid, new.extracted_text);
END;

-- v10 (DESIGN_MCP_WRITE_ROLE §4, M1): the triage review queue.
--
-- These two tables are NOT part of the library. A proposal is something an AI has
-- offered; a block is something the user's library holds. §4.2-2 draws that line as a
-- hard one: proposals never enter the block stream, a pack, a digest or a search — so
-- they live in their own tables rather than as a flag on `blocks`, and every reader of
-- `blocks` stays correct without knowing this feature exists.
--
-- Approval is what turns a proposal into blocks (written through the ordinary insert
-- path, source-labelled like any MCP write); rejection deletes the rows and leaves no
-- trace (§4.3 — a rejection log would turn the queue into a landfill). Expiry is the
-- same deletion, just triggered by time instead of a click.
CREATE TABLE IF NOT EXISTS proposal_batches (
  id               TEXT PRIMARY KEY,
  client           TEXT NOT NULL DEFAULT '',  -- source label the approved blocks will carry
  note             TEXT,                      -- one line from the AI: what this batch is
  source_text      TEXT,                      -- §4.4 A: the whole passage the split came from
  source_thread_id TEXT,                      -- where that passage lands, labelled "<client> — user's own passage"
  created_at       INTEGER NOT NULL,
  expires_at       INTEGER NOT NULL           -- §4.2-3: 7 days, then the batch is void
);

CREATE TABLE IF NOT EXISTS proposals (
  id           TEXT PRIMARY KEY,
  batch_id     TEXT NOT NULL REFERENCES proposal_batches(id) ON DELETE CASCADE,
  thread_id    TEXT NOT NULL,                 -- the project this block would land in
  content      TEXT NOT NULL,
  annotation   TEXT,
  ref_block_id TEXT,                          -- an explicit citation; §4.4 A fills it in on approval
  -- v14 (DESIGN_CONTEXT_HYGIENE §9.3 拍板甲): what the approved block's ref_block_id will
  -- MEAN. Only 'corrects' may ever appear here, and NULL is everything else. §3.1's ban on
  -- AI-declared supersession is unchanged for ①②: those REMOVE the old block from every
  -- future pack, and a wrong guess silently deletes a correct conclusion. ③ removes nothing
  -- — the corrected block still renders in full — so its worst case is one visible extra
  -- line the user can see and undo, which is the risk level of a mis-written citation, and
  -- that has been allowed since v7.
  --
  -- ⚠️ It is a proposal, never a direct write: this column is on `proposals`, not written
  -- by the MCP server into `blocks`. The user approves it in Spool or it expires in 7 days.
  ref_kind     TEXT,
  -- v20 (§4.6): the same three provenance fields the approved block will carry. They ride
  -- through the queue rather than being re-derived on approval, for the reason the queue
  -- exists at all — by the time the user clicks approve the caller is long gone, and a URL
  -- and a retrieval date it did not write down cannot be reconstructed from anything here.
  source_url    TEXT,
  retrieved_at  INTEGER,
  recheck_after INTEGER,
  -- v21: the quoted sentence a `corrects` proposal aims at, riding the queue for the same
  -- reason the three above do — the caller that read the old block is gone by the time the
  -- user approves, and nothing left here could reconstruct which sentence it meant.
  corrected_quote TEXT,
  -- v26 (§2.S8): the same one-line gist, riding the queue so an approved block keeps it.
  -- Same reason corrected_quote rides: the caller that wrote it is gone by approval time.
  gist         TEXT,
  -- v28 (§2.Q1): 引用的理由，同样跟着队列走。⚠️ 少了这一半的话，AI 写的时候给了理由、
  -- 用户点完「通过」理由就没了 —— 而引用行正是它唯一要出现的地方。
  -- ⛔ 这里**没有** `gist_by`：待审的摘要只有一种来路（AI 写的 propose_blocks），
  -- 批准时按 'ai' 落地就够，多存一列等于多一处能 drift 的地方。
  ref_note     TEXT,
  sort_order   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proposals_batch
  ON proposals(batch_id, sort_order ASC);

-- v12 (DESIGN_WORKBENCH §4.1): what the AI actually said.
--
-- This table exists because of a real bug, not a feature request. The three maintenance
-- prompts all tell the model "say the conclusion to the user first, and store it only
-- once they agree" — written for a chat client, where a human IS there to agree. Spool's
-- engine slot runs `claude -p` headless, where nobody can, so the model correctly wrote
-- the whole answer into its final message and stored nothing. That message reached the
-- frontend, was assigned to a local variable, and was dropped on the floor; the user got
-- "跑完了，没有新增块" and reasonably concluded the AI had done nothing.
--
-- So: unlike follow-up state (HANDOFF §3.5, "derived view, no table"), this is NOT
-- derivable from anything. The AI's prose has exactly one copy and it lives here — which
-- is also what finally gives "say it to the user first, they agree, then it is stored"
-- somewhere to happen. The prompts stay word for word as they are.
--
-- Written only by the app (engineStore), never by the MCP subprocess: one writer, so no
-- cross-process coordination is needed. Nothing in `blocks` / packs / digests reads it —
-- a run is not library content until the user presses 存成一块.
CREATE TABLE IF NOT EXISTS engine_runs (
  id               TEXT PRIMARY KEY,
  action           TEXT NOT NULL,             -- distill / thread_health / weekly_review / follow_up_brief / follow_up
  thread_id        TEXT,                      -- NULL for weekly_review: it is a whole-library action (§3.4)
  engine           TEXT NOT NULL,             -- claude / codex
  model            TEXT,                      -- what the CLI reported using; NULL when it did not say
  outcome          TEXT NOT NULL,             -- ok / failed / cancelled
  result_text      TEXT,                      -- THE thing that used to be thrown away
  detail           TEXT,                      -- the CLI's own words on a failure (never a Spool paraphrase)
  blocks_written   INTEGER NOT NULL DEFAULT 0,
  proposals_queued INTEGER NOT NULL DEFAULT 0,
  cost_usd         REAL,                      -- NULL when the CLI did not report it (codex today, §5)
  input_tokens     INTEGER,
  output_tokens    INTEGER,
  started_at       INTEGER NOT NULL,
  finished_at      INTEGER NOT NULL,
  reviewed_at      INTEGER                    -- when the user acted on the card; NULL = still waiting on them
);

-- The two reads this table has: one project's runs (the right rail follows the open
-- project), and the library-wide feed (weekly reviews, cost totals).
CREATE INDEX IF NOT EXISTS idx_engine_runs_thread ON engine_runs(thread_id, finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_engine_runs_time ON engine_runs(finished_at DESC);

-- v17 (旧账 §5-3): the dates a user has told Spool to stop reminding them about.
--
-- The dates themselves are NOT stored — they are re-read from the block's own text every
-- time (lib/blocks/dates.ts), so editing a block updates its reminders for free and nothing
-- can drift out of sync with the words on screen. Only the user's 「别再提这条」 is a fact
-- worth keeping, and it is keyed by (block, day) because one block can name several dates
-- and dismissing one must not silence the rest.
--
-- ⚠️ Dismissals are the whole state of this feature. That is deliberate: a table of detected
-- dates would need invalidating on every edit, and a stale reminder is exactly the failure
-- §5-3 is about.
CREATE TABLE IF NOT EXISTS date_dismissals (
  block_id   TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  due_at     INTEGER NOT NULL,            -- local midnight of the day, ms epoch
  created_at INTEGER NOT NULL,
  PRIMARY KEY (block_id, due_at)
);

-- v18 (DESIGN_PROJECT_FILES §3.4, phase three): the files an AI has ASKED to read.
--
-- Every attachment starts at `ai_access = 0` — nobody reads the user's files unless they
-- say so. This table is the only way that changes without the user going to the file panel
-- themselves: an AI names files ALREADY in a project, says why, and the request waits on
-- the review screen beside the block proposals. Approval sets `ai_access = 1` on those
-- attachments and deletes these rows; refusal just deletes them (§4.3's rule for the
-- proposal queue — what the user turned away leaves no trace).
--
-- ⚠️ One row per requested FILE, grouped by `request_id`, because one call may name several
-- and the review screen must show it as ONE decision, not three.
-- ⚠️ No path can ever arrive here: `attachment_id` points at a row the user created from
-- the system file dialog (§2). An AI can ask about a file the user put in a project and can
-- never introduce a new one — that is the whole reason this feature was allowed at all.
CREATE TABLE IF NOT EXISTS file_access_requests (
  id            TEXT PRIMARY KEY,
  request_id    TEXT NOT NULL,             -- groups the files named in one request_file_access call
  client        TEXT NOT NULL DEFAULT '',  -- who asked, shown on the card
  thread_id     TEXT NOT NULL,
  attachment_id TEXT NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
  why           TEXT NOT NULL DEFAULT '',  -- the reason the user judges the request by
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL           -- same 7 days as a proposal batch
);

CREATE INDEX IF NOT EXISTS idx_file_access_requests
  ON file_access_requests(request_id, created_at ASC);

-- v25 (WORKPLAN §2.S2, Ocean 2026-08-24) — AI 提「整条取代」的那条队列。
--
-- ⛔⛔ **一条红线在这一天被推翻了，只推翻了一半。** `DESIGN_CONTEXT_HYGIENE` §5 原本写着
-- 「AI 不许提①整块作废 / ②整块取代 —— 判断权在用户，AI 猜错的代价不对称（会把一条对的
-- 结论从 pack 里抹掉）」。Ocean 的原话：「AI 提『这块整块过时了』的提案，走审阅队列，
-- 由你一键点掉：这个我拍板，做。」
-- ⭐ **推翻的只是「AI 不能提」，不是「AI 能写」** —— 那条不对称的代价还在人手里，
-- 变的是「谁来发现」。所以这张表和 `proposals` 是同一个形状：**它只排队，从不生效**。
--
-- 为什么另开一张表而不是塞进 `proposals`：`proposals` 的每一行**会变成一个新块**，
-- 而这里一行**一个块都不新建** —— 它说的是库里已有的两块之间的关系。
-- 塞在一起的话，`approveBatch` 那条路会照着 content 建块，而这里根本没有 content。
--
-- 为什么记 block id 而不是 `#N`：`#N` 是**那一份 pack 里**的编号，AI 就是照它说话的，
-- 但存下来必须落到实体上 —— 块删了这一行要跟着走（ON DELETE CASCADE），
-- 而 seq 认不出「那一块已经不在了」。⚠️ 界面上仍然说 `#N`，读的时候再翻回去。
--
-- ⚠️ 两句引文是**过了闸之后**存下来的（`api_engine.rs::quote_passes` —— 和 E3 那一遍
-- 同一个 `locate`，⛔ 不是另抄一份）。存着是因为审阅面要摆出来给人看：
-- 「它凭哪一句说旧的过时了、又凭哪一句说新的取代了它」。
CREATE TABLE IF NOT EXISTS supersede_proposals (
  id             TEXT PRIMARY KEY,
  thread_id      TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  stale_block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,  -- 旧的那一块
  by_block_id    TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,  -- 取代它的那一块
  client         TEXT NOT NULL DEFAULT '',  -- 谁提的，卡片上要显出来
  why            TEXT NOT NULL DEFAULT '',  -- 一句话：为什么说它被整条取代了
  quote_stale    TEXT NOT NULL,             -- 旧块里能证明它过时的那一句，⚠️ 逐字
  quote_new      TEXT NOT NULL,             -- 新块里取代它的那一句，⚠️ 逐字
  retyped        INTEGER NOT NULL DEFAULT 0, -- 两句里至少一句是「只差标点的重打」
  created_at     INTEGER NOT NULL,
  expires_at     INTEGER NOT NULL,          -- 和提案批次同一个 7 天
  -- v32 (P7-4, Ocean 2026-10-07 第 40、42 条)：AI 建议的是哪一种 —— 'supersedes'（整条取代）/
  -- 'corrects'（只更正一处）。只是建议：卡片上标出来，用户在「更正 / 取代 / 不动」里自己选。
  -- NULL = v32 以前的行 = 'supersedes'（那时这张表只装取代）。
  suggested_kind TEXT
);

CREATE INDEX IF NOT EXISTS idx_supersede_proposals_thread
  ON supersede_proposals(thread_id, created_at ASC);

-- v31 (P6, Ocean 2026-09-30 §9.2 第 7、10 条 + 10-06 第 31 条) —— AI 提的文件，排队等点头。
--
-- §2 原来那条「路径只来自文件选择器」在 09-30 改成了「AI 能**提议**一个路径，点头才挂」。
-- ⭐ 改的只是「谁能把路径放到用户眼前」，不是「谁能把路径放进库」：这张表和 `proposals` /
-- `file_access_requests` 同一个形状 —— **它只排队，从不生效**。`attachments` 只在 GUI 里、
-- 用户点头那一刻写；MCP 进程只写这里（`mcp.rs` 的路径闸放行之后）。
--
-- 一张表装两种（`kind`），一次调用一行 = 一张卡：
--   'attach'     把 `path` 挂进 `thread_id` 这个项目；`anchor_block_id` 非空 = 挂在那一块上。
--   'supersede'  用 `path` 取代 `supersedes_id` 那个旧文件。新文件挂在哪 = 旧文件点头那一刻
--                挂在哪，所以这一种的 `anchor_block_id` 永远是 NULL（不另存一份会 drift 的）。
--
-- ⚠️ `path` 是**路径闸放行之后的真实路径**（跟过软链接），⛔ 不是 AI 传进来的原样。
-- `size_bytes` 是提的那一刻量的，卡片上给人看「多大」；点头时文件可能已经变了，以那时为准。
-- ⛔ 外键只指 `attachments`：旧文件被用户去掉了，取代它的提议跟着没。项目和块不设外键 ——
-- 项目是软删（读的那一头 JOIN `deleted_at IS NULL`），块删了点头时挂在项目（P6-3）。
-- ⛔ 不跟着库搬（`transfer.ts` 的 `MERGE_TABLES` 不列它）：和 `file_access_requests` 同一个理由，
-- 一个指着这台电脑上某个路径的待审提议，搬到别的电脑上没有意义。
-- 不同意 = 删掉那一行、什么都不留；过期（7 天）同样删掉。
CREATE TABLE IF NOT EXISTS file_proposals (
  id              TEXT PRIMARY KEY,               -- one call = one row = one card
  kind            TEXT NOT NULL,                  -- 'attach' | 'supersede'
  client          TEXT NOT NULL DEFAULT '',       -- `<client> · MCP` source label, stored as-is
  thread_id       TEXT NOT NULL,
  path            TEXT NOT NULL,                  -- canonical path the gate let through
  size_bytes      INTEGER NOT NULL,               -- measured when proposed
  anchor_block_id TEXT,                           -- 'attach' only; NULL = hangs off the project
  supersedes_id   TEXT REFERENCES attachments(id) ON DELETE CASCADE,  -- 'supersede' only
  why             TEXT NOT NULL DEFAULT '',
  created_at      INTEGER NOT NULL,
  expires_at      INTEGER NOT NULL                -- same 7 days as the other three queues
);

CREATE INDEX IF NOT EXISTS idx_file_proposals_thread
  ON file_proposals(thread_id, created_at ASC);

-- v32 (P7-6, Ocean 2026-09-30 §9.2 第 11 条 + 10-07 第 43、44 条) —— 块里的图片。
--
-- **存进库文件里**（Ocean 10-07 选的）：导出是 `VACUUM INTO` 一个文件，图片跟着走，导出不用改；
-- 导入走 `transfer.ts` 的 `MERGE_TABLES`（这张表排在 `blocks` 后面）。代价是库文件变大。
-- 一块可以有好几张（`position` 从 0 起，按它排）；块里文字、图片、批注同时在。
--
-- ⚠️ `bytes` 是原图，一个字节不改；预览由 Rust 现缩现转 `data:`（界面安全策略只认 `data:` 图片）。
-- ⚠️ tauri-plugin-sql 只会把 JSON 的字符串 / 数字绑成参数，BLOB 读出来是一长串数字 ——
-- 所以 GUI 这一侧**只在 SQL 里**搬字节（`INSERT … SELECT`、`hex()` / `unhex()`），⛔ 不把 `bytes` 当参数传。
-- 外键指 `blocks`，但这个连接不开 `PRAGMA foreign_keys`，级联不会发生 ——
-- 删块 / 合并 / 移块 / 复制时图片怎么走，写在 `blocks.ts` 最底层（和 P5-3 的文件同一个做法）。
CREATE TABLE IF NOT EXISTS block_images (
  id          TEXT PRIMARY KEY,
  block_id    TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,               -- order inside the block, from 0
  bytes       BLOB NOT NULL,                  -- the original file, untouched
  format      TEXT NOT NULL,                  -- 'png' | 'jpeg' | 'gif' | 'webp'
  width       INTEGER NOT NULL,
  height      INTEGER NOT NULL,
  size_bytes  INTEGER NOT NULL,               -- length(bytes), kept so a list never reads the bytes
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_block_images_block
  ON block_images(block_id, position ASC);

-- v27 (WORKPLAN §2.V1, Ocean 2026-08-25) —— 上次读到哪儿，按项目分开记，存 30 天。
--
-- 他的原话：「切换到别的项目再回来，停留在刚刚浏览过的位置，而不是刷新。」
--
-- ⛔ **记的是块，不是像素。** 同一批（V2）刚把块改成默认展开，每一块的高度全变了 ——
-- 存下来的 `scrollTop` 会指到完全不相干的地方去。所以这里存的是**离开时视口最顶上那一块的
-- id**，回来时滚到它；块删了就找不到，找不到就落回底部，不需要外键去兜。
--
-- ⛔ **新开一张表，不往 `blocks` 上加列** —— 那是这个库最贵的一张表，而这一行的寿命
-- （30 天，随时可丢）和块本身完全不是一回事。和 v25 建 `supersede_proposals` 同一条路：
-- 只有 `CREATE TABLE IF NOT EXISTS`，没有 UPDATE、没有回填、⛔ 没有 rebuild 分支
-- （2026-05-29 抹库就是重建表那条分支干的）。
-- 往回怎么走：`DROP TABLE read_positions` 一句退回 v26，⛔ 不丢任何 v26 就有的数据。
--
-- `last_block_at` 是**离开那一刻这个项目最新一块的时间**。回来时要是有更新的块进来了，
-- ⭐ 就不回原位，落到底部 —— 「有新的」正是他打开这个项目的原因，回原位等于把新东西藏起来。
CREATE TABLE IF NOT EXISTS read_positions (
  thread_id     TEXT PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE,
  block_id      TEXT NOT NULL,     -- 离开时视口最顶上那一块；⚠️ 故意不设外键，见上
  last_block_at INTEGER NOT NULL,  -- 离开那一刻最新一块的 created_at
  updated_at    INTEGER NOT NULL   -- 30 天的起算点
);

-- v35 (P9G, Ocean 2026-10-16 第 125 – 131 条) —— AI 提「把这个项目拆成几个子项目」，排队等点头。
--
-- 和 `file_proposals` / `supersede_proposals` 同一个形状：**它只排队，从不生效**。MCP 那一侧
-- （`propose_split`）只往这里写一行，一块都不挪；真正的拆分只在用户在待审卡上点「拆分」那一下
-- 发生，在 GUI 里。
--
-- `plan` 是 AI 提的拆法，JSON：
--   { "groups": [{ "title", "summary", "block_ids": [...] }, …],   -- 2 – 8 组
--     "files": [{ "attachment_id", "group" }, …],                  -- AI 建议没挂在块上的项目文件去哪一组
--     "follow_ups": [{ "item_id", "group" }, …] }                  -- 跟进行同上；`group` 是组的下标，从 0 起
-- 没分进任何一组的块、没提到的文件和跟进行，都留在原项目。⚠️ 存的是 AI 提的样子：用户在卡上改的
-- 分组不写回这里，点「拆分」时卡上的样子直接拿去拆，拆完这一行删掉。
-- ⛔ 外键只指 `threads`。⛔ 不跟着库搬（`transfer.ts` 的 `MERGE_TABLES` 不列它）：和别的待审提议一样，
-- 等人点头的提议搬到别的库里没有意义。
-- 不拆 = 删掉那一行、什么都不留；过期（7 天）同样删掉。同一个项目同时只有一份（MCP 那一侧核）。
CREATE TABLE IF NOT EXISTS split_proposals (
  id          TEXT PRIMARY KEY,                -- one call = one row = one card
  thread_id   TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,  -- the project to split
  client      TEXT NOT NULL DEFAULT '',        -- `<client> · MCP` source label, stored as-is
  why         TEXT NOT NULL,                   -- the AI's one line on why, top of the card
  plan        TEXT NOT NULL,                   -- JSON, see above
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL                 -- same 7 days as the other queues
);

CREATE INDEX IF NOT EXISTS idx_split_proposals_thread
  ON split_proposals(thread_id, created_at ASC);
