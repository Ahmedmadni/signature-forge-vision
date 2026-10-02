/**
 * Android document scanning via Google Play Services ML Kit.
 * Web browsers and older APKs keep using the existing browser scanner.
 */
import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import {
  DocumentScanner,
  GoogleDocumentScannerModuleInstallState,
} from "@capacitor-mlkit/document-scanner";

const MAX_PAGES_PER_SESSION = 10;

export class NativeScannerUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NativeScannerUnavailableError";
  }
}

export function isAndroidNativeApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/** True even if a remote-hosted WebView fails to inject the Capacitor JS bridge. */
export function isPackagedAndroidApp(): boolean {
  return isAndroidNativeApp() || (
    typeof navigator !== "undefined" &&
    /WaqqiAndroid\/\d+/i.test(navigator.userAgent)
  );
}

export function canUseNativeScanner(): boolean {
  return isAndroidNativeApp() && Capacitor.isPluginAvailable("DocumentScanner");
}

function isCancelled(error: unknown): boolean {
  const detail = error instanceof Error ? error.message : String(error);
  // Google's plugin message contains "cancelled or failed" for all result codes.
  // Only Android RESULT_CANCELED (0) is a user cancellation.
  if (/Scan cancelled or failed\. Result code:/i.test(detail)) {
    return /Result code:\s*0\b/.test(detail);
  }
  return /cancelled|canceled|user.cancel|activity.result.canceled/i.test(detail);
}

/** Decode base64 in chunks to avoid allocating a second huge binary string for large scans. */
function base64ToJpegBlob(raw: string): Blob {
  const base64 = raw.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
  const binary = atob(base64);
  const blocks: ArrayBuffer[] = [];
  for (let offset = 0; offset < binary.length; offset += 64 * 1024) {
    const slice = binary.slice(offset, offset + 64 * 1024);
    const bytes = new Uint8Array(slice.length);
    for (let i = 0; i < slice.length; i++) bytes[i] = slice.charCodeAt(i);
    blocks.push(bytes.buffer as ArrayBuffer);
  }
  return new Blob(blocks, { type: "image/jpeg" });
}

async function ensureScannerModule(onStatus?: (status: string) => void): Promise<void> {
  const { available } = await DocumentScanner.isGoogleDocumentScannerModuleAvailable();
  if (available) return;

  onStatus?.("جارٍ تنزيل محرك المسح الأصلي من خدمات Google Play…");
  let settle!: (ok: boolean) => void;
  const completion = new Promise<boolean>((resolve) => { settle = resolve; });
  const listener = await DocumentScanner.addListener(
    "googleDocumentScannerModuleInstallProgress",
    ({ state, progress }) => {
      if (typeof progress === "number") {
        onStatus?.(`تحميل محرك المسح: ${Math.round(progress)}%`);
      }
      if (state === GoogleDocumentScannerModuleInstallState.COMPLETED) settle(true);
      if (
        state === GoogleDocumentScannerModuleInstallState.FAILED ||
        state === GoogleDocumentScannerModuleInstallState.CANCELED
      ) settle(false);
    },
  );

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    try {
      await DocumentScanner.installGoogleDocumentScannerModule();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/already installed/i.test(message)) throw error;
      // The module can become available between the first check and install.
      return;
    }
    const timedOut = new Promise<boolean>((resolve) => {
      timeoutId = setTimeout(() => resolve(false), 90000);
    });
    const completed = await Promise.race([completion, timedOut]);
    const nowAvailable = await DocumentScanner.isGoogleDocumentScannerModuleAvailable();
    if (!completed && !nowAvailable.available) {
      throw new NativeScannerUnavailableError("تعذّر تنزيل محرك Google للمستندات. تأكد من الإنترنت وخدمات Google Play.");
    }
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    await listener.remove();
  }
}

/**
 * Returns null when the user cancels, otherwise the processed JPEG pages.
 * The native scanner already deskews, crops, applies user-selected enhancements,
 * and returns pages in their chosen order.
 */
export async function scanNativeDocuments(
  onStatus?: (status: string) => void,
): Promise<Blob[] | null> {
  if (!canUseNativeScanner()) {
    throw new NativeScannerUnavailableError(
      "الماسح الأصلي غير متوفر في نسخة التطبيق الحالية. يلزم إصدار APK يحتوي الإضافة.",
    );
  }

  await ensureScannerModule(onStatus);
  onStatus?.("جارٍ فتح الماسح الأصلي…");

  let result: Awaited<ReturnType<typeof DocumentScanner.scanDocument>>;
  try {
    result = await DocumentScanner.scanDocument({
      galleryImportAllowed: true,
      pageLimit: MAX_PAGES_PER_SESSION,
      resultFormats: "JPEG",
      scannerMode: "FULL",
    });
  } catch (error) {
    if (isCancelled(error)) return null;
    throw error;
  }

  const uris = result.scannedImages ?? [];
  if (uris.length === 0) return null;

  const blobs: Blob[] = [];
  for (let index = 0; index < uris.length; index++) {
    onStatus?.(`جارٍ تحميل الصفحة ${index + 1} من ${uris.length}…`);
    // Capacitor Filesystem accepts Android content:// and file:// URIs without directory.
    const { data } = await Filesystem.readFile({ path: uris[index] });
    if (typeof data !== "string") {
      throw new Error("تعذّرت قراءة بيانات الصفحة من النظام.");
    }
    blobs.push(base64ToJpegBlob(data));
  }
  return blobs;
}
