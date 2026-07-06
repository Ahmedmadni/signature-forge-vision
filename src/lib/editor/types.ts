// نماذج بيانات محرّر المستندات والتوقيع.

export type FieldType =
  | "signature"
  | "initials"
  | "date"
  | "text"
  | "checkbox"
  | "stamp";

export interface EditorField {
  id: string;
  type: FieldType;
  /** رقم الصفحة يبدأ من 1 */
  page: number;
  /** الموضع والحجم كنسب مئوية من أبعاد الصفحة (0..1) */
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  /** الدوران بالدرجات */
  rotation: number;
  /** الشفافية 0..1 */
  opacity: number;
  /** القيمة النصية أو حالة الاختيار */
  value?: string;
  checked?: boolean;
}

export const fieldMeta: Record<
  FieldType,
  { label: string; color: string; defaultW: number; defaultH: number }
> = {
  signature: { label: "توقيع", color: "var(--primary)", defaultW: 0.24, defaultH: 0.08 },
  initials: { label: "الأحرف الأولى", color: "var(--accent)", defaultW: 0.1, defaultH: 0.06 },
  date: { label: "التاريخ", color: "var(--chart-3)", defaultW: 0.16, defaultH: 0.05 },
  text: { label: "نص", color: "var(--chart-4)", defaultW: 0.22, defaultH: 0.05 },
  checkbox: { label: "مربع اختيار", color: "var(--chart-5)", defaultW: 0.04, defaultH: 0.04 },
  stamp: { label: "ختم", color: "var(--destructive)", defaultW: 0.16, defaultH: 0.16 },
};

export type ApplyScope =
  | { kind: "current" }
  | { kind: "all" }
  | { kind: "odd" }
  | { kind: "even" }
  | { kind: "selected"; pages: number[] }
  | { kind: "range"; text: string };

export function resolveScopePages(
  scope: ApplyScope,
  currentPage: number,
  pageCount: number,
): number[] {
  const all = Array.from({ length: pageCount }, (_, i) => i + 1);
  switch (scope.kind) {
    case "current":
      return [currentPage];
    case "all":
      return all;
    case "odd":
      return all.filter((p) => p % 2 === 1);
    case "even":
      return all.filter((p) => p % 2 === 0);
    case "selected":
      return scope.pages.filter((p) => p >= 1 && p <= pageCount);
    case "range":
      return parsePageRanges(scope.text, pageCount);
  }
}

/** يحلّل نصًا مثل "1-3, 5, 8-10" إلى قائمة صفحات فريدة ومرتبة */
export function parsePageRanges(text: string, pageCount: number): number[] {
  const out = new Set<number>();
  for (const part of text.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      let a = parseInt(m[1], 10);
      let b = parseInt(m[2], 10);
      if (a > b) [a, b] = [b, a];
      for (let p = a; p <= b; p++) if (p >= 1 && p <= pageCount) out.add(p);
    } else if (/^\d+$/.test(trimmed)) {
      const p = parseInt(trimmed, 10);
      if (p >= 1 && p <= pageCount) out.add(p);
    }
  }
  return [...out].sort((a, b) => a - b);
}
