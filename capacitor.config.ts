import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ahmedelmadni.waqqi",
  appName: "وقِّع",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
    // Distinguish the packaged Android WebView from a normal browser even when
    // a remote server URL is used and the native JS bridge fails to initialize.
    appendUserAgent: " WaqqiAndroid/2.1",
  },
  server: {
    androidScheme: "https",
    // التطبيق يُحمَّل من النسخة المنشورة؛ غيّر الرابط عند استخدام نطاق مخصص
    url: "https://signature-forge-vision.lovable.app/home",
    cleartext: false,
  },
};

export default config;
