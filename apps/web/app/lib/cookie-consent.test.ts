import { describe, expect, it } from "vitest";
import {
  CONSENT_VERSION,
  buildConsent,
  parseConsent,
  readConsentFromDocumentCookie,
  CONSENT_COOKIE,
} from "./cookie-consent";

describe("cookie-consent", () => {
  it("rejects empty or invalid payloads", () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent("")).toBeNull();
    expect(parseConsent("{")).toBeNull();
    expect(parseConsent(JSON.stringify({ version: 0 }))).toBeNull();
  });

  it("parses a valid consent payload and forces essential on", () => {
    const state = buildConsent({ analytics: true, marketing: false });
    const parsed = parseConsent(JSON.stringify(state));
    expect(parsed?.version).toBe(CONSENT_VERSION);
    expect(parsed?.categories.essential).toBe(true);
    expect(parsed?.categories.analytics).toBe(true);
    expect(parsed?.categories.marketing).toBe(false);
  });

  it("reads consent from a Cookie header", () => {
    const state = buildConsent({ analytics: false, marketing: true });
    const header = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(state))}; other=1`;
    const read = readConsentFromDocumentCookie(header);
    expect(read?.categories.marketing).toBe(true);
    expect(read?.categories.analytics).toBe(false);
  });
});
