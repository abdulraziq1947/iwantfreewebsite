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
import { CTA_REASSURANCE } from "../lib/marketing";
import {
  ArrowIcon,
  FormAlert,
  StepHeader,
} from "../components/start-funnel";
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
    <div className="st-step st-review">
      <StepHeader
        kicker="Step 5 of 5"
        title="Review & pay"
        lead="You’re about to start a £39.99/month managed website subscription. Confirm your details, then pay securely with Stripe. Your account is created after payment is confirmed."
      />

      <section className="st-card">
        <h2>Your order</h2>
        <dl className="st-dl">
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
              <span className="st-fine" style={{ margin: 0, display: "inline" }}>
                ({loaderData.domainMode === "existing"
                  ? "you already own this"
                  : "we’ll register it after payment"})
              </span>
            </dd>
          </div>
          <div>
            <dt>Package</dt>
            <dd>{PACKAGE_NAME}</dd>
          </div>
          <div>
            <dt>Monthly price</dt>
            <dd>
              {PACKAGE_PRICE_LABEL}/month · design, hosting &amp; renewals
              included
            </dd>
          </div>
        </dl>
        <h3 className="st-subhead">Website requirements</h3>
        <ul className="st-list">
          {loaderData.summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <h3 className="st-subhead">Included</h3>
        <ul className="st-list">
          {PACKAGE_INCLUDES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {loaderData.domainRecheck ? (
          <p className="st-fine">
            {loaderData.domainRecheck.availability === "available"
              ? "Domain still looks available."
              : loaderData.domainRecheck.availability === "unavailable"
                ? "This domain may no longer be available — go back to choose another."
                : loaderData.domainRecheck.message}
          </p>
        ) : null}
        <p className="st-fine">{loaderData.disclaimer}</p>
      </section>

      <section className="st-card">
        <h2>Before you pay</h2>
        <ul className="st-policy">
          <li>
            <strong>£39.99/month</strong> billed in advance — no separate
            upfront design fee.
          </li>
          <li>No minimum term and no cancellation fee.</li>
          <li>Access continues until the end of the current paid period.</li>
          <li>
            If you leave later, we’ll help transfer your website and domain.
            After that, you arrange hosting yourself.
          </li>
          <li>Your account is created after payment is confirmed.</li>
        </ul>

        <Form method="post" className="st-form">
          <label className="st-check">
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
          <label className="st-check">
            <input type="checkbox" name="marketingOptIn" />
            <span>
              Optional: email me product tips and offers. Not required for the
              service. You can unsubscribe anytime. See our{" "}
              <Link to="/privacy" target="_blank" rel="noreferrer">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          {actionData?.error ? (
            <FormAlert tone="error">{actionData.error}</FormAlert>
          ) : null}
          {!loaderData.stripeConfigured ? (
            <FormAlert tone="error">
              Checkout isn’t available right now. Please try again shortly or
              contact support@iwantfreewebsite.com.
            </FormAlert>
          ) : null}

          <div className="st-actions">
            <Link to="/get-started/domain" className="st-btn st-btn--quiet st-actions__back">
              <ArrowIcon direction="left" />
              Domain
            </Link>
            <button
              type="submit"
              className="st-btn st-btn--go st-actions__next"
              disabled={busy || !loaderData.stripeConfigured}
            >
              {busy ? "Redirecting…" : "Pay £39.99/month securely"}
              <ArrowIcon />
            </button>
          </div>
          <p className="st-fine">
            You’ll be taken to Stripe’s secure checkout to start your
            £39.99/month subscription.
          </p>
          <p className="st-fine">{CTA_REASSURANCE}</p>
        </Form>
      </section>
    </div>
  );
}
