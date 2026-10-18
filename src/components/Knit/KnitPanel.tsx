import { useEffect, type KeyboardEvent } from 'react';
import { useT } from '@/lib/i18n';
import { knitState, PATCH_STITCHES } from '@/lib/knit/knit';
import { useBlocksStore } from '@/stores/blocksStore';
import { useCaptureStore } from '@/stores/captureStore';
import { knitItemName, useKnitStore } from '@/stores/knitStore';
import { PatchSwatch } from './KnitArt';

// 织布（Ocean 2026-10-17）—— 左栏那一小块：正在织的这一块布、今天织了几针、这一块还差几针；底下一行是
// 攒了几块、下一件织什么。⭐ 整块点一下 = 打开底部的柜子（「兑换的入口设置在柜子里和点击显示当前织了多少的
// 小组件，作为隐藏入口，安静放置」）—— ⛔ 没有按钮、没有箭头，只有悬停时的提示和手形光标。
//
// ⚠️ SpoolCard 那几条排版规矩照旧（一句话不拆开、一种字色、旁边只有两行字）：它们是 Ocean 一条一条
// 定下来的，换的只是左边那个记号和两句话说的东西。

const Fact = ({ text, accent }: { text: string; accent?: boolean }) => (
  <span className={`whitespace-nowrap text-[13px] ${accent ? 'text-accent' : 'text-ink-2'}`}>{text}</span>
);

/** Re-reads the counts the way SpoolCard re-read its own: after a capture, after any change to the
 *  blocks on screen, and when the window comes back to the front (that is what carries 今天 over
 *  midnight). Mounted once, by SpoolCard. */
export function useKnitRefresh(): void {
  const refresh = useKnitStore((s) => s.refresh);
  const flashBlockId = useCaptureStore((s) => s.flashBlockId);
  const byThread = useBlocksStore((s) => s.byThread);
  useEffect(() => {
    void refresh().catch((e) => console.warn('[knit] refresh failed', e));
  }, [refresh, flashBlockId, byThread]);
  useEffect(() => {
    const onFocus = (): void => void refresh().catch(() => {});
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);
}

const openOnKey = (e: KeyboardEvent, open: () => void): void => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    open();
  }
};

/** The swatch and the two lines beside it — the panel's counting face. */
export function KnitFace() {
  const t = useT();
  const stitches = useKnitStore((s) => s.stitches);
  const today = useKnitStore((s) => s.today);
  const redemptions = useKnitStore((s) => s.redemptions);
  const toggle = useKnitStore((s) => s.toggleDrawer);
  const k = knitState(stitches, redemptions);
  const left = PATCH_STITCHES - k.onPatch;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => openOnKey(e, toggle)}
      title={t('打开柜子')}
      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 outline-none"
    >
      <div className="flex-none rounded border border-line p-[3px]">
        <PatchSwatch onPatch={k.onPatch} today={Math.min(today, k.onPatch)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-y-0.5 leading-snug">
        <Fact text={t('今天织了 {n} 针', { n: today })} />
        <Fact text={t('这一块还差 {n} 针', { n: left })} />
      </div>
    </div>
  );
}

/** The line under the hairline: how many patches are put by, and what is next. */
export function KnitFooter() {
  const t = useT();
  const stitches = useKnitStore((s) => s.stitches);
  const redemptions = useKnitStore((s) => s.redemptions);
  const toggle = useKnitStore((s) => s.toggleDrawer);
  const k = knitState(stitches, redemptions);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => openOnKey(e, toggle)}
      title={t('打开柜子')}
      className="mt-2 flex cursor-pointer items-baseline justify-between gap-x-3 border-t border-line pt-1.5 outline-none"
    >
      <span className="whitespace-nowrap text-[11.5px] text-muted">{t('攒了 {n} 块布', { n: k.inStock })}</span>
      <span className="truncate text-[11.5px] text-muted">
        {k.next ? t('下一件：{item}', { item: knitItemName(k.next.id) }) : t('柜子织满了')}
      </span>
    </div>
  );
}
