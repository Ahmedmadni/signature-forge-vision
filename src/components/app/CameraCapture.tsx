import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playSfx, haptic } from "@/lib/sfx";

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
}

/** كاميرا مباشرة بدقة عالية لالتقاط صور المستندات */
export function CameraCapture({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

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
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    playSfx("place");
    haptic();
    canvas.toBlob((b) => b && onCapture(b), "image/jpeg", 0.95);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm">صوّر المستند داخل الإطار</span>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:text-white">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="h-full w-full object-contain" />
        <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-dashed border-white/50" />
        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center text-white">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-white">
            {error}
          </div>
        )}
      </div>

      <div className="grid place-items-center p-6">
        <button
          onClick={shoot}
          disabled={!ready}
          aria-label="التقاط"
          className="press grid h-18 w-18 place-items-center rounded-full bg-white p-5 shadow-glow disabled:opacity-40"
        >
          <Camera className="h-7 w-7 text-black" />
        </button>
      </div>
    </div>
  );
}
