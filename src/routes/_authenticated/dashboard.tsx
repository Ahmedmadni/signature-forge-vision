import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FileText, Clock, CheckCircle2, Users, Upload, PenTool, ArrowRight } from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { documents, activityData, auditLogs } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Overview — SignForge" }] }),
  component: Overview,
});

function Overview() {
  return (
    <>
      <PageHeader
        title="Welcome back"
        subtitle="Here's what's happening across your signing workspace."
        actions={
          <>
            <Button variant="outline"><Upload className="h-4 w-4" /> Upload</Button>
            <Button className="bg-gradient-brand text-primary-foreground shadow-glow"><PenTool className="h-4 w-4" /> New signature request</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Documents" value="1,284" delta="12.4%" icon={FileText} index={0} />
        <StatCard label="Awaiting Signature" value="47" delta="8.1%" trend="down" icon={Clock} index={1} />
        <StatCard label="Completed" value="932" delta="5.2%" icon={CheckCircle2} index={2} />
        <StatCard label="Team Members" value="18" delta="2" icon={Users} index={3} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-elegant lg:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Signing activity</h3>
            <span className="text-xs text-muted-foreground">Last 7 days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, color: "var(--color-popover-foreground)" }}
                />
                <Area type="monotone" dataKey="sent" stroke="var(--color-primary)" strokeWidth={2} fill="url(#gSent)" />
                <Area type="monotone" dataKey="completed" stroke="var(--color-accent)" strokeWidth={2} fill="url(#gDone)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-elegant"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Recent activity</h3>
            <Link to="/audit" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-4">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gradient-brand" />
                <div className="min-w-0">
                  <p className="truncate text-sm"><span className="font-medium">{log.actor}</span> {log.action.toLowerCase()}</p>
                  <p className="truncate text-xs text-muted-foreground">{log.target} · {log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="mt-6 rounded-2xl border border-border bg-card shadow-elegant"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="font-display text-lg font-semibold">Recent documents</h3>
          <Button variant="ghost" size="sm" asChild><Link to="/documents">All documents <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        <div className="divide-y divide-border border-t border-border">
          {documents.slice(0, 5).map((doc) => (
            <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                <p className="text-xs text-muted-foreground">{doc.type} · {doc.pages} pages · {doc.updated}</p>
              </div>
              <StatusBadge status={doc.status} />
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}
