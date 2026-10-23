import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAttachment, listAttachmentsByThread } from '@/lib/db/attachments';
import {
  computeMergedFields,
  createBlock,
  deleteBlock,
  getBlockById,
  insertBlocks,
  listBlocksByThread,
  mergeBlocks,
  setBlockStale,
  setBlockSupersession,
  setCorrectedQuote,
  togglePin,
  updateBlockContent,
} from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import {
  createThread,
  getCaptureTargetThread,
  listAllThreads,
  setCaptureTarget,
  softDeleteThread,
  updateThread,
} from '@/lib/db/threads';
import { createWorkspace, listWorkspaces, softDeleteWorkspace } from '@/lib/db/workspaces';
import schemaSql from '@/lib/db/schema.sql?raw';
import { clear as clearUndoLog } from '@/lib/undo/undoLog';
import {
  buildCaptureUndo,
  buildCreateUndo,
  buildDeleteUndo,
  buildForwardUndo,
  buildHighlightUndo,
  buildMergeUndo,
  buildThreadDeleteUndo,
  buildWorkspaceDeleteUndo,
  useUndoStore,
} from './undoStore';
import { useBlocksStore } from './blocksStore';
import { useThreadsStore } from './threadsStore';
import { useWorkspacesStore } from './workspacesStore';

const { DatabaseSync } = createRequire(import.meta.url)(
  'node:sqlite',
) as typeof import('node:sqlite');
type Sqlite = InstanceType<typeof DatabaseSync>;

type SqlValue = string | number | bigint | null | Uint8Array;
const toNumbered = (sql: string): string => sql.replace(/\$(\d+)/g, '?$1');

const makeAdapter = (handle: Sqlite): Database =>
  ({
    execute: async (sql: string, params: unknown[] = []) => {
      const r = handle.prepare(toNumbered(sql)).run(...(params as SqlValue[]));
      return { rowsAffected: Number(r.changes), lastInsertId: Number(r.lastInsertRowid) };
    },
    select: async (sql: string, params: unknown[] = []) =>
      handle.prepare(toNumbered(sql)).all(...(params as SqlValue[])),
  }) as unknown as Database;

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 5));

describe('undoStore reversal against a real SQLite engine (§9.13)', () => {
  let sqlite: Sqlite;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    clearUndoLog();
    useUndoStore.setState({ entries: [], redoable: null });
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  // Ocean, Windows 验收 2026-08-18 #1: 「自己写入的 block 无法撤销」. Composer writes recorded
  // nothing at all, so there was no entry for ⌘Z to find. These pin both directions —
  // reversing a write removes the block, and redo puts back the row as it stood when it was
  // reversed (pin and edits included), not the bare text that was first typed.
  it('undo(create) removes a block the user typed, and redo restores it as it stood', async () => {
    const ws = await createWorkspace('W');
    const thread = await createThread(ws.id, 'T');
    const block = await createBlock({ threadId: thread.id, content: 'typed by hand' });

    useUndoStore.getState().pushUndo(
      buildCreateUndo({ blockId: block.id, threadId: thread.id, content: block.content }),
    );
    // What happens to a real block between being written and being undone.
    await togglePin(block.id);

    const entry = await useUndoStore.getState().undo();
    expect(entry?.kind).toBe('create');
    expect(await listBlocksByThread(thread.id)).toHaveLength(0);

    await useUndoStore.getState().redo();
    const back = await listBlocksByThread(thread.id);
    expect(back).toHaveLength(1);
    expect(back[0]?.content).toBe('typed by hand');
    expect(back[0]?.pinned).toBe(true);
  });

  it('undo(capture) deletes the captured block', async () => {
    const ws = await createWorkspace('W');
    const thread = await createThread(ws.id, 'T');
    const block = await createBlock({ threadId: thread.id, content: 'captured text' });

    useUndoStore.getState().pushUndo(
      buildCaptureUndo({ blockId: block.id, threadId: thread.id, content: block.content }),
    );

    const entry = await useUndoStore.getState().undo();
    expect(entry?.kind).toBe('capture');
    expect(await listBlocksByThread(thread.id)).toHaveLength(0);
  });

  it('undo(delete) restores the block, and never touched the project\u2019s files', async () => {
    const ws = await createWorkspace('W');
    const thread = await createThread(ws.id, 'T');
    const block = await createBlock({
      threadId: thread.id,
      content: 'to be deleted',
      annotation: 'my note',
      source: 'Chrome',
    });
    const file = await createAttachment({
      threadId: thread.id,
      kind: 'file',
      target: '/x/notes.pdf',
      label: 'notes.pdf',
    });

    // Snapshot pre-state (as blocksStore.remove does), then delete.
    const snapshot = (await listBlocksByThread(thread.id))[0]!;
    await deleteBlock(block.id);
    expect(await listBlocksByThread(thread.id)).toHaveLength(0);
    // ⚠️ v15: the FK cascade that used to take the block's attachments with it is gone —
    // the file is the project's, and deleting one of its blocks is not a reason to lose it.
    expect((await listAttachmentsByThread(thread.id)).map((a) => a.id)).toEqual([file.id]);

    useUndoStore.getState().pushUndo(buildDeleteUndo({ block: snapshot }));
    const entry = await useUndoStore.getState().undo();
    expect(entry?.kind).toBe('delete');

    const after = await listBlocksByThread(thread.id);
    expect(after).toHaveLength(1);
    expect(after[0]!.id).toBe(block.id);
    expect(after[0]!.content).toBe('to be deleted');
    expect(after[0]!.annotation).toBe('my note');
    expect(after[0]!.source).toBe('Chrome');
    expect((await listAttachmentsByThread(thread.id)).map((a) => a.id)).toEqual([file.id]);
  });

  it('undo(merge) restores all source blocks with their annotations, files untouched', async () => {
    const ws = await createWorkspace('W');
    const thread = await createThread(ws.id, 'T');

    const b1 = await createBlock({
      threadId: thread.id,
      content: 'first',
      source: 'Notion',
      annotation: 'note A',
    });
    await tick();
    const b2 = await createBlock({ threadId: thread.id, content: 'second', source: 'Chrome' });
    await tick();
    const b3 = await createBlock({ threadId: thread.id, content: 'third' });
    await togglePin(b2.id);
    const file = await createAttachment({
      threadId: thread.id,
      kind: 'file',
      target: '/x/b2.pdf',
      label: 'b2.pdf',
    });

    // Snapshot pre-merge state (as blocksStore.mergeBlocks does).
    const sourceBlocks = await listBlocksByThread(thread.id);
    const merged = computeMergedFields(sourceBlocks);
    await mergeBlocks(
      merged.survivorId,
      merged.content,
      merged.annotation,
      merged.pinned,
      merged.source,
      merged.nonSurvivorIds,
    );
    expect(await listBlocksByThread(thread.id)).toHaveLength(1);

    useUndoStore.getState().pushUndo(
      buildMergeUndo({ survivorId: merged.survivorId, threadId: thread.id, sourceBlocks }),
    );
    const entry = await useUndoStore.getState().undo();
    expect(entry?.kind).toBe('merge');

    const after = await listBlocksByThread(thread.id);
    expect(after.map((b) => b.id).sort()).toEqual([b1.id, b2.id, b3.id].sort());

    const survivor = after.find((b) => b.id === b1.id)!;
    // Survivor reverted in place to its pre-merge fields (not the merged content).
    expect(survivor.content).toBe('first');
    expect(survivor.annotation).toBe('note A');
    expect(survivor.source).toBe('Notion');

    // The middle block keeps its pin. v15: the merge moved no file, so undoing it has no
    // file to move back — the project still holds exactly what it held before.
    const restored2 = after.find((b) => b.id === b2.id)!;
    expect(restored2.pinned).toBe(true);
    expect(restored2.content).toBe('second');
    expect((await listAttachmentsByThread(thread.id)).map((a) => a.id)).toEqual([file.id]);
  });

  it('redo() re-creates a captured block after its undo deleted it', async () => {
    const ws = await createWorkspace('W');
    const thread = await createThread(ws.id, 'T');
    const block = await createBlock({ threadId: thread.id, content: 'captured' });

    useUndoStore.getState().pushUndo(
      buildCaptureUndo({ blockId: block.id, threadId: thread.id, content: block.content }),
    );
    await useUndoStore.getState().undo();
    expect(await listBlocksByThread(thread.id)).toHaveLength(0);

    const redone = await useUndoStore.getState().redo();
    expect(redone?.kind).toBe('capture');
    const after = await listBlocksByThread(thread.id);
    expect(after).toHaveLength(1);
    expect(after[0]!.id).toBe(block.id);
    expect(after[0]!.content).toBe('captured');
    // After redo the op is undoable again.
    expect(useUndoStore.getState().redoable).toBeNull();
    await useUndoStore.getState().undo();
    expect(await listBlocksByThread(thread.id)).toHaveLength(0);
  });

  it('redo() re-merges after an undone merge', async () => {
    const ws = await createWorkspace('W');
    const thread = await createThread(ws.id, 'T');
    const b1 = await createBlock({ threadId: thread.id, content: 'first' });
    await tick();
    await createBlock({ threadId: thread.id, content: 'second' });

    const sourceBlocks = await listBlocksByThread(thread.id);
    const merged = computeMergedFields(sourceBlocks);
    await mergeBlocks(
      merged.survivorId,
      merged.content,
      merged.annotation,
      merged.pinned,
      merged.source,
      merged.nonSurvivorIds,
    );
    useUndoStore.getState().pushUndo(
      buildMergeUndo({
        survivorId: merged.survivorId,
        threadId: thread.id,
        sourceBlocks,
      }),
    );

    await useUndoStore.getState().undo();
    expect(await listBlocksByThread(thread.id)).toHaveLength(2);

    const redone = await useUndoStore.getState().redo();
    expect(redone?.kind).toBe('merge');
    const after = await listBlocksByThread(thread.id);
    expect(after).toHaveLength(1);
    expect(after[0]!.id).toBe(b1.id);
    expect(after[0]!.content).toBe('first\n\nsecond');
  });

  it('undo() skips an invalidated entry and returns null', async () => {
    const ws = await createWorkspace('W');
    const thread = await createThread(ws.id, 'T');
    const block = await createBlock({ threadId: thread.id, content: 'edited later' });

    useUndoStore.getState().pushUndo(
      buildCaptureUndo({ blockId: block.id, threadId: thread.id, content: block.content }),
    );
    // Simulate a content edit after capture (blocksStore.setContent does this).
    useUndoStore.getState().invalidateForBlock(block.id);

    const entry = await useUndoStore.getState().undo();
    expect(entry).toBeNull();
    // Block is untouched — the user's edit wins.
    expect(await listBlocksByThread(thread.id)).toHaveLength(1);
  });

  // --- Step 6: new op kinds ---

  it('undo(highlight) restores the pre-gesture content', async () => {
    const ws = await createWorkspace('W');
    const thread = await createThread(ws.id, 'T');
    const block = await createBlock({ threadId: thread.id, content: 'plain text here' });

    // Display-mode highlight gesture: persist == markers, then record the undo entry.
    await updateBlockContent(block.id, 'plain ==text== here');
    useUndoStore.getState().pushUndo(
      buildHighlightUndo({ blockId: block.id, threadId: thread.id, beforeContent: 'plain text here' }),
    );

    const entry = await useUndoStore.getState().undo();
    expect(entry?.kind).toBe('highlight');
    expect((await listBlocksByThread(thread.id))[0]!.content).toBe('plain text here');
  });

  it('a later edit invalidates a highlight entry so undo is skipped', async () => {
    const ws = await createWorkspace('W');
    const thread = await createThread(ws.id, 'T');
    const block = await createBlock({ threadId: thread.id, content: 'plain ==text== here' });

    useUndoStore.getState().pushUndo(
      buildHighlightUndo({ blockId: block.id, threadId: thread.id, beforeContent: 'plain text here' }),
    );
    // A content edit after the highlight (blocksStore.setContent invalidates).
    useUndoStore.getState().invalidateForBlock(block.id);

    expect(await useUndoStore.getState().undo()).toBeNull();
    // The block keeps its current (edited) content — the user's edit wins.
    expect((await listBlocksByThread(thread.id))[0]!.content).toBe('plain ==text== here');
  });

  it('undo(thread_delete) clears the soft-delete so the thread returns', async () => {
    const ws = await createWorkspace('W');
    const thread = await createThread(ws.id, 'Project');
    await softDeleteThread(thread.id);
    expect((await listAllThreads()).some((t) => t.id === thread.id)).toBe(false);

    useUndoStore.getState().pushUndo(
      buildThreadDeleteUndo({ threadId: thread.id, title: 'Project' }),
    );
    const entry = await useUndoStore.getState().undo();
    expect(entry?.kind).toBe('thread_delete');
    expect((await listAllThreads()).some((t) => t.id === thread.id)).toBe(true);
  });

  it('forward(copy) is additive — copies land in the target, the source is untouched, undo removes only the copies', async () => {
    const ws = await createWorkspace('W');
    const source = await createThread(ws.id, 'Source');
    const target = await createThread(ws.id, 'Target');

    const b1 = await createBlock({ threadId: source.id, content: 'one', annotation: 'note one' });
    await tick();
    const b2 = await createBlock({ threadId: source.id, content: 'two' });
    await togglePin(b2.id);
    await tick();
    const b3 = await createBlock({ threadId: source.id, content: 'three' });
    const file = await createAttachment({
      threadId: source.id,
      kind: 'file',
      target: '/x/e.pdf',
      label: 'e.pdf',
    });

    // Build the copies exactly as blocksStore.forwardToThread does: fresh ids, target
    // thread_id, verbatim fields, now-based created_at (+i ms). Then INSERT them (additive)
    // and record the forward undo entry. The copy of b3 (the 3rd source, index 2) is copy-2.
    const sources = await listBlocksByThread(source.id);
    const base = Date.now();
    const copyBlocks = sources.map((src, i) => ({
      ...src,
      id: `copy-${i}`,
      threadId: target.id,
      createdAt: base + i,
    }));
    await insertBlocks(copyBlocks);

    // Copies landed in the target with pin / annotation preserved, appended in source order
    // — with brand-new ids.
    const copies = await listBlocksByThread(target.id);
    expect(copies.map((c) => c.content)).toEqual(['one', 'two', 'three']);
    expect(copies.every((c) => ![b1.id, b2.id, b3.id].includes(c.id))).toBe(true);
    expect(copies.find((c) => c.content === 'one')!.annotation).toBe('note one');
    expect(copies.find((c) => c.content === 'two')!.pinned).toBe(true);
    // ⚠️ v15: no file travelled. A file belongs to the SOURCE project, and copying one of
    // its conclusions elsewhere is not a decision to copy its files there.
    expect(await listAttachmentsByThread(target.id)).toHaveLength(0);

    // The source is strictly read-only through the forward.
    expect((await listBlocksByThread(source.id)).map((b) => b.id).sort()).toEqual(
      [b1.id, b2.id, b3.id].sort(),
    );

    useUndoStore.getState().pushUndo(
      buildForwardUndo({ threadId: target.id, blocks: copyBlocks }),
    );
    const entry = await useUndoStore.getState().undo();
    expect(entry?.kind).toBe('forward');

    // Undo deleted ONLY the copies; the source still holds all three originals intact.
    expect(await listBlocksByThread(target.id)).toHaveLength(0);
    const sourceAfter = await listBlocksByThread(source.id);
    expect(sourceAfter.map((b) => b.id).sort()).toEqual([b1.id, b2.id, b3.id].sort());
    expect(sourceAfter.find((b) => b.id === b2.id)!.pinned).toBe(true);
    expect(sourceAfter.find((b) => b.id === b1.id)!.annotation).toBe('note one');
    expect((await listAttachmentsByThread(source.id)).map((a) => a.id)).toEqual([file.id]);
  });

  it('undo(workspace_delete) restores only the threads that delete removed', async () => {
    const ws = await createWorkspace('W');
    const a = await createThread(ws.id, 'A'); // deleted earlier, must STAY deleted
    const b = await createThread(ws.id, 'B'); // active at delete time, must come back

    await softDeleteThread(a.id);
    await tick(); // ensure a later, distinct timestamp for the workspace delete
    const deleteTimestamp = await softDeleteWorkspace(ws.id);

    expect((await listWorkspaces()).some((w) => w.id === ws.id)).toBe(false);

    useUndoStore.getState().pushUndo(
      buildWorkspaceDeleteUndo({ workspaceId: ws.id, deleteTimestamp }),
    );
    const entry = await useUndoStore.getState().undo();
    expect(entry?.kind).toBe('workspace_delete');

    expect((await listWorkspaces()).some((w) => w.id === ws.id)).toBe(true);
    const live = (await listAllThreads()).map((t) => t.id);
    expect(live).toContain(b.id); // restored
    expect(live).not.toContain(a.id); // earlier delete preserved (selective restore)
  });

  // 归档 (Ocean 2026-09-30 #9): one ⌘Z puts back exactly what the archive changed — the
  // projects it finished, each to the state it had (parked stays parked, and they keep their
  // place in 最近), the one that was already done stays done, and the capture target goes
  // back. Redo does the same archive again.
  it('undo(workspace_archive) reverts only the projects it finished, and the capture target', async () => {
    const w = await createWorkspace('W');
    const inner = await createWorkspace('Inner', w.id);
    const other = await createWorkspace('Other');
    const active = await createThread(w.id, 'active');
    const parked = await createThread(inner.id, 'parked');
    const wasDone = await createThread(w.id, 'was done');
    const elsewhere = await createThread(other.id, 'elsewhere');
    await updateThread(parked.id, { status: 'parked' });
    await updateThread(wasDone.id, { status: 'done', completedAt: 1, digest: 'kept' });
    await setCaptureTarget(active.id);
    await useWorkspacesStore.getState().load();
    await useThreadsStore.getState().loadAll();
    const before = new Map((await listAllThreads()).map((t) => [t.id, t]));
    await tick();

    await useWorkspacesStore.getState().archive(w.id);
    const archived = new Map((await listAllThreads()).map((t) => [t.id, t]));
    expect(archived.get(active.id)!.status).toBe('done');
    expect(archived.get(parked.id)!.status).toBe('done');
    expect(archived.get(active.id)!.digest).toBeNull(); // 结论留空
    expect(archived.get(wasDone.id)).toEqual(before.get(wasDone.id));
    expect(archived.get(elsewhere.id)!.status).toBe('active');
    expect((await getCaptureTargetThread())?.id).toBe(elsewhere.id);

    const entry = await useUndoStore.getState().undo();
    expect(entry?.kind).toBe('workspace_archive');
    const undone = new Map((await listAllThreads()).map((t) => [t.id, t]));
    for (const id of [active.id, parked.id, wasDone.id, elsewhere.id]) {
      const { isCaptureTarget: _a, ...was } = before.get(id)!;
      const { isCaptureTarget: _b, ...now } = undone.get(id)!;
      expect(now).toEqual(was);
    }
    expect((await getCaptureTargetThread())?.id).toBe(active.id);

    expect((await useUndoStore.getState().redo())?.kind).toBe('workspace_archive');
    const redone = new Map((await listAllThreads()).map((t) => [t.id, t]));
    expect(redone.get(active.id)).toEqual(archived.get(active.id));
    expect(redone.get(parked.id)).toEqual(archived.get(parked.id));
    expect((await getCaptureTargetThread())?.id).toBe(elsewhere.id);
  });

  it('undo(workspace_archive) leaves a capture target the user picked since', async () => {
    const w = await createWorkspace('W');
    const other = await createWorkspace('Other');
    const inside = await createThread(w.id, 'inside');
    const a = await createThread(other.id, 'a');
    const b = await createThread(other.id, 'b');
    await setCaptureTarget(inside.id);
    await useWorkspacesStore.getState().load();
    await useThreadsStore.getState().loadAll();

    await useWorkspacesStore.getState().archive(w.id);
    const movedTo = (await getCaptureTargetThread())!.id;
    const picked = movedTo === a.id ? b.id : a.id;
    await setCaptureTarget(picked);

    await useUndoStore.getState().undo();
    expect((await getCaptureTargetThread())?.id).toBe(picked);
    expect((await listAllThreads()).find((t) => t.id === inside.id)!.status).toBe('active');
  });

  // P2 · B2（DISCOVERED-20260830-20）：「移除引用」以前是这一屏上唯一单向的动作。
  // ⌘Z 要让引用方那一行**整行**回到移除前（四个字段逐一相等，`ref_note` 本来就没动），
  // 重做再清一次；而被引块的退役状态从头到尾一下都不碰。
  it('undo(ref_remove) writes the citation back exactly, and redo clears it again', async () => {
    const ws = await createWorkspace('W');
    const here = await createThread(ws.id, 'Here');
    const there = await createThread(ws.id, 'There');
    const cited = await createBlock({ threadId: there.id, content: 'the old sentence stands' });
    const citing = await createBlock({ threadId: here.id, content: 'it was corrected later' });
    await setBlockSupersession(citing.id, cited.id, 'corrects', Date.now());
    await setCorrectedQuote(citing.id, 'old sentence');
    // P9S-2：先「保留为历史引用」（那个按钮已经没了，直接写那一列）再退役 —— 没确认过的引用
    // 在退役那一刻就自动解掉了。
    sqlite.prepare('UPDATE blocks SET ref_reviewed_stale_at = 1234 WHERE id = ?').run(citing.id);
    await setBlockStale(cited.id, 1234);
    await useBlocksStore.getState().load(here.id);
    await useBlocksStore.getState().load(there.id);

    const before = (await getBlockById(citing.id))!;
    const citedBefore = (await getBlockById(cited.id))!;
    expect(before).toMatchObject({
      refBlockId: cited.id,
      refKind: 'corrects',
      correctedQuote: 'old sentence',
      refReviewedStaleAt: 1234,
    });

    await useBlocksStore.getState().clearSupersession(citing.id);
    const cleared = (await getBlockById(citing.id))!;
    expect(cleared).toMatchObject({
      refBlockId: null,
      refKind: null,
      correctedQuote: null,
      refReviewedStaleAt: null,
    });
    expect(await getBlockById(cited.id)).toEqual(citedBefore);

    const entry = await useUndoStore.getState().undo();
    expect(entry?.kind).toBe('ref_remove');
    expect(await getBlockById(citing.id)).toEqual(before);
    expect(await getBlockById(cited.id)).toEqual(citedBefore);

    expect((await useUndoStore.getState().redo())?.kind).toBe('ref_remove');
    expect(await getBlockById(citing.id)).toEqual(cleared);
    expect(await getBlockById(cited.id)).toEqual(citedBefore);
  });

  it('a plain citation comes back as a plain citation', async () => {
    const ws = await createWorkspace('W');
    const th = await createThread(ws.id, 'T');
    const cited = await createBlock({ threadId: th.id, content: 'source' });
    const citing = await createBlock({ threadId: th.id, content: 'cites it', refBlockId: cited.id });
    await useBlocksStore.getState().load(th.id);
    const before = (await getBlockById(citing.id))!;
    expect(before.refKind).toBeNull();

    await useBlocksStore.getState().clearSupersession(citing.id);
    expect((await getBlockById(citing.id))!.refBlockId).toBeNull();
    await useUndoStore.getState().undo();
    expect(await getBlockById(citing.id)).toEqual(before);
  });

  // P2 · B4（乙，Ocean 10-02「真移动」）：复制到一个已经有其中 1 块的项目，再选「删掉原块」。
  // 移过去的还是原来那几块 —— 别处的引用不断、压缩前原文还在 —— 而按一次 ⌘Z 全部回来。
  it('undo(move) puts every moved and deleted block back exactly, in one press', async () => {
    const ws = await createWorkspace('W');
    const src = await createThread(ws.id, 'Src');
    const dst = await createThread(ws.id, 'Dst');
    const elsewhere = await createThread(ws.id, 'Elsewhere');
    const already = await createBlock({ threadId: dst.id, content: 'gamma three' });
    await tick();
    const a = await createBlock({ threadId: src.id, content: 'alpha one' });
    await tick();
    const b = await createBlock({ threadId: src.id, content: 'beta two' });
    await tick();
    const dup = await createBlock({ threadId: src.id, content: 'gamma three' });
    sqlite
      .prepare("UPDATE blocks SET original_content = 'alpha, before compression', compressed_at = 1 WHERE id = ?")
      .run(a.id);
    const cites = await createBlock({ threadId: elsewhere.id, content: 'see alpha', refBlockId: a.id });
    await useBlocksStore.getState().load(src.id);
    await useBlocksStore.getState().load(dst.id);
    const before = await listBlocksByThread(src.id);

    const pairs = await useBlocksStore.getState().forwardToThread([a.id, b.id], dst.id);
    expect(pairs.map((p) => p.originalId)).toEqual([a.id, b.id]);
    const copySeqs = await Promise.all(pairs.map(async (p) => (await getBlockById(p.copyId))!.seq));

    const result = await useBlocksStore.getState().moveForwarded({
      fromThreadId: src.id,
      toThreadId: dst.id,
      pairs,
      deleteIds: [dup.id],
    });
    expect(result).toEqual({ moved: 2, deleted: 1 });
    expect(await listBlocksByThread(src.id)).toHaveLength(0);
    const moved = await listBlocksByThread(dst.id);
    // The originals themselves, in the copies' slots — the copies are gone.
    expect(moved.map((x) => x.id)).toEqual([already.id, a.id, b.id]);
    expect(moved.slice(1).map((x) => x.seq)).toEqual(copySeqs);
    expect(moved[1]!.originalContent).toBe('alpha, before compression');
    expect((await getBlockById(cites.id))!.refBlockId).toBe(a.id);

    const entry = await useUndoStore.getState().undo();
    expect(entry?.kind).toBe('move');
    expect(await listBlocksByThread(src.id)).toEqual(before);
    expect((await listBlocksByThread(dst.id)).map((x) => x.id)).toEqual([already.id]);

    expect((await useUndoStore.getState().redo())?.kind).toBe('move');
    expect((await listBlocksByThread(dst.id)).map((x) => x.id)).toEqual([already.id, a.id, b.id]);
    expect(await listBlocksByThread(src.id)).toHaveLength(0);
  });

  // #n is MAX+1 per project, so a block captured after the move can take a moved block's old
  // number. ⌘Z must still bring everything back — on a fresh number — rather than fail.
  it('undo(move) survives a moved block\u2019s old number having been taken since', async () => {
    const ws = await createWorkspace('W');
    const src = await createThread(ws.id, 'Src');
    const dst = await createThread(ws.id, 'Dst');
    const a = await createBlock({ threadId: src.id, content: 'alpha one' });
    expect(a.seq).toBe(1);
    await useBlocksStore.getState().load(src.id);
    const pairs = await useBlocksStore.getState().forwardToThread([a.id], dst.id);
    await useBlocksStore.getState().moveForwarded({
      fromThreadId: src.id,
      toThreadId: dst.id,
      pairs,
      deleteIds: [],
    });
    const newcomer = await createBlock({ threadId: src.id, content: 'captured afterwards' });
    expect(newcomer.seq).toBe(1); // src is empty now, so #1 is handed out again

    expect((await useUndoStore.getState().undo())?.kind).toBe('move');
    const back = (await getBlockById(a.id))!;
    expect(back.threadId).toBe(src.id);
    expect(back.seq).toBe(2); // #1 is taken, so a comes back on a fresh number
    expect((await getBlockById(newcomer.id))!.seq).toBe(1);
  });
});
