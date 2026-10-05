import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

const manifest = read("android/app/src/main/AndroidManifest.xml");
const gradle = read("android/app/build.gradle");
const capacitor = read("capacitor.config.ts");
const gitignore = read(".gitignore");

const failures = [];
const warnings = [];

function requireMatch(condition, message) {
  if (!condition) failures.push(message);
}

requireMatch(
  manifest.includes('android:allowBackup="false"'),
  "Android backup must remain disabled for document privacy.",
);
requireMatch(
  manifest.includes('android:usesCleartextTraffic="false"'),
  "Android cleartext traffic must remain disabled.",
);
requireMatch(
  gradle.includes('applicationId "com.ahmedelmadni.waqqi"'),
  "Unexpected Android applicationId.",
);
requireMatch(
  capacitor.includes('appId: "com.ahmedelmadni.waqqi"'),
  "Capacitor appId must match the Android applicationId.",
);
requireMatch(
  capacitor.includes("cleartext: false"),
  "Capacitor cleartext must remain disabled.",
);
requireMatch(
  gradle.includes("WAQQI_VERSION_CODE") && gradle.includes("WAQQI_VERSION_NAME"),
  "Android version metadata must remain externally configurable.",
);
requireMatch(
  gradle.includes("WAQQI_REQUIRE_SIGNED_RELEASE") &&
    gradle.includes("WAQQI_KEYSTORE_PATH") &&
    gradle.includes("WAQQI_KEY_ALIAS"),
  "Android release signing must remain environment-driven and fail closed when required.",
);
requireMatch(
  gitignore.includes("*.jks") &&
    gitignore.includes("*.keystore") &&
    gitignore.includes("key.properties"),
  "Android signing secret files must be ignored by Git.",
);

requireMatch(
  !manifest.includes("ca-app-pub-3940256099942544~3347511713"),
  "Google's AdMob test application ID must never ship in a release build.",
);
requireMatch(
  !manifest.includes("com.google.android.gms.permission.AD_ID"),
  "Advertising ID permission is not allowed unless ads are intentionally enabled.",
);
requireMatch(
  !gradle.includes("play-services-ads"),
  "Google Mobile Ads SDK is not allowed unless the product intentionally enables ads.",
);
if (capacitor.includes("signature-forge-vision.lovable.app")) {
  warnings.push("Android shell still loads the hosted Lovable URL and therefore depends on network access.");
}

console.log("Waqqi release preflight");
for (const warning of warnings) console.warn(`WARN: ${warning}`);

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log("PASS: repository release safety checks passed.");
