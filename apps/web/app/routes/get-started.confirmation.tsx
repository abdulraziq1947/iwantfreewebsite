import { Link } from "react-router";
import { createDb, eq, pendingOrders } from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import { getStripe } from "../lib/stripe.server";
import { readResumeToken } from "../lib/pending-order.server";
import type { Route } from "./+types/get-started.confirmation";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Payment confirmation — iwantfreewebsite.com" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnv(context);
  const config = getConfig(context);
  const db = createDb(env.DB);
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");

  let pending = true;
  let email: string | null = null;
  let tradingName: string | null = null;
  let activationHint = false;
  let orderId: string | null = null;

  const resume = readResumeToken(request);
  if (resume) {
    const order = await db
      .select()
      .from(pendingOrders)
      .where(eq(pendingOrders.resumeToken, resume))
      .get();
    if (order) {
      orderId = order.id;
      email = order.email;
      tradingName = order.tradingName;
      if (order.status === "paid") {
        pending = false;
        activationHint = Boolean(order.userId);
      }
    }
  }

  if (pending && sessionId && config.STRIPE_SECRET_KEY) {
    const stripe = getStripe(config);
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const pendingOrderId = session.metadata?.pending_order_id;
        if (pendingOrderId) {
          const order = await db
            .select()
            .from(pendingOrders)
            .where(eq(pendingOrders.id, pendingOrderId))
            .get();
          if (order) {
            orderId = order.id;
            email = order.email || email;
            tradingName = order.tradingName || tradingName;
            if (order.status === "paid") {
              pending = false;
              activationHint = true;
            } else if (session.status === "complete") {
              pending = true;
            }
          }
        }
      } catch {
        // leave pending
      }
    }
  }

  return {
    pending,
    email,
    tradingName,
    activationHint,
    orderId,
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
            ? "Confirming your payment"
            : "Payment confirmed — set up your login"}
        </h1>
        <p className="iwfw-start__lead">
          {loaderData.pending
            ? "We’re confirming your payment. This usually takes a few seconds — refresh this page if it hasn’t updated yet."
            : `Thanks${loaderData.tradingName ? `, ${loaderData.tradingName}` : ""} — your order is active. Check your email for an activation link, or log in if you already have a password.`}
        </p>
      </header>

      <section className="iwfw-start__card">
        <dl className="iwfw-start__dl">
          {loaderData.email && (
            <div>
              <dt>Account email</dt>
              <dd>{loaderData.email}</dd>
            </div>
          )}
          <div>
            <dt>Status</dt>
            <dd>
              {loaderData.pending
                ? "Confirming payment…"
                : "Paid — ready to activate your account"}
            </dd>
          </div>
          <div>
            <dt>Next</dt>
            <dd>
              {loaderData.pending
                ? "Hang tight while we finish confirming your subscription."
                : "Set your password, then open your dashboard. We’ll handle your domain and website build from there."}
            </dd>
          </div>
        </dl>

        {!loaderData.pending && (
          <div className="iwfw-start__form iwfw-start__form--spaced">
            <Link
              to="/get-started/activate"
              className="iwfw-btn iwfw-btn--green iwfw-btn--block"
            >
              {loaderData.activationHint
                ? "Set your password"
                : "Set your password / resend email"}
            </Link>
            <Link to="/login" className="iwfw-btn iwfw-btn--outline iwfw-btn--block">
              Go to login
            </Link>
            <Link
              to="/dashboard"
              className="iwfw-btn iwfw-btn--outline iwfw-btn--block"
            >
              Open dashboard
            </Link>
          </div>
        )}

        {loaderData.pending && (
          <p className="iwfw-start__fine">
            Need help?{" "}
            <a href="mailto:support@iwantfreewebsite.com">
              support@iwantfreewebsite.com
            </a>
          </p>
        )}
      </section>
    </div>
  );
}
