//! P15-4 (Ocean 2026-11-06, HANDOFF §9.2 第 255 – 256 条) — the capture-target switcher, main-process
//! half. 双击 ⇧ anywhere opens a small panel at the mouse pointer; the wheel moves through the
//! projects, a click on one picks it, a click anywhere outside closes it keeping the one in the
//! middle (「点面板外面关掉时：保留中间那个」), and the next capture goes there.
//!
//! The panel itself is a second window of the overlay process (`spool --overlay`, overlay.rs) —
//! same reason as the capture card: activating anything of the main process would bring the main
//! window up with it. ⛔ It never takes the keyboard (a stray 双击 ⇧ must not eat what the user types
//! next) and ⛔ never opens the database: the list arrives in the show message, the pick goes back
//! to the main window, which sets the target exactly as the tray menu does.
//!
//! What lives here: whether the gesture is on, whether the panel is up and where (the platform
//! gesture modules ask `click_is_outside` on every mouse-down while it is), and the show / close
//! round trip.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Runtime};

/// The panel's size in logical points. Seven rows — the chosen one in the middle, three either
/// side — plus a heading and a one-line hint. The webview lays itself out inside exactly this.
pub const PANEL_WIDTH: f64 = 300.0;
pub const ROW_HEIGHT: f64 = 28.0;
pub const ROWS: usize = 7;
const HEAD: f64 = 30.0;
const HINT: f64 = 26.0;
pub const PANEL_HEIGHT: f64 = HEAD + ROW_HEIGHT * ROWS as f64 + HINT;
/// Kept off the screen's edges.
const MARGIN: f64 = 8.0;

/// Window label in the overlay process; capabilities/overlay.json lists it.
pub const WINDOW_LABEL: &str = "switcher";
/// Main window ← Rust: the gesture fired and no panel is up — build the list and ask for it.
pub const TRIGGER_EVENT: &str = "switcher-trigger";

/// The setting 「双击 ⇧ 切换捕捉目标」 (default on). Read from settings.json at startup, pushed by the
/// main window whenever it changes.
static GESTURE_ON: AtomicBool = AtomicBool::new(true);
static OPEN: AtomicBool = AtomicBool::new(false);
/// (x, y, w, h) in global logical points while the panel is up.
static FRAME: Mutex<Option<(f64, f64, f64, f64)>> = Mutex::new(None);

/// The gesture modules ask before doing anything: the setting, and the 「暂停捕捉手势」 switch over all
/// of Spool's gestures (memory double-tap-exclusivity: everything that can win must be able to stand
/// down in one click).
pub fn gesture_enabled() -> bool {
    GESTURE_ON.load(Ordering::Relaxed) && !crate::capture::capture_disabled()
}

/// Startup read, before the webview is up — same reasoning as `capture::load_capture_disabled`.
/// Missing or unreadable = on.
pub fn load_gesture_setting() {
    let on = crate::mcp::app_data_dir()
        .and_then(|dir| std::fs::read_to_string(dir.join("settings.json")).ok())
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok())
        .and_then(|v| v.get("switcherGesture").and_then(serde_json::Value::as_bool))
        .unwrap_or(true);
    GESTURE_ON.store(on, Ordering::Relaxed);
}

#[tauri::command]
pub fn set_switcher_gesture(on: bool) {
    GESTURE_ON.store(on, Ordering::Relaxed);
}

/// 双击 ⇧ was seen (called from the gesture threads). A second one while the panel is up closes it.
pub fn on_gesture<R: Runtime>(app: &AppHandle<R>) {
    if !gesture_enabled() {
        return;
    }
    if OPEN.load(Ordering::SeqCst) {
        dismiss();
    } else {
        let _ = app.emit_to("main", TRIGGER_EVENT, ());
    }
}

/// True only while the panel is up and the point (global logical points) is outside it.
pub fn click_is_outside(px: f64, py: f64) -> bool {
    match *FRAME.lock().unwrap() {
        Some((x, y, w, h)) => px < x || px > x + w || py < y || py > y + h,
        None => false,
    }
}

/// Close the panel keeping what is chosen (click outside, the gesture again). The webview answers
/// with `switcher-closed`.
pub fn dismiss() {
    if OPEN.load(Ordering::SeqCst) {
        crate::overlay::send(&serde_json::json!({ "t": "switcher-dismiss" }));
    }
}

/// Where the panel goes: the middle row under the pointer, the whole panel inside the work area.
/// All in logical points.
fn place(cursor: (f64, f64), work: (f64, f64, f64, f64)) -> (f64, f64) {
    let (cx, cy) = cursor;
    let (wx, wy, ww, wh) = work;
    let middle = HEAD + ROW_HEIGHT * (ROWS / 2) as f64 + ROW_HEIGHT / 2.0;
    let x = (cx - PANEL_WIDTH / 2.0).clamp(wx + MARGIN, (wx + ww - PANEL_WIDTH - MARGIN).max(wx + MARGIN));
    let y = (cy - middle).clamp(wy + MARGIN, (wy + wh - PANEL_HEIGHT - MARGIN).max(wy + MARGIN));
    (x, y)
}

/// The main window built the list (`useTargetSwitcher`); put it up at the pointer.
#[tauri::command]
pub fn show_target_switcher<R: Runtime>(app: AppHandle<R>, payload: serde_json::Value) -> Result<(), String> {
    let monitor = crate::capture::active_monitor(&app).ok_or("no monitor available")?;
    let scale = monitor.scale_factor();
    let work = monitor.work_area();
    let work = (
        work.position.x as f64 / scale,
        work.position.y as f64 / scale,
        work.size.width as f64 / scale,
        work.size.height as f64 / scale,
    );
    // macOS: the cursor is in the primary display's scale, not this one's (capture::cursor_logical, P20-5).
    let cursor = tauri::Manager::get_webview_window(&app, "main")
        .and_then(|w| w.cursor_position().ok())
        .map(|c| {
            #[cfg(target_os = "macos")]
            return crate::capture::cursor_logical(&app, c);
            #[cfg(not(target_os = "macos"))]
            return (c.x / scale, c.y / scale);
        })
        .unwrap_or((work.0 + work.2 / 2.0, work.1 + work.3 / 2.0));
    let (x, y) = place(cursor, work);
    *FRAME.lock().unwrap() = Some((x, y, PANEL_WIDTH, PANEL_HEIGHT));
    #[cfg(target_os = "windows")]
    crate::double_tap_win::set_switcher_scale(scale);
    OPEN.store(true, Ordering::SeqCst);
    let sent = crate::overlay::send(&serde_json::json!({
        "t": "switcher",
        "x": x,
        "y": y,
        "w": PANEL_WIDTH,
        "h": PANEL_HEIGHT,
        "payload": payload,
    }));
    if !sent {
        on_closed(&app, None);
        return Err("capture overlay process is not running".into());
    }
    Ok(())
}

/// The panel closed (overlay process → `switcher-closed`). `picked` is set only when the user moved
/// to another project; the main window then makes it the capture target.
pub fn on_closed<R: Runtime>(app: &AppHandle<R>, picked: Option<String>) {
    OPEN.store(false, Ordering::SeqCst);
    *FRAME.lock().unwrap() = None;
    if let Some(id) = picked {
        let _ = app.emit_to("main", "overlay:action", serde_json::json!({ "kind": "switch-target", "id": id }));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_middle_row_sits_under_the_pointer_and_the_panel_stays_on_screen() {
        let work = (0.0, 25.0, 1440.0, 875.0);
        let (x, y) = place((700.0, 400.0), work);
        assert_eq!(x, 700.0 - PANEL_WIDTH / 2.0);
        let middle_row_top = y + HEAD + ROW_HEIGHT * 3.0;
        assert!((middle_row_top..middle_row_top + ROW_HEIGHT).contains(&400.0));
        // Top-left corner, bottom-right corner, a second screen to the left.
        assert_eq!(place((2.0, 30.0), work), (MARGIN, 25.0 + MARGIN));
        let (x, y) = place((1439.0, 899.0), work);
        assert_eq!((x, y), (1440.0 - PANEL_WIDTH - MARGIN, 25.0 + 875.0 - PANEL_HEIGHT - MARGIN));
        let (x, _) = place((-1000.0, 400.0), (-1920.0, 0.0, 1920.0, 1080.0));
        assert_eq!(x, -1000.0 - PANEL_WIDTH / 2.0);
    }

    #[test]
    fn click_outside_counts_only_while_the_panel_is_up() {
        *FRAME.lock().unwrap() = None;
        assert!(!click_is_outside(0.0, 0.0));
        *FRAME.lock().unwrap() = Some((100.0, 100.0, PANEL_WIDTH, PANEL_HEIGHT));
        assert!(click_is_outside(50.0, 150.0));
        assert!(!click_is_outside(150.0, 150.0));
        *FRAME.lock().unwrap() = None;
    }
}
