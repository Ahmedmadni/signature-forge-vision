import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ShieldCheck, Plus, Fingerprint, Download, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { certificates } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/certificates")({
  head: () => ({ meta: [{ title: "الشهادات — ساين فورج" }] }),
  component: Certificates,
});

function Certificates() {
  return (
    <>
      <PageHeader
        title="الشهادات"
        subtitle="شهادات رقمية وأختام زمنية موثوقة لتوقيعات ملزمة قانونيًا."
        actions={<Button className="bg-gradient-brand text-primary-foreground shadow-glow"><Plus className="h-4 w-4" /> إصدار شهادة</Button>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {certificates.map((c, i) => {
          const expiring = c.status === "expiring";
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-elegant"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("grid h-11 w-11 place-items-center rounded-xl", expiring ? "bg-warning/15 text-warning" : "bg-success/15 text-success")}>
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">صادرة عن {c.issuer}</p>
                  </div>
                </div>
                <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", expiring ? "bg-warning/15 text-warning" : "bg-success/15 text-success")}>
                  {expiring && <AlertTriangle className="h-3 w-3" />}
                  {expiring ? "قرب الانتهاء" : "سارية"}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
                <Fingerprint className="h-4 w-4 shrink-0" /> {c.fingerprint}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">سارية حتى {c.validUntil}</span>
                <Button variant="outline" size="sm"><Download className="h-4 w-4" /> تصدير</Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
