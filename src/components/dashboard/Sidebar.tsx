import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard, FileText, LayoutTemplate, PenTool, Users,
  ShieldCheck, ScrollText, BarChart3, Settings, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { section: "Workspace", items: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/documents", label: "Documents", icon: FileText },
    { to: "/templates", label: "Templates", icon: LayoutTemplate },
    { to: "/signatures", label: "Signatures", icon: PenTool },
  ]},
  { section: "Organization", items: [
    { to: "/teams", label: "Teams", icon: Users },
    { to: "/certificates", label: "Certificates", icon: ShieldCheck },
    { to: "/audit", label: "Audit Logs", icon: ScrollText },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
  ]},
  { section: "Account", items: [
    { to: "/settings", label: "Settings", icon: Settings },
  ]},
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="flex h-full w-[260px] flex-col bg-sidebar border-r border-sidebar-border">
      <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-6 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand shadow-glow">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <div className="font-display text-lg font-semibold tracking-tight">SignForge</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Enterprise eSign</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {nav.map((group) => (
          <div key={group.section} className="mb-5">
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {group.section}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-xl bg-gradient-brand shadow-glow"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <item.icon className="relative z-10 h-[18px] w-[18px]" />
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="m-3 rounded-2xl border border-sidebar-border bg-gradient-glow p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-accent" /> AI Assist
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Auto-detect fields & suggest signature placement.</p>
      </div>
    </aside>
  );
}
