import { useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FileText, Upload, Loader2, PenTool, Inbox } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useDocuments, uploadDocument } from "@/lib/editor/use-documents";
import { NetworkStatus } from "@/components/editor/NetworkStatus";
import type { DocStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/editor/")({
  head: () => ({ meta: [{ title: "محرّر المستندات — ساين فورج" }] }),
  component: EditorLauncher,
});

function EditorLauncher() {
  const { documents, loading, error, refresh } = useDocuments();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const doc = await uploadDocument(file);
      await refresh();
      navigate({ to: "/editor/$docId", params: { docId: doc.id } });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="محرّر المستندات والتوقيع"
        subtitle="ارفع مستندًا لبدء وضع حقول التوقيع مع حفظ تلقائي دائم."
        actions={
          <Button
            className="bg-gradient-brand text-primary-foreground shadow-glow"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            رفع مستند
          </Button>
        }
      />
      <NetworkStatus />
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {uploadError && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {uploadError}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-10 text-center">
          <p className="text-sm text-destructive">تعذّر تحميل المستندات: {error}</p>
          <Button variant="outline" className="mt-4" onClick={() => void refresh()}>
            إعادة المحاولة
          </Button>
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">لا توجد مستندات بعد</p>
          <p className="mt-1 text-sm text-muted-foreground">ارفع أول مستند لبدء التحرير والتوقيع.</p>
          <Button
            className="mt-5 bg-gradient-brand text-primary-foreground shadow-glow"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> رفع مستند
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                to="/editor/$docId"
                params={{ docId: doc.id }}
                className="group flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-elegant transition-colors hover:border-primary/50"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.file_type.toUpperCase()} · {doc.page_count} صفحة
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <StatusBadge status={doc.status as DocStatus} />
                  <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    <PenTool className="h-3.5 w-3.5" /> تحرير
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
