import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LayoutTemplate, Plus, Copy, MoreVertical } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { templates } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "القوالب — ساين فورج" }] }),
  component: Templates,
});

function Templates() {
  return (
    <>
      <PageHeader
        title="القوالب"
        subtitle="مستندات جاهزة قابلة لإعادة الاستخدام للإرسال بنقرة واحدة."
        actions={<Button className="bg-gradient-brand text-primary-foreground shadow-glow"><Plus className="h-4 w-4" /> قالب جديد</Button>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-elegant"
          >
            <div className="absolute inset-0 bg-gradient-glow opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
            </div>
            <h3 className="relative mt-4 font-display text-lg font-semibold">{t.title}</h3>
            <span className="relative mt-1 inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{t.category}</span>
            <div className="relative mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>{t.fields} حقل · {t.uses} استخدام</span>
              <span>{t.updated}</span>
            </div>
            <Button variant="outline" size="sm" className="relative mt-4 w-full"><Copy className="h-4 w-4" /> استخدام القالب</Button>
          </motion.div>
        ))}
      </div>
    </>
  );
}
