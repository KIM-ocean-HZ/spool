import { librarySignature } from '@/lib/db/librarySignature';
import { useAiUpdatesStore } from './aiUpdatesStore';
import { useBlocksStore } from './blocksStore';
import { useProposalsStore } from './proposalsStore';
import { useThreadsStore } from './threadsStore';

// 别的进程写进库的东西，重读一遍。
//
// 「别的进程」= AI 客户端起的 `spool --mcp`（add_block、propose_* 那一整套），以及 Spool 自己的
// 引擎跑起来的那个 CLI（它也是通过 MCP 写库）。它们直接写 SQLite，这几个 store 不会被告知 ——
// 只能在合适的时刻自己回头读。
//
// ⛔ 读哪几样、按什么顺序，**只写在这里**。之前窗口焦点和引擎跑完各写了一遍「项目列表 → 当前块
// → 待审数」，「过期检测」那一种两边都漏了（DISCOVERED-20260829-10）—— 各写一遍，下一次加一种
// 待审还会再漏一处。
export async function reloadOutsideWrites(): Promise<void> {
  // 刷新安全：选中的项目保留，行整份替换。正在编辑的块不受影响 —— 草稿在 BlockItem 自己的
  // state 里，`!editingContent` 才会被新读到的正文覆盖（任务书 P4-2 那一条查过）。
  await useThreadsStore.getState().loadAll();
  const active = useThreadsStore.getState().activeId;
  if (active) await useBlocksStore.getState().load(active);
  // P7-5：AI 提的「更正 / 取代」也在待审里（过期检测页签只放用户自己跑的），这一句一起刷新。
  await useProposalsStore.getState().refresh();
  // P9S-4：AI 写进来的块让那个项目的小圆点变绿。
  await useAiUpdatesStore.getState().refresh();
}

// P4-2：Spool 一直开着、窗口却没有重新拿到焦点的时候（和 AI 客户端左右并排、人在那边打字；
// 或者让终端里的 AI 慢慢干活，自己切过来看着）—— 焦点那一次不会发生，所以隔几秒查一次记号，
// 变了才重读（P14 起窗口看不见时也查，见 `watchOutsideWrites`）。
// 数字和页签自己变就是全部反馈：⛔ 不弹提示、不抬窗口、不切页签。
export const POLL_MS = 3000;
// 窗口焦点和查记号**共用这一个节流**：刚因为焦点重读过，记号再变也等满 3 秒。
const THROTTLE_MS = 3000;
let lastRunAt = 0;
/** 上一次重读开始那一刻的记号。`null` = 还没重读过，第一次查记号就当「变了」。 */
let seenSignature: string | null = null;

/** 窗口拿到焦点、以及记号变了，都走这里。 */
export async function reloadOutsideWritesThrottled(): Promise<void> {
  const now = Date.now();
  if (now - lastRunAt < THROTTLE_MS) return;
  lastRunAt = now;
  // ⚠️ 记号在重读**之前**取：重读那几毫秒里又写进来的，下一次查记号时就是「变了」。
  // 重读失败就不记 —— 下一次查记号还算「变了」，再试一次。
  const signature = await librarySignature();
  await reloadOutsideWrites();
  seenSignature = signature;
}

/** 查一次记号，变了才重读。被节流挡下的那一次不记，下一次查记号时再来。 */
export async function pollOutsideWrites(): Promise<void> {
  if ((await librarySignature()) === seenSignature) return;
  await reloadOutsideWritesThrottled();
}

/** 隔 `POLL_MS` 查一次记号，窗口一露出来再立刻查一次；返回停掉它的函数。
 *  ⛔ 不问有没有焦点 —— 没焦点正是这一路要管的情况。
 *  ⭐ P14（H2，Ocean 2026-11-06 选甲）：⛔ 也不问看不看得见。P4-2 原来是「看不见（最小化、被盖住、在别的桌面）
 *  就不查，回来时由焦点补上」—— 可是 AI 用电脑操作去「看」Spool（读辅助功能树）时，窗口既不变成看得见、也拿不到
 *  焦点，两条路都不触发，页面就一直是旧的（2026-11-04 实测 T06）。查记号只是一条聚合查询，变了才重读；看不见时
 *  WebKit 自己把间隔放到 4 秒左右（测试版实测）。
 *  一露出来立刻查：切回那个桌面这一种不给焦点，不然要等下一次查记号（实测 2.3 秒）。 */
export function watchOutsideWrites(): () => void {
  const check = (): void => void pollOutsideWrites().catch((e) => console.warn('[outside-writes] poll failed', e));
  const id = setInterval(check, POLL_MS);
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') check();
  };
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/** 测试用：模块里那两个变量回到刚启动的样子。 */
export const __resetOutsideWritesForTest = (): void => {
  lastRunAt = 0;
  seenSignature = null;
};
