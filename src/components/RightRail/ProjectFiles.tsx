import { File, Folder, Plus, Unlink, X } from 'lucide-react';
import { useMemo } from 'react';
import RailSection from './RailSection';
import { useT } from '@/lib/i18n';
import type { Attachment } from '@/lib/db/attachments';
import type { Block } from '@/lib/db/blocks';
import { addFilesFromPicker } from '@/lib/files/addFiles';
import { fileLabel, openFile } from '@/lib/files/openFile';
import { formatBlockTime } from '@/lib/utils/time';
import { useBlocksStore } from '@/stores/blocksStore';
import SeqBadge from '../ThreadView/SeqBadge';

// DESIGN_PROJECT_FILES §3.2 — 「项目文件」, the place a file lives now.
//
// Ocean 2026-08-08: 「右侧边栏加一个类似项目文件库的地方，点加号可以加入相关文件……
// 现在的文件对应整个项目，而不是一个 block」.
//
// ⚠️ The one invariant this panel exists to hold (§2): **the only source of a path is the
// system file dialog**. `pickFiles` is the sole way a row is created here, and a Finder drop
// onto the timeline is the same dialog by another name. Nothing an AI writes can put a path
// in this list — which is the entire reason 「自动挂本地文件」 was rejected in
// DESIGN_CONTEXT_HYGIENE §2 and this shape was not.
//
// ⭐ 2026-08-14: the 「AI 可读」 switch (§5.1 ①) is HERE now, and it arrived with phase three
// — the thing that reads it (`request_file_access`) shipped in the same build. It was held
// back on purpose until then: a switch that flips a column nothing reads is the
// shipped-but-inert control this project already recorded once (CASE_STUDY_LEDGER §3.5).
//
// ⚠️ Why the switch has to exist at all, and not just the approve button on the review
// screen: the grant an AI asks for is STANDING (Ocean 2026-08-08 ①) — one yes and it can
// read that file from then on. §5.1 ① is explicit that the price of skipping approval
// fatigue is that the permission must be revocable where the file is listed. This row IS
// that. ⚠️ 2026-10-05 (Ocean, P5 验收):「只有鼠标悬浮才显示」— the two switches now show only
// while the pointer is on the row (or focus is inside it), as 「打包可读」 / 「AI 可读」.
//
// ⚠️ It is NOT the same thing as 「打包可读」 sitting beside it, and merging them would be wrong
// in both directions: that one is the user putting text into a pack they are building; this
// one is whether an AI may go and ask for the file at all.
//
// P5 (Ocean 2026-10-05): one list for the project's files AND the files hung off its blocks,
// newest first, each with the time it was added. A block's file is told apart by that block's
// number in the same ring the block itself wears — no words (「项目文件和块文件……不要用现在
// 这种标记形式，设计一个更加简洁，尽量减少文字的方式」). Who added it is not shown: every file
// is the user's until P6, and only an AI-added one will carry a mark.

const EMPTY: readonly Attachment[] = [];
const EMPTY_BLOCKS: readonly Block[] = [];

export default function ProjectFiles({ threadId }: { threadId: string }) {
  const t = useT();
  const files = useBlocksStore((s) => s.attachmentsByThread[threadId] ?? EMPTY);
  const detach = useBlocksStore((s) => s.detach);
  const setIncludeInPack = useBlocksStore((s) => s.setIncludeInPack);
  const setAiAccess = useBlocksStore((s) => s.setAiAccess);
  const anchorAttachment = useBlocksStore((s) => s.anchorAttachment);
  // A block's file shows that block's number, so the rail needs the project's blocks.
  const blocks = useBlocksStore((s) => s.byThread[threadId] ?? EMPTY_BLOCKS);
  const seqById = useMemo(() => new Map(blocks.map((b) => [b.id, b.seq])), [blocks]);
  // Newest first. ⚠️ Only here: the store keeps join order, which is what packs are built in.
  const newestFirst = useMemo(() => [...files].sort((a, b) => b.createdAt - a.createdAt), [files]);

  return (
    <RailSection
      title={t('项目文件')}
      action={
        <button
          type="button"
          onClick={() => void addFilesFromPicker(threadId)}
          title={t('从文件选择器里加一个文件')}
          className="flex flex-none items-center gap-0.5 text-[12px] text-muted transition-colors hover:text-accent"
        >
          {t('加文件')}
          <Plus size={11} />
        </button>
      }
    >
      {newestFirst.length === 0 ? (
        <p className="px-3 text-[12px] leading-relaxed text-muted">
          {t('这个项目还没有文件。你加进来的文件，AI 默认能读到里面的文字，每个文件旁边的开关随时能关；打包时默认不带正文。')}
        </p>
      ) : (
        <ul>
          {newestFirst.map((a) => {
            const Icon = a.kind === 'folder' ? Folder : File;
            // v2.8 §20.2: the switches only mean anything once there is text, so they appear
            // only on a file that actually has some.
            const canInline = a.kind === 'file' && a.extractedText != null;
            // A file hangs off a block only while that block is in this project's feed.
            const seq = a.anchorBlockId != null ? seqById.get(a.anchorBlockId) : undefined;
            const onBlock = seq !== undefined;
            return (
              <li
                key={a.id}
                className="group/file flex items-center gap-1.5 rounded-md px-3 py-1 hover:bg-paper-2/60"
              >
                <Icon size={12} className="flex-none text-muted" />
                <button
                  type="button"
                  onClick={() => void openFile(a.target)}
                  title={a.target}
                  className="min-w-0 flex-1 truncate text-left text-[12px] text-ink-2 transition-colors hover:text-accent"
                >
                  {fileLabel(a)}
                </button>
                {onBlock && seq != null && (
                  <span title={t('挂在第 {n} 块上', { n: seq })} className="flex-none text-muted">
                    <SeqBadge seq={seq} />
                  </span>
                )}
                {/* At rest: when it was added. On hover the two switches take this place, so the
                    row never grows a second line and the list does not jump under the pointer. */}
                <span
                  className={`flex-none text-[11px] tabular-nums text-muted ${
                    canInline ? 'group-focus-within/file:hidden group-hover/file:hidden' : ''
                  }`}
                >
                  {formatBlockTime(a.createdAt)}
                </span>
                {canInline && (
                  <span className="hidden flex-none items-center gap-2 text-[11px] text-muted group-focus-within/file:flex group-hover/file:flex">
                    <label className="flex cursor-pointer items-center gap-1">
                      <input
                        type="checkbox"
                        checked={a.includeInPack}
                        onChange={(e) => void setIncludeInPack(a.id, threadId, e.target.checked)}
                        className="h-2.5 w-2.5 accent-[var(--accent)]"
                      />
                      {t('打包可读')}
                    </label>
                    {/* §5.1 ①: coloured when on, because a standing permission that looks exactly
                        like one you never gave is the failure mode. */}
                    <label
                      className={`flex cursor-pointer items-center gap-1 ${a.aiAccess ? 'text-accent' : ''}`}
                      title={t('关掉之后，AI 想再读它就得重新问你一次。')}
                    >
                      <input
                        type="checkbox"
                        checked={a.aiAccess}
                        onChange={(e) => void setAiAccess(a.id, threadId, e.target.checked)}
                        className="h-2.5 w-2.5 accent-[var(--accent)]"
                      />
                      {t('AI 可读')}
                    </label>
                  </span>
                )}
                {onBlock && (
                  <button
                    type="button"
                    onClick={() => void anchorAttachment(a.id, threadId, null)}
                    title={t('移到项目（不再挂在这一块上，文件还在这个项目里）')}
                    aria-label={t('移到项目（不再挂在这一块上，文件还在这个项目里）')}
                    className="flex-none rounded p-0.5 text-muted opacity-0 transition-opacity hover:text-ink group-focus-within/file:opacity-100 group-hover/file:opacity-100"
                  >
                    <Unlink size={11} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void detach(a.id, threadId)}
                  title={t('从这个项目里去掉（文件本身不动）')}
                  aria-label={t('从这个项目里去掉（文件本身不动）')}
                  className="flex-none rounded p-0.5 text-muted opacity-0 transition-opacity hover:text-ink group-focus-within/file:opacity-100 group-hover/file:opacity-100"
                >
                  <X size={11} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </RailSection>
  );
}
