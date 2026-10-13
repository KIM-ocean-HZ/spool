import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useCompressStore, type CompressSession } from './compressStore';
import { useToastStore } from './toastStore';
import type { CompressOutcome } from '@/lib/ai/compress';
import { createBlock, listBlocksByThread, type Block } from '@/lib/db/blocks';
import { __setTestDb } from '@/lib/db/client';
import schemaSql from '@/lib/db/schema.sql?raw';
import { createThread } from '@/lib/db/threads';
import { createWorkspace } from '@/lib/db/workspaces';
import { assemble } from '@/lib/pack/assemble';

// P9F F2（DISCOVERED-20261003-1）：项目没有文件时，pack 里最后一块后面紧跟着 pack 自己的那行
// `---`（「Output Language」前面那条分隔线），切条目时它算进了最后一块 ⇒「用这一份」把它写进了
// 那一块的正文（真库〈申请帮助〉#13）。⚠️ 写回走真库（`node:sqlite` + 真的 `schema.sql`）。

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

describe('P9F F2 · 压缩写回不把 pack 的 `---` 带进最后一块', () => {
  let sqlite: Sqlite;

  /** 建一个没有文件的项目，压一遍（只把每块的长句换成短句），「用这一份」，返回写进库的正文。 */
  const compressAndUse = async (contents: [string, string][]): Promise<string[]> => {
    const ws = await createWorkspace('W');
    const thread = await createThread(ws.id, '申请帮助');
    for (const [long] of contents) await createBlock({ threadId: thread.id, content: long });
    const blocks: Block[] = await listBlocksByThread(thread.id);
    const source = assemble({ thread, blocks, instructions: true, outputLanguage: 'en' });
    let compressed = source;
    for (const [long, short] of contents) compressed = compressed.replace(long, short);
    useToastStore.setState({ toasts: [] });
    useCompressStore.setState({
      running: false,
      sessions: {
        [thread.id]: { source, blocks, outcome: ok(compressed.trimEnd()), patched: null } as unknown as CompressSession,
      },
    });
    await useCompressStore.getState().useDraft(thread.id);
    return (await listBlocksByThread(thread.id)).map((b) => b.content);
  };

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(schemaSql);
    __setTestDb(makeAdapter(sqlite));
  });
  afterEach(() => {
    __setTestDb(null);
    sqlite.close();
  });

  it('最后一块写回的正文末尾没有 `---`；没有「Spool 自己印的说明」那一句', async () => {
    const written = await compressAndUse([
      [LONG_A, SHORT_A],
      [LONG_B, SHORT_B],
    ]);
    expect(written).toEqual([SHORT_A, SHORT_B]);
    // 只有「换成了压缩稿」那一句：这一行不是模型发明的，⛔ 不许每压一次就冒一句。
    expect(useToastStore.getState().toasts.map((t) => t.kind)).toEqual(['notice']);
  });

  it('⛔ 块正文本来就有的 `---` 照样留着 —— 中间的，和最后一块自己末尾的', async () => {
    const written = await compressAndUse([
      [`${LONG_A}\n\n---\n\nA closing line for the first block.`, `${SHORT_A}\n\n---\n\nA closing line for the first block.`],
      [`${LONG_B}\n\n---`, `${SHORT_B}\n\n---`],
    ]);
    expect(written).toEqual([
      `${SHORT_A}\n\n---\n\nA closing line for the first block.`,
      `${SHORT_B}\n\n---`,
    ]);
  });
});
