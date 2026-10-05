import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// إعداد عامل pdf.js مرة واحدة (جهة العميل فقط)
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
}

export interface LoadedPdf {
  numPages: number;
  getPage: (n: number) => Promise<PDFPageProxy>;
  // نسبة العرض/الارتفاع لكل صفحة (index 0-based)
  ratios: number[];
}

export function usePdfDocument(src: string | Uint8Array | null) {
  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let doc: PDFDocumentProxy | undefined;
    setLoading(true);
    setError(null);
    setPdf(null);

    if (!src) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const task = pdfjsLib.getDocument(
          typeof src === "string"
            ? { url: src, isEvalSupported: false }
            : { data: src, isEvalSupported: false },
        );
        doc = await task.promise;
        if (cancelled) return;

        const ratios: number[] = [];
        for (let i = 1; i <= doc.numPages; i += 1) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          ratios[i - 1] = vp.width / vp.height;
        }

        if (cancelled) return;

        setPdf({
          numPages: doc.numPages,
          getPage: (n: number) => doc!.getPage(n),
          ratios,
        });
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "تعذّر تحميل المستند");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (doc) void doc.destroy();
    };
  }, [src]);

  return { pdf, error, loading };
}

interface PdfPageCanvasProps {
  pdf: LoadedPdf;
  pageNumber: number;
  width: number;
  className?: string;
}

/** يرسم صفحة PDF واحدة على لوحة بعرض محدد بالبكسل */
export function PdfPageCanvas({ pdf, pageNumber, width, className }: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderRef = useRef<RenderTask | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;

      const base = page.getViewport({ scale: 1 });
      const scale = (width * (window.devicePixelRatio || 1)) / base.width;
      const viewport = page.getViewport({ scale });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${width / (base.width / base.height)}px`;

      try {
        renderRef.current?.cancel();
        renderRef.current = page.render({ canvasContext: ctx, viewport });
        await renderRef.current.promise;
      } catch {
        /* أُلغي الرسم */
      }
    })();

    return () => {
      cancelled = true;
      renderRef.current?.cancel();
    };
  }, [pdf, pageNumber, width]);

  return <canvas ref={canvasRef} className={className} />;
}
