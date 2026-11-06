import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Lock } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type WheelEvent as ReactWheelEvent } from 'react';
import {
  CLOSE_SWITCHER_COMMAND,
  OVERLAY_LANGUAGE_EVENT,
  OVERLAY_SCHEME_EVENT,
  OVERLAY_THEME_EVENT,
  SWITCHER_DISMISS_EVENT,
  SWITCHER_SHOW_EVENT,
  type SwitcherPayload,
} from '@/lib/capture/overlayProtocol';
import { SWITCHER_IDLE_MS, SWITCHER_MIDDLE, SWITCHER_ROWS, pickedOnClose, wheelStep } from '@/lib/capture/switcher';
import { useAppliedTheme } from '@/hooks/useTheme';
import { useAppliedColorScheme } from '@/hooks/useColorScheme';
import { colorSchemeOrDefault } from '@/lib/colorScheme';
import { themeOrDefault } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { useSettingsStore } from '@/stores/settingsStore';

// P15-4（Ocean 2026-11-06 第 255 – 256 条）—— 双击 ⇧ 唤出的「切换捕捉目标」面板。原话：「最好唤醒的切换捕捉
// 目标界面是可以直接用鼠标滚轮上下滑动选中，然后点击周围退出的」「点面板外面关掉时：保留中间那个」。
//
// 像老式的滚轮选择器：中间那一行就是选中的，滚轮一格换一个，上下渐淡；点某一行 = 选它并关；点外面（主进程看着
// 鼠标）/ 再双击 ⇧ / 几秒不动 = 关，保留中间那个。关掉那一刻才生效，没动过就什么都不变。
// ⛔ 不抢键盘（误弹出来，人接着打字不受影响），⛔ 不开库 —— 列表随 show 进来，选了什么交回主窗口去设。

/** The panel's rows, as the window is sized for them (switcher.rs: HEAD + ROW_HEIGHT × 7 + HINT). */
const ROW_PX = 28;
const HEAD_PX = 30;
const HINT_PX = 26;
/** How faint a row is, by how far it is from the middle one. */
const FADE = [1, 0.62, 0.4, 0.24];

export interface SwitcherView {
  payload: SwitcherPayload;
  index: number;
}

/** The seven rows around `index` — null where the list has run out. Exported for the tests. */
export const visibleRows = (view: SwitcherView): Array<{ slot: number; at: number | null }> =>
  Array.from({ length: SWITCHER_ROWS }, (_, slot) => {
    const at = view.index - SWITCHER_MIDDLE + slot;
    return { slot, at: at >= 0 && at < view.payload.items.length ? at : null };
  });

/** What the window draws — split from the event wiring so it can be rendered on its own. */
export function SwitcherPanel({
  view,
  onWheel,
  onPick,
}: {
  view: SwitcherView;
  onWheel?: (e: ReactWheelEvent<HTMLDivElement>) => void;
  onPick?: (index: number) => void;
}) {
  const t = useT();
  const { items, currentId } = view.payload;
  return (
    <div
      onWheel={onWheel}
      className="flex h-full w-full select-none flex-col overflow-hidden rounded-lg border border-line-strong bg-paper"
    >
      <div className="flex flex-none items-center px-3 font-ui text-[11px] text-muted" style={{ height: HEAD_PX }}>
        {t('捕捉到哪个项目')}
      </div>
      <div className="relative flex-none" style={{ height: ROW_PX * SWITCHER_ROWS }}>
        {items.length === 0 ? (
          <div
            className="absolute inset-x-0 flex items-center justify-center text-xs text-muted"
            style={{ top: ROW_PX * SWITCHER_MIDDLE, height: ROW_PX }}
          >
            {t('还没有没完成的项目')}
          </div>
        ) : (
          visibleRows(view).map(({ slot, at }) => {
            if (at === null) return null;
            const item = items[at]!;
            const middle = slot === SWITCHER_MIDDLE;
            const fade = FADE[Math.abs(slot - SWITCHER_MIDDLE)] ?? 0.2;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick?.(at)}
                className={`absolute inset-x-1.5 flex items-center gap-1.5 rounded-md px-2 text-left ${
                  middle ? 'bg-accent/10 text-ink ring-1 ring-accent/40' : 'text-ink-2 hover:bg-paper-2'
                }`}
                style={{ top: ROW_PX * slot + 1, height: ROW_PX - 2, opacity: fade }}
              >
                <span className="min-w-0 max-w-[45%] flex-none truncate text-[11px] text-muted">{item.workspaceTitle}</span>
                <span className="flex-none text-[11px] text-muted">·</span>
                <span className={`min-w-0 flex-1 truncate text-[13px] ${middle ? 'font-medium' : ''}`}>{item.title}</span>
                {item.private && <Lock size={10} className="flex-none text-muted" aria-label={t('私密')} />}
                {item.id === currentId && <span className="flex-none text-[10px] text-accent">{t('现在')}</span>}
              </button>
            );
          })
        )}
      </div>
      <div className="flex flex-none items-center px-3 text-[10px] text-muted" style={{ height: HINT_PX }}>
        {t('滚轮换项目 · 点一行，或点外面完成')}
      </div>
    </div>
  );
}

export default function TargetSwitcher() {
  // Same as the capture card: this window is a separate process with no settings store of its
  // own, so the language, theme and scheme are pushed in with every show (overlay.rs).
  useAppliedTheme();
  useAppliedColorScheme({ ready: true, rememberHint: false });
  const [view, setView] = useState<SwitcherView | null>(null);
  const viewRef = useRef<SwitcherView | null>(null);
  viewRef.current = view;
  const touched = useRef(false);
  const carry = useRef(0);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback((): void => {
    if (idle.current) clearTimeout(idle.current);
    idle.current = null;
    const v = viewRef.current;
    const picked = v ? pickedOnClose(v.payload, v.index, touched.current) : null;
    setView(null);
    touched.current = false;
    carry.current = 0;
    void invoke(CLOSE_SWITCHER_COMMAND, { picked }).catch((e) => console.error('[switcher] close failed', e));
  }, []);

  const keepOpen = useCallback((): void => {
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(close, SWITCHER_IDLE_MS);
  }, [close]);

  useEffect(() => {
    let unlisten: Array<() => void> = [];
    let cancelled = false;
    void (async () => {
      const disposers = await Promise.all([
        listen<'zh' | 'en'>(OVERLAY_LANGUAGE_EVENT, (e) => useSettingsStore.setState({ language: e.payload })),
        listen<string>(OVERLAY_THEME_EVENT, (e) => useSettingsStore.setState({ theme: themeOrDefault(e.payload) })),
        listen<string>(OVERLAY_SCHEME_EVENT, (e) =>
          useSettingsStore.setState({ colorScheme: colorSchemeOrDefault(e.payload) }),
        ),
        listen<SwitcherPayload>(SWITCHER_SHOW_EVENT, (e) => {
          touched.current = false;
          carry.current = 0;
          setView({ payload: e.payload, index: 0 });
          keepOpen();
        }),
        listen(SWITCHER_DISMISS_EVENT, () => close()),
      ]);
      if (cancelled) disposers.forEach((d) => d());
      else unlisten = disposers;
    })();
    return () => {
      cancelled = true;
      unlisten.forEach((d) => d());
      if (idle.current) clearTimeout(idle.current);
    };
  }, [close, keepOpen]);

  if (!view) return null;

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>): void => {
    const native = e.nativeEvent as WheelEvent & { wheelDeltaY?: number };
    const { step, carry: next } = wheelStep(carry.current, {
      deltaY: e.deltaY,
      deltaMode: e.deltaMode,
      wheelDeltaY: native.wheelDeltaY,
    });
    carry.current = next;
    keepOpen();
    if (step === 0) return;
    setView((v) => {
      if (!v) return v;
      const index = Math.min(Math.max(v.index + step, 0), Math.max(v.payload.items.length - 1, 0));
      if (index !== v.index) touched.current = true;
      return { ...v, index };
    });
  };

  const onPick = (index: number): void => {
    touched.current = true;
    viewRef.current = viewRef.current ? { ...viewRef.current, index } : null;
    close();
  };

  return <SwitcherPanel view={view} onWheel={onWheel} onPick={onPick} />;
}
