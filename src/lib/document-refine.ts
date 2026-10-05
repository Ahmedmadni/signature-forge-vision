import { detectDocumentPrecise, type PreciseDocumentDetection } from "@/lib/precise-document-detect";
import type { Pt, Quad } from "@/lib/scan";

interface Line2D {
  p: Pt;
  d: Pt;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function polygonArea(q: Quad) {
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

function lineIntersection(a: Line2D, b: Line2D): Pt | null {
  const cross = a.d.x * b.d.y - a.d.y * b.d.x;
  if (Math.abs(cross) < 1e-6) return null;
  const dx = b.p.x - a.p.x;
  const dy = b.p.y - a.p.y;
  const t = (dx * b.d.y - dy * b.d.x) / cross;
  return { x: a.p.x + a.d.x * t, y: a.p.y + a.d.y * t };
}

function buildGradient(source: CanvasImageSource, sourceWidth: number, sourceHeight: number) {
  const maxSize = 640;
  const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
  const w = Math.max(120, Math.round(sourceWidth * scale));
  const h = Math.max(120, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  const rgba = ctx.getImageData(0, 0, w, h).data;

  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    gray[p] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  }

  const mag = new Float32Array(w * h);
  const gxArr = new Float32Array(w * h);
  const gyArr = new Float32Array(w * h);
  let maxMag = 1;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
        gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
      const gy =
        -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
        gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
      const m = Math.hypot(gx, gy);
      gxArr[i] = gx;
      gyArr[i] = gy;
      mag[i] = m;
      maxMag = Math.max(maxMag, m);
    }
  }

  return { w, h, scale, gray, mag, gxArr, gyArr, maxMag };
}

function snapEdge(
  a: Pt,
  b: Pt,
  gradient: NonNullable<ReturnType<typeof buildGradient>>,
): Line2D {
  const { w, h, gray, mag, gxArr, gyArr, maxMag } = gradient;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const tx = dx / length;
  const ty = dy / length;
  const nx = -ty;
  const ny = tx;

  const searchRadius = Math.max(5, Math.min(18, Math.round(Math.min(w, h) * 0.032)));
  const samples = 46;
  let bestOffset = 0;
  let bestScore = -Infinity;

  for (let offset = -searchRadius; offset <= searchRadius; offset++) {
    let strength = 0;
    let contrastStrength = 0;
    let continuity = 0;
    let used = 0;

    for (let i = 0; i < samples; i++) {
      // نتجاهل الزوايا نفسها لأنها غالبًا تحتوي على تشويش أو ظل.
      const t = 0.08 + ((i + 0.5) / samples) * 0.84;
      const x = a.x + dx * t + nx * offset;
      const y = a.y + dy * t + ny * offset;
      const ix = Math.round(x);
      const iy = Math.round(y);
      if (ix < 2 || iy < 2 || ix >= w - 2 || iy >= h - 2) continue;

      let localBest = 0;
      for (let side = -1; side <= 1; side++) {
        const sx = Math.round(ix + nx * side);
        const sy = Math.round(iy + ny * side);
        if (sx < 1 || sy < 1 || sx >= w - 1 || sy >= h - 1) continue;
        const index = sy * w + sx;
        const m = mag[index];
        if (!m) continue;
        // نعطي أعلى وزن للحافة التي يكون تدرجها عموديًا على ضلع الورقة.
        const directional = Math.abs((gxArr[index] * nx + gyArr[index] * ny) / m);
        const value = (m / maxMag) * (0.28 + directional * 0.72);
        localBest = Math.max(localBest, value);
      }

      const contrastDistance = 3;
      const ax = Math.round(ix + nx * contrastDistance);
      const ay = Math.round(iy + ny * contrastDistance);
      const bx = Math.round(ix - nx * contrastDistance);
      const by = Math.round(iy - ny * contrastDistance);
      let contrast = 0;
      if (
        ax >= 0 && ay >= 0 && ax < w && ay < h &&
        bx >= 0 && by >= 0 && bx < w && by < h
      ) {
        contrast = Math.abs(gray[ay * w + ax] - gray[by * w + bx]) / 255;
      }

      strength += localBest;
      contrastStrength += contrast;
      if (localBest > 0.13 || contrast > 0.11) continuity += 1;
      used += 1;
    }

    if (!used) continue;
    const avg = strength / used;
    const avgContrast = contrastStrength / used;
    const continuous = continuity / used;
    const offsetPenalty = (Math.abs(offset) / Math.max(1, searchRadius)) * 0.055;
    const score = avg * 0.56 + continuous * 0.28 + avgContrast * 0.16 - offsetPenalty;

    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }

  return {
    p: { x: a.x + nx * bestOffset, y: a.y + ny * bestOffset },
    d: { x: tx, y: ty },
  };
}

function validateQuad(q: Quad, w: number, h: number, original: Quad) {
  const pad = Math.max(w, h) * 0.035;
  if (q.some((p) => p.x < -pad || p.x > w + pad || p.y < -pad || p.y > h + pad)) return false;

  const originalArea = polygonArea(original);
  const area = polygonArea(q);
  if (!originalArea || area < originalArea * 0.72 || area > originalArea * 1.28) return false;

  const sides = [dist(q[0], q[1]), dist(q[1], q[2]), dist(q[2], q[3]), dist(q[3], q[0])];
  if (Math.min(...sides) < Math.min(w, h) * 0.08) return false;

  return true;
}

/**
 * كشف المستند ثم تثبيت كل ضلع على أقوى حافة فعلية قريبة منه.
 * النتيجة تحافظ على كشف Hough العام لكنها تحسن القص الدقيق عند الزوايا والظلال.
 */
export function detectDocumentRefined(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): PreciseDocumentDetection | null {
  const detected = detectDocumentPrecise(source, sourceWidth, sourceHeight);
  if (!detected) return null;

  const gradient = buildGradient(source, sourceWidth, sourceHeight);
  if (!gradient) return detected;

  const { scale, w, h } = gradient;
  const q = detected.quad.map((p) => ({ x: p.x * scale, y: p.y * scale })) as Quad;

  const top = snapEdge(q[0], q[1], gradient);
  const right = snapEdge(q[1], q[2], gradient);
  const bottom = snapEdge(q[3], q[2], gradient);
  const left = snapEdge(q[0], q[3], gradient);

  const tl = lineIntersection(top, left);
  const tr = lineIntersection(top, right);
  const br = lineIntersection(bottom, right);
  const bl = lineIntersection(bottom, left);
  if (!tl || !tr || !br || !bl) return detected;

  const refinedSmall = [tl, tr, br, bl] as Quad;
  if (!validateQuad(refinedSmall, w, h, q)) return detected;

  const refined = refinedSmall.map((p) => ({
    x: clamp(p.x / scale, 0, sourceWidth),
    y: clamp(p.y / scale, 0, sourceHeight),
  })) as Quad;

  return {
    ...detected,
    quad: refined,
    confidence: Math.min(1, detected.confidence + 0.04),
  };
}
