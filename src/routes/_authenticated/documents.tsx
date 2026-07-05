import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FileText, Upload, Search, Filter, MoreVertical, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { documents, type DocStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "المستندات — ساين فورج" }] }),
  component: Documents,
});

const filters: (DocStatus | "all")[] = ["all", "draft", "pending", "signed", "completed", "declined"];

function Documents() {
  const [filter, setFilter] = useState<DocStatus | "all">("all");
  const [q, setQ] = useState("");

  const rows = documents.filter(
    (d) => (filter === "all" || d.status === filter) && d.title.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="المستندات"
        subtitle="ارفع وجهّز وأرسل وتتبّع كل مستند."
        actions={<Button className="bg-gradient-brand text-primary-foreground shadow-glow"><Upload className="h-4 w-4" /> رفع مستند</Button>}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as DocStatus | "all")}>
          <TabsList className="flex-wrap">
            {filters.map((f) => (
              <TabsTrigger key={f} value={f}>{filterLabels[f]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث…" className="w-full pr-9 sm:w-56" />
          </div>
          <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-elegant">
        <div className="hidden grid-cols-12 gap-4 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
          <div className="col-span-5">المستند</div>
          <div className="col-span-2">الحالة</div>
          <div className="col-span-2">المستلمون</div>
          <div className="col-span-2">آخر تحديث</div>
          <div className="col-span-1 text-left">إجراءات</div>
        </div>
        <div className="divide-y divide-border">
          {rows.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-muted/40 md:grid-cols-12 md:items-center md:gap-4"
            >
              <div className="col-span-5 flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{doc.type} · {doc.pages} صفحة · {doc.size}</p>
                </div>
              </div>
              <div className="col-span-2"><StatusBadge status={doc.status} /></div>
              <div className="col-span-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" /> {doc.recipients.length}
              </div>
              <div className="col-span-2 text-sm text-muted-foreground">{doc.updated}</div>
              <div className="col-span-1 flex justify-end">
                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
              </div>
            </motion.div>
          ))}
          {rows.length === 0 && (
            <div className="px-5 py-16 text-center text-sm text-muted-foreground">لا توجد مستندات مطابقة للتصفية.</div>
          )}
        </div>
      </div>
    </>
  );
}
