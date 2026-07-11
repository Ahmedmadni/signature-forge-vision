import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileWarning, Loader2, PenTool, Download } from "lucide-react";
import { type FieldType } from "@/lib/editor/types";
import { useEditorStore } from "@/lib/editor/use-editor-store";
import { usePdfDocument, PdfPageCanvas } from "@/lib/editor/use-pdf-document";
import { exportSignedPdf } from "@/lib/editor/export-pdf";
import { PlacedFieldView } from "./PlacedFieldView";
import { FieldPalette } from "./FieldPalette";
import { PropertiesPanel } from "./PropertiesPanel";
import { ThumbnailSidebar } from "./ThumbnailSidebar";
import { EditorToolbar } from "./EditorToolbar";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import { SignaturePad } from "./SignaturePad";
import { Button } from "@/components/ui/button";

interface Props {
  docId: string;
  title: string;
  src: string;
}

export function DocumentEditor({ docId, title, src }: Props) {
  const { pdf, loading, error } = usePdfDocument(src);
  const store = useEditorStore(docId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [viewportW, setViewportW] = useState(800);
  const [viewportH, setViewportH] = useState(600);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [armed, setArmed] = useState<FieldType | null>(null);
  const [showThumbs, setShowThumbs] = useState(true);
  const [showProps, setShowProps] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [signId, setSignId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // قياس منطقة العرض
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewportW(el.clientWidth);
      setViewportH(el.clientHeight);
    });
    ro.observe(el);
    setViewportW(el.clientWidth);
    setViewportH(el.clientHeight);
    return () => ro.disconnect();
  }, [pdf]);

  const refWidth = Math.max(viewportW - 48, 200);
  const pageWidth = refWidth * zoom;

  // تتبّع الصفحة الظاهرة
  useEffect(() => {
    if (!pdf) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setCurrentPage(Number((visible.target as HTMLElement).dataset.page));
      },
      { root: scrollRef.current, threshold: [0.3, 0.6] },
    );
    Object.values(pageRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [pdf]);

  const fitWidth = useCallback(() => setZoom(1), []);
  const fitPage = useCallback(() => {
    if (!pdf) return;
    const ratio = pdf.ratios[currentPage - 1] || 0.72;
    const targetW = (viewportH - 48) * ratio;
    setZoom(Math.max(targetW / refWidth, 0.3));
  }, [pdf, currentPage, viewportH, refWidth]);

  const changeZoom = useCallback(
    (delta: number) => setZoom((z) => Math.min(Math.max(z + delta, 0.3), 3)),
    [],
  );

  const scrollToPage = useCallback((n: number) => {
    pageRefs.current[n]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // اختصارات لوحة المفاتيح
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); store.undo(); }
      else if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); store.redo(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        store.removeField(selectedId);
        setSelectedId(null);
      } else if (e.key === "Escape") { setArmed(null); setSelectedId(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store, selectedId]);

  const fieldCounts = useMemo(() => {
    const c: Record<number, number> = {};
    store.fields.forEach((f) => (c[f.page] = (c[f.page] || 0) + 1));
    return c;
  }, [store.fields]);

  const selectedField = store.fields.find((f) => f.id === selectedId) ?? null;

  const placeAt = (page: number, e: { clientX: number; clientY: number }, rect: DOMRect, type: FieldType) => {
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const id = store.addField(type, page, x, y);
    setSelectedId(id);
    setArmed(null);
    if (type === "signature" || type === "initials" || type === "stamp") setSignId(id);
  };

  const signField = store.fields.find((f) => f.id === signId) ?? null;
  const signKind =
    signField && (signField.type === "signature" || signField.type === "initials" || signField.type === "stamp")
      ? signField.type
      : "signature";

  const handleDownload = useCallback(async () => {
    setExporting(true);
    try {
      await store.commitNow();
      await exportSignedPdf(src, store.fields, title);
    } catch (err) {
      console.error("تعذّر تصدير المستند", err);
    } finally {
      setExporting(false);
    }
  }, [src, store, title]);


  if (loading) {
    return (
      <div className="grid h-[70vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>جارٍ تحميل المستند…</p>
        </div>
      </div>
    );
  }

  if (error || !pdf) {
    return (
      <div className="grid h-[70vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
          <FileWarning className="h-10 w-10 text-destructive" />
          <p className="font-medium">تعذّر تحميل المستند</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          اسحب حقلًا إلى المستند، ثم ارسم أو اكتب توقيعك، وأخيرًا نزّل الملف الموقّع.
        </p>
        <Button
          onClick={handleDownload}
          disabled={exporting}
          className="bg-gradient-brand text-primary-foreground shadow-glow"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          تنزيل المستند الموقّع
        </Button>
      </div>

      <EditorToolbar
        zoom={zoom}
        saveStatus={store.saveStatus}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        onZoom={changeZoom}
        onFitWidth={fitWidth}
        onFitPage={fitPage}
        onUndo={store.undo}
        onRedo={store.redo}
        onToggleThumbs={() => setShowThumbs((v) => !v)}
        onToggleProps={() => setShowProps((v) => !v)}
        onRetry={store.retrySave}
        onToggleHistory={() => setShowHistory((v) => !v)}
      />

      <div className="flex gap-3">
        {/* الشريط المصغّر */}
        <AnimatePresence initial={false}>
          {showThumbs && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 164, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="hidden shrink-0 overflow-hidden lg:block"
            >
              <div className="max-h-[76vh] w-[164px] overflow-y-auto rounded-2xl border border-border bg-card/60 p-2">
                <ThumbnailSidebar
                  pdf={pdf}
                  currentPage={currentPage}
                  fieldCounts={fieldCounts}
                  onSelect={scrollToPage}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* منطقة العرض */}
        <div
          ref={scrollRef}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
          className="relative h-[76vh] flex-1 overflow-auto rounded-2xl border border-border bg-muted/40 p-6"
        >
          <div className="mx-auto flex flex-col items-center gap-6" style={{ width: pageWidth }}>
            {Array.from({ length: pdf.numPages }, (_, i) => i + 1).map((n) => {
              const ratio = pdf.ratios[n - 1] || 0.72;
              const ph = pageWidth / ratio;
              return (
                <div
                  key={n}
                  data-page={n}
                  ref={(el) => { pageRefs.current[n] = el; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const type = e.dataTransfer.getData("field-type") as FieldType;
                    if (type) placeAt(n, e, e.currentTarget.getBoundingClientRect(), type);
                  }}
                  onClick={(e) => {
                    if (armed) placeAt(n, e, e.currentTarget.getBoundingClientRect(), armed);
                    else if (e.target === e.currentTarget) setSelectedId(null);
                  }}
                  className="relative shrink-0 overflow-hidden rounded-lg bg-white shadow-elegant"
                  style={{ width: pageWidth, height: ph, cursor: armed ? "crosshair" : "default" }}
                >
                  <PdfPageCanvas pdf={pdf} pageNumber={n} width={pageWidth} className="block" />
                  {store.fields
                    .filter((f) => f.page === n)
                    .map((f) => (
                      <PlacedFieldView
                        key={f.id}
                        field={f}
                        pageWidth={pageWidth}
                        pageHeight={ph}
                        selected={f.id === selectedId}
                        onSelect={() => setSelectedId(f.id)}
                        onChange={(patch) => store.updateField(f.id, patch)}
                        onCommit={store.commitNow}
                        onEdit={() => {
                          if (f.type === "signature" || f.type === "initials" || f.type === "stamp") {
                            setSelectedId(f.id);
                            setSignId(f.id);
                          }
                        }}
                        onRemove={() => {
                          store.removeField(f.id);
                          setSelectedId(null);
                          store.commitNow();
                        }}
                      />

                    ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* لوحة الأدوات والخصائص */}
        <AnimatePresence initial={false}>
          {showProps && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="hidden shrink-0 overflow-hidden xl:block"
            >
              <div className="max-h-[76vh] w-[288px] space-y-5 overflow-y-auto rounded-2xl border border-border bg-card/60 p-4">
                {showHistory ? (
                  <VersionHistoryPanel store={store} />
                ) : (
                  <>
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
                        <PenTool className="h-4 w-4 text-primary" /> الحقول التفاعلية
                      </h3>
                      <FieldPalette armed={armed} onPick={(t) => setArmed((c) => (c === t ? null : t))} />
                    </div>
                    <div className="h-px bg-border" />
                    <PropertiesPanel
                      field={selectedField}
                      pageCount={pdf.numPages}
                      currentPage={currentPage}
                      onChange={(patch) => selectedField && store.updateField(selectedField.id, patch)}
                      onApply={(scope) =>
                        selectedField &&
                        store.applyToPages(selectedField, scope, selectedField.page, pdf.numPages)
                      }
                    />
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SignaturePad
        open={signId !== null}
        kind={signKind}
        onClose={() => setSignId(null)}
        onConfirm={(dataUrl) => {
          if (!signId) return;
          store.updateField(signId, {
            metadata: { ...(signField?.metadata ?? {}), image: dataUrl },
          });
          store.commitNow();
        }}
      />
    </div>
  );
}
