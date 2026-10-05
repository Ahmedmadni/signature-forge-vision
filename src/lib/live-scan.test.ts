import { describe, expect, it } from "vitest";
import { blendQuads, quadDistance } from "./live-scan";
import type { Quad } from "./scan";

const base: Quad = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 200 },
  { x: 0, y: 200 },
];

describe("live scan quad helpers", () => {
  it("returns zero distance for identical quads", () => {
    expect(quadDistance(base, base, 100, 200)).toBe(0);
  });

  it("normalizes quad distance by frame diagonal", () => {
    const shifted = base.map((p) => ({ x: p.x + 10, y: p.y })) as Quad;
    const expected = 10 / Math.hypot(100, 200);
    expect(quadDistance(base, shifted, 100, 200)).toBeCloseTo(expected, 8);
  });

  it("blends previous and next quads using the requested weight", () => {
    const next = base.map((p) => ({ x: p.x + 20, y: p.y + 10 })) as Quad;
    const blended = blendQuads(base, next, 0.25);

    expect(blended[0]).toEqual({ x: 5, y: 2.5 });
    expect(blended[2]).toEqual({ x: 105, y: 202.5 });
  });
});
