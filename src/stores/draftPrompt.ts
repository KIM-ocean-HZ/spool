import { getDb } from '@/lib/db/client';
import { t } from '@/lib/i18n';
import { useCompressStore } from './compressStore';
import { useDraftStore } from './draftStore';
import { useSearchStore } from './searchStore';
import { useThreadsStore } from './threadsStore';
import { toast, useToastStore } from './toastStore';

// P9D-3（Ocean 第 109 条）：打开 Spool 时，上次编辑面板里没点「完成」的字还在 ⇒ 提示一句，
// 「去看」一下跳到那一块（面板已经开着、字在，见 BlockItem 的恢复）。
//
// ⚠️ 只为**开机时从 drafts.json 读回来的**那几块提示 —— 这一次打开之后才写的草稿，人就在跟前，
// 不用提示。输入框的草稿不提示（打开那个项目，字就在框里，P9D-2「不做」那一条）。
// ⚠️ 提示条要等到人看得见、一直留到他点「去看」或 ×：Spool 常常是开机自启、窗口藏着的，几秒就没
// 的 toast 他根本看不见 ⇒ `toast.sticky`（不计时，Esc 也不清它）。
// 好几块：说有几块，「去看」到最近写的那一块；那一块点了「完成」或 Esc 之后，还剩的再提示一次。

/** 一块还在等的草稿：它在哪个项目、第几块、最后一次写是什么时候。 */
export interface LeftDraft {
  blockId: string;
  threadId: string;
  title: string;
  seq: number | null;
  savedAt: number;
}

/** 要不要提示、「去看」去哪一块。null = 不提示。`left` 只放块还在的（`leftDrafts` 已经查过）。 */
export const draftPromptFor = (left: readonly LeftDraft[]): { count: number; target: LeftDraft } | null => {
  if (left.length === 0) return null;
  const target = [...left].sort((a, b) => b.savedAt - a.savedAt)[0]!;
  return { count: left.length, target };
};

/** 这几块里，块还在、项目也还在、草稿也还在的，连同项目名和编号。 */
export const leftDrafts = async (blockIds: readonly string[]): Promise<LeftDraft[]> => {
  const drafts = useDraftStore.getState().blockDrafts;
  const ids = blockIds.filter((id) => drafts[id]);
  if (ids.length === 0) return [];
  const db = await getDb();
  const rows = await db.select<{ id: string; thread_id: string; title: string | null; seq: number | null }[]>(
    `SELECT b.id, b.thread_id, t.title, b.seq FROM blocks b JOIN threads t ON t.id = b.thread_id
      WHERE t.deleted_at IS NULL AND b.id IN (${ids.map((_, i) => `$${i + 1}`).join(', ')})`,
    [...ids],
  );
  return rows.map((r) => ({
    blockId: r.id,
    threadId: r.thread_id,
    title: r.title ?? '',
    seq: r.seq ?? null,
    savedAt: drafts[r.id]?.savedAt ?? 0,
  }));
};

const messageFor = ({ count, target }: { count: number; target: LeftDraft }): string => {
  if (count > 1) return t('有 {n} 块上次没点「完成」，写的字还在', { n: count });
  const title = target.title || t('（无标题）');
  return target.seq === null
    ? t('〈{title}〉里有一块上次没点「完成」，写的字还在', { title })
    : t('〈{title}〉#{seq} 上次没点「完成」，写的字还在', { title, seq: target.seq });
};

/** 「去看」：选中那个项目、回到「内容」页签、跳到那一块。面板由那一块自己开（画出来时有草稿）。 */
const goTo = (d: LeftDraft): void => {
  useCompressStore.getState().setTab(d.threadId, 'content');
  useThreadsStore.getState().select(d.threadId);
  useSearchStore.getState().highlight(d.blockId);
};

let leftovers = new Set<string>();
let promptId: number | null = null;
/** 点过「去看」、那一块还没了结 —— 了结之后还剩的要接着提示（就算提示条已经因为「去看」关掉了）。 */
let walking = false;

const showing = (): boolean => promptId !== null && useToastStore.getState().toasts.some((x) => x.id === promptId);

const show = async (): Promise<void> => {
  let left: LeftDraft[] = [];
  try {
    left = await leftDrafts([...leftovers]);
  } catch (e) {
    console.warn('[drafts] prompt lookup failed', e);
  }
  if (promptId !== null) useToastStore.getState().dismiss(promptId);
  promptId = null;
  const p = draftPromptFor(left);
  if (!p) return;
  promptId = toast.sticky(messageFor(p), t('去看'), () => {
    walking = true;
    goTo(p.target);
  });
};

let unsubscribe: (() => void) | null = null;

/** 开机读完 drafts.json 之后调一次，传读回来的那几块。 */
export const startDraftPrompt = (blockIds: readonly string[]): void => {
  leftovers = new Set(blockIds);
  unsubscribe?.();
  unsubscribe = useDraftStore.subscribe((s, prev) => {
    if (s.blockDrafts === prev.blockDrafts) return;
    let resolved = false;
    for (const id of leftovers) {
      if (!s.blockDrafts[id]) {
        leftovers.delete(id);
        resolved = true;
      }
    }
    if (!resolved || !(showing() || walking)) return;
    walking = false;
    void show();
  });
  void show();
};
