# تشغيل التطبيق على أندرويد (Capacitor)

التطبيق مهيّأ للعمل كتطبيق أندرويد عبر Capacitor. الملف `capacitor.config.ts` جاهز
(`appId: com.ahmedelmadni.waqqi`).

## المتطلبات
- Node.js و Bun
- Android Studio + JDK 17

## الخطوات

```bash
# 1) بناء نسخة الويب
bun run build

# 2) إضافة منصة أندرويد (مرة واحدة فقط)
bunx cap add android

# 3) نسخ ملفات الويب إلى المشروع الأصلي بعد كل بناء
bunx cap sync android

# 4) فتح المشروع في Android Studio
bunx cap open android
```

من Android Studio يمكنك التشغيل على جهاز/محاكي، أو إنشاء ملف APK / AAB
عبر `Build > Generate Signed Bundle / APK`.

## ملاحظات
- حفظ الملف الموقّع يستخدم `@capacitor/filesystem` (مجلد Documents) ثم
  `@capacitor/share` لمشاركة الملف — يعمل تلقائيًا داخل التطبيق، وعلى الويب يتم
  التنزيل العادي.
- كل معالجة ملفات PDF تتم على الجهاز، لذلك لا حاجة لأذونات شبكة إضافية غير
  الاتصال بخدمة تسجيل الدخول.
