import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Images, Loader2, RefreshCcw, ScanLine, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanCropper } from "@/components/app/ScanCropper";
import { playSfx, haptic } from "@/lib/sfx";
import { analyzeDocumentFrame, blendQuads, quadDistance } from "@/lib/live-scan";
import { defaultQuad, loadImage, type Quad } from "@/lib/scan";
import { detectDocumentRefined } from "@/lib/document-refine";

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
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
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
  const qualityRef = useRef({ confidence: 0, edgeScore: 0 });

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [detectedQuad, setDetectedQuad] = useState<Quad | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [edgeScore, setEdgeScore] = useState(0);
  const [stableFrames, setStableFrames] = useState(0);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(false);
  const [viewBox, setViewBox] = useState<ViewBox>({ width: 0, height: 0 });
  const [review, setReview] = useState<{
    blob: Blob;
    image: CanvasImageSource;
    width: number;
    height: number;
    quad: Quad;
  } | null>(null);

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
        const quality = qualityRef.current;
        capturedQuadRef.current = captureQuad ?? null;
        autoArmedRef.current = false;
        stableFramesRef.current = 0;
        setStableFrames(0);

        // اللقطة التلقائية الموثوقة تُضاف فورًا. اللقطة الضعيفة تُراجع قبل القص.
        if (automatic && captureQuad && quality.confidence >= 0.80 && quality.edgeScore >= 0.62) {
          await onCapture(blob, captureQuad);
        } else {
          const image = await loadImage(blob);
          const width = "width" in image ? Number(image.width) : 0;
          const height = "height" in image ? Number(image.height) : 0;
          if (!width || !height) throw new Error("invalid-capture");

          const detection = detectDocumentRefined(image as CanvasImageSource, width, height);
          setReview({
            blob,
            image: image as CanvasImageSource,
            width,
            height,
            quad: detection?.quad ?? defaultQuad(width, height),
          });
        }
      } finally {
        capturingRef.current = false;
        setCapturing(false);
      }
    },
    [onCapture],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setReady(false);
    setAutoCaptureEnabled(false);
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
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: false,
      })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        if (track) {
          try {
            track.contentHint = "detail";
          } catch {
            // بعض WebView لا تدعم contentHint.
          }

          try {
            const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & {
              focusMode?: string[];
              exposureMode?: string[];
              whiteBalanceMode?: string[];
            };
            const advanced: Record<string, unknown> = {};
            if (capabilities?.focusMode?.includes("continuous")) advanced.focusMode = "continuous";
            if (capabilities?.exposureMode?.includes("continuous")) advanced.exposureMode = "continuous";
            if (capabilities?.whiteBalanceMode?.includes("continuous")) advanced.whiteBalanceMode = "continuous";
            if (Object.keys(advanced).length) {
              await track.applyConstraints({ advanced: [advanced as MediaTrackConstraintSet] });
            }
          } catch {
            // لا نعطّل الماسح إذا لم يدعم الجهاز قيود التركيز/الإضاءة المتقدمة.
          }
        }

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
    if (!open || review) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    if (video.srcObject !== stream) video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    void video.play().catch(() => {
      // onCanPlay/onPlaying will mark the preview ready when WebView resumes painting.
    });
  }, [open, review]);

  useEffect(() => {
    if (review) return;
    const element = viewportRef.current;
    if (!element) return;
    const update = () => setViewBox({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, [open, review]);

  // نرسم المعاينة على Canvas بدل الاعتماد على رسم <video> داخل Android WebView.
  // هذا يمنع الشاشة السوداء على بعض الأجهزة ويضمن نفس هندسة object-contain المستخدمة للـoverlay.
  useEffect(() => {
    if (!open || !ready || review) return;

    let frame = 0;
    let lastPaint = 0;
    const paint = (time: number) => {
      frame = window.requestAnimationFrame(paint);
      if (time - lastPaint < 33) return; // نحو 30fps كحد أقصى
      lastPaint = time;

      const video = videoRef.current;
      const canvas = previewCanvasRef.current;
      if (!video || !canvas || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
      if (!viewBox.width || !viewBox.height) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const pixelWidth = Math.max(1, Math.round(viewBox.width * dpr));
      const pixelHeight = Math.max(1, Math.round(viewBox.height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, viewBox.width, viewBox.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const scale = Math.min(viewBox.width / video.videoWidth, viewBox.height / video.videoHeight);
      const drawWidth = video.videoWidth * scale;
      const drawHeight = video.videoHeight * scale;
      const offsetX = (viewBox.width - drawWidth) / 2;
      const offsetY = (viewBox.height - drawHeight) / 2;
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, offsetX, offsetY, drawWidth, drawHeight);
    };

    frame = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(frame);
  }, [open, ready, review, viewBox]);

  useEffect(() => {
    if (!open || !ready || review) return;
    let disposed = false;

    const timer = window.setInterval(() => {
      if (disposed || detectorBusyRef.current || capturingRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;

      detectorBusyRef.current = true;
      try {
        // Analyze downscaled frames to keep the WebView responsive.
        // Retain full sensor resolution for capturing the final photo.
        const preview = analysisCanvasRef.current ?? document.createElement("canvas");
        analysisCanvasRef.current = preview;
        const ratio = Math.min(1, 380 / Math.max(video.videoWidth, video.videoHeight));
        const pw = Math.max(1, Math.round(video.videoWidth * ratio));
        const ph = Math.max(1, Math.round(video.videoHeight * ratio));
        if (preview.width !== pw) preview.width = pw;
        if (preview.height !== ph) preview.height = ph;
        const context = preview.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(video, 0, 0, pw, ph);
        const analyzed = analyzeDocumentFrame(preview, pw, ph);
        const result = analyzed.quad
          ? {
              ...analyzed,
              quad: analyzed.quad.map((p) => ({
                x: p.x * video.videoWidth / pw,
                y: p.y * video.videoHeight / ph,
              })) as Quad,
            }
          : analyzed;
        qualityRef.current = { confidence: result.confidence, edgeScore: result.edgeScore };
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

        const strongDetection = result.stableEnough && result.confidence >= 0.8 && result.edgeScore >= 0.62;
        if (strongDetection && movement < 0.0085) {
          stableFramesRef.current += 1;
        } else if (movement < 0.014 && result.confidence >= 0.68) {
          stableFramesRef.current = Math.max(0, stableFramesRef.current);
        } else {
          stableFramesRef.current = Math.max(0, stableFramesRef.current - 1);
        }
        setStableFrames(stableFramesRef.current);

        if (autoCaptureEnabled && autoArmedRef.current && stableFramesRef.current >= 8) {
          autoArmedRef.current = false;
          stableFramesRef.current = 0;
          setStableFrames(0);
          void shoot(true);
        }
      } finally {
        detectorBusyRef.current = false;
      }
    }, 600);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [open, ready, review, shoot, autoCaptureEnabled]);

  /**
   * نعرض الفريم كاملًا بـ object-contain حتى لا تُقص أطراف الورقة.
   * المساحات المتبقية بيضاء، لذلك لا توجد أشرطة سوداء، والـoverlay يستخدم نفس التحويل.
   */
  const overlayPoints = useMemo(() => {
    const video = videoRef.current;
    if (!detectedQuad || !video || !viewBox.width || !viewBox.height || !video.videoWidth || !video.videoHeight) return "";

    const scale = Math.min(viewBox.width / video.videoWidth, viewBox.height / video.videoHeight);
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

  const releaseReviewImage = () => {
    const image = review?.image;
    if (image && "close" in image && typeof image.close === "function") {
      image.close();
    }
  };

  if (review) {
    return (
      <div className="fixed inset-x-0 top-0 z-50 flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-white text-slate-950" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white p-3">
          <div>
            <p className="text-sm font-semibold">مراجعة حدود الصفحة</p>
            <p className="text-xs text-slate-500">حرّك الزوايا فقط إذا لم تلتصق بالورقة بدقة.</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              releaseReviewImage();
              setReview(null);
              autoArmedRef.current = true;
            }}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
          <ScanCropper
            image={review.image}
            imageWidth={review.width}
            imageHeight={review.height}
            quad={review.quad}
            onChange={(quad) => setReview((current) => (current ? { ...current, quad } : current))}
          />
        </div>

        <div className="shrink-0 space-y-2 border-t border-slate-200 bg-white p-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const detection = detectDocumentRefined(review.image, review.width, review.height);
                setReview((current) =>
                  current
                    ? { ...current, quad: detection?.quad ?? defaultQuad(current.width, current.height) }
                    : current,
                );
              }}
            >
              <Wand2 className="h-4 w-4" />
              إعادة الكشف
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                releaseReviewImage();
                setReview(null);
                autoArmedRef.current = true;
              }}
            >
              <RefreshCcw className="h-4 w-4" />
              إعادة التصوير
            </Button>
          </div>

          <Button
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
            onClick={async () => {
              const current = review;
              await onCapture(current.blob, current.quad);
              releaseReviewImage();
              setReview(null);
              autoArmedRef.current = false;
            }}
          >
            <Check className="h-4 w-4" />
            اعتماد الصفحة
          </Button>
        </div>
      </div>
    );
  }

  const status = !ready
    ? "جارٍ تشغيل الكاميرا…"
    : !detectedQuad
      ? "ضع الورقة كاملة داخل الإطار"
      : !autoCaptureEnabled
        ? "اضغط زر التصوير لمراجعة الحدود قبل الحفظ"
        : confidence < 0.8 || edgeScore < 0.62
          ? "الحواف غير مكتملة — لن يتم الالتقاط"
          : stableFrames < 8
            ? `ثبّت الهاتف: ${Math.max(0, 8 - stableFrames)} قراءات متبقية`
            : "تم تأكيد الحواف — جارٍ التصوير";

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-white text-slate-950" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 p-3 backdrop-blur">
        <div>
          <p className="text-sm font-semibold">ماسح المستندات</p>
          <p className="text-xs text-slate-500">الكشف الحي مساعد؛ التصوير يدوي حتى تفعيل الوضع التلقائي</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-100 p-2">
        <div
          ref={viewportRef}
          className="relative h-full min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-elegant"
        >
          <canvas
            ref={previewCanvasRef}
            className="absolute inset-0 h-full w-full bg-white"
            aria-label="معاينة الكاميرا"
          />
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            disablePictureInPicture
            onCanPlay={() => setReady(true)}
            onPlaying={() => setReady(true)}
            className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
            aria-hidden="true"
          />

          {overlayPoints && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
              preserveAspectRatio="none"
            >
              <polygon
                points={overlayPoints}
                fill="rgb(59 130 246 / 0.06)"
                stroke="rgb(37 99 235)"
                strokeWidth="3"
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
                    r="6"
                    fill="white"
                    stroke="rgb(37 99 235)"
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

          <div className="absolute bottom-4 left-1/2 max-w-[85%] -translate-x-1/2 rounded-full border border-white/60 bg-white/92 px-4 py-2 text-center text-xs font-medium text-slate-900 shadow-md backdrop-blur">
            {status}
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

      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        <div className="flex min-w-0 flex-col gap-2 justify-self-start text-[11px] leading-tight text-slate-600">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={autoCaptureEnabled}
              onChange={(event) => {
                setAutoCaptureEnabled(event.target.checked);
                stableFramesRef.current = 0;
                setStableFrames(0);
              }}
              className="h-4 w-4 accent-blue-600"
            />
            تلقائي
          </label>
          <span>{detectedQuad ? "راجع الحدود بعد التصوير" : "قرب المستند"}</span>
        </div>

        <button
          onClick={() => void shoot(false)}
          disabled={!ready || capturing}
          aria-label="التقاط صفحة يدويًا"
          className="press grid h-16 w-16 place-items-center rounded-full border-4 border-blue-100 bg-blue-600 shadow-lg disabled:opacity-40"
        >
          {capturing ? <Loader2 className="h-7 w-7 animate-spin text-white" /> : <Camera className="h-7 w-7 text-white" />}
        </button>

        <Button onClick={onDone} disabled={pageCount === 0 || capturing} className="justify-self-end">
          <Check className="h-4 w-4" />
          تم
        </Button>
      </div>
    </div>
  );
}
