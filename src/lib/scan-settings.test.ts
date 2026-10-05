import { describe, expect, it } from "vitest";
import {
  PAGE_SIZE_PT,
  QUALITY_JPEG,
  QUALITY_MAX_PX,
  QUALITY_OPTIONS,
  PAGE_SIZE_OPTIONS,
} from "./scan-settings";

describe("scan settings constants", () => {
  it("keeps quality levels ordered from smallest to largest output", () => {
    expect(QUALITY_MAX_PX.standard).toBeLessThan(QUALITY_MAX_PX.high);
    expect(QUALITY_MAX_PX.high).toBeLessThan(QUALITY_MAX_PX.max);
    expect(QUALITY_JPEG.standard).toBeLessThan(QUALITY_JPEG.high);
    expect(QUALITY_JPEG.high).toBeLessThanOrEqual(QUALITY_JPEG.max);
  });

  it("keeps the documented quality limits", () => {
    expect(QUALITY_MAX_PX).toEqual({
      standard: 1600,
      high: 2400,
      max: 3300,
    });
  });

  it("keeps standard PDF page sizes in points", () => {
    expect(PAGE_SIZE_PT.a4[0]).toBeCloseTo(595.28, 2);
    expect(PAGE_SIZE_PT.a4[1]).toBeCloseTo(841.89, 2);
    expect(PAGE_SIZE_PT.letter).toEqual([612, 792]);
    expect(PAGE_SIZE_PT.legal).toEqual([612, 1008]);
  });

  it("exposes every supported quality and page-size option", () => {
    expect(QUALITY_OPTIONS.map((option) => option.key)).toEqual(["standard", "high", "max"]);
    expect(PAGE_SIZE_OPTIONS.map((option) => option.key)).toEqual(["auto", "a4", "letter", "legal"]);
  });
});
