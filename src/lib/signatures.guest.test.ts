import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth,
  },
}));

vi.mock("@/lib/use-auth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

import {
  deleteSignature,
  getGuestSignatures,
  saveSignature,
  setDefaultSignature,
} from "./signatures";

function fakeStorage() {
  const state = new Map<string, string>();
  return {
    getItem: (key: string) => state.get(key) ?? null,
    setItem: (key: string, value: string) => { state.set(key, value); },
    removeItem: (key: string) => { state.delete(key); },
    clear: () => { state.clear(); },
  };
}

describe("guest signatures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", fakeStorage());
    vi.stubGlobal("crypto", { randomUUID: vi.fn().mockReturnValueOnce("guest-1").mockReturnValueOnce("guest-2") });
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("allows a guest to save a reusable image signature without signing in", async () => {
    await saveSignature({ dataUrl: "data:image/png;base64,AQID", name: "توقيعي", type: "drawn" });
    const [saved] = getGuestSignatures();
    expect(saved).toMatchObject({ id: "guest-1", name: "توقيعي", is_default: true });
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it("supports selecting a default guest signature and removing another", async () => {
    await saveSignature({ dataUrl: "data:image/png;base64,AQID", name: "الأول", type: "drawn" });
    await saveSignature({ dataUrl: "data:image/png;base64,BAUG", name: "الثاني", type: "typed" });
    await setDefaultSignature("guest-1");
    expect(getGuestSignatures().find((s) => s.is_default)?.id).toBe("guest-1");
    await deleteSignature("guest-1");
    expect(getGuestSignatures()).toHaveLength(1);
    expect(getGuestSignatures()[0].is_default).toBe(true);
  });
});
