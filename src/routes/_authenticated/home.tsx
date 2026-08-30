import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileUp, PenLine, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PdfSignWorkspace } from "@/components/app/PdfSignWorkspace";
import { SignatureCapture } from "@/components/app/SignatureCapture";
import { useDefaultSignature, saveSignature, useInvalidateSignatures } from "@/lib/signatures";
import { useUsage } from "@/lib/usage";
import { toast } from "sonner";
import { playSfx, haptic } from "@/lib/sfx";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "وقِّع — توقيع ملفات PDF في ثوانٍ" },
      { name: "description", content: "ارفع ملف PDF، ضع توقيعك بإصبعك، واحفظ المستند الموقّع مباشرة على جهازك." },
      { property: "og:title", content: "وقِّع — توقيع ملفات PDF في ثوانٍ" },
      { property: "og:description", content: "ارفع ملف PDF، ضع توقيعك بإصبعك، واحفظ المستند الموقّع مباشرة على جهازك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const { signature } = useDefaultSignature();
  const invalidateSignatures = useInvalidateSignatures();
  const usage = useUsage();

  const used = usage.data?.pages_used ?? 0;
  const limit = usage.data?.daily_limit ?? 3;
  const unlimited = usage.data?.unlimited ?? false;

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("اختر ملف PDF فقط");
      return;
    }
    setFile(f);
  };

  if (file) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="truncate font-display text-base font-semibold">{file.name}</h1>
          <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
            إلغاء
          </Button>
        </div>
        <PdfSignWorkspace
          file={file}
          signature={signature?.data_url ?? null}
          onRequestSignature={() => setSheet(true)}
          onDone={() => setFile(null)}
        />
        <SignatureDialog
          open={sheet}
          saving={saving}
          onOpenChange={setSheet}
          onSave={async (dataUrl, type) => {
            setSaving(true);
            try {
              await saveSignature({ dataUrl, name: "توقيعي", type });
              invalidateSignatures();
              setSheet(false);
              playSfx("success");
              toast.success("تم حفظ التوقيع");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "تعذّر حفظ التوقيع");
            } finally {
              setSaving(false);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">وقّع مستندك</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ارفع ملف PDF، ضع توقيعك، واحفظه على جهازك — بدون تعقيد.
        </p>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      <button
        onClick={() => {
          playSfx("tap");
          haptic();
          inputRef.current?.click();
        }}
        className="press sheen group flex w-full flex-col items-center gap-3 rounded-3xl border border-dashed border-primary/40 bg-gradient-to-b from-primary/10 to-transparent px-6 py-10 text-center hover:border-primary hover:shadow-glow"
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand shadow-glow">
          <FileUp className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="font-display text-lg font-semibold">اختر ملف PDF</span>
        <span className="text-xs text-muted-foreground">الملف يُعالج على جهازك ولا يُرفع إلى أي خادم</span>
      </button>

      <section className="rise-in rounded-3xl border border-border bg-card/60 p-4 shadow-elegant">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">حصتك اليومية</h2>
          <span className="text-xs text-muted-foreground">
            {unlimited ? "غير محدودة" : `${used} / ${limit} صفحات`}
          </span>
        </div>
        <Progress className="mt-3" value={unlimited ? 100 : Math.min((used / limit) * 100, 100)} />
        <p className="mt-2 text-xs text-muted-foreground">
          {unlimited
            ? "أنت على الخطة المميزة — وقّع بلا حدود."
            : "تتجدد الحصة المجانية تلقائيًا كل يوم."}
        </p>
      </section>

      <section className="rise-in rounded-3xl border border-border bg-card/60 p-4 shadow-elegant">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted">
              <PenLine className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">توقيعي</p>
              <p className="text-xs text-muted-foreground">
                {signature ? "جاهز للاستخدام" : "لم تنشئ توقيعًا بعد"}
              </p>
            </div>
          </div>
          {signature?.data_url ? (
            <img src={signature.data_url} alt="التوقيع الافتراضي" className="h-10 max-w-24 object-contain" />
          ) : (
            <Button size="sm" variant="outline" onClick={() => setSheet(true)}>
              إنشاء <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: ShieldCheck, title: "خصوصية كاملة", text: "التوقيع يتم محليًا على جهازك" },
          { icon: Zap, title: "سريع", text: "وقّع مستندك في أقل من دقيقة" },
        ].map((f) => (
          <div key={f.title} className="press rounded-2xl border border-border bg-card/60 p-3 hover:border-primary/50">
            <f.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-medium">{f.title}</p>
            <p className="text-xs text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </div>

      <SignatureDialog
        open={sheet}
        saving={saving}
        onOpenChange={setSheet}
        onSave={async (dataUrl, type) => {
          setSaving(true);
          try {
            await saveSignature({ dataUrl, name: "توقيعي", type });
            invalidateSignatures();
            setSheet(false);
            playSfx("success");
              toast.success("تم حفظ التوقيع");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "تعذّر حفظ التوقيع");
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}

function SignatureDialog({
  open,
  saving,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  saving: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (dataUrl: string, type: "drawn" | "typed" | "uploaded") => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إنشاء توقيعك</DialogTitle>
        </DialogHeader>
        <SignatureCapture saving={saving} onConfirm={onSave} />
      </DialogContent>
    </Dialog>
  );
}
