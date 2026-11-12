import { describe, expect, it } from 'vitest';
import { vendorOfModel } from '@/lib/ai/vendors';
import { ranBy } from './ranBy';

const tr = (k: string): string => k;
const run = (engine: string, model: string | null) => ({
  engine,
  usage: { model, costUsd: null, inputTokens: null, outputTokens: null },
});

// DISCOVERED-20261112-8: the record line said 「claude-opus-5-5 · 花费未知」.
describe('ranBy', () => {
  it('names the local CLI, and marks it as one (no cost line)', () => {
    expect(ranBy(run('claude', 'claude-opus-5-5'), tr)).toEqual({ who: 'Claude Code', viaCli: true });
    expect(ranBy(run('codex', 'gpt-5'), tr)).toEqual({ who: 'Codex', viaCli: true });
  });

  it('names the API vendor from the model it reported, never the model id', () => {
    expect(ranBy(run('deepseek-chat', 'deepseek-chat'), tr)).toEqual({ who: 'DeepSeek', viaCli: false });
    expect(ranBy(run('qwen-plus', 'qwen-plus'), tr).who).toBe('通义千问');
    expect(ranBy(run('my-local-model', null), tr)).toEqual({ who: 'API', viaCli: false });
  });
});

describe('vendorOfModel', () => {
  it('reads the vendor off the model name', () => {
    const id = (m: string) => vendorOfModel(m)?.id ?? null;
    expect(id('deepseek-v4-flash')).toBe('deepseek');
    expect(id('claude-sonnet-5-5')).toBe('anthropic');
    expect(id('gemini-3-pro')).toBe('gemini');
    expect(id('gpt-5-mini')).toBe('openai');
    expect(id('o4-mini')).toBe('openai');
    expect(id('kimi-k2')).toBe('kimi');
    expect(id('moonshot-v1-8k')).toBe('kimi');
    expect(id('glm-4.6')).toBe('zhipu');
    expect(id('deepseek/deepseek-chat')).toBe('openrouter');
    expect(id('llama-3')).toBeNull();
  });
});
