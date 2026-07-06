import { type LoadedPdf, PdfPageCanvas } from "@/lib/editor/use-pdf-document";
import { cn } from "@/lib/utils";

interface Props {
  pdf: LoadedPdf;
  currentPage: number;
  fieldCounts: Record<number, number>;
  onSelect: (page: number) => void;
}

export function ThumbnailSidebar({ pdf, currentPage, fieldCounts, onSelect }: Props) {
  return (
    <div className="space-y-3">
      {Array.from({ length: pdf.numPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onSelect(n)}
          className={cn(
            "group relative block w-full overflow-hidden rounded-lg border-2 bg-card transition-all",
            currentPage === n
              ? "border-primary shadow-glow"
              : "border-border hover:border-primary/40",
          )}
        >
          <PdfPageCanvas pdf={pdf} pageNumber={n} width={130} className="w-full" />
          <div className="flex items-center justify-between px-2 py-1 text-[11px]">
            <span className={cn("font-medium", currentPage === n && "text-primary")}>
              صفحة {n}
            </span>
            {fieldCounts[n] > 0 && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-gradient-brand px-1 text-[9px] font-bold text-primary-foreground">
                {fieldCounts[n]}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
