import { create } from 'zustand';
import * as files from '@/lib/db/fileAccess';
import type { FileAccessRequest } from '@/lib/db/fileAccess';
import * as fileProposals from '@/lib/db/fileProposals';
import type { FileProposal } from '@/lib/db/fileProposals';
import { approveFileProposal as approveFileProposalNow } from '@/lib/files/fileProposals';
import * as db from '@/lib/db/proposals';
import type { ProposalBatch } from '@/lib/db/proposals';
import * as followUp from '@/lib/db/followUpItems';
import type { FollowUpProposal } from '@/lib/db/followUpItems';
import { purgeExpiredSupersedeProposals } from '@/lib/db/supersedeProposals';
import * as splitProposals from '@/lib/db/splitProposals';
import { applySplit, listSplitReview, type SplitDraft, type SplitReviewItem } from '@/lib/split/projectSplit';
import type { SplitPayload } from '@/lib/undo/undoLog';
import {
  decideSupersedeProposal,
  listSupersedeReview,
  type SupersedeChoice,
  type SupersedeReviewItem,
} from '@/lib/blocks/supersedeReview';
import { t } from '@/lib/i18n';
import { useBlocksStore } from './blocksStore';
import { useThreadsStore } from './threadsStore';
import { toast } from './toastStore';
import { buildSplitUndo, useUndoStore } from './undoStore';

// DESIGN_MCP_WRITE_ROLE §4.3 — state behind the review screen.
//
// The queue is written by a DIFFERENT process (the `spool --mcp` subprocess an AI client
// spawned), so this store never learns about a new batch by being told. It re-counts:
// once at startup and on every window focus, riding the same "coming back to the window
// is the moment to show what changed" reload App already does for threads and blocks.
//
// The count is a COUNT query, not a load — a badge needs a number, and the batches
// themselves are only read when the user opens the screen.

// 2026-08-14: the screen grew two more kinds of "AI 提的，等你过目", and they share this
// store on purpose. Each could have had its own badge, and three badges in the sidebar
// would be three things to learn — the user's question is "is anything waiting for me",
// and that has one answer. `pendingCount` is therefore the total; each kind keeps its own
// count only so the screen can render the right sections.
interface ProposalsState {
  /** Non-null only while the screen is open. */
  batches: ProposalBatch[] | null;
  /** DESIGN_PROJECT_FILES §3.4 — files an AI has asked to read. */
  fileRequests: FileAccessRequest[] | null;
  /** DESIGN_FOLLOW_UP §8.4 — lines an AI proposed for a project's follow-up list. */
  followUpProposals: FollowUpProposal[] | null;
  /** P6-3 — files an AI proposed attaching to a project, or proposed as a newer version. */
  fileProposals: FileProposal[] | null;
  /** P7-5 — an AI's 「更正 / 取代」 suggestion about two blocks; the user picks one of three. */
  supersedeProposals: SupersedeReviewItem[] | null;
  /** P9G-3 — an AI's 「把这个项目拆成几个子项目」, regrouped on the card before 「拆分」. */
  splitProposals: SplitReviewItem[] | null;
  /** Everything waiting on the user, in one number: the sidebar badge. */
  pendingCount: number;
  /** Batches past their 7 days — one line on the screen, never approvable. */
  expiredBatches: number;
  panelOpen: boolean;
  busy: boolean;
  refresh: () => Promise<void>;
  open: () => Promise<void>;
  close: () => void;
  approve: (batchId: string, keepIds?: string[]) => Promise<void>;
  reject: (batchId: string) => Promise<void>;
  clearExpired: () => Promise<void>;
  approveFiles: (requestId: string) => Promise<void>;
  rejectFiles: (requestId: string) => Promise<void>;
  approveFollowUp: (itemId: string) => Promise<void>;
  dismissFollowUp: (itemId: string) => Promise<void>;
  approveFileProposal: (id: string) => Promise<void>;
  rejectFileProposal: (id: string) => Promise<void>;
  decideSupersede: (id: string, choice: SupersedeChoice) => Promise<void>;
  approveSplit: (id: string, draft: SplitDraft) => Promise<void>;
  rejectSplit: (id: string) => Promise<void>;
}

// Everything the approved blocks touched has to be re-read: they landed through a path
// these stores were not watching, and they may be spread across several projects.
const reloadLibrary = async (): Promise<void> => {
  await useThreadsStore.getState().loadAll();
  const active = useThreadsStore.getState().activeId;
  if (active) await useBlocksStore.getState().load(active);
};

// Load everything the screen shows, in one place, so the three kinds can never be read
// from different moments in time.
const loadAll = async (): Promise<
  Pick<
    ProposalsState,
    | 'batches'
    | 'fileRequests'
    | 'followUpProposals'
    | 'fileProposals'
    | 'supersedeProposals'
    | 'splitProposals'
  >
> => {
  const now = Date.now();
  const [batches, fileRequests, followUpProposals, fileProposalList, supersedeProposals, splitList] =
    await Promise.all([
      db.listPendingBatches(now),
      files.listPendingFileRequests(now),
      followUp.listFollowUpProposals(),
      fileProposals.listPendingFileProposals(now),
      listSupersedeReview(now),
      listSplitReview(now),
    ]);
  return {
    batches,
    fileRequests,
    followUpProposals,
    fileProposals: fileProposalList,
    supersedeProposals,
    splitProposals: splitList,
  };
};

// What every act-on-something path does afterwards: re-count for the badge, re-read what
// the open screen shows, and close it once there is nothing left. The screen closes on
// "nothing waiting at all", not "no proposals left" — with three kinds sharing it, closing
// on the first empty section would hide the other two.
type Setter = (partial: Partial<ProposalsState>) => void;
const settle = async (get: () => ProposalsState, set: Setter): Promise<void> => {
  await get().refresh();
  if (!get().panelOpen) return;
  const state = await loadAll();
  set(state);
  const nothingLeft =
    state.batches!.length === 0 &&
    state.fileRequests!.length === 0 &&
    state.followUpProposals!.length === 0 &&
    state.fileProposals!.length === 0 &&
    state.supersedeProposals!.length === 0 &&
    state.splitProposals!.length === 0;
  if (nothingLeft) get().close();
};

export const useProposalsStore = create<ProposalsState>((set, get) => ({
  batches: null,
  fileRequests: null,
  followUpProposals: null,
  fileProposals: null,
  supersedeProposals: null,
  splitProposals: null,
  pendingCount: 0,
  expiredBatches: 0,
  panelOpen: false,
  busy: false,

  refresh: async () => {
    try {
      const now = Date.now();
      // P7-5: what 过期检测 used to do each time it read these — a suggestion past its 7 days
      // is a no, and leaves nothing behind.
      await purgeExpiredSupersedeProposals(now);
      const [proposals, expiredBatches, fileRequests, followUpLines, fileProposalCount, supersede, splits] =
        await Promise.all([
          db.countPending(now),
          db.countExpiredBatches(now),
          files.countPendingFileRequests(now),
          followUp.countFollowUpProposals(),
          fileProposals.countPendingFileProposals(now),
          // P7-5: read, not COUNTed — whether a row still needs the user depends on the two
          // blocks (done elsewhere already = not waiting), and that rule lives in one place.
          listSupersedeReview(now),
          splitProposals.countPendingSplitProposals(now),
        ]);
      set({
        pendingCount:
          proposals + fileRequests + followUpLines + fileProposalCount + supersede.length + splits,
        expiredBatches,
      });
      // Keep an open screen honest: a second client could have queued more while the
      // user was reading.
      if (get().panelOpen) set(await loadAll());
    } catch (e) {
      // A library that predates v10 has no such tables. Nothing to show is the right
      // answer, and it must not take the sidebar down with it.
      console.warn('[proposals] refresh failed', e);
    }
  },

  open: async () => {
    set({ panelOpen: true });
    await get().refresh();
    try {
      set(await loadAll());
    } catch (e) {
      console.warn('[proposals] load failed', e);
      set({
        batches: [],
        fileRequests: [],
        followUpProposals: [],
        fileProposals: [],
        supersedeProposals: [],
        splitProposals: [],
      });
    }
  },

  close: () =>
    set({
      panelOpen: false,
      batches: null,
      fileRequests: null,
      followUpProposals: null,
      fileProposals: null,
      supersedeProposals: null,
      splitProposals: null,
    }),

  approve: async (batchId, keepIds) => {
    if (get().busy) return;
    set({ busy: true });
    try {
      const written = await db.approveBatch(batchId, keepIds);
      await reloadLibrary();
      toast.notice(t('存进去了 {n} 块', { n: written }));
    } catch (e) {
      console.error('[proposals] approve failed', e);
      toast.error(t('存不进去：{msg}', { msg: e instanceof Error ? e.message : String(e) }));
    } finally {
      set({ busy: false });
      await settle(get, set);
    }
  },

  reject: async (batchId) => {
    if (get().busy) return;
    set({ busy: true });
    try {
      await db.rejectBatch(batchId);
    } catch (e) {
      console.error('[proposals] reject failed', e);
    } finally {
      set({ busy: false });
      await settle(get, set);
    }
  },

  // DESIGN_PROJECT_FILES §3.4 — the grant. It is standing, so the toast says where to take
  // it back: a permission the user cannot find again is not one they gave knowingly.
  approveFiles: async (requestId) => {
    if (get().busy) return;
    set({ busy: true });
    try {
      const granted = await files.approveFileRequest(requestId);
      // The file panel reads attachments out of blocksStore, so the ✓ has to be re-read
      // from the database or the switch the user just flipped stays off on screen.
      const active = useThreadsStore.getState().activeId;
      if (active) await useBlocksStore.getState().load(active);
      toast.notice(t('{n} 个文件现在 AI 可以读了。随时可以在项目文件那一栏点掉。', { n: granted }));
    } catch (e) {
      console.error('[files] grant failed', e);
      toast.error(t('没能打开权限：{msg}', { msg: e instanceof Error ? e.message : String(e) }));
    } finally {
      set({ busy: false });
      await settle(get, set);
    }
  },

  rejectFiles: async (requestId) => {
    if (get().busy) return;
    set({ busy: true });
    try {
      await files.rejectFileRequest(requestId);
    } catch (e) {
      console.error('[files] refusal failed', e);
    } finally {
      set({ busy: false });
      await settle(get, set);
    }
  },

  // DESIGN_FOLLOW_UP §8.4 — the 过目 gate closing, one line at a time. This click is the
  // only thing that can put a line into what Spool goes out to the web with, and it is
  // per line on purpose: the whole-brief suggestion it replaces made the user take or
  // leave a whole rewrite, and could silently overwrite one they had not read yet.
  approveFollowUp: async (itemId) => {
    if (get().busy) return;
    set({ busy: true });
    try {
      await followUp.approveFollowUpProposal(itemId);
      await useThreadsStore.getState().loadAll();
      toast.notice(t('加进跟进清单了'));
    } catch (e) {
      console.error('[follow-up] approve failed', e);
      toast.error(t('存不下来：{msg}', { msg: e instanceof Error ? e.message : String(e) }));
    } finally {
      set({ busy: false });
      await settle(get, set);
    }
  },

  dismissFollowUp: async (itemId) => {
    if (get().busy) return;
    set({ busy: true });
    try {
      await followUp.dismissFollowUpProposal(itemId);
    } catch (e) {
      console.error('[follow-up] dismiss failed', e);
    } finally {
      set({ busy: false });
      await settle(get, set);
    }
  },

  // P6-3 — the click that attaches a file an AI proposed (or puts a newer version in place of
  // an older one). What it checks and why is in lib/files/fileProposals.ts; this only says
  // what happened, in the words of the card the user just pressed.
  approveFileProposal: async (id) => {
    if (get().busy) return;
    set({ busy: true });
    try {
      const outcome = await approveFileProposalNow(id);
      if (outcome.kind === 'attached') {
        toast.notice(
          outcome.blockGone
            ? t('挂上了「{name}」。原来那一块已经删了，所以挂在项目上。', { name: outcome.label })
            : outcome.movedTo !== null
              ? t('挂上了「{name}」，在〈{title}〉里 —— 那一块挪到那儿了。', {
                  name: outcome.label,
                  title: outcome.movedTo || t('（无标题）'),
                })
              : t('挂上了「{name}」。', { name: outcome.label }),
        );
      } else if (outcome.kind === 'replaced') {
        toast.notice(t('「{name}」换上了，旧版「{old}」收在它下面。', { name: outcome.label, old: outcome.oldLabel }));
      } else if (outcome.kind === 'already') {
        toast.notice(t('「{name}」已经在这个项目里了，没有重复挂。', { name: outcome.label }));
      } else if (outcome.kind === 'missing') {
        toast.error(t('找不到「{name}」了（挪走了，或者外接盘没插上），没有挂上。', { name: outcome.label }));
      } else {
        toast.notice(t('这条提议说的东西已经不在了，清掉了。'));
      }
    } catch (e) {
      console.error('[file-proposals] approve failed', e);
      toast.error(t('没能挂上：{msg}', { msg: e instanceof Error ? e.message : String(e) }));
    } finally {
      set({ busy: false });
      await settle(get, set);
    }
  },

  rejectFileProposal: async (id) => {
    if (get().busy) return;
    set({ busy: true });
    try {
      await fileProposals.deleteFileProposal(id);
    } catch (e) {
      console.error('[file-proposals] refusal failed', e);
    } finally {
      set({ busy: false });
      await settle(get, set);
    }
  },

  // P7-5 — the user's pick on an AI's 「更正 / 取代」 suggestion. Both blocks' projects are
  // re-read: the one that changed may not be the one on screen, and a correction can point
  // across projects.
  decideSupersede: async (id, choice) => {
    if (get().busy) return;
    set({ busy: true });
    try {
      const outcome = await decideSupersedeProposal(id, choice, Date.now());
      if (outcome.kind === 'occupied') {
        // The button is greyed out for this case; reaching here means the block changed
        // after the card was drawn.
        toast.error(t('新的那一块已经指着另一块了，一块只能更正一块。'));
      } else if (outcome.kind === 'gone') {
        toast.notice(t('这条建议说的两块里有一块已经不在了，清掉了。'));
      } else {
        const blocks = useBlocksStore.getState();
        for (const threadId of outcome.threadIds) {
          if (blocks.byThread[threadId]) await blocks.load(threadId);
        }
        await useThreadsStore.getState().loadAll();
      }
    } catch (e) {
      console.error('[supersede] decide failed', e);
      toast.error(t('写不进去：{msg}', { msg: e instanceof Error ? e.message : String(e) }));
    } finally {
      set({ busy: false });
      await settle(get, set);
    }
  },

  // P9G-3 — the click that splits a project as the card shows it. One undo entry for all of it;
  // pushed even when the split stopped half-way, so what was done is still one ⌘Z from undone.
  approveSplit: async (id, draft) => {
    if (get().busy) return;
    set({ busy: true });
    let payload: SplitPayload | null = null;
    try {
      const outcome = await applySplit(id, draft, Date.now(), (p) => {
        payload = p;
      });
      if (outcome.kind === 'split') {
        toast.notice(t('拆成了 {n} 个子项目。按 ⌘Z 能一次撤回。', { n: outcome.payload.children.length }));
      } else if (outcome.kind === 'gone') {
        toast.notice(t('这条提议说的项目已经不在了，清掉了。'));
      } else if (outcome.kind === 'done') {
        toast.notice(t('〈{title}〉已经完成了，没有拆。要拆先重新打开它。', { title: outcome.title }));
      } else {
        toast.notice(t('每一组都没有块，没有拆。'));
      }
    } catch (e) {
      console.error('[split] failed', e);
      toast.error(t('没能拆完：{msg}。已经挪过去的，按 ⌘Z 能撤回。', { msg: e instanceof Error ? e.message : String(e) }));
    } finally {
      const done = payload as SplitPayload | null;
      if (done && done.children.length > 0) useUndoStore.getState().pushUndo(buildSplitUndo(done));
      await reloadLibrary();
      set({ busy: false });
      await settle(get, set);
    }
  },

  rejectSplit: async (id) => {
    if (get().busy) return;
    set({ busy: true });
    try {
      await splitProposals.deleteSplitProposal(id);
    } catch (e) {
      console.error('[split] refusal failed', e);
    } finally {
      set({ busy: false });
      await settle(get, set);
    }
  },

  clearExpired: async () => {
    try {
      await db.purgeExpired(Date.now());
      await files.purgeExpiredFileRequests(Date.now());
      await fileProposals.purgeExpiredFileProposals(Date.now());
      await purgeExpiredSupersedeProposals(Date.now());
      await splitProposals.purgeExpiredSplitProposals(Date.now());
    } catch (e) {
      console.warn('[proposals] purge failed', e);
    }
    await get().refresh();
  },
}));
