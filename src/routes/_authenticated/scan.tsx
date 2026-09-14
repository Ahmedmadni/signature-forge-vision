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
  SlidersHorizontal,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/app/CameraCapture";
import { ScanCropper } from "@/components/app/ScanCropper";
import {
  buildScannedPdf,
  defaultQuad,
  loadImage,
  renderPage,
  type Quad,
  type ScanFilter,
} from "@/lib/scan";
import { detectDocumentPrecise } from "@/lib/precise-document-detect";
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
        content: "صوّر عدة صفحات، وسيتم اكتشاف الحدود وقص كل صفحة تلقائيًا ثم حفظها في ملف PDF واحد عالي الدقة.",
      },
    ],
  }),
  component: ScanPage,
});

interface Draft {
  pageId?: string;
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
  source: CanvasImageSource;
  sourceWidth: number;
  sourceHeight: number;
  quad: Quad;
  filter: ScanFilter;
  rotation: 0 | 90 | 180 | 270;
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

  const processBlob = useCallback(async (blob: Blob) => {
    setBusy("جارٍ اكتشاف حدود الصفحة وتحسينها…");
    try {
      const img = await loadImage(blob);
      const width = "width" in img ? Number(img.width) : 0;
      const height = "height" in img ? Number(img.height) : 0;
      if (!width || !height) throw new Error("invalid-image");

      const detection = detectDocumentPrecise(img as CanvasImageSource, width, height);
      const quad = detection?.quad ?? defaultQuad(width, height);
      const filter: ScanFilter = "enhanced";
      const rotation = 0 as const;
      const canvas = renderPage(img as CanvasImageSource, width, height, quad, filter, rotation);
      const page: Page = {
        id: crypto.randomUUID(),
        canvas,
        preview: canvas.toDataURL("image/jpeg", 0.72),
        source: img as CanvasImageSource,
        sourceWidth: width,
        sourceHeight: height,
        quad,
        filter,
        rotation,
      };

      setPages((current) => [...current, page]);
      playSfx("success");
      haptic();
      if (!detection) {
        toast.warning("لم يتم تأكيد الحواف الأربع بدقة. راجع حدود هذه الصفحة من زر التعديل.");
      }
      return page;
    } catch {
      toast.error("تعذّرت معالجة إحدى الصفحات");
      return null;
    } finally {
      setBusy(null);
    }
  }, []);

  const openEditor = (page: Page) => {
    setDraft({
      pageId: page.id,
      image: page.source,
      width: page.sourceWidth,
      height: page.sourceHeight,
      quad: page.quad,
      filter: page.filter,
      rotation: page.rotation,
    });
  };

  const applyDraft = async () => {
    if (!draft) return;
    setBusy("جارٍ تحديث الصفحة…");
    try {
      await new Promise((resolve) => setTimeout(resolve, 20));
      const canvas = renderPage(draft.image, draft.width, draft.height, draft.quad, draft.filter, draft.rotation);
      const next: Page = {
        id: draft.pageId ?? crypto.randomUUID(),
        canvas,
        preview: canvas.toDataURL("image/jpeg", 0.72),
        source: draft.image,
        sourceWidth: draft.width,
        sourceHeight: draft.height,
        quad: draft.quad,
        filter: draft.filter,
        rotation: draft.rotation,
      };

      setPages((current) => {
        if (!draft.pageId) return [...current, next];
        return current.map((page) => (page.id === draft.pageId ? next : page));
      });
      setDraft(null);
      playSfx("success");
      haptic();
    } catch {
      toast.error("تعذّر تحديث الصفحة");
    } finally {
      setBusy(null);
    }
  };

  const rotatePage = (page: Page) => {
    const rotation = (((page.rotation + 90) % 360) as 0 | 90 | 180 | 270);
    const canvas = renderPage(page.source, page.sourceWidth, page.sourceHeight, page.quad, page.filter, rotation);
    setPages((current) =>
      current.map((item) =>
        item.id === page.id
          ? { ...item, rotation, canvas, preview: canvas.toDataURL("image/jpeg", 0.72) }
          : item,
      ),
    );
  };

  const movePage = (index: number, direction: -1 | 1) => {
    setPages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const makePdf = async () => {
    const bytes = await buildScannedPdf(pages.map((page) => page.canvas));
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
      toast.success(`تم حفظ ${pages.length} صفحة في ملف PDF واحد`);
    } catch (error) {
      playSfx("error");
      toast.error(error instanceof Error ? error.message : "تعذّر حفظ الملف");
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

  if (draft) {
    return (
      <div className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-semibold">تعديل حدود الصفحة</h1>
            <p className="text-xs text-muted-foreground">الحدود مكتشفة تلقائيًا. حرّك الزوايا فقط إذا احتجت لتصحيحها.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
            إلغاء
          </Button>
        </header>

        <ScanCropper
          image={draft.image}
          imageWidth={draft.width}
          imageHeight={draft.height}
          quad={draft.quad}
          onChange={(quad) => setDraft((current) => (current ? { ...current, quad } : current))}
        />

        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <Button
              key={filter.key}
              size="sm"
              variant={draft.filter === filter.key ? "default" : "outline"}
              onClick={() => setDraft((current) => (current ? { ...current, filter: filter.key } : current))}
            >
              {filter.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setDraft((current) =>
                current
                  ? { ...current, rotation: (((current.rotation + 90) % 360) as 0 | 90 | 180 | 270) }
                  : current,
              )
            }
          >
            <RotateCw className="h-4 w-4" /> تدوير
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setDraft((current) => {
                if (!current) return current;
                const detection = detectDocumentPrecise(current.image, current.width, current.height);
                if (!detection) {
                  toast.warning("لم يتم العثور على أربع حواف مؤكدة. يمكنك ضبط الزوايا يدويًا.");
                  return current;
                }
                return { ...current, quad: detection.quad };
              })
            }
          >
            <Wand2 className="h-4 w-4" /> إعادة الكشف
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setDraft((current) => (current ? { ...current, quad: defaultQuad(current.width, current.height) } : current))
            }
          >
            الصورة كاملة
          </Button>
        </div>

        <Button
          onClick={applyDraft}
          disabled={busy !== null}
          size="lg"
          className="press sheen w-full bg-gradient-brand text-primary-foreground shadow-glow"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ?? "حفظ التعديل"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">الماسح الضوئي</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          امسح عدة صفحات في جلسة واحدة. يتم اكتشاف الحواف وتصحيح المنظور وتحسين الجودة تلقائيًا.
        </p>
      </header>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          event.currentTarget.value = "";
          for (const file of files) {
            await processBlob(file);
          }
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
          <span className="font-display text-sm font-semibold">مسح بالكاميرا</span>
          <span className="text-[11px] text-muted-foreground">عدة صفحات في نفس الجلسة</span>
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
          <span className="font-display text-sm font-semibold">استيراد صور</span>
          <span className="text-[11px] text-muted-foreground">اختر عدة صور دفعة واحدة</span>
        </button>
      </div>

      {busy && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> {busy}
        </div>
      )}

      {pages.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card/60 p-6 text-center shadow-elegant">
          <ScanLine className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 text-sm font-medium">لا توجد صفحات بعد</p>
          <p className="text-xs text-muted-foreground">
            التقط أول صفحة أو اختر عدة صور. لن تظهر شاشة تحديد إجبارية بعد كل صفحة.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">الصفحات ({pages.length})</h2>
            <Button variant="outline" size="sm" onClick={() => setCamera(true)}>
              <Camera className="h-4 w-4" /> إضافة صفحات
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pages.map((page, index) => (
              <div key={page.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="relative">
                  <img src={page.preview} alt={`صفحة ${index + 1}`} className="aspect-[3/4] w-full bg-muted/20 object-contain" />
                  <span className="absolute start-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[11px] shadow-sm">
                    {index + 1}
                  </span>
                  <button
                    aria-label="حذف الصفحة"
                    onClick={() => setPages((list) => list.filter((item) => item.id !== page.id))}
                    className="absolute end-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>

                <div className="grid grid-cols-4 border-t border-border">
                  <button className="grid place-items-center p-2 hover:bg-muted" onClick={() => movePage(index, -1)} aria-label="تحريك للأمام">
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </button>
                  <button className="grid place-items-center p-2 hover:bg-muted" onClick={() => rotatePage(page)} aria-label="تدوير">
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <button className="grid place-items-center p-2 hover:bg-muted" onClick={() => openEditor(page)} aria-label="تعديل الحدود">
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                  <button className="grid place-items-center p-2 hover:bg-muted" onClick={() => movePage(index, 1)} aria-label="تحريك للخلف">
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 pt-2">
            <Button
              onClick={savePdf}
              disabled={saving}
              size="lg"
              className="press sheen w-full bg-gradient-brand text-primary-foreground shadow-glow"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              حفظ {pages.length} صفحة بصيغة PDF
            </Button>
            <Button onClick={signNow} disabled={saving} variant="outline" size="lg" className="w-full">
              <PenLine className="h-4 w-4" /> توقيع المستند الآن
            </Button>
          </div>
        </section>
      )}

      <CameraCapture
        open={camera}
        pageCount={pages.length}
        lastPreview={pages.at(-1)?.preview}
        onClose={() => setCamera(false)}
        onDone={() => setCamera(false)}
        onCapture={processBlob}
      />
    </div>
  );
}
