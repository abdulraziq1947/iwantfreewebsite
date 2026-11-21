import type { WorkerEnvConfig } from "@iwfw/config";
import { createDb, eq, organisations } from "@iwfw/db";
import type Stripe from "stripe";
import { log } from "./logger";
import { getStripe, msFromStripeSeconds } from "./stripe.server";
import {
  ensureAssetTransferTaskOnSubscriptionEnd,
  markCheckoutSessionComplete,
  recordStripeEventOnce,
  resolveOrganisationIdForSubscription,
  upsertSubscriptionFromStripe,
} from "./billing.server";

export async function handleStripeWebhookRequest(
  request: Request,
  env: Env,
  config: WorkerEnvConfig,
): Promise<Response> {
  if (!config.STRIPE_SECRET_KEY || !config.STRIPE_WEBHOOK_SECRET) {
    return Response.json(
      { error: "Stripe webhook is not configured." },
      { status: 503 },
    );
  }

  const stripe = getStripe(config);
  if (!stripe) {
    return Response.json({ error: "Stripe unavailable." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature." }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      config.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    log("warn", "stripe_webhook_signature_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  const db = createDb(env.DB);
  const firstTime = await recordStripeEventOnce(db, event.id, event.type);
  if (!firstTime) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await markCheckoutSessionComplete(db, session.id);
        const organisationId =
          session.metadata?.organisation_id ||
          session.client_reference_id ||
          null;
        if (organisationId && typeof session.subscription === "string") {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await upsertSubscriptionFromStripe({
            db,
            organisationId,
            stripeSubscription: sub,
          });
        } else if (organisationId && session.customer) {
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer.id;
          await db
            .update(organisations)
            .set({
              stripeCustomerId: customerId,
              updatedAt: new Date(),
            })
            .where(eq(organisations.id, organisationId));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const organisationId = await resolveOrganisationIdForSubscription(
          db,
          sub,
        );
        if (!organisationId) {
          log("warn", "stripe_subscription_missing_org", {
            subscriptionId: sub.id,
          });
          break;
        }
        await upsertSubscriptionFromStripe({
          db,
          organisationId,
          stripeSubscription: sub,
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const organisationId = await resolveOrganisationIdForSubscription(
          db,
          sub,
        );
        if (!organisationId) break;
        const { id: subscriptionId } = await upsertSubscriptionFromStripe({
          db,
          organisationId,
          stripeSubscription: { ...sub, status: "canceled" },
        });
        await ensureAssetTransferTaskOnSubscriptionEnd({
          db,
          organisationId,
          subscriptionId,
          periodEndAt: msFromStripeSeconds(
            (sub as { current_period_end?: number }).current_period_end,
          ),
        });
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const rawSub = (
          invoice as unknown as {
            subscription?: string | { id: string } | null;
          }
        ).subscription;
        const subId =
          typeof rawSub === "string"
            ? rawSub
            : rawSub && typeof rawSub === "object"
              ? rawSub.id
              : null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const organisationId = await resolveOrganisationIdForSubscription(
            db,
            sub,
          );
          if (organisationId) {
            await upsertSubscriptionFromStripe({
              db,
              organisationId,
              stripeSubscription: sub,
            });
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        log("warn", "stripe_invoice_payment_failed", {
          invoiceId: (event.data.object as Stripe.Invoice).id,
        });
        break;
      }
      default:
        break;
    }
  } catch (error) {
    log("error", "stripe_webhook_handler_failed", {
      type: event.type,
      error: error instanceof Error ? error.message : "unknown",
    });
    return Response.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return Response.json({ received: true });
}
