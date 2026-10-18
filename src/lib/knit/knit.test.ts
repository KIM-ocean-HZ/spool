import { describe, expect, it } from 'vitest';
import {
  canRedeem,
  cleanRedemptions,
  KNIT_ITEMS,
  KNIT_TIERS,
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
    expect(knitState(0, []).next?.id).toBe('dishcloth');
  });

  it('four shelves by difficulty, at least three; the price never goes down, shelf to shelf it goes up', () => {
    expect(KNIT_TIERS.length).toBeGreaterThanOrEqual(3);
    const ids = KNIT_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < KNIT_ITEMS.length; i++) {
      expect(KNIT_ITEMS[i]!.cost).toBeGreaterThanOrEqual(KNIT_ITEMS[i - 1]!.cost);
      expect(KNIT_ITEMS[i]!.tier).toBeGreaterThanOrEqual(KNIT_ITEMS[i - 1]!.tier);
    }
    const total = (tier: number) => KNIT_ITEMS.filter((i) => i.tier === tier).reduce((n, i) => n + i.cost, 0);
    for (let tier = 2; tier <= KNIT_TIERS.length; tier++) expect(total(tier)).toBeGreaterThan(total(tier - 1));
  });

  it('the seven ids of the first version are still there — what was knitted with them stays knitted', () => {
    for (const id of ['coaster', 'scarf', 'beanie', 'mittens', 'plush', 'sweater', 'blanket']) {
      expect(KNIT_ITEMS.some((i) => i.id === id)).toBe(true);
    }
    // Ocean's knit.json from the night of 10-17: four things, 17 patches
    const v1 = cleanRedemptions([
      { item: 'coaster', at: 1, cost: 1 },
      { item: 'scarf', at: 2, cost: 3 },
      { item: 'beanie', at: 3, cost: 5 },
      { item: 'mittens', at: 4, cost: 8 },
    ]);
    const k = knitState(814, v1);
    expect(v1).toHaveLength(4);
    expect(k).toMatchObject({ made: 23, spent: 17, inStock: 6 });
    expect(Object.keys(k.owned).sort()).toEqual(['beanie', 'coaster', 'mittens', 'scarf']);
    // the next one is the first in order not yet made, wherever the old ones now sit
    expect(k.next?.id).toBe('dishcloth');
    expect(canRedeem(k, 'mittens')).toBe('owned');
  });

  it('can only knit the next item, and only with enough patches in hand', () => {
    const [a, b, c] = KNIT_ITEMS;
    let list: Redemption[] = [];
    let k = knitState(35 * a!.cost, list);
    expect(canRedeem(k, b!.id)).toBe('locked');
    expect(canRedeem(k, a!.id)).toBe('ok');
    list = redeem(k, list, a!.id, 1000);
    k = knitState(35 * a!.cost, list);
    expect(k).toMatchObject({ spent: a!.cost, inStock: 0 });
    expect(canRedeem(k, a!.id)).toBe('owned');
    expect(canRedeem(k, b!.id)).toBe('short');
    expect(redeem(k, list, b!.id, 2000)).toEqual(list); // refused: nothing changes
    k = knitState(35 * (a!.cost + b!.cost), list);
    expect(canRedeem(k, b!.id)).toBe('ok');
    list = redeem(k, list, b!.id, 2000);
    expect(list).toEqual([
      { item: a!.id, at: 1000, cost: a!.cost },
      { item: b!.id, at: 2000, cost: b!.cost },
    ]);
    expect(knitState(35 * (a!.cost + b!.cost), list)).toMatchObject({ inStock: 0, next: { id: c!.id } });
  });

  it('deleting blocks never takes back what was already knitted (in hand floors at 0)', () => {
    const list: Redemption[] = [{ item: 'dishcloth', at: 1, cost: 1 }];
    const k = knitState(10, list);
    expect(k).toMatchObject({ made: 0, inStock: 0, owned: { dishcloth: 1 } });
    expect(k.next?.id).toBe('coaster');
  });

  it('with everything knitted there is no next item', () => {
    const list = KNIT_ITEMS.map((i, n) => ({ item: i.id, at: n, cost: i.cost }));
    const k = knitState(35 * 200, list);
    expect(k.next).toBeNull();
    expect(canRedeem(k, KNIT_ITEMS[KNIT_ITEMS.length - 1]!.id)).toBe('owned');
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
