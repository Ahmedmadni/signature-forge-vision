import { useEffect, useRef, useState } from "react";
import { PenTool, Type, Upload, Eraser, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FONTS = [
  "'Segoe Script', 'Brush Script MT', cursive",
  "Georgia, serif",
  "'Courier New', monospace",
  "'Space Grotesk Variable', sans-serif",
];

type Tab = "draw" | "type" | "upload";

/** يقصّ المساحة الشفافة حول التوقيع ويعيد data URL نظيفًا */
function trim(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let top = height, left = width, right = 0, bottom = 0, found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        found = true;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (!found) return null;
  const pad = 8;
  left = Math.max(left - pad, 0);
  top = Math.max(top - pad, 0);
  right = Math.min(right + pad, width - 1);
  bottom = Math.min(bottom + pad, height - 1);
  const out = document.createElement("canvas");
  out.width = right - left + 1;
  out.height = bottom - top + 1;
  out.getContext("2d")!.drawImage(canvas, left, top, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

interface Props {
  saving?: boolean;
  onConfirm: (dataUrl: string, type: "drawn" | "typed" | "uploaded") => void;
  confirmLabel?: string;
}

export function SignatureCapture({ onConfirm, saving, confirmLabel = "حفظ التوقيع" }: Props) {
  const [tab, setTab] = useState<Tab>("draw");
  const [typed, setTyped] = useState("");
  const [font, setFont] = useState(FONTS[0]);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || tab !== "draw") return;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    hasInk.current = false;
  }, [tab]);

  const point = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    hasInk.current = false;
  };

  const submit = () => {
    if (tab === "draw") {
      if (!hasInk.current) return;
      const url = trim(canvasRef.current!);
      if (url) onConfirm(url, "drawn");
      return;
    }
    if (tab === "upload") {
      if (uploaded) onConfirm(uploaded, "uploaded");
      return;
    }
    const text = typed.trim();
    if (!text) return;
    const c = document.createElement("canvas");
    c.width = 900;
    c.height = 260;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `84px ${font}`;
    ctx.fillText(text, c.width / 2, c.height / 2);
    const url = trim(c);
    if (url) onConfirm(url, "typed");
  };

  const tabs: { id: Tab; label: string; icon: typeof PenTool }[] = [
    { id: "draw", label: "رسم", icon: PenTool },
    { id: "type", label: "كتابة", icon: Type },
    { id: "upload", label: "صورة", icon: Upload },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-gradient-brand text-primary-foreground shadow-glow" : "text-muted-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "draw" && (
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drawing.current = true;
              const ctx = canvasRef.current!.getContext("2d")!;
              const p = point(e);
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              const ctx = canvasRef.current!.getContext("2d")!;
              const p = point(e);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
              hasInk.current = true;
            }}
            onPointerUp={() => (drawing.current = false)}
            onPointerLeave={() => (drawing.current = false)}
            className="h-48 w-full touch-none rounded-2xl border border-dashed border-border bg-white"
          />
          <Button variant="outline" size="sm" type="button" onClick={clear}>
            <Eraser className="h-4 w-4" /> مسح
          </Button>
        </div>
      )}

      {tab === "type" && (
        <div className="space-y-3">
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="اكتب اسمك" />
          <div className="grid grid-cols-2 gap-2">
            {FONTS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFont(f)}
                className={`flex h-16 items-center justify-center overflow-hidden rounded-xl border bg-white text-2xl ${
                  font === f ? "border-primary ring-2 ring-primary/40" : "border-border"
                }`}
                style={{ fontFamily: f, color: "#0f172a" }}
              >
                {typed.trim() || "توقيعك"}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "upload" && (
        <div className="space-y-3">
          <label className="flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
            {uploaded ? (
              <img src={uploaded} alt="التوقيع المرفوع" className="max-h-40 object-contain" />
            ) : (
              <>
                <Upload className="h-6 w-6" />
                اختر صورة توقيع (PNG شفافة مفضّلة)
              </>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setUploaded(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
          </label>
        </div>
      )}

      <Button
        type="button"
        onClick={submit}
        disabled={saving}
        className="w-full bg-gradient-brand text-primary-foreground shadow-glow"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {confirmLabel}
      </Button>
    </div>
  );
}
