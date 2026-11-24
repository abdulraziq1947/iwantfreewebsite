import { Link, redirect } from "react-router";
import { getOptionalAuth } from "../lib/session.server";
import { createDb } from "@iwfw/db";
import { getEnv, getConfig } from "../lib/env.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import {
  GET_STARTED_STEPS,
  PACKAGE_PRICE_LABEL,
  PACKAGE_PRICE_PERIOD,
  type GetStartedStepKey,
} from "../lib/get-started";
import { ArrowIcon, CheckIcon, StepHeader } from "../components/start-funnel";
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

const STEP_DETAIL: Record<GetStartedStepKey, string> = {
  personal: "Your name, email and phone number, so we know who to contact.",
  business:
    "What you do, where you work and the services you offer. Plain English is perfect.",
  media:
    "Upload a logo and photos if you have them. If not, skip this step and add them later.",
  domain:
    "Check a .co.uk, .com or .uk address, or tell us about one you already own.",
  review:
    "Check your answers, then pay £39.99 for your first month through Stripe’s secure checkout.",
};

export default function GetStartedPackage({ loaderData }: Route.ComponentProps) {
  const continueTo = loaderData.addingSite
    ? "/get-started/personal?new=1"
    : "/get-started/personal";
  const ctaLabel = loaderData.addingSite ? "Start the new brief" : "Start your order";

  const cta = (
    <Link to={continueTo} className="st-btn st-btn--go st-btn--lg">
      {ctaLabel}
      <ArrowIcon />
    </Link>
  );

  return (
    <div className="st-intro">
      <StepHeader
        kicker={loaderData.addingSite ? "Add another website" : "Your website package"}
        title={
          loaderData.addingSite
            ? "Start a brief for another website"
            : "Let’s get your business online"
        }
        lead={
          loaderData.addingSite
            ? "Start a fresh brief for another business or brand. You’ll get a separate site and subscription after payment."
            : "You run your business; we’ll handle the website. Answer a few simple questions, choose a web address, then pay securely. No technical knowledge needed, and your account is created after payment."
        }
      />

      <ul className="st-offer" aria-label="The offer at a glance">
        <li className="st-offer__price">
          <strong>{PACKAGE_PRICE_LABEL}</strong>
          <span>{PACKAGE_PRICE_PERIOD}</span>
        </li>
        <li>
          <CheckIcon />
          No upfront design fee
        </li>
        <li>
          <CheckIcon />
          Cancel anytime
        </li>
      </ul>

      <div className="st-intro__cta">
        {cta}
        <p className="st-note">
          {loaderData.signedIn ? (
            <>
              You’re signed in.{" "}
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
              Already paid? <Link to="/get-started/account?mode=login">Log in</Link>
            </>
          )}
        </p>
      </div>

      <section className="st-path" aria-labelledby="st-path-title">
        <h2 id="st-path-title" className="st-section-title">
          What happens next
        </h2>
        <ol>
          {GET_STARTED_STEPS.map((step, index) => (
            <li key={step.key}>
              <span className="st-path__n" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h3>{step.label}</h3>
                <p>{STEP_DETAIL[step.key]}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="st-path__after">
          <strong>After payment</strong> we create your account and email you a
          secure activation link, so you can follow progress. New domains are
          registered by our team, or we work with a domain you already own.
        </p>
        <p className="st-path__resume">
          You can save your answers at any step and come back later on this
          device.
        </p>
      </section>

      <div className="st-intro__cta st-intro__cta--end">{cta}</div>
    </div>
  );
}
