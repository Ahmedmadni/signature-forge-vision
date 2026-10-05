import { useEffect, useRef, useState } from "react";
import type { Pt, Quad } from "@/lib/scan";

interface Props {
  image: CanvasImageSource;
  imageWidth: number;
  imageHeight: number;
  quad: Quad;
  onChange: (q: Quad) => void;
}

type Drag = { index: number; pointerId: number };

/**
 * Keep live corner dragging inside this small component. Updating the page in the
 * parent on every pointer event can stall the WebView on mid-range Android phones.
 * Only commit a completed drag to the parent when the user lifts their finger.
 */
export function ScanCropper({ image, imageWidth, imageHeight, quad, onChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const pointsRef = useRef<Quad>(quad);
  const [workingQuad, setWorkingQuad] = useState<Quad>(quad);
  const [active, setActive] = useState<number | null>(null);
  const [size, setSize] = useState({ outer: 320, width: 320, height: 240 });
  const ratio = imageWidth / imageHeight;

  // Manual "re-detect" and "full image" actions change the authoritative
  // quad. Do not overwrite a corner while it is being dragged.
  useEffect(() => {
    if (dragRef.current) return;
    pointsRef.current = quad;
    setWorkingQuad(quad);
  }, [quad]);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element || !Number.isFinite(ratio) || ratio <= 0) return;

    const update = () => {
      const outer = Math.max(1, element.clientWidth);
      const maxHeight = Math.min(window.innerHeight * 0.46, 580);
      const height = Math.min(outer / ratio, Math.max(100, maxHeight));
      const width = Math.min(outer, height * ratio);
      setSize((previous) =>
        previous.outer === outer && Math.abs(previous.width - width) < 0.1 && Math.abs(previous.height - height) < 0.1
          ? previous
          : { outer, width, height },
      );
    };

    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [ratio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width < 1 || size.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(size.width * dpr));
    canvas.height = Math.max(1, Math.round(size.height * dpr));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, size.width, size.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, size.width, size.height);
  }, [image, size]);

  const left = Math.max(0, (size.outer - size.width) / 2);
  const right = (point: Pt) => ({
    x: left + (point.x / imageWidth) * size.width,
    y: (point.y / imageHeight) * size.height,
  });

  const points = workingQuad.map(right);
  const path = points.map((p) => `${p.x},${p.y}`).join(" ");

  const drawZoom = (point: Pt) => {
    const canvas = zoomRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const sourceWindow = Math.max(18, Math.round(Math.min(imageWidth, imageHeight) * 0.095));
    const half = sourceWindow / 2;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    // Clip out-of-bounds pixels instead of wrapping around the photo edges.
    context.save();
    context.beginPath();
    context.rect(0, 0, canvas.width, canvas.height);
    context.clip();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      (half - point.x) * canvas.width / sourceWindow,
      (half - point.y) * canvas.height / sourceWindow,
      imageWidth * canvas.width / sourceWindow,
      imageHeight * canvas.height / sourceWindow,
    );
    context.strokeStyle = "#2563eb";
    context.lineWidth = 1.8;
    context.beginPath();
    context.moveTo(canvas.width / 2, 10);
    context.lineTo(canvas.width / 2, canvas.height - 10);
    context.moveTo(10, canvas.height / 2);
    context.lineTo(canvas.width - 10, canvas.height / 2);
    context.stroke();
    context.restore();
  };

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!drag || drag.pointerId !== event.pointerId || !rect) return;

    const px = Math.max(0, Math.min(size.width, event.clientX - rect.left - left));
    const py = Math.max(0, Math.min(size.height, event.clientY - rect.top));
    const point: Pt = {
      x: px * imageWidth / Math.max(1, size.width),
      y: py * imageHeight / Math.max(1, size.height),
    };
    const next = [...pointsRef.current] as Quad;
    next[drag.index] = point;
    pointsRef.current = next;
    setWorkingQuad(next);
    drawZoom(point);
  };

  const finish = (pointerId: number, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    dragRef.current = null;
    setActive(null);
    if (cancelled) {
      pointsRef.current = quad;
      setWorkingQuad(quad);
      return;
    }
    onChange(pointsRef.current);
  };

  return (
    <div
      ref={wrapRef}
      className="relative flex w-full min-w-0 touch-none justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
      style={{ height: size.height }}
      onPointerMove={move}
      onPointerUp={(event) => finish(event.pointerId)}
      onPointerCancel={(event) => finish(event.pointerId, true)}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size.width, height: size.height }}
        className="block bg-white"
        aria-label="صورة المستند لمراجعة الحدود"
      />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" width="100%" height="100%">
        <polygon
          points={path}
          fill="rgb(59 130 246 / 0.05)"
          stroke="rgb(37 99 235)"
          strokeWidth={3}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {points.map((point, index) => (
        <button
          type="button"
          key={index}
          aria-label={`زاوية ${index + 1}`}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture?.(event.pointerId);
            dragRef.current = { index, pointerId: event.pointerId };
            setActive(index);
            drawZoom(pointsRef.current[index]);
          }}
          className="absolute h-11 w-11 touch-none -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-blue-600 bg-white shadow-xl outline-none ring-2 ring-white/80 focus-visible:ring-4 focus-visible:ring-blue-400"
          style={{ left: point.x, top: point.y }}
        >
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600" />
        </button>
      ))}
      <div className={`pointer-events-none absolute end-2 top-2 z-10 rounded-xl border-2 border-blue-600 bg-white p-1 shadow-xl ${active === null ? "hidden" : ""}`}>
        <canvas ref={zoomRef} width={112} height={112} className="block h-28 w-28 rounded-md" aria-label="عدسة تكبير موضع الزاوية" />
      </div>
    </div>
  );
}
