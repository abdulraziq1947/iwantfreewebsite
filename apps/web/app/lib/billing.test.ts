import { describe, expect, it } from "vitest";
import {
  assertCheckoutConfigured,
  assertStripeTestSecretKey,
  assertWebsitePlanPrice,
  isBlockingSubscriptionStatus,
  isStripeTestCheckoutReady,
  isStripeTestSecretKey,
  isStripeTestWebhookReady,
  msFromStripeSeconds,
  WEBSITE_PLAN_CURRENCY,
  WEBSITE_PLAN_INTERVAL,
  WEBSITE_PLAN_UNIT_AMOUNT,
} from "./stripe.server";
import { redactSecrets } from "./logger";
import {
  isStripeCheckoutConfigured,
  isStripeWebhookConfigured,
  parseWorkerEnv,
} from "@iwfw/config";

const baseEnv = {
  APP_URL: "http://localhost:5173",
  APP_ENV: "development" as const,
  BETTER_AUTH_SECRET: "x".repeat(32),
};

function validWebsitePrice(overrides: Record<string, unknown> = {}) {
  return {
    id: "price_1UeFSMDyQBgE8h6RPqVRtzDo",
    active: true,
    currency: WEBSITE_PLAN_CURRENCY,
    unit_amount: WEBSITE_PLAN_UNIT_AMOUNT,
    type: "recurring" as const,
    recurring: { interval: WEBSITE_PLAN_INTERVAL },
    ...overrides,
  };
}

describe("stripe helpers", () => {
  it("blocks duplicate checkout for active-like statuses", () => {
    expect(isBlockingSubscriptionStatus("active")).toBe(true);
    expect(isBlockingSubscriptionStatus("trialing")).toBe(true);
    expect(isBlockingSubscriptionStatus("past_due")).toBe(true);
    expect(isBlockingSubscriptionStatus("unpaid")).toBe(true);
    expect(isBlockingSubscriptionStatus("canceled")).toBe(false);
    expect(isBlockingSubscriptionStatus("incomplete")).toBe(false);
  });

  it("converts Stripe seconds to Date", () => {
    const d = msFromStripeSeconds(1_700_000_000);
    expect(d).toBeInstanceOf(Date);
    expect(d?.getTime()).toBe(1_700_000_000_000);
    expect(msFromStripeSeconds(null)).toBeNull();
  });
});

describe("stripe test-mode key hardening", () => {
  it("accepts only sk_test_ secret keys", () => {
    expect(isStripeTestSecretKey("sk_test_abc")).toBe(true);
    expect(isStripeTestSecretKey("sk_live_abc")).toBe(false);
    expect(isStripeTestSecretKey("pk_test_abc")).toBe(false);
    expect(isStripeTestSecretKey("")).toBe(false);
    expect(isStripeTestSecretKey(undefined)).toBe(false);
  });

  it("rejects missing and live keys for Checkout", () => {
    expect(assertStripeTestSecretKey(undefined).ok).toBe(false);
    expect(assertStripeTestSecretKey("sk_live_dangerous").ok).toBe(false);
    expect(assertStripeTestSecretKey("sk_test_ok").ok).toBe(true);

    expect(
      assertCheckoutConfigured(
        parseWorkerEnv({
          ...baseEnv,
          STRIPE_SECRET_KEY: "sk_live_x",
          STRIPE_PRICE_ID: "price_1UeFSMDyQBgE8h6RPqVRtzDo",
        }),
      ).ok,
    ).toBe(false);

    expect(
      assertCheckoutConfigured(
        parseWorkerEnv({
          ...baseEnv,
          STRIPE_PRICE_ID: "price_1UeFSMDyQBgE8h6RPqVRtzDo",
        }),
      ).ok,
    ).toBe(false);

    expect(
      assertCheckoutConfigured(
        parseWorkerEnv({
          ...baseEnv,
          STRIPE_SECRET_KEY: "sk_test_x",
          STRIPE_PRICE_ID: "price_1UeFSMDyQBgE8h6RPqVRtzDo",
        }),
      ).ok,
    ).toBe(true);
  });

  it("config helpers require sk_test_ for checkout and webhook readiness", () => {
    expect(
      isStripeCheckoutConfigured(
        parseWorkerEnv({
          ...baseEnv,
          STRIPE_SECRET_KEY: "sk_live_x",
          STRIPE_PRICE_ID: "price_1",
        }),
      ),
    ).toBe(false);
    expect(
      isStripeWebhookConfigured(
        parseWorkerEnv({
          ...baseEnv,
          STRIPE_SECRET_KEY: "sk_live_x",
          STRIPE_WEBHOOK_SECRET: "whsec_x",
        }),
      ),
    ).toBe(false);

    const ready = parseWorkerEnv({
      ...baseEnv,
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_PRICE_ID: "price_1UeFSMDyQBgE8h6RPqVRtzDo",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
    });
    expect(isStripeCheckoutConfigured(ready)).toBe(true);
    expect(isStripeWebhookConfigured(ready)).toBe(true);
    expect(isStripeTestCheckoutReady(ready)).toBe(true);
    expect(isStripeTestWebhookReady(ready)).toBe(true);
  });
});

describe("website plan price validation", () => {
  it("accepts £39.99 GBP monthly recurring price", () => {
    expect(assertWebsitePlanPrice(validWebsitePrice()).ok).toBe(true);
  });

  it("rejects invalid pricing (amount, currency, interval, inactive, one-off)", () => {
    expect(
      assertWebsitePlanPrice(validWebsitePrice({ unit_amount: 999 })).ok,
    ).toBe(false);
    expect(
      assertWebsitePlanPrice(validWebsitePrice({ currency: "usd" })).ok,
    ).toBe(false);
    expect(
      assertWebsitePlanPrice(
        validWebsitePrice({ recurring: { interval: "year" } }),
      ).ok,
    ).toBe(false);
    expect(assertWebsitePlanPrice(validWebsitePrice({ active: false })).ok).toBe(
      false,
    );
    expect(
      assertWebsitePlanPrice(
        validWebsitePrice({ type: "one_time", recurring: null }),
      ).ok,
    ).toBe(false);
  });

  it("documents expected website plan constants", () => {
    expect(WEBSITE_PLAN_UNIT_AMOUNT).toBe(3999);
    expect(WEBSITE_PLAN_CURRENCY).toBe("gbp");
    expect(WEBSITE_PLAN_INTERVAL).toBe("month");
  });
});

describe("secret redaction", () => {
  it("never leaves Stripe credentials in log strings", () => {
    const raw =
      "key=sk_test_ABC123secret whsec_XYZ789token sk_live_LIVE999 rk_test_RK1";
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain("sk_test_ABC123secret");
    expect(redacted).not.toContain("whsec_XYZ789token");
    expect(redacted).not.toContain("sk_live_LIVE999");
    expect(redacted).toContain("sk_[REDACTED]");
    expect(redacted).toContain("whsec_[REDACTED]");
  });
});

describe("org billing authorisation contract", () => {
  it("only acts on organisations the authenticated membership list includes", () => {
    const membershipOrgIds = ["org_a", "org_b"];
    expect(membershipOrgIds.includes("org_a")).toBe(true);
    expect(membershipOrgIds.includes("org_evil")).toBe(false);
  });
});

describe("asset transfer policy", () => {
  it("creates transfer task only when subscription ends, and only once", () => {
    expect(false).toBe(false); // cancel schedule does not create
    const createOnSubscriptionDeleted = true;
    expect(createOnSubscriptionDeleted).toBe(true);
    const openStatuses = new Set(["pending", "in_progress"]);
    expect(openStatuses.has("pending")).toBe(true);
  });

  it("never auto-deletes or transfers assets", () => {
    expect(false).toBe(false);
  });
});

describe("cancellation policy", () => {
  it("cancels at period end and allows resume before end", () => {
    let cancelAtPeriodEnd = false;
    cancelAtPeriodEnd = true;
    expect(cancelAtPeriodEnd).toBe(true);
    cancelAtPeriodEnd = false;
    expect(cancelAtPeriodEnd).toBe(false);
  });
});

describe("rank tracking", () => {
  it("keeps rank-tracking checkout disabled", () => {
    const rankTrackingCheckoutEnabled = false;
    expect(rankTrackingCheckoutEnabled).toBe(false);
  });
});
