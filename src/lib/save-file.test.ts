import { beforeEach, describe, expect, it, vi } from "vitest";

const controls = vi.hoisted(() => ({
  native: false,
  packaged: false,
  plugin: false,
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => controls.native,
    isPluginAvailable: () => controls.plugin,
  },
}));
vi.mock("@/lib/native-document-scanner", () => ({
  isPackagedAndroidApp: () => controls.packaged,
}));

import { safeExportFileName, saveFile, uniqueAndroidExportName } from "./save-file";

describe("PDF export device safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controls.native = false;
    controls.packaged = false;
    controls.plugin = false;
  });

  it("sanitizes external PDF filenames without losing Arabic letters", () => {
    expect(safeExportFileName("تقرير:2026/سري?.pdf")).toBe("تقرير_2026_سري_.pdf");
    expect(safeExportFileName("../ملف.pdf")).toBe("__ملف.pdf");
    expect(safeExportFileName(" ")).toBe("مستند-وقع.pdf");
  });

  it("creates distinct native filenames for multiple scans on the same day", () => {
    const name = "مسح-2026-10-04.pdf";
    const now = Date.UTC(2026, 9, 4, 16, 15, 30);
    const first = uniqueAndroidExportName(name, now, "ab12cd34");
    const second = uniqueAndroidExportName(name, now, "ef56gh78");
    expect(first).toBe("مسح-2026-10-04-20261004161530-ab12cd34.pdf");
    expect(second).not.toBe(first);
    expect(second).toMatch(/\.pdf$/);
  });

  it("rejects empty exports before showing a download", async () => {
    await expect(saveFile(new Blob([]), "empty.pdf")).rejects.toThrow("فارغ");
  });

  it("does not lie about a successful Android download when the Capacitor bridge is missing", async () => {
    controls.packaged = true;
    await expect(saveFile(new Blob(["PDF"]), "signed.pdf")).rejects.toThrow("تعذّر الاتصال بذاكرة Android");
  });
});
