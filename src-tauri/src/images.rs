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
    let mut reader = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|e| e.to_string())?;
    reader.limits(limits());
    let img = reader.decode().map_err(|e| e.to_string())?;
    let (w, h) = img.dimensions();
    if w.max(h) <= PREVIEW_EDGE_PX {
        return Ok(full_data_url(format, bytes));
    }
    let small = img.thumbnail(PREVIEW_EDGE_PX, PREVIEW_EDGE_PX);
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
