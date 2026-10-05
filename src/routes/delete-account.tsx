import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeveloperFooter } from "@/components/app/DeveloperFooter";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SUPPORT_EMAIL = "elmadnim@gmail.com";
const subject = encodeURIComponent("مساعدة في حذف حساب وقِّع");
const body = encodeURIComponent(
  "أحتاج مساعدة بخصوص حذف حسابي في تطبيق وقِّع.\n\nالبريد المستخدم في الحساب: ",
);

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "حذف الحساب — وقِّع" },
      {
        name: "description",
        content: "حذف حساب وقِّع والبيانات السحابية المرتبطة به نهائيًا.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [armed, setArmed] = useState(false);

  const removeAccount = async () => {
    if (!user || deleting || !armed) return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_own_account" as never);
      if (error) throw error;
      await supabase.auth.signOut({ scope: "local" });
      toast.success("تم حذف الحساب وبياناته السحابية نهائيًا");
      navigate({ to: "/home" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر حذف الحساب");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8">
      <Link to={user ? "/account" : "/"} className="text-sm text-primary hover:underline">
        {user ? "العودة إلى حسابي" : "العودة إلى وقِّع"}
      </Link>

      <div className="mt-5 rounded-3xl border border-border bg-card/60 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold">حذف الحساب</h1>
            <p className="text-xs text-muted-foreground">وقِّع</p>
          </div>
        </div>

        <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            حذف الحساب نهائي. عند التأكيد تُحذف هوية الحساب وبياناته التابعة على الخادم، بما في ذلك
            الملف الشخصي والتوقيعات السحابية وسجل الاستخدام والاستحقاقات المرتبطة به.
          </p>
          <p>
            المستندات التي حفظتها على جهازك وتوقيعات وضع الضيف المحلية لا تُحذف عن بُعد. يمكنك
            حذفها بنفسك من الجهاز أو من بيانات التطبيق.
          </p>
        </div>

        {loading ? (
          <div className="mt-5 flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جارٍ التحقق من الحساب…
          </div>
        ) : user ? (
          <div className="mt-5 space-y-3">
            <label className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <input
                type="checkbox"
                checked={armed}
                onChange={(event) => setArmed(event.target.checked)}
                disabled={deleting}
                className="mt-1"
              />
              <span>أفهم أن حذف الحساب نهائي ولا يمكن التراجع عنه.</span>
            </label>
            <Button
              type="button"
              disabled={!armed || deleting}
              onClick={() => void removeAccount()}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              حذف حسابي نهائيًا
            </Button>
            <p className="text-center text-xs text-muted-foreground">{user.email}</p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              إذا كان لديك حساب، سجّل الدخول أولًا حتى نتحقق من هويتك ونسمح لك بحذف حسابك مباشرة.
            </p>
            <Button asChild className="w-full bg-gradient-brand text-primary-foreground shadow-glow">
              <Link to="/auth">
                <LogIn className="h-4 w-4" />
                تسجيل الدخول لحذف الحساب
              </Link>
            </Button>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            إذا تعذّر تسجيل الدخول أو واجهت مشكلة في الحذف، يمكنك التواصل معنا من البريد المستخدم في الحساب.
          </p>
          <Button asChild variant="outline" className="mt-3 w-full">
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`}>
              <Mail className="h-4 w-4" />
              طلب مساعدة في حذف الحساب
            </a>
          </Button>
          <p className="mt-2 break-all text-center text-[11px] text-muted-foreground">{SUPPORT_EMAIL}</p>
        </div>
      </div>

      <DeveloperFooter className="mt-8" />
    </div>
  );
}
