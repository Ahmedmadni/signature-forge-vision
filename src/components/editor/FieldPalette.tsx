import { PenTool, Type, Calendar, CheckSquare, Stamp, Hash, GripVertical } from "lucide-react";
import { motion } from "framer-motion";
import { type FieldType, fieldMeta } from "@/lib/editor/types";

const items: { type: FieldType; icon: typeof PenTool }[] = [
  { type: "signature", icon: PenTool },
  { type: "initials", icon: Hash },
  { type: "date", icon: Calendar },
  { type: "text", icon: Type },
  { type: "checkbox", icon: CheckSquare },
  { type: "stamp", icon: Stamp },
];

interface Props {
  onPick: (type: FieldType) => void;
  armed: FieldType | null;
}

export function FieldPalette({ onPick, armed }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">
        اسحب حقلًا إلى المستند أو انقر لتفعيله ثم انقر على الصفحة.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ type, icon: Icon }, i) => {
          const meta = fieldMeta[type];
          const active = armed === type;
          return (
            <motion.button
              key={type}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              draggable
              onDragStart={(e) => {
                (e as unknown as React.DragEvent).dataTransfer.setData("field-type", type);
              }}
              onClick={() => onPick(type)}
              className={`group flex items-center gap-2 rounded-xl border p-2.5 text-right transition-all hover:border-primary/50 hover:shadow-elegant ${
                active ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-card"
              }`}
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                style={{ background: `color-mix(in oklch, ${meta.color} 15%, transparent)` }}
              >
                <Icon className="h-4 w-4" style={{ color: meta.color }} />
              </span>
              <span className="flex-1 text-xs font-medium">{meta.label}</span>
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
