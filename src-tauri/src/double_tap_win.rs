//! Double-tap Ctrl capture trigger (Windows only) — the peer of `double_tap.rs`'s
//! double-tap ⌥ on macOS. Same product gesture, different OS plumbing.
//!
//! P15-4 (Ocean 2026-11-06): the same stream also gives long-press Ctrl (write a note — the peer of
//! long-press ⌥, decided at the release: 0.8 – 3 s with nothing else pressed, no click, no wheel) and
//! double-tap ⇧ (the capture-target switcher). The decisions are `modifier_gestures::WinKeys`; this
//! file reads Raw Input — the keyboard and, since P15-4, the mouse (buttons and wheel only, to cancel
//! a long press and to close the switcher on a click outside it).
//!
//! Why Raw Input, not a keyboard hook: a bare modifier key cannot be a `RegisterHotKey`
//! accelerator (that API needs a non-modifier key), so — exactly as on macOS — the only
//! way to see a modifier double-tap is to observe the key stream. The obvious way to do
//! that on Windows is `SetWindowsHookEx(WH_KEYBOARD_LL)`, and we deliberately do NOT use
//! it. A low-level keyboard hook installs a callback that sits in the path of EVERY
//! keystroke on the machine and can swallow or alter it — that is the behavioural
//! signature antivirus keylogger heuristics look for, and this build ships UNSIGNED
//! (Ocean 2026-08-15). Unsigned + a global keyboard hook is how an app gets quarantined
//! whole, not merely flagged.
//!
//! Raw Input is the low-profile alternative: `RegisterRawInputDevices` with
//! `RIDEV_INPUTSINK` asks the OS to POST us copies of keyboard input even when we are not
//! the foreground window. We never sit in the input path — we cannot intercept, cannot
//! suppress, cannot even see input destined for a more-privileged (elevated) process.
//! That is the same API games use for input, and it needs no DLL injection and no TCC-style
//! permission grant. Microsoft's own "Using Raw Input" sample registers keyboard input on a
//! message-only (`HWND_MESSAGE`) window with `RIDEV_INPUTSINK`, which is exactly this.
//!
//! Two things fall away versus the macOS module, both on purpose:
//!   • No copy-gate. On macOS the double-tap ⌥ is gated behind a recent ⌘C because Claude
//!     Desktop's quick-entry fires on the SAME gesture and we must not steal it. Windows
//!     has no such collision on double-tap Ctrl, so gating would only add a "you must Ctrl+C
//!     first or nothing happens" failure mode — and, as the earlier Windows notes warned,
//!     a Ctrl-keyed gate is awkward because Ctrl is also the copy modifier. So there is no
//!     gate: a clean double-tap of Ctrl always fires. The user's model is still "copy, then
//!     double-tap", we just don't enforce the copy.
//!   • No suppression. Raw Input cannot delete an event, and there is nothing to delete —
//!     double-tapping Ctrl alone does nothing in ordinary apps. (Known exception: JetBrains
//!     IDEs bind double-Ctrl to "Run Anything"; a JetBrains user who wants that will also
//!     get our overlay. Documented tradeoff, same class as the Claude-Desktop overlap on
//!     macOS; the user can bind a different capture chord in Settings.)
//!
//! What counts as a "tap": a Ctrl press+release with NOTHING pressed in between and no
//! other modifier involved. We decide on the release edge (unlike the macOS press-edge
//! test) precisely because that is when we know the hold was clean — so Ctrl+C, Ctrl+V,
//! Ctrl+Shift+…, a held Ctrl used as a chord, none of them count. Two clean taps whose
//! gap is within the window are a capture. A hold of 0.8 s or more is never half of a double-tap.
//!
//! ⚠️ Like everything Windows in this crate, not one line here has run on the development
//! machine (a Mac with one Rust target). It is compiled by CI and proved by Ocean's install
//! pass, and is written to FAIL VISIBLY — a failed registration logs the OS error and the
//! thread exits leaving the Settings-bound capture chord as the way in, rather than
//! pretending a dead gesture is a live one (HANDOFF §3.2 #1 — "查不到" and "不需要" must
//! not be the same outcome).
#![cfg(target_os = "windows")]

use std::ffi::c_void;
use std::mem::{size_of, zeroed};
use tauri::{AppHandle, Emitter, Runtime};

use windows_sys::Win32::Foundation::{GetLastError, POINT};
use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
use windows_sys::Win32::UI::Input::{
    GetRawInputData, RegisterRawInputDevices, HRAWINPUT, RAWINPUT, RAWINPUTDEVICE, RAWINPUTHEADER,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DefWindowProcW, DispatchMessageW, GetCursorPos, GetMessageTime, GetMessageW,
    RegisterClassW, HWND_MESSAGE, MSG, WM_INPUT, WNDCLASSW,
};

// P15-4 (Ocean 2026-11-06 第 255 – 256 条): every decision — double-tap Ctrl (capture), long-press Ctrl
// (write a note, decided at the release, 0.8 – 3 s), double-tap ⇧ (the capture-target switcher),
// Win+PrtScn — now lives in `modifier_gestures::WinKeys`, which the Mac's `cargo test` runs. This file
// only reads Raw Input and hands each event over with its `GetMessageTime`.
use crate::modifier_gestures::{WinKeyOutcome, WinKeys};

// Raw Input constants. Defined locally rather than imported so the module depends on the
// windows-sys FUNCTIONS and STRUCTS only, not on the exact path of every flag constant —
// these values are ABI-stable Win32 numbers (winuser.h), the same discipline double_tap.rs
// uses for its CG tap constants.
const RIDEV_INPUTSINK: u32 = 0x0000_0100; // deliver input even when not foreground
const RID_INPUT: u32 = 0x1000_0003; // GetRawInputData: give me the event data
const RIM_TYPEMOUSE: u32 = 0; // RAWINPUTHEADER.dwType for a mouse event
const RIM_TYPEKEYBOARD: u32 = 1; // RAWINPUTHEADER.dwType for a keyboard event
const RI_KEY_BREAK: u16 = 0x01; // RAWKEYBOARD.Flags bit: this is a key-up
const HID_USAGE_PAGE_GENERIC: u16 = 0x01;
const HID_USAGE_GENERIC_MOUSE: u16 = 0x02;
const HID_USAGE_GENERIC_KEYBOARD: u16 = 0x06;
// RAWMOUSE.usButtonFlags: any button going down (left, right, middle, 4, 5) …
const RI_MOUSE_ANY_DOWN: u16 = 0x0001 | 0x0004 | 0x0010 | 0x0040 | 0x0100;
// … and the two wheels (Ctrl+wheel is zoom: it must cancel a long press).
const RI_MOUSE_ANY_WHEEL: u16 = 0x0400 | 0x0800;

// P9H-7 ③ (DISCOVERED-20261008-3, Ocean 10-16 第 152 条): how long after Win+PrtScn a double-tap
// Ctrl still takes that screenshot's FILE — the macOS module's COPY_GATE_WINDOW_MS, the same
// window its screenshot chords get.
const SHOT_WINDOW_MS: i32 = 10_000;

/// P15-4: the switcher's frame is in logical points; GetCursorPos answers in physical pixels (the
/// process is per-monitor DPI aware). The scale of the screen the panel opened on, as f64 bits.
static SWITCHER_SCALE: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0x3FF0_0000_0000_0000); // 1.0

pub fn set_switcher_scale(scale: f64) {
    SWITCHER_SCALE.store(scale.to_bits(), std::sync::atomic::Ordering::Relaxed);
}

fn wall_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn install<R: Runtime>(app: AppHandle<R>) {
    // Its own thread: the Raw Input message pump below blocks on GetMessage forever, exactly
    // like the macOS module's dedicated CFRunLoop thread.
    std::thread::spawn(move || run(app));
}

fn run<R: Runtime>(app: AppHandle<R>) {
    let hwnd = match create_message_window() {
        Some(h) => h,
        None => return, // create_message_window already logged the OS error
    };

    // Register for background keyboard AND mouse raw input targeted at our message-only window.
    // P15-4: the mouse is new — a click or the wheel while Ctrl is held makes it Ctrl+click /
    // Ctrl+wheel (never a long press), and a click outside the switcher closes it. Same API, same
    // INPUTSINK, still only copies: nothing is intercepted, swallowed or altered.
    let rids = [
        RAWINPUTDEVICE {
            usUsagePage: HID_USAGE_PAGE_GENERIC,
            usUsage: HID_USAGE_GENERIC_KEYBOARD,
            dwFlags: RIDEV_INPUTSINK,
            hwndTarget: hwnd,
        },
        RAWINPUTDEVICE {
            usUsagePage: HID_USAGE_PAGE_GENERIC,
            usUsage: HID_USAGE_GENERIC_MOUSE,
            dwFlags: RIDEV_INPUTSINK,
            hwndTarget: hwnd,
        },
    ];
    let ok = unsafe { RegisterRawInputDevices(rids.as_ptr(), rids.len() as u32, size_of::<RAWINPUTDEVICE>() as u32) };
    if ok == 0 {
        let err = unsafe { GetLastError() };
        eprintln!(
            "[double-tap-win] RegisterRawInputDevices failed (GetLastError {err}); \
             double-tap Ctrl is off — the Settings capture shortcut still works"
        );
        return;
    }
    eprintln!("[double-tap-win] Raw Input registered — double-tap Ctrl, long-press Ctrl and double-tap ⇧ armed");

    // P13 (Ocean 2026-11-07: a real long-press Ctrl in the VM never brought a card up, while keys
    // injected through the VM's virtual keyboard did): with SPOOL_GESTURE_TRACE set, every Ctrl /
    // ⇧ / Alt / Win event is written down with its codes, its time and the state the decision read.
    // ⛔ Never an ordinary key, never the clipboard — and off unless the variable is set.
    let trace = std::env::var_os("SPOOL_GESTURE_TRACE").is_some();
    if trace {
        eprintln!("[gesture-trace] on — modifier keys only");
    }

    let mut state = WinKeys::default();
    let mut msg: MSG = unsafe { zeroed() };
    loop {
        // hWnd null → all messages for this thread, which includes the WM_INPUT posted to our
        // window. Blocks until one arrives.
        let r = unsafe { GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) };
        if r == 0 || r == -1 {
            // 0 = WM_QUIT, -1 = error. Either way the pump is done.
            break;
        }
        if msg.message == WM_INPUT {
            match read_raw_event(msg.lParam as HRAWINPUT) {
                Some(Raw::Key(vk, is_break, make, flags)) => {
                    let now = unsafe { GetMessageTime() };
                    // 状态照喂(否则重新打开时手上是半截状态),只是不发出去。这边的 Raw Input 是
                    // INPUTSINK,本来就只看不删,所以「暂停」在 Windows 上是纯粹的不触发。
                    let outcome = state.on_key(vk, is_break, now, wall_ms());
                    if trace && crate::modifier_gestures::is_modifier(vk) {
                        eprintln!(
                            "[gesture-trace] vk={vk:#04x} make={make:#04x} flags={flags:#x} t={now} paused={} -> {outcome:?} | {}",
                            crate::capture::capture_disabled(),
                            state.trace()
                        );
                    }
                    if crate::capture::capture_disabled() {
                        continue_after(&msg);
                        continue;
                    }
                    match outcome {
                        WinKeyOutcome::Nothing => {}
                        WinKeyOutcome::CtrlDoubleTap => {
                            // P9H-7 ③: right after Win+PrtScn the capture takes that file — the payload the
                            // macOS module sends for ⌘⇧3 (useCapture.ts `shot`, kind 'file').
                            match state.last_shot.filter(|&(at, _)| crate::images::win_shot_still_fresh(at, now, SHOT_WINDOW_MS)) {
                                Some((_, wall)) => {
                                    eprintln!("[double-tap-win] TRIGGER (clean double-tap Ctrl, after Win+PrtScn)");
                                    if let Err(e) = app.emit("capture-trigger", serde_json::json!({ "shot": { "atMs": wall, "kind": "file" } })) {
                                        eprintln!("[double-tap-win] capture-trigger not delivered: {e}");
                                    }
                                }
                                None => {
                                    eprintln!("[double-tap-win] TRIGGER (clean double-tap Ctrl)");
                                    if let Err(e) = app.emit("capture-trigger", ()) {
                                        eprintln!("[double-tap-win] capture-trigger not delivered: {e}");
                                    }
                                }
                            }
                        }
                        // The same event the macOS long-press ⌥ sends (useCapture.ts `note-trigger`).
                        WinKeyOutcome::CtrlLongPress { copied } => {
                            eprintln!("[double-tap-win] LONG-PRESS Ctrl — 直接写笔记 (unused Ctrl+C within 2s before: {copied})");
                            if let Err(e) = app.emit("note-trigger", serde_json::json!({ "copied": copied })) {
                                eprintln!("[double-tap-win] note-trigger not delivered: {e}");
                            }
                        }
                        WinKeyOutcome::ShiftDoubleTap => {
                            eprintln!("[double-tap-win] DOUBLE-TAP ⇧ — capture-target switcher");
                            crate::switcher::on_gesture(&app);
                        }
                    }
                }
                Some(Raw::Mouse(flags)) => {
                    if flags & (RI_MOUSE_ANY_DOWN | RI_MOUSE_ANY_WHEEL) != 0 {
                        if trace && state.ctrl_held() {
                            eprintln!("[gesture-trace] mouse flags={flags:#x} while Ctrl held - not a long press");
                        }
                        state.on_mouse();
                    }
                    if flags & RI_MOUSE_ANY_DOWN != 0 {
                        let mut pt = POINT { x: 0, y: 0 };
                        if unsafe { GetCursorPos(&mut pt) } != 0 {
                            let scale = f64::from_bits(SWITCHER_SCALE.load(std::sync::atomic::Ordering::Relaxed));
                            if crate::switcher::click_is_outside(pt.x as f64 / scale, pt.y as f64 / scale) {
                                crate::switcher::dismiss();
                            }
                        }
                    }
                }
                None => {}
            }
        }
        continue_after(&msg);
    }
}

// Let the default proc do its WM_INPUT cleanup (and handle anything else).
fn continue_after(msg: &MSG) {
    unsafe { DispatchMessageW(msg) };
}

enum Raw {
    /// Virtual key, is_break, MakeCode, Flags (the last two only ever reach the P13 trace).
    Key(u16, bool, u16, u16),
    /// RAWMOUSE.usButtonFlags.
    Mouse(u16),
}

// Decode a WM_INPUT into a keyboard event (virtual key, is_break) or a mouse event (its button
// flags); None for anything else, or that fails to read.
fn read_raw_event(hrawinput: HRAWINPUT) -> Option<Raw> {
    let mut raw: RAWINPUT = unsafe { zeroed() };
    let mut size = size_of::<RAWINPUT>() as u32;
    let res = unsafe {
        GetRawInputData(
            hrawinput,
            RID_INPUT,
            &mut raw as *mut RAWINPUT as *mut c_void,
            &mut size,
            size_of::<RAWINPUTHEADER>() as u32,
        )
    };
    // (u32)-1 signals an error; a keyboard record is fixed-size so a short read cannot happen
    // silently — either the whole record arrived or we treat it as nothing.
    if res == u32::MAX {
        return None;
    }
    if raw.header.dwType == RIM_TYPEMOUSE {
        // SAFETY: dwType == RIM_TYPEMOUSE guarantees the mouse arm of the union is active. The low
        // word of ulButtons is usButtonFlags (the RAWMOUSE_0 union's two views of one u32).
        let buttons = unsafe { raw.data.mouse.Anonymous.ulButtons };
        return Some(Raw::Mouse((buttons & 0xFFFF) as u16));
    }
    if raw.header.dwType != RIM_TYPEKEYBOARD {
        return None;
    }
    // SAFETY: dwType == RIM_TYPEKEYBOARD guarantees the keyboard arm of the union is active.
    let kb = unsafe { raw.data.keyboard };
    // VKey 0xFF is a Windows escape for fake/overrun keys — never a real Ctrl, so ignore it.
    if kb.VKey == 0xFF {
        return None;
    }
    Some(Raw::Key(kb.VKey, kb.Flags & RI_KEY_BREAK != 0, kb.MakeCode, kb.Flags))
}

// A message-only window whose sole job is to be the RIDEV_INPUTSINK target. Its window proc
// is DefWindowProcW — we read Raw Input in the message loop, so the proc only needs to do
// default cleanup.
fn create_message_window() -> Option<HRAWINPUT> {
    // Wide, NUL-terminated class name.
    let class_name: Vec<u16> = "SpoolDoubleTapCtrl\0".encode_utf16().collect();
    let hinstance = unsafe { GetModuleHandleW(std::ptr::null()) };

    let mut wc: WNDCLASSW = unsafe { zeroed() };
    wc.lpfnWndProc = Some(DefWindowProcW);
    wc.hInstance = hinstance;
    wc.lpszClassName = class_name.as_ptr();
    // RegisterClassW returns 0 on failure; "already registered" also returns 0 with a
    // specific error, but install() runs once so that case does not arise here.
    let atom = unsafe { RegisterClassW(&wc) };
    if atom == 0 {
        let err = unsafe { GetLastError() };
        eprintln!("[double-tap-win] RegisterClassW failed (GetLastError {err})");
        return None;
    }

    let hwnd = unsafe {
        CreateWindowExW(
            0,
            class_name.as_ptr(),
            std::ptr::null(),
            0,
            0,
            0,
            0,
            0,
            HWND_MESSAGE,
            std::ptr::null_mut(),
            hinstance,
            std::ptr::null(),
        )
    };
    if hwnd.is_null() {
        let err = unsafe { GetLastError() };
        eprintln!("[double-tap-win] CreateWindowExW(HWND_MESSAGE) failed (GetLastError {err})");
        return None;
    }
    Some(hwnd)
}
