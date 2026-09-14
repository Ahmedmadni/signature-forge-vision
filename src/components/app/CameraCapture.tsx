import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Images, Loader2, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playSfx, haptic } from "@/lib/sfx";
import { analyzeDocumentFrame, quadDistance } from "@/lib/live-scan";
import type { Quad } from "@/lib/scan";

interface Props {
  open: boolean;
  pageCount: number;
  lastPreview?: string | null;
  onClose: () => void;
  onDone: () => void;
  onCapture: (blob: Blob) => Promise<void> | void;
}

interface ViewBox {
  width: number;
  height: number;
}

/**
 * كاميرا ماسح ضوئي احترافية:
 * - كشف حي لحدود الورقة
 * - مؤشر ثقة وثبات
 * - التقاط تلقائي عند ثبات الورقة
 * - جلسة متعددة الصفحات
 */
export function CameraCapture({ open, pageCount, lastPreview, onClose, onDone, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastQuadRef = useRef<Quad | null>(null);
  const capturedQuadRef = useRef<Quad | null>(null);
  const stableFramesRef = useRef(0);
  const lostFramesRef = useRef(0);
  const autoArmedRef = useRef(true);
  const capturingRef = useRef(false);
  const detectorBusyRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [detectedQuad, setDetectedQuad] = useState<Quad | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [stableFrames, setStableFrames] = useState(0);
  const [viewBox, setViewBox] = useState<ViewBox>({ width: 0, height: 0 });

  const shoot = useCallback(
    async (automatic = false) => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || capturingRef.current) return;

      capturingRef.current = true;
      setCapturing(true);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 120);

      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("camera-canvas-unavailable");
        ctx.drawImage(video, 0, 0);

        playSfx("place");
        haptic(automatic ? 18 : undefined);

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("capture-failed"))), "image/jpeg", 0.96);
        });

        capturedQuadRef.current = detectedQuad;
        autoArmedRef.current = false;
        stableFramesRef.current = 0;
        setStableFrames(0);
        await onCapture(blob);
      } finally {
        capturingRef.current = false;
        setCapturing(false);
      }
    },
    [detectedQuad, onCapture],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setReady(false);
    setDetectedQuad(null);
    setConfidence(0);
    stableFramesRef.current = 0;
    lostFramesRef.current = 0;
    lastQuadRef.current = null;
    capturedQuadRef.current = null;
    autoArmedRef.current = true;

    navigator.mediaDevices
      ?.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            void video.play();
            setReady(true);
          };
        }
      })
      .catch(() => {
        if (!cancelled) setError("تعذّر فتح الكاميرا — تحقّق من إذن الوصول إليها");
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setViewBox({ width: el.clientWidth, height: el.clientHeight });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open || !ready) return;
    let disposed = false;

    const timer = window.setInterval(() => {
      if (disposed || detectorBusyRef.current || capturingRef.current) return;
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) return;

      detectorBusyRef.current = true;
      try {
        const result = analyzeDocumentFrame(video, video.videoWidth, video.videoHeight);
        setDetectedQuad(result.detected ? result.quad : null);
        setConfidence(result.confidence);

        if (!result.detected) {
          lostFramesRef.current += 1;
          stableFramesRef.current = 0;
          setStableFrames(0);
          lastQuadRef.current = null;
          if (lostFramesRef.current >= 2) autoArmedRef.current = true;
          return;
        }

        lostFramesRef.current = 0;

        if (!autoArmedRef.current && capturedQuadRef.current) {
          const moved = quadDistance(result.quad, capturedQuadRef.current, video.videoWidth, video.videoHeight);
          if (moved > 0.045) autoArmedRef.current = true;
        }

        const previous = lastQuadRef.current;
        const movement = previous
          ? quadDistance(result.quad, previous, video.videoWidth, video.videoHeight)
          : 1;
        lastQuadRef.current = result.quad;

        if (result.stableEnough && movement < 0.012) {
          stableFramesRef.current += 1;
        } else {
          stableFramesRef.current = Math.max(0, stableFramesRef.current - 1);
        }
        setStableFrames(stableFramesRef.current);

        if (autoArmedRef.current && stableFramesRef.current >= 4) {
          autoArmedRef.current = false;
          stableFramesRef.current = 0;
          setStableFrames(0);
          void shoot(true);
        }
      } finally {
        detectorBusyRef.current = false;
      }
    }, 320);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [open, ready, shoot]);

  const overlayPoints = useMemo(() => {
    const video = videoRef.current;
    if (!detectedQuad || !video || !viewBox.width || !viewBox.height || !video.videoWidth || !video.videoHeight) return "";

    const videoRatio = video.videoWidth / video.videoHeight;
    const boxRatio = viewBox.width / viewBox.height;
    let drawWidth = viewBox.width;
    let drawHeight = viewBox.height;
    let offsetX = 0;
    let offsetY = 0;

    if (videoRatio > boxRatio) {
      drawHeight = viewBox.width / videoRatio;
      offsetY = (viewBox.height - drawHeight) / 2;
    } else {
      drawWidth = viewBox.height * videoRatio;
      offsetX = (viewBox.width - drawWidth) / 2;
    }

    return detectedQuad
      .map((p) => {
        const x = offsetX + (p.x / video.videoWidth) * drawWidth;
        const y = offsetY + (p.y / video.videoHeight) * drawHeight;
        return `${x},${y}`;
      })
      .join(" ");
  }, [detectedQuad, viewBox]);

  if (!open) return null;

  const status = !ready
    ? "جارٍ تشغيل الكاميرا…"
    : !detectedQuad
      ? "وجّه الكاميرا إلى الورقة كاملة"
      : confidence < 0.72
        ? "قرّب الورقة واجعل الحواف واضحة"
        : stableFrames < 3
          ? "ثبّت الهاتف قليلًا…"
          : "تم التعرّف على الورقة — سيتم الالتقاط تلقائيًا";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border bg-card/95 p-3 backdrop-blur">
        <div>
          <p className="text-sm font-semibold">المسح الذكي التلقائي</p>
          <p className="text-xs text-muted-foreground">التقط الورقة تلقائيًا عند ظهور الحدود وثبات الصورة</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative flex-1 overflow-hidden bg-muted/30 p-3">
        <div ref={viewportRef} className="relative h-full overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
          <video ref={videoRef} playsInline muted className="h-full w-full object-contain" />

          {overlayPoints && (
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${viewBox.width} ${viewBox.height}`} preserveAspectRatio="none">
              <polygon
                points={overlayPoints}
                fill="hsl(var(--primary) / 0.10)"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            </svg>
          )}

          {!detectedQuad && ready && (
            <div className="pointer-events-none absolute inset-[8%] rounded-2xl border-2 border-dashed border-primary/45" />
          )}

          <div className="absolute start-3 top-3 flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
            <Images className="h-4 w-4 text-primary" />
            {pageCount} صفحة
          </div>

          <div className="absolute end-3 top-3 flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
            <ScanLine className="h-4 w-4 text-primary" />
            {detectedQuad ? `${Math.round(confidence * 100)}%` : "بحث"}
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-background/90 px-4 py-2 text-center text-xs font-medium shadow-sm backdrop-blur">
            {status}
          </div>

          {lastPreview && (
            <div className="absolute bottom-3 start-3 overflow-hidden rounded-xl border-2 border-background bg-card shadow-lg">
              <img src={lastPreview} alt="آخر صفحة" className="h-16 w-12 object-cover" />
            </div>
          )}

          {flash && <div className="pointer-events-none absolute inset-0 bg-white/80" />}

          {!ready && !error && (
            <div className="absolute inset-0 grid place-items-center bg-background/50">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 grid place-items-center bg-background/90 px-6 text-center text-sm text-foreground">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-border bg-card/95 px-4 py-4 backdrop-blur">
        <div className="justify-self-start text-xs text-muted-foreground">
          {detectedQuad ? "الحدود مكتشفة تلقائيًا" : "يمكن الالتقاط يدويًا أيضًا"}
        </div>

        <button
          onClick={() => void shoot(false)}
          disabled={!ready || capturing}
          aria-label="التقاط صفحة يدويًا"
          className="press grid h-20 w-20 place-items-center rounded-full border-4 border-primary/20 bg-gradient-brand shadow-glow disabled:opacity-40"
        >
          {capturing ? <Loader2 className="h-7 w-7 animate-spin text-primary-foreground" /> : <Camera className="h-7 w-7 text-primary-foreground" />}
        </button>

        <Button onClick={onDone} disabled={pageCount === 0 || capturing} className="justify-self-end">
          <Check className="h-4 w-4" />
          تم
        </Button>
      </div>
    </div>
  );
}
