// Moving a whole library between machines (DESIGN_LIBRARY_TRANSFER).
//
// Same split as pack.rs: this side only touches the filesystem, every decision about what
// a merge means lives in the frontend (lib/db/transfer.ts) where it can be unit-tested.
//
// Two halves:
//   export — VACUUM INTO a file the user picked. Copying spool.db byte-wise would drop
//            whatever is still in the -wal, so the copy goes through SQLite.
//   import — stage the user's file INSIDE the data dir first. The frontend then opens the
//            staged copy as a second database and runs the normal migration chain on it,
//            which is why it must be a copy: migrating writes, and the file the user
//            handed us is theirs.

use rusqlite::{Connection, OpenFlags};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

/// The import's landing pad, next to spool.db. Named so it is obvious in a directory
/// listing that it is neither the library nor one of the pre-migration snapshots.
const STAGING: &str = "spool.import-staging.db";

/// Where the SQL plugin actually opens `sqlite:spool.db`: tauri-plugin-sql resolves a relative
/// sqlite URL against `app_config_dir()` (its wrapper.rs), and so do the frontend
/// (`appConfigDir`) and the MCP server (`%APPDATA%`). On macOS that is the same folder as the
/// local data dir; on Windows it is Roaming, not Local — P13 (DISCOVERED-20261106-7) found every
/// Rust-side connection opening an empty `spool.db` under Local. lib.rs's setup creates this
/// directory before the plugin first opens it.
pub(crate) fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_config_dir().map_err(|e| format!("找不到数据目录：{e}"))
}

/// A library Spool itself has set up: `user_version` set by the migrations and the `blocks`
/// table there. A 0-byte file, a foreign SQLite file or a library from the wrong folder is
/// refused here — before any query on it can fail with "no such table", and before an export
/// can copy it out as an empty backup (P13, DISCOVERED-20261106-7).
pub(crate) fn check_library(conn: &Connection) -> Result<(), String> {
    let (version, has_blocks): (i64, bool) = conn
        .query_row(
            "SELECT (SELECT user_version FROM pragma_user_version), \
                    EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'blocks')",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|e| format!("读不了库：{e}"))?;
    if version < 1 || !has_blocks {
        return Err(format!(
            "这里不是 Spool 的库 / This is not Spool's library: {}",
            conn.path().unwrap_or("?")
        ));
    }
    Ok(())
}

/// Both sidecars SQLite may have left beside a database file.
fn sidecars(db: &Path) -> [PathBuf; 2] {
    let mut wal = db.as_os_str().to_os_string();
    wal.push("-wal");
    let mut shm = db.as_os_str().to_os_string();
    shm.push("-shm");
    [PathBuf::from(wal), PathBuf::from(shm)]
}

/// True when two paths are the same file on disk, following symlinks. A path that cannot
/// be canonicalized (does not exist yet) is simply not the other one.
fn is_same_file(a: &Path, b: &Path) -> bool {
    match (fs::canonicalize(a), fs::canonicalize(b)) {
        (Ok(a), Ok(b)) => a == b,
        _ => false,
    }
}

/// Make `dest` writable by VACUUM INTO (which refuses to overwrite), or refuse the export.
///
/// ⚠️⚠️ The ORDER of the two steps below is the entire safety property of this feature, and
/// it lives in one function precisely so a test can hold it: a user who steers the save
/// dialog into the data directory and accepts the name `spool.db` must be REFUSED, not have
/// their live library deleted by the command meant to back it up. That is the 2026-05-29
/// class of accident. As two loose statements in the command body, nothing would notice the
/// day someone moved the deletion up.
pub(crate) fn clear_export_target(dest: &Path, data_dir: &Path) -> Result<(), String> {
    // Refuse FIRST. Never delete anything under the data directory.
    if dest.starts_with(data_dir) || inside_on_disk(dest, data_dir) {
        return Err("不能导出到 Spool 自己的数据目录里".into());
    }
    // Only then carry out the replacement the save dialog already asked the user about.
    if dest.exists() {
        fs::remove_file(dest).map_err(|e| format!("替换不了已有的文件：{e}"))?;
    }
    Ok(())
}

/// The same question asked of the paths as they are on disk. Two spellings name the same folder
/// on a case-insensitive disk (Windows, and a default Mac), and to a plain `starts_with` they are
/// two different places — that let a refused export delete the library (P13: a scratch data dir
/// `FakeData/spool.db` written as `fakedata/SPOOL.db` came back Ok and the file was gone).
/// `canonicalize` also resolves 8.3 short names, `\\?\` and links. `dest` may not exist yet (a
/// new file name, a new export folder): then its parent is what is checked.
fn inside_on_disk(dest: &Path, data_dir: &Path) -> bool {
    let Ok(dir) = fs::canonicalize(data_dir) else { return false };
    let probe = fs::canonicalize(dest).or_else(|e| match dest.parent() {
        Some(p) => fs::canonicalize(p),
        None => Err(e),
    });
    probe.is_ok_and(|p| p.starts_with(&dir))
}

/// Write the whole library out to `dest` as a single self-contained file.
///
/// Returns the exported file's size in bytes.
// ⚠️ `(async)`：这四条都是磁盘活儿（整库拷贝、逐个 stat），大库上是秒级的。⛔ 不占主线程。
#[tauri::command(async)]
pub fn export_library(app: tauri::AppHandle, dest: String) -> Result<u64, String> {
    let dir = data_dir(&app)?;
    let source = dir.join("spool.db");
    if !source.exists() {
        return Err("这台机器上还没有库".into());
    }

    export_library_to(&source, &dir, &PathBuf::from(&dest))
}

/// The command minus the AppHandle, so a test can bring its own library and data dir.
fn export_library_to(source: &Path, dir: &Path, dest_path: &Path) -> Result<u64, String> {
    // Read-only, exactly like the MCP server's connection: migrations run in the GUI and
    // an export must never be the thing that changes the library.
    let conn = Connection::open_with_flags(source, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| format!("打开库失败：{e}"))?;
    // ⚠️ Checked BEFORE the target is cleared: when the target is last week's backup, an empty or
    // wrong source must not cost the user that file (P13: a 0-byte library still VACUUMs INTO a
    // few-KB file with no tables in it, and the export used to report success).
    check_library(&conn)?;
    clear_export_target(dest_path, dir)?;

    // Quoted rather than bound: this mirrors the VACUUM INTO in lib/db/client.ts that has
    // been writing the pre-migration snapshots since v0.
    let quoted = dest_path.to_string_lossy().replace('\'', "''");
    conn.execute_batch(&format!("VACUUM INTO '{quoted}'"))
        .map_err(|e| format!("写不出库文件：{e}"))?;

    fs::metadata(dest_path).map(|m| m.len()).map_err(|e| format!("导出后读不到文件：{e}"))
}

/// Copy the file the user picked into the data dir so the frontend can open it as a second
/// database and migrate it. Returns nothing: the frontend opens it by its fixed name.
#[tauri::command(async)]
pub fn stage_import_db(app: tauri::AppHandle, source: String) -> Result<(), String> {
    let dir = data_dir(&app)?;
    let src = PathBuf::from(&source);
    if !src.is_file() {
        return Err(format!("文件不存在：{source}"));
    }
    // Importing the library that is open right now would merge it into itself: every id
    // collides, nothing changes, and the report says "0 项目" for reasons the user cannot
    // see. Refuse with the actual reason instead.
    if is_same_file(&src, &dir.join("spool.db")) {
        return Err("这就是这台机器上正在用的库".into());
    }

    let staged = dir.join(STAGING);
    // A previous import that crashed leaves all three files behind; a stale -wal beside a
    // fresh copy would make SQLite read someone else's half-written transaction.
    let _ = fs::remove_file(&staged);
    for s in sidecars(&staged) {
        let _ = fs::remove_file(s);
    }

    fs::copy(&src, &staged).map_err(|e| format!("拷不进来：{e}"))?;
    Ok(())
}

/// Delete the staged copy once the merge is done — or once it has failed.
#[tauri::command(async)]
pub fn discard_import_staging(app: tauri::AppHandle) -> Result<(), String> {
    let dir = data_dir(&app)?;
    let staged = dir.join(STAGING);
    let _ = fs::remove_file(&staged);
    for s in sidecars(&staged) {
        let _ = fs::remove_file(s);
    }
    Ok(())
}

/// How many of these attachment targets do not exist on this machine.
///
/// One call for the whole list rather than one per file: after an import from another
/// machine the answer is usually "all of them", and that is a number the user is told
/// once (DESIGN_LIBRARY_TRANSFER §3.4), not a per-row state anything reads later.
#[tauri::command(async)]
pub fn count_missing_targets(paths: Vec<String>) -> usize {
    paths.iter().filter(|p| !Path::new(p).exists()).count()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sidecar_names_hang_off_the_database_name() {
        let [wal, shm] = sidecars(Path::new("/tmp/x/spool.import-staging.db"));
        assert_eq!(wal, PathBuf::from("/tmp/x/spool.import-staging.db-wal"));
        assert_eq!(shm, PathBuf::from("/tmp/x/spool.import-staging.db-shm"));
    }

    #[test]
    fn a_path_that_does_not_exist_is_not_the_live_library() {
        assert!(!is_same_file(Path::new("/tmp/nope-a"), Path::new("/tmp/nope-b")));
    }

    #[test]
    fn the_same_file_reached_two_ways_is_recognised() {
        let dir = std::env::temp_dir().join(format!("spool-transfer-test-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let f = dir.join("spool.db");
        fs::write(&f, b"x").unwrap();
        assert!(is_same_file(&f, &dir.join(".").join("spool.db")));
        fs::remove_dir_all(&dir).unwrap();
    }

    /// Scratch dir shaped like the data directory, with a library in it.
    fn fake_data_dir(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir()
            .join(format!("spool-export-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("spool.db"), b"the real library").unwrap();
        dir
    }

    /// ⚠️⚠️ THE test of this feature. Refusing is not enough — refusing must not have
    /// deleted anything on the way. If the guard ever moves below the remove_file, the
    /// export command becomes a command that erases the library it exists to copy.
    #[test]
    fn refusing_an_export_into_the_data_dir_deletes_nothing() {
        let dir = fake_data_dir("refuse");
        let live = dir.join("spool.db");

        let err = clear_export_target(&live, &dir).unwrap_err();

        assert!(err.contains("数据目录"), "{err}");
        assert!(live.exists(), "the live library was deleted by a REFUSED export");
        assert_eq!(fs::read(&live).unwrap(), b"the real library");

        // Not just spool.db — nothing under the data directory may be an export target,
        // including the pre-migration snapshots that are the recovery path.
        assert!(clear_export_target(&dir.join("spool.pre-migration-v22.db"), &dir).is_err());
        assert!(clear_export_target(&dir.join("sub").join("x.db"), &dir).is_err());

        fs::remove_dir_all(&dir).unwrap();
    }

    /// ⭐ `starts_with` on a Path compares COMPONENTS, not characters — a sibling directory
    /// whose name merely begins with the data dir's name is a legitimate export target. This
    /// pins that the guard was not written as a string prefix test, which would refuse it.
    #[test]
    fn a_sibling_whose_name_starts_the_same_is_still_allowed() {
        let dir = fake_data_dir("sibling");
        let neighbour = PathBuf::from(format!("{}-export.db", dir.to_string_lossy()));
        let _ = fs::remove_file(&neighbour);

        assert!(clear_export_target(&neighbour, &dir).is_ok());

        fs::remove_dir_all(&dir).unwrap();
    }

    /// Outside the data dir the answer the save dialog already collected is carried out:
    /// VACUUM INTO will not write over a file, so the old one has to go first.
    #[test]
    fn an_existing_file_outside_the_data_dir_is_replaced() {
        let dir = fake_data_dir("replace");
        let out = std::env::temp_dir()
            .join(format!("spool-export-out-{}.db", std::process::id()));
        fs::write(&out, b"last week's export").unwrap();

        assert!(clear_export_target(&out, &dir).is_ok());
        assert!(!out.exists(), "VACUUM INTO would refuse to write over it");
        // Absent is fine too — the common case is a brand-new file name.
        assert!(clear_export_target(&out, &dir).is_ok());

        fs::remove_dir_all(&dir).unwrap();
    }

    /// The data dir spelled with its own name's case flipped — the same folder on a
    /// case-insensitive disk (Windows; a default Mac), a different string to `starts_with`.
    fn respelled(dir: &Path) -> PathBuf {
        let name = dir.file_name().unwrap().to_string_lossy().to_uppercase();
        dir.parent().unwrap().join(name)
    }

    /// ⚠️⚠️ P13: the guard compared the paths as written. `FakeData/spool.db` written as
    /// `fakedata/SPOOL.db` sailed past the refusal and the remove_file below it deleted the
    /// library. Asserted only where the disk really is case-insensitive (it is on every machine
    /// Spool ships to); the library must survive either way.
    #[test]
    fn a_differently_spelled_data_dir_is_still_refused_and_deletes_nothing() {
        let dir = fake_data_dir("case");
        let live = dir.join("spool.db");
        let alias = respelled(&dir);

        let file = clear_export_target(&alias.join("SPOOL.db"), &dir);
        // A new export folder inside it (the pack export's root does not exist yet).
        let folder = clear_export_target(&alias.join("an-export-folder"), &dir);

        if alias.exists() {
            assert!(file.is_err(), "a respelled data dir was not refused");
            assert!(folder.is_err(), "a new folder under a respelled data dir was not refused");
        }
        assert_eq!(fs::read(&live).unwrap(), b"the real library", "the live library was touched");

        fs::remove_dir_all(&dir).unwrap();
    }

    /// A library shaped like Spool's: the migrations' `user_version`, a `blocks` table, one row.
    fn real_library(path: &Path) -> Connection {
        let conn = Connection::open(path).unwrap();
        conn.execute_batch(
            "PRAGMA journal_mode = WAL; PRAGMA wal_autocheckpoint = 0; PRAGMA user_version = 38;
             CREATE TABLE blocks (id TEXT PRIMARY KEY, content TEXT);
             INSERT INTO blocks VALUES ('b1', 'in the main file');",
        )
        .unwrap();
        conn
    }

    /// P13 (DISCOVERED-20261106-7): on Windows the export read an empty `spool.db` and reported
    /// success with a backup that held nothing. An empty or foreign source is now refused — and
    /// refused BEFORE the target is cleared, so last week's export the user chose to replace is
    /// still there.
    #[test]
    fn an_empty_or_foreign_library_is_not_exported_and_the_old_backup_survives() {
        let dir = std::env::temp_dir().join(format!("spool-export-empty-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let source = dir.join("spool.db");
        let out = std::env::temp_dir().join(format!("spool-export-keep-{}.db", std::process::id()));

        fs::write(&source, b"").unwrap();
        fs::write(&out, b"last week's export").unwrap();
        let err = export_library_to(&source, &dir, &out).unwrap_err();
        assert!(err.contains("not Spool's library"), "{err}");
        assert_eq!(fs::read(&out).unwrap(), b"last week's export");

        fs::remove_file(&source).unwrap();
        Connection::open(&source).unwrap().execute_batch("PRAGMA user_version = 7; CREATE TABLE t (x);").unwrap();
        assert!(export_library_to(&source, &dir, &out).is_err(), "a library without blocks was exported");
        assert_eq!(fs::read(&out).unwrap(), b"last week's export");

        fs::remove_dir_all(&dir).unwrap();
        fs::remove_file(&out).unwrap();
    }

    /// The export goes through SQLite (VACUUM INTO), so a row still sitting in the -wal while the
    /// GUI holds the library open is in the backup too.
    #[test]
    fn an_export_carries_what_is_still_in_the_wal() {
        let dir = std::env::temp_dir().join(format!("spool-export-wal-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let source = dir.join("spool.db");
        let writer = real_library(&source);
        writer.execute("INSERT INTO blocks VALUES ('b2', 'only in the wal')", []).unwrap();
        assert!(fs::metadata(dir.join("spool.db-wal")).unwrap().len() > 0, "the test must exercise the wal");
        let out = std::env::temp_dir().join(format!("spool-export-wal-out-{}.db", std::process::id()));
        let _ = fs::remove_file(&out);

        let size = export_library_to(&source, &dir, &out).unwrap();

        assert_eq!(size, fs::metadata(&out).unwrap().len());
        let copy = Connection::open_with_flags(&out, OpenFlags::SQLITE_OPEN_READ_ONLY).unwrap();
        check_library(&copy).unwrap();
        let rows: Vec<(String, String)> = copy
            .prepare("SELECT id, content FROM blocks ORDER BY id")
            .unwrap()
            .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        assert_eq!(rows, vec![("b1".into(), "in the main file".into()), ("b2".into(), "only in the wal".into())]);
        drop(copy);
        drop(writer);
        fs::remove_dir_all(&dir).unwrap();
        fs::remove_file(&out).unwrap();
    }

    /// One folder, three readers: the SQL plugin (app_config_dir — its wrapper.rs), the frontend
    /// and this file. Pinned on the source, the way `schema_version_locked_to_gui` pins the
    /// version: on Windows a drift between them is not a visible error but a second, empty library.
    #[test]
    fn the_rust_side_opens_the_same_folder_as_the_plugin_and_the_frontend() {
        let this = include_str!("transfer.rs");
        let body = this.split("pub(crate) fn data_dir(").nth(1).unwrap().split("\n}").next().unwrap();
        assert!(body.contains("app_config_dir()") && !body.contains("local_data"), "{body}");
        for ts in [include_str!("../../src/lib/db/client.ts"), include_str!("../../src/lib/db/transfer.ts")] {
            assert!(ts.contains("appConfigDir") && !ts.contains("appLocalDataDir") && !ts.contains("appDataDir"));
        }
        let lib = include_str!("lib.rs");
        assert!(lib.contains("transfer::data_dir(app.handle())") && !lib.contains("app_local_data_dir"));
    }

    /// Counting is what the user is told, so an empty list must report zero rather than
    /// "everything is missing".
    #[test]
    fn missing_targets_counts_only_what_is_gone() {
        let here = std::env::current_dir().unwrap().to_string_lossy().to_string();
        assert_eq!(count_missing_targets(vec![]), 0);
        assert_eq!(count_missing_targets(vec![here.clone()]), 0);
        assert_eq!(count_missing_targets(vec![here, "/nope/definitely/not".into()]), 1);
    }
}
