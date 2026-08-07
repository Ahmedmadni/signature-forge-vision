import { createFileRoute, Link } from "@tanstack/react-router";
import { DeveloperFooter } from "@/components/app/DeveloperFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — وقِّع" },
      { name: "description", content: "كيف يتعامل تطبيق وقِّع مع ملفاتك وبياناتك: المعالجة تتم على جهازك ولا نرفع مستنداتك." },
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
    b: "تتم قراءة ملف PDF ودمج التوقيع بالكامل داخل جهازك. لا يُرفع المستند إلى خوادمنا ولا يُحفظ لدينا.",
  },
  {
    t: "البيانات التي نحفظها",
    b: "نحفظ بريدك الإلكتروني لتسجيل الدخول، صورة توقيعك المحفوظة، وعدّاد الصفحات اليومي فقط.",
  },
  {
    t: "المشاركة مع أطراف ثالثة",
    b: "لا نبيع بياناتك ولا نشاركها لأغراض إعلانية.",
  },
  {
    t: "حذف الحساب",
    b: "يمكنك طلب حذف حسابك وبياناتك في أي وقت عبر التواصل مع المطوّر.",
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
