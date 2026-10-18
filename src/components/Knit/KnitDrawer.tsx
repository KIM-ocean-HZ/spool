import { ChevronDown } from 'lucide-react';
import { useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { canRedeem, KNIT_ITEMS, knitState, PATCH_STITCHES } from '@/lib/knit/knit';
import { knitItemName, useKnitStore } from '@/stores/knitStore';
import { KnitItemArt } from './KnitArt';

// 织布（Ocean 2026-10-17）—— 柜子。原话：「在界面底部的对话框出弹开就是一个抽屉，用户兑换的物品都会收集在
// 里面，合上柜子就是正常界面。兑换的入口设置在柜子里和点击显示当前织了多少的小组件，作为隐藏入口，安静放置」。
//
// ⭐ 从中间那一栏的底部（输入框那里）往上拉开，盖住下半截；合上就什么都没有 —— ⛔ 合着的时候不留把手、
// 不留按钮：入口只有左栏那一小块（点一下）。柜子里是几层搁板，一件一格：织成的上色、写哪天织成的；下一件
// 写要几块布和「织成…」；再往后的只有虚线轮廓和要价（层层加深难度，看得见后面还有什么）。

/** One shelf: the things stand on a line SHELF_PX down, their names sit under it. */
const ROW_PX = 168;
const SHELF_PX = 84;

const dayOf = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export default function KnitDrawer() {
  const t = useT();
  const open = useKnitStore((s) => s.drawerOpen);
  const setDrawer = useKnitStore((s) => s.setDrawer);
  const stitches = useKnitStore((s) => s.stitches);
  const redemptions = useKnitStore((s) => s.redemptions);
  const redeem = useKnitStore((s) => s.redeem);
  const k = knitState(stitches, redemptions);

  // Esc closes it, like every other surface that slides over the work.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setDrawer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setDrawer]);

  return (
    <section
      aria-hidden={!open}
      aria-label={t('柜子')}
      data-knit-drawer
      // ⚠️ `invisible` when shut, not just pushed below the edge: pushed down, its shadow still
      // shows over the input box and Tab still walks into its buttons. visibility flips at the END
      // of the slide out and at the START of the slide in, so the animation is untouched.
      className={`absolute inset-x-0 bottom-0 z-30 flex max-h-[62%] flex-col rounded-t-xl border-t border-line-strong bg-paper shadow-[0_-8px_24px_rgba(0,0,0,0.08)] transition-[transform,visibility] duration-300 ease-out ${
        open ? 'visible translate-y-0' : 'pointer-events-none invisible translate-y-full'
      }`}
    >
      <button
        type="button"
        onClick={() => setDrawer(false)}
        aria-label={t('合上柜子')}
        title={t('合上柜子')}
        className="mx-auto mt-2 h-1 w-9 flex-none rounded-full bg-line-strong"
      />
      <div className="flex flex-none items-baseline gap-3 px-6 pb-2 pt-2">
        <span className="font-serif text-[19px] text-ink">{t('柜子')}</span>
        <span className="text-[12px] text-muted">
          {t('手里有 {n} 块布 · 一共织好 {m} 块', { n: k.inStock, m: k.made })}
        </span>
        <button
          type="button"
          onClick={() => setDrawer(false)}
          className="ml-auto flex items-center gap-1 text-[12px] text-muted transition-colors hover:text-ink"
        >
          {t('合上')}
          <ChevronDown size={13} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        {/* Shelves, not cards: the lines are the ul's own background, one per row, so a row with
            room left on it shows empty shelf — that is where the next version's things go. */}
        <ul
          className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))]"
          style={{
            gridAutoRows: ROW_PX,
            backgroundImage: `linear-gradient(to bottom, transparent ${SHELF_PX}px, var(--line-strong) ${SHELF_PX}px, var(--line-strong) ${SHELF_PX + 2}px, transparent ${SHELF_PX + 2}px)`,
            backgroundSize: `100% ${ROW_PX}px`,
          }}
        >
          {KNIT_ITEMS.map((item) => {
            const made = k.owned[item.id];
            const check = canRedeem(k, item.id);
            const isNext = k.next?.id === item.id;
            return (
              <li key={item.id} data-knit-item={item.id} className="flex flex-col items-center px-1 text-center">
                <div className="flex flex-none items-end justify-center" style={{ height: SHELF_PX }}>
                  <KnitItemArt id={item.id} made={made !== undefined} size={72} />
                </div>
                <span className={`mt-2 text-[13px] ${made !== undefined || isNext ? 'text-ink' : 'text-muted'}`}>
                  {knitItemName(item.id)}
                </span>
                {made !== undefined ? (
                  <span className="text-[11px] text-muted">{t('{d} 织成', { d: dayOf(made) })}</span>
                ) : (
                  <span className="text-[11px] text-muted">{t('要 {n} 块布', { n: item.cost })}</span>
                )}
                {isNext && (
                  <button
                    type="button"
                    disabled={check !== 'ok'}
                    onClick={() => void redeem(item.id)}
                    className="mt-1.5 whitespace-nowrap rounded-md border border-accent/60 px-2.5 py-1 text-[12px] text-accent transition-colors enabled:hover:bg-accent/10 disabled:border-line disabled:text-muted"
                  >
                    {check === 'ok'
                      ? t('织成{item}', { item: knitItemName(item.id) })
                      : t('还差 {n} 块布', { n: item.cost - k.inStock })}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
          {t('一针 = 你自己的一块（捕捉的或自己写的，AI 写的不算）；{n} 针织成一块布。攒够了布，就能织下一件。', {
            n: PATCH_STITCHES,
          })}
        </p>
      </div>
    </section>
  );
}
