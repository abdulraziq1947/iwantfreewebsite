import { Link } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { orgStatusLabel, orgStatusTone } from "../lib/customer-dashboard";
import {
  buildCustomerActions,
  buildJourneyStages,
  buildStatusBanner,
  liveWebsiteUrl,
  needsGbpInvite,
  websiteStageLabel,
} from "../lib/customer-progress";
import { AttentionBoardCard } from "../components/attention-board";
import type { Route } from "./+types/dashboard";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Dashboard — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth);
  return {
    userName: auth.name,
    workspace,
  };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { workspace } = loaderData;
  const firstName = loaderData.userName?.split(" ")[0] ?? "";
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
  const actions = buildCustomerActions({
    needsSubscription: workspace.needsSubscription,
    briefReady: workspace.briefReady,
    domainTask: workspace.domainTask,
    data: workspace.onboarding?.data,
  });
  const gbpAction = actions.find((a) => a.id === "gbp");
  const showGbp =
    !workspace.needsSubscription &&
    needsGbpInvite(workspace.onboarding?.data);
  const stageLabel = websiteStageLabel({
    needsSubscription: workspace.needsSubscription,
    domainStatus: workspace.domainTask?.status,
    briefReady: workspace.briefReady,
  });
  const paidAndReady = !workspace.needsSubscription && workspace.briefReady;
  const isLive = workspace.domainTask?.status === "connected";
  const liveUrl = liveWebsiteUrl(workspace.domainTask);
  const domainName = workspace.domainTask?.domainName;

  return (
    <div className="iwfw-dash-page iwfw-dash-home">
      <header className="iwfw-dash-home__hero">
        <div className="iwfw-dash-home__hero-copy">
          <p className="iwfw-dash-home__eyebrow">Customer dashboard</p>
          <h1>Welcome back{firstName ? `, ${firstName}` : ""}</h1>
          <p className="iwfw-dash-home__lead">
            {isLive
              ? "Congratulations — your website is live. Share the link with customers."
              : paidAndReady
                ? "You’re done on your side. We’ll build the website and get back to you when it’s live."
                : "A clear view of where things stand and what to do next."}
          </p>
        </div>
        <div className="iwfw-dash-home__hero-side">
          <span className="iwfw-dash-home__pill">{stageLabel}</span>
          {workspace.primary?.tradingName && (
            <p className="iwfw-dash-home__site">
              {workspace.primary.tradingName}
              {domainName ? ` · ${domainName}` : ""}
            </p>
          )}
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
          {workspace.needsSubscription ? (
            <Link to="/get-started" className="iwfw-btn iwfw-btn--green">
              See £39.99 plan
            </Link>
          ) : liveUrl ? (
            <a
              href={liveUrl}
              className="iwfw-btn iwfw-btn--green"
              target="_blank"
              rel="noreferrer"
            >
              Visit live site
            </a>
          ) : workspace.domainTask?.status === "unavailable" ? (
            <Link to="/dashboard/support" className="iwfw-btn iwfw-btn--green">
              Contact support
            </Link>
          ) : (
            <Link to="/dashboard/onboarding" className="iwfw-btn iwfw-btn--outline">
              View progress
            </Link>
          )}
        </div>
      </section>

      {workspace.attention &&
      workspace.attention.customerPendingCount > 0 ? (
        <AttentionBoardCard
          board={workspace.attention}
          perspective="customer"
          title="Needs attention"
          gbpActions={
            <Link
              to="/dashboard/google-business"
              className="iwfw-btn iwfw-btn--outline"
            >
              {showGbp && gbpAction ? gbpAction.cta : "Update GMB"}
            </Link>
          }
        />
      ) : null}

      <section className="iwfw-dash-steps" aria-label="What happens next">
        <div className="iwfw-dash-steps__head">
          <h2>What happens next</h2>
          <p>Four simple stages. Domain and setup stay with our team.</p>
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

      <section className="iwfw-dash-links" aria-label="Quick links">
        <Link to="/dashboard/website" className="iwfw-dash-link">
          <span>Website</span>
          <strong>{stageLabel}</strong>
        </Link>
        <Link to="/dashboard/domain" className="iwfw-dash-link">
          <span>Domain</span>
          <strong>{domainName || "Managed by us"}</strong>
        </Link>
        <Link to="/dashboard/media" className="iwfw-dash-link">
          <span>Images</span>
          <strong>Upload anytime</strong>
        </Link>
        <Link to="/dashboard/billing" className="iwfw-dash-link">
          <span>Billing</span>
          <strong>
            {workspace.primary
              ? orgStatusLabel(workspace.primary.status)
              : "No plan yet"}
          </strong>
        </Link>
        <Link to="/dashboard/support" className="iwfw-dash-link">
          <span>Support</span>
          <strong>We’re here</strong>
        </Link>
        <Link to="/get-started?new=1" className="iwfw-dash-link">
          <span>New site</span>
          <strong>Add another</strong>
        </Link>
      </section>

      <Panel className="iwfw-dash-sites">
        <div className="iwfw-dash-panel-head">
          <div>
            <h2>Your websites</h2>
            <p className="iwfw-dash-sites__intro">
              Each paid order becomes its own site in your account.
            </p>
          </div>
          <Link to="/get-started?new=1" className="iwfw-btn iwfw-btn--outline">
            Add another site
          </Link>
        </div>
        <ul className="iwfw-dash-orgs">
          {workspace.orgs.map((org) => {
            const initial = org.tradingName.trim().charAt(0).toUpperCase() || "W";
            return (
              <li key={org.id}>
                <div className="iwfw-dash-orgs__body">
                  <span className="iwfw-dash-orgs__mark" aria-hidden>
                    {initial}
                  </span>
                  <div>
                    <p className="iwfw-dash-orgs__name">{org.tradingName}</p>
                    <p className="iwfw-dash-orgs__meta">
                      {org.id === workspace.primary?.id
                        ? "Showing in this dashboard"
                        : "Additional site"}
                    </p>
                  </div>
                </div>
                <Badge tone={orgStatusTone(org.status)}>
                  {orgStatusLabel(org.status)}
                </Badge>
              </li>
            );
          })}
          {workspace.orgs.length === 0 && (
            <li className="iwfw-dash-orgs__empty">
              No website yet. Start the package to create your first one.
            </li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
