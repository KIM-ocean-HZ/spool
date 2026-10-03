import { useBlocksStore } from './blocksStore';
import { useCompressStore } from './compressStore';
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
  await useProposalsStore.getState().refresh();
  // ⚠️ 必须排在重读块之后：AI 往往先写一块新的、再提「新的取代旧的」，而提议是按 store 里
  // 这个项目的块（`#n`）对上号的 —— 块还没读进来，那一条就对不上。
  if (active) await useCompressStore.getState().loadProposedStale(active);
}
