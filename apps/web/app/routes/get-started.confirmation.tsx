import { Link, redirect } from "react-router";
import { createDb, eq, checkoutSessions, subscriptions } from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { getStripe, isBlockingSubscriptionStatus } from "../lib/stripe.server";
import {
  markCheckoutSessionComplete,
  upsertSubscriptionFromStripe,
} from "../lib/billing.server";
import type { Route } from "./+types/get-started.confirmation";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Payment confirmation — iwantfreewebsite.com" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const env = getEnv(context);
  const config = getConfig(context);
  const db = createDb(env.DB);
  const workspace = await getCustomerWorkspace(db, auth);
  if (!workspace.primary) throw redirect("/get-started/account");

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");

  let pending = true;
  let orderReference: string | null = null;

  const localSubs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organisationId, workspace.primary.id))
    .all();
  const localSub =
    localSubs.find((row) => isBlockingSubscriptionStatus(row.status)) ?? null;

  if (localSub) {
    pending = false;
    orderReference = localSub.stripeSubscriptionId;
  }

  // Best-effort read from Checkout session for UX. Verified webhooks remain
  // the source of truth for persisted subscription status — we only upsert here
  // when Stripe itself reports the session complete for this organisation.
  if (pending && sessionId && config.STRIPE_SECRET_KEY) {
    const stripe = getStripe(config);
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const ownsSession =
          session.client_reference_id === workspace.primary.id ||
          session.metadata?.organisation_id === workspace.primary.id;
        if (!ownsSession) {
          // Do not claim success for another organisation's session.
        } else if (
          session.status === "complete" &&
          typeof session.subscription === "string"
        ) {
          orderReference = session.id;
          await markCheckoutSessionComplete(db, session.id);
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await upsertSubscriptionFromStripe({
            db,
            organisationId: workspace.primary.id,
            stripeSubscription: sub,
          });
          if (isBlockingSubscriptionStatus(sub.status)) {
            pending = false;
            orderReference = sub.id;
          }
        } else {
          orderReference = session.id;
          pending = true;
        }
      } catch {
        // Leave pending; webhook will settle. Never invent a success state.
      }
    }
  }

  // If webhook already wrote checkout row
  if (sessionId) {
    const cs = await db
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.stripeSessionId, sessionId))
      .get();
    if (cs?.status === "complete" && !orderReference) {
      orderReference = cs.stripeSessionId;
    }
  }

  return {
    pending,
    tradingName: workspace.primary.tradingName,
    orderReference,
    email: auth.email,
  };
}

export default function GetStartedConfirmation({
  loaderData,
}: Route.ComponentProps) {
  return (
    <div className="iwfw-start">
      <header className="iwfw-start__intro">
        <p className="iwfw-start__kicker">Confirmation</p>
        <h1>
          {loaderData.pending
            ? "Payment processing"
            : "You're all set! Your website journey starts here."}
        </h1>
        <p className="iwfw-start__lead">
          {loaderData.pending
            ? "We’re confirming your payment with Stripe. This usually takes a few seconds. Refresh this page if it still shows as pending."
            : `Thanks ${loaderData.tradingName} — your Professional Business Website subscription is confirmed.`}
        </p>
      </header>

      <section className="iwfw-start__card">
        <dl className="iwfw-start__dl">
          <div>
            <dt>Business</dt>
            <dd>{loaderData.tradingName}</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>{loaderData.email}</dd>
          </div>
          <div>
            <dt>Package</dt>
            <dd>£39.99/month · £0 upfront website design fee</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{loaderData.pending ? "Pending confirmation" : "Active"}</dd>
          </div>
          {loaderData.orderReference && (
            <div>
              <dt>Reference</dt>
              <dd>{loaderData.orderReference}</dd>
            </div>
          )}
        </dl>

        {!loaderData.pending && (
          <>
            <h2 className="iwfw-start__subhead">Next steps</h2>
            <ul className="iwfw-start__includes">
              <li>Complete onboarding with your business and website details</li>
              <li>We’ll build and host your site</li>
              <li>Manage billing and cancellation anytime in your dashboard</li>
            </ul>
            <div className="iwfw-start__form" style={{ marginTop: "1rem" }}>
              <Link
                to="/dashboard/onboarding"
                className="iwfw-btn iwfw-btn--green iwfw-btn--block"
              >
                Continue to onboarding
              </Link>
              <Link
                to="/dashboard"
                className="iwfw-btn iwfw-btn--outline iwfw-btn--block"
              >
                Go to dashboard
              </Link>
            </div>
          </>
        )}

        {loaderData.pending && (
          <p className="iwfw-start__fine">
            Need help?{" "}
            <a href="mailto:support@iwantfreewebsite.com">
              support@iwantfreewebsite.com
            </a>{" "}
            · 0800 852 7267
          </p>
        )}
      </section>
    </div>
  );
}
