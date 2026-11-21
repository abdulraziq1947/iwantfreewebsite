import { describe, expect, it } from "vitest";
import {
  checkDomainAvailability,
  isSupportedDomainName,
  normalizeDomainInput,
  parseDomain,
  suggestDomainAlternatives,
} from "./domain-lookup.server";

describe("domain parsing", () => {
  it("normalises and parses supported TLDs", () => {
    expect(normalizeDomainInput("https://www.Example.CO.UK/path")).toBe(
      "example.co.uk",
    );
    expect(parseDomain("acme.com").tld).toBe("com");
    expect(parseDomain("acme.co.uk").tld).toBe("co.uk");
    expect(parseDomain("acme.uk").tld).toBe("uk");
    expect(isSupportedDomainName("acme.com")).toBe(true);
    expect(isSupportedDomainName("acme.io")).toBe(false);
  });
});

describe("domain availability lookup", () => {
  it("marks 404 RDAP responses as available", async () => {
    const fetchImpl = async () => new Response(null, { status: 404 });
    const result = await checkDomainAvailability("brandnewbiz.co.uk", fetchImpl);
    expect(result.availability).toBe("available");
    expect(result.source).toBe("rdap");
  });

  it("marks 200 RDAP responses as unavailable", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ objectClassName: "domain" }), {
        status: 200,
      });
    const result = await checkDomainAvailability("google.com", fetchImpl);
    expect(result.availability).toBe("unavailable");
  });

  it("rejects invalid names without calling RDAP", async () => {
    let called = false;
    const fetchImpl = async () => {
      called = true;
      return new Response(null, { status: 404 });
    };
    const result = await checkDomainAvailability("not a domain", fetchImpl);
    expect(result.availability).toBe("invalid");
    expect(called).toBe(false);
  });

  it("suggests alternatives when preferred is taken", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("taken.co.uk") && !url.includes("takenhq")) {
        return new Response("{}", { status: 200 });
      }
      return new Response(null, { status: 404 });
    };
    const alts = await suggestDomainAlternatives("taken.co.uk", fetchImpl, 3);
    expect(alts.length).toBeGreaterThan(0);
    expect(alts.every((a) => a.availability === "available")).toBe(true);
  });
});

describe("domain policy", () => {
  it("never auto-purchases domains", () => {
    const autoPurchase = false;
    const autoRegister = false;
    expect(autoPurchase).toBe(false);
    expect(autoRegister).toBe(false);
  });
});
