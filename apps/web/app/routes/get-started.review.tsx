import { Form, Link, redirect, useNavigation } from "react-router";
import { Button } from "@iwfw/ui";
import { isStripeCheckoutConfigured } from "@iwfw/config";
import { createDb, eq, onboardingProfiles } from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { createCheckoutSessionForOrg } from "../lib/billing.server";
import {
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
  const auth = await requireAuth(request, context);
  const config = getConfig(context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth);

  if (!workspace.primary) {
    throw redirect("/get-started/account");
  }
  if (!workspace.needsSubscription) {
    throw redirect("/dashboard");
  }

  return {
    tradingName: workspace.primary.tradingName,
    email: auth.email,
    termsVersion: TERMS_VERSION,
    marketingOptIn: Boolean(workspace.onboarding?.data.checkout.marketingOptIn),
    termsAcceptedAt: workspace.onboarding?.data.checkout.termsAcceptedAt || "",
    stripeConfigured: isStripeCheckoutConfigured(config),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const env = getEnv(context);
  const config = getConfig(context);
  const db = createDb(env.DB);
  const workspace = await getCustomerWorkspace(db, auth);
  if (!workspace.primary || !workspace.onboarding) {
    return { error: "No organisation found. Please create an account first." };
  }

  const form = await request.formData();
  const termsAccepted = form.get("termsAccepted") === "on";
  const marketingOptIn = form.get("marketingOptIn") === "on";

  if (!termsAccepted) {
    return {
      error:
        "Please accept the Terms & Conditions and Privacy Policy to continue.",
    };
  }

  const data = {
    ...workspace.onboarding.data,
    checkout: {
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: new Date().toISOString(),
      marketingOptIn,
    },
  };

  await db
    .update(onboardingProfiles)
    .set({
      dataJson: JSON.stringify(data),
      updatedAt: new Date(),
    })
    .where(eq(onboardingProfiles.id, workspace.onboarding.id));

  const checkout = await createCheckoutSessionForOrg({
    db,
    config,
    organisationId: workspace.primary.id,
    tradingName: workspace.primary.tradingName,
    email: auth.email,
  });

  if ("error" in checkout) {
    return { error: checkout.error, termsSaved: true };
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
        <p className="iwfw-start__kicker">Step 3 of 3</p>
        <h1>Review &amp; pay</h1>
        <p className="iwfw-start__lead">
          Confirm your package and terms, then pay securely with Stripe. Business
          details and website preferences come next in your dashboard.
        </p>
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
              <dt>Account email</dt>
              <dd>{loaderData.email}</dd>
            </div>
            <div>
              <dt>Package</dt>
              <dd>{PACKAGE_NAME}</dd>
            </div>
            <div>
              <dt>Monthly price</dt>
              <dd>
                {PACKAGE_PRICE_LABEL}/month (inclusive of VAT where applicable)
              </dd>
            </div>
            <div>
              <dt>Upfront website design fee</dt>
              <dd>£0</dd>
            </div>
          </dl>

          <h3 className="iwfw-start__subhead">Included</h3>
          <ul className="iwfw-start__includes iwfw-start__includes--compact">
            {PACKAGE_INCLUDES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="iwfw-start__card">
          <h2>Cancellation &amp; ownership</h2>
          <ul className="iwfw-start__policy">
            <li>
              Cancel anytime from your dashboard — no minimum term, no penalty.
            </li>
            <li>
              Access continues until the end of the current paid billing period.
              Billing will not renew after that date.
            </li>
            <li>
              You retain ownership of your website and domain assets, subject to
              the Terms. Transfers are manual after the subscription ends.
            </li>
            <li>
              We do not auto-delete websites, domains, email or files when a
              subscription ends.
            </li>
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
              <input
                type="checkbox"
                name="marketingOptIn"
                defaultChecked={loaderData.marketingOptIn}
              />
              <span>
                Optional: send me product tips and offers by email (you can
                unsubscribe anytime).
              </span>
            </label>

            {actionData?.termsSaved && actionData?.error && (
              <p className="iwfw-start__ok" role="status">
                Terms acceptance saved.
              </p>
            )}
            {actionData?.error && (
              <p className="iwfw-start__error" role="alert">
                {actionData.error}
              </p>
            )}
            {!loaderData.stripeConfigured && (
              <p className="iwfw-start__error" role="status">
                Stripe test Checkout is not configured in this environment yet
                (needs STRIPE_SECRET_KEY and STRIPE_PRICE_ID).
              </p>
            )}

            <Button
              type="submit"
              disabled={busy || !loaderData.stripeConfigured}
              className="w-full"
            >
              {busy ? "Redirecting to Stripe…" : "Pay £39.99/month securely"}
            </Button>
            <p className="iwfw-start__fine">
              You will complete payment on Stripe&apos;s secure checkout page.
              Test mode only until live payments are approved.{" "}
              <Link to="/get-started/account">← Account</Link>
            </p>
          </Form>
        </section>
      </div>
    </div>
  );
}
