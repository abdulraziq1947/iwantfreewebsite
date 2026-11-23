import { Link } from "react-router";
import { createDb } from "@iwfw/db";
import {getEnv, getConfig} from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import {
  buildJourneyStages,
  buildStatusBanner,
  liveWebsiteUrl,
  needsGbpInvite,
  websiteStageLabel,
} from "../lib/customer-progress";
import type { Route } from "./+types/dashboard.onboarding";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Progress — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth, getConfig(context));
  return { workspace };
}

export default function ProgressPage({ loaderData }: Route.ComponentProps) {
  const { workspace } = loaderData;
  const data = workspace.onboarding?.data;
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
  const stageLabel = websiteStageLabel({
    needsSubscription: workspace.needsSubscription,
    domainStatus: workspace.domainTask?.status,
    briefReady: workspace.briefReady,
  });
  const showGbp =
    !workspace.needsSubscription && needsGbpInvite(data);
  const domainName =
    workspace.domainTask?.domainName ||
    data?.domain.preferredDomain ||
    data?.domain.existingDomain ||
    "—";
  const paidAndReady = !workspace.needsSubscription && workspace.briefReady;
  const isLive = workspace.domainTask?.status === "connected";
  const liveUrl = liveWebsiteUrl(workspace.domainTask);

  return (
    <div className="iwfw-dash-page iwfw-dash-home">
      <header className="iwfw-dash-home__hero">
        <div className="iwfw-dash-home__hero-copy">
          <p className="iwfw-dash-home__eyebrow">Progress</p>
          <h1>What’s happening</h1>
          <p className="iwfw-dash-home__lead">
            {isLive
              ? "Congratulations — your website is live."
              : "Your brief is already with us. This page shows where things stand — not another form to fill in."}
          </p>
        </div>
        <div className="iwfw-dash-home__hero-side">
          <span className="iwfw-dash-home__pill">{stageLabel}</span>
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
          ) : (
            <Link to="/dashboard" className="iwfw-btn iwfw-btn--outline">
              Back to overview
            </Link>
          )}
        </div>
      </section>

      {showGbp && !isLive && (
        <section className="iwfw-dash-gbp" aria-label="Optional Google Business">
          <div className="iwfw-dash-gbp__copy">
            <p className="iwfw-dash-gbp__kicker">Optional · while we build</p>
            <h2>Google Business Profile</h2>
            <p>
              Give us Manager access if you’d like weekly posts and help with
              reviews. Skip it if you don’t need that yet.
            </p>
          </div>
          <Link
            to="/dashboard/google-business"
            className="iwfw-btn iwfw-btn--green"
          >
            Give Manager access
          </Link>
        </section>
      )}

      <section className="iwfw-dash-steps" aria-label="What happens next">
        <div className="iwfw-dash-steps__head">
          <h2>What happens next</h2>
          <p>We’ll handle domain, hosting and launch for you.</p>
        </div>
        <ol className="iwfw-dash-steps__list">
          {stages.map((stage, index) => (
            <li
              key={stage.id}
              className={`iwfw-dash-steps__item is-${stage.state}`}
            >
              <span className="iwfw-dash-steps__index" aria-hidden>
                {stage.state === "done" ? "✓" : index + 1}
              </span>
              <div>
                <strong>{stage.title}</strong>
                <p>{stage.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="iwfw-dash-brief">
        <div className="iwfw-dash-brief__head">
          <h2>Your brief</h2>
          <p>From checkout — contact support if anything needs changing.</p>
        </div>
        <dl className="iwfw-dash-brief__grid">
          <div>
            <dt>Business</dt>
            <dd>
              {data?.business.tradingName ||
                workspace.primary?.tradingName ||
                "—"}
            </dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>
              {[data?.business.contactName, data?.business.email]
                .filter(Boolean)
                .join(" · ") || "—"}
            </dd>
          </div>
          <div>
            <dt>Domain</dt>
            <dd>{domainName}</dd>
          </div>
          <div>
            <dt>Services</dt>
            <dd className="iwfw-dash-pre">
              {data?.services.list?.trim() || "—"}
            </dd>
          </div>
        </dl>
        <Link to="/dashboard/support" className="iwfw-btn iwfw-btn--outline">
          Contact support
        </Link>
      </section>
    </div>
  );
}
