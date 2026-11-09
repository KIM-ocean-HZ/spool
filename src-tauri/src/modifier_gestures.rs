//! The decisions behind the bare-modifier gestures, with no OS in them — the platform modules
//! (`double_tap.rs` on macOS, `double_tap_win.rs` on Windows) read the key / mouse stream and feed
//! it here with the times they read off it.
//!
//! Why a file of its own: `double_tap_win.rs` is `#![cfg(target_os = "windows")]`, so nothing in it
//! has ever run on the development machine (a Mac). Everything that DECIDES lives here instead, and
//! `cargo test` on the Mac covers it; the Windows file is left with the Raw Input plumbing.
//!
//! Two things live here:
//!   * `ShiftTaps` — 双击 ⇧ opens the capture-target switcher (P15-4, Ocean 2026-11-06, HANDOFF §9.2
//!     第 256 条: 「唤出方式：甲，双击 ⇧」). Same on both platforms.
//!   * `WinKeys` — the whole Windows key stream: double-tap Ctrl (capture, moved here unchanged from
//!     double_tap_win.rs), long-press Ctrl (write a note, P15-4: 「我不允许 windows 版没有类似 mac 的
//!     长按 option 功能」 / 「0.8 秒松手」), Win+PrtScn, and the ⇧ taps.

// ---------------------------------------------------------------------------------------------
// 双击 ⇧
// ---------------------------------------------------------------------------------------------

/// A tap is a ⇧ press and release with nothing else in between, held for less than this.
pub(crate) const SHIFT_TAP_MAX_HOLD_MS: i64 = 300;
/// …and the second tap's release comes at most this long after the first one's.
///
/// ⚠️ Decided on the RELEASE of the second tap, not its press (unlike the ⌥ double-tap on macOS):
/// ⇧ is the key people hold to type a capital, and 「tap ⇧, then ⇧+A」 must not open anything — only
/// at the release do we know the second press was a tap. Tight on purpose: a Chinese IME switches
/// 中/英 on a bare ⇧, and two quick toggles are the likeliest accidental pair.
pub(crate) const SHIFT_DOUBLE_TAP_WINDOW_MS: i64 = 300;

#[derive(Debug, Default)]
pub(crate) struct ShiftTaps {
    down_at: Option<i64>,
    dirty: bool,
    last_release: Option<i64>,
}

impl ShiftTaps {
    /// For a `static` (the macOS tap keeps its state in one).
    #[cfg_attr(not(target_os = "macos"), allow(dead_code))]
    pub(crate) const fn new_const() -> Self {
        ShiftTaps { down_at: None, dirty: false, last_release: None }
    }

    /// ⇧ went down. `combo`: another modifier was already held (⌘⇧…, Ctrl+⇧…) — then it is a chord.
    /// A repeat while it is still down is ignored.
    pub(crate) fn press(&mut self, now_ms: i64, combo: bool) {
        if self.down_at.is_some() {
            return;
        }
        self.down_at = Some(now_ms);
        self.dirty = combo;
        if combo {
            self.last_release = None;
        }
    }

    /// Any other key, modifier or mouse button. While ⇧ is down it makes this press a chord (⇧+A,
    /// ⇧-click); between the two taps it breaks the pair.
    pub(crate) fn other_input(&mut self) {
        if self.down_at.is_some() {
            self.dirty = true;
        }
        self.last_release = None;
    }

    /// ⇧ came up. True exactly when this release completes a clean double-tap.
    pub(crate) fn release(&mut self, now_ms: i64) -> bool {
        let Some(at) = self.down_at.take() else { return false };
        let held = now_ms - at;
        if self.dirty || !(0..SHIFT_TAP_MAX_HOLD_MS).contains(&held) {
            self.last_release = None;
            return false;
        }
        match self.last_release.take() {
            // Taken, so a third quick tap does not chain off this pair.
            Some(prev) if (0..=SHIFT_DOUBLE_TAP_WINDOW_MS).contains(&(now_ms - prev)) => true,
            _ => {
                self.last_release = Some(now_ms);
                false
            }
        }
    }

    /// The pause switch, or the gesture turned off: nothing half-done survives it.
    pub(crate) fn reset(&mut self) {
        *self = ShiftTaps::default();
    }
}

// ---------------------------------------------------------------------------------------------
// Windows: Ctrl (double-tap = capture, long-press = note), Win+PrtScn, ⇧
// ---------------------------------------------------------------------------------------------

#[cfg_attr(not(target_os = "windows"), allow(unused_imports))]
pub(crate) use win::*;

// Only the Windows build calls into this; the Mac build compiles it for its tests.
#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
mod win {
use super::ShiftTaps;

// Two Ctrl taps within this many ms are a double-tap. Matches the macOS module's 250ms
// (double_tap.rs — read the reasoning there, it is the same gesture on the other platform).
//
// ⚠️ 2026-08-25 (WORKPLAN §2.V4, Ocean): 500 → 250, changed in lockstep with the macOS
// module. This used to say it matched the Windows system double-click default too — it no
// longer does, on purpose: ⌥/Ctrl is a key the user also presses for its normal job, so the
// window is tuned against false positives rather than against a mouse-calibrated default.
//
// ⚠️ ⛔ This and double_tap.rs's DOUBLE_TAP_WINDOW_MS must not drift apart. The value was changed
// on Ocean's report from the macOS build; a one-sided edit here leaves this comment lying.
pub(crate) const DOUBLE_TAP_WINDOW_MS: i32 = 250;

/// P15-4 (Ocean 2026-11-06 第 256 条): 「0.5 还是有点短，容易误触」 ⇒ 0.8 s. Long-press Ctrl writes a note —
/// the Windows peer of long-press ⌥ — and, unlike the Mac, it is decided on the RELEASE: Ctrl is the
/// key Windows users hold while they think and then press V. Anything else while it is held (a key,
/// a mouse button, the wheel) makes it a chord.
pub(crate) const LONG_PRESS_MIN_MS: i32 = 800;
/// Held longer than this and released with nothing else pressed: a finger resting on the key, not a
/// gesture.
pub(crate) const LONG_PRESS_MAX_MS: i32 = 3000;
/// P3-4 on the Mac: a ⌘C/⌘X at most this long before the ⌥ press puts its text in the note card.
/// Ctrl+C here.
pub(crate) const LONG_PRESS_COPY_WINDOW_MS: i32 = 2000;

// Virtual-key codes (winuser.h). Raw Input reports the generic VK_CONTROL for either Ctrl; the L/R
// specifics are accepted too in case a layout/driver reports them, so "either Ctrl key" is honoured
// the way "either ⌥" is on macOS.
pub(crate) const VK_CONTROL: u16 = 0x11;
pub(crate) const VK_LCONTROL: u16 = 0xA2;
pub(crate) const VK_RCONTROL: u16 = 0xA3;
pub(crate) const VK_SHIFT: u16 = 0x10;
pub(crate) const VK_LSHIFT: u16 = 0xA0;
pub(crate) const VK_RSHIFT: u16 = 0xA1;
pub(crate) const VK_MENU: u16 = 0x12; // Alt
pub(crate) const VK_LMENU: u16 = 0xA4;
pub(crate) const VK_RMENU: u16 = 0xA5;
pub(crate) const VK_LWIN: u16 = 0x5B;
pub(crate) const VK_RWIN: u16 = 0x5C;
pub(crate) const VK_SNAPSHOT: u16 = 0x2C; // PrtScn
pub(crate) const VK_C: u16 = 0x43;
pub(crate) const VK_X: u16 = 0x58;

fn is_ctrl(vk: u16) -> bool {
    vk == VK_CONTROL || vk == VK_LCONTROL || vk == VK_RCONTROL
}
fn is_shift(vk: u16) -> bool {
    vk == VK_SHIFT || vk == VK_LSHIFT || vk == VK_RSHIFT
}
fn is_alt(vk: u16) -> bool {
    vk == VK_MENU || vk == VK_LMENU || vk == VK_RMENU
}
fn is_win(vk: u16) -> bool {
    vk == VK_LWIN || vk == VK_RWIN
}
/// The four keys the P13 gesture trace may write down — never an ordinary key.
pub(crate) fn is_modifier(vk: u16) -> bool {
    is_ctrl(vk) || is_shift(vk) || is_alt(vk) || is_win(vk)
}

/// What one event completed.
#[derive(Debug, PartialEq, Eq)]
pub(crate) enum WinKeyOutcome {
    Nothing,
    /// Double-tap Ctrl — capture.
    CtrlDoubleTap,
    /// Long-press Ctrl — write a note; `copied` = an unused Ctrl+C / Ctrl+X came at most
    /// LONG_PRESS_COPY_WINDOW_MS before this press.
    CtrlLongPress { copied: bool },
    /// Double-tap ⇧ — the capture-target switcher.
    ShiftDoubleTap,
}

/// The whole Windows decision, as plain fields on the single message-loop thread. Times are
/// `GetMessageTime` values (ms, wrapping every ~49 days — every gap is a `wrapping_sub`).
#[derive(Debug, Default)]
pub(crate) struct WinKeys {
    // GetMessageTime of the last clean Ctrl tap; paired with `have_first` because a real
    // message time can legitimately be 0.
    last_tap_ms: i32,
    have_first: bool,
    // Whether Ctrl is currently held — dedupes key-repeat makes into one press.
    ctrl_down: bool,
    ctrl_down_at: i32,
    // Set if a non-Ctrl key went down — or a mouse button / the wheel was used — while Ctrl was
    // held: this Ctrl is a chord, not a tap or a long press.
    other_input_since_ctrl_down: bool,
    // Set if another modifier was already held when Ctrl went down (⇧+Ctrl, Alt+Ctrl …).
    combo_at_press: bool,
    // The last Ctrl+C / Ctrl+X, and whether a note card or a capture has already taken it (on the
    // Mac a copy is carried into one card only — P3-4).
    last_copy_at: Option<i32>,
    copy_used: bool,
    // Decided at the Ctrl press, the way the Mac decides at the ⌥ press.
    copy_at_press: bool,
    shift_down: bool,
    alt_down: bool,
    win_down: bool,
    // P9H-7 ③: the last Win+PrtScn — GetMessageTime (for the window) and the wall clock (the file
    // it writes is dated by it). Win+PrtScn writes into the Screenshots folder; PrtScn and
    // Win+Shift+S go to the clipboard and are read from there, as before.
    pub(crate) last_shot: Option<(i32, u64)>,
    shift: ShiftTaps,
}

impl WinKeys {
    /// Feed one keyboard event: its virtual key, whether it is a key-up, its `GetMessageTime`, and
    /// the wall clock (only used to date a Win+PrtScn).
    pub(crate) fn on_key(&mut self, vk: u16, is_break: bool, now: i32, wall_ms: u64) -> WinKeyOutcome {
        if is_ctrl(vk) {
            if !is_break {
                // Press. Ignore auto-repeat (Ctrl already down).
                if !self.ctrl_down {
                    self.ctrl_down = true;
                    self.ctrl_down_at = now;
                    self.other_input_since_ctrl_down = false;
                    self.combo_at_press = self.shift_down || self.alt_down || self.win_down;
                    self.copy_at_press = !self.copy_used
                        && self
                            .last_copy_at
                            .is_some_and(|at| (0..=LONG_PRESS_COPY_WINDOW_MS).contains(&now.wrapping_sub(at)));
                    // Ctrl joining a held ⇧ makes that ⇧ a chord.
                    self.shift.other_input();
                }
                return WinKeyOutcome::Nothing;
            }
            // Release.
            if !self.ctrl_down {
                return WinKeyOutcome::Nothing;
            }
            self.ctrl_down = false;
            let clean = !self.other_input_since_ctrl_down && !self.combo_at_press;
            if !clean {
                // A chord released — cannot pair with a later tap.
                self.have_first = false;
                return WinKeyOutcome::Nothing;
            }
            let held = now.wrapping_sub(self.ctrl_down_at);
            if !(0..LONG_PRESS_MIN_MS).contains(&held) {
                // ⛔ A long hold is never half of a double-tap — not even when it was too long to be a
                // long press.
                self.have_first = false;
                if (LONG_PRESS_MIN_MS..=LONG_PRESS_MAX_MS).contains(&held) {
                    let copied = self.copy_at_press;
                    if copied {
                        self.copy_used = true;
                    }
                    return WinKeyOutcome::CtrlLongPress { copied };
                }
                return WinKeyOutcome::Nothing;
            }
            if self.have_first {
                // wrapping_sub handles the ~49-day GetMessageTime rollover; a negative or
                // over-window gap just restarts the pairing with this tap as the new first.
                let gap = now.wrapping_sub(self.last_tap_ms);
                if (0..=DOUBLE_TAP_WINDOW_MS).contains(&gap) {
                    // Reset so a third quick tap doesn't chain off this one's timestamp.
                    self.have_first = false;
                    // The capture takes the copied text — the Mac counts that as using the ⌘C too.
                    self.copy_used = true;
                    return WinKeyOutcome::CtrlDoubleTap;
                }
                self.last_tap_ms = now;
            } else {
                self.last_tap_ms = now;
                self.have_first = true;
            }
            return WinKeyOutcome::Nothing;
        }

        if is_shift(vk) {
            // Track it for `combo_at_press` on the next Ctrl press, as before.
            self.shift_down = !is_break;
            if is_break {
                if self.shift.release(now as i64) {
                    return WinKeyOutcome::ShiftDoubleTap;
                }
            } else {
                self.shift.press(now as i64, self.ctrl_down || self.alt_down || self.win_down);
                // ⇧ while Ctrl is held: a chord (Ctrl+⇧+…).
                if self.ctrl_down {
                    self.other_input_since_ctrl_down = true;
                }
                // Any real keypress between the two Ctrl taps means this was not a bare double-tap.
                self.have_first = false;
            }
            return WinKeyOutcome::Nothing;
        }

        // A non-Ctrl, non-⇧ key.
        if vk == VK_SNAPSHOT && self.win_down {
            self.last_shot = Some((now, wall_ms));
        }
        if !is_break {
            if self.ctrl_down {
                self.other_input_since_ctrl_down = true;
                if vk == VK_C || vk == VK_X {
                    self.last_copy_at = Some(now);
                    self.copy_used = false;
                }
            }
            // Any real keypress between the two Ctrl taps means this was not a bare
            // double-tap — drop a pending first tap.
            self.have_first = false;
            self.shift.other_input();
        }
        if is_alt(vk) {
            self.alt_down = !is_break;
        } else if is_win(vk) {
            self.win_down = !is_break;
        }
        WinKeyOutcome::Nothing
    }

    /// A mouse button went down, or the wheel turned. While Ctrl is held that makes it Ctrl+click /
    /// Ctrl+drag / Ctrl+wheel (zoom) — never a long press. Between two taps it breaks the pair.
    pub(crate) fn on_mouse(&mut self) {
        if self.ctrl_down {
            self.other_input_since_ctrl_down = true;
        }
        self.have_first = false;
        self.shift.other_input();
    }

    pub(crate) fn ctrl_held(&self) -> bool {
        self.ctrl_down
    }

    /// P13 (real-hand long-press Ctrl never fired in the VM): the state the next decision reads.
    pub(crate) fn trace(&self) -> String {
        format!(
            "ctrl_down={} since={} other={} combo={} shift={} alt={} win={}",
            self.ctrl_down,
            self.ctrl_down_at,
            self.other_input_since_ctrl_down,
            self.combo_at_press,
            self.shift_down,
            self.alt_down,
            self.win_down
        )
    }

    /// The pause switch: drop whatever half-gesture is pending.
    pub(crate) fn reset_gestures(&mut self) {
        self.have_first = false;
        self.other_input_since_ctrl_down = true;
        self.shift.reset();
    }
}
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- 双击 ⇧ ----

    fn taps(events: &[(&str, i64)]) -> Vec<bool> {
        let mut s = ShiftTaps::default();
        events
            .iter()
            .filter_map(|&(e, t)| match e {
                "down" => {
                    s.press(t, false);
                    None
                }
                "combo" => {
                    s.press(t, true);
                    None
                }
                "up" => Some(s.release(t)),
                "key" => {
                    s.other_input();
                    None
                }
                _ => unreachable!(),
            })
            .collect()
    }

    #[test]
    fn two_clean_shift_taps_fire_on_the_second_release() {
        assert_eq!(taps(&[("down", 0), ("up", 80), ("down", 200), ("up", 280)]), vec![false, true]);
        // The edge of the window is in; one millisecond past is not.
        assert_eq!(taps(&[("down", 0), ("up", 80), ("down", 300), ("up", 380)]), vec![false, true]);
        assert_eq!(taps(&[("down", 0), ("up", 80), ("down", 301), ("up", 381)]), vec![false, false]);
        // A third quick tap does not chain off the pair; a fourth makes a new pair.
        assert_eq!(
            taps(&[("down", 0), ("up", 50), ("down", 100), ("up", 150), ("down", 200), ("up", 250), ("down", 300), ("up", 350)]),
            vec![false, true, false, true]
        );
    }

    #[test]
    fn shift_held_for_a_capital_or_a_chord_is_not_a_tap() {
        // ⇧ tap, then ⇧+A: the second press is a chord — nothing opens.
        assert_eq!(taps(&[("down", 0), ("up", 60), ("down", 120), ("key", 140), ("up", 200)]), vec![false, false]);
        // A key between the taps breaks the pair.
        assert_eq!(taps(&[("down", 0), ("up", 60), ("key", 100), ("down", 150), ("up", 200)]), vec![false, false]);
        // Held too long.
        assert_eq!(taps(&[("down", 0), ("up", 300), ("down", 350), ("up", 400)]), vec![false, false]);
        assert_eq!(taps(&[("down", 0), ("up", 60), ("down", 100), ("up", 400)]), vec![false, false]);
        // With ⌘ / Ctrl already held.
        assert_eq!(taps(&[("combo", 0), ("up", 60), ("down", 100), ("up", 160)]), vec![false, false]);
        assert_eq!(taps(&[("down", 0), ("up", 60), ("combo", 100), ("up", 160)]), vec![false, false]);
    }

    // ---- Windows ----

    const CTRL: u16 = VK_CONTROL;

    struct Feed {
        k: WinKeys,
        out: Vec<WinKeyOutcome>,
    }
    impl Feed {
        fn new() -> Self {
            Feed { k: WinKeys::default(), out: vec![] }
        }
        fn key(&mut self, vk: u16, up: bool, t: i32) -> &mut Self {
            let o = self.k.on_key(vk, up, t, 0);
            if o != WinKeyOutcome::Nothing {
                self.out.push(o);
            }
            self
        }
        fn tap(&mut self, vk: u16, down: i32, up: i32) -> &mut Self {
            self.key(vk, false, down).key(vk, true, up)
        }
        fn mouse(&mut self) -> &mut Self {
            self.k.on_mouse();
            self
        }
    }

    #[test]
    fn double_tap_ctrl_is_unchanged() {
        let mut f = Feed::new();
        f.tap(CTRL, 0, 60).tap(CTRL, 150, 200);
        assert_eq!(f.out, vec![WinKeyOutcome::CtrlDoubleTap]);
        // Too slow; Ctrl+C in between; a third tap does not chain.
        let mut f = Feed::new();
        f.tap(CTRL, 0, 60).tap(CTRL, 300, 400);
        assert!(f.out.is_empty());
        let mut f = Feed::new();
        f.key(CTRL, false, 0).tap(VK_C, 20, 40).key(CTRL, true, 60).tap(CTRL, 120, 180);
        assert!(f.out.is_empty());
        let mut f = Feed::new();
        f.tap(CTRL, 0, 40).tap(CTRL, 100, 140).tap(CTRL, 200, 240);
        assert_eq!(f.out, vec![WinKeyOutcome::CtrlDoubleTap]);
        // Shift held at the Ctrl press: a combo.
        let mut f = Feed::new();
        f.key(VK_SHIFT, false, 0).tap(CTRL, 10, 50).tap(CTRL, 100, 150);
        assert!(f.out.is_empty());
    }

    #[test]
    fn long_press_ctrl_fires_on_release_between_0_8_and_3_seconds() {
        for (held, fires) in [(799, false), (800, true), (1500, true), (3000, true), (3001, false)] {
            let mut f = Feed::new();
            f.tap(CTRL, 1000, 1000 + held);
            let want = if fires { vec![WinKeyOutcome::CtrlLongPress { copied: false }] } else { vec![] };
            assert_eq!(f.out, want, "held {held}ms");
        }
        // Nothing while it is still held — the card only comes at the release.
        let mut f = Feed::new();
        f.key(CTRL, false, 0);
        assert!(f.out.is_empty());
    }

    #[test]
    fn long_press_ctrl_is_cancelled_by_any_key_click_or_wheel() {
        // Ctrl … pause … V: a paste, not a note.
        let mut f = Feed::new();
        f.key(CTRL, false, 0).tap(0x56, 900, 950).key(CTRL, true, 1000);
        assert!(f.out.is_empty());
        // Ctrl+click / Ctrl+drag / Ctrl+wheel zoom: the mouse arrives while Ctrl is held.
        let mut f = Feed::new();
        f.key(CTRL, false, 0).mouse().key(CTRL, true, 1200);
        assert!(f.out.is_empty());
        // ⇧ joins: Ctrl+⇧.
        let mut f = Feed::new();
        f.key(CTRL, false, 0).tap(VK_SHIFT, 300, 400).key(CTRL, true, 1200);
        assert!(f.out.is_empty());
        // Alt already held when Ctrl went down.
        let mut f = Feed::new();
        f.key(VK_MENU, false, 0).key(CTRL, false, 10).key(CTRL, true, 1000);
        assert!(f.out.is_empty());
    }

    #[test]
    fn a_long_press_is_never_half_of_a_double_tap() {
        let mut f = Feed::new();
        f.tap(CTRL, 0, 900).tap(CTRL, 1000, 1050);
        assert_eq!(f.out, vec![WinKeyOutcome::CtrlLongPress { copied: false }]);
        // Even one held too long to be a long press.
        let mut f = Feed::new();
        f.tap(CTRL, 0, 4000).tap(CTRL, 4100, 4150);
        assert!(f.out.is_empty());
    }

    #[test]
    fn long_press_ctrl_carries_an_unused_copy_from_the_last_two_seconds_once() {
        let copy = |f: &mut Feed, at: i32| {
            f.key(CTRL, false, at).tap(VK_C, at + 20, at + 40).key(CTRL, true, at + 60);
        };
        let mut f = Feed::new();
        copy(&mut f, 0);
        f.tap(CTRL, 500, 1400); // pressed 0.5 s after the copy
        assert_eq!(f.out, vec![WinKeyOutcome::CtrlLongPress { copied: true }]);
        // The same copy is not carried into a second card.
        f.tap(CTRL, 1500, 2400);
        assert_eq!(f.out[1], WinKeyOutcome::CtrlLongPress { copied: false });
        // Older than 2 s at the press: not carried.
        let mut f = Feed::new();
        copy(&mut f, 0);
        f.tap(CTRL, 2041, 3000);
        assert_eq!(f.out, vec![WinKeyOutcome::CtrlLongPress { copied: false }]);
        // A double-tap capture takes it too.
        let mut f = Feed::new();
        copy(&mut f, 0);
        f.tap(CTRL, 100, 140).tap(CTRL, 200, 240).tap(CTRL, 400, 1300);
        assert_eq!(f.out, vec![WinKeyOutcome::CtrlDoubleTap, WinKeyOutcome::CtrlLongPress { copied: false }]);
    }

    #[test]
    fn shift_double_tap_on_windows_and_its_chords() {
        let mut f = Feed::new();
        f.tap(VK_LSHIFT, 0, 60).tap(VK_RSHIFT, 150, 210);
        assert_eq!(f.out, vec![WinKeyOutcome::ShiftDoubleTap]);
        // Ctrl held: Ctrl+⇧, not a tap.
        let mut f = Feed::new();
        f.key(CTRL, false, 0).tap(VK_SHIFT, 10, 50).tap(VK_SHIFT, 100, 150).key(CTRL, true, 200);
        assert!(f.out.is_empty());
        // ⇧-click between.
        let mut f = Feed::new();
        f.tap(VK_SHIFT, 0, 60).key(VK_SHIFT, false, 100).mouse().key(VK_SHIFT, true, 160);
        assert!(f.out.is_empty());
        // ⇧ tap, then ⇧+A.
        let mut f = Feed::new();
        f.tap(VK_SHIFT, 0, 60).key(VK_SHIFT, false, 100).tap(0x41, 120, 140).key(VK_SHIFT, true, 160);
        assert!(f.out.is_empty());
    }

    #[test]
    fn win_prtscn_is_still_recorded() {
        let mut k = WinKeys::default();
        k.on_key(VK_LWIN, false, 10, 0);
        k.on_key(VK_SNAPSHOT, false, 20, 777);
        assert_eq!(k.last_shot, Some((20, 777)));
    }

    #[test]
    fn the_pause_switch_drops_a_half_gesture() {
        let mut f = Feed::new();
        f.tap(CTRL, 0, 50);
        f.k.reset_gestures();
        f.tap(CTRL, 100, 150);
        assert!(f.out.is_empty());
        let mut f = Feed::new();
        f.key(CTRL, false, 0);
        f.k.reset_gestures();
        f.key(CTRL, true, 1000);
        assert!(f.out.is_empty());
    }
}
