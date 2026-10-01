# وقِّع — Waqqi

تطبيق عربي Mobile-first لتوقيع ملفات PDF ومسح المستندات متعددة الصفحات، مبني بـ React/TypeScript وSupabase، مع Android shell عبر Capacitor.

> الحالة الحالية: MVP متقدم / Release Candidate. الوظائف الأساسية للتوقيع والمسح منفذة، لكن Scanner يحتاج تحققًا نهائيًا على أجهزة حقيقية قبل اعتبار التطبيق Production-ready.

## الوظائف المنفذة

### توقيع PDF
- فتح ملفات PDF والتنقل بين الصفحات.
- إنشاء توقيع بالرسم أو الكتابة أو رفع صورة PNG/JPEG.
- حفظ عدة توقيعات واختيار توقيع افتراضي.
- وضع التوقيع على الصفحة، سحبه، تغيير حجمه وحذفه.
- تطبيق التوقيع على جميع الصفحات.
- إنتاج PDF نهائي مدمج باستخدام `pdf-lib`.
- معالجة الملف محليًا على الجهاز قدر الإمكان أثناء مسار التوقيع الأساسي.

### Scanner متعدد الصفحات
- داخل APK Android الجديد: Google ML Kit Native Document Scanner مع كشف حدود أصلي، قص وتسوية وتصوير صفحات متعددة، ثم استيراد الصور المعالجة مباشرة دون قص ثانٍ. **يلزم Android build جديد واختبار هاتف حقيقي.**
- داخل الويب أو APK قديم: التقاط عدة صفحات بكاميرا المتصفح في جلسة واحدة.
- استيراد عدة صور من المعرض.
- اكتشاف حدود المستند آليًا باستخدام Sobel/Hough + quadrilateral scoring.
- Edge snapping والتحقق من contrast والثبات الزمني.
- Auto capture بعد تحقق الثقة والثبات.
- مراجعة الحدود يدويًا عند انخفاض الثقة.
- Perspective correction.
- فلاتر Enhanced / Color / Black & White.
- تدوير، حذف، إعادة ترتيب وتعديل crop لكل صفحة.
- تصدير PDF متعدد الصفحات.
- مسار Scan → PDF → Sign.

### الاستخدام والحساب
- Authentication عبر Supabase/Lovable Cloud.
- RLS على البيانات الأساسية.
- حصص استخدام يومية عبر `usage_days` و`entitlements`.
- Paywall UI عند انتهاء الحصة.

> الدفع الفعلي والاشتراكات التجارية غير منفذة حتى الآن.

## ما لا يقدمه المنتج حاليًا

التطبيق ينفذ **Electronic visual signature** (دمج صورة توقيع داخل PDF)، وليس توقيعًا رقميًا تشفيريًا قائمًا على شهادة.

غير منفذ حاليًا:
- PAdES / PKI / X.509 / trusted timestamp.
- OCR وAI document recognition.
- AI signature placement أو AI-generated signatures.
- دعم كامل لـ DOCX/XLSX.
- Billing فعلي (Stripe أو Google Play Billing).
- Backend مستقل بـ NestJS/Redis/Docker.

لا ينبغي تقديم هذه البنود كميزات موجودة قبل تنفيذها واختبارها.

## البنية التقنية

- React 19 + TypeScript
- TanStack Start
- Vite
- Tailwind CSS + Radix/shadcn-style components
- Framer Motion
- PDF.js
- pdf-lib
- Supabase / PostgreSQL / RLS
- Capacitor Android

Android package:

```
com.ahmedelmadni.waqqi
```

## المسارات الرئيسية

- `/home`
- `/scan`
- `/signature`
- `/settings`
- `/account`
- `/auth`
- `/privacy`
- `/terms`

## الملفات الأهم

| الملف | الوظيفة |
|---|---|
| `src/components/app/CameraCapture.tsx` | الكاميرا والكشف الحي |
| `src/components/app/ScanCropper.tsx` | تعديل حدود الورقة |
| `src/lib/precise-document-detect.ts` | كشف المستطيل |
| `src/lib/document-refine.ts` | Edge snapping |
| `src/lib/live-scan.ts` | الثقة والثبات |
| `src/lib/scan.ts` | Perspective correction والفلاتر وPDF |
| `src/lib/native-document-scanner.ts` | جسر Google ML Kit Android وقراءة الصور الأصلية |
| `src/lib/native-document-scanner.test.ts` | اختبارات المسح الأصلي |
| `src/lib/scan-settings.ts` | إعدادات جودة وأحجام المسح |
| `src/routes/_authenticated/scan.tsx` | Scanner workflow |
| `src/components/app/PdfSignWorkspace.tsx` | مساحة توقيع PDF |
| `src/components/app/SignatureCapture.tsx` | إنشاء التوقيع |
| `src/lib/sign-pdf.ts` | إنتاج PDF الموقع |
| `src/lib/signatures.ts` | إدارة التوقيعات |
| `src/lib/usage.ts` | الحصص اليومية |
| `src/lib/pending-file.ts` | Scan → Sign |
| `capacitor.config.ts` | Android shell |
| `ANDROID.md` | تعليمات Android |

## إعداد البيئة

استخدم `.env.example` كقالب، وأنشئ ملفًا محليًا مثل `.env.local`.

المتغيرات الأساسية:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

**مهم:** لا تضع `service_role` أو أي secret/private token داخل متغيرات `VITE_*` لأنها تصل إلى كود العميل.

## التشغيل محليًا

```bash
npm ci
npm run dev
```

## بوابة الجودة

```bash
npm run typecheck
npm run lint
npm run build
npm run check
```

ولمزامنة Android:

```bash
npm run android:sync
```

يوجد GitHub Actions workflow في:

```
.github/workflows/ci.yml
```

ويشغّل TypeScript typecheck ثم lint ثم build، وبعد نجاحها يتحقق من Capacitor Android sync.

## Production checklist

قبل الإصدار التجاري يجب على الأقل:

1. اختبار Scanner على Android حقيقي باستخدام آخر build.
2. اختبار دقة الحواف على مجموعة صور واقعية متنوعة.
3. اختبار الرجوع من Review إلى الكاميرا وعدم ظهور شاشة سوداء.
4. اختبار 5 صفحات متتالية وScan → Sign → Save.
5. مراجعة RLS وStorage policies وSupabase functions.
6. مراجعة متغيرات البيئة والتأكد من عدم وجود أسرار في المستودع.
7. اجتياز typecheck + lint + build + Android sync.
8. اختبار PDFs الكبيرة والمشفرة والـrotation والـLandscape.
9. فتح PDF النهائي في قارئ مستقل والتأكد من ظهور التوقيع بشكل صحيح.
10. استبدال AdMob test App ID فقط عند تجهيز إعدادات الإعلان الإنتاجية والخصوصية.
11. تنفيذ billing/entitlement validation فعليًا قبل بيع اشتراك.

## ملاحظة عن Scanner

معاينة الكاميرا الحالية تعتمد على:

```
Camera Stream → hidden video → Canvas Preview
```

وذلك لمعالجة مشكلة Black Video Surface على بعض Android WebViews. على Android تم الآن إدخال مسار ML Kit أصلي خارج WebView لتجنب الاعتماد على هذه المعاينة، بينما يبقى المسار الحالي للويب والأجهزة التي لا تتوافر فيها الإضافة. راجع `ANDROID.md` لبناء APK جديد وتجربة المسار الأصلي؛ نجاح بناء الويب وحده لا يؤكد تشغيل الماسح على هاتف حقيقي.

## الروابط

- التطبيق المنشور: https://signature-forge-vision.lovable.app
- Lovable project: https://lovable.dev/projects/ab29f99d-ffe2-4ce8-982b-a3d244bd59c1

---

هذا README يصف المنتج الموجود فعليًا، وليس الـVision القديمة للمشروع.
