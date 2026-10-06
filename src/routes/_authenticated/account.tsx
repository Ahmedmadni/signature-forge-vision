import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { LogOut, Moon, Sun, Mail, Settings2, ChevronLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/use-auth";
import { useUsage } from "@/lib/usage";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { getWaqqiAppInfo, type WaqqiAppInfo } from "@/lib/app-info";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "حسابي — وقِّع" },
      { name: "description", content: "أدر حسابك وحصتك اليومية وإعدادات تطبيق وقِّع." },
      { property: "og:title", content: "حسابي — وقِّع" },
      { property: "og:description", content: "أدر حسابك وحصتك اليومية وإعدادات تطبيق وقِّع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const usage = useUsage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [appInfo, setAppInfo] = useState<WaqqiAppInfo | null>(null);

  useEffect(() => {
    let active = true;
    void getWaqqiAppInfo().then((info) => {
      if (active) setAppInfo(info);
    });
    return () => {
      active = false;
    };
  }, []);

  const used = usage.data?.pages_used ?? 0;
  const limit = usage.data?.daily_limit ?? 3;
  const unlimited = usage.data?.unlimited ?? false;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">حسابي</h1>
      </header>

      <section className="space-y-3 rounded-3xl border border-border bg-card/60 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand text-primary-foreground">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {authLoading ? "جارٍ معرفة حالة الحساب…" : user?.email ?? "أنت تستخدم وقِّع كضيف"}
            </p>
            <p className="text-xs text-muted-foreground">
              {user ? (unlimited ? "استخدام غير محدود" : "الحساب المجاني") : "لا تحتاج حسابًا للمسح والتوقيع والحفظ"}
            </p>
          </div>
        </div>
        {!authLoading && !user && (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              توقيعات الضيف محفوظة محليًا على هذا الجهاز فقط، ولا تُزامَن مع حسابك تلقائيًا. لا تحذف بيانات التطبيق إذا أردت الاحتفاظ بها.
            </p>
            <Button asChild className="w-full bg-gradient-brand text-primary-foreground shadow-glow">
              <Link to="/auth">تسجيل الدخول أو إنشاء حساب (اختياري)</Link>
            </Button>
          </>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card/60 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{user ? "الاستخدام اليوم" : "الاستخدام اليوم على هذا الجهاز"}</h2>
          <span className="text-xs text-muted-foreground">
            {unlimited ? "غير محدود" : `${used} / ${limit} صفحات`}
          </span>
        </div>
        <Progress className="mt-3" value={unlimited ? 100 : Math.min((used / limit) * 100, 100)} />
      </section>

      <section className="rounded-3xl border border-border bg-card/60 p-2">
        <Link
          to="/settings"
          className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm hover:bg-muted/60"
        >
          <span className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            إعدادات المسح الضوئي
          </span>
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
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
        {user && (
          <>
            <Link
              to="/delete-account"
              className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm text-destructive hover:bg-muted/60"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                حذف الحساب
              </span>
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/home" });
              }}
              className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm text-destructive hover:bg-muted/60"
            >
              <LogOut className="h-4 w-4" /> تسجيل الخروج والاستمرار كضيف
            </button>
          </>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card/60 p-2">
        <Link
          to="/privacy"
          className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm hover:bg-muted/60"
        >
          <span>سياسة الخصوصية</span>
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/terms"
          className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm hover:bg-muted/60"
        >
          <span>الشروط والأحكام</span>
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        {appInfo?.native && (
          <div className="flex items-center justify-between px-3 py-3 text-xs text-muted-foreground">
            <span>إصدار التطبيق</span>
            <span className="tabular-nums">
              {appInfo.version ?? "غير متاح"}{appInfo.build ? ` (${appInfo.build})` : ""}
            </span>
          </div>
        )}
      </section>

    </div>
  );
}
