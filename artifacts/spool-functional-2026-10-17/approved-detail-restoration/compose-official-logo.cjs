const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('/Users/hzjin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = __dirname;
const source = '/Users/hzjin/.codex/generated_images/01a146d2-5548-7aa0-8556-eb83d19a9e94/exec-60d3ba4c-624e-4ca7-b8cd-9d4c5cc2423c.png';
const official = '/Users/hzjin/Desktop/Knote/site/assets/spool-logo-full.svg';
const output = path.join(root, 'spool-typewriter-03-restored-official-logo.png');
const roi = { left: 64, top: 68, width: 64, height: 64 };
const tile = { left: 66, top: 70, width: 60, height: 60 };
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
(async () => {
  const { data: raw, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (x, y, c) => raw[(y * info.width + x) * 4 + c];
  const background = Buffer.alloc(roi.width * roi.height * 4);
  const x0 = roi.left - 1, y0 = roi.top - 1;
  const x1 = roi.left + roi.width, y1 = roi.top + roi.height;
  for (let y = 0; y < roi.height; y++) {
    const v = (y + 1) / (roi.height + 1);
    for (let x = 0; x < roi.width; x++) {
      const u = (x + 1) / (roi.width + 1);
      const p = (y * roi.width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const vertical = (1-v)*at(roi.left+x,y0,c) + v*at(roi.left+x,y1,c);
        const horizontal = (1-u)*at(x0,roi.top+y,c) + u*at(x1,roi.top+y,c);
        const corners = (1-u)*(1-v)*at(x0,y0,c) + u*(1-v)*at(x1,y0,c) + (1-u)*v*at(x0,y1,c) + u*v*at(x1,y1,c);
        background[p+c] = Math.max(0, Math.min(255, Math.round(vertical + horizontal - corners)));
      }
      background[p+3] = 255;
    }
  }
  const icon = await sharp(official).resize(tile.width, tile.height).png().toBuffer();
  const patch = await sharp(background, {raw:{width:roi.width,height:roi.height,channels:4}})
    .composite([{input:icon,left:tile.left-roi.left,top:tile.top-roi.top}]).png().toBuffer();
  await sharp(source).composite([{input:patch,left:roi.left,top:roi.top}]).png().toFile(output);
  fs.copyFileSync(official,path.join(root,'official-logo-source.svg'));
  fs.writeFileSync(path.join(root,'official-logo-60.png'),icon);
  const result = await sharp(output).ensureAlpha().raw().toBuffer();
  let changedOutside = 0, changedInside = 0;
  for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
    const p=(y*info.width+x)*4;
    const changed = [0,1,2,3].some(c => raw[p+c]!==result[p+c]);
    if(changed) {
      if(x>=roi.left&&x<roi.left+roi.width&&y>=roi.top&&y<roi.top+roi.height) changedInside++;
      else changedOutside++;
    }
  }
  if(changedOutside!==0) throw new Error('Unexpected pixel changes outside logo region: '+changedOutside);
  const expected = await sharp(patch).ensureAlpha().raw().toBuffer();
  const actual = await sharp(output).extract(roi).ensureAlpha().raw().toBuffer();
  if(!actual.equals(expected)) throw new Error('Composited official logo patch mismatch');
  const manifest = {
    date:'2026-10-17',
    status:'approved-design-detail-restored-with-official-logo',
    user_authorization:'Directly composite official logo material; preserve other artwork pixels.',
    final:path.basename(output),
    width:info.width,height:info.height,
    restoration_tool:'built-in image_gen image edit',
    logo_method:'Deterministic composition of official SVG rasterized with Sharp; no logo redraw.',
    restoration_source:source,
    official_logo_source:official,
    official_logo_sha256:hash(fs.readFileSync(official)),
    replacement_region:roi,official_icon_placement:tile,
    changed_pixels_outside_logo_region:changedOutside,
    changed_pixels_inside_logo_region:changedInside,
    logo_patch_readback_exact:true,
    final_sha256:hash(fs.readFileSync(output))
  };
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  process.stdout.write(JSON.stringify(manifest,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});

