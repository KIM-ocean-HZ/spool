import { CalendarRange, Loader2, Lock, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ApiBalance from '@/components/ApiBalance';
import LockedAiEntry, { AiSetupButton } from '@/components/AiSetup/LockedAiEntry';
import ActivityPanel from './ActivityPanel';
import ReviewCards from './ReviewCards';
import StructuredReview from './StructuredReview';
import Toggle from '@/components/ui/Toggle';
import { MarkdownContent } from '@/lib/blocks/MarkdownContent';
import {
  deleteRun,
  listRunsForAction,
  weeklyReviewNextAt,
  type EngineRun,
} from '@/lib/db/engineRuns';
import { splitReview } from '@/lib/ai/reviewCards';
import { readWeeklyReview } from '@/lib/ai/weeklyStructured';
import { runWeeklyReviewViaApi } from '@/lib/ai/weeklyReview';
import { toast } from '@/stores/toastStore';
import {
  aiEntryState,
  canShowEngineActions,
  effectiveAutoRoute,
  type AiEntryState,
} from '@/lib/engine/gate';
import { CODEX_NO_MODELS, ENGINE_MODELS, modelKeyFor } from '@/lib/engine/models';
import { dateLocale, useT } from '@/lib/i18n';
import { IS_MAC } from '@/lib/platform';
import {
  groupByWeek,
  startOfWeek,
  endOfWeek,
  WEEKLY_REVIEW_PERIOD_MS,
} from '@/lib/weeks';
import { ACTION_LABEL, ENGINE_LABEL, useEngineStore, type EngineKind } from '@/stores/engineStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useThreadsStore } from '@/stores/threadsStore';
import { useBalanceStore } from '@/stores/balanceStore';
import { CENTRE_HEADER_HEIGHT } from '@/lib/layout';

// 周回顾 — its own pinned view, beside 项目管理.
//
// Ocean 2026-08-11, after finding a project called 「回顾」 sitting inside his 升学 workspace:
//
//   「周回顾出现在了升学规划区？是对应每个规划区一个回顾吗？还是什么逻辑？
//     周回顾在左侧边栏的位置应该和项目管理一起吧，作为独立工作区出现」
//
// He was reading a bug correctly. A review reads the WHOLE library, and the old code had
// nowhere to put one, so it improvised twice over:
//
//   * the run card filed its text into `workspaces[0]` — whichever workspace happened to sort
//     first. That is how 「回顾」 ended up under 升学: not a rule, an accident.
//   * the card itself was shown in every project's right rail, because a run belonging to no
//     project was treated as belonging to all of them. Read from inside one project, that is
//     indistinguishable from "this project has a review".
//
// Both are gone. A review is not a block and not a project: it is the record of a week, it
// lives in `engine_runs` where it has always been durable, and this view is where it is read.
// Nothing is written into the library for it at all — which also means no find-or-create runs
// against the user's threads, the shape of thing memory `spool-db-wipe-incident` is about.
//
// ⚠️ This is the honest half of a bigger open question. Ocean's verdict the same day was that
// 周回顾 is the action worth building on ("他会告诉用户每个项目做了什么，还有什么没做，可以和
// 截止日期放在一起，作为日程进度的回报") — pairing it with deadlines is NOT built here, and is
// written up in DESIGN_WORKBENCH §11 rather than guessed at.
//
// ⭐⭐ 2026-08-26 (`W 批`) — Ocean, having used it: 「每周自动回顾无法选模型，还有周回顾为什么
// 没有 codex？」 and 「周回顾每周的新进展应该组合在一起，以周为单位呈现，现在周回顾是线性的」.
// The first was FOUR faults stacked, and the one that mattered is structural: the model picker
// lives in the right rail, and **a pinned view does not carry a right rail** (App.tsx:
// `pinnedView ? null : …`). Standing on this screen there was nowhere to pick a model at all —
// the same root as 08-25's 「周回顾没法暂停」, and it lands in the same place: this bar.

/** What an empty review list says (P9B-3 第 76 条, P9C 第 93 – 98 条). Only when a way to run a
 *  review is ready; locked says nothing more here — the locked bar above already says it — and
 *  hidden (「显示 AI 功能」 off) says nothing at all. */
export const emptyReviewsHint = (entry: AiEntryState): string | null =>
  entry === 'ready' ? '还没有回顾。点上面那一下，AI 会读一遍所有项目，说说这一周做了什么、还剩什么。' : null;

/** Which type the review bar runs on (P9C 验收第一轮，第 104 – 105 条). API off ⇒ only the local CLI;
 *  not a Mac ⇒ there is no local-CLI type (第 97 条), so API; both there ⇒ the one the user picked,
 *  which is also what the weekly automatic run uses (`autoReviewRoute`). */
export const reviewKind = (apiOn: boolean, isMac: boolean, picked: 'cli' | 'api'): 'cli' | 'api' =>
  !apiOn ? 'cli' : !isMac ? 'api' : picked;

/** §5 — spend, never remaining quota; same rule and same reason as RunCard's. */
const money = (usd: number | null): string | null =>
  usd === null ? null : usd < 0.01 ? '<$0.01' : `$${usd.toFixed(2)}`;

export default function ReviewBoard() {
  const t = useT();
  const current = useEngineStore((s) => s.current);
  const runs = useEngineStore((s) => s.runs);
  const enqueue = useEngineStore((s) => s.enqueue);
  const cancel = useEngineStore((s) => s.cancel);
  const engineStatus = useEngineStore((s) => s.status);
  const probe = useEngineStore((s) => s.probe);

  const timeoutSecs = useSettingsStore((s) => s.aiEngineTimeoutSecs);
  const mcpEnabled = useSettingsStore((s) => s.mcpEnabled);
  const mcpWriteEnabled = useSettingsStore((s) => s.mcpWriteEnabled);
  const actionsEnabled = useSettingsStore((s) => s.aiEngineActionsEnabled);
  const autoMaintain = useSettingsStore((s) => s.aiAutoMaintain);
  const autoRoute = useSettingsStore((s) => s.autoReviewRoute);
  const modelClaude = useSettingsStore((s) => s.aiModelClaude);
  const modelGemini = useSettingsStore((s) => s.aiModelGemini);
  const update = useSettingsStore((s) => s.update);

  const [reviews, setReviews] = useState<EngineRun[] | null>(null);
  const [nextAt, setNextAt] = useState<number | null>(null);

  // ⭐⭐ 2026-08-25（Ocean）——「CLI 只支持 codex 和 claude，这两个模型太贵了
  // （gemini 的能力有限，且额度少），加入 deepseek 的周总结，总结的 model 可以让用户自行选择」。
  //
  // ⚠️ **两条路并存，不是替换。** CLI 那条（形态 B）一分钱不花、一个 key 不填；
  // 这一条（形态 C）用用户自己填的端点和模型 —— 设置里那个「模型」框本来就是他的，
  // ⛔ 这里不再发明第二套模型设置。
  const apiOn = useSettingsStore((s) => s.apiEngineEnabled);
  const apiVendor = useSettingsStore((s) => s.apiVendor);
  const apiBaseUrl = useSettingsStore((s) => s.apiBaseUrl);
  const apiModel = useSettingsStore((s) => s.apiModel);
  const apiReasoning = useSettingsStore((s) => s.apiReasoning);
  const apiTimeoutSecs = useSettingsStore((s) => s.apiTimeoutSecs);
  const [apiRunning, setApiRunning] = useState(false);

  useEffect(() => {
    if (engineStatus === null) void probe();
  }, [engineStatus, probe]);

  const load = useCallback(() => {
    void listRunsForAction('weekly_review')
      .then(setReviews)
      .catch((e) => {
        console.warn('[review] loading reviews failed', e);
        setReviews([]);
      });
    void weeklyReviewNextAt(WEEKLY_REVIEW_PERIOD_MS)
      .then(setNextAt)
      .catch((e) => console.warn('[review] next-due query failed', e));
  }, []);

  // Re-read when a run lands. `runs` is the store's feed, which engineStore refreshes at the
  // end of every run — so this follows a review finishing without polling for it.
  useEffect(load, [load, runs]);

  /** 用 API 跑一次周回顾。⚠️ 记账那一段住在 `lib/ai/weeklyReview` —— 自动那条路
   *  （`useAutoMaintain`）走的是同一段，⛔ 两边不许各记各的。 */
  const runViaApi = useCallback(async (): Promise<void> => {
    if (apiRunning) return;
    setApiRunning(true);
    try {
      const ok = await runWeeklyReviewViaApi({
        apiVendor,
        apiBaseUrl,
        apiModel,
        apiReasoning,
        apiTimeoutSecs,
      });
      // ⚠️「有回话」，⛔ 不是「写好了」—— 2026-08-11 那条纪律：Spool 判断不了一段散文
      // 是回顾还是道歉，所以不许替它宣称。
      toast.notice(ok ? t('周回顾跑完了，就在下面') : t('周回顾没跑成'));
    } catch (e) {
      toast.error(t('周回顾没跑成'), e instanceof Error ? e.message : String(e));
    } finally {
      setApiRunning(false);
      load();
      // ⭐ X 批「跑完顺带刷一次」—— ⚠️ 这一刻正是余额刚变过的那一刻，而这次出网已经
      // 发生了，⛔ 所以它不新增一条「app 自己往外连」的路径。
      void useBalanceStore.getState().refresh();
    }
  }, [apiRunning, apiVendor, apiBaseUrl, apiModel, apiReasoning, apiTimeoutSecs, load, t]);

  /** ⚠️ 只删没跑成的（`deleteRun` 那一侧也写着同一条），Ocean 2026-08-26:
   *  「失败的可以删除记录，另外跑成功的」。 */
  const remove = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteRun(id);
        await useEngineStore.getState().loadRuns(useThreadsStore.getState().activeId);
      } catch (e) {
        toast.error(t('删不掉'), e instanceof Error ? e.message : String(e));
      } finally {
        load();
      }
    },
    [load, t],
  );

  const engineReady = canShowEngineActions({
    cliAvailable: engineStatus?.available === true,
    mcpEnabled,
    mcpWriteEnabled,
    actionsEnabled,
  });
  // P9C (第 93 – 98 条): either road ready ⇒ drawn as before; neither ⇒ locked; 「显示 AI 功能」 off
  // ⇒ hidden. ⚠️ Until the first detection answers, nothing is decided — no lock flashing past
  // on a machine that has a CLI.
  const reviewEntry: AiEntryState | null =
    engineStatus === null && !apiOn
      ? null
      : aiEntryState({ ready: engineReady || apiOn, route: 'any', showAi: actionsEnabled, isMac: IS_MAC });
  // 第 93 条: a CLI is on this Mac and only the MCP switches hold the free road back — offered in
  // the CLI button's own place, whether or not DeepSeek is on.
  const cliNeedsSwitches =
    IS_MAC &&
    actionsEnabled &&
    engineStatus?.available === true &&
    !(mcpEnabled && mcpWriteEnabled);
  const running = current?.action === 'weekly_review';
  /** 装着的那个 CLI 叫什么。⚠️ 两条路并排摆着的时候，光写「回顾这一周」两遍
   *  用户分不出哪个是哪个 —— 按钮上必须说出跑的是谁。 */
  const selected = engineStatus?.selected ?? null;
  const cliName = selected ? (ENGINE_LABEL[selected] ?? selected) : null;
  const kind = reviewKind(apiOn, IS_MAC, autoRoute);
  const codexNote = kind === 'cli' && engineReady && selected === 'codex';
  // `W1` — the picker itself, on this bar rather than in a rail this screen does not have.
  // ⚠️ Same table and same settings key as the rail's (`lib/engine/models`), so picking here
  // and picking there are the same act; a second copy would be a second answer.
  const models = selected ? ENGINE_MODELS[selected] : [];
  const model = modelKeyFor(selected) === 'aiModelGemini' ? modelGemini : modelClaude;

  // W2 — what the automatic run will ACTUALLY do, same helper the tick uses.
  const autoRun = effectiveAutoRoute(autoRoute, engineReady, apiOn);
  const daysLeft =
    nextAt === null ? 0 : Math.max(0, Math.ceil((nextAt - Date.now()) / 86_400_000));

  const weeks = groupByWeek(reviews ?? [], (r) => r.finishedAt);
  const thisWeek = startOfWeek(Date.now());

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Same height as ThreadView's header — see ProjectBoard for why. ⚠️ The rule that lands
          on the panel's top edge is THIS one; the 引擎 bar below keeps its own smaller height,
          because what is being aligned is the view's title bar, not everything above the list. */}
      <header
        className="flex flex-none items-baseline justify-between gap-3 border-b border-line px-6 py-6"
        style={{ minHeight: CENTRE_HEADER_HEIGHT }}
      >
        <h2 className="font-serif text-2xl text-ink">{t(ACTION_LABEL.weekly_review)}</h2>
        <span className="text-[11px] text-muted">{t('跨所有项目，不属于任何一个')}</span>
      </header>

      {/* ⭐ 2026-08-25：**两条路并存**，所以「准备好」是「随便哪条准备好了」，
          ⛔ 不再只认 CLI。以前只认 `engineReady`，于是一个没装 CLI、但填了 API key 的用户
          在这一屏上看不到任何可以点的东西。
          P9C（第 93 – 98 条）：两条都不通也画这根条子 —— 锁着，当场就能打开（顶上不再空一块，
          `DISCOVERED-20261014-1`）；只有「显示 AI 功能」关着才不画。 */}
      {reviewEntry !== null && reviewEntry !== 'hidden' && (
        <div className="flex-none border-b border-line px-6 py-2">
          {reviewEntry === 'locked' && !cliNeedsSwitches ? (
            <LockedAiEntry
              label={t('回顾这一周')}
              reason={
                IS_MAC
                  ? t('写回顾要用一个 AI：本机的 Claude Code / Codex，或者你自己的 API key。')
                  : t('写回顾要用一个 AI：你自己的 API key。')
              }
              route="any"
            />
          ) : (
            <>
              {/* P9C 验收第一轮（Ocean 10-15 第 104 – 106 条）：「回顾这一周（用 Codex）」「回顾这一周（用
                  deepseek-v4-flash）」两个按钮看着重复 ⇒ 一个按钮，先选类型：本机 CLI（里面再选 Claude
                  Code / Codex）或 API（以后不止 DeepSeek）。选的类型就是 `autoReviewRoute` —— 手动点和
                  每周自动跑走同一类，原来那个「自动那次用」选择器并进来了。本机 CLI 这一类总在（没准备好就
                  锁着、当场能打开）；API 没开就不出现（不劝人花钱）。 */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {kind === 'cli' && !engineReady ? (
                  cliNeedsSwitches ? (
                    // P9C 第 93 条（`DISCOVERED-20261014-2`）：免费那条路只差 MCP 两个开关 —— 在按钮的
                    // 位置给，弹出的小块当场打开（也老实说这两个开关还管着别的 AI）。
                    <AiSetupButton
                      route="cli"
                      className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-ink-2 transition-colors hover:bg-paper-2 hover:text-accent"
                    >
                      <Lock size={12} className="flex-none" />
                      {t('用 {engine} 回顾（不花钱）—— 先打开写入', { engine: cliName ?? 'Claude Code' })}
                    </AiSetupButton>
                  ) : engineStatus === null ? null : (
                    <span className="flex items-center gap-1.5 px-1.5 py-1 text-xs text-muted opacity-70">
                      <Lock size={12} className="flex-none" />
                      {t('回顾这一周')}
                    </span>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={current !== null || apiRunning}
                    onClick={() =>
                      kind === 'api' ? void runViaApi() : enqueue('', '', 'weekly_review', timeoutSecs)
                    }
                    title={
                      kind === 'api'
                        ? t('用你自己填的端点和模型跑一次（按字数计费）')
                        : t('回顾最近一周——读一遍所有项目')
                    }
                    className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-ink-2 transition-colors enabled:hover:bg-paper-2 enabled:hover:text-accent disabled:text-muted disabled:opacity-50"
                  >
                    {running || apiRunning ? (
                      <Loader2 size={12} className="flex-none animate-spin" />
                    ) : (
                      <CalendarRange size={12} className="flex-none" />
                    )}
                    {running || apiRunning ? t('正在回顾…') : t('回顾这一周')}
                  </button>
                )}

                {/* 用哪一类。两类都在才是一个能选的开关；只有一类就只写出它是哪一类。 */}
                <span className="flex items-center gap-1.5">
                  <span className="text-xs text-muted">{t('用')}</span>
                  {apiOn && IS_MAC ? (
                    <span className="inline-flex overflow-hidden rounded border border-line">
                      {(['cli', 'api'] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          disabled={current !== null || apiRunning}
                          onClick={() => void update({ autoReviewRoute: k })}
                          className={`px-2 py-0.5 text-xs transition-colors disabled:opacity-50 ${
                            kind === k ? 'bg-accent/10 text-accent' : 'bg-paper text-muted hover:text-ink'
                          }`}
                        >
                          {k === 'cli' ? t('本机 CLI') : 'API'}
                        </button>
                      ))}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-2">{kind === 'cli' ? t('本机 CLI') : 'API'}</span>
                  )}
                </span>

                {/* 本机 CLI 还没装（DeepSeek 开着才会走到这里）：这一类锁着，当场能装 / 能检测。 */}
                {kind === 'cli' && !engineReady && !cliNeedsSwitches && engineStatus !== null && (
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] text-muted">{t('要先装 Claude Code 或 Codex（不花钱）')}</span>
                    <AiSetupButton
                      route="cli"
                      className="text-[11px] text-accent underline-offset-2 hover:underline"
                    >
                      {t('怎么打开')}
                    </AiSetupButton>
                  </span>
                )}

                {/* 本机 CLI 里选 Claude Code / Codex —— 和跟进面板里「用哪个」是同一个设置（`aiEngine`），
                    两处选的是同一件事。只装了一个就只写它的名字。 */}
                {kind === 'cli' && engineReady && (engineStatus?.engines.length ?? 0) > 1 && (
                  <select
                    value={selected ?? ''}
                    disabled={current !== null}
                    onChange={(e) => void update({ aiEngine: e.target.value as EngineKind }).then(probe)}
                    className="rounded border border-line bg-paper px-1.5 py-0.5 text-xs text-ink outline-none focus:border-accent disabled:opacity-50"
                  >
                    {engineStatus?.engines.map((e) => (
                      <option key={e.kind} value={e.kind}>
                        {ENGINE_LABEL[e.kind]}
                      </option>
                    ))}
                  </select>
                )}
                {kind === 'cli' && engineReady && (engineStatus?.engines.length ?? 0) <= 1 && cliName && (
                  <span className="text-xs text-ink-2">{cliName}</span>
                )}

                {/* ⭐⭐ `W1` (Ocean 2026-08-26：「每周自动回顾无法选模型」) —— 选择器在这儿，
                    因为他站的就是这一屏，而这一屏没有右边栏。⛔ 别拿「跳去别处选」搪塞。
                    「默认」= 一个 `--model` 都不发，也就是用他自己 CLI 账号里配好的那个。 */}
                {kind === 'cli' && engineReady && models.length > 0 && (
                  <label className="flex items-center gap-1.5">
                    <span className="text-xs text-muted">{t('用哪个模型')}</span>
                    <select
                      value={model ?? ''}
                      disabled={current !== null}
                      onChange={(e) =>
                        void update({ [modelKeyFor(selected)]: e.target.value || null })
                      }
                      className="rounded border border-line bg-paper px-1.5 py-0.5 text-xs text-ink outline-none focus:border-accent disabled:opacity-50"
                    >
                      <option value="">{t('默认')}</option>
                      {models.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {/* ⭐⭐ Ocean 2026-08-25：「加入 deepseek 的周总结，总结的 model 可以让用户自行选择」。
                    ⚠️ 模型是**设置里那个「模型」框**（`apiModel`），⛔ 这里不再做第二个选择器 ——
                    把它的名字写出来，用户点之前就知道这一下花的是谁的钱。 */}
                {kind === 'api' && <span className="text-xs text-ink-2">{apiModel}</span>}

                {/* ⭐ 余额贴着按它就要花钱的那个按钮。⛔ 不自动查 —— 点一下,或者一次运行
                    刚跑完顺带刷。 */}
                {kind === 'api' && <ApiBalance />}

                {/* ⭐ 2026-08-25（Ocean:「周回顾没法暂停」）—— 停下的按钮以前**只长在右边栏的
                    LiveRun 卡片上**，而钉住的视图（项目管理 / 周回顾）根本不挂右边栏（App.tsx:
                    `pinnedView ? null : …`）。所以从这一屏点「回顾这一周」的人，看着它转，
                    没有任何地方能停。⛔ 别用「跳回项目再停」搪塞：他就在这一屏。
                    ⚠️ 停下不是暂停 —— 停了不能续跑，再点一次是从头跑（已经写进去的留着）。 */}
                {running && (
                  <button
                    type="button"
                    onClick={() => void cancel()}
                    title={t('点一下停下来（停了不能续跑，再点就是从头再来）')}
                    className="rounded border border-line px-1.5 py-0.5 text-xs text-ink-2 transition-colors hover:border-accent hover:text-accent"
                  >
                    {t('停下')}
                  </button>
                )}

                {/* §4.3's master switch, moved here from 项目管理 (2026-08-11). It used to govern
                    two things and now governs one: with per-project 压缩 retired, a weekly review is
                    the only thing automation still runs — so it belongs beside the action, not beside
                    the projects it no longer touches.

                    ⚠️ Still default OFF, and that stays a deliberate reading of a request that pulled
                    two ways: Ocean asked for automation AND for 「必须节约token」/「让用户放心」 in one
                    breath, and this switch spends real money without asking again.
                    It runs on the type picked above (`autoReviewRoute`, 第 104 条). */}
                {reviewEntry === 'ready' && (
                  <label className="flex cursor-pointer items-center gap-2">
                    <Toggle checked={autoMaintain} onChange={(v) => void update({ aiAutoMaintain: v })} />
                    <span className="text-xs text-ink-2">{t('每周自动回顾一次')}</span>
                  </label>
                )}
              </div>

              {/* ⭐ 第二行：两句只在需要时才出现的话。⛔ 它们不是装饰 —— 各自堵着一个
                  「用户读到的是坏了」的洞。 */}
              {reviewEntry === 'ready' && (autoMaintain || codexNote) && (
                <div className="mt-1.5 space-y-1 px-1.5">
                  {/* ⭐⭐ 分组按自然周切，而自动回顾判的是「距上次成功满 7 天」（lib/weeks 那段
                      写着为什么两把尺子）。代价是「这一周」那一格可能空着、而自动那条还没到点，
                      ⇒ 这句话就是那个代价的补丁：⛔ 别让用户从一个空格子里去猜。 */}
                  {autoMaintain && (
                    <p className="text-[11px] text-muted">
                      {/* ⭐ 走哪条路要写出来 —— 上面选的那一类今天可能走不通（选了本机 CLI 然后卸了它），
                          那时 `effectiveAutoRoute` 会退到另一类，而另一类是**按字数花钱**的。
                          退让可以,悄悄退让不行。 */}
                      {/* ⚠️ `autoRun` 在这一行里不可能是 null —— 这一行的闸 `reviewEntry === 'ready'`
                          本身就是「至少有一条路」，和 `effectiveAutoRoute` 读的是同一对布尔。 */}
                      {t('自动那次走 {engine}。', {
                        engine: autoRun === 'api' ? apiModel : (cliName ?? t('CLI')),
                      })}{' '}
                      {nextAt === null
                        ? t('还没成功回顾过，下一次检查时就会跑。')
                        : daysLeft <= 0
                          ? t('该跑了——下一次检查时就跑（每十分钟看一次）。')
                          : t('下次自动回顾：还有 {n} 天。', { n: daysLeft })}
                    </p>
                  )}
                  {/* ⭐ 2026-08-26 (Ocean 拍的乙)：codex 有引擎、没模型单子，于是上面什么都不画 ——
                      而「一个选择器都不出」在用户那边读到的就是「坏了」。说一句为什么。 */}
                  {codexNote && (
                    <p className="text-[11px] leading-relaxed text-muted">{t(CODEX_NO_MODELS)}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* P9B-3 (Ocean 2026-09-30 第 13 条): 「活动」 first — it needs no AI and costs nothing, and
            it is the reason the door to this page is always open now (Sidebar, 第 76 条). */}
        <ActivityPanel />
        {reviews === null ? null : reviews.length === 0 ? (
          // ⚠️ P9C (第 93 – 98 条): only a ready bar earns the 「点上面那一下」 sentence. A locked bar
          // already says what is missing and opens it in place, so nothing is repeated here; with
          // 「显示 AI 功能」 off the page is 「活动」 and past reviews, and nothing about AI at all.
          // Past reviews are still listed below when there are any — they are the user's history,
          // not a prompt.
          reviewEntry !== null && emptyReviewsHint(reviewEntry) !== null ? (
            <p className="pt-6 text-center text-sm text-muted">{t(emptyReviewsHint(reviewEntry)!)}</p>
          ) : null
        ) : (
          <div className="space-y-6">
            {weeks.map((w) => (
              <WeekSection
                key={w.start}
                start={w.start}
                items={w.items}
                current={w.start === thisWeek}
                onDelete={remove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 一周一格 —— `W4`（Ocean:「周回顾每周的新进展应该组合在一起，以周为单位呈现」）。
 *
 * ⚠️ **一周里会有好几条**：自动跑一次 + 手动点几次 + 失败重试，全落在同一张表里。
 * ⛔ 所以这是「一周一格」，不是「一周一条」。
 *
 * ⚠️ 没跑成的那几条**折起来**（Ocean 2026-08-26 那一问，他答的是「可以删除记录」——
 * 删的按钮在下面，而折叠是同一件事的另一半：他库里 8 次有 5 次没跑成，摊开会把真正
 * 跑成的那一条埋掉）。
 */
function WeekSection({
  start,
  items,
  current,
  onDelete,
}: {
  start: number;
  items: EngineRun[];
  current: boolean;
  onDelete: (id: string) => Promise<void>;
}) {
  const t = useT();
  const ok = items.filter((r) => r.outcome === 'ok');
  const bad = items.filter((r) => r.outcome !== 'ok');
  const fmt = (ts: number): string =>
    new Date(ts).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric' });

  return (
    <section>
      <h3 className="flex items-baseline gap-2 border-b border-line pb-1 text-xs text-muted">
        <span className="font-mono text-ink-2">
          {fmt(start)} – {fmt(endOfWeek(start))}
        </span>
        {current && <span className="text-accent">{t('这一周')}</span>}
      </h3>

      {ok.length > 0 ? (
        <ul className="mt-3 space-y-4">
          {ok.map((r) => (
            <Review key={r.id} run={r} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs italic text-muted">{t('这一周没有跑成的回顾。')}</p>
      )}

      {bad.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-muted transition-colors hover:text-ink-2">
            {t('另有 {n} 次没跑成', { n: bad.length })}
          </summary>
          <ul className="mt-2 space-y-4">
            {bad.map((r) => (
              <Review key={r.id} run={r} onDelete={onDelete} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/** One past review, read rather than answered — so it has no buttons and never collapses on
 *  being dealt with.
 *
 *  ⚠️ 2026-08-26: a failed run now gets a 删掉 button (Ocean: 「失败的可以删除记录，另外跑
 *  成功的」). ⛔ 只有它有 —— 跑成的那些是这个功能的产物，而且 `spendSince` 的合计要靠它们
 *  才不说谎。原来那条「失败也要留档」的纪律是我们自己定的，他用下来推翻了它。 */
function Review({ run, onDelete }: { run: EngineRun; onDelete?: (id: string) => Promise<void> }) {
  const t = useT();
  const when = new Date(run.finishedAt).toLocaleString(dateLocale(), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const engineName = ENGINE_LABEL[run.engine as EngineKind] ?? run.engine;
  const cost = money(run.usage.costUsd);
  const text = (run.resultText ?? '').trim();
  // P10: a review stored as data; anything else is prose from before, split the P9S-5 way.
  const structured = useMemo(() => readWeeklyReview(text), [text]);
  const cards = useMemo(() => (text && !structured ? splitReview(text) : null), [text, structured]);

  return (
    <li className="border-b border-line pb-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-2 text-[10px] text-muted">
        <span className="font-mono text-ink-2">{when}</span>
        <span>· {engineName}</span>
        {run.usage.model && run.usage.model !== run.engine && <span>· {run.usage.model}</span>}
        <span>· {cost ?? t('花费未知')}</span>
        {onDelete && (
          <button
            type="button"
            onClick={() => void onDelete(run.id)}
            title={t('把这条没跑成的记录删掉')}
            className="ml-auto flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-paper-2 hover:text-ink-2"
          >
            <Trash2 size={10} className="flex-none" />
            {t('删掉')}
          </button>
        )}
      </div>
      {structured ? (
        <StructuredReview review={structured} client={`${t('周回顾')} · ${engineName}`} />
      ) : cards ? (
        // P9S-5 (Ocean 2026-10-23): one card per project.
        <ReviewCards review={cards} />
      ) : text ? (
        // §10.1 — a review is the longest Markdown any AI writes into Spool (「## 截止日期」,
        // one section per project), and it was the last surface still showing the raw `##`.
        // Same renderer as the block feed: its sizes are in em, so the hierarchy survives the
        // step down to 13px here. Still how a review that will not split into cards is drawn.
        <div className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">
          <MarkdownContent content={text} />
        </div>
      ) : (
        <div className="mt-1.5 text-xs italic text-muted">
          {run.outcome === 'cancelled' ? t('被你停下了') : t('这次什么也没回来')}
        </div>
      )}
      {/* §2.3 — the CLI's own words when it failed, never a Spool paraphrase. */}
      {run.detail && (
        <div className="mt-1.5 whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-muted">
          {run.detail}
        </div>
      )}
    </li>
  );
}
