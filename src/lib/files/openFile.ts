import type { Attachment } from '@/lib/db/attachments';
import { t } from '@/lib/i18n';
import { basename, openTarget } from '@/lib/utils/openTarget';
import { toast } from '@/stores/toastStore';

// The one way a project file is opened and named — the right rail's 「项目文件」 and the file
// line under a block (P5-2) both go through here, so a file that has moved says the same
// thing wherever it is clicked.

/** Display name: the label the user kept, or the file's own name. */
export const fileLabel = (a: Attachment): string => a.label.trim() || basename(a.target);

/** Open with the default application. §14.4: a file the user has since moved is not a crash. */
export const openFile = async (target: string): Promise<void> => {
  try {
    await openTarget(target);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('无法打开附件'));
  }
};
