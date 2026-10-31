// Render a review board from the checked-in icon exports; no artwork changes.
// Run: swift scripts/preview-icon.swift
import AppKit

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let width = 1600, height = 1160
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width,
  pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
  isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
NSGraphicsContext.current?.imageInterpolation = .high

func color(_ hex: Int) -> NSColor {
  NSColor(srgbRed: CGFloat((hex >> 16) & 255) / 255,
    green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1)
}
func rect(_ x: CGFloat, _ top: CGFloat, _ w: CGFloat, _ h: CGFloat) -> NSRect {
  NSRect(x: x, y: CGFloat(height) - top - h, width: w, height: h)
}
func panel(_ x: CGFloat, _ top: CGFloat, _ w: CGFloat, _ h: CGFloat, _ hex: Int, radius: CGFloat = 24) {
  color(hex).setFill()
  NSBezierPath(roundedRect: rect(x, top, w, h), xRadius: radius, yRadius: radius).fill()
}
func label(_ text: String, _ x: CGFloat, _ top: CGFloat, _ size: CGFloat,
  _ hex: Int = 0x302A24, weight: NSFont.Weight = .regular) {
  (text as NSString).draw(at: NSPoint(x: x, y: CGFloat(height) - top - size * 1.3),
    withAttributes: [.font: NSFont.systemFont(ofSize: size, weight: weight),
                     .foregroundColor: color(hex)])
}
func image(_ relative: String, _ x: CGFloat, _ top: CGFloat, _ size: CGFloat) {
  let url = root.appendingPathComponent(relative)
  guard let art = NSImage(contentsOf: url) else { fatalError("Missing image: \(url.path)") }
  art.draw(in: rect(x, top, size, size), from: .zero, operation: .sourceOver,
    fraction: 1, respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
}
func detail(_ relative: String, _ x: CGFloat, _ top: CGFloat, _ size: CGFloat,
  source: NSRect) {
  let art = NSImage(contentsOf: root.appendingPathComponent(relative))!
  let crop = NSRect(x: source.minX / 1024 * art.size.width,
    y: (1024 - source.maxY) / 1024 * art.size.height,
    width: source.width / 1024 * art.size.width,
    height: source.height / 1024 * art.size.height)
  art.draw(in: rect(x, top, size, size), from: crop, operation: .sourceOver,
    fraction: 1, respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
}

let before = "docs/logo/review/restored-v2-baseline/spool-artwork-1024.png"
let after = "docs/logo/exports/spool-artwork-srgb-1024.png"
panel(0, 0, 1600, 1160, 0xF3F0E9, radius: 0)
label("Spool", 64, 43, 44, weight: .semibold)
label("液态玻璃与线材深化 · 保留线轴俯视图的简洁表达", 65, 105, 21, 0x6E655A)
panel(64, 164, 720, 534, 0xFFFDFA)
panel(816, 164, 720, 534, 0xFFFDFA)
image(before, 224, 203, 400)
image(after, 976, 203, 400)
label("基准版", 100, 628, 24, weight: .semibold)
label("已恢复全部原始细节", 195, 634, 17, 0x80766B)
label("深化版", 852, 628, 24, weight: .semibold)
label("原生玻璃光学 · 同心丝纹", 946, 634, 17, 0x80766B)

for (left, title, crop) in [
  (CGFloat(64), "透明轴心 · 局部放大", NSRect(x: 376, y: 374, width: 256, height: 256)),
  (CGFloat(816), "绕线丝纹 · 局部放大", NSRect(x: 440, y: 300, width: 128, height: 128))
] {
  panel(left, 730, 720, 340, 0xFFFDFA)
  label(title, left + 36, 752, 20, weight: .medium)
  detail(before, left + 70, 795, 224, source: crop)
  detail(after, left + 426, 795, 224, source: crop)
  label("基准版", left + 70, 1030, 15, 0x80766B)
  label("深化版", left + 426, 1030, 15, 0x80766B)
}
label("原始阴影与小弧高光完整保留；内侧白环没有新增深色描边。", 65, 1095, 16, 0x80766B)
label("材质在 Icon Composer 内调校 · 交付预览经过 ColorSync → sRGB 色彩转换", 65, 1123, 14, 0x80766B)
NSGraphicsContext.restoreGraphicsState()
let output = root.appendingPathComponent("docs/logo/review/spool-icon-refinement-comparison.png")
try bitmap.representation(using: .png, properties: [:])!.write(to: output)
print(output.path)
