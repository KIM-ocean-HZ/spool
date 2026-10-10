import { t } from '@/lib/i18n';
import { toast } from '@/stores/toastStore';

// P9-1 — the one line the user sees when a name THEY gave (create, rename, move) landed as
// 「<name> 2」 because the name was taken there. An undo or an import renames silently: the
// user did not name anything, and the result is right there in the sidebar.
export const noticeRenamed = (
  kind: 'project' | 'workspace',
  asked: string,
  stored: string,
): void => {
  if (stored === asked) return;
  const vars = { name: asked.trim(), renamed: stored };
  toast.notice(
    kind === 'project'
      ? t('同一个工作区里已经有叫「{name}」的项目了，这个改叫「{renamed}」', vars)
      : t('同一层已经有叫「{name}」的工作区了，这个改叫「{renamed}」', vars),
  );
};
