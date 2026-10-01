import { useEffect, useMemo } from 'react';
import { useT } from '@/lib/i18n';
import { archivePlan } from '@/lib/workspaces/archive';
import { buildWorkspaceTree } from '@/lib/workspaces/tree';
import { useThreadsStore } from '@/stores/threadsStore';
import { useWorkspacesStore } from '@/stores/workspacesStore';

// Right-click a workspace → 归档 (Ocean 2026-09-30 #9: 「右键也可以强制把工作区移入 archive，
// 所有项目随之完成」). It finishes projects in bulk, so it asks first and says exactly what
// will happen: how many projects, and where capture goes if the target is one of them. The
// numbers come from the same archivePlan the store then runs. Mounted once in App, like the
// pack dialogs.
export default function ArchiveWorkspaceDialog() {
  const t = useT();
  const archivingId = useWorkspacesStore((s) => s.archivingId);
  const setArchiving = useWorkspacesStore((s) => s.setArchiving);
  const archive = useWorkspacesStore((s) => s.archive);
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const threadsByWs = useThreadsStore((s) => s.threadsByWorkspace);

  const plan = useMemo(
    () =>
      archivingId
        ? archivePlan(buildWorkspaceTree(workspaces), Object.values(threadsByWs).flat(), archivingId)
        : null,
    [archivingId, workspaces, threadsByWs],
  );

  useEffect(() => {
    if (!archivingId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setArchiving(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [archivingId, setArchiving]);

  if (!archivingId || !plan) return null;

  const name = workspaces.find((w) => w.id === archivingId)?.title.trim() || t('未命名');
  const close = (): void => setArchiving(null);
  const onConfirm = async (): Promise<void> => {
    close();
    await archive(archivingId);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/30 p-8"
      onClick={close}
    >
      <div
        className="w-[440px] rounded-lg border border-line-strong bg-paper"
        style={{ boxShadow: 'var(--shadow-toast)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2 px-5 py-4 text-sm text-ink-2">
          <p className="font-serif text-lg text-ink">{t('归档「{name}」', { name })}</p>
          <p>{t('这会把 {n} 个项目标为完成，结论留空。', { n: plan.toComplete.length })}</p>
          <p>{t('工作区会移到左栏最底下的「归档」里。按 ⌘Z 可以撤回。')}</p>
          {plan.captureFrom &&
            (plan.captureTo ? (
              <p>
                {t('捕捉目标会从「{from}」换到「{to}」。', {
                  from: plan.captureFrom.title.trim() || t('无标题'),
                  to: plan.captureTo.title.trim() || t('无标题'),
                })}
              </p>
            ) : (
              <p>
                {t('没有别的没完成的项目，捕捉目标仍留在「{from}」。', {
                  from: plan.captureFrom.title.trim() || t('无标题'),
                })}
              </p>
            ))}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line bg-paper-2/40 px-5 py-3 text-xs">
          <button
            type="button"
            onClick={close}
            className="rounded-md border border-line bg-paper px-3 py-1.5 text-ink-2 transition-colors hover:border-line-strong"
          >
            {t('取消')}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            className="rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-accent transition-colors hover:bg-accent/20"
          >
            {t('归档')}
          </button>
        </footer>
      </div>
    </div>
  );
}
