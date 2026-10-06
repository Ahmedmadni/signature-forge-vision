import { createFileRoute, Link } from "@tanstack/react-router";
import { DeveloperFooter } from "@/components/app/DeveloperFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام — وقِّع" },
      { name: "description", content: "شروط استخدام تطبيق وقِّع لتوقيع ملفات PDF ومسح المستندات والحصة المجانية وحدود الخدمة." },
      { property: "og:title", content: "شروط الاستخدام — وقِّع" },
      { property: "og:description", content: "شروط استخدام تطبيق وقِّع لتوقيع ملفات PDF ومسح المستندات والحصة المجانية وحدود الخدمة." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

const sections = [
  { t: "الخدمة", b: "يتيح التطبيق إضافة توقيع إلكتروني مرئي إلى ملفات PDF ومسح المستندات وحفظ النتائج على جهازك." },
  { t: "طبيعة التوقيع", b: "التوقيع الذي يضيفه التطبيق هو توقيع إلكتروني مرئي داخل PDF، وليس توقيعًا رقميًا تشفيريًا قائمًا على شهادة PAdES أو PKI." },
  { t: "الحصة المجانية", b: "الاستخدام المجاني مهيأ حاليًا لتوقيع 3 صفحات يوميًا. في وضع الضيف تُتابَع الحصة محليًا على الجهاز، وعند تسجيل الدخول تُدار الحصة المرتبطة بالحساب من الخادم. قد تتغير الحدود أو الخطط مستقبلًا بعد إشعار مناسب." },
  { t: "الملفات المحمية", b: "قد لا يدعم التطبيق ملفات PDF المشفرة أو المحمية بكلمة مرور، وقد يطلب إزالة الحماية قبل التوقيع." },
  { t: "مسؤوليتك", b: "أنت المسؤول عن صحة المستندات التي توقّعها، وصلاحيتك للتوقيع عليها، وعن الالتزام بالقوانين والاتفاقات المعمول بها." },
  { t: "حدود المسؤولية", b: "يُقدَّم التطبيق كما هو دون ضمانات، ويجب التحقق من الملف النهائي قبل الاعتماد عليه أو مشاركته." },
];

function TermsPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8">
      <Link to="/" className="text-sm text-primary hover:underline">
        العودة للرئيسية
      </Link>
      <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">شروط الاستخدام</h1>
      <p className="mt-1 text-xs text-muted-foreground">آخر تحديث: 5 أكتوبر 2026</p>
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
