import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Loader2, FileWarning, PenTool } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { PageOrganizer } from "@/components/editor/PageOrganizer";
import { NetworkStatus } from "@/components/editor/NetworkStatus";
import { useDocument } from "@/lib/editor/use-documents";

export const Route = createFileRoute("/_authenticated/organize/$docId")({
  head: () => ({ meta: [{ title: "تنظيم الصفحات — ساين فورج" }] }),
  component: OrganizePage,
});

function OrganizePage() {
  const { docId } = Route.useParams();
  const { document, src, loading, error } = useDocument(docId);

  return (
    <>
      <PageHeader
        title={document?.title ?? "تنظيم الصفحات"}
        subtitle="محرّك تحرير الصفحات — إعادة ترتيب، تدوير، حذف، دمج، تقسيم واستخراج مع سجل مراجعات كامل."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/editor">
                <ArrowRight className="h-4 w-4" /> رجوع
              </Link>
            </Button>
            {document && (
              <Button asChild className="bg-gradient-brand text-primary-foreground shadow-glow">
                <Link to="/editor/$docId" params={{ docId }}>
                  <PenTool className="h-4 w-4" /> محرّر الحقول
                </Link>
              </Button>
            )}
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
        <PageOrganizer documentId={document.id} title={document.title} src={src} />
      )}
    </>
  );
}
