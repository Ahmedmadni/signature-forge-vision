import { useEffect, useMemo, useRef, useState } from "react";
import type { Pt, Quad } from "@/lib/scan";

interface Props {
  image: CanvasImageSource;
  imageWidth: number;
  imageHeight: number;
  quad: Quad;
  onChange: (q: Quad) => void;
}

/** محرّر حدود الورقة: أربع مقابض قابلة للسحب فوق معاينة الصورة */
export function ScanCropper({ image, imageWidth, imageHeight, quad, onChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 320, h: 240 });
  const dragRef = useRef<number | null>(null);

  const ratio = imageWidth / imageHeight;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      setBox({ w, h: w / ratio });
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [ratio]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(box.w * dpr);
    c.height = Math.round(box.h * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.w, box.h);
    ctx.drawImage(image, 0, 0, box.w, box.h);
  }, [image, box]);

  const toView = (p: Pt) => ({ x: (p.x / imageWidth) * box.w, y: (p.y / imageHeight) * box.h });
  const pts = useMemo(() => quad.map(toView), [quad, box, imageWidth, imageHeight]);

  const move = (e: React.PointerEvent) => {
    const i = dragRef.current;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (i === null || !rect) return;
    const x = Math.min(Math.max(e.clientX - rect.left, 0), box.w);
    const y = Math.min(Math.max(e.clientY - rect.top, 0), box.h);
    const next = [...quad] as Quad;
    next[i] = { x: (x / box.w) * imageWidth, y: (y / box.h) * imageHeight };
    onChange(next);
  };

  const path = pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div
      ref={wrapRef}
      className="relative w-full touch-none overflow-hidden rounded-2xl bg-black"
      style={{ height: box.h }}
      onPointerMove={move}
      onPointerUp={() => (dragRef.current = null)}
      onPointerLeave={() => (dragRef.current = null)}
    >
      <canvas ref={canvasRef} style={{ width: box.w, height: box.h }} className="block" />
      <svg className="pointer-events-none absolute inset-0" width={box.w} height={box.h}>
        <polygon
          points={path}
          fill="hsl(var(--primary) / 0.12)"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
        />
      </svg>
      {pts.map((p, i) => (
        <button
          key={i}
          aria-label={`زاوية ${i + 1}`}
          onPointerDown={(e) => {
            e.preventDefault();
            dragRef.current = i;
          }}
          className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background/70 shadow-glow backdrop-blur"
          style={{ left: p.x, top: p.y }}
        />
      ))}
    </div>
  );
}
