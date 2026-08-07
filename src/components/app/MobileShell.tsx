import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, PenLine, User, Signature } from "lucide-react";
import { DeveloperFooter } from "./DeveloperFooter";

const nav = [
  { to: "/home", label: "الرئيسية", icon: Home },
  { to: "/signature", label: "توقيعي", icon: PenLine },
  { to: "/account", label: "حسابي", icon: User },
] as const;

export function MobileShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2.5 px-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand shadow-glow">
            <Signature className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold">وقِّع</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-4">{children}</main>

      <div className="mx-auto w-full max-w-2xl pb-24">
        <DeveloperFooter />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto grid w-full max-w-2xl grid-cols-3">
          {nav.map((item) => {
            const active = path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
