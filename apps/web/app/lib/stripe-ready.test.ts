import { describe, expect, it } from "vitest";
import { REQUIRED_WEBHOOK_EVENTS, PRODUCTION_WEBHOOK_URL } from "./stripe-ready.server";

describe("stripe-ready", () => {
  it("documents the production webhook URL", () => {
    expect(PRODUCTION_WEBHOOK_URL).toBe(
      "https://iwantfreewebsite.com/api/stripe/webhook",
    );
  });

  it("requires the seven handled webhook events", () => {
    expect(REQUIRED_WEBHOOK_EVENTS).toEqual([
      "checkout.session.completed",
      "checkout.session.expired",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.paid",
      "invoice.payment_failed",
    ]);
  });
});
