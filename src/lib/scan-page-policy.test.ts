import { describe, expect, it } from "vitest";
import { fullImageQuad } from "./scan";
import { shouldPreserveNativeProcessedPage } from "./scan-page-policy";

describe("native processed scan policy", () => {
  it("preserves untouched ML Kit output without a second crop/filter pass", () => {
    expect(
      shouldPreserveNativeProcessedPage(
        true,
        "color",
        fullImageQuad(1200, 1600),
        1200,
        1600,
      ),
    ).toBe(true);
  });

  it("reprocesses the page after the user changes its crop", () => {
    const changed = fullImageQuad(1200, 1600);
    changed[0] = { x: 40, y: 30 };

    expect(
      shouldPreserveNativeProcessedPage(true, "color", changed, 1200, 1600),
    ).toBe(false);
  });

  it("reprocesses the page after the user selects an enhancement filter", () => {
    const quad = fullImageQuad(1200, 1600);

    expect(
      shouldPreserveNativeProcessedPage(true, "enhanced", quad, 1200, 1600),
    ).toBe(false);
    expect(
      shouldPreserveNativeProcessedPage(true, "bw", quad, 1200, 1600),
    ).toBe(false);
  });

  it("never bypasses web scanner processing", () => {
    expect(
      shouldPreserveNativeProcessedPage(
        false,
        "color",
        fullImageQuad(1200, 1600),
        1200,
        1600,
      ),
    ).toBe(false);
  });
});
