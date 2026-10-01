import { describe, expect, it } from "vitest";
import { degrees, PDFDocument } from "pdf-lib";
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

  it("preserves page rotation after signing", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]);
    page.setRotation(degrees(90));
    const source = await doc.save();

    const placement: Placement = {
      id: "rotated-page-signature",
      page: 1,
      xPct: 0.1,
      yPct: 0.1,
      wPct: 0.2,
      hPct: 0.08,
      image: ONE_PIXEL_PNG,
    };

    const result = await buildSignedPdf(source, [placement]);
    const reopened = await PDFDocument.load(result);

    expect(reopened.getPage(0).getRotation().angle).toBe(90);
  });

  it("preserves CropBox and MediaBox geometry after signing", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    page.setCropBox(36, 36, 540, 720);
    const source = await doc.save();

    const placement: Placement = {
      id: "cropbox-signature",
      page: 1,
      xPct: 0.12,
      yPct: 0.76,
      wPct: 0.24,
      hPct: 0.08,
      image: ONE_PIXEL_PNG,
    };

    const result = await buildSignedPdf(source, [placement]);
    const reopened = await PDFDocument.load(result);
    const reopenedPage = reopened.getPage(0);

    expect(reopenedPage.getMediaBox()).toMatchObject({
      x: 0,
      y: 0,
      width: 612,
      height: 792,
    });
    expect(reopenedPage.getCropBox()).toMatchObject({
      x: 36,
      y: 36,
      width: 540,
      height: 720,
    });
  });

  it("handles a larger multi-page PDF without dropping pages", async () => {
    const source = await makePdf(40);
    const placement: Placement = {
      id: "large-pdf-signature",
      page: 40,
      xPct: 0.15,
      yPct: 0.8,
      wPct: 0.22,
      hPct: 0.07,
      image: ONE_PIXEL_PNG,
    };

    const result = await buildSignedPdf(source, [placement]);
    const reopened = await PDFDocument.load(result);

    expect(reopened.getPageCount()).toBe(40);
  });

  it("returns the user-facing error for malformed PDF input", async () => {
    await expect(buildSignedPdf(new Uint8Array([1, 2, 3, 4]), [])).rejects.toThrow(
      "تعذّر قراءة ملف PDF",
    );
  });
});
