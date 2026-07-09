import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider, themeInitScript } from "../lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-gradient-brand px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">تعذّر تحميل هذه الصفحة</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          حدث خطأ ما لدينا. حاول التحديث أو العودة إلى الصفحة الرئيسية.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            حاول مجددًا
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            العودة للرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ساين فورج — منصة التوقيع الإلكتروني للمؤسسات" },
      { name: "description", content: "ساين فورج منصة توقيع إلكتروني متميزة للفرق: وقّع ملفات PDF والمستندات، وأدر القوالب والشهادات وسجلات التدقيق والتحليلات بأمان على مستوى المؤسسات." },
      { name: "author", content: "SignForge" },
      { property: "og:title", content: "ساين فورج — منصة التوقيع الإلكتروني للمؤسسات" },
      { property: "og:description", content: "ساين فورج منصة توقيع إلكتروني متميزة للفرق: وقّع ملفات PDF والمستندات، وأدر القوالب والشهادات وسجلات التدقيق والتحليلات بأمان على مستوى المؤسسات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ساين فورج — منصة التوقيع الإلكتروني للمؤسسات" },
      { name: "twitter:description", content: "ساين فورج منصة توقيع إلكتروني متميزة للفرق: وقّع ملفات PDF والمستندات، وأدر القوالب والشهادات وسجلات التدقيق والتحليلات بأمان على مستوى المؤسسات." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/962aea09-e8ad-4f12-949b-97f00a69ae5c/id-preview-66aaff2b--ab29f99d-ffe2-4ce8-982b-a3d244bd59c1.lovable.app-1783244124996.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/962aea09-e8ad-4f12-949b-97f00a69ae5c/id-preview-66aaff2b--ab29f99d-ffe2-4ce8-982b-a3d244bd59c1.lovable.app-1783244124996.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider delayDuration={200}>
          <Outlet />
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
