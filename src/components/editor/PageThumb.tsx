import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import type { PageModel } from "@/lib/editor/use-page-organizer";

interface Props {
  page: PageModel;
  index: number;
  width: number;
  getPdfjsPage: (srcKey: string, pageIndex: number) => Promise<any>;
}

/** يرسم مصغّرة صفحة PDF مع مراعاة الدوران */
export function PageThumb({ page, width, getPdfjsPage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (page.blank) {
      setReady(true);
      return;
    }
    let cancelled = false;
    let task: any;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const pdfPage = await getPdfjsPage(page.srcKey, page.pageIndex);
      if (cancelled || !pdfPage) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const dpr = window.devicePixelRatio || 1;
      const scale = (width * dpr) / base.width;
      const viewport = pdfPage.getViewport({ scale });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${width / (base.width / base.height)}px`;
      try {
        task = pdfPage.render({ canvasContext: ctx, viewport });
        await task.promise;
        if (!cancelled) setReady(true);
      } catch {
        /* أُلغي */
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [page.srcKey, page.pageIndex, page.blank, width, getPdfjsPage]);

  return (
    <div
      className="grid place-items-center overflow-hidden rounded-md bg-white"
      style={{ transform: `rotate(${page.rotation}deg)`, transition: "transform 0.2s" }}
    >
      {page.blank ? (
        <div
          className="grid place-items-center text-muted-foreground"
          style={{ width, height: width * 1.414 }}
        >
          <FileText className="h-8 w-8 opacity-40" />
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className={ready ? "opacity-100" : "opacity-0"}
          style={{ transition: "opacity 0.2s" }}
        />
      )}
    </div>
  );
}
