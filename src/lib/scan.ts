/**
 * محرّك المسح الضوئي: كشف حدود الورقة تلقائيًا، تصحيح المنظور، تحسين الجودة،
 * ثم تصدير صفحات PDF عالية الدقة — كل ذلك محليًا على جهاز المستخدم.
 */

export interface Pt {
  x: number;
  y: number;
}

export type Quad = [Pt, Pt, Pt, Pt]; // أعلى-يسار، أعلى-يمين، أسفل-يمين، أسفل-يسار

export type ScanFilter = "color" | "enhanced" | "bw";

export interface ScanPage {
  id: string;
  /** الصورة الأصلية كما التقطها المستخدم */
  source: ImageBitmap | HTMLImageElement;
  sourceWidth: number;
  sourceHeight: number;
  quad: Quad;
  filter: ScanFilter;
  rotation: 0 | 90 | 180 | 270;
  /** معاينة ناتجة (data URL) */
  preview: string;
}

const MAX_OUTPUT = 2400;

/* ------------------------------------------------------------------ */
/* أدوات مساعدة                                                        */
/* ------------------------------------------------------------------ */

export async function loadImage(file: File | Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fallback */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("تعذّر قراءة الصورة"));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

function drawToCanvas(
  src: CanvasImageSource,
  w: number,
  h: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

export function defaultQuad(w: number, h: number): Quad {
  const mx = w * 0.06;
  const my = h * 0.06;
  return [
    { x: mx, y: my },
    { x: w - mx, y: my },
    { x: w - mx, y: h - my },
    { x: mx, y: h - my },
  ];
}

/* ------------------------------------------------------------------ */
/* كشف حدود الورقة (Sobel + Hough)                                     */
/* ------------------------------------------------------------------ */

interface Line {
  theta: number; // راديان، اتجاه العمودي على الخط
  rho: number;
  votes: number;
}

export function detectDocument(
  src: CanvasImageSource,
  srcW: number,
  srcH: number,
): Quad {
  try {
    const scale = Math.min(1, 420 / Math.max(srcW, srcH));
    const w = Math.max(80, Math.round(srcW * scale));
    const h = Math.max(80, Math.round(srcH * scale));
    const { ctx } = drawToCanvas(src, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    // رمادي + تنعيم بسيط
    const gray = new Float32Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const blur = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += gray[(y + dy) * w + x + dx];
        blur[y * w + x] = s / 9;
      }
    }

    // Sobel
    const mag = new Float32Array(w * h);
    const ang = new Float32Array(w * h);
    let maxMag = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx =
          -blur[i - w - 1] - 2 * blur[i - 1] - blur[i + w - 1] +
          blur[i - w + 1] + 2 * blur[i + 1] + blur[i + w + 1];
        const gy =
          -blur[i - w - 1] - 2 * blur[i - w] - blur[i - w + 1] +
          blur[i + w - 1] + 2 * blur[i + w] + blur[i + w + 1];
        const m = Math.hypot(gx, gy);
        mag[i] = m;
        ang[i] = Math.atan2(gy, gx);
        if (m > maxMag) maxMag = m;
      }
    }
    if (maxMag < 1) return defaultQuad(srcW, srcH);
    const thresh = maxMag * 0.28;

    // Hough
    const thetaBins = 180;
    const dTheta = Math.PI / thetaBins;
    const diag = Math.ceil(Math.hypot(w, h));
    const rhoBins = 2 * diag + 1;
    const acc = new Float32Array(thetaBins * rhoBins);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (mag[i] < thresh) continue;
        let t = ang[i];
        if (t < 0) t += Math.PI;
        const base = Math.round(t / dTheta);
        for (let k = -2; k <= 2; k++) {
          const tb = ((base + k) % thetaBins + thetaBins) % thetaBins;
          const th = tb * dTheta;
          const rho = Math.round(x * Math.cos(th) + y * Math.sin(th)) + diag;
          if (rho < 0 || rho >= rhoBins) continue;
          acc[tb * rhoBins + rho] += mag[i];
        }
      }
    }

    // استخراج أقوى الخطوط مع منع التكرار
    const lines: Line[] = [];
    const used = new Set<number>();
    for (let n = 0; n < 40; n++) {
      let best = -1;
      let bestVal = 0;
      for (let i = 0; i < acc.length; i++) {
        if (acc[i] > bestVal && !used.has(i)) {
          bestVal = acc[i];
          best = i;
        }
      }
      if (best < 0 || bestVal <= 0) break;
      const tb = Math.floor(best / rhoBins);
      const rb = best % rhoBins;
      for (let dt = -6; dt <= 6; dt++) {
        for (let dr = -Math.round(diag * 0.08); dr <= Math.round(diag * 0.08); dr++) {
          const t2 = ((tb + dt) % thetaBins + thetaBins) % thetaBins;
          const r2 = rb + dr;
          if (r2 < 0 || r2 >= rhoBins) continue;
          used.add(t2 * rhoBins + r2);
        }
      }
      lines.push({ theta: tb * dTheta, rho: rb - diag, votes: bestVal });
    }

    // تصنيف: خطوط أفقية (العمودي عليها رأسي ≈ 90°) وخطوط رأسية
    const horiz: Line[] = [];
    const vert: Line[] = [];
    for (const l of lines) {
      const deg = (l.theta * 180) / Math.PI;
      if (Math.abs(deg - 90) < 35) horiz.push(l);
      else if (deg < 35 || deg > 145) vert.push(l);
    }
    if (horiz.length < 2 || vert.length < 2) return defaultQuad(srcW, srcH);

    const cx = w / 2;
    const cy = h / 2;
    const yAt = (l: Line) => (l.rho - cx * Math.cos(l.theta)) / (Math.sin(l.theta) || 1e-6);
    const xAt = (l: Line) => (l.rho - cy * Math.sin(l.theta)) / (Math.cos(l.theta) || 1e-6);

    const hs = [...horiz].sort((a, b) => yAt(a) - yAt(b));
    const vs = [...vert].sort((a, b) => xAt(a) - xAt(b));
    const top = hs[0];
    const bottom = hs[hs.length - 1];
    const left = vs[0];
    const right = vs[vs.length - 1];

    const inter = (a: Line, b: Line): Pt | null => {
      const a1 = Math.cos(a.theta);
      const b1 = Math.sin(a.theta);
      const a2 = Math.cos(b.theta);
      const b2 = Math.sin(b.theta);
      const det = a1 * b2 - a2 * b1;
      if (Math.abs(det) < 1e-6) return null;
      return { x: (a.rho * b2 - b.rho * b1) / det, y: (a1 * b.rho - a2 * a.rho) / det };
    };

    const tl = inter(top, left);
    const tr = inter(top, right);
    const br = inter(bottom, right);
    const bl = inter(bottom, left);
    if (!tl || !tr || !br || !bl) return defaultQuad(srcW, srcH);

    const quad = [tl, tr, br, bl].map((p) => ({
      x: (p.x / w) * srcW,
      y: (p.y / h) * srcH,
    })) as Quad;

    // تحقق من المعقولية
    const area = polygonArea(quad);
    const imgArea = srcW * srcH;
    const inside = quad.every(
      (p) => p.x > -srcW * 0.1 && p.x < srcW * 1.1 && p.y > -srcH * 0.1 && p.y < srcH * 1.1,
    );
    if (!inside || area < imgArea * 0.15 || area > imgArea * 1.05) return defaultQuad(srcW, srcH);
    return quad.map((p) => ({
      x: Math.min(Math.max(p.x, 0), srcW),
      y: Math.min(Math.max(p.y, 0), srcH),
    })) as Quad;
  } catch {
    return defaultQuad(srcW, srcH);
  }
}

function polygonArea(q: Quad) {
  let a = 0;
  for (let i = 0; i < 4; i++) {
    const p = q[i];
    const n = q[(i + 1) % 4];
    a += p.x * n.y - n.x * p.y;
  }
  return Math.abs(a) / 2;
}

/* ------------------------------------------------------------------ */
/* تصحيح المنظور + التحسين                                              */
/* ------------------------------------------------------------------ */

/** يحسب مصفوفة تحويل من الوجهة إلى المصدر */
function homography(dst: Quad, src: Quad): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = dst[i];
    const { x: u, y: v } = src[i];
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    b.push(v);
  }
  // حل غاوس 8x8
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c] || 1e-9;
    for (let k = c; k <= n; k++) M[c][k] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c];
      if (!f) continue;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const h = M.map((r) => r[n]);
  return [...h, 1];
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** يقصّ الورقة ويصحّح منظورها ويطبّق فلتر التحسين ويعيد Canvas جاهزًا */
export function renderPage(
  src: CanvasImageSource,
  srcW: number,
  srcH: number,
  quad: Quad,
  filter: ScanFilter,
  rotation: 0 | 90 | 180 | 270 = 0,
  maxSize = MAX_OUTPUT,
): HTMLCanvasElement {
  const wTop = dist(quad[0], quad[1]);
  const wBot = dist(quad[3], quad[2]);
  const hLeft = dist(quad[0], quad[3]);
  const hRight = dist(quad[1], quad[2]);
  let outW = Math.max(wTop, wBot);
  let outH = Math.max(hLeft, hRight);
  const k = Math.min(1, maxSize / Math.max(outW, outH));
  outW = Math.max(32, Math.round(outW * k));
  outH = Math.max(32, Math.round(outH * k));

  const { canvas: srcCanvas, ctx: srcCtx } = drawToCanvas(src, srcW, srcH);
  const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);

  const dstQuad: Quad = [
    { x: 0, y: 0 },
    { x: outW, y: 0 },
    { x: outW, y: outH },
    { x: 0, y: outH },
  ];
  const H = homography(dstQuad, quad);

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const outCtx = out.getContext("2d", { willReadFrequently: true })!;
  const outImg = outCtx.createImageData(outW, outH);
  const sd = srcData.data;
  const sw = srcCanvas.width;
  const sh = srcCanvas.height;

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const d = H[6] * x + H[7] * y + H[8];
      const u = (H[0] * x + H[1] * y + H[2]) / d;
      const v = (H[3] * x + H[4] * y + H[5]) / d;
      const o = (y * outW + x) * 4;
      if (u < 0 || v < 0 || u >= sw - 1 || v >= sh - 1) {
        outImg.data[o] = outImg.data[o + 1] = outImg.data[o + 2] = 255;
        outImg.data[o + 3] = 255;
        continue;
      }
      const x0 = Math.floor(u);
      const y0 = Math.floor(v);
      const fx = u - x0;
      const fy = v - y0;
      for (let c = 0; c < 3; c++) {
        const i00 = (y0 * sw + x0) * 4 + c;
        const i10 = (y0 * sw + x0 + 1) * 4 + c;
        const i01 = ((y0 + 1) * sw + x0) * 4 + c;
        const i11 = ((y0 + 1) * sw + x0 + 1) * 4 + c;
        outImg.data[o + c] =
          sd[i00] * (1 - fx) * (1 - fy) +
          sd[i10] * fx * (1 - fy) +
          sd[i01] * (1 - fx) * fy +
          sd[i11] * fx * fy;
      }
      outImg.data[o + 3] = 255;
    }
  }

  applyFilter(outImg, filter);
  outCtx.putImageData(outImg, 0, 0);

  if (rotation === 0) return out;
  const rot = document.createElement("canvas");
  const swap = rotation === 90 || rotation === 270;
  rot.width = swap ? out.height : out.width;
  rot.height = swap ? out.width : out.height;
  const rctx = rot.getContext("2d")!;
  rctx.translate(rot.width / 2, rot.height / 2);
  rctx.rotate((rotation * Math.PI) / 180);
  rctx.drawImage(out, -out.width / 2, -out.height / 2);
  return rot;
}

function applyFilter(img: ImageData, filter: ScanFilter) {
  const d = img.data;
  const n = d.length / 4;

  if (filter === "color") {
    // موازنة تباين خفيفة
    stretchContrast(d, 0.005, 1.05);
    return;
  }

  if (filter === "enhanced") {
    stretchContrast(d, 0.01, 1.25);
    // تبييض الخلفية
    for (let i = 0; i < d.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const v = d[i + c];
        d[i + c] = v > 200 ? 255 : v;
      }
    }
    return;
  }

  // أبيض وأسود بعتبة تكيفية (Integral image)
  const w = img.width;
  const h = img.height;
  const gray = new Float32Array(n);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    gray[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x];
      integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + rowSum;
    }
  }
  const r = Math.max(8, Math.round(Math.min(w, h) / 24));
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);
      const count = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[(y1 + 1) * (w + 1) + x1 + 1] -
        integral[y0 * (w + 1) + x1 + 1] -
        integral[(y1 + 1) * (w + 1) + x0] +
        integral[y0 * (w + 1) + x0];
      const mean = sum / count;
      const p = y * w + x;
      const val = gray[p] < mean * 0.92 ? 0 : 255;
      const o = p * 4;
      d[o] = d[o + 1] = d[o + 2] = val;
    }
  }
}

function stretchContrast(d: Uint8ClampedArray, clip: number, gain: number) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    hist[(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0]++;
  }
  const total = d.length / 4;
  const lowCut = total * clip;
  const highCut = total * clip;
  let lo = 0;
  let hi = 255;
  let acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc > lowCut) {
      lo = i;
      break;
    }
  }
  acc = 0;
  for (let i = 255; i >= 0; i--) {
    acc += hist[i];
    if (acc > highCut) {
      hi = i;
      break;
    }
  }
  if (hi - lo < 16) return;
  const scale = (255 / (hi - lo)) * gain;
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) lut[i] = Math.min(255, Math.max(0, (i - lo) * scale));
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("تعذّر إنشاء الصورة"))),
      "image/jpeg",
      quality,
    );
  });
}

/* ------------------------------------------------------------------ */
/* تصدير PDF                                                           */
/* ------------------------------------------------------------------ */

export interface BuildPdfOptions {
  /** جودة ضغط JPEG (0–1) */
  jpegQuality?: number;
  /** مقاس صفحة ثابت بالنقاط، أو undefined لاستخدام نسبة الصورة */
  pageSizePt?: [number, number];
}

/** يبني ملف PDF من صفحات ممسوحة (صفحة لكل صورة) */
export async function buildScannedPdf(
  canvases: HTMLCanvasElement[],
  options: BuildPdfOptions = {},
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const quality = options.jpegQuality ?? 0.92;
  const doc = await PDFDocument.create();
  for (const canvas of canvases) {
    const blob = await canvasToJpeg(canvas, quality);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const img = await doc.embedJpg(bytes);

    if (options.pageSizePt) {
      // مقاس صفحة ثابت: نضع الصورة في المنتصف مع الحفاظ على نسبتها
      let [pw, ph] = options.pageSizePt;
      if (img.width > img.height) [pw, ph] = [ph, pw]; // عرضي
      const ratio = Math.min(pw / img.width, ph / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const page = doc.addPage([pw, ph]);
      page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    } else {
      const maxW = 595.28;
      const maxH = 841.89;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const page = doc.addPage([w, h]);
      page.drawImage(img, { x: 0, y: 0, width: w, height: h });
    }
  }
  return doc.save();
}
