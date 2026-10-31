# Spool 组装动效 · 纯净版 V1

状态：**用户已采纳（2026-10-31）**。已接入仓库：`docs/logo/spool-logo-assembly.mp4` 与 `site/assets/spool-logo-assembly.mp4` 都已换成本目录的 MP4（逐字节相同），官网中英文首页按 `?v=ec3b02fb` 请求它，海报用 `poster.png`（`site/assets/spool-logo-assembly-poster.png`）。**已上线**：2026-10-31 07:47 UTC 部署到 spoolapp.org，线上视频与本目录 MP4 逐字节相同，中英文首页在 Chrome 与 WebKit 实测播放、循环、海报和减弱动效都正常（记录见 `docs/HANDOFF-2026-09-04.md` §9.8 的 10-31 条）。

- `spool-assembly-clean-v1-1080p60.mp4`：1080 × 1080，60 fps，8.4 秒，无声；供网页和日常预览。
- `spool-assembly-clean-v1-2160p60-master.mov`：2160 × 2160，60 fps，ProRes 4444；本机母版，纸白不透明背景。文件较大，已由本目录的 `.gitignore` 排除，不随普通 Git 提交。
- `poster.png`：2160 × 2160 的完整停留画面。
- `review.html`：验收播放器，支持重播、半速与停留画面。
- `source/Spool.icon`：本次制作时冻结的已采纳 Icon Composer 源文件。
- `source/stages`：由原生 `ictool` 导出的累积材质层；最终层保留采纳版原始 PNG。

## 设计与节奏

背景使用 App 的 `#faf7f0`，字色使用 `#1c1a16`。仅保留图标与 Spool 字标，不加粒子、文案、装饰底纹或环境光斑。

字标直接读取 App 内置的 `src/assets/fonts/Fraunces[SOFT,WONK,opsz,wght].ttf`，对齐 `src/components/Sidebar/Wordmark.tsx` 的经典主题：Fraunces 400、`tracking-tight`（−0.025em）。放大时保持 App 30px 字标的光学尺寸；SOFT/WONK 使用字体实际默认值。

| 时间 | 画面 |
| --- | --- |
| 0.12–1.00s | 琥珀底座轻淡入，9px 微上移，2.5% 缩放收稳 |
| 0.50–1.50s | 透明玻璃盘出现 |
| 0.95–2.50s | 内外绕线环错峰顺时针展开 |
| 1.60–3.65s | 外侧白色线弧与原有偏移阴影沿原始曲线展开 |
| 2.65–4.05s | 中心轴与原始小白弧、高光细节归位，收敛到采纳版完整渲染 |
| 3.70–5.10s | 字标柔和出现；玻璃盘内仅一次低强度高光掠过 |
| 5.10–6.95s | 完整品牌画面停留 |
| 6.95–8.40s | 缓慢淡出并留白，与开头的纸白画面衔接 |

所有路径沿原始 SVG 几何，包含 `translate(-8,-10)`；不重画标志。外白弧及其阴影分别揭示，避免阴影遮罩切坏白弧端头。最终停留的图标使用采纳版完整原图，保留外白弧阴影、中心小白弧、两点原始高光与细丝纹理。

## 色彩

Icon Composer 中间层通过系统 ColorSync 将 Display P3 像素转换至 sRGB。视频保留 sRGB 传递曲线，采用 BT.709 原色与 YCbCr 矩阵，标记 `1-13-1`，限制视频范围。没有把 P3 文件直接剥离 ICC 后使用，也没有将 sRGB 的界面颜色简单改为另一条 gamma 曲线。

PNG 与实际视频已在同一浏览器中并排核对。H.264 为有损 4:2:0 交付格式，像素不保证与 PNG 完全相同；无损渲染停留帧的图标不透明区域与采纳版逐像素一致。

## 重建

在仓库根目录运行，需要 macOS、Xcode 的 Icon Composer、Swift 与 Homebrew FFmpeg：

```sh
# 仅在需要重建原生中间层时运行；不会改动当前产品源 .icon。
python3 docs/logo/motion/clean-assembly-v1/source/prepare-stages.py

swiftc -O scripts/render-logo-assembly.swift -o /tmp/spool-logo-motion
/tmp/spool-logo-motion --stills
/tmp/spool-logo-motion

# 本地验收页
python3 docs/logo/motion/clean-assembly-v1/source/serve-review.py
```

打开 `http://127.0.0.1:8754/review.html`。验收服务支持视频字节范围请求，便于 WebKit 播放器暂停定位与半速检查。源哈希、字体参数及视频规格保存在 `source/manifest.json`；交付验证保存在 `validation.json`。制作过程没有改动 App 界面、产品图标、旧视频或官网引用；替换旧视频和官网引用是 10-31 采纳之后单独做的接入。
