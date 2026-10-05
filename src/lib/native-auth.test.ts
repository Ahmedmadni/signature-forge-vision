import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  native: true,
  plugin: true,
  getPlatform: "android",
  open: vi.fn(),
  close: vi.fn(),
  addListener: vi.fn(),
  getLaunchUrl: vi.fn(),
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  setSession: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => mocks.native,
    getPlatform: () => mocks.getPlatform,
    isPluginAvailable: () => mocks.plugin,
  },
}));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: mocks.addListener,
    getLaunchUrl: mocks.getLaunchUrl,
  },
}));
vi.mock("@capacitor/browser", () => ({
  Browser: { open: mocks.open, close: mocks.close },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: mocks.signInWithOAuth,
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      setSession: mocks.setSession,
    },
  },
}));

import {
  completeNativeAuth,
  isAndroidNativeAuth,
  isNativeAuthCallback,
  NATIVE_AUTH_REDIRECT,
  startNativeGoogleSignIn,
  watchNativeAuthLinks,
} from "./native-auth";

describe("Native Google authentication return", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.native = true;
    mocks.plugin = true;
    mocks.getPlatform = "android";
    mocks.close.mockResolvedValue(undefined);
    mocks.open.mockResolvedValue(undefined);
    mocks.getLaunchUrl.mockResolvedValue({ url: undefined });
    mocks.addListener.mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) });
    mocks.signInWithOAuth.mockResolvedValue({ data: { url: "https://example.supabase.co/auth" }, error: null });
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });
    mocks.setSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });
  });

  it("only accepts callbacks for the exact Android app scheme, host, and path", () => {
    expect(isNativeAuthCallback(NATIVE_AUTH_REDIRECT + "?code=abc")).toBe(true);
    expect(isNativeAuthCallback("https://malicious.example/auth/callback?code=abc")).toBe(false);
    expect(isNativeAuthCallback("com.ahmedelmadni.waqqi://auth/malicious?code=abc")).toBe(false);
    expect(isNativeAuthCallback("com.ahmedelmadni.waqqi://other/callback?code=abc")).toBe(false);
  });

  it("starts OAuth in Android browser with a PKCE callback URI", async () => {
    expect(isAndroidNativeAuth()).toBe(true);
    await startNativeGoogleSignIn();
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: NATIVE_AUTH_REDIRECT, skipBrowserRedirect: true },
    });
    expect(mocks.open).toHaveBeenCalledWith({ url: "https://example.supabase.co/auth" });
  });

  it("exchanges the callback authorization code inside the app", async () => {
    expect(await completeNativeAuth(NATIVE_AUTH_REDIRECT + "?code=one-time-code")).toBe(true);
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
  });

  it("ignores unrelated links and rejects callbacks missing credentials", async () => {
    expect(await completeNativeAuth("https://another.example/?code=foo")).toBe(false);
    await expect(completeNativeAuth(NATIVE_AUTH_REDIRECT)).rejects.toThrow("بدون بيانات تسجيل دخول");
  });

  it("rebinds browser auth results to the active native session on appUrlOpen", async () => {
    let callback: ((ev: { url: string }) => void) | undefined;
    mocks.addListener.mockImplementation(async (_event: string, listener: (ev: { url: string }) => void) => {
      callback = listener;
      return { remove: vi.fn() };
    });
    const success = vi.fn();
    const error = vi.fn();
    const stop = await watchNativeAuthLinks(success, error);
    callback?.({ url: NATIVE_AUTH_REDIRECT + "?code=return-to-app" });
    await vi.waitFor(() => expect(success).toHaveBeenCalledTimes(1));
    expect(error).not.toHaveBeenCalled();
    await stop();
  });
});
