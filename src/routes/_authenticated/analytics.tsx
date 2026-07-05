import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FileText, CheckCircle2, Clock, TrendingDown } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { activityData, statusBreakdown, turnaroundData } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — SignForge" }] }),
  component: Analytics,
});

const tooltip = { background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, color: "var(--color-popover-foreground)" };

function Analytics() {
  return (
    <>
      <PageHeader title="Analytics" subtitle="Insights into signing performance and completion rates." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Completion rate" value="94.2%" delta="3.1%" icon={CheckCircle2} index={0} />
        <StatCard label="Avg. turnaround" value="11h" delta="18%" icon={Clock} index={1} />
        <StatCard label="Sent this month" value="1,842" delta="9.4%" icon={FileText} index={2} />
        <StatCard label="Decline rate" value="2.8%" delta="0.6%" trend="down" icon={TrendingDown} index={3} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 shadow-elegant lg:col-span-2">
          <h3 className="mb-4 font-display text-lg font-semibold">Weekly throughput</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltip} cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sent" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="signed" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="completed" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
          <h3 className="mb-4 font-display text-lg font-semibold">Status breakdown</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                  {statusBreakdown.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-elegant">
        <h3 className="mb-4 font-display text-lg font-semibold">Avg. turnaround time (hours)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={turnaroundData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltip} />
              <Line type="monotone" dataKey="hours" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-primary)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </>
  );
}
