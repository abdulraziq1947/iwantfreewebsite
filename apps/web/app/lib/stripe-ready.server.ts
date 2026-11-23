import type { WorkerEnvConfig } from "@iwfw/config";
import {
  assertStripeSecretKey,
  getStripe,
  verifyConfiguredWebsitePrice,
  WEBSITE_PLAN_CURRENCY,
  WEBSITE_PLAN_INTERVAL,
  WEBSITE_PLAN_UNIT_AMOUNT,
} from "./stripe.server";

const REQUIRED_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
] as const;

const PRODUCTION_WEBHOOK_URL = "https://iwantfreewebsite.com/api/stripe/webhook";

/**
 * Safe, non-charging readiness probe for live Stripe.
 * Never returns secret values — only prefixes and public price shape.
 */
export async function buildStripeReadyReport(config: WorkerEnvConfig) {
  const allowLive = Boolean(config.STRIPE_ALLOW_LIVE);
  const keyCheck = assertStripeSecretKey(config.STRIPE_SECRET_KEY, allowLive);
  const keyPrefix = config.STRIPE_SECRET_KEY
    ? config.STRIPE_SECRET_KEY.slice(0, 7)
    : null;

  const report: Record<string, unknown> = {
    ok: false,
    allowLive,
    appUrl: config.APP_URL,
    expectedWebhookUrl: PRODUCTION_WEBHOOK_URL,
    requiredEvents: REQUIRED_WEBHOOK_EVENTS,
    keyConfigured: Boolean(config.STRIPE_SECRET_KEY),
    keyAllowed: keyCheck.ok,
    keyPrefix,
    webhookSecretConfigured: Boolean(config.STRIPE_WEBHOOK_SECRET),
    priceId: config.STRIPE_PRICE_ID ?? null,
    price: null as null | {
      id: string;
      active: boolean;
      currency: string;
      unitAmount: number | null;
      interval: string | null;
      matchesPlan: boolean;
    },
    webhookEndpoint: null as null | {
      id: string;
      url: string;
      status: string;
      enabledEvents: string[];
      missingEvents: string[];
      hasAllRequiredEvents: boolean;
    },
    blockers: [] as string[],
  };

  const blockers = report.blockers as string[];

  if (!keyCheck.ok) {
    blockers.push(keyCheck.error);
  }
  if (!config.STRIPE_WEBHOOK_SECRET) {
    blockers.push("STRIPE_WEBHOOK_SECRET is not configured.");
  }
  if (!config.STRIPE_PRICE_ID) {
    blockers.push("STRIPE_PRICE_ID is not configured.");
  }

  const stripe = getStripe(config);
  if (!stripe) {
    if (blockers.length === 0) {
      blockers.push("Stripe client could not be created.");
    }
    return report;
  }

  if (config.STRIPE_PRICE_ID) {
    const priceCheck = await verifyConfiguredWebsitePrice(
      stripe,
      config.STRIPE_PRICE_ID,
    );
    if (!priceCheck.ok) {
      blockers.push(priceCheck.error);
      report.price = {
        id: config.STRIPE_PRICE_ID,
        active: false,
        currency: WEBSITE_PLAN_CURRENCY,
        unitAmount: WEBSITE_PLAN_UNIT_AMOUNT,
        interval: WEBSITE_PLAN_INTERVAL,
        matchesPlan: false,
      };
    } else {
      report.price = {
        id: priceCheck.price.id,
        active: priceCheck.price.active,
        currency: priceCheck.price.currency,
        unitAmount: priceCheck.price.unit_amount,
        interval: priceCheck.price.recurring?.interval ?? null,
        matchesPlan: true,
      };
    }
  }

  try {
    const listed = await stripe.webhookEndpoints.list({ limit: 100 });
    const match =
      listed.data.find((ep) => ep.url === PRODUCTION_WEBHOOK_URL) ??
      listed.data.find((ep) =>
        ep.url.includes("iwantfreewebsite.com/api/stripe/webhook"),
      ) ??
      null;
    if (!match) {
      blockers.push(
        `No Stripe webhook endpoint found for ${PRODUCTION_WEBHOOK_URL}.`,
      );
    } else {
      const enabled = match.enabled_events || [];
      const missing =
        enabled.includes("*")
          ? []
          : REQUIRED_WEBHOOK_EVENTS.filter((ev) => !enabled.includes(ev));
      report.webhookEndpoint = {
        id: match.id,
        url: match.url,
        status: match.status,
        enabledEvents: enabled,
        missingEvents: [...missing],
        hasAllRequiredEvents: missing.length === 0,
      };
      if (match.status !== "enabled") {
        blockers.push(`Webhook endpoint status is "${match.status}".`);
      }
      if (missing.length > 0) {
        blockers.push(
          `Webhook endpoint is missing events: ${missing.join(", ")}.`,
        );
      }
    }
  } catch {
    blockers.push(
      "Could not list Stripe webhook endpoints with the configured secret key.",
    );
  }

  report.ok = blockers.length === 0;
  return report;
}

export { REQUIRED_WEBHOOK_EVENTS, PRODUCTION_WEBHOOK_URL };
