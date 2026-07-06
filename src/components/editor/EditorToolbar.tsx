import {
  ZoomIn, ZoomOut, Maximize, MoveHorizontal, Undo2, Redo2,
  Check, Loader2, PanelLeft, PanelRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type SaveStatus } from "@/lib/editor/use-editor-store";

interface Props {
  zoom: number;
  saveStatus: SaveStatus;
  canUndo: boolean;
  canRedo: boolean;
  onZoom: (delta: number) => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleThumbs: () => void;
  onToggleProps: () => void;
}

function TB({ label, children, ...rest }: any & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" {...rest}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function EditorToolbar({
  zoom, saveStatus, canUndo, canRedo,
  onZoom, onFitWidth, onFitPage, onUndo, onRedo, onToggleThumbs, onToggleProps,
}: Props) {
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-border bg-card/80 px-2 py-1.5 shadow-elegant backdrop-blur">
      <TB label="الصفحات" onClick={onToggleThumbs}><PanelRight className="h-4 w-4" /></TB>
      <div className="mx-1 h-5 w-px bg-border" />

      <TB label="تراجع" onClick={onUndo} disabled={!canUndo}><Undo2 className="h-4 w-4" /></TB>
      <TB label="إعادة" onClick={onRedo} disabled={!canRedo}><Redo2 className="h-4 w-4" /></TB>
      <div className="mx-1 h-5 w-px bg-border" />

      <TB label="تصغير" onClick={() => onZoom(-0.15)}><ZoomOut className="h-4 w-4" /></TB>
      <span className="w-12 text-center text-xs font-medium tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <TB label="تكبير" onClick={() => onZoom(0.15)}><ZoomIn className="h-4 w-4" /></TB>
      <TB label="ملء العرض" onClick={onFitWidth}><MoveHorizontal className="h-4 w-4" /></TB>
      <TB label="ملء الصفحة" onClick={onFitPage}><Maximize className="h-4 w-4" /></TB>

      <div className="mx-1 h-5 w-px bg-border" />
      <div className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
        {saveStatus === "saving" ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> جارٍ الحفظ</>
        ) : (
          <><Check className="h-3.5 w-3.5 text-success" /> تم الحفظ</>
        )}
      </div>

      <div className="ms-auto flex items-center">
        <TB label="الخصائص" onClick={onToggleProps}><PanelLeft className="h-4 w-4" /></TB>
      </div>
    </div>
  );
}
