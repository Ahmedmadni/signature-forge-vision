export interface Placement {
  id: string;
  page: number; // 1-based
  xPct: number; // نسبة من عرض الصفحة (الزاوية العليا اليسرى)
  yPct: number;
  wPct: number;
  hPct: number;
  image: string; // data URL
}

/** يدمج التوقيعات داخل ملف PDF ويعيد البايتات الناتجة. */
export async function buildSignedPdf(
  source: ArrayBuffer,
  placements: Placement[],
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.load(source);
  const pages = pdfDoc.getPages();

  const cache = new Map<string, unknown>();
  const embed = async (dataUrl: string) => {
    if (cache.has(dataUrl)) return cache.get(dataUrl) as never;
    const bytes = await (await fetch(dataUrl)).arrayBuffer();
    const img = dataUrl.startsWith("data:image/jpeg")
      ? await pdfDoc.embedJpg(bytes)
      : await pdfDoc.embedPng(bytes);
    cache.set(dataUrl, img);
    return img as never;
  };

  for (const p of placements) {
    const page = pages[p.page - 1];
    if (!page) continue;
    const { width: pw, height: ph } = page.getSize();
    const img = await embed(p.image);
    const w = p.wPct * pw;
    const h = p.hPct * ph;
    page.drawImage(img, {
      x: p.xPct * pw,
      y: ph - p.yPct * ph - h,
      width: w,
      height: h,
    });
  }

  return pdfDoc.save();
}
