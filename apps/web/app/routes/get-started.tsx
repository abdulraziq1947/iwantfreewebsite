import { Link, redirect } from "react-router";
import { getOptionalAuth } from "../lib/session.server";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import {
  PACKAGE_INCLUDES,
  PACKAGE_NAME,
  PACKAGE_PRICE_LABEL,
  PACKAGE_PRICE_PERIOD,
} from "../lib/get-started";
import type { Route } from "./+types/get-started";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Get started — iwantfreewebsite.com" },
    {
      name: "description",
      content:
        "Professional business website for £39.99/month. £0 upfront website design fee. Cancel anytime at the end of your billing period.",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getOptionalAuth(request, context);
  if (auth) {
    const db = createDb(getEnv(context).DB);
    const workspace = await getCustomerWorkspace(db, auth);
    if (workspace.primary && !workspace.needsSubscription) {
      throw redirect("/dashboard");
    }
  }
  return { signedIn: Boolean(auth) };
}

export default function GetStartedPackage({ loaderData }: Route.ComponentProps) {
  const next = loaderData.signedIn
    ? "/get-started/review"
    : "/get-started/account";

  return (
    <div className="iwfw-start">
      <header className="iwfw-start__intro">
        <p className="iwfw-start__kicker">Your website package</p>
        <h1>{PACKAGE_NAME}</h1>
        <p className="iwfw-start__lead">
          A fully managed business website for UK businesses. You focus on the
          work — we handle the website.
        </p>
      </header>

      <div className="iwfw-start__plan">
        <p className="iwfw-start__price">
          {PACKAGE_PRICE_LABEL}
          <span>{PACKAGE_PRICE_PERIOD}</span>
        </p>
        <p className="iwfw-start__upfront">£0 upfront website design fee</p>
        <ul className="iwfw-start__includes">
          {PACKAGE_INCLUDES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <div className="iwfw-start__terms-box">
          <h2>Pricing, cancellation &amp; ownership</h2>
          <ul>
            <li>
              <strong>£39.99/month</strong> inclusive of VAT where applicable.
            </li>
            <li>
              <strong>£0</strong> upfront website design fee.
            </li>
            <li>
              <strong>No minimum contract.</strong> Cancel anytime from your
              dashboard — no cancellation penalty.
            </li>
            <li>
              Cancellation takes effect at the{" "}
              <strong>end of the current paid billing period</strong>. Billing
              does not renew after that date.
            </li>
            <li>
              You retain ownership of your website and domain assets (subject to
              the Terms). Our team <strong>manually transfers</strong> them
              after cancellation — transfers are not automated, and we do not
              promise an exact timeframe until an SLA is published.
            </li>
            <li>
              We do not automatically delete your website, domain, email or
              files when the subscription ends.
            </li>
          </ul>
        </div>

        <Link to={next} className="iwfw-btn iwfw-btn--green iwfw-btn--block">
          Continue — Get My Website
        </Link>
        <p className="iwfw-start__fine">
          {loaderData.signedIn ? (
            <>You&apos;re signed in. Next: review and pay.</>
          ) : (
            <>
              Already have an account?{" "}
              <Link to="/get-started/account?mode=login">Log in</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
