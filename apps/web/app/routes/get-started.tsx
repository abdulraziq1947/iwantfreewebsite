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
  return (
    <div className="iwfw-start">
      <header className="iwfw-start__intro">
        <p className="iwfw-start__kicker">Your website package</p>
        <h1>{PACKAGE_NAME}</h1>
        <p className="iwfw-start__lead">
          Answer a short questionnaire, choose a domain, then pay securely. We
          create your account automatically after Stripe confirms payment — no
          signup first.
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
          <h2>How ordering works</h2>
          <ul>
            <li>
              <strong>No signup before payment.</strong> Complete the website
              questionnaire and domain selection first.
            </li>
            <li>
              <strong>£39.99/month</strong> · <strong>£0</strong> upfront website
              fee · cancel anytime.
            </li>
            <li>
              Domains are checked live, then registered <strong>manually</strong>{" "}
              by our team after payment — never auto-purchased.
            </li>
            <li>
              After payment, we create your organisation and send an account
              activation link (no plaintext passwords).
            </li>
          </ul>
        </div>

        <Link
          to="/get-started/personal"
          className="iwfw-btn iwfw-btn--green iwfw-btn--block"
        >
          Continue — Get My Website
        </Link>
        <p className="iwfw-start__fine">
          {loaderData.signedIn ? (
            <>
              You&apos;re signed in. You can still place a new order, or{" "}
              <Link to="/dashboard">open your dashboard</Link>.
            </>
          ) : (
            <>
              Already paid?{" "}
              <Link to="/login">Log in</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
