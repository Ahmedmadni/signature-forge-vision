import { beforeEach, describe, expect, it, vi } from "vitest";

const controls = vi.hoisted(() => ({
  native: false,
  platform: "web",
  plugin: false,
  getInfo: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => controls.native,
    getPlatform: () => controls.platform,
    isPluginAvailable: () => controls.plugin,
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    getInfo: controls.getInfo,
  },
}));

import { getWaqqiAppInfo } from "./app-info";

describe("packaged app metadata", () => {
  beforeEach(() => {
    controls.native = false;
    controls.platform = "web";
    controls.plugin = false;
    controls.getInfo.mockReset();
  });

  it("does not require native metadata on the web", async () => {
    await expect(getWaqqiAppInfo()).resolves.toEqual({ native: false, version: null, build: null });
    expect(controls.getInfo).not.toHaveBeenCalled();
  });

  it("returns the installed Android version and build", async () => {
    controls.native = true;
    controls.platform = "android";
    controls.plugin = true;
    controls.getInfo.mockResolvedValue({ name: "وقِّع", id: "com.ahmedelmadni.waqqi", version: "1.2.3", build: "123" });
    await expect(getWaqqiAppInfo()).resolves.toEqual({ native: true, version: "1.2.3", build: "123" });
  });

  it("fails closed to unknown metadata when the native bridge is unavailable", async () => {
    controls.native = true;
    controls.platform = "android";
    controls.plugin = false;
    await expect(getWaqqiAppInfo()).resolves.toEqual({ native: true, version: null, build: null });
  });
});
