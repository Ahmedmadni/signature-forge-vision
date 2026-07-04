import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PenTool, Type, Upload, Sparkles, Plus, Star, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { signatures } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/signatures")({
  head: () => ({ meta: [{ title: "Signatures — SignForge" }] }),
  component: Signatures,
});

const methods = [
  { icon: PenTool, title: "Draw", desc: "Draw by hand on any device" },
  { icon: Type, title: "Type", desc: "Pick from signature fonts" },
  { icon: Upload, title: "Upload", desc: "Import a signature image" },
  { icon: Sparkles, title: "AI generate", desc: "Craft one with AI" },
];

function Signatures() {
  return (
    <>
      <PageHeader
        title="Signatures"
        subtitle="Create and manage the signatures you apply to documents."
        actions={<Button className="bg-gradient-brand text-primary-foreground shadow-glow"><Plus className="h-4 w-4" /> Create signature</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {methods.map((m, i) => (
          <motion.button
            key={m.title}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="group rounded-2xl border border-border bg-card p-5 text-left shadow-elegant transition-all hover:border-primary/50 hover:shadow-glow"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-gradient-brand group-hover:text-primary-foreground">
              <m.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-display font-semibold">{m.title}</h3>
            <p className="text-xs text-muted-foreground">{m.desc}</p>
          </motion.button>
        ))}
      </div>

      <h3 className="mb-3 font-display text-lg font-semibold">Saved signatures</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {signatures.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-elegant"
          >
            <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border bg-muted/40">
              <span className="text-3xl italic" style={{ fontFamily: s.font === "serif" ? "Georgia, serif" : "'Segoe Script', cursive" }}>
                Alex Rivera
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  {s.name}
                  {s.isDefault && <Star className="h-3.5 w-3.5 fill-warning text-warning" />}
                </p>
                <p className="text-xs text-muted-foreground">{s.type}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon"><Star className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}
