// OCR a PDF (or image) with macOS Vision, for scanned documents whose text layer is empty.
// Usage: swift scripts/research/ocr.swift <input.pdf|png|jpg> [first_page] [last_page] > out.ocr.txt
// Pages are rendered at 300 dpi; output keeps one line per recognised text line, top to bottom,
// with a "=== page N ===" separator. OCR text is raw evidence of lower fidelity: check digits by eye.
import AppKit
import Foundation
import PDFKit
import Vision

func recognise(_ cg: CGImage) -> [String] {
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = false
    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    try? handler.perform([req])
    let obs = (req.results ?? []).compactMap { $0 as VNRecognizedTextObservation }
    // sort top-to-bottom, then left-to-right, and merge observations on the same row
    let sorted = obs.sorted { a, b in
        abs(a.boundingBox.midY - b.boundingBox.midY) > 0.006 ? a.boundingBox.midY > b.boundingBox.midY
            : a.boundingBox.minX < b.boundingBox.minX
    }
    var lines: [String] = []
    var row: [String] = []
    var rowY: CGFloat? = nil
    for o in sorted {
        guard let s = o.topCandidates(1).first?.string else { continue }
        if let y = rowY, abs(o.boundingBox.midY - y) <= 0.006 {
            row.append(s)
        } else {
            if !row.isEmpty { lines.append(row.joined(separator: "  ")) }
            row = [s]
            rowY = o.boundingBox.midY
        }
    }
    if !row.isEmpty { lines.append(row.joined(separator: "  ")) }
    return lines
}

let args = CommandLine.arguments
guard args.count >= 2 else { FileHandle.standardError.write("usage: ocr.swift file [first] [last]\n".data(using: .utf8)!); exit(2) }
let url = URL(fileURLWithPath: args[1])
if url.pathExtension.lowercased() == "pdf" {
    guard let doc = PDFDocument(url: url) else { exit(1) }
    let first = args.count > 2 ? max(1, Int(args[2]) ?? 1) : 1
    let last = args.count > 3 ? min(doc.pageCount, Int(args[3]) ?? doc.pageCount) : doc.pageCount
    for i in (first - 1)..<last {
        guard let page = doc.page(at: i) else { continue }
        let box = page.bounds(for: .mediaBox)
        let scale: CGFloat = 300.0 / 72.0
        let w = Int(box.width * scale), h = Int(box.height * scale)
        let cs = CGColorSpaceCreateDeviceRGB()
        guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { continue }
        ctx.setFillColor(NSColor.white.cgColor)
        ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
        ctx.scaleBy(x: scale, y: scale)
        page.draw(with: .mediaBox, to: ctx)
        guard let cg = ctx.makeImage() else { continue }
        print("=== page \(i + 1) ===")
        recognise(cg).forEach { print($0) }
    }
} else if let img = NSImage(contentsOf: url), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) {
    recognise(cg).forEach { print($0) }
}
