export interface Placement {
  id: string;
  page: number; // 1-based
  xPct: number; // نسبة من عرض الصفحة (الزاوية العليا اليسرى)
  yPct: number;
  wPct: number;
  hPct: number;
  image: string; // data URL
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("صورة التوقيع غير صالحة");
  const meta = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  const raw = meta.includes(";base64")
    ? atob(payload)
    : decodeURIComponent(payload);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** يدمج التوقيعات داخل ملف PDF ويعيد البايتات الناتجة. */
export async function buildSignedPdf(
  source: ArrayBuffer | Uint8Array,
  placements: Placement[],
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");

  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(source, { ignoreEncryption: true });
  } catch {
    throw new Error("تعذّر قراءة ملف PDF (قد يكون تالفًا أو محميًا بكلمة مرور)");
  }
  const pages = pdfDoc.getPages();

  const cache = new Map<string, unknown>();
  const embed = async (dataUrl: string) => {
    if (cache.has(dataUrl)) return cache.get(dataUrl) as never;
    const bytes = dataUrlToBytes(dataUrl);
    const isJpeg = /^data:image\/jpe?g/i.test(dataUrl);
    const img = isJpeg ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);
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
