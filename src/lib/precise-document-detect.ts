import type { Pt, Quad } from "@/lib/scan";

export interface PreciseDocumentDetection {
  quad: Quad;
  confidence: number;
  edgeScore: number;
  geometryScore: number;
  areaRatio: number;
}

interface Line {
  theta: number;
  rho: number;
  votes: number;
}

interface Candidate {
  quad: Quad;
  preScore: number;
  areaRatio: number;
  geometryScore: number;
  voteScore: number;
}

const MAX_ANALYSIS_SIZE = 560;

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

function angle(a: Pt, b: Pt, c: Pt) {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const den = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (!den) return 0;
  const cosine = Math.max(-1, Math.min(1, (abx * cbx + aby * cby) / den));
  return (Math.acos(cosine) * 180) / Math.PI;
}

function angleDiffPi(a: number, b: number) {
  let d = Math.abs(a - b) % Math.PI;
  if (d > Math.PI / 2) d = Math.PI - d;
  return Math.abs(d);
}

function normalizeQuad(points: Pt[]): Quad | null {
  if (points.length !== 4 || points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;

  const cx = points.reduce((sum, p) => sum + p.x, 0) / 4;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / 4;
  const circular = [...points].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
  );

  let start = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 4; i++) {
    const score = circular[i].x + circular[i].y;
    if (score < best) {
      best = score;
      start = i;
    }
  }

  const r = [0, 1, 2, 3].map((offset) => circular[(start + offset) % 4]);
  const ordered = r[1].x >= r[3].x ? r : [r[0], r[3], r[2], r[1]];
  const quad = ordered as Quad;

  const crosses: number[] = [];
  for (let i = 0; i < 4; i++) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    const c = quad[(i + 2) % 4];
    crosses.push((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x));
  }
  const positive = crosses.every((v) => v > 0);
  const negative = crosses.every((v) => v < 0);
  return positive || negative ? quad : null;
}

function intersection(a: Line, b: Line): Pt | null {
  const a1 = Math.cos(a.theta);
  const b1 = Math.sin(a.theta);
  const a2 = Math.cos(b.theta);
  const b2 = Math.sin(b.theta);
  const determinant = a1 * b2 - a2 * b1;
  if (Math.abs(determinant) < 1e-5) return null;
  return {
    x: (a.rho * b2 - b.rho * b1) / determinant,
    y: (a1 * b.rho - a2 * a.rho) / determinant,
  };
}

function geometryScore(q: Quad, w: number, h: number) {
  const top = dist(q[0], q[1]);
  const right = dist(q[1], q[2]);
  const bottom = dist(q[2], q[3]);
  const left = dist(q[3], q[0]);
  if (Math.min(top, right, bottom, left) < Math.min(w, h) * 0.08) return 0;

  const angles = [
    angle(q[3], q[0], q[1]),
    angle(q[0], q[1], q[2]),
    angle(q[1], q[2], q[3]),
    angle(q[2], q[3], q[0]),
  ];
  if (angles.some((a) => a < 43 || a > 137)) return 0;

  const angleScore = angles.reduce((sum, a) => sum + Math.max(0, 1 - Math.abs(90 - a) / 48), 0) / 4;
  const widthBalance = Math.min(top, bottom) / Math.max(top, bottom, 1);
  const heightBalance = Math.min(left, right) / Math.max(left, right, 1);

  const avgW = (top + bottom) / 2;
  const avgH = (left + right) / 2;
  const aspect = avgW / Math.max(avgH, 1);
  const aspectScore = aspect >= 0.38 && aspect <= 2.65 ? 1 : aspect >= 0.28 && aspect <= 3.5 ? 0.55 : 0;

  const cx = q.reduce((sum, p) => sum + p.x, 0) / 4;
  const cy = q.reduce((sum, p) => sum + p.y, 0) / 4;
  const centerDistance = Math.hypot(cx - w / 2, cy - h / 2) / Math.max(1, Math.hypot(w, h) / 2);
  const centerScore = Math.max(0, 1 - centerDistance / 0.85);

  return (
    angleScore * 0.4 +
    ((widthBalance + heightBalance) / 2) * 0.25 +
    aspectScore * 0.15 +
    centerScore * 0.2
  );
}

function areaPreference(areaRatio: number) {
  if (areaRatio < 0.12 || areaRatio > 0.96) return 0;
  if (areaRatio >= 0.28 && areaRatio <= 0.86) return 1;
  if (areaRatio < 0.28) return Math.max(0, (areaRatio - 0.12) / 0.16);
  return Math.max(0, (0.96 - areaRatio) / 0.1);
}

function edgeSupport(
  mag: Float32Array,
  w: number,
  h: number,
  a: Pt,
  b: Pt,
  maxMag: number,
) {
  const samples = 52;
  let total = 0;
  for (let i = 0; i < samples; i++) {
    const t = (i + 0.5) / samples;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const ix = Math.round(x);
    const iy = Math.round(y);
    let local = 0;
    for (let dy = -2; dy <= 2; dy++) {
      const yy = iy + dy;
      if (yy < 1 || yy >= h - 1) continue;
      for (let dx = -2; dx <= 2; dx++) {
        const xx = ix + dx;
        if (xx < 1 || xx >= w - 1) continue;
        local = Math.max(local, mag[yy * w + xx]);
      }
    }
    total += local / Math.max(1, maxMag);
  }
  return total / samples;
}

function percentile(values: Float32Array, maxValue: number, fraction: number) {
  if (maxValue <= 0) return 0;
  const bins = new Uint32Array(128);
  let count = 0;
  for (const value of values) {
    if (value <= 0) continue;
    const bin = Math.min(bins.length - 1, Math.floor((value / maxValue) * (bins.length - 1)));
    bins[bin] += 1;
    count += 1;
  }
  if (!count) return 0;
  const target = count * fraction;
  let acc = 0;
  for (let i = 0; i < bins.length; i++) {
    acc += bins[i];
    if (acc >= target) return (i / (bins.length - 1)) * maxValue;
  }
  return maxValue;
}

export function detectDocumentPrecise(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): PreciseDocumentDetection | null {
  if (sourceWidth <= 0 || sourceHeight <= 0) return null;

  try {
    const scale = Math.min(1, MAX_ANALYSIS_SIZE / Math.max(sourceWidth, sourceHeight));
    const w = Math.max(120, Math.round(sourceWidth * scale));
    const h = Math.max(120, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    const gray = new Float32Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    const blur = new Float32Array(w * h);
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        let sum = 0;
        let weight = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const k = dx === 0 && dy === 0 ? 4 : Math.abs(dx) + Math.abs(dy) <= 1 ? 2 : 1;
            sum += gray[(y + dy) * w + x + dx] * k;
            weight += k;
          }
        }
        blur[y * w + x] = sum / weight;
      }
    }

    const mag = new Float32Array(w * h);
    const direction = new Float32Array(w * h);
    let maxMag = 0;
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const i = y * w + x;
        const gx =
          -blur[i - w - 1] - 2 * blur[i - 1] - blur[i + w - 1] +
          blur[i - w + 1] + 2 * blur[i + 1] + blur[i + w + 1];
        const gy =
          -blur[i - w - 1] - 2 * blur[i - w] - blur[i - w + 1] +
          blur[i + w - 1] + 2 * blur[i + w] + blur[i + w + 1];
        const m = Math.hypot(gx, gy);
        mag[i] = m;
        direction[i] = Math.atan2(gy, gx);
        maxMag = Math.max(maxMag, m);
      }
    }
    if (maxMag < 8) return null;

    const adaptive = percentile(mag, maxMag, 0.84);
    const threshold = Math.max(maxMag * 0.12, adaptive * 0.82);

    const thetaBins = 180;
    const dTheta = Math.PI / thetaBins;
    const diagonal = Math.ceil(Math.hypot(w, h));
    const rhoBins = diagonal * 2 + 1;
    const accumulator = new Float32Array(thetaBins * rhoBins);

    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const i = y * w + x;
        const m = mag[i];
        if (m < threshold) continue;
        let theta = direction[i];
        if (theta < 0) theta += Math.PI;
        const base = Math.round(theta / dTheta);
        for (let offset = -2; offset <= 2; offset++) {
          const tb = ((base + offset) % thetaBins + thetaBins) % thetaBins;
          const th = tb * dTheta;
          const rho = Math.round(x * Math.cos(th) + y * Math.sin(th)) + diagonal;
          if (rho < 0 || rho >= rhoBins) continue;
          accumulator[tb * rhoBins + rho] += m;
        }
      }
    }

    const lines: Line[] = [];
    const blocked = new Uint8Array(accumulator.length);
    const rhoRadius = Math.max(4, Math.round(diagonal * 0.025));
    for (let n = 0; n < 70; n++) {
      let bestIndex = -1;
      let bestVotes = 0;
      for (let i = 0; i < accumulator.length; i++) {
        if (!blocked[i] && accumulator[i] > bestVotes) {
          bestVotes = accumulator[i];
          bestIndex = i;
        }
      }
      if (bestIndex < 0 || bestVotes <= 0) break;
      const tb = Math.floor(bestIndex / rhoBins);
      const rb = bestIndex % rhoBins;
      lines.push({ theta: tb * dTheta, rho: rb - diagonal, votes: bestVotes });

      for (let dt = -5; dt <= 5; dt++) {
        const t2 = ((tb + dt) % thetaBins + thetaBins) % thetaBins;
        for (let dr = -rhoRadius; dr <= rhoRadius; dr++) {
          const r2 = rb + dr;
          if (r2 >= 0 && r2 < rhoBins) blocked[t2 * rhoBins + r2] = 1;
        }
      }
    }
    if (lines.length < 4) return null;

    const maxVotes = Math.max(...lines.map((line) => line.votes), 1);
    const cx = w / 2;
    const cy = h / 2;
    const signedCenterDistance = (line: Line) => line.rho - cx * Math.cos(line.theta) - cy * Math.sin(line.theta);

    const candidates: Candidate[] = [];
    const seeds = lines.slice(0, Math.min(8, lines.length));
    const familyTolerance = (27 * Math.PI) / 180;
    const orthTolerance = (28 * Math.PI) / 180;

    for (const seed of seeds) {
      const familyA = lines
        .filter((line) => angleDiffPi(line.theta, seed.theta) <= familyTolerance)
        .slice(0, 12);
      const familyB = lines
        .filter((line) => Math.abs(angleDiffPi(line.theta, seed.theta) - Math.PI / 2) <= orthTolerance)
        .slice(0, 12);
      if (familyA.length < 2 || familyB.length < 2) continue;

      for (let ai = 0; ai < familyA.length - 1; ai++) {
        for (let aj = ai + 1; aj < familyA.length; aj++) {
          const a1 = familyA[ai];
          const a2 = familyA[aj];
          if (Math.abs(signedCenterDistance(a1) - signedCenterDistance(a2)) < Math.min(w, h) * 0.18) continue;

          for (let bi = 0; bi < familyB.length - 1; bi++) {
            for (let bj = bi + 1; bj < familyB.length; bj++) {
              const b1 = familyB[bi];
              const b2 = familyB[bj];
              if (Math.abs(signedCenterDistance(b1) - signedCenterDistance(b2)) < Math.min(w, h) * 0.18) continue;

              const points = [
                intersection(a1, b1),
                intersection(a1, b2),
                intersection(a2, b2),
                intersection(a2, b1),
              ];
              if (points.some((p) => !p)) continue;
              const quad = normalizeQuad(points as Pt[]);
              if (!quad) continue;

              const padX = w * 0.025;
              const padY = h * 0.025;
              if (quad.some((p) => p.x < -padX || p.x > w + padX || p.y < -padY || p.y > h + padY)) continue;

              const areaRatio = polygonArea(quad) / Math.max(1, w * h);
              const areaScore = areaPreference(areaRatio);
              if (!areaScore) continue;

              const geom = geometryScore(quad, w, h);
              if (geom < 0.42) continue;

              const voteScore =
                (a1.votes + a2.votes + b1.votes + b2.votes) / Math.max(1, maxVotes * 4);
              const preScore = geom * 0.5 + areaScore * 0.3 + Math.min(1, voteScore) * 0.2;
              candidates.push({ quad, preScore, areaRatio, geometryScore: geom, voteScore });
            }
          }
        }
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => b.preScore - a.preScore);

    let best: PreciseDocumentDetection | null = null;
    for (const candidate of candidates.slice(0, 42)) {
      const supports = [
        edgeSupport(mag, w, h, candidate.quad[0], candidate.quad[1], maxMag),
        edgeSupport(mag, w, h, candidate.quad[1], candidate.quad[2], maxMag),
        edgeSupport(mag, w, h, candidate.quad[2], candidate.quad[3], maxMag),
        edgeSupport(mag, w, h, candidate.quad[3], candidate.quad[0], maxMag),
      ];
      const avgEdge = supports.reduce((sum, value) => sum + value, 0) / 4;
      const minEdge = Math.min(...supports);
      const edgeRaw = avgEdge * 0.68 + minEdge * 0.32;
      const edgeScore = Math.min(1, edgeRaw / 0.34);
      const confidence = Math.max(0, Math.min(1, edgeScore * 0.58 + candidate.preScore * 0.42));

      if (!best || confidence > best.confidence) {
        const scaled = candidate.quad.map((p) => ({
          x: Math.min(sourceWidth, Math.max(0, (p.x / w) * sourceWidth)),
          y: Math.min(sourceHeight, Math.max(0, (p.y / h) * sourceHeight)),
        })) as Quad;
        best = {
          quad: scaled,
          confidence,
          edgeScore,
          geometryScore: candidate.geometryScore,
          areaRatio: candidate.areaRatio,
        };
      }
    }

    if (!best || best.confidence < 0.43 || best.edgeScore < 0.34) return null;
    return best;
  } catch {
    return null;
  }
}
