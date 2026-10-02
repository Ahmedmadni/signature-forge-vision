import { useCallback, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/app/CameraCapture";
import { ScanCropper } from "@/components/app/ScanCropper";
import {
  buildScannedPdf,
  defaultQuad,
  fullImageQuad,
  loadImage,
  renderPage,
  renderProcessedPage,
  type Quad,
  type ScanFilter,
} from "@/lib/scan";
import { detectDocumentRefined } from "@/lib/document-refine";
import {
  canUseNativeScanner,
  isAndroidNativeApp,
  NativeScannerUnavailableError,
  scanNativeDocuments,
} from "@/lib/native-document-scanner";
import {
  getScanSettings,
  PAGE_SIZE_PT,
  QUALITY_JPEG,
  QUALITY_MAX_PX,
  QUALITY_OPTIONS,
  PAGE_SIZE_OPTIONS,
  useScanSettings,
} from "@/lib/scan-settings";
import { saveFile } from "@/lib/save-file";
import { setPendingFile } from "@/lib/pending-file";
import { toast } from "sonner";
import { playSfx, haptic } from "@/lib/sfx";
import { moveItem, nextQuarterTurn } from "@/lib/scan-page-order";
import { shouldPreserveNativeProcessedPage } from "@/lib/scan-page-policy";

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
  nativeProcessed: boolean;
  image: CanvasImageSource;
  width: number;
  height: number;
  quad: Quad;
  filter: ScanFilter;
  rotation: 0 | 90 | 180 | 270;
}

interface Page {
  id: string;
  nativeProcessed: boolean;
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

/** Respect already corrected ML Kit output unless the user changes its crop/filter. */
function drawPage(draft: Draft): HTMLCanvasElement {
  const maxSize = QUALITY_MAX_PX[getScanSettings().quality];
  if (
    shouldPreserveNativeProcessedPage(
      draft.nativeProcessed,
      draft.filter,
      draft.quad,
      draft.width,
      draft.height,
    )
  ) {
    return renderProcessedPage(
      draft.image,
      draft.width,
      draft.height,
      draft.rotation,
      maxSize,
    );
  }
  return renderPage(
    draft.image,
    draft.width,
    draft.height,
    draft.quad,
    draft.filter,
    draft.rotation,
    maxSize,
  );
}

function ScanPage() {
  const navigate = useNavigate();
  const settings = useScanSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [saving, setSaving] = useState(false);
  const [nativeBusy, setNativeBusy] = useState(false);
  const [nativeScannerIssue, setNativeScannerIssue] = useState<string | null>(null);

  const processBlob = useCallback(async (blob: Blob, cameraQuad?: Quad, nativeProcessed = false) => {
    setBusy("جارٍ اكتشاف حدود الصفحة وتحسينها…");
    try {
      const img = await loadImage(blob);
      const width = "width" in img ? Number(img.width) : 0;
      const height = "height" in img ? Number(img.height) : 0;
      if (!width || !height) throw new Error("invalid-image");

      const detection =
        cameraQuad || nativeProcessed
          ? null
          : detectDocumentRefined(img as CanvasImageSource, width, height);
      const quad = nativeProcessed
        ? fullImageQuad(width, height)
        : cameraQuad ?? detection?.quad ?? defaultQuad(width, height);
      const filter: ScanFilter = nativeProcessed ? "color" : "enhanced";
      const rotation = 0 as const;
      const canvas = drawPage({
        image: img as CanvasImageSource,
        width,
        height,
        quad,
        filter,
        rotation,
        nativeProcessed,
      });
      const page: Page = {
        id: crypto.randomUUID(),
        nativeProcessed,
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
      if (!nativeProcessed && !cameraQuad && !detection) {
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

  const openWebCamera = useCallback(() => {
    setCamera(true);
  }, []);

  const startScan = async () => {
    if (nativeBusy) return;
    if (!isAndroidNativeApp()) {
      openWebCamera();
      return;
    }
    if (!canUseNativeScanner()) {
      setNativeScannerIssue(
        "واجهة Google ML Kit الأصلية غير متاحة في نسخة التطبيق هذه. حدّث APK أولًا؛ ويمكنك فتح ماسح الويب يدويًا عند الحاجة.",
      );
      return;
    }

    setNativeScannerIssue(null);
    setNativeBusy(true);
    try {
      const images = await scanNativeDocuments(setBusy);
      if (!images?.length) return;
      let imported = 0;
      for (const blob of images) {
        const page = await processBlob(blob, undefined, true);
        if (!page) break;
        imported++;
      }
      if (imported > 0) toast.success(`أُضيفت ${imported} صفحة من الماسح الأصلي`);
      if (imported < images.length) {
        toast.warning("تعذّرت معالجة بعض الصفحات؛ الصفحات التي نجحت محفوظة في القائمة.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذّر تشغيل الماسح الأصلي";
      const unsupported =
        error instanceof NativeScannerUnavailableError ||
        /UNSUPPORTED|Google Play services|not available|not supported|module install|unimplemented/i.test(message);
      if (unsupported) {
        setNativeScannerIssue(
          "تعذر تشغيل Google ML Kit على هذا الجهاز. تأكد من خدمات Google Play والاتصال بالإنترنت، أو اختر ماسح الويب الاحتياطي.",
        );
        toast.warning("تعذر تشغيل الماسح الأصلي. لم نفتح الماسح الاحتياطي تلقائيًا.");
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(null);
      setNativeBusy(false);
    }
  };

  const openEditor = (page: Page) => {
    setDraft({
      pageId: page.id,
      nativeProcessed: page.nativeProcessed,
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
      const canvas = drawPage(draft);
      const next: Page = {
        id: draft.pageId ?? crypto.randomUUID(),
        nativeProcessed: draft.nativeProcessed,
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
    const rotation = nextQuarterTurn(page.rotation);
    const canvas = drawPage({
      image: page.source,
      width: page.sourceWidth,
      height: page.sourceHeight,
      quad: page.quad,
      filter: page.filter,
      rotation,
      nativeProcessed: page.nativeProcessed,
    });
    setPages((current) =>
      current.map((item) =>
        item.id === page.id
          ? { ...item, rotation, canvas, preview: canvas.toDataURL("image/jpeg", 0.72) }
          : item,
      ),
    );
  };

  const movePage = (index: number, direction: -1 | 1) => {
    setPages((current) => moveItem(current, index, direction));
  };

  const makePdf = async () => {
    const { quality, pageSize } = getScanSettings();
    const bytes = await buildScannedPdf(pages.map((page) => page.canvas), {
      jpegQuality: QUALITY_JPEG[quality],
      pageSizePt: pageSize === "auto" ? undefined : PAGE_SIZE_PT[pageSize],
    });
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
                const detection = detectDocumentRefined(current.image, current.width, current.height);
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

      <Link
        to="/settings"
        className="press flex items-center justify-between rounded-2xl border border-border bg-card/60 px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Settings2 className="h-4 w-4 text-primary" /> إعدادات المسح
        </span>
        <span className="text-[11px] text-muted-foreground">
          {QUALITY_OPTIONS.find((o) => o.key === settings.quality)?.label} ·{" "}
          {PAGE_SIZE_OPTIONS.find((o) => o.key === settings.pageSize)?.label}
        </span>
      </Link>

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
            void startScan();
          }}
          disabled={nativeBusy}
          className="press sheen flex flex-col items-center gap-2 rounded-3xl border border-dashed border-primary/40 bg-gradient-to-b from-primary/10 to-transparent px-4 py-8 hover:border-primary hover:shadow-glow"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-brand shadow-glow">
            <Camera className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-sm font-semibold">مسح بالكاميرا</span>
          <span className="text-[11px] text-muted-foreground">
            {isAndroidNativeApp() ? "ماسح Google الأصلي · عدة صفحات" : "عدة صفحات في نفس الجلسة"}
          </span>
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

      {nativeScannerIssue && (
        <div role="alert" className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p>{nativeScannerIssue}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => { setNativeScannerIssue(null); void startScan(); }}>
              إعادة محاولة ML Kit
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setNativeScannerIssue(null); openWebCamera(); }}>
              فتح ماسح الويب يدويًا
            </Button>
          </div>
        </div>
      )}

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
            <Button variant="outline" size="sm" disabled={nativeBusy} onClick={() => void startScan()}>
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
        onCapture={async (blob, quad) => {
          await processBlob(blob, quad);
        }}
      />
    </div>
  );
}
