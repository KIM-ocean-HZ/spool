import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';
import { chatModels, pickModel, type Protocol, type Vendor } from '@/lib/ai/vendors';

// P9U-3 (第 188 条) — the 「连接」 half of the API key: which of the vendor's addresses this key works on,
// and which models it can use there. One `GET …/models` per address, free (no tokens), and the key only
// ever goes to the vendor it was connected as.
//
// ⚠️ Nothing here runs on its own: it is called when the user pastes a key, picks a vendor, or presses
// 「连接」 / 「刷新列表」 — the settings page opening sends nothing (the balance line's rule, X 批).

export interface ModelsOutcome {
  ok: boolean;
  models: string[];
  kind: string | null;
  message: string | null;
  status: number | null;
}

export type ListModels = (
  baseUrl: string,
  apiKey: string,
  protocol: Protocol,
  keyCheckPath?: string,
) => Promise<ModelsOutcome>;

export const listModels: ListModels = (baseUrl, apiKey, protocol, keyCheckPath) =>
  invoke<ModelsOutcome>('api_models', { baseUrl, apiKey, protocol, keyCheckPath: keyCheckPath ?? null });

export type Probe =
  /** `models` empty = the vendor gives no list; the model is typed by hand. */
  | { at: 'ok'; baseUrl: string; models: string[]; model: string }
  /** Every address answered 401/403 — not this vendor's key (or a revoked one). */
  | { at: 'refused'; message: string }
  /** Could not ask (network, timeout, no sidecar …). */
  | { at: 'failed'; message: string };

/** Try the vendor's addresses in order (China first, then international, for the three that have
 *  both) and keep the first that does not refuse the key. `current` = the model already chosen for
 *  this same vendor ('' when switching vendors), kept when it is still listed. */
export async function probeVendor(
  v: Vendor,
  key: string,
  current: string,
  bases: string[] = v.bases,
  ask: ListModels = listModels,
): Promise<Probe> {
  let last: ModelsOutcome | null = null;
  for (const base of bases) {
    const out = await ask(base, key, v.protocol, v.keyCheckPath);
    if (out.ok) {
      const ids = chatModels(out.models);
      return { at: 'ok', baseUrl: base, models: ids, model: pickModel(v, ids, current) };
    }
    if (out.kind === 'unsupported') {
      return { at: 'ok', baseUrl: base, models: [], model: current || v.fallbackModel };
    }
    last = out;
    // Only a refused key is worth trying on the other region; a dead network fails the same there.
    if (out.kind !== 'auth') break;
  }
  const message = last?.message ?? '';
  return last?.kind === 'auth' ? { at: 'refused', message } : { at: 'failed', message };
}

/** The settings a successful connect writes. 思考力度 resets to the new vendor's own default only when
 *  the vendor changed — a user's pick for the same vendor survives a reconnect. */
export const connectedPatch = (
  v: Vendor,
  probe: Extract<Probe, { at: 'ok' }>,
  previousVendor: string,
  previousReasoning: string,
) => ({
  apiVendor: v.id,
  apiBaseUrl: probe.baseUrl,
  apiModel: probe.model,
  apiReasoning: previousVendor === v.id ? previousReasoning : v.defaultReasoning,
  apiEngineEnabled: true,
});

/** The last list fetched this session, so moving between settings pages does not ask again. */
export const useModelListStore = create<{
  baseUrl: string;
  models: string[];
  remember: (baseUrl: string, models: string[]) => void;
}>((set) => ({
  baseUrl: '',
  models: [],
  remember: (baseUrl, models) => set({ baseUrl, models }),
}));
