import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildScannedPdf } from "./scan";
import { buildSignedPdf, type Placement } from "./sign-pdf";

const ONE_PIXEL_JPEG =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EB//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EB//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EB//2Q==";

const ONE_PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=";

function jpegBlob(): Blob {
  const bytes = Uint8Array.from(atob(ONE_PIXEL_JPEG), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: "image/jpeg" });
}

function fakeCanvas(): HTMLCanvasElement {
  return {
    toBlob(callback: BlobCallback) {
      callback(jpegBlob());
    },
  } as unknown as HTMLCanvasElement;
}

describe("multi-page scan PDF workflow", () => {
  it("exports one PDF page per scanned canvas in the same order", async () => {
    const bytes = await buildScannedPdf([fakeCanvas(), fakeCanvas(), fakeCanvas()]);
    const pdf = await PDFDocument.load(bytes);

    expect(pdf.getPageCount()).toBe(3);
  });

  it("honors a fixed A4 page size", async () => {
    const bytes = await buildScannedPdf([fakeCanvas()], {
      pageSizePt: [595.28, 841.89],
      jpegQuality: 0.92,
    });
    const pdf = await PDFDocument.load(bytes);
    const { width, height } = pdf.getPage(0).getSize();

    expect(width).toBeCloseTo(595.28, 2);
    expect(height).toBeCloseTo(841.89, 2);
  });

  it("supports Scan → Sign → Save as one readable multi-page PDF", async () => {
    const scanned = await buildScannedPdf([fakeCanvas(), fakeCanvas()]);
    const placement: Placement = {
      id: "scan-signature",
      page: 2,
      xPct: 0.12,
      yPct: 0.78,
      wPct: 0.28,
      hPct: 0.08,
      image: ONE_PIXEL_PNG,
    };

    const signed = await buildSignedPdf(scanned, [placement]);
    const reopened = await PDFDocument.load(signed);

    expect(reopened.getPageCount()).toBe(2);
    expect(signed.byteLength).toBeGreaterThan(scanned.byteLength);
  });
});
