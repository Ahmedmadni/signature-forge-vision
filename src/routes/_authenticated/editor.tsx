import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Download, Send } from "lucide-react";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

export const Route = createFileRoute("/_authenticated/editor")({
  head: () => ({ meta: [{ title: "محرّر المستندات — ساين فورج" }] }),
  component: EditorPage,
});

function EditorPage() {
  return (
    <>
      <PageHeader
        title="محرّر المستندات والتوقيع"
        subtitle="ضع حقول التوقيع والبيانات، وطبّقها عبر الصفحات، مع حفظ تلقائي وتراجع/إعادة."
        actions={
          <div className="flex gap-2">
            <Button variant="outline"><Download className="h-4 w-4" /> تنزيل</Button>
            <Button className="bg-gradient-brand text-primary-foreground shadow-glow">
              <Send className="h-4 w-4" /> إرسال للتوقيع
            </Button>
          </div>
        }
      />
      <DocumentEditor
        docId="sample-contract"
        title="اتفاقية خدمات رئيسية"
        src="/sample-contract.pdf"
      />
    </>
  );
}
