import { createFileRoute, Link } from "@tanstack/react-router";
import { DeveloperFooter } from "@/components/app/DeveloperFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — وقِّع" },
      { name: "description", content: "كيف يتعامل تطبيق وقِّع مع ملفاتك وبيانات حسابك والكاميرا وخدمات الطرف الثالث." },
      { property: "og:title", content: "سياسة الخصوصية — وقِّع" },
      { property: "og:description", content: "كيف يتعامل تطبيق وقِّع مع ملفاتك وبياناتك: المعالجة تتم على جهازك ولا نرفع مستنداتك." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    t: "معالجة المستندات",
    b: "في مسار التوقيع والمسح الأساسي تتم قراءة ملفات PDF والصور ومعالجتها على جهازك، ولا يرفع التطبيق محتوى المستند إلى خوادمنا لغرض التوقيع أو المسح.",
  },
  {
    t: "البيانات التي نحفظها",
    b: "قد نحفظ بيانات الحساب اللازمة لتسجيل الدخول، ومعلومات الملف الشخصي التي تدخلها، وصور التوقيعات التي تختار حفظها، وعدّاد الاستخدام اليومي، وحالة الاستحقاق أو الخطة المرتبطة بحسابك.",
  },
  {
    t: "الكاميرا والمعرض",
    b: "يستخدم الماسح الضوئي الكاميرا أو الصور التي تختارها من جهازك فقط لتنفيذ عملية المسح التي تبدأها. على Android قد تُستخدم مكوّنات Google Play Services لتشغيل واجهة المسح الأصلية.",
  },
  {
    t: "مزودو الخدمة",
    b: "نستخدم خدمات بنية تحتية مثل Supabase/Lovable Cloud لتسجيل الدخول والبيانات المرتبطة بالحساب. لا نبيع محتوى مستنداتك أو توقيعاتك.",
  },
  {
    t: "الإعلانات",
    b: "إعدادات التطوير الحالية تستخدم معرّفات اختبار. إذا فُعّلت الإعلانات في إصدار إنتاجي فقد تعالج خدمة الإعلان معرّف الإعلانات وبيانات تقنية وفق إعدادات الموافقة وسياسة مزود الخدمة.",
  },
  {
    t: "حذف الحساب",
    b: "يمكنك طلب حذف حسابك والبيانات المرتبطة به عبر قناة التواصل المعتمدة للمطوّر. لا يشمل ذلك الملفات التي حفظتها محليًا على جهازك.",
  },
];

function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8">
      <Link to="/" className="text-sm text-primary hover:underline">
        العودة للرئيسية
      </Link>
      <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">سياسة الخصوصية</h1>
      <div className="mt-6 flex-1 space-y-5">
        {sections.map((s) => (
          <section key={s.t}>
            <h2 className="text-base font-semibold">{s.t}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.b}</p>
          </section>
        ))}
      </div>
      <DeveloperFooter className="mt-8" />
    </div>
  );
}
