import { createFileRoute } from "@tanstack/react-router";
import { Check, Gauge, FileText, SlidersHorizontal } from "lucide-react";
import {
  PAGE_SIZE_OPTIONS,
  QUALITY_OPTIONS,
  setScanSettings,
  useScanSettings,
} from "@/lib/scan-settings";
import { haptic, playSfx } from "@/lib/sfx";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "إعدادات المسح — وقِّع" },
      {
        name: "description",
        content: "اضبط جودة المسح الضوئي ومقاس الصفحة قبل تصدير المستند إلى ملف PDF في تطبيق وقِّع.",
      },
      { property: "og:title", content: "إعدادات المسح — وقِّع" },
      {
        property: "og:description",
        content: "اضبط جودة المسح الضوئي ومقاس الصفحة قبل تصدير المستند إلى ملف PDF في تطبيق وقِّع.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useScanSettings();

  const pick = (patch: Parameters<typeof setScanSettings>[0]) => {
    setScanSettings(patch);
    playSfx("tap");
    haptic();
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">إعدادات المسح</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          تُطبَّق هذه الإعدادات على كل عملية مسح جديدة وعند التصدير إلى PDF.
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card/60 p-4 shadow-elegant">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">جودة المسح</h2>
        </div>
        <div className="mt-3 space-y-2">
          {QUALITY_OPTIONS.map((option) => {
            const active = settings.quality === option.key;
            return (
              <button
                key={option.key}
                onClick={() => pick({ quality: option.key })}
                className={`press flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-start ${
                  active ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60"
                }`}
              >
                <span>
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{option.hint}</span>
                </span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card/60 p-4 shadow-elegant">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">مقاس الصفحة</h2>
        </div>
        <div className="mt-3 space-y-2">
          {PAGE_SIZE_OPTIONS.map((option) => {
            const active = settings.pageSize === option.key;
            return (
              <button
                key={option.key}
                onClick={() => pick({ pageSize: option.key })}
                className={`press flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-start ${
                  active ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60"
                }`}
              >
                <span>
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{option.hint}</span>
                </span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </section>

      <p className="flex items-start gap-2 rounded-2xl border border-border bg-card/40 p-3 text-[11px] text-muted-foreground">
        <SlidersHorizontal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        الجودة القصوى تعطي نصًا أوضح لكنها تنتج ملفًا أكبر. اختر «تلقائي» في المقاس للحفاظ على أبعاد الورقة كما صُوّرت.
      </p>
    </div>
  );
}
