import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ahmedelmadni.waqqi",
  appName: "وقِّع",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
    // التطبيق يُحمَّل من النسخة المنشورة؛ غيّر الرابط عند استخدام نطاق مخصص
    url: "https://signature-forge-vision.lovable.app/home",
    cleartext: false,
  },
};

export default config;
