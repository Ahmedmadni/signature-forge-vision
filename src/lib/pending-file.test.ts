import { beforeEach, describe, expect, it } from "vitest";
import { setPendingFile, takePendingFile } from "./pending-file";

describe("pending file handoff", () => {
  beforeEach(() => {
    takePendingFile();
  });

  it("hands the scanned PDF to the next screen exactly once", () => {
    const file = { name: "scan.pdf", type: "application/pdf" } as File;

    setPendingFile(file);

    expect(takePendingFile()).toBe(file);
    expect(takePendingFile()).toBeNull();
  });

  it("replaces an older pending file with the latest one", () => {
    const oldFile = { name: "old.pdf" } as File;
    const newFile = { name: "new.pdf" } as File;

    setPendingFile(oldFile);
    setPendingFile(newFile);

    expect(takePendingFile()).toBe(newFile);
  });
});
