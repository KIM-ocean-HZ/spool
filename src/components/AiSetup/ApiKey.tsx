import { RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ApiBalance from '@/components/ApiBalance';
import { apiKeyPresent, loadApiKey, saveApiKey, sidecarPresent } from '@/lib/ai/compress';
import { connectedPatch, probeVendor, useModelListStore } from '@/lib/ai/connectKey';
import { detectVendor, resolveVendor, vendorById, VENDORS, type Vendor } from '@/lib/ai/vendors';
import { useT } from '@/lib/i18n';
import { useSettingsStore } from '@/stores/settingsStore';

// P9U-3 (Ocean 2026-10-24 第 188 条: 「粘 key 自动认，认不出再从列表里选」) — the API key, as the twin of
// LocalEngine: the same few states, one thing to press in each, the same block on the settings page and
// in the popover a locked AI button opens.
//
//   没连上    → a box to paste a key into. A key whose prefix says whose it is connects right away;
//               a bare `sk-…` (several vendors use it) gets the list to pick from.
//   正在连    → the vendor's name.
//   不认 / 连不上 → what the vendor said, and the list again.
//   已连上    → the vendor, the model (from that vendor's own list), 思考力度 where the vendor takes it.
//
// ⛔ No vendor is the example any more (Ocean: 「去掉 deepseek 这个例子」), and the address only shows
// for 「自定义地址」 — the others fill it in themselves (vendors.ts).

const NAME_KEY: Partial<Record<string, string>> = { qwen: '通义千问', zhipu: '智谱 GLM', custom: '自定义地址' };

type Phase =
  | { at: 'idle' }
  | { at: 'pick' }
  | { at: 'connecting'; vendor: Vendor }
  | { at: 'refused'; vendor: Vendor; message: string }
  | { at: 'failed'; vendor: Vendor; message: string };

export default function ApiKey({ onConnected }: { onConnected?: () => void }) {
  const t = useT();
  const enabled = useSettingsStore((s) => s.apiEngineEnabled);
  const apiVendor = useSettingsStore((s) => s.apiVendor);
  const apiBaseUrl = useSettingsStore((s) => s.apiBaseUrl);
  const apiModel = useSettingsStore((s) => s.apiModel);
  const apiReasoning = useSettingsStore((s) => s.apiReasoning);
  const update = useSettingsStore((s) => s.update);
  const list = useModelListStore();
  const vendor = resolveVendor(apiVendor, apiBaseUrl);
  const vendorName = (v: Vendor): string => (NAME_KEY[v.id] ? t(NAME_KEY[v.id]!) : v.name);

  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [sidecar, setSidecar] = useState<boolean | null>(null);
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState<Phase>({ at: 'idle' });
  const [changingKey, setChangingKey] = useState(false);
  const [customBase, setCustomBase] = useState(vendor.id === 'custom' ? apiBaseUrl : '');
  const [refreshing, setRefreshing] = useState(false);
  // Enter and the blur after it both commit — one key, one connect.
  const committing = useRef(false);

  useEffect(() => {
    void apiKeyPresent().then(setHasKey, () => setHasKey(false));
    void sidecarPresent().then(setSidecar, () => setSidecar(false));
  }, []);

  const connect = async (v: Vendor, key: string): Promise<void> => {
    if (v.id === 'custom' && !customBase.trim().startsWith('https://')) {
      setPhase({ at: 'pick' });
      return;
    }
    setPhase({ at: 'connecting', vendor: v });
    const same = v.id === vendor.id;
    const probe = await probeVendor(v, key, same ? apiModel : '', v.id === 'custom' ? [customBase.trim()] : v.bases);
    if (probe.at !== 'ok') {
      setPhase({ at: probe.at, vendor: v, message: probe.message });
      return;
    }
    list.remember(probe.baseUrl, probe.models);
    await update(connectedPatch(v, probe, apiVendor, apiReasoning));
    setPhase({ at: 'idle' });
    setChangingKey(false);
    onConnected?.();
  };

  /** A key was pasted / typed and left. Stored first (keychain), then read for whose it is. */
  const commitKey = async (raw: string): Promise<void> => {
    const key = raw.trim();
    if (!key || committing.current) return;
    committing.current = true;
    try {
      setDraft('');
      await saveApiKey(key);
      setHasKey(true);
      const id = detectVendor(key);
      if (id) await connect(vendorById(id)!, key);
      else setPhase({ at: 'pick' });
    } finally {
      committing.current = false;
    }
  };

  const pickVendor = async (v: Vendor): Promise<void> => {
    if (v.id === 'custom' && !customBase.trim()) {
      setPhase({ at: 'pick' });
      setCustomBase('https://');
      return;
    }
    await connect(v, await loadApiKey());
  };

  const refreshList = async (): Promise<void> => {
    setRefreshing(true);
    try {
      const probe = await probeVendor(vendor, await loadApiKey(), apiModel, [apiBaseUrl]);
      if (probe.at === 'ok') list.remember(probe.baseUrl, probe.models);
      else setPhase({ at: probe.at, vendor, message: probe.message });
    } finally {
      setRefreshing(false);
    }
  };

  const link = 'text-accent underline-offset-2 hover:underline disabled:opacity-50';
  const input =
    'w-full rounded border border-line bg-paper px-2 py-1 font-mono text-[11px] text-ink outline-none focus:border-accent';
  const urgent = { color: 'var(--urgent)' };

  if (sidecar === false) {
    return <p className="text-[11px]" style={urgent}>{t('找不到负责联网的那个小程序（spool-ai）。重装一次 Spool 应该能修好。')}</p>;
  }

  const vendorList = (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {VENDORS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => void pickVendor(v)}
            className="rounded-md border border-line bg-paper px-2 py-0.5 text-[11px] text-ink-2 transition-colors hover:border-accent hover:text-accent"
          >
            {vendorName(v)}
          </button>
        ))}
      </div>
      {customBase !== '' && (
        <label className="block">
          <span className="text-[11px] text-muted">{t('接口地址')}</span>
          <input
            value={customBase}
            onChange={(e) => setCustomBase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void pickVendor(vendorById('custom')!);
            }}
            spellCheck={false}
            className={`mt-1 ${input}`}
          />
          {!customBase.startsWith('https://') && (
            <span className="mt-1 block text-[11px]" style={urgent}>
              {t('必须是 https 开头 —— 用普通 http 的话，你的 key 会明文发出去。')}
            </span>
          )}
        </label>
      )}
    </div>
  );

  if (hasKey === null) return <p className="text-xs text-muted">{t('正在看你存没存过 key…')}</p>;

  // ---- 正在连 / 不认 / 连不上 / 认不出 ----
  if (phase.at === 'connecting') {
    return <p className="text-xs text-muted">{t('正在连 {vendor}…', { vendor: vendorName(phase.vendor) })}</p>;
  }
  if (phase.at === 'refused' || phase.at === 'failed' || phase.at === 'pick') {
    return (
      <div className="space-y-1.5 text-xs">
        {phase.at === 'pick' ? (
          <p className="text-ink-2">{t('认不出这是哪一家的 key —— 点一下是哪家：')}</p>
        ) : (
          <p style={urgent} title={phase.message}>
            {phase.at === 'refused'
              ? t('{vendor} 不认这个 key。是别家的 key 的话，点一下是哪家：', { vendor: vendorName(phase.vendor) })
              : t('连不上 {vendor}。检查一下网络，或者点一家再试：', { vendor: vendorName(phase.vendor) })}
          </p>
        )}
        {vendorList}
        <button type="button" onClick={() => { setPhase({ at: 'idle' }); setChangingKey(true); }} className={link}>
          {t('换一个 key')}
        </button>
      </div>
    );
  }

  // ---- 已连上 ----
  if (enabled && hasKey && !changingKey) {
    const models = list.baseUrl === apiBaseUrl && list.models.length > 0 ? list.models : null;
    const options = models ? (models.includes(apiModel) || !apiModel ? models : [apiModel, ...models]) : null;
    return (
      <div className="space-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span style={{ color: 'var(--status-active)' }}>{t('✓ 已连接 {name}', { name: vendorName(vendor) })}</span>
          <button type="button" onClick={() => setChangingKey(true)} className={link}>
            {t('换一个 key')}
          </button>
          <button type="button" onClick={() => void update({ apiEngineEnabled: false })} className={link}>
            {t('断开')}
          </button>
        </div>
        <label className="flex items-center gap-2">
          <span className="flex-none text-[11px] text-muted">{t('模型')}</span>
          {options ? (
            <select
              value={apiModel}
              onChange={(e) => void update({ apiModel: e.target.value })}
              className="min-w-0 flex-1 rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px] text-ink outline-none focus:border-accent"
            >
              {!apiModel && <option value="">{t('选一个模型')}</option>}
              {options.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={apiModel}
              onChange={(e) => void update({ apiModel: e.target.value })}
              placeholder={t('模型名')}
              spellCheck={false}
              className={`min-w-0 flex-1 ${input}`}
            />
          )}
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void refreshList()}
            title={t('从 {vendor} 拉一下模型列表（不花钱）', { vendor: vendorName(vendor) })}
            className="flex-none rounded p-1 text-muted transition-colors enabled:hover:bg-paper-2 enabled:hover:text-ink disabled:opacity-50"
          >
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </label>
        {!apiModel && <p className="text-[11px]" style={urgent}>{t('先选一个模型，这条路才能用。')}</p>}
        {vendor.reasoning.length > 0 && <Reasoning vendor={vendor} />}
        <ApiBalance />
      </div>
    );
  }

  // ---- 没连上 ----
  return (
    <div className="space-y-1.5 text-xs">
      {hasKey && !changingKey ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-ink-2">{t('已经存了一个 key')}</span>
          <button
            type="button"
            onClick={() =>
              void loadApiKey().then((k) => {
                const id = apiVendor ? vendor.id : detectVendor(k);
                return id ? connect(vendorById(id)!, k) : setPhase({ at: 'pick' });
              })
            }
            className="rounded-md border border-accent bg-accent/10 px-2.5 py-1 text-xs text-accent transition-colors hover:bg-accent/20"
          >
            {t('连接')}
          </button>
          <button type="button" onClick={() => setChangingKey(true)} className={link}>
            {t('换一个 key')}
          </button>
        </div>
      ) : (
        <input
          type="password"
          value={draft}
          autoFocus={changingKey}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (!text.trim()) return;
            e.preventDefault();
            void commitKey(text);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commitKey(draft);
          }}
          onBlur={() => void commitKey(draft)}
          placeholder={t('粘贴你的 API key')}
          spellCheck={false}
          className={input}
        />
      )}
      <p className="text-[11px] leading-relaxed text-muted">
        {t('OpenAI、Claude、Gemini、DeepSeek、Kimi、通义、智谱、OpenRouter 的 key 都行，粘进来就认。key 存在这台电脑的系统钥匙串里，不进设置文件，也不跟着导出的库走。')}
      </p>
    </div>
  );
}

/** 思考力度 — only the values this vendor takes (vendors.ts), so none of them can be a 400. */
function Reasoning({ vendor }: { vendor: Vendor }) {
  const t = useT();
  const reasoning = useSettingsStore((s) => s.apiReasoning);
  const update = useSettingsStore((s) => s.update);
  const values = ['', ...vendor.reasoning];
  const current = values.includes(reasoning) ? reasoning : '';
  const label = (v: string): string => (v === '' ? t('默认') : v === 'off' ? t('关掉') : v);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[11px] text-muted">{t('思考力度')}</span>
        {values.map((v) => (
          <button
            key={v || 'default'}
            type="button"
            onClick={() => void update({ apiReasoning: v })}
            className={`rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
              current === v
                ? 'border-accent text-accent'
                : 'border-line bg-paper text-muted hover:border-line-strong hover:text-ink'
            }`}
            style={current === v ? { background: 'var(--accent-soft)' } : undefined}
          >
            {label(v)}
          </button>
        ))}
      </div>
      {/* ⛔ D0（2026-08-22）：给结论，不给实验说明。「low 最划算」只在 DeepSeek 上量过（130 次），
          别家没量过就不替它说。 */}
      <p className="mt-1 text-[11px] leading-relaxed text-muted/80">
        {vendor.id === 'deepseek'
          ? t('模型下笔之前会先想一会儿，这一段也按字数收费。默认 low：想得短一点，压出来的东西不比想得久的差，钱和时间都省下大半。')
          : vendor.id === 'custom'
            ? t('模型下笔之前会先想一会儿，这一段也按字数收费。不认的值会被接口顶回来，那一次不收费。')
            : t('模型下笔之前会先想一会儿，这一段也按字数收费。「默认」就是这家自己的设定。')}
      </p>
    </div>
  );
}
