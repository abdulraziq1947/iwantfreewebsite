import { describe, expect, it } from "vitest";
import { clientIpFromRequest } from "./audit-log.server";

describe("clientIpFromRequest", () => {
  it("prefers cf-connecting-ip", () => {
    const req = new Request("https://example.com", {
      headers: {
        "cf-connecting-ip": "1.2.3.4",
        "x-forwarded-for": "9.9.9.9",
      },
    });
    expect(clientIpFromRequest(req)).toBe("1.2.3.4");
  });

  it("falls back to x-forwarded-for first hop", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "8.8.8.8, 1.1.1.1" },
    });
    expect(clientIpFromRequest(req)).toBe("8.8.8.8");
  });
});
