// Export the editable docs/logo/Spool.icon with Apple's Icon Composer CLI, then
// package its reviewed artwork for legacy desktop bundles, Windows and the website.
// On machines without ictool, package the checked-in exports with an explicit
// message instead. Requires the repo's installed Tauri CLI. Native design export
// uses macOS. All images are staged and checked before any file is replaced. The
// separate monochrome menu-bar template (tray.png / tray.rgba) is untouched.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const NATIVE_SOURCE = join(REPO, 'docs', 'logo', 'Spool.icon');
const EXPORT_DIR = join(REPO, 'docs', 'logo', 'exports');
const MASTER = join(EXPORT_DIR, 'spool-app-icon-1024.png');
const ARTWORK = join(EXPORT_DIR, 'spool-artwork-srgb-1024.png');
const ICON_DIR = join(REPO, 'src-tauri', 'icons');
const CATALOG = join(ICON_DIR, 'Assets.car');
const SITE_ASSETS = join(REPO, 'site', 'assets');
const TAURI_CLI = join(REPO, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
const SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];
// Windows draws the ICO's first entry as the window and tray icon (tauri-codegen
// reads entries()[0]), so 32px leads. The rest are Microsoft's Win32 sizes for
// 100–200% scaling; 256 means Windows only ever scales down.
const ICO_SIZES = [32, 16, 20, 24, 30, 36, 40, 48, 64, 128, 256];
// Website: header 28px and hero 104px at 1x/2x/3x, favicons at 32px and 192px.
const SITE_SIZES = [28, 32, 56, 84, 104, 192, 208, 312];
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const SRGB_PROFILE = '/System/Library/ColorSync/Profiles/sRGB Profile.icc';

// Icon Composer renders Display P3. Convert pixels before a rasterizer can drop
// that ICC profile; merely attaching an sRGB label to P3 pixels is incorrect.
// Reuse the converted PNG's profile chunk for every 8-bit bundle representation.
const pngChunks = (data) => {
  const chunks = [];
  for (let offset = 8; offset < data.length;) {
    if (offset + 12 > data.length) throw new Error('Truncated PNG chunk');
    const end = offset + data.readUInt32BE(offset) + 12;
    if (end > data.length) throw new Error('Truncated PNG chunk payload');
    chunks.push({ type: data.toString('ascii', offset + 4, offset + 8), data: data.subarray(offset, end) });
    offset = end;
  }
  return chunks;
};
const profileChunk = (data) => {
  const chunks = pngChunks(data);
  return (chunks.find(({ type }) => type === 'iCCP') ?? chunks.find(({ type }) => type === 'sRGB'))?.data;
};
const withProfile = (data, profile) => {
  if (!profile) throw new Error('Missing converted sRGB profile; refusing an untagged bundle export');
  const chunks = pngChunks(data).filter(({ type }) => !['iCCP', 'sRGB', 'gAMA', 'cHRM'].includes(type));
  return Buffer.concat([PNG_SIGNATURE, chunks[0].data, profile, ...chunks.slice(1).map(({ data }) => data)]);
};

const findIconTool = () => {
  if (process.platform !== 'darwin') return undefined;
  if (process.env.IC_TOOL) {
    if (!existsSync(process.env.IC_TOOL)) {
      throw new Error(`IC_TOOL does not exist: ${process.env.IC_TOOL}`);
    }
    return process.env.IC_TOOL;
  }
  const candidates = [];
  try {
    const developer = execFileSync('/usr/bin/xcode-select', ['-p'], { encoding: 'utf8' }).trim();
    candidates.push(join(dirname(developer), 'Applications', 'Icon Composer.app', 'Contents', 'Executables', 'ictool'));
  } catch {
    // Command Line Tools may be installed without a full Xcode application.
  }
  candidates.push('/Applications/Xcode.app/Contents/Applications/Icon Composer.app/Contents/Executables/ictool');
  return candidates.find((path) => existsSync(path));
};

const renderPngSizes = (input, output, sizes) => {
  const args = [TAURI_CLI, 'icon', input, '--output', output];
  for (const size of sizes) args.push('--png', String(size));
  execFileSync(process.execPath, args, { cwd: REPO, stdio: 'inherit' });
};

// Rasterize the converted artwork once at 1024px with `margin` transparent pixels
// on each side; every smaller size is resampled from that 8-bit RGBA image.
const placeArtwork = (work, artwork, margin, name) => {
  const wrapper = join(work, `${name}.svg`);
  const side = 1024 - 2 * margin;
  writeFileSync(wrapper,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><image x="${margin}" y="${margin}" width="${side}" height="${side}" href="data:image/png;base64,${artwork.toString('base64')}"/></svg>`);
  const output = join(work, name);
  renderPngSizes(wrapper, output, [1024]);
  return join(output, '1024x1024.png');
};

const checkPng = (data, size, label, allow16Bit = false) => {
  if (data.length < 33 || !data.subarray(0, 8).equals(PNG_SIGNATURE) ||
      data.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`${label}: expected a PNG image`);
  }
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (width !== size || height !== size) {
    throw new Error(`${label}: expected ${size}×${size}, got ${width}×${height}`);
  }
  // Tauri's bundle icons must have an alpha channel. Never flatten the export.
  if ((data[24] !== 8 && !(allow16Bit && data[24] === 16)) || data[25] !== 6) {
    throw new Error(`${label}: expected ${allow16Bit ? '8/16' : '8'}-bit RGBA PNG (do not flatten the export)`);
  }
};

// Modern Windows supports PNG image payloads. Include each standard size so
// Explorer and taskbars can select a native resolution instead of resampling 256.
const encodeIco = (samples) => {
  const sizes = ICO_SIZES;
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  const images = sizes.map((size, index) => {
    const data = samples.get(size);
    const entry = 6 + index * 16;
    header[entry] = size === 256 ? 0 : size;
    header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4); // color planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
    return data;
  });
  return Buffer.concat([header, ...images]);
};

// Tauri writes ICNS entries in a different order on every run and drops the
// colour tag from their PNG payloads. Sort the entries and tag each PNG like the
// bundle PNGs, so the file is reproducible and every representation says sRGB.
const tagIcns = (icns, profile) => {
  const entries = [];
  for (let offset = 8; offset < icns.length;) {
    const length = icns.readUInt32BE(offset + 4);
    if (length < 8 || offset + length > icns.length) throw new Error('Truncated ICNS entry');
    const type = icns.toString('ascii', offset, offset + 4);
    let data = icns.subarray(offset + 8, offset + length);
    if (data.subarray(0, 8).equals(PNG_SIGNATURE)) data = withProfile(data, profile);
    const head = Buffer.alloc(8);
    head.write(type, 0, 'ascii');
    head.writeUInt32BE(data.length + 8, 4);
    entries.push({ type, data: Buffer.concat([head, data]) });
    offset += length;
  }
  entries.sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : 0));
  const head = Buffer.alloc(8);
  head.write('icns', 0, 'ascii');
  head.writeUInt32BE(8 + entries.reduce((sum, { data }) => sum + data.length, 0), 4);
  return Buffer.concat([head, ...entries.map(({ data }) => data)]);
};

const main = () => {
  if (!existsSync(TAURI_CLI)) {
    throw new Error('The Tauri CLI is not installed. Run npm install in the repository first.');
  }
  const work = mkdtempSync(join(tmpdir(), 'spool-icons-'));
  try {
    const nativeExports = [];
    const iconTool = findIconTool();
    let master = MASTER;
    let artwork;
    let convertedProfile;
    if (iconTool) {
      if (!existsSync(NATIVE_SOURCE)) throw new Error(`Missing editable source: ${NATIVE_SOURCE}`);
      if (!existsSync(SRGB_PROFILE)) throw new Error(`Missing ColorSync profile: ${SRGB_PROFILE}`);
      let defaultSrgb;
      for (const [rendition, name, srgbName] of [
        ['Default', 'spool-artwork-1024.png', 'spool-artwork-srgb-1024.png'],
        ['Dark', 'spool-artwork-dark-1024.png', 'spool-artwork-dark-srgb-1024.png'],
      ]) {
        const path = join(work, name);
        execFileSync(iconTool, [
          NATIVE_SOURCE, '--export-image', '--output-file', path,
          '--platform', 'macOS', '--rendition', rendition,
          '--width', '1024', '--height', '1024', '--scale', '1',
          '--design-generation', '27',
        ], { stdio: 'inherit' });
        const data = readFileSync(path);
        // Preserve ictool's 16-bit artwork; Tauri converts the bundle raster to
        // 8-bit RGBA while applying the legacy inset below.
        checkPng(data, 1024, path, true);
        nativeExports.push([join(EXPORT_DIR, name), data]);
        const srgbPath = join(work, srgbName);
        execFileSync('/usr/bin/sips', ['--matchTo', SRGB_PROFILE, path, '--out', srgbPath], { stdio: 'pipe' });
        const srgb = readFileSync(srgbPath);
        checkPng(srgb, 1024, srgbPath, true);
        nativeExports.push([join(EXPORT_DIR, srgbName), srgb]);
        if (rendition === 'Default') {
          defaultSrgb = srgb;
          convertedProfile = profileChunk(srgb);
        }
      }
      // Icon Composer exports full-bleed native artwork. Legacy ICNS needs its
      // own safe margin; inset once here, never inside the editable .icon source.
      artwork = defaultSrgb;
      master = placeArtwork(work, artwork, 100, 'inset');
      console.log('[icon] Exported Default and Dark with Icon Composer; ColorSync converted Display P3 to sRGB before resizing.');

      // macOS 26 and later draw the app icon from Assets.car (CFBundleIconName),
      // natively from the .icon layers; with the ICNS alone Finder puts this inset
      // icon on a grey plate at several small sizes. Tauri bundles a listed .car
      // as-is, so builds never run actool. actool needs a real stdin ("Bad file
      // descriptor" otherwise), and it stamps each compile with a time and random
      // rendition names: this one file is not byte-reproducible.
      const catalog = join(work, 'catalog');
      mkdirSync(catalog);
      execFileSync('/usr/bin/xcrun', [
        'actool', NATIVE_SOURCE, '--compile', catalog, '--app-icon', 'Spool',
        '--platform', 'macosx', '--target-device', 'mac', '--minimum-deployment-target', '26.0',
        '--output-partial-info-plist', join(catalog, 'partial.plist'),
        '--output-format', 'human-readable-text', '--errors',
      ], { stdio: ['ignore', 'inherit', 'inherit'] });
      if (!existsSync(join(catalog, 'Assets.car'))) {
        throw new Error('actool produced no Assets.car (see its errors above). If they say "Bad file descriptor", run `pkill -x ibtoold` and try again.');
      }
      nativeExports.push([CATALOG, readFileSync(join(catalog, 'Assets.car'))]);
      console.log('[icon] Compiled Spool.icon into Assets.car for macOS 26 and later.');
    } else {
      console.warn('[icon] Native export skipped: ictool is unavailable; using checked-in spool-app-icon-1024.png, spool-artwork-srgb-1024.png and Assets.car.');
      for (const path of [MASTER, ARTWORK]) {
        if (!existsSync(path)) {
          throw new Error(`Missing reviewed export: ${path}\nRun this command on macOS with Icon Composer installed, or set IC_TOOL to its executable.`);
        }
      }
      artwork = readFileSync(ARTWORK);
    }
    let masterData = readFileSync(master);
    checkPng(masterData, 1024, master);
    convertedProfile ??= profileChunk(masterData);
    masterData = withProfile(masterData, convertedProfile);

    const output = join(work, 'png');
    renderPngSizes(master, output, SIZES);

    const samples = new Map(SIZES.map((size) => {
      const path = join(output, `${size}x${size}.png`);
      const data = readFileSync(path);
      checkPng(data, size, path);
      return [size, withProfile(data, convertedProfile)];
    }));

    // Tauri's ICNS encoder preserves straight alpha in the legacy 16/32px
    // representations. iconutil's ARGB encoder darkened partially transparent
    // pixels in those two representations during our round-trip verification.
    const bundleOutput = join(work, 'bundle');
    execFileSync(process.execPath, [TAURI_CLI, 'icon', master, '--output', bundleOutput], { cwd: REPO, stdio: 'pipe' });
    const tauriIcns = readFileSync(join(bundleOutput, 'icon.icns'));
    if (tauriIcns.length < 8 || tauriIcns.toString('ascii', 0, 4) !== 'icns' ||
        tauriIcns.readUInt32BE(4) !== tauriIcns.length) {
      throw new Error('Tauri produced an invalid ICNS file');
    }
    const icns = tagIcns(tauriIcns, convertedProfile);

    // Windows and the website have no system icon grid: as in earlier releases,
    // the tile fills the canvas there. The 100px inset is macOS's grid only.
    const fullBleed = placeArtwork(work, artwork, 0, 'full-bleed');
    const fullOutput = join(work, 'full-bleed-png');
    const fullSizes = [...new Set([...ICO_SIZES, ...SITE_SIZES])];
    renderPngSizes(fullBleed, fullOutput, fullSizes);
    const fullSamples = new Map(fullSizes.map((size) => {
      const path = join(fullOutput, `${size}x${size}.png`);
      const data = readFileSync(path);
      checkPng(data, size, path);
      return [size, withProfile(data, convertedProfile)];
    }));
    // Store tiles are not bundled by the NSIS target; regenerate them anyway so
    // no Windows asset in the icon folder keeps an older design.
    const windowsOutput = join(work, 'windows');
    execFileSync(process.execPath, [TAURI_CLI, 'icon', fullBleed, '--output', windowsOutput], { cwd: REPO, stdio: 'pipe' });
    const storeTiles = readdirSync(windowsOutput)
      .filter((name) => /^(Square\d+x\d+Logo|StoreLogo)\.png$/.test(name))
      .map((name) => [join(ICON_DIR, name), withProfile(readFileSync(join(windowsOutput, name)), convertedProfile)]);
    if (storeTiles.length !== 10) throw new Error(`Expected 10 Windows Store tiles, got ${storeTiles.length}`);

    const outputs = [
      ...nativeExports,
      [MASTER, masterData],
      ...SIZES.map((size) => [join(ICON_DIR, `${size}x${size}.png`), samples.get(size)]),
      [join(ICON_DIR, '128x128@2x.png'), samples.get(256)],
      [join(ICON_DIR, 'icon.png'), samples.get(1024)],
      [join(REPO, 'src-tauri', 'app-icon.png'), samples.get(1024)],
      [join(ICON_DIR, 'icon.ico'), encodeIco(fullSamples)],
      ...storeTiles,
      ...SITE_SIZES.map((size) => [join(SITE_ASSETS, `spool-icon-${size}.png`), fullSamples.get(size)]),
    ];
    outputs.push([join(ICON_DIR, 'icon.icns'), icns]);
    mkdirSync(ICON_DIR, { recursive: true });
    mkdirSync(EXPORT_DIR, { recursive: true });
    for (const [path, data] of outputs) {
      writeFileSync(path, data);
      console.log(`[icon] wrote ${path.slice(REPO.length + 1)} (${data.length} bytes)`);
    }
    console.log('[icon] Complete. Native .icon source and menu-bar template preserved.');
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
};

try {
  main();
} catch (error) {
  console.error(`[icon] ${error.message}`);
  process.exitCode = 1;
}
