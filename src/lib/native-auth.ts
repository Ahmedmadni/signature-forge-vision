/**
 * Native OAuth callback through an Android deep link.
 *
 * IMPORTANT: Add the exact redirect URL to Supabase Auth > URL Configuration >
 * Additional Redirect URLs, and enable the Google provider in Supabase Auth.
 * The Lovable browser OAuth broker remains in use on regular web browsers.
 */
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

export const NATIVE_AUTH_REDIRECT = "com.ahmedelmadni.waqqi://auth/callback";

export function isAndroidNativeAuth(): boolean {
  return (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") || (
    typeof navigator !== "undefined" &&
    /WaqqiAndroid\/\d+/i.test(navigator.userAgent)
  );
}

export function isNativeAuthCallback(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "com.ahmedelmadni.waqqi:" &&
      parsed.hostname === "auth" &&
      parsed.pathname === "/callback"
    );
  } catch {
    return false;
  }
}

function callbackParams(url: string): URLSearchParams {
  const parsed = new URL(url);
  const combined = new URLSearchParams(parsed.search);
  if (parsed.hash) {
    const fragment = new URLSearchParams(parsed.hash.slice(1));
    fragment.forEach((value, key) => combined.set(key, value));
  }
  return combined;
}

/** Exchange a Supabase PKCE code, never navigate the embedded WebView to it. */
export async function completeNativeAuth(url: string): Promise<boolean> {
  if (!isNativeAuthCallback(url)) return false;
  const params = callbackParams(url);
  const error = params.get("error_description") || params.get("error");
  if (error) throw new Error(error);
  const code = params.get("code");
  if (code) {
    const response = await supabase.auth.exchangeCodeForSession(code);
    if (response.error) throw response.error;
    return Boolean(response.data.session);
  }
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) {
    const response = await supabase.auth.setSession({ access_token, refresh_token });
    if (response.error) throw response.error;
    return Boolean(response.data.session);
  }
  throw new Error("عاد المتصفح بدون بيانات تسجيل دخول. راجع عنوان الرجوع المسموح في Supabase.");
}

export async function startNativeGoogleSignIn(): Promise<void> {
  if (!isAndroidNativeAuth()) throw new Error("هذا المسار مخصص لتطبيق Android.");
  if (!Capacitor.isPluginAvailable("App") || !Capacitor.isPluginAvailable("Browser")) {
    throw new Error("تحتاج إلى تثبيت APK جديد يضم إضافتي App وBrowser.");
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: NATIVE_AUTH_REDIRECT,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("لم يُرجع مزود الدخول رابط المصادقة.");
  await Browser.open({ url: data.url });
}

export async function watchNativeAuthLinks(
  onSuccess: () => void,
  onError: (message: string) => void,
): Promise<() => Promise<void>> {
  if (!isAndroidNativeAuth() || !Capacitor.isPluginAvailable("App")) {
    return async () => undefined;
  }
  const pending = new Set<string>();
  const handle = async (url: string) => {
    if (!isNativeAuthCallback(url) || pending.has(url)) return;
    pending.add(url);
    try {
      if (await completeNativeAuth(url)) {
        void Browser.close().catch(() => undefined);
        onSuccess();
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "فشل إتمام تسجيل الدخول داخل التطبيق");
    } finally {
      pending.delete(url);
    }
  };
  const sub = await App.addListener("appUrlOpen", ({ url }) => { void handle(url); });
  const initial = await App.getLaunchUrl();
  if (initial?.url) void handle(initial.url);
  return async () => sub.remove();
}
