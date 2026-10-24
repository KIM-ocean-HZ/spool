import { describe, expect, it } from 'vitest';
import {
  apiCallFrom,
  baseFor,
  chatModels,
  detectVendor,
  pickModel,
  resolveVendor,
  vendorById,
  vendorFromBase,
  VENDORS,
  wireFor,
} from './vendors';
import { connectedPatch, probeVendor, type ModelsOutcome } from './connectKey';

const v = (id: string) => vendorById(id)!;

// P9U-3 (第 188 条): 粘 key 自动认，认不出再选.
describe('key prefixes', () => {
  it('names the vendors whose keys say who they are', () => {
    expect(detectVendor('sk-ant-api03-abc')).toBe('anthropic');
    expect(detectVendor('  sk-or-v1-abc ')).toBe('openrouter');
    expect(detectVendor('sk-proj-abc')).toBe('openai');
    expect(detectVendor('sk-svcacct-abc')).toBe('openai');
    expect(detectVendor('AIzaSyD-abc')).toBe('gemini');
    expect(detectVendor('0123456789abcdef0123456789abcdef.AbCdEfGhIjKlMnOp')).toBe('zhipu');
  });

  it('a bare sk- key is not guessed (DeepSeek, 通义, Kimi and old OpenAI keys all look like it)', () => {
    expect(detectVendor('sk-0123456789abcdef0123456789abcdef')).toBeNull();
    expect(detectVendor('sk-' + 'a'.repeat(48))).toBeNull();
    expect(detectVendor('')).toBeNull();
  });
});

describe('settings from before P9U-3', () => {
  it('the old DeepSeek setup is read as DeepSeek, nothing to fill in again', () => {
    expect(resolveVendor('', 'https://api.deepseek.com').id).toBe('deepseek');
    expect(resolveVendor('', 'https://api.deepseek.com/').id).toBe('deepseek');
    const call = apiCallFrom({
      apiVendor: '',
      apiBaseUrl: 'https://api.deepseek.com',
      apiModel: 'deepseek-v4-flash',
      apiReasoning: 'low',
    });
    expect(call.baseUrl).toBe('https://api.deepseek.com');
    expect(call.model).toBe('deepseek-v4-flash');
    expect(call.reasoning).toBe('low');
    // the request it sends is the one it sent before P9U-3
    expect(call.wire).toEqual({ protocol: 'openai', temperature: 0.2, maxOutputTokens: null });
  });

  it('any other address the user typed is a custom endpoint, kept as typed', () => {
    expect(vendorFromBase('https://api.siliconflow.cn/v1')).toBe('custom');
    expect(baseFor(v('custom'), 'https://api.siliconflow.cn/v1')).toBe('https://api.siliconflow.cn/v1');
  });

  it('a vendor keeps the region that answered, and falls back to its first address otherwise', () => {
    expect(baseFor(v('kimi'), 'https://api.moonshot.ai/v1')).toBe('https://api.moonshot.ai/v1');
    expect(baseFor(v('kimi'), 'https://api.deepseek.com')).toBe('https://api.moonshot.cn/v1');
    expect(resolveVendor('', 'https://api.moonshot.ai/v1').id).toBe('kimi');
  });
});

describe('each request carries only what that vendor takes', () => {
  it('a 思考力度 the vendor does not take is not sent (it would be a 400 on every run)', () => {
    expect(wireFor(v('kimi'), 'low').reasoning).toBe('');
    expect(wireFor(v('anthropic'), 'off').reasoning).toBe('');
    expect(wireFor(v('anthropic'), 'low').reasoning).toBe('low');
    expect(wireFor(v('deepseek'), 'off').reasoning).toBe('off');
    expect(wireFor(v('custom'), 'off').reasoning).toBe('off');
  });

  it('no temperature where it is a 400 or pinned (OpenAI reasoning models, new Claude, Kimi, Gemini 3)', () => {
    for (const id of ['openai', 'anthropic', 'kimi', 'gemini', 'openrouter']) {
      expect(wireFor(v(id), '').wire.temperature).toBeNull();
    }
    for (const id of ['deepseek', 'qwen', 'zhipu', 'custom']) {
      expect(wireFor(v(id), '').wire.temperature).toBe(0.2);
    }
  });

  it('Claude talks its own protocol; everyone else the /chat/completions one', () => {
    for (const x of VENDORS) expect(x.protocol).toBe(x.id === 'anthropic' ? 'anthropic' : 'openai');
  });

  it('every address is https (the sidecar refuses anything else)', () => {
    for (const x of VENDORS) for (const b of x.bases) expect(b.startsWith('https://')).toBe(true);
  });
});

describe('which model is pre-selected', () => {
  it('the cheap tier, newest first', () => {
    const ids = ['gpt-4o', 'gpt-5-mini', 'gpt-5.6-terra', 'gpt-5', 'gpt-5-mini-2025-08-07'];
    expect(pickModel(v('openai'), ids, '')).toBe('gpt-5.6-terra');
    expect(pickModel(v('gemini'), ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-3-flash'], '')).toBe(
      'gemini-3-flash',
    );
    expect(pickModel(v('deepseek'), ['deepseek-v4-pro', 'deepseek-v4-flash'], '')).toBe('deepseek-v4-flash');
    // Ocean 10-24 (第 191 条): Claude defaults to Haiku 5.5, not Opus.
    expect(pickModel(v('anthropic'), ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'], '')).toBe(
      'claude-haiku-5-5',
    );
  });

  it('a model the user already chose is kept while the vendor still lists it', () => {
    expect(pickModel(v('openai'), ['gpt-5-mini', 'gpt-5'], 'gpt-5')).toBe('gpt-5');
  });

  it('OpenRouter has hundreds at every price: nothing pre-selected, the user picks', () => {
    expect(pickModel(v('openrouter'), ['a/b', 'c/d'], 'deepseek-v4-flash')).toBe('');
  });

  it('only chat models are offered', () => {
    expect(chatModels(['gpt-5-mini', 'text-embedding-3-small', 'tts-1', 'dall-e-3', 'gpt-5-codex'])).toEqual([
      'gpt-5-mini',
    ]);
  });
});

describe('连接', () => {
  const ok = (models: string[]): ModelsOutcome => ({ ok: true, models, kind: null, message: null, status: null });
  const no = (kind: string): ModelsOutcome => ({ ok: false, models: [], kind, message: kind, status: 401 });

  it('a key refused in China is tried on the same vendor’s international address', async () => {
    const asked: string[] = [];
    const r = await probeVendor(v('kimi'), 'sk-x', '', undefined, async (base) => {
      asked.push(base);
      return base.includes('.cn') ? no('auth') : ok(['kimi-k2.6', 'kimi-k3']);
    });
    expect(asked).toEqual(['https://api.moonshot.cn/v1', 'https://api.moonshot.ai/v1']);
    expect(r).toEqual({ at: 'ok', baseUrl: 'https://api.moonshot.ai/v1', models: ['kimi-k2.6', 'kimi-k3'], model: 'kimi-k3' });
  });

  it('refused everywhere = not this vendor’s key; a dead network is not retried elsewhere', async () => {
    expect((await probeVendor(v('qwen'), 'k', '', undefined, async () => no('auth'))).at).toBe('refused');
    let calls = 0;
    const r = await probeVendor(v('qwen'), 'k', '', undefined, async () => {
      calls += 1;
      return no('network');
    });
    expect(r.at).toBe('failed');
    expect(calls).toBe(1);
  });

  it('a vendor with no model list still connects; the model is typed (or its known default)', async () => {
    const r = await probeVendor(v('zhipu'), 'k', '', undefined, async () => no('unsupported'));
    expect(r).toEqual({ at: 'ok', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: [], model: '' });
  });

  it('connecting turns the API road on; 思考力度 resets only when the vendor changed', () => {
    const probe = { at: 'ok' as const, baseUrl: 'https://api.openai.com/v1', models: [], model: 'gpt-5-mini' };
    expect(connectedPatch(v('openai'), probe, 'deepseek', 'low')).toEqual({
      apiVendor: 'openai',
      apiBaseUrl: 'https://api.openai.com/v1',
      apiModel: 'gpt-5-mini',
      apiReasoning: '',
      apiEngineEnabled: true,
    });
    expect(connectedPatch(v('openai'), probe, 'openai', 'high').apiReasoning).toBe('high');
  });
});
