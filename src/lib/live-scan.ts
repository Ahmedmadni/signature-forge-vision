import { detectDocumentRefined } from "@/lib/document-refine";
import type { Pt, Quad } from "@/lib/scan";

export interface LiveDetectionResult {
  quad: Quad | null;
  confidence: number;
  edgeScore: number;
  detected: boolean;
  stableEnough: boolean;
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function quadDistance(a: Quad, b: Quad, w: number, h: number) {
  const diag = Math.hypot(w, h) || 1;
  return a.reduce((sum, p, i) => sum + dist(p, b[i]), 0) / 4 / diag;
}

export function blendQuads(previous: Quad, next: Quad, nextWeight = 0.42): Quad {
  const oldWeight = 1 - nextWeight;
  return previous.map((point, index) => ({
    x: point.x * oldWeight + next[index].x * nextWeight,
    y: point.y * oldWeight + next[index].y * nextWeight,
  })) as Quad;
}

export function analyzeDocumentFrame(
  source: CanvasImageSource,
  width: number,
  height: number,
): LiveDetectionResult {
  const detection = detectDocumentRefined(source, width, height);
  if (!detection) {
    return {
      quad: null,
      confidence: 0,
      edgeScore: 0,
      detected: false,
      stableEnough: false,
    };
  }

  // لا نظهر رباعي ضعيف لمجرد وجود بعض الخطوط في الخلفية.
  const detected = detection.confidence >= 0.54 && detection.edgeScore >= 0.42;
  return {
    quad: detection.quad,
    confidence: detection.confidence,
    edgeScore: detection.edgeScore,
    detected,
    stableEnough: detected && detection.confidence >= 0.7 && detection.edgeScore >= 0.52,
  };
}
