import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Crown, Moon, Sun, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/use-auth";
import { useUsage } from "@/lib/usage";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Paywall } from "@/components/app/Paywall";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "حسابي — وقِّع" },
      { name: "description", content: "أدر حسابك وحصتك اليومية وخطة الاشتراك في تطبيق وقِّع لتوقيع ملفات PDF." },
      { property: "og:title", content: "حسابي — وقِّع" },
      { property: "og:description", content: "أدر حسابك وحصتك اليومية وخطة الاشتراك في تطبيق وقِّع لتوقيع ملفات PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const usage = useUsage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [paywall, setPaywall] = useState(false);

  const used = usage.data?.pages_used ?? 0;
  const limit = usage.data?.daily_limit ?? 3;
  const unlimited = usage.data?.unlimited ?? false;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">حسابي</h1>
      </header>

      <section className="flex items-center gap-3 rounded-3xl border border-border bg-card/60 p-4">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand text-primary-foreground">
          <Mail className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user?.email ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            {unlimited ? "الخطة المميزة" : "الخطة المجانية"}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card/60 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">الاستخدام اليوم</h2>
          <span className="text-xs text-muted-foreground">
            {unlimited ? "غير محدود" : `${used} / ${limit} صفحات`}
          </span>
        </div>
        <Progress className="mt-3" value={unlimited ? 100 : Math.min((used / limit) * 100, 100)} />
        {!unlimited && (
          <Button
            className="mt-4 w-full bg-gradient-brand text-primary-foreground shadow-glow"
            onClick={() => setPaywall(true)}
          >
            <Crown className="h-4 w-4" /> الترقية للخطة المميزة
          </Button>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card/60 p-2">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm hover:bg-muted/60"
        >
          <span className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            المظهر
          </span>
          <span className="text-xs text-muted-foreground">{theme === "dark" ? "داكن" : "فاتح"}</span>
        </button>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
          className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm text-destructive hover:bg-muted/60"
        >
          <LogOut className="h-4 w-4" /> تسجيل الخروج
        </button>
      </section>

      <Paywall open={paywall} onClose={() => setPaywall(false)} used={used} limit={limit} />
    </div>
  );
}
