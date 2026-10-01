import { describe, expect, it } from "vitest";
import { moveItem, nextQuarterTurn } from "./scan-page-order";

describe("scanner page ordering helpers", () => {
  it("moves a page one position in either direction", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });

  it("does not move a page beyond the list boundary", () => {
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });

  it("rotates pages in 90-degree steps and wraps at 360", () => {
    expect(nextQuarterTurn(0)).toBe(90);
    expect(nextQuarterTurn(90)).toBe(180);
    expect(nextQuarterTurn(180)).toBe(270);
    expect(nextQuarterTurn(270)).toBe(0);
  });
});
