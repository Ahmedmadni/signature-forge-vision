import { describe, expect, it } from "vitest";
import {
  LARGE_PDF_WARNING_BYTES,
  MAX_PDF_BYTES,
  validatePdfFile,
} from "./pdf-file-policy";

describe("validatePdfFile", () => {
  it("accepts a normal PDF", () => {
    expect(
      validatePdfFile({ name: "doc.pdf", type: "application/pdf", size: 1024 }),
    ).toEqual({ ok: true });
  });

  it("accepts .pdf extension when MIME is missing", () => {
    expect(
      validatePdfFile({ name: "doc.PDF", type: "", size: 1024 }),
    ).toEqual({ ok: true });
  });

  it("rejects non-PDF files", () => {
    expect(
      validatePdfFile({ name: "photo.jpg", type: "image/jpeg", size: 1024 }),
    ).toMatchObject({ ok: false });
  });

  it("rejects empty PDFs", () => {
    expect(
      validatePdfFile({ name: "empty.pdf", type: "application/pdf", size: 0 }),
    ).toMatchObject({ ok: false });
  });

  it("warns for large PDFs while still allowing them", () => {
    expect(
      validatePdfFile({
        name: "large.pdf",
        type: "application/pdf",
        size: LARGE_PDF_WARNING_BYTES,
      }),
    ).toMatchObject({ ok: true, warning: expect.any(String) });
  });

  it("rejects PDFs above the mobile safety limit", () => {
    expect(
      validatePdfFile({
        name: "too-large.pdf",
        type: "application/pdf",
        size: MAX_PDF_BYTES + 1,
      }),
    ).toMatchObject({ ok: false });
  });
});
