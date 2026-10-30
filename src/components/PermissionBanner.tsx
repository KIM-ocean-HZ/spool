import { invoke } from '@tauri-apps/api/core';
import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { usePermissionStore, type CapturePermission } from '@/stores/permissionStore';
import { useSettingsStore } from '@/stores/settingsStore';

// Quiet onboarding bar (2026-07-07): without the macOS Input Monitoring grant the
// double-tap ⌥ CGEventTap only sees Spool's own events — capture works in-app and
// silently does nothing everywhere else (double_tap.rs module doc). Shown at the top
// of the main window while the grant is missing. A fresh grant only takes effect on
// the next launch — probe-verified 2026-07-31: the running process never sees the
// grant flip on the CG side (same binary, new process preflights true while the old
// one polls false forever), so rebuilding the tap in place is a dead end. When the
// re-check (on window focus, i.e. coming back from System Settings) sees it flip,
// the copy swaps to a one-click "restart Spool now" button (§2.1 route A).
//
// 2026-07-08: TCC binds the grant to the code signature (csreq), so with ad-hoc dev
// builds the System Settings toggle can show ON while preflight still reports false —
// the listed entry belongs to a stale build. The user-side fix (verified live by
// Ocean): remove the stale "Spool" entry with −, fully quit via the tray (closing the
// window only hides it), reopen and grant the fresh prompt, then quit-and-restart once
// more. The denied phase carries that recovery line, since the UI cannot tell a
// never-granted state from a stale-grant state.

// 2026-08-02 (DESIGN_FIRST_RUN 拍板点 4): the resting line no longer reads as a chore
// the user owes the system. It names what is still missing, and — more importantly —
// what works right now without it, so a first-launch user has somewhere to go. The
// "fully quit and reopen" instruction moved into the `asked` phase: it only means
// anything after the user has actually gone for the grant.

// 2026-08-18 (Windows port): off macOS this whole banner stays `hidden`. Windows has no TCC,
// so `input_monitoring_granted` answers true and the chain below resolves to `hidden`; and the
// old capture-unbound nudge is gone because Windows now HAS a built-in gesture — double-tap
// Ctrl (double_tap_win.rs), on Raw Input rather than a low-level keyboard hook precisely so
// antivirus has nothing to make of it. So an unbound capture key is a normal resting state on
// both platforms now (double-tap covers it), not a problem to surface.
//
// The language switch that used to ride this bar on first launch lives in Settings → 通用
// (heading written in both languages, and Settings lands there) — which is where a user who
// cannot read the guessed language finds it. On macOS the bar still carries it while a
// permission grant is missing, since that is the one screen a first-launch Mac user always sees.
// 2026-10-30 (DISCOVERED-20261030-5, Ocean:「需要在设置打开两个按钮，需要在提示中清晰指出，并且
// 每次一键引导用户去设置打开」): capture needs TWO switches — Input Monitoring (the gesture is
// heard outside Spool) and Accessibility (the note box takes the keyboard without a click —
// capture.rs `AXFrontmost refused` — and a capturing double-tap is not shared with another
// app). The bar used to check and name only the first, so it vanished once that was on. Now it
// lists both, each with its own button straight to its pane, and stays while either is off —
// every launch. The explainer still comes before macOS's first dialog, and only then: once TCC
// has an answer for Input Monitoring (`asked`), a press goes straight to System Settings.
// An Input Monitoring grant is never seen by the running process (see above), so after a trip
// to System Settings the bar offers the restart instead of waiting for a tick that won't come.
type Phase = 'hidden' | 'missing' | 'granted-later';

export default function PermissionBanner() {
  const t = useT();
  const language = useSettingsStore((s) => s.language);
  const update = useSettingsStore((s) => s.update);
  const inputMonitoring = usePermissionStore((s) => s.inputMonitoring);
  const accessibility = usePermissionStore((s) => s.accessibility);
  const asked = usePermissionStore((s) => s.asked);
  const everDenied = usePermissionStore((s) => s.everDenied);
  const requested = usePermissionStore((s) => s.requested);
  const check = usePermissionStore((s) => s.check);
  const open = usePermissionStore((s) => s.open);
  const [dismissed, setDismissed] = useState(false);
  // WORKPLAN-2026-08-20 §2.2: what the grant buys and what it does NOT change has to be
  // said BEFORE the system dialog, not in Settings after the fact. The dialog macOS
  // shows says "Spool wants to monitor your keyboard" and nothing else — a product whose
  // whole pitch is that it never goes online cannot let that sentence be the first thing
  // a stranger reads about its keyboard access. Holds the switch the press was for.
  const [explaining, setExplaining] = useState<CapturePermission | null>(null);
  const [explained, setExplained] = useState(false);
  // 任务三 #1 (2026-07-12): the stale-grant recovery walkthrough is details-on-demand
  // — the resting banner is one line, and the first screenful stays content, not
  // warnings.
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    void check();
    const onFocus = (): void => void check();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [check]);

  // Granted all along → nothing to say. Granted after we had shown the banner → the
  // tap stays deaf until relaunch, so offer the restart.
  //
  // Off macOS both grant commands always answer true (there is no TCC and the
  // double-tap Ctrl gesture needs no grant — double_tap_win.rs), so this resolves to
  // `hidden` there with no special case: capture works on first launch, nothing to nudge.
  const phase: Phase =
    inputMonitoring === null || accessibility === null
      ? 'hidden'
      : !inputMonitoring || !accessibility
        ? 'missing'
        : everDenied
          ? 'granted-later'
          : 'hidden';

  if (dismissed || phase === 'hidden') return null;

  const go = (which: CapturePermission): void => {
    if (asked === false && !explained) {
      setExplaining(which);
      return;
    }
    void open(which);
  };

  // ⚠️ Every claim on this card is checked against double_tap.rs, and has to stay that
  // way — it is read at the exact moment a stranger decides whether to trust this app
  // with their keyboard. With the grant, the tap's mask is FlagsChanged + LeftMouseDown
  // + KeyDown; the KeyDown branch reads the keycode, and when it is ⌘C/⌘X it stores one
  // timestamp (LAST_COPY_CHORD_NS) and nothing else. No keystroke is kept anywhere.
  // The System Events line: capture.rs `wait_for_consent` (DISCOVERED-20261030-2).
  const explainer = explaining ? (
    <div className="fixed inset-0 z-50 flex justify-center bg-ink/30 px-8 pt-[14vh]">
      <div
        className="h-fit w-[440px] rounded-lg border border-line-strong bg-paper px-5 py-4"
        style={{ boxShadow: 'var(--shadow-toast)' }}
      >
        <h2 className="font-serif text-lg text-ink">{t('捕捉要在系统设置里开两个开关')}</h2>
        <p className="mt-3 text-xs text-ink">{t('输入监控')}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-2">
          {t('Spool 用它分辨两件事：你有没有连按两下 ⌥，以及你按 ⌥ 之前是不是刚按了 ⌘C。')}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-2">
          {t('你打的字一个都不存。按下 ⌘C 时它只记一个时间点，别的按键看完就扔。')}
        </p>
        <p className="mt-3 text-xs text-ink">{t('辅助功能')}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-2">
          {t('捕捉卡一弹出来就能直接打字，不用先点一下；捕捉的那一下双击 ⌥ 也不会同时叫出别的 app。')}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-ink-2">
          {t('Spool 不联网，开了这两个权限也一样：没有服务器，没有账号，你存的东西只在这台电脑上。')}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          {t('点「继续」会打开系统设置的那一页，把 Spool 旁边的开关打开；macOS 第一次还会自己弹一个框问你。')}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {t('之后第一次在别的 app 里捕捉时，系统会再问能不能控制「System Events」——同意它，块上才记得是从哪个 app 来的。')}
        </p>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setExplaining(null)}
            className="rounded-md px-3 py-1 text-xs text-muted transition-colors hover:text-ink"
          >
            {t('先不开')}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => {
              const which = explaining;
              setExplaining(null);
              setExplained(true);
              void open(which);
            }}
            className="rounded-md border border-line-strong bg-paper px-3 py-1 text-xs text-ink-2 transition-colors hover:border-accent hover:text-accent"
          >
            {t('继续')}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const button =
    'flex-none rounded-md border border-line-strong bg-paper px-2.5 py-0.5 text-xs text-ink-2 transition-colors hover:border-accent hover:text-accent';

  const item = (which: CapturePermission, on: boolean, name: string, why: string) =>
    on ? (
      <span className="flex flex-none items-center gap-1 text-muted" title={why}>
        <Check size={12} className="flex-none" style={{ color: 'var(--status-active)' }} />
        {name}
      </span>
    ) : (
      <button type="button" onClick={() => go(which)} title={why} className={button}>
        {t('打开「{name}」', { name })}
      </button>
    );

  return (
    <div className="flex-none border-b border-line bg-paper-2 px-4 py-1.5 text-xs text-ink-2">
      {explainer}
      <div className="flex items-center gap-3">
        {phase === 'missing' ? (
          <>
            <span className="min-w-0 truncate">{t('在别的 app 里捕捉，要在系统设置里开两个开关：')}</span>
            {item(
              'input_monitoring',
              inputMonitoring === true,
              t('输入监控'),
              t('让 Spool 认出你在别的 app 里连按两下 ⌥。你打的字一个都不存。'),
            )}
            {item(
              'accessibility',
              accessibility === true,
              t('辅助功能'),
              t('让捕捉卡一弹出来就能直接打字，不用先点一下。'),
            )}
            {/* Below lg the window is too narrow for this line to be more than a stub of it. */}
            <span className="min-w-0 flex-1 truncate text-muted">
              <span className="hidden lg:inline">
                {requested
                  ? t('两个都打开之后，重启一次 Spool 才生效。')
                  : t('没开之前也能用：在下面写笔记，或者在 Spool 里复制后双击 ⌥。')}
              </span>
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate">{t('已授权 — 重启 Spool 后生效')}</span>
        )}
        {(phase === 'granted-later' || requested) && (
          <button
            type="button"
            onClick={() => {
              void invoke('restart_app').catch((e) =>
                console.warn('[permission] restart failed', e),
              );
            }}
            title={t('两个都打开之后，重启一次 Spool 才生效。')}
            className={button}
          >
            {phase === 'missing' ? t('重启 Spool') : t('立即重启 Spool')}
          </button>
        )}
        {/* Language escape hatch (2026-07-31, Ocean). The UI now starts in the system
            locale, so a first-launch user whose language guessed wrong needs a way back
            that does not require reading the language they can't read. This bar is the
            first thing on screen for every new install (the grant is always missing at
            that point), which makes it the one reliable place to put it. Writing the
            setting is also what marks the language as user-chosen — from here on nothing
            auto-follows the system locale. */}
        <div className="flex flex-none items-center gap-0.5">
          {(['zh', 'en'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => void update({ language: lang })}
              className={`rounded px-1.5 py-0.5 text-[11px] transition-colors ${
                language === lang ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {lang === 'zh' ? '中文' : 'English'}
            </button>
          ))}
        </div>
        {phase === 'missing' && (
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="flex-none text-muted transition-colors hover:text-accent"
          >
            {t('详情')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t('关闭')}
          className="flex-none rounded p-0.5 text-muted transition-colors hover:text-ink"
        >
          <X size={13} />
        </button>
      </div>
      {phase === 'missing' && detailsOpen && (
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
          {t(
            '已授权却仍看到本条？旧授权可能已失效：在系统设置的列表中选中 Spool 按 − 删除，完全退出并重新打开 Spool，允许新弹窗后再退出重启一次。',
          )}
        </p>
      )}
    </div>
  );
}
