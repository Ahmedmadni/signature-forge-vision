import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) } },
}));
vi.mock("@/lib/use-auth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

import { consumeGuestPages, readGuestUsage, restoreFailedGuestSave } from "./usage";

describe("guest daily page allowance", () => {
  beforeEach(() => {
    const state = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => state.get(key) ?? null,
      setItem: (key: string, value: string) => { state.set(key, value); },
    });
  });

  it("starts each guest with three device-local pages", () => {
    expect(readGuestUsage()).toMatchObject({
      plan: "guest",
      pages_used: 0,
      daily_limit: 3,
      remaining: 3,
    });
  });

  it("does not consume pages when a guest exceeds the allowance", () => {
    expect(consumeGuestPages(2)).toMatchObject({ allowed: true, pages_used: 2, remaining: 1 });
    expect(consumeGuestPages(2)).toMatchObject({ allowed: false, pages_used: 2, remaining: 1 });
    expect(consumeGuestPages(1)).toMatchObject({ allowed: true, pages_used: 3, remaining: 0 });
  });

  it("restores guest allowance after a failed PDF save, but never creates negative usage", () => {
    expect(consumeGuestPages(2)).toMatchObject({ allowed: true, pages_used: 2, source: "guest" });
    restoreFailedGuestSave(2);
    expect(readGuestUsage()).toMatchObject({ pages_used: 0, remaining: 3 });
    // Repeated local restoration never creates a negative counter.
    restoreFailedGuestSave(2);
    expect(readGuestUsage().pages_used).toBe(0);
  });

  it("resets a guest counter from a previous UTC date", () => {
    const previousDate = "2001-01-01";
    localStorage.setItem("waqqi:guest-usage:v1", JSON.stringify({ day: previousDate, count: 3 }));
    expect(readGuestUsage()).toMatchObject({ pages_used: 0, remaining: 3 });
  });
});
