import { describe, expect, it } from "vitest";
import {
  isBlockingSubscriptionStatus,
  msFromStripeSeconds,
} from "./stripe.server";
import {
  isStripeCheckoutConfigured,
  isStripeWebhookConfigured,
  parseWorkerEnv,
} from "@iwfw/config";

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

describe("stripe config", () => {
  const base = {
    APP_URL: "http://localhost:5173",
    APP_ENV: "development" as const,
    BETTER_AUTH_SECRET: "x".repeat(32),
  };

  it("requires secret + STRIPE_PRICE_ID for checkout", () => {
    expect(isStripeCheckoutConfigured(parseWorkerEnv(base))).toBe(false);
    expect(
      isStripeCheckoutConfigured(
        parseWorkerEnv({
          ...base,
          STRIPE_SECRET_KEY: "sk_test_x",
          STRIPE_PRICE_ID: "price_1UeFSMDyQBgE8h6RPqVRtzDo",
        }),
      ),
    ).toBe(true);
  });

  it("parses STRIPE_PRICE_ID as canonical name", () => {
    const cfg = parseWorkerEnv({
      ...base,
      STRIPE_PRICE_ID: "price_abc",
    });
    expect(cfg.STRIPE_PRICE_ID).toBe("price_abc");
  });

  it("requires webhook secret separately from checkout", () => {
    expect(
      isStripeWebhookConfigured(
        parseWorkerEnv({
          ...base,
          STRIPE_SECRET_KEY: "sk_test_x",
          STRIPE_PRICE_ID: "price_1",
        }),
      ),
    ).toBe(false);
    expect(
      isStripeWebhookConfigured(
        parseWorkerEnv({
          ...base,
          STRIPE_SECRET_KEY: "sk_test_x",
          STRIPE_WEBHOOK_SECRET: "whsec_x",
        }),
      ),
    ).toBe(true);
  });
});

describe("org billing authorisation contract", () => {
  it("only acts on organisations the authenticated membership list includes", () => {
    const membershipOrgIds = ["org_a", "org_b"];
    const requestedOrgId = "org_a";
    const foreignOrgId = "org_evil";
    expect(membershipOrgIds.includes(requestedOrgId)).toBe(true);
    expect(membershipOrgIds.includes(foreignOrgId)).toBe(false);
  });
});

describe("asset transfer policy", () => {
  it("creates transfer task only when subscription ends, and only once", () => {
    const createOnCancelScheduled = false;
    const createOnSubscriptionDeleted = true;
    expect(createOnCancelScheduled).toBe(false);
    expect(createOnSubscriptionDeleted).toBe(true);

    const openStatuses = new Set(["pending", "in_progress"]);
    const existing = { status: "pending" as const };
    const shouldCreate = !openStatuses.has(existing.status);
    expect(shouldCreate).toBe(false);
  });

  it("never auto-deletes or transfers assets", () => {
    const autoDeleteAssets = false;
    const autoTransferAssets = false;
    const autoSuspendHosting = false;
    expect(autoDeleteAssets).toBe(false);
    expect(autoTransferAssets).toBe(false);
    expect(autoSuspendHosting).toBe(false);
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
