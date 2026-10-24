import { describe, expect, it } from 'vitest';
import { describeApiFollowUp } from './followUp';
import { followUpRoadsOf, routeFor } from './roads';
import { vendorById } from '@/lib/ai/vendors';

const t = (k: string, vars?: Record<string, string | number>) =>
  vars ? k.replace(/\{(\w+)\}/g, (_, n: string) => String(vars[n])) : k;

// P9U-4 (第 186 / 187 条).
describe('跟进 on the API road', () => {
  it('only the vendors with their own web search can run it; the others say so', () => {
    const can = ['openai', 'anthropic', 'gemini', 'kimi', 'qwen'];
    for (const id of ['openai', 'anthropic', 'gemini', 'deepseek', 'kimi', 'qwen', 'zhipu', 'openrouter', 'custom']) {
      expect(vendorById(id)!.search !== null).toBe(can.includes(id));
    }
  });

  it('a key that cannot search does not open the API road for 跟进, even with the key connected', () => {
    const roads = followUpRoadsOf({ cli: false, api: true }, true, false);
    expect(routeFor('api', roads)).toBeNull();
    // …while a CLI that can search still carries it
    expect(routeFor('api', followUpRoadsOf({ cli: true, api: true }, true, false))).toBe('cli');
    // Gemini CLI cannot search; an API key that can takes over
    expect(routeFor('cli', followUpRoadsOf({ cli: true, api: true }, false, true))).toBe('api');
  });

  it('the run card lists what was found, closed and suggested — or says nothing was new', () => {
    const raw = `\`\`\`json
{"findings":[{"conclusion":"截止日期定了","url":"https://x.edu/a","why":"…"}],
 "close":[{"item_id":"q1","outcome":"公布了"}],
 "suggest":[{"text":"奖学金呢","why":"…"}]}
\`\`\``;
    expect(describeApiFollowUp(raw, t)).toBe(
      '- 截止日期定了 https://x.edu/a\n- 收掉了一条：公布了\n- 提了一条新的跟进：奖学金呢',
    );
    expect(describeApiFollowUp('{"findings":[],"close":[],"suggest":[]}', t)).toBe('这次没有新进展。');
    // ⚠️ item_ids never reach the card
    expect(describeApiFollowUp(raw, t)).not.toContain('q1');
  });
});
