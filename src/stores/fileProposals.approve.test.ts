import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAttachment, type Attachment } from '@/lib/db/attachments';
import { createBlock, deleteBlock, moveBlock, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import { __insertFileProposalForTest, listPendingFileProposals } from '@/lib/db/fileProposals';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread, softDeleteThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { __setFileExistsForTest } from '@/lib/files/fileProposals';
import { t } from '@/lib/i18n';
import { useBlocksStore } from './blocksStore';
import { useProposalsStore } from './proposalsStore';
import { useSettingsStore } from './settingsStore';
import { useToastStore } from './toastStore';

// P6-3 (Ocean 2026-09-30 §9.2 第 7、10 条 + 10-06 第 32、34 条) — the click on an AI's file
// proposal. ⚠️ Real SQLite (`node:sqlite` + the real schema.sql), same as the P5 tests: what
// is pinned here is what lands in the table.

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

const CLIENT = 'Claude Code · MCP';

describe('AI 提的文件：点头才挂 (P6-3)', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let b1: Block;
  let b2: Block;
  let present: Set<string>;

  const proposals = () => sqlite.prepare('SELECT id FROM file_proposals ORDER BY id').all();
  const fileRow = (target: string) =>
    sqlite
      .prepare(
        `SELECT thread_id, anchor_block_id, added_by, ai_access, include_in_pack, superseded_by
           FROM attachments WHERE target = ?`,
      )
      .get(target);
  const attachmentCount = () =>
    (sqlite.prepare('SELECT COUNT(*) AS c FROM attachments').get() as { c: number }).c;
  const propose = (
    id: string,
    path: string,
    extra: { anchorBlockId?: string; supersedesId?: string; expiresAt?: number } = {},
  ) =>
    __insertFileProposalForTest({
      id,
      kind: extra.supersedesId ? 'supersede' : 'attach',
      client: CLIENT,
      threadId,
      path,
      sizeBytes: 2048,
      why: '甲方要的',
      ...extra,
    });

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    useSettingsStore.setState({ autoExtractAttachments: false });
    present = new Set(['/Users/a/合同.pdf', '/Users/a/合同-v2.pdf', '/Users/a/旧.pdf']);
    __setFileExistsForTest(async (p) => present.has(p));
    const ws = await createWorkspace('W');
    threadId = (await createThread(ws.id, '合同')).id;
    b1 = await createBlock({ threadId, content: '第一块' });
    b2 = await createBlock({ threadId, content: '第二块' });
    useBlocksStore.setState({ byThread: {}, attachmentsByThread: {} });
    useProposalsStore.setState({ panelOpen: false, busy: false, pendingCount: 0 });
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('点头 · 挂文件：挂在提议的那一块、记着是哪个 AI、AI 可读、打包照旧不带；排队那一行没了', async () => {
    await propose('p1', '/Users/a/合同.pdf', { anchorBlockId: b1.id });

    await useProposalsStore.getState().approveFileProposal('p1');

    expect(fileRow('/Users/a/合同.pdf')).toEqual({
      thread_id: threadId,
      anchor_block_id: b1.id,
      added_by: CLIENT,
      ai_access: 1,
      include_in_pack: 0,
      superseded_by: null,
    });
    expect(proposals()).toEqual([]);
    // 右栏读的就是这一份 —— 点头之后它自己就在。
    expect(useBlocksStore.getState().attachmentsByThread[threadId]!.map((a) => a.target)).toEqual([
      '/Users/a/合同.pdf',
    ]);
  });

  it('点头 · 取代：新文件挂在旧文件挂着的地方；旧文件还在、两列写上、它的 AI 可读不动', async () => {
    const old: Attachment = await createAttachment({
      threadId,
      kind: 'file',
      target: '/Users/a/旧.pdf',
      label: '旧.pdf',
      anchorBlockId: b2.id,
    });
    sqlite.prepare('UPDATE attachments SET ai_access = 0 WHERE id = ?').run(old.id);
    await propose('p2', '/Users/a/合同-v2.pdf', { supersedesId: old.id });
    expect((await listPendingFileProposals(Date.now()))[0]!.supersedesLabel).toBe('旧.pdf');

    await useProposalsStore.getState().approveFileProposal('p2');

    const fresh = sqlite.prepare('SELECT id FROM attachments WHERE target = ?').get('/Users/a/合同-v2.pdf') as {
      id: string;
    };
    expect(fileRow('/Users/a/合同-v2.pdf')).toMatchObject({
      anchor_block_id: b2.id,
      added_by: CLIENT,
      ai_access: 1,
      superseded_by: null,
    });
    const oldNow = sqlite
      .prepare('SELECT superseded_by, superseded_at, ai_access, anchor_block_id FROM attachments WHERE id = ?')
      .get(old.id) as { superseded_by: string; superseded_at: number; ai_access: number; anchor_block_id: string };
    expect(oldNow.superseded_by).toBe(fresh.id);
    expect(oldNow.superseded_at).toBeGreaterThan(0);
    expect(oldNow.ai_access).toBe(0);
    expect(oldNow.anchor_block_id).toBe(b2.id);
    expect(proposals()).toEqual([]);
  });

  it('不同意：那一行删掉，什么都不留、什么都不挂', async () => {
    await propose('p3', '/Users/a/合同.pdf');

    await useProposalsStore.getState().rejectFileProposal('p3');

    expect(proposals()).toEqual([]);
    expect(attachmentCount()).toBe(0);
  });

  it('点头时那一块已经删了 ⇒ 卡片说一句，点头挂在项目上', async () => {
    await propose('p4', '/Users/a/合同.pdf', { anchorBlockId: b1.id });
    await deleteBlock(b1.id);
    const [card] = await listPendingFileProposals(Date.now());
    expect(card!.anchorBlockId).toBe(b1.id);
    expect(card!.anchorSeq).toBeNull();

    await useProposalsStore.getState().approveFileProposal('p4');

    expect(fileRow('/Users/a/合同.pdf')).toMatchObject({ anchor_block_id: null, added_by: CLIENT });
  });

  // P9H-3（DISCOVERED-20261016-4）：那一块被拆分 / 「移到…」挪到别的项目了（id 不变）。原来按
  // 「这个项目里的这一块」去找，找不到就当成删了，挂到提议的那个项目上。
  it('点头时那一块已经挪到别的项目了 ⇒ 卡片说挂到哪个项目第几块，点头挂在那一块上', async () => {
    await propose('p7', '/Users/a/合同.pdf', { anchorBlockId: b2.id });
    const other = await createThread((await createWorkspace('W2')).id, '合同 · 第二期');
    await createBlock({ threadId: other.id, content: '那边原来的' });
    await moveBlock(b2.id, other.id, 2, b2.createdAt);
    const [card] = await listPendingFileProposals(Date.now());
    expect(card).toMatchObject({ anchorBlockId: b2.id, anchorSeq: 2, anchorThreadId: other.id, anchorThreadTitle: '合同 · 第二期' });

    await useProposalsStore.getState().approveFileProposal('p7');

    expect(fileRow('/Users/a/合同.pdf')).toMatchObject({ thread_id: other.id, anchor_block_id: b2.id, added_by: CLIENT });
    expect(proposals()).toEqual([]);
    expect(useToastStore.getState().toasts.map((x) => x.message)).toEqual([
      t('挂上了「{name}」，在〈{title}〉里 —— 那一块挪到那儿了。', { name: '合同.pdf', title: '合同 · 第二期' }),
    ]);
  });

  it('挪去的那个项目删了 ⇒ 算那一块没了，挂在提议的项目上', async () => {
    await propose('p8', '/Users/a/合同.pdf', { anchorBlockId: b2.id });
    const other = await createThread((await createWorkspace('W2')).id, '已删');
    await moveBlock(b2.id, other.id, 1, b2.createdAt);
    await softDeleteThread(other.id);
    const [card] = await listPendingFileProposals(Date.now());
    expect(card).toMatchObject({ anchorSeq: null, anchorThreadId: null });

    await useProposalsStore.getState().approveFileProposal('p8');

    expect(fileRow('/Users/a/合同.pdf')).toMatchObject({ thread_id: threadId, anchor_block_id: null });
  });

  it('点头时文件已经不在那儿了 ⇒ 什么都不挂，卡片留着（外接盘插回来还能点）', async () => {
    await propose('p5', '/Users/a/不见了.pdf');

    await useProposalsStore.getState().approveFileProposal('p5');

    expect(attachmentCount()).toBe(0);
    expect(proposals()).toEqual([{ id: 'p5' }]);
  });

  it('点头时这个路径已经在项目里了 ⇒ 不重复挂，卡片清掉', async () => {
    await createAttachment({ threadId, kind: 'file', target: '/Users/a/合同.pdf', label: '合同.pdf' });
    await propose('p6', '/Users/a/合同.pdf');

    await useProposalsStore.getState().approveFileProposal('p6');

    expect(attachmentCount()).toBe(1);
    expect(proposals()).toEqual([]);
  });

  it('待审数算上它；旧文件已经没了的取代提议不算；过期的不算、清掉', async () => {
    const gone = await createAttachment({ threadId, kind: 'file', target: '/Users/a/旧.pdf', label: '旧.pdf' });
    await propose('live', '/Users/a/合同.pdf');
    await propose('orphan', '/Users/a/合同-v2.pdf', { supersedesId: gone.id });
    sqlite.prepare('DELETE FROM attachments WHERE id = ?').run(gone.id);
    await propose('old', '/Users/a/旧.pdf', { expiresAt: Date.now() - 1 });

    await useProposalsStore.getState().refresh();
    expect(useProposalsStore.getState().pendingCount).toBe(1);
    expect((await listPendingFileProposals(Date.now())).map((p) => p.id)).toEqual(['live']);

    await useProposalsStore.getState().clearExpired();
    expect(sqlite.prepare("SELECT COUNT(*) AS c FROM file_proposals WHERE id = 'old'").get()).toEqual({ c: 0 });
  });
});
