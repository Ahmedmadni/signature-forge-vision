# وقِّع — Release Checklist

هذا الملف يفرّق بين ما يتم التحقق منه آليًا داخل المستودع وما يحتاج اختبارًا فعليًا خارج CI.

## مغلق آليًا

- [x] `npm ci` حتمي عبر package-lock متزامن.
- [x] TypeScript typecheck.
- [x] ESLint بدون أخطاء.
- [x] Vitest regression suite.
- [x] Web production build.
- [x] Release preflight.
- [x] Android Capacitor sync.
- [x] Android SDK 36 + JDK 21.
- [x] Debug APK build.
- [x] Release AAB build.
- [x] فحص `versionCode/versionName` من APK النهائي.
- [x] منع cleartext traffic.
- [x] تعطيل Android backup.
- [x] استبعاد keystore/signing secrets من Git.
- [x] Scanner native module gating/fallback/cancel tests.
- [x] Scan page reorder/rotation/crop-policy tests.
- [x] Multi-page Scan → PDF → Sign regression.
- [x] PDF rotation 0/90/180/270.
- [x] CropBox/MediaBox.
- [x] Portrait/Landscape.
- [x] PNG/JPEG signatures.
- [x] Malformed/truncated PDF handling.
- [x] Large multi-page regression (حتى 60 صفحة ضمن الاختبارات).
- [x] رفض PDF المشفر بدل تعديله بصورة غير آمنة.
- [x] Baseline security headers.
- [x] تشديد `has_role` على المستخدم الحالي.
- [x] Privacy/Terms متوافقة مع الوظائف الحالية.

## P0 — اختبار جهاز Android حقيقي

- [ ] تثبيت أحدث Debug APK على هاتف فعلي.
- [ ] فتح Google ML Kit Document Scanner.
- [ ] تصوير صفحة واحدة.
- [ ] تصوير 5 صفحات متتالية.
- [ ] تصوير 10 صفحات.
- [ ] إلغاء Scanner ثم فتحه مرة أخرى بدون شاشة سوداء.
- [ ] استيراد صور من المعرض.
- [ ] crop يدوي.
- [ ] Enhanced / Color / B&W.
- [ ] rotate / reorder / delete.
- [ ] حفظ PDF وفتحه في قارئ مستقل.
- [ ] Scan → Sign → Save.
- [ ] التحقق من fallback على جهاز بدون Google Play scanner إن توفر.
- [ ] اختبار Samsung / Xiaomi / Pixel، وHuawei/Honor إن أمكن.

## P1 — ملفات PDF واقعية

- [ ] PDF حقيقي 10 MB.
- [ ] PDF حقيقي 25 MB.
- [ ] PDF حقيقي 50 MB+.
- [ ] PDF ممسوح عالي الدقة.
- [ ] PDF 100+ صفحة إذا كان ذلك ضمن حدود المنتج المستهدفة.
- [ ] PDFs من Adobe / Microsoft Print to PDF / تطبيقات Scanner.
- [ ] ملف encrypted حقيقي للتحقق من رسالة الرفض في UI.

## P1 — Supabase / Production Security

- [ ] تطبيق أحدث migrations على مشروع الإنتاج والتحقق منها باستخدام `supabase/PRODUCTION_VERIFY.sql`.
- [ ] اختبار مستخدم A مقابل مستخدم B لكل RLS الحساسة.
- [ ] اختبار `consume_signing_pages` بقيم 0 / سالبة / ضخمة / concurrent.
- [ ] مراجعة bucket `documents` الفعلي إذا بدأ استخدامه من العميل.
- [ ] تحديد MIME whitelist وfile-size limit للـStorage عند تفعيل رفع الملفات.
- [ ] مراجعة CSP صارمة بعد اختبار OAuth/Lovable deployment فعليًا.

## Google Play / Commercial Release

- [ ] اختيار `versionName` التجاري النهائي.
- [ ] Play App Signing أو keystore إنتاجي خارج Git.
- [ ] بناء AAB موقّع.
- [ ] استبدال AdMob test App ID إذا كانت الإعلانات ستُفعّل.
- [ ] إعداد consent/privacy للإعلانات.
- [ ] Google Play Data Safety.
- [ ] screenshots / feature graphic / store description / content rating.
- [ ] تفعيل Billing فقط عند تنفيذ purchase verification + restore + entitlement sync.

## غير مطلوب لإغلاق MVP الحالي

- PAdES / PKI / X.509.
- Trusted timestamp.
- OCR.
- AI document recognition.
- AI signature placement.
- DOCX/XLSX.
