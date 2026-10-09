import { invoke } from '@tauri-apps/api/core';
import type { Attachment } from '@/lib/db/attachments';
import { t } from '@/lib/i18n';
import { baseName } from './assemble';

// P8-3 / P8-4 — the list under a pack dialog: which of the project's files go along, and how big
// (Ocean 2026-09-30 §9.2 第 12 条: 列出要拷哪些文件、一共多大，加「全选」和「只选其中几个」).

/** `pack.rs::pack_source_sizes` for one path. `kind` null = not on this computer any more. */
export interface SourceSize {
  kind: 'file' | 'folder' | null;
  bytes: number;
}

/** Asked fresh every time the list opens — a file can be moved while Spool is running. */
export const fetchSourceSizes = async (paths: readonly string[]): Promise<Map<string, SourceSize>> => {
  if (paths.length === 0) return new Map();
  const got = await invoke<SourceSize[]>('pack_source_sizes', { paths });
  return new Map(paths.map((p, i) => [p, got[i]!]));
};

/** Found on this computer — or not known yet. ⚠️ Not knowing does not lock a row:
 *  `write_pack_export` looks at every source again and refuses the whole export if one is gone. */
export const isFound = (sizes: ReadonlyMap<string, SourceSize> | null, a: Attachment): boolean =>
  sizes?.get(a.target)?.kind !== null;

/** The ticked files. Everything starts ticked (第 50 条: 默认带上); the user turns some off, and
 *  a file that is not on this computer any more can never be ticked (「找不到了」). */
export const pickedFiles = (
  files: readonly Attachment[],
  sizes: ReadonlyMap<string, SourceSize> | null,
  unticked: ReadonlySet<string>,
): Set<string> => new Set(files.filter((a) => isFound(sizes, a) && !unticked.has(a.id)).map((a) => a.id));

export const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${bytes === 0 ? 0 : Math.max(1, Math.round(bytes / 1024))} KB`;

/** The sentence for an export that did not happen. Rust answers the two cases the user can do
 *  something about with a code (`pack.rs::write_pack_export`). */
export const exportErrorMessage = (e: unknown): string => {
  const code = e instanceof Error ? e.message : String(e);
  if (code.startsWith('missing:')) {
    try {
      const paths = JSON.parse(code.slice('missing:'.length)) as string[];
      return t('这些文件刚才还在，现在找不到了，所以什么都没导出：{names}', {
        names: paths.map(baseName).join('、'),
      });
    } catch {
      // fall through to the general sentence
    }
  }
  if (code === 'no_image') return t('有图片已经不在库里了，所以什么都没导出。关掉再打开一次试试。');
  return t('没导出成，换个位置再试一次');
};
