import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useProposalsStore } from './proposalsStore';
import { useSettingsStore } from './settingsStore';
import { useThreadsStore } from './threadsStore';
import { useUndoStore } from './undoStore';
import { createAttachment } from '@/lib/db/attachments';
import { createBlock, setBlockSupersession, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import { addFollowUpItem } from '@/lib/db/followUpItems';
import schemaSql from '@/lib/db/schema.sql?raw';
import { __insertSplitProposalForTest } from '@/lib/db/splitProposals';
import { createThread, setThreadPrivate } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { draftFromProposal, separatedPairs, type SplitDraft } from '@/lib/split/projectSplit';
import * as undoLog from '@/lib/undo/undoLog';

// P9G-3 (Ocean 2026-10-16 第 127 – 130 条) —— 用户在待审卡上点「拆分」之后真的拆：
// 块是**移**过去的（id 不变、块号能留就留、挂在块上的文件和图片跟着走、别的项目对它的引用照样通），
// 项目文件和跟进行去卡上指定的地方，原项目留一块总览 + 每个子项目一个链接块；⌘Z 一下全部回去。
// ⚠️ 真 SQLite（`node:sqlite` + 真的 schema.sql）；断言的是库里最后长什么样。

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
type Sqlite = InstanceType<typeof DatabaseSync>;
type SqlValue = string | number | bigint | null | Uint8Array;
const toNumbered = (sql: string): string => sql.replace(/\$(\d+)/g, '?$1');
const makeAdapter = (handle: Sqlite): Database =>
  ({
    execute: async (sql: string, params: unknown[] = []) => {
      const r = handle.prepare(toNumbered(sql)).run(...(params as SqlValue[]));
      return { rowsAffected: Number(r.changes), lastInsertId: Number(r.lastInsertRowid) };
    },
    select: async (sql: string, params: unknown[] = []) => handle.prepare(toNumbered(sql)).all(...(params as SqlValue[])),
  }) as unknown as Database;

type Row = Record<string, unknown>;

describe('拆项目：待审卡上点「拆分」(P9G-3)', () => {
  let sqlite: Sqlite;
  let ws = '';
  let origin = '';
  let elsewhere = '';
  const b: Block[] = []; // b[1] … b[8] = #1 … #8 of 〈大项目〉
  let citing: Block; // in 〈别处〉, citing #3

  const all = (sql: string, ...p: SqlValue[]): Row[] => sqlite.prepare(sql).all(...p) as Row[];
  const one = (sql: string, ...p: SqlValue[]): Row | undefined => sqlite.prepare(sql).get(...p) as Row | undefined;
  const blockRows = () => all('SELECT id, thread_id, seq, created_at FROM blocks ORDER BY id');
  const threadRow = (title: string) => one('SELECT * FROM threads WHERE title = ? AND deleted_at IS NULL', title);
  const store = () => useProposalsStore.getState();

  const propose = (plan: unknown, id = 'sp1') =>
    __insertSplitProposalForTest({ id, threadId: origin, client: 'Claude · MCP', why: '太长了', plan });

  /** The card as it opens, with whatever the test changes on it. */
  const card = async (edit?: (d: SplitDraft) => void) => {
    await store().open();
    const item = (store().splitProposals ?? []).find((s) => s.proposal.id === 'sp1')!;
    expect(item, 'the card is on the review screen').toBeTruthy();
    const draft = draftFromProposal(item);
    edit?.(draft);
    return { item, draft };
  };

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    undoLog.clear();
    useSettingsStore.setState({ language: 'zh' });
    useUndoStore.setState({ entries: [], redoable: null });
    useProposalsStore.setState({ pendingCount: 0, panelOpen: false, busy: false, splitProposals: null });
    ws = (await createWorkspace('W')).id;
    origin = (await createThread(ws, '大项目')).id;
    elsewhere = (await createThread(ws, '别处')).id;
    // Already a project called 「调研」 in this workspace: a sub-project by that name takes 「 2」.
    await createThread(ws, '调研');
    b.length = 0;
    b.push(undefined as unknown as Block);
    for (let i = 1; i <= 8; i++) b.push(await createBlock({ threadId: origin, content: `第 ${i} 块的正文` }));
    // #5 corrects a sentence in #2; #7 replaced #6 (recorded on #6, v32 style).
    await setBlockSupersession(b[5]!.id, b[2]!.id, 'corrects', 1);
    sqlite.prepare("UPDATE blocks SET corrected_quote = '第 2 块' WHERE id = ?").run(b[5]!.id);
    sqlite.prepare('UPDATE blocks SET replaced_by_block_id = ?, stale_at = 1 WHERE id = ?').run(b[7]!.id, b[6]!.id);
    citing = await createBlock({ threadId: elsewhere, content: '引用第 3 块', refBlockId: b[3]!.id });
    // A file on #3, a picture in #3, two versions of a project file, a follow-up line.
    await createAttachment({ threadId: origin, kind: 'file', target: '/x/on-block.pdf', anchorBlockId: b[3]!.id });
    sqlite
      .prepare(
        `INSERT INTO block_images (id, block_id, position, bytes, format, width, height, size_bytes, created_at)
         VALUES ('img3', ?, 0, x'89504E47', 'png', 1, 1, 4, 1)`,
      )
      .run(b[3]!.id);
    const v2 = await createAttachment({ threadId: origin, kind: 'file', target: '/x/plan-v2.pdf' });
    const v1 = await createAttachment({ threadId: origin, kind: 'file', target: '/x/plan-v1.pdf' });
    sqlite.prepare('UPDATE attachments SET superseded_by = ?, superseded_at = 1 WHERE id = ?').run(v2.id, v1.id);
    await addFollowUpItem(origin, '场地押金退不退', false);
    await useThreadsStore.getState().loadAll();
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  const fileId = (target: string) => one('SELECT id FROM attachments WHERE target = ?', target)!.id as string;
  const followUpId = () => one('SELECT id FROM follow_up_items')!.id as string;
  const plan = () => ({
    groups: [
      { title: '调研', summary: '最早的调研。', block_ids: [b[1]!.id, b[2]!.id, b[3]!.id] },
      { title: '方案', summary: '后来的方案。', block_ids: [b[4]!.id, b[6]!.id, b[7]!.id] },
    ],
    files: [{ attachment_id: fileId('/x/plan-v2.pdf'), group: 1 }],
    follow_ups: [{ item_id: followUpId(), group: 0 }],
  });

  it('splits as the card says: blocks move with their ids, numbers, files and pictures; an overview stays behind', async () => {
    await propose(plan());
    const before = blockRows();
    const { draft } = await card();

    await store().approveSplit('sp1', draft);

    const research = threadRow('调研 2')!; // 「调研」 was taken in this workspace
    const plans = threadRow('方案')!;
    expect(research.workspace_id).toBe(ws);
    expect(plans.workspace_id).toBe(ws);
    expect([research.summary, research.summary_source]).toEqual(['最早的调研。', 'mcp']);
    expect([plans.summary, plans.summary_source]).toEqual(['后来的方案。', 'mcp']);
    expect([research.private, plans.private]).toEqual([0, 0]);
    // Moved, not copied: same id, same number, same time; only the project changed.
    const after = new Map(blockRows().map((r) => [r.id, r]));
    for (const r of before) {
      const now = after.get(r.id)!;
      expect(now, `${r.id} still exists`).toBeTruthy();
      expect([now.seq, now.created_at]).toEqual([r.seq, r.created_at]);
    }
    const where = (i: number) => after.get(b[i]!.id)!.thread_id;
    expect([1, 2, 3].map(where)).toEqual([research.id, research.id, research.id]);
    expect([4, 6, 7].map(where)).toEqual([plans.id, plans.id, plans.id]);
    expect([5, 8].map(where)).toEqual([origin, origin]); // in no group: they stay
    // What hangs on a moved block goes with it; a citation to it from elsewhere still lands.
    expect(one("SELECT thread_id FROM attachments WHERE target = '/x/on-block.pdf'")!.thread_id).toBe(research.id);
    expect(one("SELECT block_id FROM block_images WHERE id = 'img3'")!.block_id).toBe(b[3]!.id);
    expect(one('SELECT ref_block_id FROM blocks WHERE id = ?', citing.id)!.ref_block_id).toBe(b[3]!.id);
    // The project file went where the card said, its older version with it; the line too.
    expect(one("SELECT thread_id FROM attachments WHERE target = '/x/plan-v2.pdf'")!.thread_id).toBe(plans.id);
    expect(one("SELECT thread_id FROM attachments WHERE target = '/x/plan-v1.pdf'")!.thread_id).toBe(plans.id);
    expect(one('SELECT thread_id FROM follow_up_items')!.thread_id).toBe(research.id);
    // The overview, then one link per sub-project — in the original project, by Spool.
    const added = all(
      'SELECT kind, content, source, ref_thread_id FROM blocks WHERE thread_id = ? AND seq > 8 ORDER BY seq',
      origin,
    );
    expect(added).toHaveLength(3);
    expect(added[0]!.kind).toBe('text');
    expect(added[0]!.source).toBe('Spool');
    expect(added[0]!.content).toMatch(/^这个项目在 \d{4}-\d{2}-\d{2} 拆成了 2 个子项目：〈调研 2〉、〈方案〉$/);
    expect(added.slice(1).map((r) => [r.kind, r.content, r.ref_thread_id])).toEqual([
      ['ref', '调研 2', research.id],
      ['ref', '方案', plans.id],
    ]);
    // The card is gone, and so is the badge's count for it.
    expect(all('SELECT id FROM split_proposals')).toEqual([]);
    expect(store().pendingCount).toBe(0);
  });

  it('one ⌘Z puts everything back exactly as it was; redo splits it again', async () => {
    await propose(plan());
    const blocksBefore = blockRows();
    const filesBefore = all('SELECT id, thread_id, anchor_block_id FROM attachments ORDER BY id');
    const linesBefore = all('SELECT id, thread_id FROM follow_up_items ORDER BY id');
    const { draft } = await card();
    await store().approveSplit('sp1', draft);
    expect(useUndoStore.getState().entries.map((e) => e.kind)).toEqual(['split']);

    expect(await useUndoStore.getState().undo()).not.toBeNull();
    expect(blockRows()).toEqual(blocksBefore); // id, thread_id, seq, created_at — block by block
    expect(all('SELECT id, thread_id, anchor_block_id FROM attachments ORDER BY id')).toEqual(filesBefore);
    expect(all('SELECT id, thread_id FROM follow_up_items ORDER BY id')).toEqual(linesBefore);
    expect(threadRow('调研 2')).toBeUndefined();
    expect(threadRow('方案')).toBeUndefined();

    expect(await useUndoStore.getState().redo()).not.toBeNull();
    const research = threadRow('调研 2')!;
    expect(one('SELECT thread_id FROM blocks WHERE id = ?', b[1]!.id)!.thread_id).toBe(research.id);
    expect(all('SELECT id FROM blocks WHERE thread_id = ? AND seq > 8', origin)).toHaveLength(3);
    // …and undoable again.
    await useUndoStore.getState().undo();
    expect(blockRows()).toEqual(blocksBefore);
  });

  it('「不拆」 changes nothing but taking the card away', async () => {
    await propose(plan());
    const dump = () => ['threads', 'blocks', 'attachments', 'follow_up_items'].map((t) => all(`SELECT * FROM ${t} ORDER BY rowid`));
    const before = dump();
    await card();
    await store().rejectSplit('sp1');
    expect(dump()).toEqual(before);
    expect(all('SELECT id FROM split_proposals')).toEqual([]);
    expect(useUndoStore.getState().entries).toEqual([]);
  });

  it('what the user changed on the card is what happens', async () => {
    await propose(plan());
    const { draft } = await card((d) => {
      d.groups[1]!.title = '最终方案'; // renamed
      d.blocks[b[4]!.id] = 0; // #4 moved to the first group
      d.blocks[b[1]!.id] = null; // #1 stays
      d.blocks[b[8]!.id] = 1; // #8 added
      d.files[fileId('/x/plan-v2.pdf')] = null; // the file stays
      d.followUps[followUpId()] = 1;
    });
    await store().approveSplit('sp1', draft);
    const research = threadRow('调研 2')!;
    const final = threadRow('最终方案')!;
    expect(threadRow('方案')).toBeUndefined();
    const where = (i: number) => one('SELECT thread_id FROM blocks WHERE id = ?', b[i]!.id)!.thread_id;
    expect([1, 2, 3, 4, 6, 7, 8].map(where)).toEqual([origin, research.id, research.id, research.id, final.id, final.id, final.id]);
    expect(one("SELECT thread_id FROM attachments WHERE target = '/x/plan-v2.pdf'")!.thread_id).toBe(origin);
    expect(one('SELECT thread_id FROM follow_up_items')!.thread_id).toBe(final.id);
  });

  it('a group left with no blocks is not created, and what was sent to it stays', async () => {
    await propose(plan());
    const { draft } = await card((d) => {
      for (const id of [b[4]!.id, b[6]!.id, b[7]!.id]) d.blocks[id] = 0; // 「方案」 emptied
    });
    await store().approveSplit('sp1', draft);
    expect(threadRow('方案')).toBeUndefined();
    expect(threadRow('调研 2')).toBeTruthy();
    // The file had been sent to the emptied group: it stays in the original project.
    expect(one("SELECT thread_id FROM attachments WHERE target = '/x/plan-v2.pdf'")!.thread_id).toBe(origin);
    expect(one('SELECT content FROM blocks WHERE thread_id = ? AND seq = 9', origin)!.content).toMatch(/拆成了 1 个子项目：〈调研 2〉$/);
  });

  it('a block written into a sub-project after the split comes back with the undo — nothing is left unseen', async () => {
    await propose(plan());
    const { draft } = await card();
    await store().approveSplit('sp1', draft);
    const research = threadRow('调研 2')!;
    const late = await createBlock({ threadId: research.id as string, content: '拆完之后写的' });
    await useUndoStore.getState().undo();
    expect(one('SELECT thread_id FROM blocks WHERE id = ?', late.id)!.thread_id).toBe(origin);
  });

  it('a private project splits into private sub-projects', async () => {
    await setThreadPrivate(origin, true);
    await propose(plan());
    const { draft } = await card();
    await store().approveSplit('sp1', draft);
    expect([threadRow('调研 2')!.private, threadRow('方案')!.private]).toEqual([1, 1]);
  });

  it('blocks gone since the AI proposed are left out; new ones start out staying', async () => {
    await propose(plan());
    sqlite.prepare('DELETE FROM blocks WHERE id = ?').run(b[2]!.id);
    const fresh = await createBlock({ threadId: origin, content: '新来的' });
    const { item, draft } = await card();
    expect(item.blocks.map((x) => x.id)).not.toContain(b[2]!.id);
    expect(draft.blocks[b[2]!.id]).toBeUndefined();
    expect(draft.blocks[fresh.id]).toBeNull();
  });

  it('names the pairs a grouping would separate', async () => {
    await propose(plan());
    const { item, draft } = await card();
    // As proposed: #5 (stays) corrects #2 (调研); #7 and #6 are both in 方案.
    expect(separatedPairs(item.blocks, draft).map((p) => [p.kind, p.block.seq, p.pointsAt.seq])).toEqual([
      ['corrects', 5, 2],
    ]);
    draft.blocks[b[5]!.id] = 0;
    draft.blocks[b[7]!.id] = null;
    expect(separatedPairs(item.blocks, draft).map((p) => [p.kind, p.block.seq, p.pointsAt.seq])).toEqual([
      ['replaces', 7, 6],
    ]);
  });
});
