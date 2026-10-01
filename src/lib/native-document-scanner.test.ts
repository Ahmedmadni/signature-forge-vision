import { beforeEach, describe, expect, it, vi } from "vitest";

const platform = vi.hoisted(() => ({
  native: true,
  name: "android",
  pluginAvailable: true,
}));
const native = vi.hoisted(() => ({
  scanDocument: vi.fn(),
  moduleAvailable: vi.fn(),
  install: vi.fn(),
  addListener: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => platform.native,
    getPlatform: () => platform.name,
    isPluginAvailable: () => platform.pluginAvailable,
  },
}));

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: {
    readFile: native.readFile,
  },
}));

vi.mock("@capacitor-mlkit/document-scanner", () => ({
  DocumentScanner: {
    scanDocument: native.scanDocument,
    isGoogleDocumentScannerModuleAvailable: native.moduleAvailable,
    installGoogleDocumentScannerModule: native.install,
    addListener: native.addListener,
  },
  GoogleDocumentScannerModuleInstallState: {
    COMPLETED: 4,
    FAILED: 5,
    CANCELED: 3,
  },
}));

import {
  canUseNativeScanner,
  isAndroidNativeApp,
  NativeScannerUnavailableError,
  scanNativeDocuments,
} from "./native-document-scanner";

describe("Android ML Kit scanner bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platform.native = true;
    platform.name = "android";
    platform.pluginAvailable = true;
    native.moduleAvailable.mockResolvedValue({ available: true });
    native.scanDocument.mockResolvedValue({ scannedImages: [] });
  });

  it("only enables the plugin inside an Android native shell", () => {
    expect(isAndroidNativeApp()).toBe(true);
    expect(canUseNativeScanner()).toBe(true);
    platform.native = false;
    expect(canUseNativeScanner()).toBe(false);
    platform.native = true;
    platform.name = "web";
    expect(canUseNativeScanner()).toBe(false);
  });

  it("reads native pages in the original order as jpeg blobs", async () => {
    native.scanDocument.mockResolvedValue({
      scannedImages: ["content://scan/page-1", "content://scan/page-2"],
    });
    native.readFile
      .mockResolvedValueOnce({ data: "AQID" })
      .mockResolvedValueOnce({ data: "BAUG" });

    const pages = await scanNativeDocuments();
    expect(pages).not.toBeNull();
    expect(pages).toHaveLength(2);
    expect(native.scanDocument).toHaveBeenCalledWith({
      galleryImportAllowed: true,
      pageLimit: 20,
      resultFormats: "JPEG",
      scannerMode: "FULL",
    });
    expect(native.readFile).toHaveBeenNthCalledWith(1, { path: "content://scan/page-1" });
    expect(native.readFile).toHaveBeenNthCalledWith(2, { path: "content://scan/page-2" });
    expect(Array.from(new Uint8Array(await pages![0].arrayBuffer()))).toEqual([1, 2, 3]);
    expect(Array.from(new Uint8Array(await pages![1].arrayBuffer()))).toEqual([4, 5, 6]);
  });

  it("does not treat scanner cancellation as a scan failure", async () => {
    native.scanDocument.mockRejectedValue(new Error("Scan cancelled or failed. Result code: 0"));
    expect(await scanNativeDocuments()).toBeNull();
  });

  it("requires a newly built APK when native plugin is absent", async () => {
    platform.pluginAvailable = false;
    await expect(scanNativeDocuments()).rejects.toBeInstanceOf(NativeScannerUnavailableError);
  });
});
