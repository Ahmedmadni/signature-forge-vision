import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Download,
  PenLine,
  Minus,
  Plus,
  CopyPlus,

} from "lucide-react";
import { usePdfDocument, PdfPageCanvas } from "@/lib/pdf-view";
import type { Placement } from "@/lib/sign-pdf";
import { buildSignedPdf } from "@/lib/sign-pdf";
import { saveFile } from "@/lib/save-file";
import { consumePages, useInvalidateUsage } from "@/lib/usage";
import { Button } from "@/components/ui/button";
import { Paywall } from "./Paywall";
import { toast } from "sonner";

interface Props {
  file: File;
  signature: string | null;
  onRequestSignature: () => void;
  onDone: () => void;
}

export function PdfSignWorkspace({ file, signature, onRequestSignature, onDone }: Props) {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBytes(null);
    setReadError(null);
    file
      .arrayBuffer()
      .then((buf) => {
        if (!cancelled) setBytes(new Uint8Array(buf));
      })
      .catch(() => {
        if (!cancelled) setReadError("تعذّر قراءة الملف");
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  // نسخة مستقلة لـ pdf.js لأنه قد يستهلك المخزن المؤقت
  const viewerBytes = useMemo(() => (bytes ? bytes.slice() : null), [bytes]);
  const { pdf, loading: pdfLoading, error: pdfError } = usePdfDocument(viewerBytes);
  const loading = !bytes && !readError ? true : pdfLoading;
  const error = readError ?? pdfError;
  const invalidateUsage = useInvalidateUsage();

  const [page, setPage] = useState(1);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [paywall, setPaywall] = useState<{ used: number; limit: number } | null>(null);
  const [width, setWidth] = useState(360);

  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [pdf]);

  const ratio = pdf?.ratios[page - 1] ?? 0.72;
  const height = width / ratio;

  const addSignature = useCallback(
    (clientX?: number, clientY?: number) => {
      if (!signature) {
        onRequestSignature();
        return;
      }
      const img = new Image();
      img.onload = () => {
        const wPct = 0.32;
        const wPx = wPct * width;
        const hPx = wPx * (img.height / img.width);
        const hPct = hPx / height;
        const rect = wrapRef.current?.getBoundingClientRect();
        let xPct = 0.5 - wPct / 2;
        let yPct = 0.5 - hPct / 2;
        if (rect && clientX !== undefined && clientY !== undefined) {
          xPct = (clientX - rect.left) / rect.width - wPct / 2;
          yPct = (clientY - rect.top) / rect.height - hPct / 2;
        }
        const id = crypto.randomUUID();
        setPlacements((p) => [
          ...p,
          {
            id,
            page,
            xPct: Math.min(Math.max(xPct, 0), 1 - wPct),
            yPct: Math.min(Math.max(yPct, 0), 1 - hPct),
            wPct,
            hPct,
            image: signature,
          },
        ]);
        setSelected(id);
      };
      img.src = signature;
    },
    [signature, width, height, page, onRequestSignature],
  );

  /** نسخ توقيع الصفحة الحالية إلى كل صفحات المستند بنفس الموضع والحجم */
  const applyToAllPages = useCallback(() => {
    if (!pdf) return;
    const source =
      placements.find((p) => p.id === selected && p.page === page) ??
      placements.filter((p) => p.page === page).slice(-1)[0];
    if (!source) {
      toast.error("ضع توقيعك على صفحة واحدة أولًا");
      return;
    }
    const copies: Placement[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      if (n === source.page) continue;
      copies.push({ ...source, id: crypto.randomUUID(), page: n });
    }
    if (!copies.length) {
      toast.info("المستند يحتوي على صفحة واحدة فقط");
      return;
    }
    // إزالة أي نسخة سابقة نتجت عن نفس العملية لتفادي التكرار
    setPlacements((list) => [
      ...list.filter(
        (p) =>
          p.page === source.page ||
          !(
            Math.abs(p.xPct - source.xPct) < 0.001 &&
            Math.abs(p.yPct - source.yPct) < 0.001 &&
            p.image === source.image
          ),
      ),
      ...copies,
    ]);
    toast.success(`تم تطبيق التوقيع على ${pdf.numPages} صفحات`);
  }, [pdf, placements, selected, page]);

  const patch = (id: string, next: Partial<Placement>) =>
    setPlacements((list) => list.map((p) => (p.id === id ? { ...p, ...next } : p)));

  const resize = (id: string, delta: number) =>
    setPlacements((list) =>
      list.map((p) => {
        if (p.id !== id) return p;
        const wPct = Math.min(Math.max(p.wPct + delta, 0.08), 0.95);
        const scale = wPct / p.wPct;
        return { ...p, wPct, hPct: p.hPct * scale };
      }),
    );

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const target = placements.find((p) => p.id === d.id);
    if (!target) return;
    const xPct = (e.clientX - rect.left) / rect.width - d.dx;
    const yPct = (e.clientY - rect.top) / rect.height - d.dy;
    patch(d.id, {
      xPct: Math.min(Math.max(xPct, 0), 1 - target.wPct),
      yPct: Math.min(Math.max(yPct, 0), 1 - target.hPct),
    });
  };

  const signedPagesCount = useMemo(
    () => new Set(placements.map((p) => p.page)).size,
    [placements],
  );

  const handleSave = async () => {
    if (!placements.length) {
      toast.error("أضف توقيعك إلى المستند أولًا");
      return;
    }
    if (!bytes) {
      toast.error("لم يكتمل تحميل الملف بعد");
      return;
    }
    setSaving(true);
    try {
      const quota = await consumePages(signedPagesCount).catch((e) => {
        console.error("[waqqi] quota error", e);
        return null;
      });
      if (quota) {
        invalidateUsage();
        if (!quota.allowed) {
          setPaywall({ used: quota.pages_used, limit: quota.daily_limit });
          return;
        }
      }
      const out = await buildSignedPdf(bytes.slice(), placements);
      const copy = new Uint8Array(out.length);
      copy.set(out);
      const blob = new Blob([copy.buffer], { type: "application/pdf" });
      const name = file.name.replace(/\.[^.]+$/, "") + "-موقّع.pdf";
      await saveFile(blob, name);
      toast.success("تم حفظ المستند الموقّع");
      onDone();
    } catch (err) {
      console.error("[waqqi] save error", err);
      toast.error(err instanceof Error ? err.message : "تعذّر حفظ المستند");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid h-64 place-items-center text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm">جارٍ فتح المستند…</p>
        </div>
      </div>
    );
  }

  if (error || !pdf) {
    return (
      <div className="grid h-64 place-items-center text-center text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <FileWarning className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium">تعذّر فتح هذا الملف</p>
        </div>
      </div>
    );
  }

  const active = placements.find((p) => p.id === selected) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card/60 px-3 py-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {page} / {pdf.numPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            disabled={page >= pdf.numPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={applyToAllPages} disabled={pdf.numPages <= 1}>
            <CopyPlus className="h-4 w-4" /> كل الصفحات
          </Button>
          <Button size="sm" variant="outline" onClick={() => addSignature()}>
            <PenLine className="h-4 w-4" /> إضافة توقيع
          </Button>
        </div>

      </div>

      <div
        ref={wrapRef}
        onPointerMove={onPointerMove}
        onPointerUp={() => (dragRef.current = null)}
        onDoubleClick={(e) => addSignature(e.clientX, e.clientY)}
        className="relative mx-auto w-full overflow-hidden rounded-2xl bg-white shadow-elegant"
        style={{ height }}
      >
        <PdfPageCanvas pdf={pdf} pageNumber={page} width={width} className="block w-full" />
        {placements
          .filter((p) => p.page === page)
          .map((p) => (
            <div
              key={p.id}
              onPointerDown={(e) => {
                e.stopPropagation();
                const rect = wrapRef.current!.getBoundingClientRect();
                dragRef.current = {
                  id: p.id,
                  dx: (e.clientX - rect.left) / rect.width - p.xPct,
                  dy: (e.clientY - rect.top) / rect.height - p.yPct,
                };
                setSelected(p.id);
              }}
              className={`absolute touch-none select-none rounded-md ${
                selected === p.id ? "ring-2 ring-primary" : ""
              }`}
              style={{
                left: `${p.xPct * 100}%`,
                top: `${p.yPct * 100}%`,
                width: `${p.wPct * 100}%`,
                height: `${p.hPct * 100}%`,
              }}
            >
              <img src={p.image} alt="توقيع" className="pointer-events-none h-full w-full object-contain" draggable={false} />
            </div>
          ))}
      </div>

      {active && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card/60 px-3 py-2">
          <span className="text-xs text-muted-foreground">حجم التوقيع</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => resize(active.id, -0.04)}>
              <Minus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => resize(active.id, 0.04)}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setPlacements((l) => l.filter((x) => x.id !== active.id));
                setSelected(null);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        انقر نقرًا مزدوجًا على المستند لوضع توقيعك، ثم اسحبه لضبط المكان.
      </p>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-gradient-brand text-primary-foreground shadow-glow"
        size="lg"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        حفظ المستند الموقّع
      </Button>

      <Paywall
        open={paywall !== null}
        used={paywall?.used ?? 3}
        limit={paywall?.limit ?? 3}
        onClose={() => setPaywall(null)}
      />
    </div>
  );
}
