import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Download, Send, Loader2, FileWarning, Layers } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { NetworkStatus } from "@/components/editor/NetworkStatus";
import { useDocument } from "@/lib/editor/use-documents";

export const Route = createFileRoute("/_authenticated/editor/$docId")({
  head: () => ({ meta: [{ title: "تحرير مستند — ساين فورج" }] }),
  component: EditorPage,
});

function EditorPage() {
  const { docId } = Route.useParams();
  const { document, src, loading, error } = useDocument(docId);

  return (
    <>
      <PageHeader
        title={document?.title ?? "تحرير المستند"}
        subtitle="ضع حقول التوقيع والبيانات — حفظ تلقائي دائم مع سجل إصدارات."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/editor"><ArrowRight className="h-4 w-4" /> رجوع</Link>
            </Button>
            <Button variant="outline"><Download className="h-4 w-4" /> تنزيل</Button>
            <Button className="bg-gradient-brand text-primary-foreground shadow-glow">
              <Send className="h-4 w-4" /> إرسال للتوقيع
            </Button>
          </div>
        }
      />
      <NetworkStatus />

      {loading ? (
        <div className="grid h-[70vh] place-items-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>جارٍ تحميل المستند…</p>
          </div>
        </div>
      ) : error || !document || !src ? (
        <div className="grid h-[70vh] place-items-center">
          <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
            <FileWarning className="h-10 w-10 text-destructive" />
            <p className="font-medium">تعذّر فتح المستند</p>
            <p className="text-sm">{error}</p>
            <Button variant="outline" asChild className="mt-2">
              <Link to="/editor">العودة للمستندات</Link>
            </Button>
          </div>
        </div>
      ) : (
        <DocumentEditor docId={document.id} title={document.title} src={src} />
      )}
    </>
  );
}
