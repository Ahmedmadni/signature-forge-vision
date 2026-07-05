// بيانات تجريبية منسّقة للوحة تحكم SignForge. استبدلها باستعلامات حية مع كل مرحلة.

export type DocStatus = "draft" | "pending" | "signed" | "completed" | "declined" | "expired";

export const statusMeta: Record<DocStatus, { label: string; className: string }> = {
  draft: { label: "مسودة", className: "bg-muted text-muted-foreground" },
  pending: { label: "قيد الانتظار", className: "bg-warning/15 text-warning" },
  signed: { label: "موقّع", className: "bg-accent/15 text-accent" },
  completed: { label: "مكتمل", className: "bg-success/15 text-success" },
  declined: { label: "مرفوض", className: "bg-destructive/15 text-destructive" },
  expired: { label: "منتهٍ", className: "bg-destructive/10 text-destructive/80" },
};

export const documents = [
  { id: "d1", title: "اتفاقية خدمات رئيسية — شركة أكمي", type: "PDF", status: "pending" as DocStatus, pages: 24, updated: "قبل ساعتين", recipients: ["j.doe@acme.io", "legal@acme.io"], size: "2.4 م.ب" },
  { id: "d2", title: "اتفاقية عدم إفصاح — كوانتم فينتشرز", type: "PDF", status: "completed" as DocStatus, pages: 6, updated: "قبل 5 ساعات", recipients: ["ceo@quantum.vc"], size: "820 ك.ب" },
  { id: "d3", title: "عقد عمل — ر. ناكامورا", type: "DOCX", status: "signed" as DocStatus, pages: 11, updated: "أمس", recipients: ["r.nakamura@mail.com"], size: "1.1 م.ب" },
  { id: "d4", title: "حزمة فواتير موردي الربع الثالث", type: "XLSX", status: "draft" as DocStatus, pages: 3, updated: "قبل يومين", recipients: [], size: "540 ك.ب" },
  { id: "d5", title: "عقد إيجار عقار — 44 شارع هاربور", type: "PDF", status: "pending" as DocStatus, pages: 18, updated: "قبل 3 أيام", recipients: ["tenant@mail.com", "agent@realty.co"], size: "3.2 م.ب" },
  { id: "d6", title: "مذكرة تفاهم شراكة — هيليو لابز", type: "PDF", status: "declined" as DocStatus, pages: 9, updated: "قبل 4 أيام", recipients: ["ops@helio.io"], size: "1.7 م.ب" },
  { id: "d7", title: "نطاق عمل استشاري — ريدشيفت", type: "PDF", status: "completed" as DocStatus, pages: 14, updated: "قبل 6 أيام", recipients: ["pm@redshift.dev"], size: "2.0 م.ب" },
  { id: "d8", title: "حزمة تهيئة الموظفين الجدد", type: "PDF", status: "expired" as DocStatus, pages: 21, updated: "قبل أسبوع", recipients: ["hr@company.com"], size: "4.1 م.ب" },
];

export const templates = [
  { id: "t1", title: "اتفاقية عدم إفصاح قياسية", category: "قانوني", uses: 342, fields: 8, updated: "قبل يوم" },
  { id: "t2", title: "عقد مبيعات", category: "مبيعات", uses: 218, fields: 14, updated: "قبل 3 أيام" },
  { id: "t3", title: "خطاب عرض وظيفي", category: "موارد بشرية", uses: 176, fields: 11, updated: "قبل أسبوع" },
  { id: "t4", title: "اتفاقية استشارات", category: "قانوني", uses: 129, fields: 16, updated: "قبل أسبوعين" },
  { id: "t5", title: "اعتماد فاتورة", category: "مالية", uses: 98, fields: 6, updated: "قبل أسبوعين" },
  { id: "t6", title: "تهيئة مورد", category: "عمليات", uses: 64, fields: 12, updated: "قبل 3 أسابيع" },
];

export const signatures = [
  { id: "s1", name: "التوقيع الأساسي", type: "مرسوم", isDefault: true, font: "cursive" },
  { id: "s2", name: "الاسم الكامل الرسمي", type: "مكتوب", isDefault: false, font: "serif" },
  { id: "s3", name: "الأحرف الأولى", type: "مرسوم", isDefault: false, font: "cursive" },
  { id: "s4", name: "معزّز بالذكاء الاصطناعي", type: "ذكاء اصطناعي", isDefault: false, font: "cursive" },
];

export const team = [
  { id: "m1", name: "أليكس ريفيرا", email: "alex@signforge.io", role: "مدير", status: "active", initials: "AR" },
  { id: "m2", name: "بريا شاه", email: "priya@signforge.io", role: "مشرف", status: "active", initials: "PS" },
  { id: "m3", name: "ماركوس كول", email: "marcus@signforge.io", role: "عضو", status: "active", initials: "MC" },
  { id: "m4", name: "لينا فيشر", email: "lena@signforge.io", role: "عضو", status: "invited", initials: "LF" },
  { id: "m5", name: "توماس فيدال", email: "tomas@signforge.io", role: "عضو", status: "active", initials: "TV" },
];

export const roleMeta: Record<string, string> = {
  مدير: "bg-primary/15 text-primary",
  مشرف: "bg-accent/15 text-accent",
  عضو: "bg-muted text-muted-foreground",
};

export const certificates = [
  { id: "c1", name: "شهادة SignForge الجذرية", issuer: "هيئة SignForge", fingerprint: "3F:A2:9C:...:E1", status: "valid", validUntil: "2027-04-11" },
  { id: "c2", name: "أليكس ريفيرا — توقيع إلكتروني", issuer: "هيئة SignForge", fingerprint: "8B:11:74:...:A9", status: "valid", validUntil: "2026-11-02" },
  { id: "c3", name: "ختم زمني للمؤسسة", issuer: "GlobalSign", fingerprint: "D4:60:2E:...:7C", status: "valid", validUntil: "2026-08-19" },
  { id: "c4", name: "شهادة توقيع قديمة", issuer: "هيئة SignForge", fingerprint: "1A:F0:B3:...:44", status: "expiring", validUntil: "2026-07-30" },
];

export const auditLogs = [
  { id: "a1", actor: "أليكس ريفيرا", action: "وقّع مستندًا", target: "اتفاقية خدمات — أكمي", category: "signature", ip: "192.0.2.14", time: "10:42 ص" },
  { id: "a2", actor: "بريا شاه", action: "أرسل للتوقيع", target: "عقد إيجار — 44 شارع هاربور", category: "document", ip: "192.0.2.31", time: "10:05 ص" },
  { id: "a3", actor: "النظام", action: "تم التحقق من الختم الزمني", target: "اتفاقية عدم إفصاح — كوانتم", category: "security", ip: "داخلي", time: "09:51 ص" },
  { id: "a4", actor: "ماركوس كول", action: "رفع مستندًا", target: "حزمة فواتير الربع الثالث", category: "document", ip: "192.0.2.88", time: "09:20 ص" },
  { id: "a5", actor: "لينا فيشر", action: "رفض التوقيع", target: "مذكرة شراكة — هيليو لابز", category: "signature", ip: "203.0.113.5", time: "أمس" },
  { id: "a6", actor: "النظام", action: "تم تطبيق تشفير AES-256", target: "عقد عمل", category: "security", ip: "داخلي", time: "أمس" },
  { id: "a7", actor: "أليكس ريفيرا", action: "أضاف عضو فريق", target: "tomas@signforge.io", category: "team", ip: "192.0.2.14", time: "قبل يومين" },
];

export const activityData = [
  { name: "الإثنين", sent: 24, signed: 18, completed: 12 },
  { name: "الثلاثاء", sent: 32, signed: 27, completed: 21 },
  { name: "الأربعاء", sent: 28, signed: 24, completed: 19 },
  { name: "الخميس", sent: 41, signed: 33, completed: 28 },
  { name: "الجمعة", sent: 38, signed: 35, completed: 31 },
  { name: "السبت", sent: 12, signed: 9, completed: 7 },
  { name: "الأحد", sent: 8, signed: 6, completed: 5 },
];

export const statusBreakdown = [
  { name: "مكتمل", value: 58, color: "var(--color-success)" },
  { name: "قيد الانتظار", value: 24, color: "var(--color-warning)" },
  { name: "موقّع", value: 12, color: "var(--color-accent)" },
  { name: "مرفوض", value: 6, color: "var(--color-destructive)" },
];

export const turnaroundData = [
  { name: "يناير", hours: 26 },
  { name: "فبراير", hours: 22 },
  { name: "مارس", hours: 19 },
  { name: "أبريل", hours: 17 },
  { name: "مايو", hours: 14 },
  { name: "يونيو", hours: 11 },
];
