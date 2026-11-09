#!/usr/bin/env bash
# 编译 `spool-ai` 并按 Tauri 要的名字放到 src-tauri/binaries/。
#
# Tauri 的 externalBin 认的是「基名 + 目标三元组」这个文件名（跨平台交叉打包时同一个目录里
# 会躺着好几份），所以这里必须问一次 rustc 当前的三元组，不能写死。
#
# ⚠️ 这一步产出的二进制会**跟主程序一起被签名和公证**（macOS）。手工塞一个进去而不走这个
# 脚本，装机后会因为签名不完整而起不来。
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
triple="$(rustc -vV | awk '/^host:/{print $2}')"
ext=""
case "$triple" in *windows*) ext=".exe";; esac

echo "building spool-ai for $triple"
case "$triple" in
  *-windows-msvc)
    # DISCOVERED-20261106-4：不静态链 C 运行库，spool-ai.exe 会要 VCRUNTIME140.dll，没装 VC++ 运行库
    # 的 Windows 上所有走 API 的 AI 功能都起不来。写明 --target：RUSTFLAGS 就只给目标产物、不给
    # 构建脚本和过程宏；产物也跟着挪到 target/<triple>/release/ 下。
    RUSTFLAGS="${RUSTFLAGS:+$RUSTFLAGS }-C target-feature=+crt-static" \
      cargo build --release --target "$triple" --manifest-path "$here/src-tauri/sidecar/Cargo.toml"
    built="$here/src-tauri/sidecar/target/$triple/release/spool-ai$ext"
    # CARGO_ENCODED_RUSTFLAGS 一设就会悄悄盖过 RUSTFLAGS —— 查编出来的东西，不信要的是什么。
    if grep -aqiE 'vcruntime140|msvcp140' "$built"; then
      echo "spool-ai still links the dynamic VC++ runtime — refusing to ship it" >&2
      exit 1
    fi
    ;;
  *)
    cargo build --release --manifest-path "$here/src-tauri/sidecar/Cargo.toml"
    built="$here/src-tauri/sidecar/target/release/spool-ai$ext"
    ;;
esac

mkdir -p "$here/src-tauri/binaries"
cp "$built" "$here/src-tauri/binaries/spool-ai-$triple$ext"
echo "→ src-tauri/binaries/spool-ai-$triple$ext"
