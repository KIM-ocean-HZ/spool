import { useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { fileLabel } from '@/lib/files/openFile';
import { useDeleteFilesPromptStore } from '@/stores/deleteFilesPromptStore';

// P5-3 — the one question a block delete can ask: files hang off the blocks being deleted,
// should they leave the project too, or stay on it? Ocean 2026-10-03:「提示用户是否删除，获得
// 许可后直接删除，不然就留在项目」. Asked by askBeforeDeletingBlocks; mounted once in App, like
// ArchiveWorkspaceDialog. Esc, the backdrop and 取消 all mean 「先不删了」 — nothing is deleted.
export default function DeleteBlockFilesDialog() {
  const t = useT();
  const files = useDeleteFilesPromptStore((s) => s.files);
  const answer = useDeleteFilesPromptStore((s) => s.answer);
  const open = files.length > 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') answer(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, answer]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/30 p-8"
      onClick={() => answer(null)}
    >
      <div
        className="w-[440px] rounded-lg border border-line-strong bg-paper"
        style={{ boxShadow: 'var(--shadow-toast)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2 px-5 py-4 text-sm text-ink-2">
          <p className="font-serif text-lg text-ink">{t('要删的块上挂着文件')}</p>
          <ul className="space-y-0.5">
            {files.map((f) => (
              <li key={f.id} className="truncate text-ink" title={f.target}>
                {fileLabel(f)}
              </li>
            ))}
          </ul>
          <p>{t('这些文件要一起从项目里去掉吗？去掉只是 Spool 不再记着它，电脑上的文件不动。')}</p>
          <p>{t('留在项目里的话，它们会改成挂在项目上。')}</p>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line bg-paper-2/40 px-5 py-3 text-xs">
          <button
            type="button"
            onClick={() => answer(null)}
            className="mr-auto rounded-md px-2 py-1.5 text-muted transition-colors hover:text-ink"
          >
            {t('取消')}
          </button>
          <button
            type="button"
            onClick={() => answer('keep')}
            className="rounded-md border border-line bg-paper px-3 py-1.5 text-ink-2 transition-colors hover:border-line-strong"
          >
            {t('留在项目里')}
          </button>
          <button
            type="button"
            onClick={() => answer('remove')}
            className="rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-accent transition-colors hover:bg-accent/20"
          >
            {t('一起从项目里去掉')}
          </button>
        </footer>
      </div>
    </div>
  );
}
