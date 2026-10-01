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

## 6) إعلانات Google AdMob

جاهز مسبقًا في الملفات الأصلية:

- `AndroidManifest.xml`: `com.google.android.gms.ads.APPLICATION_ID`
  (حاليًا معرّف اختبار من Google) + صلاحيات `INTERNET`،
  `ACCESS_NETWORK_STATE`، `com.google.android.gms.permission.AD_ID`.
- `android/app/build.gradle`: `com.google.android.gms:play-services-ads`.

قبل النشر:

1. أنشئ تطبيقًا في لوحة AdMob واحصل على App ID ووحدات الإعلانات.
2. استبدل `ca-app-pub-3940256099942544~3347511713` في `AndroidManifest.xml`.
3. اضبط `.env`:

```
VITE_ADS_ENABLED=true
VITE_ADMOB_APP_ID=ca-app-pub-XXXXXXXX~XXXXXXXX
VITE_ADMOB_BANNER_ID=ca-app-pub-XXXXXXXX/XXXXXXXX
VITE_ADMOB_INTERSTITIAL_ID=ca-app-pub-XXXXXXXX/XXXXXXXX
VITE_ADMOB_REWARDED_ID=ca-app-pub-XXXXXXXX/XXXXXXXX
```

4. لعرض إعلانات أصلية:

```bash
bun add @capacitor-community/admob
bun run android:sync
```

المساحات الإعلانية محجوزة في الواجهة عبر `src/components/app/AdSlot.tsx`.

---

## 7) قبل رفع التطبيق إلى Google Play

- ارفع `versionCode` و`versionName` في `android/app/build.gradle`.
- استخدم `bundleRelease` (AAB) بدل APK.
- جهّز سياسة الخصوصية: `/privacy` داخل التطبيق.
- عبّئ نموذج "أمان البيانات" مع ذكر استخدام معرّف الإعلانات (AD_ID).

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
