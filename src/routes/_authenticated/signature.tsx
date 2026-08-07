import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Star, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignatureCapture } from "@/components/app/SignatureCapture";
import {
  useSignatures,
  saveSignature,
  setDefaultSignature,
  deleteSignature,
  useInvalidateSignatures,
} from "@/lib/signatures";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/signature")({
  head: () => ({
    meta: [
      { title: "توقيعي — وقِّع" },
      { name: "description", content: "أنشئ توقيعك بالرسم أو الكتابة أو رفع صورة، واحفظه لاستخدامه في كل مستنداتك." },
      { property: "og:title", content: "توقيعي — وقِّع" },
      { property: "og:description", content: "أنشئ توقيعك بالرسم أو الكتابة أو رفع صورة، واحفظه لاستخدامه في كل مستنداتك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignaturePage,
});

function SignaturePage() {
  const { data, isLoading } = useSignatures();
  const invalidate = useInvalidateSignatures();
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">توقيعي</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          أنشئ توقيعك مرة واحدة واستخدمه في كل مستنداتك.
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card/60 p-4">
        <SignatureCapture
          saving={saving}
          onConfirm={async (dataUrl, type) => {
            setSaving(true);
            try {
              await saveSignature({ dataUrl, name: "توقيعي", type });
              invalidate();
              toast.success("تم حفظ التوقيع");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "تعذّر حفظ التوقيع");
            } finally {
              setSaving(false);
            }
          }}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">التوقيعات المحفوظة</h2>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {!isLoading && !data?.length && (
          <p className="text-sm text-muted-foreground">لا توجد توقيعات محفوظة بعد.</p>
        )}
        {data?.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              {s.data_url && (
                <img src={s.data_url} alt={s.name} className="h-10 w-24 shrink-0 object-contain" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.name}</p>
                {s.is_default && <p className="text-xs text-primary">الافتراضي</p>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {!s.is_default && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    await setDefaultSignature(s.id);
                    invalidate();
                  }}
                >
                  <Star className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await deleteSignature(s.id);
                  invalidate();
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
