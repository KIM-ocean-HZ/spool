fn main() {
    // P9X（DISCOVERED-20261020-2）：Windows 上库的单元测试 exe 一启动就退出 0xc0000139 —— Tauri 的依赖
    // 从 comctl32 进 TaskDialogIndirect，只有 Common Controls v6 有；tauri-build 的 v6 清单只链给 app 的
    // exe（rustc-link-arg-bins），而 cargo 没有「只给库的单元测试」的链接参数。
    // 只在设了 SPOOL_TEST_CC6_MANIFEST 时（CI 跑 cargo test 那一步）改由链接器给每个 exe 嵌同一份清单
    // （windows-test-manifest.xml = tauri-build 2.6.0 自带那份，逐字节）；打安装包从不设它
    // ⇒ 发出去的 exe 和以前一模一样。
    println!("cargo:rerun-if-env-changed=SPOOL_TEST_CC6_MANIFEST");
    let windows = std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows");
    if windows && std::env::var_os("SPOOL_TEST_CC6_MANIFEST").is_some() {
        let manifest = std::path::Path::new(&std::env::var("CARGO_MANIFEST_DIR").unwrap())
            .join("windows-test-manifest.xml");
        println!("cargo:rerun-if-changed={}", manifest.display());
        println!("cargo:rustc-link-arg=/MANIFEST:EMBED");
        println!("cargo:rustc-link-arg=/MANIFESTINPUT:{}", manifest.display());
        let attributes = tauri_build::Attributes::new()
            .windows_attributes(tauri_build::WindowsAttributes::new_without_app_manifest());
        tauri_build::try_build(attributes).expect("tauri-build");
        return;
    }
    tauri_build::build()
}
