import { Globe } from 'lucide-react';
import LockedAiEntry from '@/components/AiSetup/LockedAiEntry';
import PrivateAiEntry from '@/components/AiSetup/PrivateAiEntry';
import Toggle from '@/components/ui/Toggle';
import type { Thread } from '@/lib/db/threads';
import type { FollowUpState } from '@/lib/engine/followUp';
import { aiEntryState, canShowEngineActions, engineActionsDisabled } from '@/lib/engine/gate';
import { MarkdownContent } from '@/lib/blocks/MarkdownContent';
import { dateLocale, useT } from '@/lib/i18n';
import { IS_MAC } from '@/lib/platform';
import { ENGINE_LABEL, engineSupportsWeb, useEngineStore } from '@/stores/engineStore';
import { useFollowUpStore } from '@/stores/followUpStore';
import { useSettingsStore } from '@/stores/settingsStore';

/** 「上次查：10-22 · 带回 2 条，在待审里」 — the one quiet line the rail keeps about searching, and the
 *  same line here. Null before the first search. */
export const lastSearchLine = (t: ReturnType<typeof useT>, run: FollowUpState | null): string | null => {
  if (!run || run.lastRunAt <= 0) return null;
  const day = new Date(run.lastRunAt).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric' });
  return (run.lastFound ?? 0) > 0
    ? t('上次查：{day} · 带回 {n} 条，在待审里', { day, n: run.lastFound ?? 0 })
    : t('上次查：{day} · 没有新消息', { day });
};

/** P9S-6 (Ocean 2026-10-23: 「用户主动点击联网搜索退化到二级界面，跟进只能安静显示内容」) — everything about
 *  going out to search, one level down in the follow-up editor: the button, the weekly switch (第 173 /
 *  175 条, off by default), when it last searched, and what the AI said the last time.
 *
 *  The locks are the ones the rail used to draw (P9C 第 94、97、98 条; P9E-3 第 122 条), moved with the
 *  button: locked on a Mac without a usable CLI, hidden on Windows and with 「显示 AI 功能」 off. */
export default function FollowUpSearch({ thread, hasLines }: { thread: Thread; hasLines: boolean }) {
  const t = useT();
  const status = useEngineStore((s) => s.status);
  const current = useEngineStore((s) => s.current);
  const queue = useEngineStore((s) => s.queue);
  const enqueue = useEngineStore((s) => s.enqueue);
  const runs = useEngineStore((s) => s.runs);
  const mcpEnabled = useSettingsStore((s) => s.mcpEnabled);
  const mcpWriteEnabled = useSettingsStore((s) => s.mcpWriteEnabled);
  const actionsEnabled = useSettingsStore((s) => s.aiEngineActionsEnabled);
  const timeoutSecs = useSettingsStore((s) => s.aiEngineTimeoutSecs);
  const run = useFollowUpStore((s) => s.run);
  const setAuto = useFollowUpStore((s) => s.setAuto);

  const busyOnThisThread = current?.threadId === thread.id || queue.some((q) => q.threadId === thread.id);
  const cliAvailable = status?.available === true;
  const gate = { cliAvailable, mcpEnabled, mcpWriteEnabled, actionsEnabled, busyOnThisThread };
  const entry =
    status === null
      ? null
      : aiEntryState({
          ready: canShowEngineActions(gate),
          route: 'cli',
          showAi: actionsEnabled,
          isMac: IS_MAC,
          privateProject: thread.isPrivate,
        });
  const disabled = engineActionsDisabled(gate);
  const last = lastSearchLine(t, run);
  // The AI's own words from the last search of this project — they used to sit on a card at the top of
  // the rail. Here, folded, for whoever wants to read them.
  const reply = runs
    .filter((r) => r.action === 'follow_up' && r.threadId === thread.id && (r.resultText ?? '').trim())
    .sort((a, b) => b.finishedAt - a.finishedAt)[0];

  const body = ((): JSX.Element | null => {
    if (entry === null) return null;
    if (entry === 'private') return <PrivateAiEntry label={t('联网搜索')} />;
    if (!hasLines) return null;
    if (entry === 'locked') {
      return (
        <LockedAiEntry
          label={t('联网搜索')}
          reason={
            cliAvailable && status?.selected
              ? t('{engine} 已经装好，还差打开 MCP 那边的开关。', { engine: ENGINE_LABEL[status.selected] })
              : t('联网搜索要用本机的 Claude Code 或 Codex。')
          }
          route="cli"
        />
      );
    }
    if (entry !== 'ready') return null;
    if (!engineSupportsWeb(status?.selected ?? null)) {
      return (
        <p className="text-[11px] leading-relaxed text-muted">
          {t('联网搜索这一项 Gemini CLI 跑不了——它的免费额度一次跟进就用完了。换成 Claude Code 或 Codex 才有。')}
        </p>
      );
    }
    return null;
  })();
  if (body) return <div className="mt-3 border-t border-line pt-3">{body}</div>;
  if (entry !== 'ready' || !hasLines) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => enqueue(thread.id, thread.title, 'follow_up', timeoutSecs)}
          title={t('照你定的那几行联网搜索')}
          className="flex items-center gap-1.5 rounded border border-line bg-paper px-2.5 py-1 text-[11px] text-ink-2 transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:text-muted disabled:opacity-60"
        >
          <Globe size={11} className="flex-none" />
          {t('联网搜索')}
        </button>
        {last && <span className="text-[10px] text-muted">{last}</span>}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] text-ink-2">{t('每周自动查一次')}</div>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
            {t('用本机的 {engine}。查到新东西才放进待审，并标着「跟进」；没有就什么都不说。', {
              engine: status?.selected ? ENGINE_LABEL[status.selected] : 'Claude Code / Codex',
            })}
          </p>
        </div>
        <Toggle checked={run?.auto === true} onChange={(on) => void setAuto(on)} />
      </div>
      {reply && (
        <details className="text-[11px]">
          <summary className="cursor-pointer text-muted transition-colors hover:text-ink">
            {t('上次 AI 说的')}
          </summary>
          <div className="mt-1 whitespace-pre-wrap leading-relaxed text-ink-2">
            <MarkdownContent content={(reply.resultText ?? '').trim()} />
          </div>
        </details>
      )}
    </div>
  );
}
