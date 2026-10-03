import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useCompressStore, type CompressSession } from './compressStore';
import { useToastStore } from './toastStore';
import { auditCompression, auditHasLosses, diffLines, type CompressOutcome } from '@/lib/ai/compress';
import { compareByEntry } from '@/lib/ai/compressBlocks';
import { shieldPack, unshieldPack } from '@/lib/ai/shield';
import { createBlock, listBlocksByThread, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { assemble } from '@/lib/pack/assemble';
import { PACK_BEGIN, PACK_END } from '@/lib/pack/templates';

// P4-3（DISCOVERED-20260829-11）：压缩稿保住 pack 的首尾两行。
//
// 补回来是 Rust 那一侧做的（`mcp.rs::keep_pack_boundaries`，紧挨切 `⟦CUTS⟧`，单测在那边）。
// 这里钉的是它前后两头：
//   ① 送出去的那一份（摘过批注的）首尾两行还在 —— Rust 才认得出原 pack 有这两行；
//   ② 补好的那一份回到前端：放回批注、核对面、写回库，三处都不因为多了这两行出岔子。
//      ⛔ 两行只在整份压缩稿上，⛔ 不许进任何一块的正文。
//
// ⚠️ 写回库走真库（`node:sqlite` + 真的 `schema.sql`）。

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

// ⚠️ 正文里不放数字：数字闸门管的是另一件事，别让它替这条测试挡掉写回。
const LONG_A =
  'The first school wants the transcript sent directly. The registrar takes a couple of weeks, so the request should go out early.';
const SHORT_A = 'The first school wants the transcript sent directly.';
const LONG_B =
  'The second school accepts a scanned copy. The upload form sits on the applicant portal and takes a single PDF.';
const SHORT_B = 'The second school accepts a scanned copy.';

const ok = (text: string): CompressOutcome => ({
  ok: true, text, cuts: null, kind: null, message: null, status: 200, inputTokens: 1,
  outputTokens: 1, cachedInputTokens: null, reasoningTokens: null, ms: 1, model: 'test',
});
const nonEmpty = (text: string) => text.split('\n').filter((l) => l.trim() !== '');

describe('P4-3 · 压缩稿保住 pack 的首尾两行', () => {
  let sqlite: Sqlite;
  let threadId = '';
  let blocks: Block[] = [];
  /** 产品渲染器组的那一份原文。 */
  let source = '';
  /** 模型压完、Rust 补好首尾两行之后的样子（`keep_pack_boundaries` 的契约：照渲染器的空行补，
   *  末尾不带换行 —— `split_cuts` 本来就 trim 过）。 */
  let compressed = '';
  /** 模型交回来的样子：首尾两行都丢了（08-29 那 8 份都是这样）。 */
  let modelOut = '';

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
    const ws = await createWorkspace('W');
    const thread = await createThread(ws.id, '申请规划');
    threadId = thread.id;
    await createBlock({ threadId, content: LONG_A, source: 'https://example.com/a' });
    // ⚠️ 最后一块带批注：放回批注时它落在这一块的末尾 —— ⛔ 不能跑到 END 那一行后面去。
    await createBlock({ threadId, content: LONG_B, source: 'https://example.com/b', annotation: 'ask about this' });
    blocks = await listBlocksByThread(threadId);
    source = assemble({ thread, blocks, instructions: true, outputLanguage: 'en' });
    compressed = source.replace(LONG_A, SHORT_A).replace(LONG_B, SHORT_B).trimEnd();
    modelOut = compressed.split('\n').slice(2, -2).join('\n');
    // 前提：拼出来的确实是「首尾两行都丢了」的样子，补回去正好等于 `compressed`。
    expect(modelOut).not.toContain('SPOOL CONTEXT PACK');
    expect(`${PACK_BEGIN}\n\n${modelOut}\n\n${PACK_END}`).toBe(compressed);
  });
  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('① 送出去的那一份（摘过批注、换过高亮）首尾两行还在原位 —— Rust 认得出该补', () => {
    const sent = nonEmpty(shieldPack(source).text);
    expect(sent[0]).toBe(PACK_BEGIN);
    expect(sent[sent.length - 1]).toBe(PACK_END);
  });

  it('② 补好的那一份放回批注之后一字不差，最后一块的批注在 END 前面', () => {
    const back = unshieldPack(shieldPack(compressed).text, shieldPack(source).held);
    expect(back.orphaned).toEqual([]);
    expect(back.text).toBe(compressed);
    expect(nonEmpty(back.text).slice(-1)[0]).toBe(PACK_END);
  });

  it('② 核对面不因为这两行多报、少报什么；整份对照里两行是「没动」，⛔ 不再报成「删掉了」', () => {
    const withLines = auditCompression(source, compressed);
    const without = auditCompression(source, modelOut);
    expect(auditHasLosses(withLines)).toBe(false);
    // 除了字数（压缩稿里确实多了这两行），每一条核对都和没补之前一样。
    expect({ ...withLines, charsAfter: 0 }).toEqual({ ...without, charsAfter: 0 });

    const byEntry = compareByEntry(source, compressed)!;
    expect(byEntry).toEqual(compareByEntry(source, modelOut));
    expect([byEntry.dropped, byEntry.invented, byEntry.duplicated]).toEqual([0, 0, []]);

    const opsFor = (text: string) =>
      diffLines(source, text)
        .filter((l) => l.text === PACK_BEGIN || l.text === PACK_END)
        .map((l) => l.op);
    expect(opsFor(compressed)).toEqual(['same', 'same']);
    expect(opsFor(modelOut)).toEqual(['cut', 'cut']);
  });

  // ⚠️ 比的是「补没补这两行」两次写进去的字一不一样，⛔ 不直接写死最后一块的期望值：
  // 最后一块写回时会多带一行 `---`（压缩前就有的另一件事，DISCOVERED-20261003-1，和这两行无关）。
  it('② 「用这一份」写回库：补没补这两行，写进每一块的字一模一样 —— 两行一个字都不进块', async () => {
    const writeBack = async (text: string): Promise<string[]> => {
      for (const b of blocks) {
        sqlite.prepare('UPDATE blocks SET content = ?, original_content = NULL WHERE id = ?').run(b.content, b.id);
      }
      useToastStore.setState({ toasts: [] });
      useCompressStore.setState({
        running: false,
        sessions: {
          [threadId]: { source, blocks, outcome: ok(text), patched: null } as unknown as CompressSession,
        },
      });
      await useCompressStore.getState().useDraft(threadId);
      return (await listBlocksByThread(threadId)).map((b) => b.content);
    };

    const without = await writeBack(modelOut);
    const withLines = await writeBack(compressed);

    expect(withLines).toEqual(without);
    expect(withLines[0]).toBe(SHORT_A);
    expect(withLines[1]!.startsWith(SHORT_B)).toBe(true);
    expect(withLines.join('\n')).not.toContain('SPOOL CONTEXT PACK');
    // 只有「换成了压缩稿」那一句 —— ⛔ 没有「有几行是 Spool 自己印的说明、没写进库」那一句：
    // 补回来的两行在块外面，压根没走到剔骨架那一步。
    expect(useToastStore.getState().toasts.map((t) => t.kind)).toEqual(['notice']);
  });
});
