import { useEffect, useMemo, useRef, useState } from "react";
import type { Pt, Quad } from "@/lib/scan";

interface Props {
  image: CanvasImageSource;
  imageWidth: number;
  imageHeight: number;
  quad: Quad;
  onChange: (q: Quad) => void;
}

/** محرّر حدود الورقة: معاينة فاتحة وواضحة مع أربع زوايا قابلة للسحب. */
export function ScanCropper({ image, imageWidth, imageHeight, quad, onChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 320, h: 240 });
  const dragRef = useRef<number | null>(null);

  const ratio = imageWidth / imageHeight;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !Number.isFinite(ratio) || ratio <= 0) return;

    const update = () => {
      const availableWidth = Math.max(1, el.clientWidth);
      // Leave room for review header, editing actions and Android system bars.
      const maxHeight = Math.min(window.innerHeight * 0.46, 580);
      let w = availableWidth;
      let h = w / ratio;

      if (h > maxHeight) {
        h = maxHeight;
        w = h * ratio;
      }

      setBox({ w, h });
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    update();

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [ratio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !box.w || !box.h) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(box.w * dpr));
    canvas.height = Math.max(1, Math.round(box.h * dpr));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.w, box.h);

    // لا نترك أي شفافية تكشف خلفية الوضع الداكن.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, box.w, box.h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, box.w, box.h);
  }, [image, box]);

  const offsetX = Math.max(0, (Math.max(box.w, wrapRef.current?.clientWidth ?? box.w) - box.w) / 2);

  const toView = (point: Pt) => ({
    x: offsetX + (point.x / imageWidth) * box.w,
    y: (point.y / imageHeight) * box.h,
  });

  const pts = useMemo(
    () => quad.map(toView),
    // offsetX is derived from the current measured container and box.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quad, box, imageWidth, imageHeight, offsetX],
  );

  const move = (event: React.PointerEvent) => {
    const index = dragRef.current;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (index === null || !rect) return;

    const localX = event.clientX - rect.left - offsetX;
    const localY = event.clientY - rect.top;
    const x = Math.min(Math.max(localX, 0), box.w);
    const y = Math.min(Math.max(localY, 0), box.h);

    const next = [...quad] as Quad;
    next[index] = {
      x: (x / box.w) * imageWidth,
      y: (y / box.h) * imageHeight,
    };
    onChange(next);
  };

  const path = pts.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div
      ref={wrapRef}
      className="relative flex w-full min-w-0 touch-none justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
      style={{ height: box.h }}
      onPointerMove={move}
      onPointerUp={() => (dragRef.current = null)}
      onPointerCancel={() => (dragRef.current = null)}
      onPointerLeave={() => (dragRef.current = null)}
    >
      <canvas
        ref={canvasRef}
        width={Math.max(1, Math.round(box.w))}
        height={Math.max(1, Math.round(box.h))}
        style={{ width: box.w, height: box.h }}
        className="block bg-white"
      />

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        width="100%"
        height="100%"
      >
        <polygon
          points={path}
          fill="rgb(59 130 246 / 0.05)"
          stroke="rgb(37 99 235)"
          strokeWidth={3}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {pts.map((point, index) => (
        <button
          key={index}
          aria-label={`زاوية ${index + 1}`}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture?.(event.pointerId);
            dragRef.current = index;
          }}
          className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-blue-600 bg-white shadow-xl outline-none ring-2 ring-white/80"
          style={{ left: point.x, top: point.y }}
        >
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600" />
        </button>
      ))}
    </div>
  );
}
