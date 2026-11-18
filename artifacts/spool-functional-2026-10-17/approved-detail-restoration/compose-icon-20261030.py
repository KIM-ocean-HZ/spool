"""Swap the upper-left brand icon of the approved 10-17 concept image for the
2026-10-30 liquid-glass app icon, using the same method as compose-official-logo.cjs:
the 64px region is rebuilt from the pixels just outside it (Coons patch), then the
icon is composited at the same 60px placement. Nothing outside the region changes.

python3 compose-icon-20261030.py <approved master png> <icon artwork png> <output png> [roi x,y,w,h] [tile x,y,w,h]
The defaults are the AI-workflow image's 10-17 placement; the daily-progress image passes
64,41,88,88 and 68,44,80,80 (its AI-drawn tile spans about 67.5-147.5 x 44-124).
"""
import hashlib, json, sys
from PIL import Image

src_path, icon_path, out_path = sys.argv[1:4]
box = lambda s: dict(zip(('left', 'top', 'width', 'height'), map(int, s.split(','))))
roi = box(sys.argv[4]) if len(sys.argv) > 4 else dict(left=64, top=68, width=64, height=64)
tile = box(sys.argv[5]) if len(sys.argv) > 5 else dict(left=66, top=70, width=60, height=60)

src = Image.open(src_path).convert('RGBA')
px = src.load()
x0, y0 = roi['left'] - 1, roi['top'] - 1
x1, y1 = roi['left'] + roi['width'], roi['top'] + roi['height']
patch = Image.new('RGBA', (roi['width'], roi['height']))
pp = patch.load()
for y in range(roi['height']):
    v = (y + 1) / (roi['height'] + 1)
    for x in range(roi['width']):
        u = (x + 1) / (roi['width'] + 1)
        rgb = []
        for c in range(3):
            vertical = (1 - v) * px[roi['left'] + x, y0][c] + v * px[roi['left'] + x, y1][c]
            horizontal = (1 - u) * px[x0, roi['top'] + y][c] + u * px[x1, roi['top'] + y][c]
            corners = ((1 - u) * (1 - v) * px[x0, y0][c] + u * (1 - v) * px[x1, y0][c]
                       + (1 - u) * v * px[x0, y1][c] + u * v * px[x1, y1][c])
            rgb.append(max(0, min(255, round(vertical + horizontal - corners))))
        pp[x, y] = (*rgb, 255)
icon = Image.open(icon_path).convert('RGBA').resize((tile['width'], tile['height']), Image.LANCZOS)
patch.alpha_composite(icon, (tile['left'] - roi['left'], tile['top'] - roi['top']))
out = src.copy()
out.paste(patch, (roi['left'], roi['top']))
out.save(out_path)

a, b = src.load(), Image.open(out_path).convert('RGBA').load()
outside = sum(1 for y in range(src.height) for x in range(src.width)
              if a[x, y] != b[x, y] and not (roi['left'] <= x < x1 and roi['top'] <= y < y1))
assert outside == 0, outside
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
print(json.dumps({'source_sha256': sha(src_path), 'icon_sha256': sha(icon_path), 'output_sha256': sha(out_path),
                  'replacement_region': roi, 'icon_placement': tile, 'changed_pixels_outside_region': outside}, indent=1))
