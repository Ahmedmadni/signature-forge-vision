import { useSyncExternalStore } from "react";

export type ScanQuality = "standard" | "high" | "max";
export type ScanPageSize = "auto" | "a4" | "letter" | "legal";

export interface ScanSettings {
  quality: ScanQuality;
  pageSize: ScanPageSize;
}

export const QUALITY_OPTIONS: { key: ScanQuality; label: string; hint: string }[] = [
  { key: "standard", label: "عادية", hint: "ملف أصغر حجمًا" },
  { key: "high", label: "عالية", hint: "الخيار الموصى به" },
  { key: "max", label: "قصوى", hint: "أعلى دقة وأكبر حجم" },
];

export const PAGE_SIZE_OPTIONS: { key: ScanPageSize; label: string; hint: string }[] = [
  { key: "auto", label: "تلقائي", hint: "حسب أبعاد الصورة" },
  { key: "a4", label: "A4", hint: "21 × 29.7 سم" },
  { key: "letter", label: "Letter", hint: "8.5 × 11 بوصة" },
  { key: "legal", label: "Legal", hint: "8.5 × 14 بوصة" },
];

/** جودة ضغط JPEG لكل مستوى */
export const QUALITY_JPEG: Record<ScanQuality, number> = {
  standard: 0.78,
  high: 0.92,
  max: 0.96,
};

/** أقصى بُعد للصفحة بالبكسل لكل مستوى */
export const QUALITY_MAX_PX: Record<ScanQuality, number> = {
  standard: 1600,
  high: 2400,
  max: 3300,
};

/** مقاسات الصفحة بالنقاط (pt) */
export const PAGE_SIZE_PT: Record<Exclude<ScanPageSize, "auto">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
};

const KEY = "waqqi:scan-settings";
const DEFAULTS: ScanSettings = { quality: "high", pageSize: "auto" };

let current: ScanSettings = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load(): ScanSettings {
  if (loaded) return current;
  loaded = true;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ScanSettings>;
        current = {
          quality: QUALITY_JPEG[parsed.quality as ScanQuality] ? (parsed.quality as ScanQuality) : DEFAULTS.quality,
          pageSize: PAGE_SIZE_OPTIONS.some((o) => o.key === parsed.pageSize)
            ? (parsed.pageSize as ScanPageSize)
            : DEFAULTS.pageSize,
        };
      }
    } catch {
      current = DEFAULTS;
    }
  }
  return current;
}

export function getScanSettings(): ScanSettings {
  return load();
}

export function setScanSettings(patch: Partial<ScanSettings>) {
  current = { ...load(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* التخزين غير متاح */
  }
  listeners.forEach((fn) => fn());
}

export function useScanSettings(): ScanSettings {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => load(),
    () => DEFAULTS,
  );
}
