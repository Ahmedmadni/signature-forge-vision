export const MAX_USAGE_PAGES_PER_CALL = 10000;

export function validateUsagePageCount(pages: number): number {
  if (!Number.isSafeInteger(pages) || pages < 1 || pages > MAX_USAGE_PAGES_PER_CALL) {
    throw new Error("عدد الصفحات غير صالح");
  }
  return pages;
}
