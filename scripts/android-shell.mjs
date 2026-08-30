// Generates a minimal offline fallback shell for the Capacitor Android build.
// The app itself is served from the published URL (see capacitor.config.ts).
import { writeFileSync, mkdirSync } from "node:fs";

const APP_URL = process.env.ANDROID_APP_URL ?? "https://signature-forge-vision.lovable.app/home";

const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>وقِّع</title>
    <style>
      html,body{height:100%;margin:0;background:#0f1424;color:#e8eaf4;
        font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
        display:grid;place-items:center;text-align:center;padding:24px}
      .l{width:46px;height:46px;border-radius:50%;border:3px solid rgba(255,255,255,.15);
        border-top-color:#8b7bf7;animation:s 1s linear infinite;margin:0 auto 16px}
      @keyframes s{to{transform:rotate(360deg)}}
      a{color:#8b7bf7}
    </style>
  </head>
  <body>
    <div>
      <div class="l"></div>
      <h1 style="font-size:18px;margin:0 0 8px">وقِّع</h1>
      <p style="opacity:.7;font-size:14px;margin:0">جارٍ فتح التطبيق… تأكد من اتصالك بالإنترنت.</p>
      <p style="font-size:13px;margin-top:14px"><a href="${APP_URL}">إعادة المحاولة</a></p>
    </div>
    <script>setTimeout(function(){location.replace(${JSON.stringify(APP_URL)})},600)</script>
  </body>
</html>
`;

mkdirSync("dist/client", { recursive: true });
writeFileSync("dist/client/index.html", html);
console.log("android shell written -> dist/client/index.html");
