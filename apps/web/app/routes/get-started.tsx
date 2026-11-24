import { Link, redirect } from "react-router";
import { getOptionalAuth } from "../lib/session.server";
import { createDb } from "@iwfw/db";
import { getEnv, getConfig } from "../lib/env.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import {
  PACKAGE_INCLUDES,
  PACKAGE_NAME,
  PACKAGE_PRICE_LABEL,
  PACKAGE_PRICE_PERIOD,
} from "../lib/get-started";
import { CTA_REASSURANCE, PRIMARY_CTA } from "../lib/marketing";
import type { Route } from "./+types/get-started";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Get my website — iwantfreewebsite.com" },
    {
      name: "description",
      content:
        "Start your £39.99/month managed website package. Short questionnaire, choose a domain, pay securely. No upfront design fee. Cancel anytime.",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getOptionalAuth(request, context);
  const url = new URL(request.url);
  const addingSite = url.searchParams.get("new") === "1";
  if (auth && !addingSite) {
    const db = createDb(getEnv(context).DB);
    const workspace = await getCustomerWorkspace(db, auth, getConfig(context));
    if (workspace.primary && !workspace.needsSubscription) {
      throw redirect("/dashboard");
    }
  }
  return { signedIn: Boolean(auth), addingSite };
}

export default function GetStartedPackage({ loaderData }: Route.ComponentProps) {
  const continueTo = loaderData.addingSite
    ? "/get-started/personal?new=1"
    : "/get-started/personal";

  return (
    <div className="iwfw-start">
      <header className="iwfw-start__intro">
        <p className="iwfw-start__kicker">
          {loaderData.addingSite ? "Add another website" : "Your website package"}
        </p>
        <h1>{PACKAGE_NAME}</h1>
        <p className="iwfw-start__lead">
          {loaderData.addingSite
            ? "Start a fresh brief for another business or brand. You’ll get a separate site and subscription after payment."
            : "You run your business — we’ll handle the website. Answer a few simple questions, choose a domain, then pay securely. No technical knowledge needed. Your account is created after payment."}
        </p>
      </header>

      <div className="iwfw-start__plan">
        <p className="iwfw-start__price">
          {PACKAGE_PRICE_LABEL}
          <span>{PACKAGE_PRICE_PERIOD}</span>
        </p>
        <p className="iwfw-start__upfront">
          No upfront design fee · Fully managed · Cancel anytime
        </p>
        <ul className="iwfw-start__includes">
          {PACKAGE_INCLUDES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <div className="iwfw-start__terms-box">
          <h2>What happens next</h2>
          <ul>
            <li>
              <strong>Short questionnaire.</strong> Tell us about your business
              — we only ask what we need to build your site.
            </li>
            <li>
              <strong>£39.99/month</strong> billed in advance from checkout ·
              design, hosting and domain renewals looked after · cancel anytime.
            </li>
            <li>
              Domains are checked live, then registered by our team after
              payment (or we work with a domain you already own).
            </li>
            <li>
              After payment, we create your account and email a secure activation
              link so you can follow progress.
            </li>
          </ul>
        </div>

        <Link
          to={continueTo}
          className="iwfw-btn iwfw-btn--green iwfw-btn--block"
        >
          {loaderData.addingSite
            ? "Continue — Add another site"
            : `Continue — ${PRIMARY_CTA}`}
        </Link>
        <p className="iwfw-start__fine">{CTA_REASSURANCE}</p>
        <p className="iwfw-start__fine">
          {loaderData.signedIn ? (
            <>
              You&apos;re signed in.{" "}
              {loaderData.addingSite ? (
                <>
                  This starts a new order, or{" "}
                  <Link to="/dashboard">return to your dashboard</Link>.
                </>
              ) : (
                <>
                  You can still place a new order, or{" "}
                  <Link to="/dashboard">open your dashboard</Link>.
                </>
              )}
            </>
          ) : (
            <>
              Already paid? <Link to="/login">Log in</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
