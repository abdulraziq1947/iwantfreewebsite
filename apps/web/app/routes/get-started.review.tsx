import { Form, Link, redirect, useNavigation } from "react-router";
import { isStripeCheckoutConfigured } from "@iwfw/config";
import { createDb, eq, pendingOrders } from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import {
  getOrCreateDraftOrder,
  orderQuestionnaire,
} from "../lib/pending-order.server";
import { createCheckoutForPendingOrder } from "../lib/billing.server";
import { checkDomainAvailability } from "../lib/domain-lookup.server";
import { questionnaireSummary } from "../lib/order-questionnaire";
import {
  DOMAIN_DISCLAIMER,
  PACKAGE_INCLUDES,
  PACKAGE_NAME,
  PACKAGE_PRICE_LABEL,
  TERMS_VERSION,
} from "../lib/get-started";
import type { Route } from "./+types/get-started.review";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Review & pay — iwantfreewebsite.com" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const config = getConfig(context);
  const db = createDb(getEnv(context).DB);
  const { order } = await getOrCreateDraftOrder(db, request);
  const q = orderQuestionnaire(order);

  if (!q.contact.email) {
    throw redirect("/get-started/personal");
  }
  if (!q.business.tradingName) {
    throw redirect("/get-started/business");
  }
  if (!order.domainName || !order.domainMode || !order.domainAcknowledged) {
    throw redirect("/get-started/domain");
  }

  let domainRecheck: {
    availability: string;
    message: string;
  } | null = null;
  if (order.domainMode === "new") {
    const result = await checkDomainAvailability(order.domainName);
    domainRecheck = {
      availability: result.availability,
      message: result.message,
    };
    await db
      .update(pendingOrders)
      .set({
        domainLastCheckedAt: new Date(),
        domainLastAvailable: result.availability === "available",
        updatedAt: new Date(),
      })
      .where(eq(pendingOrders.id, order.id));
  }

  return {
    tradingName: order.tradingName || q.business.tradingName,
    email: order.email || q.contact.email,
    domainName: order.domainName,
    domainMode: order.domainMode,
    summary: questionnaireSummary(q),
    domainRecheck,
    disclaimer: DOMAIN_DISCLAIMER,
    stripeConfigured: isStripeCheckoutConfigured(config),
    termsVersion: TERMS_VERSION,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const config = getConfig(context);
  const db = createDb(getEnv(context).DB);
  const { order } = await getOrCreateDraftOrder(db, request);
  const form = await request.formData();
  const termsAccepted = form.get("termsAccepted") === "on";
  const marketingOptIn = form.get("marketingOptIn") === "on";

  if (!termsAccepted) {
    return {
      error: "Please accept the Terms & Conditions and Privacy Policy.",
    };
  }

  if (order.domainMode === "new" && order.domainName) {
    const recheck = await checkDomainAvailability(order.domainName);
    if (recheck.availability === "unavailable") {
      return {
        error:
          "Your selected domain now appears unavailable. Please go back and choose another.",
      };
    }
  }

  await db
    .update(pendingOrders)
    .set({
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: new Date(),
      marketingOptIn,
      updatedAt: new Date(),
    })
    .where(eq(pendingOrders.id, order.id));

  const checkout = await createCheckoutForPendingOrder({
    db,
    config,
    pendingOrderId: order.id,
  });
  if ("error" in checkout) {
    return { error: checkout.error };
  }
  throw redirect(checkout.url);
}

export default function GetStartedReview({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <div className="iwfw-start">
      <header className="iwfw-start__intro">
        <p className="iwfw-start__kicker">Step 5 of 5 · Review &amp; pay</p>
        <h1>Review &amp; pay</h1>
        <p className="iwfw-start__lead">
          Confirm your website order, then pay securely with Stripe. Your account
          is created automatically after payment is confirmed.
        </p>
        <div className="iwfw-order-progress" aria-hidden>
          <span style={{ width: "100%" }} />
        </div>
      </header>

      <div className="iwfw-start__split">
        <section className="iwfw-start__card">
          <h2>Your order</h2>
          <dl className="iwfw-start__dl">
            <div>
              <dt>Business</dt>
              <dd>{loaderData.tradingName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{loaderData.email}</dd>
            </div>
            <div>
              <dt>Domain</dt>
              <dd>
                {loaderData.domainName}{" "}
                <span className="iwfw-start__fine">
                  ({loaderData.domainMode === "existing" ? "owned by you" : "new — manual registration"})
                </span>
              </dd>
            </div>
            <div>
              <dt>Package</dt>
              <dd>{PACKAGE_NAME}</dd>
            </div>
            <div>
              <dt>Monthly price</dt>
              <dd>{PACKAGE_PRICE_LABEL}/month · £0 upfront website fee</dd>
            </div>
          </dl>
          <h3 className="iwfw-start__subhead">Website requirements</h3>
          <ul className="iwfw-start__includes iwfw-start__includes--compact">
            {loaderData.summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <h3 className="iwfw-start__subhead">Included</h3>
          <ul className="iwfw-start__includes iwfw-start__includes--compact">
            {PACKAGE_INCLUDES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {loaderData.domainRecheck && (
            <p className="iwfw-start__fine">
              Domain recheck: {loaderData.domainRecheck.availability} —{" "}
              {loaderData.domainRecheck.message}
            </p>
          )}
          <p className="iwfw-start__fine">{loaderData.disclaimer}</p>
        </section>

        <section className="iwfw-start__card">
          <h2>Cancel anytime</h2>
          <ul className="iwfw-start__policy">
            <li>No minimum term and no cancellation penalty.</li>
            <li>Access continues until the end of the current paid period.</li>
            <li>Website and domain transfers stay manual after cancellation.</li>
            <li>No account is created until Stripe confirms payment.</li>
          </ul>

          <Form method="post" className="iwfw-start__form">
            <label className="iwfw-check">
              <input type="checkbox" name="termsAccepted" required />
              <span>
                I agree to the{" "}
                <Link to="/terms" target="_blank" rel="noreferrer">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link to="/privacy" target="_blank" rel="noreferrer">
                  Privacy Policy
                </Link>
                . *
              </span>
            </label>
            <label className="iwfw-check">
              <input type="checkbox" name="marketingOptIn" />
              <span>Optional: product tips and offers by email.</span>
            </label>

            {actionData?.error && (
              <p className="iwfw-start__error" role="alert">
                {actionData.error}
              </p>
            )}
            {!loaderData.stripeConfigured && (
              <p className="iwfw-start__error" role="status">
                Stripe test Checkout is not configured (needs sk_test_ key and
                STRIPE_PRICE_ID).
              </p>
            )}

            <div className="iwfw-order-actions">
              <Link to="/get-started/domain" className="iwfw-btn iwfw-btn--outline">
                ← Domain
              </Link>
              <button
                type="submit"
                className="iwfw-btn iwfw-btn--green"
                disabled={busy || !loaderData.stripeConfigured}
              >
                {busy ? "Redirecting to Stripe…" : "Pay £39.99/month securely"}
              </button>
            </div>
            <p className="iwfw-start__fine">
              Stripe test mode. The success page is not proof of payment —
              webhooks confirm your order.
            </p>
          </Form>
        </section>
      </div>
    </div>
  );
}
