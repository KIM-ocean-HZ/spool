import { ChevronDown, ChevronRight, Inbox } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CompressRail from "@/components/Compress/CompressRail";
import LiveRun from "./LiveRun";
import McpBar from "./McpBar";
import ProjectFiles from "./ProjectFiles";
import RailSection from "./RailSection";
import RunCard from "./RunCard";
import { lastSearchLine } from "@/components/ThreadView/FollowUpSearch";
import { createBlock } from "@/lib/db/blocks";
import type { EngineRun } from "@/lib/db/engineRuns";
import { groupAiActivity, visibleRuns } from "@/lib/engine/activity";
import { aiEntryState, canShowEngineActions } from "@/lib/engine/gate";
import { imageLinesAsText } from "@/lib/blocks/imageLines";
import { dateLocale, useT } from "@/lib/i18n";
import { IS_MAC } from "@/lib/platform";
import type { Thread } from "@/lib/db/threads";
import { useBlocksStore } from "@/stores/blocksStore";
import { useSearchStore } from "@/stores/searchStore";
import {
  ACTION_LABEL,
  ENGINE_LABEL,
  useEngineStore,
  type EngineKind,
} from "@/stores/engineStore";
import { useFollowUpStore } from "@/stores/followUpStore";
import { useProposalsStore } from "@/stores/proposalsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "@/stores/toastStore";

// DESIGN_WORKBENCH §9.13 — the right rail, third pass.
//
// §9.9's rail inverted the ratio (results big, controls small) and that part stands. What
// Ocean said after living with THAT one is the whole brief for this pass:
//
//   「目前的 uiux 还是凌乱，矩形结构太多，没有空间呼吸感。按钮很大很长不美观……
//     做了过多了隐藏抽拉的设计，看似简洁，实则摩擦巨大」
//
// Three concrete changes, and one deletion:
//
//   1. **The folds are gone.** 「让 AI 维护这个项目」 was a disclosure triangle in front of two
//      buttons — one extra click, every time, to reach the thing the rail exists for. The
//      actions are now a fixed row at the bottom, always visible. (One fold survives: the
//      list of blocks an AI wrote, at the very end. It is reference material you consult,
//      not an action you take — and unfolded it is unbounded in length.)
//   2. **No more bordered full-width buttons.** Every control was a rectangle the width of
//      the rail; a column of them reads as a form, not a panel. The actions are icon + word,
//      sharing one line, with whitespace instead of borders doing the separating.
//   3. **Nothing renders to say it is empty.** 「没有待过目的」 was a permanently-present grey
//      rectangle that never did anything. A count of zero now takes zero pixels.
//
// And the deletion: **the whole-library half is gone from this file.** Ocean, twice:
// 「把它单独放在左侧边栏的置顶位置，而不是在右侧边栏中和每个项目共用」 and
// 「去掉项目汇总的右边栏」. 周回顾 and the 自动维护 master switch now live in 项目管理's own
// workspace (ProjectBoard), and this rail is per-project or it is not there at all — App
// does not mount it while the board is open.

// ⚠️ **压缩 and 去重 are gone from this rail (2026-08-11, Ocean's call after living with them).**
//
// Not a UI tidy-up — he read what they actually produced in 〈Flux〉 #9/#10 and judged both
// unfit, each for its own structural reason:
//
//   * **压缩**: 「最有用的是能告诉我还有什么没做…但是总结性的语句没什么用，如果放在上下文里
//     只会造成冗余」. Half of what it wrote was already in the library, so distilling it back
//     in made the pack bigger without making it say more. 周回顾 gives him the useful half
//     「并且更加简洁」, so he retired this one into it.
//   * **去重**: 「AI 引擎没办法帮我把新块指向过期块里面的那句话，没什么用」. That is a limit
//     no prompt can lift — Spool merges nothing, rewrites nothing, deletes nothing by design
//     (DESIGN_MCP_WRITE_ROLE), so this action could only ever report and then ask him to go do
//     it himself. Paying a model to find duplicates is now replaced by finding them locally
//     for free, on the row where he can act on them (ProjectBoard).
//
// ⚠️ **The MCP tools and prompts of the same names are UNTOUCHED**, and deliberately so: they
// serve a chat client, where a human really is present to answer the closing 「你同意吗？」 that
// made both actions useless here. What was wrong is running them with nobody in the loop.
//
// So this rail is now one action wide: 联网搜索 (below), the one that brings in something the
// library does not already contain.

interface Props {
  thread: Thread | null;
  onCollapse: () => void;
  onEditBrief: () => void;
}

export default function RightRail({ thread, onCollapse, onEditBrief }: Props) {
  const t = useT();
  const runs = useEngineStore((s) => s.runs);
  const status = useEngineStore((s) => s.status);
  const current = useEngineStore((s) => s.current);
  const queue = useEngineStore((s) => s.queue);
  const probe = useEngineStore((s) => s.probe);
  const loadRuns = useEngineStore((s) => s.loadRuns);
  const dismissRun = useEngineStore((s) => s.dismissRun);

  const mcpEnabled = useSettingsStore((s) => s.mcpEnabled);
  const mcpWriteEnabled = useSettingsStore((s) => s.mcpWriteEnabled);
  const actionsEnabled = useSettingsStore((s) => s.aiEngineActionsEnabled);

  // v22 (§8.7) — what this project follows up is a list of rows now, loaded for whichever
  // project is open and shared with the editor behind 编辑 so both move together.
  const loadFollowUp = useFollowUpStore((s) => s.load);
  const followUpItems = useFollowUpStore((s) => s.items);
  const followUpLines = useMemo(
    () => followUpItems.filter((i) => i.status === "open"),
    [followUpItems],
  );
  const followUpRun = useFollowUpStore((s) => s.run);
  const lastSearch = lastSearchLine(t, followUpRun);

  const pending = useProposalsStore((s) => s.pendingCount);
  const openReview = useProposalsStore((s) => s.open);
  const highlight = useSearchStore((s) => s.highlight);

  const [storing, setStoring] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (status === null) void probe();
  }, [status, probe]);

  useEffect(() => {
    void loadRuns(thread?.id ?? null);
  }, [thread?.id, loadRuns]);

  useEffect(() => {
    if (thread?.id) void loadFollowUp(thread.id);
  }, [thread?.id, loadFollowUp]);

  const busyOnThisThread =
    current?.threadId === thread?.id ||
    queue.some((q) => q.threadId === thread?.id);
  const cliAvailable = status?.available === true;
  const gate = {
    cliAvailable,
    mcpEnabled,
    mcpWriteEnabled,
    actionsEnabled,
    busyOnThisThread,
  };
  const engineReady = canShowEngineActions(gate);
  // P9C (第 94、97、98 条) — the same answer the follow-up editor uses for 「联网搜索」 (P9S-6 moved the
  // button there). Here it only decides whether an empty list says 「还没定」: not in a private project.
  const searchEntry =
    status === null
      ? null
      : aiEntryState({
          ready: engineReady,
          route: "cli",
          showAi: actionsEnabled,
          isMac: IS_MAC,
          // P9E-3（第 122 条）：私密项目里不联网去查 —— Spool 自带的 AI 不碰它。
          privateProject: thread?.isPrivate === true,
        });

  // §3.1 — this is the "user agrees" the prompts have always asked for. The block goes in
  // through the ordinary insert path with a source label, exactly like an MCP write: what
  // the AI wrote must never be able to pass as something the user typed.
  // ⚠️ There is no weekly-review branch here any more, and that is the fix, not an omission.
  // It used to find-or-create a project called 「回顾」 inside `workspaces[0]` — whichever
  // workspace happened to sort first — which is how one appeared inside Ocean's 升学 workspace
  // and made him ask 「是对应每个规划区一个回顾吗？」. A review is not a block; it lives in
  // `engine_runs` and is read in its own view (components/ReviewBoard), so nothing needs to be
  // guessed about where it belongs.
  const store = async (run: EngineRun): Promise<void> => {
    if (!run.resultText) return;
    const target = run.threadId ?? thread?.id;
    if (!target) return;
    setStoring(run.id);
    try {
      await createBlock({
        threadId: target,
        content: run.resultText,
        annotation: t("{action} · {engine}", {
          action: t(ACTION_LABEL[run.action]),
          engine: ENGINE_LABEL[run.engine as EngineKind] ?? run.engine,
        }),
        source: `${ENGINE_LABEL[run.engine as EngineKind] ?? run.engine} · MCP`,
      });
      await dismissRun(run.id);
      const active = useBlocksStore.getState();
      if (thread?.id === target) await active.load(target);
      toast.notice(t("存好了"));
    } catch (e) {
      toast.error(
        t("存不下来：{msg}", {
          msg: e instanceof Error ? e.message : String(e),
        }),
      );
    } finally {
      setStoring(null);
    }
  };

  // ⚠️ Ocean 2026-08-07: 「跟进没法删除，也不会消失」. Two separate faults, both here.
  //
  //   * A dismissed card used to STAY, greyed out, for ever — so a rail you had answered
  //     everything in still looked full. `reviewedAt !== null` now means gone from view.
  //     The row itself is untouched in the database: it is what makes the 7-day spend
  //     total true, and deleting it would make the number lie (engineRuns.markReviewed).
  //   * 跟进 files proposals rather than prose, so a follow-up run often comes back with no
  //     text at all — and the old card only rendered its buttons for `outcome === 'ok' &&
  //     hasText`. A textless run had no ✕. RunCard gives every card a ✕ now, unconditionally.
  // P9S-6: a follow-up's own words are not a card up here any more — what it found is on the review
  // screen, and what it said is folded inside the follow-up editor (FollowUpSearch).
  const shown = visibleRuns(runs, thread?.id ?? null).filter((r) => r.action !== "follow_up");
  // R2: the durable half of "what did the AI put in my library". ⚠️ Unlike the cards, this
  // does NOT go away when answered: a block an AI wrote stays a block an AI wrote.
  const blocks = useBlocksStore((s) =>
    thread ? s.byThread[thread.id] : undefined,
  );
  const written = useMemo(() => groupAiActivity(blocks ?? []), [blocks]);
  const writtenCount = written.reduce((n, g) => n + g.blocks.length, 0);
  const when = (ms: number): string =>
    new Date(ms).toLocaleString(dateLocale(), {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    /* `rail-wash`: same marker, same reason as the left rail — see Sidebar/index.tsx. Nothing
       matches it in 经典（这条栏在经典版里没有底色，是 2026-08-19 Ocean 实机看过之后回退的，
       别再加回来）; 情人节 tints both rails mint so they frame the blush page. */
    <aside className="rail-wash flex h-full min-h-0 flex-col border-l border-line">
      {/* §9.4 丙 (2026-08-11, Ocean:「MCP 才是主要的对话写入工具，放在最顶上」). The CLI
          engine used to hold this row; it now lives inside the follow-up editor, beside the
          only thing that spends it.
          ⚠️ 2026-08-15: it briefly also became the way INTO those clients; that nav is gone
          along with the codex plugin — see McpBar's header. It reports, it does not route. */}
      <McpBar onCollapse={onCollapse} />

      {/* ⚠️ `px-2` is the sidebar's own container padding, and it is what lets the headings
          and rows inside sit at `px-3` — the same left edge every row in the left rail sits
          on (Sidebar/SectionLabel). The two columns line up because they use one number, not
          because someone matched them by eye. */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2 py-3">
        {/* §9.1 主体, in order of how much it wants you right now. */}
        <LiveRun />

        {/* §3.3 — the review queue. ⚠️ It does NOT pop or steal focus: memory
            `capture-note-first` — the main window never jumps to the front, and the AI may
            have queued this while the user slept. Absent at zero (§9.13 #3). */}
        {pending > 0 && (
          <button
            type="button"
            onClick={() => void openReview()}
            className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left text-[13px] text-accent transition-colors"
          >
            <Inbox size={12} className="flex-none" />
            <span className="min-w-0 flex-1 truncate">
              {t("{n} 条待你过目", { n: pending })}
            </span>
            <ChevronRight size={12} className="flex-none" />
          </button>
        )}

        {/* §3.1 — what the AI said. The reason this rail exists at all (§1.1: the text used
            to be thrown away and reported as "跑完了，没有新增块"). */}
        {/* ⚠️ With nothing to show, this renders NOTHING (Ocean 2026-08-11: 「跑一次，结果留在这里
            等你过目。这句提示删掉」) — §9.13 #3, 「Nothing renders to say it is empty」.
            P9C (第 94 条): the other branch is gone too. It said 「装了 Claude Code 或 Codex，并打开
            「允许 AI 写入」之后，这里才有东西」 when a CLI was installed and a switch held it back;
            the entry that needs it, 「联网搜索」 below, is locked now and opens that switch in place,
            so the same thing is not said twice. */}
        {shown.map((run) => (
          <RunCard
            key={run.id}
            run={run}
            busy={storing === run.id}
            onDismiss={(id) => void dismissRun(id)}
            onStore={
              run.action === "follow_up" ? undefined : (r) => void store(r)
            }
          />
        ))}

        {/* §9.3 #2 — 新进展. The first level shows the target itself, permanently visible
            rather than only inside the editor; 「改」 is a quiet link into the second. */}
        {/* ⚠️ The frame Ocean asked for on 2026-08-11 (「右侧边栏的跟进窗口做成有框线的」) is
            gone — the reasoning, and what replaced it, is in RailSection.tsx. */}
        {/* The three STANDING sections, in one wrapper so `first:` in RailSection means
            "the first section" rather than "the first thing in the column" — the run cards
            above are transient and keep their own card shape. */}
        <div className="space-y-3">
          {/* ⛔ 「关系待审」那一节不在了（P9S-2，Ocean 2026-10-23 第 171 条：全自动，不用审）——
              被引的那一块一不作数，引用自动解除（lib/db/blocks `releaseRefsToRetired`）。 */}

          {/* ⚠️ 2026-08-17 (Ocean, Windows 验收): this section used to be gated on the local CLI
              — 「跟进是特例,MCP 也可以跟进,所以需要单独考虑」. He is right, and the old gate was
              simply wrong: a follow-up list is not an engine feature. It is a list of what a
              project is watching, written and read through MCP (suggest_follow_up_item,
              get_follow_up_brief) by whatever AI the user talks to, and edited by hand in the
              panel behind 编辑. On Windows the engine is off at its front door, which under the
              old gate meant the list existed, took MCP writes, and could not be SEEN.
              Only the button below needs an engine: 「联网搜索」 is the thing a local CLI runs. */}
          {thread && (
            <RailSection
              title={t("跟进内容")}
              action={
                <button
                  type="button"
                  onClick={onEditBrief}
                  className="flex-none text-[12px] text-muted transition-colors hover:text-accent"
                >
                  {followUpLines.length > 0 ? t("编辑") : t("定一个")}
                </button>
              }
            >
              {/* v22 (§8.7): one line per row, and a row an AI has answered is not in here —
                  it is folded away inside the editor, still reopenable (§8.6). What this column
                  states is what the project is watching NOW. */}
              {followUpLines.length > 0 ? (
                <ul>
                  {followUpLines.map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-1.5 rounded-md px-3 py-1 text-[12px] leading-relaxed text-ink-2"
                    >
                      <span className="flex-none text-muted">·</span>
                      <span className="min-w-0 break-words">{item.text}</span>
                    </li>
                  ))}
                </ul>
              ) : searchEntry === "private" ? null : (
                <p className="px-3 text-[12px] leading-relaxed text-muted">
                  {t("还没定。定几行「要跟进什么」，之后才能让 AI 出去查。")}
                </p>
              )}
              {/* P9S-6 (Ocean 2026-10-23: 「用户主动点击联网搜索退化到二级界面，跟进只能安静显示内容」): the
                  button, its locks and the weekly switch are behind 编辑 now (ThreadView/FollowUpSearch).
                  What stays here is the list, and one quiet line about the last search. */}
              {followUpLines.length > 0 && lastSearch && (
                <p className="mt-1 px-3 text-[11px] text-muted">
                  {lastSearch}
                  {followUpRun?.auto && t(' · 每周自动查')}
                </p>
              )}
            </RailSection>
          )}

          {/* ⚠️ **「跟进用的」 is no longer in this column** (2026-08-12, Ocean: 「『选择跟进用的
              AI』，把这个选择键放到编辑的面板里面，这个按钮不常用」). It moved into the follow-up
              editor (ThreadView/FollowUpPanel) — one panel deeper, reached by 编辑, which is
              where you already are when you are deciding what a follow-up should do.
              ⚠️ It cost the thing the 2026-08-11 note here defended: with no engine installed
              the 跟进 block does not render, so 「没检测到引擎」 has nowhere to appear in the rail.
              That trade is deliberate and it is not a silent one — the locked 「联网搜索」 in the
              跟进 section (P9C) says what is missing and opens it in place, and Settings → AI
              still reports what was detected. A permanently-visible
              picker for a decision taken once is what he asked to be rid of. */}

          {/* 压缩在右栏剩下的那一点。⚠️⚠️ **2026-08-23 这一格被掏空了大半**（Ocean 真手指
              验收第 4 条：「右侧边栏的压缩按钮不要了，压缩直接到面板去使用」）—— 按钮、
              排队勾选、几点跑都搬进了项目里的「压缩」页签，多项目排队在「项目管理」的行里。
              ⛔ 别往这儿加回去。剩下的只有**跨项目**那一件：别的项目夜里压好的那几份，
              得有个地方认领。没有东西要认领的时候它整格不渲染。 */}
          {thread && <CompressRail thread={thread} />}

          {/* DESIGN_PROJECT_FILES §3.2 — the project's files. Always present (a project with
              no files says so and offers the ＋), because this is now the ONLY place a file can
              be added or seen: the block action bar's 📎 and 🔗 are gone. */}
          {thread && <ProjectFiles threadId={thread.id} isPrivate={thread.isPrivate} />}

          {/* R2's durable half — the one surviving fold, and the only thing in the rail that
              is reference rather than action. Absent entirely in a project no AI has touched
              (§2.5 安静原则 — a thread the user keeps to themselves grows no AI panel). */}
          {writtenCount > 0 && (
            <RailSection
              title={t("AI 写的")}
              action={
                // ⚠️ The chevron sits AFTER the words, per Sidebar/SectionLabel's rule: anything
                // before the name pushes it off the one vertical everything else lines up on.
                <button
                  type="button"
                  onClick={() => setHistoryOpen((v) => !v)}
                  className="flex flex-none items-center gap-0.5 text-[12px] text-muted transition-colors hover:text-accent"
                >
                  {historyOpen ? t("收起") : t("{n} 块", { n: writtenCount })}
                  {historyOpen ? (
                    <ChevronDown size={11} className="flex-none" />
                  ) : (
                    <ChevronRight size={11} className="flex-none" />
                  )}
                </button>
              }
            >
              {historyOpen && (
                <div className="space-y-2">
                  {written.map((g) => (
                    <div key={`${g.source}-${g.at}`}>
                      <div className="px-3 text-[12px] text-muted">
                        {t("{source} · {when} · {n} 块", {
                          source: g.source,
                          when: when(g.at),
                          n: g.blocks.length,
                        })}
                      </div>
                      <ul>
                        {g.blocks.map((b) => (
                          <li key={b.id}>
                            {/* Clicking scrolls to it and flashes it — the same path a search
                                result takes, so "go look and change your mind" is one click
                                from the audit line. */}
                            <button
                              type="button"
                              onClick={() => highlight(b.id)}
                              title={t("跳到这一块")}
                              className="flex w-full items-baseline gap-1.5 rounded-md px-3 py-1 text-left transition-colors hover:bg-paper-2/60"
                            >
                              {b.seq !== null && (
                                <span className="flex-none font-mono text-[12px] text-muted">
                                  #{b.seq}
                                </span>
                              )}
                              <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">
                                {imageLinesAsText(b.content, t("图片"))}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </RailSection>
          )}
        </div>
      </div>

      {/* ⚠️ The bottom action row is gone with the two actions it held (see the note at the
          top of this file), and so is the per-project 自动维护 switch that sat under it: the
          only thing automation still runs is 周回顾, which reads every project and therefore
          cannot be opted out of one at a time. That switch now lives, library-wide, in the
          view that owns the action (components/ReviewBoard). */}
    </aside>
  );
}
