import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

  afterEach(() => useToastStore.setState({ toasts: [] }));

  it('knits the next item, saves it, and offers an undo that takes back only that one', async () => {
    expect(await useKnitStore.getState().redeem('scarf')).toBe('locked');
    expect(await useKnitStore.getState().redeem('coaster')).toBe('ok');
    expect(useKnitStore.getState().redemptions.map((r) => r.item)).toEqual(['coaster']);
    expect(saved).toHaveLength(1);
    const [toast] = useToastStore.getState().toasts;
    expect(toast!.message).toContain('coaster');
    expect(await useKnitStore.getState().redeem('scarf')).toBe('ok');
    // the coaster's undo is stale now — the scarf was its turn
    toast!.action!.run();
    await Promise.resolve();
    expect(useKnitStore.getState().redemptions.map((r) => r.item)).toEqual(['coaster', 'scarf']);
    useToastStore.getState().toasts[1]!.action!.run();
    await new Promise((r) => setTimeout(r, 0));
    expect(useKnitStore.getState().redemptions.map((r) => r.item)).toEqual(['coaster']);
    expect(saved[saved.length - 1]!.map((r) => r.item)).toEqual(['coaster']);
  });

  it('a failed save changes nothing and says so', async () => {
    failSave = true;
    expect(await useKnitStore.getState().redeem('coaster')).toBe('failed');
    expect(useKnitStore.getState().redemptions).toEqual([]);
    expect(useToastStore.getState().toasts.map((x) => x.kind)).toEqual(['error']);
  });

  it('short of patches is refused before anything is written', async () => {
    useKnitStore.setState({ stitches: 34 });
    expect(await useKnitStore.getState().redeem('coaster')).toBe('short');
    expect(saved).toEqual([]);
  });
});
