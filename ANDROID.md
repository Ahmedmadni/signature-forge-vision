# تصدير تطبيق «وقِّع» إلى APK

مشروع أندرويد جاهز داخل مجلد `android/` (Capacitor).

- معرّف التطبيق: `com.ahmedelmadni.waqqi`
- اسم التطبيق: وقِّع
- minSdk 24 / targetSdk 36

## 1) المتطلبات على جهازك

- Node.js 20+ و Bun
- Android Studio (يتضمّن Android SDK + JDK 17)

## 2) تحديث الملفات الأصلية بعد أي تعديل على الواجهة

```bash
bun install
bun run android:sync
```

هذا الأمر يبني الويب، يولّد شاشة التحميل الأصلية، ثم ينفّذ `cap sync android`.

> ملاحظة: التطبيق يفتح النسخة المنشورة من الموقع داخل WebView
> (`server.url` في `capacitor.config.ts`). لتغيير الرابط أو استخدام نطاق مخصص
> عدّل `capacitor.config.ts` ثم أعد المزامنة.

## 3) توليد APK

من الطرفية:

```bash
cd android
./gradlew assembleDebug        # نسخة تجريبية
# الناتج: android/app/build/outputs/apk/debug/app-debug.apk

./gradlew assembleRelease      # نسخة للنشر (تحتاج توقيع)
# الناتج: android/app/build/outputs/apk/release/app-release.apk
```

أو عبر Android Studio: `Build > Build Bundle(s)/APK(s) > Build APK(s)`.

### توقيع نسخة الإصدار

```bash
keytool -genkey -v -keystore waqqi.keystore -alias waqqi \
  -keyalg RSA -keysize 2048 -validity 10000
```

ثم أضف في `android/app/build.gradle` داخل `android { }`:

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
    release { signingConfig signingConfigs.release }
}
```

## 4) إعلانات Google AdMob

تم تجهيز الملفات الأصلية مسبقًا:

- `AndroidManifest.xml`: وسم `com.google.android.gms.ads.APPLICATION_ID`
  (حاليًا معرّف اختبار من Google) + صلاحيات `INTERNET`،
  `ACCESS_NETWORK_STATE`، و`com.google.android.gms.permission.AD_ID`.
- `android/app/build.gradle`: مكتبة `play-services-ads`.

قبل النشر:

1. أنشئ تطبيقًا في لوحة AdMob واحصل على معرّف التطبيق ووحدات الإعلانات.
2. استبدل قيمة `ca-app-pub-...~...` في `AndroidManifest.xml` بمعرّفك الحقيقي.
3. اضبط متغيرات البيئة للواجهة في `.env`:

```
VITE_ADS_ENABLED=true
VITE_ADMOB_APP_ID=ca-app-pub-XXXXXXXX~XXXXXXXX
VITE_ADMOB_BANNER_ID=ca-app-pub-XXXXXXXX/XXXXXXXX
VITE_ADMOB_INTERSTITIAL_ID=ca-app-pub-XXXXXXXX/XXXXXXXX
VITE_ADMOB_REWARDED_ID=ca-app-pub-XXXXXXXX/XXXXXXXX
```

4. لعرض إعلانات أصلية فعليًا ثبّت الإضافة:

```bash
bun add @capacitor-community/admob && bunx cap sync android
```

المساحات الإعلانية في الواجهة محجوزة عبر `src/components/app/AdSlot.tsx`
ولن تُزيح المحتوى عند التفعيل.
