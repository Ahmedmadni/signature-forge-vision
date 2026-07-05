import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { UserPlus, MoreVertical, Mail } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { team } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/teams")({
  head: () => ({ meta: [{ title: "Teams — SignForge" }] }),
  component: Teams,
});

const roleClass: Record<string, string> = {
  Admin: "bg-primary/15 text-primary",
  Manager: "bg-accent/15 text-accent",
  Member: "bg-muted text-muted-foreground",
};

function Teams() {
  return (
    <>
      <PageHeader
        title="Teams"
        subtitle="Manage members, roles, and access across your organization."
        actions={<Button className="bg-gradient-brand text-primary-foreground shadow-glow"><UserPlus className="h-4 w-4" /> Invite member</Button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Members" value="18" icon={Users} index={0} />
        <StatCard label="Admins" value="3" icon={ShieldCheck} index={1} />
        <StatCard label="Pending invites" value="2" icon={Clock} index={2} />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-elegant">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-display text-lg font-semibold">Members</h3>
        </div>
        <div className="divide-y divide-border">
          {team.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
            >
              <Avatar className="h-10 w-10 border border-border">
                <AvatarFallback className="bg-gradient-brand text-xs font-semibold text-primary-foreground">{m.initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", roleClass[m.role])}>{m.role}</span>
              {m.status === "invited" ? (
                <span className="flex items-center gap-1 text-xs text-warning"><Mail className="h-3.5 w-3.5" /> Invited</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Active</span>
              )}
              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
}
