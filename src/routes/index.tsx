import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles, ShieldCheck, PenTool, FileCheck2, ArrowRight,
  Fingerprint, ScanLine, Layers, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  { icon: PenTool, title: "Four ways to sign", desc: "Draw, type with signature fonts, upload an image, or generate one with AI." },
  { icon: ScanLine, title: "AI field detection", desc: "OCR reads your document and auto-places signature, date, and text fields." },
  { icon: Layers, title: "Pro PDF editor", desc: "Zoom to 800%, snap-to-grid, rotate, merge, split, and reorder pages." },
  { icon: ShieldCheck, title: "Enterprise security", desc: "AES-256 encryption, digital certificates, timestamps, and full audit trails." },
  { icon: Fingerprint, title: "Hash verification", desc: "Every document is fingerprinted and tamper-evident from send to signed." },
  { icon: FileCheck2, title: "Smart placement", desc: "Sign single, selected, all, odd, even pages or custom ranges instantly." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold">SignForge</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild><Link to="/auth">Sign in</Link></Button>
          <Button asChild className="bg-gradient-brand text-primary-foreground shadow-glow">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden px-5 pb-24 pt-16 text-center">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-gradient-glow" />
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative mx-auto max-w-3xl"
        >
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border glass px-4 py-1.5 text-xs font-medium">
            <Lock className="h-3.5 w-3.5 text-accent" /> AES-256 · Digital certificates · Audit trail
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            The enterprise way to <span className="text-gradient">sign anything</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Upload, prepare, and sign PDFs and documents with AI assistance, a professional editor,
            and security your legal team will love.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild className="bg-gradient-brand text-primary-foreground shadow-glow">
              <Link to="/auth">Open the dashboard <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild><Link to="/auth">Book a demo</Link></Button>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-elegant"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} SignForge. Enterprise electronic signatures.
      </footer>
    </div>
  );
}
