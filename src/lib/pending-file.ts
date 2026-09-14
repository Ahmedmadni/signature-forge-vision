/** تمرير ملف بين الشاشات (مثلًا من الماسح الضوئي إلى شاشة التوقيع) */
let pending: File | null = null;

export function setPendingFile(file: File) {
  pending = file;
}

export function takePendingFile(): File | null {
  const f = pending;
  pending = null;
  return f;
}
