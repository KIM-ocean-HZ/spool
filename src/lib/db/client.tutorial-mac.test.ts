import { createRequire } from 'node:module';
import type Database from '@tauri-apps/plugin-sql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __seedTutorialThreadForTest, __setTestDb, retranslateTutorial } from './client';
import schemaSql from './schema.sql?raw';

// The capture block is the one guide block that differs per platform (`offMac`), and node has no
// Mac user agent — so the macOS wording is only reachable with the platform module mocked.
vi.mock('@/lib/platform', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/platform')>()),
  IS_MAC: true,
}));

const { DatabaseSync } = createRequire(import.meta.url)(
  'node:sqlite',
) as typeof import('node:sqlite');
type Sqlite = InstanceType<typeof DatabaseSync>;
type SqlValue = string | number | bigint | null | Uint8Array;
const toNumbered = (sql: string): string => sql.replace(/\$(\d+)/g, '?$1');

describe('retranslateTutorial on macOS', () => {
  let handle: Sqlite;
  let db: Database;

  beforeEach(() => {
    handle = new DatabaseSync(':memory:');
    db = {
      execute: async (sql: string, params: unknown[] = []) => {
        const r = handle.prepare(toNumbered(sql)).run(...(params as SqlValue[]));
        return { rowsAffected: Number(r.changes), lastInsertId: Number(r.lastInsertRowid) };
      },
      select: async (sql: string, params: unknown[] = []) =>
        handle.prepare(toNumbered(sql)).all(...(params as SqlValue[])),
    } as unknown as Database;
    __setTestDb(db);
    handle.exec(schemaSql.replace(/--.*$/gm, ''));
    handle.exec(`
      INSERT INTO workspaces (id, title, sort_order, created_at, updated_at)
        VALUES ('w1', 'Inbox', 0, 1, 1);
    `);
  });

  afterEach(() => {
    __setTestDb(null);
    handle.close();
  });

  it('seeds the capture block naming the banner buttons that exist', async () => {
    await __seedTutorialThreadForTest(db, 'zh');
    const { content } = handle
      .prepare("SELECT content FROM blocks WHERE content LIKE '捕捉：%'")
      .get() as { content: string };
    expect(content).toContain('打开「输入监控」和「辅助功能」');
    expect(content).toContain('「重启 Spool」');
    expect(content).not.toContain('打开捕捉');
    expect(content).not.toContain('输入监听');
  });

  // v0.8.2 (DISCOVERED-20261112-1) reworded the capture block: the banner never had a
  // "Turn on capture" button. Libraries seeded before that keep the old text and must still switch.
  it('still switches a tutorial seeded with the capture wording before v0.8.2', async () => {
    await __seedTutorialThreadForTest(db, 'zh');
    handle.exec(`
      UPDATE blocks SET content = '捕捉：在任何应用选中文字按 ⌘C，再快速双击 ⌥（Option）——内容自动落进「捕捉目标」项目。这一步需要「输入监听」权限：点顶部横幅的「打开捕捉」开启，授权后完全退出 Spool 再打开。'
        WHERE content LIKE '捕捉：%';
    `);

    expect(await retranslateTutorial('zh', 'en')).toBe(true);

    const titles = (handle.prepare('SELECT title FROM threads').all() as { title: string }[]).map(
      (t) => t.title,
    );
    expect(titles).toContain('Welcome to Spool');
    const { content } = handle
      .prepare("SELECT content FROM blocks WHERE content LIKE 'Capture:%'")
      .get() as { content: string };
    expect(content).toContain('"Open Input Monitoring" and "Open Accessibility"');
    expect(content).not.toContain('Turn on capture');
  });
});
