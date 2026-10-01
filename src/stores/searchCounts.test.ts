import { beforeEach, describe, expect, it } from 'vitest';
import type { Block } from '@/lib/db/blocks';
import { buildHitOffsets, type BlockHit } from '@/lib/search/query';
import { useBlocksStore } from './blocksStore';
import { findPosition, useSearchStore } from './searchStore';
import { useThreadsStore } from './threadsStore';

// P1B A3 (HANDOFF §9.1 #4, Ocean: 「进入项目后的查找……应该显示单个项目范围内的查找，不应该有
// 块内查找这个功能」). The find bar finds in the open project: one count, 「本项目 第 i / N 处」,
// and ↵ walks every match of the project in timeline order — never into another project.

const hit = (blockId: string, hits: number): BlockHit => ({
  blockId,
  threadId: 't1',
  field: 'content',
  snippet: [],
  hitOffsets: Array.from({ length: hits }, (_, i) => ({
    field: 'content' as const,
    start: i,
    end: i + 1,
  })),
});

describe('findPosition', () => {
  it('counts 处 across every block of the project, not just the one the find is on', () => {
    expect(findPosition([hit('b1', 2), hit('b2', 3)], 'b2', 1)).toEqual({ i: 4, n: 5 });
    expect(findPosition([hit('b1', 2), hit('b2', 3)], 'b1', 0)).toEqual({ i: 1, n: 5 });
  });

  it('is 0 of 0 when nothing matches', () => {
    expect(findPosition([], 'b1', 0)).toEqual({ i: 0, n: 0 });
  });
});

const block = (id: string, threadId: string, content: string, annotation: string | null = null) =>
  ({ id, threadId, content, annotation }) as Block;

describe('stepping through the project (searchStore)', () => {
  // Timeline order is the order the feed holds them in: b1, b2, b3. b2 has no match.
  const t1 = [
    block('b1', 't1', 'apple and apple'),
    block('b2', 't1', 'nothing here'),
    block('b3', 't1', 'one apple', 'apple note'),
  ];
  const other = [block('x1', 't2', 'apple elsewhere')];
  const at = (): [string | null, number] => {
    const s = useSearchStore.getState();
    return [s.activeNavigationBlockId, s.activeHitIndex];
  };

  beforeEach(() => {
    useBlocksStore.setState({ byThread: { t1, t2: other } });
    useThreadsStore.setState({ activeId: 't1' });
    // As a search result lands: on b1, with b1's own offsets for the query.
    useSearchStore
      .getState()
      .startNavigation('b1', buildHitOffsets(t1[0]!.content, null, 'apple'), 'apple');
  });

  it('walks every match in timeline order and wraps from the last back to the first', () => {
    const { nextHit } = useSearchStore.getState();
    const seen: [string | null, number][] = [at()];
    for (let k = 0; k < 4; k++) {
      nextHit();
      seen.push(at());
    }
    expect(seen).toEqual([
      ['b1', 0],
      ['b1', 1],
      ['b3', 0], // b2 has no match — skipped
      ['b3', 1], // the annotation's match comes after the content's
      ['b1', 0], // wrapped; ⛔ never x1, which is in another project
    ]);
  });

  it('goes backwards the same way, landing on a block’s last match', () => {
    const { prevHit } = useSearchStore.getState();
    prevHit();
    expect(at()).toEqual(['b3', 1]);
    prevHit();
    expect(at()).toEqual(['b3', 0]);
    prevHit();
    expect(at()).toEqual(['b1', 1]);
  });

  it('re-finds over the whole project when the word changes, not just this block', () => {
    useSearchStore.getState().setNavigationQuery('note');
    expect(at()).toEqual(['b3', 0]);
    expect(useSearchStore.getState().activeHits).toEqual(
      buildHitOffsets(t1[2]!.content, t1[2]!.annotation, 'note'),
    );
  });

  it('stays on the block it is on while that block still matches the new word', () => {
    useSearchStore.getState().setNavigationQuery('and');
    expect(at()).toEqual(['b1', 0]);
  });

  it('keeps the bar open with nothing to step to when the project has no match', () => {
    useSearchStore.getState().setNavigationQuery('elsewhere');
    expect(at()).toEqual(['b1', 0]);
    expect(useSearchStore.getState().activeHits).toEqual([]);
    useSearchStore.getState().nextHit();
    expect(at()).toEqual(['b1', 0]);
  });

  it('never jumps out to a block while another project is open', () => {
    useThreadsStore.setState({ activeId: 't2' });
    useSearchStore.getState().nextHit();
    useSearchStore.getState().nextHit();
    expect(at()).toEqual(['b1', 1]); // the in-block step still moves; the jump out does not
  });
});
