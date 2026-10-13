//! P9-3 (Ocean 2026-10-10, HANDOFF §9.2 第 57、58 条) — how the operating system recognises a
//! file after it has been moved, so a file the user moved in Finder / Explorer is followed and
//! not reported as missing (「路径需要跟随文件位置变化，除非用户删除了」).
//!
//! The identity is a few bytes stored in `attachments.target_identity` (v33). This file only
//! makes, checks and resolves them; what Spool does with the answer is in `file_follow.rs`.
//! It depends on nothing in this crate, so its Windows half can be type-checked on its own.
//!
//! The bytes start with a two-byte tag, so an identity written on the other platform (a
//! library carried from Mac to Windows) reads as "none" rather than as garbage:
//!   - `M1` + device (u64 LE) + inode (u64 LE) + macOS bookmark data
//!   - `W1` + volume serial (u64 LE) + 128-bit file id
//!
//! ⚠️ Why the device / inode sits beside the bookmark on macOS: many editors save by writing a
//! new file and renaming it over the old one, which gives the same path a new inode. A
//! bookmark made before that points at the old inode — moved later, the file would no longer
//! resolve and read as 「删掉了」, which is exactly the "is it Spool's fault?" confusion this
//! exists to end. Comparing device / inode on every look is one `stat`, and a mismatch means
//! "record again", never "follow".
//!
//! ⛔ Nothing here moves, copies, opens for writing or deletes a user's file. ⛔ No network:
//! resolution is asked not to mount anything and not to show any interface.

use std::path::{Path, PathBuf};

/// What a stored identity says about where the file is now.
#[derive(Debug, PartialEq)]
pub enum Resolved {
    /// The file is at this path (it exists).
    At(PathBuf),
    /// The system no longer knows the file.
    Gone,
}

/// The identity of the file or folder at `path`, or None when this platform has none or the
/// system would not give one.
pub fn record(path: &Path) -> Option<Vec<u8>> {
    imp::record(path)
}

/// Is the file at `path` the one `identity` was recorded from? A false answer means the
/// identity should be recorded again (the path is the authority while something is there).
pub fn matches(path: &Path, identity: &[u8]) -> bool {
    imp::matches(path, identity)
}

/// Where the file `identity` was recorded from is now.
pub fn resolve(identity: &[u8]) -> Resolved {
    imp::resolve(identity)
}

/// Whether `identity` is one this platform can read at all (not empty, not the other
/// platform's, not cut short).
pub fn usable(identity: &[u8]) -> bool {
    imp::usable(identity)
}

/// In the Trash / Recycle Bin: `~/.Trash`, a `.Trashes` folder on another disk, `$Recycle.Bin`.
pub fn in_trash(path: &Path) -> bool {
    imp::in_trash(path)
}

/// The path is on a disk that is not connected right now: `/Volumes/<name>/…` with no
/// `/Volumes/<name>`, or a drive letter / network share that is not there.
pub fn disk_offline(path: &Path) -> bool {
    imp::disk_offline(path)
}

#[cfg(target_os = "macos")]
mod imp {
    use super::Resolved;
    use core_foundation::base::{kCFAllocatorDefault, TCFType};
    use core_foundation::data::{CFData, CFDataRef};
    use core_foundation::error::{CFError, CFErrorRef};
    use core_foundation::url::{
        kCFURLBookmarkResolutionWithoutMountingMask, kCFURLBookmarkResolutionWithoutUIMask,
        CFURLCreateBookmarkData, CFURLCreateByResolvingBookmarkData, CFURL,
    };
    use std::os::unix::fs::MetadataExt;
    use std::path::{Component, Path};

    const TAG: &[u8; 2] = b"M1";
    const HEAD: usize = 2 + 8 + 8;

    fn dev_ino(path: &Path) -> Option<(u64, u64)> {
        let m = std::fs::metadata(path).ok()?;
        Some((m.dev() as u64, m.ino()))
    }

    fn release_error(err: CFErrorRef) {
        if !err.is_null() {
            // Taking ownership releases it on drop.
            drop(unsafe { CFError::wrap_under_create_rule(err) });
        }
    }

    pub fn record(path: &Path) -> Option<Vec<u8>> {
        let (dev, ino) = dev_ino(path)?;
        let url = CFURL::from_path(path, path.is_dir())?;
        let mut err: CFErrorRef = std::ptr::null_mut();
        let data: CFDataRef = unsafe {
            CFURLCreateBookmarkData(
                kCFAllocatorDefault,
                url.as_concrete_TypeRef(),
                0,
                std::ptr::null(),
                std::ptr::null(),
                &mut err,
            )
        };
        if data.is_null() {
            release_error(err);
            return None;
        }
        let data = unsafe { CFData::wrap_under_create_rule(data) };
        let mut out = Vec::with_capacity(HEAD + data.len() as usize);
        out.extend_from_slice(TAG);
        out.extend_from_slice(&dev.to_le_bytes());
        out.extend_from_slice(&ino.to_le_bytes());
        out.extend_from_slice(data.bytes());
        Some(out)
    }

    pub fn usable(identity: &[u8]) -> bool {
        identity.len() > HEAD && identity.starts_with(TAG)
    }

    pub fn matches(path: &Path, identity: &[u8]) -> bool {
        if !usable(identity) {
            return false;
        }
        let dev = u64::from_le_bytes(identity[2..10].try_into().unwrap());
        let ino = u64::from_le_bytes(identity[10..18].try_into().unwrap());
        dev_ino(path) == Some((dev, ino))
    }

    pub fn resolve(identity: &[u8]) -> Resolved {
        if !usable(identity) {
            return Resolved::Gone;
        }
        let data = CFData::from_buffer(&identity[HEAD..]);
        let mut stale: core_foundation::base::Boolean = 0;
        let mut err: CFErrorRef = std::ptr::null_mut();
        // ⛔ Never a dialog, never a mount: a bookmark to a server share would otherwise try to
        // connect, and one to an unplugged disk would ask for it.
        let url = unsafe {
            CFURLCreateByResolvingBookmarkData(
                kCFAllocatorDefault,
                data.as_concrete_TypeRef(),
                kCFURLBookmarkResolutionWithoutUIMask | kCFURLBookmarkResolutionWithoutMountingMask,
                std::ptr::null(),
                std::ptr::null(),
                &mut stale,
                &mut err,
            )
        };
        if url.is_null() {
            release_error(err);
            return Resolved::Gone;
        }
        let url = unsafe { CFURL::wrap_under_create_rule(url) };
        // A stale bookmark still resolved; the caller records a fresh identity for any file it
        // follows, so `stale` needs no handling of its own here.
        match url.to_path() {
            Some(p) if p.exists() => Resolved::At(p),
            _ => Resolved::Gone,
        }
    }

    pub fn in_trash(path: &Path) -> bool {
        if let Some(home) = std::env::var_os("HOME") {
            if path.starts_with(Path::new(&home).join(".Trash")) {
                return true;
            }
        }
        path.components().any(|c| c.as_os_str() == ".Trashes")
    }

    pub fn disk_offline(path: &Path) -> bool {
        let mut parts = path.components();
        let (Some(Component::RootDir), Some(first), Some(name)) =
            (parts.next(), parts.next(), parts.next())
        else {
            return false;
        };
        first.as_os_str() == "Volumes" && !Path::new("/Volumes").join(name.as_os_str()).exists()
    }
}

#[cfg(windows)]
mod imp {
    use super::Resolved;
    use std::os::windows::ffi::{OsStrExt, OsStringExt};
    use std::path::{Component, Path, PathBuf, Prefix};
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::Storage::FileSystem::{
        CreateFileW, ExtendedFileIdType, FileIdInfo, GetFileInformationByHandleEx,
        GetFinalPathNameByHandleW, OpenFileById, FILE_FLAG_BACKUP_SEMANTICS, FILE_ID_128,
        FILE_ID_DESCRIPTOR, FILE_ID_DESCRIPTOR_0, FILE_ID_INFO, FILE_NAME_NORMALIZED,
        FILE_SHARE_DELETE, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING, VOLUME_NAME_DOS,
    };

    const TAG: &[u8; 2] = b"W1";
    const LEN: usize = 2 + 8 + 16;
    const SHARE_ALL: u32 = FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE;

    /// Closes the handle when dropped.
    struct Handle(HANDLE);
    impl Drop for Handle {
        fn drop(&mut self) {
            unsafe { CloseHandle(self.0) };
        }
    }

    fn wide(p: &Path) -> Vec<u16> {
        p.as_os_str().encode_wide().chain(std::iter::once(0)).collect()
    }

    /// Opened for no access at all — enough to ask about it, ⛔ never to read or change it.
    /// BACKUP_SEMANTICS is what lets a folder be opened too.
    fn open(path: &Path) -> Option<Handle> {
        let w = wide(path);
        let h = unsafe {
            CreateFileW(
                w.as_ptr(),
                0,
                SHARE_ALL,
                std::ptr::null(),
                OPEN_EXISTING,
                FILE_FLAG_BACKUP_SEMANTICS,
                std::ptr::null_mut(),
            )
        };
        (h != INVALID_HANDLE_VALUE).then_some(Handle(h))
    }

    fn id_info(h: &Handle) -> Option<FILE_ID_INFO> {
        let mut info = FILE_ID_INFO::default();
        let ok = unsafe {
            GetFileInformationByHandleEx(
                h.0,
                FileIdInfo,
                &mut info as *mut FILE_ID_INFO as *mut core::ffi::c_void,
                std::mem::size_of::<FILE_ID_INFO>() as u32,
            )
        };
        (ok != 0).then_some(info)
    }

    fn encode(info: &FILE_ID_INFO) -> Vec<u8> {
        let mut out = Vec::with_capacity(LEN);
        out.extend_from_slice(TAG);
        out.extend_from_slice(&info.VolumeSerialNumber.to_le_bytes());
        out.extend_from_slice(&info.FileId.Identifier);
        out
    }

    pub fn record(path: &Path) -> Option<Vec<u8>> {
        let h = open(path)?;
        id_info(&h).map(|i| encode(&i))
    }

    pub fn usable(identity: &[u8]) -> bool {
        identity.len() == LEN && identity.starts_with(TAG)
    }

    pub fn matches(path: &Path, identity: &[u8]) -> bool {
        usable(identity) && record(path).as_deref() == Some(identity)
    }

    /// `\\?\C:\…` → `C:\…` (a UNC path keeps its long form, which is still a valid path).
    fn plain(p: PathBuf) -> PathBuf {
        let s = p.to_string_lossy();
        match s.strip_prefix(r"\\?\") {
            Some(rest) if !rest.starts_with(r"UNC\") => PathBuf::from(rest),
            _ => p,
        }
    }

    fn final_path(h: &Handle) -> Option<PathBuf> {
        let mut buf = vec![0u16; 1024];
        loop {
            let n = unsafe {
                GetFinalPathNameByHandleW(
                    h.0,
                    buf.as_mut_ptr(),
                    buf.len() as u32,
                    FILE_NAME_NORMALIZED | VOLUME_NAME_DOS,
                )
            } as usize;
            if n == 0 {
                return None;
            }
            if n < buf.len() {
                return Some(plain(PathBuf::from(std::ffi::OsString::from_wide(&buf[..n]))));
            }
            buf.resize(n + 1, 0);
        }
    }

    pub fn resolve(identity: &[u8]) -> Resolved {
        if !usable(identity) {
            return Resolved::Gone;
        }
        let serial = u64::from_le_bytes(identity[2..10].try_into().unwrap());
        let mut file_id = FILE_ID_128::default();
        file_id.Identifier.copy_from_slice(&identity[10..26]);
        // OpenFileById needs any handle on the right volume. Every drive letter that is there
        // is asked for its serial; a file moved to another volume has a new id anyway.
        for letter in b'A'..=b'Z' {
            let root = PathBuf::from(format!("{}:\\", letter as char));
            let Some(hint) = open(&root) else { continue };
            if id_info(&hint).map(|i| i.VolumeSerialNumber) != Some(serial) {
                continue;
            }
            let desc = FILE_ID_DESCRIPTOR {
                dwSize: std::mem::size_of::<FILE_ID_DESCRIPTOR>() as u32,
                Type: ExtendedFileIdType,
                Anonymous: FILE_ID_DESCRIPTOR_0 { ExtendedFileId: file_id },
            };
            let h = unsafe {
                OpenFileById(hint.0, &desc, 0, SHARE_ALL, std::ptr::null(), FILE_FLAG_BACKUP_SEMANTICS)
            };
            if h == INVALID_HANDLE_VALUE {
                return Resolved::Gone;
            }
            let h = Handle(h);
            return match final_path(&h) {
                Some(p) if p.exists() => Resolved::At(p),
                _ => Resolved::Gone,
            };
        }
        Resolved::Gone
    }

    pub fn in_trash(path: &Path) -> bool {
        path.components()
            .any(|c| c.as_os_str().to_string_lossy().eq_ignore_ascii_case("$Recycle.Bin"))
    }

    pub fn disk_offline(path: &Path) -> bool {
        let Some(Component::Prefix(prefix)) = path.components().next() else {
            return false;
        };
        let root = match prefix.kind() {
            Prefix::Disk(_) | Prefix::VerbatimDisk(_) => {
                PathBuf::from(prefix.as_os_str()).join(std::path::MAIN_SEPARATOR_STR)
            }
            Prefix::UNC(server, share) | Prefix::VerbatimUNC(server, share) => {
                PathBuf::from(r"\\").join(server).join(share)
            }
            _ => return false,
        };
        !root.exists()
    }
}

/// Elsewhere: no identity, only the path (the taskbook's 「别的平台：不记，照旧只看路径」).
#[cfg(not(any(target_os = "macos", windows)))]
mod imp {
    use super::Resolved;
    use std::path::Path;

    pub fn record(_path: &Path) -> Option<Vec<u8>> {
        None
    }
    pub fn usable(_identity: &[u8]) -> bool {
        false
    }
    pub fn matches(_path: &Path, _identity: &[u8]) -> bool {
        false
    }
    pub fn resolve(_identity: &[u8]) -> Resolved {
        Resolved::Gone
    }
    pub fn in_trash(path: &Path) -> bool {
        path.components().any(|c| c.as_os_str() == ".Trash" || c.as_os_str() == ".Trashes")
    }
    pub fn disk_offline(_path: &Path) -> bool {
        false
    }
}

#[cfg(all(test, target_os = "macos"))]
mod tests {
    use super::*;

    fn temp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("spool-identity-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        d.canonicalize().unwrap()
    }

    #[test]
    fn follows_a_move_and_a_rename_and_says_gone_after_a_delete() {
        let d = temp("follow");
        let a = d.join("Lecture 3.pdf");
        std::fs::write(&a, b"%PDF").unwrap();
        let id = record(&a).expect("an identity for a plain file");
        assert!(usable(&id) && matches(&a, &id));

        std::fs::create_dir(d.join("HAI")).unwrap();
        let moved = d.join("HAI").join("Lecture 3 - renamed.pdf");
        std::fs::rename(&a, &moved).unwrap();
        assert_eq!(resolve(&id), Resolved::At(moved.clone()));
        // The identity still describes the moved file — the same inode.
        assert!(matches(&moved, &id));

        std::fs::remove_file(&moved).unwrap();
        assert_eq!(resolve(&id), Resolved::Gone);
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn a_file_rewritten_under_the_same_name_no_longer_matches() {
        let d = temp("rewrite");
        let a = d.join("notes.docx");
        std::fs::write(&a, b"v1").unwrap();
        let id = record(&a).unwrap();
        // The editor's safe save: write a new file, rename it over the old one.
        std::fs::write(d.join(".notes.docx.tmp"), b"v2").unwrap();
        std::fs::rename(d.join(".notes.docx.tmp"), &a).unwrap();
        assert!(!matches(&a, &id));
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn folders_have_an_identity_too() {
        let d = temp("folder");
        let f = d.join("notes");
        std::fs::create_dir(&f).unwrap();
        let id = record(&f).unwrap();
        let moved = d.join("notes-moved");
        std::fs::rename(&f, &moved).unwrap();
        assert_eq!(resolve(&id), Resolved::At(moved));
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn reads_neither_the_other_platform_nor_a_cut_short_identity() {
        assert!(!usable(b""));
        assert!(!usable(b"W1\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"));
        assert!(!usable(b"M1short"));
        assert_eq!(resolve(b"M1short"), Resolved::Gone);
        assert_eq!(resolve(&[b'M', b'1'].iter().copied().chain([0u8; 40]).collect::<Vec<_>>()), Resolved::Gone);
    }

    #[test]
    fn knows_the_trash_and_an_unplugged_disk() {
        let _home = crate::home_lock();
        let home = std::env::var("HOME").unwrap();
        assert!(in_trash(&Path::new(&home).join(".Trash/Lecture 3.pdf")));
        assert!(in_trash(Path::new("/Volumes/Disk/.Trashes/501/a.pdf")));
        assert!(!in_trash(&Path::new(&home).join("Desktop/HAI/Lecture 3.pdf")));

        assert!(disk_offline(Path::new("/Volumes/spool-no-such-disk-p9/x.pdf")));
        assert!(!disk_offline(Path::new("/Users/someone/x.pdf")));
        assert!(!disk_offline(Path::new("/Volumes")));
    }
}
