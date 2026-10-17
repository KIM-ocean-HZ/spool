import { Check, FileText, Globe, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import SeqBadge from '@/components/ThreadView/SeqBadge';
import { plainText } from '@/lib/blocks/contentRuns';
import { IMAGE_LINE_RE, imageLinesAsText } from '@/lib/blocks/imageLines';
import type { SupersedeChoice, SupersedeReviewItem } from '@/lib/blocks/supersedeReview';
import type { Block } from '@/lib/db/blocks';
import { useT } from '@/lib/i18n';
import type { FileAccessRequest } from '@/lib/db/fileAccess';
import {
  draftFromProposal,
  groupBlockCounts,
  separatedPairs,
  type SplitDraft,
  type SplitReviewItem,
} from '@/lib/split/projectSplit';
import type { FileProposal } from '@/lib/db/fileProposals';
import { passageSource, type ProposalBatch } from '@/lib/db/proposals';
import type { FollowUpProposal } from '@/lib/db/followUpItems';
import { useProposalsStore } from '@/stores/proposalsStore';
import { useThreadsStore } from '@/stores/threadsStore';

// DESIGN_MCP_WRITE_ROLE §4.3 — the review screen.
//
// One screen, and the two big buttons are the default: approve the batch or throw it out.
// Per-item checkboxes exist and are deliberately secondary. The reasoning is §4.3's: what
// the user is judging is "was this passage split up correctly", and a split that is wrong
// is usually wrong as a whole — picking three of eight costs more than telling the AI to
// try again. Building the per-item path as the primary one would also rebuild the exact
// thing §3.3 rejected: a per-block approval habit, which stops being a decision around the
// fiftieth click.
//
// No modal popped this open. §4.2 has the AI queueing a batch while the user may be
// asleep, and `capture-note-first`'s rule is that the main window never jumps to the
// front — so the way in is a quiet badge in the sidebar, and this appears only when the
// user asks for it.

const dayCount = (fromMs: number, toMs: number): number =>
  Math.max(0, Math.ceil((toMs - fromMs) / 86_400_000));

export default function ReviewPanel() {
  const t = useT();
  const open = useProposalsStore((s) => s.panelOpen);
  const batches = useProposalsStore((s) => s.batches);
  const fileRequests = useProposalsStore((s) => s.fileRequests);
  const followUpProposals = useProposalsStore((s) => s.followUpProposals);
  const fileProposals = useProposalsStore((s) => s.fileProposals);
  const supersedeProposals = useProposalsStore((s) => s.supersedeProposals);
  const splitProposals = useProposalsStore((s) => s.splitProposals);
  const expiredBatches = useProposalsStore((s) => s.expiredBatches);
  const busy = useProposalsStore((s) => s.busy);
  const close = useProposalsStore((s) => s.close);
  const approve = useProposalsStore((s) => s.approve);
  const reject = useProposalsStore((s) => s.reject);
  const approveFiles = useProposalsStore((s) => s.approveFiles);
  const rejectFiles = useProposalsStore((s) => s.rejectFiles);
  const approveFollowUp = useProposalsStore((s) => s.approveFollowUp);
  const dismissFollowUp = useProposalsStore((s) => s.dismissFollowUp);
  const approveFileProposal = useProposalsStore((s) => s.approveFileProposal);
  const rejectFileProposal = useProposalsStore((s) => s.rejectFileProposal);
  const decideSupersede = useProposalsStore((s) => s.decideSupersede);
  const approveSplit = useProposalsStore((s) => s.approveSplit);
  const rejectSplit = useProposalsStore((s) => s.rejectSplit);
  const clearExpired = useProposalsStore((s) => s.clearExpired);
  // Subscribe to the stored map, then flatten here. NOT useThreadsStore(selectAllThreadsFlat):
  // that selector builds a fresh array on every call, so zustand's useSyncExternalStore sees
  // a new snapshot each render and re-renders forever — React #185, which took the whole
  // window down on 2026-08-05 because this component is mounted at the app root and its hooks
  // run even while the screen is closed.
  const threadsByWs = useThreadsStore((s) => s.threadsByWorkspace);
  const threads = useMemo(() => Object.values(threadsByWs).flat(), [threadsByWs]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, close]);

  if (!open) return null;

  // Titles, never ids — the naming rule the MCP surfaces follow holds inside the app too.
  const titleOf = (threadId: string): string =>
    threads.find((th) => th.id === threadId)?.title || t('（无标题）');

  const now = Date.now();

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-ink/30 px-8 pt-[10vh]"
      onClick={close}
    >
      <div
        className="flex max-h-[78vh] w-[560px] flex-col overflow-hidden rounded-lg border border-line-strong bg-paper"
        style={{ boxShadow: 'var(--shadow-toast)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-none items-center justify-between border-b border-line px-5 py-3">
          <div className="min-w-0">
            <h2 className="font-serif text-xl text-ink">{t('AI 提的，等你过目')}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {t('这些还没进你的库。你点头才存，点「都不要」就当没发生过。')}
            </p>
          </div>
          <button
            onClick={close}
            className="flex-none rounded p-1 text-muted hover:bg-paper-2 hover:text-ink"
            aria-label={t('关闭')}
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {batches === null ? (
            <p className="py-8 text-center text-xs text-muted">{t('加载中…')}</p>
          ) : batches.length +
              (fileRequests?.length ?? 0) +
              (followUpProposals?.length ?? 0) +
              (fileProposals?.length ?? 0) +
              (supersedeProposals?.length ?? 0) +
              (splitProposals?.length ?? 0) ===
            0 ? (
            <p className="py-8 text-center text-xs text-muted">{t('没有待你过目的。')}</p>
          ) : (
            <>
              {/* DESIGN_PROJECT_FILES §3.4 — first, because it is the only kind that grants a
                  standing permission rather than storing one thing once. */}
              {(fileRequests ?? []).map((r) => (
                <FileRequestCard
                  key={r.requestId}
                  request={r}
                  title={titleOf(r.threadId)}
                  daysLeft={dayCount(now, r.expiresAt)}
                  busy={busy}
                  onApprove={() => void approveFiles(r.requestId)}
                  onReject={() => void rejectFiles(r.requestId)}
                />
              ))}
              {/* P6-3 — next to the read requests: both are about a file, and approving one
                  also lets an AI read it. */}
              {(fileProposals ?? []).map((p) => (
                <FileProposalCard
                  key={p.id}
                  proposal={p}
                  title={titleOf(p.threadId)}
                  daysLeft={dayCount(now, p.expiresAt)}
                  busy={busy}
                  onApprove={() => void approveFileProposal(p.id)}
                  onReject={() => void rejectFileProposal(p.id)}
                />
              ))}
              {/* P7-5 — an AI's 「更正 / 取代」 suggestion about two blocks already in the library. */}
              {(supersedeProposals ?? []).map((item) => (
                <SupersedeCard
                  key={item.proposal.id}
                  item={item}
                  titleOf={titleOf}
                  daysLeft={dayCount(now, item.proposal.expiresAt)}
                  busy={busy}
                  onDecide={(choice) => void decideSupersede(item.proposal.id, choice)}
                />
              ))}
              {/* P9G-3 — an AI's 「把这个项目拆成几个子项目」, regrouped here before anything moves. */}
              {(splitProposals ?? []).map((item) => (
                <SplitCard
                  key={item.proposal.id}
                  item={item}
                  daysLeft={dayCount(now, item.proposal.expiresAt)}
                  busy={busy}
                  onSplit={(draft) => void approveSplit(item.proposal.id, draft)}
                  onReject={() => void rejectSplit(item.proposal.id)}
                />
              ))}
              {(followUpProposals ?? []).map((p) => (
                <FollowUpLineCard
                  key={p.id}
                  proposal={p}
                  busy={busy}
                  onApprove={() => void approveFollowUp(p.id)}
                  onDismiss={() => void dismissFollowUp(p.id)}
                />
              ))}
              {batches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  titleOf={titleOf}
                  daysLeft={dayCount(now, batch.expiresAt)}
                  busy={busy}
                  onApprove={() => void approve(batch.id)}
                  onReject={() => void reject(batch.id)}
                  onApproveSome={(ids) => void approve(batch.id, ids)}
                />
              ))}
            </>
          )}

          {/* §4.2-3: an expired batch is void, not pending. It gets one line — enough to
              explain why the badge went down without the user doing anything, and no
              affordance that suggests it could still be approved. */}
          {expiredBatches > 0 && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-line bg-paper-2/40 px-3 py-2">
              <span className="text-xs text-muted">
                {t('{n} 批已过期（超过 7 天没处理），已经作废。', { n: expiredBatches })}
              </span>
              <button
                type="button"
                onClick={() => void clearExpired()}
                className="flex-none rounded border border-line bg-paper px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {t('清掉')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * DESIGN_PROJECT_FILES §3.4 — «Codex 想读 2 个文件，理由：核对 CMU 的课程表».
 *
 * Three things are on this card because the user cannot judge the request without them:
 * WHICH files (by name, never a path they have to decode), WHY, and — the part no design
 * doc asked for and a person absolutely needs — that the yes is STANDING. A grant that
 * silently outlives the conversation it was asked in is a permission the user did not
 * knowingly give, so the card says so and says where to take it back.
 *
 * No per-file checkboxes. The request is one question ("may you read these three to answer
 * that"), and splitting it would produce approvals nobody meant — the same reasoning §4.3
 * gives for keeping the batch, not the item, as the unit of a decision.
 */
function FileRequestCard({
  request,
  title,
  daysLeft,
  busy,
  onApprove,
  onReject,
}: {
  request: FileAccessRequest;
  title: string;
  daysLeft: number;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const t = useT();
  return (
    <div className="mb-3 rounded-md border border-line-strong bg-paper-2/30 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-xs text-ink-2">
          {t('{client} 想读〈{title}〉里的 {n} 个文件', {
            client: request.client || 'AI',
            title,
            n: request.files.length,
          })}
        </span>
        <span className="flex-none font-mono text-[10px] text-muted">
          {t('{n} 天后作废', { n: daysLeft })}
        </span>
      </div>

      <ul className="mt-2 space-y-1">
        {request.files.map((f) => (
          <li key={f.attachmentId} className="flex items-center gap-1.5">
            <FileText size={11} className="flex-none text-muted" />
            <span className="min-w-0 flex-1 truncate text-xs text-ink" title={f.target}>
              {f.label.trim() || f.target}
            </span>
            {/* How much text it would actually be handing over. The one number that makes
                "是不是太多了" answerable. */}
            {f.extractedChars !== null && (
              <span className="flex-none font-mono text-[10px] text-muted">
                {t('{n} 字', { n: f.extractedChars })}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-2 rounded border border-line bg-paper px-2.5 py-2">
        <div className="text-[10px] uppercase tracking-wide text-muted">{t('它说要干什么')}</div>
        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-2">
          {request.why}
        </p>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        {t('答应了就是长期的：以后它随时能读这几个文件。要收回，去这个项目右边的「项目文件」里点掉那一行。')}
      </p>

      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-accent/60 px-3 py-1.5 text-xs font-medium text-accent transition-colors enabled:hover:border-accent enabled:hover:bg-accent/15 disabled:opacity-40"
        >
          <Check size={12} />
          {t('可以读')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          title={t('直接扔掉，不留痕迹')}
          className="flex flex-none items-center gap-1.5 rounded-md border border-line bg-paper px-3 py-1.5 text-xs text-muted transition-colors enabled:hover:border-line-strong enabled:hover:text-ink disabled:opacity-40"
        >
          <Trash2 size={12} />
          {t('不给')}
        </button>
      </div>
    </div>
  );
}

/** The first line of a block, without its markdown — what the card shows next to its number. */
/** A block's first line of TEXT. P9H-4（DISCOVERED-20261016-6）：a picture line used to be taken and
 *  stripped to nothing, so a block of only pictures had an empty row after its number — now it is
 *  「[图片]」 (with its caption), the way the undo card says it. `image` is that word in the UI language. */
const firstLine = (b: Block, image: string): string => {
  const lines = b.content.split('\n').filter((l) => l.trim() !== '');
  const text = lines.find((l) => !IMAGE_LINE_RE.test(l));
  if (text !== undefined) return plainText(text).trim();
  return lines[0] ? imageLinesAsText(lines[0], image).trim() : '';
};

/**
 * P7-5 (Ocean 2026-10-07, HANDOFF §9.2 第 40 条) — 「AI 给出操作建议后，用户在待审中检查，选择
 * 最后的更正，取代还是不动」.
 *
 * The card names both blocks by number and first line, the sentence in the old one that no
 * longer holds, and which of the two the AI suggested (the title says it, and that button is
 * marked) — but all three buttons are the user's, whatever the AI said.
 * 「更正」 is greyed out when the newer block already points at another block: a block corrects
 * one block, and the sentence under the buttons says so in the user's terms.
 */
function SupersedeCard({
  item,
  titleOf,
  daysLeft,
  busy,
  onDecide,
}: {
  item: SupersedeReviewItem;
  titleOf: (threadId: string) => string;
  daysLeft: number;
  busy: boolean;
  onDecide: (choice: SupersedeChoice) => void;
}) {
  const t = useT();
  const { proposal, older, newer, occupied } = item;
  const client = proposal.client || 'AI';
  const replaces = proposal.suggestedKind === 'supersedes';
  const n = newer.seq ?? '?';
  const m = older.seq ?? '?';
  const title = titleOf(older.threadId);
  const occupiedNote = !occupied
    ? null
    : occupied.kind === 'corrects' && occupied.seq !== null
      ? t('第 {n} 块已经在更正第 {k} 块了，一块只能更正一块；要更正这一块，让 AI 另写一块。', { n, k: occupied.seq })
      : occupied.seq !== null
        ? t('第 {n} 块已经指着第 {k} 块了，一块只能指一块；要更正这一块，让 AI 另写一块。', { n, k: occupied.seq })
        : t('第 {n} 块已经指着另一块了，一块只能指一块；要更正这一块，让 AI 另写一块。', { n });
  const choice = (key: SupersedeChoice, label: string, suggested: boolean, disabled = false) => (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={() => onDecide(key)}
      className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs transition-colors disabled:opacity-40 ${
        suggested
          ? 'border-accent/60 font-medium text-accent enabled:hover:border-accent enabled:hover:bg-accent/15'
          : 'border-line bg-paper text-ink-2 enabled:hover:border-line-strong enabled:hover:text-ink'
      }`}
    >
      {label}
      {suggested && <span className="text-[10px] font-normal opacity-80">{t('（AI 建议）')}</span>}
    </button>
  );
  const blockRow = (label: string, b: Block) => (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <span className="flex-none text-[10px] text-muted">{label}</span>
      {b.seq != null && <SeqBadge seq={b.seq} />}
      <span className="min-w-0 flex-1 truncate text-xs text-ink">{firstLine(b, t('图片'))}</span>
      {b.threadId !== older.threadId && (
        <span className="max-w-[40%] flex-none truncate text-[10px] text-muted">
          {t('在〈{title}〉', { title: titleOf(b.threadId) })}
        </span>
      )}
    </div>
  );
  return (
    <div className="mb-3 rounded-md border border-line-strong bg-paper-2/30 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 break-words text-xs text-ink-2">
          {replaces
            ? t('{client} 建议：用第 {n} 块整条取代〈{title}〉里的第 {m} 块', { client, n, m, title })
            : t('{client} 建议：用第 {n} 块更正〈{title}〉里第 {m} 块的一处', { client, n, m, title })}
        </span>
        <span className="flex-none font-mono text-[10px] text-muted">
          {t('{n} 天后作废', { n: daysLeft })}
        </span>
      </div>

      <div className="mt-2 space-y-1">
        {blockRow(t('旧的'), older)}
        {proposal.quoteStale.trim() && (
          <p className="pl-6 text-[11px] leading-relaxed text-ink-2">
            {t('不再成立的那一句：「{q}」', { q: proposal.quoteStale })}
          </p>
        )}
        {blockRow(t('新的'), newer)}
      </div>

      {proposal.why.trim() && (
        <div className="mt-2 rounded border border-line bg-paper px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted">{t('它说为什么')}</div>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-2">
            {proposal.why}
          </p>
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        {/* The same names the 过期检测 card gives these two actions — one name per thing on screen. */}
        {choice('correct', t('更正一处'), !replaces, occupied !== null)}
        {choice('replace', t('整条取代'), replaces)}
        {choice('keep', t('不动'), false)}
      </div>
      {occupiedNote && <p className="mt-1.5 text-[10px] leading-relaxed text-muted">{occupiedNote}</p>}
      <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
        {t('更正一处：两块都留着，新的那块记下它更正了哪一句。整条取代：旧的那块不再进打包，还在库里，能取回。不动：这条建议划掉。')}
      </p>
    </div>
  );
}

const humanSize = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const fileNameOf = (path: string): string => path.split(/[\\/]/).filter(Boolean).pop() ?? path;

/**
 * P6-3 (Ocean 2026-09-30 §9.2 第 7、10 条) — an AI proposing a file from the user's computer:
 * attach it to a project / a block, or put it in place of an older version.
 *
 * What is on the card is what the user needs to judge it (P6 原文): the FULL path — the one
 * thing that tells them where on their computer this is — the size, who proposed it, and why.
 * And one sentence on what 「同意」 does (Ocean 2026-10-06 #2): it attaches AND lets an AI read
 * the text, so the card says both, and where to take the second one back.
 *
 * Where it would hang is part of that sentence rather than a label of its own (10-05: no
 * 「挂在 #n / 挂在项目」 tags on screen).
 */
function FileProposalCard({
  proposal,
  title,
  daysLeft,
  busy,
  onApprove,
  onReject,
}: {
  proposal: FileProposal;
  title: string;
  daysLeft: number;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const t = useT();
  const client = proposal.client || 'AI';
  const replacing = proposal.kind === 'supersede';
  const blockGone = proposal.anchorBlockId !== null && proposal.anchorSeq === null;
  // P9H-3: the block went to another project since (a split, 「移到…」) — the file goes with it.
  const blockMoved = !blockGone && proposal.anchorThreadId !== null && proposal.anchorThreadId !== proposal.threadId;
  const consent = replacing
    ? t('同意之后新版挂在旧版原来的位置，AI 也能读到里面的文字（右栏随时能关）。旧版不删，收在新版下面。')
    : blockGone
      ? t('原来要挂的那一块已经删了。同意之后挂在这个项目上，AI 也能读到里面的文字（右栏随时能关）。')
      : blockMoved
        ? t('那一块已经挪到〈{title}〉了。同意之后挂到〈{title}〉第 {n} 块上，AI 也能读到里面的文字（右栏随时能关）。', {
            title: proposal.anchorThreadTitle || t('（无标题）'),
            n: proposal.anchorSeq ?? '',
          })
        : proposal.anchorSeq !== null
        ? t('同意之后挂到第 {n} 块上，AI 也能读到里面的文字（右栏随时能关）。', { n: proposal.anchorSeq })
        : t('同意之后挂进这个项目，AI 也能读到里面的文字（右栏随时能关）。');
  return (
    <div className="mb-3 rounded-md border border-line-strong bg-paper-2/30 p-3">
      <div className="flex items-baseline justify-between gap-3">
        {/* Wraps instead of truncating (unlike the read-request card): the old file's name is
            part of what the user is deciding on, and an ellipsis would cut exactly that. */}
        <span className="min-w-0 break-words text-xs text-ink-2">
          {replacing
            ? t('{client} 提议用新版本取代〈{title}〉里的「{old}」', {
                client,
                title,
                old: proposal.supersedesLabel ?? '',
              })
            : t('{client} 提议把一个文件挂进〈{title}〉', { client, title })}
        </span>
        <span className="flex-none font-mono text-[10px] text-muted">
          {t('{n} 天后作废', { n: daysLeft })}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <FileText size={11} className="flex-none text-muted" />
        <span className="min-w-0 flex-1 truncate text-xs text-ink">{fileNameOf(proposal.path)}</span>
        <span className="flex-none font-mono text-[10px] text-muted">{humanSize(proposal.sizeBytes)}</span>
      </div>
      <p className="mt-1 select-text break-all font-mono text-[10px] leading-relaxed text-muted">
        {proposal.path}
      </p>

      <div className="mt-2 rounded border border-line bg-paper px-2.5 py-2">
        <div className="text-[10px] uppercase tracking-wide text-muted">{t('它说为什么')}</div>
        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-2">
          {proposal.why}
        </p>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-muted">{consent}</p>

      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-accent/60 px-3 py-1.5 text-xs font-medium text-accent transition-colors enabled:hover:border-accent enabled:hover:bg-accent/15 disabled:opacity-40"
        >
          <Check size={12} />
          {t('同意')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          title={t('直接扔掉，不留痕迹')}
          className="flex flex-none items-center gap-1.5 rounded-md border border-line bg-paper px-3 py-1.5 text-xs text-muted transition-colors enabled:hover:border-line-strong enabled:hover:text-ink disabled:opacity-40"
        >
          <Trash2 size={12} />
          {t('不同意')}
        </button>
      </div>
    </div>
  );
}

/**
 * P9G-3 (Ocean 2026-10-16 第 127 – 131 条) — an AI proposing to split one long project into a
 * few sub-projects. Nothing has moved yet: what this card shows is what 「拆分」 will do, and
 * every part of it is the user's to change first (第 129 条) —
 *   - each group's name (the AI's one-line summary is shown under it, and becomes the
 *     sub-project's summary);
 *   - where each block goes: a group, or staying in the original project;
 *   - where each project file that hangs off no block, and each follow-up line, goes — staying,
 *     unless the AI placed it (第 130 条).
 * A correction and the block it corrects pulled apart get one plain sentence each: the mark on
 * the corrected sentence is drawn only when both are in one project. A group left with no blocks
 * is not created, and says so.
 */
function SplitCard({
  item,
  daysLeft,
  busy,
  onSplit,
  onReject,
}: {
  item: SplitReviewItem;
  daysLeft: number;
  busy: boolean;
  onSplit: (draft: SplitDraft) => void;
  onReject: () => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<SplitDraft>(() => draftFromProposal(item));
  const counts = groupBlockCounts(item.blocks, draft);
  const pairs = separatedPairs(item.blocks, draft);
  const made = counts.filter((c) => c > 0).length;
  const title = item.thread.title || t('（无标题）');
  // P9G follow-up (Ocean 2026-10-16): a finished project is reopened before it is split.
  const finished = item.thread.status === 'done';
  const groupName = (i: number): string =>
    draft.groups[i]?.title.trim() || item.proposal.plan.groups[i]?.title || t('（无标题）');
  const place = (map: Record<string, number | null>, id: string): number | null => map[id] ?? null;
  // A file or a line sent to a group that will not be created stays — say so by showing it there.
  const landed = (g: number | null): number | null => (g !== null && (counts[g] ?? 0) > 0 ? g : null);

  const set = (key: 'blocks' | 'files' | 'followUps', id: string, g: number | null) =>
    setDraft((d) => ({ ...d, [key]: { ...d[key], [id]: g } }));
  const rename = (i: number, name: string) =>
    setDraft((d) => ({ ...d, groups: d.groups.map((g, k) => (k === i ? { ...g, title: name } : g)) }));

  const where = (value: number | null, onChange: (g: number | null) => void, onlyMade: boolean) => (
    <select
      value={value === null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      aria-label={t('去哪')}
      className="max-w-[45%] flex-none truncate rounded border border-line bg-paper px-1 py-0.5 text-[11px] text-ink-2"
    >
      {draft.groups.map((_, i) =>
        onlyMade && !((counts[i] ?? 0) > 0) ? null : (
          <option key={i} value={i}>
            {groupName(i)}
          </option>
        ),
      )}
      <option value="">{t('留在原项目')}</option>
    </select>
  );
  const blockRow = (b: Block) => (
    <li key={b.id} className="flex min-w-0 items-center gap-1.5">
      {b.seq != null && <SeqBadge seq={b.seq} />}
      <span className="min-w-0 flex-1 truncate text-xs text-ink">{firstLine(b, t('图片'))}</span>
      {where(place(draft.blocks, b.id), (g) => set('blocks', b.id, g), false)}
    </li>
  );
  const blocksIn = (g: number | null) => item.blocks.filter((b) => place(draft.blocks, b.id) === g);
  const staying = blocksIn(null);

  return (
    <div className="mb-3 rounded-md border border-line-strong bg-paper-2/30 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 break-words text-xs text-ink-2">
          {t('{client} 提议把〈{title}〉拆成 {n} 个子项目', {
            client: item.proposal.client || 'AI',
            title,
            n: draft.groups.length,
          })}
        </span>
        <span className="flex-none font-mono text-[10px] text-muted">{t('{n} 天后作废', { n: daysLeft })}</span>
      </div>

      <div className="mt-2 rounded border border-line bg-paper px-2.5 py-2">
        <div className="text-[10px] uppercase tracking-wide text-muted">{t('它说为什么')}</div>
        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-2">{item.proposal.why}</p>
      </div>

      {draft.groups.map((g, i) => (
        <div key={i} className="mt-2 rounded border border-line bg-paper px-2.5 py-2">
          <div className="flex items-center gap-2">
            <span className="flex-none text-[10px] uppercase tracking-wide text-muted">
              {t('子项目 {n}', { n: i + 1 })}
            </span>
            <input
              value={g.title}
              onChange={(e) => rename(i, e.target.value)}
              aria-label={t('子项目名')}
              className="min-w-0 flex-1 rounded border border-line bg-paper px-1.5 py-0.5 text-xs text-ink focus:border-accent focus:outline-none"
            />
            <span className="flex-none font-mono text-[10px] text-muted">{t('{n} 块', { n: counts[i] ?? 0 })}</span>
          </div>
          {g.summary && (
            <p className="mt-1 break-words text-[11px] leading-snug text-muted">{t('AI 写的一句：{s}', { s: g.summary })}</p>
          )}
          {(counts[i] ?? 0) > 0 ? (
            <ul className="mt-1.5 space-y-1">{blocksIn(i).map(blockRow)}</ul>
          ) : (
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
              {t('这一组没有块，拆的时候不会建这个子项目。')}
            </p>
          )}
        </div>
      ))}

      <div className="mt-2 rounded border border-line bg-paper px-2.5 py-2">
        {/* Not uppercase like the other headers: it carries the project's own name. */}
        <div className="text-[10px] text-muted">{t('留在〈{title}〉的块（{n}）', { title, n: staying.length })}</div>
        {staying.length > 0 && <ul className="mt-1.5 space-y-1">{staying.map(blockRow)}</ul>}
      </div>

      {item.files.length > 0 && (
        <div className="mt-2 rounded border border-line bg-paper px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted">{t('项目文件（没挂在某一块上的）')}</div>
          <ul className="mt-1.5 space-y-1">
            {item.files.map((f) => (
              <li key={f.id} className="flex min-w-0 items-center gap-1.5">
                <FileText size={11} className="flex-none text-muted" />
                <span className="min-w-0 flex-1 truncate text-xs text-ink" title={f.target}>
                  {f.label.trim() || fileNameOf(f.target)}
                </span>
                {where(landed(place(draft.files, f.id)), (g) => set('files', f.id, g), true)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.followUps.length > 0 && (
        <div className="mt-2 rounded border border-line bg-paper px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted">{t('跟进的事')}</div>
          <ul className="mt-1.5 space-y-1">
            {item.followUps.map((l) => (
              <li key={l.id} className="flex min-w-0 items-center gap-1.5">
                <Globe size={11} className="flex-none text-muted" />
                <span className="min-w-0 flex-1 truncate text-xs text-ink">{l.text}</span>
                {where(landed(place(draft.followUps, l.id)), (g) => set('followUps', l.id, g), true)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pairs.length > 0 && (
        <div className="mt-2 space-y-1 border-l-2 border-[var(--notice-warm-edge)] pl-2">
          {pairs.map((p) => (
            <p key={`${p.block.id}>${p.pointsAt.id}`} className="text-[11px] leading-snug text-ink-2">
              {p.kind === 'corrects'
                ? t('#{a} 和 #{b} 分开之后，#{b} 那句话上的底色记号会没（两块都还在）。', {
                    a: p.block.seq ?? '?',
                    b: p.pointsAt.seq ?? '?',
                  })
                : t('#{a} 和 #{b} 分开之后在两个项目里，「已被整条取代」那一行照样点得过去。', {
                    a: p.block.seq ?? '?',
                    b: p.pointsAt.seq ?? '?',
                  })}
            </p>
          ))}
        </div>
      )}

      {finished && (
        <p className="mt-2 border-l-2 border-[var(--notice-warm-edge)] pl-2 text-[11px] leading-snug text-ink-2">
          {t('〈{title}〉已经完成了。要拆，先打开它、点项目头上的「重新打开」，再回来点「拆分」。', { title })}
        </p>
      )}

      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        {t('拆分之后：每一组在同一个工作区里建成一个子项目，块连同编号、挂在块上的文件和图片一起挪过去；〈{title}〉名字不变，里面留一块总览，链接到每个子项目。按 ⌘Z 能一次撤回。', { title })}
      </p>

      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          disabled={busy || made === 0 || finished}
          onClick={() => onSplit(draft)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-accent/60 px-3 py-1.5 text-xs font-medium text-accent transition-colors enabled:hover:border-accent enabled:hover:bg-accent/15 disabled:opacity-40"
        >
          <Check size={12} />
          {t('拆分（{n} 个子项目）', { n: made })}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          title={t('直接扔掉，不留痕迹')}
          className="flex flex-none items-center gap-1.5 rounded-md border border-line bg-paper px-3 py-1.5 text-xs text-muted transition-colors enabled:hover:border-line-strong enabled:hover:text-ink disabled:opacity-40"
        >
          <Trash2 size={12} />
          {t('不拆')}
        </button>
      </div>
    </div>
  );
}

/**
 * DESIGN_FOLLOW_UP §8.4 — one line an AI proposed for a project's follow-up list.
 *
 * ⚠️ This card IS the security control, not a nicety. A line here outlives the conversation
 * that produced it: the next conversation, with a different model, reads it as something the
 * user wants looked into and goes looking. A tool that filed one directly would let a page
 * an AI happened to read plant a standing search instruction in the user's library
 * (§2.5's injection risk with a privilege escalation on the end). Ocean 拍板 2026-08-16:
 * 要点一下.
 *
 * One line per card, rather than the whole-list rewrite this replaces: the user approves
 * what they read, and nothing they have not read can ride along with it.
 */
function FollowUpLineCard({
  proposal,
  busy,
  onApprove,
  onDismiss,
}: {
  proposal: FollowUpProposal;
  busy: boolean;
  onApprove: () => void;
  onDismiss: () => void;
}) {
  const t = useT();
  return (
    <div className="mb-3 rounded-md border border-line-strong bg-paper-2/30 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-ink-2">
          <Globe size={12} className="flex-none text-muted" />
          {t('{client} 想给〈{title}〉加一条要跟进的', {
            client: proposal.proposedBy || 'AI',
            title: proposal.threadTitle || t('（无标题）'),
          })}
        </span>
      </div>

      <div className="mt-2 rounded border border-line bg-paper px-2.5 py-2">
        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-ink">
          {proposal.text}
        </p>
        {/* §3.4 第 3 条 — the one thing the user actually judges: not "is this true" but
            "what has this got to do with me". */}
        {proposal.why && (
          <p className="mt-1.5 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-muted">
            {proposal.why}
          </p>
        )}
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        {proposal.standing
          ? t('加进去之后是「永久跟进」，不会因为查到一次答案就消失。想改去项目里的「这个项目跟进什么」。')
          : t('加进去之后，AI 查到答案就会把它收起来——收起来还看得见，也能再打开。')}
      </p>

      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-accent/60 px-3 py-1.5 text-xs font-medium text-accent transition-colors enabled:hover:border-accent enabled:hover:bg-accent/15 disabled:opacity-40"
        >
          <Check size={12} />
          {t('加进去')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDismiss}
          title={t('直接扔掉，不留痕迹')}
          className="flex flex-none items-center gap-1.5 rounded-md border border-line bg-paper px-3 py-1.5 text-xs text-muted transition-colors enabled:hover:border-line-strong enabled:hover:text-ink disabled:opacity-40"
        >
          <Trash2 size={12} />
          {t('不用')}
        </button>
      </div>
    </div>
  );
}
interface CardProps {
  batch: ProposalBatch;
  titleOf: (threadId: string) => string;
  daysLeft: number;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onApproveSome: (ids: string[]) => void;
}

function BatchCard({
  batch,
  titleOf,
  daysLeft,
  busy,
  onApprove,
  onReject,
  onApproveSome,
}: CardProps) {
  const t = useT();
  // Everything starts checked: the primary path is "all of it", and the checkboxes are
  // there to take something out, not to build the batch up one click at a time.
  const [picked, setPicked] = useSelection(batch);
  const partial = picked.size > 0 && picked.size < batch.items.length;
  // The button counts BLOCKS, not rows on this screen. §4.4 A stores the passage as a
  // block of its own, in a project that may not be any of the ones listed below — so a
  // button reading "store all 2" while three blocks land in three projects would be the
  // screen telling the user something untrue about the click they are about to make.
  const passageBlock = batch.sourceText && batch.sourceThreadId ? 1 : 0;

  return (
    <div className="mb-3 rounded-md border border-line-strong bg-paper-2/30 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-xs text-ink-2">
          {batch.note ?? t('{client} 提了 {n} 条', { client: batch.client, n: batch.items.length })}
        </span>
        <span className="flex-none font-mono text-[10px] text-muted">
          {t('{n} 天后作废', { n: daysLeft })}
        </span>
      </div>

      {/* §4.4 A. The passage is the longest thing that lands and the only one whose text
          the AI handed over verbatim, so it is shown whole and said plainly rather than
          folded away behind a "show original". §4.4-bis: the label it will carry is spelled
          out here — it is the answer to "whose words are these", which is the one question
          this block raises and the items below do not. */}
      {batch.sourceText && batch.sourceThreadId && (
        <div className="mt-2 rounded border border-line bg-paper px-2.5 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0 text-[10px] uppercase tracking-wide text-muted">
              {t('原文 — 会存进〈{title}〉，来源标着「{source}」', {
                title: titleOf(batch.sourceThreadId),
                source: passageSource(batch.client),
              })}
            </div>
            {/* DESIGN_CONTEXT_HYGIENE §9.5: the passage is the one thing here that can be
                document-sized, and a project's pack budget is finite — 「把整场对话分流进来」
                is precisely the case where this number goes from 300 to 6,000. It is shown
                rather than capped: refusing a long passage would also refuse the legitimate
                case (a long article the user handed over), and the person who should decide
                whether it is worth the room is the one reading it. */}
            <span className="flex-none font-mono text-[10px] text-muted">
              {t('{n} 字', { n: [...batch.sourceText].length })}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-2">
            {batch.sourceText}
          </p>
          <div className="mt-1 text-[10px] text-muted">
            {t('下面每条都会标注「出自这段」。这段本身也算一块。')}
          </div>
        </div>
      )}

      <ul className="mt-2 space-y-1.5">
        {batch.items.map((item) => {
          const on = picked.has(item.id);
          return (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-paper">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setPicked((prev) => {
                      const next = new Set(prev);
                      if (on) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })
                  }
                  className="mt-0.5 flex-none accent-current"
                />
                <span className={`min-w-0 flex-1 ${on ? '' : 'opacity-40'}`}>
                  <span className="block text-[10px] text-accent">
                    {t('进〈{title}〉', { title: titleOf(item.threadId) })}
                    {/* v14 (§9.3 拍板甲): a correction does more than land a block — it hangs
                        a line under an existing one. Approving it without being told that
                        would be approving a change to a block the user is not looking at. */}
                    {item.refKind === 'corrects' && (
                      <span className="ml-1.5 rounded border border-line px-1 text-muted">
                        {t('更正已有的一块')}
                      </span>
                    )}
                  </span>
                  {/* ⭐ S6（2026-08-24，Ocean 选乙）—— **引文和更正正文并排摆。**
                      他指的那一条（真库 seq 25 → seq 21）：引文划的是「NEU co-op、UCSD co-op
                      与 GT MS-HCI 暑期窗口都不是……；不要把任何学校称为真正保底。」四个主张，
                      而这条更正实际只更正 GT MS-HCI 那一段。他的原话：「但是 NEU co-op、
                      UCSD co-op 并不是被更正内容」——**他是对的**，而在这一屏上他**看不到引文**，
                      所以判不了。批准之后那四个主张会被一起划掉，其中三个没人更正过。

                      ⛔ **不做机器判「这句里有几个主张」** —— 判不了，而且判错的方向是把对的挡掉。
                      摆出来，让人一眼看出跨度对不对，判断权留在人手里。

                      ⚠️ 引文能摆出来，是因为它进得了库就一定对得上目标块
                      （`api_engine.rs::gate_proposals` 逐字闸）。⛔ 那道闸的输入一个字符都不许动。 */}
                  {item.refKind === 'corrects' && item.correctedQuote ? (
                    <span className="mt-1 grid grid-cols-2 gap-2 rounded border border-line/70 bg-paper/60 p-1.5">
                      <span className="block min-w-0">
                        <span className="block text-[10px] uppercase tracking-wide text-muted">
                          {t('会在旧块里划出这一段')}
                        </span>
                        <span className="mt-0.5 block whitespace-pre-wrap break-words border-l-2 border-[var(--notice-warm-edge)] pl-1.5 text-[11px] leading-snug text-ink-2">
                          {item.correctedQuote}
                        </span>
                      </span>
                      <span className="block min-w-0">
                        <span className="block text-[10px] uppercase tracking-wide text-muted">
                          {t('这条更正说的是')}
                        </span>
                        <span className="mt-0.5 block whitespace-pre-wrap break-words text-[11px] leading-snug text-ink">
                          {item.content}
                        </span>
                      </span>
                      <span className="col-span-2 text-[10px] leading-snug text-muted">
                        {t('两边对着看：左边划出的那一段，是不是正好就是右边更正的那一点？划宽了，没被更正的话也会跟着标上。')}
                      </span>
                    </span>
                  ) : (
                    <span className="mt-0.5 block whitespace-pre-wrap break-words text-xs leading-relaxed text-ink">
                      {item.content}
                    </span>
                  )}
                  {item.annotation && (
                    <span className="mt-0.5 block whitespace-pre-wrap break-words text-[11px] italic leading-snug text-muted">
                      {item.annotation}
                    </span>
                  )}
                  {/* ⭐ Q1（2026-08-25）—— **引用的理由也要摆出来。** §2.Q1 那十处没列这一条，
                      但它和上面那句批注是同一类东西：AI 写的一句话，批准之后落在块上、进 pack、
                      被下一个模型读。⛔ 不摆 = 用户点「通过」的时候批准了一句自己没看见的话。 */}
                  {item.refNote && (
                    <span className="mt-0.5 flex items-baseline gap-1 text-[11px] leading-snug text-muted">
                      <span aria-hidden="true" className="flex-none opacity-60">
                        ↩
                      </span>
                      <span className="min-w-0 whitespace-pre-wrap break-words">
                        {item.refNote}
                      </span>
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          disabled={busy || picked.size === 0}
          onClick={() => (partial ? onApproveSome([...picked]) : onApprove())}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-accent/60 px-3 py-1.5 text-xs font-medium text-accent transition-colors enabled:hover:border-accent enabled:hover:bg-accent/15 disabled:opacity-40"
        >
          <Check size={12} />
          {partial
            ? t('存这 {n} 块', { n: picked.size + passageBlock })
            : t('都存进去（{n} 块）', { n: batch.items.length + passageBlock })}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          title={t('直接扔掉，不留痕迹')}
          className="flex flex-none items-center gap-1.5 rounded-md border border-line bg-paper px-3 py-1.5 text-xs text-muted transition-colors enabled:hover:border-line-strong enabled:hover:text-ink disabled:opacity-40"
        >
          <Trash2 size={12} />
          {t('都不要')}
        </button>
      </div>
    </div>
  );
}

// Selection resets whenever the batch's items change identity — approving part of a batch
// deletes the whole batch, so a stale set can never be applied to different rows.
function useSelection(
  batch: ProposalBatch,
): [Set<string>, (fn: (prev: Set<string>) => Set<string>) => void] {
  const key = batch.items.map((i) => i.id).join(',');
  const [state, setState] = useState<{ key: string; picked: Set<string> }>(() => ({
    key,
    picked: new Set(batch.items.map((i) => i.id)),
  }));
  const picked =
    state.key === key ? state.picked : new Set(batch.items.map((i) => i.id));
  return [
    picked,
    (fn) => setState({ key, picked: fn(picked) }),
  ];
}
