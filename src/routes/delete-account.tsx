import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeveloperFooter } from "@/components/app/DeveloperFooter";

const SUPPORT_EMAIL = "elmadnim@gmail.com";
const subject = encodeURIComponent("طلب حذف حساب وقِّع");
const body = encodeURIComponent(
  "أطلب حذف حسابي في تطبيق وقِّع والبيانات المرتبطة به.\n\nالبريد المستخدم في الحساب: ",
);

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "حذف الحساب — وقِّع" },
      {
        name: "description",
        content: "طلب حذف حساب وقِّع والبيانات السحابية المرتبطة به.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8">
      <Link to="/account" className="text-sm text-primary hover:underline">
        العودة إلى حسابي
      </Link>

      <div className="mt-5 rounded-3xl border border-border bg-card/60 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold">طلب حذف الحساب</h1>
            <p className="text-xs text-muted-foreground">وقِّع</p>
          </div>
        </div>

        <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            لطلب حذف حسابك والبيانات السحابية المرتبطة به، أرسل الطلب من البريد المستخدم في الحساب
            حتى يمكن التحقق من ملكيتك له.
          </p>
          <p>
            يشمل الطلب بيانات الحساب والتوقيعات المرتبطة بالحساب والبيانات السحابية التي يمكن ربطها
            به، مع مراعاة أي بيانات يلزم الاحتفاظ بها إذا فرض القانون ذلك.
          </p>
          <p>
            الملفات التي حفظتها على جهازك، وتوقيعات وضع الضيف المخزنة محليًا، لا يمكن حذفها عن بُعد.
            يمكنك إزالتها من جهازك أو حذف بيانات التطبيق.
          </p>
        </div>

        <Button asChild className="mt-5 w-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
          <a href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`}>
            <Mail className="h-4 w-4" />
            إرسال طلب حذف الحساب
          </a>
        </Button>

        <p className="mt-3 break-all text-center text-xs text-muted-foreground">{SUPPORT_EMAIL}</p>
      </div>

      <DeveloperFooter className="mt-8" />
    </div>
  );
}
