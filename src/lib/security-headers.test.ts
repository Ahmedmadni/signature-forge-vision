import { describe, expect, it } from "vitest";
import { withSecurityHeaders } from "./security-headers";

describe("security headers", () => {
  it("adds safe baseline headers without changing the response body or status", async () => {
    const secured = withSecurityHeaders(
      new Response("ok", {
        status: 201,
        headers: { "content-type": "text/plain" },
      }),
    );

    expect(secured.status).toBe(201);
    expect(await secured.text()).toBe("ok");
    expect(secured.headers.get("x-content-type-options")).toBe("nosniff");
    expect(secured.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(secured.headers.get("permissions-policy")).toBe(
      "camera=(self), microphone=(), geolocation=()",
    );
  });

  it("does not overwrite an upstream security header", () => {
    const secured = withSecurityHeaders(
      new Response(null, {
        headers: { "Referrer-Policy": "no-referrer" },
      }),
    );

    expect(secured.headers.get("referrer-policy")).toBe("no-referrer");
  });
});
