const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_STORED_URL_CHARS = 350_000;
const MAX_IMAGE_EDGE = 1100;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);

/**
 * Keep the original photo on the user's device; only the reduced signature
 * representation is stored as a data URL. Browser decoders validate content.
 */
export function validateSignatureUpload(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("ارفع صورة توقيع بصيغة PNG أو JPG فقط.");
  }
  if (!file.size) throw new Error("صورة التوقيع فارغة.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("الصورة كبيرة جدًا. اختر صورة توقيع أقل من 12 ميجابايت.");
  }
}

function loadImageFromBlob(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("تعذّر قراءة صورة التوقيع. جرّب صورة أخرى."));
    image.src = url;
  });
}

export async function prepareSignatureUpload(file: File): Promise<string> {
  validateSignatureUpload(file);
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImageFromBlob(url);
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) throw new Error("أبعاد صورة التوقيع غير صالحة.");

    // Crop huge camera uploads by scaling before converting to localStorage.
    // Keep PNG transparency where present, without unnecessarily flattening it.
    const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
    let scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height));
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("معالجة الصور غير متاحة على هذا الجهاز.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      // JPEG never needs transparent fill. PNG remains transparent.
      if (mime === "image/jpeg") {
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const encoded = canvas.toDataURL(mime, 0.84);
      if (encoded.startsWith("data:image/") && encoded.length <= MAX_STORED_URL_CHARS) {
        return encoded;
      }
      scale *= 0.72;
    }
    throw new Error("تعذّر تصغير التوقيع للحفظ المحلي. جرّب صورة أصغر.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
