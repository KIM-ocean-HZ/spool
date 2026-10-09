// Writing a workspace pack out as a real folder (DESIGN_WORKSPACE_PACK §1.2).
//
// The frontend assembles every byte (lib/pack/folder.ts); this only puts the bytes on disk.
// It goes through a command rather than tauri-plugin-fs for the same reason `path_is_dir`
// and `open_target` do: the capability file would otherwise have to grant blanket write
// access to `**`, and the one thing this feature needs — "create ONE new folder under a
// directory the user just picked" — is narrower than any permission the plugin can express.

use rusqlite::{Connection, OpenFlags};
use std::collections::HashSet;
use std::fs;
use std::path::{Component, Path, PathBuf};

/// One file in the export: a path relative to the export root, and its whole content.
#[derive(serde::Deserialize)]
pub struct PackFile {
    path: String,
    content: String,
}

/// Characters that must not reach the filesystem in a name derived from a user's project
/// title. Mirrors `sanitizeSegment` in lib/pack/folder.ts — the frontend already cleans
/// these, and this is the check that does not trust it.
fn segment_is_safe(segment: &str) -> bool {
    !segment.is_empty()
        && segment != "."
        && segment != ".."
        && !segment.contains(['/', '\\', ':'])
        && !segment.chars().any(|c| c.is_control())
}

/// Resolve a relative path from the export against `root`, refusing anything that could
/// land outside it. ⚠️ This is the whole security boundary of the command: the frontend
/// builds these paths out of user-supplied project titles, so `..` and absolute paths have
/// to die here rather than be assumed away upstream.
fn resolve_within(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let candidate = Path::new(relative);
    if candidate.is_absolute() {
        return Err(format!("拒绝写绝对路径：{relative}"));
    }
    let mut out = root.to_path_buf();
    for component in candidate.components() {
        match component {
            Component::Normal(part) => {
                let part = part.to_str().ok_or_else(|| format!("路径不是 UTF-8：{relative}"))?;
                if !segment_is_safe(part) {
                    return Err(format!("路径里有不能用的字段：{relative}"));
                }
                out.push(part);
            }
            _ => return Err(format!("路径里有 .. 或根目录：{relative}")),
        }
    }
    Ok(out)
}

/// The first of `name`, `name-2`, `name-3`, … that does not exist yet under `parent`.
fn free_folder(parent: &Path, folder_name: &str) -> Result<PathBuf, String> {
    if !parent.is_dir() {
        return Err(format!("目录不存在：{}", parent.display()));
    }
    if !segment_is_safe(folder_name) {
        return Err(format!("文件夹名不能用：{folder_name}"));
    }
    let mut root = parent.join(folder_name);
    let mut suffix = 2;
    while root.exists() {
        if suffix > 99 {
            return Err(format!("同名文件夹太多了：{folder_name}"));
        }
        root = parent.join(format!("{folder_name}-{suffix}"));
        suffix += 1;
    }
    Ok(root)
}

/// Create a NEW folder named `folder_name` (or the first free `name-2`, `name-3`, …) under
/// `parent`, write every file into it, and return the folder's absolute path.
///
/// ⚠️ It never writes into a directory that already exists. An export is a snapshot the
/// user hands to an AI; silently merging today's export into last week's would produce a
/// folder whose INDEX.md describes some of the files in it and not the others.
// ⚠️ `(async)`：往磁盘写一整个文件夹，⛔ 不占主线程（见 api_engine.rs 里 api_key_save 那段）。
#[tauri::command(async)]
pub fn write_pack_folder(
    parent: String,
    folder_name: String,
    files: Vec<PackFile>,
) -> Result<String, String> {
    let parent = PathBuf::from(&parent);
    let root = free_folder(&parent, &folder_name)?;

    // Every path is checked before ANY of them is written, so a bad one cannot leave half
    // an export on disk under a folder whose INDEX.md promises more.
    let targets = files
        .iter()
        .map(|f| resolve_within(&root, &f.path))
        .collect::<Result<Vec<_>, _>>()?;

    fs::create_dir_all(&root).map_err(|e| format!("建不了文件夹：{e}"))?;
    for (target, file) in targets.iter().zip(files.iter()) {
        if let Some(dir) = target.parent() {
            fs::create_dir_all(dir).map_err(|e| format!("建不了子文件夹：{e}"))?;
        }
        fs::write(target, &file.content).map_err(|e| format!("写不了 {}：{e}", file.path))?;
    }

    Ok(root.to_string_lossy().to_string())
}

/// Write one project's pack to the single file the save dialog returned (P2 · B1).
///
/// Same reason as the folder command for going through Rust: the frontend gets no blanket
/// write permission. ⚠️ `content` is written exactly as received — no BOM, no newline
/// conversion — so the exported .md is byte-for-byte what the 复制 button puts on the
/// clipboard. Whether to replace an existing file was the save dialog's question to ask.
// ⚠️ `(async)`：磁盘活儿，⛔ 不占主线程（记忆 tauri-sync-commands-freeze-ui）。
#[tauri::command(async)]
pub fn write_pack_file(app: tauri::AppHandle, dest: String, content: String) -> Result<(), String> {
    let data_dir = crate::transfer::data_dir(&app)?;
    write_pack_file_to(Path::new(&dest), &content, &data_dir)
}

/// The command minus the AppHandle, so a test can point it at a scratch "data dir".
/// ⚠️ The refusal is `export_library`'s own guard, not a copy of it: a .md steered into
/// Spool's data directory must be refused before anything there is touched.
fn write_pack_file_to(dest: &Path, content: &str, data_dir: &Path) -> Result<(), String> {
    crate::transfer::clear_export_target(dest, data_dir)?;
    fs::write(dest, content).map_err(|e| format!("写不了 {}：{e}", dest.display()))
}

// ---------------------------------------------------------------------------------------
// P8-1 (Ocean 2026-09-30 §9.2 第 12 条, 10-08 第 50 条) — a pack exported WITH the project's
// files and pictures: the .md, plus `files/` and `images/` beside it, so the whole folder can be
// handed to a web AI and every link in the .md opens. The frontend decides what goes where
// (lib/pack/export.ts); this checks every piece of it, then copies.
// ---------------------------------------------------------------------------------------

/// What the export list shows for one of the project's paths. `kind` None = not on this
/// computer any more (or something that is neither a file nor a folder).
#[derive(Debug, PartialEq, serde::Serialize)]
pub struct SourceSize {
    kind: Option<&'static str>,
    bytes: u64,
}

/// Everything under `dir` that is a regular file, added up. ⛔ Symbolic links are neither
/// followed nor counted — one can point back up the tree, or at a whole disk. A sub-folder that
/// cannot be read counts as empty.
fn folder_bytes(dir: &Path) -> u64 {
    let Ok(entries) = fs::read_dir(dir) else { return 0 };
    entries
        .flatten()
        .map(|e| match e.file_type() {
            Ok(t) if t.is_dir() => folder_bytes(&e.path()),
            // DirEntry::metadata does not traverse a link either; only regular files get here.
            Ok(t) if t.is_file() => e.metadata().map(|m| m.len()).unwrap_or(0),
            _ => 0,
        })
        .sum()
}

/// The path itself is followed: it is the file the user attached, and a link they attached
/// stands for what it points at. Only what is found INSIDE a folder is never followed.
fn source_size(path: &Path) -> SourceSize {
    match fs::metadata(path) {
        Ok(m) if m.is_file() => SourceSize { kind: Some("file"), bytes: m.len() },
        Ok(m) if m.is_dir() => SourceSize { kind: Some("folder"), bytes: folder_bytes(path) },
        _ => SourceSize { kind: None, bytes: 0 },
    }
}

/// Is each of these still there, a file or a folder, and how big — for the export list.
// ⚠️ `(async)`：一个大文件夹要逐个 stat，断开的网络卷会卡住，⛔ 不占主线程。
#[tauri::command(async)]
pub fn pack_source_sizes(paths: Vec<String>) -> Vec<SourceSize> {
    paths.iter().map(|p| source_size(Path::new(p))).collect()
}

/// One of the project's files (or folders), copied as it is into the export at `path`.
#[derive(serde::Deserialize)]
pub struct PackCopy {
    source: String,
    path: String,
}

/// One picture, written out of the library into the export at `path`.
#[derive(serde::Deserialize)]
pub struct PackPicture {
    id: String,
    path: String,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackExport {
    root: String,
    /// Entries inside copied folders that were not copied: symbolic links (and the odd pipe or
    /// socket), which a copy must not follow.
    skipped: usize,
}

/// Copy a folder, reading the source only. ⛔ Symbolic links are skipped, not followed.
fn copy_tree(src: &Path, dst: &Path, skipped: &mut usize) -> std::io::Result<()> {
    fs::create_dir(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let to = dst.join(entry.file_name());
        let kind = entry.file_type()?;
        if kind.is_dir() {
            copy_tree(&entry.path(), &to, skipped)?;
        } else if kind.is_file() {
            fs::copy(entry.path(), &to)?;
        } else {
            *skipped += 1;
        }
    }
    Ok(())
}

/// Read-only, like the library export's own connection: an export never changes the library.
fn open_library_read_only(data_dir: &Path) -> Result<Connection, String> {
    let conn = Connection::open_with_flags(data_dir.join("spool.db"), OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| format!("打开库失败：{e}"))?;
    conn.busy_timeout(std::time::Duration::from_secs(5)).map_err(|e| e.to_string())?;
    Ok(conn)
}

/// Create a NEW folder under `parent` (`-2`, `-3`… as `write_pack_folder` does), write the
/// .md files into it, copy the project files and write the pictures. Returns the folder.
///
/// ⚠️ Everything is checked before anything is written, and one thing wrong means nothing is
/// written: a .md whose links point at files that are not there is exactly what this export
/// exists to avoid. Errors the user can do something about come back as codes, so the webview
/// says them in the user's language: `missing:<JSON list of paths>` when a file was deleted after
/// the list was drawn, `no_image` when a picture left the library.
// ⚠️ `(async)`：拷一整个项目的文件，⛔ 不占主线程（记忆 tauri-sync-commands-freeze-ui）。
#[tauri::command(async)]
pub fn write_pack_export(
    app: tauri::AppHandle,
    parent: String,
    folder_name: String,
    files: Vec<PackFile>,
    copies: Vec<PackCopy>,
    images: Vec<PackPicture>,
) -> Result<PackExport, String> {
    let data_dir = crate::transfer::data_dir(&app)?;
    let conn = if images.is_empty() { None } else { Some(open_library_read_only(&data_dir)?) };
    write_pack_export_to(Path::new(&parent), &folder_name, &files, &copies, &images, conn.as_ref(), &data_dir)
}

/// The command minus the AppHandle, so a test can bring its own library and "data dir".
fn write_pack_export_to(
    parent: &Path,
    folder_name: &str,
    files: &[PackFile],
    copies: &[PackCopy],
    images: &[PackPicture],
    conn: Option<&Connection>,
    data_dir: &Path,
) -> Result<PackExport, String> {
    let root = free_folder(parent, folder_name)?;
    // `export_library`'s own guard. `root` does not exist yet, so it can only refuse — there is
    // nothing for it to replace.
    crate::transfer::clear_export_target(&root, data_dir)?;

    // Every target inside the new folder, each at most once.
    let mut seen = HashSet::new();
    let mut target = |relative: &str| -> Result<PathBuf, String> {
        let path = resolve_within(&root, relative)?;
        if !seen.insert(path.clone()) {
            return Err(format!("同一个位置写了两次：{relative}"));
        }
        Ok(path)
    };
    let md_targets = files.iter().map(|f| target(&f.path)).collect::<Result<Vec<_>, _>>()?;
    let copy_targets = copies.iter().map(|c| target(&c.path)).collect::<Result<Vec<_>, _>>()?;
    let image_targets = images.iter().map(|i| target(&i.path)).collect::<Result<Vec<_>, _>>()?;

    let missing: Vec<&str> = copies
        .iter()
        .filter(|c| source_size(Path::new(&c.source)).kind.is_none())
        .map(|c| c.source.as_str())
        .collect();
    if !missing.is_empty() {
        return Err(format!("missing:{}", serde_json::to_string(&missing).map_err(|e| e.to_string())?));
    }
    if !images.is_empty() {
        let conn = conn.ok_or_else(|| "no_image".to_string())?;
        for img in images {
            let ext = crate::images::stored_ext(conn, &img.id)?;
            if !img.path.ends_with(&format!(".{ext}")) {
                return Err(format!("图片的扩展名不对：{}", img.path));
            }
        }
    }

    // `create_dir`, not `_all`: if the folder appeared since `free_folder` looked, this fails
    // rather than writing into somebody else's folder.
    fs::create_dir(&root).map_err(|e| format!("建不了文件夹：{e}"))?;
    let mut skipped = 0;
    let mut write_all = || -> Result<(), String> {
        let make_parent = |t: &Path| match t.parent() {
            Some(dir) => fs::create_dir_all(dir).map_err(|e| format!("建不了子文件夹：{e}")),
            None => Ok(()),
        };
        for (t, f) in md_targets.iter().zip(files) {
            make_parent(t)?;
            fs::write(t, &f.content).map_err(|e| format!("写不了 {}：{e}", f.path))?;
        }
        for (t, c) in copy_targets.iter().zip(copies) {
            make_parent(t)?;
            let source = Path::new(&c.source);
            let copied = if source.is_dir() {
                copy_tree(source, t, &mut skipped)
            } else {
                fs::copy(source, t).map(|_| ())
            };
            copied.map_err(|e| format!("拷不了 {}：{e}", c.source))?;
        }
        if let Some(conn) = conn {
            for (t, img) in image_targets.iter().zip(images) {
                make_parent(t)?;
                // The stored bytes as they are — ⛔ not re-encoded, ⛔ not taken from
                // `image-cache/`, which anyone may delete at any time.
                let (_, bytes) = crate::images::read_image(conn, &img.id)?;
                fs::write(t, bytes).map_err(|e| format!("写不了 {}：{e}", img.path))?;
            }
        }
        Ok(())
    };
    if let Err(e) = write_all() {
        // The folder is ours — created a moment ago — so a half-written export goes with it.
        let _ = fs::remove_dir_all(&root);
        return Err(e);
    }

    Ok(PackExport { root: root.to_string_lossy().to_string(), skipped })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_a_plain_relative_path() {
        let root = Path::new("/tmp/export");
        assert_eq!(
            resolve_within(root, "材料准备/01-文书.md").unwrap(),
            PathBuf::from("/tmp/export/材料准备/01-文书.md")
        );
    }

    #[test]
    fn refuses_to_climb_out_of_the_export() {
        let root = Path::new("/tmp/export");
        assert!(resolve_within(root, "../evil.md").is_err());
        assert!(resolve_within(root, "a/../../evil.md").is_err());
        assert!(resolve_within(root, "/etc/passwd").is_err());
    }

    /// ⚠️ Writes for real. The path logic above is checked in isolation; this pins the thing
    /// that only shows up on a filesystem — exporting twice in one day must not merge the
    /// second export into the first, which would leave a folder whose INDEX.md describes some
    /// of its files and not the others.
    #[test]
    fn a_second_export_of_the_same_day_gets_its_own_folder() {
        let parent = std::env::temp_dir().join(format!("spool-pack-test-{}", std::process::id()));
        fs::create_dir_all(&parent).unwrap();

        let files = || {
            vec![
                PackFile { path: "INDEX.md".into(), content: "rules".into() },
                PackFile { path: "材料准备/01-文书.md".into(), content: "body".into() },
            ]
        };
        let p = parent.to_string_lossy().to_string();

        let first = write_pack_folder(p.clone(), "spool-升学-20260817".into(), files()).unwrap();
        let second = write_pack_folder(p.clone(), "spool-升学-20260817".into(), files()).unwrap();

        assert!(first.ends_with("spool-升学-20260817"));
        assert!(second.ends_with("spool-升学-20260817-2"));
        assert_eq!(fs::read_to_string(Path::new(&first).join("INDEX.md")).unwrap(), "rules");
        // The sub-directory is created on the way, not required to exist beforehand.
        assert_eq!(
            fs::read_to_string(Path::new(&second).join("材料准备/01-文书.md")).unwrap(),
            "body"
        );

        fs::remove_dir_all(&parent).unwrap();
    }

    #[test]
    fn refuses_names_the_frontend_should_have_cleaned() {
        assert!(!segment_is_safe(""));
        assert!(!segment_is_safe(".."));
        assert!(!segment_is_safe("a:b"));
        assert!(!segment_is_safe("a\nb"));
        assert!(segment_is_safe("01-申请规划.md"));
    }

    fn scratch(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("spool-packfile-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    /// The exported file must be byte-identical to what 复制 puts on the clipboard: CJK,
    /// Windows line endings and a missing final newline all survive untouched.
    #[test]
    fn a_pack_file_reads_back_byte_for_byte() {
        let data = scratch("data");
        let out = scratch("out");
        for (i, content) in [
            "# 升学申请\n\n## 文书\n- 第一稿已交\n",
            "line one\r\nline two\r\n",
            "结尾没有换行",
        ]
        .iter()
        .enumerate()
        {
            let dest = out.join(format!("pack-{i}.md"));
            write_pack_file_to(&dest, content, &data).unwrap();
            assert_eq!(fs::read(&dest).unwrap(), content.as_bytes());
        }
        // Replacing a file the save dialog already asked about leaves only the new bytes.
        let dest = out.join("pack-0.md");
        write_pack_file_to(&dest, "短", &data).unwrap();
        assert_eq!(fs::read(&dest).unwrap(), "短".as_bytes());

        fs::remove_dir_all(&data).unwrap();
        fs::remove_dir_all(&out).unwrap();
    }

    /// ⚠️ Steering the save dialog into Spool's data directory is refused, and the refusal
    /// touches nothing there — not even a file of the same name.
    #[test]
    fn a_pack_file_is_never_written_into_the_data_dir() {
        let data = scratch("refuse");
        let live = data.join("spool.db");
        fs::write(&live, b"the real library").unwrap();

        assert!(write_pack_file_to(&live, "pack", &data).is_err());
        assert_eq!(fs::read(&live).unwrap(), b"the real library");
        let fresh = data.join("pack.md");
        assert!(write_pack_file_to(&fresh, "pack", &data).is_err());
        assert!(!fresh.exists());

        fs::remove_dir_all(&data).unwrap();
    }

    // ---- P8-1 ----

    /// A library holding one block with one stored picture; returns the picture's id.
    fn library_with_picture(bytes: &[u8], format: &str) -> (Connection, String) {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(include_str!("../../src/lib/db/schema.sql")).unwrap();
        conn.execute_batch(
            "INSERT INTO workspaces (id, title, sort_order, created_at, updated_at) VALUES ('w', 'W', 0, 1, 1);
             INSERT INTO threads (id, workspace_id, title, created_at, updated_at) VALUES ('t', 'w', 'T', 1, 1);
             INSERT INTO blocks (id, thread_id, content, created_at) VALUES ('b', 't', 'x', 1);",
        )
        .unwrap();
        conn.execute(
            "INSERT INTO block_images (id, block_id, position, bytes, format, width, height, size_bytes, created_at)
             VALUES ('pic1', 'b', 0, ?1, ?2, 4, 4, ?3, 1)",
            rusqlite::params![bytes, format, bytes.len() as i64],
        )
        .unwrap();
        (conn, "pic1".into())
    }

    fn md(path: &str, content: &str) -> PackFile {
        PackFile { path: path.into(), content: content.into() }
    }

    fn entries(dir: &Path) -> Vec<String> {
        let mut names: Vec<String> =
            fs::read_dir(dir).unwrap().map(|e| e.unwrap().file_name().to_string_lossy().into_owned()).collect();
        names.sort();
        names
    }

    /// The copies are the sources byte for byte (bytes that are not UTF-8 included), a folder comes
    /// with everything under it, and ⛔ a symbolic link inside it is skipped and counted, not followed.
    #[cfg(unix)]
    #[test]
    fn an_export_copies_files_and_folders_byte_for_byte_and_skips_links() {
        let src = scratch("p8-src");
        let out = scratch("p8-out");
        let data = scratch("p8-data");
        let pdf = src.join("课程 大纲.pdf");
        let pdf_bytes: Vec<u8> = (0..=255u8).cycle().take(5000).collect();
        fs::write(&pdf, &pdf_bytes).unwrap();
        let notes = src.join("notes");
        fs::create_dir_all(notes.join("sub")).unwrap();
        fs::write(notes.join("a.md"), "# a\r\n").unwrap();
        fs::write(notes.join("sub/b.bin"), [0u8, 159, 146, 150]).unwrap();
        std::os::unix::fs::symlink(&pdf, notes.join("link-to-pdf")).unwrap();
        std::os::unix::fs::symlink("/", notes.join("sub/link-to-root")).unwrap();

        let done = write_pack_export_to(
            &out,
            "项目-20261010",
            &[md("pack.md", "[课程 大纲.pdf](files/课程-大纲.pdf)\n")],
            &[
                PackCopy { source: pdf.to_string_lossy().into(), path: "files/课程-大纲.pdf".into() },
                PackCopy { source: notes.to_string_lossy().into(), path: "files/notes".into() },
            ],
            &[],
            None,
            &data,
        )
        .unwrap();

        let root = PathBuf::from(&done.root);
        assert!(done.root.ends_with("项目-20261010"));
        assert_eq!(fs::read_to_string(root.join("pack.md")).unwrap(), "[课程 大纲.pdf](files/课程-大纲.pdf)\n");
        assert_eq!(fs::read(root.join("files/课程-大纲.pdf")).unwrap(), pdf_bytes);
        assert_eq!(fs::read(root.join("files/notes/a.md")).unwrap(), b"# a\r\n");
        assert_eq!(fs::read(root.join("files/notes/sub/b.bin")).unwrap(), [0u8, 159, 146, 150]);
        assert_eq!(entries(&root.join("files/notes")), ["a.md", "sub"]);
        assert_eq!(entries(&root.join("files/notes/sub")), ["b.bin"]);
        assert_eq!(done.skipped, 2);
        // The source is only read.
        assert_eq!(fs::read(&pdf).unwrap(), pdf_bytes);

        for d in [src, out, data] {
            fs::remove_dir_all(d).unwrap();
        }
    }

    /// A picture is written from the library's own bytes — not re-encoded, not from the cache.
    #[test]
    fn an_export_writes_pictures_from_the_library_byte_for_byte() {
        let out = scratch("p8-pic-out");
        let data = scratch("p8-pic-data");
        let stored: Vec<u8> = b"\x89PNG\r\n\x1a\nnot really decoded here \x00\xff".to_vec();
        let (conn, id) = library_with_picture(&stored, "png");

        let done = write_pack_export_to(
            &out,
            "p",
            &[md("pack.md", "![注释](images/12-1.png)\n")],
            &[],
            &[PackPicture { id: id.clone(), path: "images/12-1.png".into() }],
            Some(&conn),
            &data,
        )
        .unwrap();
        assert_eq!(fs::read(PathBuf::from(&done.root).join("images/12-1.png")).unwrap(), stored);

        // An extension that is not the cache's own for this picture is refused, before anything is made.
        let wrong = [PackPicture { id: id.clone(), path: "images/12-1.jpg".into() }];
        assert!(write_pack_export_to(&out, "q", &[], &[], &wrong, Some(&conn), &data).is_err());
        // A picture no longer in the library: refused with its code, nothing made.
        let gone = [PackPicture { id: "gone".into(), path: "images/1-1.png".into() }];
        assert_eq!(write_pack_export_to(&out, "q", &[], &[], &gone, Some(&conn), &data).unwrap_err(), "no_image");
        assert_eq!(entries(&out), ["p"]);

        fs::remove_dir_all(&out).unwrap();
        fs::remove_dir_all(&data).unwrap();
    }

    /// ⚠️ One thing wrong ⇒ nothing written: not even the export folder appears.
    #[test]
    fn an_export_refuses_before_writing_anything() {
        let src = scratch("p8-refuse-src");
        let out = scratch("p8-refuse-out");
        let data = scratch("p8-refuse-data");
        let here = src.join("here.txt");
        fs::write(&here, "x").unwrap();
        let gone = src.join("deleted after the list was drawn.pdf");
        let copy = |s: &Path, p: &str| PackCopy { source: s.to_string_lossy().into(), path: p.into() };
        let pack = [md("pack.md", "body")];

        // A source that is no longer there: refused, and named.
        let err = write_pack_export_to(
            &out,
            "p",
            &pack,
            &[copy(&here, "files/here.txt"), copy(&gone, "files/gone.pdf")],
            &[],
            None,
            &data,
        )
        .unwrap_err();
        let listed: Vec<String> = serde_json::from_str(err.strip_prefix("missing:").unwrap()).unwrap();
        assert_eq!(listed, [gone.to_string_lossy().to_string()]);

        // Climbing out of the export, or an absolute path.
        assert!(write_pack_export_to(&out, "p", &pack, &[copy(&here, "../here.txt")], &[], None, &data).is_err());
        assert!(write_pack_export_to(&out, "p", &pack, &[copy(&here, "/tmp/here.txt")], &[], None, &data).is_err());
        assert!(write_pack_export_to(&out, "p", &[md("files/../../x.md", "")], &[], &[], None, &data).is_err());
        // Two pieces aimed at the same place.
        assert!(write_pack_export_to(&out, "p", &pack, &[copy(&here, "pack.md")], &[], None, &data).is_err());
        assert_eq!(entries(&out), Vec::<String>::new(), "nothing was created in any of the above");

        // Steered into Spool's own data directory.
        assert!(write_pack_export_to(&data, "p", &pack, &[], &[], None, &data).is_err());
        assert_eq!(entries(&data), Vec::<String>::new());

        for d in [src, out, data] {
            fs::remove_dir_all(d).unwrap();
        }
    }

    #[test]
    fn a_second_export_with_files_gets_its_own_folder() {
        let src = scratch("p8-twice-src");
        let out = scratch("p8-twice-out");
        let data = scratch("p8-twice-data");
        let f = src.join("a.txt");
        fs::write(&f, "a").unwrap();
        let copies = [PackCopy { source: f.to_string_lossy().into(), path: "files/a.txt".into() }];
        let first = write_pack_export_to(&out, "项目-20261010", &[md("pack.md", "1")], &copies, &[], None, &data).unwrap();
        let second = write_pack_export_to(&out, "项目-20261010", &[md("pack.md", "2")], &copies, &[], None, &data).unwrap();
        assert!(first.root.ends_with("项目-20261010"));
        assert!(second.root.ends_with("项目-20261010-2"));
        assert_eq!(fs::read_to_string(PathBuf::from(&first.root).join("pack.md")).unwrap(), "1");
        for d in [src, out, data] {
            fs::remove_dir_all(d).unwrap();
        }
    }

    /// The four cases the export list meets: a file, a folder (sub-folders added in), a path that is
    /// gone, and symbolic links — followed when it IS the attached path, never inside a folder.
    #[cfg(unix)]
    #[test]
    fn source_sizes_cover_files_folders_missing_and_links() {
        let src = scratch("p8-sizes");
        let file = src.join("a.bin");
        fs::write(&file, vec![1u8; 1000]).unwrap();
        let folder = src.join("folder");
        fs::create_dir_all(folder.join("sub")).unwrap();
        fs::write(folder.join("x"), vec![2u8; 30]).unwrap();
        fs::write(folder.join("sub/y"), vec![3u8; 7]).unwrap();
        std::os::unix::fs::symlink(&file, folder.join("link-to-a")).unwrap();
        let link = src.join("link-to-a");
        std::os::unix::fs::symlink(&file, &link).unwrap();
        let broken = src.join("broken");
        std::os::unix::fs::symlink(src.join("nowhere"), &broken).unwrap();

        let got = pack_source_sizes(
            [&file, &folder, &src.join("gone.pdf"), &link, &broken]
                .iter()
                .map(|p| p.to_string_lossy().into_owned())
                .collect(),
        );
        assert_eq!(
            got,
            [
                SourceSize { kind: Some("file"), bytes: 1000 },
                SourceSize { kind: Some("folder"), bytes: 37 },
                SourceSize { kind: None, bytes: 0 },
                SourceSize { kind: Some("file"), bytes: 1000 },
                SourceSize { kind: None, bytes: 0 },
            ]
        );
        fs::remove_dir_all(&src).unwrap();
    }
}
