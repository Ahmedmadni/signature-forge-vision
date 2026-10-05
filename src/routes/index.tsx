import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Signature, FileUp, PenLine, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeveloperFooter } from "@/components/app/DeveloperFooter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: () => { throw redirect({ to: "/home" }); },
  head: () => ({
    meta: [
      { title: "وقِّع — تطبيق توقيع ملفات PDF إلكترونيًا" },
      { name: "description", content: "تطبيق بسيط لتوقيع ملفات PDF: ارفع الملف، ضع توقيعك بإصبعك، واحفظ المستند الموقّع على جهازك خلال ثوانٍ." },
      { property: "og:title", content: "وقِّع — تطبيق توقيع ملفات PDF إلكترونيًا" },
      { property: "og:description", content: "تطبيق بسيط لتوقيع ملفات PDF: ارفع الملف، ضع توقيعك بإصبعك، واحفظ المستند الموقّع على جهازك خلال ثوانٍ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const steps = [
  { icon: FileUp, t: "ارفع ملف PDF", b: "اختر المستند من جهازك" },
  { icon: PenLine, t: "ضع توقيعك", b: "ارسمه أو اكتبه أو ارفع صورة" },
  { icon: Download, t: "احفظ المستند", b: "نزّل النسخة الموقّعة فورًا" },
];

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home" });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none fixed inset-0 bg-gradient-glow opacity-60" />

      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-5 pt-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center"
        >
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-brand shadow-glow">
            <Signature className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
            وقِّع ملفات PDF في ثوانٍ
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            تطبيق بسيط ومباشر لإضافة توقيعك الإلكتروني إلى المستندات — بدون لوحات تحكم معقّدة، وبدون
            رفع ملفاتك إلى أي خادم.
          </p>

          <Button
            asChild
            size="lg"
            className="mt-7 w-full max-w-xs bg-gradient-brand text-primary-foreground shadow-glow"
          >
            <Link to="/home">ابدأ الآن بدون حساب</Link>
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">3 صفحات مجانية كل يوم</p>
        </motion.div>

        <div className="mt-12 grid w-full gap-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.t}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.15 }}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card/60 p-4 text-start"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{s.t}</p>
                <p className="text-xs text-muted-foreground">{s.b}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          التوقيع يتم محليًا على جهازك
        </div>
      </main>

      <div className="relative mx-auto w-full max-w-2xl">
        <DeveloperFooter className="mt-12" />
      </div>
    </div>
  );
}
