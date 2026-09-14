import { defaultQuad, detectDocument, type Pt, type Quad } from "@/lib/scan";

export interface LiveDetectionResult {
  quad: Quad;
  confidence: number;
  detected: boolean;
  stableEnough: boolean;
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

function nearlyDefault(q: Quad, w: number, h: number) {
  const d = defaultQuad(w, h);
  const tolerance = Math.max(w, h) * 0.008;
  return q.every((p, i) => dist(p, d[i]) <= tolerance);
}

function angle(a: Pt, b: Pt, c: Pt) {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const den = Math.hypot(abx, aby) * Math.hypot(cbx, cby) || 1;
  return (Math.acos(Math.max(-1, Math.min(1, dot / den))) * 180) / Math.PI;
}

export function quadDistance(a: Quad, b: Quad, w: number, h: number) {
  const diag = Math.hypot(w, h) || 1;
  return a.reduce((sum, p, i) => sum + dist(p, b[i]), 0) / 4 / diag;
}

export function analyzeDocumentFrame(source: CanvasImageSource, width: number, height: number): LiveDetectionResult {
  const quad = detectDocument(source, width, height);
  if (width <= 0 || height <= 0 || nearlyDefault(quad, width, height)) {
    return { quad, confidence: 0, detected: false, stableEnough: false };
  }

  const imageArea = width * height;
  const areaRatio = polygonArea(quad) / Math.max(1, imageArea);
  const top = dist(quad[0], quad[1]);
  const right = dist(quad[1], quad[2]);
  const bottom = dist(quad[2], quad[3]);
  const left = dist(quad[3], quad[0]);

  const widthBalance = Math.min(top, bottom) / Math.max(top, bottom, 1);
  const heightBalance = Math.min(left, right) / Math.max(left, right, 1);

  const angles = [
    angle(quad[3], quad[0], quad[1]),
    angle(quad[0], quad[1], quad[2]),
    angle(quad[1], quad[2], quad[3]),
    angle(quad[2], quad[3], quad[0]),
  ];
  const angleScore = angles.reduce((sum, a) => sum + Math.max(0, 1 - Math.abs(90 - a) / 38), 0) / 4;

  const marginX = width * 0.015;
  const marginY = height * 0.015;
  const inside = quad.every((p) => p.x >= marginX && p.x <= width - marginX && p.y >= marginY && p.y <= height - marginY);

  const areaScore = areaRatio < 0.16 ? 0 : areaRatio > 0.92 ? 0.45 : Math.min(1, (areaRatio - 0.16) / 0.5);
  const shapeScore = (widthBalance + heightBalance + angleScore) / 3;
  const confidence = Math.max(0, Math.min(1, areaScore * 0.5 + shapeScore * 0.5)) * (inside ? 1 : 0.7);

  return {
    quad,
    confidence,
    detected: confidence >= 0.5,
    stableEnough: confidence >= 0.72,
  };
}
