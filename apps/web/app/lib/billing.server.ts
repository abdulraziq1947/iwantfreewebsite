import {
  createDb,
  eq,
  and,
  or,
  organisations,
  subscriptions,
  checkoutSessions,
  assetTransferTasks,
  stripeEvents,
} from "@iwfw/db";
import type { WorkerEnvConfig } from "@iwfw/config";
import type Stripe from "stripe";
import { newId } from "./ids";
import { log } from "./logger";
import {
  assertCheckoutConfigured,
  getStripe,
  isBlockingSubscriptionStatus,
  msFromStripeSeconds,
  verifyConfiguredWebsitePrice,
} from "./stripe.server";

type Db = ReturnType<typeof createDb>;

export async function getOrganisationSubscription(db: Db, organisationId: string) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organisationId, organisationId))
    .all();
  if (rows.length === 0) return null;
  const preferred = rows.find((row) => isBlockingSubscriptionStatus(row.status));
  if (preferred) return preferred;
  return rows.sort(
    (a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
  )[0];
}

export async function organisationHasBlockingSubscription(
  db: Db,
  organisationId: string,
): Promise<boolean> {
  const row = await getOrganisationSubscription(db, organisationId);
  if (!row) return false;
  return isBlockingSubscriptionStatus(row.status);
}

export async function ensureStripeCustomer(options: {
  db: Db;
  stripe: Stripe;
  organisationId: string;
  tradingName: string;
  email: string;
}): Promise<string> {
  const org = await options.db
    .select()
    .from(organisations)
    .where(eq(organisations.id, options.organisationId))
    .get();
  if (!org) throw new Error("Organisation not found");
  if (org.stripeCustomerId) return org.stripeCustomerId;

  const customer = await options.stripe.customers.create({
    email: options.email,
    name: options.tradingName,
    metadata: { organisation_id: options.organisationId },
  });

  await options.db
    .update(organisations)
    .set({
      stripeCustomerId: customer.id,
      updatedAt: new Date(),
    })
    .where(eq(organisations.id, options.organisationId));

  return customer.id;
}

export async function createCheckoutSessionForOrg(options: {
  db: Db;
  config: WorkerEnvConfig;
  organisationId: string;
  tradingName: string;
  email: string;
}): Promise<{ url: string } | { error: string }> {
  const configured = assertCheckoutConfigured(options.config);
  if (!configured.ok) {
    return { error: configured.error };
  }
  const { stripe, priceId } = configured;

  const priceCheck = await verifyConfiguredWebsitePrice(stripe, priceId);
  if (!priceCheck.ok) {
    return { error: priceCheck.error };
  }

  if (await organisationHasBlockingSubscription(options.db, options.organisationId)) {
    return {
      error:
        "This account already has an active subscription. Open Billing in your dashboard.",
    };
  }

  const customerId = await ensureStripeCustomer({
    db: options.db,
    stripe,
    organisationId: options.organisationId,
    tradingName: options.tradingName,
    email: options.email,
  });

  const existingOpen = await options.db
    .select()
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.organisationId, options.organisationId),
        eq(checkoutSessions.status, "open"),
      ),
    )
    .get();

  if (existingOpen) {
    try {
      const prior = await stripe.checkout.sessions.retrieve(
        existingOpen.stripeSessionId,
      );
      if (prior.status === "open" && prior.url) {
        return { url: prior.url };
      }
      await options.db
        .update(checkoutSessions)
        .set({
          status: prior.status === "complete" ? "complete" : "expired",
        })
        .where(eq(checkoutSessions.id, existingOpen.id));
    } catch {
      await options.db
        .update(checkoutSessions)
        .set({ status: "expired" })
        .where(eq(checkoutSessions.id, existingOpen.id));
    }
  }

  const appUrl = options.config.APP_URL.replace(/\/$/, "");
  const localId = newId("cs");
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: customerId,
      client_reference_id: options.organisationId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/get-started/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/get-started/review`,
      metadata: {
        organisation_id: options.organisationId,
      },
      subscription_data: {
        metadata: { organisation_id: options.organisationId },
      },
    },
    {
      idempotencyKey: `checkout_${localId}`,
    },
  );

  if (!session.url) {
    return { error: "Stripe did not return a Checkout URL." };
  }

  await options.db.insert(checkoutSessions).values({
    id: localId,
    organisationId: options.organisationId,
    stripeSessionId: session.id,
    stripePriceId: priceId,
    status: "open",
  });

  return { url: session.url };
}

export async function recordStripeEventOnce(
  db: Db,
  eventId: string,
  type: string,
): Promise<boolean> {
  try {
    await db.insert(stripeEvents).values({
      stripeEventId: eventId,
      type,
    });
    return true;
  } catch {
    // Unique constraint → already processed
    return false;
  }
}

function orgStatusFromSubscription(
  status: string,
  cancelAtPeriodEnd: boolean,
): "prospect" | "active" | "cancelling" | "cancelled" | "churned" {
  if (status === "active" || status === "trialing") {
    return cancelAtPeriodEnd ? "cancelling" : "active";
  }
  if (status === "past_due" || status === "unpaid") return "active";
  if (status === "canceled") return "cancelled";
  return "prospect";
}

export async function upsertSubscriptionFromStripe(options: {
  db: Db;
  organisationId: string;
  stripeSubscription: Stripe.Subscription;
}): Promise<{ id: string }> {
  const sub = options.stripeSubscription;
  const priceId =
    typeof sub.items.data[0]?.price?.id === "string"
      ? sub.items.data[0].price.id
      : "";
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const periodStart = msFromStripeSeconds(
    (sub as { current_period_start?: number }).current_period_start,
  );
  const periodEnd = msFromStripeSeconds(
    (sub as { current_period_end?: number }).current_period_end,
  );
  const canceledAt = msFromStripeSeconds(sub.canceled_at);
  const now = new Date();

  const existing = await options.db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, sub.id))
    .get();

  let subscriptionId = existing?.id;
  if (existing) {
    await options.db
      .update(subscriptions)
      .set({
        status: sub.status,
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        canceledAt,
        stripePriceId: priceId || existing.stripePriceId,
        stripeCustomerId: customerId,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, existing.id));
  } else {
    subscriptionId = newId("sub");
    await options.db.insert(subscriptions).values({
      id: subscriptionId,
      organisationId: options.organisationId,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: customerId,
      stripePriceId: priceId,
      status: sub.status,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      canceledAt,
    });
  }

  await options.db
    .update(organisations)
    .set({
      stripeCustomerId: customerId,
      status: orgStatusFromSubscription(
        sub.status,
        Boolean(sub.cancel_at_period_end),
      ),
      updatedAt: now,
    })
    .where(eq(organisations.id, options.organisationId));

  return { id: subscriptionId! };
}

/**
 * Create at most one open transfer task when a subscription has fully ended.
 * Never deletes or transfers assets automatically.
 */
export async function ensureAssetTransferTaskOnSubscriptionEnd(options: {
  db: Db;
  organisationId: string;
  subscriptionId: string;
  periodEndAt: Date | null;
}): Promise<"created" | "exists"> {
  const open = await options.db
    .select()
    .from(assetTransferTasks)
    .where(
      and(
        eq(assetTransferTasks.organisationId, options.organisationId),
        or(
          eq(assetTransferTasks.status, "pending"),
          eq(assetTransferTasks.status, "in_progress"),
        ),
      ),
    )
    .get();

  if (open) return "exists";

  try {
    await options.db.insert(assetTransferTasks).values({
      id: newId("xfer"),
      organisationId: options.organisationId,
      subscriptionId: options.subscriptionId,
      status: "pending",
      periodEndAt: options.periodEndAt,
    });
    log("info", "asset_transfer_task_created", {
      organisationId: options.organisationId,
      subscriptionId: options.subscriptionId,
    });
    return "created";
  } catch (error) {
    log("warn", "asset_transfer_task_create_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return "exists";
  }
}

export async function resolveOrganisationIdForSubscription(
  db: Db,
  stripeSubscription: Stripe.Subscription,
): Promise<string | null> {
  const fromMeta = stripeSubscription.metadata?.organisation_id;
  if (fromMeta) return fromMeta;

  const bySub = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id))
    .get();
  if (bySub) return bySub.organisationId;

  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;
  const org = await db
    .select()
    .from(organisations)
    .where(eq(organisations.stripeCustomerId, customerId))
    .get();
  return org?.id ?? null;
}

export async function markCheckoutSessionComplete(
  db: Db,
  stripeSessionId: string,
) {
  await db
    .update(checkoutSessions)
    .set({ status: "complete" })
    .where(eq(checkoutSessions.stripeSessionId, stripeSessionId));
}

export async function setSubscriptionCancelAtPeriodEnd(options: {
  config: WorkerEnvConfig;
  db: Db;
  organisationId: string;
  cancelAtPeriodEnd: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const stripe = getStripe(options.config);
  if (!stripe) {
    return { ok: false, error: "Stripe is not configured." };
  }
  const row = await getOrganisationSubscription(options.db, options.organisationId);
  if (!row) {
    return { ok: false, error: "No subscription found." };
  }
  if (!isBlockingSubscriptionStatus(row.status) && row.status !== "active") {
    // allow cancel/resume only while subscription is still active-like
  }
  if (row.status === "canceled") {
    return { ok: false, error: "Subscription has already ended." };
  }

  const updated = await stripe.subscriptions.update(row.stripeSubscriptionId, {
    cancel_at_period_end: options.cancelAtPeriodEnd,
  });

  await upsertSubscriptionFromStripe({
    db: options.db,
    organisationId: options.organisationId,
    stripeSubscription: updated,
  });

  return { ok: true };
}

export async function getOpenAssetTransferTask(db: Db, organisationId: string) {
  return db
    .select()
    .from(assetTransferTasks)
    .where(eq(assetTransferTasks.organisationId, organisationId))
    .get();
}
