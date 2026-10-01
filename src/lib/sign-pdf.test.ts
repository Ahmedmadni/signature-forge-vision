import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildSignedPdf, type Placement } from "./sign-pdf";

const ONE_PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=";

async function makePdf(pageCount = 1) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) {
    doc.addPage([595.28, 841.89]);
  }
  return doc.save();
}

describe("buildSignedPdf", () => {
  it("produces a readable PDF with the original page count", async () => {
    const source = await makePdf(2);
    const placement: Placement = {
      id: "sig-1",
      page: 1,
      xPct: 0.1,
      yPct: 0.1,
      wPct: 0.25,
      hPct: 0.08,
      image: ONE_PIXEL_PNG,
    };

    const result = await buildSignedPdf(source, [placement]);
    const reopened = await PDFDocument.load(result);

    expect(reopened.getPageCount()).toBe(2);
    expect(result.byteLength).toBeGreaterThan(source.byteLength);
  });

  it("ignores placements that target a missing page", async () => {
    const source = await makePdf(1);
    const placement: Placement = {
      id: "sig-missing-page",
      page: 5,
      xPct: 0.1,
      yPct: 0.1,
      wPct: 0.25,
      hPct: 0.08,
      image: ONE_PIXEL_PNG,
    };

    const result = await buildSignedPdf(source, [placement]);
    const reopened = await PDFDocument.load(result);

    expect(reopened.getPageCount()).toBe(1);
  });

  it("returns the user-facing error for malformed PDF input", async () => {
    await expect(buildSignedPdf(new Uint8Array([1, 2, 3, 4]), [])).rejects.toThrow(
      "تعذّر قراءة ملف PDF",
    );
  });
});
