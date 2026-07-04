import { cn } from "@/lib/utils";
import { statusMeta, type DocStatus } from "@/lib/mock-data";

export function StatusBadge({ status }: { status: DocStatus }) {
  const m = statusMeta[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", m.className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}
