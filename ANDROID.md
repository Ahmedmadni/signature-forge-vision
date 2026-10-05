# تطبيق «وقِّع» — مشروع أندرويد وتصدير APK

مشروع أندرويد (Capacitor) موجود فعليًا داخل مجلد `android/` ومزامَن مع آخر بناء للويب.

| العنصر | القيمة |
| --- | --- |
| معرّف التطبيق | `com.ahmedelmadni.waqqi` |
| اسم التطبيق | وقِّع |
| minSdk / targetSdk | 24 / 36 |
| الإصدار | versionCode 1 — versionName 1.0 |
| الأيقونة | مولّدة في `res/mipmap-*` بخلفية `#0F1424` |

---

## 1) المتطلبات

- Node.js 20+ و Bun
- Android Studio (Ladybug أو أحدث) مع:
  - Android SDK Platform 36
  - Android SDK Build-Tools 36
  - JDK 21 (مطلوب لتجميع إضافة ML Kit الحالية)

---

## 2) تحضير المشروع بعد تنزيله من GitHub

```bash
bun install
bun run build          # بناء الويب
bun run android:sync   # بناء + توليد الشاشة الأصلية + cap sync android
```

إن لم يكن مجلد `android/` موجودًا لديك:

```bash
bunx cap add android
bun run android:sync
```

كرّر `bun run android:sync` بعد أي تعديل على واجهة التطبيق.

---

## 3) الفتح في Android Studio

```bash
bunx cap open android
```

أو افتح Android Studio ثم `Open` واختر مجلد `android/`.
انتظر انتهاء Gradle Sync (أول مرة تستغرق عدة دقائق لتنزيل الاعتماديات).

---

## 4) تصدير APK

### أ) من Android Studio

1. `Build > Build Bundle(s) / APK(s) > Build APK(s)`
2. عند الانتهاء اضغط **locate** لفتح الملف الناتج:
   `android/app/build/outputs/apk/debug/app-debug.apk`

### ب) من الطرفية

```bash
cd android
./gradlew assembleDebug     # نسخة تجريبية للتثبيت المباشر
./gradlew assembleRelease   # نسخة للنشر (تحتاج توقيع)
./gradlew bundleRelease     # ملف AAB لمتجر Google Play
```

المخرجات:

- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

### ج) توقيع نسخة الإصدار

الطريقة الأسهل عبر Android Studio:
`Build > Generate Signed App Bundle / APK` ثم اتبع المعالج لإنشاء keystore.

أو يدويًا:

```bash
keytool -genkey -v -keystore waqqi.keystore -alias waqqi \
  -keyalg RSA -keysize 2048 -validity 10000
```

ثم في `android/app/build.gradle` داخل كتلة `android { }`:

```gradle
signingConfigs {
    release {
        storeFile file("../../waqqi.keystore")
        storePassword System.getenv("KEYSTORE_PASSWORD")
        keyAlias "waqqi"
        keyPassword System.getenv("KEY_PASSWORD")
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

### د) التثبيت على جهاز

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5) رابط التطبيق داخل WebView

التطبيق يفتح النسخة المنشورة من الموقع (`server.url` في `capacitor.config.ts`):

```ts
server: {
  androidScheme: "https",
  url: "https://signature-forge-vision.lovable.app/home",
  cleartext: false,
}
```

عند ربط نطاق مخصص، غيّر الرابط ثم نفّذ `bun run android:sync`.
ملف `dist/client/index.html` المولَّد هو شاشة تحميل احتياطية تظهر قبل فتح الموقع.

---

## 6) الإعلانات والخصوصية

الإصدار الحالي من «وقِّع» **لا يعرض إعلانات**، ولا يتضمن Google Mobile Ads SDK، ولا يطلب صلاحية Advertising ID (`AD_ID`).

إذا تقرر إضافة الإعلانات مستقبلًا، تعامل معها كميزة مستقلة تتطلب قبل دمجها:

- إضافة SDK معتمد للإعلانات.
- App ID ووحدات إعلانية إنتاجية، وليس Google test IDs.
- تحديث سياسة الخصوصية وGoogle Play Data Safety.
- إعداد consent للمناطق التي تتطلب موافقة المستخدم.
- إعادة مراجعة الصلاحيات والتتبع قبل النشر.

## 7) قبل رفع التطبيق إلى Google Play

- ارفع `versionCode` و`versionName` في `android/app/build.gradle`.
- استخدم `bundleRelease` (AAB) بدل APK.
- جهّز سياسة الخصوصية: `/privacy` داخل التطبيق.
- عبّئ نموذج «أمان البيانات» بما يطابق الإصدار الحالي؛ Advertising ID غير مستخدم.

---

## استكشاف الأخطاء

| المشكلة | الحل |
| --- | --- |
| `SDK location not found` | أنشئ `android/local.properties` يحتوي `sdk.dir=/path/to/Android/sdk` |
| فشل Gradle Sync | `File > Invalidate Caches / Restart` ثم أعد المزامنة |
| شاشة بيضاء عند التشغيل | تحقق من الاتصال بالإنترنت ومن صحة `server.url` |
| تغييرات الواجهة لا تظهر | نفّذ `bun run android:sync` ثم أعد البناء |

---

## 8) الماسح الأصلي ML Kit (N01)

> **مهم للبناء:** إصدار `@capacitor-mlkit/document-scanner@8.2.1` يستخدم Java source/target 21. اختر JDK 21 في Android Studio (Gradle JDK) وعلى GitHub Actions.


أُضيفت الإضافة `@capacitor-mlkit/document-scanner@8.2.1` لإظهار واجهة مسح أصلية على أجهزة Android التي تدعم Google Play Services.

**يجب إنشاء APK جديد.** تحديث موقع Lovable وحده لا يثبت Java/Android plugin في APK قديم.

```bash
npm install
npm run typecheck
npm run test
npm run build
npm run android:sync
npx cap open android
```

من Android Studio اختر Build APK(s) وثبّت **الإصدار الجديد** على هاتف حقيقي، واسمح لخدمات Google Play بتنزيل مكوّن Document Scanner أول مرة (قد يتطلب اتصالًا بالإنترنت). Android minSdk 24 ملائم لمتطلبات الإضافة.

عند ضغط «مسح بالكاميرا» داخل APK المحدّث: تُفتح واجهة Google ML Kit الأصلية، وتُستقبل الصور بصيغة JPEG جاهزة (قص، تقويم، ترتيب)، ثم تُضاف بالترتيب إلى صفحة المسح دون إعادة قصّها. تستمر وظائف **حفظ PDF** و**التوقيع الآن** و**تدوير/ترتيب/حذف الصفحات**.

في المتصفح أو APK قديم بلا Native plugin: يستمر الماسح الموجود كخيار احتياطي. عند إلغاء المسح الأصلي لا تُضاف صفحات.

### تغطية آلية حالية قبل اختبار الجهاز

تغطي اختبارات Vitest الحالية أجزاء أساسية من المسار:

- تفعيل Native Scanner فقط داخل Android Native shell.
- fallback عند غياب الإضافة الأصلية.
- التمييز بين إلغاء المستخدم وفشل الماسح.
- ترتيب الصفحات القادمة من ML Kit.
- نجاح/فشل تثبيت Google Document Scanner module وتنظيف listener.
- حدود الصفحة الكاملة لمخرجات ML Kit وحدود fallback لمسار الويب.
- عدم إعادة crop/filter لمخرجات ML Kit ما لم يغيّر المستخدم الحدود أو الفلتر.
- تدوير الصفحات بزيادات 90 درجة وإعادة ترتيبها.
- تصدير PDF متعدد الصفحات.
- معالجة فشل إنشاء JPEG.
- دمج التوقيع داخل PDF ثم إعادة فتح الملف الناتج.
- تمرير Scan → Sign عبر pending-file مرة واحدة فقط.

تعمل هذه الاختبارات داخل GitHub Actions قبل بناء APK. وهي لا تستبدل فحص الكاميرا والجودة البصرية على هاتف فعلي.

### فحص قبول N01 على جهاز حقيقي

- [ ] تثبيت APK جديد بعد `android:sync`.
- [ ] فتح الواجهة الأصلية من زر «مسح بالكاميرا».
- [ ] مسح 5 صفحات وحفظ ترتيبها وجودة حوافها.
- [ ] الإلغاء ثم إعادة المسح بنجاح دون شاشة سوداء.
- [ ] إدخال صور من المعرض داخل Google Scanner.
- [ ] حفظ PDF وإعادة فتحه بقارئ خارجي.
- [ ] Scan → Sign → Save.
- [ ] اختبار جهاز دون Google Play Services والتأكد من عرض مسار احتياطي واضح.

### ملاحظتان معماريتان

1. يحتوي `capacitor.config.ts` على `server.url` يشير إلى موقع Lovable؛ لذلك التطبيق الحالي **يحتاج اتصالًا بالإنترنت** لفتح الواجهة، ولا تُستبدل الإضافة المثبتة في APK بمجرد تحديث الموقع. يُرجى تقييم تغليف أصول التطبيق محليًا قبل الإنتاج النهائي مع اختبار اتصال Supabase/SSR.
2. يعمل هذا المسار على Android فقط. في الويب وiOS (مستقبلًا) يبقى مسار الويب، أو يُنفذ بديل Native مناسب للمنصة.

**ملفات N01:** `src/lib/native-document-scanner.ts`، `src/lib/native-document-scanner.test.ts`، `src/routes/_authenticated/scan.tsx`، `src/lib/scan.ts`.


## Versioning للإصدارات

يقرأ Gradle رقم واسم الإصدار من متغيرات البيئة أو Gradle properties:

```bash
WAQQI_VERSION_CODE=42 WAQQI_VERSION_NAME=1.4.2 ./gradlew :app:bundleRelease
```

القيم الافتراضية للتطوير المحلي:

- `versionCode = 1`
- `versionName = 1.0.0`

GitHub Actions يضبط `WAQQI_VERSION_CODE` تلقائيًا من رقم تشغيل الـworkflow ويستخدم اسم إصدار CI مثل `1.0.<run>-ci`.

### توقيع Release

لا تضع keystore أو كلمات المرور داخل المستودع. الملفات `*.jks` و`*.keystore` و`key.properties` مستبعدة من Git. عند تجهيز Google Play استخدم Play App Signing أو GitHub Secrets/بيئة نشر آمنة لإدخال بيانات التوقيع.

الـAAB الذي يبنيه CI الحالي مخصص للتحقق من قابلية بناء Release، وليس artifact إنتاجيًا موقّعًا للنشر.

---

## 9) تسجيل الدخول داخل Android — Google OAuth + Deep Link

**مطلوب في APK الجديد:** تمت إضافة `@capacitor/app` و`@capacitor/browser`، ويستقبل Android Intent Filter عنوان الرجوع:

```text
com.ahmedelmadni.waqqi://auth/callback
```

يبدأ Android تسجيل الدخول باستخدام Supabase OAuth PKCE في متصفح Google الآمن، ثم يعود هذا الرابط إلى تطبيق وقِّع؛ يتبادل التطبيق `code` مع Supabase لإنشاء جلسة داخل WebView نفسه.

**إعداد خارجي إلزامي (لا يمكن إكماله بتعديل GitHub وحده):**

1. افتح مشروع **Supabase Auth المستخدم فعلًا بواسطة وقِّع** (قد تتم إدارته من Lovable Cloud).
2. داخل `Authentication → URL Configuration → Additional Redirect URLs` أضف **الرابط المطابق أعلاه حرفيًا**.
3. داخل `Authentication → Providers → Google` تأكد من تمكين Google وتكوين Client ID / Secret وGoogle Cloud redirect المعتمدين لهذا المشروع. دعم Google عبر Lovable OAuth broker على الويب **لا يعني تلقائيًا** أن Supabase Google Provider مفعل لتدفق Android المستقل.
4. لا تضع Client Secret أو مفاتيح خاصة في `VITE_*` أو داخل APK.

بعد تحديث إعدادات Supabase، شغّل `npm run android:sync` ثم ثبّت APK الناتج. اختبر دخول جوجل داخل التطبيق، الخروج إلى متصفح Google للموافقة، العودة التلقائية إلى «وقّع» بعد نجاح المصادقة، ثم إعادة تشغيل APK للتحقق من استمرار الجلسة.

**تسجيل البريد وكلمة المرور:** يستمر داخل التطبيق مباشرة دون فتح المتصفح. إنشاء الحساب الذي يتطلب تأكيد البريد لا يُعلن أنه جلسة نشطة قبل وصول الجلسة بالفعل.

**ملاحظة:** إذا لم تتوفر إعدادات Google/Deep Link على مشروع Supabase الصحيح، سيظهر خطأ OAuth؛ لا تعتبر المسار جاهزًا للإنتاج قبل تنفيذ الخطوات أعلاه واختبار هاتف حقيقي.

## 10) الماسح: منع الالتقاط المبكر والشاشة المقطوعة

- ماسح الويب الاحتياطي يعرض الآن المحتوى كاملًا داخل `100dvh` بلا `min-height: 320px` الذي دفع الأزرار خارج الشاشة.
- تحليل الحواف صار يتم على نسخة مصغرة كل 600ms بدل تحليل الفريم الكامل بكثافة، بينما يظل التصوير النهائي بدقة كاميرا مناسبة.
- **الالتقاط التلقائي مغلق افتراضيًا**، ويمكن تفعيله صراحة من واجهة الكاميرا بعد الاختبار. التصوير اليدوي يفتح مراجعة الحدود.
- داخل Android المدعوم يظل ML Kit هو المسار الأساسي. عند غياب الإضافة/الخدمات يظهر تشخيص واضح وخيار «فتح ماسح الويب يدويًا» بدل التحويل الصامت إلى الماسح القديم.

يجب اختبار الشاشة على هاتف قصير وطويل مع أشرطة النظام ولوحة المفاتيح، واختبار Google ML Kit الأصلي لأن المعاينة البطيئة تعني غالبًا أن الجهاز يستخدم ماسح الويب.
