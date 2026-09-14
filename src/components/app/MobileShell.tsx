import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, PenLine, User, Signature, ScanLine } from "lucide-react";
import { DeveloperFooter } from "./DeveloperFooter";
import { SoundToggle } from "./SoundToggle";
import { haptic, playSfx } from "@/lib/sfx";

const nav = [
  { to: "/home", label: "الرئيسية", icon: Home },
  { to: "/scan", label: "الماسح", icon: ScanLine },
  { to: "/signature", label: "توقيعي", icon: PenLine },
  { to: "/account", label: "حسابي", icon: User },
] as const;

export function MobileShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ backgroundImage: "var(--gradient-glow)" }}
      />
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2.5 px-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand shadow-glow">
            <Signature className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">وقِّع</span>
          <div className="ms-auto">
            <SoundToggle />
          </div>
        </div>
      </header>

      <main key={path} className="rise-in mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-4">
        {children}
      </main>

      <div className="mx-auto w-full max-w-2xl pb-24">
        <DeveloperFooter />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-2xl grid-cols-4">
          {nav.map((item) => {
            const active = path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => {
                  playSfx("tap");
                  haptic();
                }}
                className={`press relative flex flex-col items-center gap-1 py-3 text-[11px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-gradient-brand" aria-hidden />
                )}
                <item.icon className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
