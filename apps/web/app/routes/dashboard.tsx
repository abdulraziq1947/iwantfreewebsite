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
  needsGbpInvite,
  websiteStageLabel,
} from "../lib/customer-progress";
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
  const otherActions = actions.filter((a) => a.id !== "gbp");
  const showGbp = needsGbpInvite(workspace.onboarding?.data);
  const stageLabel = websiteStageLabel({
    needsSubscription: workspace.needsSubscription,
    domainStatus: workspace.domainTask?.status,
    briefReady: workspace.briefReady,
  });
  const paidAndReady =
    !workspace.needsSubscription && workspace.briefReady;

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Welcome back{firstName ? `, ${firstName}` : ""}</h1>
          <p>
            {paidAndReady
              ? "Your order is with our team. This page keeps things simple: what’s happening, and one optional extra if you want Google Business help."
              : "A clear view of where things stand and what to do next."}
          </p>
        </div>
        <Link to="/get-started?new=1" className="iwfw-btn iwfw-btn--outline">
          Add another site
        </Link>
      </header>

      <Panel
        className={
          paidAndReady ? "iwfw-dash-focus iwfw-dash-focus--ready" : "iwfw-dash-focus"
        }
      >
        <p className="iwfw-dash-focus__kicker">{banner.kicker}</p>
        <h2>{banner.title}</h2>
        <p>{banner.body}</p>
        {banner.meta && <p className="iwfw-dash-focus__meta">{banner.meta}</p>}

        {workspace.needsSubscription ? (
          <div className="iwfw-dash-callout__actions">
            <Link to="/get-started" className="iwfw-btn iwfw-btn--green">
              See £39.99 plan
            </Link>
          </div>
        ) : workspace.domainTask?.status === "unavailable" ? (
          <div className="iwfw-dash-callout__actions">
            <Link to="/dashboard/support" className="iwfw-btn iwfw-btn--green">
              Contact support
            </Link>
          </div>
        ) : (
          <div className="iwfw-dash-callout__actions">
            <Link to="/dashboard/onboarding" className="iwfw-btn iwfw-btn--blue">
              See what’s happening
            </Link>
            {showGbp && gbpAction && (
              <Link to={gbpAction.to} className="iwfw-btn iwfw-btn--green">
                {gbpAction.cta}
              </Link>
            )}
          </div>
        )}
      </Panel>

      {paidAndReady && showGbp && gbpAction && (
        <Panel className="iwfw-dash-optional">
          <div className="iwfw-dash-optional__copy">
            <p className="iwfw-dash-focus__kicker">Optional · meantime</p>
            <h2>{gbpAction.title}</h2>
            <p>{gbpAction.body}</p>
          </div>
          <Link to={gbpAction.to} className="iwfw-btn iwfw-btn--green">
            {gbpAction.cta}
          </Link>
        </Panel>
      )}

      <section className="iwfw-dash-journey" aria-label="Website journey">
        <div className="iwfw-dash-panel-head">
          <h2>What happens next</h2>
          <Badge tone={workspace.needsSubscription ? "warning" : "success"}>
            {stageLabel}
          </Badge>
        </div>
        <ol className="iwfw-dash-timeline">
          {stages.map((stage) => (
            <li
              key={stage.id}
              className={`iwfw-dash-timeline__item is-${stage.state}`}
            >
              <span className="iwfw-dash-timeline__marker" aria-hidden />
              <div>
                <strong>{stage.title}</strong>
                <p>{stage.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="iwfw-dash-fine">
          Domain, hosting, email and go-live are handled by our team. You don’t
          need to chase each step.
        </p>
      </section>

      {otherActions.length > 0 && (
        <section aria-label="More options">
          <div className="iwfw-dash-panel-head">
            <h2>More options</h2>
          </div>
          <div className="iwfw-dash-actions">
            {otherActions.map((action) => (
              <article
                key={action.id}
                className={`iwfw-dash-action iwfw-dash-action--${action.tone}`}
              >
                <strong>{action.title}</strong>
                <p>{action.body}</p>
                <Link
                  to={action.to}
                  className={
                    action.tone === "primary"
                      ? "iwfw-btn iwfw-btn--green"
                      : "iwfw-btn iwfw-btn--outline"
                  }
                >
                  {action.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="iwfw-dash-grid" aria-label="Quick links">
        <DashCard
          title="Progress"
          body="Full journey and a copy of your brief."
          to="/dashboard/onboarding"
          status={stageLabel}
        />
        <DashCard
          title="Website"
          body="Build stage and go-live status."
          to="/dashboard/website"
          status={stageLabel}
        />
        <DashCard
          title="Domain"
          body="Registration and connection status."
          to="/dashboard/domain"
          status={
            workspace.domainTask
              ? workspace.domainTask.status.replaceAll("_", " ")
              : "With our team"
          }
        />
        <DashCard
          title="Google Business"
          body="Manager access for posts and reviews."
          to="/dashboard/google-business"
          status={showGbp ? "Optional" : "Updated"}
        />
        <DashCard
          title="Images"
          body="Logos, photos and project images."
          to="/dashboard/media"
          status="Optional"
        />
        <DashCard
          title="Billing"
          body="Plan, invoices and cancel anytime."
          to="/dashboard/billing"
          status={
            workspace.primary
              ? orgStatusLabel(workspace.primary.status)
              : "No plan yet"
          }
        />
        <DashCard
          title="Support"
          body="Call or email if you need anything."
          to="/dashboard/support"
          status="We’re here"
        />
        <DashCard
          title="Account"
          body="Login details and security."
          to="/dashboard/account"
          status={loaderData.userName}
        />
      </section>

      <Panel>
        <div className="iwfw-dash-panel-head">
          <h2>Your websites</h2>
          <Link to="/get-started?new=1" className="iwfw-btn iwfw-btn--outline">
            Add another site
          </Link>
        </div>
        <ul className="iwfw-dash-orgs">
          {workspace.orgs.map((org) => (
            <li key={org.id}>
              <div>
                <p className="iwfw-dash-orgs__name">{org.tradingName}</p>
                <p className="iwfw-dash-orgs__meta">
                  {org.id === workspace.primary?.id
                    ? "Current dashboard site"
                    : "Additional site"}
                </p>
              </div>
              <Badge tone={orgStatusTone(org.status)}>
                {orgStatusLabel(org.status)}
              </Badge>
            </li>
          ))}
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

function DashCard({
  title,
  body,
  to,
  status,
}: {
  title: string;
  body: string;
  to: string;
  status: string;
}) {
  return (
    <Link to={to} className="iwfw-dash-card">
      <span className="iwfw-dash-card__status">{status}</span>
      <strong>{title}</strong>
      <p>{body}</p>
      <span className="iwfw-dash-card__go">Open →</span>
    </Link>
  );
}
