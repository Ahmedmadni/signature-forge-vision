import { describe, expect, it } from "vitest";
import { defaultQuad, fullImageQuad } from "./scan";

describe("scanner quad defaults", () => {
  it("uses the full image for already processed native scans", () => {
    expect(fullImageQuad(1200, 1600)).toEqual([
      { x: 0, y: 0 },
      { x: 1199, y: 0 },
      { x: 1199, y: 1599 },
      { x: 0, y: 1599 },
    ]);
  });

  it("keeps native full-image coordinates valid for tiny images", () => {
    expect(fullImageQuad(1, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]);
  });

  it("keeps the web fallback crop inset at six percent", () => {
    expect(defaultQuad(1000, 2000)).toEqual([
      { x: 60, y: 120 },
      { x: 940, y: 120 },
      { x: 940, y: 1880 },
      { x: 60, y: 1880 },
    ]);
  });
});
