import { File, Folder, Image as ImageIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import SeqBadge from '../ThreadView/SeqBadge';
import type { Attachment } from '@/lib/db/attachments';
import { fileLabel } from '@/lib/files/openFile';
import { useT } from '@/lib/i18n';
import { fetchSourceSizes, formatBytes, isFound, openNearestFolder, type SourceSize } from '@/lib/pack/exportList';

// P8-3 / P8-4 — what goes along with a pack (Ocean 2026-09-30 §9.2 第 12 条, 10-10 第 53 条):
// every file on its own row — name, path, size, the block it hangs off — ticked by default, with
// 「全选」; the pictures are ONE switch, 「图片 N 张，共 X MB」; the total underneath.
// ⚠️ The path is for the user's own eyes. It is shown here and nowhere in the exported .md.
// P8 验收第一轮 (Ocean 2026-10-10): the path is shown WHOLE, on its own line — cut short beside a
// long file name it said 「Lecture 3 - Introduction to Natural Lang…」 and nobody could tell where
// the file was supposed to be. A file not there any more offers to open the nearest folder that
// still is, so the user can go and look.

/** One project's files (a workspace export lists one group per ticked project). */
export interface CopyGroup {
  key: string;
  /** The project's name, in a workspace export; none for a single project. */
  title?: string;
  files: Attachment[];
}

/** Sizes of these files, asked fresh each time the list opens. null while asking. A failed
 *  question leaves the sizes unknown (「—」) rather than calling every file missing. */
export const useSourceSizes = (files: readonly Attachment[]): Map<string, SourceSize> | null => {
  const key = files.map((a) => a.target).join('\n');
  const [sizes, setSizes] = useState<Map<string, SourceSize> | null>(null);
  useEffect(() => {
    let stale = false;
    setSizes(null);
    void fetchSourceSizes(key ? key.split('\n') : [])
      .then((m) => !stale && setSizes(m))
      .catch((e) => {
        console.warn('[pack] file sizes failed', e);
        if (!stale) setSizes(new Map());
      });
    return () => {
      stale = true;
    };
  }, [key]);
  return sizes;
};

interface Props {
  groups: CopyGroup[];
  /** block id → its number, for 「挂在哪」 (the same ring the right rail shows). */
  seqs: ReadonlyMap<string, number>;
  sizes: ReadonlyMap<string, SourceSize> | null;
  picked: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  /** The pictures this pack really prints (blocks in the range, not retired). */
  pictures: { count: number; bytes: number };
  picturesOn: boolean;
  onTogglePictures: () => void;
}

export default function PackCopyList({
  groups,
  seqs,
  sizes,
  picked,
  onToggle,
  onToggleAll,
  pictures,
  picturesOn,
  onTogglePictures,
}: Props) {
  const t = useT();
  const files = groups.flatMap((g) => g.files);
  const found = files.filter((a) => isFound(sizes, a));
  const allOn = found.length > 0 && found.every((a) => picked.has(a.id));
  const someOn = found.some((a) => picked.has(a.id));
  const fileBytes = files
    .filter((a) => picked.has(a.id))
    .reduce((sum, a) => sum + (sizes?.get(a.target)?.bytes ?? 0), 0);
  const count = picked.size + (picturesOn ? pictures.count : 0);
  const bytes = fileBytes + (picturesOn ? pictures.bytes : 0);

  const row = (a: Attachment) => {
    const size = sizes?.get(a.target);
    const here = isFound(sizes, a);
    const seq = a.anchorBlockId != null ? seqs.get(a.anchorBlockId) : undefined;
    const Icon = a.kind === 'folder' ? Folder : File;
    return (
      <div key={a.id} className="py-0.5">
        <label className={`flex items-center gap-2 ${here ? 'cursor-pointer' : 'opacity-50'}`}>
          <input
            type="checkbox"
            checked={picked.has(a.id)}
            disabled={!here}
            onChange={() => onToggle(a.id)}
            className="h-3 w-3 flex-none accent-[var(--accent)]"
          />
          <Icon size={11} className="flex-none text-muted" />
          <span className="min-w-0 flex-1 truncate text-ink" title={fileLabel(a)}>
            {fileLabel(a)}
          </span>
          <span className="flex-none whitespace-nowrap text-right tabular-nums text-muted">
            {!here ? t('找不到了') : size ? formatBytes(size.bytes) : sizes ? '—' : '…'}
          </span>
          {/* Like the right rail: a block's file shows the block's number; a project's file nothing. */}
          <span
            title={seq != null ? t('挂在第 {n} 块上', { n: seq }) : undefined}
            className="flex w-[18px] flex-none items-center justify-end text-muted"
          >
            {seq != null && <SeqBadge seq={seq} />}
          </span>
        </label>
        {/* 39px = the checkbox, the icon and the two gaps: the path starts under the name. */}
        <div className="pl-[39px] pr-[26px] text-[10.5px] leading-snug">
          <span className="select-text break-all text-muted">{a.target}</span>
          {!here && (
            <button
              type="button"
              onClick={() => void openNearestFolder(a.target).catch((e) => console.warn('[pack] open folder failed', e))}
              className="mt-0.5 block text-accent hover:underline"
            >
              {t('打开最近的文件夹')}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-none border-t border-line bg-paper-2/30 px-5 py-2 text-[11px]">
      <div className="flex items-center justify-between pb-1">
        <span className="text-muted">{t('一起导出的文件和图片')}</span>
        {found.length > 0 && (
          <label className="flex cursor-pointer items-center gap-1.5 text-muted hover:text-ink">
            <input
              type="checkbox"
              checked={allOn}
              ref={(el) => {
                if (el) el.indeterminate = someOn && !allOn;
              }}
              onChange={onToggleAll}
              className="h-3 w-3 accent-[var(--accent)]"
            />
            {t('全选')}
          </label>
        )}
      </div>
      <div className="max-h-[220px] overflow-y-auto">
        {groups.map((g) => (
          <div key={g.key}>
            {g.title !== undefined && g.files.length > 0 && (
              <div className="truncate pt-1 text-ink-2">{g.title}</div>
            )}
            {g.files.map(row)}
          </div>
        ))}
        {pictures.count > 0 && (
          // In a workspace the switch is for every project's pictures — set apart, so it does
          // not read as the last project's.
          <label
            className={`flex cursor-pointer items-center gap-2 py-0.5 ${
              groups.some((g) => g.title !== undefined) ? 'mt-1 border-t border-line pt-1' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={picturesOn}
              onChange={onTogglePictures}
              className="h-3 w-3 flex-none accent-[var(--accent)]"
            />
            <ImageIcon size={11} className="flex-none text-muted" />
            <span className="text-ink">
              {t('图片 {n} 张，共 {size}', { n: pictures.count, size: formatBytes(pictures.bytes) })}
            </span>
          </label>
        )}
      </div>
      <div className="pt-1 text-muted">
        {t('一共 {n} 个文件，{size}', { n: count, size: formatBytes(bytes) })}
      </div>
    </div>
  );
}
