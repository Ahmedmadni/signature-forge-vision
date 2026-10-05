export const LARGE_PDF_WARNING_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_BYTES = 100 * 1024 * 1024;

export type PdfFilePolicyResult =
  | { ok: true; warning?: string }
  | { ok: false; error: string };

type PdfLikeFile = Pick<File, "name" | "type" | "size">;

export function validatePdfFile(file: PdfLikeFile): PdfFilePolicyResult {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return { ok: false, error: "اختر ملف PDF فقط" };
  }

  if (file.size <= 0) {
    return { ok: false, error: "ملف PDF فارغ أو غير صالح" };
  }

  if (file.size > MAX_PDF_BYTES) {
    return {
      ok: false,
      error: "حجم ملف PDF أكبر من 100 MB. استخدم ملفًا أصغر لتفادي نفاد ذاكرة الجهاز.",
    };
  }

  if (file.size >= LARGE_PDF_WARNING_BYTES) {
    return {
      ok: true,
      warning: "هذا ملف PDF كبير وقد يحتاج وقتًا وذاكرة إضافية على الهاتف.",
    };
  }

  return { ok: true };
}
