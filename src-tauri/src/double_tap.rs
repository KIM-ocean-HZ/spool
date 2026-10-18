//! Double-tap ⌥ (Option) capture trigger (macOS only).
//!
//! A CGEventTap observes the key stream; we count clean ⌥ taps and emit
//! `capture-trigger` on a double-tap within a short window.
//!
//! Why a CGEventTap (not tauri-plugin-global-shortcut): a bare modifier key cannot be
//! registered as a RegisterEventHotKey global shortcut — that API needs a non-modifier
//! key. Observing the event stream is the only way to detect a modifier double-tap.
//!
//! Why ⌥, and why hardware timestamps: the trigger used to be a double-tap of ⌘C, but
//! ⌘C also issues Copy — in a heavy app (Word writes many rich-clipboard formats) that
//! Copy floods the system and delays our tap callback, inflating the measured interval
//! past the window so the double-tap was missed. Two fixes: (1) ⌥ on its own does
//! nothing, decoupling the trigger from Copy; (2) the interval is measured from each
//! event's CGEventGetTimestamp — stamped when the key was physically pressed — not
//! from wall-clock time at callback entry, which lags under load. The user still
//! presses ⌘C to copy, then double-taps ⌥.
//!
//! Suppression (2026-07-29): Claude Desktop's quick-entry ALSO fires on a double-tap
//! of ⌥, and being the MCP host it is always running — so every capture used to pop
//! Claude's window as well. The copy-gate (below) already decides WHICH app a given
//! double-tap belongs to; suppression makes that decision stick: the tap is created
//! as an ACTIVE tap (kCGEventTapOptionDefault) when Accessibility is granted, and
//! when Spool consumes a double-tap it deletes the 2nd press + its release from the
//! stream. Other listeners then see a single tap — no popup. A bare double-tap (no
//! recent ⌘C) is still passed through untouched, so Claude's own gesture keeps
//! working. NOTE: the core-graphics crate wrapper cannot delete events (its callback
//! maps `None` back to the original event), so the tap is created via raw
//! CGEventTapCreate with our own trampoline; returning NULL is the deletion.
//! Without Accessibility, creation of an active tap fails and we fall back to the
//! previous listen-only behavior (both apps see the gesture). The same fallback is
//! taken deliberately when Input Monitoring is missing (§5.3): the copy-gate below is
//! then unenforceable, and suppressing without a gate would swallow EVERY double-tap.
//!
//! Permissions (fixed 2026-07-07): a listen-only tap only receives OTHER processes'
//! events once the user grants Spool **Input Monitoring** (TCC). Without the grant,
//! tap creation still SUCCEEDS — macOS just silently delivers only this process's own
//! events, which is exactly "double-tap works inside Spool, dead everywhere else".
//! macOS does NOT prompt on tap creation for a listen-only tap, so install()
//! preflights via CGPreflightListenEventAccess. The ACTIVE tap additionally needs
//! **Accessibility** (AXIsProcessTrusted), preflighted the same way. The frontend asks
//! `input_monitoring_granted` (lib.rs) and shows a quiet banner pointing at System
//! Settings — a fresh grant only takes effect on the next launch, the already-created
//! tap stays deaf until restart. Dev note: every ad-hoc re-sign (each rebuild)
//! invalidates a previous grant; only a stable Developer ID / Spool Dev signature
//! keeps it.
//!
//! Prompting (2026-08-02, DESIGN_FIRST_RUN 拍板点 3): startup only preflights — it
//! never fires the two system prompts. A brand-new user used to meet "may we watch
//! your keyboard?" before seeing what the app is for; now the prompts fire from
//! `request_capture_access` below, which the banner's "turn on capture" button calls.
//! Value first, permission second.
//!
//! Self-heal (PLAN_EN.md §19.4): when macOS delivers `TapDisabledByTimeout` or
//! `TapDisabledByUserInput`, we re-enable the tap in place via `CGEventTapEnable`.
//! If two consecutive disable events fire (the re-enable didn't stick), we emit a
//! `capture-disabled` event so the UI can surface a one-time notice — a user-defined
//! capture shortcut (if bound in Settings) keeps working in either case.

#![cfg(target_os = "macos")]

use core_foundation::base::TCFType;
use core_foundation::boolean::CFBoolean;
use core_foundation::dictionary::CFDictionary;
use core_foundation::mach_port::{CFMachPort, CFMachPortRef};
use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
use core_foundation::string::{CFString, CFStringRef};
use core_graphics::event::{CGEvent, CGEventFlags, EventField};
use foreign_types::ForeignType;
use std::mem::ManuallyDrop;
use std::os::raw::c_void;
use std::sync::atomic::{AtomicBool, AtomicPtr, AtomicU64, AtomicU8, Ordering};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Runtime};

// =============================================================================
// §9.13 click-outside-to-dismiss
// =============================================================================
//
// While the capture toast is showing, capture.rs arms this watch with the toast's frame
// (global logical points). The same CGEventTap that detects ⌥ also observes left mouse
// downs; a click that lands OUTSIDE the armed frame dismisses the toast so the user can
// keep working. A click inside (the toast's own buttons / picker) is left alone. The
// watch is disarmed the moment the toast hides, so normal clicks are never intercepted.

// (x, y, w, h) of the toast in global logical points; None when no toast is up.
static OVERLAY_FRAME: Mutex<Option<(f64, f64, f64, f64)>> = Mutex::new(None);

// ⭐ P3-3（2026-10-02，Ocean「捕捉窗口长期固定」）：卡片上开了「固定窗口」，点外面不收起。
// ⚠️ 是「暂停」不是撤防：框照旧跟着 resize 更新，取消固定就接着生效；拖动过（disarm）的卡
// 照旧不再布防。每次新卡布防时清掉 —— 固定是**每张卡单独开**的。
static OVERLAY_DISMISS_HELD: AtomicBool = AtomicBool::new(false);

pub fn arm_overlay_dismiss(x: f64, y: f64, w: f64, h: f64) {
    *OVERLAY_FRAME.lock().unwrap() = Some((x, y, w, h));
    OVERLAY_DISMISS_HELD.store(false, Ordering::SeqCst);
}

pub fn hold_overlay_dismiss(held: bool) {
    OVERLAY_DISMISS_HELD.store(held, Ordering::SeqCst);
}

pub fn update_overlay_dismiss_height(h: f64) {
    if let Some(frame) = OVERLAY_FRAME.lock().unwrap().as_mut() {
        frame.3 = h;
    }
}

pub fn disarm_overlay_dismiss() {
    *OVERLAY_FRAME.lock().unwrap() = None;
}

// True only when armed AND the point is outside the toast frame.
fn click_outside_overlay(px: f64, py: f64) -> bool {
    match *OVERLAY_FRAME.lock().unwrap() {
        Some((x, y, w, h)) => px < x || px > x + w || py < y || py > y + h,
        None => false,
    }
}

// Hardware key codes for the left/right ⌥ (Option) keys — layout-independent.
const KEYCODE_OPT_LEFT: i64 = 58;
const KEYCODE_OPT_RIGHT: i64 = 61;

// kVK_ANSI_C / kVK_ANSI_X — positional virtual key codes for the copy/cut chords.
// Positional, so a non-QWERTY layout that relocates the letter C is not covered —
// acceptable: the product's mental model is literally "⌘C 然后双击 ⌥" (§10.2).
const KEYCODE_C: i64 = 8;
const KEYCODE_X: i64 = 7;
// kVK_ANSI_3 / 4 / 5 — the macOS screenshot chords (⌘⇧3 whole screen, ⌘⇧4 a selection,
// ⌘⇧5 the screenshot toolbar; with ⌃ the first two go to the clipboard instead of a file).
const KEYCODE_3: i64 = 20;
const KEYCODE_4: i64 = 21;
const KEYCODE_5: i64 = 23;

/// P7-7 (Ocean 2026-09-30 §9.2 第 11 条: 截完图直接双击 ⌥ 就能捕到) — what a screenshot chord
/// says about where the picture is going. 0 is reserved for "none".
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ShotKind {
    /// ⌘⇧3 / ⌘⇧4 — written to a file in the screenshot folder (after the floating thumbnail).
    File = 1,
    /// ⌃⌘⇧3 / ⌃⌘⇧4 — put on the clipboard.
    Clipboard = 2,
    /// ⌘⇧5 — the toolbar; where it goes is the toolbar's own setting, read at capture time.
    Toolbar = 3,
}

impl ShotKind {
    fn name(self) -> &'static str {
        match self {
            ShotKind::File => "file",
            ShotKind::Clipboard => "clipboard",
            ShotKind::Toolbar => "toolbar",
        }
    }
    fn from_u8(v: u8) -> Option<Self> {
        match v {
            1 => Some(ShotKind::File),
            2 => Some(ShotKind::Clipboard),
            3 => Some(ShotKind::Toolbar),
            _ => None,
        }
    }
}

/// Is this key-down one of the screenshot chords? ⌘ and ⇧ are both required (⌘3 alone is a
/// tab switch in half the apps on the machine).
fn screenshot_chord(keycode: i64, cmd: bool, shift: bool, ctrl: bool) -> Option<ShotKind> {
    if !cmd || !shift {
        return None;
    }
    match keycode {
        KEYCODE_3 | KEYCODE_4 if ctrl => Some(ShotKind::Clipboard),
        KEYCODE_3 | KEYCODE_4 => Some(ShotKind::File),
        KEYCODE_5 => Some(ShotKind::Toolbar),
        _ => None,
    }
}

/// The copy-gate's question for one opener (P7-7: a screenshot chord counts like a ⌘C): did it
/// happen within `window_ms` before this double-tap? `at_ns == 0` = never.
///
/// ⚠️ 2026-10-18 (Ocean, 〈HAI- Lecture5〉): the two are asked separately, no longer "whichever
/// came last". A ⌘C after a ⌘⇧4 used to hide the screenshot altogether, and the capture took the
/// text still on the clipboard from before — the picture went to a file, not to the clipboard.
/// Now the screenshot rides along with `copiedAfter`, and the capture asks whether that ⌘C
/// brought anything new (images.rs `clipboard_changed_since_shot`).
fn gate_open(at_ns: u64, now_ns: u64, window_ms: u64) -> bool {
    at_ns != 0 && at_ns <= now_ns && (now_ns - at_ns) / NANOS_PER_MS <= window_ms
}

/// The wall clock in ms — what screenshot files are dated by.
fn wall_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// P9H-7 ① (DISCOVERED-20261008-3, Ocean 10-16 第 152 条): ⌘⇧5 only opens a toolbar — the
// picture is taken when the user clicks in it, which can be long after the chord, past the
// 10 s gate below, and the double-tap that followed went to Claude. So a screenshot FILE
// written since that chord, within the gate's window, opens it too — only within
// SHOT_LINGER_MS of the chord, and only once the file has landed: the floating thumbnail holds
// it back ~5 s, and the overlay already tells the user to wait for the thumbnail to go.
// ⭐ 2026-10-18: ⌘⇧3/4 too (their picture is taken when the selection is done, not at the chord —
// a careful selection plus the thumbnail's 5 s is already most of the 10 s), and a picture still
// sitting in the thumbnail (images.rs `screenshot_pending_since`) counts as well as a landed one.
const SHOT_LINGER_MS: u64 = 5 * 60_000;

/// The question above, given when the newest screenshot since the chord landed (`landed_ms`,
/// None = none yet) and whether one is in the thumbnail now. All wall-clock ms.
fn late_shot_opens(
    kind: Option<ShotKind>,
    chord_ms: u64,
    landed_ms: Option<u64>,
    pending: bool,
    now_ms: u64,
    window_ms: u64,
) -> bool {
    matches!(kind, Some(ShotKind::File | ShotKind::Toolbar))
        && now_ms.saturating_sub(chord_ms) <= SHOT_LINGER_MS
        && (pending || landed_ms.is_some_and(|at| now_ms.saturating_sub(at) <= window_ms))
}

/// Look at the screenshot folders from inside the tap — on a helper thread, given at most 300 ms:
/// the tap is in the path of every key on the machine and macOS switches off a tap that stalls.
fn late_shot_seen(chord_ms: u64) -> (Option<u64>, bool) {
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let _ = tx.send((
            crate::images::screenshot_landed_since(chord_ms),
            crate::images::screenshot_pending_since(chord_ms),
        ));
    });
    rx.recv_timeout(std::time::Duration::from_millis(300)).unwrap_or((None, false))
}

// Copy-gate (2026-07-08): Claude Desktop's quick-entry popup ALSO triggers on a
// double-tap of ⌥, so a bare double-tap is ambiguous on machines running both. The
// capture mental model is "copy, then remember" (§10.2) — so Spool only treats a
// double-tap as capture when a ⌘C/⌘X was seen within this window; otherwise the
// double-tap is ignored and whatever else listens for it (Claude's popup) has the
// gesture to itself. Trade-off, documented: a copy made via a context menu (no
// keystroke) does not arm the gate — press ⌘C and double-tap again.
const COPY_GATE_WINDOW_MS: u64 = 10_000;

// ⭐ P3-4（2026-10-02，Ocean「如果用户在长按住 option 之前的两秒钟之内使用过 cmd c，则被复制的
// 内容会自动存进文本框」）。⚠️ 量到的是**这一下 ⌥ 按下**的时刻，⛔ 不是长按到点的时刻。
// ⛔ 和上面那个 10 秒的复制闸是两件事：那个决定双击归谁，这个只决定长按那张卡带不带字。
// 没有输入监听授权时 LAST_COPY_CHORD_NS 永远是 0 ⇒ 永远不成立 ⇒ 照旧空框。
const LONG_PRESS_COPY_WINDOW_MS: u64 = 2_000;

/// ⌘C / ⌘X 是不是落在这一下按下**之前** `window_ms` 之内、而且**还没被用过**。
/// `copy_ns == 0` = 从没见过；`used_ns` = 已经被用掉的那一下 ⌘C 的时刻（见 LONG_PRESS_COPY_USED_NS）。
/// 判断只在这里做一次，结果随 `note-trigger` 带走 —— ⛔ 前端不另算时间。
fn fresh_copy_within(copy_ns: u64, used_ns: u64, press_ns: u64, window_ms: u64) -> bool {
    copy_ns != 0
        && copy_ns != used_ns
        && copy_ns <= press_ns
        && (press_ns - copy_ns) / NANOS_PER_MS <= window_ms
}

// CGEventGetTimestamp (ns) of the last observed ⌘C/⌘X keydown; 0 = never.
static LAST_COPY_CHORD_NS: AtomicU64 = AtomicU64::new(0);
// The same keydown on the wall clock (ms) — images.rs gives the copying app a moment after it.
static LAST_COPY_WALL_MS: AtomicU64 = AtomicU64::new(0);

/// Wall ms of the last ⌘C/⌘X keydown, 0 = never.
pub fn last_copy_wall_ms() -> u64 {
    LAST_COPY_WALL_MS.load(Ordering::Relaxed)
}

// 2026-10-18: what the clipboard held at the last screenshot chord — (that chord's
// LAST_SHOT_NS, images::clipboard_fingerprint()). Read on a helper thread after the chord.
static SHOT_CLIPBOARD: Mutex<Option<(u64, Option<u64>)>> = Mutex::new(None);

/// The clipboard's fingerprint at the last screenshot chord; None when it was not measured
/// (no chord yet, or the newest chord's reading has not come back).
pub fn clipboard_at_shot() -> Option<Option<u64>> {
    let chord = LAST_SHOT_NS.load(Ordering::Relaxed);
    match *SHOT_CLIPBOARD.lock().unwrap() {
        Some((at, fingerprint)) if at == chord => Some(fingerprint),
        _ => None,
    }
}

// P7-7: the last screenshot chord — when (event clock, for the gate; wall clock, to find the
// file it writes) and which kind (`ShotKind as u8`, 0 = never).
static LAST_SHOT_NS: AtomicU64 = AtomicU64::new(0);
static LAST_SHOT_WALL_MS: AtomicU64 = AtomicU64::new(0);
static LAST_SHOT_KIND: AtomicU8 = AtomicU8::new(0);

// ⭐ P3 验收（Ocean 2026-10-02「复制后的内容已经被存了，或者说被 discard 了之后就不应该出现在
// 第二次的操作中，也就是说这个快捷方式只能是单次操作」）：已经用掉的那一下 ⌘C 的时刻。
// 一下 ⌘C 只带进一张长按卡 —— 那张卡存了还是放弃了都一样；双击 ⌥ 捕捉走了它也算用掉（字已经在库里了）。
// ⛔ 不清 LAST_COPY_CHORD_NS：它还管着双击的复制闸（10 秒），清掉它就改了双击的判定。
static LONG_PRESS_COPY_USED_NS: AtomicU64 = AtomicU64::new(0);

// Whether the copy-gate is enforced. Only true when Input Monitoring was granted at
// install time: without the grant the tap cannot see keyDown AT ALL (verified — even
// own-process synthetic ⌘C never arrives), so the gate could never arm and in-app
// double-tap capture would silently die. Ungranted also means no global events, so
// the Claude-popup conflict the gate exists for cannot happen — bypassing is safe.
static COPY_GATE_ACTIVE: AtomicBool = AtomicBool::new(false);

// Two ⌥ taps within this window count as a double-tap.
//
// ⚠️ 2026-08-25 (WORKPLAN §2.V4, Ocean): 500 → 250. It used to match the macOS system
// double-click default; it no longer does, and that is deliberate. Ocean's words while
// using the S-batch build: 「捕捉双击 option 现在间隔的时间太长了,导致我正常使用 option
// 也会被误判。」— at 500ms, two ordinary ⌥ presses half a second apart were being read as
// a capture gesture. The system double-click default is calibrated for a mouse aimed at a
// target; this key is one the user also presses for its normal job, so the window has to be
// short enough that deliberate double-tapping is the only thing that lands in it.
//
// ⚠️ The known cost, stated to Ocean before he picked 250: a slow double-tap now misses.
// If he reports "it stopped working", the next value is 300 — ⛔ NOT back to 500, which is
// the value that produced the false positives in the first place.
//
// Reliable at this tight value because the interval is measured from hardware timestamps,
// not from (latency-prone) callback delivery time.
//
// 2026-07-31 (DESIGN_CAPTURE_NOTE_FIRST §1.3): the long-press (collect panel) and
// single-tap (collapse toggle) gestures that used to share this key are GONE — three
// gestures on one key with overlapping windows made "single tap" structurally
// ambiguous (two taps 300–500ms apart read as collapse + capture). Double-tap is now
// the only ⌥ gesture.
const DOUBLE_TAP_WINDOW_MS: u64 = 250;

// ⭐⭐ 长按 ⌥ = 直接写一条笔记（2026-08-27，Ocean:「长按 ⌥ 弹同一个浮窗，但正文是空的、
// 给人直接写，来源留空，存进当前捕捉项目」）。
//
// ⚠️⚠️ **两条手势必须互斥。** Ocean 的话是「先等够长按阈值再决定是哪一种，⛔ 不许两条都
// 触发」。这里做的是同一件事，但**没有让双击等 450ms**：
//   - 双击照旧在第二下按下的那一刻就触发（⛔ 不能退步 —— §16 写着「按键到浮窗 <200ms」，
//     让每一次捕捉先卡 450ms 是拿主功能去换新功能）；
//   - 长按是一个**可以被取消的定时器**：这一下按下之后 450ms 内只要发生了任何别的事
//     （松开、又按一次、双击触发了、按了别的键、点了鼠标），它就作废。
// ⇒ 两条永远只有一条会响，而双击一毫秒都没有变慢。
//
// ⚠️ `OPT_GEN` 是这个「作废」机制本身：每一件相关的事都把它 +1，定时器醒来发现号变了
// 就自己退场。⛔ 别改成一个 bool —— 快速连按会让 bool 停在错的那一档上。
const LONG_PRESS_MS: u64 = 450;

/// 每一次「⌥ 的状态变了」都会把它 +1。长按定时器拿着按下那一刻的号，醒来对不上就作废。
static OPT_GEN: AtomicU64 = AtomicU64::new(0);

/// ⌥ 现在按着没有。⚠️ 松开那一刻置 false —— 定时器醒来第一件事就是问它。
static OPT_HELD: AtomicBool = AtomicBool::new(false);

/// 作废掉正在等的那个长按（如果有）。松开、双击触发、按别的键、点鼠标都调它。
fn cancel_long_press() {
    OPT_GEN.fetch_add(1, Ordering::SeqCst);
}

const NANOS_PER_MS: u64 = 1_000_000;

// CGEventGetTimestamp value (nanoseconds) of the last observed clean ⌥ press. Atomic
// so the tap callback — dispatched on its own run-loop thread — reads/writes lock-free.
// 0 means "no first tap yet"; a real CGEvent timestamp is never 0.
static LAST_OPT_PRESS_NS: AtomicU64 = AtomicU64::new(0);

// Suppression state (2026-07-29). SUPPRESS_ACTIVE: the tap was created as an active
// (Default) tap, so deleting events is possible. SWALLOW_NEXT_OPT_RELEASE: the 2nd
// press of a consumed double-tap was just deleted; delete its matching release too,
// so the outside world sees a consistent single press-release pair (the first tap).
static SUPPRESS_ACTIVE: AtomicBool = AtomicBool::new(false);
static SWALLOW_NEXT_OPT_RELEASE: AtomicBool = AtomicBool::new(false);

// CFMachPortRef of the installed tap, stashed so the callback can re-enable in place
// after macOS disables it (§19.4). Null until run_tap() finishes setup. Storing a
// raw pointer is fine: the CFMachPort is held by the runloop source for the life of
// the dedicated tap thread (which never exits), so the pointer never dangles.
static TAP_PORT: AtomicPtr<c_void> = AtomicPtr::new(std::ptr::null_mut());

// True once we've notified the UI that the tap is permanently disabled — re-entry
// guard so a flapping tap doesn't toast on every disable callback.
static NOTIFIED_DISABLED: AtomicBool = AtomicBool::new(false);

// The tap callback is a plain extern "C" fn (raw CGEventTapCreate, see module doc),
// so app-event emission goes through boxed closures installed once by install().
struct Emitters {
    /// P7-7: `Some` when a screenshot chord (not a ⌘C) opened the gate — the capture looks for
    /// the picture first.
    capture_trigger: Box<dyn Fn(Option<serde_json::Value>) + Send + Sync>,
    /// 长按 ⌥ —— 弹一个空的浮窗让人直接写（2026-08-27）。参数 = 按下之前 2 秒内按过 ⌘C 没有（P3-4）。
    note_trigger: Box<dyn Fn(bool) + Send + Sync>,
    capture_disabled: Box<dyn Fn(&'static str) + Send + Sync>,
    overlay_dismiss: Box<dyn Fn() + Send + Sync>,
}
static EMITTERS: OnceLock<Emitters> = OnceLock::new();

// Raw CGEventType values we handle (the crate enum can't represent the two disable
// sentinels without overflowing its mask builder — see the mask note in run_tap).
const ET_LEFT_MOUSE_DOWN: u32 = 1;
const ET_KEY_DOWN: u32 = 10;
const ET_FLAGS_CHANGED: u32 = 12;
const ET_TAP_DISABLED_TIMEOUT: u32 = 0xFFFF_FFFE;
const ET_TAP_DISABLED_USER_INPUT: u32 = 0xFFFF_FFFF;

#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    // When the event physically occurred, in NANOSECONDS. Despite the "absolute time"
    // wording in some docs, this is plain nanoseconds — NOT mach ticks. Do NOT apply a
    // mach_timebase_info scaling: on Apple Silicon that inflates every gap ~41x (125/3)
    // and no double-tap ever lands inside the window.
    fn CGEventGetTimestamp(event: *const c_void) -> u64;

    // Re-enables an event tap macOS has disabled. The first argument is the same
    // CFMachPortRef returned by CGEventTapCreate. Idempotent — calling on an already-
    // enabled tap is a no-op.
    fn CGEventTapEnable(tap: CFMachPortRef, enable: bool);

    // Input Monitoring TCC state (macOS 10.15+). Preflight reads the current grant
    // without prompting; Request shows the system prompt (once — later calls are
    // no-ops until the user changes the setting) and returns the resulting state.
    // Not exposed by core-graphics 0.23, so declared against the framework we
    // already link. C `bool` maps to Rust `bool`.
    fn CGPreflightListenEventAccess() -> bool;
    fn CGRequestListenEventAccess() -> bool;

    // Raw tap creation — used instead of core-graphics' CGEventTap wrapper because
    // the wrapper's trampoline cannot return NULL (it maps `None` back to the
    // original event), and returning NULL from the callback is precisely how an
    // active tap deletes an event.
    fn CGEventTapCreate(
        tap: u32,      // kCGSessionEventTap = 1
        place: u32,    // kCGHeadInsertEventTap = 0
        options: u32,  // kCGEventTapOptionDefault = 0 / ListenOnly = 1
        mask: u64,
        callback: unsafe extern "C" fn(*const c_void, u32, *mut c_void, *mut c_void) -> *mut c_void,
        user_info: *mut c_void,
    ) -> CFMachPortRef;
}

// Tap locations, upstream first. HID is where events enter the window server —
// ahead of EVERY session tap, so a suppression decision there wins no matter when
// the competing app installed its own tap. Session taps, by contrast, are ordered
// by insertion: a head-inserted tap created after ours sits in front of ours and
// would see the second ⌥ press before we could delete it (this is why the
// 2026-07-29 session-level attempt still let the other app's popup through).
// HID requires Accessibility; without it we fall back down this list.
const K_CG_HID_EVENT_TAP: u32 = 0;
const K_CG_SESSION_EVENT_TAP: u32 = 1;
const K_CG_HEAD_INSERT_EVENT_TAP: u32 = 0;
const K_CG_EVENT_TAP_OPTION_DEFAULT: u32 = 0;
const K_CG_EVENT_TAP_OPTION_LISTEN_ONLY: u32 = 1;

#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    // Accessibility TCC state — gates ACTIVE event taps (the ones that may modify or
    // delete events). Listen-only taps are gated by Input Monitoring instead.
    fn AXIsProcessTrusted() -> bool;
    fn AXIsProcessTrustedWithOptions(options: core_foundation::dictionary::CFDictionaryRef) -> bool;
    static kAXTrustedCheckOptionPrompt: CFStringRef;
}

// Current Input Monitoring grant — polled by the frontend via the
// `input_monitoring_granted` command (lib.rs) to drive the onboarding banner.
pub fn input_monitoring_granted() -> bool {
    unsafe { CGPreflightListenEventAccess() }
}

// Current Accessibility grant — the suppression tap (active mode) needs it.
pub fn accessibility_granted() -> bool {
    unsafe { AXIsProcessTrusted() }
}

// User-initiated permission request (DESIGN_FIRST_RUN 拍板点 3). Fires both one-shot
// system prompts — Input Monitoring first (it is what capture actually needs), then
// Accessibility (it is what keeps the gesture exclusive to Spool). Returns the Input
// Monitoring result: on a machine that has never been asked, macOS answers false and
// shows its dialog, so the caller keeps pointing at System Settings either way. Once
// TCC has a recorded answer no dialog appears at all — hence the banner also keeps an
// "open System Settings" route after this returns false.
pub fn request_capture_access() -> bool {
    let granted = unsafe { CGRequestListenEventAccess() };
    eprintln!("[double-tap] user-requested Input Monitoring prompt returned granted={granted}");
    let ax = request_accessibility_with_prompt();
    eprintln!("[double-tap] user-requested Accessibility prompt returned trusted={ax}");
    granted
}

fn request_accessibility_with_prompt() -> bool {
    unsafe {
        let key = CFString::wrap_under_get_rule(kAXTrustedCheckOptionPrompt);
        let opts = CFDictionary::from_CFType_pairs(&[(key.as_CFType(), CFBoolean::true_value().as_CFType())]);
        AXIsProcessTrustedWithOptions(opts.as_concrete_TypeRef())
    }
}

pub fn install<R: Runtime>(app: AppHandle<R>) {
    // Emitters for the extern "C" callback and its timer threads. install() runs once.
    let a1 = app.clone();
    let a3 = app.clone();
    let a2 = app;
    let _ = EMITTERS.set(Emitters {
        capture_trigger: Box::new(move |shot| match shot {
            Some(shot) => {
                let _ = a1.emit("capture-trigger", serde_json::json!({ "shot": shot }));
            }
            None => {
                let _ = a1.emit("capture-trigger", ());
            }
        }),
        note_trigger: Box::new(move |copied| {
            let _ = a3.emit("note-trigger", serde_json::json!({ "copied": copied }));
        }),
        capture_disabled: Box::new(move |reason| {
            let _ = a2.emit("capture-disabled", reason);
        }),
        overlay_dismiss: Box::new(move || {
            crate::capture::forget_restore_focus();
            crate::overlay::send(&serde_json::json!({ "t": "dismiss" }));
        }),
    });
    thread::spawn(run_tap);
}

// The raw trampoline: returning the event pointer passes it through; returning NULL
// deletes it (active taps only — for a listen-only tap the return value is ignored).
unsafe extern "C" fn tap_trampoline(
    _proxy: *const c_void,
    etype: u32,
    event: *mut c_void,
    _user_info: *mut c_void,
) -> *mut c_void {
    if on_event(etype, event) {
        event
    } else {
        std::ptr::null_mut()
    }
}

// Returns true to keep the event, false to delete it. All logic lives here so the
// trampoline stays trivial.
fn on_event(etype: u32, event_ptr: *mut c_void) -> bool {
    let emitters = match EMITTERS.get() {
        Some(e) => e,
        None => return true,
    };

    match etype {
        ET_TAP_DISABLED_TIMEOUT | ET_TAP_DISABLED_USER_INPUT => {
            let reason = if etype == ET_TAP_DISABLED_TIMEOUT { "timeout" } else { "user input" };
            eprintln!("[double-tap] tap disabled ({reason}); attempting self-heal");
            // Pull the tap's mach port we stashed at install-time and ask macOS to
            // re-enable. If the port pointer is null, install hasn't completed yet —
            // ignore (we'll never get a disable event before install anyway).
            let port = TAP_PORT.load(Ordering::Acquire) as CFMachPortRef;
            if !port.is_null() {
                unsafe { CGEventTapEnable(port, true) };
            }
            SWALLOW_NEXT_OPT_RELEASE.store(false, Ordering::Relaxed);
            // If we're still disabled next time the callback fires for a disable
            // event, notify the UI once. CFRunLoop continues to dispatch the
            // single-shot disable events even when the tap is off.
            if NOTIFIED_DISABLED
                .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
                .is_ok()
            {
                // First-disable path: try the re-enable above and reset the
                // double-tap counter so a stray ⌥ press from before doesn't pair
                // with the next one. We DON'T toast yet — the re-enable usually
                // works and a transient timeout shouldn't bother the user.
                LAST_OPT_PRESS_NS.store(0, Ordering::Relaxed);
            } else {
                // Second consecutive disable event with no clean press in between
                // means the self-heal didn't stick. Surface a single notice — a
                // user-defined capture shortcut (if bound) keeps working.
                (emitters.capture_disabled)(reason);
            }
            true
        }
        ET_LEFT_MOUSE_DOWN => {
            // ⌥ 按着的时候点鼠标 = ⌥ 拖拽（复制文件、画选区…），⛔ 不是长按笔记。
            if OPT_HELD.load(Ordering::Relaxed) {
                cancel_long_press();
            }
            // §9.13: dismiss the capture toast when the user clicks anywhere outside
            // it (resuming work). Disarmed = the watch returns false, so this is a
            // cheap no-op for every normal click when no toast is up.
            let event = ManuallyDrop::new(unsafe { CGEvent::from_ptr(event_ptr as *mut _) });
            let loc = event.location();
            if click_outside_overlay(loc.x, loc.y) {
                if OVERLAY_DISMISS_HELD.load(Ordering::SeqCst) {
                    // P3-3：卡片固定着 —— 不收起。但这一下点出去 = 人自己挑了去处，
                    // 卡片最后收起时⛔ 别再把前台拽回捕捉那一刻的 app（和下面那条同一个理由）。
                    crate::capture::forget_restore_focus();
                } else {
                    (emitters.overlay_dismiss)();
                }
            }
            true
        }
        ET_KEY_DOWN => {
            // ⚠️⚠️ ⌥ 按着的时候按了别的键 = 一个组合键（⌥E 打 é、⌥⌫ 删一个词……），
            // ⛔ 不是长按笔记。少了这一条，任何一个按住 ⌥ 超过半秒的组合键都会弹出浮窗。
            if OPT_HELD.load(Ordering::Relaxed) {
                cancel_long_press();
            }
            // Copy-gate bookkeeping: remember when a ⌘C/⌘X chord was last pressed.
            // Repeats (key held) refresh the stamp harmlessly.
            let event = ManuallyDrop::new(unsafe { CGEvent::from_ptr(event_ptr as *mut _) });
            let keycode = event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE);
            let flags = event.get_flags();
            if (keycode == KEYCODE_C || keycode == KEYCODE_X)
                && flags.contains(CGEventFlags::CGEventFlagCommand)
            {
                let now = unsafe { CGEventGetTimestamp(event_ptr as *const c_void) };
                LAST_COPY_CHORD_NS.store(now, Ordering::Relaxed);
                LAST_COPY_WALL_MS.store(wall_ms(), Ordering::Relaxed);
            } else if let Some(kind) = screenshot_chord(
                keycode,
                flags.contains(CGEventFlags::CGEventFlagCommand),
                flags.contains(CGEventFlags::CGEventFlagShift),
                flags.contains(CGEventFlags::CGEventFlagControl),
            ) {
                // P7-7: a screenshot opens the gate the way ⌘C does (same window). Only
                // observed, never consumed — the system still takes the screenshot.
                let now = unsafe { CGEventGetTimestamp(event_ptr as *const c_void) };
                LAST_SHOT_NS.store(now, Ordering::Relaxed);
                LAST_SHOT_WALL_MS.store(wall_ms(), Ordering::Relaxed);
                LAST_SHOT_KIND.store(kind as u8, Ordering::Relaxed);
                // 2026-10-18: what the clipboard holds right now, before anything after the chord
                // — a later ⌘C is measured against it. Off the tap: a clipboard read can block.
                thread::spawn(move || {
                    let fingerprint = crate::images::clipboard_fingerprint();
                    *SHOT_CLIPBOARD.lock().unwrap() = Some((now, fingerprint));
                });
                eprintln!("[double-tap] screenshot chord seen ({})", kind.name());
            }
            true
        }
        ET_FLAGS_CHANGED => {
            // 用户把捕捉总开关关掉了(设置里,或者菜单栏那个 Spool 图标里)。
            // ⚠️⚠️ 这里必须 `return true` —— true 是放行事件。`return false` 是把这一下 ⌥ 从
            // 事件流里删掉,而「别的 app 的 ⌥ 快捷键被 Spool 吃掉」正是这个开关要禁的行为:
            // 写成 false 会让功能变成它的反面。⛔ 这和 tap 被系统关掉那条自愈路径无关,
            // 那条在上面 ET_TAP_DISABLED_* 里,它修的是「坏了」,不该来修一个人故意关的开关。
            if crate::capture::capture_disabled() {
                // 暂停期间攒下的半个手势不要留到重新打开之后:第一下按在暂停前、第二下按在
                // 打开后,不算一次双击。同理,待删的那个 release 也一并作废(反正也不会删了)。
                LAST_OPT_PRESS_NS.store(0, Ordering::Relaxed);
                SWALLOW_NEXT_OPT_RELEASE.store(false, Ordering::Relaxed);
                // ⚠️ 长按也跟着停 —— Ocean 的红线：这条路要跟「暂停捕捉手势」那个总开关
                // 一起停（记忆 double-tap-exclusivity）。按在暂停前、还在等的那个定时器
                // 也一并作废。
                OPT_HELD.store(false, Ordering::Relaxed);
                cancel_long_press();
                return true;
            }
            // Any clean event passing through means the tap is healthy again —
            // clear the latched disable flag so a future disable can re-arm the
            // self-heal notification path.
            NOTIFIED_DISABLED.store(false, Ordering::Relaxed);
            let event = ManuallyDrop::new(unsafe { CGEvent::from_ptr(event_ptr as *mut _) });
            // FlagsChanged carries the key code of the modifier that changed.
            let keycode = event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE);
            if keycode != KEYCODE_OPT_LEFT && keycode != KEYCODE_OPT_RIGHT {
                return true;
            }
            let flags = event.get_flags();
            // The ⌥ bit set in the post-change flags means this is the *press*
            // edge; cleared means *release*.
            let is_press = flags.contains(CGEventFlags::CGEventFlagAlternate);

            if !is_press {
                // Release edge. Does NOT update LAST_OPT_PRESS_NS (only presses
                // count for double-tap pairing).
                // ⚠️ 松开 = 这一下不是长按了。⛔ 必须在下面那两个 return 之前做，
                // 不然被删掉的那个 release（双击的第二下）会把它漏掉。
                OPT_HELD.store(false, Ordering::Relaxed);
                cancel_long_press();
                // Suppression: this is the release of a deleted 2nd press — delete
                // it too, so the outside world's press/release pairing stays
                // consistent (it saw exactly one full tap).
                if SWALLOW_NEXT_OPT_RELEASE.swap(false, Ordering::AcqRel)
                    && SUPPRESS_ACTIVE.load(Ordering::Relaxed)
                {
                    eprintln!("[double-tap] suppressed ⌥ release (2nd of consumed pair)");
                    return false;
                }
                return true;
            }

            // A fresh press means any pending release-swallow is stale — drop it.
            SWALLOW_NEXT_OPT_RELEASE.store(false, Ordering::Relaxed);

            // Require ⌥ alone — a ⌥ press while ⌘/⇧/⌃ is held belongs to a combo
            // (⌥⌘C, ⌥⇧4, …), not a deliberate tap.
            if flags.contains(CGEventFlags::CGEventFlagCommand)
                || flags.contains(CGEventFlags::CGEventFlagShift)
                || flags.contains(CGEventFlags::CGEventFlagControl)
            {
                return true;
            }

            let now = unsafe { CGEventGetTimestamp(event_ptr as *const c_void) };

            // ⭐ 一次干净的 ⌥ 按下 —— 起一个长按定时器。它随时会被上面那几处作废掉。
            OPT_HELD.store(true, Ordering::SeqCst);
            let generation = OPT_GEN.fetch_add(1, Ordering::SeqCst) + 1;
            // P3-4：按下这一刻就判（⌘C 只可能在它之前 —— 按着 ⌥ 再按 ⌘C 会把长按作废）。
            let copy_ns = LAST_COPY_CHORD_NS.load(Ordering::Relaxed);
            let prefill = fresh_copy_within(
                copy_ns,
                LONG_PRESS_COPY_USED_NS.load(Ordering::Relaxed),
                now,
                LONG_PRESS_COPY_WINDOW_MS,
            );
            thread::spawn(move || {
                thread::sleep(Duration::from_millis(LONG_PRESS_MS));
                // 号变了 = 这段时间里发生过别的事（松开 / 又按一次 / 双击触发 / 别的键 /
                // 点鼠标 / 暂停开关）。⇒ 这一下不是长按。
                if OPT_GEN.load(Ordering::SeqCst) != generation {
                    return;
                }
                if !OPT_HELD.load(Ordering::SeqCst) {
                    return;
                }
                // ⚠️ 再问一次总开关：按下去的时候还开着，这 450ms 里可能被关掉了。
                if crate::capture::capture_disabled() {
                    return;
                }
                // ⛔ 这一下用掉了：别让它再跟下一次按下配成一个双击。
                LAST_OPT_PRESS_NS.store(0, Ordering::Relaxed);
                OPT_GEN.fetch_add(1, Ordering::SeqCst);
                // 这下 ⌘C 带进这张卡了 ⇒ 用掉了，下一次长按不再带它（单次）。
                if prefill {
                    LONG_PRESS_COPY_USED_NS.store(copy_ns, Ordering::Relaxed);
                }
                eprintln!(
                    "[double-tap] LONG-PRESS ⌥ ({LONG_PRESS_MS}ms) — 直接写笔记 \
                     (unused ⌘C within {LONG_PRESS_COPY_WINDOW_MS}ms before: {prefill})"
                );
                if let Some(e) = EMITTERS.get() {
                    (e.note_trigger)(prefill);
                }
            });

            let prev = LAST_OPT_PRESS_NS.swap(now, Ordering::Relaxed);
            // Whether to delete THIS event from the stream (2nd press of a pair
            // that Spool consumed). Decided below.
            let mut keep = true;
            // Log every clean ⌥ tap (with the measured gap) so a flaky double-tap
            // can be triaged from stderr.
            if prev == 0 {
                eprintln!(
                    "[double-tap] ⌥ 1st-of-pair (waiting ≤{DOUBLE_TAP_WINDOW_MS}ms for 2nd)"
                );
            } else {
                // CGEventGetTimestamp is nanoseconds — straight /1e6 to ms.
                let gap = now.saturating_sub(prev) / NANOS_PER_MS;
                if gap <= DOUBLE_TAP_WINDOW_MS {
                    // Copy-gate (see COPY_GATE_WINDOW_MS): only a double-tap that
                    // follows a recent ⌘C/⌘X is a capture; a bare one is left to
                    // Claude Desktop's identical quick-entry gesture.
                    let copied = LAST_COPY_CHORD_NS.load(Ordering::Relaxed);
                    let copy_gap_ms = now.saturating_sub(copied) / NANOS_PER_MS;
                    // P7-7: a screenshot chord counts like ⌘C. 2026-10-18: both are asked — see
                    // gate_open for why a later ⌘C no longer hides the screenshot.
                    let shot_ns = LAST_SHOT_NS.load(Ordering::Relaxed);
                    let copy_open = gate_open(copied, now, COPY_GATE_WINDOW_MS);
                    let mut shot_open = gate_open(shot_ns, now, COPY_GATE_WINDOW_MS);
                    // P9H-7 ① + 2026-10-18: a screenshot taken a while after its chord — the file
                    // that landed just now, or the picture still in the thumbnail, opens it too.
                    // The cheap checks first: the folders are only looked at after a chord.
                    let kind = ShotKind::from_u8(LAST_SHOT_KIND.load(Ordering::Relaxed));
                    let chord_ms = LAST_SHOT_WALL_MS.load(Ordering::Relaxed);
                    let now_ms = wall_ms();
                    if !shot_open
                        && COPY_GATE_ACTIVE.load(Ordering::Relaxed)
                        && late_shot_opens(kind, chord_ms, None, true, now_ms, COPY_GATE_WINDOW_MS)
                    {
                        let (landed, pending) = late_shot_seen(chord_ms);
                        shot_open = late_shot_opens(kind, chord_ms, landed, pending, now_ms, COPY_GATE_WINDOW_MS);
                    }
                    if !COPY_GATE_ACTIVE.load(Ordering::Relaxed) || copy_open || shot_open {
                        // A ⌘C after the chord: the capture asks the clipboard whether it was new.
                        let copied_after = copied > shot_ns;
                        eprintln!(
                            "[double-tap] TRIGGER gap={gap}ms (⌘C {copy_gap_ms}ms ago, \
                             screenshot {shot_open}, ⌘C after it {copied_after})"
                        );
                        let shot = shot_open.then_some(kind).flatten().map(|kind| {
                            serde_json::json!({
                                "atMs": chord_ms,
                                "kind": kind.name(),
                                "copiedAfter": copied_after,
                            })
                        });
                        // ⛔ 这一下已经是双击了 —— 把还在等的那个长按作废，
                        // 「不许两条都触发」就是靠这一行。
                        cancel_long_press();
                        // 这下 ⌘C 被捕捉走了 ⇒ 长按那边也算用掉了（只记账，⛔ 不改这里的判定）。
                        LONG_PRESS_COPY_USED_NS.store(copied, Ordering::Relaxed);
                        (emitters.capture_trigger)(shot);
                        // Suppression: Spool consumed this double-tap — delete the
                        // 2nd press (and, via the flag, its release) so Claude
                        // Desktop's identical gesture never completes.
                        if SUPPRESS_ACTIVE.load(Ordering::Relaxed) {
                            SWALLOW_NEXT_OPT_RELEASE.store(true, Ordering::Release);
                            keep = false;
                            eprintln!("[double-tap] suppressed ⌥ press (2nd of consumed pair)");
                        }
                    } else {
                        eprintln!(
                            "[double-tap] double-tap IGNORED — no ⌘C/⌘X or screenshot within \
                             {COPY_GATE_WINDOW_MS}ms (copy-gate)"
                        );
                    }
                    // Reset so a third tap doesn't immediately re-trigger off the
                    // second tap's timestamp.
                    LAST_OPT_PRESS_NS.store(0, Ordering::Relaxed);
                } else {
                    eprintln!(
                        "[double-tap] ⌥ too-slow gap={gap}ms > {DOUBLE_TAP_WINDOW_MS}ms — count restarts"
                    );
                }
            }

            keep
        }
        _ => true,
    }
}

fn run_tap() {
    // Without the Input Monitoring grant the tap below only ever sees Spool's own
    // events (see module doc). Preflight ONLY — the prompt moved to the user-initiated
    // `request_capture_access` (拍板点 3). The tap is installed either way, so
    // double-tap keeps working inside Spool immediately, and a fresh grant takes
    // effect on the next launch.
    let granted = unsafe { CGPreflightListenEventAccess() };
    if !granted {
        eprintln!("[double-tap] Input Monitoring NOT granted — staying quiet (prompt is user-initiated)");
    }
    COPY_GATE_ACTIVE.store(granted, Ordering::Relaxed);

    // Accessibility gates the ACTIVE (suppressing) tap. Preflight only, same reason.
    let ax = unsafe { AXIsProcessTrusted() };
    if !ax {
        eprintln!("[double-tap] Accessibility NOT granted — suppression off until granted");
    }

    // FlagsChanged (⌥ double-tap) + LeftMouseDown (§9.13 click-outside
    // dismiss) + KeyDown (⌘C/⌘X copy-gate, 2026-07-08 — only when Input Monitoring
    // is granted: an unprivileged tap never receives keyDown, and asking for it
    // provoked a TapDisabledByUserInput in testing). The two TapDisabled sentinels
    // are delivered to every tap regardless of the mask (their values don't fit a
    // 1<<n mask anyway) — the callback handles them when they arrive.
    let mut mask: u64 = (1 << ET_FLAGS_CHANGED) | (1 << ET_LEFT_MOUSE_DOWN);
    if granted {
        mask |= 1 << ET_KEY_DOWN;
    }

    // Suppression requires BOTH grants (2026-07-31, HANDOFF §5.3). Accessibility is what
    // makes deleting an event possible at all — but Input Monitoring is what makes the
    // copy-gate above enforceable, and without the gate every bare double-tap counts as
    // capture. Granting only Accessibility therefore produced the exact inverse of the
    // gate's purpose: Spool swallowed every double-tap ⌥ system-wide and Claude Desktop's
    // identical gesture never fired (found in the 2026-07-30 clean-install smoke test,
    // log: `TRIGGER gap=193ms (⌘C 164222197ms ago)`). No enforceable gate → no exclusivity.
    let suppress = ax && granted;

    // Try, in order: HID + active (upstream of every session tap → the suppression
    // decision wins regardless of who installed a tap first), session + active
    // (deletion still works, but only against session taps installed before ours),
    // session + listen-only (previous behavior: the gesture stays shared).
    let mut port: CFMachPortRef = std::ptr::null_mut();
    let mut where_ = "session/listen-only";
    if suppress {
        port = unsafe {
            CGEventTapCreate(
                K_CG_HID_EVENT_TAP,
                K_CG_HEAD_INSERT_EVENT_TAP,
                K_CG_EVENT_TAP_OPTION_DEFAULT,
                mask,
                tap_trampoline,
                std::ptr::null_mut(),
            )
        };
        if !port.is_null() {
            where_ = "HID/active";
        } else {
            eprintln!("[double-tap] HID tap unavailable — falling back to a session tap");
            port = unsafe {
                CGEventTapCreate(
                    K_CG_SESSION_EVENT_TAP,
                    K_CG_HEAD_INSERT_EVENT_TAP,
                    K_CG_EVENT_TAP_OPTION_DEFAULT,
                    mask,
                    tap_trampoline,
                    std::ptr::null_mut(),
                )
            };
            if !port.is_null() {
                where_ = "session/active";
            }
        }
    }
    let active = !port.is_null();
    if !active {
        port = unsafe {
            CGEventTapCreate(
                K_CG_SESSION_EVENT_TAP,
                K_CG_HEAD_INSERT_EVENT_TAP,
                K_CG_EVENT_TAP_OPTION_LISTEN_ONLY,
                mask,
                tap_trampoline,
                std::ptr::null_mut(),
            )
        };
    }
    if port.is_null() {
        eprintln!(
            "[double-tap] CGEventTap creation FAILED — grant Spool both \
             Accessibility AND Input Monitoring in System Settings → Privacy & \
             Security, then restart Spool."
        );
        return;
    }
    SUPPRESS_ACTIVE.store(active, Ordering::Relaxed);

    // wrap_under_create_rule takes over the +1 from CGEventTapCreate; the runloop
    // source retains the port for the life of this (never-exiting) thread.
    let mach_port = unsafe { CFMachPort::wrap_under_create_rule(port) };
    let source = match mach_port.create_runloop_source(0) {
        Ok(s) => s,
        Err(_) => {
            eprintln!("[double-tap] failed to create run loop source");
            return;
        }
    };

    let current = CFRunLoop::get_current();
    unsafe {
        current.add_source(&source, kCFRunLoopCommonModes);
    }
    unsafe { CGEventTapEnable(port, true) };
    // Stash the raw CFMachPortRef so the callback can re-enable the tap in place when
    // macOS disables it. Safe because the runloop source above retains the mach port
    // for as long as this thread (which never exits) keeps the runloop alive.
    TAP_PORT.store(port as *mut c_void, Ordering::Release);
    eprintln!(
        "[double-tap] installed at {where_} ({}) — double-tap ⌥ (within {DOUBLE_TAP_WINDOW_MS}ms) \
         to capture",
        if active {
            "consumed double-taps are deleted from the stream — exclusive to Spool"
        } else if !ax {
            "no Accessibility grant: the gesture stays shared with other listeners"
        } else {
            "no Input Monitoring grant: the copy-gate cannot be enforced, so the gesture \
             stays shared with other listeners (§5.3)"
        }
    );
    // CFRunLoop::run_current() blocks this thread forever — exactly what we want
    // for a long-lived event-tap listener. The thread is dedicated to this loop.
    CFRunLoop::run_current();
}

#[cfg(test)]
mod tests {
    use super::*;

    const MS: u64 = NANOS_PER_MS;

    // P3-4: the press is the reference point, and only a copy BEFORE it counts.
    #[test]
    fn a_copy_counts_only_within_two_seconds_before_the_press() {
        let press = 50_000 * MS;
        let w = LONG_PRESS_COPY_WINDOW_MS;
        assert!(!fresh_copy_within(0, 0, press, w), "never copied");
        assert!(fresh_copy_within(press - 1_000 * MS, 0, press, w));
        assert!(fresh_copy_within(press - 2_000 * MS, 0, press, w), "edge is in");
        assert!(!fresh_copy_within(press - 2_001 * MS, 0, press, w));
        assert!(!fresh_copy_within(press + MS, 0, press, w), "after the press");
    }

    // P7-7: the screenshot chords, and only those.
    #[test]
    fn screenshot_chords_are_cmd_shift_three_four_five() {
        assert_eq!(screenshot_chord(KEYCODE_4, true, true, false), Some(ShotKind::File));
        assert_eq!(screenshot_chord(KEYCODE_3, true, true, false), Some(ShotKind::File));
        assert_eq!(screenshot_chord(KEYCODE_4, true, true, true), Some(ShotKind::Clipboard));
        assert_eq!(screenshot_chord(KEYCODE_3, true, true, true), Some(ShotKind::Clipboard));
        assert_eq!(screenshot_chord(KEYCODE_5, true, true, false), Some(ShotKind::Toolbar));
        assert_eq!(screenshot_chord(KEYCODE_4, true, false, false), None, "⌘4 is a tab switch");
        assert_eq!(screenshot_chord(KEYCODE_4, false, true, false), None);
        assert_eq!(screenshot_chord(KEYCODE_C, true, true, false), None);
    }

    // P7-7: a screenshot opens the gate like ⌘C, same window. 2026-10-18: each is asked on its
    // own — a ⌘C after the screenshot no longer closes the screenshot's half (the capture then
    // asks the clipboard whether that ⌘C brought anything new).
    #[test]
    fn a_screenshot_opens_the_copy_gate_like_cmd_c() {
        let now = 100_000 * MS;
        let w = COPY_GATE_WINDOW_MS;
        assert!(!gate_open(0, now, w), "never");
        assert!(gate_open(now - 3_000 * MS, now, w));
        assert!(gate_open(now - 10_000 * MS, now, w), "edge is in");
        assert!(!gate_open(now - 10_001 * MS, now, w));
        assert!(!gate_open(now + MS, now, w), "after the double-tap");
        // Ocean's log, 10-18: ⌘⇧4, then the ⌘C a key macro sends 10 ms before its ⌥⌥ — both
        // open, so the screenshot is still offered (with the ⌘C after it).
        let (shot, copy) = (now - 4_000 * MS, now - 10 * MS);
        assert!(gate_open(shot, now, w) && gate_open(copy, now, w) && copy > shot);
    }

    // P3 验收 (Ocean 10-02): one ⌘C fills one card. Once it is used, the same copy never
    // counts again; a newer ⌘C does.
    #[test]
    fn a_copy_is_used_once() {
        let press = 50_000 * MS;
        let w = LONG_PRESS_COPY_WINDOW_MS;
        let copy = press - 500 * MS;
        assert!(fresh_copy_within(copy, 0, press, w), "first long-press takes it");
        assert!(!fresh_copy_within(copy, copy, press + 300 * MS, w), "second one does not");
        let newer = press + 400 * MS;
        assert!(fresh_copy_within(newer, copy, press + 900 * MS, w), "a new ⌘C counts again");
    }

    // P9H-7 ① (DISCOVERED-20261008-3): ⌘⇧5, a long look at the toolbar, then the click — the file
    // that lands opens the gate, as the chord would have. 2026-10-18: ⌘⇧3/4 the same, and a
    // picture still in the thumbnail counts as well as a landed one.
    #[test]
    fn a_screenshot_taken_long_after_its_chord_still_opens_the_gate() {
        let chord = 1_800_000_000_000_u64;
        let w = COPY_GATE_WINDOW_MS;
        let toolbar = Some(ShotKind::Toolbar);
        let file = Some(ShotKind::File);
        // 40 s on the toolbar, the file landed 3 s ago.
        assert!(late_shot_opens(toolbar, chord, Some(chord + 37_000), false, chord + 40_000, w));
        // It landed 11 s ago: like a ⌘C 11 s ago, too old.
        assert!(!late_shot_opens(toolbar, chord, Some(chord + 29_000), false, chord + 40_000, w));
        // Nothing has landed and nothing is in the thumbnail (the toolbar was cancelled).
        assert!(!late_shot_opens(toolbar, chord, None, false, chord + 40_000, w));
        // ⌘⇧4 with a slow selection: 9 s to select, double-tapped while the thumbnail is up.
        assert!(late_shot_opens(file, chord, None, true, chord + 12_000, w));
        // …or after it went and the file landed.
        assert!(late_shot_opens(file, chord, Some(chord + 14_000), false, chord + 16_000, w));
        // Not the clipboard kind (it writes no file), not without a chord.
        assert!(!late_shot_opens(Some(ShotKind::Clipboard), chord, Some(chord + 37_000), true, chord + 40_000, w));
        assert!(!late_shot_opens(None, chord, Some(chord + 37_000), true, chord + 40_000, w));
        // Not forever: a file landing long after an old chord is not that chord's.
        let late = chord + SHOT_LINGER_MS + 1;
        assert!(!late_shot_opens(toolbar, chord, Some(late - 1_000), true, late, w));
    }
}
