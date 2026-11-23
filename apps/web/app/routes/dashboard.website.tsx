import { Link } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import {
  buildJourneyStages,
  buildStatusBanner,
  needsGbpInvite,
  websiteStageLabel,
} from "../lib/customer-progress";
import type { Route } from "./+types/dashboard.website";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Website — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth);
  return { workspace };
}

export default function WebsitePage({ loaderData }: Route.ComponentProps) {
  const { workspace } = loaderData;
  const stages = buildJourneyStages({
    needsSubscription: workspace.needsSubscription,
    briefReady: workspace.briefReady,
    domainTask: workspace.domainTask,
  });
  const banner = buildStatusBanner({
    needsSubscription: workspace.needsSubscription,
    briefReady: workspace.briefReady,
    domainTask: workspace.domainTask,
    tradingName: workspace.primary?.tradingName,
  });
  const stage = websiteStageLabel({
    needsSubscription: workspace.needsSubscription,
    domainStatus: workspace.domainTask?.status,
    briefReady: workspace.briefReady,
  });
  const showGbp =
    !workspace.needsSubscription &&
    needsGbpInvite(workspace.onboarding?.data);
  const paidAndReady = !workspace.needsSubscription && workspace.briefReady;

  return (
    <div className="iwfw-dash-page iwfw-dash-home">
      <header className="iwfw-dash-home__hero">
        <div className="iwfw-dash-home__hero-copy">
          <p className="iwfw-dash-home__eyebrow">Website</p>
          <h1>Your website</h1>
          <p className="iwfw-dash-home__lead">
            Build progress after payment. Domain and launch stay with our team.
          </p>
        </div>
        <div className="iwfw-dash-home__hero-side">
          <span className="iwfw-dash-home__pill">{stage}</span>
        </div>
      </header>

      <section
        className={`iwfw-dash-status ${paidAndReady ? "is-ready" : ""}`}
        aria-label="Current status"
      >
        <div className="iwfw-dash-status__copy">
          <p className="iwfw-dash-status__kicker">{banner.kicker}</p>
          <h2>{banner.title}</h2>
          <p>{banner.body}</p>
        </div>
        {showGbp && (
          <div className="iwfw-dash-status__actions">
            <Link
              to="/dashboard/google-business"
              className="iwfw-btn iwfw-btn--green"
            >
              Give Manager access
            </Link>
          </div>
        )}
      </section>

      <section className="iwfw-dash-steps" aria-label="What happens next">
        <div className="iwfw-dash-steps__head">
          <h2>What happens next</h2>
          <p>We’ll share a preview before go-live.</p>
        </div>
        <ol className="iwfw-dash-steps__list">
          {stages.map((item, index) => (
            <li
              key={item.id}
              className={`iwfw-dash-steps__item is-${item.state}`}
            >
              <span className="iwfw-dash-steps__index" aria-hidden>
                {item.state === "done" ? "✓" : index + 1}
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="iwfw-dash-inline-actions">
        <Link to="/dashboard/media" className="iwfw-btn iwfw-btn--outline">
          Update images
        </Link>
        <Link to="/dashboard/onboarding" className="iwfw-btn iwfw-btn--outline">
          View progress
        </Link>
      </div>
    </div>
  );
}
