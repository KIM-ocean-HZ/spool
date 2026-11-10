import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { RepoCheckScan } from '@/lib/ai/compress';
import type { WsRepoItems } from '@/lib/stale/wsItems';
import { useCompressStore } from '@/stores/compressStore';
import { useFolderStore } from '@/stores/folderStore';
import { useSettingsStore } from '@/stores/settingsStore';
import RepoCheckPanel from './RepoCheckPanel';
import WsRepoSection from './WsRepoSection';

// P16-7（第 286 条）：对照仓库并进过期检测 —— 只查这个项目时它就是那一页，整个工作区时是 WsRepoSection。
// ⛔ 这个页签上不许出现「作废」两个字（08-23 / S1：「更正一处 / 整条取代 / 不动」）—— P16-4 那一块写过「整条作废」。

const outcome = { ok: true, text: '', cuts: null, kind: null, message: null, status: 200, inputTokens: 1,
                  outputTokens: 1, cachedInputTokens: null, reasoningTokens: null, ms: 1, model: 'm' };

const zh = (): void => {
  // ⚠️ zustand v5 renders on the server from `getInitialState()` (memory isolated-verify-workflow §45).
  Object.assign(useSettingsStore.getInitialState(), { language: 'zh' });
};

describe('只查这个项目、连着文件夹：对照仓库那一页', () => {
  it('新的一方是仓库写「仓库（提交记录）」、是另一块照写块号；按钮是这一页的三个名字', () => {
    zh();
    const scan = {
      outcome,
      blocks: [
        { staleSeq: 3, kind: 'supersedes', why: '仓库说不做 RFT', quoteStale: '跑 RFT', from: 'commits', quoteNew: 'drop RFT', retyped: false },
        { staleSeq: 4, kind: 'corrects', why: '后来的块改了', quoteStale: '旧计划', from: '#15', quoteNew: '新计划', retyped: false },
      ],
      followUps: [{ itemId: 'fu1', line: '学院 GPU 要排多久', standing: false, why: '不跑了', from: 'README.md', quoteNew: '不做' }],
      summary: { text: 'flux 只做本地 LoRA', why: '摘要还写着 RFT' },
      dropped: [],
      workspaceId: 'w',
    } as unknown as RepoCheckScan;
    Object.assign(useCompressStore.getInitialState(), {
      repoCheck: { t1: { scan, blocks: [], decided: {}, startedAt: 0, synced: false } },
    });
    Object.assign(useFolderStore.getInitialState(), { views: { t1: { name: 'flux' } } });
    const html = renderToStaticMarkup(<RepoCheckPanel threadId="t1" />);
    expect(html).toContain('连着的文件夹（flux）');
    expect(html).toContain('仓库（提交记录） 里：');
    expect(html).toContain('#15 里：');
    expect(html).toContain('仓库（README.md） 里：');
    for (const b of ['更正一处', '整条取代', '不动', '关掉', '留着', '换成这句', '不用', '再查一遍']) expect(html).toContain(b);
    expect(html).not.toContain('作废');
  });
});

describe('整个工作区、连着文件夹：多出来的三样', () => {
  it('三类各一节、各有自己的按钮；不出现「作废」', () => {
    zh();
    const repo: WsRepoItems = {
      workspaceId: 'w',
      blocks: [{ stale: { threadId: 't1', blockId: 'b3', seq: 3 }, kind: 'supersedes', why: '仓库说不做', quoteStale: '跑 RFT', from: 'plans/FINAL.md', quoteNew: '**不做：** RFT', retyped: false }],
      followUps: [{ threadId: 't2', itemId: 'fu1', line: '学院 GPU', standing: false, why: '不跑了', by: null, from: 'commits', quoteNew: 'drop' }],
      summaries: [{ threadId: 't1', text: 'flux 只做本地 LoRA', why: '摘要还写着 RFT' }],
      dropped: [{ kind: 'block', label: 'P1#9', why: 'x', quote: 'y', reason: 'quote_new' }],
      synced: false,
    };
    const name = (id: string) => (id === 't1' ? 'flux' : '导师沟通');
    const html = renderToStaticMarkup(
      <WsRepoSection repo={repo} decided={{}} name={name} label={(r) => `〈${name(r.threadId)}〉#${r.seq}`} onDecide={() => {}} />,
    );
    expect(html).toContain('被仓库推翻的旧块（1）');
    expect(html).toContain('仓库（plans/FINAL.md）：');
    expect(html).toContain('前提没了的跟进（1）');
    expect(html).toContain('〈导师沟通〉在跟进：学院 GPU');
    expect(html).toContain('仓库（提交记录） 里：');
    expect(html).toContain('〈flux〉的摘要可以换成：flux 只做本地 LoRA');
    expect(html).toContain('另有 1 条原话对不上');
    for (const b of ['更正一处', '整条取代', '不动', '关掉', '留着', '换成这句', '不用']) expect(html).toContain(b);
    expect(html).not.toContain('作废');
  });
});
