# Spool app icon

The material development dated 2026-10-30 retains the spool seen from above,
including all 14 original mark primitives, both offset thread shadows, the axle's
small white highlight arc and both highlight dots. Original geometry, colors,
alpha and caps remain in the source SVG layers. Fine material treatment adds
depth without adding dark outlines to the white inner rings or highlight arc.

## Editable native source

`Spool.icon/` is the final editable Apple Icon Composer document. The optical
settings were adjusted and saved in Icon Composer, using design generation 27.
Four native groups separate the materials:

| Group | Treatment |
| --- | --- |
| Original highlights | Original small arc, axle rim and dots; glass disabled |
| Glass axle and satin winding | Axle: inside specular, refraction 36%, depth 12%, blur 6%, translucency 60%; white winding stays unlit |
| Ivory thread and original shadows | Native material on the outer thread; original dark shadow paths remain separate and unlit |
| Liquid glass flange | Inside specular, refraction 28%, depth 8%, blur 10%, translucency 68% |

All automatic group drop shadows are zero. `Assets/07-filament-satin.svg` adds
17 fine, low-opacity concentric striations strictly inside the existing winding
band. These merge naturally at small sizes. The other seven SVG assets contain
the original 14 painted primitives, retaining the `translate(-8,-10)` offset.
Do not merge the three outer thread paths or omit authored shadows/highlights.

`review/restored-v2-baseline/` preserves the previous corrected six-layer design.
`review/spool-logo-before.svg` is the original geometry reference. The flat
`spool-logo-*.svg` files and `spool-logo-sizes-preview.png` are the earlier flat
rendering of the same geometry; they are kept as design history and are no longer
used as the product logo.

## Assembly film

`spool-logo-assembly.mp4` (here and in `site/assets/`) is the clean assembly film
the user adopted on 2026-10-31, byte-identical to
`motion/clean-assembly-v1/spool-assembly-clean-v1-1080p60.mp4` (SHA-256
`ec3b02fb…`): 1080 × 1080, 60 fps, 8.4 s, silent, sRGB-tagged H.264, with the
app's Fraunces 400 wordmark. The file names stay the same so existing links keep
working; the earlier flat film is in Git history only. The website requests it as
`spool-logo-assembly.mp4?v=ec3b02fb` so browsers do not replay a cached copy, with
`spool-logo-assembly-poster.png` (the adopted still) as its poster. Sources, the
ProRes master (kept local and Git-ignored) and the rebuild steps are in
`motion/clean-assembly-v1/README.md`.

## Color-managed exports

- `exports/spool-artwork-1024.png` and `spool-artwork-dark-1024.png` preserve
  Icon Composer's full-bleed, 16-bit Display P3 exports.
- `exports/spool-artwork-srgb-1024.png` and `spool-artwork-dark-srgb-1024.png`
  are ColorSync-converted sRGB images for sharing and consistent previewing.
- `exports/spool-app-icon-1024.png` is the sRGB legacy desktop master: an 824px
  tile centered in a transparent 1024px canvas, with the 100px margin applied once.
- `review/spool-liquid-glass-v3-review.png` compares the corrected baseline with
  the material development, including close-ups of the axle and winding texture.

Icon Composer's live preview can respond to lighting, background and interaction.
A PNG records one static state. Keep the same document, appearance, design
generation and size when comparing them. A stale untitled study is not the saved
native source.

The earlier raster pipeline dropped the Display P3 profile before converting
pixels, which changed the appearance of the colors. The corrected pipeline uses
Apple ColorSync to convert pixels to sRGB **before** Tauri resizes them, and
retains an sRGB color-space tag on every bundle PNG. Relabeling P3 pixels as sRGB
is not a conversion. ICNS uses Tauri's encoder to preserve the small legacy
representations' alpha correctly; macOS `iconutil` is used for verification.
Tauri drops the tag from the PNGs inside the ICNS and orders its entries
differently on every run, so the generator tags those PNGs too and sorts the
entries: the same source always produces the same bytes.

## Regenerate

```sh
npm run icons:generate
swift scripts/preview-icon.swift
```

The generator finds Icon Composer's `Contents/Executables/ictool` in the active
Xcode installation or `/Applications/Xcode.app`. Set `IC_TOOL` if it is installed
elsewhere. Native export and ColorSync conversion require macOS; other machines
package the checked-in, tagged sRGB exports. The installed Tauri CLI is required,
with no additional npm dependencies. All exports and bundle resources are staged
and checked before replacing the files.

| Output | Source | Used by |
| --- | --- | --- |
| `src-tauri/icons/{16…1024}x….png`, `128x128@2x.png`, `icon.png`, `src-tauri/app-icon.png` | 100px inset master | Bundle aliases |
| `src-tauri/icons/icon.icns` (ten representations) | 100px inset master | macOS app icon before macOS 26, DMG volume icon |
| `src-tauri/icons/Assets.car` | `Spool.icon` (compiled by `actool`) | macOS app icon on macOS 26 and later |
| `src-tauri/icons/icon.ico` (32 first, then 16, 20, 24, 30, 36, 40, 48, 64, 128, 256) | Full-bleed artwork | Windows exe, window, taskbar, tray, NSIS installer |
| `src-tauri/icons/Square*Logo.png`, `StoreLogo.png` | Full-bleed artwork | Windows Store tiles (not bundled by the NSIS target) |
| `site/assets/spool-icon-{28,32,56,84,104,192,208,312}.png` | Full-bleed artwork | Website header (28px at 1x/2x/3x), hero (104px at 1x/2x/3x), favicons (32, 192) |

The 100px inset is macOS's icon grid. Windows and the website have no such grid,
so there the tile fills the canvas, as the earlier flat icon did. Tauri uses the
ICO's first entry as the Windows window and tray icon, which is why 32px leads.
The monochrome menu-bar template (`tray.png` / `tray.rgba`) is preserved: it is
built from the same primitives (thread, winding, axle, flange; shadows and
highlight dots removed, as a template image needs), which the material
development did not change. `src-tauri/icons/android/`, `ios/` and
`site/assets/spool-logo-full.svg` still hold the earlier flat icon. Nothing uses
them; they stay in the repository marked as legacy (a `LEGACY.md` in each folder,
a comment at the top of the SVG). Do not use them, and do not regenerate them.

The generator also compiles `Spool.icon` with Xcode's `actool` (Xcode 26 or
later) into `src-tauri/icons/Assets.car`, which `src-tauri/tauri.conf.json` lists
under `bundle.icon`. Tauri copies it to `Contents/Resources/Assets.car` and sets
`CFBundleIconName`; `icon.icns` stays as `CFBundleIconFile`. macOS 26 and later
draw the icon from `Assets.car`, natively from the same layers; earlier macOS
versions use the ICNS. This matters on macOS 26 and later: with the ICNS alone,
Finder draws this inset icon on a grey "legacy icon" plate at several small sizes
(16–64pt at 1x, 24–32pt at 2x). With `Assets.car` no size gets the plate. The
catalog carries light, dark and tintable renditions; only the default appearance
has been checked on screen, because the icon style is a system setting.

The catalog is compiled here rather than at build time (Tauri can also compile a
listed `.icon`) because `actool` is fragile under automation: started without a
standard input it fails with "Bad file descriptor", and its `ibtoold` helper then
keeps failing for later callers until it exits. If the generator stops there, run
`pkill -x ibtoold` and run it again. `actool` stamps every compile with a time and
random rendition names, so `Assets.car` is the one output whose bytes change on
each run; every other output is byte-reproducible.

Rebuild the app bundle to use the new icon. The installed application is unchanged.

## Verification

`review/material-v3-validation.json` records the export verification. Original
geometry and all 14 primitives are retained; only the 17 material striations are
additional geometry. Eight PNGs have RGBA and sRGB tags; master alpha bounds are
`(100,100)–(924,924)`; all ten ICNS representations decode to the same pixels as
their PNG sizes; the six ICO payloads match their PNGs; tray templates match Git
HEAD. An independent ICC conversion also agreed with ColorSync to a mean channel
difference of 0.53/255 on opaque pixels (99th percentile: 3/255).

`review/integration-validation-2026-10-30.json` records the product-wide
integration that followed: the outputs above, two consecutive runs producing
byte-identical files, and the icon read back out of a freshly built `.app` and
`.dmg`. Its ICO and ICNS figures supersede those in the material record.

Design references, read 2026-10-30:
[Apple app icon guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons/)
and [Creating your app icon using Icon Composer](https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer).
