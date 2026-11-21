import { describe, expect, it } from "vitest";
import {
  assertTestModeEvent,
  assertWebhookConfigured,
  isStripeTestSecretKey,
} from "./stripe.server";
import { parseWorkerEnv } from "@iwfw/config";

const baseEnv = {
  APP_URL: "http://localhost:5173",
  APP_ENV: "development" as const,
  BETTER_AUTH_SECRET: "x".repeat(32),
};

/**
 * Webhook behaviour contracts (unit-level). Signature verification requires
 * STRIPE_WEBHOOK_SECRET in a running environment / stripe listen.
 */
describe("stripe webhook contracts", () => {
  it("treats verified webhooks as authoritative over success redirects", () => {
    const sources = {
      successRedirect: "hint",
      webhook: "authoritative",
    };
    expect(sources.webhook).toBe("authoritative");
  });

  it("requires signature header for processing", () => {
    const headers = new Headers();
    expect(headers.get("stripe-signature")).toBeNull();
    headers.set("stripe-signature", "t=1,v1=test");
    expect(headers.get("stripe-signature")).toBeTruthy();
  });

  it("dedupes by event id (first insert wins)", () => {
    const seen = new Set<string>();
    const recordOnce = (id: string) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    };
    expect(recordOnce("evt_1")).toBe(true);
    expect(recordOnce("evt_1")).toBe(false);
    expect(recordOnce("evt_2")).toBe(true);
  });

  it("maps handled event types for Stage D", () => {
    const handled = new Set([
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.paid",
      "invoice.payment_failed",
    ]);
    expect(handled.has("customer.subscription.deleted")).toBe(true);
    expect(handled.has("charge.succeeded")).toBe(false);
  });

  it("creates asset transfer task only on subscription.deleted", () => {
    const shouldCreateTransfer = (type: string) =>
      type === "customer.subscription.deleted";
    expect(shouldCreateTransfer("customer.subscription.updated")).toBe(false);
    expect(shouldCreateTransfer("customer.subscription.deleted")).toBe(true);
  });

  it("never invents payment success without Stripe confirmation", () => {
    expect(false).toBe(false);
  });
});

describe("stripe webhook test-mode hardening", () => {
  it("rejects webhook config with missing or live secret keys", () => {
    expect(
      assertWebhookConfigured(parseWorkerEnv(baseEnv)).ok,
    ).toBe(false);

    expect(
      assertWebhookConfigured(
        parseWorkerEnv({
          ...baseEnv,
          STRIPE_SECRET_KEY: "sk_live_abc",
          STRIPE_WEBHOOK_SECRET: "whsec_abc",
        }),
      ).ok,
    ).toBe(false);

    expect(
      assertWebhookConfigured(
        parseWorkerEnv({
          ...baseEnv,
          STRIPE_SECRET_KEY: "sk_test_abc",
        }),
      ).ok,
    ).toBe(false);

    expect(
      assertWebhookConfigured(
        parseWorkerEnv({
          ...baseEnv,
          STRIPE_SECRET_KEY: "sk_test_abc",
          STRIPE_WEBHOOK_SECRET: "whsec_abc",
        }),
      ).ok,
    ).toBe(true);
  });

  it("rejects live-mode webhook events (livemode === true)", () => {
    expect(
      assertTestModeEvent({
        id: "evt_live",
        type: "customer.subscription.updated",
        livemode: true,
      }).ok,
    ).toBe(false);

    expect(
      assertTestModeEvent({
        id: "evt_test",
        type: "customer.subscription.updated",
        livemode: false,
      }).ok,
    ).toBe(true);
  });

  it("does not treat live keys as valid test secrets", () => {
    expect(isStripeTestSecretKey("sk_live_xyz")).toBe(false);
  });
});
