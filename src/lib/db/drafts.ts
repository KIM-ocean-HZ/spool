import { Store } from '@tauri-apps/plugin-store';
import { appendImageLines, parseImageLines, referencedImageIds } from '@/lib/blocks/imageLines';
import { useDraftStore } from '@/stores/draftStore';
import { getDb } from './client';

// P9D（2026-10-15，Ocean 第 108 条「边写边存」）—— 还没存进库的字，跨退出、换装、崩溃留住。
//
// 来历：10-14 Ocean 在〈个人网站素材〉#9 后面写的两段，没点「完成」就没了（DISCOVERED-20261014-5）。
// 编辑面板的字原来只在 React 的内存里，而退出 / 按 pid 停进程 / 崩溃时前端拿不到任何「要退出了」
// 的机会（托盘退出直接 `app.exit(0)`）⇒「退出前存一下」这条路走不通，只能字一停就写。
//
// ⚠️⚠️ **存在自己的一个文件里，⛔ 不进 spool.db，也 ⛔ 不进 settings.json。** 理由和 focus.json
// 一模一样（focusDay.ts 头注释）：它不是库里的内容（库会被导出、搬到别的电脑，草稿跟过去说的是
// 另一台电脑上没写完的字）；它不是设置；动 schema 是这个库最贵的操作。⇒ MCP 读不到、pack 里没有、
// 不随库导出。「清除所有数据」时一起清掉（clearDraftsFile）。
//
// ⚠️ 读坏了就当没有：插件读文件失败时自己就当空的（下一次写会盖掉坏文件），形状不对的条目在这里
// 丢掉。后果只能是「这次没恢复出来」，⛔ 不能让 Spool 打不开。

const FILE = 'drafts.json';
const BLOCKS_KEY = 'blocks';

/** 字停下来多久写一次盘。⚠️ 删（完成 / Esc）不等，当场写 —— 不然刚按了 Esc 就被停掉，
 *  下次打开它又回来了。 */
export const DRAFT_SAVE_DELAY_MS = 300;

/** 编辑面板里一块没点「完成」的字。 */
export interface BlockDraft {
  content: string;
  annotation: string;
  /** 开面板那一刻块上的正文和批注。恢复时拿它和块现在的样子比：不一样 = 这一块后来被改过，
   *  「完成」会用草稿盖掉那次改动，面板顶上要说一句。 */
  baseContent: string;
  baseAnnotation: string;
  savedAt: number;
}

const isBlockDraft = (v: unknown): v is BlockDraft => {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.content === 'string' &&
    typeof o.annotation === 'string' &&
    typeof o.baseContent === 'string' &&
    typeof o.baseAnnotation === 'string' &&
    typeof o.savedAt === 'number' &&
    Number.isFinite(o.savedAt)
  );
};

/** 盘上的 `blocks` → 干净的一份：形状不对的条目丢掉，整个不是对象就当空的。 */
export const cleanBlockDrafts = (raw: unknown): Record<string, BlockDraft> => {
  const out: Record<string, BlockDraft> = {};
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (id && isBlockDraft(v)) out[id] = v;
  }
  return out;
};

/** 只留下块还在的那几条（块删了、项目删了，草稿就没有地方回去了）。 */
export const keepLive = <T>(drafts: Record<string, T>, live: ReadonlySet<string>): Record<string, T> =>
  Object.fromEntries(Object.entries(drafts).filter(([id]) => live.has(id)));

/** 编辑面板打开时两格里放什么。⚠️ `openedWith`（「完成」时删图的依据）**永远按块上现在的样子
 *  算**，⛔ 不按草稿算：草稿里没有的图会在「完成」时被当成「被拿掉了」，按草稿算就会删错图。
 *  `restored` 不是 null = 这次放的是草稿的字；`changed` = 块在草稿之后被改过。 */
export const editorOpening = (input: {
  content: string;
  annotation: string | null;
  /** 块上的图里，正文还没提到的那几张（老块的图在正文末尾补成图片行，面板里才拿得掉）。 */
  unplacedImageIds: readonly string[];
  hasPictures: boolean;
  saved: BlockDraft | undefined;
}): {
  openedWith: { draft: string; imageIds: string[] };
  annotation: string;
  contentDraft: string;
  annotationDraft: string;
  pictureMode: boolean;
  base: { content: string; annotation: string };
  restored: { changed: boolean } | null;
} => {
  const { content, saved } = input;
  const annotation = input.annotation ?? '';
  const pictureMode =
    input.hasPictures ||
    parseImageLines(content).length > 0 ||
    (saved !== undefined && parseImageLines(saved.content).length > 0);
  const draft = pictureMode ? appendImageLines(content, input.unplacedImageIds) : content;
  return {
    openedWith: { draft, imageIds: referencedImageIds(draft) },
    annotation,
    contentDraft: saved ? saved.content : draft,
    annotationDraft: saved ? saved.annotation : annotation,
    pictureMode,
    base: saved ? { content: saved.baseContent, annotation: saved.baseAnnotation } : { content, annotation },
    restored: saved
      ? { changed: saved.baseContent !== content || saved.baseAnnotation !== annotation }
      : null,
  };
};

let storePromise: Promise<Store> | null = null;
const getStore = (): Promise<Store> => {
  if (!storePromise) storePromise = Store.load(FILE);
  return storePromise;
};

// 一次只写一份，按先后排队：后一次写的是更新的字，不能被前一次慢了的那次盖回去。
let chain: Promise<void> = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | undefined;

const writeNow = (): Promise<void> => {
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
  const blocks = useDraftStore.getState().blockDrafts;
  chain = chain.then(async () => {
    try {
      const store = await getStore();
      await store.set(BLOCKS_KEY, blocks);
      await store.save();
    } catch (e) {
      console.warn('[drafts] save failed', e);
    }
  });
  return chain;
};

const schedule = (now: boolean): void => {
  if (now) {
    void writeNow();
    return;
  }
  if (timer !== undefined) clearTimeout(timer);
  timer = setTimeout(() => void writeNow(), DRAFT_SAVE_DELAY_MS);
};

const removedAny = (prev: object, next: object): boolean => Object.keys(prev).some((k) => !(k in next));

/** 盘上那份的块 id 里，块还在、项目也还在的那几个。 */
const liveBlockIds = async (ids: string[]): Promise<Set<string>> => {
  if (ids.length === 0) return new Set();
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>(
    `SELECT b.id FROM blocks b JOIN threads t ON t.id = b.thread_id
      WHERE t.deleted_at IS NULL AND b.id IN (${ids.map((_, i) => `$${i + 1}`).join(', ')})`,
    ids,
  );
  return new Set(rows.map((r) => r.id));
};

let unsubscribe: (() => void) | null = null;

/** 开机读一次（库开好之后）：读回来、丢掉块已经不在了的、放进 draftStore，然后开始边写边存。
 *  ⚠️ 读完才开始写 —— 先写的话会拿空的那份把盘上的盖掉。 */
export const loadDrafts = async (): Promise<void> => {
  let blocks: Record<string, BlockDraft> = {};
  let dropped = false;
  try {
    const store = await getStore();
    const raw: unknown = await store.get(BLOCKS_KEY);
    const all = cleanBlockDrafts(raw);
    blocks = keepLive(all, await liveBlockIds(Object.keys(all)));
    dropped = raw !== undefined && JSON.stringify(raw) !== JSON.stringify(blocks);
  } catch (e) {
    console.warn('[drafts] load failed', e);
  }
  // 读盘这一小会儿里如果已经有面板写了草稿，那一份更新，留它的。
  useDraftStore.setState((s) => ({ blockDrafts: { ...blocks, ...s.blockDrafts }, draftsLoaded: true }));
  unsubscribe?.();
  unsubscribe = useDraftStore.subscribe((s, prev) => {
    if (s.blockDrafts === prev.blockDrafts) return;
    schedule(removedAny(prev.blockDrafts, s.blockDrafts));
  });
  // 丢掉过东西（块不在了、条目坏了）的话，盘上那份也跟着改掉。
  if (dropped) await writeNow();
};

/** 「清除所有数据」：草稿也清掉（它们指着的块都没了）。 */
export const clearDraftsFile = async (): Promise<void> => {
  useDraftStore.setState({ blockDrafts: {} });
  await writeNow();
};
