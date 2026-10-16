//! P9-3 (Ocean 2026-10-10, HANDOFF §9.2 第 57、58、63 条) — a project file that moved is
//! followed; one that cannot be followed says which of the ways it is gone.
//!
//! Ocean, after a lecture PDF stopped opening: 「我不知道是文件被我转移了之后路径失效无法打开了……
//! 还是 spool 储存的路径丢失……需要标清楚文件是被删除的还是 spool 自己的错误」. It had been moved
//! into a folder on the Desktop; Spool knew only the path. Now every file carries the identity
//! the system recognises it by (`file_identity.rs`, column `attachments.target_identity`), and
//! each look sorts it into one state:
//!
//!   in_place — at the recorded path (an identity is recorded on the spot if there was none);
//!   moved    — the identity found it elsewhere, and Spool followed: the path is the new one;
//!   held     — found elsewhere, NOT followed: see `look` (a place AI proposals may not reach);
//!   trash    — found, in the Trash / Recycle Bin;
//!   offline  — on a disk that is not connected;
//!   deleted  — it had an identity, and the system no longer knows the file;
//!   unknown  — attached before v33 (no identity) and not at its path: only its name is left,
//!              so the user is shown the files Spotlight finds by that exact name.
//!
//! Spool changes the recorded path in only two cases: the user said so (「是这个」/「重新选位置」,
//! `relocate`), or the identity found the file somewhere new. ⛔ Never from a name alone.
//! ⛔ The user's file itself is never moved, copied, written or deleted — only looked at.
//! ⛔ No sweep of the whole library: only the files of what is on screen are looked at.

use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::file_identity::{self, Resolved};
use crate::mcp::{path_gate_rules, path_gate_stop, PathGateRules};

/// What the user still has to hear about a file — `attachments.target_notice`, as JSON.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Notice {
    /// Spool followed it to a new place and the user has not looked yet. `from` is the path
    /// the user last knew: moved twice before they look, it is still the first one.
    Moved { from: String },
    /// The user has seen that it is gone and asked not to be told again. Cleared on its own
    /// the moment the file is found again.
    Dismissed,
}

fn read_notice(raw: Option<&str>) -> Option<Notice> {
    serde_json::from_str(raw?).ok()
}

fn write_notice(n: &Notice) -> String {
    serde_json::to_string(n).unwrap_or_default()
}

/// One file, as the right rail and the export list are told about it.
#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileState {
    pub id: String,
    pub state: &'static str,
    /// The path Spool records for it now — after a follow, the new one.
    pub path: String,
    /// `trash`: where it sits in the Trash. `held`: where it was found.
    pub found_at: Option<String>,
    /// `target_notice` as it stands after this look (the JSON text).
    pub notice: Option<String>,
}

struct Row {
    target: String,
    kind: String,
    identity: Option<Vec<u8>>,
    notice: Option<String>,
    ai_access: bool,
}

fn read_row(conn: &Connection, id: &str) -> Result<Option<Row>, String> {
    conn.query_row(
        "SELECT target, kind, target_identity, target_notice, ai_access FROM attachments WHERE id = ?1",
        [id],
        |r| {
            Ok(Row {
                target: r.get(0)?,
                kind: r.get(1)?,
                identity: r.get(2)?,
                notice: r.get(3)?,
                ai_access: r.get::<_, i64>(4)? == 1,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())
}

fn path_text(p: &Path) -> String {
    p.to_string_lossy().into_owned()
}

fn file_name_of(p: &str) -> String {
    Path::new(p).file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default()
}

/// The new path's name, written into `label` only where the label is still the old path's file
/// name: the picker and a Finder drop store the file name as the label, so a file renamed in
/// Finder would otherwise keep showing its old name. A name the user typed is left alone.
/// `old` / `new` are the statement's parameter numbers for the two names.
fn follow_label(old: usize, new: usize) -> String {
    format!("label = CASE WHEN label = ?{old} THEN ?{new} ELSE label END")
}

/// Where a file is now — the decision a look makes, before anything is written down.
enum Where {
    InPlace,
    Offline,
    Unknown,
    Deleted,
    Trash(std::path::PathBuf),
    Held(std::path::PathBuf),
    Moved(std::path::PathBuf),
}

/// ⚠️ `Held`: the P6 path gate (hidden folders, system folders, `~/Library`) is about paths an
/// AI PROPOSES; a file the user attached is followed without it. The one case the taskbook
/// stops at (第 3 条「有例外要停下来问」) is a file AI may read landing somewhere that gate
/// keeps AI out of when it was not there before — following it would hand that path to the AI
/// without anyone choosing it. Until Ocean decides, such a file is NOT followed: it is shown
/// where it was found, and one click (「是这个」 → `relocate`) follows it.
fn where_now(
    path: &Path,
    identity: Option<&[u8]>,
    ai_access: bool,
    rules: Option<&PathGateRules>,
) -> Where {
    if path.exists() {
        return Where::InPlace;
    }
    // ⚠️ Before the identity: an unplugged disk is not a deleted file, and resolving a bookmark
    // into a disk that is not there would answer 「删掉了」.
    if file_identity::disk_offline(path) {
        return Where::Offline;
    }
    let Some(identity) = identity.filter(|i| file_identity::usable(i)) else {
        return Where::Unknown;
    };
    let found = match file_identity::resolve(identity) {
        Resolved::Gone => return Where::Deleted,
        Resolved::At(p) => p,
    };
    if file_identity::in_trash(&found) {
        // Not followed: it is gone from where the user keeps things. 「放回原处」 brings it
        // back to the recorded path, and the next look finds it in place.
        return Where::Trash(found);
    }
    if let Some(rules) = rules {
        let gated = |p: &Path| path_gate_stop(p, rules).is_some();
        if ai_access && gated(&found) && !gated(path) {
            return Where::Held(found);
        }
    }
    Where::Moved(found)
}

/// A file as an AI is told about it (get_blocks, search_blocks): the same look, made without
/// writing — the MCP server opens the library read-only, and the GUI writes the follow down
/// the next time it shows the file. Until then the library still holds the old path, and an
/// AI handed it told Ocean fourteen moved files were lost (2026-10-15).
pub(crate) struct Seen {
    /// Where the file is now: after a move, the new path; otherwise the recorded one.
    pub path: String,
    /// Follows a rename the way `look` does (`follow_label`): only a label that was the old name.
    pub label: String,
    /// `look`'s state names, minus `moved` (that one comes back as `in_place` at its new path).
    pub state: &'static str,
}

pub(crate) fn seen(
    target: &str,
    label: &str,
    identity: Option<&[u8]>,
    ai_access: bool,
    rules: Option<&PathGateRules>,
) -> Seen {
    let kept = |state| Seen { path: target.to_string(), label: label.to_string(), state };
    match where_now(Path::new(target), identity, ai_access, rules) {
        Where::InPlace => kept("in_place"),
        Where::Offline => kept("offline"),
        Where::Unknown => kept("unknown"),
        Where::Deleted => kept("deleted"),
        Where::Trash(_) => kept("trash"),
        // ⛔ Not the found path: that is the place AI is kept out of.
        Where::Held(_) => kept("held"),
        Where::Moved(found) => {
            let path = path_text(&found);
            let label = if label == file_name_of(target) { file_name_of(&path) } else { label.to_string() };
            Seen { path, label, state: "in_place" }
        }
    }
}

/// Look at one file and write down what the look learnt (a first identity, a follow, a
/// 「确认过」 that no longer holds). None when there is no such file in the library.
pub(crate) fn look(
    conn: &Connection,
    id: &str,
    rules: Option<&PathGateRules>,
) -> Result<Option<FileState>, String> {
    let Some(row) = read_row(conn, id)? else { return Ok(None) };
    let path = Path::new(&row.target);
    let notice = read_notice(row.notice.as_deref());
    let identity = row.identity.as_deref().filter(|i| file_identity::usable(i));
    let state = |state: &'static str, found_at: Option<String>, notice: Option<String>| FileState {
        id: id.to_string(),
        state,
        path: row.target.clone(),
        found_at,
        notice,
    };

    let found = match where_now(path, identity, row.ai_access, rules) {
        Where::InPlace => {
            // Recorded on first sight for a file from before v33 (or one the identity no longer
            // describes — rewritten by an editor, or a different file put at that path).
            let fresh = match identity {
                Some(i) if file_identity::matches(path, i) => None,
                _ => file_identity::record(path),
            };
            let found_again = notice == Some(Notice::Dismissed);
            let notice_after = if found_again { None } else { row.notice.clone() };
            if fresh.is_some() || found_again {
                conn.execute(
                    "UPDATE attachments SET target_identity = COALESCE(?1, target_identity), target_notice = ?2 WHERE id = ?3",
                    params![fresh, notice_after, id],
                )
                .map_err(|e| e.to_string())?;
            }
            return Ok(Some(state("in_place", None, notice_after)));
        }
        Where::Offline => return Ok(Some(state("offline", None, row.notice.clone()))),
        Where::Unknown => return Ok(Some(state("unknown", None, row.notice.clone()))),
        Where::Deleted => return Ok(Some(state("deleted", None, row.notice.clone()))),
        Where::Trash(p) => return Ok(Some(state("trash", Some(path_text(&p)), row.notice.clone()))),
        Where::Held(p) => return Ok(Some(state("held", Some(path_text(&p)), row.notice.clone()))),
        Where::Moved(p) => p,
    };
    let from = match notice {
        Some(Notice::Moved { from }) => from,
        _ => row.target.clone(),
    };
    let moved = write_notice(&Notice::Moved { from });
    let new_path = path_text(&found);
    // Same file, so the extracted text stays as it is (⛔ not extracted again).
    conn.execute(
        &format!(
            "UPDATE attachments SET target = ?1, target_identity = COALESCE(?2, target_identity), target_notice = ?3, {} WHERE id = ?4",
            follow_label(5, 6)
        ),
        params![
            new_path,
            file_identity::record(&found),
            moved,
            id,
            file_name_of(&row.target),
            file_name_of(&new_path)
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(Some(FileState {
        id: id.to_string(),
        state: "moved",
        path: new_path,
        found_at: None,
        notice: Some(moved),
    }))
}

/// The user said where the file is (「是这个」 on a file Spotlight found, or 「重新选位置」):
/// record that path and its identity, and clear whatever was pending to say about it.
/// Refused: nothing there (`missing`), or a folder for a file / a file for a folder (`wrong_kind`).
pub(crate) fn relocate(conn: &Connection, id: &str, new_path: &str) -> Result<FileState, String> {
    let row = read_row(conn, id)?.ok_or_else(|| "no_file".to_string())?;
    let p = Path::new(new_path);
    let meta = std::fs::metadata(p).map_err(|_| "missing".to_string())?;
    if (row.kind == "folder") != meta.is_dir() {
        return Err("wrong_kind".into());
    }
    conn.execute(
        &format!(
            "UPDATE attachments SET target = ?1, target_identity = ?2, target_notice = NULL, {} WHERE id = ?3",
            follow_label(4, 5)
        ),
        params![new_path, file_identity::record(p), id, file_name_of(&row.target), file_name_of(new_path)],
    )
    .map_err(|e| e.to_string())?;
    Ok(FileState {
        id: id.to_string(),
        state: "in_place",
        path: new_path.to_string(),
        found_at: None,
        notice: None,
    })
}

/// A file Spotlight found under the same name (第 58 条: Spool shows them, the user picks).
#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Candidate {
    pub path: String,
    pub bytes: u64,
    pub modified_ms: i64,
}

/// The Spotlight query for exactly this file name.
///
/// ⚠️ `kMDItemFSName == "<name>"` alone misses names with Chinese in them — measured
/// 2026-10-10 on 「Fall_2027_美国申研完整方案_2026-08-07.pdf」: 0 hits, where
/// `kMDItemDisplayName ==` finds all four copies (wildcards on FSName do match, the plain
/// equality does not). The display name in turn drops the extension when Finder hides it,
/// so the query asks all three ways and `same_name` keeps only an exact file name.
/// In that language `*` is a wildcard and `"` / `\` end or escape the string: all escaped.
pub(crate) fn spotlight_query(name: &str) -> String {
    let quote = |s: &str| {
        let escaped = s.replace('\\', "\\\\").replace('"', "\\\"").replace('*', "\\*");
        format!("\"{escaped}\"")
    };
    let mut q = format!("kMDItemFSName == {n} || kMDItemDisplayName == {n}", n = quote(name));
    if let Some(stem) = Path::new(name).file_stem().map(|s| s.to_string_lossy()) {
        if stem != name {
            q.push_str(&format!(" || kMDItemDisplayName == {}", quote(&stem)));
        }
    }
    q
}

/// Every file (or folder, for a folder) named exactly `name` that Spotlight knows, newest
/// first. Left out: anything in the Trash (the user threw it away), the recorded path itself,
/// anything gone between the search and the look.
fn same_name(name: &str, folder: bool, recorded: &Path) -> Vec<Candidate> {
    let paths = spotlight(name);
    let mut out: Vec<Candidate> = paths
        .iter()
        .map(Path::new)
        .filter(|p| p.file_name().is_some_and(|n| n == name))
        .filter(|p| *p != recorded && !file_identity::in_trash(p))
        .filter_map(|p| {
            let m = std::fs::metadata(p).ok()?;
            if m.is_dir() != folder {
                return None;
            }
            let modified_ms = m
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as i64)
                .unwrap_or(0);
            Some(Candidate { path: path_text(p), bytes: if folder { 0 } else { m.len() }, modified_ms })
        })
        .collect();
    out.sort_by(|a, b| b.modified_ms.cmp(&a.modified_ms).then_with(|| a.path.cmp(&b.path)));
    out.dedup_by(|a, b| a.path == b.path);
    out
}

#[cfg(target_os = "macos")]
fn spotlight(name: &str) -> Vec<String> {
    // `-0`: one path per NUL, so a name with a line break in it cannot split into two.
    match std::process::Command::new("/usr/bin/mdfind").arg("-0").arg(spotlight_query(name)).output() {
        Ok(out) if out.status.success() => String::from_utf8_lossy(&out.stdout)
            .split('\0')
            .filter(|s| !s.is_empty())
            .map(str::to_string)
            .collect(),
        _ => Vec::new(),
    }
}

/// No Spotlight: the UI offers only 「重新选位置」 (the taskbook's 「做不到想其他办法」).
#[cfg(not(target_os = "macos"))]
fn spotlight(_name: &str) -> Vec<String> {
    Vec::new()
}

pub(crate) fn find_same_name_in(conn: &Connection, id: &str) -> Result<Vec<Candidate>, String> {
    let row = read_row(conn, id)?.ok_or_else(|| "no_file".to_string())?;
    let recorded = Path::new(&row.target);
    let Some(name) = recorded.file_name().map(|n| n.to_string_lossy().into_owned()) else {
        return Ok(Vec::new());
    };
    Ok(same_name(&name, row.kind == "folder", recorded))
}

/// P9H-2 (DISCOVERED-20261010-6) — a file's two v33 columns as they were, carried through an
/// undo. Deleting a block with 「一起从项目里去掉」 deletes its files' rows, and ⌘Z puts them back
/// from the webview — whose SQL plugin cannot carry a BLOB. So the identity rides in the undo
/// entry as hex, and only this side turns it back into bytes. Without it a file that had moved
/// came back as 「不知道挪到哪了」, and 「知道了」 had to be pressed again.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct KeptIdentity {
    pub id: String,
    /// `target_identity` as hex; None = it had none yet.
    pub identity: Option<String>,
    pub notice: Option<String>,
}

fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn from_hex(s: &str) -> Result<Vec<u8>, String> {
    if !s.len().is_multiple_of(2) {
        return Err("bad_identity".into());
    }
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(s.get(i..i + 2).ok_or("bad_identity")?, 16).map_err(|_| "bad_identity".to_string()))
        .collect()
}

/// Before the rows go. Unknown ids are left out.
pub(crate) fn keep_identities(conn: &Connection, ids: &[String]) -> Result<Vec<KeptIdentity>, String> {
    let mut out = Vec::with_capacity(ids.len());
    for id in ids {
        let row: Option<(Option<Vec<u8>>, Option<String>)> = conn
            .query_row(
                "SELECT target_identity, target_notice FROM attachments WHERE id = ?1",
                [id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()
            .map_err(|e| e.to_string())?;
        if let Some((identity, notice)) = row {
            out.push(KeptIdentity { id: id.clone(), identity: identity.map(|b| to_hex(&b)), notice });
        }
    }
    Ok(out)
}

/// After the rows are back (the webview re-inserts the other columns).
pub(crate) fn restore_identities(conn: &Connection, kept: &[KeptIdentity]) -> Result<(), String> {
    for k in kept {
        let bytes = k.identity.as_deref().map(from_hex).transpose()?;
        conn.execute(
            "UPDATE attachments SET target_identity = ?1, target_notice = ?2 WHERE id = ?3",
            params![bytes, k.notice, k.id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ⚠️ All of these `(async)`: they stat, resolve bookmarks, run Spotlight and write the library —
// ⛔ never on the main thread (a resolve against a slow disk would freeze the whole window).

/// P9H-2: see `KeptIdentity`.
#[tauri::command(async)]
pub fn keep_file_identities(app: tauri::AppHandle, ids: Vec<String>) -> Result<Vec<KeptIdentity>, String> {
    let conn = crate::images::open_library(&app)?;
    keep_identities(&conn, &ids)
}

/// P9H-2: see `KeptIdentity`.
#[tauri::command(async)]
pub fn restore_file_identities(app: tauri::AppHandle, kept: Vec<KeptIdentity>) -> Result<(), String> {
    let conn = crate::images::open_library(&app)?;
    restore_identities(&conn, &kept)
}

/// Look at these files (the right rail of the project on screen, a file about to be opened,
/// the export list) and say where each one is. Unknown ids are left out.
#[tauri::command(async)]
pub fn locate_files(app: tauri::AppHandle, ids: Vec<String>) -> Result<Vec<FileState>, String> {
    let conn = crate::images::open_library(&app)?;
    let rules = path_gate_rules();
    let mut out = Vec::with_capacity(ids.len());
    for id in &ids {
        if let Some(s) = look(&conn, id, rules.as_ref())? {
            out.push(s);
        }
    }
    Ok(out)
}

/// 「找一找」: files with exactly this file's name, for the user to pick from. Empty off macOS.
#[tauri::command(async)]
pub fn find_same_name(app: tauri::AppHandle, id: String) -> Result<Vec<Candidate>, String> {
    let conn = crate::images::open_library(&app)?;
    find_same_name_in(&conn, &id)
}

/// 「是这个」 / 「重新选位置」.
#[tauri::command(async)]
pub fn relocate_file(app: tauri::AppHandle, id: String, path: String) -> Result<FileState, String> {
    let conn = crate::images::open_library(&app)?;
    relocate(&conn, &id, &path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn temp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("spool-follow-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        d.canonicalize().unwrap()
    }

    fn library() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE attachments (
               id TEXT PRIMARY KEY, thread_id TEXT, kind TEXT NOT NULL, target TEXT NOT NULL,
               label TEXT NOT NULL DEFAULT '', extracted_text TEXT, ai_access INTEGER NOT NULL DEFAULT 0,
               target_identity BLOB, target_notice TEXT
             );",
        )
        .unwrap();
        conn
    }

    /// Labelled the way the picker and a Finder drop label a file: with its own name.
    fn attach(conn: &Connection, id: &str, kind: &str, target: &Path) {
        conn.execute(
            "INSERT INTO attachments (id, thread_id, kind, target, label, extracted_text) VALUES (?1, 't', ?2, ?3, ?4, 'the text')",
            params![id, kind, path_text(target), file_name_of(&path_text(target))],
        )
        .unwrap();
    }

    fn label(conn: &Connection, id: &str) -> String {
        conn.query_row("SELECT label FROM attachments WHERE id = ?1", [id], |r| r.get(0)).unwrap()
    }

    fn row(conn: &Connection, id: &str) -> (String, Option<Vec<u8>>, Option<String>, String) {
        conn.query_row(
            "SELECT target, target_identity, target_notice, extracted_text FROM attachments WHERE id = ?1",
            [id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .unwrap()
    }

    fn state_of(conn: &Connection, id: &str) -> FileState {
        look(conn, id, None).unwrap().unwrap()
    }

    #[test]
    fn in_place_records_an_identity_on_first_sight_and_then_leaves_the_row_alone() {
        let d = temp("inplace");
        let f = d.join("Lecture 4.pdf");
        std::fs::write(&f, b"%PDF").unwrap();
        let conn = library();
        attach(&conn, "a", "file", &f);
        assert_eq!(row(&conn, "a").1, None);

        let s = state_of(&conn, "a");
        assert_eq!((s.state, s.path.as_str(), s.notice), ("in_place", path_text(&f).as_str(), None));
        let first = row(&conn, "a").1;
        if cfg!(any(target_os = "macos", windows)) {
            assert!(first.is_some(), "a file from before v33 gets its identity the first time it is seen");
        }
        assert_eq!(state_of(&conn, "a").state, "in_place");
        assert_eq!(row(&conn, "a").1, first, "nothing rewritten when nothing changed");
        let _ = std::fs::remove_dir_all(&d);
    }

    #[cfg(any(target_os = "macos", windows))]
    #[test]
    fn a_moved_or_renamed_file_is_followed_and_the_old_path_kept_for_the_user() {
        let d = temp("moved");
        let f = d.join("Lecture 3 - Introduction to Natural Language Processing for HAI - 2.pdf");
        std::fs::write(&f, b"%PDF").unwrap();
        let conn = library();
        attach(&conn, "a", "file", &f);
        state_of(&conn, "a");
        let before = row(&conn, "a").1.unwrap();

        std::fs::create_dir(d.join("HAI")).unwrap();
        let moved = d.join("HAI").join("Lecture 3.pdf");
        std::fs::rename(&f, &moved).unwrap();

        let s = state_of(&conn, "a");
        assert_eq!((s.state, s.path.clone()), ("moved", path_text(&moved)));
        let (target, identity, notice, text) = row(&conn, "a");
        assert_eq!(target, path_text(&moved));
        assert!(identity.is_some());
        assert_ne!(identity.unwrap(), before, "a fresh identity, recorded at the new place");
        assert_eq!(read_notice(notice.as_deref()), Some(Notice::Moved { from: path_text(&f) }));
        assert_eq!(text, "the text", "same file: the extracted text is not touched");
        let label: String = conn.query_row("SELECT label FROM attachments WHERE id = 'a'", [], |r| r.get(0)).unwrap();
        assert_eq!(label, "Lecture 3.pdf", "the label was the old file name, so it follows the rename");

        // Moved again before the user looked: the mark still says where they last knew it.
        let again = d.join("Lecture 3 (final).pdf");
        std::fs::rename(&moved, &again).unwrap();
        assert_eq!(state_of(&conn, "a").state, "moved");
        assert_eq!(read_notice(row(&conn, "a").2.as_deref()), Some(Notice::Moved { from: path_text(&f) }));

        // And the next look finds it in place, mark still there until the user clicks it.
        let s = state_of(&conn, "a");
        assert_eq!(s.state, "in_place");
        assert!(s.notice.is_some());
        let _ = std::fs::remove_dir_all(&d);
    }

    #[cfg(any(target_os = "macos", windows))]
    #[test]
    fn deleted_trash_and_unknown_are_told_apart_and_nothing_is_followed() {
        let d = temp("gone");
        let conn = library();

        let deleted = d.join("deleted.pdf");
        std::fs::write(&deleted, b"x").unwrap();
        attach(&conn, "del", "file", &deleted);
        state_of(&conn, "del");
        std::fs::remove_file(&deleted).unwrap();
        assert_eq!(state_of(&conn, "del").state, "deleted");
        assert_eq!(row(&conn, "del").0, path_text(&deleted), "the recorded path is kept");

        // A `.Trashes` folder is what a Trash looks like on any disk but the start-up one, so
        // this is the whole trash path without putting anything in the user's own Trash.
        let trashed = d.join("trashed.pdf");
        std::fs::write(&trashed, b"x").unwrap();
        attach(&conn, "tr", "file", &trashed);
        state_of(&conn, "tr");
        std::fs::create_dir_all(d.join(".Trashes/501")).unwrap();
        let in_trash = d.join(".Trashes/501/trashed.pdf");
        std::fs::rename(&trashed, &in_trash).unwrap();
        let s = state_of(&conn, "tr");
        assert_eq!((s.state, s.found_at), ("trash", Some(path_text(&in_trash))));
        assert_eq!(row(&conn, "tr").0, path_text(&trashed), "not followed into the Trash");

        // From before v33: no identity, and nothing at the path.
        attach(&conn, "old", "file", &d.join("never-recorded.pdf"));
        assert_eq!(state_of(&conn, "old").state, "unknown");
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn an_unplugged_disk_is_not_a_deleted_file() {
        let conn = library();
        attach(&conn, "a", "file", Path::new("/Volumes/spool-p9-no-such-disk/x.pdf"));
        // Even with an identity on record (one that would no longer resolve).
        conn.execute("UPDATE attachments SET target_identity = X'4D31' WHERE id = 'a'", []).unwrap();
        let expected = if cfg!(target_os = "macos") { "offline" } else { "unknown" };
        assert_eq!(state_of(&conn, "a").state, expected);
    }

    #[cfg(any(target_os = "macos", windows))]
    #[test]
    fn a_confirmed_loss_clears_itself_when_the_file_is_back() {
        let d = temp("back");
        let f = d.join("a.pdf");
        std::fs::write(&f, b"x").unwrap();
        let conn = library();
        attach(&conn, "a", "file", &f);
        let aside = d.join("aside");
        std::fs::rename(&f, &aside).unwrap();
        conn.execute("UPDATE attachments SET target_notice = '{\"kind\":\"dismissed\"}' WHERE id = 'a'", []).unwrap();
        assert_eq!(state_of(&conn, "a").state, "unknown");
        assert!(row(&conn, "a").2.is_some(), "still confirmed while it is gone");

        std::fs::rename(&aside, &f).unwrap();
        let s = state_of(&conn, "a");
        assert_eq!((s.state, s.notice), ("in_place", None));
        assert_eq!(row(&conn, "a").2, None);
        let _ = std::fs::remove_dir_all(&d);
    }

    #[cfg(any(target_os = "macos", windows))]
    #[test]
    fn an_ai_readable_file_moved_into_a_place_ai_proposals_may_not_reach_is_held_not_followed() {
        let home = temp("held-home");
        std::fs::create_dir_all(home.join("Desktop")).unwrap();
        std::fs::create_dir_all(home.join("Library/Caches")).unwrap();
        let rules = PathGateRules {
            home: home.clone(),
            system_roots: vec![],
            home_private: "Library",
            home_private_open: &[],
        };
        let f = home.join("Desktop/a.pdf");
        std::fs::write(&f, b"x").unwrap();
        let conn = library();
        attach(&conn, "a", "file", &f);
        conn.execute("UPDATE attachments SET ai_access = 1 WHERE id = 'a'", []).unwrap();
        look(&conn, "a", Some(&rules)).unwrap();
        let hidden = home.join("Library/Caches/a.pdf");
        std::fs::rename(&f, &hidden).unwrap();

        let s = look(&conn, "a", Some(&rules)).unwrap().unwrap();
        assert_eq!((s.state, s.found_at), ("held", Some(path_text(&hidden))));
        assert_eq!(row(&conn, "a").0, path_text(&f));

        // Not readable by AI: followed like any other file.
        conn.execute("UPDATE attachments SET ai_access = 0 WHERE id = 'a'", []).unwrap();
        assert_eq!(look(&conn, "a", Some(&rules)).unwrap().unwrap().state, "moved");
        let _ = std::fs::remove_dir_all(&home);
    }

    // 2026-10-15: what the MCP server reports. It has no connection to write with, so the
    // follow it reports is the GUI's to write down later.
    #[cfg(any(target_os = "macos", windows))]
    #[test]
    fn seen_reports_where_a_file_is_now_and_never_the_place_ai_is_kept_out_of() {
        let home = temp("seen-home");
        std::fs::create_dir_all(home.join("Desktop/dissertation-doc/Ethic")).unwrap();
        std::fs::create_dir_all(home.join("Library/Caches")).unwrap();
        let f = home.join("Desktop/CS_REC_1.docx");
        std::fs::write(&f, b"x").unwrap();
        let old = path_text(&f);
        let identity = file_identity::record(&f);
        let rules = PathGateRules {
            home: home.clone(),
            system_roots: vec![],
            home_private: "Library",
            home_private_open: &[],
        };
        let seen_now = |label: &str| seen(&old, label, identity.as_deref(), true, Some(&rules));

        let s = seen_now("CS_REC_1.docx");
        assert_eq!((s.path.as_str(), s.state), (old.as_str(), "in_place"));

        let moved = home.join("Desktop/dissertation-doc/Ethic/CS_REC_1.docx");
        std::fs::rename(&f, &moved).unwrap();
        let s = seen_now("CS_REC_1.docx");
        assert_eq!((s.path, s.label, s.state), (path_text(&moved), "CS_REC_1.docx".to_string(), "in_place"));

        let renamed = home.join("Desktop/dissertation-doc/Ethic/伦理申请表.docx");
        std::fs::rename(&moved, &renamed).unwrap();
        assert_eq!(seen_now("CS_REC_1.docx").label, "伦理申请表.docx", "the label was the old file name");
        assert_eq!(seen_now("第一张表").label, "第一张表", "a name the user typed stays");

        let hidden = home.join("Library/Caches/伦理申请表.docx");
        std::fs::rename(&renamed, &hidden).unwrap();
        let s = seen_now("CS_REC_1.docx");
        assert_eq!((s.path.as_str(), s.state), (old.as_str(), "held"), "the gated path is not handed out");

        std::fs::remove_file(&hidden).unwrap();
        let s = seen_now("CS_REC_1.docx");
        assert_eq!((s.path.as_str(), s.state), (old.as_str(), "deleted"));
        let _ = std::fs::remove_dir_all(&home);
    }

    #[test]
    fn relocating_records_the_chosen_path_and_clears_the_notice() {
        let d = temp("relocate");
        let picked = d.join("picked.pdf");
        std::fs::write(&picked, b"x").unwrap();
        let conn = library();
        attach(&conn, "a", "file", &d.join("gone.pdf"));
        conn.execute("UPDATE attachments SET target_notice = '{\"kind\":\"dismissed\"}' WHERE id = 'a'", []).unwrap();

        let s = relocate(&conn, "a", &path_text(&picked)).unwrap();
        assert_eq!((s.state, s.path.clone()), ("in_place", path_text(&picked)));
        let (target, identity, notice, text) = row(&conn, "a");
        assert_eq!(target, path_text(&picked));
        assert_eq!(identity.is_some(), cfg!(any(target_os = "macos", windows)));
        assert_eq!(notice, None);
        assert_eq!(text, "the text");

        assert_eq!(label(&conn, "a"), "picked.pdf", "the label was the old file name");

        // A name the user typed stays whatever the file is called.
        conn.execute("UPDATE attachments SET label = '第三讲讲义' WHERE id = 'a'", []).unwrap();
        let other = d.join("other.pdf");
        std::fs::write(&other, b"y").unwrap();
        relocate(&conn, "a", &path_text(&other)).unwrap();
        assert_eq!(label(&conn, "a"), "第三讲讲义");

        assert_eq!(relocate(&conn, "a", &path_text(&d)).unwrap_err(), "wrong_kind");
        assert_eq!(relocate(&conn, "a", &path_text(&d.join("nope.pdf"))).unwrap_err(), "missing");
        assert_eq!(relocate(&conn, "zz", &path_text(&picked)).unwrap_err(), "no_file");
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn notices_are_the_two_json_shapes_the_ui_reads() {
        assert_eq!(write_notice(&Notice::Dismissed), r#"{"kind":"dismissed"}"#);
        assert_eq!(
            write_notice(&Notice::Moved { from: "/Users/x/Desktop/a.pdf".into() }),
            r#"{"kind":"moved","from":"/Users/x/Desktop/a.pdf"}"#
        );
        assert_eq!(read_notice(Some("not json")), None);
        assert_eq!(read_notice(None), None);
    }

    #[test]
    fn the_spotlight_query_matches_the_whole_name_and_escapes_what_would_break_it() {
        assert_eq!(
            spotlight_query("Fall_2027_美国申研完整方案_2026-08-07.pdf"),
            r#"kMDItemFSName == "Fall_2027_美国申研完整方案_2026-08-07.pdf" || kMDItemDisplayName == "Fall_2027_美国申研完整方案_2026-08-07.pdf" || kMDItemDisplayName == "Fall_2027_美国申研完整方案_2026-08-07""#
        );
        assert_eq!(
            spotlight_query(r#"a"b\c*.pdf"#),
            r#"kMDItemFSName == "a\"b\\c\*.pdf" || kMDItemDisplayName == "a\"b\\c\*.pdf" || kMDItemDisplayName == "a\"b\\c\*""#
        );
        // A folder, or a file with no extension: nothing to add.
        assert_eq!(spotlight_query("notes"), r#"kMDItemFSName == "notes" || kMDItemDisplayName == "notes""#);
    }

    /// Spotlight indexes new files after a delay of seconds to minutes, and not every folder
    /// at all, so this is not in the default run. By hand:
    ///   cargo test --manifest-path src-tauri/Cargo.toml -- --ignored spotlight_finds_every_file
    #[cfg(target_os = "macos")]
    #[test]
    #[ignore = "Spotlight 收录新文件要几秒到几分钟，不进默认的一遍；手动跑 -- --ignored"]
    fn spotlight_finds_every_file_with_the_same_name() {
        let base = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("target").join("spool-p9-spotlight");
        let _ = std::fs::remove_dir_all(&base);
        let name = format!("spool-p9-同名-{}.pdf", std::process::id());
        for sub in ["one", "two"] {
            std::fs::create_dir_all(base.join(sub)).unwrap();
            std::fs::write(base.join(sub).join(&name), sub.as_bytes()).unwrap();
        }
        let recorded = base.join("gone").join(&name);
        let mut found = Vec::new();
        for _ in 0..240 {
            found = same_name(&name, false, &recorded);
            if found.len() == 2 {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(500));
        }
        let _ = std::fs::remove_dir_all(&base);
        let mut paths: Vec<String> = found.iter().map(|c| c.path.clone()).collect();
        paths.sort();
        assert_eq!(
            paths,
            vec![
                path_text(&base.join("one").join(&name)),
                path_text(&base.join("two").join(&name)),
            ],
            "Spotlight had not indexed both files after 2 minutes"
        );
    }

    // P9H-2 (DISCOVERED-20261010-6): delete a block with 「一起去掉」 → ⌘Z. The webview re-inserts
    // the row without these two columns (its SQL plugin cannot carry the BLOB); they ride in the
    // undo entry as hex and come back byte for byte.
    #[test]
    fn kept_identities_come_back_byte_for_byte_after_the_row_is_reinserted() {
        let conn = library();
        // Zeros, 0x80 and 0xff — where a trip through text would break.
        let identity: Vec<u8> = vec![0x62, 0x6f, 0x6f, 0x6b, 0x00, 0x00, 0xff, 0x10, 0x7f, 0x80, 0x00, 0x01];
        let notice = write_notice(&Notice::Dismissed);
        conn.execute(
            "INSERT INTO attachments (id, thread_id, kind, target, extracted_text, target_identity, target_notice)
             VALUES ('a', 't', 'file', '/x/方案.pdf', 'the text', ?1, ?2), ('b', 't', 'file', '/x/旧.pdf', 'the text', NULL, NULL)",
            params![identity, notice],
        )
        .unwrap();
        let before = (row(&conn, "a"), row(&conn, "b"));

        let ids = vec!["a".to_string(), "b".to_string(), "gone".to_string()];
        let kept = keep_identities(&conn, &ids).unwrap();
        assert_eq!(kept.len(), 2, "an id with no row is left out");
        assert_eq!(kept[0].identity.as_deref(), Some("626f6f6b0000ff107f800001"));
        assert_eq!(kept[1], KeptIdentity { id: "b".into(), identity: None, notice: None });

        // The delete, then the webview's re-insert: every column but the two.
        conn.execute("DELETE FROM attachments", []).unwrap();
        conn.execute(
            "INSERT INTO attachments (id, thread_id, kind, target, extracted_text)
             VALUES ('a', 't', 'file', '/x/方案.pdf', 'the text'), ('b', 't', 'file', '/x/旧.pdf', 'the text')",
            [],
        )
        .unwrap();
        // Through JSON, as it crosses to the webview and back.
        let kept: Vec<KeptIdentity> = serde_json::from_str(&serde_json::to_string(&kept).unwrap()).unwrap();
        restore_identities(&conn, &kept).unwrap();
        assert_eq!((row(&conn, "a"), row(&conn, "b")), before);
        let kind: String = conn
            .query_row("SELECT typeof(target_identity) FROM attachments WHERE id = 'a'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(kind, "blob");

        assert!(restore_identities(
            &conn,
            &[KeptIdentity { id: "a".into(), identity: Some("abc".into()), notice: None }]
        )
        .is_err());
    }
}
