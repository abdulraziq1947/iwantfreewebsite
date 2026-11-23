import { Link } from "react-router";
import { createDb } from "@iwfw/db";
import { goLiveSlaLabel } from "@iwfw/config";
import { getEnv, getConfig } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import {
  buildStatusBanner,
  liveWebsiteUrl,
  needsGbpInvite,
  previewWebsiteUrl,
  websiteStageLabel,
} from "../lib/customer-progress";
import type { Route } from "./+types/dashboard.website";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Website — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const config = getConfig(context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth, config);
  return { workspace, goLiveSla: goLiveSlaLabel(config) };
}

export default function WebsitePage({ loaderData }: Route.ComponentProps) {
  const { workspace, goLiveSla } = loaderData;
  const banner = buildStatusBanner({
    needsSubscription: workspace.needsSubscription,
    briefReady: workspace.briefReady,
    domainTask: workspace.domainTask,
    tradingName: workspace.primary?.tradingName,
    goLiveSlaLabel: goLiveSla,
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
  const isLive = workspace.domainTask?.status === "connected";
  const liveUrl = liveWebsiteUrl(workspace.domainTask);
  const previewUrl = previewWebsiteUrl(workspace.domainTask);

  return (
    <div className="iwfw-dash-page iwfw-dash-home">
      <header className="iwfw-dash-home__hero">
        <div className="iwfw-dash-home__hero-copy">
          <p className="iwfw-dash-home__eyebrow">Website</p>
          <h1>Your website</h1>
          <p className="iwfw-dash-home__lead">
            {isLive
              ? "Your site is live. Open the link below anytime."
              : previewUrl
                ? "Your preview is ready — review it and tell us any changes before we publish."
                : "Preview and live links appear here. Domain and launch stay with our team."}
          </p>
        </div>
        <div className="iwfw-dash-home__hero-side">
          <span className="iwfw-dash-home__pill">{stage}</span>
        </div>
      </header>

      <section
        className={`iwfw-dash-status ${paidAndReady ? "is-ready" : ""} ${isLive ? "is-live" : ""}`}
        aria-label="Current status"
      >
        <div className="iwfw-dash-status__copy">
          <p className="iwfw-dash-status__kicker">{banner.kicker}</p>
          <h2>{banner.title}</h2>
          <p>{banner.body}</p>
          {liveUrl ? (
            <p className="iwfw-dash-status__live-url">
              <a href={liveUrl} target="_blank" rel="noreferrer">
                {liveUrl}
              </a>
            </p>
          ) : previewUrl ? (
            <p className="iwfw-dash-status__live-url">
              <a href={previewUrl} target="_blank" rel="noreferrer">
                {previewUrl}
              </a>
            </p>
          ) : null}
          {!isLive && paidAndReady && !previewUrl ? (
            <p className="iwfw-dash-fine">
              Typical go-live: about {goLiveSla} after we have everything we
              need. This is a usual timeframe, not a guaranteed deadline.
            </p>
          ) : null}
        </div>
        <div className="iwfw-dash-status__actions">
          {liveUrl ? (
            <a
              href={liveUrl}
              className="iwfw-btn iwfw-btn--green"
              target="_blank"
              rel="noreferrer"
            >
              Visit live site
            </a>
          ) : previewUrl ? (
            <a
              href={previewUrl}
              className="iwfw-btn iwfw-btn--green"
              target="_blank"
              rel="noreferrer"
            >
              Open preview
            </a>
          ) : showGbp ? (
            <Link
              to="/dashboard/google-business"
              className="iwfw-btn iwfw-btn--green"
            >
              Give Manager access
            </Link>
          ) : (
            <Link to="/dashboard" className="iwfw-btn iwfw-btn--outline">
              Back to overview
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
