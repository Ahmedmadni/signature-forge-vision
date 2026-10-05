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
    t: "وضع الضيف",
    b: "يمكن استخدام وظائف المسح والتوقيع بدون حساب. توقيعات الضيف وعدّاد الاستخدام اليومي تحفظ محليًا على الجهاز، ولا تتم مزامنتها تلقائيًا مع أي حساب لاحقًا.",
  },
  {
    t: "بيانات الحساب",
    b: "عند تسجيل الدخول قد نحفظ بيانات الحساب اللازمة للمصادقة، ومعلومات الملف الشخصي التي تدخلها، والتوقيعات التي تختار حفظها في حسابك، وعدّاد الاستخدام وحالة الخطة.",
  },
  {
    t: "الكاميرا والمعرض",
    b: "يستخدم الماسح الضوئي الكاميرا أو الصور التي تختارها فقط لتنفيذ عملية المسح التي تبدأها. على Android قد تُستخدم مكوّنات Google Play Services لتشغيل واجهة المسح الأصلية ومعالجة الصفحات.",
  },
  {
    t: "التشخيص الفني",
    b: "قد ترسل بيئة الاستضافة تقارير أخطاء تقنية عند حدوث عطل، مثل مسار الصفحة ونوع الخطأ، بهدف تحسين الاستقرار. لا يضيف التطبيق محتوى مستنداتك إلى تقرير الخطأ عمدًا.",
  },
  {
    t: "مزودو الخدمة",
    b: "نستخدم خدمات بنية تحتية مثل Supabase/Lovable Cloud لتسجيل الدخول والبيانات المرتبطة بالحساب. لا نبيع محتوى مستنداتك أو توقيعاتك.",
  },
  {
    t: "الإعلانات",
    b: "لا يعرض الإصدار الحالي من وقِّع إعلانات ولا يطلب صلاحية معرّف الإعلانات على Android.",
  },
  {
    t: "حذف الحساب",
    b: "يمكن للمستخدم المسجّل حذف حسابه وبياناته السحابية مباشرة من صفحة «حذف الحساب» بعد التحقق من الجلسة، مع توفير قناة دعم إذا تعذّر تسجيل الدخول. الملفات والتوقيعات المحفوظة محليًا على جهازك لا تُحذف تلقائيًا عند حذف الحساب.",
  },
];

function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8">
      <Link to="/" className="text-sm text-primary hover:underline">
        العودة للرئيسية
      </Link>
      <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">سياسة الخصوصية</h1>
      <p className="mt-1 text-xs text-muted-foreground">آخر تحديث: 5 أكتوبر 2026</p>
      <div className="mt-6 flex-1 space-y-5">
        {sections.map((s) => (
          <section key={s.t}>
            <h2 className="text-base font-semibold">{s.t}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.b}</p>
          </section>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-border bg-card/60 p-4 text-sm">
        <Link to="/delete-account" className="font-medium text-primary hover:underline">حذف الحساب والبيانات المرتبطة به</Link>
      </div>
      <DeveloperFooter className="mt-8" />
    </div>
  );
}
