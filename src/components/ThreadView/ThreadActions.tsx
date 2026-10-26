import { CheckCircle2, Package, RotateCcw } from 'lucide-react';
import type { Thread } from '@/lib/db/threads';
import { useT } from '@/lib/i18n';
import { IS_MAC } from '@/lib/platform';
import { ACTION_LABEL, useEngineStore } from '@/stores/engineStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useThreadsStore } from '@/stores/threadsStore';

// Shared by the visible header and the workspace's noninteractive width measurement.
// Mounting this component only reads state; writes happen on the visible buttons' clicks.
export default function ThreadActions({ thread, onPack, onComplete, onReopen }: {
  thread: Thread;
  onPack?: () => void;
  onComplete?: () => void;
  onReopen?: () => void;
}) {
  const t = useT();
  const setCaptureTarget = useThreadsStore((s) => s.setCaptureTarget);
  // The running pill opens the rail; it does not cancel work. The rail starts
  // collapsed, so the header must still show work the user has started.
  const engineCurrent = useEngineStore((s) => s.current);
  const engineQueue = useEngineStore((s) => s.queue);
  const updateSettings = useSettingsStore((s) => s.update);
  const runningHere = engineCurrent?.threadId === thread.id;
  return (
    <>
      <button
        data-thread-pack
        onClick={onPack}
        className="flex flex-none items-center gap-1 rounded-full border border-accent/60 px-3 py-1 text-xs font-medium text-accent transition-colors hover:border-accent hover:bg-accent/15"
        title={t('打包上下文（⌘⇧P）')}
      >
        <Package size={12} />
        <span>{t('打包')}</span>
      </button>

      {/* The running pill. Same shape as 捕捉中 so the two read as one system. Ocean could
          not tell it was the cancel button (#4) — so it is not one any more: it is a status
          that OPENS THE RAIL, where the live text and the stop button now are. */}
      {runningHere && engineCurrent && (
        <button
          onClick={() => void updateSettings({ railCollapsed: false })}
          title={t('点一下打开右边，看它在写什么')}
          className="flex flex-none items-center gap-1 rounded-full border border-accent/60 px-2.5 py-1 text-[11px] text-accent transition-colors hover:border-accent hover:bg-accent/15"
        >
          <span>
            {engineQueue.length > 0
              ? t('{action}中 · 还排着 {n} 个', {
                  action: t(ACTION_LABEL[engineCurrent.action]),
                  n: engineQueue.length,
                })
              : t('{action}中', { action: t(ACTION_LABEL[engineCurrent.action]) })}
          </span>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
        </button>
      )}

      {/* #7 (2026-07-13): folding the capture switch into ⋯ killed its
          discoverability for new users — a quiet ghost button restores it. When
          this thread IS the target it becomes a plain 捕捉中 status, not a button. */}
      {thread.status !== 'done' &&
        (thread.isCaptureTarget ? (
          <span className="flex flex-none items-center gap-1 text-[11px] text-muted">
            {t('捕捉中')}
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          </span>
        ) : (
          <button
            onClick={() => void setCaptureTarget(thread.id)}
            title={IS_MAC ? t('之后的 ⌘C+双击 ⌥ 捕捉都会落进这个项目') : t('之后捕捉到的内容都会落进这个项目')}
            className="flex flex-none items-center rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
          >
            {t('捕捉到此')}
          </button>
        ))}

      {/* §9.2 R3 — the third and last button. It used to be the only item worth keeping
          in the ⋯ menu, and a menu holding one item is a click in front of a button. */}
      {thread.status === 'done' ? (
        <button
          onClick={onReopen}
          title={t('重新打开（清除完成时间和结论）')}
          className="flex flex-none items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <RotateCcw size={12} />
          <span>{t('重新打开')}</span>
        </button>
      ) : (
        <button
          onClick={onComplete}
          title={t('完成项目')}
          className="flex flex-none items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <CheckCircle2 size={12} />
          <span>{t('完成项目')}</span>
        </button>
      )}
    </>
  );
}
