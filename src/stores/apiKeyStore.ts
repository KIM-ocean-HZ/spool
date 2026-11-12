import { create } from 'zustand';
import { apiKeyPresent } from '@/lib/ai/compress';
import { useSettingsStore } from '@/stores/settingsStore';

// DISCOVERED-20261111-3 (Ocean 第 337 条): "can the API road be used" used to read the switch
// alone (`apiEngineEnabled`), while Settings showed 「已连接」 only when the switch was on AND a key
// was stored. A key removed from outside the app (deleted by hand, a sync tool, a cleaner) left the
// two saying different things: every AI entry offered to run, Settings asked for a key, and the run
// failed only once started. Now there is one answer — switch on and key there — read everywhere.
//
// `present`: null = not asked yet (outside Tauri, or before the first check). It counts as there, the
// way Settings always has: an unasked key must not flash 「粘一个 key」 on every launch. Asked once at
// startup when the switch is on (App.tsx), again when the key panel opens, and set on save.
interface ApiKeyState {
  present: boolean | null;
  refresh: () => Promise<boolean>;
  setPresent: (present: boolean) => void;
}

export const useApiKeyStore = create<ApiKeyState>((set) => ({
  present: null,
  refresh: async () => {
    let present = false;
    try {
      present = await apiKeyPresent();
    } catch {
      present = false;
    }
    set({ present });
    return present;
  },
  setPresent: (present) => set({ present }),
}));

/** Pure, for tests: the API road is on only when the switch is on and the key is there. */
export const apiReadyOf = (switchOn: boolean, keyPresent: boolean | null): boolean =>
  switchOn && keyPresent !== false;

export const apiReadyNow = (): boolean =>
  apiReadyOf(useSettingsStore.getState().apiEngineEnabled, useApiKeyStore.getState().present);

export const useApiReady = (): boolean => {
  const switchOn = useSettingsStore((s) => s.apiEngineEnabled);
  const present = useApiKeyStore((s) => s.present);
  return apiReadyOf(switchOn, present);
};
