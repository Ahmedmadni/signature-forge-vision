import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ScrollText, Search, Download, FileText, PenTool, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { auditLogs } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Logs — SignForge" }] }),
  component: Audit,
});

const catIcon = { document: FileText, signature: PenTool, security: ShieldCheck, team: Users } as const;
const catClass: Record<string, string> = {
  document: "bg-primary/10 text-primary",
  signature: "bg-accent/10 text-accent",
  security: "bg-success/10 text-success",
  team: "bg-warning/10 text-warning",
};

function Audit() {
  const [q, setQ] = useState("");
  const rows = auditLogs.filter((l) => (l.actor + l.action + l.target).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle="A tamper-evident trail of every action across your workspace."
        actions={<Button variant="outline"><Download className="h-4 w-4" /> Export log</Button>}
      />
      <div className="mb-4 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activity…" className="pl-9" />
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-elegant">
        <div className="divide-y divide-border">
          {rows.map((log, i) => {
            const Icon = catIcon[log.category as keyof typeof catIcon] ?? ScrollText;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
              >
                <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", catClass[log.category])}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm"><span className="font-medium">{log.actor}</span> · {log.action}</p>
                  <p className="truncate text-xs text-muted-foreground">{log.target}</p>
                </div>
                <div className="hidden text-right text-xs text-muted-foreground sm:block">
                  <p className="font-mono">{log.ip}</p>
                  <p>{log.time}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </>
  );
}
