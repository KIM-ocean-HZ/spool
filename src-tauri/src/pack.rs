// Writing a workspace pack out as a real folder (DESIGN_WORKSPACE_PACK §1.2).
//
// The frontend assembles every byte (lib/pack/folder.ts); this only puts the bytes on disk.
// It goes through a command rather than tauri-plugin-fs for the same reason `path_is_dir`
// and `open_target` do: the capability file would otherwise have to grant blanket write
// access to `**`, and the one thing this feature needs — "create ONE new folder under a
// directory the user just picked" — is narrower than any permission the plugin can express.

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
    if !parent.is_dir() {
        return Err(format!("目录不存在：{}", parent.display()));
    }
    if !segment_is_safe(&folder_name) {
        return Err(format!("文件夹名不能用：{folder_name}"));
    }

    let mut root = parent.join(&folder_name);
    let mut suffix = 2;
    while root.exists() {
        if suffix > 99 {
            return Err(format!("同名文件夹太多了：{folder_name}"));
        }
        root = parent.join(format!("{folder_name}-{suffix}"));
        suffix += 1;
    }

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
}
