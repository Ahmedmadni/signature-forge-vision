import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { isAndroidNativeAuth, NATIVE_AUTH_REDIRECT, startNativeGoogleSignIn } from "@/lib/native-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "تسجيل الدخول — وقِّع" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: isAndroidNativeAuth() ? NATIVE_AUTH_REDIRECT : window.location.origin,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("تم إنشاء الحساب. تحقق من بريدك لتفعيل الحساب ثم عُد للتطبيق.");
        } else {
          toast.success("تم إنشاء الحساب — مرحبًا بك في وقِّع!");
          navigate({ to: "/home" });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("مرحبًا بعودتك!");
        navigate({ to: "/home" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (isAndroidNativeAuth()) {
        await startNativeGoogleSignIn();
        // Browser opens Google's authentication page; appUrlOpen completes the PKCE exchange.
        return;
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (!result.redirected) navigate({ to: "/home" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تسجيل الدخول بجوجل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-glow" />
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative w-full max-w-md rounded-3xl border border-border glass p-8 shadow-elegant"
      >
        <Link to="/" className="mb-6 flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold">وقِّع</span>
        </Link>

        <div className="mb-4 rounded-xl border border-border bg-muted/40 p-3 text-center">
          <p className="text-xs text-muted-foreground">يمكنك استخدام التطبيق بالكامل كضيف. تسجيل الدخول اختياري.</p>
          <Button asChild variant="outline" size="sm" className="mt-2 w-full">
            <Link to="/home">الدخول للتطبيق بدون حساب</Link>
          </Button>
        </div>

        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "مرحبًا بعودتك" : "أنشئ حسابك"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? "سجّل الدخول إلى تطبيق وقِّع." : "ابدأ توقيع المستندات في ثوانٍ."}
        </p>

        <Button variant="outline" disabled={loading} onClick={() => void google()} className="mt-6 w-full" type="button">
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M12 11v2.8h4c-.2 1.1-1.4 3.2-4 3.2-2.4 0-4.4-2-4.4-4.5S9.6 8 12 8c1.4 0 2.3.6 2.8 1.1l1.9-1.8C15.5 6.2 13.9 5.5 12 5.5 8.4 5.5 5.5 8.4 5.5 12s2.9 6.5 6.5 6.5c3.8 0 6.3-2.6 6.3-6.4 0-.4 0-.7-.1-1.1H12z"/></svg>
          المتابعة عبر جوجل
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> أو <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="أليكس ريفيرا" required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pr-9" placeholder="you@company.com" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-9" placeholder="••••••••" required minLength={6} />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-brand text-primary-foreground shadow-glow">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "جديد على وقِّع؟ " : "لديك حساب بالفعل؟ "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-medium text-primary hover:underline"
          >
            {mode === "signin" ? "أنشئ حسابًا" : "تسجيل الدخول"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
