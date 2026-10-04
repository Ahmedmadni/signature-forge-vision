import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareSignatureUpload, validateSignatureUpload } from "./signature-upload";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("safe mobile signature images", () => {
  it("rejects non-images, empty images and oversized photos before decoding", () => {
    expect(() => validateSignatureUpload({ type: "image/gif", size: 100 } as File)).toThrow("PNG أو JPG");
    expect(() => validateSignatureUpload({ type: "image/png", size: 0 } as File)).toThrow("فارغة");
    expect(() => validateSignatureUpload({ type: "image/jpeg", size: 13 * 1024 * 1024 } as File)).toThrow("12 ميجابايت");
    expect(() => validateSignatureUpload({ type: "image/png", size: 100 } as File)).not.toThrow();
  });

  it("downscales a phone photo and revokes its temporary object URL", async () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:waqqi-test"),
      revokeObjectURL,
    });
    class FakeImage {
      naturalWidth = 4000;
      naturalHeight = 3000;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_url: string) { queueMicrotask(() => this.onload?.()); }
    }
    vi.stubGlobal("Image", FakeImage);
    const canvases: Array<{ width: number; height: number }> = [];
    vi.stubGlobal("document", {
      createElement: (tag: string) => {
        if (tag !== "canvas") throw new Error("Unexpected element");
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
            fillRect: vi.fn(),
            fillStyle: "",
            imageSmoothingEnabled: false,
            imageSmoothingQuality: "low",
          }),
          toDataURL: () => "data:image/jpeg;base64,AAECAw==",
        };
        canvases.push(canvas);
        return canvas;
      },
    });
    const out = await prepareSignatureUpload({ type: "image/jpeg", size: 100 } as File);
    expect(out).toBe("data:image/jpeg;base64,AAECAw==");
    expect(canvases).toHaveLength(1);
    expect(canvases[0]).toMatchObject({ width: 1100, height: 825 });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:waqqi-test");
  });
});
