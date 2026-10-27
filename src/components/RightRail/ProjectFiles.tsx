import { open } from '@tauri-apps/plugin-dialog';
import {
  Bot,
  ChevronDown,
  ChevronRight,
  File,
  FileQuestion,
  FileX,
  Folder,
  FolderLock,
  HardDrive,
  Plus,
  Trash2,
  Unlink,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import RailSection from './RailSection';
import { useT } from '@/lib/i18n';
import { isMcpSource } from '@/lib/blocks/sourceIcon';
import type { Attachment } from '@/lib/db/attachments';
import type { Block } from '@/lib/db/blocks';
import { addFilesFromPicker } from '@/lib/files/addFiles';
import {
  countUnconfirmedLost,
  lookOf,
  lostActions,
  LOST_LABEL,
  type FileLook,
  type LostAction,
  type LostWhy,
} from '@/lib/files/fileStatus';
import { CHANGED_NOTICE, DISMISSED_NOTICE, findSameName, type SameNameCandidate } from '@/lib/files/locate';
import { fileLabel, openAttachment } from '@/lib/files/openFile';
import { groupFileVersions } from '@/lib/files/versions';
import { formatBytes, openNearestFolder } from '@/lib/pack/exportList';
import { IS_MAC } from '@/lib/platform';
import { formatBlockTime } from '@/lib/utils/time';
import { useBlocksStore } from '@/stores/blocksStore';
import { toast } from '@/stores/toastStore';
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
//
// P6-4 (Ocean 2026-10-06 #3 / #4): that mark is the robot the AI's blocks wear, in place of the
// file icon, naming the AI on hover — no words on the row. And a file a newer version replaced
// has no row of its own: it folds under the new one, behind a small arrow, greyed when shown
// (`lib/files/versions.ts` has what happens to a chain, and to one whose new version is gone).

// `<client> · MCP` → the client's name; a bare `MCP` (the client sent no name) → 'AI'.
const aiName = (addedBy: string): string => {
  const name = addedBy.split(' · MCP')[0]!.trim();
  return name === '' || name === 'MCP' || name.startsWith('MCP — ') ? 'AI' : name;
};

const EMPTY: readonly Attachment[] = [];
const EMPTY_BLOCKS: readonly Block[] = [];

// P9-4 (Ocean 2026-10-10 第 57、58、66 条) — a file that is not where Spool recorded it says
// WHICH way it is gone, and what can be done. ⚠️ An icon per way, never a warning sign per row:
// the rail is allowed one at most (HANDOFF §10.6), and a list with three missing files would
// otherwise be a column of them.
const LOST_ICON: Record<LostWhy, LucideIcon> = {
  trash: Trash2,
  deleted: FileX,
  offline: HardDrive,
  unknown: FileQuestion,
  held: FolderLock,
};

// The colour Settings already uses for 「路径已变」 — attention without alarm.
const ATTENTION = { color: 'var(--status-parked)' } as const;

const parentOf = (path: string): string => path.replace(/[/\\][^/\\]*$/, '') || path;

type Lost = Extract<FileLook, { kind: 'lost' }>;

/** Under a missing file's row: the plain words, then the ways out. Once the user has said
 *  「知道了」 it goes quiet — grey words, the ways out only while the pointer is on it. */
function LostDetail({ a, threadId, look }: { a: Attachment; threadId: string; look: Lost }) {
  const t = useT();
  const relocateFile = useBlocksStore((s) => s.relocateFile);
  const setFileNotice = useBlocksStore((s) => s.setFileNotice);
  // 「找一找」: null = not asked; 'looking' while Spotlight answers.
  const [found, setFound] = useState<SameNameCandidate[] | 'looking' | null>(null);

  const moveTo = (path: string): void => {
    void relocateFile(threadId, a.id, path).catch((e) => {
      const code = e instanceof Error ? e.message : String(e);
      toast.error(
        code === 'missing'
          ? t('那个位置上已经没有这个文件了')
          : code === 'wrong_kind'
            ? a.kind === 'folder'
              ? t('这里要选一个文件夹')
              : t('这里要选一个文件')
            : t('没改成，再试一次'),
      );
    });
  };
  const run: Record<LostAction, () => void> = {
    find: () => {
      setFound('looking');
      void findSameName(a.id)
        .then(setFound)
        .catch((e) => {
          console.warn('[files] same-name search failed', e);
          setFound([]);
        });
    },
    thisOne: () => {
      if (look.foundAt) moveTo(look.foundAt);
    },
    nearest: () =>
      void openNearestFolder(a.target).catch((e) => console.warn('[files] open folder failed', e)),
    relocate: () =>
      void open({ multiple: false, directory: a.kind === 'folder' }).then((picked) => {
        if (typeof picked === 'string') moveTo(picked);
      }),
    dismiss: () => void setFileNotice(a.id, DISMISSED_NOTICE),
  };
  const label: Record<LostAction, string> = {
    find: t('找一找'),
    thisOne: t('是这个'),
    nearest: t('打开最近的文件夹'),
    relocate: t('重新选位置'),
    dismiss: t('知道了'),
  };

  return (
    <div className="pb-1 pl-[30px] pr-3 text-[11px] leading-snug">
      <div className={look.quiet ? 'text-muted' : ''} style={look.quiet ? undefined : ATTENTION}>
        {t(LOST_LABEL[look.why])}
      </div>
      {look.why === 'held' && look.foundAt && (
        <div className="select-text break-all text-muted">{look.foundAt}</div>
      )}
      <div
        className={`flex-wrap gap-x-3 gap-y-0.5 ${
          look.quiet ? 'hidden group-focus-within/lost:flex group-hover/lost:flex' : 'flex'
        }`}
      >
        {lostActions(look.why, look.quiet, IS_MAC).map((k) => (
          <button
            key={k}
            type="button"
            onClick={run[k]}
            className={`${look.quiet ? 'text-muted hover:text-ink' : 'text-accent'} hover:underline`}
          >
            {label[k]}
          </button>
        ))}
      </div>
      {found === 'looking' && <div className="pt-0.5 text-muted">{t('正在找…')}</div>}
      {Array.isArray(found) &&
        (found.length === 0 ? (
          <div className="pt-0.5 text-muted">{t('没找到同名的文件')}</div>
        ) : (
          <div className="pt-0.5">
            <div className="text-muted">{t('找到 {n} 个同名文件', { n: found.length })}</div>
            {/* 第 58 条: Spool lists them, the user picks — ⛔ never one chosen for them. Each shows
                the whole folder it is in (P8 验收: a path cut short tells nobody anything). */}
            <ul>
              {found.map((c) => (
                <li key={c.path} className="flex items-start gap-2 py-0.5">
                  <span className="min-w-0 flex-1">
                    <span className="block select-text break-all text-ink-2">{parentOf(c.path)}</span>
                    <span className="tabular-nums text-muted">
                      {a.kind === 'folder'
                        ? formatBlockTime(c.modifiedMs)
                        : `${formatBytes(c.bytes)} · ${formatBlockTime(c.modifiedMs)}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => moveTo(c.path)}
                    className="flex-none text-accent hover:underline"
                  >
                    {t('是这个')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

/** `isPrivate` (P9H-4, DISCOVERED-20261016-1): no AI connected through Spool reads a private
 *  project's files, switch on or not (P9E-2's view leaves them out) — so the rail does not say it
 *  can, and 「AI 可读」 is not drawn. `ai_access` itself is left alone: make the project public
 *  again and every switch is back as it was. */
export default function ProjectFiles({ threadId, isPrivate = false }: { threadId: string; isPrivate?: boolean }) {
  const t = useT();
  const files = useBlocksStore((s) => s.attachmentsByThread[threadId] ?? EMPTY);
  const detach = useBlocksStore((s) => s.detach);
  const setIncludeInPack = useBlocksStore((s) => s.setIncludeInPack);
  const setAiAccess = useBlocksStore((s) => s.setAiAccess);
  const anchorAttachment = useBlocksStore((s) => s.anchorAttachment);
  // A block's file shows that block's number, so the rail needs the project's blocks.
  const blocks = useBlocksStore((s) => s.byThread[threadId] ?? EMPTY_BLOCKS);
  const seqById = useMemo(() => new Map(blocks.map((b) => [b.id, b.seq])), [blocks]);
  // Newest first, older versions folded under their replacement. ⚠️ Only here: the store keeps
  // join order, which is what packs are built in.
  const groups = useMemo(() => groupFileVersions(files), [files]);

  // P9-3 / P9-4: look at this project's files when the rail shows them, and again each time
  // Spool comes back to the front — the user moved one in Finder and came back to see (第 66 条
  // 「回到 Spool，右栏那个文件标着已跟到新位置」). Only the rows on top: an older version folded
  // under its replacement is history, and opening it looks at it then (`openAttachment`).
  // ⛔ Nothing else in the library is looked at.
  const locateFiles = useBlocksStore((s) => s.locateFiles);
  const fileStates = useBlocksStore((s) => s.fileStates);
  const reExtracted = useBlocksStore((s) => s.reExtracted);
  const setFileNotice = useBlocksStore((s) => s.setFileNotice);
  const shownIds = useMemo(() => groups.map((g) => g.file.id), [groups]);
  const idsKey = shownIds.join(',');
  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(',');
    const look = (): void => void locateFiles(threadId, ids);
    look();
    window.addEventListener('focus', look);
    return () => window.removeEventListener('focus', look);
  }, [threadId, idsKey, locateFiles]);
  // 「主动」: how many are gone that the user has not said 「知道了」 to — beside the title, so
  // nobody has to click through the files to find out.
  const missing = countUnconfirmedLost(shownIds, fileStates);

  // Folded by default (Ocean 2026-10-06 #4); not remembered — it is a glance, not a setting.
  const [unfolded, setUnfolded] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (id: string): void =>
    setUnfolded((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // The icon at the head of a row: the robot when an AI proposed it and the user approved.
  // P9-4: a file that is gone wears the icon of HOW it is gone instead (grey once confirmed).
  const iconFor = (a: Attachment, look: FileLook = { kind: 'normal' }) => {
    if (look.kind === 'lost') {
      const Icon = LOST_ICON[look.why];
      return (
        <span className="flex flex-none" style={look.quiet ? undefined : ATTENTION}>
          <Icon size={12} className={look.quiet ? 'text-muted' : ''} />
        </span>
      );
    }
    if (isMcpSource(a.addedBy)) {
      return (
        <span title={t('{name} 提议、你同意的', { name: aiName(a.addedBy!) })} className="flex flex-none">
          <Bot size={12} className="text-accent" />
        </span>
      );
    }
    const Icon = a.kind === 'folder' ? Folder : File;
    return <Icon size={12} className="flex-none text-muted" />;
  };

  return (
    <RailSection
      title={
        <>
          {t('项目文件')}
          {missing > 0 && (
            <span className="ml-2" style={ATTENTION}>
              {t('{n} 个找不到了', { n: missing })}
            </span>
          )}
        </>
      }
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
      {groups.length === 0 ? (
        <p className="px-3 text-[12px] leading-relaxed text-muted">
          {isPrivate
            ? t('私密项目：通过 Spool 连接的 AI 读不到这里的文件。打包时默认不带正文。')
            : t('这个项目还没有文件。你加进来的文件，AI 默认能读到里面的文字，每个文件旁边的开关随时能关；打包时默认不带正文。')}
        </p>
      ) : (
        <ul>
          {groups.map(({ file: a, replaced, older }) => {
            // v2.8 §20.2: the switches only mean anything once there is text, so they appear
            // only on a file that actually has some.
            const canInline = a.kind === 'file' && a.extractedText != null;
            // A file hangs off a block only while that block is in this project's feed.
            const seq = a.anchorBlockId != null ? seqById.get(a.anchorBlockId) : undefined;
            const onBlock = seq !== undefined;
            const open = unfolded.has(a.id);
            const look = lookOf(fileStates[a.id]);
            return (
              <li key={a.id} className="group/lost">
                <div
                  className={`group/file flex items-center gap-1.5 rounded-md px-3 py-1 hover:bg-paper-2/60 ${
                    replaced ? 'opacity-60' : ''
                  }`}
                >
                  {iconFor(a, look)}
                  <button
                    type="button"
                    onClick={() => void openAttachment(a)}
                    title={a.target}
                    className={`min-w-0 flex-1 truncate text-left text-[12px] transition-colors hover:text-accent ${
                      look.kind === 'lost' ? 'text-muted' : 'text-ink-2'
                    }`}
                  >
                    {fileLabel(a)}
                  </button>
                  {/* 第 66 条: Spool followed it to a new place — say so once. Hover shows from where
                      to where (both whole); a click means 「看过了」 and the mark goes. */}
                  {look.kind === 'followed' && (
                    <button
                      type="button"
                      onClick={() => void setFileNotice(a.id, null)}
                      title={t('从 {from}\n挪到了 {to}\nSpool 已经跟过去了，点一下这个标记就不再显示。', {
                        from: look.from,
                        to: look.to,
                      })}
                      className="flex-none whitespace-nowrap rounded-full bg-accent/10 px-1.5 text-[10.5px] leading-[16px] text-accent transition-colors hover:bg-accent/20"
                    >
                      {t('已跟到新位置')}
                    </button>
                  )}
                  {/* P9Y-c: the file changed after its text was read, so Spool read it again — what the
                      pack and every AI get is the current version. P12-2: said until the file is opened,
                      across restarts (the library keeps it as the file's notice). */}
                  {(reExtracted.has(a.id) || fileStates[a.id]?.notice === CHANGED_NOTICE) && (
                    <span
                      title={t('这个文件挂上之后改过，Spool 已经重新读了它的文字。点开这个文件看过之后，这个标记就不再显示。')}
                      className="flex-none whitespace-nowrap text-[10.5px]"
                      style={ATTENTION}
                    >
                      {t('改过')}
                    </span>
                  )}
                  {older.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggle(a.id)}
                      title={t('以前的版本（{n} 个）', { n: older.length })}
                      aria-label={t('以前的版本（{n} 个）', { n: older.length })}
                      aria-expanded={open}
                      className="flex flex-none items-center rounded p-0.5 text-muted transition-colors hover:text-ink"
                    >
                      {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    </button>
                  )}
                  {/* ⚠️ `flex`, not a bare span (Ocean 2026-10-05:「数字符号没有和文字对齐」): a plain
                      span has no font size of its own, so it inherits the page's 16px, builds a line
                      box for it and sits the ring on that baseline — 2.5px below the 11px time beside
                      it, and the row 6px taller than a project file's. Measured in WKWebView
                      (scripts/wk-snapshot.m): ring and time centres now land on the same pixel. */}
                  {onBlock && seq != null && (
                    <span
                      title={t('挂在第 {n} 块上', { n: seq })}
                      className="flex flex-none items-center text-muted"
                    >
                      <SeqBadge seq={seq} />
                    </span>
                  )}
                  {/* At rest: when it was added. On hover the two switches take this place, so the
                      row never grows a second line and the list does not jump under the pointer.
                      ⚠️ Fixed width, right-aligned, and the buttons after it sit in a fixed-width
                      slot too — so every row's time ends at the same x whether or not the file is on
                      a block (「当前的时间会受到 block 标号的影响导致不整齐」), and the block numbers
                      line up in a column of their own. 66px holds the longest form, 「10/14 08:01」. */}
                  <span
                    title={
                      replaced && a.supersededAt != null
                        ? t('被取代于 {time}', { time: formatBlockTime(a.supersededAt) })
                        : undefined
                    }
                    className={`w-[66px] flex-none whitespace-nowrap text-right text-[11px] tabular-nums text-muted ${
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
                          like one you never gave is the failure mode. Not in a private project (above). */}
                      {!isPrivate && (
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
                      )}
                    </span>
                  )}
                  <span className="flex w-[34px] flex-none items-center justify-end gap-1">
                    {onBlock && (
                      <button
                        type="button"
                        onClick={() => void anchorAttachment(a.id, threadId, null)}
                        title={t('移到项目（不再挂在这一块上，文件还在这个项目里）')}
                        aria-label={t('移到项目（不再挂在这一块上，文件还在这个项目里）')}
                        className="rounded p-0.5 text-muted opacity-0 transition-opacity hover:text-ink group-focus-within/file:opacity-100 group-hover/file:opacity-100"
                      >
                        <Unlink size={11} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void detach(a.id, threadId)}
                      title={t('从这个项目里去掉（文件本身不动）')}
                      aria-label={t('从这个项目里去掉（文件本身不动）')}
                      className="rounded p-0.5 text-muted opacity-0 transition-opacity hover:text-ink group-focus-within/file:opacity-100 group-hover/file:opacity-100"
                    >
                      <X size={11} />
                    </button>
                  </span>
                </div>
                {look.kind === 'lost' && <LostDetail a={a} threadId={threadId} look={look} />}
                {/* P6-4: the older versions, greyed, each with its own added time — hover says when
                    it was replaced. Still openable. Only 「AI 可读」 on hover: a replaced file is not
                    in any pack, so 「打包可读」 would be a switch that does nothing; whether an AI
                    may still read it is real (get_blocks lists it), so that one stays. No block
                    number: the block shows only the version in use. */}
                {open && (
                  <ul>
                    {older.map((o) => {
                      // Its only switch is 「AI 可读」 — none in a private project.
                      const hasText = o.kind === 'file' && o.extractedText != null && !isPrivate;
                      return (
                        <li
                          key={o.id}
                          className="group/file flex items-center gap-1.5 rounded-md py-1 pl-7 pr-3 opacity-60 hover:bg-paper-2/60"
                        >
                          {iconFor(o)}
                          <button
                            type="button"
                            onClick={() => void openAttachment(o)}
                            title={o.target}
                            className="min-w-0 flex-1 truncate text-left text-[12px] text-ink-2 transition-colors hover:text-accent"
                          >
                            {fileLabel(o)}
                          </button>
                          <span
                            title={
                              o.supersededAt != null
                                ? t('被取代于 {time}', { time: formatBlockTime(o.supersededAt) })
                                : undefined
                            }
                            className={`w-[66px] flex-none whitespace-nowrap text-right text-[11px] tabular-nums text-muted ${
                              hasText ? 'group-focus-within/file:hidden group-hover/file:hidden' : ''
                            }`}
                          >
                            {formatBlockTime(o.createdAt)}
                          </span>
                          {hasText && (
                            <label
                              className={`hidden flex-none cursor-pointer items-center gap-1 text-[11px] text-muted group-focus-within/file:flex group-hover/file:flex ${
                                o.aiAccess ? 'text-accent' : ''
                              }`}
                              title={t('关掉之后，AI 想再读它就得重新问你一次。')}
                            >
                              <input
                                type="checkbox"
                                checked={o.aiAccess}
                                onChange={(e) => void setAiAccess(o.id, threadId, e.target.checked)}
                                className="h-2.5 w-2.5 accent-[var(--accent)]"
                              />
                              {t('AI 可读')}
                            </label>
                          )}
                          <span className="flex w-[34px] flex-none items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => void detach(o.id, threadId)}
                              title={t('从这个项目里去掉（文件本身不动）')}
                              aria-label={t('从这个项目里去掉（文件本身不动）')}
                              className="rounded p-0.5 text-muted opacity-0 transition-opacity hover:text-ink group-focus-within/file:opacity-100 group-hover/file:opacity-100"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </RailSection>
  );
}
