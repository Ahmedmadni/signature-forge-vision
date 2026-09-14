import { useEffect, useRef, useState } from "react";
import { Camera, Check, Images, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playSfx, haptic } from "@/lib/sfx";

interface Props {
  open: boolean;
  pageCount: number;
  lastPreview?: string | null;
  onClose: () => void;
  onDone: () => void;
  onCapture: (blob: Blob) => Promise<void> | void;
}

/** كاميرا مباشرة بدقة عالية مع جلسة مسح متعددة الصفحات */
export function CameraCapture({ open, pageCount, lastPreview, onClose, onDone, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setReady(false);

    navigator.mediaDevices
      ?.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 3000 },
          height: { ideal: 3000 },
        },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
        setReady(true);
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

  if (!open) return null;

  const shoot = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || capturing) return;

    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      playSfx("place");
      haptic();

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("capture-failed"))), "image/jpeg", 0.95);
      });

      await onCapture(blob);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border bg-card/95 p-3 backdrop-blur">
        <div>
          <p className="text-sm font-semibold">مسح متعدد الصفحات</p>
          <p className="text-xs text-muted-foreground">صوّر كل صفحة وسيتم اكتشاف حدودها وقصّها تلقائيًا</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative flex-1 overflow-hidden bg-muted/30 p-3">
        <div className="relative h-full overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
          <video ref={videoRef} playsInline muted className="h-full w-full object-contain" />
          <div className="pointer-events-none absolute inset-[7%] rounded-2xl border-2 border-primary/75 shadow-[0_0_0_9999px_hsl(var(--background)/0.16)]" />

          <div className="absolute start-3 top-3 flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
            <Images className="h-4 w-4 text-primary" />
            {pageCount} صفحة
          </div>

          {lastPreview && (
            <div className="absolute bottom-3 start-3 overflow-hidden rounded-xl border-2 border-background bg-card shadow-lg">
              <img src={lastPreview} alt="آخر صفحة" className="h-16 w-12 object-cover" />
            </div>
          )}

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
        <div className="justify-self-start text-xs text-muted-foreground">{pageCount ? "يمكنك متابعة التصوير" : "ابدأ بالصفحة الأولى"}</div>

        <button
          onClick={shoot}
          disabled={!ready || capturing}
          aria-label="التقاط صفحة"
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
