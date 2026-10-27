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
    let bytes = if is_heic(&bytes) { heic_to_jpeg(&bytes)? } else { bytes };
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

/// P9H-7 ② (DISCOVERED-20261008-3): an iPhone photo is HEIC, which the decoder here does not
/// read — it used to be 「这不是能放进块里的图片」. Told apart by its `ftyp` box brand.
fn is_heic(bytes: &[u8]) -> bool {
    const BRANDS: [&[u8; 4]; 8] = [b"heic", b"heix", b"hevc", b"hevx", b"heim", b"heis", b"mif1", b"msf1"];
    bytes.len() >= 12 && &bytes[4..8] == b"ftyp" && BRANDS.iter().any(|b| &bytes[8..12] == *b)
}

/// HEIC → JPEG with the system's own converter (`sips`, part of every macOS — no crate, nothing
/// leaves the machine). Through two temporary files, removed either way. Anything it cannot
/// convert is `unsupported`, as before.
#[cfg(target_os = "macos")]
fn heic_to_jpeg(bytes: &[u8]) -> Result<Vec<u8>, String> {
    use std::sync::atomic::{AtomicU64, Ordering};
    static N: AtomicU64 = AtomicU64::new(0);
    let stem = std::env::temp_dir().join(format!("spool-heic-{}-{}", std::process::id(), N.fetch_add(1, Ordering::Relaxed)));
    let (src, out) = (stem.with_extension("heic"), stem.with_extension("jpg"));
    let converted = std::fs::write(&src, bytes)
        .ok()
        .and_then(|()| {
            std::process::Command::new("/usr/bin/sips")
                .args(["-s", "format", "jpeg"])
                .arg(&src)
                .arg("--out")
                .arg(&out)
                .stdin(std::process::Stdio::null())
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .status()
                .ok()
        })
        .filter(|st| st.success())
        .and_then(|_| std::fs::read(&out).ok());
    let _ = std::fs::remove_file(&src);
    let _ = std::fs::remove_file(&out);
    converted.ok_or_else(|| "unsupported".to_string())
}
#[cfg(not(target_os = "macos"))]
fn heic_to_jpeg(_bytes: &[u8]) -> Result<Vec<u8>, String> {
    Err("unsupported".into())
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

/// P9H-6: one picture handed to an AI is kept under this many bytes — a model rejects larger
/// image content outright (Claude's limit is 5 MB), and a reply carries several.
pub const AI_IMAGE_MAX_BYTES: usize = 3_500_000;

/// A picture for an AI: its media type, its bytes, and the width × height they are.
pub type ForAi = (&'static str, Vec<u8>, (u32, u32));

/// P9H-6 (Ocean 10-16 第 148 条) — a picture as an AI is handed it: long edge at most `edge`,
/// under AI_IMAGE_MAX_BYTES. One already small enough goes as it is stored (every stored format —
/// PNG, JPEG, GIF, WebP; TIFF became PNG on the way in — is one models take); a larger one is
/// scaled down and re-encoded, PNG when it has transparency (JPEG if that is still too big),
/// JPEG otherwise. Returns the media type, the bytes, and the size handed over.
pub fn for_ai(format: &str, bytes: &[u8], edge: u32) -> Result<ForAi, String> {
    let mut reader = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|e| e.to_string())?;
    reader.limits(limits());
    let img = reader.decode().map_err(|e| e.to_string())?;
    let (w, h) = img.dimensions();
    if w.max(h) <= edge && bytes.len() <= AI_IMAGE_MAX_BYTES {
        return Ok((mime(format), bytes.to_vec(), (w, h)));
    }
    let small = if w.max(h) > edge { img.thumbnail(edge, edge) } else { img };
    let dims = small.dimensions();
    let mut out = Vec::new();
    if small.color().has_alpha() {
        small.write_to(&mut Cursor::new(&mut out), ImageFormat::Png).map_err(|e| e.to_string())?;
        if out.len() <= AI_IMAGE_MAX_BYTES {
            return Ok(("image/png", out, dims));
        }
        out.clear();
    }
    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, 85)
        .encode_image(&small.to_rgb8())
        .map_err(|e| e.to_string())?;
    Ok(("image/jpeg", out, dims))
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

/// How a pack line (and get_blocks) names a copy. On Windows with `/`: in a Markdown link a `\`
/// before punctuation is an escape (`\_`, `\#` …), so `C:\…` breaks wherever a folder name starts
/// with one, and Windows opens `C:/…` all the same (P9X, DISCOVERED-20261020-4). Elsewhere the
/// path as it is — a Mac's pack does not change by a byte.
fn shown_path(file: &std::path::Path) -> String {
    let s = file.to_string_lossy().into_owned();
    if cfg!(windows) {
        s.replace('\\', "/")
    } else {
        s
    }
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
            path: shown_path(&file),
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

pub(crate) fn open_library(app: &tauri::AppHandle) -> Result<Connection, String> {
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
/// P9H-7 ③: Win+PrtScn writes into a folder that holds only screenshots (the system's
/// 「图片\屏幕截图」), so there every picture counts — there is no mark to read.
#[cfg(target_os = "windows")]
fn is_marked_screenshot(_p: &std::path::Path) -> bool {
    true
}
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
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
    Ok(newest_shot_in(dir, since_ms, is_marked_screenshot)?.map(|(_, p)| p))
}

/// The newest image in `dir` that `is_shot` accepts, written no earlier than `since_ms`: when
/// it was written (wall ms) and where. `is_shot` is the platform's way of knowing a screenshot
/// (macOS: the system's mark; Windows: the folder itself) — a parameter so both are testable.
fn newest_shot_in(
    dir: &std::path::Path,
    since_ms: u64,
    is_shot: impl Fn(&std::path::Path) -> bool,
) -> Result<Option<(u64, std::path::PathBuf)>, String> {
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
        if at + SHOT_SLACK_MS < since_ms || !is_shot(&path) {
            continue;
        }
        if best.as_ref().is_none_or(|(b, _)| at > *b) {
            best = Some((at, path));
        }
    }
    Ok(best)
}

/// P9H-7 ③: a Win+PrtScn this recent still names the picture the next double-tap Ctrl captures —
/// the same 10 s the Mac's copy gate gives a screenshot chord. Times are GetMessageTime ms,
/// which wrap (about every 49 days), hence `wrapping_sub`. Lives here, not in the Windows-only
/// module, so it is tested on every platform (and only called on Windows).
#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
pub fn win_shot_still_fresh(shot_at: i32, now: i32, window_ms: i32) -> bool {
    (0..=window_ms).contains(&now.wrapping_sub(shot_at))
}

/// P9H-7 ①: when (wall ms) the newest screenshot written since `since_ms` landed — None when
/// there is none yet, or the folder cannot be read.
pub fn screenshot_landed_since(since_ms: u64) -> Option<u64> {
    newest_shot_in(&screenshot_dir()?, since_ms, is_marked_screenshot).ok().flatten().map(|(at, _)| at)
}

/// 2026-10-18 (Ocean, 〈HAI- Lecture5〉): taken but not saved yet. While the floating thumbnail is
/// up — and while Markup is open on it — the system keeps the picture in its own folder in the
/// per-user temp dir (`TemporaryItems/NSIRD_screencaptureui_*`) and only writes the real file when
/// the thumbnail goes. That afternoon the thumbnail stayed 14 s, a fixed 8 s wait gave up on it,
/// and a double-tap made after a slow selection found the gate shut. This is the signal for both.
/// ⚠️ Undocumented: should a later macOS keep it elsewhere, this answers false and everything falls
/// back to the fixed wait and the landed-file rule — what it did before.
#[cfg(target_os = "macos")]
pub fn screenshot_pending_since(since_ms: u64) -> bool {
    user_temp_dir().is_some_and(|tmp| shot_pending_in(&tmp.join("TemporaryItems"), since_ms))
}
#[cfg(not(target_os = "macos"))]
pub fn screenshot_pending_since(_since_ms: u64) -> bool {
    false
}

/// The question above, given `TemporaryItems`: a picture written since `since_ms` in one of the
/// screenshot UI's folders.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn shot_pending_in(temp_items: &std::path::Path, since_ms: u64) -> bool {
    pending_shot_in(temp_items, since_ms).is_some()
}

/// P12-6 (DISCOVERED-20261018-2): which picture that is — the newest one written since `since_ms`
/// across the screenshot UI's folders. Folders untouched since then are not opened (there are dozens).
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn pending_shot_in(temp_items: &std::path::Path, since_ms: u64) -> Option<(u64, std::path::PathBuf)> {
    std::fs::read_dir(temp_items)
        .ok()?
        .flatten()
        .filter(|e| {
            e.file_name().to_string_lossy().starts_with("NSIRD_screencaptureui_")
                && e.metadata().is_ok_and(|m| m.is_dir() && modified_ms(&m) + SHOT_SLACK_MS >= since_ms)
        })
        .filter_map(|e| newest_shot_in(&e.path(), since_ms, |_| true).ok().flatten())
        .max_by_key(|(at, _)| *at)
}

/// P12-6: the picture still in the thumbnail, as a copy of Spool's own — so a capture made right
/// after the screenshot does not wait for the thumbnail to go. ⛔ The system's file is only read: not
/// moved, deleted or changed, and the system saves the real screenshot where it always does once the
/// thumbnail goes. Copied at once: the system clears its folder when the thumbnail goes, which can
/// fall between this look and the capture reading the picture. ⚠️ With Markup open on the
/// thumbnail, this is the picture before the markup.
#[cfg(target_os = "macos")]
fn take_pending_shot(since_ms: u64) -> Option<std::path::PathBuf> {
    let (_, src) = pending_shot_in(&user_temp_dir()?.join("TemporaryItems"), since_ms)?;
    copy_shot(&src, &std::env::temp_dir().join("spool-shots"), now_ms()).ok()
}
#[cfg(not(target_os = "macos"))]
fn take_pending_shot(_since_ms: u64) -> Option<std::path::PathBuf> {
    None
}

/// `src`'s bytes into a new file in `dir` — a folder only Spool writes, emptied of the last copy
/// first (the capture that read it is done: captures run one at a time).
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn copy_shot(src: &std::path::Path, dir: &std::path::Path, now: i64) -> std::io::Result<std::path::PathBuf> {
    let bytes = std::fs::read(src)?;
    std::fs::create_dir_all(dir)?;
    for old in std::fs::read_dir(dir)?.flatten() {
        let _ = std::fs::remove_file(old.path());
    }
    let name = src.file_name().map_or_else(|| "screenshot.png".into(), |n| n.to_string_lossy().into_owned());
    let dest = dir.join(format!("{now}-{name}"));
    std::fs::write(&dest, bytes)?;
    Ok(dest)
}

/// The per-user temp dir (`/var/folders/…/T/`), asked of the system rather than of `$TMPDIR`,
/// which an app started some other way may not carry.
#[cfg(target_os = "macos")]
fn user_temp_dir() -> Option<std::path::PathBuf> {
    let mut buf = [0 as libc::c_char; 1024];
    let n = unsafe { libc::confstr(libc::_CS_DARWIN_USER_TEMP_DIR, buf.as_mut_ptr(), buf.len()) };
    if n == 0 || n > buf.len() {
        return None;
    }
    let dir = unsafe { std::ffi::CStr::from_ptr(buf.as_ptr()) }.to_str().ok()?;
    Some(std::path::PathBuf::from(dir))
}

/// 2026-10-18: what the clipboard holds as text and files, as one number — None when it holds
/// neither (empty, or only a picture). Compared, never stored or sent anywhere.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub fn clipboard_fingerprint() -> Option<u64> {
    use std::hash::{Hash, Hasher};
    let mut cb = arboard::Clipboard::new().ok()?;
    let text = cb.get_text().ok().filter(|t| !t.is_empty());
    let files = cb.get().file_list().ok().filter(|f| !f.is_empty());
    if text.is_none() && files.is_none() {
        return None;
    }
    // DefaultHasher::new() has fixed keys: the same contents give the same number all run long.
    let mut h = std::collections::hash_map::DefaultHasher::new();
    (text, files).hash(&mut h);
    Some(h.finish())
}

/// How long after a ⌘C keydown the copying app may still be writing it. A key macro that sends
/// ⌘C and the double-tap together puts ~10 ms between them (Ocean's log, 2026-10-18).
#[cfg(target_os = "macos")]
const COPY_SETTLE_MS: u64 = 150;

/// 2026-10-18 (Ocean, 〈HAI- Lecture5〉: 「框选截图双击 option 无法捕捉截图，粘贴板一直保留着文本
/// 数据」): a ⌘C pressed after a screenshot chord — did it bring anything new? A ⌘⇧4 picture goes
/// to a file, so the clipboard still holds the text from before; a ⌘C with that text still selected
/// writes it again, one with nothing selected writes nothing — either way the capture took the old
/// text over the picture just taken. Now that ⌘C only wins when the clipboard differs from what it
/// held at the chord. true = it does (capture the clipboard, as before); false = the screenshot.
#[tauri::command(async)]
pub fn clipboard_changed_since_shot() -> bool {
    #[cfg(target_os = "macos")]
    {
        let settled = crate::double_tap::last_copy_wall_ms() + COPY_SETTLE_MS;
        let now = now_ms() as u64;
        if settled > now {
            std::thread::sleep(std::time::Duration::from_millis(settled - now));
        }
        // Not measured (a newer chord is still being read): say "changed" — the old behaviour.
        crate::double_tap::clipboard_at_shot().is_none_or(|before| clipboard_fingerprint() != before)
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
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
#[cfg(not(target_os = "windows"))]
fn screenshot_dir() -> Option<std::path::PathBuf> {
    let home = std::env::var_os("HOME").map(std::path::PathBuf::from)?;
    Some(match screencapture_pref("location") {
        Some(loc) if loc == "~" => home,
        Some(loc) if loc.starts_with("~/") => home.join(&loc[2..]),
        Some(loc) => std::path::PathBuf::from(loc),
        None => home.join("Desktop"),
    })
}

/// P9H-7 ③ (Ocean 10-16 第 152 条): where Win+PrtScn writes — the system's Screenshots known
/// folder (「图片\屏幕截图」 by default, wherever the user or OneDrive has moved it), asked of the
/// system rather than spelled out. ⚠️ Not compiled on the development Mac (memory §43): written
/// against windows-sys 0.61.2's own signatures — SHGetKnownFolderPath(*const GUID, u32, HANDLE,
/// *mut PWSTR) -> HRESULT, the returned string freed with CoTaskMemFree.
#[cfg(target_os = "windows")]
fn screenshot_dir() -> Option<std::path::PathBuf> {
    use std::os::windows::ffi::OsStringExt;
    use windows_sys::Win32::System::Com::CoTaskMemFree;
    use windows_sys::Win32::UI::Shell::{FOLDERID_Screenshots, SHGetKnownFolderPath};
    let mut raw: windows_sys::core::PWSTR = std::ptr::null_mut();
    let hr = unsafe { SHGetKnownFolderPath(&FOLDERID_Screenshots, 0, std::ptr::null_mut(), &mut raw) };
    let dir = (hr >= 0 && !raw.is_null()).then(|| {
        // SAFETY: on success `raw` is a NUL-terminated wide string the system allocated.
        let len = (0..).take_while(|&i| unsafe { *raw.add(i) } != 0).count();
        let wide = unsafe { std::slice::from_raw_parts(raw, len) };
        std::path::PathBuf::from(std::ffi::OsString::from_wide(wide))
    });
    // Freed on failure too (the docs say so; a null pointer is a no-op).
    unsafe { CoTaskMemFree(raw as *const std::ffi::c_void) };
    dir
}

/// ⌘⇧5's toolbar can be set to put the picture on the clipboard instead of in a file.
#[tauri::command(async)]
pub fn screenshot_goes_to_clipboard() -> bool {
    screencapture_pref("target").as_deref() == Some("clipboard")
}

/// Wait for the screenshot taken at `since_ms` to land as a file. While the floating
/// thumbnail is up (the system default, about five seconds) the file is not written yet, so
/// this looks again every 150 ms until `timeout_ms`. `Ok(None)` = nothing came.
/// P12-6: a picture still in the thumbnail is taken from there at once (`take_pending_shot`); the
/// wait is for when it is not there either.
/// ⚠️ Reading the Desktop is what makes macOS ask once 「“Spool”想访问“桌面”文件夹中的文件」
/// (Ocean 2026-10-08: 弹一次就弹一次). A refusal comes back as `Err("denied")`.
/// 2026-10-18: `timeout_ms` is the least it waits; while the picture is still in the thumbnail
/// (screenshot_pending_since) it keeps waiting, up to SHOT_PENDING_MAX_MS from the start.
#[tauri::command(async)]
pub fn find_new_screenshot(since_ms: u64, timeout_ms: u64) -> Result<Option<String>, String> {
    use std::time::{Duration, Instant};
    let dir = screenshot_dir().ok_or_else(|| "no_dir".to_string())?;
    let start = Instant::now();
    let mut deadline = start + Duration::from_millis(timeout_ms);
    loop {
        if let Some(p) = pick_new_screenshot(&dir, since_ms)? {
            return Ok(Some(p.to_string_lossy().into_owned()));
        }
        if let Some(p) = take_pending_shot(since_ms) {
            return Ok(Some(p.to_string_lossy().into_owned()));
        }
        let now = Instant::now();
        deadline = wait_deadline(deadline, start, now, screenshot_pending_since(since_ms));
        if now >= deadline {
            return Ok(None);
        }
        std::thread::sleep(Duration::from_millis(150));
    }
}

/// The longest a capture waits on one screenshot still in its thumbnail — Markup open on it, or
/// the pointer resting there. Past it the card says the picture did not come, and the gate stays
/// open for the file once it lands (double_tap.rs), so a second double-tap takes it.
const SHOT_PENDING_MAX_MS: u64 = 60_000;
/// After the thumbnail goes, the moment the system takes to write the real file.
const SHOT_LANDING_GRACE_MS: u64 = 2_000;

/// find_new_screenshot's deadline after one more look: pushed out while the picture is pending.
fn wait_deadline(
    deadline: std::time::Instant,
    start: std::time::Instant,
    now: std::time::Instant,
    pending: bool,
) -> std::time::Instant {
    use std::time::Duration;
    if !pending {
        return deadline;
    }
    deadline.max(now + Duration::from_millis(SHOT_LANDING_GRACE_MS)).min(start + Duration::from_millis(SHOT_PENDING_MAX_MS))
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
        assert!(!got[0].path.contains('\\'), "a pack line's path is written with `/` (P9X): {}", got[0].path);
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

    // P9H-7 ② (DISCOVERED-20261008-3): an iPhone photo (HEIC) goes in — turned into JPEG by the
    // system's own sips. The HEIC here is made by sips too, from a picture this test draws.
    #[cfg(target_os = "macos")]
    #[test]
    fn a_heic_photo_goes_in_as_a_jpeg() {
        let dir = std::env::temp_dir().join(format!("spool-heic-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let png = dir.join("in.png");
        let heic = dir.join("photo.heic");
        std::fs::write(&png, encode(&rgb(64, 48), ImageFormat::Png)).unwrap();
        let made = std::process::Command::new("/usr/bin/sips")
            .args(["-s", "format", "heic"])
            .arg(&png)
            .arg("--out")
            .arg(&heic)
            .output()
            .unwrap();
        assert!(made.status.success(), "{made:?}");
        let bytes = std::fs::read(&heic).unwrap();
        assert!(is_heic(&bytes), "{:?}", &bytes[..12]);

        let p = prepare(bytes).unwrap();
        assert_eq!((p.format, p.width, p.height), ("jpeg", 64, 48));
        assert!(p.bytes.starts_with(&[0xFF, 0xD8]), "JPEG bytes");
        // Something that says HEIC and is not: refused as before, and no temp file left behind.
        let mut fake = b"\0\0\0\x18ftypheic".to_vec();
        fake.extend_from_slice(b"not really");
        assert_eq!(prepare(fake).unwrap_err(), "unsupported");
        let left = std::fs::read_dir(std::env::temp_dir())
            .unwrap()
            .flatten()
            .filter(|e| e.file_name().to_string_lossy().starts_with(&format!("spool-heic-{}-", std::process::id())))
            .count();
        assert_eq!(left, 0, "temporary files are removed");
        assert!(!is_heic(&encode(&rgb(4, 4), ImageFormat::Png)));
        let _ = std::fs::remove_dir_all(&dir);
    }

    // P9H-7 ③ (Ocean 10-16 第 152 条): on Windows every picture in the Screenshots folder counts
    // (`is_shot` = always); the newest one written since the chord is the one. Run here with that
    // rule — the Windows build only swaps in the folder and the rule.
    #[test]
    fn the_newest_picture_since_the_chord_is_the_screenshot() {
        let dir = std::env::temp_dir().join(format!("spool-shot-pick-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let at = |name: &str, ms: u64| {
            let p = dir.join(name);
            std::fs::write(&p, b"x").unwrap();
            let t = std::time::UNIX_EPOCH + std::time::Duration::from_millis(ms);
            std::fs::File::options().write(true).open(&p).unwrap().set_modified(t).unwrap();
        };
        let chord = 1_800_000_000_000_u64;
        at("Screenshot (1).png", chord - 60_000); // an older one
        at("Screenshot (2).png", chord + 400);
        at("Screenshot (3).png", chord + 900); // the newest
        at("notes.txt", chord + 5_000); // not a picture
        let every = |_: &std::path::Path| true;
        let (when, path) = newest_shot_in(&dir, chord, every).unwrap().unwrap();
        assert_eq!((when, path.file_name().unwrap().to_string_lossy().into_owned()), (chord + 900, "Screenshot (3).png".into()));
        // Nothing since: none — never the older one.
        assert_eq!(newest_shot_in(&dir, chord + 10_000, every).unwrap(), None);
        // A folder that cannot be read is an error, not "nothing".
        assert!(newest_shot_in(&dir.join("gone"), chord, every).is_err());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn a_win_print_screen_counts_for_ten_seconds_across_the_clock_wrapping() {
        assert!(win_shot_still_fresh(1_000, 1_000, 10_000));
        assert!(win_shot_still_fresh(1_000, 11_000, 10_000), "the edge is in");
        assert!(!win_shot_still_fresh(1_000, 11_001, 10_000));
        assert!(!win_shot_still_fresh(5_000, 1_000, 10_000), "not one from the future");
        // GetMessageTime wraps at i32: a shot just before the wrap, a double-tap just after.
        assert!(win_shot_still_fresh(i32::MAX - 2_000, i32::MIN + 3_000, 10_000));
    }

    // 2026-10-18 (〈HAI- Lecture5〉): the picture in the thumbnail sits in the screenshot UI's own
    // temp folder; a picture there newer than the chord = taken, not saved yet. A Mac folder,
    // and on Windows a file opened read-only cannot have its time set (P9X).
    #[cfg(target_os = "macos")]
    #[test]
    fn a_picture_in_the_screenshot_uis_temp_folder_is_pending() {
        let items = std::env::temp_dir().join(format!("spool-shot-pending-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&items);
        let stamp = |p: &std::path::Path, ms: u64| {
            let t = std::time::UNIX_EPOCH + std::time::Duration::from_millis(ms);
            std::fs::File::open(p).unwrap().set_modified(t).unwrap();
        };
        let put = |folder: &str, name: &str, ms: u64| {
            let d = items.join(folder);
            std::fs::create_dir_all(&d).unwrap();
            std::fs::write(d.join(name), b"x").unwrap();
            stamp(&d.join(name), ms);
            stamp(&d, ms);
        };
        let chord = 1_800_000_000_000_u64;
        assert!(!shot_pending_in(&items, chord), "no TemporaryItems at all");
        put("NSIRD_screencaptureui_old", "Screenshot old.png", chord - 60_000);
        put("NSIRD_Logic Pro_x", "Bounce.png", chord + 1_000); // somebody else's
        assert!(!shot_pending_in(&items, chord));
        put("NSIRD_screencaptureui_new", "Screenshot 2026-10-18 at 14.44.06.png", chord + 3_000);
        assert!(shot_pending_in(&items, chord));
        assert!(!shot_pending_in(&items, chord + 10_000), "taken before this chord");

        // P12-6: which picture — the newest across the screenshot UI's folders, never somebody else's.
        put("NSIRD_screencaptureui_newer", "Screenshot 2026-10-18 at 14.44.09.png", chord + 6_000);
        put("NSIRD_screencaptureui_newer", "notes.txt", chord + 9_000);
        let (at, path) = pending_shot_in(&items, chord).unwrap();
        assert_eq!((at, path.file_name().unwrap().to_string_lossy().into_owned()), (chord + 6_000, "Screenshot 2026-10-18 at 14.44.09.png".into()));
        assert_eq!(pending_shot_in(&items, chord + 10_000), None);

        // Copied into a folder of Spool's own; the system's file is left exactly as it was.
        std::fs::write(&path, b"the picture").unwrap();
        stamp(&path, chord + 6_000);
        let mine = items.join("spool-shots");
        let first = copy_shot(&path, &mine, 1).unwrap();
        let copy = copy_shot(&path, &mine, 2).unwrap();
        assert!(copy.starts_with(&mine) && !first.exists(), "the last copy goes when a new one comes");
        assert_eq!(std::fs::read(&copy).unwrap(), b"the picture");
        assert_eq!(std::fs::read(&path).unwrap(), b"the picture");
        assert_eq!(modified_ms(&std::fs::metadata(&path).unwrap()), chord + 6_000);
        let _ = std::fs::remove_dir_all(&items);
    }

    // find_new_screenshot waits its 8 s at least; while the picture is pending, until 2 s after it
    // stops being pending — never past a minute from the start.
    #[test]
    fn a_pending_screenshot_is_waited_for_up_to_a_minute() {
        use std::time::{Duration, Instant};
        let start = Instant::now();
        let s = |n: u64| start + Duration::from_millis(n);
        let base = s(8_000);
        assert_eq!(wait_deadline(base, start, s(3_000), false), base, "not pending: the plain wait");
        assert_eq!(wait_deadline(base, start, s(3_000), true), base, "pending early: still the plain wait");
        assert_eq!(wait_deadline(base, start, s(13_000), true), s(15_000), "pending at 13 s: until 15 s");
        assert_eq!(wait_deadline(s(15_000), start, s(14_000), false), s(15_000), "gone at 14 s: 15 s stands");
        assert_eq!(wait_deadline(base, start, s(59_500), true), s(SHOT_PENDING_MAX_MS), "a minute at most");
    }
}
