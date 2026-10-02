export interface Placement {
  id: string;
  page: number; // 1-based
  xPct: number; // نسبة من عرض الصفحة المرئية (الزاوية العليا اليسرى)
  yPct: number;
  wPct: number;
  hPct: number;
  image: string; // data URL
}

interface PageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacementDrawOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
}

function normalizeRightAngle(angle: number): 0 | 90 | 180 | 270 {
  const normalized = ((angle % 360) + 360) % 360;
  if (normalized === 90 || normalized === 180 || normalized === 270) return normalized;
  return 0;
}

/**
 * يحول موضع التوقيع من إحداثيات واجهة PDF.js (أعلى-يسار وعلى الصفحة المرئية)
 * إلى إحداثيات PDF (أسفل-يسار)، مع احترام CropBox وRotate.
 */
export function placementToDrawOptions(
  placement: Pick<Placement, "xPct" | "yPct" | "wPct" | "hPct">,
  cropBox: PageBox,
  rotationAngle: number,
): PlacementDrawOptions {
  const rotation = normalizeRightAngle(rotationAngle);
  const rotated = rotation === 90 || rotation === 270;
  const visualWidth = rotated ? cropBox.height : cropBox.width;
  const visualHeight = rotated ? cropBox.width : cropBox.height;

  const vx = placement.xPct * visualWidth;
  const vy = placement.yPct * visualHeight;
  const width = placement.wPct * visualWidth;
  const height = placement.hPct * visualHeight;

  let localX = vx;
  let localY = cropBox.height - vy - height;

  if (rotation === 90) {
    localX = vy + height;
    localY = vx;
  } else if (rotation === 180) {
    localX = cropBox.width - vx;
    localY = vy + height;
  } else if (rotation === 270) {
    localX = cropBox.width - vy - height;
    localY = cropBox.height - vx;
  }

  return {
    x: cropBox.x + localX,
    y: cropBox.y + localY,
    width,
    height,
    rotation,
  };
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("صورة التوقيع غير صالحة");
  const meta = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  const raw = meta.includes(";base64") ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** يدمج التوقيعات داخل ملف PDF ويعيد البايتات الناتجة. */
export async function buildSignedPdf(
  source: ArrayBuffer | Uint8Array,
  placements: Placement[],
): Promise<Uint8Array> {
  const { degrees, PDFDocument } = await import("pdf-lib");

  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(source);
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

  for (const placement of placements) {
    const page = pages[placement.page - 1];
    if (!page) continue;

    const img = await embed(placement.image);
    const cropBox = page.getCropBox();
    const options = placementToDrawOptions(
      placement,
      cropBox,
      page.getRotation().angle,
    );
    page.drawImage(img, {
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      rotate: degrees(options.rotation),
    });
  }

  return pdfDoc.save();
}
