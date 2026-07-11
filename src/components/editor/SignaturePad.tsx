import { useEffect, useRef, useState } from "react";
import { PenTool, Type, Eraser, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  kind: "signature" | "initials" | "stamp";
  onClose: () => void;
  onConfirm: (dataUrl: string) => void;
}

const titles = {
  signature: "إنشاء توقيع",
  initials: "إنشاء الأحرف الأولى",
  stamp: "إنشاء ختم",
};

const fonts = [
  "'Segoe Script', cursive",
  "'Brush Script MT', cursive",
  "Georgia, serif",
  "'Courier New', monospace",
];

export function SignaturePad({ open, kind, onClose, onConfirm }: Props) {
  const [tab, setTab] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");
  const [font, setFont] = useState(fonts[0]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setTyped("");
      hasInkRef.current = false;
    }
  }, [open]);

  const getCtx = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    return ctx;
  };

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    hasInkRef.current = false;
  };

  const start = (e: React.PointerEvent) => {
    drawingRef.current = true;
    const ctx = getCtx();
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const ctx = getCtx();
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    hasInkRef.current = true;
  };
  const end = () => {
    drawingRef.current = false;
  };

  const confirm = () => {
    if (tab === "draw") {
      if (!hasInkRef.current) return;
      onConfirm(canvasRef.current!.toDataURL("image/png"));
    } else {
      const text = typed.trim();
      if (!text) return;
      const c = document.createElement("canvas");
      c.width = 600;
      c.height = 200;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `64px ${font}`;
      ctx.fillText(text, c.width / 2, c.height / 2);
      onConfirm(c.toDataURL("image/png"));
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titles[kind]}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <button
            onClick={() => setTab("draw")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              tab === "draw" ? "bg-gradient-brand text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <PenTool className="h-4 w-4" /> رسم
          </button>
          <button
            onClick={() => setTab("type")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              tab === "type" ? "bg-gradient-brand text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <Type className="h-4 w-4" /> كتابة
          </button>
        </div>

        {tab === "draw" ? (
          <div className="space-y-2">
            <canvas
              ref={canvasRef}
              width={468}
              height={200}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
              className="w-full touch-none rounded-xl border border-border bg-white"
              style={{ height: 200 }}
            />
            <Button variant="outline" size="sm" onClick={clearCanvas}>
              <Eraser className="h-4 w-4" /> مسح
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="اكتب اسمك"
            />
            <div className="grid grid-cols-2 gap-2">
              {fonts.map((f) => (
                <button
                  key={f}
                  onClick={() => setFont(f)}
                  className={`flex h-16 items-center justify-center rounded-xl border bg-white text-2xl ${
                    font === f ? "border-primary ring-2 ring-primary/40" : "border-border"
                  }`}
                  style={{ fontFamily: f, color: "#0f172a" }}
                >
                  {typed.trim() || "توقيع"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button className="bg-gradient-brand text-primary-foreground" onClick={confirm}>
            <Check className="h-4 w-4" /> تأكيد
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
