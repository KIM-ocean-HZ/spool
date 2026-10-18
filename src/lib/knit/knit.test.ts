import { describe, expect, it } from 'vitest';
import {
  canRedeem,
  cleanRedemptions,
  KNIT_ITEMS,
  knitState,
  PATCH_STITCHES,
  redeem,
  stitchesByDay,
  stitchesOn,
  type Redemption,
} from './knit';

describe('knit rules (织布)', () => {
  it('one patch is 35 stitches; every stitch counts and the rest goes onto the next patch', () => {
    expect(PATCH_STITCHES).toBe(35);
    const k = knitState(35 * 4 + 12, []);
    expect(k).toMatchObject({ made: 4, spent: 0, inStock: 4, onPatch: 12 });
    expect(knitState(0, []).next?.id).toBe('coaster');
  });

  it('the ladder only goes up, one item at a time', () => {
    const costs = KNIT_ITEMS.map((i) => i.cost);
    for (let i = 1; i < costs.length; i++) expect(costs[i]).toBeGreaterThan(costs[i - 1]!);
    expect(new Set(KNIT_ITEMS.map((i) => i.id)).size).toBe(KNIT_ITEMS.length);
  });

  it('can only knit the next item, and only with enough patches in hand', () => {
    let list: Redemption[] = [];
    let k = knitState(35 * 3, list);
    expect(canRedeem(k, 'scarf')).toBe('locked');
    expect(canRedeem(k, 'coaster')).toBe('ok');
    list = redeem(k, list, 'coaster', 1000);
    k = knitState(35 * 3, list);
    expect(k).toMatchObject({ spent: 1, inStock: 2 });
    expect(canRedeem(k, 'coaster')).toBe('owned');
    expect(canRedeem(k, 'scarf')).toBe('short'); // takes 3, 2 in hand
    expect(redeem(k, list, 'scarf', 2000)).toEqual(list); // refused: nothing changes
    k = knitState(35 * 4, list);
    expect(canRedeem(k, 'scarf')).toBe('ok');
    list = redeem(k, list, 'scarf', 2000);
    expect(list).toEqual([
      { item: 'coaster', at: 1000, cost: 1 },
      { item: 'scarf', at: 2000, cost: 3 },
    ]);
    expect(knitState(35 * 4, list)).toMatchObject({ inStock: 0, next: { id: 'beanie' } });
  });

  it('deleting blocks never takes back what was already knitted (in hand floors at 0)', () => {
    const list: Redemption[] = [{ item: 'coaster', at: 1, cost: 1 }];
    const k = knitState(10, list);
    expect(k).toMatchObject({ made: 0, inStock: 0, owned: { coaster: 1 } });
    expect(k.next?.id).toBe('scarf');
  });

  it('with everything knitted there is no next item', () => {
    const list = KNIT_ITEMS.map((i, n) => ({ item: i.id, at: n, cost: i.cost }));
    const k = knitState(35 * 200, list);
    expect(k.next).toBeNull();
    expect(canRedeem(k, 'blanket')).toBe('owned');
  });

  it('cleanRedemptions drops anything it does not recognise', () => {
    expect(cleanRedemptions(null)).toEqual([]);
    expect(cleanRedemptions({ item: 'scarf' })).toEqual([]);
    expect(
      cleanRedemptions([
        { item: 'coaster', at: 5, cost: 1 },
        { item: 'teapot', at: 6, cost: 2 }, // from a newer version, or junk
        { item: 'scarf', at: 'x', cost: 3 },
        { item: 'scarf', at: Infinity, cost: 3 },
        { item: 'scarf', at: 7, cost: -1 },
        null,
      ]),
    ).toEqual([{ item: 'coaster', at: 5, cost: 1 }]);
  });

  it('counts stitches by local day', () => {
    const monday = new Date(2026, 9, 12, 0, 0, 0, 0).getTime();
    const at = (day: number, h: number) => new Date(2026, 9, 12 + day, h).getTime();
    const times = [at(0, 9), at(0, 23), at(2, 0), at(6, 22), at(7, 1)];
    expect(stitchesOn(times, at(0, 12))).toBe(2);
    expect(stitchesByDay(times, monday)).toEqual([2, 0, 1, 0, 0, 0, 1]);
  });
});
