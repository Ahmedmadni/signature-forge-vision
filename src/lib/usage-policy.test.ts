import { describe, expect, it } from "vitest";
import {
  MAX_USAGE_PAGES_PER_CALL,
  validateUsagePageCount,
} from "./usage-policy";

describe("validateUsagePageCount", () => {
  it("accepts a positive safe integer", () => {
    expect(validateUsagePageCount(3)).toBe(3);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid page count %s",
    (value) => {
      expect(() => validateUsagePageCount(value)).toThrow("عدد الصفحات غير صالح");
    },
  );

  it("rejects values above the RPC abuse boundary", () => {
    expect(() => validateUsagePageCount(MAX_USAGE_PAGES_PER_CALL + 1)).toThrow(
      "عدد الصفحات غير صالح",
    );
  });
});
