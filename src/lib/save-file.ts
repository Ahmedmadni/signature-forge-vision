import { Capacitor } from "@capacitor/core";
import { isPackagedAndroidApp } from "@/lib/native-document-scanner";

/** Never treat path separators or Android-invalid filename characters as paths. */
export function safeExportFileName(fileName: string): string {
  const safe = fileName
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\p{Cc}/gu, "_")
    .replace(/^\.+/, "_")
    .trim()
    .slice(0, 160);
  if (!safe || safe === "_" || safe === ".") return "مستند-وقع.pdf";
  return safe;
}

/**
 * Scans are often saved more than once per day. Never let a second native
 * export silently overwrite an existing file with the same display name.
 */
export function uniqueAndroidExportName(name: string, timestamp: number, suffix: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  const stamp = new Date(timestamp).toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  // Keep room for suffixes under Android's filename byte limit (Arabic is UTF-8).
  const shortBase = Array.from(base).slice(0, 64).join("");
  return `${shortBase}-${stamp}-${suffix}${extension}`;
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذّرت قراءة الملف"));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(blob);
  });
}

export function isNative() {
  return Capacitor.isNativePlatform();
}

/** Save to the device: native Filesystem + share on Android, browser download on web. */
export async function saveFile(blob: Blob, fileName: string): Promise<string> {
  if (blob.size === 0) throw new Error("الملف الناتج فارغ، ولم يُحفظ.");
  const name = safeExportFileName(fileName);
  const inAndroidApk = isPackagedAndroidApp();

  if (isNative() || inAndroidApk) {
    // The remote-hosted Android WebView sometimes starts without its native
    // bridge. A blob anchor in Android WebView is NOT a reliable fallback.
    if (!Capacitor.isPluginAvailable("Filesystem")) {
      throw new Error("تعذّر الاتصال بذاكرة Android. أغلق التطبيق وافتحه مجددًا؛ لم يتم حفظ الملف.");
    }
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const data = await toBase64(blob);
    const exportName = uniqueAndroidExportName(name, Date.now(), crypto.randomUUID().slice(0, 8));
    const res = await Filesystem.writeFile({
      path: exportName,
      data,
      directory: Directory.Documents,
      recursive: true,
    });
    if (Capacitor.isPluginAvailable("Share")) {
      try {
        const { Share } = await import("@capacitor/share");
        await Share.share({ title: exportName, url: res.uri, dialogTitle: "مشاركة المستند" });
      } catch {
        // Canceling a share dialog must not undo a completed disk save.
      }
    }
    return res.uri;
  }

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  return name;
}
