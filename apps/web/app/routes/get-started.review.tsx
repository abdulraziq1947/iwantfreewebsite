import { Form, Link, redirect, useNavigation } from "react-router";
import { Button } from "@iwfw/ui";
import { createDb, eq, onboardingProfiles } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
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
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
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

  // Stage D will create a Stripe Checkout Session here.
  // Do not fake payment success.
  return {
    error:
      "Secure Stripe checkout is not connected yet. Once test secrets are configured (see docs/STRIPE_TEST_SETUP.md), this button will open Stripe-hosted payment. No charge was made.",
    termsSaved: true,
  };
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
          Confirm your package and terms, then pay securely. Business details
          and website preferences come next in your dashboard.
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
              Stripe will not renew after that date.
            </li>
            <li>
              You retain ownership of your website and domain assets, subject to
              the Terms.
            </li>
            <li>
              After cancellation is scheduled, our team creates a manual transfer
              task and transfers your website and domain. Status appears in your
              dashboard (Pending → In progress → Completed).
            </li>
            <li>
              We do not auto-delete websites, domains, email or files when a
              subscription ends. Assets are preserved until manual transfer is
              completed.
            </li>
            <li>
              We do not promise an exact transfer timeframe until an operational
              SLA is published.
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
                (draft for review) and{" "}
                <Link to="/privacy" target="_blank" rel="noreferrer">
                  Privacy Policy
                </Link>{" "}
                (draft for review). *
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

            {actionData?.termsSaved && (
              <p className="iwfw-start__ok" role="status">
                Terms acceptance saved
                {loaderData.termsAcceptedAt ? " (updated)" : ""}.
              </p>
            )}
            {actionData?.error && (
              <p className="iwfw-start__error" role="alert">
                {actionData.error}
              </p>
            )}

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Saving…" : "Pay £39.99/month securely"}
            </Button>
            <p className="iwfw-start__fine">
              Stripe test checkout wires up next. No live charges without your
              approval. <Link to="/get-started/account">← Account</Link>
            </p>
          </Form>
        </section>
      </div>
    </div>
  );
}
