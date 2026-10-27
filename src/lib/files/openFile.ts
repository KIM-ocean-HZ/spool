import type { Attachment } from '@/lib/db/attachments';
import { t } from '@/lib/i18n';
import { basename, openTarget } from '@/lib/utils/openTarget';
import { useBlocksStore } from '@/stores/blocksStore';
import { toast } from '@/stores/toastStore';
import { LOST_LABEL, lookOf } from './fileStatus';

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

/** P9-3 (「点开一个文件之前」): look first. A file that moved is followed and opens from where it
 *  is now; one that is gone says which way it is gone (P9-4's words) instead of the old
 *  「文件不存在或已被移动」, which could not tell the user whether it was Spool's fault. If the look
 *  itself fails, the recorded path is tried as before. */
export const openAttachment = async (a: Attachment): Promise<void> => {
  const [st] = await useBlocksStore.getState().locateFiles(a.threadId, [a.id]);
  const look = lookOf(st);
  if (look.kind === 'lost') {
    toast.error(t('打不开：{why}', { why: t(LOST_LABEL[look.why]) }));
    return;
  }
  await openFile(st?.path ?? a.target);
  // P12-2: opened is seen — its 「改过」 goes (DISCOVERED-20261025-11, 「标到用户打开那个文件为止」).
  await useBlocksStore.getState().fileOpened(a.id);
};
