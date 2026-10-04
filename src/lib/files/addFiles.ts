import { t } from '@/lib/i18n';
import { basename, pickFiles } from '@/lib/utils/openTarget';
import { useBlocksStore } from '@/stores/blocksStore';
import { toast } from '@/stores/toastStore';

// The system file picker, then every chosen file into the project — on the project itself
// (the right rail's 「加文件」), or hung off one block (that block's own 「加文件」, Ocean
// 2026-10-05). ⚠️ The picker is the only source of a path, same rule as ever (DESIGN_PROJECT_FILES §2).
export const addFilesFromPicker = async (
  threadId: string,
  anchorBlockId: string | null = null,
): Promise<void> => {
  try {
    const paths = await pickFiles();
    for (const p of paths) {
      await useBlocksStore
        .getState()
        .attach({ threadId, kind: 'file', target: p, label: basename(p), anchorBlockId });
    }
  } catch (e) {
    console.error('[files] picker failed', e);
    toast.error(t('添加文件失败：{msg}', { msg: e instanceof Error ? e.message : String(e) }));
  }
};
