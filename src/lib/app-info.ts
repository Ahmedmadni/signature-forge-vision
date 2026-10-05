import { Capacitor } from "@capacitor/core";

export interface WaqqiAppInfo {
  native: boolean;
  version: string | null;
  build: string | null;
}

/** Read packaged Android metadata without making web usage depend on native plugins. */
export async function getWaqqiAppInfo(): Promise<WaqqiAppInfo> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return { native: false, version: null, build: null };
  }
  if (!Capacitor.isPluginAvailable("App")) {
    return { native: true, version: null, build: null };
  }
  try {
    const { App } = await import("@capacitor/app");
    const info = await App.getInfo();
    return {
      native: true,
      version: info.version || null,
      build: info.build || null,
    };
  } catch {
    return { native: true, version: null, build: null };
  }
}
