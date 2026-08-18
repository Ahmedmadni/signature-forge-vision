/**
 * إعدادات المساحات الإعلانية (Google AdMob / AdSense).
 * التطبيق مهيّأ مسبقًا: عند إضافة المعرفات في متغيرات البيئة تظهر الإعلانات تلقائيًا،
 * وقبل ذلك تبقى المساحات محجوزة (Placeholder) دون التأثير على التصميم.
 */

export const ADS_ENABLED = import.meta.env["VITE_ADS_ENABLED"] === "true";

/** معرف تطبيق AdMob — يُضاف أيضًا في AndroidManifest.xml */
export const ADMOB_APP_ID = import.meta.env["VITE_ADMOB_APP_ID"] ?? "";

/** وحدات الإعلانات: بانر أسفل الشاشة + إعلان بيني بعد حفظ المستند */
export const AD_UNITS = {
  banner: import.meta.env["VITE_ADMOB_BANNER_ID"] ?? "",
  interstitial: import.meta.env["VITE_ADMOB_INTERSTITIAL_ID"] ?? "",
  rewarded: import.meta.env["VITE_ADMOB_REWARDED_ID"] ?? "",
} as const;

export type AdSlotName = keyof typeof AD_UNITS;

/** يُستدعى بعد إتمام عملية توقيع — نقطة الوصل المستقبلية للإعلان البيني */
export async function showInterstitial(): Promise<void> {
  if (!ADS_ENABLED || !AD_UNITS.interstitial) return;
  // TODO: تفعيل @capacitor-community/admob هنا بعد تجهيز الحساب الإعلاني.
}
