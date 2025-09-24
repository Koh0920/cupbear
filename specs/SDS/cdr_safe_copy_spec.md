# Safe Copy Spec (Dangerzone-style) v0.1
Goal: Only deliver a pixel-reconstructed PDF. Do not store originals.

Input: PDF/Office/Images (whitelist), max 25MB
Flow:
  1) libmagic → strict mime (reject on mismatch)
  2) Convert to PDF (LibreOffice headless for Office; ImageMagick/gs for images/PDF)
  3) Rasterize: 150–200dpi (content-aware), grayscale, no OCR (v0); disallow embedded files
     - Graphs/fine lines: 200dpi; photo/text-dominant: 150dpi.
  4) Re-PDF hardening:
     - qpdf --object-streams=generate --remove-unreferenced-resources --strip
     - Remove/forbid: JavaScript, XFA, embedded files, annotations
     - Ghostscript with -dSAFER for any rendering stage
  5) Upload: presigned PUT → `safe/` bucket; GET link TTL = 5 minutes
     - Require end-to-end checksum on PUT (e.g., x-amz-checksum-sha256 or provider-equivalent)

Output: `safe.pdf`
Telemetry: dpi, pages, duration_ms, sha256 (and uploaded checksum)
Guarantees: no original written; tmpfs only; VM destroyed after session
