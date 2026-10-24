// P9U-3 (Ocean 2026-10-24, HANDOFF §9.2 第 188 条: 「粘 key 自动认，认不出再选」) — every vendor the API
// road knows, in ONE table. Everything vendor-shaped reads it: which address, which protocol, which of
// the 「思考力度」 values the vendor takes, whether it takes a temperature, which listed model to pick
// first. The sidecar gets only what this table works out (`wireFor`), never a vendor name.
//
// ⚠️ Model names change every few months, so no default here is load-bearing: the model list comes
// from the vendor itself (`api_models`), and `preferModel` only says which of THOSE to pre-select.
// `fallbackModel` is for a vendor that gives no list — '' means 「let the user type it」.
//
// ⚠️ Kimi, 通义 and 智谱 each have a China and an international address, and a key only works on its
// own. `bases` lists both; connecting tries them in order and keeps the first that does not say 401.
// They are the same company — the key never goes to a different vendor while finding its address.

export type VendorId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'kimi'
  | 'qwen'
  | 'zhipu'
  | 'openrouter'
  | 'custom';

export type Protocol = 'openai' | 'anthropic';
/** spool-ai's `"search"` request, one per vendor's own web search (sidecar `search`). */
export type SearchKind = 'openai' | 'anthropic' | 'gemini' | 'kimi' | 'qwen';
/** '' = send nothing (the vendor's own default). */
export type Reasoning = '' | 'high' | 'medium' | 'low' | 'off';

export interface Vendor {
  id: VendorId;
  /** Shown as is — brand names are not translated (通义 / 智谱 go through t() at the call site). */
  name: string;
  bases: string[];
  protocol: Protocol;
  /** The 「思考力度」 values this vendor takes besides ''. [] = the row is not shown and nothing is sent. */
  reasoning: Reasoning[];
  defaultReasoning: Reasoning;
  /** Send temperature 0.2 (copying, not writing). OpenAI's reasoning models and new Claude models
   *  answer 400 to it, Kimi's new models pin it to 1 — those leave it out. */
  temperature: boolean;
  /** An output cap to send. null = none (the DeepSeek lesson: a guessed cap cut the reply to nothing).
   *  Claude's Messages API needs one (the sidecar sends 64K); Kimi's default is short. */
  maxOutputTokens: number | null;
  preferModel: RegExp[];
  fallbackModel: string;
  /** Answers `GET /user/balance` (only DeepSeek does). */
  balance: boolean;
  /** Its own web search, as the follow-up uses it (P9U-4, 第 186 条) — which of the sidecar's search
   *  requests to send. null = this vendor's key cannot search; 跟进 says so instead of failing. */
  search: SearchKind | null;
  /** A path that refuses a bad key, asked before the model list — for a vendor whose list is public
   *  (OpenRouter's is: 2026-10-24 a fake key got the whole list back). */
  keyCheckPath?: string;
}

export const VENDORS: Vendor[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    bases: ['https://api.openai.com/v1'],
    protocol: 'openai',
    reasoning: ['high', 'medium', 'low'],
    defaultReasoning: '',
    temperature: false,
    maxOutputTokens: null,
    preferModel: [/^gpt-\d+(\.\d+)?-(mini|terra)$/, /^gpt-\d+(\.\d+)?$/],
    fallbackModel: 'gpt-5-mini',
    balance: false,
    search: 'openai',
  },
  {
    id: 'anthropic',
    name: 'Claude',
    bases: ['https://api.anthropic.com'],
    protocol: 'anthropic',
    reasoning: ['high', 'medium', 'low'],
    defaultReasoning: '',
    temperature: false,
    maxOutputTokens: null,
    // Ocean 2026-10-24 (HANDOFF §9.2 第 191 条): Haiku 5.5 by default — the cheap tier, like the others.
    preferModel: [/^claude-haiku-5-5$/, /^claude-haiku-\d+(-\d+)?$/],
    fallbackModel: 'claude-haiku-5-5',
    balance: false,
    search: 'anthropic',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    bases: ['https://generativelanguage.googleapis.com/v1beta/openai'],
    protocol: 'openai',
    reasoning: ['high', 'medium', 'low'],
    defaultReasoning: '',
    temperature: false,
    maxOutputTokens: null,
    preferModel: [/^gemini-\d+(\.\d+)?-flash$/],
    fallbackModel: 'gemini-2.5-flash',
    balance: false,
    search: 'gemini',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    bases: ['https://api.deepseek.com'],
    protocol: 'openai',
    reasoning: ['high', 'medium', 'low', 'off'],
    // 2026-08-20/22 measured (130 runs): low writes as well as the longer settings for half the money.
    defaultReasoning: 'low',
    temperature: true,
    maxOutputTokens: null,
    preferModel: [/^deepseek-v\d+(\.\d+)?-flash$/, /^deepseek-chat$/],
    fallbackModel: 'deepseek-v4-flash',
    balance: true,
    search: null,
  },
  {
    id: 'kimi',
    name: 'Kimi',
    bases: ['https://api.moonshot.cn/v1', 'https://api.moonshot.ai/v1'],
    protocol: 'openai',
    reasoning: [],
    defaultReasoning: '',
    temperature: false,
    maxOutputTokens: 32768,
    preferModel: [/^kimi-k\d+(\.\d+)?$/],
    fallbackModel: '',
    balance: false,
    search: 'kimi',
  },
  {
    id: 'qwen',
    name: '通义千问',
    bases: [
      'https://dashscope.aliyuncs.com/compatible-mode/v1',
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      'https://dashscope-us.aliyuncs.com/compatible-mode/v1',
    ],
    protocol: 'openai',
    reasoning: [],
    defaultReasoning: '',
    temperature: true,
    maxOutputTokens: null,
    preferModel: [/^qwen-flash$/, /^qwen\d*(\.\d+)?-flash$/, /^qwen-plus$/],
    fallbackModel: 'qwen-plus',
    balance: false,
    search: 'qwen',
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    bases: ['https://open.bigmodel.cn/api/paas/v4', 'https://api.z.ai/api/paas/v4'],
    protocol: 'openai',
    reasoning: [],
    defaultReasoning: '',
    temperature: true,
    maxOutputTokens: null,
    preferModel: [/^glm-\d+(\.\d+)?-flash$/, /^glm-\d+(\.\d+)?-air$/],
    fallbackModel: '',
    balance: false,
    search: null,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    bases: ['https://openrouter.ai/api/v1'],
    protocol: 'openai',
    reasoning: [],
    defaultReasoning: '',
    temperature: false,
    maxOutputTokens: null,
    // Hundreds of models from every vendor at every price: no pre-selection, the user picks.
    preferModel: [],
    fallbackModel: '',
    balance: false,
    search: null,
    keyCheckPath: '/key',
  },
  {
    id: 'custom',
    name: '自定义地址',
    bases: [],
    protocol: 'openai',
    // Unknown endpoint: offer every value and let it answer (a 400 is free and carries its own words).
    reasoning: ['high', 'medium', 'low', 'off'],
    defaultReasoning: '',
    temperature: true,
    maxOutputTokens: null,
    preferModel: [],
    fallbackModel: '',
    balance: true,
    search: null,
  },
];

const BY_ID = new Map(VENDORS.map((v) => [v.id, v]));

/** The names that are written in Chinese go through t() (English: Qwen, Zhipu GLM, Custom endpoint). */
const NAME_KEY: Partial<Record<VendorId, string>> = { qwen: '通义千问', zhipu: '智谱 GLM', custom: '自定义地址' };

export const vendorName = (v: Vendor, t: (key: string) => string): string =>
  NAME_KEY[v.id] ? t(NAME_KEY[v.id]!) : v.name;

export const vendorById = (id: string): Vendor | null => BY_ID.get(id as VendorId) ?? null;

const norm = (url: string): string => url.trim().replace(/\/+$/, '').toLowerCase();

/** The vendor an address belongs to; anything else is 'custom'. */
export const vendorFromBase = (baseUrl: string): VendorId => {
  const b = norm(baseUrl);
  for (const v of VENDORS) if (v.bases.some((x) => norm(x) === b)) return v.id;
  return 'custom';
};

/** Which vendor the saved settings mean. Settings from before P9U-3 have no `apiVendor`: their address
 *  says which (the default one is DeepSeek's), so nobody has to fill anything in again. */
export const resolveVendor = (apiVendor: string, apiBaseUrl: string): Vendor =>
  vendorById(apiVendor) ?? vendorById(vendorFromBase(apiBaseUrl))!;

/** Read a key's prefix. null = can't tell (a bare `sk-…` is used by DeepSeek, 通义, Kimi and older
 *  OpenAI keys alike) — then the user picks from the list. */
export const detectVendor = (key: string): VendorId | null => {
  const k = key.trim();
  if (k.startsWith('sk-ant-')) return 'anthropic';
  if (k.startsWith('sk-or-')) return 'openrouter';
  if (/^sk-(proj|svcacct)-/.test(k)) return 'openai';
  if (k.startsWith('AIza')) return 'gemini';
  // 智谱: `<id>.<secret>` — the only one of these with a dot and no `sk-`.
  if (/^[0-9A-Za-z]{16,}\.[0-9A-Za-z]{8,}$/.test(k)) return 'zhipu';
  return null;
};

/** The address to call: the saved one when it is one of this vendor's (the region that answered),
 *  the vendor's first otherwise; a custom vendor keeps whatever the user typed. */
export const baseFor = (v: Vendor, apiBaseUrl: string): string =>
  v.id === 'custom' || v.bases.some((x) => norm(x) === norm(apiBaseUrl)) ? apiBaseUrl.trim() : v.bases[0];

/** What the sidecar is told (Rust `ApiWire`), plus the 「思考力度」 value with anything this vendor
 *  does not take filtered out — a value it rejects would be a 400 on every run. */
export const wireFor = (
  v: Vendor,
  reasoning: string,
): { reasoning: string; wire: { protocol: Protocol; temperature: number | null; maxOutputTokens: number | null } } => ({
  reasoning: (v.reasoning as string[]).includes(reasoning) ? reasoning : '',
  wire: {
    protocol: v.protocol,
    temperature: v.temperature ? 0.2 : null,
    maxOutputTokens: v.maxOutputTokens,
  },
});

/** Not chat models: embeddings, speech, pictures, video, moderation, Responses-only coding models. */
const NOT_CHAT =
  /embed|tts|whisper|dall-e|davinci|babbage|image|audio|realtime|moderation|transcri|speech|veo|imagen|rerank|aqa|computer-use|codex|search-preview/i;

export const chatModels = (ids: string[]): string[] => ids.filter((id) => !NOT_CHAT.test(id));

const byVersionDesc = (a: string, b: string): number =>
  b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });

/** Which model to pre-select: the one already chosen if the vendor still lists it, else the newest
 *  match of the first `preferModel` pattern that matches anything, else the first listed. */
export const pickModel = (v: Vendor, ids: string[], current: string): string => {
  if (current && ids.includes(current)) return current;
  for (const re of v.preferModel) {
    const hits = ids.filter((id) => re.test(id)).sort(byVersionDesc);
    if (hits.length) return hits[0];
  }
  // A custom endpoint's list may be partial — keep what the user typed. OpenRouter: the user picks.
  if (v.id === 'custom') return current;
  if (v.preferModel.length === 0) return '';
  return ids[0] ?? v.fallbackModel;
};

export interface ApiCall {
  vendor: Vendor;
  baseUrl: string;
  model: string;
  reasoning: string;
  wire: ReturnType<typeof wireFor>['wire'];
}

/** Everything one API run sends, from the saved settings — every caller goes through here, so the
 *  compress, stale-scan and weekly-review runs cannot disagree about a vendor. */
export const apiCallFrom = (
  s: { apiVendor: string; apiBaseUrl: string; apiModel: string; apiReasoning: string },
  reasoning: string = s.apiReasoning,
): ApiCall => {
  const vendor = resolveVendor(s.apiVendor, s.apiBaseUrl);
  const w = wireFor(vendor, reasoning);
  return { vendor, baseUrl: baseFor(vendor, s.apiBaseUrl), model: s.apiModel, reasoning: w.reasoning, wire: w.wire };
};
