import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Images, Loader2, RefreshCcw, ScanLine, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanCropper } from "@/components/app/ScanCropper";
import { playSfx, haptic } from "@/lib/sfx";
import { analyzeDocumentFrame, blendQuads, quadDistance } from "@/lib/live-scan";
import { defaultQuad, loadImage, type Quad } from "@/lib/scan";
import { detectDocumentPrecise } from "@/lib/precise-document-detect";

interface Props {
  open: boolean;
  pageCount: number;
  lastPreview?: string | null;
  onClose: () => void;
  onDone: () => void;
  onCapture: (blob: Blob, detectedQuad?: Quad) => Promise<void> | void;
}

interface ViewBox {
  width: number;
  height: number;
}

/** كاميرا ماسح ضوئي مع كشف حي، تثبيت للحواف، والتقاط تلقائي. */
export function CameraCapture({ open, pageCount, lastPreview, onClose, onDone, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRawQuadRef = useRef<Quad | null>(null);
  const smoothedQuadRef = useRef<Quad | null>(null);
  const latestQuadRef = useRef<Quad | null>(null);
  const capturedQuadRef = useRef<Quad | null>(null);
  const stableFramesRef = useRef(0);
  const lostFramesRef = useRef(0);
  const autoArmedRef = useRef(true);
  const capturingRef = useRef(false);
  const detectorBusyRef = useRef(false);
  const reviewRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [detectedQuad, setDetectedQuad] = useState<Quad | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [edgeScore, setEdgeScore] = useState(0);
  const [stableFrames, setStableFrames] = useState(0);
  const [viewBox, setViewBox] = useState<ViewBox>({ width: 0, height: 0 });
  const [review, setReview] = useState<{
    blob: Blob;
    image: CanvasImageSource;
    width: number;
    height: number;
    quad: Quad;
  } | null>(null);

  reviewRef.current = review !== null;
  const [confirming, setConfirming] = useState(false);

  const confirmReview = async () => {
    if (!review) return;
    setConfirming(true);
    try {
      await onCapture(review.blob, review.quad);
      setReview(null);
    } finally {
      setConfirming(false);
    }
  };

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

        const captureQuad = latestQuadRef.current ?? undefined;
        capturedQuadRef.current = captureQuad ?? null;
        autoArmedRef.current = false;
        stableFramesRef.current = 0;
        setStableFrames(0);
        const image = await loadImage(blob);
        const w = canvas.width;
        const h = canvas.height;
        const quad =
          captureQuad ?? detectDocumentPrecise(image as CanvasImageSource, w, h)?.quad ?? defaultQuad(w, h);
        setReview({ blob, image: image as CanvasImageSource, width: w, height: h, quad });
      } finally {
        capturingRef.current = false;
        setCapturing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setReady(false);
    setDetectedQuad(null);
    setConfidence(0);
    setEdgeScore(0);
    stableFramesRef.current = 0;
    lostFramesRef.current = 0;
    lastRawQuadRef.current = null;
    smoothedQuadRef.current = null;
    latestQuadRef.current = null;
    capturedQuadRef.current = null;
    autoArmedRef.current = true;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("الكاميرا غير متاحة على هذا الجهاز أو المتصفح");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        },
        audio: false,
      })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;

        try {
          await video.play();
        } catch {
          // بعض WebView تبدأ التشغيل عند canplay/playing فقط.
        }
      })
      .catch(() => {
        if (!cancelled) setError("تعذّر فتح الكاميرا — تحقّق من إذن الوصول إليها");
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const update = () => setViewBox({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open || !ready) return;
    let disposed = false;

    const timer = window.setInterval(() => {
      if (disposed || detectorBusyRef.current || capturingRef.current || reviewRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;

      detectorBusyRef.current = true;
      try {
        const result = analyzeDocumentFrame(video, video.videoWidth, video.videoHeight);
        setConfidence(result.confidence);
        setEdgeScore(result.edgeScore);

        if (!result.detected || !result.quad) {
          lostFramesRef.current += 1;
          stableFramesRef.current = 0;
          setStableFrames(0);
          if (lostFramesRef.current >= 2) {
            lastRawQuadRef.current = null;
            smoothedQuadRef.current = null;
            latestQuadRef.current = null;
            setDetectedQuad(null);
          }
          if (lostFramesRef.current >= 3) autoArmedRef.current = true;
          return;
        }

        lostFramesRef.current = 0;
        const rawQuad = result.quad;
        const previousRaw = lastRawQuadRef.current;
        const movement = previousRaw
          ? quadDistance(rawQuad, previousRaw, video.videoWidth, video.videoHeight)
          : 1;
        lastRawQuadRef.current = rawQuad;

        const previousSmooth = smoothedQuadRef.current;
        const smoothQuad = previousSmooth
          ? blendQuads(previousSmooth, rawQuad, movement < 0.02 ? 0.24 : 0.42)
          : rawQuad;
        smoothedQuadRef.current = smoothQuad;
        latestQuadRef.current = smoothQuad;
        setDetectedQuad(smoothQuad);

        if (!autoArmedRef.current && capturedQuadRef.current) {
          const moved = quadDistance(rawQuad, capturedQuadRef.current, video.videoWidth, video.videoHeight);
          if (moved > 0.055) autoArmedRef.current = true;
        }

        const strongDetection = result.stableEnough && result.confidence >= 0.72 && result.edgeScore >= 0.54;
        if (strongDetection && movement < 0.0085) {
          stableFramesRef.current += 1;
        } else if (movement < 0.014 && result.confidence >= 0.68) {
          stableFramesRef.current = Math.max(0, stableFramesRef.current);
        } else {
          stableFramesRef.current = Math.max(0, stableFramesRef.current - 1);
        }
        setStableFrames(stableFramesRef.current);

        if (autoArmedRef.current && stableFramesRef.current >= 5) {
          autoArmedRef.current = false;
          stableFramesRef.current = 0;
          setStableFrames(0);
          void shoot(true);
        }
      } finally {
        detectorBusyRef.current = false;
      }
    }, 280);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [open, ready, shoot]);

  /**
   * الفيديو معروض بـ object-cover، لذلك يجب تطبيق نفس scale/crop على حدود الكشف.
   * هذه النقطة تمنع انزياح الـ overlay عن الورقة على شاشات الهواتف الطويلة.
   */
  const overlayPoints = useMemo(() => {
    const video = videoRef.current;
    if (!detectedQuad || !video || !viewBox.width || !viewBox.height || !video.videoWidth || !video.videoHeight) return "";

    const scale = Math.max(viewBox.width / video.videoWidth, viewBox.height / video.videoHeight);
    const drawWidth = video.videoWidth * scale;
    const drawHeight = video.videoHeight * scale;
    const offsetX = (viewBox.width - drawWidth) / 2;
    const offsetY = (viewBox.height - drawHeight) / 2;

    return detectedQuad
      .map((point) => {
        const x = offsetX + point.x * scale;
        const y = offsetY + point.y * scale;
        return `${x},${y}`;
      })
      .join(" ");
  }, [detectedQuad, viewBox]);

  if (!open) return null;
  const progress = Math.min(1, stableFrames / 5);
  const locked = progress >= 0.8;

  const status = !ready
    ? "جارٍ تشغيل الكاميرا…"
    : !detectedQuad
      ? "ضع الورقة كاملة داخل الكاميرا وعلى خلفية واضحة"
      : confidence < 0.64 || edgeScore < 0.48
        ? "حرّك الهاتف قليلًا حتى تظهر الحواف الأربع بوضوح"
        : stableFrames < 4
          ? "تم اكتشاف الورقة — ثبّت الهاتف قليلًا"
          : "الحدود ثابتة — سيتم الالتقاط تلقائيًا";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div>
          <p className="text-sm font-semibold">المسح الذكي التلقائي</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">يتم تحديد الحواف الأربع ثم تصحيح المنظور تلقائيًا</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative flex-1 overflow-hidden bg-slate-100 p-2 dark:bg-slate-900">
        <div
          ref={viewportRef}
          className="relative h-full min-h-[320px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-elegant dark:border-slate-700"
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            disablePictureInPicture
            onCanPlay={() => setReady(true)}
            onPlaying={() => setReady(true)}
            className="absolute inset-0 h-full w-full bg-white object-cover dark:bg-slate-900"
          />

          {overlayPoints && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
              preserveAspectRatio="none"
            >
              <polygon
                points={overlayPoints}
                fill={locked ? "rgb(34 197 94 / 0.16)" : "rgb(59 130 246 / 0.12)"}
                stroke={locked ? "rgb(22 163 74)" : "rgb(37 99 235)"}
                strokeWidth="5"
                className="animate-pulse"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {overlayPoints.split(" ").map((point, index) => {
                const [cx, cy] = point.split(",").map(Number);
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r="10"
                    fill="white"
                    stroke={locked ? "rgb(22 163 74)" : "rgb(37 99 235)"}
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>
          )}

          {!detectedQuad && ready && (
            <div className="pointer-events-none absolute inset-[7%] rounded-2xl border-2 border-dashed border-blue-500/55" />
          )}

          <div className="absolute start-3 top-3 flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-xs text-slate-900 shadow-md backdrop-blur">
            <Images className="h-4 w-4 text-blue-600" />
            {pageCount} صفحة
          </div>

          <div className="absolute end-3 top-3 flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-xs text-slate-900 shadow-md backdrop-blur">
            <ScanLine className="h-4 w-4 text-blue-600" />
            {detectedQuad ? `${Math.round(confidence * 100)}%` : "بحث"}
          </div>

          <div className="absolute bottom-4 left-1/2 max-w-[85%] -translate-x-1/2 rounded-2xl border border-white/60 bg-white/92 px-4 py-2 text-center text-xs font-medium text-slate-900 shadow-md backdrop-blur">
            {status}
            {detectedQuad && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${locked ? "bg-green-600" : "bg-blue-600"}`}
                  style={{ width: `${Math.max(8, progress * 100)}%` }}
                />
              </div>
            )}
          </div>

          {lastPreview && (
            <div className="absolute bottom-3 start-3 overflow-hidden rounded-xl border-2 border-white bg-white shadow-lg">
              <img src={lastPreview} alt="آخر صفحة" className="h-16 w-12 object-cover" />
            </div>
          )}

          {flash && <div className="pointer-events-none absolute inset-0 bg-white/75" />}

          {!ready && !error && (
            <div className="absolute inset-0 grid place-items-center bg-white/92 text-slate-700">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 grid place-items-center bg-white px-6 text-center text-sm text-slate-900">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="justify-self-start text-xs text-slate-500 dark:text-slate-400">
          {detectedQuad ? "الحواف محددة تلقائيًا" : "اترك مساحة صغيرة حول الورقة"}
        </div>

        <button
          onClick={() => void shoot(false)}
          disabled={!ready || capturing}
          aria-label="التقاط صفحة يدويًا"
          className="press grid h-20 w-20 place-items-center rounded-full border-4 border-blue-100 bg-blue-600 shadow-lg disabled:opacity-40"
        >
          {capturing ? <Loader2 className="h-7 w-7 animate-spin text-white" /> : <Camera className="h-7 w-7 text-white" />}
        </button>

        <Button onClick={onDone} disabled={pageCount === 0 || capturing} className="justify-self-end">
          <Check className="h-4 w-4" />
          تم
        </Button>
      </div>
      {review && (
        <div className="absolute inset-0 z-10 flex flex-col gap-3 overflow-y-auto bg-white p-3 dark:bg-slate-950">
          <div>
            <p className="text-sm font-semibold">راجع حدود الصفحة</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">حرّك الزوايا عند الحاجة، ثم أكّد ليتم قص المنطقة المحددة فقط.</p>
          </div>
          <ScanCropper
            image={review.image}
            imageWidth={review.width}
            imageHeight={review.height}
            quad={review.quad}
            onChange={(quad) => setReview((r) => (r ? { ...r, quad } : r))}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setReview(null)} disabled={confirming}>
              <RefreshCcw className="h-4 w-4" /> إعادة الالتقاط
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setReview((r) => {
                  if (!r) return r;
                  const d = detectDocumentPrecise(r.image, r.width, r.height);
                  return d ? { ...r, quad: d.quad } : r;
                })
              }
            >
              <Wand2 className="h-4 w-4" /> إعادة الكشف
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setReview((r) => (r ? { ...r, quad: defaultQuad(r.width, r.height) } : r))}
            >
              الصورة كاملة
            </Button>
          </div>
          <Button size="lg" onClick={() => void confirmReview()} disabled={confirming} className="w-full">
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            تأكيد وقص المنطقة
          </Button>
        </div>
      )}
    </div>
  );
}
