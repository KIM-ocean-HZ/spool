//! P7-6 (Ocean 2026-09-30 §9.2 第 11 条 + 10-07 第 43、44 条) — images inside blocks.
//!
//! The bytes live in the library file (`block_images`, v32): an export is one `VACUUM INTO`
//! and the images go with it, an import merges them like any other row. A block may hold
//! several; `position` orders them.
//!
//! Why this is Rust and not the webview: tauri-plugin-sql moves values as JSON, so a BLOB
//! comes back as an array of numbers and cannot be bound at all. Everything that touches the
//! bytes — storing, scaling a preview, handing over the original — happens here, on its own
//! SQLite connection, and the webview only ever receives a `data:` URL: the content security
//! policy allows `img-src 'self' data:` and ⛔ that is not changed by one character.
//!
//! ⛔ No network anywhere in this file, and the `image` crate pulls none in (`cargo tree`).

use std::io::Cursor;

use base64::Engine as _;
use image::{GenericImageView, ImageFormat, ImageReader, Limits};
use rusqlite::{Connection, OptionalExtension};
use serde::Serialize;

/// One image, at most this many bytes (as stored). A full-screen Retina screenshot is a few
/// megabytes; 20 MB leaves room for a large photo and refuses what is really a file.
pub const MAX_IMAGE_BYTES: usize = 20 * 1024 * 1024;
/// Decoding guard: an image claiming more pixels than this is refused rather than allocated.
const MAX_EDGE_PX: u32 = 20_000;
/// The preview's longer edge, in device pixels (a block shows it at most ~480 CSS px wide).
pub const PREVIEW_EDGE_PX: u32 = 960;

/// What gets stored: the original bytes (TIFF converted to PNG — the macOS clipboard hands
/// screenshots over as TIFF, and a webview on Windows cannot draw one), and what they are.
#[derive(Debug)]
pub struct Prepared {
    pub format: &'static str,
    pub width: u32,
    pub height: u32,
    pub bytes: Vec<u8>,
}

/// The webview's view of one stored image — never the bytes.
#[derive(Debug, Serialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ImageMeta {
    pub id: String,
    pub block_id: String,
    pub position: i64,
    pub format: String,
    pub width: i64,
    pub height: i64,
    pub size_bytes: i64,
    pub created_at: i64,
}

fn limits() -> Limits {
    let mut l = Limits::default();
    l.max_image_width = Some(MAX_EDGE_PX);
    l.max_image_height = Some(MAX_EDGE_PX);
    l
}

/// Errors come back as codes, never sentences: the webview writes the words in the user's
/// language (`too_large:<bytes>` / `unsupported`).
pub fn prepare(bytes: Vec<u8>) -> Result<Prepared, String> {
    if bytes.len() > MAX_IMAGE_BYTES {
        return Err(format!("too_large:{}", bytes.len()));
    }
    let mut reader = ImageReader::new(Cursor::new(&bytes))
        .with_guessed_format()
        .map_err(|_| "unsupported".to_string())?;
    reader.limits(limits());
    let format = match reader.format() {
        Some(ImageFormat::Png) => "png",
        Some(ImageFormat::Jpeg) => "jpeg",
        Some(ImageFormat::Gif) => "gif",
        Some(ImageFormat::WebP) => "webp",
        Some(ImageFormat::Tiff) => "tiff",
        _ => return Err("unsupported".into()),
    };
    // Decoded in full once, here: a file that only has a valid header must not get in and
    // then fail every time it is drawn.
    let img = reader.decode().map_err(|_| "unsupported".to_string())?;
    let (width, height) = img.dimensions();
    if format != "tiff" {
        return Ok(Prepared { format, width, height, bytes });
    }
    let mut png = Vec::new();
    img.write_to(&mut Cursor::new(&mut png), ImageFormat::Png)
        .map_err(|_| "unsupported".to_string())?;
    if png.len() > MAX_IMAGE_BYTES {
        return Err(format!("too_large:{}", png.len()));
    }
    Ok(Prepared { format: "png", width, height, bytes: png })
}

/// Appends after the block's last image, in the order given. Refuses a block that is not
/// there (an image with no block is invisible everywhere and would only take up space).
pub fn insert_images(
    conn: &Connection,
    block_id: &str,
    images: &[Prepared],
    now: i64,
) -> Result<Vec<ImageMeta>, String> {
    let exists: Option<i64> = conn
        .query_row("SELECT 1 FROM blocks WHERE id = ?1", [block_id], |r| r.get(0))
        .optional()
        .map_err(|e| e.to_string())?;
    if exists.is_none() {
        return Err("no_block".into());
    }
    let mut next: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM block_images WHERE block_id = ?1",
            [block_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let mut out = Vec::with_capacity(images.len());
    for img in images {
        let id = crate::mcp::new_id()?;
        conn.execute(
            "INSERT INTO block_images (id, block_id, position, bytes, format, width, height,
                                       size_bytes, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                id,
                block_id,
                next,
                img.bytes,
                img.format,
                img.width,
                img.height,
                img.bytes.len() as i64,
                now
            ],
        )
        .map_err(|e| e.to_string())?;
        out.push(ImageMeta {
            id,
            block_id: block_id.to_string(),
            position: next,
            format: img.format.to_string(),
            width: i64::from(img.width),
            height: i64::from(img.height),
            size_bytes: img.bytes.len() as i64,
            created_at: now,
        });
        next += 1;
    }
    Ok(out)
}

pub fn read_image(conn: &Connection, id: &str) -> Result<(String, Vec<u8>), String> {
    conn.query_row("SELECT format, bytes FROM block_images WHERE id = ?1", [id], |r| {
        Ok((r.get(0)?, r.get(1)?))
    })
    .map_err(|_| "no_image".to_string())
}

fn mime(format: &str) -> &'static str {
    match format {
        "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => "image/png",
    }
}

fn data_url(mime: &str, bytes: &[u8]) -> String {
    format!("data:{mime};base64,{}", base64::engine::general_purpose::STANDARD.encode(bytes))
}

/// The original, untouched.
pub fn full_data_url(format: &str, bytes: &[u8]) -> String {
    data_url(mime(format), bytes)
}

/// Small enough to draw in a block. An image already within the edge is handed over as it is
/// (a small GIF keeps moving); a larger one is scaled down and re-encoded — PNG when it has
/// transparency, JPEG otherwise.
pub fn preview_data_url(format: &str, bytes: &[u8]) -> Result<String, String> {
    preview_data_url_at(format, bytes, PREVIEW_EDGE_PX)
}

fn preview_data_url_at(format: &str, bytes: &[u8], edge: u32) -> Result<String, String> {
    let mut reader = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|e| e.to_string())?;
    reader.limits(limits());
    let img = reader.decode().map_err(|e| e.to_string())?;
    let (w, h) = img.dimensions();
    if w.max(h) <= edge {
        return Ok(full_data_url(format, bytes));
    }
    let small = img.thumbnail(edge, edge);
    let mut out = Vec::new();
    if small.color().has_alpha() {
        small
            .write_to(&mut Cursor::new(&mut out), ImageFormat::Png)
            .map_err(|e| e.to_string())?;
        Ok(data_url("image/png", &out))
    } else {
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, 85)
            .encode_image(&small.to_rgb8())
            .map_err(|e| e.to_string())?;
        Ok(data_url("image/jpeg", &out))
    }
}

// ---------------------------------------------------------------------------------------
// P7-8 — a file to point at. The bytes live in the library, so a pack (and get_blocks) can
// only name a picture once a copy of it sits on disk: `image-cache/<id>.<ext>` beside
// spool.db. It is a cache — deleting the folder loses nothing, the next pack writes it again.
// Ocean 2026-10-08 chose the full path in the pack line (a local AI can open it).
// ---------------------------------------------------------------------------------------

pub const IMAGE_CACHE_DIR: &str = "image-cache";

/// `image-cache/` beside the library file this connection has open — taken from the
/// connection itself (sqlite's own, symlink-resolved path), on BOTH sides: the GUI's pack and
/// the MCP server's must print the very same path. None for an in-memory library.
pub fn cache_dir_of(conn: &Connection) -> Option<std::path::PathBuf> {
    let db = conn.path().filter(|p| !p.is_empty())?;
    Some(std::path::Path::new(db).parent()?.join(IMAGE_CACHE_DIR))
}

fn cache_ext(format: &str) -> &'static str {
    match format {
        "jpeg" => "jpg",
        "gif" => "gif",
        "webp" => "webp",
        _ => "png",
    }
}

/// P8-1: the extension a copy of this stored picture takes — the cache's own, so a pack exported
/// to a folder names its pictures the way the cache does. `no_image` when it is no longer stored.
pub(crate) fn stored_ext(conn: &Connection, id: &str) -> Result<&'static str, String> {
    conn.query_row("SELECT format FROM block_images WHERE id = ?1", [id], |r| r.get::<_, String>(0))
        .map(|format| cache_ext(&format))
        .map_err(|_| "no_image".to_string())
}

/// One picture of a block, as the pack and get_blocks describe it.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedImage {
    pub id: String,
    pub block_id: String,
    pub path: String,
    pub format: String,
    pub width: i64,
    pub height: i64,
    pub size_bytes: i64,
}

/// The pictures of these blocks, in order, each with a copy on disk under `cache_dir`
/// (written now when missing). A copy that cannot be written still gets its path — the
/// line says where it would be, and the next call tries again.
pub fn cached_images_of(
    conn: &Connection,
    cache_dir: &std::path::Path,
    block_ids: &[&str],
) -> Result<Vec<CachedImage>, String> {
    if block_ids.is_empty() {
        return Ok(Vec::new());
    }
    let marks = vec!["?"; block_ids.len()].join(", ");
    let mut stmt = conn
        .prepare(&format!(
            "SELECT id, block_id, format, width, height, size_bytes FROM block_images
              WHERE block_id IN ({marks}) ORDER BY block_id, position"
        ))
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(block_ids.iter()), |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, i64>(3)?,
                r.get::<_, i64>(4)?,
                r.get::<_, i64>(5)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    let mut out = Vec::with_capacity(rows.len());
    for (id, block_id, format, width, height, size_bytes) in rows {
        let file = cache_dir.join(format!("{id}.{}", cache_ext(&format)));
        if !file.exists() {
            if let Ok((_, bytes)) = read_image(conn, &id) {
                let _ = std::fs::create_dir_all(cache_dir);
                let tmp = file.with_extension("partial");
                if std::fs::write(&tmp, &bytes).is_ok() {
                    let _ = std::fs::rename(&tmp, &file);
                }
            }
        }
        out.push(CachedImage {
            id,
            block_id,
            path: file.to_string_lossy().into_owned(),
            format,
            width,
            height,
            size_bytes,
        });
    }
    Ok(out)
}

/// The GUI's pack (PackDialog, a workspace export) asks for the same copies the MCP pack
/// writes — same folder, same names, so both renderers print the same line.
#[tauri::command(async)]
pub fn cached_block_images(app: tauri::AppHandle, block_ids: Vec<String>) -> Result<Vec<CachedImage>, String> {
    let conn = open_library(&app)?;
    let dir = cache_dir_of(&conn).ok_or_else(|| "no_library".to_string())?;
    let ids: Vec<&str> = block_ids.iter().map(String::as_str).collect();
    cached_images_of(&conn, &dir, &ids)
}

fn open_library(app: &tauri::AppHandle) -> Result<Connection, String> {
    let path = crate::transfer::data_dir(app)?.join("spool.db");
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    // The webview holds its own connection to the same file (WAL); wait for it rather than
    // fail when both write at once.
    conn.busy_timeout(std::time::Duration::from_secs(5)).map_err(|e| e.to_string())?;
    Ok(conn)
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// P7 验收第一轮 (Ocean 2026-10-08 第 2 条): image files copied in Finder (⌘C on the file). The
/// clipboard then holds a link to the file and its NAME as text — capturing the text saved only
/// the name. Only image files count; anything else falls through to the text as before.
#[tauri::command(async)]
pub fn clipboard_image_files() -> Vec<String> {
    let Ok(mut cb) = arboard::Clipboard::new() else { return Vec::new() };
    let Ok(files) = cb.get().file_list() else { return Vec::new() };
    files
        .into_iter()
        .filter(|p| p.is_file() && has_image_extension(p))
        .map(|p| p.to_string_lossy().into_owned())
        .collect()
}

/// A small preview for the capture card (第 1 条: 不知道存了什么图片) — its own size, not cached.
#[tauri::command(async)]
pub fn block_image_thumb(app: tauri::AppHandle, id: String, edge: u32) -> Result<String, String> {
    let conn = open_library(&app)?;
    let (format, bytes) = read_image(&conn, &id)?;
    preview_data_url_at(&format, &bytes, edge.clamp(64, PREVIEW_EDGE_PX))
}

/// The preview of one stored image, as a `data:` URL.
// ⚠️ `(async)`: decoding a large photo takes a noticeable fraction of a second, and a sync
// command runs on the main thread — the whole window would freeze (tauri-sync-commands).
#[tauri::command(async)]
pub fn block_image_preview(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let conn = open_library(&app)?;
    let (format, bytes) = read_image(&conn, &id)?;
    preview_data_url(&format, &bytes)
}

/// The original of one stored image, as a `data:` URL — for 「点开看原图」.
#[tauri::command(async)]
pub fn block_image_full(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let conn = open_library(&app)?;
    let (format, bytes) = read_image(&conn, &id)?;
    Ok(full_data_url(&format, &bytes))
}

/// Store one image into a block from raw bytes (the request body; the block id rides in the
/// `block-id` header). One call per image keeps every message to one image's size.
#[tauri::command]
pub async fn add_block_image(
    app: tauri::AppHandle,
    request: tauri::ipc::Request<'_>,
) -> Result<ImageMeta, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("unsupported".into());
    };
    let block_id = request
        .headers()
        .get("block-id")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| "no_block".to_string())?
        .to_string();
    let bytes = bytes.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let prepared = prepare(bytes)?;
        let conn = open_library(&app)?;
        let mut metas = insert_images(&conn, &block_id, &[prepared], now_ms())?;
        Ok(metas.remove(0))
    })
    .await
    .map_err(|e| e.to_string())?
}

// ---------------------------------------------------------------------------------------
// P7-7 — where images come in from: a screenshot that was just taken, files dragged onto the
// window, the clipboard.
// ---------------------------------------------------------------------------------------

/// Images a block can take, by extension, when they arrive as files (drag, screenshot). The
/// content decides in `prepare`; this only sorts a dropped batch before anything is read.
pub const IMAGE_EXTENSIONS: [&str; 7] = ["png", "jpg", "jpeg", "gif", "webp", "tif", "tiff"];

fn has_image_extension(p: &std::path::Path) -> bool {
    p.extension()
        .and_then(|e| e.to_str())
        .map(|e| IMAGE_EXTENSIONS.contains(&e.to_ascii_lowercase().as_str()) || e.eq_ignore_ascii_case("heic"))
        .unwrap_or(false)
}

/// The system marks every screenshot it writes with this attribute (names are localised —
/// 「Screenshot …」, 「截屏…」 — the attribute is not).
#[cfg(target_os = "macos")]
fn is_marked_screenshot(p: &std::path::Path) -> bool {
    use std::os::unix::ffi::OsStrExt;
    let Ok(path) = std::ffi::CString::new(p.as_os_str().as_bytes()) else { return false };
    let name = c"com.apple.metadata:kMDItemIsScreenCapture";
    // size query only (null buffer): ≥ 0 means the attribute is there.
    unsafe { libc::getxattr(path.as_ptr(), name.as_ptr(), std::ptr::null_mut(), 0, 0, 0) >= 0 }
}
#[cfg(not(target_os = "macos"))]
fn is_marked_screenshot(_p: &std::path::Path) -> bool {
    false
}

fn modified_ms(m: &std::fs::Metadata) -> u64 {
    m.modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// How far before the chord a file may be dated and still count (clock granularity, and the
/// key-down being observed a beat after the system started writing).
const SHOT_SLACK_MS: u64 = 2_000;

/// 「刚截的那张」: in `dir`, the newest image file marked as a screenshot and written no
/// earlier than the chord. `Err` only when the folder cannot be read at all — on macOS that
/// is the Desktop permission being refused ("denied").
pub fn pick_new_screenshot(dir: &std::path::Path, since_ms: u64) -> Result<Option<std::path::PathBuf>, String> {
    let entries = std::fs::read_dir(dir).map_err(|e| {
        if e.kind() == std::io::ErrorKind::PermissionDenied { "denied".to_string() } else { e.to_string() }
    })?;
    let mut best: Option<(u64, std::path::PathBuf)> = None;
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(meta) = entry.metadata() else { continue };
        if !meta.is_file() || !has_image_extension(&path) {
            continue;
        }
        let at = modified_ms(&meta);
        if at + SHOT_SLACK_MS < since_ms || !is_marked_screenshot(&path) {
            continue;
        }
        if best.as_ref().is_none_or(|(b, _)| at > *b) {
            best = Some((at, path));
        }
    }
    Ok(best.map(|(_, p)| p))
}

/// `defaults read com.apple.screencapture <key>`, or None when unset.
fn screencapture_pref(key: &str) -> Option<String> {
    let out = std::process::Command::new("defaults")
        .args(["read", "com.apple.screencapture", key])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let v = String::from_utf8_lossy(&out.stdout).trim().to_string();
    (!v.is_empty()).then_some(v)
}

/// Where ⌘⇧3/4/5 write their files: the user's setting, else the Desktop (the system default).
fn screenshot_dir() -> Option<std::path::PathBuf> {
    let home = std::env::var_os("HOME").map(std::path::PathBuf::from)?;
    Some(match screencapture_pref("location") {
        Some(loc) if loc == "~" => home,
        Some(loc) if loc.starts_with("~/") => home.join(&loc[2..]),
        Some(loc) => std::path::PathBuf::from(loc),
        None => home.join("Desktop"),
    })
}

/// ⌘⇧5's toolbar can be set to put the picture on the clipboard instead of in a file.
#[tauri::command(async)]
pub fn screenshot_goes_to_clipboard() -> bool {
    screencapture_pref("target").as_deref() == Some("clipboard")
}

/// Wait for the screenshot taken at `since_ms` to land as a file. While the floating
/// thumbnail is up (the system default, about five seconds) the file is not written yet, so
/// this looks again every 150 ms until `timeout_ms`. `Ok(None)` = nothing came.
/// ⚠️ Reading the Desktop is what makes macOS ask once 「“Spool”想访问“桌面”文件夹中的文件」
/// (Ocean 2026-10-08: 弹一次就弹一次). A refusal comes back as `Err("denied")`.
#[tauri::command(async)]
pub fn find_new_screenshot(since_ms: u64, timeout_ms: u64) -> Result<Option<String>, String> {
    let dir = screenshot_dir().ok_or_else(|| "no_dir".to_string())?;
    let deadline = std::time::Instant::now() + std::time::Duration::from_millis(timeout_ms);
    loop {
        if let Some(p) = pick_new_screenshot(&dir, since_ms)? {
            return Ok(Some(p.to_string_lossy().into_owned()));
        }
        if std::time::Instant::now() >= deadline {
            return Ok(None);
        }
        std::thread::sleep(std::time::Duration::from_millis(150));
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AddReport {
    pub added: Vec<ImageMeta>,
    /// One code per file that did not go in (same codes as `prepare`, plus `unreadable`).
    pub errors: Vec<String>,
}

/// Store image files into a block, in the order given (drag from Finder; a screenshot file).
#[tauri::command(async)]
pub fn add_block_images_from_paths(
    app: tauri::AppHandle,
    block_id: String,
    paths: Vec<String>,
) -> Result<AddReport, String> {
    let conn = open_library(&app)?;
    let mut report = AddReport { added: Vec::new(), errors: Vec::new() };
    for p in paths {
        let prepared = std::fs::read(&p)
            .map_err(|e| {
                if e.kind() == std::io::ErrorKind::PermissionDenied { "denied".to_string() } else { "unreadable".to_string() }
            })
            .and_then(prepare);
        match prepared.and_then(|img| insert_images(&conn, &block_id, &[img], now_ms())) {
            Ok(mut metas) => report.added.append(&mut metas),
            Err(code) => report.errors.push(code),
        }
    }
    Ok(report)
}

/// The clipboard's picture as PNG bytes, if it holds one.
fn clipboard_png(app: &tauri::AppHandle) -> Option<Vec<u8>> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    let img = app.clipboard().read_image().ok()?;
    let rgba = image::RgbaImage::from_raw(img.width(), img.height(), img.rgba().to_vec())?;
    let mut png = Vec::new();
    image::DynamicImage::ImageRgba8(rgba)
        .write_to(&mut Cursor::new(&mut png), ImageFormat::Png)
        .ok()?;
    Some(png)
}

/// Does the clipboard hold a picture? `[width, height]` when it does — asked before a block is
/// made for it, so a capture that finds nothing leaves no empty block (and no spent #n) behind.
#[tauri::command(async)]
pub fn clipboard_image_size(app: tauri::AppHandle) -> Option<[u32; 2]> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    let img = app.clipboard().read_image().ok()?;
    (img.width() > 0 && img.height() > 0).then(|| [img.width(), img.height()])
}

/// Store the clipboard's picture into a block (双击 ⌥ with an image copied, or ⌃⌘⇧4).
#[tauri::command(async)]
pub fn add_block_image_from_clipboard(app: tauri::AppHandle, block_id: String) -> Result<ImageMeta, String> {
    let png = clipboard_png(&app).ok_or_else(|| "no_image".to_string())?;
    let prepared = prepare(png)?;
    let conn = open_library(&app)?;
    let mut metas = insert_images(&conn, &block_id, &[prepared], now_ms())?;
    Ok(metas.remove(0))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn encode(img: &image::DynamicImage, fmt: ImageFormat) -> Vec<u8> {
        let mut out = Vec::new();
        img.write_to(&mut Cursor::new(&mut out), fmt).unwrap();
        out
    }

    fn rgba(w: u32, h: u32) -> image::DynamicImage {
        image::DynamicImage::ImageRgba8(image::RgbaImage::from_fn(w, h, |x, y| {
            image::Rgba([(x % 256) as u8, (y % 256) as u8, 7, if x < 2 { 0 } else { 255 }])
        }))
    }

    fn rgb(w: u32, h: u32) -> image::DynamicImage {
        image::DynamicImage::ImageRgb8(image::RgbImage::from_fn(w, h, |x, y| {
            image::Rgb([(x % 256) as u8, (y % 256) as u8, 99])
        }))
    }

    #[test]
    fn prepare_keeps_the_four_web_formats_and_turns_tiff_into_png() {
        for (fmt, name) in [(ImageFormat::Png, "png"), (ImageFormat::Jpeg, "jpeg"), (ImageFormat::Gif, "gif")] {
            let src = if fmt == ImageFormat::Jpeg { rgb(40, 30) } else { rgba(40, 30) };
            let bytes = encode(&src, fmt);
            let p = prepare(bytes.clone()).unwrap();
            assert_eq!((p.format, p.width, p.height), (name, 40, 30));
            assert_eq!(p.bytes, bytes, "{name}: the original is stored untouched");
        }
        // WebP: the crate only encodes lossless; that is a valid WebP all the same.
        let webp = encode(&rgba(12, 9), ImageFormat::WebP);
        assert_eq!(prepare(webp).unwrap().format, "webp");
        let tiff = encode(&rgb(20, 10), ImageFormat::Tiff);
        let p = prepare(tiff).unwrap();
        assert_eq!((p.format, p.width, p.height), ("png", 20, 10));
        assert_eq!(&p.bytes[..8], b"\x89PNG\r\n\x1a\n");
    }

    #[test]
    fn prepare_refuses_what_is_not_an_image_and_what_is_too_big() {
        assert_eq!(prepare(b"%PDF-1.7 not an image".to_vec()).unwrap_err(), "unsupported");
        assert_eq!(prepare(b"\x89PNG\r\n\x1a\ntruncated".to_vec()).unwrap_err(), "unsupported");
        let big = vec![0u8; MAX_IMAGE_BYTES + 1];
        assert_eq!(prepare(big).unwrap_err(), format!("too_large:{}", MAX_IMAGE_BYTES + 1));
    }

    #[test]
    fn images_append_in_order_and_come_back_byte_for_byte() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(include_str!("../../src/lib/db/schema.sql")).unwrap();
        conn.execute_batch(
            "INSERT INTO workspaces (id, title, sort_order, created_at, updated_at) VALUES ('w', 'W', 0, 1, 1);
             INSERT INTO threads (id, workspace_id, title, created_at, updated_at) VALUES ('t', 'w', 'T', 1, 1);
             INSERT INTO blocks (id, thread_id, content, created_at) VALUES ('b', 't', 'x', 1);",
        )
        .unwrap();
        let a = prepare(encode(&rgba(30, 20), ImageFormat::Png)).unwrap();
        let b = prepare(encode(&rgb(10, 10), ImageFormat::Jpeg)).unwrap();
        let (a_bytes, b_bytes) = (a.bytes.clone(), b.bytes.clone());
        let first = insert_images(&conn, "b", &[a], 5).unwrap();
        let second = insert_images(&conn, "b", &[b], 6).unwrap();
        assert_eq!(first[0].position, 0);
        assert_eq!(second[0].position, 1);
        assert_eq!(read_image(&conn, &first[0].id).unwrap(), ("png".to_string(), a_bytes.clone()));
        assert_eq!(read_image(&conn, &second[0].id).unwrap().1, b_bytes);
        let stored: (String, i64) = conn
            .query_row("SELECT typeof(bytes), size_bytes FROM block_images WHERE id = ?1", [&first[0].id], |r| {
                Ok((r.get(0)?, r.get(1)?))
            })
            .unwrap();
        assert_eq!(stored, ("blob".to_string(), a_bytes.len() as i64));
        assert_eq!(insert_images(&conn, "gone", &[], 1).unwrap_err(), "no_block");
    }

    // P7-7: 「刚截的那张」 = newest marked screenshot written since the chord.
    #[cfg(target_os = "macos")]
    #[test]
    fn the_new_screenshot_is_the_newest_marked_one_since_the_chord() {
        use std::os::unix::ffi::OsStrExt;
        let dir = std::env::temp_dir().join(format!("spool-shots-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let mark = |p: &std::path::Path| {
            let path = std::ffi::CString::new(p.as_os_str().as_bytes()).unwrap();
            let v = b"bplist00\x09\x08\x00\x00\x00\x00\x00\x00\x01\x01\x00\x00\x00\x00\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x09";
            let rc = unsafe {
                libc::setxattr(path.as_ptr(), c"com.apple.metadata:kMDItemIsScreenCapture".as_ptr(), v.as_ptr().cast(), v.len(), 0, 0)
            };
            assert_eq!(rc, 0);
        };
        let png = encode(&rgba(4, 4), ImageFormat::Png);
        let write = |name: &str| {
            let p = dir.join(name);
            std::fs::write(&p, &png).unwrap();
            p
        };
        let since = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        assert_eq!(pick_new_screenshot(&dir, since).unwrap(), None, "empty folder");
        write("Screenshot not marked.png"); // a png that is not a screenshot
        let txt = write("notes.txt");
        mark(&txt); // marked, but not an image
        assert_eq!(pick_new_screenshot(&dir, since).unwrap(), None);
        let first = write("截屏 1.png");
        mark(&first);
        std::thread::sleep(std::time::Duration::from_millis(20));
        let second = write("Screenshot 2.png");
        mark(&second);
        assert_eq!(pick_new_screenshot(&dir, since).unwrap(), Some(second.clone()), "newest wins");
        // Written long before the chord: not this screenshot.
        assert_eq!(pick_new_screenshot(&dir, since + 60_000).unwrap(), None);
        assert!(pick_new_screenshot(&dir.join("missing"), since).is_err());
        let _ = std::fs::remove_dir_all(&dir);
    }

    // P7-8: a copy on disk to point at, written once, under the block's own order.
    #[test]
    fn cached_copies_are_written_once_and_named_by_id() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(include_str!("../../src/lib/db/schema.sql")).unwrap();
        conn.execute_batch(
            "INSERT INTO workspaces (id, title, sort_order, created_at, updated_at) VALUES ('w', 'W', 0, 1, 1);
             INSERT INTO threads (id, workspace_id, title, created_at, updated_at) VALUES ('t', 'w', 'T', 1, 1);
             INSERT INTO blocks (id, thread_id, content, created_at) VALUES ('b', 't', 'x', 1);",
        )
        .unwrap();
        let png = prepare(encode(&rgba(30, 20), ImageFormat::Png)).unwrap();
        let jpg = prepare(encode(&rgb(10, 10), ImageFormat::Jpeg)).unwrap();
        let png_bytes = png.bytes.clone();
        let metas = insert_images(&conn, "b", &[png, jpg], 1).unwrap();
        let dir = std::env::temp_dir().join(format!("spool-image-cache-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);

        let got = cached_images_of(&conn, &dir, &["b"]).unwrap();
        assert_eq!(got.iter().map(|c| c.id.clone()).collect::<Vec<_>>(), vec![metas[0].id.clone(), metas[1].id.clone()]);
        assert!(got[0].path.ends_with(&format!("{}.png", metas[0].id)));
        assert!(got[1].path.ends_with(&format!("{}.jpg", metas[1].id)));
        assert_eq!(std::fs::read(&got[0].path).unwrap(), png_bytes);
        assert_eq!((got[0].width, got[0].height), (30, 20));
        // Written once: a second call does not rewrite it.
        std::fs::write(&got[0].path, b"left alone").unwrap();
        cached_images_of(&conn, &dir, &["b"]).unwrap();
        assert_eq!(std::fs::read(&got[0].path).unwrap(), b"left alone");
        assert!(cached_images_of(&conn, &dir, &[]).unwrap().is_empty());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn a_preview_is_small_and_a_small_image_is_handed_over_as_it_is() {
        let small = encode(&rgba(50, 40), ImageFormat::Png);
        assert_eq!(preview_data_url("png", &small).unwrap(), full_data_url("png", &small));

        let big = encode(&rgb(3000, 1500), ImageFormat::Png);
        let url = preview_data_url("png", &big).unwrap();
        assert!(url.starts_with("data:image/jpeg;base64,"), "no transparency ⇒ JPEG");
        let raw = base64::engine::general_purpose::STANDARD
            .decode(url.trim_start_matches("data:image/jpeg;base64,"))
            .unwrap();
        let img = image::load_from_memory(&raw).unwrap();
        assert_eq!(img.dimensions(), (PREVIEW_EDGE_PX, PREVIEW_EDGE_PX / 2));

        let clear = encode(&rgba(2000, 1000), ImageFormat::Png);
        assert!(preview_data_url("png", &clear).unwrap().starts_with("data:image/png;base64,"));
        assert!(full_data_url("gif", b"GIF89a").starts_with("data:image/gif;base64,"));
    }
}
