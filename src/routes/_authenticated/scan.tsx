import { useCallback, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Camera,
  ImagePlus,
  Loader2,
  RotateCw,
  Trash2,
  Download,
  PenLine,
  Check,
  ScanLine,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/app/CameraCapture";
import { ScanCropper } from "@/components/app/ScanCropper";
import {
  buildScannedPdf,
  defaultQuad,
  detectDocument,
  loadImage,
  renderPage,
  type Quad,
  type ScanFilter,
} from "@/lib/scan";
import { saveFile } from "@/lib/save-file";
import { setPendingFile } from "@/lib/pending-file";
import { toast } from "sonner";
import { playSfx, haptic } from "@/lib/sfx";

export const Route = createFileRoute("/_authenticated/scan")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "الماسح الضوئي — وقِّع" },
      {
        name: "description",
        content: "صوّر أوراقك بالكاميرا، والتطبيق يحدّد حدود الورقة تلقائيًا ويحسّن الجودة ويحفظها PDF عالي الدقة.",
      },
      { property: "og:title", content: "الماسح الضوئي — وقِّع" },
      {
        property: "og:description",
        content: "حوّل أي ورقة إلى ملف PDF واضح بكاميرا هاتفك، مع كشف تلقائي للحواف وتحسين للجودة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPage,
});

interface Draft {
  image: CanvasImageSource;
  width: number;
  height: number;
  quad: Quad;
  filter: ScanFilter;
  rotation: 0 | 90 | 180 | 270;
}

interface Page {
  id: string;
  canvas: HTMLCanvasElement;
  preview: string;
}

const filters: { key: ScanFilter; label: string }[] = [
  { key: "enhanced", label: "تحسين تلقائي" },
  { key: "color", label: "ألوان" },
  { key: "bw", label: "أبيض وأسود" },
];

function ScanPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [saving, setSaving] = useState(false);

  const ingest = useCallback(async (blob: Blob) => {
    setBusy("جارٍ تحليل الصورة…");
    try {
      const img = await loadImage(blob);
      const width = "width" in img ? (img.width as number) : 0;
      const height = "height" in img ? (img.height as number) : 0;
      const quad = detectDocument(img as CanvasImageSource, width, height);
      setDraft({ image: img as CanvasImageSource, width, height, quad, filter: "enhanced", rotation: 0 });
      playSfx("place");
    } catch {
      toast.error("تعذّرت قراءة الصورة");
    } finally {
      setBusy(null);
    }
  }, []);

  const confirmDraft = async () => {
    if (!draft) return;
    setBusy("جارٍ تحسين الصفحة…");
    try {
      await new Promise((r) => setTimeout(r, 30));
      const canvas = renderPage(draft.image, draft.width, draft.height, draft.quad, draft.filter, draft.rotation);
      setPages((p) => [...p, { id: crypto.randomUUID(), canvas, preview: canvas.toDataURL("image/jpeg", 0.7) }]);
      setDraft(null);
      playSfx("success");
      haptic();
    } catch {
      toast.error("تعذّرت معالجة الصفحة");
    } finally {
      setBusy(null);
    }
  };

  const makePdf = async () => {
    const bytes = await buildScannedPdf(pages.map((p) => p.canvas));
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    return new Blob([copy.buffer], { type: "application/pdf" });
  };

  const savePdf = async () => {
    if (!pages.length) return;
    setSaving(true);
    try {
      const blob = await makePdf();
      await saveFile(blob, `مسح-${new Date().toISOString().slice(0, 10)}.pdf`);
      playSfx("success");
      haptic(24);
      toast.success("تم حفظ الملف بصيغة PDF");
    } catch (e) {
      playSfx("error");
      toast.error(e instanceof Error ? e.message : "تعذّر حفظ الملف");
    } finally {
      setSaving(false);
    }
  };

  const signNow = async () => {
    if (!pages.length) return;
    setSaving(true);
    try {
      const blob = await makePdf();
      const name = `مسح-${new Date().toISOString().slice(0, 10)}.pdf`;
      setPendingFile(new File([blob], name, { type: "application/pdf" }));
      playSfx("tap");
      navigate({ to: "/home" });
    } catch {
      toast.error("تعذّر تجهيز الملف للتوقيع");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- محرّر الصفحة الملتقطة ---------------- */
  if (draft) {
    return (
      <div className="space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-lg font-semibold">اضبط حدود الورقة</h1>
          <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
            إلغاء
          </Button>
        </header>

        <ScanCropper
          image={draft.image}
          imageWidth={draft.width}
          imageHeight={draft.height}
          quad={draft.quad}
          onChange={(quad) => setDraft((d) => (d ? { ...d, quad } : d))}
        />

        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={draft.filter === f.key ? "default" : "outline"}
              onClick={() => setDraft((d) => (d ? { ...d, filter: f.key } : d))}
            >
              {f.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setDraft((d) => (d ? { ...d, rotation: (((d.rotation + 90) % 360) as 0 | 90 | 180 | 270) } : d))
            }
          >
            <RotateCw className="h-4 w-4" /> تدوير
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setDraft((d) =>
                d ? { ...d, quad: detectDocument(d.image, d.width, d.height) } : d,
              )
            }
          >
            <Wand2 className="h-4 w-4" /> كشف تلقائي
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDraft((d) => (d ? { ...d, quad: defaultQuad(d.width, d.height) } : d))}
          >
            الصورة كاملة
          </Button>
        </div>

        <Button
          onClick={confirmDraft}
          disabled={busy !== null}
          size="lg"
          className="press sheen w-full bg-gradient-brand text-primary-foreground shadow-glow"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ?? "إضافة الصفحة"}
        </Button>
      </div>
    );
  }

  /* ---------------- الشاشة الرئيسية للماسح ---------------- */
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">الماسح الضوئي</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          صوّر ورقتك، ونحدّد حدودها تلقائيًا ونحسّن وضوحها ثم نحفظها PDF عالي الدقة.
        </p>
      </header>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.currentTarget.value = "";
          for (const f of files) await ingest(f);
        }}
      />

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            playSfx("tap");
            haptic();
            setCamera(true);
          }}
          className="press sheen flex flex-col items-center gap-2 rounded-3xl border border-dashed border-primary/40 bg-gradient-to-b from-primary/10 to-transparent px-4 py-8 hover:border-primary hover:shadow-glow"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-brand shadow-glow">
            <Camera className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-sm font-semibold">تصوير بالكاميرا</span>
        </button>

        <button
          onClick={() => {
            playSfx("tap");
            fileRef.current?.click();
          }}
          className="press flex flex-col items-center gap-2 rounded-3xl border border-border bg-card/60 px-4 py-8 hover:border-primary/50"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted">
            <ImagePlus className="h-5 w-5 text-primary" />
          </div>
          <span className="font-display text-sm font-semibold">من الصور</span>
        </button>
      </div>

      {busy && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> {busy}
        </div>
      )}

      {pages.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card/60 p-6 text-center shadow-elegant">
          <ScanLine className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 text-sm font-medium">لا توجد صفحات بعد</p>
          <p className="text-xs text-muted-foreground">
            التقط أول صفحة للبدء — كل المعالجة تتم على جهازك دون رفع أي ملف.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">الصفحات ({pages.length})</h2>
          <div className="grid grid-cols-3 gap-3">
            {pages.map((p, i) => (
              <div key={p.id} className="relative overflow-hidden rounded-2xl border border-border bg-card">
                <img src={p.preview} alt={`صفحة ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
                <span className="absolute start-1 top-1 rounded-md bg-background/80 px-1.5 text-[11px]">
                  {i + 1}
                </span>
                <button
                  aria-label="حذف الصفحة"
                  onClick={() => setPages((l) => l.filter((x) => x.id !== p.id))}
                  className="absolute end-1 top-1 grid h-7 w-7 place-items-center rounded-md bg-background/80"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid gap-2">
            <Button
              onClick={savePdf}
              disabled={saving}
              size="lg"
              className="press sheen w-full bg-gradient-brand text-primary-foreground shadow-glow"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              حفظ بصيغة PDF
            </Button>
            <Button onClick={signNow} disabled={saving} variant="outline" size="lg" className="w-full">
              <PenLine className="h-4 w-4" /> توقيع المستند الآن
            </Button>
          </div>
        </section>
      )}

      <CameraCapture
        open={camera}
        onClose={() => setCamera(false)}
        onCapture={async (blob) => {
          setCamera(false);
          await ingest(blob);
        }}
      />
    </div>
  );
}
