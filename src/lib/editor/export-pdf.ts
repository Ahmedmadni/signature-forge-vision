import type { EditorField } from "./types";

/** يدمج الحقول (توقيعات، نصوص، تواريخ) في ملف PDF قابل للتنزيل. جهة العميل فقط. */
export async function exportSignedPdf(
  src: string,
  fields: EditorField[],
  fileName: string,
): Promise<void> {
  const { PDFDocument, rgb, StandardFonts, degrees } = await import("pdf-lib");

  const bytes = await (await fetch(src)).arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  // ذاكرة مؤقتة للصور المضمّنة
  const imageCache = new Map<string, any>();
  const embedImage = async (dataUrl: string) => {
    if (imageCache.has(dataUrl)) return imageCache.get(dataUrl);
    const b = await (await fetch(dataUrl)).arrayBuffer();
    const img = dataUrl.startsWith("data:image/jpeg")
      ? await pdfDoc.embedJpg(b)
      : await pdfDoc.embedPng(b);
    imageCache.set(dataUrl, img);
    return img;
  };

  for (const f of fields) {
    const page = pages[f.page - 1];
    if (!page) continue;
    const { width: pw, height: ph } = page.getSize();

    const x = f.xPct * pw;
    const w = f.wPct * pw;
    const h = f.hPct * ph;
    // pdf-lib أصل الإحداثيات أسفل اليسار
    const y = ph - f.yPct * ph - h;
    const image = (f.metadata as any)?.image as string | undefined;

    if (image) {
      const img = await embedImage(image);
      page.drawImage(img, {
        x,
        y,
        width: w,
        height: h,
        opacity: f.opacity,
        rotate: degrees(-f.rotation),
      });
    } else if (f.type === "checkbox") {
      if (f.checked !== false) {
        page.drawText("X", {
          x: x + w * 0.15,
          y: y + h * 0.1,
          size: Math.min(w, h) * 0.9,
          font,
          color: rgb(0.06, 0.09, 0.16),
          opacity: f.opacity,
        });
      }
    } else if (f.value) {
      const size = Math.max(Math.min(h * 0.7, 24), 8);
      page.drawText(String(f.value), {
        x,
        y: y + (h - size) / 2,
        size,
        font,
        color: rgb(0.06, 0.09, 0.16),
        opacity: f.opacity,
        rotate: degrees(-f.rotation),
      });
    }
  }

  const out = await pdfDoc.save();
  const blob = new Blob([out as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.replace(/\.[^.]+$/, "") + "-signed.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
