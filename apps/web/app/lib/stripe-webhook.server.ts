import type { WorkerEnvConfig } from "@iwfw/config";
import { createDb, eq, organisations, pendingOrders } from "@iwfw/db";
import type Stripe from "stripe";
import { log } from "./logger";
import {
  assertTestModeEvent,
  assertWebhookConfigured,
  msFromStripeSeconds,
} from "./stripe.server";
import {
  ensureAssetTransferTaskOnSubscriptionEnd,
  markCheckoutSessionComplete,
  recordStripeEventOnce,
  resolveOrganisationIdForSubscription,
  upsertSubscriptionFromStripe,
} from "./billing.server";
import { deliverActivationEmail } from "./activation-email.server";
import { fulfillPaidPendingOrder } from "./fulfill-order.server";

export async function handleStripeWebhookRequest(
  request: Request,
  env: Env,
  config: WorkerEnvConfig,
): Promise<Response> {
  const configured = assertWebhookConfigured(config);
  if (!configured.ok) {
    return Response.json(
      { error: configured.error },
      { status: configured.status },
    );
  }
  const { stripe } = configured;

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature." }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    // Signing secret used only for verification — never logged.
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      config.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    log("warn", "stripe_webhook_signature_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  const modeCheck = assertTestModeEvent(event);
  if (!modeCheck.ok) {
    log("warn", "stripe_webhook_livemode_rejected", {
      eventId: event.id,
      type: event.type,
    });
    return Response.json({ error: modeCheck.error }, { status: 400 });
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

        const pendingOrderId =
          session.metadata?.pending_order_id ||
          (session.client_reference_id?.startsWith("ord_")
            ? session.client_reference_id
            : null);

        if (pendingOrderId) {
          const sub =
            typeof session.subscription === "string"
              ? await stripe.subscriptions.retrieve(session.subscription)
              : null;
          if (sub) {
            await stripe.subscriptions.update(sub.id, {
              metadata: {
                ...sub.metadata,
                pending_order_id: pendingOrderId,
              },
            });
          }
          const fulfilled = await fulfillPaidPendingOrder({
            db,
            config,
            pendingOrderId,
            stripeSession: session,
            stripeSubscription: sub,
          });
          if (sub) {
            await stripe.subscriptions.update(sub.id, {
              metadata: {
                ...sub.metadata,
                organisation_id: fulfilled.organisationId,
                pending_order_id: pendingOrderId,
              },
            });
          }
          log("info", "pending_order_fulfilled", {
            pendingOrderId,
            organisationId: fulfilled.organisationId,
            createdDomainTask: fulfilled.createdDomainTask,
            hasActivationToken: Boolean(fulfilled.activationToken),
          });

          // Activation email only after verified payment + first-time token mint.
          // Failures do not roll back the paid order; customer can use resend.
          if (fulfilled.activationToken && fulfilled.activationTokenId) {
            const paidOrder = await db
              .select()
              .from(pendingOrders)
              .where(eq(pendingOrders.id, pendingOrderId))
              .get();
            const toEmail = (
              paidOrder?.email ||
              session.customer_details?.email ||
              ""
            )
              .trim()
              .toLowerCase();
            if (toEmail) {
              const emailResult = await deliverActivationEmail({
                db,
                config,
                toEmail,
                tradingName: paidOrder?.tradingName ?? null,
                rawToken: fulfilled.activationToken,
                tokenId: fulfilled.activationTokenId,
                skipIfAlreadySent: true,
              });
              if (!emailResult.ok) {
                log("warn", "activation_email_after_fulfillment_failed", {
                  pendingOrderId,
                  tokenId: fulfilled.activationTokenId,
                  error: emailResult.error,
                });
              }
            }
          }
          break;
        }

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
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const pendingOrderId = session.metadata?.pending_order_id;
        if (pendingOrderId) {
          await db
            .update(pendingOrders)
            .set({ status: "abandoned", updatedAt: new Date() })
            .where(eq(pendingOrders.id, pendingOrderId));
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
        const invoice = event.data.object as Stripe.Invoice;
        log("warn", "stripe_invoice_payment_failed", {
          invoiceId: invoice.id,
        });
        const pendingOrderId = (
          invoice as unknown as { metadata?: { pending_order_id?: string } }
        ).metadata?.pending_order_id;
        if (pendingOrderId) {
          await db
            .update(pendingOrders)
            .set({ status: "failed", updatedAt: new Date() })
            .where(eq(pendingOrders.id, pendingOrderId));
        }
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
