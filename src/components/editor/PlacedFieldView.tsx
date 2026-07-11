import { useRef } from "react";
import { RotateCw, Trash2, PenTool, Type, Calendar, CheckSquare, Stamp, Hash } from "lucide-react";
import { motion } from "framer-motion";
import { type EditorField, fieldMeta } from "@/lib/editor/types";
import { cn } from "@/lib/utils";

const icons = {
  signature: PenTool,
  initials: Hash,
  date: Calendar,
  text: Type,
  checkbox: CheckSquare,
  stamp: Stamp,
} as const;

interface Props {
  field: EditorField;
  pageWidth: number;
  pageHeight: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<EditorField>) => void;
  onRemove: () => void;
  onCommit?: () => void;
  onEdit?: () => void;
}

export function PlacedFieldView({
  field,
  pageWidth,
  pageHeight,
  selected,
  onSelect,
  onChange,
  onRemove,
  onCommit,
  onEdit,
}: Props) {
  const meta = fieldMeta[field.type];
  const Icon = icons[field.type];
  const ref = useRef<HTMLDivElement>(null);

  const left = field.xPct * pageWidth;
  const top = field.yPct * pageHeight;
  const w = field.wPct * pageWidth;
  const h = field.hPct * pageHeight;

  // سحب لتحريك الحقل
  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).dataset.handle) return;
    e.stopPropagation();
    onSelect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = field.xPct;
    const origY = field.yPct;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / pageWidth;
      const dy = (ev.clientY - startY) / pageHeight;
      onChange({
        xPct: Math.min(Math.max(origX + dx, 0), 1 - field.wPct),
        yPct: Math.min(Math.max(origY + dy, 0), 1 - field.hPct),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onCommit?.();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // تغيير الحجم من الزاوية
  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = field.wPct;
    const origH = field.hPct;
    const move = (ev: PointerEvent) => {
      const dw = (ev.clientX - startX) / pageWidth;
      const dh = (ev.clientY - startY) / pageHeight;
      onChange({
        wPct: Math.min(Math.max(origW + dw, 0.03), 1 - field.xPct),
        hPct: Math.min(Math.max(origH + dh, 0.02), 1 - field.yPct),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onCommit?.();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // الدوران
  const startRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    const rect = ref.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const move = (ev: PointerEvent) => {
      const angle = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
      onChange({ rotation: Math.round(angle) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onCommit?.();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onPointerDown={startDrag}
      className={cn(
        "group absolute cursor-move touch-none select-none rounded-md border-2",
        selected ? "border-primary shadow-glow" : "border-dashed",
      )}
      style={{
        left,
        top,
        width: w,
        height: h,
        transform: `rotate(${field.rotation}deg)`,
        opacity: field.opacity,
        borderColor: selected ? undefined : `color-mix(in oklch, ${meta.color} 60%, transparent)`,
        background: `color-mix(in oklch, ${meta.color} 12%, transparent)`,
      }}
    >
      <div className="flex h-full w-full items-center justify-center gap-1 overflow-hidden px-1 text-center">
        {field.type === "checkbox" ? (
          <CheckSquare className="h-full w-full p-0.5" style={{ color: meta.color }} />
        ) : field.value ? (
          <span
            className="truncate text-[11px] font-medium"
            style={{ color: meta.color }}
          >
            {field.value}
          </span>
        ) : (
          <>
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
            <span className="truncate text-[10px] font-medium" style={{ color: meta.color }}>
              {meta.label}
            </span>
          </>
        )}
      </div>

      {selected && (
        <>
          {/* مقبض تغيير الحجم */}
          <div
            data-handle="resize"
            onPointerDown={startResize}
            className="absolute -bottom-1.5 -left-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-background bg-primary"
          />
          {/* مقبض الدوران */}
          <div
            data-handle="rotate"
            onPointerDown={startRotate}
            className="absolute -top-7 left-1/2 grid h-5 w-5 -translate-x-1/2 cursor-grab place-items-center rounded-full border-2 border-background bg-accent"
          >
            <RotateCw className="h-3 w-3 text-accent-foreground" />
          </div>
          {/* حذف */}
          <button
            data-handle="delete"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRemove}
            className="absolute -top-2 -right-2 grid h-5 w-5 place-items-center rounded-full border-2 border-background bg-destructive text-destructive-foreground"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </>
      )}
    </motion.div>
  );
}
