import { useEffect } from "react";
import { motion } from "framer-motion";
import { History, RotateCcw, Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type EditorStore } from "@/lib/editor/use-editor-store";

interface Props {
  store: EditorStore;
}

export function VersionHistoryPanel({ store }: Props) {
  useEffect(() => {
    void store.refreshVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
          <History className="h-4 w-4 text-primary" /> سجل الإصدارات
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => void store.saveVersion()}
        >
          <Save className="h-3.5 w-3.5" /> حفظ إصدار
        </Button>
      </div>

      {store.versions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <Clock className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">لا توجد إصدارات محفوظة بعد.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            احفظ إصدارًا للرجوع إليه لاحقًا.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {store.versions.map((v, i) => (
            <motion.li
              key={v.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {v.label || `الإصدار ${v.version_number}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(v.created_at).toLocaleString("ar-EG")} · {v.modified_count} حقل
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                title="استعادة هذا الإصدار"
                onClick={() => void store.restoreVersion(v.id)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
