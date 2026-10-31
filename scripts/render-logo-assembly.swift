// Deterministic brand-film renderer. Reads frozen, color-managed Icon Composer
// stages; uses the app's bundled Fraunces wordmark, Core Graphics and FFmpeg.
// Build/run from the repository root:
//   swiftc -O scripts/render-logo-assembly.swift -o /tmp/spool-logo-motion
//   /tmp/spool-logo-motion --stills
//   /tmp/spool-logo-motion
import AppKit
import CoreText
import ImageIO
import UniformTypeIdentifiers

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let output = root.appendingPathComponent("docs/logo/motion/clean-assembly-v1")
let stages = output.appendingPathComponent("source/stages")
let stillsOnly = CommandLine.arguments.contains("--stills")
let size = 2160
let fps = 60
let duration = 8.4
let frames = Int(duration * Double(fps))
let paper = CGColor(srgbRed: 250.0 / 255, green: 247.0 / 255, blue: 240.0 / 255, alpha: 1)
let ink = CGColor(srgbRed: 28.0 / 255, green: 26.0 / 255, blue: 22.0 / 255, alpha: 1)
let space = CGColorSpace(name: CGColorSpace.sRGB)!
let bytes = UnsafeMutableRawPointer.allocate(byteCount: size * size * 4, alignment: 64)
defer { bytes.deallocate() }
let context = CGContext(data: bytes, width: size, height: size, bitsPerComponent: 8,
  bytesPerRow: size * 4, space: space,
  bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue)!
context.interpolationQuality = .high
context.setShouldAntialias(true)

func log(_ text: String) { FileHandle.standardError.write(Data((text + "\n").utf8)) }
func load(_ name: String) -> CGImage {
  let url = stages.appendingPathComponent(name + ".png")
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fatalError("Missing native stage: \(url.path)")
  }
  return image
}
let tile = load("00-tile")
let flange = load("01-flange")
let winding = load("02-winding")
let axle = load("03-axle")
let shadow = load("03b-shadows")
let thread = load("04-thread")
let final = load("05-final")

func tag(_ value: String) -> NSNumber {
  NSNumber(value: value.utf8.reduce(UInt32(0)) { ($0 << 8) | UInt32($1) })
}
let fontURL = root.appendingPathComponent("src/assets/fonts/Fraunces[SOFT,WONK,opsz,wght].ttf")
let provider = CGDataProvider(url: fontURL as CFURL)!
let graphicsFont = CGFont(provider)!
let baseFont = CTFontCreateWithGraphicsFont(graphicsFont, 82, nil, nil)
// The app's h1 is 30px, weight 400, tracking-tight (-.025em). Keep its optical
// size when enlarging the same wordmark. SOFT/WONK use the actual font defaults.
let variations: [NSNumber: NSNumber] = [tag("wght"): 400, tag("opsz"): 30]
let descriptor = CTFontDescriptorCreateWithAttributes([kCTFontVariationAttribute: variations] as CFDictionary)
let font = CTFontCreateCopyWithAttributes(baseFont, 82, nil, descriptor)
precondition((CTFontCopyFamilyName(font) as String) == "Fraunces")
let attributes: [NSAttributedString.Key: Any] = [
  NSAttributedString.Key(kCTFontAttributeName as String): font,
  NSAttributedString.Key(kCTKernAttributeName as String): -82 * 0.025,
  NSAttributedString.Key(kCTForegroundColorAttributeName as String): ink,
]
let wordmark = CTLineCreateWithAttributedString(NSAttributedString(string: "Spool", attributes: attributes))
let wordWidth = CTLineGetTypographicBounds(wordmark, nil, nil, nil)
log("Font: \(CTFontCopyFamilyName(font)); resolved axes: \(String(describing: CTFontCopyVariation(font)))")

func unit(_ x: Double) -> Double { min(1, max(0, x)) }
func smooth(_ t: Double, _ start: Double, _ end: Double) -> Double {
  let x = unit((t - start) / (end - start))
  return x * x * x * (x * (x * 6 - 15) + 10)
}
func out(_ t: Double, _ start: Double, _ end: Double) -> Double {
  1 - pow(1 - unit((t - start) / (end - start)), 4)
}
// Source SVG coordinates, including the original mark translation.
func point(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: x - 8, y: 1024 - (y - 10)) }
func circle(_ radius: Double) -> CGPath {
  let c = point(512, 512)
  return CGPath(ellipseIn: CGRect(x: c.x - radius, y: c.y - radius,
    width: radius * 2, height: radius * 2), transform: nil)
}
func ring(_ radius: Double, _ progress: Double, _ width: Double) -> CGPath {
  let path = CGMutablePath()
  let count = max(1, Int(500 * progress))
  for i in 0...count {
    let angle = -Double.pi / 2 + 2 * Double.pi * progress * Double(i) / Double(count)
    let p = point(512 + radius * cos(angle), 512 + radius * sin(angle))
    if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
  }
  return path.copy(strokingWithWidth: width, lineCap: .round, lineJoin: .round, miterLimit: 2)
}
struct V { var x: Double; var y: Double }
func svgArc(_ start: V, _ end: V, radius: Double) -> [V] {
  // Original SVG's circular A commands: large-arc=0, sweep=1.
  let dx = end.x - start.x, dy = end.y - start.y
  let distance = hypot(dx, dy)
  let height = sqrt(max(0, radius * radius - distance * distance / 4))
  let cx = (start.x + end.x) / 2 - dy / distance * height
  let cy = (start.y + end.y) / 2 + dx / distance * height
  let a0 = atan2(start.y - cy, start.x - cx)
  var delta = atan2(end.y - cy, end.x - cx) - a0
  while delta < 0 { delta += 2 * Double.pi }
  return (1...160).map { i in
    let angle = a0 + delta * Double(i) / 160
    return V(x: cx + radius * cos(angle), y: cy + radius * sin(angle))
  }
}
var outerPoints = [V(x: 255, y: 364)]
outerPoints += svgArc(V(x: 255, y: 364), V(x: 410, y: 233), radius: 297)
outerPoints += svgArc(V(x: 410, y: 233), V(x: 740, y: 703), radius: 297)
outerPoints += svgArc(V(x: 740, y: 703), V(x: 589, y: 799), radius: 297)
for i in 1...120 {
  let t = Double(i) / 120, u = 1 - t
  outerPoints.append(V(x: u*u*589 + 2*u*t*512 + t*t*532,
    y: u*u*799 + 2*u*t*829 + t*t*901))
}
var lengths = [Double(0)]
for i in 1..<outerPoints.count {
  lengths.append(lengths.last! + hypot(outerPoints[i].x - outerPoints[i-1].x,
    outerPoints[i].y - outerPoints[i-1].y))
}
func outerMask(_ progress: Double, offsetX: Double = 0, offsetY: Double = 0, width: Double = 66) -> CGPath {
  let target = lengths.last! * progress
  let path = CGMutablePath()
  path.move(to: point(outerPoints[0].x + offsetX, outerPoints[0].y + offsetY))
  for i in 1..<outerPoints.count {
    let p = outerPoints[i]
    if lengths[i] <= target {
      path.addLine(to: point(p.x + offsetX, p.y + offsetY))
    } else {
      let u = unit((target - lengths[i-1]) / (lengths[i] - lengths[i-1]))
      let prev = outerPoints[i-1]
      path.addLine(to: point(prev.x + (p.x - prev.x)*u + offsetX,
        prev.y + (p.y - prev.y)*u + offsetY))
      break
    }
  }
  return path.copy(strokingWithWidth: width, lineCap: .round, lineJoin: .round, miterLimit: 2)
}
func image(_ source: CGImage, opacity: Double = 1, clip: CGPath? = nil,
  scale: Double = 1) {
  guard opacity > 0 else { return }
  context.saveGState()
  context.setAlpha(opacity)
  if let clip { context.addPath(clip); context.clip() }
  if scale != 1 {
    let c = point(512, 512)
    context.translateBy(x: c.x, y: c.y)
    context.scaleBy(x: scale, y: scale)
    context.translateBy(x: -c.x, y: -c.y)
  }
  context.draw(source, in: CGRect(x: 0, y: 0, width: 1024, height: 1024))
  context.restoreGState()
}
let sheen = CGGradient(colorsSpace: space, colors: [
  CGColor(srgbRed: 1, green: 1, blue: 1, alpha: 0),
  CGColor(srgbRed: 1, green: 1, blue: 1, alpha: 0.055),
  CGColor(srgbRed: 1, green: 1, blue: 1, alpha: 0),
] as CFArray, locations: [0, 0.5, 1])!

func drawFrame(_ time: Double) {
  context.saveGState()
  context.scaleBy(x: Double(size) / 1080, y: Double(size) / 1080)
  context.setFillColor(paper)
  context.fill(CGRect(x: 0, y: 0, width: 1080, height: 1080))
  let exit = 1 - smooth(time, 6.95, 7.9)
  let entrance = out(time, 0.16, 1.0)
  let alpha = smooth(time, 0.12, 0.95) * exit
  context.saveGState()
  context.setAlpha(alpha)
  // A quiet 9px rise and 2.5% settling, with no overshoot or bounce.
  context.translateBy(x: 540, y: 1080 - (198 + 256) - (1 - entrance) * 9)
  let scale = 0.975 + entrance * 0.025
  context.scaleBy(x: 0.5 * scale, y: 0.5 * scale)
  context.translateBy(x: -512, y: -512)
  // Per-layer opacity is applied inside an isolated transparency layer.
  context.beginTransparencyLayer(auxiliaryInfo: nil)
  image(tile)
  let flangeIn = smooth(time, 0.5, 1.5)
  image(flange, opacity: flangeIn, clip: circle(372), scale: 0.975 + 0.025 * out(time, 0.5, 1.5))
  let inner = smooth(time, 0.95, 1.95)
  if inner > 0 { image(winding, clip: ring(67, inner, 64)) }
  let middle = smooth(time, 1.15, 2.5)
  if middle > 0 { image(winding, clip: ring(174, middle, 68)) }
  let outer = smooth(time, 1.6, 3.65)
  if outer > 0 {
    image(shadow, clip: outerMask(outer, offsetX: 26, offsetY: 36, width: 76))
    image(thread, clip: outerMask(outer))
  }
  let axleIn = smooth(time, 2.65, 3.65)
  image(axle, opacity: axleIn, clip: circle(113), scale: 0.985 + 0.015 * out(time, 2.65, 3.65))
  // Resolve to the adopted native render: every authored highlight and shadow is
  // present, with an exact unmodified final frame rather than an approximation.
  image(final, opacity: smooth(time, 3.55, 4.05))
  if time > 3.8 && time < 5.1 {
    let sweep = unit((time - 3.8) / 1.3)
    let envelope = pow(sin(Double.pi * sweep), 2)
    context.saveGState()
    context.addPath(circle(354)); context.clip()
    context.setAlpha(envelope)
    context.translateBy(x: -160 + sweep * 1380, y: 512)
    context.rotate(by: -0.36)
    context.drawLinearGradient(sheen, start: CGPoint(x: -140, y: 0),
      end: CGPoint(x: 140, y: 0), options: [])
    context.restoreGState()
  }
  context.endTransparencyLayer()
  context.restoreGState()
  let titleIn = smooth(time, 3.7, 4.65)
  context.setAlpha(titleIn * exit)
  context.textMatrix = .identity
  context.textPosition = CGPoint(x: (1080 - wordWidth) / 2,
    y: 1080 - 838 - (1 - out(time, 3.7, 4.65)) * 7)
  CTLineDraw(wordmark, context)
  context.restoreGState()
}

func savePng(_ name: String) {
  let url = output.appendingPathComponent(name)
  let image = context.makeImage()!
  let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(destination, image, nil)
  precondition(CGImageDestinationFinalize(destination))
}
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
if stillsOnly {
  for (name, t) in [("frame-000.png", 0.0), ("frame-075.png", 0.75),
    ("frame-150.png", 1.5), ("frame-240.png", 2.4), ("frame-330.png", 3.3),
    ("frame-420.png", 4.2), ("poster.png", 5.4), ("frame-750.png", 7.5),
    ("frame-last.png", duration - 1 / Double(fps))] {
    drawFrame(t); savePng(name)
  }
  log("Stills rendered: \(output.path)")
  exit(0)
}

let encoder = Process()
encoder.executableURL = URL(fileURLWithPath: "/opt/homebrew/bin/ffmpeg")
let pipe = Pipe()
encoder.standardInput = pipe
encoder.standardOutput = FileHandle.nullDevice
encoder.standardError = try FileHandle(forWritingTo: {
  let url = output.appendingPathComponent("encode.log")
  FileManager.default.createFile(atPath: url.path, contents: nil)
  return url
}())
// Preserve the artwork's sRGB transfer curve (nclc 1-13-1). Rec.709 is used for
// YCbCr and primaries, not as a substitute gamma curve for UI artwork.
let color = ["-color_primaries", "bt709", "-color_trc", "iec61966-2-1", "-colorspace", "bt709", "-color_range", "tv"]
encoder.arguments = ["-y", "-hide_banner", "-loglevel", "warning", "-f", "rawvideo",
  "-pixel_format", "bgra", "-video_size", "\(size)x\(size)", "-framerate", "\(fps)", "-i", "pipe:0",
  "-filter_complex", "[0:v]format=gbrp16le,zscale=primariesin=709:transferin=iec61966-2-1:matrixin=gbr:rangein=full:primaries=709:transfer=iec61966-2-1:matrix=709:range=limited:dither=error_diffusion,format=yuv444p10le,split=2[m][p0];[p0]scale=1080:1080:flags=lanczos,format=yuv420p[p]",
  "-map", "[m]", "-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le", "-vendor", "apl0"] + color +
  ["-movflags", "+write_colr", output.appendingPathComponent("spool-assembly-clean-v1-2160p60-master.mov").path,
   "-map", "[p]", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p"] + color +
  ["-movflags", "+faststart", output.appendingPathComponent("spool-assembly-clean-v1-1080p60.mp4").path]
try encoder.run()
for frame in 0..<frames {
  autoreleasepool {
    drawFrame(Double(frame) / Double(fps))
    if frame == 324 { savePng("poster.png") }
    pipe.fileHandleForWriting.write(Data(bytesNoCopy: bytes, count: size * size * 4, deallocator: .none))
  }
  if frame % fps == 0 { log("Rendered \(frame)/\(frames) frames") }
}
try pipe.fileHandleForWriting.close()
encoder.waitUntilExit()
precondition(encoder.terminationStatus == 0, "FFmpeg failed; inspect encode.log")
log("Complete: \(frames) frames, \(duration)s, \(fps)fps. \(output.path)")
