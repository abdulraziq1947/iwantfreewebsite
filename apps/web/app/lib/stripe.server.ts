import Stripe from "stripe";
import {
  isStripeLiveSecretKey,
  isStripeSecretKeyAllowed,
  isStripeTestSecretKey,
  type WorkerEnvConfig,
} from "@iwfw/config";

/** Core website plan: £39.99 GBP / month (inclusive of VAT where applicable). */
export const WEBSITE_PLAN_UNIT_AMOUNT = 3999;
export const WEBSITE_PLAN_CURRENCY = "gbp";
export const WEBSITE_PLAN_INTERVAL = "month" as const;

export { isStripeTestSecretKey, isStripeLiveSecretKey, isStripeSecretKeyAllowed };

function allowLive(config: WorkerEnvConfig): boolean {
  return Boolean(config.STRIPE_ALLOW_LIVE);
}

export function assertStripeSecretKey(
  key: string | null | undefined,
  liveAllowed: boolean,
): { ok: true } | { ok: false; error: string } {
  if (!key) {
    return { ok: false, error: "Stripe secret key is not configured." };
  }
  if (isStripeSecretKeyAllowed(key, liveAllowed)) {
    return { ok: true };
  }
  if (isStripeLiveSecretKey(key) && !liveAllowed) {
    return {
      ok: false,
      error:
        "Live Stripe keys are disabled. Set STRIPE_ALLOW_LIVE=true only after live credentials and webhook are verified.",
    };
  }
  return {
    ok: false,
    error:
      "Stripe secret key must be sk_test_… (or sk_live_… when STRIPE_ALLOW_LIVE=true).",
  };
}

/** @deprecated Prefer assertStripeSecretKey — kept for existing tests. */
export function assertStripeTestSecretKey(
  key: string | null | undefined,
): { ok: true } | { ok: false; error: string } {
  return assertStripeSecretKey(key, false);
}

/** True when Checkout can run (allowed secret + price id). */
export function isStripeTestCheckoutReady(config: WorkerEnvConfig): boolean {
  return Boolean(
    isStripeSecretKeyAllowed(config.STRIPE_SECRET_KEY, allowLive(config)) &&
      config.STRIPE_PRICE_ID,
  );
}

/** True when webhooks can run (allowed secret + webhook secret). */
export function isStripeTestWebhookReady(config: WorkerEnvConfig): boolean {
  return Boolean(
    isStripeSecretKeyAllowed(config.STRIPE_SECRET_KEY, allowLive(config)) &&
      config.STRIPE_WEBHOOK_SECRET,
  );
}

/**
 * Returns a Stripe client for an allowed secret key.
 * Live keys require STRIPE_ALLOW_LIVE=true.
 */
export function getStripe(config: WorkerEnvConfig): Stripe | null {
  if (
    !isStripeSecretKeyAllowed(config.STRIPE_SECRET_KEY, allowLive(config))
  ) {
    return null;
  }
  return new Stripe(config.STRIPE_SECRET_KEY!, {
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

export function assertCheckoutConfigured(config: WorkerEnvConfig):
  | { ok: true; stripe: Stripe; priceId: string }
  | { ok: false; error: string } {
  const keyCheck = assertStripeSecretKey(
    config.STRIPE_SECRET_KEY,
    allowLive(config),
  );
  if (!keyCheck.ok) {
    return {
      ok: false,
      error:
        keyCheck.error === "Stripe secret key is not configured."
          ? "Stripe Checkout is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID."
          : keyCheck.error,
    };
  }
  if (!config.STRIPE_PRICE_ID) {
    return {
      ok: false,
      error:
        "Stripe Checkout is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID.",
    };
  }
  const stripe = getStripe(config);
  if (!stripe) {
    return { ok: false, error: "Stripe client could not be created." };
  }
  return { ok: true, stripe, priceId: config.STRIPE_PRICE_ID };
}

export function assertWebhookConfigured(config: WorkerEnvConfig):
  | { ok: true; stripe: Stripe }
  | { ok: false; error: string; status: number } {
  const keyCheck = assertStripeSecretKey(
    config.STRIPE_SECRET_KEY,
    allowLive(config),
  );
  if (!keyCheck.ok) {
    return { ok: false, error: keyCheck.error, status: 503 };
  }
  if (!config.STRIPE_WEBHOOK_SECRET) {
    return {
      ok: false,
      error: "Stripe webhook is not configured.",
      status: 503,
    };
  }
  const stripe = getStripe(config);
  if (!stripe) {
    return { ok: false, error: "Stripe client unavailable.", status: 503 };
  }
  return { ok: true, stripe };
}

/**
 * Reject livemode events unless STRIPE_ALLOW_LIVE is enabled.
 * Test-mode events are always accepted when signature verified.
 */
export function assertStripeEventMode(
  event: Pick<Stripe.Event, "livemode" | "id" | "type">,
  liveAllowed: boolean,
): { ok: true } | { ok: false; error: string } {
  if (event.livemode && !liveAllowed) {
    return {
      ok: false,
      error:
        "Live-mode Stripe events are rejected until STRIPE_ALLOW_LIVE=true.",
    };
  }
  return { ok: true };
}

/** @deprecated Prefer assertStripeEventMode(event, allowLive). */
export function assertTestModeEvent(
  event: Pick<Stripe.Event, "livemode" | "id" | "type">,
): { ok: true } | { ok: false; error: string } {
  return assertStripeEventMode(event, false);
}

/**
 * Pure price shape check: active recurring £39.99 GBP / month.
 * Does not accept rank-tracking or other products.
 */
export type WebsitePlanPriceShape = {
  id: string;
  active: boolean;
  currency: string;
  unit_amount: number | null;
  type: string;
  recurring: { interval: string } | null;
};

export function assertWebsitePlanPrice(
  price: WebsitePlanPriceShape,
): { ok: true } | { ok: false; error: string } {
  if (!price.active) {
    return { ok: false, error: "Configured Stripe price is not active." };
  }
  if (price.type !== "recurring") {
    return { ok: false, error: "Configured Stripe price must be recurring." };
  }
  if ((price.currency || "").toLowerCase() !== WEBSITE_PLAN_CURRENCY) {
    return {
      ok: false,
      error: "Configured Stripe price must be GBP.",
    };
  }
  if (price.unit_amount !== WEBSITE_PLAN_UNIT_AMOUNT) {
    return {
      ok: false,
      error: "Configured Stripe price must be £39.99 (3999 pence).",
    };
  }
  if (price.recurring?.interval !== WEBSITE_PLAN_INTERVAL) {
    return {
      ok: false,
      error: "Configured Stripe price must bill monthly.",
    };
  }
  return { ok: true };
}

/**
 * Retrieve STRIPE_PRICE_ID and validate £39.99 GBP/month.
 */
export async function verifyConfiguredWebsitePrice(
  stripe: Stripe,
  priceId: string,
): Promise<{ ok: true; price: Stripe.Price } | { ok: false; error: string }> {
  let price: Stripe.Price;
  try {
    price = await stripe.prices.retrieve(priceId);
  } catch {
    return {
      ok: false,
      error:
        "Configured STRIPE_PRICE_ID was not found on this Stripe account.",
    };
  }
  const shape = assertWebsitePlanPrice(price);
  if (!shape.ok) return shape;
  return { ok: true, price };
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
