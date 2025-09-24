import { PDFDocument, PDFName } from "pdf-lib";
import { AgentError } from "./errors";

export type PdfSanitizeResult = {
  pdf: Uint8Array;
  pages: number;
  dpi: number;
};

const FORBIDDEN_TOKENS = [
  /\/JavaScript\b/i,
  /\/JS\b/i,
  /\/AA\b/i,
  /\/OpenAction\b/i,
  /\/RichMedia\b/i,
  /\/EmbeddedFile\b/i,
  /\/EmbeddedFiles\b/i,
  /\/Launch\b/i,
  /\/XFA\b/i,
  /\/ObjStm\b/i,
];

export async function sanitizePdf(buffer: Buffer): Promise<PdfSanitizeResult> {
  let document: PDFDocument;
  try {
    document = await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (error) {
    throw new AgentError("Unable to parse PDF", { status: 422, detail: (error as Error).message });
  }

  const safeDoc = await PDFDocument.create();
  safeDoc.setTitle("CupBear Safe Copy");
  safeDoc.setProducer("CupBear SafeCopy Agent");
  safeDoc.setCreator("CupBear SafeCopy Agent");

  const pageIndices = document.getPageIndices();
  const copiedPages = await safeDoc.copyPages(document, pageIndices);

  for (const page of copiedPages) {
    const node = page.node;
    node.delete(PDFName.of("Annots"));
    node.delete(PDFName.of("AA"));
    node.delete(PDFName.of("Metadata"));
    safeDoc.addPage(page);
  }

  const forbiddenCatalogKeys = [
    "OpenAction",
    "AA",
    "AcroForm",
    "Names",
    "Metadata",
    "StructTreeRoot",
    "Threads",
    "Outlines",
    "Perms",
  ];

  for (const key of forbiddenCatalogKeys) {
    safeDoc.catalog.delete(PDFName.of(key));
  }

  const bytes = await safeDoc.save({ useObjectStreams: false, addDefaultPage: false });

  const text = Buffer.from(bytes).toString("binary");
  for (const token of FORBIDDEN_TOKENS) {
    if (token.test(text)) {
      throw new AgentError("Sanitised PDF still contains forbidden markers", { status: 500 });
    }
  }

  return {
    pdf: bytes,
    pages: copiedPages.length,
    dpi: 150,
  };
}
