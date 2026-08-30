import { describe, it, expect } from 'vitest';
import {
  relationAlreadySettled,
  supersedeProposalSettled,
  wouldOverwriteRelation,
} from './staleGuards';
import type { Block } from '@/lib/db/blocks';

/** 只造这两道闸看得见的那几个字段。 */
const block = (id: string, refBlockId: string | null = null, refKind: Block['refKind'] = null,
               staleAt: number | null = null): Block =>
  ({ id, seq: 1, refBlockId, refKind, threadId: 't', kind: 'text', content: '', annotation: null,
     annotationBy: null, refThreadId: null, source: null, pinned: false, createdAt: 0,
     staleAt, sourceUrl: null, retrievedAt: null, recheckAfter: null,
     correctedQuote: null, gist: null, refNote: null, gistBy: null,
     refReviewedStaleAt: null,
     originalContent: null, compressedAt: null });

const OLD = block('old');
/** 同一个旧块，⚠️ 已经退役了 —— 「整条取代」是两个字段一起才算做完。 */
const OLD_RETIRED = block('old', null, null, 111);

describe('relationAlreadySettled —— 库里已经有这条关系，就别再问一遍', () => {
  it('新块带着 corrects 指着旧块 = 已经决定过', () => {
    expect(relationAlreadySettled(OLD, block('new', 'old', 'corrects'))).toBe(true);
  });

  it('新块带着 supersedes 指着旧块 = 也已经决定过', () => {
    expect(relationAlreadySettled(OLD, block('new', 'old', 'supersedes'))).toBe(true);
  });

  // ⛔⛔ 这一条是这个文件存在的理由（2026-08-24 第六轮 0d）。
  // `cites` 存的是 refBlockId 有值 + refKind 是 null。按 refKind 判的话它漏过去，
  // 用户于是被问一件他自己已经连过线的事。
  it('⛔ 新块用 cites 指着旧块（refKind 是 null）—— 同样是已经决定过', () => {
    expect(relationAlreadySettled(OLD, block('new', 'old', null))).toBe(true);
  });

  it('指着别的块 = 没决定过这一条，该拿出来问', () => {
    expect(relationAlreadySettled(OLD, block('new', 'somewhere-else', 'corrects'))).toBe(false);
  });

  it('谁也没指 = 该问', () => {
    expect(relationAlreadySettled(OLD, block('new'))).toBe(false);
  });

  it('有一块不在了 = 不当成已决定（后面那道闸会拦）', () => {
    expect(relationAlreadySettled(undefined, block('new', 'old', 'corrects'))).toBe(false);
    expect(relationAlreadySettled(OLD, undefined)).toBe(false);
  });
});

describe('wouldOverwriteRelation —— 写下去会冲掉新块上已有的那条', () => {
  // ⛔⛔ 第六轮实测那 30 次里，模型提的 6 条有 4 条正好是这个形状：
  // UCLA #10 指着「申请帮助 #12」，refKind 是 null。按 refKind 判，这道闸不触发，
  // setBlockSupersession 就把那条引用**悄悄改写掉了，界面不报错**。
  it('⛔ 新块用 cites 指着别的块（refKind 是 null）—— 必须拒绝', () => {
    expect(wouldOverwriteRelation(OLD, block('new', 'another-block', null))).toBe(true);
  });

  it('新块带着 corrects 指着别的块 —— 拒绝', () => {
    expect(wouldOverwriteRelation(OLD, block('new', 'another-block', 'corrects'))).toBe(true);
  });

  it('新块谁也没指 —— 放行（没有东西会被冲掉）', () => {
    expect(wouldOverwriteRelation(OLD, block('new'))).toBe(false);
  });

  it('新块正指着这个旧块 —— 放行（那一条在上一道闸就被摘走了）', () => {
    expect(wouldOverwriteRelation(OLD, block('new', 'old', 'corrects'))).toBe(false);
  });

  it('新块不在了 —— 不由这道闸报（调用处另有一句「这两块里有一块已经不在了」）', () => {
    expect(wouldOverwriteRelation(OLD, undefined)).toBe(false);
  });

  // ⭐ 两道闸合起来必须是**互斥且穷尽**的：一条提议要么被摘走、要么被拒、要么放行，
  // ⛔ 不许出现「既没摘走也没拒、但会冲掉东西」的缝 —— 那正是 0d 抓到的那条缝。
  it('⭐ 新块只要指着谁，就一定被这两道闸之一挡住', () => {
    for (const kind of ['corrects', 'supersedes', null] as const) {
      const pointsAtOld = block('new', 'old', kind);
      const pointsElse = block('new', 'elsewhere', kind);
      expect(relationAlreadySettled(OLD, pointsAtOld) || wouldOverwriteRelation(OLD, pointsAtOld)).toBe(true);
      expect(relationAlreadySettled(OLD, pointsElse) || wouldOverwriteRelation(OLD, pointsElse)).toBe(true);
    }
  });
});

// ⛔⛔ 2026-08-29：AI 提的那条「整条取代」走的是另一把尺子。
//
// 真库里两条 MCP 提案（都在「申请规划」）被上面那把尺子静默吞掉了：
// `#23` 早就带着 `corrects → #21`、`#26` 早就带着 `corrects → #23`，
// 于是 `loadProposedStale` 一条都留不下，「过期检测」页签根本不出现 ——
// 而 AI 那边已经跟用户说过「有两条在 Spool 等你」。
describe('supersedeProposalSettled —— AI 提的「整条取代」问过没有', () => {
  // ⭐⭐ 这一条就是那个 bug 本身。
  it('⛔ 库里是 corrects（旧块留着）—— 提案要的是整条退掉，还没问过，必须留下', () => {
    expect(supersedeProposalSettled(OLD, block('new', 'old', 'corrects'))).toBe(false);
  });

  // ⭐⭐ Ocean 复核指出的第二条边界：**只看 ref_kind 会再造一次同样的静默隐藏。**
  // `setBlockSupersession` 的两条 SQL 中间没有事务；退役按钮又是个纯开关（点两下就回来）。
  // ⇒ 「新块 supersedes、旧块仍 live」是到得了的状态，而那时候旧块**还在进每一份 pack**。
  it('⛔ supersedes 但旧块仍 live —— 只做了一半，提案要留着当重试入口', () => {
    expect(supersedeProposalSettled(OLD, block('new', 'old', 'supersedes'))).toBe(false);
  });

  it('supersedes 且旧块已经退役 —— 两个字段都写成了，这才算做完，摘走', () => {
    expect(supersedeProposalSettled(OLD_RETIRED, block('new', 'old', 'supersedes'))).toBe(true);
  });

  // ⚠️ 旧块退役了、但关系仍是 corrects —— 那条「整条取代」的关系还没建立，照样要问。
  it('corrects + 旧块已退役 —— 仍然显示（关系还是 corrects）', () => {
    expect(supersedeProposalSettled(OLD_RETIRED, block('new', 'old', 'corrects'))).toBe(false);
  });

  // ⚠️ T2 那条判断不动：cites 是用户自己连的引用线。
  it('库里是 cites（refKind 是 null）—— 照旧算已经决定过，摘走', () => {
    expect(supersedeProposalSettled(OLD, block('new', 'old', null))).toBe(true);
  });

  it('指着别的块 / 谁也没指 —— 都该问', () => {
    expect(supersedeProposalSettled(OLD, block('new', 'somewhere-else', 'corrects'))).toBe(false);
    expect(supersedeProposalSettled(OLD, block('new'))).toBe(false);
  });

  it('有一块不在了 —— 不当成已决定（和上面那把尺子一致）', () => {
    expect(supersedeProposalSettled(undefined, block('new', 'old', 'corrects'))).toBe(false);
    expect(supersedeProposalSettled(OLD, undefined)).toBe(false);
  });

  // ⭐ 两把尺子只在**没做完**的那两格上不同 —— ⛔ 扫描那把（`relationAlreadySettled`）一个字没改。
  // 它问「有没有关系」，这把问「提案要的那件事做完没有」。
  it('⭐ 差别恰好是 corrects、以及 supersedes 只写了一半那两格', () => {
    for (const older of [OLD, OLD_RETIRED]) {
      for (const kind of ['corrects', 'supersedes', null] as const) {
        const newer = block('new', 'old', kind);
        const differ =
          relationAlreadySettled(older, newer) !== supersedeProposalSettled(older, newer);
        const halfDone = kind === 'supersedes' && older.staleAt === null;
        expect(differ).toBe(kind === 'corrects' || halfDone);
      }
    }
  });

  // ⚠️ 这把尺子放行的那几条，`decideStale` 那道闸必须**不**拦 —— 否则用户点了没反应。
  // ⭐ 它们指着的都是**同一个**旧块，所以 `wouldOverwriteRelation` 一定是 false。
  it('⭐ 放行的每一条都过得了 decideStale 那道闸', () => {
    for (const older of [OLD, OLD_RETIRED]) {
      for (const kind of ['corrects', 'supersedes', null] as const) {
        const newer = block('new', 'old', kind);
        if (supersedeProposalSettled(older, newer)) continue;
        expect(wouldOverwriteRelation(older, newer)).toBe(false);
      }
    }
  });
});
