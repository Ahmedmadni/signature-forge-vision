import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, delta, trend = "up", icon: Icon, index = 0,
}: {
  label: string; value: string; delta?: string; trend?: "up" | "down"; icon: LucideIcon; index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-elegant"
    >
      <div className="absolute inset-0 bg-gradient-glow opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {delta && (
        <div className="relative mt-4 flex items-center gap-1.5 text-xs">
          <span className={cn("flex items-center gap-0.5 font-semibold", trend === "up" ? "text-success" : "text-destructive")}>
            {trend === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {delta}
          </span>
          <span className="text-muted-foreground">vs last week</span>
        </div>
      )}
    </motion.div>
  );
}
