import Stripe from "stripe";
import type { WorkerEnvConfig } from "@iwfw/config";
import { isStripeCheckoutConfigured } from "@iwfw/config";

export function getStripe(config: WorkerEnvConfig): Stripe | null {
  if (!config.STRIPE_SECRET_KEY) return null;
  return new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: "2025-10-29.clover",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function requireStripePriceId(config: WorkerEnvConfig): string {
  if (!config.STRIPE_PRICE_ID) {
    throw new Error("STRIPE_PRICE_ID is not configured");
  }
  return config.STRIPE_PRICE_ID;
}

export function assertCheckoutConfigured(config: WorkerEnvConfig): {
  ok: true;
  stripe: Stripe;
  priceId: string;
} | { ok: false; error: string } {
  if (!isStripeCheckoutConfigured(config)) {
    return {
      ok: false,
      error:
        "Stripe Checkout is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID (test mode).",
    };
  }
  const stripe = getStripe(config);
  if (!stripe) {
    return { ok: false, error: "Stripe client could not be created." };
  }
  return { ok: true, stripe, priceId: config.STRIPE_PRICE_ID! };
}

/** Active-like statuses that block a second Checkout. */
export const BLOCKING_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
] as const;

export function isBlockingSubscriptionStatus(status: string): boolean {
  return (BLOCKING_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);
}

export function msFromStripeSeconds(
  value: number | null | undefined,
): Date | null {
  if (value == null) return null;
  return new Date(value * 1000);
}
