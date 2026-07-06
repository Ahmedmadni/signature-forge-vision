import { useState } from "react";
import { Copy, Layers } from "lucide-react";
import { type ApplyScope, type EditorField, fieldMeta } from "@/lib/editor/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface Props {
  field: EditorField | null;
  pageCount: number;
  currentPage: number;
  onChange: (patch: Partial<EditorField>) => void;
  onApply: (scope: ApplyScope) => void;
}

const scopes: { key: ApplyScope["kind"]; label: string }[] = [
  { key: "current", label: "الصفحة الحالية" },
  { key: "all", label: "كل الصفحات" },
  { key: "odd", label: "الفردية" },
  { key: "even", label: "الزوجية" },
  { key: "range", label: "نطاق مخصص" },
];

export function PropertiesPanel({ field, pageCount, currentPage, onChange, onApply }: Props) {
  const [scopeKind, setScopeKind] = useState<ApplyScope["kind"]>("all");
  const [rangeText, setRangeText] = useState("");

  if (!field) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border p-8 text-center">
        <Layers className="mb-2 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">اختر حقلًا لتعديل خصائصه.</p>
      </div>
    );
  }

  const meta = fieldMeta[field.type];

  const doApply = () => {
    if (scopeKind === "range") onApply({ kind: "range", text: rangeText });
    else onApply({ kind: scopeKind } as ApplyScope);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ background: meta.color }}
        />
        <span className="text-sm font-semibold">{meta.label}</span>
        <span className="ms-auto text-xs text-muted-foreground">صفحة {field.page}</span>
      </div>

      {field.type !== "checkbox" && field.type !== "signature" && field.type !== "stamp" && (
        <div className="space-y-1.5">
          <Label className="text-xs">القيمة</Label>
          <Input
            value={field.value ?? ""}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder={field.type === "date" ? "التاريخ" : "أدخل نصًا"}
          />
        </div>
      )}

      <SliderRow
        label="الشفافية"
        value={Math.round(field.opacity * 100)}
        suffix="%"
        min={10}
        max={100}
        onChange={(v) => onChange({ opacity: v / 100 })}
      />
      <SliderRow
        label="الدوران"
        value={field.rotation}
        suffix="°"
        min={-180}
        max={180}
        onChange={(v) => onChange({ rotation: v })}
      />
      <SliderRow
        label="العرض"
        value={Math.round(field.wPct * 100)}
        suffix="%"
        min={3}
        max={100}
        onChange={(v) => onChange({ wPct: Math.min(v / 100, 1 - field.xPct) })}
      />
      <SliderRow
        label="الارتفاع"
        value={Math.round(field.hPct * 100)}
        suffix="%"
        min={2}
        max={100}
        onChange={(v) => onChange({ hPct: Math.min(v / 100, 1 - field.yPct) })}
      />

      <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
        <Label className="flex items-center gap-1.5 text-xs font-semibold">
          <Copy className="h-3.5 w-3.5" /> تطبيق على الصفحات
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {scopes.map((s) => (
            <button
              key={s.key}
              onClick={() => setScopeKind(s.key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                scopeKind === s.key
                  ? "bg-gradient-brand text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {scopeKind === "range" && (
          <Input
            value={rangeText}
            onChange={(e) => setRangeText(e.target.value)}
            placeholder="مثال: 1-3, 5, 8-10"
            className="h-8 text-xs"
          />
        )}
        <p className="text-[11px] text-muted-foreground">
          ينسخ هذا الحقل بخصائصه إلى الصفحات المختارة (من إجمالي {pageCount}).
        </p>
        <Button size="sm" className="w-full" onClick={doApply}>
          تطبيق النسخ
        </Button>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  suffix,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
