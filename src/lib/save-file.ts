import { Capacitor } from "@capacitor/core";

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

/** يحفظ الملف في جهاز المستخدم: تنزيل على الويب، ومجلد المستندات + مشاركة على أندرويد. */
export async function saveFile(blob: Blob, fileName: string): Promise<string> {
  if (isNative()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const data = await toBase64(blob);
    const res = await Filesystem.writeFile({
      path: fileName,
      data,
      directory: Directory.Documents,
      recursive: true,
    });
    try {
      await Share.share({ title: fileName, url: res.uri, dialogTitle: "مشاركة المستند الموقّع" });
    } catch {
      /* ألغى المستخدم المشاركة */
    }
    return res.uri;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return fileName;
}
