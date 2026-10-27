import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __setKnitPersistForTest } from '@/lib/knit/redemptions';
import type { Redemption } from '@/lib/knit/knit';
import { useKnitStore } from './knitStore';
import { useToastStore } from './toastStore';

let saved: Redemption[][] = [];
let failSave = false;

describe('knitStore.redeem / unredeem', () => {
  beforeEach(() => {
    saved = [];
    failSave = false;
    __setKnitPersistForTest({
      load: async () => [],
      save: async (list) => {
        if (failSave) throw new Error('disk full');
        saved.push(list);
      },
    });
    useKnitStore.setState({ stitches: 35 * 4, today: 0, redemptions: [], loaded: true, drawerOpen: true });
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.useRealTimers();
  });

  it('knits the next item, saves it, and offers an undo that takes back only that one', async () => {
    // A knit is known by the moment it was made (knitStore `redeem`'s `Date.now()`); two made in the
    // same millisecond would share it, and the dishcloth's stale undo would take back the coaster.
    // A person cannot click twice in one millisecond — this test could (DISCOVERED-20261026-1).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_000_000);
    expect(await useKnitStore.getState().redeem('coaster')).toBe('locked');
    expect(await useKnitStore.getState().redeem('dishcloth')).toBe('ok');
    expect(useKnitStore.getState().redemptions.map((r) => r.item)).toEqual(['dishcloth']);
    expect(saved).toHaveLength(1);
    const [toast] = useToastStore.getState().toasts;
    expect(toast!.message).toContain('dishcloth');
    vi.setSystemTime(1_001_000);
    expect(await useKnitStore.getState().redeem('coaster')).toBe('ok');
    // the dishcloth's undo is stale now — the coaster was its turn
    toast!.action!.run();
    await Promise.resolve();
    expect(useKnitStore.getState().redemptions.map((r) => r.item)).toEqual(['dishcloth', 'coaster']);
    useToastStore.getState().toasts[1]!.action!.run();
    await new Promise((r) => setTimeout(r, 0));
    expect(useKnitStore.getState().redemptions.map((r) => r.item)).toEqual(['dishcloth']);
    expect(saved[saved.length - 1]!.map((r) => r.item)).toEqual(['dishcloth']);
  });

  it('a failed save changes nothing and says so', async () => {
    failSave = true;
    expect(await useKnitStore.getState().redeem('dishcloth')).toBe('failed');
    expect(useKnitStore.getState().redemptions).toEqual([]);
    expect(useToastStore.getState().toasts.map((x) => x.kind)).toEqual(['error']);
  });

  it('short of patches is refused before anything is written', async () => {
    useKnitStore.setState({ stitches: 34 });
    expect(await useKnitStore.getState().redeem('dishcloth')).toBe('short');
    expect(saved).toEqual([]);
  });
});
