//! P9Y (Ocean 2026-10-25, HANDOFF §9.2 第 206、208 条; task book
//! `docs/TASKBOOK-P9Y-FOLDER-LINK-SPOOL-PROTOCOL-2026-10-25.md`) — a project linked to a folder on
//! disk: a code repository, a thesis folder, an application folder.
//!
//! What Spool does with the folder, and nothing else:
//!   * lists what is in it (paths, sizes, modified times — never contents), and tells what changed
//!     since the last time the project and the folder were brought in line (the sync cursor);
//!   * reads the one to three 「现状文件」 the user picked — the files that say what is being done
//!     now and how far it has got (a work plan, a hand-off, a README);
//!   * keeps a `SPOOL.md` at the folder's root, telling an AI working in that folder which Spool
//!     projects it belongs to, who is the authority when the two disagree, and when to read and
//!     write back.
//!
//! ⭐ The protocol follows the FOLDER, not the project (task book §3.5): one folder = one row of
//! `folders` = one `SPOOL.md`; every project linked to that folder is written into the same file.
//!
//! ⛔ This is the first place Spool writes into a folder of the user's. It writes four things and
//! only these, each one seen by the user when connecting (task book §3.2, §6):
//!   1. `SPOOL.md` at the folder's root — only between `<!-- spool:begin -->` and
//!      `<!-- spool:end -->`; everything outside the markers is the user's;
//!   2. one line in `.git/info/exclude` (when the user chose 「只留在这台电脑」);
//!   3. one line `@SPOOL.md` at the end of the folder's own CLAUDE.md (only when it exists and the
//!      user ticked it);
//!   4. one line at the end of the folder's own AGENTS.md (same).
//!
//! Every other file in the folder is only looked at. A line is taken back out only while it is
//! still exactly what Spool wrote; a SPOOL.md section the user edited is never overwritten without
//! asking. Backups of anything about to change go to Spool's own data folder, never beside the
//! file (a `.bak` in a repository gets committed by mistake).
//!
//! ⛔ No git program is run (on a Mac without the developer tools, calling git pops an installer):
//! the commit titles come from reading `.git/logs/HEAD` as text. ⛔ No source is read. ⛔ Nothing
//! watches the folder in the background: it is looked at when its project is on screen, or when
//! an AI asks.

use std::collections::{BTreeMap, HashMap, VecDeque};
use std::path::{Path, PathBuf};

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::file_identity::{self, Resolved};
use crate::mcp::Lang;

pub(crate) const PROTOCOL_FILE: &str = "SPOOL.md";
pub(crate) const BEGIN: &str = "<!-- spool:begin -->";
pub(crate) const END: &str = "<!-- spool:end -->";

/// How many files and folders one look may visit, both phases together (task book §3.1).
const MAX_VISIT: usize = 20_000;
/// A folder `.gitignore` leaves out is still searched for documents — Flux keeps its newest plan
/// in the ignored `plans/` — but one that turns out to be big is generated data, not notes
/// (Flux's ignored `data/` holds 32 000 entries, 4 500 of them `.txt`). Past this many entries it
/// is dropped whole and named in `not_listed`.
const IGNORED_DIR_BUDGET: usize = 1_000;
/// Never entered: what tools generate. Names starting with `.` are skipped as well
/// (`.git`, `.venv`, `.env`, `.DS_Store`).
const SKIP_DIRS: [&str; 6] = ["node_modules", "target", "dist", "build", "__pycache__", "venv"];
/// Written for people to read. Listed even where `.gitignore` leaves them out.
const DOC_EXTS: [&str; 6] = ["md", "markdown", "txt", "docx", "pdf", "rtf"];
/// Read straight from the disk by either process. docx / pdf need the GUI's extractor.
const PLAIN_EXTS: [&str; 3] = ["md", "markdown", "txt"];
pub(crate) const MAX_STATE_FILES: usize = 3;
/// What an AI is handed of one state file. The pack inlines a file at the same size.
pub(crate) const STATE_TEXT_CAP: usize = 8_000;

fn ext_of(name: &str) -> String {
    Path::new(name).extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default()
}

pub(crate) fn is_doc(name: &str) -> bool {
    DOC_EXTS.contains(&ext_of(name).as_str())
}

fn is_plain(name: &str) -> bool {
    PLAIN_EXTS.contains(&ext_of(name).as_str())
}

fn has_state_text(name: &str) -> bool {
    is_plain(name) || matches!(ext_of(name).as_str(), "docx" | "pdf")
}

fn join_rel(base: &str, name: &str) -> String {
    if base.is_empty() {
        name.to_string()
    } else {
        format!("{base}/{name}")
    }
}

/// A `/`-separated path inside the folder, as a path on this disk.
fn on_disk(root: &Path, rel: &str) -> PathBuf {
    rel.split('/').filter(|s| !s.is_empty()).fold(root.to_path_buf(), |p, s| p.join(s))
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn mtime_ms(m: &std::fs::Metadata) -> i64 {
    m.modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// A file's size and modified time, as both the extraction stamp (P9Y-c) and the snapshot
/// record them. None when there is no file there.
pub(crate) fn stamp(path: &Path) -> Option<(i64, i64)> {
    let m = std::fs::metadata(path).ok()?;
    m.is_file().then(|| (m.len() as i64, mtime_ms(&m)))
}

/// FNV-1a, 64 bit. A content fingerprint that must read the same in every build of Spool —
/// `DefaultHasher` makes no such promise across Rust releases.
pub(crate) fn fnv64(bytes: &[u8]) -> String {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for b in bytes {
        h ^= u64::from(*b);
        h = h.wrapping_mul(0x0100_0000_01b3);
    }
    format!("{h:016x}")
}

fn fingerprint(path: &Path) -> Option<String> {
    std::fs::read(path).ok().map(|b| fnv64(&b))
}

// ---------------------------------------------------------------------------------------------
// `.gitignore`, the part of it that decides what a listing leaves out.
//
// No crate does this in the dependency tree today, and the one that would (`ignore`) brings a
// dozen more; the subset below is what real `.gitignore` files use: comments, `!` to take a
// pattern back, a trailing `/` for folders only, a `/` inside to tie it to its own folder,
// `*`, `?`, `[…]` and `**`. Rules from `.git/info/exclude` come first and every `.gitignore` after
// it, outer before inner, so — as in git — the last pattern that matches decides.
// ---------------------------------------------------------------------------------------------

struct Rule {
    /// The folder the `.gitignore` sits in, relative to the repository root ("" = the root).
    base: String,
    neg: bool,
    dir_only: bool,
    /// Has a `/` before its end: matched against the path from `base`, not just the name.
    anchored: bool,
    pat: Vec<char>,
}

#[derive(Default)]
struct Rules(Vec<Rule>);

impl Rules {
    fn add_text(&mut self, text: &str, base: &str) {
        for raw in text.lines() {
            let mut line = raw.trim_end();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let neg = line.starts_with('!');
            // `!` takes a pattern back; `\!` and `\#` are a literal first character.
            if neg || line.starts_with("\\!") || line.starts_with("\\#") {
                line = &line[1..];
            }
            let dir_only = line.ends_with('/');
            let line = line.trim_end_matches('/');
            if line.is_empty() {
                continue;
            }
            let anchored = line.contains('/');
            let line = line.trim_start_matches('/');
            self.0.push(Rule { base: base.to_string(), neg, dir_only, anchored, pat: line.chars().collect() });
        }
    }

    fn add_file(&mut self, file: &Path, base: &str) {
        if let Ok(text) = std::fs::read_to_string(file) {
            self.add_text(&text, base);
        }
    }

    /// `path` is relative to the repository root, `/`-separated.
    fn ignored(&self, path: &str, is_dir: bool) -> bool {
        let mut out = false;
        for r in &self.0 {
            if r.dir_only && !is_dir {
                continue;
            }
            let sub = if r.base.is_empty() {
                path
            } else {
                match path.strip_prefix(r.base.as_str()).and_then(|s| s.strip_prefix('/')) {
                    Some(s) => s,
                    None => continue,
                }
            };
            let target: Vec<char> = if r.anchored {
                sub.chars().collect()
            } else {
                sub.rsplit('/').next().unwrap_or(sub).chars().collect()
            };
            if glob(&r.pat, &target) {
                out = !r.neg;
            }
        }
        out
    }
}

/// `*` and `?` stop at `/`; `**` does not, and `**/` also matches no folder at all.
fn glob(p: &[char], s: &[char]) -> bool {
    match p.first() {
        None => s.is_empty(),
        Some('*') if p.get(1) == Some(&'*') => {
            let rest = &p[2..];
            if rest.first() == Some(&'/') && glob(&rest[1..], s) {
                return true;
            }
            (0..=s.len()).any(|i| glob(rest, &s[i..]))
        }
        Some('*') => {
            let rest = &p[1..];
            for i in 0..=s.len() {
                if glob(rest, &s[i..]) {
                    return true;
                }
                if i < s.len() && s[i] == '/' {
                    break;
                }
            }
            false
        }
        Some('?') => !s.is_empty() && s[0] != '/' && glob(&p[1..], &s[1..]),
        Some('[') => match p.iter().skip(1).position(|c| *c == ']') {
            // `[]` and an unclosed `[` are a literal bracket.
            Some(end) if end > 0 => {
                let class = &p[1..=end];
                let (negated, class) = match class.first() {
                    Some('!') | Some('^') => (true, &class[1..]),
                    _ => (false, class),
                };
                let Some(&c) = s.first() else { return false };
                if c == '/' {
                    return false;
                }
                let mut hit = false;
                let mut i = 0;
                while i < class.len() {
                    if i + 2 < class.len() && class[i + 1] == '-' {
                        hit |= class[i] <= c && c <= class[i + 2];
                        i += 3;
                    } else {
                        hit |= class[i] == c;
                        i += 1;
                    }
                }
                hit != negated && glob(&p[end + 2..], &s[1..])
            }
            _ => !s.is_empty() && s[0] == '[' && glob(&p[1..], &s[1..]),
        },
        Some('\\') if p.len() > 1 => !s.is_empty() && s[0] == p[1] && glob(&p[2..], &s[1..]),
        Some(c) => !s.is_empty() && s[0] == *c && glob(&p[1..], &s[1..]),
    }
}

// ---------------------------------------------------------------------------------------------
// The repository the folder is in, if any — found by its `.git`, read as files.
// ---------------------------------------------------------------------------------------------

pub(crate) struct Repo {
    /// The folder holding `.git`: the linked folder itself, or one above it.
    pub root: PathBuf,
    /// Where this checkout's own files are (`logs/HEAD`): `.git`, or what a `.git` file points at.
    git_dir: PathBuf,
    /// Where the shared ones are (`info/exclude`): the same, except in a linked worktree.
    common_dir: PathBuf,
}

impl Repo {
    pub(crate) fn find(folder: &Path) -> Option<Repo> {
        let home = home_dir();
        for dir in folder.ancestors() {
            // A home folder kept under git (dotfiles) is not the repository of every folder in it.
            if dir != folder && home.as_deref() == Some(dir) {
                return None;
            }
            let dot = dir.join(".git");
            let git_dir = if dot.is_dir() {
                dot
            } else if dot.is_file() {
                let text = std::fs::read_to_string(&dot).ok()?;
                let target = text.trim().strip_prefix("gitdir:")?.trim();
                let p = Path::new(target);
                if p.is_absolute() {
                    p.to_path_buf()
                } else {
                    dir.join(p)
                }
            } else {
                continue;
            };
            let common_dir = std::fs::read_to_string(git_dir.join("commondir"))
                .ok()
                .map(|c| git_dir.join(c.trim()))
                .unwrap_or_else(|| git_dir.clone());
            return Some(Repo { root: dir.to_path_buf(), git_dir, common_dir });
        }
        None
    }

    /// The linked folder's path from the repository root, `/`-separated ("" = the root).
    fn prefix(&self, folder: &Path) -> String {
        folder
            .strip_prefix(&self.root)
            .map(|p| p.components().map(|c| c.as_os_str().to_string_lossy()).collect::<Vec<_>>().join("/"))
            .unwrap_or_default()
    }

    fn exclude_path(&self) -> PathBuf {
        self.common_dir.join("info").join("exclude")
    }

    /// The line that keeps this folder's SPOOL.md out of git, tied to its place in the repository.
    pub(crate) fn exclude_line(&self, folder: &Path) -> String {
        let prefix = self.prefix(folder);
        if prefix.is_empty() {
            format!("/{PROTOCOL_FILE}")
        } else {
            format!("/{prefix}/{PROTOCOL_FILE}")
        }
    }

    /// Titles of the commits made in this checkout after `since` (ms), newest first.
    /// ⚠️ Only the title: the reflog line also carries the author's name and e-mail address.
    pub(crate) fn commits_since(&self, since: i64) -> Vec<Commit> {
        let Ok(text) = std::fs::read_to_string(self.git_dir.join("logs").join("HEAD")) else {
            return Vec::new();
        };
        let mut out: Vec<Commit> = text.lines().filter_map(|line| parse_reflog(line, since)).collect();
        out.reverse();
        out.truncate(30);
        out
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Commit {
    pub at: i64,
    pub title: String,
}

fn parse_reflog(line: &str, since: i64) -> Option<Commit> {
    let (meta, msg) = line.split_once('\t')?;
    let secs: i64 = meta.rsplit_once('>')?.1.split_whitespace().next()?.parse().ok()?;
    let at = secs * 1000;
    if at <= since || !msg.starts_with("commit") {
        return None;
    }
    let title = msg.split_once(": ").map(|(_, t)| t).unwrap_or(msg).trim();
    Some(Commit { at, title: title.to_string() })
}

pub(crate) fn home_dir() -> Option<PathBuf> {
    #[cfg(windows)]
    let var = "USERPROFILE";
    #[cfg(not(windows))]
    let var = "HOME";
    std::env::var_os(var).map(PathBuf::from)
}

/// `~/flux` for a folder under the home folder; the whole path otherwise.
pub(crate) fn short_path(path: &str) -> String {
    if let Some(home) = home_dir() {
        if let Ok(rest) = Path::new(path).strip_prefix(&home) {
            let rest = rest.to_string_lossy();
            return if rest.is_empty() { "~".into() } else { format!("~/{rest}") };
        }
    }
    path.to_string()
}

// ---------------------------------------------------------------------------------------------
// Listing.
// ---------------------------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct Entry {
    pub rel: String,
    pub size: i64,
    pub mtime: i64,
}

#[derive(Debug, Default)]
pub(crate) struct Listing {
    /// Sorted by path.
    pub files: Vec<Entry>,
    /// Stopped at MAX_VISIT: what was not reached is not in `files`.
    pub truncated: bool,
    /// Ignored folders too big to search for documents, `data/`.
    pub not_listed: Vec<String>,
}

fn sorted_entries(dir: &Path) -> Vec<std::fs::DirEntry> {
    let mut v: Vec<_> = std::fs::read_dir(dir).map(|rd| rd.flatten().collect()).unwrap_or_default();
    v.sort_by_key(|e| e.file_name());
    v
}

/// What is in the folder (task book §3.1): every file `.gitignore` keeps, every document it does
/// not, nothing hidden, nothing generated, no symbolic link followed (a link can lead out of the
/// folder, or round in a circle).
pub(crate) fn list_folder(root: &Path) -> Listing {
    let repo = Repo::find(root);
    let prefix = repo.as_ref().map(|r| r.prefix(root)).unwrap_or_default();
    let repo_rel = |rel: &str| -> String {
        if prefix.is_empty() {
            rel.to_string()
        } else if rel.is_empty() {
            prefix.clone()
        } else {
            format!("{prefix}/{rel}")
        }
    };
    let mut rules = Rules::default();
    if let Some(r) = &repo {
        rules.add_file(&r.exclude_path(), "");
        // The `.gitignore` files between the repository root and the linked folder.
        let mut dir = r.root.clone();
        let mut base = String::new();
        for part in prefix.split('/').filter(|s| !s.is_empty()) {
            rules.add_file(&dir.join(".gitignore"), &base);
            dir = dir.join(part);
            base = join_rel(&base, part);
        }
    }

    let mut out = Listing::default();
    let mut visited = 0usize;
    let mut ignored_dirs: Vec<(PathBuf, String)> = Vec::new();
    let mut queue = VecDeque::from([(root.to_path_buf(), String::new())]);
    'walk: while let Some((dir, rel)) = queue.pop_front() {
        if repo.is_some() {
            rules.add_file(&dir.join(".gitignore"), &repo_rel(&rel));
        }
        for e in sorted_entries(&dir) {
            visited += 1;
            if visited > MAX_VISIT {
                out.truncated = true;
                break 'walk;
            }
            let name = e.file_name().to_string_lossy().into_owned();
            if name.starts_with('.') {
                continue;
            }
            let Ok(ft) = e.file_type() else { continue };
            if ft.is_symlink() {
                continue;
            }
            let r = join_rel(&rel, &name);
            if ft.is_dir() {
                if SKIP_DIRS.contains(&name.as_str()) {
                    continue;
                }
                if repo.is_some() && rules.ignored(&repo_rel(&r), true) {
                    ignored_dirs.push((e.path(), r));
                } else {
                    queue.push_back((e.path(), r));
                }
            } else if ft.is_file() {
                if rel.is_empty() && name == PROTOCOL_FILE {
                    continue;
                }
                if repo.is_some() && !is_doc(&name) && rules.ignored(&repo_rel(&r), false) {
                    continue;
                }
                if let Ok(m) = e.metadata() {
                    out.files.push(Entry { rel: r, size: m.len() as i64, mtime: mtime_ms(&m) });
                }
            }
        }
    }

    // Second pass: documents inside what `.gitignore` leaves out.
    if !out.truncated {
        'ignored: for (dir, rel) in ignored_dirs {
            let mut budget = IGNORED_DIR_BUDGET;
            let mut found = Vec::new();
            let mut queue = VecDeque::from([(dir, rel.clone())]);
            while let Some((d, r)) = queue.pop_front() {
                for e in sorted_entries(&d) {
                    visited += 1;
                    if visited > MAX_VISIT {
                        out.truncated = true;
                        break 'ignored;
                    }
                    if budget == 0 {
                        out.not_listed.push(format!("{rel}/"));
                        continue 'ignored;
                    }
                    budget -= 1;
                    let name = e.file_name().to_string_lossy().into_owned();
                    let Ok(ft) = e.file_type() else { continue };
                    if name.starts_with('.') || ft.is_symlink() {
                        continue;
                    }
                    let child = join_rel(&r, &name);
                    if ft.is_dir() {
                        if !SKIP_DIRS.contains(&name.as_str()) {
                            queue.push_back((e.path(), child));
                        }
                    } else if ft.is_file() && is_doc(&name) {
                        if let Ok(m) = e.metadata() {
                            found.push(Entry { rel: child, size: m.len() as i64, mtime: mtime_ms(&m) });
                        }
                    }
                }
            }
            out.files.extend(found);
        }
    }
    out.files.sort_by(|a, b| a.rel.cmp(&b.rel));
    out
}

// ---------------------------------------------------------------------------------------------
// State files, and the dated series a hand-off folder grows (`HANDOFF_2026-10-23.md`, next week
// `HANDOFF_2026-10-30.md`): picking one dated file means 「the newest of this series」 from then on.
// ---------------------------------------------------------------------------------------------

/// The byte range of the last date in `name`: `2026-10-23`, or `20261023` (an eight-digit run that
/// reads as a date). Not part of a longer run of digits.
fn date_range(name: &str) -> Option<(usize, usize)> {
    let b = name.as_bytes();
    let digit = |i: usize| b.get(i).is_some_and(u8::is_ascii_digit);
    let bounded = |a: usize, z: usize| (a == 0 || !digit(a - 1)) && !digit(z);
    let mut found = None;
    for a in 0..b.len() {
        if a + 10 <= b.len()
            && (0..10).all(|k| if k == 4 || k == 7 { b[a + k] == b'-' } else { digit(a + k) })
            && bounded(a, a + 10)
        {
            found = Some((a, a + 10));
        } else if a + 8 <= b.len() && (0..8).all(|k| digit(a + k)) && bounded(a, a + 8) {
            let s = &name[a..a + 8];
            let (y, m, d) = (&s[..2], &s[4..6], &s[6..8]);
            if (y == "19" || y == "20") && ("01"..="12").contains(&m) && ("01"..="31").contains(&d) {
                found = Some((a, a + 8));
            }
        }
    }
    found
}

fn split_rel(rel: &str) -> (&str, &str) {
    rel.rsplit_once('/').unwrap_or(("", rel))
}

/// `plans/HANDOFF_2026-10-23.md` → `plans/HANDOFF_*.md`; None for a file with no date in its name.
pub(crate) fn series_spec(rel: &str) -> Option<String> {
    let (dir, name) = split_rel(rel);
    let (a, z) = date_range(name)?;
    Some(join_rel(dir, &format!("{}*{}", &name[..a], &name[z..])))
}

/// The date in `name` when it is a member of the series `prefix*suffix`, as digits only.
fn series_key(name: &str, prefix: &str, suffix: &str) -> Option<String> {
    let mid = name.strip_prefix(prefix)?.strip_suffix(suffix)?;
    let (a, z) = date_range(mid)?;
    (a == 0 && z == mid.len()).then(|| mid.replace('-', ""))
}

/// Is `rel` the file `spec` names, or a member of the series it names?
pub(crate) fn spec_matches(spec: &str, rel: &str) -> bool {
    let Some((pre, suf)) = spec.split_once('*') else { return spec == rel };
    let (sdir, spre) = split_rel(pre);
    let (dir, name) = split_rel(rel);
    // `pre` may end inside the directory part only when it has no `/` after the last one.
    sdir == dir && series_key(name, spre, suf).is_some()
}

/// The file `spec` stands for now: itself, or the newest member of its series. None = nothing
/// there (deleted, moved into an archive, or never existed).
pub(crate) fn resolve_spec(root: &Path, spec: &str) -> Option<String> {
    if check_specs(&[spec.to_string()]).is_err() {
        return None;
    }
    let Some((pre, suf)) = spec.split_once('*') else {
        return checked_user_file(root, Path::new(spec)).ok().map(|_| spec.to_string());
    };
    let (dir, prefix) = split_rel(pre);
    let real_root = std::fs::canonicalize(root).ok()?;
    let real_dir = std::fs::canonicalize(on_disk(&real_root, dir)).ok()?;
    if !real_dir.starts_with(&real_root) || !real_dir.is_dir() {
        return None;
    }
    sorted_entries(&real_dir)
        .into_iter()
        .filter(|e| e.file_type().is_ok_and(|t| t.is_file()))
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().into_owned();
            let rel = join_rel(dir, &name);
            checked_user_file(root, Path::new(&rel)).ok()?;
            series_key(&name, prefix, suf).map(|k| (k, name))
        })
        .max()
        .map(|(_, name)| join_rel(dir, &name))
}

/// What the connect step offers to tick (task book §3.1): the names that usually hold the plan,
/// then the most recently changed Markdown. Each dated file stands for its series.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Candidate {
    /// What gets stored: the path, or the series with `*`.
    pub spec: String,
    /// The file it stands for today.
    pub path: String,
    pub recommended: bool,
    pub modified: i64,
}

/// The user may explicitly choose any ordinary file inside their selected folder. This is
/// narrower than a directory grant and distinct from an AI proposing a hidden/private path.
pub(crate) fn checked_user_file(root: &Path, selected: &Path) -> Result<(PathBuf, String), String> {
    use std::path::Component;
    let root = std::fs::canonicalize(root).map_err(|_| "folder_file_missing")?;
    if selected.components().any(|c| matches!(c, Component::ParentDir)) {
        return Err("folder_file_unsafe".into());
    }
    let selected = if selected.is_absolute() { selected.to_path_buf() } else { root.join(selected) };
    let path = std::fs::canonicalize(&selected).map_err(|_| "folder_file_missing")?;
    if !path.starts_with(&root) {
        return Err("folder_file_unsafe".into());
    }
    if !path.is_file() { return Err("folder_file_not_file".into()); }
    let rel = path.strip_prefix(&root).map_err(|_| "folder_file_unsafe")?
        .components().map(|c| c.as_os_str().to_string_lossy()).collect::<Vec<_>>().join("/");
    Ok((path, rel))
}

fn state_file_choice(root: &str, selected: &str) -> Result<Candidate, String> {
    let (path, rel) = checked_user_file(Path::new(root), Path::new(selected))?;
    let (_, modified) = stamp(&path).ok_or("folder_file_missing")?;
    Ok(Candidate { spec: rel.clone(), path: rel, recommended: false, modified })
}

const PLAN_NAMES: [&str; 8] = ["README", "HANDOFF", "WORK_PLAN", "WORKPLAN", "PLAN", "STATUS", "ROADMAP", "TODO"];

/// Which of PLAN_NAMES a file is named after: (0 = exactly that name, 1 = that name and more —
/// `HANDOFF_PROPOSAL` —, its position in PLAN_NAMES).
fn plan_rank(rel: &str) -> Option<(u8, usize)> {
    let (dir, name) = split_rel(rel);
    // What was moved into an archive is the past (Flux keeps `archive/<date>/`), not where things stand.
    if dir.split('/').any(|d| d.eq_ignore_ascii_case("archive")) {
        return None;
    }
    let stem = Path::new(name).file_stem()?.to_string_lossy().into_owned();
    let stem = match date_range(&stem) {
        Some((a, z)) => format!("{}{}", &stem[..a], &stem[z..]),
        None => stem,
    };
    let key = stem
        .trim_matches(|c: char| c == '_' || c == '-' || c == ' ' || c == '.')
        .to_uppercase()
        .replace(['-', ' '], "_");
    let (exact, rank) = match PLAN_NAMES.iter().position(|n| key == *n) {
        Some(r) => (0, r),
        None => (1, PLAN_NAMES.iter().position(|n| key.starts_with(&format!("{n}_")))?),
    };
    // Only the top README speaks for the folder; every package has one of its own.
    (rank != 0 || dir.is_empty()).then_some((exact, rank))
}

pub(crate) fn candidates(listing: &Listing) -> Vec<Candidate> {
    // One entry per spec: the newest member stands for a series.
    let mut by_spec: BTreeMap<String, (String, i64)> = BTreeMap::new();
    for f in listing.files.iter().filter(|f| is_doc(&f.rel)) {
        let spec = series_spec(&f.rel).unwrap_or_else(|| f.rel.clone());
        let newer = by_spec.get(&spec).is_none_or(|(p, _)| {
            let (_, name) = split_rel(p);
            let (_, cand) = split_rel(&f.rel);
            date_range(cand).map(|(a, z)| cand[a..z].replace('-', ""))
                > date_range(name).map(|(a, z)| name[a..z].replace('-', ""))
        });
        if newer {
            by_spec.insert(spec, (f.rel.clone(), f.mtime));
        }
    }
    let depth = |p: &str| p.matches('/').count();
    let mut named: Vec<((u8, usize), Candidate)> = by_spec
        .iter()
        .filter_map(|(spec, (path, mtime))| {
            plan_rank(path).map(|r| {
                (r, Candidate { spec: spec.clone(), path: path.clone(), recommended: true, modified: *mtime })
            })
        })
        .collect();
    named.sort_by(|a, b| a.0.cmp(&b.0).then(depth(&a.1.path).cmp(&depth(&b.1.path))).then(b.1.modified.cmp(&a.1.modified)));
    let mut out: Vec<Candidate> = named.into_iter().map(|(_, c)| c).collect();
    let mut recent: Vec<Candidate> = by_spec
        .iter()
        .filter(|(_, (p, _))| matches!(ext_of(p).as_str(), "md" | "markdown"))
        .filter(|(spec, _)| !out.iter().any(|c| &c.spec == *spec))
        .map(|(spec, (path, mtime))| Candidate { spec: spec.clone(), path: path.clone(), recommended: false, modified: *mtime })
        .collect();
    recent.sort_by_key(|c| std::cmp::Reverse(c.modified));
    out.extend(recent.into_iter().take(5));
    out.truncate(12);
    out
}

// ---------------------------------------------------------------------------------------------
// The sync cursor: the folder as it was the last time the project was brought in line with it.
// ---------------------------------------------------------------------------------------------

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct StateMark {
    pub size: i64,
    pub mtime: i64,
    pub hash: String,
}

fn state_mark(root: &Path, rel: &str) -> Option<StateMark> {
    let (path, _) = checked_user_file(root, Path::new(rel)).ok()?;
    let (size, mtime) = stamp(&path)?;
    // A user can choose any file. Unsupported formats are metadata-only: do not read a binary
    // file (or source code) just to calculate a fingerprint that an AI cannot use as text.
    let hash = if has_state_text(rel) { fingerprint(&path)? } else { String::new() };
    Some(StateMark { size, mtime, hash })
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Snapshot {
    /// Every listed file: [size, modified ms].
    #[serde(default)]
    pub files: BTreeMap<String, [i64; 2]>,
    /// The state files of every project linked to the folder, with a content fingerprint — a
    /// checkout that only touched the modified time is not a change of plan.
    #[serde(default)]
    pub state: BTreeMap<String, StateMark>,
    #[serde(default)]
    pub truncated: bool,
    /// What the one who said 「已经对过了」 said was brought across, and who that was.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub by: Option<String>,
}

impl Snapshot {
    pub(crate) fn parse(raw: &str) -> Snapshot {
        serde_json::from_str(raw).unwrap_or_default()
    }
}

pub(crate) fn take_snapshot(root: &Path, specs: &[String], by: Option<&str>, note: Option<&str>) -> Snapshot {
    let listing = list_folder(root);
    let mut snap = Snapshot {
        files: listing.files.iter().map(|f| (f.rel.clone(), [f.size, f.mtime])).collect(),
        truncated: listing.truncated,
        note: note.map(str::to_string),
        by: by.map(str::to_string),
        ..Snapshot::default()
    };
    for spec in specs {
        if let Some(rel) = resolve_spec(root, spec) {
            if let Some(mark) = state_mark(root, &rel) {
                // An explicit choice can live in a hidden, generated or ignored directory that
                // the general listing deliberately skips. It still belongs in the sync cursor.
                snap.files.insert(rel.clone(), [mark.size, mark.mtime]);
                snap.state.insert(rel, mark);
            }
        }
    }
    snap
}

/// One state file now, against the snapshot.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StateNow {
    pub spec: String,
    /// The file it stands for now; None = nothing there any more.
    pub path: Option<String>,
    pub changed: bool,
}

pub(crate) fn state_now(root: &Path, spec: &str, snap: &Snapshot) -> StateNow {
    let path = resolve_spec(root, spec);
    let changed = match &path {
        // Gone since the sync (deleted, or moved into an archive) is a change of plan too.
        None => snap.state.keys().any(|k| spec_matches(spec, k)),
        Some(rel) => {
            let p = on_disk(root, rel);
            match stamp(&p) {
                None => true,
                Some((size, mtime)) => {
                    if snap.files.get(rel) == Some(&[size, mtime]) {
                        false
                    } else if let Some(m) = snap.state.get(rel) {
                        (m.size, m.mtime) != (size, mtime)
                            && (!has_state_text(rel) || fingerprint(&p).as_deref() != Some(m.hash.as_str()))
                    } else {
                        // A new member of the series, or a file that changed after the sync and
                        // had no fingerprint taken then.
                        true
                    }
                }
            }
        }
    };
    StateNow { spec: spec.to_string(), path, changed }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Change {
    pub path: String,
    /// added | modified | deleted
    pub kind: &'static str,
    /// None for a deleted file.
    pub modified: Option<i64>,
}

/// Everything listed now that is new or different from the snapshot, newest first; deleted files
/// last, and only when both listings are complete (a file past the cut-off is not deleted).
pub(crate) fn changes_since(listing: &Listing, snap: &Snapshot) -> Vec<Change> {
    let mut out: Vec<Change> = listing
        .files
        .iter()
        .filter_map(|f| match snap.files.get(&f.rel) {
            None => Some(Change { path: f.rel.clone(), kind: "added", modified: Some(f.mtime) }),
            Some([s, m]) if *s != f.size || *m != f.mtime => {
                Some(Change { path: f.rel.clone(), kind: "modified", modified: Some(f.mtime) })
            }
            Some(_) => None,
        })
        .collect();
    out.sort_by(|a, b| b.modified.cmp(&a.modified).then(a.path.cmp(&b.path)));
    if !listing.truncated && !snap.truncated {
        let now: std::collections::HashSet<&str> = listing.files.iter().map(|f| f.rel.as_str()).collect();
        out.extend(
            snap.files
                .keys()
                .filter(|k| !now.contains(k.as_str()))
                .map(|k| Change { path: k.clone(), kind: "deleted", modified: None }),
        );
    }
    out
}

// ---------------------------------------------------------------------------------------------
// SPOOL.md (task book §3.2 – §3.3, appendix A). Only rules that do not change: which projects,
// who is the authority, when to read, when to write back. ⛔ Nothing live (that is what MCP is
// for), ⛔ no ids (the MCP hard rule), ⛔ no private project.
// ---------------------------------------------------------------------------------------------

/// One workspace as SPOOL.md lists it: its name and its projects — (title, is the main project).
/// P9Y 第二轮 (Ocean 10-25 第 210 条): a folder is linked to a WORKSPACE, and every unfinished,
/// public project in it (and in sub-workspaces without a folder of their own) belongs to the folder.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct Group {
    pub workspace: String,
    pub projects: Vec<(String, bool)>,
}

pub(crate) fn protocol_block(lang: Lang, groups: &[Group], specs: &[String], parent: Option<&str>) -> String {
    let zh = lang == Lang::Zh;
    let mut s = String::new();
    s.push_str(BEGIN);
    s.push('\n');
    if zh {
        s.push_str("## Spool（思簿）\n\n这个文件夹连着这台电脑上的 Spool。Spool 通过 MCP 连着你用的 AI，按项目存着和这个文件夹有关的背景资料。\n");
        if let Some(p) = parent {
            s.push_str(&format!("上层文件夹还有一份：`{p}`。在这个子文件夹里工作时，以这一份为准。\n"));
        }
        s.push_str("\n### 对应的 Spool 项目\n\n");
    } else {
        s.push_str("## Spool\n\nThis folder is linked to Spool on this computer. Spool is connected to the AI you are using over MCP, and keeps the background material that goes with this folder, filed under projects.\n");
        if let Some(p) = parent {
            s.push_str(&format!("The folder above has one too: `{p}`. While you work inside this subfolder, this one is the one to follow.\n"));
        }
        s.push_str("\n### The Spool projects it belongs to\n\n");
    }
    let several = groups.iter().map(|g| g.projects.len()).sum::<usize>() > 1;
    for (i, g) in groups.iter().enumerate() {
        if i > 0 {
            s.push('\n');
        }
        let ws = &g.workspace;
        s.push_str(&if zh { format!("工作区「{ws}」：\n") } else { format!("Workspace \u{201c}{ws}\u{201d}:\n") });
        if g.projects.is_empty() {
            s.push_str(if zh { "- （这里还没有项目）\n" } else { "- (no projects here yet)\n" });
        }
        for (title, primary) in &g.projects {
            let mark = match (several && *primary, zh) {
                (true, true) => "（主项目）",
                (true, false) => " (main project)",
                _ => "",
            };
            s.push_str(&if zh { format!("- 〈{title}〉{mark}\n") } else { format!("- \u{2039}{title}\u{203a}{mark}\n") });
        }
    }
    let files: Vec<String> = specs
        .iter()
        .map(|spec| match (spec.contains('*'), zh) {
            (true, true) => format!("  - `{spec}`（取日期最新的一份）\n"),
            (true, false) => format!("  - `{spec}` (the newest by date)\n"),
            (false, _) => format!("  - `{spec}`\n"),
        })
        .collect();
    if zh {
        s.push_str("\n用 Spool 的 `list_threads`，`title_contains` 填项目名，就能拿到项目 id。工作区里以后新建的项目也算，Spool 会更新这一段；私密项目和已完成的项目不会出现在这里。\n\n### 谁说了算\n\n");
        if files.is_empty() {
            s.push_str("- **现在做什么、做到哪，以这个文件夹为准**：看这里写给人看的计划和交接文档。\n");
        } else {
            s.push_str("- **现在做什么、做到哪，以这个文件夹为准。** 现状文件：\n");
            files.iter().for_each(|f| s.push_str(f));
        }
        s.push_str(
            "- **Spool 里存的是这个文件夹装不下的**：调研来源和读到它的日期、在别的 AI 对话里想出来的东西、做决定时放弃了的选项、还没定的问题、要盯的外部事情。\n\
             - **Spool 里和现状文件冲突的内容是历史，不是现状。** 不要照着它干活，也不要拿它去改现状文件。\n\n\
             ### 什么时候读 Spool\n\n\
             - 开始一段涉及方向、计划、调研、对外沟通的工作之前：对主项目调一次 `get_project_overview`，看摘要、在跟进的事、需要注意的、文件夹是不是走到前面去了。\n\
             - 要找某个调研结论或来源：`search_blocks`。\n\
             - 只是写代码、改 bug：不用读。\n\n\
             ### 什么时候写回（每次一条；写进主项目，除非明显属于另一个）\n\n\
             - 计划或方向变了：`add_block` 写「从什么变成什么、为什么」，`ref_block_id` 指着被推翻的旧块，`ref_kind` 选 `supersedes`（整块作废）或 `corrects`（只错一处）。它会进 Spool 的待审，等用户点。\n\
             - 定了一件事、过了一个门槛、放弃了一条路：`add_block` 一条。\n\
             - 这次没解决的问题：`suggest_follow_up_item`。\n\
             - Spool 在跟进的事，这个文件夹里已经不做了：`close_follow_up_item`。标着 `standing` 的不能收，告诉用户。\n\
             - AI 写的项目摘要和现状对不上：`set_thread_summary`。用户自己写的摘要改不了，把建议告诉用户。\n\
             - 写完之后：`mark_folder_synced`，一句话说对齐了什么。\n\n\
             ### 不写什么\n\n\
             代码、运行日志、这个文件夹里文档的复制、每次提交的流水、为了整齐去改 Spool 里的旧块。\n\n\
             ---\n\
             这一段由 Spool 维护。项目改名、连接变化时 Spool 会更新 `spool:begin` 和 `spool:end` 之间的内容；你改过的话它会先问你。在 Spool 里断开这个文件夹，或者把这一段整段删掉，都能移除。\n",
        );
    } else {
        s.push_str("\nCall Spool's `list_threads` with the project name as `title_contains` to get its id. Projects added to the workspace later belong here too, and Spool updates this section; private and finished projects never appear here.\n\n### Which side is the authority\n\n");
        if files.is_empty() {
            s.push_str("- **What is being done now, and how far it has got, is whatever this folder says**: read the plans and hand-off notes written here for people.\n");
        } else {
            s.push_str("- **What is being done now, and how far it has got, is whatever this folder says.** The state files:\n");
            files.iter().for_each(|f| s.push_str(f));
        }
        s.push_str(
            "- **Spool holds what this folder has no place for**: sources and the day they were read, ideas worked out in conversations with other AIs, the options turned down when a decision was made, open questions, outside things to keep an eye on.\n\
             - **Anything in Spool that conflicts with the state files is history, not the current state.** Do not act on it, and do not use it to edit the state files.\n\n\
             ### When to read Spool\n\n\
             - Before starting work that touches direction, plans, research or anything sent to other people: call `get_project_overview` on the main project once — its summary, what it is watching, what needs attention, and whether the folder has moved ahead.\n\
             - To find a research finding or a source: `search_blocks`.\n\
             - For writing code or fixing a bug: no need.\n\n\
             ### When to write back (one item each time; into the main project unless it clearly belongs to another)\n\n\
             - The plan or the direction changed: `add_block` saying what it changed from and to, and why, with `ref_block_id` naming the block it overturns and `ref_kind` `supersedes` (that block is void as a whole) or `corrects` (one point in it is wrong). It waits in Spool's review for the user.\n\
             - Something was decided, a milestone was passed, a path was given up: one `add_block`.\n\
             - A question left open this time: `suggest_follow_up_item`.\n\
             - Something Spool is watching that this folder no longer does: `close_follow_up_item`. Lines marked `standing` cannot be closed; tell the user.\n\
             - An AI-written project summary that no longer matches: `set_thread_summary`. A summary the user wrote cannot be changed; tell them your suggestion.\n\
             - When you are done: `mark_folder_synced`, with one sentence on what you brought across.\n\n\
             ### What not to write\n\n\
             Code, run logs, copies of the documents in this folder, a log of every commit, or edits to old blocks in Spool just to tidy them.\n\n\
             ---\n\
             Spool maintains this section. It updates what is between `spool:begin` and `spool:end` when a project is renamed or the link changes, and asks first if you have edited it. Disconnect the folder in Spool, or delete this whole section, to remove it.\n",
        );
    }
    s.push_str(END);
    s
}

/// What Spool puts below its section the first time it creates the file — and nothing more.
fn user_stub(lang: Lang) -> &'static str {
    match lang {
        Lang::Zh => "## 你自己的规矩\n\n（这一行以下归你，Spool 不会改。比如：哪些内容不要写进 Spool、写回时用中文还是英文。）\n",
        Lang::En => "## Your own rules\n\n(Everything below this line is yours; Spool never changes it. For example: what should never go into Spool, which language to write back in.)\n",
    }
}

/// Spool's section in a SPOOL.md: exactly one well-formed pair of markers, or nothing. Anything
/// else — a lone half after a hand edit, markers out of order — is not Spool's to touch (the same
/// rule as the global guidance file, `mcp::write_client_guidance`).
fn find_block(text: &str) -> Option<(usize, usize)> {
    if text.matches(BEGIN).count() != 1 || text.matches(END).count() != 1 {
        return None;
    }
    let a = text.find(BEGIN)?;
    let b = text.find(END)?;
    (b > a).then_some((a, b + END.len()))
}

/// ok / edited (the user changed Spool's section) / removed (the section is gone) / missing (the
/// file is gone).
pub(crate) fn protocol_state(folder: &Path, last_hash: Option<&str>) -> &'static str {
    let Ok(text) = std::fs::read_to_string(folder.join(PROTOCOL_FILE)) else { return "missing" };
    match find_block(&text) {
        None => "removed",
        Some((a, b)) => match last_hash {
            Some(h) if fnv64(&text.as_bytes()[a..b]) != h => "edited",
            _ => "ok",
        },
    }
}

/// The section Spool has in the file now, for 「看差别」.
pub(crate) fn current_block(folder: &Path) -> Option<String> {
    let text = std::fs::read_to_string(folder.join(PROTOCOL_FILE)).ok()?;
    let (a, b) = find_block(&text)?;
    Some(text[a..b].to_string())
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) enum Mode {
    /// A refresh: never over an edit, never brings back a section or a file the user removed.
    Update,
    /// Connecting: creates the file, or adds the section above what is already there.
    Create,
    /// The user said so (「换成新的」 / 「重新写一份」), or a project went private and its name
    /// has to come out whatever the file says now.
    Force,
}

#[derive(Debug, PartialEq)]
pub(crate) enum Written {
    /// The section now in the file, with its fingerprint (written or already identical).
    Ok(String),
    Edited,
    Removed,
    Missing,
}

/// Where a file about to change is copied first: Spool's own data folder, never beside the file.
/// The newest five of each file are kept.
fn backup(backups: &Path, folder_id: &str, file: &Path) -> Result<(), String> {
    if !file.is_file() {
        return Ok(());
    }
    let dir = backups.join("folder-backups").join(folder_id);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let name = file.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
    std::fs::copy(file, dir.join(format!("{name}.{}", now_ms()))).map_err(|e| e.to_string())?;
    let mut kept: Vec<PathBuf> = std::fs::read_dir(&dir)
        .map(|rd| rd.flatten().map(|e| e.path()).collect())
        .unwrap_or_default();
    kept.retain(|p| p.file_name().is_some_and(|n| n.to_string_lossy().starts_with(&format!("{name}."))));
    kept.sort();
    for old in kept.iter().take(kept.len().saturating_sub(5)) {
        let _ = std::fs::remove_file(old);
    }
    Ok(())
}

pub(crate) fn write_protocol(
    folder: &Path,
    block: &str,
    last_hash: Option<&str>,
    mode: Mode,
    lang: Lang,
    backups: &Path,
    folder_id: &str,
) -> Result<Written, String> {
    let file = folder.join(PROTOCOL_FILE);
    let hash = fnv64(block.as_bytes());
    let next = match std::fs::read_to_string(&file) {
        Err(_) if mode == Mode::Update => return Ok(Written::Missing),
        Err(_) => format!("{block}\n\n{}", user_stub(lang)),
        Ok(text) => match find_block(&text) {
            Some((a, b)) => {
                let current = &text[a..b];
                if current == block {
                    return Ok(Written::Ok(hash));
                }
                if mode != Mode::Force && last_hash.is_some_and(|h| fnv64(current.as_bytes()) != h) {
                    return Ok(Written::Edited);
                }
                format!("{}{block}{}", &text[..a], &text[b..])
            }
            None if mode == Mode::Update => return Ok(Written::Removed),
            None if text.trim().is_empty() => format!("{block}\n\n{}", user_stub(lang)),
            None => format!("{block}\n\n{}", text.trim_start()),
        },
    };
    backup(backups, folder_id, &file)?;
    std::fs::write(&file, next).map_err(|e| e.to_string())?;
    Ok(Written::Ok(hash))
}

/// Take Spool's section out. When what is left is only the stub Spool put there, the file goes
/// too (it was Spool's to begin with). Returns whether the file still exists.
fn remove_protocol(folder: &Path, backups: &Path, folder_id: &str) -> Result<bool, String> {
    let file = folder.join(PROTOCOL_FILE);
    let Ok(text) = std::fs::read_to_string(&file) else { return Ok(false) };
    let Some((a, b)) = find_block(&text) else { return Ok(true) };
    let rest = format!("{}{}", &text[..a], &text[b..]);
    backup(backups, folder_id, &file)?;
    let only_stub = [Lang::Zh, Lang::En].iter().any(|l| rest.trim() == user_stub(*l).trim());
    if rest.trim().is_empty() || only_stub {
        std::fs::remove_file(&file).map_err(|e| e.to_string())?;
        return Ok(false);
    }
    std::fs::write(&file, rest.trim_start()).map_err(|e| e.to_string())?;
    Ok(true)
}

// ---------------------------------------------------------------------------------------------
// The three one-line writes: `.git/info/exclude`, CLAUDE.md, AGENTS.md (task book §3.2, §3.4).
// ---------------------------------------------------------------------------------------------

pub(crate) const CLAUDE_POINTER: &str = "@SPOOL.md";
const AGENTS_POINTER_ZH: &str = "开工前先读这个文件夹里的 SPOOL.md：它写着这个文件夹对应哪个 Spool 项目、冲突时谁说了算、什么时候写回。";
const AGENTS_POINTER_EN: &str = "Before starting, read SPOOL.md in this folder: it says which Spool project this folder belongs to, which side is the authority when they disagree, and when to write back.";

pub(crate) fn agents_pointer(lang: Lang) -> &'static str {
    match lang {
        Lang::Zh => AGENTS_POINTER_ZH,
        Lang::En => AGENTS_POINTER_EN,
    }
}

/// Append `line` unless the file already has it. Returns whether Spool added it — only a line it
/// added is one it may later take out.
fn add_line(file: &Path, line: &str, create: bool, backups: &Path, folder_id: &str) -> Result<bool, String> {
    let existing = match std::fs::read_to_string(file) {
        Ok(t) => t,
        Err(_) if create => String::new(),
        Err(_) => return Ok(false),
    };
    if existing.lines().any(|l| l.trim() == line) {
        return Ok(false);
    }
    backup(backups, folder_id, file)?;
    if let Some(dir) = file.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let sep = if existing.is_empty() || existing.ends_with('\n') { "" } else { "\n" };
    std::fs::write(file, format!("{existing}{sep}{line}\n")).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Take out the first line that is exactly one of `lines`. Anything the user changed is left.
fn remove_line(file: &Path, lines: &[&str], backups: &Path, folder_id: &str) -> Result<bool, String> {
    let Ok(existing) = std::fs::read_to_string(file) else { return Ok(false) };
    let mut parts: Vec<&str> = existing.split_inclusive('\n').collect();
    let Some(i) = parts.iter().position(|l| lines.contains(&l.trim_end_matches(['\n', '\r']))) else {
        return Ok(false);
    };
    backup(backups, folder_id, file)?;
    parts.remove(i);
    std::fs::write(file, parts.concat()).map_err(|e| e.to_string())?;
    Ok(true)
}

// ---------------------------------------------------------------------------------------------
// The library side. ⚠️ Reads name the tables unqualified — an MCP connection shadows `threads`
// with a view that leaves private projects out (`mcp::hide_private_projects`) — and writes name
// `main.<table>` (an unqualified write to a shadowed table fails).
//
// P9Y 第二轮 (Ocean 10-25 第 210 条:「需要整个工作区直接连接到一个项目文件夹上」): what is linked to a
// folder is a WORKSPACE (`workspace_folders`, v37). A project belongs to the folder of the nearest
// workspace above it that has one — its own, or a parent's — so a sub-workspace follows its parent
// unless it is linked to a folder of its own. The v36 `folder_links` (project → folder) is not read.
// ---------------------------------------------------------------------------------------------

struct FolderRow {
    id: String,
    path: String,
    identity: Option<Vec<u8>>,
    git_exclude: bool,
    pointer_claude: bool,
    pointer_agents: bool,
    protocol_hash: Option<String>,
    snapshot: String,
    synced_at: i64,
    state_cache: String,
}

const FOLDER_COLS: &str =
    "f.id, f.path, f.identity, f.git_exclude, f.pointer_claude, f.pointer_agents, f.protocol_hash, f.snapshot, f.synced_at, f.state_cache";

fn folder_from(r: &rusqlite::Row, at: usize) -> rusqlite::Result<FolderRow> {
    Ok(FolderRow {
        id: r.get(at)?,
        path: r.get(at + 1)?,
        identity: r.get(at + 2)?,
        git_exclude: r.get::<_, i64>(at + 3)? == 1,
        pointer_claude: r.get::<_, i64>(at + 4)? == 1,
        pointer_agents: r.get::<_, i64>(at + 5)? == 1,
        protocol_hash: r.get(at + 6)?,
        snapshot: r.get(at + 7)?,
        synced_at: r.get(at + 8)?,
        state_cache: r.get(at + 9)?,
    })
}

fn parse_specs(raw: &str) -> Vec<String> {
    serde_json::from_str(raw).unwrap_or_default()
}

/// A workspace's link to a folder.
#[derive(Debug, Clone)]
struct WsLink {
    workspace_id: String,
    folder_id: String,
    primary_thread_id: Option<String>,
    state_files: Vec<String>,
}

fn all_links(conn: &Connection) -> Result<Vec<WsLink>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT workspace_id, folder_id, primary_thread_id, state_files FROM workspace_folders
              ORDER BY created_at ASC, workspace_id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(WsLink {
                workspace_id: r.get(0)?,
                folder_id: r.get(1)?,
                primary_thread_id: r.get(2)?,
                state_files: parse_specs(&r.get::<_, String>(3)?),
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

fn folder_by_id(conn: &Connection, id: &str) -> Result<Option<FolderRow>, String> {
    conn.query_row(&format!("SELECT {FOLDER_COLS} FROM folders f WHERE f.id = ?1"), [id], |r| folder_from(r, 0))
        .optional()
        .map_err(|e| e.to_string())
}

/// The live workspaces: parent and name, in the order the sidebar draws them.
struct Tree {
    parent: HashMap<String, Option<String>>,
    title: HashMap<String, String>,
    /// Depth-first, siblings by sort order: a workspace before its sub-workspaces.
    order: Vec<String>,
}

fn tree(conn: &Connection) -> Result<Tree, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, parent_id, title FROM workspaces WHERE deleted_at IS NULL
              ORDER BY sort_order ASC, created_at ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows: Vec<(String, Option<String>, String)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;
    let parent: HashMap<String, Option<String>> = rows.iter().map(|(id, p, _)| (id.clone(), p.clone())).collect();
    let title = rows.iter().map(|(id, _, t)| (id.clone(), t.clone())).collect();
    let mut order = Vec::new();
    fn walk(at: Option<&str>, rows: &[(String, Option<String>, String)], parent: &HashMap<String, Option<String>>, out: &mut Vec<String>, depth: usize) {
        if depth > 64 {
            return;
        }
        for (id, p, _) in rows {
            // A parent that is gone (deleted) counts as the top.
            let p = p.as_deref().filter(|p| parent.contains_key(*p));
            if p == at && !out.contains(id) {
                out.push(id.clone());
                walk(Some(id), rows, parent, out, depth + 1);
            }
        }
    }
    walk(None, &rows, &parent, &mut order, 0);
    Ok(Tree { parent, title, order })
}

impl Tree {
    /// The nearest workspace from `ws` upwards that `linked` contains.
    fn nearest<'a>(&self, ws: &str, linked: &'a HashMap<String, WsLink>) -> Option<&'a WsLink> {
        let mut cur = Some(ws.to_string());
        for _ in 0..64 {
            let w = cur?;
            if !self.parent.contains_key(&w) {
                return None;
            }
            if let Some(l) = linked.get(&w) {
                return Some(l);
            }
            cur = self.parent.get(&w).cloned().flatten();
        }
        None
    }
}

fn links_by_ws(links: Vec<WsLink>) -> HashMap<String, WsLink> {
    links.into_iter().map(|l| (l.workspace_id.clone(), l)).collect()
}

/// A project SPOOL.md can name: live, public, not finished.
struct Member {
    id: String,
    title: String,
    workspace_id: String,
}

fn members(conn: &Connection) -> Result<Vec<Member>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, workspace_id FROM threads
              WHERE deleted_at IS NULL AND private = 0 AND status <> 'done'
              ORDER BY created_at ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| Ok(Member { id: r.get(0)?, title: r.get(1)?, workspace_id: r.get(2)? }))
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// What one folder's SPOOL.md lists: every workspace linked to it and the workspaces under them
/// that follow it, each with its projects; the main project; the state files of all its links.
struct Listed {
    groups: Vec<Group>,
    /// (thread id, title) of the main project — one pick shared by the folder's links.
    primary: Option<(String, String)>,
    specs: Vec<String>,
}

fn listed(conn: &Connection, folder_id: &str) -> Result<Listed, String> {
    let links = all_links(conn)?;
    let mine: Vec<&WsLink> = links.iter().filter(|l| l.folder_id == folder_id).collect();
    let t = tree(conn)?;
    let by_ws = links_by_ws(links.clone());
    let ms = members(conn)?;
    // Each member, by the workspace it sits in, when its nearest link is one of this folder's.
    let mut by_group: HashMap<String, Vec<&Member>> = HashMap::new();
    for m in &ms {
        if t.nearest(&m.workspace_id, &by_ws).is_some_and(|l| l.folder_id == folder_id) {
            by_group.entry(m.workspace_id.clone()).or_default().push(m);
        }
    }
    let theirs: Vec<&Member> = ms
        .iter()
        .filter(|m| t.nearest(&m.workspace_id, &by_ws).is_some_and(|l| l.folder_id == folder_id))
        .collect();
    let primary = mine
        .iter()
        .filter_map(|l| l.primary_thread_id.as_deref())
        .find_map(|p| theirs.iter().find(|m| m.id == p))
        .or_else(|| mine.iter().find_map(|l| {
            theirs.iter().find(|m| t.nearest(&m.workspace_id, &by_ws).is_some_and(|n| n.workspace_id == l.workspace_id))
        }))
        .map(|m| (m.id.clone(), m.title.clone()));
    // Linked workspaces in link order, each followed by its sub-workspaces in sidebar order; a
    // sub-workspace shows only when it has projects here.
    let mut groups = Vec::new();
    for l in &mine {
        for ws in &t.order {
            let is_link = ws == &l.workspace_id;
            let under = !is_link && t.nearest(ws, &by_ws).is_some_and(|n| n.workspace_id == l.workspace_id);
            if !is_link && !under {
                continue;
            }
            let list = by_group.get(ws).map(Vec::as_slice).unwrap_or(&[]);
            if under && list.is_empty() {
                continue;
            }
            groups.push(Group {
                workspace: t.title.get(ws).cloned().unwrap_or_default(),
                projects: list
                    .iter()
                    .map(|m| (m.title.clone(), primary.as_ref().is_some_and(|(id, _)| id == &m.id)))
                    .collect(),
            });
        }
    }
    let mut specs: Vec<String> = Vec::new();
    for l in &mine {
        for s in &l.state_files {
            if !specs.contains(s) {
                specs.push(s.clone());
            }
        }
    }
    Ok(Listed { groups, primary, specs })
}

/// Where a linked folder is now (the same states as a project file, `file_follow.rs`). With a
/// writable connection a move is written down; without one (the MCP server) it is only seen.
fn locate(conn: Option<&Connection>, f: &FolderRow) -> (&'static str, PathBuf) {
    let path = PathBuf::from(&f.path);
    let identity = f.identity.as_deref().filter(|i| file_identity::usable(i));
    if path.is_dir() {
        if let Some(conn) = conn {
            if !identity.is_some_and(|i| file_identity::matches(&path, i)) {
                if let Some(fresh) = file_identity::record(&path) {
                    let _ = conn.execute("UPDATE main.folders SET identity = ?1 WHERE id = ?2", params![fresh, f.id]);
                }
            }
        }
        return ("in_place", path);
    }
    if file_identity::disk_offline(&path) {
        return ("offline", path);
    }
    let Some(identity) = identity else { return ("unknown", path) };
    match file_identity::resolve(identity) {
        Resolved::Gone => ("deleted", path),
        Resolved::At(found) if file_identity::in_trash(&found) => ("trash", found),
        Resolved::At(found) if found.is_dir() => {
            if let Some(conn) = conn {
                let _ = conn.execute(
                    "UPDATE main.folders SET path = ?1, identity = COALESCE(?2, identity) WHERE id = ?3",
                    params![found.to_string_lossy(), file_identity::record(&found), f.id],
                );
            }
            ("moved", found)
        }
        Resolved::At(_) => ("unknown", path),
    }
}

/// The nearest other linked folder above this one, as a path from this folder: `../SPOOL.md`.
fn parent_protocol(conn: &Connection, folder_id: &str, path: &Path) -> Result<Option<String>, String> {
    let mut stmt = conn.prepare("SELECT id, path FROM folders").map_err(|e| e.to_string())?;
    let all: Vec<(String, String)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;
    let nearest = all
        .iter()
        .filter(|(id, _)| id != folder_id)
        .filter_map(|(_, p)| path.strip_prefix(p).ok().filter(|r| r.components().count() > 0).map(|r| r.components().count()))
        .min();
    Ok(nearest.map(|n| format!("{}{PROTOCOL_FILE}", "../".repeat(n))))
}

/// Write the folder's SPOOL.md for what is linked to it now, and remember what was written.
/// A folder no workspace is linked to any more is left alone, unless a private project's name has
/// to come out (`Mode::Force`), when Spool's section is taken out.
fn regenerate(conn: &Connection, f: &FolderRow, path: &Path, mode: Mode, lang: Lang, backups: &Path) -> Result<Written, String> {
    let l = listed(conn, &f.id)?;
    if l.groups.is_empty() {
        if mode == Mode::Force {
            remove_protocol(path, backups, &f.id)?;
        }
        return Ok(Written::Removed);
    }
    let block = protocol_block(lang, &l.groups, &l.specs, parent_protocol(conn, &f.id, path)?.as_deref());
    let out = write_protocol(path, &block, f.protocol_hash.as_deref(), mode, lang, backups, &f.id)?;
    if let Written::Ok(hash) = &out {
        if f.protocol_hash.as_deref() != Some(hash.as_str()) {
            conn.execute("UPDATE main.folders SET protocol_hash = ?1 WHERE id = ?2", params![hash, f.id])
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(out)
}

fn check_specs(specs: &[String]) -> Result<Vec<String>, String> {
    let mut out: Vec<String> = Vec::new();
    for s in specs {
        let s = s.to_string();
        if s.is_empty() || Path::new(&s).is_absolute() || s.starts_with('/') || s.split('/').any(|p| p.is_empty() || p == ".." || p == ".") || s.contains('\\') || s.matches('*').count() > 1 {
            return Err("bad_spec".into());
        }
        if !out.contains(&s) {
            out.push(s);
        }
    }
    if out.len() > MAX_STATE_FILES {
        return Err("too_many".into());
    }
    Ok(out)
}

/// Record the state files just picked, as they are now — so picking a file is not read as the
/// folder having moved ahead. Files already in the snapshot keep their mark.
fn add_state_marks(conn: &Connection, f: &FolderRow, path: &Path, specs: &[String]) -> Result<(), String> {
    let mut snap = Snapshot::parse(&f.snapshot);
    let mut changed = false;
    for spec in specs {
        let Some(rel) = resolve_spec(path, spec) else { continue };
        if snap.state.contains_key(&rel) {
            continue;
        }
        if let Some(mark) = state_mark(path, &rel) {
            snap.files.insert(rel.clone(), [mark.size, mark.mtime]);
            snap.state.insert(rel, mark);
            changed = true;
        }
    }
    if changed {
        conn.execute(
            "UPDATE main.folders SET snapshot = ?1 WHERE id = ?2",
            params![serde_json::to_string(&snap).map_err(|e| e.to_string())?, f.id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// A folder already in the library that is this one: the same real path, or the same identity
/// (the folder was moved since).
fn existing_folder(conn: &Connection, path: &Path) -> Result<Option<FolderRow>, String> {
    let mut stmt = conn.prepare(&format!("SELECT {FOLDER_COLS} FROM folders f")).map_err(|e| e.to_string())?;
    let all: Vec<FolderRow> = stmt
        .query_map([], |r| folder_from(r, 0))
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;
    Ok(all.into_iter().find(|f| {
        Path::new(&f.path) == path
            || f.identity.as_deref().is_some_and(|i| file_identity::usable(i) && file_identity::matches(path, i))
    }))
}

fn real_folder(path: &str) -> Result<PathBuf, String> {
    let p = std::fs::canonicalize(path).map_err(|_| "missing".to_string())?;
    if !p.is_dir() {
        return Err("not_a_folder".into());
    }
    Ok(plain(p))
}

/// `C:\…` rather than the `\\?\C:\…` canonicalize gives on Windows — the form a path is shown and
/// stored in everywhere else (`file_identity`, P9X).
fn plain(p: PathBuf) -> PathBuf {
    #[cfg(windows)]
    {
        let s = p.to_string_lossy();
        if let Some(rest) = s.strip_prefix(r"\\?\") {
            return PathBuf::from(rest);
        }
    }
    p
}

/// The link a workspace itself has (not one inherited from above). "no_link" without one.
fn own_link(conn: &Connection, workspace_id: &str) -> Result<(FolderRow, WsLink), String> {
    let link = all_links(conn)?.into_iter().find(|l| l.workspace_id == workspace_id).ok_or("no_link")?;
    let f = folder_by_id(conn, &link.folder_id)?.ok_or("no_link")?;
    Ok((f, link))
}

/// The link a project falls under: its workspace's, or the nearest one above. None for a project
/// that is gone, or that an AI's connection does not show (private).
fn link_of_thread(conn: &Connection, thread_id: &str) -> Result<Option<(FolderRow, WsLink)>, String> {
    let ws: Option<String> = conn
        .query_row("SELECT workspace_id FROM threads WHERE id = ?1 AND deleted_at IS NULL", [thread_id], |r| r.get(0))
        .optional()
        .map_err(|e| e.to_string())?;
    let Some(ws) = ws else { return Ok(None) };
    link_of_workspace(conn, &ws)
}

/// The link a workspace falls under: its own, or the nearest one above.
fn link_of_workspace(conn: &Connection, workspace_id: &str) -> Result<Option<(FolderRow, WsLink)>, String> {
    let by_ws = links_by_ws(all_links(conn)?);
    if by_ws.is_empty() {
        return Ok(None);
    }
    let t = tree(conn)?;
    let Some(l) = t.nearest(workspace_id, &by_ws).cloned() else { return Ok(None) };
    Ok(folder_by_id(conn, &l.folder_id)?.map(|f| (f, l)))
}

// ---------------------------------------------------------------------------------------------
// What a linked folder looks like now — one shape for the workspace page, a project's right rail
// and what MCP hands an AI (which renders it in mcp.rs).
// ---------------------------------------------------------------------------------------------

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub(crate) struct CachedText {
    pub size: i64,
    pub mtime: i64,
    pub text: String,
}

fn parse_cache(raw: &str) -> BTreeMap<String, CachedText> {
    serde_json::from_str(raw).unwrap_or_default()
}

/// A docx / pdf state file whose text the GUI should extract (the MCP server cannot).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NeedsText {
    pub rel: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct View {
    pub folder_id: String,
    /// The workspace that is linked (the one asked about, or the nearest one above it).
    pub workspace_id: String,
    pub workspace: String,
    /// The link was found above: the workspace asked about, or the project's own, is not the one
    /// linked.
    pub inherited: bool,
    /// Where the folder is now.
    pub path: String,
    pub short: String,
    pub name: String,
    /// in_place | moved | offline | trash | deleted | unknown
    pub location: &'static str,
    /// The main project of this folder — the one an AI writes into by default.
    pub primary_id: Option<String>,
    pub primary_title: Option<String>,
    /// How many projects SPOOL.md lists.
    pub project_count: usize,
    pub synced_at: i64,
    pub sync_note: Option<String>,
    pub sync_by: Option<String>,
    pub state: Vec<StateNow>,
    /// A state file changed since the last sync: the folder has moved ahead of the project.
    pub ahead: bool,
    /// Every other change since the sync (only with a full look).
    pub changes: Vec<Change>,
    pub commits: Vec<Commit>,
    pub truncated: bool,
    pub not_listed: Vec<String>,
    /// ok | edited | removed | missing
    pub protocol: &'static str,
    pub git: bool,
    pub exclude: bool,
    pub pointer_claude: bool,
    pub pointer_agents: bool,
    pub has_claude_md: bool,
    pub has_agents_md: bool,
    /// The pointer line is in the file now, whoever put it there.
    pub claude_points: bool,
    pub agents_points: bool,
    pub needs_text: Vec<NeedsText>,
    #[serde(skip)]
    pub cache: BTreeMap<String, CachedText>,
}

fn view_of(conn: &Connection, f: FolderRow, link: WsLink, asked_ws: &str, write: bool, full: bool) -> Result<View, String> {
    let (location, path) = locate(write.then_some(conn), &f);
    let snap = Snapshot::parse(&f.snapshot);
    let t = tree(conn)?;
    let l = listed(conn, &f.id)?;
    let path_text = path.to_string_lossy().into_owned();
    let mut v = View {
        folder_id: f.id.clone(),
        workspace: t.title.get(&link.workspace_id).cloned().unwrap_or_default(),
        inherited: asked_ws != link.workspace_id,
        workspace_id: link.workspace_id.clone(),
        short: short_path(&path_text),
        name: path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_else(|| path_text.clone()),
        path: path_text,
        location,
        primary_id: l.primary.as_ref().map(|(id, _)| id.clone()),
        primary_title: l.primary.map(|(_, t)| t),
        project_count: l.groups.iter().map(|g| g.projects.len()).sum(),
        synced_at: f.synced_at,
        sync_note: snap.note.clone(),
        sync_by: snap.by.clone(),
        state: Vec::new(),
        ahead: false,
        changes: Vec::new(),
        commits: Vec::new(),
        truncated: false,
        not_listed: Vec::new(),
        protocol: "missing",
        git: false,
        exclude: f.git_exclude,
        pointer_claude: f.pointer_claude,
        pointer_agents: f.pointer_agents,
        has_claude_md: false,
        has_agents_md: false,
        claude_points: false,
        agents_points: false,
        needs_text: Vec::new(),
        cache: parse_cache(&f.state_cache),
    };
    if !matches!(location, "in_place" | "moved") {
        return Ok(v);
    }
    v.state = link.state_files.iter().map(|s| state_now(&path, s, &snap)).collect();
    v.ahead = v.state.iter().any(|s| s.changed);
    v.protocol = protocol_state(&path, f.protocol_hash.as_deref());
    v.has_claude_md = path.join("CLAUDE.md").is_file();
    v.has_agents_md = path.join("AGENTS.md").is_file();
    let has_line = |file: &str, lines: &[&str]| {
        std::fs::read_to_string(path.join(file)).is_ok_and(|t| t.lines().any(|l| lines.contains(&l.trim())))
    };
    v.claude_points = has_line("CLAUDE.md", &[CLAUDE_POINTER]);
    v.agents_points = has_line("AGENTS.md", &[AGENTS_POINTER_ZH, AGENTS_POINTER_EN]);
    for s in &v.state {
        let Some(rel) = &s.path else { continue };
        if matches!(ext_of(rel).as_str(), "docx" | "pdf") {
            let Ok((file, _)) = checked_user_file(&path, Path::new(rel)) else { continue };
            let fresh = stamp(&file)
                .is_some_and(|(size, mtime)| v.cache.get(rel).is_some_and(|c| c.size == size && c.mtime == mtime));
            if !fresh {
                v.needs_text.push(NeedsText { rel: rel.clone(), path: file.to_string_lossy().into_owned() });
            }
        }
    }
    let repo = Repo::find(&path);
    v.git = repo.is_some();
    if full {
        let listing = list_folder(&path);
        let state_paths: Vec<&str> = v.state.iter().filter_map(|s| s.path.as_deref()).collect();
        v.changes = changes_since(&listing, &snap).into_iter().filter(|c| !state_paths.contains(&c.path.as_str())).collect();
        v.truncated = listing.truncated;
        v.not_listed = listing.not_listed;
        v.commits = repo.map(|r| r.commits_since(f.synced_at)).unwrap_or_default();
    }
    Ok(v)
}

/// Metadata-only handoff to a desktop client's own file permissions. Unlike `view`, this
/// does not inspect state-file bodies or protocol text and never updates a moved path.
pub(crate) fn linked_root_for_thread(conn: &Connection, thread_id: &str) -> Result<Option<PathBuf>, String> {
    let ws: Option<String> = conn.query_row(
        "SELECT workspace_id FROM threads WHERE id = ?1 AND private = 0 AND deleted_at IS NULL",
        [thread_id], |r| r.get(0),
    ).optional().map_err(|e| e.to_string())?;
    let Some(ws) = ws else { return Ok(None) };
    let Some((f, _)) = link_of_workspace(conn, &ws)? else { return Ok(None) };
    let (location, path) = locate(None, &f);
    Ok(matches!(location, "in_place" | "moved").then_some(path))
}

/// The folder a project falls under. `full`: list the whole folder (the card, get_folder_status);
/// without it only the state files are looked at — cheap enough for list_threads.
pub(crate) fn view(conn: &Connection, thread_id: &str, write: bool, full: bool) -> Result<Option<View>, String> {
    let ws: Option<String> = conn
        .query_row("SELECT workspace_id FROM threads WHERE id = ?1 AND deleted_at IS NULL", [thread_id], |r| r.get(0))
        .optional()
        .map_err(|e| e.to_string())?;
    let Some(ws) = ws else { return Ok(None) };
    match link_of_workspace(conn, &ws)? {
        Some((f, l)) => view_of(conn, f, l, &ws, write, full).map(Some),
        None => Ok(None),
    }
}

/// The folder a workspace falls under (its own, or the nearest one above).
pub(crate) fn view_workspace(conn: &Connection, workspace_id: &str, write: bool, full: bool) -> Result<Option<View>, String> {
    match link_of_workspace(conn, workspace_id)? {
        Some((f, l)) => view_of(conn, f, l, workspace_id, write, full).map(Some),
        None => Ok(None),
    }
}

/// The text of one state file for an AI: straight from the disk for Markdown and plain text, from
/// what the GUI extracted for docx / pdf — only while that is still the file's current version.
/// (text, cut short?) — None when there is no text to give.
pub(crate) fn state_text(v: &View, rel: &str) -> Option<(String, bool)> {
    if !has_state_text(rel) || !v.state.iter().any(|s| s.path.as_deref() == Some(rel)) {
        return None;
    }
    // Recheck every read, including a View obtained before a file was replaced with a symlink.
    let (p, _) = checked_user_file(Path::new(&v.path), Path::new(rel)).ok()?;
    let full = if is_plain(rel) {
        String::from_utf8_lossy(&std::fs::read(&p).ok()?).into_owned()
    } else {
        let (size, mtime) = stamp(&p)?;
        let c = v.cache.get(rel).filter(|c| c.size == size && c.mtime == mtime)?;
        c.text.clone()
    };
    let cut = full.chars().count() > STATE_TEXT_CAP;
    Some((if cut { full.chars().take(STATE_TEXT_CAP).collect() } else { full }, cut))
}

/// Per link: has its folder moved ahead (a state file of the link changed since the sync)?
fn ahead_by_link(conn: &Connection, links: &[WsLink]) -> Result<HashMap<String, (String, usize)>, String> {
    let mut out = HashMap::new();
    for l in links {
        let Some(f) = folder_by_id(conn, &l.folder_id)? else { continue };
        let (location, path) = locate(None, &f);
        let changed = if matches!(location, "in_place" | "moved") {
            let snap = Snapshot::parse(&f.snapshot);
            l.state_files.iter().filter(|s| state_now(&path, s, &snap).changed).count()
        } else {
            0
        };
        out.insert(l.workspace_id.clone(), (short_path(&path.to_string_lossy()), changed));
    }
    Ok(out)
}

/// Every live project and its folder (shortened) with how many of the link's state files changed
/// since the sync — list_threads' two fields, and the weekly automatic follow-up's check. The
/// folders are looked at once each, however many projects share them.
pub(crate) fn thread_folders(conn: &Connection) -> Result<HashMap<String, (String, usize)>, String> {
    let links = all_links(conn)?;
    if links.is_empty() {
        return Ok(HashMap::new());
    }
    let per_link = ahead_by_link(conn, &links)?;
    let by_ws = links_by_ws(links);
    let t = tree(conn)?;
    let mut stmt = conn
        .prepare("SELECT id, workspace_id FROM threads WHERE deleted_at IS NULL")
        .map_err(|e| e.to_string())?;
    let threads: Vec<(String, String)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;
    Ok(threads
        .into_iter()
        .filter_map(|(id, ws)| {
            let l = t.nearest(&ws, &by_ws)?;
            per_link.get(&l.workspace_id).map(|v| (id, v.clone()))
        })
        .collect())
}

/// Projects whose folder has moved ahead — the weekly automatic follow-up waits for them (P9Y-b).
pub(crate) fn ahead_threads(conn: &Connection) -> Result<Vec<String>, String> {
    let mut ids: Vec<String> = thread_folders(conn)?.into_iter().filter(|(_, (_, n))| *n > 0).map(|(id, _)| id).collect();
    ids.sort();
    Ok(ids)
}

/// Linked workspaces, for the sidebar's mark beside their names: (workspace id, folder shortened,
/// moved ahead).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LinkedWorkspace {
    pub workspace_id: String,
    pub short: String,
    pub ahead: bool,
}

pub(crate) fn linked_workspaces(conn: &Connection) -> Result<Vec<LinkedWorkspace>, String> {
    let links = all_links(conn)?;
    let per_link = ahead_by_link(conn, &links)?;
    Ok(links
        .iter()
        .filter_map(|l| {
            per_link.get(&l.workspace_id).map(|(short, n)| LinkedWorkspace {
                workspace_id: l.workspace_id.clone(),
                short: short.clone(),
                ahead: *n > 0,
            })
        })
        .collect())
}

// ---------------------------------------------------------------------------------------------
// What the GUI does with a link.
// ---------------------------------------------------------------------------------------------

/// What the connect steps need to know about a folder before anything is written.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Inspect {
    pub path: String,
    pub short: String,
    pub name: String,
    pub git: bool,
    pub has_claude_md: bool,
    pub has_agents_md: bool,
    pub has_protocol: bool,
    /// Workspaces already linked to this very folder: this one gets added to their SPOOL.md.
    pub linked_to: Vec<String>,
    /// A linked folder above this one / below it, shortened.
    pub parent: Option<String>,
    pub children: Vec<String>,
    pub candidates: Vec<Candidate>,
    pub files: usize,
    pub truncated: bool,
    pub not_listed: Vec<String>,
}

pub(crate) fn inspect(conn: &Connection, path: &str) -> Result<Inspect, String> {
    let root = real_folder(path)?;
    let listing = list_folder(&root);
    let t = tree(conn)?;
    let linked_to = match existing_folder(conn, &root)? {
        Some(f) => all_links(conn)?
            .into_iter()
            .filter(|l| l.folder_id == f.id)
            .filter_map(|l| t.title.get(&l.workspace_id).cloned())
            .collect(),
        None => Vec::new(),
    };
    let mut stmt = conn.prepare("SELECT path FROM folders").map_err(|e| e.to_string())?;
    let paths: Vec<String> = stmt
        .query_map([], |r| r.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;
    let parent = paths
        .iter()
        .filter(|p| Path::new(p) != root && root.starts_with(p))
        .max_by_key(|p| p.len())
        .map(|p| short_path(p));
    let children = paths
        .iter()
        .filter(|p| Path::new(p) != root && Path::new(p).starts_with(&root))
        .map(|p| short_path(p))
        .collect();
    let text = root.to_string_lossy().into_owned();
    Ok(Inspect {
        short: short_path(&text),
        name: root.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_else(|| text.clone()),
        path: text,
        git: Repo::find(&root).is_some(),
        has_claude_md: root.join("CLAUDE.md").is_file(),
        has_agents_md: root.join("AGENTS.md").is_file(),
        has_protocol: root.join(PROTOCOL_FILE).is_file(),
        linked_to,
        parent,
        children,
        candidates: candidates(&listing),
        files: listing.files.len(),
        truncated: listing.truncated,
        not_listed: listing.not_listed,
    })
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ConnectArgs {
    pub workspace_id: String,
    pub path: String,
    pub state_files: Vec<String>,
    /// Only for a folder nothing is linked to yet: a later link shares the first one's answers.
    pub git_exclude: bool,
    pub pointer_claude: bool,
    pub pointer_agents: bool,
}

/// Link a workspace to a folder (task book §3.1 – §3.5 and §8). One transaction: if writing the
/// folder's SPOOL.md fails, nothing is recorded.
pub(crate) fn connect(conn: &mut Connection, a: &ConnectArgs, lang: Lang, backups: &Path, now: i64) -> Result<(), String> {
    let live: bool = conn
        .query_row("SELECT COUNT(*) > 0 FROM workspaces WHERE id = ?1 AND deleted_at IS NULL", [&a.workspace_id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if !live {
        return Err("no_workspace".into());
    }
    if all_links(conn)?.iter().any(|l| l.workspace_id == a.workspace_id) {
        return Err("already_linked".into());
    }
    let root = real_folder(&a.path)?;
    let specs = check_specs(&a.state_files)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let (f, fresh) = match existing_folder(&tx, &root)? {
        Some(f) => (f, false),
        None => {
            let id = crate::mcp::new_id()?;
            let snap = take_snapshot(&root, &specs, None, None);
            tx.execute(
                "INSERT INTO main.folders (id, path, identity, snapshot, synced_at, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
                params![
                    id,
                    root.to_string_lossy(),
                    file_identity::record(&root),
                    serde_json::to_string(&snap).map_err(|e| e.to_string())?,
                    now
                ],
            )
            .map_err(|e| e.to_string())?;
            (folder_by_id(&tx, &id)?.ok_or("no_folder")?, true)
        }
    };
    tx.execute(
        "INSERT INTO main.workspace_folders (workspace_id, folder_id, primary_thread_id, state_files, created_at)
         VALUES (?1, ?2, NULL, ?3, ?4)",
        params![a.workspace_id, f.id, serde_json::to_string(&specs).map_err(|e| e.to_string())?, now],
    )
    .map_err(|e| e.to_string())?;
    if !fresh {
        add_state_marks(&tx, &f, &root, &specs)?;
    }
    let f = folder_by_id(&tx, &f.id)?.ok_or("no_folder")?;
    regenerate(&tx, &f, &root, if fresh { Mode::Create } else { Mode::Update }, lang, backups)?;
    if fresh {
        let exclude = match (a.git_exclude, Repo::find(&root)) {
            (true, Some(repo)) => add_line(&repo.exclude_path(), &repo.exclude_line(&root), true, backups, &f.id)?,
            _ => false,
        };
        let claude = a.pointer_claude && add_line(&root.join("CLAUDE.md"), CLAUDE_POINTER, false, backups, &f.id)?;
        let agents = a.pointer_agents && add_line(&root.join("AGENTS.md"), agents_pointer(lang), false, backups, &f.id)?;
        tx.execute(
            "UPDATE main.folders SET git_exclude = ?1, pointer_claude = ?2, pointer_agents = ?3 WHERE id = ?4",
            params![exclude, claude, agents, f.id],
        )
        .map_err(|e| e.to_string())?;
        // Spool's own line in CLAUDE.md / AGENTS.md is not the folder moving on.
        restamp(&tx, &f.id, &root, &["CLAUDE.md", "AGENTS.md"])?;
    }
    // A sub-workspace linked to a folder of its own takes its projects out of the parent's.
    refresh_all(&tx, lang, backups)?;
    tx.commit().map_err(|e| e.to_string())
}

/// After Spool itself wrote into one of these files, record it in the snapshot as it is now —
/// a line Spool added must not come back as a change the folder made.
fn restamp(conn: &Connection, folder_id: &str, root: &Path, rels: &[&str]) -> Result<(), String> {
    let Some(f) = folder_by_id(conn, folder_id)? else { return Ok(()) };
    let mut snap = Snapshot::parse(&f.snapshot);
    for rel in rels {
        if let (Some((size, mtime)), true) = (stamp(&on_disk(root, rel)), snap.files.contains_key(*rel)) {
            snap.files.insert(rel.to_string(), [size, mtime]);
        }
    }
    conn.execute(
        "UPDATE main.folders SET snapshot = ?1 WHERE id = ?2",
        params![serde_json::to_string(&snap).map_err(|e| e.to_string())?, folder_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// 「已经对过了」 for one folder: as it is now becomes the point it is measured from (§3.6 a).
fn mark_folder(conn: &Connection, f: &FolderRow, by: &str, note: Option<&str>, now: i64) -> Result<(), String> {
    let path = PathBuf::from(&f.path);
    if !path.is_dir() {
        return Err("folder_missing".into());
    }
    let mut specs: Vec<String> = Vec::new();
    for l in all_links(conn)?.iter().filter(|l| l.folder_id == f.id) {
        for s in &l.state_files {
            if !specs.contains(s) {
                specs.push(s.clone());
            }
        }
    }
    let snap = take_snapshot(&path, &specs, Some(by), note);
    conn.execute(
        "UPDATE main.folders SET snapshot = ?1, synced_at = ?2 WHERE id = ?3",
        params![serde_json::to_string(&snap).map_err(|e| e.to_string())?, now, f.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// From MCP: the folder of the project the AI is working on. `by`: `<client> · MCP`.
pub(crate) fn mark_synced(conn: &Connection, thread_id: &str, by: &str, note: Option<&str>, now: i64) -> Result<(), String> {
    let (f, _) = link_of_thread(conn, thread_id)?.ok_or("no_link")?;
    mark_folder(conn, &f, by, note, now)
}

/// From the GUI (the card on a project or on a workspace page): the linked workspace's folder.
pub(crate) fn mark_synced_workspace(conn: &Connection, workspace_id: &str, now: i64) -> Result<(), String> {
    let (f, _) = own_link(conn, workspace_id)?;
    mark_folder(conn, &f, "user", None, now)
}

pub(crate) fn set_state_files(conn: &Connection, workspace_id: &str, specs: &[String], lang: Lang, backups: &Path) -> Result<(), String> {
    let (f, _) = own_link(conn, workspace_id)?;
    let specs = check_specs(specs)?;
    conn.execute(
        "UPDATE main.workspace_folders SET state_files = ?1 WHERE workspace_id = ?2",
        params![serde_json::to_string(&specs).map_err(|e| e.to_string())?, workspace_id],
    )
    .map_err(|e| e.to_string())?;
    let path = PathBuf::from(&f.path);
    if path.is_dir() {
        add_state_marks(conn, &f, &path, &specs)?;
        let f = folder_by_id(conn, &f.id)?.ok_or("no_folder")?;
        regenerate(conn, &f, &path, Mode::Update, lang, backups)?;
    }
    Ok(())
}

pub(crate) fn set_primary(conn: &Connection, workspace_id: &str, thread_id: &str, lang: Lang, backups: &Path) -> Result<(), String> {
    let (f, _) = own_link(conn, workspace_id)?;
    let (chosen, _) = link_of_thread(conn, thread_id)?.ok_or("no_project")?;
    if chosen.id != f.id || !members(conn)?.iter().any(|m| m.id == thread_id) {
        return Err("no_project".into());
    }
    conn.execute(
        "UPDATE main.workspace_folders SET primary_thread_id = ?1 WHERE folder_id = ?2",
        params![thread_id, f.id],
    )
    .map_err(|e| e.to_string())?;
    let path = PathBuf::from(&f.path);
    if path.is_dir() {
        regenerate(conn, &f, &path, Mode::Update, lang, backups)?;
    }
    Ok(())
}

/// Unlink a workspace (task book §3.2 「断开时」). The last link out takes the folder row with it;
/// `remove` then also takes Spool's section out of SPOOL.md and — once that file is gone — the
/// lines Spool wrote, each only while it is still exactly as written.
pub(crate) fn disconnect(conn: &Connection, workspace_id: &str, remove: bool, lang: Lang, backups: &Path) -> Result<(), String> {
    let Ok((f, _)) = own_link(conn, workspace_id) else { return Ok(()) };
    conn.execute("DELETE FROM main.workspace_folders WHERE workspace_id = ?1", [workspace_id]).map_err(|e| e.to_string())?;
    let path = PathBuf::from(&f.path);
    if all_links(conn)?.iter().any(|l| l.folder_id == f.id) {
        // Its projects may now fall under a parent's folder — every folder is rewritten.
        return refresh_all(conn, lang, backups);
    }
    // Its projects may now fall under a parent's folder.
    refresh_all(conn, lang, backups)?;
    if remove && path.is_dir() {
        let kept = remove_protocol(&path, backups, &f.id)?;
        if !kept {
            if f.pointer_claude {
                remove_line(&path.join("CLAUDE.md"), &[CLAUDE_POINTER], backups, &f.id)?;
            }
            if f.pointer_agents {
                remove_line(&path.join("AGENTS.md"), &[AGENTS_POINTER_ZH, AGENTS_POINTER_EN], backups, &f.id)?;
            }
            if let (true, Some(repo)) = (f.git_exclude, Repo::find(&path)) {
                remove_line(&repo.exclude_path(), &[repo.exclude_line(&path).as_str()], backups, &f.id)?;
            }
        }
    }
    conn.execute("DELETE FROM main.folders WHERE id = ?1", [&f.id]).map_err(|e| e.to_string())?;
    Ok(())
}

/// A project went private (task book §3.7): its folder's SPOOL.md is rewritten without it, over an
/// edit of the user's too (backed up first) — a private project's name in a file every AI in that
/// folder reads is the one outcome this must not leave. Back to public: an ordinary refresh.
pub(crate) fn privacy_changed(conn: &Connection, thread_id: &str, lang: Lang, backups: &Path) -> Result<(), String> {
    let private: Option<i64> = conn
        .query_row("SELECT private FROM threads WHERE id = ?1", [thread_id], |r| r.get(0))
        .optional()
        .map_err(|e| e.to_string())?;
    let Some((f, _)) = link_of_thread(conn, thread_id)? else { return Ok(()) };
    let (location, path) = locate(Some(conn), &f);
    if !matches!(location, "in_place" | "moved") {
        return if private == Some(1) { Err("folder_missing".into()) } else { Ok(()) };
    }
    let mode = if private == Some(1) { Mode::Force } else { Mode::Update };
    regenerate(conn, &f, &path, mode, lang, backups)?;
    Ok(())
}

/// Rewrite every folder's SPOOL.md for the projects as they are now — after a project is added,
/// renamed, moved, finished, deleted or brought back, a workspace renamed, or the language switched.
/// Only where Spool's section is still as it left it.
pub(crate) fn refresh_all(conn: &Connection, lang: Lang, backups: &Path) -> Result<(), String> {
    let mut stmt = conn.prepare("SELECT id FROM folders").map_err(|e| e.to_string())?;
    let ids: Vec<String> = stmt
        .query_map([], |r| r.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;
    for id in ids {
        let Some(f) = folder_by_id(conn, &id)? else { continue };
        let path = PathBuf::from(&f.path);
        if path.is_dir() {
            regenerate(conn, &f, &path, Mode::Update, lang, backups)?;
        }
    }
    Ok(())
}

/// 「换成新的」 over an edit / 「重新写一份」 after the section or the file was removed.
pub(crate) fn rewrite_protocol(conn: &Connection, workspace_id: &str, lang: Lang, backups: &Path) -> Result<(), String> {
    let (f, _) = own_link(conn, workspace_id)?;
    let path = PathBuf::from(&f.path);
    if !path.is_dir() {
        return Err("folder_missing".into());
    }
    let mode = if path.join(PROTOCOL_FILE).is_file() { Mode::Force } else { Mode::Create };
    regenerate(conn, &f, &path, mode, lang, backups)?;
    Ok(())
}

/// What 「看差别」 shows: Spool's section as the file has it now, and as Spool would write it.
pub(crate) fn protocol_diff(conn: &Connection, workspace_id: &str, lang: Lang) -> Result<(String, String), String> {
    let (f, _) = own_link(conn, workspace_id)?;
    let path = PathBuf::from(&f.path);
    let l = listed(conn, &f.id)?;
    let next = protocol_block(lang, &l.groups, &l.specs, parent_protocol(conn, &f.id, &path)?.as_deref());
    Ok((current_block(&path).unwrap_or_default(), next))
}

/// The user's 「重新选位置」 for a folder Spool lost.
pub(crate) fn relocate(conn: &Connection, workspace_id: &str, new_path: &str) -> Result<(), String> {
    let (f, _) = own_link(conn, workspace_id)?;
    let root = real_folder(new_path)?;
    conn.execute(
        "UPDATE main.folders SET path = ?1, identity = ?2 WHERE id = ?3",
        params![root.to_string_lossy(), file_identity::record(&root), f.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// The GUI extracted a docx / pdf state file: keep its text for the MCP server, against the
/// file's size and time now. Entries for files that are no longer state files are dropped.
pub(crate) fn cache_text(conn: &Connection, folder_id: &str, rel: &str, text: &str) -> Result<(), String> {
    let f = folder_by_id(conn, folder_id)?.ok_or("no_link")?;
    let path = PathBuf::from(&f.path);
    if !matches!(ext_of(rel).as_str(), "docx" | "pdf") {
        return Err("bad_spec".into());
    }
    let (file, _) = checked_user_file(&path, Path::new(rel))?;
    let (size, mtime) = stamp(&file).ok_or("missing")?;
    let live: Vec<String> = listed(conn, &f.id)?.specs.iter().filter_map(|s| resolve_spec(&path, s)).collect();
    let mut cache = parse_cache(&f.state_cache);
    cache.retain(|k, _| live.contains(k));
    if live.iter().any(|l| l == rel) {
        cache.insert(rel.to_string(), CachedText { size, mtime, text: text.to_string() });
    }
    conn.execute(
        "UPDATE main.folders SET state_cache = ?1 WHERE id = ?2",
        params![serde_json::to_string(&cache).map_err(|e| e.to_string())?, f.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// The two pointer lines, from 「让 AI 读到它」 on a linked workspace.
pub(crate) fn set_pointers(conn: &Connection, workspace_id: &str, claude: bool, agents: bool, lang: Lang, backups: &Path) -> Result<(), String> {
    let (f, _) = own_link(conn, workspace_id)?;
    let root = PathBuf::from(&f.path);
    // Unticking takes the line out whoever wrote it — the user just asked for exactly that.
    let claude_now = if claude {
        add_line(&root.join("CLAUDE.md"), CLAUDE_POINTER, false, backups, &f.id)? || f.pointer_claude
    } else {
        remove_line(&root.join("CLAUDE.md"), &[CLAUDE_POINTER], backups, &f.id)?;
        false
    };
    let agents_now = if agents {
        add_line(&root.join("AGENTS.md"), agents_pointer(lang), false, backups, &f.id)? || f.pointer_agents
    } else {
        remove_line(&root.join("AGENTS.md"), &[AGENTS_POINTER_ZH, AGENTS_POINTER_EN], backups, &f.id)?;
        false
    };
    conn.execute(
        "UPDATE main.folders SET pointer_claude = ?1, pointer_agents = ?2 WHERE id = ?3",
        params![claude_now, agents_now, f.id],
    )
    .map_err(|e| e.to_string())?;
    restamp(conn, &f.id, &root, &["CLAUDE.md", "AGENTS.md"])
}

/// The 「全局说明里加一句」 option (task book §3.4): the setting the one-click hookup reads.
pub(crate) fn global_hint_on(dir: &Path) -> bool {
    std::fs::read_to_string(dir.join("settings.json"))
        .ok()
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok())
        .and_then(|v| v.get("folderGlobalHint").and_then(serde_json::Value::as_bool))
        .unwrap_or(false)
}

// ---------------------------------------------------------------------------------------------
// Tauri commands. ⚠️ All `(async)`: they walk folders and write files — ⛔ never on the main thread
// (memory `tauri-sync-commands-freeze-ui`). A workspace id passed to them is the LINKED workspace
// (a view's `workspaceId`), except where it says otherwise.
// ---------------------------------------------------------------------------------------------

/// The language SPOOL.md is written in, and the folder backups go under.
fn context() -> Result<(Lang, PathBuf), String> {
    let dir = crate::mcp::app_data_dir().ok_or("no_data_dir")?;
    crate::mcp::refresh_lang(&dir);
    Ok((crate::mcp::current_lang(), dir))
}

#[tauri::command(async)]
pub fn folder_inspect(app: tauri::AppHandle, path: String) -> Result<Inspect, String> {
    let conn = crate::images::open_library(&app)?;
    inspect(&conn, &path)
}

#[tauri::command(async)]
pub fn folder_state_file_choice(root_path: String, file_path: String) -> Result<Candidate, String> {
    state_file_choice(&root_path, &file_path)
}

#[tauri::command(async)]
pub fn folder_connect(app: tauri::AppHandle, args: ConnectArgs) -> Result<(), String> {
    let (lang, dir) = context()?;
    let mut conn = crate::images::open_library(&app)?;
    connect(&mut conn, &args, lang, &dir, now_ms())
}

/// A project's right rail. None = its workspace (and every one above) is not linked.
#[tauri::command(async)]
pub fn folder_view(app: tauri::AppHandle, thread_id: String) -> Result<Option<View>, String> {
    let conn = crate::images::open_library(&app)?;
    view(&conn, &thread_id, true, true)
}

/// A workspace page: any workspace — the view says whether the link is its own or one above.
#[tauri::command(async)]
pub fn folder_view_workspace(app: tauri::AppHandle, workspace_id: String) -> Result<Option<View>, String> {
    let conn = crate::images::open_library(&app)?;
    view_workspace(&conn, &workspace_id, true, true)
}

#[tauri::command(async)]
pub fn folder_mark_synced(app: tauri::AppHandle, workspace_id: String) -> Result<(), String> {
    let conn = crate::images::open_library(&app)?;
    mark_synced_workspace(&conn, &workspace_id, now_ms())
}

#[tauri::command(async)]
pub fn folder_set_state_files(app: tauri::AppHandle, workspace_id: String, state_files: Vec<String>) -> Result<(), String> {
    let (lang, dir) = context()?;
    let conn = crate::images::open_library(&app)?;
    set_state_files(&conn, &workspace_id, &state_files, lang, &dir)
}

#[tauri::command(async)]
pub fn folder_set_primary(app: tauri::AppHandle, workspace_id: String, thread_id: String) -> Result<(), String> {
    let (lang, dir) = context()?;
    let conn = crate::images::open_library(&app)?;
    set_primary(&conn, &workspace_id, &thread_id, lang, &dir)
}

#[tauri::command(async)]
pub fn folder_disconnect(app: tauri::AppHandle, workspace_id: String, remove: bool) -> Result<(), String> {
    let (lang, dir) = context()?;
    let conn = crate::images::open_library(&app)?;
    disconnect(&conn, &workspace_id, remove, lang, &dir)
}

/// After a project's 「设为私密 / 取消私密」 — the project's own id.
#[tauri::command(async)]
pub fn folder_privacy_changed(app: tauri::AppHandle, thread_id: String) -> Result<(), String> {
    let (lang, dir) = context()?;
    let conn = crate::images::open_library(&app)?;
    privacy_changed(&conn, &thread_id, lang, &dir)
}

#[tauri::command(async)]
pub fn folder_refresh_protocols(app: tauri::AppHandle) -> Result<(), String> {
    let (lang, dir) = context()?;
    let conn = crate::images::open_library(&app)?;
    refresh_all(&conn, lang, &dir)
}

#[tauri::command(async)]
pub fn folder_rewrite_protocol(app: tauri::AppHandle, workspace_id: String) -> Result<(), String> {
    let (lang, dir) = context()?;
    let conn = crate::images::open_library(&app)?;
    rewrite_protocol(&conn, &workspace_id, lang, &dir)
}

#[tauri::command(async)]
pub fn folder_protocol_diff(app: tauri::AppHandle, workspace_id: String) -> Result<(String, String), String> {
    let (lang, _) = context()?;
    let conn = crate::images::open_library(&app)?;
    protocol_diff(&conn, &workspace_id, lang)
}

#[tauri::command(async)]
pub fn folder_relocate(app: tauri::AppHandle, workspace_id: String, path: String) -> Result<(), String> {
    let conn = crate::images::open_library(&app)?;
    relocate(&conn, &workspace_id, &path)
}

#[tauri::command(async)]
pub fn folder_cache_text(app: tauri::AppHandle, folder_id: String, rel: String, text: String) -> Result<(), String> {
    let conn = crate::images::open_library(&app)?;
    cache_text(&conn, &folder_id, &rel, &text)
}

/// P9Y-b: projects whose weekly automatic follow-up waits until someone says 「已经对过了」.
#[tauri::command(async)]
pub fn folder_ahead_threads(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let conn = crate::images::open_library(&app)?;
    ahead_threads(&conn)
}

/// The sidebar's mark beside a linked workspace.
#[tauri::command(async)]
pub fn folder_linked_workspaces(app: tauri::AppHandle) -> Result<Vec<LinkedWorkspace>, String> {
    let conn = crate::images::open_library(&app)?;
    linked_workspaces(&conn)
}

#[tauri::command(async)]
pub fn folder_set_pointers(app: tauri::AppHandle, workspace_id: String, claude: bool, agents: bool) -> Result<(), String> {
    let (lang, dir) = context()?;
    let conn = crate::images::open_library(&app)?;
    set_pointers(&conn, &workspace_id, claude, agents, lang, &dir)
}

/// 「全局说明里加一句」 (task book §3.4): the setting itself is saved by the settings store; this
/// rewrites the instruction files of the clients already set up through one-click hookup.
#[tauri::command(async)]
pub fn folder_global_hint(on: bool) -> Result<Vec<String>, String> {
    context()?;
    Ok(crate::mcp::refresh_client_guidance(on).into_iter().map(str::to_string).collect())
}

/// Which of these projects fall under a linked folder, and where (shortened) — for the 「设为私密」
/// confirmation, which says the project will come out of that SPOOL.md. The library only.
#[tauri::command(async)]
pub fn folder_linked_paths(app: tauri::AppHandle, thread_ids: Vec<String>) -> Result<Vec<(String, String)>, String> {
    let conn = crate::images::open_library(&app)?;
    let mut out = Vec::new();
    for id in thread_ids {
        if let Some((f, _)) = link_of_thread(&conn, &id)? {
            out.push((id, short_path(&f.path)));
        }
    }
    Ok(out)
}

/// P9Y-c: a file's size and modified time, recorded with its extracted text.
#[tauri::command(async)]
pub fn file_stamp(path: String) -> Option<(i64, i64)> {
    stamp(Path::new(&path))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("spool-folder-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        plain(d.canonicalize().unwrap())
    }

    fn write(root: &Path, rel: &str, text: &str) {
        let p = on_disk(root, rel);
        std::fs::create_dir_all(p.parent().unwrap()).unwrap();
        std::fs::write(p, text).unwrap();
    }

    /// Push a file's modified time `secs` into the future, so a change made in the same
    /// millisecond as the snapshot still reads as a change.
    fn touch_later(root: &Path, rel: &str, secs: u64) {
        let f = std::fs::File::options().write(true).open(on_disk(root, rel)).unwrap();
        f.set_modified(std::time::SystemTime::now() + std::time::Duration::from_secs(secs)).unwrap();
    }

    fn rels(l: &Listing) -> Vec<&str> {
        l.files.iter().map(|f| f.rel.as_str()).collect()
    }

    /// The shape of Flux (task book §5 A1 验收), small.
    fn flux_like(name: &str) -> PathBuf {
        let root = temp(name);
        write(&root, ".git/HEAD", "ref: refs/heads/main\n");
        write(&root, ".git/info/exclude", "# git ls-files --others --exclude-from=.git/info/exclude\n");
        write(
            &root,
            ".gitignore",
            "__pycache__/\n*.py[oc]\nbuild/\n.venv\nCLAUDE.md\nAGENTS.md\nplans/\ndata/\nfrontend/node_modules/\n.DS_Store\n",
        );
        write(&root, "README.md", "# Flux\n");
        write(&root, "CLAUDE.md", "# local notes\n");
        write(&root, "docs/WORK_PLAN_2026-10-02.md", "plan v1\n");
        write(&root, "plans/dissertation/HANDOFF_2026-10-23.md", "handoff 23\n");
        write(&root, "plans/dissertation/HANDOFF_2026-10-15.md", "handoff 15\n");
        write(&root, "plans/dissertation/HANDOFF_PROPOSAL_2026-10-25.md", "not the series\n");
        write(&root, "archive/2026-10-02/docs/HANDOFF_A_2026-09-27.md", "the past\n");
        write(&root, "core/model.py", "x = 1\n");
        write(&root, "core/model.pyc", "bytes");
        write(&root, "frontend/node_modules/lib/index.js", "");
        write(&root, "frontend/src/app.ts", "");
        write(&root, ".venv/lib/site.py", "");
        for i in 0..(IGNORED_DIR_BUDGET + 5) {
            write(&root, &format!("data/runs/{i:04}.txt"), "row");
        }
        root
    }

    #[test]
    fn gitignore_subset_matches_like_git() {
        let mut r = Rules::default();
        r.add_text("*.py[oc]\nbuild/\n/data\nfrontend/node_modules/\n*.log\n!keep.log\n**/cache\ndocs/**/draft.md\n# comment\n", "");
        assert!(r.ignored("core/a.pyc", false));
        assert!(!r.ignored("core/a.py", false));
        assert!(r.ignored("x/build", true), "unanchored folder pattern matches at any depth");
        assert!(!r.ignored("x/build", false), "a trailing / is for folders only");
        assert!(r.ignored("data", true));
        assert!(!r.ignored("sub/data", true), "a leading / ties it to the .gitignore's folder");
        assert!(r.ignored("frontend/node_modules", true));
        assert!(!r.ignored("other/node_modules", true));
        assert!(r.ignored("a/b.log", false));
        assert!(!r.ignored("keep.log", false), "! takes it back");
        assert!(r.ignored("cache", true) && r.ignored("a/b/cache", true));
        assert!(r.ignored("docs/draft.md", false) && r.ignored("docs/a/b/draft.md", false));
        let mut nested = Rules::default();
        nested.add_text("*.tmp\n", "pkg");
        assert!(nested.ignored("pkg/x.tmp", false));
        assert!(!nested.ignored("other/x.tmp", false), "a nested .gitignore only covers its own folder");
    }

    #[test]
    fn listing_keeps_plans_and_drops_data_node_modules_and_hidden() {
        let _home = crate::home_lock();
        let root = flux_like("listing");
        write(&root, PROTOCOL_FILE, "spool");
        let l = list_folder(&root);
        let r = rels(&l);
        assert!(r.contains(&"plans/dissertation/HANDOFF_2026-10-23.md"), "{r:?}");
        assert!(r.contains(&"CLAUDE.md"), "an ignored document is still listed");
        assert!(r.contains(&"core/model.py") && r.contains(&"frontend/src/app.ts"));
        assert!(!r.iter().any(|p| p.starts_with("data/")), "{r:?}");
        assert!(!r.iter().any(|p| p.contains("node_modules") || p.contains(".venv") || p.starts_with(".git")));
        assert!(!r.contains(&"core/model.pyc"), "an ignored non-document is not");
        assert!(!r.contains(&PROTOCOL_FILE), "Spool's own file is not a change of the folder");
        assert_eq!(l.not_listed, vec!["data/".to_string()]);
        assert!(!l.truncated);
    }

    #[test]
    fn a_dated_file_stands_for_its_series() {
        let _home = crate::home_lock();
        let root = flux_like("series");
        assert_eq!(series_spec("plans/dissertation/HANDOFF_2026-10-23.md").as_deref(), Some("plans/dissertation/HANDOFF_*.md"));
        assert_eq!(series_spec("notes/STATUS_20261024.md").as_deref(), Some("notes/STATUS_*.md"));
        assert_eq!(series_spec("README.md"), None);
        assert_eq!(series_spec("build_12345678.md"), None, "eight digits that are not a date");
        let spec = "plans/dissertation/HANDOFF_*.md";
        assert_eq!(resolve_spec(&root, spec).as_deref(), Some("plans/dissertation/HANDOFF_2026-10-23.md"));
        assert!(spec_matches(spec, "plans/dissertation/HANDOFF_2026-10-15.md"));
        assert!(!spec_matches(spec, "plans/dissertation/HANDOFF_PROPOSAL_2026-10-25.md"));
        write(&root, "plans/dissertation/HANDOFF_2026-10-30.md", "newer");
        assert_eq!(resolve_spec(&root, spec).as_deref(), Some("plans/dissertation/HANDOFF_2026-10-30.md"));
        assert_eq!(resolve_spec(&root, "README.md").as_deref(), Some("README.md"));
        assert_eq!(resolve_spec(&root, "gone.md"), None);
    }

    #[test]
    fn candidates_put_the_plan_names_first() {
        let _home = crate::home_lock();
        let root = flux_like("candidates");
        let c = candidates(&list_folder(&root));
        let specs: Vec<&str> = c.iter().map(|c| c.spec.as_str()).collect();
        assert_eq!(&specs[..3], &["README.md", "plans/dissertation/HANDOFF_*.md", "docs/WORK_PLAN_*.md"], "{specs:?}");
        assert!(c[..3].iter().all(|c| c.recommended));
        assert_eq!(c[1].path, "plans/dissertation/HANDOFF_2026-10-23.md");
        assert!(!specs.iter().any(|s| s.starts_with("data/")));
        assert!(c.iter().all(|c| !c.recommended || !c.path.starts_with("archive/")), "{c:?}");
    }

    #[test]
    fn state_files_change_by_content_not_by_touch() {
        let _home = crate::home_lock();
        let root = flux_like("state");
        let specs = vec!["docs/WORK_PLAN_*.md".to_string(), "plans/dissertation/HANDOFF_*.md".to_string()];
        let snap = take_snapshot(&root, &specs, None, None);
        assert!(specs.iter().all(|s| !state_now(&root, s, &snap).changed));
        // Same bytes, new time (a checkout): not a change of plan.
        touch_later(&root, "docs/WORK_PLAN_2026-10-02.md", 5);
        assert!(!state_now(&root, &specs[0], &snap).changed);
        // New bytes.
        write(&root, "docs/WORK_PLAN_2026-10-02.md", "plan v2, after the 21 October proposal\n");
        touch_later(&root, "docs/WORK_PLAN_2026-10-02.md", 10);
        assert!(state_now(&root, &specs[0], &snap).changed);
        // A newer hand-off in the series.
        write(&root, "plans/dissertation/HANDOFF_2026-10-30.md", "next");
        let s = state_now(&root, &specs[1], &snap);
        assert!(s.changed);
        assert_eq!(s.path.as_deref(), Some("plans/dissertation/HANDOFF_2026-10-30.md"));
        // Moved into an archive: gone is a change too.
        std::fs::remove_file(on_disk(&root, "plans/dissertation/HANDOFF_2026-10-30.md")).unwrap();
        std::fs::remove_file(on_disk(&root, "plans/dissertation/HANDOFF_2026-10-23.md")).unwrap();
        std::fs::remove_file(on_disk(&root, "plans/dissertation/HANDOFF_2026-10-15.md")).unwrap();
        let s = state_now(&root, &specs[1], &snap);
        assert!(s.changed && s.path.is_none());
    }

    #[test]
    fn changes_since_the_snapshot() {
        let _home = crate::home_lock();
        let root = flux_like("changes");
        let snap = take_snapshot(&root, &[], None, None);
        write(&root, "core/new.py", "");
        write(&root, "core/model.py", "x = 2\n");
        touch_later(&root, "core/model.py", 5);
        std::fs::remove_file(on_disk(&root, "frontend/src/app.ts")).unwrap();
        let ch = changes_since(&list_folder(&root), &snap);
        let kinds: Vec<(&str, &str)> = ch.iter().map(|c| (c.path.as_str(), c.kind)).collect();
        assert!(kinds.contains(&("core/new.py", "added")), "{kinds:?}");
        assert!(kinds.contains(&("core/model.py", "modified")));
        assert_eq!(kinds.last(), Some(&("frontend/src/app.ts", "deleted")));
        assert_eq!(ch.len(), 3);
    }

    #[test]
    fn commit_titles_after_the_sync_without_the_email() {
        let line = |ts: i64, msg: &str| format!("aaa bbb Ocean <someone@example.com> {ts} +0100\t{msg}");
        let since = 1_792_000_000_000;
        assert_eq!(parse_reflog(&line(1_791_999_999, "commit: before"), since), None);
        assert_eq!(parse_reflog(&line(1_792_000_100, "checkout: moving from a to b"), since), None);
        let c = parse_reflog(&line(1_792_000_100, "commit (amend): Point the work plan at the proposal"), since).unwrap();
        assert_eq!(c, Commit { at: 1_792_000_100_000, title: "Point the work plan at the proposal".into() });
        let root = temp("reflog");
        write(&root, ".git/HEAD", "");
        write(
            &root,
            ".git/logs/HEAD",
            &format!("{}\n{}\n", line(1_792_000_100, "commit: first"), line(1_792_000_200, "commit: second")),
        );
        let repo = Repo { root: root.clone(), git_dir: root.join(".git"), common_dir: root.join(".git") };
        let titles: Vec<String> = repo.commits_since(since).into_iter().map(|c| c.title).collect();
        assert_eq!(titles, vec!["second", "first"]);
        assert!(!format!("{titles:?}").contains("example.com"));
    }

    /// A workspace group, its first project the main one.
    fn group(ws: &str, titles: &[&str]) -> Group {
        Group { workspace: ws.into(), projects: titles.iter().enumerate().map(|(i, t)| (t.to_string(), i == 0)).collect() }
    }

    #[test]
    fn spool_md_names_projects_by_title_grouped_by_workspace() {
        let groups = vec![group("Flux", &["Flux", "FLUX 导师沟通与汇报"]), Group { workspace: "论文".into(), projects: vec![("文献综述".into(), false)] }];
        let zh = protocol_block(Lang::Zh, &groups, &["README.md".into(), "plans/dissertation/HANDOFF_*.md".into()], None);
        assert!(zh.starts_with(BEGIN) && zh.ends_with(END));
        assert!(zh.contains("工作区「Flux」：\n- 〈Flux〉（主项目）\n- 〈FLUX 导师沟通与汇报〉\n"), "{zh}");
        assert!(zh.contains("工作区「论文」：\n- 〈文献综述〉\n"));
        assert!(zh.contains("`plans/dissertation/HANDOFF_*.md`（取日期最新的一份）"));
        assert!(zh.contains("工作区里以后新建的项目也算"));
        assert!(zh.contains("Spool 里和现状文件冲突的内容是历史，不是现状。"));
        assert!(zh.contains("`mark_folder_synced`"));
        let en = protocol_block(Lang::En, &[group("Flux", &["Flux"])], &["README.md".to_string()], Some("../SPOOL.md"));
        assert!(en.contains("- \u{2039}Flux\u{203a}\n"), "one project: no main-project mark\n{en}");
        assert!(en.contains("The folder above has one too: `../SPOOL.md`."));
        assert!(en.contains("is history, not the current state"));
        let empty = protocol_block(Lang::Zh, &[Group { workspace: "空".into(), projects: vec![] }], &[], None);
        assert!(empty.contains("工作区「空」：\n- （这里还没有项目）\n"), "{empty}");
    }

    #[test]
    fn spool_md_never_overwrites_an_edit_or_brings_back_a_removal() {
        let dir = temp("protocol");
        let backups = temp("protocol-backups");
        let one = protocol_block(Lang::Zh, &[group("Flux", &["Flux"])], &[], None);
        let Written::Ok(h1) = write_protocol(&dir, &one, None, Mode::Create, Lang::Zh, &backups, "f1").unwrap() else {
            panic!()
        };
        let text = std::fs::read_to_string(dir.join(PROTOCOL_FILE)).unwrap();
        assert!(text.starts_with(&one) && text.contains("## 你自己的规矩"));
        assert_eq!(protocol_state(&dir, Some(&h1)), "ok");

        // Renamed project, untouched file: rewritten in place, the user's part kept.
        std::fs::write(dir.join(PROTOCOL_FILE), format!("{text}我的规矩：写回用中文。\n")).unwrap();
        let two = protocol_block(Lang::Zh, &[group("Flux", &["Flux 2"])], &[], None);
        let Written::Ok(h2) = write_protocol(&dir, &two, Some(&h1), Mode::Update, Lang::Zh, &backups, "f1").unwrap() else {
            panic!()
        };
        let text = std::fs::read_to_string(dir.join(PROTOCOL_FILE)).unwrap();
        assert!(text.contains("〈Flux 2〉") && text.contains("我的规矩：写回用中文。"));

        // The user edits Spool's section: a refresh leaves it, and the card says so.
        std::fs::write(dir.join(PROTOCOL_FILE), text.replace("只是写代码、改 bug：不用读。", "每次都读。")).unwrap();
        assert_eq!(protocol_state(&dir, Some(&h2)), "edited");
        let three = protocol_block(Lang::Zh, &[group("Flux", &["Flux 3"])], &[], None);
        assert_eq!(write_protocol(&dir, &three, Some(&h2), Mode::Update, Lang::Zh, &backups, "f1").unwrap(), Written::Edited);
        assert!(std::fs::read_to_string(dir.join(PROTOCOL_FILE)).unwrap().contains("每次都读。"));
        // …until the user says 「换成新的」.
        assert!(matches!(write_protocol(&dir, &three, Some(&h2), Mode::Force, Lang::Zh, &backups, "f1").unwrap(), Written::Ok(_)));
        assert!(std::fs::read_to_string(dir.join(PROTOCOL_FILE)).unwrap().contains("〈Flux 3〉"));

        // Section deleted by hand: a refresh does not put it back.
        std::fs::write(dir.join(PROTOCOL_FILE), "只剩我的东西\n").unwrap();
        assert_eq!(protocol_state(&dir, None), "removed");
        assert_eq!(write_protocol(&dir, &three, None, Mode::Update, Lang::Zh, &backups, "f1").unwrap(), Written::Removed);
        std::fs::remove_file(dir.join(PROTOCOL_FILE)).unwrap();
        assert_eq!(write_protocol(&dir, &three, None, Mode::Update, Lang::Zh, &backups, "f1").unwrap(), Written::Missing);
        assert!(!dir.join(PROTOCOL_FILE).exists());

        // ⛔ No backup ever lands in the user's folder.
        let names: Vec<String> =
            std::fs::read_dir(&dir).unwrap().flatten().map(|e| e.file_name().to_string_lossy().into_owned()).collect();
        assert!(names.is_empty(), "{names:?}");
        assert!(std::fs::read_dir(backups.join("folder-backups/f1")).unwrap().count() > 0);
    }

    #[test]
    fn a_line_is_added_once_and_taken_out_only_while_untouched() {
        let dir = temp("lines");
        let backups = temp("lines-backups");
        let file = dir.join("CLAUDE.md");
        std::fs::write(&file, "# rules\nno trailing newline").unwrap();
        assert!(add_line(&file, CLAUDE_POINTER, false, &backups, "f").unwrap());
        assert!(!add_line(&file, CLAUDE_POINTER, false, &backups, "f").unwrap(), "already there");
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "# rules\nno trailing newline\n@SPOOL.md\n");
        assert!(!add_line(&dir.join("AGENTS.md"), "x", false, &backups, "f").unwrap(), "⛔ no AGENTS.md is created");
        assert!(!dir.join("AGENTS.md").exists());
        std::fs::write(&file, "# rules\n@SPOOL.md  please\n").unwrap();
        assert!(!remove_line(&file, &[CLAUDE_POINTER], &backups, "f").unwrap(), "a changed line is the user's");
        std::fs::write(&file, "# rules\n@SPOOL.md\nmore\n").unwrap();
        assert!(remove_line(&file, &[CLAUDE_POINTER], &backups, "f").unwrap());
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "# rules\nmore\n");
    }

    // ----- The library side -----

    fn library() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(include_str!("../../src/lib/db/schema.sql")).unwrap();
        conn.execute_batch(
            "INSERT INTO workspaces (id, title, parent_id, sort_order, created_at, updated_at) VALUES
               ('w1', 'Flux', NULL, 0, 1, 1), ('w2', '升学', NULL, 1, 1, 1), ('w1a', '前端', 'w1', 0, 1, 1);
             INSERT INTO threads (id, workspace_id, title, status, created_at, updated_at) VALUES
               ('t1', 'w1', 'Flux', 'active', 1, 1),
               ('t2', 'w1', 'FLUX 导师沟通与汇报', 'active', 2, 2),
               ('t3', 'w2', '申请进度', 'active', 3, 3),
               ('t4', 'w1a', '界面', 'active', 4, 4),
               ('td', 'w1', '旧方向', 'done', 5, 5);
             INSERT INTO threads (id, workspace_id, title, status, created_at, updated_at, private)
               VALUES ('tp', 'w1', '秘密项目', 'active', 6, 6, 1);",
        )
        .unwrap();
        conn
    }

    fn args(ws: &str, root: &Path, specs: &[&str]) -> ConnectArgs {
        ConnectArgs {
            workspace_id: ws.into(),
            path: root.to_string_lossy().into_owned(),
            state_files: specs.iter().map(|s| s.to_string()).collect(),
            git_exclude: true,
            pointer_claude: true,
            pointer_agents: true,
        }
    }

    fn md(root: &Path) -> String {
        std::fs::read_to_string(root.join(PROTOCOL_FILE)).unwrap_or_default()
    }

    #[test]
    fn a_workspace_brings_all_its_projects_and_its_sub_workspaces() {
        let _home = crate::home_lock();
        let root = flux_like("connect");
        let backups = temp("connect-backups");
        let mut conn = library();
        connect(&mut conn, &args("w1", &root, &["README.md", "plans/dissertation/HANDOFF_*.md"]), Lang::Zh, &backups, 10).unwrap();
        let text = md(&root);
        assert!(text.contains("工作区「Flux」：\n- 〈Flux〉（主项目）\n- 〈FLUX 导师沟通与汇报〉\n\n工作区「前端」：\n- 〈界面〉\n"), "{text}");
        assert!(!text.contains("旧方向"), "⛔ a finished project is not listed");
        assert!(!text.contains("秘密项目"), "⛔ a private project is not listed");
        assert!(!text.contains("申请进度"), "another workspace is not");
        let exclude = std::fs::read_to_string(root.join(".git/info/exclude")).unwrap();
        assert!(exclude.lines().any(|l| l == "/SPOOL.md"), "{exclude}");
        assert!(std::fs::read_to_string(root.join("CLAUDE.md")).unwrap().ends_with("@SPOOL.md\n"));
        assert!(!root.join("AGENTS.md").exists(), "⛔ not created when it was not there");
        assert_eq!(connect(&mut conn, &args("w1", &root, &[]), Lang::Zh, &backups, 30), Err("already_linked".into()));

        // A project and a sub-workspace's project both fall under it; the workspace page sees it too.
        let v = view(&conn, "t4", true, true).unwrap().unwrap();
        assert_eq!((v.location, v.workspace.as_str(), v.inherited, v.protocol), ("in_place", "Flux", true, "ok"));
        assert_eq!((v.primary_title.as_deref(), v.project_count), (Some("Flux"), 3));
        assert!(v.git && v.claude_points && !v.agents_points);
        assert!(v.changes.is_empty(), "{:?}", v.changes);
        assert!(!view(&conn, "t1", true, false).unwrap().unwrap().inherited);
        assert!(view(&conn, "t3", true, false).unwrap().is_none());
        assert!(view_workspace(&conn, "w1a", true, false).unwrap().unwrap().inherited);
        assert!(view_workspace(&conn, "w2", true, false).unwrap().is_none());

        // The plan moves on: every project of the workspace sees it; the sync puts it back.
        write(&root, "plans/dissertation/HANDOFF_2026-10-31.md", "new direction");
        assert!(view(&conn, "t2", true, false).unwrap().unwrap().ahead);
        assert_eq!(ahead_threads(&conn).unwrap(), vec!["t1", "t2", "t4", "td", "tp"]);
        assert_eq!(linked_workspaces(&conn).unwrap().iter().map(|l| (l.workspace_id.as_str(), l.ahead)).collect::<Vec<_>>(), vec![("w1", true)]);
        mark_synced(&conn, "t4", "Claude Code · MCP", Some("把 10-31 的方向写回了 Flux"), 40).unwrap();
        let v = view(&conn, "t1", true, false).unwrap().unwrap();
        assert!(!v.ahead);
        assert_eq!((v.synced_at, v.sync_note.as_deref(), v.sync_by.as_deref()), (40, Some("把 10-31 的方向写回了 Flux"), Some("Claude Code · MCP")));
        assert!(ahead_threads(&conn).unwrap().is_empty());

        // The main project is the user's pick; a new project, a rename, a finish all reach SPOOL.md.
        set_primary(&conn, "w1", "t2", Lang::Zh, &backups).unwrap();
        assert!(md(&root).contains("- 〈Flux〉\n- 〈FLUX 导师沟通与汇报〉（主项目）\n"));
        conn.execute_batch("INSERT INTO threads (id, workspace_id, title, status, created_at, updated_at) VALUES ('t5', 'w1', '伦理申请', 'active', 7, 7);
                            UPDATE threads SET status = 'done' WHERE id = 't1';").unwrap();
        refresh_all(&conn, Lang::Zh, &backups).unwrap();
        let text = md(&root);
        assert!(text.contains("〈伦理申请〉") && !text.contains("- 〈Flux〉"), "{text}");
        // The language follows the app's at every write.
        refresh_all(&conn, Lang::En, &backups).unwrap();
        assert!(md(&root).contains("Workspace \u{201c}Flux\u{201d}:"));
    }

    #[test]
    fn a_sub_workspace_with_its_own_folder_leaves_the_parents() {
        let _home = crate::home_lock();
        let root = flux_like("subws");
        let backups = temp("subws-backups");
        let mut conn = library();
        connect(&mut conn, &args("w1", &root, &[]), Lang::Zh, &backups, 1).unwrap();
        let mut inner = args("w1a", &root.join("frontend"), &[]);
        inner.pointer_claude = false;
        connect(&mut conn, &inner, Lang::Zh, &backups, 2).unwrap();
        assert!(!md(&root).contains("界面"), "{}", md(&root));
        let inner_md = md(&root.join("frontend"));
        assert!(inner_md.contains("上层文件夹还有一份：`../SPOOL.md`") && inner_md.contains("〈界面〉"), "{inner_md}");
        assert!(
            std::fs::read_to_string(root.join(".git/info/exclude")).unwrap().lines().any(|l| l == "/frontend/SPOOL.md"),
            "the inner one is kept out of the same repository"
        );
        assert!(!view(&conn, "t4", true, false).unwrap().unwrap().inherited);
        let i = inspect(&conn, &root.join("frontend").to_string_lossy()).unwrap();
        assert_eq!(i.linked_to, vec!["前端".to_string()]);
        assert!(i.parent.is_some());
    }

    #[test]
    fn two_workspaces_one_folder_one_spool_md() {
        let _home = crate::home_lock();
        let root = flux_like("two");
        let backups = temp("two-backups");
        let mut conn = library();
        connect(&mut conn, &args("w1", &root, &["README.md"]), Lang::Zh, &backups, 1).unwrap();
        let mut second = args("w2", &root, &["docs/WORK_PLAN_*.md"]);
        second.git_exclude = false;
        connect(&mut conn, &second, Lang::Zh, &backups, 2).unwrap();
        assert_eq!(conn.query_row("SELECT COUNT(*) FROM folders", [], |r| r.get::<_, i64>(0)).unwrap(), 1);
        let text = md(&root);
        assert!(text.contains("工作区「Flux」") && text.contains("工作区「升学」：\n- 〈申请进度〉"), "{text}");
        assert!(text.contains("`README.md`") && text.contains("`docs/WORK_PLAN_*.md`"));
        // One protocol means one default write destination, even when it is picked from the
        // second workspace. Both workspace pages and MCP must report the same choice.
        set_primary(&conn, "w2", "t3", Lang::Zh, &backups).unwrap();
        assert_eq!(view_workspace(&conn, "w1", false, false).unwrap().unwrap().primary_id.as_deref(), Some("t3"));
        assert_eq!(view_workspace(&conn, "w2", false, false).unwrap().unwrap().primary_id.as_deref(), Some("t3"));
        assert!(md(&root).contains("〈申请进度〉（主项目）"));
        // If the picked project is finished, fall back across all workspaces of this folder.
        conn.execute("UPDATE threads SET status = 'done' WHERE id IN ('t1', 't2', 't4')", []).unwrap();
        set_primary(&conn, "w2", "t3", Lang::Zh, &backups).unwrap();
        assert_eq!(view_workspace(&conn, "w1", false, false).unwrap().unwrap().primary_id.as_deref(), Some("t3"));
        disconnect(&conn, "w1", true, Lang::Zh, &backups).unwrap();
        let text = md(&root);
        assert!(!text.contains("工作区「Flux」") && text.contains("〈申请进度〉"), "{text}");
        disconnect(&conn, "w2", true, Lang::Zh, &backups).unwrap();
        assert!(!root.join(PROTOCOL_FILE).exists(), "only the stub was left, so the file goes");
        assert!(!std::fs::read_to_string(root.join(".git/info/exclude")).unwrap().contains("SPOOL.md"));
        assert_eq!(std::fs::read_to_string(root.join("CLAUDE.md")).unwrap(), "# local notes\n");
        assert_eq!(conn.query_row("SELECT COUNT(*) FROM folders", [], |r| r.get::<_, i64>(0)).unwrap(), 0);
    }

    #[test]
    fn a_project_going_private_leaves_spool_md_even_over_an_edit() {
        let _home = crate::home_lock();
        let root = flux_like("private");
        let backups = temp("private-backups");
        let mut conn = library();
        connect(&mut conn, &args("w1", &root, &[]), Lang::Zh, &backups, 1).unwrap();
        std::fs::write(root.join(PROTOCOL_FILE), md(&root).replace("只是写代码", "写代码")).unwrap();
        conn.execute("UPDATE threads SET private = 1 WHERE id = 't2'", []).unwrap();
        // An ordinary refresh would not touch an edited section…
        refresh_all(&conn, Lang::Zh, &backups).unwrap();
        assert!(md(&root).contains("FLUX 导师沟通与汇报"));
        // …going private does.
        privacy_changed(&conn, "t2", Lang::Zh, &backups).unwrap();
        let text = md(&root);
        assert!(!text.contains("FLUX 导师沟通与汇报") && text.contains("〈Flux〉"), "{text}");
        assert!(view(&conn, "t2", true, false).unwrap().is_some(), "the GUI still shows the private project its folder");
        // Back to public: back in.
        conn.execute("UPDATE threads SET private = 0 WHERE id = 't2'", []).unwrap();
        privacy_changed(&conn, "t2", Lang::Zh, &backups).unwrap();
        assert!(md(&root).contains("FLUX 导师沟通与汇报"));
    }

    #[test]
    fn a_missing_folder_cannot_silently_keep_a_newly_private_projects_name() {
        let _home = crate::home_lock();
        let root = flux_like("private-missing");
        let backups = temp("private-missing-backups");
        let mut conn = library();
        connect(&mut conn, &args("w1", &root, &[]), Lang::Zh, &backups, 1).unwrap();
        let missing = root.join("not-there").to_string_lossy().into_owned();
        conn.execute("UPDATE folders SET path = ?1, identity = NULL", [missing]).unwrap();
        conn.execute("UPDATE threads SET private = 1 WHERE id = 't2'", []).unwrap();
        assert_eq!(privacy_changed(&conn, "t2", Lang::Zh, &backups), Err("folder_missing".into()));
    }

    #[test]
    #[cfg(any(target_os = "macos", target_os = "windows"))]
    fn moved_folder_counts_follow_its_identity_before_a_gui_view_updates_the_path() {
        let _home = crate::home_lock();
        let root = flux_like("counts-moved");
        let backups = temp("counts-moved-backups");
        let moved = temp("counts-moved-to");
        std::fs::remove_dir_all(&moved).unwrap();
        let mut conn = library();
        connect(&mut conn, &args("w1", &root, &["README.md"]), Lang::Zh, &backups, 1).unwrap();
        std::fs::rename(&root, &moved).unwrap();
        write(&moved, "README.md", "the plan changed after moving");
        let folders = thread_folders(&conn).unwrap();
        assert_eq!(folders.get("t1"), Some(&(short_path(&moved.to_string_lossy()), 1)));
        assert!(ahead_threads(&conn).unwrap().contains(&"t1".to_string()));
        assert!(linked_workspaces(&conn).unwrap()[0].ahead);
        let stored: String = conn.query_row("SELECT path FROM folders", [], |r| r.get(0)).unwrap();
        assert_eq!(stored, root.to_string_lossy(), "a read-only MCP lookup never writes the moved path");
        conn.execute("UPDATE threads SET private = 1 WHERE id = 't2'", []).unwrap();
        privacy_changed(&conn, "t2", Lang::Zh, &backups).unwrap();
        assert!(!md(&moved).contains("FLUX 导师沟通与汇报"), "the privacy rewrite also follows the move");
    }

    #[test]
    fn an_empty_first_workspace_uses_the_other_workspaces_main_project() {
        let _home = crate::home_lock();
        let root = flux_like("primary-fallback");
        let backups = temp("primary-fallback-backups");
        let mut conn = library();
        connect(&mut conn, &args("w1", &root, &[]), Lang::Zh, &backups, 1).unwrap();
        connect(&mut conn, &args("w2", &root, &[]), Lang::Zh, &backups, 2).unwrap();
        conn.execute("UPDATE threads SET status = 'done' WHERE id IN ('t1', 't2', 't4')", []).unwrap();
        assert_eq!(view_workspace(&conn, "w1", false, false).unwrap().unwrap().primary_id.as_deref(), Some("t3"));
    }

    #[test]
    fn keeping_spool_md_on_disconnect_keeps_the_lines_that_point_at_it() {
        let _home = crate::home_lock();
        let root = flux_like("keep");
        let backups = temp("keep-backups");
        let mut conn = library();
        connect(&mut conn, &args("w1", &root, &[]), Lang::Zh, &backups, 1).unwrap();
        disconnect(&conn, "w1", false, Lang::Zh, &backups).unwrap();
        assert!(root.join(PROTOCOL_FILE).exists());
        assert!(std::fs::read_to_string(root.join("CLAUDE.md")).unwrap().contains("@SPOOL.md"));
        assert!(std::fs::read_to_string(root.join(".git/info/exclude")).unwrap().contains("/SPOOL.md"));
        assert!(view(&conn, "t1", true, false).unwrap().is_none());
    }

    #[test]
    fn picking_a_state_file_is_not_the_folder_moving_ahead() {
        let _home = crate::home_lock();
        let root = flux_like("pick");
        let backups = temp("pick-backups");
        let mut conn = library();
        connect(&mut conn, &args("w1", &root, &["README.md"]), Lang::Zh, &backups, 1).unwrap();
        // A file picked later, untouched since the connect: not ahead.
        set_state_files(&conn, "w1", &["README.md".into(), "plans/dissertation/HANDOFF_*.md".into()], Lang::Zh, &backups).unwrap();
        assert!(!view(&conn, "t1", true, false).unwrap().unwrap().ahead);
        // One that changed after the connect: ahead.
        write(&root, "docs/WORK_PLAN_2026-10-02.md", "plan v2");
        touch_later(&root, "docs/WORK_PLAN_2026-10-02.md", 5);
        set_state_files(&conn, "w1", &["README.md".into(), "docs/WORK_PLAN_*.md".into()], Lang::Zh, &backups).unwrap();
        assert!(md(&root).contains("`docs/WORK_PLAN_*.md`"));
        assert_eq!(set_state_files(&conn, "w1", &["a.md".into(), "b.md".into(), "c.md".into(), "d.md".into()], Lang::Zh, &backups), Err("too_many".into()));
        assert_eq!(set_state_files(&conn, "w1", &["../outside.md".into()], Lang::Zh, &backups), Err("bad_spec".into()));
        assert_eq!(set_state_files(&conn, "w2", &[], Lang::Zh, &backups), Err("no_link".into()));
    }

    #[test]
    fn explicit_state_files_survive_listing_filters_and_sync_again() {
        let _home = crate::home_lock();
        let root = flux_like("state-any-file");
        let backups = temp("state-any-file-backups");
        write(&root, "target/recording.bin", "binary bytes");
        write(&root, ".notes/ plan.txt", "a deliberately chosen hidden plan\n");
        let mut conn = library();
        let specs = ["data/runs/0000.txt", "target/recording.bin", ".notes/ plan.txt"];
        assert!(specs.iter().all(|s| !rels(&list_folder(&root)).contains(s)));
        connect(&mut conn, &args("w1", &root, &specs), Lang::Zh, &backups, 1).unwrap();
        let v = view(&conn, "t1", true, false).unwrap().unwrap();
        assert!(!v.ahead);
        assert_eq!(v.state.iter().filter(|s| s.path.is_some()).count(), 3);
        assert_eq!(state_text(&v, ".notes/ plan.txt"), Some(("a deliberately chosen hidden plan\n".into(), false)));
        assert_eq!(state_text(&v, "target/recording.bin"), None);
        let f = folder_by_id(&conn, &v.folder_id).unwrap().unwrap();
        let snap = Snapshot::parse(&f.snapshot);
        assert!(snap.state["target/recording.bin"].hash.is_empty(), "non-text selections never read a content fingerprint");
        assert!(specs.iter().all(|s| snap.files.contains_key(*s)));

        write(&root, "data/runs/0000.txt", "the selected ignored plan changed");
        touch_later(&root, "target/recording.bin", 10);
        assert!(view(&conn, "t1", true, false).unwrap().unwrap().ahead);
        mark_synced_workspace(&conn, "w1", 2).unwrap();
        assert!(!view(&conn, "t1", true, false).unwrap().unwrap().ahead, "explicit selections stay aligned after a sync");
        std::fs::remove_file(root.join("target/recording.bin")).unwrap();
        let v = view(&conn, "t1", true, false).unwrap().unwrap();
        assert!(v.state.iter().any(|s| s.spec == "target/recording.bin" && s.changed && s.path.is_none()));
    }

    #[test]
    fn changing_state_files_can_add_a_non_document_and_never_returns_cached_binary_text() {
        let _home = crate::home_lock();
        let root = flux_like("state-add-nondoc");
        let backups = temp("state-add-nondoc-backups");
        write(&root, "target/checkpoint.pt", "opaque checkpoint bytes");
        let mut conn = library();
        connect(&mut conn, &args("w1", &root, &["README.md"]), Lang::Zh, &backups, 1).unwrap();
        set_state_files(&conn, "w1", &["target/checkpoint.pt".into()], Lang::Zh, &backups).unwrap();
        let mut v = view(&conn, "t1", true, false).unwrap().unwrap();
        assert!(!v.ahead);
        assert!(v.needs_text.is_empty());
        let (size, mtime) = stamp(&root.join("target/checkpoint.pt")).unwrap();
        v.cache.insert("target/checkpoint.pt".into(), CachedText { size, mtime, text: "must never be handed to an AI".into() });
        assert_eq!(state_text(&v, "target/checkpoint.pt"), None);
        write(&root, "target/checkpoint.pt", "changed opaque checkpoint bytes");
        assert!(view(&conn, "t1", true, false).unwrap().unwrap().ahead);
        mark_synced_workspace(&conn, "w1", 2).unwrap();
        assert!(!view(&conn, "t1", true, false).unwrap().unwrap().ahead);
    }

    #[test]
    #[cfg(unix)]
    fn state_reads_recheck_symlinks_after_the_user_selected_a_file() {
        let _home = crate::home_lock();
        let root = flux_like("state-link-swap");
        let outside = temp("state-link-outside");
        let backups = temp("state-link-swap-backups");
        write(&root, "notes/selected.txt", "inside\n");
        write(&outside, "selected.txt", "outside secret\n");
        write(&outside, "HANDOFF_2026-10-30.md", "outside handoff\n");
        let mut conn = library();
        connect(&mut conn, &args("w1", &root, &["notes/selected.txt"]), Lang::Zh, &backups, 1).unwrap();
        let old_view = view(&conn, "t1", true, false).unwrap().unwrap();
        std::fs::remove_file(root.join("notes/selected.txt")).unwrap();
        std::os::unix::fs::symlink(outside.join("selected.txt"), root.join("notes/selected.txt")).unwrap();
        assert_eq!(state_text(&old_view, "notes/selected.txt"), None, "an old view is not a permanent path grant");
        let v = view(&conn, "t1", true, false).unwrap().unwrap();
        assert!(v.state[0].changed && v.state[0].path.is_none());
        assert!(take_snapshot(&root, &["notes/selected.txt".into()], None, None).state.is_empty());
        std::os::unix::fs::symlink(&outside, root.join("outside-notes")).unwrap();
        assert_eq!(resolve_spec(&root, "outside-notes/HANDOFF_*.md"), None, "dated series cannot enumerate an outside directory");
        assert_eq!(resolve_spec(&root, "../selected.txt"), None);
        assert_eq!(check_specs(&["/absolute/file.txt".into()]), Err("bad_spec".into()));
    }

    #[test]
    fn a_docx_state_file_is_read_from_what_the_gui_extracted() {
        let _home = crate::home_lock();
        let root = flux_like("docx");
        let backups = temp("docx-backups");
        write(&root, "thesis/PLAN.docx", "zip bytes");
        write(&root, "thesis/notes.md", "# notes\n");
        let mut conn = library();
        connect(&mut conn, &args("w1", &root, &["thesis/PLAN.docx", "thesis/notes.md"]), Lang::Zh, &backups, 1).unwrap();
        let v = view(&conn, "t1", true, false).unwrap().unwrap();
        assert_eq!(v.needs_text.iter().map(|n| n.rel.as_str()).collect::<Vec<_>>(), vec!["thesis/PLAN.docx"]);
        assert_eq!(state_text(&v, "thesis/notes.md"), Some(("# notes\n".to_string(), false)));
        assert_eq!(state_text(&v, "thesis/PLAN.docx"), None);
        cache_text(&conn, &v.folder_id, "thesis/PLAN.docx", "第三章改成访谈").unwrap();
        let v = view(&conn, "t1", true, false).unwrap().unwrap();
        assert!(v.needs_text.is_empty());
        assert_eq!(state_text(&v, "thesis/PLAN.docx"), Some(("第三章改成访谈".to_string(), false)));
        write(&root, "thesis/PLAN.docx", "zip bytes, longer now");
        assert_eq!(state_text(&view(&conn, "t1", true, false).unwrap().unwrap(), "thesis/PLAN.docx"), None);
    }

    /// Manual acceptance (task book §5 A1 / A2, §8) — on COPIES only: a `VACUUM INTO` copy of the
    /// library and a copy of the folder. ⛔ It refuses the real library.
    ///   SPOOL_P9Y_DB=<copy>/spool.db SPOOL_P9Y_FOLDER=<folder copy> SPOOL_P9Y_WORKSPACE=<title> \
    ///   SPOOL_P9Y_STEP=connect|view|refresh|sync cargo test --lib folder_copy_acceptance -- --ignored --nocapture
    #[test]
    #[ignore = "manual: needs a copy of a library and of a folder"]
    fn folder_copy_acceptance() {
        let var = |k: &str| std::env::var(k).unwrap_or_default();
        let (db, folder, title, step) = (var("SPOOL_P9Y_DB"), var("SPOOL_P9Y_FOLDER"), var("SPOOL_P9Y_WORKSPACE"), var("SPOOL_P9Y_STEP"));
        if db.is_empty() {
            return;
        }
        let real = home_dir().unwrap().join("Library/Application Support/com.oceanjin.spool");
        assert!(!Path::new(&db).starts_with(&real), "⛔ not the real library");
        let backups = Path::new(&db).parent().unwrap().to_path_buf();
        let mut conn = Connection::open(&db).unwrap();
        let ws: String = conn
            .query_row("SELECT id FROM workspaces WHERE title = ?1 AND deleted_at IS NULL", [&title], |r| r.get(0))
            .unwrap();
        match step.as_str() {
            "connect" => {
                let i = inspect(&conn, &folder).unwrap();
                println!("files={} truncated={} not_listed={:?} linked_to={:?}", i.files, i.truncated, i.not_listed, i.linked_to);
                let picks: Vec<String> = i.candidates.iter().filter(|c| c.recommended).take(MAX_STATE_FILES).map(|c| c.spec.clone()).collect();
                println!("picked {picks:?}");
                let a = ConnectArgs { workspace_id: ws.clone(), path: folder.clone(), state_files: picks, git_exclude: true, pointer_claude: true, pointer_agents: false };
                connect(&mut conn, &a, Lang::Zh, &backups, now_ms()).unwrap();
            }
            "refresh" => refresh_all(&conn, Lang::Zh, &backups).unwrap(),
            "sync" => mark_synced_workspace(&conn, &ws, now_ms()).unwrap(),
            _ => {}
        }
        let v = view_workspace(&conn, &ws, true, true).unwrap().unwrap();
        println!(
            "view location={} path={} ahead={} protocol={} workspace={} primary={:?} projects={} git={} exclude={} claude_points={}",
            v.location, v.path, v.ahead, v.protocol, v.workspace, v.primary_title, v.project_count, v.git, v.exclude, v.claude_points
        );
        for s in &v.state {
            println!("state {} -> {:?} changed={}", s.spec, s.path, s.changed);
        }
        println!("changes={} commits={}", v.changes.len(), v.commits.len());
    }
}
